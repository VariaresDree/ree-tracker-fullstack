const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

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

module.exports = router;
