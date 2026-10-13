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
//
// `excludeIds` leaves those questions out (a rematch, avoiding the questions
// whose key the last battle revealed). It is always bound, as an empty array
// when there are none: `id = ANY('{}')` is false, so nothing is excluded.
//
// SQL-injection safety: every query below is a FULLY STATIC string literal —
// there is no `${}` interpolation of any kind (not even the numeric LIMIT).
// Every value, including `cap`, is bound as a positional parameter. This is
// what lets scripts/audit-sql-interpolation.js be strict (fail on any `${` in a
// raw query) with no allowlist. Do not reintroduce template interpolation here.
function capOf(limit) {
    // Coerce numerically: honor 0 (a subject whose blended share rounds to 0),
    // default on null/undefined/NaN/negative (a negative would be `LIMIT -5`).
    const n = Number(limit);
    return limit == null || !Number.isFinite(n) || n < 0 ? 50 : Math.min(Math.floor(n), 2000);
}

async function sampleQuestionIds({ subjectValues = null, subtopic = null, limit = 50, excludeIds = [] }) {
    const cap = capOf(limit);
    const exclude = (excludeIds || []).filter((id) => typeof id === 'string' && id);

    let rows;
    if (subtopic && subjectValues) {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM "Question" WHERE "isFlagged" = false AND "subject" = ANY($1::text[]) AND "subtopic" = $2 AND NOT ("id" = ANY($4::text[])) ORDER BY random() LIMIT $3',
            subjectValues, subtopic, cap, exclude,
        );
    } else if (subtopic) {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM "Question" WHERE "isFlagged" = false AND "subtopic" = $1 AND NOT ("id" = ANY($3::text[])) ORDER BY random() LIMIT $2',
            subtopic, cap, exclude,
        );
    } else if (subjectValues) {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "subtopic" ORDER BY random()) AS rn FROM "Question" WHERE "isFlagged" = false AND "subject" = ANY($1::text[]) AND NOT ("id" = ANY($3::text[]))) t ORDER BY t.rn, random() LIMIT $2',
            subjectValues, cap, exclude,
        );
    } else {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "subtopic" ORDER BY random()) AS rn FROM "Question" WHERE "isFlagged" = false AND NOT ("id" = ANY($2::text[]))) t ORDER BY t.rn, random() LIMIT $1',
            cap, exclude,
        );
    }
    return rows.map((r) => r.id);
}

// Full question rows in the sampled random order. `avoidIds` are drawn last:
// only when the rest of the pool can't fill `limit` do any of them return
// (a small subtopic's rematch repeats as few as it must).
async function samplePool({ subject = null, subtopic = null, limit = 50, avoidIds = null } = {}) {
    const subjFilter = getSubjectFilter(subject);
    const subjectValues = subjFilter ? (subjFilter.in || [subjFilter]) : null;
    const specificSubtopic = subtopic && subtopic !== 'All' ? String(subtopic).trim() : null;

    const spec = { subjectValues, subtopic: specificSubtopic };
    let idList = await sampleQuestionIds({ ...spec, limit, excludeIds: avoidIds || [] });
    const short = capOf(limit) - idList.length;
    if (avoidIds?.length && short > 0) {
        // Everything else is already in: the top-up can only be avoided ones.
        idList = [...idList, ...await sampleQuestionIds({ ...spec, limit: short, excludeIds: idList })];
    }
    if (idList.length === 0) return [];

    const questions = await prisma.question.findMany({ where: { id: { in: idList } } });
    const orderMap = new Map(idList.map((id, i) => [id, i]));
    questions.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
    return questions;
}

// PRC board Table-of-Specifications default blend, used as a fallback when the
// SyllabusWeight config table is empty/unreachable. Sourced from @ree/shared so
// the client's own fallback cannot drift from this one — there were four copies
// with two incompatible key casings.
const { DEFAULT_SYLLABUS_WEIGHTS, apportionItems } = require('@ree/shared');

// Pure: turn SyllabusWeight rows into a {subject: weight} map, backfilling any
// missing canonical subject from the default so callers always get all three.
function normalizeSyllabusWeights(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return { ...DEFAULT_SYLLABUS_WEIGHTS };
    const out = {};
    for (const r of rows) if (r && r.subject) out[r.subject] = r.weight;
    for (const k of Object.keys(DEFAULT_SYLLABUS_WEIGHTS)) {
        if (typeof out[k] !== 'number' || !Number.isFinite(out[k])) out[k] = DEFAULT_SYLLABUS_WEIGHTS[k];
    }
    return out;
}

// Read the runtime syllabus weights; never throws (falls back to the default).
async function getSyllabusWeights() {
    try {
        return normalizeSyllabusWeights(await prisma.syllabusWeight.findMany());
    } catch {
        return { ...DEFAULT_SYLLABUS_WEIGHTS };
    }
}

// PRC board TOS blend, driven by the SyllabusWeight config table (Math/ESAS/EE).
async function sampleBlendedPool(totalCount = 100, { avoidIds = null } = {}) {
    // Largest-remainder split, shared with the client's blended pool so both
    // sides compose a blend identically and the counts always sum to total.
    const n = apportionItems(totalCount, await getSyllabusWeights());
    const [math, esas, ee] = await Promise.all([
        samplePool({ subject: 'Mathematics', limit: n.Mathematics || 0, avoidIds }),
        samplePool({ subject: 'ESAS', limit: n.ESAS || 0, avoidIds }),
        samplePool({ subject: 'EE', limit: n.EE || 0, avoidIds }),
    ]);
    return [...math, ...esas, ...ee];
}

module.exports = {
    getSubjectFilter, sampleQuestionIds, samplePool, sampleBlendedPool,
    getSyllabusWeights, normalizeSyllabusWeights, DEFAULT_SYLLABUS_WEIGHTS,
};
