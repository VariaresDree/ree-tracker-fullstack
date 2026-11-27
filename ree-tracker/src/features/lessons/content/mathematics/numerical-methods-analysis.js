// Library › Lessons › Mathematics › Numerical Methods & Analysis (2026-11-17;
// every subtopic in the module format 2026-11-27, with figures, examples a step
// at a time and checks; every number re-worked by
// numericalMethodsLesson.test.js. Coverage cross-checked against a review
// center's numerical methods handout; the text, problems and figures are this
// app's own): written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

export const cubic = (x) => x ** 3 - x - 2;
const dCubic = (x) => 3 * x * x - 1;
// The tangent to the cubic at x0, as a line.
const tangentAt = (x0) => (x) => cubic(x0) + dCubic(x0) * (x - x0);

// Jacobi and Gauss-Seidel on 10x − y + 2z = 14, −x + 11y − z = 18, 2x − y + 10z = 30 from zero.
export const sweeps = (seidel, k) => {
  let [x, y, z] = [0, 0, 0];
  const out = [[x, y, z]];
  for (let i = 0; i < k; i++) {
    const nx = (14 + y - 2 * z) / 10;
    const ny = (18 + (seidel ? nx : x) + z) / 11;
    const nz = (30 - 2 * (seidel ? nx : x) + (seidel ? ny : y)) / 10;
    [x, y, z] = [nx, ny, nz];
    out.push([x, y, z]);
  }
  return out;
};

// The Newton form through (1, 1), (2, 8), (4, 64).
export const newtonP = (x) => 1 + 7 * (x - 1) + 7 * (x - 1) * (x - 2);
// The Lagrange basis on the nodes 0, 1, 3.
export const basis = [
  (x) => ((x - 1) * (x - 3)) / ((0 - 1) * (0 - 3)),
  (x) => ((x - 0) * (x - 3)) / ((1 - 0) * (1 - 3)),
  (x) => ((x - 0) * (x - 1)) / ((3 - 0) * (3 - 1)),
];
export const FIT = [[1, 2], [2, 3], [3, 5], [4, 6]];

export default {
  topic: 'Numerical Methods & Analysis',
  subject: 'Mathematics',
  overview: r`When an equation has no neat closed form, numerical methods get a number to the accuracy you need: roots by bracketing or by tangents, linear systems by elimination or iteration, functions from a table by interpolation or curve fitting, and derivatives, integrals and differential equations step by step. On the board, the questions are usually one or two iterations by calculator, so know each update formula cold, keep enough digits, and know which methods are sure to converge and how fast.`,
  sources: [
    'Numerical Methods for Engineers (Chapra and Canale)',
    'Numerical Analysis (Burden and Faires)',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Errors and Approximation',
      inShort: r`How far an answer is from the truth, and when to stop iterating.`,
      body: [
        r`Every numerical answer carries some error. Measure it against the truth when the truth is known, and against the previous iterate when it is not:

| Quantity | Formula |
|---|---|
| true error | $E_t = x_{true} - x_{approx}$ |
| true relative error | $\varepsilon_t = \frac{|E_t|}{|x_{true}|} \times 100\%$ |
| approximate relative error | $\varepsilon_a = \left|\frac{x_{new} - x_{old}}{x_{new}}\right| \times 100\%$ |
| stopping tolerance for $n$ significant figures | $\varepsilon_s = (0.5 \times 10^{2-n})\%$: stop when $\varepsilon_a < \varepsilon_s$ |
| condition number | $\left|\frac{x\,f'(x)}{f(x)}\right|$: above 1, input errors grow |

Errors come from two sources. **Round-off** comes from storing a limited number of digits; it is worst when nearly equal numbers are subtracted. **Truncation** comes from cutting a series short or taking a finite step instead of a limit. Shrinking the step cuts truncation but, past a point, lets round-off take over.`,
      ],
      keyIdeas: [
        r`True error $E_t = x_{\text{true}} - x_{\text{approx}}$; true relative error $\varepsilon_t = \frac{|E_t|}{|x_{\text{true}}|}\times100\%$.`,
        r`In an iteration the truth is unknown: use $\varepsilon_a = \left|\frac{x_{\text{new}} - x_{\text{old}}}{x_{\text{new}}}\right|\times100\%$ and stop when $\varepsilon_a < \varepsilon_s = (0.5\times10^{2-n})\%$ for $n$ significant figures.`,
        r`Round-off comes from storing digits, truncation from cutting a series or a step. A condition number $\left|\frac{x f'(x)}{f(x)}\right|$ above 1 magnifies input errors.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An old value of π',
          problem: r`$\frac{22}{7}$ is used for $\pi$. Find the true error and the true relative error, and the tolerance for 3 significant figures.`,
          steps: [
            r`$E_t = 3.141593 - 3.142857 = -0.001264$, so $\varepsilon_t = \frac{0.001264}{3.141593}\times100\% = 0.0402\%$.`,
            r`For 3 figures, $\varepsilon_s = 0.5\times10^{-1}\% = 0.05\%$: $\frac{22}{7}$ is good to 3 figures.`,
          ],
          answer: r`$-0.001264$; 0.0402%; 0.05%.`,
        },
        {
          level: 'board',
          title: 'A series, a tolerance, a condition number',
          problem: r`(a) The Maclaurin series for $e^{0.5}$ gives 1, 1.5, 1.625, 1.645833 after one to four terms. Find $\varepsilon_a$ after four terms, and $\varepsilon_t$ against $e^{0.5} = 1.648721$. (b) What tolerance guarantees 4 significant figures? (c) Find the condition number of $\tan x$ at $x = 1.5$.`,
          steps: [
            r`(a) $\varepsilon_a = \frac{1.645833 - 1.625}{1.645833} \times 100\% = 1.266\%$; $\varepsilon_t = \frac{1.648721 - 1.645833}{1.648721} \times 100\% = 0.175\%$.`,
            r`(b) $0.5 \times 10^{-2}\% = 0.005\%$.`,
            r`(c) $\frac{x\sec^2x}{\tan x} = \frac{x}{\sin x\cos x} = \frac{2x}{\sin2x} = \frac{3}{\sin3} = 21.26$: ill-conditioned, since an input error grows about twenty-one times.`,
          ],
          answer: r`(a) 1.266% and 0.175%; (b) 0.005%; (c) about 21.26.`,
        },
      ],
      traps: [
        r`The approximate error divides by the NEW value, not the old one.`,
        r`$\varepsilon_a$ usually overstates the true error of a converging method: it is a safe stopping test, not the error itself.`,
      ],
      check: [
        { q: r`What tolerance gives 2 significant figures?`, a: r`$0.5 \times 10^0\% = 0.5\%$.` },
        { q: r`Successive iterates are 0.5671 and 0.5664. What is $\varepsilon_a$?`, a: r`$\frac{0.0007}{0.5664} \times 100\% = 0.124\%$.` },
      ],
    },
    {
      name: 'Bisection and False Position',
      inShort: r`Bracketing methods: start with a sign change and close in on the root.`,
      body: [
        r`If a continuous $f$ changes sign between $a$ and $b$, a root lies between them. **Bracketing methods** shrink that interval while keeping the sign change, so they always converge. Plotting the function first (the **graphical method**) gives a rough bracket to start from.

**Bisection** tries the midpoint $c = \frac{a + b}{2}$ and keeps the half where the sign still changes. After $n$ steps the root is within $\frac{b - a}{2^n}$, so the steps needed for an error $\varepsilon$ are $n \ge \frac{\ln[(b - a)/\varepsilon]}{\ln2}$.

**False position** (regula falsi) uses where the chord between the end points crosses the axis instead:
$$c = \frac{a\,f(b) - b\,f(a)}{f(b) - f(a)}.$$`,
        {
          type: 'plot',
          alt: 'The curve y equals x cubed minus x minus 2 from 1 to 2, rising from minus 2 to 4 and crossing zero at 1.5214. A dashed chord joins its end points and crosses the axis at 1.3333, the false-position estimate; a dashed vertical guide marks the bisection midpoint 1.5.',
          caption: 'f(x) = x³ − x − 2 on [1, 2]: the chord (dashed) crosses at 1.3333, false position; the midpoint 1.5 (marked) is bisection. The root is 1.5214.',
          x: [0.9, 2.1],
          y: [-3, 5],
          xLabel: 'x',
          yLabel: 'f(x)',
          series: [
            { f: cubic, colour: colourOf(0) },
            { points: [[1, -2], [2, 4]], dashed: true, colour: colourOf(1) },
          ],
          marks: [{ x: 1.5 }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Both need $f(a)f(b) < 0$, and both always converge.`,
        r`Bisection: $c = \frac{a + b}{2}$; after $n$ steps the error is at most $\frac{b - a}{2^n}$, so $n \ge \frac{\ln[(b - a)/\varepsilon]}{\ln 2}$.`,
        r`False position: $c = \frac{a f(b) - b f(a)}{f(b) - f(a)}$, where the chord crosses the axis. Keep the half with the sign change.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three halvings and a chord',
          problem: r`$f(x) = x^3 - x - 2$ on $[1, 2]$. Do three bisection steps and one false-position step. How many bisections give an error under $0.001$?`,
          steps: [
            r`$f(1) = -2$, $f(2) = 4$. $f(1.5) = -0.125$ → $[1.5, 2]$; $f(1.75) = 1.609$ → $[1.5, 1.75]$; $f(1.625) = 0.666$ → $[1.5, 1.625]$.`,
            r`False position: $c = \frac{1(4) - 2(-2)}{4 - (-2)} = 1.3333$. Steps: $n \ge \frac{\ln 1000}{\ln 2} = 9.97$, so 10. (The root is 1.5214.)`,
          ],
          answer: r`$[1.5, 1.625]$; 1.3333; 10 steps.`,
        },
        {
          level: 'board',
          title: 'The cube root of 10',
          problem: r`Find $\sqrt[3]{10}$ as the root of $f(x) = x^3 - 10$ on $[2, 3]$. (a) Do three bisection steps and give $\varepsilon_a$ after the third. (b) Do one false-position step. (c) How many bisections guarantee an error under $0.0001$?`,
          steps: [
            r`(a) $f(2) = -2$, $f(3) = 17$. $f(2.5) = 5.625$ → $[2, 2.5]$; $f(2.25) = 1.3906$ → $[2, 2.25]$; $f(2.125) = -0.4043$ → $[2.125, 2.25]$. $\varepsilon_a = \frac{|2.125 - 2.25|}{2.125} \times 100\% = 5.88\%$.`,
            r`(b) $c = \frac{2(17) - 3(-2)}{17 + 2} = \frac{40}{19} = 2.1053$.`,
            r`(c) $\frac{\ln10\,000}{\ln2} = 13.29$: 14 steps. (The root is 2.1544.)`,
          ],
          answer: r`(a) $[2.125, 2.25]$, 5.88%; (b) 2.1053; (c) 14.`,
        },
      ],
      traps: [
        r`Round the number of steps UP; 9.97 means 10.`,
        r`False position can creep: one end may stay fixed for many steps while the other inches in.`,
      ],
      check: [
        { q: r`What does bisection need to start?`, a: r`An interval where $f$ changes sign.` },
        { q: r`How many bisections shrink an interval of 4 below 0.01?`, a: r`$\frac{\ln400}{\ln2} = 8.6$: 9.` },
      ],
    },
    {
      name: 'Newton-Raphson and Secant',
      inShort: r`Open methods: follow the tangent (or a secant) to the axis. Fast, but not guaranteed.`,
      body: [
        r`**Open methods** need no bracket, only a start, and converge much faster when they converge at all. **Newton-Raphson** follows the tangent at the current guess down to the axis:
$$x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}.$$
Near a simple root the number of correct digits roughly doubles each step (quadratic convergence):`,
        {
          type: 'plot',
          alt: 'The curve y equals x cubed minus x minus 2 with two dashed tangent lines. The tangent at x equals 1 meets the axis at 2; the tangent at 2 meets the axis at 1.6364, closer to the root 1.5214.',
          caption: 'Newton on x³ − x − 2 from x₀ = 1: the tangent (dashed) lands at x₁ = 2, the next at x₂ = 1.6364, closing on the root 1.5214.',
          x: [0.8, 2.2],
          y: [-3, 6],
          xLabel: 'x',
          yLabel: 'f(x)',
          series: [
            { f: cubic, colour: colourOf(0) },
            { f: tangentAt(1), dashed: true, colour: colourOf(1) },
            { f: tangentAt(2), dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`| Method | Update | Order |
|---|---|---|
| Newton-Raphson | $x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}$ | 2 |
| secant | $x_{n+1} = x_n - f(x_n)\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}$ (no derivative) | 1.618 |
| fixed point | rewrite as $x = g(x)$, iterate $x_{n+1} = g(x_n)$; converges if $|g'| < 1$ near the root | 1 |
| square root of $N$ | $x_{n+1} = \frac12\left(x_n + \frac{N}{x_n}\right)$ (Newton on $x^2 - N$) | 2 |`,
      ],
      keyIdeas: [
        r`Newton: $x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}$; quadratic convergence, the correct digits roughly double each step.`,
        r`Secant: $x_{n+1} = x_n - f(x_n)\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}$; no derivative, order 1.618.`,
        r`Fixed point: $x_{n+1} = g(x_n)$ converges when $|g'(x)| < 1$ near the root. For $\sqrt N$: $x_{n+1} = \frac12\left(x_n + \frac{N}{x_n}\right)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two Newton steps',
          problem: r`Two Newton steps on $x^3 - x - 2 = 0$ from $x_0 = 1.5$.`,
          steps: [
            r`$f'(x) = 3x^2 - 1$. $x_1 = 1.5 - \frac{-0.125}{5.75} = 1.521739$.`,
            r`$x_2 = 1.521739 - \frac{0.002137}{5.947070} = 1.521380$, already correct to six figures.`,
          ],
          answer: r`1.521380.`,
        },
        {
          level: 'board',
          title: 'A square root, the secant, a fixed point',
          problem: r`(a) Find $\sqrt{20}$ with two Newton steps from 4. (b) Do two secant steps on $x^3 - x - 2$ from $x_0 = 1$, $x_1 = 2$. (c) Iterate $x = \sqrt[3]{x + 2}$ three times from 1.5, and say why it converges.`,
          steps: [
            r`(a) $x_1 = \frac12\left(4 + \frac{20}{4}\right) = 4.5$; $x_2 = \frac12\left(4.5 + \frac{20}{4.5}\right) = 4.47222$ (true 4.472136).`,
            r`(b) $x_2 = 2 - 4\cdot\frac{2 - 1}{4 + 2} = 1.33333$; $f(x_2) = -0.96296$, so $x_3 = 1.33333 - (-0.96296)\frac{1.33333 - 2}{-0.96296 - 4} = 1.46269$.`,
            r`(c) 1.5183, 1.5209, 1.5213. Here $g'(x) = \frac{1}{3(x + 2)^{2/3}} \approx 0.144 < 1$ near the root, so each step shrinks the error about sevenfold.`,
          ],
          answer: r`(a) 4.47222; (b) 1.46269; (c) 1.5213.`,
        },
      ],
      traps: [
        r`Newton fails where $f'(x)$ is near zero; a flat start can throw the next guess far away.`,
        r`The secant method uses the two LATEST points, not the bracket: it can leave the interval.`,
      ],
      check: [
        { q: r`Newton on $x^2 - 7$ from 3: what is $x_1$?`, a: r`$\frac12\left(3 + \frac73\right) = 2.6667$.` },
        { q: r`When does fixed-point iteration converge?`, a: r`When $|g'(x)| < 1$ near the root.` },
      ],
    },
    {
      name: 'Gaussian Elimination and LU',
      inShort: r`Direct methods: clear below each pivot, then back-substitute; or factor once as $A = LU$.`,
      body: [
        r`**Gaussian elimination** turns $A\vec x = \vec b$ into an upper-triangular system. For each pivot $a_{kk}$, subtract $m_{ik} = \frac{a_{ik}}{a_{kk}}$ times row $k$ from each row $i$ below it, on both sides. Then **back-substitute** from the bottom up:
$$x_i = \frac{b_i - \sum_{j > i}a_{ij}x_j}{a_{ii}}.$$

| Variant | Idea |
|---|---|
| naive Gauss | eliminate in the given order |
| partial pivoting | first swap up the largest entry of the column, to keep round-off small |
| Gauss-Jordan | clear above the pivots too: the answer appears directly (reduced row echelon form) |
| LU factorisation | $A = LU$ once, then $L\vec y = \vec b$ and $U\vec x = \vec y$ for each new $\vec b$ |

The determinant is the product of the pivots, times $-1$ for each row swap. The work grows as $\frac23n^3$ operations, so doubling the size costs eight times as much. On the board, the calculator's equation mode solves up to 3 or 4 unknowns; know the method for the theory questions.`,
      ],
      keyIdeas: [
        r`Row $i$ minus $m_{ik} = \frac{a_{ik}}{a_{kk}}$ times row $k$; then $x_i = \frac{b_i - \sum_{j > i}a_{ij}x_j}{a_{ii}}$ from the bottom up.`,
        r`Partial pivoting: bring the largest entry of the column up first, to keep round-off small.`,
        r`$A = LU$, then $L\vec y = \vec b$ and $U\vec x = \vec y$. $\det A$ is the product of the pivots, times $-1$ per row swap. The work grows as $\frac{2n^3}{3}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A 3 × 3 system',
          problem: r`Solve $2x + y - z = 8$, $-3x - y + 2z = -11$, $-2x + y + 2z = -3$.`,
          steps: [
            r`$R_2 + 1.5R_1$: $0.5y + 0.5z = 1$. $R_3 + R_1$: $2y + z = 5$. $R_3 - 4R_2$: $-z = 1$.`,
            r`So $z = -1$, $y = 3$, $x = 2$. The pivots $2, 0.5, -1$ give $\det A = -1$.`,
          ],
          answer: r`$(2, 3, -1)$.`,
        },
        {
          level: 'board',
          title: 'Elimination with its determinant',
          problem: r`Solve $x + 2y + z = 8$, $2x + y - z = 1$, $3x - y + 2z = 7$ by elimination, and find $\det A$ from the pivots.`,
          steps: [
            r`$R_2 - 2R_1$: $-3y - 3z = -15$. $R_3 - 3R_1$: $-7y - z = -17$.`,
            r`$R_3 - \frac73R_2$: $6z = 18$, so $z = 3$; then $-3y = -15 + 9$, $y = 2$; and $x = 8 - 4 - 3 = 1$.`,
            r`Pivots $1, -3, 6$: $\det A = -18$.`,
          ],
          answer: r`$(1, 2, 3)$; $\det A = -18$.`,
        },
      ],
      traps: [
        r`Apply every row operation to the right-hand side too.`,
        r`A zero pivot stops naive elimination: swap rows first.`,
      ],
      check: [
        { q: r`How much more work is a system twice as large?`, a: r`About $2^3 = 8$ times.` },
        { q: r`What does Gauss-Jordan add to Gaussian elimination?`, a: r`It clears above the pivots too, so no back-substitution is needed.` },
      ],
    },
    {
      name: 'Jacobi and Gauss-Seidel',
      inShort: r`Iterative methods: solve each equation for its own unknown and repeat.`,
      body: [
        r`For large, sparse systems, iterate instead of eliminating. Solve equation $i$ for $x_i$ and sweep:
$$x_i^{(k+1)} = \frac{1}{a_{ii}}\left(b_i - \sum_{j \ne i}a_{ij}x_j\right).$$
**Jacobi** uses only the previous sweep's values; **Gauss-Seidel** uses each new value as soon as it is found, and usually converges about twice as fast:`,
        {
          type: 'plot',
          alt: 'The value of y over five sweeps for the system with solution 1, 2, 3, starting from zero. The Gauss-Seidel iterates, solid, reach 2 within two sweeps; the Jacobi iterates, dashed, approach more slowly.',
          caption: 'y over five sweeps from zero for the basic example: Gauss-Seidel (solid) settles on 2 faster than Jacobi (dashed).',
          x: [0, 5],
          y: [0, 2.4],
          xLabel: 'sweep k',
          yLabel: 'y',
          series: [
            { points: sweeps(true, 5).map((v, k) => [k, v[1]]), colour: colourOf(0) },
            { points: sweeps(false, 5).map((v, k) => [k, v[1]]), dashed: true, colour: colourOf(1) },
          ],
          marks: [{ y: 2 }],
          legend: false,
        },
        r`Both converge whenever the matrix is **diagonally dominant**, $|a_{ii}| > \sum_{j \ne i}|a_{ij}|$ in every row, so reorder the equations to put the big coefficients on the diagonal. **Successive over-relaxation** speeds Gauss-Seidel up: $x^{new} = \omega x^{GS} + (1 - \omega)x^{old}$ with $1 < \omega < 2$.`,
      ],
      keyIdeas: [
        r`Jacobi: $x_i^{(k+1)} = \frac{1}{a_{ii}}\left(b_i - \sum_{j\ne i}a_{ij}x_j^{(k)}\right)$, all from the old values.`,
        r`Gauss-Seidel uses each new value at once, and usually converges about twice as fast.`,
        r`Both converge if the matrix is diagonally dominant: $|a_{ii}| > \sum_{j\ne i}|a_{ij}|$ in every row. SOR blends: $x^{\text{new}} = \omega x^{\text{GS}} + (1 - \omega)x^{\text{old}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One sweep of each',
          problem: r`One sweep of each from zero on $10x - y + 2z = 14$, $-x + 11y - z = 18$, $2x - y + 10z = 30$.`,
          steps: [
            r`Jacobi: $x = 1.4$, $y = \frac{18}{11} = 1.6364$, $z = 3$.`,
            r`Gauss-Seidel: $x = 1.4$, $y = \frac{18 + 1.4}{11} = 1.7636$, $z = \frac{30 - 2.8 + 1.7636}{10} = 2.8964$. Both head for $(1, 2, 3)$.`,
          ],
          answer: r`Jacobi $(1.4, 1.6364, 3)$; Gauss-Seidel $(1.4, 1.7636, 2.8964)$.`,
        },
        {
          level: 'board',
          title: 'Two sweeps of each on a pair',
          problem: r`Do two sweeps of each method from zero on $5x - y = 9$, $x + 4y = 6$, and compare with the exact $(2, 1)$.`,
          steps: [
            r`Jacobi: $(1.8, 1.5)$, then $\left(\frac{9 + 1.5}{5}, \frac{6 - 1.8}{4}\right) = (2.1, 1.05)$.`,
            r`Gauss-Seidel: $x = 1.8$, $y = \frac{6 - 1.8}{4} = 1.05$; then $x = \frac{9 + 1.05}{5} = 2.01$, $y = \frac{6 - 2.01}{4} = 0.9975$.`,
            r`After two sweeps Gauss-Seidel is within 0.01 of the answer; Jacobi is still 0.1 away.`,
          ],
          answer: r`Jacobi $(2.1, 1.05)$; Gauss-Seidel $(2.01, 0.9975)$.`,
        },
      ],
      traps: [
        r`Reorder the equations first so the big coefficients sit on the diagonal.`,
        r`In Jacobi, keep every old value until the whole sweep is done.`,
      ],
      check: [
        { q: r`Is $\begin{bmatrix}4 & 1 & 2\\ 1 & 5 & 3\\ 2 & 1 & 2\end{bmatrix}$ diagonally dominant?`, a: r`No: in row 3, $2 < 2 + 1$.` },
        { q: r`Which uses new values at once: Jacobi or Gauss-Seidel?`, a: r`Gauss-Seidel.` },
      ],
    },
    {
      name: "Newton's Interpolation",
      inShort: r`A polynomial through tabulated points, built from differences.`,
      body: [
        r`Through $n + 1$ points passes exactly one polynomial of degree $n$. **Newton's form** builds it from **divided differences**:
$$f[x_0, x_1] = \frac{f(x_1) - f(x_0)}{x_1 - x_0}, \quad f[x_0, x_1, x_2] = \frac{f[x_1, x_2] - f[x_0, x_1]}{x_2 - x_0}, \ \ldots$$
$$P_n(x) = f[x_0] + f[x_0, x_1](x - x_0) + f[x_0, x_1, x_2](x - x_0)(x - x_1) + \cdots$$
Adding a point adds one term without redoing the others. The interpolant matches the data exactly but strays between and beyond the points:`,
        {
          type: 'plot',
          alt: 'The curve y equals x cubed, solid, and the dashed parabola through its points at x equals 1, 2 and 4. They meet at those three points; at x equals 3 the parabola gives 29 against the true 27.',
          caption: 'x³ (solid) and the quadratic through x = 1, 2, 4 (dashed): exact at those points, 29 against 27 at x = 3.',
          x: [0.5, 4.5],
          y: [0, 80],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => x ** 3, colour: colourOf(0) },
            { f: newtonP, dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`For **equally spaced** data, differences replace divided differences. With $s = \frac{x - x_0}{h}$, the **forward** formula
$$P(x_0 + sh) = y_0 + s\Delta y_0 + \frac{s(s - 1)}{2!}\Delta^2y_0 + \cdots$$
suits points near the start of the table; the backward formula, near the end. The error is $\frac{f^{(n+1)}(\xi)}{(n + 1)!}\prod(x - x_i)$, smallest in the middle of the data, and linear interpolation is the one-term case.`,
      ],
      keyIdeas: [
        r`Linear: $y = y_0 + \frac{y_1 - y_0}{x_1 - x_0}(x - x_0)$.`,
        r`Divided differences $f[x_0, x_1] = \frac{f(x_1) - f(x_0)}{x_1 - x_0}$, and so on; $P_n(x) = f[x_0] + f[x_0, x_1](x - x_0) + f[x_0, x_1, x_2](x - x_0)(x - x_1) + \cdots$.`,
        r`Equal steps: forward $P(x_0 + sh) = y_0 + s\Delta y_0 + \frac{s(s - 1)}{2!}\Delta^2y_0 + \cdots$ near the start, backward near the end.`,
        r`Error $\frac{f^{(n+1)}(\xi)}{(n + 1)!}\prod(x - x_i)$: smallest in the middle of the data.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three points of a cube',
          problem: r`Fit $(1, 1)$, $(2, 8)$, $(4, 64)$ and estimate $f(3)$. The data are $x^3$.`,
          steps: [
            r`$f[1, 2] = 7$, $f[2, 4] = 28$, $f[1, 2, 4] = \frac{28 - 7}{3} = 7$.`,
            r`$P(x) = 1 + 7(x - 1) + 7(x - 1)(x - 2)$, so $P(3) = 29$. The error formula gives $\frac{6}{3!}(2)(1)(-1) = -2$, and indeed $27 - 29 = -2$.`,
          ],
          answer: r`$P(3) = 29$.`,
        },
        {
          level: 'board',
          title: 'Forward differences, and a logarithm',
          problem: r`(a) A table gives $x = 0, 1, 2, 3$ and $y = 1, 2, 5, 10$. Estimate $y(1.5)$ by Newton's forward formula. (b) From $\ln1 = 0$, $\ln2 = 0.693147$, $\ln4 = 1.386294$, estimate $\ln3$ by a quadratic and find its error.`,
          steps: [
            r`(a) $\Delta y = 1, 3, 5$; $\Delta^2y = 2, 2$; $\Delta^3y = 0$. With $s = 1.5$: $1 + 1.5(1) + \frac{1.5(0.5)}{2}(2) = 3.25$ (the data are $x^2 + 1$, so this is exact).`,
            r`(b) $f[1, 2] = 0.693147$, $f[2, 4] = 0.346574$, $f[1, 2, 4] = \frac{0.346574 - 0.693147}{3} = -0.115525$.`,
            r`$P(3) = 0 + 0.693147(2) - 0.115525(2)(1) = 1.155245$, against $\ln3 = 1.098612$: an error of about 5%.`,
          ],
          answer: r`(a) 3.25; (b) about 1.1552, 5% high.`,
        },
      ],
      traps: [
        r`At each level divide by the span of all the points involved, not by one step.`,
        r`Interpolating outside the table (extrapolating) can be badly wrong.`,
      ],
      check: [
        { q: r`Linearly interpolate between $(2, 10)$ and $(4, 18)$ at $x = 3.5$.`, a: r`$10 + 4(1.5) = 16$.` },
        { q: r`If the third differences of a table are constant, what degree are the data?`, a: r`Cubic.` },
      ],
    },
    {
      name: 'Lagrange Interpolation',
      inShort: r`The same polynomial, written as a weighted sum of the $y$-values.`,
      body: [
        r`**Lagrange's form** writes the same interpolating polynomial as a weighted sum of the data values:
$$P(x) = \sum_iy_iL_i(x), \qquad L_i(x) = \prod_{j \ne i}\frac{x - x_j}{x_i - x_j}.$$
Each **basis polynomial** $L_i$ is 1 at its own node and 0 at all the others, so $P$ passes through every point; and at every $x$ the $L_i$ add to 1, a quick arithmetic check:`,
        {
          type: 'plot',
          alt: 'The three Lagrange basis polynomials for the nodes 0, 1 and 3. Each equals 1 at its own node and 0 at the other two; between the nodes they rise and dip, and at every x they add to 1.',
          caption: 'The Lagrange basis for nodes 0, 1, 3: each is 1 at its own node (dashed guides) and 0 at the others; together they always add to 1.',
          x: [-0.3, 3.3],
          y: [-0.6, 1.6],
          xLabel: 'x',
          yLabel: 'L(x)',
          series: basis.map((L, i) => ({ f: L, colour: colourOf(i), dashed: i === 1 })),
          marks: [{ x: 0 }, { x: 1 }, { x: 3 }],
          legend: false,
        },
        r`Lagrange's form needs no difference table and suits a single estimate; Newton's suits adding points. **Inverse interpolation** swaps the roles of $x$ and $y$: interpolating $x$ as a function of $y$ and setting $y = 0$ estimates a root from a table.`,
      ],
      keyIdeas: [
        r`$P(x) = \sum y_iL_i(x)$ with $L_i(x) = \prod_{j\ne i}\frac{x - x_j}{x_i - x_j}$.`,
        r`$L_i$ is 1 at its own point and 0 at the others, and the $L_i$ add to 1 at every $x$: a quick check.`,
        r`Inverse interpolation swaps $x$ and $y$; setting $y = 0$ estimates a root from a table.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three nodes',
          problem: r`Through $(0, 1)$, $(1, 3)$, $(3, 2)$, find $P(2)$.`,
          steps: [
            r`$L_0(2) = \frac{(1)(-1)}{(-1)(-3)} = -\frac13$, $L_1(2) = \frac{(2)(-1)}{(1)(-2)} = 1$, $L_2(2) = \frac{(2)(1)}{(3)(2)} = \frac13$; they add to 1.`,
            r`$P(2) = -\frac13 + 3 + \frac23 = 3.333$.`,
          ],
          answer: r`About 3.333.`,
        },
        {
          level: 'board',
          title: 'A value, and a root from a table',
          problem: r`A table gives $(1, -1)$, $(2, 2)$, $(3, 7)$. (a) Find $P(1.5)$ by Lagrange. (b) Estimate the root by inverse interpolation.`,
          steps: [
            r`(a) $L_0(1.5) = \frac{(-0.5)(-1.5)}{(-1)(-2)} = 0.375$, $L_1 = \frac{(0.5)(-1.5)}{(1)(-1)} = 0.75$, $L_2 = \frac{(0.5)(-0.5)}{(2)(1)} = -0.125$. $P = -0.375 + 1.5 - 0.875 = 0.25$.`,
            r`(b) Interpolate $x$ on the $y$-nodes $-1, 2, 7$ at $y = 0$: $1\cdot\frac{(0 - 2)(0 - 7)}{(-3)(-8)} + 2\cdot\frac{(0 + 1)(0 - 7)}{(3)(-5)} + 3\cdot\frac{(0 + 1)(0 - 2)}{(8)(5)} = 0.5833 + 0.9333 - 0.15 = 1.3667$.`,
            r`The data are $x^2 - 2$, so the true root is $\sqrt2 = 1.4142$.`,
          ],
          answer: r`(a) 0.25; (b) about 1.3667.`,
        },
      ],
      traps: [
        r`Lagrange and Newton give the same polynomial; pick whichever is quicker to compute.`,
        r`If your $L_i$ values don't add to 1, there is an arithmetic slip.`,
      ],
      check: [
        { q: r`What is $L_1$ at the node $x_1$?`, a: r`1.` },
        { q: r`How many points fix a cubic?`, a: r`Four.` },
      ],
    },
    {
      name: 'Least-Squares Curve Fitting',
      inShort: r`The curve that best fits scattered data, by making the squared misses smallest.`,
      body: [
        r`Measured data scatter, so instead of passing through every point, **least squares** finds the curve that makes the sum of squared vertical misses $S_r$ as small as possible. For a line $y = a + bx$:
$$b = \frac{n\sum xy - \sum x\sum y}{n\sum x^2 - (\sum x)^2}, \qquad a = \bar y - b\bar x,$$
and the line passes through $(\bar x, \bar y)$:`,
        {
          type: 'plot',
          alt: 'Four data points drawn as crosses at 1 comma 2, 2 comma 3, 3 comma 5 and 4 comma 6, with the dashed least-squares line y equals 0.5 plus 1.4 x passing close to all of them.',
          caption: 'Four points (crosses) and their least-squares line y = 0.5 + 1.4x (dashed), through the centre (2.5, 4); r² = 0.98.',
          x: [0, 5],
          y: [0, 8],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 0.5 + 1.4 * x, dashed: true, colour: colourOf(1) },
            ...FIT.flatMap(([x, y]) => [
              { points: [[x - 0.1, y], [x + 0.1, y]], colour: colourOf(0) },
              { points: [[x, y - 0.16], [x, y + 0.16]], colour: colourOf(0) },
            ]),
          ],
          legend: false,
        },
        r`| Model | Make it a line | Fit |
|---|---|---|
| line $y = a + bx$ | as it is | the formulas above |
| exponential $y = ae^{bx}$ | $\ln y = \ln a + bx$ | line through $(x, \ln y)$ |
| power $y = ax^b$ | $\log y = \log a + b\log x$ | line through $(\log x, \log y)$ |
| polynomial | normal equations | solve for every coefficient |

The fit's quality: $r^2 = 1 - \frac{S_r}{S_t}$, the share of the variation explained, with $S_t = \sum(y - \bar y)^2$; and the standard error of estimate $\sqrt{\frac{S_r}{n - 2}}$ for a line. Calculators fit all three models in regression mode.`,
      ],
      keyIdeas: [
        r`Line: $b = \frac{n\sum xy - \sum x\sum y}{n\sum x^2 - (\sum x)^2}$, $a = \bar y - b\bar x$; it passes through $(\bar x, \bar y)$.`,
        r`$r^2 = 1 - \frac{S_r}{S_t}$ is the share explained; the standard error is $\sqrt{\frac{S_r}{n - 2}}$ for a line.`,
        r`Exponential and power models become lines in logarithms: $\ln y = \ln a + bx$, $\log y = \log a + b\log x$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A line through four points',
          problem: r`Fit a line to $(1, 2)$, $(2, 3)$, $(3, 5)$, $(4, 6)$ and find $r^2$.`,
          steps: [
            r`$\sum x = 10$, $\sum y = 16$, $\sum xy = 47$, $\sum x^2 = 30$: $b = \frac{188 - 160}{120 - 100} = 1.4$ and $a = 4 - 1.4(2.5) = 0.5$, so $y = 0.5 + 1.4x$.`,
            r`The misses are $0.1, -0.3, 0.3, -0.1$, so $S_r = 0.2$; $S_t = 10$, and $r^2 = 0.98$.`,
          ],
          answer: r`$y = 0.5 + 1.4x$; $r^2 = 0.98$.`,
        },
        {
          level: 'board',
          title: 'An exponential fit',
          problem: r`Fit $y = ae^{bx}$ to $x = 0, 1, 2, 3$, $y = 2.0, 3.0, 4.6, 6.9$, and predict $y(4)$.`,
          steps: [
            r`$\ln y = 0.6931, 1.0986, 1.5261, 1.9315$: $\sum x = 6$, $\sum x^2 = 14$, $\sum\ln y = 5.2493$, $\sum x\ln y = 9.9453$.`,
            r`$b = \frac{4(9.9453) - 6(5.2493)}{4(14) - 36} = 0.4143$; $\ln a = \frac{5.2493}{4} - 0.4143(1.5) = 0.6909$, so $a = 1.9956$.`,
            r`$y = 1.9956e^{0.4143x}$, and $y(4) = 10.46$.`,
          ],
          answer: r`$y = 1.9956e^{0.4143x}$; about 10.46.`,
        },
      ],
      traps: [
        r`Least squares minimises VERTICAL misses; swapping $x$ and $y$ gives a different line.`,
        r`For an exponential fit, transform $y$ only; for a power fit, transform both.`,
      ],
      check: [
        { q: r`What does $r^2 = 0.95$ mean?`, a: r`The fit explains 95% of the variation in $y$.` },
        { q: r`Which transformation fits $y = ax^b$?`, a: r`$\log y$ against $\log x$.` },
      ],
    },
    {
      name: 'Numerical Differentiation',
      inShort: r`Slopes from tabulated or computed values.`,
      body: [
        r`A derivative is a limit of slopes, so estimate it with a finite step $h$. Each **difference formula** is a secant line; the central one is balanced on both sides and much closer to the tangent:`,
        {
          type: 'plot',
          alt: 'The curve e to the x near 0 with its tangent at 0, slope 1, solid, and two dashed secants with h equals 0.5: the forward secant from 0 to 0.5, slope 1.297, and the central secant from minus 0.5 to 0.5, slope 1.042, nearly parallel to the tangent.',
          caption: 'eˣ at 0 with h = 0.5: the forward secant has slope 1.297, the central secant 1.042 (both dashed), against the tangent slope 1 (thin solid).',
          x: [-1, 1],
          y: [0, 2.5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: Math.exp, colour: colourOf(0) },
            { f: (x) => 1 + x, colour: colourOf(2) },
            { f: (x) => 1 + ((Math.exp(0.5) - 1) / 0.5) * x, dashed: true, colour: colourOf(1) },
            { f: (x) => Math.exp(-0.5) + ((Math.exp(0.5) - Math.exp(-0.5)) / 1) * (x + 0.5), dashed: true, colour: colourOf(3) },
          ],
          legend: false,
        },
        r`| Formula | Estimate | Error |
|---|---|---|
| forward | $\frac{f(x + h) - f(x)}{h}$ | $O(h)$ |
| backward | $\frac{f(x) - f(x - h)}{h}$ | $O(h)$ |
| central | $\frac{f(x + h) - f(x - h)}{2h}$ | $O(h^2)$ |
| second derivative | $\frac{f(x + h) - 2f(x) + f(x - h)}{h^2}$ | $O(h^2)$ |
| Richardson | $\frac{4D(h/2) - D(h)}{3}$ from two central estimates | $O(h^4)$ |

Halving $h$ halves a forward error but quarters a central one. Too small an $h$ backfires: subtracting nearly equal values loses digits to round-off.`,
      ],
      keyIdeas: [
        r`Forward $\frac{f(x + h) - f(x)}{h}$ and backward differences are $O(h)$.`,
        r`Central $\frac{f(x + h) - f(x - h)}{2h}$ is $O(h^2)$; second derivative $\frac{f(x + h) - 2f(x) + f(x - h)}{h^2}$.`,
        r`Richardson: $\frac{4D(h/2) - D(h)}{3}$ cancels the $h^2$ error.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The slope of eˣ',
          problem: r`Estimate $\frac{d}{dx}e^x$ at $x = 0$ with $h = 0.1$, then improve it with $h = 0.05$.`,
          steps: [
            r`Forward: $1.05171$. Central: $\frac{1.105171 - 0.904837}{0.2} = 1.001668$; with $h = 0.05$, $1.000417$.`,
            r`Richardson: $\frac{4(1.000417) - 1.001668}{3} = 1.000000$. The exact value is 1.`,
          ],
          answer: r`About 1.000000.`,
        },
        {
          level: 'board',
          title: 'Four estimates for ln x',
          problem: r`For $f(x) = \ln x$ at $x = 2$ with $h = 0.1$, find the forward, backward and central estimates of $f'$, and the estimate of $f''$. Compare with $\frac12$ and $-\frac14$.`,
          steps: [
            r`Forward $\frac{\ln2.1 - \ln2}{0.1} = 0.48790$; backward $\frac{\ln2 - \ln1.9}{0.1} = 0.51293$.`,
            r`Central $\frac{\ln2.1 - \ln1.9}{0.2} = 0.50042$: much closer to 0.5.`,
            r`Second derivative $\frac{\ln2.1 - 2\ln2 + \ln1.9}{0.01} = -0.25031$, against $-0.25$.`,
          ],
          answer: r`0.48790, 0.51293, 0.50042; $-0.25031$.`,
        },
      ],
      traps: [
        r`A tiny $h$ is not always better: subtracting nearly equal numbers loses digits.`,
        r`The central formula divides by $2h$, not $h$.`,
      ],
      check: [
        { q: r`What happens to a central-difference error when $h$ halves?`, a: r`It falls about fourfold.` },
        { q: r`Estimate $f'(1)$ from $f(0.9) = 0.81$, $f(1.1) = 1.21$.`, a: r`$\frac{0.4}{0.2} = 2$.` },
      ],
    },
    {
      name: "Trapezoidal and Simpson's Rules",
      inShort: r`Integrals from equally spaced values, with straight, parabolic or cubic pieces.`,
      body: [
        r`Split $[a, b]$ into $n$ strips of width $h = \frac{b - a}{n}$ and replace the curve piece by piece with something easy to integrate. Straight pieces give the **trapezoidal rule**; the trapezoids sit just above or below the curve:`,
        {
          type: 'plot',
          alt: 'The curve 1 over 1 plus x squared from 0 to 1, and under it four shaded trapezoids of width 0.25 whose tops are straight chords, with dashed guides at the strip edges. The chords hug the curve, and the trapezoidal sum 0.782794 falls slightly short of the area, pi over 4.',
          caption: 'Four trapezoids of width 0.25 under 1/(1 + x²) on [0, 1] (strip edges dashed): their sum 0.7828 falls just short of π/4 = 0.7854.',
          x: [0, 1],
          y: [0, 1.1],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 1 / (1 + x * x), colour: colourOf(0) },
            { points: range(0, 1, 4).map((x) => [x, 1 / (1 + x * x)]), area: true, dashed: true, colour: colourOf(1) },
          ],
          marks: [{ x: 0.25 }, { x: 0.5 }, { x: 0.75 }],
          legend: false,
        },
        r`| Rule | Formula | Strips | Error |
|---|---|---|---|
| trapezoidal | $\frac h2[y_0 + 2(y_1 + \cdots + y_{n-1}) + y_n]$ | any $n$ | $O(h^2)$ |
| Simpson's $\frac13$ | $\frac h3[y_0 + 4(y_1 + y_3 + \cdots) + 2(y_2 + y_4 + \cdots) + y_n]$ | $n$ even | $O(h^4)$ |
| Simpson's $\frac38$ | $\frac{3h}{8}[y_0 + 3y_1 + 3y_2 + 2y_3 + \cdots + y_n]$ | $n$ a multiple of 3 | $O(h^4)$ |
| two-point Gauss-Legendre | $\frac{b - a}{2}[f(x_1) + f(x_2)]$, $x = \frac{a + b}{2} \pm \frac{b - a}{2\sqrt3}$ | — | exact for cubics |

Both Simpson rules are exact for cubics. **Romberg integration** combines trapezoidal results at $h$ and $\frac h2$ the way Richardson does: $\frac{4T(h/2) - T(h)}{3}$ is Simpson's rule.`,
      ],
      keyIdeas: [
        r`Trapezoidal: $\frac h2[y_0 + 2(y_1 + \cdots + y_{n-1}) + y_n]$, error $O(h^2)$.`,
        r`Simpson's $\frac13$: $\frac h3[y_0 + 4y_1 + 2y_2 + \cdots + 4y_{n-1} + y_n]$, $n$ even, error $O(h^4)$; $\frac38$ rule for $n$ a multiple of 3. Both Simpson rules are exact for cubics.`,
        r`Romberg extrapolates trapezoidal results; two-point Gauss-Legendre uses $t = \pm\frac{1}{\sqrt3}$ on $[-1, 1]$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A quarter of π',
          problem: r`Estimate $\int_0^1\frac{dx}{1 + x^2}$ $\left(= \frac\pi4\right)$ with $n = 4$ by both rules.`,
          steps: [
            r`$h = 0.25$; $y = 1, 0.941176, 0.8, 0.64, 0.5$. Trapezoidal: $0.125[1.5 + 2(2.381176)] = 0.782794$.`,
            r`Simpson: $\frac{0.25}{3}[1 + 3.764706 + 1.6 + 2.56 + 0.5] = 0.785392$, against $\frac\pi4 = 0.785398$.`,
          ],
          answer: r`0.782794 and 0.785392.`,
        },
        {
          level: 'board',
          title: 'ln 2 four ways',
          problem: r`Estimate $\int_1^2\frac{dx}{x} = \ln2 = 0.693147$ by the trapezoidal and Simpson's $\frac13$ rules with $n = 4$, Simpson's $\frac38$ rule with $n = 3$, and two-point Gauss-Legendre.`,
          steps: [
            r`$h = 0.25$: $y = 1, 0.8, 0.666667, 0.571429, 0.5$. Trapezoidal $0.125[1.5 + 2(2.038095)] = 0.697024$; Simpson $\frac{0.25}{3}[1 + 3.2 + 1.333333 + 2.285714 + 0.5] = 0.693254$.`,
            r`$\frac38$ rule, $h = \frac13$: $y = 1, 0.75, 0.6, 0.5$; $0.125[1 + 2.25 + 1.8 + 0.5] = 0.693750$.`,
            r`Gauss: $x = 1.5 \pm \frac{0.5}{\sqrt3} = 1.211325$ and $1.788675$; $0.5\left(\frac{1}{1.211325} + \frac{1}{1.788675}\right) = 0.692308$.`,
          ],
          answer: r`0.697024, 0.693254, 0.693750, 0.692308.`,
        },
      ],
      traps: [
        r`Simpson's $\frac13$ rule needs an EVEN number of strips (an odd number of points).`,
        r`Inner trapezoidal values count twice; Simpson weights alternate 4, 2, 4 with 1 at the ends.`,
      ],
      check: [
        { q: r`What is the trapezoidal estimate of $\int_0^2x^2\,dx$ with one strip?`, a: r`$\frac22(0 + 4) = 4$ (the true value is $\frac83$).` },
        { q: r`For which polynomials is Simpson's rule exact?`, a: r`Up to cubics.` },
      ],
    },
    {
      name: 'Euler and Runge-Kutta Methods',
      inShort: r`Step along a differential equation $y' = f(x, y)$ from a starting value.`,
      body: [
        r`To solve $y' = f(x, y)$ from $y(x_0) = y_0$, step forward by $h$ using slopes. **Euler's method** takes the slope at the start of each step, so on a curving solution it falls behind:`,
        {
          type: 'plot',
          alt: 'The exact solution e to the x of y prime equals y from 0 to 1, solid, and the dashed Euler polyline with steps of 0.25, which falls further below the curve at each step, ending at 2.441 against the true 2.718.',
          caption: "y′ = y, y(0) = 1: Euler with h = 0.25 (dashed) ends at 2.441 against eˣ's 2.718 (solid), falling further behind each step.",
          x: [0, 1],
          y: [0.8, 3],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: Math.exp, colour: colourOf(0) },
            { points: range(0, 1, 4).map((x, i) => [x, 1.25 ** i]), dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`Better methods average several slopes within each step:

| Method | Update | Global error |
|---|---|---|
| Euler | $y_{n+1} = y_n + hf(x_n, y_n)$ | $O(h)$ |
| Heun (improved Euler) | predict with Euler, then average the slopes at both ends | $O(h^2)$ |
| midpoint | use the slope halfway along the step | $O(h^2)$ |
| fourth-order Runge-Kutta | $y_{n+1} = y_n + \frac h6(k_1 + 2k_2 + 2k_3 + k_4)$ | $O(h^4)$ |

with $k_1 = f(x_n, y_n)$, $k_2 = f\left(x_n + \frac h2, y_n + \frac h2k_1\right)$, $k_3 = f\left(x_n + \frac h2, y_n + \frac h2k_2\right)$, $k_4 = f(x_n + h, y_n + hk_3)$. Halving $h$ cuts an RK4 error sixteenfold.`,
      ],
      keyIdeas: [
        r`Euler: $y_{n+1} = y_n + hf(x_n, y_n)$, global error $O(h)$.`,
        r`Heun (improved Euler) averages the slopes at both ends; the midpoint method uses the slope halfway. Both are $O(h^2)$.`,
        r`RK4: $y_{n+1} = y_n + \frac h6(k_1 + 2k_2 + 2k_3 + k_4)$, $O(h^4)$: halving $h$ cuts the error sixteenfold.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "One step of y′ = y",
          problem: r`$y' = y$, $y(0) = 1$. Find $y(0.1)$ with one step of Euler, Heun and RK4.`,
          steps: [
            r`Euler: $1.1$. Heun: $1 + 0.05(1 + 1.1) = 1.105$.`,
            r`RK4: $k_1 = 1$, $k_2 = 1.05$, $k_3 = 1.0525$, $k_4 = 1.10525$, so $y = 1 + \frac{0.1}{6}(6.31025) = 1.1051708$, against $e^{0.1} = 1.1051709$.`,
          ],
          answer: r`1.1; 1.105; 1.1051708.`,
        },
        {
          level: 'board',
          title: 'One step of y′ = x + y',
          problem: r`$y' = x + y$, $y(0) = 1$, $h = 0.1$. Find $y(0.1)$ by Euler, Heun and RK4, and compare with the exact $2e^x - x - 1$.`,
          steps: [
            r`Euler: $1 + 0.1(0 + 1) = 1.1$. Heun: the end slope is $0.1 + 1.1 = 1.2$, so $1 + 0.05(1 + 1.2) = 1.11$.`,
            r`RK4: $k_1 = 1$, $k_2 = 0.05 + 1.05 = 1.1$, $k_3 = 0.05 + 1.055 = 1.105$, $k_4 = 0.1 + 1.1105 = 1.2105$.`,
            r`$y = 1 + \frac{0.1}{6}(1 + 2.2 + 2.21 + 1.2105) = 1.110342$; exact $2e^{0.1} - 1.1 = 1.110342$.`,
          ],
          answer: r`1.1; 1.11; 1.110342.`,
        },
      ],
      traps: [
        r`In $k_2$ and $k_3$ the step is $\frac h2$ in BOTH $x$ and $y$.`,
        r`Heun's end slope uses the Euler prediction, not the true value.`,
      ],
      check: [
        { q: r`One Euler step of $y' = 2x$ from $y(1) = 1$ with $h = 0.5$?`, a: r`$1 + 0.5(2) = 2$.` },
        { q: r`How does halving $h$ change an Euler error?`, a: r`It roughly halves it.` },
      ],
    },
    {
      name: 'Optimization',
      inShort: r`Finding the highest or lowest value, with or without constraints.`,
      body: [
        r`Optimisation searches for the largest or smallest value of a function. For one variable on an interval with a single peak, the **golden-section search** places two points at $R = 0.618$ of the interval from each end, compares them, and discards the part beyond the worse one; one old point is reused each time, so each step costs one new evaluation and keeps 61.8% of the interval:`,
        {
          type: 'plot',
          alt: 'The curve 2 sine x minus x squared over 10 on 0 to 4, rising to a peak of 1.7757 at x equals 1.4276 and falling below zero near 3.7. Dashed guides mark the golden-section points 1.528 and 2.472; the peak is also marked.',
          caption: 'f = 2 sin x − x²/10 on [0, 4]: golden-section points 1.528 and 2.472 (dashed); f(1.528) is larger, so [2.472, 4] is dropped. The peak is at 1.4276.',
          x: [0, 4],
          y: [-1, 2.2],
          xLabel: 'x',
          yLabel: 'f(x)',
          series: [{ f: (x) => 2 * Math.sin(x) - (x * x) / 10, colour: colourOf(0) }],
          marks: [{ x: 1.528 }, { x: 2.472 }, { at: [1.4276, 2 * Math.sin(1.4276) - 1.4276 ** 2 / 10] }],
          legend: false,
        },
        r`| Method | Idea |
|---|---|
| golden section | shrink a bracket by 0.618 each step |
| Newton | $x_{n+1} = x_n - \frac{f'(x_n)}{f''(x_n)}$: Newton's root method applied to $f'$ |
| parabolic interpolation | fit a parabola through three points and jump to its vertex |
| steepest descent (several variables) | $\vec x_{k+1} = \vec x_k - \alpha\nabla f$ for a minimum |
| Lagrange multipliers (a constraint $g = 0$) | $\nabla f = \lambda\nabla g$ |
| linear programming | the optimum of a linear objective lies at a corner of the feasible region |`,
      ],
      keyIdeas: [
        r`Golden section: points at $R = 0.618$ of the interval from each end; each step keeps 61.8% and reuses a point.`,
        r`Newton: $x_{n+1} = x_n - \frac{f'(x_n)}{f''(x_n)}$; parabolic interpolation jumps to the vertex through three points.`,
        r`Several variables: steepest descent $\vec x_{k+1} = \vec x_k - \alpha\nabla f$. With a constraint $g = 0$: $\nabla f = \lambda\nabla g$. Linear programming: the optimum is at a corner of the feasible region.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Golden section',
          problem: r`Maximise $f(x) = 2\sin x - \frac{x^2}{10}$ on $[0, 4]$: do one golden-section step, then give the answer.`,
          steps: [
            r`$d = 0.618(4) = 2.472$: $x_1 = 2.472$, $x_2 = 1.528$. $f(1.528) = 1.7647 > f(2.472) = 0.6303$, so keep $[0, 2.472]$.`,
            r`Continuing (or Newton on $f'(x) = 2\cos x - \frac x5 = 0$) gives $x = 1.4276$, $f = 1.7757$.`,
          ],
          answer: r`$x = 1.4276$, $f = 1.7757$.`,
        },
        {
          level: 'board',
          title: 'Newton, a constraint, a linear program',
          problem: r`(a) Find the local minimum of $f = x^3 - 6x^2 + 9x + 1$ by two Newton steps from 2.5. (b) Maximise $xy$ subject to $x + 2y = 8$. (c) Maximise $3x + 2y$ subject to $x + y \le 4$, $x + 3y \le 6$, $x, y \ge 0$.`,
          steps: [
            r`(a) $f' = 3x^2 - 12x + 9$, $f'' = 6x - 12$. $x_1 = 2.5 - \frac{-2.25}{3} = 3.25$; $x_2 = 3.25 - \frac{1.6875}{7.5} = 3.025$, closing on 3.`,
            r`(b) $\nabla(xy) = \lambda\nabla(x + 2y)$: $y = \lambda$, $x = 2\lambda$; then $4\lambda = 8$, so $x = 4$, $y = 2$, $xy = 8$.`,
            r`(c) Corners $(0, 0)$, $(4, 0)$, $(3, 1)$, $(0, 2)$ give 0, 12, 11, 4: the maximum is 12 at $(4, 0)$.`,
          ],
          answer: r`(a) 3.025 (true 3); (b) 8 at $(4, 2)$; (c) 12 at $(4, 0)$.`,
        },
      ],
      traps: [
        r`For a maximum keep the side of the LARGER value; for a minimum, the smaller.`,
        r`Newton's optimisation step divides $f'$ by $f''$, not $f$ by $f'$.`,
      ],
      check: [
        { q: r`What fraction of the interval does one golden-section step keep?`, a: r`0.618.` },
        { q: r`Where does a linear program's optimum lie?`, a: r`At a corner of the feasible region.` },
      ],
    },
  ],
};
