'use strict';

// Mathematics › Plane Geometry formula cards (Library round, 2026-11-16): one
// live card (pi) for 11 subtopics, so this file is nearly all new cards. See
// algebra.js for the format; tests/geometryFormulas.test.js checks the
// formulas numerically, on figures built from coordinates. Names already used
// by Trigonometry's cards (arc length, area of a sector, the in- and
// circumradius, Heron's formula) are not repeated here.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const LINES = 'Lines and Angles';
const TRI = 'Triangles';
const SIM = 'Similar and Congruent Figures';
const QUAD = 'Quadrilaterals';
const POLY = 'Polygons';
const CIRC = 'Circles';
const ACT = 'Arcs, Chords and Tangents';
const SEG = 'Sectors and Segments';
const INS = 'Inscribed and Circumscribed Figures';
const AREA = 'Area and Perimeter';
const PTOL = "Ptolemy's Theorem";

const file = [
    ['06f4a9c6-5d75-4b73-9f95-c5d0579ad72d', CIRC, null],
];

const revisions = [
    // An Algebra card (Proportion and Variation › Similar figures): its symbol had
    // an escaped backslash, so it showed as a line break. Algebra's migration is
    // already applied, so the fix rides here.
    { id: '34fc1d20-000e-4397-94c1-e4225757735e', note: 'Its symbol showed as a line break (a doubled backslash).', symbol: r`$\frac{A_1}{A_2}$` },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const SIDES = v(r`$a, b, c$`, 'the sides of the triangle');
const N = v(r`$n$`, 'number of sides');
const R_ = v(r`$r$`, 'radius');

const drafts = [
    // Lines and Angles
    F(LINES, null, 'Complementary and Supplementary Angles', r`$\alpha + \beta$`, r`$\alpha + \beta = 90^\circ \text{ (complementary)},\quad \alpha + \beta = 180^\circ \text{ (supplementary)}$`,
        [v(r`$\alpha, \beta$`, 'the two angles')],
        'Two angles that add to a right angle, or to a straight angle.',
        r`"The complement of the supplement" of $\theta$: work inside out, $90^\circ - (180^\circ - \theta)$.`),
    F(LINES, null, 'Angles Formed by a Transversal', r`$\angle 1 = \angle 2$`, r`$\text{corresponding} = \text{alternate interior} = \theta,\quad \theta + \text{same-side interior} = 180^\circ$`,
        [v(r`$\theta$`, 'an angle a transversal makes with one of two parallel lines')],
        'With two parallel lines cut by a transversal, the angles come in two sizes that add to 180°.',
        'Vertical angles are equal whether or not the lines are parallel; the rest need parallel lines.'),
    F(LINES, null, 'Lines Through n Points', r`$\binom{n}{2}$`, r`$L = \binom{n}{2} = \frac{n(n-1)}{2}$`,
        [v(r`$L$`, 'number of lines'), v(r`$n$`, 'points, no three on one line')],
        'How many lines n points determine when no three are collinear.',
        r`The same count gives handshakes, matches in a round robin, and the sides plus diagonals of an $n$-gon.`),
    // Triangles
    F(TRI, 'Angles', 'Exterior Angle of a Triangle', r`$\theta_{\text{ext}}$`, r`$\theta_{\text{ext}} = A + B$`,
        [v(r`$\theta_{\text{ext}}$`, 'the exterior angle at C'), v(r`$A, B$`, 'the two remote interior angles')],
        'An exterior angle equals the sum of the two interior angles not next to it.',
        'The exterior angles of any polygon, one at each vertex, add to 360°.'),
    F(TRI, 'Sides', 'Triangle Inequality', r`$a + b > c$`, r`$|a - b| < c < a + b$`, [SIDES],
        'Any side is shorter than the other two together and longer than their difference.',
        'Use it to reject impossible "sides" in a choices list before computing anything.'),
    F(TRI, 'Equilateral', 'Equilateral Triangle', r`$\frac{\sqrt3}{4}a^2$`, r`$h = \frac{\sqrt3}{2}a,\quad A = \frac{\sqrt3}{4}a^2$`,
        [v(r`$a$`, 'side'), v(r`$h$`, 'altitude'), v(r`$A$`, 'area')],
        'Altitude and area of an equilateral triangle from its side.',
        r`Its altitude is also a median and an angle bisector; the centroid is $\frac23 h$ from each vertex.`),
    F(TRI, 'Lines in a triangle', 'Length of a Median', r`$m_a$`, r`$m_a = \frac12\sqrt{2b^2 + 2c^2 - a^2}$`,
        [v(r`$m_a$`, r`median to side $a$`), SIDES],
        "Apollonius's theorem: a median from the three sides.",
        r`The three medians meet at the centroid, which cuts each $2:1$ from the vertex.`),
    F(TRI, 'Lines in a triangle', 'Length of an Angle Bisector', r`$t_a$`, r`$t_a = \frac{2bc\cos\frac{A}{2}}{b + c} = \sqrt{bc\left[1 - \left(\frac{a}{b+c}\right)^2\right]}$`,
        [v(r`$t_a$`, r`bisector of angle $A$, to side $a$`), SIDES, v(r`$A$`, 'the angle bisected')],
        'The length of an angle bisector from two sides and the angle, or from the three sides.',
        'Do not confuse it with the median: they coincide only when b = c.'),
    F(TRI, 'Lines in a triangle', 'Angle Bisector Theorem', r`$\frac{BD}{DC}$`, r`$\frac{BD}{DC} = \frac{AB}{AC}$`,
        [v(r`$D$`, r`where the bisector of $A$ meets $BC$`), v(r`$AB, AC$`, 'the sides beside the angle')],
        'The bisector of an angle cuts the opposite side in the ratio of the sides beside it.',
        r`So $BD = \frac{a \cdot c}{b + c}$ and $DC = \frac{a \cdot b}{b + c}$.`),
    F(TRI, 'Right triangles', 'Altitude to the Hypotenuse', r`$h^2 = pq$`, r`$h^2 = pq,\quad a^2 = pc,\quad b^2 = qc$`,
        [v(r`$h$`, 'altitude to the hypotenuse'), v(r`$p, q$`, 'the two parts it cuts the hypotenuse into'), v(r`$c$`, r`hypotenuse, $p + q$`), v(r`$a, b$`, r`the legs, $a$ next to $p$`)],
        'The altitude to the hypotenuse is the geometric mean of the two parts; each leg, of its part and the whole.',
        r`Also $h = \frac{ab}{c}$: the area two ways.`),
    // Similar and Congruent Figures
    F(SIM, 'Similar', 'Similar Triangles', r`$k$`, r`$\frac{a_1}{a_2} = \frac{b_1}{b_2} = \frac{c_1}{c_2} = \frac{h_1}{h_2} = k$`,
        [v(r`$a, b, c$`, 'matching sides'), v(r`$h$`, 'matching altitudes (or medians, bisectors)'), v(r`$k$`, 'the ratio of similarity')],
        'In similar triangles every matching length is in the same ratio.',
        'Two equal angles (AA) are enough to make triangles similar; match the sides opposite equal angles.'),
    F(SIM, 'Similar', 'Perimeters and Areas of Similar Figures', r`$\frac{A_1}{A_2} = k^2$`, r`$\frac{P_1}{P_2} = k,\quad \frac{A_1}{A_2} = k^2$`,
        [v(r`$P$`, 'perimeters'), v(r`$A$`, 'areas'), v(r`$k$`, 'ratio of matching lengths')],
        'Lengths scale by k, areas by k squared.',
        r`Area ratio 9 means length ratio 3, not 9 or 4.5.`),
    F(SIM, 'Similar', 'Side-Splitter Theorem', r`$\frac{AD}{DB}$`, r`$DE \parallel BC \implies \frac{AD}{DB} = \frac{AE}{EC},\quad \frac{DE}{BC} = \frac{AD}{AB}$`,
        [v(r`$D, E$`, r`points on $AB$ and $AC$`), v(r`$DE$`, r`a segment parallel to $BC$`)],
        'A line parallel to one side cuts the other two in proportion.',
        r`$\frac{DE}{BC}$ uses the whole side $AB$, not the part $DB$.`),
    F(SIM, 'Congruent', 'Triangle Congruence Tests', r`$\triangle_1 \cong \triangle_2$`, r`$\text{SSS},\ \text{SAS},\ \text{ASA},\ \text{AAS},\ \text{HL (right triangles)}$`,
        [v(r`$\text{S}, \text{A}$`, 'a matching side, a matching angle'), v(r`$\text{HL}$`, 'hypotenuse and a leg')],
        'The sets of matching parts that make two triangles congruent.',
        'SSA does not prove congruence (it is the ambiguous case); AAA proves only similarity.'),
    // Quadrilaterals
    F(QUAD, 'Parallelograms', 'Area of a Parallelogram', r`$A$`, r`$A = bh = ab\sin\theta$`,
        [v(r`$b$`, 'base'), v(r`$h$`, 'height to that base'), v(r`$a, b$`, 'two adjacent sides'), v(r`$\theta$`, 'the angle between them')],
        'The area of a parallelogram from a base and its height, or from two sides and the angle between them.',
        'A rectangle, rhombus and square are parallelograms; use the same formula.'),
    F(QUAD, 'Parallelograms', 'Parallelogram Law', r`$d_1^2 + d_2^2$`, r`$d_1^2 + d_2^2 = 2(a^2 + b^2)$`,
        [v(r`$d_1, d_2$`, 'the diagonals'), v(r`$a, b$`, 'two adjacent sides')],
        'The squares of the diagonals add to twice the squares of the sides.',
        'In a rectangle the two diagonals are equal, so each is the square root of a² + b².'),
    F(QUAD, 'Parallelograms', 'Area of a Rhombus or Kite', r`$A = \frac12 d_1 d_2$`, r`$A = \frac12 d_1 d_2$`,
        [v(r`$d_1, d_2$`, 'the diagonals, which cross at right angles')],
        'Half the product of the diagonals, for any quadrilateral whose diagonals are perpendicular.',
        r`The rhombus's side is $\sqrt{\left(\frac{d_1}{2}\right)^2 + \left(\frac{d_2}{2}\right)^2}$.`),
    F(QUAD, 'Trapezoids', 'Area of a Trapezoid', r`$A$`, r`$A = \frac{a + b}{2}h$`,
        [v(r`$a, b$`, 'the parallel sides'), v(r`$h$`, 'the distance between them')],
        'The average of the parallel sides times the height.',
        r`$\frac{a+b}{2}$ is the median (midline) of the trapezoid, parallel to both bases.`),
    F(QUAD, 'Any quadrilateral', 'Area from the Diagonals', r`$A$`, r`$A = \frac12 d_1 d_2 \sin\theta$`,
        [v(r`$d_1, d_2$`, 'the diagonals'), v(r`$\theta$`, 'the angle between them')],
        'The area of any convex quadrilateral from its diagonals and the angle between them.',
        'With θ = 90° it becomes the rhombus and kite formula.'),
    F(QUAD, 'Any quadrilateral', "Bretschneider's Formula", r`$A$`, r`$A = \sqrt{(s-a)(s-b)(s-c)(s-d) - abcd\cos^2\frac{B + D}{2}}$`,
        [v(r`$a, b, c, d$`, 'the sides in order'), v(r`$s$`, 'semiperimeter'), v(r`$B, D$`, 'two opposite angles')],
        'The area of any quadrilateral from its sides and a pair of opposite angles.',
        "When the quadrilateral is cyclic, B + D = 180° and it becomes Brahmagupta's formula."),
    F(QUAD, 'Any quadrilateral', "Brahmagupta's Formula", r`$A$`, r`$A = \sqrt{(s-a)(s-b)(s-c)(s-d)}$`,
        [v(r`$a, b, c, d$`, 'the sides'), v(r`$s$`, r`semiperimeter, $\frac{a+b+c+d}{2}$`)],
        'The area of a cyclic quadrilateral (one whose vertices lie on a circle) from its four sides.',
        "Only for cyclic quadrilaterals; with d = 0 it becomes Heron's formula."),
    // Polygons
    F(POLY, 'Angles', 'Sum of Interior Angles', r`$S$`, r`$S = (n - 2)\,180^\circ$`, [v(r`$S$`, 'sum of the interior angles'), N],
        'The interior angles of any n-sided polygon add to (n − 2) straight angles.',
        'The polygon splits into n − 2 triangles from one vertex.'),
    F(POLY, 'Angles', 'Angles of a Regular Polygon', r`$\theta$`, r`$\theta_{\text{int}} = \frac{(n - 2)\,180^\circ}{n},\quad \theta_{\text{ext}} = \frac{360^\circ}{n}$`, [N],
        'Each interior and exterior angle of a regular polygon.',
        r`Given an interior angle, find $n$ from the exterior one: $n = \frac{360^\circ}{180^\circ - \theta_{\text{int}}}$.`),
    F(POLY, 'Counting', 'Number of Diagonals', r`$D$`, r`$D = \frac{n(n - 3)}{2}$`, [v(r`$D$`, 'number of diagonals'), N],
        'How many diagonals an n-sided polygon has.',
        'Each vertex joins n − 3 others by a diagonal; halve because each diagonal is counted twice.'),
    F(POLY, 'Regular polygons', 'Area of a Regular Polygon', r`$A$`, r`$A = \frac12 P a = \frac{n s^2}{4}\cot\frac{180^\circ}{n} = \frac{n R^2}{2}\sin\frac{360^\circ}{n}$`,
        [v(r`$P$`, r`perimeter, $ns$`), v(r`$a$`, 'apothem'), v(r`$s$`, 'side'), v(r`$R$`, 'circumradius'), N],
        'The area of a regular polygon from its apothem, its side or its circumradius.',
        'Pick the form that matches what is given; all three agree.'),
    F(POLY, 'Regular polygons', 'Regular Hexagon', r`$\frac{3\sqrt3}{2}s^2$`, r`$A = \frac{3\sqrt3}{2}s^2,\quad R = s$`,
        [v(r`$s$`, 'side'), v(r`$R$`, 'circumradius')],
        'A regular hexagon is six equilateral triangles: its circumradius equals its side.',
        'Its long diagonal is 2s and its short diagonal s√3.'),
    F(POLY, 'Regular polygons', 'Side of a Regular Polygon', r`$s$`, r`$s = 2R\sin\frac{180^\circ}{n} = 2a\tan\frac{180^\circ}{n}$`,
        [v(r`$s$`, 'side'), v(r`$R$`, 'circumradius'), v(r`$a$`, 'apothem'), N],
        'The side of a regular polygon from its circumradius or its apothem.',
        'Each side subtends a central angle of 360°/n.'),
    // Circles
    F(CIRC, 'Measures', 'Circumference and Area of a Circle', r`$\pi r^2$`, r`$C = 2\pi r = \pi d,\quad A = \pi r^2 = \frac{\pi d^2}{4}$`,
        [R_, v(r`$d$`, 'diameter'), v(r`$C$`, 'circumference'), v(r`$A$`, 'area')],
        "A circle's circumference and area from its radius or diameter.",
        r`Area from circumference: $A = \frac{C^2}{4\pi}$.`),
    F(CIRC, 'Measures', 'Area of an Annulus', r`$A$`, r`$A = \pi(R^2 - r^2)$`,
        [v(r`$R, r$`, 'outer and inner radii')],
        'The ring between two concentric circles.',
        r`Given a chord of the outer circle tangent to the inner one, $A = \pi\left(\frac{c}{2}\right)^2$.`),
    F(CIRC, 'Angles', 'Central and Inscribed Angles', r`$\theta_i = \frac12\theta_c$`, r`$\theta_{\text{inscribed}} = \frac12\theta_{\text{central}} = \frac12\,\text{arc}$`,
        [v(r`$\theta_{\text{central}}$`, 'angle at the centre on an arc'), v(r`$\theta_{\text{inscribed}}$`, 'angle on the circle on the same arc')],
        'An inscribed angle is half the central angle on the same arc.',
        'An angle inscribed in a semicircle is 90° (Thales).'),
    // Arcs, Chords and Tangents
    F(ACT, 'Chords', 'Length of a Chord', r`$c$`, r`$c = 2r\sin\frac{\theta}{2} = 2\sqrt{r^2 - d^2}$`,
        [v(r`$c$`, 'chord'), R_, v(r`$\theta$`, 'central angle on the chord'), v(r`$d$`, 'distance from the centre to the chord')],
        'A chord from its central angle, or from its distance to the centre.',
        "The perpendicular from the centre bisects the chord: it's the right triangle behind both forms."),
    F(ACT, 'Chords', 'Intersecting Chords', r`$ab = cd$`, r`$ab = cd$`,
        [v(r`$a, b$`, 'the two parts of one chord'), v(r`$c, d$`, 'the two parts of the other')],
        'Two chords that cross inside a circle: the products of their parts are equal.',
        'Same "power of a point" as the secant and tangent rules.'),
    F(ACT, 'Secants and tangents', 'Secants and Tangents from a Point', r`$PT^2$`, r`$PT^2 = PA \cdot PB = PC \cdot PD$`,
        [v(r`$P$`, 'a point outside the circle'), v(r`$PT$`, 'a tangent from P'), v(r`$PA, PB$`, 'distances from P to where one secant meets the circle, near and far')],
        'From an outside point, tangent squared equals each secant times its outside part.',
        'Multiply the whole secant by its outside part, never the inside part.'),
    F(ACT, 'Angles', 'Angles from Arcs', r`$\theta$`, r`$\theta_{\text{inside}} = \frac{\text{arc}_1 + \text{arc}_2}{2},\quad \theta_{\text{outside}} = \frac{\text{far} - \text{near}}{2}$`,
        [v(r`$\text{arc}_1, \text{arc}_2$`, 'the arcs cut off by two chords crossing inside, the angle and its vertical angle'), v(r`$\text{far}, \text{near}$`, 'the arcs cut off by two secants or tangents meeting outside')],
        'Angles made by chords, secants and tangents, from the arcs they cut off.',
        'Inside: half the sum. Outside: half the difference. On the circle: half the arc.'),
    F(ACT, 'Secants and tangents', 'Common Tangents of Two Circles', r`$L$`, r`$L_{\text{ext}} = \sqrt{d^2 - (R - r)^2},\quad L_{\text{int}} = \sqrt{d^2 - (R + r)^2}$`,
        [v(r`$d$`, 'distance between the centres'), v(r`$R, r$`, 'the radii')],
        'The length of a common external or internal tangent between the points of tangency.',
        'Internal tangents cross between the circles and exist only when d > R + r.'),
    F(ACT, 'Arcs', 'Arc Length from Degrees', r`$s$`, r`$s = \frac{\pi r \theta}{180^\circ}$`,
        [v(r`$s$`, 'arc length'), R_, v(r`$\theta$`, 'central angle, in degrees')],
        'Arc length when the central angle is in degrees.',
        r`The same as $s = r\theta$ with $\theta$ in radians.`),
    // Sectors and Segments
    F(SEG, 'Sectors', 'Sector Area from Degrees', r`$A$`, r`$A = \frac{\pi r^2 \theta}{360^\circ}$`,
        [R_, v(r`$\theta$`, 'central angle, in degrees')],
        'The area of a sector when its angle is in degrees.',
        r`It is the circle's area times $\frac{\theta}{360^\circ}$.`),
    F(SEG, 'Segments', 'Area of a Circular Segment', r`$A$`, r`$A = \frac12 r^2(\theta - \sin\theta)$`,
        [R_, v(r`$\theta$`, 'central angle, in radians')],
        'The region between a chord and its arc: the sector less the triangle.',
        r`In degrees: $\frac{\pi r^2\theta}{360^\circ} - \frac12 r^2\sin\theta$. Calculator in radians for the first form.`),
    F(SEG, 'Segments', 'Height of a Circular Segment', r`$h$`, r`$h = r - \sqrt{r^2 - \left(\frac{c}{2}\right)^2} = r\left(1 - \cos\frac{\theta}{2}\right)$`,
        [v(r`$h$`, 'height (sagitta) of the segment'), R_, v(r`$c$`, 'its chord'), v(r`$\theta$`, 'central angle')],
        'How high the arc rises above its chord.',
        r`Reversed: $r = \frac{c^2}{8h} + \frac{h}{2}$ finds the radius of an arch.`),
    // Inscribed and Circumscribed Figures
    F(INS, 'Triangles', 'Circles of a Right Triangle', r`$R = \frac{c}{2}$`, r`$R = \frac{c}{2},\quad r = \frac{a + b - c}{2}$`,
        [v(r`$a, b$`, 'the legs'), v(r`$c$`, 'hypotenuse'), v(r`$R$`, 'circumradius'), v(r`$r$`, 'inradius')],
        "A right triangle's circumcircle has its hypotenuse as diameter; its inradius comes from the sides.",
        'The circumcentre is the midpoint of the hypotenuse.'),
    F(INS, 'Triangles', 'Circles of an Equilateral Triangle', r`$R = 2r$`, r`$r = \frac{a}{2\sqrt3},\quad R = \frac{a}{\sqrt3} = 2r$`,
        [v(r`$a$`, 'side'), v(r`$r$`, 'inradius'), v(r`$R$`, 'circumradius')],
        'In an equilateral triangle the circumradius is twice the inradius.',
        r`$r + R = h = \frac{\sqrt3}{2}a$: together they make the altitude.`),
    F(INS, 'Triangles', "Euler's Triangle Distance", r`$d^2$`, r`$d^2 = R(R - 2r)$`,
        [v(r`$d$`, 'distance between the incentre and the circumcentre'), v(r`$R$`, 'circumradius'), v(r`$r$`, 'inradius')],
        'How far apart the centres of the incircle and circumcircle are.',
        r`So $R \ge 2r$ always, with equality only for an equilateral triangle.`),
    F(INS, 'Squares and polygons', 'Circles of a Square', r`$R = \frac{s\sqrt2}{2}$`, r`$r = \frac{s}{2},\quad R = \frac{s\sqrt2}{2}$`,
        [v(r`$s$`, 'side'), v(r`$r$`, 'radius of the inscribed circle'), v(r`$R$`, 'radius of the circumscribed circle')],
        "A square's inscribed circle touches its sides; its circumscribed circle passes through its corners.",
        'The circumscribed circle has twice the area of the inscribed one.'),
    F(INS, 'Squares and polygons', 'Apothem of a Regular Polygon', r`$a$`, r`$a = R\cos\frac{180^\circ}{n} = \frac{s}{2\tan\frac{180^\circ}{n}}$`,
        [v(r`$a$`, 'apothem, the inradius'), v(r`$R$`, 'circumradius'), v(r`$s$`, 'side'), N],
        'The apothem is the radius of the inscribed circle of a regular polygon.',
        r`$a$, $R$ and $\frac{s}{2}$ form a right triangle: $R^2 = a^2 + \left(\frac{s}{2}\right)^2$.`),
    F(INS, 'Quadrilaterals', 'Cyclic and Tangential Quadrilaterals', r`$A + C = 180^\circ$`, r`$\text{cyclic: } A + C = B + D = 180^\circ,\quad \text{tangential: } a + c = b + d$`,
        [v(r`$A, B, C, D$`, 'the angles in order'), v(r`$a, b, c, d$`, 'the sides in order')],
        'When a quadrilateral fits in a circle, and when a circle fits in it.',
        r`A tangential quadrilateral's area is $rs$, inradius times semiperimeter.`),
    // Area and Perimeter
    F(AREA, 'Rectangles and squares', 'Rectangle and Square', r`$A = lw$`, r`$A = lw,\quad P = 2(l + w),\quad d = \sqrt{l^2 + w^2},\quad A_{\text{square}} = \frac{d^2}{2}$`,
        [v(r`$l, w$`, 'length and width'), v(r`$d$`, 'diagonal')],
        'Area, perimeter and diagonal of a rectangle; the area of a square from its diagonal.',
        'For a fixed perimeter the square has the largest area of all rectangles.'),
    F(AREA, 'Curved figures', 'Area and Perimeter of an Ellipse', r`$\pi ab$`, r`$A = \pi ab,\quad P \approx 2\pi\sqrt{\frac{a^2 + b^2}{2}}$`,
        [v(r`$a, b$`, 'the semi-major and semi-minor axes')],
        "An ellipse's area, and a close approximation of its perimeter.",
        r`The perimeter has no exact elementary formula; Ramanujan's $\pi[3(a+b) - \sqrt{(3a+b)(a+3b)}]$ is closer.`),
    F(AREA, 'Lattice figures', "Pick's Theorem", r`$A$`, r`$A = I + \frac{B}{2} - 1$`,
        [v(r`$I$`, 'lattice points inside the polygon'), v(r`$B$`, 'lattice points on its boundary')],
        'The area of a polygon with corners on grid points, by counting points.',
        'Only for simple polygons whose vertices are all lattice points.'),
    F(AREA, 'Curved figures', 'Isoperimetric Inequality', r`$A \le \frac{P^2}{4\pi}$`, r`$A \le \frac{P^2}{4\pi}$`,
        [v(r`$A$`, 'area enclosed'), v(r`$P$`, 'perimeter')],
        'Of all shapes with the same perimeter, the circle encloses the most area.',
        'Useful to reject a choice: no fence of length P can enclose more than P²/(4π).'),
    // Ptolemy's Theorem
    F(PTOL, null, "Ptolemy's Theorem", r`$pq$`, r`$pq = ac + bd$`,
        [v(r`$p, q$`, 'the diagonals'), v(r`$a, c$`, 'one pair of opposite sides'), v(r`$b, d$`, 'the other pair')],
        'In a cyclic quadrilateral, the product of the diagonals equals the sum of the products of opposite sides.',
        'Opposite sides, not adjacent ones; it holds only when all four vertices lie on one circle.'),
    F(PTOL, null, "Ptolemy's Inequality", r`$pq \le ac + bd$`, r`$pq \le ac + bd$`,
        [v(r`$p, q$`, 'the diagonals'), v(r`$a, b, c, d$`, 'the sides in order')],
        'For any quadrilateral; equality exactly when it is cyclic.',
        "A quick test of whether four points can lie on one circle."),
    F(PTOL, null, 'Diagonals of a Cyclic Quadrilateral', r`$p$`, r`$p = \sqrt{\frac{(ac + bd)(ad + bc)}{ab + cd}},\quad q = \sqrt{\frac{(ac + bd)(ab + cd)}{ad + bc}}$`,
        [v(r`$a, b, c, d$`, 'the sides in order'), v(r`$p$`, r`the diagonal that closes the triangle of sides $a$ and $b$`), v(r`$q$`, 'the other diagonal')],
        'Each diagonal of a cyclic quadrilateral from its four sides.',
        r`Their product is $ac + bd$ (Ptolemy); their ratio is $\frac{p}{q} = \frac{ad + bc}{ab + cd}$.`),
    F(PTOL, null, 'Circumradius of a Cyclic Quadrilateral', r`$R$`, r`$R = \frac14\sqrt{\frac{(ab + cd)(ac + bd)(ad + bc)}{(s-a)(s-b)(s-c)(s-d)}}$`,
        [v(r`$a, b, c, d$`, 'the sides'), v(r`$s$`, 'semiperimeter')],
        "The radius of a cyclic quadrilateral's circle from its sides (Parameshvara).",
        "The denominator under the root is Brahmagupta's area squared."),
];

module.exports = { subject: 'Mathematics', topic: 'Plane Geometry', migration: '20261128000000_cards_plane_geometry', file, revisions, retire, drafts };
