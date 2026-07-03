import { describe, it, expect } from 'vitest';
import { todayManila, manilaDateOf } from './manilaDate';

describe('manilaDate', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayManila()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('keys a known instant to the Manila calendar day', () => {
    // 2026-07-03 20:00 UTC is 2026-07-04 04:00 in Manila (UTC+8).
    expect(manilaDateOf('2026-07-03T20:00:00Z')).toBe('2026-07-04');
    // 2026-07-03 10:00 UTC is 2026-07-03 18:00 in Manila — same day.
    expect(manilaDateOf('2026-07-03T10:00:00Z')).toBe('2026-07-03');
  });

  it('accepts Date and timestamp inputs', () => {
    const d = new Date('2026-01-01T00:00:00Z'); // 08:00 Manila, same day
    expect(manilaDateOf(d)).toBe('2026-01-01');
    expect(manilaDateOf(d.getTime())).toBe('2026-01-01');
  });
});
