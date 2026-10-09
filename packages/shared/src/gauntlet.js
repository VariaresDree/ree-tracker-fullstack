// The Gauntlet ladder: its tiers and what a run does to a learner's place on it.
//
// The tiers lived in the client only (ree-tracker/src/config/examStandards.js,
// which now re-exports them from here), and so did the outcome: the level and
// the 12-hour lock were set in the device's local stats. The server never wrote
// User.gauntletLevel, so signing out, a second device, or a run graded offline
// lost the learner's place. The server now applies the same rule this file
// states, and the client applies it optimistically until the server answers.

'use strict';

const { PRC_EXAM_FORMAT, gradeBoardExam } = require('./exam');
const { VERDICT } = require('./verdict');
const { normalizeSubject } = require('./subject');

const sectionSecs = (subject) => PRC_EXAM_FORMAT[subject].minutes * 60;

// Levels 1-4: BLENDED tiers (all subjects), gated by lifetime answered count
//             (`reqQs`) and taken in order; passing the current one advances
//             the level.
// Levels 5-7: per-subject BOARD sittings (100 items on the PRC clock), open
//             once the blended tiers are cleared (level >= 5). Passing one
//             records it as cleared; it doesn't move the level (they are
//             parallel endgame sittings, not rungs).
const GAUNTLET_TIERS = Object.freeze([
    { level: 1, name: 'Warm-up', subject: 'BLENDED', items: 50, timeLimitSecs: 75 * 60, reqQs: 200 },
    { level: 2, name: 'Stretch', subject: 'BLENDED', items: 75, timeLimitSecs: 110 * 60, reqQs: 500 },
    { level: 3, name: 'Full length', subject: 'BLENDED', items: 100, timeLimitSecs: 150 * 60, reqQs: 1000 },
    { level: 4, name: 'Pressure round', subject: 'BLENDED', items: 100, timeLimitSecs: 120 * 60, reqQs: 2000 },
    { level: 5, name: 'Mathematics Board', subject: 'Mathematics', items: 100, timeLimitSecs: sectionSecs('Mathematics'), unlockAfterBlended: true },
    { level: 6, name: 'ESAS Board', subject: 'ESAS', items: 100, timeLimitSecs: sectionSecs('ESAS'), unlockAfterBlended: true },
    { level: 7, name: 'EE Board', subject: 'EE', items: 100, timeLimitSecs: sectionSecs('EE'), unlockAfterBlended: true },
].map((t) => Object.freeze(t)));

const BLENDED_TIER_COUNT = GAUNTLET_TIERS.filter((t) => t.subject === 'BLENDED').length;
const SUBJECT_UNLOCK_LEVEL = BLENDED_TIER_COUNT + 1; // 5
// Not passing locks the WHOLE ladder (one timestamp) for this long.
const GAUNTLET_LOCK_MS = 12 * 60 * 60 * 1000;
// Clock slack when deciding whether a run was started during a lock: a phone
// a few minutes off must not lose a legitimate run taken just after one.
const LOCK_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

const getGauntletTier = (level) => GAUNTLET_TIERS.find((t) => t.level === Number(level)) || null;
const isSubjectTier = (tier) => !!tier && tier.subject !== 'BLENDED';

const clampLevel = (level) => Math.min(SUBJECT_UNLOCK_LEVEL, Math.max(1, Math.floor(Number(level)) || 1));

/** A learner's ladder state, with every field defined. */
function gauntletState({ level, lockUntilMs, boardClears } = {}) {
    return {
        level: clampLevel(level),
        lockUntilMs: Number.isFinite(lockUntilMs) && lockUntilMs > 0 ? lockUntilMs : null,
        boardClears: Array.from(new Set((boardClears || []).map(normalizeSubject).filter(Boolean))).sort(),
    };
}

/** The later of the current lock and `atMs + GAUNTLET_LOCK_MS`. */
function lockAfter(state, atMs) {
    return Math.max(state.lockUntilMs || 0, atMs + GAUNTLET_LOCK_MS);
}

/**
 * What a finished run does to the ladder.
 *
 * Graded by the PRC rule (gradeBoardExam: a 70 weighted average and no subject
 * under 50). The client used to pass on a raw 70% with no subject floor.
 * Only a full PASS advances or clears: a CONDITIONAL PASS (average met, a
 * subject under the floor) is not passing the board, so it locks like a fail.
 *
 * @param tier          the tier the run was for (getGauntletTier)
 * @param state         the ladder before the run (gauntletState)
 * @param subjectScores { Mathematics?, ESAS?, EE? } percentages for the run
 * @param startedAtMs   when the run started (a run started while locked
 *                      changes nothing)
 * @param finishedAtMs  when it ended; a fail locks from here, so a run synced
 *                      late locks from when it was taken, not when it synced
 * @returns {{ outcome: 'advanced'|'passed'|'cleared'|'failed'|'locked',
 *             verdict, generalAverage, next: { level, lockUntilMs, boardClears } }}
 */
function decideGauntletOutcome({ tier, state: rawState, subjectScores, startedAtMs, finishedAtMs }) {
    const state = gauntletState(rawState);
    const { generalAverage, verdict } = gradeBoardExam(subjectScores || {});
    const next = { ...state, boardClears: [...state.boardClears] };
    const end = Number.isFinite(finishedAtMs) ? finishedAtMs : Date.now();

    if (!tier) return { outcome: 'locked', verdict, generalAverage, next };
    // Started inside the lock window (the lock began GAUNTLET_LOCK_MS before it
    // ends). A run started BEFORE the fail that set the lock — an older run
    // synced late from the outbox — is still counted.
    if (state.lockUntilMs && Number.isFinite(startedAtMs)) {
        const lockStart = state.lockUntilMs - GAUNTLET_LOCK_MS;
        if (startedAtMs > lockStart + LOCK_CLOCK_TOLERANCE_MS && startedAtMs < state.lockUntilMs - LOCK_CLOCK_TOLERANCE_MS) {
            return { outcome: 'locked', verdict, generalAverage, next };
        }
    }

    if (verdict !== VERDICT.PASSED) {
        next.lockUntilMs = lockAfter(state, end);
        return { outcome: 'failed', verdict, generalAverage, next };
    }

    if (isSubjectTier(tier)) {
        const subject = normalizeSubject(tier.subject);
        if (!next.boardClears.includes(subject)) next.boardClears = [...next.boardClears, subject].sort();
        return { outcome: 'cleared', verdict, generalAverage, next };
    }
    if (tier.level === state.level) {
        next.level = clampLevel(state.level + 1);
        return { outcome: 'advanced', verdict, generalAverage, next };
    }
    // A pass on a tier below the current level: no change.
    return { outcome: 'passed', verdict, generalAverage, next };
}

/** Leaving a started run counts as not passing it: the ladder locks. */
function forfeitGauntlet(rawState, atMs) {
    const state = gauntletState(rawState);
    return { ...state, lockUntilMs: lockAfter(state, Number.isFinite(atMs) ? atMs : Date.now()) };
}

module.exports = {
    GAUNTLET_TIERS, BLENDED_TIER_COUNT, SUBJECT_UNLOCK_LEVEL, GAUNTLET_LOCK_MS, LOCK_CLOCK_TOLERANCE_MS,
    getGauntletTier, isSubjectTier, gauntletState, decideGauntletOutcome, forfeitGauntlet,
};
