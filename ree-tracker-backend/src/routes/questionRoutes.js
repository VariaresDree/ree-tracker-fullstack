// src/routes/questionRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

const { validate } = require('../middlewares/validate');
const idempotency = require('../middlewares/idempotency');
const { questionCreateSchema, questionUpdateSchema, questionCacheSchema, isPendingReview } = require('../schemas/questionSchemas');
const { bulkIdsSchema } = require('../schemas/reviewSchemas');
const { requireAdmin, isAdminUser } = require('../middlewares/roleMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { getSubjectFilter, samplePool } = require('../services/questionPool');
const { resolveTopic } = require('../services/topicResolver');
const { buildVersionSnapshot, createLiveQuestion } = require('../services/reviewService');

// 0. FETCH GLOBAL QUESTION STATS 
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [total, math, esas, ee] = await Promise.all([
            prisma.question.count(),
            prisma.question.count({ where: { subject: { in: ['Math', 'Mathematics'] } } }),
            prisma.question.count({ where: { subject: { in: ['ESAS', 'Engineering Sciences and Allied Subjects'] } } }),
            prisma.question.count({ where: { subject: { in: ['EE', 'Electrical Engineering', 'Electrical Engineering Professional Subjects'] } } })
        ]);
        
        return res.status(200).json({ total, math, esas, ee });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch stats.' });
    }
});

// 0b. OFFLINE-PACK MANIFEST — cheap per-subject content checksums so the client
// can delta-refresh its offline pack (re-download only the subjects whose
// questions actually changed), instead of re-fetching the whole bank every time.
// The checksum folds in id + answer + subtopic, so an added/removed question,
// a corrected answer key, or a taxonomy re-tag (Phase 3.3 canonicalization)
// changes it. Raw SQL uses a fully-static string + bound param.
router.get('/pack-manifest', authMiddleware, async (req, res) => {
    try {
        const subjects = ['Mathematics', 'ESAS', 'EE'];
        const manifest = {};
        for (const subj of subjects) {
            const filter = getSubjectFilter(subj);
            const vals = filter ? (filter.in || [filter]) : [subj];
            // Fold the MATERIAL fields (text/options/difficulty) into the checksum
            // via a per-row md5, so editing a live question — not just its answer
            // or subtopic — changes the subject's checksum and offline clients
            // delta-re-download it (a same-content re-save leaves it unchanged).
            const [row] = await prisma.$queryRawUnsafe(
                'SELECT count(*)::int AS count, md5(coalesce(string_agg("id" || \'~\' || "answer" || \'~\' || "subtopic" || \'~\' || md5("text" || coalesce("options"::text, \'\') || coalesce("difficulty"::text, \'\')), \',\' ORDER BY "id"), \'\')) AS checksum FROM "Question" WHERE "isFlagged" = false AND "subject" = ANY($1::text[])',
                vals,
            );
            manifest[subj] = { count: row?.count ?? 0, checksum: row?.checksum ?? '' };
        }
        return res.status(200).json({ subjects: manifest, generatedAt: Date.now() });
    } catch (error) {
        logger.error('pack-manifest error', { error: error.message });
        return res.status(500).json({ error: 'Failed to build pack manifest.' });
    }
});

// 1. FETCH QUESTIONS
// Stratified random sampling lives in services/questionPool (shared with
// battle creation) — see that module for the randomization rationale.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, subtopic, limit = 50, sort = 'random', offset = 0 } = req.query;

        // Deterministic ingestion ordering for the admin/library review grid:
        // newest- or oldest-created first, with real offset pagination so
        // "Load More" advances instead of re-rolling. The default 'random' path
        // (samplePool, shared with battle creation) is left untouched — active
        // review & vault sampling depend on it.
        if (sort === 'recent' || sort === 'oldest') {
            const whereClause = { isFlagged: false };
            const subjFilter = getSubjectFilter(subject);
            if (subjFilter) whereClause.subject = subjFilter;
            if (subtopic && subtopic !== 'All') whereClause.subtopic = subtopic.trim();

            const cap = Math.min(parseInt(limit) || 50, 2000);
            const skip = Math.max(0, parseInt(offset) || 0);
            const questions = await prisma.question.findMany({
                where: whereClause,
                orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
                skip,
                take: cap,
            });
            return res.status(200).json({
                success: true,
                items: questions,
                nextOffset: skip + questions.length,
            });
        }

        const questions = await samplePool({ subject, subtopic, limit });
        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        logger.error('Question fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch question bank.' });
    }
});

// 1.5. GET QUARANTINE QUEUE
router.get('/quarantine', authMiddleware, async (req, res) => {
    try {
        const flagged = await prisma.question.findMany({
            where: { isFlagged: true },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(flagged);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch quarantine queue." });
    }
});

// 1.6. APPROVE QUARANTINED ITEM (legacy path — pre-3.6 flagged rows; new AI
// submissions go through /api/review). Versioned for auditability like every
// other mutation of a live question.
router.put('/quarantine/:id/approve', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const previous = await prisma.question.findUnique({ where: { id: req.params.id } });
        if (!previous) return res.status(404).json({ error: 'Question not found.' });
        await prisma.$transaction([
            prisma.question.update({
                where: { id: req.params.id },
                data: { isFlagged: false, subject: req.body.subject, subtopic: req.body.subtopic }
            }),
            prisma.questionVersion.create({
                data: { questionId: previous.id, action: 'APPROVED', editor: req.user?.id || null, snapshot: buildVersionSnapshot(previous) },
            }),
        ]);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Approval validation failed." });
    }
});

// 1.7. GET FLAGGED QUESTIONS 
router.get('/flagged', authMiddleware, async (req, res) => {
    try {
        const { subject, subtopic } = req.query;
        let whereClause = { isFlagged: true };
        
        const subjFilter = getSubjectFilter(subject);
        if (subjFilter) whereClause.subject = subjFilter;
        
        if (subtopic && subtopic !== 'All') {
            whereClause.subtopic = subtopic.trim();
        }

        const flaggedQuestions = await prisma.question.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        return res.status(200).json(flaggedQuestions);
    } catch (error) {
        logger.error('Flagged questions fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch flagged items.' });
    }
});

// 2. ADD A NEW QUESTION
router.post('/', authMiddleware, validate(questionCreateSchema), async (req, res) => {
    try {
        const data = req.body;

        // AUTHORIZATION, not just authentication. `isPendingReview(data)` is
        // `data.status === 'quarantined'` — entirely client-controlled. Omitting
        // `status` therefore wrote straight into the LIVE shared question bank
        // with a caller-supplied answer key, which every surface then grades
        // against. PUT /:id was hardened with requireAdmin for exactly this
        // reason; POST / was missed.
        //
        // Non-admin submissions are forced into the pending queue rather than
        // rejected, so the contribution flow still works — it just cannot bypass
        // review any more.
        const callerIsAdmin = await isAdminUser(req.user?.id);

        // Phase 3.6: quarantined (AI/vision) submissions land in the
        // pending-review table — NEVER in the live Question table — so a query
        // that forgets an isFlagged filter can't leak an unreviewed item. They
        // go live only through the /api/review approve path.
        if (isPendingReview(data) || !callerIsAdmin) {
            const review = await prisma.questionPendingReview.create({
                data: {
                    subject: data.subject || 'Unknown',
                    subtopic: data.subtopic || 'General',
                    text: data.text || '',
                    options: Array.isArray(data.options) ? data.options : [],
                    answer: data.answer || '',
                    difficulty: parseFloat(data.difficulty) || 2.0,
                    fixedExplanation: data.fixedExplanation || null,
                    source: data.source || 'ai',
                    type: data.type || 'conceptual',
                    bloomLevel: data.bloomLevel || 'REMEMBER',
                    difficultyTier: data.difficultyTier || 1,
                    submittedBy: req.user?.id || null,
                },
            });
            await prisma.questionVersion.create({
                data: { reviewId: review.id, action: 'SUBMITTED', editor: req.user?.id || null, snapshot: buildVersionSnapshot(review) },
            });
            return res.status(201).json({ success: true, id: review.id, pendingReview: true });
        }

        // Manual/live creation — the same shared path review approval uses
        // (topic resolution + defaults live in reviewService.createLiveQuestion).
        const newQuestion = await createLiveQuestion({ ...data, isFlagged: data.isFlagged || false });

        return res.status(201).json({ success: true, id: newQuestion.id });
    } catch (error) {
        if (error.code === 'INVALID_TAXONOMY') return res.status(400).json({ error: error.message });
        logger.error('Question create error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to insert question.' });
    }
});

// 3. UPDATE AN EXISTING QUESTION — admin only. This handler writes the master
// answer key (data.answer, line ~228); leaving it open to any authenticated
// user let a non-admin rewrite the correct answer of any shared question and
// defeat the server-authoritative grading that /grade, /submit and battles all
// rely on. The only client caller passing edit fields is the admin vault-edit
// grid (useVaultGrid.handleUpdateSubmit); user "report anomaly" uses
// PATCH /:id/flag and explanation caching uses PUT /:id/cache — neither hits this.
router.put('/:id', authMiddleware, requireAdmin, validate(questionUpdateSchema), async (req, res) => {
    try {
        const data = req.body;
        // Phase 3.6 auditability: snapshot the row BEFORE the edit so a wrong
        // "correct answer" fix is always traceable (who, when, from what).
        const previous = await prisma.question.findUnique({ where: { id: req.params.id } });
        if (!previous) return res.status(404).json({ error: 'Question not found.' });

        // Choice-label sanitisation ("A."/"b)" prefixes) is applied by the Zod
        // transform in questionUpdateSchema via the validate() middleware above.
        // questionUpdateSchema is a .partial() — absent fields stay undefined,
        // which Prisma skips (the old parseFloat(undefined) wrote NaN).
        // Re-resolve the taxonomy FK only when the subtopic is actually being
        // changed (undefined must stay undefined so Prisma skips the columns).
        const topic = data.subtopic !== undefined
            ? await resolveTopic(data.subject, data.subtopic)
            : undefined;
        await prisma.$transaction([
            prisma.question.update({
                where: { id: req.params.id },
                data: {
                    subject: data.subject,
                    subtopic: topic !== undefined ? (topic?.name || data.subtopic) : undefined,
                    topicId: topic !== undefined ? (topic?.id ?? null) : undefined,
                    text: data.text,
                    options: data.options,
                    answer: data.answer,
                    difficulty: data.difficulty,
                    fixedExplanation: data.fixedExplanation,
                    isFlagged: data.isFlagged
                }
            }),
            prisma.questionVersion.create({
                data: { questionId: previous.id, action: 'LIVE_EDIT', editor: req.user?.id || null, snapshot: buildVersionSnapshot(previous) },
            }),
        ]);

        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Question not found.' });
        return res.status(500).json({ error: 'Failed to update question.' });
    }
});

// 4. UPDATE CACHED EXPLANATION
// Admin only. Despite the "cache" name this writes Question.fixedExplanation —
// a GLOBAL column on the shared question row, served to every user by /grade and
// the bookmark vault. It is not a per-user cache. Any authenticated account could
// therefore overwrite the canonical explanation of any question in the bank, at
// up to the schema's 20 000 characters, one question at a time.
//
// Two further gaps closed here: the write left explanationStatus untouched, so an
// already-APPROVED explanation stayed APPROVED after being silently replaced —
// making the whole explanation-review workflow bypassable by writing AFTER
// approval — and no QuestionVersion row was written, so the change was
// unauditable, unlike every other live-question mutation.
router.put('/:id/cache', authMiddleware, requireAdmin, validate(questionCacheSchema), async (req, res) => {
    try {
        const { cachedExplanation, fixedExplanation } = req.body;
        const nextExplanation = fixedExplanation || cachedExplanation;

        const updated = await prisma.$transaction(async (db) => {
            const question = await db.question.update({
                where: { id: req.params.id },
                data: {
                    fixedExplanation: nextExplanation,
                    // Replacing the text invalidates any prior approval.
                    explanationStatus: 'PENDING',
                },
            });
            await db.questionVersion.create({
                data: {
                    questionId: question.id,
                    action: 'LIVE_EDIT',
                    editor: req.user?.id || null,
                    snapshot: buildVersionSnapshot(question),
                },
            });
            return question;
        });

        return res.status(200).json({ success: true, explanationStatus: updated.explanationStatus });
    } catch (error) {
        if (error?.code === 'P2025') return res.status(404).json({ error: 'Question not found.' });
        logger.error('Explanation cache update failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to update explanation.' });
    }
});

// 5. FETCH ACTIVE RECALL REVIEW QUESTIONS
// Kept consistent with GET / : stratified random across subtopics instead of the
// old `orderBy createdAt desc` (which returned only the latest subtopic).
router.post('/review', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 20 } = req.body;
        const questions = await samplePool({ subject, limit });
        return res.status(200).json({ success: true, items: questions });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to initialize active recall.' });
    }
});

// 6. FLAG A QUESTION ANOMALY
//
// This used to set Question.isFlagged directly. isFlagged removes an item from
// EVERY sampling path — samplePool, /api/exams, /next-item, smart drill, the
// vault counts, and the readiness coverage denominator — for EVERY user, and
// only an admin can clear it. So any single authenticated account could empty
// the live question bank for the whole product by looping over the ids returned
// by GET /api/questions, after which battle creation starts 422ing. It was a
// global kill switch behind a report-anomaly button.
//
// Flags are now attributable per-user rows. The shared isFlagged bit flips only
// once FLAG_THRESHOLD distinct users agree, or immediately when an admin flags —
// so reporting still works, but one account can no longer act unilaterally.
const FLAG_THRESHOLD = 3;

router.patch('/:id/flag', authMiddleware, async (req, res) => {
    try {
        const questionId = req.params.id;
        const userId = req.user.id;
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;

        const exists = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
        if (!exists) return res.status(404).json({ error: 'Question not found.' });

        // Unique on (questionId, userId), so a loop from one account is a no-op
        // after the first row rather than N votes.
        await prisma.questionFlag.upsert({
            where: { questionId_userId: { questionId, userId } },
            update: { reason },
            create: { questionId, userId, reason },
        });

        const isAdmin = await isAdminUser(userId);
        const flagCount = await prisma.questionFlag.count({ where: { questionId } });
        const shouldQuarantine = isAdmin || flagCount >= FLAG_THRESHOLD;

        if (shouldQuarantine) {
            await prisma.question.update({ where: { id: questionId }, data: { isFlagged: true } });
        }

        return res.status(200).json({ success: true, flagCount, quarantined: shouldQuarantine });
    } catch (error) {
        logger.error('Question flag failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to flag question.' });
    }
});

// 7. EXPLANATION REVIEW QUEUE (Admin only)
router.get('/explanations/pending', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const questions = await prisma.question.findMany({
            where: {
                fixedExplanation: { not: null },
                explanationStatus: 'PENDING'
            },
            select: {
                id: true, subject: true, subtopic: true, text: true,
                fixedExplanation: true, explanationStatus: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.status(200).json({ items: questions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch pending explanations.' });
    }
});

// 7.1 APPROVE/REJECT EXPLANATION
router.put('/:id/explanation-status', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return res.status(400).json({ error: 'Status must be APPROVED, REJECTED, or PENDING.' });
        }

        await prisma.question.update({
            where: { id: req.params.id },
            data: { explanationStatus: status }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Question not found.' });
        res.status(500).json({ error: 'Failed to update explanation status.' });
    }
});

// 7.2 BULK APPROVE EXPLANATIONS — "Accept All" over the pending page in one
// batched request. Only rows still PENDING are touched; ids outside that
// subset come back in `failed`. Also writes the previously-MISSING audit
// trail: one QuestionVersion row per approval (who/when + the approved
// explanation snapshot), matching the question-review gate's traceability.
router.post('/explanations/approve-bulk', authMiddleware, requireAdmin, validate(bulkIdsSchema), idempotency(), async (req, res) => {
    try {
        const uniqueIds = [...new Set(req.body.ids)];
        const pending = await prisma.question.findMany({
            where: { id: { in: uniqueIds }, explanationStatus: 'PENDING', fixedExplanation: { not: null } },
            select: { id: true, fixedExplanation: true },
        });
        const pendingIds = pending.map((q) => q.id);
        const pendingSet = new Set(pendingIds);
        const failed = uniqueIds.filter((id) => !pendingSet.has(id)).map((id) => ({ id, reason: 'not-pending' }));

        if (pendingIds.length > 0) {
            await prisma.$transaction([
                prisma.question.updateMany({
                    where: { id: { in: pendingIds }, explanationStatus: 'PENDING' },
                    data: { explanationStatus: 'APPROVED' },
                }),
                prisma.questionVersion.createMany({
                    data: pending.map((q) => ({
                        questionId: q.id,
                        action: 'EXPLANATION_APPROVED',
                        editor: req.user.id,
                        snapshot: { fixedExplanation: q.fixedExplanation },
                    })),
                }),
            ]);
        }
        return res.status(200).json({ success: true, approved: pendingIds, failed });
    } catch (error) {
        logger.error('bulk explanation approve failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Bulk explanation approval failed.' });
    }
});

// 8. DELETE QUESTION
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        await prisma.question.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Deletion failed." });
    }
});

module.exports = router;