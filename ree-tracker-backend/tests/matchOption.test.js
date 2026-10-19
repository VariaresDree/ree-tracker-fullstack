import { describe, it, expect } from 'vitest';

// Grading compares the key with the chosen option's text exactly, so every
// write snaps a key that matches an option only up to form onto that option.
const { matchOption, sanitizeQuestionShape } = require('@ree/shared');

const OPTIONS = ['$1 - k^3$', '$1 - k^2$', '$k^3$', 'To compensate for the junction at $0^\\circ\\text{C}$.'];

describe('matchOption', () => {
    it('returns an exact option as it is', () => {
        expect(matchOption('$k^3$', OPTIONS)).toBe('$k^3$');
    });

    it('matches up to $ delimiters, spacing, a label and a closing full stop', () => {
        expect(matchOption('1 - k^3', OPTIONS)).toBe('$1 - k^3$');
        expect(matchOption('  $1  -  k^2$ ', OPTIONS)).toBe('$1 - k^2$');
        expect(matchOption('B. $1 - k^2$', OPTIONS)).toBe('$1 - k^2$');
        expect(matchOption('To compensate for the junction at $0^\\circ\\text{C}.', OPTIONS)).toBe(OPTIONS[3]);
    });

    it('refuses to guess: no match, two matches, or nothing to match', () => {
        expect(matchOption('$k^4$', OPTIONS)).toBeNull();
        expect(matchOption('F = A', ['$F = A$', 'x', '$F = A$'])).toBeNull();
        expect(matchOption('$', OPTIONS)).toBeNull();
        expect(matchOption(undefined, OPTIONS)).toBeNull();
        expect(matchOption('x', null)).toBeNull();
    });

    it('keeps meaningful differences apart', () => {
        expect(matchOption('$k^2$', ['$k^3$', '$2k$'])).toBeNull();
        expect(matchOption('10 A', ['10 mA', '100 A'])).toBeNull();
        expect(matchOption('10 MA', ['10 mA', '100 A'])).toBeNull();
    });
});

describe('sanitizeQuestionShape', () => {
    it('gives the key its option’s exact text', () => {
        const q = sanitizeQuestionShape({ options: ['A. $x^2$', 'B. $2x$'], answer: 'x^2' });
        expect(q).toMatchObject({ options: ['$x^2$', '$2x$'], answer: '$x^2$' });
    });

    it('leaves a key that matches nothing for the checks to refuse', () => {
        expect(sanitizeQuestionShape({ options: ['a', 'b'], answer: 'c' }).answer).toBe('c');
        expect(sanitizeQuestionShape({ answer: 'B. x' }).answer).toBe('x');
    });
});
