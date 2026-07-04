// Unit tests for the answer-choice-label sanitiser. The AI generator
// occasionally bakes an enumerator ("A.", "b)", "(C)", "D:") into the option
// text; the quiz UI then renders its own label on top, producing "A. A. ...".
// These tests pin the exact strip behaviour AND the false-positive guards that
// keep legitimate engineering answer strings intact (grading is an exact match,
// so mangling an answer would silently break scoring).

import { describe, it, expect } from 'vitest';
import {
    stripChoicePrefix,
    sanitizeOptions,
    sanitizeGeneratedQuestion,
} from './sanitizeOptions.js';

describe('stripChoicePrefix', () => {
    it('strips the common label styles', () => {
        expect(stripChoicePrefix('A. Ohm')).toBe('Ohm');
        expect(stripChoicePrefix('b) Ohm')).toBe('Ohm');
        expect(stripChoicePrefix('(C) Ohm')).toBe('Ohm');
        expect(stripChoicePrefix('D: Ohm')).toBe('Ohm');
        expect(stripChoicePrefix('  a)   Ohm')).toBe('Ohm');
    });

    it('leaves un-prefixed text untouched', () => {
        expect(stripChoicePrefix('746 W')).toBe('746 W');
        expect(stripChoicePrefix('$8.854 \\times 10^{-12}$ F/m')).toBe('$8.854 \\times 10^{-12}$ F/m');
    });

    it('does not mangle legitimate answers that merely start with A-D', () => {
        expect(stripChoicePrefix('A tale of two resistors')).toBe('A tale of two resistors');
        expect(stripChoicePrefix('AC voltage')).toBe('AC voltage');
        expect(stripChoicePrefix('A.C. supply')).toBe('A.C. supply'); // no space after "A."
        expect(stripChoicePrefix('D-type flip-flop')).toBe('D-type flip-flop'); // hyphen not a separator
        expect(stripChoicePrefix('3.5 mm^2')).toBe('3.5 mm^2');
    });

    it('never empties a value out', () => {
        expect(stripChoicePrefix('B)')).toBe('B)');
    });

    it('passes through non-strings', () => {
        expect(stripChoicePrefix(undefined)).toBeUndefined();
        expect(stripChoicePrefix(null)).toBeNull();
    });
});

describe('sanitizeOptions', () => {
    it('cleans every option in the array', () => {
        expect(sanitizeOptions(['A. 5', 'B. 10', 'C. 15', 'D. 20'])).toEqual(['5', '10', '15', '20']);
    });
});

describe('sanitizeGeneratedQuestion', () => {
    it('keeps the answer aligned to its cleaned option', () => {
        const q = {
            text: 'What is 2+3?',
            options: ['A. 4', 'B. 5', 'C. 6', 'D. 7'],
            answer: 'B. 5',
        };
        const out = sanitizeGeneratedQuestion(q);
        expect(out.options).toEqual(['4', '5', '6', '7']);
        expect(out.answer).toBe('5');
        expect(out.options).toContain(out.answer); // grading invariant holds
    });

    it('is a no-op for objects without options/answer', () => {
        expect(sanitizeGeneratedQuestion({ text: 'x' })).toEqual({ text: 'x' });
    });
});
