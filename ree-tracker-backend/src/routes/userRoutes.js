const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        let user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!user) {
            user = await prisma.user.create({
                data: { id: req.user.id, role: 'USER' }
            });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Profile sync failed' });
    }
});

router.put('/settings', authMiddleware, async (req, res) => {
    try {
        const { examDate, dailyTarget } = req.body;
        const data = {};

        if (examDate !== undefined) data.examDate = examDate;
        if (dailyTarget !== undefined) data.dailyTarget = dailyTarget;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'No valid settings provided.' });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data
        });

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Settings update failed.' });
    }
});

module.exports = router;
