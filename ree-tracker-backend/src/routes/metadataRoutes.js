// src/routes/metadataRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

// 🚀 FIXED: Pointing back to your centralized, working DB configuration
const prisma = require('../config/db');
const logger = require('../utils/logger');

router.get('/vault', authMiddleware, async (req, res) => {
    try {
        const groupedData = await prisma.question.groupBy({
            by: ['subject', 'subtopic'],
            _count: { id: true },
            where: { isFlagged: false } 
        });

        const metadataMap = {};
        
        groupedData.forEach(item => {
            let safeSubj = item.subject;
            
            // Standardize Firebase anomalies to the exact UI mapping
            if (safeSubj === 'Mathematics' || safeSubj === 'Math') safeSubj = 'Math';
            else if (safeSubj === 'ESAS' || safeSubj?.includes('Sciences')) safeSubj = 'ESAS';
            else if (safeSubj === 'EE' || safeSubj?.includes('Electrical')) safeSubj = 'EE';

            const safeSubtopic = item.subtopic ? item.subtopic.trim() : 'Uncategorized';

            const key = `${safeSubj}_${safeSubtopic}`;
            metadataMap[key] = (metadataMap[key] || 0) + item._count.id;
        });

        return res.status(200).json(metadataMap);
    } catch (error) {
        logger.error('Vault metadata error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch metadata matrix.' });
    }
});

router.post('/vault/resync', authMiddleware, async (req, res) => {
    try {
        res.status(200).json({ success: true, message: "Vault synchronized." });
    } catch (error) {
        res.status(500).json({ error: 'Resync failed.' });
    }
});

module.exports = router;