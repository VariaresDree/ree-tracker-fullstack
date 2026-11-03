// Replies as Gemini and ChatGPT really wrote them. The prompt asks for exact
// markers; a real reply bends them, and the first import read neither of these.
import { describe, it, expect } from 'vitest';
import { parseExchange } from './aiExchange';
import { explanationIssues, normalizeGenerated, questionIssues } from '../../../utils/questionChecks';

const shape = (reply) => parseExchange(reply).questions.map(normalizeGenerated);

// ChatGPT's copy escaped each marker and spaced every line.
const CHATGPT = String.raw`\===QUESTION===

subject: EE

topic: Electrical Machinery 1

type: calculation

difficulty: 1

\---STEM---

A 75-kVA, three-phase transformer has a rated voltage of 13.8 kV/400 V. Determine its full-load secondary line current.

\---OPTIONS---

A. 3.138 A

B. 108.3 A

C. 187.5 A

D. 62.50 A

\---KEY---

B

\---EXPLANATION---

**Key idea:** The apparent power of a balanced three-phase transformer is $S = \sqrt{3}V_LI_L$.

**Solution:**

1. **Select the formula.**

$$I_{2L} = \frac{75,000}{\sqrt{3}(400)}$$

**Answer:** $108.3\ \text{A}$

**Remember:** Use the line-to-line voltage.

\===END===`;

// Gemini closed the explanation marker with equals signs.
const GEMINI = String.raw`===QUESTION===
subject: EE
topic: Electrical Machinery 1
type: conceptual
difficulty: 1
---STEM---
Which component of a DC machine converts the internal alternating voltage into a continuous direct voltage at the terminals?
---OPTIONS---
A. Slip rings
B. Commutator
C. Interpoles
D. Equalizer rings
---KEY---
B
---EXPLANATION===
**Key idea:** The commutator acts as a mechanical rectifier.

**Why:** The segments switch the coil connections at the moment of voltage reversal.

**Remember:** The commutator is a mechanical rectifier.
===END===`;

// And changed its mind partway through a solution, leaving a key that its own
// working contradicts.
const GEMINI_SELF_CORRECTING = String.raw`===QUESTION===
subject: EE
topic: Electrical Machinery 1
type: calculation
difficulty: 3
---STEM---
A DC shunt motor runs at 1200 rpm at no load. Calculate its full-load speed for the values given in this stem.
---OPTIONS---
A. $1106\ \text{rpm}$
B. $1142\ \text{rpm}$
C. $1200\ \text{rpm}$
D. $1080\ \text{rpm}$
---KEY---
A
---EXPLANATION===
**Solution:**
1. **Determine full-load speed.**
$$N_{\text{fl}} = 1200 \times \frac{222.0}{229.4} = 1161\ \text{rpm}$$

Let's adjust option choices to exact values:
A. $1161\ \text{rpm}$

Correct Option: A ($1161\ \text{rpm}$).

**Answer:** The $1161\ \text{rpm}$ option.
===END===`;

describe('real replies', () => {
  it('reads ChatGPT’s escaped markers', () => {
    const [q] = shape(CHATGPT);
    expect(q.options).toEqual(['3.138 A', '108.3 A', '187.5 A', '62.50 A']);
    expect(q.answer).toBe('108.3 A');
    expect(q.fixedExplanation).toContain('$S = \\sqrt{3}V_LI_L$');
    expect(q.fixedExplanation).not.toContain('\\===');
    expect(questionIssues(q)).toEqual([]);
  });

  it('reads Gemini’s mismatched marker, keeping the key and the explanation apart', () => {
    const [q] = shape(GEMINI);
    expect(q.answer).toBe('Commutator');
    expect(q.fixedExplanation).toMatch(/^\*\*Key idea:\*\*/);
    expect(questionIssues(q)).toEqual([]);
  });

  it('flags a solution that corrects itself and contradicts its key', () => {
    const [q] = shape(GEMINI_SELF_CORRECTING);
    const issues = questionIssues(q);
    expect(issues).toContain('The explanation shows the AI correcting itself. Check the key and options');
    expect(issues).toContain("The explanation's answer doesn't match the key");
  });
});

describe('parseExchange markers', () => {
  const block = (open, section, end) => `${open}\nsubject: EE\ntopic: X\n${section('STEM')}\nA stem that is long enough?\n${section('OPTIONS')}\nA. one\nB. two\n${section('KEY')}\nB\n${section('EXPLANATION')}\n**Answer:** two\n${end}`;

  it.each([
    ['escaped', '\\===QUESTION===', (n) => `\\---${n}---`, '\\===END==='],
    ['both escaped', '\\=\\=\\=QUESTION\\=\\=\\=', (n) => `\\-\\-\\-${n}\\-\\-\\-`, '\\=\\=\\=END\\=\\=\\='],
    ['mismatched', '---QUESTION===', (n) => `===${n}---`, '===END---'],
    ['bold', '**===QUESTION===**', (n) => `**---${n}---**`, '**===END===**'],
    ['spaced', '=== QUESTION ===', (n) => `--- ${n} ---`, '=== END ==='],
    ['lower case', '===question===', (n) => `---${n.toLowerCase()}---`, '===end==='],
    ['typographic dashes', '===QUESTION===', (n) => `—${n}—`, '===END==='],
  ])('reads %s markers', (_name, open, section, end) => {
    const { questions, problems } = parseExchange(block(open, section, end));
    expect(problems).toEqual([]);
    expect(questions[0]).toMatchObject({ text: 'A stem that is long enough?', options: ['one', 'two'], answer: 'two', fixedExplanation: '**Answer:** two' });
  });

  it('a Markdown rule or a table divider inside an explanation is not a marker', () => {
    const text = block('===QUESTION===', (n) => `---${n}---`, '---\n|---|---|\n===END===');
    expect(parseExchange(text).questions[0].fixedExplanation).toContain('|---|---|');
  });
});

describe('explanationIssues', () => {
  const q = (answer, explanation) => ({ answer, fixedExplanation: explanation });

  it.each([
    ['108.3 A', '**Answer:** $108.3\\ \\text{A}$'],
    ['$2.1\\ \\text{Hz}$ and $1737\\ \\text{rpm}$', '**Answer:** The $2.1\\ \\text{Hz}$ and $1737\\ \\text{rpm}$ option.'],
    ['$32.0\\ \\text{k}\\Omega$', '**Answer:** The $32\\ \\text{k}\\Omega$ option.'],
    ['1,000 V', '**Answer:** $1000\\ \\text{V}$'],
    ['Commutator', '**Why:** Because of 2 segments.'],
    ['5 A', 'No labels at all, and 7 in it.'],
  ])('passes %s', (answer, explanation) => {
    expect(explanationIssues(q(answer, explanation))).toEqual([]);
  });

  it('catches an answer that differs from the key', () => {
    expect(explanationIssues(q('1106 rpm', '**Answer:** 1161 rpm'))).toEqual(["The explanation's answer doesn't match the key"]);
  });
});
