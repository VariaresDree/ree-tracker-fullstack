import { describe, it, expect } from 'vitest';

// Contract test for @ree/shared, from the SERVER side.
//
// The twin of ree-tracker/src/test/sharedContract.test.js. Both files assert the
// same facts about the same module, reached through different resolution paths:
// the client via Vite's pre-bundle of a linked CommonJS workspace package, the
// server via a plain require(). If the two packages ever stop seeing the same
// implementation — a stale copy reintroduced, a broken symlink, a bundler
// regression — one of them goes red.
//
// This is the check that did not exist when the verdict thresholds drifted:
// examRoutes stored CONDITIONAL PASS at >= 50 while the client rendered FAILED
// below 60, and every score in [50, 60) showed one result on the results screen
// and a different one in exam history. Two separate test files per util pair
// could both pass while the implementations disagreed.
const shared = require('@ree/shared');

const {
    deriveVerdict,
    isPassingVerdict,
    GENERAL_AVERAGE,
    SUBJECT_FLOOR,
    normalizeSubject,
    toDisplaySubject,
    getSubjectFilter,
    DEFAULT_SYLLABUS_WEIGHTS,
    weightedAverage,
    todayManila,
    manilaDateOf,
    withMathDelimiters,
    stripChoicePrefix,
    sanitizeQuestionShape,
    WEAK_TOPIC_ACCURACY,
    TIME_SINK_MS,
    TELEMETRY_BATCH_MAX,
    PRC_EXAM_FORMAT,
    prcSectionSeconds,
    gradeBoardExam,
    apportionItems,
    storableTimeMs,
} = shared;

describe('@ree/shared resolves from the server', () => {
    it('exports live functions, not undefined', () => {
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

    it('is FAILED below the general average', () => {
        expect(deriveVerdict(69, { Mathematics: 90, ESAS: 90, EE: 60 })).toBe('FAILED');
    });

    it('resolves the 55% case that used to disagree between screens', () => {
        expect(deriveVerdict(55, { Mathematics: 55, ESAS: 55, EE: 55 })).toBe('FAILED');
    });

    it('does not rate a subject the exam never asked about', () => {
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
        expect(toDisplaySubject('Mathematics')).toBe('Math');
        expect(normalizeSubject(toDisplaySubject('Mathematics'))).toBe('Mathematics');
    });

    it('builds a Prisma filter covering every stored spelling', () => {
        expect(getSubjectFilter('Mathematics')).toEqual({ in: ['Math', 'Mathematics'] });
        expect(getSubjectFilter('EE')).toEqual({
            in: ['EE', 'Electrical Engineering', 'Electrical Engineering Professional Subjects'],
        });
        expect(getSubjectFilter('All')).toBeUndefined();
        expect(getSubjectFilter('')).toBeUndefined();
    });
});

describe('syllabus weights', () => {
    it('holds the PRC blend and sums to 1', () => {
        expect(DEFAULT_SYLLABUS_WEIGHTS).toEqual({ Mathematics: 0.25, ESAS: 0.30, EE: 0.45 });
        const sum = Object.values(DEFAULT_SYLLABUS_WEIGHTS).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1, 10);
    });

    it('renormalises when a subject is absent instead of scoring it zero', () => {
        expect(weightedAverage({ Mathematics: 80 })).toBe(80);
    });
});

describe('Manila day bucketing', () => {
    it('produces an ISO-shaped date', () => {
        expect(todayManila()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('buckets a UTC instant onto the Manila calendar day', () => {
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
        expect(stripChoicePrefix('A - B path')).toBe('A - B path');
    });

    it('has the null guard this side used to be missing', () => {
        // sanitizeQuestionShape runs as a Zod .transform(), i.e. inside
        // validate() and outside any route try/catch — a throw there became an
        // opaque 500 instead of a 400.
        expect(() => sanitizeQuestionShape(null)).not.toThrow();
        expect(sanitizeQuestionShape(null)).toBeNull();
    });
});

describe('thresholds', () => {
    it('names the constants that used to be bare literals', () => {
        expect(WEAK_TOPIC_ACCURACY).toBe(0.6);
        expect(TIME_SINK_MS).toBe(180_000);
        expect(TELEMETRY_BATCH_MAX).toBe(500);
    });

    it('the telemetry schema rejects exactly what the client will never send', () => {
        // The client chunks its queue at TELEMETRY_BATCH_MAX. It used to send
        // the WHOLE queue (cap 5000), so any queue over 500 drew a 400 that was
        // classified permanent and dead-lettered every queued attempt.
        const { telemetryBulkSchema } = require('../src/schemas/telemetrySchemas');
        const attempt = { questionId: 'q1', isCorrect: true };
        const at = (n) => ({ sessionId: 's', mode: 'ACTIVE_REVIEW', attempts: Array.from({ length: n }, () => attempt) });
        expect(telemetryBulkSchema.safeParse(at(TELEMETRY_BATCH_MAX)).success).toBe(true);
        expect(telemetryBulkSchema.safeParse(at(TELEMETRY_BATCH_MAX + 1)).success).toBe(false);
    });

    it('clamps storage timing to something int4 can hold', () => {
        expect(storableTimeMs(5e9)).toBe(3_600_000);
        expect(storableTimeMs(1e21)).toBe(3_600_000);
    });
});

describe('PRC board exam (format + grading)', () => {
    it('holds the PRC REE format: 100 items per subject, Math 5h / ESAS 4h / EE 6h', () => {
        expect(PRC_EXAM_FORMAT).toEqual({
            Mathematics: { items: 100, minutes: 300 },
            ESAS: { items: 100, minutes: 240 },
            EE: { items: 100, minutes: 360 },
        });
        expect(prcSectionSeconds('Math')).toBe(5 * 3600);
        expect(prcSectionSeconds('Electrical Engineering')).toBe(6 * 3600);
        expect(prcSectionSeconds('nonsense')).toBeNull();
    });

    it('grades on the WEIGHTED general average, not the raw percentage', () => {
        // Raw mean of 90/60/64 is 71.3 (would pass); weighted by 25/30/45 it is
        // 69.3 — the PRC general weighted average, which fails.
        const { generalAverage, verdict } = gradeBoardExam({ Mathematics: 90, ESAS: 60, EE: 64 });
        expect(generalAverage).toBe(69.3);
        expect(verdict).toBe('FAILED');
    });

    it('applies the 50% subject floor on top of the weighted average', () => {
        const { generalAverage, verdict } = gradeBoardExam({ Mathematics: 40, ESAS: 80, EE: 80 });
        expect(generalAverage).toBe(70);
        expect(verdict).toBe('CONDITIONAL PASS');
    });

    it('leaves subjects the exam never asked about unrated', () => {
        expect(gradeBoardExam({ Math: 75, ESAS: null, EE: undefined })).toEqual({ generalAverage: 75, verdict: 'PASSED' });
    });

    it('an exam with no rated subject is a 0, not NaN', () => {
        expect(gradeBoardExam({})).toEqual({ generalAverage: 0, verdict: 'FAILED' });
    });
});

describe('apportionItems', () => {
    it('splits a full blend exactly 25/30/45', () => {
        expect(apportionItems(100)).toEqual({ Mathematics: 25, ESAS: 30, EE: 45 });
    });

    it('always sums to the requested total (10 used to become 11)', () => {
        for (const n of [1, 7, 10, 20, 33, 50, 99]) {
            const out = apportionItems(n);
            expect(Object.values(out).reduce((a, b) => a + b, 0)).toBe(n);
        }
        // 2.5 / 3.0 / 4.5 — the two .5 remainders tie; the heavier EE wins it.
        expect(apportionItems(10)).toEqual({ Mathematics: 2, ESAS: 3, EE: 5 });
    });
});
