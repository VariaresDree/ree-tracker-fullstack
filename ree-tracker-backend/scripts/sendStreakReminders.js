#!/usr/bin/env node
/*
 * Daily streak-reminder push (Phase 4.2) — the first real FCM use per the
 * roadmap ("spaced-repetition reminders"). Nudges users who have a registered
 * device, an active streak, and NO answered question yet today (Manila).
 *
 * Usage:
 *   node scripts/sendStreakReminders.js            # send
 *   node scripts/sendStreakReminders.js --dry-run  # list recipients, no sends
 *
 * Cron-ready (same external-cron pattern as calibrate.js) — e.g. daily at
 * 19:00 Asia/Manila. Sending is additionally gated server-side by the
 * `push-notifications` feature flag (pushService fails closed), so a scheduled
 * run with the flag off is a safe no-op.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { effectiveStreak, dayBefore, todayManila } = require('@ree/shared');

// Standalone firebase-admin init — mirrors server.js (service-account file or
// env triple). Must run before pushService's getMessaging() is used.
function initFirebase() {
    const jsonPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(jsonPath)) {
        initializeApp({ credential: cert(require(jsonPath)) });
        return true;
    }
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
        initializeApp({
            credential: cert({
                projectId: FIREBASE_PROJECT_ID,
                clientEmail: FIREBASE_CLIENT_EMAIL,
                privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        return true;
    }
    return false;
}

function parseArgs(argv) {
    const out = { dryRun: false };
    for (const a of argv.slice(2)) if (a === '--dry-run') out.dryRun = true;
    return out;
}

/**
 * Pure: pick reminder recipients from user rows. A recipient has at least one
 * device token, a streak still alive (a study day yesterday), and no activity
 * yet today. The stored globalStreak alone is not enough: it is only rewritten
 * when answers are recorded, so it kept promising a run that broke days ago.
 * Exported for tests.
 *
 * @param {Array<{id, displayName?, globalStreak, deviceTokens: Array, activityLogs: Array}>} users
 *        activityLogs pre-filtered by the query to Manila days from yesterday on.
 * @param {string} [today] Manila YYYY-MM-DD
 */
function selectReminderRecipients(users, today = todayManila()) {
    return (users || [])
        .map((u) => {
            const days = (u.activityLogs || []).map((a) => a.date);
            const lastStudyDay = days.reduce((max, d) => (!max || d > max ? d : max), null);
            return { u, streak: effectiveStreak(u.globalStreak, lastStudyDay, today), studiedToday: days.includes(today) };
        })
        .filter(({ u, streak, studiedToday }) =>
            (u.deviceTokens?.length ?? 0) > 0 && streak >= 1 && !studiedToday)
        .map(({ u, streak }) => ({ id: u.id, displayName: u.displayName, streak }));
}

async function main() {
    const { dryRun } = parseArgs(process.argv);
    const prisma = require('../src/config/db');
    const { sendToUser } = require('../src/services/pushService');

    const today = todayManila();
    console.log(`[streakReminders] start  dryRun=${dryRun}  today=${today}`);

    if (!dryRun && !initFirebase()) {
        console.error('[streakReminders] no firebase credentials — cannot send.');
        process.exit(1);
    }

    // Only users with a registered device can receive anything; join their
    // ActivityLog rows from yesterday on (Manila-keyed, same as the streak
    // engine): yesterday's says the streak is still alive, today's means they
    // already studied.
    const users = await prisma.user.findMany({
        where: { deviceTokens: { some: {} } },
        select: {
            id: true,
            displayName: true,
            globalStreak: true,
            deviceTokens: { select: { token: true } },
            activityLogs: { where: { date: { gte: dayBefore(today) } }, select: { date: true } },
        },
    });

    const recipients = selectReminderRecipients(users, today);
    console.log(`[streakReminders] candidates=${users.length}  recipients=${recipients.length}`);

    let sent = 0;
    for (const r of recipients) {
        if (dryRun) {
            console.log(`[streakReminders]   would notify ${r.id} (${r.displayName || 'Agent'})  streak=${r.streak}`);
            continue;
        }
        const result = await sendToUser(r.id, {
            title: `Your ${r.streak}-day streak is on the line 🔥`,
            body: 'One session keeps it alive. A few questions before midnight?',
            data: { route: '/' },
        });
        if (result?.delivered > 0) sent += 1;
    }

    console.log(`[streakReminders] done  sent=${sent}  dryRun=${dryRun}`);
    await prisma.closeDb();
}

// Exported for unit tests; only auto-run when invoked directly.
module.exports = { selectReminderRecipients };

if (require.main === module) {
    main().catch((err) => {
        console.error('[streakReminders] failed', err);
        process.exit(1);
    });
}
