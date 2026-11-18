// Library › Lessons › ESAS › Engineering Economics (2026-11-18): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Money is in pesos.
const r = String.raw;

export default {
  topic: 'Engineering Economics',
  subject: 'ESAS',
  overview: r`Money has a time value: a peso today is worth more than a peso next year, because today's can earn interest. Engineering economics turns every cash flow of a project (costs, savings, salvage) into one comparable figure: a present worth, an annual worth, or a rate of return. Nearly every problem is solved the same way: draw the cash-flow diagram, match the rate to the period, move each amount to one point in time with the six interest factors, and compare. Use the rate PER PERIOD and the number of PERIODS, not years, whenever interest compounds more than once a year.`,
  sources: [
    'Engineering Economy (Sullivan, Wicks and Koelling)',
    'Engineering Economy (Blank and Tarquin)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Simple and Compound Interest',
      inShort: r`Interest on the principal alone, or on the principal and the interest already earned.`,
      keyIdeas: [
        r`Simple: $I = Pin$, $F = P(1 + in)$. Ordinary interest uses a 360-day year, exact interest 365.`,
        r`Compound: $F = P(1 + i)^n$, $P = F(1 + i)^{-n}$.`,
        r`Time to grow: $n = \frac{\ln(F/P)}{\ln(1 + i)}$; doubling takes about $\frac{72}{\text{rate \%}}$ periods.`,
        r`A discount rate $d$ (interest taken in advance) equals an interest rate $\frac{d}{1 - d}$.`,
      ],
      example: {
        problem: r`₱50,000 is deposited at 8% compounded quarterly. What is it worth after 5 years? What would 8% simple interest earn in 3 years?`,
        solution: r`$i = 0.02$, $n = 20$: $F = 50\,000(1.02)^{20} = ₱74{,}297$. Simple: $50\,000(0.08)(3) = ₱12{,}000$.`,
      },
      traps: [r`Match $i$ and $n$ to the compounding period: quarterly over 5 years is 20 periods at 2%.`],
    },
    {
      name: 'Nominal and Effective Rates',
      inShort: r`The rate as quoted, and the rate actually earned in a year.`,
      keyIdeas: [
        r`Nominal $r$ compounded $m$ times a year: $i = \frac{r}{m}$ per period.`,
        r`Effective $i_e = \left(1 + \frac{r}{m}\right)^m - 1$; back again $r = m\left[(1 + i_e)^{1/m} - 1\right]$.`,
        r`Continuous: $F = Pe^{rn}$, $i_e = e^r - 1$.`,
      ],
      example: {
        problem: r`Find the effective annual rate of 12% compounded monthly, and of 12% compounded continuously.`,
        solution: r`Monthly: $(1.01)^{12} - 1 = 12.68\%$. Continuous: $e^{0.12} - 1 = 12.75\%$.`,
      },
      traps: [r`Compare loans by their EFFECTIVE rates, never by the nominal ones.`],
    },
    {
      name: 'Cash Flow and Equivalence',
      inShort: r`Drawing cash flows on a time line and moving them to one point to compare.`,
      keyIdeas: [
        r`Amounts at different times can be added only after moving them to the same time: $X_k = X_j(1 + i)^{k - j}$.`,
        r`The six factors: $(F/P)$, $(P/F)$, $(F/A)$, $(A/F)$, $(P/A)$, $(A/P)$; $(A/P) = (A/F) + i$.`,
        r`Inflation: $1 + i_f = (1 + i)(1 + f)$ links the market rate to the real one.`,
      ],
      example: {
        problem: r`At 10% a year, what single amount at the end of year 5 equals ₱10,000 now plus ₱20,000 at the end of year 3?`,
        solution: r`$10\,000(1.1)^5 + 20\,000(1.1)^2 = 16\,105 + 24\,200 = ₱40{,}305$.`,
      },
      traps: [r`Costs and receipts point in opposite directions on the diagram: keep their signs.`],
    },
    {
      name: 'Annuities',
      inShort: r`Equal payments at equal intervals: loans, savings plans and leases.`,
      keyIdeas: [
        r`Ordinary (end of period): $P = A\frac{1 - (1 + i)^{-n}}{i}$, $F = A\frac{(1 + i)^n - 1}{i}$.`,
        r`Capital recovery $A = P(A/P)$; sinking fund $A = F(A/F)$.`,
        r`Annuity due: multiply by $(1 + i)$. Deferred $k$ periods: multiply by $(1 + i)^{-k}$.`,
        r`A loan's balance is the present worth of the payments still to come.`,
      ],
      example: {
        problem: r`A ₱800,000 car loan at 12% compounded monthly is repaid in 5 years. Find the monthly payment and the balance after 2 years.`,
        solution: r`$A = 800\,000 \times \frac{0.01}{1 - 1.01^{-60}} = ₱17{,}796$. After 24 payments: $17\,796 \times \frac{1 - 1.01^{-36}}{0.01} = ₱535{,}780$.`,
      },
      traps: [r`The ordinary annuity's $F$ falls on the date of the LAST payment.`],
    },
    {
      name: 'Perpetuity and Capitalized Cost',
      inShort: r`Payments that go on forever, and the money needed now to fund them.`,
      keyIdeas: [
        r`Perpetuity $P = \frac{A}{i}$; every $k$ periods $P = \frac{X}{(1 + i)^k - 1}$.`,
        r`Capitalized cost $= C_0 + \frac{OM}{i} + \frac{C_0 - C_L}{(1 + i)^L - 1}$.`,
        r`Used for permanent works: dams, roads, endowments.`,
      ],
      example: {
        problem: r`A ₱500,000 machine (salvage ₱50,000 after 20 years) costs ₱12,000 a year to run. At 7%, find its capitalized cost.`,
        solution: r`$500\,000 + \frac{12\,000}{0.07} + \frac{450\,000}{1.07^{20} - 1} = 500\,000 + 171\,429 + 156\,811 = ₱828{,}240$.`,
      },
      traps: [r`Replacement every $L$ years uses $(1 + i)^L - 1$ in the denominator, not $i$.`],
    },
    {
      name: 'Gradients',
      inShort: r`Cash flows that grow by a fixed amount or a fixed percentage each period.`,
      keyIdeas: [
        r`Arithmetic (0, G, 2G, …): $P_G = \frac{G}{i}\left[(P/A) - n(P/F)\right]$; $A_G = G\left[\frac1i - \frac{n}{(1 + i)^n - 1}\right]$.`,
        r`Total = base annuity + gradient: $P = A_1(P/A) + P_G$.`,
        r`Geometric: $P = A_1\frac{1 - \left(\frac{1 + g}{1 + i}\right)^n}{i - g}$, or $\frac{nA_1}{1 + i}$ when $i = g$.`,
      ],
      example: {
        problem: r`Maintenance is ₱5,000 the first year and rises ₱1,000 a year for 10 years. At 10%, find its present worth.`,
        solution: r`$5000(P/A, 10\%, 10) + \frac{1000}{0.1}\left[(P/A) - 10(P/F)\right] = 30\,723 + 22\,891 = ₱53{,}614$.`,
      },
      traps: [r`The gradient starts at period 2: the first year holds only the base amount.`],
    },
    {
      name: 'Depreciation',
      inShort: r`Spreading an asset's lost value over its life, for accounting and tax.`,
      keyIdeas: [
        r`Straight line $d = \frac{C_0 - C_L}{L}$; sinking fund $d = (C_0 - C_L)(A/F)$.`,
        r`Matheson $k = 1 - \left(\frac{C_L}{C_0}\right)^{1/L}$; double declining $k = \frac{2}{L}$; $BV_n = C_0(1 - k)^n$.`,
        r`SYD $d_n = (C_0 - C_L)\frac{L - n + 1}{L(L + 1)/2}$; service output by units used.`,
      ],
      example: {
        problem: r`A ₱100,000 asset has a ₱10,000 salvage value after 5 years. Find the first year's depreciation by straight line, SYD and double declining balance, and Matheson's rate.`,
        solution: r`Straight line $\frac{90\,000}{5} = ₱18{,}000$. SYD $90\,000\cdot\frac{5}{15} = ₱30{,}000$. DDB $100\,000(0.4) = ₱40{,}000$. Matheson $k = 1 - 0.1^{0.2} = 36.9\%$.`,
      },
      traps: [r`Double declining ignores salvage in its rate, but book value must not fall below it.`],
    },
    {
      name: 'Bonds',
      inShort: r`Long-term loans to a company or government, paid back with periodic interest.`,
      keyIdeas: [
        r`Value $= Zr(P/A, i, n) + C(P/F, i, n)$, at the buyer's rate $i$ per period.`,
        r`Buyer's rate = coupon rate: sells at par; higher: at a discount; lower: at a premium.`,
        r`Current yield $= \frac{Zr}{P}$; yield to maturity is the $i$ that makes the value equal the price.`,
      ],
      example: {
        problem: r`A ₱10,000 bond pays 8% a year, semiannually, and is redeemed at par in 10 years. What should a buyer pay to earn 10% compounded semiannually?`,
        solution: r`Coupon $10\,000(0.04) = 400$ per half-year, $i = 5\%$, $n = 20$: $400(P/A, 5\%, 20) + 10\,000(P/F, 5\%, 20) = 4985 + 3769 = ₱8{,}754$.`,
      },
      traps: [r`Semiannual coupons: halve both rates and double the years.`],
    },
    {
      name: 'Break-Even Analysis',
      inShort: r`The output at which income just covers cost, or two options cost the same.`,
      keyIdeas: [
        r`Break-even quantity $Q = \frac{FC}{p - v}$; profit $(p - v)Q - FC$.`,
        r`Two alternatives: set $FC_1 + v_1x = FC_2 + v_2x$ and solve for $x$.`,
        r`Above the break-even point, the option with the lower variable cost wins.`,
      ],
      example: {
        problem: r`A plant's fixed cost is ₱200,000 a month; each unit sells for ₱50 and costs ₱30 to make. How many units must it sell to break even?`,
        solution: r`$Q = \frac{200\,000}{50 - 30} = 10\,000$ units a month.`,
      },
      traps: [r`Convert first costs to a yearly figure (capital recovery) before comparing them with yearly costs.`],
    },
    {
      name: 'Present and Annual Worth',
      inShort: r`Comparing projects by their worth today, or as an equal yearly figure.`,
      keyIdeas: [
        r`$NPW = \sum CF_t(1 + i)^{-t}$ at the MARR; accept if $NPW \ge 0$.`,
        r`$EUAC = (C_0 - C_L)(A/P) + C_Li + OM$.`,
        r`Unequal lives: compare annual worths, or present worths over a common multiple of the lives.`,
      ],
      example: {
        problem: r`A ₱80,000 machine lasts 8 years, salvage ₱8,000, and costs ₱5,000 a year to run. At 10%, find its equivalent uniform annual cost.`,
        solution: r`$72\,000(A/P, 10\%, 8) + 8000(0.10) + 5000 = 13\,496 + 800 + 5000 = ₱19{,}296$ a year.`,
      },
      traps: [r`Present worth needs equal study periods; annual worth does not.`],
    },
    {
      name: 'Rate of Return and Payback',
      inShort: r`The interest rate a project earns, and how fast it pays back.`,
      keyIdeas: [
        r`IRR $i^*$: the rate that makes $NPW = 0$; accept if $i^* \ge$ MARR. Compare alternatives on the increment.`,
        r`Simple ROR $= \frac{\text{net annual profit}}{\text{capital}}$.`,
        r`Payback $= \frac{C_0}{\text{net annual cash flow}}$; the discounted payback is longer.`,
        r`External (modified) rate when cash flows change sign more than once.`,
      ],
      example: {
        problem: r`A ₱100,000 investment returns ₱30,000 a year for 5 years. Find its IRR and simple payback.`,
        solution: r`$-100\,000 + 30\,000(P/A, i^*, 5) = 0$ gives $(P/A) = 3.333$, so $i^* = 15.2\%$. Payback $\frac{100\,000}{30\,000} = 3.3$ years.`,
      },
      traps: [r`The highest IRR is not always the best choice between alternatives: test the increment.`],
    },
    {
      name: 'Benefit-Cost Ratio',
      inShort: r`Judging public projects by benefits to the people against costs to the government.`,
      keyIdeas: [
        r`$\frac{B}{C} = \frac{PW(\text{benefits} - \text{disbenefits})}{PW(\text{costs})}$; worth doing if $\ge 1$.`,
        r`Modified: $\frac{B - OM}{C_0}$; same accept/reject decision.`,
        r`Between alternatives: incremental $\frac{\Delta B}{\Delta C} \ge 1$ favours the costlier one.`,
      ],
      example: {
        problem: r`A flood-control project has benefits worth ₱12 million and costs worth ₱9 million (present worths). Is it justified?`,
        solution: r`$\frac{B}{C} = \frac{12}{9} = 1.33 \ge 1$: yes.`,
      },
      traps: [r`Disbenefits (harm to the public) go in the numerator as negatives, not into costs.`],
    },
    {
      name: 'Replacement Studies',
      inShort: r`Keeping an existing asset (defender) or replacing it (challenger).`,
      keyIdeas: [
        r`Compare the defender's and challenger's EUACs, each over its own remaining life.`,
        r`The defender's first cost is its market value NOW; its original cost and book value are sunk.`,
        r`Economic life: the life with the lowest EUAC.`,
      ],
      example: {
        problem: r`An old machine bought for ₱150,000 can be sold now for ₱60,000; it costs ₱40,000 a year to run and lasts 3 more years. A new one costs ₱200,000, lasts 10 years (salvage ₱20,000) and costs ₱15,000 a year. At 10%, replace?`,
        solution: r`Defender: $60\,000(A/P, 10\%, 3) + 40\,000 = ₱64{,}127$. Challenger: $180\,000(A/P, 10\%, 10) + 2000 + 15\,000 = ₱46{,}294$. Replace.`,
      },
      traps: [r`Ignore the ₱150,000: past costs don't affect the choice.`],
    },
    {
      name: 'Decisions Under Certainty, Risk and Uncertainty',
      inShort: r`Choosing when the outcome is known, has known odds, or has unknown odds.`,
      keyIdeas: [
        r`Certainty: one outcome per choice; pick the best.`,
        r`Risk: expected value $E = \sum p_ix_i$.`,
        r`Uncertainty: maximax (optimist), maximin (pessimist), Laplace (equal odds), Hurwicz $\alpha\max + (1 - \alpha)\min$, minimax regret.`,
      ],
      example: {
        problem: r`Three plans pay (in ₱ thousands) A: 50, 20, −10; B: 30, 25, 10; C: 15, 15, 15 in good, fair and poor years, with chances 0.3, 0.5, 0.2. Choose by expected value, by maximin and by maximax.`,
        solution: r`Expected: A 23, B 23.5, C 15, so B. Maximin: worst cases −10, 10, 15, so C. Maximax: best cases 50, 30, 15, so A.`,
      },
      traps: [r`Each criterion can pick a different plan: say which one the question asks for.`],
    },
  ],
};
