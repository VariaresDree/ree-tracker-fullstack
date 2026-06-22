const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: req.user.id },
            include: { question: true },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(bookmarks.map(b => b.question));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookmarks.' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const { questionId } = req.body;
        if (!questionId) return res.status(400).json({ error: 'questionId is required.' });

        const bookmark = await prisma.bookmark.create({
            data: { userId: req.user.id, questionId }
        });
        res.status(201).json({ success: true, id: bookmark.id });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Already bookmarked.' });
        }
        res.status(500).json({ error: 'Failed to create bookmark.' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.bookmark.deleteMany({
            where: { questionId: req.params.id, userId: req.user.id }
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove bookmark.' });
    }
});

module.exports = router;
