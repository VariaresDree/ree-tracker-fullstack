// Study plan — the next weeks of review, laid out a day at a time.
//
// Planner v1 ranked subtopics by raw accuracy, ignored the syllabus weights the
// client sent, wrote one free-text task per day cycling topics in list order,
// and nothing marked a task done unless the learner ticked it by hand.
//
// v2, pure:
//   • drill days are shared out across topics by what a gap costs on the board —
//     (1 − decayed BKT mastery) × syllabus weight — as exact quotas, then
//     ordered so each subject is spread through the plan at its share (paced,
//     never three days running while another waits) and a topic does not
//     repeat on consecutive days;
//   • a drill or review is sized to one Smart Drill session
//     (SMART_DRILL_MAX_ITEMS), so Start can always finish it;
//   • a topic's open mistakes raise its priority (up to 1.5× at ten), and its
//     drill says how many are open;
//   • a topic the learner flagged "to improve" on an outside score raises it
//     too (×1.25 a flag, two at most), within the same 1.5× cap;
//   • so does one they rated low themselves (not sure, or dreaded; the CELE
//     "Meta topics"), ×1.25, while it is still below Proficient;
//   • a timed PRC sitting every seventh study day, rotating the subject, and
//     closer together as the exam nears: every fifth in the refresher (60
//     days out), every fourth in the final stretch (two weeks out), by the
//     shared review phases (PHASE_MOCK_EVERY in @ree/shared);
//   • the last three days before the exam are light review;
//   • the learner's calendar (CELE round, 2026-10): a rest day gets no task, a
//     preboard day gets none either and counts as that stretch's timed
//     sitting (the next one is seven study days after it), and a coaching day
//     is light review. Rest days don't count toward the sitting's seven.
//   • review-center mode (2026-10, the CELE "Topic schedule"): the day after
//     a topic's lecture drills it, and a topic with few answers isn't drilled
//     before its lecture (followLectures). The quotas and pacing above are
//     left as they are; this only moves drill days between topics.
//   • tasks carry topic, subject and a question target, so they can be launched
//     and can complete themselves (taskProgress).
//   • days with CARD_DAY_MIN or more formula cards due get a "formula cards"
//     task beside the day's main one (cardTasks).
// Planned PLAN_HORIZON_DAYS ahead (or to the exam); regenerating re-plans from
// the learner's current mastery.

'use strict';

const { DEFAULT_SYLLABUS_WEIGHTS, normalizeWeights, SMART_DRILL_MAX_ITEMS, reviewPhase, PHASE_MOCK_EVERY } = require('@ree/shared');
const { DEFAULT_BKT } = require('../config/bktParams');

const PLAN_HORIZON_DAYS = 42;
const MOCK_EVERY = 7;
const FINAL_REVIEW_DAYS = 3;
const DRILL_SHARE = 0.6;
const REVIEW_SHARE = 0.5;
const MOCK_ROTATION = ['EE', 'ESAS', 'Mathematics'];
const SUBJECT_LABEL = { Mathematics: 'Mathematics', ESAS: 'ESAS', EE: 'EE' };
const MISTAKE_BOOST = 0.5;
const MISTAKE_CAP = 10;
const FLAG_BOOST = 0.25;
const FLAG_CAP = 2;
const BOOST_CAP = 1.5;
const SELF_RATED_BOOST = 0.25;
// Below Proficient (MASTERY_BANDS in @ree/shared): a topic rated low but
// already known well isn't pushed forward.
const PROFICIENT = 0.65;
const CARD_DAY_MIN = 5;
// A topic with this many answers is known well enough to drill before its lecture.
const LECTURE_READY_ANSWERS = 10;
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CARD_WINDOW_DAYS = 14;

const DAY_MS = 86400000;
const toUtc = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const toYmd = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Exact day quotas by largest remainder. */
function quotas(priorities, total) {
    const sum = priorities.reduce((a, p) => a + p.priority, 0);
    if (sum <= 0 || total <= 0) return priorities.map(() => 0);
    const exact = priorities.map((p) => (p.priority / sum) * total);
    const out = exact.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    exact
        .map((x, i) => ({ i, frac: x - Math.floor(x) }))
        .sort((a, b) => b.frac - a.frac || priorities[b.i].priority - priorities[a.i].priority)
        .forEach(({ i }) => { if (left > 0) { out[i] += 1; left -= 1; } });
    return out;
}

/**
 * Day quotas in two steps: days to subjects by their summed priority, then each
 * subject's days to its topics. Rounding topic by topic let a subject with many
 * topics collect every leftover day — six EE topics took all six spare days and
 * ESAS, owed 7.45, got 6.
 */
function subjectFirstQuotas(topics, total) {
    const subjects = [...new Set(topics.map((t) => t.subject))];
    const subjectPriority = subjects.map((s) => ({
        priority: topics.filter((t) => t.subject === s).reduce((a, t) => a + t.priority, 0),
    }));
    const subjectDays = quotas(subjectPriority, total);
    const out = new Array(topics.length).fill(0);
    subjects.forEach((s, si) => {
        const idx = topics.map((t, i) => (t.subject === s ? i : -1)).filter((i) => i >= 0);
        quotas(idx.map((i) => topics[i]), subjectDays[si]).forEach((n, k) => { out[idx[k]] = n; });
    });
    return out;
}

/**
 * Order the day quotas through the plan.
 *
 * Subjects are paced: a subject's k-th day ideally falls (k + ½) / quota of the
 * way through, and the subject furthest behind its pace goes next — so a 45%
 * subject lands about every other day instead of taking the first fortnight.
 * A subject never runs a third day in a row while another still has days.
 * Within the subject, the topic with the most days left goes, never the topic
 * of the day before while another has days left.
 */
function interleave(topics, counts) {
    const remaining = counts.slice();
    const total = remaining.reduce((a, b) => a + b, 0);
    const quota = new Map();
    const served = new Map();
    topics.forEach((t, i) => quota.set(t.subject, (quota.get(t.subject) || 0) + counts[i]));
    const left = (s) => quota.get(s) - (served.get(s) || 0);
    const pace = (s) => ((served.get(s) || 0) + 0.5) / quota.get(s);

    const order = [];
    let prevTopic = -1;
    const lastSubjects = [];
    for (let step = 0; step < total; step++) {
        const open = [...quota.keys()].filter((s) => left(s) > 0);
        const runOf = lastSubjects.length === 2 && lastSubjects[0] === lastSubjects[1] ? lastSubjects[1] : null;
        const pool = open.length > 1 && runOf ? open.filter((s) => s !== runOf) : open;
        const subject = pool.sort((a, b) => pace(a) - pace(b) || quota.get(b) - quota.get(a))[0];

        let best = -1;
        for (let i = 0; i < topics.length; i++) {
            if (remaining[i] <= 0 || topics[i].subject !== subject) continue;
            if (best === -1) { best = i; continue; }
            const better = remaining[i] > remaining[best]
                || (remaining[i] === remaining[best] && topics[i].priority > topics[best].priority);
            // never yesterday's topic while the subject has another
            if (best === prevTopic || (better && i !== prevTopic)) best = i;
        }
        order.push(topics[best]);
        remaining[best] -= 1;
        served.set(subject, (served.get(subject) || 0) + 1);
        prevTopic = best;
        lastSubjects.push(subject);
        if (lastSubjects.length > 2) lastSubjects.shift();
    }
    return order;
}

/**
 * What each day of the plan is, from today: 'drill' | 'mock' | 'review' |
 * 'coaching' | 'rest' | 'preboard'. The sitting comes every N study days,
 * N by the review phase of that day (or `mockEvery` when given). With an
 * empty calendar and the exam more than 120 days off, it is exactly the old
 * rule (a mock every seventh day, the last FINAL_REVIEW_DAYS review).
 *
 * @param {{ today: string, days: number, daysToExam: number,
 *   restDays?: Set<string>, eventDays?: Map<string, string> }} input
 *   eventDays: YYYY-MM-DD → 'preboard' | 'coaching'
 */
function dayKinds({ today, days, daysToExam, restDays = new Set(), eventDays = new Map(), mockEvery = null }) {
    const kinds = [];
    let sinceMock = 0;
    for (let i = 0; i < days; i++) {
        const day = toYmd(toUtc(today) + i * DAY_MS);
        const event = eventDays.get(day);
        if (event === 'preboard') {
            kinds.push('preboard');
            sinceMock = 0;
            continue;
        }
        if (restDays.has(day)) { kinds.push('rest'); continue; }
        if (daysToExam - i <= FINAL_REVIEW_DAYS) { kinds.push('review'); continue; }
        if (event === 'coaching') { kinds.push('coaching'); continue; }
        sinceMock += 1;
        const cadence = mockEvery ?? PHASE_MOCK_EVERY[reviewPhase(daysToExam - i)?.id] ?? MOCK_EVERY;
        if (sinceMock >= cadence) {
            kinds.push('mock');
            sinceMock = 0;
        } else {
            kinds.push('drill');
        }
    }
    return kinds;
}

/**
 * Line the drill days up with a review center's lectures.
 *
 *   1. Pin: the first drill day after a topic's lecture drills that topic,
 *      swapped in from another of its days (later ones first), or taking the
 *      day when it has none.
 *   2. Hold: a topic whose lecture is still ahead, with fewer than
 *      LECTURE_READY_ANSWERS answers, swaps with the nearest later day whose
 *      topic may go now; with none, its day becomes review (null).
 * Swaps keep each topic's number of days; pinned days don't move again.
 *
 * @param {{ dates: string[], assigned: Array<object|null>, lectures: Array<{topicId: string, on: string}>,
 *   topics: object[], today: string }} input
 *   dates: each drill day's date, in order; assigned: its topic (interleave's order)
 * @returns {{ assigned: Array<object|null>, pinned: Map<number, string> }}  pinned: slot → lecture date
 */
function followLectures({ dates, assigned: initial, lectures = [], topics = [], today }) {
    const assigned = initial.slice();
    const pinned = new Map();
    // Each topic's first lecture from today on (one already given doesn't hold it back).
    const lectureOf = new Map();
    for (const l of lectures) {
        if (!l?.topicId || !l.on || l.on < today) continue;
        if (!lectureOf.has(l.topicId) || l.on < lectureOf.get(l.topicId)) lectureOf.set(l.topicId, l.on);
    }
    if (lectureOf.size === 0) return { assigned, pinned };
    const byId = new Map(topics.filter((t) => t.topicId).map((t) => [t.topicId, t]));
    const mayGo = (t, date) => {
        if (!t?.topicId) return true;
        const on = lectureOf.get(t.topicId);
        return !on || date > on || (Number(t.attempts) || 0) >= LECTURE_READY_ANSWERS;
    };
    const swap = (a, b) => { [assigned[a], assigned[b]] = [assigned[b], assigned[a]]; };

    // 1. Pin, lectures in date order.
    for (const [topicId, on] of [...lectureOf.entries()].sort((a, b) => (a[1] < b[1] ? -1 : 1))) {
        const s = dates.findIndex((d, i) => d > on && !pinned.has(i));
        const t = byId.get(topicId);
        if (s < 0 || !t) continue;
        if (assigned[s]?.topicId !== topicId) {
            const later = assigned.findIndex((x, j) => j > s && !pinned.has(j) && x?.topicId === topicId);
            const earlier = later >= 0 ? -1 : assigned.findIndex((x, j) => j < s && !pinned.has(j) && x?.topicId === topicId && mayGo(assigned[s], dates[j]));
            const j = later >= 0 ? later : earlier;
            if (j >= 0) swap(s, j);
            else assigned[s] = t;
        }
        pinned.set(s, on);
    }

    // 2. Hold topics back until their lecture.
    for (let i = 0; i < assigned.length; i++) {
        const t = assigned[i];
        if (!t || pinned.has(i) || mayGo(t, dates[i])) continue;
        let k = -1;
        for (let j = i + 1; j < assigned.length && k < 0; j++) {
            if (!pinned.has(j) && assigned[j] && mayGo(assigned[j], dates[i])) k = j;
        }
        if (k >= 0) swap(i, k);
        else assigned[i] = null;
    }
    return { assigned, pinned };
}

/**
 * @param {object} input
 * @param {string} input.today        YYYY-MM-DD (Manila)
 * @param {string} input.examDate     YYYY-MM-DD
 * @param {number} [input.dailyTarget]
 * @param {Array<{topic, subject, topicId?, masteryEffective?, openMistakes?, flags?, flaggedBy?, ratedLow?}>} input.topics
 * @param {object} [input.weights]
 * @param {{ restDays?: Set<string>, eventDays?: Map<string, string>, lectures?: Array<{topicId, on}> }} [input.calendar]
 *   the learner's rest days and key dates, and in review-center mode the
 *   lectures (services/planCalendar.js)
 * @returns {Array<{dueDate, kind, subject, topic, topicId, targetCount, text}>}
 */
function buildStudyPlan({ today, examDate, dailyTarget = 50, topics = [], weights = DEFAULT_SYLLABUS_WEIGHTS, horizonDays = PLAN_HORIZON_DAYS, calendar = {} }) {
    const daysToExam = Math.round((toUtc(examDate) - toUtc(today)) / DAY_MS);
    if (!Number.isFinite(daysToExam) || daysToExam <= 0) return [];
    const days = Math.min(horizonDays, daysToExam);
    const w = normalizeWeights(weights);

    const kinds = dayKinds({ today, days, daysToExam, restDays: calendar.restDays, eventDays: calendar.eventDays });
    const drillDays = kinds.filter((k) => k === 'drill').length;

    const ranked = (topics || [])
        .filter((t) => t?.topic)
        .map((t) => {
            const p = Number.isFinite(t.masteryEffective) ? t.masteryEffective : DEFAULT_BKT.pInit;
            const open = Math.max(0, Number(t.openMistakes) || 0);
            const flags = Math.max(0, Number(t.flags) || 0);
            const boost = Math.min(BOOST_CAP, 1
                + MISTAKE_BOOST * (Math.min(open, MISTAKE_CAP) / MISTAKE_CAP)
                + FLAG_BOOST * Math.min(flags, FLAG_CAP)
                + (t.ratedLow && p < PROFICIENT ? SELF_RATED_BOOST : 0));
            return { ...t, openMistakes: open, flags, priority: Math.max(0, 1 - p) * (w[t.subject] ?? 0.1) * boost };
        })
        .filter((t) => t.priority > 0)
        .sort((a, b) => b.priority - a.priority);
    const drillOrder = interleave(ranked, subjectFirstQuotas(ranked, drillDays));

    const sessionSized = (share) => Math.min(SMART_DRILL_MAX_ITEMS, Math.max(10, Math.round(dailyTarget * share)));
    const drillTarget = sessionSized(DRILL_SHARE);
    const reviewTarget = sessionSized(REVIEW_SHARE);
    const lightTarget = Math.max(10, Math.round(reviewTarget / 2));
    const plan = [];
    // The drill days in order, and each one's topic, lined up with any lectures.
    const drillSlots = kinds.map((k, i) => (k === 'drill' ? i : -1)).filter((i) => i >= 0);
    const { assigned, pinned } = followLectures({
        dates: drillSlots.map((i) => toYmd(toUtc(today) + i * DAY_MS)),
        assigned: drillSlots.map((_, n) => drillOrder[n] || null),
        lectures: calendar.lectures,
        topics: ranked,
        today,
    });
    let drillIdx = 0;
    let mockIdx = 0;
    for (let i = 0; i < days; i++) {
        const dueDate = toYmd(toUtc(today) + i * DAY_MS);
        const kind = kinds[i];
        const slot = kind === 'drill' ? drillIdx++ : -1;
        if (kind === 'drill' && assigned[slot]) {
            const t = assigned[slot];
            const lecture = pinned.get(slot);
            // The open-mistakes note stays last.
            const flagged = t.flags > 0 && t.flaggedBy ? ` (flagged after ${t.flaggedBy})` : '';
            const open = t.openMistakes > 0 ? ` (${t.openMistakes} open mistake${t.openMistakes === 1 ? '' : 's'})` : '';
            plan.push({ dueDate, kind, subject: t.subject, topic: t.topic, topicId: t.topicId ?? null, targetCount: drillTarget, text: lecture
                ? `Drill ${WEEKDAY[new Date(toUtc(lecture)).getUTCDay()]}’s lecture: ${t.topic} — ${drillTarget} questions${flagged}${open}`
                : `Drill ${t.topic} — ${drillTarget} questions${flagged}${open}` });
        } else if (kind === 'mock') {
            const subject = MOCK_ROTATION[mockIdx++ % MOCK_ROTATION.length];
            plan.push({ dueDate, kind, subject, topic: null, topicId: null, targetCount: 1, text: `Timed ${SUBJECT_LABEL[subject]} sitting on the PRC clock` });
        } else if (kind === 'coaching') {
            plan.push({ dueDate, kind: 'review', subject: null, topic: null, topicId: null, targetCount: lightTarget, text: `Light review on a coaching day — ${lightTarget} questions from your due queue` });
        } else if (kind === 'review' || kind === 'drill') {
            // A drill day with no topic left falls back to review.
            plan.push({ dueDate, kind: 'review', subject: null, topic: null, topicId: null, targetCount: reviewTarget, text: `Review — ${reviewTarget} questions from your due queue and weak spots` });
        }
        // A rest day or a preboard day gets no task.
    }
    return plan;
}

/**
 * "Formula cards" tasks: on each of the next CARD_WINDOW_DAYS (within the
 * plan) where CARD_DAY_MIN or more cards fall due. Each card counts once, at
 * its current due date (overdue counts today); a rating moves it, so later
 * days are a forecast, and re-planning refreshes it.
 *
 * @param {{ today: string, days: number, dueDates: string[], restDays?: Set<string> }} input  YYYY-MM-DD (Manila)
 * @returns {Array<{dueDate, kind: 'cards', subject: null, topic: null, topicId: null, targetCount, text}>}
 */
function cardTasks({ today, days, dueDates = [], min = CARD_DAY_MIN, windowDays = CARD_WINDOW_DAYS, restDays = new Set() }) {
    const span = Math.min(days, windowDays);
    if (!(span > 0)) return [];
    const last = toYmd(toUtc(today) + (span - 1) * DAY_MS);
    const perDay = new Map();
    for (const d of dueDates) {
        if (!d) continue;
        let day = d < today ? today : d;
        // A card due on a rest day waits for the next study day.
        for (let guard = 0; restDays.has(day) && guard < 7; guard++) day = toYmd(toUtc(day) + DAY_MS);
        if (day > last) continue;
        perDay.set(day, (perDay.get(day) || 0) + 1);
    }
    return [...perDay.entries()]
        .filter(([, n]) => n >= min)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([dueDate, n]) => ({ dueDate, kind: 'cards', subject: null, topic: null, topicId: null, targetCount: n, text: `Review ${n} formula cards` }));
}

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Progress of planned tasks from what the learner actually did that day.
 *
 * @param {Array<{id, kind, topic?, dueDate, targetCount?}>} tasks
 * @param {Array<{day, topic, count}>} answered  answers per Manila day per topic
 * @param {string[]} mockDays  Manila days with a timed sitting
 * @param {Array<{day, count}>} [cardDays]  formula cards rated per Manila day
 * @returns {Array<{id, count, target, done}>} only for planned (kinded) tasks
 */
function taskProgress(tasks, answered, mockDays, cardDays = []) {
    const byDay = new Map();
    for (const a of answered || []) {
        const entry = byDay.get(a.day) || { total: 0, byTopic: new Map() };
        entry.total += Number(a.count) || 0;
        entry.byTopic.set(norm(a.topic), (entry.byTopic.get(norm(a.topic)) || 0) + (Number(a.count) || 0));
        byDay.set(a.day, entry);
    }
    const mocks = new Set(mockDays || []);
    const cardsOn = new Map((cardDays || []).map((c) => [c.day, Number(c.count) || 0]));
    return (tasks || [])
        .filter((t) => t.kind)
        .map((t) => {
            const day = byDay.get(t.dueDate);
            const target = t.targetCount || 1;
            let count = 0;
            if (t.kind === 'drill') count = day?.byTopic.get(norm(t.topic)) || 0;
            else if (t.kind === 'review') count = day?.total || 0;
            else if (t.kind === 'mock') count = mocks.has(t.dueDate) ? 1 : 0;
            else if (t.kind === 'cards') count = cardsOn.get(t.dueDate) || 0;
            return { id: t.id, count, target, done: count >= target };
        });
}

module.exports = { buildStudyPlan, dayKinds, followLectures, LECTURE_READY_ANSWERS, cardTasks, taskProgress, PLAN_HORIZON_DAYS, MOCK_EVERY, FINAL_REVIEW_DAYS, CARD_DAY_MIN };
