// src/services/reminderService.js
//
// Scheduled reminders: one push a day, at the Manila hour the learner chose
// (Account › Notifications, phone app), with the most useful line for that
// day:
//   1. a streak about to break ("Your 6-day streak ends tonight");
//   2. reviews due ("12 reviews due: 8 questions and 4 formula cards");
//   3. today's plan task;
//   4. a plain nudge if they haven't studied today.
// Nothing is sent to someone who has studied today with nothing due.
//
// Run hourly by POST /api/cron/reminders (routes/cronRoutes.js, called by
// .github/workflows/reminders.yml). A run late by up to two hours still
// catches that hour's reminders, and each user's day is claimed before the
// send, so overlapping runs send once. Sending stays behind the
// `push-notifications` flag (services/pushService fails closed).

'use strict';

const prisma = require('../config/db');
const pushService = require('./pushService');
const { effectiveStreak, dayBefore, manilaDateOf } = require('@ree/shared');
const logger = require('../utils/logger');
const { LEARNER_CARD_WHERE } = require('./referenceCardView');

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
// A run this many hours late still sends that hour's reminders (never across midnight).
const CATCH_UP_HOURS = 2;
const BATCH_MAX = 500;

/** The Manila hour (0–23) of an instant. */
function manilaHour(now = new Date()) {
    return new Date(new Date(now).getTime() + MANILA_OFFSET_MS).getUTCHours();
}

/** The chosen hours a run at `hour` serves: this one and the two before, same day. */
function hoursServed(hour) {
    const out = [];
    for (let h = hour; h >= 0 && h >= hour - CATCH_UP_HOURS; h -= 1) out.push(h);
    return out;
}

/**
 * The streak as it stands today, from the stored count and the study days
 * from yesterday on (the stored count alone can promise a run that broke).
 */
function streakStatus({ globalStreak, activityDates = [] }, today) {
    const lastStudyDay = activityDates.reduce((max, d) => (!max || d > max ? d : max), null);
    return { streak: effectiveStreak(globalStreak, lastStudyDay, today), studiedToday: activityDates.includes(today) };
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function reviewsLine(dueQuestions, dueCards) {
    if (dueQuestions && dueCards) return `${plural(dueQuestions, 'question', 'questions')} and ${plural(dueCards, 'formula card', 'formula cards')}`;
    if (dueQuestions) return plural(dueQuestions, 'question', 'questions');
    return plural(dueCards, 'formula card', 'formula cards');
}

/**
 * The day's reminder, or null when there's nothing worth sending.
 * @returns {{ title: string, body: string, data: { route: string } } | null}
 */
function pickReminder({ streak = 0, studiedToday = false, dueQuestions = 0, dueCards = 0, planTask = null }) {
    const due = dueQuestions + dueCards;
    const route = dueQuestions > 0 || due === 0 ? '/' : '/library?tab=formulas';
    if (!studiedToday && streak >= 1) {
        return {
            title: `Your ${streak}-day streak ends tonight`,
            body: due > 0 ? `${reviewsLine(dueQuestions, dueCards)} due for review. One session keeps it going.` : 'One session keeps it going. A few questions before midnight?',
            data: { route },
        };
    }
    if (due > 0) {
        return {
            title: `${plural(due, 'review', 'reviews')} due`,
            body: `${reviewsLine(dueQuestions, dueCards)}, back just before you'd forget them.`,
            data: { route },
        };
    }
    if (planTask?.text) {
        return { title: "Today's plan", body: planTask.text, data: { route: '/' } };
    }
    if (!studiedToday) {
        return { title: "Time for today's practice", body: 'A quick set keeps you on pace for the board.', data: { route: '/' } };
    }
    return null;
}

const notSentToday = (today) => ({ OR: [{ reminderLastSentOn: null }, { reminderLastSentOn: { not: today } }] });

/** Send this hour's reminders. Returns what it did, for the cron log. */
async function sendDueReminders({ now = new Date() } = {}) {
    const today = manilaDateOf(now);
    const hour = manilaHour(now);
    const users = await prisma.user.findMany({
        where: { reminderHour: { in: hoursServed(hour) }, deviceTokens: { some: {} }, ...notSentToday(today) },
        select: {
            id: true,
            globalStreak: true,
            activityLogs: { where: { date: { gte: dayBefore(today) } }, select: { date: true } },
        },
        take: BATCH_MAX,
    });

    let sent = 0;
    let quiet = 0;
    for (const u of users) {
        // Claim today's reminder first: two overlapping runs send it once.
        const { count } = await prisma.user.updateMany({ where: { id: u.id, ...notSentToday(today) }, data: { reminderLastSentOn: today } });
        if (count !== 1) continue;
        try {
            const [dueQuestions, dueCards, planTask] = await Promise.all([
                prisma.sRSCard.count({ where: { userId: u.id, nextReviewDate: { lte: now }, question: { isFlagged: false } } }),
                prisma.cardReview.count({ where: { userId: u.id, nextReviewDate: { lte: now }, card: LEARNER_CARD_WHERE } }),
                prisma.plannerTask.findFirst({ where: { userId: u.id, dueDate: today, completed: false }, select: { text: true }, orderBy: { createdAt: 'asc' } }),
            ]);
            const { streak, studiedToday } = streakStatus({ globalStreak: u.globalStreak, activityDates: (u.activityLogs || []).map((a) => a.date) }, today);
            const message = pickReminder({ streak, studiedToday, dueQuestions, dueCards, planTask });
            if (!message) { quiet += 1; continue; }
            const result = await pushService.sendToUser(u.id, message);
            if (result?.delivered > 0) sent += 1;
        } catch (err) {
            logger.warn('reminder failed', { userId: u.id, error: err.message });
        }
    }
    logger.info('reminders run', { today, hour, candidates: users.length, sent, quiet });
    return { today, hour, candidates: users.length, sent, quiet };
}

module.exports = { sendDueReminders, pickReminder, streakStatus, manilaHour, hoursServed };
