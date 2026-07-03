import { describe, it, expect, beforeEach } from 'vitest';
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
});
