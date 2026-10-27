// Printed sets on the account: drawn on the device, kept on the device at
// once, then sent or queued; every later write for the set queues behind its
// create. Sign-out sweeps the per-set caches.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const authState = { currentUser: { uid: 'u1' } };
vi.mock('../../config/firebaseDb', () => ({ auth: authState }));
const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({
  apiRequest: (...a) => apiRequest(...a),
  updateCommandParameters: vi.fn(),
}));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
  keys: async () => [...idbMem.keys()],
  delMany: async (ks) => { ks.forEach((k) => idbMem.delete(k)); },
}));

const { useStore } = await import('../../store/useStore');
const api = await import('./printedSetsApi');
const { clearUserCaches, readUserCache, writeUserCache } = await import('../../services/userCache');
const { PRINT_ID_RE } = await import('@ree/shared');

const bank = (subject, n) => Array.from({ length: n }, (_, i) => ({
  id: `${subject}-${i + 1}`, subject, subtopic: 'General', text: `Question ${i + 1}: $x^2$`,
  options: ['10 V', '20 V', '30 V', '40 V'], answer: '20 V', fixedExplanation: 'Because $V = IR$.',
}));
const deps = { draw: { fetchQuestions: async (subject, _t, limit) => bank(subject, Math.min(limit, 30)), fetchWeights: async () => null } };
const CUSTOM = { mode: 'subject', subject: 'EE', isPrcStandard: false, count: 10, source: 'library', cognitiveFocus: 'mixed' };
const offline = () => new Error('[OFFLINE]');

beforeEach(() => {
  apiRequest.mockReset();
  idbMem.clear();
  localStorage.clear();
  api.__resetPrintedSetMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'u1', pendingWrites: [], deadLetters: [] });
  useStore.getState().resetSyncBackoff();
});

describe('printed sets API', () => {
  it('draws, keeps the set on this device, and sends it', async () => {
    apiRequest.mockImplementation(async (endpoint, method, body) => ({ item: { ...body, keyVersion: 'server', itemCount: body.items.length } }));
    const { set, status } = await api.createPrintedSetFromConfig(CUSTOM, deps);
    expect(status).toBe('sent');
    expect(set.id).toMatch(PRINT_ID_RE);
    expect(set.keyVersion).toBe('server');
    const [endpoint, method, body] = apiRequest.mock.calls[0];
    expect([endpoint, method]).toEqual(['/api/user/printed-sets', 'POST']);
    expect(body.items).toHaveLength(10);
    expect(body).toMatchObject({ code: 'EE', profile: 'custom', edits: {}, config: CUSTOM });
    expect(await readUserCache('u1', `printedSet:${set.id}`)).toMatchObject({ id: set.id, keyVersion: 'server' });
    expect(api.recalledSet('u1', set.id)).toMatchObject({ id: set.id });
    expect(api.recalledSet('u2', set.id)).toBeNull();
  });

  it('offline, the set is queued and still opens from this device', async () => {
    apiRequest.mockRejectedValue(offline());
    const { set, status } = await api.createPrintedSetFromConfig(CUSTOM, deps);
    expect(status).toBe('queued');
    expect(useStore.getState().pendingWrites).toEqual([
      expect.objectContaining({ endpoint: '/api/user/printed-sets', method: 'POST', body: expect.objectContaining({ id: set.id }) }),
    ]);
    expect(await api.readLocalSet('u1', set.id)).toMatchObject({ id: set.id, printedAt: null, itemCount: 10 });

    // An edit made meanwhile waits behind the create, even back online.
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const res = await api.patchPrintedSet(set.id, { printed: true });
    expect(res.status).toBe('queued');
    expect(useStore.getState().pendingWrites.map((w) => [w.method, w.endpoint])).toEqual([
      ['POST', '/api/user/printed-sets'],
      ['PATCH', `/api/user/printed-sets/${set.id}`],
    ]);
  });

  it('a refused set is forgotten on this device, with the server\u2019s reason', async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error('You can keep up to 300 printed sets.'), { status: 400 }));
    await expect(api.createPrintedSetFromConfig(CUSTOM, deps)).rejects.toMatchObject({ name: 'ExportError', message: 'You can keep up to 300 printed sets.' });
    expect([...idbMem.keys()].filter((k) => k.includes('printedSet:'))).toEqual([]);
    expect(useStore.getState().pendingWrites).toEqual([]);
  });

  it('an AI-written mock can\u2019t be printed', async () => {
    await expect(api.createPrintedSetFromConfig({ ...CUSTOM, source: 'ai' }, deps)).rejects.toMatchObject({ name: 'ExportError', code: 'ai-source' });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('sheets, edits and deletes share the set\u2019s queue key and nest under it', async () => {
    apiRequest.mockResolvedValue({ success: true });
    await api.createSheet('K7P29QXAM3TD', { id: 's1' });
    await api.patchSheet('K7P29QXAM3TD', 's1', { takerName: 'A' });
    await api.deleteSheet('K7P29QXAM3TD', 's1');
    await api.deletePrintedSet('K7P29QXAM3TD');
    expect(apiRequest.mock.calls.map(([e, m]) => `${m} ${e}`)).toEqual([
      'POST /api/user/printed-sets/K7P29QXAM3TD/sheets',
      'PATCH /api/user/printed-sets/K7P29QXAM3TD/sheets/s1',
      'DELETE /api/user/printed-sets/K7P29QXAM3TD/sheets/s1',
      'DELETE /api/user/printed-sets/K7P29QXAM3TD',
    ]);
  });

  it('reads a set and its sheets from either response shape', () => {
    expect(api.setFrom({ item: { id: 'a' } })).toEqual({ id: 'a' });
    expect(api.setFrom({ id: 'b' })).toEqual({ id: 'b' });
    expect(api.setFrom({ success: true })).toBeNull();
    expect(api.sheetsFrom({ items: [1] })).toEqual([1]);
    expect(api.sheetsFrom({ sheets: [2] })).toEqual([2]);
  });

  it('sign-out sweeps every per-set entry along with the lists', async () => {
    await writeUserCache('u1', 'printedSets', [{ id: 'x' }]);
    await writeUserCache('u1', 'printedSet:K7P29QXAM3TD', { id: 'K7P29QXAM3TD' });
    await writeUserCache('u1', 'printedSheets:K7P29QXAM3TD', []);
    idbMem.set('unrelated-key', 1);
    await clearUserCaches();
    expect([...idbMem.keys()].filter((k) => k.startsWith('ree-user-cache-v1:'))).toEqual([]);
    expect(idbMem.has('unrelated-key')).toBe(true);
  });
});
