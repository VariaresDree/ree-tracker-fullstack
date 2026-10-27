import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// Printed paper sets and scanned sheets against a real database (migration
// 20261021000000_printed_sets): the create, the list's sheet count, a key
// change that re-scores the sheets inside the PATCH transaction, a sheet's
// nullable Json cleared, owner scoping, and the cascade from set to sheets.

const verifyIdToken = vi.fn(async (token) => ({ uid: token, email: `${token}@example.test` }));
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../../src/config/db');
const { PRINT_ID_ALPHABET, effectiveItems, keyVersionOf } = require('@ree/shared');

const RUN = `ps${Date.now().toString(36)}`;
const A = `${RUN}-a`;
const B = `${RUN}-b`;
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
// A fresh print id per run: 12 Crockford characters.
const SET = Array.from({ length: 12 }, (_, i) => PRINT_ID_ALPHABET[(Date.now() + i * 7) % 32]).join('');
const SHEET1 = crypto.randomUUID();
const SHEET2 = crypto.randomUUID();

const item = (n, subject, answerIndex) => ({
    n, id: `${RUN}-q${n}`, subject, subtopic: 'Circuits', difficulty: 0.4, type: null,
    text: `Q${n}: $V = IR$`, options: ['10 V', '20 V', '30 V', '40 V'], answer: '', answerIndex, explanation: null, figure: false,
});
const ITEMS = [item(1, 'Mathematics', 0), item(2, 'ESAS', 1), item(3, 'EE', 2), item(4, 'EE', 3)];
const SECTIONS = [
    { subject: 'Mathematics', title: 'Mathematics', from: 1, to: 1 },
    { subject: 'ESAS', title: 'Engineering Sciences and Allied Subjects', from: 2, to: 2 },
    { subject: 'EE', title: 'Electrical Engineering Professional Subjects', from: 3, to: 4 },
];
const body = {
    id: SET, contentId: 'abc123', label: 'SET C', title: 'Mixed Paper: Mathematics, ESAS and EE', code: 'BLENDED',
    profile: 'prc_blended', sittingKey: `${RUN}-key`, generatedAt: new Date().toISOString(),
    config: { mode: 'blended', isPrcStandard: true, count: 100 },
    plan: {
        kind: 'blended', profile: 'prc_blended', code: 'BLENDED', title: 'Mixed Paper: Mathematics, ESAS and EE', topic: null,
        sections: SECTIONS.map((s) => ({ subject: s.subject, title: s.title, count: s.to - s.from + 1, subtopic: 'All' })),
        cognitiveFocus: 'mixed', totalCount: 4, timeAllotmentMins: 300,
    },
    sections: SECTIONS,
    items: ITEMS,
    prefs: { paper: 'letter', docs: { paper: true, sheet: true, key: true }, solutions: true },
};

function makeApp() {
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/user', require('../../src/routes/printedSetRoutes'));
    return app;
}

beforeAll(async () => {
    await prisma.user.createMany({ data: [{ id: A, email: `${A}@example.test` }, { id: B, email: `${B}@example.test` }] });
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.$disconnect();
});

describe('printed sets', () => {
    it('saves a set, scores its sheets, re-scores them when the key changes, and deletes them with it', async () => {
        const app = makeApp();
        const created = await request(app).post('/api/user/printed-sets').set(as(A)).send(body);
        expect(created.status).toBe(201);
        expect(created.body.item).toMatchObject({ id: SET, itemCount: 4, edits: {}, warnings: null, printedAt: null, _count: { sheets: 0 } });
        expect(created.body.item.keyVersion).toBe(keyVersionOf(effectiveItems(ITEMS, {})));
        // A replay past the idempotency record is the same set; another account can't take the code.
        expect((await request(app).post('/api/user/printed-sets').set(as(A)).send(body)).status).toBe(200);
        expect((await request(app).post('/api/user/printed-sets').set(as(B)).send(body)).status).toBe(400);

        const sheet = (id, over) => ({ id, takerName: 'Juan', isSelf: false, answers: 'ABCD', scannedAt: new Date().toISOString(), ...over });
        let res = await request(app).post(`/api/user/printed-sets/${SET}/sheets`).set(as(A)).send(sheet(SHEET1, { review: { corrected: [2], unsure: [] } }));
        expect(res.status).toBe(201);
        expect(res.body.item).toMatchObject({ correct: 4, scored: 4, generalAverage: 100, verdict: 'PASSED', review: { corrected: [2], unsure: [] } });
        res = await request(app).post(`/api/user/printed-sets/${SET}/sheets`).set(as(A)).send(sheet(SHEET2, { takerName: 'Maria', answers: 'CBCD' }));
        expect(res.body.item).toMatchObject({ correct: 3, scored: 4 });
        expect((await request(app).post(`/api/user/printed-sets/${SET}/sheets`).set(as(B)).send(sheet(crypto.randomUUID()))).status).toBe(404);

        const list = await request(app).get('/api/user/printed-sets').set(as(A));
        expect(list.body.items.find((s) => s.id === SET)).toMatchObject({ edited: false, _count: { sheets: 2 } });
        expect((await request(app).get('/api/user/printed-sets').set(as(B))).body.items).toEqual([]);

        // Item 1's key becomes C: Juan drops to 3, Maria rises to 4.
        res = await request(app).patch(`/api/user/printed-sets/${SET}`).set(as(A)).send({ edits: { 1: { answerIndex: 2 } }, printed: true });
        expect(res.status).toBe(200);
        expect(res.body.rescored).toBe(2);
        const keyVersion = keyVersionOf(effectiveItems(ITEMS, { 1: { answerIndex: 2 } }));
        expect(res.body.item).toMatchObject({ keyVersion, edits: { 1: { answerIndex: 2 } }, printedAt: expect.any(String) });
        const sheets = await request(app).get(`/api/user/printed-sets/${SET}/sheets`).set(as(A));
        const byId = Object.fromEntries(sheets.body.items.map((s) => [s.id, s]));
        expect(byId[SHEET1]).toMatchObject({ correct: 3, keyVersion, sectionScores: [{ subject: 'Mathematics', correct: 0, total: 1, percent: 0 }, expect.anything(), expect.anything()] });
        expect(byId[SHEET2]).toMatchObject({ correct: 4, keyVersion, verdict: 'PASSED' });
        expect((await request(app).patch(`/api/user/printed-sets/${SET}`).set(as(B)).send({ printed: true })).status).toBe(404);

        // Correct a sheet and clear its review (a nullable Json column).
        res = await request(app).patch(`/api/user/printed-sets/${SET}/sheets/${SHEET1}`).set(as(A)).send({ answers: 'CBCD', review: null });
        expect(res.status).toBe(200);
        expect(res.body.item).toMatchObject({ correct: 4, review: null });

        expect((await request(app).delete(`/api/user/printed-sets/${SET}`).set(as(B))).body.deleted).toBe(0);
        expect((await request(app).delete(`/api/user/printed-sets/${SET}`).set(as(A))).body.deleted).toBe(1);
        expect(await prisma.scannedSheet.count({ where: { setId: SET } })).toBe(0);
    });

    it('edits sent at once to two items both land; a set replaced only while unused', async () => {
        const app = makeApp();
        const id = Array.from({ length: 12 }, (_, i) => PRINT_ID_ALPHABET[(Date.now() + i * 11 + 5) % 32]).join('');
        const setUrl = `/api/user/printed-sets/${id}`;
        expect((await request(app).post('/api/user/printed-sets').set(as(A)).send({ ...body, id })).status).toBe(201);

        // Unused: Draw a new set's delete removes it.
        expect((await request(app).delete(`${setUrl}?ifUnused=1`).set(as(A))).body.deleted).toBe(1);
        expect((await request(app).post('/api/user/printed-sets').set(as(A)).send({ ...body, id })).status).toBe(201);

        // Two edits in flight together (row-locked, so neither merges over the other).
        const [one, two] = await Promise.all([
            request(app).patch(setUrl).set(as(A)).send({ edits: { 1: { text: 'First, reworded' } } }),
            request(app).patch(setUrl).set(as(A)).send({ edits: { 3: { text: 'Third, reworded' } } }),
        ]);
        expect([one.status, two.status]).toEqual([200, 200]);
        const stored = await prisma.printedSet.findFirst({ where: { id, userId: A } });
        expect(Object.keys(stored.edits).sort()).toEqual(['1', '3']);

        // Edited, printed elsewhere, or scanned: kept.
        expect((await request(app).delete(`${setUrl}?ifUnused=1`).set(as(A))).body.deleted).toBe(0);
        await request(app).patch(setUrl).set(as(A)).send({ edits: { 1: null, 3: null } });
        await request(app).patch(setUrl).set(as(A)).send({ printed: true });
        expect((await request(app).delete(`${setUrl}?ifUnused=1`).set(as(A))).body.deleted).toBe(0);
        await prisma.printedSet.update({ where: { id }, data: { printedAt: null } });
        const sheet = { id: crypto.randomUUID(), takerName: 'Ana', isSelf: false, answers: 'ABCD', scannedAt: new Date().toISOString() };
        expect((await request(app).post(`${setUrl}/sheets`).set(as(A)).send(sheet)).status).toBe(201);
        expect((await request(app).delete(`${setUrl}?ifUnused=1`).set(as(A))).body.deleted).toBe(0);
        expect(await prisma.printedSet.count({ where: { id } })).toBe(1);

        expect((await request(app).delete(setUrl).set(as(A))).body.deleted).toBe(1);
    });
});
