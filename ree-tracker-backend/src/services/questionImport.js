// src/services/questionImport.js
//
// Questions another AI wrote (Admin › Import from another AI), on their way to
// the review queue. Each item is checked on its own, so one bad item doesn't
// cost the others, and a repeat of a stem already live or pending is refused.
const { randomUUID } = require('crypto');
const { hasUnbalancedMath } = require('@ree/shared');
const prisma = require('../config/db');
const { resolveTopic } = require('./topicResolver');
const { storageOrder, buildVersionSnapshot } = require('./reviewService');
const { questionCreateSchema } = require('../schemas/questionSchemas');
const { matchOption } = require('../utils/sanitizeOptions');
const { normalizeSubject, SUBJECT_VARIANTS } = require('../utils/subject');

// Array transactions take the same budget as interactive ones. Prisma's 5 s
// default is too short at about 180 ms a query from Render to Supabase.
const TX_OPTS = { maxWait: 5_000, timeout: 30_000 };

/** The same stem however it's spaced, cased or delimited. */
const stemKey = (text) => String(text ?? '').toLowerCase().replace(/[\s$]/g, '');

/** Which of `keys` are already a stem in the live bank or the open queue. */
async function existingStems(keys) {
    if (keys.length === 0) return new Set();
    const rows = await prisma.$queryRaw`
        SELECT k AS key FROM (
            SELECT lower(regexp_replace(text, '[[:space:]$]', '', 'g')) AS k FROM "Question"
            UNION
            SELECT lower(regexp_replace(text, '[[:space:]$]', '', 'g')) FROM "QuestionPendingReview" WHERE status = 'PENDING'
        ) stems WHERE k = ANY(${keys}::text[])`;
    return new Set(rows.map((r) => r.key));
}

/** Why an item can't be queued; an empty list means it can. */
async function itemProblems(data) {
    const reasons = [];
    if (!SUBJECT_VARIANTS[normalizeSubject(data.subject)]) reasons.push('invalid-subject');
    else if (!await resolveTopic(data.subject, data.subtopic, { crossSubject: false })) reasons.push('unknown-topic');
    if (!matchOption(data.answer, data.options)) reasons.push('key-not-an-option');
    if (!String(data.fixedExplanation ?? '').trim()) reasons.push('missing-explanation');
    if ([data.text, ...data.options, data.fixedExplanation].some(hasUnbalancedMath)) reasons.push('unbalanced-math');
    return reasons;
}

/** { queued: [ids], rejected: [{ index, reasons }] }, every queued row in one transaction. */
async function importQuestions(items, submittedBy) {
    const rejected = [];
    const candidates = [];
    for (let index = 0; index < items.length; index += 1) {
        const parsed = questionCreateSchema.safeParse(items[index]);
        if (!parsed.success) {
            rejected.push({ index, reasons: parsed.error.issues.map((iss) => `${iss.path.join('.')}:${iss.code}`) });
        } else {
            const reasons = await itemProblems(parsed.data);
            if (reasons.length) rejected.push({ index, reasons });
            else candidates.push({ index, data: parsed.data, key: stemKey(parsed.data.text) });
        }
    }

    const taken = await existingStems(candidates.map((c) => c.key));
    const rows = [];
    for (const { index, data, key } of candidates) {
        if (taken.has(key)) {
            rejected.push({ index, reasons: ['duplicate'] });
        } else {
            taken.add(key);
            rows.push({
                id: randomUUID(),
                subject: normalizeSubject(data.subject),
                subtopic: data.subtopic,
                text: data.text,
                options: storageOrder(data.options),
                answer: matchOption(data.answer, data.options),
                difficulty: Number(data.difficulty) || 2,
                difficultyTier: Math.min(3, Math.max(1, Math.round(Number(data.difficulty) || 2))),
                fixedExplanation: data.fixedExplanation,
                type: data.type === 'conceptual' ? 'conceptual' : 'calculation',
                bloomLevel: data.type === 'conceptual' ? 'UNDERSTAND' : 'APPLY',
                source: 'external_ai',
                submittedBy,
            });
        }
    }

    if (rows.length) {
        await prisma.$transaction([
            prisma.questionPendingReview.createMany({ data: rows }),
            prisma.questionVersion.createMany({
                data: rows.map((row) => ({ reviewId: row.id, action: 'SUBMITTED', editor: submittedBy, snapshot: buildVersionSnapshot(row) })),
            }),
        ], TX_OPTS);
    }
    rejected.sort((a, b) => a.index - b.index);
    return { queued: rows.map((r) => r.id), rejected };
}

module.exports = { importQuestions, stemKey, TX_OPTS };
