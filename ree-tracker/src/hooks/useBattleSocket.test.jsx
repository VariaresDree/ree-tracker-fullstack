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
vi.mock('socket.io-client', () => ({ io: () => fakeSocket }));
vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: { getIdToken: async () => 'tok' } } }));

const { useBattleSocket } = await import('./useBattleSocket');

describe('useBattleSocket', () => {
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

  it('surfaces the server’s refusal', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC124'));
    await waitFor(() => expect(handlers.error).toBeDefined());
    act(() => handlers.error({ message: 'This battle is full.' }));
    expect(result.current.error).toBe('This battle is full.');
  });
});
