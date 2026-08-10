import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// approveBulk (reviewService.js) now has two tiers:
//   1. FAST PATH — every publishable row's question.create + pending-review
//      update + audit-version create collapse into ONE prisma.$transaction
//      call for the whole chunk (the fix for "Accept All times out at 25
//      items" — see the function's own doc comment for why).
//   2. FALLBACK — if that batched transaction throws, every row in the
//      batch is retried through approveOneRow, the ORIGINAL sequential
//      per-item path (createLiveQuestion OUTSIDE the bookkeeping
//      transaction, deliberately non-atomic) — so a bad row or a transient
//      DB error still gets a real per-item reason instead of failing the
//      whole chunk with none.
//
// This file tests both tiers and the boundary between them. No DATABASE_URL
// is configured in this environment, and `../src/config/db` exports a real,
// shared PrismaClient singleton rather than something vi.mock can cleanly
// swap out from under a plain require() in a CommonJS module — reviewService.
// js's own require('../config/db') call resolves to the SAME cached
// instance either way. So instead of mocking the module, we vi.spyOn the
// individual methods this singleton exposes; because it's one shared
// object, every spy is visible to reviewService.js without touching real
// Postgres.
const prisma = require('../src/config/db');
const logger = require('../src/utils/logger');
const { approveBulk, approveOneRow } = require('../src/services/reviewService');

const baseRow = {
    id: 'rev-1',
    status: 'PENDING',
    promotedQuestionId: null,
    subject: 'EE',
    subtopic: 'AC Electric Circuits',
    text: 'What is the impedance of a purely resistive 10-ohm load?',
    options: ['10 ohms', '0 ohms', 'Infinite', 'j10 ohms'],
    answer: '10 ohms',
    difficulty: 2.0,
    fixedExplanation: null,
    source: 'ai',
    type: 'calculation',
    bloomLevel: 'REMEMBER',
    difficultyTier: 1,
};

let findManySpy, createSpy, versionCreateSpy, txSpy, pendingUpdateSpy, topicFindManySpy;

beforeEach(() => {
    findManySpy = vi.spyOn(prisma.questionPendingReview, 'findMany');
    createSpy = vi.spyOn(prisma.question, 'create');
    versionCreateSpy = vi.spyOn(prisma.questionVersion, 'create').mockResolvedValue({});
    txSpy = vi.spyOn(prisma, '$transaction');
    pendingUpdateSpy = vi.spyOn(prisma.questionPendingReview, 'update').mockResolvedValue({});
    // resolveTopic (topicResolver.js) reads prisma.topic.findMany at call
    // time (no destructuring of prisma itself) — spying here keeps
    // createLiveQuestion's topic lookup fast and network-free without
    // touching reviewService's own bindings.
    topicFindManySpy = vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([]);
    vi.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('approveBulk — fast path (batched transaction)', () => {
    it('a clean row with no prior publish creates exactly once, in ONE transaction call', async () => {
        findManySpy.mockResolvedValueOnce([{ ...baseRow }]);
        createSpy.mockResolvedValue({ id: 'q-live-2' });
        txSpy.mockResolvedValueOnce([{}, {}, {}]);

        const result = await approveBulk(['rev-1'], 'editor-1');

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(txSpy).toHaveBeenCalledTimes(1);
        // question.create + pending-review update + version create, ONE array.
        expect(txSpy.mock.calls[0][0]).toHaveLength(3);
        expect(result.approved).toEqual(['rev-1']);
        expect(result.failed).toEqual([]);
    });

    it('ineligible rows are rejected before any create call or transaction attempt', async () => {
        findManySpy.mockResolvedValueOnce([{ ...baseRow, options: ['only one'] }]);

        const result = await approveBulk(['rev-1'], 'editor-1');

        expect(createSpy).not.toHaveBeenCalled();
        expect(txSpy).not.toHaveBeenCalled();
        expect(result.failed).toEqual([{ id: 'rev-1', reason: 'invalid' }]);
    });

    it('a row already carrying promotedQuestionId skips creation and only bookkeeps', async () => {
        findManySpy.mockResolvedValueOnce([{ ...baseRow, promotedQuestionId: 'q-already-live' }]);
        txSpy.mockResolvedValueOnce([{}, {}]);

        const result = await approveBulk(['rev-1'], 'editor-1');

        expect(createSpy).not.toHaveBeenCalled();
        expect(result.approved).toEqual(['rev-1']);
        // No question.create op in this row's batch — just the 2 bookkeeping ops.
        expect(txSpy.mock.calls[0][0]).toHaveLength(2);
    });

    it('N clean rows collapse into exactly ONE transaction call for the whole chunk, not one per row', async () => {
        // This is the actual claim under test: the old code did ~2 sequential
        // transaction boundaries PER ROW (an un-batched createLiveQuestion
        // call, then a separate 2-statement bookkeeping transaction) — a
        // 5-row chunk meant ~10 boundaries. The batched path does exactly 1
        // regardless of chunk size.
        const ROW_COUNT = 5;
        const rows = Array.from({ length: ROW_COUNT }, (_, i) => ({ ...baseRow, id: `rev-${i + 1}` }));
        findManySpy.mockResolvedValueOnce(rows);
        createSpy.mockResolvedValue({ id: 'unused' }); // fast path never reads this
        txSpy.mockResolvedValueOnce(Array.from({ length: ROW_COUNT * 3 }, () => ({})));

        const result = await approveBulk(rows.map((r) => r.id), 'editor-1');

        expect(createSpy).toHaveBeenCalledTimes(ROW_COUNT);
        expect(txSpy).toHaveBeenCalledTimes(1);
        expect(txSpy.mock.calls[0][0]).toHaveLength(ROW_COUNT * 3); // create+update+version per row
        expect(versionCreateSpy).toHaveBeenCalledTimes(ROW_COUNT); // one audit row per approval
        expect(result.approved).toEqual(rows.map((r) => r.id));
        expect(result.failed).toEqual([]);

        // Every question.create call got its own pre-generated id, distinct
        // per row, so the matching update/version ops in the SAME array can
        // reference the right question before the transaction commits.
        const createIds = createSpy.mock.calls.map((call) => call[0].data.id);
        expect(new Set(createIds).size).toBe(ROW_COUNT);
    });
});

describe('approveBulk — fallback when the batched transaction throws', () => {
    it('retries every row in the failed batch through the per-item path, in the SAME call', async () => {
        // The fast path calls prisma.question.create() ONCE just to build the
        // op for the doomed transaction array (its resolved value is never
        // read — the fast path already knows the id it pre-generated), so
        // createSpy needs a BLANKET resolved value covering both that call
        // and the fallback's real one, not a single mockResolvedValueOnce
        // that the fast path's op-build would silently consume first.
        createSpy.mockResolvedValue({ id: 'q-fallback-1' });
        // The fast path's single $transaction (3 ops: create+update+version)
        // fails wholesale — nothing in it persisted, per real Postgres
        // transaction semantics (a rolled-back CREATE never happened). The
        // fallback's approveOneRow then does its OWN independent
        // createLiveQuestion + 2-op bookkeeping transaction for the same row.
        txSpy.mockRejectedValueOnce(new Error('batched tx failed'));
        txSpy.mockResolvedValueOnce([{}, {}]);

        findManySpy.mockResolvedValueOnce([{ ...baseRow }]);

        const result = await approveBulk(['rev-1'], 'editor-1');

        // Two DISTINCT attempts to create — the first was inside the batch
        // that never committed (correct: it's harmless, nothing persisted),
        // the second is the fallback's genuine, successful publish. This is
        // the point of the fallback: the user's SINGLE Accept-All click
        // self-heals without needing a second manual retry, unlike before.
        expect(createSpy).toHaveBeenCalledTimes(2);
        expect(txSpy).toHaveBeenCalledTimes(2);
        expect(result.approved).toEqual(['rev-1']);
        expect(result.failed).toEqual([]);
    });

    it('a row whose fallback ALSO fails bookkeeping reports published-pending-recordkeeping, not a generic failure', async () => {
        // Blanket, not Once — see the comment in the previous test: the fast
        // path's op-build already consumes one create call before the
        // fallback's real one happens.
        createSpy.mockResolvedValue({ id: 'q-fallback-2' });
        txSpy.mockRejectedValueOnce(new Error('batched tx failed')); // fast path
        txSpy.mockRejectedValueOnce(new Error('fallback bookkeeping also failed'));

        findManySpy.mockResolvedValueOnce([{ ...baseRow }]);

        const result = await approveBulk(['rev-1'], 'editor-1');

        expect(result.approved).toEqual([]);
        expect(result.failed).toEqual([
            { id: 'rev-1', reason: 'published-pending-recordkeeping', questionId: 'q-fallback-2' },
        ]);
        // Best-effort persist of the orphaned questionId, so the NEXT Accept
        // All (fast path this time, since the row now carries
        // promotedQuestionId) skips straight to bookkeeping.
        expect(pendingUpdateSpy).toHaveBeenCalledWith({
            where: { id: 'rev-1' },
            data: { promotedQuestionId: 'q-fallback-2' },
        });
    });
});

describe('approveOneRow — retry-safety across separate calls (the fallback path in isolation)', () => {
    // Same scenario the old approveBulk-level test covered, exercised
    // directly against approveOneRow now that it's the piece which actually
    // carries this behavior. Simulates the reported bug: createLiveQuestion
    // succeeds, the bookkeeping transaction then fails, and approveOneRow is
    // called again on the same (now promotedQuestionId-bearing) row — must
    // NOT publish a second live Question.
    it('persists promotedQuestionId on bookkeeping failure and skips re-creation on retry', async () => {
        const createdQuestion = { id: 'q-live-1' };
        createSpy.mockResolvedValue(createdQuestion);
        txSpy.mockRejectedValueOnce(new Error('bookkeeping tx failed'));

        const firstResult = await approveOneRow({ ...baseRow }, 'editor-1');

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(firstResult).toEqual({ id: 'rev-1', ok: false, reason: 'published-pending-recordkeeping', questionId: 'q-live-1' });
        expect(pendingUpdateSpy).toHaveBeenCalledWith({
            where: { id: 'rev-1' },
            data: { promotedQuestionId: 'q-live-1' },
        });

        createSpy.mockClear();
        pendingUpdateSpy.mockClear();
        txSpy.mockResolvedValueOnce([{}, {}]); // bookkeeping succeeds this time

        const secondResult = await approveOneRow({ ...baseRow, promotedQuestionId: 'q-live-1' }, 'editor-1');

        // The critical assertion: createLiveQuestion (question.create) is NOT
        // called again — no duplicate Question row.
        expect(createSpy).not.toHaveBeenCalled();
        expect(secondResult).toEqual({ id: 'rev-1', ok: true });
        const txCallArg = txSpy.mock.calls.at(-1)[0];
        expect(txCallArg).toHaveLength(2);
    });
});
