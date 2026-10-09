const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const idempotency = require('../middlewares/idempotency');
const { validate } = require('../middlewares/validate');
const { examSubmitSchema, gradeSchema, gauntletForfeitSchema, nextItemSchema, finalizeSchema } = require('../schemas/examSchemas');
const gauntletService = require('../services/gauntletService');
const { invalidate: invalidateDashboard } = require('../services/dashboardCache');
const examHistory = require('../services/examHistory');
const { getSubjectFilter, normalizeSubject } = require('../utils/subject');
const { recordAttempts } = require('../services/telemetryService');
const { gradeAttempts, buildDiagnostics } = require('../services/examService');
const { updateTheta, itemParams, fisherInfo, PRIOR_SE } = require('../engine/irt');
const { pickCatItem, topicKey } = require('../engine/cat');
const catCandidatesModule = require('../services/catCandidates');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// GET QUESTIONS — answers excluded from response
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject, limit = 50 } = req.query;
        const parsedLimit = Math.min(parseInt(limit) || 50, 200);

        let whereClause = { isFlagged: false };
        // 'Blended' means no subject constraint (mix everything); otherwise use
        // the shared filter that matches every stored spelling of the subject.
        const subjFilter = subject !== 'Blended' ? getSubjectFilter(subject) : undefined;
        if (subjFilter) whereClause.subject = subjFilter;

        const questions = await prisma.question.findMany({
            where: whereClause,
            select: {
                id: true,
                subject: true,
                subtopic: true,
                text: true,
                options: true,
                difficulty: true,
                source: true,
                type: true
            },
            take: parsedLimit
        });

        // Shuffle in JS since Prisma doesn't support ORDER BY RANDOM()
        for (let i = questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questions[i], questions[j]] = [questions[j], questions[i]];
        }

        return res.status(200).json({ items: questions });
    } catch (error) {
        logger.error('Exam questions fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Database fetch failed.' });
    }
});

// GRADE — accepts answers and returns graded results
// idempotency() AFTER validate(), per its own contract: mounted first, a
// malformed body reserved the key, so the corrected retry — same content hash,
// same key — got a 409 'duplicate in progress' instead of being graded.
router.post('/grade', authMiddleware, validate(gradeSchema), idempotency(), async (req, res) => {
    try {
        const { answers } = req.body;
        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ error: 'answers array is required.' });
        }

        const questionIds = answers.map(a => a.questionId).filter(Boolean);
        const masterQuestions = await prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: { id: true, answer: true, fixedExplanation: true, difficulty: true }
        });
        const qMap = {};
        masterQuestions.forEach(q => { qMap[q.id] = q; });

        const results = answers.map(a => {
            const masterQ = qMap[a.questionId];
            if (!masterQ) return { questionId: a.questionId, isCorrect: false, correctAnswer: null, explanation: null };
            return {
                questionId: a.questionId,
                isCorrect: masterQ.answer === a.userAnswer,
                correctAnswer: masterQ.answer,
                explanation: masterQ.fixedExplanation || null
            };
        });

        // Persist attempts so Gauntlet/Combat results show up in Dashboard + Profile analytics.
        // Default confidence LOW and zero time when caller doesn't supply them.
        //
        // A persistence failure is NOT swallowed. This used to log and answer
        // 200, which the Gauntlet outbox reads as "delivered" (it drops the
        // entry) and the idempotency layer records and replays for 24h — so
        // one transient DB error silently lost the whole run. 503 is retryable
        // to the client, and idempotency releases the key on any non-2xx, so
        // the retry is graded and written normally. Re-grading on retry is
        // harmless: clientAttemptId makes the write exactly-once.
        // A Gauntlet run records under its own session (its run id), so the
        // ladder can be graded from the recorded answers and the run reviewed.
        const run = req.body.gauntlet || null;
        let telemetry = null;
        try {
            telemetry = await recordAttempts({
                userId: req.user.id,
                mode: req.body.mode || 'GAUNTLET',
                ...(run ? { sessionId: run.runId } : {}),
                attempts: answers.map((a) => ({
                    questionId: a.questionId,
                    userAnswer: a.userAnswer,
                    confidenceLevel: a.confidenceLevel || 'LOW',
                    timeSpentMs: a.timeSpentMs || 0,
                    clientAttemptId: a.clientAttemptId,
                    itemIndex: a.itemIndex,
                })),
            });
        } catch (telErr) {
            logger.error('grade telemetry persist failed', { error: telErr.message });
            return res.status(503).json({ error: 'Your answers were graded but not saved. Retrying shortly.' });
        }

        // The ladder (level, lock, boards cleared) is the server's now. A
        // failure here is retryable like the write above: the answers are
        // already recorded, and applying the run again is a no-op once stored.
        let gauntlet = null;
        if (run) {
            try {
                gauntlet = await gauntletService.applyGauntletRun({
                    userId: req.user.id,
                    runId: run.runId,
                    level: run.level,
                    knownLevel: run.knownLevel,
                    startedAt: run.startedAt,
                    finishedAt: run.finishedAt,
                });
                invalidateDashboard(req.user.id);
            } catch (ladderErr) {
                if (ladderErr instanceof gauntletService.GauntletError && ladderErr.status < 500) {
                    return res.status(ladderErr.status).json({ error: ladderErr.message });
                }
                logger.error('gauntlet ladder update failed', { error: ladderErr.message });
                return res.status(503).json({ error: 'Your run was graded but your Gauntlet progress wasn’t saved. Retrying shortly.' });
            }
        }

        return res.status(200).json({ results, telemetry, gauntlet });
    } catch (error) {
        logger.error('Exam grading error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Grading failed.' });
    }
});

// SUBMIT SIMULATION TELEMETRY (GRADING ENGINE)
router.post('/submit', authMiddleware, validate(examSubmitSchema), idempotency(), async (req, res) => {
    try {
        const { attempts, config, timeRemaining, totalExamTime } = req.body;

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const currentTheta = user?.thetaRating || 0.0;

        const questionIds = attempts.map(a => a.questionId).filter(Boolean);
        const masterQuestions = await prisma.question.findMany({
            where: { id: { in: questionIds } }
        });

        const qMap = {};
        masterQuestions.forEach(q => {
            qMap[q.id] = q;
        });

        // Grading, the per-subject rollup and the verdict all live in
        // examService now. They used to be ~60 lines inline here, which is why
        // they were uncovered — and why this handler's verdict band drifted from
        // the client's (>= 50 here vs >= 60 there) for long enough to ship.
        const { correctCount, parsedAttempts, subjectPerformance } =
            gradeAttempts(attempts, qMap, req.user.id);

        const diagnostics = buildDiagnostics({
            attempts,
            parsedAttempts,
            correctCount,
            subjectPerformance,
            timeTakenSecs: totalExamTime - timeRemaining,
        });
        // Only the verdict is needed outside the response — it is persisted on
        // the ExamSession row below.
        const { verdict } = diagnostics;
        const timeTakenSecs = totalExamTime - timeRemaining;

        // Create the ExamSession first, then route per-question attempts
        // through the shared recordAttempts() path so they land in the same
        // tables (with ActivityLog + theta recompute) as Active Review and
        // Battle submissions — no duplicate logic, single source of truth.
        // Create the session shell at ZERO counts — recordAttempts' upsert
        // increments them from the actually-inserted rows. Pre-filling the
        // final totals here made the subsequent increments DOUBLE them.
        const session = await prisma.examSession.create({
            data: {
                userId: req.user.id,
                // 'BOARD_SIM', not config.mode. buildScoreProgression filters on
                // EXAM_MODES = {BOARD_SIM, GAUNTLET}, but this route stamped the
                // CONFIG mode ('custom' | 'prc' | 'blended' | 'subject'), so no
                // session created here ever matched and Score History rendered
                // empty for every board-sim user. The config mode is preserved in
                // the `config` JSON below, which is where it belongs.
                mode: 'BOARD_SIM',
                targetSubject: config?.subject || 'Blended',
                score: 0,
                totalQuestions: 0,
                // ZERO, like score and totalQuestions above. recordAttempts'
                // upsert does `timeTakenSecs: { increment: batchTimeSecs }`, so
                // pre-filling the wall-clock duration here made every board sim
                // report roughly DOUBLE its real time (wall clock + the sum of
                // per-question timings) straight into the study-time chart.
                // This field was the one the original zeroing fix missed.
                timeTakenSecs: 0,
                verdict: verdict,
                config: config || {},
            },
        });

        let newTheta = currentTheta;
        if (parsedAttempts.length > 0) {
            const telemetry = await recordAttempts({
                userId: req.user.id,
                sessionId: session.id,
                mode: 'BOARD_SIM',
                attempts: parsedAttempts.map((a) => ({
                    questionId: a.questionId,
                    isCorrect: a.isCorrect,
                    userAnswer: a.userAnswer,
                    subject: a.subject,
                    subtopic: a.subtopic,
                    confidenceLevel: a.confidenceLevel,
                    timeSpentMs: a.timeSpentMs,
                    clientAttemptId: a.clientAttemptId,
                })),
            });
            if (telemetry?.updatedTheta != null) newTheta = telemetry.updatedTheta;
        }

        // Built once, above, by examService — including the O(n) index map the
        // time-sink and blind-spot lists need. The response payload is unchanged
        // in shape; it just no longer restates the derivation here.
        res.status(200).json({
            success: true,
            diagnostics,
            newStats: {
                irt: { theta: newTheta },
                cloudTimestamp: Date.now()
            }
        });

    } catch (error) {
        logger.error('Exam submit error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Telemetry compilation failed.' });
    }
});

// CAT — server picks the next item that maximally tightens the user's
// ability estimate. Accepts the in-session attempt log so we can update
// theta inline without a separate /grade roundtrip.
//
// Body: {
//   subject?: string,
//   recentIds?: string[],
//   sessionAttempts?: [{ questionId, isCorrect }],
//   poolSize?: number    // optional candidate-pool size (default 80)
// }
router.post('/next-item', authMiddleware, validate(nextItemSchema), async (req, res) => {
    try {
        const { subject, recentIds, sessionAttempts, poolSize } = req.body;
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { thetaRating: true, standardError: true },
        });

        let prior = { theta: user?.thetaRating ?? 0, se: user?.standardError ?? PRIOR_SE };

        // Phase 3.4: a subject-scoped session starts from the per-subject
        // ability when one exists (populated by telemetry + the nightly
        // recalibration) — the global theta stays the fallback.
        if (subject && subject !== 'All' && subject !== 'Blended') {
            const ability = await prisma.userAbility.findUnique({
                where: { userId_subject: { userId: req.user.id, subject: normalizeSubject(subject) } },
                select: { theta: true, se: true },
            });
            if (ability) prior = { theta: ability.theta, se: ability.se };
        }

        // Refine prior with this session's attempts so consecutive picks
        // converge faster than waiting for /submit. The same read tells the
        // picker which topics the session has already covered.
        const coveredTopics = {};
        if (Array.isArray(sessionAttempts) && sessionAttempts.length > 0) {
            const ids = sessionAttempts.map((a) => a.questionId).filter(Boolean);
            const items = await prisma.question.findMany({
                where: { id: { in: ids } },
                select: { id: true, subtopic: true, topicId: true, irtA: true, irtB: true, irtC: true, difficulty: true },
            });
            const itemMap = Object.fromEntries(items.map((q) => [q.id, q]));
            for (const q of items) {
                const key = topicKey(q);
                if (key) coveredTopics[key] = (coveredTopics[key] || 0) + 1;
            }
            const sessionPairs = sessionAttempts
                .map((a) => {
                    const q = itemMap[a.questionId];
                    if (!q) return null;
                    return { item: itemParams(q), correct: !!a.isCorrect };
                })
                .filter(Boolean);
            if (sessionPairs.length > 0) prior = updateTheta(prior, sessionPairs);
        }

        // A random, θ-windowed sample with exclusions applied in SQL
        // (services/catCandidates). This read `take: poolSize` rows with no
        // ordering — the same first rows on every call — matched the subject
        // by raw equality instead of the shared spellings, and dropped
        // recently-seen ids only afterwards, in memory.
        const exclude = [...new Set([...(recentIds || []), ...(sessionAttempts || []).map((a) => a.questionId)])];
        const candidates = await catCandidatesModule.catCandidates({ subject, theta: prior.theta, excludeIds: exclude, take: poolSize });

        // Information at θ, discounted for topics already covered, then a random
        // pick among the best three (engine/cat) — not always THE single best.
        const pickId = pickCatItem({ theta: prior.theta, pool: candidates, coveredTopics });
        const chosen = candidates.find((q) => q.id === pickId) || null;
        const pick = {
            info: chosen ? fisherInfo(prior.theta, itemParams(chosen)) : 0,
            fallback: !chosen || chosen.irtB == null,
        };

        return res.status(200).json({
            item: chosen,
            ability: prior,
            selection: { info: pick.info, fallback: pick.fallback },
        });
    } catch (error) {
        logger.error('CAT next-item failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Next item selection failed.' });
    }
});

// FINALISE A SITTING — grade a session from its OWN recorded attempts
// (per-subject scores, PRC weighted average, verdict) and store the result.
// The telemetry upsert leaves sessions 'IN_PROGRESS' forever; this closes them.
// 409 while the attempts are still in the client's outbox — retryable.
router.post('/sessions/:id/finalize', authMiddleware, validate(finalizeSchema), async (req, res) => {
    try {
        const result = await examHistory.finalizeSession({ userId: req.user.id, sessionId: req.params.id, meta: req.body });
        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof examHistory.ExamHistoryError) return res.status(error.status).json({ error: error.message });
        logger.error('exam finalize failed', { error: error.message });
        return res.status(500).json({ error: 'Could not finalise the exam.' });
    }
});

// HIDE A SITTING FROM MOCK HISTORY — never a delete: deleting an ExamSession
// cascades to its attempts, which would rewrite every tally and mastery
// estimate the sitting fed.
router.post('/sessions/:id/hide', authMiddleware, async (req, res) => {
    try {
        return res.status(200).json(await examHistory.hideSession({ userId: req.user.id, sessionId: req.params.id }));
    } catch (error) {
        if (error instanceof examHistory.ExamHistoryError) return res.status(error.status).json({ error: error.message });
        logger.error('exam hide failed', { error: error.message });
        return res.status(500).json({ error: 'Could not update the history.' });
    }
});

// FETCH EXAM LEDGER HISTORY
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const cursor = req.query.cursor;

        const history = await prisma.examSession.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const hasMore = history.length > limit;
        if (hasMore) history.pop();

        return res.status(200).json({
            items: history,
            nextCursor: hasMore ? history[history.length - 1].id : null
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch exam history.' });
    }
});

// LEAVE A GAUNTLET RUN — counts as not passing it: the ladder locks for 12
// hours from when the learner left. "Exit" used to discard the run with no
// lock, after the learner had seen its questions.
router.post('/gauntlet/forfeit', authMiddleware, validate(gauntletForfeitSchema), async (req, res) => {
    try {
        const result = await gauntletService.forfeitGauntletRun({
            userId: req.user.id,
            level: req.body.level,
            knownLevel: req.body.knownLevel,
            at: req.body.at,
        });
        invalidateDashboard(req.user.id);
        return res.status(200).json(result);
    } catch (error) {
        if (error instanceof gauntletService.GauntletError) return res.status(error.status).json({ error: error.message });
        logger.error('gauntlet forfeit failed', { error: error.message });
        return res.status(500).json({ error: 'Could not record leaving the run.' });
    }
});

// (DELETE /history/:id is gone. It hard-deleted a session, and the cascade
// took its attempts with it, rewriting every tally and mastery estimate the
// sitting fed. Nothing called it; POST /sessions/:id/hide is the only way to
// take a sitting out of history.)

module.exports = router;
