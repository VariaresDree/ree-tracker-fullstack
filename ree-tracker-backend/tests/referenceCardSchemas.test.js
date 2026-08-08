import { describe, it, expect } from 'vitest';
const { extractFormulaSymbols, normalizeSymbol, checkVariableCoverage } = require('../src/utils/formulaSymbols');
const {
    referenceCardCreateSchema,
    referenceCardUpdateSchema,
    aiIntakeSchema,
    validateCardRules,
} = require('../src/schemas/referenceCardSchemas');

const completeFormulaCard = {
    kind: 'formula',
    symbol: 'X_c',
    name: 'Capacitive Reactance',
    formulaLatex: 'X_c = \\frac{1}{2\\pi f C}',
    valueUnit: 'Ohms ($\\Omega$)',
    description: 'The opposition to current flow in an AC circuit offered by a capacitor.',
    variables: [
        { symbol: 'f', meaning: 'frequency', unit: 'Hz' },
        { symbol: 'C', meaning: 'capacitance', unit: 'F' },
    ],
    purposeExamTip: 'Inversely proportional to frequency. Trap: forgetting the 2π factor.',
    subject: 'EE',
    topic: 'AC Electric Circuits',
};

describe('extractFormulaSymbols — pragmatic LaTeX symbol extraction', () => {
    it('finds latin identifiers and keeps subscripted tokens whole', () => {
        const syms = extractFormulaSymbols('X_c = \\frac{1}{2\\pi f C}').map(normalizeSymbol);
        expect(syms).toContain('xc');
        expect(syms).toContain('f');
        expect(syms).toContain('c');
        expect(syms).not.toContain('pi'); // known constant, stoplisted
    });

    it('splits bare multi-letter runs (implicit multiplication: V=IR)', () => {
        const syms = extractFormulaSymbols('V = IR').map(normalizeSymbol);
        expect(syms).toEqual(expect.arrayContaining(['v', 'i', 'r']));
    });

    it('collects greek-letter commands as variables', () => {
        const syms = extractFormulaSymbols('Z = R + j\\omega L').map(normalizeSymbol);
        expect(syms).toContain('omega');
        expect(syms).toContain('l');
    });

    it('ignores \\text{} content, function names, and digits', () => {
        const syms = extractFormulaSymbols('P = V I \\cos\\theta \\text{ (watts)}').map(normalizeSymbol);
        expect(syms).toEqual(expect.arrayContaining(['p', 'v', 'i', 'theta']));
        expect(syms).not.toContain('watts');
        expect(syms).not.toContain('cos');
    });

    it('returns [] for empty/non-string input (coverage then fails open)', () => {
        expect(extractFormulaSymbols('')).toEqual([]);
        expect(extractFormulaSymbols(null)).toEqual([]);
    });
});

describe('checkVariableCoverage', () => {
    it('passes when every symbol is declared (own symbol exempt)', () => {
        const { ok } = checkVariableCoverage(
            completeFormulaCard.formulaLatex, completeFormulaCard.variables, 'X_c',
        );
        expect(ok).toBe(true);
    });

    it('fails with the missing symbols named', () => {
        const { ok, missing } = checkVariableCoverage(
            'X_c = \\frac{1}{2\\pi f C}', [{ symbol: 'f', meaning: 'frequency', unit: 'Hz' }], 'X_c',
        );
        expect(ok).toBe(false);
        expect(missing.map(normalizeSymbol)).toContain('c');
    });

    it('matches symbols case/format-insensitively (Xc vs X_c)', () => {
        const { ok } = checkVariableCoverage(
            'V_{LL} = \\sqrt{3} V_p', [
                { symbol: 'Vp', meaning: 'phase voltage', unit: 'V' },
            ], 'V_LL',
        );
        expect(ok).toBe(true);
    });
});

describe('validateCardRules — the required-field gate (Pillar 5)', () => {
    it('accepts a complete formula card', () => {
        expect(validateCardRules(completeFormulaCard)).toEqual([]);
    });

    it('rejects a bare-symbol formula (no variables / no formula / no description)', () => {
        expect(validateCardRules({ ...completeFormulaCard, variables: [] })).toContain('missing-variables');
        expect(validateCardRules({ ...completeFormulaCard, formulaLatex: '' })).toContain('missing-formula');
        expect(validateCardRules({ ...completeFormulaCard, description: ' ' })).toContain('missing-description');
    });

    it('rejects a formula whose variables do not cover the expression', () => {
        const reasons = validateCardRules({
            ...completeFormulaCard,
            variables: [{ symbol: 'f', meaning: 'frequency', unit: 'Hz' }],
        });
        expect(reasons.some((r) => r.startsWith('uncovered-symbols:'))).toBe(true);
    });

    it('constants require valueUnit — unless dimensionless (controlled exception)', () => {
        const constant = { kind: 'constant', name: 'Speed of Light', description: 'c in vacuum.', subject: 'EE', topic: 'Quantities/Units/Constants' };
        expect(validateCardRules({ ...constant, valueUnit: null })).toContain('missing-value-unit');
        expect(validateCardRules({ ...constant, valueUnit: '$3\\times10^8$ m/s' })).toEqual([]);
        expect(validateCardRules({ ...constant, valueUnit: null, dimensionless: true })).toEqual([]);
    });

    it('rejects an unrecognized subject', () => {
        expect(validateCardRules({ ...completeFormulaCard, subject: 'Chemistry' })).toContain('invalid-subject');
    });
});

describe('card schemas', () => {
    it('create schema applies safe defaults on a full parse', () => {
        const parsed = referenceCardCreateSchema.parse(completeFormulaCard);
        expect(parsed.dimensionless).toBe(false);
        expect(parsed.variables).toHaveLength(2);
    });

    it('update schema is a TRUE partial — {} stays {} (no default injection)', () => {
        // The Phase-3.6 bug class: .partial() over defaulted fields injects the
        // defaults on parse and silently resets absent fields. Guard against it.
        expect(referenceCardUpdateSchema.parse({})).toEqual({});
        expect(referenceCardUpdateSchema.parse({ name: 'Renamed' })).toEqual({ name: 'Renamed' });
    });

    it('create schema rejects missing required fields', () => {
        expect(referenceCardCreateSchema.safeParse({ kind: 'constant', name: 'x' }).success).toBe(false); // no description/subject/topic
        expect(referenceCardCreateSchema.safeParse({ ...completeFormulaCard, kind: 'poem' }).success).toBe(false);
    });

    it('ai-intake payload is bounded (1..50 cards)', () => {
        expect(aiIntakeSchema.safeParse({ cards: [] }).success).toBe(false);
        expect(aiIntakeSchema.safeParse({ cards: [{}] }).success).toBe(true);
        expect(aiIntakeSchema.safeParse({ cards: Array.from({ length: 51 }, () => ({})) }).success).toBe(false);
    });
});
