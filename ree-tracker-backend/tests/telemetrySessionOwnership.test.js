import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// recordAttempts is the single write choke point for every answered question in
// the product — and, at 400+ lines, was entirely untested. Only its extracted
// helpers had coverage.
//
// This file pins the two structural invariants the production audit found
// broken, both of which are about WHERE the write lands rather than what it
// computes:
//
//   1. The ExamSession upsert must be scoped to its OWNER. It keyed on `id`
//      alone, and sessionId arrives straight from the request body — so a
//      client-supplied id matching another user's row took the UPDATE branch
//      and incremented THEIR score, question count and time, with the attempts
//      parented to their session by the FK.
//
//   2. Everything must commit in ONE transaction per chunk. Attempts used to
//      commit in one transaction and theta/streak in a second, so a failure
//      between them left the attempts durable and the ability update lost
//      permanently: the retry saw every row as a duplicate and took the
//      pure-replay path, which skips the theta update entirely.
const prisma = require('../src/config/db');
const { recordAttempts } = require('../src/services/telemetryService');

const USER = 'uid-owner';
const OTHER = 'uid-other';

// Captures what the handler asked the database to do, without a database.
function makeTxClient(calls) {
    const rec = (name) => (args) => { calls.push({ name, args }); return Promise.resolve({}); };
    return {
        $queryRaw: (...a) => { calls.push({ name: '$queryRaw', args: a }); return Promise.resolve([{ thetaRating: 0.2, standardError: 0.5, globalStreak: 4 }]); },
        $executeRaw: (...a) => { calls.push({ name: '$executeRaw', args: a }); return Promise.resolve(1); },
        questionAttempt: {
            findMany: () => Promise.resolve([]),          // nothing deduped
            createMany: (args) => { calls.push({ name: 'questionAttempt.createMany', args }); return Promise.resolve({ count: args.data.length }); },
        },
        examSession: { upsert: rec('examSession.upsert') },
        activityLog: {
            findUnique: () => Promise.resolve(null),      // first activity today
            upsert: rec('activityLog.upsert'),
        },
        userTopicPerformance: { findMany: () => Promise.resolve([]), update: rec('utp.update') },
        user: { update: rec('user.update') },
        thetaHistory: { findFirst: () => Promise.resolve(null), create: rec('thetaHistory.create') },
        userAbility: { findUnique: () => Promise.resolve(null), upsert: rec('userAbility.upsert') },
    };
}

let calls;
let txCount;

beforeEach(() => {
    calls = [];
    txCount = 0;

    vi.spyOn(prisma.question, 'findMany').mockResolvedValue([
        { id: 'q1', answer: 'A', difficulty: 1, subject: 'EE', subtopic: 'AC Electric Circuits', irtA: 1, irtB: 0, irtC: 0.2 },
    ]);
    vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma, '$transaction').mockImplementation(async (fn) => {
        txCount += 1;
        return fn(makeTxClient(calls));
    });
});

afterEach(() => { vi.restoreAllMocks(); });

const oneAttempt = (sessionId) => ({
    userId: USER,
    sessionId,
    mode: 'BOARD_SIM',
    targetSubject: 'EE',
    attempts: [{ questionId: 'q1', userAnswer: 'A', clientAttemptId: 'cid-1', timeSpentMs: 4200 }],
});

describe('ExamSession ownership', () => {
    it('scopes the upsert by (id, userId), never by id alone', async () => {
        await recordAttempts(oneAttempt('sess-belonging-to-someone-else'));

        const upsert = calls.find((c) => c.name === 'examSession.upsert');
        expect(upsert).toBeDefined();

        // The whole point: a foreign session id must MISS rather than match and
        // take the UPDATE branch.
        expect(upsert.args.where).toEqual({
            id_userId: { id: 'sess-belonging-to-someone-else', userId: USER },
        });
        expect(upsert.args.where.id).toBeUndefined();
        expect(upsert.args.create.userId).toBe(USER);
    });

    it('writes no session at all when none was supplied', async () => {
        await recordAttempts({ ...oneAttempt(null), sessionId: null });
        expect(calls.find((c) => c.name === 'examSession.upsert')).toBeUndefined();
    });
});

describe('single-transaction write path', () => {
    it('commits attempts, activity, ability and streak in ONE transaction', async () => {
        await recordAttempts(oneAttempt('sess-1'));

        // One chunk of one attempt => exactly one transaction.
        expect(txCount).toBe(1);

        const names = calls.map((c) => c.name);
        expect(names).toContain('questionAttempt.createMany');
        expect(names).toContain('activityLog.upsert');
        expect(names).toContain('user.update');   // theta + streak
    });

    it('takes the user row lock BEFORE deciding first-activity-of-day', async () => {
        await recordAttempts(oneAttempt('sess-1'));

        const lockIdx = calls.findIndex((c) => c.name === '$queryRaw');
        const writeIdx = calls.findIndex((c) => c.name === 'questionAttempt.createMany');

        // Ordering is the fix for the streak double-increment: the "is this the
        // first activity today?" decision used to be made in a separate,
        // UNLOCKED transaction and only consumed under the lock, so two tabs
        // flushing the day's first batch both saw "no activity yet" and both
        // incremented — 7 became 9 in a single day.
        expect(lockIdx).toBeGreaterThanOrEqual(0);
        expect(lockIdx).toBeLessThan(writeIdx);
        expect(String(calls[lockIdx].args[0])).toContain('FOR UPDATE');
    });

    it('records the user as its own streak/theta subject', async () => {
        await recordAttempts(oneAttempt('sess-1'));
        const userUpdate = calls.find((c) => c.name === 'user.update');
        expect(userUpdate.args.where).toEqual({ id: USER });
        expect(userUpdate.args.data).toHaveProperty('globalStreak');
        expect(userUpdate.args.data).toHaveProperty('thetaRating');
    });
});

describe('timing is clamped before it reaches the column', () => {
    it('caps an out-of-range duration instead of letting createMany throw', async () => {
        await recordAttempts({
            ...oneAttempt('sess-1'),
            attempts: [{ questionId: 'q1', userAnswer: 'A', clientAttemptId: 'cid-1', timeSpentMs: 5e9 }],
        });

        const create = calls.find((c) => c.name === 'questionAttempt.createMany');
        const row = create.args.data[0];
        // int4 max is 2_147_483_647; an unclamped 5e9 aborted the WHOLE batch.
        expect(row.timeSpentMs).toBeLessThanOrEqual(2_147_483_647);
        expect(row.timeSpentMs).toBe(3_600_000);
    });
});

describe('cross-user isolation of the recorded rows', () => {
    it('stamps every attempt with the calling user, never the payload user', async () => {
        await recordAttempts({
            ...oneAttempt('sess-1'),
            attempts: [{ questionId: 'q1', userAnswer: 'A', clientAttemptId: 'cid-1', userId: OTHER }],
        });

        const create = calls.find((c) => c.name === 'questionAttempt.createMany');
        expect(create.args.data[0].userId).toBe(USER);
    });
});
