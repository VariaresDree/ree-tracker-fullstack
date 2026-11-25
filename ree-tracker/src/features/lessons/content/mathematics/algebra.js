// Library › Lessons › Mathematics › Algebra (2026-11-16; every subtopic in the
// module format 2026-11-26, with figures, examples a step at a time and
// checks; every number re-worked by algebraLesson.test.js. Coverage
// cross-checked against the algebra part of a review center's algebra and
// complex numbers handout; the text, problems and figures are this app's
// own): written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order. Formula cards for each subtopic show under it.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// The angle between a clock's hands, m minutes after 3:00 (degrees, 0 to 180).
export const clockAngle = (m) => {
  const a = Math.abs(90 - 5.5 * m) % 360;
  return Math.min(a, 360 - a);
};

// Strength (%) of 30 L of a 20% acid after V litres of a 50% acid are added.
export const mixStrength = (V) => ((0.2 * 30 + 0.5 * V) / (30 + V)) * 100;

// Total distance (m) a ball dropped from 10 m has travelled when it lands for
// the (n + 1)th time, rebounding to 3/4 of its height each time.
export const bounceDistance = (n) => 10 + 60 * (1 - 0.75 ** n);

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
      body: [
        r`Most simplification is a handful of laws used in the right order:

| Law | Exponents | Radicals |
|---|---|---|
| Product | $a^m a^n = a^{m+n}$ | $\sqrt[n]{a}\sqrt[n]{b} = \sqrt[n]{ab}$ |
| Quotient | $\frac{a^m}{a^n} = a^{m-n}$ | $\frac{\sqrt[n]{a}}{\sqrt[n]{b}} = \sqrt[n]{\frac{a}{b}}$ |
| Power | $(a^m)^n = a^{mn}$ | $\left(\sqrt[n]{a}\right)^m = \sqrt[n]{a^m} = a^{m/n}$ |
| Of a product | $(ab)^n = a^nb^n$ | $\sqrt[m]{\sqrt[n]{a}} = \sqrt[mn]{a}$ |

Factoring runs the special products backwards: the **difference of two squares** $a^2 - b^2 = (a - b)(a + b)$, the **sum and difference of two cubes** $a^3 \pm b^3 = (a \pm b)(a^2 \mp ab + b^2)$, and the **square of a binomial** $(a \pm b)^2 = a^2 \pm 2ab + b^2$. When none fits, group terms to pull out a common factor.

A **logarithm** is an exponent: $\log_b x = y$ means $b^y = x$. So $y = \log_b x$ and $y = b^x$ undo each other, and their graphs are mirror images in the line $y = x$:`,
        {
          type: 'plot',
          alt: 'The curves y equals 2 to the x and y equals log base 2 of x, from x equals minus 3 to 4, are mirror images in the dashed line y equals x. The exponential passes through 0 comma 1; the logarithm through 1 comma 0.',
          caption: 'y = 2ˣ and y = log₂ x mirror each other in y = x: a logarithm is the exponent that undoes a power.',
          x: [-3, 4],
          y: [-3, 4],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 2 ** x, label: 'y = 2ˣ', colour: colourOf(0) },
            { points: range(0.12, 4, 60).map((x) => [x, Math.log2(x)]), label: 'y = log₂ x', colour: colourOf(1) },
            { f: (x) => x, label: 'y = x', dashed: true, colour: colourOf(2) },
          ],
        },
        r`The log laws follow from the exponent laws: $\log(ab) = \log a + \log b$, $\log\frac{a}{b} = \log a - \log b$, $\log a^n = n\log a$, and to change base, $\log_b x = \frac{\ln x}{\ln b}$. A denominator with a radical is **rationalized** with its conjugate: $\frac{1}{\sqrt a + \sqrt b} = \frac{\sqrt a - \sqrt b}{a - b}$.`,
      ],
      keyIdeas: [
        r`Same base, multiply: add exponents, $a^m a^n = a^{m+n}$. Power of a power: multiply, $(a^m)^n = a^{mn}$.`,
        r`A radical is a fractional exponent: $\sqrt[n]{a^m} = a^{m/n}$. Converting to exponents usually makes the algebra easier.`,
        r`Factor patterns to know cold: $a^2 - b^2 = (a-b)(a+b)$, $a^3 \pm b^3 = (a \pm b)(a^2 \mp ab + b^2)$, $(a \pm b)^2 = a^2 \pm 2ab + b^2$.`,
        r`A logarithm is an exponent: $\log_b x = y \iff b^y = x$. Product to sum, quotient to difference, power to coefficient.`,
        r`Rationalize a denominator with its conjugate: $\frac{1}{\sqrt a + \sqrt b} = \frac{\sqrt a - \sqrt b}{a - b}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Fractional exponents',
          problem: r`Simplify $\dfrac{(8x^{6}y^{-3})^{2/3}}{4x^{2}y^{-4}}$.`,
          steps: [
            r`Raise each factor: $8^{2/3} = 4$, $(x^6)^{2/3} = x^4$, $(y^{-3})^{2/3} = y^{-2}$, so the numerator is $4x^4y^{-2}$.`,
            r`Divide: $\dfrac{4x^4y^{-2}}{4x^2y^{-4}} = x^{4-2}\,y^{-2-(-4)} = x^2y^2$.`,
          ],
          answer: r`$x^2y^2$.`,
        },
        {
          level: 'board',
          title: 'An exponential and a logarithmic equation',
          problem: r`Solve (a) $4^{x+1} = 8^{x-1}$ and (b) $\log_2 x + \log_2(x - 2) = 3$.`,
          steps: [
            r`(a) Write both sides as powers of 2: $2^{2x+2} = 2^{3x-3}$, so $2x + 2 = 3x - 3$ and $x = 5$.`,
            r`(b) Combine the logs: $\log_2[x(x - 2)] = 3$, so $x(x - 2) = 2^3 = 8$.`,
            r`$x^2 - 2x - 8 = 0$ gives $x = 4$ or $x = -2$. A log needs a positive argument, so $x = -2$ is rejected.`,
          ],
          answer: r`(a) $x = 5$; (b) $x = 4$.`,
        },
      ],
      traps: [
        r`$(a + b)^2 \ne a^2 + b^2$: the middle term $2ab$ is the most-missed term on the board.`,
        r`$\log(a + b)$ does not split; only $\log(ab) = \log a + \log b$ does.`,
        r`$a^0 = 1$ only for $a \ne 0$, and $\sqrt{a^2} = |a|$, not $a$.`,
        r`Check every root of a log equation: one that makes an argument zero or negative is not a solution.`,
      ],
      check: [
        { q: r`Evaluate $\log_3 81$.`, a: r`$4$, since $3^4 = 81$.` },
        { q: r`Factor $8a^3 - 27$.`, a: r`$(2a - 3)(4a^2 + 6a + 9)$, a difference of two cubes.` },
      ],
    },
    {
      name: 'Functions',
      inShort: r`A function gives each input exactly one output. Expect composition, inverses, domain and range, and above all quadratic functions and polynomial roots.`,
      body: [
        r`A **function** gives each input exactly one output. Its **domain** is the inputs allowed (no zero denominators, no even roots of negatives, no logs of zero or less), and its **range** the outputs it actually reaches. **Composition** works inside out, $(f \circ g)(x) = f(g(x))$; an **inverse** undoes $f$: swap $x$ and $y$ in $y = f(x)$ and solve for $y$.

The board's favourite function is the **quadratic**, $y = ax^2 + bx + c$. Its graph is a parabola with its vertex at $x = -\frac{b}{2a}$, and its roots, where it crosses the axis, come from $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$:`,
        {
          type: 'plot',
          alt: 'The parabola y equals 2 x squared minus 7 x plus 3 opens upward, crosses the x axis at 0.5 and at 3, and has its lowest point at x equals 1.75, y equals minus 3.125.',
          caption: 'y = 2x² − 7x + 3: roots 0.5 and 3 (sum 3.5 = 7/2, product 1.5 = 3/2), vertex at x = 7/4.',
          x: [-0.5, 4],
          y: [-4, 8],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ f: (x) => 2 * x * x - 7 * x + 3 }],
          marks: [
            { x: 0.5, label: '0.5' },
            { x: 3, label: '3' },
            { at: [1.75, -3.125] },
          ],
          legend: false,
        },
        r`The **discriminant** $b^2 - 4ac$ says what kind of roots to expect: positive, two real roots; zero, one repeated root (a perfect square); negative, a pair of complex conjugates. Without solving, the roots' **sum** is $-\frac{b}{a}$ and their **product** $\frac{c}{a}$.

An equation in **quadratic form**, $ax^{2n} + bx^n + c = 0$, is a quadratic in $u = x^n$. For higher polynomials, the **remainder theorem** says $f(x)$ divided by $(x - a)$ leaves $f(a)$; the **factor theorem**, that $(x - a)$ is a factor exactly when $f(a) = 0$. Synthetic division does the division quickly.`,
      ],
      keyIdeas: [
        r`Composition works inside out: $(f \circ g)(x) = f(g(x))$.`,
        r`To invert $y = f(x)$, swap $x$ and $y$ and solve for $y$; the graph mirrors in $y = x$.`,
        r`For $ax^2 + bx + c = 0$: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$, and the discriminant $b^2 - 4ac$ tells real/equal/complex roots.`,
        r`Vieta: sum of roots $= -\frac{b}{a}$, product $= \frac{c}{a}$. Most "find $r_1^2 + r_2^2$" items need only these two numbers.`,
        r`Remainder theorem: dividing $f(x)$ by $(x - a)$ leaves $f(a)$; it is a factor exactly when $f(a) = 0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sum and product of roots',
          problem: r`The roots of $2x^2 - 7x + 3 = 0$ are $r_1$ and $r_2$. Find $r_1^2 + r_2^2$ without solving.`,
          steps: [
            r`Sum $= \frac{7}{2}$, product $= \frac{3}{2}$.`,
            r`$r_1^2 + r_2^2 = (r_1 + r_2)^2 - 2r_1r_2 = \frac{49}{4} - 3 = \frac{37}{4} = 9.25$.`,
            r`Check: the roots are $3$ and $\frac12$, and $9 + \frac14 = 9.25$.`,
          ],
          answer: r`$9.25$.`,
        },
        {
          level: 'board',
          title: 'Factor theorem, then remainder theorem',
          problem: r`Find $k$ so that $x + 2$ is a factor of $f(x) = x^3 + kx^2 - 4x - 12$. Then find the remainder when $f(x)$ is divided by $x - 3$.`,
          steps: [
            r`Factor theorem: $f(-2) = -8 + 4k + 8 - 12 = 4k - 12 = 0$, so $k = 3$.`,
            r`Remainder theorem: $f(3) = 27 + 27 - 12 - 12 = 30$.`,
          ],
          answer: r`$k = 3$; the remainder is $30$.`,
        },
      ],
      traps: [
        r`Domain first: $\sqrt{x - 2}$ needs $x \ge 2$, $\frac{1}{x+1}$ needs $x \ne -1$, $\log x$ needs $x > 0$.`,
        r`The vertex is at $x = -\frac{b}{2a}$; its $y$ is the maximum when $a < 0$ and the minimum when $a > 0$.`,
        r`Dividing by $x + 2$ means evaluating at $x = -2$: mind the sign.`,
      ],
      check: [
        { q: r`What kind of roots does $3x^2 - 4x + 2 = 0$ have?`, a: r`Complex conjugates: $b^2 - 4ac = 16 - 24 = -8 < 0$.` },
        { q: r`Find the inverse of $f(x) = \frac{2x + 1}{3}$.`, a: r`$f^{-1}(x) = \frac{3x - 1}{2}$.` },
      ],
    },
    {
      name: 'System of Equations',
      inShort: r`Two or three unknowns tied by as many equations: solve by elimination, substitution, determinants (Cramer's rule) or a calculator's equation mode.`,
      body: [
        r`Each linear equation in two unknowns is a line, and a solution of the system is a point on both:`,
        {
          type: 'plot',
          alt: 'The lines 2 x plus 3 y equals 8 and x minus y equals minus 1 cross at the point 1 comma 2, the solution of the system.',
          caption: 'The system 2x + 3y = 8 and x − y = −1: the lines cross at (1, 2).',
          x: [-2, 5],
          y: [-2, 5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => (8 - 2 * x) / 3, label: '2x + 3y = 8', colour: colourOf(0) },
            { f: (x) => x + 1, label: 'x − y = −1', colour: colourOf(1) },
          ],
          marks: [{ at: [1, 2] }],
        },
        r`| Lines | Determinant $D$ | Solutions |
|---|---|---|
| cross | $D \ne 0$ | exactly one |
| parallel | $D = 0$, $D_x \ne 0$ | none |
| the same line | $D = D_x = D_y = 0$ | infinitely many |

**Cramer's rule** solves any system with $D \ne 0$: $x = \frac{D_x}{D}$, $y = \frac{D_y}{D}$ (and $z = \frac{D_z}{D}$), where $D_x$ is $D$ with the $x$ column replaced by the constants. A $3 \times 3$ determinant expands along its first row: $a(ei - fh) - b(di - fg) + c(dh - eg)$. A system with one quadratic falls to substitution.`,
      ],
      keyIdeas: [
        r`A $2 \times 2$ system has one solution exactly when $a_1b_2 - a_2b_1 \ne 0$; otherwise the lines are parallel or the same.`,
        r`Cramer's rule: $x = \frac{D_x}{D}$, $y = \frac{D_y}{D}$, where $D_x$ replaces the $x$ column with the constants.`,
        r`For $3 \times 3$, expand along a row: $a(ei - fh) - b(di - fg) + c(dh - eg)$.`,
        r`Nonlinear systems (one quadratic, one linear) usually fall to substitution.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Two unknowns by Cramer's rule",
          problem: r`Solve $2x + 3y = 8$ and $x - y = -1$.`,
          steps: [
            r`$D = (2)(-1) - (1)(3) = -5$.`,
            r`$D_x = (8)(-1) - (-1)(3) = -5$; $D_y = (2)(-1) - (1)(8) = -10$.`,
            r`$x = \frac{-5}{-5} = 1$, $y = \frac{-10}{-5} = 2$.`,
          ],
          answer: r`$x = 1$, $y = 2$.`,
        },
        {
          level: 'board',
          title: 'Three unknowns',
          problem: r`Solve $x + y + z = 6$, $2x - y + z = 3$, $x + 2y - z = 2$.`,
          steps: [
            r`$D = 1[(-1)(-1) - (1)(2)] - 1[(2)(-1) - (1)(1)] + 1[(2)(2) - (-1)(1)] = -1 + 3 + 5 = 7$.`,
            r`$D_x$ (constants in the first column): $6(1 - 2) - 1(-3 - 2) + 1(6 + 2) = 7$.`,
            r`$D_y = 1(-3 - 2) - 6(-2 - 1) + 1(4 - 3) = 14$; $D_z = 1(-2 - 6) - 1(4 - 3) + 6(4 + 1) = 21$.`,
            r`$x = \frac{7}{7} = 1$, $y = \frac{14}{7} = 2$, $z = \frac{21}{7} = 3$.`,
          ],
          answer: r`$x = 1$, $y = 2$, $z = 3$.`,
        },
      ],
      traps: [
        r`Line the equations up as $ax + by = c$ before reading off coefficients: a term on the wrong side flips its sign.`,
        r`On the calculator, enter the constants on the right-hand side, not moved to the left.`,
      ],
      check: [
        { q: r`For what $k$ do $kx + 2y = 5$ and $3x + 6y = 1$ have no unique solution?`, a: r`$D = 6k - 6 = 0$, so $k = 1$ (the lines are then parallel).` },
        { q: r`What does $D = 0$ with $D_x \ne 0$ mean?`, a: r`Parallel lines: no solution.` },
      ],
    },
    {
      name: 'Binomial Theorem',
      inShort: r`Expanding $(a + b)^n$ without multiplying it out, and finding one term, one coefficient or the sum of all coefficients.`,
      body: [
        r`The coefficients of $(a + b)^n$ form **Pascal's triangle**: each number is the sum of the two above it.

| $n$ | Coefficients |
|---|---|
| 0 | 1 |
| 1 | 1 1 |
| 2 | 1 2 1 |
| 3 | 1 3 3 1 |
| 4 | 1 4 6 4 1 |
| 5 | 1 5 10 10 5 1 |
| 6 | 1 6 15 20 15 6 1 |

For larger $n$, the **binomial theorem** gives any term directly: $(a + b)^n = \sum_{r=0}^{n}\binom{n}{r}a^{n-r}b^r$, with $n + 1$ terms. The $(r + 1)$th term is $T_{r+1} = \binom{n}{r}a^{n-r}b^r$; equivalently the $k$th term is $\binom{n}{k-1}a^{n-k+1}b^{k-1}$. The exponents always add up to $n$.

The **sum of the coefficients** is the expansion with every variable set to 1. Some items count only the coefficients of the variable terms; then subtract the constant term, $f(1) - f(0)$.`,
      ],
      keyIdeas: [
        r`$(a+b)^n = \sum_{r=0}^{n} \binom{n}{r} a^{n-r} b^{r}$, with $n + 1$ terms.`,
        r`The $(r+1)$th term is $T_{r+1} = \binom{n}{r} a^{n-r} b^{r}$: count from $r = 0$.`,
        r`To find the term with $x^k$ in $(ax^p + bx^q)^n$, solve $p(n - r) + qr = k$ for $r$.`,
        r`Sum of the coefficients: put every variable equal to 1.`,
        r`The middle term of $(a+b)^n$ is $T_{n/2 + 1}$ when $n$ is even; there are two when $n$ is odd.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The term free of x',
          problem: r`Find the term free of $x$ in $\left(x^2 + \dfrac{2}{x}\right)^{6}$.`,
          steps: [
            r`$T_{r+1} = \binom{6}{r}(x^2)^{6-r}\left(\frac{2}{x}\right)^{r} = \binom{6}{r}2^r x^{12 - 3r}$.`,
            r`Free of $x$: $12 - 3r = 0$, so $r = 4$.`,
            r`$\binom{6}{4}2^4 = 15 \times 16 = 240$.`,
          ],
          answer: r`$240$ (the 5th term).`,
        },
        {
          level: 'board',
          title: 'One term, and the coefficients',
          problem: r`For $(2x - y)^7$, find the 5th term, the middle terms, and the sum of the coefficients.`,
          steps: [
            r`5th term: $r = 4$, $T_5 = \binom{7}{4}(2x)^3(-y)^4 = 35 \times 8\,x^3y^4 = 280x^3y^4$.`,
            r`$n = 7$ is odd, so there are two middle terms: the 4th and the 5th.`,
            r`Sum of coefficients: $(2 - 1)^7 = 1$.`,
          ],
          answer: r`$280x^3y^4$; the 4th and 5th terms; $1$.`,
        },
      ],
      traps: [
        r`The $5$th term is $r = 4$, not $r = 5$.`,
        r`A minus sign inside, $(a - b)^n$, makes every odd $r$ term negative.`,
        r`Raise the whole of each part: $(2x)^3 = 8x^3$, not $2x^3$.`,
      ],
      check: [
        { q: r`How many terms has $(a + b)^{12}$?`, a: r`$13$.` },
        { q: r`What is the sum of the coefficients of $(3x - 2)^4$?`, a: r`$(3 - 2)^4 = 1$.` },
      ],
    },
    {
      name: 'Number / Digit Problems',
      inShort: r`Numbers described by their digits or by how they relate: consecutive integers, digit sums, a number and its reverse.`,
      body: [
        r`Name the digits, then write the number by place value:

| Quantity | Expression |
|---|---|
| two-digit number, tens $t$, units $u$ | $10t + u$ |
| its reverse | $10u + t$; the two differ by $9(t - u)$ |
| three-digit number, hundreds $h$ | $100h + 10t + u$ |
| its reverse | $100u + 10t + h$; they differ by $99(h - u)$ |
| sum of the digits | $h + t + u$ |
| "divided by the digit sum gives $q$, remainder $r$" | number $= q \times$ (digit sum) $+ r$ |
| consecutive integers | $n,\ n + 1,\ n + 2$ |
| consecutive even or odd integers | $n,\ n + 2,\ n + 4$ |

Each digit must come out a whole number from 0 to 9, and a leading digit can't be 0: that is the check on every answer.`,
      ],
      keyIdeas: [
        r`A two-digit number with tens digit $t$ and units digit $u$ is $10t + u$, never $tu$.`,
        r`Reversing gives $10u + t$, and the difference is always $9(t - u)$.`,
        r`Consecutive integers: $n, n+1, n+2$; consecutive even or odd: $n, n+2, n+4$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A number and its reverse',
          problem: r`The digits of a two-digit number add up to 11. Reversing the digits gives a number 45 less. Find the number.`,
          steps: [
            r`Let the tens digit be $t$ and the units digit $u$: $t + u = 11$.`,
            r`The number minus its reverse is $9(t - u) = 45$, so $t - u = 5$.`,
            r`Adding: $2t = 16$, so $t = 8$ and $u = 3$. Check: $83 - 38 = 45$.`,
          ],
          answer: r`$83$.`,
        },
        {
          level: 'board',
          title: 'A three-digit number',
          problem: r`The digits of a three-digit number add up to 12, and the middle digit is the sum of the other two. Reversing the digits makes the number 396 larger. Find the number.`,
          steps: [
            r`$h + t + u = 12$ and $t = h + u$, so $2t = 12$: $t = 6$ and $h + u = 6$.`,
            r`The reverse minus the number is $99(u - h) = 396$, so $u - h = 4$.`,
            r`$u = 5$, $h = 1$: the number is $165$. Check: $561 - 165 = 396$.`,
          ],
          answer: r`$165$.`,
        },
      ],
      traps: [
        r`Always check each digit is a whole number from 0 to 9; a "solution" with a digit of 11 means the setup or the item is wrong.`,
        r`"Consecutive odd" starts at an odd number: $n$ must be odd, the step is still 2.`,
      ],
      check: [
        { q: r`Three consecutive odd integers add up to 81. Find them.`, a: r`$n + (n + 2) + (n + 4) = 81$ gives $n = 25$: 25, 27 and 29.` },
        { q: r`A two-digit number divided by its digit sum gives 7 with remainder 6. Write the equation.`, a: r`$10t + u = 7(t + u) + 6$.` },
      ],
    },
    {
      name: 'Proportion and Variation',
      inShort: r`Quantities that change together at a fixed rate: ratios, proportions, and direct, inverse, joint and combined variation.`,
      body: [
        r`A **ratio** $a : b$ is the fraction $\frac{a}{b}$. A **proportion** says two ratios are equal, $a : b = c : d$: $a$ and $d$ are the **extremes**, $b$ and $c$ the **means**, and the product of the means equals the product of the extremes, $ad = bc$.

| Term | Meaning | Value |
|---|---|---|
| fourth proportional to $a, b, c$ | $a : b = c : x$ | $x = \frac{bc}{a}$ |
| third proportional to $a, b$ | $a : b = b : x$ | $x = \frac{b^2}{a}$ |
| mean proportional between $a, b$ | $a : x = x : b$ | $x = \sqrt{ab}$, the geometric mean |

A proportion stays true under alternation ($a : c = b : d$), inversion ($b : a = d : c$), addition ($(a + b) : b = (c + d) : d$) and subtraction ($(a - b) : b = (c - d) : d$).

**Variation** writes "changes with" as an equation with a constant $k$: **direct** $y = kx$, **inverse** $y = \frac{k}{x}$, **joint** $y = kxz$, **combined** $y = \frac{kx}{z}$. Direct grows in a straight line; inverse falls, and inverse-square falls faster:`,
        {
          type: 'plot',
          alt: 'Three curves with k equals 2, from x equals 0.5 to 4: y equals 2 x is a rising straight line; y equals 2 over x falls; y equals 2 over x squared falls fastest, from 8 at x equals 0.5.',
          caption: 'With k = 2: direct (y = 2x) rises in a straight line, inverse (y = 2/x) falls, and inverse-square (y = 2/x²) falls fastest.',
          x: [0.5, 4],
          y: [0, 8],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 2 * x, label: 'y = 2x', colour: colourOf(0) },
            { f: (x) => 2 / x, label: 'y = 2/x', colour: colourOf(1) },
            { f: (x) => 2 / (x * x), label: 'y = 2/x²', dashed: true, colour: colourOf(2) },
          ],
        },
        r`Find $k$ from the first set of values, then use it for the second; or divide the two cases so that $k$ cancels.`,
      ],
      keyIdeas: [
        r`$\frac{a}{b} = \frac{c}{d} \iff ad = bc$.`,
        r`Direct: $y = kx$. Inverse: $y = \frac{k}{x}$. Joint: $y = kxz$. Combined: $y = \frac{kx}{z}$.`,
        r`Find $k$ from the first set of values, then use it for the second; or set up the ratio of the two cases so $k$ cancels.`,
        r`Similar figures: lengths scale by $k$, areas by $k^2$, volumes by $k^3$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Combined variation',
          problem: r`$y$ varies directly as $x^2$ and inversely as $z$. When $x = 2$ and $z = 8$, $y = 3$. Find $y$ when $x = 4$ and $z = 6$.`,
          steps: [
            r`$y = \frac{kx^2}{z}$. From the first case, $3 = \frac{k(4)}{8}$, so $k = 6$.`,
            r`Then $y = \frac{6(16)}{6} = 16$.`,
          ],
          answer: r`$y = 16$.`,
        },
        {
          level: 'board',
          title: 'Proportionals, and an inverse square',
          problem: r`Find (a) the fourth proportional to 3, 5 and 12, (b) the mean proportional between 4 and 25, and (c) the third proportional to 4 and 10. (d) Illuminance varies inversely as the square of the distance; a lamp gives 90 lux at 2 m. What does it give at 3 m?`,
          steps: [
            r`(a) $3 : 5 = 12 : x$, so $x = \frac{5 \times 12}{3} = 20$.`,
            r`(b) $\sqrt{4 \times 25} = 10$.`,
            r`(c) $4 : 10 = 10 : x$, so $x = \frac{100}{4} = 25$.`,
            r`(d) $\frac{E_2}{E_1} = \left(\frac{2}{3}\right)^2$, so $E_2 = 90 \times \frac{4}{9} = 40$ lux.`,
          ],
          answer: r`20; 10; 25; 40 lux.`,
        },
      ],
      traps: [
        r`"Varies inversely as the square" is $y = \frac{k}{x^2}$: square the variable, not the constant.`,
        r`A percent increase then the same percent decrease does not return to the start.`,
        r`The third proportional to $a$ and $b$ is $\frac{b^2}{a}$, not $\frac{a^2}{b}$: $b$ is the repeated mean.`,
      ],
      check: [
        { q: r`If $y$ varies directly as $x$ and $x$ grows by 20%, what happens to $y$?`, a: r`It grows by 20% too.` },
        { q: r`Two similar figures have lengths in the ratio 3 : 1. What is the ratio of their areas?`, a: r`$9 : 1$.` },
      ],
    },
    {
      name: 'Age Problems',
      inShort: r`Ages at different times, tied together by statements like "five years ago" and "in ten years".`,
      body: [
        r`Set up a small table: one row per person, one column per time, every age written from one unknown.

| | Now | $t$ years ago | in $t$ years |
|---|---|---|---|
| Son | $x$ | $x - t$ | $x + t$ |
| Father | $3x$ | $3x - t$ | $3x + t$ |

Two facts do most of the work. The **difference** between two people's ages never changes. And the **sum** of a group's ages grows by the number of people times the years: $n$ people, $t$ years on, add $nt$.

Statements like "A was twice as old as B when A was as old as B is now" go back by exactly the age difference: name that gap $d$ and write both ages $d$ years ago.`,
      ],
      keyIdeas: [
        r`Pick one unknown, usually the present age of the younger person.`,
        r`In $t$ years every age is $+t$; $t$ years ago every age is $-t$.`,
        r`The difference between two people's ages never changes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three times, then twice',
          problem: r`A father is 3 times as old as his son. In 12 years he will be twice as old. Find their present ages.`,
          steps: [
            r`Son $x$, father $3x$. In 12 years: $3x + 12 = 2(x + 12)$.`,
            r`$x = 12$: the son is 12 and the father 36. Check: in 12 years, 48 is twice 24.`,
          ],
          answer: r`12 and 36.`,
        },
        {
          level: 'board',
          title: '"When he was as old as you are now"',
          problem: r`Pedro is 30. He was three times as old as Juan was when Pedro was as old as Juan is now. How old is Juan?`,
          steps: [
            r`Juan is $x$ now; the gap is $d = 30 - x$. Pedro was $x$ exactly $d$ years ago.`,
            r`Then Juan was $x - d = x - (30 - x) = 2x - 30$.`,
            r`$x = 3(2x - 30)$, so $5x = 90$ and $x = 18$.`,
            r`Check: 12 years ago Pedro was 18 and Juan 6, and $18 = 3 \times 6$.`,
          ],
          answer: r`Juan is 18.`,
        },
      ],
      traps: [
        r`Move both ages by the same number of years; forgetting to add $t$ to one of them is the usual slip.`,
        r`"Was as old as B is now" fixes how far back to go: the age difference, not a number in the item.`,
      ],
      check: [
        { q: r`Four people's ages add up to 100 now. What will they add up to in 5 years?`, a: r`$100 + 4 \times 5 = 120$.` },
        { q: r`A is 10 years older than B. In 5 years A will be twice B's age. Find their ages.`, a: r`$B + 15 = 2(B + 5)$, so B is 5 and A 15.` },
      ],
    },
    {
      name: 'Mixture Problems',
      inShort: r`Combining solutions, alloys or grades of a product: the amount of the pure ingredient adds up.`,
      body: [
        r`Track the **pure ingredient**: what goes in comes out. For two solutions mixed,
$$C_1V_1 + C_2V_2 = C(V_1 + V_2).$$
Adding water or evaporating it changes the volume but not the solute: $C_1V_1 = C_2V_2$. **Draining and replacing** takes out $x$ at the old strength and puts in $x$ at the new one: $CV - Cx + C_{\text{new}}x = C_{\text{target}}V$.

The mix always lands between the two strengths, and the more of the strong one you add, the closer it gets to it:`,
        {
          type: 'plot',
          alt: 'Strength of the mixture against litres of 50 percent acid added to 30 litres of 20 percent acid, from 0 to 120 litres. It starts at 20 percent, reaches 30 percent at 15 litres, and rises toward the 50 percent line without reaching it.',
          caption: 'Adding 50% acid to 30 L of 20%: 15 L brings it to 30%; however much is added, it never reaches 50%.',
          x: [0, 120],
          y: [0, 60],
          xLabel: 'litres of 50% added',
          yLabel: 'strength, %',
          series: [{ f: mixStrength, area: true }],
          marks: [
            { at: [15, mixStrength(15)] },
            { y: 50, label: '50%' },
          ],
          legend: false,
        },
        r`**Alligation** gives the mixing ratio at a glance: $\frac{V_1}{V_2} = \frac{C_2 - C}{C - C_1}$, each amount set against the distance of the *other* strength from the target.`,
      ],
      keyIdeas: [
        r`Pure ingredient before = pure ingredient after: $C_1V_1 + C_2V_2 = C(V_1 + V_2)$.`,
        r`Adding water or evaporating keeps the solute fixed: $C_1V_1 = C_2V_2$.`,
        r`Alligation gives the mixing ratio directly: $\frac{V_1}{V_2} = \frac{C_2 - C}{C - C_1}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Strong into weak',
          problem: r`How many liters of a 50% acid solution must be added to 30 L of a 20% solution to make a 30% solution?`,
          steps: [
            r`$0.50V + 0.20(30) = 0.30(V + 30)$, so $0.50V + 6 = 0.30V + 9$.`,
            r`$0.20V = 3$, $V = 15$ L.`,
            r`Alligation agrees: $\frac{30}{V} = \frac{50 - 30}{30 - 20} = 2$, so $V = 15$.`,
          ],
          answer: r`15 L.`,
        },
        {
          level: 'board',
          title: 'Drain and replace, and evaporate',
          problem: r`(a) A 20 L radiator holds 30% antifreeze. How much must be drained and replaced with pure antifreeze to make it 45%? (b) How much water must evaporate from 40 L of 5% brine to make it 8%?`,
          steps: [
            r`(a) Antifreeze: $0.30(20) - 0.30x + 1.00x = 0.45(20)$, so $6 + 0.70x = 9$.`,
            r`$x = \frac{3}{0.70} = 4.29$ L.`,
            r`(b) Salt stays at $0.05 \times 40 = 2$ kg, so the new volume is $\frac{2}{0.08} = 25$ L: evaporate $40 - 25 = 15$ L.`,
          ],
          answer: r`(a) about 4.29 L; (b) 15 L.`,
        },
      ],
      traps: [
        r`Pure water is 0% acid; pure acid is 100%. Put those in, not 1 and 0 the wrong way round.`,
        r`What is drained leaves at the old strength, not at zero.`,
      ],
      check: [
        { q: r`Equal volumes of 20% and 60% solutions are mixed. What is the strength?`, a: r`$40\%$, their average (equal volumes only).` },
        { q: r`How much water turns 10 L of 40% into 25%?`, a: r`$\frac{0.40 \times 10}{0.25} = 16$ L in all: add 6 L.` },
      ],
    },
    {
      name: 'Motion Problems',
      inShort: r`Distance, rate and time, including two movers, boats in a current, and the hands of a clock.`,
      body: [
        r`Every motion item is $d = vt$, once per mover. Write one row each before forming an equation:

| Situation | Speed to use |
|---|---|
| moving toward each other | $v_1 + v_2$ |
| same direction (one catching up) | $v_1 - v_2$ |
| boat downstream | $b + c$ |
| boat upstream | $b - c$ |
| equal distances at $v_1$ and $v_2$ | average $\frac{2v_1v_2}{v_1 + v_2}$, the harmonic mean |

**Clock problems** are catching-up problems. The minute hand moves $6^\circ$ a minute and the hour hand $0.5^\circ$, so the minute hand gains $5.5^\circ$ a minute (equivalently, the hour hand covers $\frac{1}{12}$ of the minute hand's distance). At $H{:}M$ the angle between them is $|30H - 5.5M|$, taken as $360^\circ$ minus that when it passes $180^\circ$. After 3:00 the gap closes, then opens again:`,
        {
          type: 'plot',
          alt: 'The angle between a clock’s hands from 3:00 to 4:00. It falls from 90 degrees to 0 at about 16.4 minutes past 3, rises to 90 again at about 32.7 minutes, reaches 180 at about 49.1 minutes, and is back to 120 at 4:00.',
          caption: 'The angle between the hands after 3:00: together at 3:16.36, at right angles again at 3:32.73, in a straight line at 3:49.09.',
          x: [0, 60],
          y: [0, 200],
          xLabel: 'minutes after 3:00',
          yLabel: 'angle, degrees',
          series: [{ f: clockAngle }],
          marks: [
            { x: 180 / 11, label: 'together' },
            { y: 90, label: '90°' },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$d = vt$ for each mover; write one row per mover before forming the equation.`,
        r`Toward each other, speeds add; same direction, they subtract.`,
        r`Downstream $b + c$, upstream $b - c$.`,
        r`Equal distances at two speeds average to the harmonic mean $\frac{2v_1v_2}{v_1 + v_2}$, not $\frac{v_1 + v_2}{2}$.`,
        r`Clock: the angle at $H{:}M$ is $|30H - 5.5M|$; the minute hand gains $5.5^\circ$ per minute.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Hands together',
          problem: r`At what time after 3:00 are the hands of a clock first together?`,
          steps: [
            r`At 3:00 the hour hand is $90^\circ$ ahead.`,
            r`The minute hand gains $5.5^\circ$ a minute, so it catches up after $\frac{90}{5.5} = \frac{180}{11} = 16.36$ minutes.`,
          ],
          answer: r`At about 3:16.36.`,
        },
        {
          level: 'board',
          title: 'A boat, and a round trip',
          problem: r`(a) A boat goes 36 km downstream in 2 h and back upstream in 3 h. Find its speed in still water and the current's. (b) A car goes 120 km at 60 km/h and returns at 40 km/h. What is its average speed?`,
          steps: [
            r`(a) Downstream $b + c = \frac{36}{2} = 18$; upstream $b - c = \frac{36}{3} = 12$.`,
            r`Adding: $2b = 30$, so $b = 15$ km/h and $c = 3$ km/h.`,
            r`(b) Times: $\frac{120}{60} = 2$ h and $\frac{120}{40} = 3$ h. Average $= \frac{240}{5} = 48$ km/h, the harmonic mean $\frac{2(60)(40)}{100}$.`,
          ],
          answer: r`(a) 15 km/h and 3 km/h; (b) 48 km/h.`,
        },
      ],
      traps: [
        r`Convert units first: km/h with minutes gives nonsense.`,
        r`"Average speed" for a round trip is total distance over total time.`,
      ],
      check: [
        { q: r`What is the angle between the hands at 2:30?`, a: r`$|30(2) - 5.5(30)| = |60 - 165| = 105^\circ$.` },
        { q: r`Two cars 300 km apart drive toward each other at 70 and 80 km/h. When do they meet?`, a: r`$\frac{300}{150} = 2$ h.` },
      ],
    },
    {
      name: 'Work Problems',
      inShort: r`Jobs shared by workers, machines or pipes: rates add, times don't.`,
      body: [
        r`A worker who needs $T$ hours for a job does $\frac{1}{T}$ of it each hour. **Rates add; times don't**: together, $\frac{1}{T} = \frac{1}{t_1} + \frac{1}{t_2} + \cdots$, and a drain or a worker undoing the job subtracts its rate. Work done is rate times time, and the job is done when the fractions reach 1. When one worker starts early, the line of work done bends where the second joins:`,
        {
          type: 'plot',
          alt: 'Fraction of a job done against hours. A, alone at one sixth of the job an hour, has done one third after 2 hours; B then joins and together they finish at 3 and one third hours. A alone, dashed, would finish at 6 hours.',
          caption: 'A (6 h alone) works 2 h, then B (3 h alone) joins: the job is done at 3⅓ h. Alone, A would take 6 h (dashed).',
          x: [0, 6],
          y: [0, 1.2],
          xLabel: 'hours',
          yLabel: 'job done',
          series: [
            { points: [[0, 0], [2, 1 / 3], [10 / 3, 1]], label: 'A, then A and B', colour: colourOf(0) },
            { points: [[0, 0], [6, 1]], label: 'A alone', dashed: true, colour: colourOf(1) },
          ],
        },
        r`Crews of equal workers trade people for days: worker-days stay the same, $n_1d_1 = n_2d_2$.`,
      ],
      keyIdeas: [
        r`A worker who needs $T$ hours does $\frac{1}{T}$ of the job each hour.`,
        r`Together: $\frac{1}{T} = \frac{1}{t_1} + \frac{1}{t_2} + \cdots$; a drain subtracts its rate.`,
        r`Equal workers: $n_1d_1 = n_2d_2$ (worker-days stay the same).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One starts early',
          problem: r`A can finish a job in 6 h and B in 3 h. A works alone for 2 h, then B joins. How long do they work together?`,
          steps: [
            r`A does $\frac{2}{6} = \frac13$ alone, leaving $\frac23$.`,
            r`Together they do $\frac16 + \frac13 = \frac12$ per hour.`,
            r`$\frac{2/3}{1/2} = \frac43$ h.`,
          ],
          answer: r`$\frac43$ h, which is 1 h 20 min.`,
        },
        {
          level: 'board',
          title: 'Pipes and a drain; two unknown times',
          problem: r`(a) Two pipes fill a tank in 20 and 30 minutes; a drain empties it in 60. With all three open, how long to fill it? (b) A and B together paint a house in 4 days; A alone needs 6 days less than B. How long does each need alone?`,
          steps: [
            r`(a) $\frac{1}{20} + \frac{1}{30} - \frac{1}{60} = \frac{3 + 2 - 1}{60} = \frac{4}{60}$, so 15 minutes.`,
            r`(b) $\frac{1}{a} + \frac{1}{a + 6} = \frac14$, so $4(2a + 6) = a(a + 6)$ and $a^2 - 2a - 24 = 0$.`,
            r`$a = 6$ (the root $-4$ is meaningless): A needs 6 days and B 12. Check: $\frac16 + \frac{1}{12} = \frac14$.`,
          ],
          answer: r`(a) 15 min; (b) A 6 days, B 12 days.`,
        },
      ],
      traps: [
        r`Never add times; add rates. "6 h and 3 h together" is 2 h, not 4.5 h.`,
        r`A drain's rate is subtracted, even when it is "opened at the same time".`,
      ],
      check: [
        { q: r`8 workers finish a job in 15 days. How long would 12 take?`, a: r`$\frac{8 \times 15}{12} = 10$ days.` },
        { q: r`Pipes fill a tank in 20, 30 and 40 minutes. How long with all three?`, a: r`$\frac{1}{20} + \frac{1}{30} + \frac{1}{40} = \frac{13}{120}$, so about 9.23 minutes.` },
      ],
    },
    {
      name: 'Money-Related Problems',
      inShort: r`Coins, prices, profit, discounts and simple or compound interest.`,
      body: [
        r`| Kind | Rule |
|---|---|
| coins | value $=$ number $\times$ face value, summed over kinds |
| profit | percent of the cost, unless the item says of the selling price |
| discount | off the marked price; successive discounts multiply: 20% then 10% off leaves $0.8 \times 0.9 = 0.72$ |
| simple interest | $I = Prt$, $F = P(1 + rt)$ |
| compound interest | $F = P(1 + i)^n$, with $i$ the rate and $n$ the number of periods |

Simple interest grows in a straight line; compound interest earns interest on its interest, so it pulls ahead more each year:`,
        {
          type: 'plot',
          alt: 'Value of 10 thousand pesos over 10 years at 10 percent a year. Simple interest, dashed, rises in a straight line to 20 thousand. Compound interest curves upward to about 25,937.',
          caption: '₱10,000 at 10% a year: simple interest reaches ₱20,000 in 10 years; compounded yearly, ₱25,937.',
          x: [0, 10],
          y: [0, 30000],
          xLabel: 'years',
          yLabel: 'pesos',
          series: [
            { f: (t) => 10000 * 1.1 ** t, label: 'compound', colour: colourOf(0) },
            { f: (t) => 10000 * (1 + 0.1 * t), label: 'simple', dashed: true, colour: colourOf(1) },
          ],
        },
        r`A nominal rate compounded $m$ times a year is $\frac{r}{m}$ per period; its **effective** annual rate is $\left(1 + \frac{r}{m}\right)^m - 1$. Engineering Economics takes interest further.`,
      ],
      keyIdeas: [
        r`Value of coins $=$ number $\times$ face value, summed over kinds.`,
        r`Simple interest $I = Prt$; compound $F = P(1 + i)^n$ with $i$ and $n$ per period.`,
        r`Profit percent is on the cost unless the item says on the selling price.`,
        r`Successive discounts multiply: 20% then 10% off leaves $0.8 \times 0.9 = 0.72$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Discount and profit',
          problem: r`A book costing ₱200 is sold at a 20% discount and still makes a 30% profit. What was the marked price?`,
          steps: [
            r`Selling price $= 200 \times 1.30 = 260$ pesos.`,
            r`$0.80M = 260$, so $M = 325$ pesos: a markup of 62.5% on the cost.`,
          ],
          answer: r`₱325.`,
        },
        {
          level: 'board',
          title: 'Monthly compounding',
          problem: r`₱50,000 is deposited at 12% a year for 3 years. Find the amount with simple interest and compounded monthly, and the effective rate.`,
          steps: [
            r`Simple: $50\,000(1 + 0.12 \times 3) = 68\,000$ pesos.`,
            r`Monthly: $i = 1\%$, $n = 36$: $50\,000(1.01)^{36} = 71\,538.44$ pesos, ₱3,538.44 more.`,
            r`Effective rate: $1.01^{12} - 1 = 12.68\%$.`,
          ],
          answer: r`₱68,000; ₱71,538.44; 12.68%.`,
        },
      ],
      traps: [
        r`Two discounts of 20% and 10% are not 30% off.`,
        r`Match the rate to the period: 12% a year compounded monthly is 1% a month.`,
      ],
      check: [
        { q: r`What single discount equals 25% then 20% off?`, a: r`$1 - 0.75 \times 0.80 = 40\%$.` },
        { q: r`30 coins of ₱5 and ₱10 are worth ₱200. How many of each?`, a: r`$5x + 10(30 - x) = 200$: 20 five-peso and 10 ten-peso coins.` },
      ],
    },
    {
      name: 'Arithmetic Progression',
      inShort: r`Sequences with a constant difference, their terms, their sums, and the sums of whole numbers, squares and cubes.`,
      body: [
        r`An **arithmetic progression** (AP) adds the same **common difference** $d$ each step: $d = a_n - a_{n-1}$. Any term follows from the first, or from any other:
$$a_n = a_1 + (n - 1)d = a_x + (n - x)d.$$
The **sum** of $n$ terms is the number of terms times the average of the first and last:
$$S_n = \frac{n}{2}(a_1 + a_n) = \frac{n}{2}\left[2a_1 + (n - 1)d\right].$$

To insert $k$ **arithmetic means** between $a$ and $b$, there are $k + 1$ steps: $d = \frac{b - a}{k + 1}$. The arithmetic mean of a set is its sum over its count.

| Sum | Value |
|---|---|
| $1 + 2 + \cdots + n$ | $\frac{n(n+1)}{2}$ |
| $1^2 + 2^2 + \cdots + n^2$ | $\frac{n(n+1)(2n+1)}{6}$ |
| $1^3 + 2^3 + \cdots + n^3$ | $\left[\frac{n(n+1)}{2}\right]^2$ |
| $1 + 3 + 5 + \cdots$ ($n$ odd numbers) | $n^2$ |`,
      ],
      keyIdeas: [
        r`$a_n = a_1 + (n - 1)d$ and $n = \frac{a_n - a_1}{d} + 1$.`,
        r`$S_n = \frac{n}{2}(a_1 + a_n) = \frac{n}{2}\left[2a_1 + (n-1)d\right]$.`,
        r`$k$ means between $a$ and $b$: $d = \frac{b - a}{k + 1}$.`,
        r`$\sum k = \frac{n(n+1)}{2}$, $\sum k^2 = \frac{n(n+1)(2n+1)}{6}$, $\sum k^3 = \left[\frac{n(n+1)}{2}\right]^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Multiples of 7',
          problem: r`Find the sum of all multiples of 7 between 1 and 400.`,
          steps: [
            r`They run $7, 14, \ldots, 399$, so $n = \frac{399 - 7}{7} + 1 = 57$.`,
            r`$S = \frac{57}{2}(7 + 399) = 57 \times 203 = 11\,571$.`,
          ],
          answer: r`$11\,571$.`,
        },
        {
          level: 'board',
          title: 'Means, and a sum from two terms',
          problem: r`(a) Insert 4 arithmetic means between 7 and 32. (b) The 4th term of an AP is 18 and the 10th is 42. Find the sum of the first 20 terms.`,
          steps: [
            r`(a) $d = \frac{32 - 7}{5} = 5$: the means are 12, 17, 22 and 27.`,
            r`(b) Six steps from the 4th to the 10th: $d = \frac{42 - 18}{6} = 4$, and $a_1 = 18 - 3(4) = 6$.`,
            r`$S_{20} = \frac{20}{2}\left[2(6) + 19(4)\right] = 10 \times 88 = 880$.`,
          ],
          answer: r`(a) 12, 17, 22, 27; (b) 880.`,
        },
      ],
      traps: [
        r`Counting terms: from 7 to 399 in steps of 7 is $\frac{392}{7} + 1$ terms; the $+1$ is often forgotten.`,
        r`Between the 4th and the 10th term there are 6 steps, not 7.`,
      ],
      check: [
        { q: r`Find $1 + 2 + \cdots + 100$.`, a: r`$\frac{100 \times 101}{2} = 5050$.` },
        { q: r`Find $1^2 + 2^2 + \cdots + 10^2$.`, a: r`$\frac{10 \times 11 \times 21}{6} = 385$.` },
      ],
    },
    {
      name: 'Geometric Progression',
      inShort: r`Sequences with a constant ratio, finite and infinite sums, the three means, and harmonic progressions.`,
      body: [
        r`A **geometric progression** (GP) multiplies by the same **common ratio** $r = \frac{a_n}{a_{n-1}}$ each step: $a_n = a_1r^{n-1} = a_xr^{n-x}$. The sum of $n$ terms is $S_n = a_1\frac{1 - r^n}{1 - r}$, and when $|r| < 1$ the terms shrink fast enough for the infinite sum to settle: $S_\infty = \frac{a_1}{1 - r}$.

A ball rebounding to $\frac34$ of its height adds less each bounce, and its total distance settles at a limit:`,
        {
          type: 'plot',
          alt: 'Total distance travelled by a ball dropped from 10 metres that rebounds to three quarters of its height, against the number of bounces from 0 to 10. It starts at 10 metres and climbs toward a dashed limit at 70 metres.',
          caption: 'A ball dropped from 10 m, rebounding to ¾ of its height: the total distance climbs toward 70 m, the infinite sum.',
          x: [0, 10],
          y: [0, 80],
          xLabel: 'bounces',
          yLabel: 'total distance, m',
          series: [{ points: range(0, 10, 10).map((n) => [n, bounceDistance(n)]) }],
          marks: [{ y: 70, label: 'limit 70 m' }],
          legend: false,
        },
        r`A **harmonic progression** (HP) is one whose reciprocals form an AP: solve it by flipping to the AP and back. For two positive numbers the three means are
$$AM = \frac{a + b}{2}, \quad GM = \sqrt{ab}, \quad HM = \frac{2ab}{a + b},$$
always in the order $AM \ge GM \ge HM$, with $GM^2 = AM \cdot HM$. For $n$ numbers, $GM = \sqrt[n]{a_1a_2\cdots a_n}$ and $HM = \frac{n}{\sum 1/a_i}$.`,
      ],
      keyIdeas: [
        r`$a_n = a_1r^{n-1}$; $S_n = a_1\frac{1 - r^n}{1 - r}$ for $r \ne 1$.`,
        r`An infinite series converges only for $|r| < 1$: $S_\infty = \frac{a_1}{1 - r}$.`,
        r`$k$ geometric means between $a$ and $b$: $r = \left(\frac{b}{a}\right)^{1/(k+1)}$.`,
        r`For two positive numbers, $AM \ge GM \ge HM$ and $GM^2 = AM \cdot HM$.`,
        r`A harmonic progression is one whose reciprocals form an arithmetic progression.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The bouncing ball',
          problem: r`A ball dropped from 10 m rebounds to $\frac{3}{4}$ of its height each time. Find the total distance it travels.`,
          steps: [
            r`Down 10, then up and down $2 \times 7.5$, $2 \times 5.625$, and so on.`,
            r`The bounces sum to $2 \times \frac{7.5}{1 - 0.75} = 60$.`,
            r`Total $= 10 + 60 = 70$ m.`,
          ],
          answer: r`70 m.`,
        },
        {
          level: 'board',
          title: 'A GP from two terms, and the three means',
          problem: r`(a) The 3rd term of a GP is 12 and the 6th is 96. Find $r$, $a_1$ and the sum of the first 8 terms. (b) Find the AM, GM and HM of 3 and 6.`,
          steps: [
            r`(a) Three steps: $r^3 = \frac{96}{12} = 8$, so $r = 2$ and $a_1 = \frac{12}{4} = 3$.`,
            r`$S_8 = 3 \times \frac{2^8 - 1}{2 - 1} = 765$.`,
            r`(b) $AM = 4.5$, $GM = \sqrt{18} = 4.243$, $HM = \frac{2(3)(6)}{9} = 4$. Check: $4.5 \times 4 = 18 = GM^2$.`,
          ],
          answer: r`(a) $r = 2$, $a_1 = 3$, $S_8 = 765$; (b) 4.5, 4.243, 4.`,
        },
      ],
      traps: [
        r`The bouncing ball's first drop is counted once; every rebound twice.`,
        r`$S_\infty$ with $|r| \ge 1$ does not exist: a choice of a number there is a distractor.`,
      ],
      check: [
        { q: r`Write $0.333\ldots$ as a GP sum.`, a: r`$\frac{0.3}{1 - 0.1} = \frac13$.` },
        { q: r`Find $1 + \frac12 + \frac14 + \cdots$.`, a: r`$\frac{1}{1 - 1/2} = 2$.` },
      ],
    },
    {
      name: 'Diophantine Equation',
      inShort: r`Equations that need whole-number answers, mostly $ax + by = c$.`,
      body: [
        r`A **Diophantine** equation wants whole-number answers: counts of coins, items, people. For $ax + by = c$:

**Is there any?** Only if $g = \gcd(a, b)$ divides $c$. $6x + 9y = 20$ has none: 3 divides the left side but not 20.

**Find one.** Try values of the variable with the larger coefficient, or work in remainders: $by \equiv c \pmod a$.

**Find them all.** From one solution $(x_0, y_0)$: $x = x_0 + \frac{b}{g}t$, $y = y_0 - \frac{a}{g}t$ for any integer $t$ (or the signs swapped).

**Count.** Keep the $t$ that make both $x$ and $y$ meet the item's condition: positive, or "at least one", or "any number" (zero allowed).`,
      ],
      keyIdeas: [
        r`$ax + by = c$ has integer solutions only when $\gcd(a, b)$ divides $c$.`,
        r`From one solution $(x_0, y_0)$: $x = x_0 + \frac{b}{g}t$, $y = y_0 - \frac{a}{g}t$, $t$ any integer.`,
        r`"How many positive solutions" means: find the range of $t$ keeping both $x$ and $y$ positive.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Paying with two coins',
          problem: r`In how many ways can ₱100 be paid with ₱5 and ₱10 coins, using at least one of each?`,
          steps: [
            r`$5x + 10y = 100$, so $x + 2y = 20$ and $x = 20 - 2y$.`,
            r`With $x \ge 1$ and $y \ge 1$: $y = 1, \ldots, 9$.`,
          ],
          answer: r`9 ways.`,
        },
        {
          level: 'board',
          title: 'Pens and notebooks',
          problem: r`Exactly ₱500 is spent on pens at ₱17 and notebooks at ₱23, at least one of each. How many of each could be bought?`,
          steps: [
            r`$17x + 23y = 500$; $\gcd(17, 23) = 1$, so solutions exist.`,
            r`Try $y$: $y = 4$ gives $500 - 92 = 408 = 17 \times 24$, so $(x, y) = (24, 4)$.`,
            r`All solutions: $x = 24 - 23t$, $y = 4 + 17t$. Both positive only for $t = 0$ and $t = 1$: $(24, 4)$ and $(1, 21)$.`,
          ],
          answer: r`Two ways: 24 pens and 4 notebooks, or 1 pen and 21 notebooks.`,
        },
      ],
      traps: [
        r`"At least one of each" removes the end cases; "any number" keeps $0$.`,
        r`The step in $x$ is $\frac{b}{g}$, the other equation's coefficient: the steps cross over.`,
      ],
      check: [
        { q: r`Does $6x + 9y = 20$ have whole-number solutions?`, a: r`No: $\gcd(6, 9) = 3$ does not divide 20.` },
        { q: r`How many positive solutions has $3x + 5y = 30$?`, a: r`One, $(5, 3)$: $y$ must be a multiple of 3, and $y = 6$ gives $x = 0$.` },
      ],
    },
    {
      name: 'Venn Diagram',
      inShort: r`Counting the members of overlapping groups by inclusion-exclusion.`,
      body: [
        r`Overlapping groups are counted by **inclusion and exclusion**: add the groups, take away what was counted twice, put back what was taken away too often.
$$n(A \cup B) = n(A) + n(B) - n(A \cap B)$$
$$n(A \cup B \cup C) = n(A) + n(B) + n(C) - n(A \cap B) - n(A \cap C) - n(B \cap C) + n(A \cap B \cap C)$$

To fill a diagram, start at the **centre** and work out:

| Region (three sets) | Count |
|---|---|
| all three | $n(A \cap B \cap C)$ |
| A and B only | $n(A \cap B) - n(A \cap B \cap C)$ |
| A only | $n(A) - n(A \cap B) - n(A \cap C) + n(A \cap B \cap C)$ |
| none | total $- n(A \cup B \cup C)$ |

A set of $n$ elements has $2^n$ subsets, including the empty set and itself.`,
      ],
      keyIdeas: [
        r`$n(A \cup B) = n(A) + n(B) - n(A \cap B)$.`,
        r`For three sets add the pairwise overlaps back in reverse and the triple overlap once: inclusion-exclusion.`,
        r`Fill a Venn diagram from the centre (all three) outward.`,
        r`A set of $n$ elements has $2^n$ subsets.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two subjects',
          problem: r`Of 50 students, 30 take Physics, 25 take Chemistry and 10 take both. How many take neither?`,
          steps: [
            r`$n(P \cup C) = 30 + 25 - 10 = 45$.`,
            r`Neither: $50 - 45 = 5$.`,
          ],
          answer: r`5.`,
        },
        {
          level: 'board',
          title: 'Three subjects',
          problem: r`Of 100 reviewees, 45 study Math, 50 EE and 40 ESAS; 20 study Math and EE, 15 Math and ESAS, 18 EE and ESAS, and 8 all three. How many study none, and how many EE only?`,
          steps: [
            r`$n(\text{any}) = 45 + 50 + 40 - 20 - 15 - 18 + 8 = 90$, so none: $100 - 90 = 10$.`,
            r`EE only: $50 - 20 - 18 + 8 = 20$.`,
          ],
          answer: r`10 study none; 20 study EE only.`,
        },
      ],
      traps: [
        r`"Only Physics" is $30 - 10 = 20$, not 30.`,
        r`For "only one" of three, the triple overlap was subtracted twice: add it back once.`,
      ],
      check: [
        { q: r`In a class of 40, 27 like Calculus and 25 like Chemistry, and everyone likes at least one. How many like both?`, a: r`$27 + 25 - 40 = 12$.` },
        { q: r`How many subsets has a set of 5 elements?`, a: r`$2^5 = 32$.` },
      ],
    },
    {
      name: 'Miscellaneous Problems',
      inShort: r`Items that don't fit a family: levers and balances, clock and calendar puzzles, special constants, and logic.`,
      body: [
        r`The rest share one method: translate one sentence at a time, naming every unknown before writing an equation, then check the units and whether the answer must be a whole number.

Two tools turn up often. The **lowest common multiple** (LCM) of whole numbers is the smallest number all of them divide: the product of every prime factor that appears, each to its **highest** power. It answers "when do they coincide again" (bells, gears, schedules). The **highest common factor** (HCF, or GCD) is the largest number dividing all of them: the common prime factors, each to its **lowest** power. It answers "the largest equal pieces". For two numbers, $\text{LCM} \times \text{HCF} = $ their product.

Constants worth knowing: $\pi \approx 3.14159$, $e \approx 2.71828$, the golden ratio $\varphi = \frac{1 + \sqrt5}{2} \approx 1.61803$.`,
      ],
      keyIdeas: [
        r`Translate one sentence at a time, naming every unknown before writing an equation.`,
        r`Check units and whether the answer must be a whole number.`,
        r`Know the constants: $e \approx 2.71828$, $\varphi = \frac{1 + \sqrt5}{2} \approx 1.61803$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A lever',
          problem: r`A 2 m lever has its fulcrum 0.5 m from one end. What force at the long end balances 300 N at the short end?`,
          steps: [
            r`The long arm is $2 - 0.5 = 1.5$ m.`,
            r`Moments balance: $300 \times 0.5 = F \times 1.5$, so $F = 100$ N.`,
          ],
          answer: r`100 N.`,
        },
        {
          level: 'board',
          title: 'Bells ringing together',
          problem: r`Three alarms sound every 36, 84 and 120 seconds, starting together. When do they next sound together? What is the HCF of the three intervals?`,
          steps: [
            r`$36 = 2^2 \cdot 3^2$, $84 = 2^2 \cdot 3 \cdot 7$, $120 = 2^3 \cdot 3 \cdot 5$.`,
            r`LCM: highest powers, $2^3 \cdot 3^2 \cdot 5 \cdot 7 = 2520$ s, which is 42 minutes.`,
            r`HCF: lowest common powers, $2^2 \cdot 3 = 12$ s.`,
          ],
          answer: r`After 2520 s (42 min); HCF 12.`,
        },
      ],
      traps: [
        r`Distances are measured from the fulcrum, not from the end.`,
        r`LCM takes the highest power of each prime; HCF the lowest power of the common ones.`,
      ],
      check: [
        { q: r`Two numbers have HCF 6 and LCM 72; one is 18. What is the other?`, a: r`$\frac{6 \times 72}{18} = 24$.` },
        { q: r`What is the golden ratio to five decimals?`, a: r`$1.61803$.` },
      ],
    },
  ],
};
