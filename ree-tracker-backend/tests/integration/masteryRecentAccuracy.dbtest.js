import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// The data migration 20261119000000_mastery_recent_accuracy recomputes every
// stored topic mastery in SQL. It must give what the JS rebuild
// (masteryRollups.foldUserMastery, the same fold telemetry runs) gives, or a
// learner's mastery would jump at their next answer. Run inside a transaction
// that is rolled back, so the shared database's other rows are untouched.

const fs = require('fs');
const path = require('path');
const prisma = require('../../src/config/db');
const { HISTORY_SELECT, foldUserMastery } = require('../../src/services/masteryRollups');

const RUN = `mr${Date.now().toString(36)}`;
const U = `${RUN}-u`;
const TOPIC_A = `${RUN} Topic A`;
const LABEL_B = `${RUN} Label B`;
const SQL = fs.readFileSync(path.join(__dirname, '../../prisma/migrations/20261119000000_mastery_recent_accuracy/migration.sql'), 'utf8');

// 40 answers in A (right then mostly wrong, so order matters past 16), 5 in B
// (no Topic row: keyed by the attempt's label), answer times out of insert order.
const A_BITS = '1111111111111111111100100010000100100000';
const B_BITS = '10110';

beforeAll(async () => {
    await prisma.user.create({ data: { id: U, email: `${U}@example.test` } });
    const topic = await prisma.topic.create({ data: { name: TOPIC_A, subject: 'EE', normKey: TOPIC_A.toLowerCase() } });
    await prisma.question.createMany({
        data: [
            { id: `${RUN}-qa`, subject: 'EE', subtopic: TOPIC_A, topicId: topic.id, text: `${RUN} a?`, options: ['1', '2', '3', '4'], answer: '1', difficulty: 2 },
            { id: `${RUN}-qb`, subject: 'Mathematics', subtopic: LABEL_B, text: `${RUN} b?`, options: ['1', '2', '3', '4'], answer: '1', difficulty: 2 },
        ],
    });
    const at = (i) => new Date(Date.UTC(2026, 10, 1, 0, 0, i));
    const rows = [
        ...[...A_BITS].map((b, i) => ({ q: 'qa', label: TOPIC_A, b, i })),
        ...[...B_BITS].map((b, i) => ({ q: 'qb', label: LABEL_B, b, i })),
    ].reverse(); // inserted newest first: the fold must sort by answer time
    await prisma.questionAttempt.createMany({
        data: rows.map(({ q, label, b, i }) => ({
            id: `${RUN}-${q}-${String(i).padStart(3, '0')}`,
            userId: U, questionId: `${RUN}-${q}`, subject: q === 'qa' ? 'EE' : 'Mathematics', subtopic: label,
            isCorrect: b === '1', mode: 'ACTIVE_REVIEW', timeSpentMs: 20_000,
            // Half carry answeredAt; the rest fall back to createdAt.
            answeredAt: i % 2 ? at(i) : null, createdAt: at(i),
        })),
    });
    // Stored rows as the old fold left them: stuck at 1.0.
    await prisma.userTopicPerformance.createMany({
        data: [
            { userId: U, subject: 'EE', topic: TOPIC_A, topicId: topic.id, attempts: 40, correct: 26, totalTime: 800, pMastery: 1, masteryN: 40 },
            { userId: U, subject: 'Mathematics', topic: LABEL_B, attempts: 5, correct: 3, totalTime: 100, pMastery: 1, masteryN: 5 },
        ],
    });
});

afterAll(async () => {
    await prisma.userTopicPerformance.deleteMany({ where: { userId: U } });
    await prisma.questionAttempt.deleteMany({ where: { userId: U } });
    await prisma.question.deleteMany({ where: { id: { startsWith: RUN } } });
    await prisma.topic.deleteMany({ where: { name: TOPIC_A } });
    await prisma.user.deleteMany({ where: { id: U } });
});

describe('migration 20261119000000_mastery_recent_accuracy', () => {
    it('recomputes stored mastery exactly as the JS rebuild does', async () => {
        const history = await prisma.questionAttempt.findMany({ where: { userId: U }, select: HISTORY_SELECT });
        const expected = new Map(foldUserMastery(history).map((r) => [r.topic, r]));

        const ROLLBACK = new Error('rollback');
        let after = [];
        await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(SQL);
            after = await tx.userTopicPerformance.findMany({ where: { userId: U }, select: { topic: true, pMastery: true, masteryN: true } });
            throw ROLLBACK;
        }).catch((e) => { if (e !== ROLLBACK) throw e; });

        expect(after).toHaveLength(2);
        for (const row of after) {
            const want = expected.get(row.topic);
            expect(want, row.topic).toBeDefined();
            expect(row.pMastery).toBeCloseTo(want.pMastery, 9);
            expect(row.masteryN).toBe(want.masteryN);
        }
        // Neither is stuck at 1 any more: A ended mostly wrong.
        expect(after.find((r) => r.topic === TOPIC_A).pMastery).toBeLessThan(0.6);
    });
});
