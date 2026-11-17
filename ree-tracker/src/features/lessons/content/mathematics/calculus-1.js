// Library › Lessons › Mathematics › Calculus 1 (2026-11-17): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand.
const r = String.raw;

export default {
  topic: 'Calculus 1',
  subject: 'Mathematics',
  overview: r`Differential calculus measures how fast things change. On the board it is limits to evaluate, derivatives to take quickly and correctly, and the applications that make the marks: maxima and minima, time rates, differentials and curve sketching. Know the rules cold (product, quotient, chain, and the transcendental derivatives), work in radians, and for word problems write one equation linking the quantities before you differentiate.`,
  sources: [
    'Schaum’s Outline of Calculus (Ayres and Mendelson)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Limits and Continuity',
      inShort: r`What a function approaches, how to evaluate it when substituting fails, and when a function has no break.`,
      keyIdeas: [
        r`Substitute first; $\frac{0}{0}$ means factor, rationalise or use L'Hôpital.`,
        r`$\lim_{x \to 0}\frac{\sin x}{x} = 1$ (radians); $\lim_{n \to \infty}\left(1 + \frac1n\right)^n = e$.`,
        r`At infinity a rational function follows its leading terms: equal degrees give the ratio of the leading coefficients.`,
        r`Continuous at $a$: $f(a)$ exists and both one-sided limits equal it.`,
      ],
      example: {
        problem: r`Evaluate $\lim_{x \to 2}\frac{x^2 - 4}{x - 2}$ and $\lim_{x \to \infty}\frac{3x^2 + 5x}{2x^2 - 7}$.`,
        solution: r`The first is $\frac{0}{0}$: $\frac{(x - 2)(x + 2)}{x - 2} = x + 2 \to 4$. The second has equal degrees: $\frac32$.`,
      },
      traps: [r`A limit can exist where the function doesn't (a hole); the limit doesn't care about $f(a)$ itself.`],
    },
    {
      name: 'Differentiation Rules',
      inShort: r`The derivative as a limit, and the rules that make it quick: power, sum, product and quotient.`,
      keyIdeas: [
        r`$f'(x) = \lim_{h \to 0}\frac{f(x + h) - f(x)}{h}$: the slope of the tangent.`,
        r`Power: $(x^n)' = nx^{n-1}$; constants drop out; sums split.`,
        r`Product: $(uv)' = u'v + uv'$. Quotient: $\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$.`,
      ],
      example: {
        problem: r`Find the slope of $y = \frac{x^2 + 1}{x - 1}$ at $x = 2$.`,
        solution: r`$y' = \frac{2x(x - 1) - (x^2 + 1)}{(x - 1)^2} = \frac{x^2 - 2x - 1}{(x - 1)^2}$. At $x = 2$: $\frac{4 - 4 - 1}{1} = -1$.`,
      },
      traps: [r`The quotient rule's top is $u'v - uv'$ in that order; swapping it flips the sign.`],
    },
    {
      name: 'Chain Rule and Implicit Differentiation',
      inShort: r`Derivatives of functions inside functions, of curves not solved for $y$, and of inverses.`,
      keyIdeas: [
        r`Chain: $\frac{d}{dx}g(f(x)) = g'(f(x))\,f'(x)$; for a power, $(u^n)' = nu^{n-1}u'$.`,
        r`Implicit: differentiate both sides treating $y$ as $y(x)$, then solve for $y'$ (or $y' = -\frac{F_x}{F_y}$).`,
        r`Inverse: $(f^{-1})'(b) = \frac{1}{f'(a)}$ where $b = f(a)$.`,
        r`Variable powers like $x^x$: take $\ln$ first.`,
      ],
      example: {
        problem: r`Find the slope of $x^2 + xy + y^2 = 7$ at $(1, 2)$.`,
        solution: r`$2x + y + xy' + 2yy' = 0$, so $y' = -\frac{2x + y}{x + 2y} = -\frac{4}{5}$.`,
      },
      traps: [r`Every $y$ term needs its $y'$; $\frac{d}{dx}(xy) = y + xy'$, by the product rule.`],
    },
    {
      name: 'Derivatives of Transcendental Functions',
      inShort: r`Derivatives of the trigonometric, inverse trigonometric, exponential, logarithmic and hyperbolic functions.`,
      keyIdeas: [
        r`$(\sin u)' = \cos u\,u'$, $(\cos u)' = -\sin u\,u'$, $(\tan u)' = \sec^2u\,u'$.`,
        r`$(\sin^{-1}u)' = \frac{u'}{\sqrt{1 - u^2}}$, $(\tan^{-1}u)' = \frac{u'}{1 + u^2}$.`,
        r`$(e^u)' = e^u u'$, $(a^u)' = a^u\ln a\,u'$, $(\ln u)' = \frac{u'}{u}$.`,
        r`$(\sinh u)' = \cosh u\,u'$, $(\cosh u)' = \sinh u\,u'$: no minus.`,
      ],
      example: {
        problem: r`Differentiate $y = e^{2x}\sin x$ and find the slope at $x = 0$.`,
        solution: r`$y' = 2e^{2x}\sin x + e^{2x}\cos x = e^{2x}(2\sin x + \cos x)$; at $x = 0$, $y' = 1$.`,
      },
      traps: [r`The co-functions (cos, cot, csc and their inverses) carry the minus signs.`],
    },
    {
      name: 'Higher-Order Derivatives',
      inShort: r`Differentiating again and again, and the patterns that give the $n$th derivative at once.`,
      keyIdeas: [
        r`$\frac{d^n}{dx^n}x^m = \frac{m!}{(m - n)!}x^{m - n}$; past the $m$th it is $0$.`,
        r`$\sin x$ repeats every four derivatives; $(e^{ax})^{(n)} = a^ne^{ax}$.`,
        r`Leibniz: $(uv)^{(n)} = \sum\binom{n}{k}u^{(k)}v^{(n - k)}$.`,
      ],
      example: {
        problem: r`Find the third derivative of $y = xe^x$.`,
        solution: r`By Leibniz, only the terms with $x$ or its first derivative survive: $y''' = xe^x + 3e^x = (x + 3)e^x$.`,
      },
      traps: [r`For the $n$th derivative of $\sin x$ use $\sin\left(x + \frac{n\pi}{2}\right)$, rather than counting by hand.`],
    },
    {
      name: 'Curve Sketching',
      inShort: r`Reading a graph's shape from its derivatives: rising and falling, bending, and running off to asymptotes.`,
      keyIdeas: [
        r`$f' > 0$ rising, $f' < 0$ falling; $f' = 0$ marks possible turning points.`,
        r`$f'' > 0$ concave up, $f'' < 0$ concave down; an inflection is where $f''$ changes sign.`,
        r`Curvature $\kappa = \frac{|y''|}{(1 + y'^2)^{3/2}}$; radius $R = \frac1\kappa$.`,
        r`Rational functions: vertical asymptotes at the denominator's zeros, horizontal by degree, slant by long division.`,
      ],
      example: {
        problem: r`Sketch $f(x) = x^3 - 3x^2$: turning points and inflection.`,
        solution: r`$f' = 3x(x - 2)$: a maximum at $(0, 0)$ and a minimum at $(2, -4)$. $f'' = 6x - 6$: inflection at $(1, -2)$. Rising, falling on $(0, 2)$, rising again.`,
      },
      traps: [r`$f''(c) = 0$ alone is not an inflection: $x^4$ has $f''(0) = 0$ and none.`],
    },
    {
      name: 'Maxima and Minima',
      inShort: r`Finding the largest or smallest value, the board's favourite application.`,
      keyIdeas: [
        r`Critical points: $f' = 0$ or undefined; on a closed interval, also the end points.`,
        r`$f''(c) < 0$ maximum, $f''(c) > 0$ minimum; if $0$, check the sign change of $f'$.`,
        r`Word problems: write the quantity in one variable using the constraint, then differentiate.`,
        r`Worth remembering: fixed perimeter, a square; open box from side $s$, cut $\frac{s}{6}$; closed can, $h = 2r$.`,
      ],
      example: {
        problem: r`Equal squares are cut from the corners of a $12$ cm square sheet to fold an open box. What cut gives the largest box?`,
        solution: r`$V = x(12 - 2x)^2$, $V' = (12 - 2x)(12 - 6x) = 0$ gives $x = 2$ (the other root, $6$, leaves nothing). $V = 2(8)^2 = 128$ cm³.`,
      },
      traps: [r`Check the root makes physical sense; the derivative also finds the useless one.`],
    },
    {
      name: 'Time Rates',
      inShort: r`How fast one quantity changes when another linked to it does.`,
      keyIdeas: [
        r`Write the equation linking the quantities, differentiate with respect to $t$, then substitute the instant's values.`,
        r`Sphere: $\frac{dV}{dt} = 4\pi r^2\frac{dr}{dt}$; a filling cone: $\frac{dV}{dt} = \pi r^2\frac{dh}{dt}$ with $r$ the surface radius.`,
        r`Ladder: $x^2 + y^2 = L^2$ gives $x\dot x + y\dot y = 0$.`,
      ],
      example: {
        problem: r`Water flows at $0.5$ m³/min into a conical tank, vertex down, with a top radius of $2$ m and a depth of $6$ m. How fast is the level rising when the water is $3$ m deep?`,
        solution: r`By similar triangles $r = \frac{h}{3}$, so $V = \frac{\pi h^3}{27}$ and $\frac{dV}{dt} = \frac{\pi h^2}{9}\frac{dh}{dt}$. At $h = 3$: $0.5 = \pi\frac{dh}{dt}$, so $\frac{dh}{dt} = \frac{0.5}{\pi} \approx 0.159$ m/min.`,
      },
      traps: [r`Substitute the instant's numbers only after differentiating; a constant put in too early has zero rate.`],
    },
    {
      name: 'Differentials',
      inShort: r`Small changes along the tangent: approximations and how errors grow.`,
      keyIdeas: [
        r`$dy = f'(x)\,dx$, and $f(x + \Delta x) \approx f(x) + f'(x)\Delta x$.`,
        r`For $y = kx^n$: $\frac{dy}{y} = n\frac{dx}{x}$; a 1% error in a radius is about 3% in a sphere's volume.`,
      ],
      example: {
        problem: r`Approximate $\sqrt[3]{65}$ with differentials.`,
        solution: r`$f(x) = x^{1/3}$ at $64$: $f' = \frac{1}{3x^{2/3}} = \frac{1}{48}$. So $\sqrt[3]{65} \approx 4 + \frac{1}{48} \approx 4.0208$ (true $4.0207$).`,
      },
      traps: [r`Pick the nearby point where the function is easy (a perfect cube, a known angle); the step must be small.`],
    },
    {
      name: 'Mean Value Theorems',
      inShort: r`Somewhere the instantaneous slope equals the average slope: the theorem and its relatives.`,
      keyIdeas: [
        r`MVT: $f'(c) = \frac{f(b) - f(a)}{b - a}$ for some $c$ in $(a, b)$, if $f$ is continuous on $[a, b]$ and differentiable inside.`,
        r`Rolle: $f(a) = f(b)$ gives a point with $f'(c) = 0$.`,
        r`Cauchy's version, for two functions, proves L'Hôpital's rule.`,
      ],
      example: {
        problem: r`Find the $c$ promised by the mean value theorem for $f(x) = x^2$ on $[1, 3]$.`,
        solution: r`Average slope $\frac{9 - 1}{2} = 4$, and $f'(c) = 2c = 4$, so $c = 2$: for a quadratic it is always the midpoint.`,
      },
      traps: [r`Check the conditions: $|x|$ on $[-1, 1]$ has equal end values but no point with zero slope.`],
    },
    {
      name: "L'Hôpital's Rule",
      inShort: r`Evaluating indeterminate limits by differentiating the top and bottom separately.`,
      keyIdeas: [
        r`For $\frac00$ or $\frac\infty\infty$: $\lim\frac{f}{g} = \lim\frac{f'}{g'}$; repeat while it stays indeterminate.`,
        r`Rewrite $0\cdot\infty$ and $\infty - \infty$ as a fraction; for $0^0$, $1^\infty$, $\infty^0$ take $\ln$ first.`,
        r`$1^\infty$ shortcut: $\lim f^{\,g} = e^{\lim g(f - 1)}$.`,
      ],
      example: {
        problem: r`Evaluate $\lim_{x \to 0}\frac{1 - \cos x}{x^2}$.`,
        solution: r`$\frac00$: $\lim\frac{\sin x}{2x} = \frac12$ (or apply the rule once more: $\frac{\cos x}{2} \to \frac12$).`,
      },
      traps: [r`Differentiate top and bottom separately; it is not the quotient rule. And stop once the form is no longer indeterminate.`],
    },
    {
      name: 'Parametric Equations',
      inShort: r`Slopes, tangents, concavity and speed of curves given in a parameter.`,
      keyIdeas: [
        r`$\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$; horizontal tangent where $\frac{dy}{dt} = 0$, vertical where $\frac{dx}{dt} = 0$.`,
        r`$\frac{d^2y}{dx^2} = \frac{\frac{d}{dt}\left(\frac{dy}{dx}\right)}{dx/dt}$.`,
        r`Speed $\sqrt{\dot x^2 + \dot y^2}$; integrated over time, the distance.`,
      ],
      example: {
        problem: r`For $x = t^2$, $y = t^3 - 3t$, find the points with horizontal tangents and the slope at $t = 2$.`,
        solution: r`$\frac{dy}{dx} = \frac{3t^2 - 3}{2t}$. Horizontal at $t = \pm1$: the points $(1, -2)$ and $(1, 2)$. At $t = 2$: $\frac{9}{4}$.`,
      },
      traps: [r`The second derivative divides by $\frac{dx}{dt}$ again; it is not $\frac{d^2y/dt^2}{d^2x/dt^2}$.`],
    },
    {
      name: 'Partial Differentiation',
      inShort: r`Rates of change of functions of several variables, one variable at a time.`,
      keyIdeas: [
        r`$f_x$: differentiate in $x$ holding the others constant; $f_{xy} = f_{yx}$ for smooth functions.`,
        r`Total differential $dz = f_x\,dx + f_y\,dy$; chain rule $\frac{dz}{dt} = f_x\dot x + f_y\dot y$.`,
        r`Gradient $\nabla f$ points uphill; $D_{\hat u}f = \nabla f \cdot \hat u$.`,
        r`Critical points: $D = f_{xx}f_{yy} - f_{xy}^2$ decides max, min or saddle.`,
      ],
      example: {
        problem: r`For $z = x^2y + 3xy^2$, find $z_x$ and $z_y$ at $(1, 2)$, and the change in $z$ when $x$ grows by $0.01$ and $y$ falls by $0.02$.`,
        solution: r`$z_x = 2xy + 3y^2 = 16$, $z_y = x^2 + 6xy = 13$. $dz = 16(0.01) + 13(-0.02) = -0.10$.`,
      },
      traps: [r`In $z_x$, a term like $3xy^2$ differentiates to $3y^2$: $y$ is a constant there.`],
    },
  ],
};
