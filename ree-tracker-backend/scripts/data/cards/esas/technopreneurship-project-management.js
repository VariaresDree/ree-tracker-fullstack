'use strict';

// ESAS › Technopreneurship & Project Management formula cards (Library round,
// 2026-11-18): the topic had no cards. Engineering Economics already holds
// break-even quantity, present worth, IRR, payback and expected value, so
// those aren't repeated. This file adds market sizing and growth, unit
// economics (CAC, LTV), margins and the break-even revenue, startup runway and
// valuation, Philippine IP terms (RA 8293), and project management: CPM
// float, PERT, crashing, earned value and risk exposure. See
// mathematics/algebra.js for the format; tests/technopreneurshipFormulas.test.js
// checks each against a worked network, a simulation or another route.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const CUST = 'Customers and Value Proposition';
const MKT = 'Market Identification and Analysis';
const BIZ = 'Business Models';
const IP = 'Intellectual Property';
const PLAN = 'Business Plan and Financial Analysis';
const CAP = 'Raising Capital';
const WBS = 'Work Breakdown and Gantt Charts';
const CPM = 'CPM and PERT';
const COST = 'Project Cost and Risk';
const CTRL = 'Project Control';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const PESO = '₱';

const drafts = [
    // Customers and Value Proposition
    P(CUST, null, 'Customer Lifetime Value and Acquisition Cost', r`$\frac{LTV}{CAC}$`, r`$LTV = \frac{\text{ARPU} \times \text{gross margin}}{\text{churn}},\qquad CAC = \frac{\text{sales and marketing spend}}{\text{new customers}}$`,
        [v(r`$\text{ARPU}$`, 'average revenue per user per period', PESO), v(r`$\text{churn}$`, 'fraction of customers lost per period')],
        'What a customer is worth over their life, against what it costs to win one.',
        'A healthy business has LTV at least 3 times CAC. Expected customer lifetime is 1/churn periods.'),
    // Market Identification and Analysis
    P(MKT, null, 'Market Sizing (TAM, SAM, SOM)', r`$SOM = SAM \times s$`, r`$TAM \supseteq SAM \supseteq SOM;\qquad SOM = SAM \times s$`,
        [v(r`$TAM$`, 'total addressable market', PESO), v(r`$SAM$`, 'the part your product and channels can serve', PESO), v(r`$s$`, 'share you can realistically win')],
        'How big the opportunity is: the whole market, the part you can reach, and the part you can win.',
        'Build it bottom-up (customers × price) and check it against a top-down estimate.', PESO),
    P(MKT, null, 'Compound Annual Growth Rate', r`$CAGR = \left(\frac{V_n}{V_0}\right)^{1/n} - 1$`, r`$CAGR = \left(\frac{V_n}{V_0}\right)^{1/n} - 1$`,
        [v(r`$V_0, V_n$`, 'starting and ending values'), v(r`$n$`, 'years')],
        'The steady yearly growth that turns the starting value into the ending one.',
        'Not the average of the yearly growth rates: +50% then −50% is a CAGR of −13%, not 0%.'),
    // Business Models
    P(BIZ, null, 'Markup and Margin', r`$\text{margin} = \frac{\text{markup}}{1 + \text{markup}}$`, r`$\text{markup} = \frac{P - C}{C},\qquad \text{margin} = \frac{P - C}{P} = \frac{\text{markup}}{1 + \text{markup}}$`,
        [v(r`$P$`, 'selling price', PESO), v(r`$C$`, 'cost', PESO)],
        'Two ways to state the same profit on a sale: as a share of cost, or of price.',
        'A 50% markup is a 33% margin; a 100% markup is a 50% margin.'),
    // Business Plan and Financial Analysis
    P(PLAN, null, 'Break-Even Sales Revenue', r`$S_{BE} = \frac{FC}{CMR}$`, r`$CMR = \frac{P - V}{P},\qquad S_{BE} = \frac{FC}{CMR}$`,
        [v(r`$FC$`, 'fixed costs', PESO), v(r`$P, V$`, 'price and variable cost per unit', PESO)],
        'The sales revenue (not units) that covers all costs, from the contribution margin ratio.',
        'Margin of safety = (actual sales − break-even sales) ÷ actual sales.', PESO),
    P(PLAN, null, 'Financial Ratios', r`$ROI = \frac{\text{gain} - \text{cost}}{\text{cost}}$`, r`$ROI = \frac{\text{gain} - \text{cost}}{\text{cost}};\quad \text{net margin} = \frac{\text{net income}}{\text{revenue}};\quad \text{current ratio} = \frac{\text{current assets}}{\text{current liabilities}};\quad \frac{D}{E} = \frac{\text{total debt}}{\text{equity}}$`,
        [v(r`$\text{gain, cost}$`, 'return and investment', PESO)],
        'Quick checks of profitability, liquidity and leverage in a business plan.',
        'A current ratio below 1 means short-term debts exceed short-term assets.'),
    P(PLAN, null, 'Cash Runway', r`$\text{runway} = \frac{\text{cash}}{\text{burn}}$`, r`$\text{runway} = \frac{\text{cash on hand}}{\text{net monthly burn}}$`,
        [v(r`$\text{burn}$`, 'cash spent per month minus cash coming in', PESO)],
        'How many months a startup can operate before it runs out of money.',
        'Start raising money with at least 6 months of runway left: fundraising takes months.', 'months'),
    // Raising Capital
    P(CAP, null, 'Pre-Money and Post-Money Valuation', r`$V_{post} = V_{pre} + I$`, r`$V_{post} = V_{pre} + I,\qquad \text{investor's share} = \frac{I}{V_{post}}$`,
        [v(r`$V_{pre}$`, 'value of the company before the investment', PESO), v(r`$I$`, 'amount invested', PESO)],
        'How much of the company an investment buys.',
        'Each round dilutes the founders: their share is multiplied by (1 − the new investor\'s share).', PESO),
    // Intellectual Property
    K(IP, 'Terms of IP Protection (RA 8293)', r`$20\ \text{yr}$`, r`$\text{patent } 20 \text{ years from filing};\ \text{utility model } 7 \text{ years};\ \text{industrial design } 5 \text{ years, renewable twice};\ \text{trademark } 10 \text{ years, renewable};\ \text{copyright: life} + 50 \text{ years}$`, 'How long each kind of intellectual property is protected under the Philippine IP Code (RA 8293).', 'A patent needs novelty, an inventive step and industrial applicability; a utility model skips the inventive step. Trade secrets last as long as they stay secret.'),
    // Work Breakdown and Gantt Charts
    P(WBS, null, 'Activity Duration from Effort', r`$t = \frac{W}{n \cdot p}$`, r`$t = \frac{W}{n\,p}$`,
        [v(r`$W$`, 'work content', 'person-days'), v(r`$n$`, 'people assigned'), v(r`$p$`, 'productivity factor (1 = full time)')],
        'How long a work package takes with a given crew: the durations a Gantt chart is built from.',
        'Adding people rarely shortens work in proportion: coordination costs grow (Brooks\'s law).', 'days'),
    // CPM and PERT
    P(CPM, null, 'Critical Path Float', r`$TF = LS - ES$`, r`$EF = ES + t,\quad LS = LF - t,\quad TF = LS - ES = LF - EF$`,
        [v(r`$ES, EF$`, 'earliest start and finish (forward pass)', 'days'), v(r`$LS, LF$`, 'latest start and finish (backward pass)', 'days'), v(r`$t$`, 'activity duration', 'days')],
        'How long an activity can slip without delaying the project; zero-float activities form the critical path.',
        'The critical path is the LONGEST path through the network: it sets the project\'s duration.', 'days'),
    P(CPM, null, 'PERT Time Estimates', r`$t_e = \frac{a + 4m + b}{6}$`, r`$t_e = \frac{a + 4m + b}{6},\qquad \sigma = \frac{b - a}{6},\qquad z = \frac{T - \sum t_e}{\sqrt{\sum\sigma^2}}$`,
        [v(r`$a, m, b$`, 'optimistic, most likely and pessimistic times', 'days'), v(r`$T$`, 'target completion time', 'days')],
        'Expected durations from three estimates, and the chance of finishing the critical path by a deadline.',
        'Add VARIANCES along the critical path, not standard deviations.', 'days'),
    P(CPM, null, 'Crashing Cost Slope', r`$\frac{C_c - C_n}{T_n - T_c}$`, r`$\text{cost slope} = \frac{C_{crash} - C_{normal}}{T_{normal} - T_{crash}}$`,
        [v(r`$C$`, 'activity cost', PESO), v(r`$T$`, 'activity duration', 'days')],
        'The extra cost per day of shortening an activity.',
        'Crash the critical activity with the lowest slope first, and recheck the critical path after each step.', r`$\text{₱/day}$`),
    // Project Cost and Risk
    P(COST, null, 'Risk Exposure', r`$EMV = p \times I$`, r`$EMV = p \times I;\qquad \text{contingency} \approx \sum EMV$`,
        [v(r`$p$`, 'probability the risk occurs'), v(r`$I$`, 'impact if it does (negative for threats)', PESO)],
        'A risk\'s expected monetary value, used to rank risks and size the contingency reserve.',
        'Responses: avoid, transfer (insurance, contracts), mitigate, or accept.', PESO),
    // Project Control
    P(CTRL, null, 'Earned Value Management', r`$CPI = \frac{EV}{AC}$`, r`$CV = EV - AC,\quad SV = EV - PV,\quad CPI = \frac{EV}{AC},\quad SPI = \frac{EV}{PV},\quad EAC = \frac{BAC}{CPI}$`,
        [v(r`$PV$`, 'planned value: budget for the work scheduled', PESO), v(r`$EV$`, 'earned value: budget for the work done', PESO), v(r`$AC$`, 'actual cost of the work done', PESO), v(r`$BAC$`, 'budget at completion', PESO)],
        'How far a project is over budget and behind schedule, and what it will cost at completion.',
        'CPI or SPI below 1 is bad: over budget, behind schedule. Negative CV or SV means the same.'),
];

module.exports = { subject: 'ESAS', topic: 'Technopreneurship & Project Management', migration: '20261224000000_cards_technopreneurship_project_management', file, revisions, retire, drafts };
