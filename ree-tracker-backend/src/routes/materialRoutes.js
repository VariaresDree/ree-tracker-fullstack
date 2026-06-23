const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const idempotency = require('../middlewares/idempotency');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const storage = require('../services/storage');

// --- LIST ---
// GET /api/materials — returns folders + materials in one payload so the
// Materials Hub UI can build its tree without a second roundtrip.
router.get('/', authMiddleware, async (req, res) => {
    try {
        const folders = await prisma.folder.findMany({ orderBy: { name: 'asc' } });
        const materials = await prisma.material.findMany({ orderBy: { createdAt: 'desc' } });
        return res.status(200).json({ success: true, folders, materials, driver: storage.driverName });
    } catch (error) {
        logger.error('Material fetch error', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Failed to fetch vault contents.' });
    }
});

// --- FOLDER CRUD ---
router.post('/folders', authMiddleware, idempotency(), async (req, res) => {
    try {
        const { name, parentId } = req.body || {};
        if (!name || String(name).trim().length === 0) return res.status(400).json({ error: 'Folder name required.' });
        const folder = await prisma.folder.create({
            data: { name: String(name).slice(0, 120), parentId: parentId || null },
        });
        return res.status(201).json({ folder });
    } catch (error) {
        logger.error('Folder create failed', { error: error.message });
        return res.status(500).json({ error: 'Folder create failed.' });
    }
});

router.patch('/folders/:id', authMiddleware, async (req, res) => {
    try {
        const { name, parentId } = req.body || {};
        const folder = await prisma.folder.update({
            where: { id: req.params.id },
            data: {
                ...(name != null ? { name: String(name).slice(0, 120) } : {}),
                ...(parentId !== undefined ? { parentId: parentId || null } : {}),
            },
        });
        return res.status(200).json({ folder });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Folder not found.' });
        logger.error('Folder update failed', { error: error.message });
        return res.status(500).json({ error: 'Folder update failed.' });
    }
});

router.delete('/folders/:id', authMiddleware, async (req, res) => {
    try {
        // Delete contained materials' blobs first, then cascade Prisma rows.
        const contained = await prisma.material.findMany({
            where: { folderId: req.params.id },
            select: { storagePath: true },
        });
        for (const m of contained) {
            if (m.storagePath) await storage.delete(m.storagePath).catch(() => {});
        }
        await prisma.folder.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Folder not found.' });
        logger.error('Folder delete failed', { error: error.message });
        return res.status(500).json({ error: 'Folder delete failed.' });
    }
});

// --- MATERIAL CRUD ---
// POST /api/materials/upload — accepts { folderId, name, type, dataBase64 }
// or { folderId, name, type, url } for already-hosted links.
//
// dataBase64 path bypasses multer to keep deps minimal; cap at ~6MB.
router.post(
    '/upload',
    authMiddleware,
    idempotency(),
    express.json({ limit: '8mb' }),
    async (req, res) => {
        try {
            const { folderId, name, type, dataBase64, url } = req.body || {};
            if (!name || !folderId) return res.status(400).json({ error: 'folderId and name are required.' });
            if (!dataBase64 && !url) return res.status(400).json({ error: 'Provide dataBase64 or url.' });

            let materialUrl = url;
            let storagePath = null;

            if (dataBase64) {
                const buf = Buffer.from(dataBase64, 'base64');
                if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ error: 'File too large (max ~6MB).' });
                storagePath = storage.makeKey(folderId, name);
                const out = await storage.put({ key: storagePath, body: buf, contentType: type });
                materialUrl = out.url;
            }

            const mat = await prisma.material.create({
                data: {
                    name: String(name).slice(0, 200),
                    url: materialUrl,
                    type: String(type || 'file').slice(0, 60),
                    storagePath,
                    folderId,
                },
            });
            return res.status(201).json({ material: mat });
        } catch (error) {
            logger.error('Material upload failed', { error: error.message, stack: error.stack });
            return res.status(500).json({ error: 'Material upload failed.' });
        }
    },
);

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const mat = await prisma.material.findUnique({ where: { id: req.params.id } });
        if (!mat) return res.status(404).json({ error: 'Material not found.' });
        if (mat.storagePath) await storage.delete(mat.storagePath).catch(() => {});
        await prisma.material.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Material delete failed', { error: error.message });
        return res.status(500).json({ error: 'Material delete failed.' });
    }
});

module.exports = router;
