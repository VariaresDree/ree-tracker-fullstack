// The owning timer sends the focus blocks the Pomodoro has logged, once each:
// taken off the timer's list, then sent (or queued offline by writeOrQueue).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const writeOrQueue = vi.fn(async () => ({ status: 'sent' }));
vi.mock('../services/writeOrQueue', () => ({ writeOrQueue: (...a) => writeOrQueue(...a) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'u1' } } }));
vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => {}, del: async () => {} }));

const { useStore } = await import('../store/useStore');
const { usePomodoroClock } = await import('./usePomodoroClock');

const block = { clientId: 'focus-1760000000000', subject: 'EE', minutes: 25, startedAt: 1_760_000_000_000, endedAt: 1_760_001_500_000, completed: true };

beforeEach(() => {
  writeOrQueue.mockClear();
  useStore.setState((s) => ({ pomodoro: { ...s.pomodoro, isRunning: false, pendingFocusLogs: [block] } }));
});

describe('usePomodoroClock — focus blocks', () => {
  it('the owner sends each logged block once and clears it', async () => {
    renderHook(() => usePomodoroClock({ owner: true }));
    await waitFor(() => expect(writeOrQueue).toHaveBeenCalledTimes(1));
    expect(writeOrQueue).toHaveBeenCalledWith('/api/user/focus-blocks', 'POST', {
      clientId: block.clientId, subject: 'EE', minutes: 25,
      startedAt: new Date(block.startedAt).toISOString(), endedAt: new Date(block.endedAt).toISOString(), completed: true,
    }, { queueKey: '/api/user/focus-blocks' });
    expect(useStore.getState().pomodoro.pendingFocusLogs).toEqual([]);
  });

  it('a timer that is only shown sends nothing', () => {
    renderHook(() => usePomodoroClock());
    expect(writeOrQueue).not.toHaveBeenCalled();
    expect(useStore.getState().pomodoro.pendingFocusLogs).toHaveLength(1);
  });
});
