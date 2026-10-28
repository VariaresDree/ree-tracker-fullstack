import { describe, it, expect, vi, afterEach } from 'vitest';

// The study plan around the learner's own calendar (CELE round, 2026-10):
// rest days get no task, a preboard is that stretch's timed sitting, a
// coaching day is light review, and with no calendar the plan is exactly what
// it was before.
const { buildStudyPlan, dayKinds, cardTasks, FINAL_REVIEW_DAYS } = require('../src/engine/plan');
const prisma = require('../src/config/db');
const { loadPlanCalendar } = require('../src/services/planCalendar');

const topic = (name, subject, masteryEffective) => ({ topic: name, subject, masteryEffective, topicId: null });
const base = { today: '2026-10-01', dailyTarget: 50, examDate: '2026-12-31', topics: [topic('A', 'EE', 0.3), topic('B', 'ESAS', 0.4)] };
const day = (n) => new Date(Date.UTC(2026, 9, 1 + n)).toISOString().slice(0, 10);

afterEach(() => vi.restoreAllMocks());

describe('dayKinds', () => {
    it('with an empty calendar, is the old rule for every distance to the exam', () => {
        for (let daysToExam = 1; daysToExam <= 60; daysToExam++) {
            const days = Math.min(42, daysToExam);
            const old = Array.from({ length: days }, (_, i) => {
                if (daysToExam - i <= FINAL_REVIEW_DAYS) return 'review';
                if ((i + 1) % 7 === 0) return 'mock';
                return 'drill';
            });
            expect(dayKinds({ today: '2026-10-01', days, daysToExam })).toEqual(old);
        }
    });

    it('a rest day is skipped and doesn’t count toward the seven study days to a sitting', () => {
        const kinds = dayKinds({ today: '2026-10-01', days: 10, daysToExam: 90, restDays: new Set([day(2)]) });
        expect(kinds[2]).toBe('rest');
        expect(kinds.indexOf('mock')).toBe(7); // the seventh study day, one day later than before
    });

    it('a preboard takes the day and restarts the count to the next sitting', () => {
        const kinds = dayKinds({ today: '2026-10-01', days: 14, daysToExam: 90, eventDays: new Map([[day(3), 'preboard']]) });
        expect(kinds[3]).toBe('preboard');
        expect(kinds.indexOf('mock')).toBe(10); // seven study days after the preboard
        // A preboard on a rest weekday still happens.
        expect(dayKinds({ today: '2026-10-01', days: 5, daysToExam: 90, restDays: new Set([day(3)]), eventDays: new Map([[day(3), 'preboard']]) })[3]).toBe('preboard');
    });

    it('a coaching day is its own light day, and the final days stay review', () => {
        const kinds = dayKinds({ today: '2026-10-01', days: 6, daysToExam: 6, eventDays: new Map([[day(1), 'coaching']]) });
        expect(kinds).toEqual(['drill', 'coaching', 'drill', 'review', 'review', 'review']);
    });
});

describe('buildStudyPlan with a calendar', () => {
    it('puts no task on rest days or the preboard, and a light review on coaching days', () => {
        const restDays = new Set([day(5), day(12)]);
        const eventDays = new Map([[day(8), 'preboard'], [day(9), 'coaching']]);
        const plan = buildStudyPlan({ ...base, calendar: { restDays, eventDays } });
        const on = (d) => plan.filter((t) => t.dueDate === d);
        expect(on(day(5))).toEqual([]);
        expect(on(day(12))).toEqual([]);
        expect(on(day(8))).toEqual([]);
        expect(on(day(9))).toEqual([expect.objectContaining({ kind: 'review', text: expect.stringMatching(/^Light review on a coaching day/) })]);
        expect(on(day(9))[0].targetCount).toBeLessThan(plan.find((t) => t.kind === 'review' && !/coaching/.test(t.text))?.targetCount ?? Infinity);
    });

    it('with no calendar, plans exactly as before', () => {
        expect(buildStudyPlan({ ...base, calendar: {} })).toEqual(buildStudyPlan(base));
    });
});

describe('cardTasks around rest days', () => {
    it('cards due on a rest day wait for the next study day', () => {
        const dueDates = Array.from({ length: 5 }, () => day(2));
        const tasks = cardTasks({ today: day(0), days: 10, dueDates, restDays: new Set([day(2), day(3)]) });
        expect(tasks.map((t) => t.dueDate)).toEqual([day(4)]);
    });
});

describe('loadPlanCalendar', () => {
    it('marks the rest weekdays and rest key dates, and the preboard and coaching days', async () => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ restWeekdays: [0] }); // Sundays
        const findMany = vi.spyOn(prisma.keyDate, 'findMany').mockResolvedValue([
            { kind: 'preboard', startsOn: '2026-10-07', endsOn: null },
            { kind: 'coaching', startsOn: '2026-10-06', endsOn: '2026-10-08' },
            { kind: 'rest', startsOn: '2026-10-09', endsOn: null },
        ]);
        const cal = await loadPlanCalendar('uid', '2026-10-01', 14);
        expect(findMany.mock.calls[0][0].where.userId).toBe('uid');
        // 2026-10-04 and -11 are Sundays.
        expect([...cal.restDays].sort()).toEqual(['2026-10-04', '2026-10-09', '2026-10-11']);
        expect(Object.fromEntries(cal.eventDays)).toEqual({ '2026-10-06': 'coaching', '2026-10-07': 'preboard', '2026-10-08': 'coaching' });
        expect(cal.keyDates).toBe(2);
    });
});
