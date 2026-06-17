// src/routes/metadataRoutes.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

router.get('/vault', authMiddleware, async (req, res) => {
    try {
        const materialCount = await prisma.material.count();
        const folderCount = await prisma.folder.count();
        
        return res.status(200).json({
            totalFiles: materialCount,
            totalFolders: folderCount,
            lastSync: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch metadata.' });
    }
});

router.post('/vault/resync', authMiddleware, async (req, res) => {
    try {
        // A placeholder for vault resync logic
        res.status(200).json({ success: true, message: "Vault synchronized." });
    } catch (error) {
        res.status(500).json({ error: 'Resync failed.' });
    }
});

module.exports = router;