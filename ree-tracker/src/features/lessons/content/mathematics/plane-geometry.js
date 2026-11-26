// Library › Lessons › Mathematics › Plane Geometry (2026-11-16; every
// subtopic in the module format 2026-11-27, with figures, examples a step at a
// time and checks; every number re-worked by planeGeometryLesson.test.js.
// Coverage cross-checked against the geometry part of a review center's
// geometry and complex numbers handout; the text, problems and figures are
// this app's own): written for the Philippine REE board, subtopic by subtopic
// in the syllabus's order. Shapes drawings (`figure: …`) come from Units and
// tools › Shapes (features/conversion/shapes/ShapeFigure.jsx).
const r = String.raw;

// Area of a rectangle of perimeter 34 against its width.
export const fenced = (w) => w * (17 - w);

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
      body: [
        r`Two lines that cross make two pairs of **vertical angles**, each pair equal, and neighbouring angles that add to $180^\circ$:`,
        {
          type: 'phasor',
          alt: 'Two straight lines crossing at a point. The angles opposite each other, both marked a, are equal; a neighbouring angle, marked b, makes 180 degrees with a.',
          caption: 'Two crossing lines: vertical angles (both a) are equal, and a + b = 180°.',
          axes: false,
          vectors: [
            { mag: 1, angle: 40, colour: 0 },
            { mag: 1, angle: 220, colour: 0 },
            { mag: 1, angle: 160, colour: 1 },
            { mag: 1, angle: 340, colour: 1 },
          ],
          arcs: [
            { from: 40, to: 160, label: 'a', r: 34 },
            { from: 220, to: 340, label: 'a', r: 34 },
            { from: 160, to: 220, label: 'b', r: 46 },
          ],
        },
        r`| Pair | Rule |
|---|---|
| complementary | add to $90^\circ$ |
| supplementary (a linear pair) | add to $180^\circ$ |
| around a point | add to $360^\circ$ |
| vertical angles | equal |

When a **transversal** cuts two parallel lines, the **corresponding** angles are equal, the **alternate interior** (and alternate exterior) angles are equal, and the **same-side interior** angles add to $180^\circ$. Each of these, read backwards, proves two lines parallel.

$n$ points with no three in line determine $\frac{n(n-1)}{2}$ lines and $\binom{n}{3}$ triangles.`,
      ],
      keyIdeas: [
        r`Complementary angles add to $90^\circ$; supplementary angles add to $180^\circ$.`,
        r`Vertical angles are equal; angles on a straight line add to $180^\circ$; around a point, $360^\circ$.`,
        r`With parallel lines and a transversal, corresponding and alternate interior angles are equal, and same-side interior angles add to $180^\circ$.`,
        r`$n$ points with no three in line determine $\frac{n(n-1)}{2}$ lines.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Supplement and complement',
          problem: r`The supplement of an angle is three times its complement. Find the angle.`,
          steps: [
            r`$180^\circ - x = 3(90^\circ - x)$, so $180 - x = 270 - 3x$.`,
            r`$2x = 90$, so $x = 45^\circ$.`,
          ],
          answer: r`$45^\circ$.`,
        },
        {
          level: 'board',
          title: 'Points, and a transversal',
          problem: r`(a) How many lines and how many triangles do 10 points determine, no three in line? (b) Two parallel lines are cut by a transversal; two same-side interior angles are $(3x + 20)^\circ$ and $(2x + 10)^\circ$. Find both.`,
          steps: [
            r`(a) Lines: $\frac{10 \times 9}{2} = 45$. Triangles: $\binom{10}{3} = 120$.`,
            r`(b) Same-side interior angles add to $180^\circ$: $5x + 30 = 180$, so $x = 30$.`,
            r`The angles are $3(30) + 20 = 110^\circ$ and $2(30) + 10 = 70^\circ$.`,
          ],
          answer: r`(a) 45 lines and 120 triangles; (b) $110^\circ$ and $70^\circ$.`,
        },
      ],
      traps: [
        r`"The complement of the supplement" works from the inside out; only angles below $90^\circ$ have complements.`,
        r`Same-side interior angles are supplementary, not equal; alternate interior angles are the equal ones.`,
      ],
      check: [
        { q: r`What is the complement of the supplement of $130^\circ$?`, a: r`The supplement is $50^\circ$; its complement is $40^\circ$.` },
        { q: r`One of four angles at a crossing is $65^\circ$. What are the others?`, a: r`$115^\circ$, $65^\circ$ and $115^\circ$.` },
      ],
    },
    {
      name: 'Triangles',
      inShort: r`Angles and sides of a triangle, the kinds of triangles, and its special lines: medians, altitudes, angle bisectors and where they meet.`,
      body: [
        r`A triangle's angles add to $180^\circ$, and an **exterior angle** equals the two interior angles away from it. Any side is shorter than the other two together and longer than their difference (the **triangle inequality**). By sides a triangle is equilateral, isosceles or scalene; by angles, acute, right or obtuse.

Four kinds of special line each meet at one point:`,
        { figure: 'triangle-centres', caption: 'The centres: medians meet at the centroid G, angle bisectors at the incentre I, perpendicular bisectors at the circumcentre O, altitudes at the orthocentre H.' },
        r`| Line | Meets at | Fact |
|---|---|---|
| median (vertex to mid-side) | centroid | $\frac23$ of each median from its vertex; length $m_a = \frac12\sqrt{2b^2 + 2c^2 - a^2}$ |
| angle bisector | incentre | cuts the opposite side in the ratio of the sides beside it |
| perpendicular bisector | circumcentre | equally far from all three vertices |
| altitude | orthocentre | $h_a = \frac{2A}{a}$ |

The bisector from $C$ has length $t_c = \frac{\sqrt{ab\left[(a + b)^2 - c^2\right]}}{a + b}$. In an equilateral triangle all four centres coincide; $h = \frac{\sqrt3}{2}a$ and $A = \frac{\sqrt3}{4}a^2$.`,
      ],
      keyIdeas: [
        r`The angles add to $180^\circ$; an exterior angle equals the two remote interior angles together.`,
        r`Any side is less than the sum of the other two and more than their difference.`,
        r`Medians meet at the centroid ($2:1$ from the vertex); bisectors at the incentre; perpendicular bisectors at the circumcentre; altitudes at the orthocentre.`,
        r`Median: $m_a = \frac12\sqrt{2b^2 + 2c^2 - a^2}$. A bisector cuts the opposite side in the ratio of the other two sides.`,
        r`Equilateral: $h = \frac{\sqrt3}{2}a$ and $A = \frac{\sqrt3}{4}a^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A median',
          problem: r`A triangle has sides $7$, $8$ and $9$. Find the median to the side of length $8$.`,
          steps: [
            r`With $b = 8$, $a = 7$, $c = 9$: $m_b = \frac12\sqrt{2(49) + 2(81) - 64}$.`,
            r`$= \frac12\sqrt{196} = 7$.`,
          ],
          answer: r`$7$.`,
        },
        {
          level: 'board',
          title: 'An angle bisector',
          problem: r`In triangle ABC, $BC = 12$, $CA = 18$ and $AB = 15$. The bisector of angle C meets AB at D. Find AD, DB and the bisector's length CD.`,
          steps: [
            r`D divides AB in the ratio $CA : CB = 18 : 12$, so $AD = 15 \times \frac{18}{30} = 9$ and $DB = 6$.`,
            r`$t_c = \frac{\sqrt{12 \times 18\left(30^2 - 15^2\right)}}{30} = \frac{\sqrt{145\,800}}{30} = 12.73$.`,
          ],
          answer: r`$AD = 9$, $DB = 6$, $CD \approx 12.73$.`,
        },
      ],
      traps: [
        r`The side in the minus sign is the one the median goes to.`,
        r`The centroid is $\frac23$ of the median from the vertex, not from the side.`,
        r`The bisector splits the side in the ratio of the sides next to it, not in half.`,
      ],
      check: [
        { q: r`Can 3, 5 and 9 be a triangle's sides?`, a: r`No: $3 + 5 < 9$.` },
        { q: r`An exterior angle's two remote interior angles are $40^\circ$ and $65^\circ$. What is it?`, a: r`$105^\circ$.` },
      ],
    },
    {
      name: 'Similar and Congruent Figures',
      inShort: r`Same shape (similar) or same shape and size (congruent): the tests for each, and how lengths, areas and volumes scale.`,
      body: [
        r`**Congruent** figures match exactly; **similar** figures have the same shape, with every length in the same ratio $k$.

| Test | Proves |
|---|---|
| SSS, SAS, ASA, AAS | congruence |
| HL (hypotenuse and a leg) | congruence of right triangles |
| AA, SAS similarity, SSS similarity | similarity |
| SSA, AAA | not congruence (AAA proves similarity only) |

Once two figures are similar with ratio $k$, every matching length (sides, heights, medians, perimeters) scales by $k$, areas by $k^2$ and volumes by $k^3$.

A line parallel to one side of a triangle makes a smaller, similar triangle and cuts the other two sides in proportion: if $DE \parallel BC$, then $\frac{AD}{DB} = \frac{AE}{EC}$. Shadows and mirror sightings are similar triangles too.`,
      ],
      keyIdeas: [
        r`Triangles are similar by AA, SAS or SSS similarity; every matching length is then in the same ratio $k$.`,
        r`Areas scale by $k^2$ and volumes by $k^3$.`,
        r`Congruence: SSS, SAS, ASA, AAS, and HL for right triangles. SSA and AAA do not prove it.`,
        r`A line parallel to one side of a triangle cuts the other two sides in proportion.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A shadow',
          problem: r`A man $1.8$ m tall casts a $1.2$ m shadow. At the same time a pole casts an $8$ m shadow. How tall is the pole?`,
          steps: [
            r`The sun's rays make similar triangles: $\frac{h}{8} = \frac{1.8}{1.2}$.`,
            r`$h = 8 \times 1.5 = 12$ m.`,
          ],
          answer: r`12 m.`,
        },
        {
          level: 'board',
          title: 'Area ratios and a parallel line',
          problem: r`(a) Two similar triangles have areas in the ratio $81 : 49$; the larger has a perimeter of 108 cm. Find the smaller's perimeter. (b) In triangle ABC, $DE \parallel BC$ with D on AB and E on AC; $AD = 6$, $DB = 4$, $AE = 9$. Find EC. (c) A 1 : 50 model tank holds 2 L. How much does the real tank hold?`,
          steps: [
            r`(a) Lengths in the ratio $\sqrt{\frac{81}{49}} = \frac97$, so the smaller perimeter is $108 \times \frac79 = 84$ cm.`,
            r`(b) $\frac{6}{4} = \frac{9}{EC}$, so $EC = 6$.`,
            r`(c) Volumes scale by $50^3 = 125\,000$: $2 \times 125\,000 = 250\,000$ L.`,
          ],
          answer: r`(a) 84 cm; (b) 6; (c) 250,000 L.`,
        },
      ],
      traps: [
        r`An area ratio of $25:64$ is a length ratio of $5:8$: take the square root first.`,
        r`A scale model's volume scales by the cube of the scale, not the scale itself.`,
      ],
      check: [
        { q: r`Is AAA enough to prove two triangles congruent?`, a: r`No: it proves only that they are similar.` },
        { q: r`Two similar solids have lengths in the ratio $2 : 3$. What is the ratio of their volumes?`, a: r`$8 : 27$.` },
      ],
    },
    {
      name: 'Quadrilaterals',
      inShort: r`Parallelograms (and the rectangle, rhombus and square), trapezoids and kites, and the area of any four-sided figure.`,
      body: [
        r`The family of four-sided figures, with their areas:

| Figure | Defining property | Area |
|---|---|---|
| parallelogram | both pairs of sides parallel | $bh = ab\sin\theta = \frac12 d_1d_2\sin\varphi$ |
| rectangle | four right angles | $ab$ |
| rhombus | four equal sides | $\frac12 d_1d_2 = a^2\sin\theta$ |
| square | equal sides, right angles | $a^2 = \frac{d^2}{2}$ |
| trapezoid | one pair of parallel sides | $\frac{a + b}{2}h$ (the midline times the height) |
| kite | two pairs of equal neighbouring sides | $\frac12 d_1d_2$ |`,
        { figure: 'parallelogram', caption: 'A parallelogram: base b and height h; opposite sides equal and parallel, diagonals bisecting each other.' },
        { figure: 'trapezoid', caption: 'A trapezoid: two parallel bases a and b, height h.' },
        { figure: 'kite', caption: 'A kite: its diagonals cross at right angles, so its area is half their product.' },
        r`In a parallelogram, opposite angles are equal, neighbouring angles add to $180^\circ$, and $d_1^2 + d_2^2 = 2(a^2 + b^2)$.

For **any** quadrilateral with sides $a, b, c, d$ and $s = \frac{a + b + c + d}{2}$, **Bretschneider's formula** gives the area from the sides and half the sum $\varphi$ of two opposite angles:
$$A = \sqrt{(s - a)(s - b)(s - c)(s - d) - abcd\cos^2\varphi}.$$
A **cyclic** quadrilateral (corners on a circle) has opposite angles adding to $180^\circ$, so $\cos\varphi = 0$: **Brahmagupta's formula**, $A = \sqrt{(s - a)(s - b)(s - c)(s - d)}$, the largest area those four sides can enclose.`,
      ],
      keyIdeas: [
        r`Parallelogram: $A = bh = ab\sin\theta$; its diagonals bisect each other and $d_1^2 + d_2^2 = 2(a^2 + b^2)$.`,
        r`Rhombus or kite (diagonals at right angles): $A = \frac12 d_1 d_2$.`,
        r`Trapezoid: $A = \frac{a+b}{2}h$; the midline is $\frac{a+b}{2}$.`,
        r`Any convex quadrilateral: $A = \frac12 d_1 d_2 \sin\theta$. Cyclic: Brahmagupta, $\sqrt{(s-a)(s-b)(s-c)(s-d)}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A rhombus',
          problem: r`A rhombus has diagonals $10$ and $24$. Find its side and its area.`,
          steps: [
            r`The diagonals bisect each other at right angles: the side is $\sqrt{5^2 + 12^2} = 13$.`,
            r`Area $= \frac12(10)(24) = 120$.`,
          ],
          answer: r`Side 13; area 120.`,
        },
        {
          level: 'board',
          title: 'Bretschneider, and a parallelogram',
          problem: r`(a) A quadrilateral has sides 6, 8, 10 and 12 m, and two opposite angles add to $240^\circ$. Find its area, and the area if it were cyclic. (b) A parallelogram has sides 10 and 14 cm with a $50^\circ$ angle. Find its area and both diagonals.`,
          steps: [
            r`(a) $s = 18$; $(s - a)(s - b)(s - c)(s - d) = 12 \cdot 10 \cdot 8 \cdot 6 = 5760$ and $abcd = 5760$.`,
            r`$\varphi = 120^\circ$, $\cos^2\varphi = 0.25$: $A = \sqrt{5760 - 1440} = 65.73$ m². Cyclic: $\sqrt{5760} = 75.89$ m².`,
            r`(b) Area $= 10 \times 14\sin 50^\circ = 107.25$ cm².`,
            r`Diagonals: $d^2 = 100 + 196 \pm 280\cos 50^\circ$, so $d = 21.82$ and $10.77$ cm. Check: $21.82^2 + 10.77^2 \approx 592 = 2(100 + 196)$.`,
          ],
          answer: r`(a) 65.73 m², or 75.89 m² if cyclic; (b) 107.25 cm²; 21.82 and 10.77 cm.`,
        },
      ],
      traps: [
        r`Brahmagupta's formula needs a cyclic quadrilateral; for any other one, use Bretschneider's or split it along a diagonal.`,
        r`In $\frac{a + b}{2}h$, $a$ and $b$ are the parallel sides, not the legs.`,
      ],
      check: [
        { q: r`A trapezoid has bases 10 and 16 and height 5. What is its area?`, a: r`$\frac{10 + 16}{2} \times 5 = 65$.` },
        { q: r`A square has a diagonal of 10. What is its area?`, a: r`$\frac{10^2}{2} = 50$.` },
      ],
    },
    {
      name: 'Polygons',
      inShort: r`Angles, diagonals and area of polygons, and the regular polygons whose sides and angles are all equal.`,
      body: [
        r`A polygon of $n$ sides splits into $n - 2$ triangles from one vertex, so its interior angles add to $(n - 2)180^\circ$; one exterior angle at each vertex, taken all the way round, always adds to $360^\circ$. From each vertex, $n - 3$ diagonals go to the non-neighbouring vertices, $\frac{n(n - 3)}{2}$ in all.

A **regular** polygon has equal sides and equal angles. It splits into $n$ isosceles triangles from its centre, with the **circumradius** $R$ to each vertex and the **apothem** $a$ (the inradius) to the middle of each side:`,
        { figure: 'ngon', n: 6, caption: 'A regular hexagon: six equilateral triangles from the centre, so R equals the side.' },
        r`| Quantity | Regular $n$-gon with side $s$ |
|---|---|
| each exterior angle | $\frac{360^\circ}{n}$ |
| each interior angle | $180^\circ - \frac{360^\circ}{n}$ |
| circumradius | $R = \frac{s}{2\sin(180^\circ/n)}$ |
| apothem | $a = \frac{s}{2\tan(180^\circ/n)}$ |
| area | $\frac12 Pa = \frac{ns^2}{4}\cot\frac{180^\circ}{n} = \frac{nR^2}{2}\sin\frac{360^\circ}{n}$ |

Useful cases: hexagon $A = \frac{3\sqrt3}{2}s^2$; octagon $A = 2(1 + \sqrt2)s^2$.`,
      ],
      keyIdeas: [
        r`Interior angles add to $(n-2)180^\circ$; exterior angles, one per vertex, add to $360^\circ$.`,
        r`Regular: each exterior angle is $\frac{360^\circ}{n}$, each interior $180^\circ$ minus that.`,
        r`Diagonals: $\frac{n(n-3)}{2}$.`,
        r`Area of a regular polygon: $\frac12 Pa = \frac{n s^2}{4}\cot\frac{180^\circ}{n} = \frac{nR^2}{2}\sin\frac{360^\circ}{n}$.`,
        r`A regular hexagon is six equilateral triangles: $R = s$, $A = \frac{3\sqrt3}{2}s^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sides from an angle',
          problem: r`Each interior angle of a regular polygon is $156^\circ$. How many sides and how many diagonals has it?`,
          steps: [
            r`Each exterior angle is $180^\circ - 156^\circ = 24^\circ$, so $n = \frac{360}{24} = 15$.`,
            r`Diagonals: $\frac{15(12)}{2} = 90$.`,
          ],
          answer: r`15 sides; 90 diagonals.`,
        },
        {
          level: 'board',
          title: 'An octagon, and a polygon from its diagonals',
          problem: r`(a) A regular octagon has sides of 4 cm. Find its area, circumradius and apothem. (b) A polygon has 35 diagonals. How many sides has it?`,
          steps: [
            r`(a) $A = 2(1 + \sqrt2)(16) = 77.25$ cm².`,
            r`$R = \frac{4}{2\sin 22.5^\circ} = 5.226$ cm; $a = \frac{4}{2\tan 22.5^\circ} = 4.828$ cm.`,
            r`(b) $\frac{n(n - 3)}{2} = 35$, so $n^2 - 3n - 70 = 0$ and $(n - 10)(n + 7) = 0$: $n = 10$.`,
          ],
          answer: r`(a) 77.25 cm², 5.226 cm, 4.828 cm; (b) 10 sides.`,
        },
      ],
      traps: [
        r`Go through the exterior angle to find $n$; solving $(n-2)180 = 156n$ works too but is slower and easier to slip on.`,
        r`The apothem goes to the middle of a side, the circumradius to a vertex: $R > a$.`,
      ],
      check: [
        { q: r`What do the interior angles of a 12-gon add to?`, a: r`$10 \times 180^\circ = 1800^\circ$.` },
        { q: r`What is the area of a regular hexagon with 6 cm sides?`, a: r`$\frac{3\sqrt3}{2}(36) = 54\sqrt3 \approx 93.53$ cm².` },
      ],
    },
    {
      name: 'Circles',
      inShort: r`Circumference and area, the ring between two circles, and the angles at the centre and on the circle.`,
      body: [
        r`A circle is every point a fixed distance $r$ from its centre. $C = 2\pi r = \pi d$ and $A = \pi r^2 = \frac{\pi d^2}{4} = \frac{C^2}{4\pi}$.`,
        { figure: 'circle', caption: 'A circle: radius r, diameter d = 2r, circumference C = 2πr.' },
        r`A **chord** joins two points of the circle; a **diameter** is a chord through the centre; a **secant** is a line through two points; a **tangent** touches at one point, at right angles to the radius there. The perpendicular from the centre bisects any chord, so a chord $c$ at distance $d$ from the centre has $\left(\frac c2\right)^2 + d^2 = r^2$.

Angles and arcs:

| Angle | Measure |
|---|---|
| central angle | equal to its arc |
| inscribed angle (vertex on the circle) | half its arc, so half the central angle on the same arc |
| inscribed angles on the same arc | equal |
| angle in a semicircle | $90^\circ$ |

An arc of central angle $\theta$ is $s = r\theta$ ($\theta$ in radians), or $\frac{\theta}{360^\circ}2\pi r$. The ring between two circles is an **annulus**:`,
        { figure: 'annulus', caption: 'An annulus: the ring between radii R and r, of area π(R² − r²).' },
      ],
      keyIdeas: [
        r`$C = 2\pi r = \pi d$ and $A = \pi r^2 = \frac{\pi d^2}{4} = \frac{C^2}{4\pi}$.`,
        r`Annulus: $A = \pi(R^2 - r^2)$.`,
        r`An inscribed angle is half the central angle on the same arc; an angle in a semicircle is $90^\circ$.`,
        r`A tangent is perpendicular to the radius at the point of contact.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Area from the circumference',
          problem: r`A circle has a circumference of $31.416$ cm. Find its area.`,
          steps: [
            r`$r = \frac{31.416}{2\pi} = 5$ cm.`,
            r`$A = \pi(5)^2 = 78.54$ cm².`,
          ],
          answer: r`About 78.54 cm².`,
        },
        {
          level: 'board',
          title: 'A chord, a track and an inscribed angle',
          problem: r`(a) A chord 24 cm long is 5 cm from the centre. Find the radius. (b) A running track lies between circles of radius 50 m and 56 m. Find its area. (c) In the circle of (a), an inscribed angle of $35^\circ$ stands on an arc. Find the arc's central angle and length.`,
          steps: [
            r`(a) $r = \sqrt{12^2 + 5^2} = 13$ cm.`,
            r`(b) $\pi(56^2 - 50^2) = 636\pi = 1998.05$ m².`,
            r`(c) The central angle is twice the inscribed: $70^\circ$. Arc $= 13 \times \frac{70\pi}{180} = 15.88$ cm.`,
          ],
          answer: r`(a) 13 cm; (b) about 1998.05 m²; (c) $70^\circ$, 15.88 cm.`,
        },
      ],
      traps: [
        r`Given a diameter, halve it before squaring: $\pi d^2$ is four times the area.`,
        r`The inscribed angle is half the arc, not equal to it; the central angle is equal to it.`,
      ],
      check: [
        { q: r`What angle does a triangle make at a point on the circle when its longest side is a diameter?`, a: r`$90^\circ$: an angle in a semicircle.` },
        { q: r`What is the area of a circle with circumference $10\pi$?`, a: r`$r = 5$, so $25\pi \approx 78.54$.` },
      ],
    },
    {
      name: 'Arcs, Chords and Tangents',
      inShort: r`Chord lengths, the products of chord, secant and tangent segments from one point, and the angles chords and secants make.`,
      body: [
        r`Through any point, the lines that cut a circle share one product, the **power of the point**:`,
        { figure: 'chords', caption: 'Two chords crossing inside a circle: the products of their two parts are equal.' },
        r`| Where the point is | Rule |
|---|---|
| inside: two chords crossing | $AE \cdot EB = CE \cdot ED$ |
| outside: two secants | $PA \cdot PB = PC \cdot PD$ (outside part times whole) |
| outside: a secant and a tangent | $PT^2 = PA \cdot PB$ |
| outside: two tangents | equal lengths |

Angles follow the arcs too: two chords crossing inside make an angle of **half the sum** of the arcs they cut off; two secants, or tangents, from outside make **half the difference**. A tangent and a chord at the point of contact make half the arc they cut.

Two circles of radii $R$ and $r$, centres $d$ apart, have common tangents of length $\sqrt{d^2 - (R - r)^2}$ (external, not crossing between them) and $\sqrt{d^2 - (R + r)^2}$ (internal, crossing between them). A chord of central angle $\theta$ is $c = 2r\sin\frac{\theta}{2}$.`,
      ],
      keyIdeas: [
        r`Chord: $c = 2r\sin\frac{\theta}{2} = 2\sqrt{r^2 - d^2}$; the perpendicular from the centre bisects it.`,
        r`Power of a point: crossing chords $ab = cd$; from outside, $PT^2 = PA \cdot PB$ for any secant.`,
        r`Angle between chords inside: half the sum of the arcs; between secants or tangents outside: half the difference.`,
        r`Common tangents of circles $d$ apart: external $\sqrt{d^2 - (R-r)^2}$, internal $\sqrt{d^2 - (R+r)^2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A tangent and a secant',
          problem: r`A point is $13$ cm from the centre of a circle of radius $5$ cm. How long is a tangent from it? A secant from it passes through the centre: how long are its outside and whole parts?`,
          steps: [
            r`Tangent: $\sqrt{13^2 - 5^2} = 12$ cm.`,
            r`The secant's outside part is $13 - 5 = 8$ and the whole $13 + 5 = 18$. Check: $8 \times 18 = 144 = 12^2$.`,
          ],
          answer: r`12 cm; 8 and 18 cm.`,
        },
        {
          level: 'board',
          title: 'Chords, common tangents, secants',
          problem: r`(a) Chords AB and CD cross at E with $AE = 8$, $EB = 6$ and $CE = 4$. Find ED. (b) Circles of radii 9 and 4 cm have centres 15 cm apart. Find the external and internal common tangents. (c) Two secants from a point cut off arcs of $110^\circ$ and $40^\circ$. Find the angle between them.`,
          steps: [
            r`(a) $8 \times 6 = 4 \times ED$, so $ED = 12$.`,
            r`(b) External: $\sqrt{15^2 - 5^2} = \sqrt{200} = 14.14$ cm. Internal: $\sqrt{15^2 - 13^2} = \sqrt{56} = 7.48$ cm.`,
            r`(c) Half the difference: $\frac{110 - 40}{2} = 35^\circ$.`,
          ],
          answer: r`(a) 12; (b) 14.14 and 7.48 cm; (c) $35^\circ$.`,
        },
      ],
      traps: [
        r`For a secant, multiply the outside part by the whole secant, not by the part inside the circle.`,
        r`Inside the circle the arcs add; outside they subtract.`,
      ],
      check: [
        { q: r`How long is a tangent from a point 10 cm from the centre of a circle of radius 6 cm?`, a: r`$\sqrt{100 - 36} = 8$ cm.` },
        { q: r`Two chords crossing inside cut off arcs of $70^\circ$ and $50^\circ$. What angle do they make?`, a: r`$\frac{70 + 50}{2} = 60^\circ$.` },
      ],
    },
    {
      name: 'Sectors and Segments',
      inShort: r`The slice of a circle between two radii (a sector) and between a chord and its arc (a segment).`,
      body: [
        r`A **sector** is the slice between two radii; a **segment** the part cut off by a chord:`,
        { figure: 'sector', caption: 'A sector: radii r with central angle θ and arc s.' },
        { figure: 'segment', caption: 'A segment: the part above a chord c, with height h.' },
        r`| Region | Area ($\theta$ in radians unless shown) |
|---|---|
| sector | $\frac12 r^2\theta = \frac12 rs = \frac{\theta^\circ}{360^\circ}\pi r^2$ |
| segment | sector $-$ triangle $= \frac12 r^2(\theta - \sin\theta)$ |

A segment's **height** (rise) is $h = r - \sqrt{r^2 - \left(\frac c2\right)^2}$. Backwards, an arch with span $c$ and rise $h$ has radius $r = \frac{c^2}{8h} + \frac h2$, the usual way to size a curved roof or a bend.`,
      ],
      keyIdeas: [
        r`Sector: $A = \frac{\pi r^2\theta}{360^\circ} = \frac12 r^2\theta$ (radians) $= \frac12 r s$.`,
        r`Segment = sector − triangle $= \frac12 r^2(\theta - \sin\theta)$ with $\theta$ in radians.`,
        r`Height of a segment: $h = r - \sqrt{r^2 - (c/2)^2}$; an arch of chord $c$ and rise $h$ has $r = \frac{c^2}{8h} + \frac{h}{2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sector and segment',
          problem: r`A circle of radius $10$ cm has a $60^\circ$ sector. Find the sector's area and the segment cut off by its chord.`,
          steps: [
            r`Sector: $\frac{\pi(100)(60)}{360} = 52.36$ cm².`,
            r`Triangle: $\frac12(100)\sin 60^\circ = 43.30$ cm².`,
            r`Segment: $52.36 - 43.30 = 9.06$ cm².`,
          ],
          answer: r`52.36 cm² and 9.06 cm².`,
        },
        {
          level: 'board',
          title: 'An arch',
          problem: r`A circular arch spans 20 m and rises 4 m. Find its radius, its central angle and the area under the arch above the span.`,
          steps: [
            r`$r = \frac{20^2}{8(4)} + \frac42 = 12.5 + 2 = 14.5$ m. Check: $14.5 - \sqrt{14.5^2 - 10^2} = 14.5 - 10.5 = 4$.`,
            r`$\sin\frac{\theta}{2} = \frac{10}{14.5}$, so $\frac{\theta}{2} = 43.60^\circ$ and $\theta = 87.21^\circ = 1.5220$ rad.`,
            r`Segment $= \frac12(14.5)^2(1.5220 - \sin 87.21^\circ) = 55.00$ m².`,
          ],
          answer: r`14.5 m; $87.21^\circ$; about 55.00 m².`,
        },
      ],
      traps: [
        r`In $\frac12 r^2(\theta - \sin\theta)$ the first $\theta$ is in radians; mixing in degrees gives nonsense.`,
        r`A segment's height runs from the chord's middle to the arc, not from the centre.`,
      ],
      check: [
        { q: r`A sector has radius 12 and arc 9. What is its area?`, a: r`$\frac12(12)(9) = 54$.` },
        { q: r`Find the segment of a circle of radius 6 cut off by a $120^\circ$ chord.`, a: r`$\frac12(36)\left(\frac{2\pi}{3} - \sin 120^\circ\right) \approx 22.11$.` },
      ],
    },
    {
      name: 'Inscribed and Circumscribed Figures',
      inShort: r`Circles inside and around triangles, squares and regular polygons, and quadrilaterals that fit a circle.`,
      body: [
        r`A figure is **inscribed** in a circle when its corners lie on it; a circle is **inscribed** in a figure when it touches every side.

| Figure | Circumradius $R$ | Inradius $r$ |
|---|---|---|
| any triangle | $\frac{abc}{4A}$ | $\frac{A}{s}$ |
| right triangle | $\frac{c}{2}$ (hypotenuse a diameter) | $\frac{a + b - c}{2}$ |
| equilateral triangle | $\frac{a}{\sqrt3}$ | $\frac{a}{2\sqrt3} = \frac R2$ |
| square, side $s$ | $\frac{s\sqrt2}{2}$ | $\frac s2$ |
| regular polygon | $R$ | the apothem; $R^2 = r^2 + \left(\frac s2\right)^2$ |

The incentre and circumcentre of a triangle are $d$ apart with $d^2 = R(R - 2r)$ (Euler).

A quadrilateral fits **inside** a circle (cyclic) when its opposite angles add to $180^\circ$:`,
        { figure: 'cyclic', caption: 'A cyclic quadrilateral: its four corners on one circle, opposite angles adding to 180°.' },
        r`Its area is Brahmagupta's $\sqrt{(s - a)(s - b)(s - c)(s - d)}$ and its circumradius $R = \frac{\sqrt{(ab + cd)(ac + bd)(ad + bc)}}{4A}$. A quadrilateral fits **around** a circle (tangential) when its opposite sides add up equally, $a + c = b + d$; its area is $rs$.`,
      ],
      keyIdeas: [
        r`Any triangle: $r = \frac{A}{s}$, $R = \frac{abc}{4A}$, and $d^2 = R(R - 2r)$ between their centres.`,
        r`Right triangle: $R = \frac{c}{2}$ (the hypotenuse is a diameter) and $r = \frac{a+b-c}{2}$.`,
        r`Equilateral: $R = 2r = \frac{a}{\sqrt3}$. Square: $r = \frac{s}{2}$, $R = \frac{s\sqrt2}{2}$.`,
        r`Regular polygon: the apothem is the inradius; $R^2 = a^2 + (s/2)^2$.`,
        r`Cyclic quadrilateral: opposite angles add to $180^\circ$. Tangential: $a + c = b + d$ and $A = rs$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A square in a circle',
          problem: r`A square is inscribed in a circle of radius $6$ cm. Find the area inside the circle but outside the square.`,
          steps: [
            r`The square's diagonal is the diameter, $12$, so its area is $\frac{12^2}{2} = 72$.`,
            r`Circle: $36\pi = 113.10$. Between them: $113.10 - 72 = 41.10$ cm².`,
          ],
          answer: r`About 41.10 cm².`,
        },
        {
          level: 'board',
          title: 'A right triangle, and a cyclic quadrilateral',
          problem: r`(a) A right triangle has legs 9 and 12. Find its circumradius, inradius and the distance between the two centres. (b) A cyclic quadrilateral has sides 5, 6, 7 and 8. Find its area and circumradius.`,
          steps: [
            r`(a) Hypotenuse 15: $R = 7.5$, $r = \frac{9 + 12 - 15}{2} = 3$; $d = \sqrt{7.5(7.5 - 6)} = 3.354$.`,
            r`(b) $s = 13$: $A = \sqrt{8 \cdot 7 \cdot 6 \cdot 5} = \sqrt{1680} = 40.99$.`,
            r`$ab + cd = 86$, $ac + bd = 83$, $ad + bc = 82$: $R = \frac{\sqrt{86 \times 83 \times 82}}{4(40.99)} = 4.666$.`,
          ],
          answer: r`(a) 7.5, 3 and 3.354; (b) about 40.99 and 4.666.`,
        },
      ],
      traps: [
        r`"Inscribed in the circle" puts the figure inside; "circumscribed about the circle" puts the circle inside. Read which is which.`,
        r`A rectangle is always cyclic; a rhombus is always tangential; only a square is both for certain.`,
      ],
      check: [
        { q: r`A square has sides of 10. What are the areas of its inscribed and circumscribed circles?`, a: r`$25\pi \approx 78.54$ and $50\pi \approx 157.08$.` },
        { q: r`A quadrilateral around a circle has sides 5, 7 and 8 in order. What is the fourth?`, a: r`$5 + 8 = 7 + x$, so 6.` },
      ],
    },
    {
      name: 'Area and Perimeter',
      inShort: r`Areas and perimeters of the common figures, and two tools for the unusual ones: counting grid points and the isoperimetric bound.`,
      body: [
        r`| Figure | Area | Perimeter |
|---|---|---|
| rectangle | $lw$ | $2(l + w)$; diagonal $\sqrt{l^2 + w^2}$ |
| square | $s^2 = \frac{d^2}{2}$ | $4s$ |
| circle | $\pi r^2$ | $2\pi r$ |
| ellipse, semi-axes $a$, $b$ | $\pi ab$ | about $2\pi\sqrt{\frac{a^2 + b^2}{2}}$ |

For a polygon drawn on grid points, **Pick's theorem** counts its area: $A = I + \frac B2 - 1$, with $I$ points inside and $B$ on the boundary.

For a fixed perimeter the **circle** encloses the most area; among rectangles, the **square**. A rectangle with perimeter 34 has area $w(17 - w)$, largest at $w = 8.5$:`,
        {
          type: 'plot',
          alt: 'Area of a rectangle with perimeter 34 against its width, from 0 to 17. It rises from 0, peaks at 72.25 when the width is 8.5, a square, and falls back to 0.',
          caption: 'Rectangles with perimeter 34: the area peaks at 72.25 for the square (8.5 by 8.5); the 12-by-5 rectangle has 60.',
          x: [0, 17],
          y: [0, 90],
          xLabel: 'width',
          yLabel: 'area',
          series: [{ f: fenced, area: true }],
          marks: [{ x: 8.5, label: 'square' }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Rectangle: $A = lw$, $P = 2(l + w)$, $d = \sqrt{l^2 + w^2}$; square from its diagonal, $A = \frac{d^2}{2}$.`,
        r`Ellipse: $A = \pi ab$; its perimeter is about $2\pi\sqrt{\frac{a^2+b^2}{2}}$.`,
        r`Pick: a polygon on grid points has $A = I + \frac{B}{2} - 1$.`,
        r`For a given perimeter the circle encloses the most area; among rectangles, the square.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'From perimeter and diagonal',
          problem: r`A rectangle has a perimeter of $34$ cm and a diagonal of $13$ cm. Find its area.`,
          steps: [
            r`$l + w = 17$ and $l^2 + w^2 = 169$.`,
            r`$(l + w)^2 = l^2 + w^2 + 2lw$: $289 = 169 + 2lw$, so $lw = 60$ cm² (sides 12 and 5).`,
          ],
          answer: r`60 cm².`,
        },
        {
          level: 'board',
          title: 'Square or circle; grid points; an ellipse',
          problem: r`(a) A 48 cm wire is bent into a square, or into a circle. Which encloses more, and by how much? (b) A polygon on a grid has 10 points inside and 8 on its boundary. Find its area. (c) Find the area of an ellipse with semi-axes 6 and 4.`,
          steps: [
            r`(a) Square: side 12, area 144 cm². Circle: $r = \frac{48}{2\pi} = 7.639$ cm, area $\frac{48^2}{4\pi} = 183.35$ cm², about 27% more.`,
            r`(b) $A = 10 + \frac82 - 1 = 13$.`,
            r`(c) $\pi(6)(4) = 24\pi = 75.40$.`,
          ],
          answer: r`(a) The circle, 183.35 against 144 cm²; (b) 13; (c) about 75.40.`,
        },
      ],
      traps: [
        r`Squaring the sum is quicker than solving for each side; you rarely need $l$ and $w$ themselves.`,
        r`An ellipse's area uses the semi-axes, half the full widths.`,
      ],
      check: [
        { q: r`What is the largest rectangle with a perimeter of 40?`, a: r`A 10 by 10 square, area 100.` },
        { q: r`What is the diagonal of an 8 by 6 rectangle?`, a: r`$10$.` },
      ],
    },
    {
      name: "Ptolemy's Theorem",
      inShort: r`In a quadrilateral whose corners lie on a circle, the product of the diagonals equals the sum of the products of opposite sides.`,
      body: [
        r`For a cyclic quadrilateral $ABCD$ (corners in order around the circle):
$$AC \cdot BD = AB \cdot CD + BC \cdot DA.$$
For any other quadrilateral the left side is smaller (Ptolemy's inequality), so equality is a test that four points lie on one circle. On a rectangle it is the Pythagorean theorem: $d \cdot d = a \cdot a + b \cdot b$.

From the four sides alone, the diagonals of a cyclic quadrilateral are
$$p = \sqrt{\frac{(ac + bd)(ad + bc)}{ab + cd}}, \qquad q = \sqrt{\frac{(ac + bd)(ab + cd)}{ad + bc}},$$
and Ptolemy is their product, $pq = ac + bd$. A favourite board use: a point on the circle around an equilateral triangle is as far from the far vertex as from the other two together.`,
      ],
      keyIdeas: [
        r`Cyclic $ABCD$: $AC \cdot BD = AB \cdot CD + BC \cdot DA$.`,
        r`For any quadrilateral it is an inequality, $\le$; equality means the four points are concyclic.`,
        r`Each diagonal follows from the four sides: $p = \sqrt{\frac{(ac+bd)(ad+bc)}{ab+cd}}$.`,
        r`On a rectangle it is the Pythagorean theorem: $d^2 = a^2 + b^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A point on the circumcircle',
          problem: r`An equilateral triangle $ABC$ is inscribed in a circle, and $P$ is on arc $BC$ with $PB = 3$ and $PC = 5$. Find $PA$.`,
          steps: [
            r`$ABPC$ is cyclic, so $PA \cdot BC = PB \cdot AC + PC \cdot AB$.`,
            r`All the triangle's sides are equal; dividing by one: $PA = PB + PC = 8$.`,
          ],
          answer: r`$PA = 8$.`,
        },
        {
          level: 'board',
          title: 'Diagonals from the sides',
          problem: r`A cyclic quadrilateral has sides $a = 5$, $b = 6$, $c = 7$, $d = 8$ in order. Find both diagonals, and check with Ptolemy.`,
          steps: [
            r`$ac + bd = 83$, $ad + bc = 82$, $ab + cd = 86$.`,
            r`$p = \sqrt{\frac{83 \times 82}{86}} = 8.896$ and $q = \sqrt{\frac{83 \times 86}{82}} = 9.330$.`,
            r`Ptolemy: $pq = 83 = ac + bd$.`,
          ],
          answer: r`About 8.896 and 9.330.`,
        },
      ],
      traps: [
        r`Pair opposite sides (the ones that don't share a vertex), and keep the vertices in order around the circle.`,
        r`The formula holds only for a cyclic quadrilateral; otherwise the product of the diagonals is smaller.`,
      ],
      check: [
        { q: r`What does Ptolemy's theorem say for a 6 by 8 rectangle?`, a: r`$d^2 = 36 + 64$, so the diagonal is 10.` },
        { q: r`When does Ptolemy's inequality become an equality?`, a: r`Exactly when the four points lie on one circle.` },
      ],
    },
  ],
};
