// @vitest-environment node
//
// Accuracy on synthetic phone photos, seeds 1-20 of the 40 (the other half
// is readSheet.accuracy-b.test.js, so the two run in parallel). Each seed is a
// printed set with random answers (10% blank, 5% two marks), photographed
// page by page: perspective, a few degrees of turn, upright or upside down,
// some in a landscape frame, blur, noise, a light gradient, vignette, and
// three photo sizes (~3.5-6 px/mm on the page). See __fixtures__/accuracyRun.js.
import { describe, it, expect } from 'vitest';
import { runAccuracy } from './__fixtures__/accuracyRun';

const SEEDS = Array.from({ length: 20 }, (_, i) => 1 + i);

describe('readSheet accuracy, seeds 1-20', () => {
  it('reads at least 99.5% of rows exactly, never a blank as a mark, and catches every double mark', () => {
    const { score, pages, failures, seen } = runAccuracy(SEEDS);
    expect(failures).toEqual([]);
    expect(pages).toBeGreaterThanOrEqual(20);
    expect(score.rows).toBeGreaterThan(1500);
    expect(score.exact / score.rows).toBeGreaterThanOrEqual(0.995);
    expect(score.blankAsSingle).toBe(0);
    expect(score.doubles).toBeGreaterThan(30);
    expect(score.doublesCaught).toBe(score.doubles);
    // The run covered what it claims to.
    expect([...seen.options].sort()).toEqual([4, 5, 6, 'mixed'].sort());
    expect([...seen.papers].sort()).toEqual(['a4', 'letter', 'long']);
    expect([...seen.pageCounts].sort()).toEqual([1, 2]);
    expect(seen.rotations.has(0) && seen.rotations.has(180)).toBe(true);
  }, 120_000);
});
