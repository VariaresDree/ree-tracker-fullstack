// The old jsPDF export (generateExamPaper), until the old dialog is deleted.
// Its helpers moved to exam-export/paperFormat.js; their tests are in
// paperFormat.test.js.
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

import { generateExamPaper } from './examPaper.js';

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
