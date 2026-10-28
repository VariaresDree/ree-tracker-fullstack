// The owning timer ends a block on time (the next block, a toast, the chime)
// and sends the focus blocks the timer has logged, once each: taken off the
// timer's list, then sent (or queued offline by writeOrQueue). Only the
// signed-in account's blocks go out. Exactly one owner should be mounted.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const writeOrQueue = vi.fn(async () => ({ status: 'sent' }));
vi.mock('../services/writeOrQueue', () => ({ writeOrQueue: (...a) => writeOrQueue(...a) }));
const toast = vi.fn();
vi.mock('react-hot-toast', () => ({ default: Object.assign((...a) => toast(...a), { success: vi.fn(), error: vi.fn() }) }));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'u1' } } }));
vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => {}, del: async () => {} }));
const playChime = vi.fn(() => true);
vi.mock('../utils/chime', () => ({ playChime: (...a) => playChime(...a), primeChime: vi.fn() }));

const { useStore } = await import('../store/useStore');
const { usePomodoroClock } = await import('./usePomodoroClock');
const { freshPomodoro } = await import('../utils/pomodoroLogic');

const block = { clientId: 'focus-1760000000000', subject: 'EE', minutes: 25, startedAt: 1_760_000_000_000, endedAt: 1_760_001_500_000, completed: true };

beforeEach(() => {
  writeOrQueue.mockClear();
  toast.mockClear();
  playChime.mockClear();
  useStore.setState({ pomodoro: { ...freshPomodoro(), pendingFocusLogs: [block] } });
});
afterEach(() => vi.restoreAllMocks());

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

  // A 6 h paper exam sent to a server still on the 3 h limit gets a 400
  // that no retry can fix; it used to vanish without a trace.
  it('a block the server refuses outright goes to Sync issues, not away', async () => {
    useStore.setState({ deadLetters: [] });
    writeOrQueue.mockImplementationOnce(async () => { throw Object.assign(new Error('minutes too large'), { status: 400 }); });
    renderHook(() => usePomodoroClock({ owner: true }));
    await waitFor(() => expect(useStore.getState().deadLetters).toHaveLength(1));
    const letter = useStore.getState().deadLetters[0];
    expect(letter).toMatchObject({ type: 'pendingWrite', endpoint: '/api/user/focus-blocks', status: 400 });
    expect(letter.write).toMatchObject({ endpoint: '/api/user/focus-blocks', method: 'POST', ownerUid: 'u1', body: expect.objectContaining({ clientId: block.clientId, minutes: 25 }) });
    expect(useStore.getState().pomodoro.pendingFocusLogs).toEqual([]);
  });

  it('a timer that is only shown sends nothing', () => {
    renderHook(() => usePomodoroClock());
    expect(writeOrQueue).not.toHaveBeenCalled();
    expect(useStore.getState().pomodoro.pendingFocusLogs).toHaveLength(1);
  });

  it("drops another account's block instead of sending it under this one", async () => {
    const mine = { ...block, clientId: 'focus-2', ownerUid: 'u1' };
    const theirs = { ...block, clientId: 'focus-3', ownerUid: 'someone-else' };
    useStore.setState((s) => ({ pomodoro: { ...s.pomodoro, pendingFocusLogs: [mine, theirs] } }));
    renderHook(() => usePomodoroClock({ owner: true }));
    await waitFor(() => expect(useStore.getState().pomodoro.pendingFocusLogs).toEqual([]));
    expect(writeOrQueue.mock.calls.map((c) => c[2].clientId)).toEqual(['focus-2']);
  });

  it('stamps a newly logged block with the signed-in account', () => {
    useStore.setState({ pomodoro: freshPomodoro() });
    act(() => { useStore.getState().startPomodoro(); });
    const started = useStore.getState().pomodoro.focusStartedAt;
    useStore.setState((s) => ({ pomodoro: { ...s.pomodoro, focusStartedAt: started - 10 * 60_000, endsAt: s.pomodoro.endsAt - 10 * 60_000 } }));
    act(() => { useStore.getState().resetPomodoro(); });
    expect(useStore.getState().pomodoro.pendingFocusLogs).toEqual([expect.objectContaining({ minutes: 10, ownerUid: 'u1' })]);
  });
});

describe('usePomodoroClock — the end of a block', () => {
  const expired = () => {
    const now = Date.now();
    useStore.setState({
      pomodoro: { ...freshPomodoro({ subject: 'EE' }), isRunning: true, endsAt: now - 1000, pausedRemaining: null, focusStartedAt: now - 25 * 60_000 - 1000 },
    });
  };

  it('the owner moves on once, says so, and chimes', async () => {
    expired();
    renderHook(() => usePomodoroClock({ owner: true }));
    await waitFor(() => expect(useStore.getState().pomodoro.mode).toBe('short'));
    expect(useStore.getState().pomodoro).toMatchObject({ isRunning: false, cycle: 1 });
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith('Focus block done. Take a 5-minute break.');
    expect(playChime).toHaveBeenCalledWith('end');
    await waitFor(() => expect(writeOrQueue).toHaveBeenCalledWith('/api/user/focus-blocks', 'POST', expect.objectContaining({ subject: 'EE', minutes: 25 }), expect.anything()));
  });

  it('no chime with the sound off; an exam chimes its own way', async () => {
    expired();
    useStore.setState((s) => ({ pomodoro: { ...s.pomodoro, sound: false } }));
    const { unmount } = renderHook(() => usePomodoroClock({ owner: true }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(playChime).not.toHaveBeenCalled();
    unmount();

    const now = Date.now();
    useStore.setState({ pomodoro: { ...freshPomodoro({ mode: 'exam', examSection: 'ESAS' }), isRunning: true, endsAt: now - 1000, pausedRemaining: null, focusStartedAt: now - 240 * 60_000 - 1000 } });
    renderHook(() => usePomodoroClock({ owner: true }));
    await waitFor(() => expect(playChime).toHaveBeenCalledWith('exam'));
    expect(toast).toHaveBeenLastCalledWith('ESAS section over. Pencils down.');
  });

  it('a timer that is only shown never ends the block', () => {
    expired();
    const { result } = renderHook(() => usePomodoroClock());
    expect(result.current.remaining).toBe(0);
    expect(result.current.progress).toBe(1);
    expect(useStore.getState().pomodoro).toMatchObject({ mode: 'focus', isRunning: true });
    expect(toast).not.toHaveBeenCalled();
  });

  it('completing is idempotent: a second call for the same ending changes nothing', () => {
    expired();
    act(() => { useStore.getState().completePomodoro(); });
    const after = useStore.getState().pomodoro;
    act(() => { useStore.getState().completePomodoro(); });
    expect(useStore.getState().pomodoro).toBe(after);
  });

  it('warns in development when two owners are mounted', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = renderHook(() => usePomodoroClock({ owner: true }));
    expect(warn).not.toHaveBeenCalled();
    const b = renderHook(() => usePomodoroClock({ owner: true }));
    expect(warn).toHaveBeenCalledTimes(1);
    b.unmount();
    a.unmount();
    renderHook(() => usePomodoroClock({ owner: true }));
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('usePomodoroClock — the shading reminder', () => {
  it('the owner says it once when a paper-exam section reaches its shading time', async () => {
    const now = Date.now();
    useStore.setState({ pomodoro: {
      ...freshPomodoro({ mode: 'exam', examSection: 'ESAS' }),
      isRunning: true, endsAt: now + 20 * 60_000, focusStartedAt: now - 3 * 3600_000, pausedRemaining: null, pendingFocusLogs: [],
    } });
    const a = renderHook(() => usePomodoroClock({ owner: true }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('30 minutes left in ESAS. Transfer your answers to the sheet now.'));
    expect(playChime).toHaveBeenCalledWith('shade');
    a.unmount();
    renderHook(() => usePomodoroClock({ owner: true })); // another owner, or a reload
    await act(async () => {});
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('a clock that isn’t the owner says nothing', async () => {
    const now = Date.now();
    useStore.setState({ pomodoro: {
      ...freshPomodoro({ mode: 'exam', examSection: 'EE' }),
      isRunning: true, endsAt: now + 10 * 60_000, focusStartedAt: now - 3600_000, pausedRemaining: null, pendingFocusLogs: [],
    } });
    renderHook(() => usePomodoroClock());
    await act(async () => {});
    expect(toast).not.toHaveBeenCalled();
  });
});
