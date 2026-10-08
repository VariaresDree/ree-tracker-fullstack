// writeOrQueue + queuePendingWrite({ supersede }) + userCache: the offline
// path for per-user lists the learner edits by hand (outside scores).
// Same hermetic store setup as store/useStore.syncIntegrity.test.js.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const authState = { currentUser: { uid: 'user-A' } };
vi.mock('../config/firebaseDb', () => ({ auth: authState }));

const apiRequestMock = vi.fn();
vi.mock('./dbQueries', () => ({
  apiRequest: (...args) => apiRequestMock(...args),
  updateCommandParameters: vi.fn(),
}));

const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const { useStore } = await import('../store/useStore');
const { writeOrQueue, pendingWritesFor } = await import('./writeOrQueue');
const { readUserCache, writeUserCache, clearUserCaches } = await import('./userCache');

const KEY = '/api/user/outside-scores';
const offline = () => Object.assign(new Error('[OFFLINE]'));
const status = (n) => Object.assign(new Error(`HTTP ${n}`), { status: n });

beforeEach(() => {
  apiRequestMock.mockReset();
  authState.currentUser = { uid: 'user-A' };
  idbMem.clear();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'user-A', pendingWrites: [], deadLetters: [] });
  useStore.getState().resetSyncBackoff();
});

describe('writeOrQueue', () => {
  it('sends straight away when nothing for the list is waiting', async () => {
    apiRequestMock.mockResolvedValue({ item: { id: 'x' } });
    const result = await writeOrQueue(KEY, 'POST', { id: 'x' }, { queueKey: KEY });
    expect(result).toEqual({ status: 'sent', data: { item: { id: 'x' } } });
    expect(useStore.getState().pendingWrites).toEqual([]);
  });

  it.each([
    ['offline', offline()],
    ['a timeout or 5xx', status(503)],
    ['a 409 from the idempotency layer', status(409)],
  ])('queues it, stamped with the account, when %s', async (_label, err) => {
    apiRequestMock.mockRejectedValue(err);
    const result = await writeOrQueue(KEY, 'POST', { id: 'x' }, { queueKey: KEY });
    expect(result).toEqual({ status: 'queued' });
    expect(useStore.getState().pendingWrites).toEqual([
      expect.objectContaining({ endpoint: KEY, method: 'POST', body: { id: 'x' }, ownerUid: 'user-A' }),
    ]);
  });

  it('throws a permanent rejection instead of queueing a write that can never land', async () => {
    apiRequestMock.mockRejectedValue(status(400));
    await expect(writeOrQueue(KEY, 'POST', { id: 'x' }, { queueKey: KEY })).rejects.toMatchObject({ status: 400 });
    expect(useStore.getState().pendingWrites).toEqual([]);
  });

  it('queues behind writes already waiting for the same list, so an edit never overtakes its own create', async () => {
    useStore.getState().queuePendingWrite(KEY, 'POST', { id: 'x', score: 1 });
    apiRequestMock.mockResolvedValue({});
    const result = await writeOrQueue(`${KEY}/x`, 'PUT', { score: 2 }, { queueKey: KEY });
    expect(result).toEqual({ status: 'queued' });
    // Online, so it starts draining at once — create first, then the edit.
    await vi.waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    expect(apiRequestMock.mock.calls.map((c) => `${c[1]} ${c[0]}`)).toEqual([`POST ${KEY}`, `PUT ${KEY}/x`]);
    expect(pendingWritesFor(KEY)).toEqual([]);
  });

  it('a write for another list is not held back', async () => {
    useStore.getState().queuePendingWrite('/api/materials/folders', 'POST', { name: 'A' });
    apiRequestMock.mockResolvedValue({ item: {} });
    const result = await writeOrQueue(KEY, 'POST', { id: 'x' }, { queueKey: KEY });
    expect(result.status).toBe('sent');
  });
});

describe('queuePendingWrite({ supersede })', () => {
  it('keeps only the newest full-state PUT for an endpoint', () => {
    const { queuePendingWrite } = useStore.getState();
    queuePendingWrite(KEY, 'POST', { id: 'x' });
    queuePendingWrite(`${KEY}/x`, 'PUT', { score: 1 }, { supersede: true });
    queuePendingWrite(`${KEY}/y`, 'PUT', { score: 5 }, { supersede: true });
    queuePendingWrite(`${KEY}/x`, 'PUT', { score: 2 }, { supersede: true });
    expect(useStore.getState().pendingWrites.map((w) => `${w.method} ${w.endpoint} ${JSON.stringify(w.body)}`)).toEqual([
      `POST ${KEY} {"id":"x"}`,
      `PUT ${KEY}/y {"score":5}`,
      `PUT ${KEY}/x {"score":2}`,
    ]);
  });

  it('never drops another account’s queued write', () => {
    useStore.setState({ pendingWrites: [{ id: 'w1', endpoint: `${KEY}/x`, method: 'PUT', body: { score: 1 }, ownerUid: 'user-B' }] });
    useStore.getState().queuePendingWrite(`${KEY}/x`, 'PUT', { score: 2 }, { supersede: true });
    expect(useStore.getState().pendingWrites).toHaveLength(2);
  });
});

describe('userCache', () => {
  it('reads back only for the account that wrote it, and clears on reset', async () => {
    await writeUserCache('user-A', 'outsideScores', [{ id: 'x' }]);
    expect(await readUserCache('user-A', 'outsideScores')).toEqual([{ id: 'x' }]);
    expect(await readUserCache('user-B', 'outsideScores')).toBeNull();
    await clearUserCaches();
    expect(await readUserCache('user-A', 'outsideScores')).toBeNull();
  });

  it('sign-out clears it with the rest of the store', async () => {
    await writeUserCache('user-A', 'outsideScores', [{ id: 'x' }]);
    await useStore.getState().resetStore();
    expect(await readUserCache('user-A', 'outsideScores')).toBeNull();
  });
});
