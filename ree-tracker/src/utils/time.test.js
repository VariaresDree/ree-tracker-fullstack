import { describe, it, expect } from 'vitest';
import { formatClock, formatDuration } from './time';

describe('formatClock', () => {
  it('reads like a clock, padded for the exam timer', () => {
    expect(formatClock(144)).toBe('2:24');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatClock(144, { pad: true })).toBe('02:24');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(null)).toBe('0:00');
  });
});

describe('formatDuration', () => {
  it('reads as a length of time', () => {
    expect(formatDuration(42)).toBe('42s');
    expect(formatDuration(125)).toBe('2m 05s');
    expect(formatDuration(3725)).toBe('1h 02m');
    expect(formatDuration(undefined)).toBe('0s');
  });
});
