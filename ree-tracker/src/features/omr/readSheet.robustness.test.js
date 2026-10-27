// @vitest-environment node
//
// Harder photos and other ways of marking: each case is three 100-item sheets.
import { describe, it, expect } from 'vitest';
import { readSheet } from './pipeline';
import {
  addScores, emptyScore, makeSet, photoOfPage, scoreRead,
} from './__fixtures__/scenarios';

function run(opts, seeds = [200, 201, 202]) {
  let score = emptyScore();
  const failures = [];
  for (const seed of seeds) {
    const set = makeSet(seed, { count: 100 });
    const { img } = photoOfPage(set, 0, { seed, ...opts });
    const res = readSheet(img, { printId: set.printId, optionCounts: set.optionCounts });
    if (!res.ok) failures.push(res.reason);
    else score = addScores(score, scoreRead(res, set));
  }
  return { score, failures };
}

const CASES = {
  'a soft shadow across the sheet': { photo: { shadow: { angleDeg: 120, offset: 0.1, depth: 0.6, softPx: 40 } } },
  'light pencil (55% dark, patchy)': { pencil: { darkness: 0.55, coverage: 0.75, spread: 0.1 } },
  'dark pen spilling past the circle': { pencil: { darkness: 0.97, coverage: 1, jitterMm: 0.7, spread: 0.02 } },
  'hatched rather than filled': { pencil: { darkness: 0.8, coverage: 0.55 } },
  'a small photo (~2.9 px/mm)': { outLong: 1000, ppm: 4 },
  'a steep tilt, near the skew limit': { camera: { tilt: 0.09 } },
  'dim, uneven light and heavy noise': { photo: { light: { gradient: 0.5, vignette: 0.35 }, noiseSigma: 6 } },
};

describe('readSheet robustness', () => {
  Object.entries(CASES).forEach(([name, opts]) => {
    it(`${name}: 99.5%+ exact`, () => {
      const { score, failures } = run(opts);
      expect(failures).toEqual([]);
      expect(score.exact / score.rows).toBeGreaterThanOrEqual(0.995);
      expect(score.blankAsSingle).toBe(0);
      expect(score.doublesCaught).toBe(score.doubles);
    }, 60_000);
  });

  it('a hard 50% shadow edge: no blank read as a mark; rows on the edge are flagged, not misread', () => {
    const { score, failures } = run({ photo: { shadow: { angleDeg: 30, offset: 0, depth: 0.5 } } });
    expect(failures).toEqual([]);
    expect(score.blankAsSingle).toBe(0);
    expect(score.answersRight / score.rows).toBeGreaterThanOrEqual(0.98);
    // What isn't exact is flagged for review.
    const silent = score.wrong.filter((w) => w.status === 'single');
    expect(silent).toEqual([]);
  }, 60_000);
});
