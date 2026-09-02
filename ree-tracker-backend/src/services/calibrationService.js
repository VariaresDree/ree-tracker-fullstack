// src/services/calibrationService.js
// Phase 3.4 — the ONE recalibration pipeline, shared by scripts/calibrate.js
// (nightly cron) and POST /api/admin/calibrate (on-demand). Replaces the old
// duplicated per-item grid scan that graded historical responses with each
// user's CURRENT global theta (circular).
//
// Per canonical subject (Mathematics / ESAS / EE):
//   1. response matrix = each user's FIRST attempt per question (repeats are
//      contaminated by learning/memorization),
//   2. Bayesian-anchored JMLE (engine/irt.jmleCalibrate) — person step is
//      anchored to live (thetaRating, standardError) priors so the item scale
//      stays on the scale the app already serves,
//   3. raw fits stored in Question.empiricalA/empiricalB/empiricalN; the
//      SERVED irtA/irtB get the author blend (w = n/(n+30), per the roadmap
//      spec: shrink toward the author estimate when n < 30),
//   4. person estimates upsert UserAbility(userId, subject) — per-subject
//      ability that the forecast prefers over its hit-rate fallback.
const prisma = require('../config/db');
const { jmleCalibrate } = require('../engine/irt');
const { getSubjectFilter } = require('../utils/subject');

const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];
// Author prior weight: the author estimate counts like 30 responses, so the
// blend crosses 50% empirical exactly at the spec's n=30 threshold.
const AUTHOR_PRIOR_N = 30;
// Author-assigned Question.difficulty is b-scale by app convention
// (`irtB ?? difficulty` everywhere) but unvalidated — clamp to a sane band.
const AUTHOR_B_BOUNDS = [-3, 3];

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Pure: reduce a chronological attempt list to one response per
 * (person, item) — the first exposure.
 * @param {Array<{userId, questionId, isCorrect}>} attempts sorted createdAt asc
 */
function buildResponseMatrix(attempts) {
    const seen = new Set();
    const responses = [];
    for (const a of attempts || []) {
        if (!a?.userId || !a?.questionId) continue;
        const key = `${a.userId} ${a.questionId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        responses.push({ personId: a.userId, itemId: a.questionId, correct: !!a.isCorrect });
    }
    return responses;
}

/**
 * Pure: blend the empirical fit with the author estimate by response count.
 * n = 0 → pure author (b = difficulty, a = 1); n = 30 → midpoint; large n →
 * pure empirical. Authors don't rate discrimination, so `a` shrinks toward
 * the 1.0 default.
 */
function blendParams({ empiricalA, empiricalB, n, authorDifficulty }) {
    const authorB = clamp(
        Number.isFinite(authorDifficulty) ? authorDifficulty : 0,
        AUTHOR_B_BOUNDS[0], AUTHOR_B_BOUNDS[1],
    );
    if (!Number.isFinite(empiricalB) || !Number.isFinite(n) || n <= 0) {
        return { a: 1.0, b: authorB, w: 0 };
    }
    const w = n / (n + AUTHOR_PRIOR_N);
    const empA = Number.isFinite(empiricalA) ? empiricalA : 1.0;
    return { a: w * empA + (1 - w) * 1.0, b: w * empiricalB + (1 - w) * authorB, w };
}

/**
 * Run the full recalibration. Never prints — callers render the report.
 *
 * @param {{dryRun?:boolean, minN?:number}} opts
 *   minN — minimum first-attempt responses for an item to get an empirical
 *   fit (default 10; below it the blend serves pure author, same as today).
 * @returns {Promise<object>} report
 */
async function runRecalibration({ dryRun = false, minN = 10 } = {}) {
    const t0 = Date.now();
    const [users, abilityRows] = await Promise.all([
        prisma.user.findMany({ select: { id: true, thetaRating: true, standardError: true } }),
        prisma.userAbility.findMany(),
    ]);
    const globalPrior = Object.fromEntries(users.map((u) => [
        u.id, { theta: u.thetaRating ?? 0, se: u.standardError ?? 1.0 },
    ]));
    const abilityBySubject = new Map(); // subject -> Map(userId -> {theta, se})
    for (const a of abilityRows) {
        if (!abilityBySubject.has(a.subject)) abilityBySubject.set(a.subject, new Map());
        abilityBySubject.get(a.subject).set(a.userId, { theta: a.theta, se: a.se });
    }

    const report = { dryRun, minN, subjects: {}, totals: { responses: 0, itemsFitted: 0, itemsSkippedLowN: 0, abilitiesUpserted: 0 } };

    for (const subject of SUBJECTS) {
        const filter = getSubjectFilter(subject);
        const vals = filter?.in || [subject];

        // Paged, not a single unbounded findMany. This loaded EVERY attempt for
        // the subject into the Node heap at once — three times per run, once per
        // subject — on a free-tier instance. At a few hundred thousand attempts
        // that is an OOM waiting to happen, and the relation filter joins
        // QuestionAttempt -> Question, which needed the questionId index this PR
        // also adds.
        //
        // Keyset pagination on the primary key: stable under concurrent inserts
        // and it does not degrade the way OFFSET does on later pages.
        const attempts = [];
        const PAGE = 5000;
        let cursor = null;
        for (;;) {
            const page = await prisma.questionAttempt.findMany({
                where: { question: { subject: { in: vals } } },
                orderBy: { id: 'asc' },
                take: PAGE,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                select: { id: true, userId: true, questionId: true, isCorrect: true },
            });
            if (page.length === 0) break;
            attempts.push(...page);
            if (page.length < PAGE) break;
            cursor = page[page.length - 1].id;
        }
        const responses = buildResponseMatrix(attempts);
        if (responses.length === 0) {
            report.subjects[subject] = { responses: 0, persons: 0, itemsFitted: 0, itemsSkippedLowN: 0, sample: [] };
            continue;
        }

        const itemIds = [...new Set(responses.map((r) => r.itemId))];
        const questions = await prisma.question.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, difficulty: true, irtA: true, irtB: true, empiricalA: true, empiricalB: true },
        });
        const qById = Object.fromEntries(questions.map((q) => [q.id, q]));

        // Seeds: previous empirical fit if any, else the served params, else
        // the author estimate — keeps successive nightly runs stable.
        const itemSeeds = {};
        for (const q of questions) {
            itemSeeds[q.id] = {
                a: q.empiricalA ?? q.irtA ?? 1,
                b: q.empiricalB ?? q.irtB ?? clamp(q.difficulty ?? 0, AUTHOR_B_BOUNDS[0], AUTHOR_B_BOUNDS[1]),
            };
        }
        const subjectAbility = abilityBySubject.get(subject);
        const personPriors = {};
        for (const r of responses) {
            if (!personPriors[r.personId]) {
                personPriors[r.personId] = subjectAbility?.get(r.personId) || globalPrior[r.personId] || { theta: 0, se: 1.0 };
            }
        }

        const { items, persons } = jmleCalibrate(
            { responses, personPriors, itemSeeds },
            { minItemN: minN },
        );

        // Per-item writes: raw empirical + author-blended served params.
        const now = new Date();
        const sample = [];
        let fitted = 0;
        // Chunked so one transaction never spans the whole bank (Prisma's
        // interactive-transaction budget) while still being atomic per chunk.
        const WRITE_CHUNK = 200;
        const pendingItemWrites = [];
        const flushItemWrites = async () => {
            while (pendingItemWrites.length > 0) {
                await prisma.$transaction(pendingItemWrites.splice(0, WRITE_CHUNK));
            }
        };
        for (const [itemId, fit] of Object.entries(items)) {
            const q = qById[itemId];
            const blend = blendParams({
                empiricalA: fit.a, empiricalB: fit.b, n: fit.n,
                authorDifficulty: q?.difficulty,
            });
            if (sample.length < 10) {
                sample.push({
                    id: itemId, n: fit.n,
                    empiricalA: round3(fit.a), empiricalB: round3(fit.b),
                    servedA: round3(blend.a), servedB: round3(blend.b),
                    authorB: round3(clamp(q?.difficulty ?? 0, AUTHOR_B_BOUNDS[0], AUTHOR_B_BOUNDS[1])),
                    w: round3(blend.w),
                });
            }
            if (!dryRun) {
                // Collected and flushed in transactional chunks below rather than
                // issued as N autocommit statements. A crash midway used to leave
                // half the bank on new IRT parameters and half on old, with no
                // way to tell which.
                pendingItemWrites.push(
                    prisma.question.update({
                        where: { id: itemId },
                        data: {
                            empiricalA: fit.a, empiricalB: fit.b, empiricalN: fit.n,
                            irtA: blend.a, irtB: blend.b,
                            calibrationN: fit.n, lastCalibratedAt: now,
                        },
                    }),
                );
            }
            fitted += 1;
        }

        await flushItemWrites();

        // Per-person per-subject ability.
        //
        // NOTE: these rows are also written by the ONLINE estimator in
        // telemetryService on every answered batch. A user answering questions
        // while this batch runs has their per-subject theta reverted to the
        // batch value — a lost update across two independent writers. Running
        // calibration off the request path (see adminRoutes) keeps that window
        // to a scheduled job rather than an arbitrary admin click, but the
        // reconciliation itself is a separate piece of work.
        let upserted = 0;
        if (!dryRun) {
            const abilityWrites = Object.entries(persons).map(([personId, p]) =>
                prisma.userAbility.upsert({
                    where: { userId_subject: { userId: personId, subject } },
                    update: { theta: p.theta, se: p.se },
                    create: { userId: personId, subject, theta: p.theta, se: p.se },
                }),
            );
            upserted = abilityWrites.length;
            while (abilityWrites.length > 0) {
                await prisma.$transaction(abilityWrites.splice(0, WRITE_CHUNK));
            }
        }

        const skippedLowN = itemIds.length - fitted;
        report.subjects[subject] = {
            responses: responses.length,
            persons: Object.keys(persons).length,
            itemsFitted: fitted,
            itemsSkippedLowN: skippedLowN,
            thetaRange: thetaRange(persons),
            sample,
        };
        report.totals.responses += responses.length;
        report.totals.itemsFitted += fitted;
        report.totals.itemsSkippedLowN += skippedLowN;
        report.totals.abilitiesUpserted += upserted;
    }

    report.ms = Date.now() - t0;
    return report;
}

function round3(x) { return Number.isFinite(x) ? Math.round(x * 1000) / 1000 : x; }
function thetaRange(persons) {
    const ts = Object.values(persons).map((p) => p.theta);
    if (ts.length === 0) return null;
    return { min: round3(Math.min(...ts)), max: round3(Math.max(...ts)) };
}

module.exports = { buildResponseMatrix, blendParams, runRecalibration, AUTHOR_PRIOR_N };
