// src/services/referenceFormCache.js
//
// Per-subject test characteristic curves for the forecast (engine/forecast).
// The TCC maps a subject ability to the score a candidate would expect on a
// board-length paper drawn from THIS bank — so it is computed from the served
// item parameters of a random sample of live questions, not assumed.
//
// Global (identical for every user) and slow-moving, so it is cached for ten
// minutes behind a single-flight load. A failed load falls back to the
// average-item curve rather than failing the forecast, and is not cached, so
// the next request retries.

'use strict';

const prisma = require('../config/db');
const logger = require('../utils/logger');
const { normalizeSubject } = require('@ree/shared');
const { itemParams } = require('../engine/irt');
const { buildTccGrid, SUBJECTS } = require('../engine/forecast');

const TTL_MS = 10 * 60 * 1000;
const SAMPLE = 1500;          // live items sampled across the bank
const PER_SUBJECT_MAX = 400;  // items per subject's reference form

let cache = null;   // { at, value }
let inFlight = null;

/** Pure: sampled rows → { subject: tccGrid }. Exported for tests. */
function buildForms(rows) {
    const bySubject = Object.fromEntries(SUBJECTS.map((s) => [s, []]));
    for (const r of rows || []) {
        const s = normalizeSubject(r.subject);
        if (bySubject[s] && bySubject[s].length < PER_SUBJECT_MAX) bySubject[s].push(itemParams(r));
    }
    return Object.fromEntries(SUBJECTS.map((s) => [s, buildTccGrid(bySubject[s])]));
}

async function load() {
    const rows = await prisma.$queryRaw`
        SELECT "subject", "irtA", "irtB", "irtC", "difficulty"
        FROM "Question"
        WHERE "isFlagged" = false
        ORDER BY random()
        LIMIT ${SAMPLE}`;
    return buildForms(rows);
}

async function getTccBySubject() {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
    if (!inFlight) {
        inFlight = load()
            .then((value) => { cache = { at: Date.now(), value }; return value; })
            .catch((err) => {
                logger.warn('reference form load failed; using the average-item curve', { error: err.message });
                return buildForms([]);
            })
            .finally(() => { inFlight = null; });
    }
    return inFlight;
}

/** Test seam. */
function _reset() { cache = null; inFlight = null; }

module.exports = { getTccBySubject, buildForms, _reset };
