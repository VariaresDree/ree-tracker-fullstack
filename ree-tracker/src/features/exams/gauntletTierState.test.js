import { describe, it, expect } from 'vitest';
import { GAUNTLET_TIERS, SUBJECT_UNLOCK_LEVEL } from '../../config/examStandards';
import { cooldownLabel, formatLimit, tierState } from './gauntletTierState';

const tier = (level) => GAUNTLET_TIERS.find((t) => t.level === level);

describe('tierState', () => {
  it('a tier below your level is cleared; your level opens once you have answered enough', () => {
    expect(tierState(tier(1), { currentLevel: 2, totalAnswered: 0 })).toMatchObject({ isPassed: true, isLocked: false });
    expect(tierState(tier(2), { currentLevel: 2, totalAnswered: tier(2).reqQs - 1 })).toMatchObject({ isUnlocked: false, isLocked: true });
    expect(tierState(tier(2), { currentLevel: 2, totalAnswered: tier(2).reqQs })).toMatchObject({ isUnlocked: true, isLocked: false });
    expect(tierState(tier(3), { currentLevel: 2, totalAnswered: 99999 })).toMatchObject({ isUnlocked: false, isLocked: true });
  });

  it('the subject boards open together after the blended tiers, and are never "cleared"', () => {
    expect(tierState(tier(5), { currentLevel: SUBJECT_UNLOCK_LEVEL - 1 })).toMatchObject({ subject: true, isLocked: true });
    expect(tierState(tier(7), { currentLevel: SUBJECT_UNLOCK_LEVEL })).toMatchObject({ subject: true, isUnlocked: true, isPassed: false });
  });

  it('the cooldown locks only what is open', () => {
    expect(tierState(tier(2), { currentLevel: 2, totalAnswered: 9999, coolingDown: '1h' }).isCoolingDown).toBe(true);
    expect(tierState(tier(3), { currentLevel: 2, totalAnswered: 9999, coolingDown: '1h' }).isCoolingDown).toBe(false);
  });
});

describe('cooldownLabel', () => {
  it('counts down, and is null once the lock has passed', () => {
    const now = 1_000_000;
    expect(cooldownLabel(now + (3600 + 125) * 1000, now)).toBe('1h 2m 5s');
    expect(cooldownLabel(now - 1, now)).toBeNull();
    expect(cooldownLabel(null, now)).toBeNull();
  });
});

describe('formatLimit', () => {
  it('reads as hours and minutes', () => {
    expect(formatLimit(75 * 60)).toBe('1h 15m');
    expect(formatLimit(120 * 60)).toBe('2h');
    expect(formatLimit(30 * 60)).toBe('30 min');
  });
});
