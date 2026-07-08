// src/services/questionPool.js
// Server-side question pool sampling, shared by /api/questions, /api/questions/review
// and battle creation. Centralizing it here means battle pools are built on the
// server (clients never assemble pools — they'd need answer keys to do so).
const prisma = require('../config/db');
// Single source of truth for subject spellings/filters (re-exported below so
// existing importers of getSubjectFilter from this module keep working).
const { getSubjectFilter } = require('../utils/subject');

// Random sample of question ids. A flat `ORDER BY random()` is biased toward
// whichever subtopic dominates the bank, so when no subtopic is pinned we
// stratify: ROW_NUMBER() partitions by subtopic, then ordering by (rn, random())
// round-robins one item per subtopic before any subtopic contributes a second,
// guaranteeing breadth across the subject.
// SQL-injection note: the template fragments are static; all user-derived
// values go through positional parameters, and `cap` is coerced to a number.
async function sampleQuestionIds({ subjectValues = null, subtopic = null, limit = 50 }) {
    // `parseInt(limit) || 50` silently turned a legitimate limit:0 (a subject
    // whose blended share rounds to 0) into 50, and let a negative limit through
    // as `LIMIT -5` (a Postgres error). Coerce numerically: honor 0, default on
    // null/undefined/NaN/negative.
    const n = Number(limit);
    const cap = limit == null || !Number.isFinite(n) || n < 0 ? 50 : Math.min(Math.floor(n), 2000);
    let rows;
    if (subtopic) {
        rows = await prisma.$queryRawUnsafe(
            `SELECT id FROM "Question"
             WHERE "isFlagged" = false
             ${subjectValues ? `AND "subject" = ANY($1::text[])` : ''}
             AND "subtopic" = $${subjectValues ? 2 : 1}
             ORDER BY random()
             LIMIT ${cap}`,
            ...[subjectValues, subtopic].filter((v) => v !== null),
        );
    } else {
        rows = await prisma.$queryRawUnsafe(
            `SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (PARTITION BY "subtopic" ORDER BY random()) AS rn
                FROM "Question"
                WHERE "isFlagged" = false
                ${subjectValues ? `AND "subject" = ANY($1::text[])` : ''}
             ) t
             ORDER BY t.rn, random()
             LIMIT ${cap}`,
            ...[subjectValues].filter((v) => v !== null),
        );
    }
    return rows.map((r) => r.id);
}

// Full question rows in the sampled random order.
async function samplePool({ subject = null, subtopic = null, limit = 50 } = {}) {
    const subjFilter = getSubjectFilter(subject);
    const subjectValues = subjFilter ? (subjFilter.in || [subjFilter]) : null;
    const specificSubtopic = subtopic && subtopic !== 'All' ? String(subtopic).trim() : null;

    const idList = await sampleQuestionIds({ subjectValues, subtopic: specificSubtopic, limit });
    if (idList.length === 0) return [];

    const questions = await prisma.question.findMany({ where: { id: { in: idList } } });
    const orderMap = new Map(idList.map((id, i) => [id, i]));
    questions.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
    return questions;
}

// PRC board TOS blend: 25% Math / 30% ESAS / 45% EE (matches the 25/30/45
// split the Arena lobby used when it still assembled pools client-side).
async function sampleBlendedPool(totalCount = 100) {
    const mathN = Math.round(totalCount * 0.25);
    const esasN = Math.round(totalCount * 0.30);
    const eeN = Math.max(0, totalCount - mathN - esasN);
    const [math, esas, ee] = await Promise.all([
        samplePool({ subject: 'Mathematics', limit: mathN }),
        samplePool({ subject: 'ESAS', limit: esasN }),
        samplePool({ subject: 'EE', limit: eeN }),
    ]);
    return [...math, ...esas, ...ee];
}

module.exports = { getSubjectFilter, sampleQuestionIds, samplePool, sampleBlendedPool };
