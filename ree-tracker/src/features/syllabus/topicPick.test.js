import { describe, it, expect } from 'vitest';
import { inPickedTopics, isMultiTopic, pickedTopics, topicFields, topicsLabel } from './topicPick';

// Several topics in one session (2026-11-16): a config keeps its old shape for
// none or one topic, and carries `topics` for two or more.

const MATH = ['Algebra', 'Trigonometry', 'Plane Geometry', 'Complex Numbers'];

describe('topicFields', () => {
  it('none is every topic; one is that topic, as before', () => {
    expect(topicFields([])).toEqual({ subtopic: 'All', topics: undefined });
    expect(topicFields(['All'])).toEqual({ subtopic: 'All', topics: undefined });
    expect(topicFields(['Algebra'], MATH)).toEqual({ subtopic: 'Algebra', topics: undefined });
  });

  it('two or more: the list, in the subject’s order, without strangers', () => {
    expect(topicFields(['Complex Numbers', 'Algebra', 'Trigonometry'], MATH)).toEqual({ subtopic: 'All', topics: ['Algebra', 'Trigonometry', 'Complex Numbers'] });
    expect(topicFields(['Gone', 'Algebra'], MATH)).toEqual({ subtopic: 'Algebra', topics: undefined });
  });
});

describe('reading a config', () => {
  it('pickedTopics, isMultiTopic and the question filter', () => {
    expect(pickedTopics({ subtopic: 'All' })).toEqual([]);
    expect(pickedTopics({ subtopic: 'Algebra' })).toEqual(['Algebra']);
    const multi = { subtopic: 'All', topics: ['Algebra', 'Trigonometry'] };
    expect(pickedTopics(multi)).toEqual(['Algebra', 'Trigonometry']);
    expect(isMultiTopic(multi)).toBe(true);
    expect(isMultiTopic({ subtopic: 'Algebra' })).toBe(false);
    expect(inPickedTopics(multi)({ subtopic: 'Trigonometry' })).toBe(true);
    expect(inPickedTopics(multi)({ subtopic: 'Calculus 1' })).toBe(false);
    expect(inPickedTopics({ subtopic: 'All' })({ subtopic: 'Calculus 1' })).toBe(true);
  });

  it('labels a list briefly', () => {
    expect(topicsLabel(['Algebra'])).toBe('Algebra');
    expect(topicsLabel(['Algebra', 'Trigonometry'])).toBe('Algebra and Trigonometry');
    expect(topicsLabel(MATH)).toBe('Algebra, Trigonometry and 2 more');
    expect(topicsLabel(MATH, 1)).toBe('Algebra and 3 more');
  });
});
