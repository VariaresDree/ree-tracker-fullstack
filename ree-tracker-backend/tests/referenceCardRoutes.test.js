import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Admin › Formula cards: what /ai-intake queues, what it refuses and why. The
// first route tests here: "4 rejected as incomplete" shipped with none.

const verifyIdToken = vi.fn();
const firebaseAuth = require('firebase-admin/auth');
firebaseAuth.getAuth = () => ({ verifyIdToken });

const prisma = require('../src/config/db');
const { invalidateTopicCache } = require('../src/services/topicResolver');
const { validateCardRules } = require('../src/schemas/referenceCardSchemas');

const as = (uid) => ({ Authorization: `Bearer ${uid}` });
const TOPICS = [
    { id: 't-ee', subject: 'EE', name: 'Electric Circuits 2', normKey: 'electric circuits 2', aliases: [], active: true },
    { id: 't-es', subject: 'ESAS', name: 'Fluid Mechanics', normKey: 'fluid mechanics', aliases: [], active: true },
];
const formula = (over = {}) => ({
    kind: 'formula', name: 'Power factor', symbol: '$PF$', formulaLatex: '$PF = \\cos\\theta$',
    description: 'Real over apparent power.', variables: [{ symbol: '$\\theta$', meaning: 'phase angle' }],
    subject: 'EE', topic: 'Electric Circuits 2', ...over,
});
const constant = (over = {}) => ({
    kind: 'constant', name: 'Permittivity', valueUnit: '$8.854\\times10^{-12}$ F/m', description: 'Of free space.',
    subject: 'EE', topic: 'Electric Circuits 2', ...over,
});

function app() {
    delete require.cache[require.resolve('../src/routes/referenceCardRoutes')];
    const a = express();
    a.use(express.json());
    a.use('/api/reference-cards', require('../src/routes/referenceCardRoutes'));
    return a;
}
const intake = (cards) => request(app()).post('/api/reference-cards/ai-intake').set(as('admin')).send({ cards });

let createSpy; let versionSpy;
beforeEach(() => {
    verifyIdToken.mockImplementation(async (token) => ({ uid: token, email: `${token}@example.com` }));
    vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'admin' });
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ role: 'ADMIN' });
    vi.spyOn(prisma.topic, 'findMany').mockResolvedValue(TOPICS);
    vi.spyOn(prisma.idempotencyRecord, 'create').mockResolvedValue({});
    vi.spyOn(prisma.idempotencyRecord, 'findUnique').mockResolvedValue(null);
    vi.spyOn(prisma.idempotencyRecord, 'update').mockResolvedValue({});
    createSpy = vi.spyOn(prisma.referenceCard, 'create').mockImplementation(async ({ data }) => ({ id: `c-${data.name}`, ...data }));
    versionSpy = vi.spyOn(prisma.referenceCardVersion, 'create').mockResolvedValue({});
    invalidateTopicCache();
});
afterEach(() => vi.restoreAllMocks());

describe('validateCardRules: the variable check no longer blocks a card', () => {
    // Each of these was refused as "uncovered-symbols" with its real variables declared.
    const VALID = [
        ['$PF = \\cos\\theta$', '$PF$', [{ symbol: '$\\theta$', meaning: 'angle' }]],
        ['$\\omega_s = \\frac{4\\pi f}{P}$', '$\\omega_s$', [{ symbol: '$f$', meaning: 'frequency' }, { symbol: '$P$', meaning: 'poles' }]],
        ['$I_{\\text{rms}} = I_m/\\sqrt{2}$', '$I_{\\text{rms}}$', [{ symbol: '$I_m$', meaning: 'peak' }]],
        ['$\\Delta V = V_2 - V_1$', '$\\Delta V$', [{ symbol: '$V_1$', meaning: 'start' }, { symbol: '$V_2$', meaning: 'end' }]],
        ['$Z = R + jX$', '$Z$', [{ symbol: '$R$', meaning: 'resistance' }, { symbol: '$X$', meaning: 'reactance' }]],
    ];
    it.each(VALID)('accepts %s', (formulaLatex, symbol, variables) => {
        expect(validateCardRules(formula({ formulaLatex, symbol, variables }))).toEqual([]);
    });

    it('still requires a formula to have some variables', () => {
        expect(validateCardRules(formula({ variables: [] }))).toContain('missing-variables');
    });
});

describe('POST /ai-intake', () => {
    it('queues complete cards, including a constant sent with null variables', async () => {
        const res = await intake([formula(), constant({ variables: null, dimensionless: null })]);
        expect(res.status).toBe(200);
        expect(res.body.queued).toHaveLength(2);
        expect(res.body.rejected).toEqual([]);
        expect(createSpy.mock.calls[1][0].data).toMatchObject({ variables: [], dimensionless: false, status: 'PENDING' });
    });

    it('says why each card was refused, by position', async () => {
        const res = await intake([
            formula({ formulaLatex: null }),
            constant({ valueUnit: null }),
            formula({ name: 'X', topic: 'Not a topic' }),
            formula({ name: 'Y', topic: 'Fluid Mechanics' }),
            { kind: 'formula' },
        ]);
        expect(res.body.queued).toEqual([]);
        expect(res.body.rejected[0]).toEqual({ index: 0, reasons: ['missing-formula'] });
        expect(res.body.rejected[1]).toEqual({ index: 1, reasons: ['missing-value-unit'] });
        expect(res.body.rejected[2]).toEqual({ index: 2, reasons: ['unknown-topic'] });
        // A topic of another subject would hide the card from its subject's tiles.
        expect(res.body.rejected[3]).toEqual({ index: 3, reasons: ['unknown-topic'] });
        expect(res.body.rejected[4].reasons.length).toBeGreaterThan(0);
    });

    it('refuses a duplicate of a live or pending card as a duplicate', async () => {
        createSpy.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
        vi.spyOn(prisma.referenceCard, 'findFirst').mockResolvedValue(null);
        const res = await intake([formula()]);
        expect(res.body.rejected).toEqual([{ index: 0, reasons: ['duplicate'] }]);
    });

    it('brings back a card rejected earlier instead of refusing its name forever', async () => {
        createSpy.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
        vi.spyOn(prisma.referenceCard, 'findFirst').mockResolvedValue({ id: 'old' });
        const update = vi.spyOn(prisma.referenceCard, 'update').mockResolvedValue({ id: 'old', name: 'Power factor' });
        const res = await intake([formula()]);
        expect(res.body.queued).toEqual(['old']);
        expect(update.mock.calls[0][0]).toMatchObject({ where: { id: 'old' }, data: { status: 'PENDING', reviewNote: null } });
    });

    it('a failed audit write does not report a queued card as failed', async () => {
        versionSpy.mockRejectedValueOnce(new Error('audit down'));
        const res = await intake([formula()]);
        expect(res.body.queued).toHaveLength(1);
        expect(res.body.rejected).toEqual([]);
    });

    it('is admin only', async () => {
        prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
        const res = await request(app()).post('/api/reference-cards/ai-intake').set(as('u')).send({ cards: [formula()] });
        expect(res.status).toBe(403);
        expect(createSpy).not.toHaveBeenCalled();
    });
});

describe('GET /pending', () => {
    it('adds the symbols the variables may have missed, as advice', async () => {
        vi.spyOn(prisma.referenceCard, 'findMany').mockResolvedValue([
            { id: '1', ...formula({ formulaLatex: '$V = IR$', symbol: '$V$', variables: [{ symbol: '$I$', meaning: 'current' }] }), topic: { name: 'Electric Circuits 2' } },
        ]);
        const res = await request(app()).get('/api/reference-cards/pending').set(as('admin'));
        expect(res.body.items[0].uncovered).toEqual(['R']);
    });
});

describe('POST /tags/rename', () => {
    const rename = (body) => request(app()).post('/api/reference-cards/tags/rename').set(as('admin')).send(body);

    it('renames a tag across one topic, in any letter case, and records each card', async () => {
        vi.spyOn(prisma.referenceCard, 'findMany').mockResolvedValue([{ id: 'a', name: 'A', subtopicTag: 'ac power' }, { id: 'b', name: 'B', subtopicTag: 'AC Power' }]);
        const updateMany = vi.spyOn(prisma.referenceCard, 'updateMany').mockResolvedValue({ count: 2 });
        const createMany = vi.spyOn(prisma.referenceCardVersion, 'createMany').mockResolvedValue({ count: 2 });
        vi.spyOn(prisma, '$transaction').mockImplementation(async (ops) => Promise.all(ops));
        const res = await rename({ subject: 'EE', topic: 'Electric Circuits 2', from: 'AC POWER', to: 'Power triangle' });
        expect(res.status).toBe(200);
        expect(res.body.updated).toBe(2);
        expect(updateMany.mock.calls[0][0]).toMatchObject({ where: { id: { in: ['a', 'b'] } }, data: { subtopicTag: 'Power triangle' } });
        expect(createMany.mock.calls[0][0].data).toHaveLength(2);
    });

    it('refuses an unknown topic and is admin only', async () => {
        expect((await rename({ subject: 'EE', topic: 'Nope', from: 'a', to: 'b' })).status).toBe(400);
        prisma.user.findUnique.mockResolvedValue({ role: 'USER' });
        const learner = await request(app()).post('/api/reference-cards/tags/rename').set(as('learner')).send({ subject: 'EE', topic: 'Electric Circuits 2', from: 'a', to: 'b' });
        expect(learner.status).toBe(403);
    });
});
