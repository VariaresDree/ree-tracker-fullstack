// Library › Lessons › Mathematics › Plane Geometry (2026-11-16): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand. `figures` are drawings from Units and tools ›
// Shapes (features/conversion/shapes/ShapeFigure.jsx).
const r = String.raw;

export default {
  topic: 'Plane Geometry',
  subject: 'Mathematics',
  overview: r`Plane geometry is about flat figures: the angles lines make, triangles and their special lines, quadrilaterals and polygons, and circles with their chords, tangents and arcs. On the board it is quick, formula-driven items and the setup behind many word problems. Draw the figure, mark what is given, and look for a right triangle, a pair of similar triangles or an inscribed angle: most problems turn on one of the three.`,
  sources: [
    'Kiselev’s Geometry, Book I: Planimetry',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Lines and Angles',
      inShort: r`How angles pair up: complements and supplements, vertical angles, and the angles a transversal makes with two parallel lines.`,
      keyIdeas: [
        r`Complementary angles add to $90^\circ$; supplementary angles add to $180^\circ$.`,
        r`Vertical angles are equal; angles on a straight line add to $180^\circ$; around a point, $360^\circ$.`,
        r`With parallel lines and a transversal, corresponding and alternate interior angles are equal, and same-side interior angles add to $180^\circ$.`,
        r`$n$ points with no three in line determine $\frac{n(n-1)}{2}$ lines.`,
      ],
      example: {
        problem: r`The supplement of an angle is three times its complement. Find the angle.`,
        solution: r`$180^\circ - x = 3(90^\circ - x) \Rightarrow 180 - x = 270 - 3x \Rightarrow 2x = 90$, so $x = 45^\circ$.`,
      },
      traps: [r`"The complement of the supplement" works from the inside out; only angles below $90^\circ$ have complements.`],
    },
    {
      name: 'Triangles',
      inShort: r`Angles and sides of a triangle, the kinds of triangles, and its special lines: medians, altitudes, angle bisectors and where they meet.`,
      figures: [{ figure: 'triangle-centres' }],
      keyIdeas: [
        r`The angles add to $180^\circ$; an exterior angle equals the two remote interior angles together.`,
        r`Any side is less than the sum of the other two and more than their difference.`,
        r`Medians meet at the centroid ($2:1$ from the vertex); bisectors at the incentre; perpendicular bisectors at the circumcentre; altitudes at the orthocentre.`,
        r`Median: $m_a = \frac12\sqrt{2b^2 + 2c^2 - a^2}$. A bisector cuts the opposite side in the ratio of the other two sides.`,
        r`Equilateral: $h = \frac{\sqrt3}{2}a$ and $A = \frac{\sqrt3}{4}a^2$.`,
      ],
      example: {
        problem: r`A triangle has sides $7$, $8$ and $9$. Find the median to the side of length $8$.`,
        solution: r`With $b = 8$, $a = 7$, $c = 9$: $m_b = \frac12\sqrt{2(49) + 2(81) - 64} = \frac12\sqrt{196} = \frac12(14) = 7$.`,
      },
      traps: [
        r`The side in the minus sign is the one the median goes to.`,
        r`The centroid is $\frac23$ of the median from the vertex, not from the side.`,
      ],
    },
    {
      name: 'Similar and Congruent Figures',
      inShort: r`Same shape (similar) or same shape and size (congruent): the tests for each, and how lengths, areas and volumes scale.`,
      keyIdeas: [
        r`Triangles are similar by AA, SAS or SSS similarity; every matching length is then in the same ratio $k$.`,
        r`Areas scale by $k^2$ and volumes by $k^3$.`,
        r`Congruence: SSS, SAS, ASA, AAS, and HL for right triangles. SSA and AAA do not prove it.`,
        r`A line parallel to one side of a triangle cuts the other two sides in proportion.`,
      ],
      example: {
        problem: r`A man $1.8$ m tall casts a $1.2$ m shadow. At the same time a pole casts an $8$ m shadow. How tall is the pole?`,
        solution: r`The sun's rays make similar triangles: $\frac{h}{8} = \frac{1.8}{1.2}$, so $h = 8 \times 1.5 = 12$ m.`,
      },
      traps: [r`An area ratio of $25:64$ is a length ratio of $5:8$: take the square root first.`],
    },
    {
      name: 'Quadrilaterals',
      inShort: r`Parallelograms (and the rectangle, rhombus and square), trapezoids and kites, and the area of any four-sided figure.`,
      figures: [{ figure: 'parallelogram' }, { figure: 'trapezoid' }, { figure: 'kite' }],
      keyIdeas: [
        r`Parallelogram: $A = bh = ab\sin\theta$; its diagonals bisect each other and $d_1^2 + d_2^2 = 2(a^2 + b^2)$.`,
        r`Rhombus or kite (diagonals at right angles): $A = \frac12 d_1 d_2$.`,
        r`Trapezoid: $A = \frac{a+b}{2}h$; the midline is $\frac{a+b}{2}$.`,
        r`Any convex quadrilateral: $A = \frac12 d_1 d_2 \sin\theta$. Cyclic: Brahmagupta, $\sqrt{(s-a)(s-b)(s-c)(s-d)}$.`,
      ],
      example: {
        problem: r`A rhombus has diagonals $10$ and $24$. Find its side and its area.`,
        solution: r`The diagonals bisect each other at right angles, so the side is $\sqrt{5^2 + 12^2} = 13$. Area $= \frac12(10)(24) = 120$.`,
      },
      traps: [r`Brahmagupta's formula needs a cyclic quadrilateral; for any other one, use Bretschneider's or split it along a diagonal.`],
    },
    {
      name: 'Polygons',
      inShort: r`Angles, diagonals and area of polygons, and the regular polygons whose sides and angles are all equal.`,
      figures: [{ figure: 'ngon', n: 6 }],
      keyIdeas: [
        r`Interior angles add to $(n-2)180^\circ$; exterior angles, one per vertex, add to $360^\circ$.`,
        r`Regular: each exterior angle is $\frac{360^\circ}{n}$, each interior $180^\circ$ minus that.`,
        r`Diagonals: $\frac{n(n-3)}{2}$.`,
        r`Area of a regular polygon: $\frac12 Pa = \frac{n s^2}{4}\cot\frac{180^\circ}{n} = \frac{nR^2}{2}\sin\frac{360^\circ}{n}$.`,
        r`A regular hexagon is six equilateral triangles: $R = s$, $A = \frac{3\sqrt3}{2}s^2$.`,
      ],
      example: {
        problem: r`Each interior angle of a regular polygon is $156^\circ$. How many sides and how many diagonals has it?`,
        solution: r`Each exterior angle is $180^\circ - 156^\circ = 24^\circ$, so $n = \frac{360}{24} = 15$. Diagonals: $\frac{15(12)}{2} = 90$.`,
      },
      traps: [r`Go through the exterior angle to find $n$; solving $(n-2)180 = 156n$ works too but is slower and easier to slip on.`],
    },
    {
      name: 'Circles',
      inShort: r`Circumference and area, the ring between two circles, and the angles at the centre and on the circle.`,
      figures: [{ figure: 'circle' }, { figure: 'annulus' }],
      keyIdeas: [
        r`$C = 2\pi r = \pi d$ and $A = \pi r^2 = \frac{\pi d^2}{4} = \frac{C^2}{4\pi}$.`,
        r`Annulus: $A = \pi(R^2 - r^2)$.`,
        r`An inscribed angle is half the central angle on the same arc; an angle in a semicircle is $90^\circ$.`,
        r`A tangent is perpendicular to the radius at the point of contact.`,
      ],
      example: {
        problem: r`A circle has a circumference of $31.416$ cm. Find its area.`,
        solution: r`$r = \frac{31.416}{2\pi} = 5$ cm, so $A = \pi(5)^2 \approx 78.54$ cm².`,
      },
      traps: [r`Given a diameter, halve it before squaring: $\pi d^2$ is four times the area.`],
    },
    {
      name: 'Arcs, Chords and Tangents',
      inShort: r`Chord lengths, the products of chord, secant and tangent segments from one point, and the angles chords and secants make.`,
      figures: [{ figure: 'chords' }],
      keyIdeas: [
        r`Chord: $c = 2r\sin\frac{\theta}{2} = 2\sqrt{r^2 - d^2}$; the perpendicular from the centre bisects it.`,
        r`Power of a point: crossing chords $ab = cd$; from outside, $PT^2 = PA \cdot PB$ for any secant.`,
        r`Angle between chords inside: half the sum of the arcs; between secants or tangents outside: half the difference.`,
        r`Common tangents of circles $d$ apart: external $\sqrt{d^2 - (R-r)^2}$, internal $\sqrt{d^2 - (R+r)^2}$.`,
      ],
      example: {
        problem: r`A point is $13$ cm from the centre of a circle of radius $5$ cm. How long is a tangent from it? A secant from it passes through the centre: how long are its outside and whole parts?`,
        solution: r`Tangent: $\sqrt{13^2 - 5^2} = 12$ cm. The secant's outside part is $13 - 5 = 8$ and the whole is $13 + 5 = 18$; check: $8 \times 18 = 144 = 12^2$.`,
      },
      traps: [r`For a secant, multiply the outside part by the whole secant, not by the part inside the circle.`],
    },
    {
      name: 'Sectors and Segments',
      inShort: r`The slice of a circle between two radii (a sector) and between a chord and its arc (a segment).`,
      figures: [{ figure: 'sector' }, { figure: 'segment' }],
      keyIdeas: [
        r`Sector: $A = \frac{\pi r^2\theta}{360^\circ} = \frac12 r^2\theta$ (radians) $= \frac12 r s$.`,
        r`Segment = sector − triangle $= \frac12 r^2(\theta - \sin\theta)$ with $\theta$ in radians.`,
        r`Height of a segment: $h = r - \sqrt{r^2 - (c/2)^2}$; an arch of chord $c$ and rise $h$ has $r = \frac{c^2}{8h} + \frac{h}{2}$.`,
      ],
      example: {
        problem: r`A circle of radius $10$ cm has a $60^\circ$ sector. Find the sector's area and the segment cut off by its chord.`,
        solution: r`Sector: $\frac{\pi(100)(60)}{360} \approx 52.36$ cm². Triangle: $\frac12(100)\sin 60^\circ \approx 43.30$ cm². Segment: $52.36 - 43.30 = 9.06$ cm².`,
      },
      traps: [r`In $\frac12 r^2(\theta - \sin\theta)$ the first $\theta$ is in radians; mixing in degrees gives nonsense.`],
    },
    {
      name: 'Inscribed and Circumscribed Figures',
      inShort: r`Circles inside and around triangles, squares and regular polygons, and quadrilaterals that fit a circle.`,
      figures: [{ figure: 'cyclic' }],
      keyIdeas: [
        r`Any triangle: $r = \frac{A}{s}$, $R = \frac{abc}{4A}$, and $d^2 = R(R - 2r)$ between their centres.`,
        r`Right triangle: $R = \frac{c}{2}$ (the hypotenuse is a diameter) and $r = \frac{a+b-c}{2}$.`,
        r`Equilateral: $R = 2r = \frac{a}{\sqrt3}$. Square: $r = \frac{s}{2}$, $R = \frac{s\sqrt2}{2}$.`,
        r`Regular polygon: the apothem is the inradius; $R^2 = a^2 + (s/2)^2$.`,
        r`Cyclic quadrilateral: opposite angles add to $180^\circ$. Tangential: $a + c = b + d$ and $A = rs$.`,
      ],
      example: {
        problem: r`A square is inscribed in a circle of radius $6$ cm. Find the area inside the circle but outside the square.`,
        solution: r`The square's diagonal is the diameter, $12$, so its area is $\frac{12^2}{2} = 72$. Circle: $36\pi \approx 113.10$. Between them: $113.10 - 72 = 41.10$ cm².`,
      },
      traps: [r`"Inscribed in the circle" puts the figure inside; "circumscribed about the circle" puts the circle inside. Read which is which.`],
    },
    {
      name: 'Area and Perimeter',
      inShort: r`Areas and perimeters of the common figures, and two tools for the unusual ones: counting grid points and the isoperimetric bound.`,
      figures: [{ figure: 'rectangle' }],
      keyIdeas: [
        r`Rectangle: $A = lw$, $P = 2(l + w)$, $d = \sqrt{l^2 + w^2}$; square from its diagonal, $A = \frac{d^2}{2}$.`,
        r`Ellipse: $A = \pi ab$; its perimeter is about $2\pi\sqrt{\frac{a^2+b^2}{2}}$.`,
        r`Pick: a polygon on grid points has $A = I + \frac{B}{2} - 1$.`,
        r`For a given perimeter the circle encloses the most area; among rectangles, the square.`,
      ],
      example: {
        problem: r`A rectangle has a perimeter of $34$ cm and a diagonal of $13$ cm. Find its area.`,
        solution: r`$l + w = 17$ and $l^2 + w^2 = 169$. Since $(l + w)^2 = l^2 + w^2 + 2lw$: $289 = 169 + 2lw$, so $lw = 60$ cm² (the sides are $12$ and $5$).`,
      },
      traps: [r`Squaring the sum is quicker than solving for each side; you rarely need $l$ and $w$ themselves.`],
    },
    {
      name: "Ptolemy's Theorem",
      inShort: r`In a quadrilateral whose corners lie on a circle, the product of the diagonals equals the sum of the products of opposite sides.`,
      figures: [{ figure: 'cyclic' }],
      keyIdeas: [
        r`Cyclic $ABCD$: $AC \cdot BD = AB \cdot CD + BC \cdot DA$.`,
        r`For any quadrilateral it is an inequality, $\le$; equality means the four points are concyclic.`,
        r`Each diagonal follows from the four sides: $p = \sqrt{\frac{(ac+bd)(ad+bc)}{ab+cd}}$.`,
        r`On a rectangle it is the Pythagorean theorem: $d^2 = a^2 + b^2$.`,
      ],
      example: {
        problem: r`An equilateral triangle $ABC$ is inscribed in a circle, and $P$ is on arc $BC$ with $PB = 3$ and $PC = 5$. Find $PA$.`,
        solution: r`$ABPC$ is cyclic, so $PA \cdot BC = PB \cdot AC + PC \cdot AB$. All sides of the triangle are equal, so dividing by one: $PA = PB + PC = 8$.`,
      },
      traps: [r`Pair opposite sides (the ones that don't share a vertex), and keep the vertices in order around the circle.`],
    },
  ],
};
