import { describe, it, expect } from 'vitest';
import { BOARD_GROUPS } from '@ree/shared/boardItems';
import { deepestGroup, poolLimit } from './poolFilters';

// How many questions a session asks the server for. Every pool was a flat
// 1,000 or 2,000 rows however short the session.

describe('poolLimit', () => {
  it('asks for three times an even draw, never under 60', () => {
    expect(poolLimit(20)).toBe(60);
    expect(poolLimit(10)).toBe(60);
    expect(poolLimit(100)).toBe(300);
  });

  it('leaves room for a focus filter, and stops at the old limit', () => {
    expect(poolLimit(20, { filtered: true })).toBe(150);
    expect(poolLimit(500, { filtered: true, max: 1000 })).toBe(1000);
    expect(poolLimit(1000)).toBe(2000);
  });

  it('a draw by topic counts is deep enough in every topic for its largest count', () => {
    // PRC's EE paper: the largest group takes 20 of 100, over 18 topics.
    const perTopic = deepestGroup('EE', 100, BOARD_GROUPS);
    expect(perTopic).toBe(20);
    expect(poolLimit(100, { perTopic, topics: 18 })).toBe(540);
    // The server gives every topic an equal share, so each has 540 / 18 = 30.
    expect(540 / 18).toBeGreaterThanOrEqual(perTopic);
    // One topic asked for the whole paper: nothing smaller than the old pool will do.
    expect(poolLimit(100, { perTopic: 100, topics: 18 })).toBe(2000);
  });

  it('by topic counts with no topic list to size from, the old limit', () => {
    expect(poolLimit(100, { perTopic: 20, topics: 0 })).toBe(2000);
  });
});

describe('deepestGroup', () => {
  it('is 0 for an even draw, or a subject the groups leave out', () => {
    expect(deepestGroup('EE', 100, null)).toBe(0);
    expect(deepestGroup('EE', 100, { Mathematics: [{ items: 5, topics: ['Algebra'] }] })).toBe(0);
  });

  it('scales with the paper', () => {
    expect(deepestGroup('EE', 45, BOARD_GROUPS)).toBe(9);
  });
});
