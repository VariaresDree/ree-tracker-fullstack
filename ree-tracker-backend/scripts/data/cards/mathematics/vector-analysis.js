'use strict';

// Mathematics › Vector Analysis formula cards (Library round, 2026-11-17):
// six live cards for 14 subtopics. Analytic Geometry already has the line,
// plane and point-to-plane cards in coordinate form, and Calculus 1 the
// two-variable gradient, so this file adds the vector forms under their own
// names. See algebra.js for the format; tests/vectorAnalysisFormulas.test.js
// checks every identity on concrete vectors and every integral theorem by
// computing both sides numerically.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const ALG = 'Vector Algebra';
const DOT = 'Dot Product';
const CROSS = 'Cross Product';
const TRIPLE = 'Triple Products';
const LP = 'Lines and Planes';
const DER = 'Derivatives of Vector Functions';
const GRAD = 'Directional Derivative and Gradient';
const DIV = 'Divergence';
const CURL = 'Curl';
const LINE = 'Line Integrals';
const SURF = 'Surface Integrals';
const GREEN = "Green's Theorem";
const GAUSS = 'Divergence Theorem';
const STOKES = "Stokes' Theorem";

const file = [
    ['616deb6f-2839-4d58-baed-4136189e8530', ALG, null],
    ['642d0ed7-c090-48fe-9dfb-3ccd97e107b7', ALG, null],
    ['6e7cc9d4-a4a5-4f28-8b8c-7349617452d3', DOT, null],
    ['19cade63-8a6f-411c-b803-b7f2e0d35504', DOT, 'Projections'],
    ['2af932bd-6c2f-40ff-b7d7-2732f12b412b', CROSS, null],
    ['b455e787-9e3a-43de-a226-25f22ececd0c', DIV, null],
];

const revisions = [
    { id: 'b455e787-9e3a-43de-a226-25f22ececd0c', note: 'It had no symbol.', symbol: r`$\nabla \cdot \vec{F}$` },
    { id: '6e7cc9d4-a4a5-4f28-8b8c-7349617452d3', note: 'It had no symbol.', symbol: r`$\vec{A} \cdot \vec{B}$` },
    { id: '2af932bd-6c2f-40ff-b7d7-2732f12b412b', note: 'It had no symbol.', symbol: r`$|\vec{A} \times \vec{B}|$` },
    { id: '19cade63-8a6f-411c-b803-b7f2e0d35504', note: 'It had no symbol.', symbol: r`$\text{comp}_{\vec{B}}\vec{A}$` },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const AB = v(r`$\vec{A}, \vec{B}$`, 'vectors');
const FIELD = v(r`$\vec{F} = (P, Q, R)$`, 'a vector field');

const drafts = [
    // Vector Algebra
    F(ALG, null, 'Vector Between Two Points', r`$\overrightarrow{PQ}$`, r`$\overrightarrow{PQ} = (x_2 - x_1,\ y_2 - y_1,\ z_2 - z_1)$`,
        [v(r`$P, Q$`, 'the tail and the head')],
        'The vector from one point to another: head minus tail.',
        r`$\overrightarrow{QP} = -\overrightarrow{PQ}$.`),
    F(ALG, null, 'Resultant of Two Vectors', r`$R$`, r`$|\vec{A} + \vec{B}| = \sqrt{A^2 + B^2 + 2AB\cos\theta}$`,
        [AB, v(r`$\theta$`, 'the angle between them, tail to tail')],
        'The size of the sum of two vectors from their sizes and the angle between them.',
        r`Add by components when you can: $\vec{A} + \vec{B} = (A_x + B_x, \ldots)$. With $\theta = 90^\circ$ it is Pythagoras.`),
    F(ALG, null, 'Point Dividing a Segment in Vector Form', r`$\vec{r}$`, r`$\vec{r} = \frac{n\vec{a} + m\vec{b}}{m + n}$`,
        [v(r`$\vec{a}, \vec{b}$`, 'position vectors of the ends'), v(r`$m:n$`, 'the ratio from the first end')],
        'The position vector of the point cutting a segment in the ratio m : n.',
        'The midpoint is (a + b)/2.'),
    // Dot Product
    F(DOT, null, 'Angle Between Two Vectors', r`$\cos\theta$`, r`$\cos\theta = \frac{\vec{A}\cdot\vec{B}}{|\vec{A}||\vec{B}|},\qquad \vec{A}\cdot\vec{B} = 0 \iff \vec{A} \perp \vec{B}$`, [AB],
        'The angle between two vectors from their dot product.',
        'A negative dot product means an obtuse angle.'),
    F(DOT, null, 'Properties of the Dot Product', r`$\vec{A}\cdot\vec{A}$`, r`$\vec{A}\cdot\vec{A} = |\vec{A}|^2,\quad \vec{A}\cdot\vec{B} = \vec{B}\cdot\vec{A},\quad \hat{i}\cdot\hat{i} = 1,\ \hat{i}\cdot\hat{j} = 0$`, [AB],
        'The dot product is commutative and distributes over addition.',
        'The result is a number, not a vector.'),
    F(DOT, 'Projections', 'Vector Projection', r`$\text{proj}_{\vec{B}}\vec{A}$`, r`$\text{proj}_{\vec{B}}\vec{A} = \frac{\vec{A}\cdot\vec{B}}{|\vec{B}|^2}\,\vec{B}$`, [AB],
        'The part of A along B, as a vector.',
        'Its length is the scalar projection; A minus it is the part square to B.'),
    F(DOT, null, 'Work Done by a Force', r`$W = \vec{F}\cdot\vec{d}$`, r`$W = \vec{F}\cdot\vec{d} = Fd\cos\theta$`,
        [v(r`$\vec{F}$`, 'the force'), v(r`$\vec{d}$`, 'the displacement')],
        'Work is the force along the motion times the distance.',
        'A force square to the motion does no work.'),
    // Cross Product
    F(CROSS, null, 'Cross Product in Components', r`$\vec{A}\times\vec{B}$`, r`$\vec{A}\times\vec{B} = \begin{vmatrix}\hat{i} & \hat{j} & \hat{k}\\ A_x & A_y & A_z\\ B_x & B_y & B_z\end{vmatrix}$`, [AB],
        'The cross product as a determinant: a vector square to both.',
        r`$\vec{B}\times\vec{A} = -\vec{A}\times\vec{B}$; $\hat{i}\times\hat{j} = \hat{k}$, $\hat{j}\times\hat{k} = \hat{i}$, $\hat{k}\times\hat{i} = \hat{j}$.`),
    F(CROSS, null, 'Area by the Cross Product', r`$|\vec{A}\times\vec{B}|$`, r`$\text{parallelogram} = |\vec{A}\times\vec{B}|,\qquad \text{triangle} = \frac12|\vec{A}\times\vec{B}|$`,
        [v(r`$\vec{A}, \vec{B}$`, 'two sides from one corner')],
        'Areas from two edge vectors.',
        r`A triangle $PQR$: $\frac12|\overrightarrow{PQ}\times\overrightarrow{PR}|$.`),
    F(CROSS, null, 'Torque', r`$\vec{\tau} = \vec{r}\times\vec{F}$`, r`$\vec{\tau} = \vec{r}\times\vec{F},\qquad |\vec{\tau}| = rF\sin\theta$`,
        [v(r`$\vec{r}$`, 'from the pivot to where the force acts'), v(r`$\vec{F}$`, 'the force')],
        'The turning effect of a force about a point.',
        r`The order matters: $\vec{r}\times\vec{F}$, not $\vec{F}\times\vec{r}$.`),
    // Triple Products
    F(TRIPLE, null, 'Scalar Triple Product', r`$\vec{A}\cdot(\vec{B}\times\vec{C})$`, r`$\vec{A}\cdot(\vec{B}\times\vec{C}) = \begin{vmatrix}A_x & A_y & A_z\\ B_x & B_y & B_z\\ C_x & C_y & C_z\end{vmatrix}$`,
        [v(r`$\vec{A}, \vec{B}, \vec{C}$`, 'three vectors')],
        'The volume of the parallelepiped on three edges (up to sign); zero means coplanar.',
        'A tetrahedron on the same edges has a sixth of that volume.'),
    F(TRIPLE, null, 'Vector Triple Product', r`$\vec{A}\times(\vec{B}\times\vec{C})$`, r`$\vec{A}\times(\vec{B}\times\vec{C}) = \vec{B}(\vec{A}\cdot\vec{C}) - \vec{C}(\vec{A}\cdot\vec{B})$`,
        [v(r`$\vec{A}, \vec{B}, \vec{C}$`, 'three vectors')],
        '"BAC minus CAB": a cross product of a cross product, without a determinant.',
        r`$(\vec{A}\times\vec{B})\times\vec{C}$ is a different vector: the brackets matter.`),
    // Lines and Planes
    F(LP, 'Lines', 'Vector Equation of a Line', r`$\vec{r} = \vec{r}_0 + t\vec{d}$`, r`$\vec{r} = \vec{r}_0 + t\vec{d}$`,
        [v(r`$\vec{r}_0$`, 'a point on the line'), v(r`$\vec{d}$`, 'its direction'), v(r`$t$`, 'the parameter')],
        'A line through a point in a given direction.',
        'Two points give d = r₁ − r₀.'),
    F(LP, 'Planes', 'Plane Through Three Points', r`$\vec{n}$`, r`$\vec{n} = (\vec{B} - \vec{A})\times(\vec{C} - \vec{A}),\qquad \vec{n}\cdot(\vec{r} - \vec{A}) = 0$`,
        [v(r`$\vec{A}, \vec{B}, \vec{C}$`, 'three points, not on one line'), v(r`$\vec{n}$`, 'a normal to the plane')],
        'A normal from two edges, then the plane through one point.',
        'If n comes out zero, the three points are on one line.'),
    F(LP, 'Distances', 'Distance from a Point to a Line in Space', r`$d$`, r`$d = \frac{|(\vec{P} - \vec{r}_0)\times\vec{d}|}{|\vec{d}|}$`,
        [v(r`$\vec{P}$`, 'the point'), v(r`$\vec{r}_0, \vec{d}$`, 'a point on the line and its direction')],
        'How far a point is from a line in space.',
        'In the plane the formula |Ax + By + C|/√(A² + B²) is quicker.'),
    F(LP, 'Distances', 'Distance Between Skew Lines', r`$d$`, r`$d = \frac{|(\vec{r}_2 - \vec{r}_1)\cdot(\vec{d}_1\times\vec{d}_2)|}{|\vec{d}_1\times\vec{d}_2|}$`,
        [v(r`$\vec{r}_1, \vec{d}_1$`, 'a point and direction of the first line'), v(r`$\vec{r}_2, \vec{d}_2$`, 'of the second')],
        'The shortest distance between two lines that neither meet nor are parallel.',
        r`Zero means the lines meet; $\vec{d}_1\times\vec{d}_2 = 0$ means they are parallel.`),
    F(LP, 'Planes', 'Line of Intersection of Two Planes', r`$\vec{n}_1\times\vec{n}_2$`, r`$\vec{d} = \vec{n}_1\times\vec{n}_2$`,
        [v(r`$\vec{n}_1, \vec{n}_2$`, 'the normals of the two planes')],
        'Two planes meet along a line square to both normals.',
        'Find one point on both planes (set z = 0 and solve), then use d.'),
    // Derivatives of Vector Functions
    F(DER, 'Motion', 'Velocity and Acceleration Vectors', r`$\vec{v} = \vec{r}'$`, r`$\vec{v} = \frac{d\vec{r}}{dt},\quad \vec{a} = \frac{d^2\vec{r}}{dt^2},\quad \text{speed} = |\vec{v}|$`,
        [v(r`$\vec{r}(t)$`, 'the position')],
        'Differentiate a position vector component by component.',
        'Speed is the magnitude of velocity, a scalar.'),
    F(DER, 'Motion', 'Tangential and Normal Acceleration', r`$a_T, a_N$`, r`$a_T = \frac{\vec{v}\cdot\vec{a}}{|\vec{v}|},\qquad a_N = \frac{|\vec{v}\times\vec{a}|}{|\vec{v}|} = \kappa v^2$`,
        [v(r`$\vec{v}, \vec{a}$`, 'velocity and acceleration'), v(r`$\kappa$`, 'curvature')],
        'The parts of acceleration along the path and toward its centre of curvature.',
        r`$a_T^2 + a_N^2 = |\vec{a}|^2$; in uniform circular motion $a_T = 0$.`),
    F(DER, 'Curves', 'Unit Tangent and Curvature of a Space Curve', r`$\kappa$`, r`$\hat{T} = \frac{\vec{r}'}{|\vec{r}'|},\qquad \kappa = \frac{|\vec{r}'\times\vec{r}''|}{|\vec{r}'|^3}$`,
        [v(r`$\vec{r}(t)$`, 'the curve')],
        'The direction of a curve and how sharply it bends.',
        'A circle of radius a has curvature 1/a everywhere.'),
    F(DER, 'Rules', 'Derivatives of Dot and Cross Products', r`$(\vec{A}\times\vec{B})'$`, r`$(\vec{A}\cdot\vec{B})' = \vec{A}'\cdot\vec{B} + \vec{A}\cdot\vec{B}',\qquad (\vec{A}\times\vec{B})' = \vec{A}'\times\vec{B} + \vec{A}\times\vec{B}'$`,
        [v(r`$\vec{A}(t), \vec{B}(t)$`, 'vector functions')],
        'The product rule for vectors.',
        'Keep the order in the cross product.'),
    // Directional Derivative and Gradient
    F(GRAD, null, 'Gradient of a Scalar Field', r`$\nabla f$`, r`$\nabla f = \left(\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}, \frac{\partial f}{\partial z}\right),\qquad D_{\hat{u}}f = \nabla f\cdot\hat{u}$`,
        [v(r`$f(x, y, z)$`, 'a scalar field'), v(r`$\hat{u}$`, 'a unit direction')],
        'The gradient points the way f rises fastest, at rate |∇f|, and is square to level surfaces.',
        'Normalise the direction before the dot product.'),
    F(GRAD, null, 'Tangent Plane to a Surface', r`$\nabla F\cdot(\vec{r} - \vec{P})$`, r`$F(x, y, z) = c:\quad \nabla F(P)\cdot(\vec{r} - \vec{P}) = 0$`,
        [v(r`$P$`, 'a point on the surface'), v(r`$\nabla F(P)$`, 'the normal there')],
        'The plane touching a surface at a point, with the gradient as its normal.',
        r`The normal line is $\vec{r} = \vec{P} + t\nabla F(P)$.`),
    // Divergence
    F(DIV, null, 'Divergence Identities', r`$\nabla\cdot(f\vec{F})$`, r`$\nabla\cdot(f\vec{F}) = f\,\nabla\cdot\vec{F} + \vec{F}\cdot\nabla f,\qquad \nabla\cdot\vec{r} = 3$`,
        [v(r`$f$`, 'a scalar field'), FIELD],
        'Divergence of a product, and of the position vector.',
        'A field with zero divergence everywhere is solenoidal, as the magnetic field is.'),
    // Curl
    F(CURL, null, 'Curl of a Vector Field', r`$\nabla\times\vec{F}$`, r`$\nabla\times\vec{F} = \begin{vmatrix}\hat{i} & \hat{j} & \hat{k}\\ \frac{\partial}{\partial x} & \frac{\partial}{\partial y} & \frac{\partial}{\partial z}\\ P & Q & R\end{vmatrix}$`,
        [FIELD],
        'How much a field swirls around each point.',
        'The k component is Q_x − P_y, the same as in Green\'s theorem.'),
    F(CURL, null, 'Curl and Divergence Identities', r`$\nabla\times\nabla f = 0$`, r`$\nabla\times(\nabla f) = \vec{0},\qquad \nabla\cdot(\nabla\times\vec{F}) = 0,\qquad \nabla^2f = f_{xx} + f_{yy} + f_{zz}$`,
        [v(r`$f$`, 'a scalar field'), FIELD],
        'A gradient has no curl, a curl has no divergence; the Laplacian is the divergence of the gradient.',
        r`On a simply connected region, $\nabla\times\vec{F} = 0$ means $\vec{F}$ is conservative: $\vec{F} = \nabla f$.`),
    // Line Integrals
    F(LINE, null, 'Line Integral of a Vector Field', r`$\int_C\vec{F}\cdot d\vec{r}$`, r`$\int_C\vec{F}\cdot d\vec{r} = \int_a^b\vec{F}(\vec{r}(t))\cdot\vec{r}'(t)\,dt$`,
        [FIELD, v(r`$\vec{r}(t)$`, r`the path, $a \le t \le b$`)],
        'The work a field does along a path.',
        'Reversing the path flips the sign.'),
    F(LINE, null, 'Fundamental Theorem for Line Integrals', r`$\int\nabla f\cdot d\vec{r}$`, r`$\int_C\nabla f\cdot d\vec{r} = f(B) - f(A)$`,
        [v(r`$f$`, 'a potential'), v(r`$A, B$`, 'the start and end of C')],
        'For a conservative field the line integral depends only on the end points.',
        'Around any closed path it is zero.'),
    F(LINE, null, 'Line Integral of a Scalar Function', r`$\int_Cf\,ds$`, r`$\int_Cf\,ds = \int_a^bf(\vec{r}(t))\,|\vec{r}'(t)|\,dt$`,
        [v(r`$f$`, 'a scalar function'), v(r`$\vec{r}(t)$`, 'the path')],
        'Integrating along a curve by arc length: mass of a wire, its length when f = 1.',
        'Unlike the vector form, this one does not change sign with direction.'),
    // Surface Integrals
    F(SURF, null, 'Surface Area Element', r`$dS$`, r`$dS = |\vec{r}_u\times\vec{r}_v|\,du\,dv;\qquad z = g(x, y):\ dS = \sqrt{1 + g_x^2 + g_y^2}\,dA$`,
        [v(r`$\vec{r}(u, v)$`, 'a parametrised surface'), v(r`$g$`, 'a surface given as z = g(x, y)')],
        'The area of a small patch of a surface.',
        r`$\iint_S dS$ is the surface's area.`),
    F(SURF, null, 'Flux Through a Surface', r`$\iint\vec{F}\cdot\hat{n}\,dS$`, r`$\Phi = \iint_S\vec{F}\cdot\hat{n}\,dS = \iint_D\vec{F}\cdot(\vec{r}_u\times\vec{r}_v)\,du\,dv$`,
        [FIELD, v(r`$\hat{n}$`, 'the chosen unit normal')],
        'How much of a field passes through a surface.',
        'Choose the normal\'s direction first; the other choice flips the sign.'),
    // Green's Theorem
    F(GREEN, null, "Green's Theorem in the Plane", r`$\oint(P\,dx + Q\,dy)$`, r`$\oint_C(P\,dx + Q\,dy) = \iint_D\left(\frac{\partial Q}{\partial x} - \frac{\partial P}{\partial y}\right)dA$`,
        [v(r`$P, Q$`, 'components of a plane field'), v(r`$C$`, 'the boundary of D, counterclockwise')],
        'A line integral round a closed curve as a double integral over the region inside.',
        'Clockwise traversal flips the sign.'),
    F(GREEN, null, "Area by Green's Theorem", r`$A = \frac12\oint(x\,dy - y\,dx)$`, r`$A = \frac12\oint_C(x\,dy - y\,dx)$`,
        [v(r`$C$`, 'the boundary, counterclockwise')],
        'The area inside a closed curve from its boundary alone.',
        'For a polygon it becomes the shoelace formula.'),
    // Divergence Theorem
    F(GAUSS, null, 'Divergence Theorem (Gauss)', r`$\oiint\vec{F}\cdot\hat{n}\,dS$`, r`$\oiint_S\vec{F}\cdot\hat{n}\,dS = \iiint_V\nabla\cdot\vec{F}\,dV$`,
        [FIELD, v(r`$S$`, r`the closed surface bounding $V$, normal outward`)],
        'The flux out of a closed surface equals the total divergence inside.',
        'It is how Gauss\'s law of electrostatics turns from integral to point form.'),
    // Stokes' Theorem
    F(STOKES, null, "Stokes' Theorem", r`$\oint\vec{F}\cdot d\vec{r}$`, r`$\oint_C\vec{F}\cdot d\vec{r} = \iint_S(\nabla\times\vec{F})\cdot\hat{n}\,dS$`,
        [FIELD, v(r`$C$`, r`the edge of $S$, by the right-hand rule with $\hat{n}$`)],
        'The circulation round a loop equals the curl flux through any surface it bounds.',
        "Green's theorem is the flat case; Ampère's law uses it."),
];

module.exports = { subject: 'Mathematics', topic: 'Vector Analysis', migration: '20261206000000_cards_vector_analysis', file, revisions, retire, drafts };
