// src/services/sittingReview.js
//
// One finished sitting, item by item: the question, the learner's answer, the
// correct one, the written solution, confidence and time. Behind
// GET /api/analytics/deep/sittings/:id/review — Exams › Past sittings, the
// results screens (all three sections of a full board) and the placement test.
//
// Before this, a sitting could be reviewed only on the results screen right
// after it, and only from that tab's memory. Nothing could reopen a past mock,
// the full board reviewed only its last section, and the placement test showed
// no answers at all. Attempts didn't store the option picked (selectedAnswer,
// migration 20261010000000), so older sittings show "not recorded".
//
// Answers are revealed only once a sitting is CLOSED, so the endpoint can't be
// used to fish for the key mid-exam: a full board stays closed until its last
// section is finalised, a battle until every player is done.

'use strict';

const prisma = require('../config/db');
const { normalizeSubject } = require('@ree/shared');

class SittingReviewError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

const SECTION_ORDER = ['Mathematics', 'ESAS', 'EE'];
// A full board's sections are kept for 7 days; a sitting left open longer is
// abandoned and may be reviewed (FULL_BOARD_TTL_MS on the client).
const ABANDONED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEWABLE_MODES = new Set(['BOARD_SIM', 'BATTLE', 'DIAGNOSTIC', 'GAUNTLET']);

const configOf = (session) => (session?.config && typeof session.config === 'object' ? session.config : {});

/** Pure: may this sitting's answers be shown? */
function isSittingClosed(session, { battleStatus = null, now = Date.now() } = {}) {
    const cfg = configOf(session);
    switch (session.mode) {
        case 'BOARD_SIM':
            return !!cfg.finalizedAt || !!cfg.hiddenFromHistory
                || new Date(session.createdAt).getTime() < now - ABANDONED_AFTER_MS;
        case 'BATTLE':
            return battleStatus === 'COMPLETED';
        case 'DIAGNOSTIC':
            return session.verdict === 'COMPLETED';
        case 'GAUNTLET':
            return !!cfg.gauntlet || !!cfg.finalizedAt;
        default:
            return false;
    }
}

const sectionRank = (subject) => {
    const i = SECTION_ORDER.indexOf(normalizeSubject(subject));
    return i === -1 ? SECTION_ORDER.length : i;
};
const time = (row) => new Date(row.answeredAt || row.createdAt || 0).getTime();

/** Pure: put a sitting's attempt rows in the order they were asked. */
function orderReviewRows(rows, { fullBoard = false, questionOrder = null } = {}) {
    const position = questionOrder ? new Map(questionOrder.map((id, i) => [id, i])) : null;
    return [...rows].sort((a, b) => {
        if (position) {
            const pa = position.has(a.questionId) ? position.get(a.questionId) : Infinity;
            const pb = position.has(b.questionId) ? position.get(b.questionId) : Infinity;
            if (pa !== pb) return pa - pb;
        }
        if (fullBoard) {
            const sa = sectionRank(a.subject);
            const sb = sectionRank(b.subject);
            if (sa !== sb) return sa - sb;
        }
        const ia = Number.isInteger(a.itemIndex) ? a.itemIndex : Infinity;
        const ib = Number.isInteger(b.itemIndex) ? b.itemIndex : Infinity;
        if (ia !== ib) return ia - ib;
        if (time(a) !== time(b)) return time(a) - time(b);
        return String(a.id || '').localeCompare(String(b.id || ''));
    });
}

/** Pure: one row (an attempt, or a placement response) → a review item. */
function reviewItem(row, question, order, marked) {
    const selected = row.selectedAnswer === undefined ? null : row.selectedAnswer;
    return {
        order,
        questionId: row.questionId,
        subject: normalizeSubject(question?.subject || row.subject || ''),
        topic: question?.subtopic || row.subtopic || null,
        text: question?.text || null,
        options: Array.isArray(question?.options) ? question.options : [],
        correctAnswer: question?.answer ?? null,
        explanation: question?.fixedExplanation || null,
        type: question?.type || null,
        // null = not recorded (a sitting from before answers were stored).
        selectedAnswer: selected,
        answered: selected === null ? null : selected !== '',
        isCorrect: !!row.isCorrect,
        confidence: row.confidenceLevel || null,
        timeSpentMs: Number.isFinite(row.timeSpentMs) ? row.timeSpentMs : 0,
        marked: marked.has(row.questionId),
    };
}

const QUESTION_SELECT = { id: true, subject: true, subtopic: true, text: true, options: true, answer: true, fixedExplanation: true, type: true };

/** The review for one of the learner's sittings. */
async function buildSittingReview({ userId, sessionId, now = Date.now() }) {
    const session = await prisma.examSession.findFirst({
        where: { id: sessionId, userId },
        select: { id: true, mode: true, verdict: true, targetSubject: true, score: true, totalQuestions: true, timeTakenSecs: true, config: true, createdAt: true },
    });
    if (!session) throw new SittingReviewError(404, 'Sitting not found.');
    if (!REVIEWABLE_MODES.has(session.mode)) throw new SittingReviewError(422, 'This kind of session has no review.');

    let battle = null;
    if (session.mode === 'BATTLE') {
        const battleId = String(session.id).split(':')[0];
        battle = await prisma.battle.findUnique({ where: { id: battleId }, select: { status: true, questions: true } });
    }
    if (!isSittingClosed(session, { battleStatus: battle?.status, now })) {
        throw new SittingReviewError(409, 'This sitting is still in progress.', 'IN_PROGRESS');
    }

    const cfg = configOf(session);
    const marked = new Set(Array.isArray(cfg.markedQuestionIds) ? cfg.markedQuestionIds : []);
    let rows;
    if (session.mode === 'DIAGNOSTIC' && Array.isArray(cfg.responses)) {
        // The placement test keeps every response in order on the session,
        // answer included, so it reviews fully even from before this column.
        rows = cfg.responses.map((r, i) => ({ ...r, selectedAnswer: typeof r.userAnswer === 'string' ? r.userAnswer : null, itemIndex: i }));
    } else {
        const attempts = await prisma.questionAttempt.findMany({
            where: { sessionId, userId },
            select: {
                id: true, questionId: true, subject: true, subtopic: true, isCorrect: true, confidenceLevel: true,
                timeSpentMs: true, selectedAnswer: true, itemIndex: true, answeredAt: true, createdAt: true,
            },
        });
        rows = orderReviewRows(attempts, {
            fullBoard: cfg.kind === 'full-board',
            questionOrder: Array.isArray(battle?.questions) ? battle.questions.map((q) => q?.id).filter(Boolean) : null,
        });
    }
    // Closed but nothing landed yet: the answers are still in the outbox.
    if (rows.length === 0) throw new SittingReviewError(409, 'This sitting’s answers haven’t synced yet.', 'SYNCING');

    const questions = await prisma.question.findMany({
        where: { id: { in: Array.from(new Set(rows.map((r) => r.questionId))) } },
        select: QUESTION_SELECT,
    });
    const byId = new Map(questions.map((q) => [q.id, q]));

    return {
        session: {
            id: session.id,
            mode: session.mode,
            kind: cfg.kind || (session.mode === 'BATTLE' ? 'battle' : session.mode === 'DIAGNOSTIC' ? 'placement' : session.mode === 'GAUNTLET' ? 'gauntlet' : null),
            targetSubject: cfg.targetSubject || session.targetSubject || null,
            createdAt: session.createdAt,
            verdict: session.verdict && session.verdict !== 'IN_PROGRESS' ? session.verdict : null,
            generalAverage: cfg.generalAverage ?? null,
            subjectScores: cfg.subjectScores || null,
            totalQuestions: rows.length,
            timeTakenSecs: session.timeTakenSecs ?? null,
            hasMarks: marked.size > 0,
        },
        items: rows.map((row, i) => reviewItem(row, byId.get(row.questionId), i + 1, marked)),
    };
}

module.exports = { buildSittingReview, isSittingClosed, orderReviewRows, reviewItem, SittingReviewError };
