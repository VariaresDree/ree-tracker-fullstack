import { describe, it, expect } from 'vitest';
import { parseExchange } from './aiExchange';

const FENCE = '`'.repeat(3);
const question = (over = {}) => `===QUESTION===
subject: ${over.subject ?? 'EE'}
topic: Electric Circuits 2
type: calculation
difficulty: 2
---STEM---
A load draws $I = \\frac{V}{Z}$ at 230 V. What is the current?
---OPTIONS---
A. 10 A
B. 12 A
C. 14 A
D. 16 A
---KEY---
${over.key ?? 'C'}
---EXPLANATION---
**Key idea:** Ohm's law.

**Solution:**

1. **Divide.** $$I = \\frac{230}{16.4}$$

**Answer:** 14 A
===END===`;

describe('parseExchange: questions', () => {
  it('reads a block, and keeps single-backslash LaTeX exactly as written', () => {
    const { questions, problems } = parseExchange(question());
    expect(problems).toEqual([]);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({
      subject: 'EE', subtopic: 'Electric Circuits 2', type: 'calculation', difficulty: 2,
      options: ['10 A', '12 A', '14 A', '16 A'], answer: '14 A',
    });
    expect(questions[0].text).toContain('\\frac{V}{Z}');
    expect(questions[0].fixedExplanation).toContain('**Key idea:**');
    expect(questions[0].fixedExplanation).toContain('\\frac{230}{16.4}');
  });

  it('ignores prose and code fences around the blocks', () => {
    const { questions } = parseExchange(`Here are your questions:\n${FENCE}text\n${question()}\n${FENCE}\nLet me know!`);
    expect(questions).toHaveLength(1);
    expect(questions[0].fixedExplanation).not.toContain(FENCE);
  });

  it('reads several blocks, across several pasted messages', () => {
    const { questions } = parseExchange(`${FENCE}\n${question()}\n${question()}\n${FENCE}\ncontinue\n${FENCE}\n${question()}\n${FENCE}`);
    expect(questions).toHaveLength(3);
  });

  it.each([['A)', '(A)', 'a.', 'A:']])('reads option labels such as %s', () => {
    for (const label of ['A)', '(A)', 'a.', 'A:']) {
      const text = question().replace('A. 10 A', `${label} 10 A`);
      expect(parseExchange(text).questions[0].options[0]).toBe('10 A');
    }
  });

  it('accepts a key written as a label or as the option text', () => {
    expect(parseExchange(question({ key: '(c)' })).questions[0].answer).toBe('14 A');
    expect(parseExchange(question({ key: 'C. 14 A' })).questions[0].answer).toBe('14 A');
    expect(parseExchange(question({ key: '14 A' })).questions[0].answer).toBe('14 A');
  });

  it('keeps an option that runs over two lines', () => {
    const text = question().replace('B. 12 A', 'B. 12 A at\nunity power factor');
    expect(parseExchange(text).questions[0].options[1]).toBe('12 A at\nunity power factor');
  });

  it('flags a key that names no option, and leaves it for the checks', () => {
    const { questions } = parseExchange(question({ key: 'Z' }));
    expect(questions[0].answer).toBe('Z');
  });

  it('marks a block cut off at the end and keeps the ones before it', () => {
    const cut = question().split('---KEY---')[0];
    const { questions, problems } = parseExchange(`${question()}\n${cut}`);
    expect(questions).toHaveLength(1);
    expect(problems).toEqual([expect.stringMatching(/cut off/i)]);
  });

  it('keeps a last block with no end marker when nothing is missing', () => {
    const { questions, problems } = parseExchange(question().replace('===END===', ''));
    expect(questions).toHaveLength(1);
    expect(problems).toEqual([]);
  });

  it('turns \\( and \\[ into the delimiters the app stores', () => {
    const text = question().replace('$I = \\frac{V}{Z}$', '\\(I = \\frac{V}{Z}\\)');
    expect(parseExchange(text).questions[0].text).toContain('$I = \\frac{V}{Z}$');
  });
});

describe('parseExchange: formula cards', () => {
  const card = `===CARD===
kind: formula
subject: EE
topic: Electric Circuits 2
tag: AC Power
name: Three-phase real power
symbol: $P$
---FORMULA---
$P = \\sqrt{3} V_L I_L \\cos\\theta$
---VALUE---
$\\text{W}$
---MEANING---
Real power of a balanced load.
---VARIABLES---
$V_L$ | line voltage | $\\text{V}$
$\\theta$ | angle between voltage and current
---TIP---
Forgetting the root three.
===END===`;

  it('reads a card in the shape the review queue takes', () => {
    const { cards, questions, problems } = parseExchange(card);
    expect(problems).toEqual([]);
    expect(questions).toEqual([]);
    expect(cards[0]).toMatchObject({
      kind: 'formula', subject: 'EE', topic: 'Electric Circuits 2', subtopicTag: 'AC Power', name: 'Three-phase real power',
      symbol: '$P$', valueUnit: '$\\text{W}$', description: 'Real power of a balanced load.', purposeExamTip: 'Forgetting the root three.',
      dimensionless: false,
    });
    expect(cards[0].formulaLatex).toContain('\\sqrt{3}');
    expect(cards[0].variables).toEqual([
      { symbol: '$V_L$', meaning: 'line voltage', unit: '$\\text{V}$' },
      { symbol: '$\\theta$', meaning: 'angle between voltage and current', unit: null },
    ]);
  });

  it('reads a constant, with no variables', () => {
    const { cards } = parseExchange(`===CARD===
kind: constant
subject: EE
topic: Electromagnetism
name: Permittivity
---VALUE---
$8.854\\times10^{-12}$ F/m
---MEANING---
Of free space.
===END===`);
    expect(cards[0]).toMatchObject({ kind: 'constant', valueUnit: '$8.854\\times10^{-12}$ F/m', variables: [], formulaLatex: null });
  });
});

describe('parseExchange: JSON pasted instead', () => {
  it('reads an items list, keeping LaTeX a parser would swallow', () => {
    const raw = String.raw`Sure: {"items":[{"text":"$\frac{a}{b}$ is?","options":["1","2"],"answer":"B","type":"conceptual","difficulty":1,"subtopic":"Algebra","fixedExplanation":"$\times$"}]}`;
    const { questions, problems } = parseExchange(raw);
    expect(problems).toEqual([]);
    expect(questions[0].text).toBe(String.raw`$\frac{a}{b}$ is?`);
    expect(questions[0].fixedExplanation).toBe(String.raw`$\times$`);
  });

  it('tells cards from questions', () => {
    const { cards } = parseExchange('[{"kind":"constant","name":"c","valueUnit":"3","description":"d","subject":"EE","topic":"X"}]');
    expect(cards).toHaveLength(1);
  });
});

describe('parseExchange: nothing to read', () => {
  it.each([[''], ['   '], ['Sorry, I can only do three questions a day.']])('says so for %j', (raw) => {
    const { questions, cards, problems } = parseExchange(raw);
    expect(questions).toEqual([]);
    expect(cards).toEqual([]);
    expect(problems).toHaveLength(1);
  });
});
