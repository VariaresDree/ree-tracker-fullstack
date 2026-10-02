const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { plannerTaskCreateSchema, plannerTaskUpdateSchema, plannerGenerateSchema } = require('../schemas/plannerSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { Prisma } = require('@prisma/client');
const { todayManila, manilaDateOf, manilaDaySql } = require('../utils/manilaDate');
const { normalizeSubject } = require('@ree/shared');
const { buildStudyPlan, taskProgress } = require('../engine/plan');
const { loadTopicSignals } = require('../services/topicSignals');
const { getSyllabusWeights } = require('../services/questionPool');

// Tasks the planner owns: v2 tasks carry a kind; v1 wrote a "[WEAK] …" text
// prefix. Re-planning and "clear plan" touch only these.
const PLANNED_TASKS = [{ kind: { not: null } }, { text: { startsWith: '[' } }];
// A board sitting counts toward a planned mock once it has this many items.
const MOCK_MIN_ITEMS = 20;

/** UTC instant of Manila midnight `offsetDays` after a YYYY-MM-DD date. */
const manilaMidnight = (ymd, offsetDays) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + offsetDays) - 8 * 3600 * 1000);
};

// Get all planner tasks for user — planned tasks carry their progress, worked
// out from what the learner actually answered on the task's day (Planner v2:
// they complete themselves; free-text tasks are still ticked by hand).
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        // Capped: a plan is at most PLAN_HORIZON_DAYS rows, plus free tasks.
        const tasks = await prisma.plannerTask.findMany({
            take: 1000,
            where: { userId: req.user.id },
            orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }]
        });

        const planned = tasks.filter((t) => t.kind && t.dueDate && !t.completed);
        let progress = [];
        if (planned.length > 0) {
            const days = planned.map((t) => t.dueDate).sort();
            const from = manilaMidnight(days[0], 0);
            const to = manilaMidnight(days[days.length - 1], 1);
            const answeredAt = Prisma.sql`COALESCE(qa."answeredAt", qa."createdAt")`;
            const [answered, mocks] = await Promise.all([
                prisma.$queryRaw`
                    SELECT ${manilaDaySql(answeredAt)} AS "day",
                           COALESCE(t."name", qa."subtopic") AS "topic",
                           COUNT(*)::int AS "count"
                    FROM "QuestionAttempt" qa
                    JOIN "Question" q ON q."id" = qa."questionId"
                    LEFT JOIN "Topic" t ON t."id" = q."topicId"
                    WHERE qa."userId" = ${req.user.id}
                      AND ${answeredAt} >= ${from} AND ${answeredAt} < ${to}
                    GROUP BY 1, 2`,
                prisma.examSession.findMany({
                    where: { userId: req.user.id, mode: 'BOARD_SIM', totalQuestions: { gte: MOCK_MIN_ITEMS }, createdAt: { gte: from, lt: to } },
                    select: { createdAt: true },
                }),
            ]);
            progress = taskProgress(planned, answered, mocks.map((m) => manilaDateOf(m.createdAt)));
        }
        const byId = new Map(progress.map((p) => [p.id, p]));

        res.status(200).json({ items: tasks.map((t) => (byId.has(t.id) ? { ...t, progress: byId.get(t.id) } : t)) });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch planner tasks.' });
    }
});

// Create a planner task
router.post('/tasks', authMiddleware, validate(plannerTaskCreateSchema), async (req, res) => {
    try {
        const { text, dueDate } = req.body; // text is schema-trimmed + non-empty

        const task = await prisma.plannerTask.create({
            data: {
                userId: req.user.id,
                text,
                dueDate: dueDate || null
            }
        });

        res.status(201).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task.' });
    }
});

// Update a planner task
router.put('/tasks/:id', authMiddleware, validate(plannerTaskUpdateSchema), async (req, res) => {
    try {
        const { text, dueDate, completed } = req.body; // text is schema-trimmed
        const data = {};

        if (text !== undefined) data.text = text;
        if (dueDate !== undefined) data.dueDate = dueDate;
        if (completed !== undefined) data.completed = completed;

        const task = await prisma.plannerTask.update({
            where: { id: req.params.id, userId: req.user.id },
            data
        });

        res.status(200).json({ success: true, task });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Task not found.' });
        }
        res.status(500).json({ error: 'Failed to update task.' });
    }
});

// Delete a planner task
// REGISTERED BEFORE /tasks/:id ON PURPOSE. Express matches in registration
// order and :id is a single-segment param that happily matches the literal
// string "clear-plan" — so with the old ordering every
// DELETE /api/user/tasks/clear-plan hit the :id handler, ran
// plannerTask.delete({ where: { id: "clear-plan" } }), threw P2025 and
// returned 404. The handler below was unreachable, so the client's
// "regenerate plan" flow never cleared anything and generate-plan appended
// a duplicate set of tasks on every regeneration.
// Clear all auto-generated plan tasks (for regeneration)
router.delete('/tasks/clear-plan', authMiddleware, async (req, res) => {
    try {
        const result = await prisma.plannerTask.deleteMany({
            where: { userId: req.user.id, OR: PLANNED_TASKS },
        });

        res.status(200).json({ success: true, deleted: result.count });
    } catch (error) {
        logger.error('Clear plan error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to clear plan.' });
    }
});

// Delete a single planner task. Must stay AFTER /tasks/clear-plan (see above).
// It, and generate-plan below, used to sit INSIDE the clear-plan handler body,
// so neither existed until clear-plan had run once — on a fresh instance both
// 404'd — and every later clear-plan call registered them again.
router.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.plannerTask.delete({
            where: { id: req.params.id, userId: req.user.id }
        });

        res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Task not found.' });
        }
        res.status(500).json({ error: 'Failed to delete task.' });
    }
});

// Auto-generate a study plan (engine/plan.js): drill days shared out by
// (1 − decayed mastery) × syllabus weight and interleaved, a timed PRC sitting
// every seventh day, light review in the final three days. Re-planning replaces
// the previous plan's tasks, never the learner's own.
router.post('/tasks/generate-plan', authMiddleware, validate(plannerGenerateSchema), async (req, res) => {
    try {
        const { examDate, topics } = req.body;
        const exam = new Date(examDate).toISOString().slice(0, 10);

        const [user, practised, weights] = await Promise.all([
            prisma.user.findUnique({ where: { id: req.user.id }, select: { dailyTarget: true } }),
            loadTopicSignals(req.user.id),
            getSyllabusWeights(),
        ]);

        // Practised topics carry their decayed mastery; syllabus topics never
        // touched join as unmastered.
        const seen = new Set(practised.map((t) => t.topic.trim().toLowerCase()));
        const planTopics = [
            ...practised,
            ...(topics || [])
                .filter((t) => !seen.has(t.subtopic.trim().toLowerCase()))
                .map((t) => ({ topic: t.subtopic, subject: normalizeSubject(t.subject), topicId: null, masteryEffective: null })),
        ];

        const plan = buildStudyPlan({
            today: todayManila(),
            examDate: exam,
            dailyTarget: user?.dailyTarget || 50,
            topics: planTopics,
            weights,
        });
        if (plan.length === 0) return res.status(400).json({ error: 'Set an exam date in the future.' });

        const [, created] = await prisma.$transaction([
            prisma.plannerTask.deleteMany({ where: { userId: req.user.id, OR: PLANNED_TASKS } }),
            prisma.plannerTask.createMany({
                data: plan.map((t) => ({ userId: req.user.id, completed: false, ...t })),
            }),
        ]);

        res.status(201).json({
            success: true,
            tasksCreated: created.count,
            totalDays: plan.length,
            message: `Planned ${created.count} days of review`,
        });
    } catch (error) {
        logger.error('Study plan generation error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to generate study plan.' });
    }
});

module.exports = router;
