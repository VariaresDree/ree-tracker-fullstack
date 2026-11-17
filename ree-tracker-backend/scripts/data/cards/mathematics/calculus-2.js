'use strict';

// Mathematics › Calculus 2 formula cards (Library round, 2026-11-17): twelve
// live cards. Nine are filed under the 13 subtopics; three are about series
// (p-series, radius of convergence, Taylor), which Calculus 2's syllabus has no
// subtopic for, so they stay unfiled and show under "Other cards" until a
// series topic takes them. See algebra.js for the format;
// tests/calculus2Formulas.test.js checks every formula by numerical
// integration, never against itself.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const FORM = 'Integration Formulas';
const DEF = 'Definite Integrals';
const PARTS = 'Integration by Parts';
const TRIG = 'Trigonometric Integrals';
const TSUB = 'Trigonometric Substitution';
const PF = 'Partial Fractions';
const IMP = 'Improper Integrals';
const AREA = 'Area Between Curves';
const VOL = 'Volumes of Revolution';
const ARC = 'Arc Length and Surface Area';
const CENT = 'Centroids and Moments of Inertia';
const WORK = 'Work and Fluid Pressure';
const MULT = 'Multiple Integrals';

const file = [
    ['15ed3f15-7a1f-4dfc-8023-8f9d043340d3', FORM, 'Trigonometric'],
    ['d020ea13-b1f8-45f0-b885-329a3276a504', DEF, 'Evaluating'],
    ['a057dfcc-432c-403e-b1b0-9019fbc1ae56', PARTS, null],
    ['b93ad5bd-6b0c-440a-b438-7e9042c88e96', PF, null],
    ['b4d60c13-b3e8-44a6-8b8c-769220b98f0b', IMP, null],
    ['5623ca5b-842b-43bf-ac5b-61bda29d4ad0', VOL, null],
    ['2b4fdfc4-1d62-40ba-aaf7-041d993e3d97', ARC, 'Arc length'],
    ['80bbc807-48a8-47b4-a01d-b2f2bfffa572', ARC, 'Arc length'],
    ['8183e4bc-8e9f-4375-af68-68f37492b0f4', ARC, 'Surface area'],
];

const revisions = [
    { id: 'd020ea13-b1f8-45f0-b885-329a3276a504', note: 'It had no symbol.', symbol: r`$\int_a^b f(x)\,dx$` },
    { id: 'a057dfcc-432c-403e-b1b0-9019fbc1ae56', note: 'It had no symbol.', symbol: r`$\int u\,dv$` },
    {
        id: '53d5f03f-b8db-4404-a565-c6454ba6816a',
        note: 'It had no symbol, and the formula showed the series without saying when it converges.',
        symbol: r`$\sum \frac{1}{n^p}$`,
        f: r`$\sum_{n=1}^{\infty}\frac{1}{n^{p}} \text{ converges} \iff p > 1$`,
    },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const U = v(r`$u$`, r`a function of $x$, with $du = u'\,dx$`);
const AB = v(r`$a, b$`, 'the limits of integration');
const AConst = v(r`$a$`, 'a positive constant');

const drafts = [
    // Integration Formulas
    F(FORM, 'Algebraic', 'Power Rule for Integrals', r`$\int u^n\,du$`, r`$\int u^n\,du = \frac{u^{n+1}}{n + 1} + C\ (n \ne -1),\qquad \int\frac{du}{u} = \ln|u| + C$`,
        [U, v(r`$n$`, 'a real exponent'), v(r`$C$`, 'the constant of integration')],
        'The integral of a power, and the one power it doesn\'t cover.',
        r`$n = -1$ is the logarithm, not $\frac{u^0}{0}$.`),
    F(FORM, 'Algebraic', 'Substitution Rule', r`$\int f(g(x))g'(x)\,dx$`, r`$\int f(g(x))\,g'(x)\,dx = \int f(u)\,du,\quad u = g(x)$`,
        [v(r`$u = g(x)$`, 'the inside function')],
        'The chain rule run backwards: spot an inside function whose derivative is also there.',
        'For a definite integral, change the limits to u too, or substitute back first.'),
    F(FORM, 'Exponential', 'Integrals of Exponentials', r`$\int e^u\,du$`, r`$\int e^u\,du = e^u + C,\qquad \int a^u\,du = \frac{a^u}{\ln a} + C$`, [U, v(r`$a$`, 'a positive base, not 1')],
        'Exponentials integrate to themselves, up to a constant.',
        r`$\int e^{kx}dx = \frac{e^{kx}}{k}$: divide by the inside's derivative.`),
    F(FORM, 'Trigonometric', 'Integrals of Sine and Cosine', r`$\int\sin u\,du$`, r`$\int\sin u\,du = -\cos u + C,\qquad \int\cos u\,du = \sin u + C$`, [U],
        'The integrals of sine and cosine.',
        'The minus sign sits on the sine\'s integral (the opposite of their derivatives).'),
    F(FORM, 'Trigonometric', 'Integrals of Tangent, Cotangent and Cosecant', r`$\int\tan u\,du$`, r`$\int\tan u\,du = \ln|\sec u| + C,\quad \int\cot u\,du = \ln|\sin u| + C,\quad \int\csc u\,du = \ln|\csc u - \cot u| + C$`, [U],
        'Three trigonometric integrals that come out as logarithms.',
        r`$\ln|\sec u| = -\ln|\cos u|$: both forms are right.`),
    F(FORM, 'Trigonometric', 'Integrals Read off the Derivative Table', r`$\int\sec^2 u\,du$`, r`$\int\sec^2u\,du = \tan u,\ \int\csc^2u\,du = -\cot u,\ \int\sec u\tan u\,du = \sec u,\ \int\csc u\cot u\,du = -\csc u$`, [U],
        'Integrals read straight off the derivative table.',
        'Add + C to each.'),
    F(FORM, 'Inverse trigonometric', 'Integrals Giving Inverse Trigonometric Functions', r`$\int\frac{du}{a^2 + u^2}$`, r`$\int\frac{du}{\sqrt{a^2 - u^2}} = \sin^{-1}\frac{u}{a},\quad \int\frac{du}{a^2 + u^2} = \frac1a\tan^{-1}\frac{u}{a},\quad \int\frac{du}{u\sqrt{u^2 - a^2}} = \frac1a\sec^{-1}\frac{|u|}{a}$`, [U, AConst],
        'Three forms whose antiderivatives are inverse trigonometric functions.',
        r`Complete the square to reach them: $x^2 + 4x + 13 = (x + 2)^2 + 9$.`),
    F(FORM, 'Logarithmic', 'Integrals Giving Logarithms', r`$\int\frac{du}{u^2 - a^2}$`, r`$\int\frac{du}{u^2 - a^2} = \frac{1}{2a}\ln\left|\frac{u - a}{u + a}\right|,\qquad \int\frac{du}{\sqrt{u^2 \pm a^2}} = \ln\left|u + \sqrt{u^2 \pm a^2}\right|$`, [U, AConst],
        'Two forms whose antiderivatives are logarithms.',
        r`Compare $\frac{1}{a^2 + u^2}$ (inverse tangent) with $\frac{1}{u^2 - a^2}$ (logarithm): one sign apart.`),
    F(FORM, 'Hyperbolic', 'Integrals of Hyperbolic Functions', r`$\int\sinh u\,du$`, r`$\int\sinh u\,du = \cosh u + C,\qquad \int\cosh u\,du = \sinh u + C$`, [U],
        'The hyperbolic integrals: no minus signs.',
        r`$\int\text{sech}^2u\,du = \tanh u + C$.`),
    // Definite Integrals
    F(DEF, 'Properties', 'Properties of Definite Integrals', r`$\int_a^b = -\int_b^a$`, r`$\int_a^a f = 0,\quad \int_a^b f = -\int_b^a f,\quad \int_a^b f + \int_b^c f = \int_a^c f$`,
        [v(r`$f$`, 'an integrable function'), v(r`$a, b, c$`, 'limits')],
        'Swapping limits flips the sign; adjacent intervals add.',
        'Split at points where the integrand changes formula or sign.'),
    F(DEF, 'Properties', 'Even and Odd Functions on Symmetric Limits', r`$\int_{-a}^{a}f$`, r`$\int_{-a}^{a}f(x)\,dx = 2\int_0^a f(x)\,dx \ \text{(even)},\qquad = 0 \ \text{(odd)}$`,
        [v(r`$f$`, r`even: $f(-x) = f(x)$; odd: $f(-x) = -f(x)$`), v(r`$a$`, 'the half-width')],
        'Symmetry halves the work, or does all of it.',
        r`$\int_{-1}^{1}x^3\cos x\,dx = 0$ without computing anything.`),
    F(DEF, 'Evaluating', 'Average Value of a Function', r`$\bar f$`, r`$\bar f = \frac{1}{b - a}\int_a^b f(x)\,dx$`, [v(r`$f$`, 'the function'), AB],
        'The height of the rectangle with the same area over [a, b].',
        r`The average of $\sin x$ over $[0, \pi]$ is $\frac{2}{\pi}$, not $\frac12$.`),
    F(DEF, 'Evaluating', 'Derivative of an Integral', r`$\frac{d}{dx}\int_a^{g(x)}f(t)\,dt$`, r`$\frac{d}{dx}\int_a^{g(x)}f(t)\,dt = f(g(x))\,g'(x)$`,
        [v(r`$f$`, 'a continuous function'), v(r`$g(x)$`, 'the variable upper limit')],
        'The fundamental theorem, first part: differentiating an integral undoes it.',
        r`With both limits variable: $f(g(x))g'(x) - f(h(x))h'(x)$.`),
    F(DEF, 'Evaluating', "Wallis's Formula", r`$\int_0^{\pi/2}\sin^n x\,dx$`, r`$\int_0^{\pi/2}\sin^n x\,dx = \int_0^{\pi/2}\cos^n x\,dx = \frac{(n - 1)!!}{n!!}\cdot\begin{cases}\frac{\pi}{2} & n \text{ even}\\ 1 & n \text{ odd}\end{cases}$`,
        [v(r`$n$`, 'a positive whole number'), v(r`$n!!$`, r`double factorial: $n(n - 2)(n - 4)\cdots$`)],
        'Powers of sine or cosine from 0 to π/2 in one step.',
        r`$\int_0^{\pi/2}\sin^4x\,dx = \frac{3\cdot1}{4\cdot2}\cdot\frac{\pi}{2} = \frac{3\pi}{16}$.`),
    // Integration by Parts
    F(PARTS, null, 'Choosing u in Integration by Parts', r`$\text{LIATE}$`, r`$u:\ \text{Logarithmic} \to \text{Inverse trig} \to \text{Algebraic} \to \text{Trig} \to \text{Exponential}$`,
        [v(r`$u$`, 'the part to differentiate: the earliest in the list')],
        'A rule of thumb for which factor to differentiate.',
        r`For $\int x e^x dx$: $u = x$ (algebraic before exponential).`),
    F(PARTS, null, 'Integral of the Natural Logarithm', r`$\int\ln x\,dx$`, r`$\int\ln x\,dx = x\ln x - x + C$`, [v(r`$x$`, 'a positive variable')],
        'By parts with u = ln x and dv = dx.',
        r`$\int x\ln x\,dx = \frac{x^2}{2}\ln x - \frac{x^2}{4} + C$.`),
    F(PARTS, null, 'Exponential Times Sine or Cosine', r`$\int e^{ax}\sin bx\,dx$`, r`$\int e^{ax}\sin bx\,dx = \frac{e^{ax}(a\sin bx - b\cos bx)}{a^2 + b^2},\qquad \int e^{ax}\cos bx\,dx = \frac{e^{ax}(a\cos bx + b\sin bx)}{a^2 + b^2}$`,
        [v(r`$a, b$`, 'constants')],
        'Parts twice brings the integral back: solve for it.',
        'Add + C.'),
    F(PARTS, null, 'Tabular Integration', r`$\int x^n e^{ax}\,dx$`, r`$\int p(x)\,e^{ax}dx = e^{ax}\left(\frac{p}{a} - \frac{p'}{a^2} + \frac{p''}{a^3} - \cdots\right) + C$`,
        [v(r`$p(x)$`, 'a polynomial'), v(r`$a$`, 'a nonzero constant')],
        'Repeated parts in a table: differentiate the polynomial to zero, integrate the other factor, alternate signs.',
        r`$\int x^2e^x dx = e^x(x^2 - 2x + 2) + C$.`),
    // Trigonometric Integrals
    F(TRIG, 'Powers', 'Integrals of sin² and cos²', r`$\int\sin^2x\,dx$`, r`$\int\sin^2x\,dx = \frac{x}{2} - \frac{\sin 2x}{4} + C,\qquad \int\cos^2x\,dx = \frac{x}{2} + \frac{\sin 2x}{4} + C$`, [v(r`$x$`, 'the variable')],
        'Squared sine and cosine, by the half-angle identities.',
        r`Over a whole period each averages $\frac12$.`),
    F(TRIG, 'Powers', 'Powers of Sine and Cosine', r`$\int\sin^m x\cos^n x\,dx$`, r`$m \text{ or } n \text{ odd: save one factor, convert the rest with } \sin^2 + \cos^2 = 1;\quad \text{both even: } \sin^2x = \frac{1 - \cos 2x}{2},\ \cos^2x = \frac{1 + \cos 2x}{2}$`,
        [v(r`$m, n$`, 'whole-number powers')],
        'The strategy for any product of powers of sine and cosine.',
        r`$\int\sin^3x\,dx = -\cos x + \frac{\cos^3x}{3} + C$.`),
    F(TRIG, 'Powers', 'Reduction Formula for Sine', r`$\int\sin^n x\,dx$`, r`$\int\sin^nx\,dx = -\frac{\sin^{n-1}x\cos x}{n} + \frac{n - 1}{n}\int\sin^{n-2}x\,dx$`, [v(r`$n$`, 'a power, 2 or more')],
        'Lowers the power by two each time.',
        r`Cosine: $\frac{\cos^{n-1}x\sin x}{n} + \frac{n - 1}{n}\int\cos^{n-2}x\,dx$.`),
    F(TRIG, 'Secant', 'Integral of Secant Cubed', r`$\int\sec^3x\,dx$`, r`$\int\sec^3x\,dx = \frac12\left(\sec x\tan x + \ln|\sec x + \tan x|\right) + C$`, [v(r`$x$`, 'the variable')],
        'A board favourite, by parts with u = sec x, dv = sec² x dx.',
        r`It appears in the arc length of a parabola and in $\int\sqrt{1 + x^2}\,dx$.`),
    F(TRIG, 'Products', 'Products of Sines and Cosines', r`$\int\sin mx\cos nx\,dx$`, r`$\sin A\cos B = \frac12[\sin(A - B) + \sin(A + B)];\quad \int_0^{2\pi}\sin mx\sin nx\,dx = \begin{cases}0 & m \ne n\\ \pi & m = n\end{cases}$`,
        [v(r`$m, n$`, 'positive whole numbers')],
        'Products of sines and cosines with different frequencies, by product-to-sum.',
        'The same orthogonality is what makes Fourier series work.'),
    // Trigonometric Substitution
    F(TSUB, null, 'Trigonometric Substitutions', r`$u = a\sin\theta$`, r`$\sqrt{a^2 - u^2}:\ u = a\sin\theta;\quad \sqrt{a^2 + u^2}:\ u = a\tan\theta;\quad \sqrt{u^2 - a^2}:\ u = a\sec\theta$`,
        [v(r`$a$`, 'a positive constant'), v(r`$\theta$`, 'the new variable')],
        'Which substitution clears which square root.',
        'Draw the right triangle to turn the answer back into u.'),
    F(TSUB, null, 'Integral of the Square Root of a² − u²', r`$\int\sqrt{a^2 - u^2}\,du$`, r`$\int\sqrt{a^2 - u^2}\,du = \frac{u}{2}\sqrt{a^2 - u^2} + \frac{a^2}{2}\sin^{-1}\frac{u}{a} + C$`, [U, AConst],
        'The area under a circle, by u = a sin θ.',
        r`From $-a$ to $a$ it gives $\frac{\pi a^2}{2}$, a half disc.`),
    F(TSUB, null, 'Weierstrass Substitution', r`$t = \tan\frac{x}{2}$`, r`$t = \tan\frac{x}{2}:\quad \sin x = \frac{2t}{1 + t^2},\quad \cos x = \frac{1 - t^2}{1 + t^2},\quad dx = \frac{2\,dt}{1 + t^2}$`,
        [v(r`$t$`, 'the new variable')],
        'Turns any rational function of sin x and cos x into a rational function of t.',
        r`A last resort for $\int\frac{dx}{a + b\cos x}$ and similar.`),
    // Partial Fractions
    F(PF, 'Forms', 'Repeated and Quadratic Factors', r`$\frac{A}{x - a} + \frac{B}{(x - a)^2}$`, r`$(x - a)^k:\ \frac{A_1}{x - a} + \cdots + \frac{A_k}{(x - a)^k};\qquad x^2 + px + q:\ \frac{Ax + B}{x^2 + px + q}$`,
        [v(r`$(x - a)^k$`, 'a repeated linear factor'), v(r`$x^2 + px + q$`, 'a quadratic factor that does not factor')],
        'The terms for repeated linear factors and for irreducible quadratics.',
        'Divide first if the top\'s degree is not less than the bottom\'s.'),
    F(PF, 'Shortcuts', 'Cover-Up Rule', r`$A = \frac{P(a)}{Q'(a)}$`, r`$\frac{P(x)}{Q(x)} = \sum\frac{A_i}{x - a_i},\qquad A_i = \frac{P(a_i)}{Q'(a_i)}$`,
        [v(r`$a_i$`, r`the distinct roots of $Q$`), v(r`$P, Q$`, r`top and bottom, $\deg P < \deg Q$`)],
        "Heaviside's shortcut for distinct linear factors: cover the factor and put in its root.",
        r`$\frac{x + 5}{(x - 1)(x + 2)}$: $A = \frac{6}{3} = 2$ at $x = 1$, $B = \frac{3}{-3} = -1$ at $x = -2$.`),
    // Improper Integrals
    F(IMP, null, 'Improper Integral as a Limit', r`$\lim_{b \to \infty}\int_a^b$`, r`$\int_a^\infty f(x)\,dx = \lim_{b \to \infty}\int_a^b f(x)\,dx;\qquad \int_a^b f(x)\,dx = \lim_{t \to a^+}\int_t^b f(x)\,dx\ \text{(blow-up at } a)$`,
        [v(r`$f$`, 'the integrand'), v(r`$a, b$`, 'limits')],
        'An infinite limit, or an integrand that blows up, is handled by a limit.',
        'Look inside the interval for blow-ups too: ∫₋₁¹ dx/x² is not −2; it diverges.'),
    F(IMP, null, 'p-Integrals Near Zero', r`$\int_0^1\frac{dx}{x^p}$`, r`$\int_0^1\frac{dx}{x^p} = \frac{1}{1 - p}\ (p < 1),\ \text{diverges for } p \ge 1$`, [v(r`$p$`, 'the power')],
        'The other half of the p-test: near zero, small powers converge.',
        r`At infinity it is the reverse: $p > 1$ converges.`),
    F(IMP, null, 'Gamma Function', r`$\Gamma(n)$`, r`$\Gamma(n) = \int_0^\infty x^{n - 1}e^{-x}\,dx = (n - 1)!,\qquad \Gamma\left(\tfrac12\right) = \sqrt\pi$`,
        [v(r`$n$`, 'a positive number (a whole number for the factorial)')],
        'The factorial extended by an integral.',
        r`$\int_0^\infty x^n e^{-ax}dx = \frac{n!}{a^{n + 1}}$.`),
    F(IMP, null, 'Gaussian Integral', r`$\int e^{-x^2}dx$`, r`$\int_{-\infty}^{\infty}e^{-x^2}\,dx = \sqrt\pi,\qquad \int_0^\infty e^{-ax^2}\,dx = \frac12\sqrt{\frac{\pi}{a}}$`, [AConst],
        'The bell curve\'s integral: no elementary antiderivative, but an exact value.',
        'It is why the normal distribution has a √(2π) in it.'),
    // Area Between Curves
    F(AREA, null, 'Area Between Two Curves', r`$A = \int(y_{\text{top}} - y_{\text{bottom}})\,dx$`, r`$A = \int_a^b\left[f(x) - g(x)\right]dx = \int_c^d\left[x_{\text{right}} - x_{\text{left}}\right]dy$`,
        [v(r`$f, g$`, r`the upper and lower curves on $[a, b]$`), v(r`$c, d$`, 'limits in y, when slicing sideways')],
        'The area between curves: top minus bottom, or right minus left.',
        'Find where the curves cross; if they swap, split the integral there.'),
    F(AREA, null, 'Area of a Parabolic Segment', r`$\frac23 bh$`, r`$A = \frac23\,b\,h$`,
        [v(r`$b$`, 'the chord (base)'), v(r`$h$`, 'the height of the segment, square to the base')],
        "Archimedes: a parabolic segment is two-thirds of its enclosing rectangle.",
        r`So the area between $y = h\left(1 - \frac{4x^2}{b^2}\right)$ and the $x$-axis is $\frac23bh$.`),
    // Volumes of Revolution
    F(VOL, null, 'Disk Method', r`$V = \pi\int R^2\,dx$`, r`$V = \pi\int_a^b\left[R(x)\right]^2dx$`,
        [v(r`$R(x)$`, 'the distance from the axis to the curve'), AB],
        'A solid of revolution sliced into discs square to the axis.',
        'R is measured from the axis of revolution, not from the x-axis.'),
    F(VOL, null, 'Shell Method', r`$V = 2\pi\int xf(x)\,dx$`, r`$V = 2\pi\int_a^b(\text{radius})(\text{height})\,dx = 2\pi\int_a^b x\,f(x)\,dx$`,
        [v(r`$x$`, 'the shell\'s radius, from the axis'), v(r`$f(x)$`, 'its height'), AB],
        'A solid of revolution built from thin cylindrical shells parallel to the axis.',
        'Use shells when discs would need the curve solved for the other variable.'),
    F(VOL, null, 'Volume by Cross-Sections', r`$V = \int A(x)\,dx$`, r`$V = \int_a^b A(x)\,dx$`,
        [v(r`$A(x)$`, 'the area of the slice at x'), AB],
        'Any solid whose slices have a known area.',
        r`Square slices of side $s(x)$: $A = s^2$; semicircles of diameter $s$: $A = \frac{\pi s^2}{8}$.`),
    // Arc Length and Surface Area
    F(ARC, 'Arc length', 'Arc Length in Polar Coordinates', r`$L$`, r`$L = \int_\alpha^\beta\sqrt{r^2 + \left(\frac{dr}{d\theta}\right)^2}\,d\theta$`,
        [v(r`$r = f(\theta)$`, 'the curve'), v(r`$\alpha, \beta$`, 'the angles')],
        'The length of a polar curve.',
        r`The cardioid $r = a(1 + \cos\theta)$ has length $8a$.`),
    F(ARC, 'Surface area', 'Surface Area of a Parametric Curve', r`$S$`, r`$S = 2\pi\int_a^b y\sqrt{\left(\frac{dx}{dt}\right)^2 + \left(\frac{dy}{dt}\right)^2}\,dt$`,
        [v(r`$x(t), y(t)$`, r`the curve, with $y \ge 0$`), v(r`$a, b$`, 'parameter limits')],
        'The surface swept by a parametric curve turning about the x-axis.',
        'Radius y times the arc element: Pappus in the small.'),
    // Centroids and Moments of Inertia
    F(CENT, 'Centroids', 'Centroid of a Plane Area', r`$\bar x = \frac{\int x\,dA}{A}$`, r`$\bar x = \frac{1}{A}\int_a^b x f(x)\,dx,\qquad \bar y = \frac{1}{2A}\int_a^b\left[f(x)\right]^2dx$`,
        [v(r`$f(x)$`, r`the curve above the $x$-axis on $[a, b]$`), v(r`$A$`, 'the area')],
        'The balance point of the region under a curve.',
        'For a region between two curves: x̄ = (1/A)∫x(f − g)dx and ȳ = (1/2A)∫(f² − g²)dx.'),
    F(CENT, 'Centroids', 'Centroids of Common Shapes', r`$\frac{4r}{3\pi}$`, r`$\text{triangle } \tfrac{h}{3};\ \text{semicircle } \tfrac{4r}{3\pi};\ \text{semicircular arc } \tfrac{2r}{\pi};\ \text{hemisphere } \tfrac{3r}{8};\ \text{cone } \tfrac{h}{4}$`,
        [v(r`$h$`, 'height, measured from the base'), v(r`$r$`, 'radius, measured from the flat side')],
        'Where the centroid sits, measured from the base or the flat side.',
        'A quarter circle has its centroid at 4r/(3π) from both straight edges.'),
    F(CENT, 'Moments of inertia', 'Moments of Inertia of Common Areas', r`$\frac{bh^3}{12}$`, r`$\text{rectangle: } \bar I = \tfrac{bh^3}{12},\ I_{\text{base}} = \tfrac{bh^3}{3};\quad \text{triangle: } \bar I = \tfrac{bh^3}{36},\ I_{\text{base}} = \tfrac{bh^3}{12};\quad \text{circle: } \bar I = \tfrac{\pi r^4}{4}$`,
        [v(r`$b, h$`, 'base and height'), v(r`$r$`, 'radius'), v(r`$\bar I$`, 'about the centroidal axis parallel to the base')],
        'The second moments of area used in beam and gate problems.',
        r`The polar moment of a circle is twice: $\frac{\pi r^4}{2}$.`),
    F(CENT, 'Moments of inertia', 'Parallel Axis Theorem', r`$I = \bar I + Ad^2$`, r`$I = \bar I + Ad^2,\qquad k = \sqrt{\frac{I}{A}}$`,
        [v(r`$\bar I$`, 'moment about the centroidal axis'), v(r`$A$`, 'area'), v(r`$d$`, 'distance between the axes'), v(r`$k$`, 'radius of gyration')],
        'Moving a moment of inertia to a parallel axis, and the radius of gyration.',
        'Always add Ad², from the centroidal axis only; never subtract.'),
    // Work and Fluid Pressure
    F(WORK, 'Work', 'Work by a Variable Force', r`$W = \int F\,dx$`, r`$W = \int_a^b F(x)\,dx;\qquad \text{spring: } W = \tfrac12k\left(x_2^2 - x_1^2\right)$`,
        [v(r`$F(x)$`, 'the force at position x'), v(r`$k$`, r`spring constant (Hooke: $F = kx$)`), v(r`$x_1, x_2$`, 'stretches from the natural length')],
        'Work when the force changes along the way, and for a spring.',
        'Measure x from the spring\'s natural length, not from where it starts.'),
    F(WORK, 'Work', 'Work Pumping a Liquid', r`$W = \rho g\int A(y)D(y)\,dy$`, r`$W = \rho g\int_a^b A(y)\,D(y)\,dy$`,
        [v(r`$\rho g$`, r`weight density, $9.81$ kN/m³ for water`), v(r`$A(y)$`, 'area of the slice at height y'), v(r`$D(y)$`, 'distance that slice is lifted')],
        'Lifting a liquid out of a tank, slice by slice.',
        r`For a full tank emptied over the top: $W = \rho g V \times$ (distance its centroid rises).`),
    F(WORK, 'Fluid pressure', 'Fluid Force on a Submerged Plate', r`$F = \rho g\bar hA$`, r`$F = \rho g\int_a^b h(y)\,w(y)\,dy = \rho g\,\bar h\,A$`,
        [v(r`$h$`, 'depth below the surface'), v(r`$w(y)$`, 'width of the plate at that depth'), v(r`$\bar h$`, 'depth of the plate\'s centroid'), v(r`$A$`, 'plate area')],
        'The total force of a liquid on a vertical plate.',
        'Depth is measured down from the free surface, not from the bottom.'),
    F(WORK, 'Fluid pressure', 'Center of Pressure', r`$h_p$`, r`$h_p = \bar h + \frac{\bar I}{\bar hA}$`,
        [v(r`$h_p$`, 'depth of the centre of pressure'), v(r`$\bar h$`, 'depth of the centroid'), v(r`$\bar I$`, 'moment of inertia about the horizontal centroidal axis'), v(r`$A$`, 'area')],
        'Where the resultant fluid force acts: always below the centroid.',
        r`A rectangle with its top at the surface: $h_p = \frac23$ of its depth.`),
    // Multiple Integrals
    F(MULT, 'Double integrals', 'Double Integral as Iterated Integrals', r`$\iint_R f\,dA$`, r`$\iint_R f(x, y)\,dA = \int_a^b\int_{g_1(x)}^{g_2(x)}f(x, y)\,dy\,dx$`,
        [v(r`$R$`, 'the region'), v(r`$g_1, g_2$`, 'its lower and upper boundaries')],
        'Integrating over a region one variable at a time (Fubini).',
        'Draw the region; the inner limits may depend on the outer variable, never the reverse.'),
    F(MULT, 'Coordinates', 'Double Integrals in Polar Coordinates', r`$dA = r\,dr\,d\theta$`, r`$\iint_R f\,dA = \int_\alpha^\beta\int_{r_1(\theta)}^{r_2(\theta)}f(r\cos\theta, r\sin\theta)\,r\,dr\,d\theta$`,
        [v(r`$r, \theta$`, 'polar coordinates')],
        'Disc-shaped regions are easier in polar coordinates; the extra r is the area element.',
        'Forgetting the r in r dr dθ is the classic slip.'),
    F(MULT, 'Coordinates', 'Triple Integrals in Cylindrical and Spherical Coordinates', r`$dV$`, r`$\text{cylindrical: } dV = r\,dr\,d\theta\,dz;\qquad \text{spherical: } dV = \rho^2\sin\phi\,d\rho\,d\phi\,d\theta$`,
        [v(r`$r, \theta, z$`, 'cylindrical coordinates'), v(r`$\rho, \phi, \theta$`, 'spherical: distance, angle from the z-axis, angle around it')],
        'The volume elements for solids with round symmetry.',
        r`A sphere: $\int_0^{2\pi}\int_0^\pi\int_0^a\rho^2\sin\phi\,d\rho\,d\phi\,d\theta = \frac43\pi a^3$.`),
    F(MULT, 'Coordinates', 'Change of Variables (Jacobian)', r`$\left|\frac{\partial(x, y)}{\partial(u, v)}\right|$`, r`$dx\,dy = \left|\frac{\partial(x, y)}{\partial(u, v)}\right|du\,dv,\qquad \frac{\partial(x, y)}{\partial(u, v)} = x_uy_v - x_vy_u$`,
        [v(r`$x(u, v), y(u, v)$`, 'the change of variables')],
        'How area stretches under a change of variables.',
        'Polar coordinates are the case x = r cos θ, y = r sin θ, with Jacobian r.'),
];

module.exports = { subject: 'Mathematics', topic: 'Calculus 2', migration: '20261202000000_cards_calculus_2', file, revisions, retire, drafts };
