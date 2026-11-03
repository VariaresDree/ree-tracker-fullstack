import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Questions another AI wrote, against a real database: the duplicate check's raw
// SQL, the transaction's timeout option, and rows the review queue can read.

const prisma = require('../../src/config/db');
const { importQuestions } = require('../../src/services/questionImport');
const { invalidateTopicCache } = require('../../src/services/topicResolver');
const { isBulkEligible } = require('../../src/services/reviewService');

const RUN = `qi${Date.now().toString(36)}`;
const TOPIC = `${RUN} Topic`;
const LIVE_ID = `${RUN}-live`;
const item = (text, over = {}) => ({
    subject: 'EE', subtopic: TOPIC, text, options: ['1 A', '2 A', '3 A', '4 A'], answer: '2 A',
    fixedExplanation: `**Answer:** 2 A, with $\\frac{1}{2}$ kept. ${RUN}`, type: 'calculation', difficulty: 2, ...over,
});

beforeAll(async () => {
    await prisma.topic.create({ data: { id: `${RUN}-t`, subject: 'EE', name: TOPIC, normKey: TOPIC.toLowerCase(), aliases: [], sortOrder: 9999, active: true } });
    invalidateTopicCache();
    await prisma.question.create({ data: { id: LIVE_ID, subject: 'EE', subtopic: TOPIC, text: `${RUN} live $stem$?`, options: ['a', 'b'], answer: 'a', isFlagged: false } });
});

afterAll(async () => {
    const rows = await prisma.questionPendingReview.findMany({ where: { subtopic: TOPIC }, select: { id: true } });
    await prisma.questionVersion.deleteMany({ where: { reviewId: { in: rows.map((r) => r.id) } } });
    await prisma.questionPendingReview.deleteMany({ where: { subtopic: TOPIC } });
    await prisma.question.deleteMany({ where: { id: LIVE_ID } });
    await prisma.topic.deleteMany({ where: { id: `${RUN}-t` } });
    invalidateTopicCache();
});

describe('importQuestions', () => {
    it('queues a clean item with an audit row, ready for Accept All', async () => {
        const res = await importQuestions([item(`${RUN} first?`)], null);
        expect(res.rejected).toEqual([]);
        const row = await prisma.questionPendingReview.findUnique({ where: { id: res.queued[0] } });
        expect(row).toMatchObject({ status: 'PENDING', source: 'external_ai', answer: '2 A' });
        expect(row.fixedExplanation).toContain('\\frac{1}{2}');
        expect(isBulkEligible(row)).toBe(true);
        expect(await prisma.questionVersion.count({ where: { reviewId: row.id, action: 'SUBMITTED' } })).toBe(1);
    });

    it('refuses a stem already live or pending, however it is spaced', async () => {
        const res = await importQuestions([item(`${RUN}  LIVE stem?`), item(`${RUN}  First?`), item(`${RUN} second?`)], null);
        expect(res.queued).toHaveLength(1);
        expect(res.rejected).toEqual([
            { index: 0, reasons: ['duplicate'] },
            { index: 1, reasons: ['duplicate'] },
        ]);
    });

    it('a rejected stem can be imported again', async () => {
        const { queued } = await importQuestions([item(`${RUN} third?`)], null);
        await prisma.questionPendingReview.update({ where: { id: queued[0] }, data: { status: 'REJECTED' } });
        expect((await importQuestions([item(`${RUN} third?`)], null)).queued).toHaveLength(1);
    });
});
