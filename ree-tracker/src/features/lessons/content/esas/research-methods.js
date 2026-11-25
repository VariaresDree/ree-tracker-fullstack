// Library › Lessons › ESAS › Research Methods (2026-11-18; every subtopic in
// the module format 2026-11-25, with figures, examples a step at a time and
// checks; every number re-worked by researchLesson.test.js; the text,
// problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order. The statistics behind
// the tests are in Mathematics › Probability & Statistics and Engineering Data
// Analytics.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Standard normal CDF (Abramowitz and Stegun 7.1.26, error below 1.5e-7).
export const phi = (z) => {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
};
const pdf = (z) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);

// The lamp test: H0 mean 1000 h, sigma 100 h, n 25, one-tailed at 0.05.
export const LAMP = { mu0: 1000, sigma: 100, n: 25, xbar: 1040, mu1: 1050, zc: 1.645 };
export const se = () => LAMP.sigma / Math.sqrt(LAMP.n);
export const shift = () => (LAMP.mu1 - LAMP.mu0) / se();

export const slovin = (e) => (N) => N / (1 + N * e * e);
// Standardized alpha of k items whose average inter-item correlation is rbar.
export const alphaOf = (rbar) => (k) => (k * rbar) / (1 + (k - 1) * rbar);
export const itemsFor = (alpha, rbar) => Math.ceil((alpha * (1 - rbar)) / (rbar * (1 - alpha)));

// A household's monthly energy use, January to December (kWh).
export const MONTHLY = [450, 446, 458, 471, 480, 476, 466, 460, 454, 449, 447, 452];

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

export default {
  topic: 'Research Methods',
  subject: 'ESAS',
  overview: r`Research is a systematic way of answering a question with evidence. It starts with a clear problem, builds on what is already known, states what it expects (hypotheses), then chooses a design, a sample and instruments that will give valid and reliable data. The data are analysed with the right statistical test and reported honestly. Board items ask you to identify variables and designs, compute a sample size, judge reliability, pick the right test, and recognize ethical lapses like plagiarism.`,
  sources: [
    'Research Design: Qualitative, Quantitative and Mixed Methods Approaches (Creswell and Creswell)',
    'Practical Research: Planning and Design (Leedy and Ormrod)',
    'Publication Manual of the American Psychological Association, 7th edition',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Research Problem',
      inShort: r`A clear, answerable question worth investigating.`,
      body: [
        r`Every study follows the same path. It starts from a **problem**, a gap between what is and what should be, or between what is known and what needs knowing, and ends with a report that answers it:`,
        {
          type: 'blocks',
          alt: 'The research process in eight steps, down the left column and up the right: problem, literature, hypotheses, design, then sampling, data, analysis and report.',
          caption: 'The research process: each step depends on the one before it, and the report answers the problem.',
          blocks: [
            { id: 'p', at: [0, 0], label: 'Problem' },
            { id: 'l', at: [0, 1], label: 'Literature' },
            { id: 'h', at: [0, 2], label: 'Hypotheses' },
            { id: 'd', at: [0, 3], label: 'Design' },
            { id: 's', at: [1, 3], label: 'Sampling' },
            { id: 'g', at: [1, 2], label: 'Data' },
            { id: 'a', at: [1, 1], label: 'Analysis' },
            { id: 'r', at: [1, 0], label: 'Report' },
          ],
          links: [['p', 'l'], ['l', 'h'], ['h', 'd'], ['d', 's'], ['s', 'g'], ['g', 'a'], ['a', 'r']],
        },
        r`A good problem is **specific** (one population, one outcome), **researchable** (the data can be had in the time and budget), **significant** (someone benefits from the answer) and **ethical**. The **statement of the problem** gives one general objective, then specific questions that together answer it; each specific objective is SMART: specific, measurable, achievable, relevant and time-bound.

| Weak question | Why it fails | Researchable version |
|---|---|---|
| Is solar power good? | vague, opinion | How much does a 5 kW rooftop PV system cut a household's monthly bill over a year? |
| Why do motors fail? | too broad | What share of induction-motor failures at Plant X in 2020–2025 came from bearings? |
| Should we use LED lamps? | yes or no | What is the payback period of replacing a school's 400 fluorescent lamps with LED? |

**Scope and delimitation** say what is covered (place, period, population, variables) and what is deliberately left out; **significance** says who gains from the results.`,
      ],
      keyIdeas: [
        r`A good problem is specific, researchable with available data, significant, and ethical.`,
        r`The statement of the problem gives a general objective and specific questions; objectives are SMART.`,
        r`Scope and delimitation say what is and isn't covered; significance says who benefits.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sharpening a question',
          problem: r`Improve the question "Is solar power good?" into a researchable one.`,
          steps: [
            r`Name one population and place: households in Metro Manila with rooftop PV.`,
            r`Name one measurable outcome and period: the monthly electricity bill, over one year.`,
          ],
          answer: r`"How much does a 5 kW rooftop PV system reduce a Metro Manila household's monthly electricity bill over one year?": specific, measurable and bounded.`,
        },
        {
          level: 'board',
          title: 'General and specific objectives',
          problem: r`The general objective is "to assess the energy efficiency of the campus lighting system". Which of these belong as specific questions? (a) What is the installed lighting load of each building? (b) How do the measured illuminance levels compare with the PEC and IES recommendations? (c) Should the university hire more electricians? (d) What is the payback period of converting to LED?`,
          steps: [
            r`Each specific question must help answer the general objective and be measurable.`,
            r`(a), (b) and (d) measure load, adequacy and cost of the lighting system.`,
            r`(c) is a staffing opinion, outside the objective and not answerable from lighting data.`,
          ],
          answer: r`(a), (b) and (d); (c) is out of scope.`,
        },
      ],
      traps: [
        r`A question answered by yes or no from opinion is not a research problem.`,
        r`The delimitation is chosen by the researcher; a limitation is a weakness the researcher could not avoid.`,
      ],
      check: [
        { q: r`What does SMART stand for?`, a: r`Specific, measurable, achievable, relevant and time-bound.` },
        { q: r`What is the difference between scope and significance?`, a: r`Scope says what the study covers and leaves out; significance says who benefits from it.` },
      ],
    },
    {
      name: 'Review of Literature',
      inShort: r`What is already known, and where the gap is.`,
      body: [
        r`The review shows what is already known so the study builds on it. Search journals, theses, conference papers, standards and books; prefer **recent, peer-reviewed** work, and judge each source by its currency, relevance, authority and accuracy. Then **synthesize**: group studies by theme, show where they agree and conflict, and end with the **gap** your study fills.

A synthesis matrix keeps this honest: one row per source, one column per theme.

| Source | Method | Finding on savings | Gap left |
|---|---|---|---|
| Study A (2021) | survey of 120 homes | 18–25% lower bills | no net-metering data |
| Study B (2023) | metered 30 homes | 22% lower bills | one subdivision only |
| Study C (2024) | simulation | 30% possible | not measured |

The review ends with the study's **framework**. Many Philippine theses use the input–process–output model:`,
        {
          type: 'blocks',
          alt: 'An input, process, output framework: three boxes left to right, with a feedback arrow running from output back to input underneath.',
          caption: 'Input–process–output: what the study starts with, what it does, and what it produces; the result feeds back to improve the input.',
          blocks: [
            { id: 'i', at: [0, 0], label: 'Input' },
            { id: 'p', at: [1, 0], label: 'Process' },
            { id: 'o', at: [2, 0], label: 'Output' },
          ],
          links: [
            ['i', 'p'],
            ['p', 'o'],
            ['o', 'i', { label: 'feedback', via: [[2, 1], [0, 1]] }],
          ],
        },
        r`Cite every source in one style. APA (author–date) is common in social and education research; IEEE (numbered in order of first citation) in engineering.`,
      ],
      keyIdeas: [
        r`Find and evaluate sources: journals, theses, standards; prefer recent, peer-reviewed work.`,
        r`Synthesize (compare, connect, critique), don't just summarize source after source.`,
        r`Cite consistently (APA or IEEE); the review ends by showing the gap your study fills and its framework.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Summary or synthesis?',
          problem: r`Your review lists ten studies, one paragraph each, with no comparison. What is wrong?`,
          steps: [
            r`One paragraph per study is a summary: it never says how the studies relate.`,
            r`Group the studies by theme, show where they agree and conflict, and lead to the gap.`,
          ],
          answer: r`It summarizes instead of synthesizing. Group the studies by theme, show where they agree and conflict, and lead to the gap the study addresses.`,
        },
        {
          level: 'board',
          title: 'Recent sources, and one citation two ways',
          problem: r`Your adviser wants at least 70% of your 40 references from the last five years; 22 are. How many more recent ones do you need (replacing old ones)? Then cite the made-up paper by M. A. Santos and J. P. Reyes, "Rooftop solar and household bills in Metro Manila", Philippine Engineering Journal, volume 45, issue 2, pages 33–48, 2024, in APA and in IEEE.`,
          steps: [
            r`$0.70 \times 40 = 28$ recent references needed; $28 - 22 = 6$ more.`,
            r`APA: Santos, M. A., & Reyes, J. P. (2024). Rooftop solar and household bills in Metro Manila. *Philippine Engineering Journal, 45*(2), 33–48. In text: (Santos & Reyes, 2024).`,
            r`IEEE: [1] M. A. Santos and J. P. Reyes, "Rooftop solar and household bills in Metro Manila," *Philippine Engineering Journal*, vol. 45, no. 2, pp. 33–48, 2024. In text: [1].`,
          ],
          answer: r`6 more; APA cites by author and year, IEEE by a bracketed number.`,
        },
      ],
      traps: [
        r`Wikipedia and blogs can point you to sources, but they aren't scholarly sources themselves.`,
        r`In APA, three or more authors become "et al." in the text from the first citation.`,
      ],
      check: [
        { q: r`What does a review of literature end with?`, a: r`The gap the study fills, and the framework it uses.` },
        { q: r`How does IEEE style cite in the text?`, a: r`By a number in square brackets, in order of first citation.` },
      ],
    },
    {
      name: 'Hypotheses and Variables',
      inShort: r`What the study expects to find, and what it measures and controls.`,
      body: [
        r`A study names its variables before it collects anything:

| Variable | Role | Lamp example |
|---|---|---|
| Independent | manipulated, or the presumed cause | lamp design |
| Dependent | measured outcome | hours to failure |
| Control | held constant | supply voltage, temperature |
| Extraneous | uncontrolled, could confound | switching frequency |
| Moderating | changes the strength of the effect | ambient humidity |

The **null hypothesis** $H_0$ says there is no effect or difference; the **alternative** $H_1$ says there is. A one-tailed $H_1$ names the direction ($\mu > 1000$); a two-tailed one does not ($\mu \ne 1000$). The test can go wrong two ways:

| Decision | $H_0$ true | $H_0$ false |
|---|---|---|
| Reject $H_0$ | Type I error, probability $\alpha$ | correct, power $1 - \beta$ |
| Keep $H_0$ | correct | Type II error, probability $\beta$ |

The picture shows both risks for a one-tailed test at $\alpha = 0.05$, when the true mean sits 2.5 standard errors above the claim:`,
        {
          type: 'plot',
          alt: 'Two bell curves of the test statistic: one centred at 0 if the null hypothesis is true, one centred at 2.5 if the true mean is 1050 hours. A dashed line at z equals 1.645 marks the critical value; the shaded tail of the first curve beyond it is alpha, 0.05, and the shaded part of the second curve below it is beta, about 0.20.',
          caption: 'Critical value 1.645: the shaded tail of the H₀ curve beyond it is α = 0.05; the shaded part of the H₁ curve below it is β ≈ 0.20, so the power is about 0.80.',
          x: [-3, 6],
          y: [0, 0.5],
          xLabel: 'z, in standard errors',
          yLabel: 'density',
          series: [
            { f: pdf, label: 'H₀ true' },
            { f: (z) => pdf(z - shift()), label: 'mean 1050 h', dashed: true, colour: colourOf(1) },
            { points: range(LAMP.zc, 6, 40).map((z) => [z, pdf(z)]), area: true, colour: colourOf(0) },
            { points: range(-3, LAMP.zc, 60).map((z) => [z, pdf(z - shift())]), area: true, colour: colourOf(1) },
          ],
          marks: [{ x: LAMP.zc, label: '1.645' }],
        },
      ],
      keyIdeas: [
        r`Independent variable (manipulated or cause), dependent (measured outcome), control (held constant), extraneous and moderating variables.`,
        r`Null hypothesis $H_0$: no effect or difference; alternative $H_1$: there is one.`,
        r`Type I error $\alpha$ (rejecting a true $H_0$), Type II $\beta$ (missing a real effect); power $= 1 - \beta$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Naming the variables',
          problem: r`A study tests whether adding capacitor banks of different sizes raises a plant's power factor. Name the variables and the null hypothesis.`,
          steps: [
            r`What is changed on purpose: capacitor size, the independent variable.`,
            r`What is measured: power factor, the dependent variable. Load and voltage are held constant.`,
            r`$H_0$ says there is no effect.`,
          ],
          answer: r`Independent: capacitor size; dependent: power factor; controlled: load, voltage. $H_0$: capacitor size has no effect on power factor.`,
        },
        {
          level: 'board',
          title: 'A one-tailed test and its power',
          problem: r`A maker claims its lamps last 1000 h ($\sigma = 100$ h). A new design is tested on 25 lamps, with a mean life of 1040 h. At $\alpha = 0.05$, does the new design last longer? If its true mean is 1050 h, what is the test's power?`,
          steps: [
            r`$H_0$: $\mu = 1000$; $H_1$: $\mu > 1000$ (one-tailed, critical $z = 1.645$).`,
            r`Standard error $\frac{100}{\sqrt{25}} = 20$ h; $z = \frac{1040 - 1000}{20} = 2.00$.`,
            r`$2.00 > 1.645$: reject $H_0$ (the p-value is $0.023$).`,
            r`If $\mu = 1050$, the statistic centres at $\frac{50}{20} = 2.5$; $\beta = P(z < 1.645 - 2.5) = P(z < -0.855) = 0.196$.`,
            r`Power $= 1 - 0.196 = 0.804$.`,
          ],
          answer: r`Yes, z = 2.00 > 1.645; the power is about 0.80.`,
        },
      ],
      traps: [
        r`Failing to reject $H_0$ is not proof that $H_0$ is true.`,
        r`One-tailed at 0.05 uses 1.645; two-tailed uses 1.96. Choose the tail before seeing the data.`,
      ],
      check: [
        { q: r`What is a Type II error?`, a: r`Keeping $H_0$ when it is false: missing a real effect.` },
        { q: r`Name two ways to raise a test's power.`, a: r`A larger sample (smaller standard error), or a larger $\alpha$; a larger true effect also helps.` },
      ],
    },
    {
      name: 'Research Design',
      inShort: r`The overall plan for answering the question.`,
      body: [
        r`The design decides what the study can claim. Two questions sort the quantitative designs: does the researcher apply a treatment, and are subjects assigned to groups at random?`,
        {
          type: 'blocks',
          alt: 'A decision diagram. Treatment applied? If no, the design is non-experimental. If yes, random assignment? If yes, a true experiment; if no, quasi-experimental.',
          caption: 'Sorting quantitative designs. Non-experimental covers correlational and descriptive (survey) studies.',
          blocks: [
            { id: 't', at: [0, 0], label: 'Treatment?' },
            { id: 'r', at: [0, 1], label: 'Random?' },
            { id: 'e', at: [0, 2], label: 'Experiment' },
            { id: 'q', at: [1, 2], label: 'Quasi' },
            { id: 'n', at: [2, 2], label: 'Non-exp.' },
          ],
          links: [
            ['t', 'r', { label: 'yes' }],
            ['r', 'e', { label: 'yes' }],
            ['r', 'q', { label: 'no', via: [[1, 1]] }],
            ['t', 'n', { label: 'no', via: [[2, 0]] }],
          ],
        },
        r`| Design | What it does | Can claim |
|---|---|---|
| Experimental | treatment, control group, random assignment | cause and effect |
| Quasi-experimental | treatment on intact groups (sections, plants) | cause, with caution |
| Correlational | measures how two variables move together | association only |
| Descriptive (survey) | describes a population as it is | what is, how much |

**Qualitative** designs study meanings and experiences in depth: case study, phenomenology, grounded theory, ethnography. **Mixed methods** combine both. **Cross-sectional** studies measure once; **longitudinal** studies follow the same subjects over time.

A pretest–posttest design with a control group removes what would have changed anyway: the effect is the treated group's gain minus the control group's gain.`,
      ],
      keyIdeas: [
        r`Quantitative: experimental (random assignment, control), quasi-experimental, correlational, descriptive (survey).`,
        r`Qualitative: case study, phenomenology, grounded theory, ethnography. Mixed methods combine both.`,
        r`Cross-sectional (one time) vs longitudinal (over time).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Classifying two studies',
          problem: r`Classify: (a) surveying 300 engineers once about their CPD habits; (b) assigning motors at random to two lubricants and measuring temperature rise.`,
          steps: [
            r`(a) No treatment, one point in time: descriptive, cross-sectional.`,
            r`(b) A treatment (lubricant) with random assignment: experimental.`,
          ],
          answer: r`(a) Descriptive, cross-sectional survey. (b) Experimental: random assignment and a manipulated variable.`,
        },
        {
          level: 'board',
          title: 'Intact sections, and the real effect',
          problem: r`A review center gives a new drill program to one section and the usual program to another (sections as enrolled). Mean scores: drill section 62 before, 78 after; usual section 60 before, 66 after. Name the design and estimate the program's effect.`,
          steps: [
            r`A treatment, but intact sections rather than random assignment: quasi-experimental, pretest–posttest with a control group.`,
            r`Gains: drill $78 - 62 = 16$; usual $66 - 60 = 6$.`,
            r`Effect $= 16 - 6 = 10$ points: the usual program's gain would have happened anyway.`,
          ],
          answer: r`Quasi-experimental; about 10 points.`,
        },
      ],
      traps: [
        r`Only an experiment with random assignment supports cause-and-effect claims.`,
        r`A strong correlation is still not causation: a third variable may drive both.`,
      ],
      check: [
        { q: r`What separates an experiment from a quasi-experiment?`, a: r`Random assignment of subjects to the groups.` },
        { q: r`What is a longitudinal study?`, a: r`One that follows the same subjects over time.` },
      ],
    },
    {
      name: 'Sampling',
      inShort: r`Choosing who or what to study, and how many.`,
      body: [
        r`The **population** is everyone the results are meant for; the **sampling frame** is the list you draw from; the **sample** is who you actually study.

| Probability sampling | How | Non-probability | How |
|---|---|---|---|
| Simple random | every member equally likely | Convenience | whoever is at hand |
| Systematic | every $k$th, $k = \frac{N}{n}$, random start | Purposive | chosen for a trait |
| Stratified | random within strata, $n_h = n\frac{N_h}{N}$ | Quota | fill set numbers per group |
| Cluster | random whole groups | Snowball | members recruit members |

Only probability samples support inference to the population. Slovin's formula $n = \frac{N}{1 + Ne^2}$ gives a size for a margin of error $e$; the size levels off at $\frac{1}{e^2}$ however large the population:`,
        {
          type: 'plot',
          alt: 'Sample size by Slovin formula against population on a log scale from 100 to 100 thousand. At a 5 percent margin, the size rises to 286 at a population of 1000 and levels off near 400; at a 3 percent margin, it levels off near 1111.',
          caption: 'Slovin sample size against population: it levels off at 1/e², 400 at ±5% and 1111 at ±3%.',
          x: [100, 100000],
          y: [0, 1200],
          logX: true,
          xLabel: 'population N',
          yLabel: 'sample n',
          series: [
            { f: slovin(0.03), label: '±3%', dashed: true, colour: colourOf(1) },
            { f: slovin(0.05), label: '±5%', colour: colourOf(0) },
          ],
          marks: [{ at: [1000, slovin(0.05)(1000)], label: '286' }],
        },
        r`For a proportion at 95% confidence, $n_0 = \frac{z^2p(1 - p)}{e^2}$ with $p = 0.5$ when unknown, corrected for a finite population as $\frac{n_0}{1 + (n_0 - 1)/N}$. The margin shrinks only as $\frac{1}{\sqrt n}$: quadrupling the sample halves it.`,
      ],
      keyIdeas: [
        r`Probability: simple random, systematic ($k = \frac{N}{n}$), stratified ($n_h = n\frac{N_h}{N}$), cluster. Non-probability: convenience, purposive, quota, snowball.`,
        r`Slovin $n = \frac{N}{1 + Ne^2}$; for a proportion $\frac{z^2p(1 - p)}{e^2}$ with a finite correction.`,
        r`Larger samples narrow the margin of error, but as $\frac{1}{\sqrt n}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two ways to size a survey',
          problem: r`A school has 1000 students. How many should be surveyed for ±5% (Slovin)? And by the proportion formula at 95% confidence?`,
          steps: [
            r`Slovin: $\frac{1000}{1 + 1000(0.0025)} = 285.7$, so 286.`,
            r`Proportion: $n_0 = \frac{1.96^2(0.25)}{0.05^2} = 384.2$.`,
            r`Corrected: $\frac{384.2}{1 + 383.2/1000} = 277.7$, so 278.`,
          ],
          answer: r`286 by Slovin; 278 by the proportion formula.`,
        },
        {
          level: 'board',
          title: 'Strata, a systematic draw, and the margin',
          problem: r`A college of 1000 students has 450 in EE, 350 in ME and 200 in CE. (a) Allocate a stratified sample of 200 proportionally. (b) For a systematic sample of 200 from the full list, what is the interval? (c) What margin of error does a random sample of 400 give at 95% confidence?`,
          steps: [
            r`(a) $200 \times \frac{450}{1000} = 90$ EE, $200 \times \frac{350}{1000} = 70$ ME, $200 \times \frac{200}{1000} = 40$ CE.`,
            r`(b) $k = \frac{1000}{200} = 5$: pick a random start from 1 to 5, then every 5th name.`,
            r`(c) $e = 1.96\sqrt{\frac{0.25}{400}} = 0.049$, about ±4.9%.`,
          ],
          answer: r`90, 70 and 40; every 5th; about ±4.9%.`,
        },
      ],
      traps: [
        r`Always round a sample size UP.`,
        r`A large convenience sample is still biased; size does not fix how the sample was chosen.`,
      ],
      check: [
        { q: r`What does Slovin's sample size approach as the population grows?`, a: r`$\frac{1}{e^2}$: 400 at a 5% margin.` },
        { q: r`How much must a sample grow to halve the margin of error?`, a: r`Four times.` },
      ],
    },
    {
      name: 'Data Gathering',
      inShort: r`Instruments and procedures for collecting data.`,
      body: [
        r`| Instrument | Best for | Watch out for |
|---|---|---|
| Questionnaire | many respondents, attitudes, facts | low return, leading items |
| Interview | depth, reasons, follow-up questions | interviewer bias, time |
| Observation | what people actually do | the observed change behaviour |
| Measurement, experiment | physical quantities | calibration, procedure drift |
| Existing records | history, large data | missing or inconsistent entries |

A **Likert** item asks how far a respondent agrees, from 5 (strongly agree) to 1 (strongly disagree). An item's result is the weighted mean $\frac{\sum fw}{\sum f}$, read against equal bands of width $\frac{5 - 1}{5} = 0.8$:

| Weighted mean | Verbal interpretation |
|---|---|
| 4.21–5.00 | strongly agree |
| 3.41–4.20 | agree |
| 2.61–3.40 | neutral |
| 1.81–2.60 | disagree |
| 1.00–1.80 | strongly disagree |

**Pilot-test** an instrument on a small group like the respondents before using it, and keep a written protocol so every respondent is treated the same way.`,
      ],
      keyIdeas: [
        r`Questionnaires, interviews, observation, experiments and measurements, existing records.`,
        r`Likert items (5 strongly agree … 1 strongly disagree) are summarized by the weighted mean $\frac{\sum fw}{\sum f}$.`,
        r`Pilot-test instruments before full use; keep a protocol so data are gathered the same way each time.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A Likert item',
          problem: r`On one item 10 respondents strongly agree, 20 agree, 5 are neutral, 3 disagree and 2 strongly disagree. Find the weighted mean and its meaning.`,
          steps: [
            r`$\sum fw = 10(5) + 20(4) + 5(3) + 3(2) + 2(1) = 153$; $\sum f = 40$.`,
            r`$\frac{153}{40} = 3.83$, inside 3.41–4.20.`,
          ],
          answer: r`3.83: "agree".`,
        },
        {
          level: 'board',
          title: 'Returns, and a flawed item',
          problem: r`A survey went to 400 linemen; 312 came back, 12 of them incomplete. What is the usable response rate? What is wrong with the item "Are the safety trainings and the PPE supplied adequate?"`,
          steps: [
            r`Usable: $312 - 12 = 300$; rate $= \frac{300}{400} = 75\%$.`,
            r`The item asks two things at once (training and PPE): a double-barreled question. A "yes" can't be read.`,
            r`Split it into one item on training and one on PPE.`,
          ],
          answer: r`75%; it is double-barreled, so split it.`,
        },
      ],
      traps: [
        r`Leading questions ("Don't you agree that…") bias the answers.`,
        r`Report the rate of usable returns, not just the returns.`,
      ],
      check: [
        { q: r`Why pilot-test a questionnaire?`, a: r`To find unclear, leading or double-barreled items and timing problems before the real survey.` },
        { q: r`What does a weighted mean of 2.40 mean on a 5-point scale?`, a: r`Disagree (1.81–2.60).` },
      ],
    },
    {
      name: 'Validity and Reliability',
      inShort: r`Does the instrument measure the right thing, and does it measure it consistently?`,
      body: [
        r`**Validity** asks whether an instrument measures what it claims to; **reliability** asks whether it gives the same result each time.

| Validity | Evidence | Reliability | Evidence |
|---|---|---|---|
| Content | experts judge the items cover the topic | Test–retest | same people, two occasions, correlated |
| Construct | items behave as the theory predicts | Inter-rater | two raters agree |
| Criterion | scores agree with an accepted measure | Internal consistency | items agree with each other (Cronbach's $\alpha$) |

Cronbach's alpha is $\alpha = \frac{k}{k - 1}\left(1 - \frac{\sum\sigma_i^2}{\sigma_T^2}\right)$. A common reading: 0.90 and up excellent, 0.80 good, 0.70 acceptable, 0.60 questionable, below 0.50 unacceptable. Alpha rises with the number of items: with an average inter-item correlation $\bar r$, $\alpha = \frac{k\bar r}{1 + (k - 1)\bar r}$:`,
        {
          type: 'plot',
          alt: 'Cronbach alpha against the number of items from 1 to 30, for average inter-item correlations of 0.3 and 0.2. Both curves rise and flatten; the 0.3 curve crosses the 0.70 line at about 6 items, the 0.2 curve at about 10 items.',
          caption: 'Alpha against the number of items: with items correlating 0.2 on average, 10 items reach 0.70; at 0.3, 6 do.',
          x: [1, 30],
          y: [0, 1],
          xLabel: 'items k',
          yLabel: 'alpha',
          series: [
            { f: alphaOf(0.3), label: 'r̄ = 0.3' },
            { f: alphaOf(0.2), label: 'r̄ = 0.2', dashed: true, colour: colourOf(1) },
          ],
          marks: [{ y: 0.7, label: '0.70' }],
        },
        r`**Internal validity** means nothing but the treatment explains the result (no confounds); **external validity** means the result holds beyond the sample.`,
      ],
      keyIdeas: [
        r`Validity: content (expert review, CVI), construct, criterion. Reliability: test-retest, inter-rater, internal consistency.`,
        r`Cronbach's $\alpha = \frac{k}{k - 1}\left(1 - \frac{\sum\sigma_i^2}{\sigma_T^2}\right)$; 0.70 or more is acceptable.`,
        r`Internal validity (no confounds) vs external validity (results generalize).`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Cronbach's alpha",
          problem: r`A 10-item scale has item variances summing to 12 and a total-score variance of 40. Find Cronbach's alpha.`,
          steps: [
            r`$1 - \frac{12}{40} = 0.7$.`,
            r`$\frac{10}{9}(0.7) = 0.78$.`,
          ],
          answer: r`0.78: acceptable.`,
        },
        {
          level: 'board',
          title: 'How many items?',
          problem: r`Pilot data show the items of a scale correlate 0.2 with each other on average. How many items are needed for $\alpha \ge 0.70$? Check your answer.`,
          steps: [
            r`Solve $\frac{k\bar r}{1 + (k - 1)\bar r} = \alpha$ for $k$: $k = \frac{\alpha(1 - \bar r)}{\bar r(1 - \alpha)} = \frac{0.7(0.8)}{0.2(0.3)} = 9.33$.`,
            r`Round up: 10 items.`,
            r`Check: $\frac{10(0.2)}{1 + 9(0.2)} = \frac{2}{2.8} = 0.714$.`,
          ],
          answer: r`10 items (alpha 0.714).`,
        },
      ],
      traps: [
        r`A reliable instrument can still be invalid: consistently measuring the wrong thing.`,
        r`A very high alpha (above 0.95) can mean redundant items asking the same thing.`,
      ],
      check: [
        { q: r`Which reliability does Cronbach's alpha measure?`, a: r`Internal consistency.` },
        { q: r`What threatens internal validity?`, a: r`Confounds: anything other than the treatment that could explain the result.` },
      ],
    },
    {
      name: 'Statistical Treatment',
      inShort: r`Choosing and applying the right statistical tool.`,
      body: [
        r`The tool follows from the question and the type of data:

| Question | Data | Tool |
|---|---|---|
| Describe | any | frequency, percent, mean, standard deviation |
| Relate two variables | interval or ratio | Pearson $r$, regression |
| Relate two variables | ranks | Spearman $\rho$ |
| Relate two variables | categories (counts) | chi-square test of independence |
| Compare two means | independent groups | t-test |
| Compare two means | same subjects before and after | paired t-test |
| Compare three or more means | groups | one-way ANOVA |

Every test ends the same way: reject $H_0$ when the p-value is below $\alpha$, or when the statistic passes its critical value. For counts, $\chi^2 = \sum\frac{(O - E)^2}{E}$ with expected count $E = \frac{\text{row total} \times \text{column total}}{\text{grand total}}$ and $(r - 1)(c - 1)$ degrees of freedom; the critical value for 1 df at 0.05 is 3.84.

Pearson's $r = \frac{S_{xy}}{\sqrt{S_{xx}S_{yy}}}$, where $S_{xy} = \sum(x - \bar x)(y - \bar y)$, runs from −1 to 1; the least-squares line has slope $\frac{S_{xy}}{S_{xx}}$ and passes through $(\bar x, \bar y)$.`,
      ],
      keyIdeas: [
        r`Describe: frequency, percent, mean, standard deviation. Relate: Pearson $r$ (interval), Spearman (ranks), chi-square (categories).`,
        r`Compare means: t-test (two groups), paired t (before/after), ANOVA (three or more).`,
        r`Reject $H_0$ when the p-value is below $\alpha$ (or the statistic exceeds its critical value).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Chi-square on a 2 × 2 table',
          problem: r`Of 50 day-shift workers 30 prefer online review, and of 50 night-shift workers 10 do. Is preference related to shift ($\alpha = 0.05$)?`,
          steps: [
            r`Totals: 40 prefer online, 60 don't; each row 50 of 100. Expected: $\frac{50 \times 40}{100} = 20$ online and 30 not, per row.`,
            r`$\chi^2 = \frac{10^2}{20} + \frac{10^2}{20} + \frac{10^2}{30} + \frac{10^2}{30} = 16.7$.`,
            r`1 df: $16.7 > 3.84$, reject $H_0$.`,
          ],
          answer: r`Yes: $\chi^2 = 16.7$ with 1 df, above 3.84, so preference depends on shift.`,
        },
        {
          level: 'board',
          title: 'Correlation and a prediction',
          problem: r`Five reviewees' weekly study hours and mock scores: (2, 60), (4, 65), (6, 75), (8, 80), (10, 90). Find Pearson's r, the least-squares line, and the predicted score at 7 hours.`,
          steps: [
            r`$\bar x = 6$, $\bar y = 74$. Deviations: $x$: −4, −2, 0, 2, 4; $y$: −14, −9, 1, 6, 16.`,
            r`$S_{xy} = 56 + 18 + 0 + 12 + 64 = 150$, $S_{xx} = 40$, $S_{yy} = 570$.`,
            r`$r = \frac{150}{\sqrt{40 \times 570}} = 0.993$: a very strong positive correlation.`,
            r`Slope $\frac{150}{40} = 3.75$; intercept $74 - 3.75(6) = 51.5$: $\hat y = 51.5 + 3.75x$.`,
            r`At 7 hours: $51.5 + 3.75(7) = 77.75$.`,
          ],
          answer: r`r = 0.993; ŷ = 51.5 + 3.75x; about 77.8 at 7 hours.`,
        },
      ],
      traps: [
        r`Use a t-test for means and chi-square for counts; never chi-square on percentages.`,
        r`Predict only inside the range of the data: 20 hours a week would give an impossible 126.5.`,
      ],
      check: [
        { q: r`Which test compares the mean scores of three review centers?`, a: r`One-way ANOVA.` },
        { q: r`Which test compares the same students' scores before and after a program?`, a: r`The paired t-test.` },
      ],
    },
    {
      name: 'Presentation of Results',
      inShort: r`Showing findings clearly in text, tables and graphs.`,
      body: [
        r`Each finding is **presented** (the table or graph), **analysed** (what the numbers say) and **interpreted** (what they mean, and how they compare with the literature). Pick the graph by what it must show:

| To show | Use |
|---|---|
| a trend over time | line graph |
| a comparison between groups | bar graph |
| parts of a whole | pie chart or stacked bar |
| a relationship between two variables | scatter plot |
| a distribution | histogram |

Every table and figure is numbered, titled, and referred to in the text before it appears. Scales must be honest. The same twelve months of a household's energy use look calm on a full axis:`,
        {
          type: 'plot',
          alt: 'Monthly energy use, January to December, on an axis from 0 to 500 kilowatt-hours: a nearly flat line between 446 and 480.',
          caption: 'Monthly energy use on a full axis from zero: it barely changes.',
          x: [0, 13],
          y: [0, 500],
          xLabel: 'month',
          yLabel: 'kWh',
          series: [{ points: MONTHLY.map((v, i) => [i + 1, v]) }],
        },
        r`and alarming when the axis is cut to a narrow band:`,
        {
          type: 'plot',
          alt: 'The same monthly energy use on an axis from 440 to 485 kilowatt-hours: the line now swings steeply from 446 up to a peak of 480 in May and back down.',
          caption: 'The same data on a truncated axis from 440: a 34 kWh swing looks like a surge.',
          x: [0, 13],
          y: [440, 485],
          xLabel: 'month',
          yLabel: 'kWh',
          series: [{ points: MONTHLY.map((v, i) => [i + 1, v]), colour: colourOf(1) }],
        },
        r`If a cut axis is needed to show detail, say so and mark the break.`,
      ],
      keyIdeas: [
        r`Present, analyse, then interpret: what the numbers say, what they mean, how they compare with the literature.`,
        r`Graphs: line for trends, bar for comparisons, pie for parts of a whole, scatter for relationships, histogram for distributions.`,
        r`Every table and figure is numbered, titled and referred to in the text.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Choosing the graph',
          problem: r`Which graph shows (a) monthly energy use over two years, (b) the share of each load type in a building, (c) whether temperature and demand are related?`,
          steps: [
            r`(a) A trend over time.`,
            r`(b) Parts of a whole.`,
            r`(c) A relationship between two variables.`,
          ],
          answer: r`(a) Line graph; (b) pie or stacked bar; (c) scatter plot.`,
        },
        {
          level: 'board',
          title: 'Reporting a change honestly',
          problem: r`A household's average monthly bill fell from 3200 to 2720 pesos after PV was installed. State the change as a percent, and write the sentence that presents it.`,
          steps: [
            r`Change $= 3200 - 2720 = 480$ pesos; $\frac{480}{3200} = 15\%$.`,
            r`Present it with the table it comes from, in the past tense: "As Table 4.2 shows, the average monthly bill decreased by 15%, from 3200 to 2720 pesos."`,
            r`Then interpret: compare with the 18–25% the literature reports, and suggest why it is lower.`,
          ],
          answer: r`A 15% decrease, reported with its table and compared with the literature.`,
        },
      ],
      traps: [
        r`A truncated axis can make a small difference look huge.`,
        r`Percent change is divided by the starting value, not the ending one.`,
      ],
      check: [
        { q: r`What three things does a results chapter do with each finding?`, a: r`Present it, analyse it, and interpret it.` },
        { q: r`Which graph shows a distribution?`, a: r`A histogram.` },
      ],
    },
    {
      name: 'Ethics and Plagiarism',
      inShort: r`Doing research honestly and treating participants fairly.`,
      body: [
        r`Research with people rests on three principles: **respect** (informed, voluntary consent; the right to withdraw), **beneficence** (no harm, risks outweighed by benefits) and **justice** (fair choice of participants). Studies with human participants go through an ethics review board, and personal data are kept confidential.

Misconduct has three forms, and plagiarism has several faces:

| Misconduct | Meaning |
|---|---|
| Fabrication | making up data or results |
| Falsification | changing or omitting data so results mislead |
| Plagiarism | using others' words or ideas without credit |
| Self-plagiarism | reusing your own published work without citing it |
| Gift authorship | naming an author who did not contribute |

Two Philippine laws apply directly: the **Data Privacy Act** (RA 10173, 2012) governs collecting and keeping personal data, and the **Intellectual Property Code** (RA 8293, 1997) protects authors' work, generally for the author's life plus 50 years.

To use a source honestly: quote exact words in quotation marks with a citation, or paraphrase fully in your own words and structure, **and** cite. A similarity report flags matching text; a human still judges whether it is plagiarism.`,
      ],
      keyIdeas: [
        r`Informed consent, voluntary participation, confidentiality, no harm; ethics review for human participants.`,
        r`Plagiarism: using others' words or ideas without credit, including self-plagiarism. Fabrication and falsification of data are misconduct.`,
        r`Data Privacy Act (RA 10173, 2012) protects personal data; the IP Code (RA 8293) protects authors' work.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A close paraphrase',
          problem: r`A student paraphrases a journal paragraph closely, changing a few words, with no citation. Is it plagiarism?`,
          steps: [
            r`The ideas and structure are still the author's; changing words doesn't make them yours.`,
            r`Paraphrase in your own words AND cite; quote exact words in quotation marks.`,
          ],
          answer: r`Yes: the ideas and structure are someone else's. Paraphrase in your own words AND cite the source; quote exact words in quotation marks.`,
        },
        {
          level: 'board',
          title: 'Naming the lapse',
          problem: r`Name each: (a) dropping three readings that spoil a trend, without saying so; (b) filling in 20 questionnaires the researcher never gave out; (c) submitting last year's published paper again as new; (d) collecting respondents' names and phone numbers without telling them why.`,
          steps: [
            r`(a) Real data altered or omitted to mislead: falsification.`,
            r`(b) Data that never existed: fabrication.`,
            r`(c) Own work reused without citation: self-plagiarism.`,
            r`(d) Personal data without informed consent: a breach of the Data Privacy Act (RA 10173).`,
          ],
          answer: r`(a) falsification; (b) fabrication; (c) self-plagiarism; (d) a data privacy breach.`,
        },
      ],
      traps: [
        r`Citing a source doesn't excuse copying its words without quotation marks.`,
        r`Removing outliers is allowed only with a stated rule, reported in the methods.`,
      ],
      check: [
        { q: r`What is the difference between fabrication and falsification?`, a: r`Fabrication invents data; falsification alters or omits real data.` },
        { q: r`Which law governs personal data gathered in a survey?`, a: r`The Data Privacy Act, RA 10173 (2012).` },
      ],
    },
    {
      name: 'Technical Writing',
      inShort: r`Writing research clearly, accurately and concisely.`,
      body: [
        r`A journal paper follows **IMRaD**; a Philippine undergraduate thesis spreads the same parts over five chapters:

| Thesis chapter | Contents | IMRaD part |
|---|---|---|
| 1 The problem | background, statement of the problem, hypotheses, scope, significance | Introduction |
| 2 Related literature | review, synthesis, framework | Introduction |
| 3 Methodology | design, sample, instruments, procedure, statistical treatment | Methods |
| 4 Results and discussion | tables, graphs, analysis, interpretation | Results and Discussion |
| 5 Summary, conclusions, recommendations | answers to each question | Discussion |

The **abstract** (about 150–250 words) states the purpose, method, main results and conclusion, so it is written last.

Write plainly and precisely: one idea per sentence, the same term for the same thing throughout, past tense for what was done, present tense for what is generally true. Numbers and units follow SI: a space between the number and the unit (230 V, 5 kW), unit symbols in their exact case, no plural "s" on symbols.`,
      ],
      keyIdeas: [
        r`Papers follow IMRaD: Introduction, Methods, Results and Discussion. A Philippine thesis: Chapter 1 the problem, 2 related literature, 3 methodology, 4 results and discussion, 5 summary, conclusions and recommendations.`,
        r`The abstract (about 150–250 words) states the purpose, method, main results and conclusion.`,
        r`Plain, precise language; consistent units and terms; past tense for what was done.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Where things go',
          problem: r`Where in a thesis do the sample size computation and the statistical tools go, and where do the conclusions go?`,
          steps: [
            r`How the study was done is methodology: Chapter 3.`,
            r`Conclusions answer the research questions at the end: Chapter 5.`,
          ],
          answer: r`Sample size and statistical treatment: Chapter 3 (methodology). Conclusions: Chapter 5, answering each research question.`,
        },
        {
          level: 'board',
          title: 'Editing a results sentence',
          problem: r`Fix: "The voltage were measured using a multimeter and it is found to be 230V, while the load is 5 Kws."`,
          steps: [
            r`Agreement and tense: "The voltage was measured … and found to be …".`,
            r`Units: a space before the symbol, exact case, no plural: 230 V, 5 kW.`,
          ],
          answer: r`"The voltage was measured with a multimeter and found to be 230 V; the load was 5 kW."`,
        },
      ],
      traps: [
        r`Conclusions must follow from your results: no new data in the last chapter.`,
        r`"kW" is kilowatt; "KW" and "Kw" are wrong, and "kWs" is not a unit.`,
      ],
      check: [
        { q: r`Why is the abstract written last?`, a: r`It summarizes the purpose, method, results and conclusion, which are only known at the end.` },
        { q: r`What does IMRaD stand for?`, a: r`Introduction, Methods, Results and Discussion.` },
      ],
    },
  ],
};
