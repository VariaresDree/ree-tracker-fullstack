// src/features/profile/plannerTasks.js
//
// Planner v2 task helpers. A PLANNED task (kind set) is launched straight into
// the session it describes and completes itself from the day's answers
// (server: GET /api/user/tasks returns `progress`); a free-text task is ticked
// by hand as before.
import { drillPreset, quickReviewPreset } from '../active-recall/presets';

const KIND_LABEL = { drill: 'Drill', review: 'Review', mock: 'Timed sitting', cards: 'Formula cards' };

export const kindLabel = (task) => KIND_LABEL[task?.kind] || null;

/** Done by hand, or by the day's answers. */
export const isTaskDone = (task) => !!task?.completed || !!task?.progress?.done;

/** Where "Start" takes a planned task: a review preset, or a route. */
export function taskLaunch(task) {
  if (task?.kind === 'drill') {
    return { preset: drillPreset({ topicId: task.topicId, topic: task.topic, subject: task.subject, count: task.targetCount || 10 }) };
  }
  if (task?.kind === 'review') return { preset: quickReviewPreset(Math.min(task.targetCount || 20, 50)) };
  if (task?.kind === 'mock') return { to: '/simulator' };
  // The cards due are rated in Library › Formula cards (or in today's loop).
  if (task?.kind === 'cards') return { to: '/library?tab=formulas' };
  return null;
}

// 'YYYY-MM-DD' plus n days, from the string's parts (no timezone shift).
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/**
 * The task list in the order a learner reads it: what's late, what's today,
 * the next seven days, later, undated, and done. Each group is sorted by due
 * date. `today` is the Manila day.
 */
export function groupTasks(tasks, today) {
  const weekEnd = addDays(today, 7);
  const groups = { overdue: [], today: [], week: [], later: [], undated: [], done: [] };
  for (const t of tasks) {
    if (isTaskDone(t)) groups.done.push(t);
    else if (!t.dueDate) groups.undated.push(t);
    else if (t.dueDate < today) groups.overdue.push(t);
    else if (t.dueDate === today) groups.today.push(t);
    else if (t.dueDate <= weekEnd) groups.week.push(t);
    else groups.later.push(t);
  }
  const byDue = (a, b) => (a.dueDate || '').localeCompare(b.dueDate || '');
  for (const g of Object.values(groups)) g.sort(byDue);
  // Done: the latest first.
  groups.done.reverse();
  return groups;
}
