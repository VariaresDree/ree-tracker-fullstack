import { describe, it, expect } from 'vitest';
import { filterItems, filterCounts, subjectsIn } from './reviewFilters';
import { missedItems, reviewItemToQuestion, retakeState } from './retake';

const item = (over) => ({ order: 1, questionId: 'q', subject: 'EE', isCorrect: true, answered: true, confidence: 'MED', timeSpentMs: 60_000, marked: false, ...over });
const ITEMS = [
  item({ order: 1, questionId: 'a' }),
  item({ order: 2, questionId: 'b', isCorrect: false }),
  item({ order: 3, questionId: 'c', isCorrect: false, answered: false, selectedAnswer: '' }),
  item({ order: 4, questionId: 'd', isCorrect: false, confidence: 'HIGH', subject: 'Mathematics' }),
  item({ order: 5, questionId: 'e', marked: true, timeSpentMs: 400_000 }),
];

describe('sitting review filters', () => {
  it('splits wrong answers from blanks and finds confident misses, slow and marked items', () => {
    const ids = (f, subject) => filterItems(ITEMS, { filter: f, subject }).map((i) => i.questionId);
    expect(ids('wrong')).toEqual(['b', 'd']);
    expect(ids('blank')).toEqual(['c']);
    expect(ids('confident')).toEqual(['d']);
    expect(ids('slow')).toEqual(['e']);
    expect(ids('marked')).toEqual(['e']);
    expect(ids('all', 'Mathematics')).toEqual(['d']);
  });

  it('counts per filter and lists subjects in board order', () => {
    expect(filterCounts(ITEMS)).toMatchObject({ all: 5, wrong: 2, blank: 1, confident: 1, slow: 1, marked: 1 });
    expect(subjectsIn(ITEMS)).toEqual(['Mathematics', 'EE']);
  });
});

describe('retaking the misses', () => {
  it('takes wrong and blank items, as questions the simulator and Practice can run', () => {
    const missed = missedItems(ITEMS);
    expect(missed.map((i) => i.questionId)).toEqual(['b', 'c', 'd']);
    const q = reviewItemToQuestion({ questionId: 'x', subject: 'EE', topic: 'Machines', text: 'T', options: ['1', '2'], correctAnswer: '2', explanation: 'E' });
    expect(q).toMatchObject({ id: 'x', subtopic: 'Machines', text: 'T', options: ['1', '2'], answer: '2', fixedExplanation: 'E' });
    expect(retakeState({ ownerUid: 'u', sourceSessionId: 's', items: missed }).retake.questions).toHaveLength(3);
  });
});
