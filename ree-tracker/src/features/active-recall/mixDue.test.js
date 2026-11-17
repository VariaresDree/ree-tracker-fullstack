import { describe, it, expect } from 'vitest';
import { dueShare, mixDue } from './mixDue';

const q = (id, subtopic = 'Machines', subtopicId = null) => ({ id, subtopic, subtopicId });
const bank = (n) => Array.from({ length: n }, (_, i) => q(`b${i}`));

describe('mixDue', () => {
  it('asks for a quarter of the set, rounded up', () => {
    expect([20, 10, 5, 1, 0].map(dueShare)).toEqual([5, 3, 2, 1, 0]);
  });

  it('leads with the due reviews, marked, and fills the rest from the bank', () => {
    const set = mixDue(bank(20), [q('d1'), q('d2')], 20);
    expect(set).toHaveLength(20);
    expect(set.slice(0, 2)).toEqual([{ ...q('d1'), dueReview: true }, { ...q('d2'), dueReview: true }]);
    expect(set.slice(2).some((x) => x.dueReview)).toBe(false);
  });

  it('takes no more than its share, however many are due', () => {
    const set = mixDue(bank(20), Array.from({ length: 30 }, (_, i) => q(`d${i}`)), 20);
    expect(set.filter((x) => x.dueReview)).toHaveLength(5);
    expect(set).toHaveLength(20);
  });

  it('never shows a question twice', () => {
    const set = mixDue([q('same'), ...bank(19)], [q('same'), q('same')], 20);
    expect(set.filter((x) => x.id === 'same')).toHaveLength(1);
    expect(set[0].dueReview).toBe(true);
  });

  it('keeps only the due reviews of the pinned topic or subtopic', () => {
    const due = [q('other', 'Circuits'), q('topic', 'Machines', 's2'), q('sub', 'Machines', 's1')];
    expect(mixDue(bank(4), due, 4, { subtopic: 'Machines' }).filter((x) => x.dueReview).map((x) => x.id)).toEqual(['topic']);
    expect(mixDue(bank(8), due, 8, { subtopic: 'Machines', subtopicId: 's1' }).filter((x) => x.dueReview).map((x) => x.id)).toEqual(['sub']);
    expect(mixDue(bank(8), due, 8, { subtopic: 'All' }).filter((x) => x.dueReview)).toHaveLength(2);
  });

  it('with nothing due, the set is the bank’s', () => {
    expect(mixDue(bank(8), [], 20)).toEqual(bank(8));
    expect(mixDue(bank(8), undefined, 20)).toEqual(bank(8));
  });

  it('a small bank still gets its reviews', () => {
    expect(mixDue(bank(3), [q('d1')], 20).map((x) => x.id)).toEqual(['d1', 'b0', 'b1', 'b2']);
  });
});

describe('mixDue with several topics (2026-11-16)', () => {
  it('leads with due reviews only from the picked topics', () => {
    const due = [{ id: 'd1', subtopic: 'Calculus 1' }, { id: 'd2', subtopic: 'Algebra' }, { id: 'd3', subtopic: 'Trigonometry' }];
    const bank = Array.from({ length: 10 }, (_, i) => ({ id: `b${i}`, subtopic: 'Algebra' }));
    const out = mixDue(bank, due, 8, { subtopic: 'All', topics: ['Algebra', 'Trigonometry'] });
    expect(out.filter((q) => q.dueReview).map((q) => q.id)).toEqual(['d2', 'd3']);
    expect(out).toHaveLength(8);
  });
});

describe('an equal share for every picked topic, due reviews included (2026-11-17)', () => {
  const T = ['Algebra', 'Complex Numbers', 'Trigonometry'];
  const bankOf = (perTopic) => T.flatMap((t) => Array.from({ length: perTopic[t] ?? 20 }, (_, i) => ({ id: `${t}-${i}`, subtopic: t })));
  const count = (set) => Object.fromEntries(T.map((t) => [t, set.filter((x) => x.subtopic === t).length]));

  it('reviews that are all Algebra no longer tilt the set: 20 over 3 topics is 7, 7, 6', () => {
    const due = Array.from({ length: 10 }, (_, i) => ({ id: `due-${i}`, subtopic: 'Algebra' }));
    for (let run = 0; run < 50; run += 1) {
      const set = mixDue(bankOf({}), due, 20, { subtopic: 'All', topics: T });
      expect(set).toHaveLength(20);
      expect(Object.values(count(set)).sort()).toEqual([6, 7, 7]);
      expect(new Set(set.map((x) => x.id)).size).toBe(20);
      // the reviews still lead, and count inside Algebra's share
      const reviews = set.filter((x) => x.dueReview);
      expect(reviews.length).toBeGreaterThan(0);
      expect(set.slice(0, reviews.length).every((x) => x.dueReview)).toBe(true);
      expect(reviews.length).toBeLessThanOrEqual(count(set).Algebra);
    }
  });

  it('the old way gave Algebra about half; the larger shares rotate between topics', () => {
    const due = Array.from({ length: 5 }, (_, i) => ({ id: `due-${i}`, subtopic: 'Algebra' }));
    const seven = new Set();
    for (let run = 0; run < 60; run += 1) {
      const c = count(mixDue(bankOf({}), due, 20, { subtopic: 'All', topics: T }));
      expect(c.Algebra).toBeLessThanOrEqual(7);
      T.filter((t) => c[t] === 7).forEach((t) => seven.add(t));
    }
    expect(seven.size).toBe(3);
  });

  it('a topic with too few questions passes its places to the others, still evenly', () => {
    for (let run = 0; run < 50; run += 1) {
      const set = mixDue(bankOf({ 'Complex Numbers': 2 }), [], 20, { subtopic: 'All', topics: T });
      const c = count(set);
      expect(set).toHaveLength(20);
      expect(c['Complex Numbers']).toBe(2);
      expect(Math.abs(c.Algebra - c.Trigonometry)).toBeLessThanOrEqual(1);
    }
  });

  it('the bank part comes one topic at a time in turn, not in blocks', () => {
    const set = mixDue(bankOf({}), [], 9, { subtopic: 'All', topics: T });
    for (let i = 0; i < 9; i += 3) expect(new Set(set.slice(i, i + 3).map((x) => x.subtopic)).size).toBe(3);
  });
});
