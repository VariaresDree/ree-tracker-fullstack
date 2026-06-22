const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const prisma = require('../config/db');

router.get('/tos', async (req, res) => {
    try {
        const config = await prisma.systemConfig.findUnique({
            where: { id: 'global_config' }
        });

        return res.status(200).json(config ? config.tos : null);
    } catch (error) {
        console.error("TOS Fetch Error:", error);
        return res.status(500).json({ error: 'Failed to fetch TOS.' });
    }
});

router.put('/tos', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const newTOS = req.body;

        await prisma.systemConfig.upsert({
            where: { id: 'global_config' },
            update: { tos: newTOS },
            create: { id: 'global_config', tos: newTOS }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("TOS Update Error:", error);
        return res.status(500).json({ error: 'Failed to update TOS.' });
    }
});

module.exports = router;
