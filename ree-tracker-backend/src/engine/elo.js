// Classic Elo rating, multi-player adapted. Each participant is scored
// against the average rating of the other participants, and the actual
// vs expected outcome drives the delta.
//
// For an N-player free-for-all we treat placement as the actual score:
//   1st of N -> 1.0
//   2nd of N -> (N-2) / (N-1)
//   ...
//   last      -> 0.0
//
// K-factor scales with current rating so the climb is faster early and
// settles to a smaller swing at high ratings.

'use strict';

const TIERS = [
    { name: 'BRONZE', floor: 0 },
    { name: 'SILVER', floor: 1100 },
    { name: 'GOLD', floor: 1300 },
    { name: 'PLATINUM', floor: 1500 },
    { name: 'DIAMOND', floor: 1700 },
];

function tierFor(rating) {
    let chosen = TIERS[0];
    for (const t of TIERS) {
        if (rating >= t.floor) chosen = t;
    }
    return chosen.name;
}

function kFactor(rating) {
    if (rating < 1200) return 40;
    if (rating < 1500) return 30;
    return 20;
}

// Expected score for player A vs the *average* rating of the opposition.
function expected(rA, rOppMean) {
    return 1 / (1 + Math.pow(10, (rOppMean - rA) / 400));
}

// Actual normalized score from a 1-based placement, N participants.
function actualFromPlacement(placement, n) {
    if (n <= 1) return 0.5;
    // 1st => 1.0, last => 0.0; linear interpolation in between.
    return (n - placement) / (n - 1);
}

/**
 * Recompute ELO for every participant of a battle.
 *
 * @param {Array<{userId:string, rating:number, placement:number}>} participants
 *   placement is 1-based, ties are allowed (same placement number).
 * @returns {Array<{userId, ratingBefore, ratingAfter, delta, tierBefore, tierAfter}>}
 */
function recomputeRatings(participants) {
    if (!Array.isArray(participants) || participants.length < 2) {
        return (participants || []).map((p) => ({
            userId: p.userId,
            ratingBefore: p.rating,
            ratingAfter: p.rating,
            delta: 0,
            tierBefore: tierFor(p.rating),
            tierAfter: tierFor(p.rating),
        }));
    }

    const n = participants.length;
    return participants.map((p) => {
        const others = participants.filter((q) => q.userId !== p.userId);
        const oppMean = others.reduce((acc, q) => acc + q.rating, 0) / others.length;
        const exp = expected(p.rating, oppMean);
        const act = actualFromPlacement(p.placement, n);
        const k = kFactor(p.rating);
        const delta = Math.round(k * (act - exp));
        const after = Math.max(0, p.rating + delta);
        return {
            userId: p.userId,
            ratingBefore: p.rating,
            ratingAfter: after,
            delta,
            tierBefore: tierFor(p.rating),
            tierAfter: tierFor(after),
        };
    });
}

module.exports = {
    TIERS,
    tierFor,
    kFactor,
    expected,
    actualFromPlacement,
    recomputeRatings,
};
