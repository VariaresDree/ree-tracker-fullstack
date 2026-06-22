const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

// Get all planner tasks for user
router.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const tasks = await prisma.plannerTask.findMany({
            where: { userId: req.user.id },
            orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }]
        });

        res.status(200).json({ items: tasks });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch planner tasks.' });
    }
});

// Create a planner task
router.post('/tasks', authMiddleware, async (req, res) => {
    try {
        const { text, dueDate } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Task text is required.' });
        }

        const task = await prisma.plannerTask.create({
            data: {
                userId: req.user.id,
                text: text.trim(),
                dueDate: dueDate || null
            }
        });

        res.status(201).json({ success: true, task });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task.' });
    }
});

// Update a planner task
router.put('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        const { text, dueDate, completed } = req.body;
        const data = {};

        if (text !== undefined) data.text = text.trim();
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

// Auto-generate study plan from exam date and mastery data
router.post('/tasks/generate-plan', authMiddleware, async (req, res) => {
    try {
        const { examDate, topics } = req.body;

        if (!examDate || !topics || !Array.isArray(topics) || topics.length === 0) {
            return res.status(400).json({ error: 'examDate and topics array are required.' });
        }

        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(examDate);
        endDate.setHours(0, 0, 0, 0);

        const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

        // Fetch user's weak areas to prioritize
        const subtopicPerf = await prisma.questionAttempt.groupBy({
            by: ['subtopic'],
            where: { userId: req.user.id },
            _count: { id: true }
        });
        const correctBySubtopic = await prisma.questionAttempt.groupBy({
            by: ['subtopic'],
            where: { userId: req.user.id, isCorrect: true },
            _count: { id: true }
        });
        const correctMap = {};
        correctBySubtopic.forEach(c => { correctMap[c.subtopic] = c._count.id; });

        const perfMap = {};
        subtopicPerf.forEach(s => {
            perfMap[s.subtopic] = {
                total: s._count.id,
                correct: correctMap[s.subtopic] || 0,
                accuracy: (correctMap[s.subtopic] || 0) / s._count.id
            };
        });

        // Sort topics: weak areas first, then unseen topics, then strong ones
        const sortedTopics = [...topics].sort((a, b) => {
            const perfA = perfMap[a.subtopic];
            const perfB = perfMap[b.subtopic];
            const accA = perfA ? perfA.accuracy : 0.5;
            const accB = perfB ? perfB.accuracy : 0.5;
            return accA - accB;
        });

        // Distribute topics across available days, cycling through them
        const tasks = [];
        const today = new Date(startDate);

        for (let i = 0; i < Math.min(totalDays, sortedTopics.length * 2); i++) {
            const topic = sortedTopics[i % sortedTopics.length];
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() + i);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            const perf = perfMap[topic.subtopic];
            const tag = perf
                ? (perf.accuracy < 0.5 ? '[WEAK] ' : perf.accuracy < 0.7 ? '[REVIEW] ' : '[MAINTAIN] ')
                : '[NEW] ';

            tasks.push({
                userId: req.user.id,
                text: `${tag}${topic.subject}: ${topic.subtopic} — Active Review (20 questions)`,
                dueDate: dueDateStr,
                completed: false
            });
        }

        // Batch create all tasks
        const created = await prisma.plannerTask.createMany({ data: tasks });

        res.status(201).json({
            success: true,
            tasksCreated: created.count,
            totalDays,
            message: `Generated ${created.count} study tasks across ${totalDays} days`
        });
    } catch (error) {
        logger.error('Study plan generation error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to generate study plan.' });
    }
});

// Clear all auto-generated plan tasks (for regeneration)
router.delete('/tasks/clear-plan', authMiddleware, async (req, res) => {
    try {
        const result = await prisma.plannerTask.deleteMany({
            where: {
                userId: req.user.id,
                text: { startsWith: '[' }
            }
        });
        res.status(200).json({ success: true, deleted: result.count });
    } catch (error) {
        logger.error('Clear plan error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Failed to clear plan.' });
    }
});

module.exports = router;
