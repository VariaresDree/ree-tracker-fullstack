// Library › Lessons › Mathematics › Engineering Data Analytics (2026-11-17;
// every subtopic in the module format 2026-11-27, with figures, examples a step
// at a time and checks; every number re-worked by
// engineeringDataAnalyticsLesson.test.js. Coverage cross-checked against two
// review centers' data analysis handouts; the text, problems and figures are
// this app's own): written for the Philippine REE board, subtopic by subtopic
// in the syllabus's order. Probability & Statistics teaches counting, the basic
// rules and descriptive measures; this lesson builds on them.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
export const normalPdf = (x, mu = 0, sigma = 1) => Math.exp(-(((x - mu) / sigma) ** 2) / 2) / (sigma * Math.sqrt(2 * Math.PI));
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1));
// A data point drawn as a small cross.
const cross = ([x, y], dx, dy, colour = 0) => [
  { points: [[x - dx, y], [x + dx, y]], colour: colourOf(colour) },
  { points: [[x, y - dy], [x, y + dy]], colour: colourOf(colour) },
];

// The box-plot data of the descriptive-statistics board example.
export const BOX_DATA = [12, 15, 17, 18, 20, 21, 22, 25, 27, 41];
// The regression data of the basic example.
export const XY = [[1, 2], [2, 4], [3, 5], [4, 4], [5, 5]];
// The concrete mixes of the analysis-of-variance example.
export const MIXES = [[18, 21, 20, 19], [24, 26, 23, 25], [20, 22, 21, 23]];
// Twenty 95% intervals of half-width 2 around μ = 50: the tenth misses.
export const CENTRES = [49.2, 50.8, 51.1, 48.9, 50.3, 49.7, 51.5, 48.6, 50.1, 52.6, 49.4, 50.9, 48.4, 51.8, 49.9, 50.5, 48.2, 51.2, 49.6, 50.2];

export default {
  topic: 'Engineering Data Analytics',
  subject: 'Mathematics',
  overview: r`Engineering decisions rest on data: how it was collected, what it looks like, which model fits it, and how sure we can be about what it says. This topic follows that path, from sampling plans and summaries, through the distributions used for counts and lifetimes, to the inference tools: sampling distributions, confidence intervals, hypothesis tests, regression, analysis of variance and designed experiments. Probability & Statistics covers counting, the basic rules and the mean and spread; here they are put to work.`,
  sources: [
    'Applied Statistics and Probability for Engineers (Montgomery and Runger)',
    'Probability and Statistics for Engineers and Scientists (Walpole, Myers, Myers and Ye)',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Obtaining Data and Sampling',
      inShort: r`Where data come from: censuses, samples, experiments, and how to choose a sample fairly.`,
      body: [
        r`A **census** measures every member of the population; a **sample** measures some, chosen so they represent the rest. Raw data become an **array** once sorted. How the sample is drawn decides what it can tell you:

| Plan | How | Count or size |
|---|---|---|
| simple random | every sample of size $n$ equally likely | $C(N, n)$ possible samples |
| systematic | every $k$th item after a random start | $k = \frac Nn$ |
| stratified | sample each group in proportion | $n_h = n\frac{N_h}{N}$ |
| cluster | whole groups at random | |
| convenience | whoever is nearest | biased: avoid |

**Slovin's formula** gives a sample size for a margin of error $e$, $n = \frac{N}{1 + Ne^2}$. As the population grows the size levels off near $\frac{1}{e^2}$:`,
        {
          type: 'plot',
          alt: 'The sample size from Slovin formula with a 5 percent margin, plotted against the population size up to 10 000. It rises steeply at first and levels off below the dashed line at 400.',
          caption: "Slovin's sample size at a 5% margin: a population of 1000 needs 286, and no population needs more than 1/e² = 400 (dashed).",
          x: [0, 10000],
          y: [0, 450],
          xLabel: 'population N',
          yLabel: 'sample n',
          series: [{ f: (N) => N / (1 + N * 0.0025), colour: colourOf(0) }],
          marks: [{ y: 400 }],
          legend: false,
        },
        r`An **observational study** records what happens and can show association; only a designed **experiment**, with treatments assigned at random, can show cause.`,
      ],
      keyIdeas: [
        r`Simple random: every sample of size $n$ equally likely, $C(N, n)$ of them. Systematic: every $k = \frac Nn$-th item. Stratified: each group sampled in proportion, $n_h = n\frac{N_h}{N}$. Cluster: whole groups at random.`,
        r`Slovin: $n = \frac{N}{1 + Ne^2}$ for a margin $e$.`,
        r`An observational study shows association; only a designed experiment, with randomisation, shows cause.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Slovin, and strata',
          problem: r`A plant has 1,200 workers: 600 in production, 400 in maintenance and 200 in the office. How many should be surveyed at a 5% margin of a population of 1,000 by Slovin, and how would a sample of 60 be split by strata?`,
          steps: [
            r`Slovin: $\frac{1000}{1 + 1000(0.05)^2} = 285.7$, so 286.`,
            r`Strata for 60: $60\cdot\frac{600}{1200} = 30$, then 20 and 10.`,
          ],
          answer: r`286; 30, 20 and 10.`,
        },
        {
          level: 'board',
          title: 'Four sampling questions',
          problem: r`(a) Find Slovin's sample size for 2500 meters at a 4% margin. (b) A systematic sample of 60 is taken from 1500 records. What is the interval? (c) A sample of 80 is split over feeders of 400, 300 and 100 customers. How many from each? (d) How many simple random samples of 3 can be drawn from 20 transformers?`,
          steps: [
            r`(a) $\frac{2500}{1 + 2500(0.0016)} = \frac{2500}{5} = 500$.`,
            r`(b) $k = \frac{1500}{60} = 25$: every 25th record.`,
            r`(c) $80 \times \frac{400}{800} = 40$, then 30 and 10.`,
            r`(d) $C(20, 3) = 1140$.`,
          ],
          answer: r`(a) 500; (b) every 25th; (c) 40, 30, 10; (d) 1140.`,
        },
      ],
      traps: [
        r`A convenience sample (whoever is nearest) is not random, however large.`,
        r`In Slovin, $e$ is a fraction: 5% is 0.05, so $e^2 = 0.0025$.`,
      ],
      check: [
        { q: r`What does Slovin give for 10 000 people at 2%?`, a: r`$\frac{10\,000}{1 + 4} = 2000$.` },
        { q: r`Can an observational study prove that one thing causes another?`, a: r`No: only a randomised experiment can.` },
      ],
    },
    {
      name: 'Descriptive Statistics',
      inShort: r`Summarising data in tables and pictures; the measures themselves are in Probability & Statistics.`,
      body: [
        r`A **frequency distribution** sorts data into classes. **Sturges' rule** suggests $k = 1 + 3.322\log_{10}n$ classes, each of width $c$ with $kc$ just over the range. Relative frequency is $\frac fn$; cumulative frequency is the running total, drawn as an ogive.

The shape of a frequency curve tells its story:

| Shape | Tail | Order of the centres |
|---|---|---|
| symmetric (bell) | none | mean = median = mode |
| skewed right | long right tail | mode < median < mean |
| skewed left | long left tail | mean < median < mode |
| uniform | flat | no single mode |

**Pearson's skewness** $\frac{3(\bar x - \text{median})}{s}$ measures the lean; **kurtosis** (3 for a normal curve) measures how heavy the tails are. A **box plot** draws the five-number summary (minimum, $Q_1$, median, $Q_3$, maximum); points beyond the fences $Q_1 - 1.5\,IQR$ and $Q_3 + 1.5\,IQR$ are **outliers**:`,
        {
          type: 'plot',
          alt: 'A horizontal box plot of ten values from 12 to 41. The box runs from 17 to 25 with the median at 20.5; the whiskers reach 12 and 27; the value 41 lies beyond the upper fence at 37 and is drawn as a separate cross.',
          caption: 'Box plot of 12, 15, 17, 18, 20, 21, 22, 25, 27, 41: box 17 to 25, median 20.5, whiskers 12 and 27; 41 lies past the fence at 37, an outlier.',
          x: [5, 45],
          y: [0, 1],
          xLabel: 'value',
          yLabel: '',
          series: [
            { points: [[17, 0.35], [25, 0.35], [25, 0.65], [17, 0.65], [17, 0.35]], colour: colourOf(0) },
            { points: [[20.5, 0.35], [20.5, 0.65]], colour: colourOf(0) },
            { points: [[12, 0.5], [17, 0.5]], colour: colourOf(0) },
            { points: [[25, 0.5], [27, 0.5]], colour: colourOf(0) },
            ...cross([41, 0.5], 0.6, 0.05, 1),
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Classes: Sturges' $k = 1 + 3.322\log_{10}n$; width $c$ with $kc$ more than the range.`,
        r`Relative frequency $\frac fn$; cumulative frequency is the running total.`,
        r`Box plot: min, $Q_1$, median, $Q_3$, max; points beyond $Q_1 - 1.5\,IQR$ or $Q_3 + 1.5\,IQR$ are outliers.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Classes, and an outlier',
          problem: r`50 readings range from 23 to 91. How many classes, and how wide? Another set has $Q_1 = 20$ and $Q_3 = 32$; is 55 an outlier?`,
          steps: [
            r`$k = 1 + 3.322(1.699) = 6.6$, so 7 classes; $\frac{68}{7} = 9.7$, so width 10 ($7 \times 10 = 70 > 68$).`,
            r`$IQR = 12$, so the fences are 2 and 50: 55 is an outlier.`,
          ],
          answer: r`7 classes of width 10; yes.`,
        },
        {
          level: 'board',
          title: 'Classes, a box plot, a skew',
          problem: r`(a) 120 readings run from 37 to 118. How many classes, and how wide? (b) For 12, 15, 17, 18, 20, 21, 22, 25, 27, 41, find the five-number summary (quartiles as medians of each half) and any outliers. (c) With mean 21.8 and $s = 8.094$, find Pearson's skewness.`,
          steps: [
            r`(a) $1 + 3.322\log_{10}120 = 7.907$: 8 classes. Range 81, so width $\frac{81}{8} = 10.1$, rounded up to 11.`,
            r`(b) Median $\frac{20 + 21}{2} = 20.5$; $Q_1 = 17$, $Q_3 = 25$, $IQR = 8$; fences $17 - 12 = 5$ and $25 + 12 = 37$. Summary 12, 17, 20.5, 25, 27 (largest within the fence), and 41 is an outlier.`,
            r`(c) $\frac{3(21.8 - 20.5)}{8.094} = 0.482$: skewed right, pulled by the outlier.`,
          ],
          answer: r`(a) 8 classes of width 11; (b) 12, 17, 20.5, 25, 27, outlier 41; (c) about 0.482.`,
        },
      ],
      traps: [
        r`If the range divides exactly by $k$, the largest value lands on the last boundary: make the width one step larger.`,
        r`The whisker stops at the last value inside the fence, not at the fence itself.`,
      ],
      check: [
        { q: r`In a right-skewed distribution, which is largest: mean, median or mode?`, a: r`The mean.` },
        { q: r`How many classes does Sturges suggest for 200 values?`, a: r`$1 + 3.322(2.301) = 8.6$: 9.` },
      ],
    },
    {
      name: 'Probability Rules',
      inShort: r`The addition and multiplication rules (Probability & Statistics), put to work on system reliability.`,
      body: [
        r`The **reliability** $R$ of a part is its chance of working for the required time. With parts that fail independently, the multiplication rule gives whole systems:

| Arrangement | Works when | Reliability |
|---|---|---|
| series | every part works | $R = R_1R_2\cdots R_n$ |
| parallel (redundant) | at least one works | $R = 1 - (1 - R_1)(1 - R_2)\cdots(1 - R_n)$ |
| network | reduce step by step | parallel groups first, then chains |
| $k$ out of $n$ identical | at least $k$ work | binomial sum |

Series chains get weaker with every part; redundancy makes a system stronger than any of its parts:`,
        {
          type: 'plot',
          alt: 'Reliability against the number of parts from 1 to 8, each part 0.8 reliable. In series, the dashed curve falls from 0.8 towards zero; in parallel, the solid curve climbs from 0.8 towards 1.',
          caption: 'Parts of reliability 0.8: in series (dashed) the system weakens, 0.8ⁿ; in parallel (solid) it strengthens, 1 − 0.2ⁿ.',
          x: [1, 8],
          y: [0, 1.05],
          xLabel: 'number of parts n',
          yLabel: 'reliability R',
          series: [
            { f: (n) => 1 - 0.2 ** n, colour: colourOf(0) },
            { f: (n) => 0.8 ** n, dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Series: every part must work, $R = R_1R_2\cdots R_n$.`,
        r`Parallel (redundant): fails only if every part fails, $R = 1 - (1 - R_1)\cdots(1 - R_n)$.`,
        r`For a network, reduce parallel groups and series chains step by step.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Series, parallel, mixed',
          problem: r`Parts with reliabilities 0.9, 0.8 and 0.95: find the system's reliability in series, in parallel, and for two 0.9 parts in parallel followed by the 0.95 part.`,
          steps: [
            r`Series: $0.9(0.8)(0.95) = 0.684$. Parallel: $1 - 0.1(0.2)(0.05) = 0.999$.`,
            r`Mixed: $[1 - 0.1^2](0.95) = 0.99(0.95) = 0.9405$.`,
          ],
          answer: r`0.684; 0.999; 0.9405.`,
        },
        {
          level: 'board',
          title: 'Three identical parts, a redundancy target, a network',
          problem: r`(a) Three parts of 0.85 each: find the reliability in series and in parallel. (b) How many 0.8 parts must run in parallel for 0.999? (c) Part A (0.95) is in series with B (0.9) and C (0.8) in parallel. Find the reliability.`,
          steps: [
            r`(a) $0.85^3 = 0.6141$; $1 - 0.15^3 = 0.9966$.`,
            r`(b) $1 - 0.2^n \ge 0.999$, so $0.2^n \le 0.001$ and $n \ge \frac{\ln0.001}{\ln0.2} = 4.29$: 5 parts.`,
            r`(c) $0.95 \times [1 - 0.1(0.2)] = 0.95 \times 0.98 = 0.931$.`,
          ],
          answer: r`(a) 0.6141 and 0.9966; (b) 5; (c) 0.931.`,
        },
      ],
      traps: [
        r`These rules assume the parts fail independently.`,
        r`Round the number of parts up: 4.29 parts means 5.`,
      ],
      check: [
        { q: r`Two 0.9 relays in parallel: what is the reliability?`, a: r`$1 - 0.01 = 0.99$.` },
        { q: r`Ten 0.99 parts in series: about what?`, a: r`$0.99^{10} = 0.904$.` },
      ],
    },
    {
      name: 'Discrete Distributions',
      inShort: r`Counts: Bernoulli, binomial, Poisson and others (formulas in Probability & Statistics), and the CDF.`,
      body: [
        r`A discrete random variable counts: defects, calls, faults. Its **cumulative distribution function** $F(x) = P(X \le x)$ climbs in steps from 0 to 1, one step at each value:`,
        {
          type: 'plot',
          alt: 'The cumulative distribution of a Poisson count with mean 2, a staircase rising from 0.135 at 0 to 0.406 at 1, 0.677 at 2 and so on towards 1.',
          caption: 'The CDF of a Poisson count with mean 2: steps of 0.135, 0.406, 0.677, 0.857, … at 0, 1, 2, 3, … rising to 1.',
          x: [-0.5, 8],
          y: [0, 1.05],
          xLabel: 'x',
          yLabel: 'F(x)',
          series: [
            {
              points: range(0, 7, 7).flatMap((k) => {
                let F = 0;
                for (let i = 0; i <= k; i++) F += (2 ** i * Math.exp(-2)) / fact(i);
                return [[k, F], [k + 1, F]];
              }),
              colour: colourOf(0),
            },
          ],
          legend: false,
        },
        r`| Distribution | Use | Mean, variance |
|---|---|---|
| Bernoulli | one trial | $p$, $p(1 - p)$ |
| binomial | successes in $n$ trials | $np$, $np(1 - p)$ |
| geometric | trials to the first success | $\frac1p$, $\frac{1 - p}{p^2}$ |
| Poisson process | events in time $t$ at rate $\lambda$ | $\lambda t$, $\lambda t$ |
| discrete uniform on $a..b$ | equally likely integers | $\frac{a + b}{2}$, $\frac{(b - a + 1)^2 - 1}{12}$ |

For a binomial, the moment coefficient of skewness is $\frac{q - p}{\sqrt{npq}}$ and of kurtosis $3 + \frac{1 - 6pq}{npq}$. Probabilities of ranges come from the CDF: $P(a < X \le b) = F(b) - F(a)$.`,
      ],
      keyIdeas: [
        r`$F(x) = P(X \le x)$; $P(a < X \le b) = F(b) - F(a)$.`,
        r`Discrete uniform on $a..b$: $\mu = \frac{a + b}{2}$, $\sigma^2 = \frac{(b - a + 1)^2 - 1}{12}$.`,
        r`A Poisson process at rate $\lambda$: the count in time $t$ is Poisson with mean $\lambda t$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Calls in half an hour',
          problem: r`Calls arrive at 4 an hour. What is the chance of at most one call in half an hour?`,
          steps: [
            r`$\lambda t = 4(0.5) = 2$.`,
            r`$P(0) + P(1) = e^{-2}(1 + 2) = 3e^{-2} = 0.4060$.`,
          ],
          answer: r`About 0.4060.`,
        },
        {
          level: 'board',
          title: 'Faults on a line, a die, a CDF, a first defect',
          problem: r`(a) Faults occur at 0.5 per km. Find the chance of at least 3 on 4 km. (b) Find the variance of one die. (c) For a binomial with $n = 4$, $p = 0.5$, find $F(2)$. (d) Items are 10% defective. Find the chance the first defect is the 5th item.`,
          steps: [
            r`(a) $\lambda t = 2$: $1 - e^{-2}(1 + 2 + 2) = 1 - 5e^{-2} = 0.3233$.`,
            r`(b) Uniform on 1..6: $\frac{36 - 1}{12} = 2.917$.`,
            r`(c) $\frac{1 + 4 + 6}{16} = 0.6875$.`,
            r`(d) $0.9^4(0.1) = 0.06561$.`,
          ],
          answer: r`(a) about 0.3233; (b) 2.917; (c) 0.6875; (d) 0.06561.`,
        },
      ],
      traps: [
        r`For counts, "fewer than 3" is $X \le 2$; the endpoint matters.`,
        r`Scale the Poisson mean to the interval: 0.5 per km is 2 on 4 km.`,
      ],
      check: [
        { q: r`What is $P(2 < X \le 5)$ in terms of the CDF?`, a: r`$F(5) - F(2)$.` },
        { q: r`What is the mean number of trials to the first success when $p = 0.2$?`, a: r`5.` },
      ],
    },
    {
      name: 'Continuous Distributions',
      inShort: r`Measurements and lifetimes: probability is area under a density.`,
      body: [
        r`A continuous variable has a **density** $f(x) \ge 0$ with total area 1; $P(a \le X \le b) = \int_a^bf\,dx$, and the CDF is $F(x) = \int_{-\infty}^xf$, so $F' = f$. The mean is $\int xf\,dx$.

Lifetimes are described by the **reliability** $R(t) = P(T > t) = 1 - F(t)$. A constant failure rate $\lambda$ gives the **exponential** model, $R(t) = e^{-\lambda t}$ with mean life (MTTF) $\frac1\lambda$. It is **memoryless**: a part that has survived so far is as good as new:`,
        {
          type: 'plot',
          alt: 'The exponential reliability curve e to the minus t over 1000 for a part with a mean life of 1000 hours, falling from 1 at t equals 0 through 0.6065 at 500 hours and 0.368 at 1000 hours.',
          caption: 'R(t) = e^(−t/1000), MTTF 1000 h: 0.6065 survive 500 h (marked), only 36.8% reach the mean life itself.',
          x: [0, 3000],
          y: [0, 1.05],
          xLabel: 't (h)',
          yLabel: 'R(t)',
          series: [{ f: (t) => Math.exp(-t / 1000), colour: colourOf(0) }],
          marks: [{ at: [500, Math.exp(-0.5)] }],
          legend: false,
        },
        r`| Model | Density or reliability | Mean, variance |
|---|---|---|
| uniform on $[a, b]$ | $f = \frac{1}{b - a}$ | $\frac{a + b}{2}$, $\frac{(b - a)^2}{12}$ |
| exponential | $R = e^{-\lambda t}$ | $\frac1\lambda$, $\frac{1}{\lambda^2}$; median $\frac{\ln2}{\lambda}$ |
| gamma | time to the $r$th Poisson event | $\frac r\lambda$, $\frac{r}{\lambda^2}$ |
| Weibull | $R = e^{-(t/\eta)^\beta}$: $\beta > 1$ wear-out, $< 1$ infant mortality | |
| lognormal | $\ln T$ is normal | |`,
      ],
      keyIdeas: [
        r`$P(a \le X \le b) = \int_a^bf(x)\,dx$; total area 1; $F' = f$.`,
        r`Uniform on $[a, b]$: $\mu = \frac{a + b}{2}$, $\sigma^2 = \frac{(b - a)^2}{12}$. Exponential: $F = 1 - e^{-\lambda x}$, mean $\frac1\lambda$, memoryless; $R(t) = e^{-\lambda t}$.`,
        r`Gamma (time to the $r$-th event), Weibull (wear-out), lognormal ($\ln X$ normal) model other lifetimes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A part, and a bus',
          problem: r`A part's life is exponential with MTTF 1,000 h. Find the chance it lasts 500 h, and the chance it lasts another 500 h given it has run 800 h. A bus comes uniformly within 20 min: find the chance of waiting over 15 min, and the mean and standard deviation of the wait.`,
          steps: [
            r`$R(500) = e^{-0.5} = 0.6065$; memoryless, so the second answer is also 0.6065.`,
            r`Bus: $\frac{5}{20} = 0.25$; $\mu = 10$ min, $\sigma = \frac{20}{\sqrt{12}} = 5.77$ min.`,
          ],
          answer: r`0.6065 twice; 0.25, 10 min, 5.77 min.`,
        },
        {
          level: 'board',
          title: 'A failure rate, a uniform range, a density, a redundant pair',
          problem: r`(a) A lamp fails at 0.002 per hour. Find $R(300)$ and the median life. (b) $X$ is uniform on $[10, 30]$. Find $P(X < 16)$ and $\sigma$. (c) $f(x) = kx^2$ on $[0, 3]$. Find $k$, $P(X < 2)$ and the mean. (d) Two exponential units, each MTTF 1000 h, run in parallel. Find the system reliability at 1000 h.`,
          steps: [
            r`(a) $e^{-0.6} = 0.5488$; median $\frac{\ln2}{0.002} = 346.6$ h.`,
            r`(b) $\frac{6}{20} = 0.3$; $\sigma = \frac{20}{\sqrt{12}} = 5.774$.`,
            r`(c) $k\frac{27}{3} = 1$, so $k = \frac19$. $P(X < 2) = \frac{8}{27} = 0.2963$. Mean $\frac19\cdot\frac{81}{4} = 2.25$.`,
            r`(d) Each unit: $e^{-1} = 0.3679$. Parallel: $1 - (1 - 0.3679)^2 = 0.6004$.`,
          ],
          answer: r`(a) 0.5488 and 346.6 h; (b) 0.3 and 5.774; (c) $\frac19$, 0.2963, 2.25; (d) 0.6004.`,
        },
      ],
      traps: [
        r`Read whether the problem gives the rate $\lambda$ or the mean $\frac1\lambda$.`,
        r`Only 36.8% of exponential parts reach their own mean life: the MTTF is not a typical life.`,
      ],
      check: [
        { q: r`A density is 0.1 on $[0, 10]$. What is $P(3 \le X \le 7.5)$?`, a: r`$0.1 \times 4.5 = 0.45$.` },
        { q: r`What does "memoryless" mean for an exponential part?`, a: r`Its chance of lasting another $t$ hours doesn't depend on its age.` },
      ],
    },
    {
      name: 'Normal Distribution',
      inShort: r`z-scores and tables (Probability & Statistics), plus sums of normal quantities.`,
      body: [
        r`Measurements made up of many small independent effects are close to **normal**. Probability & Statistics covers the z-score and the table; engineering adds what happens when normal quantities are combined:

| Situation | Result |
|---|---|
| $\sum a_iX_i$, independent normals | normal, mean $\sum a_i\mu_i$, variance $\sum a_i^2\sigma_i^2$ |
| $n$ identical parts in series (lengths, resistances) | mean $n\mu$, standard deviation $\sqrt n\,\sigma$ |
| a percentile | $x_p = \mu + z_p\sigma$ |
| Poisson with a large mean $\lambda$ | approximately $N(\lambda, \lambda)$; use $x \pm 0.5$ |
| mean deviation of a normal | $\sigma\sqrt{2/\pi} = 0.7979\sigma$ |

The normal curve has skewness 0 and kurtosis 3. Tolerances stack by **variances**, which is why a long chain of parts is less variable, relative to its length, than one part.`,
      ],
      keyIdeas: [
        r`$\sum a_iX_i$ of independent normals is normal with mean $\sum a_i\mu_i$ and variance $\sum a_i^2\sigma_i^2$.`,
        r`Percentile to value: $x_p = \mu + z_p\sigma$.`,
        r`Large-mean Poisson: $z = \frac{x + 0.5 - \lambda}{\sqrt\lambda}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two parts end to end',
          problem: r`Two parts are joined end to end: lengths $N(50, 0.3^2)$ and $N(30, 0.4^2)$ mm. What share of assemblies exceed 81 mm?`,
          steps: [
            r`The total is normal with mean 80 and $\sigma = \sqrt{0.09 + 0.16} = 0.5$.`,
            r`$z = 2$, so $1 - \Phi(2) = 0.0228$, about 2.3%.`,
          ],
          answer: r`About 2.3%.`,
        },
        {
          level: 'board',
          title: 'Resistors in series, a percentile, a large Poisson',
          problem: r`(a) Three resistors, each $N(100, 2^2)$ Ω, are joined in series. Find the chance the total exceeds 306 Ω. (b) Find the 95th percentile of $N(80, 5^2)$. (c) Arrivals are Poisson with mean 100 a day. Find the chance of at most 90.`,
          steps: [
            r`(a) Total $N(300, 12)$, $\sigma = 3.464$: $z = \frac{6}{3.464} = 1.732$, so $0.0416$.`,
            r`(b) $80 + 1.645(5) = 88.2$.`,
            r`(c) $z = \frac{90.5 - 100}{10} = -0.95$: $\Phi(-0.95) = 0.1711$.`,
          ],
          answer: r`(a) about 0.0416; (b) about 88.2; (c) about 0.1711.`,
        },
      ],
      traps: [
        r`Variances add, not standard deviations: $0.3 + 0.4 = 0.7$ is wrong.`,
        r`A difference $X - Y$ also adds the variances.`,
      ],
      check: [
        { q: r`What is the mean deviation of a normal with $\sigma = 10$?`, a: r`About 7.98.` },
        { q: r`Four parts, each $\sigma = 0.2$ mm, are stacked. What is the stack's $\sigma$?`, a: r`$0.2\sqrt4 = 0.4$ mm.` },
      ],
    },
    {
      name: 'Sampling Distributions and Point Estimation',
      inShort: r`How a statistic varies from sample to sample.`,
      body: [
        r`A statistic computed from a sample (a mean, a proportion) varies from sample to sample; its distribution is the **sampling distribution**. The sample mean $\bar X$ of $n$ values has mean $\mu$ and **standard error** $\frac{\sigma}{\sqrt n}$, and by the **central limit theorem** it is nearly normal for $n \ge 30$, whatever the population's shape. Averages are much less spread than single values:`,
        {
          type: 'plot',
          alt: 'Two normal curves centred on 200: a low wide dashed one for single values with standard deviation 40, and a tall narrow solid one for means of 64 values with standard error 5.',
          caption: 'Single values, σ = 40 (dashed), against means of 64 values, σ/√64 = 5 (solid): the same centre, eight times narrower.',
          x: [80, 320],
          y: [0, 0.085],
          xLabel: 'value',
          yLabel: 'density',
          series: [
            { f: (x) => normalPdf(x, 200, 40), dashed: true, colour: colourOf(1) },
            { f: (x) => normalPdf(x, 200, 5), colour: colourOf(0) },
          ],
          legend: false,
        },
        r`| Statistic | Centre | Spread | Distribution |
|---|---|---|---|
| $\bar X$, $\sigma$ known | $\mu$ | $\frac{\sigma}{\sqrt n}$ | normal (CLT) |
| $\bar X$, $\sigma$ estimated by $s$ | $\mu$ | $\frac{s}{\sqrt n}$ | $t$ with $n - 1$ df |
| proportion $\hat p$ | $p$ | $\sqrt{\frac{p(1 - p)}{n}}$ | normal when $np, nq \ge 5$ |
| $\frac{(n - 1)S^2}{\sigma^2}$ | | | $\chi^2$ with $n - 1$ df |

A **point estimate** is a single best guess: $\bar x$ for $\mu$, $\hat p$ for $p$, $s^2$ (dividing by $n - 1$) for $\sigma^2$. These are **unbiased**: right on average.`,
      ],
      keyIdeas: [
        r`$\bar X$ has mean $\mu$ and standard error $\frac{\sigma}{\sqrt n}$; by the central limit theorem it is near normal for large $n$.`,
        r`$\hat p$ has standard error $\sqrt{\frac{p(1 - p)}{n}}$. $\bar X$ and $S^2$ (dividing by $n - 1$) are unbiased.`,
        r`With $s$ for $\sigma$, $\frac{\bar X - \mu}{S/\sqrt n}$ follows $t$ with $n - 1$ df; $\frac{(n - 1)S^2}{\sigma^2}$ follows $\chi^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A mean of 64',
          problem: r`A population has $\mu = 200$ and $\sigma = 40$. For samples of 64, find the standard error and $P(\bar X < 192)$.`,
          steps: [
            r`$\sigma_{\bar x} = \frac{40}{8} = 5$.`,
            r`$z = \frac{192 - 200}{5} = -1.6$, so $P = 0.0548$.`,
          ],
          answer: r`5; about 0.0548.`,
        },
        {
          level: 'board',
          title: 'A mean, and a proportion',
          problem: r`(a) Bulbs last $\mu = 800$ h with $\sigma = 60$ h. For a sample of 36, find $P(\bar X > 815)$. (b) 30% of meters are faulty. In a sample of 200, find the standard error of $\hat p$ and $P(\hat p > 0.35)$.`,
          steps: [
            r`(a) SE $= \frac{60}{6} = 10$; $z = 1.5$: $0.0668$.`,
            r`(b) SE $= \sqrt{\frac{0.3(0.7)}{200}} = 0.0324$; $z = \frac{0.05}{0.0324} = 1.543$: $0.0614$.`,
          ],
          answer: r`(a) 0.0668; (b) 0.0324 and about 0.0614.`,
        },
      ],
      traps: [
        r`Use $\frac{\sigma}{\sqrt n}$ for a MEAN; using $\sigma$ alone is the most common slip.`,
        r`Quadrupling the sample only halves the standard error.`,
      ],
      check: [
        { q: r`How big a sample halves the standard error of a sample of 25?`, a: r`100.` },
        { q: r`Which divisor makes $s^2$ unbiased?`, a: r`$n - 1$.` },
      ],
    },
    {
      name: 'Confidence Intervals',
      inShort: r`A range that holds the true value with a stated confidence.`,
      body: [
        r`A **confidence interval** is estimate $\pm$ margin, where the margin is a critical value times the standard error:

| Parameter | Interval |
|---|---|
| mean, $\sigma$ known or $n$ large | $\bar x \pm z\frac{\sigma}{\sqrt n}$ |
| mean, $\sigma$ unknown, small $n$ | $\bar x \pm t_{n-1}\frac{s}{\sqrt n}$ |
| proportion | $\hat p \pm z\sqrt{\frac{\hat p(1 - \hat p)}{n}}$ |
| variance | $\frac{(n - 1)s^2}{\chi^2_{\alpha/2}}$ to $\frac{(n - 1)s^2}{\chi^2_{1-\alpha/2}}$ (not symmetric) |
| sample size for a mean | $n = \left(\frac{z\sigma}{E}\right)^2$, rounded up |
| sample size for a proportion | $\frac{z^2p(1 - p)}{E^2}$; at most 385 for $\pm5\%$ at 95% |

With $z = 1.645$, 1.96 and 2.576 for 90%, 95% and 99%. "95% confidence" describes the method: of many such intervals, about 95% catch the true value:`,
        {
          type: 'plot',
          alt: 'Twenty horizontal 95 percent intervals, one above another, each 4 wide, scattered around a dashed vertical line at the true mean 50. Nineteen of them cross the line; one, drawn dashed, lies wholly to its right.',
          caption: 'Twenty 95% intervals from twenty samples, true mean 50 (dashed line): 19 catch it and one (dashed) misses, as the method promises.',
          x: [44, 56],
          y: [0, 21],
          xLabel: 'estimate',
          yLabel: 'sample',
          series: CENTRES.map((c, i) => ({ points: [[c - 2, i + 1], [c + 2, i + 1]], colour: colourOf(Math.abs(c - 50) > 2 ? 1 : 0), dashed: Math.abs(c - 50) > 2 })),
          marks: [{ x: 50 }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Mean: $\bar x \pm z\frac{\sigma}{\sqrt n}$, or $\bar x \pm t_{n - 1}\frac{s}{\sqrt n}$ for small samples with $\sigma$ unknown.`,
        r`Proportion: $\hat p \pm z\sqrt{\frac{\hat p(1 - \hat p)}{n}}$. Variance: from $\chi^2$, not symmetric.`,
        r`Sample size: $n = \left(\frac{z\sigma}{E}\right)^2$; for a proportion $\frac{z^2p(1 - p)}{E^2}$, at most 385 for $\pm5\%$ at 95%.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A small sample',
          problem: r`Ten measurements have $\bar x = 12.4$ and $s = 1.5$. Give a 95% interval for the mean ($t_{0.025,9} = 2.262$).`,
          steps: [
            r`$2.262 \times \frac{1.5}{\sqrt{10}} = 1.073$.`,
            r`So $11.33 < \mu < 13.47$.`,
          ],
          answer: r`$11.33$ to $13.47$.`,
        },
        {
          level: 'board',
          title: 'A 99% mean, a proportion, a sample size',
          problem: r`(a) 49 readings average 72 with $\sigma = 14$. Give a 99% interval. (b) 160 of 400 customers prefer a new tariff. Give a 95% interval for the share. (c) How many readings estimate a mean within $\pm2$ at 95% if $\sigma = 12$?`,
          steps: [
            r`(a) SE $= 2$: $72 \pm 2.576(2) = 72 \pm 5.152$, so $66.85$ to $77.15$.`,
            r`(b) $\hat p = 0.4$: $0.4 \pm 1.96\sqrt{\frac{0.24}{400}} = 0.4 \pm 0.048$, so $0.352$ to $0.448$.`,
            r`(c) $\left(\frac{1.96(12)}{2}\right)^2 = 138.3$: 139.`,
          ],
          answer: r`(a) 66.85 to 77.15; (b) 0.352 to 0.448; (c) 139.`,
        },
      ],
      traps: [
        r`"95% confident" is about the method: 95% of such intervals catch $\mu$. It is not a 95% chance for this one interval.`,
        r`Round a sample size up, never down.`,
      ],
      check: [
        { q: r`What happens to an interval's width if $n$ is quadrupled?`, a: r`It halves.` },
        { q: r`Which critical value goes with 90% confidence?`, a: r`$z = 1.645$.` },
      ],
    },
    {
      name: 'Test of Hypothesis',
      inShort: r`Deciding whether data contradict a claim.`,
      body: [
        r`A **hypothesis test** asks whether the data are too unlikely under a claim $H_0$. State $H_0$ and the alternative $H_1$ (one- or two-tailed), choose the significance level $\alpha$, compute the test statistic, and **reject** $H_0$ if it falls in the rejection region (or if the **P-value** is below $\alpha$):`,
        {
          type: 'plot',
          alt: 'The standard normal curve with both tails beyond plus and minus 1.96 shaded: the 5 percent rejection region of a two-tailed test. A dashed guide marks an observed z of minus 2.5, inside the left tail.',
          caption: 'A two-tailed test at 5%: reject beyond ±1.96 (shaded). An observed z = −2.5 (dashed) falls in the left tail, so the claim is rejected.',
          x: [-4, 4],
          y: [0, 0.45],
          xLabel: 'z',
          yLabel: 'density',
          series: [
            { f: (z) => normalPdf(z), colour: colourOf(0) },
            { points: range(-4, -1.96, 30).map((z) => [z, normalPdf(z)]), area: true, colour: colourOf(1) },
            { points: range(1.96, 4, 30).map((z) => [z, normalPdf(z)]), area: true, colour: colourOf(1) },
          ],
          marks: [{ x: -2.5 }],
          legend: false,
        },
        r`| Test | Statistic |
|---|---|
| mean, $\sigma$ known | $z = \frac{\bar x - \mu_0}{\sigma/\sqrt n}$ |
| mean, $\sigma$ unknown | $t = \frac{\bar x - \mu_0}{s/\sqrt n}$, $n - 1$ df |
| proportion | $z = \frac{\hat p - p_0}{\sqrt{p_0(1 - p_0)/n}}$ |
| two means | pooled or separate $t$; paired data use the differences |
| goodness of fit, independence | $\chi^2 = \sum\frac{(O - E)^2}{E}$ |

Two errors are possible: a **Type I** error (rejecting a true $H_0$, chance $\alpha$) and a **Type II** error (keeping a false one, chance $\beta$). The **power** $1 - \beta$ grows with the sample size.`,
      ],
      keyIdeas: [
        r`State $H_0$ and $H_1$, pick $\alpha$, compute the statistic, compare with the critical value or the P-value.`,
        r`$z = \frac{\bar x - \mu_0}{\sigma/\sqrt n}$; $t$ with $s$; $z = \frac{\hat p - p_0}{\sqrt{p_0(1 - p_0)/n}}$; two means pooled; paired differences; $\chi^2 = \sum\frac{(O - E)^2}{E}$.`,
        r`Type I error ($\alpha$): rejecting a true $H_0$. Type II ($\beta$): keeping a false one. Power $1 - \beta$ grows with $n$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A filling weight',
          problem: r`A supplier claims a mean of 500 g. A sample of 36 averages 490 g; $\sigma = 24$ g. Test at 5%, two-tailed.`,
          steps: [
            r`$z = \frac{490 - 500}{24/6} = -2.5$. $|z| > 1.96$, so reject the claim.`,
            r`The P-value is $2(0.0062) = 0.0124 < 0.05$, the same verdict.`,
          ],
          answer: r`Reject the claim.`,
        },
        {
          level: 'board',
          title: 'A t test, a proportion, a fair die',
          problem: r`(a) A claim says $\mu = 50$. Sixteen readings give $\bar x = 52.4$, $s = 4$. Test at 5%, two-tailed ($t_{0.025,15} = 2.131$). (b) A vendor claims 10% defective. In 200 items, 30 are defective. Test at 5%, one-tailed. (c) A die is rolled 60 times: 8, 12, 9, 11, 6, 14. Is it fair at 5% ($\chi^2_{0.05,5} = 11.07$)?`,
          steps: [
            r`(a) $t = \frac{2.4}{4/4} = 2.4 > 2.131$: reject.`,
            r`(b) $z = \frac{0.15 - 0.10}{\sqrt{0.09/200}} = 2.357 > 1.645$: reject; the P-value is 0.0092.`,
            r`(c) Each expected 10: $\chi^2 = \frac{4 + 4 + 1 + 1 + 16 + 16}{10} = 4.2 < 11.07$: no evidence it is unfair.`,
          ],
          answer: r`(a) reject; (b) reject; (c) fair.`,
        },
      ],
      traps: [
        r`"Fail to reject" is not "proved true": the data just aren't strong enough.`,
        r`A one-tailed test puts all of $\alpha$ in one tail: 1.645, not 1.96, at 5%.`,
      ],
      check: [
        { q: r`What is a Type I error?`, a: r`Rejecting $H_0$ when it is true.` },
        { q: r`A P-value is 0.03. At $\alpha = 0.01$, do you reject?`, a: r`No: $0.03 > 0.01$.` },
      ],
    },
    {
      name: 'Regression and Correlation',
      inShort: r`Fitting a line to paired data, and measuring how well it fits.`,
      body: [
        r`The **least-squares line** $\hat y = \hat\beta_0 + \hat\beta_1x$ makes the sum of squared vertical misses as small as possible. With
$$S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n}, \quad S_{xy} = \sum xy - \frac{\sum x\sum y}{n}, \quad S_{yy} = \sum y^2 - \frac{(\sum y)^2}{n},$$
the slope is $\hat\beta_1 = \frac{S_{xy}}{S_{xx}}$ and the line passes through $(\bar x, \bar y)$:`,
        {
          type: 'plot',
          alt: 'Five data points drawn as crosses at 1 comma 2, 2 comma 4, 3 comma 5, 4 comma 4 and 5 comma 5, with the fitted line y equals 2.2 plus 0.6 x running through them.',
          caption: 'Five points and their least-squares line ŷ = 2.2 + 0.6x, through the centre (3, 4); r = 0.775.',
          x: [0, 6],
          y: [0, 7],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 2.2 + 0.6 * x, dashed: true, colour: colourOf(1) },
            ...XY.flatMap((p) => cross(p, 0.12, 0.14)),
          ],
          legend: false,
        },
        r`| Quantity | Formula |
|---|---|
| correlation | $r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}}$, between $-1$ and 1 |
| coefficient of determination | $r^2 = \frac{SSR}{SST}$, the share of variation explained |
| residual variance | $s^2 = \frac{SSE}{n - 2}$, $SSE = S_{yy} - \hat\beta_1S_{xy}$ |
| slope test | $t = \frac{\hat\beta_1}{s/\sqrt{S_{xx}}}$, $n - 2$ df |
| rank correlation (Spearman) | $1 - \frac{6\sum d^2}{n(n^2 - 1)}$ |

Most calculators fit the line directly in regression mode.`,
      ],
      keyIdeas: [
        r`$S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n}$, likewise $S_{xy}$ and $S_{yy}$. Slope $\hat\beta_1 = \frac{S_{xy}}{S_{xx}}$, intercept $\bar y - \hat\beta_1\bar x$.`,
        r`$r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}}$; $r^2 = \frac{SSR}{SST}$ is the share of variation explained.`,
        r`Test the slope with $t = \frac{\hat\beta_1}{s/\sqrt{S_{xx}}}$, $s^2 = \frac{SSE}{n - 2}$. Ranks: Spearman $1 - \frac{6\sum d^2}{n(n^2 - 1)}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Five points',
          problem: r`Fit a line to $(1, 2), (2, 4), (3, 5), (4, 4), (5, 5)$ and find $r$.`,
          steps: [
            r`$S_{xx} = 55 - 45 = 10$, $S_{xy} = 66 - 60 = 6$, $S_{yy} = 86 - 80 = 6$.`,
            r`$\hat\beta_1 = 0.6$, $\hat\beta_0 = 4 - 0.6(3) = 2.2$: $\hat y = 2.2 + 0.6x$. $r = \frac{6}{\sqrt{60}} = 0.775$, $r^2 = 0.60$.`,
          ],
          answer: r`$\hat y = 2.2 + 0.6x$; $r = 0.775$.`,
        },
        {
          level: 'board',
          title: 'A strong line, a prediction, ranks',
          problem: r`(a) Fit a line to $(2, 5), (4, 9), (6, 10), (8, 15), (10, 16)$; find $r$, $r^2$ and the prediction at $x = 7$. (b) Two judges rank five panels 1, 2, 3, 4, 5 and 2, 1, 4, 3, 5. Find Spearman's correlation.`,
          steps: [
            r`(a) $\sum x = 30$, $\sum y = 55$, $\sum x^2 = 220$, $\sum xy = 386$, $\sum y^2 = 687$. $S_{xx} = 40$, $S_{xy} = 56$, $S_{yy} = 82$.`,
            r`$\hat\beta_1 = 1.4$, $\hat\beta_0 = 11 - 1.4(6) = 2.6$: $\hat y = 2.6 + 1.4x$, and at 7, $12.4$. $r = \frac{56}{\sqrt{3280}} = 0.9778$, $r^2 = 0.956$.`,
            r`(b) Differences $-1, 1, -1, 1, 0$: $\sum d^2 = 4$, so $1 - \frac{24}{120} = 0.8$.`,
          ],
          answer: r`(a) $\hat y = 2.6 + 1.4x$, $r = 0.9778$, $r^2 = 0.956$, 12.4; (b) 0.8.`,
        },
      ],
      traps: [
        r`Correlation is not causation, and $r$ near 0 can hide a strong curved relation.`,
        r`Predicting far outside the range of $x$ (extrapolating) trusts a line where there is no data.`,
      ],
      check: [
        { q: r`What does $r^2 = 0.81$ mean?`, a: r`The line explains 81% of the variation in $y$.` },
        { q: r`A line has $\hat\beta_1 = 2$, $\bar x = 5$, $\bar y = 13$. What is $\hat\beta_0$?`, a: r`$13 - 10 = 3$.` },
      ],
    },
    {
      name: 'Analysis of Variance',
      inShort: r`Comparing several means at once.`,
      body: [
        r`**Analysis of variance** asks whether $k$ group means differ by splitting the total variation into a part **between** the groups (the treatments) and a part **within** them (the error):
$$SST = SSTr + SSE, \qquad N - 1 = (k - 1) + (N - k)\ \text{degrees of freedom}.$$
Each sum of squares over its degrees of freedom is a mean square, and $F = \frac{MSTr}{MSE}$. If the groups differed only by chance, $F$ would be near 1; a large $F$ means at least one mean differs:`,
        {
          type: 'plot',
          alt: 'Three columns of crosses for the strengths of three concrete mixes, with a short dashed line at each mix mean, 19.5, 24.5 and 21.5. The second mix sits clearly above the others.',
          caption: 'Three mixes (crosses) with their means (short dashed lines): the spread between means is large next to the spread within each mix, so F is large.',
          x: [0.5, 3.5],
          y: [16, 28],
          xLabel: 'mix',
          yLabel: 'strength',
          series: [
            ...MIXES.flatMap((g, i) => g.flatMap((v) => cross([i + 1, v], 0.06, 0.25))),
            ...MIXES.map((g, i) => ({ points: [[i + 0.7, g.reduce((a, b) => a + b) / g.length], [i + 1.3, g.reduce((a, b) => a + b) / g.length]], dashed: true, colour: colourOf(1) })),
          ],
          legend: false,
        },
        r`| Source | SS | df | MS | F |
|---|---|---|---|---|
| treatments | $SSTr$ | $k - 1$ | $\frac{SSTr}{k - 1}$ | $\frac{MSTr}{MSE}$ |
| error | $SSE$ | $N - k$ | $\frac{SSE}{N - k}$ | |
| total | $SST$ | $N - 1$ | | |

After a significant $F$, compare pairs of means with the least significant difference.`,
      ],
      keyIdeas: [
        r`$SST = SSTr + SSE$, with $N - 1 = (k - 1) + (N - k)$ degrees of freedom.`,
        r`$F = \frac{MSTr}{MSE}$; a large $F$ means at least one mean differs.`,
        r`After rejecting, compare pairs with the least significant difference.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three mixes',
          problem: r`Three mixes give strengths 18, 21, 20, 19 / 24, 26, 23, 25 / 20, 22, 21, 23. Test equal means at 5% ($F_{0.05,2,9} = 4.26$).`,
          steps: [
            r`Means 19.5, 24.5, 21.5; grand mean 21.83. $SSTr = 4(5.44 + 7.11 + 0.11) = 50.67$, $SSE = 5 + 5 + 5 = 15$.`,
            r`$F = \frac{50.67/2}{15/9} = 15.2 > 4.26$: the mixes differ.`,
          ],
          answer: r`$F = 15.2$: the mixes differ.`,
        },
        {
          level: 'board',
          title: 'Completing a table',
          problem: r`Four suppliers are compared with 5 samples each. $SSTr = 60$ and $SSE = 80$. Complete the table and test at 5% ($F_{0.05,3,16} = 3.24$).`,
          steps: [
            r`$k = 4$, $N = 20$: df 3, 16 and 19; $SST = 140$.`,
            r`$MSTr = \frac{60}{3} = 20$, $MSE = \frac{80}{16} = 5$, $F = 4$.`,
            r`$4 > 3.24$: at least one supplier differs.`,
          ],
          answer: r`$F = 4$: reject equal means.`,
        },
      ],
      traps: [
        r`Several separate t tests inflate the overall chance of a false alarm; that is why ANOVA comes first.`,
        r`Degrees of freedom for error are $N - k$, not $N - 1$.`,
      ],
      check: [
        { q: r`With $k = 5$ groups and $N = 30$, what are the dfs?`, a: r`4, 25 and 29.` },
        { q: r`What does $F$ near 1 suggest?`, a: r`The group means differ only by chance.` },
      ],
    },
    {
      name: 'Design of Experiments',
      inShort: r`Planning runs so that effects can be separated cleanly.`,
      body: [
        r`A designed experiment changes the factors on purpose. Three principles make its results trustworthy: **randomise** the run order (so hidden trends don't line up with a factor), **replicate** (to measure the error), and **block** out nuisance factors (a randomised complete block design splits $SST = SSTr + SSB + SSE$).

A **$2^k$ factorial** runs every combination of $k$ factors at two levels, which shows each factor's main effect and how factors **interact**. With totals over $n$ replicates, labelled $(1)$, $a$, $b$, $ab$:
$$A = \frac{a + ab - b - (1)}{2n}, \quad B = \frac{b + ab - a - (1)}{2n}, \quad AB = \frac{ab + (1) - a - b}{2n}.$$
Non-parallel lines on an interaction plot show the interaction: the effect of one factor depends on the level of the other:`,
        {
          type: 'plot',
          alt: 'An interaction plot. The mean response rises from 21 to 31 as A goes from low to high with B low, and more steeply from 25 to 45 with B high, drawn dashed. The lines are not parallel.',
          caption: 'Means from the basic example: A raises the response by 10 with B low (solid) but by 20 with B high (dashed): non-parallel lines, an AB interaction.',
          x: [-1.5, 1.5],
          y: [15, 50],
          xLabel: 'factor A (low −1, high +1)',
          yLabel: 'mean response',
          series: [
            { points: [[-1, 21], [1, 31]], colour: colourOf(0) },
            { points: [[-1, 25], [1, 45]], dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`When $k$ is large, a **fractional factorial** $2^{k-p}$ screens the factors in a fraction of the runs, at the cost of confounding some effects with others.`,
      ],
      keyIdeas: [
        r`Randomise run order, replicate, and block out nuisance factors (randomised complete block: $SST = SSTr + SSB + SSE$).`,
        r`A $2^k$ factorial runs every combination of two levels; a $2^{k - p}$ fraction screens many factors in fewer runs.`,
        r`Main effect $A = \frac{a + ab - b - (1)}{2n}$; interaction $AB = \frac{ab + (1) - a - b}{2n}$ (totals).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A two-factor design',
          problem: r`A $2^2$ design with 2 replicates has totals $(1) = 42$, $a = 62$, $b = 50$, $ab = 90$. Find the effects.`,
          steps: [
            r`$A = \frac{62 + 90 - 50 - 42}{4} = 15$, $B = \frac{50 + 90 - 62 - 42}{4} = 9$.`,
            r`$AB = \frac{90 + 42 - 62 - 50}{4} = 5$. A has the larger effect, and the two interact.`,
          ],
          answer: r`$A = 15$, $B = 9$, $AB = 5$.`,
        },
        {
          level: 'board',
          title: 'Run counts, effects, block degrees of freedom',
          problem: r`(a) How many runs does a $2^3$ design need with 2 replicates, and a $2^{5-2}$ fraction without? (b) A $2^2$ design with 3 replicates has totals $(1) = 30$, $a = 48$, $b = 36$, $ab = 66$. Find the effects. (c) Four treatments are run in 5 blocks. Split the degrees of freedom.`,
          steps: [
            r`(a) $2 \times 8 = 16$; $2^3 = 8$.`,
            r`(b) $A = \frac{48 + 66 - 36 - 30}{6} = 8$, $B = \frac{36 + 66 - 48 - 30}{6} = 4$, $AB = \frac{66 + 30 - 48 - 36}{6} = 2$.`,
            r`(c) $N = 20$: treatments 3, blocks 4, error $3 \times 4 = 12$, total 19.`,
          ],
          answer: r`(a) 16 and 8; (b) $A = 8$, $B = 4$, $AB = 2$; (c) 3, 4, 12.`,
        },
      ],
      traps: [
        r`With a large interaction, report A's effect at each level of B, not just the average.`,
        r`Effects divide by $2n$ using totals; with means, divide the contrast by 2 only.`,
      ],
      check: [
        { q: r`Why randomise the run order?`, a: r`So drifts in time don't masquerade as factor effects.` },
        { q: r`How many runs does a full $2^4$ design need?`, a: r`16.` },
      ],
    },
  ],
};
