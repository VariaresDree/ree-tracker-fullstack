import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// A lobby nobody started within a day is removed by the battle sweep
// (battleLifecycle.expireStaleLobbies), against a real database: its players
// go with it, a played battle and a fresh lobby stay, and a rematch lobby that
// was never played frees its battle for a new Rematch.

const prisma = require('../../src/config/db');
const lifecycle = require('../../src/services/battleLifecycle');
const { LOBBY_TTL_MS } = require('../../src/utils/battleLogic');

const RUN = `lx${Date.now().toString(36)}`;
const U = `${RUN}-u`;
const id = (s) => `${RUN}-${s}`.toUpperCase();
const old = new Date(Date.now() - LOBBY_TTL_MS - 60_000);
const battle = (key, over = {}) => ({
    id: id(key), hostId: U, config: { mode: 'subject', subject: 'EE' }, questions: [], timeLimitSecs: 600, ...over,
});

beforeAll(async () => {
    await prisma.user.create({ data: { id: U, email: `${U}@example.test` } });
    await prisma.battle.create({ data: battle('played', { status: 'COMPLETED', startedAt: old, createdAt: old }) });
    await prisma.battle.createMany({
        data: [
            battle('stale', { createdAt: old }),
            battle('fresh'),
            battle('rematch', { createdAt: old, rematchOfId: id('played') }),
            battle('running', { status: 'IN_PROGRESS', startedAt: new Date(), createdAt: old }),
        ],
    });
    await prisma.battleParticipant.create({ data: { battleId: id('stale'), userId: U, displayName: 'Host' } });
});

afterAll(async () => {
    await prisma.battle.updateMany({ where: { id: { startsWith: RUN.toUpperCase() } }, data: { rematchOfId: null } });
    await prisma.battle.deleteMany({ where: { id: { startsWith: RUN.toUpperCase() } } });
    await prisma.user.deleteMany({ where: { id: U } });
});

describe('expireStaleLobbies', () => {
    it('removes only lobbies that never started in a day', async () => {
        const removed = await lifecycle.expireStaleLobbies();
        expect(removed).toBeGreaterThanOrEqual(2);
        const left = (await prisma.battle.findMany({ where: { id: { startsWith: RUN.toUpperCase() } }, select: { id: true } })).map((b) => b.id).sort();
        expect(left).toEqual([id('fresh'), id('played'), id('running')].sort());
        expect(await prisma.battleParticipant.count({ where: { battleId: id('stale') } })).toBe(0);
        // The played battle can have a new rematch now.
        const played = await prisma.battle.findUnique({ where: { id: id('played') }, select: { rematch: { select: { id: true } } } });
        expect(played.rematch).toBeNull();
    });
});
