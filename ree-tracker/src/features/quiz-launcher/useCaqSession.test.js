// src/features/quiz-launcher/useCaqSession.test.js
//
// Regression coverage: the CAQ source format always lists the correct choice
// FIRST in the file (fixed field order from the authoring tool), and the
// parser preserved that order verbatim — so every single question in every
// real quiz file put the correct answer on option A. A student could pass
// the whole quiz by always picking the first choice, without reading a single
// question. Fixed by shuffling each question's options once per session
// mount (see useCaqSession.js).
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCaqSession } from './useCaqSession';

function makeQuestions() {
  return [
    { id: 'q1', text: 'Q1', options: ['correct-1', 'wrong-1a', 'wrong-1b', 'wrong-1c'], answer: 'correct-1' },
    { id: 'q2', text: 'Q2', options: ['correct-2', 'wrong-2a', 'wrong-2b', 'wrong-2c'], answer: 'correct-2' },
  ];
}

describe('useCaqSession — option shuffling', () => {
  it('preserves the exact same set of options per question, just reordered', () => {
    const raw = makeQuestions();
    const { result } = renderHook(() => useCaqSession(raw));
    // currentQuestion is q1 initially; check every question's option set via score's total pass too
    expect([...result.current.currentQuestion.options].sort()).toEqual([...raw[0].options].sort());
  });

  it('does not always place the correct answer at option index 0', () => {
    // Every real source file puts the correct choice first for every
    // question. Mount the hook many times with that exact shape and assert
    // the shuffle actually varies the correct answer's position — with 4
    // options, the odds of 40 independent shuffles ALL landing on index 0
    // by chance are (1/4)^40, so this is a sound (not flaky) assertion.
    const positions = new Set();
    for (let i = 0; i < 40; i++) {
      const raw = makeQuestions();
      const { result } = renderHook(() => useCaqSession(raw));
      positions.add(result.current.currentQuestion.options.indexOf(raw[0].answer));
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it('reshuffles on every fresh mount, even with the same input reference', () => {
    // CaqRunner remounts this hook on Retake via key={runKey} — a retake of
    // the same parsed file must not replay the exact same option order.
    const raw = makeQuestions();
    const orders = new Set();
    for (let i = 0; i < 40; i++) {
      const { result } = renderHook(() => useCaqSession(raw));
      orders.add(result.current.currentQuestion.options.join('|'));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  it('scores correctly regardless of shuffled option order', () => {
    const raw = makeQuestions();
    const { result } = renderHook(() => useCaqSession(raw));
    const shuffledCorrectText = result.current.currentQuestion.options.find((o) => o === raw[0].answer);

    act(() => {
      result.current.selectAnswer('q1', shuffledCorrectText);
      result.current.selectAnswer('q2', 'wrong-2a');
    });

    expect(result.current.score).toEqual({ correct: 1, total: 2, answered: 2 });
  });
});
