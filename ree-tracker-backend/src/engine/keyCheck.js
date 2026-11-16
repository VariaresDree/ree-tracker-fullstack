// Answer-key check: signs that a live question's key is wrong (2026-11-16).
//
// Every question had been through "Fix questions with another AI", yet two EE
// questions kept a wrong key while their own explanation worked out the right
// option ("The total inductance is 0.953 H"; key 0.853 H). The explanation's
// answer line is the cheapest second opinion there is: no AI, no learners
// needed. Learners' answers add another once enough of them have answered.
//
// Pure and stateless; services/keyCheck.js reads the bank and stores findings.

'use strict';

// At least this many learners before their answers say anything about a key.
const MIN_LEARNERS = 4;
// The wrong option most of them chose must beat the key by this many learners.
const LEARNER_MARGIN = 2;

/** The balanced `{...}` group at s[i] (or one character), and where it ends. */
function readArg(s, i) {
    while (s[i] === ' ') i += 1;
    if (s[i] !== '{') {
        // \frac12, \sqrt3, \frac\pi2: one command or one character.
        if (s[i] === '\\') {
            const m = /^\\[a-z]+/i.exec(s.slice(i));
            if (m) return [m[0], i + m[0].length];
        }
        return [s[i] ?? '', i + 1];
    }
    let depth = 0;
    for (let j = i; j < s.length; j += 1) {
        if (s[j] === '{') depth += 1;
        else if (s[j] === '}') {
            depth -= 1;
            if (depth === 0) return [s.slice(i + 1, j), j + 1];
        }
    }
    return [s.slice(i + 1), s.length];
}

/** \frac{a}{b} → (a)/(b) and \sqrt{x} → sqrt(x), nested ones too. */
function unwrapCommands(s) {
    let out = '';
    let i = 0;
    while (i < s.length) {
        const rest = s.slice(i);
        const frac = /^\\[dt]?frac/.exec(rest);
        if (frac) {
            const [a, j] = readArg(s, i + frac[0].length);
            const [b, k] = readArg(s, j);
            out += `(${unwrapCommands(a)})/(${unwrapCommands(b)})`;
            i = k;
            continue;
        }
        const one = /^\\(sqrt|bar|overline|text|mathrm|mathbf|operatorname|textrm|mbox)\b/.exec(rest);
        if (one) {
            const [a, j] = readArg(s, i + one[0].length);
            const name = one[1] === 'sqrt' ? 'sqrt' : one[1] === 'bar' || one[1] === 'overline' ? 'bar' : '';
            out += `${name}(${unwrapCommands(a)})`;
            i = j;
            continue;
        }
        out += s[i];
        i += 1;
    }
    return out;
}

/**
 * A form of a math answer to compare by: fractions, roots, bars, spacing,
 * \text, brackets and case are spelled one way. "$\frac{8}{3}$ units" and
 * "8/3 units" both become "8/3units".
 */
function normMath(s) {
    let t = String(s ?? '').toLowerCase();
    t = t.replace(/\\(left|right|displaystyle|,|;|!|:| |quad|qquad)/g, ' ').replace(/~/g, ' ');
    t = unwrapCommands(t);
    t = t.replace(/\\(cdot|times)/g, '*')
        .replace(/\^\s*\{?\s*\\circ\s*\}?|°/g, 'deg')
        .replace(/\\(degree)/g, 'deg')
        .replace(/[−–]/g, '-')
        .replace(/\\([a-z]+)/g, '$1') // \pi → pi, \ln → ln
        .replace(/[\s$(){}[\]]/g, '')
        .replace(/\.+$/, '');
    return t;
}

/** The explanation's own final answer: the text after "**Answer:**", or null. */
function answerLine(explanation) {
    const m = /\*\*Answer:?\*\*:?([^\n]*)/i.exec(String(explanation ?? ''));
    const line = m?.[1]?.trim();
    return line ? line : null;
}

const DIGIT = /[\d.]/;
/** Whether `needle` occurs in `hay` with no digit run continuing it ("3" isn't in "13"). */
function containsMath(hay, needle) {
    if (!needle) return false;
    let from = 0;
    for (;;) {
        const at = hay.indexOf(needle, from);
        if (at < 0) return false;
        const before = hay[at - 1];
        const after = hay[at + needle.length];
        const startsDigit = DIGIT.test(needle[0]);
        const endsDigit = DIGIT.test(needle[needle.length - 1]);
        const okBefore = !startsDigit || !before || !/[\d.]/.test(before);
        const okAfter = !endsDigit || !after || !/[\d]/.test(after) || (after === '.' && !/\d/.test(hay[at + needle.length + 1] ?? ''));
        if (okBefore && okAfter) return true;
        from = at + 1;
    }
}

/**
 * The option the explanation's answer line names instead of the key, or null.
 * Only when it names exactly one other option, and not the key in any form; an
 * option that is part of a longer named option ("sqrt3" of "2sqrt3/3") doesn't count.
 */
function explanationNamesOther({ options, answer, fixedExplanation }) {
    const line = answerLine(fixedExplanation);
    if (!line || !Array.isArray(options)) return null;
    const l = normMath(line);
    const key = normMath(answer);
    if (!key || containsMath(l, key)) return null;
    const opts = options.map((o) => ({ o, n: normMath(o) })).filter((x) => x.n.length >= 1 && x.n !== key);
    const named = opts.filter((x) => containsMath(l, x.n)
        && !opts.some((y) => y !== x && y.n.length > x.n.length && y.n.includes(x.n) && containsMath(l, y.n)));
    return named.length === 1 ? named[0].o : null;
}

/** Two options that read the same once spacing and LaTeX are set aside. */
function duplicateOptions(options) {
    if (!Array.isArray(options)) return false;
    const seen = new Set();
    for (const o of options) {
        const n = normMath(o);
        if (seen.has(n)) return true;
        seen.add(n);
    }
    return false;
}

/**
 * Learners' picks say the key may be wrong: enough of them, and one wrong
 * option chosen by clearly more learners than the key.
 * @param {Array<{option: string, learners: number, isKey: boolean}>} picks
 */
function learnersChoseOther(picks) {
    const rows = (picks || []).filter((p) => p && p.option != null);
    const learners = rows.reduce((n, p) => n + p.learners, 0);
    if (learners < MIN_LEARNERS) return null;
    const right = rows.filter((p) => p.isKey).reduce((n, p) => n + p.learners, 0);
    const top = rows.filter((p) => !p.isKey).sort((a, b) => b.learners - a.learners)[0];
    if (!top || top.learners - right < LEARNER_MARGIN) return null;
    return { option: top.option, chose: top.learners, right, learners };
}

/** Every finding for one question: [{ reason, detail }]. */
function findIssues(q, picks = null) {
    const out = [];
    const named = explanationNamesOther(q);
    if (named) out.push({ reason: 'explanation-names-other', detail: { option: named, line: answerLine(q.fixedExplanation)?.slice(0, 300) ?? null } });
    if (duplicateOptions(q.options)) out.push({ reason: 'duplicate-options', detail: null });
    const crowd = learnersChoseOther(picks);
    if (crowd) out.push({ reason: 'learners-chose-other', detail: crowd });
    return out;
}

const REASONS = Object.freeze(['explanation-names-other', 'learners-chose-other', 'duplicate-options']);

module.exports = {
    MIN_LEARNERS, LEARNER_MARGIN, REASONS,
    normMath, answerLine, containsMath, explanationNamesOther, duplicateOptions, learnersChoseOther, findIssues,
};
