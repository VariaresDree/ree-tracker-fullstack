// src/utils/examFormat.js
// H:MM:SS for long board exams, MM:SS below an hour. Shared by the exam timer
// and the gauntlet diagnostics.
export function formatExamTime(secs) {
  const s = Math.max(0, Math.floor(secs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
