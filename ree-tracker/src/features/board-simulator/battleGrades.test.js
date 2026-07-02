import { describe, it, expect } from 'vitest';
import { computeBattleDiagnostics } from './battleGrades';

// Sanitized battle questions with the user's picks baked in at submit time —
// no `answer` field until the server's key arrives.
const questions = [
  { id: 'q1', subject: 'Mathematics', subtopic: 'Algebra', userAnswer: '4', userConf: 'HIGH' },
  { id: 'q2', subject: 'EE', subtopic: 'AC Circuits', userAnswer: '10 Ω', userConf: 'HIGH' },
  { id: 'q3', subject: 'EE', subtopic: 'AC Circuits', userAnswer: null, userConf: 'LOW' },
  { id: 'q4', subject: 'ESAS', subtopic: 'Thermo', userAnswer: 'B', userConf: 'MED' },
];

const answerKey = { q1: '4', q2: '20 Ω', q3: 'C', q4: 'B' };

describe('computeBattleDiagnostics', () => {
  it('grades against the revealed answer key', () => {
    const { diagnostics } = computeBattleDiagnostics({ questions, answerKey, timeTakenSecs: 300 });
    expect(diagnostics.correctItems).toBe(2); // q1 + q4
    expect(diagnostics.totalItems).toBe(4);
    expect(diagnostics.score).toBe(50);
    expect(diagnostics.verdict).toBe('FAILED');
    expect(diagnostics.timeTakenSecs).toBe(300);
  });

  it('patches the real answers into the questions for the review screen', () => {
    const { mappedQuestions } = computeBattleDiagnostics({ questions, answerKey });
    expect(mappedQuestions.map((q) => q.answer)).toEqual(['4', '20 Ω', 'C', 'B']);
    // user picks stay intact
    expect(mappedQuestions[1].userAnswer).toBe('10 Ω');
  });

  it('flags high-confidence misses as blind spots', () => {
    const { diagnostics } = computeBattleDiagnostics({ questions, answerKey });
    expect(diagnostics.blindSpots.map((q) => q.id)).toEqual(['q2']); // HIGH conf, wrong
  });

  it('computes per-subject percentages with Mathematics → Math aliasing', () => {
    const { diagnostics } = computeBattleDiagnostics({ questions, answerKey });
    expect(diagnostics.subjectScores.Math).toBe(100);
    expect(diagnostics.subjectScores.EE).toBe(0);
    expect(diagnostics.subjectScores.ESAS).toBe(100);
  });

  it('derives verdict tiers from the score', () => {
    const passing = computeBattleDiagnostics({
      questions: questions.map((q) => ({ ...q, userAnswer: answerKey[q.id] })),
      answerKey,
    });
    expect(passing.diagnostics.score).toBe(100);
    expect(passing.diagnostics.verdict).toBe('PASSED');
  });

  it('handles an empty question set without dividing by zero', () => {
    const { diagnostics } = computeBattleDiagnostics({ questions: [], answerKey: {} });
    expect(diagnostics.score).toBe(0);
    expect(diagnostics.verdict).toBe('FAILED');
  });
});
