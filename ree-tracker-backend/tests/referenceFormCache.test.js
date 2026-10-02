import { describe, it, expect } from 'vitest';
const { buildForms } = require('../src/services/referenceFormCache');
const { tccAt } = require('../src/engine/forecast');

describe('referenceFormCache.buildForms', () => {
    it('builds one curve per board subject from the sampled bank, merging spellings', () => {
        const forms = buildForms([
            { subject: 'Math', irtA: 1, irtB: 1, irtC: 0.2, difficulty: null },
            { subject: 'Mathematics', irtA: 1, irtB: 1, irtC: 0.2, difficulty: null },
            { subject: 'EE', irtA: null, irtB: null, irtC: null, difficulty: 3 }, // author "Complex" → b = +1
        ]);
        expect(Object.keys(forms)).toEqual(['Mathematics', 'ESAS', 'EE']);
        // b = +1 items: P(θ = 1) = c + (1 − c)/2 = 0.6
        expect(tccAt(forms.Mathematics, 1)).toBeCloseTo(0.6, 6);
        expect(tccAt(forms.EE, 1)).toBeCloseTo(0.6, 6);
        // ESAS had no items: the average-item curve.
        expect(tccAt(forms.ESAS, 0)).toBeCloseTo(0.6, 6);
    });
});
