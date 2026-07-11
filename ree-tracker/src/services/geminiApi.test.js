// Regression tests for the "Bad escaped character in JSON" AI-generation crash.
// Gemini emits single-backslash LaTeX inside JSON strings (\pi, \sqrt, \()
// despite the prompt asking for \\pi — repairJsonEscapes must fix exactly
// those while leaving every VALID escape byte-identical.
import { describe, it, expect } from 'vitest';
import { repairJsonEscapes, parseAiJson } from './geminiApi';

describe('repairJsonEscapes', () => {
  it('doubles lone backslashes from illegal-escape LaTeX commands', () => {
    expect(repairJsonEscapes('\\pi')).toBe('\\\\pi');
    expect(repairJsonEscapes('\\sqrt{2}')).toBe('\\\\sqrt{2}');
    expect(repairJsonEscapes('\\(')).toBe('\\\\(');
    expect(repairJsonEscapes('\\,')).toBe('\\\\,');
  });

  it('doubles LaTeX that collides with legal control escapes (silent corruption class)', () => {
    // \times parses as tab+"imes", \frac as formfeed+"rac" — legal JSON,
    // corrupted math. Control char + letter never occurs intentionally here.
    expect(repairJsonEscapes('\\times')).toBe('\\\\times');
    expect(repairJsonEscapes('\\frac{V}{R}')).toBe('\\\\frac{V}{R}');
    expect(repairJsonEscapes('\\rho L')).toBe('\\\\rho L');
    expect(repairJsonEscapes('\\beta')).toBe('\\\\beta');
    expect(repairJsonEscapes('\\theta')).toBe('\\\\theta');
  });

  it('keeps genuine control escapes (not followed by a letter)', () => {
    expect(repairJsonEscapes('col1\\t5')).toBe('col1\\t5');
    expect(repairJsonEscapes('end\\r\\n')).toBe('end\\r\\n');
  });

  it('leaves already-valid JSON escapes untouched', () => {
    expect(repairJsonEscapes('\\\\times')).toBe('\\\\times'); // compliant double-escape
    expect(repairJsonEscapes('\\"quoted\\"')).toBe('\\"quoted\\"');
    // \n is deliberately kept even before a letter: real newlines in
    // explanations are common; \nabla is the rare accepted casualty.
    expect(repairJsonEscapes('line\\nbreak')).toBe('line\\nbreak');
    expect(repairJsonEscapes('\\u0041')).toBe('\\u0041');
    expect(repairJsonEscapes('\\/')).toBe('\\/');
  });

  it('doubles a \\u NOT followed by 4 hex digits (LaTeX \\underline)', () => {
    expect(repairJsonEscapes('\\underline')).toBe('\\\\underline');
  });

  it('handles a trailing lone backslash without reading past the end', () => {
    expect(repairJsonEscapes('dangling\\')).toBe('dangling\\\\');
  });

  it('is a no-op on plain text', () => {
    const s = 'What is the reactance of a 1H inductor at 60Hz?';
    expect(repairJsonEscapes(s)).toBe(s);
  });
});

describe('parseAiJson', () => {
  it('parses a compliant payload without modification', () => {
    const raw = '[{"text": "Compute $V = I \\\\times R$", "answer": "377 ohms"}]';
    expect(parseAiJson(raw)[0].answer).toBe('377 ohms');
  });

  it('recovers the real-world failure: single-backslash LaTeX in strings', () => {
    // This is the exact class of payload that crashed generation:
    // \sqrt and \pi are illegal JSON escapes as emitted.
    const raw = `[
      {"text": "Evaluate $\\sqrt{2} \\pi$ radians", "options": ["a", "b"], "answer": "a"}
    ]`;
    const parsed = parseAiJson(raw);
    expect(parsed[0].text).toBe('Evaluate $\\sqrt{2} \\pi$ radians');
  });

  it('strips markdown code fences before parsing', () => {
    const fenced = '```json\n[{"text": "plain", "answer": "x"}]\n```';
    expect(parseAiJson(fenced)[0].text).toBe('plain');
  });

  it('throws a toast-able message when the payload is beyond repair', () => {
    expect(() => parseAiJson('not json at all')).toThrow(/malformed JSON/);
  });
});
