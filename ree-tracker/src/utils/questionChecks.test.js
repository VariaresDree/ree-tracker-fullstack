import { describe, it, expect } from 'vitest';
import { questionIssues, normalizeGenerated } from './questionChecks';

const good = {
  text: 'A 230 V, 60 Hz source feeds a 10 $\\Omega$ resistor. Find the current.',
  options: ['23 A', '2.3 A', '230 A', '0.23 A'],
  answer: '23 A',
  type: 'calculation',
  difficulty: 1,
  fixedExplanation: '**Given:** V = 230 V, R = 10 ohm. **Solution:** I = V/R = 23 A.',
};

describe('questionIssues', () => {
  it('passes a well-formed question', () => {
    expect(questionIssues(good)).toEqual([]);
  });

  it('flags the form errors models make', () => {
    expect(questionIssues({ ...good, answer: '24 A' })).toContain('The answer matches none of the options');
    expect(questionIssues({ ...good, options: ['23 A', '23 A', '1 A', '2 A'] })).toContain('Two options are the same');
    expect(questionIssues({ ...good, options: ['23 A', '1 A', '2 A'] })).toContain('Has 3 options, not 4');
    expect(questionIssues({ ...good, options: ['23 A', '1 A', '2 A', 'None of the above'] })).toContain('Uses "all/none of the above"');
    expect(questionIssues({ ...good, fixedExplanation: '' })).toContain('No worked explanation');
    expect(questionIssues({ ...good, text: 'Find $x' })).toEqual(expect.arrayContaining(['Unbalanced $ in the math']));
    expect(questionIssues(good, { expectedType: 'conceptual' })).toContain('Asked for conceptual, got calculation');
  });
});

describe('normalizeGenerated', () => {
  it('maps a letter answer and case-only mismatches onto the option text', () => {
    expect(normalizeGenerated({ ...good, answer: 'B' }).answer).toBe('2.3 A');
    expect(normalizeGenerated({ ...good, answer: '23 a' }).answer).toBe('23 A');
  });
  it('normalises type and difficulty', () => {
    const q = normalizeGenerated({ ...good, type: 'Calculation', difficulty: '7' });
    expect(q.type).toBe('calculation');
    expect(q.difficulty).toBe(3);
    expect(normalizeGenerated({ ...good, type: 'theory' }).type).toBe('conceptual');
  });
});
