import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
const cache = require('../src/services/dashboardCache');

describe('dashboardCache', () => {
  beforeEach(() => cache._store.clear());

  it('stores and returns a payload before TTL', () => {
    cache.set('u1', { score: 42 });
    expect(cache.get('u1')).toEqual({ score: 42 });
  });

  it('returns null for an unknown user', () => {
    expect(cache.get('nobody')).toBeNull();
  });

  it('invalidate() drops the entry — the key to fresh dashboards after every write surface', () => {
    cache.set('u1', { score: 1 });
    cache.invalidate('u1');
    expect(cache.get('u1')).toBeNull();
  });

  it('expires entries past the TTL', () => {
    cache.set('u1', { score: 1 });
    // Force expiry by rewriting the stored expiresAt into the past.
    const entry = cache._store.get('u1');
    entry.expiresAt = Date.now() - 1;
    expect(cache.get('u1')).toBeNull();
  });

  describe('never outlives its Manila day', () => {
    // The payload carries the day's per-subject counts and the streak as it
    // stands today; one cached at 23:59:50 must not be served at 00:00:10.
    afterEach(() => vi.useRealTimers());

    it('an entry cached 10s before Manila midnight expires at midnight', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-08T15:59:50Z')); // 23:59:50 in Manila
      cache.set('u1', { streak: 3 });
      expect(cache._store.get('u1').expiresAt).toBe(Date.parse('2026-10-08T16:00:00Z'));
      vi.setSystemTime(new Date('2026-10-08T16:00:10Z')); // 00:00:10, the next day
      expect(cache.get('u1')).toBeNull();
    });

    it('away from midnight the 30s TTL applies', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-08T04:00:00Z')); // noon in Manila
      cache.set('u1', { streak: 3 });
      expect(cache._store.get('u1').expiresAt).toBe(Date.parse('2026-10-08T04:00:00Z') + cache.DASHBOARD_TTL_MS);
    });
  });
});
