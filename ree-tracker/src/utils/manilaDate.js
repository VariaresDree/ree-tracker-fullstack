// src/utils/manilaDate.js
// The REE board exam is Philippine — every daily boundary in the app (daily
// targets, activity calendar, streaks) is keyed to Asia/Manila, matching the
// backend's telemetryService.todayManila(). Using the browser-local date here
// caused daily tallies to reset mid-session for users in other timezones.

const MANILA_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });

// YYYY-MM-DD in Manila time (en-CA locale yields the ISO-like shape).
export function todayManila() {
  return MANILA_FMT.format(new Date());
}

// Manila calendar date of an arbitrary Date/timestamp.
export function manilaDateOf(d) {
  return MANILA_FMT.format(d instanceof Date ? d : new Date(d));
}
