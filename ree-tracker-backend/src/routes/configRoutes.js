// src/routes/configRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');

// 🚀 FIXED: Pointing back to your centralized, working DB configuration
const prisma = require('../config/db'); 

const MASTER_ADMIN_EMAILS = [
    'admin@example.com',
    'donreydenxprey@gmail.com' 
];

// GET: Fetch the Dynamic TOS Matrix
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

// PUT: Admin Updates the TOS Matrix
router.put('/tos', authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.uid || req.user?.id;
        const userEmail = req.user?.email;
        
        let isAllowed = false;

        // Verify Admin Status
        if (userEmail && MASTER_ADMIN_EMAILS.includes(userEmail)) {
            isAllowed = true;
        } else if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role === 'ADMIN' || user?.role === 'admin') isAllowed = true;
        }

        if (!isAllowed) {
            return res.status(403).json({ error: 'Admin clearance required.' });
        }

        const newTOS = req.body;
        
        const existingConfig = await prisma.systemConfig.findUnique({
            where: { id: 'global_config' }
        });

        if (existingConfig) {
            await prisma.systemConfig.update({
                where: { id: 'global_config' },
                data: { tos: newTOS }
            });
        } else {
            await prisma.systemConfig.create({
                data: { id: 'global_config', tos: newTOS }
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("TOS Update Error:", error);
        return res.status(500).json({ error: 'Failed to update TOS.', details: error.message });
    }
});

module.exports = router;