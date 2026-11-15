// A final submit made while the socket is down used to be dropped. It is kept
// and resent once the server has the player back in the lobby.
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const handlers = {};
const fakeSocket = {
  connected: false,
  on: (event, fn) => { handlers[event] = fn; },
  emit: vi.fn(),
  disconnect: vi.fn(),
};
let ioOptions = null;
vi.mock('socket.io-client', () => ({ io: (url, opts) => { ioOptions = opts; return fakeSocket; } }));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { uid: 'me', getIdToken: async () => 'tok' } } }));

const { useBattleSocket } = await import('./useBattleSocket');

describe('useBattleSocket', () => {
  it('sends a current token on every connect, not one fixed at the first', async () => {
    renderHook(() => useBattleSocket('ABC127'));
    await waitFor(() => expect(ioOptions).not.toBeNull());
    expect(typeof ioOptions.auth).toBe('function');
    const cb = vi.fn();
    ioOptions.auth(cb);
    await waitFor(() => expect(cb).toHaveBeenCalledWith({ token: 'tok' }));
  });

  it('keeps a submit made while disconnected and sends it after rejoining', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC123'));
    await waitFor(() => expect(handlers['lobby-update']).toBeDefined());

    act(() => result.current.submitResult([{ questionId: 'q1', userAnswer: 'A' }]));
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('battle-submit', expect.anything());
    expect(result.current.submitPending).toBe(true);

    fakeSocket.connected = true;
    act(() => handlers['lobby-update']({ participants: [] }));
    expect(fakeSocket.emit).toHaveBeenCalledWith('battle-submit', { battleId: 'ABC123', attempts: [{ questionId: 'q1', userAnswer: 'A' }] });

    act(() => handlers['battle-graded']({ score: 1, total: 1 }));
    expect(result.current.submitPending).toBe(false);
    fakeSocket.emit.mockClear();
    act(() => handlers['lobby-update']({ participants: [] }));
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('battle-submit', expect.anything());
  });

  it("keeps the battle's end on this device's clock, from the server's", async () => {
    const { result } = renderHook(() => useBattleSocket('ABC125'));
    await waitFor(() => expect(handlers['lobby-update']).toBeDefined());
    // The server's clock is 5 minutes ahead of this device's.
    const serverNow = Date.now() + 5 * 60000;
    act(() => handlers['lobby-update']({ participants: [], status: 'IN_PROGRESS', timing: { serverNow, endsAt: serverNow + 60000, closesAt: serverNow + 90000 } }));
    expect(Math.abs(result.current.timing.endsAt - (Date.now() + 60000))).toBeLessThan(1000);
    expect(result.current.timing.closesAt - result.current.timing.endsAt).toBe(30000);
  });

  it('asks the server again on rejoin (it finishes a battle whose time is up)', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC126'));
    await waitFor(() => expect(handlers['lobby-update']).toBeDefined());
    fakeSocket.connected = true;
    fakeSocket.emit.mockClear();
    act(() => result.current.rejoin());
    expect(fakeSocket.emit).toHaveBeenCalledWith('join-battle', { battleId: 'ABC126' });
  });

  // 2026-11-15: players shown Disconnected while in the lobby were left out at the start.
  it('joins again when the server lists this player as not connected, at most every 5 s', async () => {
    renderHook(() => useBattleSocket('ABC128'));
    await waitFor(() => expect(handlers['lobby-update']).toBeDefined());
    fakeSocket.connected = true;
    fakeSocket.emit.mockClear();
    const lost = { participants: [{ id: 'me', connected: false }, { id: 'ana', connected: true }] };
    act(() => handlers['lobby-update'](lost));
    act(() => handlers['lobby-update'](lost));
    expect(fakeSocket.emit.mock.calls.filter(([e]) => e === 'join-battle')).toEqual([['join-battle', { battleId: 'ABC128' }]]);
    // Someone else away, or this player listed as here: nothing to do.
    fakeSocket.emit.mockClear();
    act(() => handlers['lobby-update']({ participants: [{ id: 'me', connected: true }, { id: 'ana', connected: false }] }));
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('join-battle', expect.anything());
  });

  it('tries a join that failed on the server again, and says so only after three', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { result } = renderHook(() => useBattleSocket('ABC129'));
      await waitFor(() => expect(handlers.error).toBeDefined());
      fakeSocket.connected = true;
      fakeSocket.emit.mockClear();
      for (let i = 0; i < 3; i++) {
        act(() => handlers.error({ message: 'Failed to join battle' }));
        expect(result.current.error).toBeNull();
        act(() => { vi.advanceTimersByTime(3000); });
      }
      expect(fakeSocket.emit.mock.calls.filter(([e]) => e === 'join-battle')).toHaveLength(3);
      act(() => handlers.error({ message: 'Failed to join battle' }));
      expect(result.current.error).toBe('Failed to join battle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('the host removes a player; a removed player hears it, live or on a rejoin', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC130'));
    await waitFor(() => expect(handlers.removed).toBeDefined());
    fakeSocket.emit.mockClear();
    act(() => result.current.removePlayer('ana'));
    expect(fakeSocket.emit).toHaveBeenCalledWith('remove-player', { battleId: 'ABC130', userId: 'ana' });

    act(() => handlers['lobby-update']({ participants: [{ id: 'me', connected: true }] }));
    act(() => handlers.removed({ battleId: 'ABC130', message: 'The host removed you from this battle.' }));
    expect(result.current).toMatchObject({ removed: true, participants: [], error: 'The host removed you from this battle.' });
  });

  it('a refused rejoin after a removal reads as removed', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC131'));
    await waitFor(() => expect(handlers.error).toBeDefined());
    act(() => handlers.error({ message: 'The host removed you from this battle.' }));
    expect(result.current.removed).toBe(true);
  });

  it('surfaces the server’s refusal', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC124'));
    await waitFor(() => expect(handlers.error).toBeDefined());
    act(() => handlers.error({ message: 'This battle is full.' }));
    expect(result.current.error).toBe('This battle is full.');
  });

  it('hears a rematch started from the results, or carried in the results replayed later', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC127'));
    await waitFor(() => expect(handlers['rematch-ready']).toBeDefined());
    expect(result.current.rematch).toBeNull();
    act(() => handlers['rematch-ready']({ battleId: 'NEW127', by: { userId: 'ana', displayName: 'Ana' } }));
    expect(result.current.rematch).toEqual({ battleId: 'NEW127', status: 'WAITING', by: { userId: 'ana', displayName: 'Ana' } });

    const later = renderHook(() => useBattleSocket('ABC128'));
    await waitFor(() => expect(handlers['battle-complete']).toBeDefined());
    act(() => handlers['battle-complete']({ results: [], answerKey: {}, rematch: { battleId: 'NEW128', status: 'IN_PROGRESS', by: null } }));
    expect(later.result.current.rematch).toEqual({ battleId: 'NEW128', status: 'IN_PROGRESS', by: null });
  });
});
