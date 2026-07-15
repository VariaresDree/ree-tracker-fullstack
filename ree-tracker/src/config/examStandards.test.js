import { describe, it, expect } from 'vitest';
import { PRC_TIMES, GAUNTLET_TIERS, SUBJECT_UNLOCK_LEVEL, getGauntletTier, isSubjectTier } from './examStandards.js';

describe('examStandards — PRC times', () => {
  it('uses the app board durations (EE 6h, Math/ESAS 4h, blended 5h)', () => {
    expect(PRC_TIMES.EE).toBe(6 * 3600);
    expect(PRC_TIMES.Mathematics).toBe(4 * 3600);
    expect(PRC_TIMES.ESAS).toBe(4 * 3600);
    expect(PRC_TIMES.BLENDED).toBe(5 * 3600);
  });
});

describe('examStandards — Gauntlet tiers', () => {
  it('has 4 blended tiers + 3 subject boards (7 total)', () => {
    expect(GAUNTLET_TIERS).toHaveLength(7);
    expect(GAUNTLET_TIERS.filter((t) => !isSubjectTier(t))).toHaveLength(4);
    expect(GAUNTLET_TIERS.filter(isSubjectTier)).toHaveLength(3);
  });

  it('subject boards are 100 items at their board time', () => {
    const math = getGauntletTier(5);
    const esas = getGauntletTier(6);
    const ee = getGauntletTier(7);
    expect(math).toMatchObject({ subject: 'Mathematics', items: 100, timeLimitSecs: 4 * 3600, unlockAfterBlended: true });
    expect(esas).toMatchObject({ subject: 'ESAS', items: 100, timeLimitSecs: 4 * 3600 });
    expect(ee).toMatchObject({ subject: 'EE', items: 100, timeLimitSecs: 6 * 3600 });
  });

  it('subject boards unlock only after the blended progression (level >= 5)', () => {
    expect(SUBJECT_UNLOCK_LEVEL).toBe(5);
  });

  it('getGauntletTier returns null for an unknown level', () => {
    expect(getGauntletTier(99)).toBeNull();
    expect(getGauntletTier(3).subject).toBe('BLENDED');
  });
});
