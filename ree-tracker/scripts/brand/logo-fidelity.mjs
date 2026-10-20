// scripts/brand/logo-fidelity.mjs
//
// Checks the vector mark against the original artwork
// (design/brand/logo-source.png): renders logoSvg() on the artwork's own
// 1080 grid in Chromium, sorts every pixel of both images into letterform,
// trefoil tint, bolt and red, and reports how well each class overlaps (IoU)
// and how far its centre moved. Writes design/brand/compare.png (artwork |
// vector | difference) and design/brand/sizes.png (the mark from 16 to 128 px,
// on dark and light) for review by eye.
//
//   node scripts/brand/logo-fidelity.mjs            (from ree-tracker/)
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/brand/logo-fidelity.mjs
//
// Exits 1 when a class falls under its target. Dev-only: nothing here ships.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { logoSvg, LOGO_COLORS } from '../../src/components/ui/logoGeometry.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const out = (name) => resolve(root, 'design/brand', name);

// The letterforms and the trefoil are flat shapes and must match closely.
// The bolt and its red strips are painted strokes a few pixels wide in the
// artwork: a one-pixel anti-aliasing difference along an 8 px strip costs a
// quarter of its overlap, and where the bolt crosses the white letters its
// pale core is hard to tell from white. Their rows match the artwork to
// within a pixel (checked edge by edge); these floors guard against drift.
const TARGETS = { letter: 0.93, tint: 0.85, bolt: 0.78, red: 0.74 };
const MAX_SHIFT = { letter: 2, tint: 4, bolt: 4, red: 12 };

const source = `data:image/png;base64,${readFileSync(out('logo-source.png')).toString('base64')}`;
const vector = logoSvg({ viewBox: '0 0 1080 1080', background: '#000000', size: 1080 });
const vectorUrl = `data:image/svg+xml;base64,${Buffer.from(vector).toString('base64')}`;

const sizes = [16, 24, 32, 48, 64, 96, 128];
const sizeStrip = [
  { bg: '#0b0f1a', ink: LOGO_COLORS.ink, keyline: null },
  { bg: '#f8fafc', ink: LOGO_COLORS.inkOnLight, keyline: LOGO_COLORS.keyline },
].map(({ bg, ink, keyline }) => ({
  bg,
  marks: sizes.map((s) => `data:image/svg+xml;base64,${Buffer.from(
    logoSvg({ ink, keyline, size: s, detail: s < 40 ? 'small' : 'full' }),
  ).toString('base64')}`),
}));

const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage();
const result = await page.evaluate(async ({ source, vectorUrl, sizeStrip, sizes }) => {
  const load = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  const [src, vec] = await Promise.all([load(source), load(vectorUrl)]);
  const N = 1080;
  const pixels = (img) => {
    const c = document.createElement('canvas'); c.width = N; c.height = N;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, N, N);
    return g.getImageData(0, 0, N, N).data;
  };
  const a = pixels(src);
  const b = pixels(vec);
  // Pixel classes, the same rules for both images.
  const classOf = (d, i, x, y) => {
    const r = d[i]; const g = d[i + 1]; const bl = d[i + 2];
    const inBolt = y < 450 && x > 470 && x < 630;
    const white = r > 200 && g > 200 && bl > 205;
    if (r > 150 && g < 110 && bl < 110) return 'red';
    if (inBolt && !white && r > 200 && g > 120) return 'bolt';
    if (r > 200 && g > 200 && (white || g > 215)) return white ? 'letter' : 'tint';
    return null;
  };
  const names = ['letter', 'tint', 'bolt', 'red'];
  const stat = Object.fromEntries(names.map((n) => [n, { i: 0, u: 0, ax: 0, ay: 0, an: 0, bx: 0, by: 0, bn: 0 }]));
  const diff = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y += 1) {
    for (let x = 0; x < N; x += 1) {
      const i = (y * N + x) * 4;
      let ca = classOf(a, i, x, y);
      let cb = classOf(b, i, x, y);
      // The tint is part of the letterform: compare letterforms as letter ∪ tint.
      for (const n of names) {
        const inA = ca === n || (n === 'letter' && ca === 'tint');
        const inB = cb === n || (n === 'letter' && cb === 'tint');
        if (inA || inB) stat[n].u += 1;
        if (inA && inB) stat[n].i += 1;
        if (inA) { stat[n].ax += x; stat[n].ay += y; stat[n].an += 1; }
        if (inB) { stat[n].bx += x; stat[n].by += y; stat[n].bn += 1; }
      }
      const la = ca === 'letter' || ca === 'tint';
      const lb = cb === 'letter' || cb === 'tint';
      const o = i;
      if (la && lb) { diff[o] = 70; diff[o + 1] = 70; diff[o + 2] = 70; }
      else if (la) { diff[o] = 255; diff[o + 1] = 40; diff[o + 2] = 40; }
      else if (lb) { diff[o] = 40; diff[o + 1] = 140; diff[o + 2] = 255; }
      else if (ca || cb) { diff[o] = 255; diff[o + 1] = 210; diff[o + 2] = 0; }
      diff[o + 3] = 255;
      ca = null; cb = null;
    }
  }
  const report = Object.fromEntries(names.map((n) => {
    const s = stat[n];
    const shift = s.an && s.bn ? Math.hypot(s.ax / s.an - s.bx / s.bn, s.ay / s.an - s.by / s.bn) : null;
    return [n, { iou: s.u ? s.i / s.u : 1, shift }];
  }));
  // Compare sheet: artwork | vector | difference (cropped to the mark).
  const crop = { x: 200, y: 170, w: 680, h: 680 };
  const sheet = document.createElement('canvas'); sheet.width = crop.w * 3; sheet.height = crop.h;
  const sg = sheet.getContext('2d');
  sg.drawImage(src, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  sg.drawImage(vec, crop.x, crop.y, crop.w, crop.h, crop.w, 0, crop.w, crop.h);
  const dc = document.createElement('canvas'); dc.width = N; dc.height = N;
  dc.getContext('2d').putImageData(new ImageData(diff, N, N), 0, 0);
  sg.drawImage(dc, crop.x, crop.y, crop.w, crop.h, crop.w * 2, 0, crop.w, crop.h);
  // Sizes strip.
  const pad = 16;
  const rowH = Math.max(...sizes) + pad * 2;
  const strip = document.createElement('canvas');
  strip.width = sizes.reduce((t, s) => t + s + pad, pad); strip.height = rowH * sizeStrip.length;
  const tg = strip.getContext('2d');
  for (let r = 0; r < sizeStrip.length; r += 1) {
    tg.fillStyle = sizeStrip[r].bg; tg.fillRect(0, r * rowH, strip.width, rowH);
    let x = pad;
    for (let k = 0; k < sizes.length; k += 1) {
      const img = await load(sizeStrip[r].marks[k]);
      tg.drawImage(img, x, r * rowH + (rowH - sizes[k]) / 2, sizes[k], sizes[k]);
      x += sizes[k] + pad;
    }
  }
  return { report, compare: sheet.toDataURL('image/png'), sizes: strip.toDataURL('image/png') };
}, { source, vectorUrl, sizeStrip, sizes });
await browser.close();

writeFileSync(out('compare.png'), Buffer.from(result.compare.split(',')[1], 'base64'));
writeFileSync(out('sizes.png'), Buffer.from(result.sizes.split(',')[1], 'base64'));

let failed = false;
for (const [name, { iou, shift }] of Object.entries(result.report)) {
  const ok = iou >= TARGETS[name] && (shift === null || shift <= MAX_SHIFT[name]);
  if (!ok) failed = true;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(6)} IoU ${iou.toFixed(3)} (≥ ${TARGETS[name]})  centre moved ${shift === null ? '-' : shift.toFixed(1)} px (≤ ${MAX_SHIFT[name]})`);
}
console.log('wrote design/brand/compare.png and design/brand/sizes.png');
process.exit(failed ? 1 : 0);
