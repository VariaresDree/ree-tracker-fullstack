import { describe, it, expect } from 'vitest';
const { buildStudyPlan, taskProgress, PLAN_HORIZON_DAYS } = require('../src/engine/plan');

// Planner v2. The old generator ranked subtopics by raw accuracy, ignored the
// syllabus weights the client sent, wrote one free-text task per day cycling
// topics in order, and nothing ever marked a task done.

const topic = (name, subject, masteryEffective, topicId = null) => ({ topic: name, subject, masteryEffective, topicId });

describe('buildStudyPlan', () => {
    const base = { today: '2026-10-01', dailyTarget: 50 };

    it('plans day by day to the horizon, starting today', () => {
        const plan = buildStudyPlan({ ...base, examDate: '2026-12-31', topics: [topic('A', 'EE', 0.3)] });
        expect(plan).toHaveLength(PLAN_HORIZON_DAYS);
        expect(plan[0].dueDate).toBe('2026-10-01');
        expect(plan[1].dueDate).toBe('2026-10-02');
    });

    it('gives a weak, heavily weighted topic more days than a strong, light one', () => {
        const plan = buildStudyPlan({
            ...base, examDate: '2026-12-31',
            topics: [topic('Machines', 'EE', 0.3), topic('Algebra', 'Mathematics', 0.8)],
        });
        const count = (name) => plan.filter((t) => t.topic === name).length;
        // (1 − .3)·.45 = .315  vs  (1 − .8)·.25 = .05
        expect(count('Machines')).toBeGreaterThan(count('Algebra') * 4);
        expect(count('Algebra')).toBeGreaterThan(0);
    });

    it('interleaves topics instead of stacking the same one on consecutive days', () => {
        const plan = buildStudyPlan({
            ...base, examDate: '2026-12-31',
            topics: [topic('A', 'EE', 0.3), topic('B', 'EE', 0.3), topic('C', 'ESAS', 0.4)],
        });
        const drills = plan.filter((t) => t.kind === 'drill').map((t) => t.topic);
        for (let i = 1; i < drills.length; i++) expect(drills[i]).not.toBe(drills[i - 1]);
    });

    it('puts a timed PRC sitting in every seventh day, rotating the subject', () => {
        const plan = buildStudyPlan({ ...base, examDate: '2026-12-31', topics: [topic('A', 'EE', 0.3)] });
        const mocks = plan.filter((t) => t.kind === 'mock');
        expect(mocks.map((m) => m.dueDate)).toEqual(['2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28', '2026-11-04', '2026-11-11']);
        expect(new Set(mocks.map((m) => m.subject)).size).toBe(3);
    });

    it('ends on light review in the last three days before the exam', () => {
        const plan = buildStudyPlan({ ...base, examDate: '2026-10-11', topics: [topic('A', 'EE', 0.3)] });
        expect(plan).toHaveLength(10);
        expect(plan.slice(-3).every((t) => t.kind === 'review')).toBe(true);
        expect(plan.slice(0, 7).some((t) => t.kind === 'drill')).toBe(true);
    });

    it('sizes a drill from the daily target and carries the topic for launching', () => {
        const [first] = buildStudyPlan({ ...base, examDate: '2026-12-31', topics: [topic('Machines', 'EE', 0.3, 't-m')] });
        expect(first).toMatchObject({ kind: 'drill', topic: 'Machines', subject: 'EE', topicId: 't-m', targetCount: 30 });
        expect(first.text).toBe('Drill Machines — 30 questions');
    });

    it('an exam in the past or today plans nothing', () => {
        expect(buildStudyPlan({ ...base, examDate: '2026-10-01', topics: [topic('A', 'EE', 0.3)] })).toEqual([]);
    });
});

describe('taskProgress — tasks complete themselves', () => {
    const day = '2026-10-03';
    const answered = [
        { day, topic: 'Machines', count: 18 },
        { day, topic: 'Algebra', count: 25 },
    ];

    it('a drill is done when that day’s answers in its topic reach the target', () => {
        const [p] = taskProgress([{ id: 't', kind: 'drill', topic: 'machines', dueDate: day, targetCount: 15 }], answered, []);
        expect(p).toMatchObject({ id: 't', count: 18, target: 15, done: true });
    });

    it('a review counts every answer that day', () => {
        const [p] = taskProgress([{ id: 'r', kind: 'review', dueDate: day, targetCount: 50 }], answered, []);
        expect(p).toMatchObject({ count: 43, done: false });
    });

    it('a mock is done by a timed sitting that day', () => {
        const [p] = taskProgress([{ id: 'm', kind: 'mock', dueDate: day, targetCount: 1 }], answered, [day]);
        expect(p.done).toBe(true);
    });

    it('a free-text task is left to the learner', () => {
        expect(taskProgress([{ id: 'x', kind: null, dueDate: day }], answered, [])).toEqual([]);
    });
});
