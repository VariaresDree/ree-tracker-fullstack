import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Operator scripts used to finish their work in seconds, then hang for up to
// 10 minutes: config/db.js hands Prisma a pg Pool it builds itself (idle
// timeout POOL_IDLE_MS = 10 min, tuned for the server), and prisma.$disconnect()
// does not end a pool the adapter doesn't own — idle clients kept the event
// loop alive. closeDb() ends both.
const db = require('../src/config/db');

afterEach(() => {
    vi.restoreAllMocks();
    db.pool.ended = false;
});

describe('closeDb', () => {
    it('disconnects Prisma, then ends the pool', async () => {
        const order = [];
        vi.spyOn(db, '$disconnect').mockImplementation(async () => { order.push('prisma'); });
        vi.spyOn(db.pool, 'end').mockImplementation(async () => { order.push('pool'); });

        await db.closeDb();

        expect(order).toEqual(['prisma', 'pool']);
    });

    it('is safe to call on an already-ended pool', async () => {
        vi.spyOn(db, '$disconnect').mockResolvedValue();
        const end = vi.spyOn(db.pool, 'end').mockResolvedValue();
        db.pool.ended = true;

        await db.closeDb();

        expect(end).not.toHaveBeenCalled();
    });
});

describe('operator scripts close the DB through closeDb', () => {
    const dir = path.join(__dirname, '..', 'scripts');
    const scripts = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
    const usesDb = scripts.filter((f) => fs.readFileSync(path.join(dir, f), 'utf8').includes("require('../src/config/db')"));

    it('found the scripts that use the database', () => {
        expect(usesDb).toEqual(expect.arrayContaining(['linkQuestionTopics.js', 'backfillMastery.js', 'migrateTaxonomy.js']));
    });

    it.each(usesDb)('%s ends the pool (closeDb), never a bare $disconnect', (file) => {
        const src = fs.readFileSync(path.join(dir, file), 'utf8');
        expect(src).toMatch(/closeDb\(\)/);
        expect(src).not.toMatch(/\$disconnect\(\)/);
    });
});
