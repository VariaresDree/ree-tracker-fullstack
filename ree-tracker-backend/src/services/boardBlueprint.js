// src/services/boardBlueprint.js
// The board's items per topic (Admin › Syllabus): the saved setup, or PRC's table
// until one is saved, resolved against today's topics. The same for every caller,
// so it is cached like tosCache, and a save or a topic change clears it.

const { Prisma } = require('@prisma/client');
const prisma = require('../config/db');
const { resolveBlueprint, blueprintError } = require('@ree/shared');

const ID = 'global_config';
const TTL_MS = 5 * 60 * 1000;
let cache = { payload: null, at: 0 };

const activeTopics = () => prisma.topic.findMany({
    where: { active: true },
    select: { id: true, subject: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
});

/** Throws only if the DB fails and nothing has been cached yet. */
async function getBoardBlueprint() {
    if (cache.payload && Date.now() - cache.at < TTL_MS) return cache.payload;
    try {
        const [config, topics] = await Promise.all([
            prisma.systemConfig.findUnique({ where: { id: ID }, select: { boardBlueprint: true } }),
            activeTopics(),
        ]);
        const payload = resolveBlueprint(config?.boardBlueprint ?? null, topics);
        cache = { payload, at: Date.now() };
        return payload;
    } catch (err) {
        if (cache.payload) return cache.payload; // stale beats failing a paper's draw
        throw err;
    }
}

function invalidateBoardBlueprint() {
    cache = { payload: null, at: 0 };
}

/** @returns {Promise<{ error: string } | { blueprint: object }>} */
async function saveBoardBlueprint(stored) {
    const topics = await activeTopics();
    const error = blueprintError(stored, topics);
    if (error) return { error };
    await prisma.systemConfig.upsert({
        where: { id: ID },
        update: { boardBlueprint: stored },
        create: { id: ID, boardBlueprint: stored },
    });
    invalidateBoardBlueprint();
    return { blueprint: resolveBlueprint(stored, topics) };
}

async function resetBoardBlueprint() {
    await prisma.systemConfig.updateMany({ where: { id: ID }, data: { boardBlueprint: Prisma.DbNull } });
    invalidateBoardBlueprint();
    return getBoardBlueprint();
}

module.exports = { getBoardBlueprint, invalidateBoardBlueprint, saveBoardBlueprint, resetBoardBlueprint };
