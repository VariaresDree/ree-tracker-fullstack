import { describe, it, expect, vi, beforeEach } from 'vitest';

// Standard or Large: a change of size has to download again even though the bank
// hasn't changed, and a failed download has to be tried again rather than marked done.
let stored = null;
vi.mock('idb-keyval', () => ({
  get: async () => stored,
  set: async (_k, v) => { stored = v; },
  del: async () => { stored = null; },
  createStore: () => ({}),
}));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'u1', getIdToken: async () => 't' } } }));

const { refreshOfflinePack } = await import('./dbQueries');
const { getOfflinePackMeta, savePackSizeName, selectFromPack, PACK_SIZES } = await import('./offlinePack');

const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
const manifest = { subjects: Object.fromEntries(SUBJECTS.map((s) => [s, { checksum: `sum-${s}` }])) };
let failing = null;
const questionCalls = () => fetch.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/api/questions?'));

beforeEach(() => {
  stored = null;
  failing = null;
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('pack-manifest')) return new Response(JSON.stringify(manifest), { status: 200 });
    const params = new URL(u).searchParams;
    if (params.get('subject') === failing) return new Response('{}', { status: 500 });
    const n = Math.min(Number(params.get('limit')), 2);
    return new Response(JSON.stringify({ items: Array.from({ length: n }, (_, i) => ({ id: `${params.get('subject')}-${i}`, text: 'x', options: [], answer: 'A', subject: params.get('subject') })) }), { status: 200 });
  }));
});

describe('a response from the service worker’s cache', () => {
  it('doesn’t count as the server answering', async () => {
    const { __resetConnection, getConnection, noteNetworkFailure } = await import('./connection');
    const { apiRequest } = await import('./dbQueries');
    __resetConnection();
    noteNetworkFailure(0);
    expect(getConnection().backendUp).toBe(false);

    fetch.mockResolvedValueOnce(new Response('{}', { status: 200, headers: { 'x-from-sw-cache': '1' } }));
    await apiRequest('/api/readiness');
    expect(getConnection().backendUp).toBe(false);

    fetch.mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await apiRequest('/api/readiness');
    expect(getConnection().backendUp).toBe(true);
    __resetConnection();
  });
});

describe('the pack’s size', () => {
  it('Standard asks for 400 a subject, and nothing again while the bank is the same', async () => {
    await refreshOfflinePack();
    expect(questionCalls()).toHaveLength(3);
    expect(questionCalls()[0]).toContain('limit=400');
    expect(stored.perSubject).toBe(400);
    await refreshOfflinePack();
    expect(questionCalls()).toHaveLength(3);
  });

  it('choosing Large downloads again though nothing changed, and is marked until it’s there', async () => {
    await refreshOfflinePack();
    fetch.mockClear();
    savePackSizeName('large');
    expect((await getOfflinePackMeta()).stale).toBe(true);
    await refreshOfflinePack();
    expect(questionCalls()).toHaveLength(3);
    expect(questionCalls()[0]).toContain('limit=2000');
    expect(stored.perSubject).toBe(2000);
    expect((await getOfflinePackMeta()).stale).toBe(false);
  });

  it('a pack from before the choice counts as Standard', async () => {
    await refreshOfflinePack();
    delete stored.perSubject;
    fetch.mockClear();
    await refreshOfflinePack();
    expect(questionCalls()).toHaveLength(0);
  });

  it('a failed subject keeps what it had, and the larger size stays not done', async () => {
    await refreshOfflinePack();
    savePackSizeName('large');
    failing = 'EE';
    await refreshOfflinePack();
    expect(stored.subjects.EE).toHaveLength(2);
    expect(stored.perSubject).toBe(PACK_SIZES.standard);
    expect((await getOfflinePackMeta()).stale).toBe(true);
    failing = null;
    fetch.mockClear();
    await refreshOfflinePack();
    expect(questionCalls()).toHaveLength(3);
    expect(stored.perSubject).toBe(PACK_SIZES.large);
  });
});

describe('selectFromPack across all subjects', () => {
  const many = (subject) => Array.from({ length: 2000 }, (_, i) => ({ id: `${subject}${i}`, subject, subtopic: 'T' }));
  const large = { subjects: { Mathematics: many('Mathematics'), ESAS: many('ESAS'), EE: many('EE') } };

  it('gives each subject an even share, not 1,000 from the first', () => {
    const out = selectFromPack(large, 'All', 'All', 1000);
    expect(out).toHaveLength(1000);
    for (const s of SUBJECTS) expect(out.filter((q) => q.subject === s).length).toBeGreaterThanOrEqual(330);
  });
});
