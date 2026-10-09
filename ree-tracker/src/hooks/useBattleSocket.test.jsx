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

  it('surfaces the server’s refusal', async () => {
    const { result } = renderHook(() => useBattleSocket('ABC124'));
    await waitFor(() => expect(handlers.error).toBeDefined());
    act(() => handlers.error({ message: 'This battle is full.' }));
    expect(result.current.error).toBe('This battle is full.');
  });
});
