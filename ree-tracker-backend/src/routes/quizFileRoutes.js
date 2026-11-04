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

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const items = await prisma.quizFile.findMany({ select: LIST_SELECT, take: 500, orderBy: { name: 'asc' } });
        return res.status(200).json({ items });
    } catch (error) {
        logger.error('Quiz file list failed', { error: error.message });
        return res.status(500).json({ error: "Couldn't load the shared quizzes." });
    }
});

router.get('/:id/file', async (req, res) => {
    try {
        const file = await prisma.quizFile.findUnique({
            where: { id: req.params.id },
            select: { fileName: true, bytes: true },
        });
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
