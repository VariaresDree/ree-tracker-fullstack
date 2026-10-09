// src/features/exams/review/reviewFilters.js
//
// Which items of a past sitting to show: all, the ones you got wrong, the ones
// left blank, the ones you marked, the slow ones (over the board pace for their
// subject) and the confident misses (answered wrong at high confidence).
import { normalizeSubject } from '@ree/shared';
import { paceBand } from '../pacing';

export const REVIEW_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'wrong', label: 'Wrong' },
  { id: 'blank', label: 'Blank' },
  { id: 'marked', label: 'Marked' },
  { id: 'slow', label: 'Slow' },
  { id: 'confident', label: 'Sure but wrong' },
];

const TESTS = {
  all: () => true,
  // Answered and wrong. A blank is wrong too, but has its own filter.
  wrong: (i) => !i.isCorrect && i.answered !== false,
  blank: (i) => i.answered === false,
  marked: (i) => !!i.marked,
  slow: (i) => paceBand(i.subject, i.timeSpentMs) === 'slow',
  confident: (i) => !i.isCorrect && i.answered !== false && i.confidence === 'HIGH',
};

/** Items matching a filter and, unless 'all', a subject. */
export function filterItems(items = [], { filter = 'all', subject = 'all' } = {}) {
  const test = TESTS[filter] || TESTS.all;
  return items.filter((i) => test(i) && (subject === 'all' || normalizeSubject(i.subject) === subject));
}

/** How many items each filter would show for this subject. */
export function filterCounts(items = [], subject = 'all') {
  return Object.fromEntries(REVIEW_FILTERS.map((f) => [f.id, filterItems(items, { filter: f.id, subject }).length]));
}

/** The subjects present, in board order. */
export function subjectsIn(items = []) {
  const present = new Set(items.map((i) => normalizeSubject(i.subject)));
  return ['Mathematics', 'ESAS', 'EE'].filter((s) => present.has(s));
}
