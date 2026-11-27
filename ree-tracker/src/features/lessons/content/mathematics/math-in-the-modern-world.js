// Library › Lessons › Mathematics › Math in the Modern World (2026-11-17; every
// subtopic in the module format 2026-11-27, with figures, examples a step at a
// time and checks; every number re-worked by mathModernWorldLesson.test.js. No
// review handout covers this course, so the text, problems and figures are this
// app's own): written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

export const fib = (n) => {
  let [a, b] = [1, 1];
  for (let i = 2; i < n; i++) [a, b] = [b, a + b];
  return n <= 2 ? 1 : b;
};

// A ₱500,000 loan at 8% compounded monthly, paid monthly for 5 years.
export const LOAN = { P: 500000, i: 0.08 / 12, n: 60 };
export const payment = ({ P, i, n }) => (P * i) / (1 - (1 + i) ** -n);
export const balance = (k, loan = LOAN) => loan.P * (1 + loan.i) ** k - (payment(loan) * ((1 + loan.i) ** k - 1)) / loan.i;

// A regular octagon of side 1, flat sides level, centred at (cx, cy).
const H = (1 + Math.SQRT2) / 2;
export const octagon = (cx, cy) =>
  [[H, 0.5], [0.5, H], [-0.5, H], [-H, 0.5], [-H, -0.5], [-0.5, -H], [0.5, -H], [H, -0.5], [H, 0.5]].map(([x, y]) => [cx + x, cy + y]);
export const OCT_STEP = 1 + Math.SQRT2;
// The square gap between the four octagons: a diamond of side 1 centred at (H, H).
export const GAP = [[0.5, H], [H, 0.5], [2 * H - 0.5, H], [H, 2 * H - 0.5], [0.5, H]];

// The house graph: a square with a roof.
export const HOUSE = {
  v: { BL: [0, 0], BR: [2, 0], TR: [2, 2], TL: [0, 2], P: [1, 3.2] },
  e: [['BL', 'BR'], ['BR', 'TR'], ['TR', 'TL'], ['TL', 'BL'], ['TL', 'P'], ['P', 'TR']],
};
const dot = ([x, y]) => Array.from({ length: 13 }, (_, k) => [x + 0.09 * Math.cos((k * Math.PI) / 6), y + 0.09 * Math.sin((k * Math.PI) / 6)]);

// 21 ballots on three candidates, most preferred first.
export const BALLOTS = [
  [8, ['A', 'B', 'C']],
  [7, ['B', 'C', 'A']],
  [6, ['C', 'B', 'A']],
];

export default {
  topic: 'Math in the Modern World',
  subject: 'Mathematics',
  overview: r`Mathematics as it shows up outside the classroom: patterns in nature, the language and logic of careful reasoning, and the tools behind everyday systems, from barcodes and ciphers to loans, elections and networks. The board asks these as short computations: a check digit, a truth table, a loan payment, an apportionment, an Euler path. Learn each procedure step by step; the arithmetic is light, the order of steps is what gets tested.`,
  sources: [
    'Mathematics in the Modern World (Aufmann, Lockwood, Nation and Clegg, Mathematical Excursions)',
    'CHED Memorandum Order No. 20, s. 2013: Mathematics in the Modern World course description',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Patterns and Numbers in Nature',
      inShort: r`Fibonacci numbers, the golden ratio and spirals, in petals, shells and seed heads.`,
      body: [
        r`The **Fibonacci numbers** start 1, 1 and then add the last two: 1, 1, 2, 3, 5, 8, 13, 21, 34, … They count the spirals in sunflower heads and pine cones, and many flowers have 3, 5 or 8 petals. The ratio of each to the one before settles on the **golden ratio** $\phi = \frac{1 + \sqrt5}{2} = 1.618\ldots$, overshooting and undershooting in turn:`,
        {
          type: 'plot',
          alt: 'The ratio of each Fibonacci number to the one before, for n from 1 to 10: 1, 2, 1.5, 1.667, 1.6, 1.625 and so on, zig-zagging above and below a dashed line at 1.618 and closing in on it.',
          caption: 'F(n + 1)/F(n) for n = 1 to 10: the ratios zig-zag onto the golden ratio 1.618 (dashed).',
          x: [1, 10],
          y: [0.8, 2.2],
          xLabel: 'n',
          yLabel: 'ratio',
          series: [{ points: Array.from({ length: 10 }, (_, k) => [k + 1, fib(k + 2) / fib(k + 1)]), colour: colourOf(0) }],
          marks: [{ y: (1 + Math.sqrt(5)) / 2 }],
          legend: false,
        },
        r`| Fact | Formula |
|---|---|
| recursion | $F_n = F_{n-1} + F_{n-2}$, $F_1 = F_2 = 1$ |
| Binet's formula | $F_n = \frac{\phi^n - \psi^n}{\sqrt5}$, $\psi = \frac{1 - \sqrt5}{2}$; for large $n$, round $\frac{\phi^n}{\sqrt5}$ |
| sum | $F_1 + F_2 + \cdots + F_n = F_{n+2} - 1$ |
| sum of squares | $F_1^2 + \cdots + F_n^2 = F_nF_{n+1}$ |
| golden rectangle | long side = $\phi \times$ short side; cutting off a square leaves another golden rectangle |

A **golden spiral** grows by $\phi$ every quarter turn, the shape of a nautilus shell. Symmetry and repeating tilings, the other patterns of nature, are in Geometric Designs.`,
      ],
      keyIdeas: [
        r`$F_n = F_{n-1} + F_{n-2}$: 1, 1, 2, 3, 5, 8, 13, 21, …; Binet: $F_n = \frac{\phi^n - \psi^n}{\sqrt5}$.`,
        r`$\frac{F_{n+1}}{F_n} \to \phi = 1.618\ldots$; $F_1 + \cdots + F_n = F_{n+2} - 1$.`,
        r`A golden spiral widens by $\phi$ every quarter turn; symmetry and tessellations are the other patterns.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A term and a sum',
          problem: r`Find $F_{15}$ without listing, and the sum of the first 10 Fibonacci numbers.`,
          steps: [
            r`$\frac{\phi^{15}}{\sqrt5} = 609.9997$, so $F_{15} = 610$.`,
            r`The sum is $F_{12} - 1 = 144 - 1 = 143$.`,
          ],
          answer: r`610; 143.`,
        },
        {
          level: 'board',
          title: 'Binet, two sums and a rectangle',
          problem: r`(a) Find $F_{20}$ by Binet's formula. (b) Add the first 15 Fibonacci numbers. (c) Add the squares of the first 8. (d) A golden rectangle is 50 cm wide. How long is it?`,
          steps: [
            r`(a) $\frac{\phi^{20}}{\sqrt5} = 6765.00003$, so $F_{20} = 6765$.`,
            r`(b) $F_{17} - 1 = 1597 - 1 = 1596$.`,
            r`(c) $F_8F_9 = 21 \times 34 = 714$ (check: $1 + 1 + 4 + 9 + 25 + 64 + 169 + 441 = 714$).`,
            r`(d) $50\phi = 80.9$ cm.`,
          ],
          answer: r`(a) 6765; (b) 1596; (c) 714; (d) 80.9 cm.`,
        },
      ],
      traps: [
        r`Some books start with $F_0 = 0$; check which index the problem uses.`,
        r`The sum of the first $n$ terms is $F_{n+2} - 1$, two places on, not $F_{n+1}$.`,
      ],
      check: [
        { q: r`What is $F_{12}$?`, a: r`144.` },
        { q: r`A golden rectangle is 30 cm long. How wide is it?`, a: r`$\frac{30}{\phi} = 18.5$ cm.` },
      ],
    },
    {
      name: 'Mathematical Language and Symbols',
      inShort: r`Reading and writing mathematics precisely: expressions, sets, intervals and the rules of arithmetic.`,
      body: [
        r`Mathematics is a language: **expressions** name things ($2x + 1$), **sentences** state something true or false ($2x + 1 = 7$). It is precise, concise and powerful, so every symbol has one meaning.

| Symbol or rule | Meaning |
|---|---|
| order of operations | grouping, exponents, then $\times$ and $\div$ left to right, then $+$ and $-$ left to right |
| $\in$, $\subseteq$, $\varnothing$ | is an element of, is a subset of, the empty set |
| $\forall$, $\exists$ | for all, there exists |
| $[a, b]$, $(a, b)$, $[a, b)$ | a bracket includes its end, a parenthesis excludes it |
| commutative, associative | order and grouping don't matter for $+$ and $\times$ |
| distributive | $a(b + c) = ab + ac$ |
| identity, inverse | $a + 0 = a$, $a \times 1 = a$; $a + (-a) = 0$, $a \times \frac1a = 1$ |

A **function** pairs each input with exactly one output; a **relation** may pair one input with several. Translating words into symbols is half of every word problem: "the square of the sum" is $(a + b)^2$, "the sum of the squares" is $a^2 + b^2$.`,
      ],
      keyIdeas: [
        r`Order: grouping, exponents, then $\times$ and $\div$ left to right, then $+$ and $-$ left to right.`,
        r`Commutative, associative, distributive, identity and inverse properties.`,
        r`$\{x \mid a \le x < b\} = [a, b)$: a bracket includes, a parenthesis excludes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Left to right, and an interval',
          problem: r`Evaluate $18 \div 3 \times 2 - 2^2$, and write $\{x \mid -2 < x \le 5\}$ in interval notation.`,
          steps: [
            r`$18 \div 3 = 6$, $6 \times 2 = 12$, $12 - 4 = 8$.`,
            r`$-2$ is excluded and 5 included: $(-2, 5]$.`,
          ],
          answer: r`8; $(-2, 5]$.`,
        },
        {
          level: 'board',
          title: 'An expression, two intervals, a translation',
          problem: r`(a) Evaluate $2 + 3 \times (8 - 2)^2 \div 9$. (b) For $A = [-3, 4)$ and $B = (1, 7]$, find $A \cap B$ and $A \cup B$. (c) Write "the square of the sum of $a$ and $b$ is at most 20" in symbols.`,
          steps: [
            r`(a) $(8 - 2)^2 = 36$; $3 \times 36 = 108$; $108 \div 9 = 12$; $2 + 12 = 14$.`,
            r`(b) Both hold between 1 and 4, ends excluded: $A \cap B = (1, 4)$. Together they run from $-3$ (included) to 7 (included): $A \cup B = [-3, 7]$.`,
            r`(c) $(a + b)^2 \le 20$.`,
          ],
          answer: r`(a) 14; (b) $(1, 4)$ and $[-3, 7]$; (c) $(a + b)^2 \le 20$.`,
        },
      ],
      traps: [
        r`$18 \div 3 \times 2$ is not $18 \div 6$: division and multiplication go left to right.`,
        r`$-3^2 = -9$: the exponent binds before the minus sign. $(-3)^2 = 9$.`,
      ],
      check: [
        { q: r`Which property is $3(x + 4) = 3x + 12$?`, a: r`Distributive.` },
        { q: r`Evaluate $20 - 12 \div 4 \times 2$.`, a: r`$20 - 6 = 14$.` },
      ],
    },
    {
      name: 'Problem Solving and Reasoning',
      inShort: r`Inductive reasoning finds a pattern; deductive reasoning proves it. Pólya: understand, plan, carry out, look back.`,
      body: [
        r`**Inductive reasoning** goes from examples to a general guess; **deductive reasoning** goes from accepted facts to a sure conclusion. A guess from a pattern can fail, and one **counterexample** is enough to disprove it. Pólya's four steps organise any problem, and looking back often sends you round again:`,
        {
          type: 'blocks',
          alt: "Pólya's four steps in a loop: understand the problem, devise a plan, carry out the plan, and look back, which returns to understanding.",
          caption: "Pólya's four steps: understand, plan, carry out, look back, and round again if the check fails.",
          blocks: [
            { id: 'u', at: [0, 0], label: 'understand' },
            { id: 'p', at: [1, 0], label: 'plan' },
            { id: 'c', at: [1, 1], label: 'carry out' },
            { id: 'l', at: [0, 1], label: 'look back' },
          ],
          links: [
            ['u', 'p'],
            ['p', 'c'],
            ['c', 'l'],
            ['l', 'u'],
          ],
        },
        r`Useful plans: draw a picture, make a table, look for a pattern, solve a simpler problem, work backward, or guess and check.

| Tool | Rule |
|---|---|
| differences | constant $k$-th differences mean a polynomial of degree $k$; with constant second differences $\Delta^2$, $a_n = An^2 + Bn + C$ with $2A = \Delta^2$ |
| pigeonhole | $N$ objects in $k$ boxes put at least $\lceil N/k\rceil$ in one box |
| induction | prove $P(1)$, then show $P(k)$ gives $P(k + 1)$ |`,
      ],
      keyIdeas: [
        r`Constant $k$-th differences mean a polynomial of degree $k$; constant second differences, $a_n = An^2 + Bn + C$ with $2A = \Delta^2$.`,
        r`Pigeonhole: $N$ objects in $k$ boxes put at least $\lceil N/k \rceil$ in one box.`,
        r`Induction: prove $P(1)$, then $P(k) \Rightarrow P(k + 1)$. One counterexample disproves a general claim.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A quadratic pattern',
          problem: r`Find the 10th term of 2, 6, 12, 20, 30, …`,
          steps: [
            r`Differences 4, 6, 8, 10; second differences 2, so $A = 1$.`,
            r`$a_n = n^2 + Bn + C$: $a_1 = 2$ and $a_2 = 6$ give $B = 1$, $C = 0$. So $a_n = n^2 + n$, and $a_{10} = 110$.`,
          ],
          answer: r`110.`,
        },
        {
          level: 'board',
          title: 'A pattern, the pigeonhole, a simpler problem',
          problem: r`(a) Find the 20th term of 3, 8, 15, 24, 35, … (b) How many people guarantee that at least three share a birth month? (c) Twelve engineers each shake hands once with every other. How many handshakes?`,
          steps: [
            r`(a) Differences 5, 7, 9, 11; second differences 2, so $a_n = n^2 + Bn + C$. $a_1 = 3$ and $a_2 = 8$ give $B = 2$, $C = 0$: $a_n = n^2 + 2n$, and $a_{20} = 440$.`,
            r`(b) 24 people could fill every month exactly twice; the 25th makes a third: $2 \times 12 + 1 = 25$.`,
            r`(c) Start small: 2 people, 1; 3 people, 3; 4 people, 6. Each new person shakes with everyone before, so 12 people make $\frac{12 \times 11}{2} = 66$.`,
          ],
          answer: r`(a) 440; (b) 25; (c) 66.`,
        },
      ],
      traps: [
        r`A pattern seen in a few cases is a guess until it is proved.`,
        r`For the pigeonhole, "at least $m$ in a box" needs $(m - 1)k + 1$ objects.`,
      ],
      check: [
        { q: r`Is "every odd number is prime" true?`, a: r`No: 9 is a counterexample.` },
        { q: r`How many socks from a drawer of black and white guarantee a pair?`, a: r`3.` },
      ],
    },
    {
      name: 'Sets and Logic',
      inShort: r`Sets, statements, truth tables and valid arguments.`,
      body: [
        r`A **set** is a well-defined collection. For two sets, $n(A \cup B) = n(A) + n(B) - n(A \cap B)$, so a survey's overlaps can be untangled with a Venn diagram. A set of $n$ elements has $2^n$ subsets, and $n(A \times B) = n(A)\,n(B)$.

A **statement** is true or false. Joined by connectives, its truth follows a truth table:

| $p$ | $q$ | $p \land q$ | $p \lor q$ | $p \to q$ | $p \leftrightarrow q$ |
|---|---|---|---|---|---|
| T | T | T | T | T | T |
| T | F | F | T | F | F |
| F | T | F | T | T | F |
| F | F | F | F | T | T |

A conditional $p \to q$ is false only when $p$ is true and $q$ false. It equals its **contrapositive** $\neg q \to \neg p$, but not its converse $q \to p$ or inverse $\neg p \to \neg q$. **De Morgan**: $\neg(p \land q) \equiv \neg p \lor \neg q$, and the same for sets. Negating a quantifier flips it: the negation of "all are" is "some are not".

An argument is **valid** when the premises can't all be true with the conclusion false. Valid forms: modus ponens ($p \to q$, $p$, so $q$), modus tollens ($p \to q$, $\neg q$, so $\neg p$) and the syllogism ($p \to q$, $q \to r$, so $p \to r$). Affirming the consequent and denying the antecedent are invalid.`,
      ],
      keyIdeas: [
        r`De Morgan: $(A \cup B)' = A' \cap B'$ and $\neg(p \land q) \equiv \neg p \lor \neg q$. $n(A \times B) = n(A)n(B)$.`,
        r`$p \to q$ is false only when $p$ is true and $q$ false; it equals its contrapositive $\neg q \to \neg p$ and $\neg p \lor q$.`,
        r`Valid: modus ponens, modus tollens, syllogism. A truth table for $n$ statements has $2^n$ rows.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Affirming the consequent',
          problem: r`"If I study, I pass. I passed. So I studied." Is the argument valid? Give the contrapositive of the first premise.`,
          steps: [
            r`It is $[(p \to q) \land q] \to p$: affirming the consequent. The row with $p$ false and $q$ true makes both premises true and the conclusion false, so it is invalid.`,
            r`Contrapositive: "If I don't pass, I didn't study."`,
          ],
          answer: r`Invalid; "If I don't pass, I didn't study."`,
        },
        {
          level: 'board',
          title: 'A survey, a negation, an argument',
          problem: r`(a) Of 100 students, 60 take Mathematics, 45 Physics and 25 both. How many take Mathematics only, and how many neither? (b) Negate "All engineers are careful." (c) Is "If it rains, the match is off. The match is on. So it isn't raining." valid? (d) How many subsets has $\{a, b, c, d, e\}$?`,
          steps: [
            r`(a) Mathematics only: $60 - 25 = 35$. Either: $60 + 45 - 25 = 80$, so neither: $100 - 80 = 20$.`,
            r`(b) "Some engineers are not careful."`,
            r`(c) $p \to q$, $\neg q$, so $\neg p$: modus tollens, valid.`,
            r`(d) $2^5 = 32$.`,
          ],
          answer: r`(a) 35 and 20; (b) some engineers are not careful; (c) valid; (d) 32.`,
        },
      ],
      traps: [
        r`The converse ($q \to p$) is NOT equivalent to the conditional.`,
        r`The negation of "all are careful" is not "none are careful".`,
      ],
      check: [
        { q: r`When is $p \to q$ false?`, a: r`Only when $p$ is true and $q$ is false.` },
        { q: r`How many rows has a truth table for 4 statements?`, a: r`$2^4 = 16$.` },
      ],
    },
    {
      name: 'Data Management',
      inShort: r`Collecting, summarising and interpreting data; the measures themselves are in Probability & Statistics.`,
      body: [
        r`Data management means collecting data fairly, organising it in tables and graphs, and reading off its centre, spread and position. A frequency histogram shows the shape at a glance:`,
        {
          type: 'plot',
          alt: 'A histogram of ten scores in classes of ten: one score in the 50s, two in the 60s, three in the 70s, two in the 80s and two in the 90s.',
          caption: 'Ten scores in classes of ten: 1, 2, 3, 2 and 2, peaking in the 70s.',
          x: [45, 105],
          y: [0, 4],
          xLabel: 'score',
          yLabel: 'count',
          series: [
            { points: [[50, 0], [50, 1], [60, 1], [60, 2], [70, 2], [70, 3], [80, 3], [80, 2], [100, 2], [100, 0]], area: true, colour: colourOf(0) },
            { points: [[60, 0], [60, 1]], colour: colourOf(0) },
            { points: [[70, 0], [70, 2]], colour: colourOf(0) },
            { points: [[80, 0], [80, 2]], colour: colourOf(0) },
            { points: [[90, 0], [90, 2]], colour: colourOf(0) },
          ],
          legend: false,
        },
        r`| Measure | Formula |
|---|---|
| mean, weighted mean | $\bar x = \frac{\sum x}{n}$; $\frac{\sum wx}{\sum w}$ (grades by units) |
| median, mode, midrange | middle value; most frequent; $\frac{\max + \min}{2}$ |
| percentile rank | $\frac{B + 0.5E}{n} \times 100$ ($B$ below, $E$ equal) |
| z-score | $z = \frac{x - \mu}{\sigma}$: how many standard deviations from the mean |
| empirical rule | about 68%, 95% and 99.7% lie within 1, 2 and 3 standard deviations of the mean of a bell-shaped set |

Z-scores compare results from different tests. Regression and correlation for paired data are in Probability & Statistics.`,
      ],
      keyIdeas: [
        r`Centre: mean, median, mode and midrange $\frac{\max + \min}{2}$.`,
        r`Position: percentile rank $\frac{B + 0.5E}{n}\times100$, z-scores, quartiles.`,
        r`Spread: range, standard deviation (roughly $\frac{\text{range}}{4}$), and the normal curve; regression for paired data.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Percentile rank and midrange',
          problem: r`Scores: 55, 60, 62, 70, 70, 75, 80, 85, 90, 95. Find the percentile rank of 70 and the midrange.`,
          steps: [
            r`Below 70: 3; equal: 2. $PR = \frac{3 + 0.5(2)}{10}\times100 = 40$.`,
            r`Midrange $\frac{95 + 55}{2} = 75$.`,
          ],
          answer: r`40; 75.`,
        },
        {
          level: 'board',
          title: 'Two tests, a grade average, the empirical rule',
          problem: r`(a) A student scores 82 on a test with mean 75 and standard deviation 5, and 88 on one with mean 80 and standard deviation 8. Which is better relative to the class? (b) Grades 1.5 (3 units), 2.0 (5 units) and 1.25 (2 units): find the weighted average. (c) Scores are bell-shaped with mean 70 and standard deviation 6. What share lies between 58 and 82?`,
          steps: [
            r`(a) $z_1 = \frac{82 - 75}{5} = 1.4$; $z_2 = \frac{88 - 80}{8} = 1.0$. The first is better.`,
            r`(b) $\frac{1.5(3) + 2.0(5) + 1.25(2)}{10} = \frac{17}{10} = 1.7$.`,
            r`(c) 58 and 82 are 2 standard deviations either side: about 95%.`,
          ],
          answer: r`(a) the first test ($z = 1.4$); (b) 1.7; (c) about 95%.`,
        },
      ],
      traps: [
        r`A percentile rank of 40 means 40% scored below it (counting ties half), not a score of 40%.`,
        r`A higher raw score is not always the better result; compare z-scores.`,
      ],
      check: [
        { q: r`Find the midrange of 12, 18, 25, 31.`, a: r`$\frac{31 + 12}{2} = 21.5$.` },
        { q: r`A score has $z = -1.5$ on a test with mean 60 and standard deviation 4. What is it?`, a: r`$60 - 6 = 54$.` },
      ],
    },
    {
      name: 'Geometric Designs',
      inShort: r`Symmetry, tessellations and patterns built from regular shapes.`,
      body: [
        r`A design has **symmetry** when a motion leaves it unchanged: a rotation, a reflection or a translation. A regular $n$-gon has $n$ rotations (by multiples of $\frac{360^\circ}{n}$) and $n$ mirror lines, $2n$ symmetries in all.

A **tessellation** covers the plane with no gaps or overlaps. Around each vertex the angles must add to $360^\circ$, and a regular $n$-gon's interior angle is $\frac{(n - 2)180^\circ}{n}$. Alone, only triangles ($60^\circ$), squares ($90^\circ$) and hexagons ($120^\circ$) tile. Mixing regular polygons gives the **semi-regular** tilings, named by the polygons round a vertex; 4.8.8 is a square and two octagons:`,
        {
          type: 'plot',
          equal: true,
          alt: 'Four regular octagons of side 1 meeting edge to edge, with the square gap between them outlined dashed: at every vertex one square and two octagons meet, the 4.8.8 tiling.',
          caption: 'The 4.8.8 tiling: octagons (solid) leave square gaps (dashed); 90° + 135° + 135° = 360° at every vertex.',
          x: [0, 5],
          y: [0, 5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            ...[[0, 0], [OCT_STEP, 0], [0, OCT_STEP], [OCT_STEP, OCT_STEP]].map(([cx, cy]) => ({ points: octagon(cx + 1.3, cy + 1.3), colour: colourOf(0) })),
            { points: GAP.map(([x, y]) => [x + 1.3, y + 1.3]), dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`| Polygon | Interior angle | Tiles alone? |
|---|---|---|
| triangle | $60^\circ$ | yes (6 at a vertex) |
| square | $90^\circ$ | yes (4) |
| pentagon | $108^\circ$ | no |
| hexagon | $120^\circ$ | yes (3) |
| octagon | $135^\circ$ | no; with a square, 4.8.8 |
| dodecagon | $150^\circ$ | no; with a triangle, 3.12.12 |`,
      ],
      keyIdeas: [
        r`A regular $n$-gon has $n$ rotations (by $\frac{360^\circ}{n}$) and $n$ mirror lines.`,
        r`One regular polygon tiles alone only if its angle divides $360^\circ$: triangles, squares, hexagons.`,
        r`Mixed regular polygons tile when the angles at each vertex add to $360^\circ$ (3.6.3.6, 4.8.8, 3.12.12).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Octagons alone and with squares',
          problem: r`Can regular octagons tile the plane alone? With squares?`,
          steps: [
            r`An octagon's angle is $135^\circ$, and $\frac{360}{135} = 2.67$: not a whole number, so no.`,
            r`Two octagons and a square: $135^\circ + 135^\circ + 90^\circ = 360^\circ$: yes, the 4.8.8 tiling.`,
          ],
          answer: r`No alone; yes with squares.`,
        },
        {
          level: 'board',
          title: 'Dodecagons, pentagons, symmetries',
          problem: r`(a) Show that a triangle and two regular dodecagons fit round a vertex. (b) Can regular pentagons tile alone? (c) How many symmetries has a regular pentagon? (d) Does 3.3.4.3.4 close up?`,
          steps: [
            r`(a) $\frac{10 \times 180^\circ}{12} = 150^\circ$; $60^\circ + 150^\circ + 150^\circ = 360^\circ$: yes, 3.12.12.`,
            r`(b) $108^\circ$, and $\frac{360}{108} = 3.33$: no.`,
            r`(c) 5 rotations and 5 reflections: 10.`,
            r`(d) $3(60^\circ) + 2(90^\circ) = 360^\circ$: yes.`,
          ],
          answer: r`(a) yes; (b) no; (c) 10; (d) yes.`,
        },
      ],
      traps: [
        r`Use the INTERIOR angle $\frac{(n - 2)180^\circ}{n}$, not the exterior.`,
        r`Angles adding to $360^\circ$ at one vertex is needed, but the whole plane must work too: some vertex types can't be repeated everywhere.`,
      ],
      check: [
        { q: r`How many lines of symmetry has a regular hexagon?`, a: r`6.` },
        { q: r`What is the interior angle of a regular 9-gon?`, a: r`$\frac{7 \times 180^\circ}{9} = 140^\circ$.` },
      ],
    },
    {
      name: 'Codes',
      inShort: r`Numbers that catch errors (check digits, parity) and hide messages (ciphers).`,
      body: [
        r`**Check digits** catch typing errors: a weighted sum of the digits must be a multiple of a fixed number, so a wrong or swapped digit usually breaks it.

| Code | Rule |
|---|---|
| ISBN-10 | $10d_1 + 9d_2 + \cdots + 2d_9 + 1d_{10} \equiv 0 \pmod{11}$; a check digit of 10 is written X |
| ISBN-13, EAN | weights 1, 3, 1, 3, … $\equiv 0 \pmod{10}$ |
| UPC-A | weights 3, 1, 3, 1, … on the first 11 digits; the check digit makes the total a multiple of 10 |
| parity bit | an extra bit makes the number of 1s even: catches any single flipped bit |
| Hamming distance | a code whose words differ in at least $d$ places detects $d - 1$ errors and corrects $\left\lfloor\frac{d - 1}{2}\right\rfloor$ |

**Ciphers** hide a message. Number the letters A = 0 to Z = 25. A **Caesar** cipher shifts: $C = (P + k) \bmod 26$. An **affine** cipher $C = (aP + b) \bmod 26$ needs $\gcd(a, 26) = 1$, so that $a$ has an inverse to decode with: $P = a^{-1}(C - b) \bmod 26$.`,
      ],
      keyIdeas: [
        r`ISBN-10: $10d_1 + 9d_2 + \cdots + 1d_{10} \equiv 0 \pmod{11}$; ISBN-13 weights 1, 3 mod 10; UPC-A weights 3, 1 mod 10.`,
        r`Caesar: $C = (P + k) \bmod 26$. Affine: $C = (aP + b) \bmod 26$, needing $\gcd(a, 26) = 1$.`,
        r`Parity bits detect one error; a code with minimum distance $d$ corrects $\lfloor\frac{d - 1}{2}\rfloor$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An ISBN and a Caesar shift',
          problem: r`Find the check digit of ISBN 0-306-40615-?. Encode HELLO with a Caesar shift of 3.`,
          steps: [
            r`$10(0) + 9(3) + 8(0) + 7(6) + 6(4) + 5(0) + 4(6) + 3(1) + 2(5) = 130$, and $130 \equiv 9 \pmod{11}$, so the check digit is 2 ($132 = 12 \times 11$).`,
            r`Shift each letter 3 on: HELLO becomes KHOOR.`,
          ],
          answer: r`2; KHOOR.`,
        },
        {
          level: 'board',
          title: 'A barcode, a book, an affine cipher',
          problem: r`(a) Find the check digit of UPC 7-51234-56789-?. (b) Find the check digit of ISBN 978-971-23-4567-?. (c) Encode MATH with $C = (5P + 8) \bmod 26$, and give the decoding multiplier.`,
          steps: [
            r`(a) Odd places $7 + 1 + 3 + 5 + 7 + 9 = 32$, times 3 is 96; even places $5 + 2 + 4 + 6 + 8 = 25$. $96 + 25 = 121$, so the check digit is 9.`,
            r`(b) $9 + 3(7) + 8 + 3(9) + 7 + 3(1) + 2 + 3(3) + 4 + 3(5) + 6 + 3(7) = 132$, so the check digit is 8.`,
            r`(c) M = 12: $68 \bmod 26 = 16$ (Q); A = 0: 8 (I); T = 19: $103 \bmod 26 = 25$ (Z); H = 7: $43 \bmod 26 = 17$ (R). Since $5 \times 21 = 105 = 4 \times 26 + 1$, decode with $21(C - 8) \bmod 26$.`,
          ],
          answer: r`(a) 9; (b) 8; (c) QIZR, decoding multiplier 21.`,
        },
      ],
      traps: [
        r`An ISBN-10 check digit of 10 is written X.`,
        r`UPC weights start with 3 on the FIRST digit; ISBN-13 starts with 1.`,
      ],
      check: [
        { q: r`Decode WKH with a Caesar shift of 3.`, a: r`THE.` },
        { q: r`Can $C = (4P + 1) \bmod 26$ be decoded?`, a: r`No: $\gcd(4, 26) = 2$, so 4 has no inverse.` },
      ],
    },
    {
      name: 'Linear Programming',
      inShort: r`Choosing the best plan when resources are limited.`,
      body: [
        r`A **linear program** makes a linear objective as large (or small) as possible while the variables meet linear constraints. With two variables, graph the constraints: the points meeting all of them form the **feasible region**, and the best value lies at one of its corners. Sliding the **isoprofit line** $c_1x + c_2y = z$ outward shows which:`,
        {
          type: 'plot',
          alt: 'The feasible region for x at most 4, 2y at most 12 and 3x plus 2y at most 18, shaded with corners at 0 comma 0, 4 comma 0, 4 comma 3, 2 comma 6 and 0 comma 6. A dashed isoprofit line 3x plus 5y equals 36 just touches the region at the corner 2 comma 6, which is marked.',
          caption: 'The basic example: the feasible region (shaded) and the isoprofit line 3x + 5y = 36 (dashed), touching only at the corner (2, 6).',
          x: [0, 7],
          y: [0, 10],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: [[0, 6], [2, 6], [4, 3], [4, 0]], area: true, colour: colourOf(0) },
            { points: [[0, 9], [6, 0]], colour: colourOf(2) },
            { f: (x) => (36 - 3 * x) / 5, dashed: true, colour: colourOf(1) },
          ],
          marks: [{ at: [2, 6] }],
          legend: false,
        },
        r`**Steps**: name the variables; write the objective and every constraint, including $x, y \ge 0$; find each corner by solving two boundary lines together; check the corner meets every other constraint; evaluate the objective at each corner.

**Slack** $s_i = b_i - (a_{i1}x + a_{i2}y)$ is the unused part of a resource; a **binding** constraint has none at the optimum. A minimising problem with $\ge$ constraints has an open region, still with its best value at a corner.`,
      ],
      keyIdeas: [
        r`Write the objective $z = c_1x + c_2y$ and the constraints; graph the feasible region.`,
        r`The optimum is at a corner (Numerical Methods' corner-point rule); the isoprofit line has slope $-\frac{c_1}{c_2}$.`,
        r`Slack $s_i = b_i - (a_{i1}x + a_{i2}y)$ is the unused resource; binding constraints have none.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Five corners',
          problem: r`Maximise $z = 3x + 5y$ with $x \le 4$, $2y \le 12$, $3x + 2y \le 18$, $x, y \ge 0$.`,
          steps: [
            r`Corners: $(0, 0) \to 0$, $(4, 0) \to 12$, $(4, 3) \to 27$, $(2, 6) \to 36$, $(0, 6) \to 30$.`,
            r`The best is $z = 36$ at $(2, 6)$, with slacks 2, 0 and 0.`,
          ],
          answer: r`$z = 36$ at $(2, 6)$.`,
        },
        {
          level: 'board',
          title: 'The cheapest mix',
          problem: r`Feed X costs ₱40 a kilo and feed Y ₱30. A ration needs at least 6 units of protein and 8 of energy. A kilo of X gives 1 unit of protein and 2 of energy; a kilo of Y gives 1 of each. Find the cheapest ration.`,
          steps: [
            r`Minimise $z = 40x + 30y$ with $x + y \ge 6$, $2x + y \ge 8$, $x, y \ge 0$.`,
            r`Corners of the open region: $(0, 8)$; where $x + y = 6$ meets $2x + y = 8$, $(2, 4)$; and $(6, 0)$.`,
            r`$z = 240$, $200$, $240$: the cheapest is ₱200, with 2 kg of X and 4 kg of Y.`,
          ],
          answer: r`₱200 at $x = 2$, $y = 4$.`,
        },
      ],
      traps: [
        r`Check every corner is feasible: an intersection of two lines may break a third constraint.`,
        r`Don't forget the axes: $x \ge 0$ and $y \ge 0$ are constraints too.`,
      ],
      check: [
        { q: r`Where does a linear objective reach its best value on a bounded region?`, a: r`At a corner of the feasible region.` },
        { q: r`At $(2, 6)$ in the basic example, what is the slack of $x \le 4$?`, a: r`2.` },
      ],
    },
    {
      name: 'Mathematics of Finance',
      inShort: r`Interest, annuities and loans.`,
      body: [
        r`Money grows with interest, so a peso today is worth more than a peso later. Simple and compound interest are in Algebra; here the payments repeat.

| Quantity | Formula |
|---|---|
| effective rate | $\left(1 + \frac rm\right)^m - 1$ for $r$ compounded $m$ times a year |
| present value | $P = F(1 + i)^{-n}$ |
| ordinary annuity | $F = A\frac{(1 + i)^n - 1}{i}$, $P = A\frac{1 - (1 + i)^{-n}}{i}$ |
| annuity due | the ordinary values times $(1 + i)$ |
| perpetuity | $P = \frac Ai$ |
| loan payment | $A = \frac{Pi}{1 - (1 + i)^{-n}}$ |

Here $i$ is the rate per period and $n$ the number of periods. In an **amortised** loan, each payment covers the month's interest first and the rest repays principal. Early payments are mostly interest, so the balance falls slowly at first:`,
        {
          type: 'plot',
          alt: 'The balance of a 500,000 peso loan at 8 percent compounded monthly over its 60 monthly payments. It curves down from 500 thousand to zero, staying above a dashed straight line, and is still about 275 thousand at month 30.',
          caption: 'Balance of the ₱500,000 loan, in thousands, over 60 payments: it falls slower than a straight line (dashed) and is still ₱274,835 halfway, at month 30.',
          x: [0, 60],
          y: [0, 550],
          xLabel: 'month',
          yLabel: '₱ thousand',
          series: [
            { f: (k) => balance(k) / 1000, colour: colourOf(0) },
            { points: [[0, 500], [60, 0]], dashed: true, colour: colourOf(1) },
          ],
          marks: [{ at: [30, balance(30) / 1000] }],
          legend: false,
        },
        r`The balance at any time is the present value of the payments still to come.`,
      ],
      keyIdeas: [
        r`Simple and compound interest are in Algebra; effective rate $\left(1 + \frac rm\right)^m - 1$; present value $F(1 + i)^{-n}$.`,
        r`Ordinary annuity: $F = A\frac{(1 + i)^n - 1}{i}$, $P = A\frac{1 - (1 + i)^{-n}}{i}$; annuity due $\times(1 + i)$; perpetuity $\frac Ai$.`,
        r`Loan payment $A = \frac{Pi}{1 - (1 + i)^{-n}}$; the balance is the present value of the payments left.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A five-year loan',
          problem: r`A ₱500,000 loan at 8% compounded monthly is paid monthly for 5 years. Find the payment, the first month's interest, and the total interest.`,
          steps: [
            r`$i = \frac{0.08}{12}$, $n = 60$: $A = \frac{500{,}000\,i}{1 - (1 + i)^{-60}} = ₱10{,}138.20$.`,
            r`First month's interest: $500{,}000 \times \frac{0.08}{12} = ₱3{,}333.33$, so ₱6,804.86 of the first payment repays principal.`,
            r`Total interest: $60(10{,}138.20) - 500{,}000 = ₱108{,}291.83$.`,
          ],
          answer: r`₱10,138.20; ₱3,333.33; ₱108,291.83.`,
        },
        {
          level: 'board',
          title: 'A rate, a savings plan, a balance, a perpetuity',
          problem: r`(a) Find the effective rate of 12% compounded quarterly. (b) ₱2,000 is saved at the end of every month for 10 years at 6% compounded monthly. How much is there? (c) What is still owed on the basic example's loan after 3 years? (d) What fund pays ₱50,000 a year forever at 5%?`,
          steps: [
            r`(a) $1.03^4 - 1 = 12.55\%$.`,
            r`(b) $i = 0.005$, $n = 120$: $F = 2000\,\frac{1.005^{120} - 1}{0.005} = ₱327{,}758.69$.`,
            r`(c) 24 payments are left: $10{,}138.20\,\frac{1 - (1 + i)^{-24}}{i} = ₱224{,}161.11$ with $i = \frac{0.08}{12}$.`,
            r`(d) $\frac{50{,}000}{0.05} = ₱1{,}000{,}000$.`,
          ],
          answer: r`(a) 12.55%; (b) ₱327,758.69; (c) ₱224,161.11; (d) ₱1,000,000.`,
        },
      ],
      traps: [
        r`Match the rate to the period: a monthly payment needs the monthly rate and the number of months.`,
        r`An annuity due pays at the START of each period: multiply by $(1 + i)$.`,
      ],
      check: [
        { q: r`What is the effective rate of 6% compounded semi-annually?`, a: r`$1.03^2 - 1 = 6.09\%$.` },
        { q: r`What fund pays ₱12,000 a year forever at 4%?`, a: r`₱300,000.` },
      ],
    },
    {
      name: 'Apportionment and Voting',
      inShort: r`Sharing seats fairly, and the ways a winner can be chosen.`,
      body: [
        r`**Apportionment** shares a whole number of seats in proportion to population. The **standard divisor** is $d = \frac{\text{total population}}{\text{seats}}$ and each state's **quota** is $q = \frac pd$; the methods differ in how they round:

| Method | Rule |
|---|---|
| Hamilton | give each state its lower quota, then the leftover seats to the largest decimal parts |
| Jefferson | round every quota down, with a divisor adjusted until the seats add up |
| Webster | round normally, with an adjusted divisor |
| Huntington-Hill | round at the geometric mean $\sqrt{n(n + 1)}$, with an adjusted divisor |

Hamilton can show paradoxes: adding a seat can cost a state one (the **Alabama paradox**).

**Voting** turns ranked ballots into a winner, and the methods can disagree:

| Method | Winner |
|---|---|
| plurality | the most first places |
| majority | more than half the first places, if anyone has it |
| plurality with elimination | drop the last, move its ballots on, repeat |
| Borda count | with $n$ candidates, $n - 1$ points for first, $n - 2$ for second, … |
| pairwise comparison | each head-to-head win is a point; $C(n, 2)$ contests |

A **Condorcet** candidate beats every other head to head; plurality can miss one.`,
      ],
      keyIdeas: [
        r`Standard divisor $d = \frac{\text{population}}{\text{seats}}$, quota $q = \frac pd$. Hamilton: lower quotas, then largest remainders.`,
        r`Jefferson rounds down, Webster rounds normally, Huntington-Hill rounds at $\sqrt{n(n + 1)}$, each with a modified divisor.`,
        r`Plurality, majority ($> \frac V2$), Borda count, pairwise comparisons ($C(n, 2)$ contests); each can pick a different winner.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Hamilton's method",
          problem: r`21 seats for states of 5,300, 2,650, 1,830 and 720. Apportion by Hamilton's method.`,
          steps: [
            r`$d = \frac{10{,}500}{21} = 500$; quotas 10.6, 5.3, 3.66, 1.44. Lower quotas give 19 seats.`,
            r`The two extra seats go to the largest remainders, 0.66 and 0.6: 11, 5, 4, 1. (Jefferson with $d' = 457.5$ and Webster with $d = 500$ give the same here.)`,
          ],
          answer: r`11, 5, 4, 1.`,
        },
        {
          level: 'board',
          title: 'One election, four counts',
          problem: r`21 voters rank three candidates: 8 vote A > B > C, 7 vote B > C > A, and 6 vote C > B > A. Find the winner by plurality, plurality with elimination, Borda count (2, 1, 0) and pairwise comparison.`,
          steps: [
            r`Plurality: A 8, B 7, C 6. A wins, without a majority (11 needed).`,
            r`Elimination: drop C; its 6 ballots go to B. B 13, A 8: B wins.`,
            r`Borda: A $8(2) = 16$; B $8(1) + 7(2) + 6(1) = 28$; C $7(1) + 6(2) = 19$. B wins.`,
            r`Pairwise: B beats A 13 to 8, B beats C 15 to 6, C beats A 13 to 8. B wins both contests: a Condorcet winner that plurality missed.`,
          ],
          answer: r`Plurality A; the other three B.`,
        },
      ],
      traps: [
        r`Hamilton can show the Alabama paradox: adding a seat can cost a state one.`,
        r`A plurality is not a majority: a majority needs more than half the votes.`,
      ],
      check: [
        { q: r`How many head-to-head contests among 5 candidates?`, a: r`$C(5, 2) = 10$.` },
        { q: r`A state's quota is 4.48. Where does Huntington-Hill round?`, a: r`At $\sqrt{4 \times 5} = 4.47$, so up to 5.` },
      ],
    },
    {
      name: 'Graph Theory',
      inShort: r`Networks of points and lines: routes, circuits and trees.`,
      body: [
        r`A **graph** is a set of vertices joined by edges: towns and roads, computers and cables. The **degree** of a vertex counts its edges, and the degrees add to twice the number of edges. Euler settled when a walk can use every edge exactly once:

| Graph | Euler walk |
|---|---|
| connected, every degree even | an Euler circuit (ends where it started) |
| connected, exactly two odd degrees | an Euler path from one odd vertex to the other |
| more than two odd degrees | neither |

The house below has two odd vertices, the top corners, so it can be drawn without lifting the pen only by starting at one top corner and finishing at the other:`,
        {
          type: 'plot',
          equal: true,
          alt: 'A graph shaped like a house: a square with a triangular roof. The two top corners have degree 3, the bottom corners and the roof peak degree 2.',
          caption: 'The house graph: the top corners have degree 3, the other three vertices 2. Euler path: top left, peak, top right, top left, bottom left, bottom right, top right.',
          x: [-0.6, 2.6],
          y: [-0.4, 3.6],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            ...HOUSE.e.map(([a, b]) => ({ points: [HOUSE.v[a], HOUSE.v[b]], colour: colourOf(0) })),
            ...Object.values(HOUSE.v).map((p) => ({ points: dot(p), colour: colourOf(1) })),
          ],
          legend: false,
        },
        r`A **Hamilton circuit** visits every VERTEX once and returns. The complete graph $K_n$ has $\frac{n(n - 1)}{2}$ edges and $\frac{(n - 1)!}{2}$ Hamilton circuits, too many to try one by one, so the nearest-neighbour rule gives a quick (not always best) route.

A **tree** is connected with no circuits: $n$ vertices and $n - 1$ edges. **Kruskal's algorithm** builds the cheapest spanning tree by taking the shortest edges in turn, skipping any that would close a circuit. A **planar** graph, drawn with no crossings, has $V - E + F = 2$.`,
      ],
      keyIdeas: [
        r`Degrees add to $2|E|$. Euler circuit: connected, all degrees even; Euler path: exactly two odd.`,
        r`$K_n$ has $\frac{n(n - 1)}{2}$ edges and $\frac{(n - 1)!}{2}$ Hamilton circuits.`,
        r`Trees have $n - 1$ edges ($n^{n - 2}$ spanning trees of $K_n$); planar graphs have $V - E + F = 2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Königsberg and K₆',
          problem: r`Königsberg's land areas have degrees 3, 3, 3 and 5. Is there a walk crossing every bridge once? How many Hamilton circuits does $K_6$ have?`,
          steps: [
            r`Four odd vertices, more than two: no Euler path or circuit.`,
            r`$K_6$: $\frac{5!}{2} = 60$ circuits (counting a circuit and its reverse once).`,
          ],
          answer: r`No; 60.`,
        },
        {
          level: 'board',
          title: 'Edges, circuits, faces and the cheapest tree',
          problem: r`(a) A graph has degrees 4, 3, 3, 2, 2. How many edges, and is there an Euler path? (b) How many edges and Hamilton circuits has $K_5$? (c) A planar graph has 8 vertices and 12 edges. How many faces? (d) Edges AB 4, AC 2, AD 7, BC 5, BD 3, CD 6: find the cheapest spanning tree.`,
          steps: [
            r`(a) $\frac{4 + 3 + 3 + 2 + 2}{2} = 7$ edges. Two odd vertices: an Euler path from one degree-3 vertex to the other (if connected).`,
            r`(b) $\frac{5 \times 4}{2} = 10$ edges; $\frac{4!}{2} = 12$ circuits.`,
            r`(c) $F = 2 - 8 + 12 = 6$ (a cube).`,
            r`(d) Kruskal: AC 2, BD 3, AB 4 (joining the two pieces); BC 5 would close a circuit. Total $2 + 3 + 4 = 9$.`,
          ],
          answer: r`(a) 7, yes; (b) 10 and 12; (c) 6; (d) AC, BD, AB, total 9.`,
        },
      ],
      traps: [
        r`Euler is about EDGES (each once); Hamilton is about VERTICES (each once).`,
        r`Count a circuit and its reverse once: $\frac{(n - 1)!}{2}$, not $(n - 1)!$.`,
      ],
      check: [
        { q: r`How many edges has a tree with 15 vertices?`, a: r`14.` },
        { q: r`How many spanning trees has $K_4$?`, a: r`$4^2 = 16$.` },
      ],
    },
  ],
};
