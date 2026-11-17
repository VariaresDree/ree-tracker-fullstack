'use strict';

// Mathematics › Complex Numbers formula cards (Library round, 2026-11-17):
// five live cards for 11 subtopics. New cards write j for the imaginary unit,
// as electrical work does. See algebra.js for the format;
// tests/complexNumbersFormulas.test.js checks every formula with complex
// arithmetic done from scratch. Names held by rejected cards ("Polar Form of a
// Complex Number", "Square of the Imaginary Unit", "Conjugate Root Theorem
// (Complex)") are not reused: the insert would skip them.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const RECT = 'Rectangular and Polar Forms';
const POWJ = 'Powers of j';
const ARITH = 'Complex Arithmetic';
const CONJ = 'Conjugate and Modulus';
const DEM = "De Moivre's Theorem";
const ROOTS = 'Roots of Complex Numbers';
const EULER = "Euler's Formula";
const LOG = 'Logarithms of Complex Numbers';
const TRIGH = 'Trigonometric and Hyperbolic Functions';
const EQS = 'Complex Equations';
const PHASOR = 'Phasor Applications';

const file = [
    ['8a6f42ab-504d-4633-8b77-91f4f56693ad', RECT, null],
    ['b9067989-58ed-42e2-97d6-dce9f7137c57', POWJ, null],
    ['c9012ea6-6e40-4959-b4f6-2ee33ceec0cc', ARITH, 'Polar form'],
    ['2092685b-4aaf-4d88-a0b2-1f27d88b7d1c', DEM, null],
    ['1f1601ec-9fe9-4113-838a-08fdf379c7c1', EULER, null],
];

const revisions = [];
const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const Z = v(r`$z = x + jy$`, r`a complex number, $j = \sqrt{-1}$`);
const POLAR = v(r`$r\angle\theta$`, r`modulus $r$ and argument $\theta$`);
const TWO = v(r`$z_1, z_2$`, 'two complex numbers');

const drafts = [
    // Rectangular and Polar Forms
    F(RECT, 'Conversion', 'Rectangular to Polar Form', r`$r\angle\theta$`, r`$z = x + jy = r\angle\theta = r(\cos\theta + j\sin\theta),\quad r = \sqrt{x^2 + y^2},\quad \tan\theta = \frac{y}{x}$`,
        [Z, POLAR],
        'Changing a complex number between rectangular and polar form.',
        r`The calculator's Pol and Rec keys do this; set the angle mode first.`),
    F(RECT, 'Conversion', 'Argument by Quadrant', r`$\theta$`, r`$\theta = \tan^{-1}\frac{y}{x}\ \text{(QI, QIV)},\qquad \theta = \tan^{-1}\frac{y}{x} + 180^\circ\ \text{(QII, QIII)}$`,
        [v(r`$x, y$`, 'the real and imaginary parts')],
        'Getting the argument in the right quadrant: the inverse tangent alone only reaches QI and QIV.',
        r`$-3 - j4$ is at $233.13^\circ$ (or $-126.87^\circ$), not $53.13^\circ$.`),
    F(RECT, 'Conversion', 'Exponential Form', r`$re^{j\theta}$`, r`$z = re^{j\theta},\qquad \theta \text{ in radians}$`, [POLAR],
        'Polar form written with Euler\'s formula: products and powers become exponent arithmetic.',
        r`$5\angle 30^\circ = 5e^{j\pi/6}$.`),
    // Powers of j
    F(POWJ, null, 'Powers of j', r`$j^n$`, r`$j^{4k} = 1,\quad j^{4k+1} = j,\quad j^{4k+2} = -1,\quad j^{4k+3} = -j$`,
        [v(r`$k$`, 'any integer'), v(r`$n$`, 'the power')],
        'Powers of j repeat every four: divide the power by 4 and use the remainder.',
        r`$j^{2027}$: $2027 = 4(506) + 3$, so $j^{2027} = -j$.`),
    F(POWJ, null, 'Reciprocal of j and Sums of Powers', r`$\frac1j = -j$`, r`$\frac1j = -j,\qquad j^n + j^{n+1} + j^{n+2} + j^{n+3} = 0$`,
        [v(r`$n$`, 'any integer')],
        'Dividing by j, and why four consecutive powers cancel.',
        'A long sum of powers of j: cancel full groups of four, then add what is left.'),
    // Complex Arithmetic
    F(ARITH, 'Rectangular form', 'Multiplication in Rectangular Form', r`$(a + jb)(c + jd)$`, r`$(a + jb)(c + jd) = (ac - bd) + j(ad + bc)$`,
        [v(r`$a, b, c, d$`, 'real numbers')],
        'Multiply out like binomials, with j² = −1.',
        'Addition and subtraction go part by part; multiplication does not.'),
    F(ARITH, 'Rectangular form', 'Division in Rectangular Form', r`$\frac{a + jb}{c + jd}$`, r`$\frac{a + jb}{c + jd} = \frac{(ac + bd) + j(bc - ad)}{c^2 + d^2}$`,
        [v(r`$a, b, c, d$`, r`real numbers, $c + jd \ne 0$`)],
        "Multiply top and bottom by the denominator's conjugate.",
        'Or convert to polar form and divide the moduli, subtract the angles.'),
    F(ARITH, 'Polar form', 'Division in Polar Form', r`$\frac{r_1\angle\theta_1}{r_2\angle\theta_2}$`, r`$\frac{r_1\angle\theta_1}{r_2\angle\theta_2} = \frac{r_1}{r_2}\angle(\theta_1 - \theta_2)$`,
        [v(r`$r_1\angle\theta_1, r_2\angle\theta_2$`, 'the two numbers in polar form')],
        'Divide the moduli and subtract the arguments.',
        'Add and subtract in rectangular form; multiply and divide in polar.'),
    // Conjugate and Modulus
    F(CONJ, null, 'Complex Conjugate', r`$\bar z$`, r`$\bar z = x - jy,\qquad z + \bar z = 2x,\quad z - \bar z = j2y,\quad z\bar z = x^2 + y^2$`, [Z],
        'The mirror image of z in the real axis.',
        r`In polar form the conjugate of $r\angle\theta$ is $r\angle{-\theta}$.`),
    F(CONJ, null, 'Modulus and Its Properties', r`$|z|$`, r`$|z| = \sqrt{x^2 + y^2} = \sqrt{z\bar z},\quad |z_1z_2| = |z_1||z_2|,\quad \left|\frac{z_1}{z_2}\right| = \frac{|z_1|}{|z_2|}$`,
        [Z, TWO],
        'The size of a complex number, and how it behaves in products and quotients.',
        r`$|z^n| = |z|^n$; but $|z_1 + z_2|$ is not $|z_1| + |z_2|$ in general.`),
    F(CONJ, null, 'Triangle Inequality and Distance', r`$|z_1 - z_2|$`, r`$|z_1 + z_2| \le |z_1| + |z_2|,\qquad d = |z_1 - z_2|$`, [TWO],
        'The modulus of a sum is at most the sum of the moduli; the distance between two points is the modulus of their difference.',
        'Equality holds only when the two point the same way.'),
    // De Moivre's Theorem
    F(DEM, null, 'Powers of 1 + j', r`$(1 + j)^n$`, r`$(1 + j)^n = 2^{n/2}\angle(45^\circ n),\qquad (1 + j)^2 = j2$`, [v(r`$n$`, 'a whole number')],
        'A board favourite, by De Moivre with 1 + j = √2∠45°.',
        r`$(1 + j)^8 = 2^4\angle360^\circ = 16$.`),
    F(DEM, null, 'Multiple Angles from De Moivre', r`$\cos 3\theta$`, r`$(\cos\theta + j\sin\theta)^n = \cos n\theta + j\sin n\theta;\quad \cos3\theta = 4\cos^3\theta - 3\cos\theta,\ \sin3\theta = 3\sin\theta - 4\sin^3\theta$`,
        [v(r`$\theta$`, 'an angle'), v(r`$n$`, 'a whole number')],
        'Expanding the left side and matching real and imaginary parts gives multiple-angle formulas.',
        'The triple-angle formulas of trigonometry come straight out of n = 3.'),
    // Roots of Complex Numbers
    F(ROOTS, null, 'nth Roots of a Complex Number', r`$z^{1/n}$`, r`$z^{1/n} = r^{1/n}\angle\frac{\theta + 360^\circ k}{n},\quad k = 0, 1, \ldots, n - 1$`,
        [POLAR, v(r`$n$`, 'the root'), v(r`$k$`, 'which root')],
        'A complex number has n distinct nth roots, evenly spaced on a circle.',
        r`Consecutive roots are $\frac{360^\circ}{n}$ apart; the principal root has $k = 0$.`),
    F(ROOTS, null, 'Roots of Unity', r`$\omega_k$`, r`$\omega_k = e^{j2\pi k/n},\quad \sum_{k=0}^{n-1}\omega_k = 0;\qquad \omega = -\tfrac12 + j\tfrac{\sqrt3}{2}:\ 1 + \omega + \omega^2 = 0,\ \omega^3 = 1$`,
        [v(r`$n$`, 'the order'), v(r`$\omega$`, 'a primitive cube root of unity')],
        'The nth roots of 1: the corners of a regular n-gon on the unit circle.',
        'The three-phase operator a = 1∠120° is a cube root of unity: 1 + a + a² = 0.'),
    // Euler's Formula
    F(EULER, null, 'Sine and Cosine from Exponentials', r`$\cos\theta = \frac{e^{j\theta} + e^{-j\theta}}{2}$`, r`$\cos\theta = \frac{e^{j\theta} + e^{-j\theta}}{2},\qquad \sin\theta = \frac{e^{j\theta} - e^{-j\theta}}{j2}$`,
        [v(r`$\theta$`, 'an angle, in radians')],
        'Euler\'s formula solved for sine and cosine.',
        'Compare cosh and sinh: the same shapes without the j.'),
    F(EULER, null, "Euler's Identity", r`$e^{j\pi} + 1 = 0$`, r`$e^{j\pi} + 1 = 0,\qquad e^{j\pi/2} = j,\qquad e^{j2\pi} = 1$`,
        [v(r`$e^{j\theta}$`, 'a point on the unit circle at angle θ')],
        'Euler\'s formula at π: five constants in one line.',
        r`$e^{j\theta}$ always has modulus 1.`),
    F(EULER, null, 'j to the Power j', r`$j^j$`, r`$j^j = e^{j\ln j} = e^{j(j\pi/2)} = e^{-\pi/2} \approx 0.2079$`,
        [v(r`$j$`, 'the imaginary unit')],
        'An imaginary number to an imaginary power can be real.',
        r`This is the principal value; others are $e^{-\pi/2 - 2\pi k}$.`),
    // Logarithms of Complex Numbers
    F(LOG, null, 'Natural Logarithm of a Complex Number', r`$\ln z$`, r`$\ln z = \ln r + j(\theta + 2\pi k),\qquad \text{principal: } k = 0,\ -\pi < \theta \le \pi$`,
        [POLAR, v(r`$k$`, 'any integer')],
        'The logarithm of a complex number: a real part from the modulus, an imaginary part from the argument.',
        r`$\theta$ in radians; $\ln(j) = j\frac{\pi}{2}$.`),
    F(LOG, null, 'Logarithm of a Negative Number', r`$\ln(-x)$`, r`$\ln(-x) = \ln x + j\pi,\qquad x > 0$`, [v(r`$x$`, 'a positive real number')],
        'Negative numbers have logarithms once complex values are allowed.',
        r`$\ln(-1) = j\pi$ (principal value).`),
    F(LOG, null, 'Complex Power', r`$z^w$`, r`$z^w = e^{w\ln z}$`, [v(r`$z, w$`, r`complex numbers, $z \ne 0$`)],
        'Any complex number to any complex power, through the logarithm.',
        'The answer has as many values as ln z does; the principal one uses the principal ln.'),
    // Trigonometric and Hyperbolic Functions
    F(TRIGH, null, 'Sine and Cosine of a Complex Number', r`$\sin(x + jy)$`, r`$\sin(x + jy) = \sin x\cosh y + j\cos x\sinh y,\qquad \cos(x + jy) = \cos x\cosh y - j\sin x\sinh y$`,
        [v(r`$x, y$`, 'the real and imaginary parts, in radians')],
        'Circular functions of a complex angle split into circular and hyperbolic parts.',
        r`$|\sin z|$ can exceed 1: $\sin(j2) = j\sinh 2 \approx j3.63$.`),
    F(TRIGH, null, 'Circular and Hyperbolic Functions Exchanged', r`$\cos jy = \cosh y$`, r`$\sin jy = j\sinh y,\quad \cos jy = \cosh y,\quad \sinh jx = j\sin x,\quad \cosh jx = \cos x$`,
        [v(r`$x, y$`, 'real numbers')],
        'A j inside turns circular functions into hyperbolic ones and back.',
        'Osborn\'s rule follows from these.'),
    F(TRIGH, null, 'Hyperbolic Functions of a Complex Number', r`$\sinh(x + jy)$`, r`$\sinh(x + jy) = \sinh x\cos y + j\cosh x\sin y,\qquad \cosh(x + jy) = \cosh x\cos y + j\sinh x\sin y$`,
        [v(r`$x, y$`, 'the real and imaginary parts')],
        'Hyperbolic functions of a complex argument, as used for long transmission lines.',
        'Note the plus sign in cosh, where cos has a minus.'),
    // Complex Equations
    F(EQS, null, 'Equality of Complex Numbers', r`$a + jb = c + jd$`, r`$a + jb = c + jd \iff a = c \text{ and } b = d$`, [v(r`$a, b, c, d$`, 'real numbers')],
        'One complex equation is two real equations: real parts equal, imaginary parts equal.',
        'Use it to find two unknowns from one complex equation.'),
    F(EQS, null, 'Quadratic with Complex Roots', r`$x = \frac{-b \pm j\sqrt{4ac - b^2}}{2a}$`, r`$ax^2 + bx + c = 0,\ b^2 < 4ac:\quad x = \frac{-b \pm j\sqrt{4ac - b^2}}{2a}$`,
        [v(r`$a, b, c$`, 'real coefficients')],
        'A negative discriminant gives a pair of conjugate complex roots.',
        r`Their sum is $-\frac{b}{a}$ and their product $\frac{c}{a}$, as for real roots.`),
    F(EQS, null, 'Complex Roots in Conjugate Pairs', r`$a \pm jb$`, r`$P \text{ with real coefficients: } P(a + jb) = 0 \implies P(a - jb) = 0$`,
        [v(r`$P$`, 'a polynomial with real coefficients'), v(r`$a + jb$`, 'a complex root')],
        'Complex roots of a real polynomial come in conjugate pairs.',
        'So a real cubic has one or three real roots, never two.'),
    F(EQS, null, 'Loci in the Complex Plane', r`$|z - z_0| = r$`, r`$|z - z_0| = r\ \text{(circle)},\qquad |z - a| = |z - b|\ \text{(perpendicular bisector of } ab)$`,
        [v(r`$z_0$`, 'a centre'), v(r`$r$`, 'a radius'), v(r`$a, b$`, 'two fixed points')],
        'Equations in z that describe curves.',
        'Write z = x + jy and square the moduli to get the Cartesian equation.'),
    // Phasor Applications
    F(PHASOR, 'Phasors', 'Phasor of a Sinusoid', r`$\mathbf{V}$`, r`$v(t) = V_m\cos(\omega t + \phi)\ \leftrightarrow\ \mathbf{V} = \frac{V_m}{\sqrt2}\angle\phi\ \text{(rms)}$`,
        [v(r`$V_m$`, 'peak value'), v(r`$\omega$`, 'angular frequency'), v(r`$\phi$`, 'phase angle')],
        'A sinusoid of one frequency as a single complex number.',
        'Check whether a problem uses peak or rms phasors; power formulas assume rms.'),
    F(PHASOR, 'Impedance', 'Impedance of R, L and C', r`$Z_L = j\omega L$`, r`$Z_R = R,\qquad Z_L = j\omega L = jX_L,\qquad Z_C = \frac{1}{j\omega C} = -jX_C$`,
        [v(r`$\omega$`, r`$2\pi f$`), v(r`$X_L, X_C$`, r`reactances $\omega L$ and $\frac{1}{\omega C}$`)],
        'Resistors, inductors and capacitors as complex numbers.',
        r`$\frac1j = -j$ is why the capacitor's reactance is negative.`),
    F(PHASOR, 'Impedance', 'Series and Parallel Impedances', r`$Z_1 \parallel Z_2$`, r`$Z_{\text{series}} = Z_1 + Z_2,\qquad Z_1 \parallel Z_2 = \frac{Z_1Z_2}{Z_1 + Z_2},\qquad Y = \frac1Z = G + jB$`,
        [v(r`$Z_1, Z_2$`, 'impedances'), v(r`$Y$`, 'admittance'), v(r`$G, B$`, 'conductance and susceptance')],
        'Combining impedances, exactly as resistors combine, with complex arithmetic.',
        'For many parallel branches, add admittances instead.'),
    F(PHASOR, 'Power', 'Complex Power in AC Circuits',r`$\mathbf{S} = \mathbf{V}\mathbf{I}^*$`, r`$\mathbf{S} = \mathbf{V}\mathbf{I}^* = P + jQ,\qquad |\mathbf{S}| = VI,\qquad \text{pf} = \cos\theta = \frac{P}{|\mathbf{S}|}$`,
        [v(r`$\mathbf{V}, \mathbf{I}$`, 'rms voltage and current phasors'), v(r`$P, Q$`, 'real and reactive power')],
        'Real and reactive power in one complex number.',
        'The current is conjugated: V I without the star gives the wrong angle.'),
];

module.exports = { subject: 'Mathematics', topic: 'Complex Numbers', migration: '20261203000000_cards_complex_numbers', file, revisions, retire, drafts };
