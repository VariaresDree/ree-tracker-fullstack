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

describe('review-center mode: the plan follows the lectures', () => {
    const { followLectures, LECTURE_READY_ANSWERS } = require('../src/engine/plan');
    const T = (name, id, attempts = 0) => ({ topic: name, subject: 'EE', topicId: id, attempts, masteryEffective: 0.3 });
    const machines = T('Machines', 'm');
    const protection = T('Protection', 'p');
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06'];

    it('the first drill day after a lecture drills that topic, swapped in from a later day', () => {
        const assigned = [protection, protection, protection, machines, protection, machines];
        const out = followLectures({ dates, assigned, lectures: [{ topicId: 'm', on: '2026-10-02' }], topics: [machines, protection], today: '2026-10-01' });
        expect(out.assigned[2]).toBe(machines);
        expect(out.pinned.get(2)).toBe('2026-10-02');
        // Each topic keeps its number of days.
        expect(out.assigned.filter((t) => t === machines)).toHaveLength(2);
    });

    it('a topic with few answers waits for its lecture; one known well enough doesn’t', () => {
        const assigned = [machines, protection, protection, protection];
        const held = followLectures({ dates: dates.slice(0, 4), assigned, lectures: [{ topicId: 'm', on: '2026-10-03' }], topics: [machines, protection], today: '2026-10-01' });
        expect(held.assigned[0]).toBe(protection);
        expect(held.assigned.indexOf(machines)).toBe(3); // pinned on the first day after the lecture
        const ready = T('Machines', 'm', LECTURE_READY_ANSWERS);
        const known = followLectures({ dates: dates.slice(0, 2), assigned: [ready, protection], lectures: [{ topicId: 'm', on: '2026-10-05' }], topics: [ready, protection], today: '2026-10-01' });
        expect(known.assigned[0]).toBe(ready);
    });

    it('a day with nothing that may go becomes review (null)', () => {
        const out = followLectures({ dates: dates.slice(0, 2), assigned: [machines, machines], lectures: [{ topicId: 'm', on: '2026-12-01' }], topics: [machines], today: '2026-10-01' });
        expect(out.assigned).toEqual([null, null]);
    });

    it('with no lectures, nothing moves; a lecture already given holds nothing back', () => {
        const assigned = [machines, protection];
        expect(followLectures({ dates, assigned, lectures: [], topics: [machines], today: '2026-10-01' }).assigned).toEqual(assigned);
        expect(followLectures({ dates, assigned, lectures: [{ topicId: 'm', on: '2026-09-20' }], topics: [machines], today: '2026-10-01' }).assigned).toEqual(assigned);
    });

    it('in a plan, the lecture’s drill is named for its day', () => {
        const topics = [{ ...machines, topicId: 'm' }, { ...protection }];
        const plan = buildStudyPlan({ ...base, topics, calendar: { lectures: [{ topicId: 'm', on: '2026-10-06' }] } });
        // 2026-10-07 is the week's timed sitting, so the first drill day after is the 8th.
        expect(plan.find((t) => t.dueDate === '2026-10-07').kind).toBe('mock');
        const after = plan.find((t) => t.dueDate === '2026-10-08');
        expect(after).toMatchObject({ kind: 'drill', topic: 'Machines' });
        expect(after.text).toMatch(/^Drill Tuesday’s lecture: Machines — /);
        expect(plan.filter((t) => t.topic === 'Machines' && t.dueDate <= '2026-10-06')).toEqual([]);
    });

    it('loadPlanCalendar reads lectures only in review-center mode', async () => {
        vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ restWeekdays: [], reviewMode: 'center' });
        const findMany = vi.spyOn(prisma.keyDate, 'findMany')
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ startsOn: '2026-10-06', topicIds: ['m', 'p'] }]);
        const cal = await loadPlanCalendar('uid', '2026-10-01', 14);
        expect(findMany.mock.calls[1][0].where).toEqual({ userId: 'uid', kind: 'lecture', startsOn: { gte: '2026-10-01' } });
        expect(cal.lectures).toEqual([{ topicId: 'm', on: '2026-10-06' }, { topicId: 'p', on: '2026-10-06' }]);
        expect(cal.reviewMode).toBe('center');

        prisma.user.findUnique.mockResolvedValue({ restWeekdays: [], reviewMode: 'self' });
        findMany.mockReset().mockResolvedValue([]);
        expect((await loadPlanCalendar('uid', '2026-10-01', 14)).lectures).toEqual([]);
        expect(findMany).toHaveBeenCalledTimes(1);
    });
});
