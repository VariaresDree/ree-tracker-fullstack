// src/config/db.js
const fs = require('fs');
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

// TLS to Postgres.
//
// This was unconditionally `{ rejectUnauthorized: false }` under a comment that
// read "Enforce SSL". That encrypts the connection but does NOT authenticate the
// server: anything able to intercept the Render↔Supabase path could present any
// certificate and read or modify every query, including the `SELECT … FOR UPDATE`
// user reads on the telemetry write path.
//
// Verification is now the default whenever it can succeed:
//   • DATABASE_CA_CERT  — PEM contents of the provider's CA bundle (paste into
//                         the Render dashboard), or
//   • DATABASE_CA_PATH  — path to that bundle on disk, or
//   • DATABASE_SSL_STRICT=true — verify against Node's built-in trust store,
//                         which works for providers using a publicly-trusted CA.
//
// Absent all three it falls back to the previous unverified behaviour rather
// than failing closed, because flipping verification on for a self-signed
// provider certificate would take the API down on deploy. The warning below
// makes the remaining gap visible instead of silent.
function buildSslConfig() {
    const inlineCa = process.env.DATABASE_CA_CERT;
    if (inlineCa) return { rejectUnauthorized: true, ca: inlineCa };

    const caPath = process.env.DATABASE_CA_PATH;
    if (caPath) {
        try {
            return { rejectUnauthorized: true, ca: fs.readFileSync(caPath, 'utf8') };
        } catch (err) {
            console.error(`[db] DATABASE_CA_PATH set but unreadable (${err.message}); refusing to start.`);
            process.exit(1);
        }
    }

    if (String(process.env.DATABASE_SSL_STRICT).toLowerCase() === 'true') {
        return { rejectUnauthorized: true };
    }

    if (process.env.NODE_ENV === 'production') {
        console.warn(
            '[db] TLS certificate verification is DISABLED for the database connection. '
            + 'Set DATABASE_CA_CERT (or DATABASE_CA_PATH, or DATABASE_SSL_STRICT=true) to enable it.'
        );
    }
    return { rejectUnauthorized: false };
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: buildSslConfig(),
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
