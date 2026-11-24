// src/services/assignedExams.js
//
// Exams the admin puts together from the question bank (Admin › Assigned exams)
// for every learner to take (Exams › Assigned). An exam keeps question IDS: a
// key fixed in the bank is fixed here too, and a question deleted from the
// bank drops out when the exam is read (`missing` counts them for the admin).

'use strict';

const prisma = require('../config/db');
const { normalizeSubject } = require('@ree/shared');
const questionPool = require('./questionPool');
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

async function listForAdmin() {
    const exams = await prisma.assignedExam.findMany({ orderBy: { updatedAt: 'desc' }, select: LIST_SELECT });
    return exams.map((e) => ({ ...e, itemCount: e.questionIds.length }));
}

async function getForAdmin(id) {
    const exam = await prisma.assignedExam.findUnique({ where: { id }, select: LIST_SELECT });
    if (!exam) throw new AssignedExamError(404, 'That exam isn’t there any more.');
    const { questions, missing } = await liveQuestions(exam.questionIds, ADMIN_QUESTION_SELECT);
    return { ...exam, questions, missing };
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

module.exports = {
    AssignedExamError, LIST_SELECT, subjectOf, listForAdmin, getForAdmin, create, update, setStatus, remove,
};
