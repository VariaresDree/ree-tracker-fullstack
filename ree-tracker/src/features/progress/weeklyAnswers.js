// src/features/progress/weeklyAnswers.js
//
// Questions answered in the last seven Manila days (today included) and in
// the seven before them, from the study calendar (YYYY-MM-DD → count, the
// same server-reconciled days that sum to "Questions answered"). Progress ›
// Overview shows the pair under the all-time figure.
import { dayBefore } from '@ree/shared';

export function weeklyAnswers(activityCalendar, today) {
  const cal = activityCalendar || {};
  let day = today;
  let thisWeek = 0;
  let lastWeek = 0;
  for (let i = 0; i < 14 && day; i++) {
    const n = Number(cal[day]) || 0;
    if (i < 7) thisWeek += n;
    else lastWeek += n;
    day = dayBefore(day);
  }
  return { thisWeek, lastWeek };
}
