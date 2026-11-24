// Admin › Assigned exams: put an exam together from the question bank, publish
// it for every learner, take it back to draft, delete it.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const { validate } = require('../middlewares/validate');
const { assignedExamSchema, assignedExamStatusSchema } = require('../schemas/assignedExamSchemas');
const assignedExams = require('../services/assignedExams');
const logger = require('../utils/logger');

router.use(authMiddleware, adminMiddleware);

/** The service's own refusals as they are; anything else is logged and a 500. */
const handle = (what, fn) => async (req, res) => {
    try {
        return await fn(req, res);
    } catch (error) {
        if (error instanceof assignedExams.AssignedExamError) return res.status(error.status).json({ error: error.message });
        logger.error(`Assigned exam ${what} failed`, { error: error.message });
        return res.status(500).json({ error: `Couldn't ${what} that exam.` });
    }
};

router.get('/', handle('list', async (req, res) => res.status(200).json({ items: await assignedExams.listForAdmin() })));

router.get('/:id', handle('load', async (req, res) => res.status(200).json({ item: await assignedExams.getForAdmin(req.params.id) })));

router.post('/', validate(assignedExamSchema), handle('save', async (req, res) => (
    res.status(201).json({ item: await assignedExams.create(req.body, req.user.id) })
)));

router.put('/:id', validate(assignedExamSchema), handle('save', async (req, res) => (
    res.status(200).json({ item: await assignedExams.update(req.params.id, req.body) })
)));

router.patch('/:id', validate(assignedExamStatusSchema), handle('update', async (req, res) => (
    res.status(200).json({ item: await assignedExams.setStatus(req.params.id, req.body.status) })
)));

router.delete('/:id', handle('delete', async (req, res) => {
    await assignedExams.remove(req.params.id);
    return res.status(200).json({ success: true });
}));

module.exports = router;
