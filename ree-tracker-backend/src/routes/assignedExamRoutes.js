// Exams › Assigned: the exams the admin has published, and one's questions to
// take it. A sitting is recorded like any mock (telemetry, then finalize,
// which tags it with the exam: services/examHistory.js).
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const assignedExams = require('../services/assignedExams');
const logger = require('../utils/logger');

router.use(authMiddleware);

const handle = (what, fn) => async (req, res) => {
    try {
        return await fn(req, res);
    } catch (error) {
        if (error instanceof assignedExams.AssignedExamError) return res.status(error.status).json({ error: error.message });
        logger.error(`Assigned exam ${what} failed`, { error: error.message });
        return res.status(500).json({ error: `Couldn't ${what}. Try again.` });
    }
};

router.get('/', handle('load the exams', async (req, res) => (
    res.status(200).json({ items: await assignedExams.listForLearner(req.user.id) })
)));

router.get('/:id/questions', handle('open that exam', async (req, res) => (
    res.status(200).json(await assignedExams.questionsForLearner(req.params.id, req.user.id))
)));

module.exports = router;
