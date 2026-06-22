const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const folders = await prisma.folder.findMany({ orderBy: { name: 'asc' } });
        const materials = await prisma.material.findMany({ orderBy: { createdAt: 'desc' } });

        return res.status(200).json({ success: true, folders, materials });
    } catch (error) {
        logger.error('Material fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch vault contents.' });
    }
});

module.exports = router;
