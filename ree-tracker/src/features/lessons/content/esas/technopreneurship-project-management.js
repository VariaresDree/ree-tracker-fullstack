// Library › Lessons › ESAS › Technopreneurship & Project Management
// (2026-11-18): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order; every worked example checked by computation.
// Engineering Economics covers present worth, IRR, payback and break-even
// quantity.
const r = String.raw;

export default {
  topic: 'Technopreneurship & Project Management',
  subject: 'ESAS',
  overview: r`Technopreneurship is turning technology into a business: finding a customer with a real problem, building something they will pay for, and growing it into a company. Project management is getting a defined piece of work done on time, within budget and to the right quality. The two meet in every engineering venture. Board items ask about business concepts (value proposition, business models, IP, funding) and project calculations: the critical path, PERT probabilities, crashing costs and earned value.`,
  sources: [
    'Technology Ventures: From Idea to Enterprise (Byers, Dorf and Nelson)',
    'Business Model Generation (Osterwalder and Pigneur)',
    'A Guide to the Project Management Body of Knowledge (PMBOK Guide, PMI)',
    'Intellectual Property Code of the Philippines (RA 8293)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Technopreneurship Basics',
      inShort: r`Building a business on a technology: opportunity, risk and the entrepreneur.`,
      keyIdeas: [
        r`A technopreneur combines technical knowledge with business sense to commercialize an innovation.`,
        r`Start lean: build a minimum viable product, test it with real customers, learn, and pivot or persevere.`,
        r`Most startups fail for lack of a market need, not for bad technology.`,
      ],
      example: {
        problem: r`An engineer has built a clever smart-meter prototype. What should come before scaling up production?`,
        solution: r`Validate demand: put a minimum viable product in front of target customers, confirm they will pay, and learn what they actually need.`,
      },
      traps: [r`Invention is not innovation: innovation is an invention people adopt and pay for.`],
    },
    {
      name: 'Customers and Value Proposition',
      inShort: r`Who the customer is, what problem you solve for them, and what they are worth.`,
      keyIdeas: [
        r`A value proposition matches the product's gains and pain relievers to the customer's jobs, pains and gains.`,
        r`Segment customers; early adopters buy first and shape the product.`,
        r`Unit economics: $LTV = \frac{\text{ARPU} \times \text{margin}}{\text{churn}}$; LTV should be at least 3 times CAC.`,
      ],
      example: {
        problem: r`A monitoring service earns ₱500 a month per customer at a 70% gross margin; 5% of customers cancel each month. It spends ₱2000 to win a customer. Is that sustainable?`,
        solution: r`$LTV = \frac{500(0.70)}{0.05} = ₱7000$; $\frac{7000}{2000} = 3.5 \ge 3$: yes.`,
      },
      traps: [r`Customers buy outcomes, not features.`],
    },
    {
      name: 'Market Identification and Analysis',
      inShort: r`Sizing the market and understanding it.`,
      keyIdeas: [
        r`TAM (total), SAM (serviceable), SOM (obtainable): $SOM = SAM \times$ share.`,
        r`Research: surveys, interviews, industry reports; segment by need, size, location.`,
        r`Growth: $CAGR = \left(\frac{V_n}{V_0}\right)^{1/n} - 1$.`,
      ],
      example: {
        problem: r`A market grew from ₱100 M to ₱150 M in 4 years. What is its CAGR? Is it the same as averaging +50% and −50% years?`,
        solution: r`$1.5^{1/4} - 1 = 10.7\%$ a year. No: +50% then −50% leaves $0.75$, a CAGR of $-13.4\%$, not 0.`,
      },
      traps: [r`A huge TAM means little if you can't reach the customers in it.`],
    },
    {
      name: 'Competitive Advantage',
      inShort: r`What makes your business hard to copy.`,
      keyIdeas: [
        r`Porter's generic strategies: cost leadership, differentiation, focus.`,
        r`Porter's five forces: rivalry, new entrants, substitutes, buyer power, supplier power.`,
        r`Durable advantages: patents and know-how, network effects, brand, switching costs, scale.`,
      ],
      example: {
        problem: r`A solar installer competes on the lowest price while rivals offer free maintenance and monitoring. Name each one's strategy.`,
        solution: r`The installer: cost leadership. The rivals: differentiation through service.`,
      },
      traps: [r`"No competitors" usually means no market, or that you haven't looked.`],
    },
    {
      name: 'Business Models',
      inShort: r`How a business creates, delivers and captures value.`,
      keyIdeas: [
        r`The Business Model Canvas: customer segments, value propositions, channels, relationships, revenue streams, key resources, activities, partners, cost structure.`,
        r`Revenue models: product sale, subscription, licensing, freemium, pay-per-use, marketplace fees.`,
        r`Markup $\frac{P - C}{C}$ vs margin $\frac{P - C}{P}$.`,
      ],
      example: {
        problem: r`A device costs ₱1000 to make and sells for ₱1500. Find the markup and the margin.`,
        solution: r`Markup $\frac{500}{1000} = 50\%$; margin $\frac{500}{1500} = 33\%$.`,
      },
      traps: [r`Margin can never reach 100%; markup can be any size.`],
    },
    {
      name: 'Intellectual Property',
      inShort: r`Protecting inventions, designs, brands and creative works (RA 8293).`,
      keyIdeas: [
        r`Patent: 20 years from filing (novel, inventive, industrially applicable). Utility model: 7 years, no inventive step needed.`,
        r`Industrial design: 5 years, renewable twice. Trademark: 10 years, renewable. Copyright: the author's life plus 50 years.`,
        r`Trade secrets are protected only while kept secret; the IPOPHL registers patents, marks and designs.`,
      ],
      example: {
        problem: r`An engineer files a patent in 2026 for a new relay. When does it expire? What if the improvement isn't inventive enough for a patent?`,
        solution: r`2046 (20 years from filing). A minor improvement can be a utility model: 7 years, to 2033.`,
      },
      traps: [r`Publishing an invention before filing can destroy its novelty.`],
    },
    {
      name: 'Business Plan and Financial Analysis',
      inShort: r`The written plan, and the numbers that show the business can work.`,
      keyIdeas: [
        r`Sections: summary, problem and solution, market, competition, marketing, operations, team, financials, funding ask.`,
        r`Break-even revenue $= \frac{FC}{CMR}$, $CMR = \frac{P - V}{P}$; ratios: ROI, margins, current ratio, debt to equity.`,
        r`Runway $= \frac{\text{cash}}{\text{monthly burn}}$.`,
      ],
      example: {
        problem: r`Fixed costs are ₱200,000 a month; a unit sells for ₱50 with ₱30 variable cost. What monthly revenue breaks even? With ₱1.8 M cash and ₱150,000 monthly burn, how long is the runway?`,
        solution: r`$CMR = \frac{20}{50} = 0.4$; $\frac{200\,000}{0.4} = ₱500\,000$ a month. Runway $\frac{1.8\,\text{M}}{150\,000} = 12$ months.`,
      },
      traps: [r`Profit is not cash: a profitable company can still run out of money.`],
    },
    {
      name: 'Raising Capital',
      inShort: r`Where startup money comes from, and what it costs the founders.`,
      keyIdeas: [
        r`Bootstrapping, friends and family, grants (DOST and others), angel investors, venture capital, bank loans, crowdfunding.`,
        r`$V_{post} = V_{pre} + I$; the investor owns $\frac{I}{V_{post}}$.`,
        r`Each round dilutes earlier owners: multiply their share by $(1 - \text{new investor's share})$.`,
      ],
      example: {
        problem: r`Founders own 100%. A seed investor puts ₱5 M at a ₱20 M pre-money value; later a Series A puts ₱20 M at ₱80 M pre-money. What do the founders own after both?`,
        solution: r`Seed takes $\frac{5}{25} = 20\%$; Series A takes $\frac{20}{100} = 20\%$. Founders: $1 \times 0.8 \times 0.8 = 64\%$.`,
      },
      traps: [r`A higher valuation means less dilution, not more money in the founders' pockets.`],
    },
    {
      name: 'Ethics and Social Responsibility',
      inShort: r`Doing business honestly and for the good of the community.`,
      keyIdeas: [
        r`Honest claims to customers and investors; fair treatment of workers and partners; respect for others' IP.`,
        r`Corporate social responsibility: environmental care, community development, fair labour.`,
        r`The triple bottom line: people, planet, profit.`,
      ],
      example: {
        problem: r`A startup can cut costs by using unlicensed software and skipping safety certification. What is the right call?`,
        solution: r`Neither: both are illegal and unethical, and expose the company to liability and lost trust. Budget for licences and certification.`,
      },
      traps: [r`"Everyone does it" is not a defence.`],
    },
    {
      name: 'Management Functions',
      inShort: r`What managers do: plan, organize, lead and control.`,
      keyIdeas: [
        r`Planning (goals and how to reach them), organizing (structure and resources), leading (motivating people), controlling (measuring and correcting).`,
        r`Organization structures: functional, projectized, matrix.`,
        r`Decision making, communication and delegation tie the functions together.`,
      ],
      example: {
        problem: r`A manager compares monthly costs with the budget and orders corrective action. Which function is that?`,
        solution: r`Controlling: measuring performance against the plan and correcting deviations.`,
      },
      traps: [r`In a matrix organization people report to both a functional and a project manager.`],
    },
    {
      name: 'Work Breakdown and Gantt Charts',
      inShort: r`Breaking a project into work and scheduling it.`,
      keyIdeas: [
        r`The work breakdown structure (WBS) splits the project into deliverables and work packages; together they cover 100% of the scope.`,
        r`Duration from effort: $t = \frac{W}{np}$.`,
        r`A Gantt chart shows each activity as a bar on a timeline, with dependencies and milestones.`,
      ],
      example: {
        problem: r`Wiring a floor takes 60 person-days. With 4 electricians at 75% availability, how long will it take?`,
        solution: r`$\frac{60}{4 \times 0.75} = 20$ days.`,
      },
      traps: [r`A Gantt chart shows timing well but hides the network logic: use CPM for the critical path.`],
    },
    {
      name: 'CPM and PERT',
      inShort: r`Finding the critical path, and the chance of finishing on time.`,
      keyIdeas: [
        r`Forward pass: $EF = ES + t$; backward pass: $LS = LF - t$; float $= LS - ES$. Zero-float activities form the critical path.`,
        r`PERT: $t_e = \frac{a + 4m + b}{6}$, $\sigma = \frac{b - a}{6}$; $z = \frac{T - \sum t_e}{\sqrt{\sum\sigma^2}}$ along the critical path.`,
        r`Crashing: shorten critical activities with the lowest cost slope $\frac{C_c - C_n}{T_n - T_c}$ first.`,
      ],
      example: {
        problem: r`Activities: A (3 d) → C (2 d) → E (4 d) and B (5 d) → D (3 d) → E. Find the duration, the critical path and A's float.`,
        solution: r`Path A–C–E is 9 days, B–D–E is 12: the project takes 12 days on the critical path B–D–E. A's float: $12 - 9 = 3$ days.`,
      },
      traps: [r`Shortening a non-critical activity doesn't shorten the project.`],
    },
    {
      name: 'Project Cost and Risk',
      inShort: r`Estimating and budgeting cost, and planning for what might go wrong.`,
      keyIdeas: [
        r`Estimates: analogous, parametric, bottom-up; the budget adds a contingency reserve.`,
        r`Risk exposure $EMV = p \times I$; contingency ≈ the sum of the risks' EMVs.`,
        r`Responses: avoid, transfer, mitigate, accept (threats); exploit, share, enhance, accept (opportunities).`,
      ],
      example: {
        problem: r`There is a 20% chance that late equipment delivery costs ₱500,000. What is its risk exposure, and name a way to transfer it.`,
        solution: r`$0.20 \times 500\,000 = ₱100\,000$. Transfer: a penalty clause for late delivery in the supply contract.`,
      },
      traps: [r`Risks are uncertain events; issues are risks that have already happened.`],
    },
    {
      name: 'Project Control',
      inShort: r`Tracking progress and correcting course: earned value.`,
      keyIdeas: [
        r`$CV = EV - AC$, $SV = EV - PV$, $CPI = \frac{EV}{AC}$, $SPI = \frac{EV}{PV}$.`,
        r`Forecast: $EAC = \frac{BAC}{CPI}$ if current cost performance continues.`,
        r`Change control: every scope change goes through a formal request, review and approval.`,
      ],
      example: {
        problem: r`At month 4 of a ₱1 M project: planned value ₱400,000, earned value ₱350,000, actual cost ₱420,000. How is it doing, and what will it cost?`,
        solution: r`$CPI = \frac{350}{420} = 0.83$ (over budget), $SPI = \frac{350}{400} = 0.875$ (behind). $EAC = \frac{1\,\text{M}}{0.833} = ₱1.2$ M.`,
      },
      traps: [r`Spending exactly the planned amount says nothing about progress: compare with EARNED value.`],
    },
  ],
};
