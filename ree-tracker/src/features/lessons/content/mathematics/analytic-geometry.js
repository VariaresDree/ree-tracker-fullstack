// Library › Lessons › Mathematics › Analytic Geometry (2026-11-16; every
// subtopic in the module format 2026-11-27, with figures, examples a step at a
// time and checks; every number re-worked by analyticGeometryLesson.test.js.
// Coverage cross-checked against two review centers' analytic geometry
// handouts; the text, problems and figures are this app's own): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
// A closed curve from a parametrisation over one turn.
const loop = (fn, n = 120) => range(0, 2 * Math.PI, n).map(fn);

// Tangent from P(12, 7) to the circle centred C(3, −2), radius 5: one of the two touch points.
export const CIRCLE = { h: 3, k: -2, r: 5, P: [12, 7] };
export const touchPoint = () => {
  const { h, k, r: rr, P } = CIRCLE;
  const d = Math.hypot(P[0] - h, P[1] - k);
  const t = Math.atan2(P[1] - k, P[0] - h) + Math.acos(rr / d);
  return [h + rr * Math.cos(t), k + rr * Math.sin(t)];
};

// The ellipse x²/25 + y²/9 = 1 and a point P on it.
export const ELLIPSE_P = [3, 2.4];

// The rotated ellipse 5x² + 4xy + 2y² = 6: 6x'² + y'² = 6 with tan θ = 1/2.
export const ROT = Math.atan(0.5);
export const rotatedEllipse = (t) => {
  const [u, v] = [Math.cos(t), Math.sqrt(6) * Math.sin(t)];
  return [u * Math.cos(ROT) - v * Math.sin(ROT), u * Math.sin(ROT) + v * Math.cos(ROT)];
};

export default {
  topic: 'Analytic Geometry',
  subject: 'Mathematics',
  overview: r`Analytic geometry puts figures on coordinates, so geometry becomes algebra: a line is a first-degree equation, a conic a second-degree one. On the board it is quick computation (distances, slopes, centres, foci) and recognising a conic from its equation. Complete the square to read off centres and vertices, keep a and b straight for each conic, and watch the sign that separates the ellipse ($c^2 = a^2 - b^2$) from the hyperbola ($c^2 = a^2 + b^2$).`,
  sources: [
    'Schaum’s Outline of Analytic Geometry (Kindle)',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Coordinate Systems and Distance',
      inShort: r`Points on the plane: the distance between two, the point halfway or in any ratio, and areas from vertices.`,
      body: [
        r`On the Cartesian plane a point is $(x, y)$: the **abscissa** $x$ and the **ordinate** $y$. The Pythagorean theorem gives the **distance** between two points, and weighting the ends gives a point dividing the segment:

| Quantity | Formula |
|---|---|
| distance | $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$ (add $(z_2 - z_1)^2$ in space) |
| point dividing $P_1P_2$ so that $\frac{P_1P}{P_1P_2} = k$ | $x = x_1 + k(x_2 - x_1)$, $y = y_1 + k(y_2 - y_1)$ |
| midpoint | $\left(\frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2}\right)$ |
| centroid of a triangle | the average of the three vertices |
| area of a polygon (shoelace) | $\frac12\left|\sum(x_iy_{i+1} - x_{i+1}y_i)\right|$, vertices in order |

The shoelace formula works for any polygon whose vertices are taken in order around it; for a triangle it is $\frac12|x_1(y_2 - y_3) + x_2(y_3 - y_1) + x_3(y_1 - y_2)|$:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The triangle with vertices at 1 comma 2, 8 comma 3 and 4 comma 9 drawn on a grid. Its area by the shoelace formula is 23.',
          caption: 'The triangle (1, 2), (8, 3), (4, 9): the shoelace formula gives an area of 23.',
          x: [0, 10],
          y: [0, 10],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: [[1, 2], [8, 3], [4, 9], [1, 2]] }],
          legend: false,
        },
        r`A **locus** is the path of a point that moves by a rule. Points equally far from two fixed points lie on the segment's perpendicular bisector; points equally far from a fixed point and a fixed line lie on a parabola.`,
      ],
      keyIdeas: [
        r`Distance: $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$; in space, add the $z$ term.`,
        r`Ratio $m:n$ from $P_1$: $x = \frac{mx_2 + nx_1}{m + n}$, likewise $y$; the midpoint is $1:1$.`,
        r`Triangle area: $\frac12|x_1(y_2 - y_3) + x_2(y_3 - y_1) + x_3(y_1 - y_2)|$; any polygon by the shoelace.`,
        r`Centroid: the average of the vertices.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A dividing point and a triangle',
          problem: r`Find the point dividing the segment from $A(-2, 5)$ to $B(7, -1)$ in the ratio $2:1$ from $A$. Then find the area of the triangle with vertices $(1, 2)$, $(8, 3)$ and $(4, 9)$.`,
          steps: [
            r`$x = \frac{2(7) + 1(-2)}{3} = 4$ and $y = \frac{2(-1) + 1(5)}{3} = 1$: the point is $(4, 1)$.`,
            r`Area $= \frac12|1(3 - 9) + 8(9 - 2) + 4(2 - 3)| = \frac12|{-6} + 56 - 4| = 23$.`,
          ],
          answer: r`$(4, 1)$; area 23.`,
        },
        {
          level: 'board',
          title: 'A quadrilateral, a locus, a distance in space',
          problem: r`(a) Find the area of the quadrilateral $(0, 0)$, $(6, 1)$, $(5, 7)$, $(-1, 4)$. (b) Find the locus of points equidistant from $A(1, 2)$ and $B(5, -4)$. (c) How far apart are $(1, -2, 3)$ and $(4, 2, 15)$?`,
          steps: [
            r`(a) Shoelace: $0 + (42 - 5) + (20 + 7) + 0 = 64$, so the area is 32.`,
            r`(b) $(x - 1)^2 + (y - 2)^2 = (x - 5)^2 + (y + 4)^2$; the squares cancel: $8x - 12y - 36 = 0$, that is $2x - 3y - 9 = 0$, the perpendicular bisector of AB.`,
            r`(c) $\sqrt{3^2 + 4^2 + 12^2} = \sqrt{169} = 13$.`,
          ],
          answer: r`(a) 32; (b) $2x - 3y - 9 = 0$; (c) 13.`,
        },
      ],
      traps: [
        r`In the ratio formula, each end is weighted by the far part: $x_2$ by $m$, not by $n$.`,
        r`The shoelace needs the vertices in order around the polygon; a crossed order gives a wrong area.`,
      ],
      check: [
        { q: r`What is the midpoint of $(-3, 8)$ and $(5, -2)$?`, a: r`$(1, 3)$.` },
        { q: r`The midpoint of $P_1$ and $(-2, 4)$ is $(2, -1)$. Find $P_1$.`, a: r`$(6, -6)$.` },
      ],
    },
    {
      name: 'Lines and Slopes',
      inShort: r`Slopes, the forms of a line's equation, the angle between two lines, and distances to a line.`,
      body: [
        r`A line's **slope** is its rise over run, $m = \frac{y_2 - y_1}{x_2 - x_1} = \tan\theta$, where $\theta$ is the **inclination** from the positive $x$ axis. For $Ax + By + C = 0$ the slope is $-\frac AB$.

| Form | Equation | Use when you know |
|---|---|---|
| general | $Ax + By + C = 0$ | (for answers and distances) |
| point-slope | $y - y_1 = m(x - x_1)$ | a point and the slope |
| two-point | $y - y_1 = \frac{y_2 - y_1}{x_2 - x_1}(x - x_1)$ | two points |
| slope-intercept | $y = mx + b$ | the slope and the $y$ intercept |
| intercept | $\frac xa + \frac yb = 1$ | both intercepts |

Parallel lines have equal slopes; perpendicular lines have $m_1m_2 = -1$. The acute angle between two lines is $\tan\theta = \left|\frac{m_2 - m_1}{1 + m_1m_2}\right|$.

The shortest distance from a point to a line runs along the perpendicular:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The line 3x plus 4y minus 12 equals 0 and the point 5 comma 6 above it. A dashed perpendicular runs from the point to its foot on the line, at 1.76 comma 1.68; its length is 5.4.',
          caption: 'From (5, 6) to the line 3x + 4y − 12 = 0: the perpendicular, 5.4 long, meets the line at (1.76, 1.68).',
          x: [-1, 7],
          y: [-1, 7],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => (12 - 3 * x) / 4, label: '3x + 4y = 12', colour: colourOf(0) },
            { points: [[5, 6], [1.76, 1.68]], label: 'distance 5.4', dashed: true, colour: colourOf(1) },
          ],
        },
        r`$d = \frac{|Ax_1 + By_1 + C|}{\sqrt{A^2 + B^2}}$; between parallel lines $Ax + By + C_1 = 0$ and $Ax + By + C_2 = 0$, $d = \frac{|C_2 - C_1|}{\sqrt{A^2 + B^2}}$.`,
      ],
      keyIdeas: [
        r`$m = \frac{y_2 - y_1}{x_2 - x_1} = \tan\theta$. Parallel: equal slopes. Perpendicular: $m_1 m_2 = -1$.`,
        r`Forms: point-slope $y - y_1 = m(x - x_1)$, slope-intercept $y = mx + b$, intercept $\frac{x}{a} + \frac{y}{b} = 1$, general $Ax + By + C = 0$.`,
        r`Angle from line 1 to line 2: $\tan\theta = \frac{m_2 - m_1}{1 + m_1 m_2}$.`,
        r`Point to line: $\frac{|Ax_1 + By_1 + C|}{\sqrt{A^2 + B^2}}$; parallel lines: $\frac{|C_2 - C_1|}{\sqrt{A^2 + B^2}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A distance and an angle',
          problem: r`Find the distance from $(5, 6)$ to the line $3x + 4y - 12 = 0$, and the acute angle between $y = 0.5x$ and $y = 3x$.`,
          steps: [
            r`$d = \frac{|15 + 24 - 12|}{\sqrt{9 + 16}} = \frac{27}{5} = 5.4$.`,
            r`$\tan\theta = \frac{3 - 0.5}{1 + 1.5} = 1$, so $\theta = 45^\circ$.`,
          ],
          answer: r`5.4; $45^\circ$.`,
        },
        {
          level: 'board',
          title: 'A perpendicular, parallel lines, an inclination',
          problem: r`(a) Find the line through $(2, -3)$ perpendicular to $4x - 3y + 7 = 0$. (b) How far apart are $6x + 8y - 5 = 0$ and $3x + 4y + 10 = 0$? (c) What is the inclination of the line through $(-2, 1)$ and $(4, 7)$?`,
          steps: [
            r`(a) The given slope is $\frac43$, so the perpendicular has $-\frac34$: $y + 3 = -\frac34(x - 2)$, that is $3x + 4y + 6 = 0$.`,
            r`(b) Write the second as $6x + 8y + 20 = 0$: $d = \frac{|20 - (-5)|}{\sqrt{36 + 64}} = 2.5$.`,
            r`(c) $m = \frac{6}{6} = 1$, so $\theta = 45^\circ$.`,
          ],
          answer: r`(a) $3x + 4y + 6 = 0$; (b) 2.5; (c) $45^\circ$.`,
        },
      ],
      traps: [
        r`For the distance between parallel lines, make $A$ and $B$ the same in both equations first.`,
        r`The slope of $Ax + By + C = 0$ is $-\frac AB$, not $\frac AB$.`,
      ],
      check: [
        { q: r`For what $B$ is $3x + 2y - 7 = 0$ perpendicular to $2x - By + 2 = 0$?`, a: r`$-\frac32 \times \frac2B = -1$, so $B = 3$.` },
        { q: r`Find the line with $x$ intercept 4 and $y$ intercept $-6$.`, a: r`$\frac x4 - \frac y6 = 1$, that is $3x - 2y = 12$.` },
      ],
    },
    {
      name: 'Circles',
      inShort: r`A circle's equation in standard and general form, and its tangents.`,
      body: [
        r`A **circle** is every point at distance $r$ from a centre $(h, k)$:
$$(x - h)^2 + (y - k)^2 = r^2 \quad \text{or} \quad x^2 + y^2 + Dx + Ey + F = 0,$$
with centre $\left(-\frac D2, -\frac E2\right)$ and $r = \frac12\sqrt{D^2 + E^2 - 4F}$. When $D^2 + E^2 - 4F = 0$ the "circle" is a single point (a **point circle**); when it is negative there is no circle.

A tangent from an outside point touches the circle at right angles to the radius, so its length comes from a right triangle; substituting the point into the general equation gives the square of that length directly:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The circle centred at 3 comma minus 2 with radius 5, and a tangent line from the point 12 comma 7 to where it touches the circle near 1.14 comma 2.64. The tangent is about 11.70 long.',
          caption: 'The circle x² + y² − 6x + 4y − 12 = 0 (centre (3, −2), radius 5) and a tangent from (12, 7), about 11.70 long.',
          x: [-2, 13],
          y: [-7.5, 7.5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: loop((t) => [3 + 5 * Math.cos(t), -2 + 5 * Math.sin(t)]), label: 'circle', colour: colourOf(0) },
            { points: [CIRCLE.P, touchPoint()], label: 'tangent', dashed: true, colour: colourOf(1) },
          ],
        },
        r`Three conditions fix a circle: a centre and a radius, or three points on it (substitute each into the general form and solve for $D$, $E$, $F$).`,
      ],
      keyIdeas: [
        r`Standard: $(x - h)^2 + (y - k)^2 = r^2$.`,
        r`General: $x^2 + y^2 + Dx + Ey + F = 0$, centre $\left(-\frac{D}{2}, -\frac{E}{2}\right)$, $r = \frac12\sqrt{D^2 + E^2 - 4F}$.`,
        r`Tangent at $(x_1, y_1)$: $(x_1 - h)(x - h) + (y_1 - k)(y - k) = r^2$.`,
        r`Tangent length from an outside point: put the point into the general form and take the root.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Centre, radius, tangent',
          problem: r`Find the centre and radius of $x^2 + y^2 - 6x + 4y - 12 = 0$, and the length of a tangent to it from $(12, 7)$.`,
          steps: [
            r`Centre $(3, -2)$; $r = \frac12\sqrt{36 + 16 + 48} = 5$.`,
            r`Tangent: $\sqrt{144 + 49 - 72 + 28 - 12} = \sqrt{137} = 11.70$.`,
          ],
          answer: r`$(3, -2)$, 5; about 11.70.`,
        },
        {
          level: 'board',
          title: 'From a diameter, from a tangent line, a point circle',
          problem: r`(a) Find the circle with a diameter from $(-1, 4)$ to $(7, -2)$. (b) A circle centred at $(2, -1)$ touches $3x - 4y + 5 = 0$. Find its area. (c) For what $k$ is $x^2 + y^2 - 6x + 10y + k = 0$ a point circle?`,
          steps: [
            r`(a) Centre $(3, 1)$, radius $\frac12\sqrt{8^2 + 6^2} = 5$: $(x - 3)^2 + (y - 1)^2 = 25$, that is $x^2 + y^2 - 6x - 2y - 15 = 0$.`,
            r`(b) $r = \frac{|6 + 4 + 5|}{5} = 3$, so the area is $9\pi = 28.27$.`,
            r`(c) $r = 0$: $36 + 100 - 4k = 0$, so $k = 34$.`,
          ],
          answer: r`(a) $x^2 + y^2 - 6x - 2y - 15 = 0$; (b) $9\pi$; (c) 34.`,
        },
      ],
      traps: [
        r`$(x + 2)^2$ means $h = -2$; and the right side is $r^2$, not $r$.`,
        r`The general form needs $x^2$ and $y^2$ with coefficient 1; divide through first.`,
      ],
      check: [
        { q: r`What is the centre of $x^2 + y^2 - 6x + 4y - 23 = 0$?`, a: r`$(3, -2)$.` },
        { q: r`How far apart are the centres of $x^2 + y^2 + 2x + 4y = 3$ and $x^2 + y^2 - 8x - 6y = -7$?`, a: r`$(-1, -2)$ to $(4, 3)$: $\sqrt{50} \approx 7.07$.` },
      ],
    },
    {
      name: 'Parabola',
      inShort: r`Every point as far from a focus as from a line (the directrix): equations, vertex, focus and latus rectum.`,
      body: [
        r`A **parabola** is every point as far from a fixed point, the **focus**, as from a fixed line, the **directrix** (eccentricity $e = 1$). The **vertex** is halfway between them, $a$ from each, and the **latus rectum**, the chord through the focus across the axis, is $4|a|$ long:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The parabola with vertex 3 comma 2 opening to the right, its focus at 5 comma 2, the dashed directrix x equals 1, and the dashed latus rectum, a vertical chord 8 long through the focus.',
          caption: '(y − 2)² = 8(x − 3): vertex (3, 2), a = 2, focus (5, 2), directrix x = 1, latus rectum 8.',
          x: [0, 8],
          y: [-4, 8],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: range(-6, 10, 64).map((y) => [3 + ((y - 2) ** 2) / 8, y]), label: 'parabola', colour: colourOf(0) },
            { points: [[5, -2], [5, 6]], label: 'latus rectum', dashed: true, colour: colourOf(1) },
          ],
          marks: [{ x: 1 }],
          legend: false,
        },
        r`| Opens | Vertex at origin | Vertex at $(h, k)$ |
|---|---|---|
| right / left | $y^2 = \pm4ax$ | $(y - k)^2 = \pm4a(x - h)$ |
| up / down | $x^2 = \pm4ay$ | $(x - h)^2 = \pm4a(y - k)$ |

From the general form, complete the square on the squared variable. For $y = Ax^2 + Bx + C$, the vertex is at $x = -\frac{B}{2A}$ and $a = \frac{1}{4A}$.

Two board tools for arches and cables: chords across a parabola satisfy the **squared property** $\frac{b_1^2}{b_2^2} = \frac{h_1}{h_2}$ (widths squared go as depths from the vertex), and a **parabolic segment** has area $\frac23bh$, two-thirds of its bounding rectangle.`,
      ],
      keyIdeas: [
        r`$y^2 = 4ax$ opens right (left if $a < 0$); $x^2 = 4ay$ opens up. Focus $a$ from the vertex, directrix $a$ behind it.`,
        r`Shifted: $(y - k)^2 = 4a(x - h)$ or $(x - h)^2 = 4a(y - k)$, vertex $(h, k)$.`,
        r`Latus rectum $= 4|a|$.`,
        r`$y = Ax^2 + Bx + C$: vertex at $x = -\frac{B}{2A}$, and $a = \frac{1}{4A}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reading a parabola',
          problem: r`Find the vertex, focus, directrix and latus rectum of $y^2 - 4y - 8x + 28 = 0$.`,
          steps: [
            r`$(y - 2)^2 = 8x - 24 = 8(x - 3)$: vertex $(3, 2)$.`,
            r`$4a = 8$, so $a = 2$: focus $(5, 2)$, directrix $x = 1$, latus rectum 8.`,
          ],
          answer: r`$(3, 2)$; $(5, 2)$; $x = 1$; 8.`,
        },
        {
          level: 'board',
          title: 'A parabolic arch',
          problem: r`A parabolic arch spans 24 m at its base and is 9 m high. How wide is it 5 m above the base? What area does it enclose?`,
          steps: [
            r`Depths from the vertex: the base is 9 m down, the 5 m level is $9 - 5 = 4$ m down.`,
            r`Squared property: $\frac{w^2}{24^2} = \frac49$, so $w = 24 \times \frac23 = 16$ m.`,
            r`Area $= \frac23(24)(9) = 144$ m².`,
          ],
          answer: r`16 m; 144 m².`,
        },
      ],
      traps: [
        r`$4a$ is the coefficient; the focal distance is a quarter of it.`,
        r`In the squared property the depths are measured from the vertex, not from the base.`,
      ],
      check: [
        { q: r`Where is the focus of $x^2 = 12y$?`, a: r`$4a = 12$, so $a = 3$: $(0, 3)$.` },
        { q: r`What is the vertex of $y^2 - 2x + 6y + 3 = 0$?`, a: r`$(y + 3)^2 = 2x + 6 = 2(x + 3)$: $(-3, -3)$.` },
      ],
    },
    {
      name: 'Ellipse',
      inShort: r`Every point whose distances to two foci add to $2a$: axes, foci, eccentricity and latus rectum.`,
      body: [
        r`An **ellipse** is every point whose distances to two **foci** add to the same total, the major axis $2a$:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The ellipse x squared over 25 plus y squared over 9 equals 1, with foci at minus 4 and 4 on the x axis. Dashed lines from both foci meet at the point 3 comma 2.4 on the ellipse; they are 7.4 and 2.6 long, adding to 10.',
          caption: 'x²/25 + y²/9 = 1: from P(3, 2.4) the distances to the foci (±4, 0) are 7.4 and 2.6, adding to 2a = 10.',
          x: [-6, 6],
          y: [-4, 5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: loop((t) => [5 * Math.cos(t), 3 * Math.sin(t)]), label: 'ellipse', colour: colourOf(0) },
            { points: [[-4, 0], ELLIPSE_P, [4, 0]], label: 'to the foci', dashed: true, colour: colourOf(1) },
          ],
        },
        r`| Quantity | Value |
|---|---|
| standard form | $\frac{(x - h)^2}{a^2} + \frac{(y - k)^2}{b^2} = 1$, $a > b$ (swap the denominators for a vertical major axis) |
| centre from $Ax^2 + Cy^2 + Dx + Ey + F = 0$ | $\left(-\frac{D}{2A}, -\frac{E}{2C}\right)$ |
| focal distance | $c^2 = a^2 - b^2$ |
| eccentricity | $e = \frac ca < 1$ |
| latus rectum | $\frac{2b^2}{a}$ |
| directrices | $\frac ae$ from the centre |
| area; perimeter | $\pi ab$; about $2\pi\sqrt{\frac{a^2 + b^2}{2}}$ |

The larger denominator is always $a^2$ and names the major axis. Planets and satellites move on ellipses with the central body at one focus: the nearest and farthest distances are $a(1 - e)$ and $a(1 + e)$.`,
      ],
      keyIdeas: [
        r`$\frac{(x - h)^2}{a^2} + \frac{(y - k)^2}{b^2} = 1$ with $a > b$: the larger denominator is $a^2$ and names the major axis.`,
        r`$c^2 = a^2 - b^2$; $e = \frac{c}{a} < 1$.`,
        r`$PF_1 + PF_2 = 2a$; latus rectum $\frac{2b^2}{a}$; directrices $\frac{a}{e}$ from the centre.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reading an ellipse',
          problem: r`For $9x^2 + 25y^2 = 225$, find $a$, $b$, $c$, $e$, the foci and the latus rectum.`,
          steps: [
            r`$\frac{x^2}{25} + \frac{y^2}{9} = 1$: $a = 5$, $b = 3$.`,
            r`$c = \sqrt{25 - 9} = 4$, $e = 0.8$, foci $(\pm4, 0)$, latus rectum $\frac{2(9)}{5} = 3.6$.`,
          ],
          answer: r`5, 3, 4, 0.8; $(\pm4, 0)$; 3.6.`,
        },
        {
          level: 'board',
          title: 'From the general form, and an orbit',
          problem: r`(a) For $4x^2 + 9y^2 - 16x + 54y + 61 = 0$, find the centre, $a$, $b$, $c$, $e$, the latus rectum and the area. (b) An orbit has semi-major axis 150 million km and eccentricity 0.0167, the sun at a focus. Find the nearest and farthest distances.`,
          steps: [
            r`(a) $4(x - 2)^2 + 9(y + 3)^2 = -61 + 16 + 81 = 36$, so $\frac{(x - 2)^2}{9} + \frac{(y + 3)^2}{4} = 1$: centre $(2, -3)$, $a = 3$, $b = 2$.`,
            r`$c = \sqrt5 = 2.236$, $e = 0.745$, latus rectum $\frac{2(4)}{3} = 2.667$, area $6\pi = 18.85$.`,
            r`(b) $150(1 - 0.0167) = 147.5$ and $150(1 + 0.0167) = 152.5$ million km.`,
          ],
          answer: r`(a) $(2, -3)$, 3, 2, 2.236, 0.745, 2.667, 18.85; (b) 147.5 and 152.5 million km.`,
        },
      ],
      traps: [
        r`Divide through so the right side is $1$ before reading $a^2$ and $b^2$.`,
        r`Completing the square inside $4(x^2 - 4x)$ adds $4 \times 4 = 16$ to the other side, not 4.`,
      ],
      check: [
        { q: r`What is the eccentricity of $16x^2 + 25y^2 = 400$?`, a: r`$a = 5$, $b = 4$, $c = 3$: $0.6$.` },
        { q: r`What is the area of $\frac{x^2}{16} + \frac{y^2}{4} = 1$?`, a: r`$\pi(4)(2) = 8\pi$.` },
      ],
    },
    {
      name: 'Hyperbola',
      inShort: r`Every point whose distances to two foci differ by $2a$: axes, foci, asymptotes and eccentricity.`,
      body: [
        r`A **hyperbola** is every point whose distances to two foci **differ** by the transverse axis $2a$. It has two branches, which approach two **asymptotes** through the centre:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The hyperbola x squared over 9 minus y squared over 16 equals 1: two branches opening left and right from vertices at minus 3 and 3, approaching the dashed asymptotes y equals plus and minus four thirds x.',
          caption: 'x²/9 − y²/16 = 1: vertices (±3, 0), foci (±5, 0), asymptotes y = ±4x/3 (dashed).',
          x: [-8, 8],
          y: [-6, 6],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: range(-1.6, 1.6, 60).map((t) => [3 * Math.cosh(t), 4 * Math.sinh(t)]), label: 'hyperbola', colour: colourOf(0) },
            { points: range(-1.6, 1.6, 60).map((t) => [-3 * Math.cosh(t), 4 * Math.sinh(t)]), colour: colourOf(0) },
            { f: (x) => (4 / 3) * x, label: 'asymptotes', dashed: true, colour: colourOf(1) },
            { f: (x) => (-4 / 3) * x, dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`| Quantity | Value |
|---|---|
| standard form | $\frac{(x - h)^2}{a^2} - \frac{(y - k)^2}{b^2} = 1$ (the positive term names the transverse axis) |
| focal distance | $c^2 = a^2 + b^2$ |
| eccentricity | $e = \frac ca > 1$ |
| asymptotes | $y - k = \pm\frac ba(x - h)$; for a vertical transverse axis, $\pm\frac ab$ |
| latus rectum | $\frac{2b^2}{a}$ |

Here $a$ may be larger than, smaller than or equal to $b$. With $a = b$ the hyperbola is **rectangular** (asymptotes at right angles, $e = \sqrt2$); $xy = k$ is one, turned $45^\circ$.`,
      ],
      keyIdeas: [
        r`$\frac{(x - h)^2}{a^2} - \frac{(y - k)^2}{b^2} = 1$: the positive term names the transverse axis; $a$ may be smaller than $b$.`,
        r`$c^2 = a^2 + b^2$; $e = \frac{c}{a} > 1$.`,
        r`Asymptotes: $y - k = \pm\frac{b}{a}(x - h)$; latus rectum $\frac{2b^2}{a}$.`,
        r`Equal axes ($a = b$): a rectangular hyperbola, $e = \sqrt2$; $xy = k$ is one.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reading a hyperbola',
          problem: r`For $16x^2 - 9y^2 = 144$, find $a$, $b$, $c$, $e$, the asymptotes and the latus rectum.`,
          steps: [
            r`$\frac{x^2}{9} - \frac{y^2}{16} = 1$: $a = 3$, $b = 4$, $c = 5$, $e = \frac53$.`,
            r`Asymptotes $y = \pm\frac43 x$; latus rectum $\frac{2(16)}{3} = 10.67$.`,
          ],
          answer: r`3, 4, 5, $\frac53$; $y = \pm\frac43x$; about 10.67.`,
        },
        {
          level: 'board',
          title: 'From the general form',
          problem: r`For $9x^2 - 4y^2 - 36x - 8y - 4 = 0$, find the centre, $a$, $b$, $c$, $e$, the asymptotes and the latus rectum.`,
          steps: [
            r`$9(x - 2)^2 - 4(y + 1)^2 = 4 + 36 - 4 = 36$, so $\frac{(x - 2)^2}{4} - \frac{(y + 1)^2}{9} = 1$.`,
            r`Centre $(2, -1)$, $a = 2$, $b = 3$, $c = \sqrt{13} = 3.606$, $e = 1.803$.`,
            r`Asymptotes $y + 1 = \pm\frac32(x - 2)$; latus rectum $\frac{2(9)}{2} = 9$.`,
          ],
          answer: r`$(2, -1)$, 2, 3, 3.606, 1.803; $y + 1 = \pm\frac32(x - 2)$; 9.`,
        },
      ],
      traps: [
        r`$c^2 = a^2 + b^2$ here; using the ellipse's minus is the classic slip.`,
        r`$a$ goes with the positive term, even when it is the smaller number.`,
      ],
      check: [
        { q: r`What are the asymptotes of $\frac{y^2}{36} - \frac{x^2}{16} = 1$?`, a: r`Vertical transverse axis: $y = \pm\frac64x$, that is $3x \pm 2y = 0$.` },
        { q: r`What is the eccentricity of a rectangular hyperbola?`, a: r`$\sqrt2$.` },
      ],
    },
    {
      name: 'General Conic Sections',
      inShort: r`Every conic is $Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$: which one it is, from the coefficients or the eccentricity.`,
      body: [
        r`Slicing a double cone with a plane gives every **conic section**: a circle, an ellipse, a parabola or a hyperbola (or, through the vertex, a point or lines). All of them are $Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$, and the coefficients say which:

| Test | Ellipse (circle) | Parabola | Hyperbola |
|---|---|---|---|
| discriminant $B^2 - 4AC$ | $< 0$ (circle if $B = 0$, $A = C$) | $= 0$ | $> 0$ |
| with no $xy$ term | $A$, $C$ same sign | $A$ or $C$ zero | $A$, $C$ opposite signs |
| eccentricity $e = \frac{PF}{PD}$ | $0 \le e < 1$ | $e = 1$ | $e > 1$ |

An $xy$ term means the axes are tilted. In complex form, loci read the same way: $|z - z_0| = r$ is a circle; $|z - z_1| + |z - z_2| = 2a$ an ellipse with foci $z_1$, $z_2$; $\big||z - z_1| - |z - z_2|\big| = 2a$ a hyperbola.`,
      ],
      keyIdeas: [
        r`$B^2 - 4AC < 0$: ellipse (circle if $B = 0$, $A = C$); $= 0$: parabola; $> 0$: hyperbola.`,
        r`With no $xy$ term: $AC > 0$ ellipse, $AC = 0$ parabola, $AC < 0$ hyperbola.`,
        r`By eccentricity $e = \frac{PF}{PD}$: $0$ circle, under $1$ ellipse, $1$ parabola, over $1$ hyperbola.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Naming two conics',
          problem: r`Name the conics $4x^2 - 4xy + y^2 - 6x + 3 = 0$ and $x^2 + xy + y^2 = 3$.`,
          steps: [
            r`First: $B^2 - 4AC = 16 - 16 = 0$, a parabola.`,
            r`Second: $1 - 4 = -3 < 0$, an ellipse (turned, since $B \ne 0$).`,
          ],
          answer: r`A parabola; an ellipse.`,
        },
        {
          level: 'board',
          title: 'A tilted conic, and loci in complex form',
          problem: r`(a) Name $3x^2 - 2xy + 3y^2 - 8 = 0$. (b) Name the locus $|z - 2| + |z + 2| = 10$ and find its semi-axes. (c) Name the locus $|z - j| = 3$.`,
          steps: [
            r`(a) $B^2 - 4AC = 4 - 36 = -32 < 0$ with $B \ne 0$: an ellipse, tilted.`,
            r`(b) Distances to $\pm2$ add to 10: an ellipse with $c = 2$, $a = 5$, so $b = \sqrt{25 - 4} = \sqrt{21} = 4.583$.`,
            r`(c) Points 3 from $j$: a circle of radius 3 centred at $(0, 1)$.`,
          ],
          answer: r`(a) an ellipse; (b) an ellipse, $a = 5$, $b \approx 4.583$; (c) a circle.`,
        },
      ],
      traps: [
        r`The test also passes degenerate cases (a point, a pair of lines, nothing): complete the square when the answer choices include them.`,
        r`$x^2 - 4y^2 + 8x + 4y - 15 = 0$ has opposite signs on the squares: a hyperbola, not an ellipse.`,
      ],
      check: [
        { q: r`What conic is $x^2 + 4y^2 + 4xy + 2x - 10 = 0$?`, a: r`$16 - 16 = 0$: a parabola.` },
        { q: r`What is the locus $|z - 1| = 2$?`, a: r`A circle of radius 2 centred at 1.` },
      ],
    },
    {
      name: 'Translation and Rotation of Axes',
      inShort: r`Moving the origin, and turning the axes to remove an $xy$ term.`,
      body: [
        r`**Translating** the axes to a new origin $(h, k)$ replaces $x$ by $x' + h$ and $y$ by $y' + k$; completing the square does exactly this, and removes the first-degree terms.

**Rotating** the axes by $\theta$ removes an $xy$ term:
$$x = x'\cos\theta - y'\sin\theta, \qquad y = x'\sin\theta + y'\cos\theta, \qquad \cot2\theta = \frac{A - C}{B}.$$
The new coefficients are $A' = A\cos^2\theta + B\sin\theta\cos\theta + C\sin^2\theta$ and $C' = A + C - A'$, since $A + C$ and $B^2 - 4AC$ never change. A tilted ellipse becomes an upright one:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The ellipse 5 x squared plus 4 x y plus 2 y squared equals 6, tilted, with its own dashed axes turned 26.57 degrees from the x axis.',
          caption: '5x² + 4xy + 2y² = 6: turned through θ = 26.57° (dashed axes), it is 6x′² + y′² = 6.',
          x: [-3, 3],
          y: [-3, 3],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: loop(rotatedEllipse), label: 'ellipse', colour: colourOf(0) },
            { points: [[-3 * Math.cos(ROT), -3 * Math.sin(ROT)], [3 * Math.cos(ROT), 3 * Math.sin(ROT)]], label: 'new axes', dashed: true, colour: colourOf(1) },
            { points: [[3 * Math.sin(ROT), -3 * Math.cos(ROT)], [-3 * Math.sin(ROT), 3 * Math.cos(ROT)]], dashed: true, colour: colourOf(1) },
          ],
        },
      ],
      keyIdeas: [
        r`Translation: $x = x' + h$, $y = y' + k$; completing the square does this.`,
        r`Rotation: $x = x'\cos\theta - y'\sin\theta$, $y = x'\sin\theta + y'\cos\theta$.`,
        r`The angle that removes $xy$: $\cot 2\theta = \frac{A - C}{B}$.`,
        r`$A + C$ and $B^2 - 4AC$ don't change, so the conic's kind never does.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Removing the xy term',
          problem: r`Rotate the axes to remove the $xy$ term from $5x^2 + 4xy + 2y^2 = 6$, and name the curve.`,
          steps: [
            r`$\cot 2\theta = \frac34$, so $\cos 2\theta = \frac35$, $\cos\theta = \frac{2}{\sqrt5}$, $\sin\theta = \frac{1}{\sqrt5}$ ($\theta = 26.57^\circ$).`,
            r`$A' = 5(0.8) + 4(0.4) + 2(0.2) = 6$ and $C' = (A + C) - A' = 1$: $6x'^2 + y'^2 = 6$.`,
          ],
          answer: r`An ellipse, $x'^2 + \frac{y'^2}{6} = 1$.`,
        },
        {
          level: 'board',
          title: 'A translation, and a rotated hyperbola',
          problem: r`(a) Move the origin to remove the first-degree terms from $x^2 + y^2 - 4x + 6y = 3$. (b) Rotate the axes to remove the $xy$ term from $x^2 + 4xy - 2y^2 = 6$.`,
          steps: [
            r`(a) $(x - 2)^2 + (y + 3)^2 = 3 + 4 + 9 = 16$: with the origin at $(2, -3)$, $x'^2 + y'^2 = 16$.`,
            r`(b) $\cot2\theta = \frac{1 + 2}{4} = \frac34$: again $\cos\theta = \frac{2}{\sqrt5}$, $\sin\theta = \frac{1}{\sqrt5}$.`,
            r`$A' = 1(0.8) + 4(0.4) - 2(0.2) = 2$, $C' = -1 - 2 = -3$: $2x'^2 - 3y'^2 = 6$, a hyperbola $\frac{x'^2}{3} - \frac{y'^2}{2} = 1$ (check: $B^2 - 4AC = 24 > 0$).`,
          ],
          answer: r`(a) $x'^2 + y'^2 = 16$; (b) $\frac{x'^2}{3} - \frac{y'^2}{2} = 1$.`,
        },
      ],
      traps: [
        r`Get $\cos\theta$ and $\sin\theta$ from $\cos 2\theta$ with the half-angle formulas; don't round $\theta$ first.`,
        r`$\cot2\theta$, not $\tan2\theta$: $\frac{A - C}{B}$ is the cotangent.`,
      ],
      check: [
        { q: r`What angle removes the $xy$ term when $A = C$?`, a: r`$\cot2\theta = 0$, so $\theta = 45^\circ$.` },
        { q: r`Which two quantities stay the same under rotation?`, a: r`$A + C$ and $B^2 - 4AC$.` },
      ],
    },
    {
      name: 'Polar Coordinates',
      inShort: r`Points as a distance and an angle: converting, distances, and the polar forms of conics and roses.`,
      body: [
        r`A polar point $(r, \theta)$ is a distance from the **pole** and an angle from the **polar axis**. Between the two systems:

| Rectangular to polar | Polar to rectangular |
|---|---|
| $r = \sqrt{x^2 + y^2}$, $\tan\theta = \frac yx$ (check the quadrant) | $x = r\cos\theta$, $y = r\sin\theta$ |

To convert an equation, multiply through by $r$ where it helps and replace $r\cos\theta$, $r\sin\theta$ and $r^2$. The distance between two polar points comes from the cosine law, $d^2 = r_1^2 + r_2^2 - 2r_1r_2\cos(\theta_2 - \theta_1)$.

A conic with a focus at the pole is $r = \frac{ed}{1 \pm e\cos\theta}$ (or $\sin\theta$), with $d$ the distance to the directrix:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The curve r equals 6 over 2 minus cos theta drawn in x and y: an ellipse with one focus at the origin, stretching from minus 2 to 6 along the x axis.',
          caption: 'r = 6/(2 − cos θ) = 3/(1 − 0.5 cos θ): an ellipse, e = 0.5, with a focus at the pole (the origin).',
          x: [-2, 6],
          y: [-4, 4],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: loop((t) => { const rr = 6 / (2 - Math.cos(t)); return [rr * Math.cos(t), rr * Math.sin(t)]; }), colour: colourOf(0) }],
          legend: false,
        },
        r`Other polar curves: $r = 2a\cos\theta$ is a circle through the pole; $r = a\cos n\theta$ a rose with $n$ petals ($2n$ when $n$ is even); $r = a(1 + \cos\theta)$ a cardioid. Areas are $\frac12\int r^2\,d\theta$.`,
      ],
      keyIdeas: [
        r`$x = r\cos\theta$, $y = r\sin\theta$, $r^2 = x^2 + y^2$, $\tan\theta = \frac{y}{x}$ (check the quadrant).`,
        r`Distance between polar points: $d^2 = r_1^2 + r_2^2 - 2r_1r_2\cos(\theta_2 - \theta_1)$.`,
        r`Conic with a focus at the pole: $r = \frac{ed}{1 \pm e\cos\theta}$.`,
        r`$r = 2a\cos\theta$ is a circle; $r = a\cos n\theta$ a rose. Area: $\frac12\int r^2\,d\theta$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A point, and a polar conic',
          problem: r`Write $(-2, 2\sqrt3)$ in polar form, and name the curve $r = \frac{6}{2 - \cos\theta}$.`,
          steps: [
            r`$r = \sqrt{4 + 12} = 4$; the point is in QII, so $\theta = 180^\circ - 60^\circ = 120^\circ$.`,
            r`$r = \frac{3}{1 - 0.5\cos\theta}$: $e = 0.5$, an ellipse, with $ed = 3$ so $d = 6$.`,
          ],
          answer: r`$(4, 120^\circ)$; an ellipse.`,
        },
        {
          level: 'board',
          title: 'Converting equations, and a polar distance',
          problem: r`(a) Write $r = 4\sin\theta$ in rectangular form. (b) Write $r^2\sin2\theta = 8$ in rectangular form. (c) How far apart are $(4, 30^\circ)$ and $(6, 120^\circ)$?`,
          steps: [
            r`(a) Multiply by $r$: $r^2 = 4r\sin\theta$, so $x^2 + y^2 - 4y = 0$, a circle of radius 2 centred at $(0, 2)$.`,
            r`(b) $r^2(2\sin\theta\cos\theta) = 2xy = 8$, so $xy = 4$.`,
            r`(c) $d^2 = 16 + 36 - 48\cos90^\circ = 52$, so $d = 7.211$.`,
          ],
          answer: r`(a) $x^2 + y^2 = 4y$; (b) $xy = 4$; (c) about 7.211.`,
        },
      ],
      traps: [
        r`Make the constant in the denominator $1$ before reading $e$.`,
        r`$\tan\theta = \frac yx$ alone can't tell QII from QIV: place the point first.`,
      ],
      check: [
        { q: r`Write $(2, 2)$ in polar form.`, a: r`$(2\sqrt2, 45^\circ)$.` },
        { q: r`What curve is $r = 8\cos\theta$?`, a: r`A circle of radius 4 through the pole, centred at $(4, 0)$.` },
      ],
    },
    {
      name: 'Parametric Equations',
      inShort: r`Curves traced by a parameter: lines, ellipses, the cycloid and the projectile, and their slopes.`,
      body: [
        r`A curve can be traced by a **parameter** $t$: $x = f(t)$, $y = g(t)$. Eliminate $t$ to get the ordinary equation; for $\cos t$ and $\sin t$, use $\cos^2t + \sin^2t = 1$. The slope is the ratio of the two rates, $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$.

A **cycloid** is the path of a point on a rolling wheel, $x = r(t - \sin t)$, $y = r(1 - \cos t)$:`,
        {
          type: 'plot',
          equal: true,
          alt: 'One arch of the cycloid traced by a point on a wheel of radius 1 rolling along the x axis: it rises from the origin to a height of 2 at x equals pi and comes down at x equals 2 pi.',
          caption: 'One arch of a cycloid (r = 1): 2r high, 2πr wide, 8r long, enclosing 3πr².',
          x: [0, 7],
          y: [0, 3],
          xLabel: 'x',
          yLabel: 'y',
          series: [{ points: range(0, 2 * Math.PI, 120).map((t) => [t - Math.sin(t), 1 - Math.cos(t)]), colour: colourOf(0) }],
          legend: false,
        },
        r`| Curve | Parametric form | Eliminated |
|---|---|---|
| line | $x = x_1 + at$, $y = y_1 + bt$ | slope $\frac ba$ |
| ellipse | $x = h + a\cos t$, $y = k + b\sin t$ | $\frac{(x - h)^2}{a^2} + \frac{(y - k)^2}{b^2} = 1$ |
| projectile | $x = v_0t\cos\alpha$, $y = v_0t\sin\alpha - \frac12gt^2$ | a parabola; range $\frac{v_0^2\sin2\alpha}{g}$, height $\frac{v_0^2\sin^2\alpha}{2g}$ |`,
      ],
      keyIdeas: [
        r`Eliminate the parameter to get the curve: for $\cos t$ and $\sin t$, use $\cos^2 t + \sin^2 t = 1$.`,
        r`Slope: $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$.`,
        r`Cycloid $x = r(t - \sin t)$, $y = r(1 - \cos t)$: one arch is $8r$ long and encloses $3\pi r^2$.`,
        r`Projectile: $x = v_0t\cos\alpha$, $y = v_0t\sin\alpha - \frac12gt^2$, a parabola; range $\frac{v_0^2\sin 2\alpha}{g}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An ellipse, and its slope',
          problem: r`Eliminate $t$ from $x = 2 + 3\cos t$, $y = -1 + 2\sin t$, and find the slope at $t = \frac{\pi}{4}$.`,
          steps: [
            r`$\frac{(x - 2)^2}{9} + \frac{(y + 1)^2}{4} = 1$, an ellipse centred at $(2, -1)$.`,
            r`$\frac{dy}{dx} = \frac{2\cos t}{-3\sin t} = -\frac23$ at $t = \frac{\pi}{4}$.`,
          ],
          answer: r`The ellipse; slope $-\frac23$.`,
        },
        {
          level: 'board',
          title: 'A projectile, and a parabola',
          problem: r`(a) A ball leaves the ground at 20 m/s, $30^\circ$ above the horizontal ($g = 9.81$). Find its range, greatest height and time of flight. (b) Eliminate $t$ from $x = t^2$, $y = 2t$.`,
          steps: [
            r`(a) Range $\frac{400\sin60^\circ}{9.81} = 35.31$ m; height $\frac{400(0.25)}{2(9.81)} = 5.097$ m.`,
            r`Time of flight: $\frac{2(20)\sin30^\circ}{9.81} = 2.039$ s.`,
            r`(b) $t = \frac y2$, so $x = \frac{y^2}{4}$: $y^2 = 4x$, a parabola.`,
          ],
          answer: r`(a) 35.31 m, 5.097 m, 2.039 s; (b) $y^2 = 4x$.`,
        },
      ],
      traps: [
        r`$\frac{dy}{dx}$ is the ratio of the two derivatives, not $\frac{d}{dt}$ of $\frac{y}{x}$.`,
        r`The projectile's range uses $\sin2\alpha$: $45^\circ$ gives the longest, not $90^\circ$.`,
      ],
      check: [
        { q: r`Eliminate $t$ from $x = \cos t$, $y = \sin t$.`, a: r`$x^2 + y^2 = 1$.` },
        { q: r`How long is one arch of a cycloid made by a wheel of radius 2?`, a: r`$8r = 16$.` },
      ],
    },
    {
      name: 'Lines and Planes in Space',
      inShort: r`Directions, lines and planes in three dimensions, and the distances and angles between them.`,
      body: [
        r`In space a direction is given by **direction numbers** $(a, b, c)$ or **direction cosines** $\cos\alpha$, $\cos\beta$, $\cos\gamma$, with $\cos^2\alpha + \cos^2\beta + \cos^2\gamma = 1$.

| Object | Equation |
|---|---|
| line through $(x_1, y_1, z_1)$ | $\frac{x - x_1}{a} = \frac{y - y_1}{b} = \frac{z - z_1}{c}$ |
| plane | $Ax + By + Cz + D = 0$, normal $(A, B, C)$; intercept form $\frac xa + \frac yb + \frac zc = 1$ |
| point to plane | $\frac{|Ax_1 + By_1 + Cz_1 + D|}{\sqrt{A^2 + B^2 + C^2}}$ |
| angle between planes | $\cos\theta = \frac{|A_1A_2 + B_1B_2 + C_1C_2|}{\sqrt{A_1^2 + B_1^2 + C_1^2}\sqrt{A_2^2 + B_2^2 + C_2^2}}$ |
| parallel / perpendicular planes | normals proportional / $A_1A_2 + B_1B_2 + C_1C_2 = 0$ |
| sphere | $(x - h)^2 + (y - k)^2 + (z - l)^2 = r^2$ |

The **trace** of a plane is the line where it cuts a coordinate plane. Two other ways to name a point:

| System | From rectangular | To rectangular |
|---|---|---|
| cylindrical $(r, \theta, z)$ | $r = \sqrt{x^2 + y^2}$, $\theta = \tan^{-1}\frac yx$ | $x = r\cos\theta$, $y = r\sin\theta$ |
| spherical $(\rho, \theta, \varphi)$ | $\rho = \sqrt{x^2 + y^2 + z^2}$, $\varphi = \cos^{-1}\frac z\rho$ | $x = \rho\sin\varphi\cos\theta$, $y = \rho\sin\varphi\sin\theta$, $z = \rho\cos\varphi$ |`,
      ],
      keyIdeas: [
        r`Direction cosines: $\cos^2\alpha + \cos^2\beta + \cos^2\gamma = 1$.`,
        r`Line: $\frac{x - x_1}{a} = \frac{y - y_1}{b} = \frac{z - z_1}{c}$. Plane: $Ax + By + Cz + D = 0$, normal $(A, B, C)$.`,
        r`Point to plane: $\frac{|Ax_1 + By_1 + Cz_1 + D|}{\sqrt{A^2 + B^2 + C^2}}$.`,
        r`Angle between planes: the angle between their normals.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A distance and an angle',
          problem: r`Find the distance from $(4, -2, 6)$ to the plane $2x - y + 2z - 3 = 0$, and the angle between the planes $x + y = 0$ and $y + z = 0$.`,
          steps: [
            r`$d = \frac{|8 + 2 + 12 - 3|}{\sqrt{4 + 1 + 4}} = \frac{19}{3} = 6.33$.`,
            r`Normals $(1, 1, 0)$ and $(0, 1, 1)$: $\cos\theta = \frac{1}{\sqrt2\sqrt2} = \frac12$, so $\theta = 60^\circ$.`,
          ],
          answer: r`About 6.33; $60^\circ$.`,
        },
        {
          level: 'board',
          title: 'A sphere, two coordinate systems, and two planes',
          problem: r`(a) Find the centre and radius of $x^2 + y^2 + z^2 - 6x + 4y - 2z - 11 = 0$. (b) Write the cylindrical point $(4, 60^\circ, 3)$ in rectangular form, and $(2, 2, 1)$ in spherical form. (c) Find the acute angle between $2x - y + 2z = 5$ and $x + 2y + 2z = 1$.`,
          steps: [
            r`(a) Centre $(3, -2, 1)$, $r = \sqrt{9 + 4 + 1 + 11} = 5$.`,
            r`(b) $(4\cos60^\circ, 4\sin60^\circ, 3) = (2, 3.464, 3)$. And $\rho = 3$, $\theta = 45^\circ$, $\varphi = \cos^{-1}\frac13 = 70.53^\circ$.`,
            r`(c) $\cos\theta = \frac{|2 - 2 + 4|}{3 \times 3} = \frac49$, so $\theta = 63.61^\circ$.`,
          ],
          answer: r`(a) $(3, -2, 1)$, 5; (b) $(2, 3.464, 3)$ and $(3, 45^\circ, 70.53^\circ)$; (c) $63.61^\circ$.`,
        },
      ],
      traps: [
        r`The coefficients of the plane are its normal, not a direction in the plane.`,
        r`In spherical coordinates $\varphi$ is measured from the $z$ axis, not from the $xy$ plane.`,
      ],
      check: [
        { q: r`What is the $y$ intercept of the plane $5x - 3y + 6z = 30$?`, a: r`$-10$.` },
        { q: r`For what $k$ is $(k + 1)x - y + (2 - k)z = 5$ perpendicular to $2x + 6y - z + 3 = 0$?`, a: r`$2(k + 1) - 6 - (2 - k) = 0$, so $k = 2$.` },
      ],
    },
  ],
};
