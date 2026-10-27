// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { effectiveItems, keyVersionOf } from '@ree/shared';
import {
  buildExamTexDocument, buildExamTexDocumentSync, loadQrEncoder, mergeWarnings,
  texDocumentName, texWarningLines,
} from './buildExamTex';
import { PART_MACROS, PRACTICE_LINE, answerSheetPage, mm, qrModuleRuns } from './texTemplates';
import { escapeText } from './latexEscape';
import { answerSheetGeometry, fiducialCentres } from './sheetLayout';
import { sheetGeometryFor } from './paperFormat';
import { FAKE_QR, twelveItemDraw } from './__fixtures__/fixtureDraws';
import { bracesBalanced, countOf, envsBalanced, isAscii } from './__fixtures__/texAssert';

const PRINT_ID = 'K7P29QXAM3TD';
const SET_CODE = 'K7P2-9QXA-M3TD';

let draw;
let doc;
beforeAll(async () => {
  draw = { ...(await twelveItemDraw()), printId: PRINT_ID };
  doc = buildExamTexDocumentSync(draw, { paper: 'a4', includeSolutions: true, qr: FAKE_QR });
});

/** The text of one part: from \reepart{kind} to \reeendpart{kind}. */
const partOf = (content, kind) => {
  const from = content.indexOf(`\\reepart{${kind}}`);
  const to = content.indexOf(`\\reeendpart{${kind}}`);
  expect(from, kind).toBeGreaterThanOrEqual(0);
  expect(to, kind).toBeGreaterThan(from);
  return content.slice(from, to);
};

describe('the fixture draw', () => {
  it('covers the hard cases: 4, 5 and 6 options, an unmatched key, a figure, a mixed paper', () => {
    expect(draw.items).toHaveLength(12);
    expect(new Set(draw.items.map((it) => it.options.length))).toEqual(new Set([4, 5, 6]));
    expect(draw.items.filter((it) => it.answerIndex < 0)).toHaveLength(1);
    expect(draw.items.filter((it) => it.figure)).toHaveLength(1);
    expect(draw.sections.map((s) => [s.subject, s.from, s.to])).toEqual([['Mathematics', 1, 3], ['ESAS', 4, 7], ['EE', 8, 12]]);
  });
});

describe('buildExamTexDocument: one file', () => {
  it('is one well-formed, self-contained, ASCII-only document that starts with \\documentclass', () => {
    const { content, name, bytes } = doc;
    expect(content.startsWith('\\documentclass[10pt]{article}\n')).toBe(true);
    expect(countOf(content, /\\documentclass/g)).toBe(1);
    expect(countOf(content, /\\begin\{document\}/g)).toBe(1);
    expect(countOf(content, /\\end\{document\}/g)).toBe(1);
    expect(content.trimEnd().endsWith('\\end{document}')).toBe(true);
    expect(isAscii(content)).toBe(true);
    expect(bracesBalanced(content)).toBe(true);
    expect(envsBalanced(content)).toBe(true);
    for (const pkg of ['amsmath', 'tabularx', 'multicol', 'enumitem', 'tikz', 'fancyhdr']) expect(content).toContain(pkg);
    expect(content).not.toContain('lastpage');
    expect(content).toContain(PRACTICE_LINE);
    expect(name).toBe(`REE-BLENDED-${draw.setLabel.replace(' ', '')}-2026-10-20.tex`);
    expect(name).toBe(texDocumentName(draw));
    expect(bytes).toBe(content.length);
    expect(doc.parts).toEqual(['paper', 'sheet', 'key']);
  });

  it('says how to compile it in a header comment, right under \\documentclass', () => {
    const head = doc.content.slice(0, doc.content.indexOf('\\usepackage'));
    expect(head).toContain('% One file: the question paper, the answer sheet and the answer key.');
    expect(head).toContain('twice with pdflatex');
    expect(head).toContain('-no-shell-escape');
    expect(head).toContain('Overleaf');
    expect(head).toContain(`Set code ${SET_CODE}.`);
  });

  it('numbers each part\'s pages on its own, with the \\reepart scheme', () => {
    const { content } = doc;
    for (const line of PART_MACROS) expect(content).toContain(line);
    expect(content).toContain('\\fancyfoot[R]{\\scriptsize Page \\thepage\\ of \\pageref{\\reelast}}');
    const order = [...content.matchAll(/\\(reepart|reeendpart)\{(\w+)\}/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(order).toEqual(['reepart:paper', 'reeendpart:paper', 'reepart:sheet', 'reeendpart:sheet', 'reepart:key', 'reeendpart:key']);
    expect(content.indexOf('\\reepart{paper}')).toBeGreaterThan(content.indexOf('\\begin{document}'));
  });

  it('puts the set code in every footer', () => {
    expect(doc.content).toContain(`\\fancyfoot[L]{\\scriptsize\\color{black!60}REE Pre-board \\textperiodcentered{} BLENDED \\textperiodcentered{} ${draw.setLabel} \\textperiodcentered{} Set code ${SET_CODE}}`);
    const { printId, ...unsaved } = draw;
    expect(printId).toBe(PRINT_ID);
    const old = buildExamTexDocumentSync(unsaved, { documents: { key: true } });
    expect(old.content).toContain(`Set ${draw.setId} \\textperiodcentered{} Key v${draw.keyVersion}}`);
    expect(buildExamTexDocumentSync(draw, { documents: { key: true }, setCode: 'ABCD' }).content).toContain('Set code ABCD}');
  });

  it.each([
    ['a4', 'a4paper'],
    ['letter', 'letterpaper'],
    ['long', 'paperwidth=8.5in,paperheight=13in'],
  ])('sets the %s page size, for the sheet too', (paper, geometry) => {
    const { content, geometry: geo } = buildExamTexDocumentSync(draw, { paper, qr: null });
    expect(content).toContain(`\\usepackage[${geometry},top=14mm,bottom=18mm,left=14mm,right=14mm,footskip=8mm]{geometry}`);
    expect(geo.paper).toBe(paper);
  });

  it('takes the paper from the draw when none is given', () => {
    const { content } = buildExamTexDocumentSync({ ...draw, paper: 'long' }, { qr: null });
    expect(content).toContain('paperwidth=8.5in,paperheight=13in');
  });

  it('holds only the parts asked for', () => {
    const keyOnly = buildExamTexDocumentSync(draw, { documents: { paper: false, sheet: false, key: true } });
    expect(keyOnly.parts).toEqual(['key']);
    expect(keyOnly.geometry).toBeNull();
    expect(keyOnly.content).not.toContain('\\reepart{paper}');
    expect(keyOnly.content).not.toContain('remember picture');
    expect(keyOnly.content).toContain('% One file: the answer key.');
    const two = buildExamTexDocumentSync(draw, { documents: { paper: true, key: true } });
    expect([...two.content.matchAll(/\\reepart\{(\w+)\}/g)].map((m) => m[1])).toEqual(['paper', 'key']);
    expect(() => buildExamTexDocumentSync(draw, { documents: {} })).toThrow('Choose at least one part to print.');
    expect(() => buildExamTexDocumentSync({ ...draw, items: [] })).toThrow();
  });

  it('is deterministic', async () => {
    const again = buildExamTexDocumentSync({ ...(await twelveItemDraw()), printId: PRINT_ID }, { paper: 'a4', includeSolutions: true, qr: FAKE_QR });
    expect(again.content).toBe(doc.content);
  });

  it('reports what it couldn\'t print, as sentences', () => {
    expect(doc.warnings).toEqual(expect.objectContaining({ unknownGlyphs: expect.any(Number), demoted: expect.any(Number), glyphs: expect.any(Array) }));
    expect(texWarningLines({ unknownGlyphs: 1, glyphs: ['U+2603'], demoted: 2, unbalancedFields: 0 })).toEqual([
      '1 character with no LaTeX form prints as "?" (U+2603).',
      "2 formulas couldn't be converted safely and print as plain text.",
    ]);
    expect(mergeWarnings([{ glyphs: new Set(['b']), demoted: 1 }, { glyphs: ['a'], demoted: 3 }])).toEqual({
      unknownGlyphs: 0, glyphs: ['a', 'b'], demoted: 3, unbalancedFields: 0,
    });
  });

  it('draws each sheet page\'s QR from the qrcode package when no QR is passed', async () => {
    const loaded = await buildExamTexDocument(draw, { paper: 'a4', documents: { sheet: true } });
    const encode = await loadQrEncoder();
    const same = buildExamTexDocumentSync(draw, { paper: 'a4', documents: { sheet: true }, qr: encode });
    expect(loaded.content).toBe(same.content);
    expect(countOf(partOf(loaded.content, 'sheet').split('% header and footer')[0], /\\fill \(/g)).toBeGreaterThan(30);
  });
});

describe('the question paper part', () => {
  it('has one \\item per question, each section starting at its number', () => {
    const tex = partOf(doc.content, 'paper');
    expect(countOf(tex, /^\\item /gm)).toBe(12);
    expect([...tex.matchAll(/start=(\d+),/g)].map((m) => Number(m[1]))).toEqual([1, 4, 8]);
    expect(tex).toContain('\\examsection{Part II -- Engineering Sciences and Allied Subjects (items 4--7)}');
    // Custom 3/4/5 at the board's pace: 540 + 576 + 1080 s, to 5 minutes.
    expect(tex).toContain('Time allotment: 40 minutes');
  });

  it('draws the figure box only on the item that mentions a figure', () => {
    const items = partOf(doc.content, 'paper').split(/^\\item /m).slice(1);
    const withBox = items.map((body, i) => [i + 1, /^\\examfigure$/m.test(body)]).filter(([, has]) => has).map(([n]) => n);
    expect(withBox).toEqual(draw.items.filter((it) => it.figure).map((it) => it.n));
  });

  it('prints a printed set\'s edits: wording, options and the key', () => {
    const edits = {
      1: { text: 'Edited stem: $\\frac{1}{2}$ of $V = IR$', options: ['one', 'two', 'three'], answerIndex: 2 },
      2: { answerIndex: 0 },
    };
    const items = effectiveItems(draw.items, edits);
    const edited = { ...draw, items, keyVersion: keyVersionOf(items) };
    const { content, geometry } = buildExamTexDocumentSync(edited, { includeSolutions: true, qr: null });
    expect(partOf(content, 'paper')).toContain('\\item Edited stem: $\\frac{1}{2}$ of $V = IR$');
    const key = new Map([...partOf(content, 'key').matchAll(/(\d+)\. & \\textbf\{([A-Z]|--)\}/g)].map((m) => [Number(m[1]), m[2]]));
    expect(key.get(1)).toBe('C');
    expect(key.get(2)).toBe('A');
    expect(geometry.pages[0].bubbles.filter((b) => b.n === 1)).toHaveLength(3);
    expect(geometry.pages[0].qr.payload.endsWith(`:K${edited.keyVersion.toUpperCase()}`)).toBe(true);
    expect(partOf(content, 'sheet')).toContain(`:\\allowbreak{}K${edited.keyVersion.toUpperCase()}`);
  });
});

// --- the answer sheet ------------------------------------------------------

const NUM = '(-?\\d+(?:\\.\\d+)?)';
const RECT = new RegExp(`^\\\\(?:fill|draw\\[[^\\]]*\\]) \\(${NUM},${NUM}\\) rectangle \\(${NUM},${NUM}\\);$`);
const CIRCLE = new RegExp(`^\\\\draw\\[line width=\\.3pt\\] \\(${NUM},${NUM}\\) circle\\[radius=${NUM}\\];$`);
const NODE = new RegExp(`^\\\\node\\[([^\\]]*)\\] at \\(${NUM},${NUM}\\) \\{(.*)\\};$`);

/** The sheet's TikZ, page by page and section by section ("% corner squares"...), as parsed shapes. */
function parseSheet(content) {
  const chunks = content.split(/^% Answer sheet, page /m).slice(1);
  return chunks.map((chunk) => {
    const picture = chunk.slice(0, chunk.indexOf('\\end{tikzpicture}'));
    const sections = {};
    let current = null;
    for (const line of picture.split('\n')) {
      const head = /^% (.+)$/.exec(line);
      if (head) { current = head[1]; sections[current] = { rects: [], circles: [], nodes: [] }; continue; }
      if (!current) continue;
      let m = RECT.exec(line);
      if (m) { sections[current].rects.push({ x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4], line }); continue; }
      m = CIRCLE.exec(line);
      if (m) { sections[current].circles.push({ cx: +m[1], cy: +m[2], r: +m[3] }); continue; }
      m = NODE.exec(line);
      if (m) { sections[current].nodes.push({ opts: m[1], x: +m[2], y: +m[3], body: m[4] }); continue; }
      if (line.trim()) sections[current].other = [...(sections[current].other || []), line];
    }
    return { head: picture.slice(0, picture.indexOf('% corner squares')), sections };
  });
}

const near = (a, b) => Math.abs(a - b) <= 0.01;
const expectNear = (actual, expected, what) => {
  expect(near(actual, expected), `${what}: ${actual} vs ${expected}`).toBe(true);
};

describe('the answer sheet part: a TikZ overlay from answerSheetGeometry', () => {
  let encode;
  beforeAll(async () => { encode = await loadQrEncoder(); });

  const cases = [
    ['12 mixed items on A4', () => draw, 'a4'],
    ['100 items on Letter', () => ({ ...draw, items: Array.from({ length: 100 }, (_, i) => ({ ...draw.items[i % 12], n: i + 1 })) }), 'letter'],
    ['150 six-option items on long bond, over two pages', () => ({
      ...draw,
      items: Array.from({ length: 150 }, (_, i) => ({ ...draw.items[i % 12], n: i + 1, options: ['a', 'b', 'c', 'd', 'e', 'f'] })),
    }), 'long'],
    ['300 items on A4, over several pages', () => ({ ...draw, items: Array.from({ length: 300 }, (_, i) => ({ ...draw.items[i % 12], n: i + 1 })) }), 'a4'],
  ];

  it.each(cases)('%s: every mark sits where the geometry says, to 0.01 mm', (label, make, paper) => {
    const d = make();
    const { content, geometry } = buildExamTexDocumentSync(d, { paper, documents: { sheet: true }, qr: encode });
    expect(geometry).toEqual(sheetGeometryFor(d, { paper }));
    const pages = parseSheet(content);
    expect(pages).toHaveLength(geometry.pages.length);
    expect(countOf(content, /\\thispagestyle\{empty\}/g)).toBe(geometry.pages.length);
    expect(countOf(content, /\\begin\{tikzpicture\}\[remember picture,overlay,x=1mm,y=-1mm,shift=\{\(current page\.north west\)\}\]/g))
      .toBe(geometry.pages.length);

    geometry.pages.forEach((page, p) => {
      const { sections } = pages[p];
      const at = `${label}, page ${p + 1}`;

      // Corner squares: solid, centred on fiducialCentres, the spec's size.
      const squares = sections['corner squares'].rects;
      expect(squares).toHaveLength(4);
      squares.forEach((s, i) => {
        expect(s.line.startsWith('\\fill')).toBe(true);
        expectNear((s.x1 + s.x2) / 2, fiducialCentres(paper)[i].x, `${at} square ${i} x`);
        expectNear((s.y1 + s.y2) / 2, fiducialCentres(paper)[i].y, `${at} square ${i} y`);
        expectNear(s.x2 - s.x1, page.fiducialSize, `${at} square ${i} w`);
        expectNear(s.y2 - s.y1, page.fiducialSize, `${at} square ${i} h`);
      });
      // 8 mm from the edges.
      expectNear(squares[0].x1, 8, `${at} left edge`);
      expectNear(squares[0].y1, 8, `${at} top edge`);
      expectNear(geometry.w - squares[2].x2, 8, `${at} right edge`);
      expectNear(geometry.h - squares[2].y2, 8, `${at} bottom edge`);

      // Bubbles: the circles and their letters, in order, at the geometry's centres and radius.
      const { circles, nodes: letters } = sections['bubbles and their letters'];
      expect(circles).toHaveLength(page.bubbles.length);
      expect(letters).toHaveLength(page.bubbles.length);
      page.bubbles.forEach((b, i) => {
        expectNear(circles[i].cx, b.cx, `${at} bubble ${b.n}${b.letter} cx`);
        expectNear(circles[i].cy, b.cy, `${at} bubble ${b.n}${b.letter} cy`);
        expectNear(circles[i].r, b.r, `${at} bubble ${b.n}${b.letter} r`);
        expectNear(letters[i].x, b.cx, `${at} letter ${b.n}${b.letter} x`);
        expectNear(letters[i].y, b.cy, `${at} letter ${b.n}${b.letter} y`);
        expect(letters[i].body).toBe(b.letter);
        expect(letters[i].opts).toContain('text=black!45');
        expect(letters[i].opts).toContain('\\fontsize{5}');
      });

      // Item numbers, right-aligned at the label point.
      const numbers = sections['item numbers'].nodes;
      expect(numbers.map((n) => Number(n.body))).toEqual(page.labels.map((l) => l.n));
      page.labels.forEach((l, i) => {
        expect(numbers[i].opts).toContain('anchor=east');
        expectNear(numbers[i].x, l.x, `${at} label ${l.n} x`);
        expectNear(numbers[i].y, l.y, `${at} label ${l.n} y`);
      });

      // The ID strip: a solid square per filled cell, nothing for an empty one.
      const cells = sections['ID strip'].rects;
      const filled = page.idCells.filter((c) => c.filled);
      expect(cells).toHaveLength(filled.length);
      filled.forEach((c, i) => {
        expectNear(cells[i].x1, c.x, `${at} id cell x`);
        expectNear(cells[i].y1, c.y, `${at} id cell y`);
        expectNear(cells[i].x2 - cells[i].x1, c.size, `${at} id cell size`);
        expectNear(cells[i].y2 - cells[i].y1, c.size, `${at} id cell size`);
      });

      // Name and date boxes, with their labels inside.
      const boxes = [page.nameBox, page.dateBox].filter(Boolean);
      const drawn = sections['name and date boxes'];
      expect(drawn.rects).toHaveLength(boxes.length);
      boxes.forEach((box, i) => {
        expectNear(drawn.rects[i].x1, box.x, `${at} box x`);
        expectNear(drawn.rects[i].y1, box.y, `${at} box y`);
        expectNear(drawn.rects[i].x2, box.x + box.w, `${at} box right`);
        expectNear(drawn.rects[i].y2, box.y + box.h, `${at} box bottom`);
        expect(drawn.nodes[i].body).toBe(escapeText(box.label));
        expect(drawn.nodes[i].x).toBeGreaterThan(box.x);
        expect(drawn.nodes[i].y).toBeGreaterThan(box.y);
      });

      // Header and footer: each string at its point, anchored as the geometry says.
      const texts = sections['header and footer'];
      const strings = page.text.filter((t) => t.str);
      expect(texts.nodes).toHaveLength(strings.length);
      strings.forEach((t, i) => {
        const node = texts.nodes[i];
        expectNear(node.x, t.x, `${at} "${t.str}" x`);
        expectNear(node.y, t.y, `${at} "${t.str}" y`);
        expect(node.opts).toContain(`anchor=${{ start: 'base west', middle: 'base', end: 'base east' }[t.anchor]}`);
        expect(node.opts).toContain(`\\fontsize{${t.size}}`);
        expect(node.opts.includes('\\bfseries')).toBe(t.weight === 'bold');
        expect(node.body).toMatch(new RegExp(`^\\\\reefit\\{[\\d.]+mm\\}\\{${escapeText(t.str).replace(/[\\{}.$^*+?()[\]|]/g, '\\$&')}\\}$`));
      });
      const boxed = page.text.filter((t) => t.box);
      expect(texts.rects).toHaveLength(boxed.length);
      boxed.forEach((t, i) => {
        expectNear(texts.rects[i].x1, t.box.x, `${at} set box x`);
        expectNear(texts.rects[i].y2, t.box.y + t.box.h, `${at} set box bottom`);
      });
      expect(page.text.some((t) => /Page \d+ of \d+/.test(t.str))).toBe(true);

      // The QR: its module runs at absolute mm rebuild this page's matrix exactly.
      const modules = encode(page.qr.payload);
      const u = page.qr.size / modules.size;
      const dark = new Set();
      for (const r of sections['QR code'].rects) {
        const row = (r.y1 - page.qr.y) / u;
        const from = (r.x1 - page.qr.x) / u;
        const to = (r.x2 - page.qr.x) / u;
        expect(Math.abs(row - Math.round(row))).toBeLessThan(0.01);
        expectNear(r.y2 - r.y1, u, `${at} QR row height`);
        for (let c = Math.round(from); c < Math.round(to); c += 1) dark.add(`${Math.round(row)},${c}`);
      }
      for (let r = 0; r < modules.size; r += 1) {
        for (let c = 0; c < modules.size; c += 1) expect(dark.has(`${r},${c}`), `${at} QR module ${r},${c}`).toBe(!!modules.get(r, c));
      }
      const xs = sections['QR code'].rects.flatMap((r) => [r.x1, r.x2]);
      expectNear(Math.min(...xs), page.qr.x, `${at} QR left`);
      expectNear(Math.max(...xs), page.qr.x + page.qr.size, `${at} QR right`);
    });
  });

  it('asks the encoder for each page\'s own payload', () => {
    const big = { ...draw, items: Array.from({ length: 300 }, (_, i) => ({ ...draw.items[i % 12], n: i + 1 })) };
    const spy = vi.fn(() => FAKE_QR);
    const { geometry } = buildExamTexDocumentSync(big, { documents: { sheet: true }, qr: spy });
    expect(geometry.pages.length).toBeGreaterThan(1);
    expect(spy.mock.calls.map((c) => c[0])).toEqual(geometry.pages.map((p) => p.qr.payload));
    expect(new Set(spy.mock.calls.map((c) => c[0])).size).toBe(geometry.pages.length);
  });

  it('prints the QR payload as text in its box when there is no QR', () => {
    const { content, geometry } = buildExamTexDocumentSync(draw, { documents: { sheet: true }, qr: null });
    const [page] = parseSheet(content);
    const qr = geometry.pages[0].qr;
    expect(page.sections['QR code'].rects).toHaveLength(1);
    expect(page.sections['QR code'].rects[0].line.startsWith('\\draw')).toBe(true);
    expect(page.sections['QR code'].nodes[0].body).toBe(qr.payload.split(':').join(':\\allowbreak{}'));
    expect(qr.payload).toMatch(/^REE2:K7P29QXAM3TD:P1\/1:A4:K/);
  });

  it('turns a module matrix into runs of dark modules', () => {
    const m = { size: 4, get: (r, c) => [[1, 1, 0, 1], [0, 0, 0, 0], [1, 1, 1, 1], [0, 1, 0, 0]][r][c] === 1 };
    expect(qrModuleRuns(m)).toEqual([
      { row: 0, from: 0, to: 2 }, { row: 0, from: 3, to: 4 }, { row: 2, from: 0, to: 4 }, { row: 3, from: 1, to: 2 },
    ]);
    expect(qrModuleRuns(null)).toEqual([]);
    expect(mm(1 / 3)).toBe('0.333');
    expect(mm(12)).toBe('12');
  });

  it('keeps long header text off the QR by scaling it, never wrapping it', () => {
    const geo = answerSheetGeometry({ optionCounts: [4, 4], printId: PRINT_ID, meta: { title: 'X'.repeat(120), setLabel: 'SET A' } });
    const tex = answerSheetPage(geo.pages[0], geo, { modules: null });
    const title = tex.split('\n').find((l) => l.includes('XXXX'));
    const room = Number(/\\reefit\{([\d.]+)mm\}/.exec(title)[1]);
    const t = geo.pages[0].text.find((x) => x.str.startsWith('XXX'));
    expect(t.x + room).toBeLessThanOrEqual(geo.pages[0].qr.x);
    expect(title).not.toContain('text width=');
  });
});

describe('the answer key part', () => {
  it('prints the letter of each answer in the presented order', () => {
    const tex = partOf(doc.content, 'key');
    const key = new Map([...tex.matchAll(/(\d+)\. & \\textbf\{([A-Z]|--)\}/g)].map((m) => [Number(m[1]), m[2]]));
    expect(key.size).toBe(12);
    for (const it of draw.items) {
      if (it.answerIndex >= 0) expect(key.get(it.n)).toBe('ABCDEF'[it.answerIndex]);
      else expect(key.get(it.n)).toBe('--');
    }
    expect(tex).toContain('The stored answer matches none of the options.');
    expect(tex).toContain(`Set code ${SET_CODE} -- Key v${draw.keyVersion}`);
  });

  it('shows the section ranges of a mixed paper', () => {
    expect(partOf(doc.content, 'key')).toContain('Part III -- Electrical Engineering Professional Subjects: items 8--12');
  });

  it('adds a worked solution per item, or says none is stored', () => {
    const tex = partOf(doc.content, 'key');
    expect(countOf(tex, /^\\par\\medskip\\noindent\\textbf\{\d+\.\}~\\textsc\{/gm)).toBe(12);
    const missing = draw.items.filter((it) => !it.explanation).length;
    expect(missing).toBeGreaterThan(0);
    expect(countOf(tex, /No worked solution is stored for this item yet\./g)).toBe(missing);
    expect(buildExamTexDocumentSync(draw, { documents: { key: true }, includeSolutions: false }).content).not.toContain('Worked solutions');
  });
});
