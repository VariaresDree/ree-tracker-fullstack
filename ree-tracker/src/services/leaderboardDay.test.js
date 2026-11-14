// The rankings requests carry today's Manila day. The service worker keeps a
// copy of each reply by URL and serves it when the server takes over 2.5 s
// (a sleeping free-tier instance, which is what the first request after
// midnight meets). Without the day, yesterday's list, with yesterday's
// streaks, answered today's request.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'u1', getIdToken: () => Promise.resolve('token') } } }));

const { fetchPaginatedLeaderboard, fetchLeaderboardMe } = await import('./dbQueries');

const reply = (body) => ({ ok: true, status: 200, headers: new Headers(), json: () => Promise.resolve(body) });
let fetched;

beforeEach(() => {
  fetched = [];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.stubGlobal('fetch', vi.fn((url) => { fetched.push(String(url)); return Promise.resolve(reply({ items: [], rank: 1, total: 1 })); }));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('rankings requests name the day', () => {
  it('the list and your rank ask for today in Manila, so a new day is a new address', async () => {
    // 15:59 UTC is 23:59 in Manila; a minute later it is the next day there.
    vi.setSystemTime(new Date('2026-11-14T15:59:00Z'));
    await fetchPaginatedLeaderboard(20, null);
    await fetchLeaderboardMe();
    vi.setSystemTime(new Date('2026-11-14T16:00:30Z'));
    await fetchPaginatedLeaderboard(20, '20');

    expect(fetched[0]).toMatch(/\/api\/leaderboard\/paginated\?limit=20&day=2026-11-14$/);
    expect(fetched[1]).toMatch(/\/api\/leaderboard\/me\?day=2026-11-14$/);
    expect(fetched[2]).toMatch(/\/api\/leaderboard\/paginated\?limit=20&cursor=20&day=2026-11-15$/);
  });
});
