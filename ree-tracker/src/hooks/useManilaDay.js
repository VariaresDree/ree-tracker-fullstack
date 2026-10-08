// src/hooks/useManilaDay.js
//
// Today's Manila date (YYYY-MM-DD), re-rendering the caller when it changes.
//
// Nothing else re-renders a screen at midnight: the daily counts, the streak
// and the exam countdown were all judged on the day the page last rendered,
// so a Today screen left open overnight showed yesterday's numbers until a
// tap or a sync redrew it. A timer fires just after the next Manila midnight;
// a sleeping laptop or a backgrounded phone tab can miss it, so the date is
// also re-read whenever the page is shown or focused again.
import { useSyncExternalStore } from 'react';
import { nextManilaMidnight, todayManila } from '@ree/shared';

// A second past midnight, so the formatter is safely on the new day.
const AFTER_MIDNIGHT_MS = 1000;

function subscribe(onChange) {
  let timer;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { onChange(); arm(); }, nextManilaMidnight() - Date.now() + AFTER_MIDNIGHT_MS);
  };
  // onChange only asks React to re-read the snapshot; the caller re-renders
  // only when the date it returns is a different string.
  const recheck = () => {
    if (document.visibilityState === 'hidden') return;
    onChange();
    arm();
  };
  arm();
  document.addEventListener('visibilitychange', recheck);
  window.addEventListener('focus', recheck);
  window.addEventListener('pageshow', recheck);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', recheck);
    window.removeEventListener('focus', recheck);
    window.removeEventListener('pageshow', recheck);
  };
}

/** @returns {string} today's Manila date, YYYY-MM-DD */
export function useManilaDay() {
  return useSyncExternalStore(subscribe, todayManila, todayManila);
}
