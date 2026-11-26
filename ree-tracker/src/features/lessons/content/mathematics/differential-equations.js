// Library › Lessons › Mathematics › Differential Equations (2026-11-17; every
// subtopic in the module format 2026-11-27, with figures, examples a step at a
// time and checks; every number re-worked by differentialEquationsLesson.test.js.
// Coverage cross-checked against two review centers' differential equations
// handouts; the text, problems and figures are this app's own): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// x'' + 2ζωx' + ω²x = 0 with ω = 2, x(0) = 1, x'(0) = 0, for three dampings.
const W = 2;
export const UNDER = (t) => {
  const a = 0.25 * W;
  const wd = W * Math.sqrt(1 - 0.25 ** 2);
  return Math.exp(-a * t) * (Math.cos(wd * t) + (a / wd) * Math.sin(wd * t));
};
export const CRITICAL = (t) => (1 + W * t) * Math.exp(-W * t);
export const OVER = (t) => {
  const [r1, r2] = [-W * (2 - Math.sqrt(3)), -W * (2 + Math.sqrt(3))];
  return (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
};

// The cooling body of the basic example: 90 °C in a 25 °C room, 70 °C after 5 min.
export const COOL_K = Math.log(65 / 45) / 5;

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
      inShort: r`What order, degree and linearity mean, how general and particular solutions differ, and families of curves.`,
      body: [
        r`A **differential equation** contains a derivative of an unknown function. Its **order** is the highest derivative present; its **degree** is the power of that highest derivative, once the equation is cleared of radicals and fractions in the derivatives. It is **linear** when $y$ and its derivatives appear only to the first power, not multiplied together, with coefficients in $x$ alone.

| Solution | Meaning |
|---|---|
| general | contains as many arbitrary constants as the order |
| particular | the constants fixed by initial or boundary conditions |
| singular | satisfies the equation but is not in the general family |

Going the other way, a **family of curves** with $n$ constants gives an $n$th-order equation: differentiate $n$ times and eliminate the constants. Replacing the slope $y'$ by $-\frac{1}{y'}$ in that equation gives the **orthogonal trajectories**, the curves that cross every member at right angles:`,
        {
          type: 'plot',
          equal: true,
          alt: 'Three parabolas y equals C x squared opening up and down through the origin, and three dashed ellipses x squared plus 2 y squared equals k centred at the origin. Every ellipse crosses every parabola at right angles.',
          caption: 'The parabolas y = Cx² (solid) and their orthogonal trajectories, the ellipses x² + 2y² = k (dashed): every crossing is a right angle.',
          x: [-3, 3],
          y: [-2.2, 2.2],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            ...[0.5, -0.5, 2].map((C) => ({ f: (x) => C * x * x, colour: colourOf(0) })),
            ...[1, 3, 6].map((k) => ({ points: range(0, 2 * Math.PI, 120).map((t) => [Math.sqrt(k) * Math.cos(t), Math.sqrt(k / 2) * Math.sin(t)]), dashed: true, colour: colourOf(1) })),
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Order: the highest derivative. Degree: its power, once radicals and fractions are cleared.`,
        r`Linear: $y$ and its derivatives to the first power only, with coefficients in $x$.`,
        r`An $n$th-order equation has $n$ arbitrary constants; a family with $n$ constants gives an $n$th-order equation.`,
        r`Orthogonal trajectories: replace $y'$ by $-\frac{1}{y'}$ in the family's equation and solve.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Eliminating two constants',
          problem: r`Find the differential equation of the family $y = C_1e^x + C_2e^{-x}$.`,
          steps: [
            r`$y' = C_1e^x - C_2e^{-x}$ and $y'' = C_1e^x + C_2e^{-x} = y$.`,
            r`So $y'' - y = 0$: second order, for two constants.`,
          ],
          answer: r`$y'' - y = 0$.`,
        },
        {
          level: 'board',
          title: 'Order and degree, a family, orthogonal trajectories',
          problem: r`(a) Give the order and degree of $(y''')^2 + 4(y')^5 - xy = 0$. (b) Find the differential equation of $y = C_1e^{2x} + C_2e^{-3x}$. (c) Find the orthogonal trajectories of $y = Cx^2$.`,
          steps: [
            r`(a) The highest derivative is $y'''$, squared: third order, second degree.`,
            r`(b) The exponents $2$ and $-3$ are the roots of $r^2 + r - 6 = 0$, so $y'' + y' - 6y = 0$.`,
            r`(c) $C = \frac{y}{x^2}$ and $y' = 2Cx = \frac{2y}{x}$. Orthogonal: $y' = -\frac{x}{2y}$, so $2y\,dy = -x\,dx$ and $x^2 + 2y^2 = k$, a family of ellipses.`,
          ],
          answer: r`(a) third order, second degree; (b) $y'' + y' - 6y = 0$; (c) $x^2 + 2y^2 = k$.`,
        },
      ],
      traps: [
        r`Degree is only defined once the equation is a polynomial in the derivatives: square $\sqrt{y'} = y''$ first.`,
        r`The family's equation must not contain the constant: eliminate it before replacing the slope.`,
      ],
      check: [
        { q: r`Find the differential equation of the circles centred at the origin.`, a: r`$x^2 + y^2 = r^2$ gives $x + yy' = 0$.` },
        { q: r`Find the orthogonal trajectories of $x^2 + y^2 = c$.`, a: r`$y' = -\frac xy$ becomes $\frac yx$: the lines $y = kx$.` },
      ],
    },
    {
      name: 'Separable Equations',
      inShort: r`Equations that split into a function of $x$ times a function of $y$: separate and integrate.`,
      body: [
        r`If the equation can be written $f(x)\,dx + g(y)\,dy = 0$, each variable sits with its own differential, and integrating term by term solves it:
$$\int f(x)\,dx + \int g(y)\,dy = C.$$
Products and quotients separate by division: $x(y^2 + 1)\,dx + y(x^2 + 1)\,dy = 0$ becomes $\frac{x\,dx}{x^2 + 1} + \frac{y\,dy}{y^2 + 1} = 0$.

Two substitutions make other equations separable:

| Equation | Substitute |
|---|---|
| $y' = f(ax + by + c)$ | $u = ax + by + c$, so $u' = a + bf(u)$ |
| $(a_1x + b_1y + c_1)\,dx + (a_2x + b_2y + c_2)\,dy = 0$, lines not parallel | move the origin to where the two lines meet; the result is homogeneous |
| the same, lines parallel ($\frac{a_1}{a_2} = \frac{b_1}{b_2}$) | $z = a_1x + b_1y$ |`,
      ],
      keyIdeas: [
        r`$M(x)\,dx + N(y)\,dy = 0 \implies \int M\,dx + \int N\,dy = C$.`,
        r`$y' = f(ax + by + c)$: put $u = ax + by + c$ and it separates.`,
        r`Exponential solutions come from $\frac{dy}{y}$: $\ln y = \ldots$ means $y = Ce^{\ldots}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A product on the right',
          problem: r`Solve $\frac{dy}{dx} = xy$ with $y(0) = 2$, and find $y(1)$.`,
          steps: [
            r`$\frac{dy}{y} = x\,dx$, so $\ln y = \frac{x^2}{2} + C$.`,
            r`$y = 2e^{x^2/2}$ and $y(1) = 2e^{0.5} \approx 3.297$.`,
          ],
          answer: r`$y = 2e^{x^2/2}$; about 3.297.`,
        },
        {
          level: 'board',
          title: 'Dividing through, a substitution, an exponential',
          problem: r`(a) Solve $x(y^2 + 1)\,dx + y(x^2 + 1)\,dy = 0$. (b) Solve $y' = (x + y + 1)^2$. (c) Solve $y' = 3x^2y$ with $y(0) = 2$, and find $y(1)$.`,
          steps: [
            r`(a) Divide by $(x^2 + 1)(y^2 + 1)$ and integrate: $\frac12\ln(x^2 + 1) + \frac12\ln(y^2 + 1) = c$, that is $(x^2 + 1)(y^2 + 1) = C$.`,
            r`(b) $u = x + y + 1$: $u' = 1 + u^2$, so $\tan^{-1}u = x + C$ and $x + y + 1 = \tan(x + C)$.`,
            r`(c) $\ln y = x^3 + c$, so $y = 2e^{x^3}$ and $y(1) = 2e = 5.4366$.`,
          ],
          answer: r`(a) $(x^2 + 1)(y^2 + 1) = C$; (b) $x + y + 1 = \tan(x + C)$; (c) $y(1) \approx 5.4366$.`,
        },
      ],
      traps: [
        r`Dividing by $y$ loses the solution $y = 0$ if it satisfies the equation.`,
        r`$\ln y = x^3 + c$ gives $y = Ce^{x^3}$, not $e^{x^3} + C$: the constant multiplies.`,
      ],
      check: [
        { q: r`Solve $\cot x\,dy + y\,dx = 0$.`, a: r`$\frac{dy}{y} = -\tan x\,dx$: $y = C\cos x$.` },
        { q: r`Solve $\frac{dy}{dx} = \frac{2y}{x}$.`, a: r`$y = kx^2$.` },
      ],
    },
    {
      name: 'Homogeneous Equations',
      inShort: r`Equations whose coefficients are homogeneous of the same degree: $y = vx$ makes them separable.`,
      body: [
        r`A function is **homogeneous of degree $n$** when $f(\lambda x, \lambda y) = \lambda^nf(x, y)$: every term has the same total degree. An equation $M\,dx + N\,dy = 0$ is homogeneous when $M$ and $N$ are homogeneous of the same degree; equivalently, $y'$ depends only on $\frac yx$.

Substitute $y = vx$, $dy = v\,dx + x\,dv$ (or $x = vy$ when $dx$ is simpler); every $x$ factors out and the equation **separates** in $v$ and $x$. Return to $y$ with $v = \frac yx$ at the end.`,
      ],
      keyIdeas: [
        r`$f(tx, ty) = t^nf(x, y)$: homogeneous of degree $n$.`,
        r`Put $y = vx$, $dy = v\,dx + x\,dv$, and separate $v$ from $x$.`,
        r`Linear coefficients that are not parallel: move the origin to their meeting point first.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Degree two',
          problem: r`Solve $(x^2 + y^2)\,dx - xy\,dy = 0$ with $y(1) = 1$.`,
          steps: [
            r`$y = vx$: $(1 + v^2)dx - v(v\,dx + x\,dv) = 0$, so $dx = vx\,dv$ and $\ln x = \frac{v^2}{2} + C$.`,
            r`$y(1) = 1$ gives $C = -\frac12$: $y^2 = x^2(2\ln x + 1)$.`,
          ],
          answer: r`$y^2 = x^2(2\ln x + 1)$.`,
        },
        {
          level: 'board',
          title: 'A ratio form, and shifted lines',
          problem: r`(a) Solve $y' = \frac yx + \frac xy$ with $y(1) = 2$, and find $y(e)$. (b) Solve $(x + y - 3)\,dx + (x - y - 1)\,dy = 0$.`,
          steps: [
            r`(a) $y = vx$: $v + xv' = v + \frac1v$, so $v\,dv = \frac{dx}{x}$ and $\frac{v^2}{2} = \ln x + C$. That is $y^2 = 2x^2(\ln x + C)$; $y(1) = 2$ gives $C = 2$.`,
            r`At $x = e$: $y^2 = 2e^2(3) = 6e^2$, so $y = e\sqrt6 = 6.658$.`,
            r`(b) The lines $x + y = 3$ and $x - y = 1$ meet at $(2, 1)$. With $x = u + 2$, $y = v + 1$: $(u + v)\,du + (u - v)\,dv = 0$, which is homogeneous and in fact exact: $u^2 + 2uv - v^2 = C$.`,
            r`Back in $x$ and $y$: $(x - 2)^2 + 2(x - 2)(y - 1) - (y - 1)^2 = C$.`,
          ],
          answer: r`(a) $y^2 = 2x^2(\ln x + 2)$, $y(e) \approx 6.658$; (b) $(x - 2)^2 + 2(x - 2)(y - 1) - (y - 1)^2 = C$.`,
        },
      ],
      traps: [
        r`Substitute into every $y$ and $dy$; a leftover $y$ means the equation was not homogeneous after all.`,
        r`$dy = v\,dx + x\,dv$, by the product rule; $dy = dv$ is the slip.`,
      ],
      check: [
        { q: r`Is $(x^2 + 3xy)\,dx + (y^2 + 1)\,dy = 0$ homogeneous?`, a: r`No: the $1$ has degree 0, the rest degree 2.` },
        { q: r`Solve $(x + y)\,dy = (x - y)\,dx$.`, a: r`$x^2 - 2xy - y^2 = C$.` },
      ],
    },
    {
      name: 'Exact Equations and Integrating Factors',
      inShort: r`Equations that are the total differential of a function, or can be made so.`,
      body: [
        r`$M\,dx + N\,dy = 0$ is **exact** when it is the total differential $dF$ of some $F(x, y)$; the test is
$$\frac{\partial M}{\partial y} = \frac{\partial N}{\partial x}.$$
Then integrate $M$ in $x$ (holding $y$), add an unknown $h(y)$, and fix $h$ from $F_y = N$. The solution is $F(x, y) = C$.

An inexact equation can often be made exact by an **integrating factor** $\mu$:

| When | Integrating factor |
|---|---|
| $\frac{M_y - N_x}{N}$ depends on $x$ alone | $\mu = e^{\int\frac{M_y - N_x}{N}dx}$ |
| $\frac{N_x - M_y}{M}$ depends on $y$ alone | $\mu = e^{\int\frac{N_x - M_y}{M}dy}$ |
| groups such as $x\,dy - y\,dx$ | $\frac{1}{x^2}$ gives $d\left(\frac yx\right)$; $\frac{1}{y^2}$ gives $-d\left(\frac xy\right)$; $\frac{1}{x^2 + y^2}$ gives $d\left(\tan^{-1}\frac yx\right)$ |`,
      ],
      keyIdeas: [
        r`Exact when $M_y = N_x$; then $F_x = M$, $F_y = N$, and the solution is $F(x, y) = C$.`,
        r`If $\frac{M_y - N_x}{N}$ depends on $x$ alone, $\mu = e^{\int\frac{M_y - N_x}{N}dx}$ makes it exact.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An exact equation',
          problem: r`Solve $(2xy + 3)\,dx + (x^2 - 1)\,dy = 0$.`,
          steps: [
            r`$M_y = 2x = N_x$: exact. $F = \int(2xy + 3)\,dx = x^2y + 3x + h(y)$.`,
            r`$F_y = x^2 + h' = x^2 - 1$ gives $h = -y$. So $x^2y + 3x - y = C$.`,
          ],
          answer: r`$x^2y + 3x - y = C$.`,
        },
        {
          level: 'board',
          title: 'Exact, and made exact',
          problem: r`(a) Solve $(3x^2 + 2xy)\,dx + (x^2 + 4y)\,dy = 0$. (b) Solve $(x^2 + y^2 + x)\,dx + xy\,dy = 0$.`,
          steps: [
            r`(a) $M_y = 2x = N_x$. $F = x^3 + x^2y + h(y)$, and $F_y = x^2 + h' = x^2 + 4y$ gives $h = 2y^2$: $x^3 + x^2y + 2y^2 = C$.`,
            r`(b) $M_y = 2y$, $N_x = y$: not exact. $\frac{M_y - N_x}{N} = \frac{y}{xy} = \frac1x$, so $\mu = x$.`,
            r`Then $(x^3 + xy^2 + x^2)\,dx + x^2y\,dy = 0$ is exact: $F = \frac{x^4}{4} + \frac{x^2y^2}{2} + \frac{x^3}{3} = C$.`,
          ],
          answer: r`(a) $x^3 + x^2y + 2y^2 = C$; (b) $\frac{x^4}{4} + \frac{x^2y^2}{2} + \frac{x^3}{3} = C$.`,
        },
      ],
      traps: [
        r`Don't add $\int N\,dy$ in full after $\int M\,dx$: the shared terms would count twice.`,
        r`Test exactness with $M_y$ against $N_x$, crossed: not $M_x$ against $N_y$.`,
      ],
      check: [
        { q: r`Is $2xy\,dx + (x^2 + 3y^2)\,dy = 0$ exact? Solve it.`, a: r`Yes, $2x = 2x$: $x^2y + y^3 = C$.` },
        { q: r`Solve $(y - 3x^2)\,dx + x\,dy = 0$.`, a: r`Exact: $xy - x^3 = C$.` },
      ],
    },
    {
      name: 'Linear First-Order',
      inShort: r`$y' + P(x)y = Q(x)$, solved with the integrating factor $e^{\int P\,dx}$.`,
      body: [
        r`In **standard form** $y' + P(x)\,y = Q(x)$, multiplying by $\mu = e^{\int P\,dx}$ turns the left side into the derivative of a product, $(y\mu)' = Q\mu$, so
$$y\,e^{\int P\,dx} = \int Q\,e^{\int P\,dx}\,dx + C.$$
The solution is a **transient** (the $Ce^{-\int P}$ part, which dies away when $P > 0$) plus a **steady state** that follows $Q$:`,
        {
          type: 'plot',
          alt: 'The solution y equals x over 2 minus one quarter plus five quarters e to the minus 2x, starting at 1 when x is 0, dipping, then running along the dashed straight line x over 2 minus one quarter as the exponential part dies away.',
          caption: 'y′ + 2y = x with y(0) = 1: y = x/2 − 1/4 + (5/4)e^(−2x). The exponential transient dies and the solution settles on the steady line x/2 − 1/4 (dashed).',
          x: [0, 4],
          y: [-0.5, 2],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => x / 2 - 0.25 + 1.25 * Math.exp(-2 * x), label: 'solution', colour: colourOf(0) },
            { f: (x) => x / 2 - 0.25, label: 'steady state', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`With constant coefficients, $y' + ay = b$ gives $y = \frac ba + Ce^{-ax}$: the form of every RL and RC charging curve.`,
      ],
      keyIdeas: [
        r`Put it in standard form first: $y'$ with coefficient $1$.`,
        r`$\mu = e^{\int P\,dx}$, then $y\mu = \int Q\mu\,dx + C$.`,
        r`Constant coefficients: $y' + ay = b$ gives $y = \frac{b}{a} + Ce^{-ax}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A polynomial forcing',
          problem: r`Solve $y' + 2y = x$ with $y(0) = 1$.`,
          steps: [
            r`$\mu = e^{2x}$: $ye^{2x} = \int xe^{2x}dx = \frac{x}{2}e^{2x} - \frac14e^{2x} + C$.`,
            r`So $y = \frac{x}{2} - \frac14 + Ce^{-2x}$, and $y(0) = 1$ gives $C = \frac54$.`,
          ],
          answer: r`$y = \frac x2 - \frac14 + \frac54e^{-2x}$.`,
        },
        {
          level: 'board',
          title: 'A variable coefficient, and a trigonometric one',
          problem: r`(a) Solve $y' + \frac yx = 4x^2$ with $y(1) = 2$, and find $y(2)$. (b) Solve $y' + y\tan x = \cos x$ with $y(0) = 1$.`,
          steps: [
            r`(a) $\mu = e^{\ln x} = x$: $(xy)' = 4x^3$, so $xy = x^4 + C$; $y(1) = 2$ gives $C = 1$. Then $y = x^3 + \frac1x$ and $y(2) = 8.5$.`,
            r`(b) $\mu = e^{\int\tan x\,dx} = \sec x$: $(y\sec x)' = 1$, so $y = (x + C)\cos x$; $y(0) = 1$ gives $C = 1$.`,
          ],
          answer: r`(a) $y = x^3 + \frac1x$, $y(2) = 8.5$; (b) $y = (x + 1)\cos x$.`,
        },
      ],
      traps: [
        r`The integrating factor uses $P$, the coefficient of $y$, never $Q$.`,
        r`Divide through by the coefficient of $y'$ first: in $xy' + 2y = \ldots$, $P = \frac2x$.`,
      ],
      check: [
        { q: r`Solve $y' + \frac yx = 3x$.`, a: r`$xy = x^3 + C$.` },
        { q: r`Solve $\frac{dx}{dt} = x - 1$ with $x(0) = 1$.`, a: r`$x = 1$ for all $t$: the steady state from the start.` },
      ],
    },
    {
      name: "Bernoulli's Equation",
      inShort: r`$y' + Py = Qy^n$, which becomes linear with $v = y^{1 - n}$.`,
      body: [
        r`**Bernoulli's equation** $y' + P(x)\,y = Q(x)\,y^n$ ($n \ne 0, 1$) is not linear because of $y^n$. Divide by $y^n$ and put $v = y^{1-n}$, so $v' = (1 - n)y^{-n}y'$:
$$v' + (1 - n)P\,v = (1 - n)Q,$$
a linear equation in $v$. Solve it with the integrating factor $e^{(1 - n)\int P\,dx}$, then return to $y = v^{1/(1 - n)}$. With $n = 2$ this is the logistic equation of population growth.`,
      ],
      keyIdeas: [
        r`$v = y^{1 - n}$ gives $v' + (1 - n)Pv = (1 - n)Q$.`,
        r`Solve the linear equation in $v$, then return to $y$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A square on the right',
          problem: r`Solve $y' + y = y^2$ with $y(0) = \frac12$.`,
          steps: [
            r`$n = 2$, $v = y^{-1}$: $v' - v = -1$, so $v = 1 + Ce^x$.`,
            r`$v(0) = 2$ gives $C = 1$. Hence $y = \frac{1}{1 + e^x}$.`,
          ],
          answer: r`$y = \frac{1}{1 + e^x}$.`,
        },
        {
          level: 'board',
          title: 'A variable coefficient',
          problem: r`Solve $y' + \frac yx = x^2y^2$ with $y(1) = 1$, and find $y(1.5)$.`,
          steps: [
            r`$n = 2$, $v = \frac1y$: $v' - \frac vx = -x^2$.`,
            r`$\mu = \frac1x$: $\left(\frac vx\right)' = -x$, so $\frac vx = -\frac{x^2}{2} + C$ and $y = \frac{2}{2Cx - x^3}$.`,
            r`$y(1) = 1$ gives $2C - 1 = 2$, $C = 1.5$: $y = \frac{2}{3x - x^3}$, and $y(1.5) = \frac{2}{1.125} = 1.7778$.`,
          ],
          answer: r`$y = \frac{2}{3x - x^3}$; about 1.7778.`,
        },
      ],
      traps: [
        r`The factor $(1 - n)$ multiplies both $P$ and $Q$ in the new equation.`,
        r`With $n = 2$, $v = y^{-1}$: the answer for $y$ is the reciprocal, not $v$ itself.`,
      ],
      check: [
        { q: r`What substitution linearises $y' + 2y = xy^3$?`, a: r`$v = y^{-2}$.` },
        { q: r`What does $y' - xy = xy^2$ become with $v = \frac1y$?`, a: r`$v' + xv = -x$.` },
      ],
    },
    {
      name: 'Growth, Decay and Cooling',
      inShort: r`Quantities that change in proportion to themselves, or to their difference from a surrounding value.`,
      body: [
        r`When a quantity changes at a rate proportional to itself, $\frac{dQ}{dt} = kQ$ gives $Q = Q_0e^{kt}$: growth for $k > 0$ (populations, continuously compounded money), decay for $k < 0$ (radioactive material). The time to double or halve is $\frac{\ln2}{|k|}$; find $k$ from any two readings.

**Newton's law of cooling** applies the same law to the **difference** between a body and its surroundings: $\frac{dT}{dt} = -k(T - T_s)$, so $T = T_s + (T_0 - T_s)e^{-kt}$. The body approaches the room's temperature but never crosses it:`,
        {
          type: 'plot',
          alt: 'A cooling curve starting at 90 degrees at time 0, passing 70 degrees at 5 minutes and 40 degrees at about 20 minutes, and levelling towards the dashed room temperature of 25 degrees.',
          caption: 'A body at 90 °C in a 25 °C room (dashed): 70 °C after 5 min, 40 °C after about 19.94 min, never below 25 °C.',
          x: [0, 40],
          y: [0, 100],
          xLabel: 't (min)',
          yLabel: 'T (°C)',
          series: [{ f: (t) => 25 + 65 * Math.exp(-COOL_K * t), colour: colourOf(0) }],
          marks: [{ y: 25 }, { at: [5, 70] }],
          legend: false,
        },
        r`| Law | Equation | Solution |
|---|---|---|
| growth or decay | $Q' = kQ$ | $Q = Q_0e^{kt}$ |
| continuous interest at rate $r$ | $P' = rP$ | $P = P_0e^{rt}$ |
| cooling | $T' = -k(T - T_s)$ | $T = T_s + (T_0 - T_s)e^{-kt}$ |
| logistic (limited growth, spreading rumours) | $P' = kP(M - P)$ | $P = \frac{M}{1 + Ae^{-kMt}}$ |`,
      ],
      keyIdeas: [
        r`$y' = ky$: $y = y_0e^{kt}$; half-life or doubling time $\frac{\ln 2}{|k|}$.`,
        r`Cooling: $T = T_s + (T_0 - T_s)e^{-kt}$: the difference decays.`,
        r`Logistic: $P = \frac{M}{1 + Ae^{-kt}}$, levelling off at $M$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A cooling body',
          problem: r`A body at $90^\circ$C in a $25^\circ$C room cools to $70^\circ$C in $5$ minutes. When does it reach $40^\circ$C?`,
          steps: [
            r`$65e^{-5k} = 45$ gives $k = \frac15\ln\frac{65}{45} \approx 0.07355$.`,
            r`Then $65e^{-kt} = 15$: $t = \frac{\ln(65/15)}{0.07355} \approx 19.94$ min.`,
          ],
          answer: r`About 19.94 min.`,
        },
        {
          level: 'board',
          title: 'Half-life, tripling, cooling, interest',
          problem: r`(a) A substance loses 4% of its mass in 50 years. Find its half-life. (b) A population doubles in 40 years. When does it triple? (c) Milk at $95^\circ$C in a $25^\circ$C room reads $80^\circ$C after 10 min. What does it read 10 min later, and when does it reach $40^\circ$C? (d) How long does money take to double at 5% compounded continuously?`,
          steps: [
            r`(a) $e^{50k} = 0.96$; half-life $\frac{50\ln2}{\ln(1/0.96)} = 848.99$ years.`,
            r`(b) $t = 40 \times \frac{\ln3}{\ln2} = 63.40$ years.`,
            r`(c) The difference goes $70 \to 55$ in 10 min, so after 20 min it is $70\left(\frac{55}{70}\right)^2 = 43.21$: the milk reads $68.21^\circ$C. To reach $40^\circ$C the difference must fall to 15: $t = 10 \times \frac{\ln(70/15)}{\ln(70/55)} = 63.88$ min.`,
            r`(d) $\frac{\ln2}{0.05} = 13.86$ years.`,
          ],
          answer: r`(a) about 849 years; (b) 63.40 years; (c) $68.21^\circ$C and 63.88 min; (d) 13.86 years.`,
        },
      ],
      traps: [
        r`Find $k$ from the temperature difference ($65 \to 45$), not from the temperatures ($90 \to 70$).`,
        r`A 4% loss leaves 96%: use $0.96$, not $0.04$.`,
      ],
      check: [
        { q: r`A culture of 1000 doubles every hour. How many after 4 hours?`, a: r`$1000(2^4) = 16\,000$.` },
        { q: r`A half-life is 1200 years. What is the decay constant?`, a: r`$\frac{\ln2}{1200} \approx 5.78 \times 10^{-4}$ per year.` },
      ],
    },
    {
      name: 'Mixing and Circuit Applications',
      inShort: r`Rate in minus rate out: mixing tanks, RL and RC circuits, and motion with resistance.`,
      body: [
        r`A **mixing tank** obeys one balance: the amount $Q$ of dissolved substance changes at the rate it flows in minus the rate it flows out,
$$\frac{dQ}{dt} = r_{in}c_{in} - r_{out}\frac{Q}{V(t)}, \qquad V(t) = V_0 + (r_{in} - r_{out})t.$$
When the flows are equal the volume is constant and the equation is $Q' + aQ = b$; otherwise it is linear with a variable coefficient.

**Circuits** obey Kirchhoff's voltage law, and a single inductor or capacitor gives a first-order linear equation:

| Circuit | Equation | Response to a step $E$ |
|---|---|---|
| RL | $L\,i' + Ri = E$ | $i = \frac ER\left(1 - e^{-Rt/L}\right)$, $\tau = \frac LR$ |
| RC charging | $Rq' + \frac qC = E$ | $q = CE\left(1 - e^{-t/RC}\right)$, $i = \frac ERe^{-t/RC}$, $\tau = RC$ |`,
        {
          type: 'plot',
          alt: 'The current in an RL circuit after a 12 volt source is switched on across 4 ohms and 2 henries: it rises from 0 towards the dashed final value of 3 amperes, reaching 63.2 percent of it at one time constant, 0.5 seconds.',
          caption: 'RL switch-on, 12 V across 4 Ω and 2 H: i = 3(1 − e^(−2t)) A. At one time constant (0.5 s) it is 63.2% of the final 3 A (dashed).',
          x: [0, 3],
          y: [0, 3.5],
          xLabel: 't (s)',
          yLabel: 'i (A)',
          series: [{ f: (t) => 3 * (1 - Math.exp(-2 * t)), colour: colourOf(0) }],
          marks: [{ y: 3 }, { at: [0.5, 3 * (1 - Math.exp(-1))] }],
          legend: false,
        },
        r`**Motion with resistance** uses Newton's second law, $m\frac{dv}{dt} = F - (\text{resistance})$: with resistance $kv$ a falling body approaches the terminal velocity $\frac{mg}{k}$.`,
      ],
      keyIdeas: [
        r`Mixing: $\frac{dQ}{dt} = r_{\text{in}}c_{\text{in}} - r_{\text{out}}\frac{Q}{V}$.`,
        r`RL: $i = \frac{E}{R}(1 - e^{-Rt/L})$, $\tau = \frac{L}{R}$. RC: $q = CE(1 - e^{-t/RC})$, $\tau = RC$.`,
        r`One time constant: $63.2\%$ of the way; five: practically there.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An RL switch-on',
          problem: r`A $12$ V source is switched across $4\ \Omega$ and $2$ H in series. Find the time constant and the current at $1$ s.`,
          steps: [
            r`$\tau = \frac{L}{R} = 0.5$ s and the final current is $3$ A.`,
            r`$i(1) = 3(1 - e^{-2}) \approx 2.594$ A.`,
          ],
          answer: r`0.5 s; about 2.594 A.`,
        },
        {
          level: 'board',
          title: 'A filling tank, and an RC charge',
          problem: r`(a) A tank holds 200 L of water with 40 kg of salt. Brine with 0.5 kg/L flows in at 6 L/min and the mixture leaves at 4 L/min. How much salt is in the tank after 50 min? (b) A 100 V source charges a 50 µF capacitor through 10 kΩ. Find the charge and current after 1 s.`,
          steps: [
            r`(a) $V = 200 + 2t$: $Q' = 3 - \frac{4Q}{200 + 2t} = 3 - \frac{2Q}{100 + t}$.`,
            r`$\mu = (100 + t)^2$: $Q(100 + t)^2 = (100 + t)^3 + C$; $Q(0) = 40$ gives $C = -600\,000$. At $t = 50$: $Q = 150 - \frac{600\,000}{22\,500} = 123.33$ kg.`,
            r`(b) $\tau = RC = 0.5$ s. $q = (50 \times 10^{-6})(100)(1 - e^{-2}) = 4.323$ mC, and $i = \frac{100}{10\,000}e^{-2} = 1.353$ mA.`,
          ],
          answer: r`(a) about 123.33 kg; (b) 4.323 mC and 1.353 mA.`,
        },
      ],
      traps: [
        r`In a mixing tank whose volume changes, $V$ is a function of $t$, not the starting volume.`,
        r`A capacitor's charging current decays while its charge rises: $i = \frac ERe^{-t/RC}$, not $1 - e^{-t/RC}$.`,
      ],
      check: [
        { q: r`What fraction of the final current flows in an RL circuit after $3\tau$?`, a: r`$1 - e^{-3} \approx 95\%$.` },
        { q: r`100 L of pure water receives brine of 0.2 kg/L at 5 L/min and loses mixture at 5 L/min. What is $Q(t)$?`, a: r`$Q' = 1 - 0.05Q$: $Q = 20(1 - e^{-0.05t})$ kg.` },
      ],
    },
    {
      name: 'Higher-Order with Constant Coefficients',
      inShort: r`Equations like $ay'' + by' + cy = 0$, solved from the roots of the characteristic equation.`,
      body: [
        r`Try $y = e^{mx}$ in $ay'' + by' + cy = 0$ (or in $f(D)y = 0$, with $D = \frac{d}{dx}$): each derivative brings a factor $m$, giving the **characteristic equation** $am^2 + bm + c = 0$. Its roots build the solution:

| Roots | Solution |
|---|---|
| real, distinct $m_1, m_2$ | $C_1e^{m_1x} + C_2e^{m_2x}$ |
| real, repeated $m$ | $(C_1 + C_2x)e^{mx}$ (and $C_3x^2$ for a triple root) |
| complex $\alpha \pm j\beta$ | $e^{\alpha x}(C_1\cos\beta x + C_2\sin\beta x)$ |

Higher orders work the same way, one term per root. The **spring-mass** system $mx'' + cx' + kx = 0$ has natural frequency $\omega_n = \sqrt{k/m}$; the damping decides the shape:`,
        {
          type: 'plot',
          alt: 'Three responses of a spring released from 1 with natural frequency 2 radians per second: the under-damped one oscillates with shrinking swings, the critically damped one returns to zero fastest without crossing, and the over-damped one creeps back slowly.',
          caption: 'Released from x = 1 with ωₙ = 2: under-damped (ζ = 0.25) oscillates, critically damped (ζ = 1) returns fastest without overshoot, over-damped (ζ = 2) creeps back.',
          x: [0, 8],
          y: [-0.8, 1.2],
          xLabel: 't (s)',
          yLabel: 'x',
          series: [
            { f: UNDER, label: 'under-damped', colour: colourOf(0) },
            { f: CRITICAL, label: 'critical', colour: colourOf(2) },
            { f: OVER, label: 'over-damped', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`| Damping | Condition | Roots |
|---|---|---|
| over-damped | $c^2 > 4mk$ | two real |
| critically damped | $c^2 = 4mk$ | repeated |
| under-damped | $c^2 < 4mk$ | complex: oscillates at $\omega_d = \omega_n\sqrt{1 - \zeta^2}$ |

The same equation governs the series RLC circuit, $Lq'' + Rq' + \frac qC = E$, with $\omega_n = \frac{1}{\sqrt{LC}}$.`,
      ],
      keyIdeas: [
        r`Distinct roots: $C_1e^{r_1x} + C_2e^{r_2x}$. Repeated: $(C_1 + C_2x)e^{rx}$. Complex $\alpha \pm j\beta$: $e^{\alpha x}(C_1\cos\beta x + C_2\sin\beta x)$.`,
        r`Spring-mass: $mx'' + cx' + kx = 0$; under-, critically or over-damped as $c^2$ is below, equal to or above $4mk$.`,
        r`RLC: $\omega_n = \frac{1}{\sqrt{LC}}$, the same equation with $L$, $R$, $\frac1C$ for $m$, $c$, $k$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Complex roots',
          problem: r`Solve $y'' + 2y' + 5y = 0$ with $y(0) = 1$, $y'(0) = 3$.`,
          steps: [
            r`$r^2 + 2r + 5 = 0$ gives $r = -1 \pm j2$, so $y = e^{-x}(C_1\cos2x + C_2\sin2x)$.`,
            r`$y(0) = C_1 = 1$; $y'(0) = -C_1 + 2C_2 = 3$ gives $C_2 = 2$.`,
          ],
          answer: r`$y = e^{-x}(\cos2x + 2\sin2x)$.`,
        },
        {
          level: 'board',
          title: 'A cubic, a repeated root, a spring',
          problem: r`(a) Solve $y''' - 2y'' - 5y' + 6y = 0$. (b) Solve $y'' + 6y' + 9y = 0$ with $y(0) = 2$, $y'(0) = -1$. (c) A 2 kg mass hangs on a spring of 50 N/m. Find its natural frequency and period, and the damping coefficient that makes it critically damped.`,
          steps: [
            r`(a) $m^3 - 2m^2 - 5m + 6 = (m - 1)(m + 2)(m - 3)$: $y = C_1e^x + C_2e^{-2x} + C_3e^{3x}$.`,
            r`(b) $m = -3$ twice: $y = (C_1 + C_2x)e^{-3x}$. $C_1 = 2$, and $y'(0) = C_2 - 3C_1 = -1$ gives $C_2 = 5$.`,
            r`(c) $\omega_n = \sqrt{50/2} = 5$ rad/s, $f = 0.796$ Hz, period $1.2566$ s. Critical damping: $c = 2\sqrt{mk} = 20$ N·s/m.`,
          ],
          answer: r`(a) $C_1e^x + C_2e^{-2x} + C_3e^{3x}$; (b) $y = (2 + 5x)e^{-3x}$; (c) 5 rad/s, 1.2566 s, 20 N·s/m.`,
        },
      ],
      traps: [
        r`A repeated root needs the extra factor $x$; two identical exponentials are one solution, not two.`,
        r`Complex roots $\alpha \pm j\beta$ give $\cos\beta x$, not $\cos\alpha x$: the real part is the decay.`,
      ],
      check: [
        { q: r`Solve $y'' + 16y = 0$.`, a: r`$y = C_1\cos4x + C_2\sin4x$.` },
        { q: r`At what frequency does an LC circuit with $L = 0.1$ H and $C = 10$ µF resonate?`, a: r`$\frac{1}{2\pi\sqrt{LC}} = 159.15$ Hz.` },
      ],
    },
    {
      name: 'Undetermined Coefficients',
      inShort: r`A particular solution guessed from the shape of the forcing term.`,
      body: [
        r`For $ay'' + by' + cy = g(x)$, the general solution is the homogeneous one plus **any** particular solution $y_p$. When $g$ is a polynomial, exponential, sine, cosine or a product of these, guess $y_p$ of the same shape with unknown coefficients and match:

| $g(x)$ | Guess for $y_p$ |
|---|---|
| polynomial of degree $n$ | general polynomial of degree $n$ |
| $e^{ax}$ | $Ae^{ax}$ |
| $\sin bx$ or $\cos bx$ | $A\cos bx + B\sin bx$ |
| $e^{ax}\sin bx$ | $e^{ax}(A\cos bx + B\sin bx)$ |

If any term of the guess already solves the homogeneous equation, multiply the guess by $x$ (by $x^2$ for a repeated root). Forcing at the natural frequency gives **resonance**: the response grows without bound.`,
        {
          type: 'plot',
          alt: 'The resonant response x equals t over 2 times sine t, an oscillation whose swings grow steadily inside the dashed straight lines plus and minus t over 2.',
          caption: 'x″ + x = cos t, forced at its natural frequency: x = (t/2) sin t grows inside the dashed lines ±t/2 (resonance).',
          x: [0, 20],
          y: [-10, 10],
          xLabel: 't',
          yLabel: 'x',
          series: [
            { f: (t) => (t / 2) * Math.sin(t), colour: colourOf(0) },
            { f: (t) => t / 2, dashed: true, colour: colourOf(1) },
            { f: (t) => -t / 2, dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Polynomial in, polynomial out; $e^{ax}$ in, $Ae^{ax}$ out; sine or cosine in, both $A\cos + B\sin$ out.`,
        r`If the guess solves the homogeneous equation, multiply by $x$.`,
        r`Forcing at the natural frequency gives resonance: $t\sin\omega t$, growing without bound.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An exponential forcing',
          problem: r`Solve $y'' - y = e^{2x}$.`,
          steps: [
            r`Homogeneous: $C_1e^x + C_2e^{-x}$. Try $Ae^{2x}$: $4A - A = 1$, so $A = \frac13$.`,
            r`$y = C_1e^x + C_2e^{-x} + \frac13e^{2x}$.`,
          ],
          answer: r`$y = C_1e^x + C_2e^{-x} + \frac13e^{2x}$.`,
        },
        {
          level: 'board',
          title: 'A polynomial, resonance, an overlap',
          problem: r`Find a particular solution of (a) $y'' - 3y' + 2y = 4x$, (b) $y'' + 4y = 8\sin2x$, (c) $y'' - y = 3e^x$.`,
          steps: [
            r`(a) $y_p = Ax + B$: $-3A + 2Ax + 2B = 4x$, so $A = 2$, $B = 3$: $y_p = 2x + 3$.`,
            r`(b) $\sin2x$ solves the homogeneous equation, so try $x(A\cos2x + B\sin2x)$. Matching gives $-4A = 8$ and $B = 0$: $y_p = -2x\cos2x$.`,
            r`(c) $e^x$ is homogeneous, so try $Axe^x$: $y_p'' - y_p = 2Ae^x = 3e^x$, $A = 1.5$: $y_p = 1.5xe^x$.`,
          ],
          answer: r`(a) $2x + 3$; (b) $-2x\cos2x$; (c) $1.5xe^x$.`,
        },
      ],
      traps: [
        r`For $\sin bx$ forcing include both $\cos bx$ and $\sin bx$ in the guess.`,
        r`A polynomial guess needs every lower power too: for $4x$ try $Ax + B$, not $Ax$.`,
      ],
      check: [
        { q: r`Find $y_p$ for $y'' + 2y' + 3y = 6e^{2x}$.`, a: r`$(4 + 4 + 3)A = 6$: $\frac{6}{11}e^{2x}$.` },
        { q: r`What guess suits $y'' - 4y' + 3y = \sin x$?`, a: r`$A\cos x + B\sin x$; it gives $\frac15\cos x + \frac{1}{10}\sin x$.` },
      ],
    },
    {
      name: 'Variation of Parameters',
      inShort: r`A particular solution for any forcing, built from the homogeneous solutions and their Wronskian.`,
      body: [
        r`When the forcing is not a shape undetermined coefficients can guess ($\sec x$, $\tan x$, $\ln x$, $\frac1x$), let the constants vary: try $y_p = u_1y_1 + u_2y_2$, with $y_1$ and $y_2$ the homogeneous solutions. With the equation divided so that $y''$ has coefficient 1, $y'' + p\,y' + q\,y = g$:
$$W = y_1y_2' - y_1'y_2, \qquad y_p = -y_1\int\frac{y_2\,g}{W}\,dx + y_2\int\frac{y_1\,g}{W}\,dx.$$
The **Wronskian** $W$ is never zero for independent solutions. Any part of $y_p$ that is a homogeneous solution can be dropped into the constants.`,
      ],
      keyIdeas: [
        r`$W = y_1y_2' - y_1'y_2$; non-zero means independent.`,
        r`$y_p = -y_1\int\frac{y_2g}{W}dx + y_2\int\frac{y_1g}{W}dx$, with $y''$'s coefficient made $1$.`,
        r`Use it when undetermined coefficients has no guess: $\sec x$, $\tan x$, $\ln x$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A secant forcing',
          problem: r`Find a particular solution of $y'' + y = \sec x$.`,
          steps: [
            r`$y_1 = \cos x$, $y_2 = \sin x$, $W = 1$.`,
            r`$y_p = -\cos x\int\sin x\sec x\,dx + \sin x\int\cos x\sec x\,dx = \cos x\ln|\cos x| + x\sin x$.`,
          ],
          answer: r`$y_p = \cos x\ln|\cos x| + x\sin x$.`,
        },
        {
          level: 'board',
          title: 'A tangent, and a repeated root',
          problem: r`Find a particular solution of (a) $y'' + y = \tan x$, (b) $y'' - 2y' + y = \frac{e^x}{x}$.`,
          steps: [
            r`(a) $W = 1$: $u_1 = -\int\sin x\tan x\,dx = \sin x - \ln|\sec x + \tan x|$ and $u_2 = \int\sin x\,dx = -\cos x$. So $y_p = \cos x\sin x - \cos x\ln|\sec x + \tan x| - \sin x\cos x = -\cos x\ln|\sec x + \tan x|$.`,
            r`(b) $y_1 = e^x$, $y_2 = xe^x$, $W = e^{2x}$: $y_p = -e^x\int1\,dx + xe^x\int\frac1x\,dx = -xe^x + xe^x\ln|x|$; dropping the homogeneous $-xe^x$, $y_p = xe^x\ln|x|$.`,
          ],
          answer: r`(a) $-\cos x\ln|\sec x + \tan x|$; (b) $xe^x\ln|x|$.`,
        },
      ],
      traps: [
        r`Divide the equation by the coefficient of $y''$ before reading off $g$.`,
        r`The first term carries the minus sign and the other solution: $-y_1\int\frac{y_2g}{W}$.`,
      ],
      check: [
        { q: r`What is the Wronskian of $e^{2x}$ and $e^{-x}$?`, a: r`$e^{2x}(-e^{-x}) - 2e^{2x}e^{-x} = -3e^x$.` },
        { q: r`Why not undetermined coefficients for $y'' + y = \sec x$?`, a: r`Derivatives of $\sec x$ never close into a finite set to guess from.` },
      ],
    },
    {
      name: 'Cauchy-Euler Equations',
      inShort: r`$ax^2y'' + bxy' + cy = 0$: each power of $x$ matches its derivative, so try $y = x^m$.`,
      body: [
        r`In a **Cauchy-Euler** (equidimensional) equation each derivative is multiplied by the matching power of $x$: $ax^2y'' + bxy' + cy = 0$. Trying $y = x^m$ turns it into the **indicial equation**
$$am(m - 1) + bm + c = 0.$$

| Roots | Solution |
|---|---|
| real, distinct | $C_1x^{m_1} + C_2x^{m_2}$ |
| repeated $m$ | $(C_1 + C_2\ln x)x^m$ |
| complex $\alpha \pm j\beta$ | $x^\alpha[C_1\cos(\beta\ln x) + C_2\sin(\beta\ln x)]$ |

The substitution $x = e^t$ turns the equation into one with constant coefficients, which is why the table mirrors the previous one with $\ln x$ in place of $x$.`,
      ],
      keyIdeas: [
        r`Indicial equation: $am(m - 1) + bm + c = 0$.`,
        r`Distinct roots: $x^{m_1}$, $x^{m_2}$. Repeated: $x^m$ and $x^m\ln x$. Complex: $x^\alpha\cos(\beta\ln x)$, $x^\alpha\sin(\beta\ln x)$.`,
        r`$x = e^t$ turns it into a constant-coefficient equation.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Distinct roots',
          problem: r`Solve $x^2y'' - 2y = 0$.`,
          steps: [
            r`$m(m - 1) - 2 = 0$ gives $m = 2$ and $m = -1$.`,
            r`$y = C_1x^2 + \frac{C_2}{x}$.`,
          ],
          answer: r`$y = C_1x^2 + \frac{C_2}{x}$.`,
        },
        {
          level: 'board',
          title: 'Repeated, complex, and fitted',
          problem: r`Solve (a) $x^2y'' - 3xy' + 4y = 0$, (b) $x^2y'' + xy' + 4y = 0$, (c) $x^2y'' - 2xy' - 4y = 0$ with $y(1) = 5$, $y'(1) = 0$, and find $y(2)$.`,
          steps: [
            r`(a) $m^2 - 4m + 4 = 0$, $m = 2$ twice: $y = (C_1 + C_2\ln x)x^2$.`,
            r`(b) $m^2 + 4 = 0$, $m = \pm j2$: $y = C_1\cos(2\ln x) + C_2\sin(2\ln x)$.`,
            r`(c) $m^2 - 3m - 4 = 0$, $m = 4$ and $-1$: $y = C_1x^4 + \frac{C_2}{x}$. $C_1 + C_2 = 5$ and $4C_1 - C_2 = 0$ give $C_1 = 1$, $C_2 = 4$: $y(2) = 16 + 2 = 18$.`,
          ],
          answer: r`(a) $(C_1 + C_2\ln x)x^2$; (b) $C_1\cos(2\ln x) + C_2\sin(2\ln x)$; (c) $y = x^4 + \frac4x$, $y(2) = 18$.`,
        },
      ],
      traps: [
        r`The indicial equation has $m(m - 1)$, not $m^2$.`,
        r`A repeated root brings $\ln x$, not an extra $x$ as in the constant-coefficient case.`,
      ],
      check: [
        { q: r`What is the indicial equation of $x^2y'' + 3xy' + y = 0$?`, a: r`$m^2 + 2m + 1 = 0$: $m = -1$ twice.` },
        { q: r`Which substitution makes a Cauchy-Euler equation constant-coefficient?`, a: r`$x = e^t$.` },
      ],
    },
    {
      name: 'Laplace Transform Solutions',
      inShort: r`Turning an initial-value problem into algebra in $s$, solving, and transforming back.`,
      body: [
        r`The **Laplace transform** $F(s) = \int_0^\infty e^{-st}f(t)\,dt$ turns derivatives into multiplication by $s$, with the initial values built in, so a linear initial-value problem becomes algebra. The working table:

| $f(t)$ | $F(s)$ | $f(t)$ | $F(s)$ |
|---|---|---|---|
| $1$ | $\frac1s$ | $t^n$ | $\frac{n!}{s^{n+1}}$ |
| $e^{at}$ | $\frac{1}{s - a}$ | $te^{at}$ | $\frac{1}{(s - a)^2}$ |
| $\sin\omega t$ | $\frac{\omega}{s^2 + \omega^2}$ | $\cos\omega t$ | $\frac{s}{s^2 + \omega^2}$ |
| $e^{at}f(t)$ | $F(s - a)$ | $u(t - a)f(t - a)$ | $e^{-as}F(s)$ |
| $y'$ | $sY - y(0)$ | $y''$ | $s^2Y - sy(0) - y'(0)$ |

**Transform** the equation, **solve** for $Y(s)$, split it by **partial fractions**, and read each piece back from the table. The final value of a stable response is $\lim_{s \to 0}sY(s)$:`,
        {
          type: 'plot',
          alt: 'The step response y equals 2 minus 3 e to the minus t plus e to the minus 3t, rising smoothly from 0 to level off at the dashed final value 2.',
          caption: 'y″ + 4y′ + 3y = 6 from rest: y = 2 − 3e^(−t) + e^(−3t) rises smoothly to the final value 2 (dashed).',
          x: [0, 6],
          y: [0, 2.5],
          xLabel: 't',
          yLabel: 'y',
          series: [{ f: (t) => 2 - 3 * Math.exp(-t) + Math.exp(-3 * t), colour: colourOf(0) }],
          marks: [{ y: 2 }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`First derivative: $\mathcal{L}\{y'\} = sY - y(0)$.`,
        r`Second derivative: $\mathcal{L}\{y''\} = s^2Y - sy(0) - y'(0)$.`,
        r`Shifts: $e^{at}f \to F(s - a)$; a delay $u(t - a)f(t - a) \to e^{-as}F(s)$.`,
        r`Invert by partial fractions and the table.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A free response',
          problem: r`Solve $y'' + 3y' + 2y = 0$ with $y(0) = 1$, $y'(0) = 0$.`,
          steps: [
            r`$s^2Y - s + 3(sY - 1) + 2Y = 0$, so $Y = \frac{s + 3}{(s + 1)(s + 2)} = \frac{2}{s + 1} - \frac{1}{s + 2}$.`,
            r`$y = 2e^{-t} - e^{-2t}$.`,
          ],
          answer: r`$y = 2e^{-t} - e^{-2t}$.`,
        },
        {
          level: 'board',
          title: 'A step response, a shifted power, a shifted pair',
          problem: r`(a) Solve $y'' + 4y' + 3y = 6$ from rest, and find $y(1)$. (b) Find $\mathcal L\{t^2e^{3t}\}$. (c) Find the inverse transform of $\frac{s + 5}{s^2 + 4s + 13}$.`,
          steps: [
            r`(a) $(s^2 + 4s + 3)Y = \frac6s$, so $Y = \frac{6}{s(s + 1)(s + 3)} = \frac2s - \frac{3}{s + 1} + \frac{1}{s + 3}$. Then $y = 2 - 3e^{-t} + e^{-3t}$ and $y(1) = 0.9461$.`,
            r`(b) $\mathcal L\{t^2\} = \frac{2}{s^3}$, shifted: $\frac{2}{(s - 3)^3}$.`,
            r`(c) $\frac{(s + 2) + 3}{(s + 2)^2 + 9}$: $e^{-2t}(\cos3t + \sin3t)$.`,
          ],
          answer: r`(a) $y = 2 - 3e^{-t} + e^{-3t}$, $y(1) \approx 0.9461$; (b) $\frac{2}{(s - 3)^3}$; (c) $e^{-2t}(\cos3t + \sin3t)$.`,
        },
      ],
      traps: [
        r`Initial conditions come in with minus signs; dropping $-sy(0)$ is the common slip.`,
        r`A shift in $s$ applies to every $s$: write $s + 5$ as $(s + 2) + 3$ before splitting.`,
      ],
      check: [
        { q: r`What is $\mathcal L\{\sin2t\}$?`, a: r`$\frac{2}{s^2 + 4}$.` },
        { q: r`What is the final value of $Y = \frac{6}{s(s + 1)(s + 3)}$?`, a: r`$\lim_{s \to 0}sY = \frac63 = 2$.` },
      ],
    },
    {
      name: 'Systems of Differential Equations',
      inShort: r`Several linked equations, solved by eigenvalues or by reducing to one equation.`,
      body: [
        r`Two linked first-order equations $\mathbf x' = A\mathbf x$ (two tanks exchanging liquid, two coupled loops of a circuit) are solved by the **eigenvalues** of $A$:
$$\det(A - \lambda I) = \lambda^2 - (\operatorname{tr}A)\lambda + \det A = 0, \qquad \mathbf x = c_1\mathbf v_1e^{\lambda_1t} + c_2\mathbf v_2e^{\lambda_2t},$$
with $\mathbf v_i$ the eigenvector of each $\lambda_i$. Fit $c_1$ and $c_2$ to the initial vector. Alternatively, **eliminate** one unknown: differentiating the first equation and substituting gives $x'' - (\operatorname{tr}A)\,x' + (\det A)\,x = 0$, a single second-order equation. Laplace transforms also handle systems, one algebraic equation per unknown.`,
      ],
      keyIdeas: [
        r`$\mathbf{x}' = A\mathbf{x}$: $\mathbf{x} = c_1\mathbf{v}_1e^{\lambda_1t} + c_2\mathbf{v}_2e^{\lambda_2t}$.`,
        r`Or eliminate one unknown: $x'' - (\text{tr}A)x' + (\det A)x = 0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A symmetric system',
          problem: r`Solve $x' = x + 2y$, $y' = 2x + y$ with $x(0) = 3$, $y(0) = 1$.`,
          steps: [
            r`$\lambda^2 - 2\lambda - 3 = 0$: $\lambda = 3$ with $\mathbf v = (1, 1)$, $\lambda = -1$ with $(1, -1)$.`,
            r`$(3, 1) = 2(1, 1) + (1, -1)$, so $x = 2e^{3t} + e^{-t}$ and $y = 2e^{3t} - e^{-t}$.`,
          ],
          answer: r`$x = 2e^{3t} + e^{-t}$, $y = 2e^{3t} - e^{-t}$.`,
        },
        {
          level: 'board',
          title: 'An unsymmetric system',
          problem: r`Solve $x' = 4x - 2y$, $y' = x + y$ with $x(0) = 4$, $y(0) = 3$.`,
          steps: [
            r`$\operatorname{tr}A = 5$, $\det A = 4 + 2 = 6$: $\lambda^2 - 5\lambda + 6 = 0$, so $\lambda = 2$ and $3$.`,
            r`$\lambda = 2$: $2x - 2y = 0$, $\mathbf v = (1, 1)$. $\lambda = 3$: $x - 2y = 0$, $\mathbf v = (2, 1)$.`,
            r`$a(1, 1) + b(2, 1) = (4, 3)$ gives $b = 1$, $a = 2$: $x = 2e^{2t} + 2e^{3t}$, $y = 2e^{2t} + e^{3t}$.`,
          ],
          answer: r`$x = 2e^{2t} + 2e^{3t}$, $y = 2e^{2t} + e^{3t}$.`,
        },
      ],
      traps: [
        r`Fit the constants to both initial values at once, through the eigenvectors.`,
        r`Each eigenvector solves $(A - \lambda I)\mathbf v = 0$ for its own $\lambda$; mixing them up swaps the exponentials.`,
      ],
      check: [
        { q: r`What single equation does $x' = y$, $y' = -4x$ give?`, a: r`$x'' + 4x = 0$: $x = C_1\cos2t + C_2\sin2t$.` },
        { q: r`Eigenvalues of $A$ with trace 1 and determinant $-6$?`, a: r`$\lambda^2 - \lambda - 6 = 0$: $3$ and $-2$.` },
      ],
    },
  ],
};
