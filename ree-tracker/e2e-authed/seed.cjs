// The authed Playwright run's account and data: a learner signed up on the
// Firebase Auth emulator, and the rows the specs read, written straight to the
// test database with the backend's own Prisma client. Run by global-setup.ts
// before the specs; it clears what an earlier run left first.
'use strict';

const path = require('node:path');

const EMULATOR = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const PROJECT = process.env.FIREBASE_PROJECT_ID || 'demo-ree';
const EMAIL = 'learner@e2e.test';
const PASSWORD = 'e2e-password-1';
// An admin of its own, for the every-screen check (screens.spec.ts): making
// the learner an admin would change what the other specs see.
const ADMIN_EMAIL = 'admin@e2e.test';
const ADMIN_PASSWORD = 'e2e-password-2';
const Q = (n) => `e2e-q${n}`;
const BATTLE_ID = 'E2ELIV';

async function emulator(pathname, init) {
    const res = await fetch(`http://${EMULATOR}${pathname}`, init);
    if (!res.ok) throw new Error(`Auth emulator ${pathname}: ${res.status} ${await res.text()}`);
    return res.json();
}

const signUp = async (email, password) => (await emulator('/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
})).localId;

async function seed() {
    // Fresh emulator accounts, then the learner and the admin.
    await emulator(`/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
    const uid = await signUp(EMAIL, PASSWORD);
    const adminUid = await signUp(ADMIN_EMAIL, ADMIN_PASSWORD);

    const prisma = require(path.resolve(__dirname, '../../ree-tracker-backend/src/config/db'));
    try {
        await prisma.battle.deleteMany({ where: { id: BATTLE_ID } });
        await prisma.user.deleteMany({ where: { email: { endsWith: '@e2e.test' } } });
        await prisma.question.deleteMany({ where: { id: { startsWith: 'e2e-' } } });

        await prisma.user.create({ data: { id: uid, email: EMAIL, displayName: 'E2E Learner' } });
        await prisma.user.create({ data: { id: adminUid, email: ADMIN_EMAIL, displayName: 'E2E Admin', role: 'ADMIN' } });
        const question = (n, subject, subtopic) => ({
            id: Q(n), subject, subtopic, text: `E2E question ${n}: pick A`, options: ['A', 'B', 'C', 'D'], answer: 'A',
            fixedExplanation: `Why ${n}: A is right, since $V = IR$.`, type: 'conceptual',
        });
        await prisma.question.createMany({
            // Question 4 is never answered, bookmarked or in a battle: with it a
            // printed mixed paper has one item per subject (scanSheet.spec).
            data: [question(1, 'EE', 'Protection'), question(2, 'Mathematics', 'Calculus'), question(3, 'ESAS', 'Chemistry'), question(4, 'ESAS', 'Physics')],
        });
        // Due for review now (EE), and an open mistake (Math): today's loop.
        await prisma.sRSCard.create({ data: { userId: uid, questionId: Q(1), nextReviewDate: new Date(Date.now() - 3600_000) } });
        await prisma.questionAttempt.create({
            data: { userId: uid, questionId: Q(2), subject: 'Mathematics', subtopic: 'Calculus', isCorrect: false, selectedAnswer: 'B', mode: 'DRILL', confidenceLevel: 'MED', timeSpentMs: 60_000 },
        });
        // Bookmarked, and in a battle the learner is still in: no key yet.
        await prisma.bookmark.create({ data: { userId: uid, questionId: Q(3) } });
        await prisma.battle.create({
            data: {
                id: BATTLE_ID, hostId: uid, config: {}, questions: [{ id: Q(3) }], timeLimitSecs: 3600,
                status: 'IN_PROGRESS', startedAt: new Date(),
                participants: { create: [{ userId: uid, displayName: 'E2E Learner', isHost: true }] },
            },
        });
        // A logged focus block to fix.
        const end = Date.now() - 3600_000;
        await prisma.focusBlock.create({
            data: { userId: uid, clientId: 'e2e-focus-1', subject: 'General', minutes: 25, startedAt: new Date(end - 30 * 60_000), endedAt: new Date(end), completed: true },
        });
    } finally {
        await prisma.$disconnect();
    }
    return { uid, email: EMAIL, password: PASSWORD };
}

module.exports = { seed, EMAIL, PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD };
