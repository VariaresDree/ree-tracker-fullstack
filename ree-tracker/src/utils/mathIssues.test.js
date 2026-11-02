import { describe, it, expect } from 'vitest';
import { mathIssues } from './mathIssues';

describe('mathIssues', () => {
  it('passes good math and plain text', () => {
    expect(mathIssues('Use $X_L = 2\\pi f L$ and $$\\frac{1}{2}$$ here.')).toEqual([]);
    expect(mathIssues('No math, 5 dollars.')).toEqual([]);
    expect(mathIssues(null)).toEqual([]);
  });

  it('knows the app macro and the other delimiters', () => {
    expect(mathIssues('Cost: $\\peso 5$')).toEqual([]);
    expect(mathIssues('Then \\(\\frac{1}{2}\\) holds.')).toEqual([]);
  });

  it('names math KaTeX can not render', () => {
    expect(mathIssues('Bad: $\\frac{1}{$ here.')).toHaveLength(1);
    expect(mathIssues('Bad: $\\notacommand{x}$')[0]).toContain('\\notacommand');
  });

  it('catches LaTeX a JSON parser swallowed', () => {
    expect(mathIssues('$T = \frac{V}{R}$')[0]).toMatch(/damaged/i);
    expect(mathIssues('$P \times h$')[0]).toMatch(/damaged/i);
  });
});
