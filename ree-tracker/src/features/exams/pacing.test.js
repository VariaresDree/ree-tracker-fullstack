import { describe, it, expect } from 'vitest';
import { paceBand, pacingSummary, paceStatus, formatSecs } from './pacing';

describe('pacing against the board', () => {
  it('bands an item by its own subject’s pace', () => {
    // 170 s is on pace for Mathematics (180) but slow for ESAS (144).
    expect(paceBand('Mathematics', 170_000)).toBe('onPace');
    expect(paceBand('ESAS', 170_000)).toBe('slow');
    expect(paceBand('EE', 60_000)).toBe('fast');
    expect(paceBand('EE', 0)).toBeNull(); // untimed, not fast
  });

  it('summarises per subject in board order, with the slowest items', () => {
    const items = [
      { order: 1, subject: 'EE', timeSpentMs: 300_000 },
      { order: 2, subject: 'Math', timeSpentMs: 60_000 },
      { order: 3, subject: 'EE', timeSpentMs: 100_000 },
      { order: 4, subject: 'ESAS', timeSpentMs: 200_000 },
      { order: 5, subject: 'ESAS', timeSpentMs: 0 },
    ];
    const { bySubject, slowest, timedCount } = pacingSummary(items);
    expect(bySubject.map((r) => [r.subject, r.paceSecs, r.avgSecs, r.timed])).toEqual([
      ['Mathematics', 180, 60, 1], ['ESAS', 144, 200, 1], ['EE', 216, 200, 2],
    ]);
    expect(slowest.map((s) => s.order)).toEqual([1, 4]);
    expect(timedCount).toBe(4);
  });

  it('says whether a sitting is ahead, on pace or behind', () => {
    const base = { totalSecs: 6000, totalItems: 100 };
    expect(paceStatus({ ...base, elapsedSecs: 3000, answered: 50 }).status).toBe('onPace');
    expect(paceStatus({ ...base, elapsedSecs: 3000, answered: 60 }).status).toBe('ahead');
    expect(paceStatus({ ...base, elapsedSecs: 3000, answered: 40 })).toMatchObject({ status: 'behind', expected: 50 });
    expect(paceStatus({ totalSecs: 0, totalItems: 10, elapsedSecs: 1, answered: 0 })).toBeNull();
  });

  it('formats durations', () => {
    expect(formatSecs(144)).toBe('2:24');
    expect(formatSecs(3725)).toBe('1:02:05');
  });
});
