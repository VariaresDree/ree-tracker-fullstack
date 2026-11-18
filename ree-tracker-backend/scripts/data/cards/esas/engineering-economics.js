'use strict';

// ESAS › Engineering Economics formula cards (Library round, 2026-11-18): 5
// live cards for 14 subtopics (future value, effective rate, the annuity
// present worth, capital recovery, straight-line depreciation), all correct, so
// they are filed as they are. This file adds the rest: simple interest and
// discount, continuous compounding, inflation, every annuity and gradient
// factor, perpetuities and capitalized cost, the depreciation methods, bonds,
// break-even, present and annual worth, rates of return and payback, B/C
// ratios, replacement and decisions under risk. Money is in pesos (₱), like
// the live cards. See mathematics/algebra.js for the format;
// tests/engineeringEconomicsFormulas.test.js checks each against a period-by-
// period cash-flow run or another independent route.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const INT = 'Simple and Compound Interest';
const NOM = 'Nominal and Effective Rates';
const CASH = 'Cash Flow and Equivalence';
const ANN = 'Annuities';
const PERP = 'Perpetuity and Capitalized Cost';
const GRAD = 'Gradients';
const DEP = 'Depreciation';
const BOND = 'Bonds';
const BE = 'Break-Even Analysis';
const PW = 'Present and Annual Worth';
const ROR = 'Rate of Return and Payback';
const BC = 'Benefit-Cost Ratio';
const REP = 'Replacement Studies';
const DEC = 'Decisions Under Certainty, Risk and Uncertainty';

const file = [
    ['99d0cbe8-1080-4300-aa98-3bb44fa34c0d', INT, null], // Single Payment Compound Amount (Future Value)
    ['44fc3c52-ce95-4b0d-bf5c-453b46c2a6b1', NOM, null], // Effective Annual Interest Rate
    ['921af4a4-1901-47bc-a959-efa85f4034da', ANN, null], // Present Worth of an Ordinary Annuity
    ['fc91693a-8ba0-4586-a41a-1133e14652de', ANN, null], // Capital Recovery (Annual Equivalent of Present Worth)
    ['9f5de98d-8f08-4b12-a778-1e258a481e85', DEP, null], // Straight-Line Depreciation (Annual Charge)
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const PESO = '₱';
const P_ = v(r`$P$`, 'present worth', PESO);
const F_ = v(r`$F$`, 'future worth', PESO);
const A_ = v(r`$A$`, 'uniform payment per period', PESO);
const I_ = v(r`$i$`, 'interest rate per period');
const N_ = v(r`$n$`, 'number of periods');
const C0 = v(r`$C_0$`, 'first cost', PESO);
const CL = v(r`$C_L$`, 'salvage value at the end of its life', PESO);
const L_ = v(r`$L$`, 'useful life', 'years');

const drafts = [
    // Simple and Compound Interest
    P(INT, null, 'Simple Interest', r`$I = Pin$`, r`$I = Pin,\qquad F = P(1 + in)$`,
        [P_, I_, N_, v(r`$I$`, 'interest earned', PESO)],
        'Interest on the principal only, never on earlier interest.',
        'Ordinary simple interest counts a year as 360 days; exact interest as 365 (366 in a leap year).', PESO),
    P(INT, null, 'Present Worth of a Single Payment', r`$P = F(1 + i)^{-n}$`, r`$P = F(1 + i)^{-n} = F(P/F, i, n)$`,
        [F_, I_, N_],
        'What a sum due n periods from now is worth today.',
        'The discount factor (P/F) is the reciprocal of the compound amount factor (F/P).', PESO),
    P(INT, null, 'Time for a Sum to Grow', r`$n = \frac{\ln(F/P)}{\ln(1 + i)}$`, r`$n = \frac{\ln(F/P)}{\ln(1 + i)}$`,
        [F_, P_, I_],
        'How many periods money takes to reach a target at compound interest.',
        'Rule of 72: money doubles in about 72/(rate in %) periods; at 8%, about 9 years (exactly 9.01).', 'periods'),
    P(INT, null, 'Rate of Discount', r`$d = \frac{i}{1 + i}$`, r`$d = \frac{i}{1 + i},\qquad i = \frac{d}{1 - d}$`,
        [v(r`$d$`, 'rate of discount (interest deducted in advance)'), I_],
        'A loan whose interest is taken out at the start: the borrower receives F(1 − d) and repays F.',
        'A 10% discount is a 11.1% interest rate.'),
    // Nominal and Effective Rates
    P(NOM, null, 'Rate and Periods per Compounding', r`$i = \frac{r}{m}$`, r`$i = \frac{r}{m},\qquad n = mt$`,
        [v(r`$r$`, 'nominal annual rate'), v(r`$m$`, 'compounding periods per year'), v(r`$t$`, 'years')],
        'Turning a nominal annual rate into the rate per compounding period.',
        'Quarterly: m = 4; monthly: m = 12; semiannually: m = 2.'),
    P(NOM, null, 'Nominal Rate from an Effective Rate', r`$r = m[(1 + i_e)^{1/m} - 1]$`, r`$r = m\left[(1 + i_e)^{1/m} - 1\right]$`,
        [v(r`$i_e$`, 'effective annual rate'), v(r`$m$`, 'compounding periods per year')],
        'The nominal rate that gives a stated effective rate.',
        'Two rates are equivalent if they have the same effective annual rate.'),
    P(NOM, null, 'Continuous Compounding', r`$F = Pe^{rn}$`, r`$F = Pe^{rn},\qquad P = Fe^{-rn},\qquad i_e = e^r - 1$`,
        [P_, F_, v(r`$r$`, 'nominal annual rate'), v(r`$n$`, 'years')],
        'Interest compounded every instant: the limit as m grows without bound.',
        '12% compounded continuously is an effective 12.75% a year.', PESO),
    // Cash Flow and Equivalence
    P(CASH, null, 'Moving a Sum Along the Time Line', r`$X_k = X_j(1 + i)^{k - j}$`, r`$X_k = X_j(1 + i)^{k - j}$`,
        [v(r`$X_j$`, 'a sum at period j', PESO), v(r`$X_k$`, 'its equivalent at period k', PESO), I_],
        'Cash flows can be added only at the same point in time: move each one there first.',
        'Forward (k > j) compounds, backward discounts. Draw the cash-flow diagram before writing anything.', PESO),
    P(CASH, null, 'Standard Factor Notation', r`$(X/Y, i, n)$`, r`$(F/P) = (1 + i)^n;\ (P/F) = (1 + i)^{-n};\ (F/A) = \frac{(1 + i)^n - 1}{i};\ (A/F) = \frac{i}{(1 + i)^n - 1};\ (P/A) = \frac{1 - (1 + i)^{-n}}{i};\ (A/P) = \frac{i}{1 - (1 + i)^{-n}}$`,
        [I_, N_],
        'The six interest factors: "find X given Y" at rate i over n periods.',
        '(A/P) = (A/F) + i: a capital-recovery payment is a sinking-fund payment plus interest.'),
    P(CASH, null, 'Interest and Inflation', r`$1 + i_f = (1 + i)(1 + f)$`, r`$1 + i_f = (1 + i)(1 + f),\qquad i_f = i + f + if$`,
        [v(r`$i_f$`, 'market (inflated) interest rate'), v(r`$i$`, 'real interest rate'), v(r`$f$`, 'inflation rate')],
        'The rate that keeps buying power growing at i while prices rise at f.',
        'Real rate from market rate: i = (i_f − f)/(1 + f), a bit less than i_f − f.'),
    // Annuities
    P(ANN, null, 'Future Worth of an Ordinary Annuity', r`$F = A\frac{(1 + i)^n - 1}{i}$`, r`$F = A\left[\frac{(1 + i)^n - 1}{i}\right]$`,
        [A_, I_, N_],
        'What equal end-of-period payments add up to by the last payment.',
        'F falls on the date of the LAST payment, not one period after.', PESO),
    P(ANN, null, 'Sinking Fund Payment', r`$A = F\frac{i}{(1 + i)^n - 1}$`, r`$A = F\left[\frac{i}{(1 + i)^n - 1}\right]$`,
        [F_, I_, N_],
        'The equal deposit that builds up to a target amount.',
        'Used to save for a replacement: deposits at the end of each period.', PESO),
    P(ANN, null, 'Annuity Due', r`$P = A(P/A, i, n)(1 + i)$`, r`$P = A\left[\frac{1 - (1 + i)^{-n}}{i}\right](1 + i),\qquad F = A\left[\frac{(1 + i)^n - 1}{i}\right](1 + i)$`,
        [A_, I_, N_],
        'Payments at the START of each period (rent, insurance premiums).',
        'Equivalently, P = A + A(P/A, i, n − 1).', PESO),
    P(ANN, null, 'Deferred Annuity', r`$P = A(P/A, i, n)(1 + i)^{-k}$`, r`$P = A\left[\frac{1 - (1 + i)^{-n}}{i}\right](1 + i)^{-k}$`,
        [A_, I_, N_, v(r`$k$`, 'periods of deferment (the first payment is at period k + 1)')],
        'An annuity whose first payment comes after a delay.',
        'If the first payment is at the end of year 5, k = 4.', PESO),
    P(ANN, null, 'Outstanding Balance of an Amortized Loan', r`$B_k = A(P/A, i, n - k)$`, r`$B_k = A\left[\frac{1 - (1 + i)^{-(n - k)}}{i}\right]$`,
        [A_, I_, N_, v(r`$k$`, 'payments already made'), v(r`$B_k$`, 'balance right after payment k', PESO)],
        'What is still owed on a loan: the present worth of the payments left.',
        'Payment k\'s interest is i·B₍k−1₎; the rest of A pays down principal.', PESO),
    // Perpetuity and Capitalized Cost
    P(PERP, null, 'Perpetuity', r`$P = \frac{A}{i}$`, r`$P = \frac{A}{i}$`,
        [A_, I_],
        'The present worth of equal payments that go on forever.',
        'The (P/A, i, n) factor tends to 1/i as n grows: at 10%, 50 years already gives 9.91 of the 10.', PESO),
    P(PERP, null, 'Perpetuity Paid Every k Periods', r`$P = \frac{X}{(1 + i)^k - 1}$`, r`$P = \frac{X}{(1 + i)^k - 1}$`,
        [v(r`$X$`, 'amount paid at the end of every k periods', PESO), I_, v(r`$k$`, 'periods between payments')],
        'An endless series of payments that come only every k periods, like a replacement every 10 years.',
        'With k = 1 it is A/i.', PESO),
    P(PERP, null, 'Capitalized Cost', r`$CC = C_0 + \frac{OM}{i} + \frac{C_0 - C_L}{(1 + i)^L - 1}$`, r`$CC = C_0 + \frac{OM}{i} + \frac{C_0 - C_L}{(1 + i)^L - 1}$`,
        [C0, v(r`$OM$`, 'yearly operating and maintenance cost', PESO), CL, L_, I_],
        'The money needed now to buy an asset and keep it, replacing it at each life\'s end, forever.',
        'Compare alternatives that last forever (dams, roads) by the lowest capitalized cost.', PESO),
    // Gradients
    P(GRAD, null, 'Arithmetic Gradient Present Worth', r`$P_G = \frac{G}{i}\left[(P/A) - n(P/F)\right]$`, r`$P_G = \frac{G}{i}\left[\frac{1 - (1 + i)^{-n}}{i} - \frac{n}{(1 + i)^n}\right]$`,
        [v(r`$G$`, 'yearly increase (the first gradient amount is at period 2)', PESO), I_, N_],
        'Present worth of a series rising by G each period: 0, G, 2G, …, (n − 1)G.',
        'Add the base series separately: P = A₁(P/A) + P_G. For a decreasing series, subtract.', PESO),
    P(GRAD, null, 'Arithmetic Gradient to Annual Worth', r`$A_G = G\left[\frac{1}{i} - \frac{n}{(1 + i)^n - 1}\right]$`, r`$A_G = G\left[\frac{1}{i} - \frac{n}{(1 + i)^n - 1}\right]$`,
        [v(r`$G$`, 'yearly increase', PESO), I_, N_],
        'The uniform series equal to an arithmetic gradient.',
        'A perpetual gradient: P = A/i + G/i².', PESO),
    P(GRAD, null, 'Geometric Gradient Present Worth', r`$P_g$`, r`$P = A_1\left[\frac{1 - \left(\frac{1 + g}{1 + i}\right)^n}{i - g}\right]\ (i \ne g),\qquad P = \frac{nA_1}{1 + i}\ (i = g)$`,
        [v(r`$A_1$`, 'first payment (end of period 1)', PESO), v(r`$g$`, 'growth rate per period'), I_, N_],
        'Present worth of payments that grow by a fixed percentage each period.',
        'Escalating fuel or maintenance costs are geometric gradients.', PESO),
    // Depreciation
    P(DEP, null, 'Sinking Fund Depreciation', r`$d = (C_0 - C_L)\frac{i}{(1 + i)^L - 1}$`, r`$d = (C_0 - C_L)\left[\frac{i}{(1 + i)^L - 1}\right],\qquad BV_n = C_0 - d\left[\frac{(1 + i)^n - 1}{i}\right]$`,
        [C0, CL, L_, I_],
        'Depreciation as deposits into a fund that earns interest and reaches C₀ − C_L at the end of the life.',
        'Total depreciation after n years is the fund\'s value then, not n·d.', PESO),
    P(DEP, null, 'Declining Balance (Matheson)', r`$BV_n = C_0(1 - k)^n$`, r`$k = 1 - \left(\frac{C_L}{C_0}\right)^{1/L},\qquad d_n = C_0k(1 - k)^{n-1},\qquad BV_n = C_0(1 - k)^n$`,
        [C0, CL, L_, v(r`$k$`, 'fixed yearly rate')],
        'Each year writes off the same fraction of what is left.',
        'It needs a salvage value above zero; heavy early charges suit equipment that ages fast.', PESO),
    P(DEP, null, 'Double Declining Balance', r`$k = \frac{2}{L}$`, r`$k = \frac{2}{L},\qquad d_n = C_0k(1 - k)^{n-1},\qquad BV_n = C_0(1 - k)^n$`,
        [C0, L_],
        'Declining balance at twice the straight-line rate, ignoring salvage.',
        'Book value never goes below the salvage value: stop depreciating once it reaches it.', PESO),
    P(DEP, null, "Sum-of-the-Years'-Digits", r`$d_n = (C_0 - C_L)\frac{L - n + 1}{SYD}$`, r`$d_n = (C_0 - C_L)\frac{L - n + 1}{SYD},\qquad SYD = \frac{L(L + 1)}{2}$`,
        [C0, CL, L_, v(r`$n$`, 'year')],
        'Front-loaded depreciation: year 1 takes L/SYD of the total, the last year 1/SYD.',
        'After n years the total is (C₀ − C_L)·n(2L − n + 1)/(L(L + 1)).', PESO),
    P(DEP, null, 'Service Output (Units of Production)', r`$d = \frac{C_0 - C_L}{U}\,u$`, r`$d = \frac{C_0 - C_L}{U}\,u$`,
        [C0, CL, v(r`$U$`, 'total units (hours, km, tonnes) in its life'), v(r`$u$`, 'units this year')],
        'Depreciation by use rather than by time.',
        'Depletion of a mine or well works the same way: cost per unit of reserve × units taken.', PESO),
    // Bonds
    P(BOND, null, 'Value of a Bond', r`$P = Zr(P/A, i, n) + C(P/F, i, n)$`, r`$P = Zr\left[\frac{1 - (1 + i)^{-n}}{i}\right] + C(1 + i)^{-n}$`,
        [v(r`$Z$`, 'face (par) value', PESO), v(r`$r$`, 'bond (coupon) rate per period'), v(r`$C$`, 'redemption value, usually Z', PESO), v(r`$i$`, 'investor\'s rate per period'), N_],
        'What a bond is worth to a buyer: its coupons and its redemption, discounted at the buyer\'s rate.',
        'If the buyer\'s rate equals the coupon rate, the bond sells at par; a higher rate means a discount.', PESO),
    P(BOND, null, 'Current Yield of a Bond', r`$\text{current yield} = \frac{Zr}{P}$`, r`$\text{current yield} = \frac{Zr}{P}$`,
        [v(r`$Zr$`, 'yearly interest paid', PESO), v(r`$P$`, 'market price', PESO)],
        'The interest a bond pays each year as a share of its price.',
        'It ignores the gain or loss at redemption; the yield to maturity is the i that makes the bond\'s value equal its price.'),
    // Break-Even Analysis
    P(BE, null, 'Break-Even Quantity', r`$Q_{BE} = \frac{FC}{p - v}$`, r`$Q_{BE} = \frac{FC}{p - v},\qquad \text{profit} = (p - v)Q - FC$`,
        [v(r`$FC$`, 'fixed cost per period', PESO), v(r`$p$`, 'selling price per unit', PESO), v(r`$v$`, 'variable cost per unit', PESO)],
        'The output at which sales just cover all costs.',
        'p − v is the contribution margin: each unit sold covers that much of the fixed cost.', 'units'),
    P(BE, null, 'Break-Even Between Two Alternatives', r`$x = \frac{FC_2 - FC_1}{v_1 - v_2}$`, r`$FC_1 + v_1x = FC_2 + v_2x\ \Rightarrow\ x = \frac{FC_2 - FC_1}{v_1 - v_2}$`,
        [v(r`$FC_1, FC_2$`, 'fixed costs (yearly cost of ownership)', PESO), v(r`$v_1, v_2$`, 'costs per unit of use', PESO), v(r`$x$`, 'level of use')],
        'The level of use (hours, units) at which two options cost the same.',
        'Above it, the option with the lower cost per unit wins.'),
    // Present and Annual Worth
    P(PW, null, 'Net Present Worth', r`$NPW = \sum_{t=0}^{n}\frac{CF_t}{(1 + i)^t}$`, r`$NPW = \sum_{t=0}^{n}\frac{CF_t}{(1 + i)^t}$`,
        [v(r`$CF_t$`, 'net cash flow at the end of period t (outflows negative)', PESO), v(r`$i$`, 'minimum attractive rate of return (MARR)')],
        'All of a project\'s cash flows brought to today at the MARR.',
        'NPW ≥ 0: the project earns at least the MARR. Compare unequal lives over a common multiple, or use annual worth.', PESO),
    P(PW, null, 'Equivalent Uniform Annual Cost', r`$EUAC = (C_0 - C_L)(A/P, i, n) + C_Li + OM$`, r`$EUAC = (C_0 - C_L)(A/P, i, n) + C_Li + OM$`,
        [C0, CL, v(r`$OM$`, 'yearly operating cost', PESO), I_, N_],
        'An asset\'s whole cost as one equal yearly figure: capital recovery plus running costs.',
        'Equivalently C₀(A/P) − C_L(A/F) + OM. Annual worth compares alternatives with different lives directly.', PESO),
    // Rate of Return and Payback
    P(ROR, null, 'Internal Rate of Return', r`$\sum_t CF_t(1 + i^*)^{-t} = 0$`, r`$\sum_{t=0}^{n} CF_t(1 + i^*)^{-t} = 0$`,
        [v(r`$CF_t$`, 'net cash flow at period t', PESO), v(r`$i^*$`, 'internal rate of return')],
        'The interest rate at which a project\'s present worth is zero.',
        'Accept if i* ≥ MARR. Find it by trial and interpolation; compare alternatives on the INCREMENTAL investment.'),
    P(ROR, null, 'Simple Rate of Return', r`$ROR$`, r`$ROR = \frac{\text{net annual profit}}{\text{capital invested}}\times 100\%$`,
        [v(r`$\text{net annual profit}$`, 'yearly profit after depreciation', PESO)],
        'The board\'s quick measure of an investment\'s yearly return.',
        'Net profit counts depreciation as a cost (often by sinking fund at the MARR).'),
    P(ROR, null, 'Payback Period', r`$n_{pb} = \frac{C_0}{\text{net annual cash flow}}$`, r`$n_{pb} = \frac{C_0}{\text{net annual cash flow}};\qquad \text{discounted: smallest } n \text{ with } \sum_{t=1}^{n} CF_t(1 + i)^{-t} \ge C_0$`,
        [C0, v(r`$\text{net annual cash flow}$`, 'yearly savings or income before depreciation', PESO)],
        'How long an investment takes to earn back its cost.',
        'Simple payback ignores interest and everything after it; discounted payback is always longer.', 'years'),
    P(ROR, null, 'External (Modified) Rate of Return', r`$F_{\text{in}} = P_{\text{out}}(1 + i')^n$`, r`$\sum_t I_t(1 + \varepsilon)^{n - t} = \left[\sum_t O_t(1 + \varepsilon)^{-t}\right](1 + i')^n$`,
        [v(r`$I_t, O_t$`, 'inflows and outflows at period t', PESO), v(r`$\varepsilon$`, 'external reinvestment rate (often the MARR)'), v(r`$i'$`, 'external rate of return')],
        'A single, unambiguous rate: inflows compounded forward and outflows discounted back at an outside rate.',
        'Use it when cash flows change sign more than once and the IRR is not unique.'),
    // Benefit-Cost Ratio
    P(BC, null, 'Benefit-Cost Ratio', r`$\frac{B}{C} = \frac{PW_{benefits}}{PW_{costs}}$`, r`$\frac{B}{C} = \frac{PW(\text{benefits} - \text{disbenefits})}{PW(\text{costs})};\qquad \text{modified: } \frac{B - OM}{C_0}$`,
        [v(r`$B$`, 'benefits to the public', PESO), v(r`$C$`, 'costs to the government', PESO)],
        'The test for public projects: worth doing if B/C ≥ 1.',
        'The modified ratio moves O&M to the numerator; it can rank differently but gives the same accept/reject.'),
    P(BC, null, 'Incremental Benefit-Cost Ratio', r`$\frac{\Delta B}{\Delta C}$`, r`$\frac{\Delta B}{\Delta C} = \frac{B_2 - B_1}{C_2 - C_1} \ge 1 \Rightarrow \text{choose the costlier alternative}$`,
        [v(r`$B_1, C_1$`, 'benefits and cost of the cheaper option', PESO), v(r`$B_2, C_2$`, 'of the costlier option', PESO)],
        'Choosing between public projects: is the extra spending worth it?',
        'Never pick by the highest overall B/C: rank by cost and test each increment.'),
    // Replacement Studies
    P(REP, null, 'Defender versus Challenger', r`$EUAC_D \text{ vs } EUAC_C$`, r`$EUAC_D = (MV - C_L)(A/P, i, n_D) + C_Li + OM_D;\qquad \text{replace if } EUAC_C < EUAC_D$`,
        [v(r`$MV$`, 'the defender\'s market (trade-in) value now', PESO), v(r`$OM_D$`, 'the defender\'s yearly cost', PESO), v(r`$n_D$`, 'its remaining life', 'years')],
        'Keep the old asset (defender) or replace it (challenger): compare their annual costs over their own lives.',
        'The defender\'s cost is its CURRENT market value; its original cost and book value are sunk.'),
    P(REP, null, 'Economic Service Life', r`$n^* = \arg\min_n EUAC(n)$`, r`$EUAC(n) = C_0(A/P, i, n) - MV_n(A/F, i, n) + \left[\sum_{t=1}^{n} OM_t(1 + i)^{-t}\right](A/P, i, n)$`,
        [C0, v(r`$MV_n$`, 'market value after n years', PESO), v(r`$OM_t$`, 'operating cost in year t', PESO), I_],
        'The life that makes an asset\'s annual cost lowest: falling capital cost against rising running cost.',
        'Replace at the economic life, not when the asset wears out.', 'years'),
    // Decisions Under Certainty, Risk and Uncertainty
    P(DEC, null, 'Expected Value', r`$E = \sum p_ix_i$`, r`$E = \sum p_ix_i,\qquad \sum p_i = 1$`,
        [v(r`$p_i$`, 'probability of outcome i'), v(r`$x_i$`, 'payoff of outcome i', PESO)],
        'The average result of a risky choice, weighting each outcome by its probability (decisions under risk).',
        'The value of perfect information = expected payoff with it − best expected payoff without it.', PESO),
    P(DEC, null, 'Decision Criteria Under Uncertainty', r`$\text{Hurwicz} = \alpha\max + (1 - \alpha)\min$`, r`$\text{maximax};\ \text{maximin};\ \text{Laplace: } \frac{1}{m}\sum x_j;\ \text{Hurwicz: } \alpha\max_j x_j + (1 - \alpha)\min_j x_j;\ \text{minimax regret}$`,
        [v(r`$\alpha$`, 'coefficient of optimism, 0 to 1'), v(r`$m$`, 'number of possible states')],
        'Ways to choose when the probabilities are unknown, from optimist to pessimist.',
        'Regret = best payoff in that state − this payoff; minimax regret picks the smallest worst regret.', PESO),
];

module.exports = { subject: 'ESAS', topic: 'Engineering Economics', migration: '20261219000000_cards_engineering_economics', file, revisions, retire, drafts };
