// src/services/examHistory.js
//
// Server-authoritative mock-exam records.
//
// A Board Simulator sitting reaches the server as telemetry: recordAttempts
// upserts an ExamSession and stamps it verdict 'IN_PROGRESS' — and nothing ever
// finalised it. The only per-subject record of a sitting lived in a
// device-local IndexedDB ledger, so mock history was per-device, lost with a
// cleared browser, and had no subject breakdown on the server at all.
//
// finalizeSession grades a session from its OWN recorded attempts — per-subject
// percentages, the PRC weighted general average and verdict — and stores them
// on the session. buildMockHistory serves sittings for the dashboard, deriving
// the same numbers on the fly for sessions recorded before finalisation existed.

'use strict';

const prisma = require('../config/db');
const { gradeBoardExam, deriveVerdict } = require('@ree/shared');
const { subjectScoresBySession } = require('./deepAnalyticsHelpers');

const HISTORY_MODES = ['BOARD_SIM', 'BATTLE'];
const KINDS = new Set(['subject', 'blended', 'custom', 'full-board', 'battle', 'retake']);
const MAX_MARKED = 300;

class ExamHistoryError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

/** Grouped per-subject counts for the given sessions (one bound-param query). */
async function subjectRowsFor(userId, sessionIds) {
    if (!sessionIds.length) return [];
    return prisma.$queryRaw`
        SELECT "sessionId", "subject",
               COUNT(*)::int AS "total",
               COUNT(*) FILTER (WHERE "isCorrect")::int AS "correct"
        FROM "QuestionAttempt"
        WHERE "userId" = ${userId} AND "sessionId" = ANY(${sessionIds}::text[])
        GROUP BY "sessionId", "subject"`;
}

/** Whitelist the client-described shape of a sitting. Never used for grading. */
function sanitizeMeta(meta = {}) {
    const out = {};
    if (KINDS.has(meta.kind)) out.kind = meta.kind;
    if (typeof meta.isPrcStandard === 'boolean') out.isPrcStandard = meta.isPrcStandard;
    if (typeof meta.targetSubject === 'string') out.targetSubject = meta.targetSubject.slice(0, 32);
    if (Array.isArray(meta.markedQuestionIds)) {
        out.markedQuestionIds = meta.markedQuestionIds
            .filter((id) => typeof id === 'string' && id.length > 0 && id.length <= 200)
            .slice(0, MAX_MARKED);
    }
    return out;
}

/** Union of two id lists, de-duplicated and capped, in first-seen order. */
function mergeMarked(a, b) {
    return Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])).slice(0, MAX_MARKED);
}

/**
 * Grade a session from its recorded attempts and store the result. Idempotent:
 * re-finalising recomputes from the same rows.
 */
async function finalizeSession({ userId, sessionId, meta = {} }) {
    const session = await prisma.examSession.findFirst({
        where: { id: sessionId, userId },
        select: { id: true, config: true },
    });
    if (!session) throw new ExamHistoryError(404, 'Exam session not found.');

    const subjects = subjectScoresBySession(await subjectRowsFor(userId, [sessionId]))[sessionId] || {};
    // The attempts may still be in the client's outbox. 409 is retryable to
    // the sync policy, so a queued finalise simply runs again later.
    if (Object.keys(subjects).length === 0) throw new ExamHistoryError(409, 'No answers are recorded for this session yet.');

    const { generalAverage, verdict } = gradeBoardExam(subjects);
    const prior = session.config && typeof session.config === 'object' ? session.config : {};
    const described = sanitizeMeta(meta);
    const config = {
        ...prior,
        ...described,
        // A union, so finalising again (a replayed request) never drops marks.
        ...(described.markedQuestionIds || prior.markedQuestionIds
            ? { markedQuestionIds: mergeMarked(prior.markedQuestionIds, described.markedQuestionIds) }
            : {}),
        subjectScores: subjects,
        generalAverage,
        finalizedAt: new Date().toISOString(),
    };
    await prisma.examSession.updateMany({ where: { id: sessionId, userId }, data: { verdict, config } });
    return { sessionId, verdict, generalAverage, subjectScores: subjects };
}

/** Hide a sitting from mock history WITHOUT deleting it — its answers still count. */
async function hideSession({ userId, sessionId }) {
    const session = await prisma.examSession.findFirst({ where: { id: sessionId, userId }, select: { config: true } });
    if (!session) throw new ExamHistoryError(404, 'Exam session not found.');
    const config = { ...(session.config && typeof session.config === 'object' ? session.config : {}), hiddenFromHistory: true };
    await prisma.examSession.updateMany({ where: { id: sessionId, userId }, data: { config } });
    return { success: true };
}

/** Pure: session rows (+ derived subject scores for unfinalised ones) → history items. */
function buildMockHistory(sessions, derivedSubjects = {}) {
    return (sessions || [])
        .filter((s) => (s.totalQuestions || 0) > 0 && !s.config?.hiddenFromHistory)
        .map((s) => {
            const cfg = s.config && typeof s.config === 'object' ? s.config : {};
            const pct = Math.round((s.score / s.totalQuestions) * 100);
            const subjectScores = cfg.subjectScores || derivedSubjects[s.id] || {};
            const graded = Object.keys(subjectScores).length > 0 ? gradeBoardExam(subjectScores) : null;
            const stored = s.verdict && s.verdict !== 'IN_PROGRESS' ? s.verdict : null;
            return {
                id: s.id,
                date: s.createdAt,
                mode: s.mode,
                kind: cfg.kind || (s.mode === 'BATTLE' ? 'battle' : null),
                isPrcStandard: cfg.isPrcStandard ?? null,
                targetSubject: cfg.targetSubject || s.targetSubject,
                totalQuestions: s.totalQuestions,
                timeTakenSecs: s.timeTakenSecs,
                score: pct,
                subjectScores,
                generalAverage: cfg.generalAverage ?? graded?.generalAverage ?? null,
                verdict: stored || graded?.verdict || deriveVerdict(pct),
                finalized: !!cfg.finalizedAt,
            };
        });
}

async function mockHistory(userId, limit = 20) {
    const sessions = await prisma.examSession.findMany({
        where: { userId, mode: { in: HISTORY_MODES }, totalQuestions: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(1, limit), 100),
        select: { id: true, mode: true, targetSubject: true, score: true, totalQuestions: true, timeTakenSecs: true, verdict: true, config: true, createdAt: true },
    });
    const unfinalised = sessions.filter((s) => !s.config?.subjectScores).map((s) => s.id);
    const derived = subjectScoresBySession(await subjectRowsFor(userId, unfinalised));
    return buildMockHistory(sessions, derived);
}

module.exports = {
    finalizeSession, hideSession, mockHistory, buildMockHistory, sanitizeMeta, subjectRowsFor, mergeMarked,
    ExamHistoryError, HISTORY_MODES,
};
