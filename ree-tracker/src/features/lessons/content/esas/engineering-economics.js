// Library › Lessons › ESAS › Engineering Economics
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// economicsLesson.test.js. Coverage and problem styles cross-checked against a
// review center's engineering economics handout; the text, problems and
// figures are this app's own): written for the Philippine REE board,
// subtopic by subtopic in the syllabus's order. Money is in pesos.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const PA = (i, n) => (i === 0 ? n : (1 - (1 + i) ** -n) / i);
const AP = (i, n) => 1 / PA(i, n);

// The machine of the economic-life figure: ₱200,000 new, resale falling 20% a year, O&M ₱15,000 rising ₱5,000 a year, 10%.
export const keepCost = (n) => {
  const salvage = 200000 * 0.8 ** n;
  const gradient = 5000 * (1 / 0.1 - n / (1.1 ** n - 1));
  return (200000 - salvage) * AP(0.1, n) + salvage * 0.1 + 15000 + gradient;
};

// Book values (₱ thousands) of the ₱100,000, 5-year, ₱10,000-salvage asset by four methods.
const YEARS = [0, 1, 2, 3, 4, 5];
const SYD_LEFT = [15, 10, 6, 3, 1, 0];
const BOOK = {
  line: YEARS.map((n) => [n, 100 - 18 * n]),
  syd: YEARS.map((n) => [n, 10 + (90 * SYD_LEFT[n]) / 15]),
  ddb: YEARS.map((n) => [n, 100 * 0.6 ** n]),
  matheson: YEARS.map((n) => [n, 100 * 0.1 ** (n / 5)]),
};

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
      body: [
        r`**Interest** is the price of using money: the borrower's cost, the lender's income. **Simple interest** is charged on the principal only, $I = Pin$, so the amount grows in a straight line; it suits short loans measured in days. **Ordinary** simple interest counts a banker's year of 360 days ($n = \frac{d}{360}$); **exact** simple interest uses 365 (366 in a leap year) and the true number of days.`,
        r`**Compound interest** earns interest on interest, $F = P(1 + i)^n$, so the amount grows exponentially and soon pulls away from simple interest:`,
        {
          type: 'plot',
          alt: 'The value of 50,000 pesos at 8 percent over 20 years: simple interest, dashed, rises in a straight line to 130,000; compound interest, quarterly, curves upward, doubling to 100,000 at about 8.75 years and reaching about 244,000 at 20 years.',
          caption: '₱50,000 at 8%: simple interest (dashed) grows in a line; compounded quarterly it doubles in 8.75 years.',
          x: [0, 20],
          y: [0, 260],
          xLabel: 'years',
          yLabel: '₱ thousands',
          series: [
            { f: (t) => 50 * 1.02 ** (4 * t), label: 'compound', area: true },
            { f: (t) => 50 * (1 + 0.08 * t), label: 'simple', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: Math.log(2) / (4 * Math.log(1.02)), label: 'doubled' }],
        },
        r`When interest is taken in advance, the borrower receives less than the face amount: the **discount** $D = F - P$, at a rate $d = \frac{i}{1 + i}$, so the true interest rate is $\frac{d}{1 - d}$.`,
      ],
      keyIdeas: [
        r`Simple: $I = Pin$, $F = P(1 + in)$. Ordinary interest uses a 360-day year, exact interest 365.`,
        r`Compound: $F = P(1 + i)^n$, $P = F(1 + i)^{-n}$.`,
        r`Time to grow: $n = \frac{\ln(F/P)}{\ln(1 + i)}$; doubling takes about $\frac{72}{\text{rate \%}}$ periods.`,
        r`A discount rate $d$ (interest taken in advance) equals an interest rate $\frac{d}{1 - d}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Quarterly compounding and simple interest',
          problem: r`₱50,000 is deposited at 8% compounded quarterly. What is it worth after 5 years? What would 8% simple interest earn in 3 years?`,
          steps: [
            r`$i = 0.02$, $n = 20$: $F = 50\,000 \times 1.02^{20} = ₱74{,}297$.`,
            r`Simple: $50\,000 \times 0.08 \times 3 = ₱12{,}000$.`,
          ],
          answer: r`₱74,297; ₱12,000.`,
        },
        {
          level: 'board',
          title: 'Counting days, and interest in advance',
          problem: r`Find the exact and the ordinary simple interest on ₱8,000 at 12% from March 10 to November 25 of a non-leap year. A ₱50,000 loan at 15% has its year's interest deducted in advance: what rate is really paid?`,
          steps: [
            r`Days: 21 (March) + 30 + 31 + 30 + 31 + 31 + 30 + 31 + 25 = 260.`,
            r`Exact: $8000 \times 0.12 \times \frac{260}{365} = ₱683.84$; ordinary: $8000 \times 0.12 \times \frac{260}{360} = ₱693.33$.`,
            r`The borrower gets ₱42,500 and repays ₱50,000: $\frac{7500}{42\,500} = 17.65\%$.`,
          ],
          answer: r`₱683.84 and ₱693.33; 17.65%.`,
        },
      ],
      traps: [
        r`Match $i$ and $n$ to the compounding period: quarterly over 5 years is 20 periods at 2%.`,
        r`Count the day of deposit OR the day of repayment, not both.`,
      ],
      check: [
        { q: r`How many days is a banker's year?`, a: r`360.` },
        { q: r`What is the difference between a future amount and its present worth called?`, a: r`The discount (the interest).` },
      ],
    },
    {
      name: 'Nominal and Effective Rates',
      inShort: r`The rate as quoted, and the rate actually earned in a year.`,
      body: [
        r`A **nominal** rate is the yearly rate as quoted, "12% compounded monthly"; the rate per period is $\frac rm$. Because interest earns interest within the year, the **effective** rate actually earned is higher, $\left(1 + \frac rm\right)^m - 1$, and rises with every extra compounding, but only toward a limit: compounding **continuously** gives $e^r - 1$:`,
        {
          type: 'plot',
          alt: 'The effective annual rate of a 12 percent nominal rate against compounding periods per year on a log scale from 1 to 365: 12 percent once a year, 12.36 semiannually, 12.55 quarterly, 12.68 monthly and 12.75 daily, approaching the dashed continuous limit of 12.75 percent.',
          caption: '12% nominal: the effective rate climbs with compounding, from 12% yearly to 12.68% monthly, but never past 12.75% (continuous, dashed).',
          x: [1, 365],
          logX: true,
          y: [11.8, 13],
          xLabel: 'compoundings a year',
          yLabel: 'effective rate (%)',
          series: [
            { f: (m) => 100 * ((1 + 0.12 / m) ** m - 1), label: 'effective' },
            { f: () => 100 * Math.expm1(0.12), label: 'continuous', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 12, label: 'monthly' }],
        },
      ],
      keyIdeas: [
        r`Nominal $r$ compounded $m$ times a year: $i = \frac{r}{m}$ per period.`,
        r`Effective $i_e = \left(1 + \frac{r}{m}\right)^m - 1$; back again $r = m\left[(1 + i_e)^{1/m} - 1\right]$.`,
        r`Continuous: $F = Pe^{rn}$, $i_e = e^r - 1$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Monthly and continuous',
          problem: r`Find the effective annual rate of 12% compounded monthly, and of 12% compounded continuously.`,
          steps: [
            r`Monthly: $1.01^{12} - 1 = 12.68\%$.`,
            r`Continuous: $e^{0.12} - 1 = 12.75\%$.`,
          ],
          answer: r`12.68%; 12.75%.`,
        },
        {
          level: 'board',
          title: 'Daily, a swap, and a credit card',
          problem: r`Find the effective rate of 15% compounded daily (360-day year). What nominal rate compounded quarterly equals 10% compounded semiannually? A card charges 2% a month on the unpaid balance: what is its effective yearly rate?`,
          steps: [
            r`$\left(1 + \frac{0.15}{360}\right)^{360} - 1 = 16.18\%$.`,
            r`Same yearly growth: $\left(1 + \frac r4\right)^4 = 1.05^2$, so $r = 4(1.05^{0.5} - 1) = 9.878\%$.`,
            r`$1.02^{12} - 1 = 26.82\%$.`,
          ],
          answer: r`16.18%; 9.878%; 26.82%.`,
        },
      ],
      traps: [
        r`Compare loans by their EFFECTIVE rates, never by the nominal ones.`,
        r`"2% a month" is a rate per period: its nominal rate is 24%, its effective rate more.`,
      ],
      check: [
        { q: r`Is the effective rate ever below the nominal rate?`, a: r`No: equal when compounded once a year, higher otherwise.` },
        { q: r`What is the effective rate of 10% compounded semiannually?`, a: r`$1.05^2 - 1 = 10.25\%$.` },
      ],
    },
    {
      name: 'Cash Flow and Equivalence',
      inShort: r`Drawing cash flows on a time line and moving them to one point to compare.`,
      body: [
        r`A **cash-flow diagram** puts every receipt (up arrow) and payment (down arrow) on a time line. Amounts at different times can't be added directly: first move each to the same date with $(1 + i)^{\pm n}$. Two cash flows are **equivalent** when they have the same worth at any one date, and then at every date. The farther away and the higher the rate, the less a future peso is worth today:`,
        {
          type: 'plot',
          alt: 'The present worth of 100,000 pesos received n years from now, for n from 0 to 30, at 5, 10 and 15 percent: three falling curves, the highest rate falling fastest; at 10 years they stand at about 61,400, 38,600 and 24,700.',
          caption: 'Present worth of ₱100,000 due in n years at 5%, 10% and 15% (top to bottom).',
          x: [0, 30],
          y: [0, 100],
          xLabel: 'years away',
          yLabel: '₱ thousands today',
          series: [0.05, 0.1, 0.15].map((i, k) => ({ f: (n) => 100 * (1 + i) ** -n, label: `${i * 100}%`, colour: colourOf(k) })),
          legend: false,
          marks: [{ x: 10, label: '10 years' }],
        },
        r`Six **interest factors** do all the moving:

| Factor | Finds | Formula |
|---|---|---|
| (F/P, i, n) | F from P | $(1 + i)^n$ |
| (P/F, i, n) | P from F | $(1 + i)^{-n}$ |
| (F/A, i, n) | F from a uniform series | $\frac{(1 + i)^n - 1}{i}$ |
| (A/F, i, n) | sinking-fund payment | $\frac{i}{(1 + i)^n - 1}$ |
| (P/A, i, n) | P of a uniform series | $\frac{1 - (1 + i)^{-n}}{i}$ |
| (A/P, i, n) | capital recovery | $\frac{i}{1 - (1 + i)^{-n}}$ |`,
        r`Inflation f raises the market rate above the real one: $1 + i_f = (1 + i)(1 + f)$.`,
      ],
      keyIdeas: [
        r`Amounts at different times can be added only after moving them to the same time: $X_k = X_j(1 + i)^{k - j}$.`,
        r`The six factors: $(F/P)$, $(P/F)$, $(F/A)$, $(A/F)$, $(P/A)$, $(A/P)$; $(A/P) = (A/F) + i$.`,
        r`Inflation: $1 + i_f = (1 + i)(1 + f)$ links the market rate to the real one.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two amounts to one date',
          problem: r`At 10% a year, what single amount at the end of year 5 equals ₱10,000 now plus ₱20,000 at the end of year 3?`,
          steps: [r`$10\,000 \times 1.1^5 + 20\,000 \times 1.1^2 = 16\,105 + 24\,200 = ₱40{,}305$.`],
          answer: r`₱40,305.`,
        },
        {
          level: 'board',
          title: 'The last instalment',
          problem: r`A car costs ₱1,200,000 cash. A buyer pays ₱300,000 down, ₱250,000 at the end of year 1, ₱350,000 at the end of year 2, and the rest at the end of year 4. At 12%, how big is the last payment?`,
          steps: [
            r`Still owed today: $1\,200\,000 - 300\,000 - \frac{250\,000}{1.12} - \frac{350\,000}{1.12^2} = ₱397{,}768$.`,
            r`Moved to year 4: $397\,768 \times 1.12^4 = ₱625{,}895$.`,
          ],
          answer: r`₱625,895.`,
        },
      ],
      traps: [
        r`Costs and receipts point in opposite directions on the diagram: keep their signs.`,
        r`Real and market rates differ by inflation: don't subtract them, divide.`,
      ],
      check: [
        { q: r`What is the real rate when money earns 10% and inflation is 4%?`, a: r`$\frac{1.10}{1.04} - 1 = 5.77\%$.` },
        { q: r`How are $(A/P)$ and $(A/F)$ related?`, a: r`$(A/P) = (A/F) + i$.` },
      ],
    },
    {
      name: 'Annuities',
      inShort: r`Equal payments at equal intervals: loans, savings plans and leases.`,
      body: [
        r`An **annuity** is a series of equal payments at equal intervals. In an **ordinary annuity** they fall at the END of each period, $P = A\frac{1 - (1 + i)^{-n}}{i}$; in an **annuity due**, at the beginning (multiply by $1 + i$); a **deferred** annuity starts later (discount the ordinary annuity's P back over the deferment).`,
        r`A loan's balance at any time is the present worth of the payments still to come. Early payments go mostly to interest, so the balance falls slowly at first and faster near the end:`,
        {
          type: 'plot',
          alt: 'The balance of an 800,000 peso car loan at 12 percent compounded monthly, repaid at 17,796 a month over 60 months: falling slowly at first, 535,780 after 24 months, and faster toward zero at 60.',
          caption: 'An ₱800,000 loan at 1% a month over 60 months: ₱535,780 still owed after 24 payments.',
          x: [0, 60],
          y: [0, 850],
          xLabel: 'months',
          yLabel: '₱ thousands owed',
          series: [{ f: (k) => (800 * AP(0.01, 60) * PA(0.01, 60 - k)), label: 'balance', area: true }],
          marks: [{ x: 24, label: '24' }],
        },
      ],
      keyIdeas: [
        r`Ordinary (end of period): $P = A\frac{1 - (1 + i)^{-n}}{i}$, $F = A\frac{(1 + i)^n - 1}{i}$.`,
        r`Capital recovery $A = P(A/P)$; sinking fund $A = F(A/F)$.`,
        r`Annuity due: multiply by $(1 + i)$. Deferred $k$ periods: multiply by $(1 + i)^{-k}$.`,
        r`A loan's balance is the present worth of the payments still to come.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A car loan',
          problem: r`A ₱800,000 car loan at 12% compounded monthly is repaid in 5 years. Find the monthly payment and the balance after 2 years.`,
          steps: [
            r`$A = 800\,000 \times \frac{0.01}{1 - 1.01^{-60}} = ₱17{,}796$.`,
            r`After 24 payments, 36 remain: $17\,796 \times \frac{1 - 1.01^{-36}}{0.01} = ₱535{,}780$.`,
          ],
          answer: r`₱17,796 a month; ₱535,780.`,
        },
        {
          level: 'board',
          title: 'Deferred, and due',
          problem: r`A lot is sold for ₱150,000 down and 10 semiannual payments of ₱12,000, the first 3 years from now. At 10% compounded semiannually, what is it worth today? A ₱600,000 car is paid in 10 semiannual payments made at the START of each period at the same rate: find the payment.`,
          steps: [
            r`$i = 5\%$; the first payment is at period 6, so the annuity is deferred 5 periods.`,
            r`$150\,000 + 12\,000(P/A, 5\%, 10)(P/F, 5\%, 5) = 150\,000 + 72\,602 = ₱222{,}602$.`,
            r`Due: $A = \frac{600\,000}{(P/A, 5\%, 10) \times 1.05} = \frac{600\,000}{8.1078} = ₱74{,}003$.`,
          ],
          answer: r`₱222,602; ₱74,003.`,
        },
      ],
      traps: [
        r`The ordinary annuity's $F$ falls on the date of the LAST payment.`,
        r`Deferment counts the periods BEFORE the ordinary annuity starts: a first payment at period 6 means 5.`,
      ],
      check: [
        { q: r`What is an annuity whose payments come at the start of each period?`, a: r`An annuity due.` },
        { q: r`Where does the present worth of an ordinary annuity sit?`, a: r`One period before the first payment.` },
      ],
    },
    {
      name: 'Perpetuity and Capitalized Cost',
      inShort: r`Payments that go on forever, and the money needed now to fund them.`,
      body: [
        r`An annuity's present worth grows with its length, but more and more slowly, because far-off payments are worth little today. It levels off at $\frac Ai$, the worth of a **perpetuity**, payments that never end:`,
        {
          type: 'plot',
          alt: 'The present worth of a series of 1 peso payments at 7 percent against the number of payments from 0 to 100: rising quickly, then levelling toward the dashed perpetuity value of 14.29.',
          caption: 'The present worth of ₱1 a year at 7% approaches 1/0.07 = 14.29 (dashed) as the series goes on.',
          x: [0, 100],
          y: [0, 16],
          xLabel: 'number of payments',
          yLabel: 'present worth (₱)',
          series: [
            { f: (n) => PA(0.07, n), label: 'P/A', area: true },
            { f: () => 1 / 0.07, label: 'perpetuity', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`The **capitalized cost** of a permanent work is the money needed now to build it and keep it forever: first cost, plus yearly costs as a perpetuity, plus each periodic repair or replacement as a perpetuity of its own, $\frac{X}{(1 + i)^k - 1}$ for an amount X every k years.`,
      ],
      keyIdeas: [
        r`Perpetuity $P = \frac{A}{i}$; every $k$ periods $P = \frac{X}{(1 + i)^k - 1}$.`,
        r`Capitalized cost $= C_0 + \frac{OM}{i} + \frac{C_0 - C_L}{(1 + i)^L - 1}$.`,
        r`Used for permanent works: dams, roads, endowments.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A machine kept forever',
          problem: r`A ₱500,000 machine (salvage ₱50,000 after 20 years) costs ₱12,000 a year to run. At 7%, find its capitalized cost.`,
          steps: [r`$500\,000 + \frac{12\,000}{0.07} + \frac{450\,000}{1.07^{20} - 1} = 500\,000 + 171\,428.57 + 156\,811.67 = ₱828{,}240$.`],
          answer: r`₱828,240.`,
        },
        {
          level: 'board',
          title: 'A laboratory trust fund',
          problem: r`A trust fund must build an electrical laboratory (₱2,000,000) and equip it (₱500,000), pay ₱120,000 a year to run it forever, and replace ₱300,000 of equipment every 5 years starting in year 5. At 6%, how much must it hold?`,
          steps: [
            r`Running: $\frac{120\,000}{0.06} = ₱2{,}000{,}000$.`,
            r`Replacement: $\frac{300\,000}{1.06^5 - 1} = ₱886{,}982$.`,
            r`Total $2\,500\,000 + 2\,000\,000 + 886\,982 = ₱5{,}386{,}982$.`,
          ],
          answer: r`₱5,386,982.`,
        },
      ],
      traps: [
        r`Replacement every $L$ years uses $(1 + i)^L - 1$ in the denominator, not $i$.`,
        r`A perpetuity has no future worth: it never ends.`,
      ],
      check: [
        { q: r`What is the present worth of ₱6,000 a year forever at 8%?`, a: r`$\frac{6000}{0.08} = ₱75{,}000$.` },
        { q: r`What is capitalized cost used for?`, a: r`Comparing permanent works, by the money needed now to fund them forever.` },
      ],
    },
    {
      name: 'Gradients',
      inShort: r`Cash flows that grow by a fixed amount or a fixed percentage each period.`,
      body: [
        r`Costs often grow: maintenance rises as a machine ages, fuel with prices. An **arithmetic gradient** grows by a fixed amount G each period (5000, 6000, 7000…); a **geometric gradient** by a fixed percentage g (5000, 5500, 6050…), which soon outruns it:`,
        {
          type: 'plot',
          alt: 'Yearly costs over 10 years starting at 5,000 pesos: rising by 1,000 a year in a straight line to 14,000, and, dashed, rising by 10 percent a year in an upward curve to about 11,800.',
          caption: 'From ₱5,000: up ₱1,000 a year (solid, to ₱14,000) and up 10% a year (dashed, to ₱11,790).',
          x: [1, 10],
          y: [0, 16],
          xLabel: 'year',
          yLabel: '₱ thousands',
          series: [
            { points: Array.from({ length: 10 }, (_, k) => [k + 1, 5 + k]), label: 'arithmetic' },
            { points: Array.from({ length: 10 }, (_, k) => [k + 1, 5 * 1.1 ** k]), label: 'geometric', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`Split an arithmetic series into a uniform base $A_1$ and a gradient that starts at zero in period 1, and value each part with its factor. A geometric series has its own closed form.`,
      ],
      keyIdeas: [
        r`Arithmetic (0, G, 2G, …): $P_G = \frac{G}{i}\left[(P/A) - n(P/F)\right]$; $A_G = G\left[\frac1i - \frac{n}{(1 + i)^n - 1}\right]$.`,
        r`Total = base annuity + gradient: $P = A_1(P/A) + P_G$.`,
        r`Geometric: $P = A_1\frac{1 - \left(\frac{1 + g}{1 + i}\right)^n}{i - g}$, or $\frac{nA_1}{1 + i}$ when $i = g$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Rising maintenance',
          problem: r`Maintenance is ₱5,000 the first year and rises ₱1,000 a year for 10 years. At 10%, find its present worth.`,
          steps: [
            r`Base: $5000(P/A, 10\%, 10) = ₱30{,}723$.`,
            r`Gradient: $\frac{1000}{0.1}\left[(P/A) - 10(P/F)\right] = ₱22{,}891$.`,
            r`Total ₱53,614.`,
          ],
          answer: r`₱53,614.`,
        },
        {
          level: 'board',
          title: 'A geometric gradient',
          problem: r`A generator's maintenance is ₱2,000 at the end of the first year and rises 8% a year for 10 years. At 12%, find its present worth.`,
          steps: [r`$P = 2000 \times \frac{1 - (1.08/1.12)^{10}}{0.12 - 0.08} = ₱15{,}244$.`],
          answer: r`₱15,244.`,
        },
      ],
      traps: [
        r`The gradient starts at period 2: the first year holds only the base amount.`,
        r`A decreasing gradient is SUBTRACTED from the base annuity.`,
      ],
      check: [
        { q: r`What is a series that grows by a fixed percentage each period called?`, a: r`A geometric gradient.` },
        { q: r`In an arithmetic gradient, what is the gradient part's cash flow in year 1?`, a: r`Zero.` },
      ],
    },
    {
      name: 'Depreciation',
      inShort: r`Spreading an asset's lost value over its life, for accounting and tax.`,
      body: [
        r`**Depreciation** is an asset's loss of value with use and time: **physical** (wear) or **functional** (obsolescence, the job no longer needed). **Depletion** is the same idea for a mine, well or forest being used up. The methods differ in how fast they write the value off:`,
        {
          type: 'plot',
          alt: 'Book value of a 100,000 peso asset with a 10,000 salvage value over its 5-year life by four methods: straight line falling evenly; sum of the years digits and Matheson falling faster early; double declining balance, dashed, falling fastest and ending at 7,800, below the 10,000 salvage line.',
          caption: 'A ₱100,000 asset, ₱10,000 salvage, 5 years: straight line, SYD, Matheson, and double declining (dashed), which ends below salvage.',
          x: [0, 6],
          y: [0, 110],
          xLabel: 'year',
          yLabel: 'book value (₱ thousands)',
          series: [
            { points: BOOK.line, label: 'straight line' },
            { points: BOOK.syd, label: 'SYD', colour: colourOf(1) },
            { points: BOOK.matheson, label: 'Matheson', colour: colourOf(2) },
            { points: BOOK.ddb, label: 'DDB', dashed: true, colour: colourOf(3) },
          ],
          legend: false,
          marks: [{ y: 10, label: 'salvage' }],
        },
        r`| Method | Yearly depreciation | Book value after n years |
|---|---|---|
| Straight line | $\frac{C_0 - C_L}{L}$ | $C_0 - nd$ |
| Sinking fund | $(C_0 - C_L)(A/F, i, L)$ | $C_0 - d(F/A, i, n)$ |
| Declining balance (Matheson) | $kBV_{n-1}$, $k = 1 - \left(\frac{C_L}{C_0}\right)^{1/L}$ | $C_0(1 - k)^n$ |
| Double declining | $\frac2L BV_{n-1}$ | $C_0\left(1 - \frac2L\right)^n$ |
| Sum of the years' digits | $(C_0 - C_L)\frac{L - n + 1}{L(L + 1)/2}$ | $C_0$ minus the sum so far |`,
      ],
      keyIdeas: [
        r`Straight line $d = \frac{C_0 - C_L}{L}$; sinking fund $d = (C_0 - C_L)(A/F)$.`,
        r`Matheson $k = 1 - \left(\frac{C_L}{C_0}\right)^{1/L}$; double declining $k = \frac{2}{L}$; $BV_n = C_0(1 - k)^n$, the year's charge $kC_0(1 - k)^{n-1}$.`,
        r`SYD $d_n = (C_0 - C_L)\frac{L - n + 1}{L(L + 1)/2}$; service output by units used.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Four methods, year one',
          problem: r`A ₱100,000 asset has a ₱10,000 salvage value after 5 years. Find the first year's depreciation by straight line, SYD and double declining balance, and Matheson's rate.`,
          steps: [
            r`Straight line $\frac{90\,000}{5} = ₱18{,}000$.`,
            r`SYD $90\,000 \times \frac{5}{15} = ₱30{,}000$. DDB $100\,000 \times 0.4 = ₱40{,}000$.`,
            r`Matheson $k = 1 - 0.1^{0.2} = 36.9\%$.`,
          ],
          answer: r`₱18,000; ₱30,000; ₱40,000; 36.9%.`,
        },
        {
          level: 'board',
          title: 'A sinking fund, and DDB in year 4',
          problem: r`A ₱5,000,000 plant has a 25-year life and ₱500,000 salvage. By the sinking-fund method at 8%, find its book value after 10 years. A ₱80,000 machine with a 10-year life: what is its 4th-year double-declining charge?`,
          steps: [
            r`$d = 4\,500\,000(A/F, 8\%, 25) = ₱61{,}555$ a year.`,
            r`$BV_{10} = 5\,000\,000 - 61\,555(F/A, 8\%, 10) = 5\,000\,000 - 891\,713 = ₱4{,}108{,}287$.`,
            r`$k = 0.2$: $d_4 = 80\,000 \times 0.2 \times 0.8^3 = ₱8192$.`,
          ],
          answer: r`₱4,108,287; ₱8192.`,
        },
      ],
      traps: [
        r`Double declining ignores salvage in its rate, but book value must not fall below it.`,
        r`Matheson needs a salvage value above zero.`,
      ],
      check: [
        { q: r`What is the declining balance method also called?`, a: r`The constant-percentage (Matheson) method.` },
        { q: r`What is the using-up of a natural resource such as a mine called?`, a: r`Depletion.` },
      ],
    },
    {
      name: 'Bonds',
      inShort: r`Long-term loans to a company or government, paid back with periodic interest.`,
      body: [
        r`A **bond** is a long-term note: the issuer borrows its **face (par) value** and pays periodic interest at the **bond rate** until it redeems the bond at maturity. Bondholders are lenders, not owners. A bond's value to a buyer is the present worth of what it will pay, at the buyer's own rate, so it falls as the rate the buyer wants rises: above the coupon rate it sells at a **discount**, below it at a **premium**:`,
        {
          type: 'plot',
          alt: 'The value of a 10,000 peso, 8 percent, 10-year bond with semiannual coupons against the buyer’s yield from 4 to 14 percent: falling from about 13,270 to about 6,820, crossing par at 8 percent and 8,754 at 10 percent.',
          caption: 'A ₱10,000, 8% bond (10 years, semiannual): at par when the buyer wants 8%, ₱8,754 at 10%.',
          x: [4, 14],
          y: [6, 14],
          xLabel: "buyer's yield (%)",
          yLabel: 'value (₱ thousands)',
          series: [{ f: (y) => 0.4 * PA(y / 200, 20) + 10 * (1 + y / 200) ** -20, label: 'value' }],
          marks: [{ x: 8, label: 'par' }],
        },
        r`Bonds are named by their security: a **mortgage bond** is secured on specific assets, a **collateral bond** on other securities, a **debenture** on the issuer's credit alone.`,
      ],
      keyIdeas: [
        r`Value $= Zr(P/A, i, n) + C(P/F, i, n)$, at the buyer's rate $i$ per period.`,
        r`Buyer's rate = coupon rate: sells at par; higher: at a discount; lower: at a premium.`,
        r`Current yield $= \frac{Zr}{P}$; yield to maturity is the $i$ that makes the value equal the price.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A semiannual bond',
          problem: r`A ₱10,000 bond pays 8% a year, semiannually, and is redeemed at par in 10 years. What should a buyer pay to earn 10% compounded semiannually?`,
          steps: [
            r`Coupon $10\,000 \times 0.04 = 400$ per half-year, $i = 5\%$, $n = 20$.`,
            r`$400(P/A, 5\%, 20) + 10\,000(P/F, 5\%, 20) = 4985 + 3769 = ₱8754$.`,
          ],
          answer: r`₱8754.`,
        },
        {
          level: 'board',
          title: 'A premium bond',
          problem: r`A ₱100,000 bond pays 10% yearly and matures at par in 15 years. What is it worth to a buyer who wants 8%, and what current yield does that price give?`,
          steps: [
            r`$10\,000(P/A, 8\%, 15) + 100\,000(P/F, 8\%, 15) = 85\,595 + 31\,524 = ₱117{,}119$, a premium.`,
            r`Current yield $\frac{10\,000}{117\,119} = 8.54\%$.`,
          ],
          answer: r`₱117,119; 8.54%.`,
        },
      ],
      traps: [
        r`Semiannual coupons: halve both rates and double the years.`,
        r`The coupon is figured on the FACE value, never on the price.`,
      ],
      check: [
        { q: r`A bond's yield is above its coupon rate. Does it sell at a premium or a discount?`, a: r`At a discount.` },
        { q: r`What bond is secured by a mortgage on specific assets?`, a: r`A mortgage bond.` },
      ],
    },
    {
      name: 'Break-Even Analysis',
      inShort: r`The output at which income just covers cost, or two options cost the same.`,
      body: [
        r`A firm's cost has a **fixed** part that doesn't change with output (rent, salaries, depreciation) and a **variable** part per unit (materials, labour, royalties). Revenue grows with each unit sold; the **break-even point** is where the two lines cross, and every unit beyond it adds profit at the margin $p - v$:`,
        {
          type: 'plot',
          alt: 'A break-even chart: revenue at 50 pesos a unit rising from zero, and total cost, dashed, starting at the 200,000 peso fixed cost and rising 30 pesos a unit; they cross at 10,000 units and 500,000 pesos.',
          caption: 'Fixed cost ₱200,000, ₱30 a unit to make, ₱50 to sell: revenue (solid) overtakes cost (dashed) at 10,000 units.',
          x: [0, 20000],
          y: [0, 1100],
          xLabel: 'units a month',
          yLabel: '₱ thousands',
          series: [
            { f: (q) => 0.05 * q, label: 'revenue' },
            { f: (q) => 200 + 0.03 * q, label: 'cost', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 10000, label: '10 000' }],
        },
        r`Prices themselves come from the market: under perfect competition, price settles where supply equals demand (the **law of supply and demand**), and adding more of one input to a fixed other gives less and less extra output (**diminishing returns**). Markets are named by how many sellers and buyers they have:

| Market | Sellers | Buyers |
|---|---|---|
| Perfect competition | many | many |
| Monopoly | one | many |
| Duopoly / oligopoly | two / few | many |
| Monopsony | many | one |
| Duopsony / oligopsony | many | two / few |
| Bilateral monopoly | one | one |`,
      ],
      keyIdeas: [
        r`Break-even quantity $Q = \frac{FC}{p - v}$; profit $(p - v)Q - FC$.`,
        r`Two alternatives: set $FC_1 + v_1x = FC_2 + v_2x$ and solve for $x$.`,
        r`Above the break-even point, the option with the lower variable cost wins.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A plant',
          problem: r`A plant's fixed cost is ₱200,000 a month; each unit sells for ₱50 and costs ₱30 to make. How many units must it sell to break even?`,
          steps: [r`$Q = \frac{200\,000}{50 - 30} = 10\,000$ units a month.`],
          answer: r`10,000 units a month.`,
        },
        {
          level: 'board',
          title: 'Transformers, and two machines',
          problem: r`A shop sells distribution transformers at ₱45,000 each; materials are ₱18,000, labour ₱7,000 and other variable costs ₱2,000 a unit, and fixed costs ₱2,700,000 a month. Find the break-even output. Machine A costs ₱120,000 a year fixed plus ₱25 a unit; B ₱60,000 plus ₱40. Above what output is A cheaper?`,
          steps: [
            r`Variable $18\,000 + 7000 + 2000 = 27\,000$: $Q = \frac{2\,700\,000}{45\,000 - 27\,000} = 150$ units a month.`,
            r`$120\,000 + 25x = 60\,000 + 40x$ gives $x = \frac{60\,000}{15} = 4000$ units: above that, A.`,
          ],
          answer: r`150 units; above 4000 units.`,
        },
      ],
      traps: [
        r`Convert first costs to a yearly figure (capital recovery) before comparing them with yearly costs.`,
        r`Royalties per unit are variable costs, not fixed.`,
      ],
      check: [
        { q: r`What market has only one buyer?`, a: r`Monopsony.` },
        { q: r`Few sellers and many buyers make what market?`, a: r`Oligopoly.` },
      ],
    },
    {
      name: 'Present and Annual Worth',
      inShort: r`Comparing projects by their worth today, or as an equal yearly figure.`,
      body: [
        r`To compare alternatives, bring every cash flow to one figure at the **minimum attractive rate of return** (MARR), the least a company will accept:

| Method | Figure | Accept / prefer | Unequal lives |
|---|---|---|---|
| Present worth | $\sum CF_t(1 + i)^{-t}$ | NPW ≥ 0, highest | use a common multiple of the lives |
| Annual worth (EUAC) | a uniform yearly equivalent | lowest cost, highest worth | compare directly |
| Future worth | worth at the end | ≥ 0, highest | common multiple |`,
        r`The **equivalent uniform annual cost** of owning a machine is its capital recovery cost plus its running cost: $(C_0 - C_L)(A/P) + C_Li + OM$. Because it's a yearly figure, it compares machines with different lives without repeating them to a common multiple.`,
      ],
      keyIdeas: [
        r`$NPW = \sum CF_t(1 + i)^{-t}$ at the MARR; accept if $NPW \ge 0$.`,
        r`$EUAC = (C_0 - C_L)(A/P) + C_Li + OM$.`,
        r`Unequal lives: compare annual worths, or present worths over a common multiple of the lives.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "A machine's annual cost",
          problem: r`A ₱80,000 machine lasts 8 years, salvage ₱8,000, and costs ₱5,000 a year to run. At 10%, find its equivalent uniform annual cost.`,
          steps: [r`$72\,000(A/P, 10\%, 8) + 8000 \times 0.10 + 5000 = 13\,496 + 800 + 5000 = ₱19{,}296$ a year.`],
          answer: r`₱19,296 a year.`,
        },
        {
          level: 'board',
          title: 'Unequal lives',
          problem: r`Machine X costs ₱300,000, lasts 6 years (salvage ₱30,000) and costs ₱40,000 a year to run; Y costs ₱450,000, lasts 9 years (salvage ₱45,000) and costs ₱25,000 a year. At 10%, which is cheaper?`,
          steps: [
            r`X: $270\,000(A/P, 10\%, 6) + 3000 + 40\,000 = 61\,994 + 43\,000 = ₱104{,}994$.`,
            r`Y: $405\,000(A/P, 10\%, 9) + 4500 + 25\,000 = 70\,324 + 29\,500 = ₱99{,}824$.`,
            r`Y costs ₱5,170 a year less.`,
          ],
          answer: r`Y (₱99,824 against ₱104,994 a year).`,
        },
      ],
      traps: [
        r`Present worth needs equal study periods; annual worth does not.`,
        r`Salvage reduces the cost: subtract it before capital recovery, then add back its interest.`,
      ],
      check: [
        { q: r`What does MARR stand for?`, a: r`Minimum attractive rate of return.` },
        { q: r`Which method compares machines of different lives most directly?`, a: r`Annual worth (EUAC).` },
      ],
    },
    {
      name: 'Rate of Return and Payback',
      inShort: r`The interest rate a project earns, and how fast it pays back.`,
      body: [
        r`A project's **internal rate of return** (IRR) is the rate at which its net present worth is zero: the rate its own cash flows earn. Drawing NPW against the rate shows it where the curve crosses zero; the project is worth doing if that rate beats the MARR:`,
        {
          type: 'plot',
          alt: 'Net present worth of investing 100,000 pesos for 30,000 a year over 5 years, against the interest rate from 0 to 30 percent: 50,000 at zero, falling, crossing zero at about 15.2 percent, the internal rate of return, and negative beyond.',
          caption: '₱100,000 for ₱30,000 a year over 5 years: NPW falls with the rate and crosses zero at the IRR, 15.2%.',
          x: [0, 30],
          y: [-40, 60],
          xLabel: 'interest rate (%)',
          yLabel: 'NPW (₱ thousands)',
          series: [{ f: (p) => -100 + 30 * PA(p / 100, 5), label: 'NPW', area: true }],
          marks: [{ x: 15.24, label: 'IRR' }],
        },
        r`**Payback** ignores interest and asks how long the cash takes to come back, $\frac{C_0}{\text{net yearly cash}}$; **discounted payback** counts interest and is always longer. Simple **rate of return** is net yearly profit over capital. Between alternatives, compare the extra investment's return, not each IRR alone.`,
      ],
      keyIdeas: [
        r`IRR $i^*$: the rate that makes $NPW = 0$; accept if $i^* \ge$ MARR. Compare alternatives on the increment.`,
        r`Simple ROR $= \frac{\text{net annual profit}}{\text{capital}}$.`,
        r`Payback $= \frac{C_0}{\text{net annual cash flow}}$; the discounted payback is longer.`,
        r`External (modified) rate when cash flows change sign more than once.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'IRR and payback',
          problem: r`A ₱100,000 investment returns ₱30,000 a year for 5 years. Find its IRR and simple payback.`,
          steps: [
            r`$-100\,000 + 30\,000(P/A, i^*, 5) = 0$ gives $(P/A) = 3.333$, so $i^* = 15.2\%$.`,
            r`Payback $\frac{100\,000}{30\,000} = 3.3$ years.`,
          ],
          answer: r`15.2%; 3.3 years.`,
        },
        {
          level: 'board',
          title: 'A ski lift',
          problem: r`New lifts cost ₱2,400,000, raise yearly revenue by ₱700,000 and cost ₱100,000 a year to run. Find the payback, and the discounted payback at 10%.`,
          steps: [
            r`Net ₱600,000 a year: payback $\frac{2\,400\,000}{600\,000} = 4$ years.`,
            r`Discounted: $600\,000(P/A, 10\%, n) = 2\,400\,000$, so $(P/A) = 4$ and $n = -\frac{\ln(1 - 0.4)}{\ln1.1} = 5.36$ years.`,
          ],
          answer: r`4 years; 5.36 years.`,
        },
      ],
      traps: [
        r`The highest IRR is not always the best choice between alternatives: test the increment.`,
        r`Payback ignores everything after it: a fast payback can still be a poor project.`,
      ],
      check: [
        { q: r`At the IRR, what is the project's net present worth?`, a: r`Zero.` },
        { q: r`Is discounted payback shorter or longer than simple payback?`, a: r`Longer.` },
      ],
    },
    {
      name: 'Benefit-Cost Ratio',
      inShort: r`Judging public projects by benefits to the people against costs to the government.`,
      body: [
        r`Public works are judged by what they give the public against what they cost the government, both as present (or annual) worths at the government's rate. **Disbenefits**, harm to the public, are subtracted from the benefits, not added to the costs:

| Form | Ratio | Justified if |
|---|---|---|
| Conventional | $\frac{B - D}{C_0 + OM}$ | ≥ 1 |
| Modified | $\frac{B - D - OM}{C_0}$ | ≥ 1 |
| Incremental (two options) | $\frac{\Delta B}{\Delta C}$ | ≥ 1 favours the costlier one |`,
        r`The two forms give different numbers but always the same yes or no.`,
      ],
      keyIdeas: [
        r`$\frac{B}{C} = \frac{PW(\text{benefits} - \text{disbenefits})}{PW(\text{costs})}$; worth doing if $\ge 1$.`,
        r`Modified: $\frac{B - OM}{C_0}$; same accept/reject decision.`,
        r`Between alternatives: incremental $\frac{\Delta B}{\Delta C} \ge 1$ favours the costlier one.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Flood control',
          problem: r`A flood-control project has benefits worth ₱12 million and costs worth ₱9 million (present worths). Is it justified?`,
          steps: [r`$\frac{B}{C} = \frac{12}{9} = 1.33 \ge 1$: yes.`],
          answer: r`Yes, B/C = 1.33.`,
        },
        {
          level: 'board',
          title: 'Conventional and modified',
          problem: r`A road costs ₱1.5 million to build and ₱0.4 million (present worth) to maintain; its benefits are worth ₱2.4 million and its disbenefits ₱0.3 million. Find both ratios.`,
          steps: [
            r`Conventional: $\frac{2.4 - 0.3}{1.5 + 0.4} = 1.11$.`,
            r`Modified: $\frac{2.4 - 0.3 - 0.4}{1.5} = 1.13$. Both above 1: build it.`,
          ],
          answer: r`1.11 and 1.13: justified.`,
        },
      ],
      traps: [
        r`Disbenefits (harm to the public) go in the numerator as negatives, not into costs.`,
        r`The best of several options is found by increments, not by the highest single ratio.`,
      ],
      check: [
        { q: r`What B/C ratio is the minimum for a project to be justified?`, a: r`1.` },
        { q: r`Where do disbenefits go in the B/C ratio?`, a: r`Subtracted from the benefits.` },
      ],
    },
    {
      name: 'Replacement Studies',
      inShort: r`Keeping an existing asset (defender) or replacing it (challenger).`,
      body: [
        r`Should an old machine (the **defender**) be kept or replaced by a new one (the **challenger**)? Compare their equivalent annual costs, each over its own remaining life. The defender's "first cost" is what it could be sold for NOW; what it originally cost, and its book value, are **sunk** and don't matter.`,
        r`Every machine has an **economic life**, the number of years to keep it that gives the lowest annual cost: keeping it longer spreads the purchase over more years, but its running costs climb. For a ₱200,000 machine whose resale value falls 20% a year and whose running cost starts at ₱15,000 and rises ₱5,000 a year, at 10%:`,
        {
          type: 'plot',
          alt: 'The equivalent annual cost of keeping a 200,000 peso machine against years kept, from 1 to 12: falling from 75,000 for one year to a minimum of about 64,600 at 8 years, then rising slowly.',
          caption: 'Annual cost against years kept: lowest, about ₱64,600, at 8 years, the economic life.',
          x: [1, 12],
          y: [60, 77],
          xLabel: 'years kept',
          yLabel: 'EUAC (₱ thousands)',
          series: [{ points: Array.from({ length: 12 }, (_, k) => [k + 1, keepCost(k + 1) / 1000]), label: 'EUAC' }],
          marks: [{ x: 8, label: '8 years' }],
        },
        r`Saving for a replacement in an inflating economy must aim at the FUTURE price: inflate the cost first, then find the sinking-fund deposit.`,
      ],
      keyIdeas: [
        r`Compare the defender's and challenger's EUACs, each over its own remaining life.`,
        r`The defender's first cost is its market value NOW; its original cost and book value are sunk.`,
        r`Economic life: the life with the lowest EUAC.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Keep or replace?',
          problem: r`An old machine bought for ₱150,000 can be sold now for ₱60,000; it costs ₱40,000 a year to run and lasts 3 more years. A new one costs ₱200,000, lasts 10 years (salvage ₱20,000) and costs ₱15,000 a year. At 10%, replace?`,
          steps: [
            r`Defender: $60\,000(A/P, 10\%, 3) + 40\,000 = ₱64{,}127$.`,
            r`Challenger: $180\,000(A/P, 10\%, 10) + 2000 + 15\,000 = ₱46{,}294$.`,
            r`Replace.`,
          ],
          answer: r`Replace (₱46,294 against ₱64,127 a year).`,
        },
        {
          level: 'board',
          title: 'Saving for a replacement',
          problem: r`A lathe costs ₱50,000 today and must be replaced in 6 years. Prices rise 6% a year, and the replacement fund earns 8%. How much must be set aside each year?`,
          steps: [
            r`Future price $50\,000 \times 1.06^6 = ₱70{,}926$.`,
            r`$A = 70\,926(A/F, 8\%, 6) = 70\,926 \times 0.13632 = ₱9668$ a year.`,
          ],
          answer: r`₱9668 a year.`,
        },
      ],
      traps: [
        r`Ignore the ₱150,000: past costs don't affect the choice.`,
        r`Inflate to the future price BEFORE finding the sinking-fund deposit.`,
      ],
      check: [
        { q: r`What is a cost already spent that can't be recovered called?`, a: r`A sunk cost.` },
        { q: r`What is the economic life of an asset?`, a: r`The number of years to keep it that gives the lowest equivalent annual cost.` },
      ],
    },
    {
      name: 'Decisions Under Certainty, Risk and Uncertainty',
      inShort: r`Choosing when the outcome is known, has known odds, or has unknown odds.`,
      body: [
        r`Under **certainty** each choice has one known outcome. Under **risk** the outcomes have known probabilities, and the **expected value** $\sum p_ix_i$ is the usual guide. Under **uncertainty** the odds are unknown, and the choice depends on attitude: the optimist's **maximax**, the pessimist's **maximin**, **Laplace**'s equal odds, **minimax regret**, or **Hurwicz**'s blend $\alpha\max + (1 - \alpha)\min$ with an optimism α. As α grows, the bolder plans win:`,
        {
          type: 'plot',
          alt: 'Hurwicz values of three plans against the optimism coefficient alpha from 0 to 1: plan A, from minus 10 to 50, steepest; plan B, dashed, from 10 to 30; plan C flat at 15. C is best below alpha 0.25, B between 0.25 and 0.5, and A above 0.5.',
          caption: 'Hurwicz values of plans A (solid), B (dashed) and C (flat): C wins below α = 0.25, B to 0.5, A beyond.',
          x: [0, 1],
          y: [-15, 55],
          xLabel: 'optimism α',
          yLabel: '₱ thousands',
          series: [
            { f: (a) => 50 * a - 10 * (1 - a), label: 'A' },
            { f: (a) => 30 * a + 10 * (1 - a), label: 'B', dashed: true, colour: colourOf(1) },
            { f: () => 15, label: 'C', colour: colourOf(2) },
          ],
          legend: false,
          marks: [{ x: 0.5, label: 'α = 0.5' }],
        },
      ],
      keyIdeas: [
        r`Certainty: one outcome per choice; pick the best.`,
        r`Risk: expected value $E = \sum p_ix_i$.`,
        r`Uncertainty: maximax (optimist), maximin (pessimist), Laplace (equal odds), Hurwicz $\alpha\max + (1 - \alpha)\min$, minimax regret.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three plans, three rules',
          problem: r`Three plans pay (in ₱ thousands) A: 50, 20, −10; B: 30, 25, 10; C: 15, 15, 15 in good, fair and poor years, with chances 0.3, 0.5, 0.2. Choose by expected value, by maximin and by maximax.`,
          steps: [
            r`Expected: A 23, B 23.5, C 15, so B.`,
            r`Maximin: worst cases −10, 10, 15, so C. Maximax: best cases 50, 30, 15, so A.`,
          ],
          answer: r`B; C; A.`,
        },
        {
          level: 'board',
          title: 'Hurwicz, Laplace and regret',
          problem: r`For the same plans, choose by Hurwicz with α = 0.6, by Laplace, and by minimax regret.`,
          steps: [
            r`Hurwicz: A $0.6 \times 50 + 0.4 \times (-10) = 26$, B $0.6 \times 30 + 0.4 \times 10 = 22$, C 15: A.`,
            r`Laplace: A $\frac{60}{3} = 20$, B $\frac{65}{3} = 21.7$, C 15: B.`,
            r`Regret (best minus each, per year): A 0, 5, 25; B 20, 0, 5; C 35, 10, 0. Largest: A 25, B 20, C 35, so B.`,
          ],
          answer: r`A; B; B.`,
        },
      ],
      traps: [
        r`Each criterion can pick a different plan: say which one the question asks for.`,
        r`Regret is measured against the best plan IN EACH STATE, not overall.`,
      ],
      check: [
        { q: r`Which criterion suits a pessimist?`, a: r`Maximin.` },
        { q: r`What does Laplace's criterion assume about the states?`, a: r`That they are equally likely.` },
      ],
    },
  ],
};
