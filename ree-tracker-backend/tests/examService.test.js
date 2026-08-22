import { describe, it, expect } from 'vitest';

// Board-exam grading and diagnostics, extracted from a ~110-line route handler.
// It was uncovered for exactly the reason it was un-extracted, and that is how
// the verdict thresholds drifted between client and server for long enough to
// ship: a 55% mock read FAILED on the results screen and CONDITIONAL PASS in
// history, and counted as a pass in the KPI.
const {
    gradeAttempts,
    toSubjectScores,
    scorePercentage,
    buildDiagnostics,
    verdictColor,
} = require('../src/services/examService');

const qMap = {
    m1: { id: 'm1', answer: 'A', subject: 'Mathematics', subtopic: 'Algebra', difficulty: 1 },
    m2: { id: 'm2', answer: 'B', subject: 'Math', subtopic: 'Calculus', difficulty: 2 },
    e1: { id: 'e1', answer: 'C', subject: 'EE', subtopic: 'AC Electric Circuits', difficulty: 1 },
};

describe('gradeAttempts', () => {
    it('grades against the MASTER key, never the client’s own isCorrect', () => {
        const { correctCount, parsedAttempts } = gradeAttempts(
            // The client insists it got this right. The master answer is 'A'.
            [{ questionId: 'm1', userAnswer: 'D', isCorrect: true }],
            qMap,
            'u1',
        );
        expect(correctCount).toBe(0);
        expect(parsedAttempts[0].isCorrect).toBe(false);
    });

    it('grades an unknown question FALSE rather than skipping it', () => {
        // A stale offline pack referencing deleted questions must not be able to
        // shrink the denominator and inflate the percentage.
        const { correctCount, parsedAttempts } = gradeAttempts(
            [{ questionId: 'ghost', userAnswer: 'A' }],
            qMap,
            'u1',
        );
        expect(parsedAttempts).toHaveLength(1);
        expect(correctCount).toBe(0);
    });

    it('ignores an attempt with no questionId at all', () => {
        const { parsedAttempts } = gradeAttempts([{ userAnswer: 'A' }], qMap, 'u1');
        expect(parsedAttempts).toHaveLength(0);
    });

    it('prefers the master question’s subject over the client’s copy', () => {
        // A stale pack may carry a pre-taxonomy label.
        const { parsedAttempts } = gradeAttempts(
            [{ questionId: 'e1', userAnswer: 'C', subject: 'Electrical Engineering Professional Subjects' }],
            qMap,
            'u1',
        );
        expect(parsedAttempts[0].subject).toBe('EE');
    });

    it('stamps every row with the CALLER, not any userId in the payload', () => {
        const { parsedAttempts } = gradeAttempts(
            [{ questionId: 'm1', userAnswer: 'A', userId: 'someone-else' }],
            qMap,
            'u1',
        );
        expect(parsedAttempts[0].userId).toBe('u1');
    });

    it('clamps timing below what the int4 column can hold', () => {
        const { parsedAttempts } = gradeAttempts(
            [{ questionId: 'm1', userAnswer: 'A', timeSpentSecs: 5e9 }],
            qMap,
            'u1',
        );
        expect(parsedAttempts[0].timeSpentMs).toBe(3_600_000);
    });
});

describe('toSubjectScores', () => {
    it('canonicalises subjects so historical spellings merge', () => {
        // 'Math' and 'Mathematics' used to render as separate analytics rows.
        const scores = toSubjectScores({
            Math: { correct: 1, total: 2 },
            Mathematics: { correct: 3, total: 4 },
        });
        expect(Object.keys(scores)).toEqual(['Mathematics']);
    });

    it('OMITS a subject the exam never asked about', () => {
        // Absent, not zero. deriveVerdict must not fail a candidate on a subject
        // that carried no items.
        const scores = toSubjectScores({ EE: { correct: 8, total: 10 }, ESAS: { correct: 0, total: 0 } });
        expect(scores).toEqual({ EE: 80 });
        expect('ESAS' in scores).toBe(false);
    });
});

describe('scorePercentage', () => {
    it('guards the zero-item case', () => {
        expect(scorePercentage(0, 0)).toBe(0);
    });
    it('rounds to whole percent', () => {
        expect(scorePercentage(2, 3)).toBe(67);
    });
});

describe('buildDiagnostics', () => {
    const mk = (over = {}) => {
        const attempts = [
            { questionId: 'm1', userAnswer: 'A' },
            { questionId: 'e1', userAnswer: 'X' },
        ];
        const { correctCount, parsedAttempts, subjectPerformance } = gradeAttempts(attempts, qMap, 'u1');
        return buildDiagnostics({
            attempts, parsedAttempts, correctCount, subjectPerformance, timeTakenSecs: 600, ...over,
        });
    };

    it('reports the score, verdict and a matching colour token', () => {
        const d = mk();
        expect(d.totalCount).toBe(2);
        expect(d.correctCount).toBe(1);
        expect(d.overallScore).toBe(50);
        // 50% is below the 70% general average — one answer, one verdict.
        expect(d.verdict).toBe('FAILED');
        expect(d.verdictColor).toBe(verdictColor('FAILED'));
    });

    it('applies the PRC subject floor, not just the average', () => {
        const attempts = [
            { questionId: 'm1', userAnswer: 'D' },  // Math wrong  -> Mathematics 0%
            { questionId: 'e1', userAnswer: 'C' },  // EE right
            { questionId: 'e1', userAnswer: 'C' },
            { questionId: 'e1', userAnswer: 'C' },
        ];
        const { correctCount, parsedAttempts, subjectPerformance } = gradeAttempts(attempts, qMap, 'u1');
        const d = buildDiagnostics({ attempts, parsedAttempts, correctCount, subjectPerformance, timeTakenSecs: 60 });

        expect(d.overallScore).toBe(75);            // average is met
        expect(d.subjectScores.Mathematics).toBe(0); // but a subject is on the floor
        expect(d.verdict).toBe('CONDITIONAL PASS');
    });

    it('flags a time sink by original question index', () => {
        const attempts = [{ questionId: 'm1', userAnswer: 'A', timeSpentSecs: 400 }];
        const { correctCount, parsedAttempts, subjectPerformance } = gradeAttempts(attempts, qMap, 'u1');
        const d = buildDiagnostics({ attempts, parsedAttempts, correctCount, subjectPerformance, timeTakenSecs: 400 });
        expect(d.timeSinks).toEqual([{ idx: 0, time: 400 }]);
    });

    it('flags confidently-wrong answers as blind spots', () => {
        const attempts = [
            { questionId: 'm1', userAnswer: 'D', confidence: 'HIGH' },  // sure, and wrong
            { questionId: 'm2', userAnswer: 'Z', confidence: 'LOW' },   // unsure, and wrong
        ];
        const { correctCount, parsedAttempts, subjectPerformance } = gradeAttempts(attempts, qMap, 'u1');
        const d = buildDiagnostics({ attempts, parsedAttempts, correctCount, subjectPerformance, timeTakenSecs: 60 });
        expect(d.blindSpots).toEqual([0]);
    });

    it('returns an empty, non-throwing shape for an empty submission', () => {
        const d = buildDiagnostics({ attempts: [], parsedAttempts: [], correctCount: 0, subjectPerformance: {}, timeTakenSecs: 0 });
        expect(d.overallScore).toBe(0);
        expect(d.timeSinks).toEqual([]);
        expect(d.blindSpots).toEqual([]);
    });
});
