// Printed paper sets: the rules the app and the API must agree on.
//
// A printed set (Exams > Paper sets) is a mock exam drawn once, printed on
// paper, and marked from photos of its answer sheets. The questions are kept
// as drawn; edits made for that printing sit beside them and change only that
// set (never the question bank). The server recomputes the key version and
// scores every scanned sheet itself with the same functions the app uses for
// its instant result, so the two can never show different scores.
//
// Answers are one character per item: A-F for a single mark, '-' for blank,
// '*' for two or more marks (invalid, scored wrong, as on the PRC sheet).

'use strict';

const { gradeBoardExam } = require('./exam');
const { normalizeSubject } = require('./subject');

const PAPER_SET_LIMITS = Object.freeze({
    items: 150,
    options: 6,
    stem: 8000,
    option: 1500,
    explanation: 16000,
    title: 120,
    takerName: 80,
    bytes: 1000000,
    perUser: 300,
    sheetsPerSet: 1000,
});

// Crockford base32: no I, L, O or U, so a code read aloud or retyped from a
// footer can't be confused, and it stays in the QR's alphanumeric mode.
const PRINT_ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const PRINT_ID_RE = /^[0-9A-HJKMNP-TV-Z]{12}$/;
const ANSWER_RE = /^[A-F*-]+$/;
const PAPER_PROFILES = Object.freeze(['prc_subject', 'prc_blended', 'custom']);
const PAPER_KINDS = Object.freeze(['a4', 'letter', 'long']);

const letterOf = (i) => String.fromCharCode(65 + i);

/** FNV-1a, base 36: the same hash the app's content keys and set ids use. */
function fnv1a(str) {
    let h = 2166136261 >>> 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
}

/** "K7P29QXAM3TD" as "K7P2-9QXA-M3TD". */
function formatPrintId(id) {
    const s = String(id || '');
    return s.length === 12 ? `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` : s;
}

/** A typed or read code back to its id: case, dashes and spaces dropped; I/L read as 1, O as 0. */
function normalizePrintId(input) {
    const s = String(input || '').toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
    return PRINT_ID_RE.test(s) ? s : null;
}

/**
 * The items as they print: each item's edit laid over the drawn item.
 * Editing the options without naming the answer leaves the key unmatched
 * (answerIndex -1), so a changed list can never silently keep a stale key.
 * @param {object[]} items   as drawn: { n, text, options, answer, answerIndex, explanation, ... }
 * @param {Record<string, object>} [edits]  { "<n>": { text?, options?, answerIndex?, explanation? } }
 * @returns {object[]} items with `answerLetter` ('-' when unmatched) and `edited`
 */
function effectiveItems(items, edits) {
    return (items || []).map((it) => {
        const e = edits && edits[String(it.n)];
        const options = e && Array.isArray(e.options) ? e.options.slice() : (it.options || []).slice();
        let answerIndex = Number.isInteger(it.answerIndex) ? it.answerIndex : -1;
        if (e && Array.isArray(e.options)) answerIndex = Number.isInteger(e.answerIndex) ? e.answerIndex : -1;
        else if (e && Number.isInteger(e.answerIndex)) answerIndex = e.answerIndex;
        if (answerIndex >= options.length) answerIndex = -1;
        const merged = {
            ...it,
            text: e && typeof e.text === 'string' ? e.text : it.text,
            options,
            answerIndex,
            answer: answerIndex >= 0 ? options[answerIndex] : (it.answer ?? ''),
            explanation: e && Object.prototype.hasOwnProperty.call(e, 'explanation') ? e.explanation : (it.explanation ?? null),
            edited: !!e,
        };
        merged.answerLetter = answerIndex >= 0 ? letterOf(answerIndex) : '-';
        return merged;
    });
}

/** The key's version: changes whenever any answer letter does, and only then. */
function keyVersionOf(items) {
    return fnv1a((items || []).map((it) => (Number.isInteger(it.answerIndex) && it.answerIndex >= 0 ? letterOf(it.answerIndex) : '-')).join(''));
}

/**
 * What's wrong with an edit, field by field ({} when it's fine). Run by the
 * editor before saving and by the API before storing.
 * @returns {Record<string, string>}
 */
function itemEditErrors(edit) {
    const errors = {};
    if (!edit || typeof edit !== 'object') return { edit: 'Nothing to save.' };
    const L = PAPER_SET_LIMITS;
    if (edit.text !== undefined) {
        if (typeof edit.text !== 'string' || !edit.text.trim()) errors.text = 'Write the question.';
        else if (edit.text.length > L.stem) errors.text = `Keep the question under ${L.stem} characters.`;
    }
    if (edit.options !== undefined) {
        const opts = Array.isArray(edit.options) ? edit.options : [];
        if (opts.length < 2 || opts.length > L.options) errors.options = `Give between 2 and ${L.options} options.`;
        else if (opts.some((o) => typeof o !== 'string' || !o.trim())) errors.options = 'Fill in every option, or remove it.';
        else if (opts.some((o) => o.length > L.option)) errors.options = `Keep each option under ${L.option} characters.`;
        else {
            const seen = new Set(opts.map((o) => o.trim().toLowerCase()));
            if (seen.size !== opts.length) errors.options = 'Two options are the same.';
        }
        if (!Number.isInteger(edit.answerIndex)) errors.answerIndex = 'Choose the correct answer.';
    }
    if (edit.answerIndex !== undefined && !errors.answerIndex) {
        const count = Array.isArray(edit.options) ? edit.options.length : null;
        if (!Number.isInteger(edit.answerIndex) || edit.answerIndex < 0 || edit.answerIndex >= L.options
            || (count !== null && edit.answerIndex >= count)) errors.answerIndex = 'Choose the correct answer.';
    }
    if (edit.explanation !== undefined && edit.explanation !== null) {
        if (typeof edit.explanation !== 'string') errors.explanation = 'The solution must be text.';
        else if (edit.explanation.length > L.explanation) errors.explanation = `Keep the solution under ${L.explanation} characters.`;
    }
    return errors;
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Score one sheet against a set's key.
 * @param {{ items: object[], sections: {subject:string, from:number, to:number}[], profile?: string }} set
 *        effective items (effectiveItems), in order 1..N
 * @param {string} answers  one character per item (ANSWER_RE)
 * @returns {{ correct, scored, total, percent, sections, generalAverage, verdict, perItem }}
 *   perItem: 'right' | 'wrong' | 'blank' | 'multiple' | 'unscored'. A blank or a
 *   double mark scores 0; an item whose key matches none of its options isn't scored.
 */
function scorePaperSheet(set, answers) {
    const items = (set && set.items) || [];
    const a = String(answers || '');
    const perItem = items.map((it, i) => {
        const key = Number.isInteger(it.answerIndex) ? it.answerIndex : -1;
        if (key < 0) return 'unscored';
        const ch = a[i] || '-';
        if (ch === '-') return 'blank';
        if (ch === '*') return 'multiple';
        return ch.charCodeAt(0) - 65 === key ? 'right' : 'wrong';
    });
    const tally = (from, to) => {
        let correct = 0;
        let total = 0;
        for (let i = from - 1; i < to && i < perItem.length; i++) {
            if (perItem[i] === 'unscored') continue;
            total += 1;
            if (perItem[i] === 'right') correct += 1;
        }
        return { correct, total };
    };
    const all = tally(1, items.length);
    const sections = (set && set.sections ? set.sections : []).map((s) => {
        const t = tally(s.from, s.to);
        return { subject: s.subject, correct: t.correct, total: t.total, percent: t.total ? round1((t.correct / t.total) * 100) : null };
    });
    let generalAverage = null;
    let verdict = null;
    if (String(set && set.profile || '').startsWith('prc')) {
        const subjectScores = {};
        for (const s of sections) {
            if (s.percent === null) continue;
            subjectScores[normalizeSubject(s.subject)] = s.percent;
        }
        const graded = gradeBoardExam(subjectScores);
        generalAverage = round1(graded.generalAverage);
        verdict = graded.verdict;
    }
    return {
        correct: all.correct,
        scored: all.total,
        total: items.length,
        percent: all.total ? round1((all.correct / all.total) * 100) : 0,
        sections,
        generalAverage,
        verdict,
        perItem,
    };
}

module.exports = {
    PAPER_SET_LIMITS,
    PRINT_ID_ALPHABET,
    PRINT_ID_RE,
    ANSWER_RE,
    PAPER_PROFILES,
    PAPER_KINDS,
    paperSetHash: fnv1a,
    formatPrintId,
    normalizePrintId,
    effectiveItems,
    keyVersionOf,
    itemEditErrors,
    scorePaperSheet,
};
