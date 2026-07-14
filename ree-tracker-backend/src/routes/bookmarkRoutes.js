const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { bookmarkCreateSchema } = require('../schemas/bookmarkSchemas');
const prisma = require('../config/db');

router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const cursor = req.query.cursor;

        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: req.user.id },
            include: {
                question: {
                    // answer + fixedExplanation are part of the vault's purpose
                    // (post-study review of saved items) — the tab rendered
                    // both from fields this select used to omit.
                    select: {
                        id: true, subject: true, subtopic: true,
                        text: true, options: true, difficulty: true, type: true,
                        answer: true, fixedExplanation: true,
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
            items: bookmarks.map(b => ({ ...b.question, bookmarkId: b.id, bookmarkedAt: b.createdAt })),
            nextCursor: hasMore ? bookmarks[bookmarks.length - 1].id : null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookmarks.' });
    }
});

router.post('/', authMiddleware, validate(bookmarkCreateSchema), async (req, res) => {
    try {
        const { questionId } = req.body;

        const bookmark = await prisma.bookmark.create({
            data: { userId: req.user.id, questionId }
        });
        res.status(201).json({ success: true, id: bookmark.id });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Already bookmarked.' });
        }
        // FK violation → the questionId doesn't exist. Map to 404 instead of 500.
        if (error.code === 'P2003') {
            return res.status(404).json({ error: 'Question not found.' });
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
