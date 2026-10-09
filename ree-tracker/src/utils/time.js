// src/utils/time.js
//
// The two ways the app writes a length of time. There were seven formatters
// across the pages (two clock styles, three "1h 02m" styles, one that wrote
// "0m 42s"), so the same 42 seconds read differently from screen to screen.
//
//   formatClock     a running clock or a per-item time: "2:24", "1:02:05";
//                   { pad: true } gives the exam timer's "02:24".
//   formatDuration  how long something took: "42s", "2m 05s", "1h 02m".

/** "2:24" or "1:02:05"; with { pad: true }, "02:24". */
export function formatClock(secs, { pad = false } = {}) {
  const s = Math.max(0, Math.round(secs || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${r}`;
  return `${pad ? String(m).padStart(2, '0') : m}:${r}`;
}

/** 42 → "42s", 125 → "2m 05s", 3725 → "1h 02m". */
export function formatDuration(secs) {
  const s = Math.max(0, Math.round(secs || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
