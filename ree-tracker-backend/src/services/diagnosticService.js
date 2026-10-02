// src/services/diagnosticService.js
//
// The placement test: a short adaptive sitting (15–19 items across Mathematics,
// ESAS and EE) that tells a new learner where they stand on the PRC scale and
// seeds their abilities, so practice starts calibrated instead of from the
// neutral θ = 0 every new account shares.
//
// Server-graded and resumable. The session is an ExamSession with
// mode 'DIAGNOSTIC'; its responses, the item currently being asked and the
// final result live in ExamSession.config (no schema change). Answers are never
// revealed during the test — a response says only what comes next — so the
// endpoint cannot be used to fish for an answer key.
//
// Attempts are written ONCE, at the end, through the shared recordAttempts with
// deterministic clientAttemptIds (`<sessionId>:<questionId>`), so the analytics
// pipeline sees them exactly once and a retried finish is a no-op. Recording
// per answer would put a full telemetry transaction (~1-2s on the free tier)
// between every question.

'use strict';

const { randomUUID } = require('crypto');
const prisma = require('../config/db');
const {
    weightedAverage, normalizeSubject, DEFAULT_SYLLABUS_WEIGHTS, GENERAL_AVERAGE, SUBJECT_FLOOR,
} = require('@ree/shared');
const { itemParams, SE_FLOOR, PRIOR_SE } = require('../engine/irt');
const { tccAt } = require('../engine/forecast');
const {
    pickCatItem, estimateSubjects, nextDiagnosticSubject, plannedLength, topicKey,
} = require('../engine/cat');
const { catCandidates } = require('./catCandidates');
const { getTccBySubject } = require('./referenceFormCache');
const { recordAttempts } = require('./telemetryService');

const MODE = 'DIAGNOSTIC';
const RESUME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// A placement only SEEDS ability for an account without real history. Past
// this many answers the long record is the better estimate, so the placement
// is reported, not imposed.
const SEED_MAX_PRIOR_ATTEMPTS = 30;

class DiagnosticError extends Error {
    constructor(status, message, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

const publicItem = (q) => ({
    id: q.id, subject: q.subject, subtopic: q.subtopic, text: q.text, options: q.options, type: q.type ?? null,
});

const placementBand = (expected) => (
    expected >= GENERAL_AVERAGE ? 'board-ready' : expected >= SUBJECT_FLOOR ? 'developing' : 'foundation'
);

const progressOf = (config) => ({ answered: (config.responses || []).length, total: plannedLength() });

async function loadOwnSession(userId, sessionId) {
    const session = await prisma.examSession.findFirst({
        where: { id: sessionId, userId, mode: MODE },
        select: { id: true, verdict: true, createdAt: true, config: true },
    });
    if (!session) throw new DiagnosticError(404, 'Placement test not found.');
    return session;
}

async function saveConfig(userId, sessionId, config, extra = {}) {
    await prisma.examSession.updateMany({ where: { id: sessionId, userId }, data: { config, ...extra } });
}

/**
 * Choose and persist the next item, or report that every subject is done. A
 * subject whose bank is empty is marked exhausted and skipped.
 */
async function serveNext(userId, sessionId, config) {
    let current = config;
    const exhausted = new Set(current.exhausted || []);
    for (let guard = 0; guard < 4; guard++) {
        const estimates = estimateSubjects(current.responses);
        for (const s of exhausted) estimates[s] = { ...estimates[s], n: Number.MAX_SAFE_INTEGER };
        const subject = nextDiagnosticSubject(estimates);
        if (!subject) return { done: true, config: current };

        const asked = current.responses.map((r) => r.questionId);
        const pool = await catCandidates({ subject, theta: estimates[subject].theta, excludeIds: asked, take: 60 });
        if (pool.length === 0) {
            exhausted.add(subject);
            current = { ...current, exhausted: [...exhausted] };
            continue;
        }

        const covered = {};
        for (const r of current.responses) if (r.topicKey) covered[r.topicKey] = (covered[r.topicKey] || 0) + 1;
        const id = pickCatItem({ theta: estimates[subject].theta, pool, coveredTopics: covered });
        const item = publicItem(pool.find((q) => q.id === id));
        const next = { ...current, pendingItemId: id, pendingItem: item };
        await saveConfig(userId, sessionId, next);
        return { done: false, config: next, item };
    }
    return { done: true, config: current };
}

async function start(userId, { restart = false } = {}) {
    const existing = await prisma.examSession.findFirst({
        where: { userId, mode: MODE, verdict: 'IN_PROGRESS' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, verdict: true, createdAt: true, config: true },
    });
    const resumable = existing && Date.now() - new Date(existing.createdAt).getTime() < RESUME_WINDOW_MS;

    if (resumable && !restart) {
        const config = existing.config || { responses: [] };
        if (config.pendingItem) {
            return { sessionId: existing.id, resumed: true, item: config.pendingItem, progress: progressOf(config) };
        }
        const next = await serveNext(userId, existing.id, config);
        if (next.done) return { sessionId: existing.id, ...(await finish(userId, existing.id)) };
        return { sessionId: existing.id, resumed: true, item: next.item, progress: progressOf(next.config) };
    }
    if (existing) {
        await prisma.examSession.updateMany({ where: { id: existing.id, userId }, data: { verdict: 'ABANDONED' } });
    }

    const id = randomUUID();
    const config = { kind: 'placement', version: 1, startedAt: new Date().toISOString(), responses: [] };
    await prisma.examSession.create({
        data: {
            id, userId, mode: MODE, targetSubject: 'BLENDED',
            score: 0, totalQuestions: 0, timeTakenSecs: 0, verdict: 'IN_PROGRESS', config,
        },
    });
    const next = await serveNext(userId, id, config);
    if (next.done) throw new DiagnosticError(503, 'The question bank has no items for a placement test yet.');
    return { sessionId: id, resumed: false, item: next.item, progress: progressOf(next.config) };
}

async function answer(userId, { sessionId, questionId, userAnswer, confidenceLevel, timeSpentMs }) {
    const session = await loadOwnSession(userId, sessionId);
    if (session.verdict === 'COMPLETED') return { done: true, result: session.config?.result || null };
    const config = session.config || { responses: [] };
    if (!config.pendingItemId || config.pendingItemId !== questionId) {
        throw new DiagnosticError(409, 'Answer the current question.', { item: config.pendingItem || null });
    }

    const master = await prisma.question.findUnique({
        where: { id: questionId },
        select: { id: true, answer: true, subject: true, subtopic: true, topicId: true, irtA: true, irtB: true, irtC: true, difficulty: true },
    });
    if (!master) throw new DiagnosticError(409, 'That question is no longer available.');

    const response = {
        questionId,
        subject: normalizeSubject(master.subject),
        topicKey: topicKey(master),
        isCorrect: master.answer === userAnswer,
        userAnswer: typeof userAnswer === 'string' ? userAnswer : '',
        confidenceLevel: confidenceLevel || 'MED',
        timeSpentMs: Number(timeSpentMs) || 0,
        answeredAt: new Date().toISOString(),
        params: itemParams(master),
    };
    const updated = { ...config, responses: [...config.responses, response], pendingItemId: null, pendingItem: null };

    const next = await serveNext(userId, session.id, updated);
    if (!next.done) return { done: false, item: next.item, progress: progressOf(next.config) };

    await saveConfig(userId, session.id, next.config);
    return finish(userId, session.id);
}

/** Pure: per-subject estimates + TCC grids → the placement result. */
function buildResult(estimates, tccBySubject, weights = DEFAULT_SYLLABUS_WEIGHTS) {
    const subjects = {};
    const expectedScores = {};
    for (const [s, est] of Object.entries(estimates)) {
        if (!est.n) continue;
        const expected = Math.round(tccAt(tccBySubject[s], est.theta) * 1000) / 10;
        expectedScores[s] = expected;
        subjects[s] = {
            theta: est.theta, se: est.se, answered: est.n, correct: est.correct, expected, band: placementBand(expected),
        };
    }
    return { subjects, projectedGWA: weightedAverage(expectedScores, weights) };
}

/** Finalise (idempotent): record the attempts, seed abilities, store the result. */
async function finish(userId, sessionId) {
    const session = await loadOwnSession(userId, sessionId);
    if (session.verdict === 'COMPLETED') return { done: true, result: session.config?.result || null };
    const config = session.config || { responses: [] };
    if (config.responses.length === 0) throw new DiagnosticError(409, 'Nothing has been answered yet.');

    const priorAttempts = await prisma.questionAttempt.count({ where: { userId, NOT: { sessionId } } });

    await recordAttempts({
        userId,
        sessionId,
        mode: MODE,
        targetSubject: 'BLENDED',
        attempts: config.responses.map((r) => ({
            questionId: r.questionId,
            userAnswer: r.userAnswer,
            confidenceLevel: r.confidenceLevel,
            timeSpentMs: r.timeSpentMs,
            clientAttemptId: `${sessionId}:${r.questionId}`,
            createdAt: r.answeredAt,
        })),
    });

    const estimates = estimateSubjects(config.responses);
    const result = buildResult(estimates, await getTccBySubject());
    const seeded = priorAttempts < SEED_MAX_PRIOR_ATTEMPTS;

    if (seeded) {
        const measured = Object.entries(estimates).filter(([, e]) => e.n > 0);
        const weightSum = measured.reduce((acc, [s]) => acc + (DEFAULT_SYLLABUS_WEIGHTS[s] || 0), 0) || 1;
        const theta = measured.reduce((acc, [s, e]) => acc + (DEFAULT_SYLLABUS_WEIGHTS[s] || 0) * e.theta, 0) / weightSum;
        const info = measured.reduce((acc, [, e]) => acc + 1 / (e.se * e.se), 0);
        const se = Math.min(PRIOR_SE, Math.max(SE_FLOOR, info > 0 ? 1 / Math.sqrt(info) : PRIOR_SE));
        await prisma.$transaction([
            ...measured.map(([s, e]) => prisma.userAbility.upsert({
                where: { userId_subject: { userId, subject: s } },
                update: { theta: e.theta, se: e.se },
                create: { userId, subject: s, theta: e.theta, se: e.se },
            })),
            prisma.user.update({ where: { id: userId }, data: { thetaRating: theta, standardError: se } }),
        ]);
    }

    const finalResult = { ...result, seeded, completedAt: new Date().toISOString() };
    await saveConfig(userId, sessionId, { ...config, result: finalResult }, { verdict: 'COMPLETED' });
    return { done: true, result: finalResult };
}

async function status(userId) {
    const latest = await prisma.examSession.findFirst({
        where: { userId, mode: MODE, verdict: { in: ['IN_PROGRESS', 'COMPLETED'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, verdict: true, createdAt: true, config: true },
    });
    if (!latest) return { status: 'none' };
    if (latest.verdict === 'COMPLETED') {
        return { status: 'completed', sessionId: latest.id, result: latest.config?.result || null };
    }
    return { status: 'in_progress', sessionId: latest.id, progress: progressOf(latest.config || { responses: [] }) };
}

module.exports = { start, answer, finish, status, buildResult, DiagnosticError, MODE, SEED_MAX_PRIOR_ATTEMPTS };
