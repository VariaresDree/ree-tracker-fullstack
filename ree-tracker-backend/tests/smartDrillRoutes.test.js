import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Smart Drill v2. The old route:
//  • ranked subtopics by raw accuracy on the legacy `subtopic` string;
//  • did not exclude flagged questions from its first query;
//  • stripped `answer` from every item — so the client, which grades practice
//    locally, marked EVERY drill MCQ wrong and flashcards revealed a blank.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const smartDrillRoutes = require('../src/routes/smartDrillRoutes');

const UID = 'uid-drill';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/smart-drill', smartDrillRoutes);
    return app;
}

const full = (id, over = {}) => ({ id, subject: 'EE', subtopic: 'Protection', text: `Q ${id}`, options: ['A', 'B'], answer: 'A', fixedExplanation: 'why', isFlagged: false, ...over });

let questionFindMany;
let attemptFindMany;

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ thetaRating: 0, standardError: 0.5 });
    vi.spyOn(prisma.userAbility, 'findMany').mockResolvedValue([{ subject: 'EE', theta: 0.2, se: 0.4 }]);
    vi.spyOn(prisma.userTopicPerformance, 'findMany').mockResolvedValue([
        { topic: 'Protection', subject: 'EE', topicId: 't-prot', attempts: 12, correct: 4, pMastery: 0.3, masteryN: 12, lastPracticedAt: new Date() },
        { topic: 'Algebra', subject: 'Mathematics', topicId: 't-alg', attempts: 12, correct: 11, pMastery: 0.9, masteryN: 12, lastPracticedAt: new Date() },
    ]);
    vi.spyOn(prisma.syllabusWeight, 'findMany').mockResolvedValue([]);
    vi.spyOn(prisma.topic, 'findUnique').mockResolvedValue({ id: 't-prot', name: 'Protection', subject: 'EE' });
    // Attempts: the recently-seen read (select questionId, createdAt window)
    // and the blind-spot read (confidently wrong).
    attemptFindMany = vi.spyOn(prisma.questionAttempt, 'findMany').mockImplementation(async (args) => {
        if (args.where?.confidenceLevel === 'HIGH') return [{ questionId: 'q-blind' }];
        return [{ questionId: 'q-seen' }];
    });
    // Two shapes of question read: candidate params (select), and the final
    // full rows (no select).
    questionFindMany = vi.spyOn(prisma.question, 'findMany').mockImplementation(async (args) => {
        if (args.select) {
            return ['q1', 'q2', 'q3', 'q-seen', 'q-blind'].map((id) => ({ id, irtA: 1, irtB: 0, irtC: 0.2, difficulty: null }));
        }
        return args.where.id.in.map((id) => full(id));
    });
});

afterEach(() => { vi.restoreAllMocks(); });

describe('GET /api/smart-drill', () => {
    it('serves drill items WITH answers, never flagged, never seen in the last day', async () => {
        const res = await request(makeApp()).get('/api/smart-drill?limit=3').set(as(UID));

        expect(res.status).toBe(200);
        expect(res.body.items.length).toBeGreaterThan(0);
        for (const q of res.body.items) {
            expect(q.answer).toBe('A');
            expect(q.id).not.toBe('q-seen');
        }

        const candidateRead = questionFindMany.mock.calls.find(([a]) => a.select)[0];
        expect(candidateRead.where.isFlagged).toBe(false);
        const finalRead = questionFindMany.mock.calls.find(([a]) => !a.select)[0];
        expect(finalRead.where.isFlagged).toBe(false);

        const recent = attemptFindMany.mock.calls.find(([a]) => a.where?.createdAt)[0];
        expect(recent.where.userId).toBe(UID);
    });

    it('targets the weakest topic by decayed mastery × weight when none is named', async () => {
        const res = await request(makeApp()).get('/api/smart-drill?limit=3').set(as(UID));
        expect(res.body.weakAreas[0]).toMatchObject({ topic: 'Protection', subject: 'EE' });
        const candidateRead = questionFindMany.mock.calls.find(([a]) => a.select)[0];
        expect(candidateRead.where.OR).toEqual(expect.arrayContaining([{ topicId: 't-prot' }, { subtopic: 'Protection' }]));
    });

    it('drills a named topic', async () => {
        const res = await request(makeApp()).get('/api/smart-drill?limit=3&topicId=t-prot').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.weakAreas).toEqual([expect.objectContaining({ topic: 'Protection', topicId: 't-prot' })]);
    });

    it('blind-spot mode leads with the questions answered confidently wrong', async () => {
        const res = await request(makeApp()).get('/api/smart-drill?limit=3&topicId=t-prot&mode=blind-spot').set(as(UID));
        expect(res.body.items.map((q) => q.id)).toContain('q-blind');
        const blindRead = attemptFindMany.mock.calls.find(([a]) => a.where?.confidenceLevel === 'HIGH')[0];
        expect(blindRead.where).toMatchObject({ userId: UID, isCorrect: false });
    });

    it('a learner with no history gets an empty drill, not an error', async () => {
        prisma.userTopicPerformance.findMany.mockResolvedValue([]);
        const res = await request(makeApp()).get('/api/smart-drill').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ items: [], weakAreas: [] });
    });
});
