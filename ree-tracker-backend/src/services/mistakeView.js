// src/services/mistakeView.js
//
// The mistake notebook, built from rows the app already records. Pure, so the
// rules are tested without a database (tests/mistakeRoutes.test.js); the
// route does the reads.
//
// A mistake is a question with a wrong (not blank) attempt. It is FIXED once
// answered correctly after the last miss, or marked fixed after it (a later
// miss reopens it). The learner's cause, if they gave one, comes from
// MistakeTag; otherwise a cause is suggested from the last miss itself.

'use strict';

const { isMistakeFixed, suggestMistakeCause, normalizeSubject } = require('@ree/shared');

/** The most mistakes one list carries (the newest). */
const MISTAKE_LIST_MAX = 300;

const timeOf = (row) => new Date(row.answeredAt || row.createdAt).getTime();

/** The distinct question ids of wrong attempts (newest first), at most `limit`. */
function mistakeQuestionIds(wrong, limit = MISTAKE_LIST_MAX) {
    const ids = [];
    const seen = new Set();
    for (const a of wrong || []) {
        if (seen.has(a.questionId)) continue;
        seen.add(a.questionId);
        if (ids.length < limit) ids.push(a.questionId);
    }
    return { ids, truncated: seen.size > ids.length };
}

/**
 * @param {object} rows
 * @param {Array} rows.wrong     wrong, non-blank attempts, newest first
 * @param {Array} rows.correct   correct attempts for those questions
 * @param {Array} rows.questions the questions
 * @param {Array} rows.tags      this learner's MistakeTag rows for them
 * @param {string[]} rows.ids    which questions to list (mistakeQuestionIds)
 */
function buildMistakes({ wrong = [], correct = [], questions = [], tags = [], ids }) {
    const wanted = new Set(ids);
    const byQuestion = new Map();
    for (const a of wrong) {
        if (!wanted.has(a.questionId)) continue;
        const at = timeOf(a);
        const m = byQuestion.get(a.questionId);
        if (!m) {
            byQuestion.set(a.questionId, { last: a, lastWrongAt: at, timesWrong: 1 });
            continue;
        }
        m.timesWrong += 1;
        if (at > m.lastWrongAt) { m.lastWrongAt = at; m.last = a; }
    }
    const lastCorrect = new Map();
    for (const a of correct) {
        const at = timeOf(a);
        if (at > (lastCorrect.get(a.questionId) ?? -Infinity)) lastCorrect.set(a.questionId, at);
    }
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const tagById = new Map(tags.map((t) => [t.questionId, t]));

    const items = [];
    for (const [questionId, m] of byQuestion) {
        const q = questionById.get(questionId);
        if (!q) continue;
        const tag = tagById.get(questionId);
        const lastCorrectAt = lastCorrect.get(questionId) ?? null;
        const subject = normalizeSubject(q.subject || m.last.subject || '');
        items.push({
            questionId,
            subject,
            topic: q.subtopic || m.last.subtopic || null,
            text: q.text,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.answer ?? null,
            explanation: q.fixedExplanation || null,
            type: q.type || null,
            // null = not recorded (an attempt from before answers were stored).
            lastAnswer: m.last.selectedAnswer ?? null,
            confidence: m.last.confidenceLevel || null,
            timeSpentMs: Number.isFinite(m.last.timeSpentMs) ? m.last.timeSpentMs : 0,
            timesWrong: m.timesWrong,
            lastWrongAt: new Date(m.lastWrongAt).toISOString(),
            lastCorrectAt: lastCorrectAt == null ? null : new Date(lastCorrectAt).toISOString(),
            cause: tag?.cause ?? null,
            suggestedCause: suggestMistakeCause(m.last, subject),
            resolvedAt: tag?.resolvedAt ? new Date(tag.resolvedAt).toISOString() : null,
            fixed: isMistakeFixed({ lastWrongAt: m.lastWrongAt, lastCorrectAt, resolvedAt: tag?.resolvedAt ?? null }),
        });
    }
    return items.sort((a, b) => (a.lastWrongAt < b.lastWrongAt ? 1 : a.lastWrongAt > b.lastWrongAt ? -1 : 0));
}

module.exports = { buildMistakes, mistakeQuestionIds, MISTAKE_LIST_MAX };
