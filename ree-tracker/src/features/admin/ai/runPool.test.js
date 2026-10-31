import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../services/geminiApi', () => ({}));
vi.mock('../../../services/dbQueries', () => ({}));
vi.mock('../../../services/liveTaxonomy', () => ({}));

const { runPool } = await import('./useQuestionGenerator');

describe('runPool', () => {
  it('runs two at a time until a job fails, then one at a time, keeping the order', async () => {
    let inFlight = 0;
    const peaks = [];
    const job = (i, fail = false) => async () => {
      inFlight += 1;
      peaks.push(inFlight);
      await new Promise((r) => { setTimeout(r, 5); });
      inFlight -= 1;
      if (fail) throw new Error(`job ${i}`);
      return i;
    };
    const results = await runPool([job(0, true), job(1), job(2), job(3), job(4)], 2);
    expect(results.map((r) => (r.ok ? r.value : r.error.message))).toEqual(['job 0', 1, 2, 3, 4]);
    expect(peaks.slice(0, 2)).toEqual([1, 2]);
    // After the failure, every job that starts runs alone.
    expect(peaks.slice(3).every((p) => p === 1)).toBe(true);
  });
});
