import { describe, it, expect } from 'vitest';
import {
  planBatches, apportion, calculationCount, buildQuestionPrompt, buildVerifyPrompt,
  applyVerification, BOARD_EXAM_SYSTEM, BATCH_SIZE, MAX_QUESTIONS,
} from './aiPrompts';

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

describe('planBatches', () => {
  it('splits a run into batches of at most five', () => {
    const b = planBatches({ count: 12 });
    expect(b.map((x) => x.size)).toEqual([5, 5, 2]);
    expect(b.every((x) => x.size <= BATCH_SIZE)).toBe(true);
  });

  it('gives the exact calculation/conceptual split asked for', () => {
    const b = planBatches({ count: 10, type: 'mixed', calcShare: 0.7 });
    expect(sum(b.map((x) => x.calculation))).toBe(7);
    expect(sum(b.map((x) => x.conceptual))).toBe(3);
    // Dealt across batches, not all in the first.
    expect(b.map((x) => x.calculation)).toEqual([4, 3]);
  });

  it('honours pure conceptual and pure calculation runs', () => {
    expect(sum(planBatches({ count: 8, type: 'conceptual' }).map((x) => x.calculation))).toBe(0);
    expect(sum(planBatches({ count: 8, type: 'calculation' }).map((x) => x.conceptual))).toBe(0);
  });

  it('fills every batch with exactly its size in difficulties', () => {
    for (const difficulty of ['board', 'easy', 'medium', 'hard']) {
      const b = planBatches({ count: 13, difficulty });
      for (const x of b) expect(x.difficulty[1] + x.difficulty[2] + x.difficulty[3]).toBe(x.size);
    }
    const board = planBatches({ count: 10, difficulty: 'board' });
    expect([1, 2, 3].map((k) => sum(board.map((x) => x.difficulty[k])))).toEqual([3, 5, 2]);
  });

  it('clamps the count', () => {
    expect(sum(planBatches({ count: 500 }).map((x) => x.size))).toBe(MAX_QUESTIONS);
    expect(sum(planBatches({ count: 0 }).map((x) => x.size))).toBe(1);
  });
});

describe('apportion / calculationCount', () => {
  it('splits by largest remainder', () => {
    expect(apportion(7, { 1: 0.3, 2: 0.5, 3: 0.2 })).toEqual({ 1: 2, 2: 4, 3: 1 });
  });
  it('rounds the calculation share', () => {
    expect(calculationCount(5, 'mixed', 0.6)).toBe(3);
    expect(calculationCount(5, 'calculation')).toBe(5);
  });
});

describe('buildQuestionPrompt', () => {
  const batch = { size: 5, calculation: 3, conceptual: 2, difficulty: { 1: 1, 2: 3, 3: 1 } };

  it('states the exact counts, topic rule and JSON envelope', () => {
    const p = buildQuestionPrompt({ subject: 'EE', topic: 'Electric Circuits 1', batch, seed: 1 });
    expect(p).toContain('Exactly 3 calculation (problem-solving) items and 2 conceptual');
    expect(p).toContain('1 easy (difficulty 1), 3 medium (difficulty 2), 1 hard (difficulty 3)');
    expect(p).toContain('"subtopic" field is exactly "Electric Circuits 1"');
    expect(p).toContain('{"items": [');
  });

  it('lists the live topics for "All topics", and the focus and notes', () => {
    const p = buildQuestionPrompt({ subject: 'EE', topic: 'All', topics: ['A', 'B'], batch, focus: 'transformers', notes: 'Use delta loads' });
    expect(p).toContain('[A, B]');
    expect(p).toContain('"transformers"');
    expect(p).toContain('Use delta loads');
  });

  it('tells the model not to repeat earlier stems', () => {
    const p = buildQuestionPrompt({ subject: 'ESAS', topic: 'All', batch, avoid: ['What is the efficiency of X?'] });
    expect(p).toContain('1. What is the efficiency of X?');
  });

  it('the system prompt carries the board rules', () => {
    expect(BOARD_EXAM_SYSTEM).toMatch(/PRC/);
    expect(BOARD_EXAM_SYSTEM).toMatch(/60 Hz/);
    expect(BOARD_EXAM_SYSTEM).toMatch(/all of the above/);
    expect(BOARD_EXAM_SYSTEM).toContain('$X_L = 2\\pi f L$');
  });
});

describe('verification', () => {
  const qs = [
    { text: 'Q0', options: ['1', '2', '3', '4'], answer: '2' },
    { text: 'Q1', options: ['a', 'b', 'c', 'd'], answer: 'a' },
    { text: 'Q2', options: ['w', 'x', 'y', 'z'], answer: 'z' },
    { text: 'Q3', options: ['p', 'q', 'r', 's'], answer: 'p' },
  ];

  it('does not show the checker the key', () => {
    const p = buildVerifyPrompt(qs);
    expect(p).toContain('Item 0:\nQ0');
    expect(p).toContain('   B. 2');
    expect(p).not.toMatch(/answer key|correct answer is/i);
  });

  it('marks agreement, disagreement, flags and gaps', () => {
    const out = applyVerification(qs, [
      { index: 0, choice: 'B', confidence: 'high' },
      { index: 1, choice: '(c)', confidence: 'medium' },
      { index: 2, choice: 'D', issue: 'Two options are equivalent.' },
    ]);
    expect(out.map((q) => q.check.status)).toEqual(['agrees', 'disagrees', 'flagged', 'unchecked']);
    expect(out[1].check.choice).toBe('C');
  });
});
