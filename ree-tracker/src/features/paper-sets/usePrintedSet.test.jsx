// usePrintedSet: memory, then this device, then the server, with queued
// writes laid over; edits show at once and go out as one debounced PATCH, or
// into the offline queue when the page is hidden.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const authState = { currentUser: { uid: 'u1' } };
vi.mock('../../config/firebaseDb', () => ({ auth: authState }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
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
const { usePrintedSet } = await import('./usePrintedSet');
const { usePrintedSets, __resetPrintedSetsMemory } = await import('./usePrintedSets');
const { __resetPrintedSetMemory } = await import('./printedSetsApi');

const ID = 'K7P29QXAM3TD';
const SET_URL = `/api/user/printed-sets/${ID}`;
const set = (over = {}) => ({
  id: ID, contentId: 'c1', label: 'SET A', title: 'Electrical Engineering', code: 'EE', profile: 'custom',
  plan: { kind: 'subject', profile: 'custom', code: 'EE', title: 'Electrical Engineering' },
  sections: [{ subject: 'EE', title: 'Electrical Engineering', from: 1, to: 2 }],
  items: [
    { n: 1, subject: 'EE', text: 'One: $x^2$', options: ['a', 'b', 'c', 'd'], answer: 'b', answerIndex: 1, explanation: null },
    { n: 2, subject: 'EE', text: 'Two', options: ['a', 'b', 'c', 'd'], answer: 'a', answerIndex: 0, explanation: null },
  ],
  edits: {}, prefs: { paper: 'a4', docs: { paper: true, sheet: true, key: true }, solutions: true },
  printedAt: null, createdAt: '2026-10-21T00:00:00.000Z', ...over,
});
const offline = () => new Error('[OFFLINE]');
const notFound = () => Object.assign(new Error('Printed set not found.'), { status: 404 });
const route = (handlers) => apiRequest.mockImplementation(async (endpoint, method = 'GET', body) => {
  const h = handlers[`${method} ${endpoint}`];
  if (!h) throw new Error(`unexpected ${method} ${endpoint}`);
  return h(body);
});
const patches = () => apiRequest.mock.calls.filter(([, m]) => m === 'PATCH');

beforeEach(() => {
  apiRequest.mockReset();
  idbMem.clear();
  localStorage.clear();
  __resetPrintedSetMemory();
  __resetPrintedSetsMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'u1', pendingWrites: [], deadLetters: [] });
  useStore.getState().resetSyncBackoff();
});

describe('usePrintedSet', () => {
  it('paints from this device, then takes the server\u2019s copy and its sheet count', async () => {
    idbMem.set(`ree-user-cache-v1:printedSet:${ID}`, { uid: 'u1', value: set({ title: 'cached' }), savedAt: 1 });
    let release;
    route({
      [`GET ${SET_URL}`]: () => new Promise((r) => { release = () => r({ item: set({ title: 'server' }) }); }),
      [`GET ${SET_URL}/sheets`]: () => ({ items: [{ id: 's1' }, { id: 's2' }] }),
    });
    const { result } = renderHook(() => usePrintedSet(ID));
    await waitFor(() => expect(result.current.set?.title).toBe('cached'));
    expect(result.current.status).toBe('ready');
    await act(async () => { release(); });
    await waitFor(() => expect(result.current.set.title).toBe('server'));
    await waitFor(() => expect(result.current.sheetCount).toBe(2));
    expect(result.current.syncState).toBe('saved');
    expect(result.current.draw.items[0].text).toBe('One: $x^2$');
  });

  it('a set the server doesn\u2019t have is not found, and forgotten here', async () => {
    idbMem.set(`ree-user-cache-v1:printedSet:${ID}`, { uid: 'u1', value: set(), savedAt: 1 });
    route({ [`GET ${SET_URL}`]: () => { throw notFound(); }, [`GET ${SET_URL}/sheets`]: () => { throw notFound(); } });
    const { result } = renderHook(() => usePrintedSet(ID));
    await waitFor(() => expect(result.current.status).toBe('not-found'));
    await waitFor(() => expect(idbMem.has(`ree-user-cache-v1:printedSet:${ID}`)).toBe(false));
  });

  it('offline: missing when this device never had it, ready from a queued create', async () => {
    apiRequest.mockRejectedValue(offline());
    const missing = renderHook(() => usePrintedSet(ID));
    await waitFor(() => expect(missing.result.current.status).toBe('offline-missing'));
    missing.unmount();

    __resetPrintedSetMemory();
    useStore.setState({ pendingWrites: [{ id: 'w1', endpoint: '/api/user/printed-sets', method: 'POST', body: set(), ownerUid: 'u1', createdAt: '2026-10-21T00:00:00.000Z' }] });
    const queued = renderHook(() => usePrintedSet(ID));
    await waitFor(() => expect(queued.result.current.status).toBe('ready'));
    expect(queued.result.current.createQueued).toBe(true);
    expect(queued.result.current.syncState).toBe('queued');
  });

  it('edits show at once and go out as one PATCH after a pause', async () => {
    route({
      [`GET ${SET_URL}`]: () => ({ item: set() }),
      [`GET ${SET_URL}/sheets`]: () => ({ items: [] }),
      [`PATCH ${SET_URL}`]: (body) => ({ item: { ...set(), edits: body.edits } }),
    });
    const { result } = renderHook(() => usePrintedSet(ID));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(`${SET_URL}/sheets`));

    act(() => {
      result.current.saveEdit(1, { text: 'Edited: $\\frac{1}{2}$' });
      result.current.saveEdit(2, { answerIndex: 3 });
    });
    expect(result.current.draw.items[0].text).toBe('Edited: $\\frac{1}{2}$');
    expect(result.current.draw.items[1].answerLetter).toBe('D');
    expect(result.current.syncState).toBe('saving');
    expect(patches()).toHaveLength(0);
    await waitFor(() => expect(result.current.syncState).toBe('saved'), { timeout: 2000 });
    expect(patches()).toEqual([[SET_URL, 'PATCH', { edits: { 1: { text: 'Edited: $\\frac{1}{2}$' }, 2: { answerIndex: 3 } } }]]);
    expect(result.current.set.edits).toEqual({ 1: { text: 'Edited: $\\frac{1}{2}$' }, 2: { answerIndex: 3 } });
    // Kept on this device too.
    expect(idbMem.get(`ree-user-cache-v1:printedSet:${ID}`).value.edits[1]).toEqual({ text: 'Edited: $\\frac{1}{2}$' });
  });

  it('a hidden page puts the unsent change straight into the offline queue', async () => {
    route({ [`GET ${SET_URL}`]: () => ({ item: set() }), [`GET ${SET_URL}/sheets`]: () => ({ items: [] }) });
    const { result } = renderHook(() => usePrintedSet(ID));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    act(() => { result.current.saveEdit(1, { text: 'Kept' }); });
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(useStore.getState().pendingWrites).toEqual([
      expect.objectContaining({ endpoint: SET_URL, method: 'PATCH', body: { edits: { 1: { text: 'Kept' } } } }),
    ]);
    expect(result.current.syncState).toBe('queued');
    expect(result.current.draw.items[0].text).toBe('Kept');
  });

  it('printing is sent at once; the paper size is remembered for the next set', async () => {
    route({
      [`GET ${SET_URL}`]: () => ({ item: set() }),
      [`GET ${SET_URL}/sheets`]: () => ({ items: [] }),
      [`PATCH ${SET_URL}`]: (body) => ({ item: { ...set(), ...(body.printed ? { printedAt: 'T' } : {}), ...(body.prefs ? { prefs: body.prefs } : {}) } }),
    });
    const { result } = renderHook(() => usePrintedSet(ID));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    act(() => { result.current.markPrinted(); });
    await waitFor(() => expect(patches()).toEqual([[SET_URL, 'PATCH', { printed: true }]]));
    await waitFor(() => expect(result.current.set.printedAt).toBe('T'));

    act(() => { result.current.setPrefs({ paper: 'long' }); });
    act(() => { result.current.setPrefs({ docs: { key: false } }); });
    expect(localStorage.getItem('ree-print-paper')).toBe('long');
    expect(result.current.set.prefs).toEqual({ paper: 'long', docs: { paper: true, sheet: true, key: false }, solutions: true });
    await waitFor(() => expect(patches()).toHaveLength(2), { timeout: 2000 });
    expect(patches()[1][2]).toEqual({ prefs: { paper: 'long', docs: { paper: true, sheet: true, key: false }, solutions: true } });
  });
});

describe('usePrintedSets', () => {
  it('lists the account\u2019s sets with a queued one first, and a delete goes at once', async () => {
    const old = { id: 'OLD000000000', title: 'Old', createdAt: '2026-10-01T00:00:00.000Z', printedAt: null, _count: { sheets: 0 } };
    useStore.setState({ pendingWrites: [{ id: 'w1', endpoint: '/api/user/printed-sets', method: 'POST', body: set(), ownerUid: 'u1', createdAt: '2026-10-21T00:00:00.000Z' }] });
    apiRequest.mockImplementation(async (endpoint, method = 'GET') => {
      if (method === 'GET') return { items: [old] };
      throw offline();
    });
    // The queue can't drain (the create keeps failing), so the list is the server's plus the queued one.
    const { result } = renderHook(() => usePrintedSets());
    await waitFor(() => expect(result.current.sets?.map((s) => s.id)).toEqual([ID, 'OLD000000000']));
    expect(result.current.queuedCount).toBe(1);
    await act(async () => { await result.current.remove('OLD000000000'); });
    expect(result.current.sets.map((s) => s.id)).toEqual([ID]);
  });
});
