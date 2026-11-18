'use strict';

// ESAS › Research Methods formula cards (Library round, 2026-11-18): the topic
// had no cards. The numbers a thesis adviser (and the board) asks for: sample
// sizes (Slovin, proportion, mean), sampling intervals and allocations,
// reliability (Cronbach's alpha) and content validity, the Likert weighted
// mean, the common test statistics, and error types and power. The
// statistics themselves are taught in Mathematics › Probability & Statistics
// and Engineering Data Analytics; these are their research uses. See
// mathematics/algebra.js for the format; tests/environmentAndResearchFormulas.test.js
// checks each by simulation or an independent route.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const HYP = 'Hypotheses and Variables';
const SAMP = 'Sampling';
const VAL = 'Validity and Reliability';
const STAT = 'Statistical Treatment';
const DATA = 'Data Gathering';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const N_ = v(r`$N$`, 'population size');
const E_ = v(r`$e$`, 'margin of error (0.05 for 5%)');

const drafts = [
    // Hypotheses and Variables
    P(HYP, null, 'Type I and Type II Errors', r`$\alpha,\ \beta,\ 1 - \beta$`, r`$\alpha = P(\text{reject } H_0 \mid H_0 \text{ true});\quad \beta = P(\text{keep } H_0 \mid H_0 \text{ false});\quad \text{power} = 1 - \beta$`,
        [v(r`$\alpha$`, 'significance level (often 0.05)'), v(r`$\beta$`, 'chance of missing a real effect')],
        'The two ways a hypothesis test can be wrong, and its power to find a real effect.',
        'A larger sample raises power without raising α. Aim for power of 0.80 or more.'),
    // Sampling
    P(SAMP, null, "Slovin's Formula", r`$n = \frac{N}{1 + Ne^2}$`, r`$n = \frac{N}{1 + Ne^2}$`,
        [N_, E_],
        'A quick sample size for a survey of a known population, when nothing else is known.',
        'It equals the proportion formula with p = 0.5 and z ≈ 2 for large N. Round UP.'),
    P(SAMP, null, 'Sample Size for a Proportion', r`$n = \frac{z^2p(1 - p)}{e^2}$`, r`$n_0 = \frac{z^2p(1 - p)}{e^2},\qquad n = \frac{n_0}{1 + \frac{n_0 - 1}{N}}$`,
        [v(r`$z$`, 'z for the confidence level (1.96 for 95%)'), v(r`$p$`, 'expected proportion (0.5 if unknown)'), E_, N_],
        'How many to survey to estimate a percentage within a margin of error; the second form corrects for a small population.',
        '95% confidence, ±5%: 385 for a large population; 278 if N = 1000.'),
    P(SAMP, null, 'Sample Size for a Mean', r`$n = \left(\frac{z\sigma}{E}\right)^2$`, r`$n = \left(\frac{z\sigma}{E}\right)^2$`,
        [v(r`$z$`, 'z for the confidence level'), v(r`$\sigma$`, 'expected standard deviation'), v(r`$E$`, 'margin of error, in the data\'s units')],
        'How many measurements estimate an average within ±E.',
        'Halving the margin of error needs four times the sample.'),
    P(SAMP, null, 'Systematic and Stratified Sampling', r`$k = \frac{N}{n}$`, r`$\text{systematic interval } k = \frac{N}{n};\qquad \text{proportional allocation } n_h = n\frac{N_h}{N}$`,
        [N_, v(r`$n$`, 'sample size'), v(r`$N_h$`, 'size of stratum h')],
        'Picking every kth member after a random start; or sampling each subgroup in proportion to its size.',
        'Stratifying guarantees every group is represented and usually narrows the error.'),
    // Data Gathering
    P(DATA, null, 'Likert Weighted Mean', r`$\bar x_w = \frac{\sum f_iw_i}{\sum f_i}$`, r`$\bar x_w = \frac{\sum f_iw_i}{\sum f_i}$`,
        [v(r`$f_i$`, 'number of respondents choosing option i'), v(r`$w_i$`, 'the option\'s weight (5 strongly agree … 1 strongly disagree)')],
        'The average response to a Likert-scale item, read against an interpretation scale.',
        'On a 5-point scale the bands are 0.8 wide: 4.21–5.00 strongly agree, 3.41–4.20 agree, and so on.'),
    // Validity and Reliability
    P(VAL, null, "Cronbach's Alpha", r`$\alpha$`, r`$\alpha = \frac{k}{k - 1}\left(1 - \frac{\sum\sigma_i^2}{\sigma_T^2}\right)$`,
        [v(r`$k$`, 'number of items'), v(r`$\sigma_i^2$`, 'variance of each item'), v(r`$\sigma_T^2$`, 'variance of the total score')],
        'Internal-consistency reliability of a questionnaire: do its items measure the same thing?',
        '0.70 or more is usually acceptable, 0.80 good, 0.90 excellent; above about 0.95 suggests redundant items.'),
    P(VAL, null, 'Content Validity Index', r`$CVI = \frac{n_{agree}}{N}$`, r`$\text{I-CVI} = \frac{\text{experts rating the item relevant}}{\text{number of experts}};\qquad \text{S-CVI} = \text{mean of the I-CVIs}$`,
        [v(r`$N$`, 'number of expert raters')],
        'How well an instrument\'s items cover what they should, judged by a panel of experts.',
        'Items with I-CVI of 0.78 or more (with six or more experts) are usually kept.'),
    // Statistical Treatment
    P(STAT, null, 'Pearson Correlation Coefficient', r`$r$`, r`$r = \frac{\sum(x - \bar x)(y - \bar y)}{\sqrt{\sum(x - \bar x)^2\sum(y - \bar y)^2}},\qquad t = r\sqrt{\frac{n - 2}{1 - r^2}}$`,
        [v(r`$x, y$`, 'paired measurements'), v(r`$n$`, 'number of pairs')],
        'The strength and direction of a straight-line relationship between two variables.',
        'Correlation is not causation. Test it with t on n − 2 degrees of freedom.'),
    P(STAT, null, 'Chi-Square Test of Independence', r`$\chi^2 = \sum\frac{(O - E)^2}{E}$`, r`$\chi^2 = \sum\frac{(O - E)^2}{E},\qquad E = \frac{(\text{row total})(\text{column total})}{\text{grand total}},\qquad df = (r - 1)(c - 1)$`,
        [v(r`$O$`, 'observed counts'), v(r`$E$`, 'expected counts if the variables were independent')],
        'Whether two categorical variables (like course and preferred review mode) are related.',
        'Every expected count should be at least 5 for the test to hold.'),
    P(STAT, null, 'Two-Sample t-Test', r`$t = \frac{\bar x_1 - \bar x_2}{s_p\sqrt{1/n_1 + 1/n_2}}$`, r`$t = \frac{\bar x_1 - \bar x_2}{s_p\sqrt{\frac{1}{n_1} + \frac{1}{n_2}}},\qquad s_p^2 = \frac{(n_1 - 1)s_1^2 + (n_2 - 1)s_2^2}{n_1 + n_2 - 2}$`,
        [v(r`$\bar x_1, \bar x_2$`, 'group means'), v(r`$s_1, s_2$`, 'group standard deviations'), v(r`$n_1, n_2$`, 'group sizes')],
        'Whether two independent groups\' means differ (equal variances assumed).',
        'Degrees of freedom n₁ + n₂ − 2. For before-and-after on the same people, use the paired t-test.'),
];

module.exports = { subject: 'ESAS', topic: 'Research Methods', migration: '20261223000001_cards_research_methods', file, revisions, retire, drafts };
