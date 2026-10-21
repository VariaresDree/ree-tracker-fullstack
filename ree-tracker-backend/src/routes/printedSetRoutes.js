// Printed paper sets (Exams › Paper sets) and their scanned answer sheets.
//
// A set is drawn on the device, saved here once, edited for that printing
// only (never the question bank), printed, and marked from photos of its
// answer sheets. Photos never leave the device: a sheet arrives as its answers
// string and a name. The server computes the key version and every score with
// the shared rules (@ree/shared paperSets), the same functions the app uses
// for its instant result, and ignores any the client sends; when an edit
// changes the key, every sheet of the set is scored again.
//
// DISPLAY ONLY: paper results never reach θ, the forecast, readiness or the
// rankings. tests/displayOnlyTables.test.js fails if either model is used
// anywhere but this file. A self-check's history entry is an ordinary
// OutsideScore, written by the client through outsideScoreRoutes.
//
// Mounted under /api/user (per-user data must stay out of the service
// worker's cached /api paths; see ree-tracker/scripts/check-sw-routes.cjs).
// Sheets nest under their set, so the client's offline queue (one queueKey
// for the set) never sends a sheet before the set it belongs to.
const express = require('express');
const router = express.Router();
const { Prisma } = require('@prisma/client');
const authMiddleware = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const idempotency = require('../middlewares/idempotency');
const {
    printedSetCreateSchema, printedSetPatchSchema, sheetCreateSchema, sheetPatchSchema,
    editsAgainstItems, isEmptyEdit, NAME_REQUIRED,
} = require('../schemas/printedSetSchemas');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const {
    PAPER_SET_LIMITS: L, effectiveItems, keyVersionOf, scorePaperSheet,
} = require('@ree/shared');

const SET_NOT_FOUND = 'Paper set not found.';
const SHEET_NOT_FOUND = 'Sheet not found.';
const WITH_SHEET_COUNT = { _count: { select: { sheets: true } } };

// A refusal from inside a transaction, answered as is.
class PaperSetError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
const refuse = (res, error) => res.status(error.status).json({ error: error.message, ...(error.details ? { details: error.details } : {}) });

// The stored row minus the owner id, which the caller already is.
const view = ({ userId: _userId, ...row }) => row;

// The list: no items, edits, config or plan (they can reach a megabyte a
// set); `edited` (any item edited) stands in for the edits, as in the app's
// own summaries (paper-sets/printedSetModel summaryOf).
const SUMMARY_SELECT = {
    id: true, contentId: true, keyVersion: true, label: true, title: true, code: true, profile: true,
    itemCount: true, sections: true, prefs: true, edits: true, sittingKey: true, generatedAt: true,
    printedAt: true, createdAt: true, updatedAt: true, ...WITH_SHEET_COUNT,
};
const summary = ({ edits, ...row }) => ({ ...row, edited: Object.keys(edits || {}).length > 0 });

// A nullable Json column takes Prisma.DbNull, not null.
const jsonOrNull = (v) => (v == null ? Prisma.DbNull : v);

/** Every item's key letter in order: the key itself, which keyVersion hashes. */
const keyLetters = (items) => items.map((it) => it.answerLetter).join('');

/**
 * A sheet's score against the set as it stands now (its edits applied), as
 * the columns stored on the sheet.
 */
function scoreFor(set, answers, items = effectiveItems(set.items, set.edits)) {
    const r = scorePaperSheet({ items, sections: set.sections, profile: set.profile }, answers);
    return {
        keyVersion: set.keyVersion,
        correct: r.correct,
        scored: r.scored,
        sectionScores: r.sections,
        generalAverage: r.generalAverage,
        verdict: r.verdict,
    };
}

/**
 * Score every sheet of the set again with its current key, inside the
 * caller's transaction. Sheets whose score comes out the same keep it (only
 * the key version moves); the rest are written in groups of equal scores, so
 * a set of hundreds of sheets takes a few statements, not hundreds.
 * @returns {Promise<number>} how many sheets the set has (all now on the new key)
 */
async function rescoreSheets(tx, set, userId) {
    const sheets = await tx.scannedSheet.findMany({
        where: { setId: set.id, userId },
        select: { id: true, answers: true, correct: true, scored: true, sectionScores: true, generalAverage: true, verdict: true },
    });
    if (sheets.length === 0) return 0;
    const items = effectiveItems(set.items, set.edits);
    const groups = new Map();
    for (const sheet of sheets) {
        const { keyVersion: _k, ...score } = scoreFor(set, sheet.answers, items);
        const same = score.correct === sheet.correct && score.scored === sheet.scored
            && score.generalAverage === sheet.generalAverage && score.verdict === sheet.verdict
            && JSON.stringify(score.sectionScores) === JSON.stringify(sheet.sectionScores);
        if (same) continue;
        const key = JSON.stringify(score);
        if (!groups.has(key)) groups.set(key, { score, ids: [] });
        groups.get(key).ids.push(sheet.id);
    }
    await tx.scannedSheet.updateMany({ where: { setId: set.id, userId }, data: { keyVersion: set.keyVersion } });
    for (const { score, ids } of groups.values()) {
        await tx.scannedSheet.updateMany({ where: { id: { in: ids }, setId: set.id, userId }, data: score });
    }
    return sheets.length;
}

// Re-scoring a large set is a few statements per distinct score; give the
// transaction more than Prisma's 5 s default before it is rolled back.
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

// ── Sets ──────────────────────────────────────────────────────────────────

router.get('/printed-sets', authMiddleware, async (req, res) => {
    try {
        const rows = await prisma.printedSet.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: L.perUser,
            select: SUMMARY_SELECT,
        });
        res.status(200).json({ items: rows.map(summary) });
    } catch (error) {
        logger.error('Paper sets fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load your paper sets.' });
    }
});

router.get('/printed-sets/:id', authMiddleware, async (req, res) => {
    try {
        const row = await prisma.printedSet.findFirst({
            where: { id: req.params.id, userId: req.user.id },
            include: WITH_SHEET_COUNT,
        });
        if (!row) return res.status(404).json({ error: SET_NOT_FOUND });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        logger.error('Paper set fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load the paper set.' });
    }
});

// Idempotent on the client's key (a hash of the body, which carries the
// device-made id): a replayed create returns the first response.
router.post('/printed-sets', authMiddleware, validate(printedSetCreateSchema), idempotency(), async (req, res) => {
    const userId = req.user.id;
    const { id } = req.body;
    const mine = () => prisma.printedSet.findFirst({ where: { id, userId: req.user.id }, include: WITH_SHEET_COUNT });
    try {
        const count = await prisma.printedSet.count({ where: { userId: req.user.id } });
        if (count >= L.perUser) {
            // A replay of a set saved before the cap was reached is still that set.
            const existing = await mine();
            if (existing) return res.status(200).json({ item: view(existing) });
            return res.status(400).json({ error: `You can keep up to ${L.perUser} paper sets. Delete old ones to print more.` });
        }
        const b = req.body;
        const row = await prisma.printedSet.create({
            data: {
                id,
                userId,
                contentId: b.contentId,
                keyVersion: keyVersionOf(effectiveItems(b.items, b.edits)),
                label: b.label,
                title: b.title,
                code: b.code,
                profile: b.profile,
                itemCount: b.items.length,
                config: b.config,
                plan: b.plan,
                sections: b.sections,
                items: b.items,
                edits: b.edits,
                prefs: b.prefs,
                warnings: b.warnings ?? undefined,
                sittingKey: b.sittingKey,
                generatedAt: new Date(b.generatedAt),
            },
            include: WITH_SHEET_COUNT,
        });
        res.status(201).json({ item: view(row) });
    } catch (error) {
        // The id exists. If it is this user's, this is a replay the idempotency
        // record no longer covers (past its TTL): answer with the row. Not 409,
        // which the client's queue treats as "retry later", forever.
        if (error.code === 'P2002') {
            const existing = await mine().catch(() => null);
            if (existing) return res.status(200).json({ item: view(existing) });
            return res.status(400).json({ error: 'That set code is already in use.' });
        }
        logger.error('Paper set create failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the paper set.' });
    }
});

// No idempotency(): the edits are per item and whole, prefs are replaced and
// printed sets printedAt only once, so a replay changes nothing; and a
// body-hash key would wrongly replay an older edit after the item was edited
// back.
router.patch('/printed-sets/:id', authMiddleware, validate(printedSetPatchSchema), async (req, res) => {
    const { id } = req.params;
    try {
        const out = await prisma.$transaction(async (tx) => {
            // 1. The caller's set, or nothing.
            const set = await tx.printedSet.findFirst({ where: { id, userId: req.user.id } });
            if (!set) throw new PaperSetError(404, SET_NOT_FOUND);

            const data = {};
            // 2. Edits, merged per item: an item's edit is replaced whole, null
            //    (or an empty edit) reverts it to the bank's wording.
            let edits = set.edits || {};
            if (req.body.edits) {
                edits = { ...edits };
                for (const [n, edit] of Object.entries(req.body.edits)) {
                    if (isEmptyEdit(edit)) delete edits[n];
                    else edits[n] = edit;
                }
                const problems = editsAgainstItems(set.items, req.body.edits);
                if (problems) throw new PaperSetError(400, Object.values(problems)[0], { edits: Object.values(problems) });
                data.edits = edits;
            }
            // 3. Print preferences, replaced.
            if (req.body.prefs) data.prefs = req.body.prefs;
            // 4. Printed: the first time only.
            if (req.body.printed && !set.printedAt) data.printedAt = new Date();

            // 5. The key as it now stands.
            const before = effectiveItems(set.items, set.edits);
            const after = effectiveItems(set.items, edits);
            data.keyVersion = keyVersionOf(after);
            const keyChanged = data.keyVersion !== set.keyVersion || keyLetters(before) !== keyLetters(after);
            if (JSON.stringify({ ...set, ...data }).length > L.bytes) {
                throw new PaperSetError(400, 'This paper set is too large to save. Shorten some edits.');
            }

            // 6. Saved.
            const row = await tx.printedSet.update({
                where: { id, userId: req.user.id },
                data,
                include: WITH_SHEET_COUNT,
            });

            // 7. A changed key scores every sheet again.
            const rescored = keyChanged ? await rescoreSheets(tx, row, req.user.id) : 0;
            return { row, rescored };
        }, TX_OPTIONS);
        res.status(200).json({ item: view(out.row), rescored: out.rescored });
    } catch (error) {
        if (error instanceof PaperSetError) return refuse(res, error);
        if (error.code === 'P2025') return res.status(404).json({ error: SET_NOT_FOUND });
        logger.error('Paper set update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the paper set.' });
    }
});

// Always 200, even when nothing matched: a delete replayed from the offline
// queue after it already happened must not land in Sync issues. The set's
// sheets go with it (the foreign key cascades).
router.delete('/printed-sets/:id', authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.printedSet.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
        res.status(200).json({ success: true, deleted: count });
    } catch (error) {
        logger.error('Paper set delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the paper set.' });
    }
});

// ── Sheets ────────────────────────────────────────────────────────────────

router.get('/printed-sets/:id/sheets', authMiddleware, async (req, res) => {
    try {
        const set = await prisma.printedSet.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true } });
        if (!set) return res.status(404).json({ error: SET_NOT_FOUND });
        const rows = await prisma.scannedSheet.findMany({
            where: { setId: set.id, userId: req.user.id },
            orderBy: [{ scannedAt: 'desc' }, { createdAt: 'desc' }],
            take: L.sheetsPerSet,
        });
        res.status(200).json({ items: rows.map(view) });
    } catch (error) {
        logger.error('Sheets fetch failed', { error: error.message });
        res.status(500).json({ error: 'Failed to load the scanned sheets.' });
    }
});

// Idempotent on the client's key, and on the device-made sheet id: a replay
// returns the sheet as first saved. The score is the server's.
router.post('/printed-sets/:id/sheets', authMiddleware, validate(sheetCreateSchema), idempotency(), async (req, res) => {
    const setId = req.params.id;
    const b = req.body;
    const mine = () => prisma.scannedSheet.findFirst({ where: { id: b.id, setId, userId: req.user.id } });
    try {
        const set = await prisma.printedSet.findFirst({
            where: { id: setId, userId: req.user.id },
            select: { id: true, items: true, edits: true, sections: true, profile: true, keyVersion: true, itemCount: true },
        });
        if (!set) return res.status(404).json({ error: SET_NOT_FOUND });
        if (b.answers.length !== set.itemCount) {
            const message = `This sheet has ${b.answers.length} answers, but the paper has ${set.itemCount} items.`;
            return res.status(400).json({ error: message, details: { answers: [message] } });
        }
        const count = await prisma.scannedSheet.count({ where: { setId, userId: req.user.id } });
        if (count >= L.sheetsPerSet) {
            const existing = await mine();
            if (existing) return res.status(200).json({ item: view(existing) });
            return res.status(400).json({ error: `A paper set holds up to ${L.sheetsPerSet} sheets. Delete some to scan more.` });
        }
        const row = await prisma.scannedSheet.create({
            data: {
                id: b.id,
                userId: req.user.id,
                setId,
                takerName: b.takerName,
                isSelf: b.isSelf,
                answers: b.answers,
                review: b.review ?? undefined,
                outsideScoreId: b.outsideScoreId,
                scannedAt: new Date(b.scannedAt),
                ...scoreFor(set, b.answers),
            },
        });
        res.status(201).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2002') {
            const existing = await mine().catch(() => null);
            if (existing) return res.status(200).json({ item: view(existing) });
            return res.status(400).json({ error: 'That sheet id is already in use.' });
        }
        logger.error('Sheet save failed', { error: error.message });
        res.status(500).json({ error: 'Failed to save the sheet.' });
    }
});

// Rename, correct the answers, link the self-check's history entry, or
// record the corrected rows. Always scored again, against the current key.
router.patch('/printed-sets/:id/sheets/:sheetId', authMiddleware, validate(sheetPatchSchema), async (req, res) => {
    const { id: setId, sheetId } = req.params;
    const b = req.body;
    try {
        const sheet = await prisma.scannedSheet.findFirst({
            where: { id: sheetId, setId, userId: req.user.id },
            include: { set: { select: { id: true, items: true, edits: true, sections: true, profile: true, keyVersion: true, itemCount: true } } },
        });
        if (!sheet) return res.status(404).json({ error: SHEET_NOT_FOUND });

        const takerName = b.takerName !== undefined ? b.takerName : sheet.takerName;
        if (!sheet.isSelf && !takerName) {
            return res.status(400).json({ error: NAME_REQUIRED, details: { takerName: [NAME_REQUIRED] } });
        }
        const answers = b.answers !== undefined ? b.answers : sheet.answers;
        if (answers.length !== sheet.set.itemCount) {
            const message = `This sheet has ${answers.length} answers, but the paper has ${sheet.set.itemCount} items.`;
            return res.status(400).json({ error: message, details: { answers: [message] } });
        }
        const data = { takerName, answers, ...scoreFor(sheet.set, answers) };
        if (b.outsideScoreId !== undefined) data.outsideScoreId = b.outsideScoreId;
        if (b.review !== undefined) data.review = jsonOrNull(b.review);

        const row = await prisma.scannedSheet.update({ where: { id: sheetId, userId: req.user.id }, data });
        res.status(200).json({ item: view(row) });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: SHEET_NOT_FOUND });
        logger.error('Sheet update failed', { error: error.message });
        res.status(500).json({ error: 'Failed to update the sheet.' });
    }
});

// Always 200, like the set's delete.
router.delete('/printed-sets/:id/sheets/:sheetId', authMiddleware, async (req, res) => {
    try {
        const { count } = await prisma.scannedSheet.deleteMany({
            where: { id: req.params.sheetId, setId: req.params.id, userId: req.user.id },
        });
        res.status(200).json({ success: true, deleted: count });
    } catch (error) {
        logger.error('Sheet delete failed', { error: error.message });
        res.status(500).json({ error: 'Failed to delete the sheet.' });
    }
});

module.exports = router;
