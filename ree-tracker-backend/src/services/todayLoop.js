// src/services/todayLoop.js
//
// Today's loop (GET /api/user/today-loop): one mixed Practice session of the
// questions due for spaced review and the open mistakes, ordered by board
// weight, plus how many formula cards are due. With `?cards=1` (the app since
// 2026-10; an older installed app never sends it, so its loop is unchanged)
// up to CARD_MAX of those cards come in the session too, spread evenly
// between the questions, each rated in place instead of answered.
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
const { CARD_SELECT } = require('./referenceCardView');

const LOOP_MAX = 25;
const CARD_MAX = 8;
const DUE_SCAN_MAX = 100;
const BOARD_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

/** A mistake row back into the question shape Practice uses. */
const mistakeToQuestion = (m) => ({
    id: m.questionId, subject: m.subject, subtopic: m.topic, text: m.text, options: m.options,
    answer: m.correctAnswer, fixedExplanation: m.explanation, type: m.type,
});

/** A due formula card as a loop item: rated in Practice, never graded. */
const cardToItem = (card) => ({ id: `card:${card.id}`, kind: 'card', subject: card.subject, card });

/**
 * Cards spread evenly through the questions: card i goes after about
 * (i + 1) / (cards + 1) of them, so the loop never ends on a run of cards.
 */
function interleave(questions, cards) {
    if (cards.length === 0) return questions;
    const out = [];
    let next = 0;
    questions.forEach((q, i) => {
        out.push(q);
        while (next < cards.length && i + 1 >= Math.round(((next + 1) * questions.length) / (cards.length + 1))) out.push(cards[next++]);
    });
    while (next < cards.length) out.push(cards[next++]);
    return out;
}

/**
 * Pure. `due` are questions (oldest due first); `mistakes` are open mistakes
 * as questions (newest first); `cards` are due formula cards (soonest first).
 * @returns {{ items: object[], counts: { due: number, mistakes: number, cards: number }, more: number }}
 */
function buildTodayLoop({ due = [], mistakes = [], cards = [], weights = DEFAULT_SYLLABUS_WEIGHTS, max = LOOP_MAX } = {}) {
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
    const counts = { due: 0, mistakes: 0, cards: 0 };
    for (const q of items) counts[q.loop.reason === 'due' ? 'due' : 'mistakes'] += 1;
    const cardItems = cards.slice(0, CARD_MAX).map((c) => ({ ...cardToItem(c), loop: { reason: 'card' } }));
    counts.cards = cardItems.length;
    return { items: interleave(items, cardItems), counts, more: total - items.length };
}

async function loadTodayLoop(userId, now = new Date(), { withCards = false } = {}) {
    const [dueCards, mistakes, weights, cardsDue, cardRows] = await Promise.all([
        prisma.sRSCard.findMany({
            where: { userId, nextReviewDate: { lte: now }, question: { isFlagged: false } },
            include: { question: true },
            orderBy: { nextReviewDate: 'asc' },
            take: DUE_SCAN_MAX,
        }),
        loadMistakes(userId),
        getSyllabusWeights(),
        prisma.cardReview.count({ where: { userId, nextReviewDate: { lte: now }, card: { status: 'LIVE' } } }),
        withCards
            ? prisma.cardReview.findMany({
                where: { userId, nextReviewDate: { lte: now }, card: { status: 'LIVE' } },
                orderBy: { nextReviewDate: 'asc' },
                take: CARD_MAX,
                select: { card: { select: CARD_SELECT } },
            })
            : Promise.resolve([]),
    ]);
    const due = dueCards.map((c) => c.question).filter(Boolean);
    const open = mistakes.items.filter((m) => !m.fixed).map(mistakeToQuestion);
    // Never hand a live battle's key to its own player.
    const locked = await lockedQuestionIds(userId, [...due, ...open].map((q) => q.id));
    const loop = buildTodayLoop({
        due: due.filter((q) => !locked.has(q.id)),
        mistakes: open.filter((q) => !locked.has(q.id)),
        cards: cardRows.map((r) => r.card).filter(Boolean),
        weights,
    });
    return { ...loop, cardsDue };
}

module.exports = { buildTodayLoop, loadTodayLoop, interleave, LOOP_MAX, CARD_MAX };
