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

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/**
 * The current plan at a glance, from its tasks (no request of its own): what
 * is left from today, when it runs out, when it was made, and whether it
 * should be re-planned. Null when there is no plan.
 *
 * `madeOn` is the Manila day of the newest plan task; `stale` once it is a
 * week old (mastery has moved since); `runsOut` when it ends within a week and
 * before the exam (it plans six weeks at most).
 */
export function planSummary(tasks, today, examDate = null, manilaDateOf = (d) => String(d).slice(0, 10)) {
  const planned = (tasks || []).filter((t) => t.kind && t.dueDate);
  if (planned.length === 0) return null;
  const ahead = planned.filter((t) => !isTaskDone(t) && t.dueDate >= today);
  const drills = ahead.filter((t) => t.kind === 'drill');
  const endsOn = planned.map((t) => t.dueDate).sort().pop();
  const madeOn = planned.map((t) => t.createdAt).filter(Boolean).map((d) => manilaDateOf(d)).sort().pop() || null;
  const ageDays = madeOn ? daysBetween(madeOn, today) : null;
  return {
    endsOn,
    madeOn,
    ageDays,
    left: ahead.length,
    drills: drills.length,
    topics: new Set(drills.map((t) => String(t.topic || '').trim().toLowerCase())).size,
    sittings: ahead.filter((t) => t.kind === 'mock').length,
    over: ahead.length === 0,
    stale: ageDays !== null && ageDays >= 7,
    runsOut: !!examDate && endsOn < addDays(examDate, -1) && daysBetween(today, endsOn) <= 7,
  };
}
