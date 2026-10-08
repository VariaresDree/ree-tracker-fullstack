import { describe, it, expect } from 'vitest';
import { buildSessionSummary } from './buildSessionSummary';

const attempt = (questionId, subtopic, isCorrect, confidenceLevel = 'MED', timeSpentMs = 30000, subject = 'EE') => ({
  questionId, subject, subtopic, isCorrect, confidenceLevel, timeSpentMs,
});
const questions = [
  { id: 'q1', text: 'Relay pickup current?', answer: '5 A' },
  { id: 'q2', text: 'Per-unit base?', answer: '100 MVA' },
  { id: 'q3', question: 'Legacy text field', answer: 'B' },
];

describe('buildSessionSummary', () => {
  it('nothing answered, nothing to summarize', () => {
    expect(buildSessionSummary([], questions, 60)).toBeNull();
    expect(buildSessionSummary(null, questions, 60)).toBeNull();
  });

  it('scores the session and times it', () => {
    const s = buildSessionSummary([
      attempt('q1', 'Protection', true, 'HIGH', 20000),
      attempt('q2', 'Power Systems', false, 'MED', 40000),
      attempt('q4', 'Protection', true, 'MED', 0),
    ], questions, 125.4);
    expect(s).toMatchObject({ total: 3, correct: 2, accuracy: 67, durationSecs: 125, avgSecs: 30 });
  });

  it('ranks topics by misses, and names the weakest to drill', () => {
    const s = buildSessionSummary([
      attempt('a', 'Protection', true),
      attempt('b', 'Machines', false),
      attempt('c', 'Machines', false),
      attempt('d', 'Protection', false),
      attempt('e', 'Algebra', true, 'MED', 1000, 'Math'),
    ], [], 300);
    expect(s.byTopic.map((t) => [t.topic, t.missed])).toEqual([['Machines', 2], ['Protection', 1], ['Algebra', 0]]);
    expect(s.weakest).toMatchObject({ topic: 'Machines', subject: 'EE', total: 2, correct: 0, accuracy: 0 });
    // Subjects are stored under their canonical name.
    expect(s.byTopic[2].subject).toBe('Mathematics');
  });

  it('a clean session has no weakest topic', () => {
    expect(buildSessionSummary([attempt('q1', 'Protection', true)], questions, 30).weakest).toBeNull();
  });

  it('counts confident misses and lucky guesses, and lists confident misses first', () => {
    const s = buildSessionSummary([
      attempt('q2', 'Power Systems', false, 'LOW'),
      attempt('q1', 'Protection', false, 'HIGH'),
      attempt('q3', 'Protection', true, 'low'),
    ], questions, 90);
    expect(s).toMatchObject({ confidentMisses: 1, luckyGuesses: 1, missedCount: 2 });
    expect(s.missed.map((m) => [m.id, m.confident])).toEqual([['q1', true], ['q2', false]]);
    expect(s.missed[0]).toMatchObject({ text: 'Relay pickup current?', answer: '5 A', topic: 'Protection' });
  });

  it('keeps at most ten missed questions, but counts them all', () => {
    const many = Array.from({ length: 14 }, (_, i) => attempt(`m${i}`, 'Machines', false));
    const s = buildSessionSummary(many, [], 600);
    expect(s.missed).toHaveLength(10);
    expect(s.missedCount).toBe(14);
  });
});
