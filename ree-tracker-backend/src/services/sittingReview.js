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
// section is finalised, a battle until it completes or its time (plus the
// grace) is up — after that no answer is accepted, so nothing can be fished.
// A battle used to open only on COMPLETED, and one that never completed (a
// player left, the server restarted) kept everyone's review shut for good.
//
// Choices are listed in the order the learner saw them. A sitting marked
// `optionOrder: 'seeded-v1'` (written by the client that showed it, or by the
// battle at its creation) showed each question's choices in the seeded order
// keyed on its session id (@ree/shared optionOrder), so the same key rebuilds
// it here; letters, the answer sheet and every player's picks follow. Older
// sittings carry no mark and list the stored order, which the page says.

'use strict';

const prisma = require('../config/db');
const { normalizeSubject, optionKey, optionOrder, shuffleWithKey, OPTION_ORDER_VERSION } = require('@ree/shared');
const { battleTiming } = require('../utils/battleLogic');
const battleLifecycle = require('./battleLifecycle');

// How long a review waits for a due battle to finish before answering from
// the clock.
const BATTLE_SETTLE_WAIT_MS = 6000;

class SittingReviewError extends Error {
    constructor(status, message, code, extra = null) {
        super(message);
        this.status = status;
        this.code = code;
        // Sent with the error (e.g. { opensAt } for a battle still running).
        this.extra = extra;
    }
}

const SECTION_ORDER = ['Mathematics', 'ESAS', 'EE'];
// A full board's sections are kept for 7 days; a sitting left open longer is
// abandoned and may be reviewed (FULL_BOARD_TTL_MS on the client).
const ABANDONED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEWABLE_MODES = new Set(['BOARD_SIM', 'BATTLE', 'DIAGNOSTIC', 'GAUNTLET']);

const configOf = (session) => (session?.config && typeof session.config === 'object' ? session.config : {});

/** Pure: may this sitting's answers be shown? */
function isSittingClosed(session, { battleStatus = null, battleClosesAt = null, now = Date.now() } = {}) {
    const cfg = configOf(session);
    switch (session.mode) {
        case 'BOARD_SIM':
            return !!cfg.finalizedAt || !!cfg.hiddenFromHistory
                || new Date(session.createdAt).getTime() < now - ABANDONED_AFTER_MS;
        case 'BATTLE':
            return battleStatus === 'COMPLETED' || (battleClosesAt != null && now >= battleClosesAt);
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

/**
 * Pure: the stored choices in the order a sitting keyed `key` showed them.
 * The order is drawn over `shownFrom` when given (a battle's snapshot of the
 * question, what its players were shown) and the same length, so an edit to
 * the live question since (a choice reworded into "All of the above") can't
 * change the order the review lists.
 */
function orderShown(stored, key, shownFrom = null) {
    const basis = Array.isArray(shownFrom) && shownFrom.length === stored.length ? shownFrom : stored;
    return optionOrder(basis, key).map((i) => stored[i]);
}

/**
 * Pure: one row (an attempt, or a placement response) → a review item. With
 * `orderKey` (the session id of a sitting shown in the seeded order), the
 * choices come in the order that sitting showed them.
 */
function reviewItem(row, question, order, marked, orderKey = null, shownFrom = null) {
    const selected = row.selectedAnswer === undefined ? null : row.selectedAnswer;
    const stored = Array.isArray(question?.options) ? question.options : [];
    return {
        order,
        questionId: row.questionId,
        subject: normalizeSubject(question?.subject || row.subject || ''),
        topic: question?.subtopic || row.subtopic || null,
        text: question?.text || null,
        options: orderKey ? orderShown(stored, optionKey(orderKey, row.questionId), shownFrom) : stored,
        // The stored order too, when reordered: a retake or Practice set made
        // from this review draws its own order from it.
        ...(orderKey ? { storedOptions: stored } : {}),
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
    let battleClosesAt = null;
    if (session.mode === 'BATTLE') {
        const battleId = String(session.id).split(':')[0];
        const select = { id: true, status: true, config: true, questions: true, startedAt: true, timeLimitSecs: true, createdAt: true };
        battle = await prisma.battle.findUnique({ where: { id: battleId }, select });
        // Its time is up but nothing finished it: finish it now, so the review
        // has every player's result behind it.
        if (battle?.status === 'IN_PROGRESS' && battleTiming(battle, now)?.closed) {
            await battleLifecycle.settleWithin(battleId, BATTLE_SETTLE_WAIT_MS);
            battle = (await prisma.battle.findUnique({ where: { id: battleId }, select })) || battle;
        }
        if (battle?.status === 'IN_PROGRESS') battleClosesAt = battleTiming(battle, now)?.closesAt ?? null;
    }
    if (!isSittingClosed(session, { battleStatus: battle?.status, battleClosesAt, now })) {
        throw new SittingReviewError(409, 'This sitting is still in progress.', 'IN_PROGRESS',
            battleClosesAt != null ? { opensAt: new Date(battleClosesAt).toISOString() } : null);
    }

    const cfg = configOf(session);
    const marked = new Set(Array.isArray(cfg.markedQuestionIds) ? cfg.markedQuestionIds : []);
    // A battle is marked on the battle (every player's sitting); the rest on the session.
    const shownSeeded = (cfg.optionOrder ?? configOf(battle).optionOrder) === OPTION_ORDER_VERSION;
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
        // A battle shown in the seeded order gave each player their own order
        // of questions too, keyed the same way.
        const battleQuestions = Array.isArray(battle?.questions)
            ? (shownSeeded ? shuffleWithKey(battle.questions, session.id) : battle.questions)
            : null;
        rows = orderReviewRows(attempts, {
            fullBoard: cfg.kind === 'full-board',
            questionOrder: battleQuestions ? battleQuestions.map((q) => q?.id).filter(Boolean) : null,
        });
    }
    // Closed but nothing landed yet: the answers are still in the outbox.
    if (rows.length === 0) throw new SittingReviewError(409, 'This sitting’s answers haven’t synced yet.', 'SYNCING');

    const questions = await prisma.question.findMany({
        where: { id: { in: Array.from(new Set(rows.map((r) => r.questionId))) } },
        select: QUESTION_SELECT,
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    // A battle's players were shown its snapshot of each question.
    const snapshotOptions = new Map((Array.isArray(battle?.questions) ? battle.questions : [])
        .filter((q) => q?.id && Array.isArray(q.options))
        .map((q) => [q.id, q.options]));

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
            // Set: the choices below are in the order the learner saw them.
            optionOrder: shownSeeded ? OPTION_ORDER_VERSION : null,
        },
        items: rows.map((row, i) => reviewItem(row, byId.get(row.questionId), i + 1, marked,
            shownSeeded ? session.id : null, snapshotOptions.get(row.questionId) || null)),
    };
}

module.exports = { buildSittingReview, isSittingClosed, orderReviewRows, orderShown, reviewItem, SittingReviewError };
