'use strict';

// Mathematics › Probability & Statistics formula cards (Library round,
// 2026-11-17): 13 live cards for 12 subtopics. Algebra already has the
// binomial coefficient, subsets and set unions, and Engineering Data Analytics
// (the next topic) takes sampling, estimation, tests, regression and ANOVA, so
// this file covers counting, probability rules, expectation, the discrete
// distributions, the normal curve, and descriptive statistics. Names avoid the
// rejected Algebra drafts ("Law of Total Probability", "Mean of Grouped Data"…),
// since a clash would silently skip the insert. See algebra.js for the format;
// tests/probabilityStatisticsFormulas.test.js checks every formula by brute
// force: enumeration, simulation-free exact sums, or numerical integration.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const FCP = 'Fundamental Counting Principle';
const PERM = 'Permutations';
const COMB = 'Combinations';
const PB = 'Probability Basics';
const MEI = 'Mutually Exclusive and Independent Events';
const CB = 'Conditional Probability and Bayes';
const ME = 'Mathematical Expectation';
const BP = 'Binomial and Poisson';
const NORM = 'Normal Distribution';
const CT = 'Central Tendency';
const DISP = 'Dispersion';
const ODDS = 'Odds';

const file = [
    ['f8c23063-d9a9-4834-9fbe-22ba2a557e4e', MEI, null], // Addition Rule
    ['fb67c91f-7186-46d3-b29c-2d8d86e12a25', CT, null], // Arithmetic Mean
    ['c80e4604-d6ec-49eb-a8c0-fa419ac5ff36', CB, null], // Bayes' Theorem
    ['b59bc866-df81-4edc-832f-d9e8ad921f14', BP, null], // Binomial Probability
    ['55186767-2c6f-45e4-a27d-577c8d9f5c0d', PERM, null], // Circular Permutations
    ['501a67b0-f7e0-4b35-9140-5f481731f17c', COMB, null], // Combinations
    ['53607e71-8ea9-4b86-9e13-f1cb9aaeb051', PB, null], // Complement Probability
    ['55710d87-3f0e-4698-9497-e80548f4e299', CB, null], // Conditional Probability
    ['d790c34f-e87c-4c0e-ae72-c96bc297f730', MEI, null], // Multiplication Rule for Independent Events
    ['221133e4-dd15-466d-92fb-8f110e6874fd', PERM, null], // Permutations
    ['2ae3427f-4bd0-4ea1-a3e5-005e8cb2be55', PERM, null], // Permutations with Repeated Elements
    ['ac5e09fe-746f-4a9d-8591-adcc080ca1ef', DISP, null], // Sample Standard Deviation
    ['6091213f-0c7b-40bc-bafc-d558e337828d', NORM, null], // Z-Score
];

const revisions = [
    { id: 'f8c23063-d9a9-4834-9fbe-22ba2a557e4e', note: 'It had no symbol.', symbol: r`$P(A \cup B)$` },
    { id: '55186767-2c6f-45e4-a27d-577c8d9f5c0d', note: 'Its variable meanings ended in a stray "|".',
        vars: [v(r`$n$`, 'number of distinct objects'), v(r`$P$`, 'number of circular arrangements')] },
    { id: '2ae3427f-4bd0-4ea1-a3e5-005e8cb2be55', note: 'Its variable meanings ended in a stray "|".',
        vars: [v(r`$n$`, 'total number of items'), v(r`$n_1, n_2, \ldots, n_k$`, 'counts of each identical type'), v(r`$k$`, 'number of identical types'), v(r`$P$`, 'number of distinct permutations')] },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const PROB = v(r`$p$`, 'the chance of success on one trial');
const DATA = v(r`$x_i$`, 'the data values');

const drafts = [
    // Fundamental Counting Principle
    F(FCP, null, 'Multiplication Principle of Counting', r`$N$`, r`$N = n_1 \times n_2 \times \cdots \times n_k$`,
        [v(r`$n_i$`, 'the ways to make choice i, whatever came before')],
        'When a task is a sequence of choices, multiply the number of ways for each.',
        'Fill the most restricted position first (a first digit that can\'t be 0, an even last digit).'),
    F(FCP, null, 'Addition Principle of Counting', r`$N$`, r`$N = n_1 + n_2 + \cdots + n_k \quad \text{(cases that can't happen together)}$`,
        [v(r`$n_i$`, 'the ways in case i')],
        'When a task can be done one way OR another, with no overlap, add the counts.',
        '"And" (one choice after another) multiplies; "or" (separate cases) adds.'),
    F(FCP, null, 'Arrangements with Repetition Allowed', r`$n^r$`, r`$N = n^r$`,
        [v(r`$n$`, 'the choices for each position'), v(r`$r$`, 'the number of positions')],
        'The number of sequences of length r when each position may use any of n symbols, repeats allowed.',
        'A 4-digit PIN has 10⁴ = 10 000 possibilities; with no repeats it is P(10, 4) = 5040.'),
    // Permutations
    F(PERM, null, 'Arrangements of All n Objects', r`$n!$`, r`$P(n, n) = n! = n(n - 1)(n - 2)\cdots 1,\qquad 0! = 1$`,
        [v(r`$n$`, 'the number of distinct objects')],
        'The number of ways to line up n distinct objects.',
        '10! = 3 628 800; factorials grow very fast.'),
    F(PERM, null, 'Arrangements with Objects Kept Together', r`$N$`, r`$N = (n - k + 1)!\;k!$`,
        [v(r`$n$`, 'objects in all'), v(r`$k$`, 'objects that must stay side by side')],
        'Treat the block as one object, arrange the blocks, then arrange inside the block.',
        'For "never together", subtract this from n!.'),
    F(PERM, null, 'Derangements', r`$D_n$`, r`$D_n = n!\sum_{k=0}^{n}\frac{(-1)^k}{k!} \approx \frac{n!}{e}$`,
        [v(r`$n$`, 'the number of objects')],
        'The arrangements in which no object is in its own place (letters in the wrong envelopes).',
        r`$D_1 = 0$, $D_2 = 1$, $D_3 = 2$, $D_4 = 9$; $D_n$ is $\frac{n!}{e}$ rounded to the nearest whole number.`),
    // Combinations
    F(COMB, null, 'Selections with Repetition Allowed', r`$\binom{n + r - 1}{r}$`, r`$N = \binom{n + r - 1}{r}$`,
        [v(r`$n$`, 'the kinds to choose from'), v(r`$r$`, 'the items chosen, repeats allowed')],
        'Ways to choose r items from n kinds when a kind may be chosen more than once and order doesn\'t matter.',
        'Choosing 3 scoops from 5 flavours: C(7, 3) = 35.'),
    F(COMB, null, 'Selecting at Least One Item', r`$2^n - 1$`, r`$\sum_{r=1}^{n} C(n, r) = 2^n - 1$`,
        [v(r`$n$`, 'the distinct items')],
        'The ways to choose one or more items from n, any number of them.',
        'Each item is in or out (2ⁿ), minus the empty choice.'),
    F(COMB, null, 'Dividing Objects into Groups', r`$\frac{n!}{n_1!\,n_2!\cdots n_k!}$`, r`$N = \frac{n!}{n_1!\,n_2!\cdots n_k!}\quad \text{(named groups)};\qquad \div\, m! \text{ for } m \text{ unnamed groups of equal size}$`,
        [v(r`$n_i$`, r`the size of group $i$, with $\sum n_i = n$`)],
        'The ways to split n distinct objects into groups of given sizes.',
        'Splitting 6 people into 3 unnamed pairs: 6!/(2!2!2!)/3! = 15.'),
    F(COMB, null, 'Lines and Triangles from n Points', r`$C(n, 2)$`, r`$\text{lines} = C(n, 2),\qquad \text{triangles} = C(n, 3)\quad \text{(no three collinear)}$`,
        [v(r`$n$`, 'the points')],
        'Each pair of points makes a line and each triple a triangle.',
        r`Handshakes among $n$ people and games in a round robin are also $C(n, 2)$.`),
    // Probability Basics
    F(PB, null, 'Classical Probability', r`$P(E)$`, r`$P(E) = \frac{n(E)}{n(S)}$`,
        [v(r`$n(E)$`, 'outcomes in the event'), v(r`$n(S)$`, 'outcomes in the sample space, all equally likely')],
        'The chance of an event when every outcome is equally likely.',
        'Two dice have 36 outcomes; a sum of 7 has 6 of them, so P = 1/6.'),
    F(PB, null, 'Relative Frequency Probability', r`$P(E)$`, r`$P(E) \approx \frac{f}{n}$`,
        [v(r`$f$`, 'times the event happened'), v(r`$n$`, 'trials')],
        'The chance estimated from how often an event happened in repeated trials.',
        'It settles toward the true probability as n grows (law of large numbers).'),
    F(PB, null, 'Axioms of Probability', r`$0 \le P(E) \le 1$`, r`$0 \le P(E) \le 1,\qquad P(S) = 1,\qquad P(\varnothing) = 0$`,
        [v(r`$S$`, 'the sample space'), v(r`$E$`, 'an event')],
        'Every probability lies between 0 and 1, and the whole sample space has probability 1.',
        'An answer outside 0 to 1 means an error.'),
    F(PB, null, 'Probability of at Least One', r`$P(\text{at least one})$`, r`$P(\text{at least one}) = 1 - (1 - p)^n$`,
        [PROB, v(r`$n$`, 'independent trials')],
        'The chance that an event happens at least once in n independent trials, from the complement.',
        'It is far quicker than adding the cases for 1, 2, 3, … successes.'),
    // Mutually Exclusive and Independent Events
    F(MEI, null, 'Addition Rule for Mutually Exclusive Events', r`$P(A \cup B)$`, r`$P(A \cup B) = P(A) + P(B) \quad \text{when } A \cap B = \varnothing$`,
        [v(r`$A, B$`, 'events that cannot happen together')],
        'For events that can\'t both happen, the chance of either is the sum.',
        'Mutually exclusive events are NOT independent (unless one has probability 0).'),
    F(MEI, null, 'Addition Rule for Three Events', r`$P(A \cup B \cup C)$`, r`$P(A \cup B \cup C) = P(A) + P(B) + P(C) - P(AB) - P(AC) - P(BC) + P(ABC)$`,
        [v(r`$P(AB)$`, r`$P(A \cap B)$, and so on`)],
        'The chance of at least one of three events: add singles, subtract pairs, add back the triple.',
        'Same pattern as counting three overlapping sets.'),
    F(MEI, null, 'Multiplication Rule for Dependent Events', r`$P(A \cap B)$`, r`$P(A \cap B) = P(A)\,P(B \mid A)$`,
        [v(r`$P(B \mid A)$`, r`the chance of $B$ once $A$ has happened`)],
        'The chance that both happen when the first changes the chance of the second.',
        'Drawing without replacement: the second draw\'s chances use the reduced deck.'),
    F(MEI, null, 'Probability That None Occur', r`$\prod(1 - p_i)$`, r`$P(\text{none}) = (1 - p_1)(1 - p_2)\cdots(1 - p_n)$`,
        [v(r`$p_i$`, 'the chances of independent events')],
        'For independent events, the chance that none happens; one minus it is the chance that at least one does.',
        'Three shooters with chances 0.5, 0.6, 0.7 all miss with 0.5 × 0.4 × 0.3 = 0.06.'),
    // Conditional Probability and Bayes
    F(CB, null, 'Total Probability Theorem', r`$P(B)$`, r`$P(B) = \sum_{i} P(B \mid A_i)\,P(A_i)$`,
        [v(r`$A_i$`, 'cases that cover every outcome and don\'t overlap'), v(r`$B$`, 'the event')],
        'The overall chance of an event, adding it up over every case it can happen in.',
        'It is the denominator of Bayes\' theorem. A tree diagram does the same sum.'),
    F(CB, null, "Bayes' Theorem for Several Causes", r`$P(A_k \mid B)$`, r`$P(A_k \mid B) = \frac{P(B \mid A_k)\,P(A_k)}{\sum_i P(B \mid A_i)\,P(A_i)}$`,
        [v(r`$A_k$`, 'one possible cause'), v(r`$B$`, 'what was observed')],
        'The chance that a particular cause was behind what was observed.',
        'Machines making defective parts: which machine made this defective one?'),
    // Mathematical Expectation
    F(ME, null, 'Expected Value of a Random Variable', r`$E(X)$`, r`$E(X) = \mu = \sum x\,p(x);\qquad E(X) = \int x\,f(x)\,dx$`,
        [v(r`$p(x)$`, 'probability of each value (discrete)'), v(r`$f(x)$`, 'the density (continuous)')],
        'The long-run average value: each value weighted by its probability.',
        'The probabilities must add to 1 (or the density integrate to 1) first.'),
    F(ME, null, 'Variance of a Random Variable', r`$\sigma^2$`, r`$\sigma^2 = E\big[(X - \mu)^2\big] = E(X^2) - [E(X)]^2$`,
        [v(r`$\mu$`, 'the mean'), v(r`$E(X^2)$`, r`$\sum x^2 p(x)$`)],
        'How far the values spread around the mean, weighted by probability.',
        'Square the mean last: E(X²) − [E(X)]², not E(X²) − E(X).'),
    F(ME, null, 'Properties of Expectation and Variance', r`$E(aX + b)$`, r`$E(aX + b) = aE(X) + b;\quad \mathrm{Var}(aX + b) = a^2\,\mathrm{Var}(X);\quad E(X + Y) = E(X) + E(Y)$`,
        [v(r`$a, b$`, 'constants'), v(r`$X, Y$`, 'random variables')],
        'Shifting adds to the mean but not the spread; scaling multiplies the variance by the square.',
        'Var(X + Y) = Var(X) + Var(Y) only when X and Y are independent.'),
    F(ME, null, 'Expectation of a Game', r`$E$`, r`$E = \sum(\text{amount won})(\text{probability}) - \sum(\text{amount lost})(\text{probability})$`,
        [v(r`$E$`, 'the expected gain per play')],
        'What a player wins on average per play.',
        'A fair game has E = 0; the fair price to play is the expected winnings.'),
    // Binomial and Poisson
    F(BP, null, 'Mean and Variance of the Binomial', r`$\mu = np$`, r`$\mu = np,\qquad \sigma^2 = np(1 - p),\qquad \sigma = \sqrt{np(1 - p)}$`,
        [v(r`$n$`, 'trials'), PROB],
        'The average number of successes in n trials and how much it varies.',
        'The most likely count is near np.'),
    F(BP, null, 'Poisson Probability', r`$P(x)$`, r`$P(x) = \frac{\lambda^x e^{-\lambda}}{x!},\qquad \mu = \sigma^2 = \lambda$`,
        [v(r`$\lambda$`, 'the average number of events in the interval'), v(r`$x$`, 'the number of events')],
        'The chance of exactly x events in an interval when they happen independently at a steady average rate.',
        'Scale λ to the interval asked: 3 calls an hour is 1.5 per half hour.'),
    F(BP, null, 'Poisson Approximation to the Binomial', r`$\lambda = np$`, r`$C(n, x)p^x(1 - p)^{n - x} \approx \frac{(np)^x e^{-np}}{x!}$`,
        [v(r`$n$`, 'many trials'), v(r`$p$`, 'a small chance of success')],
        'For many trials with a small chance each, the binomial is close to a Poisson with λ = np.',
        'A rule of thumb: n ≥ 20 and p ≤ 0.05.'),
    F(BP, null, 'Geometric Distribution', r`$P(X = k)$`, r`$P(X = k) = (1 - p)^{k - 1}p,\qquad \mu = \frac{1}{p}$`,
        [PROB, v(r`$k$`, 'the trial on which the first success comes')],
        'The chance that the first success comes on the k-th trial.',
        'On average a 1-in-6 event takes 6 tries.'),
    F(BP, null, 'Negative Binomial Distribution', r`$P(X = k)$`, r`$P(X = k) = C(k - 1, r - 1)\,p^r(1 - p)^{k - r},\qquad \mu = \frac{r}{p}$`,
        [PROB, v(r`$r$`, 'successes wanted'), v(r`$k$`, 'the trial on which the r-th success comes')],
        'The chance that the r-th success comes on the k-th trial.',
        'The last trial must be a success, so only the first k − 1 are arranged.'),
    F(BP, null, 'Hypergeometric Probability', r`$P(x)$`, r`$P(x) = \frac{C(K, x)\,C(N - K, n - x)}{C(N, n)}$`,
        [v(r`$N$`, 'items in all'), v(r`$K$`, 'items of the kind counted'), v(r`$n$`, 'items drawn without replacement'), v(r`$x$`, 'of the kind, among those drawn')],
        'The chance of x special items in a sample drawn without replacement.',
        'With replacement, it is binomial with p = K/N instead.'),
    F(BP, null, 'Multinomial Probability', r`$P$`, r`$P = \frac{n!}{x_1!\,x_2!\cdots x_k!}\,p_1^{x_1}p_2^{x_2}\cdots p_k^{x_k}$`,
        [v(r`$p_i$`, 'chance of outcome i on one trial'), v(r`$x_i$`, r`times outcome $i$ happens, $\sum x_i = n$`)],
        'The binomial for more than two outcomes per trial.',
        'With two outcomes it is the binomial.'),
    // Normal Distribution
    F(NORM, null, 'Normal Probability Density', r`$f(x)$`, r`$f(x) = \frac{1}{\sigma\sqrt{2\pi}}\,e^{-\frac{(x - \mu)^2}{2\sigma^2}}$`,
        [v(r`$\mu$`, 'the mean'), v(r`$\sigma$`, 'the standard deviation')],
        'The bell curve: symmetric about the mean, with total area 1.',
        'Probabilities are areas under it, read from the z-table; the chance of one exact value is 0.'),
    F(NORM, null, 'Empirical Rule', r`$68\text{–}95\text{–}99.7$`, r`$P(|X - \mu| < \sigma) \approx 0.6827,\quad P(|X - \mu| < 2\sigma) \approx 0.9545,\quad P(|X - \mu| < 3\sigma) \approx 0.9973$`,
        [v(r`$\mu, \sigma$`, 'the mean and standard deviation')],
        'The share of a normal distribution within 1, 2 and 3 standard deviations of the mean.',
        'Half of each lies on either side: 34% between the mean and +1σ.'),
    F(NORM, null, 'Probability Between Two Values', r`$P(a < X < b)$`, r`$P(a < X < b) = \Phi\!\left(\frac{b - \mu}{\sigma}\right) - \Phi\!\left(\frac{a - \mu}{\sigma}\right)$`,
        [v(r`$\Phi(z)$`, 'the area under the standard normal curve to the left of z')],
        'Convert both ends to z-scores and take the difference of their areas.',
        r`$\Phi(-z) = 1 - \Phi(z)$. Check which area your table gives: from $-\infty$ or from 0.`),
    F(NORM, null, 'Normal Approximation to the Binomial', r`$\mu = np$`, r`$X \approx N\big(np,\ np(1 - p)\big);\qquad P(X \le k) \approx \Phi\!\left(\frac{k + 0.5 - np}{\sqrt{np(1 - p)}}\right)$`,
        [v(r`$n, p$`, 'the binomial\'s trials and chance of success')],
        'For many trials, the binomial is close to a normal curve with the same mean and variance.',
        'Use it when np ≥ 5 and n(1 − p) ≥ 5, and apply the ±0.5 continuity correction.'),
    F(NORM, null, 'Common z-Values', r`$z_{\alpha}$`, r`$z = 1.645\ (90\%\text{ two-sided}),\quad 1.960\ (95\%),\quad 2.576\ (99\%)$`,
        [v(r`$z$`, 'the standard normal value')],
        'The z-values that leave 10%, 5% and 1% in the two tails together.',
        r`$1.645$ is also the one-tailed 5% value.`),
    // Central Tendency
    F(CT, null, 'Weighted Mean', r`$\bar{x}_w$`, r`$\bar{x}_w = \frac{\sum w_i x_i}{\sum w_i}$`,
        [DATA, v(r`$w_i$`, 'the weights')],
        'An average in which some values count more than others.',
        'A grade average weighted by units is a weighted mean.'),
    F(CT, null, 'Mean of a Frequency Distribution', r`$\bar{x}$`, r`$\bar{x} = \frac{\sum f_i x_i}{\sum f_i}$`,
        [v(r`$x_i$`, 'each value, or the class mark (midpoint) for grouped data'), v(r`$f_i$`, 'its frequency')],
        'The mean of data given as a frequency table.',
        'For classes, use the midpoint of each class.'),
    F(CT, null, 'Median of Ungrouped Data', r`$\tilde{x}$`, r`$\tilde{x} = \text{the value in position } \tfrac{n + 1}{2} \text{ of the sorted data}$`,
        [v(r`$n$`, 'the number of values')],
        'The middle value once the data are sorted; with an even count, the average of the two middle values.',
        'Sort first. The median ignores how extreme the outliers are.'),
    F(CT, null, 'Median of Grouped Data', r`$\tilde{x}$`, r`$\tilde{x} = L + \frac{\frac{n}{2} - F}{f}\,c$`,
        [v(r`$L$`, 'lower boundary of the median class'), v(r`$F$`, 'cumulative frequency before it'), v(r`$f$`, 'its frequency'), v(r`$c$`, 'the class width')],
        'The median of a frequency table, by interpolating inside the class that holds the middle value.',
        'Use class boundaries (59.5, not 60) for L.'),
    F(CT, null, 'Mode of Grouped Data', r`$\hat{x}$`, r`$\hat{x} = L + \frac{d_1}{d_1 + d_2}\,c$`,
        [v(r`$L$`, 'lower boundary of the modal class'), v(r`$d_1, d_2$`, 'its frequency minus the class before and the class after'), v(r`$c$`, 'the class width')],
        'The mode of a frequency table, inside the class with the highest frequency.',
        'For raw data the mode is simply the most frequent value; there may be several or none.'),
    F(CT, null, 'Mean of Combined Groups', r`$\bar{x}$`, r`$\bar{x} = \frac{n_1\bar{x}_1 + n_2\bar{x}_2}{n_1 + n_2}$`,
        [v(r`$n_i, \bar{x}_i$`, 'the size and mean of each group')],
        'The mean of two groups put together.',
        'Never average the two means directly unless the groups are the same size.'),
    F(CT, null, 'Mean, Median and Mode Relation', r`$\bar{x} - \hat{x}$`, r`$\bar{x} - \hat{x} \approx 3(\bar{x} - \tilde{x})$`,
        [v(r`$\bar{x}, \tilde{x}, \hat{x}$`, 'the mean, median and mode')],
        'An empirical rule linking the three averages for moderately skewed data.',
        'Symmetric data: all three are equal. Skewed right: mean > median > mode.'),
    // Dispersion
    F(DISP, null, 'Population Standard Deviation', r`$\sigma$`, r`$\sigma = \sqrt{\frac{\sum(x_i - \mu)^2}{N}}$`,
        [DATA, v(r`$\mu$`, 'the population mean'), v(r`$N$`, 'the population size')],
        'The spread of a whole population about its mean.',
        'Calculators: σₙ (or σx) for a population, sₙ₋₁ (or sx) for a sample.'),
    F(DISP, null, 'Computational Formula for Variance', r`$s^2$`, r`$s^2 = \frac{\sum x_i^2 - \frac{(\sum x_i)^2}{n}}{n - 1}$`,
        [DATA, v(r`$n$`, 'the number of values')],
        'The sample variance from the sums of the values and their squares, without the deviations.',
        'Same answer as the definition, and quicker by hand.'),
    F(DISP, null, 'Mean Absolute Deviation', r`$MAD$`, r`$MAD = \frac{\sum|x_i - \bar{x}|}{n}$`,
        [DATA, v(r`$\bar{x}$`, 'the mean')],
        'The average distance of the values from the mean.',
        'The range (largest minus smallest) is the crudest measure of spread.'),
    F(DISP, null, 'Coefficient of Variation', r`$CV$`, r`$CV = \frac{s}{\bar{x}}\times 100\%$`,
        [v(r`$s$`, 'the standard deviation'), v(r`$\bar{x}$`, 'the mean')],
        'The spread as a share of the mean, for comparing sets with different units or sizes.',
        'The set with the smaller CV is the more consistent.'),
    F(DISP, null, 'Quartiles and Interquartile Range', r`$IQR$`, r`$Q_k \text{ at position } \tfrac{k(n + 1)}{4};\qquad IQR = Q_3 - Q_1$`,
        [v(r`$Q_1, Q_3$`, 'the lower and upper quartiles'), v(r`$n$`, 'the number of sorted values')],
        'The quartiles split sorted data into four equal parts; the IQR is the spread of the middle half.',
        r`An outlier lies beyond $1.5\,IQR$ outside the quartiles. Percentile $P_k$ sits at position $\frac{k(n + 1)}{100}$.`),
    F(DISP, null, "Chebyshev's Theorem", r`$1 - \frac{1}{k^2}$`, r`$P(|X - \mu| < k\sigma) \ge 1 - \frac{1}{k^2}$`,
        [v(r`$k$`, 'standard deviations, more than 1')],
        'For ANY distribution, at least this share lies within k standard deviations of the mean.',
        'k = 2 gives at least 75%; the normal curve has 95%.'),
    F(DISP, null, "Pearson's Coefficient of Skewness", r`$Sk$`, r`$Sk = \frac{3(\bar{x} - \tilde{x})}{s}$`,
        [v(r`$\bar{x}, \tilde{x}$`, 'the mean and median'), v(r`$s$`, 'the standard deviation')],
        'How lopsided a distribution is: positive when the tail is to the right.',
        'Zero for symmetric data.'),
    // Odds
    F(ODDS, null, 'Odds from Probability', r`$\text{odds}$`, r`$\text{odds in favour} = \frac{p}{1 - p},\qquad \text{odds against} = \frac{1 - p}{p}$`,
        [v(r`$p$`, 'the probability of the event')],
        'Odds compare the chance of happening with the chance of not happening.',
        'A probability of 1/4 is odds of 1 : 3 in favour, 3 : 1 against.'),
    F(ODDS, null, 'Probability from Odds', r`$P$`, r`$\text{odds } a : b \text{ in favour} \ \Rightarrow\ P = \frac{a}{a + b}$`,
        [v(r`$a : b$`, 'the odds in favour')],
        'Turn odds back into a probability by dividing by the total.',
        'Odds of 2 : 3 against means P = 3/5 for the event.'),
];

module.exports = { subject: 'Mathematics', topic: 'Probability & Statistics', migration: '20261209000000_cards_probability_statistics', file, revisions, retire, drafts };
