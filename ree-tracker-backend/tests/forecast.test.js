import { describe, it, expect } from 'vitest';
const {
  probabilities,
  buildForecast,
  rankWeakTopics,
  buildPrescription,
  _internals,
} = require('../src/engine/forecast');

describe('normCdf', () => {
  it('is 0.5 at the mean', () => {
    expect(_internals.normCdf(0)).toBeCloseTo(0.5, 4);
  });
  it('reaches the standard 0.84 / 0.16 marks at ±1 sigma', () => {
    expect(_internals.normCdf(1)).toBeCloseTo(0.8413, 3);
    expect(_internals.normCdf(-1)).toBeCloseTo(0.1587, 3);
  });
});

describe('probabilities — bounds and monotonicity', () => {
  it('returns values in [0, 1]', () => {
    const out = probabilities({ theta: 0.5, se: 0.4 });
    expect(out.passProbability).toBeGreaterThanOrEqual(0);
    expect(out.passProbability).toBeLessThanOrEqual(1);
    expect(out.topnotcherProbability).toBeGreaterThanOrEqual(0);
    expect(out.topnotcherProbability).toBeLessThanOrEqual(1);
  });

  it('raises pass probability as theta rises', () => {
    const low = probabilities({ theta: -1, se: 0.4 });
    const high = probabilities({ theta: 1, se: 0.4 });
    expect(high.passProbability).toBeGreaterThan(low.passProbability);
  });

  it('topnotcher probability never exceeds pass probability', () => {
    for (let t = -2; t <= 2.5; t += 0.5) {
      const out = probabilities({ theta: t, se: 0.5 });
      expect(out.topnotcherProbability).toBeLessThanOrEqual(out.passProbability + 1e-9);
    }
  });
});

describe('rankWeakTopics', () => {
  it('puts the largest gaps first and caps at 5', () => {
    const topics = [
      { topic: 'A', theta: 0.6, se: 0.3 },
      { topic: 'B', theta: -1.0, se: 0.3 },
      { topic: 'C', theta: 0.0, se: 0.3 },
      { topic: 'D', theta: -2.0, se: 0.3 },
      { topic: 'E', theta: 1.2, se: 0.3 },
      { topic: 'F', theta: -0.5, se: 0.3 },
    ];
    const ranked = rankWeakTopics(topics);
    expect(ranked[0].topic).toBe('D');
    expect(ranked.length).toBeLessThanOrEqual(5);
  });
});

describe('buildPrescription', () => {
  it('chooses READ for very wide gaps and SRS_REVIEW for narrow ones', () => {
    const weak = [
      { topic: 'far', theta: -1.5, se: 0.3, gapToTarget: 2.0 },
      { topic: 'mid', theta: 0.0, se: 0.3, gapToTarget: 0.5 },
      { topic: 'near', theta: 0.4, se: 0.3, gapToTarget: 0.1 },
    ];
    const actions = buildPrescription(weak);
    expect(actions[0].type).toBe('READ');
    expect(actions[1].type).toBe('DRILL');
    expect(actions[2].type).toBe('SRS_REVIEW');
  });
});

describe('buildForecast end-to-end', () => {
  it('produces a complete snapshot payload', () => {
    const out = buildForecast({
      ability: { theta: 0.8, se: 0.4 },
      topicAbilities: [
        { topic: 'AC Circuits', theta: -0.2, se: 0.4 },
        { topic: 'Symmetrical Components', theta: 0.6, se: 0.4 },
      ],
    });
    expect(out).toHaveProperty('passProbability');
    expect(out).toHaveProperty('topnotcherProbability');
    expect(out).toHaveProperty('expectedRank');
    expect(Array.isArray(out.weakTopics)).toBe(true);
    expect(Array.isArray(out.recommendedActions)).toBe(true);
    expect(out.modelVersion).toBe('v1');
  });
});
