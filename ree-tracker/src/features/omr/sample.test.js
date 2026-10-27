// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { answerSheetGeometry, decodeIdBits, layoutHash } from '../exam-export/sheetLayout';
import {
  bubbleFill, cellOf, refineOffsets, sampleBilinear,
} from './sample';
import { readIdStrip, stripCells } from './idStrip';
import { composeHomography } from './homography';
import { toGray } from './gray';
import {
  curl, mmToSheetPx, mulberry32, renderSheet, sheetToRGBA,
} from './__fixtures__/synthSheet';

const PPM = 6;
const optionCounts = Array(60).fill(4);
const geometry = answerSheetGeometry({ optionCounts, paper: 'letter', printId: 'K7P29QXAM3TD' });
const page = geometry.pages[0];
const marks = { 1: [0], 2: [3], 3: [1, 2], 10: [2] };
const sheet = renderSheet(page, { ppm: PPM, marks, rng: mulberry32(4) });
const gray = toGray(sheetToRGBA(sheet));
const { width: w, height: h } = sheet;
const H = mmToSheetPx(PPM); // page mm -> sheet px, exact

describe('sampleBilinear', () => {
  it('interpolates between pixel centres and clamps at the edges', () => {
    const g = new Uint8Array([0, 100, 200, 50]);
    expect(sampleBilinear(g, 2, 2, 0.5, 0)).toBe(50);
    expect(sampleBilinear(g, 2, 2, 0.5, 0.5)).toBe(87.5);
    expect(sampleBilinear(g, 2, 2, -3, -3)).toBe(0);
    expect(sampleBilinear(g, 2, 2, 9, 9)).toBe(50);
  });
});

describe('bubbleFill', () => {
  const fillOf = (n, k, dx = 0, dy = 0) => {
    const b = page.bubbles.find((x) => x.n === n && x.k === k);
    return bubbleFill(gray, w, h, H, b.cx + dx, b.cy + dy, b.r);
  };

  it('reads a shaded bubble near full and an empty one near zero (the grey letter only)', () => {
    const marked = fillOf(1, 0);
    const empty = fillOf(1, 1);
    expect(marked.fill).toBeGreaterThan(0.55);
    expect(empty.fill).toBeGreaterThan(-0.02);
    expect(empty.fill).toBeLessThan(0.12);
    expect(empty.white).toBeGreaterThan(230);
    expect(marked.mean).toBeLessThan(empty.mean);
  });

  it('ignores a lighting gradient across the bubble (the paper is fitted as a plane)', () => {
    const b = page.bubbles.find((x) => x.n === 5 && x.k === 2);
    const lit = gray.slice();
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) lit[y * w + x] = gray[y * w + x] * (0.4 + 0.6 * (x / w));
    const flat = bubbleFill(gray, w, h, H, b.cx, b.cy, b.r).fill;
    expect(Math.abs(bubbleFill(lit, w, h, H, b.cx, b.cy, b.r).fill - flat)).toBeLessThan(0.03);
  });

  it('a mark in the next bubble does not darken this one', () => {
    // Item 3 has B and C shaded; A sits next to B.
    expect(fillOf(3, 0).fill).toBeLessThan(0.12);
    expect(fillOf(3, 1).fill).toBeGreaterThan(0.55);
  });
});

describe('cellOf', () => {
  it('gives column, row and the 8-row group, column-major', () => {
    expect(cellOf(page, 1)).toEqual({ col: 0, row: 0, group: '0:0' });
    expect(cellOf(page, 9)).toEqual({ col: 0, row: 8, group: '0:1' });
    expect(cellOf(page, page.rows + 1)).toEqual({ col: 1, row: 0, group: '1:0' });
  });
});

describe('refineOffsets', () => {
  it('finds where the printed rings really are: a known 0.9 mm / -0.6 mm error comes back', () => {
    // Give it an H that is off by (+0.9, -0.6) mm: the rings sit at
    // geometry - (0.9, -0.6) in its frame.
    const off = composeHomography(H, [1, 0, 0.9, 0, 1, -0.6, 0, 0, 1]);
    const got = refineOffsets(gray, w, h, off, page);
    expect(got.size).toBe(new Set(page.bubbles.map((b) => cellOf(page, b.n).group)).size);
    for (const { dx, dy, contrast } of got.values()) {
      expect(Math.abs(dx + 0.9)).toBeLessThan(0.11);
      expect(Math.abs(dy - 0.6)).toBeLessThan(0.11);
      expect(contrast).toBeGreaterThan(10);
    }
  });

  it('follows a 2 mm curl, which no single shift could fix, group by group', () => {
    const curled = curl(sheet, 2, { angleDeg: 90 });
    const g2 = toGray(sheetToRGBA(curled));
    const got = refineOffsets(g2, w, h, H, page);
    const { wMm, hMm } = curled;
    for (const [key, o] of got) {
      const [col, band] = key.split(':').map(Number);
      const inGroup = page.bubbles.filter((b) => { const c = cellOf(page, b.n); return c.col === col && Math.floor(c.row / 8) === band; });
      const mean = inGroup.reduce((s, b) => s + 2 * Math.sin((Math.PI * b.cx) / wMm) * Math.sin((Math.PI * b.cy) / hMm), 0) / inGroup.length;
      expect(Math.abs(o.dx)).toBeLessThan(0.2);
      expect(Math.abs(o.dy - mean)).toBeLessThan(0.3);
    }
    expect(Math.max(...[...got.values()].map((o) => o.dy))).toBeGreaterThan(1.3);
  });
});

describe('readIdStrip', () => {
  it('reads the bottom strip back to the paper, page and layout hash', () => {
    const bits = readIdStrip(gray, w, h, H, stripCells('letter'));
    expect(bits).toEqual(page.idCells.map((c) => (c.filled ? 1 : 0)));
    expect(decodeIdBits(bits)).toEqual({ paper: 'letter', pageIndex: 0, hash: layoutHash('K7P29QXAM3TD', optionCounts) });
  });

  it('reads blank paper (the wrong way up) as all zeros, which never decodes', () => {
    const upside = composeHomography(H, [-1, 0, 215.9, 0, -1, 279.4, 0, 0, 1]);
    const bits = readIdStrip(gray, w, h, upside, stripCells('letter'));
    expect(bits.every((b) => b === 0)).toBe(true);
    expect(decodeIdBits(bits)).toBeNull();
  });

  it('stripCells is the printed geometry for each paper', () => {
    for (const paper of ['a4', 'letter', 'long']) {
      const g = answerSheetGeometry({ optionCounts: [4, 4], paper, printId: 'X' });
      expect(stripCells(paper)).toEqual(g.pages[0].idCells.map(({ x, y, size }) => ({ x, y, size })));
    }
  });
});
