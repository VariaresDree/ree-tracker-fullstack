#!/usr/bin/env node
'use strict';

// `prisma migrate deploy` for the Render build, retried when the database
// can't hand out a connection.
//
// Migrations need Supavisor's SESSION pooler (port 5432; the transaction
// pooler can't hold the advisory lock migrate takes), and on Supabase's free
// tier that pooler allows 15 clients in total. During a deploy the running
// instance still holds its pool, so the build's single connection can be
// refused with "EMAXCONNSESSION max clients reached". That is what failed the
// 2026-10-13 deploy of 036843e; the same command succeeded eight minutes
// earlier. A refused connection is transient, so it is retried with a growing
// wait. Anything else (a migration whose SQL fails, a P3009 failed-migration
// record, a checksum mismatch) is not, and fails the build on the first try.
//
// Usage (from ree-tracker-backend/): npm run migrate:deploy

const { spawnSync } = require('child_process');

const WAITS_S = [10, 20, 30, 45];

// Errors that mean "no connection right now", not "the migration is wrong".
const TRANSIENT = [
    /EMAXCONNSESSION/i,
    /max clients reached/i,
    /too many (clients|connections)/i,
    /remaining connection slots are reserved/i,
    /\bP1001\b/, // can't reach database server
    /\bP1002\b/, // database server timed out
    /\bP1017\b/, // server closed the connection
    /Can't reach database server/i,
    /ECONNRESET|ETIMEDOUT|ECONNREFUSED/,
];

const isTransient = (output) => TRANSIENT.some((re) => re.test(output));

function runOnce() {
    // npx resolves to npx.cmd on Windows, which needs a shell. No credential
    // is passed as an argument; prisma reads DATABASE_URL via prisma.config.ts.
    const res = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
        encoding: 'utf8',
        shell: process.platform === 'win32',
        env: process.env,
    });
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    if (res.error) return { ok: false, output: String(res.error.message) };
    return { ok: res.status === 0, output: `${res.stdout || ''}\n${res.stderr || ''}` };
}

function sleep(seconds) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

function main() {
    for (let attempt = 0; ; attempt += 1) {
        const { ok, output } = runOnce();
        if (ok) return 0;
        if (!isTransient(output) || attempt >= WAITS_S.length) return 1;
        const wait = WAITS_S[attempt];
        console.warn(`[migrate] database refused a connection; retrying in ${wait}s (attempt ${attempt + 2} of ${WAITS_S.length + 1})`);
        sleep(wait);
    }
}

if (require.main === module) process.exit(main());

module.exports = { isTransient, WAITS_S };
