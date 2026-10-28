// Accuracy by time of day (Progress › Habits; CELE round, 2026-10). The CELE
// tracker's author reviewed at night, then in the refresher made themselves a
// morning person because the board starts at 8 AM. This shows whether the
// learner's answers are better at some hours than others, and against board
// hours in particular, from their last BAND_WINDOW_DAYS of answers.
//
// Pure: the route reads answers per Manila hour, and this folds them into bands.

'use strict';

const BAND_WINDOW_DAYS = 90;
/** Bands need this many answers each before they are compared. */
const MIN_BAND_ANSWERS = 30;
/** Points of accuracy between bands before it's worth saying. */
const MIN_GAP = 8;

/** Manila-hour bands, in the day's order. `from` inclusive, `to` exclusive; late night wraps past midnight. */
const TIME_BANDS = Object.freeze([
    Object.freeze({ id: 'early', label: 'Early morning', from: 5, to: 8, board: false }),
    Object.freeze({ id: 'morning', label: 'Morning', from: 8, to: 12, board: true }),
    Object.freeze({ id: 'afternoon', label: 'Afternoon', from: 12, to: 17, board: true }),
    Object.freeze({ id: 'evening', label: 'Evening', from: 17, to: 22, board: false }),
    Object.freeze({ id: 'late', label: 'Late night', from: 22, to: 5, board: false }),
]);

/** The band a Manila hour (0-23) falls in. */
function bandOfHour(hour) {
    return TIME_BANDS.find((b) => (b.from < b.to ? hour >= b.from && hour < b.to : hour >= b.from || hour < b.to));
}

const pct = (correct, answers) => (answers > 0 ? Math.round((correct / answers) * 1000) / 10 : null);

/**
 * @param {Array<{hour: number, answers: number, correct: number, timedMs?: number, timed?: number}>} rows
 *   per Manila hour; timedMs is the summed time of the answers with a usable time, timed their count
 * @returns {{ bands: Array<{id, label, from, to, board, answers, accuracy, avgSeconds}>,
 *   boardHours: { answers, accuracy }, headline: object|null, total: number }}
 */
function summarizeTimeOfDay(rows) {
    const acc = new Map(TIME_BANDS.map((b) => [b.id, { answers: 0, correct: 0, timedMs: 0, timed: 0 }]));
    for (const r of rows || []) {
        const band = bandOfHour(Number(r.hour));
        if (!band) continue;
        const a = acc.get(band.id);
        a.answers += Number(r.answers) || 0;
        a.correct += Number(r.correct) || 0;
        a.timedMs += Number(r.timedMs) || 0;
        a.timed += Number(r.timed) || 0;
    }
    const bands = TIME_BANDS.map((b) => {
        const a = acc.get(b.id);
        return {
            id: b.id, label: b.label, from: b.from, to: b.to, board: b.board,
            answers: a.answers,
            accuracy: pct(a.correct, a.answers),
            avgSeconds: a.timed > 0 ? Math.round(a.timedMs / a.timed / 1000) : null,
        };
    });
    const boardAnswers = bands.filter((b) => b.board).reduce((s, b) => s + b.answers, 0);
    const boardCorrect = TIME_BANDS.filter((b) => b.board).reduce((s, b) => s + acc.get(b.id).correct, 0);
    const boardHours = { answers: boardAnswers, accuracy: pct(boardCorrect, boardAnswers) };

    // The off-hours band most unlike board hours, if both have enough answers.
    let headline = null;
    if (boardAnswers >= MIN_BAND_ANSWERS) {
        const off = bands
            .filter((b) => !b.board && b.answers >= MIN_BAND_ANSWERS)
            .map((b) => ({ ...b, gap: Math.round((b.accuracy - boardHours.accuracy) * 10) / 10 }))
            .sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap))[0];
        if (off && Math.abs(off.gap) >= MIN_GAP) {
            headline = { band: off.id, label: off.label, gap: off.gap, bandAccuracy: off.accuracy, boardAccuracy: boardHours.accuracy };
        }
    }
    return { bands, boardHours, headline, total: bands.reduce((s, b) => s + b.answers, 0) };
}

module.exports = { TIME_BANDS, BAND_WINDOW_DAYS, MIN_BAND_ANSWERS, MIN_GAP, bandOfHour, summarizeTimeOfDay };
