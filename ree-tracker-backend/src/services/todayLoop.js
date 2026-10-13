// src/services/todayLoop.js
//
// Today's loop (GET /api/user/today-loop): one mixed Practice session of the
// questions due for spaced review and the open mistakes, ordered by board
// weight, plus how many formula cards are due (they are reviewed in Library ›
// Formula cards, which the session's summary links to next).
//
// Order: a smooth weighted round-robin over the board subjects by their
// syllabus weight (EE 45, ESAS 30, Math 25 by default), so the heaviest
// subject leads and the set mixes in proportion. Within a subject, due
// reviews come first (oldest due first), then open mistakes (newest first).
// A question that is both is listed once, as due.

'use strict';

const prisma = require('../config/db');
const { normalizeSubject } = require('@ree/shared');
const { getSyllabusWeights, DEFAULT_SYLLABUS_WEIGHTS } = require('./questionPool');
const { loadMistakes } = require('./mistakeList');
const { lockedQuestionIds } = require('./answerGate');

const LOOP_MAX = 25;
const DUE_SCAN_MAX = 100;
const BOARD_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

/** A mistake row back into the question shape Practice uses. */
const mistakeToQuestion = (m) => ({
    id: m.questionId, subject: m.subject, subtopic: m.topic, text: m.text, options: m.options,
    answer: m.correctAnswer, fixedExplanation: m.explanation, type: m.type,
});

/**
 * Pure. `due` are questions (oldest due first); `mistakes` are open mistakes
 * as questions (newest first).
 * @returns {{ items: object[], counts: { due: number, mistakes: number }, more: number }}
 */
function buildTodayLoop({ due = [], mistakes = [], weights = DEFAULT_SYLLABUS_WEIGHTS, max = LOOP_MAX } = {}) {
    const seen = new Set();
    const queues = new Map();
    const push = (q, reason) => {
        if (!q?.id || seen.has(q.id)) return;
        seen.add(q.id);
        const subject = BOARD_SUBJECTS.includes(normalizeSubject(q.subject)) ? normalizeSubject(q.subject) : 'Other';
        if (!queues.has(subject)) queues.set(subject, []);
        queues.get(subject).push({ ...q, loop: { reason } });
    };
    for (const q of due) push(q, 'due');
    for (const q of mistakes) push(q, 'mistake');

    const weightOf = (s) => {
        const w = Number(weights?.[s]);
        return s === 'Other' ? 0.05 : (Number.isFinite(w) && w > 0 ? w : 0.05);
    };
    // Smooth weighted round-robin: each turn every subject with items gains
    // its weight, the highest takes the turn and pays back the total.
    const credit = new Map([...queues.keys()].map((s) => [s, 0]));
    const items = [];
    const total = [...queues.values()].reduce((a, q) => a + q.length, 0);
    while (items.length < Math.min(max, total)) {
        const live = [...queues.entries()].filter(([, q]) => q.length > 0).map(([s]) => s);
        const sum = live.reduce((a, s) => a + weightOf(s), 0);
        let best = null;
        for (const s of live) {
            credit.set(s, credit.get(s) + weightOf(s));
            if (best === null || credit.get(s) > credit.get(best)) best = s;
        }
        credit.set(best, credit.get(best) - sum);
        items.push(queues.get(best).shift());
    }
    const counts = { due: 0, mistakes: 0 };
    for (const q of items) counts[q.loop.reason === 'due' ? 'due' : 'mistakes'] += 1;
    return { items, counts, more: total - items.length };
}

async function loadTodayLoop(userId, now = new Date()) {
    const [dueCards, mistakes, weights, cardsDue] = await Promise.all([
        prisma.sRSCard.findMany({
            where: { userId, nextReviewDate: { lte: now }, question: { isFlagged: false } },
            include: { question: true },
            orderBy: { nextReviewDate: 'asc' },
            take: DUE_SCAN_MAX,
        }),
        loadMistakes(userId),
        getSyllabusWeights(),
        prisma.cardReview.count({ where: { userId, nextReviewDate: { lte: now }, card: { status: 'LIVE' } } }),
    ]);
    const due = dueCards.map((c) => c.question).filter(Boolean);
    const open = mistakes.items.filter((m) => !m.fixed).map(mistakeToQuestion);
    // Never hand a live battle's key to its own player.
    const locked = await lockedQuestionIds(userId, [...due, ...open].map((q) => q.id));
    const loop = buildTodayLoop({
        due: due.filter((q) => !locked.has(q.id)),
        mistakes: open.filter((q) => !locked.has(q.id)),
        weights,
    });
    return { ...loop, cardsDue };
}

module.exports = { buildTodayLoop, loadTodayLoop, LOOP_MAX };
