// src/services/focusTime.js
//
// Progress › Habits › Focus time: the Pomodoro's focus blocks, per Manila day
// for the last two weeks, per subject over the last 30 days beside the PRC
// weights, and this Manila week (from Monday) against the weekly goal. The pure summary is tested on its own (tests/focusRoutes.test.js).
// DISPLAY ONLY: FocusBlock is self-reported and never feeds θ, the forecast,
// readiness or the rankings (tests/displayOnlyTables.test.js).

'use strict';

const prisma = require('../config/db');
const { FOCUS_SUBJECTS, FOCUS_MAX_MINUTES, manilaDateOf } = require('@ree/shared');
const { getSyllabusWeights } = require('./questionPool');

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_SHOWN = 14;
const SHARE_WINDOW_DAYS = 30;
const BOARD_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

const zeroBySubject = () => Object.fromEntries(FOCUS_SUBJECTS.map((s) => [s, 0]));

/** The Manila date (YYYY-MM-DD) of the Monday that starts `now`'s Manila week. */
function manilaWeekStart(now) {
    const today = manilaDateOf(new Date(now));
    const [y, m, d] = today.split('-').map(Number);
    const sinceMonday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
    return new Date(Date.UTC(y, m - 1, d - sinceMonday)).toISOString().slice(0, 10);
}

/**
 * @param {Array<{subject, minutes, endedAt}>} blocks the last 30 days' blocks
 * @param {{ now?: number, weights?: object }} [opts]
 */
function summarizeFocus(blocks, { now = Date.now(), weights = null } = {}) {
    const days = [];
    for (let i = DAYS_SHOWN - 1; i >= 0; i -= 1) {
        days.push({ date: manilaDateOf(new Date(now - i * DAY_MS)), minutes: 0, bySubject: zeroBySubject() });
    }
    const dayByDate = new Map(days.map((d) => [d.date, d]));
    const last30 = { minutes: 0, blocks: 0, bySubject: zeroBySubject() };
    const since = now - SHARE_WINDOW_DAYS * DAY_MS;
    const week = { startsOn: manilaWeekStart(now), minutes: 0, bySubject: zeroBySubject() };

    for (const b of blocks || []) {
        const ended = new Date(b.endedAt).getTime();
        const subject = FOCUS_SUBJECTS.includes(b.subject) ? b.subject : 'General';
        const minutes = Number(b.minutes) || 0;
        const endedOn = manilaDateOf(new Date(ended));
        const day = dayByDate.get(endedOn);
        if (day) {
            day.minutes += minutes;
            day.bySubject[subject] += minutes;
        }
        if (endedOn >= week.startsOn) {
            week.minutes += minutes;
            week.bySubject[subject] += minutes;
        }
        if (ended >= since) {
            last30.minutes += minutes;
            last30.blocks += 1;
            last30.bySubject[subject] += minutes;
        }
    }

    // Each board subject's share of the focus time spent on board subjects
    // ('General' is left out), beside its weight on the board.
    const boardMinutes = BOARD_SUBJECTS.reduce((a, s) => a + last30.bySubject[s], 0);
    const shares = BOARD_SUBJECTS.map((subject) => ({
        subject,
        minutes: last30.bySubject[subject],
        share: boardMinutes > 0 ? last30.bySubject[subject] / boardMinutes : 0,
        weight: weights?.[subject] ?? null,
    }));

    return { days, last30, shares, boardMinutes, week };
}

// How many of the newest blocks Habits lists to fix or delete.
const RECENT_SHOWN = 10;

async function loadFocusTime(userId, now = Date.now()) {
    const [blocks, weights, user] = await Promise.all([
        prisma.focusBlock.findMany({
            where: { userId, endedAt: { gte: new Date(now - SHARE_WINDOW_DAYS * DAY_MS) } },
            select: { id: true, subject: true, minutes: true, startedAt: true, endedAt: true },
            orderBy: { endedAt: 'asc' },
        }),
        getSyllabusWeights(),
        prisma.user.findUnique({ where: { id: userId }, select: { weeklyFocusMinutes: true } }),
    ]);
    const recent = blocks.slice(-RECENT_SHOWN).reverse().map((b) => ({
        id: b.id, subject: b.subject, minutes: b.minutes, startedAt: b.startedAt, endedAt: b.endedAt,
        // The most minutes this block can be set to: the time it spanned.
        maxMinutes: spanMinutes(b),
    }));
    return { ...summarizeFocus(blocks, { now, weights }), recent, goal: { weeklyMinutes: user?.weeklyFocusMinutes ?? null } };
}

// Capped at FOCUS_MAX_MINUTES (the longest PRC section: a timed paper exam).
function spanMinutes(b) {
    const span = Math.ceil((new Date(b.endedAt).getTime() - new Date(b.startedAt).getTime()) / 60000) + 1;
    return Math.max(1, Math.min(FOCUS_MAX_MINUTES, Number.isFinite(span) ? span : 1));
}

class FocusBlockError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

/**
 * Fix a logged block: what it was for, or how many minutes of it were focus.
 * Minutes can't exceed the time the block spanned (the rule a new block
 * follows). Only the learner's own block is found.
 */
async function updateFocusBlock({ userId, id }, { subject, minutes }) {
    const found = await prisma.focusBlock.findFirst({
        where: { id, userId },
        select: { id: true, startedAt: true, endedAt: true },
    });
    if (!found) throw new FocusBlockError(404, 'Focus block not found.');
    if (minutes != null && minutes > spanMinutes(found)) {
        throw new FocusBlockError(400, 'More minutes than the block lasted.');
    }
    const data = {};
    if (subject != null) data.subject = subject;
    if (minutes != null) data.minutes = minutes;
    await prisma.focusBlock.updateMany({ where: { id, userId }, data });
    return { id, ...data };
}

/** Delete one of the learner's blocks. A second delete is a no-op. */
async function deleteFocusBlock({ userId, id }) {
    const { count } = await prisma.focusBlock.deleteMany({ where: { id, userId } });
    return { deleted: count > 0 };
}

/** Record one block; a replay of the same clientId lands once. */
async function recordFocusBlock(userId, block) {
    const data = {
        userId,
        clientId: block.clientId,
        subject: block.subject,
        minutes: block.minutes,
        startedAt: new Date(block.startedAt),
        endedAt: new Date(block.endedAt),
        completed: block.completed,
    };
    try {
        await prisma.focusBlock.create({ data });
        return { created: true };
    } catch (error) {
        if (error.code === 'P2002') return { created: false };
        throw error;
    }
}

module.exports = { summarizeFocus, manilaWeekStart, loadFocusTime, recordFocusBlock, updateFocusBlock, deleteFocusBlock, FocusBlockError };
