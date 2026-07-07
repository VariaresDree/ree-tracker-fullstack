// Tests for the exam-paper math converter. jsPDF's standard font only renders
// WinAnsi (Latin-1); the whole point of mathToText is to emit readable text with
// NO code point > 255 (those are what show up as "�" on the printed paper). We
// assert both the conversions and that invariant.
import { describe, it, expect } from 'vitest';
import { mathToText } from './examPaper.js';

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
