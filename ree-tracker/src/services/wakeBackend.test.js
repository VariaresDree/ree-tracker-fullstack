import { describe, it, expect, vi } from 'vitest';
import { wakeBackend } from './wakeBackend';

describe('wakeBackend', () => {
  it('sends one no-cors request to /health', () => {
    const fetchImpl = vi.fn(() => Promise.resolve({}));
    expect(wakeBackend({ fetchImpl, online: true })).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toMatch(/\/health$/);
    expect(init).toMatchObject({ mode: 'no-cors', cache: 'no-store', credentials: 'omit' });
  });

  it('does nothing offline', () => {
    const fetchImpl = vi.fn();
    expect(wakeBackend({ fetchImpl, online: false })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('never throws, whether fetch throws or rejects', async () => {
    expect(wakeBackend({ fetchImpl: () => { throw new Error('x'); }, online: true })).toBe(false);
    expect(wakeBackend({ fetchImpl: () => Promise.reject(new Error('x')), online: true })).toBe(true);
    await Promise.resolve();
  });
});
