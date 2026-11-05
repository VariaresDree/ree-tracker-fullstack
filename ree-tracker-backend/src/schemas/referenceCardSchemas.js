// src/schemas/referenceCardSchemas.js
// The required-field gate for reference flashcards — the SAME rules run at
// every entry point (AI intake, admin create/edit, bulk approve), so a
// bare-symbol card can never silently return. Shape validation is Zod;
// content-completeness rules (kind-specific requirements, formula variable
// coverage, subject/taxonomy normalization) live in validateCardRules so the
// approve/debt paths can re-check stored rows without re-parsing.
const { z } = require('zod');
const { hasUnbalancedMath } = require('@ree/shared');
const { normalizeSubject, SUBJECT_VARIANTS } = require('../utils/subject');

// A card is read at a glance and printed on a sheet. Tips ran to 480 characters.
// Counted on the source, so these leave room for LaTeX in a short sentence.
const MAX_DESCRIPTION = 180;
const MAX_TIP = 240;

// A card is a formula or a constant. 'concept' is retired (2026-10-31): old
// concept rows stay in the table for admins to re-type, but no new one is made
// and an edit can't set it.
const CARD_KINDS = ['constant', 'formula'];

const variableSchema = z.object({
    symbol: z.string().min(1).max(40),
    meaning: z.string().min(1).max(300),
    unit: z.string().max(60).nullable().optional(),
});

// Create/intake shape — defaults applied here are safe (full-object parse).
const referenceCardCreateSchema = z.object({
    kind: z.enum(CARD_KINDS),
    symbol: z.string().max(60).nullable().optional(),
    name: z.string().min(1).max(200),
    formulaLatex: z.string().max(2000).nullable().optional(),
    valueUnit: z.string().max(300).nullable().optional(),
    description: z.string().min(1).max(2000),
    // Models send null as often as they leave a field out.
    variables: z.array(variableSchema).max(30).nullish().transform((v) => v ?? []),
    purposeExamTip: z.string().max(2000).nullable().optional(),
    subject: z.string().min(1),
    topic: z.string().min(1).max(200),   // topic NAME — resolved to topicId by the route
    subtopicTag: z.string().max(120).nullable().optional(),
    dimensionless: z.boolean().nullish().transform(Boolean),
    sourceId: z.string().nullable().optional(),
});

// TRUE partial for edits — deliberately NO .default() anywhere: a partial over
// defaulted fields would inject the defaults on parse and silently reset absent
// fields (the exact bug fixed in questionUpdateSchema during Phase 3.6).
const referenceCardUpdateSchema = z.object({
    kind: z.enum(CARD_KINDS).optional(),
    symbol: z.string().max(60).nullable().optional(),
    name: z.string().min(1).max(200).optional(),
    formulaLatex: z.string().max(2000).nullable().optional(),
    valueUnit: z.string().max(300).nullable().optional(),
    description: z.string().min(1).max(2000).optional(),
    variables: z.array(variableSchema).max(30).optional(),
    purposeExamTip: z.string().max(2000).nullable().optional(),
    subject: z.string().min(1).optional(),
    topic: z.string().min(1).max(200).optional(),
    subtopicTag: z.string().max(120).nullable().optional(),
    dimensionless: z.boolean().optional(),
    sourceId: z.string().nullable().optional(),
});

const sourceCreateSchema = z.object({
    title: z.string().min(1).max(300),
    kind: z.string().max(60).nullable().optional(),
    edition: z.string().max(120).nullable().optional(),
    section: z.string().max(200).nullable().optional(),
    url: z.string().max(1000).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
});
const sourceUpdateSchema = sourceCreateSchema.partial();

const aiIntakeSchema = z.object({
    cards: z.array(z.record(z.string(), z.any())).min(1).max(50),
});

// Rename a tag across a topic; renaming onto a tag in use merges the two.
const tagRenameSchema = z.object({
    subject: z.string().min(1),
    topic: z.string().min(1).max(200),
    from: z.string().min(1).max(120),
    to: z.string().trim().min(1).max(120),
});

/**
 * Content-completeness rules over a FULL card object (post-zod or a stored
 * row). Returns an array of reason strings — empty means the card is complete.
 * These are the Pillar-5 required-field rules; `dimensionless` is the
 * controlled exception so "value required" never forces a fake number.
 */
function validateCardRules(card) {
    const reasons = [];
    if (!card || typeof card !== 'object') return ['invalid-card'];

    if (!SUBJECT_VARIANTS[normalizeSubject(card.subject)]) reasons.push('invalid-subject');
    if (!card.name || String(card.name).trim().length === 0) reasons.push('missing-name');
    if (!card.description || String(card.description).trim().length === 0) reasons.push('missing-description');

    if (card.kind === 'formula') {
        if (!card.formulaLatex || String(card.formulaLatex).trim().length === 0) {
            reasons.push('missing-formula');
        }
        // Whether the variables cover every symbol is advice in the review queue
        // (GET /pending), not a gate. The check reads LaTeX by heuristic, and it
        // refused valid cards like PF, omega_s and I_rms.
        const vars = Array.isArray(card.variables) ? card.variables : [];
        if (vars.length === 0) reasons.push('missing-variables');
    }

    if (card.kind === 'constant' && !card.dimensionless) {
        if (!card.valueUnit || String(card.valueUnit).trim().length === 0) {
            reasons.push('missing-value-unit');
        }
    }
    // A constant's value, not just its unit: "$\\text{F/m}$" tells you nothing to recall.
    if (card.kind === 'constant' && card.valueUnit && !/\d/.test(card.valueUnit)) reasons.push('constant-needs-value');

    // The name is shown as plain text everywhere, so LaTeX in it shows as source.
    if (/[$\\]/.test(String(card.name ?? ''))) reasons.push('latex-in-name');
    const vars = Array.isArray(card.variables) ? card.variables : [];
    const mathFields = [
        card.symbol, card.formulaLatex, card.valueUnit, card.description, card.purposeExamTip,
        ...vars.flatMap((v) => [v?.symbol, v?.meaning, v?.unit]),
    ];
    if (mathFields.some(hasUnbalancedMath)) reasons.push('unbalanced-math');
    if (String(card.description ?? '').trim().length > MAX_DESCRIPTION) reasons.push('description-too-long');
    if (String(card.purposeExamTip ?? '').trim().length > MAX_TIP) reasons.push('tip-too-long');
    return reasons;
}

module.exports = {
    CARD_KINDS,
    referenceCardCreateSchema,
    referenceCardUpdateSchema,
    sourceCreateSchema,
    sourceUpdateSchema,
    aiIntakeSchema,
    tagRenameSchema,
    validateCardRules,
    MAX_DESCRIPTION,
    MAX_TIP,
};
