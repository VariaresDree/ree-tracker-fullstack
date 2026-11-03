import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Replacing a live question, against a real database: nothing here is safe to
// mock, because the danger is in what the SQL does to past answers.

const prisma = require('../../src/config/db');
const { questionContentHash } = require('@ree/shared');
const { replaceQuestions, translateStaleAnswers, questionsForChecking } = require('../../src/services/questionReplace');
const { recordAttempts } = require('../../src/services/telemetryService');

const RUN = `qr${Date.now().toString(36)}`;
const U = `${RUN}-u`;
const Q = (n) => `${RUN}-q${n}`;
const TOPIC = `${RUN} Topic`;

const base = (n, over = {}) => ({
    id: Q(n), subject: 'EE', subtopic: TOPIC, text: `${RUN} stem ${n}?`, options: ['1 A', '2 A', '3 A', '4 A'], answer: '2 A',
    fixedExplanation: `Old explanation ${n}.`, difficulty: 2, isFlagged: false, ...over,
});
const fix = (row, over = {}) => ({
    id: row.id, hash: questionContentHash(row), text: row.text, options: row.options, answer: row.answer, fixedExplanation: row.fixedExplanation, ...over,
});
const attempt = (n, selectedAnswer, isCorrect) => ({
    userId: U, questionId: Q(n), subject: 'EE', subtopic: TOPIC, selectedAnswer, isCorrect, mode: 'DRILL', confidenceLevel: 'MED', timeSpentMs: 30_000,
});
const answersOf = (n) => prisma.questionAttempt.findMany({ where: { questionId: Q(n) }, orderBy: { selectedAnswer: 'asc' } });

beforeAll(async () => {
    await prisma.user.create({ data: { id: U, email: `${U}@example.test` } });
});

afterAll(async () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8].map(Q);
    await prisma.questionVersion.deleteMany({ where: { questionId: { in: ids } } });
    await prisma.userTopicPerformance.deleteMany({ where: { userId: U } });
    await prisma.questionAttempt.deleteMany({ where: { userId: U } });
    await prisma.question.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: U } });
});

describe('replaceQuestions', () => {
    it('updates a question in place, keeps its attempts, records what it was, stamps it checked', async () => {
        const row = await prisma.question.create({ data: base(1) });
        await prisma.questionAttempt.createMany({ data: [attempt(1, '2 A', true)] });
        const res = await replaceQuestions([fix(row, { fixedExplanation: '**Answer:** $2\\ \\text{A}$', text: `${RUN} better stem 1?` })], U);
        expect(res.skipped).toEqual([]);
        expect(res.applied[0].id).toBe(Q(1));
        const after = await prisma.question.findUnique({ where: { id: Q(1) } });
        expect(after).toMatchObject({ text: `${RUN} better stem 1?`, fixedExplanation: '**Answer:** $2\\ \\text{A}$', explanationStatus: 'APPROVED', answer: '2 A' });
        expect(after.qualityCheckedAt).not.toBeNull();
        expect(res.applied[0].hash).toBe(questionContentHash(after));
        expect((await answersOf(1))[0]).toMatchObject({ selectedAnswer: '2 A', isCorrect: true });
        const v = await prisma.questionVersion.findFirst({ where: { questionId: Q(1), action: 'EXTERNAL_FIX' } });
        expect(v.snapshot).toMatchObject({ text: `${RUN} stem 1?`, answer: '2 A', options: ['1 A', '2 A', '3 A', '4 A'] });
    });

    it('moves past answers to reworded options by slot, even when two options swap text', async () => {
        const row = await prisma.question.create({ data: base(2, { options: ['1 A', '2 A', '3 A', '4 A'], answer: '2 A' }) });
        await prisma.questionAttempt.createMany({ data: [attempt(2, '1 A', false), attempt(2, '2 A', true), attempt(2, null, true)] });
        const options = ['$1\\ \\text{A}$', '$2\\ \\text{A}$', '3 A', '4 A'];
        await replaceQuestions([fix(row, { options, answer: options[1] })], U);
        const rows = await answersOf(2);
        expect(rows.map((r) => r.selectedAnswer).sort()).toEqual(['$1\\ \\text{A}$', '$2\\ \\text{A}$', null].sort());
        const right = rows.find((r) => r.selectedAnswer === options[1]);
        expect(right.isCorrect).toBe(true);
        expect(rows.find((r) => r.selectedAnswer === options[0]).isCorrect).toBe(false);
    });

    it('a corrected key regrades recorded answers and rebuilds mastery; unrecorded ones stay', async () => {
        const row = await prisma.question.create({ data: base(3) });
        await prisma.questionAttempt.createMany({ data: [attempt(3, '2 A', true), attempt(3, '3 A', false), attempt(3, null, true)] });
        await prisma.userTopicPerformance.create({ data: { userId: U, subject: 'EE', topic: TOPIC, attempts: 3, correct: 2, totalTime: 90_000, pMastery: 0.5, masteryN: 3 } });
        const res = await replaceQuestions([fix(row, { answer: '3 A', confirmKeyChange: true })], U);
        expect(res.applied[0]).toMatchObject({ keyChanged: true, regraded: 2, unrecorded: 1 });
        const rows = await answersOf(3);
        expect(rows.find((r) => r.selectedAnswer === '2 A').isCorrect).toBe(false);
        expect(rows.find((r) => r.selectedAnswer === '3 A').isCorrect).toBe(true);
        expect(rows.find((r) => r.selectedAnswer === null).isCorrect).toBe(true);
        expect((await prisma.question.findUnique({ where: { id: Q(3) } })).answer).toBe('3 A');
        const roll = await prisma.userTopicPerformance.findFirst({ where: { userId: U, topic: TOPIC } });
        expect(roll.attempts).toBeGreaterThan(0);
    });

    it('refuses without changing anything', async () => {
        const row = await prisma.question.create({ data: base(4) });
        const res = await replaceQuestions([
            fix(row, { answer: '3 A' }),
            fix(row, { hash: 'stale', text: 'x' }),
            fix(row, { options: ['2 A', '1 A', '3 A', '4 A'] }),
            fix(row, { options: ['1 A', '2 A', '3 A'] }),
            fix(row, { answer: 'Nope' }),
            { ...fix(row), id: `${RUN}-missing` },
            fix(row, { fixedExplanation: 'Stray $x' }),
        ], U);
        expect(res.applied).toEqual([]);
        expect(res.skipped.map((s) => s.reason)).toEqual([
            'needs-key-confirmation', 'stale', 'options-reordered', 'option-count-changed', 'key-not-an-option', 'not-found', 'unbalanced-math',
        ]);
        expect((await prisma.question.findUnique({ where: { id: Q(4) } })).qualityCheckedAt).toBeNull();
        expect(await prisma.questionVersion.count({ where: { questionId: Q(4) } })).toBe(0);
    });

    it('an unchanged question is only stamped checked, with no version row', async () => {
        const row = await prisma.question.create({ data: base(5) });
        const res = await replaceQuestions([fix(row)], U);
        expect(res.applied[0]).toMatchObject({ id: Q(5), unchanged: true });
        expect((await prisma.question.findUnique({ where: { id: Q(5) } })).qualityCheckedAt).not.toBeNull();
        expect(await prisma.questionVersion.count({ where: { questionId: Q(5) } })).toBe(0);
    });

    it('pasting the old content back restores it, regrade included', async () => {
        const row = await prisma.question.create({ data: base(6) });
        await prisma.questionAttempt.createMany({ data: [attempt(6, '2 A', true), attempt(6, '3 A', false)] });
        const { applied } = await replaceQuestions([fix(row, { answer: '3 A', confirmKeyChange: true })], U);
        await replaceQuestions([{ ...fix(row), hash: applied[0].hash, confirmKeyChange: true }], U);
        const rows = await answersOf(6);
        expect(rows.find((r) => r.selectedAnswer === '2 A').isCorrect).toBe(true);
        expect(rows.find((r) => r.selectedAnswer === '3 A').isCorrect).toBe(false);
    });
});

describe('late answers', () => {
    it('an answer in the old wording is graded by its slot', async () => {
        const row = await prisma.question.create({ data: base(7) });
        const options = ['$1\\ \\text{A}$', '$2\\ \\text{A}$', '$3\\ \\text{A}$', '$4\\ \\text{A}$'];
        await replaceQuestions([fix(row, { options, answer: options[1] })], U);
        const qMap = { [Q(7)]: { options } };
        const [translated] = await translateStaleAnswers([{ questionId: Q(7), userAnswer: '2 A' }], qMap);
        expect(translated.userAnswer).toBe(options[1]);

        await recordAttempts({ userId: U, mode: 'DRILL', attempts: [{ questionId: Q(7), userAnswer: '2 A', isCorrect: true, timeSpentMs: 30_000, clientAttemptId: `${RUN}-late`, confidenceLevel: 'MED' }] });
        const [saved] = await answersOf(7);
        expect(saved).toMatchObject({ selectedAnswer: options[1], isCorrect: true });
    });

    it('leaves an answer alone that was never an option', async () => {
        const [same] = await translateStaleAnswers([{ questionId: Q(7), userAnswer: 'Something else' }], { [Q(7)]: { options: ['a', 'b', 'c', 'd'] } });
        expect(same.userAnswer).toBe('Something else');
    });
});

describe('questionsForChecking', () => {
    it('leads with the most answered, can leave out checked ones, and counts progress', async () => {
        await prisma.question.create({ data: base(8, { subtopic: `${TOPIC} 2` }) });
        const page = await questionsForChecking({ subject: 'EE', subtopic: TOPIC, limit: 25 });
        expect(page.items[0].hash).toBe(questionContentHash(page.items[0]));
        const counts = page.items.map((q) => q.answeredCount);
        expect(counts).toEqual([...counts].sort((a, b) => b - a));
        expect(page.total).toBe(7);
        expect(page.checked).toBe(6);
        const unchecked = await questionsForChecking({ subject: 'EE', subtopic: TOPIC, unchecked: true, limit: 25 });
        expect(unchecked.items.map((q) => q.id)).toEqual([Q(4)]);
    });
});
