// Library › Lessons › Mathematics › Trigonometry (2026-11-16): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand.
const r = String.raw;

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
      keyIdeas: [
        r`$\pi$ rad $= 180^\circ$; one turn is $360^\circ = 2\pi$ rad $= 400$ grad $= 6400$ mils.`,
        r`With $\theta$ in radians: arc $s = r\theta$, sector $A = \frac12 r^2\theta$.`,
        r`Rim speed $v = r\omega$, with $\omega = \frac{2\pi N}{60}$ rad/s from $N$ rpm.`,
      ],
      example: {
        problem: r`A pulley of radius 0.4 m turns at 300 rpm. How fast does its belt move?`,
        solution: r`$\omega = \frac{2\pi(300)}{60} = 10\pi$ rad/s, so $v = r\omega = 0.4 \times 10\pi = 4\pi \approx 12.57$ m/s.`,
      },
      traps: [r`$s = r\theta$ with $\theta$ in degrees is wrong by a factor of $\frac{\pi}{180}$.`],
    },
    {
      name: 'Trigonometric Functions',
      inShort: r`The six functions, their values at the special angles, their signs in each quadrant, and the graphs of sine and cosine.`,
      keyIdeas: [
        r`SOH-CAH-TOA; $\csc$, $\sec$, $\cot$ are the reciprocals of $\sin$, $\cos$, $\tan$.`,
        r`Signs by quadrant: All, Sine, Tangent, Cosine (QI to QIV) are positive.`,
        r`Any angle reduces to its acute reference angle; then fix the sign by quadrant.`,
        r`$y = A\sin(Bx + C)$: amplitude $|A|$, period $\frac{2\pi}{|B|}$, shift $-\frac{C}{B}$.`,
      ],
      example: {
        problem: r`$\tan\theta = -\frac34$ and $\theta$ is in QII. Find $\sin\theta$ and $\cos\theta$.`,
        solution: r`The reference triangle is 3-4-5. In QII sine is positive and cosine negative: $\sin\theta = \frac35$, $\cos\theta = -\frac45$.`,
      },
      traps: [
        r`$\sin^{-1}x$ is the inverse function, not $\frac{1}{\sin x}$; that is $\csc x$.`,
        r`Degree mode or radian mode: the most common lost point in the whole topic.`,
      ],
    },
    {
      name: 'Fundamental Identities',
      inShort: r`The reciprocal, quotient and Pythagorean identities that every proof and simplification leans on.`,
      keyIdeas: [
        r`$\tan\theta = \frac{\sin\theta}{\cos\theta}$, $\cot\theta = \frac{\cos\theta}{\sin\theta}$.`,
        r`$\sin^2\theta + \cos^2\theta = 1$, $1 + \tan^2\theta = \sec^2\theta$, $1 + \cot^2\theta = \csc^2\theta$.`,
        r`When stuck, rewrite everything in sines and cosines.`,
      ],
      example: {
        problem: r`Simplify $(1 - \cos^2\theta)(1 + \cot^2\theta)$.`,
        solution: r`$1 - \cos^2\theta = \sin^2\theta$ and $1 + \cot^2\theta = \csc^2\theta = \frac{1}{\sin^2\theta}$. The product is $1$.`,
      },
      traps: [r`$\sin^2\theta$ means $(\sin\theta)^2$, not $\sin(\theta^2)$.`],
    },
    {
      name: 'Sum, Difference, Double and Half Angle',
      inShort: r`Functions of $A \pm B$, $2\theta$, $\frac{\theta}{2}$ and $3\theta$, and the product-sum conversions.`,
      keyIdeas: [
        r`$\sin(A \pm B) = \sin A\cos B \pm \cos A\sin B$; $\cos(A \pm B) = \cos A\cos B \mp \sin A\sin B$.`,
        r`$\sin 2\theta = 2\sin\theta\cos\theta$; $\cos 2\theta = 1 - 2\sin^2\theta = 2\cos^2\theta - 1$.`,
        r`Half angles: $\sin\frac{\theta}{2} = \pm\sqrt{\frac{1 - \cos\theta}{2}}$, the sign set by where $\frac{\theta}{2}$ lies.`,
        r`Products to sums and back: $2\sin A\cos B = \sin(A + B) + \sin(A - B)$.`,
      ],
      example: {
        problem: r`Find $\sin 75^\circ$ exactly.`,
        solution: r`$\sin(45^\circ + 30^\circ) = \frac{\sqrt2}{2}\cdot\frac{\sqrt3}{2} + \frac{\sqrt2}{2}\cdot\frac12 = \frac{\sqrt6 + \sqrt2}{4} \approx 0.9659$.`,
      },
      traps: [
        r`$\sin(A + B) \ne \sin A + \sin B$, and $\sin 2\theta \ne 2\sin\theta$.`,
        r`For cosine of a sum the sign between the terms is a minus.`,
      ],
    },
    {
      name: 'Right Triangles',
      inShort: r`Solving right triangles: the Pythagorean theorem, the three ratios, and the 30-60-90 and 45-45-90 triangles.`,
      keyIdeas: [
        r`$c^2 = a^2 + b^2$; triples 3-4-5, 5-12-13, 8-15-17, 7-24-25.`,
        r`30-60-90 sides $1 : \sqrt3 : 2$; 45-45-90 sides $1 : 1 : \sqrt2$.`,
        r`Two pieces (a side and an angle, or two sides) fix the triangle.`,
      ],
      example: {
        problem: r`A 10 m ladder leans on a wall with its foot 6 m out. How high does it reach, and at what angle to the ground?`,
        solution: r`Height $\sqrt{10^2 - 6^2} = 8$ m. Angle $\cos^{-1}\frac{6}{10} \approx 53.13^\circ$.`,
      },
      traps: [r`The hypotenuse is opposite the right angle and is always the longest side.`],
    },
    {
      name: 'Angles of Elevation and Depression',
      inShort: r`Heights and distances from angles measured up or down from the horizontal.`,
      keyIdeas: [
        r`Both angles are measured from the horizontal; elevation from below equals depression from above.`,
        r`One sighting: $h = d\tan\theta$.`,
        r`Two sightings $d$ apart along a line: $h = \frac{d}{\cot\alpha - \cot\beta}$.`,
      ],
      example: {
        problem: r`The angle of elevation of a tower's top is $30^\circ$. Walking 20 m closer, it is $45^\circ$. How tall is the tower?`,
        solution: r`$h = \frac{20}{\cot 30^\circ - \cot 45^\circ} = \frac{20}{\sqrt3 - 1} \approx 27.32$ m.`,
      },
      traps: [r`Add the observer's eye height when the item gives one.`],
    },
    {
      name: 'Sine and Cosine Laws',
      inShort: r`Solving any triangle: the sine law for a side and its opposite angle, the cosine law for two sides and the included angle or for three sides.`,
      keyIdeas: [
        r`$\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}$.`,
        r`$c^2 = a^2 + b^2 - 2ab\cos C$, and $\cos C = \frac{a^2 + b^2 - c^2}{2ab}$.`,
        r`Two sides and a non-included angle may give two triangles (the ambiguous case).`,
        r`The angles always add to $180^\circ$.`,
      ],
      example: {
        problem: r`Two sides of a triangle are 7 and 8 with $60^\circ$ between them. Find the third side.`,
        solution: r`$c^2 = 49 + 64 - 2(7)(8)\cos 60^\circ = 113 - 56 = 57$, so $c = \sqrt{57} \approx 7.55$.`,
      },
      traps: [r`The sine law cannot tell an angle from its supplement; use the cosine law for the largest angle.`],
    },
    {
      name: 'Area of Triangles',
      inShort: r`A triangle's area from whatever is known, and the radii of its inscribed and circumscribed circles.`,
      keyIdeas: [
        r`$A = \frac12 bh = \frac12 ab\sin C = \sqrt{s(s-a)(s-b)(s-c)}$.`,
        r`Inscribed circle $r = \frac{A}{s}$; circumscribed $R = \frac{abc}{4A}$.`,
        r`From one side and the angles: $A = \frac{a^2\sin B\sin C}{2\sin A}$.`,
      ],
      example: {
        problem: r`A triangle has sides 13, 14 and 15. Find its area and the radii of its inscribed and circumscribed circles.`,
        solution: r`$s = 21$, $A = \sqrt{21 \cdot 8 \cdot 7 \cdot 6} = 84$. $r = \frac{84}{21} = 4$ and $R = \frac{13 \cdot 14 \cdot 15}{4 \cdot 84} = 8.125$.`,
      },
      traps: [r`Heron's $s$ is half the perimeter.`],
    },
    {
      name: 'Inverse Functions',
      inShort: r`Inverse trigonometric functions, their principal values, and identities that combine them.`,
      keyIdeas: [
        r`$\sin^{-1}x \in [-\frac{\pi}{2}, \frac{\pi}{2}]$, $\cos^{-1}x \in [0, \pi]$, $\tan^{-1}x \in (-\frac{\pi}{2}, \frac{\pi}{2})$.`,
        r`$\sin^{-1}x + \cos^{-1}x = \frac{\pi}{2}$.`,
        r`$\tan^{-1}x + \tan^{-1}y = \tan^{-1}\frac{x + y}{1 - xy}$ for $xy < 1$.`,
        r`Evaluate a function of an inverse with a reference triangle.`,
      ],
      example: {
        problem: r`Evaluate $\sin\left(\cos^{-1}\frac35\right)$.`,
        solution: r`$\cos^{-1}\frac35$ is an angle in QI with adjacent 3 and hypotenuse 5, so the opposite side is 4 and the sine is $\frac45$.`,
      },
      traps: [r`$\sin^{-1}(\sin 150^\circ) = 30^\circ$, not $150^\circ$: the principal range decides.`],
    },
    {
      name: 'Trigonometric Equations',
      inShort: r`Finding every angle that satisfies an equation, in an interval or in general.`,
      keyIdeas: [
        r`Isolate one function, or factor; then use the quadrant rules for all solutions.`,
        r`$\sin\theta = \sin\alpha$: $\theta = n\pi + (-1)^n\alpha$. $\cos$: $2n\pi \pm \alpha$. $\tan$: $n\pi + \alpha$.`,
        r`Squaring both sides can add false solutions: check each.`,
      ],
      example: {
        problem: r`Solve $2\sin^2x - \sin x - 1 = 0$ for $0 \le x < 2\pi$.`,
        solution: r`$(2\sin x + 1)(\sin x - 1) = 0$. $\sin x = 1$ gives $x = \frac{\pi}{2}$; $\sin x = -\frac12$ gives $x = \frac{7\pi}{6}$ and $\frac{11\pi}{6}$.`,
      },
      traps: [r`Dividing by $\sin x$ loses the solutions where $\sin x = 0$.`],
    },
    {
      name: 'Hyperbolic Functions',
      inShort: r`$\sinh$, $\cosh$ and $\tanh$, defined by exponentials, with identities that mirror the circular ones.`,
      keyIdeas: [
        r`$\sinh x = \frac{e^x - e^{-x}}{2}$, $\cosh x = \frac{e^x + e^{-x}}{2}$.`,
        r`$\cosh^2 x - \sinh^2 x = 1$ (a minus where the circular one has a plus).`,
        r`$\sinh^{-1}x = \ln(x + \sqrt{x^2 + 1})$; $\cosh^{-1}x = \ln(x + \sqrt{x^2 - 1})$ for $x \ge 1$.`,
        r`They appear in transmission-line equations and hanging cables.`,
      ],
      example: {
        problem: r`If $\cosh x = \frac54$ and $x > 0$, find $\sinh x$, $\tanh x$ and $x$.`,
        solution: r`$\sinh x = \sqrt{\frac{25}{16} - 1} = \frac34$, $\tanh x = \frac{3/4}{5/4} = \frac35$. Then $e^x = \cosh x + \sinh x = 2$, so $x = \ln 2 \approx 0.693$.`,
      },
      traps: [r`Most calculators hide $\sinh$ under a "hyp" key; it is not $\sin$ in degree mode.`],
    },
    {
      name: 'Spherical Trigonometry',
      inShort: r`Triangles drawn on a sphere with great-circle sides measured as angles: navigation and great-circle distance.`,
      keyIdeas: [
        r`Sine law: $\frac{\sin a}{\sin A} = \frac{\sin b}{\sin B} = \frac{\sin c}{\sin C}$.`,
        r`Cosine law for sides: $\cos a = \cos b\cos c + \sin b\sin c\cos A$.`,
        r`The angles add to more than $180^\circ$; the excess $E$ gives the area, $\frac{\pi R^2E}{180^\circ}$.`,
        r`Right spherical triangles: Napier's rules.`,
      ],
      example: {
        problem: r`A spherical triangle on a sphere of radius 10 has angles $80^\circ$, $75^\circ$ and $65^\circ$. Find its area.`,
        solution: r`$E = 80 + 75 + 65 - 180 = 40^\circ$. Area $= \frac{\pi(10)^2(40)}{180} \approx 69.81$ square units.`,
      },
      traps: [r`The sides are angles (arcs), so never mix them with lengths until the very end ($\text{distance} = R \times \text{side in radians}$).`],
    },
  ],
};
