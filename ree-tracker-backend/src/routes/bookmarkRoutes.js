const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const prisma = require('../config/db');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const cursor = req.query.cursor;

        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: req.user.id },
            include: {
                question: {
                    select: {
                        id: true, subject: true, subtopic: true,
                        text: true, options: true, difficulty: true, type: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
        });

        const hasMore = bookmarks.length > limit;
        if (hasMore) bookmarks.pop();

        res.status(200).json({
            items: bookmarks.map(b => ({ ...b.question, bookmarkId: b.id })),
            nextCursor: hasMore ? bookmarks[bookmarks.length - 1].id : null
        });
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
