import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// The question lists carry keys (Practice grades on the device), so they leave
// out the questions of a battle the caller is still in. Asking for the
// battle's subtopic here used to show its key mid-battle, around every other
// gate (services/answerGate.js).

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const questionRoutes = require('../src/routes/questionRoutes');

const UID = 'uid-player';
const ROWS = ['q1', 'q2', 'q3'].map((id) => ({ id, subject: 'EE', subtopic: 'Machines', text: id, answer: 'A' }));

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/questions', questionRoutes);
    return app;
}
const as = { Authorization: `Bearer ${UID}` };

let battles;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue(ROWS.map(({ id }) => ({ id })));
    vi.spyOn(prisma.question, 'findMany').mockResolvedValue(ROWS);
    battles = [];
    vi.spyOn(prisma.battleParticipant, 'findMany').mockImplementation(async () => battles);
});
afterEach(() => vi.restoreAllMocks());

// A battle the caller is in, under way, on q2.
const inBattleOn = (...ids) => {
    battles = [{ battle: { id: 'BAT001', questions: ids.map((id) => ({ id })), startedAt: new Date(), timeLimitSecs: 600, createdAt: new Date() } }];
};

describe('question lists leave out a running battle’s questions', () => {
    it('the random sample (Practice, the offline pack)', async () => {
        inBattleOn('q2');
        const res = await request(makeApp()).get('/api/questions?subject=EE&subtopic=Machines').set(as);
        expect(res.status).toBe(200);
        expect(res.body.items.map((q) => q.id)).toEqual(['q1', 'q3']);
        expect(prisma.battleParticipant.findMany.mock.calls[0][0].where).toMatchObject({ userId: UID });
    });

    it('the paged list, still paging over the whole bank', async () => {
        inBattleOn('q2');
        const res = await request(makeApp()).get('/api/questions?sort=recent&limit=3').set(as);
        expect(res.body.items.map((q) => q.id)).toEqual(['q1', 'q3']);
        expect(res.body.nextOffset).toBe(3);
    });

    it('the active-recall review set', async () => {
        inBattleOn('q1', 'q3');
        const res = await request(makeApp()).post('/api/questions/review').set(as).send({ subject: 'EE' });
        expect(res.body.items.map((q) => q.id)).toEqual(['q2']);
    });

    it('everything, when the caller is in no battle', async () => {
        const res = await request(makeApp()).get('/api/questions?subject=EE').set(as);
        expect(res.body.items).toHaveLength(3);
    });
});
