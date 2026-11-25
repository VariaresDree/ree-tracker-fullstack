// Library › Lessons › Mathematics › Trigonometry (2026-11-16; every subtopic
// in the module format 2026-11-26, with figures, examples a step at a time and
// checks; every number re-worked by trigonometryLesson.test.js. Coverage
// cross-checked against two review centers' trigonometry handouts; the text,
// problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (radians) => (radians * 180) / Math.PI;

// The equation of the Trigonometric Equations section, x in degrees.
export const eq = (x) => 2 * Math.sin(rad(x)) ** 2 - Math.sin(rad(x)) - 1;

export default {
  topic: 'Trigonometry',
  subject: 'Mathematics',
  overview: r`Trigonometry turns angles into lengths and back. On the board it carries whole items (heights and distances, triangle solving, identities, equations, spherical triangles) and it is the toolkit for AC circuits, where every phasor is a right triangle. Know the special angles and the identity families by heart, set the calculator to the right mode, and draw the triangle before you compute.`,
  sources: [
    'Schaum’s Outline of Trigonometry (Moyer and Ayres)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Angle Measure',
      inShort: r`Degrees, radians, grads and mils, and the circle formulas that need radians: arc length, sector area and angular speed.`,
      body: [
        r`An angle is a rotation from an initial side to a terminal side: **counter-clockwise is positive**, clockwise negative. One full turn is

| Unit | One revolution | Common use |
|---|---|---|
| degrees | $360^\circ$ | everyday, surveying |
| radians | $2\pi$ rad | calculus, circular motion |
| grads (gradians) | 400 grad | some surveying |
| mils | 6400 mils | artillery, gunnery |

Convert by the ratio of the full turns. Two angles are **complementary** when they add to $90^\circ$, **supplementary** to $180^\circ$, **explementary** to $360^\circ$; **coterminal** angles differ by whole turns and end on the same side.

A **radian** is the angle whose arc equals the radius, which is why the circle formulas need it:`,
        { figure: 'sector', caption: 'A sector: with θ in radians, the arc is s = rθ and the area is half of r² θ.' },
        r`Arc $s = r\theta$, sector area $A = \frac12 r^2\theta$, and a wheel turning at $N$ rpm has $\omega = \frac{2\pi N}{60}$ rad/s and rim speed $v = r\omega$.`,
      ],
      keyIdeas: [
        r`$\pi$ rad $= 180^\circ$; one turn is $360^\circ = 2\pi$ rad $= 400$ grad $= 6400$ mils.`,
        r`With $\theta$ in radians: arc $s = r\theta$, sector $A = \frac12 r^2\theta$.`,
        r`Rim speed $v = r\omega$, with $\omega = \frac{2\pi N}{60}$ rad/s from $N$ rpm.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A belt on a pulley',
          problem: r`A pulley of radius 0.4 m turns at 300 rpm. How fast does its belt move?`,
          steps: [
            r`$\omega = \frac{2\pi(300)}{60} = 10\pi$ rad/s.`,
            r`$v = r\omega = 0.4 \times 10\pi = 4\pi = 12.57$ m/s.`,
          ],
          answer: r`About 12.57 m/s.`,
        },
        {
          level: 'board',
          title: 'Units, a complement and a quadrant',
          problem: r`(a) Convert 800 mils to degrees and 250 grad to radians. (b) An angle's supplement is 5 times its complement; find the angle. (c) In which quadrant does $-1000^\circ$ end?`,
          steps: [
            r`(a) $800 \times \frac{360}{6400} = 45^\circ$; $250 \times \frac{2\pi}{400} = 1.25\pi = 3.927$ rad.`,
            r`(b) $180 - x = 5(90 - x)$, so $4x = 270$ and $x = 67.5^\circ$.`,
            r`(c) Add whole turns: $-1000 + 3(360) = 80^\circ$, in QI.`,
          ],
          answer: r`(a) $45^\circ$ and 3.927 rad; (b) $67.5^\circ$; (c) QI.`,
        },
      ],
      traps: [
        r`$s = r\theta$ with $\theta$ in degrees is wrong by a factor of $\frac{\pi}{180}$.`,
        r`A negative angle turns clockwise: $-1000^\circ$ is not in the quadrant of $1000^\circ$.`,
      ],
      check: [
        { q: r`A sector has radius 6 and angle 2 rad. What is its area?`, a: r`$\frac12(36)(2) = 36$.` },
        { q: r`What is the explement of $135^\circ$?`, a: r`$225^\circ$.` },
      ],
    },
    {
      name: 'Trigonometric Functions',
      inShort: r`The six functions, their values at the special angles, their signs in each quadrant, and the graphs of sine and cosine.`,
      body: [
        r`In a right triangle, SOH-CAH-TOA: $\sin\theta = \frac{\text{opp}}{\text{hyp}}$, $\cos\theta = \frac{\text{adj}}{\text{hyp}}$, $\tan\theta = \frac{\text{opp}}{\text{adj}}$, and $\csc$, $\sec$, $\cot$ are their reciprocals. For any angle, put a radius of 1 at the angle on the **unit circle**: its tip is $(\cos\theta, \sin\theta)$.`,
        {
          type: 'phasor',
          alt: 'A unit radius drawn at 150 degrees from the positive x axis. Its horizontal part, cos theta, runs left from the origin, about minus 0.87; its vertical part, sin theta, rises 0.5 to the tip.',
          caption: 'On the unit circle the tip of the radius is (cos θ, sin θ): at 150°, cos θ ≈ −0.87 and sin θ = 0.5.',
          vectors: [
            { name: 'c', mag: Math.cos(rad(30)), angle: 180, label: 'cos θ', colour: 1, labelAt: 'mid' },
            { name: 's', mag: 0.5, angle: 90, from: 'c', label: 'sin θ', colour: 2, labelAt: 'mid' },
            { mag: 1, angle: 150, label: 'r = 1', labelAt: 'mid' },
          ],
          arcs: [{ from: 0, to: 150, label: 'θ', r: 26 }],
        },
        r`| $\theta$ | $0^\circ$ | $30^\circ$ | $45^\circ$ | $60^\circ$ | $90^\circ$ |
|---|---|---|---|---|---|
| $\sin\theta$ | 0 | $\frac12$ | $\frac{\sqrt2}{2}$ | $\frac{\sqrt3}{2}$ | 1 |
| $\cos\theta$ | 1 | $\frac{\sqrt3}{2}$ | $\frac{\sqrt2}{2}$ | $\frac12$ | 0 |
| $\tan\theta$ | 0 | $\frac{\sqrt3}{3}$ | 1 | $\sqrt3$ | undefined |

The signs follow the tip: **A**ll positive in QI, **S**ine (and cosecant) in QII, **T**angent (and cotangent) in QIII, **C**osine (and secant) in QIV. Any angle reduces to its acute **reference angle**, with the sign set by the quadrant. Older tables also use $\text{vers}\,\theta = 1 - \cos\theta$ and $\text{covers}\,\theta = 1 - \sin\theta$ (and $1 + \cos\theta$, $1 + \sin\theta$, the vercosine and covercosine).

Sine and cosine repeat every $360^\circ$; cosine is sine shifted $90^\circ$ left:`,
        {
          type: 'plot',
          alt: 'Sine and cosine from 0 to 360 degrees. Sine starts at 0, peaks at 1 at 90 degrees, crosses 0 at 180, bottoms at minus 1 at 270. Cosine starts at 1 and crosses 0 at 90 and 270.',
          caption: 'y = sin x and y = cos x over one period, 0° to 360°.',
          x: [0, 360],
          y: [-1.5, 2],
          xLabel: 'x, degrees',
          yLabel: 'y',
          series: [
            { f: (x) => Math.sin(rad(x)), label: 'sin x', colour: colourOf(0) },
            { f: (x) => Math.cos(rad(x)), label: 'cos x', dashed: true, colour: colourOf(1) },
          ],
        },
        r`For $y = A\sin(Bx + C)$ the amplitude is $|A|$, the period $\frac{360^\circ}{|B|}$ (or $\frac{2\pi}{|B|}$), and the graph shifts by $-\frac{C}{B}$.`,
      ],
      keyIdeas: [
        r`SOH-CAH-TOA; $\csc$, $\sec$, $\cot$ are the reciprocals of $\sin$, $\cos$, $\tan$.`,
        r`Signs by quadrant: All, Sine, Tangent, Cosine (QI to QIV) are positive.`,
        r`Any angle reduces to its acute reference angle; then fix the sign by quadrant.`,
        r`$y = A\sin(Bx + C)$: amplitude $|A|$, period $\frac{2\pi}{|B|}$, shift $-\frac{C}{B}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'From the tangent to the others',
          problem: r`$\tan\theta = -\frac34$ and $\theta$ is in QII. Find $\sin\theta$ and $\cos\theta$.`,
          steps: [
            r`The reference triangle is 3-4-5.`,
            r`In QII sine is positive and cosine negative.`,
          ],
          answer: r`$\sin\theta = \frac35$, $\cos\theta = -\frac45$.`,
        },
        {
          level: 'board',
          title: 'Signs, versines and a graph',
          problem: r`(a) $\cos A = -\frac{5}{13}$ with $A$ in QIII. Find $\sin A$ and $\cot A$. (b) $\sin\theta = 0.6$ with $\theta$ acute. Find $\text{vers}\,\theta$ and $\text{covers}\,\theta$. (c) Give the amplitude, period and shift of $y = 3\sin(2x - 60^\circ)$.`,
          steps: [
            r`(a) A 5-12-13 triangle; in QIII sine is negative: $\sin A = -\frac{12}{13}$, and $\cot A = \frac{\cos A}{\sin A} = \frac{5}{12}$.`,
            r`(b) $\cos\theta = 0.8$, so $\text{vers}\,\theta = 1 - 0.8 = 0.2$ and $\text{covers}\,\theta = 1 - 0.6 = 0.4$.`,
            r`(c) Amplitude 3; period $\frac{360^\circ}{2} = 180^\circ$; $2x - 60^\circ = 0$ at $x = 30^\circ$, a shift of $30^\circ$ to the right.`,
          ],
          answer: r`(a) $-\frac{12}{13}$ and $\frac{5}{12}$; (b) 0.2 and 0.4; (c) 3, $180^\circ$, $30^\circ$ right.`,
        },
      ],
      traps: [
        r`$\sin^{-1}x$ is the inverse function, not $\frac{1}{\sin x}$; that is $\csc x$.`,
        r`Degree mode or radian mode: the most common lost point in the whole topic.`,
        r`The cotangent keeps the sign of the tangent: both are positive in QIII.`,
      ],
      check: [
        { q: r`In which quadrant are $\sec A > 0$ and $\csc A < 0$?`, a: r`QIV: cosine positive, sine negative.` },
        { q: r`What is $\cos 210^\circ$?`, a: r`Reference angle $30^\circ$ in QIII: $-\frac{\sqrt3}{2}$.` },
      ],
    },
    {
      name: 'Fundamental Identities',
      inShort: r`The reciprocal, quotient and Pythagorean identities that every proof and simplification leans on.`,
      body: [
        r`Eight identities, in families, carry nearly every simplification:

| Family | Identities |
|---|---|
| Reciprocal | $\csc\theta = \frac{1}{\sin\theta}$, $\sec\theta = \frac{1}{\cos\theta}$, $\cot\theta = \frac{1}{\tan\theta}$ |
| Quotient | $\tan\theta = \frac{\sin\theta}{\cos\theta}$, $\cot\theta = \frac{\cos\theta}{\sin\theta}$ |
| Pythagorean | $\sin^2\theta + \cos^2\theta = 1$, $1 + \tan^2\theta = \sec^2\theta$, $1 + \cot^2\theta = \csc^2\theta$ |
| Cofunction | $\sin\theta = \cos(90^\circ - \theta)$, $\tan\theta = \cot(90^\circ - \theta)$, $\sec\theta = \csc(90^\circ - \theta)$ |
| Even and odd | $\cos(-\theta) = \cos\theta$ and $\sec(-\theta) = \sec\theta$ (even); the other four are odd: $\sin(-\theta) = -\sin\theta$ |
| Periodic | $\sin$, $\cos$, $\sec$, $\csc$ repeat every $360^\circ$; $\tan$ and $\cot$ every $180^\circ$ |

The other two Pythagorean identities come from the first by dividing it through by $\cos^2\theta$ or $\sin^2\theta$. When an expression won't yield, rewrite everything in sines and cosines and combine the fractions.`,
      ],
      keyIdeas: [
        r`$\tan\theta = \frac{\sin\theta}{\cos\theta}$, $\cot\theta = \frac{\cos\theta}{\sin\theta}$.`,
        r`$\sin^2\theta + \cos^2\theta = 1$, $1 + \tan^2\theta = \sec^2\theta$, $1 + \cot^2\theta = \csc^2\theta$.`,
        r`When stuck, rewrite everything in sines and cosines.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two Pythagorean identities',
          problem: r`Simplify $(1 - \cos^2\theta)(1 + \cot^2\theta)$.`,
          steps: [
            r`$1 - \cos^2\theta = \sin^2\theta$ and $1 + \cot^2\theta = \csc^2\theta = \frac{1}{\sin^2\theta}$.`,
            r`The product is $\sin^2\theta \cdot \frac{1}{\sin^2\theta} = 1$.`,
          ],
          answer: r`$1$.`,
        },
        {
          level: 'board',
          title: 'Into sines and cosines',
          problem: r`(a) Simplify $\dfrac{\sec\theta - \cos\theta}{\tan\theta}$. (b) $\tan\theta = 2$ with $\theta$ in QI: find $\sec\theta$ and $\sin\theta$.`,
          steps: [
            r`(a) Numerator: $\frac{1}{\cos\theta} - \cos\theta = \frac{1 - \cos^2\theta}{\cos\theta} = \frac{\sin^2\theta}{\cos\theta}$.`,
            r`Divide by $\frac{\sin\theta}{\cos\theta}$: $\frac{\sin^2\theta}{\cos\theta} \cdot \frac{\cos\theta}{\sin\theta} = \sin\theta$.`,
            r`(b) $\sec^2\theta = 1 + 4 = 5$, so $\sec\theta = \sqrt5 = 2.236$ (positive in QI), $\cos\theta = \frac{1}{\sqrt5}$ and $\sin\theta = \tan\theta\cos\theta = \frac{2}{\sqrt5} = 0.894$.`,
          ],
          answer: r`(a) $\sin\theta$; (b) $\sqrt5 \approx 2.236$ and $\frac{2}{\sqrt5} \approx 0.894$.`,
        },
      ],
      traps: [
        r`$\sin^2\theta$ means $(\sin\theta)^2$, not $\sin(\theta^2)$.`,
        r`A square root brings back a sign: choose it by the quadrant.`,
      ],
      check: [
        { q: r`Write $\cos 70^\circ$ as a sine.`, a: r`$\sin 20^\circ$ (cofunctions).` },
        { q: r`Which of the six functions are even?`, a: r`Cosine and secant.` },
      ],
    },
    {
      name: 'Sum, Difference, Double and Half Angle',
      inShort: r`Functions of $A \pm B$, $2\theta$, $\frac{\theta}{2}$ and $3\theta$, and the product-sum conversions.`,
      body: [
        r`| Formula | Sine | Cosine | Tangent |
|---|---|---|---|
| sum, difference | $\sin A\cos B \pm \cos A\sin B$ | $\cos A\cos B \mp \sin A\sin B$ | $\frac{\tan A \pm \tan B}{1 \mp \tan A\tan B}$ |
| double angle | $2\sin\theta\cos\theta$ | $\cos^2\theta - \sin^2\theta = 1 - 2\sin^2\theta = 2\cos^2\theta - 1$ | $\frac{2\tan\theta}{1 - \tan^2\theta}$ |
| triple angle | $3\sin\theta - 4\sin^3\theta$ | $4\cos^3\theta - 3\cos\theta$ | $\frac{3\tan\theta - \tan^3\theta}{1 - 3\tan^2\theta}$ |
| half angle | $\pm\sqrt{\frac{1 - \cos\theta}{2}}$ | $\pm\sqrt{\frac{1 + \cos\theta}{2}}$ | $\frac{1 - \cos\theta}{\sin\theta} = \frac{\sin\theta}{1 + \cos\theta}$ |

The half-angle sign is set by the quadrant of $\frac{\theta}{2}$, not of $\theta$; the tangent forms on the right need no sign. Products turn into sums (and back), useful in integration and in AC power:
$$2\sin A\cos B = \sin(A + B) + \sin(A - B), \quad 2\cos A\cos B = \cos(A + B) + \cos(A - B),$$
$$2\sin A\sin B = \cos(A - B) - \cos(A + B).$$`,
      ],
      keyIdeas: [
        r`$\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B$; $\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B$.`,
        r`$\sin 2\theta = 2\sin\theta\cos\theta$; $\cos 2\theta = 1 - 2\sin^2\theta = 2\cos^2\theta - 1$.`,
        r`Half angles: $\sin\frac{\theta}{2} = \pm\sqrt{\frac{1 - \cos\theta}{2}}$, the sign set by where $\frac{\theta}{2}$ lies.`,
        r`Products to sums and back: $2\sin A\cos B = \sin(A + B) + \sin(A - B)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An exact value',
          problem: r`Find $\sin 75^\circ$ exactly.`,
          steps: [
            r`$\sin(45^\circ + 30^\circ) = \frac{\sqrt2}{2}\cdot\frac{\sqrt3}{2} + \frac{\sqrt2}{2}\cdot\frac12$.`,
            r`$= \frac{\sqrt6 + \sqrt2}{4} = 0.9659$.`,
          ],
          answer: r`$\frac{\sqrt6 + \sqrt2}{4} \approx 0.9659$.`,
        },
        {
          level: 'board',
          title: 'Sum, double, half and triple',
          problem: r`$\sin A = \frac35$ and $\cos B = \frac{5}{13}$, both angles in QI. Find $\sin(A + B)$, $\cos 2A$, $\tan\frac{A}{2}$ and $\sin 3A$.`,
          steps: [
            r`$\cos A = \frac45$, $\sin B = \frac{12}{13}$. $\sin(A + B) = \frac35\cdot\frac{5}{13} + \frac45\cdot\frac{12}{13} = \frac{63}{65} = 0.9692$.`,
            r`$\cos 2A = 1 - 2\left(\frac{9}{25}\right) = \frac{7}{25} = 0.28$.`,
            r`$\tan\frac{A}{2} = \frac{1 - \cos A}{\sin A} = \frac{1/5}{3/5} = \frac13$.`,
            r`$\sin 3A = 3\left(\frac35\right) - 4\left(\frac35\right)^3 = \frac{117}{125} = 0.936$.`,
          ],
          answer: r`$\frac{63}{65}$, $\frac{7}{25}$, $\frac13$, $\frac{117}{125}$.`,
        },
      ],
      traps: [
        r`$\sin(A + B) \ne \sin A + \sin B$, and $\sin 2\theta \ne 2\sin\theta$.`,
        r`For cosine of a sum the sign between the terms is a minus.`,
      ],
      check: [
        { q: r`Evaluate $\cos^2 15^\circ - \sin^2 15^\circ$.`, a: r`$\cos 30^\circ = \frac{\sqrt3}{2} \approx 0.866$.` },
        { q: r`Find $\tan 15^\circ$ exactly.`, a: r`$\tan(45^\circ - 30^\circ) = 2 - \sqrt3$.` },
      ],
    },
    {
      name: 'Right Triangles',
      inShort: r`Solving right triangles: the Pythagorean theorem, the three ratios, and the 30-60-90 and 45-45-90 triangles.`,
      body: [
        r`In a right triangle the hypotenuse $c$ faces the right angle, and $c^2 = a^2 + b^2$. Any two pieces besides the right angle (two sides, or a side and an acute angle) fix the rest:`,
        {
          type: 'phasor',
          alt: 'A right triangle drawn as three sides: the adjacent side 4 along the base, the opposite side 3 rising from its end, and the hypotenuse 5 from the start to the top, at the angle theta of about 36.9 degrees.',
          caption: 'The 3-4-5 triangle: adjacent 4, opposite 3, hypotenuse 5. For the angle θ at the base, sin θ = 3/5, cos θ = 4/5, tan θ = 3/4, so θ ≈ 36.87°.',
          axes: false,
          vectors: [
            { name: 'b', mag: 4, angle: 0, label: '4', colour: 1, labelAt: 'mid' },
            { name: 'a', mag: 3, angle: 90, from: 'b', label: '3', colour: 2, labelAt: 'mid' },
            { mag: 5, angle: deg(Math.atan2(3, 4)), label: '5', labelAt: 'mid' },
          ],
          arcs: [{ from: 0, to: deg(Math.atan2(3, 4)), label: 'θ', r: 40 }],
        },
        r`| Triangle | Sides | Use |
|---|---|---|
| 30-60-90 | $1 : \sqrt3 : 2$ (short leg opposite $30^\circ$) | half an equilateral triangle |
| 45-45-90 | $1 : 1 : \sqrt2$ | half a square |
| Pythagorean triples | 3-4-5, 5-12-13, 8-15-17, 7-24-25, 20-21-29 | whole-number answers |

Multiples of a triple are triples too (6-8-10, 10-24-26).`,
      ],
      keyIdeas: [
        r`$c^2 = a^2 + b^2$; triples 3-4-5, 5-12-13, 8-15-17, 7-24-25.`,
        r`30-60-90 sides $1 : \sqrt3 : 2$; 45-45-90 sides $1 : 1 : \sqrt2$.`,
        r`Two pieces (a side and an angle, or two sides) fix the triangle.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A ladder',
          problem: r`A 10 m ladder leans on a wall with its foot 6 m out. How high does it reach, and at what angle to the ground?`,
          steps: [
            r`Height $\sqrt{10^2 - 6^2} = 8$ m.`,
            r`Angle $\cos^{-1}\frac{6}{10} = 53.13^\circ$.`,
          ],
          answer: r`8 m, at about $53.13^\circ$.`,
        },
        {
          level: 'board',
          title: 'Legs from the hypotenuse',
          problem: r`The hypotenuse of a right triangle is 26 cm, and one leg is 14 cm longer than the other. Find the legs and the angle opposite the longer leg.`,
          steps: [
            r`$x^2 + (x + 14)^2 = 26^2$, so $2x^2 + 28x - 480 = 0$ and $x^2 + 14x - 240 = 0$.`,
            r`$(x + 24)(x - 10) = 0$: $x = 10$, so the legs are 10 and 24 cm (a 5-12-13 triangle, doubled).`,
            r`Opposite the 24: $\tan^{-1}\frac{24}{10} = 67.38^\circ$.`,
          ],
          answer: r`10 cm and 24 cm; $67.38^\circ$.`,
        },
      ],
      traps: [
        r`The hypotenuse is opposite the right angle and is always the longest side.`,
        r`In a 30-60-90 triangle the $\sqrt3$ side is opposite the $60^\circ$ angle, not the $30^\circ$.`,
      ],
      check: [
        { q: r`A 30-60-90 triangle has hypotenuse 12. Find its legs.`, a: r`6 and $6\sqrt3 \approx 10.39$.` },
        { q: r`Is 8, 15, 17 a right triangle?`, a: r`Yes: $64 + 225 = 289 = 17^2$.` },
      ],
    },
    {
      name: 'Angles of Elevation and Depression',
      inShort: r`Heights and distances from angles measured up or down from the horizontal.`,
      body: [
        r`Both angles are measured from the **horizontal** through the observer's eye: **elevation** up to an object above, **depression** down to one below.`,
        {
          type: 'phasor',
          alt: 'From an observer, a dashed horizontal line, a line of sight rising 30 degrees to an object above, and a line of sight falling 25 degrees to an object below.',
          caption: 'Angle of elevation (30°, up to an object above) and angle of depression (25°, down to one below), both from the horizontal.',
          vectors: [
            { mag: 1.2, angle: 0, label: 'horizontal', dashed: true, colour: 3 },
            { mag: 1.1, angle: 30, label: 'up', colour: 1 },
            { mag: 1.1, angle: -25, label: 'down', colour: 2 },
          ],
          arcs: [
            { from: 0, to: 30, label: '30°', r: 48 },
            { from: -25, to: 0, label: '25°', r: 48 },
          ],
        },
        r`The angle of elevation from A to B equals the angle of depression from B to A: they are alternate angles between parallel horizontals. One sighting at distance $d$ gives $h = d\tan\theta$; two sightings $d$ apart on a line toward the object give $h = \frac{d}{\cot\alpha - \cot\beta}$.

A **bearing** gives a direction on the ground: from north or south, turned toward east or west, such as N 35° E. An **azimuth** is measured clockwise from north, $0^\circ$ to $360^\circ$ (N 35° E is $35^\circ$; S 50° E is $130^\circ$):`,
        {
          type: 'phasor',
          alt: 'A direction N 35 degrees E: a line from the origin turned 35 degrees from north toward east.',
          caption: 'The bearing N 35° E: start at north and turn 35° toward east (azimuth 35°).',
          vectors: [{ mag: 1, angle: 55, label: 'N 35° E' }],
          arcs: [{ from: 55, to: 90, label: '35°', r: 44 }],
        },
      ],
      keyIdeas: [
        r`Both angles are measured from the horizontal; elevation from below equals depression from above.`,
        r`One sighting: $h = d\tan\theta$.`,
        r`Two sightings $d$ apart along a line: $h = \frac{d}{\cot\alpha - \cot\beta}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two sightings',
          problem: r`The angle of elevation of a tower's top is $30^\circ$. Walking 20 m closer, it is $45^\circ$. How tall is the tower?`,
          steps: [
            r`$h = \frac{20}{\cot 30^\circ - \cot 45^\circ} = \frac{20}{\sqrt3 - 1}$.`,
            r`$= 27.32$ m.`,
          ],
          answer: r`About 27.32 m.`,
        },
        {
          level: 'board',
          title: "A depression angle, and a ship's course",
          problem: r`(a) From the top of a 40 m building, the angle of depression to a car is $25^\circ$. How far is the car from the building? (b) A ship sails 30 km on N 40° E, then 50 km on S 50° E. How far is it from the start, and on what bearing?`,
          steps: [
            r`(a) $d = \frac{40}{\tan 25^\circ} = 85.78$ m.`,
            r`(b) Azimuths $40^\circ$ and $130^\circ$ differ by $90^\circ$: the legs meet at a right angle. Distance $\sqrt{30^2 + 50^2} = 58.31$ km.`,
            r`From the first leg, $\tan^{-1}\frac{50}{30} = 59.04^\circ$ clockwise: azimuth $99.04^\circ$, which is S 80.96° E.`,
          ],
          answer: r`(a) 85.78 m; (b) 58.31 km on S 80.96° E.`,
        },
      ],
      traps: [
        r`Add the observer's eye height when the item gives one.`,
        r`Draw the depression angle at the top, from the horizontal, never from the vertical wall.`,
      ],
      check: [
        { q: r`What azimuth is the bearing S 30° W?`, a: r`$180^\circ + 30^\circ = 210^\circ$.` },
        { q: r`From a point 50 m from a pole's foot, the top is at $35^\circ$. How tall is the pole?`, a: r`$50\tan 35^\circ \approx 35.01$ m.` },
      ],
    },
    {
      name: 'Sine and Cosine Laws',
      inShort: r`Solving any triangle: the sine law for a side and its opposite angle, the cosine law for two sides and the included angle or for three sides.`,
      body: [
        r`In any triangle, side $a$ faces angle $A$, $b$ faces $B$, $c$ faces $C$:`,
        { figure: 'triangle', caption: 'Triangle ABC: each side is named for the angle it faces.' },
        r`**Sine law:** $\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}$ ($= 2R$, the circumscribed diameter). **Cosine law:** $c^2 = a^2 + b^2 - 2ab\cos C$, or for an angle, $\cos C = \frac{a^2 + b^2 - c^2}{2ab}$.

| Given | Law to start with |
|---|---|
| two angles and a side (AAS, ASA) | sine law |
| two sides and the angle between (SAS) | cosine law |
| three sides (SSS) | cosine law, largest angle first |
| two sides and an angle not between (SSA) | sine law: possibly two triangles |

In the **ambiguous case** (SSA), $\sin B$ gives an acute $B$ and its supplement $180^\circ - B$; the second triangle exists when $A + (180^\circ - B) < 180^\circ$.

Two more lengths from three sides: the **median** to side $a$ is $m_a = \frac12\sqrt{2b^2 + 2c^2 - a^2}$, and the bisector of angle $C$ divides the opposite side in the ratio $a : b$ of the sides beside it.`,
      ],
      keyIdeas: [
        r`$\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}$.`,
        r`$c^2 = a^2 + b^2 - 2ab\cos C$, and $\cos C = \frac{a^2 + b^2 - c^2}{2ab}$.`,
        r`Two sides and a non-included angle may give two triangles (the ambiguous case).`,
        r`The angles always add to $180^\circ$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two sides and the angle between',
          problem: r`Two sides of a triangle are 7 and 8 with $60^\circ$ between them. Find the third side.`,
          steps: [
            r`$c^2 = 49 + 64 - 2(7)(8)\cos 60^\circ = 113 - 56 = 57$.`,
            r`$c = \sqrt{57} = 7.55$.`,
          ],
          answer: r`About 7.55.`,
        },
        {
          level: 'board',
          title: 'The ambiguous case',
          problem: r`In triangle ABC, $a = 8$, $b = 10$ and $A = 40^\circ$. Solve the triangle.`,
          steps: [
            r`$\sin B = \frac{10\sin 40^\circ}{8} = 0.8035$, so $B = 53.46^\circ$ or $126.54^\circ$.`,
            r`Both fit ($40^\circ + 126.54^\circ < 180^\circ$): two triangles, with $C = 86.54^\circ$ or $13.46^\circ$.`,
            r`$c = \frac{8\sin C}{\sin 40^\circ}$: $c = 12.42$ or $c = 2.90$.`,
          ],
          answer: r`Two triangles: $B = 53.46^\circ$, $C = 86.54^\circ$, $c = 12.42$; or $B = 126.54^\circ$, $C = 13.46^\circ$, $c = 2.90$.`,
        },
      ],
      traps: [
        r`The sine law cannot tell an angle from its supplement; use the cosine law for the largest angle.`,
        r`SSA with the side opposite the given angle the longer one gives only one triangle.`,
      ],
      check: [
        { q: r`Find the largest angle of the triangle with sides 5, 6 and 7.`, a: r`$\cos C = \frac{25 + 36 - 49}{60} = 0.2$, so $C = 78.46^\circ$.` },
        { q: r`A triangle has sides 10, 14 and 16. How long is the median to the 14 side?`, a: r`$\frac12\sqrt{2(100) + 2(256) - 196} = \frac12\sqrt{516} \approx 11.36$.` },
      ],
    },
    {
      name: 'Area of Triangles',
      inShort: r`A triangle's area from whatever is known, and the radii of its inscribed and circumscribed circles.`,
      body: [
        r`| Known | Area |
|---|---|
| base and height | $\frac12 bh$ |
| two sides and the angle between | $\frac12 ab\sin C$ |
| three sides (Heron) | $\sqrt{s(s - a)(s - b)(s - c)}$, $s = \frac{a + b + c}{2}$ |
| one side and the angles | $\frac{a^2\sin B\sin C}{2\sin A}$ |
| inscribed circle, radius $r$ | $rs$ |
| circumscribed circle, radius $R$ | $\frac{abc}{4R}$ |
| escribed circle opposite $A$, radius $r_a$ | $r_a(s - a)$ |

Each triangle has four centres: the **centroid** (where the medians meet, two-thirds of the way from each vertex), the **incentre** (angle bisectors; centre of the inscribed circle), the **circumcentre** (perpendicular bisectors of the sides; centre of the circumscribed circle) and the **orthocentre** (altitudes):`,
        { figure: 'triangle-centres', caption: 'The four centres of a triangle, from medians, angle bisectors, perpendicular bisectors and altitudes.' },
        r`**Similar triangles** have equal angles and proportional sides. With sides in the ratio $k$, perimeters and heights are in the ratio $k$ and areas in $k^2$: $\frac{A_1}{A_2} = \left(\frac{a_1}{a_2}\right)^2$.`,
      ],
      keyIdeas: [
        r`$A = \frac12 bh = \frac12 ab\sin C = \sqrt{s(s-a)(s-b)(s-c)}$.`,
        r`Inscribed circle $r = \frac{A}{s}$; circumscribed $R = \frac{abc}{4A}$.`,
        r`From one side and the angles: $A = \frac{a^2\sin B\sin C}{2\sin A}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Heron and the two circles',
          problem: r`A triangle has sides 13, 14 and 15. Find its area and the radii of its inscribed and circumscribed circles.`,
          steps: [
            r`$s = 21$, $A = \sqrt{21 \cdot 8 \cdot 7 \cdot 6} = 84$.`,
            r`$r = \frac{84}{21} = 4$; $R = \frac{13 \cdot 14 \cdot 15}{4 \cdot 84} = 8.125$.`,
          ],
          answer: r`84; $r = 4$; $R = 8.125$.`,
        },
        {
          level: 'board',
          title: 'An equilateral triangle, and similar ones',
          problem: r`(a) An equilateral triangle has sides of 12 cm. Find its area and the areas of its inscribed and circumscribed circles. (b) Two similar triangles have areas in the ratio 49 : 16, and the larger has a perimeter of 140 cm. Find the smaller one's perimeter.`,
          steps: [
            r`(a) $A = \frac{\sqrt3}{4}(144) = 62.35$ cm².`,
            r`$s = 18$: $r = \frac{62.35}{18} = 3.464$ cm, a circle of $\pi r^2 = 37.70$ cm²; $R = \frac{12^3}{4(62.35)} = 6.928$ cm, a circle of $150.80$ cm².`,
            r`(b) Sides in the ratio $\sqrt{\frac{49}{16}} = \frac74$, so the smaller perimeter is $140 \times \frac47 = 80$ cm.`,
          ],
          answer: r`(a) 62.35, 37.70 and 150.80 cm²; (b) 80 cm.`,
        },
      ],
      traps: [
        r`Heron's $s$ is half the perimeter.`,
        r`Areas scale with the square of the sides: take the square root of an area ratio before scaling a length.`,
      ],
      check: [
        { q: r`For the 13-14-15 triangle, find the escribed radius opposite the side 14.`, a: r`$r_a = \frac{84}{21 - 14} = 12$.` },
        { q: r`Two sides 8 and 10 meet at $30^\circ$. What is the area?`, a: r`$\frac12(8)(10)\sin 30^\circ = 20$.` },
      ],
    },
    {
      name: 'Inverse Functions',
      inShort: r`Inverse trigonometric functions, their principal values, and identities that combine them.`,
      body: [
        r`$\sin^{-1}x$ asks "which angle has sine $x$?". Infinitely many do, so each inverse returns one **principal value** from a fixed range:

| Function | Domain | Principal range |
|---|---|---|
| $\sin^{-1}x$ | $[-1, 1]$ | $[-90^\circ, 90^\circ]$ |
| $\cos^{-1}x$ | $[-1, 1]$ | $[0^\circ, 180^\circ]$ |
| $\tan^{-1}x$ | all $x$ | $(-90^\circ, 90^\circ)$ |`,
        {
          type: 'plot',
          alt: 'Inverse sine and inverse cosine of x for x from minus 1 to 1, in degrees. Inverse sine rises from minus 90 to 90; inverse cosine falls from 180 to 0. At every x they add to 90.',
          caption: 'sin⁻¹x rises from −90° to 90°; cos⁻¹x falls from 180° to 0°. At every x they add to 90°.',
          x: [-1, 1],
          y: [-100, 280],
          xLabel: 'x',
          yLabel: 'degrees',
          series: [
            { f: (x) => deg(Math.asin(Math.max(-1, Math.min(1, x)))), label: 'sin⁻¹ x', colour: colourOf(0) },
            { f: (x) => deg(Math.acos(Math.max(-1, Math.min(1, x)))), label: 'cos⁻¹ x', dashed: true, colour: colourOf(1) },
          ],
        },
        r`Useful identities: $\sin^{-1}x + \cos^{-1}x = 90^\circ$, and $\tan^{-1}x + \tan^{-1}y = \tan^{-1}\frac{x + y}{1 - xy}$ when $xy < 1$. To evaluate a function of an inverse, draw the reference triangle the inverse describes.`,
      ],
      keyIdeas: [
        r`$\sin^{-1}x \in [-\frac{\pi}{2}, \frac{\pi}{2}]$, $\cos^{-1}x \in [0, \pi]$, $\tan^{-1}x \in (-\frac{\pi}{2}, \frac{\pi}{2})$.`,
        r`$\sin^{-1}x + \cos^{-1}x = \frac{\pi}{2}$.`,
        r`$\tan^{-1}x + \tan^{-1}y = \tan^{-1}\frac{x + y}{1 - xy}$ for $xy < 1$.`,
        r`Evaluate a function of an inverse with a reference triangle.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A sine of an inverse cosine',
          problem: r`Evaluate $\sin\left(\cos^{-1}\frac35\right)$.`,
          steps: [
            r`$\cos^{-1}\frac35$ is an angle in QI with adjacent 3 and hypotenuse 5.`,
            r`The opposite side is 4, so the sine is $\frac45$.`,
          ],
          answer: r`$\frac45$.`,
        },
        {
          level: 'board',
          title: 'Sums and principal values',
          problem: r`Evaluate (a) $\tan^{-1}\frac12 + \tan^{-1}\frac13$, (b) $\cos\left(\sin^{-1}\left(-\frac{5}{13}\right)\right)$, (c) $\sin^{-1}(\sin 150^\circ)$.`,
          steps: [
            r`(a) $\tan^{-1}\frac{1/2 + 1/3}{1 - 1/6} = \tan^{-1}1 = 45^\circ$.`,
            r`(b) $\sin^{-1}\left(-\frac{5}{13}\right)$ lies in $[-90^\circ, 0^\circ]$, where cosine is positive: $\frac{12}{13}$.`,
            r`(c) $\sin 150^\circ = \frac12$, and the principal value of $\sin^{-1}\frac12$ is $30^\circ$.`,
          ],
          answer: r`(a) $45^\circ$; (b) $\frac{12}{13}$; (c) $30^\circ$.`,
        },
      ],
      traps: [
        r`$\sin^{-1}(\sin 150^\circ) = 30^\circ$, not $150^\circ$: the principal range decides.`,
        r`$\sin^{-1}2$ does not exist: a sine never exceeds 1.`,
      ],
      check: [
        { q: r`What is $\sin^{-1}x + \cos^{-1}x$?`, a: r`$90^\circ$, for every $x$ in $[-1, 1]$.` },
        { q: r`Evaluate $\tan\left(\cos^{-1}\frac35\right)$.`, a: r`$\frac43$.` },
      ],
    },
    {
      name: 'Trigonometric Equations',
      inShort: r`Finding every angle that satisfies an equation, in an interval or in general.`,
      body: [
        r`A trigonometric equation is solved like an algebraic one, then each value of the function is turned into every angle that gives it. **Isolate** one function, or **factor**; replace double angles and mixed functions with one function using the identities; then find the reference angle and every quadrant where the function has that sign.

A solution is where the graph of the whole expression crosses zero. For $2\sin^2x - \sin x - 1$ on $0^\circ$ to $360^\circ$:`,
        {
          type: 'plot',
          alt: 'The curve y equals 2 sine squared x minus sine x minus 1 from 0 to 360 degrees. It touches zero at 90 degrees and crosses zero at 210 and 330 degrees, peaking at 2 at 270 degrees.',
          caption: 'y = 2sin²x − sin x − 1: zero at 90°, 210° and 330°, the three solutions in one turn.',
          x: [0, 360],
          y: [-1.5, 2.5],
          xLabel: 'x, degrees',
          yLabel: 'y',
          series: [{ f: eq }],
          marks: [
            { x: 90, label: '90°' },
            { x: 210, label: '210°' },
            { x: 330, label: '330°' },
          ],
          legend: false,
        },
        r`General solutions add whole periods: $\sin\theta = \sin\alpha$ gives $\theta = n(180^\circ) + (-1)^n\alpha$; $\cos\theta = \cos\alpha$ gives $n(360^\circ) \pm \alpha$; $\tan\theta = \tan\alpha$ gives $n(180^\circ) + \alpha$.`,
      ],
      keyIdeas: [
        r`Isolate one function, or factor; then use the quadrant rules for all solutions.`,
        r`$\sin\theta = \sin\alpha$: $\theta = n\pi + (-1)^n\alpha$. $\cos$: $2n\pi \pm \alpha$. $\tan$: $n\pi + \alpha$.`,
        r`Squaring both sides can add false solutions: check each.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A quadratic in sine',
          problem: r`Solve $2\sin^2x - \sin x - 1 = 0$ for $0 \le x < 2\pi$.`,
          steps: [
            r`$(2\sin x + 1)(\sin x - 1) = 0$.`,
            r`$\sin x = 1$ gives $x = \frac{\pi}{2}$; $\sin x = -\frac12$ gives $x = \frac{7\pi}{6}$ and $\frac{11\pi}{6}$.`,
          ],
          answer: r`$\frac{\pi}{2}$, $\frac{7\pi}{6}$, $\frac{11\pi}{6}$ ($90^\circ$, $210^\circ$, $330^\circ$).`,
        },
        {
          level: 'board',
          title: 'A double angle, and a general solution',
          problem: r`(a) Solve $\cos 2x = \cos x$ for $0^\circ \le x < 360^\circ$. (b) Give every solution of $\tan x = \sqrt3$.`,
          steps: [
            r`(a) $2\cos^2x - 1 = \cos x$, so $2\cos^2x - \cos x - 1 = 0$ and $(2\cos x + 1)(\cos x - 1) = 0$.`,
            r`$\cos x = 1$ gives $0^\circ$; $\cos x = -\frac12$ gives $120^\circ$ and $240^\circ$.`,
            r`(b) $\tan 60^\circ = \sqrt3$ and tangent repeats every $180^\circ$: $x = 60^\circ + n(180^\circ)$.`,
          ],
          answer: r`(a) $0^\circ$, $120^\circ$, $240^\circ$; (b) $60^\circ + n(180^\circ)$.`,
        },
      ],
      traps: [
        r`Dividing by $\sin x$ loses the solutions where $\sin x = 0$.`,
        r`Tangent's period is $180^\circ$, not $360^\circ$.`,
      ],
      check: [
        { q: r`Solve $2\cos x = 1$ for $0^\circ \le x < 360^\circ$.`, a: r`$60^\circ$ and $300^\circ$.` },
        { q: r`How many solutions has $\sin 2x = 0$ in $0^\circ \le x < 360^\circ$?`, a: r`Four: $0^\circ$, $90^\circ$, $180^\circ$, $270^\circ$.` },
      ],
    },
    {
      name: 'Hyperbolic Functions',
      inShort: r`$\sinh$, $\cosh$ and $\tanh$, defined by exponentials, with identities that mirror the circular ones.`,
      body: [
        r`The hyperbolic functions are built from $e^x$:
$$\sinh x = \frac{e^x - e^{-x}}{2}, \quad \cosh x = \frac{e^x + e^{-x}}{2}, \quad \tanh x = \frac{\sinh x}{\cosh x}.$$
Just as $(\cos t, \sin t)$ runs round the circle $x^2 + y^2 = 1$, $(\cosh t, \sinh t)$ runs along the hyperbola $x^2 - y^2 = 1$; hence the name, and the identities with a sign changed:`,
        {
          type: 'plot',
          alt: 'Sinh x, cosh x and tanh x for x from minus 2 to 2. Cosh is a U shape with its lowest point at 1 when x is 0; sinh is an S shape through the origin; tanh rises through the origin and levels off toward minus 1 and 1.',
          caption: 'cosh x (never below 1), sinh x (through the origin) and tanh x (levelling off at ±1).',
          x: [-2, 2],
          y: [-4, 7],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: Math.cosh, label: 'cosh x', colour: colourOf(0) },
            { f: Math.sinh, label: 'sinh x', colour: colourOf(1) },
            { f: Math.tanh, label: 'tanh x', dashed: true, colour: colourOf(2) },
          ],
        },
        r`| Circular | Hyperbolic |
|---|---|
| $\cos^2x + \sin^2x = 1$ | $\cosh^2x - \sinh^2x = 1$ |
| $\sin 2x = 2\sin x\cos x$ | $\sinh 2x = 2\sinh x\cosh x$ |
| $\cos 2x = \cos^2x - \sin^2x$ | $\cosh 2x = \cosh^2x + \sinh^2x$ |
| $1 + \tan^2x = \sec^2x$ | $1 - \tanh^2x = \text{sech}^2x$ |

The inverses are logarithms: $\sinh^{-1}x = \ln\left(x + \sqrt{x^2 + 1}\right)$, $\cosh^{-1}x = \ln\left(x + \sqrt{x^2 - 1}\right)$ for $x \ge 1$, $\tanh^{-1}x = \frac12\ln\frac{1 + x}{1 - x}$. They describe a hanging cable (the catenary) and the voltage along a long transmission line.`,
      ],
      keyIdeas: [
        r`$\sinh x = \frac{e^x - e^{-x}}{2}$, $\cosh x = \frac{e^x + e^{-x}}{2}$.`,
        r`$\cosh^2 x - \sinh^2 x = 1$ (a minus where the circular one has a plus).`,
        r`$\sinh^{-1}x = \ln(x + \sqrt{x^2 + 1})$; $\cosh^{-1}x = \ln(x + \sqrt{x^2 - 1})$ for $x \ge 1$.`,
        r`They appear in transmission-line equations and hanging cables.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'From cosh to the rest',
          problem: r`If $\cosh x = \frac54$ and $x > 0$, find $\sinh x$, $\tanh x$ and $x$.`,
          steps: [
            r`$\sinh x = \sqrt{\frac{25}{16} - 1} = \frac34$, $\tanh x = \frac{3/4}{5/4} = \frac35$.`,
            r`$e^x = \cosh x + \sinh x = 2$, so $x = \ln 2 = 0.693$.`,
          ],
          answer: r`$\frac34$, $\frac35$, $\ln 2 \approx 0.693$.`,
        },
        {
          level: 'board',
          title: 'Values and an inverse',
          problem: r`(a) Find $\sinh 1.2$ and $\cosh 1.2$, and check the identity. (b) Find $\sinh^{-1}2$.`,
          steps: [
            r`(a) $e^{1.2} = 3.3201$, $e^{-1.2} = 0.3012$: $\sinh 1.2 = \frac{3.3201 - 0.3012}{2} = 1.5095$ and $\cosh 1.2 = 1.8107$.`,
            r`Check: $1.8107^2 - 1.5095^2 = 1.000$.`,
            r`(b) $\ln\left(2 + \sqrt5\right) = \ln 4.2361 = 1.4436$.`,
          ],
          answer: r`(a) 1.5095 and 1.8107; (b) 1.4436.`,
        },
      ],
      traps: [
        r`Most calculators hide $\sinh$ under a "hyp" key; it is not $\sin$ in degree mode.`,
        r`$\cosh x \ge 1$ always: $\cosh x = 0.5$ has no real solution.`,
      ],
      check: [
        { q: r`What is $\cosh 0$?`, a: r`$1$.` },
        { q: r`Is $\sinh$ even or odd?`, a: r`Odd: $\sinh(-x) = -\sinh x$.` },
      ],
    },
    {
      name: 'Spherical Trigonometry',
      inShort: r`Triangles drawn on a sphere with great-circle sides measured as angles: navigation and great-circle distance.`,
      body: [
        r`A **spherical triangle** is bounded by three arcs of **great circles** (circles whose centre is the sphere's centre). Its sides $a$, $b$, $c$ are measured as the angles they subtend at the centre; a side becomes a length only at the end: $\text{distance} = R \times$ (side in radians).

| Rule | Statement |
|---|---|
| sine law | $\frac{\sin a}{\sin A} = \frac{\sin b}{\sin B} = \frac{\sin c}{\sin C}$ |
| cosine law for sides | $\cos a = \cos b\cos c + \sin b\sin c\cos A$ |
| cosine law for angles | $\cos A = -\cos B\cos C + \sin B\sin C\cos a$ |
| angle sum | between $180^\circ$ and $540^\circ$ |
| spherical excess | $E = A + B + C - 180^\circ$; area $= \frac{\pi R^2E}{180^\circ}$ |

Right spherical triangles follow **Napier's rules**: on a circle of five parts, the sine of any part equals the product of the tangents of the two parts next to it, and the product of the cosines of the two parts opposite.

The **great-circle distance** between places at latitudes $\varphi_1$, $\varphi_2$ with longitude difference $\Delta\lambda$ comes from the cosine law, with the pole as the third vertex:
$$\cos c = \sin\varphi_1\sin\varphi_2 + \cos\varphi_1\cos\varphi_2\cos\Delta\lambda.$$
One minute of great-circle arc on the Earth is one nautical mile, 1.852 km.`,
      ],
      keyIdeas: [
        r`Sine law: $\frac{\sin a}{\sin A} = \frac{\sin b}{\sin B} = \frac{\sin c}{\sin C}$.`,
        r`Cosine law for sides: $\cos a = \cos b\cos c + \sin b\sin c\cos A$.`,
        r`The angles add to more than $180^\circ$; the excess $E$ gives the area, $\frac{\pi R^2E}{180^\circ}$.`,
        r`Right spherical triangles: Napier's rules.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Area from the excess',
          problem: r`A spherical triangle on a sphere of radius 10 has angles $80^\circ$, $75^\circ$ and $65^\circ$. Find its area.`,
          steps: [
            r`$E = 80 + 75 + 65 - 180 = 40^\circ$.`,
            r`Area $= \frac{\pi(10)^2(40)}{180} = 69.81$ square units.`,
          ],
          answer: r`About 69.81 square units.`,
        },
        {
          level: 'board',
          title: 'A great-circle distance',
          problem: r`Take Manila at $14.6^\circ$ N, $121.0^\circ$ E and Tokyo at $35.7^\circ$ N, $139.7^\circ$ E. Find the great-circle distance, with the Earth's radius 6371 km.`,
          steps: [
            r`$\Delta\lambda = 18.7^\circ$. $\cos c = \sin 14.6^\circ\sin 35.7^\circ + \cos 14.6^\circ\cos 35.7^\circ\cos 18.7^\circ = 0.8915$.`,
            r`$c = 26.94^\circ = 0.4702$ rad.`,
            r`Distance $= 6371 \times 0.4702 = 2996$ km, about 1618 nautical miles.`,
          ],
          answer: r`About 2996 km.`,
        },
      ],
      traps: [
        r`The sides are angles (arcs), so never mix them with lengths until the very end ($\text{distance} = R \times \text{side in radians}$).`,
        r`Use latitudes, not their complements, in the distance formula above; the colatitude form uses cosines where this one has sines.`,
      ],
      check: [
        { q: r`Between what limits does the angle sum of a spherical triangle lie?`, a: r`More than $180^\circ$, less than $540^\circ$.` },
        { q: r`How long is one nautical mile?`, a: r`1.852 km: one minute of great-circle arc.` },
      ],
    },
  ],
};
