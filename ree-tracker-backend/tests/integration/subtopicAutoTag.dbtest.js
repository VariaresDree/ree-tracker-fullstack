import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Subtopic tagging in the background, against a real database: the raw SQL
// that picks the next batch skips questions already asked (for their current
// topic), and the status counts and the review list agree with it.

const prisma = require('../../src/config/db');
const { nextBatch, recordSuggestions, autoTagStatus, openSuggestions, resolveSuggestions } = require('../../src/services/subtopicAutoTag');

const RUN = `at${Date.now().toString(36)}`;
// Sorts first among subjects, so nextBatch reaches this topic before any other.
const SUBJECT = 'AAtest';
const Q = (n) => `${RUN}-q${n}`;
let topic;
let sub;

beforeAll(async () => {
    topic = await prisma.topic.create({ data: { subject: SUBJECT, name: `${RUN} Topic`, normKey: `${RUN} topic` } });
    sub = await prisma.syllabusSubtopic.create({ data: { topicId: topic.id, name: `${RUN} Sub`, normKey: `${RUN} sub` } });
    await prisma.question.createMany({
        data: [1, 2, 3, 4].map((n) => ({
            id: Q(n), subject: SUBJECT, subtopic: topic.name, topicId: topic.id, text: `${RUN} stem ${n}?`,
            options: ['a', 'b', 'c', 'd'], answer: 'a', difficulty: 2, createdAt: new Date(Date.UTC(2026, 0, n)),
        })),
    });
});

afterAll(async () => {
    await prisma.subtopicSuggestion.deleteMany({ where: { questionId: { startsWith: RUN } } });
    await prisma.question.deleteMany({ where: { id: { startsWith: RUN } } });
    await prisma.syllabusSubtopic.deleteMany({ where: { topicId: topic.id } });
    await prisma.topic.deleteMany({ where: { id: topic.id } });
});

describe('background subtopic tagging', () => {
    it('asks about each question once, keeps the unsure ones, and counts them', async () => {
        const first = await nextBatch(2);
        expect(first.topic.id).toBe(topic.id);
        expect(first.subtopics.map((s) => s.id)).toEqual([sub.id]);
        expect(first.items.map((q) => q.id)).toEqual([Q(1), Q(2)]);

        // q1 kept for review, q2 tagged by a sure pick.
        expect(await recordSuggestions(topic.id, [{ id: Q(1), subtopicId: sub.id, guess: 'Sub' }])).toBe(1);
        await prisma.question.update({ where: { id: Q(2) }, data: { subtopicId: sub.id } });

        const next = await nextBatch(10);
        expect(next.items.map((q) => q.id)).toEqual([Q(3), Q(4)]);

        const status = await autoTagStatus();
        expect(status.total).toBeGreaterThanOrEqual(4);
        expect(status.tagged).toBeGreaterThanOrEqual(1);
        expect(status.toReview).toBeGreaterThanOrEqual(1);

        const open = await openSuggestions({ limit: 50 });
        const mine = open.items.find((r) => r.id === Q(1));
        expect(mine).toMatchObject({ topicId: topic.id, subtopicId: sub.id, guess: 'Sub' });
        expect(open.topics.find((t) => t.id === topic.id).subtopics.map((s) => s.id)).toEqual([sub.id]);
    });

    it('a question moved to another topic is asked afresh', async () => {
        const other = await prisma.topic.create({ data: { subject: SUBJECT, name: `${RUN} Other`, normKey: `${RUN} other` } });
        try {
            await prisma.question.update({ where: { id: Q(1) }, data: { topicId: other.id } });
            expect((await openSuggestions({ limit: 50 })).items.some((r) => r.id === Q(1))).toBe(false);
        } finally {
            await prisma.question.update({ where: { id: Q(1) }, data: { topicId: topic.id } });
            await prisma.topic.delete({ where: { id: other.id } });
        }
    });

    it('resolving tags it and closes the suggestion', async () => {
        const out = await resolveSuggestions([{ id: Q(1), subtopicId: sub.id }]);
        expect(out.saved).toBe(1);
        expect((await prisma.question.findUnique({ where: { id: Q(1) } })).subtopicId).toBe(sub.id);
        expect((await prisma.subtopicSuggestion.findUnique({ where: { questionId: Q(1) } })).resolvedAt).not.toBeNull();
        expect((await openSuggestions({ limit: 50 })).items.some((r) => r.id === Q(1))).toBe(false);
    });
});
