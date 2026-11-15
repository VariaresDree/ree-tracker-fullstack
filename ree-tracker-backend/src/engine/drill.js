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

// A subtopic is called weak only after this many answers in it.
const SUBTOPIC_MIN_ANSWERED = 3;
// Share of a topic's drill items given to its weakest subtopic; the rest stay
// adaptive across the whole topic, so a drill never shrinks to one subtopic.
const SUBTOPIC_SHARE = 0.5;

/**
 * The learner's weakest tagged subtopic in a topic, or null: at least
 * SUBTOPIC_MIN_ANSWERED answers, below `weakBelow` right, lowest first by
 * (correct + 1) / (answered + 2) so 0 of 3 doesn't outrank 2 of 12 on luck.
 * @param {Array<{subtopicId, answered, correct}>} rows
 */
function weakestSubtopic(rows, weakBelow) {
    const smoothed = (r) => (r.correct + 1) / (r.answered + 2);
    return (rows || [])
        .filter((r) => r?.subtopicId && r.answered >= SUBTOPIC_MIN_ANSWERED && r.correct / r.answered < weakBelow)
        .sort((a, b) => smoothed(a) - smoothed(b) || b.answered - a.answered)[0] || null;
}

module.exports = { selectDrillItems, splitAcrossTopics, weakestSubtopic, WINDOWS, SUBTOPIC_MIN_ANSWERED, SUBTOPIC_SHARE };
