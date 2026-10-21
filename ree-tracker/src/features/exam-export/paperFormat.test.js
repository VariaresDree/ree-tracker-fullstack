// @vitest-environment node
// The paper helpers (moved from board-simulator/examPaper.js). mathToText's
// tests keep their old invariant: jsPDF's standard font only renders WinAnsi
// (Latin-1), so it must emit readable text with NO code point above U+00FF.
import { describe, it, expect } from 'vitest';
import { formatPrintId } from '@ree/shared';
import {
  PRACTICE_LINE, SUBJECT_CODE, answerLetterFor, chooseOptionLayout, columnMajorPosition, deriveExamIdentity,
  formatDuration, formatPaperDate, letterOf, loadQrEncoder, loadQrModules, mathToText, paperDay, partLabel,
  setCodeFor, setLabelFor, sheetGeometryFor,
} from './paperFormat';
import { answerSheetGeometry, parseQrPayload } from './sheetLayout';
import * as oldHome from '../board-simulator/examPaper';

const isWinAnsiSafe = (s) => [...s].every((c) => c.charCodeAt(0) <= 0xFF);

describe('mathToText: conversions', () => {
  it('renders fractions and superscripts readably', () => {
    expect(mathToText('$T(s) = \\frac{100}{s^2 + 10s + 100}$'))
      .toBe('T(s) = (100)/(s\u00B2 + 10s + 100)');
  });

  it('resolves nested frac/sqrt from the inside out', () => {
    expect(mathToText('$\\frac{1}{2\\pi\\sqrt{LC}}$')).toBe('(1)/(2pi sqrt(LC))');
  });

  it('spells greek and maps operators to Latin-1 glyphs', () => {
    expect(mathToText('$\\alpha \\times \\beta$')).toBe('alpha \u00D7 beta');
    expect(mathToText('$P = \\sqrt{3} V_L I_L \\cos\\theta$')).toBe('P = sqrt(3) V_L I_L costheta');
  });

  it('keeps plain prose untouched', () => {
    const prose = 'In a nuclear power plant, what is the primary function of the moderator?';
    expect(mathToText(prose)).toBe(prose);
  });

  it('strips braces and backslashes entirely', () => {
    const out = mathToText('$\\frac{a}{b} \\leq \\Omega$');
    expect(out).toBe('(a)/(b) <= ohm');
    expect(out).not.toMatch(/[\\{}]/);
  });

  it('normalises pre-rendered unicode math to safe text', () => {
    expect(mathToText('\u03B2 = \u221A(x\u00B2) \u2264 \u221E \u00B7 \u00B5F')).toBe('beta = sqrt(x\u00B2) <= infinity \u00B7 \u00B5F');
  });

  it('handles braced subscripts', () => {
    expect(mathToText('$V_{NL}$ and t_p')).toBe('V_NL and t_p');
  });

  it('drops explicit LaTeX spaces and renders degrees', () => {
    expect(mathToText('$5\\ \\mu F$')).toBe('5 \u00B5 F');
    expect(mathToText('$0^\\circ C$ and $\\alpha = 90^\\circ$')).toBe('0\u00B0 C and alpha = 90\u00B0');
  });
});

describe('mathToText: WinAnsi safety (no tofu on the PDF)', () => {
  const samples = [
    '$T(s) = \\frac{100}{s^2 + 10s + 100}$, peak time t_p?',
    'pre-arcing $I^2 t$ rating of 12000 A\u00B7s',
    'flux density of 1.2 T, area 150 cm$^2$',
    '$\\mu_0 = 4\\pi \\times 10^{-7}$ T\u00B7m/A',
    'delay angle $\\alpha = 90^\\circ$ ($\\pi/2$ radians)',
    'Q = Q_0 e^{\\beta x}, 0 \\le x \\le 1',
    '\u03B2 = \u221A(x\u00B2) \u2264 \u221E \u2265 \u2260 \u2248 \u2192 \u00B1 \u00B0 \u00B5 \u03A9 \u0394 \u03A3',
  ];
  it('never emits a character above U+00FF', () => {
    for (const s of samples) {
      const out = mathToText(s);
      expect(isWinAnsiSafe(out), `unsafe glyph in: "${out}"`).toBe(true);
      expect(out).not.toMatch(/[\\{}]/);
    }
  });
});

// --- Column-major answer-key ordering -------------------------------------
describe('columnMajorPosition', () => {
  it('fills each column top-to-bottom (PH convention): 50 items, 5 cols of 10', () => {
    const rows = 10; // 50 items / 5 columns
    // Item index 0 (item #1) -> col 0, row 0. Index 9 (#10) -> col 0, row 9.
    expect(columnMajorPosition(0, rows)).toEqual({ col: 0, row: 0 });
    expect(columnMajorPosition(9, rows)).toEqual({ col: 0, row: 9 });
    // Index 10 (#11) starts column 1 at the top - NOT row-major (which would
    // have put #6 at col 0/row 1).
    expect(columnMajorPosition(10, rows)).toEqual({ col: 1, row: 0 });
    expect(columnMajorPosition(49, rows)).toEqual({ col: 4, row: 9 });
  });

  it('guards against a zero row count', () => {
    expect(columnMajorPosition(3, 0)).toEqual({ col: 3, row: 0 });
  });
});

// --- Answer-letter derivation (the highest-risk correctness path) ---------
describe('answerLetterFor', () => {
  const q = (answer, options) => ({ answer, options });

  it('maps the stored answer to its option letter (0 is A)', () => {
    expect(answerLetterFor(q('12 V', ['3 V', '12 V', '6 V', '24 V']))).toEqual({ letter: 'B', matched: true });
    expect(answerLetterFor(q('3 V', ['3 V', '12 V', '6 V', '24 V']))).toEqual({ letter: 'A', matched: true });
  });

  it('matches despite whitespace/case differences (was a silent "-" before)', () => {
    expect(answerLetterFor(q('  12  v ', ['3 V', '12 V', '6 V']))).toEqual({ letter: 'B', matched: true });
  });

  it('reports unmatched (letter "-") when the answer is not among the options', () => {
    expect(answerLetterFor(q('99 V', ['3 V', '12 V']))).toEqual({ letter: '-', matched: false });
  });
});

// --- Deterministic exam identity for the QR -------------------------------
describe('deriveExamIdentity', () => {
  const pool = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

  it('is deterministic: same pool and key, same setId + keyVersion', () => {
    const a = deriveExamIdentity(pool, ['A', 'B', 'C']);
    const b = deriveExamIdentity(pool, ['A', 'B', 'C']);
    expect(a).toEqual(b);
    expect(typeof a.setId).toBe('string');
    expect(a.setId.length).toBeGreaterThan(0);
  });

  it('keyVersion changes when an answer changes (but setId stays)', () => {
    const a = deriveExamIdentity(pool, ['A', 'B', 'C']);
    const b = deriveExamIdentity(pool, ['A', 'B', 'D']); // last answer edited
    expect(b.setId).toBe(a.setId);           // same question set
    expect(b.keyVersion).not.toBe(a.keyVersion); // key content differs
  });

  it('setId changes when the question set changes', () => {
    const a = deriveExamIdentity(pool, ['A', 'B', 'C']);
    const b = deriveExamIdentity([{ id: 'q1' }, { id: 'qX' }, { id: 'q3' }], ['A', 'B', 'C']);
    expect(b.setId).not.toBe(a.setId);
  });
});

describe('the small formatters', () => {
  it('formats a time allotment', () => {
    expect(formatDuration(360)).toBe('6 hours');
    expect(formatDuration(60)).toBe('1 hour');
    expect(formatDuration(90)).toBe('1 hr 30 min');
    expect(formatDuration(40)).toBe('40 minutes');
    expect(formatDuration(undefined)).toBe('0 minutes');
  });

  it('labels parts, letters and sets', () => {
    expect(partLabel(0)).toBe('Part I');
    expect(partLabel(2)).toBe('Part III');
    expect(partLabel(7)).toBe('Part 8');
    expect([0, 1, 5].map(letterOf)).toEqual(['A', 'B', 'F']);
    expect(setLabelFor('abc')).toMatch(/^SET [A-D]$/);
    expect(setLabelFor('abc')).toBe(setLabelFor('abc'));
    expect(SUBJECT_CODE.Mathematics).toBe('MATH');
  });

  it('dates the paper in Manila, whatever the clock zone', () => {
    // 20:30 UTC on the 20th is already the 21st in Manila (UTC+8).
    expect(paperDay('2026-10-20T20:30:00Z')).toBe('2026-10-21');
    expect(formatPaperDate('2026-10-20T01:00:00Z')).toBe('Tuesday, October 20, 2026');
  });

  it('keeps the practice line ASCII (LaTeX prints its -- as an en dash)', () => {
    expect(PRACTICE_LINE).toBe('Practice paper generated by REE.ai -- not an official PRC document');
  });

  it('formats the set code, or gives none for a draw never saved', () => {
    expect(setCodeFor('K7P29QXAM3TD')).toBe('K7P2-9QXA-M3TD');
    expect(setCodeFor('K7P29QXAM3TD')).toBe(formatPrintId('K7P29QXAM3TD'));
    expect(setCodeFor('')).toBe('');
    expect(setCodeFor(undefined)).toBe('');
  });
});

describe('chooseOptionLayout', () => {
  it('lays options out by printed length', () => {
    expect(chooseOptionLayout(['1', '2', '3', '4'])).toEqual({ cols: 4, rows: 1 });
    expect(chooseOptionLayout(['1', '2', '3', '4', '5'])).toEqual({ cols: 3, rows: 2 });
    expect(chooseOptionLayout(['147 kWh', '151 kWh', '120 kWh', '135 kWh'])).toEqual({ cols: 2, rows: 2 });
    expect(chooseOptionLayout(['The first answer', 'The second answer', 'x', 'y'])).toEqual({ cols: 2, rows: 2 });
    expect(chooseOptionLayout(['A sentence long enough to need its own line', 'b'])).toEqual({ cols: 1, rows: 2 });
  });

  it('measures math by its rendering, unless told the printed length', () => {
    // "\\frac{1}{2}" prints as (1)/(2): 7 characters, so two across.
    expect(chooseOptionLayout(['$x^2$', '$\\pi$', '$2$', '$y$'])).toEqual({ cols: 4, rows: 1 });
    expect(chooseOptionLayout(['$\\frac{1}{2}$', '$x^2$', '$\\pi$', '$2$'])).toEqual({ cols: 2, rows: 2 });
    expect(chooseOptionLayout(['$x^2$', '$\\pi$', '$2$', '$y$'], [40])).toEqual({ cols: 1, rows: 4 });
    expect(chooseOptionLayout([])).toEqual({ cols: 1, rows: 1 });
    expect(chooseOptionLayout(null)).toEqual({ cols: 1, rows: 1 });
  });
});

describe('sheetGeometryFor', () => {
  const draw = {
    plan: { code: 'EE', title: 'Electrical Engineering Professional Subjects' },
    setLabel: 'SET B',
    keyVersion: 'abc12',
    printId: 'K7P29QXAM3TD',
    paper: 'letter',
    items: [4, 5, 6, 4].map((count, i) => ({ n: i + 1, options: Array.from({ length: count }, (_, k) => `o${k}`) })),
  };

  it('is answerSheetGeometry for the draw: its option counts, paper, set and key', () => {
    const geo = sheetGeometryFor(draw);
    expect(geo).toEqual(answerSheetGeometry({
      optionCounts: [4, 5, 6, 4],
      paper: 'letter',
      printId: 'K7P29QXAM3TD',
      keyVersion: 'abc12',
      meta: {
        title: draw.plan.title,
        setLabel: 'SET B',
        code: 'EE',
        practiceLine: 'Practice paper generated by REE.ai \u2013 not an official PRC document',
        setCode: 'K7P2-9QXA-M3TD',
      },
    }));
    expect(parseQrPayload(geo.pages[0].qr.payload)).toMatchObject({ printId: 'K7P29QXAM3TD', paper: 'letter', keyVersion: 'abc12' });
    const strings = geo.pages[0].text.map((t) => t.str);
    expect(strings).toEqual(expect.arrayContaining(['ANSWER SHEET', draw.plan.title, 'SET B', 'Set code K7P2-9QXA-M3TD']));
  });

  it('takes the paper, set and code it is given over the draw\'s', () => {
    const geo = sheetGeometryFor(draw, { paper: 'long', printId: 'A7P29QXAM3TD', setCode: 'X' });
    expect(geo.paper).toBe('long');
    expect(parseQrPayload(geo.pages[0].qr.payload).printId).toBe('A7P29QXAM3TD');
    expect(geo.pages[0].text.map((t) => t.str)).toContain('Set code X');
    const unsaved = sheetGeometryFor({ ...draw, printId: undefined, paper: undefined });
    expect(unsaved.paper).toBe('a4');
    expect(unsaved.pages[0].text.some((t) => /Set code/.test(t.str))).toBe(false);
  });
});

describe('the QR encoder', () => {
  it('encodes a sheet payload as a module matrix', async () => {
    const encode = await loadQrEncoder();
    expect(typeof encode).toBe('function');
    const modules = encode('REE2:K7P29QXAM3TD:P1/1:A4:KABC12');
    expect(modules.size).toBeGreaterThanOrEqual(21);
    expect(typeof modules.get(0, 0)).not.toBe('undefined');
    expect((await loadQrModules('REE2:K7P29QXAM3TD:P1/1:A4:KABC12')).size).toBe(modules.size);
  });
});

describe('examPaper.js re-exports the moved helpers', () => {
  it('until the old dialog is deleted', () => {
    for (const name of ['mathToText', 'SUBJECT_CODE', 'formatDuration', 'columnMajorPosition', 'answerLetterFor',
      'deriveExamIdentity', 'setLabelFor', 'partLabel', 'formatPaperDate', 'paperDay', 'letterOf', 'chooseOptionLayout']) {
      expect(oldHome[name], name).toBeDefined();
    }
    expect(oldHome.mathToText).toBe(mathToText);
    expect(typeof oldHome.generateExamPaper).toBe('function');
  });
});
