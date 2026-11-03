import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import express from 'express';
import request from 'supertest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const userRoutes = require('../src/routes/userSubtopicRoutes');
const adminRoutes = require('../src/routes/adminSubtopicRoutes');
const configRoutes = require('../src/routes/configRoutes');
const { mergeSubtopics, subtopicProgress, userSubtopicErrors, BOARD_GROUPS, UNITEMIZED, boardItemsFor, boardItemSplit, boardWeightedPick, bankVsBoard } = require('@ree/shared');

const ADMIN = 'uid-admin';
const USER = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

let app;

beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/user', userRoutes);
    app.use('/api/admin/subtopics', adminRoutes);
    app.use('/api/config', configRoutes);
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: USER });
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
    invalidateRole(ADMIN);
    invalidateRole(USER);
});

afterEach(() => vi.restoreAllMocks());

const own = { topicId: 't1', name: 'My subtopic', done: false };

describe('mergeSubtopics', () => {
    const premade = [{ id: 'a', name: 'Functions', sortOrder: 0 }, { id: 'b', name: 'Age Problems', sortOrder: 1 }];
    const names = (rows) => rows.map((r) => r.name);

    it('a learner with no rows follows the suggested list, later edits included', () => {
        expect(names(mergeSubtopics(premade, []))).toEqual(['Functions', 'Age Problems']);
        expect(names(mergeSubtopics([{ ...premade[0], name: 'Relations' }, premade[1], { id: 'c', name: 'New', sortOrder: 2 }], []))).toEqual(['Relations', 'Age Problems', 'New']);
    });

    it('a rename overrides that row only, and says so', () => {
        const rows = mergeSubtopics(premade, [{ id: 'a', subtopicId: 'a', name: 'Mine' }]);
        expect(rows[0]).toMatchObject({ name: 'Mine', suggestedName: 'Functions', renamed: true, own: false });
        expect(rows[1]).toMatchObject({ name: 'Age Problems', renamed: false });
    });

    it('a switched-off row stays listed, and doesn’t count', () => {
        const rows = mergeSubtopics(premade, [{ id: 'a', subtopicId: 'a', hidden: true, done: true }, { id: 'b', subtopicId: 'b', done: true }]);
        expect(rows.map((r) => r.off)).toEqual([true, false]);
        expect(subtopicProgress(rows)).toEqual({ done: 1, total: 1 });
    });

    it('moving a row overrides the order; own rows join the end until moved', () => {
        const rows = mergeSubtopics(premade, [
            { id: 'b', subtopicId: 'b', sortOrder: 0 },
            { id: 'a', subtopicId: 'a', sortOrder: 1 },
            { id: 'x', subtopicId: null, name: 'Own 2', createdAt: '2026-11-02' },
            { id: 'y', subtopicId: null, name: 'Own 1', createdAt: '2026-11-01' },
        ]);
        expect(names(rows)).toEqual(['Age Problems', 'Functions', 'Own 1', 'Own 2']);
        expect(rows[2]).toMatchObject({ own: true, subtopicId: null });
    });

    it('a retired subtopic leaves the list, unless this learner ticked it', () => {
        const retired = [{ id: 'a', name: 'Functions', sortOrder: 0, active: false }];
        expect(mergeSubtopics(retired, [])).toEqual([]);
        expect(mergeSubtopics(retired, [{ id: 'a', subtopicId: 'a', hidden: true }])).toEqual([]);
        expect(names(mergeSubtopics(retired, [{ id: 'a', subtopicId: 'a', done: true }]))).toEqual(['Functions']);
    });

    it('never throws on nothing', () => {
        expect(mergeSubtopics(null, undefined)).toEqual([]);
        expect(subtopicProgress(null)).toEqual({ done: 0, total: 0 });
    });
});

describe('userSubtopicErrors', () => {
    it.each([
        [{ topicId: 't', subtopicId: 's' }, {}],
        [{ topicId: 't', name: 'Mine' }, {}],
        [{ topicId: 't' }, { name: expect.any(String) }],
        [{ name: 'Mine' }, { topicId: expect.any(String) }],
        [{ topicId: 't', name: 'x'.repeat(121) }, { name: expect.any(String) }],
        [{ topicId: 't', name: 'Mine', doneOn: 'soon' }, { doneOn: expect.any(String) }],
        [{ topicId: 't', name: 'Mine', sortOrder: -1 }, { sortOrder: expect.any(String) }],
    ])('%j', (entry, expected) => expect(userSubtopicErrors(entry)).toEqual(expected));
});

describe('board items', () => {
    it.each(Object.keys(BOARD_GROUPS))('%s adds up to PRC’s 100 items', (subject) => {
        expect(BOARD_GROUPS[subject].reduce((sum, g) => sum + g.items, 0)).toBe(100);
    });

    it('says who shares a count, and has none for an unitemized or unknown topic', () => {
        expect(boardItemsFor('EE', 'Power System Analysis')).toEqual({ items: 20, sharedWith: ['Power System Protection'] });
        expect(boardItemsFor('Mathematics', 'Calculus 1')).toEqual({ items: 15, sharedWith: [] });
        expect(boardItemsFor('Mathematics', 'Vector Analysis')).toBeNull();
        expect(boardItemsFor('Nope', 'Nope')).toBeNull();
    });
});

describe('drawing by the board’s counts', () => {
    const topics = (name, n) => Array.from({ length: n }, (_, i) => ({ id: `${name}-${i}`, subtopic: name }));
    const first = (list, n) => list.slice(0, n);
    const count = (out, name) => out.filter((q) => q.subtopic === name).length;
    const eePool = [
        ...topics('Power System Analysis', 50), ...topics('Power System Protection', 50), ...topics('Electromagnetism', 50),
        ...topics('Electric Circuits 1', 50), ...topics('Electric Circuits 2', 50), ...topics('Electrical Machinery 1', 50),
        ...topics('Electrical Machinery 2', 50), ...topics('Instrumentation & Control', 50), ...topics('Electrical System & Illumination Design', 50),
        ...topics('Power Plant Engineering', 50), ...topics('Electronics 1 and 2', 50), ...topics('Electrical Apparatus & Devices', 50),
        ...topics('Quantities/units/constants (EE)', 50),
    ];

    it.each([[100], [45], [7], [1], [0]])('a split of %i sums exactly', (n) => {
        for (const subject of Object.keys(BOARD_GROUPS)) expect(boardItemSplit(subject, n).reduce((a, b) => a + b, 0)).toBe(n);
    });

    it('a 100-item paper takes PRC’s counts, and an unitemized topic gets nothing', () => {
        const out = boardWeightedPick(eePool, 'EE', 100, first);
        expect(out).toHaveLength(100);
        expect(count(out, 'Power System Analysis')).toBe(20);
        expect(count(out, 'Electromagnetism')).toBe(10);
        expect(count(out, 'Electrical Machinery 1')).toBe(5);
        expect(count(out, 'Quantities/units/constants (EE)')).toBe(0);
    });

    it('a share of 45 items scales down and still sums', () => {
        expect(boardWeightedPick(eePool, 'EE', 45, first)).toHaveLength(45);
    });

    it('fills a thin group from the rest, unitemized topics included, with no repeats', () => {
        const pool = [...topics('Power System Analysis', 3), ...topics('Electromagnetism', 50), ...topics('Quantities/units/constants (EE)', 200)];
        const out = boardWeightedPick(pool, 'EE', 100, first);
        expect(out).toHaveLength(100);
        expect(new Set(out.map((q) => q.id)).size).toBe(100);
        expect(count(out, 'Power System Analysis')).toBe(3);
    });

    it('a pool too small returns all of it, and an unknown or renamed topic can’t break a draw', () => {
        const pool = topics('Renamed Topic', 8);
        expect(boardWeightedPick(pool, 'EE', 100, first)).toHaveLength(8);
        expect(boardWeightedPick(pool, 'EE', 5, first)).toHaveLength(5);
        expect(boardWeightedPick(pool, 'Nope', 5, first)).toHaveLength(5);
        expect(boardWeightedPick([], 'EE', 5, first)).toEqual([]);
    });

    it('a zero count draws nothing, even with a sampler that reads 0 as everything', () => {
        expect(boardWeightedPick(eePool, 'EE', 0, (list, n) => (n ? list.slice(0, n) : list))).toEqual([]);
    });

    it('the bank against the board adds up shared topics, thinnest first', () => {
        const { groups, unitemized } = bankVsBoard({ 'Power System Analysis': 73, 'Power System Protection': 26, Electromagnetism: 1109, 'Quantities/units/constants (EE)': 34 }, 'EE');
        const psa = groups.find((g) => g.topics.includes('Power System Analysis'));
        expect(psa).toMatchObject({ items: 20, questions: 99 });
        expect(psa.perItem).toBeCloseTo(4.95);
        expect(groups[0].perItem).toBe(0);
        expect(groups.at(-1).topics).toEqual(['Electromagnetism']);
        expect(unitemized).toEqual([{ topic: 'Quantities/units/constants (EE)', questions: 34 }]);
    });

    it('GET /api/admin/bank-counts merges subject spellings, for admins only', async () => {
        const group = vi.spyOn(prisma.question, 'groupBy').mockResolvedValue([
            { subject: 'EE', subtopic: 'Electromagnetism', _count: { _all: 5 } },
            { subject: 'Electrical Engineering', subtopic: 'Electromagnetism', _count: { _all: 2 } },
        ]);
        const admin = express();
        admin.use(express.json());
        admin.use('/api/admin', require('../src/routes/adminRoutes'));
        expect((await request(admin).get('/api/admin/bank-counts').set(as(USER))).status).toBe(403);
        expect(group).not.toHaveBeenCalled();
        const res = await request(admin).get('/api/admin/bank-counts').set(as(ADMIN));
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([{ subject: 'EE', topic: 'Electromagnetism', count: 7 }]);
    });
});

describe('the seed', () => {
    const dir = resolve(__dirname, '..', 'prisma', 'migrations');
    const name = readdirSync(dir).find((d) => d.endsWith('_syllabus_subtopics'));
    const sql = readFileSync(join(dir, name, 'migration.sql'), 'utf8');
    const rows = [...sql.matchAll(/\('(Mathematics|ESAS|EE)','((?:[^']|'')+)','((?:[^']|'')+)',(\d+)\)/g)]
        .map((m) => ({ subject: m[1], topic: m[2].replace(/''/g, "'"), name: m[3].replace(/''/g, "'"), ord: Number(m[4]) }));
    const key = (r) => `${r.subject}|${r.topic}`;

    it('gives every topic a list', () => {
        const expected = Object.entries(BOARD_GROUPS).flatMap(([subject, groups]) => groups.flatMap((g) => g.topics.map((topic) => `${subject}|${topic}`)))
            .concat(Object.entries(UNITEMIZED).flatMap(([subject, topics]) => topics.map((topic) => `${subject}|${topic}`)));
        expect(expected).toHaveLength(50);
        expect([...new Set(rows.map(key))].sort()).toEqual([...expected].sort());
    });

    it('has no repeat within a topic, numbers each in order, and enables row security', () => {
        for (const topic of new Set(rows.map(key))) {
            const list = rows.filter((r) => key(r) === topic);
            expect(new Set(list.map((r) => r.name.toLowerCase())).size, topic).toBe(list.length);
            expect(list.map((r) => r.ord), topic).toEqual(list.map((_, i) => i));
            expect(list.length, topic).toBeGreaterThanOrEqual(8);
        }
        expect(sql).toContain('ALTER TABLE "SyllabusSubtopic" ENABLE ROW LEVEL SECURITY');
        expect(sql).toContain('ALTER TABLE "UserSubtopic" ENABLE ROW LEVEL SECURITY');
    });

    it('keeps the owner’s Algebra list, word for word', () => {
        expect(rows.filter((r) => r.topic === 'Algebra').map((r) => r.name)).toEqual([
            'Algebraic Expressions', 'Functions', 'System of Equations', 'Binomial Theorem', 'Number / Digit Problems', 'Proportion and Variation',
            'Age Problems', 'Mixture Problems', 'Motion Problems', 'Work Problems', 'Money-Related Problems', 'Arithmetic Progression',
            'Geometric Progression', 'Diophantine Equation', 'Venn Diagram', 'Miscellaneous Problems',
        ]);
    });
});

describe('GET /api/config/subtopics', () => {
    it('needs a sign-in', async () => {
        expect((await request(app).get('/api/config/subtopics')).status).toBe(401);
    });

    it('returns the list with retired rows flagged, so a ticked one keeps its name', async () => {
        const find = vi.spyOn(prisma.syllabusSubtopic, 'findMany').mockResolvedValue([{ id: 'a', topicId: 't', name: 'N', sortOrder: 0, active: false }]);
        const res = await request(app).get('/api/config/subtopics').set(as(USER));
        expect(res.status).toBe(200);
        expect(res.body.items[0]).toEqual({ id: 'a', topicId: 't', name: 'N', sortOrder: 0, active: false });
        expect(find.mock.calls[0][0].where).toBeUndefined();
    });
});

describe('/api/user/syllabus-subtopics', () => {
    it.each([
        ['get', '/api/user/syllabus-subtopics'],
        ['put', '/api/user/syllabus-subtopics/a'],
        ['delete', '/api/user/syllabus-subtopics/a'],
        ['post', '/api/user/syllabus-subtopics/bulk'],
    ])('%s %s needs a sign-in', async (method, url) => {
        expect((await request(app)[method](url).send({})).status).toBe(401);
    });

    it('lists only this learner’s rows, without the owner id', async () => {
        const find = vi.spyOn(prisma.userSubtopic, 'findMany').mockResolvedValue([{ userId: USER, id: 'a', done: true }]);
        const res = await request(app).get('/api/user/syllabus-subtopics').set(as(USER));
        expect(find.mock.calls[0][0].where).toEqual({ userId: USER });
        expect(res.body.items).toEqual([{ id: 'a', done: true }]);
    });

    it('a tick saves against the signed-in learner, whoever the body names', async () => {
        const upsert = vi.spyOn(prisma.userSubtopic, 'upsert').mockResolvedValue({ userId: USER, id: 'a', done: true });
        const res = await request(app).put('/api/user/syllabus-subtopics/a').set(as(USER))
            .send({ topicId: 't1', subtopicId: 'a', done: true, doneOn: '2026-11-03', userId: 'someone-else' });
        expect(res.status).toBe(200);
        const call = upsert.mock.calls[0][0];
        expect(call.where).toEqual({ userId_id: { userId: USER, id: 'a' } });
        expect(call.create).toMatchObject({ userId: USER, id: 'a', topicId: 't1', done: true, name: null, hidden: false });
        expect(call.update).not.toHaveProperty('userId');
        expect(res.body.item).not.toHaveProperty('userId');
    });

    it('refuses a suggested subtopic id that isn’t this row', async () => {
        const upsert = vi.spyOn(prisma.userSubtopic, 'upsert').mockResolvedValue({});
        const res = await request(app).put('/api/user/syllabus-subtopics/a').set(as(USER)).send({ topicId: 't1', subtopicId: 'b' });
        expect(res.status).toBe(400);
        expect(upsert).not.toHaveBeenCalled();
    });

    it.each([
        ['an own row with no name', { topicId: 't1' }],
        ['a bad date', { ...own, doneOn: 'soon' }],
        ['no topic', { name: 'Mine' }],
        ['a very long name', { topicId: 't1', name: 'x'.repeat(121) }],
    ])('refuses %s', async (_label, body) => {
        const upsert = vi.spyOn(prisma.userSubtopic, 'upsert').mockResolvedValue({});
        const res = await request(app).put('/api/user/syllabus-subtopics/a').set(as(USER)).send(body);
        expect(res.status).toBe(400);
        expect(upsert).not.toHaveBeenCalled();
    });

    it('an unknown topic is a 404', async () => {
        vi.spyOn(prisma.userSubtopic, 'count').mockResolvedValue(0);
        vi.spyOn(prisma.userSubtopic, 'upsert').mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }));
        const res = await request(app).put('/api/user/syllabus-subtopics/a').set(as(USER)).send(own);
        expect(res.status).toBe(404);
    });

    it('caps a learner’s own subtopics, but still lets them edit one', async () => {
        vi.spyOn(prisma.userSubtopic, 'count').mockResolvedValue(600);
        const unique = vi.spyOn(prisma.userSubtopic, 'findUnique').mockResolvedValue(null);
        const upsert = vi.spyOn(prisma.userSubtopic, 'upsert').mockResolvedValue({ userId: USER, id: 'a' });
        expect((await request(app).put('/api/user/syllabus-subtopics/a').set(as(USER)).send(own)).status).toBe(400);
        expect(upsert).not.toHaveBeenCalled();
        unique.mockResolvedValue({ id: 'a' });
        expect((await request(app).put('/api/user/syllabus-subtopics/a').set(as(USER)).send(own)).status).toBe(200);
    });

    it('a delete only reaches this learner’s row, and a replay is still a 200', async () => {
        const del = vi.spyOn(prisma.userSubtopic, 'deleteMany').mockResolvedValue({ count: 0 });
        const res = await request(app).delete('/api/user/syllabus-subtopics/a').set(as(USER));
        expect(res.status).toBe(200);
        expect(del.mock.calls[0][0].where).toEqual({ id: 'a', userId: USER });
    });

    it('bulk writes one statement and returns the rows', async () => {
        const exec = vi.spyOn(prisma, '$executeRaw').mockResolvedValue(2);
        vi.spyOn(prisma.userSubtopic, 'findMany').mockResolvedValue([{ userId: USER, id: 'a', done: true }]);
        const res = await request(app).post('/api/user/syllabus-subtopics/bulk').set(as(USER))
            .send({ items: [{ id: 'a', topicId: 't1', subtopicId: 'a', done: true }, { id: 'b', topicId: 't1', subtopicId: 'b', done: true }] });
        expect(res.status).toBe(200);
        expect(exec).toHaveBeenCalledTimes(1);
        expect(exec.mock.calls[0]).toContain(USER);
        expect(res.body.items).toEqual([{ id: 'a', done: true }]);
    });

    it.each([
        ['too many', { items: Array.from({ length: 101 }, (_, i) => ({ id: `s${i}`, topicId: 't1', subtopicId: `s${i}` })) }],
        ['none', { items: [] }],
        ['a mismatched id', { items: [{ id: 'a', topicId: 't1', subtopicId: 'b' }] }],
    ])('bulk refuses %s', async (_label, body) => {
        const exec = vi.spyOn(prisma, '$executeRaw').mockResolvedValue(0);
        const res = await request(app).post('/api/user/syllabus-subtopics/bulk').set(as(USER)).send(body);
        expect(res.status).toBe(400);
        expect(exec).not.toHaveBeenCalled();
    });
});

describe('/api/admin/subtopics', () => {
    it.each([
        ['get', '/api/admin/subtopics'],
        ['post', '/api/admin/subtopics'],
        ['post', '/api/admin/subtopics/reorder'],
        ['put', '/api/admin/subtopics/a'],
    ])('%s %s refuses a learner, and writes nothing', async (method, url) => {
        const create = vi.spyOn(prisma.syllabusSubtopic, 'createMany').mockResolvedValue({ count: 0 });
        const update = vi.spyOn(prisma.syllabusSubtopic, 'update').mockResolvedValue({});
        const res = await request(app)[method](url).set(as(USER)).send({ topicId: 't', names: ['x'], ids: ['a'], name: 'x' });
        expect(res.status).toBe(403);
        expect(create).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    it('adds to the end, skips a name it has, brings back a retired one', async () => {
        const existing = [
            { id: 'a', topicId: 't', name: 'Functions', normKey: 'functions', sortOrder: 4, active: true },
            { id: 'b', topicId: 't', name: 'Old', normKey: 'old', sortOrder: 5, active: false },
        ];
        vi.spyOn(prisma.syllabusSubtopic, 'findMany').mockResolvedValue(existing);
        const create = vi.spyOn(prisma.syllabusSubtopic, 'createMany').mockResolvedValue({ count: 1 });
        const revive = vi.spyOn(prisma.syllabusSubtopic, 'updateMany').mockResolvedValue({ count: 1 });
        const res = await request(app).post('/api/admin/subtopics').set(as(ADMIN))
            .send({ topicId: 't', names: [' functions ', 'OLD', 'New One', 'new one'] });
        expect(res.status).toBe(200);
        expect(res.body.added).toBe(2);
        expect(create.mock.calls[0][0].data).toEqual([{ topicId: 't', name: 'New One', normKey: 'new one', sortOrder: 6 }]);
        expect(revive.mock.calls[0][0]).toEqual({ where: { id: { in: ['b'] } }, data: { active: true } });
    });

    it('a rename updates its key too, and a clash is a 409', async () => {
        const update = vi.spyOn(prisma.syllabusSubtopic, 'update').mockResolvedValue({ id: 'a', name: 'New', normKey: 'new' });
        const res = await request(app).put('/api/admin/subtopics/a').set(as(ADMIN)).send({ name: ' New ' });
        expect(res.status).toBe(200);
        expect(update.mock.calls[0][0].data).toEqual({ name: 'New', normKey: 'new' });
        expect(res.body.item).not.toHaveProperty('normKey');
        update.mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }));
        expect((await request(app).put('/api/admin/subtopics/a').set(as(ADMIN)).send({ name: 'Taken' })).status).toBe(409);
    });

    it('retires without deleting', async () => {
        const update = vi.spyOn(prisma.syllabusSubtopic, 'update').mockResolvedValue({ id: 'a', active: false });
        await request(app).put('/api/admin/subtopics/a').set(as(ADMIN)).send({ active: false });
        expect(update.mock.calls[0][0].data).toEqual({ active: false });
    });

    it('refuses an empty change', async () => {
        expect((await request(app).put('/api/admin/subtopics/a').set(as(ADMIN)).send({})).status).toBe(400);
    });

    it('reorders in one statement', async () => {
        const exec = vi.spyOn(prisma, '$executeRaw').mockResolvedValue(2);
        vi.spyOn(prisma.syllabusSubtopic, 'findMany').mockResolvedValue([]);
        const res = await request(app).post('/api/admin/subtopics/reorder').set(as(ADMIN)).send({ topicId: 't', ids: ['b', 'a'] });
        expect(res.status).toBe(200);
        expect(exec).toHaveBeenCalledTimes(1);
    });
});
