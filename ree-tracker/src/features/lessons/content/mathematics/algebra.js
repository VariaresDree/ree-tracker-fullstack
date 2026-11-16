// Library › Lessons › Mathematics › Algebra (2026-11-16). Written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand. Formula cards for each subtopic show under it.
const r = String.raw;

export default {
  topic: 'Algebra',
  subject: 'Mathematics',
  overview: r`Algebra is the language every other topic is written in. On the board it shows up two ways: as tools (exponents, logarithms, quadratics, systems) that other problems lean on, and as classic word problems (age, work, mixture, motion, money, digits) that test whether you can turn a sentence into an equation. Set up first, compute second: most wrong answers come from the equation, not the arithmetic.`,
  sources: [
    'Schaum’s Outline of College Algebra (Spiegel and Moyer)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Algebraic Expressions',
      inShort: r`Rewriting expressions without changing their value: the laws of exponents and radicals, special products and factoring, logarithms, and simplifying rational expressions.`,
      keyIdeas: [
        r`Same base, multiply: add exponents, $a^m a^n = a^{m+n}$. Power of a power: multiply, $(a^m)^n = a^{mn}$.`,
        r`A radical is a fractional exponent: $\sqrt[n]{a^m} = a^{m/n}$. Converting to exponents usually makes the algebra easier.`,
        r`Factor patterns to know cold: $a^2 - b^2 = (a-b)(a+b)$, $a^3 \pm b^3 = (a \pm b)(a^2 \mp ab + b^2)$, $(a \pm b)^2 = a^2 \pm 2ab + b^2$.`,
        r`A logarithm is an exponent: $\log_b x = y \iff b^y = x$. Product to sum, quotient to difference, power to coefficient.`,
        r`Rationalize a denominator with its conjugate: $\frac{1}{\sqrt a + \sqrt b} = \frac{\sqrt a - \sqrt b}{a - b}$.`,
      ],
      example: {
        problem: r`Simplify $\dfrac{(8x^{6}y^{-3})^{2/3}}{4x^{2}y^{-4}}$.`,
        solution: r`Raise each factor: $(8)^{2/3} = 4$, $(x^6)^{2/3} = x^4$, $(y^{-3})^{2/3} = y^{-2}$. So the numerator is $4x^4y^{-2}$. Divide: $\dfrac{4x^4y^{-2}}{4x^2y^{-4}} = x^{4-2}\,y^{-2-(-4)} = x^2y^2$.`,
      },
      traps: [
        r`$(a + b)^2 \ne a^2 + b^2$: the middle term $2ab$ is the most-missed term on the board.`,
        r`$\log(a + b)$ does not split; only $\log(ab) = \log a + \log b$ does.`,
        r`$a^0 = 1$ only for $a \ne 0$, and $\sqrt{a^2} = |a|$, not $a$.`,
      ],
    },
    {
      name: 'Functions',
      inShort: r`A function gives each input exactly one output. Expect composition, inverses, domain and range, and above all quadratic functions and polynomial roots.`,
      keyIdeas: [
        r`Composition works inside out: $(f \circ g)(x) = f(g(x))$.`,
        r`To invert $y = f(x)$, swap $x$ and $y$ and solve for $y$; the graph mirrors in $y = x$.`,
        r`For $ax^2 + bx + c = 0$: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$, and the discriminant $b^2 - 4ac$ tells real/equal/complex roots.`,
        r`Vieta: sum of roots $= -\frac{b}{a}$, product $= \frac{c}{a}$. Most "find $r_1^2 + r_2^2$" items need only these two numbers.`,
        r`Remainder theorem: dividing $f(x)$ by $(x - a)$ leaves $f(a)$; it is a factor exactly when $f(a) = 0$.`,
      ],
      example: {
        problem: r`The roots of $2x^2 - 7x + 3 = 0$ are $r_1$ and $r_2$. Find $r_1^2 + r_2^2$ without solving.`,
        solution: r`Sum $= \frac{7}{2}$, product $= \frac{3}{2}$. Then $r_1^2 + r_2^2 = (r_1 + r_2)^2 - 2r_1r_2 = \frac{49}{4} - 3 = \frac{37}{4} = 9.25$. (Check: the roots are $3$ and $\frac12$, and $9 + \frac14 = 9.25$.)`,
      },
      traps: [
        r`Domain first: $\sqrt{x - 2}$ needs $x \ge 2$, $\frac{1}{x+1}$ needs $x \ne -1$, $\log x$ needs $x > 0$.`,
        r`The vertex is at $x = -\frac{b}{2a}$; its $y$ is the maximum when $a < 0$ and the minimum when $a > 0$.`,
      ],
    },
    {
      name: 'System of Equations',
      inShort: r`Two or three unknowns tied by as many equations: solve by elimination, substitution, determinants (Cramer's rule) or a calculator's equation mode.`,
      keyIdeas: [
        r`A $2 \times 2$ system has one solution exactly when $a_1b_2 - a_2b_1 \ne 0$; otherwise the lines are parallel or the same.`,
        r`Cramer's rule: $x = \frac{D_x}{D}$, $y = \frac{D_y}{D}$, where $D_x$ replaces the $x$ column with the constants.`,
        r`For $3 \times 3$, expand along a row: $a(ei - fh) - b(di - fg) + c(dh - eg)$.`,
        r`Nonlinear systems (one quadratic, one linear) usually fall to substitution.`,
      ],
      example: {
        problem: r`Solve $2x + 3y = 8$ and $x - y = -1$.`,
        solution: r`$D = (2)(-1) - (1)(3) = -5$. $D_x = (8)(-1) - (-1)(3) = -5$, $D_y = (2)(-1) - (1)(8) = -10$. So $x = \frac{-5}{-5} = 1$ and $y = \frac{-10}{-5} = 2$.`,
      },
      traps: [
        r`Line the equations up as $ax + by = c$ before reading off coefficients: a term on the wrong side flips its sign.`,
        r`On the calculator, enter the constants on the right-hand side, not moved to the left.`,
      ],
    },
    {
      name: 'Binomial Theorem',
      inShort: r`Expanding $(a + b)^n$ without multiplying it out, and finding one term, one coefficient or the sum of all coefficients.`,
      keyIdeas: [
        r`$(a+b)^n = \sum_{r=0}^{n} \binom{n}{r} a^{n-r} b^{r}$, with $n + 1$ terms.`,
        r`The $(r+1)$th term is $T_{r+1} = \binom{n}{r} a^{n-r} b^{r}$: count from $r = 0$.`,
        r`To find the term with $x^k$ in $(ax^p + bx^q)^n$, solve $p(n - r) + qr = k$ for $r$.`,
        r`Sum of the coefficients: put every variable equal to 1.`,
        r`The middle term of $(a+b)^n$ is $T_{n/2 + 1}$ when $n$ is even; there are two when $n$ is odd.`,
      ],
      example: {
        problem: r`Find the term free of $x$ in $\left(x^2 + \dfrac{2}{x}\right)^{6}$.`,
        solution: r`$T_{r+1} = \binom{6}{r}(x^2)^{6-r}\left(\frac{2}{x}\right)^{r} = \binom{6}{r}2^r x^{12 - 3r}$. Free of $x$: $12 - 3r = 0$, so $r = 4$. The term is $\binom{6}{4}2^4 = 15 \times 16 = 240$.`,
      },
      traps: [
        r`The $5$th term is $r = 4$, not $r = 5$.`,
        r`A minus sign inside, $(a - b)^n$, makes every odd $r$ term negative.`,
      ],
    },
    {
      name: 'Number / Digit Problems',
      inShort: r`Numbers described by their digits or by how they relate: consecutive integers, digit sums, a number and its reverse.`,
      keyIdeas: [
        r`A two-digit number with tens digit $t$ and units digit $u$ is $10t + u$, never $tu$.`,
        r`Reversing gives $10u + t$, and the difference is always $9(t - u)$.`,
        r`Consecutive integers: $n, n+1, n+2$; consecutive even or odd: $n, n+2, n+4$.`,
      ],
      example: {
        problem: r`The digits of a two-digit number add up to 11. Reversing the digits gives a number 45 less. Find the number.`,
        solution: r`Let the tens digit be $t$ and the units digit $u$: $t + u = 11$. The number minus its reverse is $9(t - u) = 45$, so $t - u = 5$. Adding the two equations, $2t = 16$: $t = 8$ and $u = 3$. The number is $83$ (check: $83 - 38 = 45$).`,
      },
      traps: [
        r`Always check each digit is a whole number from 0 to 9; a "solution" with a digit of 11 means the setup or the item is wrong.`,
        r`"Consecutive odd" starts at an odd number: $n$ must be odd, the step is still 2.`,
      ],
    },
    {
      name: 'Proportion and Variation',
      inShort: r`Quantities that change together at a fixed rate: ratios, proportions, and direct, inverse, joint and combined variation.`,
      keyIdeas: [
        r`$\frac{a}{b} = \frac{c}{d} \iff ad = bc$.`,
        r`Direct: $y = kx$. Inverse: $y = \frac{k}{x}$. Joint: $y = kxz$. Combined: $y = \frac{kx}{z}$.`,
        r`Find $k$ from the first set of values, then use it for the second; or set up the ratio of the two cases so $k$ cancels.`,
        r`Similar figures: lengths scale by $k$, areas by $k^2$, volumes by $k^3$.`,
      ],
      example: {
        problem: r`$y$ varies directly as $x^2$ and inversely as $z$. When $x = 2$ and $z = 8$, $y = 3$. Find $y$ when $x = 4$ and $z = 6$.`,
        solution: r`$y = \frac{kx^2}{z}$. From the first case, $3 = \frac{k(4)}{8}$, so $k = 6$. Then $y = \frac{6(16)}{6} = 16$.`,
      },
      traps: [
        r`"Varies inversely as the square" is $y = \frac{k}{x^2}$: square the variable, not the constant.`,
        r`A percent increase then the same percent decrease does not return to the start.`,
      ],
    },
    {
      name: 'Age Problems',
      inShort: r`Ages at different times, tied together by statements like "five years ago" and "in ten years".`,
      keyIdeas: [
        r`Pick one unknown, usually the present age of the younger person.`,
        r`In $t$ years every age is $+t$; $t$ years ago every age is $-t$.`,
        r`The difference between two people's ages never changes.`,
      ],
      example: {
        problem: r`A father is 3 times as old as his son. In 12 years he will be twice as old. Find their present ages.`,
        solution: r`Son $x$, father $3x$. In 12 years: $3x + 12 = 2(x + 12)$, so $x = 12$. The son is 12 and the father 36. (Check: in 12 years, 48 is twice 24.)`,
      },
      traps: [
        r`Move both ages by the same number of years; forgetting to add $t$ to one of them is the usual slip.`,
      ],
    },
    {
      name: 'Mixture Problems',
      inShort: r`Combining solutions, alloys or grades of a product: the amount of the pure ingredient adds up.`,
      keyIdeas: [
        r`Pure ingredient before = pure ingredient after: $C_1V_1 + C_2V_2 = C(V_1 + V_2)$.`,
        r`Adding water or evaporating keeps the solute fixed: $C_1V_1 = C_2V_2$.`,
        r`Alligation gives the mixing ratio directly: $\frac{V_1}{V_2} = \frac{C_2 - C}{C - C_1}$.`,
      ],
      example: {
        problem: r`How many liters of a 50% acid solution must be added to 30 L of a 20% solution to make a 30% solution?`,
        solution: r`$0.50V + 0.20(30) = 0.30(V + 30)$, so $0.50V + 6 = 0.30V + 9$ and $V = 15$ L. (Alligation agrees: $\frac{30}{V} = \frac{50 - 30}{30 - 20} = 2$, so $V = 15$.)`,
      },
      traps: [
        r`Pure water is 0% acid; pure acid is 100%. Put those in, not 1 and 0 the wrong way round.`,
      ],
    },
    {
      name: 'Motion Problems',
      inShort: r`Distance, rate and time, including two movers, boats in a current, and the hands of a clock.`,
      keyIdeas: [
        r`$d = vt$ for each mover; write one row per mover before forming the equation.`,
        r`Toward each other, speeds add; same direction, they subtract.`,
        r`Downstream $b + c$, upstream $b - c$.`,
        r`Equal distances at two speeds average to the harmonic mean $\frac{2v_1v_2}{v_1 + v_2}$, not $\frac{v_1 + v_2}{2}$.`,
        r`Clock: the angle at $H{:}M$ is $|30H - 5.5M|$; the minute hand gains $5.5^\circ$ per minute.`,
      ],
      example: {
        problem: r`At what time after 3:00 are the hands of a clock first together?`,
        solution: r`At 3:00 the hour hand is $90^\circ$ ahead. The minute hand gains $5.5^\circ$ a minute, so it catches up after $\frac{90}{5.5} = 16\frac{4}{11}$ minutes: at about 3:16.36.`,
      },
      traps: [
        r`Convert units first: km/h with minutes gives nonsense.`,
        r`"Average speed" for a round trip is total distance over total time.`,
      ],
    },
    {
      name: 'Work Problems',
      inShort: r`Jobs shared by workers, machines or pipes: rates add, times don't.`,
      keyIdeas: [
        r`A worker who needs $T$ hours does $\frac{1}{T}$ of the job each hour.`,
        r`Together: $\frac{1}{T} = \frac{1}{t_1} + \frac{1}{t_2} + \cdots$; a drain subtracts its rate.`,
        r`Equal workers: $n_1d_1 = n_2d_2$ (worker-days stay the same).`,
      ],
      example: {
        problem: r`A can finish a job in 6 h and B in 3 h. A works alone for 2 h, then B joins. How long do they work together?`,
        solution: r`A does $\frac{2}{6} = \frac13$ alone, leaving $\frac23$. Together they do $\frac16 + \frac13 = \frac12$ per hour, so they need $\frac{2/3}{1/2} = \frac43$ h, which is 1 h 20 min.`,
      },
      traps: [
        r`Never add times; add rates. "6 h and 3 h together" is 2 h, not 4.5 h.`,
      ],
    },
    {
      name: 'Money-Related Problems',
      inShort: r`Coins, prices, profit, discounts and simple or compound interest.`,
      keyIdeas: [
        r`Value of coins $=$ number $\times$ face value, summed over kinds.`,
        r`Simple interest $I = Prt$; compound $F = P(1 + i)^n$ with $i$ and $n$ per period.`,
        r`Profit percent is on the cost unless the item says on the selling price.`,
        r`Successive discounts multiply: 20% then 10% off leaves $0.8 \times 0.9 = 0.72$.`,
      ],
      example: {
        problem: r`A book costing ₱200 is sold at a 20% discount and still makes a 30% profit. What was the marked price?`,
        solution: r`Selling price $= 200 \times 1.30 = 260$. Then $0.80M = 260$, so $M = 325$. The marked price is ₱325, a markup of 62.5% on the cost.`,
      },
      traps: [
        r`Two discounts of 20% and 10% are not 30% off.`,
        r`Match the rate to the period: 12% a year compounded monthly is 1% a month.`,
      ],
    },
    {
      name: 'Arithmetic Progression',
      inShort: r`Sequences with a constant difference, their terms, their sums, and the sums of whole numbers, squares and cubes.`,
      keyIdeas: [
        r`$a_n = a_1 + (n - 1)d$ and $n = \frac{a_n - a_1}{d} + 1$.`,
        r`$S_n = \frac{n}{2}(a_1 + a_n) = \frac{n}{2}\left[2a_1 + (n-1)d\right]$.`,
        r`$k$ means between $a$ and $b$: $d = \frac{b - a}{k + 1}$.`,
        r`$\sum k = \frac{n(n+1)}{2}$, $\sum k^2 = \frac{n(n+1)(2n+1)}{6}$, $\sum k^3 = \left[\frac{n(n+1)}{2}\right]^2$.`,
      ],
      example: {
        problem: r`Find the sum of all multiples of 7 between 1 and 400.`,
        solution: r`They run $7, 14, \ldots, 399$, so $n = \frac{399 - 7}{7} + 1 = 57$. $S = \frac{57}{2}(7 + 399) = 57 \times 203 = 11\,571$.`,
      },
      traps: [
        r`Counting terms: from 7 to 399 in steps of 7 is $\frac{392}{7} + 1$ terms; the $+1$ is often forgotten.`,
      ],
    },
    {
      name: 'Geometric Progression',
      inShort: r`Sequences with a constant ratio, finite and infinite sums, the three means, and harmonic progressions.`,
      keyIdeas: [
        r`$a_n = a_1r^{n-1}$; $S_n = a_1\frac{1 - r^n}{1 - r}$ for $r \ne 1$.`,
        r`An infinite series converges only for $|r| < 1$: $S_\infty = \frac{a_1}{1 - r}$.`,
        r`$k$ geometric means between $a$ and $b$: $r = \left(\frac{b}{a}\right)^{1/(k+1)}$.`,
        r`For two positive numbers, $AM \ge GM \ge HM$ and $GM^2 = AM \cdot HM$.`,
        r`A harmonic progression is one whose reciprocals form an arithmetic progression.`,
      ],
      example: {
        problem: r`A ball dropped from 10 m rebounds to $\frac{3}{4}$ of its height each time. Find the total distance it travels.`,
        solution: r`Down $10$, then up and down $2 \times 7.5$, $2 \times 5.625$, … The bounces sum to $2 \times \frac{7.5}{1 - 0.75} = 60$. Total $= 10 + 60 = 70$ m.`,
      },
      traps: [
        r`The bouncing ball's first drop is counted once; every rebound twice.`,
        r`$S_\infty$ with $|r| \ge 1$ does not exist: a choice of a number there is a distractor.`,
      ],
    },
    {
      name: 'Diophantine Equation',
      inShort: r`Equations that need whole-number answers, mostly $ax + by = c$.`,
      keyIdeas: [
        r`$ax + by = c$ has integer solutions only when $\gcd(a, b)$ divides $c$.`,
        r`From one solution $(x_0, y_0)$: $x = x_0 + \frac{b}{g}t$, $y = y_0 - \frac{a}{g}t$, $t$ any integer.`,
        r`"How many positive solutions" means: find the range of $t$ keeping both $x$ and $y$ positive.`,
      ],
      example: {
        problem: r`In how many ways can ₱100 be paid with ₱5 and ₱10 coins, using at least one of each?`,
        solution: r`$5x + 10y = 100$, so $x + 2y = 20$, $x = 20 - 2y$. With $x \ge 1$ and $y \ge 1$: $y = 1, \ldots, 9$. That is 9 ways.`,
      },
      traps: [
        r`"At least one of each" removes the end cases; "any number" keeps $0$.`,
      ],
    },
    {
      name: 'Venn Diagram',
      inShort: r`Counting the members of overlapping groups by inclusion-exclusion.`,
      keyIdeas: [
        r`$n(A \cup B) = n(A) + n(B) - n(A \cap B)$.`,
        r`For three sets add the pairwise overlaps back in reverse and the triple overlap once: inclusion-exclusion.`,
        r`Fill a Venn diagram from the centre (all three) outward.`,
        r`A set of $n$ elements has $2^n$ subsets.`,
      ],
      example: {
        problem: r`Of 50 students, 30 take Physics, 25 take Chemistry and 10 take both. How many take neither?`,
        solution: r`$n(P \cup C) = 30 + 25 - 10 = 45$. Neither: $50 - 45 = 5$.`,
      },
      traps: [
        r`"Only Physics" is $30 - 10 = 20$, not 30.`,
      ],
    },
    {
      name: 'Miscellaneous Problems',
      inShort: r`Items that don't fit a family: levers and balances, clock and calendar puzzles, special constants, and logic.`,
      keyIdeas: [
        r`Translate one sentence at a time, naming every unknown before writing an equation.`,
        r`Check units and whether the answer must be a whole number.`,
        r`Know the constants: $e \approx 2.71828$, $\varphi = \frac{1 + \sqrt5}{2} \approx 1.61803$.`,
      ],
      example: {
        problem: r`A 2 m lever has its fulcrum 0.5 m from one end. What force at the long end balances 300 N at the short end?`,
        solution: r`Moments balance: $300 \times 0.5 = F \times 1.5$, so $F = 100$ N.`,
      },
      traps: [
        r`Distances are measured from the fulcrum, not from the end.`,
      ],
    },
  ],
};
