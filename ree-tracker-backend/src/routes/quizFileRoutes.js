// Shared quiz files, for any signed-in learner: the list, and one file's bytes
// to keep on their device (Library > Imported quizzes). The admin's writes are in
// adminQuizFileRoutes.js. Neither path is in the service worker's API caches: the
// list needs to be current, and the app keeps the file itself.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { LIST_SELECT } = require('../services/quizFiles');
const { isAdminUser } = require('../middlewares/roleMiddleware');
const { hiddenFolderIds } = require('../services/handoutVisibility');

// Folders the admin hid from learners (2026-11-17): their quiz files are hidden too.
const hiddenFor = async (req) => ((await isAdminUser(req.user?.id))
    ? new Set()
    : hiddenFolderIds(await prisma.folder.findMany({ select: { id: true, parentId: true, hidden: true } })));

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const items = await prisma.quizFile.findMany({ select: LIST_SELECT, take: 500, orderBy: { name: 'asc' } });
        // Folders are looked up only when a quiz file sits in one.
        const hidden = items.some((q) => q.folderId) ? await hiddenFor(req) : new Set();
        return res.status(200).json({ items: items.filter((q) => !q.folderId || !hidden.has(q.folderId)) });
    } catch (error) {
        logger.error('Quiz file list failed', { error: error.message });
        return res.status(500).json({ error: "Couldn't load the shared quizzes." });
    }
});

router.get('/:id/file', async (req, res) => {
    try {
        const file = await prisma.quizFile.findUnique({
            where: { id: req.params.id },
            select: { fileName: true, bytes: true, folderId: true },
        });
        if (file?.folderId && (await hiddenFor(req)).has(file.folderId)) return res.status(404).json({ error: "That quiz isn't shared any more." });
        if (!file) return res.status(404).json({ error: "That quiz isn't shared any more." });
        res.attachment(file.fileName);
        res.set('Content-Type', 'application/octet-stream');
        res.set('Cache-Control', 'no-store');
        return res.status(200).send(Buffer.from(file.bytes));
    } catch (error) {
        logger.error('Quiz file download failed', { error: error.message });
        return res.status(500).json({ error: "Couldn't download that quiz." });
    }
});

module.exports = router;
