// src/features/profile/plannerTasks.js
//
// Planner v2 task helpers. A PLANNED task (kind set) is launched straight into
// the session it describes and completes itself from the day's answers
// (server: GET /api/user/tasks returns `progress`); a free-text task is ticked
// by hand as before.
import { drillPreset, quickReviewPreset } from '../active-recall/presets';

const KIND_LABEL = { drill: 'Drill', review: 'Review', mock: 'Timed sitting' };

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
  return null;
}
