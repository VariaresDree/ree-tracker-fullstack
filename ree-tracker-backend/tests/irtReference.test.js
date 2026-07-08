import { describe, it, expect } from 'vitest';
const { SCALE, p3pl, fisherInfo, updateTheta, _internals } = require('../src/engine/irt');

// Hand-computed reference values — these verify the engine produces the numbers
// a psychometrics textbook would, not merely that it runs. 3PL model:
//   P(θ) = c + (1-c)·σ(1.7·a·(θ-b)),  σ(z) = 1/(1+e^-z),  1.7 = Birnbaum scaling.

describe('IRT reference — 3PL probability p3pl', () => {
  it('uses the Birnbaum scaling constant 1.7 and σ(0)=0.5', () => {
    expect(SCALE).toBe(1.7);
    expect(_internals.sigmoid(0)).toBe(0.5);
  });

  it('P(θ=b) = (1+c)/2 exactly (the inflection point)', () => {
    expect(p3pl(0.5, { a: 1.3, b: 0.5, c: 0.2 })).toBeCloseTo(0.6, 10);   // (1+0.2)/2
    expect(p3pl(-1, { a: 2, b: -1, c: 0.25 })).toBeCloseTo(0.625, 10);    // (1+0.25)/2
  });

  it('P(1 | a=1, b=0, c=0.2) = 0.876428', () => {
    // z = 1.7·1·(1-0) = 1.7 ; σ(1.7) = 0.8455347 ; 0.2 + 0.8·0.8455347 = 0.8764278
    expect(p3pl(1, { a: 1, b: 0, c: 0.2 })).toBeCloseTo(0.876428, 5);
  });

  it('P(-1 | a=1.2, b=0.5, c=0.25) = 0.283591', () => {
    // z = 1.7·1.2·(-1.5) = -3.06 ; σ(-3.06) = 0.0447876 ; 0.25 + 0.75·0.0447876 = 0.2835907
    expect(p3pl(-1, { a: 1.2, b: 0.5, c: 0.25 })).toBeCloseTo(0.283591, 5);
  });

  it('is bounded in (c, 1) and monotonic increasing in θ', () => {
    const item = { a: 1, b: 0, c: 0.2 };
    expect(p3pl(-8, item)).toBeGreaterThanOrEqual(0.2);
    expect(p3pl(8, item)).toBeLessThan(1);
    expect(p3pl(1, item)).toBeGreaterThan(p3pl(0, item));
  });
});

describe('IRT reference — Fisher information', () => {
  it('I(θ=b) = (1.7a)²(1-c) / [4(1+c)]', () => {
    // At θ=b: p=(1+c)/2, q=(1-c)/2, (p-c)=(1-c)/2 → I = (1.7a)²(1-c)/[4(1+c)].
    expect(fisherInfo(0, { a: 1, b: 0, c: 0.2 })).toBeCloseTo(0.481667, 5);   // 2.89·0.8/4.8
    expect(fisherInfo(2, { a: 1.5, b: 2, c: 0 })).toBeCloseTo(1.625625, 5);   // 6.5025/4
  });

  it('is 0 where the 3PL is degenerate (p ≤ c)', () => {
    expect(fisherInfo(-60, { a: 1, b: 0, c: 0.2 })).toBe(0);
  });
});

describe('IRT reference — updateTheta lands on the posterior mode', () => {
  it('satisfies the mode condition g(θ)=0 for one correct response', () => {
    // prior {θ0=0, se=1} → priorVar=1 ; one correct on {a:1,b:0,c:0}:
    //   g(θ) = -(θ-0)/1 + 1.7·(1 - σ(1.7θ))  must be ≈ 0 at the returned θ.
    const item = { a: 1, b: 0, c: 0 };
    const { theta, se } = updateTheta({ theta: 0, se: 1 }, [{ item, correct: true }]);
    const p = _internals.sigmoid(SCALE * theta);
    const g = -(theta - 0) / 1 + SCALE * (1 - p);
    expect(Math.abs(g)).toBeLessThan(1e-4);
    expect(theta).toBeGreaterThan(0);   // a correct answer raises ability
    expect(se).toBeLessThan(1);         // evidence tightens the posterior below the prior
  });

  it('is symmetric: one wrong response mirrors one correct (c=0)', () => {
    const item = { a: 1, b: 0, c: 0 };
    const up = updateTheta({ theta: 0, se: 1 }, [{ item, correct: true }]);
    const down = updateTheta({ theta: 0, se: 1 }, [{ item, correct: false }]);
    expect(up.theta).toBeCloseTo(-down.theta, 6);
    expect(up.se).toBeCloseTo(down.se, 6);
  });
});
