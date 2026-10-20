// The screen stays on while a paper exam runs: the lock is asked for, asked
// for again when the page comes back (the browser drops it when hidden), and
// released when the exam stops or the page goes. Without the API, nothing.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

function installWakeLock() {
  const sentinels = [];
  const request = vi.fn(async () => {
    const listeners = {};
    const s = {
      released: false,
      addEventListener: (type, fn) => { listeners[type] = fn; },
      release: vi.fn(async () => { s.released = true; listeners.release?.(); }),
      drop: () => { s.released = true; listeners.release?.(); },
    };
    sentinels.push(s);
    return s;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinels };
}

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

afterEach(() => {
  delete navigator.wakeLock;
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

describe('useWakeLock', () => {
  it('does nothing without the API', () => {
    expect(navigator.wakeLock).toBeUndefined();
    expect(() => renderHook(() => useWakeLock(true)).unmount()).not.toThrow();
  });

  it('asks for nothing while inactive', () => {
    const { request } = installWakeLock();
    renderHook(() => useWakeLock(false));
    expect(request).not.toHaveBeenCalled();
  });

  it('holds the screen lock while active, and releases it when it stops', async () => {
    const { request, sentinels } = installWakeLock();
    const { rerender } = renderHook(({ on }) => useWakeLock(on), { initialProps: { on: true } });
    await waitFor(() => expect(sentinels).toHaveLength(1));
    expect(request).toHaveBeenCalledWith('screen');
    rerender({ on: false });
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('asks again when the page comes back after the browser dropped it', async () => {
    const { request, sentinels } = installWakeLock();
    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(sentinels).toHaveLength(1));
    setVisibility('hidden');
    sentinels[0].drop();
    setVisibility('visible');
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    unmount();
    expect(sentinels[1].release).toHaveBeenCalled();
  });

  it('swallows a refusal', async () => {
    const request = vi.fn(async () => { throw new Error('NotAllowedError'); });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(() => unmount()).not.toThrow();
  });
});
