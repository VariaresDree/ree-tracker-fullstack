// src/features/notebook/causeWeeks.js
//
// Why you miss, over time: tagged causes per Manila week (Monday start), and
// the biggest change between the last four weeks and the four before ("You're
// misreading less"). The cause summary says what most misses come down to;
// this says whether that's changing.
//
// Each mistake has ONE cause (MistakeTag keeps the latest), counted at its
// latest miss, so a question re-tagged after a new miss moves to that week.
// That's a fair read of the trend, not a per-miss history. Untagged misses
// aren't counted: the suggested cause is only ever "time" or "concept", and
// counting it would invent a trend.
import { MISTAKE_CAUSES } from '@ree/shared';

const DAY = 86400000;
const MANILA = 8 * 3600000;
const SPLIT = 4;      // weeks per half
const MIN_EACH = 5;   // tagged misses each half needs before a headline
const MIN_SHIFT = 10; // percentage points that count as a change

/** The Monday (Manila) a moment falls in, as YYYY-MM-DD. */
export function manilaWeekStart(ms) {
  const local = new Date(ms + MANILA);
  const back = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - back)).toISOString().slice(0, 10);
}

const SUBJECT = {
  concept: ['Gaps in the concept', 'are'],
  computation: ['Computation slips', 'are'],
  misread: ['Misreading the question', 'is'],
  time: ['Running out of time', 'is'],
};

/**
 * @param {Array<{cause?:string|null, lastWrongAt?:string}>} items
 * @returns {{ weeks: Array<{start:string,total:number,byCause:Record<string,number>}>, headline: string|null }}
 */
export function causeTrend(items, { now = Date.now(), weeks = 8 } = {}) {
  const thisWeek = manilaWeekStart(now);
  const starts = Array.from({ length: weeks }, (_, i) => {
    const t = Date.parse(`${thisWeek}T00:00:00Z`) - (weeks - 1 - i) * 7 * DAY;
    return new Date(t).toISOString().slice(0, 10);
  });
  const index = new Map(starts.map((s, i) => [s, i]));
  const rows = starts.map((start) => ({ start, total: 0, byCause: Object.fromEntries(MISTAKE_CAUSES.map((c) => [c, 0])) }));

  for (const item of items || []) {
    if (!MISTAKE_CAUSES.includes(item?.cause)) continue;
    const at = Date.parse(item.lastWrongAt);
    if (!Number.isFinite(at)) continue;
    const i = index.get(manilaWeekStart(at));
    if (i == null) continue;
    rows[i].total += 1;
    rows[i].byCause[item.cause] += 1;
  }

  return { weeks: rows, headline: headlineOf(rows) };
}

function headlineOf(rows) {
  if (rows.length < SPLIT * 2) return null;
  const sum = (part) => part.reduce((acc, r) => {
    acc.total += r.total;
    for (const c of MISTAKE_CAUSES) acc.byCause[c] += r.byCause[c];
    return acc;
  }, { total: 0, byCause: Object.fromEntries(MISTAKE_CAUSES.map((c) => [c, 0])) });
  const before = sum(rows.slice(-SPLIT * 2, -SPLIT));
  const after = sum(rows.slice(-SPLIT));
  if (before.total < MIN_EACH || after.total < MIN_EACH) return null;

  const pct = (half, c) => Math.round((half.byCause[c] / half.total) * 100);
  const [cause, was, now] = MISTAKE_CAUSES
    .map((c) => [c, pct(before, c), pct(after, c)])
    .sort((a, b) => Math.abs(b[2] - b[1]) - Math.abs(a[2] - a[1]))[0];
  if (Math.abs(now - was) < MIN_SHIFT) return null;
  const [subject, verb] = SUBJECT[cause];
  return `${subject} ${verb} ${now < was ? 'down' : 'up'}: ${was}% of your tagged misses in the four weeks before, ${now}% in the last four.`;
}
