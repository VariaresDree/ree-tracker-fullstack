// src/services/mistakeList.js
//
// The reads behind the mistake notebook (GET /api/user/mistakes) and the
// Today loop's open mistakes: the learner's newest wrong attempts, the
// questions, their tags and later correct answers, built by mistakeView.
// Answers from a battle still open, and questions in a battle the learner is
// still in, are left out (services/answerGate.js).

'use strict';

const prisma = require('../config/db');
const { buildMistakes, mistakeQuestionIds, MISTAKE_LIST_MAX } = require('./mistakeView');
const { battleTiming } = require('../utils/battleLogic');
const { lockedQuestionIds } = require('./answerGate');

// How many recent wrong attempts are read to find the newest mistakes.
const WRONG_SCAN_MAX = 5000;
const QUESTION_SELECT = {
    id: true, subject: true, subtopic: true, text: true, options: true, answer: true, fixedExplanation: true, type: true,
};

/**
 * Attempts from a battle that is still open are left out: a player who has
 * submitted would otherwise read the key (and whether they were right) while
 * the others are still answering. The sitting review keeps the same rule.
 */
async function withoutOpenBattles(attempts, now = Date.now()) {
    const ids = new Set();
    for (const a of attempts) if (a.mode === 'BATTLE' && a.sessionId) ids.add(String(a.sessionId).split(':')[0]);
    if (ids.size === 0) return attempts;
    const battles = await prisma.battle.findMany({
        where: { id: { in: [...ids] }, status: { not: 'COMPLETED' } },
        select: { id: true, startedAt: true, timeLimitSecs: true, createdAt: true },
    });
    const open = new Set(battles.filter((b) => !battleTiming(b, now)?.closed).map((b) => b.id));
    if (open.size === 0) return attempts;
    return attempts.filter((a) => !(a.mode === 'BATTLE' && a.sessionId && open.has(String(a.sessionId).split(':')[0])));
}

/** @returns {Promise<{ items: object[], truncated: boolean }>} newest first */
async function loadMistakes(userId) {
    const recentWrong = await prisma.questionAttempt.findMany({
        where: {
            userId,
            isCorrect: false,
            // Not blanks ('' = left blank); NULL is a real answer recorded
            // before the option picked was stored.
            OR: [{ selectedAnswer: null }, { selectedAnswer: { not: '' } }],
        },
        select: {
            questionId: true, subject: true, subtopic: true, selectedAnswer: true,
            confidenceLevel: true, timeSpentMs: true, answeredAt: true, createdAt: true,
            mode: true, sessionId: true,
        },
        orderBy: { createdAt: 'desc' },
        take: WRONG_SCAN_MAX,
    });
    // Also drop any question in a battle the learner is still in, whatever
    // mode the miss came from: its key would show beside it.
    const openWrong = await withoutOpenBattles(recentWrong);
    const locked = await lockedQuestionIds(userId, openWrong.map((a) => a.questionId));
    const wrong = locked.size ? openWrong.filter((a) => !locked.has(a.questionId)) : openWrong;
    const { ids, truncated } = mistakeQuestionIds(wrong, MISTAKE_LIST_MAX);
    if (ids.length === 0) return { items: [], truncated: false };

    const [allCorrect, questions, tags] = await Promise.all([
        prisma.questionAttempt.findMany({
            where: { userId, isCorrect: true, questionId: { in: ids } },
            select: { questionId: true, answeredAt: true, createdAt: true, mode: true, sessionId: true },
        }),
        prisma.question.findMany({ where: { id: { in: ids } }, select: QUESTION_SELECT }),
        prisma.mistakeTag.findMany({
            where: { userId, questionId: { in: ids } },
            select: { questionId: true, cause: true, resolvedAt: true },
        }),
    ]);
    const correct = await withoutOpenBattles(allCorrect);
    return { items: buildMistakes({ wrong, correct, questions, tags, ids }), truncated };
}

module.exports = { loadMistakes, withoutOpenBattles };
