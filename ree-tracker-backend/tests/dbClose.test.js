import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { spawn } from 'child_process';

// Operator scripts used to finish their work in seconds, then hang for up to
// 10 minutes: config/db.js hands Prisma a pg Pool it builds itself (idle
// timeout POOL_IDLE_MS = 10 min, tuned for the server), and prisma.$disconnect()
// does not end a pool the adapter doesn't own — idle clients kept the event
// loop alive. closeDb() ends both.
const db = require('../src/config/db');
const backendDir = path.resolve(__dirname, '..');

afterEach(() => {
    vi.restoreAllMocks();
    db.pool.ending = false;
});

describe('closeDb', () => {
    it('disconnects Prisma, then ends the pool', async () => {
        const order = [];
        vi.spyOn(db, '$disconnect').mockImplementation(async () => { order.push('prisma'); });
        vi.spyOn(db.pool, 'end').mockImplementation(async () => { order.push('pool'); });

        await db.closeDb();

        expect(order).toEqual(['prisma', 'pool']);
    });

    it('is safe to call on a pool that is already ending', async () => {
        // `ending` is the flag pg's own end() checks before it throws.
        vi.spyOn(db, '$disconnect').mockResolvedValue();
        const end = vi.spyOn(db.pool, 'end').mockResolvedValue();
        db.pool.ending = true;

        await db.closeDb();

        expect(end).not.toHaveBeenCalled();
    });

    it('still ends the pool when $disconnect fails, and reports the failure', async () => {
        // A script's finally is the last chance to free the pool. Skipping
        // pool.end() because disconnect threw would bring the hang back.
        vi.spyOn(db, '$disconnect').mockRejectedValue(new Error('disconnect failed'));
        const end = vi.spyOn(db.pool, 'end').mockResolvedValue();

        await expect(db.closeDb()).rejects.toThrow('disconnect failed');
        expect(end).toHaveBeenCalledTimes(1);
    });
});

// The real thing, end to end: a child process that holds an idle pooled
// connection, the way a script does after its last query. The "server" only
// speaks enough of the Postgres protocol to complete a startup handshake,
// which is all an idle connection ever needs.
describe('a process holding an idle connection', () => {
    function fakePostgres() {
        const server = net.createServer((socket) => {
            socket.once('data', () => {
                // StartupMessage in; AuthenticationOk + ReadyForQuery(idle) out.
                const authOk = Buffer.from([0x52, 0, 0, 0, 8, 0, 0, 0, 0]);
                const ready = Buffer.from([0x5a, 0, 0, 0, 5, 0x49]);
                socket.write(Buffer.concat([authOk, ready]));
            });
            socket.on('end', () => socket.end());
            socket.on('error', () => {});
        });
        return new Promise((resolve) => {
            server.listen(0, '127.0.0.1', () => resolve(server));
        });
    }

    // Resolves with the child's exit code, or 'still running' if it outlives
    // the deadline (in which case it is killed).
    function runWithIdleConnection(body, port, deadlineMs) {
        const code = `
            const db = require('./src/config/db');
            (async () => {
                const client = await db.pool.connect();
                client.release();
                ${body}
            })().catch((err) => { console.error(err.message); process.exit(1); });
        `;
        const child = spawn(process.execPath, ['-e', code], {
            cwd: backendDir,
            env: {
                ...process.env,
                NODE_ENV: 'test',
                DATABASE_URL: `postgres://u:p@127.0.0.1:${port}/db?sslmode=disable`,
            },
            stdio: ['ignore', 'ignore', 'pipe'],
        });
        let stderr = '';
        child.stderr.on('data', (d) => { stderr += d; });
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                child.kill();
                resolve({ outcome: 'still running', stderr });
            }, deadlineMs);
            child.on('exit', (exitCode) => {
                clearTimeout(timer);
                resolve({ outcome: exitCode, stderr });
            });
        });
    }

    it('exits as soon as closeDb() resolves', async () => {
        const server = await fakePostgres();
        try {
            const res = await runWithIdleConnection('await db.closeDb();', server.address().port, 8_000);
            expect(res).toEqual({ outcome: 0, stderr: '' });
        } finally {
            server.close();
        }
    }, 15_000);

    it('survives a second closeDb() while a client is still checked out', async () => {
        // pg throws "Called end on pool more than once" whenever `ending` is
        // set. `ended` only follows once every client is back, so a guard on
        // `ended` lets the second call through while a query is in flight.
        const server = await fakePostgres();
        try {
            const res = await runWithIdleConnection(`
                const busy = await db.pool.connect();
                const closing = Promise.all([db.closeDb(), db.closeDb()]);
                setTimeout(() => busy.release(), 50);
                await closing;
            `, server.address().port, 8_000);
            expect(res).toEqual({ outcome: 0, stderr: '' });
        } finally {
            server.close();
        }
    }, 15_000);
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
