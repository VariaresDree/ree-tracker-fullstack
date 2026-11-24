// Small pure rules for assigned exams, shared by the builder and its tests.
import { boardPaceSeconds, normalizeSubject, toDisplaySubject } from '@ree/shared';

export const MIN_ITEMS = 5; // a battle's smallest paper (backend schemas/assignedExamSchemas.js)
export const MAX_ITEMS = 100; // one PRC subject paper

/** The board's pace for these questions, in whole minutes (at least one). */
export function paceMinutes(questions) {
  const secs = questions.reduce((sum, q) => sum + (boardPaceSeconds(normalizeSubject(q.subject)) || 180), 0);
  return Math.max(1, Math.round(secs / 60));
}

/** An exam's length as people say it: "45 min", "2 h", "2 h 24 min". */
export function examLength(secs) {
  const m = Math.max(1, Math.round((secs || 0) / 60));
  if (m < 60) return `${m} min`;
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`;
}

/** "Math 12 · EE 28": how many of each subject, in the order they were picked. */
export function subjectMix(questions) {
  const counts = {};
  for (const q of questions) {
    const s = toDisplaySubject(normalizeSubject(q.subject));
    counts[s] = (counts[s] || 0) + 1;
  }
  return Object.entries(counts).map(([s, n]) => `${s} ${n}`).join(' · ');
}
