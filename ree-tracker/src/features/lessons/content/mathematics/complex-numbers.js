// Library › Lessons › Mathematics › Complex Numbers (2026-11-17; every
// subtopic in the module format 2026-11-27, with figures, examples a step at a
// time and checks; every number re-worked by complexNumbersLesson.test.js.
// Coverage cross-checked against two review centers' complex-number handouts;
// the text, problems and figures are this app's own): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order. j is the
// imaginary unit, as in electrical work.
const r = String.raw;

const deg = (x) => (x * 180) / Math.PI;

export default {
  topic: 'Complex Numbers',
  subject: 'Mathematics',
  overview: r`Complex numbers are the arithmetic of AC circuits: every phasor, impedance and complex power is one. On the board they come as quick computations in either form, powers and roots, and the exponential, logarithmic and hyperbolic results that follow from Euler's formula. Add and subtract in rectangular form, multiply, divide, raise and root in polar form, and let the calculator's complex mode check you. Always place the angle in the right quadrant.`,
  sources: [
    'Schaum’s Outline of Complex Variables (Spiegel)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Rectangular and Polar Forms',
      inShort: r`A complex number as $x + jy$, as $r\angle\theta$, or as $re^{j\theta}$, and changing between them.`,
      body: [
        r`A complex number $z = x + jy$ is a point, or an arrow, on the **complex plane**: $x$ along the real axis, $y$ along the imaginary axis. Its length is the **modulus** $r$ and its direction the **argument** $\theta$:`,
        {
          type: 'phasor',
          axes: 'reim',
          alt: 'The complex number minus 3 minus j4 drawn on the complex plane: an arrow of length 5 into the third quadrant, at 233.13 degrees from the positive real axis.',
          caption: '−3 − j4 = 5∠233.13° (or 5∠−126.87°): the arrow is α = 53.13° past the negative real axis, in the third quadrant, so 180° is added to the calculator’s 53.13°.',
          vectors: [{ mag: 5, angle: 180 + deg(Math.atan(4 / 3)), label: 'r = 5' }],
          arcs: [{ from: 180, to: 180 + deg(Math.atan(4 / 3)), label: 'α', r: 60 }],
        },
        r`| Form | Written | Notes |
|---|---|---|
| rectangular | $x + jy$ | add and subtract here |
| polar (Steinmetz) | $r\angle\theta$ | multiply, divide, raise, root here |
| trigonometric | $r(\cos\theta + j\sin\theta) = r\,\text{cis}\,\theta$ | $\theta$ in degrees or radians |
| exponential | $re^{j\theta}$ | $\theta$ in radians |

To polar: $r = \sqrt{x^2 + y^2}$ and $\theta = \tan^{-1}\frac yx$, **plus $180^\circ$ when $x < 0$**. Back: $x = r\cos\theta$, $y = r\sin\theta$. On the calculator, complex mode converts both ways.`,
      ],
      keyIdeas: [
        r`$r = \sqrt{x^2 + y^2}$, $\theta = \tan^{-1}\frac{y}{x}$; back: $x = r\cos\theta$, $y = r\sin\theta$.`,
        r`Add $180^\circ$ to the inverse tangent when $x < 0$ (QII and QIII).`,
        r`Exponential form $re^{j\theta}$ needs $\theta$ in radians.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Both directions',
          problem: r`Write $-3 - j4$ in polar form, and $10\angle30^\circ$ in rectangular form.`,
          steps: [
            r`$r = 5$; $\tan^{-1}\frac{-4}{-3} = 53.13^\circ$, but the point is in QIII: $\theta = 233.13^\circ$ (or $-126.87^\circ$).`,
            r`$10\angle30^\circ = 10\cos30^\circ + j10\sin30^\circ = 8.660 + j5$.`,
          ],
          answer: r`$5\angle233.13^\circ$; $8.660 + j5$.`,
        },
        {
          level: 'board',
          title: 'Four forms',
          problem: r`(a) Write $5\angle{-150^\circ}$ in rectangular form. (b) Write $-12 + j5$ in polar, trigonometric and exponential form.`,
          steps: [
            r`(a) $5\cos(-150^\circ) = -4.330$, $5\sin(-150^\circ) = -2.5$: $-4.330 - j2.5$.`,
            r`(b) $r = 13$; $\tan^{-1}\frac{5}{12} = 22.62^\circ$, and the point is in QII: $\theta = 157.38^\circ = 2.7468$ rad.`,
            r`$13\angle157.38^\circ = 13(\cos157.38^\circ + j\sin157.38^\circ) = 13e^{j2.7468}$.`,
          ],
          answer: r`(a) $-4.330 - j2.5$; (b) $13\angle157.38^\circ$, $13\,\text{cis}\,157.38^\circ$, $13e^{j2.7468}$.`,
        },
      ],
      traps: [
        r`$\tan^{-1}\frac{y}{x}$ cannot tell $3 + j4$ from $-3 - j4$; the signs of $x$ and $y$ can.`,
        r`In $re^{j\theta}$ the angle is in radians: $13e^{j157.38}$ is a different number.`,
      ],
      check: [
        { q: r`What is the modulus of $6 - j8$?`, a: r`$10$.` },
        { q: r`Write $2\angle90^\circ$ in rectangular form.`, a: r`$j2$.` },
      ],
    },
    {
      name: 'Powers of j',
      inShort: r`$j = \sqrt{-1}$, and its powers, which repeat every four.`,
      body: [
        r`$j$ is defined by $j^2 = -1$. Multiplying by $j$ turns an arrow $90^\circ$ counter-clockwise, so the powers of $j$ go round in fours:`,
        {
          type: 'phasor',
          axes: 'reim',
          alt: 'The four powers of j as unit arrows: 1 along the positive real axis, j up, minus 1 to the left, and minus j down. Each is the one before turned 90 degrees.',
          caption: 'Each multiplication by j turns the arrow 90°: 1, j, −1, −j, then back to 1.',
          vectors: [
            { mag: 1, angle: 0, label: '1', colour: 0 },
            { mag: 1, angle: 90, label: 'j', colour: 1 },
            { mag: 1, angle: 180, label: '−1', colour: 2 },
            { mag: 1, angle: 270, label: '−j', colour: 3 },
          ],
        },
        r`| $n \bmod 4$ | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| $j^n$ | 1 | $j$ | $-1$ | $-j$ |

Divide the power by 4 and keep the remainder. Any four consecutive powers add to zero, and $\frac1j = -j$ (multiply top and bottom by $j$). Mathematicians write $i$; electrical work uses $j$ because $i$ is current.`,
      ],
      keyIdeas: [
        r`$j^2 = -1$, $j^3 = -j$, $j^4 = 1$: reduce the power modulo $4$.`,
        r`$\frac1j = -j$; four consecutive powers add to $0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two large powers',
          problem: r`Simplify $j^{2027} + j^{100}$.`,
          steps: [
            r`$2027 = 4(506) + 3$, so $j^{2027} = -j$.`,
            r`$100$ is a multiple of $4$, so $j^{100} = 1$.`,
          ],
          answer: r`$1 - j$.`,
        },
        {
          level: 'board',
          title: 'A sum, a reciprocal, a power',
          problem: r`Simplify (a) $j^{57} + j^{58} + j^{60}$, (b) $\frac{1}{j^3}$, (c) $(1 + j)^8$.`,
          steps: [
            r`(a) Remainders 1, 2, 0: $j - 1 + 1 = j$.`,
            r`(b) $j^3 = -j$, so $\frac{1}{-j} = \frac{j}{-j^2} = j$.`,
            r`(c) $(1 + j)^2 = 1 + j2 + j^2 = j2$, so $(1 + j)^8 = (j2)^4 = 16j^4 = 16$.`,
          ],
          answer: r`(a) $j$; (b) $j$; (c) 16.`,
        },
      ],
      traps: [
        r`$\sqrt{-4}\sqrt{-9}$ is $(j2)(j3) = -6$, not $\sqrt{36} = 6$: take out the $j$ first.`,
        r`Negative powers too: $j^{-1} = -j$, not $j$.`,
      ],
      check: [
        { q: r`What is $j^{23}$?`, a: r`$23 = 4(5) + 3$: $-j$.` },
        { q: r`What is $j + j^2 + j^3 + j^4$?`, a: r`$0$.` },
      ],
    },
    {
      name: 'Complex Arithmetic',
      inShort: r`Adding, subtracting, multiplying and dividing complex numbers.`,
      body: [
        r`**Add and subtract** part by part. On the plane that is placing arrows tip to tail:`,
        {
          type: 'phasor',
          axes: 'reim',
          alt: 'Adding 3 plus j1 and 1 plus j3 tip to tail: the first arrow from the origin, the second from its tip, and the dashed sum from the origin to 4 plus j4.',
          caption: 'z₁ = 3 + j1 plus z₂ = 1 + j3 is 4 + j4: the second arrow starts at the tip of the first.',
          vectors: [
            { name: 'a', mag: Math.hypot(3, 1), angle: deg(Math.atan2(1, 3)), label: 'z₁', colour: 1, labelAt: 'mid' },
            { mag: Math.hypot(1, 3), angle: deg(Math.atan2(3, 1)), from: 'a', label: 'z₂', colour: 2 },
            { mag: Math.hypot(4, 4), angle: 45, label: 'z₁ + z₂', dashed: true, colour: 0 },
          ],
        },
        r`**Multiply** rectangular forms out like binomials, with $j^2 = -1$: $(a + jb)(c + jd) = (ac - bd) + j(ad + bc)$. **Divide** by multiplying top and bottom by the denominator's conjugate, which makes the denominator real.

In polar form multiplication and division are quicker: **multiply the moduli and add the angles**; **divide the moduli and subtract the angles**. So add in rectangular, multiply in polar, and convert when the item mixes them.`,
      ],
      keyIdeas: [
        r`Add and subtract part by part; multiply out with $j^2 = -1$.`,
        r`Divide by multiplying top and bottom by the denominator's conjugate.`,
        r`Polar: multiply the moduli and add the angles; divide the moduli and subtract them.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A quotient',
          problem: r`Evaluate $\frac{3 - j2}{1 + j}$.`,
          steps: [
            r`Multiply by the conjugate: $\frac{(3 - j2)(1 - j)}{(1 + j)(1 - j)}$.`,
            r`$= \frac{3 - j3 - j2 + 2j^2}{2} = \frac{1 - j5}{2}$.`,
          ],
          answer: r`$0.5 - j2.5$.`,
        },
        {
          level: 'board',
          title: 'A product, and a polar chain',
          problem: r`Evaluate (a) $(2 + j3)(4 - j5)$ and (b) $\frac{(6\angle40^\circ)(2\angle{-15^\circ})}{3\angle10^\circ}$ in rectangular form.`,
          steps: [
            r`(a) $8 - j10 + j12 - 15j^2 = 23 + j2$.`,
            r`(b) Moduli: $\frac{6 \times 2}{3} = 4$; angles: $40 - 15 - 10 = 15^\circ$.`,
            r`$4\angle15^\circ = 3.864 + j1.035$.`,
          ],
          answer: r`(a) $23 + j2$; (b) $3.864 + j1.035$.`,
        },
      ],
      traps: [
        r`$(a + jb)(c + jd)$ has real part $ac - bd$: the $j^2$ makes the minus.`,
        r`Adding polar forms by adding moduli is wrong unless the angles match.`,
      ],
      check: [
        { q: r`What is $(5\angle20^\circ)(2\angle70^\circ)$?`, a: r`$10\angle90^\circ = j10$.` },
        { q: r`Why multiply by the conjugate to divide?`, a: r`It makes the denominator real: $(c + jd)(c - jd) = c^2 + d^2$.` },
      ],
    },
    {
      name: 'Conjugate and Modulus',
      inShort: r`The mirror image $\bar z = x - jy$, and the size $|z|$.`,
      body: [
        r`The **conjugate** $\bar z$ (also written $z^*$) flips the sign of the imaginary part: the mirror image in the real axis, with the angle negated.`,
        {
          type: 'phasor',
          axes: 'reim',
          alt: 'The number 3 plus j4 and its conjugate 3 minus j4, mirror images of each other in the real axis, both of length 5.',
          caption: 'z = 3 + j4 and its conjugate z* = 3 − j4: same length, angles of opposite sign.',
          vectors: [
            { mag: 5, angle: deg(Math.atan2(4, 3)), label: 'z', colour: 0 },
            { mag: 5, angle: -deg(Math.atan2(4, 3)), label: 'z*', colour: 1 },
          ],
        },
        r`| Fact | Use |
|---|---|
| $z\bar z = x^2 + y^2 = |z|^2$ | dividing; finding a modulus |
| $z + \bar z = 2x$, $z - \bar z = j2y$ | pulling out the real or imaginary part |
| $\overline{r\angle\theta} = r\angle{-\theta}$ | conjugating in polar form |
| $|z_1z_2| = |z_1||z_2|$, $\left|\frac{z_1}{z_2}\right| = \frac{|z_1|}{|z_2|}$ | moduli without multiplying out |
| $|z_1 + z_2| \le |z_1| + |z_2|$ | the triangle inequality |
| $|z_1 - z_2|$ | the distance between two points |`,
      ],
      keyIdeas: [
        r`$z\bar z = |z|^2$; $z + \bar z = 2x$; the conjugate of $r\angle\theta$ is $r\angle{-\theta}$.`,
        r`$|z_1z_2| = |z_1||z_2|$ and $\left|\frac{z_1}{z_2}\right| = \frac{|z_1|}{|z_2|}$, but $|z_1 + z_2| \le |z_1| + |z_2|$.`,
        r`$|z_1 - z_2|$ is the distance between the two points.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The modulus of a product',
          problem: r`Find $|(3 + j4)(5 - j12)|$.`,
          steps: [r`Multiply the moduli: $5 \times 13 = 65$, no need to multiply the numbers out.`],
          answer: r`65.`,
        },
        {
          level: 'board',
          title: 'Distance, a missing modulus, and z from its conjugate',
          problem: r`(a) How far apart are $2 + j$ and $5 + j5$? (b) $A = 3 - j4$ and $|AB| = 20$. Find $|B|$. (c) $z + \bar z = 6$ and $z\bar z = 25$. Find $z$.`,
          steps: [
            r`(a) $|(5 + j5) - (2 + j)| = |3 + j4| = 5$.`,
            r`(b) $|A||B| = 20$ with $|A| = 5$, so $|B| = 4$.`,
            r`(c) $2x = 6$ gives $x = 3$; $x^2 + y^2 = 25$ gives $y = \pm4$: $z = 3 \pm j4$.`,
          ],
          answer: r`(a) 5; (b) 4; (c) $3 + j4$ or $3 - j4$.`,
        },
      ],
      traps: [
        r`$|3 + j4| = 5$, not $7$ and not $3 + 4j$.`,
        r`The conjugate flips only the imaginary part: $\overline{-3 + j4} = -3 - j4$, not $3 - j4$.`,
      ],
      check: [
        { q: r`What is $(2 + j5)(2 - j5)$?`, a: r`$4 + 25 = 29$.` },
        { q: r`What is the conjugate of $7\angle{-25^\circ}$?`, a: r`$7\angle25^\circ$.` },
      ],
    },
    {
      name: "De Moivre's Theorem",
      inShort: r`Powers of a complex number in polar form: raise the modulus, multiply the angle.`,
      body: [
        r`Multiplying adds angles, so raising to the $n$th power multiplies the angle by $n$ (**De Moivre**):
$$(r\angle\theta)^n = r^n\angle n\theta, \qquad (\cos\theta + j\sin\theta)^n = \cos n\theta + j\sin n\theta.$$
Powers of $1 + j = \sqrt2\angle45^\circ$ spiral outward, each $45^\circ$ further round and $\sqrt2$ times longer:`,
        {
          type: 'phasor',
          axes: 'reim',
          alt: 'The powers of 1 plus j: the first at 45 degrees with length about 1.41, the square j2 at 90 degrees, the cube at 135 degrees with length about 2.83, and the fourth power, minus 4, at 180 degrees.',
          caption: 'Powers 1 to 4 of 1 + j: each turns 45° further and grows by √2, reaching −4 at the fourth power.',
          vectors: [
            { mag: Math.SQRT2, angle: 45, label: '1', colour: 0 },
            { mag: 2, angle: 90, label: '2', colour: 1 },
            { mag: 2 * Math.SQRT2, angle: 135, label: '3', colour: 2 },
            { mag: 4, angle: 180, label: '4', colour: 3 },
          ],
        },
        r`Expanding the left side of De Moivre's formula by the binomial theorem and matching real and imaginary parts gives the multiple-angle formulas: from $n = 3$, $\cos3\theta = 4\cos^3\theta - 3\cos\theta$.`,
      ],
      keyIdeas: [
        r`$(r\angle\theta)^n = r^n\angle n\theta$.`,
        r`$(1 + j)^n = 2^{n/2}\angle45^\circ n$.`,
        r`Expanding $(\cos\theta + j\sin\theta)^n$ gives the multiple-angle formulas.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A tenth power',
          problem: r`Evaluate $(1 + j)^{10}$.`,
          steps: [
            r`$1 + j = \sqrt2\angle45^\circ$.`,
            r`$(1 + j)^{10} = 2^5\angle450^\circ = 32\angle90^\circ$.`,
          ],
          answer: r`$j32$.`,
        },
        {
          level: 'board',
          title: 'Two more powers',
          problem: r`Evaluate (a) $(\sqrt3 + j)^6$ and (b) $(2\angle20^\circ)^5$ in rectangular form.`,
          steps: [
            r`(a) $\sqrt3 + j = 2\angle30^\circ$, so the sixth power is $64\angle180^\circ = -64$.`,
            r`(b) $2^5\angle(5 \times 20^\circ) = 32\angle100^\circ$.`,
            r`$= 32\cos100^\circ + j32\sin100^\circ = -5.557 + j31.51$.`,
          ],
          answer: r`(a) $-64$; (b) $-5.557 + j31.51$.`,
        },
      ],
      traps: [
        r`Raise $r$ to the power too; $(\sqrt2)^{10} = 32$, not $\sqrt2$.`,
        r`Reduce a large angle by whole turns before converting: $450^\circ$ is $90^\circ$.`,
      ],
      check: [
        { q: r`What is $(1\angle30^\circ)^{12}$?`, a: r`$1\angle360^\circ = 1$.` },
        { q: r`What is $(2\angle45^\circ)^4$?`, a: r`$16\angle180^\circ = -16$.` },
      ],
    },
    {
      name: 'Roots of Complex Numbers',
      inShort: r`The $n$ distinct $n$th roots of a complex number, evenly spaced on a circle.`,
      body: [
        r`De Moivre run backwards gives roots. Because the angle $\theta$ is the same point as $\theta + 360^\circ k$, there are exactly $n$ different $n$th roots:
$$z^{1/n} = r^{1/n}\angle\frac{\theta + 360^\circ k}{n}, \qquad k = 0, 1, \ldots, n - 1.$$
They lie on a circle of radius $r^{1/n}$, $\frac{360^\circ}{n}$ apart; $k = 0$ gives the **principal** root, the one the calculator shows. The cube roots of $-8$:`,
        {
          type: 'phasor',
          axes: 'reim',
          alt: 'The three cube roots of minus 8, each of length 2: at 60 degrees, at 180 degrees, and at 300 degrees, evenly spaced 120 degrees apart.',
          caption: 'The cube roots of −8 = 8∠180°: 2∠60°, 2∠180° and 2∠300°, 120° apart.',
          vectors: [
            { mag: 2, angle: 60, label: '1 + j1.732', colour: 0 },
            { mag: 2, angle: 180, label: '−2', colour: 1 },
            { mag: 2, angle: 300, label: '1 − j1.732', colour: 2 },
          ],
        },
        r`The $n$th roots of unity add to zero. The cube roots of 1 are $1$, $a = 1\angle120^\circ$ and $a^2 = 1\angle240^\circ$, the three-phase operator of power systems: $1 + a + a^2 = 0$.`,
      ],
      keyIdeas: [
        r`$z^{1/n} = r^{1/n}\angle\frac{\theta + 360^\circ k}{n}$ for $k = 0, \ldots, n - 1$.`,
        r`The roots of unity sum to $0$; $1 + \omega + \omega^2 = 0$ for the cube roots.`,
        r`The three-phase operator $a = 1\angle120^\circ$ is a cube root of unity.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Cube roots of −8',
          problem: r`Find the cube roots of $-8$.`,
          steps: [
            r`$-8 = 8\angle180^\circ$; $\sqrt[3]8 = 2$ and the angles are $\frac{180 + 360k}{3}$.`,
            r`Roots $2\angle60^\circ$, $2\angle180^\circ$, $2\angle300^\circ$.`,
          ],
          answer: r`$1 + j\sqrt3$, $-2$ and $1 - j\sqrt3$.`,
        },
        {
          level: 'board',
          title: 'Square roots, fourth roots',
          problem: r`Find (a) the square roots of $5 + j12$ and (b) the four fourth roots of $-16$, with the principal one in rectangular form.`,
          steps: [
            r`(a) $5 + j12 = 13\angle67.38^\circ$, so the roots are $\sqrt{13}\angle33.69^\circ$ and $\sqrt{13}\angle213.69^\circ$: $3 + j2$ and $-3 - j2$. Check: $(3 + j2)^2 = 9 + j12 - 4 = 5 + j12$.`,
            r`(b) $-16 = 16\angle180^\circ$: $2\angle45^\circ$, $2\angle135^\circ$, $2\angle225^\circ$, $2\angle315^\circ$.`,
            r`Principal: $2\angle45^\circ = 1.414 + j1.414$.`,
          ],
          answer: r`(a) $\pm(3 + j2)$; (b) $2\angle45^\circ$, $2\angle135^\circ$, $2\angle225^\circ$, $2\angle315^\circ$; principal $1.414 + j1.414$.`,
        },
      ],
      traps: [
        r`A calculator gives only the principal root; the others are $\frac{360^\circ}{n}$ apart.`,
        r`Take the real $n$th root of the modulus: $\sqrt[4]{16} = 2$, not 4.`,
      ],
      check: [
        { q: r`How many sixth roots has a nonzero complex number, and how far apart are they?`, a: r`Six, $60^\circ$ apart.` },
        { q: r`What is $1 + a + a^2$ for $a = 1\angle120^\circ$?`, a: r`$0$.` },
      ],
    },
    {
      name: "Euler's Formula",
      inShort: r`$e^{j\theta} = \cos\theta + j\sin\theta$, the bridge between exponentials and trigonometry.`,
      body: [
        r`**Euler's formula** joins the exponential and the circle:
$$e^{j\theta} = \cos\theta + j\sin\theta \quad (\theta \text{ in radians}).$$
So $re^{j\theta}$ is just $r\angle\theta$, and the exponent rules become the polar rules: $e^{ja}e^{jb} = e^{j(a + b)}$ multiplies by adding angles. Adding and subtracting it with $e^{-j\theta}$ gives
$$\cos\theta = \frac{e^{j\theta} + e^{-j\theta}}{2}, \qquad \sin\theta = \frac{e^{j\theta} - e^{-j\theta}}{j2}.$$

| Value | Result |
|---|---|
| $e^{j\pi}$ | $-1$, so $e^{j\pi} + 1 = 0$ |
| $e^{j\pi/2}$ | $j$ |
| $|e^{j\theta}|$ | $1$ for every real $\theta$ |
| $j^j = e^{j\ln j} = e^{j(j\pi/2)}$ | $e^{-\pi/2} \approx 0.2079$, a real number |

A sinusoid $V_m\cos(\omega t + \phi)$ is the real part of $V_me^{j\phi}e^{j\omega t}$: the phasor is the $V_me^{j\phi}$.`,
      ],
      keyIdeas: [
        r`$\cos\theta = \frac{e^{j\theta} + e^{-j\theta}}{2}$, $\sin\theta = \frac{e^{j\theta} - e^{-j\theta}}{j2}$.`,
        r`$e^{j\pi} + 1 = 0$, $e^{j\pi/2} = j$; $|e^{j\theta}| = 1$.`,
        r`$j^j = e^{-\pi/2} \approx 0.2079$, a real number.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Exponential to rectangular',
          problem: r`Write $2e^{j3\pi/4}$ in rectangular form.`,
          steps: [
            r`$2\left(\cos\frac{3\pi}{4} + j\sin\frac{3\pi}{4}\right) = 2\left(-\frac{\sqrt2}{2} + j\frac{\sqrt2}{2}\right)$.`,
          ],
          answer: r`$-1.414 + j1.414$.`,
        },
        {
          level: 'board',
          title: 'Products, sums and a conversion',
          problem: r`Evaluate (a) $3e^{j\pi/6} \cdot 2e^{j\pi/3}$, (b) $e^{j2} + e^{-j2}$, (c) $4\angle{-60^\circ}$ in exponential and rectangular form.`,
          steps: [
            r`(a) $6e^{j(\pi/6 + \pi/3)} = 6e^{j\pi/2} = j6$.`,
            r`(b) $2\cos 2 = -0.8323$ (2 radians).`,
            r`(c) $4e^{-j\pi/3} = 4\cos60^\circ - j4\sin60^\circ = 2 - j3.464$.`,
          ],
          answer: r`(a) $j6$; (b) $-0.8323$; (c) $4e^{-j\pi/3} = 2 - j3.464$.`,
        },
      ],
      traps: [
        r`The exponent's angle is in radians; $e^{j30}$ is not $1\angle30^\circ$.`,
        r`$e^{j\theta} + e^{-j\theta}$ is real: the imaginary parts cancel.`,
      ],
      check: [
        { q: r`What is $e^{j\pi}$?`, a: r`$-1$.` },
        { q: r`What is $|5e^{j1.2}|$?`, a: r`$5$.` },
      ],
    },
    {
      name: 'Logarithms of Complex Numbers',
      inShort: r`Logarithms and powers of complex numbers, through the polar form.`,
      body: [
        r`Write $z = re^{j\theta}$ and take logarithms: the modulus gives the real part and the angle the imaginary part.
$$\ln z = \ln r + j(\theta + 2\pi k), \qquad \log z = \log r + j\,0.4343\,\theta.$$
The angle is in radians; $0.4343 = \log e$ converts the natural log's $j\theta$ to base 10. Each $k$ gives another value; the **principal** value has $-\pi < \theta \le \pi$, so a negative real number has $\ln(-x) = \ln x + j\pi$.

Complex powers follow from logarithms: $z^w = e^{w\ln z}$. Raise $e$ to the real part for the modulus, and read the imaginary part as the angle in radians.`,
      ],
      keyIdeas: [
        r`$\ln z = \ln r + j(\theta + 2\pi k)$; the principal value has $-\pi < \theta \le \pi$.`,
        r`$\ln(-x) = \ln x + j\pi$ for $x > 0$.`,
        r`$z^w = e^{w\ln z}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A natural log',
          problem: r`Find the principal value of $\ln(-1 + j)$.`,
          steps: [
            r`$r = \sqrt2$ and $\theta = \frac{3\pi}{4}$.`,
            r`$\ln\sqrt2 + j\frac{3\pi}{4} = 0.3466 + j2.3562$.`,
          ],
          answer: r`$0.3466 + j2.3562$.`,
        },
        {
          level: 'board',
          title: 'Natural and common logs, and a complex power',
          problem: r`Find (a) $\ln(3 + j4)$ and $\log(3 + j4)$, and (b) the principal value of $(1 + j)^{1 - j}$.`,
          steps: [
            r`(a) $r = 5$, $\theta = 0.9273$ rad: $\ln = 1.6094 + j0.9273$; $\log = 0.6990 + j(0.4343)(0.9273) = 0.6990 + j0.4027$.`,
            r`(b) $\ln(1 + j) = 0.3466 + j0.7854$; times $(1 - j)$: $1.1320 + j0.4388$.`,
            r`$e^{1.1320} = 3.1018$ at $0.4388$ rad $= 25.14^\circ$: $2.8079 + j1.3179$.`,
          ],
          answer: r`(a) $1.6094 + j0.9273$ and $0.6990 + j0.4027$; (b) about $2.8079 + j1.3179$.`,
        },
      ],
      traps: [
        r`The imaginary part is the angle in radians: $135^\circ$ becomes $2.3562$.`,
        r`For a base-10 log, scale the angle by $0.4343$ too, not only the modulus.`,
      ],
      check: [
        { q: r`What is $\ln(-5)$?`, a: r`$\ln5 + j\pi \approx 1.6094 + j3.1416$.` },
        { q: r`What is $\ln j$?`, a: r`$j\frac{\pi}{2}$.` },
      ],
    },
    {
      name: 'Trigonometric and Hyperbolic Functions',
      inShort: r`Circular and hyperbolic functions of a complex argument, and how they trade places.`,
      body: [
        r`With Euler's formula, sine and cosine take complex arguments, and the circular and hyperbolic functions trade places on the imaginary axis:

| Identity | Imaginary argument |
|---|---|
| $\sin jy = j\sinh y$ | $\sinh jx = j\sin x$ |
| $\cos jy = \cosh y$ | $\cosh jx = \cos x$ |

The addition formulas then split any value into real and imaginary parts:
$$\sin(x + jy) = \sin x\cosh y + j\cos x\sinh y,$$
$$\cos(x + jy) = \cos x\cosh y - j\sin x\sinh y,$$
$$\sinh(x + jy) = \sinh x\cos y + j\cosh x\sin y,$$
$$\cosh(x + jy) = \cosh x\cos y + j\sinh x\sin y.$$
Tangents follow by division. The last one carries the long-transmission-line equations, where $\cosh\gamma\ell$ has a complex argument. Unlike real ones, complex sines and cosines grow without bound.`,
      ],
      keyIdeas: [
        r`$\sin(x + jy) = \sin x\cosh y + j\cos x\sinh y$; $\cos(x + jy) = \cos x\cosh y - j\sin x\sinh y$.`,
        r`$\sin jy = j\sinh y$, $\cos jy = \cosh y$; $\sinh jx = j\sin x$, $\cosh jx = \cos x$.`,
        r`$\cosh(x + jy) = \cosh x\cos y + j\sinh x\sin y$, as in long-line equations.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A complex cosine',
          problem: r`Evaluate $\cos\left(\frac{\pi}{2} + j1\right)$.`,
          steps: [r`$\cos\frac{\pi}{2}\cosh1 - j\sin\frac{\pi}{2}\sinh1 = 0 - j(1.1752)$.`],
          answer: r`$-j1.1752$.`,
        },
        {
          level: 'board',
          title: 'A sine and a hyperbolic cosine',
          problem: r`Evaluate (a) $\sin(1 + j2)$ and (b) $\cosh(2 + j1)$, angles in radians.`,
          steps: [
            r`(a) $\sin1\cosh2 + j\cos1\sinh2 = (0.8415)(3.7622) + j(0.5403)(3.6269) = 3.1658 + j1.9596$.`,
            r`(b) $\cosh2\cos1 + j\sinh2\sin1 = (3.7622)(0.5403) + j(3.6269)(0.8415) = 2.0327 + j3.0519$.`,
          ],
          answer: r`(a) $3.1658 + j1.9596$; (b) $2.0327 + j3.0519$.`,
        },
      ],
      traps: [
        r`$|\sin z|$ is not bounded by $1$ once $z$ is complex.`,
        r`Set the calculator to radians: the real part's $\sin1$ is 1 radian.`,
      ],
      check: [
        { q: r`What is $\cos j1$?`, a: r`$\cosh 1 \approx 1.5431$.` },
        { q: r`What is $\sinh j\frac{\pi}{2}$?`, a: r`$j\sin\frac{\pi}{2} = j$.` },
      ],
    },
    {
      name: 'Complex Equations',
      inShort: r`Equations in complex numbers: equating parts, complex roots, and loci.`,
      body: [
        r`Two complex numbers are equal only when both parts match, so one complex equation is **two real equations**: $a + jb = c + jd$ means $a = c$ and $b = d$. Get each side into $a + jb$ form first.

| Situation | Result |
|---|---|
| quadratic with $b^2 - 4ac < 0$ | roots $\frac{-b \pm j\sqrt{4ac - b^2}}{2a}$, a conjugate pair |
| polynomial with real coefficients | complex roots come in conjugate pairs |
| $|z - z_0| = r$ | a circle of radius $r$ about $z_0$ |
| $\arg(z - z_0) = \alpha$ | a ray from $z_0$ at angle $\alpha$ |

A known complex root of a real polynomial hands you its conjugate too; then sum and product of roots finish the job.`,
      ],
      keyIdeas: [
        r`$a + jb = c + jd$ means $a = c$ and $b = d$: two real equations.`,
        r`A negative discriminant gives conjugate roots $\frac{-b \pm j\sqrt{4ac - b^2}}{2a}$.`,
        r`Real polynomials have complex roots in conjugate pairs. $|z - z_0| = r$ is a circle.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Equating parts',
          problem: r`Solve $(x + jy)(2 - j) = 5 + j5$ for real $x$ and $y$.`,
          steps: [
            r`$x + jy = \frac{5 + j5}{2 - j} = \frac{(5 + j5)(2 + j)}{5} = \frac{5 + j15}{5}$.`,
            r`$= 1 + j3$.`,
          ],
          answer: r`$x = 1$, $y = 3$.`,
        },
        {
          level: 'board',
          title: 'Equating parts, a quadratic, a cubic',
          problem: r`(a) Solve $(3x + j2y)(1 + j) = 1 + j5$ for real $x$ and $y$. (b) Solve $z^2 - 4z + 13 = 0$. (c) $1 + j$ is a root of $x^3 - 4x^2 + 6x - 4 = 0$. Find the others.`,
          steps: [
            r`(a) $3x + j2y = \frac{(1 + j5)(1 - j)}{2} = \frac{6 + j4}{2} = 3 + j2$, so $x = 1$ and $y = 1$.`,
            r`(b) $z = \frac{4 \pm \sqrt{16 - 52}}{2} = \frac{4 \pm j6}{2} = 2 \pm j3$.`,
            r`(c) Real coefficients, so $1 - j$ is a root too. The roots add to 4: the third is $4 - 2 = 2$.`,
          ],
          answer: r`(a) $x = 1$, $y = 1$; (b) $2 \pm j3$; (c) $1 - j$ and $2$.`,
        },
      ],
      traps: [
        r`Equate parts only after everything is in the form $a + jb$.`,
        r`The conjugate-pair rule needs real coefficients.`,
      ],
      check: [
        { q: r`What does $|z - (1 + j)| = 2$ describe?`, a: r`A circle of radius 2 centred at $1 + j$.` },
        { q: r`A real cubic has roots $3$ and $2 - j$. What is the third?`, a: r`$2 + j$.` },
      ],
    },
    {
      name: 'Phasor Applications',
      inShort: r`Complex numbers at work in AC circuits: phasors, impedance and complex power.`,
      body: [
        r`A sinusoid of one frequency is carried by its **phasor**: $V_m\cos(\omega t + \phi) \leftrightarrow \frac{V_m}{\sqrt2}\angle\phi$ (rms). Resistors, inductors and capacitors become **impedances**, $R$, $j\omega L$ and $-\frac{j}{\omega C}$, which combine like resistances: in series they add, in parallel $\frac{Z_1Z_2}{Z_1 + Z_2}$. An impedance's resistance and reactance form a right triangle:`,
        {
          type: 'phasor',
          axes: false,
          alt: 'An impedance triangle: resistance 8 ohms along the base, reactance 6 ohms rising from its end, and the impedance 10 ohms from the start to the top at 36.87 degrees.',
          caption: 'The impedance triangle of 8 Ω in series with X = 6 Ω: Z = 8 + j6 = 10∠36.87° Ω.',
          vectors: [
            { name: 'R', mag: 8, angle: 0, label: 'R', colour: 1, labelAt: 'mid' },
            { mag: 6, angle: 90, from: 'R', label: 'X', colour: 2 },
            { mag: 10, angle: deg(Math.atan2(6, 8)), label: 'Z', labelAt: 'mid' },
          ],
          arcs: [{ from: 0, to: deg(Math.atan2(6, 8)), label: 'θ', r: 46 }],
        },
        r`Power in complex form is $\mathbf S = \mathbf V\mathbf I^* = P + jQ$ (VA): $P$ in watts, $Q$ in vars, positive for a lagging (inductive) load. The power factor is $\frac{P}{|\mathbf S|} = \cos\theta$. Electric Circuits 2 takes this further.`,
      ],
      keyIdeas: [
        r`$V_m\cos(\omega t + \phi) \leftrightarrow \frac{V_m}{\sqrt2}\angle\phi$ (rms).`,
        r`$Z_L = j\omega L$, $Z_C = -\frac{j}{\omega C}$; impedances combine like resistances.`,
        r`$\mathbf S = \mathbf V\mathbf I^* = P + jQ$; power factor $\frac{P}{|\mathbf S|}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A series circuit',
          problem: r`A $100$ V source feeds $8\ \Omega$ in series with $X_L = 6\ \Omega$. Find the current, the complex power and the power factor.`,
          steps: [
            r`$Z = 8 + j6 = 10\angle36.87^\circ$, so $\mathbf I = 10\angle{-36.87^\circ}$ A.`,
            r`$\mathbf S = 100 \times 10\angle36.87^\circ = 800 + j600$ VA; pf $= 0.8$ lagging.`,
          ],
          answer: r`$10\angle{-36.87^\circ}$ A; $800 + j600$ VA; 0.8 lagging.`,
        },
        {
          level: 'board',
          title: 'Two impedances in parallel',
          problem: r`$Z_1 = 10\angle30^\circ$ and $Z_2 = 5\angle{-60^\circ}\ \Omega$ are in parallel across $120\angle0^\circ$ V. Find the combined impedance, the current and the complex power.`,
          steps: [
            r`$Z_1 + Z_2 = (8.660 + j5) + (2.5 - j4.330) = 11.160 + j0.670 = 11.18\angle3.43^\circ$.`,
            r`$Z = \frac{50\angle{-30^\circ}}{11.18\angle3.43^\circ} = 4.472\angle{-33.43^\circ} = 3.732 - j2.464\ \Omega$.`,
            r`$\mathbf I = \frac{120}{4.472\angle{-33.43^\circ}} = 26.83\angle33.43^\circ$ A.`,
            r`$\mathbf S = 120 \times 26.83\angle{-33.43^\circ} = 2687 - j1774$ VA: leading, capacitive.`,
          ],
          answer: r`$4.472\angle{-33.43^\circ}\ \Omega$; $26.83\angle33.43^\circ$ A; $2687 - j1774$ VA.`,
        },
      ],
      traps: [
        r`Conjugate the current in $\mathbf S = \mathbf V\mathbf I^*$; without it the reactive power's sign flips.`,
        r`Parallel impedances use product over sum, not the sum.`,
      ],
      check: [
        { q: r`What is the impedance of a 10 mH coil at 60 Hz?`, a: r`$j2\pi(60)(0.01) = j3.77\ \Omega$.` },
        { q: r`A load draws $S = 600 - j800$ VA. What is its power factor?`, a: r`$\frac{600}{1000} = 0.6$ leading.` },
      ],
    },
  ],
};
