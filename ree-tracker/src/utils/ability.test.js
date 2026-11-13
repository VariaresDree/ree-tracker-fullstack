import { describe, it, expect } from 'vitest';
import { abilityPercent } from './ability';

// One ability scale for learners: the percent Today's readiness breakdown shows.
describe('abilityPercent', () => {
  it('maps θ −4…4 to 0…100, as the server normalises it', () => {
    expect(abilityPercent(0)).toBe(50);
    expect(abilityPercent(2)).toBe(75);
    expect(abilityPercent(-4)).toBe(0);
    expect(abilityPercent(9)).toBe(100);
  });
  it('reads no evidence as the middle', () => {
    expect(abilityPercent(undefined)).toBe(50);
    expect(abilityPercent('x')).toBe(50);
  });
});
