// src/services/battleCreate.js
//
// Making a battle row: POST /api/battles (a host's new lobby, with the invite
// code the client minted) and POST /api/battles/:id/rematch (the same
// settings again, with a code minted here) both come through createBattle.
//
// The server samples the questions itself from a pool SPEC: clients never
// supply the pool (they'd need answer keys to build one, which is exactly the
// cheating vector this closes). A rematch avoids the last battle's questions,
// whose key every player saw at the end: they come back only when the rest
// of the pool can't fill it (a small subtopic), as few as it must.

'use strict';

const crypto = require('crypto');
const prisma = require('../config/db');
// Called through the module object (not destructured) so tests can patch it.
const questionPool = require('./questionPool');

// The invite-code shape battleSchemas.battleIdSchema accepts.
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ID_LENGTH = 6;
const MINT_ATTEMPTS = 5;

/** Six random A–Z0–9 characters from the crypto generator. */
function randomBattleId() {
    let id = '';
    for (let i = 0; i < ID_LENGTH; i += 1) id += ID_ALPHABET[crypto.randomInt(ID_ALPHABET.length)];
    return id;
}

/**
 * A free battle id, minted on the server. 36^6 codes make a collision rare;
 * a taken one is skipped and another drawn. The insert can still lose a race
 * for the id, so callers retry a create that fails on it.
 */
async function mintBattleId() {
    for (let i = 0; i < MINT_ATTEMPTS; i += 1) {
        const id = randomBattleId();
        const taken = await prisma.battle.findUnique({ where: { id }, select: { id: true } });
        if (!taken) return id;
    }
    throw new Error('Could not find a free battle id.');
}

/**
 * Sample the questions for `config` and create the battle, hosted by
 * `hostId`. Null when the pool has nothing for that configuration. A taken
 * id (or, for a rematch, a battle that already has one) rejects with the
 * database's unique-constraint error (P2002), as before. `avoidIds` (a
 * rematch: the last battle's questions) are drawn only to fill a short pool.
 */
async function createBattle({ hostId, battleId, config, timeLimitSecs, rematchOfId = null, avoidIds = null }) {
    const avoid = avoidIds?.length ? { avoidIds } : {};
    const pool = config.mode === 'blended'
        ? await questionPool.sampleBlendedPool(100, avoid)
        : await questionPool.samplePool({ subject: config.subject, subtopic: config.subtopic, limit: config.count, ...avoid });

    if (pool.length === 0) return null;

    return prisma.battle.create({
        data: {
            id: battleId,
            hostId,
            config: { ...config, count: pool.length },
            questions: pool,
            timeLimitSecs,
            ...(rematchOfId ? { rematchOfId } : {}),
        },
    });
}

module.exports = { createBattle, mintBattleId, randomBattleId };
