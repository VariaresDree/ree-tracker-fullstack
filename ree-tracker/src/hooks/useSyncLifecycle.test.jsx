// Regression coverage for the "offline answers don't tally / analytics don't
// update after reconnect" investigation (2.2). Static trace confirmed the
// queue-clearing side of this is fine — flushQueueToCloud/flushPendingWrites
// (store/useStore.js) only remove ids after a confirmed 2xx, never
// optimistically. The actual gap was on the READ side: a background flush's
// success handler updates only stats.thetaRating; the full aggregate
// reconcile (activityCalendar/microTopics/matrix/totalAnswered) happened ONLY
// as a side effect of Dashboard.jsx's own local syncTick effect, which only
// exists while Dashboard is mounted. This suite proves the NEW app-wide
// subscription in useSyncLifecycle (mounted once in App.jsx regardless of
// route) fires the same reconcile independent of which page is open.
//
// NOTE: this was verified via this unit test and static tracing, not a live
// browser session — no working DATABASE_URL/Firebase credentials are
// available in this environment (see .env.example placeholders in both
// packages). A live end-to-end check (answer offline, reconnect, watch
// Profile/Arena update without a Dashboard visit) is still recommended before
// treating this as fully confirmed.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useSyncLifecycle } from './useSyncLifecycle';
import { useStore } from '../store/useStore';

vi.mock('../store/useStore', async () => {
  const { create } = await import('zustand');
  const store = create(() => ({
    syncQueue: [],
    pendingWrites: [],
    syncStatus: 'idle',
    currentSessionId: null,
    currentSessionMode: null,
    currentSubject: null,
    flushQueueToCloud: vi.fn(),
    flushPendingWrites: vi.fn(),
    resetSyncBackoff: vi.fn(),
    canAttemptSync: () => true,
  }));
  return { useStore: store };
});

vi.mock('../config/firebaseDb', () => ({
  auth: { currentUser: { uid: 'user-1' } },
}));

const syncDashboardStatsMock = vi.fn().mockResolvedValue({});
vi.mock('../services/analyticsSync', () => ({
  syncDashboardStats: (...args) => syncDashboardStatsMock(...args),
}));

function Harness() {
  useSyncLifecycle();
  return null;
}

describe('useSyncLifecycle — app-wide dashboard-aggregate reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({ syncStatus: 'idle' });
  });

  it('reconciles the dashboard aggregate on a syncing -> synced transition, with no Dashboard mounted', async () => {
    render(<Harness />);

    act(() => { useStore.setState({ syncStatus: 'syncing' }); });
    expect(syncDashboardStatsMock).not.toHaveBeenCalled();

    await act(async () => { useStore.setState({ syncStatus: 'synced' }); });

    expect(syncDashboardStatsMock).toHaveBeenCalledWith('user-1');
  });

  it('does not reconcile on unrelated transitions, or a "synced" that was never preceded by "syncing"', async () => {
    render(<Harness />);

    await act(async () => { useStore.setState({ syncStatus: 'offline_queued' }); });
    expect(syncDashboardStatsMock).not.toHaveBeenCalled();

    await act(async () => { useStore.setState({ syncStatus: 'synced' }); });
    expect(syncDashboardStatsMock).not.toHaveBeenCalled();
  });

  it('does not reconcile when signed out', async () => {
    const { auth } = await import('../config/firebaseDb');
    auth.currentUser = null;
    try {
      render(<Harness />);
      act(() => { useStore.setState({ syncStatus: 'syncing' }); });
      await act(async () => { useStore.setState({ syncStatus: 'synced' }); });
      expect(syncDashboardStatsMock).not.toHaveBeenCalled();
    } finally {
      auth.currentUser = { uid: 'user-1' };
    }
  });
});

// The store's flush refuses a queue that belongs to another account. The last
// send on page hide skipped that check, so hiding the tab could post account A's
// queued answers under account B's token.
describe('useSyncLifecycle — the last send on page hide', () => {
  const attempt = { id: 'a1', questionId: 'q1' };
  let fetchMock;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const { auth } = await import('../config/firebaseDb');
    auth.currentUser = { uid: 'user-b', accessToken: 'token-b' };
    useStore.setState({ syncQueue: [attempt], ownerUid: 'user-b' });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    localStorage.removeItem('ree_pending_sync');
    const { auth } = await import('../config/firebaseDb');
    auth.currentUser = { uid: 'user-1' };
    useStore.setState({ syncQueue: [], ownerUid: undefined });
  });

  it('sends the signed-in account its own queue', () => {
    render(<Harness />);
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.keepalive).toBe(true);
    expect(options.headers.Authorization).toBe('Bearer token-b');
  });

  it('sends nothing when the queue belongs to another account, and still keeps it', () => {
    useStore.setState({ ownerUid: 'user-a' });
    render(<Harness />);
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('ree_pending_sync'))).toEqual([attempt]);
    expect(useStore.getState().syncQueue).toEqual([attempt]);
  });

  it('sends a queue with no owner yet, as the store\'s flush does', () => {
    useStore.setState({ ownerUid: null });
    render(<Harness />);
    window.dispatchEvent(new Event('pagehide'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
