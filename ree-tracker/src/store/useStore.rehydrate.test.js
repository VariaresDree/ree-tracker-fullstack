// Restoring the store from IndexedDB: the timer saved by an older version is
// migrated, and the migrated timer reaches whatever is already on screen. It
// used to be assigned onto the restored state, which no subscriber heard, so
// after an upgrade the timer showed its old saved shape until the next change.
import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: null } }));
vi.mock('../services/dbQueries', () => ({ apiRequest: vi.fn(), updateCommandParameters: vi.fn() }));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const { useStore } = await import('./useStore');

describe('restoring an older timer', () => {
  it('migrates it and tells subscribers', async () => {
    idbMem.set('ree-tracker-secure-storage', JSON.stringify({
      state: { pomodoro: { workDuration: 30, breakDuration: 5, isWork: false, isRunning: false, timeLeft: 120 } },
      version: 0,
    }));
    const seen = [];
    const unsubscribe = useStore.subscribe((s) => seen.push(s.pomodoro));
    await useStore.persist.rehydrate();
    unsubscribe();
    const last = seen[seen.length - 1];
    expect(last).toMatchObject({ mode: 'short', workDuration: 30, pausedRemaining: 120, isRunning: false });
    expect(last).not.toHaveProperty('isWork');
    expect(useStore.getState().pomodoro).toBe(last);
    idbMem.clear();
  });
});
