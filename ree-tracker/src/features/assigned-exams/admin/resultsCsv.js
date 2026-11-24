// src/features/assigned-exams/admin/resultsCsv.js
//
// An assigned exam's results as one CSV for a spreadsheet: the learners (first
// try, best, tries, last taken, how they first took it), a blank row, then the
// questions hardest first. The cell rules (quoting, the formula guard, CRLF)
// are the paper sets' (features/paper-sets/results/resultsCsv.js).
import { manilaDateTime, toCsv } from '../../paper-sets/results/resultsCsv';

/** The results from GET /api/admin/assigned-exams/:id/results, as CSV text. */
export function examResultsCsv({ exam, learners = [], items = [] }) {
  return toCsv([
    [exam.title],
    ['Learner', 'First try %', 'Best %', 'Tries', 'Last taken (Manila)', 'First taken'],
    ...learners.map((l) => [l.displayName, l.first, l.best, l.attempts, manilaDateTime(l.last), l.firstMode === 'BATTLE' ? 'In a battle' : 'Alone']),
    [],
    ['Question', 'Subject', 'Topic', 'Right on first tries %', 'Right', 'Answered', 'Question id'],
    ...items.map((i) => [i.question?.text ?? '(deleted from the bank)', i.question?.subject ?? '', i.question?.subtopic ?? '', i.pct, i.correct, i.answered, i.questionId]),
  ]);
}

/** "EE-prelim-week-3-results.csv": the title, safe for a file name. */
export function resultsFileName(exam) {
  const slug = String(exam?.title || 'exam').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'exam';
  return `${slug}-results.csv`;
}
