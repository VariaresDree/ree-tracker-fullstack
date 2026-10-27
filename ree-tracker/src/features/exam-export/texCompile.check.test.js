// @vitest-environment node
// Compiles the one-file LaTeX export with a real pdflatex: a 100-item EE
// paper, the mixed paper, every tricky fixture and a 150-item paper (a
// two-page sheet), on A4, Letter and long bond, each run twice (for "Page X
// of Y" and the sheet's absolute marks) with -no-shell-escape and
// -halt-on-error. Then it checks the PDF: one
// \documentclass, no undefined reference, each part's page count, and the
// answer sheet's page count against answerSheetGeometry. With pdftoppm on
// PATH it also rasterises every sheet page and measures it: the four
// corner squares sit where fiducialCentres says, and the printed rings sit on
// the geometry's bubbles. Dev only: TeX is not a dependency of the repo.
//
//   npm run check:tex                      (skipped without pdflatex on PATH)
//   TEX_OUT=/some/dir npm run check:tex    keep the .tex/.pdf files there
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildExamTexDocument } from './buildExamTex';
import { fiducialCentres } from './sheetLayout';
import { CONFIGS, allTrickyDraw, fixtureDraw } from './__fixtures__/fixtureDraws';
import { countOf } from './__fixtures__/texAssert';

const has = (cmd, args) => {
  try {
    return spawnSync(cmd, args, { encoding: 'utf8' }).status === 0;
  } catch {
    return false;
  }
};
const hasTex = has('pdflatex', ['--version']);
const hasPoppler = has('pdfinfo', ['-v']) && has('pdftotext', ['-v']);
const hasRaster = has('pdftoppm', ['-v']);
const enabled = !!process.env.TEX_COMPILE && hasTex;

const PRINT_ID = 'K7P29QXAM3TD';
const DRAWS = {
  ee100: () => fixtureDraw(CONFIGS.ee100),
  blended: () => fixtureDraw(CONFIGS.blended),
  tricky: allTrickyDraw,
  // The most a set may hold, with 4-6 options: a sheet of two pages.
  ee150: () => fixtureDraw({ ...CONFIGS.ee100, isPrcStandard: false, count: 150 }),
};

const run = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 300000, maxBuffer: 64 * 1024 * 1024 });

/** A binary PGM (P5) as { w, h, data }. */
function readPgm(file) {
  const buf = fs.readFileSync(file);
  let pos = 0;
  const token = () => {
    while (/\s/.test(String.fromCharCode(buf[pos]))) pos += 1;
    if (buf[pos] === 0x23) { while (buf[pos] !== 0x0a) pos += 1; return token(); }
    let s = '';
    while (!/\s/.test(String.fromCharCode(buf[pos]))) { s += String.fromCharCode(buf[pos]); pos += 1; }
    return s;
  };
  expect(token()).toBe('P5');
  const w = Number(token());
  const h = Number(token());
  expect(Number(token())).toBe(255);
  pos += 1;
  return { w, h, data: buf.subarray(pos, pos + w * h) };
}

/** Darkness 0..1 at (x, y) in px, bilinear. */
function darkAt(img, x, y) {
  const x0 = Math.max(0, Math.min(img.w - 2, Math.floor(x)));
  const y0 = Math.max(0, Math.min(img.h - 2, Math.floor(y)));
  const fx = x - x0;
  const fy = y - y0;
  const v = (xx, yy) => img.data[yy * img.w + xx];
  const top = v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx;
  const bottom = v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx;
  return 1 - (top * (1 - fy) + bottom * fy) / 255;
}

/** The dark blob in a window around (cx, cy) mm: its centroid and area in mm. */
function blobNear(img, ppm, cx, cy, half) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = Math.floor((cy - half) * ppm); y <= Math.ceil((cy + half) * ppm); y += 1) {
    for (let x = Math.floor((cx - half) * ppm); x <= Math.ceil((cx + half) * ppm); x += 1) {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue;
      if (img.data[y * img.w + x] < 128) { n += 1; sx += x + 0.5; sy += y + 0.5; }
    }
  }
  return { x: n ? sx / n / ppm : NaN, y: n ? sy / n / ppm : NaN, area: n / ppm / ppm };
}

/** Mean darkness on circles of radius r (mm) around every bubble, shifted by (dx, dy) mm. */
function ringDarkness(img, ppm, bubbles, dx, dy, dr = 0) {
  let sum = 0;
  let count = 0;
  for (const b of bubbles) {
    const r = b.r + dr;
    for (let a = 0; a < 48; a += 1) {
      const t = (a / 48) * 2 * Math.PI;
      sum += darkAt(img, (b.cx + dx + r * Math.cos(t)) * ppm, (b.cy + dy + r * Math.sin(t)) * ppm);
      count += 1;
    }
  }
  return sum / count;
}

describe.skipIf(!enabled)('pdflatex compiles the one-file export', () => {
  const outRoot = process.env.TEX_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'ree-tex-'));

  for (const [name, make] of Object.entries(DRAWS)) {
    for (const paper of ['a4', 'letter', 'long']) {
      it(`${name} on ${paper}: question paper, answer sheet and key with solutions`, async () => {
        const draw = { ...(await make()), printId: PRINT_ID };
        const doc = await buildExamTexDocument(draw, { paper, includeSolutions: true });
        expect(countOf(doc.content, /\\documentclass/g)).toBe(1);
        expect(doc.content.startsWith('\\documentclass')).toBe(true);
        expect(doc.parts).toEqual(['paper', 'sheet', 'key']);

        const dir = path.join(outRoot, `${name}-${paper}`);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, doc.name), doc.content);
        for (let pass = 0; pass < 2; pass += 1) {
          const res = run('pdflatex', ['-no-shell-escape', '-halt-on-error', '-interaction=nonstopmode', doc.name], dir);
          expect(res.status, `${doc.name} (run ${pass + 1})\n${String(res.stdout).slice(-4000)}`).toBe(0);
        }
        const base = path.join(dir, doc.name.replace(/\.tex$/, ''));
        const log = fs.readFileSync(`${base}.log`, 'utf8');
        expect(log, 'references left undefined').not.toMatch(/There were undefined references|Reference `[^']*' on page \d+ undefined/);
        expect(log, 'labels still moving after the second run').not.toMatch(/Label\(s\) may have changed/);

        // Each part's last page, as \reeendpart recorded it.
        const aux = fs.readFileSync(`${base}.aux`, 'utf8');
        const pages = Object.fromEntries([...aux.matchAll(/\\newlabel\{reelast:(\w+)\}\{\{\}\{(\d+)\}\}/g)].map((m) => [m[1], Number(m[2])]));
        expect(Object.keys(pages)).toEqual(['paper', 'sheet', 'key']);
        expect(pages.sheet).toBe(doc.geometry.pages.length);
        expect(pages.paper).toBeGreaterThan(0);
        expect(pages.key).toBeGreaterThan(0);
        if (!hasPoppler) return;

        const pdf = `${base}.pdf`;
        const info = run('pdfinfo', [pdf], dir).stdout;
        expect(Number(/Pages:\s+(\d+)/.exec(info)[1])).toBe(pages.paper + pages.sheet + pages.key);
        // Each part's own "Page X of Y", and the sheet's footer from the geometry.
        const pageText = (p) => run('pdftotext', ['-f', String(p), '-l', String(p), '-layout', pdf, '-'], dir).stdout;
        expect(pageText(pages.paper)).toContain(`Page ${pages.paper} of ${pages.paper}`);
        expect(pageText(pages.paper + pages.sheet + 1)).toContain(`Page 1 of ${pages.key}`);
        doc.geometry.pages.forEach((page, i) => {
          const text = pageText(pages.paper + 1 + i);
          expect(text).toContain(`Page ${i + 1} of ${doc.geometry.pages.length}`);
          expect(text).toContain('ANSWER SHEET');
          expect(text).not.toMatch(/Page \d+ of \d+\s+Page/);
        });
        if (!hasRaster) return;

        // Every sheet page at 300 dpi.
        const dpi = 300;
        const ppm = dpi / 25.4;
        doc.geometry.pages.forEach((page, p) => {
          const at = `sheet page ${p + 1}`;
          const pdfPage = pages.paper + 1 + p;
          const prefix = path.join(dir, `sheet-${p + 1}`);
          const ras = run('pdftoppm', ['-f', String(pdfPage), '-l', String(pdfPage), '-r', String(dpi), '-gray', '-singlefile', pdf, prefix], dir);
          expect(ras.status, ras.stderr).toBe(0);
          const img = readPgm(`${prefix}.pgm`);
          fs.rmSync(`${prefix}.pgm`);
          expect(img.w / ppm).toBeCloseTo(doc.geometry.w, 0);
          expect(img.h / ppm).toBeCloseTo(doc.geometry.h, 0);
          // The corner squares: centred where fiducialCentres says, 7 mm across.
          for (const [i, c] of fiducialCentres(paper).entries()) {
            const blob = blobNear(img, ppm, c.x, c.y, 6);
            expect(Math.abs(blob.x - c.x), `${at}, square ${i} x`).toBeLessThan(0.5);
            expect(Math.abs(blob.y - c.y), `${at}, square ${i} y`).toBeLessThan(0.5);
            expect(blob.area, `${at}, square ${i} area`).toBeGreaterThan(45);
            expect(blob.area, `${at}, square ${i} area`).toBeLessThan(53);
          }
          // The rings: darkest exactly on the geometry's circles, not shifted.
          const { bubbles } = page;
          let best = { d: -1, dx: 0, dy: 0 };
          for (let dx = -1; dx <= 1.001; dx += 0.1) {
            for (let dy = -1; dy <= 1.001; dy += 0.1) {
              const d = ringDarkness(img, ppm, bubbles, dx, dy);
              if (d > best.d) best = { d, dx, dy };
            }
          }
          expect(Math.abs(best.dx), `${at}: rings shifted ${best.dx.toFixed(2)} mm across`).toBeLessThanOrEqual(0.15);
          expect(Math.abs(best.dy), `${at}: rings shifted ${best.dy.toFixed(2)} mm down`).toBeLessThanOrEqual(0.15);
          const onRing = ringDarkness(img, ppm, bubbles, 0, 0);
          expect(onRing, at).toBeGreaterThan(3 * ringDarkness(img, ppm, bubbles, 0, 0, 0.5));
          expect(onRing, at).toBeGreaterThan(3 * ringDarkness(img, ppm, bubbles, 0, 0, -0.5));
        });
      }, 600000);
    }
  }
});
