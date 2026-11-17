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
const { normSubtopicKey } = require('@ree/shared/subtopics');
const { normalizeSubject } = require('../utils/subject');
const { withMathDelimiters } = require('../utils/mathDelimiters');
const { checkVariableCoverage } = require('../utils/formulaSymbols');
const { bulkIdsSchema } = require('../schemas/reviewSchemas');
const {
    referenceCardCreateSchema,
    referenceCardUpdateSchema,
    sourceCreateSchema,
    sourceUpdateSchema,
    aiIntakeSchema,
    validateCardRules,
    tagRenameSchema,
} = require('../schemas/referenceCardSchemas');

router.use(authMiddleware);

const { CARD_SELECT, LEARNER_CARD_WHERE } = require('../services/referenceCardView');

// Content snapshot for the audit trail (excludes ids/timestamps/status).
function cardSnapshot(card) {
    const { id, createdAt, updatedAt, status, topic, source, subtopic, ...content } = card;
    return subtopic !== undefined ? { ...content, subtopicId: subtopic?.id ?? null } : content;
}

// Everyone's math reaches the renderer in $ delimiters: another AI's \( \) would
// otherwise be wrapped whole, and show as source.
const unbracket = (value) => (typeof value === 'string' ? value.replace(/\\\((.+?)\\\)/g, '$$$1$$') : value);
const cardMath = (value) => withMathDelimiters(unbracket(value));

// What models write when a symbol has no unit. They're not units, and they read as
// nonsense in the Where table: 5 live rows said "null", others "unit of f".
const NOT_A_UNIT = /^(null|none|n\/?a|-+|dimensionless|unitless|decimal|depends on.*|unit of.*)$/i;
const cardUnit = (unit) => {
    if (typeof unit !== 'string') return unit ?? null;
    const words = unit.replace(/\$|\\text\{|\}/g, '').trim();
    return NOT_A_UNIT.test(words) ? null : cardMath(unit);
};

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
        // Within the card's own subject: a topic of another subject would file
        // it where its subject's topic tiles never show it.
        topicRow = await resolveTopic(payload.subject, payload.topic, { crossSubject: false });
        if (!topicRow) reasons.push('unknown-topic');
    }
    // The syllabus subtopic, by name, within the card's own topic (null takes it off).
    let subtopicId;
    if (payload.subtopic !== undefined) {
        if (payload.subtopic === null) subtopicId = null;
        else {
            const row = topicRow && await prisma.syllabusSubtopic.findFirst({
                where: { topicId: topicRow.id, normKey: normSubtopicKey(payload.subtopic), active: true },
                select: { id: true },
            });
            if (row) subtopicId = row.id;
            else reasons.push('unknown-subtopic');
        }
    }
    if (reasons.length > 0) return { reasons };
    // Normalize math delimiters ONCE, at the single write choke point shared
    // by manual create / AI intake / edit — see utils/mathDelimiters.js for
    // why. Render-time defense in Flashcard.jsx stays; this stops new rows
    // from needing it.
    const variables = Array.isArray(payload.variables)
        ? payload.variables.map((v) => ({
            ...v,
            symbol: cardMath(v?.symbol),
            meaning: unbracket(v?.meaning),
            unit: cardUnit(v?.unit),
        }))
        : [];
    return {
        data: {
            kind: payload.kind,
            symbol: cardMath(payload.symbol) ?? null,
            name: String(payload.name).trim(),
            formulaLatex: cardMath(payload.formulaLatex) ?? null,
            valueUnit: cardMath(payload.valueUnit) ?? null,
            description: unbracket(payload.description),
            variables,
            purposeExamTip: unbracket(payload.purposeExamTip) ?? null,
            subject: normalizeSubject(payload.subject),
            topicId: topicRow?.id ?? null,
            subtopicTag: payload.subtopicTag ?? null,
            ...(subtopicId !== undefined ? { subtopicId } : {}),
            dimensionless: !!payload.dimensionless,
            sourceId: payload.sourceId ?? null,
        },
    };
}

// ── Reads ────────────────────────────────────────────────────────────────────

// GET /api/reference-cards — every LIVE formula and constant (any authed user;
// cached client-side for offline). Concept cards are admin-only now.
router.get('/', async (req, res) => {
    try {
        const items = await prisma.referenceCard.findMany({
            where: LEARNER_CARD_WHERE,
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
        // Advice for the reviewer, never a gate (see validateCardRules).
        const withAdvice = items.map((card) => (card.kind === 'formula' && card.formulaLatex
            ? { ...card, uncovered: checkVariableCoverage(card.formulaLatex, card.variables || [], card.symbol).missing }
            : card));
        return res.status(200).json({ items: withAdvice });
    } catch (error) {
        logger.error('pending cards fetch failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch pending cards.' });
    }
});

// GET /api/reference-cards/retired — live concept cards, which learners no
// longer see (formula cards are formulas and constants only). Admin › Formula
// cards lists them so each can be re-typed as a formula or a constant, or
// deleted.
router.get('/retired', requireAdmin, async (req, res) => {
    try {
        const items = await prisma.referenceCard.findMany({
            where: { status: 'LIVE', kind: 'concept' },
            select: CARD_SELECT,
            orderBy: [{ subject: 'asc' }, { name: 'asc' }],
        });
        return res.status(200).json({ items });
    } catch (error) {
        logger.error('retired cards fetch failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch retired cards.' });
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

/**
 * A rejected card keeps its row (reject is a soft state), and so its place in
 * the kind/subject/name unique key. Nobody can see it, so a new card of that
 * name would be refused forever: it takes the old row over instead. Null when
 * no rejected row holds the name.
 */
async function reviveRejected(data, status, userId) {
    const row = await prisma.referenceCard.findFirst({
        where: { kind: data.kind, subject: data.subject, name: data.name, status: 'REJECTED' },
        select: { id: true },
    });
    if (!row) return null;
    const live = status === 'LIVE';
    return prisma.referenceCard.update({
        where: { id: row.id },
        data: { ...data, status, reviewNote: null, submittedBy: userId, reviewedBy: live ? userId : null, reviewedAt: live ? new Date() : null },
        select: CARD_SELECT,
    });
}

// POST /api/reference-cards — manual admin creation goes LIVE directly (the
// admin IS the reviewer), still through the full required-field gate.
router.post('/', requireAdmin, validate(referenceCardCreateSchema), idempotency(), async (req, res) => {
    try {
        const { data, reasons } = await toCardData(req.body);
        if (reasons) return res.status(400).json({ error: 'Card is incomplete.', reasons });
        let card;
        try {
            card = await prisma.referenceCard.create({
                data: { ...data, status: 'LIVE', submittedBy: req.user.id, reviewedBy: req.user.id, reviewedAt: new Date() },
                select: CARD_SELECT,
            });
        } catch (err) {
            card = err.code === 'P2002' ? await reviveRejected(data, 'LIVE', req.user.id) : null;
            if (!card) throw err;
        }
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
            let card;
            try {
                card = await prisma.referenceCard.create({
                    data: { ...data, status: 'PENDING', submittedBy: req.user.id },
                });
            } catch (err) {
                card = err.code === 'P2002' ? await reviveRejected(data, 'PENDING', req.user.id) : null;
                if (!card) { rejected.push({ index: i, reasons: [err.code === 'P2002' ? 'duplicate' : 'create-failed'] }); continue; }
            }
            queued.push(card.id);
            // The card is in the queue by now: a failed audit row mustn't say otherwise.
            await prisma.referenceCardVersion.create({
                data: { cardId: card.id, action: 'SUBMITTED', editor: null, snapshot: cardSnapshot(card) },
            }).catch((err) => logger.error('card audit write failed', { cardId: card.id, error: err.message }));
        }
        return res.status(200).json({ success: true, queued, rejected });
    } catch (error) {
        logger.error('card ai-intake failed', { error: error.message });
        return res.status(500).json({ error: 'AI intake failed.' });
    }
});

// POST /api/reference-cards/tags/rename — one tag across a topic, in any letter
// case. Renaming onto a tag already in use merges the two.
router.post('/tags/rename', requireAdmin, validate(tagRenameSchema), async (req, res) => {
    try {
        const { subject, topic, from, to } = req.body;
        const topicRow = await resolveTopic(subject, topic, { crossSubject: false });
        if (!topicRow) return res.status(400).json({ error: 'That topic is not in this subject.' });
        const rows = await prisma.referenceCard.findMany({
            where: { topicId: topicRow.id, status: { in: ['LIVE', 'PENDING'] }, subtopicTag: { equals: from, mode: 'insensitive' } },
            select: CARD_SELECT,
        });
        if (rows.length === 0) return res.status(200).json({ success: true, updated: 0 });
        await prisma.$transaction([
            prisma.referenceCard.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { subtopicTag: to } }),
            prisma.referenceCardVersion.createMany({
                data: rows.map((r) => ({ cardId: r.id, action: 'EDITED', editor: req.user.id, snapshot: { ...cardSnapshot(r), subtopicTag: to } })),
            }),
        ]);
        return res.status(200).json({ success: true, updated: rows.length });
    } catch (error) {
        logger.error('card tag rename failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to rename the tag.' });
    }
});

// ── Admin: review actions ───────────────────────────────────────────────────

// POST /api/reference-cards/approve-bulk — "Accept All" over the card queue:
// per-item outcomes, eligibility = the FULL required-field gate re-checked on
// the stored row. The eligible rows go LIVE in ONE transaction (2026-11-17): a
// round trip per card ran past the request timeout on a queue of hundreds, and
// the client now sends the queue in chunks of 100.
router.post('/approve-bulk', requireAdmin, validate(bulkIdsSchema), idempotency(), async (req, res) => {
    try {
        const failed = [];
        const eligible = [];
        const uniqueIds = [...new Set(req.body.ids)];
        const rows = await prisma.referenceCard.findMany({ where: { id: { in: uniqueIds } }, select: CARD_SELECT });
        const byId = new Map(rows.map((r) => [r.id, r]));
        for (const id of uniqueIds) {
            const row = byId.get(id);
            if (!row) { failed.push({ id, reason: 'not-found' }); continue; }
            if (row.status !== 'PENDING') { failed.push({ id, reason: 'already-reviewed' }); continue; }
            const reasons = validateCardRules({ ...row, topic: row.topic?.name });
            if (reasons.length > 0) { failed.push({ id, reason: reasons.join('|') }); continue; }
            eligible.push(row);
        }
        if (eligible.length === 0) return res.status(200).json({ success: true, approved: [], failed });
        const ids = eligible.map((r) => r.id);
        try {
            await prisma.$transaction([
                prisma.referenceCard.updateMany({
                    where: { id: { in: ids }, status: 'PENDING' },
                    data: { status: 'LIVE', reviewedBy: req.user.id, reviewedAt: new Date() },
                }),
                prisma.referenceCardVersion.createMany({
                    data: eligible.map((row) => ({ cardId: row.id, action: 'APPROVED', editor: req.user.id, snapshot: cardSnapshot(row) })),
                }),
            ]);
        } catch (err) {
            logger.error('card bulk approve transaction failed', { error: err.message });
            return res.status(200).json({ success: true, approved: [], failed: [...failed, ...ids.map((id) => ({ id, reason: 'update-failed' }))] });
        }
        return res.status(200).json({ success: true, approved: ids, failed });
    } catch (error) {
        logger.error('card bulk approve failed', { error: error.message });
        return res.status(500).json({ error: 'Bulk approval failed.' });
    }
});

// ── Admin: proposed rewrites of live cards (2026-11-16) ───────────────────────
//
// A rewrite of a live card waits here instead of changing what learners see.
// Approving copies its content onto the card in place, so reviews stay
// attached, after the same full gate as any edit; `retire` takes the card out.

const REVISION_FIELDS = ['kind', 'symbol', 'name', 'formulaLatex', 'valueUnit', 'description', 'variables', 'purposeExamTip', 'subtopic', 'subtopicTag', 'dimensionless'];

/** One revision applied: { ok: true } or { ok: false, reason }. */
async function applyRevision(id, userId) {
    const rev = await prisma.referenceCardRevision.findUnique({ where: { id }, select: { id: true, status: true, retire: true, note: true, content: true, cardId: true } });
    if (!rev) return { ok: false, reason: 'not-found' };
    if (rev.status !== 'PENDING') return { ok: false, reason: 'already-reviewed' };
    const card = await prisma.referenceCard.findUnique({ where: { id: rev.cardId }, select: CARD_SELECT });
    if (!card || card.status === 'REJECTED') return { ok: false, reason: 'card-gone' };
    const done = { status: 'APPLIED', reviewedBy: userId, reviewedAt: new Date() };
    if (rev.retire) {
        await prisma.$transaction([
            prisma.referenceCard.update({ where: { id: card.id }, data: { status: 'REJECTED', reviewNote: rev.note || 'Retired in a review.', reviewedBy: userId, reviewedAt: new Date() } }),
            prisma.referenceCardVersion.create({ data: { cardId: card.id, action: 'REJECTED', editor: userId, snapshot: cardSnapshot(card) } }),
            prisma.referenceCardRevision.update({ where: { id: rev.id }, data: done }),
        ]);
        return { ok: true };
    }
    const content = Object.fromEntries(Object.entries(rev.content || {}).filter(([k]) => REVISION_FIELDS.includes(k)));
    const merged = { ...card, topic: card.topic?.name, subtopic: card.subtopic?.name ?? null, ...content };
    const { data, reasons } = await toCardData(merged);
    if (reasons) return { ok: false, reason: reasons.join('|') };
    try {
        await prisma.$transaction(async (tx) => {
            const updated = await tx.referenceCard.update({ where: { id: card.id }, data, select: CARD_SELECT });
            await tx.referenceCardVersion.create({ data: { cardId: card.id, action: 'EDITED', editor: userId, snapshot: cardSnapshot(updated) } });
            await tx.referenceCardRevision.update({ where: { id: rev.id }, data: done });
        });
    } catch (err) {
        if (err.code === 'P2002') return { ok: false, reason: 'name-taken' };
        throw err;
    }
    return { ok: true };
}

// GET /api/reference-cards/revisions — rewrites waiting, each with the card as it is.
router.get('/revisions', requireAdmin, async (req, res) => {
    try {
        const items = await prisma.referenceCardRevision.findMany({
            where: { status: 'PENDING' },
            orderBy: { createdAt: 'asc' },
            select: { id: true, content: true, retire: true, note: true, createdAt: true, card: { select: CARD_SELECT } },
        });
        return res.status(200).json({ items });
    } catch (error) {
        logger.error('card revisions fetch failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to fetch the rewrites.' });
    }
});

// POST /api/reference-cards/revisions/approve-bulk — Approve all, for rewrites.
router.post('/revisions/approve-bulk', requireAdmin, validate(bulkIdsSchema), idempotency(), async (req, res) => {
    try {
        const approved = [];
        const failed = [];
        for (const id of [...new Set(req.body.ids)]) {
            const out = await applyRevision(id, req.user.id).catch(() => ({ ok: false, reason: 'update-failed' }));
            if (out.ok) approved.push(id);
            else failed.push({ id, reason: out.reason });
        }
        return res.status(200).json({ success: true, approved, failed });
    } catch (error) {
        logger.error('card revisions bulk approve failed', { error: error.message });
        return res.status(500).json({ error: 'Bulk approval failed.' });
    }
});

router.post('/revisions/:id/approve', requireAdmin, async (req, res) => {
    try {
        const out = await applyRevision(req.params.id, req.user.id);
        if (out.ok) return res.status(200).json({ success: true });
        const status = out.reason === 'not-found' ? 404 : out.reason === 'already-reviewed' || out.reason === 'card-gone' || out.reason === 'name-taken' ? 409 : 400;
        return res.status(status).json({ error: 'The rewrite was not applied.', reasons: [out.reason] });
    } catch (error) {
        logger.error('card revision approve failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to apply the rewrite.' });
    }
});

router.post('/revisions/:id/reject', requireAdmin, async (req, res) => {
    try {
        const { count } = await prisma.referenceCardRevision.updateMany({
            where: { id: req.params.id, status: 'PENDING' },
            data: { status: 'REJECTED', reviewedBy: req.user.id, reviewedAt: new Date() },
        });
        if (count === 0) return res.status(409).json({ error: 'This rewrite was already reviewed, or is gone.' });
        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('card revision reject failed', { error: error.message });
        return res.status(500).json({ error: 'Failed to reject the rewrite.' });
    }
});

// PUT /api/reference-cards/:id — edit a PENDING or LIVE card (true partial).
router.put('/:id', requireAdmin, validate(referenceCardUpdateSchema), async (req, res) => {
    try {
        const row = await prisma.referenceCard.findUnique({ where: { id: req.params.id }, select: CARD_SELECT });
        if (!row) return res.status(404).json({ error: 'Card not found.' });
        if (row.status === 'REJECTED') return res.status(409).json({ error: 'Card is rejected — resubmit instead.' });

        // Merge edits over the stored row, then re-run the FULL gate on the result.
        // A card moved to another topic leaves its subtopic behind unless one is given.
        const movedTopic = req.body.topic !== undefined && req.body.topic !== row.topic?.name;
        const merged = { ...row, topic: row.topic?.name, subtopic: movedTopic ? null : row.subtopic?.name ?? null, ...req.body };
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
