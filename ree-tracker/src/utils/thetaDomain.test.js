// src/utils/thetaDomain.test.js
// The chart previously hardcoded [-4, 4], wasting ~60% of the plot area for a
// typical user whose θ sits in the 1–2 band. These lock the constraints that
// keep the fitted domain HONEST rather than merely space-filling.
import { describe, it, expect } from 'vitest';
import { computeThetaDomain } from './thetaDomain';

describe('computeThetaDomain', () => {
  it('fits a real 1–2 band far tighter than the old full ±4 scale', () => {
    const [lo, hi] = computeThetaDomain([1.19, 1.4, 1.85, 2.0]);
    expect(hi - lo).toBeLessThan(8); // the old hardcoded span
    // Still anchored at the pass cutoff below and padded above the data.
    expect(lo).toBeLessThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(2);
  });

  it('always keeps the θ=0 pass cutoff and θ=1 readiness marker in view', () => {
    // Both ReferenceLines are drawn unconditionally; a domain excluding them
    // would strand a line outside the plot area.
    for (const values of [[3.2, 3.5, 3.9], [-3.5, -3.2], [2, 2.1]]) {
      const [lo, hi] = computeThetaDomain(values);
      expect(lo).toBeLessThanOrEqual(0);
      expect(hi).toBeGreaterThanOrEqual(1);
    }
  });

  it('enforces a minimum span so a flat history is not magnified into drama', () => {
    // Without a floor, ±0.02 of noise would fill the whole plot height.
    const [lo, hi] = computeThetaDomain([1.0, 1.01, 0.99, 1.02]);
    expect(hi - lo).toBeGreaterThanOrEqual(2);
  });

  it('never exceeds the theoretical ±4 bounds of the 3PL scale', () => {
    const [lo, hi] = computeThetaDomain([-4, 4]);
    expect(lo).toBeGreaterThanOrEqual(-4);
    expect(hi).toBeLessThanOrEqual(4);
  });

  it('falls back to the full scale when there is no usable data', () => {
    expect(computeThetaDomain([])).toEqual([-4, 4]);
    expect(computeThetaDomain(null)).toEqual([-4, 4]);
    expect(computeThetaDomain([NaN, Infinity])).toEqual([-4, 4]);
  });

  it('snaps to half-units so auto-generated ticks read cleanly', () => {
    const [lo, hi] = computeThetaDomain([1.23, 1.77]);
    // "is a half-unit" == "doubling it yields an integer". Asserted via
    // Number.isInteger rather than `% 1 === 0` because a floored -0.4 gives
    // -0, and Object.is(-0, 0) is false — a signed-zero quirk, not a domain bug.
    expect(Number.isInteger(lo * 2)).toBe(true);
    expect(Number.isInteger(hi * 2)).toBe(true);
  });
});
