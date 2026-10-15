// The order a question's answer choices are shown in.
//
// Shown in their stored order, the key sat at A far too often (the AI wrote
// it first, and admin edits put it back there), so pressing A scored close to
// half a session. Every screen a learner answers on now shows the choices in
// an order drawn for that sitting: random per sitting and per question, so
// position, spatial memory and elimination by routine stop paying, and the
// answer has to be recalled.
//
// The order comes from a seed, not Math.random:
//   • the same key gives the same order, so a sitting keeps it through
//     re-renders, Next and Back, a resume after reload and a battle rejoin,
//     and the sitting's review can show what was seen without storing it;
//   • a new sitting brings a new key, so a new order.
//
// Grading is untouched: the key is the option's text everywhere, never its
// letter or position.
//
// Two kinds of option keep their place, because moving them changes meaning:
//   • a closing option ("All of the above", "None of these", "Neither…")
//     stays last;
//   • an option that only names others by letter ("Both A and B", "A, B and
//     C") means the whole question keeps its stored order.

'use strict';

/** xmur3: a 32-bit hash of a string, as a seed. */
function hashKey(key) {
    const s = String(key ?? '');
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i += 1) {
        h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
}

/** A repeatable random number generator in [0, 1) for `key` (mulberry32). */
function seededRng(key) {
    let a = hashKey(key);
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** The key for one question in one sitting. */
const optionKey = (sittingKey, questionId) => `${sittingKey ?? ''}|${questionId ?? ''}`;

// "All of the above", "None of these", "Neither of the above", "All of them"…
const CLOSING_OPTION = /^\s*(all|none|neither|both)\s+of\s+(the\s+)?(above|these|them|the\s+choices|the\s+options)\b/i;
// "Both A and B", "A and C", "A, B and C", "A, B, and C", "Either A or D",
// "B & C only". Letters are capitals and the joining words stand apart, so
// "Core", "Ford" (C-or-e, F-or-d) and "a, b" are ordinary choices.
const anyCase = (word) => word.split('').map((c) => `[${c.toLowerCase()}${c.toUpperCase()}]`).join('');
const LETTER = '\\(?[A-F]\\)?';
const JOIN = `(?:\\s*[,&]\\s*|\\s*,?\\s+(?:${['and', 'or', 'nor'].map(anyCase).join('|')})\\s+)`;
const LETTERS_ONLY = new RegExp(
    `^\\s*(?:(?:${['both', 'either', 'neither', 'only'].map(anyCase).join('|')})\\s+)?`
    + `${LETTER}(?:${JOIN}${LETTER})+(?:\\s+${anyCase('only')})?\\s*\\.?\\s*$`,
);

const isClosingOption = (option) => typeof option === 'string' && CLOSING_OPTION.test(option);
const isLetterReference = (option) => typeof option === 'string' && LETTERS_ONLY.test(option);

/** An unbiased (Fisher–Yates) shuffle of a copy of `items`, driven by `rng`. */
function shuffleWith(items, rng) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/**
 * The order to show `options` in, as indices into the stored array: the same
 * for the same key, a fresh one for another.
 * @param {string[]} options
 * @param {string} key  optionKey(sittingKey, questionId)
 * @returns {number[]}
 */
function optionOrder(options, key) {
    const list = Array.isArray(options) ? options : [];
    const stored = list.map((_, i) => i);
    if (list.length < 2 || list.some(isLetterReference)) return stored;
    const closing = stored.filter((i) => isClosingOption(list[i]));
    const free = stored.filter((i) => !isClosingOption(list[i]));
    return [...shuffleWith(free, seededRng(key)), ...closing];
}

/** `options` in the order to show them (optionOrder). */
function orderOptions(options, key) {
    if (!Array.isArray(options)) return options;
    return optionOrder(options, key).map((i) => options[i]);
}

/** An unbiased, repeatable shuffle of any list (a sitting's questions). */
function shuffleWithKey(items, key) {
    return shuffleWith(Array.isArray(items) ? items : [], seededRng(key));
}

/** A fresh sitting key: random, for a sitting that has no id of its own. */
function newSittingKey() {
    const c = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Where the key sits across a set of questions: A, B, C, D, a later letter
 * ('other'), or not among the options at all ('missing'), plus how many keep
 * their stored order because an option names others by letter.
 */
function answerPositions(questions) {
    const counts = { A: 0, B: 0, C: 0, D: 0, other: 0, missing: 0, fixedOrder: 0 };
    for (const q of questions || []) {
        const options = Array.isArray(q?.options) ? q.options : [];
        if (options.some(isLetterReference)) counts.fixedOrder += 1;
        const at = options.indexOf(q?.answer);
        if (at < 0) counts.missing += 1;
        else if (at < 4) counts['ABCD'[at]] += 1;
        else counts.other += 1;
    }
    return counts;
}

/** Order tag a sitting carries when its choices were shown by optionOrder. */
const OPTION_ORDER_VERSION = 'seeded-v1';

module.exports = {
    seededRng,
    optionKey,
    optionOrder,
    orderOptions,
    shuffleWithKey,
    newSittingKey,
    answerPositions,
    isClosingOption,
    isLetterReference,
    OPTION_ORDER_VERSION,
};
