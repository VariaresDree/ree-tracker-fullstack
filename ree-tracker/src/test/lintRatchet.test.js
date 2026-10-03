// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { countByRule, compareCounts } from '../../scripts/lintRatchet.mjs';

describe('lint ratchet', () => {
    it('counts errors (not warnings) per rule', () => {
        const results = [
            { messages: [{ severity: 2, ruleId: 'no-unused-vars' }, { severity: 1, ruleId: 'react-hooks/exhaustive-deps' }] },
            { messages: [{ severity: 2, ruleId: 'no-unused-vars' }, { severity: 2, ruleId: null }] },
        ];
        expect(countByRule(results)).toEqual({ 'no-unused-vars': 2, '(parse error)': 1 });
    });

    it('a rule above its baseline is a regression, below is an improvement, new rules start at zero', () => {
        const { regressions, improvements } = compareCounts(
            { 'no-unused-vars': 104, 'no-empty': 5, 'react-hooks/refs': 1 },
            { 'no-unused-vars': 103, 'no-empty': 7 },
        );
        expect(regressions).toEqual([
            { rule: 'no-unused-vars', now: 104, was: 103 },
            { rule: 'react-hooks/refs', now: 1, was: 0 },
        ]);
        expect(improvements).toEqual([{ rule: 'no-empty', now: 5, was: 7 }]);
    });

    it('holding the line exactly passes', () => {
        expect(compareCounts({ a: 3 }, { a: 3 })).toEqual({ regressions: [], improvements: [] });
    });
});
