import { describe, it, expect, afterAll, beforeEach } from 'vitest';

// The column against a real Postgres: a save reads back, and a reset really
// clears it to SQL NULL, which is what "use PRC's table" means.

const prisma = require('../../src/config/db');
const { getBoardBlueprint, invalidateBoardBlueprint, saveBoardBlueprint, resetBoardBlueprint } = require('../../src/services/boardBlueprint');

const ID = 'global_config';
const TOPIC = { id: 'blueprint-topic', subject: 'EE', name: 'Blueprint Test Topic', normKey: 'blueprint test topic' };

beforeEach(async () => {
    invalidateBoardBlueprint();
    await prisma.topic.deleteMany({ where: { id: TOPIC.id } });
    await prisma.topic.create({ data: TOPIC });
    await prisma.systemConfig.upsert({ where: { id: ID }, update: {}, create: { id: ID } });
});

afterAll(async () => {
    await resetBoardBlueprint();
    await prisma.topic.deleteMany({ where: { id: TOPIC.id } });
    await prisma.$disconnect();
});

describe('board blueprint', () => {
    it('saves, reads back by name, and resets to null', async () => {
        const stored = { Mathematics: [], ESAS: [], EE: [{ items: 42, topicIds: [TOPIC.id] }] };
        const { blueprint, error } = await saveBoardBlueprint(stored);
        expect(error).toBeUndefined();
        expect(blueprint.groups.EE).toEqual([{ items: 42, topics: [TOPIC.name], topicIds: [TOPIC.id] }]);

        invalidateBoardBlueprint();
        expect((await getBoardBlueprint()).custom).toBe(true);

        expect((await resetBoardBlueprint()).custom).toBe(false);
        const row = await prisma.systemConfig.findUnique({ where: { id: ID }, select: { boardBlueprint: true } });
        expect(row.boardBlueprint).toBeNull();
    });

    it('a retired topic is refused on save, and drops out of what was saved', async () => {
        await saveBoardBlueprint({ Mathematics: [], ESAS: [], EE: [{ items: 42, topicIds: [TOPIC.id] }] });
        await prisma.topic.update({ where: { id: TOPIC.id }, data: { active: false } });
        invalidateBoardBlueprint();
        expect((await getBoardBlueprint()).groups.EE).toEqual([]);
        const { error } = await saveBoardBlueprint({ Mathematics: [], ESAS: [], EE: [{ items: 42, topicIds: [TOPIC.id] }] });
        expect(error).toMatch(/retired/);
    });
});
