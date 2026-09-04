import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';

// Three changes here, all of which are invisible in behaviour and only show up
// in latency or in rare 502s — the kind of settings that get "cleaned up" later
// by someone who cannot see why they were chosen. Each therefore gets a test
// that states the reason.

const db = require('../src/config/db');

describe('pool holds connections long enough to be worth having', () => {
    it('keeps idle connections far longer than the old 30s', () => {
        // Measured against production before the change, using the then-uncached
        // GET /api/config/tos so the connection was the only variable:
        //   back-to-back  0.485s / 0.484s     after 35s idle  0.807s / 0.806s
        // +322ms twice, which is a fresh TLS handshake to ap-southeast-1.
        expect(db.POOL_IDLE_MS).toBeGreaterThan(30_000);
    });

    it('outlives the tosCache TTL, or the refreshing request pays the handshake', () => {
        const { TTL_MS } = require('../src/services/tosCache');
        expect(db.POOL_IDLE_MS).toBeGreaterThan(TTL_MS);
    });

    it('does not outlive the instance itself', () => {
        // The free instance sleeps after ~15 minutes idle. Holding connections
        // longer than that would be a promise kept by a dead process, and would
        // hold Supabase connections for no benefit.
        expect(db.POOL_IDLE_MS).toBeLessThanOrEqual(15 * 60_000);
    });
});

describe('warmPool opens connections up front', () => {
    it('acquires simultaneously, so the pool cannot satisfy it with one connection', async () => {
        // The distinction that makes this work: N parallel *queries* can be
        // served by reusing a single connection, so they warm nothing. Holding
        // N clients at once forces N connections to exist.
        let concurrent = 0;
        let peak = 0;
        const release = vi.fn();
        vi.spyOn(db.pool, 'connect').mockImplementation(async () => {
            concurrent += 1;
            peak = Math.max(peak, concurrent);
            await new Promise((r) => setTimeout(r, 5));
            return { release: () => { concurrent -= 1; release(); } };
        });

        const n = await db.warmPool();
        expect(n).toBe(db.WARM_CONNECTIONS);
        expect(peak).toBe(db.WARM_CONNECTIONS);      // all held at the same time
        expect(release).toHaveBeenCalledTimes(db.WARM_CONNECTIONS);  // and given back
        vi.restoreAllMocks();
    });

    it('warms enough for the dashboard batch', () => {
        // The dashboard route issues its queries as one concurrent batch; a
        // warm-up smaller than that leaves the first page load opening the rest.
        expect(db.WARM_CONNECTIONS).toBeGreaterThanOrEqual(5);
        expect(db.WARM_CONNECTIONS).toBeLessThanOrEqual(15);   // and never exceeds POOL_MAX
    });

    it('resolves instead of throwing when the database is unreachable', async () => {
        vi.spyOn(db.pool, 'connect').mockRejectedValue(new Error('ENETUNREACH'));
        // Boot must survive this: the pool opens connections on demand anyway.
        await expect(db.warmPool()).resolves.toBe(0);
        vi.restoreAllMocks();
    });

    it('releases the clients it did get when a later acquire fails', async () => {
        // The leak: Promise.all rejects on the first failure, but the acquires
        // that already succeeded still hold connections. Without the finally
        // block those are never released and the pool bleeds a connection per
        // failed boot — worse than the problem warm-up was added to solve.
        const release = vi.fn();
        let call = 0;
        vi.spyOn(db.pool, 'connect').mockImplementation(async () => {
            call += 1;
            if (call > 2) throw new Error('pool exhausted');
            await new Promise((r) => setTimeout(r, 5));   // outlive the rejection
            return { release };
        });

        // Reports what it actually warmed rather than giving up wholesale,
        // and frees every connection it took.
        await expect(db.warmPool()).resolves.toBe(2);
        expect(release).toHaveBeenCalledTimes(2);
        vi.restoreAllMocks();
    });
});

describe('http keep-alive outlives the proxy in front of it', () => {
    const src = fs.readFileSync(require.resolve('../server.js'), 'utf8');

    it('sets keepAliveTimeout above Node\'s 5s default', () => {
        const m = src.match(/httpServer\.keepAliveTimeout\s*=\s*([\d_]+)/);
        expect(m).not.toBeNull();
        expect(Number(m[1].replace(/_/g, ''))).toBeGreaterThan(60_000);
    });

    it('keeps headersTimeout above keepAliveTimeout', () => {
        // If headersTimeout <= keepAliveTimeout, a request arriving on a reused
        // socket can trip the header timer instead of being served.
        const keep = Number(src.match(/keepAliveTimeout\s*=\s*([\d_]+)/)[1].replace(/_/g, ''));
        const headers = Number(src.match(/headersTimeout\s*=\s*([\d_]+)/)[1].replace(/_/g, ''));
        expect(headers).toBeGreaterThan(keep);
    });

    it('warms the pool at boot, before traffic is admitted', () => {
        expect(src).toContain('prisma.warmPool()');
        // Must sit before listen(), while Render's health check still gates traffic.
        expect(src.indexOf('prisma.warmPool()')).toBeLessThan(src.indexOf('httpServer.listen'));
    });
});
