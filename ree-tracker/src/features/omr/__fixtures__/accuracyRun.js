// src/features/omr/__fixtures__/accuracyRun.js
//
// The accuracy run behind readSheet.accuracy*.test.js: each seed is one
// printed set, photographed page by page. Seeds cycle deterministically
// through 4 / 5 / 6 / mixed options, A4 / Letter / long bond, one or two
// pages, right way up or upside down, and three photo sizes, so any 12
// consecutive seeds cover every option count and paper both ways up.

import { readSheet } from '../pipeline';
import {
  addScores, emptyScore, makeSet, photoOfPage, scoreRead,
} from './scenarios';

const OPTIONS = [4, 5, 6, 'mixed'];
const PAPERS = ['a4', 'letter', 'long'];
const ONE_PAGE = [40, 60, 90, 100];
const SIZES = [[1200, 5], [1600, 5], [2000, 6]];

export function caseFor(seed) {
  return {
    options: OPTIONS[seed % 4],
    paper: PAPERS[Math.floor(seed / 4) % 3],
    count: seed % 3 === 0 ? 150 : ONE_PAGE[seed % 4],
    flip: seed % 2 === 1,
    size: SIZES[seed % 3],
  };
}

/**
 * Read every page of every seed's set.
 * @returns {{ score, pages: number, failures: object[], seen: object }}
 */
export function runAccuracy(seeds) {
  let score = emptyScore();
  const failures = [];
  const seen = { options: new Set(), papers: new Set(), pageCounts: new Set(), rotations: new Set() };
  let pages = 0;
  for (const seed of seeds) {
    const c = caseFor(seed);
    const set = makeSet(seed, { options: c.options, paper: c.paper, count: c.count });
    seen.options.add(c.options);
    seen.papers.add(c.paper);
    seen.pageCounts.add(set.geometry.pages.length);
    set.geometry.pages.forEach((page, index) => {
      const { img, portrait } = photoOfPage(set, index, { seed, flip: c.flip, outLong: c.size[0], ppm: c.size[1] });
      const res = readSheet(img, { printId: set.printId, optionCounts: set.optionCounts, expectPage: index });
      pages += 1;
      if (!res.ok) {
        failures.push({ seed, page: index, reason: res.reason, quality: res.quality });
        return;
      }
      seen.rotations.add(res.rotation);
      // Upright or upside down in a portrait frame; a quarter turn in a landscape one.
      const expected = portrait ? [c.flip ? 180 : 0] : [90, 270];
      if (res.page.index !== index || !expected.includes(res.rotation)) {
        failures.push({ seed, page: index, reason: 'orientation', got: { page: res.page.index, rotation: res.rotation } });
      }
      const s = scoreRead(res, set);
      s.wrong = s.wrong.map((w) => ({ seed, page: index, ...w }));
      score = addScores(score, s);
    });
  }
  return { score, pages, failures, seen };
}
