// Library › Lessons › ESAS › Research Methods (2026-11-18): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by computation. The statistics behind the tests are
// in Mathematics › Probability & Statistics and Engineering Data Analytics.
const r = String.raw;

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
      keyIdeas: [
        r`A good problem is specific, researchable with available data, significant, and ethical.`,
        r`The statement of the problem gives a general objective and specific questions; objectives are SMART.`,
        r`Scope and delimitation say what is and isn't covered; significance says who benefits.`,
      ],
      example: {
        problem: r`Improve the question "Is solar power good?" into a researchable one.`,
        solution: r`"How much does a 5 kW rooftop PV system reduce a Metro Manila household's monthly electricity bill over one year?": specific, measurable and bounded.`,
      },
      traps: [r`A question answered by yes or no from opinion is not a research problem.`],
    },
    {
      name: 'Review of Literature',
      inShort: r`What is already known, and where the gap is.`,
      keyIdeas: [
        r`Find and evaluate sources: journals, theses, standards; prefer recent, peer-reviewed work.`,
        r`Synthesize (compare, connect, critique), don't just summarize source after source.`,
        r`Cite consistently (APA or IEEE); the review ends by showing the gap your study fills and its framework.`,
      ],
      example: {
        problem: r`Your review lists ten studies, one paragraph each, with no comparison. What is wrong?`,
        solution: r`It summarizes instead of synthesizing. Group the studies by theme, show where they agree and conflict, and lead to the gap the study addresses.`,
      },
      traps: [r`Wikipedia and blogs can point you to sources, but they aren't scholarly sources themselves.`],
    },
    {
      name: 'Hypotheses and Variables',
      inShort: r`What the study expects to find, and what it measures and controls.`,
      keyIdeas: [
        r`Independent variable (manipulated or cause), dependent (measured outcome), control (held constant), extraneous and moderating variables.`,
        r`Null hypothesis $H_0$: no effect or difference; alternative $H_1$: there is one.`,
        r`Type I error $\alpha$ (rejecting a true $H_0$), Type II $\beta$ (missing a real effect); power $= 1 - \beta$.`,
      ],
      example: {
        problem: r`A study tests whether adding capacitor banks of different sizes raises a plant's power factor. Name the variables and the null hypothesis.`,
        solution: r`Independent: capacitor size; dependent: power factor; controlled: load, voltage. $H_0$: capacitor size has no effect on power factor.`,
      },
      traps: [r`Failing to reject $H_0$ is not proof that $H_0$ is true.`],
    },
    {
      name: 'Research Design',
      inShort: r`The overall plan for answering the question.`,
      keyIdeas: [
        r`Quantitative: experimental (random assignment, control), quasi-experimental, correlational, descriptive (survey).`,
        r`Qualitative: case study, phenomenology, grounded theory, ethnography. Mixed methods combine both.`,
        r`Cross-sectional (one time) vs longitudinal (over time).`,
      ],
      example: {
        problem: r`Classify: (a) surveying 300 engineers once about their CPD habits; (b) assigning motors at random to two lubricants and measuring temperature rise.`,
        solution: r`(a) Descriptive, cross-sectional survey. (b) Experimental: random assignment and a manipulated variable.`,
      },
      traps: [r`Only an experiment with random assignment supports cause-and-effect claims.`],
    },
    {
      name: 'Sampling',
      inShort: r`Choosing who or what to study, and how many.`,
      keyIdeas: [
        r`Probability: simple random, systematic ($k = \frac{N}{n}$), stratified ($n_h = n\frac{N_h}{N}$), cluster. Non-probability: convenience, purposive, quota, snowball.`,
        r`Slovin $n = \frac{N}{1 + Ne^2}$; for a proportion $\frac{z^2p(1 - p)}{e^2}$ with a finite correction.`,
        r`Larger samples narrow the margin of error, but as $\frac{1}{\sqrt n}$.`,
      ],
      example: {
        problem: r`A school has 1000 students. How many should be surveyed for ±5% (Slovin)? And by the proportion formula at 95% confidence?`,
        solution: r`Slovin: $\frac{1000}{1 + 1000(0.0025)} = 285.7$, so 286. Proportion: $n_0 = \frac{1.96^2(0.25)}{0.05^2} = 384.2$; corrected $\frac{384.2}{1 + 383.2/1000} = 277.7$, so 278.`,
      },
      traps: [r`Always round a sample size UP.`],
    },
    {
      name: 'Data Gathering',
      inShort: r`Instruments and procedures for collecting data.`,
      keyIdeas: [
        r`Questionnaires, interviews, observation, experiments and measurements, existing records.`,
        r`Likert items (5 strongly agree … 1 strongly disagree) are summarized by the weighted mean $\frac{\sum fw}{\sum f}$.`,
        r`Pilot-test instruments before full use; keep a protocol so data are gathered the same way each time.`,
      ],
      example: {
        problem: r`On one item 10 respondents strongly agree, 20 agree, 5 are neutral, 3 disagree and 2 strongly disagree. Find the weighted mean and its meaning.`,
        solution: r`$\frac{10(5) + 20(4) + 5(3) + 3(2) + 2(1)}{40} = \frac{153}{40} = 3.83$: "agree" (3.41–4.20).`,
      },
      traps: [r`Leading questions ("Don't you agree that…") bias the answers.`],
    },
    {
      name: 'Validity and Reliability',
      inShort: r`Does the instrument measure the right thing, and does it measure it consistently?`,
      keyIdeas: [
        r`Validity: content (expert review, CVI), construct, criterion. Reliability: test-retest, inter-rater, internal consistency.`,
        r`Cronbach's $\alpha = \frac{k}{k - 1}\left(1 - \frac{\sum\sigma_i^2}{\sigma_T^2}\right)$; 0.70 or more is acceptable.`,
        r`Internal validity (no confounds) vs external validity (results generalize).`,
      ],
      example: {
        problem: r`A 10-item scale has item variances summing to 12 and a total-score variance of 40. Find Cronbach's alpha.`,
        solution: r`$\frac{10}{9}\left(1 - \frac{12}{40}\right) = \frac{10}{9}(0.7) = 0.78$: acceptable.`,
      },
      traps: [r`A reliable instrument can still be invalid: consistently measuring the wrong thing.`],
    },
    {
      name: 'Statistical Treatment',
      inShort: r`Choosing and applying the right statistical tool.`,
      keyIdeas: [
        r`Describe: frequency, percent, mean, standard deviation. Relate: Pearson $r$ (interval), Spearman (ranks), chi-square (categories).`,
        r`Compare means: t-test (two groups), paired t (before/after), ANOVA (three or more).`,
        r`Reject $H_0$ when the p-value is below $\alpha$ (or the statistic exceeds its critical value).`,
      ],
      example: {
        problem: r`Of 50 day-shift workers 30 prefer online review, and of 50 night-shift workers 10 do. Is preference related to shift ($\alpha = 0.05$)?`,
        solution: r`Expected counts 20 and 30 per row; $\chi^2 = 16.7$ with 1 df, above 3.84: yes, preference depends on shift.`,
      },
      traps: [r`Use a t-test for means and chi-square for counts; never chi-square on percentages.`],
    },
    {
      name: 'Presentation of Results',
      inShort: r`Showing findings clearly in text, tables and graphs.`,
      keyIdeas: [
        r`Present, analyse, then interpret: what the numbers say, what they mean, how they compare with the literature.`,
        r`Graphs: line for trends, bar for comparisons, pie for parts of a whole, scatter for relationships, histogram for distributions.`,
        r`Every table and figure is numbered, titled and referred to in the text.`,
      ],
      example: {
        problem: r`Which graph shows (a) monthly energy use over two years, (b) the share of each load type in a building, (c) whether temperature and demand are related?`,
        solution: r`(a) Line graph; (b) pie or stacked bar; (c) scatter plot.`,
      },
      traps: [r`A truncated axis can make a small difference look huge.`],
    },
    {
      name: 'Ethics and Plagiarism',
      inShort: r`Doing research honestly and treating participants fairly.`,
      keyIdeas: [
        r`Informed consent, voluntary participation, confidentiality, no harm; ethics review for human participants.`,
        r`Plagiarism: using others' words or ideas without credit, including self-plagiarism. Fabrication and falsification of data are misconduct.`,
        r`Data Privacy Act (RA 10173, 2012) protects personal data; the IP Code (RA 8293) protects authors' work.`,
      ],
      example: {
        problem: r`A student paraphrases a journal paragraph closely, changing a few words, with no citation. Is it plagiarism?`,
        solution: r`Yes: the ideas and structure are someone else's. Paraphrase in your own words AND cite the source; quote exact words in quotation marks.`,
      },
      traps: [r`Citing a source doesn't excuse copying its words without quotation marks.`],
    },
    {
      name: 'Technical Writing',
      inShort: r`Writing research clearly, accurately and concisely.`,
      keyIdeas: [
        r`Papers follow IMRaD: Introduction, Methods, Results and Discussion. A Philippine thesis: Chapter 1 the problem, 2 related literature, 3 methodology, 4 results and discussion, 5 summary, conclusions and recommendations.`,
        r`The abstract (about 150–250 words) states the purpose, method, main results and conclusion.`,
        r`Plain, precise language; consistent units and terms; past tense for what was done.`,
      ],
      example: {
        problem: r`Where in a thesis do the sample size computation and the statistical tools go, and where do the conclusions go?`,
        solution: r`Sample size and statistical treatment: Chapter 3 (methodology). Conclusions: Chapter 5, answering each research question.`,
      },
      traps: [r`Conclusions must follow from your results: no new data in the last chapter.`],
    },
  ],
};
