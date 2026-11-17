// Library › Lessons › Mathematics › Engineering Data Analytics (2026-11-17):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order; every worked example checked by computation. Probability &
// Statistics teaches counting, the basic rules and descriptive measures; this
// lesson builds on them and points back where they overlap.
const r = String.raw;

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
      keyIdeas: [
        r`Simple random: every sample of size $n$ equally likely, $C(N, n)$ of them. Systematic: every $k = \frac Nn$-th item. Stratified: each group sampled in proportion, $n_h = n\frac{N_h}{N}$. Cluster: whole groups at random.`,
        r`Slovin: $n = \frac{N}{1 + Ne^2}$ for a margin $e$.`,
        r`An observational study shows association; only a designed experiment, with randomisation, shows cause.`,
      ],
      example: {
        problem: r`A plant has 1,200 workers: 600 in production, 400 in maintenance and 200 in the office. How many should be surveyed at a 5% margin of a population of 1,000 by Slovin, and how would a sample of 60 be split by strata?`,
        solution: r`Slovin: $\frac{1000}{1 + 1000(0.05)^2} = 285.7$, so 286. Strata for 60: $60\cdot\frac{600}{1200} = 30$, then 20 and 10.`,
      },
      traps: [r`A convenience sample (whoever is nearest) is not random, however large.`],
    },
    {
      name: 'Descriptive Statistics',
      inShort: r`Summarising data in tables and pictures; the measures themselves are in Probability & Statistics.`,
      keyIdeas: [
        r`Classes: Sturges' $k = 1 + 3.322\log_{10}n$; width $c$ with $kc$ more than the range.`,
        r`Relative frequency $\frac fn$; cumulative frequency is the running total.`,
        r`Box plot: min, $Q_1$, median, $Q_3$, max; points beyond $Q_1 - 1.5\,IQR$ or $Q_3 + 1.5\,IQR$ are outliers.`,
      ],
      example: {
        problem: r`50 readings range from 23 to 91. How many classes, and how wide? Another set has $Q_1 = 20$ and $Q_3 = 32$; is 55 an outlier?`,
        solution: r`$k = 1 + 3.322(1.699) = 6.6$, so 7 classes; $\frac{68}{7} = 9.7$, so width 10 ($7 \times 10 = 70 > 68$). $IQR = 12$, so the fences are 2 and 50: 55 is an outlier.`,
      },
      traps: [r`If the range divides exactly by $k$, the largest value lands on the last boundary: make the width one step larger.`],
    },
    {
      name: 'Probability Rules',
      inShort: r`The addition and multiplication rules (Probability & Statistics), put to work on system reliability.`,
      keyIdeas: [
        r`Series: every part must work, $R = R_1R_2\cdots R_n$.`,
        r`Parallel (redundant): fails only if every part fails, $R = 1 - (1 - R_1)\cdots(1 - R_n)$.`,
        r`For a network, reduce parallel groups and series chains step by step.`,
      ],
      example: {
        problem: r`Parts with reliabilities 0.9, 0.8 and 0.95: find the system's reliability in series, in parallel, and for two 0.9 parts in parallel followed by the 0.95 part.`,
        solution: r`Series: $0.9(0.8)(0.95) = 0.684$. Parallel: $1 - 0.1(0.2)(0.05) = 0.999$. Mixed: $[1 - 0.1^2](0.95) = 0.99(0.95) = 0.9405$.`,
      },
      traps: [r`These rules assume the parts fail independently.`],
    },
    {
      name: 'Discrete Distributions',
      inShort: r`Counts: Bernoulli, binomial, Poisson and others (formulas in Probability & Statistics), and the CDF.`,
      keyIdeas: [
        r`$F(x) = P(X \le x)$; $P(a < X \le b) = F(b) - F(a)$.`,
        r`Discrete uniform on $a..b$: $\mu = \frac{a + b}{2}$, $\sigma^2 = \frac{(b - a + 1)^2 - 1}{12}$.`,
        r`A Poisson process at rate $\lambda$: the count in time $t$ is Poisson with mean $\lambda t$.`,
      ],
      example: {
        problem: r`Calls arrive at 4 an hour. What is the chance of at most one call in half an hour?`,
        solution: r`$\lambda t = 4(0.5) = 2$. $P(0) + P(1) = e^{-2}(1 + 2) = 3e^{-2} = 0.4060$.`,
      },
      traps: [r`For counts, "fewer than 3" is $X \le 2$; the endpoint matters.`],
    },
    {
      name: 'Continuous Distributions',
      inShort: r`Measurements and lifetimes: probability is area under a density.`,
      keyIdeas: [
        r`$P(a \le X \le b) = \int_a^bf(x)\,dx$; total area 1; $F' = f$.`,
        r`Uniform on $[a, b]$: $\mu = \frac{a + b}{2}$, $\sigma^2 = \frac{(b - a)^2}{12}$. Exponential: $F = 1 - e^{-\lambda x}$, mean $\frac1\lambda$, memoryless; $R(t) = e^{-\lambda t}$.`,
        r`Gamma (time to the $r$-th event), Weibull (wear-out), lognormal ($\ln X$ normal) model other lifetimes.`,
      ],
      example: {
        problem: r`A part's life is exponential with MTTF 1,000 h. Find the chance it lasts 500 h, and the chance it lasts another 500 h given it has run 800 h. A bus comes uniformly within 20 min: find the chance of waiting over 15 min, and the mean and standard deviation of the wait.`,
        solution: r`$R(500) = e^{-0.5} = 0.6065$; memoryless, so the second answer is also 0.6065. Bus: $\frac{5}{20} = 0.25$; $\mu = 10$ min, $\sigma = \frac{20}{\sqrt{12}} = 5.77$ min.`,
      },
      traps: [r`Read whether the problem gives the rate $\lambda$ or the mean $\frac1\lambda$.`],
    },
    {
      name: 'Normal Distribution',
      inShort: r`z-scores and tables (Probability & Statistics), plus sums of normal quantities.`,
      keyIdeas: [
        r`$\sum a_iX_i$ of independent normals is normal with mean $\sum a_i\mu_i$ and variance $\sum a_i^2\sigma_i^2$.`,
        r`Percentile to value: $x_p = \mu + z_p\sigma$.`,
        r`Large-mean Poisson: $z = \frac{x + 0.5 - \lambda}{\sqrt\lambda}$.`,
      ],
      example: {
        problem: r`Two parts are joined end to end: lengths $N(50, 0.3^2)$ and $N(30, 0.4^2)$ mm. What share of assemblies exceed 81 mm?`,
        solution: r`The total is normal with mean 80 and $\sigma = \sqrt{0.09 + 0.16} = 0.5$. $z = 2$, so $1 - \Phi(2) = 0.0228$, about 2.3%.`,
      },
      traps: [r`Variances add, not standard deviations: $0.3 + 0.4 = 0.7$ is wrong.`],
    },
    {
      name: 'Sampling Distributions and Point Estimation',
      inShort: r`How a statistic varies from sample to sample.`,
      keyIdeas: [
        r`$\bar X$ has mean $\mu$ and standard error $\frac{\sigma}{\sqrt n}$; by the central limit theorem it is near normal for large $n$.`,
        r`$\hat p$ has standard error $\sqrt{\frac{p(1 - p)}{n}}$. $\bar X$ and $S^2$ (dividing by $n - 1$) are unbiased.`,
        r`With $s$ for $\sigma$, $\frac{\bar X - \mu}{S/\sqrt n}$ follows $t$ with $n - 1$ df; $\frac{(n - 1)S^2}{\sigma^2}$ follows $\chi^2$.`,
      ],
      example: {
        problem: r`A population has $\mu = 200$ and $\sigma = 40$. For samples of 64, find the standard error and $P(\bar X < 192)$.`,
        solution: r`$\sigma_{\bar x} = \frac{40}{8} = 5$. $z = \frac{192 - 200}{5} = -1.6$, so $P = 0.0548$.`,
      },
      traps: [r`Use $\frac{\sigma}{\sqrt n}$ for a MEAN; using $\sigma$ alone is the most common slip.`],
    },
    {
      name: 'Confidence Intervals',
      inShort: r`A range that holds the true value with a stated confidence.`,
      keyIdeas: [
        r`Mean: $\bar x \pm z\frac{\sigma}{\sqrt n}$, or $\bar x \pm t_{n - 1}\frac{s}{\sqrt n}$ for small samples with $\sigma$ unknown.`,
        r`Proportion: $\hat p \pm z\sqrt{\frac{\hat p(1 - \hat p)}{n}}$. Variance: from $\chi^2$, not symmetric.`,
        r`Sample size: $n = \left(\frac{z\sigma}{E}\right)^2$; for a proportion $\frac{z^2p(1 - p)}{E^2}$, at most 385 for $\pm5\%$ at 95%.`,
      ],
      example: {
        problem: r`Ten measurements have $\bar x = 12.4$ and $s = 1.5$. Give a 95% interval for the mean ($t_{0.025,9} = 2.262$).`,
        solution: r`$2.262 \times \frac{1.5}{\sqrt{10}} = 1.073$, so $11.33 < \mu < 13.47$.`,
      },
      traps: [r`"95% confident" is about the method: 95% of such intervals catch $\mu$. It is not a 95% chance for this one interval.`],
    },
    {
      name: 'Test of Hypothesis',
      inShort: r`Deciding whether data contradict a claim.`,
      keyIdeas: [
        r`State $H_0$ and $H_1$, pick $\alpha$, compute the statistic, compare with the critical value or the P-value.`,
        r`$z = \frac{\bar x - \mu_0}{\sigma/\sqrt n}$; $t$ with $s$; $z = \frac{\hat p - p_0}{\sqrt{p_0(1 - p_0)/n}}$; two means pooled; paired differences; $\chi^2 = \sum\frac{(O - E)^2}{E}$.`,
        r`Type I error ($\alpha$): rejecting a true $H_0$. Type II ($\beta$): keeping a false one. Power $1 - \beta$ grows with $n$.`,
      ],
      example: {
        problem: r`A supplier claims a mean of 500 g. A sample of 36 averages 490 g; $\sigma = 24$ g. Test at 5%, two-tailed.`,
        solution: r`$z = \frac{490 - 500}{24/6} = -2.5$. $|z| > 1.96$, so reject the claim. The P-value is $2(0.0062) = 0.0124 < 0.05$, the same verdict.`,
      },
      traps: [r`"Fail to reject" is not "proved true": the data just aren't strong enough.`],
    },
    {
      name: 'Regression and Correlation',
      inShort: r`Fitting a line to paired data, and measuring how well it fits.`,
      keyIdeas: [
        r`$S_{xx} = \sum x^2 - \frac{(\sum x)^2}{n}$, likewise $S_{xy}$ and $S_{yy}$. Slope $\hat\beta_1 = \frac{S_{xy}}{S_{xx}}$, intercept $\bar y - \hat\beta_1\bar x$.`,
        r`$r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}}$; $r^2 = \frac{SSR}{SST}$ is the share of variation explained.`,
        r`Test the slope with $t = \frac{\hat\beta_1}{s/\sqrt{S_{xx}}}$, $s^2 = \frac{SSE}{n - 2}$. Ranks: Spearman $1 - \frac{6\sum d^2}{n(n^2 - 1)}$.`,
      ],
      example: {
        problem: r`Fit a line to $(1, 2), (2, 4), (3, 5), (4, 4), (5, 5)$ and find $r$.`,
        solution: r`$S_{xx} = 55 - 45 = 10$, $S_{xy} = 66 - 60 = 6$, $S_{yy} = 86 - 80 = 6$. $\hat\beta_1 = 0.6$, $\hat\beta_0 = 4 - 0.6(3) = 2.2$: $\hat y = 2.2 + 0.6x$. $r = \frac{6}{\sqrt{60}} = 0.775$, $r^2 = 0.60$.`,
      },
      traps: [r`Correlation is not causation, and $r$ near 0 can hide a strong curved relation.`],
    },
    {
      name: 'Analysis of Variance',
      inShort: r`Comparing several means at once.`,
      keyIdeas: [
        r`$SST = SSTr + SSE$, with $N - 1 = (k - 1) + (N - k)$ degrees of freedom.`,
        r`$F = \frac{MSTr}{MSE}$; a large $F$ means at least one mean differs.`,
        r`After rejecting, compare pairs with the least significant difference.`,
      ],
      example: {
        problem: r`Three mixes give strengths 18, 21, 20, 19 / 24, 26, 23, 25 / 20, 22, 21, 23. Test equal means at 5% ($F_{0.05,2,9} = 4.26$).`,
        solution: r`Means 19.5, 24.5, 21.5; grand mean 21.83. $SSTr = 4(5.44 + 7.11 + 0.11) = 50.67$, $SSE = 5 + 5 + 5 = 15$. $F = \frac{50.67/2}{15/9} = 15.2 > 4.26$: the mixes differ.`,
      },
      traps: [r`Several separate t tests inflate the overall chance of a false alarm; that is why ANOVA comes first.`],
    },
    {
      name: 'Design of Experiments',
      inShort: r`Planning runs so that effects can be separated cleanly.`,
      keyIdeas: [
        r`Randomise run order, replicate, and block out nuisance factors (randomised complete block: $SST = SSTr + SSB + SSE$).`,
        r`A $2^k$ factorial runs every combination of two levels; a $2^{k - p}$ fraction screens many factors in fewer runs.`,
        r`Main effect $A = \frac{a + ab - b - (1)}{2n}$; interaction $AB = \frac{ab + (1) - a - b}{2n}$ (totals).`,
      ],
      example: {
        problem: r`A $2^2$ design with 2 replicates has totals $(1) = 42$, $a = 62$, $b = 50$, $ab = 90$. Find the effects.`,
        solution: r`$A = \frac{62 + 90 - 50 - 42}{4} = 15$, $B = \frac{50 + 90 - 62 - 42}{4} = 9$, $AB = \frac{90 + 42 - 62 - 50}{4} = 5$. A has the larger effect, and the two interact.`,
      },
      traps: [r`With a large interaction, report A's effect at each level of B, not just the average.`],
    },
  ],
};
