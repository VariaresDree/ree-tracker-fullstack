// src/services/reminderPrefs.js
//
// The scheduled reminder's hour on the server (PUT /api/user/reminders): the
// backend sends it as a push at that Manila hour, with the day's most useful
// line. Sent as the whole preference, or queued offline (a newer one
// replaces the older). Best effort: a failure leaves the on-device reminder.
import { writeOrQueue } from './writeOrQueue';

export const REMINDERS_ENDPOINT = '/api/user/reminders';

/** @param {number|null} hour Manila hour 0–23, or null for off */
export async function saveReminderHour(hour) {
  try {
    await writeOrQueue(REMINDERS_ENDPOINT, 'PUT', { hour }, { queueKey: REMINDERS_ENDPOINT, supersede: true });
    return true;
  } catch {
    return false;
  }
}
