// Library › Lessons › Mathematics › Numerical Methods & Analysis (2026-11-17):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order; every worked example checked by computation.
const r = String.raw;

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
      keyIdeas: [
        r`True error $E_t = x_{\text{true}} - x_{\text{approx}}$; true relative error $\varepsilon_t = \frac{|E_t|}{|x_{\text{true}}|}\times100\%$.`,
        r`In an iteration the truth is unknown: use $\varepsilon_a = \left|\frac{x_{\text{new}} - x_{\text{old}}}{x_{\text{new}}}\right|\times100\%$ and stop when $\varepsilon_a < \varepsilon_s = (0.5\times10^{2-n})\%$ for $n$ significant figures.`,
        r`Round-off comes from storing digits, truncation from cutting a series or a step. A condition number $\left|\frac{x f'(x)}{f(x)}\right|$ above 1 magnifies input errors.`,
      ],
      example: {
        problem: r`$\frac{22}{7}$ is used for $\pi$. Find the true error and the true relative error, and the tolerance for 3 significant figures.`,
        solution: r`$E_t = 3.141593 - 3.142857 = -0.001264$, so $\varepsilon_t = \frac{0.001264}{3.141593}\times100\% = 0.0402\%$. For 3 figures, $\varepsilon_s = 0.5\times10^{-1}\% = 0.05\%$: $\frac{22}{7}$ is good to 3 figures.`,
      },
      traps: [r`The approximate error divides by the NEW value, not the old one.`],
    },
    {
      name: 'Bisection and False Position',
      inShort: r`Bracketing methods: start with a sign change and close in on the root.`,
      keyIdeas: [
        r`Both need $f(a)f(b) < 0$, and both always converge.`,
        r`Bisection: $c = \frac{a + b}{2}$; after $n$ steps the error is at most $\frac{b - a}{2^n}$, so $n \ge \frac{\ln[(b - a)/\varepsilon]}{\ln 2}$.`,
        r`False position: $c = \frac{a f(b) - b f(a)}{f(b) - f(a)}$, where the chord crosses the axis. Keep the half with the sign change.`,
      ],
      example: {
        problem: r`$f(x) = x^3 - x - 2$ on $[1, 2]$. Do three bisection steps and one false-position step. How many bisections give an error under $0.001$?`,
        solution: r`$f(1) = -2$, $f(2) = 4$. $f(1.5) = -0.125$ → $[1.5, 2]$; $f(1.75) = 1.609$ → $[1.5, 1.75]$; $f(1.625) = 0.666$ → $[1.5, 1.625]$. False position: $c = \frac{1(4) - 2(-2)}{4 - (-2)} = 1.3333$. Steps: $n \ge \frac{\ln 1000}{\ln 2} = 9.97$, so 10. (The root is 1.5214.)`,
      },
      traps: [r`Round the number of steps UP; 9.97 means 10.`],
    },
    {
      name: 'Newton-Raphson and Secant',
      inShort: r`Open methods: follow the tangent (or a secant) to the axis. Fast, but not guaranteed.`,
      keyIdeas: [
        r`Newton: $x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}$; quadratic convergence, the correct digits roughly double each step.`,
        r`Secant: $x_{n+1} = x_n - f(x_n)\frac{x_n - x_{n-1}}{f(x_n) - f(x_{n-1})}$; no derivative, order 1.618.`,
        r`Fixed point: $x_{n+1} = g(x_n)$ converges when $|g'(x)| < 1$ near the root. For $\sqrt N$: $x_{n+1} = \frac12\left(x_n + \frac{N}{x_n}\right)$.`,
      ],
      example: {
        problem: r`Two Newton steps on $x^3 - x - 2 = 0$ from $x_0 = 1.5$.`,
        solution: r`$f'(x) = 3x^2 - 1$. $x_1 = 1.5 - \frac{-0.125}{5.75} = 1.521739$. $x_2 = 1.521739 - \frac{0.002137}{5.947070} = 1.521380$, already correct to six figures.`,
      },
      traps: [r`Newton fails where $f'(x)$ is near zero; a flat start can throw the next guess far away.`],
    },
    {
      name: 'Gaussian Elimination and LU',
      inShort: r`Direct methods: clear below each pivot, then back-substitute; or factor once as $A = LU$.`,
      keyIdeas: [
        r`Row $i$ minus $m_{ik} = \frac{a_{ik}}{a_{kk}}$ times row $k$; then $x_i = \frac{b_i - \sum_{j > i}a_{ij}x_j}{a_{ii}}$ from the bottom up.`,
        r`Partial pivoting: bring the largest entry of the column up first, to keep round-off small.`,
        r`$A = LU$, then $L\vec y = \vec b$ and $U\vec x = \vec y$. $\det A$ is the product of the pivots, times $-1$ per row swap. The work grows as $\frac{2n^3}{3}$.`,
      ],
      example: {
        problem: r`Solve $2x + y - z = 8$, $-3x - y + 2z = -11$, $-2x + y + 2z = -3$.`,
        solution: r`$R_2 + 1.5R_1$: $0.5y + 0.5z = 1$. $R_3 + R_1$: $2y + z = 5$. $R_3 - 4R_2$: $-z = 1$. So $z = -1$, $y = 3$, $x = 2$. The pivots $2, 0.5, -1$ give $\det A = -1$.`,
      },
      traps: [r`Apply every row operation to the right-hand side too.`],
    },
    {
      name: 'Jacobi and Gauss-Seidel',
      inShort: r`Iterative methods: solve each equation for its own unknown and repeat.`,
      keyIdeas: [
        r`Jacobi: $x_i^{(k+1)} = \frac{1}{a_{ii}}\left(b_i - \sum_{j\ne i}a_{ij}x_j^{(k)}\right)$, all from the old values.`,
        r`Gauss-Seidel uses each new value at once, and usually converges about twice as fast.`,
        r`Both converge if the matrix is diagonally dominant: $|a_{ii}| > \sum_{j\ne i}|a_{ij}|$ in every row. SOR blends: $x^{\text{new}} = \omega x^{\text{GS}} + (1 - \omega)x^{\text{old}}$.`,
      ],
      example: {
        problem: r`One sweep of each from zero on $10x - y + 2z = 14$, $-x + 11y - z = 18$, $2x - y + 10z = 30$.`,
        solution: r`Jacobi: $x = 1.4$, $y = \frac{18}{11} = 1.6364$, $z = 3$. Gauss-Seidel: $x = 1.4$, $y = \frac{18 + 1.4}{11} = 1.7636$, $z = \frac{30 - 2.8 + 1.7636}{10} = 2.8964$. Both head for $(1, 2, 3)$.`,
      },
      traps: [r`Reorder the equations first so the big coefficients sit on the diagonal.`],
    },
    {
      name: "Newton's Interpolation",
      inShort: r`A polynomial through tabulated points, built from differences.`,
      keyIdeas: [
        r`Linear: $y = y_0 + \frac{y_1 - y_0}{x_1 - x_0}(x - x_0)$.`,
        r`Divided differences $f[x_0, x_1] = \frac{f(x_1) - f(x_0)}{x_1 - x_0}$, and so on; $P_n(x) = f[x_0] + f[x_0, x_1](x - x_0) + f[x_0, x_1, x_2](x - x_0)(x - x_1) + \cdots$.`,
        r`Equal steps: forward $P(x_0 + sh) = y_0 + s\Delta y_0 + \frac{s(s - 1)}{2!}\Delta^2y_0 + \cdots$ near the start, backward near the end.`,
        r`Error $\frac{f^{(n+1)}(\xi)}{(n + 1)!}\prod(x - x_i)$: smallest in the middle of the data.`,
      ],
      example: {
        problem: r`Fit $(1, 1)$, $(2, 8)$, $(4, 64)$ and estimate $f(3)$. The data are $x^3$.`,
        solution: r`$f[1, 2] = 7$, $f[2, 4] = 28$, $f[1, 2, 4] = \frac{28 - 7}{3} = 7$. $P(x) = 1 + 7(x - 1) + 7(x - 1)(x - 2)$, so $P(3) = 29$. The error formula gives $\frac{6}{3!}(2)(1)(-1) = -2$, and indeed $27 - 29 = -2$.`,
      },
      traps: [r`At each level divide by the span of all the points involved, not by one step.`],
    },
    {
      name: 'Lagrange Interpolation',
      inShort: r`The same polynomial, written as a weighted sum of the $y$-values.`,
      keyIdeas: [
        r`$P(x) = \sum y_iL_i(x)$ with $L_i(x) = \prod_{j\ne i}\frac{x - x_j}{x_i - x_j}$.`,
        r`$L_i$ is 1 at its own point and 0 at the others, and the $L_i$ add to 1 at every $x$: a quick check.`,
        r`Inverse interpolation swaps $x$ and $y$; setting $y = 0$ estimates a root from a table.`,
      ],
      example: {
        problem: r`Through $(0, 1)$, $(1, 3)$, $(3, 2)$, find $P(2)$.`,
        solution: r`$L_0(2) = \frac{(1)(-1)}{(-1)(-3)} = -\frac13$, $L_1(2) = \frac{(2)(-1)}{(1)(-2)} = 1$, $L_2(2) = \frac{(2)(1)}{(3)(2)} = \frac13$; they add to 1. $P(2) = -\frac13 + 3 + \frac23 = 3.333$.`,
      },
      traps: [r`Lagrange and Newton give the same polynomial; pick whichever is quicker to compute.`],
    },
    {
      name: 'Least-Squares Curve Fitting',
      inShort: r`The curve that best fits scattered data, by making the squared misses smallest.`,
      keyIdeas: [
        r`Line: $b = \frac{n\sum xy - \sum x\sum y}{n\sum x^2 - (\sum x)^2}$, $a = \bar y - b\bar x$; it passes through $(\bar x, \bar y)$.`,
        r`$r^2 = 1 - \frac{S_r}{S_t}$ is the share explained; the standard error is $\sqrt{\frac{S_r}{n - 2}}$ for a line.`,
        r`Exponential and power models become lines in logarithms: $\ln y = \ln a + bx$, $\log y = \log a + b\log x$.`,
      ],
      example: {
        problem: r`Fit a line to $(1, 2)$, $(2, 3)$, $(3, 5)$, $(4, 6)$ and find $r^2$.`,
        solution: r`$\sum x = 10$, $\sum y = 16$, $\sum xy = 47$, $\sum x^2 = 30$: $b = \frac{188 - 160}{120 - 100} = 1.4$ and $a = 4 - 1.4(2.5) = 0.5$, so $y = 0.5 + 1.4x$. The misses are $0.1, -0.3, 0.3, -0.1$, so $S_r = 0.2$; $S_t = 10$, and $r^2 = 0.98$.`,
      },
      traps: [r`Least squares minimises VERTICAL misses; swapping $x$ and $y$ gives a different line.`],
    },
    {
      name: 'Numerical Differentiation',
      inShort: r`Slopes from tabulated or computed values.`,
      keyIdeas: [
        r`Forward $\frac{f(x + h) - f(x)}{h}$ and backward differences are $O(h)$.`,
        r`Central $\frac{f(x + h) - f(x - h)}{2h}$ is $O(h^2)$; second derivative $\frac{f(x + h) - 2f(x) + f(x - h)}{h^2}$.`,
        r`Richardson: $\frac{4D(h/2) - D(h)}{3}$ cancels the $h^2$ error.`,
      ],
      example: {
        problem: r`Estimate $\frac{d}{dx}e^x$ at $x = 0$ with $h = 0.1$, then improve it with $h = 0.05$.`,
        solution: r`Forward: $1.05171$. Central: $\frac{1.105171 - 0.904837}{0.2} = 1.001668$; with $h = 0.05$, $1.000417$. Richardson: $\frac{4(1.000417) - 1.001668}{3} = 1.000000$. The exact value is 1.`,
      },
      traps: [r`A tiny $h$ is not always better: subtracting nearly equal numbers loses digits.`],
    },
    {
      name: "Trapezoidal and Simpson's Rules",
      inShort: r`Integrals from equally spaced values, with straight, parabolic or cubic pieces.`,
      keyIdeas: [
        r`Trapezoidal: $\frac h2[y_0 + 2(y_1 + \cdots + y_{n-1}) + y_n]$, error $O(h^2)$.`,
        r`Simpson's $\frac13$: $\frac h3[y_0 + 4y_1 + 2y_2 + \cdots + 4y_{n-1} + y_n]$, $n$ even, error $O(h^4)$; $\frac38$ rule for $n$ a multiple of 3. Both Simpson rules are exact for cubics.`,
        r`Romberg extrapolates trapezoidal results; two-point Gauss-Legendre uses $t = \pm\frac{1}{\sqrt3}$ on $[-1, 1]$.`,
      ],
      example: {
        problem: r`Estimate $\int_0^1\frac{dx}{1 + x^2}$ $\left(= \frac\pi4\right)$ with $n = 4$ by both rules.`,
        solution: r`$h = 0.25$; $y = 1, 0.941176, 0.8, 0.64, 0.5$. Trapezoidal: $0.125[1.5 + 2(2.381176)] = 0.782794$. Simpson: $\frac{0.25}{3}[1 + 3.764706 + 1.6 + 2.56 + 0.5] = 0.785392$, against $\frac\pi4 = 0.785398$.`,
      },
      traps: [r`Simpson's $\frac13$ rule needs an EVEN number of strips (an odd number of points).`],
    },
    {
      name: 'Euler and Runge-Kutta Methods',
      inShort: r`Step along a differential equation $y' = f(x, y)$ from a starting value.`,
      keyIdeas: [
        r`Euler: $y_{n+1} = y_n + hf(x_n, y_n)$, global error $O(h)$.`,
        r`Heun (improved Euler) averages the slopes at both ends; the midpoint method uses the slope halfway. Both are $O(h^2)$.`,
        r`RK4: $y_{n+1} = y_n + \frac h6(k_1 + 2k_2 + 2k_3 + k_4)$, $O(h^4)$: halving $h$ cuts the error sixteenfold.`,
      ],
      example: {
        problem: r`$y' = y$, $y(0) = 1$. Find $y(0.1)$ with one step of Euler, Heun and RK4.`,
        solution: r`Euler: $1.1$. Heun: $1 + 0.05(1 + 1.1) = 1.105$. RK4: $k_1 = 1$, $k_2 = 1.05$, $k_3 = 1.0525$, $k_4 = 1.10525$, so $y = 1 + \frac{0.1}{6}(6.31025) = 1.1051708$, against $e^{0.1} = 1.1051709$.`,
      },
      traps: [r`In $k_2$ and $k_3$ the step is $\frac h2$ in BOTH $x$ and $y$.`],
    },
    {
      name: 'Optimization',
      inShort: r`Finding the highest or lowest value, with or without constraints.`,
      keyIdeas: [
        r`Golden section: points at $R = 0.618$ of the interval from each end; each step keeps 61.8% and reuses a point.`,
        r`Newton: $x_{n+1} = x_n - \frac{f'(x_n)}{f''(x_n)}$; parabolic interpolation jumps to the vertex through three points.`,
        r`Several variables: steepest descent $\vec x_{k+1} = \vec x_k - \alpha\nabla f$. With a constraint $g = 0$: $\nabla f = \lambda\nabla g$. Linear programming: the optimum is at a corner of the feasible region.`,
      ],
      example: {
        problem: r`Maximise $f(x) = 2\sin x - \frac{x^2}{10}$ on $[0, 4]$: do one golden-section step, then give the answer.`,
        solution: r`$d = 0.618(4) = 2.472$: $x_1 = 2.472$, $x_2 = 1.528$. $f(1.528) = 1.7647 > f(2.472) = 0.6303$, so keep $[0, 2.472]$. Continuing (or Newton on $f'(x) = 2\cos x - \frac x5 = 0$) gives $x = 1.4276$, $f = 1.7757$.`,
      },
      traps: [r`For a maximum keep the side of the LARGER value; for a minimum, the smaller.`],
    },
  ],
};
