'use strict';

// Mathematics › Calculus 1 formula cards (Library round, 2026-11-17): four
// live cards (the derivative's definition, product and chain rules,
// L'Hôpital) for 13 subtopics, so most of this file is new cards. See
// algebra.js for the format; tests/calculus1Formulas.test.js checks every rule
// against numerical derivatives and limits, not against itself. Names already
// held (Slope of a Parametric Curve, Derivative of Inverse Tangent) are not
// reused: the insert would skip them.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const LIM = 'Limits and Continuity';
const RULES = 'Differentiation Rules';
const CHAIN = 'Chain Rule and Implicit Differentiation';
const TRANS = 'Derivatives of Transcendental Functions';
const HIGH = 'Higher-Order Derivatives';
const CURVE = 'Curve Sketching';
const MAX = 'Maxima and Minima';
const RATES = 'Time Rates';
const DIFF = 'Differentials';
const MVT = 'Mean Value Theorems';
const LHOP = "L'Hôpital's Rule";
const PARAM = 'Parametric Equations';
const PART = 'Partial Differentiation';

const file = [
    ['b210b60d-1e20-4354-9660-06d8edc8ccff', RULES, 'Definition'],
    ['a06e2fff-e76a-4033-8502-acb225d2291d', RULES, 'Products and quotients'],
    ['d0f40152-d7b6-45f1-ba6f-27857ffb13de', CHAIN, 'Chain rule'],
    ['5978b512-56fb-4830-a514-a9180ff54c7d', LHOP, null],
];

const revisions = [
    { id: 'd0f40152-d7b6-45f1-ba6f-27857ffb13de', note: 'It had no symbol.', symbol: r`$(g \circ f)'$` },
    { id: 'a06e2fff-e76a-4033-8502-acb225d2291d', note: 'It had no symbol.', symbol: r`$(uv)'$` },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const U = v(r`$u$`, r`a function of $x$, with derivative $u'$`);
const FX = v(r`$f(x)$`, 'the function');

const drafts = [
    // Limits and Continuity
    F(LIM, 'Rules', 'Limit Laws', r`$\lim (f \pm g)$`, r`$\lim(f \pm g) = \lim f \pm \lim g,\quad \lim fg = \lim f \cdot \lim g,\quad \lim\frac{f}{g} = \frac{\lim f}{\lim g}$`,
        [v(r`$f, g$`, 'functions whose limits exist at the point')],
        'Limits of sums, products and quotients, from the limits of the parts.',
        r`The quotient law needs $\lim g \ne 0$; a $\frac{0}{0}$ needs factoring or L'Hôpital.`),
    F(LIM, 'Special limits', 'Special Trigonometric Limits', r`$\lim_{x \to 0}\frac{\sin x}{x}$`, r`$\lim_{x \to 0}\frac{\sin x}{x} = 1,\qquad \lim_{x \to 0}\frac{1 - \cos x}{x} = 0,\qquad \lim_{x \to 0}\frac{\tan x}{x} = 1$`,
        [v(r`$x$`, 'the angle, in radians')],
        'The limits behind the derivatives of sine and cosine.',
        r`In radians only; $\lim_{x \to 0}\frac{\sin kx}{x} = k$.`),
    F(LIM, 'Special limits', 'Limits That Define e', r`$e$`, r`$\lim_{n \to \infty}\left(1 + \frac1n\right)^n = e,\qquad \lim_{x \to 0}\frac{e^x - 1}{x} = 1,\qquad \lim_{x \to 0}(1 + x)^{1/x} = e$`,
        [v(r`$n$`, 'a whole number growing without bound'), v(r`$x$`, 'a variable tending to 0')],
        'Three faces of the number e as a limit.',
        r`More generally $\lim_{n \to \infty}\left(1 + \frac{a}{n}\right)^n = e^a$: compound interest compounded continuously.`),
    F(LIM, 'At infinity', 'Limits of Rational Functions at Infinity', r`$\lim_{x \to \infty}\frac{P(x)}{Q(x)}$`, r`$\lim_{x \to \infty}\frac{a_n x^n + \cdots}{b_m x^m + \cdots} = \begin{cases} 0 & n < m \\ \frac{a_n}{b_m} & n = m \\ \pm\infty & n > m \end{cases}$`,
        [v(r`$a_n, b_m$`, 'leading coefficients'), v(r`$n, m$`, 'degrees of the top and bottom')],
        'A rational function at infinity follows its highest powers.',
        'Equal degrees give the ratio of leading coefficients: that is the horizontal asymptote.'),
    F(LIM, 'Continuity', 'Continuity at a Point', r`$\lim_{x \to a} f(x) = f(a)$`, r`$\lim_{x \to a^-} f(x) = \lim_{x \to a^+} f(x) = f(a)$`, [FX, v(r`$a$`, 'the point')],
        'A function is continuous at a when it is defined there and both one-sided limits equal f(a).',
        'A hole (removable), a jump, or a vertical asymptote each break it.'),
    F(LIM, 'Rules', 'Squeeze Theorem', r`$g \le f \le h$`, r`$g(x) \le f(x) \le h(x),\ \lim g = \lim h = L \implies \lim f = L$`,
        [v(r`$f, g, h$`, 'functions near the point'), v(r`$L$`, 'the common limit')],
        'A function trapped between two with the same limit has that limit too.',
        r`It proves $\lim_{x \to 0} x\sin\frac1x = 0$, since $-|x| \le x\sin\frac1x \le |x|$.`),
    // Differentiation Rules
    F(RULES, 'Basic rules', 'Power Rule', r`$\frac{d}{dx}x^n$`, r`$\frac{d}{dx}x^n = nx^{n-1}$`, [v(r`$n$`, 'any real exponent')],
        'The derivative of a power of x.',
        r`Write roots and reciprocals as powers first: $\frac{1}{x^2} = x^{-2}$, $\sqrt x = x^{1/2}$.`),
    F(RULES, 'Basic rules', 'Constant, Sum and Constant-Multiple Rules', r`$(cf)'$`, r`$\frac{d}{dx}c = 0,\quad (cf)' = cf',\quad (f \pm g)' = f' \pm g'$`,
        [v(r`$c$`, 'a constant'), v(r`$f, g$`, 'differentiable functions')],
        'Derivatives pass through sums and constant factors.',
        r`They don't pass through products or quotients: those have their own rules.`),
    F(RULES, 'Products and quotients', 'Quotient Rule', r`$\left(\frac{u}{v}\right)'$`, r`$\frac{d}{dx}\frac{u}{v} = \frac{u'v - uv'}{v^2}$`,
        [v(r`$u, v$`, r`functions of $x$, $v \ne 0$`)],
        'The derivative of one function divided by another.',
        '"Low d-high minus high d-low, over low squared": the order of the top matters.'),
    F(RULES, 'Basic rules', 'Derivative of a Square Root', r`$\frac{d}{dx}\sqrt u$`, r`$\frac{d}{dx}\sqrt u = \frac{u'}{2\sqrt u}$`, [U],
        'The derivative of the square root of a function.',
        'Undefined where u = 0: the graph has a vertical tangent there.'),
    // Chain Rule and Implicit Differentiation
    F(CHAIN, 'Chain rule', 'Power of a Function', r`$\frac{d}{dx}u^n$`, r`$\frac{d}{dx}u^n = nu^{n-1}\,u'$`, [U, v(r`$n$`, 'any real exponent')],
        'The power rule with the chain rule built in.',
        "Don't forget the u' at the end: it is the chain rule's factor."),
    F(CHAIN, 'Implicit', 'Implicit Differentiation', r`$\frac{dy}{dx} = -\frac{F_x}{F_y}$`, r`$F(x, y) = 0 \implies \frac{dy}{dx} = -\frac{F_x}{F_y}$`,
        [v(r`$F_x, F_y$`, r`the partial derivatives of $F$ with respect to $x$ and $y$`)],
        'The slope of a curve given as an equation in x and y, without solving for y.',
        'Or differentiate both sides, treating y as a function of x, and solve for dy/dx.'),
    F(CHAIN, 'Implicit', 'Derivative of an Inverse Function', r`$(f^{-1})'$`, r`$\frac{dx}{dy} = \frac{1}{dy/dx},\qquad (f^{-1})'(b) = \frac{1}{f'(a)},\ b = f(a)$`,
        [v(r`$f$`, 'a one-to-one function'), v(r`$a, b$`, 'a point and its image')],
        'The slope of an inverse is the reciprocal of the slope at the matching point.',
        r`Evaluate $f'$ at $a$, not at $b$.`),
    F(CHAIN, 'Implicit', 'Logarithmic Differentiation', r`$\frac{y'}{y}$`, r`$y = f^{\,g} \implies \frac{y'}{y} = g'\ln f + g\,\frac{f'}{f}$`,
        [v(r`$f, g$`, r`functions of $x$, $f > 0$`)],
        'Take ln of both sides to differentiate a variable raised to a variable power, or a long product.',
        r`$\frac{d}{dx}x^x = x^x(\ln x + 1)$.`),
    // Derivatives of Transcendental Functions
    F(TRANS, 'Trigonometric', 'Derivatives of Sine and Cosine', r`$\frac{d}{dx}\sin u$`, r`$\frac{d}{dx}\sin u = \cos u\,u',\qquad \frac{d}{dx}\cos u = -\sin u\,u'$`, [U],
        'The derivatives of sine and cosine, with the chain rule.',
        'Radians only; and the cosine\'s derivative carries a minus.'),
    F(TRANS, 'Trigonometric', 'Derivatives of the Other Trigonometric Functions', r`$\frac{d}{dx}\tan u$`, r`$(\tan u)' = \sec^2 u\,u',\ (\cot u)' = -\csc^2 u\,u',\ (\sec u)' = \sec u\tan u\,u',\ (\csc u)' = -\csc u\cot u\,u'$`, [U],
        'Derivatives of tangent, cotangent, secant and cosecant.',
        'The co-functions (cot, csc) take a minus.'),
    F(TRANS, 'Inverse trigonometric', 'Derivatives of Inverse Sine and Cosine', r`$\frac{d}{dx}\sin^{-1}u$`, r`$\frac{d}{dx}\sin^{-1}u = \frac{u'}{\sqrt{1 - u^2}},\qquad \frac{d}{dx}\cos^{-1}u = -\frac{u'}{\sqrt{1 - u^2}}$`, [U],
        'The derivatives of arcsine and arccosine.',
        r`They differ only in sign, since $\sin^{-1}u + \cos^{-1}u = \frac{\pi}{2}$.`),
    F(TRANS, 'Inverse trigonometric', 'Derivatives of Inverse Cotangent, Secant and Cosecant', r`$\frac{d}{dx}\sec^{-1}u$`, r`$(\cot^{-1}u)' = -\frac{u'}{1 + u^2},\ (\sec^{-1}u)' = \frac{u'}{|u|\sqrt{u^2 - 1}},\ (\csc^{-1}u)' = -\frac{u'}{|u|\sqrt{u^2 - 1}}$`, [U],
        'The rest of the inverse trigonometric derivatives.',
        'Each co-function is the negative of its partner.'),
    F(TRANS, 'Exponential and logarithmic', 'Derivatives of Exponentials', r`$\frac{d}{dx}e^u$`, r`$\frac{d}{dx}e^u = e^u\,u',\qquad \frac{d}{dx}a^u = a^u\ln a\,u'$`, [U, v(r`$a$`, 'a positive base')],
        'Exponentials are their own derivative, up to a constant.',
        r`Don't use the power rule on $a^x$: the variable is in the exponent.`),
    F(TRANS, 'Exponential and logarithmic', 'Derivatives of Logarithms', r`$\frac{d}{dx}\ln u$`, r`$\frac{d}{dx}\ln u = \frac{u'}{u},\qquad \frac{d}{dx}\log_a u = \frac{u'}{u\ln a}$`, [U, v(r`$a$`, 'a positive base')],
        'The derivative of a logarithm is the derivative of its inside over the inside.',
        r`$\frac{d}{dx}\ln|x| = \frac1x$ for $x \ne 0$.`),
    F(TRANS, 'Hyperbolic', 'Derivatives of Hyperbolic Functions', r`$\frac{d}{dx}\sinh u$`, r`$(\sinh u)' = \cosh u\,u',\quad (\cosh u)' = \sinh u\,u',\quad (\tanh u)' = \text{sech}^2 u\,u'$`, [U],
        'The derivatives of the hyperbolic functions.',
        'Unlike cosine, cosh differentiates with no minus sign.'),
    // Higher-Order Derivatives
    F(HIGH, null, 'nth Derivative of a Power', r`$\frac{d^n}{dx^n}x^m$`, r`$\frac{d^n}{dx^n}x^m = \frac{m!}{(m - n)!}x^{m - n}\ (n \le m)$`,
        [v(r`$m$`, 'a whole-number power'), v(r`$n$`, 'how many times it is differentiated')],
        'Repeating the power rule n times.',
        r`The $m$th derivative of $x^m$ is $m!$; any higher one is 0.`),
    F(HIGH, null, 'nth Derivatives of Sine and Exponentials', r`$\frac{d^n}{dx^n}\sin x$`, r`$\frac{d^n}{dx^n}\sin x = \sin\left(x + \frac{n\pi}{2}\right),\qquad \frac{d^n}{dx^n}e^{ax} = a^n e^{ax}$`,
        [v(r`$n$`, 'the order of the derivative'), v(r`$a$`, 'a constant')],
        'Sine cycles every four derivatives; an exponential gains a factor a each time.',
        r`The 4th derivative of $\sin x$ is $\sin x$ again; of $\cos x$, $\cos x$.`),
    F(HIGH, null, 'Leibniz Rule', r`$(uv)^{(n)}$`, r`$(uv)^{(n)} = \sum_{k=0}^{n}\binom{n}{k}u^{(k)}v^{(n-k)}$`,
        [v(r`$u, v$`, 'functions of x'), v(r`$n$`, 'the order')],
        'The nth derivative of a product, with binomial coefficients.',
        r`For $n = 1$ it is the product rule; for $n = 2$, $u''v + 2u'v' + uv''$.`),
    // Curve Sketching
    F(CURVE, 'First derivative', 'Increasing and Decreasing Functions', r`$f'(x) > 0$`, r`$f'(x) > 0 \implies f \text{ increasing},\qquad f'(x) < 0 \implies f \text{ decreasing}$`, [FX],
        'The sign of the first derivative tells which way the graph goes.',
        'Find where f′ = 0 or is undefined, then test the sign on each interval.'),
    F(CURVE, 'Second derivative', 'Concavity and Inflection Points', r`$f''(x)$`, r`$f''(x) > 0 \text{ concave up},\quad f''(x) < 0 \text{ concave down},\quad \text{inflection where } f'' \text{ changes sign}$`, [FX],
        'The sign of the second derivative tells which way the graph bends.',
        "f'' = 0 is not enough: x⁴ has f''(0) = 0 and no inflection there."),
    F(CURVE, 'Second derivative', 'Curvature and Radius of Curvature', r`$\kappa$`, r`$\kappa = \frac{|y''|}{\left(1 + y'^2\right)^{3/2}},\qquad R = \frac1\kappa$`,
        [v(r`$y', y''$`, r`the first and second derivatives of $y(x)$`), v(r`$R$`, 'radius of curvature')],
        'How sharply a curve bends at a point, and the radius of the circle that fits it.',
        r`At a vertex where $y' = 0$, $R = \frac{1}{|y''|}$.`),
    F(CURVE, 'Asymptotes', 'Asymptotes of a Rational Function', r`$y = \frac{P(x)}{Q(x)}$`, r`$\text{vertical: } Q(a) = 0,\ P(a) \ne 0;\quad \text{horizontal: by degree};\quad \text{slant: } \deg P = \deg Q + 1$`,
        [v(r`$P, Q$`, 'the top and bottom polynomials')],
        'Where a rational function runs off to infinity, and what it approaches far out.',
        'A slant asymptote is the quotient of the long division, without the remainder.'),
    // Maxima and Minima
    F(MAX, 'Tests', 'Critical Points', r`$f'(c) = 0$`, r`$f'(c) = 0 \text{ or } f'(c) \text{ undefined}$`, [FX, v(r`$c$`, 'a point in the domain')],
        'Where a smooth maximum or minimum can be.',
        'On a closed interval, also check the end points.'),
    F(MAX, 'Tests', 'First and Second Derivative Tests', r`$f''(c)$`, r`$f'(c) = 0:\quad f''(c) < 0 \text{ max},\quad f''(c) > 0 \text{ min},\quad f''(c) = 0 \text{ use the sign change of } f'$`,
        [FX, v(r`$c$`, 'a critical point')],
        'Telling a maximum from a minimum at a critical point.',
        'First derivative test: f′ goes + to − at a maximum, − to + at a minimum.'),
    F(MAX, 'Classic results', 'Optimum Shapes to Remember', r`$h = 2r$`, r`$\text{rectangle, fixed perimeter: a square};\quad \text{open box from a square of side } s:\ x = \frac{s}{6};\quad \text{closed can, fixed volume: } h = 2r$`,
        [v(r`$s$`, 'side of the square sheet'), v(r`$x$`, 'side of the squares cut from its corners'), v(r`$h, r$`, 'height and radius of the can')],
        'Answers board problems ask again and again; check them with the derivative.',
        'An open can (no lid) of fixed volume and least material has h = r.'),
    // Time Rates
    F(RATES, null, 'Related Rates', r`$\frac{dy}{dt}$`, r`$\frac{dy}{dt} = \frac{dy}{dx}\cdot\frac{dx}{dt}$`,
        [v(r`$x, y$`, 'quantities linked by an equation'), v(r`$t$`, 'time')],
        'Rates linked through an equation: differentiate it with respect to time.',
        'Differentiate first, then put in the numbers for that instant.'),
    F(RATES, null, 'Rates for a Sphere and a Conical Tank', r`$\frac{dV}{dt}$`, r`$\text{sphere: } \frac{dV}{dt} = 4\pi r^2\frac{dr}{dt};\qquad \text{cone filling: } \frac{dV}{dt} = \pi r^2\frac{dh}{dt}$`,
        [v(r`$V$`, 'volume'), v(r`$r$`, 'radius (for the cone, of the water surface)'), v(r`$h$`, 'water depth')],
        'Volume rates for a growing sphere and a filling cone.',
        r`For a cone, link $r$ to $h$ by similar triangles before differentiating.`),
    F(RATES, null, 'Sliding Ladder', r`$x\frac{dx}{dt} + y\frac{dy}{dt} = 0$`, r`$x^2 + y^2 = L^2 \implies x\frac{dx}{dt} + y\frac{dy}{dt} = 0$`,
        [v(r`$x$`, 'foot from the wall'), v(r`$y$`, 'top up the wall'), v(r`$L$`, 'ladder length')],
        'A ladder sliding down a wall: the two rates are linked by Pythagoras.',
        'The top moves down (negative rate) while the foot moves out.'),
    // Differentials
    F(DIFF, null, 'Differential of a Function', r`$dy = f'(x)\,dx$`, r`$dy = f'(x)\,dx$`, [FX, v(r`$dx$`, 'a small change in x'), v(r`$dy$`, 'the matching change along the tangent')],
        'The change along the tangent line for a small change in x.',
        'dy approximates the true change Δy; the smaller dx, the better.'),
    F(DIFF, null, 'Linear Approximation', r`$f(x + \Delta x)$`, r`$f(x + \Delta x) \approx f(x) + f'(x)\,\Delta x$`, [FX, v(r`$\Delta x$`, 'a small step')],
        'Estimating a value from a nearby point and the slope there.',
        r`$\sqrt{26} \approx 5 + \frac{1}{10} = 5.1$ (true: 5.099).`),
    F(DIFF, null, 'Relative and Percentage Error', r`$\frac{dy}{y}$`, r`$\frac{dy}{y} = n\,\frac{dx}{x}\ \text{ for } y = kx^n$`,
        [v(r`$\frac{dx}{x}$`, 'relative error in the measurement'), v(r`$n$`, 'the power')],
        'A relative error in a measurement becomes n times as large in its nth power.',
        'A 1% error in a radius is about a 3% error in the volume of a sphere.'),
    // Mean Value Theorems
    F(MVT, null, 'Mean Value Theorem', r`$f'(c)$`, r`$f'(c) = \frac{f(b) - f(a)}{b - a}\ \text{ for some } c \in (a, b)$`,
        [FX, v(r`$a, b$`, 'the end points'), v(r`$c$`, 'a point between them')],
        'Somewhere between a and b the slope equals the average slope.',
        'f must be continuous on [a, b] and differentiable on (a, b). For a quadratic, c is the midpoint.'),
    F(MVT, null, "Rolle's Theorem", r`$f'(c) = 0$`, r`$f(a) = f(b) \implies f'(c) = 0\ \text{ for some } c \in (a, b)$`, [FX, v(r`$a, b$`, 'the end points'), v(r`$c$`, 'a point between them')],
        'Between two equal values a smooth function has a horizontal tangent.',
        'It is the mean value theorem with zero average slope.'),
    F(MVT, null, "Cauchy's Mean Value Theorem", r`$\frac{f'(c)}{g'(c)}$`, r`$\frac{f'(c)}{g'(c)} = \frac{f(b) - f(a)}{g(b) - g(a)}$`,
        [v(r`$f, g$`, r`functions on $[a, b]$, $g' \ne 0$`), v(r`$c$`, 'a point between a and b')],
        'The mean value theorem for two functions at once.',
        "It is the step that proves L'Hôpital's rule."),
    // L'Hôpital's Rule
    F(LHOP, null, 'Indeterminate Forms', r`$\frac{0}{0}$`, r`$\frac00,\ \frac{\infty}{\infty},\ 0\cdot\infty,\ \infty - \infty,\ 0^0,\ 1^\infty,\ \infty^0$`,
        [v(r`$0, \infty$`, 'what the parts tend to, not their values')],
        'The seven forms whose limit the parts alone don\'t decide.',
        r`Rewrite $0\cdot\infty$ as $\frac{f}{1/g}$; for the power forms take $\ln$ first.`),
    F(LHOP, null, 'Limit of the 1-to-Infinity Form', r`$\lim f^{\,g}$`, r`$f \to 1,\ g \to \infty:\quad \lim f^{\,g} = e^{\lim g\,(f - 1)}$`,
        [v(r`$f, g$`, 'the base and the exponent')],
        'A base tending to 1 raised to a growing power: the exponent of e decides.',
        r`$\lim_{x \to \infty}\left(1 + \frac3x\right)^{2x} = e^{6}$.`),
    // Parametric Equations
    F(PARAM, 'Derivatives', 'Second Derivative of a Parametric Curve', r`$\frac{d^2y}{dx^2}$`, r`$\frac{d^2y}{dx^2} = \frac{\frac{d}{dt}\left(\frac{dy}{dx}\right)}{dx/dt}$`,
        [v(r`$x(t), y(t)$`, 'the curve')],
        'Concavity of a parametric curve.',
        'Divide by dx/dt again: it is not d²y/dt² over d²x/dt².'),
    F(PARAM, 'Tangents', 'Tangent Line to a Parametric Curve', r`$y - y_0$`, r`$y - y_0 = \frac{y'(t_0)}{x'(t_0)}(x - x_0)$`,
        [v(r`$(x_0, y_0)$`, r`the point at $t = t_0$`), v(r`$x'(t), y'(t)$`, 'derivatives with respect to t')],
        'The tangent line at a point of a parametric curve.',
        "Horizontal where y'(t) = 0; vertical where x'(t) = 0."),
    F(PARAM, 'Motion', 'Speed on a Parametric Path', r`$v$`, r`$v = \sqrt{\left(\frac{dx}{dt}\right)^2 + \left(\frac{dy}{dt}\right)^2}$`,
        [v(r`$x(t), y(t)$`, 'position at time t'), v(r`$v$`, 'speed')],
        'How fast a point moves along a parametric path.',
        'Integrating the speed over time gives the distance travelled.'),
    // Partial Differentiation
    F(PART, 'First partials', 'Partial Derivatives', r`$\frac{\partial f}{\partial x}$`, r`$f_x = \lim_{h \to 0}\frac{f(x + h, y) - f(x, y)}{h}$`,
        [v(r`$f(x, y)$`, 'a function of two variables'), v(r`$f_x$`, r`its partial derivative in $x$`)],
        'The rate of change in one variable, holding the others fixed.',
        'Treat every other variable as a constant.'),
    F(PART, 'Second partials', 'Equality of Mixed Partials', r`$f_{xy} = f_{yx}$`, r`$\frac{\partial^2 f}{\partial x\,\partial y} = \frac{\partial^2 f}{\partial y\,\partial x}$`,
        [v(r`$f(x, y)$`, 'a function with continuous second partials')],
        "Clairaut's theorem: the order of mixed partial derivatives doesn't matter.",
        'A quick check on your work: compute both.'),
    F(PART, 'Changes', 'Total Differential', r`$dz$`, r`$dz = \frac{\partial z}{\partial x}dx + \frac{\partial z}{\partial y}dy$`,
        [v(r`$z = f(x, y)$`, 'the function'), v(r`$dx, dy$`, 'small changes in x and y')],
        'The small change in a function of two variables.',
        'Use it for propagated error when two measurements are uncertain.'),
    F(PART, 'Changes', 'Chain Rule for Several Variables', r`$\frac{dz}{dt}$`, r`$\frac{dz}{dt} = \frac{\partial z}{\partial x}\frac{dx}{dt} + \frac{\partial z}{\partial y}\frac{dy}{dt}$`,
        [v(r`$z = f(x, y)$`, 'the function'), v(r`$x(t), y(t)$`, 'both depending on t')],
        'The rate of change of z when x and y both change with t.',
        'One term per path from z to t.'),
    F(PART, 'Changes', 'Gradient and Directional Derivative', r`$\nabla f$`, r`$\nabla f = (f_x, f_y),\qquad D_{\hat u}f = \nabla f \cdot \hat u$`,
        [v(r`$\hat u$`, 'a unit vector in the direction of interest')],
        'The rate of change in any direction; the gradient points the steepest way up.',
        r`The greatest rate is $|\nabla f|$; normalise the direction before the dot product.`),
    F(PART, 'Second partials', 'Second Derivative Test for Two Variables', r`$D$`, r`$D = f_{xx}f_{yy} - f_{xy}^2:\quad D > 0,\ f_{xx} < 0 \text{ max};\ D > 0,\ f_{xx} > 0 \text{ min};\ D < 0 \text{ saddle}$`,
        [v(r`$f_{xx}, f_{yy}, f_{xy}$`, r`second partials at a point where $f_x = f_y = 0$`)],
        'Classifying a critical point of a function of two variables.',
        'D = 0 decides nothing.'),
];

module.exports = { subject: 'Mathematics', topic: 'Calculus 1', migration: '20261201000000_cards_calculus_1', file, revisions, retire, drafts };
