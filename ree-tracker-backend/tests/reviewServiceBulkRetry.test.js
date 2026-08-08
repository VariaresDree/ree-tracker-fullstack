import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// approveBulk (reviewService.js) deliberately publishes a live Question
// BEFORE the bookkeeping transaction that marks the pending row APPROVED and
// writes the audit row. This test simulates exactly the reported bug: the
// bookkeeping transaction fails after createLiveQuestion succeeds, then
// approveBulk is re-run on the same id — and asserts the retry does NOT
// publish a second live Question (question.create called only once total).
//
// No DATABASE_URL is configured in this environment (see project notes), and
// `../src/config/db` exports a real, shared PrismaClient singleton rather
// than something vi.mock can cleanly swap out from under a plain require()
// in a CommonJS module — reviewService.js's own `require('../config/db')`
// call resolves to the SAME cached instance either way. So instead of
// mocking the module, we vi.spyOn the individual methods this singleton
// exposes; because it's one shared object, every spy is visible to
// reviewService.js without touching real Postgres.
const prisma = require('../src/config/db');
const logger = require('../src/utils/logger');
const { approveBulk } = require('../src/services/reviewService');

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

describe('approveBulk — retry-safe against partial bookkeeping failure', () => {
    it('persists promotedQuestionId on bookkeeping failure and skips re-creation on retry', async () => {
        const createdQuestion = { id: 'q-live-1' };
        createSpy.mockResolvedValue(createdQuestion);
        txSpy.mockRejectedValueOnce(new Error('bookkeeping tx failed'));

        // --- First run: publish succeeds, bookkeeping fails ---
        findManySpy.mockResolvedValueOnce([{ ...baseRow }]);

        const firstResult = await approveBulk(['rev-1'], 'editor-1');

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(firstResult.approved).toEqual([]);
        expect(firstResult.failed).toEqual([
            { id: 'rev-1', reason: 'published-pending-recordkeeping', questionId: 'q-live-1' },
        ]);
        // Best-effort persist ran, recording the question id outside the failed tx.
        expect(pendingUpdateSpy).toHaveBeenCalledWith({
            where: { id: 'rev-1' },
            data: { promotedQuestionId: 'q-live-1' },
        });

        // --- Second run (retry): row still PENDING, but now carries promotedQuestionId ---
        createSpy.mockClear();
        pendingUpdateSpy.mockClear();
        findManySpy.mockResolvedValueOnce([{ ...baseRow, promotedQuestionId: 'q-live-1' }]);
        txSpy.mockResolvedValueOnce([{}, {}]); // bookkeeping succeeds this time

        const secondResult = await approveBulk(['rev-1'], 'editor-1');

        // The critical assertion: createLiveQuestion (question.create) is NOT
        // called again — no duplicate Question row.
        expect(createSpy).not.toHaveBeenCalled();
        expect(secondResult.approved).toEqual(['rev-1']);
        expect(secondResult.failed).toEqual([]);
        // The transaction reuses the already-published question id.
        const txCallArg = txSpy.mock.calls.at(-1)[0];
        expect(txCallArg).toHaveLength(2);
    });

    it('a clean row with no prior publish still creates exactly once on success', async () => {
        findManySpy.mockResolvedValueOnce([{ ...baseRow }]);
        createSpy.mockResolvedValue({ id: 'q-live-2' });
        txSpy.mockResolvedValueOnce([{}, {}]);

        const result = await approveBulk(['rev-1'], 'editor-1');

        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(result.approved).toEqual(['rev-1']);
        expect(result.failed).toEqual([]);
    });

    it('ineligible rows are rejected before any create call, unaffected by the retry path', async () => {
        findManySpy.mockResolvedValueOnce([{ ...baseRow, options: ['only one'] }]);

        const result = await approveBulk(['rev-1'], 'editor-1');

        expect(createSpy).not.toHaveBeenCalled();
        expect(result.failed).toEqual([{ id: 'rev-1', reason: 'invalid' }]);
    });
});
