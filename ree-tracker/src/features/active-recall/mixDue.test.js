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
