// src/features/omr/pipeline.js
//
// The answer-sheet scanner, end to end, on ImageData-shaped RGBA
// (`{ data, width, height }`):
//
//   detectFiducials: a live 640 px frame -> are the four corner squares in view?
//   readSheet:       a capture (<= 2400 px) -> page, orientation, every row's answer.
//
// Pure: no DOM, no imports beyond this folder and sheetLayout.js, so it runs
// in the worker (omr.worker.js), on the main thread and in node tests.

import {
  OMR_SPEC, answerSheetGeometry, decodeIdBits, fiducialCentres, layoutHash, paperSize,
} from '../exam-export/sheetLayout';
import { downscaleGray, toGray, upscalePoint } from './gray';
import { adaptiveThreshold, integralImage } from './threshold';
import {
  connectedComponents, isFiducialCandidate, pickQuad, polygonArea, quadSkew,
} from './components';
import { applyHomography, rectifyRGBA, solveHomography } from './homography';
import { bubbleFill, cellOf, refineOffsets } from './sample';
import { answersFromRows, decideRows } from './decide';
import { readIdStrip, stripCells } from './idStrip';
import { edgeBlurMm, verifySquares } from './quality';
import { REASON_HINTS, hintFor } from './reasons';

export { REASON_HINTS, OMR_REASONS, hintFor } from './reasons';

export const PAPERS = Object.freeze(['a4', 'letter', 'long']);

/** Each paper's corner-centre rectangle in mm, (w - 23) x (h - 23). */
const PAPER_RECTS = PAPERS.map((p) => {
  const f = fiducialCentres(p);
  return { paper: p, w: f[1].x - f[0].x, h: f[3].y - f[0].y };
});

/** Each paper's corner-square aspect, (h - 23) / (w - 23): a4 1.465, letter 1.329, long 1.593. */
export const PAPER_ASPECTS = Object.freeze(Object.fromEntries(PAPER_RECTS.map((r) => [r.paper, r.h / r.w])));

export const OMR_LIMITS = Object.freeze({
  liveSide: 640, // live frames, long side
  captureSide: 2400, // captures and uploads, long side
  detectSide: 1280, // a capture's squares are found at about half size
  minCoverage: 0.2, // the squares' quadrilateral, as a share of the frame
  // Opposite sides may differ by 35% (a phone tilted ~17 degrees). The
  // homography itself copes with more (pickQuad accepts 60%), but the far
  // edge then has too few pixels per bubble.
  maxSkew: 0.35,
  // Blur, as edgeBlurMm (Gaussian sigma in page mm at the corner squares).
  // On synthetic photos sharp captures measure 0.05-0.3 mm; reading stays
  // exact, curl correction included, to ~0.9 mm, and past ~1.2 mm the corner
  // squares themselves stop being found. 0.7 keeps a margin on both sides.
  // See quality.js for why this replaced the brief's Laplacian-variance test.
  maxBlurMm: 0.7,
});

const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

function findSquares(gray, w, h, keep) {
  const minSide = Math.min(w, h);
  const ii = integralImage(gray, w, h);
  const bin = adaptiveThreshold(gray, w, h, { ii });
  const lo = minSide / 80;
  const hi = minSide / 8;
  const comps = connectedComponents(bin, w, h, { minArea: lo * lo, maxArea: hi * hi });
  const cands = comps.filter((c) => isFiducialCandidate(c, gray, w, h, { labels: comps.labels }));
  return { cands, pick: pickQuad(cands, { rects: PAPER_RECTS, squareMm: OMR_SPEC.fiducial.size, keep }) };
}

function scaleFactor(w, h, maxSide) {
  return Math.max(1, Math.ceil(Math.max(w, h) / maxSide - 1e-9));
}

/** Papers in order of how well their aspect fits the quad's. */
function papersFor(quad) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const across = (d(quad[0], quad[1]) + d(quad[3], quad[2])) / 2;
  const down = (d(quad[0], quad[3]) + d(quad[1], quad[2])) / 2;
  const a = Math.max(across, down) / Math.min(across, down);
  return PAPERS.slice().sort((p, q) => Math.abs(PAPER_ASPECTS[p] / a - 1) - Math.abs(PAPER_ASPECTS[q] / a - 1));
}

/**
 * H for the likeliest paper, held whichever way up the quad says (the
 * corner squares look the same at 0, 90, 180 or 270 degrees, so this is
 * enough to check them and measure blur before the ID strip is read).
 */
function provisionalH(quad) {
  const paper = papersFor(quad)[0];
  const centres = fiducialCentres(paper);
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const landscape = d(quad[0], quad[1]) + d(quad[3], quad[2]) > d(quad[0], quad[3]) + d(quad[1], quad[2]);
  const H = solveHomography(centres, landscape ? [quad[1], quad[2], quad[3], quad[0]] : quad);
  return H ? { paper, centres, H } : null;
}

// The quads that verify as four real squares, best first.
function verifiedQuads(gray, w, h, quads) {
  return quads.map((q) => ({ ...q, guess: provisionalH(q.quad) }))
    .filter(({ guess }) => guess && verifySquares(gray, w, h, guess.H, guess.centres, OMR_SPEC.fiducial.size).every(Boolean));
}

/**
 * The sheet among the verified quads: the first whose ID strip decodes
 * (shaded bubbles can pose as corner squares when a real one is hidden, but
 * never carry a strip). If none decodes, the best quad stands, without an
 * orientation, unless a comparable square lies outside it: then it is not
 * the sheet's corners at all ('no-sheet').
 * @returns {{ quad, guess, outside, orient: object|null } | { reason: 'no-sheet' }}
 */
function chooseSheet(gray, w, h, verified) {
  if (!verified.length) return { reason: 'no-sheet' };
  for (const v of verified) {
    const orient = orientSheet(gray, w, h, v.quad);
    if (orient) return { ...v, orient };
  }
  if (verified[0].outside > 0) return { reason: 'no-sheet' };
  return { ...verified[0], orient: null };
}

/**
 * Are the four corner squares in this live frame, and is the sheet framed
 * well enough to capture?
 * @param {{ data, width, height }} img RGBA (or one byte per pixel)
 * @param {{ maxSide?: number, limits?: object }} [opts] frames larger than maxSide are
 *   box-downscaled first; limits overrides OMR_LIMITS
 * @returns {{ found: boolean, quad: {x,y}[]|null, reason: string|null, hint: string|null,
 *   coverage: number, skew: number, blurMm: number|null,
 *   page: { paper, index, hash }|null, squares: {x,y,size}[], ms: number }}
 *   quad (TL, TR, BR, BL as seen) and squares (every square-like blob) in the
 *   frame's pixels. found = the four squares and the ID strip read, and no
 *   reason. page: what the strip says (compare hash with layoutHash(printId,
 *   optionCounts) to catch a wrong set before capturing).
 *   reason: no-sheet | too-small | too-skewed | blurry | unreadable-code
 */
export function detectFiducials(img, { maxSide = OMR_LIMITS.liveSide, limits } = {}) {
  const L = { ...OMR_LIMITS, ...(limits || {}) };
  const t0 = now();
  const W = img.width;
  const Hh = img.height;
  const f = scaleFactor(W, Hh, maxSide);
  const g = downscaleGray(toGray(img), W, Hh, f);
  const { cands, pick } = findSquares(g.gray, g.w, g.h, 4);
  const squares = cands.map((c) => ({ ...upscalePoint({ x: c.cx, y: c.cy }, f), size: Math.sqrt(c.area) * f }));
  const done = (out) => ({ ...out, hint: out.reason ? REASON_HINTS[out.reason] : null, squares, ms: now() - t0 });
  const sheet = chooseSheet(g.gray, g.w, g.h, pick ? verifiedQuads(g.gray, g.w, g.h, [pick, ...pick.alternatives]) : []);
  if (sheet.reason) return done({ found: false, quad: null, reason: sheet.reason, coverage: 0, skew: 0, blurMm: null, page: null });
  const quad = sheet.quad.map((p) => upscalePoint(p, f));
  const coverage = polygonArea(quad) / (W * Hh);
  const skew = quadSkew(quad);
  const blur = edgeBlurMm(g.gray, g.w, g.h, sheet.guess.H, sheet.guess.centres, OMR_SPEC.fiducial.size);
  const blurMm = Number.isFinite(blur) ? blur : null;
  const page = sheet.orient ? { paper: sheet.orient.id.paper, index: sheet.orient.id.pageIndex, hash: sheet.orient.id.hash } : null;
  let reason = null;
  if (coverage < L.minCoverage) reason = 'too-small';
  else if (skew > L.maxSkew) reason = 'too-skewed';
  else if (blurMm == null || blurMm > L.maxBlurMm) reason = 'blurry';
  else if (!page) reason = 'unreadable-code';
  return done({ found: !reason, quad, reason, coverage, skew, blurMm, page });
}

/**
 * A corner square's centre at full resolution: threshold a window round the
 * coarse centre halfway between the square and the paper, flood the square
 * from its darkest middle pixel, and take the centroid. Falls back to the
 * coarse point if the flood leaks out of the window.
 */
export function refineCentre(gray, w, h, p, size) {
  const half = Math.ceil(size * 1.15);
  const px = Math.round(p.x);
  const py = Math.round(p.y);
  const x0 = Math.max(0, px - half);
  const y0 = Math.max(0, py - half);
  const x1 = Math.min(w - 1, px + half);
  const y1 = Math.min(h - 1, py + half);
  if (x1 - x0 < 4 || y1 - y0 < 4) return p;
  const border = [];
  for (let x = x0; x <= x1; x += 1) border.push(gray[y0 * w + x], gray[y1 * w + x]);
  for (let y = y0; y <= y1; y += 1) border.push(gray[y * w + x0], gray[y * w + x1]);
  border.sort((a, b) => a - b);
  const white = border[Math.floor(border.length * 0.9)];
  let seed = -1;
  let dark = 256;
  const r = Math.max(1, Math.round(size / 5));
  for (let y = Math.max(y0, py - r); y <= Math.min(y1, py + r); y += 1) {
    for (let x = Math.max(x0, px - r); x <= Math.min(x1, px + r); x += 1) {
      if (gray[y * w + x] < dark) { dark = gray[y * w + x]; seed = y * w + x; }
    }
  }
  if (seed < 0 || white - dark < 20) return p;
  const cut = (white + dark) / 2;
  const seen = new Uint8Array((x1 - x0 + 1) * (y1 - y0 + 1));
  const ww = x1 - x0 + 1;
  const stack = [seed];
  seen[(Math.floor(seed / w) - y0) * ww + (seed % w) - x0] = 1;
  let n = 0;
  let sx = 0;
  let sy = 0;
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i - x) / w;
    if (x === x0 || x === x1 || y === y0 || y === y1) return p;
    n += 1;
    sx += x;
    sy += y;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = (ny - y0) * ww + nx - x0;
      if (seen[k]) continue;
      seen[k] = 1;
      if (gray[ny * w + nx] < cut) stack.push(ny * w + nx);
    }
  }
  if (n < size * size * 0.3) return p;
  return { x: sx / n, y: sy / n };
}

// Rotations of the quad as seen, against the page's TL, TR, BR, BL: 0 and 180
// degrees first (the brief's two), then 90 and 270 for a phone held sideways.
const ROTATIONS = [0, 2, 1, 3];
const rotate = (q, r) => [0, 1, 2, 3].map((i) => q[(i + r) % 4]);

/**
 * Which paper and which way up: for each paper (closest aspect first) and
 * each rotation, H from the paper's corner centres to the quad, then the ID
 * strip; the first strip that decodes, for that same paper, wins.
 */
export function orientSheet(gray, w, h, quad) {
  for (const paper of papersFor(quad)) {
    const centres = fiducialCentres(paper);
    for (const r of ROTATIONS) {
      const H = solveHomography(centres, rotate(quad, r));
      if (!H) continue;
      const bits = readIdStrip(gray, w, h, H, stripCells(paper));
      const id = decodeIdBits(bits);
      if (id && id.paper === paper) return { H, id, rotation: r * 90, bits };
    }
  }
  return null;
}

/**
 * Read one page of a printed answer sheet.
 *
 * @param {{ data, width, height }} img RGBA (ImageData-shaped), ideally <= 2400 px on the long side
 * @param {{
 *   printId: string, optionCounts: number[],   // the set, as printed
 *   pageCount?: number,     // accepted for the caller's bookkeeping; the page count comes from the geometry
 *   expectPage?: number,    // 0-based; another page is refused as 'wrong-page'
 *   qrPrintId?: string,     // the set the QR names, if one was read: a hash mismatch for the
 *                           // same set is then 'layout-changed' rather than 'wrong-set'
 *   refine?: boolean,       // curl correction (default true)
 *   reviewPpm?: number,     // > 0: also return the straightened sheet at this px/mm
 *   limits?: object,        // overrides for OMR_LIMITS (tests, tuning)
 * }} opts
 * @returns {object} on success:
 *   { ok: true, page: { index, count, paper, from, to }, rotation,
 *     corners: [TL, TR, BR, BL] (the page's corner-square centres, image px),
 *     H (page mm -> image px, 9 numbers), rows, answers, nameBox: [4 points, image px],
 *     quality: { coverage, skew, blurMm, sharpness (1 / blurMm), empty, marked }, review?, ms }
 *   rotation: how the sheet lay in the photo, 0 upright, 180 upside down, 90 / 270 a quarter turn
 *   each row: { n, status: 'single'|'blank'|'multiple'|'unsure', choice, marked, fills, levels,
 *     confidence, offset: {dx, dy}, bubbles: [{ k, letter, cx, cy, r }] (page mm, curl-corrected) }
 *   answers: one character per row in item order (A-F, '-' blank, '*' multiple; unsure = its top letter)
 *   review: { data: Uint8ClampedArray RGBA, width, height, ppm } (page mm x ppm = review px)
 *   on failure: { ok: false, reason, hint, quality?, corners?, page?, ms }
 */
export function readSheet(img, opts = {}) {
  const t0 = now();
  const { printId = '', optionCounts = [], expectPage, qrPrintId, refine = true, reviewPpm = 0 } = opts;
  const L = { ...OMR_LIMITS, ...(opts.limits || {}) };
  const W0 = img.width;
  const H0 = img.height;
  // Working image: at most ~2400 px on the long side.
  const wf = scaleFactor(W0, H0, OMR_LIMITS.captureSide * 1.05);
  const work = downscaleGray(toGray(img), W0, H0, wf);
  const { gray, w, h } = work;
  const fail = (reason, extra = {}) => ({ ok: false, reason, hint: hintFor(reason), ...extra, ms: now() - t0 });

  // 1. The squares, at about half size, each centre then refined at full
  // size; the best quad whose corners verify as real squares.
  const df = scaleFactor(w, h, OMR_LIMITS.detectSide);
  const small = downscaleGray(gray, w, h, df);
  const { pick } = findSquares(small.gray, small.w, small.h, 4);
  if (!pick) return fail('no-sheet');
  const toWork = (q) => q.map((p) => refineCentre(gray, w, h, upscalePoint(p, df), p.size * df));
  const candidates = [pick, ...pick.alternatives].map((c) => ({ ...c, quad: toWork(c.quad) }));
  const sheet = chooseSheet(gray, w, h, verifiedQuads(gray, w, h, candidates));
  if (sheet.reason) return fail(sheet.reason);
  const { quad, guess } = sheet;
  const toOrig = (p) => upscalePoint(p, wf);
  const coverage = polygonArea(quad) / (w * h);
  const skew = quadSkew(quad);
  const quality = { coverage, skew, sharpness: null, blurMm: null };
  if (coverage < L.minCoverage) return fail('too-small', { quality, corners: quad.map(toOrig) });
  if (skew > L.maxSkew) return fail('too-skewed', { quality, corners: quad.map(toOrig) });

  // 2. Blur, from the corner squares' edges (in page mm, any way up).
  const blur = edgeBlurMm(gray, w, h, guess.H, guess.centres, OMR_SPEC.fiducial.size);
  quality.blurMm = Number.isFinite(blur) ? blur : null;
  quality.sharpness = quality.blurMm ? 1 / quality.blurMm : 0;
  if (quality.blurMm == null || quality.blurMm > L.maxBlurMm) return fail('blurry', { quality, corners: quad.map(toOrig) });

  // 3. Paper and orientation, from the ID strip (read by chooseSheet).
  const found = sheet.orient;
  if (!found) return fail('unreadable-code', { quality, corners: quad.map(toOrig) });
  const { H, id, rotation } = found;
  const corners = fiducialCentres(id.paper).map((c) => toOrig(applyHomography(H, c.x, c.y)));
  if (id.hash !== layoutHash(printId, optionCounts)) {
    return fail(qrPrintId && qrPrintId === printId ? 'layout-changed' : 'wrong-set', { quality, corners });
  }
  const geometry = answerSheetGeometry({ optionCounts, paper: id.paper, printId });
  const page = geometry.pages[id.pageIndex];
  if (!page) return fail('layout-changed', { quality, corners });
  const pageInfo = { index: page.index, count: page.count, paper: id.paper, from: page.from, to: page.to };
  if (expectPage != null && expectPage !== page.index) return fail('wrong-page', { quality, corners, page: pageInfo });

  // 4. Curl correction, then every bubble.
  const offsets = refine ? refineOffsets(gray, w, h, H, page) : new Map();
  const zero = { dx: 0, dy: 0 };
  const placed = page.bubbles.map((b) => {
    const o = offsets.get(cellOf(page, b.n).group) || zero;
    return { ...b, cx: b.cx + o.dx, cy: b.cy + o.dy, offset: o };
  });
  const fills = placed.map((b) => bubbleFill(gray, w, h, H, b.cx, b.cy, b.r).fill);
  const decided = decideRows(page, fills);
  const byN = new Map();
  placed.forEach((b) => {
    if (!byN.has(b.n)) byN.set(b.n, []);
    byN.get(b.n).push(b);
  });
  const rows = decided.map((row) => {
    const cells = byN.get(row.n);
    const o = cells[0].offset;
    return {
      ...row,
      offset: { dx: o.dx, dy: o.dy },
      bubbles: cells.map(({ k, letter, cx, cy, r }) => ({ k, letter, cx, cy, r })),
    };
  });
  quality.empty = decided.e;
  quality.marked = decided.f;

  // Results in the caller's pixels: work px -> original px is a scale by wf.
  const s = wf;
  const t = (wf - 1) / 2;
  const Horig = [H[0] * s + H[6] * t, H[1] * s + H[7] * t, H[2] * s + H[8] * t,
    H[3] * s + H[6] * t, H[4] * s + H[7] * t, H[5] * s + H[8] * t, H[6], H[7], H[8]];
  const nb = page.nameBox;
  const nameBox = [[nb.x, nb.y], [nb.x + nb.w, nb.y], [nb.x + nb.w, nb.y + nb.h], [nb.x, nb.y + nb.h]]
    .map(([x, y]) => applyHomography(Horig, x, y));
  const out = {
    ok: true,
    page: pageInfo,
    rotation,
    corners,
    H: Horig,
    rows,
    answers: answersFromRows(rows),
    nameBox,
    quality,
  };
  if (reviewPpm > 0) {
    const { w: wMm, h: hMm } = paperSize(id.paper);
    out.review = rectifyRGBA(img, Horig, { wMm, hMm, ppm: reviewPpm });
  }
  out.ms = now() - t0;
  return out;
}

/** The corner squares' spec, re-exported for overlays: 7 mm squares, centres 11.5 mm in. */
export const FIDUCIAL = OMR_SPEC.fiducial;
