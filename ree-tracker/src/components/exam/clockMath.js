// src/components/exam/clockMath.js
//
// The exam clock's arithmetic, apart from the component (ExamClock.jsx) so
// that file exports only the component.

/** Seconds left until `endTime`, floored at 0. */
export function remainingSecs(endTime, now = Date.now()) {
    if (!endTime) return 0;
    return Math.max(0, Math.round((endTime - now) / 1000));
}

/** Under five minutes is the "critical" styling threshold. */
export const CRITICAL_SECS = 300;
