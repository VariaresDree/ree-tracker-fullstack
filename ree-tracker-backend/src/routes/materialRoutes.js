const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const idempotency = require('../middlewares/idempotency');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const storage = require('../services/storage');
const { wouldCreateCycle, subtreeIds } = require('../services/folderTree');

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
// Materials + folders are a SHARED, global vault (no userId scoping) and are
// admin-managed in the UI (CloudVaultTab gates every mutation on isAdmin), so
// every write is admin-only here too — matching referenceRoutes. Reads (GET /)
// stay open to all authed users.
router.post('/folders', authMiddleware, requireAdmin, idempotency(), async (req, res) => {
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

router.patch('/folders/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, parentId } = req.body || {};
        const nextParentId = parentId || null;

        // Cycle guard: a folder can never become its own ancestor. Nothing
        // enforced this before — the FK on parentId only checks the target
        // row EXISTS, not that following it eventually reaches root — and an
        // unguarded move is exactly how the vault's folders previously ended
        // up unreachable (present in the DB, invisible in the app; see
        // scripts/recoverOrphanedFolders.js for the one-time repair).
        if (nextParentId !== undefined && nextParentId !== null) {
            const allFolders = await prisma.folder.findMany({ select: { id: true, parentId: true } });
            const byId = new Map(allFolders.map((f) => [f.id, f]));
            if (wouldCreateCycle(req.params.id, nextParentId, byId)) {
                return res.status(400).json({ error: "Can't move a folder into itself or one of its own subfolders." });
            }
        }

        const folder = await prisma.folder.update({
            where: { id: req.params.id },
            data: {
                ...(name != null ? { name: String(name).slice(0, 120) } : {}),
                ...(parentId !== undefined ? { parentId: nextParentId } : {}),
            },
        });
        return res.status(200).json({ folder });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Folder not found.' });
        logger.error('Folder update failed', { error: error.message });
        return res.status(500).json({ error: 'Folder update failed.' });
    }
});

router.delete('/folders/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        // Delete blobs for the ENTIRE subtree, not just this folder's direct
        // materials — onDelete: Cascade now removes every nested Folder/
        // Material ROW, but a cascade only ever touches SQL rows. Without this
        // walk, storage objects under nested folders leaked forever.
        const allFolders = await prisma.folder.findMany({ select: { id: true, parentId: true } });
        const targetIds = subtreeIds(req.params.id, allFolders);
        const contained = await prisma.material.findMany({
            where: { folderId: { in: [...targetIds] } },
            select: { storagePath: true },
        });
        for (const m of contained) {
            if (m.storagePath) await storage.delete(m.storagePath).catch(() => {});
        }
        // The self-relation FK cascades every descendant Folder row; Material's
        // existing FK cascades every Material row in the subtree.
        await prisma.folder.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true, deletedFolders: targetIds.size, deletedMaterials: contained.length });
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
    requireAdmin,
    idempotency(),
    express.json({ limit: '8mb' }),
    async (req, res) => {
        try {
            const { folderId, name, type, dataBase64, url } = req.body || {};
            if (!name) return res.status(400).json({ error: 'name is required.' });
            if (!dataBase64 && !url) return res.status(400).json({ error: 'Provide dataBase64 or url.' });
            // folderId is optional now — null/omitted means a root-level material.

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
                    folderId: folderId || null,
                },
            });
            return res.status(201).json({ material: mat });
        } catch (error) {
            logger.error('Material upload failed', { error: error.message, stack: error.stack });
            return res.status(500).json({ error: 'Material upload failed.' });
        }
    },
);

// Rename (name) and/or move (folderId) a material. folderId null = move to root.
router.patch('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { name, folderId } = req.body || {};
        const material = await prisma.material.update({
            where: { id: req.params.id },
            data: {
                ...(name != null ? { name: String(name).slice(0, 200) } : {}),
                ...(folderId !== undefined ? { folderId: folderId || null } : {}),
            },
        });
        return res.status(200).json({ material });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Material not found.' });
        logger.error('Material update failed', { error: error.message });
        return res.status(500).json({ error: 'Material update failed.' });
    }
});

router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
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
