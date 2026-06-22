const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { battleId, hostId, config, questions, timeLimitSecs } = req.body;

        if (!battleId || !questions || !timeLimitSecs) {
            return res.status(400).json({ error: 'battleId, questions, and timeLimitSecs are required.' });
        }

        const battle = await prisma.battle.create({
            data: {
                id: battleId,
                hostId: hostId || req.user.id,
                config: config || {},
                questions: questions,
                timeLimitSecs: parseInt(timeLimitSecs)
            }
        });

        res.status(201).json({ success: true, battleId: battle.id });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Battle ID already exists.' });
        }
        console.error("Battle Create Error:", error);
        res.status(500).json({ error: 'Failed to create battle.' });
    }
});

router.get('/:battleId', authMiddleware, async (req, res) => {
    try {
        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId }
        });

        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        res.status(200).json({ success: true, battle });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch battle.' });
    }
});

router.post('/:battleId/submit', authMiddleware, async (req, res) => {
    try {
        const { score, total, timeTakenSecs } = req.body;

        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId }
        });
        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        await prisma.battle.update({
            where: { id: req.params.battleId },
            data: { status: 'COMPLETED' }
        });

        res.status(200).json({ success: true, score, total, timeTakenSecs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit battle score.' });
    }
});

router.put('/:battleId/progress', authMiddleware, async (req, res) => {
    try {
        const { liveScore, itemsAnswered } = req.body;

        const battle = await prisma.battle.findUnique({
            where: { id: req.params.battleId }
        });
        if (!battle) return res.status(404).json({ error: 'Battle not found.' });

        res.status(200).json({ success: true, liveScore, itemsAnswered });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update progress.' });
    }
});

module.exports = router;
