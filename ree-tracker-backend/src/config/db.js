// src/config/db.js
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Connection pool sizing is a correctness concern here, not just a perf knob.
//
// `pg` defaults to max: 10 and that default was silent. Every interactive
// transaction holds one connection for its whole duration, so ten concurrent
// telemetry writes could occupy the entire pool — and any code that issued a
// query on the MODULE-level client from inside a transaction would then wait
// forever for a connection only a transaction could release. telemetryService
// used to do exactly that (topic resolution inside the write transaction); the
// call is now hoisted out, and the size is stated explicitly so the headroom
// between "concurrent transactions" and "pool exhaustion" is visible.
//
// connectionTimeoutMillis makes exhaustion fail fast and loudly instead of
// hanging a request until the client gives up.
const POOL_MAX = Number(process.env.PG_POOL_MAX) || 15;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
});

// A pool error with no listener crashes the process on Node. Supabase drops
// idle connections routinely, so this is a normal event, not an outage.
pool.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[db] idle client error:', err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
