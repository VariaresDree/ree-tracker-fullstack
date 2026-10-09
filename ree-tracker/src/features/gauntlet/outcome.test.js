import { describe, it, expect } from 'vitest';
import { VERDICT } from '@ree/shared';
import { formatLockTime, outcomeCopy } from './outcome';

describe('outcomeCopy', () => {
  const later = Date.now() + 12 * 3600e3;

  it('says what the run did to the ladder', () => {
    expect(outcomeCopy({ outcome: 'advanced', ladderLevel: 3 })).toEqual({ title: 'Tier passed', line: 'Level 3 is open.' });
    expect(outcomeCopy({ outcome: 'cleared' }).title).toBe('Board cleared');
    expect(outcomeCopy({ outcome: 'passed' }).line).toMatch(/level stays the same/);
    expect(outcomeCopy({ outcome: 'locked' }).title).toBe('Not counted');
  });

  it('a fail names when the Gauntlet opens again, from the actual lock', () => {
    const { title, line } = outcomeCopy({ outcome: 'failed', verdict: VERDICT.FAILED, lockUntil: new Date(later).toISOString() });
    expect(title).toBe('Not passed this time');
    expect(line).toContain(`opens again ${formatLockTime(later)}`);
  });

  it('a conditional pass explains why it did not clear the tier', () => {
    expect(outcomeCopy({ outcome: 'failed', verdict: VERDICT.CONDITIONAL, lockUntil: later }).line).toMatch(/^A conditional pass/);
  });
});

describe('formatLockTime', () => {
  it('is null for a lock that has passed or is missing', () => {
    expect(formatLockTime(Date.now() - 1)).toBeNull();
    expect(formatLockTime(null)).toBeNull();
    expect(formatLockTime('not a date')).toBeNull();
  });
});
