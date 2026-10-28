// Review phases — where a learner is on the road to the board, from the days
// left. The CELE tracker's "Tips" sheet told the story in its own words:
// concepts first while the topics are being taught, intensity and preboards in
// the refresher (under two months out), and in the last month the body clock
// moved to the board's 8 AM start. The app shows the phase on Today with a
// short playbook, and the study plan sets its timed sittings closer together
// as the exam nears (PHASE_MOCK_EVERY).
//
// One rule for the client and the server, so Today and the plan agree.

'use strict';

/** Phases, earliest first. `minDays`: the fewest days left that still count as this phase. */
const REVIEW_PHASES = Object.freeze([
    Object.freeze({ id: 'foundations', label: 'Foundations', minDays: 121 }),
    Object.freeze({ id: 'practice', label: 'Practice', minDays: 61 }),
    Object.freeze({ id: 'refresher', label: 'Refresher', minDays: 15 }),
    Object.freeze({ id: 'final', label: 'Final stretch', minDays: 4 }),
    Object.freeze({ id: 'eve', label: 'Exam eve', minDays: 1 }),
    Object.freeze({ id: 'exam', label: 'Exam day', minDays: 0 }),
]);

/**
 * A timed PRC sitting every N study days in each phase. The last three days
 * before the exam are light review (FINAL_REVIEW_DAYS in engine/plan.js), so
 * the eve and the day itself have none.
 */
const PHASE_MOCK_EVERY = Object.freeze({ foundations: 7, practice: 7, refresher: 5, final: 4, eve: null, exam: null });

/**
 * The phase for this many whole days left, or null (no exam date, or past it).
 * @param {number|null|undefined} daysToExam
 * @returns {{ id: string, label: string, minDays: number }|null}
 */
function reviewPhase(daysToExam) {
    if (daysToExam == null || !Number.isFinite(Number(daysToExam))) return null;
    const days = Math.floor(Number(daysToExam));
    if (days < 0) return null;
    return REVIEW_PHASES.find((p) => days >= p.minDays) || null;
}

module.exports = { REVIEW_PHASES, PHASE_MOCK_EVERY, reviewPhase };
