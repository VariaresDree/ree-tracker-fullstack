import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// /api/user/printed-sets: printed paper sets and their scanned answer sheets.
// Same identity/Prisma pattern as outsideScoreRoutes.test.js, over a small
// in-memory stand-in for the two tables (installed as spies on the real
// client), so a PATCH can be followed through to the sheets it re-scores.
// Every query is checked for the caller's id in its where.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { Prisma } = require('@prisma/client');
const { PAPER_SET_LIMITS, effectiveItems, keyVersionOf, scorePaperSheet } = require('@ree/shared');

const UID = 'uid-paper';
const OTHER = 'uid-other';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const SET = 'K7P29QXAM3TD';
const SHEET = '0f8b7c1e-9a3d-4e2f-8b6a-1c2d3e4f5a6b';
const SHEET2 = '1a2b3c4d-1111-4222-8333-944455566677';
const OUTSIDE = '2b3c4d5e-2222-4333-8444-a55566677788';

const OPTS = ['10 V', '20 V', '30 V', '40 V'];
const item = (n, subject, answerIndex, options = OPTS) => ({
    n, id: `q${n}`, subject, subtopic: 'Circuits', difficulty: 0.4, type: 'computation',
    text: `Q${n}: find $V$ when $I = ${n}$ A.`, options, answer: options[answerIndex] ?? 'x', answerIndex,
    answerLetter: answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : '-',
    explanation: `Why ${n}: $V = IR$.`, figure: false,
});
const ITEMS = [item(1, 'Mathematics', 0), item(2, 'Mathematics', 1), item(3, 'ESAS', 2), item(4, 'ESAS', 3), item(5, 'EE', 0), item(6, 'EE', 1)];
const SECTIONS = [
    { subject: 'Mathematics', title: 'Mathematics', from: 1, to: 2, requested: 2, drawn: 2 },
    { subject: 'ESAS', title: 'Engineering Sciences and Allied Subjects', from: 3, to: 4, requested: 2, drawn: 2 },
    { subject: 'EE', title: 'Electrical Engineering Professional Subjects', from: 5, to: 6, requested: 2, drawn: 2 },
];
const PREFS = { paper: 'a4', docs: { paper: true, sheet: true, key: true }, solutions: true };

const setBody = (over = {}) => ({
    id: SET,
    contentId: '1x2y3z',
    keyVersion: 'client-made', // ignored: the server computes it
    label: 'SET B',
    title: 'Mixed Paper: Mathematics, ESAS and EE',
    code: 'BLENDED',
    profile: 'prc_blended',
    sittingKey: '6f1d2c3b-aaaa-4bbb-8ccc-0123456789ab',
    generatedAt: '2026-10-21T02:00:00.000Z',
    config: { mode: 'blended', subject: 'blended', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed', retakeQuestions: [{ id: 'x' }] },
    plan: {
        kind: 'blended', profile: 'prc_blended', code: 'BLENDED', title: 'Mixed Paper: Mathematics, ESAS and EE', topic: null,
        sections: SECTIONS.map((s) => ({ subject: s.subject, title: s.title, count: 2, subtopic: 'All' })),
        cognitiveFocus: 'mixed', totalCount: 6, timeAllotmentMins: 300,
    },
    sections: SECTIONS,
    items: ITEMS,
    edits: {},
    prefs: PREFS,
    warnings: { unmatched: [], shortfall: [], focusFallback: false },
    ...over,
});

// --- the in-memory tables ----------------------------------------------------

const p2002 = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
const p2025 = () => Object.assign(new Error('Record not found'), { code: 'P2025' });
const clone = (v) => (v == null ? v : structuredClone(v));
const matches = (row, where = {}) => Object.entries(where).every(([k, v]) => (
    v && typeof v === 'object' && 'in' in v ? v.in.includes(row[k]) : row[k] === v));
const unNull = (data) => Object.fromEntries(Object.entries(data)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => [k, v === Prisma.DbNull ? null : v]));

let db;
function installFakeDb() {
    db = { sets: new Map(), sheets: new Map() };
    const sheetCount = (setId) => [...db.sheets.values()].filter((s) => s.setId === setId).length;
    const shapeSet = (row, args = {}) => {
        let out = clone(row);
        if (args.select) {
            out = Object.fromEntries(Object.keys(args.select).filter((k) => k !== '_count').map((k) => [k, clone(row[k])]));
        }
        if (args.select?._count || args.include?._count) out._count = { sheets: sheetCount(row.id) };
        return out;
    };
    const t = prisma.printedSet;
    vi.spyOn(t, 'findMany').mockImplementation(async (args = {}) => [...db.sets.values()]
        .filter((r) => matches(r, args.where)).sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, args.take ?? Infinity).map((r) => shapeSet(r, args)));
    vi.spyOn(t, 'findFirst').mockImplementation(async (args = {}) => {
        const r = [...db.sets.values()].find((x) => matches(x, args.where));
        return r ? shapeSet(r, args) : null;
    });
    vi.spyOn(t, 'count').mockImplementation(async ({ where }) => [...db.sets.values()].filter((r) => matches(r, where)).length);
    vi.spyOn(t, 'create').mockImplementation(async (args) => {
        if (db.sets.has(args.data.id)) throw p2002();
        const now = new Date();
        db.sets.set(args.data.id, { edits: {}, warnings: null, printedAt: null, createdAt: now, updatedAt: now, ...clone(unNull(args.data)) });
        return shapeSet(db.sets.get(args.data.id), args);
    });
    vi.spyOn(t, 'update').mockImplementation(async (args) => {
        const r = [...db.sets.values()].find((x) => matches(x, args.where));
        if (!r) throw p2025();
        Object.assign(r, clone(unNull(args.data)), { updatedAt: new Date() });
        return shapeSet(r, args);
    });
    vi.spyOn(t, 'deleteMany').mockImplementation(async ({ where }) => {
        let count = 0;
        for (const [id, r] of db.sets) {
            if (!matches(r, where)) continue;
            db.sets.delete(id);
            for (const [sid, s] of db.sheets) if (s.setId === id) db.sheets.delete(sid);
            count += 1;
        }
        return { count };
    });

    const s = prisma.scannedSheet;
    const shapeSheet = (row, args = {}) => {
        const out = clone(row);
        if (args.include?.set) {
            const set = db.sets.get(row.setId);
            out.set = Object.fromEntries(Object.keys(args.include.set.select).map((k) => [k, clone(set[k])]));
        }
        return out;
    };
    vi.spyOn(s, 'findMany').mockImplementation(async (args = {}) => [...db.sheets.values()]
        .filter((r) => matches(r, args.where)).sort((a, b) => b.scannedAt - a.scannedAt)
        .slice(0, args.take ?? Infinity).map((r) => shapeSheet(r, args)));
    vi.spyOn(s, 'findFirst').mockImplementation(async (args = {}) => {
        const r = [...db.sheets.values()].find((x) => matches(x, args.where));
        return r ? shapeSheet(r, args) : null;
    });
    vi.spyOn(s, 'count').mockImplementation(async ({ where }) => [...db.sheets.values()].filter((r) => matches(r, where)).length);
    vi.spyOn(s, 'create').mockImplementation(async ({ data }) => {
        if (db.sheets.has(data.id)) throw p2002();
        const now = new Date();
        db.sheets.set(data.id, { review: null, takerName: null, outsideScoreId: null, createdAt: now, updatedAt: now, ...clone(unNull(data)) });
        return clone(db.sheets.get(data.id));
    });
    vi.spyOn(s, 'update').mockImplementation(async ({ where, data }) => {
        const r = [...db.sheets.values()].find((x) => matches(x, where));
        if (!r) throw p2025();
        Object.assign(r, clone(unNull(data)), { updatedAt: new Date() });
        return clone(r);
    });
    vi.spyOn(s, 'updateMany').mockImplementation(async ({ where, data }) => {
        const rows = [...db.sheets.values()].filter((r) => matches(r, where));
        rows.forEach((r) => Object.assign(r, clone(unNull(data))));
        return { count: rows.length };
    });
    vi.spyOn(s, 'deleteMany').mockImplementation(async ({ where }) => {
        let count = 0;
        for (const [id, r] of db.sheets) if (matches(r, where)) { db.sheets.delete(id); count += 1; }
        return { count };
    });
    vi.spyOn(prisma, '$transaction').mockImplementation(async (fn) => fn(prisma));
    // The row lock (SELECT ... FOR UPDATE): nothing to lock in memory.
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([]);
}

// Every call the routes made on these tables named the caller in its where.
function expectAllScopedTo(uid) {
    const calls = [];
    for (const model of [prisma.printedSet, prisma.scannedSheet]) {
        for (const m of ['findMany', 'findFirst', 'count', 'update', 'updateMany', 'deleteMany']) {
            for (const [args] of model[m].mock?.calls || []) calls.push(args?.where?.userId);
        }
    }
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every((u) => u === uid)).toBe(true);
}

function makeApp() {
    delete require.cache[require.resolve('../src/routes/printedSetRoutes')];
    const routes = require('../src/routes/printedSetRoutes');
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    app.use('/api/user', routes);
    return app;
}

const seedSet = (over = {}) => {
    const b = setBody(over);
    const now = new Date();
    const row = {
        id: b.id, userId: UID, contentId: b.contentId, label: b.label, title: b.title, code: b.code, profile: b.profile,
        itemCount: b.items.length, config: {}, plan: b.plan, sections: b.sections, items: b.items, edits: b.edits, prefs: b.prefs,
        warnings: null, sittingKey: b.sittingKey, generatedAt: new Date(b.generatedAt), printedAt: null, createdAt: now, updatedAt: now,
        keyVersion: keyVersionOf(effectiveItems(b.items, b.edits)),
        ...over,
    };
    db.sets.set(row.id, row);
    return row;
};
const seedSheet = (over = {}) => {
    const set = db.sets.get(over.setId || SET);
    const answers = over.answers || 'ABCDAB';
    const r = scorePaperSheet({ items: effectiveItems(set.items, set.edits), sections: set.sections, profile: set.profile }, answers);
    const row = {
        id: SHEET, userId: UID, setId: SET, takerName: 'Juan Dela Cruz', isSelf: false, answers, keyVersion: set.keyVersion,
        correct: r.correct, scored: r.scored, sectionScores: r.sections, generalAverage: r.generalAverage, verdict: r.verdict,
        review: null, outsideScoreId: null, scannedAt: new Date('2026-10-21T03:00:00Z'), createdAt: new Date(), updatedAt: new Date(),
        ...over,
    };
    db.sheets.set(row.id, row);
    return row;
};

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockImplementation(async ({ where }) => ({ id: where.id }));
    installFakeDb();
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ── sets ────────────────────────────────────────────────────────────────────

describe('GET /printed-sets', () => {
    it('lists the caller’s sets, newest first, as summaries with sheet and edit counts', async () => {
        seedSet({ edits: { 2: { text: 'Edited' } } });
        seedSet({ id: 'ABCD1234EFGH', userId: OTHER });
        seedSheet();
        const res = await request(makeApp()).get('/api/user/printed-sets').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        const [s] = res.body.items;
        expect(s).toMatchObject({ id: SET, label: 'SET B', itemCount: 6, printedAt: null, edited: true, _count: { sheets: 1 } });
        for (const heavy of ['items', 'edits', 'config', 'plan', 'warnings', 'userId']) expect(s).not.toHaveProperty(heavy);
        expect(prisma.printedSet.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: UID }, orderBy: { createdAt: 'desc' }, take: PAPER_SET_LIMITS.perUser,
        }));
    });

    it('needs a signed-in caller', async () => {
        expect((await request(makeApp()).get('/api/user/printed-sets')).status).toBe(401);
    });
});

describe('GET /printed-sets/:id', () => {
    it('returns the caller’s whole set with its sheet count, and 404s for anyone else’s', async () => {
        seedSet();
        let res = await request(makeApp()).get(`/api/user/printed-sets/${SET}`).set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.item).toMatchObject({ id: SET, items: ITEMS, edits: {}, prefs: PREFS, _count: { sheets: 0 } });
        expect(res.body.item).not.toHaveProperty('userId');

        res = await request(makeApp()).get(`/api/user/printed-sets/${SET}`).set(as(OTHER));
        expect(res.status).toBe(404);
        expect(prisma.printedSet.findFirst.mock.calls[1][0].where).toEqual({ id: SET, userId: OTHER });
    });
});

describe('POST /printed-sets', () => {
    const post = (body, uid = UID) => request(makeApp()).post('/api/user/printed-sets').set(as(uid)).send(body);

    it('stores the set for the caller with the server’s key version and item count', async () => {
        const res = await post(setBody({ edits: { 3: { answerIndex: 0 } } }));
        expect(res.status).toBe(201);
        const expected = keyVersionOf(effectiveItems(ITEMS, { 3: { answerIndex: 0 } }));
        expect(res.body.item).toMatchObject({ id: SET, keyVersion: expected, itemCount: 6, edits: { 3: { answerIndex: 0 } }, _count: { sheets: 0 } });
        expect(expected).not.toBe(keyVersionOf(effectiveItems(ITEMS, {})));
        const { data } = prisma.printedSet.create.mock.calls[0][0];
        expect(data).toMatchObject({ userId: UID, generatedAt: new Date('2026-10-21T02:00:00.000Z') });
        // Only the setup keys are kept; the derived answerLetter is not stored.
        expect(data.config).toEqual({ mode: 'blended', subject: 'blended', isPrcStandard: true, count: 100, source: 'library', cognitiveFocus: 'mixed' });
        expect(data.items[0]).not.toHaveProperty('answerLetter');
        expect(res.body.item).not.toHaveProperty('userId');
    });

    it('defaults the edits to none and drops a config field of the wrong type instead of refusing', async () => {
        const { edits: _e, warnings: _w, ...body } = setBody({ config: { mode: 'blended', count: 'lots' } });
        const res = await post(body);
        expect(res.status).toBe(201);
        expect(prisma.printedSet.create.mock.calls[0][0].data).toMatchObject({ edits: {}, config: { mode: 'blended' } });
    });

    it.each([
        ['an id that isn’t 12 Crockford characters', { id: 'K7P29QXAM3TU' }, 'id'],
        ['a lower-case id', { id: 'k7p29qxam3td' }, 'id'],
        ['an unknown profile', { profile: 'board' }, 'profile'],
        ['no items', { items: [] }, 'items'],
        ['items out of order', { items: [ITEMS[1], ITEMS[0], ...ITEMS.slice(2)] }, 'items'],
        ['a key past the options', { items: [{ ...ITEMS[0], answerIndex: 3, options: ['a', 'b', 'c'] }, ...ITEMS.slice(1)] }, 'items'],
        ['seven options', { items: [{ ...ITEMS[0], options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, ...ITEMS.slice(1)] }, 'items'],
        ['an unknown subject', { items: [{ ...ITEMS[0], subject: 'Physics' }, ...ITEMS.slice(1)] }, 'items'],
        ['a stem over the cap', { items: [{ ...ITEMS[0], text: 'x'.repeat(PAPER_SET_LIMITS.stem + 1) }, ...ITEMS.slice(1)] }, 'items'],
        ['parts with a gap', { sections: [{ ...SECTIONS[0] }, { ...SECTIONS[1], from: 4 }, SECTIONS[2]] }, 'sections'],
        ['parts that stop short', { sections: SECTIONS.slice(0, 2) }, 'sections'],
        ['a part holding another subject', { sections: [{ ...SECTIONS[0], to: 3 }, { ...SECTIONS[1], from: 4 }, SECTIONS[2]] }, 'sections'],
        ['four parts', { sections: [...SECTIONS, SECTIONS[2]] }, 'sections'],
        ['an edit of an item past the last', { edits: { 7: { text: 'New' } } }, 'edits'],
        ['an edit with two equal options', { edits: { 1: { options: ['a', 'A '], answerIndex: 0 } } }, 'edits'],
        ['new options without the answer', { edits: { 1: { options: ['a', 'b'] } } }, 'edits'],
        ['an answer the item doesn’t have', { edits: { 1: { answerIndex: 5 } } }, 'edits'],
        ['bad print preferences', { prefs: { ...PREFS, paper: 'a3' } }, 'prefs'],
    ])('rejects %s', async (_label, over, field) => {
        const res = await post(setBody(over));
        expect(res.status).toBe(400);
        expect(res.body.details).toHaveProperty(field);
        expect(prisma.printedSet.create).not.toHaveBeenCalled();
    });

    it('caps the items at 150 and the whole set at a megabyte', async () => {
        const many = Array.from({ length: PAPER_SET_LIMITS.items + 1 }, (_, i) => item(i + 1, 'EE', 0));
        let res = await post(setBody({ items: many, sections: [{ ...SECTIONS[2], from: 1, to: many.length }] }));
        expect(res.status).toBe(400);

        // 150 items whose explanations add up past 1 MB, each one under its own cap.
        const big = Array.from({ length: PAPER_SET_LIMITS.items }, (_, i) => ({ ...item(i + 1, 'EE', 0), explanation: 'y'.repeat(7000) }));
        res = await post(setBody({ items: big, sections: [{ ...SECTIONS[2], from: 1, to: big.length }] }));
        expect(res.status).toBe(400);
        expect(res.body.details.items.join(' ')).toMatch(/too large/);
        expect(prisma.printedSet.create).not.toHaveBeenCalled();
    });

    it('stops at the per-account cap, but a replay of a set already saved is still that set', async () => {
        prisma.printedSet.count.mockResolvedValue(PAPER_SET_LIMITS.perUser);
        let res = await post(setBody());
        expect(res.status).toBe(400);
        expect(prisma.printedSet.create).not.toHaveBeenCalled();

        seedSet();
        res = await post(setBody());
        expect(res.status).toBe(200);
        expect(res.body.item.id).toBe(SET);
    });

    it('a replay of the caller’s own set answers with the row; someone else’s code is a 400, never a 409', async () => {
        expect((await post(setBody())).status).toBe(201);
        let res = await post(setBody());
        expect(res.status).toBe(200);
        expect(res.body.item.id).toBe(SET);

        res = await post(setBody(), OTHER);
        expect(res.status).toBe(400);
        expect(db.sets.get(SET).userId).toBe(UID);
    });

    it('needs a signed-in caller', async () => {
        expect((await request(makeApp()).post('/api/user/printed-sets').send(setBody())).status).toBe(401);
    });
});

describe('PATCH /printed-sets/:id', () => {
    const patch = (body, uid = UID) => request(makeApp()).patch(`/api/user/printed-sets/${SET}`).set(as(uid)).send(body);

    it('404s for a set that isn’t the caller’s, and changes nothing', async () => {
        seedSet();
        const res = await patch({ printed: true }, OTHER);
        expect(res.status).toBe(404);
        expect(prisma.printedSet.update).not.toHaveBeenCalled();
        expect(prisma.printedSet.findFirst.mock.calls[0][0].where).toEqual({ id: SET, userId: OTHER });
    });

    it('locks the caller’s set row before reading it, so two changes apply one after the other', async () => {
        seedSet();
        const res = await patch({ edits: { 1: { text: 'Locked wording' } } });
        expect(res.status).toBe(200);
        const [sql, ...params] = prisma.$queryRaw.mock.calls[0];
        expect(sql.join('?')).toMatch(/FROM "PrintedSet" WHERE "id" = \? AND "userId" = \? FOR UPDATE$/);
        expect(params).toEqual([SET, UID]);
        expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(prisma.printedSet.findFirst.mock.invocationCallOrder[0]);
    });

    it('merges edits per item: a new edit replaces that item’s whole, null reverts it, the rest stay', async () => {
        seedSet({ edits: { 1: { text: 'First wording' }, 2: { text: 'Second', explanation: null } } });
        const res = await patch({ edits: { 1: null, 2: { text: 'Second, again' }, 4: { explanation: 'New solution' } } });
        expect(res.status).toBe(200);
        expect(res.body.item.edits).toEqual({ 2: { text: 'Second, again' }, 4: { explanation: 'New solution' } });
        expect(db.sets.get(SET).edits).toEqual(res.body.item.edits);
        expect(prisma.printedSet.update.mock.calls[0][0].where).toEqual({ id: SET, userId: UID });
    });

    it('an empty edit reverts the item too', async () => {
        seedSet({ edits: { 1: { text: 'First wording' } } });
        const res = await patch({ edits: { 1: {} } });
        expect(res.status).toBe(200);
        expect(res.body.item.edits).toEqual({});
    });

    it('replaces the print preferences and sets printedAt once', async () => {
        seedSet();
        const prefs = { paper: 'long', docs: { paper: false, sheet: true, key: false }, solutions: false };
        let res = await patch({ prefs, printed: true });
        expect(res.status).toBe(200);
        expect(res.body.item.prefs).toEqual(prefs);
        const first = res.body.item.printedAt;
        expect(first).toEqual(expect.any(String));

        await new Promise((r) => setTimeout(r, 5));
        res = await patch({ printed: true });
        expect(res.body.item.printedAt).toBe(first);
        expect(prisma.printedSet.update.mock.calls[1][0].data).not.toHaveProperty('printedAt');
    });

    it('a reworded item keeps the key: no sheet is touched', async () => {
        seedSet();
        seedSheet();
        const before = db.sets.get(SET).keyVersion;
        const res = await patch({ edits: { 1: { text: 'Reworded, same answer' } } });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ rescored: 0, item: { keyVersion: before } });
        expect(prisma.scannedSheet.findMany).not.toHaveBeenCalled();
    });

    it('a changed answer gets a new key version and every sheet of the set is scored again', async () => {
        seedSet();
        seedSheet({ answers: 'ABCDAB' }); // all right: 6/6
        seedSheet({ id: SHEET2, answers: 'CBCDAB', takerName: 'Maria Clara' }); // item 1 wrong: 5/6
        expect(db.sheets.get(SHEET).correct).toBe(6);

        const res = await patch({ edits: { 1: { answerIndex: 2 } } }); // the key for item 1 is now C
        expect(res.status).toBe(200);
        const keyVersion = keyVersionOf(effectiveItems(ITEMS, { 1: { answerIndex: 2 } }));
        expect(res.body).toMatchObject({ rescored: 2, item: { keyVersion } });

        const [a, b] = [db.sheets.get(SHEET), db.sheets.get(SHEET2)];
        expect(a).toMatchObject({ correct: 5, scored: 6, keyVersion });
        expect(b).toMatchObject({ correct: 6, scored: 6, keyVersion });
        expect(a.sectionScores[0]).toEqual({ subject: 'Mathematics', correct: 1, total: 2, percent: 50 });
        expect(b.verdict).toBe('PASSED');
        expectAllScopedTo(UID);
    });

    it('new options with the answer moved to another letter score the sheets again', async () => {
        seedSet();
        seedSheet({ answers: 'ABCDAB' });
        const res = await patch({ edits: { 6: { options: ['1 A', '2 A', '3 A'], answerIndex: 2 } } });
        expect(res.status).toBe(200);
        expect(res.body.rescored).toBe(1);
        expect(db.sheets.get(SHEET)).toMatchObject({ correct: 5, scored: 6 });
    });

    it.each([
        ['nothing to change', {}],
        ['an item past the last', { edits: { 7: { text: 'x' } } }],
        ['an answer the item doesn’t have', { edits: { 2: { answerIndex: 4 } } }],
        ['a blank question', { edits: { 2: { text: '   ' } } }],
        ['printed: false', { printed: false }],
    ])('refuses %s', async (_label, body) => {
        seedSet();
        const res = await patch(body);
        expect(res.status).toBe(400);
        expect(prisma.printedSet.update).not.toHaveBeenCalled();
    });

    it('refuses edits that would take the set past a megabyte', async () => {
        const items = Array.from({ length: 70 }, (_, i) => item(i + 1, 'EE', 0));
        seedSet({ items, itemCount: 70, sections: [{ ...SECTIONS[2], from: 1, to: 70 }] });
        const edits = Object.fromEntries(items.map((it) => [it.n, { explanation: 'z'.repeat(PAPER_SET_LIMITS.explanation) }]));
        const res = await patch({ edits });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/too large/);
        expect(prisma.printedSet.update).not.toHaveBeenCalled();
    });
});

describe('DELETE /printed-sets/:id', () => {
    it('deletes only the caller’s set, with its sheets, and answers 200 even when it was already gone', async () => {
        seedSet();
        seedSheet();
        let res = await request(makeApp()).delete(`/api/user/printed-sets/${SET}`).set(as(OTHER));
        expect(res.body).toEqual({ success: true, deleted: 0 });
        expect(db.sets.has(SET)).toBe(true);

        res = await request(makeApp()).delete(`/api/user/printed-sets/${SET}`).set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, deleted: 1 });
        expect(prisma.printedSet.deleteMany).toHaveBeenLastCalledWith({ where: { id: SET, userId: UID } });
        expect(db.sheets.size).toBe(0);
    });

    // Draw a new set replaces the set on screen only while nothing has
    // happened to it, whatever the asking device's copy says.
    const ifUnused = (uid = UID) => request(makeApp()).delete(`/api/user/printed-sets/${SET}?ifUnused=1`).set(as(uid));

    it('?ifUnused=1 deletes a set never printed, edited or scanned', async () => {
        seedSet();
        let res = await ifUnused(OTHER);
        expect(res.body).toEqual({ success: true, deleted: 0 });
        expect(db.sets.has(SET)).toBe(true);
        res = await ifUnused();
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, deleted: 1 });
        expect(db.sets.has(SET)).toBe(false);
        expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it.each([
        ['printed', () => seedSet({ printedAt: new Date() })],
        ['edited', () => seedSet({ edits: { 2: { text: 'Reworded' } } })],
        ['scanned', () => { seedSet(); seedSheet(); }],
    ])('?ifUnused=1 keeps a set that was %s, and still answers 200', async (_, seed) => {
        seed();
        const res = await ifUnused();
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ success: true, deleted: 0 });
        expect(db.sets.has(SET)).toBe(true);
        expect(prisma.printedSet.deleteMany).not.toHaveBeenCalled();
    });
});

// ── sheets ──────────────────────────────────────────────────────────────────

const sheetBody = (over = {}) => ({
    id: SHEET, takerName: '  Juan Dela Cruz ', isSelf: false, answers: 'ABCD*-', scannedAt: '2026-10-21T03:00:00.000Z',
    review: { corrected: [5], unsure: [6] }, ...over,
});

describe('GET /printed-sets/:id/sheets', () => {
    it('lists the set’s sheets for its owner, and 404s for anyone else', async () => {
        seedSet();
        seedSheet();
        let res = await request(makeApp()).get(`/api/user/printed-sets/${SET}/sheets`).set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0]).toMatchObject({ id: SHEET, takerName: 'Juan Dela Cruz', answers: 'ABCDAB', correct: 6 });
        expect(res.body.items[0]).not.toHaveProperty('userId');
        expect(prisma.scannedSheet.findMany.mock.calls[0][0]).toMatchObject({ where: { setId: SET, userId: UID }, take: PAPER_SET_LIMITS.sheetsPerSet });

        res = await request(makeApp()).get(`/api/user/printed-sets/${SET}/sheets`).set(as(OTHER));
        expect(res.status).toBe(404);
        expect(prisma.scannedSheet.findMany).toHaveBeenCalledTimes(1);
    });
});

describe('POST /printed-sets/:id/sheets', () => {
    const post = (body, uid = UID) => request(makeApp()).post(`/api/user/printed-sets/${SET}/sheets`).set(as(uid)).send(body);

    it('scores the sheet on the server, against the edited key, ignoring any score sent', async () => {
        seedSet({ edits: { 4: { answerIndex: 0 } } }); // item 4's key is now A
        const res = await post(sheetBody({ answers: 'ABCA*-', correct: 999, scored: 999, verdict: 'PASSED', keyVersion: 'x' }));
        expect(res.status).toBe(201);
        const keyVersion = db.sets.get(SET).keyVersion;
        expect(res.body.item).toMatchObject({
            id: SHEET, setId: SET, takerName: 'Juan Dela Cruz', isSelf: false, answers: 'ABCA*-', keyVersion,
            correct: 4, scored: 6, generalAverage: expect.any(Number), verdict: 'FAILED',
            review: { corrected: [5], unsure: [6] }, outsideScoreId: null,
        });
        expect(res.body.item.sectionScores).toEqual([
            { subject: 'Mathematics', correct: 2, total: 2, percent: 100 },
            { subject: 'ESAS', correct: 2, total: 2, percent: 100 },
            { subject: 'EE', correct: 0, total: 2, percent: 0 },
        ]);
        expect(res.body.item).not.toHaveProperty('userId');
        expect(prisma.scannedSheet.create.mock.calls[0][0].data).toMatchObject({ userId: UID, scannedAt: new Date('2026-10-21T03:00:00.000Z') });
    });

    it('404s for a set that isn’t the caller’s', async () => {
        seedSet();
        const res = await post(sheetBody(), OTHER);
        expect(res.status).toBe(404);
        expect(prisma.scannedSheet.create).not.toHaveBeenCalled();
    });

    it('needs one answer per item', async () => {
        seedSet();
        for (const answers of ['ABCDA', 'ABCDABA']) {
            const res = await post(sheetBody({ answers }));
            expect(res.status).toBe(400);
            expect(res.body.details).toHaveProperty('answers');
        }
        expect((await post(sheetBody({ answers: 'ABCDAG' }))).status).toBe(400); // no G
        expect((await post(sheetBody({ answers: 'abcdab' }))).status).toBe(400);
        expect(prisma.scannedSheet.create).not.toHaveBeenCalled();
    });

    it('a taker’s sheet needs a name; the learner’s own doesn’t', async () => {
        seedSet();
        let res = await post(sheetBody({ takerName: '   ' }));
        expect(res.status).toBe(400);
        expect(res.body.details).toHaveProperty('takerName');
        res = await post(sheetBody({ takerName: null, isSelf: true, outsideScoreId: OUTSIDE }));
        expect(res.status).toBe(201);
        expect(res.body.item).toMatchObject({ isSelf: true, takerName: null, outsideScoreId: OUTSIDE });
    });

    it('caps the sheets per set', async () => {
        seedSet();
        prisma.scannedSheet.count.mockResolvedValue(PAPER_SET_LIMITS.sheetsPerSet);
        const res = await post(sheetBody());
        expect(res.status).toBe(400);
        expect(prisma.scannedSheet.count.mock.calls[0][0].where).toEqual({ setId: SET, userId: UID });
        expect(prisma.scannedSheet.create).not.toHaveBeenCalled();
    });

    it('a replay of the same sheet id returns the sheet as first saved', async () => {
        seedSet();
        expect((await post(sheetBody())).status).toBe(201);
        const res = await post(sheetBody({ takerName: 'Someone else' }));
        expect(res.status).toBe(200);
        expect(res.body.item.takerName).toBe('Juan Dela Cruz');
        expect(db.sheets.size).toBe(1);
    });

    it('answers a replayed Idempotency-Key from the first response without saving twice', async () => {
        seedSet();
        const records = new Map();
        vi.spyOn(prisma.idempotencyRecord, 'create').mockImplementation(async ({ data }) => {
            if (records.has(data.key)) throw p2002();
            records.set(data.key, { ...data, createdAt: new Date(), updatedAt: new Date() });
            return records.get(data.key);
        });
        vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockImplementation(async ({ where }) => records.get(where.key) || null);
        vi.spyOn(prisma.idempotencyRecord, 'update').mockImplementation(async ({ where, data }) => {
            records.set(where.key, { ...records.get(where.key), ...data });
            return records.get(where.key);
        });
        vi.spyOn(prisma.idempotencyRecord, 'deleteMany').mockResolvedValue({ count: 0 });
        const app = makeApp();
        const send = () => request(app).post(`/api/user/printed-sets/${SET}/sheets`).set(as(UID)).set('Idempotency-Key', 'c-sheet1').send(sheetBody());
        const first = await send();
        const replay = await send();
        expect(first.status).toBe(201);
        expect(replay.status).toBe(201);
        expect(replay.headers['idempotency-replay']).toBe('true');
        expect(replay.body).toEqual(first.body);
        expect(prisma.scannedSheet.create).toHaveBeenCalledTimes(1);
    });
});

describe('PATCH /printed-sets/:id/sheets/:sheetId', () => {
    const patch = (body, uid = UID, sheetId = SHEET) => request(makeApp())
        .patch(`/api/user/printed-sets/${SET}/sheets/${sheetId}`).set(as(uid)).send(body);

    it('corrects the answers and renames, scored again against the set’s current key', async () => {
        seedSet();
        seedSheet({ answers: 'ABCDAB' });
        db.sets.get(SET).edits = { 2: { answerIndex: 0 } }; // the key moved since the sheet was scored
        db.sets.get(SET).keyVersion = keyVersionOf(effectiveItems(ITEMS, db.sets.get(SET).edits));
        const res = await patch({ answers: 'AACD-B', takerName: ' Juana ', review: { corrected: [5], unsure: [] } });
        expect(res.status).toBe(200);
        expect(res.body.item).toMatchObject({
            takerName: 'Juana', answers: 'AACD-B', correct: 5, scored: 6, keyVersion: db.sets.get(SET).keyVersion,
            review: { corrected: [5], unsure: [] },
        });
        expectAllScopedTo(UID);
    });

    it('links the self-check’s history entry, and can clear the review', async () => {
        seedSet();
        seedSheet({ isSelf: true, takerName: null, review: { corrected: [1], unsure: [] } });
        const res = await patch({ outsideScoreId: OUTSIDE, review: null });
        expect(res.status).toBe(200);
        expect(res.body.item).toMatchObject({ outsideScoreId: OUTSIDE, review: null, takerName: null });
        expect(prisma.scannedSheet.update.mock.calls[0][0].data.review).toBe(Prisma.DbNull);
    });

    it('a taker’s sheet keeps a name', async () => {
        seedSet();
        seedSheet();
        const res = await patch({ takerName: '' });
        expect(res.status).toBe(400);
        expect(res.body.details).toHaveProperty('takerName');
        expect(prisma.scannedSheet.update).not.toHaveBeenCalled();
    });

    it('needs one answer per item, and something to change', async () => {
        seedSet();
        seedSheet();
        expect((await patch({ answers: 'ABC' })).status).toBe(400);
        expect((await patch({})).status).toBe(400);
        expect(prisma.scannedSheet.update).not.toHaveBeenCalled();
    });

    it('404s for a sheet that isn’t the caller’s, or isn’t in that set', async () => {
        seedSet();
        seedSheet();
        expect((await patch({ takerName: 'X' }, OTHER)).status).toBe(404);
        expect((await patch({ takerName: 'X' }, UID, SHEET2)).status).toBe(404);
        expect(prisma.scannedSheet.findFirst.mock.calls[0][0].where).toEqual({ id: SHEET, setId: SET, userId: OTHER });
        expect(prisma.scannedSheet.update).not.toHaveBeenCalled();
    });
});

describe('DELETE /printed-sets/:id/sheets/:sheetId', () => {
    it('deletes only the caller’s sheet in that set, and answers 200 when it was already gone', async () => {
        seedSet();
        seedSheet();
        let res = await request(makeApp()).delete(`/api/user/printed-sets/${SET}/sheets/${SHEET}`).set(as(OTHER));
        expect(res.body).toEqual({ success: true, deleted: 0 });
        res = await request(makeApp()).delete(`/api/user/printed-sets/${SET}/sheets/${SHEET}`).set(as(UID));
        expect(res.body).toEqual({ success: true, deleted: 1 });
        expect(prisma.scannedSheet.deleteMany).toHaveBeenLastCalledWith({ where: { id: SHEET, setId: SET, userId: UID } });
        res = await request(makeApp()).delete(`/api/user/printed-sets/${SET}/sheets/${SHEET}`).set(as(UID));
        expect(res.body).toEqual({ success: true, deleted: 0 });
    });
});
