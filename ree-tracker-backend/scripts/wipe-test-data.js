#!/usr/bin/env node
/*
 * Destructive test-data wipe.
 *
 * Usage: node scripts/wipe-test-data.js --confirm=WIPE
 *
 * Deletes all user-generated rows: QuestionAttempt, ExamSession, StudySession,
 * Battle, SRSCard, ActivityLog, UserTopicPerformance, ReadinessSnapshot,
 * ThetaHistory, PlannerTask, Bookmark, User.
 * Keeps: Question, Folder, Material, SystemConfig.
 *
 * Then deletes all Firebase Auth users via Admin SDK in batches of 1000.
 *
 * Refuses to run without --confirm=WIPE.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const args = process.argv.slice(2).reduce((acc, a) => {
    const [k, v] = a.split('=');
    acc[k.replace(/^--/, '')] = v === undefined ? true : v;
    return acc;
}, {});

if (args.confirm !== 'WIPE') {
    console.error('\nRefusing to run without --confirm=WIPE.\n');
    console.error('Example: node scripts/wipe-test-data.js --confirm=WIPE\n');
    process.exit(2);
}

async function countdown(secs) {
    for (let i = secs; i > 0; i--) {
        process.stdout.write(`\rStarting destructive wipe in ${i}s... (Ctrl-C to abort) `);
        await new Promise((r) => setTimeout(r, 1000));
    }
    process.stdout.write('\n');
}

function initFirebase() {
    const jsonPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (fs.existsSync(jsonPath)) {
        initializeApp({ credential: cert(require(jsonPath)) });
        return true;
    }
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        return true;
    }
    return false;
}

async function wipeFirebaseUsers() {
    let totalDeleted = 0;
    let nextPageToken;
    do {
        const page = await getAuth().listUsers(1000, nextPageToken);
        const uids = page.users.map((u) => u.uid);
        if (uids.length) {
            const result = await getAuth().deleteUsers(uids);
            totalDeleted += result.successCount;
            if (result.failureCount > 0) {
                console.warn(`  Firebase: ${result.failureCount} deletions failed`);
            }
        }
        nextPageToken = page.pageToken;
    } while (nextPageToken);
    return totalDeleted;
}

async function main() {
    await countdown(5);

    const prisma = require('../src/config/db');

    console.log('\n[DB] wiping user-generated tables...');
    const counts = await prisma.$transaction(async (tx) => {
        const a = await tx.questionAttempt.deleteMany({});
        const b = await tx.examSession.deleteMany({});
        const c = await tx.studySession.deleteMany({});
        const d = await tx.battle.deleteMany({});
        const e = await tx.srsCard.deleteMany({});
        const f = await tx.activityLog.deleteMany({});
        const g = await tx.userTopicPerformance.deleteMany({});
        const h = await tx.readinessSnapshot.deleteMany({});
        const i = await tx.thetaHistory.deleteMany({});
        const j = await tx.plannerTask.deleteMany({});
        const k = await tx.bookmark.deleteMany({});
        const l = await tx.user.deleteMany({});
        return { questionAttempts: a.count, examSessions: b.count, studySessions: c.count, battles: d.count, srsCards: e.count, activityLogs: f.count, topicPerformances: g.count, readinessSnapshots: h.count, thetaHistories: i.count, plannerTasks: j.count, bookmarks: k.count, users: l.count };
    });
    console.log('[DB] deleted:', counts);

    console.log('\n[FIREBASE] wiping auth users...');
    if (!initFirebase()) {
        console.warn('[FIREBASE] No service account credentials found — skipping auth wipe.');
    } else {
        const total = await wipeFirebaseUsers();
        console.log(`[FIREBASE] deleted ${total} auth users.`);
    }

    await prisma.$disconnect();
    console.log('\n✅ Wipe complete. Question bank, folders, materials, and system config preserved.\n');
}

main().catch((err) => {
    console.error('\n[ERROR] Wipe failed:', err);
    process.exit(1);
});
