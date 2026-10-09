// useSyncedUserData: the shared offline-first plumbing behind outside scores
// and the syllabus checklist. The list-specific behaviour is tested through
// those screens; these pin the base rules.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const authState = { currentUser: { uid: 'user-A' } };
vi.mock('../config/firebaseDb', () => ({ auth: authState }));
let uid = 'user-A';
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: uid ? { uid } : null }) }));
const apiRequest = vi.fn();
vi.mock('../services/dbQueries', () => ({ apiRequest: (...a) => apiRequest(...a), updateCommandParameters: vi.fn() }));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const { useStore } = await import('../store/useStore');
const { useSyncedUserData, resetSyncedMemory } = await import('./useSyncedUserData');

const fromResponse = (res) => res.items;
const overlay = (value, writes) => ({ value, count: (writes || []).length });
const options = { endpoint: '/api/user/things', cacheName: 'outsideScores', fromResponse, overlay };

beforeEach(() => {
  apiRequest.mockReset();
  apiRequest.mockResolvedValue({ items: ['a'] });
  idbMem.clear();
  uid = 'user-A';
  resetSyncedMemory();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  useStore.setState({ ownerUid: 'user-A', pendingWrites: [], deadLetters: [] });
});

describe('useSyncedUserData', () => {
  it('loads once, however often the screen re-renders', async () => {
    const { result, rerender } = renderHook(() => useSyncedUserData(options));
    await waitFor(() => expect(result.current.value).toEqual(['a']));
    rerender();
    rerender();
    await act(async () => {});
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('ready');
  });

  it('a list that arrives while a change is being sent is dropped and fetched again after it', async () => {
    let releaseGet;
    apiRequest.mockImplementationOnce(() => new Promise((resolve) => { releaseGet = () => resolve({ items: ['stale'] }); }));
    const { result } = renderHook(() => useSyncedUserData(options));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));

    let releaseWrite;
    let writing;
    act(() => {
      result.current.setServer(['mine']);
      writing = result.current.trackWrite(() => new Promise((resolve) => { releaseWrite = resolve; }));
    });
    await act(async () => { releaseGet(); });
    expect(result.current.value).toEqual(['mine']); // the older list didn't land
    apiRequest.mockResolvedValueOnce({ items: ['mine', 'server'] });
    await act(async () => { releaseWrite('sent'); await writing; });
    await waitFor(() => expect(result.current.value).toEqual(['mine', 'server']));
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });

  it('another account’s copy never shows', async () => {
    const { result, rerender } = renderHook(() => useSyncedUserData(options));
    await waitFor(() => expect(result.current.value).toEqual(['a']));
    uid = 'user-B';
    apiRequest.mockReturnValue(new Promise(() => {}));
    rerender();
    expect(result.current.value).toBeNull();
  });

  it('tells offline, an unreachable server and a refused request apart', async () => {
    const cases = [
      [new Error('[OFFLINE]'), 'offline'],
      [Object.assign(new Error('x'), { status: 503 }), 'unreachable'],
      [Object.assign(new Error('x'), { status: 403 }), 'error'],
    ];
    for (const [err, status] of cases) {
      resetSyncedMemory();
      apiRequest.mockRejectedValueOnce(err);
      const { result, unmount } = renderHook(() => useSyncedUserData(options));
      await waitFor(() => expect(result.current.status).toBe(status));
      expect(result.current.value).toBeNull();
      unmount();
    }
  });

  it('after a switch the new account starts at loading, not with the old status', async () => {
    apiRequest.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 403 }));
    const { result, rerender } = renderHook(() => useSyncedUserData(options));
    await waitFor(() => expect(result.current.status).toBe('error'));
    uid = 'user-B';
    apiRequest.mockReturnValue(new Promise(() => {}));
    rerender();
    expect(result.current.status).toBe('loading');
  });

  it('a failed first load shows the placeholder, stored as ancient so it never passes for fresh', async () => {
    apiRequest.mockRejectedValueOnce(new Error('[OFFLINE]'));
    const EMPTY = [];
    const opts = { ...options, emptyValue: EMPTY };
    const { result } = renderHook(() => useSyncedUserData(opts));
    await waitFor(() => expect(result.current.status).toBe('offline'));
    expect(result.current.value).toBe(EMPTY);
    await waitFor(() => expect(idbMem.get('ree-user-cache-v1:outsideScores')).toBeTruthy());
    expect(idbMem.get('ree-user-cache-v1:outsideScores').savedAt).toBe(0);
  });
});
