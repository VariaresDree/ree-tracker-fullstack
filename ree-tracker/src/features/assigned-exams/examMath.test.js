// src/features/assigned-exams/examMath.test.js: the subject and topic rules.
import { describe, it, expect } from 'vitest';
import { coversFilter, subjectCounts, subjectsOf, topicCounts, topicsLine } from './examMath';

const t = (subject, topic, count = 1) => ({ subject, topic, count });
const trig = { id: 'a', subject: 'Mathematics', topics: [t('Mathematics', 'Trigonometry', 30)] };
const mixed = { id: 'b', subject: 'Mixed', topics: [t('EE', 'Circuits', 20), t('Mathematics', 'Algebra', 10), t('Mathematics', 'Trigonometry', 5)] };
const old = { id: 'c', subject: 'ESAS' }; // listed before the server sent topics

describe('subjects and topics', () => {
  it('reads an exam’s subjects from its topics, or its own subject', () => {
    expect(subjectsOf(mixed)).toEqual(['EE', 'Mathematics']);
    expect(subjectsOf(old)).toEqual(['ESAS']);
    expect(subjectsOf({ subject: 'Mixed' })).toEqual([]);
  });

  it('counts the exams under each subject, in board order', () => {
    expect(subjectCounts([mixed, trig, old]).map((s) => [s.value, s.count])).toEqual([['Mathematics', 2], ['ESAS', 1], ['EE', 1]]);
  });

  it('counts the exams holding each topic, by subject then name, for one subject or all', () => {
    expect(topicCounts([trig, mixed]).map((x) => [x.topic, x.count])).toEqual([['Algebra', 1], ['Trigonometry', 2], ['Circuits', 1]]);
    expect(topicCounts([trig, mixed], 'EE').map((x) => x.topic)).toEqual(['Circuits']);
  });

  it('lets an exam through when it covers the subject and topic', () => {
    expect(coversFilter(mixed, 'EE', 'all')).toBe(true);
    expect(coversFilter(trig, 'EE', 'all')).toBe(false);
    expect(coversFilter(mixed, 'all', 'Trigonometry')).toBe(true);
    expect(coversFilter(mixed, 'EE', 'Trigonometry')).toBe(false);
    expect(coversFilter(old, 'ESAS', 'all')).toBe(true);
    expect(coversFilter(old, 'all', 'all')).toBe(true);
  });

  it('names the topics in a line, biggest share first', () => {
    expect(topicsLine([t('M', 'Trigonometry')])).toBe('Trigonometry');
    expect(topicsLine(mixed.topics)).toBe('Circuits, Algebra and Trigonometry');
    expect(topicsLine([...mixed.topics, t('EE', 'Machines'), t('EE', 'Protection')])).toBe('Circuits, Algebra and 3 more');
    expect(topicsLine([])).toBe('');
  });
});
