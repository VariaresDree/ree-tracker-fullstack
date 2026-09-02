// Regression coverage for the cross-account data leak found in the production
// debug audit (PR1).
//
// Two defects combined into one: `resetStore` was referenced four times in
// Profile.jsx but DEFINED NOWHERE, and the persisted store lives under a single
// IndexedDB key with no user scoping. So logging out threw after Firebase had
// already signed the user out (surfacing "Log out failed" on a SUCCESSFUL
// logout), nothing was ever cleared, and the next account on the device
// inherited the previous user's stats and un-synced attempt queue — which the
// 15s safety-net flush then POSTed under the NEW user's token.
//
// These tests pin both halves: resetStore exists and clears everything, and a
// queue whose owner doesn't match the signed-in user is quarantined rather than
// mis-attributed.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const authState = { currentUser: { uid: 'user-A' } };

vi.mock('../config/firebaseDb', () => ({ auth: authState }));

const apiRequestMock = vi.fn();
vi.mock('../services/dbQueries', () => ({
  apiRequest: (...args) => apiRequestMock(...args),
  updateCommandParameters: vi.fn(),
}));

// idb-keyval is the persist backend; keep it in-memory so the suite is hermetic.
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const { useStore } = await import('./useStore');

const seedQueue = () => {
  useStore.setState({
    ownerUid: 'user-A',
    stats: { globalStreak: 12, thetaRating: 1.4 },
    syncQueue: [
      { id: 'a1', questionId: 'q1', isCorrect: true },
      { id: 'a2', questionId: 'q2', isCorrect: false },
    ],
    pendingWrites: [{ id: 'p1', endpoint: '/x', method: 'POST', body: {} }],
    deadLetters: [],
    isAdmin: true,
    currentSessionId: 'sess-A',
  });
};

beforeEach(() => {
  apiRequestMock.mockReset();
  authState.currentUser = { uid: 'user-A' };
  idbMem.clear();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

afterEach(() => { vi.restoreAllMocks(); });

describe('resetStore', () => {
  it('exists as a callable action', () => {
    // The original bug in one line: Profile.jsx called this and it was
    // undefined, so a successful logout reported failure.
    expect(typeof useStore.getState().resetStore).toBe('function');
  });

  it('clears queues, stats, admin flag and session pointer', async () => {
    seedQueue();
    await useStore.getState().resetStore();

    const s = useStore.getState();
    expect(s.ownerUid).toBeNull();
    expect(s.stats).toBeNull();
    expect(s.syncQueue).toEqual([]);
    expect(s.pendingWrites).toEqual([]);
    expect(s.deadLetters).toEqual([]);
    expect(s.isAdmin).toBe(false);
    expect(s.currentSessionId).toBeNull();
    expect(s.currentSessionMode).toBeNull();
    expect(s.currentSubject).toBeNull();
  });

  it('clears the synchronous localStorage mirror too', async () => {
    localStorage.setItem('ree_pending_sync', JSON.stringify([{ id: 'a1' }]));
    seedQueue();
    await useStore.getState().resetStore();
    // Otherwise onRehydrateStorage would merge the previous account's attempts
    // back into the next user's queue on the next cold start.
    expect(localStorage.getItem('ree_pending_sync')).toBeNull();
  });
});

describe('flushQueueToCloud account ownership', () => {
  it('sends normally when the queue belongs to the signed-in user', async () => {
    seedQueue();
    apiRequestMock.mockResolvedValue({ updatedTheta: 1.5, skipped: 0 });

    // flushQueueToCloud resolves to undefined by design — it reports through
    // store state (syncStatus / syncQueue), not a return value.
    await useStore.getState().flushQueueToCloud();

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    const [endpoint, method] = apiRequestMock.mock.calls[0];
    expect(endpoint).toBe('/api/analytics/telemetry-bulk');
    expect(method).toBe('POST');
    expect(useStore.getState().syncQueue).toEqual([]);
  });

  it('NEVER posts one account’s attempts under another account’s token', async () => {
    seedQueue();                       // queue owned by user-A
    authState.currentUser = { uid: 'user-B' }; // a different user signs in

    await useStore.getState().flushQueueToCloud();

    // The critical assertion: no request at all. Previously these two attempts
    // were POSTed with user-B's bearer token and landed in B's analytics.
    expect(apiRequestMock).not.toHaveBeenCalled();
  });

  it('quarantines the orphaned attempts visibly instead of dropping them', async () => {
    seedQueue();
    authState.currentUser = { uid: 'user-B' };

    await useStore.getState().flushQueueToCloud();

    const s = useStore.getState();
    expect(s.syncQueue).toEqual([]);
    expect(s.ownerUid).toBe('user-B');
    expect(s.deadLetters).toHaveLength(1);
    expect(s.deadLetters[0].type).toBe('telemetry-orphaned');
    // They cannot be sent (we can no longer authenticate as their owner), but
    // they are recorded rather than silently discarded.
    expect(s.deadLetters[0].ids).toEqual(['a1', 'a2']);
  });
});

describe('flushQueueToCloud session identity', () => {
  it('reuses a persisted sessionId instead of minting one per flush', async () => {
    seedQueue();
    apiRequestMock.mockResolvedValue({ updatedTheta: 1.5, skipped: 0 });

    await useStore.getState().flushQueueToCloud();

    const [, , body] = apiRequestMock.mock.calls[0];
    expect(body.sessionId).toBe('sess-A');
  });

  it('mints a stable sessionId ONCE when none exists and stores it', async () => {
    seedQueue();
    useStore.setState({ currentSessionId: null });
    apiRequestMock.mockResolvedValue({ updatedTheta: 1.5, skipped: 0 });

    await useStore.getState().flushQueueToCloud();

    const [, , body, opts] = apiRequestMock.mock.calls[0];
    // Minting per flush changed both the ExamSession id and the derived
    // Idempotency-Key on every retry, so a retried batch looked like brand-new
    // data to the server — defeating exactly-once replay in the crash-recovery
    // case it exists for.
    expect(body.sessionId).toBeTruthy();
    expect(useStore.getState().currentSessionId).toBe(body.sessionId);
    expect(opts.idempotencyKey).toBeTruthy();
  });
});
