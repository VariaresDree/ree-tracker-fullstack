import { describe, it, expect } from 'vitest';
import { draftFrom, dropTopic, giveItems, noCount, sameDraft, setItems, shareWith, splitOff, totalItems } from './blueprintDraft';

const draft = () => ({
  Mathematics: [{ items: 5, topicIds: ['alg', 'cx'] }, { items: 10, topicIds: ['trig'] }, { items: 20, topicIds: ['calc'] }],
  ESAS: [],
  EE: [{ items: 100, topicIds: ['em'] }],
});
const math = (d) => d.Mathematics;

describe('the board-count draft', () => {
  it('takes only what the server stores, every subject present', () => {
    expect(draftFrom({ Mathematics: [{ items: 5, topics: ['Algebra'], topicIds: ['alg'] }] })).toEqual({
      Mathematics: [{ items: 5, topicIds: ['alg'] }], ESAS: [], EE: [],
    });
  });

  it('sets a count and totals a subject', () => {
    const d = setItems(draft(), 'Mathematics', 1, 12);
    expect(math(d)[1].items).toBe(12);
    expect(totalItems(math(d))).toBe(37);
    expect(totalItems(undefined)).toBe(0);
    expect(sameDraft(d, draft())).toBe(false);
    expect(sameDraft(draft(), draft())).toBe(true);
  });

  it('splits a shared topic into its own count, beside its old one, at zero', () => {
    const d = splitOff(draft(), 'Mathematics', 'cx');
    expect(math(d).slice(0, 2)).toEqual([{ items: 5, topicIds: ['alg'] }, { items: 0, topicIds: ['cx'] }]);
    expect(totalItems(math(d))).toBe(35);
  });

  it('won’t split a topic that’s alone, or has no count', () => {
    expect(math(splitOff(draft(), 'Mathematics', 'trig'))).toEqual(math(draft()));
    expect(math(splitOff(draft(), 'Mathematics', 'vec'))).toEqual(math(draft()));
  });

  it('gives a topic with no count the smallest PRC count, and moves one that had one', () => {
    expect(math(giveItems(draft(), 'Mathematics', 'vec')).at(-1)).toEqual({ items: 5, topicIds: ['vec'] });
    const moved = giveItems(draft(), 'Mathematics', 'cx');
    expect(math(moved)[0].topicIds).toEqual(['alg']);
    expect(math(moved).at(-1)).toEqual({ items: 5, topicIds: ['cx'] });
  });

  it('No count takes a topic out, and a count left empty goes', () => {
    expect(math(noCount(draft(), 'Mathematics', 'cx'))[0]).toEqual({ items: 5, topicIds: ['alg'] });
    expect(math(noCount(draft(), 'Mathematics', 'trig'))).toHaveLength(2);
  });

  it('sharing keeps the total when a topic’s own count empties', () => {
    const d = shareWith(draft(), 'Mathematics', 'trig', 2);
    expect(math(d)).toEqual([{ items: 5, topicIds: ['alg', 'cx'] }, { items: 30, topicIds: ['calc', 'trig'] }]);
    expect(totalItems(math(d))).toBe(35);
  });

  it('sharing from a shared count leaves that count’s items, and one with no count adds nothing', () => {
    const d = shareWith(draft(), 'Mathematics', 'cx', 1);
    expect(math(d)).toEqual([{ items: 5, topicIds: ['alg'] }, { items: 10, topicIds: ['trig', 'cx'] }, { items: 20, topicIds: ['calc'] }]);
    expect(math(shareWith(draft(), 'Mathematics', 'vec', 0))[0]).toEqual({ items: 5, topicIds: ['alg', 'cx', 'vec'] });
  });

  it('sharing with its own count, or one that isn’t there, changes nothing', () => {
    expect(shareWith(draft(), 'Mathematics', 'alg', 0)).toEqual(draft());
    expect(shareWith(draft(), 'Mathematics', 'alg', 9)).toEqual(draft());
    expect(shareWith(draft(), 'Mathematics', 'alg', Number.NaN)).toEqual(draft());
  });

  it('a retired topic leaves every count', () => {
    const d = dropTopic(draft(), 'em');
    expect(d.EE).toEqual([]);
    expect(math(d)).toEqual(math(draft()));
  });
});
