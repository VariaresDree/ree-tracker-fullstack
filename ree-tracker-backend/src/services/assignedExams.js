// src/services/assignedExams.js
//
// Exams the admin puts together from the question bank (Admin › Assigned exams)
// for every learner to take (Exams › Assigned). An exam keeps question IDS: a
// key fixed in the bank is fixed here too, and a question deleted from the
// bank drops out when the exam is read (`missing` counts them for the admin).
//
// A sitting of an exam is an ordinary ExamSession, tagged in its config with
// `assignedExamId` by examHistory.finalizeSession (tagFor checks it belongs).
// The reviewer's results and the class average read those tags.

'use strict';

const prisma = require('../config/db');
const { normalizeSubject, fallbackDisplayName } = require('@ree/shared');
const questionPool = require('./questionPool');
const { lockedQuestionIds } = require('./answerGate');
const { MIN_ITEMS } = require('../schemas/assignedExamSchemas');

class AssignedExamError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const LIST_SELECT = {
    id: true, title: true, description: true, subject: true, questionIds: true, timeLimitSecs: true,
    status: true, publishedAt: true, createdAt: true, updatedAt: true,
};

// What the builder shows of each picked question (the admin sees the key).
const ADMIN_QUESTION_SELECT = {
    id: true, subject: true, subtopic: true, text: true, options: true, answer: true,
    fixedExplanation: true, difficulty: true, difficultyTier: true, irtB: true, type: true, isFlagged: true,
};

// What a learner's device needs to run the exam (the retake path's shape).
const RUN_SELECT = {
    id: true, subject: true, subtopic: true, text: true, options: true, answer: true, fixedExplanation: true, type: true, difficulty: true,
};

// A learner sees the class average only once this many have taken the exam:
// with two, each could work out the other's score.
const CLASS_MIN = 3;
const PASS = 70;

/** One subject when every question shares it, else 'Mixed'. */
function subjectOf(questions) {
    const subjects = new Set((questions || []).map((q) => normalizeSubject(q.subject)));
    return subjects.size === 1 ? [...subjects][0] : 'Mixed';
}

/** The ids still in the bank, in the exam's order, and how many dropped out. */
async function liveQuestions(questionIds, select) {
    const questions = await questionPool.byIds(questionIds, select);
    return { questions, missing: (questionIds?.length || 0) - questions.length };
}

/**
 * Finished sittings tagged with these exams, oldest first. A hidden sitting
 * still counts: hiding takes it off the learner's list, it doesn't undo it.
 */
async function sittingsFor(examIds) {
    if (!examIds.length) return [];
    return prisma.$queryRaw`
        SELECT "id", "userId", "score", "totalQuestions", "mode", "createdAt",
               "config"->>'assignedExamId' AS "examId"
        FROM "ExamSession"
        WHERE "config"->>'assignedExamId' = ANY(${examIds}::text[])
          AND "config"->>'finalizedAt' IS NOT NULL
          AND "totalQuestions" > 0
        ORDER BY "createdAt" ASC`;
}

const pctOf = (row) => Math.round((row.score / row.totalQuestions) * 100);

/**
 * Pure: sittings (oldest first) → per exam, per learner, the first sitting
 * (the honest one), the best, how many and the last; and the class's numbers,
 * from first sittings.
 */
function summarize(rows) {
    const byExam = new Map();
    for (const r of rows || []) {
        if (!byExam.has(r.examId)) byExam.set(r.examId, new Map());
        const learners = byExam.get(r.examId);
        const pct = pctOf(r);
        const was = learners.get(r.userId);
        if (!was) {
            learners.set(r.userId, { userId: r.userId, first: pct, firstSessionId: r.id, firstMode: r.mode, best: pct, attempts: 1, last: r.createdAt });
        } else {
            Object.assign(was, { best: Math.max(was.best, pct), attempts: was.attempts + 1, last: r.createdAt });
        }
    }
    const out = {};
    for (const [examId, learners] of byExam) {
        const list = [...learners.values()];
        const firsts = list.map((l) => l.first);
        out[examId] = {
            learners: list,
            takers: list.length,
            average: Math.round(firsts.reduce((a, b) => a + b, 0) / list.length),
            passed: firsts.filter((p) => p >= PASS).length,
        };
    }
    return out;
}

async function listForAdmin() {
    const exams = await prisma.assignedExam.findMany({ orderBy: { updatedAt: 'desc' }, select: LIST_SELECT });
    const stats = summarize(await sittingsFor(exams.map((e) => e.id)));
    return exams.map((e) => ({
        ...e, itemCount: e.questionIds.length, takers: stats[e.id]?.takers || 0, average: stats[e.id]?.average ?? null,
    }));
}

async function getForAdmin(id) {
    const exam = await prisma.assignedExam.findUnique({ where: { id }, select: LIST_SELECT });
    if (!exam) throw new AssignedExamError(404, 'That exam isn’t there any more.');
    const [{ questions, missing }, rows] = await Promise.all([liveQuestions(exam.questionIds, ADMIN_QUESTION_SELECT), sittingsFor([id])]);
    return { ...exam, questions, missing, takers: summarize(rows)[id]?.takers || 0 };
}

/**
 * The fields to store for `input` (already validated), with the questions
 * deleted from the bank since the admin picked them left out. Refuses an exam
 * that would be left too short.
 */
async function prepare(input, prior = null) {
    const { questions } = await liveQuestions(input.questionIds, { id: true, subject: true });
    if (questions.length < MIN_ITEMS) {
        throw new AssignedExamError(422, `Only ${questions.length} of those questions are still in the bank. Pick at least ${MIN_ITEMS}.`);
    }
    const publishing = input.status === 'published';
    return {
        title: input.title,
        description: input.description,
        questionIds: questions.map((q) => q.id),
        subject: subjectOf(questions),
        timeLimitSecs: input.timeLimitSecs,
        status: input.status,
        // Posted once: re-saving a published exam keeps its date in learners' lists.
        publishedAt: publishing ? (prior?.publishedAt || new Date()) : null,
    };
}

async function create(input, userId) {
    const data = await prepare(input);
    return prisma.assignedExam.create({ data: { ...data, createdBy: userId }, select: LIST_SELECT });
}

async function update(id, input) {
    const prior = await prisma.assignedExam.findUnique({ where: { id }, select: { publishedAt: true } });
    if (!prior) throw new AssignedExamError(404, 'That exam isn’t there any more.');
    return prisma.assignedExam.update({ where: { id }, data: await prepare(input, prior), select: LIST_SELECT });
}

/** Publish or take back to draft, without resending the questions. */
async function setStatus(id, status) {
    const exam = await prisma.assignedExam.findUnique({ where: { id }, select: LIST_SELECT });
    if (!exam) throw new AssignedExamError(404, 'That exam isn’t there any more.');
    return update(id, { ...exam, status });
}

async function remove(id) {
    const { count } = await prisma.assignedExam.deleteMany({ where: { id } });
    if (count === 0) throw new AssignedExamError(404, 'That exam isn’t there any more.');
}

/** The published exams, each with this learner's tries and, once they've sat it, the class's. */
async function listForLearner(userId) {
    const exams = await prisma.assignedExam.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        select: { id: true, title: true, description: true, subject: true, questionIds: true, timeLimitSecs: true, publishedAt: true },
    });
    const stats = summarize(await sittingsFor(exams.map((e) => e.id)));
    return exams.map(({ questionIds, ...e }) => {
        const s = stats[e.id];
        const me = s?.learners.find((l) => l.userId === userId);
        return {
            ...e,
            itemCount: questionIds.length,
            mine: me ? { attempts: me.attempts, best: me.best, first: me.first } : null,
            class: me && s.takers >= CLASS_MIN ? { average: s.average, takers: s.takers } : null,
        };
    });
}

/**
 * A published exam's questions, ready to run, with their keys: the device
 * grades for its own results screen, as Practice does, and the server grades
 * again. Refused while the learner is in a battle that holds any of them.
 */
async function questionsForLearner(id, userId) {
    const exam = await prisma.assignedExam.findFirst({
        where: { id, status: 'published' },
        select: { id: true, title: true, questionIds: true, timeLimitSecs: true },
    });
    if (!exam) throw new AssignedExamError(404, 'That exam isn’t available any more.');
    if ((await lockedQuestionIds(userId, exam.questionIds)).size > 0) {
        throw new AssignedExamError(409, 'You’re in a battle with some of these questions. Finish it first.');
    }
    const questions = await questionPool.byIds(exam.questionIds, RUN_SELECT);
    return { id: exam.id, title: exam.title, timeLimitSecs: exam.timeLimitSecs, questions };
}

/**
 * The tag for a sitting of `examId`, or null: only when every question the
 * learner answered in it is one of the exam's, so no other sitting lands in
 * the reviewer's results.
 */
async function tagFor(examId, userId, sessionId) {
    const exam = await prisma.assignedExam.findUnique({ where: { id: examId }, select: { id: true, title: true, questionIds: true } });
    if (!exam) return null;
    const answered = await prisma.questionAttempt.findMany({ where: { userId, sessionId }, select: { questionId: true } });
    const inExam = new Set(exam.questionIds);
    if (answered.length === 0 || !answered.every((a) => inExam.has(a.questionId))) return null;
    return { assignedExamId: exam.id, assignedExamTitle: exam.title };
}

/**
 * For the reviewer: each learner's first, best and number of sittings, and
 * how each question went on first sittings, hardest first.
 */
async function results(id) {
    const exam = await prisma.assignedExam.findUnique({ where: { id }, select: LIST_SELECT });
    if (!exam) throw new AssignedExamError(404, 'That exam isn’t there any more.');
    const s = summarize(await sittingsFor([id]))[id] || { learners: [], takers: 0, average: null, passed: 0 };
    const users = s.learners.length
        ? await prisma.user.findMany({ where: { id: { in: s.learners.map((l) => l.userId) } }, select: { id: true, displayName: true } })
        : [];
    const nameOf = new Map(users.map((u) => [u.id, u.displayName]));
    const firstIds = s.learners.map((l) => l.firstSessionId);
    const perItem = firstIds.length
        ? await prisma.$queryRaw`
            SELECT "questionId", COUNT(*)::int AS "answered", COUNT(*) FILTER (WHERE "isCorrect")::int AS "correct"
            FROM "QuestionAttempt"
            WHERE "sessionId" = ANY(${firstIds}::text[])
            GROUP BY "questionId"`
        : [];
    const shown = await questionPool.byIds(perItem.map((r) => r.questionId), { id: true, subject: true, subtopic: true, text: true });
    const questionOf = new Map(shown.map((q) => [q.id, q]));
    const items = perItem
        .map((r) => ({ ...r, pct: Math.round((r.correct / r.answered) * 100), question: questionOf.get(r.questionId) || null }))
        .sort((a, b) => a.pct - b.pct || b.answered - a.answered);
    return {
        exam: { ...exam, itemCount: exam.questionIds.length },
        takers: s.takers,
        average: s.takers ? s.average : null,
        passed: s.passed,
        learners: s.learners
            .map(({ firstSessionId: _first, ...l }) => ({ ...l, displayName: nameOf.get(l.userId) || fallbackDisplayName(l.userId) }))
            .sort((a, b) => b.first - a.first),
        items,
    };
}

module.exports = {
    AssignedExamError, LIST_SELECT, CLASS_MIN, subjectOf, summarize, listForAdmin, getForAdmin, create, update, setStatus, remove,
    listForLearner, questionsForLearner, tagFor, results,
};
