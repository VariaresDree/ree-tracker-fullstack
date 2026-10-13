// src/services/reminderPrefs.js
//
// The scheduled reminder's hour on the server (PUT /api/user/reminders): the
// backend sends it as a push at that Manila hour, with the day's most useful
// line. Sent as the whole preference, or queued offline (a newer one
// replaces the older). Best effort: a failure leaves the on-device reminder.
import { serverRemindsAt } from '@ree/shared';
import { writeOrQueue } from './writeOrQueue';
import { scheduleDailyReminder, cancelDailyReminder } from './localReminders';
import { hasPushToken } from './pushNotifications';

export const REMINDERS_ENDPOINT = '/api/user/reminders';

/**
 * Turn the daily reminder on (at `hour`) or off, from one place, so it never
 * comes twice and never goes missing:
 *   • this phone gets pushes and the server sends at that hour → the server
 *     sends it (saying what's due) and the phone's own reminder is cancelled;
 *   • otherwise the phone's own reminder is scheduled, and the server's hour
 *     is cleared.
 * Resolves { ok, from: 'server' | 'device' | null }; ok is false when the
 * phone's reminder couldn't be scheduled (notifications off).
 */
export async function applyDailyReminder({ on, hour, minute = 0 }) {
  if (!on) {
    await cancelDailyReminder();
    saveReminderHour(null);
    return { ok: true, from: null };
  }
  if (hasPushToken() && serverRemindsAt(hour)) {
    await cancelDailyReminder();
    saveReminderHour(hour);
    return { ok: true, from: 'server' };
  }
  const ok = await scheduleDailyReminder({ hour, minute });
  saveReminderHour(null);
  return { ok, from: ok ? 'device' : null };
}

/** @param {number|null} hour Manila hour 0–23, or null for off */
export async function saveReminderHour(hour) {
  try {
    await writeOrQueue(REMINDERS_ENDPOINT, 'PUT', { hour }, { queueKey: REMINDERS_ENDPOINT, supersede: true });
    return true;
  } catch {
    return false;
  }
}
