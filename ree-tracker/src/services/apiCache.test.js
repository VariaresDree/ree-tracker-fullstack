import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// This module is the only thing standing between two accounts on one browser
// and each other's board-readiness scores. /api/readiness, /api/forecast and
// /api/leaderboard/me carry no uid in their URLs, so the SW cache key cannot
// tell users apart — ownership is what does. Every branch that decides "keep"
// vs "purge" is therefore tested, including the ones that look like edge cases.

const { API_CACHE_NAME, purgeApiCache, claimApiCacheFor } = await import('./apiCache');

let deleted;

beforeEach(() => {
    deleted = [];
    localStorage.clear();
    vi.stubGlobal('caches', {
        delete: vi.fn(async (name) => { deleted.push(name); return true; }),
    });
});

afterEach(() => vi.unstubAllGlobals());

describe('purge', () => {
    it('deletes the cache the service worker actually writes', async () => {
        await purgeApiCache();
        expect(deleted).toEqual([API_CACHE_NAME]);
        expect(API_CACHE_NAME).toBe('api-user-data');   // must match vite.config.js
    });

    it('clears the owner record too, so nothing later claims a hit', async () => {
        await claimApiCacheFor('user-a');
        await purgeApiCache();
        deleted = [];
        // If the owner had survived, re-claiming as A would take the "same
        // user, keep the cache" branch and skip the purge.
        await claimApiCacheFor('user-a');
        expect(deleted).toEqual([API_CACHE_NAME]);
    });
});

describe('claim', () => {
    it('purges on first claim, when the owner is unknown', async () => {
        // The leak this closes: localStorage and Cache Storage clear
        // independently, so a missing owner record can front a populated cache
        // written by someone else. Unknown must be treated as untrusted.
        await claimApiCacheFor('user-a');
        expect(deleted).toEqual([API_CACHE_NAME]);
    });

    it('does NOT purge when the same user reloads', async () => {
        await claimApiCacheFor('user-a');
        deleted = [];
        await claimApiCacheFor('user-a');
        await claimApiCacheFor('user-a');
        // Purging here would wipe the cache on every boot and the cold-start
        // fallback would never have anything to serve.
        expect(deleted).toEqual([]);
    });

    it('purges when a different user signs in', async () => {
        await claimApiCacheFor('user-a');
        deleted = [];
        await claimApiCacheFor('user-b');
        expect(deleted).toEqual([API_CACHE_NAME]);
    });

    it('purges when signed out (no uid)', async () => {
        await claimApiCacheFor('user-a');
        deleted = [];
        await claimApiCacheFor(null);
        expect(deleted).toEqual([API_CACHE_NAME]);
    });

    it('does not leave user A as owner after B takes over', async () => {
        await claimApiCacheFor('user-a');
        await claimApiCacheFor('user-b');
        deleted = [];
        await claimApiCacheFor('user-b');
        expect(deleted).toEqual([]);          // B now owns it
        await claimApiCacheFor('user-a');
        expect(deleted).toEqual([API_CACHE_NAME]);   // and A is a stranger again
    });
});

describe('degrades instead of throwing', () => {
    it('survives a browser with no Cache Storage', async () => {
        vi.stubGlobal('caches', undefined);
        await expect(purgeApiCache()).resolves.toBe(false);
        await expect(claimApiCacheFor('user-a')).resolves.toBe(true);
    });

    it('survives caches.delete rejecting', async () => {
        vi.stubGlobal('caches', { delete: vi.fn(async () => { throw new Error('nope'); }) });
        await expect(purgeApiCache()).resolves.toBe(false);
    });

    it('survives localStorage throwing, and still purges', async () => {
        const boom = () => { throw new Error('private mode'); };
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);

        // Owner is unreadable, so every claim is untrusted and must purge.
        // Failing closed is the right direction for a data-separation guard.
        await expect(claimApiCacheFor('user-a')).resolves.toBe(true);
        expect(deleted).toEqual([API_CACHE_NAME]);
    });
});
