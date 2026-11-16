'use strict';

// Mathematics › Trigonometry formula cards (Library round, 2026-11-16): 9 live
// cards for 12 subtopics, so most of this file is new cards. See algebra.js for
// the format; tests/trigonometryFormulas.test.js checks every formula numerically.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const MEASURE = 'Angle Measure';
const FUNCS = 'Trigonometric Functions';
const FUND = 'Fundamental Identities';
const SUMS = 'Sum, Difference, Double and Half Angle';
const RIGHT = 'Right Triangles';
const ELEV = 'Angles of Elevation and Depression';
const LAWS = 'Sine and Cosine Laws';
const AREA = 'Area of Triangles';
const INV = 'Inverse Functions';
const EQS = 'Trigonometric Equations';
const HYP = 'Hyperbolic Functions';
const SPH = 'Spherical Trigonometry';

const file = [
    ['9205047c-af2e-4ffa-8227-0d707935ff79', LAWS, 'Sine law'],
    ['b95c7f87-f9fe-43df-85b7-16fe2ca4f559', LAWS, 'Cosine law'],
    ['01ea5fe1-72db-44c6-b97e-dc24eecd1fe3', AREA, null],
    ['bfd11f39-9ce1-4601-82c9-0faa5474d351', AREA, null],
    ['7d39091a-0dc6-45fc-8a97-081b5aa19a2d', FUND, 'Pythagorean identities'],
    ['311172f0-6c76-42cb-b5b2-6a778e0c9145', SUMS, 'Sum and difference'],
    ['ea2a1ce6-6f4f-43b5-8db1-e6d0c59d4d12', SUMS, 'Sum and difference'],
    ['fb83fe51-11ff-421d-acc3-e555c44ca587', SUMS, 'Double angle'],
    ['6e29e314-6f47-4bb9-8a35-ac858b1c9afd', SUMS, 'Double angle'],
];

const revisions = [
    { id: '311172f0-6c76-42cb-b5b2-6a778e0c9145', note: 'It had no symbol.', symbol: r`$\sin(A + B)$` },
    { id: 'ea2a1ce6-6f4f-43b5-8db1-e6d0c59d4d12', note: 'It had no symbol.', symbol: r`$\cos(A + B)$` },
    { id: 'fb83fe51-11ff-421d-acc3-e555c44ca587', note: 'It had no symbol.', symbol: r`$\sin 2\theta$` },
    { id: '6e29e314-6f47-4bb9-8a35-ac858b1c9afd', note: 'It had no symbol.', symbol: r`$\cos 2\theta$` },
    { id: '7d39091a-0dc6-45fc-8a97-081b5aa19a2d', note: 'It had no symbol.', symbol: r`$\sin^2\theta + \cos^2\theta$` },
    { id: '9205047c-af2e-4ffa-8227-0d707935ff79', note: 'It had no symbol.', symbol: r`$\frac{a}{\sin A}$` },
    { id: 'bfd11f39-9ce1-4601-82c9-0faa5474d351', note: "The name reviewers use; Hero's is the same formula.", name: "Heron's Formula" },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const ANGLE = v(r`$\theta$`, 'the angle');

const drafts = [
    // Angle Measure
    F(MEASURE, null, 'Degrees and Radians', r`$\pi\ \text{rad}$`, r`$\pi\ \text{rad} = 180^\circ$`, [v(r`$\pi\ \text{rad}$`, 'half a turn')],
        r`Converts between degrees and radians: multiply by $\frac{\pi}{180}$ or $\frac{180}{\pi}$.`,
        r`Calculus formulas ($s = r\theta$, derivatives) need radians; set the calculator to match.`),
    F(MEASURE, null, 'Other Angle Units', r`$360^\circ$`, r`$360^\circ = 2\pi\ \text{rad} = 400\ \text{grad} = 6400\ \text{mils}$`, [v(r`$\text{grad}$`, 'gradian, a hundredth of a right angle'), v(r`$\text{mil}$`, 'angular mil, a 6400th of a turn')],
        'One full turn in each unit.',
        r`A right angle is $90^\circ$, $100$ grad or $1600$ mils.`),
    F(MEASURE, 'Circles', 'Arc Length', r`$s$`, r`$s = r\theta$`, [v(r`$s$`, 'arc length'), v(r`$r$`, 'radius'), v(r`$\theta$`, 'central angle, in radians')],
        'The length of an arc from its radius and central angle.',
        r`With $\theta$ in degrees use $s = \frac{\pi r\theta}{180}$.`),
    F(MEASURE, 'Circles', 'Area of a Sector', r`$A$`, r`$A = \frac{1}{2}r^2\theta = \frac{1}{2}rs$`, [v(r`$r$`, 'radius'), v(r`$\theta$`, 'central angle, in radians'), v(r`$s$`, 'arc length')],
        'The area of a pie slice of a circle.',
        r`In degrees: $A = \frac{\pi r^2\theta}{360}$.`),
    F(MEASURE, 'Circles', 'Angular and Linear Speed', r`$v$`, r`$v = r\omega$`, [v(r`$v$`, 'linear speed at the rim'), v(r`$r$`, 'radius'), v(r`$\omega$`, 'angular speed, in rad/s')],
        'How fast a point on a turning circle moves along it.',
        r`From rpm: $\omega = \frac{2\pi N}{60}$ rad/s.`),
    // Trigonometric Functions
    F(FUNCS, 'Definitions', 'Right-Triangle Ratios', r`$\sin\theta$`, r`$\sin\theta = \frac{\text{opp}}{\text{hyp}},\ \cos\theta = \frac{\text{adj}}{\text{hyp}},\ \tan\theta = \frac{\text{opp}}{\text{adj}}$`,
        [v(r`$\text{opp}, \text{adj}$`, r`the legs opposite and next to $\theta$`), v(r`$\text{hyp}$`, 'the hypotenuse')],
        'The three basic functions of an acute angle in a right triangle.',
        'SOH-CAH-TOA. Opposite and adjacent depend on which angle you stand at.'),
    F(FUNCS, 'Definitions', 'Reciprocal Functions', r`$\csc\theta$`, r`$\csc\theta = \frac{1}{\sin\theta},\ \sec\theta = \frac{1}{\cos\theta},\ \cot\theta = \frac{1}{\tan\theta}$`, [ANGLE],
        'Cosecant, secant and cotangent as reciprocals of the basic three.',
        r`Calculators have no csc key: compute $\frac{1}{\sin\theta}$, not $\sin^{-1}\theta$.`),
    F(FUNCS, 'Signs and values', 'Signs of the Functions by Quadrant', r`$\text{ASTC}$`, r`$\text{QI: all};\ \text{QII: }\sin;\ \text{QIII: }\tan;\ \text{QIV: }\cos$`, [v(r`$\text{QI} \ldots \text{QIV}$`, 'the quadrant of the angle')],
        'Which functions are positive in each quadrant (the rest are negative).',
        r`"All Students Take Calculus". Their reciprocals share the sign.`),
    F(FUNCS, 'Signs and values', 'Reference Angle', r`$\theta_r$`, r`$\theta_r = 180^\circ - \theta\ (\text{QII}),\ \theta - 180^\circ\ (\text{QIII}),\ 360^\circ - \theta\ (\text{QIV})$`, [v(r`$\theta$`, 'the angle'), v(r`$\theta_r$`, 'its acute reference angle')],
        'The acute angle to the x-axis: same function value up to sign.',
        r`$\sin 150^\circ = \sin 30^\circ = \frac{1}{2}$; then fix the sign by quadrant.`),
    F(FUNCS, 'Signs and values', 'Special Angles', r`$\sin 30^\circ$`, r`$\sin 30^\circ = \tfrac{1}{2},\ \sin 45^\circ = \tfrac{\sqrt{2}}{2},\ \sin 60^\circ = \tfrac{\sqrt{3}}{2}$`, [v(r`$30^\circ, 45^\circ, 60^\circ$`, 'the special angles')],
        r`Exact values; the cosines run the other way ($\cos 60^\circ = \tfrac12$).`,
        r`$\tan 30^\circ = \tfrac{1}{\sqrt3}$, $\tan 45^\circ = 1$, $\tan 60^\circ = \sqrt3$.`),
    F(FUNCS, 'Identities of angles', 'Cofunction Identities', r`$\sin(90^\circ - \theta)$`, r`$\sin(90^\circ - \theta) = \cos\theta,\quad \tan(90^\circ - \theta) = \cot\theta$`, [ANGLE],
        'A function of an angle equals its cofunction of the complement.',
        r`Likewise $\sec(90^\circ - \theta) = \csc\theta$: the "co" swaps.`),
    F(FUNCS, 'Identities of angles', 'Even-Odd Identities', r`$\sin(-\theta)$`, r`$\sin(-\theta) = -\sin\theta,\ \cos(-\theta) = \cos\theta,\ \tan(-\theta) = -\tan\theta$`, [ANGLE],
        'Cosine (and secant) is even; the others are odd.',
        'A negative angle: pull the minus out, except from cosine and secant.'),
    F(FUNCS, 'Graphs', 'Amplitude, Period and Phase Shift', r`$y = A\sin(Bx + C)$`, r`$\text{amplitude} = |A|,\ \text{period} = \frac{2\pi}{|B|},\ \text{shift} = -\frac{C}{B}$`,
        [v(r`$A$`, 'the multiplier'), v(r`$B$`, r`the coefficient of $x$`), v(r`$C$`, 'the constant inside')],
        r`Reads the size, length and shift of $y = A\sin(Bx + C)$; the same for cosine.`,
        r`Tangent's period is $\frac{\pi}{|B|}$, not $\frac{2\pi}{|B|}$.`),
    // Fundamental Identities
    F(FUND, 'Quotient identities', 'Quotient Identities', r`$\tan\theta$`, r`$\tan\theta = \frac{\sin\theta}{\cos\theta},\quad \cot\theta = \frac{\cos\theta}{\sin\theta}$`, [ANGLE],
        'Tangent and cotangent from sine and cosine.',
        'Rewrite everything in sines and cosines when an identity will not budge.'),
    F(FUND, 'Pythagorean identities', 'Pythagorean Identity with Tangent', r`$1 + \tan^2\theta$`, r`$1 + \tan^2\theta = \sec^2\theta$`, [ANGLE],
        r`The Pythagorean identity divided by $\cos^2\theta$.`,
        r`Behind most integrals and simplifications with $\sec$.`),
    F(FUND, 'Pythagorean identities', 'Pythagorean Identity with Cotangent', r`$1 + \cot^2\theta$`, r`$1 + \cot^2\theta = \csc^2\theta$`, [ANGLE],
        r`The Pythagorean identity divided by $\sin^2\theta$.`,
        'Pair it with the tangent version: tan goes with sec, cot with csc.'),
    // Sum, Difference, Double and Half Angle
    F(SUMS, 'Sum and difference', 'Sine of a Difference', r`$\sin(A - B)$`, r`$\sin(A - B) = \sin A\cos B - \cos A\sin B$`, [v(r`$A, B$`, 'the angles')],
        'Sine of one angle minus another.', 'The sign between the terms matches the sign inside.'),
    F(SUMS, 'Sum and difference', 'Cosine of a Difference', r`$\cos(A - B)$`, r`$\cos(A - B) = \cos A\cos B + \sin A\sin B$`, [v(r`$A, B$`, 'the angles')],
        'Cosine of one angle minus another.', 'For cosine the sign flips: minus inside, plus between.'),
    F(SUMS, 'Sum and difference', 'Tangent of a Sum', r`$\tan(A + B)$`, r`$\tan(A + B) = \frac{\tan A + \tan B}{1 - \tan A\tan B}$`, [v(r`$A, B$`, 'the angles')],
        'Tangent of two angles added.', r`$\tan 75^\circ = \tan(45^\circ + 30^\circ) = 2 + \sqrt3$.`),
    F(SUMS, 'Sum and difference', 'Tangent of a Difference', r`$\tan(A - B)$`, r`$\tan(A - B) = \frac{\tan A - \tan B}{1 + \tan A\tan B}$`, [v(r`$A, B$`, 'the angles')],
        'Tangent of one angle minus another.', 'The angle between two lines of slopes $m_1$, $m_2$ uses this form.'),
    F(SUMS, 'Double angle', 'Double Angle for Tangent', r`$\tan 2\theta$`, r`$\tan 2\theta = \frac{2\tan\theta}{1 - \tan^2\theta}$`, [ANGLE],
        'Tangent of twice an angle.', r`Undefined when $\tan\theta = \pm 1$, where $2\theta$ is a right angle.`),
    F(SUMS, 'Half angle', 'Half Angle for Sine', r`$\sin\frac{\theta}{2}$`, r`$\sin\frac{\theta}{2} = \pm\sqrt{\frac{1 - \cos\theta}{2}}$`, [ANGLE],
        'Sine of half an angle; the sign follows the quadrant of the half angle.', r`Choose the sign from where $\frac{\theta}{2}$ lies, not $\theta$.`),
    F(SUMS, 'Half angle', 'Half Angle for Cosine', r`$\cos\frac{\theta}{2}$`, r`$\cos\frac{\theta}{2} = \pm\sqrt{\frac{1 + \cos\theta}{2}}$`, [ANGLE],
        'Cosine of half an angle; the sign follows the quadrant of the half angle.', r`$\cos 15^\circ = \sqrt{\frac{1 + \cos 30^\circ}{2}} \approx 0.9659$.`),
    F(SUMS, 'Half angle', 'Half Angle for Tangent', r`$\tan\frac{\theta}{2}$`, r`$\tan\frac{\theta}{2} = \frac{1 - \cos\theta}{\sin\theta} = \frac{\sin\theta}{1 + \cos\theta}$`, [ANGLE],
        'Tangent of half an angle, with no square root and no sign to choose.', 'These forms carry the sign themselves; prefer them to the root form.'),
    F(SUMS, 'Double angle', 'Power-Reducing Identities', r`$\sin^2\theta$`, r`$\sin^2\theta = \frac{1 - \cos 2\theta}{2},\quad \cos^2\theta = \frac{1 + \cos 2\theta}{2}$`, [ANGLE],
        'Squares of sine and cosine as first powers of a double angle.', r`The way to integrate $\sin^2 x$ and $\cos^2 x$.`),
    F(SUMS, 'Triple angle', 'Triple Angle for Sine', r`$\sin 3\theta$`, r`$\sin 3\theta = 3\sin\theta - 4\sin^3\theta$`, [ANGLE],
        'Sine of three times an angle.', 'Sine starts with 3, cosine starts with 4: the two are easy to swap by mistake.'),
    F(SUMS, 'Triple angle', 'Triple Angle for Cosine', r`$\cos 3\theta$`, r`$\cos 3\theta = 4\cos^3\theta - 3\cos\theta$`, [ANGLE],
        'Cosine of three times an angle.', 'Check at $0^\\circ$: $4 - 3 = 1$.'),
    F(SUMS, 'Product and sum', 'Product to Sum for Sine and Cosine', r`$\sin A\cos B$`, r`$\sin A\cos B = \frac{1}{2}\left[\sin(A + B) + \sin(A - B)\right]$`, [v(r`$A, B$`, 'the angles')],
        'Turns a product of sine and cosine into a sum.', 'Useful for integrals and for mixing frequencies in signals.'),
    F(SUMS, 'Product and sum', 'Product to Sum for Two Cosines or Two Sines', r`$\cos A\cos B$`, r`$2\cos A\cos B = \cos(A - B) + \cos(A + B),\ 2\sin A\sin B = \cos(A - B) - \cos(A + B)$`, [v(r`$A, B$`, 'the angles')],
        'Turns a product of two cosines or two sines into a sum.', 'Both start with the difference; sines subtract the sum, cosines add it.'),
    F(SUMS, 'Product and sum', 'Sum to Product for Sines', r`$\sin A + \sin B$`, r`$\sin A + \sin B = 2\sin\frac{A + B}{2}\cos\frac{A - B}{2}$`, [v(r`$A, B$`, 'the angles')],
        'Turns a sum of sines into a product.', 'Sums to products help solve equations: a product is zero when a factor is.'),
    F(SUMS, 'Product and sum', 'Sum to Product for Cosines', r`$\cos A + \cos B$`, r`$\cos A + \cos B = 2\cos\frac{A + B}{2}\cos\frac{A - B}{2}$`, [v(r`$A, B$`, 'the angles')],
        'Turns a sum of cosines into a product.', r`$\cos A - \cos B = -2\sin\frac{A + B}{2}\sin\frac{A - B}{2}$: mind the minus.`),
    // Right Triangles
    F(RIGHT, null, 'Pythagorean Theorem', r`$c^2$`, r`$c^2 = a^2 + b^2$`, [v(r`$a, b$`, 'the legs'), v(r`$c$`, 'the hypotenuse')],
        'The sides of any right triangle.', 'Triples to recognise: 3-4-5, 5-12-13, 8-15-17, 7-24-25.'),
    F(RIGHT, null, '30-60-90 Triangle', r`$1 : \sqrt3 : 2$`, r`$\text{short} : \text{long} : \text{hyp} = 1 : \sqrt{3} : 2$`, [v(r`$\text{short}$`, r`the leg opposite $30^\circ$`), v(r`$\text{long}$`, r`the leg opposite $60^\circ$`)],
        'Side ratios of the half-equilateral triangle.', 'The shortest side is opposite the smallest angle, and is half the hypotenuse.'),
    F(RIGHT, null, '45-45-90 Triangle', r`$1 : 1 : \sqrt2$`, r`$\text{leg} : \text{leg} : \text{hyp} = 1 : 1 : \sqrt{2}$`, [v(r`$\text{leg}$`, 'each equal leg'), v(r`$\text{hyp}$`, 'the hypotenuse')],
        'Side ratios of the isosceles right triangle.', r`A square's diagonal is $\sqrt2$ times its side.`),
    // Angles of Elevation and Depression
    F(ELEV, null, 'Height from an Angle of Elevation', r`$h$`, r`$h = d\tan\theta$`, [v(r`$h$`, "the height above the observer's eye"), v(r`$d$`, 'horizontal distance'), v(r`$\theta$`, 'angle of elevation')],
        'Height of an object from its distance and the angle up to its top.', "Add the observer's eye height if the item gives it."),
    F(ELEV, null, 'Height from Two Angles of Elevation', r`$h$`, r`$h = \frac{d}{\cot\alpha - \cot\beta}$`, [v(r`$d$`, 'the distance walked toward the object'), v(r`$\alpha$`, 'the angle from farther away'), v(r`$\beta$`, 'the angle from nearer')],
        'Height when the angle is measured twice along a straight line toward it.', r`$\alpha < \beta$: the angle grows as you walk closer.`),
    F(ELEV, null, 'Angles of Elevation and Depression', r`$\theta$`, r`$\theta_{\text{depression}} = \theta_{\text{elevation}}$`, [v(r`$\theta$`, 'the angle between the line of sight and the horizontal')],
        'Looking down from A to B makes the same angle as looking up from B to A.', 'Both are measured from the horizontal, never from the vertical.'),
    // Sine and Cosine Laws
    F(LAWS, 'Cosine law', 'Cosine Law for an Angle', r`$\cos C$`, r`$\cos C = \frac{a^2 + b^2 - c^2}{2ab}$`, [v(r`$a, b, c$`, 'the sides'), v(r`$C$`, r`the angle opposite $c$`)],
        'An angle of a triangle from its three sides.', 'A negative cosine means an obtuse angle: the inverse cosine handles it, the sine law would not.'),
    F(LAWS, 'Sine law', 'Law of Tangents', r`$\frac{a - b}{a + b}$`, r`$\frac{a - b}{a + b} = \frac{\tan\frac{A - B}{2}}{\tan\frac{A + B}{2}}$`, [v(r`$a, b$`, 'two sides'), v(r`$A, B$`, 'their opposite angles')],
        'Relates two sides to the half-sum and half-difference of their angles.', r`Given two sides and the included angle, $\frac{A + B}{2} = 90^\circ - \frac{C}{2}$.`),
    F(LAWS, 'Sine law', 'Ambiguous Case of the Sine Law', r`$h$`, r`$h = b\sin A$`, [v(r`$a, b$`, r`two given sides ($a$ opposite the given angle)`), v(r`$A$`, 'the given acute angle')],
        r`Given $a$, $b$, $A$: none if $a < h$, one if $a = h$ or $a \ge b$, two if $h < a < b$.`,
        'Two sides and a non-included angle can give two triangles: check before trusting the sine law.'),
    F(LAWS, null, 'Angle Sum of a Triangle', r`$A + B + C$`, r`$A + B + C = 180^\circ$`, [v(r`$A, B, C$`, 'the angles')],
        'The interior angles of a plane triangle.', 'Find the third angle first; it saves a law.'),
    // Area of Triangles
    F(AREA, null, 'Area of a Triangle from Base and Height', r`$A$`, r`$A = \frac{1}{2}bh$`, [v(r`$b$`, 'a side taken as base'), v(r`$h$`, 'the height to that side')],
        'Area from a base and its perpendicular height.', 'The height is perpendicular to the base, even if it falls outside the triangle.'),
    F(AREA, null, 'Area of a Triangle from Two Angles and a Side', r`$A$`, r`$A = \frac{a^2\sin B\sin C}{2\sin A}$`, [v(r`$a$`, 'the known side'), v(r`$A$`, r`the angle opposite $a$`), v(r`$B, C$`, 'the other two angles')],
        'Area when one side and the angles are known.', 'Get the third angle from the 180° sum first.'),
    F(AREA, 'Circles of a triangle', 'Radius of the Inscribed Circle', r`$r$`, r`$r = \frac{A}{s}$`, [v(r`$A$`, 'area of the triangle'), v(r`$s$`, 'semi-perimeter')],
        'The radius of the circle touching all three sides.', r`For a right triangle, $r = \frac{a + b - c}{2}$.`),
    F(AREA, 'Circles of a triangle', 'Radius of the Circumscribed Circle', r`$R$`, r`$R = \frac{abc}{4A} = \frac{a}{2\sin A}$`, [v(r`$a, b, c$`, 'the sides'), v(r`$A$`, r`the area, or the angle opposite $a$`)],
        'The radius of the circle through all three corners.', 'For a right triangle, $R$ is half the hypotenuse.'),
    // Inverse Functions
    F(INV, null, 'Ranges of the Inverse Functions', r`$\sin^{-1}x$`, r`$\sin^{-1}x \in \left[-\tfrac{\pi}{2}, \tfrac{\pi}{2}\right],\ \cos^{-1}x \in [0, \pi],\ \tan^{-1}x \in \left(-\tfrac{\pi}{2}, \tfrac{\pi}{2}\right)$`, [v(r`$x$`, 'the value')],
        'The principal values a calculator returns.', 'Other solutions come from the quadrant rules, not the calculator.'),
    F(INV, null, 'Inverse Sine Plus Inverse Cosine', r`$\sin^{-1}x + \cos^{-1}x$`, r`$\sin^{-1}x + \cos^{-1}x = \frac{\pi}{2}$`, [v(r`$x$`, r`a value in $[-1, 1]$`)],
        'Complementary inverse functions.', r`Likewise $\tan^{-1}x + \cot^{-1}x = \frac{\pi}{2}$.`),
    F(INV, null, 'Sum of Two Inverse Tangents', r`$\tan^{-1}x + \tan^{-1}y$`, r`$\tan^{-1}x + \tan^{-1}y = \tan^{-1}\frac{x + y}{1 - xy}$`, [v(r`$x, y$`, r`values with $xy < 1$`)],
        r`Adds two inverse tangents, for $xy < 1$.`, r`$\tan^{-1}\frac12 + \tan^{-1}\frac13 = \tan^{-1}1 = \frac{\pi}{4}$.`),
    F(INV, null, 'Inverse Tangents of Reciprocals', r`$\tan^{-1}x + \tan^{-1}\frac{1}{x}$`, r`$\tan^{-1}x + \tan^{-1}\frac{1}{x} = \frac{\pi}{2}$`, [v(r`$x$`, r`a positive value`)],
        r`For $x > 0$; for $x < 0$ the sum is $-\frac{\pi}{2}$.`, 'Spot it in multiple choice: no calculator needed.'),
    // Trigonometric Equations
    F(EQS, null, 'General Solution for Sine', r`$\theta$`, r`$\sin\theta = \sin\alpha \Rightarrow \theta = n\pi + (-1)^n\alpha$`, [v(r`$\alpha$`, 'one solution'), v(r`$n$`, 'any integer')],
        r`Every angle with the same sine as $\alpha$.`, r`Within $[0, 2\pi)$: $\alpha$ and $\pi - \alpha$.`),
    F(EQS, null, 'General Solution for Cosine', r`$\theta$`, r`$\cos\theta = \cos\alpha \Rightarrow \theta = 2n\pi \pm \alpha$`, [v(r`$\alpha$`, 'one solution'), v(r`$n$`, 'any integer')],
        r`Every angle with the same cosine as $\alpha$.`, r`Within $[0, 2\pi)$: $\alpha$ and $2\pi - \alpha$.`),
    F(EQS, null, 'General Solution for Tangent', r`$\theta$`, r`$\tan\theta = \tan\alpha \Rightarrow \theta = n\pi + \alpha$`, [v(r`$\alpha$`, 'one solution'), v(r`$n$`, 'any integer')],
        r`Every angle with the same tangent as $\alpha$.`, 'Tangent repeats every half turn, so solutions are 180° apart.'),
    // Hyperbolic Functions
    F(HYP, 'Definitions', 'Hyperbolic Sine and Cosine', r`$\sinh x$`, r`$\sinh x = \frac{e^x - e^{-x}}{2},\quad \cosh x = \frac{e^x + e^{-x}}{2}$`, [v(r`$x$`, 'any real number')],
        'The hyperbolic functions, built from exponentials.', r`$\cosh$ is the hanging-cable (catenary) curve; $\cosh 0 = 1$, $\sinh 0 = 0$.`),
    F(HYP, 'Definitions', 'Hyperbolic Tangent', r`$\tanh x$`, r`$\tanh x = \frac{\sinh x}{\cosh x} = \frac{e^x - e^{-x}}{e^x + e^{-x}}$`, [v(r`$x$`, 'any real number')],
        'The hyperbolic tangent, always between −1 and 1.', r`$\tanh x \to 1$ as $x \to \infty$.`),
    F(HYP, 'Identities', 'Hyperbolic Identity', r`$\cosh^2 x - \sinh^2 x$`, r`$\cosh^2 x - \sinh^2 x = 1$`, [v(r`$x$`, 'any real number')],
        "The hyperbolic counterpart of the Pythagorean identity: note the minus.", r`Osborn's rule: change the sign of each product of two sinh's.`),
    F(HYP, 'Identities', 'Hyperbolic Double Angle', r`$\sinh 2x$`, r`$\sinh 2x = 2\sinh x\cosh x,\quad \cosh 2x = \cosh^2 x + \sinh^2 x$`, [v(r`$x$`, 'any real number')],
        'Hyperbolic functions of a double argument.', 'Cosh 2x has a plus where cos 2θ has a minus.'),
    F(HYP, 'Inverses', 'Inverse Hyperbolic Sine', r`$\sinh^{-1}x$`, r`$\sinh^{-1}x = \ln\left(x + \sqrt{x^2 + 1}\right)$`, [v(r`$x$`, 'any real number')],
        'The inverse hyperbolic sine as a logarithm.', 'Defined for every real $x$.'),
    F(HYP, 'Inverses', 'Inverse Hyperbolic Cosine', r`$\cosh^{-1}x$`, r`$\cosh^{-1}x = \ln\left(x + \sqrt{x^2 - 1}\right)$`, [v(r`$x$`, r`a value with $x \ge 1$`)],
        r`The inverse hyperbolic cosine as a logarithm, for $x \ge 1$.`, 'Its value is never negative.'),
    // Spherical Trigonometry
    F(SPH, 'Laws', 'Spherical Law of Sines', r`$\frac{\sin a}{\sin A}$`, r`$\frac{\sin a}{\sin A} = \frac{\sin b}{\sin B} = \frac{\sin c}{\sin C}$`, [v(r`$a, b, c$`, 'the sides, as angles at the centre'), v(r`$A, B, C$`, 'the angles of the triangle')],
        'The sine law on a sphere: the sides are arcs, measured as angles.', 'Sides are angles here: never mix in a length.'),
    F(SPH, 'Laws', 'Spherical Law of Cosines for Sides', r`$\cos a$`, r`$\cos a = \cos b\cos c + \sin b\sin c\cos A$`, [v(r`$a, b, c$`, 'the sides, as angles'), v(r`$A$`, r`the angle opposite $a$`)],
        'A side of a spherical triangle from the other two and the angle between them.', 'Great-circle distance between two places uses this, with colatitudes as $b$ and $c$.'),
    F(SPH, 'Laws', 'Spherical Law of Cosines for Angles', r`$\cos A$`, r`$\cos A = -\cos B\cos C + \sin B\sin C\cos a$`, [v(r`$A, B, C$`, 'the angles'), v(r`$a$`, r`the side opposite $A$`)],
        'An angle of a spherical triangle from the other two and the side between them.', 'Note the leading minus sign; the sides version has none.'),
    F(SPH, 'Area', 'Spherical Excess', r`$E$`, r`$E = A + B + C - 180^\circ$`, [v(r`$A, B, C$`, 'the angles of the spherical triangle')],
        'How far the angles of a spherical triangle add past 180°.', r`$0^\circ < E < 540^\circ$; the bigger the triangle, the bigger the excess.`),
    F(SPH, 'Area', 'Area of a Spherical Triangle', r`$\text{Area}$`, r`$\text{Area} = \frac{\pi R^2 E}{180^\circ}$`, [v(r`$R$`, 'radius of the sphere'), v(r`$E$`, 'spherical excess, in degrees')],
        'The area of a triangle on a sphere from its excess.', r`With $E$ in radians, $\text{Area} = R^2E$.`),
    F(SPH, 'Right spherical triangles', "Napier's Rules", r`$\sin(\text{mid})$`, r`$\sin(\text{mid}) = \tan(\text{adj}_1)\tan(\text{adj}_2) = \cos(\text{opp}_1)\cos(\text{opp}_2)$`,
        [v(r`$\text{mid}$`, 'the middle part'), v(r`$\text{adj}$`, 'the two parts next to it'), v(r`$\text{opp}$`, 'the two parts opposite it')],
        'Every relation in a right spherical triangle, from five circular parts.', 'Parts: the two legs, and the complements of the other side and the two oblique angles.'),
];

module.exports = { subject: 'Mathematics', topic: 'Trigonometry', migration: '20261127000000_cards_trigonometry', file, revisions, retire, drafts };
