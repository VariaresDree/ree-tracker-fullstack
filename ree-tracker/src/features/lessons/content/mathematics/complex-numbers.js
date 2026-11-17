// Library › Lessons › Mathematics › Complex Numbers (2026-11-17): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand. j is the imaginary unit, as in electrical work.
const r = String.raw;

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
      keyIdeas: [
        r`$r = \sqrt{x^2 + y^2}$, $\theta = \tan^{-1}\frac{y}{x}$; back: $x = r\cos\theta$, $y = r\sin\theta$.`,
        r`Add $180^\circ$ to the inverse tangent when $x < 0$ (QII and QIII).`,
        r`Exponential form $re^{j\theta}$ needs $\theta$ in radians.`,
      ],
      example: {
        problem: r`Write $-3 - j4$ in polar form, and $10\angle30^\circ$ in rectangular form.`,
        solution: r`$r = 5$; $\tan^{-1}\frac{-4}{-3} = 53.13^\circ$, but the point is in QIII: $\theta = 233.13^\circ$ ($-126.87^\circ$). And $10\angle30^\circ = 8.660 + j5$.`,
      },
      traps: [r`$\tan^{-1}\frac{y}{x}$ cannot tell $3 + j4$ from $-3 - j4$; the signs of $x$ and $y$ can.`],
    },
    {
      name: 'Powers of j',
      inShort: r`$j = \sqrt{-1}$, and its powers, which repeat every four.`,
      keyIdeas: [
        r`$j^2 = -1$, $j^3 = -j$, $j^4 = 1$: reduce the power modulo $4$.`,
        r`$\frac1j = -j$; four consecutive powers add to $0$.`,
      ],
      example: {
        problem: r`Simplify $j^{2027} + j^{100}$.`,
        solution: r`$2027 = 4(506) + 3$, so $j^{2027} = -j$; $100$ is a multiple of $4$, so $j^{100} = 1$. The sum is $1 - j$.`,
      },
      traps: [r`$\sqrt{-4}\sqrt{-9}$ is $(j2)(j3) = -6$, not $\sqrt{36} = 6$: take out the $j$ first.`],
    },
    {
      name: 'Complex Arithmetic',
      inShort: r`Adding, subtracting, multiplying and dividing complex numbers.`,
      keyIdeas: [
        r`Add and subtract part by part; multiply out with $j^2 = -1$.`,
        r`Divide by multiplying top and bottom by the denominator's conjugate.`,
        r`Polar: multiply the moduli and add the angles; divide the moduli and subtract them.`,
      ],
      example: {
        problem: r`Evaluate $\frac{3 - j2}{1 + j}$.`,
        solution: r`$\frac{(3 - j2)(1 - j)}{(1 + j)(1 - j)} = \frac{3 - j3 - j2 + j^2 2}{2} = \frac{1 - j5}{2} = 0.5 - j2.5$.`,
      },
      traps: [r`$(a + jb)(c + jd)$ has real part $ac - bd$: the $j^2$ makes the minus.`],
    },
    {
      name: 'Conjugate and Modulus',
      inShort: r`The mirror image $\bar z = x - jy$, and the size $|z|$.`,
      keyIdeas: [
        r`$z\bar z = |z|^2$; $z + \bar z = 2x$; the conjugate of $r\angle\theta$ is $r\angle{-\theta}$.`,
        r`$|z_1z_2| = |z_1||z_2|$ and $\left|\frac{z_1}{z_2}\right| = \frac{|z_1|}{|z_2|}$, but $|z_1 + z_2| \le |z_1| + |z_2|$.`,
        r`$|z_1 - z_2|$ is the distance between the two points.`,
      ],
      example: {
        problem: r`Find $|(3 + j4)(5 - j12)|$.`,
        solution: r`Multiply the moduli: $5 \times 13 = 65$. No need to multiply the numbers out.`,
      },
      traps: [r`$|3 + j4| = 5$, not $7$ and not $3 + 4j$.`],
    },
    {
      name: "De Moivre's Theorem",
      inShort: r`Powers of a complex number in polar form: raise the modulus, multiply the angle.`,
      keyIdeas: [
        r`$(r\angle\theta)^n = r^n\angle n\theta$.`,
        r`$(1 + j)^n = 2^{n/2}\angle45^\circ n$.`,
        r`Expanding $(\cos\theta + j\sin\theta)^n$ gives the multiple-angle formulas.`,
      ],
      example: {
        problem: r`Evaluate $(1 + j)^{10}$.`,
        solution: r`$1 + j = \sqrt2\angle45^\circ$, so $(1 + j)^{10} = 2^5\angle450^\circ = 32\angle90^\circ = j32$.`,
      },
      traps: [r`Raise $r$ to the power too; $(\sqrt2)^{10} = 32$, not $\sqrt2$.`],
    },
    {
      name: 'Roots of Complex Numbers',
      inShort: r`The $n$ distinct $n$th roots of a complex number, evenly spaced on a circle.`,
      keyIdeas: [
        r`$z^{1/n} = r^{1/n}\angle\frac{\theta + 360^\circ k}{n}$ for $k = 0, \ldots, n - 1$.`,
        r`The roots of unity sum to $0$; $1 + \omega + \omega^2 = 0$ for the cube roots.`,
        r`The three-phase operator $a = 1\angle120^\circ$ is a cube root of unity.`,
      ],
      example: {
        problem: r`Find the cube roots of $-8$.`,
        solution: r`$-8 = 8\angle180^\circ$: roots $2\angle60^\circ$, $2\angle180^\circ$, $2\angle300^\circ$, that is $1 + j\sqrt3$, $-2$ and $1 - j\sqrt3$.`,
      },
      traps: [r`A calculator gives only the principal root; the others are $\frac{360^\circ}{n}$ apart.`],
    },
    {
      name: "Euler's Formula",
      inShort: r`$e^{j\theta} = \cos\theta + j\sin\theta$, the bridge between exponentials and trigonometry.`,
      keyIdeas: [
        r`$\cos\theta = \frac{e^{j\theta} + e^{-j\theta}}{2}$, $\sin\theta = \frac{e^{j\theta} - e^{-j\theta}}{j2}$.`,
        r`$e^{j\pi} + 1 = 0$, $e^{j\pi/2} = j$; $|e^{j\theta}| = 1$.`,
        r`$j^j = e^{-\pi/2} \approx 0.2079$, a real number.`,
      ],
      example: {
        problem: r`Write $2e^{j3\pi/4}$ in rectangular form.`,
        solution: r`$2\left(\cos\frac{3\pi}{4} + j\sin\frac{3\pi}{4}\right) = 2\left(-\frac{\sqrt2}{2} + j\frac{\sqrt2}{2}\right) = -1.414 + j1.414$.`,
      },
      traps: [r`The exponent's angle is in radians; $e^{j30}$ is not $1\angle30^\circ$.`],
    },
    {
      name: 'Logarithms of Complex Numbers',
      inShort: r`Logarithms and powers of complex numbers, through the polar form.`,
      keyIdeas: [
        r`$\ln z = \ln r + j(\theta + 2\pi k)$; the principal value has $-\pi < \theta \le \pi$.`,
        r`$\ln(-x) = \ln x + j\pi$ for $x > 0$.`,
        r`$z^w = e^{w\ln z}$.`,
      ],
      example: {
        problem: r`Find the principal value of $\ln(-1 + j)$.`,
        solution: r`$r = \sqrt2$ and $\theta = \frac{3\pi}{4}$: $\ln\sqrt2 + j\frac{3\pi}{4} = 0.3466 + j2.3562$.`,
      },
      traps: [r`The imaginary part is the angle in radians: $135^\circ$ becomes $2.3562$.`],
    },
    {
      name: 'Trigonometric and Hyperbolic Functions',
      inShort: r`Circular and hyperbolic functions of a complex argument, and how they trade places.`,
      keyIdeas: [
        r`$\sin(x + jy) = \sin x\cosh y + j\cos x\sinh y$; $\cos(x + jy) = \cos x\cosh y - j\sin x\sinh y$.`,
        r`$\sin jy = j\sinh y$, $\cos jy = \cosh y$; $\sinh jx = j\sin x$, $\cosh jx = \cos x$.`,
        r`$\cosh(x + jy) = \cosh x\cos y + j\sinh x\sin y$, as in long-line equations.`,
      ],
      example: {
        problem: r`Evaluate $\cos\left(\frac{\pi}{2} + j1\right)$.`,
        solution: r`$\cos\frac{\pi}{2}\cosh1 - j\sin\frac{\pi}{2}\sinh1 = 0 - j(1.1752) = -j1.1752$.`,
      },
      traps: [r`$|\sin z|$ is not bounded by $1$ once $z$ is complex.`],
    },
    {
      name: 'Complex Equations',
      inShort: r`Equations in complex numbers: equating parts, complex roots, and loci.`,
      keyIdeas: [
        r`$a + jb = c + jd$ means $a = c$ and $b = d$: two real equations.`,
        r`A negative discriminant gives conjugate roots $\frac{-b \pm j\sqrt{4ac - b^2}}{2a}$.`,
        r`Real polynomials have complex roots in conjugate pairs. $|z - z_0| = r$ is a circle.`,
      ],
      example: {
        problem: r`Solve $(x + jy)(2 - j) = 5 + j5$ for real $x$ and $y$.`,
        solution: r`$x + jy = \frac{5 + j5}{2 - j} = \frac{(5 + j5)(2 + j)}{5} = \frac{5 + j15}{5} = 1 + j3$: $x = 1$, $y = 3$.`,
      },
      traps: [r`Equate parts only after everything is in the form $a + jb$.`],
    },
    {
      name: 'Phasor Applications',
      inShort: r`Complex numbers at work in AC circuits: phasors, impedance and complex power.`,
      keyIdeas: [
        r`$V_m\cos(\omega t + \phi) \leftrightarrow \frac{V_m}{\sqrt2}\angle\phi$ (rms).`,
        r`$Z_L = j\omega L$, $Z_C = -\frac{j}{\omega C}$; impedances combine like resistances.`,
        r`$\mathbf S = \mathbf V\mathbf I^* = P + jQ$; power factor $\frac{P}{|\mathbf S|}$.`,
      ],
      example: {
        problem: r`A $100$ V source feeds $8\ \Omega$ in series with $X_L = 6\ \Omega$. Find the current, the complex power and the power factor.`,
        solution: r`$Z = 8 + j6 = 10\angle36.87^\circ$, so $\mathbf I = 10\angle{-36.87^\circ}$ A. $\mathbf S = 100 \times 10\angle36.87^\circ = 800 + j600$ VA; pf $= 0.8$ lagging.`,
      },
      traps: [r`Conjugate the current in $\mathbf S = \mathbf V\mathbf I^*$; without it the reactive power's sign flips.`],
    },
  ],
};
