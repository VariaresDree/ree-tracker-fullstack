import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Library › Notebook. The mistake notebook is derived from the attempts the
// app already records: every question answered wrong (not left blank), fixed
// once answered right after the last miss or marked fixed, with the
// learner's cause or one the data suggests. Notes are the learner's own words
// on a question or a formula card.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const mistakeRoutes = require('../src/routes/mistakeRoutes');
const noteRoutes = require('../src/routes/noteRoutes');
const { buildMistakes, mistakeQuestionIds } = require('../src/services/mistakeView');
const { suggestMistakeCause, isMistakeFixed, NOTE_MAX } = require('@ree/shared');

const UID = 'uid-notebook';
function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/user', mistakeRoutes);
    app.use('/api/user', noteRoutes);
    return app;
}
const as = (uid = UID) => ({ Authorization: `Bearer ${uid}` });
const at = (min) => new Date(Date.UTC(2026, 9, 1, 8, min));
const q = (id, subject = 'EE') => ({ id, subject, subtopic: `${subject} topic`, text: `Question ${id}`, options: ['A', 'B', 'C', 'D'], answer: 'A', fixedExplanation: `Why ${id}`, type: 'computational' });
const wrongAt = (questionId, min, over = {}) => ({ questionId, subject: 'EE', subtopic: 'EE topic', selectedAnswer: 'B', confidenceLevel: 'MED', timeSpentMs: 60_000, answeredAt: at(min), createdAt: at(min), ...over });

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});
afterEach(() => vi.restoreAllMocks());

describe('mistake rules', () => {
    it('suggests time for a miss far past the board pace, concept for a sure miss', () => {
        expect(suggestMistakeCause({ timeSpentMs: 400_000, confidenceLevel: 'HIGH' }, 'EE')).toBe('time'); // EE pace 216 s
        expect(suggestMistakeCause({ timeSpentMs: 200_000, confidenceLevel: 'HIGH' }, 'EE')).toBe('concept');
        expect(suggestMistakeCause({ timeSpentMs: 200_000, confidenceLevel: 'LOW' }, 'Mathematics')).toBeNull();
        expect(suggestMistakeCause({ timeSpentMs: 280_000, confidenceLevel: 'LOW' }, 'Mathematics')).toBe('time'); // 180 s × 1.5
    });

    it('is fixed by a later correct answer or a later mark, and reopened by a new miss', () => {
        expect(isMistakeFixed({ lastWrongAt: at(1), lastCorrectAt: at(2) })).toBe(true);
        expect(isMistakeFixed({ lastWrongAt: at(3), lastCorrectAt: at(2) })).toBe(false);
        expect(isMistakeFixed({ lastWrongAt: at(1), resolvedAt: at(2) })).toBe(true);
        expect(isMistakeFixed({ lastWrongAt: at(3), resolvedAt: at(2) })).toBe(false);
    });

    it('lists the newest questions first, counting every miss, up to the limit', () => {
        const wrong = [wrongAt('q2', 9), wrongAt('q1', 8, { selectedAnswer: 'C' }), wrongAt('q1', 2), wrongAt('q3', 1)];
        const { ids, truncated } = mistakeQuestionIds(wrong, 2);
        expect(ids).toEqual(['q2', 'q1']);
        expect(truncated).toBe(true);
        const items = buildMistakes({ wrong, correct: [{ questionId: 'q2', answeredAt: at(10) }], questions: [q('q1'), q('q2')], tags: [], ids });
        expect(items.map((i) => [i.questionId, i.timesWrong, i.lastAnswer, i.fixed])).toEqual([['q2', 1, 'B', true], ['q1', 2, 'C', false]]);
    });
});

describe('GET /api/user/mistakes', () => {
    it('needs a sign-in', async () => {
        expect((await request(makeApp()).get('/api/user/mistakes')).status).toBe(401);
    });

    it("builds the caller's notebook, leaving blanks out", async () => {
        const findMany = vi.spyOn(prisma.questionAttempt, 'findMany').mockImplementation(async ({ where }) => (where.isCorrect
            ? [{ questionId: 'q1', answeredAt: at(20), createdAt: at(20) }]
            : [wrongAt('q2', 15, { confidenceLevel: 'HIGH' }), wrongAt('q1', 10)]));
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([q('q1'), q('q2', 'ESAS')]);
        vi.spyOn(prisma.mistakeTag, 'findMany').mockResolvedValue([{ questionId: 'q2', cause: 'misread', resolvedAt: null }]);

        const res = await request(makeApp()).get('/api/user/mistakes').set(as());
        expect(res.status).toBe(200);
        const wrongQuery = findMany.mock.calls[0][0].where;
        expect(wrongQuery).toMatchObject({ userId: UID, isCorrect: false });
        expect(wrongQuery.OR).toEqual([{ selectedAnswer: null }, { selectedAnswer: { not: '' } }]);
        expect(findMany.mock.calls[1][0].where).toMatchObject({ userId: UID, isCorrect: true });
        expect(prisma.mistakeTag.findMany.mock.calls[0][0].where.userId).toBe(UID);

        expect(res.body.items).toEqual([
            expect.objectContaining({ questionId: 'q2', subject: 'ESAS', cause: 'misread', suggestedCause: 'concept', fixed: false, correctAnswer: 'A', explanation: 'Why q2' }),
            expect.objectContaining({ questionId: 'q1', cause: null, suggestedCause: null, fixed: true }),
        ]);
    });

    it('answers an empty notebook without further reads', async () => {
        vi.spyOn(prisma.questionAttempt, 'findMany').mockResolvedValue([]);
        const questions = vi.spyOn(prisma.question, 'findMany');
        const res = await request(makeApp()).get('/api/user/mistakes').set(as());
        expect(res.body).toEqual({ items: [], truncated: false });
        expect(questions).not.toHaveBeenCalled();
    });
});

describe('PUT /api/user/mistakes/:questionId', () => {
    const put = (body) => request(makeApp()).put('/api/user/mistakes/q1').set(as()).send(body);

    it('tags a cause and marks it fixed, keeping the first time it was marked', async () => {
        const first = new Date('2026-10-01T00:00:00Z');
        vi.spyOn(prisma.mistakeTag, 'findUnique').mockResolvedValue({ resolvedAt: first });
        const upsert = vi.spyOn(prisma.mistakeTag, 'upsert').mockImplementation(async ({ update }) => ({ ...update }));
        const res = await put({ cause: 'computation', resolved: true });
        expect(res.status).toBe(200);
        expect(upsert.mock.calls[0][0].where).toEqual({ userId_questionId: { userId: UID, questionId: 'q1' } });
        expect(upsert.mock.calls[0][0].update).toEqual({ cause: 'computation', resolvedAt: first });
        expect(res.body.item).toEqual({ questionId: 'q1', cause: 'computation', resolvedAt: first.toISOString() });
    });

    it('removes a tag with no cause that is not fixed', async () => {
        const del = vi.spyOn(prisma.mistakeTag, 'deleteMany').mockResolvedValue({ count: 1 });
        const res = await put({ cause: null, resolved: false });
        expect(res.status).toBe(200);
        expect(del).toHaveBeenCalledWith({ where: { userId: UID, questionId: 'q1' } });
    });

    it('refuses a cause it does not know, and a question that does not exist', async () => {
        expect((await put({ cause: 'luck', resolved: false })).status).toBe(400);
        vi.spyOn(prisma.mistakeTag, 'findUnique').mockResolvedValue(null);
        vi.spyOn(prisma.mistakeTag, 'upsert').mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }));
        expect((await put({ cause: 'concept', resolved: false })).status).toBe(404);
    });
});

describe('notes', () => {
    it('lists your notes with what each is on', async () => {
        const findMany = vi.spyOn(prisma.userNote, 'findMany').mockResolvedValue([
            { targetType: 'question', targetId: 'q1', body: 'Use the per-unit base', updatedAt: at(5) },
            { targetType: 'card', targetId: 'c1', body: 'Watch the units', updatedAt: at(4) },
            { targetType: 'question', targetId: 'gone', body: 'old', updatedAt: at(3) },
        ]);
        vi.spyOn(prisma.question, 'findMany').mockResolvedValue([q('q1')]);
        vi.spyOn(prisma.referenceCard, 'findMany').mockResolvedValue([{ id: 'c1', subject: 'EE', name: 'Capacitive reactance', symbol: 'X_c' }]);

        const res = await request(makeApp()).get('/api/user/notes').set(as());
        expect(findMany.mock.calls[0][0].where).toEqual({ userId: UID });
        expect(res.body.items.map((n) => [n.targetId, n.target?.title ?? null])).toEqual([
            ['q1', 'Question q1'], ['c1', 'Capacitive reactance (X_c)'], ['gone', null],
        ]);
    });

    it('saves a note on a question that exists, trimmed', async () => {
        vi.spyOn(prisma.question, 'findUnique').mockResolvedValue({ id: 'q1' });
        const upsert = vi.spyOn(prisma.userNote, 'upsert').mockImplementation(async ({ create }) => ({ ...create, updatedAt: at(1) }));
        const res = await request(makeApp()).put('/api/user/notes/question/q1').set(as()).send({ body: '  Draw the phasor first.  ' });
        expect(res.status).toBe(200);
        expect(upsert.mock.calls[0][0].where).toEqual({ userId_targetType_targetId: { userId: UID, targetType: 'question', targetId: 'q1' } });
        expect(res.body.item.body).toBe('Draw the phasor first.');
    });

    it('deletes a note saved empty', async () => {
        const del = vi.spyOn(prisma.userNote, 'deleteMany').mockResolvedValue({ count: 1 });
        const res = await request(makeApp()).put('/api/user/notes/card/c1').set(as()).send({ body: '   ' });
        expect(res.body).toEqual({ item: null });
        expect(del).toHaveBeenCalledWith({ where: { userId: UID, targetType: 'card', targetId: 'c1' } });
    });

    it('refuses an unknown target, a missing card, and a note over the limit', async () => {
        expect((await request(makeApp()).put('/api/user/notes/topic/x').set(as()).send({ body: 'x' })).status).toBe(404);
        vi.spyOn(prisma.referenceCard, 'findUnique').mockResolvedValue(null);
        expect((await request(makeApp()).put('/api/user/notes/card/nope').set(as()).send({ body: 'x' })).status).toBe(404);
        expect((await request(makeApp()).put('/api/user/notes/question/q1').set(as()).send({ body: 'x'.repeat(NOTE_MAX + 1) })).status).toBe(400);
    });
});
