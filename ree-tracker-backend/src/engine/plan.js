// Study plan — the next weeks of review, laid out a day at a time.
//
// Planner v1 ranked subtopics by raw accuracy, ignored the syllabus weights the
// client sent, wrote one free-text task per day cycling topics in list order,
// and nothing marked a task done unless the learner ticked it by hand.
//
// v2, pure:
//   • drill days are shared out across topics by what a gap costs on the board —
//     (1 − decayed BKT mastery) × syllabus weight — as exact quotas, then
//     ordered so a topic does not repeat on consecutive days when another still
//     has days left (largest-remaining-quota greedy);
//   • every seventh day is a timed PRC sitting, rotating the subject;
//   • the last three days before the exam are light review;
//   • tasks carry topic, subject and a question target, so they can be launched
//     and can complete themselves (taskProgress).
// Planned PLAN_HORIZON_DAYS ahead (or to the exam); regenerating re-plans from
// the learner's current mastery.

'use strict';

const { DEFAULT_SYLLABUS_WEIGHTS, normalizeWeights } = require('@ree/shared');
const { DEFAULT_BKT } = require('../config/bktParams');

const PLAN_HORIZON_DAYS = 42;
const MOCK_EVERY = 7;
const FINAL_REVIEW_DAYS = 3;
const DRILL_SHARE = 0.6;
const REVIEW_SHARE = 0.5;
const MOCK_ROTATION = ['EE', 'ESAS', 'Mathematics'];
const SUBJECT_LABEL = { Mathematics: 'Mathematics', ESAS: 'ESAS', EE: 'EE' };

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

/** Order the quotas so no topic repeats back to back while another has days left. */
function interleave(topics, counts) {
    const remaining = counts.slice();
    const order = [];
    let prev = -1;
    const total = remaining.reduce((a, b) => a + b, 0);
    for (let step = 0; step < total; step++) {
        let best = -1;
        for (let i = 0; i < remaining.length; i++) {
            if (remaining[i] <= 0 || i === prev) continue;
            if (best === -1 || remaining[i] > remaining[best]
                || (remaining[i] === remaining[best] && topics[i].priority > topics[best].priority)) best = i;
        }
        if (best === -1) best = prev; // only the previous topic has days left
        order.push(topics[best]);
        remaining[best] -= 1;
        prev = best;
    }
    return order;
}

/**
 * @param {object} input
 * @param {string} input.today        YYYY-MM-DD (Manila)
 * @param {string} input.examDate     YYYY-MM-DD
 * @param {number} [input.dailyTarget]
 * @param {Array<{topic, subject, topicId?, masteryEffective?}>} input.topics
 * @param {object} [input.weights]
 * @returns {Array<{dueDate, kind, subject, topic, topicId, targetCount, text}>}
 */
function buildStudyPlan({ today, examDate, dailyTarget = 50, topics = [], weights = DEFAULT_SYLLABUS_WEIGHTS, horizonDays = PLAN_HORIZON_DAYS }) {
    const daysToExam = Math.round((toUtc(examDate) - toUtc(today)) / DAY_MS);
    if (!Number.isFinite(daysToExam) || daysToExam <= 0) return [];
    const days = Math.min(horizonDays, daysToExam);
    const w = normalizeWeights(weights);

    const kinds = Array.from({ length: days }, (_, i) => {
        if (daysToExam - i <= FINAL_REVIEW_DAYS) return 'review';
        if ((i + 1) % MOCK_EVERY === 0) return 'mock';
        return 'drill';
    });
    const drillDays = kinds.filter((k) => k === 'drill').length;

    const ranked = (topics || [])
        .filter((t) => t?.topic)
        .map((t) => {
            const p = Number.isFinite(t.masteryEffective) ? t.masteryEffective : DEFAULT_BKT.pInit;
            return { ...t, priority: Math.max(0, 1 - p) * (w[t.subject] ?? 0.1) };
        })
        .filter((t) => t.priority > 0)
        .sort((a, b) => b.priority - a.priority);
    const drillOrder = interleave(ranked, quotas(ranked, drillDays));

    const drillTarget = Math.max(10, Math.round(dailyTarget * DRILL_SHARE));
    const reviewTarget = Math.max(10, Math.round(dailyTarget * REVIEW_SHARE));
    const plan = [];
    let drillIdx = 0;
    let mockIdx = 0;
    for (let i = 0; i < days; i++) {
        const dueDate = toYmd(toUtc(today) + i * DAY_MS);
        const kind = kinds[i];
        if (kind === 'drill' && drillOrder[drillIdx]) {
            const t = drillOrder[drillIdx++];
            plan.push({ dueDate, kind, subject: t.subject, topic: t.topic, topicId: t.topicId ?? null, targetCount: drillTarget, text: `Drill ${t.topic} — ${drillTarget} questions` });
        } else if (kind === 'mock') {
            const subject = MOCK_ROTATION[mockIdx++ % MOCK_ROTATION.length];
            plan.push({ dueDate, kind, subject, topic: null, topicId: null, targetCount: 1, text: `Timed ${SUBJECT_LABEL[subject]} sitting on the PRC clock` });
        } else {
            plan.push({ dueDate, kind: 'review', subject: null, topic: null, topicId: null, targetCount: reviewTarget, text: `Review — ${reviewTarget} questions from your due queue and weak spots` });
        }
    }
    return plan;
}

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Progress of planned tasks from what the learner actually did that day.
 *
 * @param {Array<{id, kind, topic?, dueDate, targetCount?}>} tasks
 * @param {Array<{day, topic, count}>} answered  answers per Manila day per topic
 * @param {string[]} mockDays  Manila days with a timed sitting
 * @returns {Array<{id, count, target, done}>} only for planned (kinded) tasks
 */
function taskProgress(tasks, answered, mockDays) {
    const byDay = new Map();
    for (const a of answered || []) {
        const entry = byDay.get(a.day) || { total: 0, byTopic: new Map() };
        entry.total += Number(a.count) || 0;
        entry.byTopic.set(norm(a.topic), (entry.byTopic.get(norm(a.topic)) || 0) + (Number(a.count) || 0));
        byDay.set(a.day, entry);
    }
    const mocks = new Set(mockDays || []);
    return (tasks || [])
        .filter((t) => t.kind)
        .map((t) => {
            const day = byDay.get(t.dueDate);
            const target = t.targetCount || 1;
            let count = 0;
            if (t.kind === 'drill') count = day?.byTopic.get(norm(t.topic)) || 0;
            else if (t.kind === 'review') count = day?.total || 0;
            else if (t.kind === 'mock') count = mocks.has(t.dueDate) ? 1 : 0;
            return { id: t.id, count, target, done: count >= target };
        });
}

module.exports = { buildStudyPlan, taskProgress, PLAN_HORIZON_DAYS, MOCK_EVERY, FINAL_REVIEW_DAYS };
