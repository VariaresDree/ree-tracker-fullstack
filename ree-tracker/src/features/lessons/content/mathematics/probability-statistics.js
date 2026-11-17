// Library › Lessons › Mathematics › Probability & Statistics (2026-11-17):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order; every worked example checked by computation.
const r = String.raw;

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
      keyIdeas: [
        r`Multiplication principle: $N = n_1 \times n_2 \times \cdots \times n_k$.`,
        r`Addition principle: cases that can't happen together add.`,
        r`With repetition allowed, $r$ positions from $n$ symbols give $n^r$.`,
      ],
      example: {
        problem: r`How many 3-digit numbers have distinct digits? How many of those are even?`,
        solution: r`All: $9 \times 9 \times 8 = 648$ (first digit not 0). Even, by cases on the last digit: ending in 0, $9 \times 8 = 72$; ending in 2, 4, 6 or 8, $4 \times 8 \times 8 = 256$ (the first digit can't be 0 or the last digit). Total $72 + 256 = 328$.`,
      },
      traps: [r`Fill the most restricted position first, and split into cases when one restriction depends on another.`],
    },
    {
      name: 'Permutations',
      inShort: r`Arrangements, where order matters.`,
      keyIdeas: [
        r`$P(n, r) = \frac{n!}{(n - r)!}$; all $n$: $n!$.`,
        r`Repeated items: $\frac{n!}{n_1!\,n_2!\cdots}$. Around a circle: $(n - 1)!$, halved if flipping over is the same (a necklace).`,
        r`Kept together: glue the block, $(n - k + 1)!\,k!$. No one in their own place: derangements $D_n \approx \frac{n!}{e}$.`,
      ],
      example: {
        problem: r`How many arrangements of the letters of ENGINEER are there? In how many ways can 6 people sit at a round table, and in how many do two of them sit together?`,
        solution: r`ENGINEER has 8 letters with E three times and N twice: $\frac{8!}{3!\,2!} = 3360$. Round table: $5! = 120$. Together: treat the pair as one, $4!$ around the table, times $2$ for their order: $48$.`,
      },
      traps: [r`Divide by the repeats' factorials only for identical items, never for different people.`],
    },
    {
      name: 'Combinations',
      inShort: r`Selections, where order doesn't matter.`,
      keyIdeas: [
        r`$C(n, r) = \frac{n!}{r!\,(n - r)!}$; a committee is a combination, a line-up a permutation.`,
        r`With repetition: $\binom{n + r - 1}{r}$. At least one of $n$ items: $2^n - 1$.`,
        r`$n$ points give $C(n, 2)$ lines and $C(n, 3)$ triangles; $n$ people shake hands $C(n, 2)$ times.`,
      ],
      example: {
        problem: r`A committee of 3 men and 2 women is chosen from 6 men and 5 women. How many committees are possible?`,
        solution: r`$C(6, 3) \times C(5, 2) = 20 \times 10 = 200$.`,
      },
      traps: [r`"At least one woman" is easiest as all committees minus the all-men ones.`],
    },
    {
      name: 'Probability Basics',
      inShort: r`The chance of an event: favourable outcomes over all equally likely outcomes.`,
      keyIdeas: [
        r`$P(E) = \frac{n(E)}{n(S)}$, between 0 and 1; $P(E') = 1 - P(E)$.`,
        r`From experiments: $P(E) \approx \frac{f}{n}$.`,
        r`At least once in $n$ independent tries: $1 - (1 - p)^n$.`,
      ],
      example: {
        problem: r`Two dice are thrown. Find the chance of a sum of 9, and the chance of at least one six in four throws of one die.`,
        solution: r`A sum of 9 comes from $(3, 6), (4, 5), (5, 4), (6, 3)$: $\frac{4}{36} = \frac19$. At least one six: $1 - \left(\frac56\right)^4 = 0.5177$.`,
      },
      traps: [r`Two dice have 36 ordered outcomes; $(4, 5)$ and $(5, 4)$ are different.`],
    },
    {
      name: 'Mutually Exclusive and Independent Events',
      inShort: r`"Or" adds (minus the overlap); "and" multiplies (by a conditional chance if they affect each other).`,
      keyIdeas: [
        r`$P(A \cup B) = P(A) + P(B) - P(A \cap B)$; for mutually exclusive events the overlap is 0.`,
        r`Independent: $P(A \cap B) = P(A)P(B)$. Dependent: $P(A \cap B) = P(A)P(B \mid A)$.`,
        r`Three events: add singles, subtract pairs, add back the triple.`,
      ],
      example: {
        problem: r`$P(A) = 0.6$ and $P(B) = 0.5$, independent. Find $P(A \cup B)$. Then: one card is drawn; find the chance of a king or a queen.`,
        solution: r`$P(A \cap B) = 0.3$, so $P(A \cup B) = 0.6 + 0.5 - 0.3 = 0.8$. King or queen can't both happen: $\frac{4}{52} + \frac{4}{52} = \frac{2}{13}$.`,
      },
      traps: [r`Mutually exclusive is not independent: if one happens, the other cannot, which is the strongest dependence there is.`],
    },
    {
      name: 'Conditional Probability and Bayes',
      inShort: r`Chances once something is known, and turning them around.`,
      keyIdeas: [
        r`$P(A \mid B) = \frac{P(A \cap B)}{P(B)}$.`,
        r`Total probability: $P(B) = \sum P(B \mid A_i)P(A_i)$ over cases that cover everything.`,
        r`Bayes: $P(A_k \mid B) = \frac{P(B \mid A_k)P(A_k)}{\sum_i P(B \mid A_i)P(A_i)}$. A tree diagram does both.`,
      ],
      example: {
        problem: r`Machines A, B and C make 50%, 30% and 20% of the parts, with 1%, 2% and 3% defective. A part is defective; what is the chance it came from C?`,
        solution: r`$P(\text{def}) = 0.005 + 0.006 + 0.006 = 0.017$. $P(C \mid \text{def}) = \frac{0.006}{0.017} = 0.353$.`,
      },
      traps: [r`$P(A \mid B)$ and $P(B \mid A)$ are different numbers; say in words which is given.`],
    },
    {
      name: 'Mathematical Expectation',
      inShort: r`The long-run average value of a random quantity.`,
      keyIdeas: [
        r`$E(X) = \sum x\,p(x)$; $\sigma^2 = E(X^2) - [E(X)]^2$.`,
        r`$E(aX + b) = aE(X) + b$; $\mathrm{Var}(aX + b) = a^2\mathrm{Var}(X)$.`,
        r`A game is fair when the expected gain is 0.`,
      ],
      example: {
        problem: r`You win ₱100 if two dice show doubles and lose ₱20 otherwise. Is the game fair? Also find the variance of one die.`,
        solution: r`$E = 100\left(\frac16\right) - 20\left(\frac56\right) = 16.67 - 16.67 = 0$: fair. One die: $E(X) = 3.5$, $E(X^2) = \frac{91}{6} = 15.167$, so $\sigma^2 = 15.167 - 12.25 = 2.917$.`,
      },
      traps: [r`Lose amounts are negative; and square the mean, not each value, in $[E(X)]^2$.`],
    },
    {
      name: 'Binomial and Poisson',
      inShort: r`Counting successes: a fixed number of trials, or events at a steady rate.`,
      keyIdeas: [
        r`Binomial: $P(x) = C(n, x)p^x(1 - p)^{n - x}$, $\mu = np$, $\sigma^2 = np(1 - p)$.`,
        r`Poisson: $P(x) = \frac{\lambda^xe^{-\lambda}}{x!}$, $\mu = \sigma^2 = \lambda$; approximates the binomial when $n$ is large and $p$ small ($\lambda = np$).`,
        r`Without replacement: hypergeometric. First success on trial $k$: geometric, mean $\frac1p$.`,
      ],
      example: {
        problem: r`10% of parts are defective. In a sample of 5, find the chance of exactly one defective. Calls arrive at 3 an hour; find the chance of none, and of exactly 2, in an hour.`,
        solution: r`Binomial: $5(0.1)(0.9)^4 = 0.3281$. Poisson with $\lambda = 3$: $P(0) = e^{-3} = 0.0498$, $P(2) = \frac{9}{2}e^{-3} = 0.2240$.`,
      },
      traps: [r`Scale $\lambda$ to the interval asked: 3 an hour is 6 in two hours.`],
    },
    {
      name: 'Normal Distribution',
      inShort: r`The bell curve: probabilities are areas, found through z-scores.`,
      keyIdeas: [
        r`$z = \frac{x - \mu}{\sigma}$; $P(a < X < b) = \Phi(z_b) - \Phi(z_a)$, with $\Phi(-z) = 1 - \Phi(z)$.`,
        r`68%, 95% and 99.7% lie within 1, 2 and 3 standard deviations.`,
        r`$z = 1.645, 1.96, 2.576$ leave 10%, 5%, 1% in the two tails. The binomial is close to normal when $np$ and $n(1 - p)$ are both at least 5 (use $\pm0.5$).`,
      ],
      example: {
        problem: r`Scores are normal with $\mu = 70$ and $\sigma = 10$. What share score between 60 and 85?`,
        solution: r`$z = -1$ and $z = 1.5$: $\Phi(1.5) - \Phi(-1) = 0.9332 - 0.1587 = 0.7745$, about 77%.`,
      },
      traps: [r`Check whether your table gives the area from $-\infty$ or from 0 to $z$.`],
    },
    {
      name: 'Central Tendency',
      inShort: r`Where the data are centred: mean, median and mode.`,
      keyIdeas: [
        r`Mean $\bar x = \frac{\sum x}{n}$; weighted $\frac{\sum wx}{\sum w}$; frequency table $\frac{\sum fx}{\sum f}$ with class marks.`,
        r`Median: the middle of the sorted data, position $\frac{n + 1}{2}$; grouped $L + \frac{n/2 - F}{f}c$.`,
        r`Mode: most frequent; grouped $L + \frac{d_1}{d_1 + d_2}c$. Roughly, mean − mode $\approx 3$(mean − median).`,
      ],
      example: {
        problem: r`Find the mean, median and mode of 12, 15, 11, 18, 15, 20, 15, 13, 17, 14.`,
        solution: r`Sum 150, so the mean is 15. Sorted: 11, 12, 13, 14, 15, 15, 15, 17, 18, 20; the 5th and 6th are both 15, so the median is 15. The mode is 15. Equal: the data are roughly symmetric.`,
      },
      traps: [r`Two groups' means combine weighted by their sizes, not as a plain average.`],
    },
    {
      name: 'Dispersion',
      inShort: r`How spread out the data are.`,
      keyIdeas: [
        r`Sample $s = \sqrt{\frac{\sum(x - \bar x)^2}{n - 1}}$; population $\sigma$ divides by $N$. Shortcut: $s^2 = \frac{\sum x^2 - (\sum x)^2/n}{n - 1}$.`,
        r`Range, mean absolute deviation, $IQR = Q_3 - Q_1$; coefficient of variation $\frac{s}{\bar x}\times100\%$.`,
        r`Chebyshev: at least $1 - \frac{1}{k^2}$ of ANY data lie within $k$ standard deviations.`,
      ],
      example: {
        problem: r`For the same ten values (mean 15), find $s$, $\sigma$ and the coefficient of variation.`,
        solution: r`The squared deviations add to 68. $s = \sqrt{\frac{68}{9}} = 2.749$; $\sigma = \sqrt{\frac{68}{10}} = 2.608$; $CV = \frac{2.749}{15} = 18.3\%$.`,
      },
      traps: [r`On a calculator, $s_x$ (or $\sigma_{n-1}$) is the sample value and $\sigma_x$ the population value.`],
    },
    {
      name: 'Odds',
      inShort: r`Chances written as "for to against".`,
      keyIdeas: [
        r`Odds in favour $= \frac{p}{1 - p}$, written $a : b$; odds against are the reverse.`,
        r`From odds $a : b$ in favour, $P = \frac{a}{a + b}$.`,
      ],
      example: {
        problem: r`An event has probability 0.2. State the odds in favour. A horse is quoted at 5 : 2 against; what is its chance of winning?`,
        solution: r`$\frac{0.2}{0.8} = \frac14$: odds 1 : 4 in favour. 5 : 2 against means 2 : 5 in favour, so $P = \frac{2}{7} = 0.286$.`,
      },
      traps: [r`Odds are not a probability: 1 : 4 is a chance of $\frac15$, not $\frac14$.`],
    },
  ],
};
