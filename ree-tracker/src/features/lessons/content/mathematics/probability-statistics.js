// Library › Lessons › Mathematics › Probability & Statistics (2026-11-17; every
// subtopic in the module format 2026-11-27, with figures, examples a step at a
// time and checks; every number re-worked by probabilityStatisticsLesson.test.js.
// Coverage cross-checked against two review centers' probability and
// statistics handouts; the text, problems and figures are this app's own):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
export const choose = (n, k) => fact(n) / (fact(k) * fact(n - k));
export const normalPdf = (x, mu, sigma) => Math.exp(-(((x - mu) / sigma) ** 2) / 2) / (sigma * Math.sqrt(2 * Math.PI));
// A right-skewed density (gamma, shape 2, scale 2): mode 2, median 3.357, mean 4.
export const skewPdf = (x) => (x <= 0 ? 0 : (x * Math.exp(-x / 2)) / 4);
const circle = (R, cx = 0, cy = 0, n = 120) => range(0, 2 * Math.PI, n).map((t) => [cx + R * Math.cos(t), cy + R * Math.sin(t)]);
// A probability as a stem from the axis.
const stem = (x, p, colour, dashed = false) => ({ points: [[x, 0], [x, p]], colour: colourOf(colour), dashed });

export default {
  topic: 'Probability & Statistics',
  subject: 'Mathematics',
  overview: r`Counting comes first: most probability questions on the board are "favourable over total", and the hard part is counting both correctly. Then come the rules for combining events (or, and, given), expectation, the standard distributions (binomial, Poisson, normal), and the numbers that describe a data set: where it is centred and how spread out. Decide early whether order matters, whether items are replaced, and whether events can happen together; most wrong answers come from one of those three.`,
  sources: [
    'Probability and Statistics for Engineers and Scientists (Walpole, Myers, Myers and Ye)',
    'Schaum’s Outline of Probability and Statistics (Spiegel, Schiller and Srinivasan)',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Fundamental Counting Principle',
      inShort: r`Choices made one after another multiply; separate cases add.`,
      body: [
        r`If one choice can be made in $m$ ways and, after it, a second in $n$ ways, the two together can be made in $mn$ ways. Extended to $k$ stages, the **multiplication principle** is $N = n_1 \times n_2 \times \cdots \times n_k$. Cases that cannot happen together are counted separately and **added**.

| Situation | Count |
|---|---|
| $r$ positions, $n$ symbols, repetition allowed | $n^r$ (a true-false test of $r$ items: $2^r$) |
| $r$ positions, $n$ symbols, no repetition | $n(n - 1)\cdots(n - r + 1)$ |
| independent stages | multiply |
| cases that exclude each other | add |

Fill the most restricted position first (a first digit that cannot be 0, a last digit that must be even), and split into cases when one restriction depends on another.`,
      ],
      keyIdeas: [
        r`Multiplication principle: $N = n_1 \times n_2 \times \cdots \times n_k$.`,
        r`Addition principle: cases that can't happen together add.`,
        r`With repetition allowed, $r$ positions from $n$ symbols give $n^r$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three-digit numbers',
          problem: r`How many 3-digit numbers have distinct digits? How many of those are even?`,
          steps: [
            r`All: $9 \times 9 \times 8 = 648$ (the first digit can't be 0).`,
            r`Even, by cases on the last digit: ending in 0, $9 \times 8 = 72$; ending in 2, 4, 6 or 8, $4 \times 8 \times 8 = 256$ (the first digit can't be 0 or the last digit). Total $72 + 256 = 328$.`,
          ],
          answer: r`648; 328.`,
        },
        {
          level: 'board',
          title: 'Plates, even numbers, a test',
          problem: r`(a) A plate has 3 different letters followed by 3 different digits. How many plates are possible? (b) How many 4-digit even numbers can be made from 0 to 6 with no digit repeated? (c) In how many ways can an 8-item true-false test be answered?`,
          steps: [
            r`(a) $26 \times 25 \times 24 \times 10 \times 9 \times 8 = 11\,232\,000$.`,
            r`(b) Ending in 0: $6 \times 5 \times 4 = 120$. Ending in 2, 4 or 6: the first digit has 5 choices (not 0, not the last), then $5 \times 4$: $3 \times 5 \times 5 \times 4 = 300$. Total 420.`,
            r`(c) $2^8 = 256$.`,
          ],
          answer: r`(a) 11 232 000; (b) 420; (c) 256.`,
        },
      ],
      traps: [
        r`Fill the most restricted position first, and split into cases when one restriction depends on another.`,
        r`"Different digits" forbids repeats; "digits may repeat" uses powers.`,
      ],
      check: [
        { q: r`A house style has 4 floor plans, 3 carports and 5 roofs. How many designs?`, a: r`$4 \times 3 \times 5 = 60$.` },
        { q: r`A hall has 5 doors. In how many ways can you enter and leave by a different door?`, a: r`$5 \times 4 = 20$.` },
      ],
    },
    {
      name: 'Permutations',
      inShort: r`Arrangements, where order matters.`,
      body: [
        r`A **permutation** is an arrangement in a definite order. The number of arrangements of $r$ things chosen from $n$ different things is
$$P(n, r) = \frac{n!}{(n - r)!},$$
and of all $n$ of them, $n!$.

| Situation | Count |
|---|---|
| $n$ things, some alike ($n_1$ of one kind, $n_2$ of another, …) | $\frac{n!}{n_1!\,n_2!\cdots}$ |
| $n$ around a circle | $(n - 1)!$ |
| a necklace or key ring (flip is the same) | $\frac{(n - 1)!}{2}$ |
| $k$ kept together | glue them: $(n - k + 1)!\,k!$ |
| two never together | all minus together: $n! - 2(n - 1)!$ |
| boys and girls alternating in a row ($m$ each) | $2(m!)^2$; around a table, $(m - 1)!\,m!$ |`,
      ],
      keyIdeas: [
        r`$P(n, r) = \frac{n!}{(n - r)!}$; all $n$: $n!$.`,
        r`Repeated items: $\frac{n!}{n_1!\,n_2!\cdots}$. Around a circle: $(n - 1)!$, halved if flipping over is the same (a necklace).`,
        r`Kept together: glue the block, $(n - k + 1)!\,k!$. Never together: all minus together.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A word, and a round table',
          problem: r`How many arrangements of the letters of ENGINEER are there? In how many ways can 6 people sit at a round table, and in how many do two of them sit together?`,
          steps: [
            r`ENGINEER has 8 letters with E three times and N twice: $\frac{8!}{3!\,2!} = 3360$.`,
            r`Round table: $5! = 120$. Together: treat the pair as one, $4!$ around the table, times $2$ for their order: $48$.`,
          ],
          answer: r`3360; 120; 48.`,
        },
        {
          level: 'board',
          title: 'A word, alternating seats, a pair apart, a necklace',
          problem: r`(a) How many arrangements has STATISTICS? (b) In how many ways can 4 boys and 4 girls sit alternately in a row, and around a round table? (c) In how many ways can 7 people line up if two of them must not stand together? (d) How many necklaces can 10 different beads make?`,
          steps: [
            r`(a) 10 letters, S three times, T three times, I twice: $\frac{10!}{3!\,3!\,2!} = 50\,400$.`,
            r`(b) Row: boys first or girls first, $2 \times 4! \times 4! = 1152$. Table: seat the boys, $3!$, then the girls in the gaps, $4!$: $144$.`,
            r`(c) $7! - 2 \times 6! = 5040 - 1440 = 3600$.`,
            r`(d) $\frac{9!}{2} = 181\,440$.`,
          ],
          answer: r`(a) 50 400; (b) 1152 and 144; (c) 3600; (d) 181 440.`,
        },
      ],
      traps: [
        r`Divide by the repeats' factorials only for identical items, never for different people.`,
        r`Around a table, fix one person first: $(n - 1)!$, not $n!$.`,
      ],
      check: [
        { q: r`How many 3-letter arrangements can be made from the letters of PLANET?`, a: r`$P(6, 3) = 120$.` },
        { q: r`In how many ways can 8 people sit at a round table?`, a: r`$7! = 5040$.` },
      ],
    },
    {
      name: 'Combinations',
      inShort: r`Selections, where order doesn't matter.`,
      body: [
        r`A **combination** is a selection without regard to order: a committee, a hand of cards, a set of questions. From $n$ things, choose $r$:
$$C(n, r) = \binom nr = \frac{n!}{r!\,(n - r)!}, \qquad C(n, r) = C(n, n - r).$$
The same numbers are the **binomial coefficients**: the $(r + 1)$th term of $(x + y)^n$ is $C(n, r)x^{n-r}y^r$, and they peak in the middle:`,
        {
          type: 'plot',
          alt: 'Stems of height C of 10 comma r for r from 0 to 10: 1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1, symmetric about r equals 5 where they peak at 252.',
          caption: 'C(10, r) for r = 0 to 10: symmetric, peaking at C(10, 5) = 252, and adding to 2¹⁰ = 1024.',
          x: [-0.5, 10.5],
          y: [0, 280],
          xLabel: 'r',
          yLabel: 'C(10, r)',
          series: range(0, 10, 10).map((k) => stem(k, choose(10, k), 0)),
          legend: false,
        },
        r`| Situation | Count |
|---|---|
| at least one of $n$ items | $2^n - 1$ |
| lines through $n$ points (no three in a line); handshakes among $n$ | $C(n, 2)$ |
| triangles from $n$ points | $C(n, 3)$ |
| diagonals of an $n$-gon | $C(n, 2) - n$ |
| sum of the coefficients of $(ax + by)^n$ | $(a + b)^n$: put $x = y = 1$ |
| "at least" conditions | add the cases, or all minus the unwanted |`,
      ],
      keyIdeas: [
        r`$C(n, r) = \frac{n!}{r!\,(n - r)!}$; a committee is a combination, a line-up a permutation.`,
        r`The $(r + 1)$th term of $(x + y)^n$ is $C(n, r)x^{n-r}y^r$; the coefficients add to $2^n$.`,
        r`$n$ points give $C(n, 2)$ lines and $C(n, 3)$ triangles; at least one of $n$: $2^n - 1$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A committee',
          problem: r`A committee of 3 men and 2 women is chosen from 6 men and 5 women. How many committees are possible?`,
          steps: [
            r`The two choices are independent: $C(6, 3) \times C(5, 2)$.`,
            r`$= 20 \times 10 = 200$.`,
          ],
          answer: r`200.`,
        },
        {
          level: 'board',
          title: '"At least", a binomial term, coefficients, diagonals',
          problem: r`(a) A committee of 5 is chosen from 7 men and 6 women with at least 3 women. How many? (b) Find the 5th term of $(2x - y)^7$. (c) Find the sum of the coefficients of $(2x - 3y)^5$. (d) How many diagonals has a decagon?`,
          steps: [
            r`(a) 3, 4 or 5 women: $C(6, 3)C(7, 2) + C(6, 4)C(7, 1) + C(6, 5) = 420 + 105 + 6 = 531$.`,
            r`(b) $r = 4$: $C(7, 4)(2x)^3(-y)^4 = 35 \times 8x^3y^4 = 280x^3y^4$.`,
            r`(c) Put $x = y = 1$: $(2 - 3)^5 = -1$.`,
            r`(d) $C(10, 2) - 10 = 35$.`,
          ],
          answer: r`(a) 531; (b) $280x^3y^4$; (c) $-1$; (d) 35.`,
        },
      ],
      traps: [
        r`"At least one woman" is easiest as all committees minus the all-men ones.`,
        r`The 5th term has $r = 4$: the count starts at $r = 0$.`,
      ],
      check: [
        { q: r`How many triangles can be made from 9 points, no three in a line?`, a: r`$C(9, 3) = 84$.` },
        { q: r`In how many ways can you choose one or more of 7 toppings?`, a: r`$2^7 - 1 = 127$.` },
      ],
    },
    {
      name: 'Probability Basics',
      inShort: r`The chance of an event: favourable outcomes over all equally likely outcomes.`,
      body: [
        r`When all outcomes are equally likely, the **probability** of an event is
$$P(E) = \frac{n(E)}{n(S)} = \frac{\text{favourable outcomes}}{\text{all outcomes}}, \qquad 0 \le P(E) \le 1, \qquad P(E') = 1 - P(E).$$
Counting both numbers is the work, with the tools of the last three subtopics. From experiments, the relative frequency $\frac fn$ estimates $P$. When the outcomes are points of a region, **geometric probability** compares lengths, areas or volumes:`,
        {
          type: 'plot',
          equal: true,
          alt: 'A circle of radius 10 with a dashed inner circle of radius 5 at the same centre. A point dropped at random in the big circle lands outside the small one with probability 3 quarters, the ring area over the whole.',
          caption: 'A point at random in a circle of radius 10: it lands more than 5 from the centre (outside the dashed circle) with probability (100 − 25)/100 = 3/4.',
          x: [-11, 11],
          y: [-11, 11],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: circle(10), colour: colourOf(0) },
            { points: circle(5), dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`A **contingency table** sorts outcomes by two traits at once; each cell over the grand total is a probability. For $n$ independent tries of an event with chance $p$, the chance it happens at least once is $1 - (1 - p)^n$.`,
      ],
      keyIdeas: [
        r`$P(E) = \frac{n(E)}{n(S)}$, between 0 and 1; $P(E') = 1 - P(E)$.`,
        r`Geometric probability: favourable length, area or volume over the whole.`,
        r`At least once in $n$ independent tries: $1 - (1 - p)^n$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Dice',
          problem: r`Two dice are thrown. Find the chance of a sum of 9, and the chance of at least one six in four throws of one die.`,
          steps: [
            r`A sum of 9 comes from $(3, 6), (4, 5), (5, 4), (6, 3)$: $\frac{4}{36} = \frac19$.`,
            r`At least one six: $1 - \left(\frac56\right)^4 = 0.5177$.`,
          ],
          answer: r`$\frac19$; about 0.5177.`,
        },
        {
          level: 'board',
          title: 'Dice, a ring, a table, three hearts',
          problem: r`(a) Two dice: find the chance of a sum of at most 4. (b) A point falls at random inside a circle of radius 8. Find the chance it is within 2 of the edge. (c) Of 50 people, 30 are men and 20 women; 12 men and 6 women wear glasses. One is picked: find the chance of a woman without glasses. (d) Three cards are drawn: find the chance all are hearts.`,
          steps: [
            r`(a) $(1, 1), (1, 2), (2, 1), (1, 3), (3, 1), (2, 2)$: $\frac{6}{36} = \frac16$.`,
            r`(b) The ring from 6 to 8: $\frac{64 - 36}{64} = 0.4375$.`,
            r`(c) $20 - 6 = 14$ women without glasses: $\frac{14}{50} = 0.28$.`,
            r`(d) $\frac{C(13, 3)}{C(52, 3)} = \frac{286}{22\,100} = 0.01294$.`,
          ],
          answer: r`(a) $\frac16$; (b) 0.4375; (c) 0.28; (d) about 0.01294.`,
        },
      ],
      traps: [
        r`Two dice have 36 ordered outcomes; $(4, 5)$ and $(5, 4)$ are different.`,
        r`Geometric probability uses areas: half the radius is a quarter of the area.`,
      ],
      check: [
        { q: r`Two cards are drawn. What is the chance both are hearts?`, a: r`$\frac{C(13, 2)}{C(52, 2)} = \frac{78}{1326} = \frac{1}{17}$.` },
        { q: r`What is the chance of at least one head in two tosses?`, a: r`$1 - \frac14 = \frac34$.` },
      ],
    },
    {
      name: 'Mutually Exclusive and Independent Events',
      inShort: r`"Or" adds (minus the overlap); "and" multiplies (by a conditional chance if they affect each other).`,
      body: [
        r`Two events are **mutually exclusive** if they cannot happen together, and **independent** if one happening does not change the other's chance. The rules:

| Combination | Rule |
|---|---|
| $A$ or $B$ | $P(A \cup B) = P(A) + P(B) - P(A \cap B)$; mutually exclusive: just $P(A) + P(B)$ |
| $A$ and $B$, independent | $P(A \cap B) = P(A)P(B)$ |
| $A$ and $B$, dependent | $P(A \cap B) = P(A)P(B \mid A)$ |
| three events, "or" | add the singles, subtract the pairs, add back the triple |
| at least one of independent events | $1 - P(\text{none}) = 1 - \prod(1 - p_i)$ |

A **Venn diagram** shows the overlap that the "or" rule subtracts once, because it was counted in both circles:`,
        {
          type: 'plot',
          equal: true,
          alt: 'Two overlapping circles, a solid one for A on the left and a dashed one for B on the right. The lens where they overlap is the event A and B, counted in both circles.',
          caption: 'A (solid) and B (dashed) overlap in A ∩ B: adding P(A) and P(B) counts the overlap twice, so P(A ∪ B) subtracts it once.',
          x: [-3.5, 3.5],
          y: [-2.2, 2.2],
          xLabel: '',
          yLabel: '',
          series: [
            { points: circle(1.8, -0.9, 0), colour: colourOf(0) },
            { points: circle(1.8, 0.9, 0), dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$P(A \cup B) = P(A) + P(B) - P(A \cap B)$; for mutually exclusive events the overlap is 0.`,
        r`Independent: $P(A \cap B) = P(A)P(B)$. Dependent: $P(A \cap B) = P(A)P(B \mid A)$.`,
        r`Three events: add singles, subtract pairs, add back the triple.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Independent events, and exclusive ones',
          problem: r`$P(A) = 0.6$ and $P(B) = 0.5$, independent. Find $P(A \cup B)$. Then: one card is drawn; find the chance of a king or a queen.`,
          steps: [
            r`$P(A \cap B) = 0.3$, so $P(A \cup B) = 0.6 + 0.5 - 0.3 = 0.8$.`,
            r`King or queen can't both happen: $\frac{4}{52} + \frac{4}{52} = \frac{2}{13}$.`,
          ],
          answer: r`0.8; $\frac{2}{13}$.`,
        },
        {
          level: 'board',
          title: 'Neither, at least one, exactly one, red or face',
          problem: r`(a) Of 80 students, 45 take mathematics, 38 physics and 20 both. One is picked: find the chance of neither. (b) The chances that A and B will be alive in 20 years are 0.8 and 0.7, independently. Find the chance at least one, and exactly one, is alive. (c) One card is drawn: find the chance of a red card or a face card.`,
          steps: [
            r`(a) Either: $45 + 38 - 20 = 63$; neither: $\frac{17}{80} = 0.2125$.`,
            r`(b) At least one: $1 - (0.2)(0.3) = 0.94$. Exactly one: $0.8(0.3) + 0.2(0.7) = 0.38$.`,
            r`(c) $\frac{26}{52} + \frac{12}{52} - \frac{6}{52} = \frac{32}{52} = \frac{8}{13}$.`,
          ],
          answer: r`(a) 0.2125; (b) 0.94 and 0.38; (c) $\frac{8}{13}$.`,
        },
      ],
      traps: [
        r`Mutually exclusive is not independent: if one happens, the other cannot, which is the strongest dependence there is.`,
        r`Without replacement the second draw is dependent: its chance changes after the first.`,
      ],
      check: [
        { q: r`A box has 12 red and 8 blue balls. Two are drawn without replacement. Find the chance of red then blue.`, a: r`$\frac{12}{20} \times \frac{8}{19} = \frac{24}{95} \approx 0.2526$.` },
        { q: r`A wins a game with chance 0.6. Find the chance A wins games 1, 3 and 5 of five and loses the others.`, a: r`$0.6^3 \times 0.4^2 = 0.03456$.` },
      ],
    },
    {
      name: 'Conditional Probability and Bayes',
      inShort: r`Chances once something is known, and turning them around.`,
      body: [
        r`The chance of $A$ **given** that $B$ has happened restricts the sample space to $B$:
$$P(A \mid B) = \frac{P(A \cap B)}{P(B)}.$$
When cases $A_1, A_2, \ldots$ cover every possibility without overlap, the **total probability** of $B$ adds over them, and **Bayes' theorem** turns the condition around:
$$P(B) = \sum_iP(B \mid A_i)P(A_i), \qquad P(A_k \mid B) = \frac{P(B \mid A_k)P(A_k)}{\sum_iP(B \mid A_i)P(A_i)}.$$
A **tree diagram** does both: multiply along each branch, add the branches that end in $B$, and take the share of the one you want. In a contingency table, $P(A \mid B)$ is a cell over its row or column total.

Bayes explains why a positive result for a rare condition is often a false alarm: when the condition is rare, the false positives from the many healthy cases can outnumber the true positives.`,
      ],
      keyIdeas: [
        r`$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$.`,
        r`Total probability: $P(B) = \sum P(B \mid A_i)P(A_i)$ over cases that cover everything.`,
        r`Bayes: $P(A_k \mid B) = \frac{P(B \mid A_k)P(A_k)}{\sum_i P(B \mid A_i)P(A_i)}$. A tree diagram does both.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three machines',
          problem: r`Machines A, B and C make 50%, 30% and 20% of the parts, with 1%, 2% and 3% defective. A part is defective; what is the chance it came from C?`,
          steps: [
            r`$P(\text{def}) = 0.005 + 0.006 + 0.006 = 0.017$.`,
            r`$P(C \mid \text{def}) = \frac{0.006}{0.017} = 0.353$.`,
          ],
          answer: r`About 0.353.`,
        },
        {
          level: 'board',
          title: 'Two bags, and a screening test',
          problem: r`(a) Bag A holds 5 red and 3 white balls, bag B 2 red and 6 white. A bag is chosen at random and a ball drawn; it is red. Find the chance it came from A. (b) A condition affects 2% of people. A test detects 95% of cases but also flags 4% of healthy people. Someone tests positive: find the chance they have the condition.`,
          steps: [
            r`(a) $P(\text{red}) = \frac12 \times \frac58 + \frac12 \times \frac28 = \frac{7}{16}$; $P(A \mid \text{red}) = \frac{5/16}{7/16} = \frac57 = 0.714$.`,
            r`(b) True positives $0.02 \times 0.95 = 0.019$; false positives $0.98 \times 0.04 = 0.0392$.`,
            r`$P = \frac{0.019}{0.019 + 0.0392} = 0.3265$: fewer than one in three positives is real.`,
          ],
          answer: r`(a) $\frac57$; (b) about 0.3265.`,
        },
      ],
      traps: [
        r`$P(A \mid B)$ and $P(B \mid A)$ are different numbers; say in words which is given.`,
        r`The total probability must add over every case, healthy as well as ill.`,
      ],
      check: [
        { q: r`50% saw an ad, 25% tried the product, 18% both. Given someone saw the ad, what is the chance they tried it?`, a: r`$\frac{0.18}{0.50} = 0.36$.` },
        { q: r`A commuter drives (0.6) or takes a jeepney (0.4) and is late 10% or 25% of those days. Given late, what is the chance they drove?`, a: r`$\frac{0.06}{0.06 + 0.10} = 0.375$.` },
      ],
    },
    {
      name: 'Mathematical Expectation',
      inShort: r`The long-run average value of a random quantity.`,
      body: [
        r`A **random variable** takes values $x$ with probabilities $p(x)$ that add to 1. Its **expected value** is the probability-weighted average, the long-run mean of many repetitions:
$$E(X) = \mu = \sum x\,p(x), \qquad \sigma^2 = E(X^2) - [E(X)]^2.$$
For a single fair die every face has $\frac16$, and the mean sits at the balance point:`,
        {
          type: 'plot',
          alt: 'Six equal stems of height one sixth at the faces 1 to 6 of a die, with a dashed vertical line at 3.5, the expected value, in the middle.',
          caption: 'A fair die: each face has 1/6, and the expected value is 3.5 (dashed), a value the die never shows.',
          x: [0, 7],
          y: [0, 0.25],
          xLabel: 'x',
          yLabel: 'p(x)',
          series: range(1, 6, 5).map((k) => stem(k, 1 / 6, 0)),
          marks: [{ x: 3.5 }],
          legend: false,
        },
        r`| Rule | Result |
|---|---|
| linear change | $E(aX + b) = aE(X) + b$, $\operatorname{Var}(aX + b) = a^2\operatorname{Var}(X)$ |
| sum | $E(X + Y) = E(X) + E(Y)$ always |
| a game | expected gain $= \sum(\text{gain})p$, losses negative; **fair** when it is 0 |
| a prize | expectation $= $ prize $\times$ chance of winning it |`,
      ],
      keyIdeas: [
        r`$E(X) = \sum x\,p(x)$; $\sigma^2 = E(X^2) - [E(X)]^2$.`,
        r`$E(aX + b) = aE(X) + b$; $\mathrm{Var}(aX + b) = a^2\mathrm{Var}(X)$.`,
        r`A game is fair when the expected gain is 0.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A fair game, and one die',
          problem: r`You win ₱100 if two dice show doubles and lose ₱20 otherwise. Is the game fair? Also find the variance of one die.`,
          steps: [
            r`$E = 100\left(\frac16\right) - 20\left(\frac56\right) = 16.67 - 16.67 = 0$: fair.`,
            r`One die: $E(X) = 3.5$, $E(X^2) = \frac{91}{6} = 15.167$, so $\sigma^2 = 15.167 - 12.25 = 2.917$.`,
          ],
          answer: r`Fair; 2.917.`,
        },
        {
          level: 'board',
          title: 'A lottery, an unfair game, a distribution',
          problem: r`(a) A lottery sells 2 000 000 tickets for one ₱5 000 000 prize. You hold 50. Find your expectation. (b) You win ₱60 if a die shows 6 and lose ₱15 otherwise. Find the expected gain. (c) $X$ takes 0, 1, 2 with probabilities 0.2, 0.5, 0.3. Find its mean and variance.`,
          steps: [
            r`(a) $\frac{50}{2\,000\,000} \times 5\,000\,000 = ₱125$.`,
            r`(b) $60\left(\frac16\right) - 15\left(\frac56\right) = 10 - 12.5 = -₱2.50$: a losing game.`,
            r`(c) $E = 0.5 + 0.6 = 1.1$; $E(X^2) = 0.5 + 1.2 = 1.7$; $\sigma^2 = 1.7 - 1.21 = 0.49$.`,
          ],
          answer: r`(a) ₱125; (b) $-$₱2.50; (c) 1.1 and 0.49.`,
        },
      ],
      traps: [
        r`Lose amounts are negative; and square the mean, not each value, in $[E(X)]^2$.`,
        r`The probabilities must add to 1; check before computing.`,
      ],
      check: [
        { q: r`You win ₱2 for a 1 to 3 on a die and lose ₱1 otherwise. What is your expectation?`, a: r`$\frac{6}{6} - \frac36 = ₱0.50$.` },
        { q: r`What is $E(2X + 3)$ if $E(X) = 4$?`, a: r`11.` },
      ],
    },
    {
      name: 'Binomial and Poisson',
      inShort: r`Counting successes: a fixed number of trials, or events at a steady rate.`,
      body: [
        r`**Repeated trials**: $n$ independent tries, each a success with chance $p$. The number of successes is **binomial**:
$$P(x) = C(n, x)\,p^x(1 - p)^{n - x}, \qquad \mu = np, \qquad \sigma^2 = np(1 - p).$$
Events that occur at a steady average rate $\lambda$ per interval (calls, faults, defects per metre) follow the **Poisson** distribution, which also approximates the binomial when $n$ is large and $p$ small, with $\lambda = np$:
$$P(x) = \frac{\lambda^xe^{-\lambda}}{x!}, \qquad \mu = \sigma^2 = \lambda.$$`,
        {
          type: 'plot',
          alt: 'Two sets of stems for x from 0 to 9: the binomial with n equals 10 and p equals 0.3, solid, and the Poisson with lambda equals 3, dashed and slightly offset. Both peak near 2 and 3 and have similar shapes.',
          caption: 'Binomial, n = 10 and p = 0.3 (solid), against Poisson, λ = 3 (dashed): the same mean, 3, and similar shapes.',
          x: [-0.5, 9.5],
          y: [0, 0.3],
          xLabel: 'x',
          yLabel: 'P(x)',
          series: [
            ...range(0, 9, 9).map((k) => stem(k - 0.12, choose(10, k) * 0.3 ** k * 0.7 ** (10 - k), 0)),
            ...range(0, 9, 9).map((k) => stem(k + 0.12, (3 ** k * Math.exp(-3)) / fact(k), 1, true)),
          ],
          legend: false,
        },
        r`| Distribution | When | $P(x)$ |
|---|---|---|
| binomial | fixed $n$, with replacement or independent | $C(n, x)p^xq^{n-x}$ |
| hypergeometric | drawing without replacement from $N$ with $K$ successes | $\frac{C(K, x)C(N - K, n - x)}{C(N, n)}$ |
| geometric | first success on try $x$ | $q^{x-1}p$, mean $\frac1p$ |
| Poisson | events at rate $\lambda$ | $\frac{\lambda^xe^{-\lambda}}{x!}$ |

"At least" and "at most" add the terms, or use the complement.`,
      ],
      keyIdeas: [
        r`Binomial: $P(x) = C(n, x)p^x(1 - p)^{n - x}$, $\mu = np$, $\sigma^2 = np(1 - p)$.`,
        r`Poisson: $P(x) = \frac{\lambda^xe^{-\lambda}}{x!}$, $\mu = \sigma^2 = \lambda$; approximates the binomial when $n$ is large and $p$ small ($\lambda = np$).`,
        r`Without replacement: hypergeometric. First success on trial $k$: geometric, mean $\frac1p$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Defectives and calls',
          problem: r`10% of parts are defective. In a sample of 5, find the chance of exactly one defective. Calls arrive at 3 an hour; find the chance of none, and of exactly 2, in an hour.`,
          steps: [
            r`Binomial: $5(0.1)(0.9)^4 = 0.3281$.`,
            r`Poisson with $\lambda = 3$: $P(0) = e^{-3} = 0.0498$, $P(2) = \frac{9}{2}e^{-3} = 0.2240$.`,
          ],
          answer: r`0.3281; 0.0498 and 0.2240.`,
        },
        {
          level: 'board',
          title: 'Exactly, at least, without replacement, at most',
          problem: r`(a) Patients recover with chance 0.8. Of 6, find the chance exactly 4 recover. (b) Find the chance of at least 2 heads in 5 tosses. (c) Of 12 sets, 4 are defective; a buyer takes 3. Find the chance exactly one is defective. (d) Typing errors average 2 a page. Find the chance of at most one on a page.`,
          steps: [
            r`(a) $C(6, 4)(0.8)^4(0.2)^2 = 15(0.4096)(0.04) = 0.2458$.`,
            r`(b) $1 - P(0) - P(1) = 1 - \frac{1 + 5}{32} = \frac{26}{32} = 0.8125$.`,
            r`(c) Hypergeometric: $\frac{C(4, 1)C(8, 2)}{C(12, 3)} = \frac{4 \times 28}{220} = 0.5091$.`,
            r`(d) $e^{-2}(1 + 2) = 0.4060$.`,
          ],
          answer: r`(a) about 0.2458; (b) 0.8125; (c) about 0.5091; (d) about 0.4060.`,
        },
      ],
      traps: [
        r`Scale $\lambda$ to the interval asked: 3 an hour is 6 in two hours.`,
        r`Drawing without replacement from a small lot is hypergeometric, not binomial.`,
      ],
      check: [
        { q: r`Find the variance of the number of failures in 30 trials with failure chance 0.2.`, a: r`$30(0.2)(0.8) = 4.8$.` },
        { q: r`Find the chance of exactly 4 heads in 6 tosses.`, a: r`$\frac{C(6, 4)}{64} = \frac{15}{64}$.` },
      ],
    },
    {
      name: 'Normal Distribution',
      inShort: r`The bell curve: probabilities are areas, found through z-scores.`,
      body: [
        r`A continuous random variable has a **density** $f(x)$: probabilities are areas under it, and the total area is 1. (A uniform density on $[a, b]$ is the rectangle of height $\frac{1}{b - a}$.) The **normal** density is the bell curve with mean $\mu$ and standard deviation $\sigma$. Every normal reduces to the standard one through the **z-score**
$$z = \frac{x - \mu}{\sigma}, \qquad P(a < X < b) = \Phi(z_b) - \Phi(z_a), \qquad \Phi(-z) = 1 - \Phi(z).$$`,
        {
          type: 'plot',
          alt: 'The bell curve of scores with mean 70 and standard deviation 10, from 30 to 110, with the area between 60 and 85 shaded. That area is about 0.7745.',
          caption: 'Scores with μ = 70 and σ = 10: the shaded area between 60 and 85 (z from −1 to 1.5) is 0.7745 of the whole.',
          x: [30, 110],
          y: [0, 0.045],
          xLabel: 'score',
          yLabel: 'f(x)',
          series: [
            { f: (x) => normalPdf(x, 70, 10), colour: colourOf(0) },
            { points: range(60, 85, 50).map((x) => [x, normalPdf(x, 70, 10)]), area: true, colour: colourOf(0) },
          ],
          legend: false,
        },
        r`| Reference | Value |
|---|---|
| within $1\sigma$, $2\sigma$, $3\sigma$ | 68.3%, 95.4%, 99.7% |
| $z$ leaving 10%, 5%, 1% in two tails | 1.645, 1.96, 2.576 |
| $z$ for the top 10%, 5% | 1.2816, 1.645 |
| binomial as normal | when $np$ and $n(1 - p)$ are at least 5; $\mu = np$, $\sigma = \sqrt{np(1 - p)}$, with $\pm0.5$ continuity correction |`,
      ],
      keyIdeas: [
        r`$z = \frac{x - \mu}{\sigma}$; $P(a < X < b) = \Phi(z_b) - \Phi(z_a)$, with $\Phi(-z) = 1 - \Phi(z)$.`,
        r`68%, 95% and 99.7% lie within 1, 2 and 3 standard deviations.`,
        r`$z = 1.645, 1.96, 2.576$ leave 10%, 5%, 1% in the two tails. The binomial is close to normal when $np$ and $n(1 - p)$ are both at least 5 (use $\pm0.5$).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Between two scores',
          problem: r`Scores are normal with $\mu = 70$ and $\sigma = 10$. What share score between 60 and 85?`,
          steps: [
            r`$z = -1$ and $z = 1.5$.`,
            r`$\Phi(1.5) - \Phi(-1) = 0.9332 - 0.1587 = 0.7745$, about 77%.`,
          ],
          answer: r`About 77%.`,
        },
        {
          level: 'board',
          title: 'A tail, a middle band, a cut-off, a uniform density',
          problem: r`Bulb lives are normal with $\mu = 500$ h and $\sigma = 80$ h. Find (a) the share lasting over 620 h, (b) the share between 400 and 600 h, (c) the life that only the best 10% exceed. (d) $X$ is uniform on $[0, 4]$; find $P(1 \le X \le 2.5)$.`,
          steps: [
            r`(a) $z = 1.5$: $1 - 0.9332 = 0.0668$.`,
            r`(b) $z = \pm1.25$: $2(0.8944) - 1 = 0.7887$.`,
            r`(c) $500 + 1.2816(80) = 602.5$ h.`,
            r`(d) Height $\frac14$, width 1.5: $0.375$.`,
          ],
          answer: r`(a) 0.0668; (b) 0.7887; (c) about 602.5 h; (d) 0.375.`,
        },
      ],
      traps: [
        r`Check whether your table gives the area from $-\infty$ or from 0 to $z$.`,
        r`A continuous variable has no area at a single point: $P(X = 600) = 0$, and $<$ or $\le$ gives the same answer.`,
      ],
      check: [
        { q: r`With $\mu = 1200$ and $\sigma = 300$, what share is below 600?`, a: r`$z = -2$: about 2.28%.` },
        { q: r`What share of a normal lies within 2 standard deviations?`, a: r`About 95%.` },
      ],
    },
    {
      name: 'Central Tendency',
      inShort: r`Where the data are centred: mean, median and mode.`,
      body: [
        r`Three numbers locate the centre of data. The **mean** balances them, the **median** splits them in half, and the **mode** is the most frequent value. In a symmetric distribution they coincide; a long tail drags the mean toward it, past the median:`,
        {
          type: 'plot',
          alt: 'A right-skewed density rising quickly to a peak at 2 and trailing off slowly to the right. Dashed lines mark the mode at 2, the median at about 3.36 and the mean at 4, in that order from left to right.',
          caption: 'A right-skewed distribution: mode (2) < median (3.36) < mean (4), all dashed. The long right tail pulls the mean furthest.',
          x: [0, 14],
          y: [0, 0.22],
          xLabel: 'x',
          yLabel: 'f(x)',
          series: [{ f: skewPdf, area: true, colour: colourOf(0) }],
          marks: [{ x: 2 }, { x: 3.357 }, { x: 4 }],
          legend: false,
        },
        r`| Measure | Formula |
|---|---|
| arithmetic mean | $\bar x = \frac{\sum x}{n}$; from a frequency table $\frac{\sum fx}{\sum f}$ |
| weighted mean | $\frac{\sum wx}{\sum w}$ |
| geometric mean | $\sqrt[n]{x_1x_2\cdots x_n}$ (growth rates, ratios) |
| harmonic mean | $\frac{n}{\sum 1/x}$ (average speed over equal distances) |
| median | the middle of the sorted data, position $\frac{n + 1}{2}$; grouped $L + \frac{n/2 - F}{f}c$ |
| mode | most frequent; grouped $L + \frac{d_1}{d_1 + d_2}c$ |
| quartiles | $Q_1$, $Q_2$ (median), $Q_3$ split the sorted data into quarters |

For positive data, harmonic $\le$ geometric $\le$ arithmetic mean.`,
      ],
      keyIdeas: [
        r`Mean $\bar x = \frac{\sum x}{n}$; weighted $\frac{\sum wx}{\sum w}$; frequency table $\frac{\sum fx}{\sum f}$ with class marks.`,
        r`Median: the middle of the sorted data, position $\frac{n + 1}{2}$; grouped $L + \frac{n/2 - F}{f}c$.`,
        r`Geometric mean for ratios, harmonic for average rates; mode, median and mean spread out along a skew.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three centres',
          problem: r`Find the mean, median and mode of 12, 15, 11, 18, 15, 20, 15, 13, 17, 14.`,
          steps: [
            r`Sum 150, so the mean is 15. Sorted: 11, 12, 13, 14, 15, 15, 15, 17, 18, 20; the 5th and 6th are both 15, so the median is 15.`,
            r`The mode is 15. Equal: the data are roughly symmetric.`,
          ],
          answer: r`15, 15, 15.`,
        },
        {
          level: 'board',
          title: 'Frequency, weights, speed, growth, quartiles',
          problem: r`(a) The values 4, 6, 8, 10 occur 2, 5, 3 and 1 times. Find the mean. (b) A final counts three times a quiz. Quizzes 78 and 84, final 90: find the grade. (c) A car covers 30 km at 40 km/h and 30 km at 60 km/h. Find its average speed. (d) Find the geometric mean of 2, 8 and 32. (e) Find the quartiles of 3, 5, 7, 8, 10, 12, 15, 18 (median of each half).`,
          steps: [
            r`(a) $\frac{8 + 30 + 24 + 10}{11} = \frac{72}{11} = 6.545$.`,
            r`(b) $\frac{78 + 84 + 3(90)}{5} = 86.4$.`,
            r`(c) Harmonic: $\frac{2}{1/40 + 1/60} = 48$ km/h, not 50.`,
            r`(d) $\sqrt[3]{512} = 8$.`,
            r`(e) Lower half 3, 5, 7, 8: $Q_1 = 6$. Median $Q_2 = 9$. Upper half 10, 12, 15, 18: $Q_3 = 13.5$.`,
          ],
          answer: r`(a) about 6.545; (b) 86.4; (c) 48 km/h; (d) 8; (e) 6, 9, 13.5.`,
        },
      ],
      traps: [
        r`Two groups' means combine weighted by their sizes, not as a plain average.`,
        r`Average speed over equal distances is the harmonic mean, below the plain average.`,
      ],
      check: [
        { q: r`Find the mean of 3, 5, 7 occurring 4, 3, 3 times.`, a: r`$\frac{12 + 15 + 21}{10} = 4.8$.` },
        { q: r`Classes of 12 and 18 students average 75 and 80. What is the combined mean?`, a: r`$\frac{900 + 1440}{30} = 78$.` },
      ],
    },
    {
      name: 'Dispersion',
      inShort: r`How spread out the data are.`,
      body: [
        r`Two data sets can share a centre and differ completely in spread. The **standard deviation** measures the typical distance from the mean:
$$s = \sqrt{\frac{\sum(x - \bar x)^2}{n - 1}} \ \text{(sample)}, \qquad \sigma = \sqrt{\frac{\sum(x - \mu)^2}{N}} \ \text{(population)}.$$
The variance is its square. A larger $\sigma$ flattens and widens the distribution:`,
        {
          type: 'plot',
          alt: 'Two normal curves with the same mean, 0: a tall narrow one with standard deviation 1 and a low wide dashed one with standard deviation 2. Both enclose the same area.',
          caption: 'The same mean, different spreads: σ = 1 (solid) and σ = 2 (dashed, half as tall, twice as wide, the same area).',
          x: [-7, 7],
          y: [0, 0.45],
          xLabel: 'x',
          yLabel: 'f(x)',
          series: [
            { f: (x) => normalPdf(x, 0, 1), colour: colourOf(0) },
            { f: (x) => normalPdf(x, 0, 2), dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`| Measure | Formula |
|---|---|
| range | largest minus smallest |
| mean absolute deviation | $\frac{\sum|x - \bar x|}{n}$ |
| interquartile range | $Q_3 - Q_1$ (resists outliers) |
| shortcut variance | $s^2 = \frac{\sum x^2 - (\sum x)^2/n}{n - 1}$ |
| coefficient of variation | $\frac{s}{\bar x} \times 100\%$ (spread relative to size) |
| Chebyshev | at least $1 - \frac{1}{k^2}$ of any data lie within $k$ standard deviations |`,
      ],
      keyIdeas: [
        r`Sample $s = \sqrt{\frac{\sum(x - \bar x)^2}{n - 1}}$; population $\sigma$ divides by $N$. Shortcut: $s^2 = \frac{\sum x^2 - (\sum x)^2/n}{n - 1}$.`,
        r`Range, mean absolute deviation, $IQR = Q_3 - Q_1$; coefficient of variation $\frac{s}{\bar x}\times100\%$.`,
        r`Chebyshev: at least $1 - \frac{1}{k^2}$ of ANY data lie within $k$ standard deviations.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Ten values',
          problem: r`For 12, 15, 11, 18, 15, 20, 15, 13, 17, 14 (mean 15), find $s$, $\sigma$ and the coefficient of variation.`,
          steps: [
            r`The squared deviations add to 68.`,
            r`$s = \sqrt{\frac{68}{9}} = 2.749$; $\sigma = \sqrt{\frac{68}{10}} = 2.608$; $CV = \frac{2.749}{15} = 18.3\%$.`,
          ],
          answer: r`2.749, 2.608, 18.3%.`,
        },
        {
          level: 'board',
          title: 'Every measure of spread',
          problem: r`For 4, 7, 9, 10, 15, find the range, mean absolute deviation, sample and population standard deviations, and coefficient of variation. What does Chebyshev promise within 2 standard deviations?`,
          steps: [
            r`Mean 9; range 11. Deviations $-5, -2, 0, 1, 6$: mean absolute deviation $\frac{14}{5} = 2.8$.`,
            r`Squares add to 66: $s = \sqrt{16.5} = 4.062$, $\sigma = \sqrt{13.2} = 3.633$.`,
            r`$CV = \frac{4.062}{9} = 45.1\%$. Chebyshev: at least $1 - \frac14 = 75\%$ of any data.`,
          ],
          answer: r`11, 2.8, 4.062, 3.633, 45.1%; at least 75%.`,
        },
      ],
      traps: [
        r`On a calculator, $s_x$ (or $\sigma_{n-1}$) is the sample value and $\sigma_x$ the population value.`,
        r`The variance is in squared units; report the standard deviation in the data's own units.`,
      ],
      check: [
        { q: r`Find the sample standard deviation of 8, 10, 11, 11, 10.`, a: r`Mean 10; squares add to 6: $\sqrt{1.5} = 1.22$.` },
        { q: r`Find the mean absolute deviation of 1, 4, 5, 7, 13.`, a: r`Mean 6: $\frac{5 + 2 + 1 + 1 + 7}{5} = 3.2$.` },
      ],
    },
    {
      name: 'Odds',
      inShort: r`Chances written as "for to against".`,
      body: [
        r`**Odds in favour** of an event compare its chance of happening with its chance of failing, $p : q$ with $q = 1 - p$; **odds against** are $q : p$. Going back:
$$\text{odds } a : b \text{ in favour} \implies P = \frac{a}{a + b}.$$

| From | To |
|---|---|
| $p = 0.2$ | odds in favour $0.2 : 0.8 = 1 : 4$, against $4 : 1$ |
| odds $5 : 3$ in favour | $P = \frac58$ |
| odds $5 : 2$ against | $2 : 5$ in favour, $P = \frac27$ |

Expectation from odds: turn the odds into $P$ first, then multiply by the prize.`,
      ],
      keyIdeas: [
        r`Odds in favour $= \frac{p}{1 - p}$, written $a : b$; odds against are the reverse.`,
        r`From odds $a : b$ in favour, $P = \frac{a}{a + b}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Both directions',
          problem: r`An event has probability 0.2. State the odds in favour. A horse is quoted at 5 : 2 against; what is its chance of winning?`,
          steps: [
            r`$\frac{0.2}{0.8} = \frac14$: odds 1 : 4 in favour.`,
            r`5 : 2 against means 2 : 5 in favour, so $P = \frac{2}{7} = 0.286$.`,
          ],
          answer: r`1 : 4; about 0.286.`,
        },
        {
          level: 'board',
          title: 'A die, a quote, an expectation',
          problem: r`(a) Find the odds in favour of a 5 or 6 on one die. (b) The odds are 7 : 3 that a product succeeds. Find the chance. (c) The odds are 5 : 3 that a player wins a ₱4000 prize. Find the expectation.`,
          steps: [
            r`(a) $P = \frac26$: odds $2 : 4 = 1 : 2$.`,
            r`(b) $\frac{7}{10} = 0.7$.`,
            r`(c) $P = \frac58$: $\frac58 \times 4000 = ₱2500$.`,
          ],
          answer: r`(a) 1 : 2; (b) 0.7; (c) ₱2500.`,
        },
      ],
      traps: [
        r`Odds are not a probability: 1 : 4 is a chance of $\frac15$, not $\frac14$.`,
        r`Read "against" carefully: it reverses the ratio.`,
      ],
      check: [
        { q: r`What are the odds in favour of a face card from a deck?`, a: r`$12 : 40 = 3 : 10$.` },
        { q: r`What are the odds in favour of a sum of 7 with two dice?`, a: r`$6 : 30 = 1 : 5$.` },
      ],
    },
  ],
};
