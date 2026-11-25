// Library › Lessons › ESAS › Technopreneurship & Project Management
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// technopreneurshipLesson.test.js; the text, problems and figures are this
// app's own): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order. Engineering Economics covers present worth, IRR,
// payback and break-even quantity.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// One subscriber: ₱500 a month at 70% margin, 5% monthly churn, ₱2000 to win.
export const SUB = { arpu: 500, margin: 0.7, churn: 0.05, cac: 2000 };
export const ltv = () => (SUB.arpu * SUB.margin) / SUB.churn;
export const cumulative = (t) => ltv() * (1 - (1 - SUB.churn) ** t) - SUB.cac;
export const paybackMonths = () => Math.log(1 - (SUB.cac * SUB.churn) / (SUB.arpu * SUB.margin)) / Math.log(1 - SUB.churn);

// The business plan's unit: ₱200,000 fixed a month, ₱50 price, ₱30 variable.
export const PLAN = { fc: 200000, p: 50, v: 30 };
export const breakEvenUnits = () => PLAN.fc / (PLAN.p - PLAN.v);

// The ₱1 M project's earned-value record (₱ thousand, by month).
export const PV = [0, 60, 150, 270, 400, 530, 650, 760, 860, 940, 1000];
export const EV = [0, 50, 130, 230, 350];
export const AC = [0, 60, 150, 270, 420];
export const BAC = 1000;

export const pert = ([a, m, b]) => ({ te: (a + 4 * m + b) / 6, sd: (b - a) / 6 });

const curve = (ys) => ys.map((y, i) => [i, y]);

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
      body: [
        r`A **technopreneur** combines technical knowledge with business sense to turn an innovation into a company. An **invention** is a new device or method; an **innovation** is an invention that people adopt and pay for. Innovations may be **incremental** (a better version of what exists) or **disruptive** (a cheaper, simpler product that starts at the bottom of a market and moves up).

Most startups fail for lack of a market need, not for bad technology, so the lean approach tests demand before spending on scale. Build the smallest product that can test the key assumption, a **minimum viable product** (MVP); measure how real customers respond; learn; then **pivot** (change the plan) or **persevere**:`,
        {
          type: 'blocks',
          alt: 'The lean startup loop: build, measure and learn, left to right, with an arrow from learn back to build underneath labelled iterate.',
          caption: 'Build, measure, learn: each pass through the loop tests one assumption with real customers.',
          blocks: [
            { id: 'b', at: [0, 0], label: 'Build' },
            { id: 'm', at: [1, 0], label: 'Measure' },
            { id: 'l', at: [2, 0], label: 'Learn' },
          ],
          links: [
            ['b', 'm'],
            ['m', 'l'],
            ['l', 'b', { label: 'iterate', via: [[2, 1], [0, 1]] }],
          ],
        },
        r`Set the pass mark **before** the test (for example, 5% of visitors pre-order), so the result can't be argued away afterward.`,
      ],
      keyIdeas: [
        r`A technopreneur combines technical knowledge with business sense to commercialize an innovation.`,
        r`Start lean: build a minimum viable product, test it with real customers, learn, and pivot or persevere.`,
        r`Most startups fail for lack of a market need, not for bad technology.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Before scaling up',
          problem: r`An engineer has built a clever smart-meter prototype. What should come before scaling up production?`,
          steps: [
            r`The riskiest assumption is demand, not the technology.`,
            r`Put an MVP in front of target customers and see whether they pay.`,
          ],
          answer: r`Validate demand: put a minimum viable product in front of target customers, confirm they will pay, and learn what they actually need.`,
        },
        {
          level: 'board',
          title: 'Pivot or persevere?',
          problem: r`A landing page for a home energy monitor drew 1200 visitors; 30 pre-ordered. The team had set 5% as the pass mark. What does the test say, and what next?`,
          steps: [
            r`Conversion $= \frac{30}{1200} = 2.5\%$, half the 5% pass mark.`,
            r`The assumption (enough households want it at this price) failed.`,
            r`Interview the visitors who left, then pivot: a new segment (small businesses), price, or feature, and test again.`,
          ],
          answer: r`2.5%, below the mark: pivot and run the loop again.`,
        },
      ],
      traps: [
        r`Invention is not innovation: innovation is an invention people adopt and pay for.`,
        r`An MVP is the smallest test of an assumption, not a cheap version of the final product.`,
      ],
      check: [
        { q: r`What is a pivot?`, a: r`A change in strategy (segment, price, product) after a test shows the current plan won't work.` },
        { q: r`What is disruptive innovation?`, a: r`A simpler, cheaper product that enters at the bottom of a market and moves up to displace the leaders.` },
      ],
    },
    {
      name: 'Customers and Value Proposition',
      inShort: r`Who the customer is, what problem you solve for them, and what they are worth.`,
      body: [
        r`A **value proposition** says why a customer should choose you. It matches the product's **pain relievers** and **gain creators** to the customer's **jobs** (what they are trying to get done), **pains** and **gains**. Customers are grouped into **segments** by need; **early adopters** feel the pain most, buy first and shape the product.

Whether a customer is worth winning comes down to unit economics:

| Quantity | Meaning |
|---|---|
| ARPU | average revenue per user, per month |
| churn | share of customers lost each month |
| LTV | lifetime value, $\frac{\text{ARPU} \times \text{margin}}{\text{churn}}$ |
| CAC | customer acquisition cost |

A healthy business has LTV at least three times CAC. A customer starts in the red by the CAC and climbs out as monthly profit comes in:`,
        {
          type: 'plot',
          alt: 'Cumulative profit from one subscriber against months from 0 to 60. It starts at minus 2000 pesos, crosses zero at about 6.6 months, and levels off toward 5000 pesos, the lifetime value minus the acquisition cost.',
          caption: 'One subscriber at ₱350 a month of gross profit and 5% monthly churn: the ₱2000 CAC is paid back in about 6.6 months; the curve levels off at LTV − CAC = ₱5000.',
          x: [0, 60],
          y: [-2000, 6000],
          xLabel: 'months',
          yLabel: 'cumulative profit, ₱',
          series: [{ f: cumulative, area: true }],
          marks: [
            { x: paybackMonths(), label: 'payback' },
            { y: ltv() - SUB.cac, label: 'LTV − CAC' },
          ],
        },
      ],
      keyIdeas: [
        r`A value proposition matches the product's gains and pain relievers to the customer's jobs, pains and gains.`,
        r`Segment customers; early adopters buy first and shape the product.`,
        r`Unit economics: $LTV = \frac{\text{ARPU} \times \text{margin}}{\text{churn}}$; LTV should be at least 3 times CAC.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Is a customer worth it?',
          problem: r`A monitoring service earns ₱500 a month per customer at a 70% gross margin; 5% of customers cancel each month. It spends ₱2000 to win a customer. Is that sustainable?`,
          steps: [
            r`$LTV = \frac{500(0.70)}{0.05} = 7000$ pesos.`,
            r`$\frac{7000}{2000} = 3.5 \ge 3$.`,
          ],
          answer: r`Yes: LTV is ₱7000, 3.5 times the CAC.`,
        },
        {
          level: 'board',
          title: 'Two channels and the payback',
          problem: r`For the same service, online ads win customers at ₱1500 each and a dealer network at ₱4000. Compare the channels by LTV to CAC. Ignoring churn, how many months does an ad-won customer take to pay back?`,
          steps: [
            r`Ads: $\frac{7000}{1500} = 4.67$; dealers: $\frac{7000}{4000} = 1.75$, below 3.`,
            r`Monthly gross profit $500 \times 0.70 = 350$ pesos; payback $\frac{1500}{350} = 4.3$ months.`,
            r`Churn stretches it: the figure's ₱2000 customer needs 6.6 months, not $\frac{2000}{350} = 5.7$.`,
          ],
          answer: r`Ads (4.67) beat dealers (1.75); about 4.3 months to pay back.`,
        },
      ],
      traps: [
        r`Customers buy outcomes, not features.`,
        r`LTV uses gross profit, not revenue: ₱500 a month is ₱350 of profit at 70%.`,
      ],
      check: [
        { q: r`Who are early adopters?`, a: r`Customers who feel the problem most, buy first, and help shape the product.` },
        { q: r`What does a churn of 4% a month imply for a customer's average life?`, a: r`$\frac{1}{0.04} = 25$ months.` },
      ],
    },
    {
      name: 'Market Identification and Analysis',
      inShort: r`Sizing the market and understanding it.`,
      body: [
        r`A market is sized in three nested rings:

| Ring | Meaning |
|---|---|
| TAM, total addressable market | everyone who could ever use this kind of product |
| SAM, serviceable available market | the part your product and channels can reach |
| SOM, serviceable obtainable market | the share of SAM you can realistically win soon |

Research fills in the numbers: surveys and interviews (primary), industry reports and government statistics (secondary). Segment by need, size, location and willingness to pay.

Growth is quoted as the **compound annual growth rate**, $CAGR = \left(\frac{V_n}{V_0}\right)^{1/n} - 1$, the steady rate that would turn the first value into the last. It is a geometric average, so ups and downs don't cancel: +50% then −50% leaves 75%.`,
      ],
      keyIdeas: [
        r`TAM (total), SAM (serviceable), SOM (obtainable): $SOM = SAM \times$ share.`,
        r`Research: surveys, interviews, industry reports; segment by need, size, location.`,
        r`Growth: $CAGR = \left(\frac{V_n}{V_0}\right)^{1/n} - 1$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Compound growth',
          problem: r`A market grew from ₱100 M to ₱150 M in 4 years. What is its CAGR? Is it the same as averaging +50% and −50% years?`,
          steps: [
            r`$1.5^{1/4} - 1 = 10.7\%$ a year.`,
            r`+50% then −50%: $1.5 \times 0.5 = 0.75$, so $0.75^{1/2} - 1 = -13.4\%$ a year, not 0.`,
          ],
          answer: r`10.7% a year; no, the two years give −13.4% a year.`,
        },
        {
          level: 'board',
          title: 'TAM, SAM and SOM',
          problem: r`A region has 2,000,000 households. 15% own their roof and can afford a ₱250,000 rooftop PV system; a new installer expects to win 2% of those within five years. Find TAM, SAM and SOM in households and pesos.`,
          steps: [
            r`TAM: $2\,000\,000 \times 250\,000 = 500$ billion pesos.`,
            r`SAM: $0.15 \times 2\,000\,000 = 300\,000$ households, 75 billion pesos.`,
            r`SOM: $0.02 \times 300\,000 = 6000$ households, 1.5 billion pesos.`,
          ],
          answer: r`TAM ₱500 B; SAM 300,000 households (₱75 B); SOM 6000 households (₱1.5 B).`,
        },
      ],
      traps: [
        r`A huge TAM means little if you can't reach the customers in it.`,
        r`CAGR is not the average of the yearly rates.`,
      ],
      check: [
        { q: r`Which ring is the realistic sales target?`, a: r`SOM, the share of the serviceable market you can actually win.` },
        { q: r`Is an industry report primary or secondary research?`, a: r`Secondary: it was gathered by someone else.` },
      ],
    },
    {
      name: 'Competitive Advantage',
      inShort: r`What makes your business hard to copy.`,
      body: [
        r`Porter's **five forces** decide how much profit an industry leaves for its players. The stronger each force, the harder it is to earn a margin:`,
        {
          type: 'blocks',
          alt: 'Porter five forces: rivalry among competitors in the centre, with arrows into it from new entrants above, substitutes below, suppliers on the left and buyers on the right.',
          caption: "Porter's five forces: four outside pressures bear on the rivalry among existing competitors.",
          blocks: [
            { id: 'r', at: [1, 1], label: 'Rivalry' },
            { id: 'n', at: [1, 0], label: 'Entrants' },
            { id: 's', at: [1, 2], label: 'Substitute' },
            { id: 'u', at: [0, 1], label: 'Suppliers' },
            { id: 'b', at: [2, 1], label: 'Buyers' },
          ],
          links: [['n', 'r'], ['s', 'r'], ['u', 'r'], ['b', 'r']],
        },
        r`Against those forces a firm picks a **generic strategy**: **cost leadership** (the lowest cost in the market), **differentiation** (something customers pay more for), or **focus** (either one, aimed at a narrow segment). Advantages that last are hard to copy: patents and know-how, **network effects** (each user makes the product worth more to the others), brand, **switching costs**, and economies of scale.`,
      ],
      keyIdeas: [
        r`Porter's generic strategies: cost leadership, differentiation, focus.`,
        r`Porter's five forces: rivalry, new entrants, substitutes, buyer power, supplier power.`,
        r`Durable advantages: patents and know-how, network effects, brand, switching costs, scale.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Naming the strategy',
          problem: r`A solar installer competes on the lowest price while rivals offer free maintenance and monitoring. Name each one's strategy.`,
          steps: [
            r`Winning on price needs the lowest cost: cost leadership.`,
            r`Extra service customers value: differentiation.`,
          ],
          answer: r`The installer: cost leadership. The rivals: differentiation through service.`,
        },
        {
          level: 'board',
          title: 'Five forces for a meter startup',
          problem: r`A startup sells smart meters to the country's distribution utilities. There are few utilities, chips come from two overseas makers, and any utility could keep its old meters. Which forces are strong?`,
          steps: [
            r`Few large buyers: **buyer power** is high.`,
            r`Two chip makers: **supplier power** is high.`,
            r`Keeping the old meters is a substitute: the **threat of substitutes** is real.`,
            r`So margins will be thin unless the startup builds switching costs (a data platform the utility comes to rely on).`,
          ],
          answer: r`Buyer power, supplier power and substitutes are strong.`,
        },
      ],
      traps: [
        r`"No competitors" usually means no market, or that you haven't looked.`,
        r`Trying to be both cheapest and most premium at once ("stuck in the middle") usually fails.`,
      ],
      check: [
        { q: r`What is a network effect?`, a: r`Each new user makes the product more valuable to the others.` },
        { q: r`Name Porter's three generic strategies.`, a: r`Cost leadership, differentiation and focus.` },
      ],
    },
    {
      name: 'Business Models',
      inShort: r`How a business creates, delivers and captures value.`,
      body: [
        r`The **Business Model Canvas** describes a business on one page, in nine blocks: customer segments, value propositions, channels, customer relationships, revenue streams, key resources, key activities, key partners and cost structure.

| Revenue model | How it earns | Example |
|---|---|---|
| Product sale | one payment per unit | selling inverters |
| Subscription | recurring fee | monitoring at ₱300 a month |
| Licensing | royalties for using IP | licensing a patented relay design |
| Freemium | free basic tier, paid extras | a load-calculation app |
| Pay-per-use | charged by usage | EV charging per kWh |
| Marketplace | a fee on others' sales | a platform matching installers and homeowners |

Prices are set from cost by a **markup** on cost, $\frac{P - C}{C}$, or to hit a **margin** on price, $\frac{P - C}{P}$; for a target margin $m$, $P = \frac{C}{1 - m}$.`,
      ],
      keyIdeas: [
        r`The Business Model Canvas: customer segments, value propositions, channels, relationships, revenue streams, key resources, activities, partners, cost structure.`,
        r`Revenue models: product sale, subscription, licensing, freemium, pay-per-use, marketplace fees.`,
        r`Markup $\frac{P - C}{C}$ vs margin $\frac{P - C}{P}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Markup and margin',
          problem: r`A device costs ₱1000 to make and sells for ₱1500. Find the markup and the margin.`,
          steps: [
            r`Markup $\frac{500}{1000} = 50\%$.`,
            r`Margin $\frac{500}{1500} = 33.3\%$.`,
          ],
          answer: r`Markup 50%; margin 33%.`,
        },
        {
          level: 'board',
          title: 'Sell or subscribe?',
          problem: r`A monitor can be sold once for ₱6000, or rented as a ₱300-a-month subscription that customers keep 30 months on average. Which brings more revenue per customer? At a cost of ₱1200, what price gives a 40% margin on a sale?`,
          steps: [
            r`Subscription: $300 \times 30 = 9000$ pesos, against 6000 for a sale.`,
            r`Price for a 40% margin: $\frac{1200}{1 - 0.40} = 2000$ pesos. Check: $\frac{800}{2000} = 40\%$.`,
          ],
          answer: r`The subscription (₱9000); ₱2000.`,
        },
      ],
      traps: [
        r`Margin can never reach 100%; markup can be any size.`,
        r`Subscription revenue arrives slowly: the business must fund the hardware up front.`,
      ],
      check: [
        { q: r`What is freemium?`, a: r`A free basic tier that draws users, with paid features for those who want more.` },
        { q: r`A 25% markup gives what margin?`, a: r`$\frac{0.25}{1.25} = 20\%$.` },
      ],
    },
    {
      name: 'Intellectual Property',
      inShort: r`Protecting inventions, designs, brands and creative works (RA 8293).`,
      body: [
        r`The **Intellectual Property Code** (RA 8293, 1997) sets the rights, and the **Intellectual Property Office of the Philippines** (IPOPHL) registers patents, utility models, industrial designs and marks:

| Right | Protects | Term |
|---|---|---|
| Patent | a new, inventive, industrially applicable invention | 20 years from filing |
| Utility model | a new, useful device (no inventive step needed) | 7 years from filing, not renewable |
| Industrial design | a product's new appearance | 5 years, renewable twice (15 at most) |
| Trademark | a brand: name, logo, mark | 10 years, renewable every 10 |
| Copyright | original works, including software | the author's life plus 50 years |
| Trade secret | confidential know-how | as long as it stays secret |

A patent is a bargain: the public learns the invention, the owner gets a time-limited monopoly. Publishing or selling an invention before filing can destroy its novelty.`,
      ],
      keyIdeas: [
        r`Patent: 20 years from filing (novel, inventive, industrially applicable). Utility model: 7 years, no inventive step needed.`,
        r`Industrial design: 5 years, renewable twice. Trademark: 10 years, renewable. Copyright: the author's life plus 50 years.`,
        r`Trade secrets are protected only while kept secret; the IPOPHL registers patents, marks and designs.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'When a patent runs out',
          problem: r`An engineer files a patent in 2026 for a new relay. When does it expire? What if the improvement isn't inventive enough for a patent?`,
          steps: [
            r`Patent: $2026 + 20 = 2046$.`,
            r`A utility model needs no inventive step: $2026 + 7 = 2033$.`,
          ],
          answer: r`2046 (20 years from filing). A minor improvement can be a utility model: 7 years, to 2033.`,
        },
        {
          level: 'board',
          title: 'Which protection?',
          problem: r`A meter startup has (a) firmware it wrote, (b) its company logo, (c) a new shape for the meter housing, and (d) a calibration method it keeps confidential. Name the protection for each. If the logo is registered in 2026 and renewed twice, until when is it protected?`,
          steps: [
            r`(a) Software is a literary work: copyright. (b) Logo: trademark. (c) Appearance: industrial design. (d) Confidential know-how: trade secret.`,
            r`Trademark: $2026 + 10 \times 3 = 2056$, and longer with more renewals.`,
          ],
          answer: r`Copyright, trademark, industrial design, trade secret; 2056.`,
        },
      ],
      traps: [
        r`Publishing an invention before filing can destroy its novelty.`,
        r`A trade secret has no protection against someone who works it out independently.`,
      ],
      check: [
        { q: r`Which office registers patents in the Philippines?`, a: r`The Intellectual Property Office of the Philippines (IPOPHL).` },
        { q: r`What is the longest an industrial design can be protected?`, a: r`15 years: 5 years, renewed twice.` },
      ],
    },
    {
      name: 'Business Plan and Financial Analysis',
      inShort: r`The written plan, and the numbers that show the business can work.`,
      body: [
        r`A business plan tells investors and lenders what the business is and why it will work: executive summary, problem and solution, market, competition, marketing and sales, operations, team, financial projections, and the funding asked for.

The financials start with the **break-even point**, where revenue covers fixed and variable costs. Each unit contributes $P - V$ toward the fixed costs; the **contribution margin ratio** is $CMR = \frac{P - V}{P}$:`,
        {
          type: 'plot',
          alt: 'Revenue and total cost against units sold per month, from 0 to 20 thousand. Total cost starts at 200 thousand pesos and rises at 30 pesos a unit; revenue starts at zero and rises at 50 pesos a unit. They cross at 10 thousand units and 500 thousand pesos, the break-even point; above it the gap is profit.',
          caption: 'Break-even chart: ₱200,000 fixed cost a month, ₱50 price and ₱30 variable cost. Revenue overtakes total cost at 10,000 units (₱500,000).',
          x: [0, 20000],
          y: [0, 1000000],
          xLabel: 'units a month',
          yLabel: '₱ a month',
          series: [
            { f: (q) => PLAN.p * q, label: 'revenue', colour: colourOf(0) },
            { f: (q) => PLAN.fc + PLAN.v * q, label: 'total cost', dashed: true, colour: colourOf(1) },
          ],
          marks: [{ x: breakEvenUnits(), label: 'break-even' }],
        },
        r`| Measure | Formula | Tells you |
|---|---|---|
| Break-even units | $\frac{FC}{P - V}$ | volume to stop losing money |
| Break-even revenue | $\frac{FC}{CMR}$ | sales to stop losing money |
| Units for a profit target | $\frac{FC + \text{profit}}{P - V}$ | volume to hit a goal |
| ROI | $\frac{\text{net profit}}{\text{investment}}$ | return on the money put in |
| Current ratio | $\frac{\text{current assets}}{\text{current liabilities}}$ | ability to pay short-term bills |
| Runway | $\frac{\text{cash}}{\text{monthly burn}}$ | months before the cash runs out |`,
      ],
      keyIdeas: [
        r`Sections: summary, problem and solution, market, competition, marketing, operations, team, financials, funding ask.`,
        r`Break-even revenue $= \frac{FC}{CMR}$, $CMR = \frac{P - V}{P}$; ratios: ROI, margins, current ratio, debt to equity.`,
        r`Runway $= \frac{\text{cash}}{\text{monthly burn}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Break-even and runway',
          problem: r`Fixed costs are ₱200,000 a month; a unit sells for ₱50 with ₱30 variable cost. What monthly revenue breaks even? With ₱1.8 M cash and ₱150,000 monthly burn, how long is the runway?`,
          steps: [
            r`$CMR = \frac{20}{50} = 0.4$; $\frac{200\,000}{0.4} = 500\,000$ pesos a month.`,
            r`Runway $\frac{1\,800\,000}{150\,000} = 12$ months.`,
          ],
          answer: r`₱500,000 a month; 12 months.`,
        },
        {
          level: 'board',
          title: 'A profit target',
          problem: r`For the same product, how many units a month earn a ₱100,000 profit? What is the profit at 12,000 units, and the ROI over a year if ₱2.4 M was invested?`,
          steps: [
            r`$\frac{200\,000 + 100\,000}{50 - 30} = 15\,000$ units a month.`,
            r`At 12,000 units: $12\,000 \times 20 - 200\,000 = 40\,000$ pesos a month.`,
            r`ROI: $\frac{12 \times 40\,000}{2\,400\,000} = 20\%$ a year.`,
          ],
          answer: r`15,000 units; ₱40,000 a month; 20% a year.`,
        },
      ],
      traps: [
        r`Profit is not cash: a profitable company can still run out of money.`,
        r`Below break-even, each unit still contributes $P - V$; the loss shrinks but doesn't end.`,
      ],
      check: [
        { q: r`What does the contribution margin pay for?`, a: r`The fixed costs first, then profit.` },
        { q: r`A startup has ₱900,000 and burns ₱75,000 a month. What is its runway?`, a: r`12 months.` },
      ],
    },
    {
      name: 'Raising Capital',
      inShort: r`Where startup money comes from, and what it costs the founders.`,
      body: [
        r`Money comes in stages, each from a different kind of backer:

| Stage | Typical source | What they get |
|---|---|---|
| Idea, prototype | founders' savings (bootstrapping), friends and family, grants (DOST and others), competitions | little or no equity for grants |
| Seed | angel investors, incubators, accelerators | equity |
| Growth (Series A, B, …) | venture capital | equity, board seats |
| Steady revenue | bank loans | interest; no equity, but collateral |
| Any | crowdfunding | pre-orders or small stakes |

**Debt** must be repaid with interest but leaves ownership alone; **equity** never has to be repaid but sells part of the company. A round is priced by its **pre-money valuation**: $V_{post} = V_{pre} + I$, and the investor owns $\frac{I}{V_{post}}$. Every round **dilutes** the earlier owners: their share is multiplied by one minus the new investor's share.`,
      ],
      keyIdeas: [
        r`Bootstrapping, friends and family, grants (DOST and others), angel investors, venture capital, bank loans, crowdfunding.`,
        r`$V_{post} = V_{pre} + I$; the investor owns $\frac{I}{V_{post}}$.`,
        r`Each round dilutes earlier owners: multiply their share by $(1 - \text{new investor's share})$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two rounds of dilution',
          problem: r`Founders own 100%. A seed investor puts ₱5 M at a ₱20 M pre-money value; later a Series A puts ₱20 M at ₱80 M pre-money. What do the founders own after both?`,
          steps: [
            r`Seed takes $\frac{5}{25} = 20\%$.`,
            r`Series A takes $\frac{20}{100} = 20\%$.`,
            r`Founders: $1 \times 0.8 \times 0.8 = 64\%$.`,
          ],
          answer: r`64%.`,
        },
        {
          level: 'board',
          title: 'Reading a term sheet',
          problem: r`An investor offers ₱10 M for 25% of a startup owned equally by two founders. What are the post-money and pre-money valuations, and what does each founder own afterward?`,
          steps: [
            r`$V_{post} = \frac{10}{0.25} = 40$ M pesos; $V_{pre} = 40 - 10 = 30$ M pesos.`,
            r`Founders together: $1 - 0.25 = 75\%$; each $\frac{75}{2} = 37.5\%$.`,
          ],
          answer: r`₱40 M post-money, ₱30 M pre-money; 37.5% each.`,
        },
      ],
      traps: [
        r`A higher valuation means less dilution, not more money in the founders' pockets.`,
        r`The investor's share is taken on the post-money value, not the pre-money.`,
      ],
      check: [
        { q: r`What is the main difference between debt and equity?`, a: r`Debt is repaid with interest and leaves ownership; equity is never repaid but gives up ownership.` },
        { q: r`What is bootstrapping?`, a: r`Funding the business from the founders' own money and its early revenue.` },
      ],
    },
    {
      name: 'Ethics and Social Responsibility',
      inShort: r`Doing business honestly and for the good of the community.`,
      body: [
        r`A startup's reputation is its first asset. Ethical business means **honest claims** to customers and investors (no overstated specifications or invented traction), **fair treatment** of workers and partners, and **respect for others' IP** (licensed software, credited designs).

**Corporate social responsibility** (CSR) goes beyond the law: environmental care, community development, fair labour, safe products. The **triple bottom line** measures a business on three accounts:

| Bottom line | Asks | Example measure |
|---|---|---|
| People | does it treat workers and communities well? | fair wages, safety record, local hiring |
| Planet | does it limit environmental harm? | emissions, waste, energy use |
| Profit | is it economically sustainable? | net income, jobs created |`,
      ],
      keyIdeas: [
        r`Honest claims to customers and investors; fair treatment of workers and partners; respect for others' IP.`,
        r`Corporate social responsibility: environmental care, community development, fair labour.`,
        r`The triple bottom line: people, planet, profit.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Cutting corners',
          problem: r`A startup can cut costs by using unlicensed software and skipping safety certification. What is the right call?`,
          steps: [
            r`Unlicensed software infringes copyright; uncertified products may harm users and break the law.`,
            r`Both expose the company to liability and lost trust.`,
          ],
          answer: r`Neither: budget for licences and certification.`,
        },
        {
          level: 'board',
          title: 'Three bottom lines',
          problem: r`A solar-lamp startup (a) trains and hires local women as installers, (b) takes back and recycles spent batteries, (c) reaches break-even in its second year, and (d) advertises a 10-year battery life it has only tested for 2. Sort (a)–(c) by bottom line, and judge (d).`,
          steps: [
            r`(a) People; (b) planet; (c) profit.`,
            r`(d) A claim beyond the evidence misleads customers: state the tested life, or test longer.`,
          ],
          answer: r`People, planet, profit; (d) is a misleading claim.`,
        },
      ],
      traps: [
        r`"Everyone does it" is not a defence.`,
        r`CSR is not a substitute for obeying the law; it starts where the law stops.`,
      ],
      check: [
        { q: r`What are the three parts of the triple bottom line?`, a: r`People, planet and profit.` },
        { q: r`Why is overstating traction to investors serious?`, a: r`It is misrepresentation: it can be fraud, and it destroys the trust the company depends on.` },
      ],
    },
    {
      name: 'Management Functions',
      inShort: r`What managers do: plan, organize, lead and control.`,
      body: [
        r`Management is a cycle of four functions, each feeding the next:`,
        {
          type: 'blocks',
          alt: 'The management cycle: plan, organize, lead and control, clockwise around a square, with control feeding back into plan.',
          caption: 'Plan, organize, lead, control: what control finds goes back into the next plan.',
          blocks: [
            { id: 'p', at: [0, 0], label: 'Plan' },
            { id: 'o', at: [1, 0], label: 'Organize' },
            { id: 'l', at: [1, 1], label: 'Lead' },
            { id: 'c', at: [0, 1], label: 'Control' },
          ],
          links: [['p', 'o'], ['o', 'l'], ['l', 'c'], ['c', 'p']],
        },
        r`**Planning** sets goals and how to reach them; **organizing** arranges people, structure and resources; **leading** motivates and directs people; **controlling** measures performance against the plan and corrects deviations.

| Structure | Who holds authority | Suits |
|---|---|---|
| Functional | department heads (design, construction, finance) | routine, repeated work |
| Projectized | the project manager | large, one-off projects |
| Matrix | shared: staff report to both | firms running many projects |

The **span of control** is how many people one manager directly supervises; narrower spans need more supervisors.`,
      ],
      keyIdeas: [
        r`Planning (goals and how to reach them), organizing (structure and resources), leading (motivating people), controlling (measuring and correcting).`,
        r`Organization structures: functional, projectized, matrix.`,
        r`Decision making, communication and delegation tie the functions together.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Naming the function',
          problem: r`A manager compares monthly costs with the budget and orders corrective action. Which function is that?`,
          steps: [
            r`Measuring against the plan and correcting is control.`,
          ],
          answer: r`Controlling: measuring performance against the plan and correcting deviations.`,
        },
        {
          level: 'board',
          title: 'Functions, and how many foremen',
          problem: r`Name the function: (a) setting a target of 98% feeder availability for the year; (b) assigning linemen to three crews; (c) coaching a new foreman. Then: with a span of control of 6, how many foremen does a contractor need for 40 linemen?`,
          steps: [
            r`(a) Planning; (b) organizing; (c) leading.`,
            r`$\frac{40}{6} = 6.7$: round up to 7 foremen.`,
          ],
          answer: r`Planning, organizing, leading; 7 foremen.`,
        },
      ],
      traps: [
        r`In a matrix organization people report to both a functional and a project manager.`,
        r`Round the number of supervisors up: a fraction of a foreman still needs a whole one.`,
      ],
      check: [
        { q: r`Which structure gives the project manager the most authority?`, a: r`Projectized.` },
        { q: r`Which function covers motivating the team?`, a: r`Leading.` },
      ],
    },
    {
      name: 'Work Breakdown and Gantt Charts',
      inShort: r`Breaking a project into work and scheduling it.`,
      body: [
        r`The **work breakdown structure** (WBS) splits a project into deliverables, then into **work packages** small enough to estimate, assign and track. The **100% rule**: the children of every element add up to all of its work, no more and no less.`,
        {
          type: 'blocks',
          alt: 'A work breakdown structure: a substation project at the top, split into three deliverables below it: civil works, electrical works and testing.',
          caption: 'The top of a substation WBS: each deliverable is split again into work packages (foundations, cable trenches, switchgear, relay settings…).',
          blocks: [
            { id: 'p', at: [1, 0], label: 'Substation' },
            { id: 'c', at: [0, 1], label: 'Civil' },
            { id: 'e', at: [1, 1], label: 'Electrical' },
            { id: 't', at: [2, 1], label: 'Testing' },
          ],
          links: [
            ['p', 'c', { via: [[0, 0]] }],
            ['p', 'e'],
            ['p', 't', { via: [[2, 0]] }],
          ],
        },
        r`Each work package's duration comes from its effort: $t = \frac{W}{np}$, where $W$ is the work in person-days, $n$ the crew size and $p$ their availability. A **Gantt chart** then draws each activity as a bar on a timeline, with dependencies and **milestones** (zero-length events such as "energization").`,
      ],
      keyIdeas: [
        r`The work breakdown structure (WBS) splits the project into deliverables and work packages; together they cover 100% of the scope.`,
        r`Duration from effort: $t = \frac{W}{np}$.`,
        r`A Gantt chart shows each activity as a bar on a timeline, with dependencies and milestones.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Duration from effort',
          problem: r`Wiring a floor takes 60 person-days. With 4 electricians at 75% availability, how long will it take?`,
          steps: [r`$\frac{60}{4 \times 0.75} = 20$ days.`],
          answer: r`20 days.`,
        },
        {
          level: 'board',
          title: 'Sizing a crew',
          problem: r`The electrical works of the substation hold three work packages: switchgear 90 person-days, cabling 60 and grounding 30. They must be done in 30 working days by one crew at 80% availability. How many electricians are needed?`,
          steps: [
            r`By the 100% rule the deliverable is $90 + 60 + 30 = 180$ person-days.`,
            r`$n = \frac{W}{tp} = \frac{180}{30 \times 0.8} = 7.5$: round up to 8.`,
          ],
          answer: r`8 electricians.`,
        },
      ],
      traps: [
        r`A Gantt chart shows timing well but hides the network logic: use CPM for the critical path.`,
        r`Doubling the crew rarely halves the time: space, coordination and sequence limit it.`,
      ],
      check: [
        { q: r`What is the 100% rule?`, a: r`The children of each WBS element add up to exactly all of its work.` },
        { q: r`What is a milestone?`, a: r`A zero-duration event marking a key point, such as completion or energization.` },
      ],
    },
    {
      name: 'CPM and PERT',
      inShort: r`Finding the critical path, and the chance of finishing on time.`,
      body: [
        r`The **critical path method** (CPM) draws the activities as a network and finds the longest path through it, which sets the project's duration:`,
        {
          type: 'blocks',
          alt: 'An activity network: A, 3 days, leads to C, 2 days; B, 5 days, leads to D, 3 days; both C and D lead to E, 4 days. The path B, D, E is the longest at 12 days.',
          caption: 'Two paths into E: A–C–E takes 9 days and B–D–E takes 12, so B–D–E is critical and A–C have 3 days of float.',
          blocks: [
            { id: 'a', at: [0, 0], label: 'A · 3 d' },
            { id: 'b', at: [1, 0], label: 'B · 5 d' },
            { id: 'c', at: [0, 1], label: 'C · 2 d' },
            { id: 'd', at: [1, 1], label: 'D · 3 d' },
            { id: 'e', at: [0, 2], label: 'E · 4 d' },
          ],
          links: [['a', 'c'], ['b', 'd'], ['c', 'e'], ['d', 'e', { via: [[1, 2]] }]],
        },
        r`A **forward pass** gives each activity its earliest start and finish, $EF = ES + t$, taking the largest EF of its predecessors as its ES. A **backward pass** from the end gives the latest times, $LS = LF - t$, taking the smallest LS of its successors as its LF. **Float** $= LS - ES$; activities with zero float form the critical path.

When durations are uncertain, **PERT** uses three estimates, optimistic $a$, most likely $m$ and pessimistic $b$: $t_e = \frac{a + 4m + b}{6}$ and $\sigma = \frac{b - a}{6}$. Along the critical path the expected times and the variances add, and $z = \frac{T - \sum t_e}{\sqrt{\sum\sigma^2}}$ gives the chance of finishing by time $T$.

To finish earlier, **crash** critical activities (add crews, overtime), cheapest first by **cost slope** $\frac{C_c - C_n}{T_n - T_c}$, until another path becomes critical too.`,
      ],
      keyIdeas: [
        r`Forward pass: $EF = ES + t$; backward pass: $LS = LF - t$; float $= LS - ES$. Zero-float activities form the critical path.`,
        r`PERT: $t_e = \frac{a + 4m + b}{6}$, $\sigma = \frac{b - a}{6}$; $z = \frac{T - \sum t_e}{\sqrt{\sum\sigma^2}}$ along the critical path.`,
        r`Crashing: shorten critical activities with the lowest cost slope $\frac{C_c - C_n}{T_n - T_c}$ first.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The critical path',
          problem: r`Activities: A (3 d) → C (2 d) → E (4 d) and B (5 d) → D (3 d) → E. Find the duration, the critical path and A's float.`,
          steps: [
            r`Path A–C–E: $3 + 2 + 4 = 9$ days; path B–D–E: $5 + 3 + 4 = 12$ days.`,
            r`The longer path sets the duration: 12 days on B–D–E.`,
            r`Backward pass: E starts by $12 - 4 = 8$, C by $8 - 2 = 6$, A by $6 - 3 = 3$. A's float: $3 - 0 = 3$ days.`,
          ],
          answer: r`12 days on the critical path B–D–E; A has 3 days of float.`,
        },
        {
          level: 'board',
          title: 'The chance of finishing on time',
          problem: r`The critical activities' estimates (a, m, b) in days are B (3, 5, 7), D (2, 3, 4) and E (2, 4, 6). What is the chance of finishing within 13 days? Within 14?`,
          steps: [
            r`B: $t_e = \frac{3 + 20 + 7}{6} = 5$, $\sigma = \frac{4}{6}$; D: $t_e = 3$, $\sigma = \frac{2}{6}$; E: $t_e = 4$, $\sigma = \frac{4}{6}$.`,
            r`$\sum t_e = 12$; $\sum\sigma^2 = \frac{16 + 4 + 16}{36} = 1$, so $\sigma = 1$ day.`,
            r`13 days: $z = \frac{13 - 12}{1} = 1$, probability $0.841$.`,
            r`14 days: $z = 2$, probability $0.977$.`,
          ],
          answer: r`About 84% within 13 days; about 98% within 14.`,
        },
      ],
      traps: [
        r`Shortening a non-critical activity doesn't shorten the project.`,
        r`Add the variances along the path, never the standard deviations.`,
      ],
      check: [
        { q: r`What is float?`, a: r`How long an activity can slip without delaying the project: $LS - ES$.` },
        { q: r`Crashing D costs ₱8000 a day and B ₱5000 a day. Which first?`, a: r`B: the lower cost slope, as long as it stays critical.` },
      ],
    },
    {
      name: 'Project Cost and Risk',
      inShort: r`Estimating and budgeting cost, and planning for what might go wrong.`,
      body: [
        r`Cost estimates sharpen as the project is defined: **analogous** (from a similar past project, quick but rough), **parametric** (a unit rate times quantity, such as pesos per MVA), and **bottom-up** (summing every work package, slow but accurate). The budget adds a **contingency reserve** for identified risks and a **management reserve** for the unforeseen.

A **risk** is an uncertain event that would affect the project if it happened. Its **expected monetary value** is $EMV = p \times I$: probability times impact, negative for opportunities. The contingency is roughly the sum of the EMVs.

| Response | Threats | Opportunities |
|---|---|---|
| Remove the uncertainty | avoid (change the plan) | exploit (make sure it happens) |
| Hand it to another party | transfer (insurance, contract clauses) | share (a partner who can capture it) |
| Change the odds or size | mitigate | enhance |
| Do nothing in advance | accept | accept |`,
      ],
      keyIdeas: [
        r`Estimates: analogous, parametric, bottom-up; the budget adds a contingency reserve.`,
        r`Risk exposure $EMV = p \times I$; contingency ≈ the sum of the risks' EMVs.`,
        r`Responses: avoid, transfer, mitigate, accept (threats); exploit, share, enhance, accept (opportunities).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One risk',
          problem: r`There is a 20% chance that late equipment delivery costs ₱500,000. What is its risk exposure, and name a way to transfer it.`,
          steps: [
            r`$0.20 \times 500\,000 = 100\,000$ pesos.`,
            r`Transfer: put the cost on the supplier.`,
          ],
          answer: r`₱100,000; a penalty clause for late delivery in the supply contract.`,
        },
        {
          level: 'board',
          title: 'Sizing the contingency',
          problem: r`A substation project lists: late delivery (20%, ₱500,000), a failed factory test (10%, ₱1,200,000), rain delays (50%, ₱80,000), and a chance to reuse an existing control building (30%, saving ₱200,000). What contingency covers them?`,
          steps: [
            r`Threats: $100\,000 + 120\,000 + 40\,000 = 260\,000$ pesos.`,
            r`Opportunity: $0.30 \times 200\,000 = 60\,000$ pesos, subtracted.`,
            r`Contingency $\approx 260\,000 - 60\,000 = 200\,000$ pesos.`,
          ],
          answer: r`About ₱200,000.`,
        },
      ],
      traps: [
        r`Risks are uncertain events; issues are risks that have already happened.`,
        r`Insurance transfers a risk's cost, not the risk itself: the delay still happens.`,
      ],
      check: [
        { q: r`Which estimate is the most accurate, and why?`, a: r`Bottom-up: it sums every work package.` },
        { q: r`What does mitigating a risk mean?`, a: r`Reducing its probability or its impact.` },
      ],
    },
    {
      name: 'Project Control',
      inShort: r`Tracking progress and correcting course: earned value.`,
      body: [
        r`**Earned value management** compares three running totals: the **planned value** PV (the budgeted cost of work scheduled to date), the **earned value** EV (the budgeted cost of the work actually done) and the **actual cost** AC. Here is a ₱1 M project at month 4:`,
        {
          type: 'plot',
          alt: 'Cumulative cost in thousand pesos against months from 0 to 10. The planned value curve rises in an S shape to the 1000 budget at month 10. Up to month 4, actual cost runs at or above plan, reaching 420, while earned value lags below, at 350. Dashed lines mark the budget at completion, 1000, and the estimate at completion, 1200.',
          caption: 'At month 4: planned 400, earned 350, spent 420 (₱ thousand). Spending is above the work earned, and the work earned is behind the plan; at this rate the project costs ₱1.2 M.',
          x: [0, 10],
          y: [0, 1800],
          xLabel: 'month',
          yLabel: '₱ thousand',
          series: [
            { points: curve(PV), label: 'planned', dashed: true, colour: colourOf(0) },
            { points: curve(AC), label: 'actual cost', colour: colourOf(1) },
            { points: curve(EV), label: 'earned', colour: colourOf(2) },
          ],
          marks: [
            { y: BAC, label: 'BAC' },
            { y: BAC / (EV[4] / AC[4]), label: 'EAC' },
          ],
        },
        r`| Measure | Formula | Good when |
|---|---|---|
| Cost variance | $CV = EV - AC$ | positive (under budget) |
| Schedule variance | $SV = EV - PV$ | positive (ahead) |
| Cost performance index | $CPI = \frac{EV}{AC}$ | above 1 |
| Schedule performance index | $SPI = \frac{EV}{PV}$ | above 1 |
| Estimate at completion | $EAC = \frac{BAC}{CPI}$ (present rate continues) | at or below BAC |
| | $EAC = AC + (BAC - EV)$ (rest goes to plan) | |
| Estimate to complete | $ETC = EAC - AC$ | |

**Change control** keeps the baseline meaningful: every scope change goes through a formal request, an impact review, and approval before work starts.`,
      ],
      keyIdeas: [
        r`$CV = EV - AC$, $SV = EV - PV$, $CPI = \frac{EV}{AC}$, $SPI = \frac{EV}{PV}$.`,
        r`Forecast: $EAC = \frac{BAC}{CPI}$ if current cost performance continues.`,
        r`Change control: every scope change goes through a formal request, review and approval.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reading earned value',
          problem: r`At month 4 of a ₱1 M project: planned value ₱400,000, earned value ₱350,000, actual cost ₱420,000. How is it doing, and what will it cost?`,
          steps: [
            r`$CPI = \frac{350}{420} = 0.833$: over budget.`,
            r`$SPI = \frac{350}{400} = 0.875$: behind schedule.`,
            r`$EAC = \frac{1\,000\,000}{0.833} = 1\,200\,000$ pesos.`,
          ],
          answer: r`Over budget and behind; about ₱1.2 M at completion.`,
        },
        {
          level: 'board',
          title: 'Two forecasts',
          problem: r`For the same project, find CV, SV, the cost still to come and the overrun if the present cost rate continues. What would the project cost if the overrun so far was a one-off and the rest goes to plan?`,
          steps: [
            r`$CV = 350 - 420 = -70$; $SV = 350 - 400 = -50$ (₱ thousand).`,
            r`$ETC = 1200 - 420 = 780$; overrun $1200 - 1000 = 200$ (₱ thousand).`,
            r`One-off: $EAC = 420 + (1000 - 350) = 1070$ (₱ thousand).`,
          ],
          answer: r`CV −₱70,000, SV −₱50,000; ₱780,000 to go and a ₱200,000 overrun; ₱1.07 M if the rest goes to plan.`,
        },
      ],
      traps: [
        r`Spending exactly the planned amount says nothing about progress: compare with EARNED value.`,
        r`SV is in pesos, not days: a negative SV means less work done than planned by now.`,
      ],
      check: [
        { q: r`A project has CPI 1.1 and SPI 0.9. What does that mean?`, a: r`Under budget for the work done, but behind schedule.` },
        { q: r`What is EV?`, a: r`The budgeted cost of the work actually completed.` },
      ],
    },
  ],
};
