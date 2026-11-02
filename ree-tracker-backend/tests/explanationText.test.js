import { describe, it, expect } from 'vitest';

const shared = require('@ree/shared');

// Real shapes from the live bank: LaTeX swallowed by JSON parsing, and
// solutions written on one line with their structure in words only.

describe('LaTeX survives reading a model answer', () => {
    const read = (raw) => shared.parseModelJson(raw);

    it('keeps commands that collide with legal JSON escapes', () => {
        // \frac, \times, \beta and \rho alone are valid JSON (form feed + "rac"…).
        const raw = String.raw`{"f":"$\frac{V}{R} \times \beta \rho \text{ m}$"}`;
        expect(read(raw).value.f).toBe(String.raw`$\frac{V}{R} \times \beta \rho \text{ m}$`);
    });

    it('keeps \\neq, \\nu, \\nabla and \\not, and real newlines', () => {
        const raw = String.raw`{"f":"$a \neq b$, $\nu$, $\nabla$, $\not=$\nNext line"}`;
        expect(read(raw).value.f).toBe('$a \\neq b$, $\\nu$, $\\nabla$, $\\not=$\nNext line');
    });

    it('leaves a compliant payload unchanged', () => {
        const raw = String.raw`{"f":"$\\frac{1}{2} \\neq 1$\n\nNext","g":"tab\t1"}`;
        const out = read(raw);
        expect(out.text).toBe(raw);
        expect(out.value.f).toBe('$\\frac{1}{2} \\neq 1$\n\nNext');
    });

    it('skips a bracket in the sentence before the JSON', () => {
        expect(read('Here are [10] questions: {"items":[{"q":"x"}]}').value).toEqual({ items: [{ q: 'x' }] });
    });

    it('still reports a cut-off answer after such a sentence', () => {
        expect(read('Here are [10] questions: {"items":[{"q":"x')).toMatchObject({ ok: false, reason: 'truncated' });
    });
});

describe('structureExplanation', () => {
    const s = shared.structureExplanation;

    it('splits a real one-line solution into labelled parts and numbered steps', () => {
        const out = s('Given: coil pitch = 5/6 pole pitch. Find: fundamental pitch factor k_p1. Solution: 1) Electrical coil span is 150 deg. 2) Pitch factor k = sin(75 deg) = 0.966. Answer: 0.966.');
        expect(out).toBe([
            '**Given:** coil pitch = 5/6 pole pitch.',
            '**Find:** fundamental pitch factor k_p1.',
            '**Solution:**',
            '1. Electrical coil span is 150 deg.\n2. Pitch factor k = sin(75 deg) = 0.966.',
            '**Answer:** 0.966.',
        ].join('\n\n'));
    });

    it('never touches math', () => {
        const math = '$Given: 1) x 2) y$';
        expect(s(`Note ${math} here.`)).toBe(`Note ${math} here.`);
        expect(s('$$\nFind: 1) a\n2) b\n$$')).toBe('$$\nFind: 1) a\n2) b\n$$');
    });

    it('keeps math inside a step', () => {
        expect(s('1) Use $V=IR$. 2) Then $P=VI$.')).toBe('1. Use $V=IR$.\n2. Then $P=VI$.');
    });

    it('leaves decimals, lone numbers and out-of-order numbers alone', () => {
        const prose = 'The 0.866 option is sin 60, and 1. is not a step without a 2 after it.';
        expect(s(prose)).toBe(prose);
        expect(s('Use 2) then 1) in that order.')).toBe('Use 2) then 1) in that order.');
    });

    it('only treats a capitalised label with a colon as a label', () => {
        const prose = 'Given that V is fixed, find: the current.';
        expect(s(prose)).toBe(prose);
    });

    it('turns single line breaks between sentences into paragraphs, keeping lists and tables', () => {
        expect(s('First line.\nSecond line.')).toBe('First line.\n\nSecond line.');
        expect(s('- a\n- b')).toBe('- a\n- b');
        expect(s('| a |\n|---|\n| 1 |')).toBe('| a |\n|---|\n| 1 |');
        expect(s('Intro.\n- a\n- b')).toBe('Intro.\n\n- a\n- b');
    });

    it('gives the same answer when run twice', () => {
        const once = s('Given: a. Solution: 1) b. 2) c. Answer: d.');
        expect(s(once)).toBe(once);
    });

    it('returns empty input as it is', () => {
        expect(s('')).toBe('');
        expect(s(null)).toBe(null);
    });
});

describe('explanationSections', () => {
    const { structureExplanation: s, explanationSections: sections } = shared;

    it('cuts structured text into sections, with the text before any label first', () => {
        expect(sections(s('Intro. Key idea: power. Why the others are wrong: they forget root three.'))).toEqual([
            { label: null, body: 'Intro.' },
            { label: 'Key idea', body: 'power.' },
            { label: 'Why the others are wrong', body: 'they forget root three.' },
        ]);
    });

    it('has one unlabelled section for text with no labels', () => {
        expect(sections('Use KVL.')).toEqual([{ label: null, body: 'Use KVL.' }]);
    });
});

describe('repairSwallowedLatex', () => {
    const r = shared.repairSwallowedLatex;

    it('restores the commands found in the live bank', () => {
        expect(r('$T = \frac{V}{R}$')).toBe('$T = \\frac{V}{R}$');
        expect(r('$J\bar{Q}$ and \beta')).toBe('$J\\bar{Q}$ and \\beta');
        expect(r('$P \times h$ \text{ m}')).toBe('$P \\times h$ \\text{ m}');
        expect(r('$\right)$')).toBe('$\\right)$');
        expect(r('$a \neq b$')).toBe('$a \\neq b$');
    });

    it('leaves clean text and real line breaks alone', () => {
        const clean = '$\\frac{1}{2}$\n\nNext step\nnot math\n\t1';
        expect(r(clean)).toBe(clean);
    });
});
