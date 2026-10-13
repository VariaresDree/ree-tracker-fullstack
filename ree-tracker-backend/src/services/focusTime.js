// src/services/focusTime.js
//
// Progress › Habits › Focus time: the Pomodoro's focus blocks, per Manila day
// for the last two weeks, and per subject over the last 30 days beside the PRC
// weights. The pure summary is tested on its own (tests/focusRoutes.test.js).
// DISPLAY ONLY: FocusBlock is self-reported and never feeds θ, the forecast,
// readiness or the rankings (tests/displayOnlyTables.test.js).

'use strict';

const prisma = require('../config/db');
const { FOCUS_SUBJECTS, manilaDateOf } = require('@ree/shared');
const { getSyllabusWeights } = require('./questionPool');

const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_SHOWN = 14;
const SHARE_WINDOW_DAYS = 30;
const BOARD_SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

const zeroBySubject = () => Object.fromEntries(FOCUS_SUBJECTS.map((s) => [s, 0]));

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

    for (const b of blocks || []) {
        const ended = new Date(b.endedAt).getTime();
        const subject = FOCUS_SUBJECTS.includes(b.subject) ? b.subject : 'General';
        const minutes = Number(b.minutes) || 0;
        const day = dayByDate.get(manilaDateOf(new Date(ended)));
        if (day) {
            day.minutes += minutes;
            day.bySubject[subject] += minutes;
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

    return { days, last30, shares, boardMinutes };
}

async function loadFocusTime(userId, now = Date.now()) {
    const [blocks, weights] = await Promise.all([
        prisma.focusBlock.findMany({
            where: { userId, endedAt: { gte: new Date(now - SHARE_WINDOW_DAYS * DAY_MS) } },
            select: { subject: true, minutes: true, endedAt: true },
            orderBy: { endedAt: 'asc' },
        }),
        getSyllabusWeights(),
    ]);
    return summarizeFocus(blocks, { now, weights });
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

module.exports = { summarizeFocus, loadFocusTime, recordFocusBlock };
