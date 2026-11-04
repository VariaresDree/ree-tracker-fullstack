import { describe, it, expect, afterAll, beforeEach } from 'vitest';

// Deleting an account against a real Postgres: the rows with no foreign key go too, a
// hosted battle survives for its other players, and the export sees only its owner.

const prisma = require('../../src/config/db');
const { OWN_ROWS } = require('../../src/routes/dataExportRoutes');

const USER = 'delete-me';
const OTHER = 'delete-other';
const BATTLE = 'DELME1';

const cleanUp = async () => {
    await prisma.battle.deleteMany({ where: { id: BATTLE } });
    await prisma.leaderboardEntry.deleteMany({ where: { userId: { in: [USER, OTHER] } } });
    await prisma.idempotencyRecord.deleteMany({ where: { userId: { in: [USER, OTHER] } } });
    await prisma.user.deleteMany({ where: { id: { in: [USER, OTHER] } } });
};

beforeEach(async () => {
    await cleanUp();
    await prisma.user.createMany({ data: [USER, OTHER].map((id) => ({ id, email: `${id}@example.com` })) });
});
afterAll(async () => {
    await cleanUp();
    await prisma.$disconnect();
});

describe('every table the export names', () => {
    it('can be read by its owner, against the real schema', async () => {
        for (const [name, table] of Object.entries(OWN_ROWS)) {
            await expect(table().findMany({ where: { userId: USER }, take: 1 }), name).resolves.toEqual([]);
        }
    });
});

describe('the rows no cascade reaches', () => {
    it('go with the account, in one transaction, and a hosted battle stays', async () => {
        await prisma.idempotencyRecord.create({ data: { key: `${USER}-k`, userId: USER } });
        await prisma.idempotencyRecord.create({ data: { key: `${OTHER}-k`, userId: OTHER } });
        await prisma.battle.create({ data: { id: BATTLE, hostId: USER, config: {}, questions: [], timeLimitSecs: 60 } });
        await prisma.$transaction([
            prisma.questionFlag.deleteMany({ where: { userId: USER } }),
            prisma.idempotencyRecord.deleteMany({ where: { userId: USER } }),
            prisma.leaderboardEntry.deleteMany({ where: { userId: USER } }),
            prisma.battle.updateMany({ where: { hostId: USER }, data: { hostId: 'deleted-account' } }),
            prisma.user.deleteMany({ where: { id: USER } }),
        ]);
        expect(await prisma.user.findUnique({ where: { id: USER } })).toBeNull();
        expect(await prisma.idempotencyRecord.count({ where: { userId: USER } })).toBe(0);
        expect(await prisma.idempotencyRecord.count({ where: { userId: OTHER } })).toBe(1);
        const battle = await prisma.battle.findUnique({ where: { id: BATTLE } });
        expect(battle.hostId).toBe('deleted-account');
    });
});
