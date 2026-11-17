'use strict';

// Mathematics › Numerical Methods & Analysis formula cards (Library round,
// 2026-11-17): six live cards for 12 subtopics. Calculus 1 already has the
// second-derivative test for two variables and relative error by
// differentials, so this file adds the iterative and tabular methods. See
// algebra.js for the format; tests/numericalMethodsFormulas.test.js runs every
// method on a problem with a known answer and checks its error behaves as the
// card says.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const ERR = 'Errors and Approximation';
const BIS = 'Bisection and False Position';
const NR = 'Newton-Raphson and Secant';
const GE = 'Gaussian Elimination and LU';
const JGS = 'Jacobi and Gauss-Seidel';
const NI = "Newton's Interpolation";
const LI = 'Lagrange Interpolation';
const LS = 'Least-Squares Curve Fitting';
const ND = 'Numerical Differentiation';
const TS = "Trapezoidal and Simpson's Rules";
const RK = 'Euler and Runge-Kutta Methods';
const OPT = 'Optimization';

const file = [
    ['c671e6ee-ba84-431a-aa3d-2a00700d4d7f', BIS, null],
    ['a091f26b-62a5-4bb8-8e35-64a0a84f0d59', NR, null],
    ['4ed462c8-178c-4fcb-b743-f87c2c67391f', NR, null],
    ['52a7e3ea-576e-4731-a372-50cf8ee28f66', TS, null],
    ['80a4f9c9-4ad7-4fdb-b231-b3a5869e56df', TS, null],
    ['12ecabea-90fc-471d-bf66-88481c76c8ea', RK, null],
];

const revisions = [
    { id: '52a7e3ea-576e-4731-a372-50cf8ee28f66', note: 'It had no symbol, and its tip now says h.', symbol: r`$S_n$`,
        tip: r`The number of strips $n$ must be even, $h = \frac{b - a}{n}$, and the coefficients run 1, 4, 2, 4, …, 4, 1.` },
    { id: '80a4f9c9-4ad7-4fdb-b231-b3a5869e56df', note: 'It had no symbol.', symbol: r`$T_n$` },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const H = v(r`$h$`, 'the step or strip width');
const FX = v(r`$f$`, 'the function');
const SYS = v(r`$a_{ij}, b_i$`, r`coefficients and right side of $A\vec{x} = \vec{b}$`);
const TABLE = v(r`$(x_i, y_i)$`, 'the tabulated points');
const ODE = v(r`$f(x, y)$`, r`the slope $y'$`);

const drafts = [
    // Errors and Approximation
    F(ERR, null, 'True Error and True Relative Error', r`$E_t$`, r`$E_t = x_{\text{true}} - x_{\text{approx}},\qquad \varepsilon_t = \frac{|E_t|}{|x_{\text{true}}|}\times 100\%$`,
        [v(r`$x_{\text{true}}$`, 'the exact value'), v(r`$x_{\text{approx}}$`, 'the approximation')],
        'How far an approximation is from the exact value, as an amount and as a share of it.',
        'Only usable when the exact value is known; in an iteration use the approximate error.'),
    F(ERR, null, 'Approximate Relative Error', r`$\varepsilon_a$`, r`$\varepsilon_a = \left|\frac{x_{\text{new}} - x_{\text{old}}}{x_{\text{new}}}\right|\times 100\%$`,
        [v(r`$x_{\text{new}}, x_{\text{old}}$`, 'the latest two iterates')],
        'The change between two iterations, as a share of the newest: the usual stopping test.',
        r`Divide by the NEW value. Stop when $\varepsilon_a < \varepsilon_s$.`),
    F(ERR, null, 'Tolerance for n Significant Figures', r`$\varepsilon_s$`, r`$\varepsilon_s = \left(0.5\times 10^{2 - n}\right)\%$`,
        [v(r`$n$`, 'the significant figures wanted')],
        'The stopping tolerance that guarantees an answer correct to at least n significant figures (Scarborough).',
        r`$n = 3$ gives $0.05\%$; $n = 4$ gives $0.005\%$.`),
    F(ERR, null, 'Machine Epsilon', r`$\epsilon_{\text{mach}}$`, r`$\epsilon_{\text{mach}} = \beta^{1 - t}\ \text{(chopping)},\qquad \tfrac12\beta^{1 - t}\ \text{(rounding)}$`,
        [v(r`$\beta$`, 'the number base'), v(r`$t$`, 'the digits in the mantissa')],
        'The largest relative error in storing a number with t digits in base β.',
        r`IEEE double: $\beta = 2$, $t = 53$, so the spacing at 1 is $2^{-52} \approx 2.22\times10^{-16}$.`),
    F(ERR, null, 'Propagation of Error', r`$\Delta f$`, r`$\Delta f \approx |f'(\tilde{x})|\,\Delta x;\qquad \Delta f(x_1, \ldots, x_n) \approx \sum_i \left|\frac{\partial f}{\partial x_i}\right|\Delta x_i$`,
        [v(r`$\tilde{x}$`, 'the measured or approximate value'), v(r`$\Delta x$`, 'its error')],
        'How errors in the inputs carry into the result, to first order.',
        'For a product or quotient, the relative errors add.'),
    F(ERR, null, 'Condition Number of a Function', r`$CN$`, r`$CN = \left|\frac{\tilde{x}\,f'(\tilde{x})}{f(\tilde{x})}\right|$`,
        [v(r`$\tilde{x}$`, 'the input'), FX],
        'How much a relative error in the input is magnified in the output.',
        r`$CN > 1$ magnifies errors (ill-conditioned); $\sqrt{x}$ has $CN = \frac12$ everywhere.`),
    // Bisection and False Position
    F(BIS, null, 'False Position Method', r`$c$`, r`$c = \frac{a\,f(b) - b\,f(a)}{f(b) - f(a)}$`,
        [v(r`$a, b$`, 'ends of an interval holding the root'), FX],
        'Where the chord joining the interval\'s ends crosses the axis: the next estimate of the root (regula falsi).',
        'Keep the half where the sign changes, as in bisection. It is usually faster, but one end can get stuck.'),
    F(BIS, null, 'Bisection Steps for a Tolerance', r`$n$`, r`$|E_n| \le \frac{b - a}{2^n},\qquad n \ge \frac{\ln\left[(b - a)/\varepsilon\right]}{\ln 2}$`,
        [v(r`$b - a$`, 'the starting interval'), v(r`$\varepsilon$`, 'the error allowed')],
        'Each halving cuts the bracket in two, so the steps needed are known before you start.',
        'Round n up. From a width of 1, ten steps give an error under 0.001.'),
    // Newton-Raphson and Secant
    F(NR, null, 'Newton-Raphson for a Square Root', r`$x_{n+1}$`, r`$x_{n+1} = \frac12\left(x_n + \frac{N}{x_n}\right)$`,
        [v(r`$N$`, 'the number'), v(r`$x_n$`, 'the current estimate')],
        r`Newton's method on $x^2 - N = 0$: average the estimate and $N$ over it.`,
        'The correct digits roughly double each step.'),
    F(NR, null, 'Order of Convergence', r`$E_{n+1}$`, r`$E_{n+1} \approx \frac{f''(r)}{2f'(r)}E_n^2\ \text{(Newton)};\qquad |E_{n+1}| \approx C|E_n|^{1.618}\ \text{(secant)}$`,
        [v(r`$E_n$`, 'the error at step n'), v(r`$r$`, 'the root')],
        'Newton\'s method converges quadratically, the secant method with order 1.618, bisection linearly.',
        'At a repeated root Newton drops to linear convergence.'),
    F(NR, null, 'Fixed-Point Iteration', r`$x_{n+1} = g(x_n)$`, r`$x_{n+1} = g(x_n),\qquad \text{converges if } |g'(x)| < 1 \text{ near the root}$`,
        [v(r`$g$`, r`a rearrangement of $f(x) = 0$ as $x = g(x)$`)],
        'Rearrange the equation as x = g(x) and feed each answer back in.',
        r`The error shrinks by about $|g'(r)|$ each step; $x = \cos x$ settles at $0.7391$.`),
    F(NR, null, 'Newton-Raphson for Two Equations', r`$J\,\Delta\vec{x} = -\vec{F}$`, r`$\begin{bmatrix}f_x & f_y\\ g_x & g_y\end{bmatrix}\begin{bmatrix}\Delta x\\ \Delta y\end{bmatrix} = -\begin{bmatrix}f\\ g\end{bmatrix}$`,
        [v(r`$f, g$`, 'the two equations, set to zero'), v(r`$J$`, 'the Jacobian at the current point')],
        'Each step solves a linear system with the Jacobian, then adds the correction.',
        r`$x_{n+1} = x_n + \Delta x$, $y_{n+1} = y_n + \Delta y$.`),
    // Gaussian Elimination and LU
    F(GE, null, 'Gaussian Elimination', r`$m_{ik}$`, r`$R_i \leftarrow R_i - m_{ik}R_k,\quad m_{ik} = \frac{a_{ik}}{a_{kk}};\qquad x_i = \frac{b_i - \sum_{j > i} a_{ij}x_j}{a_{ii}}$`,
        [SYS, v(r`$m_{ik}$`, 'the multiplier for row i at step k')],
        'Clear the entries below each pivot, then solve from the last equation up (back substitution).',
        'Carry the right-hand side along with each row operation.'),
    F(GE, null, 'Partial Pivoting', r`$|a_{pk}|$`, r`$|a_{pk}| = \max_{i \ge k}|a_{ik}| \ \Rightarrow\ \text{swap rows } p \text{ and } k$`,
        [v(r`$a_{ik}$`, 'entries of column k on or below the diagonal')],
        'Before clearing a column, bring up the row with the largest entry there.',
        'A tiny pivot makes huge multipliers and wrecks the answer with round-off; pivoting avoids it.'),
    F(GE, null, 'LU Decomposition', r`$A = LU$`, r`$A = LU:\quad L\vec{y} = \vec{b}\ \text{(forward)},\quad U\vec{x} = \vec{y}\ \text{(back)}$`,
        [v(r`$L$`, 'lower triangular (Doolittle: ones on the diagonal)'), v(r`$U$`, 'upper triangular')],
        'Factor once, then solve for any right-hand side with two triangular solves.',
        'Doolittle puts the ones in L, Crout in U. L holds the elimination multipliers.'),
    F(GE, null, 'Determinant from LU', r`$\det A$`, r`$\det A = (-1)^s\prod_{i} u_{ii}$`,
        [v(r`$u_{ii}$`, 'the diagonal of U'), v(r`$s$`, 'the number of row swaps')],
        'After elimination, the determinant is the product of the pivots.',
        'Each row swap flips the sign.'),
    F(GE, null, 'Operation Count of Elimination', r`$\frac{2n^3}{3}$`, r`$\text{elimination} \approx \frac{2n^3}{3}\ \text{flops},\qquad \text{back substitution} \approx n^2$`,
        [v(r`$n$`, 'the number of equations')],
        'The work grows with the cube of the size: doubling n costs eight times as much.',
        'This is why a factorisation is reused for many right-hand sides.'),
    // Jacobi and Gauss-Seidel
    F(JGS, null, 'Jacobi Iteration', r`$x_i^{(k+1)}$`, r`$x_i^{(k+1)} = \frac{1}{a_{ii}}\left(b_i - \sum_{j \ne i} a_{ij}x_j^{(k)}\right)$`,
        [SYS, v(r`$k$`, 'the iteration')],
        'Solve each equation for its own unknown, using only the previous iteration\'s values.',
        'Start from zeros if nothing better is known.'),
    F(JGS, null, 'Gauss-Seidel Iteration', r`$x_i^{(k+1)}$`, r`$x_i^{(k+1)} = \frac{1}{a_{ii}}\left(b_i - \sum_{j < i} a_{ij}x_j^{(k+1)} - \sum_{j > i} a_{ij}x_j^{(k)}\right)$`,
        [SYS, v(r`$k$`, 'the iteration')],
        'Like Jacobi, but each new value is used as soon as it is found.',
        'It usually converges about twice as fast as Jacobi.'),
    F(JGS, null, 'Diagonal Dominance', r`$|a_{ii}|$`, r`$|a_{ii}| > \sum_{j \ne i}|a_{ij}| \ \text{for every row}$`,
        [v(r`$a_{ij}$`, 'the coefficient matrix')],
        'If each diagonal entry outweighs the rest of its row, Jacobi and Gauss-Seidel both converge.',
        'Reorder the equations to put the largest coefficients on the diagonal first.'),
    F(JGS, null, 'Successive Over-Relaxation', r`$\omega$`, r`$x_i^{\text{new}} = \omega\,x_i^{\text{GS}} + (1 - \omega)\,x_i^{\text{old}}$`,
        [v(r`$\omega$`, 'the relaxation factor, between 0 and 2'), v(r`$x_i^{\text{GS}}$`, 'the Gauss-Seidel value')],
        'A weighted step past (or short of) the Gauss-Seidel value to speed convergence.',
        r`$\omega = 1$ is Gauss-Seidel; $1 < \omega < 2$ over-relaxes.`),
    // Newton's Interpolation
    F(NI, null, 'Linear Interpolation', r`$y$`, r`$y = y_0 + \frac{y_1 - y_0}{x_1 - x_0}(x - x_0)$`,
        [v(r`$(x_0, y_0), (x_1, y_1)$`, 'the table entries either side')],
        'A value between two table entries, read off the straight line joining them.',
        'Steam tables and log tables are read this way.'),
    F(NI, null, 'Divided Differences', r`$f[x_0, x_1]$`, r`$f[x_i, x_{i+1}] = \frac{f(x_{i+1}) - f(x_i)}{x_{i+1} - x_i},\qquad f[x_0, \ldots, x_k] = \frac{f[x_1, \ldots, x_k] - f[x_0, \ldots, x_{k-1}]}{x_k - x_0}$`,
        [TABLE],
        'The table of slopes, slopes of slopes, and so on, that builds Newton\'s polynomial.',
        'Divide by the span of the WHOLE set of points at each level, not by the step.'),
    F(NI, null, "Newton's Divided-Difference Polynomial", r`$P_n(x)$`, r`$P_n(x) = f[x_0] + f[x_0, x_1](x - x_0) + f[x_0, x_1, x_2](x - x_0)(x - x_1) + \cdots$`,
        [TABLE],
        'The interpolating polynomial built from the top diagonal of the divided-difference table.',
        'Adding a point adds one term; the earlier terms stay.'),
    F(NI, null, "Newton's Forward-Difference Formula", r`$P(x_0 + sh)$`, r`$P(x_0 + sh) = y_0 + s\,\Delta y_0 + \frac{s(s - 1)}{2!}\Delta^2 y_0 + \frac{s(s - 1)(s - 2)}{3!}\Delta^3 y_0 + \cdots$`,
        [v(r`$s$`, r`$\frac{x - x_0}{h}$`), v(r`$\Delta y_0$`, r`forward differences, $\Delta y_i = y_{i+1} - y_i$`), H],
        'Interpolation on equally spaced points, for a value near the start of the table.',
        r`$s$ counts steps from $x_0$, so it may be a fraction.`),
    F(NI, null, "Newton's Backward-Difference Formula", r`$P(x_n + sh)$`, r`$P(x_n + sh) = y_n + s\,\nabla y_n + \frac{s(s + 1)}{2!}\nabla^2 y_n + \frac{s(s + 1)(s + 2)}{3!}\nabla^3 y_n + \cdots$`,
        [v(r`$s$`, r`$\frac{x - x_n}{h}$, negative inside the table`), v(r`$\nabla y_n$`, r`backward differences, $\nabla y_i = y_i - y_{i-1}$`), H],
        'Interpolation on equally spaced points, for a value near the end of the table.',
        'The factors grow as s, s + 1, s + 2: the signs differ from the forward formula.'),
    F(NI, null, 'Interpolation Error', r`$f(x) - P_n(x)$`, r`$f(x) - P_n(x) = \frac{f^{(n+1)}(\xi)}{(n + 1)!}\prod_{i=0}^{n}(x - x_i)$`,
        [v(r`$P_n$`, r`the polynomial through $n + 1$ points`), v(r`$\xi$`, 'some point in the span of the data')],
        'How far the interpolating polynomial can be from the function.',
        'The error is smallest near the middle of the points; extrapolating is risky.'),
    // Lagrange Interpolation
    F(LI, null, 'Lagrange Interpolating Polynomial', r`$P(x)$`, r`$P(x) = \sum_{i=0}^{n} y_i L_i(x),\qquad L_i(x) = \prod_{j \ne i}\frac{x - x_j}{x_i - x_j}$`,
        [TABLE],
        'The polynomial through n + 1 points, written as a weighted sum of the y-values.',
        'It is the same polynomial as Newton\'s, written another way; points need not be equally spaced.'),
    F(LI, null, 'Lagrange Basis Properties', r`$L_i(x_j)$`, r`$L_i(x_j) = \begin{cases}1 & i = j\\ 0 & i \ne j\end{cases},\qquad \sum_{i} L_i(x) = 1$`,
        [v(r`$L_i$`, 'the Lagrange basis polynomials')],
        'Each basis polynomial is 1 at its own point and 0 at the others; together they add to 1.',
        'A quick check of your arithmetic: the weights at any x must sum to 1.'),
    F(LI, null, 'Inverse Interpolation', r`$x(y)$`, r`$x = \sum_{i} x_i \prod_{j \ne i}\frac{y - y_j}{y_i - y_j}$`,
        [TABLE, v(r`$y$`, 'the value whose x is wanted')],
        'Swap the roles of x and y to find where a tabulated function reaches a given value.',
        'Setting y = 0 estimates a root from a table; it needs the y-values to be all different.'),
    // Least-Squares Curve Fitting
    F(LS, null, 'Least-Squares Line', r`$y = a + bx$`, r`$b = \frac{n\sum xy - \sum x\sum y}{n\sum x^2 - \left(\sum x\right)^2},\qquad a = \bar{y} - b\,\bar{x}$`,
        [v(r`$n$`, 'the number of points'), v(r`$\bar{x}, \bar{y}$`, 'the means')],
        'The straight line that makes the sum of squared vertical misses smallest.',
        r`The line passes through $(\bar{x}, \bar{y})$. Calculators do it in REG mode.`),
    F(LS, null, 'Normal Equations', r`$A^{\mathsf T}A\,\vec{c} = A^{\mathsf T}\vec{y}$`, r`$\textstyle\sum y = na + b\sum x,\quad \sum xy = a\sum x + b\sum x^2;\qquad A^{\mathsf T}A\,\vec{c} = A^{\mathsf T}\vec{y}$`,
        [v(r`$A$`, 'one row per point, one column per term of the model'), v(r`$\vec{c}$`, 'the coefficients')],
        'The linear system whose solution is the least-squares fit, for a line or any polynomial.',
        r`For a parabola add $\sum x^2y = a\sum x^2 + b\sum x^3 + c\sum x^4$ and the matching first two.`),
    F(LS, null, 'Coefficient of Determination', r`$r^2$`, r`$r^2 = 1 - \frac{S_r}{S_t},\qquad S_r = \sum(y_i - \hat{y}_i)^2,\quad S_t = \sum(y_i - \bar{y})^2$`,
        [v(r`$\hat{y}_i$`, 'the fitted values'), v(r`$\bar{y}$`, 'the mean of the data')],
        'The share of the spread in y that the fit explains.',
        r`$r^2 = 1$ is a perfect fit; for a line, $r$ is the correlation coefficient.`),
    F(LS, null, 'Standard Error of the Estimate', r`$s_{y/x}$`, r`$s_{y/x} = \sqrt{\frac{S_r}{n - (m + 1)}}$`,
        [v(r`$S_r$`, 'the sum of squared residuals'), v(r`$m$`, 'the degree of the fitted polynomial (1 for a line)')],
        'The typical size of a data point\'s miss from the fitted curve.',
        'A line uses n − 2.'),
    F(LS, null, 'Linearizing Exponential and Power Fits', r`$\ln y$`, r`$y = ae^{bx} \Rightarrow \ln y = \ln a + bx;\qquad y = ax^b \Rightarrow \log y = \log a + b\log x$`,
        [v(r`$a, b$`, 'the model\'s constants')],
        'Take logarithms to turn a curved model into a straight line, fit the line, then convert back.',
        r`The fitted intercept is $\ln a$ (or $\log a$): take its antilog for $a$.`),
    // Numerical Differentiation
    F(ND, null, 'Forward and Backward Differences', r`$f'(x)$`, r`$f'(x) \approx \frac{f(x + h) - f(x)}{h},\qquad f'(x) \approx \frac{f(x) - f(x - h)}{h}\qquad O(h)$`,
        [FX, H],
        'The slope from one step ahead or behind; the error shrinks in proportion to h.',
        r`The error is about $\frac{h}{2}f''(x)$.`),
    F(ND, null, 'Central Difference First Derivative', r`$f'(x)$`, r`$f'(x) \approx \frac{f(x + h) - f(x - h)}{2h}\qquad O(h^2)$`,
        [FX, H],
        'The slope from the points either side: much more accurate than a one-sided difference.',
        'Halving h quarters the error. Too small an h lets round-off take over.'),
    F(ND, null, 'Central Difference Second Derivative', r`$f''(x)$`, r`$f''(x) \approx \frac{f(x + h) - 2f(x) + f(x - h)}{h^2}\qquad O(h^2)$`,
        [FX, H],
        'The second derivative from three equally spaced values.',
        'The same pattern 1, −2, 1 appears in finite-difference solutions of differential equations.'),
    F(ND, null, 'Richardson Extrapolation', r`$D$`, r`$D \approx \frac{4D(h/2) - D(h)}{3}$`,
        [v(r`$D(h)$`, r`an $O(h^2)$ estimate with step $h$`)],
        'Combine two estimates of an O(h²) method to cancel the leading error term.',
        r`For an $O(h^p)$ method use $\frac{2^pD(h/2) - D(h)}{2^p - 1}$.`),
    // Trapezoidal and Simpson's Rules
    F(TS, null, "Simpson's Three-Eighths Rule", r`$S_{3/8}$`, r`$\int_a^b f\,dx \approx \frac{3h}{8}\left[y_0 + 3y_1 + 3y_2 + 2y_3 + 3y_4 + \cdots + 3y_{n-1} + y_n\right]$`,
        [H, v(r`$y_i$`, 'function values'), v(r`$n$`, 'the number of strips, a multiple of 3')],
        'Estimates an integral with cubic pieces over three strips at a time.',
        r`With an odd number of strips, use $\frac38$ on three of them and $\frac13$ on the rest.`),
    F(TS, null, 'Errors of the Trapezoidal and Simpson Rules', r`$E$`, r`$E_T = -\frac{(b - a)h^2}{12}f''(\xi),\qquad E_S = -\frac{(b - a)h^4}{180}f^{(4)}(\xi)$`,
        [H, v(r`$\xi$`, r`some point in $[a, b]$`)],
        'The trapezoidal rule\'s error shrinks with h², Simpson\'s with h⁴.',
        'Simpson\'s rule is exact for cubics; the trapezoidal rule only for straight lines.'),
    F(TS, null, 'Midpoint Rule', r`$M_n$`, r`$\int_a^b f\,dx \approx h\sum_{i=1}^{n} f\!\left(\frac{x_{i-1} + x_i}{2}\right)$`,
        [H, v(r`$n$`, 'the number of strips')],
        'Each strip\'s height is the function at its middle.',
        r`Its error is about half the trapezoidal rule's, with the opposite sign: $E_M \approx -\frac12E_T$.`),
    F(TS, null, 'Romberg Integration', r`$R$`, r`$I \approx \frac{4\,T(h/2) - T(h)}{3},\qquad \text{then } \frac{16\,I(h/2) - I(h)}{15}, \ldots$`,
        [v(r`$T(h)$`, 'the trapezoidal estimate with strip width h')],
        'Richardson extrapolation applied to the trapezoidal rule, level by level.',
        'The first level is exactly Simpson\'s one-third rule.'),
    F(TS, null, 'Two-Point Gauss-Legendre Quadrature', r`$G_2$`, r`$\int_{-1}^{1} f\,dx \approx f\!\left(-\tfrac{1}{\sqrt3}\right) + f\!\left(\tfrac{1}{\sqrt3}\right);\quad x = \tfrac{b + a}{2} + \tfrac{b - a}{2}t,\ dx = \tfrac{b - a}{2}dt$`,
        [v(r`$t$`, r`the variable on $[-1, 1]$`)],
        'Two well-chosen points integrate any cubic exactly.',
        r`Map $[a, b]$ to $[-1, 1]$ first, and multiply by $\frac{b - a}{2}$.`),
    // Euler and Runge-Kutta Methods
    F(RK, null, "Heun's Method", r`$y_{n+1}$`, r`$y_{n+1} = y_n + \frac{h}{2}\left[f(x_n, y_n) + f\big(x_{n+1},\ y_n + h f(x_n, y_n)\big)\right]$`,
        [ODE, H],
        'Improved Euler: average the slope at the start and at an Euler-predicted end.',
        'It is a second-order Runge-Kutta method: predict, then correct.'),
    F(RK, null, 'Midpoint Method for an ODE', r`$y_{n+1}$`, r`$y_{n+1} = y_n + h\,f\!\left(x_n + \tfrac{h}{2},\ y_n + \tfrac{h}{2}f(x_n, y_n)\right)$`,
        [ODE, H],
        'Step with the slope found halfway across the interval.',
        'Also second order, like Heun\'s method (modified Euler in some texts).'),
    F(RK, null, 'Fourth-Order Runge-Kutta Method', r`$y_{n+1}$`, r`$y_{n+1} = y_n + \frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)$; $k_1 = f(x_n, y_n),\ k_2 = f(x_n + \frac{h}{2}, y_n + \frac{h}{2}k_1),\ k_3 = f(x_n + \frac{h}{2}, y_n + \frac{h}{2}k_2),\ k_4 = f(x_n + h, y_n + hk_3)$`,
        [ODE, H],
        'The standard method for ODEs: four slopes per step, weighted 1, 2, 2, 1.',
        'Use radians, and carry many digits through each k.'),
    F(RK, null, 'Order of Accuracy of ODE Methods', r`$O(h^p)$`, r`$\text{global error: Euler } O(h),\quad \text{Heun / midpoint } O(h^2),\quad \text{RK4 } O(h^4)$`,
        [H, v(r`$p$`, 'the order of the method')],
        'Halving the step cuts the error by 2, 4 or 16 for these methods.',
        r`The local error per step is one order higher, $O(h^{p+1})$.`),
    // Optimization
    F(OPT, null, 'Golden-Section Search', r`$R$`, r`$x_1 = a + R(b - a),\quad x_2 = b - R(b - a),\qquad R = \frac{\sqrt5 - 1}{2} \approx 0.618$`,
        [v(r`$[a, b]$`, 'an interval with one maximum or minimum')],
        'Narrow the interval round an optimum, reusing one point each step.',
        'Each step keeps 61.8% of the interval; for a minimum, drop the side of the larger value.'),
    F(OPT, null, "Newton's Method for an Optimum", r`$x_{n+1}$`, r`$x_{n+1} = x_n - \frac{f'(x_n)}{f''(x_n)}$`,
        [FX, v(r`$x_n$`, 'the current estimate')],
        r`Newton-Raphson applied to $f'(x) = 0$, to find where a function levels off.`,
        r`It finds maxima and minima alike: check the sign of $f''$ at the answer.`),
    F(OPT, null, 'Parabolic Interpolation for an Optimum', r`$x_3$`, r`$x_3 = \frac{f_0(x_1^2 - x_2^2) + f_1(x_2^2 - x_0^2) + f_2(x_0^2 - x_1^2)}{2\left[f_0(x_1 - x_2) + f_1(x_2 - x_0) + f_2(x_0 - x_1)\right]}$`,
        [v(r`$x_0, x_1, x_2$`, 'three points near the optimum'), v(r`$f_i$`, r`$f(x_i)$`)],
        'The vertex of the parabola through three points: the next estimate of the optimum.',
        'For a quadratic function it is exact in one step.'),
    F(OPT, null, 'Steepest Descent', r`$\vec{x}_{k+1}$`, r`$\vec{x}_{k+1} = \vec{x}_k - \alpha\,\nabla f(\vec{x}_k)$`,
        [v(r`$\nabla f$`, 'the gradient'), v(r`$\alpha$`, 'the step length')],
        'Step downhill along the negative gradient to minimise a function of several variables.',
        'To maximise, step along +∇f (steepest ascent). Too large a step overshoots.'),
    F(OPT, null, 'Lagrange Multipliers', r`$\lambda$`, r`$\nabla f = \lambda\,\nabla g,\qquad g(x, y) = 0$`,
        [v(r`$f$`, 'the function to optimise'), v(r`$g = 0$`, 'the constraint'), v(r`$\lambda$`, 'the multiplier')],
        'At a constrained optimum the gradients of the function and the constraint are parallel.',
        r`Solve $f_x = \lambda g_x$, $f_y = \lambda g_y$ and $g = 0$ together; compare $f$ at every solution.`),
    F(OPT, null, 'Corner-Point Rule of Linear Programming', r`$z$`, r`$\max\text{ or }\min\ z = c_1x + c_2y \text{ over the feasible region occurs at a corner point}$`,
        [v(r`$c_1, c_2$`, 'the objective\'s coefficients')],
        'A linear objective over a region bounded by lines is best at one of the region\'s corners.',
        'Find the corners by solving the boundary lines in pairs, keep the feasible ones, and evaluate z at each.'),
];

module.exports = { subject: 'Mathematics', topic: 'Numerical Methods & Analysis', migration: '20261207000000_cards_numerical_methods', file, revisions, retire, drafts };
