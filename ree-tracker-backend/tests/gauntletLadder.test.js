import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The Gauntlet ladder is the server's: level, lock and subject boards cleared.
// It used to live only in each device's stats (User.gauntletLevel was never
// written), passed on a raw 70% with no subject floor, and "Exit" dodged the
// lock. One rule (@ree/shared decideGauntletOutcome) serves server and client.

const {
    decideGauntletOutcome, forfeitGauntlet, getGauntletTier, GAUNTLET_LOCK_MS, SUBJECT_UNLOCK_LEVEL,
} = require('@ree/shared');
const prisma = require('../src/config/db');
const gauntletService = require('../src/services/gauntletService');

const T0 = Date.parse('2026-10-09T08:00:00Z');
const pass = { Mathematics: 80, ESAS: 78, EE: 75 };

describe('decideGauntletOutcome', () => {
    it('a pass on the current blended tier advances one level', () => {
        const d = decideGauntletOutcome({ tier: getGauntletTier(2), state: { level: 2 }, subjectScores: pass, startedAtMs: T0, finishedAtMs: T0 + 1 });
        expect(d).toMatchObject({ outcome: 'advanced', verdict: 'PASSED', next: { level: 3, lockUntilMs: null } });
    });

    it('a pass on a lower tier changes nothing', () => {
        const d = decideGauntletOutcome({ tier: getGauntletTier(1), state: { level: 3 }, subjectScores: pass, finishedAtMs: T0 });
        expect(d.outcome).toBe('passed');
        expect(d.next.level).toBe(3);
    });

    it('judges by the PRC rule: a raw 70+ with a subject under 50 is not a pass', () => {
        const d = decideGauntletOutcome({ tier: getGauntletTier(1), state: { level: 1 }, subjectScores: { Mathematics: 45, ESAS: 80, EE: 85 }, finishedAtMs: T0 });
        expect(d.verdict).toBe('CONDITIONAL PASS');
        expect(d.outcome).toBe('failed');
        expect(d.next).toMatchObject({ level: 1, lockUntilMs: T0 + GAUNTLET_LOCK_MS });
    });

    it('a subject board pass records the clear without moving the level', () => {
        const d = decideGauntletOutcome({ tier: getGauntletTier(6), state: { level: SUBJECT_UNLOCK_LEVEL }, subjectScores: { ESAS: 82 }, finishedAtMs: T0 });
        expect(d.outcome).toBe('cleared');
        expect(d.next).toMatchObject({ level: 5, boardClears: ['ESAS'] });
    });

    it('a run started inside a lock changes nothing; one started before the failing run still counts', () => {
        const state = { level: 2, lockUntilMs: T0 + GAUNTLET_LOCK_MS };
        const during = decideGauntletOutcome({ tier: getGauntletTier(2), state, subjectScores: pass, startedAtMs: T0 + 3600000, finishedAtMs: T0 + 7200000 });
        expect(during.outcome).toBe('locked');
        const earlier = decideGauntletOutcome({ tier: getGauntletTier(2), state, subjectScores: pass, startedAtMs: T0 - 3600000, finishedAtMs: T0 - 600000 });
        expect(earlier.outcome).toBe('advanced');
    });

    it('a fail synced late locks from when the run ended, never shortening a lock', () => {
        const d = decideGauntletOutcome({ tier: getGauntletTier(1), state: { level: 1, lockUntilMs: T0 + 2 * GAUNTLET_LOCK_MS }, subjectScores: { Mathematics: 10 }, finishedAtMs: T0 });
        expect(d.next.lockUntilMs).toBe(T0 + 2 * GAUNTLET_LOCK_MS);
    });

    it('forfeiting locks from the moment the learner left', () => {
        expect(forfeitGauntlet({ level: 3 }, T0)).toMatchObject({ level: 3, lockUntilMs: T0 + GAUNTLET_LOCK_MS });
    });
});

describe('gauntletService', () => {
    let user;
    let session;
    const tx = {
        $queryRaw: vi.fn(async () => [{ id: 'u1' }]),
        user: { findUnique: vi.fn(async () => user), update: vi.fn(async ({ data }) => ({ ...user, ...data })) },
        examSession: { findFirst: vi.fn(async () => session), updateMany: vi.fn(async () => ({ count: 1 })) },
    };
    beforeEach(() => {
        user = { gauntletLevel: 1, gauntletLockUntil: null, gauntletBoardClears: [], gauntletUpdatedAt: null };
        session = { config: {} };
        vi.spyOn(prisma, '$transaction').mockImplementation(async (fn) => fn(tx));
        vi.spyOn(prisma, '$queryRaw').mockResolvedValue([
            { sessionId: 'run-12345', subject: 'Mathematics', total: 10, correct: 8 },
            { sessionId: 'run-12345', subject: 'ESAS', total: 10, correct: 8 },
            { sessionId: 'run-12345', subject: 'EE', total: 10, correct: 8 },
        ]);
        Object.values(tx.user).forEach((f) => f.mockClear());
        tx.examSession.updateMany.mockClear();
    });
    afterEach(() => vi.restoreAllMocks());

    it('adopts the device’s level once, then advances and records the run', async () => {
        const r = await gauntletService.applyGauntletRun({ userId: 'u1', runId: 'run-12345', level: 3, knownLevel: 3, finishedAt: new Date(T0).toISOString(), now: T0 + 1000 });
        expect(r).toMatchObject({ outcome: 'advanced', verdict: 'PASSED', level: 4 });
        expect(tx.user.update.mock.calls[0][0].data).toMatchObject({ gauntletLevel: 4, gauntletUpdatedAt: new Date(T0 + 1000) });
        expect(tx.examSession.updateMany.mock.calls[0][0].data.config.gauntlet).toMatchObject({ outcome: 'advanced' });
    });

    it('ignores the device’s level once the server tracks the ladder', async () => {
        user = { ...user, gauntletLevel: 2, gauntletUpdatedAt: new Date(T0 - 1) };
        const r = await gauntletService.applyGauntletRun({ userId: 'u1', runId: 'run-12345', level: 3, knownLevel: 5, now: T0 });
        expect(r.outcome).toBe('passed'); // level 3 isn't the current level 2
        expect(r.level).toBe(2);
    });

    it('a replayed run returns the stored result and writes nothing', async () => {
        session = { config: { gauntlet: { outcome: 'advanced', level: 2 } } };
        const r = await gauntletService.applyGauntletRun({ userId: 'u1', runId: 'run-12345', level: 1, now: T0 });
        expect(r).toMatchObject({ outcome: 'advanced', replayed: true });
        expect(tx.user.update).not.toHaveBeenCalled();
    });

    it('answers 409 while the run’s answers haven’t landed', async () => {
        prisma.$queryRaw.mockResolvedValue([]);
        await expect(gauntletService.applyGauntletRun({ userId: 'u1', runId: 'run-12345', level: 1 })).rejects.toMatchObject({ status: 409 });
    });

    it('forfeit locks the ladder, clamped to now', async () => {
        const r = await gauntletService.forfeitGauntletRun({ userId: 'u1', level: 2, knownLevel: 2, at: new Date(T0 + 99999999).toISOString(), now: T0 });
        expect(r).toMatchObject({ outcome: 'forfeited', level: 2, lockUntil: new Date(T0 + GAUNTLET_LOCK_MS).toISOString() });
    });
});
