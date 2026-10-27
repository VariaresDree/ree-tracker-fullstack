// @ree/shared paper sets: the scoring, edit and key rules the app and the API
// both run (the API re-scores every scanned sheet with the same function).
import { describe, it, expect } from 'vitest';
import {
  ANSWER_RE, PRINT_ID_RE, effectiveItems, formatPrintId, itemEditErrors, keyVersionOf, normalizePrintId, scorePaperSheet,
} from '@ree/shared';

const item = (n, subject, answerIndex, options = ['a', 'b', 'c', 'd']) => ({ n, subject, text: `Q${n}`, options, answer: options[answerIndex] ?? 'x', answerIndex, explanation: null });
const SECTIONS = [{ subject: 'Mathematics', from: 1, to: 2 }, { subject: 'ESAS', from: 3, to: 4 }, { subject: 'EE', from: 5, to: 6 }];
const ITEMS = [item(1, 'Mathematics', 0), item(2, 'Mathematics', 1), item(3, 'ESAS', 2), item(4, 'ESAS', 3), item(5, 'EE', 0), item(6, 'EE', -1)];

describe('paper sets (shared)', () => {
  it('print ids are 12 Crockford characters, shown in fours, and read back however they are typed', () => {
    expect(PRINT_ID_RE.test('K7P29QXAM3TD')).toBe(true);
    expect(PRINT_ID_RE.test('K7P29QXAM3TU')).toBe(false); // no U
    expect(formatPrintId('K7P29QXAM3TD')).toBe('K7P2-9QXA-M3TD');
    expect(normalizePrintId(' k7p2-9qxa-m3td ')).toBe('K7P29QXAM3TD');
    expect(normalizePrintId('K7P2-9QXA-M3TO')).toBe('K7P29QXAM3T0'); // O is read as zero
    expect(normalizePrintId('nope')).toBeNull();
  });

  it('scores a sheet: a double mark and a blank score nothing, an unmatched key is not scored', () => {
    expect(ANSWER_RE.test('AB*-')).toBe(true);
    const r = scorePaperSheet({ items: ITEMS, sections: SECTIONS, profile: 'custom' }, 'AB*-AC');
    expect(r.perItem).toEqual(['right', 'right', 'multiple', 'blank', 'right', 'unscored']);
    expect(r).toMatchObject({ correct: 3, scored: 5, total: 6, percent: 60, generalAverage: null, verdict: null });
    expect(r.sections).toEqual([
      { subject: 'Mathematics', correct: 2, total: 2, percent: 100 },
      { subject: 'ESAS', correct: 0, total: 2, percent: 0 },
      { subject: 'EE', correct: 1, total: 1, percent: 100 },
    ]);
  });

  it('a PRC paper gets the board verdict: the average met with a subject under the floor is a conditional pass', () => {
    const r = scorePaperSheet({ items: ITEMS, sections: SECTIONS, profile: 'prc_blended' }, 'AB--A-');
    // Math 100, ESAS 0, EE 100 -> (25*100 + 30*0 + 45*100)/100 = 70, ESAS under 50.
    expect(r.generalAverage).toBe(70);
    expect(r.verdict).toBe('CONDITIONAL PASS');
  });

  it('an edit changes only that item; new options need the answer named, or the key goes unmatched', () => {
    const edited = effectiveItems(ITEMS, { 2: { text: 'Edited $x^2$', options: ['p', 'q', 'r'], answerIndex: 2 }, 3: { options: ['x', 'y'] } });
    expect(edited[1]).toMatchObject({ text: 'Edited $x^2$', options: ['p', 'q', 'r'], answerIndex: 2, answer: 'r', answerLetter: 'C', edited: true });
    expect(edited[2]).toMatchObject({ answerIndex: -1, answerLetter: '-' });
    expect(edited[0]).toMatchObject({ text: 'Q1', answerLetter: 'A', edited: false });
    expect(ITEMS[1].text).toBe('Q2'); // the drawn items are untouched
  });

  it('the key version changes when an answer letter does, and only then', () => {
    const base = keyVersionOf(effectiveItems(ITEMS, {}));
    expect(keyVersionOf(effectiveItems(ITEMS, { 1: { text: 'reworded' } }))).toBe(base);
    expect(keyVersionOf(effectiveItems(ITEMS, { 1: { answerIndex: 3 } }))).not.toBe(base);
  });

  it('checks an edit field by field', () => {
    expect(itemEditErrors({ text: 'fine' })).toEqual({});
    expect(itemEditErrors({ text: '  ' })).toHaveProperty('text');
    expect(itemEditErrors({ options: ['a'] , answerIndex: 0 })).toHaveProperty('options');
    expect(itemEditErrors({ options: ['a', 'A '], answerIndex: 0 })).toHaveProperty('options');
    expect(itemEditErrors({ options: ['a', 'b'] })).toHaveProperty('answerIndex');
    expect(itemEditErrors({ options: ['a', 'b'], answerIndex: 2 })).toHaveProperty('answerIndex');
    expect(itemEditErrors({ explanation: null })).toEqual({});
  });
});
