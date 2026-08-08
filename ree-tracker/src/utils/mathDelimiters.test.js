// src/utils/mathDelimiters.test.js
// Locks the defensive-delimiter contract. The bug this guards against was live
// on real data: the AI reference-card generator emits `formulaLatex` with NO `$`
// delimiters, so the reference vault rendered `\rho_{\text{Cu}} = \frac{R \cdot A}{l}`
// as literal source text — a wrong formula, in an exam app.
import { describe, it, expect } from 'vitest';
import { withMathDelimiters } from './mathDelimiters';

describe('withMathDelimiters', () => {
  it('wraps bare LaTeX that has no delimiters (the AI formulaLatex shape)', () => {
    expect(withMathDelimiters('X_c = \\frac{1}{2\\pi f C}')).toBe('$X_c = \\frac{1}{2\\pi f C}$');
    expect(withMathDelimiters('\\rho_{\\text{Cu}}')).toBe('$\\rho_{\\text{Cu}}$');
    expect(withMathDelimiters('m^2')).toBe('$m^2$');
  });

  it('leaves already-delimited content untouched (author intent wins)', () => {
    const inline = '$8.854\\times10^{-12}$ F/m';
    expect(withMathDelimiters(inline)).toBe(inline);
    const block = '$$X_c = \\frac{1}{2\\pi f C}$$';
    expect(withMathDelimiters(block)).toBe(block);
  });

  it('leaves plain prose alone so it is not forced into math italics', () => {
    expect(withMathDelimiters('meters')).toBe('meters');
    expect(withMathDelimiters('resistance of the conductor')).toBe('resistance of the conductor');
  });

  it('passes through empty and non-string values for the caller to skip', () => {
    expect(withMathDelimiters('')).toBe('');
    expect(withMathDelimiters(null)).toBe(null);
    expect(withMathDelimiters(undefined)).toBe(undefined);
  });
});
