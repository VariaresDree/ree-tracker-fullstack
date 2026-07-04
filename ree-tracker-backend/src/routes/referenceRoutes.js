// src/routes/referenceRoutes.js
// Modular reference library: engineering constants & formulas. Reads are open to
// any authenticated user (the client merges these over its bundled offline seed);
// writes require ADMIN. Backs the "insert / delete / verify what's included"
// admin experience in the Materials Hub.
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');
const prisma = require('../config/db');
const logger = require('../utils/logger');
const {
    constantCreateSchema, constantUpdateSchema,
    formulaCreateSchema, formulaUpdateSchema, importSchema,
} = require('../schemas/referenceSchemas');

// ---- CONSTANTS ------------------------------------------------------------
router.get('/constants', authMiddleware, async (req, res) => {
    try {
        const items = await prisma.engineeringConstant.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        res.status(200).json({ items });
    } catch (error) {
        logger.error('Constants fetch error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch constants.' });
    }
});

router.post('/constants', authMiddleware, requireAdmin, validate(constantCreateSchema), async (req, res) => {
    try {
        const item = await prisma.engineeringConstant.create({ data: req.body });
        res.status(201).json({ success: true, item });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'A constant with this category + name already exists.' });
        res.status(500).json({ error: 'Failed to create constant.' });
    }
});

router.put('/constants/:id', authMiddleware, requireAdmin, validate(constantUpdateSchema), async (req, res) => {
    try {
        const item = await prisma.engineeringConstant.update({ where: { id: req.params.id }, data: req.body });
        res.status(200).json({ success: true, item });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Constant not found.' });
        if (error.code === 'P2002') return res.status(409).json({ error: 'Duplicate category + name.' });
        res.status(500).json({ error: 'Failed to update constant.' });
    }
});

router.delete('/constants/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        await prisma.engineeringConstant.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Constant not found.' });
        res.status(500).json({ error: 'Failed to delete constant.' });
    }
});

// ---- FORMULAS -------------------------------------------------------------
router.get('/formulas', authMiddleware, async (req, res) => {
    try {
        const items = await prisma.engineeringFormula.findMany({
            orderBy: [{ subject: 'asc' }, { title: 'asc' }],
        });
        res.status(200).json({ items });
    } catch (error) {
        logger.error('Formulas fetch error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch formulas.' });
    }
});

router.post('/formulas', authMiddleware, requireAdmin, validate(formulaCreateSchema), async (req, res) => {
    try {
        const item = await prisma.engineeringFormula.create({ data: req.body });
        res.status(201).json({ success: true, item });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ error: 'A formula with this subject + title already exists.' });
        res.status(500).json({ error: 'Failed to create formula.' });
    }
});

router.put('/formulas/:id', authMiddleware, requireAdmin, validate(formulaUpdateSchema), async (req, res) => {
    try {
        const item = await prisma.engineeringFormula.update({ where: { id: req.params.id }, data: req.body });
        res.status(200).json({ success: true, item });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Formula not found.' });
        if (error.code === 'P2002') return res.status(409).json({ error: 'Duplicate subject + title.' });
        res.status(500).json({ error: 'Failed to update formula.' });
    }
});

router.delete('/formulas/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        await prisma.engineeringFormula.delete({ where: { id: req.params.id } });
        res.status(200).json({ success: true });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ error: 'Formula not found.' });
        res.status(500).json({ error: 'Failed to delete formula.' });
    }
});

// ---- BULK IMPORT (seed the bundled library into the DB) -------------------
// Lets an admin promote the hardcoded seed into editable DB rows in one click.
// skipDuplicates keeps it idempotent against the natural-key unique constraints.
router.post('/import', authMiddleware, requireAdmin, validate(importSchema), async (req, res) => {
    try {
        const { constants, formulas } = req.body;
        const [c, f] = await Promise.all([
            constants.length
                ? prisma.engineeringConstant.createMany({ data: constants, skipDuplicates: true })
                : { count: 0 },
            formulas.length
                ? prisma.engineeringFormula.createMany({ data: formulas, skipDuplicates: true })
                : { count: 0 },
        ]);
        res.status(200).json({ success: true, constantsAdded: c.count, formulasAdded: f.count });
    } catch (error) {
        logger.error('Reference import error', { error: error.message });
        res.status(500).json({ error: 'Import failed.' });
    }
});

module.exports = router;
