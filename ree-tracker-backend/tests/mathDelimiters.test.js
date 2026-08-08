// tests/mathDelimiters.test.js
// Backend counterpart to ree-tracker/src/utils/mathDelimiters.test.js. Locks
// the same contract server-side, at the actual persistence choke point
// (toCardData in referenceCardRoutes.js) — the root cause was the AI
// reference-card prompt asking for formulaLatex WITHOUT `$` delimiters while
// asking for valueUnit WITH them, so the live DB accumulated both shapes.
import { describe, it, expect } from 'vitest';
const { withMathDelimiters } = require('../src/utils/mathDelimiters');

describe('withMathDelimiters', () => {
    it('wraps bare LaTeX that has no delimiters (the AI formulaLatex shape)', () => {
        expect(withMathDelimiters('X_c = \\frac{1}{2\\pi f C}')).toBe('$X_c = \\frac{1}{2\\pi f C}$');
        expect(withMathDelimiters('\\Omega')).toBe('$\\Omega$');
        expect(withMathDelimiters('m^2')).toBe('$m^2$');
    });

    it('leaves already-delimited content untouched', () => {
        const inline = '$8.854\\times10^{-12}$ F/m';
        expect(withMathDelimiters(inline)).toBe(inline);
        const block = '$$X_c = \\frac{1}{2\\pi f C}$$';
        expect(withMathDelimiters(block)).toBe(block);
    });

    it('leaves plain prose alone', () => {
        expect(withMathDelimiters('meters')).toBe('meters');
        expect(withMathDelimiters('resistance of the conductor')).toBe('resistance of the conductor');
    });

    it('passes through empty and non-string values for the caller to skip', () => {
        expect(withMathDelimiters('')).toBe('');
        expect(withMathDelimiters(null)).toBe(null);
        expect(withMathDelimiters(undefined)).toBe(undefined);
    });
});
