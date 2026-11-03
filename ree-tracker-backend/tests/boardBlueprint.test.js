import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// See questionRoutes.authz.test.js for why the patch comes before the requires.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateRole } = require('../src/middlewares/roleMiddleware');
const adminRoutes = require('../src/routes/adminRoutes');
const configRoutes = require('../src/routes/configRoutes');
const { invalidateBoardBlueprint } = require('../src/services/boardBlueprint');
const { BOARD_GROUPS, resolveBlueprint, blueprintError, boardItemsFor, boardItemSplit, boardWeightedPick, ownBlueprint, ownCountsFromBoard } = require('@ree/shared');

const ADMIN = 'uid-admin';
const USER = 'uid-user';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

const TOPICS = [
    { id: 't-alg', subject: 'Mathematics', name: 'Algebra' },
    { id: 't-cx', subject: 'Mathematics', name: 'Complex Numbers' },
    { id: 't-vec', subject: 'Mathematics', name: 'Vector Analysis' },
    { id: 't-em', subject: 'EE', name: 'Electromagnetism' },
];

describe('resolveBlueprint', () => {
    it('with nothing saved, PRC’s table against today’s topics', () => {
        const { custom, groups, unitemized } = resolveBlueprint(null, TOPICS);
        expect(custom).toBe(false);
        expect(groups.Mathematics).toEqual([{ items: 5, topics: ['Algebra', 'Complex Numbers'], topicIds: ['t-alg', 't-cx'] }]);
        expect(groups.EE).toEqual([{ items: 10, topics: ['Electromagnetism'], topicIds: ['t-em'] }]);
        expect(unitemized.Mathematics).toEqual([{ id: 't-vec', name: 'Vector Analysis' }]);
    });

    it('a saved count follows a rename, because it’s stored by id', () => {
        const stored = { Mathematics: [{ items: 8, topicIds: ['t-alg'] }] };
        const renamed = TOPICS.map((t) => (t.id === 't-alg' ? { ...t, name: 'College Algebra' } : t));
        expect(resolveBlueprint(stored, renamed).groups.Mathematics).toEqual([{ items: 8, topics: ['College Algebra'], topicIds: ['t-alg'] }]);
    });

    it('a retired topic drops out, a group left empty goes with it, and a new topic has no count', () => {
        const stored = { Mathematics: [{ items: 5, topicIds: ['t-alg', 't-cx'] }, { items: 3, topicIds: ['gone'] }] };
        const topics = [...TOPICS.filter((t) => t.id !== 't-cx'), { id: 't-new', subject: 'Mathematics', name: 'New Topic' }];
        const { custom, groups, unitemized } = resolveBlueprint(stored, topics);
        expect(custom).toBe(true);
        expect(groups.Mathematics).toEqual([{ items: 5, topics: ['Algebra'], topicIds: ['t-alg'] }]);
        expect(unitemized.Mathematics.map((t) => t.id)).toEqual(['t-vec', 't-new']);
    });

    it('a subject with nothing saved in a saved setup has no counts', () => {
        expect(resolveBlueprint({ Mathematics: [] }, TOPICS).groups.EE).toEqual([]);
    });
});

describe('blueprintError', () => {
    it('accepts a good setup', () => {
        expect(blueprintError({ Mathematics: [{ items: 5, topicIds: ['t-alg', 't-cx'] }], EE: [{ items: 100, topicIds: ['t-em'] }] }, TOPICS)).toBeNull();
    });

    it('refuses a retired topic, another subject’s topic, and a topic counted twice', () => {
        expect(blueprintError({ Mathematics: [{ items: 5, topicIds: ['gone'] }] }, TOPICS)).toMatch(/retired/);
        expect(blueprintError({ Mathematics: [{ items: 5, topicIds: ['t-em'] }] }, TOPICS)).toBe('Electromagnetism belongs to EE, not Mathematics.');
        expect(blueprintError({ Mathematics: [{ items: 5, topicIds: ['t-alg'] }, { items: 5, topicIds: ['t-alg'] }] }, TOPICS)).toBe('Algebra is counted twice.');
    });
});

describe('drawing by a saved setup', () => {
    const groups = { EE: [{ items: 30, topics: ['A'] }, { items: 70, topics: ['B', 'C'] }] };
    const of = (name, n) => Array.from({ length: n }, (_, i) => ({ id: `${name}${i}`, subtopic: name }));
    const first = (list, n) => list.slice(0, n);
    const pool = [...of('A', 60), ...of('B', 60), ...of('C', 60), ...of('Electromagnetism', 60)];

    it('takes the saved counts, and a topic left out only fills', () => {
        const out = boardWeightedPick(pool, 'EE', 100, first, groups);
        expect(out.filter((q) => q.subtopic === 'A')).toHaveLength(30);
        expect(out.filter((q) => q.subtopic !== 'A' && q.subtopic !== 'Electromagnetism')).toHaveLength(70);
        expect(out.filter((q) => q.subtopic === 'Electromagnetism')).toHaveLength(0);
    });

    it('scales when a total isn’t the paper’s length', () => {
        expect(boardItemSplit('EE', 50, groups)).toEqual([15, 35]);
        expect(boardItemSplit('EE', 50, { EE: [{ items: 1, topics: ['A'] }, { items: 3, topics: ['B'] }] }).reduce((a, b) => a + b, 0)).toBe(50);
    });

    it('a subject with no groups, or all at zero, draws evenly from the pool and stays full', () => {
        expect(boardWeightedPick(pool, 'EE', 20, first, { EE: [] })).toHaveLength(20);
        expect(boardWeightedPick(pool, 'EE', 20, first, { EE: [{ items: 0, topics: ['A'] }] })).toHaveLength(20);
    });

    it('with no setup in hand, uses PRC’s table', () => {
        expect(boardItemSplit('EE', 100, null)).toEqual(BOARD_GROUPS.EE.map((g) => g.items));
        expect(boardItemsFor('EE', 'Electromagnetism', null)).toEqual({ items: 10, sharedWith: [] });
        expect(boardItemsFor('EE', 'A', groups)).toEqual({ items: 30, sharedWith: [] });
    });
});

describe('a learner’s own counts', () => {
    it('are one group per topic with a count, for every subject', () => {
        expect(ownBlueprint({ EE: { A: 3, B: 0 } })).toEqual({ Mathematics: [], ESAS: [], EE: [{ items: 3, topics: ['A'] }] });
        expect(ownBlueprint(null).EE).toEqual([]);
    });

    it('can start from the board’s, a shared count split evenly', () => {
        expect(ownCountsFromBoard({ EE: [{ items: 5, topics: ['A', 'B'] }] })).toEqual({ EE: { A: 3, B: 2 } });
        expect(Object.values(ownCountsFromBoard().EE).reduce((a, b) => a + b, 0)).toBe(100);
    });
});

describe('the routes', () => {
    let app;

    beforeEach(() => {
        invalidateBoardBlueprint();
        app = express();
        app.use(express.json());
        app.use('/api/admin', adminRoutes);
        app.use('/api/config', configRoutes);
        verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
        vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: USER });
        vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }) => ({ role: where.id === ADMIN ? 'ADMIN' : 'USER' }));
        invalidateRole(ADMIN);
        invalidateRole(USER);
        vi.spyOn(prisma.topic, 'findMany').mockResolvedValue(TOPICS);
        vi.spyOn(prisma.systemConfig, 'findUnique').mockResolvedValue({ boardBlueprint: null });
    });

    afterEach(() => vi.restoreAllMocks());

    const GOOD = { Mathematics: [{ items: 9, topicIds: ['t-alg'] }], ESAS: [], EE: [{ items: 91, topicIds: ['t-em'] }] };

    it('reading needs a sign-in, not an admin, and is cached until a save', async () => {
        expect((await request(app).get('/api/config/board-blueprint')).status).toBe(401);
        const res = await request(app).get('/api/config/board-blueprint').set(as(USER));
        expect(res.status).toBe(200);
        expect(res.body.custom).toBe(false);
        expect(res.body.groups.EE[0]).toMatchObject({ items: 10, topics: ['Electromagnetism'] });
        await request(app).get('/api/config/board-blueprint').set(as(USER));
        expect(prisma.systemConfig.findUnique).toHaveBeenCalledTimes(1);
    });

    it('only an admin can save or reset', async () => {
        const save = vi.spyOn(prisma.systemConfig, 'upsert');
        const wipe = vi.spyOn(prisma.systemConfig, 'updateMany');
        expect((await request(app).put('/api/admin/board-blueprint').set(as(USER)).send(GOOD)).status).toBe(403);
        expect((await request(app).delete('/api/admin/board-blueprint').set(as(USER))).status).toBe(403);
        expect((await request(app).put('/api/admin/board-blueprint').send(GOOD)).status).toBe(401);
        expect(save).not.toHaveBeenCalled();
        expect(wipe).not.toHaveBeenCalled();
    });

    it('saves a good setup, and the next read shows it', async () => {
        const save = vi.spyOn(prisma.systemConfig, 'upsert').mockResolvedValue({});
        await request(app).get('/api/config/board-blueprint').set(as(USER)); // fills the cache
        const res = await request(app).put('/api/admin/board-blueprint').set(as(ADMIN)).send(GOOD);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ custom: true, groups: { Mathematics: [{ items: 9, topics: ['Algebra'] }] } });
        expect(save.mock.calls[0][0]).toMatchObject({ where: { id: 'global_config' }, update: { boardBlueprint: GOOD } });

        prisma.systemConfig.findUnique.mockResolvedValue({ boardBlueprint: GOOD });
        expect((await request(app).get('/api/config/board-blueprint').set(as(USER))).body.custom).toBe(true);
    });

    it.each([
        ['a negative count', { ...GOOD, EE: [{ items: -1, topicIds: ['t-em'] }] }],
        ['a fraction', { ...GOOD, EE: [{ items: 1.5, topicIds: ['t-em'] }] }],
        ['a group with no topics', { ...GOOD, EE: [{ items: 5, topicIds: [] }] }],
        ['a missing subject', { Mathematics: [], ESAS: [] }],
        ['an unknown subject', { ...GOOD, Other: [] }],
    ])('refuses %s', async (_label, body) => {
        const save = vi.spyOn(prisma.systemConfig, 'upsert');
        expect((await request(app).put('/api/admin/board-blueprint').set(as(ADMIN)).send(body)).status).toBe(400);
        expect(save).not.toHaveBeenCalled();
    });

    it('refuses a topic from another subject, or counted twice, and says which', async () => {
        const save = vi.spyOn(prisma.systemConfig, 'upsert');
        const other = await request(app).put('/api/admin/board-blueprint').set(as(ADMIN)).send({ ...GOOD, Mathematics: [{ items: 5, topicIds: ['t-em'] }], EE: [] });
        expect(other.status).toBe(400);
        expect(other.body.error).toBe('Electromagnetism belongs to EE, not Mathematics.');
        const twice = await request(app).put('/api/admin/board-blueprint').set(as(ADMIN)).send({ ...GOOD, Mathematics: [{ items: 5, topicIds: ['t-alg'] }, { items: 5, topicIds: ['t-alg'] }] });
        expect(twice.body.error).toBe('Algebra is counted twice.');
        expect(save).not.toHaveBeenCalled();
    });

    it('a reset goes back to PRC’s table', async () => {
        const wipe = vi.spyOn(prisma.systemConfig, 'updateMany').mockResolvedValue({ count: 1 });
        const res = await request(app).delete('/api/admin/board-blueprint').set(as(ADMIN));
        expect(res.status).toBe(200);
        expect(res.body.custom).toBe(false);
        expect(wipe).toHaveBeenCalledTimes(1);
    });
});
