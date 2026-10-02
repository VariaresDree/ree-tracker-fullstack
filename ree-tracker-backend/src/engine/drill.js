// Targeted drill — adaptive item choice for a weak topic.
//
// Smart Drill used to rank subtopics by raw accuracy and serve whatever
// questions it found there regardless of difficulty. Items are now chosen the
// way a computerised adaptive test chooses them: by Fisher information at the
// learner's ability in that subject, from a window around θ that widens only
// when the topic is too thin to fill the drill. "Randomesque" (a random pick
// among the most informative, not always THE most informative) keeps two
// drills on one topic from serving the identical set.
//
// Pure and stateless.

'use strict';

const { fisherInfo, itemParams } = require('./irt');

// |b − θ| windows tried in order; the last admits the whole topic.
const WINDOWS = [1, 2, Infinity];
// Pick randomly among this many × limit of the most informative items.
const RANDOMESQUE_FACTOR = 2;

function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * @param {object} input
 * @param {Array<{id, irtA?, irtB?, irtC?, difficulty?}>} input.candidates
 * @param {number} input.theta       ability in the topic's subject
 * @param {number} input.limit
 * @param {Set<string>} [input.exclude]  ids not to serve (recently seen, already chosen)
 * @param {() => number} [input.rng]
 * @returns {string[]} chosen question ids
 */
function selectDrillItems({ candidates, theta, limit, exclude = new Set(), rng = Math.random }) {
    const t = Number.isFinite(theta) ? theta : 0;
    const pool = (candidates || [])
        .filter((c) => c?.id && !exclude.has(c.id))
        .map((c) => ({ id: c.id, params: itemParams(c) }));
    if (pool.length === 0 || limit <= 0) return [];

    let windowed = pool;
    for (const w of WINDOWS) {
        windowed = pool.filter((c) => Math.abs(c.params.b - t) <= w);
        if (windowed.length >= limit) break;
    }

    const ranked = windowed
        .map((c) => ({ id: c.id, info: fisherInfo(t, c.params) }))
        .sort((a, b) => b.info - a.info);
    const shortlist = ranked.slice(0, Math.max(limit, limit * RANDOMESQUE_FACTOR));
    return shuffle(shortlist, rng).slice(0, limit).map((c) => c.id);
}

// Share of a drill given to the 1st, 2nd and 3rd weakest topic.
const SHARES = { 1: [1], 2: [0.6, 0.4], 3: [0.5, 0.3, 0.2] };

/** Split `limit` items across `n` ranked topics (largest remainder, weakest first). */
function splitAcrossTopics(limit, n) {
    const shares = SHARES[Math.min(3, Math.max(1, n))];
    const exact = shares.map((s) => s * limit);
    const out = exact.map(Math.floor);
    let left = limit - out.reduce((a, b) => a + b, 0);
    exact
        .map((x, i) => ({ i, frac: x - Math.floor(x) }))
        .sort((a, b) => b.frac - a.frac || a.i - b.i)
        .forEach(({ i }) => { if (left > 0) { out[i] += 1; left -= 1; } });
    return out;
}

module.exports = { selectDrillItems, splitAcrossTopics, WINDOWS };
