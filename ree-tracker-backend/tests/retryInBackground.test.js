import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const { retryInBackground } = require('../src/services/retryInBackground');

// A battle's attempts are persisted after the match is graded in memory. A
// failed write used to be logged and dropped — the battle counted on the
// scoreboard and vanished from the learner's analytics. Retrying is safe
// because every battle attempt carries a deterministic clientAttemptId.

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('retryInBackground', () => {
    it('retries on the delay schedule until it succeeds', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('pool exhausted'))
            .mockResolvedValueOnce('ok');
        const onGiveUp = vi.fn();
        retryInBackground('battle', fn, { delays: [1000, 5000], onGiveUp });

        expect(fn).not.toHaveBeenCalled();          // never blocks the caller
        await vi.advanceTimersByTimeAsync(1000);
        expect(fn).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(5000);
        expect(fn).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(60000);
        expect(fn).toHaveBeenCalledTimes(2);        // stopped after success
        expect(onGiveUp).not.toHaveBeenCalled();
    });

    it('gives up after the last delay and reports it', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('down'));
        const onGiveUp = vi.fn();
        retryInBackground('battle', fn, { delays: [10, 20], onGiveUp });
        await vi.advanceTimersByTimeAsync(100);
        expect(fn).toHaveBeenCalledTimes(2);
        expect(onGiveUp).toHaveBeenCalledWith(expect.objectContaining({ message: 'down' }));
    });
});
