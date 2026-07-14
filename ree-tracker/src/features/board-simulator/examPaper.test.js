// Tests for the exam-paper math converter. jsPDF's standard font only renders
// WinAnsi (Latin-1); the whole point of mathToText is to emit readable text with
// NO code point > 255 (those are what show up as "�" on the printed paper). We
// assert both the conversions and that invariant.
import { describe, it, expect } from 'vitest';
import { mathToText, columnMajorPosition, answerLetterFor, deriveExamIdentity } from './examPaper.js';

const isWinAnsiSafe = (s) => [...s].every((c) => c.charCodeAt(0) <= 0xFF);

describe('mathToText — conversions', () => {
    it('renders fractions and superscripts readably', () => {
        expect(mathToText('$T(s) = \\frac{100}{s^2 + 10s + 100}$'))
            .toBe('T(s) = (100)/(s² + 10s + 100)');
    });

    it('resolves nested frac/sqrt from the inside out', () => {
        expect(mathToText('$\\frac{1}{2\\pi\\sqrt{LC}}$')).toBe('(1)/(2pi sqrt(LC))');
    });

    it('spells greek and maps operators to Latin-1 glyphs', () => {
        expect(mathToText('$\\alpha \\times \\beta$')).toBe('alpha × beta');
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
        expect(mathToText('β = √(x²) ≤ ∞ · µF')).toBe('beta = sqrt(x²) <= infinity · µF');
    });

    it('handles braced subscripts', () => {
        expect(mathToText('$V_{NL}$ and t_p')).toBe('V_NL and t_p');
    });

    it('drops explicit LaTeX spaces and renders degrees', () => {
        expect(mathToText('$5\\ \\mu F$')).toBe('5 µ F');
        expect(mathToText('$0^\\circ C$ and $\\alpha = 90^\\circ$')).toBe('0° C and alpha = 90°');
    });
});

describe('mathToText — WinAnsi safety (no tofu on the PDF)', () => {
    const samples = [
        '$T(s) = \\frac{100}{s^2 + 10s + 100}$, peak time t_p?',
        'pre-arcing $I^2 t$ rating of 12000 A·s',
        'flux density of 1.2 T, area 150 cm$^2$',
        '$\\mu_0 = 4\\pi \\times 10^{-7}$ T·m/A',
        'delay angle $\\alpha = 90^\\circ$ ($\\pi/2$ radians)',
        'Q = Q_0 e^{\\beta x}, 0 \\le x \\le 1',
        'β = √(x²) ≤ ∞ ≥ ≠ ≈ → ± ° µ Ω Δ Σ',
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
        // Item index 0 (item #1) → col 0, row 0. Index 9 (#10) → col 0, row 9.
        expect(columnMajorPosition(0, rows)).toEqual({ col: 0, row: 0 });
        expect(columnMajorPosition(9, rows)).toEqual({ col: 0, row: 9 });
        // Index 10 (#11) starts column 1 at the top — NOT row-major (which would
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

    it('maps the stored answer to its option letter (0→A)', () => {
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

    it('is deterministic: same pool + key → same setId + keyVersion', () => {
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
