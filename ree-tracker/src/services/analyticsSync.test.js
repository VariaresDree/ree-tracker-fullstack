import { describe, it, expect } from 'vitest';
import { normalizeMicroTopics, mergeServerIntoStats } from './analyticsSync';

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

  it('takes server theta/streak as canonical and max-merges counters', () => {
    const out = mergeServerIntoStats(
      { irt: { theta: 0.1 }, globalStreak: 2, totalAnswered: 40 },
      { profile: { thetaRating: 1.4, globalStreak: 5, totalAnswered: 30 }, thetaHistory: [{ date: '2026-07-10', theta: 1.4 }] },
    );
    expect(out.irt.theta).toBe(1.4);
    expect(out.globalStreak).toBe(5);        // max(2, 5)
    expect(out.totalAnswered).toBe(40);      // max(40, 30)
    expect(out.thetaHistory).toHaveLength(1);
  });
});
