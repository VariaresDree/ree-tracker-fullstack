// Library › Lessons › Mathematics › Calculus 2 (2026-11-17): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand. `figures` are drawings from Units and tools ›
// Shapes.
const r = String.raw;

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
      keyIdeas: [
        r`$\int u^n du = \frac{u^{n+1}}{n+1}$ ($n \ne -1$); $\int\frac{du}{u} = \ln|u|$; $\int e^u du = e^u$.`,
        r`$\int\sin u = -\cos u$, $\int\cos u = \sin u$, $\int\tan u = \ln|\sec u|$, $\int\sec u = \ln|\sec u + \tan u|$.`,
        r`$\int\frac{du}{a^2 + u^2} = \frac1a\tan^{-1}\frac{u}{a}$; $\int\frac{du}{\sqrt{a^2 - u^2}} = \sin^{-1}\frac{u}{a}$.`,
        r`Substitution: find an inside function whose derivative is also present.`,
      ],
      example: {
        problem: r`Evaluate $\int x\sqrt{x^2 + 9}\,dx$ and $\int\frac{dx}{x^2 + 4x + 13}$.`,
        solution: r`With $u = x^2 + 9$: $\frac12\int\sqrt u\,du = \frac13(x^2 + 9)^{3/2} + C$. Complete the square, $(x + 2)^2 + 9$: $\frac13\tan^{-1}\frac{x + 2}{3} + C$.`,
      },
      traps: [r`$\int\frac{dx}{x^2 + 9}$ gives an inverse tangent, but $\int\frac{dx}{x^2 - 9}$ a logarithm: one sign apart.`],
    },
    {
      name: 'Definite Integrals',
      inShort: r`Integrals between limits: evaluating them, their properties, and shortcuts from symmetry and Wallis.`,
      keyIdeas: [
        r`$\int_a^b f = F(b) - F(a)$; swapping limits flips the sign; adjacent intervals add.`,
        r`Symmetric limits: an even function doubles half the integral, an odd one gives $0$.`,
        r`Average value $\frac{1}{b - a}\int_a^b f$; $\frac{d}{dx}\int_a^{g(x)}f(t)dt = f(g(x))g'(x)$.`,
        r`Wallis: $\int_0^{\pi/2}\sin^n x\,dx = \frac{(n-1)!!}{n!!}$, times $\frac{\pi}{2}$ when $n$ is even.`,
      ],
      example: {
        problem: r`Evaluate $\int_0^{\pi/2}\sin^5x\,dx$, and find the average of $x^2$ on $[0, 3]$.`,
        solution: r`Wallis, $n = 5$ odd: $\frac{4\cdot2}{5\cdot3\cdot1} = \frac{8}{15}$. Average: $\frac13\int_0^3x^2dx = \frac13\cdot9 = 3$.`,
      },
      traps: [r`With a substitution, change the limits to the new variable, or go back to $x$ before evaluating.`],
    },
    {
      name: 'Integration by Parts',
      inShort: r`Undoing the product rule: $\int u\,dv = uv - \int v\,du$.`,
      keyIdeas: [
        r`Choose $u$ by LIATE: logarithmic, inverse trigonometric, algebraic, trigonometric, exponential.`,
        r`Tabular: differentiate a polynomial down to $0$ while integrating the other factor, alternating signs.`,
        r`$\int e^{ax}\sin bx\,dx$: parts twice brings the integral back; solve for it.`,
        r`$\int\ln x\,dx = x\ln x - x + C$.`,
      ],
      example: {
        problem: r`Evaluate $\int_0^1 xe^{2x}\,dx$.`,
        solution: r`$u = x$, $dv = e^{2x}dx$: $\frac{x}{2}e^{2x} - \frac14e^{2x}$. From $0$ to $1$: $\frac{e^2}{4} + \frac14 \approx 2.097$.`,
      },
      traps: [r`Choosing $u = e^{2x}$ makes the new integral harder, not easier.`],
    },
    {
      name: 'Trigonometric Integrals',
      inShort: r`Powers and products of sines, cosines, tangents and secants.`,
      keyIdeas: [
        r`An odd power: save one factor, convert the rest with $\sin^2 + \cos^2 = 1$, substitute.`,
        r`Even powers: $\sin^2x = \frac{1 - \cos 2x}{2}$, $\cos^2x = \frac{1 + \cos 2x}{2}$.`,
        r`Products of different frequencies: product-to-sum. $\int\sec^3x\,dx = \frac12(\sec x\tan x + \ln|\sec x + \tan x|)$.`,
      ],
      example: {
        problem: r`Evaluate $\int\sin^3x\cos^2x\,dx$.`,
        solution: r`Save one $\sin x$: $\int(1 - \cos^2x)\cos^2x\sin x\,dx$. With $u = \cos x$: $-\frac{\cos^3x}{3} + \frac{\cos^5x}{5} + C$.`,
      },
      traps: [r`With $u = \cos x$, $du = -\sin x\,dx$: the minus sign is easy to lose.`],
    },
    {
      name: 'Trigonometric Substitution',
      inShort: r`Clearing square roots of quadratics with a trigonometric substitution.`,
      keyIdeas: [
        r`$\sqrt{a^2 - u^2}$: $u = a\sin\theta$. $\sqrt{a^2 + u^2}$: $u = a\tan\theta$. $\sqrt{u^2 - a^2}$: $u = a\sec\theta$.`,
        r`Draw the right triangle to change the answer back to $u$.`,
        r`For rational functions of $\sin x$ and $\cos x$: $t = \tan\frac{x}{2}$.`,
      ],
      example: {
        problem: r`Evaluate $\int_0^3\frac{dx}{(9 + x^2)^{3/2}}$.`,
        solution: r`$x = 3\tan\theta$, $dx = 3\sec^2\theta\,d\theta$, and $(9 + x^2)^{3/2} = 27\sec^3\theta$: $\frac19\int_0^{\pi/4}\cos\theta\,d\theta = \frac19\cdot\frac{\sqrt2}{2} = \frac{\sqrt2}{18} \approx 0.0786$.`,
      },
      traps: [r`Change the limits too: $x = 3$ is $\theta = \frac{\pi}{4}$, not $3$.`],
    },
    {
      name: 'Partial Fractions',
      inShort: r`Splitting a rational function into simple fractions that integrate to logarithms and inverse tangents.`,
      keyIdeas: [
        r`Divide first if the top's degree is not less than the bottom's.`,
        r`Distinct linear factors: $\frac{A}{x - a} + \frac{B}{x - b}$; cover-up gives $A = \frac{P(a)}{Q'(a)}$.`,
        r`Repeated: $\frac{A_1}{x - a} + \frac{A_2}{(x - a)^2}$; irreducible quadratic: $\frac{Ax + B}{x^2 + px + q}$.`,
      ],
      example: {
        problem: r`Evaluate $\int\frac{x + 5}{x^2 + x - 2}\,dx$.`,
        solution: r`$x^2 + x - 2 = (x - 1)(x + 2)$. Cover-up: $A = \frac{6}{3} = 2$, $B = \frac{3}{-3} = -1$. So $2\ln|x - 1| - \ln|x + 2| + C$.`,
      },
      traps: [r`A repeated factor needs every power up to its multiplicity, not just the highest.`],
    },
    {
      name: 'Improper Integrals',
      inShort: r`Integrals over an infinite range, or of an integrand that blows up, as limits.`,
      keyIdeas: [
        r`$\int_a^\infty f = \lim_{b \to \infty}\int_a^b f$; a blow-up inside the interval is split and taken as a limit too.`,
        r`$\int_1^\infty\frac{dx}{x^p}$ converges for $p > 1$; $\int_0^1\frac{dx}{x^p}$ for $p < 1$.`,
        r`$\Gamma(n) = \int_0^\infty x^{n-1}e^{-x}dx = (n - 1)!$; $\int_{-\infty}^\infty e^{-x^2}dx = \sqrt\pi$.`,
      ],
      example: {
        problem: r`Evaluate $\int_0^\infty xe^{-x}\,dx$ and $\int_0^1\frac{dx}{\sqrt x}$.`,
        solution: r`The first is $\Gamma(2) = 1! = 1$. The second: $\lim_{t \to 0^+}\left[2\sqrt x\right]_t^1 = 2$.`,
      },
      traps: [r`$\int_{-1}^1\frac{dx}{x^2}$ is not $-2$: the integrand blows up at $0$ and the integral diverges.`],
    },
    {
      name: 'Area Between Curves',
      inShort: r`The area of a region bounded by curves: top minus bottom, or right minus left.`,
      keyIdeas: [
        r`$A = \int_a^b[f(x) - g(x)]dx$ with $f$ on top; or slice sideways, $\int_c^d[x_R - x_L]dy$.`,
        r`Find the intersections first; split where the curves swap.`,
        r`A parabolic segment is $\frac23$ of its enclosing rectangle.`,
      ],
      example: {
        problem: r`Find the area between $y = x^2$ and $y = 2x$.`,
        solution: r`They meet at $x = 0$ and $x = 2$, with $2x$ on top: $\int_0^2(2x - x^2)dx = 4 - \frac83 = \frac43$.`,
      },
      traps: [r`$\int(f - g)$ with the curves the wrong way round gives a negative "area"; with a swap in the middle, parts cancel.`],
    },
    {
      name: 'Volumes of Revolution',
      inShort: r`Solids made by turning a region about an axis, by discs, washers or shells.`,
      figures: [{ figure: 'cone' }, { figure: 'torus' }],
      keyIdeas: [
        r`Discs: $V = \pi\int R^2\,dx$; washers: $V = \pi\int(R^2 - r^2)\,dx$, radii from the axis.`,
        r`Shells: $V = 2\pi\int(\text{radius})(\text{height})\,dx$, for slices parallel to the axis.`,
        r`Known cross-sections: $V = \int A(x)\,dx$. Pappus: $V = 2\pi\bar rA$.`,
      ],
      example: {
        problem: r`The region under $y = \sqrt x$ from $0$ to $4$ turns about the $x$-axis, then about the $y$-axis. Find both volumes.`,
        solution: r`About the $x$-axis (discs): $\pi\int_0^4x\,dx = 8\pi$. About the $y$-axis (shells): $2\pi\int_0^4x\sqrt x\,dx = 2\pi\cdot\frac25\cdot32 = \frac{128\pi}{5}$.`,
      },
      traps: [r`Washers: $R^2 - r^2$, never $(R - r)^2$.`],
    },
    {
      name: 'Arc Length and Surface Area',
      inShort: r`The length of a curve, and the area of the surface it sweeps when it turns.`,
      keyIdeas: [
        r`$L = \int\sqrt{1 + y'^2}\,dx$; parametric $\int\sqrt{\dot x^2 + \dot y^2}\,dt$; polar $\int\sqrt{r^2 + r'^2}\,d\theta$.`,
        r`Surface about the $x$-axis: $S = 2\pi\int y\,ds$.`,
        r`The cardioid $r = a(1 + \cos\theta)$ has length $8a$.`,
      ],
      example: {
        problem: r`Find the length of $y = \frac23x^{3/2}$ from $x = 0$ to $x = 3$.`,
        solution: r`$y' = \sqrt x$, so $L = \int_0^3\sqrt{1 + x}\,dx = \frac23\left[(1 + x)^{3/2}\right]_0^3 = \frac23(8 - 1) = \frac{14}{3}$.`,
      },
      traps: [r`It is $\sqrt{1 + y'^2}$, not $\sqrt{1 + y'}$ or $1 + y'$.`],
    },
    {
      name: 'Centroids and Moments of Inertia',
      inShort: r`Where a region balances, and how its area is spread about an axis.`,
      figures: [{ figure: 'triangle-centres' }],
      keyIdeas: [
        r`Under $y = f(x)$: $\bar x = \frac1A\int xf\,dx$, $\bar y = \frac{1}{2A}\int f^2\,dx$.`,
        r`From the base: triangle $\frac{h}{3}$, semicircle $\frac{4r}{3\pi}$, semicircular arc $\frac{2r}{\pi}$, hemisphere $\frac{3r}{8}$, cone $\frac{h}{4}$.`,
        r`Rectangle $\bar I = \frac{bh^3}{12}$; triangle $\frac{bh^3}{36}$; circle $\frac{\pi r^4}{4}$.`,
        r`Parallel axes: $I = \bar I + Ad^2$; radius of gyration $k = \sqrt{I/A}$.`,
      ],
      example: {
        problem: r`Find the centroid of the region under $y = x^2$ from $0$ to $1$.`,
        solution: r`$A = \frac13$. $\bar x = 3\int_0^1x^3dx = \frac34$; $\bar y = \frac{3}{2}\int_0^1x^4dx = \frac{3}{10}$.`,
      },
      traps: [r`The parallel-axis theorem starts from the centroidal axis: add $Ad^2$, never subtract it from another axis.`],
    },
    {
      name: 'Work and Fluid Pressure',
      inShort: r`Work done by a changing force, and the force of a liquid on a submerged surface.`,
      keyIdeas: [
        r`$W = \int F\,dx$; a spring ($F = kx$): $W = \frac12k(x_2^2 - x_1^2)$ from its natural length.`,
        r`Pumping: $W = \rho g\int A(y)D(y)\,dy$, each slice lifted its own distance.`,
        r`Fluid force on a vertical plate: $F = \rho g\int h\,w\,dy = \rho g\bar hA$; it acts at $h_p = \bar h + \frac{\bar I}{\bar hA}$.`,
      ],
      example: {
        problem: r`A vertical rectangular gate $2$ m wide and $3$ m deep has its top at the water surface. Find the force on it and where it acts.`,
        solution: r`$F = 9.81(1.5)(6) \approx 88.3$ kN. $h_p = 1.5 + \frac{2(3)^3/12}{1.5(6)} = 1.5 + 0.5 = 2$ m, two-thirds of the depth.`,
      },
      traps: [r`Spring stretches are measured from the natural length; depths from the free surface.`],
    },
    {
      name: 'Multiple Integrals',
      inShort: r`Integrating over regions and solids, one variable at a time, in the coordinates that fit.`,
      keyIdeas: [
        r`$\iint_R f\,dA = \int_a^b\int_{g_1(x)}^{g_2(x)}f\,dy\,dx$: inner limits may depend on the outer variable.`,
        r`Polar: $dA = r\,dr\,d\theta$. Cylindrical: $dV = r\,dr\,d\theta\,dz$. Spherical: $dV = \rho^2\sin\phi\,d\rho\,d\phi\,d\theta$.`,
        r`Change of variables: multiply by the Jacobian $\left|\frac{\partial(x, y)}{\partial(u, v)}\right|$.`,
      ],
      example: {
        problem: r`Evaluate $\int_0^1\int_0^x xy\,dy\,dx$, and the area of a circle of radius $a$ by a polar double integral.`,
        solution: r`Inner: $\frac{x\cdot x^2}{2}$; outer: $\int_0^1\frac{x^3}{2}dx = \frac18$. Circle: $\int_0^{2\pi}\int_0^ar\,dr\,d\theta = 2\pi\cdot\frac{a^2}{2} = \pi a^2$.`,
      },
      traps: [r`Forgetting the $r$ in $r\,dr\,d\theta$ is the classic slip.`],
    },
  ],
};
