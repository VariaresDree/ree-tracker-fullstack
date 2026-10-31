import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Spaced repetition for formula cards: rate a card after flipping it, and
// SM-2 (shared with the app) schedules it at a Manila midnight. A replayed
// rating changes nothing; a rating queued offline is scheduled from when it
// was made.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const cardReviewRoutes = require('../src/routes/cardReviewRoutes');
const { rateCard, NEW_CARD, manilaDueInstant, scheduleNext } = require('@ree/shared');
const engine = require('../src/engine/srs');

const UID = 'uid-cards';
function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/user', cardReviewRoutes);
    return app;
}
const as = () => ({ Authorization: `Bearer ${UID}` });
const rate = (cardId, body) => request(makeApp()).post(`/api/user/card-reviews/${cardId}`).set(as()).send(body);

let rows;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    rows = new Map();
    vi.spyOn(prisma.cardReview, 'findUnique').mockImplementation(async ({ where }) => {
        const r = rows.get(where.userId_cardId.cardId);
        return r && where.userId_cardId.userId === UID ? { ...r } : null;
    });
    vi.spyOn(prisma.cardReview, 'create').mockImplementation(async ({ data }) => { rows.set(data.cardId, { ...data }); return { ...data }; });
    vi.spyOn(prisma.cardReview, 'update').mockImplementation(async ({ where, data }) => {
        const r = { ...rows.get(where.userId_cardId.cardId), ...data };
        rows.set(where.userId_cardId.cardId, r);
        return r;
    });
    // No study plan unless a test says so.
    vi.spyOn(prisma.plannerTask, 'findFirst').mockResolvedValue(null);
    vi.spyOn(prisma.plannerTask, 'updateMany').mockResolvedValue({ count: 1 });
    vi.spyOn(prisma.cardReview, 'count').mockImplementation(async () => rows.size);
});
afterEach(() => vi.restoreAllMocks());

describe('rating rules', () => {
    it('maps Again / Hard / Good / Easy onto SM-2 and a Manila midnight', () => {
        const at = new Date('2026-10-10T15:30:00Z'); // 23:30 Manila
        const good = rateCard(NEW_CARD, 'good', at);
        expect(good).toMatchObject({ interval: 1, repetitions: 1 });
        expect(good.nextReviewDate.toISOString()).toBe('2026-10-10T16:00:00.000Z'); // the next Manila midnight, 30 minutes on
        expect(rateCard(good, 'good', at).interval).toBe(6);
        expect(rateCard(rateCard(good, 'good', at), 'again', at)).toMatchObject({ interval: 1, repetitions: 0 });
        expect(rateCard(NEW_CARD, 'easy', at).easeFactor).toBeGreaterThan(rateCard(NEW_CARD, 'hard', at).easeFactor);
        expect(() => rateCard(NEW_CARD, 'meh', at)).toThrow();
    });

    it('is the same SM-2 step the question reviews use', () => {
        expect(engine.scheduleNext).toBe(scheduleNext);
        expect(engine.manilaDueInstant).toBe(manilaDueInstant);
    });

    it('schedules a queued rating from when it was made, within a week, never the future', () => {
        const now = new Date('2026-10-10T00:00:00Z');
        expect(cardReviewRoutes.reviewTime('2026-10-09T00:00:00Z', now).toISOString()).toBe('2026-10-09T00:00:00.000Z');
        expect(cardReviewRoutes.reviewTime('2026-09-01T00:00:00Z', now).toISOString()).toBe('2026-10-03T00:00:00.000Z');
        expect(cardReviewRoutes.reviewTime('2026-12-01T00:00:00Z', now)).toEqual(now);
        expect(cardReviewRoutes.reviewTime(undefined, now)).toEqual(now);
    });
});

describe('POST /api/user/card-reviews/:cardId', () => {
    it('needs a sign-in', async () => {
        expect((await request(makeApp()).post('/api/user/card-reviews/c1').send({ rating: 'good', reviewId: 'r-00000001' })).status).toBe(401);
    });

    it('starts a card on its first rating and moves it on the next', async () => {
        const first = await rate('c1', { rating: 'good', reviewId: 'r-00000001' });
        expect(first.status).toBe(200);
        expect(first.body.item).toMatchObject({ interval: 1, repetitions: 1 });
        expect(first.body.item).not.toHaveProperty('lastReviewId');
        expect(prisma.cardReview.create.mock.calls[0][0].data).toMatchObject({ userId: UID, cardId: 'c1', lastReviewId: 'r-00000001' });

        const second = await rate('c1', { rating: 'good', reviewId: 'r-00000002' });
        expect(second.body.item).toMatchObject({ interval: 6, repetitions: 2 });
        expect(prisma.cardReview.update.mock.calls[0][0].where).toEqual({ userId_cardId: { userId: UID, cardId: 'c1' } });
    });

    it('a replayed rating changes nothing', async () => {
        await rate('c1', { rating: 'good', reviewId: 'r-00000001' });
        const again = await rate('c1', { rating: 'good', reviewId: 'r-00000001' });
        expect(again.body.item).toMatchObject({ interval: 1, repetitions: 1 });
        expect(prisma.cardReview.update).not.toHaveBeenCalled();
    });

    it('refuses an unknown rating, and a card that does not exist', async () => {
        expect((await rate('c1', { rating: 'meh', reviewId: 'r-00000001' })).status).toBe(400);
        prisma.cardReview.create.mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }));
        expect((await rate('gone', { rating: 'good', reviewId: 'r-00000003' })).status).toBe(404);
    });
});

describe("the study plan's formula-cards task", () => {
    const { todayManila } = require('../src/utils/manilaDate');

    it("is ticked off once the day's ratings reach its target, so a later re-rating can't take it back", async () => {
        prisma.plannerTask.findFirst.mockResolvedValue({ id: 'task-1', targetCount: 2 });
        await rate('c1', { rating: 'good', reviewId: 'r-00000001' });
        expect(prisma.plannerTask.findFirst.mock.calls[0][0].where).toEqual({ userId: UID, kind: 'cards', dueDate: todayManila(), completed: false });
        expect(prisma.plannerTask.updateMany).not.toHaveBeenCalled(); // 1 of 2
        await rate('c2', { rating: 'hard', reviewId: 'r-00000002' });
        expect(prisma.plannerTask.updateMany).toHaveBeenCalledWith({ where: { id: 'task-1', userId: UID, completed: false }, data: { completed: true } });
    });

    it('never costs the rating itself', async () => {
        prisma.plannerTask.findFirst.mockRejectedValue(new Error('db down'));
        const res = await rate('c1', { rating: 'good', reviewId: 'r-00000001' });
        expect(res.status).toBe(200);
        expect(res.body.item).toMatchObject({ interval: 1 });
    });
});

describe('GET /api/user/card-reviews', () => {
    it("lists the caller's live cards with what is due", async () => {
        const now = Date.now();
        const findMany = vi.spyOn(prisma.cardReview, 'findMany').mockResolvedValue([
            { cardId: 'c1', nextReviewDate: new Date(now - 1000) },
            { cardId: 'c2', nextReviewDate: new Date(now - 86400000) },
            { cardId: 'c3', nextReviewDate: new Date(now + 86400000) },
        ]);
        const res = await request(makeApp()).get('/api/user/card-reviews').set(as());
        expect(findMany.mock.calls[0][0].where).toEqual({ userId: UID, card: { status: 'LIVE', kind: { in: ['formula', 'constant'] } } });
        expect(res.body.summary).toEqual({ due: 2, total: 3, nextDueAt: new Date(now + 86400000).toISOString() });
        expect(res.body.items).toHaveLength(3);

        const summary = await request(makeApp()).get('/api/user/card-reviews/summary').set(as());
        expect(summary.body).toMatchObject({ due: 2, total: 3 });
    });
});
