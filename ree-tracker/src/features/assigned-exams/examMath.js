// Small pure rules for assigned exams, shared by the builder and its tests.
import { boardPaceSeconds, normalizeSubject, toDisplaySubject } from '@ree/shared';

// The server's limits (backend schemas/assignedExamSchemas.js): any size up to
// a full PRC board's worth, any time up to a day.
export const MIN_ITEMS = 1;
export const MAX_ITEMS = 300;
export const MAX_MINUTES = 24 * 60;

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

export const PASS = 70; // the board's passing general average

/** "Best 78% · 2 tries"; null before the first. */
export function triesLine(mine) {
  if (!mine) return null;
  return `Best ${mine.best}% · ${mine.attempts} ${mine.attempts === 1 ? 'try' : 'tries'}`;
}

/** "Class average 64% · 12 took it". The server sends it only once the learner has sat it and 3 have. */
export const classLine = (c) => (c ? `Class average ${c.average}% · ${c.takers} took it` : null);

/** "Fri, Nov 28, 8:00 AM", in this device's time. */
export const whenLabel = (at) => new Date(at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/** An instant as a datetime-local field's value (this device's time), or ''. */
export function toLocalInput(at) {
  if (!at) return '';
  const d = new Date(at);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A datetime-local field's value (this device's time) as an instant, or null. */
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : null);

// Learners see open exams first, then the ones still to open, then the rest.
const AVAILABILITY_ORDER = { open: 0, upcoming: 1, locked: 2, closed: 3 };
export const byAvailability = (a, b) => (AVAILABILITY_ORDER[a.availability] ?? 0) - (AVAILABILITY_ORDER[b.availability] ?? 0);

/**
 * When an exam can be taken, in a line: null when there is nothing to say
 * (open, with no closing date).
 */
export function availabilityLine(exam) {
  switch (exam.availability) {
    case 'locked': return 'Your reviewer has locked it for now.';
    case 'upcoming': return `Opens ${whenLabel(exam.opensAt)}`;
    case 'closed': return exam.closesAt ? `Closed ${whenLabel(exam.closesAt)}` : 'Closed';
    default: return exam.closesAt ? `Closes ${whenLabel(exam.closesAt)}` : null;
  }
}
