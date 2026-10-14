// src/services/optionAudit.js
//
// Where the key sits across the live bank, for Admin › Question bank's
// "Answer positions" card (GET /api/questions/option-audit). Learners see a
// per-sitting order everywhere now (@ree/shared optionOrder), and new
// questions are stored shuffled (reviewService.storageOrder); this shows
// whether the stored bank still leans, and lists the rows an admin should fix:
//   • keys that aren't one of their options: ungradable (a bare letter, a
//     typo), since grading compares the option's text;
//   • explanations that name an option by letter ("option B is wrong"),
//     which stop making sense once the options are shuffled;
//   • questions whose options name others by letter ("Both A and B"), which
//     keep their stored order and so aren't shuffled at all.
// Existing rows are never reordered here: rewording comes first.

'use strict';

const prisma = require('../config/db');
const { answerPositions, isLetterReference } = require('@ree/shared');

const SAMPLE = 20;
// "option B", "choice (C)", "letter D", "the answer is A". Units in brackets
// ("5 (A)") and bare letters are left alone: too many false alarms.
const LETTER_IN_TEXT = [
    /\b(?:[Oo]ption|[Cc]hoice|[Ll]etter)\s*\(?[A-F]\)?(?![A-Za-z0-9])/,
    /\b[Aa]nswer\s+is\s+\(?[A-F]\)?(?![A-Za-z0-9])/,
];

/** Pure: does this explanation name an option by its letter? */
const namesOptionByLetter = (text) => typeof text === 'string' && LETTER_IN_TEXT.some((re) => re.test(text));

/** Pure: the audit of a set of rows ({ id, options, answer, fixedExplanation }). */
function auditOptions(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const positions = answerPositions(list);
    const missing = [];
    const fixedOrder = [];
    const letterInExplanation = [];
    let letterInExplanationCount = 0;
    for (const q of list) {
        const options = Array.isArray(q.options) ? q.options : [];
        if (!options.includes(q.answer) && missing.length < SAMPLE) missing.push(q.id);
        if (options.some(isLetterReference) && fixedOrder.length < SAMPLE) fixedOrder.push(q.id);
        if (namesOptionByLetter(q.fixedExplanation)) {
            letterInExplanationCount += 1;
            if (letterInExplanation.length < SAMPLE) letterInExplanation.push(q.id);
        }
    }
    const placed = positions.A + positions.B + positions.C + positions.D + positions.other;
    const share = (n) => (placed > 0 ? Math.round((n / placed) * 1000) / 10 : 0);
    return {
        total: list.length,
        positions,
        // Percent of the rows whose key is among their options.
        shares: { A: share(positions.A), B: share(positions.B), C: share(positions.C), D: share(positions.D), other: share(positions.other) },
        letterInExplanation: letterInExplanationCount,
        samples: { missing, fixedOrder, letterInExplanation },
    };
}

/** The audit of the live (unflagged) bank. */
async function auditLiveBank() {
    const rows = await prisma.question.findMany({
        where: { isFlagged: false },
        select: { id: true, options: true, answer: true, fixedExplanation: true },
    });
    return { ...auditOptions(rows), checkedAt: new Date().toISOString() };
}

module.exports = { auditOptions, auditLiveBank, namesOptionByLetter };
