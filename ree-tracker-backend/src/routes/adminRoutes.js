const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { calibrateItem } = require('../engine/irt');

router.use(authMiddleware, adminMiddleware);

// POST /api/admin/calibrate — same logic as scripts/calibrate.js but
// runnable on demand. Body: { dryRun?: boolean, minN?: number }
// Bounded scan size so we don't tie the request up for a 10k-item catalog.
router.post('/calibrate', async (req, res) => {
    try {
        const dryRun = !!req.body?.dryRun;
        const minN = Number(req.body?.minN) || 30;
        const limit = Math.min(Number(req.body?.limit) || 500, 2000);

        const candidates = await prisma.question.findMany({
            where: { attempts: { some: {} } },
            select: { id: true },
            take: limit,
        });

        let inspected = 0;
        let updated = 0;
        const sample = [];

        for (const q of candidates) {
            const attempts = await prisma.questionAttempt.findMany({
                where: { questionId: q.id },
                select: { isCorrect: true, user: { select: { thetaRating: true } } },
            });
            if (attempts.length < minN) continue;

            inspected += 1;
            const samples = attempts.map((a) => ({
                theta: a.user?.thetaRating ?? 0,
                correct: !!a.isCorrect,
            }));
            const params = calibrateItem(samples, { minN });
            if (!params) continue;

            if (sample.length < 10) sample.push({ id: q.id, n: samples.length, ...params });

            if (!dryRun) {
                await prisma.question.update({
                    where: { id: q.id },
                    data: {
                        irtA: params.a,
                        irtB: params.b,
                        irtC: params.c,
                        calibrationN: samples.length,
                        lastCalibratedAt: new Date(),
                    },
                });
                updated += 1;
            }
        }

        return res.status(200).json({
            dryRun,
            minN,
            totalCandidates: candidates.length,
            inspected,
            updated,
            sample,
        });
    } catch (error) {
        logger.error('admin calibrate failed', { error: error.message, stack: error.stack });
        return res.status(500).json({ error: 'Calibration run failed.' });
    }
});

module.exports = router;
