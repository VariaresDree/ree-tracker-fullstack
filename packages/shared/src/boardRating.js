// Board rating calculator — the CELE tracker's "Computing Rating" sheet, on the
// PRC REE rule.
//
// The civil-engineering sheet turned raw scores into a rating with fixed
// weights and printed PASSED at 70%. The REE board is the same shape with its
// own weights (Mathematics 25 / ESAS 30 / EE 45) and one more condition: no
// subject under 50%. Both answers below go through gradeBoardExam, so the
// calculator can never disagree with a graded mock.
//
// A rating needs all three subjects. gradeBoardExam renormalises over the
// subjects it is given (right for a one-subject sitting), so a board with a
// subject still to sit would otherwise be "rated" on two thirds of the exam.
//
// Pure: it runs on the device, offline, and in both contract tests.

'use strict';

const { normalizeSubject, CANONICAL_SUBJECTS } = require('./subject');
const { toScore } = require('./numeric');
const { PRC_EXAM_FORMAT, gradeBoardExam } = require('./exam');
const { SUBJECT_FLOOR, VERDICT } = require('./verdict');

const round1 = (n) => Math.round(n * 10) / 10;

/** A part's percentage (unrounded), or null when the part is incomplete or out of range. */
function partPercent(part) {
    const score = toScore(part?.score);
    const total = toScore(part?.total);
    if (score === null || total === null || total <= 0 || score < 0 || score > total) return null;
    return (score / total) * 100;
}

/** Per-subject percentages from parts, by canonical subject; the first part of a subject wins. */
function percentsOf(parts, skip = null) {
    const out = {};
    for (const part of parts || []) {
        const subject = normalizeSubject(part?.subject);
        if (!CANONICAL_SUBJECTS.includes(subject) || subject === skip || subject in out) continue;
        const pct = partPercent(part);
        if (pct !== null) out[subject] = pct;
    }
    return out;
}

/**
 * Rate a board from its parts.
 *
 * @param {Array<{subject: string, score: number, total: number}>} parts
 * @returns {{
 *   subjects: Array<{subject: string, percent: number, belowFloor: boolean}>,
 *   generalAverage: number|null,
 *   verdict: string|null,
 *   complete: boolean,
 * }} subjects in board order (rated parts only, percent to one decimal);
 *   the weighted average and verdict only once all three subjects are rated.
 */
function rateBoard(parts) {
    const percents = percentsOf(parts);
    const rated = CANONICAL_SUBJECTS.filter((s) => s in percents);
    const complete = rated.length === CANONICAL_SUBJECTS.length;
    const graded = complete ? gradeBoardExam(percents) : null;
    return {
        subjects: rated.map((s) => ({ subject: s, percent: round1(percents[s]), belowFloor: percents[s] < SUBJECT_FLOOR })),
        generalAverage: graded ? graded.generalAverage : null,
        verdict: graded ? graded.verdict : null,
        complete,
    };
}

/**
 * The smallest whole score in `subject` that passes the board outright (the
 * 70 average AND every subject at 50 or more), given the other two subjects.
 * Found by grading each score in turn, so it matches gradeBoardExam's
 * rounding exactly.
 *
 * @param {{ known: Array<{subject, score, total}>, subject: string, items?: number }} input
 *   `known` holds the other two subjects; `items` is the subject's item count
 *   (the PRC's 100 by default).
 * @returns {{items: number, of: number, percent: number}}  the score to aim for
 *   | {unreachable: true, of: number}   even a perfect score falls short
 *   | {blockedBy: string[]}             a known subject is under the 50% floor
 *   | null                              the other two subjects aren't both rated
 */
function scoreNeeded({ known, subject, items } = {}) {
    const target = normalizeSubject(subject);
    if (!CANONICAL_SUBJECTS.includes(target)) return null;
    const of = Number(items ?? PRC_EXAM_FORMAT[target].items);
    if (!Number.isInteger(of) || of < 1) return null;

    const percents = percentsOf(known, target);
    const others = CANONICAL_SUBJECTS.filter((s) => s !== target);
    if (!others.every((s) => s in percents)) return null;
    const blockedBy = others.filter((s) => percents[s] < SUBJECT_FLOOR);
    if (blockedBy.length > 0) return { blockedBy };

    for (let n = 0; n <= of; n++) {
        const pct = (n / of) * 100;
        if (gradeBoardExam({ ...percents, [target]: pct }).verdict === VERDICT.PASSED) {
            return { items: n, of, percent: round1(pct) };
        }
    }
    return { unreachable: true, of };
}

module.exports = { rateBoard, scoreNeeded };
