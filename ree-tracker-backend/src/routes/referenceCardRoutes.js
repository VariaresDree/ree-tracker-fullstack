// src/routes/referenceCardRoutes.js
// Reference flashcard vault (replaces the legacy /api/reference constants +
// formulas routes). Cards file under the SHARED question-bank taxonomy
// (subject + Topic FK via topicResolver) and pass the required-field gate
// (schemas/referenceCardSchemas) at EVERY entry point. AI-generated cards land
// as PENDING and go live only through the human review gate — a wrong constant
// value is as damaging as a wrong answer key. Every lifecycle step writes a
// ReferenceCardVersion audit row (who/when/what), mirroring QuestionVersion.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const idempotency = require('../middlewares/idempotency');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const { resolveTopic } = require('../services/topicResolver');
const { normalizeSubject } = require('../utils/subject');
const { bulkIdsSchema } = require('../schemas/reviewSchemas');
const {
    referenceCardCreateSchema,
    referenceCardUpdateSchema,
    sourceCreateSchema,
    sourceUpdateSchema,
    aiIntakeSchema,
    validateCardRules,
} = require('../schemas/referenceCardSchemas');

router.use(authMiddleware);

const CARD_SELECT = {
    id: true, kind: true, symbol: true, name: true, formulaLatex: true,
    valueUnit: true, description: true, variables: true, purposeExamTip: true,
    subject: true, subtopicTag: true, dimensionless: true, status: true,
    sourceId: true, createdAt: true, updatedAt: true,
    topic: { select: { id: true, name: true } },
    source: { select: { id: true, title: true, edition: true, section: true } },
};

// Content snapshot for the audit trail (excludes ids/timestamps/status).
function cardSnapshot(card) {
    const { id, createdAt, updatedAt, status, topic, source, ...content } = card;
    return content;
}

/**
 * Resolve + normalize a validated payload into Prisma create/update data.
 * Strict taxonomy: the topic NAME must resolve to a real Topic row of the
 * shared taxonomy — a card that can't be filed under a real node is rejected.
 * Returns { data } or { reasons }.
 */
async function toCardData(payload) {
    const reasons = validateCardRules(payload);
    let topicRow = null;
    if (payload.subject !== undefined || payload.topic !== undefined) {
        topicRow = await resolveTopic(payload.subject, payload.topic);
        if (!topicRow) reasons.push('unknown-topic');
    }
    if (reasons.length > 0) return { reasons };
    return {
        data: {
            kind: payload.kind,
            symbol: payload.symbol ?? null,
            name: String(payload.name).trim(),
            formulaLatex: payload.formulaLatex ?? null,
            valueUnit: payload.valueUnit ?? null,
            description: payload.description,
            variables: Array.isArray(payload.variables) ? payload.variables : [],
            purposeExamTip: payload.purposeExamTip ?? null,
            subject: normalizeSubject(payload.subject),
            topicId: topicRow?.id ?? null,
            subtopicTag: payload.subtopicTag ?? null,
            dimensionless: !!payload.dimensionless,
            sourceId: payload.sourceId ?? null,
        },
    };
}

// ── Reads ────────────────────────────────────────────────────────────────────

// GET /api/reference-cards — every LIVE card (any authed user; cached client-side
// for offline).
router.get('/', async (req, res) => {
    try {
        const items = await prisma.referenceCard.findMany({
            where: { status: 'LIVE' },
            select: CARD_SELECT,
            orderBy: [{ subject: 'asc' }, { name: 'asc' }],
        });
        return res.status(200).json({ items });
    } catch (error) {
        logger.error('reference cards fetch failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch reference cards.' });
    }
});

// GET /api/reference-cards/sources — cited sources (authed; shown on card backs).
router.get('/sources', async (req, res) => {
    try {
        const items = await prisma.referenceSource.findMany({ orderBy: { title: 'asc' } });
        return res.status(200).json({ items });
    } catch (error) {
        logger.error('reference sources fetch failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch sources.' });
    }
});

// ── Admin: review queue + data quality ──────────────────────────────────────

// GET /api/reference-cards/pending — the card review queue.
router.get('/pending', requireAdmin, async (req, res) => {
    try {
        const items = await prisma.referenceCard.findMany({
            where: { status: 'PENDING' },
            select: CARD_SELECT,
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({ items });
    } catch (error) {
        logger.error('pending cards fetch failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch pending cards.' });
    }
});

// GET /api/reference-cards/debt — the Pillar-5 data-quality report: every
// non-rejected card that fails the required-field rules, with its reasons.
// Keeps the data debt visible and fixable instead of hidden.
router.get('/debt', requireAdmin, async (req, res) => {
    try {
        const cards = await prisma.referenceCard.findMany({
            where: { status: { in: ['LIVE', 'PENDING'] } },
            select: CARD_SELECT,
        });
        const items = cards
            .map((c) => ({ card: c, reasons: validateCardRules({ ...c, topic: c.topic?.name }) }))
            .filter((r) => r.reasons.length > 0);
        return res.status(200).json({ items, checked: cards.length });
    } catch (error) {
        logger.error('card debt report failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to build the data-quality report.' });
    }
});

// ── Admin: creation + AI intake ─────────────────────────────────────────────

// POST /api/reference-cards — manual admin creation goes LIVE directly (the
// admin IS the reviewer), still through the full required-field gate.
router.post('/', requireAdmin, validate(referenceCardCreateSchema), idempotency(), async (req, res) => {
    try {
        const { data, reasons } = await toCardData(req.body);
        if (reasons) return res.status(400).json({ error: 'Card is incomplete.', reasons });
        const card = await prisma.referenceCard.create({
            data: { ...data, status: 'LIVE', submittedBy: req.user.id, reviewedBy: req.user.id, reviewedAt: new Date() },
            select: CARD_SELECT,
        });
        await prisma.referenceCardVersion.create({
            data: { cardId: card.id, action: 'CREATED', editor: req.user.id, snapshot: cardSnapshot(card) },
        });
        return res.status(201).json({ success: true, item: card });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'A card with this kind/subject/name already exists.' });
        logger.error('card create failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to create the card.' });
    }
});

// POST /api/reference-cards/ai-intake — AI-generated candidates. Each card is
// validated BEFORE it can enter the review queue; incomplete output is
// rejected (regenerate) rather than queued for a human to patch by hand.
router.post('/ai-intake', requireAdmin, validate(aiIntakeSchema), idempotency(), async (req, res) => {
    try {
        const queued = [];
        const rejected = [];
        for (let i = 0; i < req.body.cards.length; i++) {
            const parsed = referenceCardCreateSchema.safeParse(req.body.cards[i]);
            if (!parsed.success) {
                rejected.push({ index: i, reasons: parsed.error.issues.map((iss) => `${iss.path.join('.')}:${iss.code}`) });
                continue;
            }
            const { data, reasons } = await toCardData(parsed.data);
            if (reasons) { rejected.push({ index: i, reasons }); continue; }
            try {
                const card = await prisma.referenceCard.create({
                    data: { ...data, status: 'PENDING', submittedBy: req.user.id },
                });
                await prisma.referenceCardVersion.create({
                    data: { cardId: card.id, action: 'SUBMITTED', editor: null, snapshot: cardSnapshot(card) },
                });
                queued.push(card.id);
            } catch (err) {
                rejected.push({ index: i, reasons: [err.code === 'P2002' ? 'duplicate' : 'create-failed'] });
            }
        }
        return res.status(200).json({ success: true, queued, rejected });
    } catch (error) {
        logger.error('card ai-intake failed', { error: error.message });
        return res.status(500).json({ error: 'AI intake failed.' });
    }
});

// ── Admin: review actions ───────────────────────────────────────────────────

// POST /api/reference-cards/approve-bulk — "Accept All" over the card queue:
// one batched request, per-item outcomes, eligibility = the FULL required-field
// gate re-checked on the stored row.
router.post('/approve-bulk', requireAdmin, validate(bulkIdsSchema), idempotency(), async (req, res) => {
    try {
        const approved = [];
        const failed = [];
        const uniqueIds = [...new Set(req.body.ids)];
        const rows = await prisma.referenceCard.findMany({ where: { id: { in: uniqueIds } }, select: CARD_SELECT });
        const byId = new Map(rows.map((r) => [r.id, r]));
        for (const id of uniqueIds) {
            const row = byId.get(id);
            if (!row) { failed.push({ id, reason: 'not-found' }); continue; }
            if (row.status !== 'PENDING') { failed.push({ id, reason: 'already-reviewed' }); continue; }
            const reasons = validateCardRules({ ...row, topic: row.topic?.name });
            if (reasons.length > 0) { failed.push({ id, reason: reasons.join('|') }); continue; }
            try {
                await prisma.$transaction([
                    prisma.referenceCard.update({
                        where: { id },
                        data: { status: 'LIVE', reviewedBy: req.user.id, reviewedAt: new Date() },
                    }),
                    prisma.referenceCardVersion.create({
                        data: { cardId: id, action: 'APPROVED', editor: req.user.id, snapshot: cardSnapshot(row) },
                    }),
                ]);
                approved.push(id);
            } catch (err) {
                failed.push({ id, reason: 'update-failed' });
            }
        }
        return res.status(200).json({ success: true, approved, failed });
    } catch (error) {
        logger.error('card bulk approve failed', { error: error.message });
        return res.status(500).json({ error: 'Bulk approval failed.' });
    }
});

// PUT /api/reference-cards/:id — edit a PENDING or LIVE card (true partial).
router.put('/:id', requireAdmin, validate(referenceCardUpdateSchema), async (req, res) => {
    try {
        const row = await prisma.referenceCard.findUnique({ where: { id: req.params.id }, select: CARD_SELECT });
        if (!row) return res.status(404).json({ error: 'Card not found.' });
        if (row.status === 'REJECTED') return res.status(409).json({ error: 'Card is rejected — resubmit instead.' });

        // Merge edits over the stored row, then re-run the FULL gate on the result.
        const merged = { ...row, topic: row.topic?.name, ...req.body };
        const { data, reasons } = await toCardData(merged);
        if (reasons) return res.status(400).json({ error: 'Edit would leave the card incomplete.', reasons });

        const updated = await prisma.referenceCard.update({ where: { id: row.id }, data, select: CARD_SELECT });
        await prisma.referenceCardVersion.create({
            data: { cardId: row.id, action: 'EDITED', editor: req.user.id, snapshot: cardSnapshot(updated) },
        });
        return res.status(200).json({ success: true, item: updated });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'A card with this kind/subject/name already exists.' });
        logger.error('card update failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to update the card.' });
    }
});

// PUT /api/reference-cards/:id/approve — single approve (re-validated).
router.put('/:id/approve', requireAdmin, async (req, res) => {
    try {
        const row = await prisma.referenceCard.findUnique({ where: { id: req.params.id }, select: CARD_SELECT });
        if (!row) return res.status(404).json({ error: 'Card not found.' });
        if (row.status !== 'PENDING') return res.status(409).json({ error: `Card is already ${row.status}.` });
        const reasons = validateCardRules({ ...row, topic: row.topic?.name });
        if (reasons.length > 0) return res.status(400).json({ error: 'Card is incomplete.', reasons });

        await prisma.$transaction([
            prisma.referenceCard.update({
                where: { id: row.id },
                data: { status: 'LIVE', reviewedBy: req.user.id, reviewedAt: new Date() },
            }),
            prisma.referenceCardVersion.create({
                data: { cardId: row.id, action: 'APPROVED', editor: req.user.id, snapshot: cardSnapshot(row) },
            }),
        ]);
        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('card approve failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to approve the card.' });
    }
});

// PUT /api/reference-cards/:id/reject — soft reject (auditable).
router.put('/:id/reject', requireAdmin, async (req, res) => {
    try {
        const row = await prisma.referenceCard.findUnique({ where: { id: req.params.id }, select: CARD_SELECT });
        if (!row) return res.status(404).json({ error: 'Card not found.' });
        if (row.status !== 'PENDING') return res.status(409).json({ error: `Card is already ${row.status}.` });

        await prisma.$transaction([
            prisma.referenceCard.update({
                where: { id: row.id },
                data: { status: 'REJECTED', reviewNote: req.body?.reviewNote || null, reviewedBy: req.user.id, reviewedAt: new Date() },
            }),
            prisma.referenceCardVersion.create({
                data: { cardId: row.id, action: 'REJECTED', editor: req.user.id, snapshot: cardSnapshot(row) },
            }),
        ]);
        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('card reject failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to reject the card.' });
    }
});

// DELETE /api/reference-cards/:id — audit row survives (cardId has no FK).
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const row = await prisma.referenceCard.findUnique({ where: { id: req.params.id }, select: CARD_SELECT });
        if (!row) return res.status(404).json({ error: 'Card not found.' });
        await prisma.$transaction([
            prisma.referenceCard.delete({ where: { id: row.id } }),
            prisma.referenceCardVersion.create({
                data: { cardId: row.id, action: 'DELETED', editor: req.user.id, snapshot: cardSnapshot(row) },
            }),
        ]);
        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('card delete failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to delete the card.' });
    }
});

// ── Admin: reference sources CRUD ───────────────────────────────────────────

router.post('/sources', requireAdmin, validate(sourceCreateSchema), idempotency(), async (req, res) => {
    try {
        const item = await prisma.referenceSource.create({ data: req.body });
        return res.status(201).json({ success: true, item });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'This source (title + edition) already exists.' });
        logger.error('source create failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to create the source.' });
    }
});

router.put('/sources/:id', requireAdmin, validate(sourceUpdateSchema), async (req, res) => {
    try {
        const item = await prisma.referenceSource.update({ where: { id: req.params.id }, data: req.body });
        return res.status(200).json({ success: true, item });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Source not found.' });
        if (error.code === 'P2002') return res.status(409).json({ error: 'This source (title + edition) already exists.' });
        logger.error('source update failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to update the source.' });
    }
});

router.delete('/sources/:id', requireAdmin, async (req, res) => {
    try {
        await prisma.referenceSource.delete({ where: { id: req.params.id } }); // cards keep living (SetNull)
        return res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Source not found.' });
        logger.error('source delete failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to delete the source.' });
    }
});

module.exports = router;
