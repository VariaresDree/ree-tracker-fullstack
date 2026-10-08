// src/features/today/todayActions.js
//
// The Today panel's shortlist — pure, so the ordering is a tested rule rather
// than JSX order. Each action carries either a review `preset` or a route `to`.

import { PRC_FORMAT_SUMMARY } from '../../config/examStandards';
import { drillPreset, dueReviewPreset, quickReviewPreset } from '../active-recall/presets';
import { isTaskDone, taskLaunch } from '../profile/plannerTasks';

const MAX_ACTIONS = 4;
const DEFAULT_TARGET = 50;
const DUE_SESSION_MAX = 30;

/** Today's answers against the daily target. */
export function dailyProgress(stats) {
  const done = (stats?.dailyMath || 0) + (stats?.dailyESAS || 0) + (stats?.dailyEE || 0);
  return { done, target: stats?.dailyTarget || DEFAULT_TARGET };
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
 * @param {{due:number, overdue?:number}} [input.srs]
 * @param {object|null} [input.planTask]  from pickPlanTask
 * @param {{recommendedActions?:Array}} [input.forecast]
 * @param {{done:number, target:number}} [input.daily]
 * @param {number|null} [input.examInDays]
 *
 * Order: due reviews, today's plan task, the forecast's top fix, today's
 * target, a mock. A plan task replaces the action it duplicates: a drill on
 * the same topic as the fix, a review for the target, a mock for the mock.
 */
export function buildTodayActions({ srs, planTask, forecast, daily, examInDays } = {}) {
  const actions = [];

  if (srs?.due > 0) {
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
        ? `${examInDays} days to go — rehearse on the PRC clock (${PRC_FORMAT_SUMMARY}).`
        : `Rehearse on the PRC clock (${PRC_FORMAT_SUMMARY}).`,
      cta: 'Open simulator',
      to: '/simulator',
    });
  }

  return actions.slice(0, MAX_ACTIONS);
}
