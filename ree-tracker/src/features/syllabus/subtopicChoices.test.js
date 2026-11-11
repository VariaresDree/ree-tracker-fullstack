import { describe, it, expect } from 'vitest';
import { MIN_TAGGED, accuracyLine, taggedSubtopics } from './subtopicChoices';
import { builderSummary, chooseScope, chooseSubtopic, customView } from '../active-recall/customView';

const item = (id, over = {}) => ({ id, topicId: 't', name: id.toUpperCase(), sortOrder: 0, active: true, topicName: 'Circuits', subject: 'EE', questions: MIN_TAGGED, ...over });

describe('taggedSubtopics', () => {
  it('the picked topic’s active subtopics with enough questions, in order', () => {
    const items = [
      item('b', { sortOrder: 2 }),
      item('a', { sortOrder: 1, questions: 40 }),
      item('few', { questions: MIN_TAGGED - 1 }),
      item('off', { active: false }),
      item('other', { topicName: 'Machines' }),
      item('math', { subject: 'Mathematics' }),
    ];
    expect(taggedSubtopics(items, 'EE', 'Circuits')).toEqual([{ id: 'a', name: 'A', questions: 40 }, { id: 'b', name: 'B', questions: MIN_TAGGED }]);
  });

  it('matches the subject by its canonical spelling, and offers nothing for a whole subject', () => {
    const items = [item('m', { subject: 'Mathematics', topicName: 'Algebra' })];
    expect(taggedSubtopics(items, 'Math', 'Algebra')).toHaveLength(1);
    expect(taggedSubtopics(items, 'Mathematics', 'All')).toEqual([]);
    expect(taggedSubtopics(null, 'EE', 'Circuits')).toEqual([]);
  });
});

describe('accuracyLine', () => {
  it('a share of the answers, or not tried', () => {
    expect(accuracyLine({ answered: 8, correct: 6 })).toBe('75% of 8');
    expect(accuracyLine({ answered: 0, correct: 0 })).toBe('Not tried yet');
    expect(accuracyLine(undefined)).toBe('Not tried yet');
  });
});

describe('Practice’s builder and a subtopic', () => {
  const base = customView({ studyMode: 'subtopic', subject: 'EE', subtopic: 'Circuits', count: 20, sessionMode: 'mcq', cognitiveFocus: 'mixed', source: 'library' });

  it('picks one, and names it in the summary', () => {
    const v = chooseSubtopic(base, { id: 's1', name: 'AC Circuits' });
    expect(v).toMatchObject({ subtopicId: 's1', subtopicName: 'AC Circuits' });
    expect(builderSummary(v)).toBe('20 choice · AC Circuits · mixed');
    expect(chooseSubtopic(v, null)).toMatchObject({ subtopicId: null, subtopicName: null });
  });

  it('another subject or topic forgets it', () => {
    const v = chooseSubtopic(base, { id: 's1', name: 'AC Circuits' });
    expect(chooseScope(v, 'EE', 'Machines')).toMatchObject({ subtopic: 'Machines', subtopicId: null });
    expect(chooseScope(v, 'All')).toMatchObject({ studyMode: 'interleaved', subtopicId: null });
  });

  it('a session over a whole subject carries none', () => {
    expect(customView({ ...base, studyMode: 'subject', subtopicId: 's1', subtopicName: 'X' })).toMatchObject({ subtopicId: null, subtopicName: null });
    // Picking one needs a topic first: a subject-wide view is left as it was.
    expect(chooseSubtopic({ ...base, studyMode: 'subject' }, { id: 's1', name: 'X' }).subtopicId).toBeNull();
  });
});
