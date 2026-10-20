// Tests for the exam-paper math converter. jsPDF's standard font only renders
// WinAnsi (Latin-1); the whole point of mathToText is to emit readable text with
// NO code point > 255 (those are what show up as "�" on the printed paper). We
// assert both the conversions and that invariant.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// A recording stand-in for jsPDF: what was drawn, on which page.
const pdf = { last: null };
vi.mock('jspdf', () => {
    const SIZES = { a4: [210, 297], letter: [215.9, 279.4] };
    class FakePDF {
        constructor(opts) {
            pdf.last = this;
            this.opts = opts;
            const [w, h] = Array.isArray(opts.format) ? opts.format : SIZES[opts.format];
            this.internal = { pageSize: { getWidth: () => w, getHeight: () => h } };
            this.pageCount = 1;
            this.page = 1;
            this.circles = [];
            this.texts = [];
            this.saved = null;
        }
        setFont() {}
        setFontSize() {}
        setLineWidth() {}
        setTextColor() {}
        line() {}
        addImage() {}
        splitTextToSize(text) { return [String(text)]; }
        text(t, x, y) { [].concat(t).forEach((s) => this.texts.push({ page: this.page, text: String(s), x, y })); }
        circle(x, y, r) { this.circles.push({ page: this.page, x, y, r }); }
        addPage() { this.pageCount += 1; this.page = this.pageCount; }
        getNumberOfPages() { return this.pageCount; }
        setPage(p) { this.page = p; }
        output() { return 'bytes'; }
        save(name) { this.saved = name; }
    }
    return { jsPDF: FakePDF };
});
vi.mock('qrcode', () => ({ toDataURL: vi.fn(async () => 'data:image/png;base64,AAAA') }));

import { mathToText, columnMajorPosition, answerLetterFor, deriveExamIdentity, generateExamPaper } from './examPaper.js';

const isWinAnsiSafe = (s) => [...s].every((c) => c.charCodeAt(0) <= 0xFF);

describe('mathToText — conversions', () => {
    it('renders fractions and superscripts readably', () => {
        expect(mathToText('$T(s) = \\frac{100}{s^2 + 10s + 100}$'))
            .toBe('T(s) = (100)/(s² + 10s + 100)');
    });

    it('resolves nested frac/sqrt from the inside out', () => {
        expect(mathToText('$\\frac{1}{2\\pi\\sqrt{LC}}$')).toBe('(1)/(2pi sqrt(LC))');
    });

    it('spells greek and maps operators to Latin-1 glyphs', () => {
        expect(mathToText('$\\alpha \\times \\beta$')).toBe('alpha × beta');
        expect(mathToText('$P = \\sqrt{3} V_L I_L \\cos\\theta$')).toBe('P = sqrt(3) V_L I_L costheta');
    });

    it('keeps plain prose untouched', () => {
        const prose = 'In a nuclear power plant, what is the primary function of the moderator?';
        expect(mathToText(prose)).toBe(prose);
    });

    it('strips braces and backslashes entirely', () => {
        const out = mathToText('$\\frac{a}{b} \\leq \\Omega$');
        expect(out).toBe('(a)/(b) <= ohm');
        expect(out).not.toMatch(/[\\{}]/);
    });

    it('normalises pre-rendered unicode math to safe text', () => {
        expect(mathToText('β = √(x²) ≤ ∞ · µF')).toBe('beta = sqrt(x²) <= infinity · µF');
    });

    it('handles braced subscripts', () => {
        expect(mathToText('$V_{NL}$ and t_p')).toBe('V_NL and t_p');
    });

    it('drops explicit LaTeX spaces and renders degrees', () => {
        expect(mathToText('$5\\ \\mu F$')).toBe('5 µ F');
        expect(mathToText('$0^\\circ C$ and $\\alpha = 90^\\circ$')).toBe('0° C and alpha = 90°');
    });
});

describe('mathToText — WinAnsi safety (no tofu on the PDF)', () => {
    const samples = [
        '$T(s) = \\frac{100}{s^2 + 10s + 100}$, peak time t_p?',
        'pre-arcing $I^2 t$ rating of 12000 A·s',
        'flux density of 1.2 T, area 150 cm$^2$',
        '$\\mu_0 = 4\\pi \\times 10^{-7}$ T·m/A',
        'delay angle $\\alpha = 90^\\circ$ ($\\pi/2$ radians)',
        'Q = Q_0 e^{\\beta x}, 0 \\le x \\le 1',
        'β = √(x²) ≤ ∞ ≥ ≠ ≈ → ± ° µ Ω Δ Σ',
    ];
    it('never emits a character above U+00FF', () => {
        for (const s of samples) {
            const out = mathToText(s);
            expect(isWinAnsiSafe(out), `unsafe glyph in: "${out}"`).toBe(true);
            expect(out).not.toMatch(/[\\{}]/);
        }
    });
});

// --- Column-major answer-key ordering -------------------------------------
describe('columnMajorPosition', () => {
    it('fills each column top-to-bottom (PH convention): 50 items, 5 cols of 10', () => {
        const rows = 10; // 50 items / 5 columns
        // Item index 0 (item #1) → col 0, row 0. Index 9 (#10) → col 0, row 9.
        expect(columnMajorPosition(0, rows)).toEqual({ col: 0, row: 0 });
        expect(columnMajorPosition(9, rows)).toEqual({ col: 0, row: 9 });
        // Index 10 (#11) starts column 1 at the top — NOT row-major (which would
        // have put #6 at col 0/row 1).
        expect(columnMajorPosition(10, rows)).toEqual({ col: 1, row: 0 });
        expect(columnMajorPosition(49, rows)).toEqual({ col: 4, row: 9 });
    });

    it('guards against a zero row count', () => {
        expect(columnMajorPosition(3, 0)).toEqual({ col: 3, row: 0 });
    });
});

// --- Answer-letter derivation (the highest-risk correctness path) ---------
describe('answerLetterFor', () => {
    const q = (answer, options) => ({ answer, options });

    it('maps the stored answer to its option letter (0→A)', () => {
        expect(answerLetterFor(q('12 V', ['3 V', '12 V', '6 V', '24 V']))).toEqual({ letter: 'B', matched: true });
        expect(answerLetterFor(q('3 V', ['3 V', '12 V', '6 V', '24 V']))).toEqual({ letter: 'A', matched: true });
    });

    it('matches despite whitespace/case differences (was a silent "-" before)', () => {
        expect(answerLetterFor(q('  12  v ', ['3 V', '12 V', '6 V']))).toEqual({ letter: 'B', matched: true });
    });

    it('reports unmatched (letter "-") when the answer is not among the options', () => {
        expect(answerLetterFor(q('99 V', ['3 V', '12 V']))).toEqual({ letter: '-', matched: false });
    });
});

// --- Deterministic exam identity for the QR -------------------------------
describe('deriveExamIdentity', () => {
    const pool = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

    it('is deterministic: same pool + key → same setId + keyVersion', () => {
        const a = deriveExamIdentity(pool, ['A', 'B', 'C']);
        const b = deriveExamIdentity(pool, ['A', 'B', 'C']);
        expect(a).toEqual(b);
        expect(typeof a.setId).toBe('string');
        expect(a.setId.length).toBeGreaterThan(0);
    });

    it('keyVersion changes when an answer changes (but setId stays)', () => {
        const a = deriveExamIdentity(pool, ['A', 'B', 'C']);
        const b = deriveExamIdentity(pool, ['A', 'B', 'D']); // last answer edited
        expect(b.setId).toBe(a.setId);           // same question set
        expect(b.keyVersion).not.toBe(a.keyVersion); // key content differs
    });

    it('setId changes when the question set changes', () => {
        const a = deriveExamIdentity(pool, ['A', 'B', 'C']);
        const b = deriveExamIdentity([{ id: 'q1' }, { id: 'qX' }, { id: 'q3' }], ['A', 'B', 'C']);
        expect(b.setId).not.toBe(a.setId);
    });
});

// --- The PDF renders a draw ------------------------------------------------
const letters = 'ABCDEF';
function makeDraw({ count = 4, options = 4, plan = {}, sections } = {}) {
    const items = Array.from({ length: count }, (_, i) => {
        const opts = Array.from({ length: typeof options === 'function' ? options(i) : options }, (_, k) => `opt ${i + 1}${letters[k]}`);
        return { n: i + 1, id: `q${i + 1}`, subject: 'EE', text: `Question ${i + 1}`, options: opts, answer: opts[1], answerIndex: 1, answerLetter: 'B' };
    });
    return {
        plan: { kind: 'subject', profile: 'prc_subject', code: 'EE', title: 'EE', timeAllotmentMins: 360, totalCount: count, ...plan },
        generatedAt: '2026-10-20T01:00:00.000Z',
        setId: 'abc', keyVersion: 'k1', setLabel: 'SET B', qrPayload: 'REE|abc|vk1',
        sections: sections || [{ subject: 'EE', title: 'Electrical Engineering Professional Subjects', from: 1, to: count }],
        items,
        warnings: { unmatched: [], shortfall: [], focusFallback: false },
    };
}
const textsOf = () => pdf.last.texts.map((t) => t.text);

describe('generateExamPaper', () => {
    beforeEach(() => { pdf.last = null; });

    it('draws one bubble per option on the answer sheet: 6 options, 6 circles', async () => {
        await generateExamPaper({ draw: makeDraw({ count: 1, options: 6 }), documents: { sheet: true }, output: 'arraybuffer' });
        expect(pdf.last.circles).toHaveLength(6);
        expect(textsOf()).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E', 'F']));
    });

    it('draws each row\'s own count: 4, 5 and 6 options', async () => {
        await generateExamPaper({ draw: makeDraw({ count: 3, options: (i) => 4 + i }), documents: { sheet: true }, output: 'arraybuffer' });
        expect(pdf.last.circles).toHaveLength(4 + 5 + 6);
    });

    it('100 items x 6 options: 600 circles over more than one page, no row dropped', async () => {
        const res = await generateExamPaper({ draw: makeDraw({ count: 100, options: 6 }), documents: { sheet: true }, output: 'arraybuffer' });
        expect(pdf.last.circles).toHaveLength(600);
        expect(res.pages).toBeGreaterThan(1);
        const numbers = new Set(textsOf().filter((t) => /^\d+\.$/.test(t)));
        expect(numbers.size).toBe(100);
        // Every circle sits above the footer.
        expect(Math.max(...pdf.last.circles.map((c) => c.y + c.r))).toBeLessThan(297 - 14);
    });

    it('continues a long key onto further pages', async () => {
        const res = await generateExamPaper({ draw: makeDraw({ count: 300 }), documents: { key: true }, output: 'arraybuffer' });
        expect(res.pages).toBeGreaterThan(1);
        expect(textsOf().filter((t) => /^\d+\.$/.test(t))).toHaveLength(300);
        expect(textsOf().filter((t) => t === 'B')).toHaveLength(300);
    });

    it('takes its time allotment from the draw', async () => {
        await generateExamPaper({ draw: makeDraw(), documents: { paper: true }, output: 'arraybuffer' });
        expect(textsOf()).toContain('Time Allotment: 6 hours');
        await generateExamPaper({ draw: makeDraw({ plan: { timeAllotmentMins: 300 } }), documents: { paper: true }, output: 'arraybuffer' });
        expect(textsOf()).toContain('Time Allotment: 5 hours');
    });

    it('heads each part of a mixed paper', async () => {
        const draw = makeDraw({
            count: 6,
            plan: { kind: 'blended', code: 'BLENDED' },
            sections: [
                { subject: 'Mathematics', title: 'Mathematics', from: 1, to: 2 },
                { subject: 'ESAS', title: 'Engineering Sciences and Allied Subjects', from: 3, to: 4 },
                { subject: 'EE', title: 'Electrical Engineering Professional Subjects', from: 5, to: 6 },
            ],
        });
        await generateExamPaper({ draw, documents: { paper: true }, output: 'arraybuffer' });
        expect(textsOf()).toEqual(expect.arrayContaining([
            'Part I, Mathematics (items 1-2)',
            'Part II, Engineering Sciences and Allied Subjects (items 3-4)',
            'Part III, Electrical Engineering Professional Subjects (items 5-6)',
        ]));
    });

    it('uses the chosen paper size, long bond included', async () => {
        await generateExamPaper({ draw: makeDraw(), paper: 'long', output: 'arraybuffer' });
        expect(pdf.last.opts.format).toEqual([215.9, 330.2]);
        await generateExamPaper({ draw: makeDraw(), paper: 'letter', output: 'arraybuffer' });
        expect(pdf.last.opts.format).toBe('letter');
    });

    it('saves under the set and its Manila date, with the page count in every footer', async () => {
        const res = await generateExamPaper({ draw: makeDraw() });
        expect(res.filename).toBe('REE-EE-SETB-2026-10-20.pdf');
        expect(pdf.last.saved).toBe(res.filename);
        expect(textsOf().filter((t) => /^Page \d+ of \d+$/.test(t))).toHaveLength(res.pages);
    });

    it('refuses an empty draw or no parts', async () => {
        await expect(generateExamPaper({ draw: makeDraw({ count: 0 }) })).rejects.toThrow();
        await expect(generateExamPaper({ draw: makeDraw(), documents: {} })).rejects.toThrow('Choose at least one part to print.');
    });
});
