import { describe, it, expect } from 'vitest';
const { calculateUpdatedTheta } = require('../src/utils/irtMath');

describe('calculateUpdatedTheta (Rasch 1PL IRT)', () => {
    it('returns current theta when no attempts provided', () => {
        expect(calculateUpdatedTheta(1.5, [])).toBe(1.5);
        expect(calculateUpdatedTheta(0, null)).toBe(0);
        expect(calculateUpdatedTheta(undefined, undefined)).toBe(0);
    });

    it('increases theta when answering correctly', () => {
        const attempts = [{ isCorrect: true, questionDifficulty: 0.0 }];
        const result = calculateUpdatedTheta(0.0, attempts);
        expect(result).toBeGreaterThan(0.0);
    });

    it('decreases theta when answering incorrectly', () => {
        const attempts = [{ isCorrect: false, questionDifficulty: 0.0 }];
        const result = calculateUpdatedTheta(0.0, attempts);
        expect(result).toBeLessThan(0.0);
    });

    it('increases more when getting a hard question right', () => {
        const hardCorrect = [{ isCorrect: true, questionDifficulty: 2.0 }];
        const easyCorrect = [{ isCorrect: true, questionDifficulty: -2.0 }];
        const hardDelta = calculateUpdatedTheta(0.0, hardCorrect);
        const easyDelta = calculateUpdatedTheta(0.0, easyCorrect);
        expect(hardDelta).toBeGreaterThan(easyDelta);
    });

    it('decreases more when getting an easy question wrong', () => {
        const easyWrong = [{ isCorrect: false, questionDifficulty: -2.0 }];
        const hardWrong = [{ isCorrect: false, questionDifficulty: 2.0 }];
        const easyDelta = calculateUpdatedTheta(0.0, easyWrong);
        const hardDelta = calculateUpdatedTheta(0.0, hardWrong);
        expect(easyDelta).toBeLessThan(hardDelta);
    });

    it('caps theta at -3.0 minimum', () => {
        const manyWrong = Array(50).fill({ isCorrect: false, questionDifficulty: -3.0 });
        const result = calculateUpdatedTheta(-2.5, manyWrong);
        expect(result).toBeGreaterThanOrEqual(-3.0);
    });

    it('caps theta at 3.0 maximum', () => {
        const manyCorrect = Array(50).fill({ isCorrect: true, questionDifficulty: 3.0 });
        const result = calculateUpdatedTheta(2.5, manyCorrect);
        expect(result).toBeLessThanOrEqual(3.0);
    });

    it('handles mixed results correctly', () => {
        const attempts = [
            { isCorrect: true, questionDifficulty: 0.5 },
            { isCorrect: false, questionDifficulty: -0.5 },
            { isCorrect: true, questionDifficulty: 1.0 },
            { isCorrect: true, questionDifficulty: 0.0 }
        ];
        const result = calculateUpdatedTheta(0.0, attempts);
        expect(result).toBeGreaterThan(-3.0);
        expect(result).toBeLessThan(3.0);
    });

    it('returns a number with 3 decimal places', () => {
        const attempts = [{ isCorrect: true, questionDifficulty: 0.5 }];
        const result = calculateUpdatedTheta(0.0, attempts);
        const decimals = result.toString().split('.')[1]?.length || 0;
        expect(decimals).toBeLessThanOrEqual(3);
    });

    it('defaults missing difficulty to 0.0', () => {
        const attempts = [{ isCorrect: true }];
        const result = calculateUpdatedTheta(0.0, attempts);
        expect(result).toBeGreaterThan(0.0);
    });
});

describe('calculateUpdatedTheta — non-finite hardening', () => {
    it('returns a finite theta for an extreme (overflow-prone) difficulty', () => {
        // |theta - difficulty| > ~709 overflows the naive logistic to NaN.
        const out = calculateUpdatedTheta(0, [{ isCorrect: true, questionDifficulty: -800 }]);
        expect(Number.isFinite(out)).toBe(true);
    });

    it('sanitizes a NaN currentTheta to a finite value', () => {
        const out = calculateUpdatedTheta(NaN, [{ isCorrect: true, questionDifficulty: 0 }]);
        expect(Number.isFinite(out)).toBe(true);
    });

    it('ignores a non-finite questionDifficulty', () => {
        const out = calculateUpdatedTheta(0.5, [{ isCorrect: false, questionDifficulty: Infinity }]);
        expect(Number.isFinite(out)).toBe(true);
    });
});
