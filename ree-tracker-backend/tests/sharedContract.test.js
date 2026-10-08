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
    createBoardGrader,
    apportionItems,
    MASTERY_BANDS,
    masteryBand,
    storableTimeMs,
    fallbackDisplayName,
    effectiveStreak,
    longestStreak,
    dayBefore,
    lastStudyDay,
    nextManilaMidnight,
    DISPLAY_NAME_MAX,
    clampDisplayName,
    dayAfter,
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

describe('mastery bands', () => {
    it('holds the BKT mastery bands: Mastered 85 / Proficient 65 / Developing 45 / Novice', () => {
        expect(MASTERY_BANDS.map((b) => [b.key, b.min])).toEqual([
            ['mastered', 0.85], ['proficient', 0.65], ['developing', 0.45], ['novice', 0],
        ]);
    });

    it('bands a P(mastery) on the 0-1 scale, inclusive at each threshold', () => {
        expect(masteryBand(0.85).key).toBe('mastered');
        expect(masteryBand(0.8499).key).toBe('proficient');
        expect(masteryBand(0.45).key).toBe('developing');
        expect(masteryBand(0.1).key).toBe('novice');
        expect(masteryBand(null)).toBeNull();
    });
});

describe('createBoardGrader', () => {
    it('agrees with gradeBoardExam on every canonical input', () => {
        const fast = createBoardGrader();
        let seed = 1;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < 5000; i++) {
            const scores = {};
            for (const s of ['Mathematics', 'ESAS', 'EE']) {
                const r = rnd();
                scores[s] = r < 0.1 ? null : Math.round(rnd() * 100);
            }
            expect(fast(scores)).toEqual(gradeBoardExam(scores));
        }
    });
});

describe('fallbackDisplayName', () => {
    it('names an account with no name of its own Reviewer-xxxxxx', () => {
        expect(fallbackDisplayName('k3Jd8sP2abc')).toBe('Reviewer-k3Jd8s');
        expect(fallbackDisplayName('')).toBe('Reviewer');
        expect(fallbackDisplayName(undefined)).toBe('Reviewer');
    });
});

describe('effectiveStreak — the streak as it stands today', () => {
    const TODAY = '2026-10-08';

    it('keeps a streak whose last study day is today or yesterday', () => {
        expect(effectiveStreak(3, '2026-10-08', TODAY)).toBe(3);
        // Yesterday counts: the streak is still alive until today ends unanswered.
        expect(effectiveStreak(3, '2026-10-07', TODAY)).toBe(3);
    });

    it('reads 0 once a whole Manila day has passed with no answers', () => {
        // The live report: last answers 2026-10-05, viewed 2026-10-08.
        expect(effectiveStreak(3, '2026-10-05', TODAY)).toBe(0);
        expect(effectiveStreak(12, '2026-10-06', TODAY)).toBe(0);
    });

    it('steps back across month and year boundaries', () => {
        expect(dayBefore('2026-03-01')).toBe('2026-02-28');
        expect(dayBefore('2028-03-01')).toBe('2028-02-29');
        expect(dayBefore('2027-01-01')).toBe('2026-12-31');
        expect(effectiveStreak(4, '2026-12-31', '2027-01-01')).toBe(4);
        expect(effectiveStreak(4, '2026-12-30', '2027-01-01')).toBe(0);
    });

    it('never vouches for a streak without evidence of a study day', () => {
        expect(effectiveStreak(5, null, TODAY)).toBe(0);
        expect(effectiveStreak(5, undefined, TODAY)).toBe(0);
        expect(effectiveStreak(5, 'not-a-day', TODAY)).toBe(0);
        expect(effectiveStreak(0, TODAY, TODAY)).toBe(0);
        expect(effectiveStreak(null, TODAY, TODAY)).toBe(0);
        expect(effectiveStreak(-2, TODAY, TODAY)).toBe(0);
        expect(dayBefore('nope')).toBeNull();
    });

    it('defaults today to the Manila calendar day', () => {
        expect(effectiveStreak(2, todayManila())).toBe(2);
        expect(effectiveStreak(2, dayBefore(dayBefore(todayManila())))).toBe(0);
    });
});

describe('longestStreak — the best run in a study calendar', () => {
    it('counts consecutive answered days, across month ends', () => {
        expect(longestStreak({
            '2026-09-29': 4, '2026-09-30': 2, '2026-10-01': 1, // 3 in a row
            '2026-10-03': 5, '2026-10-04': 0, '2026-10-05': 2,  // a zero breaks the run
        })).toBe(3);
        expect(longestStreak({ '2026-12-31': 1, '2027-01-01': 1 })).toBe(2);
    });

    it('is 0 for an empty or missing calendar, and ignores malformed keys', () => {
        expect(longestStreak({})).toBe(0);
        expect(longestStreak(null)).toBe(0);
        expect(longestStreak({ total: 9, '2026-10-01': 1 })).toBe(1);
    });
});

describe('lastStudyDay — the newest day with answers', () => {
    it('takes the later of lastActiveDate and the newest non-empty calendar day', () => {
        expect(lastStudyDay({ lastActiveDate: '2026-10-05', activityCalendar: { '2026-10-07': 3 } })).toBe('2026-10-07');
        expect(lastStudyDay({ lastActiveDate: '2026-10-08', activityCalendar: { '2026-10-07': 3 } })).toBe('2026-10-08');
        expect(lastStudyDay({ activityCalendar: { '2026-10-07': 3, '2026-10-08': 0 } })).toBe('2026-10-07');
    });

    it('is null without evidence, and ignores malformed days', () => {
        expect(lastStudyDay(null)).toBeNull();
        expect(lastStudyDay({})).toBeNull();
        expect(lastStudyDay({ lastActiveDate: 'yesterday', activityCalendar: { total: 9 } })).toBeNull();
    });

    it('counts tomorrow (a clock a little ahead) but ignores days further ahead', () => {
        const stats = { activityCalendar: { '2026-10-07': 3, '2026-10-09': 1, '2027-03-01': 2 }, lastActiveDate: '2031-01-01' };
        expect(lastStudyDay(stats, '2026-10-08')).toBe('2026-10-09');
        expect(lastStudyDay(stats, '2026-10-07')).toBe('2026-10-07');
        expect(dayAfter('2026-12-31')).toBe('2027-01-01');
        expect(dayAfter('2028-02-28')).toBe('2028-02-29');
        expect(dayAfter('nope')).toBeNull();
    });
});

describe('clampDisplayName — a name as the server stores it', () => {
    it('trims, cuts to the limit and trims again, so it matches the stored name', () => {
        expect(clampDisplayName('  Engr. Cruz  ')).toBe('Engr. Cruz');
        // The 32nd character is a space: the cut must not keep it.
        expect(clampDisplayName('Engr. Juan Miguel dela Cruz San Jose Reyes')).toBe('Engr. Juan Miguel dela Cruz San');
        expect(clampDisplayName('x'.repeat(40))).toHaveLength(DISPLAY_NAME_MAX);
        expect(clampDisplayName(null)).toBe('');
    });

    it('never splits an emoji, and stays within the limit in UTF-16 units', () => {
        const name = 'a'.repeat(31) + '\u{1F50C}';
        const clamped = clampDisplayName(name);
        expect(clamped).toBe('a'.repeat(31));
        expect(clampDisplayName('\u{26A1}'.repeat(40)).length).toBeLessThanOrEqual(DISPLAY_NAME_MAX);
    });
});

describe('nextManilaMidnight', () => {
    it('is the next 00:00 in Manila (16:00 UTC), never the current instant', () => {
        const at = (iso) => new Date(nextManilaMidnight(Date.parse(iso))).toISOString();
        expect(at('2026-10-08T10:00:00+08:00')).toBe('2026-10-08T16:00:00.000Z');
        expect(at('2026-10-08T23:59:59+08:00')).toBe('2026-10-08T16:00:00.000Z');
        expect(at('2026-10-09T00:00:00+08:00')).toBe('2026-10-09T16:00:00.000Z');
        expect(at('2026-12-31T20:00:00+08:00')).toBe('2026-12-31T16:00:00.000Z');
    });
});

describe('DISPLAY_NAME_MAX', () => {
    it('is the 32-character limit the profile route and the name inputs share', () => {
        expect(DISPLAY_NAME_MAX).toBe(32);
    });
});
