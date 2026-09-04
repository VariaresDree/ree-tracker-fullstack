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

// How long an unused connection is kept open.
//
// This was 30s, and that number was costing ~322ms on most real requests.
// Measured against production before changing it, using GET /api/config/tos
// (then uncached, one indexed query) so the only variable was the connection:
//
//   back-to-back requests, pool warm    0.485s   0.484s
//   the same request after 35s idle     0.807s   0.806s
//
// Two independent rounds, +322ms each. That is a fresh TLS handshake to
// ap-southeast-1 — the pool had torn the connection down at 30s and the next
// caller paid to rebuild it. Nobody browsing an app issues requests less than
// 30 seconds apart forever, so nearly every page load was paying this.
//
// 10 minutes rather than something larger: the free instance sleeps after ~15
// minutes idle, so anything past that is held by a process that no longer
// exists. It also has to exceed the 5-minute tosCache TTL, or the request that
// refreshes that cache would find a dead pool and pay the handshake anyway.
//
// If Supavisor closes a connection first, node-pg emits 'error' on the idle
// client and drops it (handler below) — the next caller then pays exactly what
// it used to pay under the 30s timeout. So this cannot be worse than before; it
// only wins when the connection survives.
const POOL_IDLE_MS = Number(process.env.PG_POOL_IDLE_MS) || 10 * 60_000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: buildSslConfig(),
    max: POOL_MAX,
    idleTimeoutMillis: POOL_IDLE_MS,
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

// Open several connections before the first request needs them.
//
// server.js probes the database at boot with a single `SELECT 1`, which warms
// exactly ONE connection. The dashboard route then issues its queries as one
// concurrent batch, so the first real page load was opening the rest — several
// trans-Pacific TLS handshakes at once, on the request a user is waiting for.
//
// Acquires clients simultaneously and holds them until all are up: running N
// queries in parallel would not do, because the pool can satisfy them by
// reusing one connection. Releasing returns them to the pool, where
// POOL_IDLE_MS now keeps them.
//
// Best-effort by design. It runs before Render's health check passes, so it is
// off the request path, and a failure here must never stop the server booting —
// the pool will just open connections on demand, exactly as it did before.
const WARM_CONNECTIONS = Math.min(POOL_MAX, Number(process.env.PG_POOL_WARM) || 5);

async function warmPool() {
    // allSettled, NOT all. Promise.all rejects the moment one acquire fails,
    // which leaves the acquires that already SUCCEEDED holding connections that
    // are never released — a leaked connection per failed boot, which is worse
    // than the cold handshake this exists to avoid. It also means a partial
    // failure still warms whatever it can instead of warming nothing.
    const results = await Promise.allSettled(
        Array.from({ length: WARM_CONNECTIONS }, () => pool.connect()),
    );

    let warmed = 0;
    let firstError = null;
    for (const r of results) {
        if (r.status === 'fulfilled') {
            warmed += 1;
            try { r.value.release(); } catch { /* already gone */ }
        } else if (!firstError) {
            firstError = r.reason;
        }
    }

    if (firstError) {
        // eslint-disable-next-line no-console
        console.warn(`[db] pool warm-up partial (${warmed}/${WARM_CONNECTIONS}):`, firstError.message);
    }
    return warmed;
}

module.exports = prisma;
module.exports.warmPool = warmPool;
module.exports.pool = pool;
module.exports.POOL_IDLE_MS = POOL_IDLE_MS;
module.exports.WARM_CONNECTIONS = WARM_CONNECTIONS;
