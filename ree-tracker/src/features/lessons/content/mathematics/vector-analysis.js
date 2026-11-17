// Library › Lessons › Mathematics › Vector Analysis (2026-11-17): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand.
const r = String.raw;

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
      keyIdeas: [
        r`$\overrightarrow{PQ} = Q - P$; $|\vec A| = \sqrt{A_x^2 + A_y^2 + A_z^2}$; $\hat a = \frac{\vec A}{|\vec A|}$.`,
        r`Add part by part; $|\vec A + \vec B| = \sqrt{A^2 + B^2 + 2AB\cos\theta}$.`,
      ],
      example: {
        problem: r`Find the vector from $P(1, 2, -1)$ to $Q(4, 0, 4)$, its length, and the unit vector along it.`,
        solution: r`$\overrightarrow{PQ} = (3, -2, 5)$, $|\overrightarrow{PQ}| = \sqrt{38} \approx 6.164$, and $\hat a = \frac{(3, -2, 5)}{\sqrt{38}}$.`,
      },
      traps: [r`Head minus tail: $\overrightarrow{PQ}$ is $Q - P$, not $P - Q$.`],
    },
    {
      name: 'Dot Product',
      inShort: r`The product that gives a number: angles, projections and work.`,
      keyIdeas: [
        r`$\vec A\cdot\vec B = A_xB_x + A_yB_y + A_zB_z = |\vec A||\vec B|\cos\theta$; zero means perpendicular.`,
        r`Scalar projection $\frac{\vec A\cdot\vec B}{|\vec B|}$; vector projection $\frac{\vec A\cdot\vec B}{|\vec B|^2}\vec B$.`,
        r`Work $W = \vec F\cdot\vec d$.`,
      ],
      example: {
        problem: r`Find the angle between $(1, 2, 2)$ and $(2, -1, 2)$.`,
        solution: r`The dot product is $2 - 2 + 4 = 4$, and each has length $3$: $\cos\theta = \frac49$, so $\theta \approx 63.61^\circ$.`,
      },
      traps: [r`The dot product is a scalar; "$\vec A\cdot\vec B = (2, -2, 4)$" is not a dot product.`],
    },
    {
      name: 'Cross Product',
      inShort: r`The product that gives a vector square to both: areas and torque.`,
      keyIdeas: [
        r`$\vec A\times\vec B$ by the determinant with $\hat i, \hat j, \hat k$; $|\vec A\times\vec B| = AB\sin\theta$.`,
        r`$\vec B\times\vec A = -\vec A\times\vec B$; $\hat i\times\hat j = \hat k$ in cyclic order.`,
        r`Parallelogram area $|\vec A\times\vec B|$, triangle half of it; torque $\vec\tau = \vec r\times\vec F$.`,
      ],
      example: {
        problem: r`Find the area of the triangle $P(1, 0, 0)$, $Q(0, 2, 0)$, $R(0, 0, 3)$.`,
        solution: r`$\overrightarrow{PQ} = (-1, 2, 0)$ and $\overrightarrow{PR} = (-1, 0, 3)$; their cross product is $(6, 3, 2)$, of length $7$. The area is $3.5$.`,
      },
      traps: [r`The middle ($\hat j$) term of the determinant is subtracted.`],
    },
    {
      name: 'Triple Products',
      inShort: r`Products of three vectors: a volume, and a vector shortcut.`,
      keyIdeas: [
        r`$\vec A\cdot(\vec B\times\vec C)$ is the $3\times3$ determinant of the three: the parallelepiped's volume, zero when coplanar.`,
        r`A tetrahedron on the same edges has $\frac16$ of that volume.`,
        r`$\vec A\times(\vec B\times\vec C) = \vec B(\vec A\cdot\vec C) - \vec C(\vec A\cdot\vec B)$.`,
      ],
      example: {
        problem: r`Find the volume of the parallelepiped on $(2, 0, 0)$, $(1, 3, 0)$, $(1, 1, 4)$, and of the tetrahedron on them.`,
        solution: r`The determinant is $2(12 - 0) = 24$: volume $24$, tetrahedron $4$.`,
      },
      traps: [r`Take the absolute value: a negative triple product means a left-handed order, not a negative volume.`],
    },
    {
      name: 'Lines and Planes',
      inShort: r`Lines and planes in vector form, and the distances between them.`,
      keyIdeas: [
        r`Line $\vec r = \vec r_0 + t\vec d$. Plane: $\vec n\cdot(\vec r - \vec r_0) = 0$, with $\vec n = (B - A)\times(C - A)$ through three points.`,
        r`Point to line: $\frac{|(\vec P - \vec r_0)\times\vec d|}{|\vec d|}$. Skew lines: $\frac{|(\vec r_2 - \vec r_1)\cdot(\vec d_1\times\vec d_2)|}{|\vec d_1\times\vec d_2|}$.`,
        r`Two planes meet along $\vec n_1\times\vec n_2$.`,
      ],
      example: {
        problem: r`Find the plane through $(1, 0, 2)$, $(3, 1, -1)$ and $(0, 2, 1)$.`,
        solution: r`Edges $(2, 1, -3)$ and $(-1, 2, -1)$; their cross product is $(5, 5, 5)$, so the normal is $(1, 1, 1)$ and the plane is $x + y + z = 3$.`,
      },
      traps: [r`Check the plane with all three points: one wrong sign in the cross product shows up at once.`],
    },
    {
      name: 'Derivatives of Vector Functions',
      inShort: r`Velocity, acceleration and curvature of a moving point.`,
      keyIdeas: [
        r`$\vec v = \vec r'$, $\vec a = \vec r''$; speed $|\vec v|$.`,
        r`$\kappa = \frac{|\vec r'\times\vec r''|}{|\vec r'|^3}$; $a_T = \frac{\vec v\cdot\vec a}{|\vec v|}$, $a_N = \kappa v^2$.`,
        r`Product rules hold for dot and cross products, keeping the order.`,
      ],
      example: {
        problem: r`A point moves on the helix $\vec r = (2\cos t, 2\sin t, 0.5t)$. Find its speed and the curvature.`,
        solution: r`$\vec r' = (-2\sin t, 2\cos t, 0.5)$, so the speed is $\sqrt{4.25} \approx 2.062$ throughout. $\kappa = \frac{2}{4 + 0.25} \approx 0.471$, constant too.`,
      },
      traps: [r`Constant speed does not mean zero acceleration: on a curve, $a_N$ is still there.`],
    },
    {
      name: 'Directional Derivative and Gradient',
      inShort: r`How fast a scalar field changes in any direction, and which way it rises fastest.`,
      keyIdeas: [
        r`$\nabla f = (f_x, f_y, f_z)$; $D_{\hat u}f = \nabla f\cdot\hat u$.`,
        r`The greatest rate is $|\nabla f|$, along $\nabla f$; the gradient is square to level surfaces.`,
        r`Tangent plane to $F = c$ at $P$: $\nabla F(P)\cdot(\vec r - \vec P) = 0$.`,
      ],
      example: {
        problem: r`For $f = x^2y + yz$ at $(1, 2, -1)$, find the rate of change along $(2, -1, 2)$ and the greatest rate.`,
        solution: r`$\nabla f = (2xy, x^2 + z, y) = (4, 0, 2)$. Along $\frac{(2, -1, 2)}{3}$: $\frac{8 + 0 + 4}{3} = 4$. Greatest: $\sqrt{20} \approx 4.472$.`,
      },
      traps: [r`Normalise the direction; using $(2, -1, 2)$ itself triples the answer.`],
    },
    {
      name: 'Divergence',
      inShort: r`How much a field spreads out from a point.`,
      keyIdeas: [
        r`$\nabla\cdot\vec F = \frac{\partial P}{\partial x} + \frac{\partial Q}{\partial y} + \frac{\partial R}{\partial z}$, a scalar.`,
        r`$\nabla\cdot(f\vec F) = f\nabla\cdot\vec F + \vec F\cdot\nabla f$; $\nabla\cdot\vec r = 3$.`,
        r`Zero divergence everywhere: solenoidal, like the magnetic field.`,
      ],
      example: {
        problem: r`Find $\nabla\cdot\vec F$ for $\vec F = (xy, yz^2, e^xz)$ at $(0, 1, 2)$.`,
        solution: r`$\nabla\cdot\vec F = y + z^2 + e^x$; at the point, $1 + 4 + 1 = 6$.`,
      },
      traps: [r`Each component is differentiated by its own variable only: $P$ by $x$, $Q$ by $y$, $R$ by $z$.`],
    },
    {
      name: 'Curl',
      inShort: r`How much a field swirls, and when it is a gradient.`,
      keyIdeas: [
        r`$\nabla\times\vec F$ by the determinant with $\frac{\partial}{\partial x}, \frac{\partial}{\partial y}, \frac{\partial}{\partial z}$.`,
        r`$\nabla\times\nabla f = 0$ and $\nabla\cdot(\nabla\times\vec F) = 0$.`,
        r`Zero curl on a simply connected region: $\vec F = \nabla f$, conservative.`,
      ],
      example: {
        problem: r`Find the curl of $(-y, x, 0)$ and of $(yz, xz, xy)$.`,
        solution: r`The first is $(0, 0, 2)$: a steady rotation. The second is $(0, 0, 0)$: it is $\nabla(xyz)$, conservative.`,
      },
      traps: [r`Mind the signs in the $\hat j$ term, as in any cross product.`],
    },
    {
      name: 'Line Integrals',
      inShort: r`Adding up a field along a curve: work, and mass of a wire.`,
      keyIdeas: [
        r`$\int_C\vec F\cdot d\vec r = \int\vec F(\vec r(t))\cdot\vec r'(t)\,dt$.`,
        r`Conservative fields: $\int_C\nabla f\cdot d\vec r = f(B) - f(A)$, path does not matter.`,
        r`$\int_Cf\,ds = \int f\,|\vec r'|\,dt$.`,
      ],
      example: {
        problem: r`Find the work done by $\vec F = (y, x, 1)$ along $\vec r = (t, t^2, t^3)$ from $t = 0$ to $1$.`,
        solution: r`$\vec F = \nabla(xy + z)$, so the work is $f(1, 1, 1) - f(0, 0, 0) = 2$, whatever the path.`,
      },
      traps: [r`Check for a potential before parametrising; it turns the integral into two evaluations.`],
    },
    {
      name: 'Surface Integrals',
      inShort: r`Adding up over a surface: area, and the flux of a field through it.`,
      keyIdeas: [
        r`$dS = |\vec r_u\times\vec r_v|\,du\,dv$; for $z = g(x, y)$, $dS = \sqrt{1 + g_x^2 + g_y^2}\,dA$.`,
        r`Flux $\iint\vec F\cdot\hat n\,dS$, with the normal's direction chosen first.`,
      ],
      example: {
        problem: r`Find the area of a hemisphere of radius $2$, and the flux of $\vec F = \vec r$ out of the whole sphere.`,
        solution: r`With $dS = R^2\sin\phi\,d\phi\,d\theta$: area $2\pi R^2 = 8\pi \approx 25.13$. On the sphere $\vec r\cdot\hat n = R$, so the flux is $R\cdot4\pi R^2 = 32\pi \approx 100.5$.`,
      },
      traps: [r`The flux changes sign with the normal: outward is the convention for closed surfaces.`],
    },
    {
      name: "Green's Theorem",
      inShort: r`A line integral round a closed plane curve, as a double integral inside it.`,
      keyIdeas: [
        r`$\oint_C(P\,dx + Q\,dy) = \iint_D(Q_x - P_y)\,dA$, counterclockwise.`,
        r`Area: $\frac12\oint(x\,dy - y\,dx)$.`,
      ],
      example: {
        problem: r`Evaluate $\oint(-y\,dx + x^2\,dy)$ counterclockwise round the unit square $[0, 1]^2$.`,
        solution: r`$Q_x - P_y = 2x + 1$, and $\iint(2x + 1)\,dA = 1 + 1 = 2$.`,
      },
      traps: [r`It is $Q_x - P_y$, in that order; clockwise flips the sign.`],
    },
    {
      name: 'Divergence Theorem',
      inShort: r`The flux out of a closed surface equals the divergence added up inside (Gauss).`,
      keyIdeas: [
        r`$\oiint_S\vec F\cdot\hat n\,dS = \iiint_V\nabla\cdot\vec F\,dV$, normal outward.`,
        r`Gauss's law of electrostatics in integral and point form is this theorem.`,
      ],
      example: {
        problem: r`Find the flux of $\vec F = (x, y^2, z)$ out of the unit cube $[0, 1]^3$.`,
        solution: r`$\nabla\cdot\vec F = 2 + 2y$, so the flux is $\iiint(2 + 2y)\,dV = 2 + 1 = 3$, without six surface integrals.`,
      },
      traps: [r`The surface must be closed; for an open one, close it and subtract the lid.`],
    },
    {
      name: "Stokes' Theorem",
      inShort: r`The circulation round a loop equals the curl's flux through any surface it bounds.`,
      keyIdeas: [
        r`$\oint_C\vec F\cdot d\vec r = \iint_S(\nabla\times\vec F)\cdot\hat n\,dS$, oriented by the right-hand rule.`,
        r`Green's theorem is the flat case; Ampère's and Faraday's laws use it.`,
      ],
      example: {
        problem: r`Find the circulation of $\vec F = (-y, x, 0)$ round the unit circle in the $xy$-plane.`,
        solution: r`$\nabla\times\vec F = (0, 0, 2)$, so through the disc the flux is $2 \times \pi = 2\pi$. Any surface with the same edge gives the same.`,
      },
      traps: [r`Curl your right hand's fingers along the loop: the thumb gives the normal.`],
    },
  ],
};
