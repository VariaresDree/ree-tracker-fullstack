// src/services/questionPool.js
// Server-side question pool sampling, shared by /api/questions, /api/questions/review
// and battle creation. Centralizing it here means battle pools are built on the
// server (clients never assemble pools — they'd need answer keys to do so).
const prisma = require('../config/db');
// Single source of truth for subject spellings/filters (re-exported below so
// existing importers of getSubjectFilter from this module keep working).
const { getSubjectFilter } = require('../utils/subject');
const { BOARD_GROUPS, boardWeightedPick, ownBlueprint } = require('@ree/shared/boardItems');
const { getBoardBlueprint } = require('./boardBlueprint');

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

// `focus`: 'calculation' for calculation questions only, 'conceptual' for the
// rest (a missing type counts as conceptual, as Practice's filter has it), or
// null for both. Practice used to draw 1,000 rows and filter them itself.
// `subtopicId`: only questions tagged with that subtopic (Question.subtopicId).
// `topics`: two or more topics (Question.subtopic) to draw from, spread evenly
// across them like a whole subject (2026-11-16: "Algebra, Complex Numbers and
// Trigonometry"); one topic goes in `subtopic`.
async function sampleQuestionIds({ subjectValues = null, subtopic = null, limit = 50, excludeIds = [], focus = null, subtopicId = null, topics = null }) {
    const cap = capOf(limit);
    const exclude = (excludeIds || []).filter((id) => typeof id === 'string' && id);
    const kind = focus === 'calculation' || focus === 'conceptual' ? focus : null;
    const tag = typeof subtopicId === 'string' && subtopicId ? subtopicId : null;
    const among = Array.isArray(topics) && topics.length > 0 ? topics : null;

    let rows;
    if (subtopic && subjectValues) {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM "Question" WHERE "isFlagged" = false AND "subject" = ANY($1::text[]) AND "subtopic" = $2 AND NOT ("id" = ANY($4::text[])) AND ($5::text IS NULL OR (COALESCE("type", \'\') = \'calculation\') = ($5::text = \'calculation\')) AND ($6::text IS NULL OR "subtopicId" = $6) ORDER BY random() LIMIT $3',
            subjectValues, subtopic, cap, exclude, kind, tag,
        );
    } else if (subtopic) {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM "Question" WHERE "isFlagged" = false AND "subtopic" = $1 AND NOT ("id" = ANY($3::text[])) AND ($4::text IS NULL OR (COALESCE("type", \'\') = \'calculation\') = ($4::text = \'calculation\')) AND ($5::text IS NULL OR "subtopicId" = $5) ORDER BY random() LIMIT $2',
            subtopic, cap, exclude, kind, tag,
        );
    } else if (subjectValues) {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "subtopic" ORDER BY random()) AS rn FROM "Question" WHERE "isFlagged" = false AND "subject" = ANY($1::text[]) AND NOT ("id" = ANY($3::text[])) AND ($4::text IS NULL OR (COALESCE("type", \'\') = \'calculation\') = ($4::text = \'calculation\')) AND ($5::text IS NULL OR "subtopicId" = $5) AND ($6::text[] IS NULL OR "subtopic" = ANY($6::text[]))) t ORDER BY t.rn, random() LIMIT $2',
            subjectValues, cap, exclude, kind, tag, among,
        );
    } else {
        rows = await prisma.$queryRawUnsafe(
            'SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "subtopic" ORDER BY random()) AS rn FROM "Question" WHERE "isFlagged" = false AND NOT ("id" = ANY($2::text[])) AND ($3::text IS NULL OR (COALESCE("type", \'\') = \'calculation\') = ($3::text = \'calculation\')) AND ($4::text IS NULL OR "subtopicId" = $4) AND ($5::text[] IS NULL OR "subtopic" = ANY($5::text[]))) t ORDER BY t.rn, random() LIMIT $1',
            cap, exclude, kind, tag, among,
        );
    }
    return rows.map((r) => r.id);
}

const TOPICS_MAX = 40;
/**
 * The topics a request names, cleaned: a name or a list of names, 'All' and
 * blanks dropped, each once, at most TOPICS_MAX. [] means every topic.
 */
function topicList(value) {
    const out = [];
    for (const t of [].concat(value ?? [])) {
        if (typeof t !== 'string') continue;
        const name = t.trim().slice(0, 128);
        if (name && name !== 'All' && !out.includes(name)) out.push(name);
    }
    return out.slice(0, TOPICS_MAX);
}

const randomPick = (list, n) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
};

// The host's choice of how a battle's questions are picked, the same three a mock
// offers: null for an even spread. PRC's table if Admin's counts can't be read.
async function groupsForDraw(config = {}) {
    if (config.drawMode === 'own') return ownBlueprint(config.ownCounts);
    if (config.drawMode !== 'board') return null;
    try {
        return (await getBoardBlueprint())?.groups || BOARD_GROUPS;
    } catch {
        return BOARD_GROUPS;
    }
}

// A paper by topic counts, with the same picking a mock uses (boardWeightedPick):
// only ids and topics are read, so the whole subject's rows are small.
async function sampleDrawnIds({ subjectValues, subject, limit, groups, excludeIds }) {
    const rows = await prisma.question.findMany({
        where: { isFlagged: false, subject: { in: subjectValues }, id: { notIn: excludeIds || [] } },
        select: { id: true, subtopic: true },
    });
    return boardWeightedPick(rows, subject, capOf(limit), randomPick, groups).map((r) => r.id);
}

// Full question rows in the sampled random order. `avoidIds` are drawn last:
// only when the rest of the pool can't fill `limit` do any of them return
// (a small subtopic's rematch repeats as few as it must).
async function samplePool({ subject = null, subtopic = null, topics = null, limit = 50, avoidIds = null, groups = null, focus = null, subtopicId = null } = {}) {
    const subjFilter = getSubjectFilter(subject);
    const subjectValues = subjFilter ? (subjFilter.in || [subjFilter]) : null;
    const picked = topicList(topics && [].concat(topics).length ? topics : subtopic);
    const specificSubtopic = picked.length === 1 ? picked[0] : null;
    const among = picked.length > 1 ? picked : null;

    const spec = { subjectValues, subtopic: specificSubtopic, focus, subtopicId: specificSubtopic ? subtopicId : null, topics: among };
    // Picked topics are narrower than any blueprint: drawn evenly from them.
    let idList = groups && subjectValues && !specificSubtopic && !among && !subtopicId
        ? await sampleDrawnIds({ subjectValues, subject: normalizeSubject(subject), limit, groups, excludeIds: avoidIds || [] })
        : await sampleQuestionIds({ ...spec, limit, excludeIds: avoidIds || [] });
    const short = capOf(limit) - idList.length;
    if (avoidIds?.length && short > 0) {
        // Everything else is already in: the top-up can only be avoided ones.
        idList = [...idList, ...await sampleQuestionIds({ ...spec, limit: short, excludeIds: idList })];
    }
    return byIds(idList);
}

/** Question rows for `idList`, in that order; ids no longer in the bank drop out. */
async function byIds(idList, select = undefined) {
    if (!idList?.length) return [];
    const questions = await prisma.question.findMany({ where: { id: { in: idList } }, ...(select ? { select } : {}) });
    const orderMap = new Map(idList.map((id, i) => [id, i]));
    questions.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));
    return questions;
}

// PRC board Table-of-Specifications default blend, used as a fallback when the
// SyllabusWeight config table is empty/unreachable. Sourced from @ree/shared so
// the client's own fallback cannot drift from this one — there were four copies
// with two incompatible key casings.
const { DEFAULT_SYLLABUS_WEIGHTS, apportionItems, normalizeSubject } = require('@ree/shared');

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
async function sampleBlendedPool(totalCount = 100, { avoidIds = null, groups = null } = {}) {
    // Largest-remainder split, shared with the client's blended pool so both
    // sides compose a blend identically and the counts always sum to total.
    const n = apportionItems(totalCount, await getSyllabusWeights());
    const [math, esas, ee] = await Promise.all([
        samplePool({ subject: 'Mathematics', limit: n.Mathematics || 0, avoidIds, groups }),
        samplePool({ subject: 'ESAS', limit: n.ESAS || 0, avoidIds, groups }),
        samplePool({ subject: 'EE', limit: n.EE || 0, avoidIds, groups }),
    ]);
    return [...math, ...esas, ...ee];
}

module.exports = {
    getSubjectFilter, sampleQuestionIds, samplePool, byIds, topicList, TOPICS_MAX, sampleBlendedPool, groupsForDraw,
    getSyllabusWeights, normalizeSyllabusWeights, DEFAULT_SYLLABUS_WEIGHTS,
};
