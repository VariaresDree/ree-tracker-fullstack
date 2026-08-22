// Contract test for @ree/shared, from the CLIENT side.
//
// The audit that produced this package found the same business rule implemented
// in up to eight places with nothing keeping the copies honest — no workspace
// link, no shared module, no CI comparison, and two separate test files per pair
// that could pass independently while the implementations drifted. They had
// already drifted: the server stored CONDITIONAL PASS at >= 50 while the client
// rendered FAILED below 60, so a 55% board sim showed one verdict on the results
// screen and a different one in exam history.
//
// This file and ree-tracker-backend/tests/sharedContract.test.js assert the SAME
// facts against the SAME module from both packages. If the linkage ever breaks —
// a bad Vite pre-bundle, a stale copy reintroduced, a resolution failure that
// only shows up in a production build — one of them goes red.
import { describe, it, expect } from 'vitest';
import {
    deriveVerdict,
    isPassingVerdict,
    GENERAL_AVERAGE,
    SUBJECT_FLOOR,
    normalizeSubject,
    toDisplaySubject,
    DEFAULT_SYLLABUS_WEIGHTS,
    weightedAverage,
    todayManila,
    manilaDateOf,
    withMathDelimiters,
    stripChoicePrefix,
    sanitizeGeneratedQuestion,
    WEAK_TOPIC_ACCURACY,
    TIME_SINK_MS,
    storableTimeMs,
} from '@ree/shared';

describe('@ree/shared resolves from the client bundle', () => {
    it('exports live functions, not undefined', () => {
        // Guards the specific failure mode of a CommonJS package in a linked
        // workspace: Vite treats it as source, leaves `module.exports`
        // unhandled, and every named import silently becomes undefined.
        expect(typeof deriveVerdict).toBe('function');
        expect(typeof normalizeSubject).toBe('function');
        expect(typeof todayManila).toBe('function');
        expect(typeof withMathDelimiters).toBe('function');
    });
});

describe('verdict — the PRC rule', () => {
    it('needs BOTH the general average and every rated subject above the floor', () => {
        expect(GENERAL_AVERAGE).toBe(70);
        expect(SUBJECT_FLOOR).toBe(50);
        expect(deriveVerdict(72, { Mathematics: 65, ESAS: 80, EE: 80 })).toBe('PASSED');
    });

    it('is CONDITIONAL PASS when the average is met but a subject falls through the floor', () => {
        expect(deriveVerdict(72, { Mathematics: 45, ESAS: 80, EE: 80 })).toBe('CONDITIONAL PASS');
    });

    it('is FAILED below the general average regardless of subject spread', () => {
        expect(deriveVerdict(69, { Mathematics: 90, ESAS: 90, EE: 60 })).toBe('FAILED');
    });

    it('resolves the 55% case that used to disagree between screens', () => {
        // Previously: results screen FAILED (client >= 60 band), exam history
        // CONDITIONAL PASS (server >= 50 band), counted as a pass in the KPI.
        // There is now exactly one answer.
        expect(deriveVerdict(55, { Mathematics: 55, ESAS: 55, EE: 55 })).toBe('FAILED');
    });

    it('does not rate a subject the exam never asked about', () => {
        // A Math-only practice set must not fail you on an unrated ESAS.
        expect(deriveVerdict(75, { Mathematics: 75, ESAS: null, EE: undefined })).toBe('PASSED');
    });

    it('treats both PASSED and CONDITIONAL PASS as passing for KPIs', () => {
        expect(isPassingVerdict('PASSED')).toBe(true);
        expect(isPassingVerdict('CONDITIONAL PASS')).toBe(true);
        expect(isPassingVerdict('FAILED')).toBe(false);
    });
});

describe('subject naming', () => {
    it('canonicalises every stored spelling to one form', () => {
        for (const v of ['Math', 'Mathematics', 'mathematics']) {
            expect(normalizeSubject(v)).toBe('Mathematics');
        }
        expect(normalizeSubject('Engineering Sciences and Allied Subjects')).toBe('ESAS');
        expect(normalizeSubject('Electrical Engineering')).toBe('EE');
    });

    it('keeps display shortening a separate, named step', () => {
        // Eight files used to inline `s === 'Mathematics' ? 'Math' : s`, two of
        // them normalising in the opposite direction from the canonical module.
        expect(toDisplaySubject('Mathematics')).toBe('Math');
        expect(toDisplaySubject('Math')).toBe('Math');
        expect(normalizeSubject(toDisplaySubject('Mathematics'))).toBe('Mathematics');
    });

    it('falls back to General for falsy input', () => {
        expect(normalizeSubject('')).toBe('General');
        expect(normalizeSubject(null)).toBe('General');
    });
});

describe('syllabus weights', () => {
    it('holds the PRC blend and sums to 1', () => {
        expect(DEFAULT_SYLLABUS_WEIGHTS).toEqual({ Mathematics: 0.25, ESAS: 0.30, EE: 0.45 });
        const sum = Object.values(DEFAULT_SYLLABUS_WEIGHTS).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 10);
    });

    it('renormalises when a subject is absent instead of scoring it zero', () => {
        // A Math-only set is 80%, not 80 * 0.25.
        expect(weightedAverage({ Mathematics: 80 })).toBe(80);
    });

    it('accepts the legacy UPPERCASE key casing', () => {
        // tosWeights.js used MATHEMATICS/ESAS/EE, incompatible with the other
        // three copies.
        expect(weightedAverage({ Mathematics: 100, ESAS: 0, EE: 0 }, { MATHEMATICS: 0.25, ESAS: 0.30, EE: 0.45 })).toBe(25);
    });
});

describe('Manila day bucketing', () => {
    it('produces an ISO-shaped date', () => {
        expect(todayManila()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('buckets a UTC instant onto the Manila calendar day', () => {
        // 2026-08-08 17:00 UTC is 2026-08-09 01:00 in Manila (UTC+8).
        expect(manilaDateOf(new Date('2026-08-08T17:00:00Z'))).toBe('2026-08-09');
    });
});

describe('text normalisation', () => {
    it('wraps bare LaTeX but leaves prose and existing delimiters alone', () => {
        expect(withMathDelimiters('P_{out}')).toBe('$P_{out}$');
        expect(withMathDelimiters('$V = IR$')).toBe('$V = IR$');
        expect(withMathDelimiters('twelve volts')).toBe('twelve volts');
    });

    it('strips a single baked-in choice label without emptying the value', () => {
        expect(stripChoicePrefix('A. 10 ohms')).toBe('10 ohms');
        expect(stripChoicePrefix('(c) 42')).toBe('42');
        expect(stripChoicePrefix('A - B path')).toBe('A - B path'); // hyphen is not a separator
    });

    it('has the null guard the backend copy had dropped', () => {
        // The backend twin ran inside a Zod .transform(), outside any route
        // try/catch, so a null there surfaced as an opaque 500 instead of a 400.
        expect(() => sanitizeGeneratedQuestion(null)).not.toThrow();
        expect(sanitizeGeneratedQuestion(null)).toBeNull();
    });
});

describe('thresholds', () => {
    it('names the constants that used to be bare literals', () => {
        expect(WEAK_TOPIC_ACCURACY).toBe(0.6);
        expect(TIME_SINK_MS).toBe(180_000);
    });

    it('clamps storage timing to something int4 can hold', () => {
        expect(storableTimeMs(5e9)).toBe(3_600_000);
        expect(storableTimeMs(1e21)).toBe(3_600_000);
        expect(storableTimeMs(4200)).toBe(4200);
    });
});
