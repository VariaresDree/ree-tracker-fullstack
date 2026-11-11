import { describe, it, expect } from 'vitest';

// Questions are saved with one spelling of the subject. 584 said "Math", from
// paths that stored it as given (migration 20261114000000 fixes those rows).
const { buildQuestionCreateData } = require('../src/services/reviewService');

describe('a question is saved with the canonical subject', () => {
    it.each([['Math', 'Mathematics'], ['mathematics', 'Mathematics'], ['EE', 'EE'], ['ESAS', 'ESAS']])('%s → %s', (given, saved) => {
        expect(buildQuestionCreateData({ subject: given, text: 'q', options: ['a', 'b'], answer: 'a' }, null).subject).toBe(saved);
    });

    it('a missing subject still saves as Unknown', () => {
        expect(buildQuestionCreateData({ text: 'q', options: [], answer: '' }, null).subject).toBe('Unknown');
    });
});
