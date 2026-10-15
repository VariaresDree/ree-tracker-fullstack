// Editing a live question keeps every choice in its slot. The editor used to
// rebuild [answer, ...distractors], moving the key to A on every edit.
import { describe, it, expect } from 'vitest';
import { answerSlotOf, distractorSlots, slotsOf, withAnswer, withDistractor } from './editSlots';

const Q = { id: 'q1', options: ['w1', 'w2', 'KEY', 'w3'], answer: 'KEY' };

describe('editSlots', () => {
  it('keeps the key where it is stored when its text changes', () => {
    const at = answerSlotOf(Q);
    expect(at).toBe(2);
    const edited = withAnswer(Q, at, 'NEW KEY');
    expect(edited).toMatchObject({ answer: 'NEW KEY', options: ['w1', 'w2', 'NEW KEY', 'w3'] });
  });

  it('changes a wrong option in its own slot', () => {
    const at = answerSlotOf(Q);
    expect(distractorSlots(at)).toEqual([0, 1, 3]);
    expect(withDistractor(Q, at, 2, 'w3!').options).toEqual(['w1', 'w2', 'KEY', 'w3!']);
    expect(withDistractor(Q, at, 0, 'w1!').options).toEqual(['w1!', 'w2', 'KEY', 'w3']);
  });

  it('holds the slot through a cleared answer and a wrong option typed the same as the key', () => {
    const at = answerSlotOf(Q);
    let q = withAnswer(Q, at, '');
    q = withDistractor(q, at, 0, '');
    q = withAnswer(q, at, 'w2');
    expect(q.options).toEqual(['', 'w2', 'w2', 'w3']);
    q = withAnswer(q, at, 'K2');
    expect(q).toMatchObject({ answer: 'K2', options: ['', 'w2', 'K2', 'w3'] });
  });

  it('a row whose key is not among its choices gets a slot from its id, not always A', () => {
    const slots = new Set();
    for (let i = 0; i < 40; i += 1) {
      const broken = { id: `b${i}`, options: ['x', 'y', 'z'], answer: 'B' };
      const at = answerSlotOf(broken);
      expect(answerSlotOf(broken)).toBe(at);
      const s = slotsOf(broken, at);
      expect(s[at]).toBe('B');
      expect(s.filter((o) => o !== 'B')).toEqual(['x', 'y', 'z']);
      slots.add(at);
    }
    expect(slots.size).toBe(4);
  });

  it('pads a short question to four slots', () => {
    const q = { id: 'q2', options: ['KEY', 'w1'], answer: 'KEY' };
    expect(slotsOf(q, answerSlotOf(q))).toEqual(['KEY', 'w1', '', '']);
  });
});
