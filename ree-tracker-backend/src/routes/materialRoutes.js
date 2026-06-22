const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const folders = await prisma.folder.findMany({ orderBy: { name: 'asc' } });
        const materials = await prisma.material.findMany({ orderBy: { createdAt: 'desc' } });

        return res.status(200).json({ success: true, folders, materials });
    } catch (error) {
        console.error("Material Fetch Error:", error);
        return res.status(500).json({ error: 'Failed to fetch vault contents.' });
    }
});

module.exports = router;
