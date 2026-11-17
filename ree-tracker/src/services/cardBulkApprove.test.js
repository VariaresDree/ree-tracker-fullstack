// Accept all on 460 formula cards (2026-11-17): the server takes at most 200
// ids a request, so the queue goes in chunks of 100, one after another.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { getIdToken: async () => 'token' } } }));

import { __resetConnection } from './connection';
import { bulkApproveReferenceCards, CARD_APPROVE_CHUNK } from './dbQueries';

const ok = (body) => ({ ok: true, status: 200, json: async () => body, headers: new Headers() });

beforeEach(() => {
  __resetConnection();
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('bulkApproveReferenceCards', () => {
  it('sends 250 ids as chunks of 100, 100 and 50 and merges the results', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `c${i}`);
    fetch.mockImplementation(async (_url, init) => {
      const sent = JSON.parse(init.body).ids;
      return ok({ success: true, approved: sent.filter((id) => id !== 'c7'), failed: sent.includes('c7') ? [{ id: 'c7', reason: 'already-reviewed' }] : [] });
    });
    const progress = vi.fn();
    const res = await bulkApproveReferenceCards(ids, { onProgress: progress });
    const sizes = fetch.mock.calls.map(([, init]) => JSON.parse(init.body).ids.length);
    expect(CARD_APPROVE_CHUNK).toBe(100);
    expect(sizes).toEqual([100, 100, 50]);
    expect(res.approved).toHaveLength(249);
    expect(res.failed).toEqual([{ id: 'c7', reason: 'already-reviewed' }]);
    expect(progress.mock.calls).toEqual([[100, 250], [200, 250], [250, 250]]);
  });

  it('a chunk that fails outright marks its ids failed and the next chunk still goes', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `c${i}`);
    fetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Bulk approval failed.' }), headers: new Headers() })
      .mockImplementation(async (_url, init) => ok({ success: true, approved: JSON.parse(init.body).ids, failed: [] }));
    const res = await bulkApproveReferenceCards(ids);
    expect(res.approved).toHaveLength(50);
    expect(res.failed).toHaveLength(100);
    expect(res.failed[0]).toEqual({ id: 'c0', reason: 'request-failed' });
  });
});
