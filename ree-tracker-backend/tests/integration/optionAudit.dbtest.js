import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// The live audit reads only the rows Postgres flags as possible problems
// (services/optionAudit.auditLiveBank). It must find everything the old
// whole-bank JS audit found: here both run on the same database, with rows
// made to sit on each rule's edge.

const prisma = require('../../src/config/db');
const { auditLiveBank, auditOptions } = require('../../src/services/optionAudit');

const RUN = `oa${Date.now().toString(36)}`;
const NBSP = ' ';
const rows = [
    // Keys: A, D, a fifth option, and none of them.
    { n: 1, options: ['1 A', '2 A', '3 A', '4 A'], answer: '1 A' },
    { n: 2, options: ['1 A', '2 A', '3 A', '4 A'], answer: '4 A' },
    { n: 3, options: ['a', 'b', 'c', 'd', 'e'], answer: 'e' },
    { n: 4, options: ['$5$ V', '6 V'], answer: '5 V' },
    // Letter references, and ordinary options that only look close.
    { n: 5, options: ['Both A and B', 'A only', 'C', 'D'], answer: 'C' },
    { n: 6, options: [`neither (A)${NBSP}nor (F).`, 'x', 'y', 'z'], answer: 'x' },
    { n: 7, options: ['Faraday', 'Core', 'Ford', 'Bode'], answer: 'Core' },
    // Unbalanced math, an escaped dollar, and a display pair.
    { n: 8, options: ['1', '2'], answer: '1', text: 'Find $x' },
    { n: 9, options: ['1', '2'], answer: '1', text: 'Costs \\$5 and $$y$$ ok' },
    { n: 10, options: ['$a$', '$b'], answer: '$a$' },
    // Identical options up to spaces (a no-break one too), and ones that differ.
    { n: 11, options: ['10  ohm', ' 10 ohm', 'x', 'y'], answer: 'x' },
    { n: 12, options: [`5${NBSP}A`, '5 A', 'q', 'r'], answer: 'q' },
    { n: 13, options: ['10 ohm', '10 ohms', 'x', 'y'], answer: 'x' },
    // Explanations: by letter, and close calls that aren't.
    { n: 14, options: ['p', 'q'], answer: 'p', fixedExplanation: 'So option B is wrong.' },
    { n: 15, options: ['p', 'q'], answer: 'p', fixedExplanation: 'The answer is (C).' },
    { n: 16, options: ['p', 'q'], answer: 'p', fixedExplanation: 'Options are listed; the optional term drops.' },
    { n: 17, options: ['p', 'q'], answer: 'p', fixedExplanation: `See choice${NBSP}D.` },
    { n: 18, options: ['p', 'q'], answer: 'p', fixedExplanation: 'option b is lower case' },
    // Flagged rows stay out.
    { n: 19, options: ['Both A and B', 'x'], answer: 'nope', isFlagged: true },
];

const id = (n) => `${RUN}-q${n}`;

beforeAll(async () => {
    await prisma.question.createMany({
        data: rows.map(({ n, ...r }) => ({
            id: id(n), subject: 'EE', subtopic: `${RUN} Topic`, text: r.text || `${RUN} stem ${n}?`, difficulty: 2,
            fixedExplanation: r.fixedExplanation ?? null, isFlagged: !!r.isFlagged, options: r.options, answer: r.answer,
        })),
    });
});

afterAll(async () => {
    await prisma.question.deleteMany({ where: { id: { startsWith: RUN } } });
});

const sorted = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, [...v].sort()]));

describe('auditLiveBank, reading only the suspect rows', () => {
    it('agrees with the whole-bank audit', async () => {
        const all = await prisma.question.findMany({
            where: { isFlagged: false },
            select: { id: true, text: true, options: true, answer: true, fixedExplanation: true },
        });
        // Samples stop at 20, so compare them in full only on a small database.
        expect(all.length).toBeLessThan(400);
        const whole = auditOptions(all);
        const live = await auditLiveBank();
        expect(live.total).toBe(whole.total);
        expect(live.positions).toEqual(whole.positions);
        expect(live.shares).toEqual(whole.shares);
        expect(live.brokenMath).toBe(whole.brokenMath);
        expect(live.duplicateOptions).toBe(whole.duplicateOptions);
        expect(live.letterInExplanation).toBe(whole.letterInExplanation);
        if (Object.values(whole.samples).every((v) => v.length < 20)) {
            expect(sorted(live.samples)).toEqual(sorted(whole.samples));
            expect([...live.keyFixes].sort((a, b) => a.id.localeCompare(b.id))).toEqual([...whole.keyFixes].sort((a, b) => a.id.localeCompare(b.id)));
        }
    });

    it('finds each planted problem, and none of the near misses', async () => {
        const live = await auditLiveBank();
        const mine = (list) => list.filter((x) => x.startsWith(RUN)).sort();
        expect(mine(live.samples.missing)).toEqual([id(4)]);
        expect(live.keyFixes.filter((k) => k.id.startsWith(RUN))).toEqual([{ id: id(4), from: '5 V', to: '$5$ V' }]);
        expect(mine(live.samples.fixedOrder)).toEqual([id(5), id(6)].sort());
        expect(mine(live.samples.brokenMath)).toEqual([id(10), id(8)].sort());
        expect(mine(live.samples.duplicateOptions)).toEqual([id(11), id(12)].sort());
        expect(mine(live.samples.letterInExplanation)).toEqual([id(14), id(15), id(17)].sort());
    });
});
