import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Covers the three page-load endpoints that had no working cache:
//   /api/forecast      no cache at all, recomputed on nearly every call
//   /api/config/flags  whole-table read past a warm cache one import away
//   /api/config/tos    no cache, queried on every page load
//
// The forecast cache follows dashboardCache's shape, so its store mechanics are
// covered the same way. The interesting part is the WIRING — a cache that is
// never read, or never invalidated, is the exact bug being fixed here, and both
// look fine in review.

// Spy on the shared Prisma singleton rather than mocking the module: these
// services are CommonJS and `require` it directly, so vi.doMock never
// intercepts them. Same pattern as analyticsDashboardConcurrency.test.js.
const prisma = require('../src/config/db');
const forecastCache = require('../src/services/forecastCache');
const { getFlags, invalidateFlagCache } = require('../src/services/featureFlags');
const { getTos, invalidateTosCache, TTL_MS } = require('../src/services/tosCache');

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('forecastCache follows the house pattern', () => {
    beforeEach(() => forecastCache._store.clear());

    it('stores and returns a payload before TTL', () => {
        forecastCache.set('u1', { snapshot: { passProbability: 0.7 } });
        expect(forecastCache.get('u1')).toEqual({ snapshot: { passProbability: 0.7 } });
    });

    it('returns null for an unknown user', () => {
        expect(forecastCache.get('nobody')).toBeNull();
    });

    it('expires entries past the TTL', () => {
        forecastCache.set('u1', { snapshot: {} });
        forecastCache._store.get('u1').expiresAt = Date.now() - 1;
        expect(forecastCache.get('u1')).toBeNull();
    });

    it('keeps users apart', () => {
        forecastCache.set('u1', { snapshot: { passProbability: 0.1 } });
        forecastCache.set('u2', { snapshot: { passProbability: 0.9 } });
        expect(forecastCache.get('u1').snapshot.passProbability).toBe(0.1);
        forecastCache.invalidate('u1');
        expect(forecastCache.get('u1')).toBeNull();
        expect(forecastCache.get('u2')).not.toBeNull();   // and only that user
    });
});

describe('recordAttempts busts every page-load cache, not just some', () => {
    // The bug this pins already happened once: readinessCache was added but not
    // invalidated here, so /api/readiness lagged the dashboard by up to 60s
    // after a session. Adding a third cache is exactly when that recurs.
    it('telemetryService invalidates dashboard, readiness AND forecast', () => {
        const src = require('fs').readFileSync(
            require.resolve('../src/services/telemetryService.js'), 'utf8');
        for (const name of ['dashboardCache', 'readinessCache', 'forecastCache']) {
            expect(src).toContain(`${name}.invalidate(userId)`);
        }
    });
});

describe('/api/config/flags reads through the cache it already imported', () => {
    it('serves a second call without touching the database', async () => {
        const findMany = vi.spyOn(prisma.featureFlag, 'findMany').mockResolvedValue([
            { key: 'battles', enabled: true, payload: null },
            { key: 'push', enabled: false, payload: { hour: 20 } },
        ]);
        invalidateFlagCache();

        const first = await getFlags();
        const second = await getFlags();

        expect(findMany).toHaveBeenCalledTimes(1);          // the whole point
        expect(second).toBe(first);
        expect(first.battles).toEqual({ enabled: true, payload: null });
        expect(first.push).toEqual({ enabled: false, payload: { hour: 20 } });
    });

    it('the route no longer queries prisma directly', () => {
        // Regression guard for the actual defect: the handler rebuilt the map
        // from a findMany while importing this module purely to invalidate it.
        const src = require('fs').readFileSync(
            require.resolve('../src/routes/configRoutes.js'), 'utf8');
        const handler = src.slice(src.indexOf("router.get('/flags'"));
        const body = handler.slice(0, handler.indexOf('router.put'));
        expect(body).toContain('getFlags()');
        expect(body).not.toContain('prisma.featureFlag.findMany');
    });
});

describe('/api/config/tos is cached and declares its freshness', () => {
    it('queries once across repeated reads, and again after invalidation', async () => {
        const findMany = vi.spyOn(prisma.topic, 'findMany').mockResolvedValue([
            { subject: 'Mathematics', name: 'Algebra' },
            { subject: 'Mathematics', name: 'Calculus' },
            { subject: 'ESAS', name: 'Thermodynamics' },
        ]);
        invalidateTosCache();

        const a = await getTos();
        await getTos();
        expect(findMany).toHaveBeenCalledTimes(1);
        expect(a).toEqual({ Mathematics: ['Algebra', 'Calculus'], ESAS: ['Thermodynamics'] });

        // An admin edit must be visible immediately, not after the 5min TTL.
        invalidateTosCache();
        await getTos();
        expect(findMany).toHaveBeenCalledTimes(2);
    });

    it('serves the stale payload rather than throwing when the DB fails', async () => {
        const findMany = vi.spyOn(prisma.topic, 'findMany')
            .mockResolvedValue([{ subject: 'EE', name: 'Machines' }]);
        invalidateTosCache();
        const good = await getTos();

        // Age the entry past its TTL so the next call must re-query, then fail
        // that query. A page-load-critical endpoint should degrade, not 500.
        vi.useFakeTimers();
        vi.setSystemTime(Date.now() + TTL_MS + 1);
        findMany.mockRejectedValue(new Error('connection lost'));
        await expect(getTos()).resolves.toEqual(good);
        vi.useRealTimers();
    });

    it('the route sends a real freshness lifetime, not just an ETag', () => {
        const src = require('fs').readFileSync(
            require.resolve('../src/routes/configRoutes.js'), 'utf8');
        const handler = src.slice(src.indexOf("router.get('/tos'"));
        const body = handler.slice(0, handler.indexOf('router.put'));
        expect(body).toMatch(/Cache-Control['"],\s*['"]public, max-age=\d+/);
        expect(body).toContain('getTos()');
    });
});
