import { describe, it, expect } from 'vitest';
import { difficultyOf, nextLevel, pickNextLocal } from './adaptiveFallback';

const q = (id, irtB, extra = {}) => ({ id, text: `Q ${id}`, irtB, ...extra });
const first = () => 0;

describe('adaptive fallback picker', () => {
  it('reads difficulty from the calibration, then the author, then the middle', () => {
    expect(difficultyOf({ irtB: 1.2, difficulty: -1 })).toBe(1.2);
    expect(difficultyOf({ irtB: null, difficulty: -1 })).toBe(-1);
    expect(difficultyOf({})).toBe(0);
  });

  it('steps the level up after a right answer and down after a wrong one, within bounds', () => {
    expect(nextLevel([], 0.4)).toBe(0.4);
    expect(nextLevel([{ isCorrect: true }, { isCorrect: true }], 0)).toBe(1);
    expect(nextLevel([{ isCorrect: false }], 0)).toBe(-0.5);
    expect(nextLevel(Array(20).fill({ isCorrect: true }), 0)).toBe(3);
  });

  it('picks the unseen question nearest the level', () => {
    const pool = [q('easy', -2), q('mid', 0), q('hard', 2), q('harder', 2.5)];
    // two right answers from 0 → level 1: "hard" (gap 1) and "mid" (gap 1) lead
    const pick = pickNextLocal(pool, { seenIds: ['mid'], history: [{ isCorrect: true }, { isCorrect: true }], random: first });
    expect(pick.id).toBe('hard');
    const easier = pickNextLocal(pool, { history: [{ isCorrect: false }, { isCorrect: false }, { isCorrect: false }, { isCorrect: false }], random: first });
    expect(easier.id).toBe('easy');
  });

  it('never repeats, skips items without text, and says when the pool is spent', () => {
    const pool = [q('a', 0), { id: 'blank', irtB: 0 }];
    expect(pickNextLocal(pool, { seenIds: ['a'] })).toBeNull();
    expect(pickNextLocal([], {})).toBeNull();
  });
});
