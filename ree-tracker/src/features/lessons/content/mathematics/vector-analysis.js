// Library › Lessons › Mathematics › Vector Analysis (2026-11-17; every subtopic
// in the module format 2026-11-27, with figures, examples a step at a time and
// checks; every number re-worked by vectorAnalysisLesson.test.js. Coverage
// cross-checked against two review centers' vector handouts; the text,
// problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
// A plane vector (x, y) as a phasor's magnitude and angle in degrees.
export const polarOf = (x, y) => ({ mag: Math.hypot(x, y), angle: (Math.atan2(y, x) * 180) / Math.PI });

// The moving point of the derivatives figure: r = (3 cos t, 2 sin t) at t = π/4.
export const ORBIT_T = Math.PI / 4;
const P = [3 * Math.cos(ORBIT_T), 2 * Math.sin(ORBIT_T)];
const V = [-3 * Math.sin(ORBIT_T), 2 * Math.cos(ORBIT_T)];

// The gradient figure: level curves of f = x² + 2y², and ∇f at (2, 1).
export const GRAD_AT = [2, 1];
const G = [2 * GRAD_AT[0], 4 * GRAD_AT[1]];
const gLen = Math.hypot(...G);

export default {
  topic: 'Vector Analysis',
  subject: 'Mathematics',
  overview: r`Vectors carry size and direction, and vector calculus describes fields: how they change from point to point (gradient, divergence, curl) and how they add up along curves and over surfaces. It is the language of electromagnetics: Gauss's, Ampère's and Faraday's laws are the divergence and Stokes theorems at work. Do products in components, keep the order in cross products, and for the integral theorems check the orientation before you compute.`,
  sources: [
    'Schaum’s Outline of Vector Analysis (Spiegel, Lipschutz and Spellman)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Vector Algebra',
      inShort: r`Vectors in components: adding, scaling, lengths and unit vectors.`,
      body: [
        r`A **vector** has magnitude and direction (displacement, force, field strength); a **scalar** has magnitude only (temperature, energy, mass). In a right-handed system with unit vectors $\hat i, \hat j, \hat k$ along $x, y, z$,
$$\vec A = A_x\hat i + A_y\hat j + A_z\hat k, \qquad |\vec A| = \sqrt{A_x^2 + A_y^2 + A_z^2}, \qquad \hat a = \frac{\vec A}{|\vec A|}.$$
The vector from $P$ to $Q$ is head minus tail, $Q - P$. Two vectors are equal when their components are. They add component by component, which is the tip-to-tail rule:`,
        {
          type: 'phasor',
          alt: 'The vector A, 4 across and 1 up, drawn from the origin; the vector B, 1 across and 3 up, drawn from the tip of A; and the dashed resultant R from the origin to the tip of B, 5 across and 4 up.',
          caption: 'Tip to tail: A = (4, 1) then B = (1, 3) reach R = A + B = (5, 4) (dashed), whose length is √41 ≈ 6.40.',
          vectors: [
            { name: 'A', ...polarOf(4, 1), label: 'A', colour: 0 },
            { name: 'B', ...polarOf(1, 3), from: 'A', label: 'B', colour: 2 },
            { ...polarOf(5, 4), label: 'R', colour: 1, dashed: true, labelAt: 'tip' },
          ],
        },
        r`The **direction cosines** $\cos\alpha = \frac{A_x}{|\vec A|}$, $\cos\beta = \frac{A_y}{|\vec A|}$, $\cos\gamma = \frac{A_z}{|\vec A|}$ are the unit vector's components, so $\cos^2\alpha + \cos^2\beta + \cos^2\gamma = 1$. For two vectors at angle $\theta$, $|\vec A + \vec B| = \sqrt{A^2 + B^2 + 2AB\cos\theta}$.`,
      ],
      keyIdeas: [
        r`$\overrightarrow{PQ} = Q - P$; $|\vec A| = \sqrt{A_x^2 + A_y^2 + A_z^2}$; $\hat a = \frac{\vec A}{|\vec A|}$.`,
        r`Add part by part; $|\vec A + \vec B| = \sqrt{A^2 + B^2 + 2AB\cos\theta}$.`,
        r`Direction cosines are the unit vector's components; their squares add to 1.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A displacement',
          problem: r`Find the vector from $P(1, 2, -1)$ to $Q(4, 0, 4)$, its length, and the unit vector along it.`,
          steps: [
            r`$\overrightarrow{PQ} = (3, -2, 5)$, and $|\overrightarrow{PQ}| = \sqrt{38} \approx 6.164$.`,
            r`$\hat a = \frac{(3, -2, 5)}{\sqrt{38}}$.`,
          ],
          answer: r`$(3, -2, 5)$; about 6.164; $\frac{(3, -2, 5)}{\sqrt{38}}$.`,
        },
        {
          level: 'board',
          title: 'A unit vector, a resultant, direction angles',
          problem: r`(a) Find the unit vector along $2\hat i - 3\hat j + 6\hat k$. (b) Find the magnitude of the resultant of $3\hat i + \hat j - 2\hat k$, $-\hat i + 4\hat j + 2\hat k$ and $2\hat i - \hat j + 5\hat k$. (c) Find the direction angles of $2\hat i - 3\hat j + 6\hat k$.`,
          steps: [
            r`(a) Length $\sqrt{4 + 9 + 36} = 7$: $0.286\hat i - 0.429\hat j + 0.857\hat k$.`,
            r`(b) Sum $(4, 4, 5)$: $\sqrt{57} = 7.550$.`,
            r`(c) $\alpha = \cos^{-1}\frac27 = 73.40^\circ$, $\beta = \cos^{-1}\left(-\frac37\right) = 115.38^\circ$, $\gamma = \cos^{-1}\frac67 = 31.00^\circ$.`,
          ],
          answer: r`(a) $\frac{(2, -3, 6)}{7}$; (b) about 7.550; (c) $73.40^\circ$, $115.38^\circ$, $31.00^\circ$.`,
        },
      ],
      traps: [
        r`Head minus tail: $\overrightarrow{PQ}$ is $Q - P$, not $P - Q$.`,
        r`Magnitudes don't add: $|\vec A + \vec B| \le |\vec A| + |\vec B|$, equal only when they point the same way.`,
      ],
      check: [
        { q: r`Find the unit vector of $18\hat i + 3\hat j + 29\hat k$.`, a: r`Length $\sqrt{1174} = 34.26$: $0.525\hat i + 0.088\hat j + 0.846\hat k$.` },
        { q: r`What is $\cos^2\alpha + \cos^2\beta + \cos^2\gamma$ for any vector?`, a: r`$1$.` },
      ],
    },
    {
      name: 'Dot Product',
      inShort: r`The product that gives a number: angles, projections and work.`,
      body: [
        r`The **dot** (scalar) product multiplies matching components and adds:
$$\vec A\cdot\vec B = A_xB_x + A_yB_y + A_zB_z = |\vec A||\vec B|\cos\theta.$$
It is a number, commutative and distributive; for the unit vectors, $\hat i\cdot\hat i = 1$ and $\hat i\cdot\hat j = 0$. A zero dot product means **perpendicular**. Its geometric meaning is a **projection**: how far $\vec A$ reaches along $\vec B$:`,
        {
          type: 'phasor',
          alt: 'The vector B along the positive axis, 6 long, and the vector A at about 53 degrees, 5 long. A dashed line drops from the tip of A straight down to B, meeting it 3 from the origin: the projection of A on B.',
          caption: 'A = (3, 4) and B = (6, 0) at angle θ: A reaches 3 along B (the dashed drop), its scalar projection A·B/|B| = 18/6.',
          vectors: [
            { name: 'B', mag: 6, angle: 0, label: 'B', colour: 2, labelAt: 'tip' },
            { name: 'A', ...polarOf(3, 4), label: 'A', colour: 0, labelAt: 'tip' },
            { mag: 4, angle: -90, from: 'A', colour: 1, dashed: true },
          ],
          arcs: [{ from: 0, to: polarOf(3, 4).angle, label: 'θ' }],
        },
        r`| Quantity | Formula |
|---|---|
| angle between | $\cos\theta = \frac{\vec A\cdot\vec B}{|\vec A||\vec B|}$ |
| scalar projection of $\vec A$ on $\vec B$ | $\frac{\vec A\cdot\vec B}{|\vec B|}$ |
| vector projection | $\frac{\vec A\cdot\vec B}{|\vec B|^2}\vec B$ |
| work by a constant force | $W = \vec F\cdot\vec d$ |`,
      ],
      keyIdeas: [
        r`$\vec A\cdot\vec B = A_xB_x + A_yB_y + A_zB_z = |\vec A||\vec B|\cos\theta$; zero means perpendicular.`,
        r`Scalar projection $\frac{\vec A\cdot\vec B}{|\vec B|}$; vector projection $\frac{\vec A\cdot\vec B}{|\vec B|^2}\vec B$.`,
        r`Work $W = \vec F\cdot\vec d$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An angle',
          problem: r`Find the angle between $(1, 2, 2)$ and $(2, -1, 2)$.`,
          steps: [
            r`The dot product is $2 - 2 + 4 = 4$, and each has length $3$.`,
            r`$\cos\theta = \frac49$, so $\theta \approx 63.61^\circ$.`,
          ],
          answer: r`About $63.61^\circ$.`,
        },
        {
          level: 'board',
          title: 'An obtuse angle, a perpendicular, work, a projection',
          problem: r`(a) Find the angle between $4\hat i - 2\hat j + 4\hat k$ and $3\hat i + 6\hat j - 2\hat k$. (b) For what $a$ is $3\hat i + a\hat j - 2\hat k$ perpendicular to $2\hat i - 4\hat j + \hat k$? (c) A force $(5, 2, -1)$ N moves a body from $(1, 0, 2)$ to $(4, 3, 2)$ m. Find the work. (d) Find the scalar projection of $(2, 1, 2)$ on $(3, 0, 4)$.`,
          steps: [
            r`(a) $12 - 12 - 8 = -8$; lengths 6 and 7: $\cos\theta = -\frac{8}{42}$, so $\theta = 100.98^\circ$.`,
            r`(b) $6 - 4a - 2 = 0$: $a = 1$.`,
            r`(c) $\vec d = (3, 3, 0)$: $W = 15 + 6 + 0 = 21$ J.`,
            r`(d) $\frac{6 + 0 + 8}{5} = 2.8$.`,
          ],
          answer: r`(a) $100.98^\circ$; (b) 1; (c) 21 J; (d) 2.8.`,
        },
      ],
      traps: [
        r`The dot product is a scalar; "$\vec A\cdot\vec B = (2, -2, 4)$" is not a dot product.`,
        r`A negative dot product is an obtuse angle: don't take its absolute value.`,
      ],
      check: [
        { q: r`Find $(2\hat i + 2\hat j - \hat k)\cdot(6\hat i - 3\hat j + 2\hat k)$.`, a: r`$12 - 6 - 2 = 4$.` },
        { q: r`For what $a$ are $2\hat i - 3\hat j + 5\hat k$ and $3\hat i + a\hat j - 2\hat k$ perpendicular?`, a: r`$6 - 3a - 10 = 0$: $a = -\frac43$.` },
      ],
    },
    {
      name: 'Cross Product',
      inShort: r`The product that gives a vector square to both: areas and torque.`,
      body: [
        r`The **cross** (vector) product is a vector perpendicular to both, by the right-hand rule, of length $AB\sin\theta$:
$$\vec A\times\vec B = \begin{vmatrix}\hat i & \hat j & \hat k\\ A_x & A_y & A_z\\ B_x & B_y & B_z\end{vmatrix} = (A_yB_z - A_zB_y)\hat i - (A_xB_z - A_zB_x)\hat j + (A_xB_y - A_yB_x)\hat k.$$
It is **not** commutative: $\vec B\times\vec A = -\vec A\times\vec B$. In cyclic order $\hat i\times\hat j = \hat k$, $\hat j\times\hat k = \hat i$, $\hat k\times\hat i = \hat j$; backwards each takes a minus sign, and $\hat i\times\hat i = 0$. Its length is the area of the parallelogram on the two vectors:`,
        {
          type: 'phasor',
          alt: 'The vectors A, 4 along the axis, and B, 1 across and 3 up, from the origin, with dashed copies completing the parallelogram. Its area is 12, the length of A cross B.',
          caption: 'A = (4, 0, 0) and B = (1, 3, 0) span a parallelogram (dashed sides) of area |A × B| = |(0, 0, 12)| = 12; the triangle on them has half, 6.',
          vectors: [
            { name: 'A', mag: 4, angle: 0, label: 'A', colour: 0 },
            { name: 'B', ...polarOf(1, 3), label: 'B', colour: 2 },
            { mag: 4, angle: 0, from: 'B', colour: 0, dashed: true },
            { ...polarOf(1, 3), from: 'A', colour: 2, dashed: true },
          ],
        },
        r`Uses: the area of a parallelogram $|\vec A\times\vec B|$ (a triangle half of it), a normal to a plane through two directions, **torque** $\vec\tau = \vec r\times\vec F$, and the magnetic force $q\vec v\times\vec B$. A zero cross product means **parallel**.`,
      ],
      keyIdeas: [
        r`$\vec A\times\vec B$ by the determinant with $\hat i, \hat j, \hat k$; $|\vec A\times\vec B| = AB\sin\theta$.`,
        r`$\vec B\times\vec A = -\vec A\times\vec B$; $\hat i\times\hat j = \hat k$ in cyclic order.`,
        r`Parallelogram area $|\vec A\times\vec B|$, triangle half of it; torque $\vec\tau = \vec r\times\vec F$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A triangle in space',
          problem: r`Find the area of the triangle $P(1, 0, 0)$, $Q(0, 2, 0)$, $R(0, 0, 3)$.`,
          steps: [
            r`$\overrightarrow{PQ} = (-1, 2, 0)$ and $\overrightarrow{PR} = (-1, 0, 3)$; their cross product is $(6, 3, 2)$, of length $7$.`,
            r`The area is half: $3.5$.`,
          ],
          answer: r`3.5.`,
        },
        {
          level: 'board',
          title: 'A product, a torque, a unit normal',
          problem: r`(a) Find $(3\hat i - \hat j + 2\hat k)\times(\hat i + 2\hat j - \hat k)$. (b) A force $50\hat k$ N acts at $\vec r = 0.2\hat i + 0.1\hat j$ m. Find the torque about the origin and its size. (c) Find the unit vector normal to both vectors of (a).`,
          steps: [
            r`(a) $\hat i(1 - 4) - \hat j(-3 - 2) + \hat k(6 + 1) = -3\hat i + 5\hat j + 7\hat k$.`,
            r`(b) $\vec r\times\vec F = \hat i(0.1 \times 50) - \hat j(0.2 \times 50) + 0 = 5\hat i - 10\hat j$ N·m, of size $\sqrt{125} = 11.18$ N·m.`,
            r`(c) $\frac{(-3, 5, 7)}{\sqrt{83}}$, with $\sqrt{83} = 9.110$.`,
          ],
          answer: r`(a) $-3\hat i + 5\hat j + 7\hat k$; (b) $5\hat i - 10\hat j$, 11.18 N·m; (c) $\frac{(-3, 5, 7)}{9.110}$.`,
        },
      ],
      traps: [
        r`The middle ($\hat j$) term of the determinant is subtracted.`,
        r`$\vec r\times\vec F$, not $\vec F\times\vec r$: the order sets the torque's direction.`,
      ],
      check: [
        { q: r`Find $(4\hat i + 2\hat j - \hat k)\times(-3\hat i + 6\hat j - 2\hat k)$.`, a: r`$2\hat i + 11\hat j + 30\hat k$.` },
        { q: r`What is $\hat k\times\hat j$?`, a: r`$-\hat i$.` },
      ],
    },
    {
      name: 'Triple Products',
      inShort: r`Products of three vectors: a volume, and a vector shortcut.`,
      body: [
        r`The **scalar triple product** is the determinant of the three vectors' components:
$$\vec A\cdot(\vec B\times\vec C) = \begin{vmatrix}A_x & A_y & A_z\\ B_x & B_y & B_z\\ C_x & C_y & C_z\end{vmatrix}.$$
Its absolute value is the **volume of the parallelepiped** on the three edges (a tetrahedron on them has $\frac16$ of it); it is **zero exactly when the vectors are coplanar**. Cycling the three leaves it unchanged, $\vec A\cdot(\vec B\times\vec C) = \vec B\cdot(\vec C\times\vec A) = \vec C\cdot(\vec A\times\vec B)$; swapping two flips the sign. Dot and cross may trade places: $(\vec A\times\vec B)\cdot\vec C = \vec A\cdot(\vec B\times\vec C)$.

The **vector triple product** expands by the "BAC minus CAB" rule:
$$\vec A\times(\vec B\times\vec C) = \vec B(\vec A\cdot\vec C) - \vec C(\vec A\cdot\vec B),$$
and it is not associative: $\vec A\times(\vec B\times\vec C) \ne (\vec A\times\vec B)\times\vec C$ in general.`,
      ],
      keyIdeas: [
        r`$\vec A\cdot(\vec B\times\vec C)$ is the $3\times3$ determinant of the three: the parallelepiped's volume, zero when coplanar.`,
        r`A tetrahedron on the same edges has $\frac16$ of that volume.`,
        r`$\vec A\times(\vec B\times\vec C) = \vec B(\vec A\cdot\vec C) - \vec C(\vec A\cdot\vec B)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A volume',
          problem: r`Find the volume of the parallelepiped on $(2, 0, 0)$, $(1, 3, 0)$, $(1, 1, 4)$, and of the tetrahedron on them.`,
          steps: [
            r`The determinant is triangular: $2 \times 3 \times 4 = 24$.`,
            r`Volume 24; tetrahedron $\frac{24}{6} = 4$.`,
          ],
          answer: r`24 and 4.`,
        },
        {
          level: 'board',
          title: 'A triple product, coplanarity, BAC minus CAB',
          problem: r`(a) Find $(\vec A\times\vec B)\cdot\vec C$ for $\vec A = (1, 2, 0)$, $\vec B = (0, 1, 3)$, $\vec C = (2, 0, 1)$. (b) For what $k$ are $(1, 2, 3)$, $(2, 1, k)$ and $(1, -1, 1)$ coplanar? (c) Find $\vec A\times(\vec B\times\vec C)$ for $\vec A = \hat i$, $\vec B = \hat j$, $\vec C = \hat i + \hat j + \hat k$.`,
          steps: [
            r`(a) $\begin{vmatrix}1 & 2 & 0\\ 0 & 1 & 3\\ 2 & 0 & 1\end{vmatrix} = 1(1 - 0) - 2(0 - 6) + 0 = 13$.`,
            r`(b) $1(1 + k) - 2(2 - k) + 3(-2 - 1) = 3k - 12 = 0$: $k = 4$.`,
            r`(c) $\vec B(\vec A\cdot\vec C) - \vec C(\vec A\cdot\vec B) = \hat j(1) - \vec C(0) = \hat j$.`,
          ],
          answer: r`(a) 13; (b) $k = 4$; (c) $\hat j$.`,
        },
      ],
      traps: [
        r`Take the absolute value: a negative triple product means a left-handed order, not a negative volume.`,
        r`In BAC minus CAB, the vector outside the bracket ($\vec A$) appears only inside the dots.`,
      ],
      check: [
        { q: r`If $\vec A\cdot(\vec B\times\vec C) = 0$, what do the vectors do?`, a: r`They lie in one plane.` },
        { q: r`What is $\vec A\cdot(\vec A\times\vec B)$?`, a: r`$0$: $\vec A\times\vec B$ is perpendicular to $\vec A$.` },
      ],
    },
    {
      name: 'Lines and Planes',
      inShort: r`Lines and planes in vector form, and the distances between them.`,
      body: [
        r`A **line** through $\vec r_0$ with direction $\vec d$ is $\vec r = \vec r_0 + t\vec d$. A **plane** through $\vec r_0$ with normal $\vec n$ is $\vec n\cdot(\vec r - \vec r_0) = 0$, that is $Ax + By + Cz = D$ with $\vec n = (A, B, C)$; through three points take $\vec n = (B - A)\times(C - A)$.

| Distance | Formula |
|---|---|
| point $P$ to plane | $\frac{|\vec n\cdot(\vec P - \vec r_0)|}{|\vec n|}$ |
| point $P$ to line | $\frac{|(\vec P - \vec r_0)\times\vec d|}{|\vec d|}$ |
| between skew lines | $\frac{|(\vec r_2 - \vec r_1)\cdot(\vec d_1\times\vec d_2)|}{|\vec d_1\times\vec d_2|}$ |

Two planes meet along a line with direction $\vec n_1\times\vec n_2$; the angle between them is the angle between their normals.`,
      ],
      keyIdeas: [
        r`Line $\vec r = \vec r_0 + t\vec d$. Plane: $\vec n\cdot(\vec r - \vec r_0) = 0$, with $\vec n = (B - A)\times(C - A)$ through three points.`,
        r`Point to line: $\frac{|(\vec P - \vec r_0)\times\vec d|}{|\vec d|}$. Skew lines: $\frac{|(\vec r_2 - \vec r_1)\cdot(\vec d_1\times\vec d_2)|}{|\vec d_1\times\vec d_2|}$.`,
        r`Two planes meet along $\vec n_1\times\vec n_2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A plane through three points',
          problem: r`Find the plane through $(1, 0, 2)$, $(3, 1, -1)$ and $(0, 2, 1)$.`,
          steps: [
            r`Edges $(2, 1, -3)$ and $(-1, 2, -1)$; their cross product is $(5, 5, 5)$, so the normal is $(1, 1, 1)$.`,
            r`Through $(1, 0, 2)$: $x + y + z = 3$.`,
          ],
          answer: r`$x + y + z = 3$.`,
        },
        {
          level: 'board',
          title: 'Point to line, skew lines, two planes',
          problem: r`(a) How far is $P(3, 1, 2)$ from the line $\vec r = (1, 0, 0) + t(1, 2, 2)$? (b) How far apart are the skew lines $\vec r = s(1, 0, 0)$ and $\vec r = (1, 2, 3) + t(0, 1, 1)$? (c) Find the direction of the line where $x + y + z = 3$ meets $2x - y + z = 1$.`,
          steps: [
            r`(a) $\vec P - \vec r_0 = (2, 1, 2)$; crossed with $(1, 2, 2)$: $(-2, -2, 3)$, length $\sqrt{17}$. Divide by $|\vec d| = 3$: $1.374$.`,
            r`(b) $\vec d_1\times\vec d_2 = (0, -1, 1)$; $(1, 2, 3)\cdot(0, -1, 1) = 1$: distance $\frac{1}{\sqrt2} = 0.7071$.`,
            r`(c) $(1, 1, 1)\times(2, -1, 1) = (2, 1, -3)$.`,
          ],
          answer: r`(a) about 1.374; (b) about 0.7071; (c) $(2, 1, -3)$.`,
        },
      ],
      traps: [
        r`Check the plane with all three points: one wrong sign in the cross product shows up at once.`,
        r`Skew-line distance divides by $|\vec d_1\times\vec d_2|$, not by $|\vec d_1||\vec d_2|$.`,
      ],
      check: [
        { q: r`What is a normal to the plane $3x - y + 2z = 7$?`, a: r`$(3, -1, 2)$.` },
        { q: r`How far is the origin from $x + 2y + 2z = 6$?`, a: r`$\frac{6}{3} = 2$.` },
      ],
    },
    {
      name: 'Derivatives of Vector Functions',
      inShort: r`Velocity, acceleration and curvature of a moving point.`,
      body: [
        r`A moving point $\vec r(t)$ has **velocity** $\vec v = \vec r'$, tangent to its path, and **acceleration** $\vec a = \vec r''$; its speed is $|\vec v|$. Differentiate component by component; the product rules hold for dot and cross products, keeping the order in the cross product.

On a curved path the acceleration has two parts: **tangential**, which changes the speed, and **normal**, which turns the direction and points into the curve:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The ellipse traced by a point at 3 cos t, 2 sin t. At t equals pi over 4 the velocity is drawn as a dashed segment tangent to the ellipse, and the acceleration as a solid segment pointing in towards the centre.',
          caption: 'r = (3 cos t, 2 sin t) at t = π/4: the velocity (dashed) is tangent to the path; the acceleration, −r, points in to the centre.',
          x: [-4, 4],
          y: [-3, 3],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: range(0, 2 * Math.PI, 120).map((t) => [3 * Math.cos(t), 2 * Math.sin(t)]), colour: colourOf(0) },
            { points: [P, [P[0] + V[0], P[1] + V[1]]], dashed: true, colour: colourOf(1) },
            { points: [P, [0, 0]], colour: colourOf(2) },
          ],
          legend: false,
        },
        r`| Quantity | Formula |
|---|---|
| tangential acceleration | $a_T = \frac{\vec v\cdot\vec a}{|\vec v|}$ |
| normal acceleration | $a_N = \frac{|\vec v\times\vec a|}{|\vec v|} = \kappa v^2$, and $a_T^2 + a_N^2 = |\vec a|^2$ |
| curvature | $\kappa = \frac{|\vec r'\times\vec r''|}{|\vec r'|^3}$ |
| arc length | $\int|\vec r'|\,dt$ |`,
      ],
      keyIdeas: [
        r`$\vec v = \vec r'$, $\vec a = \vec r''$; speed $|\vec v|$.`,
        r`$\kappa = \frac{|\vec r'\times\vec r''|}{|\vec r'|^3}$; $a_T = \frac{\vec v\cdot\vec a}{|\vec v|}$, $a_N = \kappa v^2$.`,
        r`Product rules hold for dot and cross products, keeping the order.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A helix',
          problem: r`A point moves on the helix $\vec r = (2\cos t, 2\sin t, 0.5t)$. Find its speed and the curvature.`,
          steps: [
            r`$\vec r' = (-2\sin t, 2\cos t, 0.5)$, so the speed is $\sqrt{4.25} \approx 2.062$ throughout.`,
            r`$\kappa = \frac{2}{4 + 0.25} \approx 0.471$, constant too.`,
          ],
          answer: r`About 2.062; about 0.471.`,
        },
        {
          level: 'board',
          title: 'A twisted cubic',
          problem: r`For $\vec r = (t^2, 2t, t^3)$ at $t = 1$, find the speed, the tangential and normal accelerations, and the curvature.`,
          steps: [
            r`$\vec v = (2t, 2, 3t^2) = (2, 2, 3)$, speed $\sqrt{17} = 4.123$. $\vec a = (2, 0, 6t) = (2, 0, 6)$, $|\vec a| = \sqrt{40} = 6.325$.`,
            r`$a_T = \frac{4 + 0 + 18}{\sqrt{17}} = 5.336$; $a_N = \sqrt{40 - 5.336^2} = 3.395$.`,
            r`$\vec v\times\vec a = (12, -6, -4)$, of length 14: $\kappa = \frac{14}{17^{3/2}} = 0.1997$. Check: $\kappa v^2 = 0.1997 \times 17 = 3.395$.`,
          ],
          answer: r`Speed 4.123; $a_T \approx 5.336$, $a_N \approx 3.395$; $\kappa \approx 0.1997$.`,
        },
      ],
      traps: [
        r`Constant speed does not mean zero acceleration: on a curve, $a_N$ is still there.`,
        r`$a_T$ is the rate of change of speed, not $|\vec a|$.`,
      ],
      check: [
        { q: r`A particle moves by $x = 3t^2$, $y = 2t^3$. What is its acceleration at $t = 1$?`, a: r`$(6, 12t) = (6, 12)$: $\sqrt{180} \approx 13.4$.` },
        { q: r`What is the curvature of a circle of radius 5?`, a: r`$\frac15$.` },
      ],
    },
    {
      name: 'Directional Derivative and Gradient',
      inShort: r`How fast a scalar field changes in any direction, and which way it rises fastest.`,
      body: [
        r`The **del** operator $\nabla = \hat i\frac{\partial}{\partial x} + \hat j\frac{\partial}{\partial y} + \hat k\frac{\partial}{\partial z}$ acting on a scalar field gives its **gradient**, a vector:
$$\nabla f = (f_x, f_y, f_z).$$
The rate of change of $f$ in the direction of a unit vector $\hat u$ is the **directional derivative** $D_{\hat u}f = \nabla f\cdot\hat u$. It is greatest, $|\nabla f|$, along $\nabla f$ itself, and zero along a level surface: the gradient is **perpendicular to the level curves and surfaces**:`,
        {
          type: 'plot',
          equal: true,
          alt: 'Three ellipses x squared plus 2 y squared equals 2, 6 and 12, the level curves of f. At the point 2 comma 1 on the middle one, a short dashed segment points along the gradient, perpendicular to the curve and outwards.',
          caption: 'Level curves of f = x² + 2y² (values 2, 6, 12) and ∇f = (4, 4) at (2, 1) (dashed): perpendicular to its level curve, pointing uphill.',
          x: [-4, 4],
          y: [-2.6, 2.6],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            ...[2, 6, 12].map((c) => ({ points: range(0, 2 * Math.PI, 120).map((t) => [Math.sqrt(c) * Math.cos(t), Math.sqrt(c / 2) * Math.sin(t)]), colour: colourOf(0) })),
            { points: [GRAD_AT, [GRAD_AT[0] + G[0] / gLen, GRAD_AT[1] + G[1] / gLen]], dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`The tangent plane to the surface $F(x, y, z) = c$ at $P$ is $\nabla F(P)\cdot(\vec r - \vec P) = 0$, and the normal line runs along $\nabla F(P)$.`,
      ],
      keyIdeas: [
        r`$\nabla f = (f_x, f_y, f_z)$; $D_{\hat u}f = \nabla f\cdot\hat u$.`,
        r`The greatest rate is $|\nabla f|$, along $\nabla f$; the gradient is square to level surfaces.`,
        r`Tangent plane to $F = c$ at $P$: $\nabla F(P)\cdot(\vec r - \vec P) = 0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A rate, and the greatest rate',
          problem: r`For $f = x^2y + yz$ at $(1, 2, -1)$, find the rate of change along $(2, -1, 2)$ and the greatest rate.`,
          steps: [
            r`$\nabla f = (2xy, x^2 + z, y) = (4, 0, 2)$.`,
            r`Along $\frac{(2, -1, 2)}{3}$: $\frac{8 + 0 + 4}{3} = 4$. Greatest: $\sqrt{20} \approx 4.472$.`,
          ],
          answer: r`4; about 4.472.`,
        },
        {
          level: 'board',
          title: 'A gradient, a tangent plane, a directional derivative',
          problem: r`(a) Find $|\nabla f|$ for $f = x^2 + y^2 + z^2$ at $(2, -1, 2)$. (b) Find the tangent plane to $x^2 + 2y^2 + z^2 = 7$ at $(1, 1, 2)$. (c) Find the rate of change of $f = xy^2 + yz^3$ at $(2, -1, 1)$ along $(3, 4, 0)$.`,
          steps: [
            r`(a) $\nabla f = (2x, 2y, 2z) = (4, -2, 4)$, of length 6.`,
            r`(b) $\nabla F = (2x, 4y, 2z) = (2, 4, 4)$: $2(x - 1) + 4(y - 1) + 4(z - 2) = 0$, that is $x + 2y + 2z = 7$.`,
            r`(c) $\nabla f = (y^2, 2xy + z^3, 3yz^2) = (1, -3, -3)$; with $\hat u = (0.6, 0.8, 0)$: $0.6 - 2.4 = -1.8$.`,
          ],
          answer: r`(a) 6; (b) $x + 2y + 2z = 7$; (c) $-1.8$.`,
        },
      ],
      traps: [
        r`Normalise the direction; using $(2, -1, 2)$ itself triples the answer.`,
        r`The gradient of a scalar is a vector; its size is the greatest rate, not the rate in a given direction.`,
      ],
      check: [
        { q: r`Find $|\nabla f|$ for $f = x^2 + y^2 + z^2$ at $(1, 2, 3)$.`, a: r`$|(2, 4, 6)| = \sqrt{56} \approx 7.48$.` },
        { q: r`In which direction does $f$ not change at all?`, a: r`Along the level surface, perpendicular to $\nabla f$.` },
      ],
    },
    {
      name: 'Divergence',
      inShort: r`How much a field spreads out from a point.`,
      body: [
        r`For a vector field $\vec F = (P, Q, R)$, the **divergence** is the dot product of del with it, a scalar:
$$\nabla\cdot\vec F = \frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}.$$
It measures the net outflow per unit volume at a point: positive at a **source** (field lines leaving), negative at a **sink**, zero where as much flows in as out. A field with zero divergence everywhere is **solenoidal**: the magnetic field ($\nabla\cdot\vec B = 0$) and an incompressible flow are examples. In electrostatics, $\nabla\cdot\vec D = \rho_v$: charge is the source of the field.

| Identity | Result |
|---|---|
| $\nabla\cdot\vec r$ | $3$ |
| $\nabla\cdot(f\vec F)$ | $f\,\nabla\cdot\vec F + \vec F\cdot\nabla f$ |
| $\nabla\cdot(\nabla f)$ | $\nabla^2f$, the Laplacian |
| $\nabla\cdot\frac{\vec r}{r^3}$ | $0$ away from the origin |`,
      ],
      keyIdeas: [
        r`$\nabla\cdot\vec F = \frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}$, a scalar.`,
        r`$\nabla\cdot(f\vec F) = f\nabla\cdot\vec F + \vec F\cdot\nabla f$; $\nabla\cdot\vec r = 3$.`,
        r`Zero divergence everywhere: solenoidal, like the magnetic field.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'At a point',
          problem: r`Find $\nabla\cdot\vec F$ for $\vec F = (xy, yz^2, e^xz)$ at $(0, 1, 2)$.`,
          steps: [
            r`$\nabla\cdot\vec F = y + z^2 + e^x$.`,
            r`At the point: $1 + 4 + 1 = 6$.`,
          ],
          answer: r`6.`,
        },
        {
          level: 'board',
          title: 'A divergence, and a solenoidal field',
          problem: r`(a) Find the divergence of $\vec V = (x^2z, -2y^3z^2, xy^2z)$ at $(1, -1, 1)$. (b) For what $a$ is $\vec F = (x + 3y, y - 2z, x + az)$ solenoidal?`,
          steps: [
            r`(a) $2xz - 6y^2z^2 + xy^2 = 2 - 6 + 1 = -3$.`,
            r`(b) $\nabla\cdot\vec F = 1 + 1 + a = 0$: $a = -2$.`,
          ],
          answer: r`(a) $-3$; (b) $a = -2$.`,
        },
      ],
      traps: [
        r`Each component is differentiated by its own variable only: $P$ by $x$, $Q$ by $y$, $R$ by $z$.`,
        r`The divergence is a scalar: the answer has no $\hat i$, $\hat j$, $\hat k$.`,
      ],
      check: [
        { q: r`Find the divergence of $(x^2y, -xy, xyz)$ at $(3, 2, 1)$.`, a: r`$2xy - x + xy = 12 - 3 + 6 = 15$.` },
        { q: r`What is $\nabla\cdot(x\hat i + y\hat j + z\hat k)$?`, a: r`$3$.` },
      ],
    },
    {
      name: 'Curl',
      inShort: r`How much a field swirls, and when it is a gradient.`,
      body: [
        r`The **curl** is the cross product of del with the field, a vector:
$$\nabla\times\vec F = \begin{vmatrix}\hat i & \hat j & \hat k\\ \partial_x & \partial_y & \partial_z\\ P & Q & R\end{vmatrix} = (R_y - Q_z)\hat i + (P_z - R_x)\hat j + (Q_x - P_y)\hat k.$$
It measures rotation: a small paddle wheel at the point spins about the curl's direction, at a rate set by its size. A field with zero curl is **irrotational**; on a simply connected region it is then **conservative**, $\vec F = \nabla f$, and its line integrals depend only on the end points. In electromagnetics, $\nabla\times\vec H = \vec J$ (Ampère) and $\nabla\times\vec E = -\frac{\partial\vec B}{\partial t}$ (Faraday).

Two identities never fail: $\nabla\times(\nabla f) = 0$ (a gradient never swirls) and $\nabla\cdot(\nabla\times\vec F) = 0$ (a curl never spreads).`,
      ],
      keyIdeas: [
        r`$\nabla\times\vec F$ by the determinant with $\frac{\partial}{\partial x}, \frac{\partial}{\partial y}, \frac{\partial}{\partial z}$.`,
        r`$\nabla\times\nabla f = 0$ and $\nabla\cdot(\nabla\times\vec F) = 0$.`,
        r`Zero curl on a simply connected region: $\vec F = \nabla f$, conservative.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A swirl, and a gradient',
          problem: r`Find the curl of $(-y, x, 0)$ and of $(yz, xz, xy)$.`,
          steps: [
            r`The first is $(0, 0, 2)$: a steady rotation.`,
            r`The second is $(0, 0, 0)$: it is $\nabla(xyz)$, conservative.`,
          ],
          answer: r`$(0, 0, 2)$; $\vec 0$.`,
        },
        {
          level: 'board',
          title: 'A curl at a point, and making a field irrotational',
          problem: r`(a) Find the curl of $\vec F = (x^2y, 2xz, yz)$ at $(1, 1, 1)$. (b) Find $a$, $b$, $c$ so that $\vec F = (x + 2y + az, bx - 3y - z, 4x + cy + 2z)$ is irrotational, and find its potential.`,
          steps: [
            r`(a) $(R_y - Q_z, P_z - R_x, Q_x - P_y) = (z - 2x, 0, 2z - x^2) = (-1, 0, 1)$.`,
            r`(b) $\nabla\times\vec F = (c + 1, a - 4, b - 2) = \vec 0$: $a = 4$, $b = 2$, $c = -1$.`,
            r`Integrating: $f = \frac{x^2}{2} + 2xy + 4xz - \frac{3y^2}{2} - yz + z^2$.`,
          ],
          answer: r`(a) $(-1, 0, 1)$; (b) $a = 4$, $b = 2$, $c = -1$, potential as above.`,
        },
      ],
      traps: [
        r`Mind the signs in the $\hat j$ term, as in any cross product.`,
        r`Zero curl means conservative only on a region without holes.`,
      ],
      check: [
        { q: r`What is the curl of any gradient?`, a: r`$\vec 0$.` },
        { q: r`What is the divergence of any curl?`, a: r`$0$.` },
      ],
    },
    {
      name: 'Line Integrals',
      inShort: r`Adding up a field along a curve: work, and mass of a wire.`,
      body: [
        r`The **work** a force field does along a curve $C$ is the line integral of its tangential part:
$$\int_C\vec F\cdot d\vec r = \int_a^b\vec F(\vec r(t))\cdot\vec r'(t)\,dt.$$
Parametrise the curve, substitute, and integrate in $t$. A scalar along a curve (a wire's mass from its density) uses arc length instead, $\int_Cf\,ds = \int f\,|\vec r'(t)|\,dt$.

For a **conservative** field $\vec F = \nabla f$ the work depends only on the end points, $\int_C\nabla f\cdot d\vec r = f(B) - f(A)$, and round any closed loop it is zero:`,
        {
          type: 'plot',
          equal: true,
          alt: 'Two paths from the origin to the point 1 comma 1: the straight line y equals x, and the dashed parabola y equals x squared. In the field y, x, which is the gradient of x y, both take the same work, 1.',
          caption: 'Two paths from (0, 0) to (1, 1), the line y = x and the parabola y = x² (dashed): in F = (y, x) = ∇(xy) both take work 1.',
          x: [-0.2, 1.3],
          y: [-0.2, 1.3],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: [[0, 0], [1, 1]], colour: colourOf(0) },
            { points: range(0, 1, 40).map((x) => [x, x * x]), dashed: true, colour: colourOf(1) },
          ],
          marks: [{ at: [1, 1] }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$\int_C\vec F\cdot d\vec r = \int\vec F(\vec r(t))\cdot\vec r'(t)\,dt$.`,
        r`Conservative fields: $\int_C\nabla f\cdot d\vec r = f(B) - f(A)$, path does not matter.`,
        r`$\int_Cf\,ds = \int f\,|\vec r'|\,dt$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A potential',
          problem: r`Find the work done by $\vec F = (y, x, 1)$ along $\vec r = (t, t^2, t^3)$ from $t = 0$ to $1$.`,
          steps: [
            r`$\vec F = \nabla(xy + z)$.`,
            r`So the work is $f(1, 1, 1) - f(0, 0, 0) = 2$, whatever the path.`,
          ],
          answer: r`2.`,
        },
        {
          level: 'board',
          title: 'A potential, a loop, a wire',
          problem: r`(a) Find the work of $\vec F = (3x^2, 2yz, y^2)$ from $(0, 0, 0)$ to $(1, 2, 3)$. (b) Find $\oint\vec F\cdot d\vec r$ for $\vec F = (y, -x, 0)$ once counterclockwise round the unit circle. (c) Find $\int_C(x + y)\,ds$ along the segment from $(0, 0)$ to $(3, 4)$.`,
          steps: [
            r`(a) The curl is zero; $f = x^3 + y^2z$: $W = 1 + 12 = 13$.`,
            r`(b) $\vec r = (\cos t, \sin t)$, $\vec r' = (-\sin t, \cos t)$, $\vec F\cdot\vec r' = -\sin^2t - \cos^2t = -1$: $-2\pi$. Not conservative.`,
            r`(c) $\vec r = (3t, 4t)$, $ds = 5\,dt$: $\int_0^17t \cdot 5\,dt = 17.5$.`,
          ],
          answer: r`(a) 13; (b) $-2\pi$; (c) 17.5.`,
        },
      ],
      traps: [
        r`Check for a potential before parametrising; it turns the integral into two evaluations.`,
        r`$\int f\,ds$ needs $|\vec r'|$; $\int\vec F\cdot d\vec r$ needs $\vec r'$ itself.`,
      ],
      check: [
        { q: r`What is the work of a conservative field round a closed loop?`, a: r`$0$.` },
        { q: r`Find the work of $\vec F = (2x, 2y)$ from $(1, 0)$ to $(0, 3)$.`, a: r`$f = x^2 + y^2$: $9 - 1 = 8$.` },
      ],
    },
    {
      name: 'Surface Integrals',
      inShort: r`Adding up over a surface: area, and the flux of a field through it.`,
      body: [
        r`A surface $\vec r(u, v)$ has area element $dS = |\vec r_u\times\vec r_v|\,du\,dv$; for $z = g(x, y)$, $dS = \sqrt{1 + g_x^2 + g_y^2}\,dA$. The **flux** of a field through it is
$$\iint_S\vec F\cdot\hat n\,dS,$$
the amount crossing the surface, with the sign set by the chosen normal (outward for a closed surface). Round surfaces are easiest in round coordinates:

| Surface | $dS$ | Outward $\hat n$ |
|---|---|---|
| cylinder $\rho = a$ | $a\,d\varphi\,dz$ | $\hat\rho$ |
| sphere $r = a$ | $a^2\sin\theta\,d\theta\,d\varphi$ | $\hat r$ |
| plane $z = c$ | $dx\,dy$ | $\pm\hat k$ |

Electric flux through a surface is $\iint\vec D\cdot d\vec S$; magnetic flux is $\iint\vec B\cdot d\vec S$.`,
      ],
      keyIdeas: [
        r`$dS = |\vec r_u\times\vec r_v|\,du\,dv$; for $z = g(x, y)$, $dS = \sqrt{1 + g_x^2 + g_y^2}\,dA$.`,
        r`Flux $\iint\vec F\cdot\hat n\,dS$, with the normal's direction chosen first.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A sphere',
          problem: r`Find the area of a hemisphere of radius $2$, and the flux of $\vec F = \vec r$ out of the whole sphere.`,
          steps: [
            r`With $dS = R^2\sin\phi\,d\phi\,d\theta$: area $2\pi R^2 = 8\pi \approx 25.13$.`,
            r`On the sphere $\vec r\cdot\hat n = R$, so the flux is $R\cdot4\pi R^2 = 32\pi \approx 100.5$.`,
          ],
          answer: r`About 25.13; about 100.5.`,
        },
        {
          level: 'board',
          title: 'A tilted plane, a cylinder, a curved patch',
          problem: r`(a) Find the area of the part of $x + 2y + 2z = 6$ in the first octant. (b) Find the flux of $\vec F = (x, y, z)$ out through the curved side of the cylinder $x^2 + y^2 = 4$, $0 \le z \le 3$. (c) Find the area of the curved patch $\rho = 3$, $0 \le \varphi \le 60^\circ$, $0 \le z \le 4$.`,
          steps: [
            r`(a) $z = \frac{6 - x - 2y}{2}$, so $dS = \sqrt{1 + \frac14 + 1}\,dA = 1.5\,dA$. The shadow is a triangle of area $\frac12(6)(3) = 9$: area $13.5$.`,
            r`(b) On the side $\vec F\cdot\hat\rho = \rho = 2$, and the side's area is $2\pi(2)(3) = 12\pi$: flux $24\pi = 75.40$.`,
            r`(c) $3 \times \frac{\pi}{3} \times 4 = 4\pi = 12.566$.`,
          ],
          answer: r`(a) 13.5; (b) $24\pi \approx 75.40$; (c) $4\pi \approx 12.566$.`,
        },
      ],
      traps: [
        r`The flux changes sign with the normal: outward is the convention for closed surfaces.`,
        r`On a cylinder $dS = \rho\,d\varphi\,dz$: the $\rho$ is easy to drop.`,
      ],
      check: [
        { q: r`What is $dS$ on a sphere of radius $a$?`, a: r`$a^2\sin\theta\,d\theta\,d\varphi$.` },
        { q: r`Find the flux of $\vec F = 5\hat k$ up through the disc $x^2 + y^2 \le 4$, $z = 0$.`, a: r`$5 \times 4\pi = 20\pi$.` },
      ],
    },
    {
      name: "Green's Theorem",
      inShort: r`A line integral round a closed plane curve, as a double integral inside it.`,
      body: [
        r`For a closed curve $C$ in the plane, traversed **counterclockwise** around the region $D$ it bounds,
$$\oint_C(P\,dx + Q\,dy) = \iint_D\left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)dA.$$
It swaps a line integral round the edge for a double integral over the inside, whichever is easier. With $Q_x - P_y = 1$ it gives an **area** from the boundary alone:
$$A = \frac12\oint(x\,dy - y\,dx) = \oint x\,dy = -\oint y\,dx,$$
which is how a planimeter measures an area by tracing its outline. Green's theorem is Stokes' theorem lying flat.`,
      ],
      keyIdeas: [
        r`$\oint_C(P\,dx + Q\,dy) = \iint_D(Q_x - P_y)\,dA$, counterclockwise.`,
        r`Area: $\frac12\oint(x\,dy - y\,dx)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Round a square',
          problem: r`Evaluate $\oint(-y\,dx + x^2\,dy)$ counterclockwise round the unit square $[0, 1]^2$.`,
          steps: [
            r`$Q_x - P_y = 2x + 1$.`,
            r`$\iint(2x + 1)\,dA = 1 + 1 = 2$.`,
          ],
          answer: r`2.`,
        },
        {
          level: 'board',
          title: 'Round a triangle, and an area from its edge',
          problem: r`(a) Evaluate $\oint(xy\,dx + x^2\,dy)$ counterclockwise round the triangle $(0, 0)$, $(1, 0)$, $(1, 1)$. (b) Find the area of the ellipse $x = 3\cos t$, $y = 2\sin t$ from its boundary.`,
          steps: [
            r`(a) $Q_x - P_y = 2x - x = x$; over $0 \le y \le x \le 1$: $\int_0^1x \cdot x\,dx = \frac13$.`,
            r`(b) $\frac12\int_0^{2\pi}(3\cos t \cdot 2\cos t + 2\sin t \cdot 3\sin t)\,dt = \frac12(6)(2\pi) = 6\pi = 18.85$.`,
          ],
          answer: r`(a) $\frac13$; (b) $6\pi \approx 18.85$.`,
        },
      ],
      traps: [
        r`It is $Q_x - P_y$, in that order; clockwise flips the sign.`,
        r`The curve must be closed; for an open path, close it and subtract the added piece.`,
      ],
      check: [
        { q: r`What does Green's theorem give for $\oint(x\,dy - y\,dx)$?`, a: r`Twice the enclosed area.` },
        { q: r`Evaluate $\oint(2y\,dx + 3x\,dy)$ round the unit circle, counterclockwise.`, a: r`$\iint(3 - 2)\,dA = \pi$.` },
      ],
    },
    {
      name: 'Divergence Theorem',
      inShort: r`The flux out of a closed surface equals the divergence added up inside (Gauss).`,
      body: [
        r`For a closed surface $S$ bounding a volume $V$, with the normal pointing outward,
$$\oint_S\vec F\cdot\hat n\,dS = \iiint_V\nabla\cdot\vec F\,dV.$$
The total outflow through the skin equals the sum of all the sources inside. One volume integral replaces several surface integrals (six for a box), or the other way round.

It is **Gauss's law**: with $\nabla\cdot\vec D = \rho_v$, the flux of $\vec D$ out of any closed surface equals the charge enclosed, $\oint\vec D\cdot d\vec S = Q$. For a point charge that flux is the same through every surface around it, whatever its size or shape. And because $\nabla\cdot\vec B = 0$, the magnetic flux out of any closed surface is zero.`,
      ],
      keyIdeas: [
        r`$\oint_S\vec F\cdot\hat n\,dS = \iiint_V\nabla\cdot\vec F\,dV$, normal outward.`,
        r`Gauss's law of electrostatics in integral and point form is this theorem.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A cube',
          problem: r`Find the flux of $\vec F = (x, y^2, z)$ out of the unit cube $[0, 1]^3$.`,
          steps: [
            r`$\nabla\cdot\vec F = 2 + 2y$.`,
            r`$\iiint(2 + 2y)\,dV = 2 + 1 = 3$, without six surface integrals.`,
          ],
          answer: r`3.`,
        },
        {
          level: 'board',
          title: 'A sphere, a box',
          problem: r`(a) Find the flux of $\vec F = (x^3, y^3, z^3)$ out of the unit sphere. (b) Find the flux of $\vec F = (2x, -y, 4z)$ out of the box $[0, 2] \times [0, 1] \times [0, 3]$.`,
          steps: [
            r`(a) $\nabla\cdot\vec F = 3(x^2 + y^2 + z^2) = 3r^2$: $\int_0^13r^2 \cdot 4\pi r^2\,dr = \frac{12\pi}{5} = 7.540$.`,
            r`(b) $\nabla\cdot\vec F = 2 - 1 + 4 = 5$, constant: $5 \times 6 = 30$.`,
          ],
          answer: r`(a) $\frac{12\pi}{5} \approx 7.540$; (b) 30.`,
        },
      ],
      traps: [
        r`The surface must be closed; for an open one, close it and subtract the lid.`,
        r`A constant divergence times the volume is the whole answer: no integration needed.`,
      ],
      check: [
        { q: r`What is the magnetic flux out of any closed surface?`, a: r`Zero: $\nabla\cdot\vec B = 0$.` },
        { q: r`Find the flux of $\vec r$ out of a cube of side 2.`, a: r`$3 \times 8 = 24$.` },
      ],
    },
    {
      name: "Stokes' Theorem",
      inShort: r`The circulation round a loop equals the curl's flux through any surface it bounds.`,
      body: [
        r`For a surface $S$ with edge $C$,
$$\oint_C\vec F\cdot d\vec r = \iint_S(\nabla\times\vec F)\cdot\hat n\,dS,$$
with $C$ and $\hat n$ related by the **right-hand rule**: curl the fingers along $C$ and the thumb gives $\hat n$. The circulation round the loop equals the flux of the curl through **any** surface spanning it, so pick the flattest.

In electromagnetics it turns the point laws into the circuit laws: **Ampère's law** $\oint\vec H\cdot d\vec l = I_{enc}$ from $\nabla\times\vec H = \vec J$, and **Faraday's law** $\oint\vec E\cdot d\vec l = -\frac{d\Phi}{dt}$ from $\nabla\times\vec E = -\frac{\partial\vec B}{\partial t}$. Green's theorem is the flat case, and a field with zero curl has zero circulation round every loop.`,
      ],
      keyIdeas: [
        r`$\oint_C\vec F\cdot d\vec r = \iint_S(\nabla\times\vec F)\cdot\hat n\,dS$, oriented by the right-hand rule.`,
        r`Green's theorem is the flat case; Ampère's and Faraday's laws use it.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A steady swirl',
          problem: r`Find the circulation of $\vec F = (-y, x, 0)$ round the unit circle in the $xy$-plane.`,
          steps: [
            r`$\nabla\times\vec F = (0, 0, 2)$.`,
            r`Through the disc the flux is $2 \times \pi = 2\pi$. Any surface with the same edge gives the same.`,
          ],
          answer: r`$2\pi$.`,
        },
        {
          level: 'board',
          title: 'Two circulations',
          problem: r`Find the circulation counterclockwise (seen from above) of (a) $\vec F = (z, x, y)$ round the unit circle in the $xy$-plane, and (b) $\vec F = (2y, 3x, z^2)$ round the circle of radius 2 in the $xy$-plane.`,
          steps: [
            r`(a) $\nabla\times\vec F = (1, 1, 1)$; through the disc with $\hat n = \hat k$: $1 \times \pi = \pi$.`,
            r`(b) $\nabla\times\vec F = (0, 0, 3 - 2) = (0, 0, 1)$: $1 \times 4\pi = 4\pi = 12.566$.`,
          ],
          answer: r`(a) $\pi$; (b) $4\pi \approx 12.566$.`,
        },
      ],
      traps: [
        r`Curl your right hand's fingers along the loop: the thumb gives the normal.`,
        r`Only the curl's component along $\hat n$ counts: $(1, 1, 1)\cdot\hat k = 1$.`,
      ],
      check: [
        { q: r`What is the circulation of a gradient field round any loop?`, a: r`$0$: its curl is zero.` },
        { q: r`Which law is Stokes' theorem applied to $\nabla\times\vec H = \vec J$?`, a: r`Ampère's circuital law.` },
      ],
    },
  ],
};
