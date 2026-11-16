import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

// Library round (2026-11-16) against a real Postgres: a rewrite of a live card
// is applied in place, so a learner's review of it survives; the card lands
// under a syllabus subtopic of its own topic; a version row is kept.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');
const { invalidateTopicCache } = require('../../src/services/topicResolver');
const routes = require('../../src/routes/referenceCardRoutes');

const RUN = `cr${Date.now().toString(36)}`;
const ADMIN = `${RUN}-admin`;
const LEARNER = `${RUN}-learner`;
const app = express();
app.use(express.json());
app.use('/api/reference-cards', routes);
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

let topic; let subtopic; let card; let revision;

beforeAll(async () => {
    await prisma.user.createMany({ data: [{ id: ADMIN, email: `${ADMIN}@example.test`, role: 'ADMIN' }, { id: LEARNER, email: `${LEARNER}@example.test` }] });
    topic = await prisma.topic.create({ data: { subject: 'Mathematics', name: `${RUN} Algebra`, normKey: `${RUN} algebra` } });
    subtopic = await prisma.syllabusSubtopic.create({ data: { topicId: topic.id, name: 'Algebraic Expressions', normKey: 'algebraic expressions' } });
    invalidateTopicCache();
    card = await prisma.referenceCard.create({
        data: {
            kind: 'formula', name: `${RUN} One Base Law`, symbol: '$1^n$', formulaLatex: '$1^n = 1$', description: 'One to any power.',
            variables: [{ symbol: '$n$', meaning: 'any exponent' }], purposeExamTip: 'Quick win.', subject: 'Mathematics', topicId: topic.id,
            subtopicTag: 'Law of Exponents', dimensionless: true, status: 'LIVE',
        },
    });
    await prisma.cardReview.create({ data: { userId: LEARNER, cardId: card.id, nextReviewDate: new Date() } });
    revision = await prisma.referenceCardRevision.create({
        data: { cardId: card.id, content: { name: `${RUN} Power of One`, subtopic: 'algebraic expressions', subtopicTag: 'Laws of exponents' }, note: 'Clearer name.' },
    });
});

afterAll(async () => {
    await prisma.referenceCardVersion.deleteMany({ where: { cardId: card?.id } });
    await prisma.referenceCard.deleteMany({ where: { id: card?.id } });
    await prisma.syllabusSubtopic.deleteMany({ where: { topicId: topic?.id } });
    await prisma.topic.deleteMany({ where: { id: topic?.id } });
    await prisma.user.deleteMany({ where: { id: { in: [ADMIN, LEARNER] } } });
    await prisma.$disconnect();
});

describe('a rewrite of a live card', () => {
    it('is listed with the card as it is, then applied in place: same id, review kept, under its subtopic', async () => {
        const list = await request(app).get('/api/reference-cards/revisions').set(as(ADMIN));
        expect(list.body.items.find((r) => r.id === revision.id)?.card.name).toBe(`${RUN} One Base Law`);

        const res = await request(app).post(`/api/reference-cards/revisions/${revision.id}/approve`).set(as(ADMIN));
        expect(res.status).toBe(200);
        const after = await prisma.referenceCard.findUnique({ where: { id: card.id } });
        expect(after).toMatchObject({ name: `${RUN} Power of One`, subtopicId: subtopic.id, subtopicTag: 'Laws of exponents', status: 'LIVE' });
        expect(await prisma.cardReview.count({ where: { cardId: card.id } })).toBe(1);
        expect((await prisma.referenceCardRevision.findUnique({ where: { id: revision.id } })).status).toBe('APPLIED');
        expect(await prisma.referenceCardVersion.count({ where: { cardId: card.id, action: 'EDITED' } })).toBe(1);

        // Learners get it with its subtopic.
        const read = await request(app).get('/api/reference-cards').set(as(LEARNER));
        expect(read.body.items.find((c) => c.id === card.id)?.subtopic).toMatchObject({ id: subtopic.id, name: 'Algebraic Expressions' });

        // Applied once only.
        expect((await request(app).post(`/api/reference-cards/revisions/${revision.id}/approve`).set(as(ADMIN))).status).toBe(409);
    });
});
