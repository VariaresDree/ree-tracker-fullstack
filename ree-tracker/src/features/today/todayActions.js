// src/features/today/todayActions.js
//
// The Today panel's shortlist — pure, so the ordering is a tested rule rather
// than JSX order. Each action carries either a review `preset` or a route `to`.

import { PRC_FORMAT_SUMMARY } from '../../config/examStandards';
import { toDisplaySubject, SUBJECT_FLOOR } from '@ree/shared';
import { adaptivePreset, drillPreset, dueReviewPreset, quickReviewPreset, todayLoopPreset } from '../active-recall/presets';
import { isTaskDone, taskLaunch } from '../profile/plannerTasks';
import { dailyCountsToday } from '../../services/analyticsSync';

const MAX_ACTIONS = 4;
// Under this many answers a learner is new: Today follows the placement plan.
const NEW_LEARNER_MAX = 30;
const DEFAULT_TARGET = 50;
const DUE_SESSION_MAX = 30;

/**
 * Today's answers against the daily target, with the per-subject counts.
 * Counters saved on an earlier day (offline, or open past midnight) read 0.
 */
export function dailyProgress(stats, today) {
  const counts = dailyCountsToday(stats, today);
  const done = counts.dailyMath + counts.dailyESAS + counts.dailyEE;
  return { done, target: stats?.dailyTarget || DEFAULT_TARGET, counts };
}

/**
 * Readiness trend from the daily snapshots (newest first, as the API returns
 * them): chronological scores for a sparkline, and the change against the
 * snapshot closest to a week ago (or the oldest, if the history is younger).
 */
export function readinessTrend(snapshots, now = new Date()) {
  const points = [...(snapshots || [])]
    .filter((s) => Number.isFinite(Number(s?.score)))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (points.length < 2) return { scores: points.map((p) => Math.round(p.score)), delta: null };
  const weekAgo = now.getTime() - 7 * 86400000;
  const base = [...points].reverse().find((p) => new Date(p.createdAt).getTime() <= weekAgo) || points[0];
  const latest = points[points.length - 1];
  return { scores: points.map((p) => Math.round(p.score)), delta: Math.round(latest.score - base.score) };
}

/** Whole days until the exam date (YYYY-MM-DD), or null. */
export function daysToExam(examDate, now = new Date()) {
  if (!examDate) return null;
  const exam = new Date(`${examDate}T00:00:00+08:00`);
  if (Number.isNaN(exam.getTime())) return null;
  return Math.ceil((exam.getTime() - now.getTime()) / 86400000);
}

/**
 * Today's open study-plan task: due today (a Manila day, YYYY-MM-DD), not yet
 * done by hand or by the day's answers, and one the app can start. Free-text
 * tasks have no session to launch, so they stay in the planner.
 */
export function pickPlanTask(tasks, today) {
  return (tasks || []).find((t) => t?.dueDate === today && !isTaskDone(t) && taskLaunch(t)) || null;
}

const sameTopic = (a, b) => !!a && !!b && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

/**
 * @param {object} input
 * @param {{items:Array, counts:{due:number, mistakes:number}, more?:number, cardsDue?:number}} [input.loop]
 *   today's loop (GET /api/user/today-loop)
 * @param {{due:number, overdue?:number}} [input.srs]
 * @param {{due:number}} [input.cards]   formula cards due for spaced review
 * @param {object|null} [input.planTask]  from pickPlanTask
 * @param {{recommendedActions?:Array}} [input.forecast]
 * @param {{done:number, target:number}} [input.daily]
 * @param {number|null} [input.examInDays]
 * @param {{mode:string, subject:string|null, reason:string}|null} [input.start]
 *   where the placement result says to start (features/exams/startingPlan)
 * @param {number} [input.answered]  questions answered so far
 *
 * Order: today's loop (due reviews and open mistakes in one session; it
 * replaces the due-review action), due reviews (questions, then formula cards), today's plan task, the forecast's top fix, today's
 * target, a mock. A plan task replaces the action it duplicates: a drill on
 * the same topic as the fix, a review for the target, a mock for the mock.
 *
 * A new learner (under NEW_LEARNER_MAX answers) gets the placement plan's
 * start right after the loop: an adaptive set on the subject under the floor
 * (or across the board), the mock moved up, or the Gauntlet. With no
 * placement yet there's no mock: the placement prompt comes first, and a
 * timed board on day one contradicted the mode guide.
 */
export function buildTodayActions({ loop, srs, cards, planTask, forecast, daily, examInDays, start = null, answered = Infinity } = {}) {
  const actions = [];

  const inLoop = loop?.items?.length || 0;
  if (inLoop > 0) {
    const { due = 0, mistakes = 0 } = loop.counts || {};
    const parts = [
      due > 0 && `${due} due review${due === 1 ? '' : 's'}`,
      mistakes > 0 && `${mistakes} open mistake${mistakes === 1 ? '' : 's'}`,
    ].filter(Boolean);
    actions.push({
      key: 'loop',
      title: "Start today's loop",
      detail: `${parts.join(' and ')}, mixed by board weight${loop.more > 0 ? ` (${loop.more} more wait for the next loop)` : ''}.`,
      cta: 'Start',
      preset: todayLoopPreset(loop),
    });
  }

  if (srs?.due > 0 && inLoop === 0) {
    const n = srs.due;
    actions.push({
      key: 'srs',
      title: `Review ${n} due question${n === 1 ? '' : 's'}`,
      detail: srs.overdue > 0
        ? `${srs.overdue} overdue — spaced review of what you missed or weren't sure of.`
        : "Spaced review of what you missed or weren't sure of.",
      cta: 'Review',
      preset: dueReviewPreset(Math.min(n, DUE_SESSION_MAX)),
    });
  }

  if (cards?.due > 0) {
    const n = cards.due;
    actions.push({
      key: 'cards',
      title: `Review ${n} formula card${n === 1 ? '' : 's'}`,
      detail: 'The formulas and constants you rated, back just before you’d forget them.',
      cta: 'Review cards',
      to: '/library?tab=formulas',
    });
  }

  const plan = planTask ? taskLaunch(planTask) : null;
  if (plan) {
    const p = planTask.progress;
    actions.push({
      key: 'plan',
      title: planTask.text,
      detail: p && p.count > 0
        ? `From your study plan · ${Math.min(p.count, p.target)} of ${p.target} done today.`
        : 'From your study plan for today.',
      cta: planTask.kind === 'mock' ? 'Set up' : 'Start',
      ...plan,
    });
  }

  const fix = (forecast?.recommendedActions || []).find((a) => a.type === 'BLIND_SPOT' || a.type === 'DRILL');
  const fixDuplicated = planTask?.kind === 'drill' && sameTopic(planTask.topic, fix?.payload?.topic);
  if (fix?.payload?.topic && !fixDuplicated) {
    const blind = fix.type === 'BLIND_SPOT';
    actions.push({
      key: 'fix',
      title: blind ? `Fix a blind spot: ${fix.payload.topic}` : `Drill ${fix.payload.topic}`,
      detail: fix.reason || 'Your costliest gap on the board, by mastery and syllabus weight.',
      cta: 'Drill',
      preset: drillPreset({
        topicId: fix.payload.topicId, topic: fix.payload.topic, subject: fix.payload.subject,
        mode: blind ? 'blind-spot' : undefined, count: fix.payload.count || 10,
      }),
    });
  }

  const remaining = (daily?.target || 0) - (daily?.done || 0);
  if (daily && remaining > 0 && planTask?.kind !== 'review') {
    actions.push({
      key: 'target',
      title: `${remaining} more to hit today’s target`,
      detail: 'A quick mixed set across all three subjects keeps the streak alive.',
      cta: 'Quick 20',
      preset: quickReviewPreset(20),
    });
  }

  if (planTask?.kind !== 'mock') {
    actions.push({
      key: 'mock',
      title: 'Sit a timed mock board',
      detail: examInDays != null && examInDays >= 0
        ? `${examInDays === 1 ? '1 day' : `${examInDays} days`} to go — rehearse on the PRC clock (${PRC_FORMAT_SUMMARY}).`
        : `Rehearse on the PRC clock (${PRC_FORMAT_SUMMARY}).`,
      cta: 'Take a mock board',
      to: '/simulator',
    });
  }

  if (answered < NEW_LEARNER_MAX) followPlacement(actions, start);
  return actions.slice(0, MAX_ACTIONS);
}

function followPlacement(actions, start) {
  const mockAt = actions.findIndex((a) => a.key === 'mock');
  const mock = mockAt >= 0 ? actions.splice(mockAt, 1)[0] : null;
  const at = actions[0]?.key === 'loop' ? 1 : 0;
  if (start?.mode === 'practice') {
    const name = start.subject ? toDisplaySubject(start.subject) : null;
    actions.splice(at, 0, {
      key: 'start',
      title: name ? `Practise ${name} first` : 'Build your base in Practice',
      detail: start.reason === 'floor'
        ? `${name} is under the ${SUBJECT_FLOOR}% subject floor. An adaptive set, picked to match your level.`
        : 'Your placement says learn the topics first. An adaptive set, picked to match your level.',
      cta: 'Start',
      preset: adaptivePreset({ subject: start.subject || 'All', count: 20 }),
    });
  } else if (start?.mode === 'mock' && mock) {
    actions.splice(at, 0, mock);
  } else if (start?.mode === 'gauntlet') {
    actions.splice(at, 0, {
      key: 'start',
      title: 'Climb the Gauntlet',
      detail: 'Your placement clears the pass mark. Push your level on its timed tiers.',
      cta: 'Open Gauntlet',
      to: '/exams?tab=gauntlet',
    });
    if (mock) actions.push(mock);
  } else if (actions.length === 0 && mock) {
    // Nothing else to do: still something on the list.
    actions.push(mock);
  }
}
