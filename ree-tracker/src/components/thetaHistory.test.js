import { describe, it, expect } from 'vitest';
import { bucketThetaHistory } from './thetaHistory';

const h = (date, theta) => ({ date, theta });

describe('bucketThetaHistory', () => {
  it('labels days by date, not "Day 1"', () => {
    const out = bucketThetaHistory([h('2026-10-03T12:00:00', 0.1), h('2026-10-04T12:00:00', 0.2)], 'day');
    expect(out.map((p) => p.name)).toEqual(['Oct 3', 'Oct 4']);
  });

  it('keeps the latest θ per week and labels the week by its date', () => {
    const out = bucketThetaHistory([h('2026-10-05T12:00:00', 0.1), h('2026-10-07T12:00:00', 0.3), h('2026-10-13T12:00:00', 0.4)], 'week');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ theta: 0.3, name: 'Oct 7', date: 'Week of Oct 7' });
  });

  it('keeps at most 30 days', () => {
    const days = Array.from({ length: 40 }, (_, i) => h(new Date(Date.UTC(2026, 8, 1 + i, 12)).toISOString(), i / 100));
    expect(bucketThetaHistory(days, 'day')).toHaveLength(30);
  });
});
