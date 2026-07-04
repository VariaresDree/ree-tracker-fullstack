// src/utils/battleSanitizer.js
// Battles are competitive, so their question payloads must never carry the
// answer key (or calibration internals) to the client. Pure functions —
// unit-tested without a DB.

// Allowlist mapper: everything not listed here (answer, fixedExplanation,
// irtA/irtB/irtC, calibrationN, explanationStatus, ...) is dropped.
const PUBLIC_FIELDS = ['id', 'subject', 'subtopic', 'text', 'options', 'type', 'difficulty', 'bloomLevel'];

function sanitizeBattleQuestions(questions) {
    if (!Array.isArray(questions)) return [];
    return questions.map((q) => {
        const out = {};
        for (const f of PUBLIC_FIELDS) {
            if (q && q[f] !== undefined) out[f] = q[f];
        }
        return out;
    });
}

// { [questionId]: answer } — kept server-side during the battle, revealed to
// clients only in the battle-complete broadcast so the review screen works.
function buildAnswerKey(questions) {
    if (!Array.isArray(questions)) return {};
    const key = {};
    for (const q of questions) {
        if (q && q.id != null && q.answer !== undefined) key[q.id] = q.answer;
    }
    return key;
}

// { [questionId]: fixedExplanation } — revealed alongside the answer key at
// battle-complete so the post-battle review can show offline solutions
// (sanitization strips them during play, which left battle reviews without
// any "Show solution" option).
function buildExplanationKey(questions) {
    if (!Array.isArray(questions)) return {};
    const key = {};
    for (const q of questions) {
        if (q && q.id != null && q.fixedExplanation) key[q.id] = q.fixedExplanation;
    }
    return key;
}

module.exports = { sanitizeBattleQuestions, buildAnswerKey, buildExplanationKey, PUBLIC_FIELDS };
