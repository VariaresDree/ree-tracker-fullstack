// Appearance settings are device preferences: the Plain background switch
// reaches the page at once, is remembered for the pre-paint script, and
// survives a sign-out like the theme does.
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../config/firebaseDb', () => ({ auth: { currentUser: null } }));
vi.mock('../services/dbQueries', () => ({ apiRequest: vi.fn(), updateCommandParameters: vi.fn() }));
const idbMem = new Map();
vi.mock('idb-keyval', () => ({
  get: async (k) => idbMem.get(k),
  set: async (k, v) => { idbMem.set(k, v); },
  del: async (k) => { idbMem.delete(k); },
}));

const { useStore } = await import('./useStore');

afterEach(() => {
  useStore.getState().setPlainBackground(false);
  localStorage.removeItem('ree-texture');
});

describe('Plain background', () => {
  it('turns the texture off on the page, remembers it, and back on', () => {
    useStore.getState().setPlainBackground(true);
    expect(useStore.getState().plainBackground).toBe(true);
    expect(document.documentElement.getAttribute('data-texture')).toBe('off');
    expect(localStorage.getItem('ree-texture')).toBe('off');

    useStore.getState().setPlainBackground(false);
    expect(useStore.getState().plainBackground).toBe(false);
    expect(document.documentElement.hasAttribute('data-texture')).toBe(false);
    expect(localStorage.getItem('ree-texture')).toBe('on');
  });

  it('is persisted with the theme and kept through a sign-out', async () => {
    useStore.getState().setPlainBackground(true);
    expect(useStore.persist.getOptions().partialize(useStore.getState())).toMatchObject({ plainBackground: true });
    await useStore.getState().resetStore();
    expect(useStore.getState().plainBackground).toBe(true);
  });
});
