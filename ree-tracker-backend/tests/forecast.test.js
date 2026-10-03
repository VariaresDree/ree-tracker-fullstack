import { describe, it, expect } from 'vitest';
const {
  MODEL_VERSION,
  probabilities,
  buildTccGrid,
  tccAt,
  simulateBoard,
  bindingSubject,
  rankWeakTopics,
  buildPrescription,
  buildForecast,
  _internals,
} = require('../src/engine/forecast');

// v2: the pass probability models the PRC rule itself — a 70% general WEIGHTED
// average (Math 25 / ESAS 30 / EE 45) AND no subject below 50% — instead of
// P(global θ > 0). Each subject's ability is mapped to an expected board score
// through the test characteristic curve of that subject's bank, the sitting is
// simulated with ability uncertainty and item sampling noise, and every draw
// is graded by the same gradeBoardExam the results screen uses.

const AVG_ITEM = { a: 1, b: 0, c: 0.2 };
const avgForm = buildTccGrid([AVG_ITEM]);
const subjects = (thetas, se = 0.35) => Object.fromEntries(
  Object.entries(thetas).map(([s, theta]) => [s, { theta, se, tcc: avgForm }]),
);

describe('normCdf (kept for the topnotcher estimate)', () => {
  it('is 0.5 at the mean and hits the ±1σ marks', () => {
    expect(_internals.normCdf(0)).toBeCloseTo(0.5, 4);
    expect(_internals.normCdf(1)).toBeCloseTo(0.8413, 3);
  });
});

describe('probabilities — topnotcher estimate, unchanged', () => {
  it('stays in [0, 1] and rises with θ', () => {
    const low = probabilities({ theta: -1, se: 0.4 });
    const high = probabilities({ theta: 1, se: 0.4 });
    expect(high.topnotcherProbability).toBeGreaterThan(low.topnotcherProbability);
    expect(high.topnotcherProbability).toBeLessThanOrEqual(1);
  });
});

describe('test characteristic curve', () => {
  it('an average 3PL item is 60% at θ = 0 (c + (1 − c)/2)', () => {
    expect(tccAt(avgForm, 0)).toBeCloseTo(0.6, 6);
  });

  it('averages the items of the form and interpolates between grid points', () => {
    const form = buildTccGrid([{ a: 1, b: -1, c: 0.2 }, { a: 1, b: 1, c: 0.2 }]);
    const sym = tccAt(form, 0);
    expect(sym).toBeCloseTo(0.6, 6); // symmetric pair averages to the midpoint
    expect(tccAt(form, 0.025)).toBeGreaterThan(sym);
    expect(tccAt(form, 0.025)).toBeLessThan(tccAt(form, 0.05));
  });

  it('falls back to an average item when a subject has no bank', () => {
    expect(tccAt(buildTccGrid([]), 0)).toBeCloseTo(0.6, 6);
  });
});

describe('simulateBoard — the PRC rule, by Monte Carlo', () => {
  it('is deterministic for a seed', () => {
    const input = { subjects: subjects({ Mathematics: 0.3, ESAS: 0.3, EE: 0.3 }), seed: 7 };
    expect(simulateBoard(input)).toEqual(simulateBoard(input));
  });

  it('a uniformly strong candidate (θ = 2, P ≈ 0.974) essentially always passes', () => {
    const out = simulateBoard({ subjects: subjects({ Mathematics: 2, ESAS: 2, EE: 2 }) });
    expect(out.passProbability).toBeGreaterThan(0.99);
    expect(out.subjects.EE.expected).toBeCloseTo(97.4, 0);
  });

  it('a weak candidate (θ = −1.5, P ≈ 0.258) essentially never does', () => {
    const out = simulateBoard({ subjects: subjects({ Mathematics: -1.5, ESAS: -1.5, EE: -1.5 }) });
    expect(out.passProbability).toBeLessThan(0.01);
  });

  it('the SUBJECT FLOOR binds: a strong average with Mathematics at ~23% is conditional, not a pass', () => {
    // GWA ≈ .25·22.6 + .30·97.4 + .45·97.4 ≈ 78.7 — the average is met, but
    // Mathematics sits far under 50%. P(θ → global) said "pass".
    const out = simulateBoard({ subjects: subjects({ Mathematics: -2, ESAS: 2, EE: 2 }) });
    expect(out.passProbability).toBeLessThan(0.01);
    expect(out.conditionalProbability).toBeGreaterThan(0.95);
    expect(out.projectedGWA.mean).toBeGreaterThan(75);
    expect(out.subjects.Mathematics.p50).toBeLessThan(0.01);
  });

  it('a candidate expected at exactly 70% everywhere is close to a coin flip', () => {
    // .2 + .8·σ(1.7θ) = .70  →  θ = ln(.625/.375)/1.7 = 0.30048
    const out = simulateBoard({ subjects: subjects({ Mathematics: 0.30048, ESAS: 0.30048, EE: 0.30048 }, 0.05), draws: 4000 });
    expect(out.passProbability).toBeGreaterThan(0.4);
    expect(out.passProbability).toBeLessThan(0.65);
  });

  it('reports an 80% interval around the projected GWA', () => {
    const out = simulateBoard({ subjects: subjects({ Mathematics: 0, ESAS: 0, EE: 0 }) });
    expect(out.projectedGWA.low).toBeLessThan(out.projectedGWA.mean);
    expect(out.projectedGWA.high).toBeGreaterThan(out.projectedGWA.mean);
  });
});

describe('bindingSubject — where a gain moves the pass probability most', () => {
  it('names the subject holding the candidate under the floor', () => {
    expect(bindingSubject({ subjects: subjects({ Mathematics: -0.7, ESAS: 1, EE: 1 }) })).toBe('Mathematics');
  });

  it('prefers the heaviest subject when all are level', () => {
    expect(bindingSubject({ subjects: subjects({ Mathematics: 0.2, ESAS: 0.2, EE: 0.2 }) })).toBe('EE');
  });
});

describe('rankWeakTopics — decayed mastery × syllabus weight', () => {
  const t = (topic, subject, masteryEffective, extra = {}) => ({ topic, subject, masteryEffective, masteryN: 10, attempts: 20, confidentMisses: 0, medianMs: 60_000, ...extra });

  it('weights a gap by the subject it costs: EE at 40% outranks Math at 30%', () => {
    // (1 − .40)·.45 = .27  vs  (1 − .30)·.25 = .175
    const ranked = rankWeakTopics([t('Calculus', 'Mathematics', 0.3), t('Machines', 'EE', 0.4)]);
    expect(ranked.map((r) => r.topic)).toEqual(['Machines', 'Calculus']);
  });

  it('boosts a topic the learner is CONFIDENTLY getting wrong, and flags it', () => {
    const ranked = rankWeakTopics([
      t('Machines', 'EE', 0.5),
      t('Protection', 'EE', 0.55, { confidentMisses: 6, attempts: 12 }),
    ]);
    expect(ranked[0]).toMatchObject({ topic: 'Protection', blindSpot: true });
  });

  it('flags a time sink by median answer time', () => {
    const [r] = rankWeakTopics([t('Power Systems', 'EE', 0.5, { medianMs: 240_000 })]);
    expect(r.slow).toBe(true);
  });

  it('caps at five', () => {
    const many = Array.from({ length: 9 }, (_, i) => t(`T${i}`, 'EE', 0.1 * i));
    expect(rankWeakTopics(many)).toHaveLength(5);
  });
});

describe('buildPrescription — three concrete next steps', () => {
  const weak = [
    { topic: 'Protection', subject: 'EE', topicId: 'tp', masteryEffective: 0.4, blindSpot: true, confidentMisses: 6, slow: false, masteryN: 12 },
    { topic: 'Calculus', subject: 'Mathematics', topicId: 'tc', masteryEffective: 0.35, blindSpot: false, confidentMisses: 0, slow: true, masteryN: 9, medianMs: 240_000 },
  ];

  it('blind spot first, then a targeted drill, then the review queue', () => {
    const actions = buildPrescription({ weakTopics: weak, srsDue: 14 });
    expect(actions.map((a) => a.type)).toEqual(['BLIND_SPOT', 'DRILL', 'SRS_DUE']);
    expect(actions[0].payload).toMatchObject({ topic: 'Protection', subject: 'EE', topicId: 'tp' });
    expect(actions[1].payload).toMatchObject({ topic: 'Calculus', count: 10 });
    expect(actions[2].payload).toMatchObject({ count: 14 });
  });

  it('a slow topic earns formula cards when the queue is empty', () => {
    const actions = buildPrescription({ weakTopics: weak, srsDue: 0 });
    expect(actions.map((a) => a.type)).toContain('FORMULA_CARDS');
  });

  it('returns nothing to do for a learner with no history', () => {
    expect(buildPrescription({ weakTopics: [], srsDue: 0 })).toEqual([]);
  });

  it('picks the article by the subject name\'s first letter ("an EE topic", "a Mathematics topic")', () => {
    const drillReason = (subject) => buildPrescription({
      weakTopics: [{ topic: 'X', subject, topicId: 'tx', masteryEffective: 0.4, blindSpot: false, confidentMisses: 0, slow: false, masteryN: 10 }],
    }).find((a) => a.type === 'DRILL').reason;
    expect(drillReason('EE')).toBe('Mastery 40% in an EE topic — the costliest gap on the board.');
    expect(drillReason('ESAS')).toMatch(/ in an ESAS topic /);
    expect(drillReason('Mathematics')).toMatch(/ in a Mathematics topic /);
  });
});

describe('buildForecast — end to end', () => {
  const tcc = { Mathematics: avgForm, ESAS: avgForm, EE: avgForm };

  it('produces a complete, finite v2 payload', () => {
    const out = buildForecast({
      ability: { theta: 0.4, se: 0.4 },
      subjectAbilities: { Mathematics: { theta: 0.2, se: 0.4 }, ESAS: { theta: 0.5, se: 0.4 }, EE: { theta: 0.4, se: 0.4 } },
      tccBySubject: tcc,
      topicSignals: [],
      srsDue: 0,
    });
    expect(out.modelVersion).toBe(MODEL_VERSION);
    expect(Number.isFinite(out.passProbability)).toBe(true);
    expect(Number.isFinite(out.expectedRank)).toBe(true);
    expect(out.subjectForecasts.subjects.EE).toHaveProperty('expected');
    expect(out.subjectForecasts.projectedGWA).toHaveProperty('mean');
    expect(['Mathematics', 'ESAS', 'EE']).toContain(out.subjectForecasts.bindingSubject);
  });

  it('a subject with no ability row falls back to the global θ with a wide prior', () => {
    const out = buildForecast({ ability: { theta: 0.3, se: 0.35 }, subjectAbilities: {}, tccBySubject: tcc, topicSignals: [], srsDue: 0 });
    expect(out.subjectForecasts.subjects.Mathematics.low).toBeLessThan(out.subjectForecasts.subjects.Mathematics.expected - 5);
  });

  it('survives a non-finite ability', () => {
    const out = buildForecast({ ability: { theta: NaN, se: undefined }, subjectAbilities: {}, tccBySubject: tcc, topicSignals: [], srsDue: 0 });
    expect(Number.isFinite(out.passProbability)).toBe(true);
    expect(Number.isFinite(out.topnotcherProbability)).toBe(true);
  });
});
