import { describe, it, expect } from 'vitest';
import { todayManila, dayBefore } from '@ree/shared';
import { normalizeMicroTopics, mergeServerIntoStats, lastStudyDay, dailyCountsToday } from './analyticsSync';

const TODAY = todayManila();
const YESTERDAY = dayBefore(TODAY);
const THREE_DAYS_AGO = dayBefore(dayBefore(YESTERDAY));

describe('normalizeMicroTopics', () => {
  const tos = { EE: ['AC Electric Circuits'], Mathematics: ['Algebra'] };

  it('seeds a zeroed entry for every TOS subtopic (heatmap tiles exist pre-attempt)', () => {
    const out = normalizeMicroTopics({}, tos);
    expect(out['AC Electric Circuits']).toMatchObject({ subject: 'EE', attempts: 0, correct: 0, mastery: null });
    expect(out['Algebra']).toMatchObject({ subject: 'Mathematics', attempts: 0 });
  });

  it('translates backend field names (totalAttempts/correctHits/totalTimeSecs) to client shape', () => {
    const out = normalizeMicroTopics({
      'AC Electric Circuits': { subject: 'EE', subtopic: 'AC Electric Circuits', totalAttempts: 10, correctHits: 7, totalTimeSecs: 120, timedAttempts: 8, mastery: 0.6, masteryN: 10 },
    }, tos);
    expect(out['AC Electric Circuits']).toMatchObject({
      attempts: 10, correct: 7, totalTime: 120000, timedAttempts: 8, mastery: 0.6, masteryN: 10,
    });
  });
});

describe('mergeServerIntoStats', () => {
  it('returns null with no data, and passthrough when only one side exists', () => {
    expect(mergeServerIntoStats(null, null)).toBeNull();
    expect(mergeServerIntoStats({ a: 1 }, null)).toEqual({ a: 1 });
  });

  it('keeps the local microTopic only when it has MORE attempts (fresh optimistic answer)', () => {
    const stats = { microTopics: { Algebra: { attempts: 5, correct: 4 } } };
    const sql = { microTopics: { Algebra: { attempts: 3, correct: 2 } } };
    const out = mergeServerIntoStats(stats, sql);
    expect(out.microTopics.Algebra.attempts).toBe(5); // local wins (more attempts)

    const out2 = mergeServerIntoStats({ microTopics: { Algebra: { attempts: 1 } } }, { microTopics: { Algebra: { attempts: 9, correct: 8 } } });
    expect(out2.microTopics.Algebra.attempts).toBe(9); // server wins
  });

  it('picks the matrix with the larger total', () => {
    const localBig = { matrix: { hc: 5, hw: 1, lc: 0, lw: 0 } };
    const sqlSmall = { matrix: { hc: 1, hw: 0, lc: 0, lw: 0 } };
    expect(mergeServerIntoStats(localBig, sqlSmall).matrix).toEqual(localBig.matrix);
    expect(mergeServerIntoStats({ matrix: { hc: 1 } }, { matrix: { hc: 4, hw: 2 } }).matrix).toEqual({ hc: 4, hw: 2 });
  });

  it('overlays local activityCalendar onto the server calendar (server base)', () => {
    const out = mergeServerIntoStats(
      { activityCalendar: { '2026-07-11': 12 } },
      { activityCalendar: { '2026-07-10': 30, '2026-07-11': 5 } },
    );
    // local (today's optimistic key) overlays; server-only days preserved.
    expect(out.activityCalendar).toEqual({ '2026-07-10': 30, '2026-07-11': 12 });
  });

  it('takes server theta/streak as canonical, and totalAnswered server-authoritative', () => {
    const out = mergeServerIntoStats(
      { irt: { theta: 0.1 }, globalStreak: 2, totalAnswered: 40 },
      { profile: { thetaRating: 1.4, globalStreak: 5, totalAnswered: 30 }, thetaHistory: [{ date: '2026-07-10', theta: 1.4 }] },
    );
    expect(out.irt.theta).toBe(1.4);
    expect(out.globalStreak).toBe(5);        // max(2, 5)
    // Server-authoritative: with NO local optimistic calendar excess, the stale
    // local totalAnswered (40) no longer sticks — the server value (30) wins.
    // (This is the fix: the old max() kept local inflation forever.)
    expect(out.totalAnswered).toBe(30);
    expect(out.thetaHistory).toHaveLength(1);
  });

  it('server wins the calendar when local is NOT ahead (no sticky over-count)', () => {
    const out = mergeServerIntoStats(
      { activityCalendar: { '2026-07-11': 3 }, totalAnswered: 99 },
      { activityCalendar: { '2026-07-11': 8 }, profile: { totalAnswered: 20 } },
    );
    // local(3) < server(8) → server value stands; no optimistic delta.
    expect(out.activityCalendar).toEqual({ '2026-07-11': 8 });
    expect(out.totalAnswered).toBe(20);
  });

  it('INVARIANT: totalAnswered === Σ(activityCalendar) after merge, with optimistic overlay', () => {
    const out = mergeServerIntoStats(
      // local is one day ahead by 7 (un-synced optimistic answers today)
      { activityCalendar: { '2026-07-10': 30, '2026-07-11': 12 } },
      { activityCalendar: { '2026-07-10': 30, '2026-07-11': 5 }, profile: { totalAnswered: 35 } },
    );
    const calendarSum = Object.values(out.activityCalendar).reduce((s, n) => s + n, 0);
    expect(out.totalAnswered).toBe(42);       // server 35 + optimistic delta 7
    expect(calendarSum).toBe(out.totalAnswered); // the guaranteed invariant
  });
});

describe('lastStudyDay', () => {
  it('is the newest calendar day with answers, or the optimistic lastActiveDate', () => {
    expect(lastStudyDay({ activityCalendar: { '2026-10-01': 4, '2026-10-05': 2, '2026-10-06': 0 } })).toBe('2026-10-05');
    expect(lastStudyDay({ activityCalendar: { '2026-10-05': 2 }, lastActiveDate: '2026-10-07' })).toBe('2026-10-07');
    expect(lastStudyDay({})).toBeNull();
    expect(lastStudyDay(null)).toBeNull();
  });
});

// The stored streak is only rewritten when answers are recorded, so it outlives
// a missed day. The server now judges it on read; the merge must not let the
// device's own copy (persisted, equally stale) win the max() and bring it back.
describe('mergeServerIntoStats — streak', () => {
  it('does not resurrect a stale local streak over the server value', () => {
    // Live report: last answers three days ago, "3-day streak" still shown.
    const out = mergeServerIntoStats(
      { globalStreak: 3, lastActiveDate: THREE_DAYS_AGO, activityCalendar: { [THREE_DAYS_AGO]: 3 } },
      { profile: { globalStreak: 0 }, activityCalendar: { [THREE_DAYS_AGO]: 3 } },
    );
    expect(out.globalStreak).toBe(0);
  });

  it('keeps a local optimistic streak the server has not counted yet', () => {
    // Answered offline today after the gap: calculateUpdatedStats reset it to 1.
    const out = mergeServerIntoStats(
      { globalStreak: 1, lastActiveDate: TODAY, activityCalendar: { [THREE_DAYS_AGO]: 3, [TODAY]: 2 } },
      { profile: { globalStreak: 0 }, activityCalendar: { [THREE_DAYS_AGO]: 3 } },
    );
    expect(out.globalStreak).toBe(1);
  });

  it('keeps a local streak still alive from yesterday', () => {
    const out = mergeServerIntoStats(
      { globalStreak: 4, lastActiveDate: YESTERDAY, activityCalendar: { [YESTERDAY]: 6 } },
      { profile: { globalStreak: 0 }, activityCalendar: {} },
    );
    expect(out.globalStreak).toBe(4);
  });
});

// The per-subject daily counters are saved with the rest of `stats` and only
// zeroed by the next answer on this device (calculateUpdatedStats), so a new
// day used to open with the last study day's counts still in them, shown as
// today's progress until the first answer.
const NO_COUNTS = { dailyMath: 0, dailyESAS: 0, dailyEE: 0 };

describe('dailyCountsToday', () => {
  it('reads the counters while these stats show answers today', () => {
    expect(dailyCountsToday({ lastActiveDate: TODAY, dailyMath: 4, dailyESAS: 2, dailyEE: 6 }, TODAY))
      .toEqual({ dailyMath: 4, dailyESAS: 2, dailyEE: 6 });
  });

  it('reads 0 once the day they were counted on has passed', () => {
    const yesterdays = { lastActiveDate: YESTERDAY, activityCalendar: { [YESTERDAY]: 12 }, dailyMath: 4, dailyESAS: 2, dailyEE: 6 };
    expect(dailyCountsToday(yesterdays, TODAY)).toEqual(NO_COUNTS);
    // No evidence of a study day at all reads 0 too.
    expect(dailyCountsToday({ dailyMath: 4 }, TODAY)).toEqual(NO_COUNTS);
    expect(dailyCountsToday(null, TODAY)).toEqual(NO_COUNTS);
  });

  it('keeps counts a sync brought in from another device', () => {
    // This device last answered yesterday, but the merged calendar shows
    // today's answers from the phone: the counters are today's.
    const synced = { lastActiveDate: YESTERDAY, activityCalendar: { [YESTERDAY]: 30, [TODAY]: 9 }, dailyMath: 5, dailyESAS: 0, dailyEE: 4 };
    expect(dailyCountsToday(synced, TODAY)).toEqual({ dailyMath: 5, dailyESAS: 0, dailyEE: 4 });
  });

  it('judges against the Manila day by default', () => {
    expect(dailyCountsToday({ lastActiveDate: TODAY, dailyMath: 3 })).toEqual({ ...NO_COUNTS, dailyMath: 3 });
  });
});

describe('mergeServerIntoStats — daily counts', () => {
  const daily = (s) => [s.dailyMath, s.dailyESAS, s.dailyEE];

  it('does not carry the last study day’s counts into a new day', () => {
    // 30 answered yesterday; nothing yet today, here or anywhere else.
    const out = mergeServerIntoStats(
      { lastActiveDate: YESTERDAY, activityCalendar: { [YESTERDAY]: 30 }, dailyMath: 10, dailyESAS: 8, dailyEE: 12 },
      { profile: { dailyMath: 0, dailyESAS: 0, dailyEE: 0 }, activityCalendar: { [YESTERDAY]: 30 } },
    );
    expect(daily(out)).toEqual([0, 0, 0]);
  });

  it('takes today’s server counts over this device’s stale ones', () => {
    const out = mergeServerIntoStats(
      { lastActiveDate: YESTERDAY, activityCalendar: { [YESTERDAY]: 30 }, dailyMath: 10, dailyESAS: 8, dailyEE: 12 },
      { profile: { dailyMath: 3, dailyESAS: 0, dailyEE: 2 }, activityCalendar: { [YESTERDAY]: 30, [TODAY]: 5 } },
    );
    expect(daily(out)).toEqual([3, 0, 2]);
    // ...and the merged stats still read as today's on screen.
    expect(dailyCountsToday(out, TODAY)).toEqual({ dailyMath: 3, dailyESAS: 0, dailyEE: 2 });
  });

  it('keeps today’s answers on this device that the server has not counted yet', () => {
    const out = mergeServerIntoStats(
      { lastActiveDate: TODAY, activityCalendar: { [TODAY]: 6 }, dailyMath: 4, dailyESAS: 0, dailyEE: 2 },
      { profile: { dailyMath: 1, dailyESAS: 0, dailyEE: 0 }, activityCalendar: { [TODAY]: 1 } },
    );
    expect(daily(out)).toEqual([4, 0, 2]);
  });

  it('ignores a payload’s daily counts from an earlier day (fetched before midnight)', () => {
    // The app stayed open past midnight: the last payload is yesterday's, and
    // its daily rollup counted yesterday. One answer since midnight here.
    const out = mergeServerIntoStats(
      { lastActiveDate: TODAY, activityCalendar: { [YESTERDAY]: 20, [TODAY]: 1 }, dailyMath: 1, dailyESAS: 0, dailyEE: 0 },
      { profile: { dailyMath: 12, dailyESAS: 3, dailyEE: 5 }, activityCalendar: { [YESTERDAY]: 20 } },
    );
    expect(daily(out)).toEqual([1, 0, 0]);
  });
});
