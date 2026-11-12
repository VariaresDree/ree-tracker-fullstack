// src/services/questionReports.js
//
// Learners' reports on questions (Practice, a mock, the Gauntlet: "Report a
// problem"), for Admin › Question bank › Reports. A report is a QuestionFlag
// row. Three learners agreeing take a question out of the bank on their own
// (PATCH /:id/flag); below that, nothing showed a report to anyone, and 65 sat
// unseen on 64 questions (2026-11-12). Every open report is listed here now.
//
// Resolving keeps the rows (resolvedAt, resolution, resolvedBy), so the record
// stays; a learner reporting the question again reopens theirs.
const prisma = require('../config/db');
const { getSubjectFilter } = require('../utils/subject');

const PAGE = 25;
const RESOLUTIONS = ['fixed', 'dismissed', 'removed'];
const OPEN = { resolvedAt: null };

/** How many questions have an open report. */
async function openReportCount() {
    const rows = await prisma.questionFlag.groupBy({ by: ['questionId'], where: OPEN });
    return rows.length;
}

/**
 * A page of reported questions, most-reported first, then most recent. Only
 * the shown page's questions are read in full (about 1.2 KB each).
 */
async function openReports({ subject, limit = PAGE, offset = 0 } = {}) {
    const groups = await prisma.questionFlag.groupBy({
        by: ['questionId'], where: OPEN, _count: { _all: true }, _min: { createdAt: true }, _max: { createdAt: true },
    });
    if (!groups.length) return { items: [], total: 0 };

    const subjFilter = getSubjectFilter(subject);
    let ids = groups.map((g) => g.questionId);
    if (subjFilter) {
        const inSubject = await prisma.question.findMany({ where: { id: { in: ids }, subject: subjFilter }, select: { id: true } });
        const keep = new Set(inSubject.map((q) => q.id));
        ids = ids.filter((id) => keep.has(id));
    }
    const byId = new Map(groups.map((g) => [g.questionId, g]));
    ids.sort((a, b) => (byId.get(b)._count._all - byId.get(a)._count._all)
        || (byId.get(b)._max.createdAt - byId.get(a)._max.createdAt));
    const take = Math.min(Math.max(1, limit), PAGE);
    const pageIds = ids.slice(Math.max(0, offset), Math.max(0, offset) + take);

    const [questions, flags] = await Promise.all([
        prisma.question.findMany({
            where: { id: { in: pageIds } },
            select: { id: true, subject: true, subtopic: true, type: true, difficulty: true, text: true, options: true, answer: true, fixedExplanation: true, isFlagged: true },
        }),
        prisma.questionFlag.findMany({ where: { questionId: { in: pageIds }, ...OPEN }, select: { questionId: true, reason: true } }),
    ]);
    const qById = new Map(questions.map((q) => [q.id, q]));
    const reasons = new Map();
    for (const f of flags) {
        const tally = reasons.get(f.questionId) || {};
        const key = f.reason || 'No reason given';
        tally[key] = (tally[key] || 0) + 1;
        reasons.set(f.questionId, tally);
    }
    return {
        total: ids.length,
        items: pageIds.filter((id) => qById.has(id)).map((id) => {
            const g = byId.get(id);
            return {
                question: qById.get(id),
                reports: g._count._all,
                reasons: reasons.get(id) || {},
                firstAt: g._min.createdAt,
                lastAt: g._max.createdAt,
            };
        }),
    };
}

/**
 * Closes a question's open reports, with an optional note the learners see. 'fixed' and 'dismissed' put it back in the
 * bank if three reports had taken it out; 'removed' takes it out (isFlagged).
 * @returns {{ resolved: number } | null} null when there's no such question
 */
async function resolveReports(questionId, resolution, adminId, note = '') {
    if (!RESOLUTIONS.includes(resolution)) throw new Error('Unknown resolution.');
    const exists = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!exists) return null;
    const [closed] = await prisma.$transaction([
        prisma.questionFlag.updateMany({ where: { questionId, ...OPEN }, data: { resolvedAt: new Date(), resolution, resolvedBy: adminId, resolutionNote: note || null } }),
        prisma.question.update({ where: { id: questionId }, data: { isFlagged: resolution === 'removed' } }),
    ]);
    return { resolved: closed.count };
}

module.exports = { PAGE, RESOLUTIONS, openReportCount, openReports, resolveReports };
