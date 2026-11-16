'use strict';

// Mathematics › Analytic Geometry formula cards (Library round, 2026-11-16):
// four live cards (distance, slope, point-slope, the circle) for 11 subtopics,
// so most of this file is new cards. See algebra.js for the format;
// tests/analyticGeometryFormulas.test.js checks the formulas numerically, on
// points and curves built from their definitions. Names a rejected card holds
// ("Midpoint Formula", "Vertex of a Parabola") are not reused: the insert
// would skip them.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const COORD = 'Coordinate Systems and Distance';
const LINES = 'Lines and Slopes';
const CIRC = 'Circles';
const PARAB = 'Parabola';
const ELL = 'Ellipse';
const HYP = 'Hyperbola';
const GEN = 'General Conic Sections';
const TR = 'Translation and Rotation of Axes';
const POL = 'Polar Coordinates';
const PAR = 'Parametric Equations';
const SPACE = 'Lines and Planes in Space';

const file = [
    ['ce7723d4-65b4-465d-9deb-1bc347b4dfa2', COORD, 'Distance'],
    ['8e88f70c-f68b-40c2-9f9f-354fc310af87', LINES, 'Slope'],
    ['2ffb3d47-29a9-4af9-9b58-cdb20b35a554', LINES, 'Forms of a line'],
    ['2f7f5dfe-b95c-4eb5-b963-40e23dbc840d', CIRC, 'Equations'],
];

const revisions = [
    { id: '2f7f5dfe-b95c-4eb5-b963-40e23dbc840d', note: 'It had no symbol.', symbol: r`$(x - h)^2 + (y - k)^2$` },
    { id: '2ffb3d47-29a9-4af9-9b58-cdb20b35a554', note: 'It had no symbol.', symbol: r`$y - y_1$` },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const P1 = v(r`$(x_1, y_1)$`, 'a point');
const P2 = v(r`$(x_2, y_2)$`, 'another point');
const LINE = v(r`$Ax + By + C = 0$`, 'the line, in general form');
const CENTRE = v(r`$(h, k)$`, 'the centre (or vertex)');
const AB = v(r`$a, b$`, 'the semi-major and semi-minor axes (ellipse), or the semi-transverse and semi-conjugate axes (hyperbola)');

const drafts = [
    // Coordinate Systems and Distance
    F(COORD, 'Points', 'Midpoint of a Segment', r`$M$`, r`$M = \left(\frac{x_1 + x_2}{2},\ \frac{y_1 + y_2}{2}\right)$`, [P1, P2],
        'The point halfway between two points: average the coordinates.',
        'Given one end and the midpoint, the other end is 2M − P₁.'),
    F(COORD, 'Points', 'Point Dividing a Segment', r`$P$`, r`$x = \frac{m x_2 + n x_1}{m + n},\quad y = \frac{m y_2 + n y_1}{m + n}$`,
        [P1, P2, v(r`$m : n$`, r`the ratio $P_1P : PP_2$`)],
        'The point that cuts a segment in a given ratio, measured from the first point.',
        r`Each end's coordinate is weighted by the far part of the ratio: $x_2$ by $m$, $x_1$ by $n$.`),
    F(COORD, 'Points', 'Centroid of a Triangle from Its Vertices', r`$G$`, r`$G = \left(\frac{x_1 + x_2 + x_3}{3},\ \frac{y_1 + y_2 + y_3}{3}\right)$`,
        [v(r`$(x_i, y_i)$`, 'the three vertices')],
        'Where the medians meet: the average of the vertices.',
        'It divides each median 2 : 1 from the vertex.'),
    F(COORD, 'Areas', 'Area of a Triangle from Its Vertices', r`$A$`, r`$A = \frac12\left|x_1(y_2 - y_3) + x_2(y_3 - y_1) + x_3(y_1 - y_2)\right|$`,
        [v(r`$(x_i, y_i)$`, 'the three vertices')],
        'The area of a triangle from the coordinates of its corners.',
        'An area of zero means the three points are on one line.'),
    F(COORD, 'Areas', 'Shoelace Formula', r`$A$`, r`$A = \frac12\left|\sum_{i=1}^{n}\left(x_i y_{i+1} - x_{i+1} y_i\right)\right|$`,
        [v(r`$(x_i, y_i)$`, r`the vertices in order around the polygon, with $(x_{n+1}, y_{n+1}) = (x_1, y_1)$`)],
        'The area of any simple polygon from its vertices, taken in order.',
        'List the vertices in order (either direction) and repeat the first at the end.'),
    F(COORD, 'Distance', 'Distance Between Two Points in Space', r`$d$`, r`$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}$`,
        [v(r`$(x_1, y_1, z_1)$`, 'a point'), v(r`$(x_2, y_2, z_2)$`, 'another point')],
        'The plane distance formula with a third coordinate.',
        'The space diagonal of a box is the same formula with its edges.'),
    // Lines and Slopes
    F(LINES, 'Slope', 'Slope from the Angle of Inclination', r`$m = \tan\theta$`, r`$m = \tan\theta$`,
        [v(r`$\theta$`, r`angle the line makes with the positive $x$-axis, $0^\circ \le \theta < 180^\circ$`)],
        'A line\'s slope is the tangent of its inclination.',
        'A falling line has an inclination over 90° and a negative slope.'),
    F(LINES, 'Slope', 'Parallel and Perpendicular Slopes', r`$m_1 m_2 = -1$`, r`$\parallel:\ m_1 = m_2,\qquad \perp:\ m_1 m_2 = -1$`,
        [v(r`$m_1, m_2$`, 'the slopes of the two lines')],
        'Parallel lines have equal slopes; perpendicular ones, negative reciprocal slopes.',
        'A vertical line has no slope; it is perpendicular to any horizontal one.'),
    F(LINES, 'Forms of a line', 'Slope-Intercept and Intercept Forms', r`$y = mx + b$`, r`$y = mx + b,\qquad \frac{x}{a} + \frac{y}{b} = 1$`,
        [v(r`$m$`, 'slope'), v(r`$b$`, r`$y$-intercept`), v(r`$a$`, r`$x$-intercept (intercept form)`)],
        'A line from its slope and y-intercept, or from its two intercepts.',
        r`In intercept form the slope is $-\frac{b}{a}$.`),
    F(LINES, 'Forms of a line', 'Two-Point Form of a Line', r`$y - y_1$`, r`$y - y_1 = \frac{y_2 - y_1}{x_2 - x_1}(x - x_1)$`, [P1, P2],
        'The line through two points.',
        'It is point-slope form with the slope worked out from the points.'),
    F(LINES, 'Forms of a line', 'General Form of a Line', r`$Ax + By + C = 0$`, r`$Ax + By + C = 0,\quad m = -\frac{A}{B},\quad b = -\frac{C}{B}$`,
        [v(r`$A, B, C$`, 'constants'), v(r`$m$`, 'slope'), v(r`$b$`, r`$y$-intercept`)],
        'Every line, vertical ones included, in one form.',
        'Lines parallel to Ax + By + C = 0 are Ax + By + k = 0; perpendicular ones, Bx − Ay + k = 0.'),
    F(LINES, 'Angles and distances', 'Angle Between Two Lines', r`$\tan\theta$`, r`$\tan\theta = \frac{m_2 - m_1}{1 + m_1 m_2}$`,
        [v(r`$m_1, m_2$`, 'the slopes'), v(r`$\theta$`, 'the angle from the first line to the second, counterclockwise')],
        'The angle between two lines from their slopes.',
        r`With absolute value it gives the acute angle; $1 + m_1m_2 = 0$ means perpendicular.`),
    F(LINES, 'Angles and distances', 'Distance from a Point to a Line', r`$d$`, r`$d = \frac{|Ax_1 + By_1 + C|}{\sqrt{A^2 + B^2}}$`, [LINE, P1],
        'The perpendicular distance from a point to a line.',
        'Put the line in general form first; the sign inside tells which side the point is on.'),
    F(LINES, 'Angles and distances', 'Distance Between Parallel Lines', r`$d$`, r`$d = \frac{|C_2 - C_1|}{\sqrt{A^2 + B^2}}$`,
        [v(r`$Ax + By + C_1 = 0$`, 'one line'), v(r`$Ax + By + C_2 = 0$`, 'the other, with the same A and B')],
        'The gap between two parallel lines.',
        'Scale one equation first so both have the same A and B.'),
    // Circles
    F(CIRC, 'Equations', 'General Equation of a Circle', r`$x^2 + y^2 + Dx + Ey + F$`, r`$x^2 + y^2 + Dx + Ey + F = 0,\quad (h, k) = \left(-\frac{D}{2}, -\frac{E}{2}\right),\quad r = \frac12\sqrt{D^2 + E^2 - 4F}$`,
        [v(r`$D, E, F$`, 'constants'), CENTRE, v(r`$r$`, 'radius')],
        'A circle in expanded form, with its centre and radius read off.',
        r`$D^2 + E^2 - 4F < 0$: no circle at all; $= 0$: a single point.`),
    F(CIRC, 'Tangents', 'Tangent to a Circle at a Point', r`$(x_1 - h)(x - h)$`, r`$(x_1 - h)(x - h) + (y_1 - k)(y - k) = r^2$`, [CENTRE, v(r`$r$`, 'radius'), v(r`$(x_1, y_1)$`, 'the point of tangency, on the circle')],
        'The tangent line at a point of a circle.',
        'Replace one x in (x − h)² by x₁ and one y by y₁; the tangent is perpendicular to the radius there.'),
    F(CIRC, 'Tangents', 'Tangent Length from a Point', r`$L$`, r`$L = \sqrt{x_1^2 + y_1^2 + Dx_1 + Ey_1 + F}$`,
        [v(r`$D, E, F$`, 'the circle in general form'), v(r`$(x_1, y_1)$`, 'a point outside the circle')],
        'How long a tangent from a point to a circle is: put the point into the circle\'s equation.',
        'The value under the root is the power of the point: negative inside, zero on the circle.'),
    // Parabola
    F(PARAB, 'Standard forms', 'Parabola with Vertex at the Origin', r`$y^2 = 4ax$`, r`$y^2 = 4ax\ \text{(opens right)},\quad x^2 = 4ay\ \text{(opens up)}$`,
        [v(r`$a$`, 'the distance from the vertex to the focus (negative: opens left or down)')],
        'The two basic parabolas: focus a from the vertex, directrix a on the other side.',
        r`For $y^2 = 4ax$: focus $(a, 0)$, directrix $x = -a$.`),
    F(PARAB, 'Standard forms', 'Parabola with Vertex (h, k)', r`$(y - k)^2 = 4a(x - h)$`, r`$(y - k)^2 = 4a(x - h),\qquad (x - h)^2 = 4a(y - k)$`,
        [CENTRE, v(r`$a$`, 'vertex to focus')],
        'A parabola moved so its vertex is (h, k).',
        'Complete the square on the squared variable to reach this form.'),
    F(PARAB, 'Parts', 'Latus Rectum of a Parabola', r`$LR$`, r`$LR = 4|a|$`, [v(r`$a$`, 'vertex to focus')],
        'The chord through the focus, square to the axis.',
        r`Its ends are $2a$ either side of the focus.`),
    F(PARAB, 'Parts', 'Vertex and Focus of y = Ax² + Bx + C', r`$h = -\frac{B}{2A}$`, r`$h = -\frac{B}{2A},\quad k = C - \frac{B^2}{4A},\quad a = \frac{1}{4A}$`,
        [v(r`$A, B, C$`, r`the coefficients of $y = Ax^2 + Bx + C$`), v(r`$(h, k)$`, 'vertex'), v(r`$a$`, 'vertex to focus')],
        'The vertex and focal distance of a vertical parabola given as a quadratic.',
        r`The focus is $(h, k + a)$; $A > 0$ opens up.`),
    // Ellipse
    F(ELL, 'Equation', 'Standard Equation of an Ellipse', r`$\frac{x^2}{a^2} + \frac{y^2}{b^2}$`, r`$\frac{(x - h)^2}{a^2} + \frac{(y - k)^2}{b^2} = 1,\quad a > b$`,
        [CENTRE, AB],
        'An ellipse with a horizontal major axis; swap a² to the y term for a vertical one.',
        'The larger denominator is a² and names the major axis.'),
    F(ELL, 'Foci', 'Foci and Eccentricity of an Ellipse', r`$c^2 = a^2 - b^2$`, r`$c^2 = a^2 - b^2,\quad e = \frac{c}{a} < 1$`,
        [AB, v(r`$c$`, 'centre to focus'), v(r`$e$`, 'eccentricity')],
        'Where the foci are, and how flat the ellipse is.',
        'e near 0 is nearly a circle; near 1, long and thin.'),
    F(ELL, 'Foci', 'Sum of Focal Distances', r`$PF_1 + PF_2 = 2a$`, r`$PF_1 + PF_2 = 2a$`,
        [v(r`$P$`, 'any point on the ellipse'), v(r`$F_1, F_2$`, 'the foci'), v(r`$a$`, 'semi-major axis')],
        'The definition of an ellipse: the two focal distances add to the major axis.',
        "A string of length 2a pinned at the foci draws it."),
    F(ELL, 'Parts', 'Latus Rectum and Directrices of an Ellipse', r`$\frac{2b^2}{a}$`, r`$LR = \frac{2b^2}{a},\qquad x = h \pm \frac{a}{e}$`,
        [AB, v(r`$e$`, 'eccentricity')],
        'The focal chord square to the major axis, and the two directrix lines.',
        r`For any point, $\frac{PF}{PD} = e$ with the nearer focus and directrix.`),
    // Hyperbola
    F(HYP, 'Equation', 'Standard Equation of a Hyperbola', r`$\frac{x^2}{a^2} - \frac{y^2}{b^2}$`, r`$\frac{(x - h)^2}{a^2} - \frac{(y - k)^2}{b^2} = 1$`,
        [CENTRE, AB],
        'A hyperbola opening left and right; the positive term names the transverse axis.',
        'Unlike the ellipse, a may be smaller than b: the sign decides, not the size.'),
    F(HYP, 'Foci', 'Foci and Eccentricity of a Hyperbola', r`$c^2 = a^2 + b^2$`, r`$c^2 = a^2 + b^2,\quad e = \frac{c}{a} > 1$`,
        [AB, v(r`$c$`, 'centre to focus'), v(r`$e$`, 'eccentricity')],
        'Where the foci of a hyperbola are: note the plus sign.',
        'Ellipse: c² = a² − b². Hyperbola: c² = a² + b².'),
    F(HYP, 'Foci', 'Difference of Focal Distances', r`$|PF_1 - PF_2| = 2a$`, r`$|PF_1 - PF_2| = 2a$`,
        [v(r`$P$`, 'any point on the hyperbola'), v(r`$F_1, F_2$`, 'the foci'), v(r`$a$`, 'semi-transverse axis')],
        'The definition of a hyperbola: the focal distances differ by the transverse axis.',
        'This is how LORAN-type navigation fixes a position from two time differences.'),
    F(HYP, 'Parts', 'Asymptotes of a Hyperbola', r`$y - k = \pm\frac{b}{a}(x - h)$`, r`$y - k = \pm\frac{b}{a}(x - h)$`, [CENTRE, AB],
        'The two lines the branches approach.',
        r`Quick way: set the right side to 0, $\frac{(x-h)^2}{a^2} - \frac{(y-k)^2}{b^2} = 0$, and factor.`),
    F(HYP, 'Parts', 'Latus Rectum of a Hyperbola', r`$\frac{2b^2}{a}$`, r`$LR = \frac{2b^2}{a}$`, [AB],
        'The focal chord square to the transverse axis.',
        'Same form as the ellipse\'s.'),
    F(HYP, 'Special', 'Rectangular Hyperbola', r`$x^2 - y^2 = a^2$`, r`$x^2 - y^2 = a^2,\quad e = \sqrt2;\qquad xy = k$`,
        [v(r`$a$`, 'semi-axis (a = b)'), v(r`$k$`, 'a constant (the same curve turned 45°)')],
        'The hyperbola with equal axes: its asymptotes are perpendicular.',
        r`$xy = k$ is one, with the axes as asymptotes: $k = \frac{a^2}{2}$.`),
    // General Conic Sections
    F(GEN, 'Identify', 'General Equation of a Conic', r`$Ax^2 + Bxy + Cy^2$`, r`$Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$`,
        [v(r`$A, \ldots, F$`, 'constants')],
        'Every conic is a second-degree equation in x and y.',
        'B ≠ 0 means the axes are turned; rotate to remove the xy term.'),
    F(GEN, 'Identify', 'Discriminant of a Conic', r`$B^2 - 4AC$`, r`$B^2 - 4AC \begin{cases} < 0 & \text{ellipse (circle if } B = 0,\ A = C) \\ = 0 & \text{parabola} \\ > 0 & \text{hyperbola} \end{cases}$`,
        [v(r`$A, B, C$`, r`the coefficients of $x^2$, $xy$, $y^2$`)],
        'Which conic a second-degree equation is, from three coefficients.',
        'Degenerate cases (a point, lines, nothing) pass the test too; check by completing the square.'),
    F(GEN, 'Identify', 'Conic by Eccentricity', r`$e = \frac{PF}{PD}$`, r`$e = \frac{PF}{PD}:\quad e = 0 \text{ circle},\ 0 < e < 1 \text{ ellipse},\ e = 1 \text{ parabola},\ e > 1 \text{ hyperbola}$`,
        [v(r`$PF$`, 'distance from a point to the focus'), v(r`$PD$`, 'distance from the point to the directrix')],
        'One definition for all conics: a fixed ratio of distances to a focus and a directrix.',
        'The parabola sits exactly between: equal distances.'),
    // Translation and Rotation of Axes
    F(TR, null, 'Translation of Axes', r`$x = x' + h$`, r`$x = x' + h,\quad y = y' + k$`,
        [v(r`$(x, y)$`, 'old coordinates'), v(r`$(x', y')$`, 'new coordinates'), v(r`$(h, k)$`, 'the new origin, in old coordinates')],
        'Moving the origin to (h, k) without turning the axes.',
        'Completing the square is a translation in disguise.'),
    F(TR, null, 'Rotation of Axes', r`$x = x'\cos\theta - y'\sin\theta$`, r`$x = x'\cos\theta - y'\sin\theta,\quad y = x'\sin\theta + y'\cos\theta$`,
        [v(r`$(x, y)$`, 'old coordinates'), v(r`$(x', y')$`, 'new coordinates'), v(r`$\theta$`, 'the angle the axes turn, counterclockwise')],
        'Turning the axes through θ about the origin.',
        r`The reverse: $x' = x\cos\theta + y\sin\theta$, $y' = -x\sin\theta + y\cos\theta$.`),
    F(TR, null, 'Angle That Removes the xy Term', r`$\cot 2\theta$`, r`$\cot 2\theta = \frac{A - C}{B}$`,
        [v(r`$A, B, C$`, r`the coefficients of $x^2$, $xy$, $y^2$`), v(r`$\theta$`, 'rotation angle, 0° to 90°')],
        'How far to turn the axes so the conic has no xy term.',
        r`$A = C$ means $\theta = 45^\circ$.`),
    F(TR, null, 'Invariants Under Rotation', r`$A + C$`, r`$A' + C' = A + C,\qquad B'^2 - 4A'C' = B^2 - 4AC$`,
        [v(r`$A, B, C$`, 'coefficients before the rotation'), v(r`$A', B', C'$`, 'after it')],
        'What a rotation leaves unchanged: so the kind of conic never changes.',
        r`After removing $xy$: $A'C' = AC - \frac{B^2}{4}$, which with $A' + C'$ gives $A'$ and $C'$.`),
    // Polar Coordinates
    F(POL, 'Conversion', 'Polar and Rectangular Coordinates', r`$x = r\cos\theta$`, r`$x = r\cos\theta,\quad y = r\sin\theta,\quad r^2 = x^2 + y^2,\quad \tan\theta = \frac{y}{x}$`,
        [v(r`$(r, \theta)$`, 'polar coordinates'), v(r`$(x, y)$`, 'rectangular coordinates')],
        'Changing between polar and rectangular coordinates.',
        r`$\tan^{-1}\frac{y}{x}$ gives the wrong quadrant for half the plane: check the signs of $x$ and $y$.`),
    F(POL, 'Conversion', 'Distance Between Points in Polar Form', r`$d$`, r`$d^2 = r_1^2 + r_2^2 - 2r_1 r_2\cos(\theta_2 - \theta_1)$`,
        [v(r`$(r_1, \theta_1), (r_2, \theta_2)$`, 'the two points')],
        'The distance between two polar points: the cosine law.',
        'No need to convert to x and y first.'),
    F(POL, 'Curves', 'Polar Equation of a Conic', r`$r = \frac{ed}{1 \pm e\cos\theta}$`, r`$r = \frac{ed}{1 \pm e\cos\theta}$`,
        [v(r`$e$`, 'eccentricity'), v(r`$d$`, 'distance from the focus (the pole) to the directrix')],
        'Every conic with a focus at the pole.',
        r`Use $\sin\theta$ when the directrix is horizontal. Read $e$ only after the constant term is made 1.`),
    F(POL, 'Curves', 'Polar Circles and Roses', r`$r = a\cos n\theta$`, r`$r = 2a\cos\theta\ \text{(circle)},\qquad r = a\cos n\theta\ \text{(rose)}$`,
        [v(r`$a$`, 'radius (circle) or petal length (rose)'), v(r`$n$`, 'a whole number')],
        'Two common polar curves: a circle through the pole, and a rose.',
        'A rose has n petals when n is odd, 2n when n is even.'),
    F(POL, 'Areas', 'Area in Polar Coordinates', r`$A$`, r`$A = \frac12\int_{\alpha}^{\beta} r^2\,d\theta$`,
        [v(r`$r = f(\theta)$`, 'the curve'), v(r`$\alpha, \beta$`, 'the angles that bound the region')],
        'The area swept by a polar curve between two angles.',
        'For a rose, find one petal\'s angles (where r = 0) and multiply by the number of petals.'),
    // Parametric Equations
    F(PAR, 'Curves', 'Parametric Line', r`$x = x_1 + t(x_2 - x_1)$`, r`$x = x_1 + t(x_2 - x_1),\quad y = y_1 + t(y_2 - y_1)$`, [P1, P2, v(r`$t$`, 'the parameter: 0 at the first point, 1 at the second')],
        'The line through two points, traced by a parameter.',
        'Values of t between 0 and 1 give the segment; t = ½ is the midpoint.'),
    F(PAR, 'Curves', 'Parametric Circle and Ellipse', r`$x = h + a\cos t$`, r`$x = h + a\cos t,\quad y = k + b\sin t$`, [CENTRE, v(r`$a, b$`, 'the semi-axes (a = b: a circle)'), v(r`$t$`, 'the parameter, 0 to 2π')],
        'An ellipse (or circle) traced once as t goes round.',
        r`Eliminate $t$ with $\cos^2 t + \sin^2 t = 1$.`),
    F(PAR, 'Calculus', 'Slope of a Parametric Curve', r`$\frac{dy}{dx}$`, r`$\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$`,
        [v(r`$x(t), y(t)$`, 'the curve')],
        'The slope of a curve given in a parameter, without eliminating it.',
        'dx/dt = 0 (and dy/dt ≠ 0) is a vertical tangent.'),
    F(PAR, 'Curves', 'Cycloid', r`$x = r(t - \sin t)$`, r`$x = r(t - \sin t),\quad y = r(1 - \cos t)$`,
        [v(r`$r$`, 'radius of the rolling circle'), v(r`$t$`, 'the angle it has turned')],
        'The path of a point on the rim of a rolling wheel.',
        r`One arch is $8r$ long and encloses $3\pi r^2$.`),
    F(PAR, 'Curves', 'Projectile Path', r`$y = x\tan\alpha - \frac{gx^2}{2v_0^2\cos^2\alpha}$`, r`$x = v_0 t\cos\alpha,\quad y = v_0 t\sin\alpha - \frac12 g t^2$`,
        [v(r`$v_0$`, 'launch speed'), v(r`$\alpha$`, 'launch angle'), v(r`$g$`, r`gravity, $9.81$ m/s²`), v(r`$t$`, 'time')],
        'A projectile\'s position in time; eliminating t gives a parabola.',
        r`Range on level ground: $\frac{v_0^2\sin 2\alpha}{g}$, greatest at $45^\circ$.`),
    // Lines and Planes in Space
    F(SPACE, 'Lines', 'Direction Cosines', r`$\cos^2\alpha + \cos^2\beta + \cos^2\gamma$`, r`$\cos\alpha = \frac{a}{\sqrt{a^2 + b^2 + c^2}},\ \ldots,\qquad \cos^2\alpha + \cos^2\beta + \cos^2\gamma = 1$`,
        [v(r`$(a, b, c)$`, 'direction numbers of the line'), v(r`$\alpha, \beta, \gamma$`, r`the angles it makes with the $x$, $y$, $z$ axes`)],
        'The direction of a line in space, as the cosines of its angles with the axes.',
        'Given two direction cosines, the third follows (up to sign).'),
    F(SPACE, 'Lines', 'Line in Space', r`$\frac{x - x_1}{a}$`, r`$\frac{x - x_1}{a} = \frac{y - y_1}{b} = \frac{z - z_1}{c}$`,
        [v(r`$(x_1, y_1, z_1)$`, 'a point on the line'), v(r`$(a, b, c)$`, 'its direction numbers')],
        'A line through a point with a given direction (symmetric form).',
        r`Parametric: $x = x_1 + at$, $y = y_1 + bt$, $z = z_1 + ct$.`),
    F(SPACE, 'Planes', 'Equation of a Plane', r`$Ax + By + Cz + D = 0$`, r`$A(x - x_1) + B(y - y_1) + C(z - z_1) = 0,\qquad \frac{x}{a} + \frac{y}{b} + \frac{z}{c} = 1$`,
        [v(r`$(A, B, C)$`, 'a normal to the plane'), v(r`$(x_1, y_1, z_1)$`, 'a point on it'), v(r`$a, b, c$`, 'its intercepts (intercept form)')],
        'A plane through a point with a given normal, or from its three intercepts.',
        'The coefficients of x, y, z in the general form are the normal.'),
    F(SPACE, 'Planes', 'Distance from a Point to a Plane', r`$d$`, r`$d = \frac{|Ax_1 + By_1 + Cz_1 + D|}{\sqrt{A^2 + B^2 + C^2}}$`,
        [v(r`$Ax + By + Cz + D = 0$`, 'the plane'), v(r`$(x_1, y_1, z_1)$`, 'the point')],
        'The perpendicular distance from a point to a plane.',
        'The same pattern as point-to-line in the plane, with z added.'),
    F(SPACE, 'Planes', 'Angle Between Two Planes', r`$\cos\theta$`, r`$\cos\theta = \frac{|A_1A_2 + B_1B_2 + C_1C_2|}{\sqrt{A_1^2 + B_1^2 + C_1^2}\sqrt{A_2^2 + B_2^2 + C_2^2}}$`,
        [v(r`$(A_i, B_i, C_i)$`, 'the normals of the two planes')],
        'The angle between two planes is the angle between their normals.',
        'A dot product of zero means the planes are perpendicular.'),
    F(SPACE, 'Surfaces', 'Equation of a Sphere', r`$(x - h)^2 + (y - k)^2 + (z - l)^2$`, r`$(x - h)^2 + (y - k)^2 + (z - l)^2 = r^2$`,
        [v(r`$(h, k, l)$`, 'centre'), v(r`$r$`, 'radius')],
        'The sphere: the circle\'s equation with a third coordinate.',
        r`In general form $x^2 + y^2 + z^2 + Dx + Ey + Fz + G = 0$, the centre is $\left(-\frac{D}{2}, -\frac{E}{2}, -\frac{F}{2}\right)$.`),
];

module.exports = { subject: 'Mathematics', topic: 'Analytic Geometry', migration: '20261130000000_cards_analytic_geometry', file, revisions, retire, drafts };
