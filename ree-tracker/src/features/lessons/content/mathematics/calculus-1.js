// Library › Lessons › Mathematics › Calculus 1 (2026-11-17; every subtopic in
// the module format 2026-11-27, with figures, examples a step at a time and
// checks; every number re-worked by calculus1Lesson.test.js. Coverage
// cross-checked against two review centers' differential calculus handouts;
// the text, problems and figures are this app's own): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// sin x / x, defined at 0 by its limit so the curve has no gap.
export const sinc = (x) => (x === 0 ? 1 : Math.sin(x) / x);

// The curve x² + xy + y² = 7, traced: turned 45°, it is 1.5u² + 0.5v² = 7.
export const implicitPoint = (t) => {
  const [u, v] = [Math.sqrt(14 / 3) * Math.cos(t), Math.sqrt(14) * Math.sin(t)];
  return [(u + v) / Math.SQRT2, (u - v) / Math.SQRT2];
};

// The circle of curvature of y = x² at (1, 1).
export const CURVATURE = { centre: [-4, 3.5], R: (5 * Math.sqrt(5)) / 2 };

export default {
  topic: 'Calculus 1',
  subject: 'Mathematics',
  overview: r`Differential calculus measures how fast things change. On the board it is limits to evaluate, derivatives to take quickly and correctly, and the applications that make the marks: tangents and normals, maxima and minima, time rates, differentials, curvature and curve sketching. Know the rules cold (product, quotient, chain, and the transcendental derivatives), work in radians, and for word problems write one equation linking the quantities before you differentiate.`,
  sources: [
    'Schaum’s Outline of Calculus (Ayres and Mendelson)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Limits and Continuity',
      inShort: r`What a function approaches, how to evaluate it when substituting fails, and when a function has no break.`,
      body: [
        r`The **limit** $\lim_{x \to a} f(x) = L$ says $f(x)$ gets as close to $L$ as you like when $x$ is close enough to $a$, whatever $f(a)$ itself is. Limits add, multiply, divide (when the bottom's limit isn't zero) and pass through roots, so **substitute first**. When substitution gives an **indeterminate form**, the work begins:

| Form | What to do |
|---|---|
| $\frac00$ | factor and cancel, rationalise a root, or use L'Hôpital |
| $\frac\infty\infty$ | divide by the highest power, or use L'Hôpital |
| $0\cdot\infty$, $\infty - \infty$ | rewrite as one fraction first |
| $0^0$, $\infty^0$, $1^\infty$ | take the logarithm first |

Two limits come up again and again: $\lim_{x \to 0}\frac{\sin x}{x} = 1$ (in radians) and $\lim_{n \to \infty}\left(1 + \frac1n\right)^n = e$. The first is why $\sin x$ has derivative $\cos x$:`,
        {
          type: 'plot',
          alt: 'The curve sin x over x from minus 12 to 12. It oscillates with shrinking swings and rises to a height of 1 at x equals 0, where the dashed line y equals 1 touches it.',
          caption: 'sin x / x is undefined at 0, yet it approaches 1 there (the dashed line): the limit does not care about the value at the point.',
          x: [-12, 12],
          y: [-0.4, 1.2],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ f: sinc, colour: colourOf(0) }],
          marks: [{ y: 1 }],
          legend: false,
        },
        r`**At infinity**, a rational function follows its leading terms: a lower degree on top gives $0$, equal degrees give the ratio of the leading coefficients, a higher degree on top runs off to infinity. That ratio is the **horizontal asymptote**; the zeros of the denominator that don't cancel are the **vertical asymptotes**.

A function is **continuous** at $a$ when $f(a)$ exists and both one-sided limits equal it: no hole, no jump, no blow-up.`,
      ],
      keyIdeas: [
        r`Substitute first; $\frac{0}{0}$ means factor, rationalise or use L'Hôpital.`,
        r`$\lim_{x \to 0}\frac{\sin x}{x} = 1$ (radians); $\lim_{n \to \infty}\left(1 + \frac1n\right)^n = e$.`,
        r`At infinity a rational function follows its leading terms: equal degrees give the ratio of the leading coefficients.`,
        r`The seven indeterminate forms: $\frac00$, $\frac\infty\infty$, $0\cdot\infty$, $\infty - \infty$, $0^0$, $\infty^0$, $1^\infty$.`,
        r`Continuous at $a$: $f(a)$ exists and both one-sided limits equal it.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Factoring, and leading terms',
          problem: r`Evaluate $\lim_{x \to 2}\frac{x^2 - 4}{x - 2}$ and $\lim_{x \to \infty}\frac{3x^2 + 5x}{2x^2 - 7}$.`,
          steps: [
            r`The first is $\frac00$: $\frac{(x - 2)(x + 2)}{x - 2} = x + 2 \to 4$.`,
            r`The second has equal degrees: the ratio of leading coefficients, $\frac32$.`,
          ],
          answer: r`$4$; $\frac32$.`,
        },
        {
          level: 'board',
          title: 'A root, a trig limit, and asymptotes',
          problem: r`(a) Evaluate $\lim_{x \to 0}\frac{\sqrt{x + 9} - 3}{x}$. (b) Evaluate $\lim_{x \to 0}\frac{\sin 3x}{\tan 5x}$. (c) Find the asymptotes of $f(x) = \frac{2x^2 + 3}{x^2 - x - 6}$.`,
          steps: [
            r`(a) Rationalise: $\frac{(x + 9) - 9}{x(\sqrt{x + 9} + 3)} = \frac{1}{\sqrt{x + 9} + 3} \to \frac16$.`,
            r`(b) $\frac{\sin 3x}{3x}\cdot\frac{5x}{\tan 5x}\cdot\frac{3x}{5x} \to 1 \cdot 1 \cdot \frac35$.`,
            r`(c) $x^2 - x - 6 = (x - 3)(x + 2)$ and the top has no such factor: vertical asymptotes $x = 3$ and $x = -2$. Equal degrees: horizontal asymptote $y = 2$.`,
          ],
          answer: r`(a) $\frac16$; (b) $\frac35$; (c) $x = 3$, $x = -2$, $y = 2$.`,
        },
      ],
      traps: [
        r`A limit can exist where the function doesn't (a hole); the limit doesn't care about $f(a)$ itself.`,
        r`$\lim\frac{\sin x}{x} = 1$ needs radians; in degrees it is $\frac{\pi}{180}$.`,
      ],
      check: [
        { q: r`Evaluate $\lim_{x \to \infty}\frac{x^3 - 2x + 9}{2x^3 - 8}$.`, a: r`Equal degrees: $\frac12$.` },
        { q: r`Evaluate $\lim_{x \to 0}\frac{\sin 7x}{x}$.`, a: r`$7$.` },
      ],
    },
    {
      name: 'Differentiation Rules',
      inShort: r`The derivative as a limit, the rules that make it quick, and the tangent and normal lines it gives.`,
      body: [
        r`The **derivative** is the limit of the slope of a secant as its second point slides in:
$$f'(x) = \frac{dy}{dx} = \lim_{h \to 0}\frac{f(x + h) - f(x)}{h}.$$
Geometrically it is the slope of the **tangent**; physically, the instantaneous rate of change:`,
        {
          type: 'plot',
          alt: 'The parabola y equals x squared with three lines through the point 1 comma 1: two dashed secants to the points at x equals 3 and x equals 2, with slopes 4 and 3, and the tangent with slope 2.',
          caption: 'Secants of y = x² from (1, 1) with h = 2 and h = 1 have slopes 4 and 3; as h shrinks they settle on the tangent, slope 2.',
          x: [-1, 3.5],
          y: [-1, 10],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => x * x, label: 'y = x²', colour: colourOf(0) },
            { f: (x) => 4 * x - 3, label: 'secant, h = 2', dashed: true, colour: colourOf(1) },
            { f: (x) => 3 * x - 2, label: 'secant, h = 1', dashed: true, colour: colourOf(3) },
            { f: (x) => 2 * x - 1, label: 'tangent, slope 2', colour: colourOf(2) },
          ],
        },
        r`The rules, with $u$ and $v$ functions of $x$:

| Rule | Derivative |
|---|---|
| constant, power | $(c)' = 0$, $(x^n)' = nx^{n-1}$ |
| sum, constant multiple | $(u + v)' = u' + v'$, $(cu)' = cu'$ |
| product | $(uv)' = u'v + uv'$ |
| quotient | $\left(\frac uv\right)' = \frac{u'v - uv'}{v^2}$ |
| root | $(\sqrt u)' = \frac{u'}{2\sqrt u}$ |

At a point $(x_0, y_0)$ of a curve, the **tangent** has slope $m = f'(x_0)$ and the **normal** (perpendicular to it) has slope $-\frac1m$. Two curves cross at the angle between their tangents, $\tan\theta = \left|\frac{m_2 - m_1}{1 + m_1m_2}\right|$.`,
      ],
      keyIdeas: [
        r`$f'(x) = \lim_{h \to 0}\frac{f(x + h) - f(x)}{h}$: the slope of the tangent.`,
        r`Power: $(x^n)' = nx^{n-1}$; constants drop out; sums split.`,
        r`Product: $(uv)' = u'v + uv'$. Quotient: $\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$.`,
        r`Tangent slope $m = f'(x_0)$; normal slope $-\frac1m$; angle between curves from their tangent slopes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The quotient rule',
          problem: r`Find the slope of $y = \frac{x^2 + 1}{x - 1}$ at $x = 2$.`,
          steps: [
            r`$y' = \frac{2x(x - 1) - (x^2 + 1)}{(x - 1)^2} = \frac{x^2 - 2x - 1}{(x - 1)^2}$.`,
            r`At $x = 2$: $\frac{4 - 4 - 1}{1} = -1$.`,
          ],
          answer: r`$-1$.`,
        },
        {
          level: 'board',
          title: 'Tangent, normal, and two crossing curves',
          problem: r`(a) Find the tangent and normal to $y = 2x^3 - 5x + 1$ at $x = 1$. (b) At what angle do $y = x^2$ and $y = \sqrt x$ cross at $(1, 1)$?`,
          steps: [
            r`(a) $y(1) = -2$ and $y' = 6x^2 - 5 = 1$. Tangent: $y + 2 = x - 1$, that is $x - y - 3 = 0$.`,
            r`Normal, slope $-1$: $y + 2 = -(x - 1)$, that is $x + y + 1 = 0$.`,
            r`(b) Slopes at $x = 1$: $2x = 2$ and $\frac{1}{2\sqrt x} = \frac12$. $\tan\theta = \frac{2 - 0.5}{1 + 1} = 0.75$, so $\theta = 36.87^\circ$.`,
          ],
          answer: r`(a) $x - y - 3 = 0$ and $x + y + 1 = 0$; (b) $36.87^\circ$.`,
        },
      ],
      traps: [
        r`The quotient rule's top is $u'v - uv'$ in that order; swapping it flips the sign.`,
        r`The normal's slope is the negative reciprocal, not just the negative.`,
      ],
      check: [
        { q: r`At what point of $y = x^2 + 1$ is the normal parallel to $x + 4y = 7$?`, a: r`Normal slope $-\frac14$, so the tangent slope is $4 = 2x$: the point $(2, 5)$.` },
        { q: r`Where is the tangent to $y = x^2 - 6x + 3$ horizontal?`, a: r`$2x - 6 = 0$: at $(3, -6)$.` },
      ],
    },
    {
      name: 'Chain Rule and Implicit Differentiation',
      inShort: r`Derivatives of functions inside functions, of curves not solved for $y$, and of inverses.`,
      body: [
        r`The **chain rule** differentiates a function of a function: the outside's derivative, evaluated at the inside, times the inside's derivative,
$$\frac{dy}{dx} = \frac{dy}{du}\cdot\frac{du}{dx}, \qquad (u^n)' = nu^{n-1}u'.$$

A curve given as $F(x, y) = 0$ needn't be solved for $y$. **Differentiate implicitly**: take $\frac{d}{dx}$ of every term, treating $y$ as a function of $x$ (so $y^2$ gives $2yy'$ and $xy$ gives $y + xy'$), then solve for $y'$. Equivalently $y' = -\frac{F_x}{F_y}$. For $y''$, differentiate the $y'$ equation again and substitute the known $y'$:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The tilted oval x squared plus x y plus y squared equals 7, with its tangent and normal lines through the point 1 comma 2.',
          caption: 'x² + xy + y² = 7 at (1, 2): the tangent falls with slope −4/5, the normal rises with slope 5/4 (both dashed).',
          x: [-4, 4],
          y: [-4, 4],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: range(0, 2 * Math.PI, 120).map(implicitPoint), label: 'curve', colour: colourOf(0) },
            { f: (x) => 2 - 0.8 * (x - 1), label: 'tangent', dashed: true, colour: colourOf(1) },
            { f: (x) => 2 + 1.25 * (x - 1), label: 'normal', dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`**Inverses**: if $b = f(a)$, then $(f^{-1})'(b) = \frac{1}{f'(a)}$; in Leibniz form $\frac{dx}{dy} = \frac{1}{dy/dx}$. A **variable power** such as $x^x$ needs logarithms: $\ln y = x\ln x$, so $\frac{y'}{y} = \ln x + 1$.`,
      ],
      keyIdeas: [
        r`Chain: $\frac{d}{dx}g(f(x)) = g'(f(x))\,f'(x)$; for a power, $(u^n)' = nu^{n-1}u'$.`,
        r`Implicit: differentiate both sides treating $y$ as $y(x)$, then solve for $y'$ (or $y' = -\frac{F_x}{F_y}$).`,
        r`Inverse: $(f^{-1})'(b) = \frac{1}{f'(a)}$ where $b = f(a)$.`,
        r`Variable powers like $x^x$: take $\ln$ first.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An implicit slope',
          problem: r`Find the slope of $x^2 + xy + y^2 = 7$ at $(1, 2)$.`,
          steps: [
            r`$2x + y + xy' + 2yy' = 0$, so $y' = -\frac{2x + y}{x + 2y}$.`,
            r`At $(1, 2)$: $-\frac{4}{5}$.`,
          ],
          answer: r`$-\frac45$.`,
        },
        {
          level: 'board',
          title: 'A tangent line, a second derivative, a variable power',
          problem: r`For $x^2 + xy + y^2 = 7$ at $(1, 2)$, find (a) the tangent line and (b) $y''$. (c) Find the slope of $y = x^x$ at $x = 2$.`,
          steps: [
            r`(a) $y - 2 = -0.8(x - 1)$, that is $4x + 5y - 14 = 0$.`,
            r`(b) Differentiate $2x + y + xy' + 2yy' = 0$ again: $2 + 2y' + xy'' + 2y'^2 + 2yy'' = 0$. With $y' = -0.8$: $2 - 1.6 + 1.28 + 5y'' = 0$, so $y'' = -0.336$.`,
            r`(c) $\ln y = x\ln x$, so $y' = x^x(\ln x + 1) = 4(\ln 2 + 1) = 6.7726$.`,
          ],
          answer: r`(a) $4x + 5y - 14 = 0$; (b) $-0.336$; (c) about 6.7726.`,
        },
      ],
      traps: [
        r`Every $y$ term needs its $y'$; $\frac{d}{dx}(xy) = y + xy'$, by the product rule.`,
        r`$x^x$ is neither a power ($nx^{n-1}$) nor an exponential ($a^x\ln a$); take logarithms.`,
      ],
      check: [
        { q: r`Differentiate $\sqrt{2 - 3x^2}$.`, a: r`$\frac{-6x}{2\sqrt{2 - 3x^2}} = \frac{-3x}{\sqrt{2 - 3x^2}}$.` },
        { q: r`Find $y'$ for $xy + x - 2y = 2$.`, a: r`$y + xy' + 1 - 2y' = 0$, so $y' = \frac{y + 1}{2 - x}$.` },
      ],
    },
    {
      name: 'Derivatives of Transcendental Functions',
      inShort: r`Derivatives of the trigonometric, inverse trigonometric, exponential, logarithmic and hyperbolic functions.`,
      body: [
        r`Each rule below carries the chain factor $u'$:

| Function | Derivative | Function | Derivative |
|---|---|---|---|
| $\sin u$ | $\cos u\,u'$ | $\sin^{-1}u$ | $\frac{u'}{\sqrt{1 - u^2}}$ |
| $\cos u$ | $-\sin u\,u'$ | $\cos^{-1}u$ | $\frac{-u'}{\sqrt{1 - u^2}}$ |
| $\tan u$ | $\sec^2u\,u'$ | $\tan^{-1}u$ | $\frac{u'}{1 + u^2}$ |
| $\cot u$ | $-\csc^2u\,u'$ | $\cot^{-1}u$ | $\frac{-u'}{1 + u^2}$ |
| $\sec u$ | $\sec u\tan u\,u'$ | $\sec^{-1}u$ | $\frac{u'}{u\sqrt{u^2 - 1}}$ |
| $\csc u$ | $-\csc u\cot u\,u'$ | $\csc^{-1}u$ | $\frac{-u'}{u\sqrt{u^2 - 1}}$ |
| $e^u$ | $e^u\,u'$ | $\ln u$ | $\frac{u'}{u}$ |
| $a^u$ | $a^u\ln a\,u'$ | $\log_a u$ | $\frac{u'}{u\ln a}$ |
| $\sinh u$ | $\cosh u\,u'$ | $\sinh^{-1}u$ | $\frac{u'}{\sqrt{u^2 + 1}}$ |
| $\cosh u$ | $\sinh u\,u'$ | $\cosh^{-1}u$ | $\frac{u'}{\sqrt{u^2 - 1}}$ |
| $\tanh u$ | $\operatorname{sech}^2u\,u'$ | $\tanh^{-1}u$ | $\frac{u'}{1 - u^2}$ |

The co-functions (cos, cot, csc and their inverses) carry the minus signs; the hyperbolic $\cosh$ does not. A derivative is a slope, so where $\sin x$ peaks its slope $\cos x$ is zero:`,
        {
          type: 'plot',
          alt: 'The curves sin x and cos x from 0 to 2 pi. Where sin x has its peak and trough, cos x crosses zero; where sin x is steepest, cos x is at plus or minus 1.',
          caption: 'sin x and its derivative cos x: the slope of sin x is zero at its peak and trough, and steepest (±1) where it crosses zero.',
          x: [0, 2 * Math.PI],
          y: [-1.2, 1.9],
          xLabel: 'x (rad)',
          yLabel: 'y',
          series: [
            { f: Math.sin, label: 'sin x', colour: colourOf(0) },
            { f: Math.cos, label: 'cos x, its slope', dashed: true, colour: colourOf(1) },
          ],
        },
      ],
      keyIdeas: [
        r`$(\sin u)' = \cos u\,u'$, $(\cos u)' = -\sin u\,u'$, $(\tan u)' = \sec^2u\,u'$.`,
        r`$(\sin^{-1}u)' = \frac{u'}{\sqrt{1 - u^2}}$, $(\tan^{-1}u)' = \frac{u'}{1 + u^2}$.`,
        r`$(e^u)' = e^u u'$, $(a^u)' = a^u\ln a\,u'$, $(\ln u)' = \frac{u'}{u}$, $(\log_a u)' = \frac{u'}{u\ln a}$.`,
        r`$(\sinh u)' = \cosh u\,u'$, $(\cosh u)' = \sinh u\,u'$: no minus.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A product with an exponential',
          problem: r`Differentiate $y = e^{2x}\sin x$ and find the slope at $x = 0$.`,
          steps: [
            r`$y' = 2e^{2x}\sin x + e^{2x}\cos x = e^{2x}(2\sin x + \cos x)$.`,
            r`At $x = 0$: $1(0 + 1) = 1$.`,
          ],
          answer: r`$y' = e^{2x}(2\sin x + \cos x)$; slope 1.`,
        },
        {
          level: 'board',
          title: 'An inverse sine, a common log, a variable base',
          problem: r`Find the slope at the given point: (a) $y = \sin^{-1}2x$ at $x = 0.3$; (b) $y = \log_{10}(x^2 + 1)$ at $x = 3$; (c) $y = 3^{x^2}$ at $x = 1$.`,
          steps: [
            r`(a) $\frac{2}{\sqrt{1 - 4x^2}} = \frac{2}{\sqrt{0.64}} = 2.5$.`,
            r`(b) $\frac{2x}{(x^2 + 1)\ln 10} = \frac{6}{10 \times 2.3026} = 0.2606$.`,
            r`(c) $3^{x^2}\ln 3 \cdot 2x = 3 \times 1.0986 \times 2 = 6.592$.`,
          ],
          answer: r`(a) 2.5; (b) about 0.2606; (c) about 6.592.`,
        },
      ],
      traps: [
        r`The co-functions (cos, cot, csc and their inverses) carry the minus signs.`,
        r`$(a^x)' = a^x\ln a$, not $xa^{x-1}$: the variable is in the exponent.`,
      ],
      check: [
        { q: r`Differentiate $\sec(x^2 + 2)$.`, a: r`$2x\sec(x^2 + 2)\tan(x^2 + 2)$.` },
        { q: r`Differentiate $\cos^{-1}4x$.`, a: r`$\frac{-4}{\sqrt{1 - 16x^2}}$.` },
      ],
    },
    {
      name: 'Higher-Order Derivatives',
      inShort: r`Differentiating again and again, the patterns that give the $n$th derivative at once, and Taylor series.`,
      body: [
        r`The second derivative $y'' = \frac{d^2y}{dx^2}$ is the rate of change of the slope (concavity, acceleration); the third, $y'''$, and so on follow. Patterns save the work:

| Function | $n$th derivative |
|---|---|
| $x^m$ | $\frac{m!}{(m - n)!}x^{m - n}$; zero past the $m$th |
| $e^{ax}$ | $a^ne^{ax}$ |
| $\sin x$, $\cos x$ | repeat every four: $\sin\left(x + \frac{n\pi}{2}\right)$, $\cos\left(x + \frac{n\pi}{2}\right)$ |
| $\ln x$ | $\frac{(-1)^{n-1}(n - 1)!}{x^n}$ |
| $uv$ (Leibniz) | $\sum\binom{n}{k}u^{(k)}v^{(n - k)}$ |

All the derivatives at one point build the **Taylor series**, a polynomial that copies the function near $a$:
$$f(x) = f(a) + f'(a)(x - a) + \frac{f''(a)}{2!}(x - a)^2 + \cdots, \qquad \text{coefficient of }(x - a)^n = \frac{f^{(n)}(a)}{n!}.$$
About $a = 0$ it is the **Maclaurin series**: $e^x = 1 + x + \frac{x^2}{2!} + \cdots$, $\sin x = x - \frac{x^3}{3!} + \cdots$, $\cos x = 1 - \frac{x^2}{2!} + \cdots$. Each added term hugs the curve longer:`,
        {
          type: 'plot',
          alt: 'The curve e to the x from minus 3 to 2, with its Maclaurin polynomials of degree 1, 2 and 3 drawn dashed. All four agree near x equals 0, and the higher degrees stay close for longer.',
          caption: 'eˣ and its Maclaurin polynomials 1 + x, then + x²/2, then + x³/6: near 0 they all agree, and each degree stays close longer.',
          x: [-3, 2],
          y: [-2, 8],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: Math.exp, label: 'eˣ', colour: colourOf(0) },
            { f: (x) => 1 + x, label: 'degree 1', dashed: true, colour: colourOf(1) },
            { f: (x) => 1 + x + (x * x) / 2, label: 'degree 2', dashed: true, colour: colourOf(2) },
            { f: (x) => 1 + x + (x * x) / 2 + (x ** 3) / 6, label: 'degree 3', dashed: true, colour: colourOf(3) },
          ],
        },
      ],
      keyIdeas: [
        r`$\frac{d^n}{dx^n}x^m = \frac{m!}{(m - n)!}x^{m - n}$; past the $m$th it is $0$.`,
        r`$\sin x$ repeats every four derivatives; $(e^{ax})^{(n)} = a^ne^{ax}$.`,
        r`Leibniz: $(uv)^{(n)} = \sum\binom{n}{k}u^{(k)}v^{(n - k)}$.`,
        r`Taylor coefficient of $(x - a)^n$: $\frac{f^{(n)}(a)}{n!}$; Maclaurin is $a = 0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A third derivative by Leibniz',
          problem: r`Find the third derivative of $y = xe^x$.`,
          steps: [
            r`Only the terms with $x$ or its first derivative survive: $\binom30xe^x + \binom31(1)e^x$.`,
            r`$y''' = xe^x + 3e^x = (x + 3)e^x$.`,
          ],
          answer: r`$(x + 3)e^x$.`,
        },
        {
          level: 'board',
          title: 'Patterns and Taylor coefficients',
          problem: r`(a) Find the fifth derivative of $3x^8$. (b) Find the 43rd derivative of $\cos x$. (c) Find the coefficient of $(x - 1)^3$ in the Taylor series of $\ln x$ about $x = 1$, and of $x^4$ in the Maclaurin series of $e^{3x}$.`,
          steps: [
            r`(a) $3 \times 8 \times 7 \times 6 \times 5 \times 4\,x^3 = 20\,160x^3$.`,
            r`(b) $43 = 4(10) + 3$: the third derivative of $\cos x$, which is $\sin x$.`,
            r`(c) $(\ln x)''' = \frac{2}{x^3} = 2$ at $x = 1$, so $\frac{2}{3!} = \frac13$. And $\frac{3^4}{4!} = \frac{81}{24} = 3.375$.`,
          ],
          answer: r`(a) $20\,160x^3$; (b) $\sin x$; (c) $\frac13$ and $3.375$.`,
        },
      ],
      traps: [
        r`For the $n$th derivative of $\sin x$ use $\sin\left(x + \frac{n\pi}{2}\right)$, rather than counting by hand.`,
        r`The Taylor coefficient divides by $n!$; the derivative alone is not the coefficient.`,
      ],
      check: [
        { q: r`What is the 125th derivative of $\sin x$?`, a: r`$125 = 4(31) + 1$: $\cos x$.` },
        { q: r`What is the coefficient of $(x - 2)^2$ in the Taylor series of $x^3$ about 2?`, a: r`$\frac{6(2)}{2!} = 6$.` },
      ],
    },
    {
      name: 'Curve Sketching',
      inShort: r`Reading a graph's shape from its derivatives: rising and falling, bending, turning points, curvature and asymptotes.`,
      body: [
        r`The first derivative says where a curve **rises** ($f' > 0$) or **falls** ($f' < 0$); a **critical point** has $f' = 0$. The second says how it **bends**: concave up ($f'' > 0$) or down ($f'' < 0$); an **inflection point** is where the bending changes sign.

| Test | Maximum | Minimum | Inflection |
|---|---|---|---|
| first derivative | $f'$ changes $+$ to $-$ | $f'$ changes $-$ to $+$ | $f'$ keeps its sign |
| second derivative | $f' = 0$, $f'' < 0$ | $f' = 0$, $f'' > 0$ | $f'' = 0$ and changes sign |
| third derivative | | | $f'' = 0$, $f''' \ne 0$ |`,
        {
          type: 'plot',
          alt: 'The cubic y equals x cubed minus 3 x squared. It rises to a maximum at the origin, falls through an inflection point at 1 comma minus 2, reaches a minimum at 2 comma minus 4, and rises again. The three points are marked with dashed guides.',
          caption: 'y = x³ − 3x²: maximum (0, 0), inflection (1, −2), minimum (2, −4).',
          x: [-1.5, 3.5],
          y: [-6, 4],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ f: (x) => x ** 3 - 3 * x * x, colour: colourOf(0) }],
          marks: [{ at: [0, 0] }, { at: [1, -2] }, { at: [2, -4] }],
          legend: false,
        },
        r`**Curvature** measures how sharply a curve turns: the rate the tangent's angle changes per unit length. The **circle of curvature** fits the curve best at a point, on its concave side, with radius $R = \frac1\kappa$:

| Curve | Curvature $\kappa$ |
|---|---|
| $y = f(x)$ | $\frac{|y''|}{(1 + y'^2)^{3/2}}$ |
| parametric | $\frac{|x'y'' - x''y'|}{(x'^2 + y'^2)^{3/2}}$ |
| polar $r(\theta)$ | $\frac{|r^2 + 2r'^2 - rr''|}{(r^2 + r'^2)^{3/2}}$ |

The **centre of curvature** is $h = x - \frac{y'(1 + y'^2)}{y''}$, $k = y + \frac{1 + y'^2}{y''}$; as the point moves, the centre traces the **evolute**:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The parabola y equals x squared and its circle of curvature at the point 1 comma 1. The circle, centred at minus 4 comma 3.5 with radius about 5.59, touches the parabola on its inner side; a dashed radius joins the centre to the point.',
          caption: 'y = x² at (1, 1): the circle of curvature, centre (−4, 3.5), radius 5.59 (dashed).',
          x: [-10, 4],
          y: [-3, 10],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => x * x, colour: colourOf(0) },
            { points: range(0, 2 * Math.PI, 120).map((t) => [CURVATURE.centre[0] + CURVATURE.R * Math.cos(t), CURVATURE.centre[1] + CURVATURE.R * Math.sin(t)]), colour: colourOf(1) },
            { points: [CURVATURE.centre, [1, 1]], dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`For a rational function, vertical asymptotes sit at the denominator's zeros, the horizontal one comes from the degrees, and a slant one from long division when the top is one degree higher.`,
      ],
      keyIdeas: [
        r`$f' > 0$ rising, $f' < 0$ falling; $f' = 0$ marks possible turning points.`,
        r`$f'' > 0$ concave up, $f'' < 0$ concave down; an inflection is where $f''$ changes sign.`,
        r`Curvature $\kappa = \frac{|y''|}{(1 + y'^2)^{3/2}}$; radius $R = \frac1\kappa$; centre $\left(x - \frac{y'(1 + y'^2)}{y''},\ y + \frac{1 + y'^2}{y''}\right)$.`,
        r`Rational functions: vertical asymptotes at the denominator's zeros, horizontal by degree, slant by long division.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Turning points and inflection',
          problem: r`Sketch $f(x) = x^3 - 3x^2$: turning points and inflection.`,
          steps: [
            r`$f' = 3x(x - 2)$: a maximum at $(0, 0)$ and a minimum at $(2, -4)$.`,
            r`$f'' = 6x - 6$: inflection at $(1, -2)$. Rising, falling on $(0, 2)$, rising again.`,
          ],
          answer: r`Max $(0, 0)$, min $(2, -4)$, inflection $(1, -2)$.`,
        },
        {
          level: 'board',
          title: 'A cubic, a chosen inflection, a radius of curvature',
          problem: r`(a) For $y = x^3 - 6x^2 + 9x + 1$, find the turning points, the inflection point and the tangent there. (b) Find $a$ and $b$ so that $y = ax^3 + bx^2 + 2$ has an inflection at $(1, 6)$. (c) Find the radius and centre of curvature of $y = x^2$ at $(1, 1)$.`,
          steps: [
            r`(a) $y' = 3(x - 1)(x - 3)$: maximum $(1, 5)$, minimum $(3, 1)$. $y'' = 6x - 12$: inflection $(2, 3)$, where $y' = -3$, so the tangent is $3x + y - 9 = 0$.`,
            r`(b) $y''(1) = 6a + 2b = 0$ and $a + b + 2 = 6$: $b = -3a$, so $-2a = 4$, $a = -2$, $b = 6$.`,
            r`(c) $y' = 2$, $y'' = 2$: $R = \frac{(1 + 4)^{3/2}}{2} = \frac{5\sqrt5}{2} = 5.590$. Centre: $h = 1 - \frac{2(5)}{2} = -4$, $k = 1 + \frac52 = 3.5$.`,
          ],
          answer: r`(a) max $(1, 5)$, min $(3, 1)$, inflection $(2, 3)$, $3x + y - 9 = 0$; (b) $a = -2$, $b = 6$; (c) $R \approx 5.590$, centre $(-4, 3.5)$.`,
        },
      ],
      traps: [
        r`$f''(c) = 0$ alone is not an inflection: $x^4$ has $f''(0) = 0$ and none.`,
        r`Curvature uses $(1 + y'^2)^{3/2}$, not $(1 + y')^{3/2}$.`,
      ],
      check: [
        { q: r`What is the radius of curvature of $y = \sin x$ at $x = \frac{\pi}{2}$?`, a: r`$y' = 0$, $y'' = -1$: $R = 1$.` },
        { q: r`Find the inflection point of $y = x^3 - 3x^2 + 6$.`, a: r`$6x - 6 = 0$: $(1, 4)$.` },
      ],
    },
    {
      name: 'Maxima and Minima',
      inShort: r`Finding the largest or smallest value, the board's favourite application.`,
      body: [
        r`To optimise: **name the quantity** to make largest or smallest; **write it in one variable**, using the constraint to eliminate the rest, and note the variable's sensible range; **set its derivative to zero**; then **check** the root is a maximum or minimum and makes physical sense (and, on a closed interval, compare the end points).`,
        {
          type: 'plot',
          alt: 'The volume of an open box cut from a 12 centimetre square, plotted against the size x of the corner cut from 0 to 6. The volume rises from 0 to a peak of 128 at x equals 2 and falls back to 0 at x equals 6.',
          caption: 'The open box from a 12 cm square: V = x(12 − 2x)² peaks at x = 2 with 128 cm³.',
          x: [0, 6],
          y: [0, 140],
          xLabel: 'corner cut x (cm)',
          yLabel: 'V (cm³)',
          series: [{ f: (x) => x * (12 - 2 * x) ** 2, colour: colourOf(0) }],
          marks: [{ at: [2, 128] }],
          legend: false,
        },
        r`Results worth knowing by heart:

| Situation | Best choice |
|---|---|
| rectangle of fixed perimeter | a square |
| open box from a square of side $s$ | cut $\frac s6$ |
| closed can of fixed volume, least metal | height = diameter |
| running cost $\propto v^3$ plus a fixed cost per hour | minimise cost per km: $\frac{kv^3 + F}{v}$ |
| boat against a current $c$, cost per hour $\propto v^3$ | $v = 1.5c$ |
| longest ladder round a corner from widths $a$ and $b$ | $\left(a^{2/3} + b^{2/3}\right)^{3/2}$ |`,
      ],
      keyIdeas: [
        r`Critical points: $f' = 0$ or undefined; on a closed interval, also the end points.`,
        r`$f''(c) < 0$ maximum, $f''(c) > 0$ minimum; if $0$, check the sign change of $f'$.`,
        r`Word problems: write the quantity in one variable using the constraint, then differentiate.`,
        r`Worth remembering: fixed perimeter, a square; open box from side $s$, cut $\frac{s}{6}$; closed can, $h = 2r$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The open box',
          problem: r`Equal squares are cut from the corners of a $12$ cm square sheet to fold an open box. What cut gives the largest box?`,
          steps: [
            r`$V = x(12 - 2x)^2$, $V' = (12 - 2x)(12 - 6x) = 0$.`,
            r`$x = 2$ (the other root, $6$, leaves nothing): $V = 2(8)^2 = 128$ cm³.`,
          ],
          answer: r`A 2 cm cut, 128 cm³.`,
        },
        {
          level: 'board',
          title: 'Economical speed, a current, a corner',
          problem: r`(a) A boat's fuel costs ₱300 an hour at 10 kph and varies as the cube of the speed; other costs are ₱2400 an hour. Find the cheapest speed per kilometre. (b) Fuel cost per hour varies as the cube of the speed through the water. How fast should a boat go against a 6 kph current to cover a distance most cheaply? (c) How long a pole can be carried flat round a right-angled corner from a 1.5 m corridor into a 2 m one?`,
          steps: [
            r`(a) $k = \frac{300}{1000} = 0.3$. Cost per km $C = \frac{0.3v^3 + 2400}{v} = 0.3v^2 + \frac{2400}{v}$; $C' = 0.6v - \frac{2400}{v^2} = 0$ gives $v^3 = 4000$, $v = 15.87$ kph.`,
            r`(b) Cost $\propto \frac{v^3}{v - 6}$; its derivative is zero when $3v^2(v - 6) = v^3$, so $v = 9$ kph.`,
            r`(c) $\left(1.5^{2/3} + 2^{2/3}\right)^{3/2} = 4.933$ m.`,
          ],
          answer: r`(a) about 15.87 kph; (b) 9 kph; (c) about 4.933 m.`,
        },
      ],
      traps: [
        r`Check the root makes physical sense; the derivative also finds the useless one.`,
        r`Against a current, the cost depends on the time, $\frac{d}{v - c}$, not on the distance alone.`,
      ],
      check: [
        { q: r`Find two numbers that add to 50 with the largest product.`, a: r`25 and 25.` },
        { q: r`What is the largest rectangle 20 ft of fence can enclose in the corner of two walls?`, a: r`$x + y = 20$: a 10 ft square, 100 ft².` },
      ],
    },
    {
      name: 'Time Rates',
      inShort: r`How fast one quantity changes when another linked to it does, and motion along a line.`,
      body: [
        r`When quantities are linked by an equation and change with time, their rates are linked by its derivative. **Write the equation** (similar triangles, Pythagoras, a volume formula); **differentiate with respect to** $t$; then **substitute the instant's values** and solve for the unknown rate. A positive rate increases; a decreasing quantity has a negative rate.

| Situation | Linking equation | Rates |
|---|---|---|
| sphere | $V = \frac43\pi r^3$ | $\dot V = 4\pi r^2\dot r$ |
| filling cone, vertex down | $V = \frac13\pi r^2h$, $r$ in proportion to $h$ | $\dot V = \pi r^2\dot h$ |
| sliding ladder | $x^2 + y^2 = L^2$ | $x\dot x + y\dot y = 0$ |
| two ships or cars | $s^2 = x^2 + y^2$ | $s\dot s = x\dot x + y\dot y$ |

**Motion in a line** is the same idea: with position $s(t)$, the velocity is $v = \frac{ds}{dt}$ and the acceleration $a = \frac{dv}{dt} = \frac{d^2s}{dt^2}$. The particle is at rest when $v = 0$ and turns round where $v$ changes sign.`,
      ],
      keyIdeas: [
        r`Write the equation linking the quantities, differentiate with respect to $t$, then substitute the instant's values.`,
        r`Sphere: $\frac{dV}{dt} = 4\pi r^2\frac{dr}{dt}$; a filling cone: $\frac{dV}{dt} = \pi r^2\frac{dh}{dt}$ with $r$ the surface radius.`,
        r`Ladder: $x^2 + y^2 = L^2$ gives $x\dot x + y\dot y = 0$.`,
        r`Motion: $v = \frac{ds}{dt}$, $a = \frac{d^2s}{dt^2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A filling cone',
          problem: r`Water flows at $0.5$ m³/min into a conical tank, vertex down, with a top radius of $2$ m and a depth of $6$ m. How fast is the level rising when the water is $3$ m deep?`,
          steps: [
            r`By similar triangles $r = \frac{h}{3}$, so $V = \frac{\pi h^3}{27}$ and $\frac{dV}{dt} = \frac{\pi h^2}{9}\frac{dh}{dt}$.`,
            r`At $h = 3$: $0.5 = \pi\frac{dh}{dt}$, so $\frac{dh}{dt} = \frac{0.5}{\pi} \approx 0.159$ m/min.`,
          ],
          answer: r`About 0.159 m/min.`,
        },
        {
          level: 'board',
          title: 'A ladder, two cars, a moving particle',
          problem: r`(a) The foot of a 5 m ladder slides from a wall at 0.4 m/s. How fast does the top slide down when the foot is 3 m out? (b) A car leaves a junction at noon going east at 40 kph; another leaves at 1 pm going north at 60 kph. How fast are they separating at 3 pm? (c) A particle moves by $s = t^3 - 9t^2 + 24t$. When is it at rest, and what is its acceleration the first time?`,
          steps: [
            r`(a) $y = 4$; $3(0.4) + 4\dot y = 0$, so $\dot y = -0.3$ m/s: the top slides down at 0.3 m/s.`,
            r`(b) At 3 pm, $x = 120$ and $y = 120$ km, $s = 169.7$ km: $\dot s = \frac{120(40) + 120(60)}{169.7} = 70.71$ kph.`,
            r`(c) $v = 3t^2 - 18t + 24 = 3(t - 2)(t - 4)$: at rest at $t = 2$ and $t = 4$. $a = 6t - 18 = -6$ at $t = 2$.`,
          ],
          answer: r`(a) 0.3 m/s down; (b) about 70.71 kph; (c) $t = 2$ and $4$; $a = -6$.`,
        },
      ],
      traps: [
        r`Substitute the instant's numbers only after differentiating; a constant put in too early has zero rate.`,
        r`For the second car, count its time from its own start: at 3 pm it has run 2 hours, not 3.`,
      ],
      check: [
        { q: r`A balloon gains 100 cm³/s. How fast is its radius growing at 5 cm?`, a: r`$100 = 4\pi(25)\dot r$: $\frac1\pi \approx 0.318$ cm/s.` },
        { q: r`For $s = 4t^2 - t^3$, find the velocity and acceleration at $t = 2$.`, a: r`$v = 8t - 3t^2 = 4$; $a = 8 - 6t = -4$.` },
      ],
    },
    {
      name: 'Differentials',
      inShort: r`Small changes along the tangent: approximations and how errors grow.`,
      body: [
        r`The **differential** $dy = f'(x)\,dx$ is the change along the tangent; for a small step it is close to the true change $\Delta y$, so
$$f(x + \Delta x) \approx f(x) + f'(x)\,\Delta x.$$
Choose a nearby point where the function is easy (a perfect square or cube, a known angle):`,
        {
          type: 'plot',
          alt: 'The curve square root of x and its dashed tangent at x equals 4. Near 4 they almost coincide; at x equals 6 the tangent gives 2.5 against the true value 2.449.',
          caption: 'The tangent to √x at 4 is y = 1 + x/4: at x = 6 it gives 2.5, the curve 2.449.',
          x: [0, 10],
          y: [0, 4],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: Math.sqrt, label: '√x', colour: colourOf(0) },
            { f: (x) => 1 + x / 4, label: 'tangent at 4', dashed: true, colour: colourOf(1) },
          ],
        },
        r`**Errors** travel the same way: $dx$ is the error in a measurement, $\frac{dx}{x}$ its relative error, and $100 \times \frac{dx}{x}$ the percentage error. For a power, $y = kx^n$, the relative errors multiply by the exponent: $\frac{dy}{y} = n\frac{dx}{x}$.`,
      ],
      keyIdeas: [
        r`$dy = f'(x)\,dx$, and $f(x + \Delta x) \approx f(x) + f'(x)\Delta x$.`,
        r`For $y = kx^n$: $\frac{dy}{y} = n\frac{dx}{x}$; a 1% error in a radius is about 3% in a sphere's volume.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A cube root',
          problem: r`Approximate $\sqrt[3]{65}$ with differentials.`,
          steps: [
            r`$f(x) = x^{1/3}$ at $64$: $f' = \frac{1}{3x^{2/3}} = \frac{1}{48}$.`,
            r`$\sqrt[3]{65} \approx 4 + \frac{1}{48} \approx 4.0208$ (true $4.0207$).`,
          ],
          answer: r`About 4.0208.`,
        },
        {
          level: 'board',
          title: 'A measured sphere, and a sine',
          problem: r`(a) A sphere's radius is measured as 10 cm, with a possible error of 0.05 cm. Find the possible error and percentage error in its volume. (b) Approximate $\sin31^\circ$.`,
          steps: [
            r`(a) $dV = 4\pi r^2\,dr = 4\pi(100)(0.05) = 20\pi = 62.83$ cm³.`,
            r`Percentage: $3 \times \frac{0.05}{10} = 1.5\%$.`,
            r`(b) From $30^\circ$ with $dx = 1^\circ = 0.017453$ rad: $0.5 + \cos30^\circ(0.017453) = 0.51511$ (true $0.51504$).`,
          ],
          answer: r`(a) about 62.83 cm³, 1.5%; (b) about 0.51511.`,
        },
      ],
      traps: [
        r`Pick the nearby point where the function is easy (a perfect cube, a known angle); the step must be small.`,
        r`For trigonometric functions the step must be in radians.`,
      ],
      check: [
        { q: r`A cube's edge has a 1% error. About what is the error in its volume?`, a: r`3%.` },
        { q: r`A circle's radius has a 2% error. About what is the error in its area?`, a: r`4%.` },
      ],
    },
    {
      name: 'Mean Value Theorems',
      inShort: r`Somewhere the instantaneous slope equals the average slope: the theorem and its relatives.`,
      body: [
        r`If $f$ is continuous on $[a, b]$ and differentiable inside, the **mean value theorem** promises a point $c$ between where the tangent is parallel to the chord:
$$f'(c) = \frac{f(b) - f(a)}{b - a}.$$`,
        {
          type: 'plot',
          alt: 'The parabola y equals x squared, with the chord from 1 comma 1 to 3 comma 9 and the dashed tangent at x equals 2. Both have slope 4, so they are parallel.',
          caption: 'y = x² on [1, 3]: the chord has slope 4, and so does the tangent at c = 2 (dashed).',
          x: [0, 4],
          y: [0, 12],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => x * x, label: 'y = x²', colour: colourOf(0) },
            { points: [[1, 1], [3, 9]], label: 'chord, slope 4', colour: colourOf(1) },
            { f: (x) => 4 * x - 4, label: 'tangent at 2', dashed: true, colour: colourOf(2) },
          ],
        },
        r`**Rolle's theorem** is the case $f(a) = f(b)$: somewhere $f'(c) = 0$. **Cauchy's** version, for two functions, $\frac{f'(c)}{g'(c)} = \frac{f(b) - f(a)}{g(b) - g(a)}$, is what proves L'Hôpital's rule.`,
      ],
      keyIdeas: [
        r`MVT: $f'(c) = \frac{f(b) - f(a)}{b - a}$ for some $c$ in $(a, b)$, if $f$ is continuous on $[a, b]$ and differentiable inside.`,
        r`Rolle: $f(a) = f(b)$ gives a point with $f'(c) = 0$.`,
        r`Cauchy's version, for two functions, proves L'Hôpital's rule.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A quadratic',
          problem: r`Find the $c$ promised by the mean value theorem for $f(x) = x^2$ on $[1, 3]$.`,
          steps: [
            r`Average slope $\frac{9 - 1}{2} = 4$, and $f'(c) = 2c = 4$, so $c = 2$.`,
            r`For a quadratic it is always the midpoint.`,
          ],
          answer: r`$c = 2$.`,
        },
        {
          level: 'board',
          title: 'A cubic, Rolle, a logarithm',
          problem: r`Find the promised $c$: (a) the MVT for $x^3$ on $[0, 3]$; (b) Rolle's theorem for $x^2 - 4x + 3$ on $[1, 3]$; (c) the MVT for $\ln x$ on $[1, e]$.`,
          steps: [
            r`(a) $\frac{27 - 0}{3} = 9 = 3c^2$, so $c = \sqrt3 = 1.732$.`,
            r`(b) $f(1) = f(3) = 0$; $2c - 4 = 0$, so $c = 2$.`,
            r`(c) $\frac{1 - 0}{e - 1} = \frac1c$, so $c = e - 1 = 1.718$.`,
          ],
          answer: r`(a) about 1.732; (b) 2; (c) about 1.718.`,
        },
      ],
      traps: [
        r`Check the conditions: $|x|$ on $[-1, 1]$ has equal end values but no point with zero slope.`,
        r`The theorem says such a $c$ exists, inside the interval; reject roots outside it.`,
      ],
      check: [
        { q: r`Does Rolle's theorem apply to $\frac1x$ on $[-1, 1]$?`, a: r`No: it is not continuous at 0.` },
        { q: r`Find the MVT point for $x^2 + 2x$ on $[0, 4]$.`, a: r`The midpoint, $c = 2$.` },
      ],
    },
    {
      name: "L'Hôpital's Rule",
      inShort: r`Evaluating indeterminate limits by differentiating the top and bottom separately.`,
      body: [
        r`For a limit of the form $\frac00$ or $\frac\infty\infty$,
$$\lim\frac{f(x)}{g(x)} = \lim\frac{f'(x)}{g'(x)},$$
provided the right side exists; repeat while the form stays indeterminate. The other forms are first turned into a fraction:

| Form | Rewrite |
|---|---|
| $0\cdot\infty$ | $fg = \frac{f}{1/g}$ |
| $\infty - \infty$ | combine into one fraction |
| $0^0$, $\infty^0$, $1^\infty$ | $L = \lim f^g$, so $\ln L = \lim g\ln f$ |

For $1^\infty$ there is a shortcut: $\lim f^{\,g} = e^{\lim g(f - 1)}$. The classic case is $e$ itself:`,
        {
          type: 'plot',
          alt: 'The curve 1 plus 1 over x, all to the power x, for x from 0 to 20. It rises steeply and then levels off just below the dashed line at e, about 2.718.',
          caption: '(1 + 1/x)ˣ, a 1 to the infinity form, creeps up to e = 2.718 (dashed).',
          x: [0, 20],
          y: [1, 3],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ f: (x) => (1 + 1 / x) ** x, colour: colourOf(0) }],
          marks: [{ y: Math.E }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`For $\frac00$ or $\frac\infty\infty$: $\lim\frac{f}{g} = \lim\frac{f'}{g'}$; repeat while it stays indeterminate.`,
        r`Rewrite $0\cdot\infty$ and $\infty - \infty$ as a fraction; for $0^0$, $1^\infty$, $\infty^0$ take $\ln$ first.`,
        r`$1^\infty$ shortcut: $\lim f^{\,g} = e^{\lim g(f - 1)}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Twice',
          problem: r`Evaluate $\lim_{x \to 0}\frac{1 - \cos x}{x^2}$.`,
          steps: [
            r`$\frac00$: $\lim\frac{\sin x}{2x}$, still $\frac00$.`,
            r`Once more: $\frac{\cos x}{2} \to \frac12$.`,
          ],
          answer: r`$\frac12$.`,
        },
        {
          level: 'board',
          title: 'Three indeterminate forms',
          problem: r`Evaluate (a) $\lim_{x \to 0}\frac{e^x - 1 - x}{x^2}$, (b) $\lim_{x \to 0^+}x\ln x$, (c) $\lim_{x \to \infty}\left(1 + \frac2x\right)^{3x}$.`,
          steps: [
            r`(a) $\frac00$ twice: $\frac{e^x - 1}{2x}$, then $\frac{e^x}{2} \to \frac12$.`,
            r`(b) $0\cdot\infty$: $\frac{\ln x}{1/x}$ is $\frac\infty\infty$, giving $\frac{1/x}{-1/x^2} = -x \to 0$.`,
            r`(c) $1^\infty$: $e^{\lim 3x(2/x)} = e^6 = 403.43$.`,
          ],
          answer: r`(a) $\frac12$; (b) $0$; (c) $e^6 \approx 403.43$.`,
        },
      ],
      traps: [
        r`Differentiate top and bottom separately; it is not the quotient rule. And stop once the form is no longer indeterminate.`,
        r`For a power form, the limit of the logarithm is $\ln L$: remember to raise $e$ to it at the end.`,
      ],
      check: [
        { q: r`Evaluate $\lim_{x \to \infty}\left(1 + \frac1x\right)^{3x}$.`, a: r`$e^3$.` },
        { q: r`Evaluate $\lim_{x \to 0}(1 + 2x)^{1/x}$.`, a: r`$e^2$.` },
      ],
    },
    {
      name: 'Parametric Equations',
      inShort: r`Slopes, tangents, concavity, speed and acceleration of curves given in a parameter or in polar form.`,
      body: [
        r`For $x = f(t)$, $y = g(t)$ the slope is the ratio of the rates, and the second derivative divides by $\frac{dx}{dt}$ once more:
$$\frac{dy}{dx} = \frac{dy/dt}{dx/dt}, \qquad \frac{d^2y}{dx^2} = \frac{\frac{d}{dt}\left(\frac{dy}{dx}\right)}{dx/dt}.$$
The tangent is horizontal where $\frac{dy}{dt} = 0$ and vertical where $\frac{dx}{dt} = 0$:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The curve x equals t squared, y equals t cubed minus 3t, for t from minus 2.2 to 2.2. It is symmetric about the x axis, crosses itself at 3 comma 0, and has horizontal tangents at 1 comma 2 and 1 comma minus 2.',
          caption: 'x = t², y = t³ − 3t: horizontal tangents at t = ±1, the points (1, −2) and (1, 2); the curve crosses itself at (3, 0).',
          x: [0, 5],
          y: [-4.5, 4.5],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: range(-2.2, 2.2, 120).map((t) => [t * t, t ** 3 - 3 * t]), colour: colourOf(0) }],
          legend: false,
        },
        r`A particle on the path moves with **velocity** components $\dot x$, $\dot y$ and **acceleration** components $\ddot x$, $\ddot y$; its speed is $v = \sqrt{\dot x^2 + \dot y^2}$ and the size of its acceleration $a = \sqrt{\ddot x^2 + \ddot y^2}$.

For a **polar curve** $r(\theta)$, put $x = r\cos\theta$, $y = r\sin\theta$ with $\theta$ as the parameter:
$$\frac{dy}{dx} = \frac{r'\sin\theta + r\cos\theta}{r'\cos\theta - r\sin\theta}.$$`,
      ],
      keyIdeas: [
        r`$\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$; horizontal tangent where $\frac{dy}{dt} = 0$, vertical where $\frac{dx}{dt} = 0$.`,
        r`$\frac{d^2y}{dx^2} = \frac{\frac{d}{dt}\left(\frac{dy}{dx}\right)}{dx/dt}$.`,
        r`Speed $\sqrt{\dot x^2 + \dot y^2}$; acceleration $\sqrt{\ddot x^2 + \ddot y^2}$.`,
        r`Polar slope: $\frac{r'\sin\theta + r\cos\theta}{r'\cos\theta - r\sin\theta}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Horizontal tangents',
          problem: r`For $x = t^2$, $y = t^3 - 3t$, find the points with horizontal tangents and the slope at $t = 2$.`,
          steps: [
            r`$\frac{dy}{dx} = \frac{3t^2 - 3}{2t}$.`,
            r`Horizontal at $t = \pm1$: the points $(1, -2)$ and $(1, 2)$. At $t = 2$: $\frac{9}{4}$.`,
          ],
          answer: r`$(1, \mp2)$; $\frac94$.`,
        },
        {
          level: 'board',
          title: 'Concavity, a moving particle, a polar slope',
          problem: r`(a) For $x = t^2$, $y = t^3 - 3t$, find $\frac{d^2y}{dx^2}$ at $t = 2$. (b) A particle moves by $x = 2t^2$, $y = t^3$. Find its speed and acceleration at $t = 2$. (c) Find the slope of $r = 1 + \cos\theta$ at $\theta = \frac{\pi}{2}$.`,
          steps: [
            r`(a) $\frac{d}{dt}\left(\frac{3t^2 - 3}{2t}\right) = \frac{3t^2 + 3}{2t^2}$; divide by $2t$: $\frac{3t^2 + 3}{4t^3} = \frac{15}{32} = 0.46875$.`,
            r`(b) $\dot x = 4t = 8$, $\dot y = 3t^2 = 12$: $v = \sqrt{208} = 14.42$. $\ddot x = 4$, $\ddot y = 6t = 12$: $a = \sqrt{160} = 12.65$.`,
            r`(c) $r = 1$, $r' = -\sin\theta = -1$: $\frac{(-1)(1) + 0}{0 - 1} = 1$.`,
          ],
          answer: r`(a) $\frac{15}{32}$; (b) about 14.42 and 12.65; (c) 1.`,
        },
      ],
      traps: [
        r`The second derivative divides by $\frac{dx}{dt}$ again; it is not $\frac{d^2y/dt^2}{d^2x/dt^2}$.`,
        r`Speed adds the components as a vector; it is not $\dot x + \dot y$.`,
      ],
      check: [
        { q: r`For $x = t^3 + 1$, $y = t^2 + 1$, find $\frac{dy}{dx}$.`, a: r`$\frac{2t}{3t^2} = \frac{2}{3t}$.` },
        { q: r`For $x = \sin t$, $y = \cos 2t$, find $\frac{d^2y}{dx^2}$.`, a: r`$y = 1 - 2x^2$, so $-4$.` },
      ],
    },
    {
      name: 'Partial Differentiation',
      inShort: r`Rates of change of functions of several variables, one variable at a time.`,
      body: [
        r`For $z = f(x, y)$, the **partial derivative** $f_x = \frac{\partial z}{\partial x}$ differentiates in $x$ with $y$ held constant; $f_y$ the other way. Second partials follow: $f_{xx}$, $f_{yy}$, and the mixed $f_{xy}$ (first in $x$, then in $y$), which equals $f_{yx}$ for smooth functions.

| Tool | Formula |
|---|---|
| total differential | $dz = f_x\,dx + f_y\,dy$ |
| chain rule | $\frac{dz}{dt} = f_x\frac{dx}{dt} + f_y\frac{dy}{dt}$ |
| relative error of $z = kx^my^n$ | $\frac{dz}{z} = m\frac{dx}{x} + n\frac{dy}{y}$ |
| gradient, directional derivative | $\nabla f = (f_x, f_y)$, $D_{\hat u}f = \nabla f\cdot\hat u$ |
| critical point test | $D = f_{xx}f_{yy} - f_{xy}^2$: $D > 0$ and $f_{xx} > 0$ min, $f_{xx} < 0$ max; $D < 0$ saddle |`,
      ],
      keyIdeas: [
        r`$f_x$: differentiate in $x$ holding the others constant; $f_{xy} = f_{yx}$ for smooth functions.`,
        r`Total differential $dz = f_x\,dx + f_y\,dy$; chain rule $\frac{dz}{dt} = f_x\dot x + f_y\dot y$.`,
        r`Gradient $\nabla f$ points uphill; $D_{\hat u}f = \nabla f \cdot \hat u$.`,
        r`Critical points: $D = f_{xx}f_{yy} - f_{xy}^2$ decides max, min or saddle.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Partials and a total differential',
          problem: r`For $z = x^2y + 3xy^2$, find $z_x$ and $z_y$ at $(1, 2)$, and the change in $z$ when $x$ grows by $0.01$ and $y$ falls by $0.02$.`,
          steps: [
            r`$z_x = 2xy + 3y^2 = 16$, $z_y = x^2 + 6xy = 13$.`,
            r`$dz = 16(0.01) + 13(-0.02) = -0.10$.`,
          ],
          answer: r`16, 13; about $-0.10$.`,
        },
        {
          level: 'board',
          title: 'A mixed partial, a power error, a minimum',
          problem: r`(a) For $f = x^3y^2 + 4xy^3$, find $f_{xy}$ at $(1, 2)$. (b) In $P = I^2R$, the current is 2% high and the resistance 1% low. About what is the error in $P$? (c) Find and classify the critical point of $f = x^2 + y^2 - 4x + 6y$.`,
          steps: [
            r`(a) $f_x = 3x^2y^2 + 4y^3$, then $f_{xy} = 6x^2y + 12y^2 = 12 + 48 = 60$.`,
            r`(b) $\frac{dP}{P} = 2(2\%) + (-1\%) = 3\%$ high.`,
            r`(c) $f_x = 2x - 4 = 0$, $f_y = 2y + 6 = 0$: $(2, -3)$. $D = 4 > 0$ with $f_{xx} > 0$: a minimum, $f = -13$.`,
          ],
          answer: r`(a) 60; (b) about 3% high; (c) a minimum, $-13$ at $(2, -3)$.`,
        },
      ],
      traps: [
        r`In $z_x$, a term like $3xy^2$ differentiates to $3y^2$: $y$ is a constant there.`,
        r`With $D < 0$ the point is a saddle, neither maximum nor minimum, whatever $f_{xx}$ says.`,
      ],
      check: [
        { q: r`Find $\frac{\partial}{\partial x}(xy^2 - 5y + 6)$.`, a: r`$y^2$.` },
        { q: r`For $z = x^2y$ with $x = 2t$, $y = t^2$, find $\frac{dz}{dt}$ at $t = 1$.`, a: r`$2xy(2) + x^2(2t) = 8 + 8 = 16$.` },
      ],
    },
  ],
};
