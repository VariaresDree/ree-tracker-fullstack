// src/services/gauntletService.js
//
// The Gauntlet ladder on the server: level, 12-hour lock and subject boards
// cleared, written when a run is graded (POST /api/exams/grade with a
// `gauntlet` block) or forfeited (POST /api/exams/gauntlet/forfeit).
//
// The ladder used to live only in each device's local stats — User.gauntletLevel
// existed and was never written — so signing out, a second device or a run
// graded offline lost the learner's place, and "Exit" dodged the lock. The rule
// itself is @ree/shared's decideGauntletOutcome, which the client also applies
// optimistically until this answers.

'use strict';

const prisma = require('../config/db');
const {
    decideGauntletOutcome, forfeitGauntlet, gauntletState, getGauntletTier,
} = require('@ree/shared');
const { subjectScoresBySession } = require('./deepAnalyticsHelpers');
const { subjectRowsFor } = require('./examHistory');

class GauntletError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const MAX_BACKDATE_MS = 7 * 24 * 60 * 60 * 1000;

/** A client timestamp, clamped to [now - 7 days, now]; `fallback` if unusable. */
function clampClientTime(iso, now, fallback = now) {
    const t = Date.parse(iso || '');
    if (!Number.isFinite(t)) return fallback;
    return Math.min(now, Math.max(now - MAX_BACKDATE_MS, t));
}

/** The ladder as the API reports it. */
function publicState(state) {
    return {
        level: state.level,
        lockUntil: state.lockUntilMs ? new Date(state.lockUntilMs).toISOString() : null,
        boardClears: state.boardClears,
    };
}

/** The stored ladder, adopting the device's level once for an untracked account. */
function storedState(user, knownLevel) {
    const tracked = !!user.gauntletUpdatedAt;
    return gauntletState({
        level: tracked ? user.gauntletLevel : Math.max(user.gauntletLevel || 1, knownLevel || 1),
        lockUntilMs: user.gauntletLockUntil ? user.gauntletLockUntil.getTime() : null,
        boardClears: user.gauntletBoardClears || [],
    });
}

async function lockUser(tx, userId) {
    // Tagged template: bound parameter, so the SQL-interpolation guard passes.
    const rows = await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    if (!rows || rows.length === 0) throw new GauntletError(404, 'Account not found.');
    return tx.user.findUnique({
        where: { id: userId },
        select: { gauntletLevel: true, gauntletLockUntil: true, gauntletBoardClears: true, gauntletUpdatedAt: true },
    });
}

/**
 * Apply a graded run to the ladder. The run's attempts must already be
 * recorded under `runId` (recordAttempts with sessionId = runId). Idempotent:
 * a replay returns the stored result and changes nothing.
 */
async function applyGauntletRun({ userId, runId, level, knownLevel, startedAt, finishedAt, now = Date.now() }) {
    const tier = getGauntletTier(level);
    if (!tier) throw new GauntletError(400, 'Unknown Gauntlet level.');

    // Outside the transaction: a read through the module-level client inside
    // an interactive transaction can wait on the pool the transaction holds.
    const subjectScores = subjectScoresBySession(await subjectRowsFor(userId, [runId]))[runId] || {};
    if (Object.keys(subjectScores).length === 0) throw new GauntletError(409, 'No answers are recorded for this run yet.');

    const finishedAtMs = clampClientTime(finishedAt, now);
    const startedAtMs = clampClientTime(startedAt, now, finishedAtMs);

    return prisma.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        const session = await tx.examSession.findFirst({ where: { id: runId, userId }, select: { config: true } });
        const prior = session?.config && typeof session.config === 'object' ? session.config : {};
        if (prior.gauntlet) return { ...prior.gauntlet, replayed: true };

        const decision = decideGauntletOutcome({
            tier,
            state: storedState(user, knownLevel),
            subjectScores,
            startedAtMs,
            finishedAtMs,
        });
        const next = decision.next;
        await tx.user.update({
            where: { id: userId },
            data: {
                gauntletLevel: next.level,
                gauntletLockUntil: next.lockUntilMs ? new Date(next.lockUntilMs) : null,
                gauntletBoardClears: next.boardClears,
                gauntletUpdatedAt: new Date(now),
            },
        });

        const result = {
            sessionId: runId,
            outcome: decision.outcome,
            verdict: decision.verdict,
            generalAverage: decision.generalAverage,
            subjectScores,
            ...publicState(next),
        };
        await tx.examSession.updateMany({
            where: { id: runId, userId },
            data: {
                verdict: decision.verdict,
                config: {
                    ...prior,
                    kind: 'gauntlet',
                    level: tier.level,
                    subjectScores,
                    generalAverage: decision.generalAverage,
                    finalizedAt: new Date(now).toISOString(),
                    gauntlet: result,
                },
            },
        });
        return result;
    });
}

/**
 * Leaving a started run counts as not passing it: lock the ladder from when
 * the learner left. Idempotent (the lock is the later of the two).
 */
async function forfeitGauntletRun({ userId, level, knownLevel, at, now = Date.now() }) {
    if (!getGauntletTier(level)) throw new GauntletError(400, 'Unknown Gauntlet level.');
    const atMs = clampClientTime(at, now);
    return prisma.$transaction(async (tx) => {
        const user = await lockUser(tx, userId);
        const next = forfeitGauntlet(storedState(user, knownLevel), atMs);
        await tx.user.update({
            where: { id: userId },
            data: {
                gauntletLevel: next.level,
                gauntletLockUntil: next.lockUntilMs ? new Date(next.lockUntilMs) : null,
                gauntletBoardClears: next.boardClears,
                gauntletUpdatedAt: new Date(now),
            },
        });
        return { outcome: 'forfeited', ...publicState(next) };
    });
}

module.exports = { applyGauntletRun, forfeitGauntletRun, storedState, publicState, clampClientTime, GauntletError };
