// src/services/catCandidates.js
//
// The candidate set an adaptive pick is made from. /exams/next-item used to
// read `findMany({ take: 80 })` with no ordering — the same first 80 rows on
// every call — and filter recently-seen ids only afterwards, in memory. This
// draws a RANDOM sample, already windowed around θ, with exclusions applied in
// SQL:
//   • calibrated items whose b lies within ±1.5 of θ (the informative band);
//   • every uncalibrated item (irtB IS NULL) — those are placed by their author
//     rating (engine/irt.itemParams), which SQL can't see, so they compete on
//     information once loaded.

'use strict';

const { Prisma } = require('@prisma/client');
const prisma = require('../config/db');
const { normalizeSubject, SUBJECT_VARIANTS } = require('@ree/shared');

const WINDOW = 1.5;

/**
 * @param {object} opts
 * @param {string} [opts.subject]   a subject, or 'All'/'Blended'/undefined for the whole bank
 * @param {number} opts.theta
 * @param {string[]} [opts.excludeIds]
 * @param {number} [opts.take]
 */
async function catCandidates({ subject, theta, excludeIds = [], take = 60 }) {
    const t = Number.isFinite(theta) ? theta : 0;
    const scoped = subject && subject !== 'All' && subject !== 'Blended';
    const variants = scoped ? (SUBJECT_VARIANTS[normalizeSubject(subject)] || [subject]) : null;
    const subjectClause = variants
        ? Prisma.sql`AND "subject" = ANY(${variants}::text[])`
        : Prisma.empty;
    return prisma.$queryRaw`
        SELECT "id", "subject", "subtopic", "topicId", "text", "options", "type",
               "irtA", "irtB", "irtC", "difficulty"
        FROM "Question"
        WHERE "isFlagged" = false
          ${subjectClause}
          AND NOT ("id" = ANY(${excludeIds}::text[]))
          AND ("irtB" IS NULL OR "irtB" BETWEEN ${t - WINDOW} AND ${t + WINDOW})
        ORDER BY random()
        LIMIT ${take}`;
}

module.exports = { catCandidates, WINDOW };
