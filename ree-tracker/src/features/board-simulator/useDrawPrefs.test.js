// The learner's draw choice: on the account, shown at once, queued when offline.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const apiRequest = vi.fn();
vi.mock('../../services/dbQueries', () => ({ apiRequest }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'u1' } }) }));
vi.mock('../../hooks/useConnection', () => ({ useReconnectKey: () => 0 }));
vi.mock('../../services/userCache', () => ({ readUserCacheEntry: async () => null, writeUserCache: async () => {} }));
const store = { pendingWrites: [], ownerUid: 'u1' };
vi.mock('../../store/useStore', () => {
  const useStore = (sel) => sel(store);
  useStore.getState = () => ({ flushPendingWrites: async () => {} });
  return { useStore };
});
const writeOrQueue = vi.fn();
vi.mock('../../services/writeOrQueue', () => ({ writeOrQueue }));

const { useDrawPrefs, __resetDrawPrefsMemory, DRAW_PREFS_ENDPOINT } = await import('./useDrawPrefs');

beforeEach(() => {
  vi.clearAllMocks();
  __resetDrawPrefsMemory();
  store.pendingWrites = [];
  apiRequest.mockResolvedValue({ prefs: null });
  writeOrQueue.mockResolvedValue({ status: 'sent' });
});

describe('useDrawPrefs', () => {
  it('starts on an even spread, for someone who has never chosen', async () => {
    const { result } = renderHook(() => useDrawPrefs());
    expect(result.current.prefs.drawMode).toBe('even');
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(DRAW_PREFS_ENDPOINT));
    expect(result.current.prefs).toEqual({ drawMode: 'even', ownCounts: {} });
  });

  it('reads the account’s choice', async () => {
    apiRequest.mockResolvedValue({ prefs: { drawMode: 'own', ownCounts: { EE: { A: 5 } } } });
    const { result } = renderHook(() => useDrawPrefs());
    await waitFor(() => expect(result.current.prefs.drawMode).toBe('own'));
    expect(result.current.prefs.ownCounts.EE.A).toBe(5);
  });

  it('a change shows at once and sends both fields, replacing any queued one', async () => {
    apiRequest.mockResolvedValue({ prefs: { drawMode: 'even', ownCounts: { EE: { A: 5 } } } });
    const { result } = renderHook(() => useDrawPrefs());
    await waitFor(() => expect(result.current.prefs.ownCounts.EE?.A).toBe(5));
    await act(() => result.current.save({ drawMode: 'board' }));
    expect(result.current.prefs.drawMode).toBe('board');
    expect(writeOrQueue).toHaveBeenCalledWith(DRAW_PREFS_ENDPOINT, 'PUT', { drawMode: 'board', ownCounts: { EE: { A: 5 } } }, { queueKey: DRAW_PREFS_ENDPOINT, supersede: true });
  });

  it('a refused change goes back, and says so to the caller', async () => {
    const { result } = renderHook(() => useDrawPrefs());
    await waitFor(() => expect(apiRequest).toHaveBeenCalled());
    await waitFor(() => expect(result.current.prefs).toEqual({ drawMode: 'even', ownCounts: {} }));
    writeOrQueue.mockRejectedValue(new Error('Refused'));
    await act(async () => { await expect(result.current.save({ drawMode: 'own' })).rejects.toThrow('Refused'); });
    expect(result.current.prefs.drawMode).toBe('even');
  });

  it('a change still queued shows over the server’s copy', async () => {
    apiRequest.mockResolvedValue({ prefs: { drawMode: 'even', ownCounts: {} } });
    store.pendingWrites = [
      { endpoint: DRAW_PREFS_ENDPOINT, method: 'PUT', ownerUid: 'u1', body: { drawMode: 'board', ownCounts: {} } },
      { endpoint: DRAW_PREFS_ENDPOINT, method: 'PUT', ownerUid: 'someone-else', body: { drawMode: 'own', ownCounts: {} } },
    ];
    const { result } = renderHook(() => useDrawPrefs());
    await waitFor(() => expect(result.current.prefs.drawMode).toBe('board'));
  });
});
