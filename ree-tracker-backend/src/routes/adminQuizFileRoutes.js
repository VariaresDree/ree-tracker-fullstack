// Admin > Handouts > Quiz files: upload, replace, rename and delete the quiz files
// every learner can download. The body of an upload is the file itself, on its
// own raw parser here: the global JSON parser leaves this content type alone.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const { validate } = require('../middlewares/validate');
const { quizFileCreateSchema, quizFileReplaceSchema, quizFileUpdateSchema } = require('../schemas/quizFileSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { MAX_QUIZ_FILE_BYTES, LIST_SELECT, looksLikeZip, checksumOf } = require('../services/quizFiles');

router.use(authMiddleware, adminMiddleware);

const rawFile = express.raw({ type: 'application/octet-stream', limit: MAX_QUIZ_FILE_BYTES });

/** The file and its details, or the reason to refuse them. */
function readUpload(req, schema) {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return { status: 415, error: 'Send the file itself.' };
    if (!looksLikeZip(req.body)) return { status: 400, error: "That isn't a quiz file." };
    const meta = schema.safeParse(req.query);
    if (!meta.success) return { status: 400, error: 'Validation failed.', details: meta.error.flatten().fieldErrors };
    return { meta: meta.data, bytes: req.body, sizeBytes: req.body.length, checksum: checksumOf(req.body) };
}

async function refuseDuplicate(res, checksum) {
    const other = await prisma.quizFile.findUnique({ where: { checksum }, select: { name: true } });
    return res.status(409).json({ error: `That file is already here, as ${other?.name || 'another quiz'}.`, code: 'DUPLICATE' });
}

router.post('/', rawFile, async (req, res) => {
    const upload = readUpload(req, quizFileCreateSchema);
    if (upload.error) return res.status(upload.status).json({ error: upload.error, details: upload.details });
    try {
        const item = await prisma.quizFile.create({
            data: {
                ...upload.meta,
                bytes: upload.bytes,
                sizeBytes: upload.sizeBytes,
                checksum: upload.checksum,
                uploadedBy: req.user.id,
            },
            select: LIST_SELECT,
        });
        return res.status(201).json({ item });
    } catch (error) {
        if (error.code === 'P2002') return refuseDuplicate(res, upload.checksum);
        logger.error('Quiz file upload failed', { error: error.message });
        return res.status(500).json({ error: "Couldn't upload that quiz." });
    }
});

// A new version of the same quiz. A changed checksum is how learners who have the
// old one see Update available.
router.put('/:id/file', rawFile, async (req, res) => {
    const upload = readUpload(req, quizFileReplaceSchema);
    if (upload.error) return res.status(upload.status).json({ error: upload.error, details: upload.details });
    try {
        const item = await prisma.quizFile.update({
            where: { id: req.params.id },
            data: { ...upload.meta, bytes: upload.bytes, sizeBytes: upload.sizeBytes, checksum: upload.checksum },
            select: LIST_SELECT,
        });
        return res.status(200).json({ item });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Quiz file not found.' });
        if (error.code === 'P2002') return refuseDuplicate(res, upload.checksum);
        logger.error('Quiz file replace failed', { error: error.message });
        return res.status(500).json({ error: "Couldn't replace that quiz." });
    }
});

router.patch('/:id', validate(quizFileUpdateSchema), async (req, res) => {
    try {
        const item = await prisma.quizFile.update({ where: { id: req.params.id }, data: req.body, select: LIST_SELECT });
        return res.status(200).json({ item });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Quiz file not found.' });
        logger.error('Quiz file update failed', { error: error.message });
        return res.status(500).json({ error: "Couldn't save those changes." });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await prisma.quizFile.delete({ where: { id: req.params.id } });
        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Quiz file not found.' });
        logger.error('Quiz file delete failed', { error: error.message });
        return res.status(500).json({ error: "Couldn't delete that quiz." });
    }
});

// The raw parser's own refusal, in plain words: the app's handler talks about images.
router.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Quiz files can be up to 5 MB.', code: 'TOO_LARGE' });
    return next(err);
});

module.exports = router;
