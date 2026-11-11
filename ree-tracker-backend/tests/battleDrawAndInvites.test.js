import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// A battle's draw choice, the three a mock offers, picked on the server since clients
// never supply a pool. And a rematch reaching the players who've left the results.
const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const questionPool = require('../src/services/questionPool');
const battleCreate = require('../src/services/battleCreate');
const { battleCreateSchema } = require('../src/schemas/battleSchemas');

const UID = 'uid-host';
const as = (uid) => ({ Authorization: `Bearer ${uid}` });

function makeApp() {
    delete require.cache[require.resolve('../src/routes/battleRoutes')];
    const app = express();
    app.use(express.json());
    app.use('/api/battles', require('../src/routes/battleRoutes'));
    return app;
}

beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: UID });
});
afterEach(() => vi.restoreAllMocks());

describe('groupsForDraw', () => {
    it('an even spread, or no choice at all, draws no groups', async () => {
        await expect(questionPool.groupsForDraw({})).resolves.toBeNull();
        await expect(questionPool.groupsForDraw({ drawMode: 'even' })).resolves.toBeNull();
    });

    it('a host’s own counts become groups, leaving out topics at zero', async () => {
        const groups = await questionPool.groupsForDraw({ drawMode: 'own', ownCounts: { EE: { Machines: 3, Protection: 0 } } });
        expect(groups.EE).toEqual([{ items: 3, topics: ['Machines'] }]);
    });
});

describe('samplePool with groups', () => {
    const rows = (topic, n) => Array.from({ length: n }, (_, i) => ({ id: `${topic}-${i}`, subtopic: topic }));

    it('draws each topic’s count, and fills from the rest when a topic is thin', async () => {
        const findIds = vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ select, where }) => (select
            ? [...rows('Machines', 10), ...rows('Protection', 1), ...rows('Illumination', 10)]
            : where.id.in.map((id) => ({ id }))));
        const groups = { EE: [{ items: 6, topics: ['Machines'] }, { items: 4, topics: ['Protection'] }] };
        const pool = await questionPool.samplePool({ subject: 'EE', limit: 10, groups });
        const count = (topic) => pool.filter((q) => q.id.startsWith(topic)).length;
        expect(pool).toHaveLength(10);
        expect(count('Machines')).toBeGreaterThanOrEqual(6);
        expect(count('Protection')).toBe(1);
        expect(new Set(pool.map((q) => q.id)).size).toBe(10);
        expect(findIds.mock.calls[0][0].where.isFlagged).toBe(false);
    });

    it('leaves out a rematch’s last questions when it can', async () => {
        const findIds = vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ select, where }) => (select
            ? rows('Machines', 5)
            : where.id.in.map((id) => ({ id }))));
        await questionPool.samplePool({ subject: 'EE', limit: 2, groups: { EE: [{ items: 2, topics: ['Machines'] }] }, avoidIds: ['old'] });
        expect(findIds.mock.calls[0][0].where.id).toEqual({ notIn: ['old'] });
    });
});

describe('createBattle', () => {
    it('keeps the host’s choice with the battle, so a rematch draws the same way', async () => {
        const samplePool = vi.spyOn(questionPool, 'samplePool').mockResolvedValue([{ id: 'q1' }]);
        const create = vi.spyOn(prisma.battle, 'create').mockResolvedValue({ id: 'ABC123' });
        const config = { mode: 'subject', subject: 'EE', count: 5, drawMode: 'own', ownCounts: { EE: { Machines: 5 } } };
        await battleCreate.createBattle({ hostId: UID, battleId: 'ABC123', config, timeLimitSecs: 600 });
        expect(samplePool.mock.calls[0][0].groups.EE).toEqual([{ items: 5, topics: ['Machines'] }]);
        expect(create.mock.calls[0][0].data.config).toMatchObject({ drawMode: 'own', ownCounts: { EE: { Machines: 5 } } });
    });

    it('a battle on one topic draws only from it, and keeps it for a rematch', async () => {
        const raw = vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue(['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((id) => ({ id })));
        vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map((id) => ({ id, subtopic: 'Electric Circuits 2' })));
        const create = vi.spyOn(prisma.battle, 'create').mockImplementation(async ({ data }) => data);
        const config = { mode: 'subject', subject: 'EE', subtopic: 'Electric Circuits 2', count: 10 };
        const battle = await battleCreate.createBattle({ hostId: UID, battleId: 'ABC123', config, timeLimitSecs: 600 });
        const [sql, subjects, topic, limit] = raw.mock.calls[0];
        expect(sql).toContain('"subtopic" = $2');
        expect(subjects).toContain('EE');
        expect([topic, limit]).toEqual(['Electric Circuits 2', 10]);
        // Fewer in the topic than asked: the battle is as long as its pool.
        expect(battle.config).toMatchObject({ subtopic: 'Electric Circuits 2', count: 6 });
        expect(create).toHaveBeenCalledTimes(1);
        // The rematch re-reads the stored settings through the create schema.
        const again = battleCreateSchema.omit({ battleId: true }).parse({ config: battle.config, timeLimitSecs: 600 });
        expect(again.config.subtopic).toBe('Electric Circuits 2');
    });

    it('a battle on one subtopic draws only its tagged questions, and keeps it for a rematch', async () => {
        const raw = vi.spyOn(prisma, '$queryRawUnsafe').mockResolvedValue(['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map((id) => ({ id })));
        vi.spyOn(prisma.question, 'findMany').mockImplementation(async ({ where }) => where.id.in.map((id) => ({ id, subtopic: 'Electric Circuits 2' })));
        vi.spyOn(prisma.battle, 'create').mockImplementation(async ({ data }) => data);
        const config = battleCreateSchema.parse({
            battleId: 'ABC123', timeLimitSecs: 600,
            config: { mode: 'subject', subject: 'EE', subtopic: 'Electric Circuits 2', subtopicId: 'sub-ac', subtopicName: 'AC Circuits', count: 10 },
        }).config;
        const battle = await battleCreate.createBattle({ hostId: UID, battleId: 'ABC123', config, timeLimitSecs: 600 });
        const [sql, ...params] = raw.mock.calls[0];
        expect(sql).toContain('"subtopicId" = $6');
        expect(params[5]).toBe('sub-ac');
        expect(battle.config).toMatchObject({ subtopicId: 'sub-ac', subtopicName: 'AC Circuits' });
        const again = battleCreateSchema.omit({ battleId: true }).parse({ config: battle.config, timeLimitSecs: 600 });
        expect(again.config.subtopicId).toBe('sub-ac');
    });

    it('the schema keeps the choice, and refuses one it doesn’t know', () => {
        const base = { battleId: 'ABC123', timeLimitSecs: 600 };
        const ok = battleCreateSchema.parse({ ...base, config: { mode: 'subject', subject: 'EE', drawMode: 'board' } });
        expect(ok.config.drawMode).toBe('board');
        expect(battleCreateSchema.safeParse({ ...base, config: { drawMode: 'random' } }).success).toBe(false);
        // An older battle's stored settings still pass.
        expect(battleCreateSchema.safeParse({ ...base, config: { mode: 'subject', subject: 'EE' } }).success).toBe(true);
    });
});

describe('GET /api/battles/me/invites', () => {
    it('lists waiting rematches others started from battles I played, under the name they played as', async () => {
        const findMany = vi.spyOn(prisma.battleOutcome, 'findMany').mockResolvedValue([{
            battle: {
                rematch: { id: 'NEW123', hostId: 'uid-ana', config: { subject: 'EE' } },
                participants: [{ userId: UID, displayName: 'Me' }, { userId: 'uid-ana', displayName: 'Ana' }],
            },
        }]);
        const res = await request(makeApp()).get('/api/battles/me/invites').set(as(UID));
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([{ battleId: 'NEW123', by: 'Ana', config: { subject: 'EE' } }]);
        const { where } = findMany.mock.calls[0][0];
        expect(where.userId).toBe(UID);
        expect(where.battle.rematch.is).toMatchObject({ status: 'WAITING', hostId: { not: UID } });
        expect(Date.now() - where.battle.rematch.is.createdAt.gte.getTime()).toBeLessThan(24 * 60 * 60 * 1000 + 1000);
    });

    it('needs a signed-in user', async () => {
        const res = await request(makeApp()).get('/api/battles/me/invites');
        expect(res.status).toBe(401);
    });
});
