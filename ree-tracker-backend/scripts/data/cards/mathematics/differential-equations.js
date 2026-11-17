'use strict';

// Mathematics › Differential Equations formula cards (Library round,
// 2026-11-17): six live cards for 14 subtopics. See algebra.js for the format;
// tests/differentialEquationsFormulas.test.js checks every solution by putting
// it back into its equation (numerical derivatives) or against a step-by-step
// numerical solution, and every transform by numerical integration. Names held
// by rejected cards (the "Second-Order ODE with ..." trio, "Bernoulli
// Differential Equation", "Separable First-Order Differential Equation",
// "Laplace Transform of First Derivative") are not reused.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const ORDER = 'Order, Degree and Solutions';
const SEP = 'Separable Equations';
const HOM = 'Homogeneous Equations';
const EXACT = 'Exact Equations and Integrating Factors';
const LIN = 'Linear First-Order';
const BERN = "Bernoulli's Equation";
const GROW = 'Growth, Decay and Cooling';
const MIX = 'Mixing and Circuit Applications';
const HIGH = 'Higher-Order with Constant Coefficients';
const UND = 'Undetermined Coefficients';
const VAR = 'Variation of Parameters';
const CE = 'Cauchy-Euler Equations';
const LAP = 'Laplace Transform Solutions';
const SYS = 'Systems of Differential Equations';

const file = [
    ['b236ee35-72a8-4016-a262-22c52c2a4bba', LIN, null],
    ['11b8c7ff-652b-466b-82ea-db3b16caaf45', GROW, null],
    ['27d03c46-c82d-445b-be60-752ff0ba2865', GROW, null],
    ['b76b5e00-2ef2-49fc-b9a8-98a42f3752c5', HIGH, null],
    ['75e240b8-44b2-4bb3-a4ca-8b44a280358e', LAP, 'Transforms'],
    ['9da96138-c2e3-4360-8b9d-9c4be1db89e4', LAP, 'Derivatives'],
];

const revisions = [
    { id: 'b76b5e00-2ef2-49fc-b9a8-98a42f3752c5', note: 'It had no symbol.', symbol: r`$ar^2 + br + c$` },
    { id: '9da96138-c2e3-4360-8b9d-9c4be1db89e4', note: 'It had no symbol.', symbol: r`$\mathcal{L}\{f'(t)\}$` },
    {
        id: 'b236ee35-72a8-4016-a262-22c52c2a4bba',
        note: 'It gave the factor but not the solution it leads to.',
        f: r`$\mu = e^{\int P(x)\,dx},\qquad y\,\mu = \int Q(x)\,\mu\,dx + C$`,
        vars: [v(r`$\mu$`, 'the integrating factor'), v(r`$P(x), Q(x)$`, r`from $y' + P(x)y = Q(x)$`), v(r`$C$`, 'the constant of integration')],
    },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const CS = v(r`$C_1, C_2$`, 'arbitrary constants');

const drafts = [
    // Order, Degree and Solutions
    F(ORDER, null, 'Order and Degree of a Differential Equation', r`$y^{(n)}$`, r`$\text{order} = n \text{ of the highest derivative } y^{(n)},\qquad \text{degree} = \text{its power, once radicals and fractions are cleared}$`,
        [v(r`$y^{(n)}$`, 'the highest derivative present')],
        'How to read the order and degree of a differential equation.',
        r`$(y'')^3 + y' = x$ is order 2, degree 3; $\sqrt{y'} = y''$ must be squared first: order 2, degree 2.`),
    F(ORDER, null, 'General and Particular Solutions', r`$y(x; C_1, \ldots, C_n)$`, r`$n\text{th order} \implies n \text{ arbitrary constants};\qquad \text{a family with } n \text{ constants} \implies \text{an } n\text{th-order equation}$`,
        [v(r`$n$`, 'the order')],
        'A general solution has as many constants as the order; initial conditions fix them for a particular solution.',
        'To find the equation of a family, differentiate as many times as there are constants and eliminate them.'),
    F(ORDER, null, 'Linear Differential Equation Form', r`$a_n(x)y^{(n)}$`, r`$a_n(x)y^{(n)} + \cdots + a_1(x)y' + a_0(x)y = g(x)$`,
        [v(r`$a_k(x)$`, 'coefficients depending on x only'), v(r`$g(x)$`, r`the forcing; $g = 0$ is homogeneous`)],
        'Linear means y and its derivatives appear to the first power, never multiplied together.',
        r`$yy' = x$ and $y' = \sin y$ are nonlinear.`),
    // Separable Equations
    F(SEP, null, 'Separable Equation', r`$M(x)\,dx + N(y)\,dy = 0$`, r`$M(x)\,dx + N(y)\,dy = 0 \implies \int M(x)\,dx + \int N(y)\,dy = C$`,
        [v(r`$M, N$`, 'functions of one variable each')],
        'Move every x to one side and every y to the other, then integrate both.',
        'Dividing by a function of y can lose a constant solution where that function is 0.'),
    F(SEP, null, 'Equations Reducible to Separable', r`$u = ax + by + c$`, r`$y' = f(ax + by + c):\quad u = ax + by + c,\quad u' = a + b\,f(u)$`,
        [v(r`$u$`, 'the new variable'), v(r`$a, b, c$`, 'constants')],
        'A right side that depends only on a linear combination of x and y becomes separable.',
        r`$y' = (x + y)^2$: $u = x + y$, $u' = 1 + u^2$, so $\tan^{-1}u = x + C$.`),
    // Homogeneous Equations
    F(HOM, null, 'Homogeneous Function Test', r`$f(tx, ty) = t^n f(x, y)$`, r`$f(tx, ty) = t^n f(x, y)$`,
        [v(r`$n$`, 'the degree of homogeneity'), v(r`$t$`, 'any scale factor')],
        'M dx + N dy = 0 is homogeneous when M and N are homogeneous of the same degree.',
        r`$x^2 + xy$ is degree 2; $x^2 + y$ is not homogeneous.`),
    F(HOM, null, 'Homogeneous Equation Substitution', r`$y = vx$`, r`$y = vx,\quad dy = v\,dx + x\,dv \implies \text{separable in } v \text{ and } x$`,
        [v(r`$v$`, r`the new variable $\frac{y}{x}$`)],
        'Put y = vx in a homogeneous equation and it separates.',
        'Use x = vy instead when it makes the algebra lighter.'),
    // Exact Equations and Integrating Factors
    F(EXACT, null, 'Test for Exactness', r`$M_y = N_x$`, r`$M\,dx + N\,dy = 0 \text{ is exact} \iff \frac{\partial M}{\partial y} = \frac{\partial N}{\partial x}$`,
        [v(r`$M(x, y), N(x, y)$`, 'the coefficients of dx and dy')],
        'When M dx + N dy is the total differential of some F(x, y).',
        'Check the cross-partials before trying anything else.'),
    F(EXACT, null, 'Solving an Exact Equation', r`$F(x, y) = C$`, r`$F_x = M,\ F_y = N:\quad F = \int M\,dx + h(y),\ \ h'(y) = N - \frac{\partial}{\partial y}\int M\,dx;\quad F(x, y) = C$`,
        [v(r`$F$`, 'the potential function'), v(r`$h(y)$`, 'the part that depends on y only')],
        'Integrate M in x, then fix the leftover function of y from N.',
        'The answer is F = C, an implicit solution.'),
    F(EXACT, null, 'Integrating Factor for a Non-Exact Equation', r`$\mu(x)$`, r`$\frac{M_y - N_x}{N} = f(x) \implies \mu = e^{\int f\,dx};\qquad \frac{N_x - M_y}{M} = g(y) \implies \mu = e^{\int g\,dy}$`,
        [v(r`$M_y, N_x$`, 'the cross-partials')],
        'A factor that makes a non-exact equation exact, when the quotient depends on one variable only.',
        'Multiply the whole equation by μ, then solve it as exact.'),
    // Linear First-Order
    F(LIN, null, 'Linear Equation with Constant Coefficients', r`$y' + ay = b$`, r`$y' + ay = b \implies y = \frac{b}{a} + Ce^{-ax}$`,
        [v(r`$a, b$`, r`constants, $a \ne 0$`), v(r`$C$`, 'from the initial condition')],
        'The steady value b/a plus a dying exponential: the shape of every RC and RL transient.',
        'The time constant is 1/a.'),
    // Bernoulli's Equation
    F(BERN, null, "Bernoulli's Equation", r`$y' + Py = Qy^n$`, r`$y' + P(x)y = Q(x)y^n:\quad v = y^{1 - n} \implies v' + (1 - n)Pv = (1 - n)Q$`,
        [v(r`$n$`, 'any real number except 0 and 1'), v(r`$v$`, 'the new variable')],
        'A nonlinear equation that becomes linear in v = y¹⁻ⁿ.',
        r`Solve the linear equation for $v$, then $y = v^{1/(1-n)}$.`),
    // Growth, Decay and Cooling
    F(GROW, null, 'Half-Life and Doubling Time', r`$t_{1/2}$`, r`$t_{1/2} = \frac{\ln 2}{|k|},\qquad y = y_0\left(\tfrac12\right)^{t/t_{1/2}}$`,
        [v(r`$k$`, r`the rate in $y = y_0e^{kt}$`), v(r`$t_{1/2}$`, 'half-life (or doubling time, for growth)')],
        'How long a decaying quantity takes to halve, or a growing one to double.',
        'Carbon dating: C-14 has a half-life of about 5730 years.'),
    F(GROW, null, 'Logistic Growth', r`$P(t)$`, r`$\frac{dP}{dt} = kP\left(1 - \frac{P}{M}\right) \implies P = \frac{M}{1 + Ae^{-kt}},\ A = \frac{M - P_0}{P_0}$`,
        [v(r`$M$`, 'the carrying capacity'), v(r`$k$`, 'the growth rate'), v(r`$P_0$`, 'the starting value')],
        'Growth that slows as it nears a limit.',
        'It grows fastest at P = M/2, the inflection point.'),
    F(GROW, null, 'Continuously Compounded Interest', r`$A = Pe^{rt}$`, r`$\frac{dA}{dt} = rA \implies A = Pe^{rt}$`,
        [v(r`$P$`, 'principal'), v(r`$r$`, 'nominal rate per year'), v(r`$t$`, 'years')],
        'Money growing in proportion to itself, every instant.',
        r`Doubling time $\frac{\ln 2}{r} \approx \frac{70}{100r}$ years (the rule of 70).`),
    // Mixing and Circuit Applications
    F(MIX, 'Mixing', 'Mixing Problem', r`$\frac{dQ}{dt}$`, r`$\frac{dQ}{dt} = r_{\text{in}}c_{\text{in}} - r_{\text{out}}\frac{Q}{V(t)},\qquad V(t) = V_0 + (r_{\text{in}} - r_{\text{out}})t$`,
        [v(r`$Q$`, 'amount of substance in the tank'), v(r`$r_{\text{in}}, r_{\text{out}}$`, 'flow rates'), v(r`$c_{\text{in}}$`, 'incoming concentration'), v(r`$V$`, 'volume in the tank')],
        'Rate in minus rate out, with the tank well stirred.',
        r`With equal flows, $Q \to c_{\text{in}}V_0$: the tank ends at the incoming concentration.`),
    F(MIX, 'Circuits', 'RL Circuit Current', r`$i(t)$`, r`$L\frac{di}{dt} + Ri = E \implies i = \frac{E}{R}\left(1 - e^{-Rt/L}\right),\quad \tau = \frac{L}{R}$`,
        [v(r`$E$`, 'source voltage (dc)'), v(r`$R, L$`, 'resistance and inductance'), v(r`$\tau$`, 'time constant')],
        'Current building up in an inductor after a switch closes.',
        'After one time constant the current is 63.2% of its final value; after five, practically there.'),
    F(MIX, 'Circuits', 'RC Circuit Charging', r`$q(t)$`, r`$R\frac{dq}{dt} + \frac{q}{C} = E \implies q = CE\left(1 - e^{-t/RC}\right),\quad i = \frac{E}{R}e^{-t/RC},\quad \tau = RC$`,
        [v(r`$E$`, 'source voltage'), v(r`$R, C$`, 'resistance and capacitance'), v(r`$\tau$`, 'time constant')],
        'A capacitor charging through a resistor.',
        'Discharging: q = Q₀e^{−t/RC}.'),
    F(MIX, 'Motion', 'Falling Body with Air Resistance', r`$v(t)$`, r`$m\frac{dv}{dt} = mg - kv \implies v = \frac{mg}{k}\left(1 - e^{-kt/m}\right),\quad v_t = \frac{mg}{k}$`,
        [v(r`$m$`, 'mass'), v(r`$k$`, 'drag coefficient'), v(r`$v_t$`, 'terminal velocity')],
        'A body falling against a drag proportional to its speed.',
        'The same equation as the RL circuit, with different letters.'),
    // Higher-Order with Constant Coefficients
    F(HIGH, null, 'General Solution by Root Type', r`$y_h$`, r`$r_1 \ne r_2:\ C_1e^{r_1x} + C_2e^{r_2x};\quad r_1 = r_2:\ (C_1 + C_2x)e^{rx};\quad \alpha \pm j\beta:\ e^{\alpha x}(C_1\cos\beta x + C_2\sin\beta x)$`,
        [v(r`$r$`, 'roots of the characteristic equation'), CS],
        'The homogeneous solution of a constant-coefficient equation, read from its characteristic roots.',
        r`A root of multiplicity $m$ gives $e^{rx}, xe^{rx}, \ldots, x^{m-1}e^{rx}$.`),
    F(HIGH, 'Vibrations', 'Simple Harmonic Motion', r`$x'' + \omega^2x = 0$`, r`$x'' + \omega^2x = 0 \implies x = A\cos(\omega t - \phi),\quad T = \frac{2\pi}{\omega},\quad \omega = \sqrt{\frac{k}{m}}$`,
        [v(r`$\omega$`, 'natural angular frequency'), v(r`$A, \phi$`, 'amplitude and phase'), v(r`$k, m$`, 'spring constant and mass')],
        'Undamped oscillation of a spring and mass.',
        'The period does not depend on the amplitude.'),
    F(HIGH, 'Vibrations', 'Damped Vibration', r`$mx'' + cx' + kx = 0$`, r`$mx'' + cx' + kx = 0:\quad c^2 < 4mk \text{ underdamped},\ c^2 = 4mk \text{ critical},\ c^2 > 4mk \text{ overdamped}$`,
        [v(r`$m, c, k$`, 'mass, damping and stiffness'), v(r`$\zeta = \frac{c}{2\sqrt{mk}}$`, 'damping ratio')],
        'How damping decides whether a system oscillates or creeps back.',
        'Critical damping returns fastest without overshoot; the same test decides an RLC circuit.'),
    // Undetermined Coefficients
    F(UND, null, 'Trial Solutions for Undetermined Coefficients', r`$y_p$`, r`$g = P_n(x) \to A_nx^n + \cdots + A_0;\quad g = e^{ax} \to Ae^{ax};\quad g = \cos bx, \sin bx \to A\cos bx + B\sin bx$`,
        [v(r`$g(x)$`, 'the forcing term'), v(r`$y_p$`, 'the particular solution')],
        'The form to guess for a particular solution, by the shape of the forcing.',
        'If the guess solves the homogeneous equation, multiply it by x (or x²) until it does not.'),
    F(UND, null, 'Resonance', r`$t\sin\omega t$`, r`$x'' + \omega^2x = F_0\cos\omega t \implies x_p = \frac{F_0}{2\omega}t\sin\omega t$`,
        [v(r`$\omega$`, 'natural frequency, equal to the forcing frequency'), v(r`$F_0$`, 'forcing amplitude (per unit mass)')],
        'Forcing at the natural frequency makes the response grow without bound.',
        'This is the "multiply by t" rule at work.'),
    // Variation of Parameters
    F(VAR, null, 'Wronskian', r`$W$`, r`$W(y_1, y_2) = y_1y_2' - y_1'y_2$`, [v(r`$y_1, y_2$`, 'two solutions of the homogeneous equation')],
        'Two solutions are independent exactly when their Wronskian is not zero.',
        r`For $e^{r_1x}, e^{r_2x}$: $W = (r_2 - r_1)e^{(r_1 + r_2)x}$.`),
    F(VAR, null, 'Variation of Parameters', r`$y_p$`, r`$y'' + py' + qy = g:\quad y_p = -y_1\int\frac{y_2\,g}{W}\,dx + y_2\int\frac{y_1\,g}{W}\,dx$`,
        [v(r`$y_1, y_2$`, 'homogeneous solutions'), v(r`$W$`, 'their Wronskian'), v(r`$g$`, 'the forcing, with the leading coefficient 1')],
        'A particular solution for any forcing, when undetermined coefficients has no guess (tan x, sec x, ln x).',
        "Divide by y''s coefficient first: g is the right side of the normalised equation."),
    // Cauchy-Euler Equations
    F(CE, null, 'Cauchy-Euler Equation', r`$ax^2y'' + bxy' + cy = 0$`, r`$ax^2y'' + bxy' + cy = 0,\quad y = x^m:\quad am(m - 1) + bm + c = 0$`,
        [v(r`$a, b, c$`, 'constants'), v(r`$m$`, 'roots of the indicial equation')],
        'Each power of x matches its derivative\'s order: try y = xᵐ.',
        r`Note $m(m - 1)$, not $m^2$.`),
    F(CE, null, 'Cauchy-Euler Solutions by Root Type', r`$x^{m}$`, r`$m_1 \ne m_2:\ C_1x^{m_1} + C_2x^{m_2};\quad m_1 = m_2:\ (C_1 + C_2\ln x)x^m;\quad \alpha \pm j\beta:\ x^\alpha[C_1\cos(\beta\ln x) + C_2\sin(\beta\ln x)]$`,
        [v(r`$m$`, 'roots of the indicial equation'), CS],
        'The general solution of a Cauchy-Euler equation, by the kind of roots.',
        'x = eᵗ turns it into a constant-coefficient equation in t.'),
    // Laplace Transform Solutions
    F(LAP, 'Transforms', 'Table of Laplace Transforms', r`$\mathcal{L}\{f(t)\}$`, r`$1 \to \frac1s,\ t^n \to \frac{n!}{s^{n+1}},\ e^{at} \to \frac{1}{s - a},\ \sin bt \to \frac{b}{s^2 + b^2},\ \cos bt \to \frac{s}{s^2 + b^2},\ \sinh bt \to \frac{b}{s^2 - b^2},\ \cosh bt \to \frac{s}{s^2 - b^2}$`,
        [v(r`$s$`, 'the transform variable'), v(r`$a, b$`, 'constants'), v(r`$n$`, 'a whole number')],
        'The transforms every problem is built from.',
        'Sine has b on top, cosine has s.'),
    F(LAP, 'Theorems', 'First Shifting Theorem', r`$\mathcal{L}\{e^{at}f(t)\}$`, r`$\mathcal{L}\{e^{at}f(t)\} = F(s - a)$`,
        [v(r`$F(s)$`, r`the transform of $f(t)$`), v(r`$a$`, 'a constant')],
        'Multiplying by an exponential shifts the transform.',
        r`$\mathcal{L}\{e^{2t}\sin3t\} = \frac{3}{(s - 2)^2 + 9}$.`),
    F(LAP, 'Theorems', 'Second Shifting Theorem (Unit Step)', r`$\mathcal{L}\{u(t - a)f(t - a)\}$`, r`$\mathcal{L}\{u(t - a)f(t - a)\} = e^{-as}F(s),\qquad \mathcal{L}\{\delta(t - a)\} = e^{-as}$`,
        [v(r`$u(t - a)$`, 'the unit step at t = a'), v(r`$\delta(t - a)$`, 'the unit impulse at t = a')],
        'A delay in time is a factor e^(−as) in s.',
        'Write the function in terms of (t − a) before transforming.'),
    F(LAP, 'Derivatives', 'Laplace Transform of Higher Derivatives', r`$\mathcal{L}\{f''\}$`, r`$\mathcal{L}\{f''(t)\} = s^2F(s) - sf(0) - f'(0),\qquad \mathcal{L}\{f^{(n)}\} = s^nF - s^{n-1}f(0) - \cdots - f^{(n-1)}(0)$`,
        [v(r`$F(s)$`, r`the transform of $f$`), v(r`$f(0), f'(0)$`, 'initial values')],
        'How the initial conditions enter a transformed equation.',
        'One initial value per order, each with a lower power of s.'),
    F(LAP, 'Theorems', 'Multiplication by t and Division by s', r`$\mathcal{L}\{tf(t)\}$`, r`$\mathcal{L}\{tf(t)\} = -F'(s),\qquad \mathcal{L}\left\{\int_0^t f(\tau)\,d\tau\right\} = \frac{F(s)}{s}$`,
        [v(r`$F(s)$`, r`the transform of $f$`)],
        'Multiplying by t differentiates the transform; integrating in time divides it by s.',
        r`$\mathcal{L}\{t\sin bt\} = \frac{2bs}{(s^2 + b^2)^2}$.`),
    F(LAP, 'Theorems', 'Initial and Final Value Theorems', r`$\lim sF(s)$`, r`$f(0^+) = \lim_{s \to \infty}sF(s),\qquad f(\infty) = \lim_{s \to 0}sF(s)$`,
        [v(r`$F(s)$`, r`the transform of $f$`)],
        'The start and end values of f(t) straight from F(s).',
        'The final value theorem only applies when f(t) settles: poles of sF(s) in the left half-plane.'),
    // Systems of Differential Equations
    F(SYS, null, 'Solution of x′ = Ax', r`$\mathbf{x}' = A\mathbf{x}$`, r`$\mathbf{x}' = A\mathbf{x} \implies \mathbf{x} = c_1\mathbf{v}_1e^{\lambda_1t} + c_2\mathbf{v}_2e^{\lambda_2t},\quad A\mathbf{v}_i = \lambda_i\mathbf{v}_i$`,
        [v(r`$A$`, 'a constant matrix'), v(r`$\lambda_i, \mathbf{v}_i$`, 'its eigenvalues and eigenvectors')],
        'A linear system solved by the eigenvalues and eigenvectors of its matrix.',
        'Negative eigenvalues: every solution decays to 0.'),
    F(SYS, null, 'Reducing a 2×2 System to One Equation', r`$x'' - (\text{tr}\,A)x' + (\det A)x = 0$`, r`$x' = ax + by,\ y' = cx + dy \implies x'' - (a + d)x' + (ad - bc)x = 0$`,
        [v(r`$a, b, c, d$`, 'the system\'s coefficients')],
        'Eliminate y to get one second-order equation; its characteristic roots are the eigenvalues.',
        r`$\lambda^2 - (\text{trace})\lambda + \det = 0$.`),
];

module.exports = { subject: 'Mathematics', topic: 'Differential Equations', migration: '20261204000000_cards_differential_equations', file, revisions, retire, drafts };
