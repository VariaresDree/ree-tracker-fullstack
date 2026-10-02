// Sync integrity: nothing a learner answered may be lost to the sync pipeline
// itself.
//
// Two defects, both data loss:
//
//  1. flushQueueToCloud sent the WHOLE queue in one POST. The queue is capped at
//     5000; the server's schema allows 500. A learner who banked more than 500
//     answers offline got a 400 — correctly classified PERMANENT by the sync
//     policy — and every one of those attempts was dead-lettered at once.
//
//  2. Dead letters kept only attempt IDS. Whatever went to quarantine could
//     never be recovered, even when the cause (like #1) was the client's own.
//
// Same hermetic store setup as useStore.accountIsolation.test.js.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TELEMETRY_BATCH_MAX } from '@ree/shared';

const authState = { currentUser: { uid: 'user-A' } };
vi.mock('../config/firebaseDb', () => ({ auth: authState }));

const apiRequestMock = vi.fn();
vi.mock('../services/dbQueries', () => ({
  apiRequest: (...args) => apiRequestMock(...args),
  updateCommandParameters: vi.fn(),
}));

const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const { useStore } = await import('./useStore');

const attempts = (n, prefix = 'a') =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${String(i).padStart(5, '0')}`, questionId: `q${i}`, isCorrect: i % 2 === 0 }));

const seed = (queue, extra = {}) => {
  useStore.setState({
    ownerUid: 'user-A',
    stats: { globalStreak: 0 },
    syncQueue: queue,
    pendingWrites: [],
    deadLetters: [],
    currentSessionId: 'sess-A',
    currentSessionMode: 'ACTIVE_REVIEW',
    syncStatus: 'synced',
    ...extra,
  });
};

beforeEach(() => {
  apiRequestMock.mockReset();
  authState.currentUser = { uid: 'user-A' };
  idbMem.clear();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.getState().resetSyncBackoff();
});

afterEach(() => { vi.restoreAllMocks(); });

describe('flushQueueToCloud chunking', () => {
  it('sends a queue larger than the server cap in batches, losing nothing', async () => {
    seed(attempts(TELEMETRY_BATCH_MAX + 100));
    apiRequestMock.mockResolvedValue({ updatedTheta: 0.2 });

    await useStore.getState().flushQueueToCloud();

    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    const sizes = apiRequestMock.mock.calls.map(([, , body]) => body.attempts.length);
    expect(sizes).toEqual([TELEMETRY_BATCH_MAX, 100]);
    // Every batch carries its own idempotency key, so a retried chunk replays
    // instead of colliding with its sibling.
    const keys = apiRequestMock.mock.calls.map(([, , , opts]) => opts.idempotencyKey);
    expect(new Set(keys).size).toBe(2);

    const s = useStore.getState();
    expect(s.syncQueue).toEqual([]);
    expect(s.deadLetters).toEqual([]);
    expect(s.syncStatus).toBe('synced');
  });

  it('a transient failure on a later chunk keeps exactly the unsent attempts', async () => {
    seed(attempts(TELEMETRY_BATCH_MAX + 20));
    apiRequestMock
      .mockResolvedValueOnce({ updatedTheta: 0.2 })
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 502 }));

    await useStore.getState().flushQueueToCloud();

    const s = useStore.getState();
    expect(s.syncQueue).toHaveLength(20);
    expect(s.deadLetters).toEqual([]);
  });
});

describe('dead letters keep their payload', () => {
  it('a permanently rejected batch is quarantined WITH its attempts', async () => {
    const queue = attempts(3);
    seed(queue);
    apiRequestMock.mockRejectedValue(Object.assign(new Error('Validation failed.'), { status: 400 }));

    await useStore.getState().flushQueueToCloud();

    const [letter] = useStore.getState().deadLetters;
    expect(letter.type).toBe('telemetry');
    expect(letter.attempts.map((a) => a.id)).toEqual(queue.map((a) => a.id));
  });

  it('retryDeadLetter puts the attempts back on the queue and flushes them', async () => {
    seed(attempts(3));
    apiRequestMock.mockRejectedValueOnce(Object.assign(new Error('Validation failed.'), { status: 400 }));
    await useStore.getState().flushQueueToCloud();
    const [letter] = useStore.getState().deadLetters;

    apiRequestMock.mockResolvedValue({ updatedTheta: 0.1 });
    await useStore.getState().retryDeadLetter(letter.id);

    const s = useStore.getState();
    expect(s.deadLetters).toEqual([]);
    expect(s.syncQueue).toEqual([]);
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
  });

  it('a quarantined pending write keeps endpoint, method and body, and can be retried', async () => {
    seed([], { pendingWrites: [{ id: 'w1', endpoint: '/api/exams/grade', method: 'POST', body: { answers: [1] } }] });
    apiRequestMock.mockRejectedValueOnce(Object.assign(new Error('Bad'), { status: 422 }));
    await useStore.getState().flushPendingWrites();

    const [letter] = useStore.getState().deadLetters;
    expect(letter.type).toBe('pendingWrite');
    expect(letter.write).toMatchObject({ endpoint: '/api/exams/grade', method: 'POST', body: { answers: [1] } });

    apiRequestMock.mockResolvedValue({ ok: true });
    await useStore.getState().retryDeadLetter(letter.id);
    expect(useStore.getState().deadLetters).toEqual([]);
    expect(useStore.getState().pendingWrites).toEqual([]);
  });

  it('discardDeadLetter removes it for good', async () => {
    seed(attempts(2));
    apiRequestMock.mockRejectedValue(Object.assign(new Error('Validation failed.'), { status: 400 }));
    await useStore.getState().flushQueueToCloud();
    const [letter] = useStore.getState().deadLetters;

    useStore.getState().discardDeadLetter(letter.id);
    expect(useStore.getState().deadLetters).toEqual([]);
  });

  it('an orphaned batch (another account’s) can be discarded but never retried as this user', async () => {
    seed(attempts(2));
    authState.currentUser = { uid: 'user-B' };
    await useStore.getState().flushQueueToCloud();
    const [letter] = useStore.getState().deadLetters;
    expect(letter.type).toBe('telemetry-orphaned');

    await useStore.getState().retryDeadLetter(letter.id);
    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(useStore.getState().syncQueue).toEqual([]);
    expect(useStore.getState().deadLetters).toHaveLength(1);
  });
});
