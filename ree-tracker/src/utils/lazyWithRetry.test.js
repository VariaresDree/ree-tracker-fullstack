import { describe, it, expect, vi } from 'vitest';
import { importWithRetry } from './lazyWithRetry';

describe('importWithRetry', () => {
  it('tries a failed import again before giving up', async () => {
    const factory = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ default: 'Screen' });
    await expect(importWithRetry(factory, [0, 0])).resolves.toEqual({ default: 'Screen' });
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('gives up after its retries, with the last error', async () => {
    const factory = vi.fn().mockRejectedValue(new Error('gone'));
    await expect(importWithRetry(factory, [0, 0])).rejects.toThrow('gone');
    expect(factory).toHaveBeenCalledTimes(3);
  });
});
