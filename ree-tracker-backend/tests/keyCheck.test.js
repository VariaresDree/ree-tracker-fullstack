import { describe, it, expect } from 'vitest';

const { normMath, answerLine, containsMath, explanationNamesOther, duplicateOptions, learnersChoseOther, findIssues } = require('../src/engine/keyCheck');

// Real questions from the live bank, 2026-11-16 (ids shortened). The first two
// had wrong keys; the rest only spell the same answer another way.
const q = (answer, options, line) => ({ answer, options, fixedExplanation: `**Key idea:** …\n\n**Answer:** ${line}\n\n**Why the others are wrong:** …` });

describe('normMath', () => {
    it('spells fractions, roots, bars and units one way', () => {
        expect(normMath('$\\frac{8}{3}$ units')).toBe(normMath('8/3 units'));
        expect(normMath('$-\\frac{2\\pi l}{\\sqrt{3}}$.')).toBe(normMath('$-2\\pi l / \\sqrt{3}$'));
        expect(normMath('$\\frac12(e-1)$')).toBe(normMath('$\\frac{1}{2}(e - 1)$'));
        expect(normMath('$\\frac{\\sqrt5+\\sqrt2}{3}$')).toBe(normMath('$\\frac{\\sqrt{5} + \\sqrt{2}}{3}$'));
        expect(normMath('$F=\\bar{C}$')).toBe(normMath('$F = \\overline{C}$'));
        expect(normMath('$2x\\cdot7^{x^2}\\ln7$')).toBe(normMath('$2x \\cdot 7^{x^2} \\ln(7)$'));
        expect(normMath('$120^\\circ$')).toBe(normMath('$120^{\\circ}$'));
        expect(normMath('$0.3\\ \\text{H}$')).toBe(normMath('0.3 H'));
    });

    it('takes the answer line from "**Answer:**"', () => {
        expect(answerLine('a\n**Answer:** $24V$.\nmore')).toBe('$24V$.');
        expect(answerLine('no answer line here')).toBeNull();
    });

    it("doesn't find a number inside a longer one", () => {
        expect(containsMath('13', '3')).toBe(false);
        expect(containsMath('x=3,y', '3')).toBe(true);
        expect(containsMath('0.953h', '0.95')).toBe(false);
        expect(containsMath('is8km.', '8km')).toBe(true);
    });
});

describe('explanationNamesOther', () => {
    it('catches an explanation that works out another option (two live EE keys)', () => {
        expect(explanationNamesOther(q('0.853 H', ['0.853 H', '0.700 H', '0.953 H', '0.600 H'], 'The total inductance is $0.953\\ \\text{H}$.'))).toBe('0.953 H');
        expect(explanationNamesOther(q('0.1 H', ['0.1 H', '0.2 H', '0.3 H', '0.4 H'], 'The mutual inductance is $0.3\\ \\text{H}$.'))).toBe('0.3 H');
        expect(explanationNamesOther(q('5 km', ['5 km', '8 km', '10 km', '12 km'], '$8\\ \\text{km}$, matching the 8 km option.'))).toBe('8 km');
    });

    it('stays quiet when the line gives the key in another spelling (live false alarms)', () => {
        const same = [
            q('$-2\\pi l / \\sqrt{3}$', ['$-2\\pi l$', '$2\\pi l$', '$-2\\pi l / \\sqrt{3}$', '$0$'], '$-\\frac{2\\pi l}{\\sqrt{3}}$.'),
            q('8/3 units', ['4/3 units', '8/3 units', '16/3 units', '3 units'], '$\\frac{8}{3}$ units.'),
            q('$F = \\overline{C}$', ['$F = \\overline{C}$', '$F = \\overline{A}$', '$F = B$', '$F = A \\cdot C$'], '$F=\\bar{C}$, matching the $\\bar{C}$ option.'),
            q('$6/\\sqrt{3}$', ['$\\sqrt{3}$', '$2/\\sqrt{3}$', '$3/\\sqrt{3}$', '$6/\\sqrt{3}$'], '$\\frac6{\\sqrt3}$'),
            q('$\\frac{2\\sqrt{3}}{3}$', ['$\\sqrt{3}$', '$\\frac{2\\sqrt{3}}{3}$', '$2$', '$3$'], '$2\\sqrt3/3$'),
            q('$\\frac{14\\sqrt{7}}{3}$', ['$14$', '$\\frac{14\\sqrt{7}}{3}$', '$7$', '$\\sqrt{7}$'], '$14\\sqrt7/3$, matching the $14\\sqrt7/3$ option.'),
            q('$\\frac{1}{2}\\ln(3) + j\\frac{\\pi}{2}$', ['$\\ln(3) + j\\frac{\\pi}{2}$', '$\\frac{1}{2}\\ln(3) + j\\frac{\\pi}{2}$', '$j\\pi$', '$0$'], '$\\frac12\\ln3+j\\pi/2$.'),
            q('$t = \\tau \\ln(2)$', ['$t = \\tau \\ln(2)$', '$t = 2\\tau \\ln(2)$', '$t = \\frac{\\tau}{2}$', '$t = \\tau$'], '$t=\\tau\\ln2$, matching the $\\tau\\ln2$ option.'),
            q('47/2', ['47', '47/2', '25/2', '25'], '$\\frac{47}{2}$, matching the correct option.'),
            q('$\\arctan\\left(\\frac{\\sqrt{3}}{2}\\right)$', ['$\\arctan(\\sqrt{3})$', '$\\arctan\\left(\\frac{\\sqrt{3}}{2}\\right)$', '$\\pi/3$', '$\\pi/6$'], '$\\arctan(\\sqrt3/2)$'),
        ];
        for (const item of same) expect(explanationNamesOther(item), item.answer).toBeNull();
    });

    it('needs an answer line, and never guesses between two named options', () => {
        expect(explanationNamesOther({ answer: '1', options: ['1', '2'], fixedExplanation: 'No line.' })).toBeNull();
        expect(explanationNamesOther(q('1', ['1', '2', '3', '4'], 'either 2 or 3'))).toBeNull();
    });
});

describe('the other checks', () => {
    it('two options that read the same', () => {
        expect(duplicateOptions(['$2\\pi$', '2 \\pi', '3', '4'])).toBe(true);
        expect(duplicateOptions(['1', '2', '3', '4'])).toBe(false);
    });

    it('learners: enough of them, and a wrong option clearly ahead of the key', () => {
        const pick = (option, learners, isKey = false) => ({ option, learners, isKey });
        expect(learnersChoseOther([pick('B', 4), pick('A', 1, true)])).toEqual({ option: 'B', chose: 4, right: 1, learners: 5 });
        expect(learnersChoseOther([pick('B', 2), pick('A', 1, true)])).toBeNull(); // 3 learners
        expect(learnersChoseOther([pick('B', 3), pick('A', 2, true)])).toBeNull(); // ahead by 1
    });

    it('findIssues lists every finding with what it found', () => {
        const issues = findIssues(q('0.853 H', ['0.853 H', '0.700 H', '0.953 H', '0.953 H'], 'The total inductance is $0.953\\ \\text{H}$.'));
        expect(issues.map((i) => i.reason)).toEqual(['duplicate-options']);
        const one = findIssues(q('0.853 H', ['0.853 H', '0.700 H', '0.953 H', '0.600 H'], 'It is 0.953 H.'));
        expect(one).toEqual([{ reason: 'explanation-names-other', detail: { option: '0.953 H', line: 'It is 0.953 H.' } }]);
    });
});
