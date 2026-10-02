// BKT mastery bands — the single definition.
//
// Written out twice with nothing tying them together: the heatmap's Mastery
// view (HeatmapChart, on a 0-100 scale) and the backfill's dry-run report
// (scripts/backfillMastery.js, on 0-1). Same numbers today; nothing kept them so.

'use strict';

/** Ordered high → low; `min` is inclusive, on the P(mastery) 0-1 scale. */
const MASTERY_BANDS = Object.freeze([
    Object.freeze({ key: 'mastered', label: 'Mastered', min: 0.85 }),
    Object.freeze({ key: 'proficient', label: 'Proficient', min: 0.65 }),
    Object.freeze({ key: 'developing', label: 'Developing', min: 0.45 }),
    Object.freeze({ key: 'novice', label: 'Novice', min: 0 }),
]);

/** The band for a P(mastery) in [0, 1], or null when there is no estimate yet. */
function masteryBand(pMastery) {
    if (pMastery === null || pMastery === undefined || !Number.isFinite(Number(pMastery))) return null;
    const p = Number(pMastery);
    return MASTERY_BANDS.find((b) => p >= b.min) || MASTERY_BANDS[MASTERY_BANDS.length - 1];
}

module.exports = { MASTERY_BANDS, masteryBand };
