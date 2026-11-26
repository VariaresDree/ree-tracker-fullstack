// Library › Lessons › Mathematics › Calculus 2 (2026-11-17; every subtopic in
// the module format 2026-11-27, with figures, examples a step at a time and
// checks; every number re-worked by calculus2Lesson.test.js. Coverage
// cross-checked against two review centers' integral calculus handouts; the
// text, problems and figures are this app's own): written for the Philippine
// REE board, subtopic by subtopic in the syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
// A polar curve r(θ) traced in x and y.
const polar = (fr, n = 240) => range(0, 2 * Math.PI, n).map((t) => [fr(t) * Math.cos(t), fr(t) * Math.sin(t)]);

// The spring in the work figure: k = 600 N/m, stretched from 0.05 m to 0.10 m.
export const SPRING = { k: 600, from: 0.05, to: 0.1 };

export default {
  topic: 'Calculus 2',
  subject: 'Mathematics',
  overview: r`Integral calculus adds things up: areas, volumes, lengths, centroids, work and fluid force are all integrals of a small piece. On the board, half the work is recognising the form (a basic formula, a substitution, parts, a trigonometric power, partial fractions) and half is setting up the application: draw the slice, write its size, and integrate across the region. Keep $+C$ on indefinite integrals and check that limits are in the variable you integrate.`,
  sources: [
    'Schaum’s Outline of Calculus (Ayres and Mendelson)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Integration Formulas',
      inShort: r`The basic antiderivatives and the substitution that reaches them.`,
      body: [
        r`Integration undoes differentiation: $\int f(x)\,dx = F(x) + C$ when $F' = f$. The constant matters, because every curve $F + C$ has the same slope at each $x$:`,
        {
          type: 'plot',
          alt: 'Three parabolas, y equals x squared minus 2, x squared, and x squared plus 2, stacked one above another. At every x they have the same slope, 2x.',
          caption: 'x² − 2, x² and x² + 2 are all antiderivatives of 2x: the same slope at every x, shifted by the constant C.',
          x: [-3, 3],
          y: [-3, 10],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => x * x - 2, dashed: true, colour: colourOf(1) },
            { f: (x) => x * x, colour: colourOf(0) },
            { f: (x) => x * x + 2, dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`Each formula below holds with $u$ any function of $x$, once $du$ is present: that is **substitution**. Look for an inside function whose derivative also appears, and fix a constant factor if needed.

| Integral | Result | Integral | Result |
|---|---|---|---|
| $\int u^n\,du$ | $\frac{u^{n+1}}{n + 1}$ ($n \ne -1$) | $\int\frac{du}{u}$ | $\ln|u|$ |
| $\int e^u\,du$ | $e^u$ | $\int a^u\,du$ | $\frac{a^u}{\ln a}$ |
| $\int\sin u\,du$ | $-\cos u$ | $\int\cos u\,du$ | $\sin u$ |
| $\int\tan u\,du$ | $\ln|\sec u|$ | $\int\cot u\,du$ | $\ln|\sin u|$ |
| $\int\sec u\,du$ | $\ln|\sec u + \tan u|$ | $\int\csc u\,du$ | $\ln|\csc u - \cot u|$ |
| $\int\sec^2u\,du$ | $\tan u$ | $\int\sec u\tan u\,du$ | $\sec u$ |
| $\int\sinh u\,du$ | $\cosh u$ | $\int\cosh u\,du$ | $\sinh u$ |
| $\int\frac{du}{\sqrt{a^2 - u^2}}$ | $\sin^{-1}\frac ua$ | $\int\frac{du}{a^2 + u^2}$ | $\frac1a\tan^{-1}\frac ua$ |
| $\int\frac{du}{u^2 - a^2}$ | $\frac{1}{2a}\ln\left|\frac{u - a}{u + a}\right|$ | $\int\frac{du}{\sqrt{u^2 \pm a^2}}$ | $\ln\left|u + \sqrt{u^2 \pm a^2}\right|$ |
| $\int\sqrt{a^2 - u^2}\,du$ | $\frac u2\sqrt{a^2 - u^2} + \frac{a^2}{2}\sin^{-1}\frac ua$ | $\int\frac{du}{u\sqrt{u^2 - a^2}}$ | $\frac1a\sec^{-1}\frac ua$ |`,
      ],
      keyIdeas: [
        r`$\int u^n du = \frac{u^{n+1}}{n+1}$ ($n \ne -1$); $\int\frac{du}{u} = \ln|u|$; $\int e^u du = e^u$.`,
        r`$\int\sin u = -\cos u$, $\int\cos u = \sin u$, $\int\tan u = \ln|\sec u|$, $\int\sec u = \ln|\sec u + \tan u|$.`,
        r`$\int\frac{du}{a^2 + u^2} = \frac1a\tan^{-1}\frac{u}{a}$; $\int\frac{du}{\sqrt{a^2 - u^2}} = \sin^{-1}\frac{u}{a}$.`,
        r`Substitution: find an inside function whose derivative is also present.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A substitution, and a completed square',
          problem: r`Evaluate $\int x\sqrt{x^2 + 9}\,dx$ and $\int\frac{dx}{x^2 + 4x + 13}$.`,
          steps: [
            r`With $u = x^2 + 9$, $du = 2x\,dx$: $\frac12\int\sqrt u\,du = \frac13(x^2 + 9)^{3/2} + C$.`,
            r`Complete the square, $(x + 2)^2 + 9$: $\frac13\tan^{-1}\frac{x + 2}{3} + C$.`,
          ],
          answer: r`$\frac13(x^2 + 9)^{3/2} + C$; $\frac13\tan^{-1}\frac{x + 2}{3} + C$.`,
        },
        {
          level: 'board',
          title: 'Four forms to recognise',
          problem: r`Evaluate (a) $\int\frac{dx}{x^2 - 9}$, (b) $\int\tan^2x\,dx$, (c) $\int e^{\sin3x}\cos3x\,dx$, (d) $\int\frac{dx}{\sqrt{16 - x^2}}$.`,
          steps: [
            r`(a) The $u^2 - a^2$ form with $a = 3$: $\frac16\ln\left|\frac{x - 3}{x + 3}\right| + C$.`,
            r`(b) $\tan^2x = \sec^2x - 1$: $\tan x - x + C$.`,
            r`(c) $u = \sin3x$, $du = 3\cos3x\,dx$: $\frac13e^{\sin3x} + C$.`,
            r`(d) $\sin^{-1}\frac x4 + C$.`,
          ],
          answer: r`(a) $\frac16\ln\left|\frac{x - 3}{x + 3}\right| + C$; (b) $\tan x - x + C$; (c) $\frac13e^{\sin3x} + C$; (d) $\sin^{-1}\frac x4 + C$.`,
        },
      ],
      traps: [
        r`$\int\frac{dx}{x^2 + 9}$ gives an inverse tangent, but $\int\frac{dx}{x^2 - 9}$ a logarithm: one sign apart.`,
        r`A substitution needs $du$ in full: $\int e^{x^2}dx$ has no $x\,dx$ to pair with and no elementary answer.`,
      ],
      check: [
        { q: r`Evaluate $\int(3t - 1)^3\,dt$.`, a: r`$\frac{1}{12}(3t - 1)^4 + C$.` },
        { q: r`Evaluate $\int\frac{4\,dx}{2x + 5}$.`, a: r`$2\ln|2x + 5| + C$.` },
      ],
    },
    {
      name: 'Definite Integrals',
      inShort: r`Integrals between limits: evaluating them, their properties, shortcuts from symmetry and Wallis, and motion.`,
      body: [
        r`The **definite integral** $\int_a^b f(x)\,dx = F(b) - F(a)$ is the signed area between the curve and the $x$ axis (area below the axis counts negative). Swapping the limits flips the sign; adjacent intervals add. The **average value** of $f$ on $[a, b]$ is the height of the rectangle with the same area:`,
        {
          type: 'plot',
          alt: 'The curve y equals x squared from 0 to 3 with the area beneath it shaded, and a dashed horizontal line at height 3: the rectangle under that line has the same area, 9.',
          caption: 'Under y = x² from 0 to 3 the area is 9; spread evenly over the width 3 it is a height of 3 (dashed), the average value.',
          x: [0, 3],
          y: [0, 10],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ f: (x) => x * x, area: true, colour: colourOf(0) }],
          marks: [{ y: 3 }],
          legend: false,
        },
        r`Shortcuts:

| Situation | Result |
|---|---|
| even function, $[-a, a]$ | $2\int_0^af$ |
| odd function, $[-a, a]$ | $0$ |
| Wallis, $\int_0^{\pi/2}\sin^mx\cos^nx\,dx$ | $\frac{(m - 1)(m - 3)\cdots\,(n - 1)(n - 3)\cdots}{(m + n)(m + n - 2)\cdots}\,\alpha$, each product down to 1 or 2 ($1$ if the power is $0$); $\alpha = \frac\pi2$ when $m$ and $n$ are both even, else $1$ |
| a variable limit | $\frac{d}{dx}\int_a^{g(x)}f(t)\,dt = f(g(x))\,g'(x)$ |
| motion | $v = \int a\,dt$, $s = \int v\,dt$; distance travelled adds $|v|$, so split where $v$ changes sign |`,
      ],
      keyIdeas: [
        r`$\int_a^b f = F(b) - F(a)$; swapping limits flips the sign; adjacent intervals add.`,
        r`Symmetric limits: an even function doubles half the integral, an odd one gives $0$.`,
        r`Average value $\frac{1}{b - a}\int_a^b f$; $\frac{d}{dx}\int_a^{g(x)}f(t)dt = f(g(x))g'(x)$.`,
        r`Wallis: $\int_0^{\pi/2}\sin^n x\,dx = \frac{(n-1)!!}{n!!}$, times $\frac{\pi}{2}$ when $n$ is even.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Wallis, and an average',
          problem: r`Evaluate $\int_0^{\pi/2}\sin^5x\,dx$, and find the average of $x^2$ on $[0, 3]$.`,
          steps: [
            r`Wallis, $n = 5$ odd: $\frac{4\cdot2}{5\cdot3\cdot1} = \frac{8}{15}$.`,
            r`Average: $\frac13\int_0^3x^2dx = \frac13\cdot9 = 3$.`,
          ],
          answer: r`$\frac{8}{15}$; $3$.`,
        },
        {
          level: 'board',
          title: 'A mixed Wallis, a moving particle, an absolute value',
          problem: r`(a) Evaluate $\int_0^{\pi/2}\sin^4x\cos^2x\,dx$. (b) A particle moves with $v = 3t^2 - 12t + 9$ m/s. Find its displacement and the distance it travels from $t = 0$ to $t = 4$. (c) Evaluate $\int_{-2}^3|x|\,dx$.`,
          steps: [
            r`(a) Both powers even: $\frac{(3\cdot1)(1)}{6\cdot4\cdot2}\cdot\frac\pi2 = \frac{\pi}{32} = 0.09817$.`,
            r`(b) $s = t^3 - 6t^2 + 9t$: $s(0) = 0$, $s(1) = 4$, $s(3) = 0$, $s(4) = 4$. Displacement 4 m. The velocity changes sign at $t = 1$ and $3$, so the distance is $4 + 4 + 4 = 12$ m.`,
            r`(c) Two triangles: $\frac12(2)(2) + \frac12(3)(3) = 6.5$.`,
          ],
          answer: r`(a) $\frac{\pi}{32}$; (b) 4 m and 12 m; (c) 6.5.`,
        },
      ],
      traps: [
        r`With a substitution, change the limits to the new variable, or go back to $x$ before evaluating.`,
        r`Distance is not displacement: split the integral wherever the velocity changes sign.`,
      ],
      check: [
        { q: r`What is the average of $\sin x$ on $[0, \pi]$?`, a: r`$\frac2\pi \approx 0.6366$.` },
        { q: r`Evaluate $\int_{-1}^1x^5\,dx$.`, a: r`$0$: the integrand is odd.` },
      ],
    },
    {
      name: 'Integration by Parts',
      inShort: r`Undoing the product rule: $\int u\,dv = uv - \int v\,du$.`,
      body: [
        r`The product rule backwards gives
$$\int u\,dv = uv - \int v\,du.$$
Choose $u$ as the factor that simplifies when differentiated, by the order **LIATE**: logarithmic, inverse trigonometric, algebraic, trigonometric, exponential. Three patterns cover most board items:

| Pattern | How |
|---|---|
| polynomial times $e^{ax}$, $\sin$ or $\cos$ | **tabular**: differentiate the polynomial down to $0$, integrate the other factor alongside, multiply diagonally with signs $+, -, +, \ldots$ |
| $\ln x$ or an inverse trig function alone | take $dv = dx$: $\int\ln x\,dx = x\ln x - x$ |
| $e^{ax}\sin bx$ or $e^{ax}\cos bx$ | parts twice brings the integral back; solve for it: $\int e^{ax}\sin bx\,dx = \frac{e^{ax}(a\sin bx - b\cos bx)}{a^2 + b^2}$ |`,
      ],
      keyIdeas: [
        r`Choose $u$ by LIATE: logarithmic, inverse trigonometric, algebraic, trigonometric, exponential.`,
        r`Tabular: differentiate a polynomial down to $0$ while integrating the other factor, alternating signs.`,
        r`$\int e^{ax}\sin bx\,dx$: parts twice brings the integral back; solve for it.`,
        r`$\int\ln x\,dx = x\ln x - x + C$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One application',
          problem: r`Evaluate $\int_0^1 xe^{2x}\,dx$.`,
          steps: [
            r`$u = x$, $dv = e^{2x}dx$: $\frac{x}{2}e^{2x} - \frac14e^{2x}$.`,
            r`From $0$ to $1$: $\left(\frac{e^2}{2} - \frac{e^2}{4}\right) + \frac14 = \frac{e^2}{4} + \frac14 \approx 2.097$.`,
          ],
          answer: r`About 2.097.`,
        },
        {
          level: 'board',
          title: 'Tabular, the returning integral, a logarithm',
          problem: r`Evaluate (a) $\int x^2e^x\,dx$, (b) $\int_0^\pi e^x\sin x\,dx$, (c) $\int_1^ex\ln x\,dx$.`,
          steps: [
            r`(a) Tabular: $x^2, 2x, 2, 0$ against $e^x$ each time: $e^x(x^2 - 2x + 2) + C$.`,
            r`(b) $\int e^x\sin x\,dx = \frac{e^x(\sin x - \cos x)}{2}$; from $0$ to $\pi$: $\frac{e^\pi + 1}{2} = 12.0703$.`,
            r`(c) $u = \ln x$, $dv = x\,dx$: $\frac{x^2}{2}\ln x - \frac{x^2}{4}$; from $1$ to $e$: $\frac{e^2}{4} + \frac14 = 2.0973$.`,
          ],
          answer: r`(a) $e^x(x^2 - 2x + 2) + C$; (b) about 12.0703; (c) about 2.0973.`,
        },
      ],
      traps: [
        r`Choosing $u = e^{2x}$ makes the new integral harder, not easier.`,
        r`In the tabular method the signs alternate starting with $+$; a missed sign spoils every later term.`,
      ],
      check: [
        { q: r`Evaluate $\int_1^e\ln x\,dx$.`, a: r`$[x\ln x - x]_1^e = 1$.` },
        { q: r`What is $u$ in $\int x\cos x\,dx$?`, a: r`$u = x$: the algebraic factor, which differentiates away.` },
      ],
    },
    {
      name: 'Trigonometric Integrals',
      inShort: r`Powers and products of sines, cosines, tangents and secants.`,
      body: [
        r`The identities decide the method:

| Integrand | Method |
|---|---|
| $\sin^mx\cos^nx$, one power odd | save one factor of the odd one, convert the rest with $\sin^2 + \cos^2 = 1$, substitute |
| $\sin^mx\cos^nx$, both even | half-angle: $\sin^2x = \frac{1 - \cos2x}{2}$, $\cos^2x = \frac{1 + \cos2x}{2}$ |
| $\tan^mx\sec^nx$ | save $\sec^2x$ (with $u = \tan x$) or $\sec x\tan x$ (with $u = \sec x$) |
| $\sin ax\cos bx$ and the like | product to sum: $\sin A\cos B = \frac12[\sin(A + B) + \sin(A - B)]$ |
| $\sec^3x$ | $\frac12(\sec x\tan x + \ln|\sec x + \tan x|)$ |

The half-angle identity shows why $\sin^2x$ averages $\frac12$: it is $\frac12$ minus a cosine that cancels over each period:`,
        {
          type: 'plot',
          alt: 'The curve sine squared x from 0 to pi with the area under it shaded. It rises from 0 to 1 and back; a dashed line at height one half cuts it so the area above the line equals the gap below.',
          caption: 'sin² x = (1 − cos 2x)/2 swings about ½ (dashed): over 0 to π its area is π/2.',
          x: [0, Math.PI],
          y: [0, 1.2],
          xLabel: 'x (rad)',
          yLabel: 'y',
          series: [{ f: (x) => Math.sin(x) ** 2, area: true, colour: colourOf(0) }],
          marks: [{ y: 0.5 }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`An odd power: save one factor, convert the rest with $\sin^2 + \cos^2 = 1$, substitute.`,
        r`Even powers: $\sin^2x = \frac{1 - \cos 2x}{2}$, $\cos^2x = \frac{1 + \cos 2x}{2}$.`,
        r`Products of different frequencies: product-to-sum. $\int\sec^3x\,dx = \frac12(\sec x\tan x + \ln|\sec x + \tan x|)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An odd power of sine',
          problem: r`Evaluate $\int\sin^3x\cos^2x\,dx$.`,
          steps: [
            r`Save one $\sin x$: $\int(1 - \cos^2x)\cos^2x\sin x\,dx$.`,
            r`With $u = \cos x$, $du = -\sin x\,dx$: $-\frac{\cos^3x}{3} + \frac{\cos^5x}{5} + C$.`,
          ],
          answer: r`$-\frac{\cos^3x}{3} + \frac{\cos^5x}{5} + C$.`,
        },
        {
          level: 'board',
          title: 'Limits, a product, an even power',
          problem: r`Evaluate (a) $\int_0^{\pi/2}\sin^3x\cos^2x\,dx$, (b) $\int\sin3x\cos5x\,dx$, (c) $\int_0^\pi\sin^2x\,dx$.`,
          steps: [
            r`(a) From the basic example: $\left(0\right) - \left(-\frac13 + \frac15\right) = \frac{2}{15}$; Wallis agrees, $\frac{2\cdot1}{5\cdot3\cdot1}$.`,
            r`(b) $\frac12\int(\sin8x - \sin2x)\,dx = -\frac{\cos8x}{16} + \frac{\cos2x}{4} + C$.`,
            r`(c) $\int_0^\pi\frac{1 - \cos2x}{2}\,dx = \frac\pi2$.`,
          ],
          answer: r`(a) $\frac{2}{15}$; (b) $-\frac{\cos8x}{16} + \frac{\cos2x}{4} + C$; (c) $\frac\pi2$.`,
        },
      ],
      traps: [
        r`With $u = \cos x$, $du = -\sin x\,dx$: the minus sign is easy to lose.`,
        r`$\sin(3x - 5x) = -\sin2x$: watch the sign in product to sum.`,
      ],
      check: [
        { q: r`Evaluate $\int\cos^2y\,dy$.`, a: r`$\frac y2 + \frac{\sin2y}{4} + C$.` },
        { q: r`Evaluate $\int_0^{\pi/2}\sin^6x\,dx$.`, a: r`$\frac{5\cdot3\cdot1}{6\cdot4\cdot2}\cdot\frac\pi2 = \frac{5\pi}{32}$.` },
      ],
    },
    {
      name: 'Trigonometric Substitution',
      inShort: r`Clearing square roots of quadratics with a trigonometric substitution.`,
      body: [
        r`A square root of a quadratic becomes a single trigonometric function under the right substitution:

| Root | Substitute | Then the root is |
|---|---|---|
| $\sqrt{a^2 - u^2}$ | $u = a\sin\theta$ | $a\cos\theta$ |
| $\sqrt{a^2 + u^2}$ | $u = a\tan\theta$ | $a\sec\theta$ |
| $\sqrt{u^2 - a^2}$ | $u = a\sec\theta$ | $a\tan\theta$ |

After integrating in $\theta$, draw the right triangle the substitution describes to return to $u$, or change the limits. The first root is a circle, so its integrals are pieces of a circle's area:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The upper half of the circle of radius 3 centred at the origin, with the area under it from 0 to 3 shaded: a quarter of the circle.',
          caption: 'y = √(9 − x²) is a semicircle of radius 3: the shaded area from 0 to 3 is a quarter circle, 9π/4.',
          x: [-3.5, 3.5],
          y: [0, 3.5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: range(Math.PI, 0, 120).map((t) => [3 * Math.cos(t), 3 * Math.sin(t)]), colour: colourOf(0) },
            { points: range(0, 3, 60).map((x) => [x, Math.sqrt(Math.max(0, 9 - x * x))]), area: true, colour: colourOf(0) },
          ],
          legend: false,
        },
        r`For a rational function of $\sin x$ and $\cos x$, the half-angle substitution $t = \tan\frac x2$ turns it into a rational function of $t$.`,
      ],
      keyIdeas: [
        r`$\sqrt{a^2 - u^2}$: $u = a\sin\theta$. $\sqrt{a^2 + u^2}$: $u = a\tan\theta$. $\sqrt{u^2 - a^2}$: $u = a\sec\theta$.`,
        r`Draw the right triangle to change the answer back to $u$.`,
        r`For rational functions of $\sin x$ and $\cos x$: $t = \tan\frac{x}{2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A tangent substitution with limits',
          problem: r`Evaluate $\int_0^3\frac{dx}{(9 + x^2)^{3/2}}$.`,
          steps: [
            r`$x = 3\tan\theta$, $dx = 3\sec^2\theta\,d\theta$, and $(9 + x^2)^{3/2} = 27\sec^3\theta$.`,
            r`$\frac19\int_0^{\pi/4}\cos\theta\,d\theta = \frac19\cdot\frac{\sqrt2}{2} = \frac{\sqrt2}{18} \approx 0.0786$.`,
          ],
          answer: r`About 0.0786.`,
        },
        {
          level: 'board',
          title: 'A quarter circle, a triangle back to x, an inverse sine',
          problem: r`Evaluate (a) $\int_0^3\sqrt{9 - x^2}\,dx$, (b) $\int\frac{dx}{x^2\sqrt{x^2 + 4}}$, (c) $\int_0^1\frac{dx}{\sqrt{4 - x^2}}$.`,
          steps: [
            r`(a) $x = 3\sin\theta$: $9\int_0^{\pi/2}\cos^2\theta\,d\theta = \frac{9\pi}{4} = 7.0686$, a quarter of the circle's area.`,
            r`(b) $x = 2\tan\theta$: $\int\frac{2\sec^2\theta\,d\theta}{4\tan^2\theta\cdot2\sec\theta} = \frac14\int\frac{\cos\theta}{\sin^2\theta}\,d\theta = -\frac{1}{4\sin\theta}$. The triangle has $\sin\theta = \frac{x}{\sqrt{x^2 + 4}}$: $-\frac{\sqrt{x^2 + 4}}{4x} + C$.`,
            r`(c) $\sin^{-1}\frac12 - 0 = \frac\pi6 = 0.5236$.`,
          ],
          answer: r`(a) $\frac{9\pi}{4}$; (b) $-\frac{\sqrt{x^2 + 4}}{4x} + C$; (c) $\frac\pi6$.`,
        },
      ],
      traps: [
        r`Change the limits too: $x = 3$ is $\theta = \frac{\pi}{4}$, not $3$.`,
        r`$\sqrt{x^2 + 4}$ calls for the tangent, not the sine: the sign under the root decides.`,
      ],
      check: [
        { q: r`What substitution suits $\int\frac{dx}{\sqrt{x^2 - 25}}$?`, a: r`$x = 5\sec\theta$.` },
        { q: r`If $x = \tan\theta$, what does $\int_1^{\sqrt3}\sqrt{1 + x^2}\,dx$ become?`, a: r`$\int_{\pi/4}^{\pi/3}\sec^3\theta\,d\theta$.` },
      ],
    },
    {
      name: 'Partial Fractions',
      inShort: r`Splitting a rational function into simple fractions that integrate to logarithms and inverse tangents.`,
      body: [
        r`A rational function $\frac{P(x)}{Q(x)}$ with a lower-degree top splits by the factors of the bottom (divide first if the top's degree is not lower):

| Factor of $Q$ | Terms |
|---|---|
| distinct linear $x - a$ | $\frac{A}{x - a}$; cover-up: $A = \frac{P(a)}{Q'(a)}$ |
| repeated $(x - a)^k$ | $\frac{A_1}{x - a} + \frac{A_2}{(x - a)^2} + \cdots + \frac{A_k}{(x - a)^k}$ |
| irreducible quadratic | $\frac{Ax + B}{x^2 + px + q}$: a logarithm and an inverse tangent |

Find the constants by cover-up, by substituting convenient $x$ values, or by matching coefficients. Each linear term integrates to a logarithm: $\int\frac{A}{x - a}dx = A\ln|x - a|$, and $\int\frac{A}{(x - a)^2}dx = -\frac{A}{x - a}$.`,
      ],
      keyIdeas: [
        r`Divide first if the top's degree is not less than the bottom's.`,
        r`Distinct linear factors: $\frac{A}{x - a} + \frac{B}{x - b}$; cover-up gives $A = \frac{P(a)}{Q'(a)}$.`,
        r`Repeated: $\frac{A_1}{x - a} + \frac{A_2}{(x - a)^2}$; irreducible quadratic: $\frac{Ax + B}{x^2 + px + q}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two linear factors',
          problem: r`Evaluate $\int\frac{x + 5}{x^2 + x - 2}\,dx$.`,
          steps: [
            r`$x^2 + x - 2 = (x - 1)(x + 2)$. Cover-up: $A = \frac{6}{3} = 2$, $B = \frac{3}{-3} = -1$.`,
            r`$2\ln|x - 1| - \ln|x + 2| + C$.`,
          ],
          answer: r`$2\ln|x - 1| - \ln|x + 2| + C$.`,
        },
        {
          level: 'board',
          title: 'A repeated factor, limits, a division first',
          problem: r`Evaluate (a) $\int\frac{3x + 1}{(x - 1)^2(x + 2)}\,dx$, (b) $\int_0^1\frac{dx}{x^2 + 3x + 2}$, (c) $\int\frac{x^3}{x^2 - 1}\,dx$.`,
          steps: [
            r`(a) $\frac{A}{x - 1} + \frac{B}{(x - 1)^2} + \frac{C}{x + 2}$. Cover-up: $B = \frac{4}{3}$, $C = \frac{-5}{9}$; the $x^2$ terms give $A + C = 0$, so $A = \frac59$. Result: $\frac59\ln|x - 1| - \frac{4}{3(x - 1)} - \frac59\ln|x + 2| + C$.`,
            r`(b) $\frac{1}{x + 1} - \frac{1}{x + 2}$: $\left[\ln\frac{x + 1}{x + 2}\right]_0^1 = \ln\frac23 - \ln\frac12 = \ln\frac43 = 0.2877$.`,
            r`(c) Divide: $x + \frac{x}{x^2 - 1}$, so $\frac{x^2}{2} + \frac12\ln|x^2 - 1| + C$.`,
          ],
          answer: r`(a) as above; (b) about 0.2877; (c) $\frac{x^2}{2} + \frac12\ln|x^2 - 1| + C$.`,
        },
      ],
      traps: [
        r`A repeated factor needs every power up to its multiplicity, not just the highest.`,
        r`Cover-up finds only the top-power coefficient of a repeated factor; the others need another equation.`,
      ],
      check: [
        { q: r`Evaluate $\int\frac{dx}{x^2 - 4}$.`, a: r`$\frac14\ln\left|\frac{x - 2}{x + 2}\right| + C$.` },
        { q: r`Evaluate $\int\frac{e^x - 1}{e^x + 1}\,dx$.`, a: r`Write it as $\frac{2e^x}{e^x + 1} - 1$: $2\ln(e^x + 1) - x + C$.` },
      ],
    },
    {
      name: 'Improper Integrals',
      inShort: r`Integrals over an infinite range, or of an integrand that blows up, as limits.`,
      body: [
        r`An integral over an infinite range, or across a point where the integrand blows up, is defined as a **limit**: $\int_a^\infty f = \lim_{b \to \infty}\int_a^b f$. It **converges** if the limit is finite. Whether the tail's area is finite depends on how fast the curve falls:`,
        {
          type: 'plot',
          alt: 'The curves 1 over x and 1 over x squared from 1 to 10. Both fall towards zero, but 1 over x squared falls much faster; its shaded area out to infinity is exactly 1, while the area under 1 over x grows without limit.',
          caption: 'From 1 to infinity, the area under 1/x² is exactly 1, while under 1/x it grows without bound: 1/x falls too slowly.',
          x: [1, 10],
          y: [0, 1.1],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 1 / x, label: '1/x, diverges', dashed: true, colour: colourOf(1) },
            { f: (x) => 1 / (x * x), label: '1/x², converges', area: true, colour: colourOf(0) },
          ],
          legend: false,
        },
        r`| Integral | Converges when |
|---|---|
| $\int_1^\infty\frac{dx}{x^p}$ | $p > 1$, to $\frac{1}{p - 1}$ |
| $\int_0^1\frac{dx}{x^p}$ | $p < 1$, to $\frac{1}{1 - p}$ |
| $\int_0^\infty e^{-ax}\,dx$ | $a > 0$, to $\frac1a$ |

The **gamma function** $\Gamma(n) = \int_0^\infty x^{n-1}e^{-x}\,dx = (n - 1)!$ handles powers times $e^{-x}$; and $\int_{-\infty}^\infty e^{-x^2}dx = \sqrt\pi$.`,
      ],
      keyIdeas: [
        r`$\int_a^\infty f = \lim_{b \to \infty}\int_a^b f$; a blow-up inside the interval is split and taken as a limit too.`,
        r`$\int_1^\infty\frac{dx}{x^p}$ converges for $p > 1$; $\int_0^1\frac{dx}{x^p}$ for $p < 1$.`,
        r`$\Gamma(n) = \int_0^\infty x^{n-1}e^{-x}dx = (n - 1)!$; $\int_{-\infty}^\infty e^{-x^2}dx = \sqrt\pi$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Gamma, and a root at zero',
          problem: r`Evaluate $\int_0^\infty xe^{-x}\,dx$ and $\int_0^1\frac{dx}{\sqrt x}$.`,
          steps: [
            r`The first is $\Gamma(2) = 1! = 1$.`,
            r`The second: $\lim_{t \to 0^+}\left[2\sqrt x\right]_t^1 = 2$.`,
          ],
          answer: r`$1$; $2$.`,
        },
        {
          level: 'board',
          title: 'Four limits',
          problem: r`Evaluate (a) $\int_1^\infty\frac{dx}{x^3}$, (b) $\int_0^\infty x^3e^{-x}\,dx$, (c) $\int_0^\infty\frac{dx}{1 + x^2}$, (d) $\int_0^4\frac{dx}{\sqrt{4 - x}}$.`,
          steps: [
            r`(a) $p = 3$: $\frac{1}{3 - 1} = \frac12$.`,
            r`(b) $\Gamma(4) = 3! = 6$.`,
            r`(c) $\lim_{b \to \infty}\tan^{-1}b = \frac\pi2$.`,
            r`(d) The integrand blows up at 4: $\lim_{t \to 4^-}\left[-2\sqrt{4 - x}\right]_0^t = 0 + 4 = 4$.`,
          ],
          answer: r`(a) $\frac12$; (b) $6$; (c) $\frac\pi2$; (d) $4$.`,
        },
      ],
      traps: [
        r`$\int_{-1}^1\frac{dx}{x^2}$ is not $-2$: the integrand blows up at $0$ and the integral diverges.`,
        r`$\Gamma(n)$ is $(n - 1)!$, not $n!$: the power of $x$ is one less than $n$.`,
      ],
      check: [
        { q: r`Does $\int_1^\infty\frac{dx}{\sqrt x}$ converge?`, a: r`No: $p = \frac12 \le 1$.` },
        { q: r`Evaluate $\int_0^\infty e^{-2x}\,dx$.`, a: r`$\frac12$.` },
      ],
    },
    {
      name: 'Area Between Curves',
      inShort: r`The area of a region bounded by curves: top minus bottom, right minus left, or in polar form.`,
      body: [
        r`Slice the region into thin strips and add them. A **vertical strip** runs from the lower curve to the upper, $dA = (y_{top} - y_{bottom})\,dx$; a **horizontal strip** from the left curve to the right, $dA = (x_{right} - x_{left})\,dy$. Find the intersections first: they are the limits.`,
        {
          type: 'plot',
          equal: true,
          alt: 'The line y equals 2x and the parabola y equals x squared, crossing at the origin and at 2 comma 4. A thin dashed vertical strip at x equals 1 runs from the parabola up to the line.',
          caption: 'y = 2x over y = x² from 0 to 2: each vertical strip (dashed, at x = 1) is 2x − x² tall; together they make 4/3.',
          x: [-0.5, 3],
          y: [-0.5, 5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 2 * x, colour: colourOf(0) },
            { f: (x) => x * x, colour: colourOf(2) },
            { points: [[0.95, 0.9025], [0.95, 1.9], [1.05, 2.1], [1.05, 1.1025], [0.95, 0.9025]], dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`In **polar** form a thin wedge has area $\frac12r^2\,d\theta$, so $A = \frac12\int r^2\,d\theta$. Standard results:

| Curve | Area |
|---|---|
| circle $r = 2a\cos\theta$ | $\pi a^2$ |
| cardioid $r = a(1 \pm \cos\theta)$ | $\frac32\pi a^2$ |
| rose $r = a\cos n\theta$, $n$ odd ($n$ petals) | $\frac14\pi a^2$ |
| rose $r = a\cos n\theta$, $n$ even ($2n$ petals) | $\frac12\pi a^2$ |
| lemniscate $r^2 = a^2\cos2\theta$ | $a^2$ |
| one arch of the cycloid $x = a(\theta - \sin\theta)$ | $3\pi a^2$ |`,
        {
          type: 'plot',
          equal: true,
          alt: 'The four-petalled rose r equals 3 sine 2 theta, with petals reaching 3 from the origin in each quadrant.',
          caption: 'The rose r = 3 sin 2θ: n = 2 is even, so it has 4 petals, total area ½π(3)² = 4.5π.',
          x: [-3.5, 3.5],
          y: [-3.5, 3.5],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: polar((t) => 3 * Math.sin(2 * t)), colour: colourOf(0) }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$A = \int_a^b[f(x) - g(x)]dx$ with $f$ on top; or slice sideways, $\int_c^d[x_R - x_L]dy$.`,
        r`Find the intersections first; split where the curves swap.`,
        r`Polar: $A = \frac12\int r^2\,d\theta$; a parabolic segment is $\frac23$ of its enclosing rectangle.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A line over a parabola',
          problem: r`Find the area between $y = x^2$ and $y = 2x$.`,
          steps: [
            r`They meet at $x = 0$ and $x = 2$, with $2x$ on top.`,
            r`$\int_0^2(2x - x^2)dx = 4 - \frac83 = \frac43$.`,
          ],
          answer: r`$\frac43$.`,
        },
        {
          level: 'board',
          title: 'Two parabolas, sideways strips, a rose',
          problem: r`Find the area (a) between $y = 4x - x^2$ and $y = x^2 - 2x$; (b) between $x = y^2$ and $x = y + 2$; (c) inside the rose $r = 3\sin2\theta$.`,
          steps: [
            r`(a) $4x - x^2 = x^2 - 2x$ at $x = 0$ and $3$: $\int_0^3(6x - 2x^2)dx = 27 - 18 = 9$.`,
            r`(b) $y^2 = y + 2$ at $y = -1$ and $2$, with $x = y + 2$ on the right: $\int_{-1}^2(y + 2 - y^2)dy = \frac{10}{3} + \frac76 = 4.5$.`,
            r`(c) $n = 2$ is even, four petals: $\frac12\pi(9) = 4.5\pi = 14.137$.`,
          ],
          answer: r`(a) 9; (b) 4.5; (c) $4.5\pi \approx 14.137$.`,
        },
      ],
      traps: [
        r`$\int(f - g)$ with the curves the wrong way round gives a negative "area"; with a swap in the middle, parts cancel.`,
        r`For a rose, integrate over one petal and multiply, or over the full range once; running $\theta$ round twice counts every petal double.`,
      ],
      check: [
        { q: r`Find the area under one arch of $y = \sin x$.`, a: r`$\int_0^\pi\sin x\,dx = 2$.` },
        { q: r`Find the area inside the cardioid $r = 2(1 + \cos\theta)$.`, a: r`$\frac32\pi(4) = 6\pi$.` },
      ],
    },
    {
      name: 'Volumes of Revolution',
      inShort: r`Solids made by turning a region about an axis, by discs, washers or shells, or from known cross-sections.`,
      body: [
        r`Turning a region about an axis sweeps a solid. Slice it, find each slice's volume, and add:

| Method | Strip | Volume |
|---|---|---|
| disc | perpendicular to the axis, touching it | $\pi\int R^2\,dx$ |
| washer | perpendicular to the axis, with a gap | $\pi\int(R^2 - r^2)\,dx$ |
| shell | parallel to the axis | $2\pi\int(\text{radius})(\text{height})\,dx$ |
| known cross-section | perpendicular to a line | $\int A(x)\,dx$ |
| Pappus | the whole region at once | $V = 2\pi\bar r A$, $\bar r$ the centroid's distance from the axis |

Radii are measured from the axis of revolution, which need not be a coordinate axis.`,
        {
          type: 'plot',
          equal: true,
          alt: 'The region under y equals the square root of x from 0 to 4, shaded, and its mirror image below the x axis drawn dashed: turned about the x axis, the curve sweeps out a rounded solid between them.',
          caption: 'The region under y = √x from 0 to 4 (shaded); turned about the x axis it sweeps a solid whose outline is the curve and its mirror (dashed). Discs give 8π.',
          x: [0, 4.5],
          y: [-2.5, 2.5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: range(0, 4, 80).map((x) => [x, Math.sqrt(x)]), area: true, colour: colourOf(0) },
            { points: range(0, 4, 80).map((x) => [x, -Math.sqrt(x)]), dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Discs: $V = \pi\int R^2\,dx$; washers: $V = \pi\int(R^2 - r^2)\,dx$, radii from the axis.`,
        r`Shells: $V = 2\pi\int(\text{radius})(\text{height})\,dx$, for slices parallel to the axis.`,
        r`Known cross-sections: $V = \int A(x)\,dx$. Pappus: $V = 2\pi\bar rA$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Discs and shells',
          problem: r`The region under $y = \sqrt x$ from $0$ to $4$ turns about the $x$-axis, then about the $y$-axis. Find both volumes.`,
          steps: [
            r`About the $x$-axis (discs): $\pi\int_0^4x\,dx = 8\pi$.`,
            r`About the $y$-axis (shells): $2\pi\int_0^4x\sqrt x\,dx = 2\pi\cdot\frac25\cdot32 = \frac{128\pi}{5}$.`,
          ],
          answer: r`$8\pi$ and $\frac{128\pi}{5}$.`,
        },
        {
          level: 'board',
          title: 'Washers, shells, square sections',
          problem: r`(a) The region between $y = x$ and $y = x^2$ turns about the $x$-axis. (b) The region under $y = 2x - x^2$ turns about the $y$-axis. (c) A solid has the circle $x^2 + y^2 = 9$ as its base, and every section perpendicular to the $x$-axis is a square. Find each volume.`,
          steps: [
            r`(a) Washers, $R = x$, $r = x^2$: $\pi\int_0^1(x^2 - x^4)dx = \pi\left(\frac13 - \frac15\right) = \frac{2\pi}{15} = 0.4189$.`,
            r`(b) Shells: $2\pi\int_0^2x(2x - x^2)dx = 2\pi\left(\frac{16}{3} - 4\right) = \frac{8\pi}{3} = 8.378$.`,
            r`(c) The square's side is the chord $2y = 2\sqrt{9 - x^2}$: $\int_{-3}^3 4(9 - x^2)\,dx = 4(54 - 18) = 144$.`,
          ],
          answer: r`(a) $\frac{2\pi}{15}$; (b) $\frac{8\pi}{3}$; (c) 144.`,
        },
      ],
      traps: [
        r`Washers: $R^2 - r^2$, never $(R - r)^2$.`,
        r`About a line such as $x = 2$, the shell radius is $2 - x$, not $x$.`,
      ],
      check: [
        { q: r`A circle of radius 2 turns about a line 5 from its centre. What volume does it sweep (Pappus)?`, a: r`$2\pi(5)(4\pi) = 40\pi^2 \approx 394.78$.` },
        { q: r`Find the volume when the region under $y = x^2$ from 0 to 2 turns about the $x$-axis.`, a: r`$\pi\int_0^2x^4dx = \frac{32\pi}{5}$.` },
      ],
    },
    {
      name: 'Arc Length and Surface Area',
      inShort: r`The length of a curve, and the area of the surface it sweeps when it turns.`,
      body: [
        r`A short piece of curve is the hypotenuse of $dx$ and $dy$: $ds = \sqrt{dx^2 + dy^2}$. Written in whichever variable the curve uses:

| Curve | Arc length |
|---|---|
| $y = f(x)$ | $\int\sqrt{1 + y'^2}\,dx$ |
| $x = g(y)$ | $\int\sqrt{1 + x'^2}\,dy$ |
| parametric | $\int\sqrt{\dot x^2 + \dot y^2}\,dt$ |
| polar | $\int\sqrt{r^2 + r'^2}\,d\theta$ |

Turning the arc about an axis sweeps a **surface**: each piece $ds$ traces a band $2\pi\rho\,ds$, with $\rho$ its distance from the axis, so $S = 2\pi\int\rho\,ds$. Pappus again: $S = 2\pi\bar\rho L$, the arc's centroid travelling round.`,
        {
          type: 'plot',
          equal: true,
          alt: 'The cardioid r equals 3 times 1 plus cos theta: a heart-shaped curve with its cusp at the origin, reaching 6 along the positive x axis.',
          caption: 'The cardioid r = 3(1 + cos θ): its whole length is 8a = 24.',
          x: [-1.5, 6.5],
          y: [-4, 4],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: polar((t) => 3 * (1 + Math.cos(t))), colour: colourOf(0) }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$L = \int\sqrt{1 + y'^2}\,dx$; parametric $\int\sqrt{\dot x^2 + \dot y^2}\,dt$; polar $\int\sqrt{r^2 + r'^2}\,d\theta$.`,
        r`Surface about the $x$-axis: $S = 2\pi\int y\,ds$.`,
        r`The cardioid $r = a(1 + \cos\theta)$ has length $8a$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A semicubical arc',
          problem: r`Find the length of $y = \frac23x^{3/2}$ from $x = 0$ to $x = 3$.`,
          steps: [
            r`$y' = \sqrt x$, so $L = \int_0^3\sqrt{1 + x}\,dx$.`,
            r`$\frac23\left[(1 + x)^{3/2}\right]_0^3 = \frac23(8 - 1) = \frac{14}{3}$.`,
          ],
          answer: r`$\frac{14}{3}$.`,
        },
        {
          level: 'board',
          title: 'A cardioid, a log curve, a surface',
          problem: r`(a) Find the length of $r = 3(1 + \cos\theta)$. (b) Find the length of $y = \ln\cos x$ from $0$ to $\frac\pi4$. (c) Find the area of the surface made by turning $y = x^3$, $0 \le x \le 1$, about the $x$-axis.`,
          steps: [
            r`(a) $r^2 + r'^2 = 18(1 + \cos\theta) = 36\cos^2\frac\theta2$, so $L = 2\int_0^\pi6\cos\frac\theta2\,d\theta = 24$.`,
            r`(b) $y' = -\tan x$, so $\sqrt{1 + \tan^2x} = \sec x$: $\ln(\sec x + \tan x)$ at $\frac\pi4$ is $\ln(\sqrt2 + 1) = 0.8814$.`,
            r`(c) $S = 2\pi\int_0^1x^3\sqrt{1 + 9x^4}\,dx = \frac{\pi}{27}\left(10\sqrt{10} - 1\right) = 3.5631$.`,
          ],
          answer: r`(a) 24; (b) about 0.8814; (c) about 3.5631.`,
        },
      ],
      traps: [
        r`It is $\sqrt{1 + y'^2}$, not $\sqrt{1 + y'}$ or $1 + y'$.`,
        r`For the cardioid, $\sqrt{2 + 2\cos\theta} = 2\left|\cos\frac\theta2\right|$: integrate half the curve and double, or the sign cancels the length.`,
      ],
      check: [
        { q: r`Find the length of $x = t^3 - 3t$, $y = 3t^2$ from $t = 0$ to $1$.`, a: r`$\sqrt{\dot x^2 + \dot y^2} = 3(t^2 + 1)$: $\int_0^13(t^2 + 1)\,dt = 4$.` },
        { q: r`How long is the circle $r = 2\cos\theta$?`, a: r`A circle of diameter 2: $2\pi$.` },
      ],
    },
    {
      name: 'Centroids and Moments of Inertia',
      inShort: r`Where a region balances, and how its area is spread about an axis.`,
      body: [
        r`The **centroid** is the balance point: the first moment of the region about an axis, divided by its area. For point masses it is the weighted average, $\bar x = \frac{\sum m_ix_i}{\sum m_i}$. For a region, add vertical strips: each has area $(y_{top} - y_{bottom})\,dx$ and its centroid at the strip's middle,
$$\bar x = \frac1A\int x\,dA, \qquad \bar y = \frac1A\int\frac{y_{top} + y_{bottom}}{2}\,dA.$$
The same moments locate the centroid of a solid of revolution, with $dV$ in place of $dA$.`,
        {
          type: 'plot',
          equal: true,
          alt: 'The region under y equals x squared from 0 to 1, shaded, with its centroid marked at three quarters comma three tenths by dashed guides to the axes.',
          caption: 'Under y = x² from 0 to 1 (area 1/3), the centroid sits at (3/4, 3/10): towards the tall side.',
          x: [0, 1.1],
          y: [0, 1.1],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: range(0, 1, 60).map((x) => [x, x * x]), area: true, colour: colourOf(0) }],
          marks: [{ at: [0.75, 0.3] }],
          legend: false,
        },
        r`The **moment of inertia** is the second moment, $I_x = \int y^2\,dA$ and $I_y = \int x^2\,dA$; their sum is the **polar moment** $J = I_x + I_y$. About its centroid:

| Shape | $\bar I$ (centroidal axis parallel to the base) | Centroid from the base |
|---|---|---|
| rectangle $b \times h$ | $\frac{bh^3}{12}$ | $\frac h2$ |
| triangle | $\frac{bh^3}{36}$ | $\frac h3$ |
| circle | $\frac{\pi r^4}{4}$ | centre |
| semicircle | $0.1098r^4$ | $\frac{4r}{3\pi}$ |
| quarter circle | $0.0549r^4$ | $\frac{4r}{3\pi}$ |
| ellipse | $\frac{\pi ab^3}{4}$ | centre |
| parabolic segment | | $\frac{2h}{5}$ |

The **parallel-axis theorem** moves an axis: $I = \bar I + Ad^2$, with $d$ the distance from the centroidal axis. The **radius of gyration** is $k = \sqrt{I/A}$.`,
      ],
      keyIdeas: [
        r`Under $y = f(x)$: $\bar x = \frac1A\int xf\,dx$, $\bar y = \frac{1}{2A}\int f^2\,dx$.`,
        r`From the base: triangle $\frac{h}{3}$, semicircle $\frac{4r}{3\pi}$, semicircular arc $\frac{2r}{\pi}$, hemisphere $\frac{3r}{8}$, cone $\frac{h}{4}$.`,
        r`Rectangle $\bar I = \frac{bh^3}{12}$; triangle $\frac{bh^3}{36}$; circle $\frac{\pi r^4}{4}$.`,
        r`Parallel axes: $I = \bar I + Ad^2$; radius of gyration $k = \sqrt{I/A}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Under a parabola',
          problem: r`Find the centroid of the region under $y = x^2$ from $0$ to $1$.`,
          steps: [
            r`$A = \frac13$. $\bar x = 3\int_0^1x^3dx = \frac34$.`,
            r`$\bar y = \frac{3}{2}\int_0^1x^4dx = \frac{3}{10}$.`,
          ],
          answer: r`$\left(\frac34, \frac{3}{10}\right)$.`,
        },
        {
          level: 'board',
          title: 'Point masses, a region between curves, a shifted axis',
          problem: r`(a) Masses 2, 3 and 5 sit at $(1, 4)$, $(-2, 1)$ and $(3, -2)$. Find their centre. (b) Find the centroid of the region between $y = x$ and $y = x^2$. (c) Find the moment of inertia of an 8 cm by 3 cm rectangle about an axis parallel to its 8 cm base and 1 cm below it, and the radius of gyration.`,
          steps: [
            r`(a) $\bar x = \frac{2 - 6 + 15}{10} = 1.1$, $\bar y = \frac{8 + 3 - 10}{10} = 0.1$.`,
            r`(b) $A = \frac16$. $\bar x = 6\int_0^1x(x - x^2)dx = \frac12$; $\bar y = 6\int_0^1\frac{x^2 - x^4}{2}dx = \frac25$.`,
            r`(c) $\bar I = \frac{8(27)}{12} = 18$ cm⁴; $d = 1 + 1.5 = 2.5$ cm, $A = 24$ cm²: $I = 18 + 24(6.25) = 168$ cm⁴, and $k = \sqrt{7} = 2.646$ cm.`,
          ],
          answer: r`(a) $(1.1, 0.1)$; (b) $\left(\frac12, \frac25\right)$; (c) 168 cm⁴ and about 2.646 cm.`,
        },
      ],
      traps: [
        r`The parallel-axis theorem starts from the centroidal axis: add $Ad^2$, never subtract it from another axis.`,
        r`For $\bar y$ of a region, the moment arm is the strip's middle height, $\frac{y}{2}$ for a strip from the axis, not $y$.`,
      ],
      check: [
        { q: r`What is the moment of inertia of a circle of radius 5 about a tangent?`, a: r`$\frac{\pi(625)}{4} + 25\pi(25) = \frac{5\pi(625)}{4} \approx 2454$.` },
        { q: r`Where is the centroid of the region under one arch of $\sin x$?`, a: r`$\bar x = \frac\pi2$; $\bar y = \frac{1}{2(2)}\int_0^\pi\sin^2x\,dx = \frac\pi8$.` },
      ],
    },
    {
      name: 'Work and Fluid Pressure',
      inShort: r`Work done by a changing force, and the force of a liquid on a submerged surface.`,
      body: [
        r`When a force changes as it acts, the **work** is the area under the force-distance graph, $W = \int F\,dx$. A spring obeys Hooke's law, $F = kx$, with $x$ the stretch from its natural length, so the area is a trapezoid:`,
        {
          type: 'plot',
          alt: 'The straight line F equals 600 x for a spring, from 0 to 0.12 metres of stretch. The area under the line between stretches of 0.05 and 0.10 metres is shaded: the work done in that stretch.',
          caption: 'Spring force F = kx with k = 600 N/m: stretching it from 0.05 m to 0.10 m takes the shaded area, 2.25 J.',
          x: [0, 0.12],
          y: [0, 80],
          xLabel: 'stretch x (m)',
          yLabel: 'F (N)',
          series: [
            { f: (x) => SPRING.k * x, colour: colourOf(0) },
            { points: [[SPRING.from, SPRING.k * SPRING.from], [SPRING.to, SPRING.k * SPRING.to]], area: true, colour: colourOf(0) },
          ],
          legend: false,
        },
        r`| Situation | Work |
|---|---|
| spring | $\frac12k(x_2^2 - x_1^2)$, stretches from the natural length |
| pumping a liquid out over the top | $\rho g\int A(y)\,D(y)\,dy$: each slice lifted its own distance; or $\rho gV\bar d$, the centroid lifted |
| winding up a cable of $w$ per metre and length $L$, with a load $W$ | $WL + \frac12wL^2$ |

Tank centroids for $\bar d$: a cylinder at $\frac h2$, a cone (vertex down) $\frac h4$ below its top, a hemisphere $\frac{3r}{8}$ below its rim, a paraboloid $\frac h3$ below its top.

A liquid pushes on a submerged plate with a pressure that grows with depth, $p = \rho gh$. The **force** on a vertical plate is $F = \rho g\int h\,w\,dh = \rho g\bar hA$, with $\bar h$ the centroid's depth; it acts lower, at the **centre of pressure** $h_p = \bar h + \frac{\bar I}{\bar hA}$.`,
      ],
      keyIdeas: [
        r`$W = \int F\,dx$; a spring ($F = kx$): $W = \frac12k(x_2^2 - x_1^2)$ from its natural length.`,
        r`Pumping: $W = \rho g\int A(y)D(y)\,dy$, each slice lifted its own distance.`,
        r`Fluid force on a vertical plate: $F = \rho g\int h\,w\,dy = \rho g\bar hA$; it acts at $h_p = \bar h + \frac{\bar I}{\bar hA}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A gate',
          problem: r`A vertical rectangular gate $2$ m wide and $3$ m deep has its top at the water surface. Find the force on it and where it acts.`,
          steps: [
            r`$F = 9.81(1.5)(6) \approx 88.3$ kN.`,
            r`$h_p = 1.5 + \frac{2(3)^3/12}{1.5(6)} = 1.5 + 0.5 = 2$ m, two-thirds of the depth.`,
          ],
          answer: r`About 88.3 kN, 2 m down.`,
        },
        {
          level: 'board',
          title: 'A spring, a tank, a cable',
          problem: r`(a) A force of 30 N stretches a spring of natural length 20 cm by 5 cm. How much work stretches it from 25 cm to 30 cm long? (b) A cylindrical tank of radius 1.5 m and height 4 m is full of water. How much work pumps it all out over the top? (c) A 30 m cable weighing 20 N/m hangs from a winch with a 500 N load at its end. How much work winds it all up?`,
          steps: [
            r`(a) $k = \frac{30}{0.05} = 600$ N/m; stretches 0.05 m to 0.10 m: $\frac12(600)(0.01 - 0.0025) = 2.25$ J.`,
            r`(b) $V = \pi(2.25)(4) = 28.27$ m³, its centroid 2 m below the top: $W = 9.81(28.27)(2) = 554.7$ kJ.`,
            r`(c) $500(30) + \frac12(20)(30)^2 = 15\,000 + 9000 = 24\,000$ J.`,
          ],
          answer: r`(a) 2.25 J; (b) about 554.7 kJ; (c) 24 kJ.`,
        },
      ],
      traps: [
        r`Spring stretches are measured from the natural length; depths from the free surface.`,
        r`Pumping lifts each slice to the outlet, not to the top of the liquid: add any extra height to every slice's distance.`,
      ],
      check: [
        { q: r`A triangular plate, base 4 m at the surface and vertex 3 m down, stands in water. What force acts on it?`, a: r`$\bar h = 1$ m, $A = 6$ m²: $9.81(1)(6) = 58.86$ kN.` },
        { q: r`How much work winds up a 20 m chain weighing 3 N/m?`, a: r`$\frac12(3)(20)^2 = 600$ J.` },
      ],
    },
    {
      name: 'Multiple Integrals',
      inShort: r`Integrating over regions and solids, one variable at a time, in the coordinates that fit.`,
      body: [
        r`A **double integral** adds $f\,dA$ over a region; work it as two single integrals, the inner one first, whose limits may depend on the outer variable:
$$\iint_R f\,dA = \int_a^b\int_{g_1(x)}^{g_2(x)}f(x, y)\,dy\,dx.$$
With $f = 1$ it gives the region's area; over a solid, a **triple integral** with $f = 1$ gives its volume. Sketch the region to set the limits:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The triangle with corners at the origin, 1 comma 0 and 1 comma 1, shaded: the region where y runs from 0 up to x, for x from 0 to 1.',
          caption: 'The region 0 ≤ y ≤ x, 0 ≤ x ≤ 1: for each x, y runs from 0 up to the line y = x.',
          x: [0, 1.2],
          y: [0, 1.2],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: [[0, 0], [1, 1], [1, 0]], area: true, colour: colourOf(0) }],
          legend: false,
        },
        r`Round regions are easier in round coordinates; never drop the scale factor:

| Coordinates | Element |
|---|---|
| polar | $dA = r\,dr\,d\theta$ |
| cylindrical | $dV = r\,dr\,d\theta\,dz$ |
| spherical | $dV = \rho^2\sin\varphi\,d\rho\,d\varphi\,d\theta$ |
| any change $(u, v)$ | multiply by the Jacobian $\left|\frac{\partial(x, y)}{\partial(u, v)}\right|$ |`,
      ],
      keyIdeas: [
        r`$\iint_R f\,dA = \int_a^b\int_{g_1(x)}^{g_2(x)}f\,dy\,dx$: inner limits may depend on the outer variable.`,
        r`Polar: $dA = r\,dr\,d\theta$. Cylindrical: $dV = r\,dr\,d\theta\,dz$. Spherical: $dV = \rho^2\sin\varphi\,d\rho\,d\varphi\,d\theta$.`,
        r`Change of variables: multiply by the Jacobian $\left|\frac{\partial(x, y)}{\partial(u, v)}\right|$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A triangle, and a circle',
          problem: r`Evaluate $\int_0^1\int_0^x xy\,dy\,dx$, and the area of a circle of radius $a$ by a polar double integral.`,
          steps: [
            r`Inner: $\frac{x\cdot x^2}{2}$; outer: $\int_0^1\frac{x^3}{2}dx = \frac18$.`,
            r`Circle: $\int_0^{2\pi}\int_0^ar\,dr\,d\theta = 2\pi\cdot\frac{a^2}{2} = \pi a^2$.`,
          ],
          answer: r`$\frac18$; $\pi a^2$.`,
        },
        {
          level: 'board',
          title: 'A rectangle, a box, a quarter disc',
          problem: r`Evaluate (a) $\int_0^2\int_0^1(6x + 4y)\,dx\,dy$, (b) $\int_0^1\int_0^2\int_0^3xyz\,dz\,dy\,dx$, (c) $\iint(x^2 + y^2)\,dA$ over the quarter disc of radius 2 in the first quadrant.`,
          steps: [
            r`(a) Inner in $x$: $3 + 4y$; outer: $\int_0^2(3 + 4y)\,dy = 6 + 8 = 14$.`,
            r`(b) The variables separate: $\frac12 \times 2 \times \frac92 = 4.5$.`,
            r`(c) Polar: $\int_0^{\pi/2}\int_0^2r^2\cdot r\,dr\,d\theta = \frac\pi2(4) = 2\pi = 6.283$.`,
          ],
          answer: r`(a) 14; (b) 4.5; (c) $2\pi$.`,
        },
      ],
      traps: [
        r`Forgetting the $r$ in $r\,dr\,d\theta$ is the classic slip.`,
        r`The inner limits may hold the outer variable; the outer limits must be numbers.`,
      ],
      check: [
        { q: r`Evaluate $\int_0^2\int_0^{2y}x^2\,dx\,dy$.`, a: r`Inner: $\frac{8y^3}{3}$; outer: $\frac{8}{3}\cdot4 = \frac{32}{3} \approx 10.67$.` },
        { q: r`Evaluate $\int_1^2\int_0^3(x + y)\,dx\,dy$.`, a: r`Inner: $4.5 + 3y$; outer: $4.5 + 4.5 = 9$.` },
      ],
    },
  ],
};
