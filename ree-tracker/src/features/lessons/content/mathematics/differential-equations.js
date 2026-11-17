// Library › Lessons › Mathematics › Differential Equations (2026-11-17):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order; every worked example checked by hand.
const r = String.raw;

export default {
  topic: 'Differential Equations',
  subject: 'Mathematics',
  overview: r`A differential equation links a quantity to its rates of change. On the board the work is recognising the type (separable, homogeneous, exact, linear, Bernoulli; constant-coefficient, Cauchy-Euler) and applying its method, then the classic applications: growth and decay, cooling, mixing, RL and RC transients, vibrations, and Laplace transforms. Classify first, put the equation in its standard form, and use the initial conditions only at the end.`,
  sources: [
    'Schaum’s Outline of Differential Equations (Bronson and Costa)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Order, Degree and Solutions',
      inShort: r`What order, degree and linearity mean, and how general and particular solutions differ.`,
      keyIdeas: [
        r`Order: the highest derivative. Degree: its power, once radicals and fractions are cleared.`,
        r`Linear: $y$ and its derivatives to the first power only, with coefficients in $x$.`,
        r`An $n$th-order equation has $n$ arbitrary constants; a family with $n$ constants gives an $n$th-order equation.`,
      ],
      example: {
        problem: r`Find the differential equation of the family $y = C_1e^x + C_2e^{-x}$.`,
        solution: r`$y' = C_1e^x - C_2e^{-x}$ and $y'' = C_1e^x + C_2e^{-x} = y$. So $y'' - y = 0$, second order for two constants.`,
      },
      traps: [r`Degree is only defined once the equation is a polynomial in the derivatives: square $\sqrt{y'} = y''$ first.`],
    },
    {
      name: 'Separable Equations',
      inShort: r`Equations that split into a function of $x$ times a function of $y$: separate and integrate.`,
      keyIdeas: [
        r`$M(x)\,dx + N(y)\,dy = 0 \implies \int M\,dx + \int N\,dy = C$.`,
        r`$y' = f(ax + by + c)$: put $u = ax + by + c$ and it separates.`,
      ],
      example: {
        problem: r`Solve $\frac{dy}{dx} = xy$ with $y(0) = 2$, and find $y(1)$.`,
        solution: r`$\frac{dy}{y} = x\,dx$, so $\ln y = \frac{x^2}{2} + C$; $y = 2e^{x^2/2}$ and $y(1) = 2e^{0.5} \approx 3.297$.`,
      },
      traps: [r`Dividing by $y$ loses the solution $y = 0$ if it satisfies the equation.`],
    },
    {
      name: 'Homogeneous Equations',
      inShort: r`Equations whose coefficients are homogeneous of the same degree: $y = vx$ makes them separable.`,
      keyIdeas: [
        r`$f(tx, ty) = t^nf(x, y)$: homogeneous of degree $n$.`,
        r`Put $y = vx$, $dy = v\,dx + x\,dv$, and separate $v$ from $x$.`,
      ],
      example: {
        problem: r`Solve $(x^2 + y^2)\,dx - xy\,dy = 0$ with $y(1) = 1$.`,
        solution: r`$y = vx$: $(1 + v^2)dx - v(v\,dx + x\,dv) = 0$, so $dx = vx\,dv$ and $\ln x = \frac{v^2}{2} + C$. Thus $y^2 = x^2(2\ln x + 1)$.`,
      },
      traps: [r`Substitute into every $y$ and $dy$; a leftover $y$ means the equation was not homogeneous after all.`],
    },
    {
      name: 'Exact Equations and Integrating Factors',
      inShort: r`Equations that are the total differential of a function, or can be made so.`,
      keyIdeas: [
        r`Exact when $M_y = N_x$; then $F_x = M$, $F_y = N$, and the solution is $F(x, y) = C$.`,
        r`If $\frac{M_y - N_x}{N}$ depends on $x$ alone, $\mu = e^{\int\frac{M_y - N_x}{N}dx}$ makes it exact.`,
      ],
      example: {
        problem: r`Solve $(2xy + 3)\,dx + (x^2 - 1)\,dy = 0$.`,
        solution: r`$M_y = 2x = N_x$: exact. $F = \int(2xy + 3)\,dx = x^2y + 3x + h(y)$, and $F_y = x^2 + h' = x^2 - 1$ gives $h = -y$. So $x^2y + 3x - y = C$.`,
      },
      traps: [r`Don't add $\int N\,dy$ in full after $\int M\,dx$: the shared terms would count twice.`],
    },
    {
      name: 'Linear First-Order',
      inShort: r`$y' + P(x)y = Q(x)$, solved with the integrating factor $e^{\int P\,dx}$.`,
      keyIdeas: [
        r`Put it in standard form first: $y'$ with coefficient $1$.`,
        r`$\mu = e^{\int P\,dx}$, then $y\mu = \int Q\mu\,dx + C$.`,
        r`Constant coefficients: $y' + ay = b$ gives $y = \frac{b}{a} + Ce^{-ax}$.`,
      ],
      example: {
        problem: r`Solve $y' + 2y = x$ with $y(0) = 1$.`,
        solution: r`$\mu = e^{2x}$: $ye^{2x} = \int xe^{2x}dx = \frac{x}{2}e^{2x} - \frac14e^{2x} + C$. So $y = \frac{x}{2} - \frac14 + Ce^{-2x}$, and $y(0) = 1$ gives $C = \frac54$.`,
      },
      traps: [r`The integrating factor uses $P$, the coefficient of $y$, never $Q$.`],
    },
    {
      name: "Bernoulli's Equation",
      inShort: r`$y' + Py = Qy^n$, which becomes linear with $v = y^{1 - n}$.`,
      keyIdeas: [
        r`$v = y^{1 - n}$ gives $v' + (1 - n)Pv = (1 - n)Q$.`,
        r`Solve the linear equation in $v$, then return to $y$.`,
      ],
      example: {
        problem: r`Solve $y' + y = y^2$ with $y(0) = \frac12$.`,
        solution: r`$n = 2$, $v = y^{-1}$: $v' - v = -1$, so $v = 1 + Ce^x$; $v(0) = 2$ gives $C = 1$. Hence $y = \frac{1}{1 + e^x}$.`,
      },
      traps: [r`The factor $(1 - n)$ multiplies both $P$ and $Q$ in the new equation.`],
    },
    {
      name: 'Growth, Decay and Cooling',
      inShort: r`Quantities that change in proportion to themselves, or to their difference from a surrounding value.`,
      keyIdeas: [
        r`$y' = ky$: $y = y_0e^{kt}$; half-life or doubling time $\frac{\ln 2}{|k|}$.`,
        r`Cooling: $T = T_s + (T_0 - T_s)e^{-kt}$: the difference decays.`,
        r`Logistic: $P = \frac{M}{1 + Ae^{-kt}}$, levelling off at $M$.`,
      ],
      example: {
        problem: r`A body at $90^\circ$C in a $25^\circ$C room cools to $70^\circ$C in $5$ minutes. When does it reach $40^\circ$C?`,
        solution: r`$65e^{-5k} = 45$ gives $k = \frac15\ln\frac{65}{45} \approx 0.07355$. Then $65e^{-kt} = 15$: $t = \frac{\ln(65/15)}{0.07355} \approx 19.94$ min.`,
      },
      traps: [r`Find $k$ from the temperature difference ($65 \to 45$), not from the temperatures ($90 \to 70$).`],
    },
    {
      name: 'Mixing and Circuit Applications',
      inShort: r`Rate in minus rate out: mixing tanks, RL and RC circuits, and falling bodies.`,
      keyIdeas: [
        r`Mixing: $\frac{dQ}{dt} = r_{\text{in}}c_{\text{in}} - r_{\text{out}}\frac{Q}{V}$.`,
        r`RL: $i = \frac{E}{R}(1 - e^{-Rt/L})$, $\tau = \frac{L}{R}$. RC: $q = CE(1 - e^{-t/RC})$, $\tau = RC$.`,
        r`One time constant: $63.2\%$ of the way; five: practically there.`,
      ],
      example: {
        problem: r`A $12$ V source is switched across $4\ \Omega$ and $2$ H in series. Find the time constant and the current at $1$ s.`,
        solution: r`$\tau = \frac{L}{R} = 0.5$ s and the final current is $3$ A, so $i(1) = 3(1 - e^{-2}) \approx 2.594$ A.`,
      },
      traps: [r`In a mixing tank whose volume changes, $V$ is a function of $t$, not the starting volume.`],
    },
    {
      name: 'Higher-Order with Constant Coefficients',
      inShort: r`Equations like $ay'' + by' + cy = 0$, solved from the roots of the characteristic equation.`,
      keyIdeas: [
        r`Distinct roots: $C_1e^{r_1x} + C_2e^{r_2x}$. Repeated: $(C_1 + C_2x)e^{rx}$. Complex $\alpha \pm j\beta$: $e^{\alpha x}(C_1\cos\beta x + C_2\sin\beta x)$.`,
        r`Spring-mass: $mx'' + cx' + kx = 0$; under-, critically or over-damped as $c^2$ is below, equal to or above $4mk$.`,
      ],
      example: {
        problem: r`Solve $y'' + 2y' + 5y = 0$ with $y(0) = 1$, $y'(0) = 3$.`,
        solution: r`$r^2 + 2r + 5 = 0$ gives $r = -1 \pm j2$, so $y = e^{-x}(C_1\cos2x + C_2\sin2x)$. $y(0) = C_1 = 1$; $y'(0) = -C_1 + 2C_2 = 3$ gives $C_2 = 2$.`,
      },
      traps: [r`A repeated root needs the extra factor $x$; two identical exponentials are one solution, not two.`],
    },
    {
      name: 'Undetermined Coefficients',
      inShort: r`A particular solution guessed from the shape of the forcing term.`,
      keyIdeas: [
        r`Polynomial in, polynomial out; $e^{ax}$ in, $Ae^{ax}$ out; sine or cosine in, both $A\cos + B\sin$ out.`,
        r`If the guess solves the homogeneous equation, multiply by $x$.`,
        r`Forcing at the natural frequency gives resonance: $t\sin\omega t$, growing without bound.`,
      ],
      example: {
        problem: r`Solve $y'' - y = e^{2x}$.`,
        solution: r`Homogeneous: $C_1e^x + C_2e^{-x}$. Try $Ae^{2x}$: $4A - A = 1$, so $A = \frac13$. Then $y = C_1e^x + C_2e^{-x} + \frac13e^{2x}$.`,
      },
      traps: [r`For $\sin bx$ forcing include both $\cos bx$ and $\sin bx$ in the guess.`],
    },
    {
      name: 'Variation of Parameters',
      inShort: r`A particular solution for any forcing, built from the homogeneous solutions and their Wronskian.`,
      keyIdeas: [
        r`$W = y_1y_2' - y_1'y_2$; non-zero means independent.`,
        r`$y_p = -y_1\int\frac{y_2g}{W}dx + y_2\int\frac{y_1g}{W}dx$, with $y''$'s coefficient made $1$.`,
        r`Use it when undetermined coefficients has no guess: $\sec x$, $\tan x$, $\ln x$.`,
      ],
      example: {
        problem: r`Find a particular solution of $y'' + y = \sec x$.`,
        solution: r`$y_1 = \cos x$, $y_2 = \sin x$, $W = 1$. $y_p = -\cos x\int\sin x\sec x\,dx + \sin x\int\cos x\sec x\,dx = \cos x\ln|\cos x| + x\sin x$.`,
      },
      traps: [r`Divide the equation by the coefficient of $y''$ before reading off $g$.`],
    },
    {
      name: 'Cauchy-Euler Equations',
      inShort: r`$ax^2y'' + bxy' + cy = 0$: each power of $x$ matches its derivative, so try $y = x^m$.`,
      keyIdeas: [
        r`Indicial equation: $am(m - 1) + bm + c = 0$.`,
        r`Distinct roots: $x^{m_1}$, $x^{m_2}$. Repeated: $x^m$ and $x^m\ln x$. Complex: $x^\alpha\cos(\beta\ln x)$, $x^\alpha\sin(\beta\ln x)$.`,
        r`$x = e^t$ turns it into a constant-coefficient equation.`,
      ],
      example: {
        problem: r`Solve $x^2y'' - 2y = 0$.`,
        solution: r`$m(m - 1) - 2 = 0$ gives $m = 2$ and $m = -1$: $y = C_1x^2 + \frac{C_2}{x}$.`,
      },
      traps: [r`The indicial equation has $m(m - 1)$, not $m^2$.`],
    },
    {
      name: 'Laplace Transform Solutions',
      inShort: r`Turning an initial-value problem into algebra in $s$, solving, and transforming back.`,
      keyIdeas: [
        r`First derivative: $\mathcal{L}\{y'\} = sY - y(0)$.`,
        r`Second derivative: $\mathcal{L}\{y''\} = s^2Y - sy(0) - y'(0)$.`,
        r`Shifts: $e^{at}f \to F(s - a)$; a delay $u(t - a)f(t - a) \to e^{-as}F(s)$.`,
        r`Invert by partial fractions and the table.`,
      ],
      example: {
        problem: r`Solve $y'' + 3y' + 2y = 0$ with $y(0) = 1$, $y'(0) = 0$.`,
        solution: r`$s^2Y - s + 3(sY - 1) + 2Y = 0$, so $Y = \frac{s + 3}{(s + 1)(s + 2)} = \frac{2}{s + 1} - \frac{1}{s + 2}$, and $y = 2e^{-t} - e^{-2t}$.`,
      },
      traps: [r`Initial conditions come in with minus signs; dropping $-sy(0)$ is the common slip.`],
    },
    {
      name: 'Systems of Differential Equations',
      inShort: r`Several linked equations, solved by eigenvalues or by reducing to one equation.`,
      keyIdeas: [
        r`$\mathbf{x}' = A\mathbf{x}$: $\mathbf{x} = c_1\mathbf{v}_1e^{\lambda_1t} + c_2\mathbf{v}_2e^{\lambda_2t}$.`,
        r`Or eliminate one unknown: $x'' - (\text{tr}A)x' + (\det A)x = 0$.`,
      ],
      example: {
        problem: r`Solve $x' = x + 2y$, $y' = 2x + y$ with $x(0) = 3$, $y(0) = 1$.`,
        solution: r`$\lambda^2 - 2\lambda - 3 = 0$: $\lambda = 3$ with $\mathbf v = (1, 1)$, $\lambda = -1$ with $(1, -1)$. $(3, 1) = 2(1, 1) + (1, -1)$, so $x = 2e^{3t} + e^{-t}$ and $y = 2e^{3t} - e^{-t}$.`,
      },
      traps: [r`Fit the constants to both initial values at once, through the eigenvectors.`],
    },
  ],
};
