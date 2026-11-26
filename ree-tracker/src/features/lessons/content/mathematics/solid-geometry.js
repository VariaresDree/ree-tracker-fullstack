// Library › Lessons › Mathematics › Solid Geometry (2026-11-16; every
// subtopic in the module format 2026-11-27, with figures, examples a step at a
// time and checks; every number re-worked by solidGeometryLesson.test.js.
// Coverage cross-checked against the solids part of a review center's
// geometry and complex numbers handout; the text, problems and figures are
// this app's own): written for the Philippine REE board, subtopic by subtopic
// in the syllabus's order. Shapes drawings (`figure: …`) come from Units and
// tools › Shapes (features/conversion/shapes/ShapeFigure.jsx).
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Total surface area (cm²) of a closed 1-litre can against its radius (cm).
export const CAN = 1000;
export const canArea = (rad) => 2 * Math.PI * rad * rad + (2 * CAN) / rad;

export default {
  topic: 'Solid Geometry',
  subject: 'Mathematics',
  overview: r`Solid geometry measures three-dimensional figures: their volume, their surface area and the lengths inside them. Two ideas carry most of it. A solid with a constant cross-section has volume base times height; one that tapers to a point has a third of that. Almost every other formula is a right triangle inside the solid, a sum or difference of simpler solids, or a theorem of Pappus. On the board, note whether the question asks for the lateral or the total area, and whether a height is perpendicular or slant.`,
  sources: [
    'Kiselev’s Geometry, Book II: Stereometry',
    'CRC Standard Mathematical Tables and Formulas',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Polyhedrons',
      inShort: r`Solids bounded by flat polygons: how their faces, edges and vertices are counted, and the five regular (Platonic) solids.`,
      body: [
        r`A **polyhedron** is a solid bounded by flat polygons, its **faces**; they meet in **edges**, which meet at **vertices**. For every convex polyhedron, **Euler's formula** holds: $V - E + F = 2$. Since each edge borders exactly two faces, the edges can be counted from the faces: $E = \frac{\text{(sum of the sides of all faces)}}{2}$.

A **regular** polyhedron has identical regular faces with the same number meeting at each vertex. There are exactly five:

| Solid | Faces | $V$ | $E$ | $F$ | Volume, edge $a$ |
|---|---|---|---|---|---|
| tetrahedron | triangles | 4 | 6 | 4 | $\frac{a^3}{6\sqrt2}$ |
| cube (hexahedron) | squares | 8 | 12 | 6 | $a^3$ |
| octahedron | triangles | 6 | 12 | 8 | $\frac{\sqrt2}{3}a^3$ |
| dodecahedron | pentagons | 20 | 30 | 12 | $\frac{15 + 7\sqrt5}{4}a^3$ |
| icosahedron | triangles | 12 | 30 | 20 | $\frac{5(3 + \sqrt5)}{12}a^3$ |`,
        { figure: 'dodecahedron', caption: 'The dodecahedron: 12 regular pentagons, three at each vertex.' },
        { figure: 'icosahedron', caption: 'The icosahedron: 20 equilateral triangles, five at each vertex.' },
      ],
      keyIdeas: [
        r`Euler: $V - E + F = 2$ for every convex polyhedron.`,
        r`Edges from faces: $E = \frac{(\text{sides per face})\,F}{2}$, since each edge borders two faces.`,
        r`Five regular solids: tetrahedron (4 triangles), cube (6 squares), octahedron (8 triangles), dodecahedron (12 pentagons), icosahedron (20 triangles).`,
        r`Regular tetrahedron: $V = \frac{a^3}{6\sqrt2}$; octahedron: $V = \frac{\sqrt2}{3}a^3$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Counting from the faces',
          problem: r`A polyhedron has $12$ faces, all pentagons. How many edges and vertices has it?`,
          steps: [
            r`$E = \frac{12 \times 5}{2} = 30$.`,
            r`$V = 2 - F + E = 2 - 12 + 30 = 20$: it is the dodecahedron.`,
          ],
          answer: r`30 edges, 20 vertices.`,
        },
        {
          level: 'board',
          title: 'Mixed faces, and a tetrahedron',
          problem: r`(a) A polyhedron has 8 triangular and 6 square faces. Find its edges and vertices. (b) A regular tetrahedron has 6 cm edges. Find its volume and total area.`,
          steps: [
            r`(a) $F = 14$; $E = \frac{8(3) + 6(4)}{2} = 24$; $V = 2 - 14 + 24 = 12$.`,
            r`(b) $V = \frac{6^3}{6\sqrt2} = 25.46$ cm³.`,
            r`Four equilateral faces: $4 \times \frac{\sqrt3}{4}(36) = 36\sqrt3 = 62.35$ cm².`,
          ],
          answer: r`(a) 24 edges, 12 vertices; (b) 25.46 cm³ and 62.35 cm².`,
        },
      ],
      traps: [
        r`Counting $12 \times 5 = 60$ edges counts each one twice.`,
        r`Euler's formula is for convex polyhedra (and any without holes); a solid with a tunnel through it breaks it.`,
      ],
      check: [
        { q: r`Check Euler's formula on a cube.`, a: r`$8 - 12 + 6 = 2$.` },
        { q: r`Which regular solids have triangular faces?`, a: r`The tetrahedron, the octahedron and the icosahedron.` },
      ],
    },
    {
      name: 'Prisms',
      inShort: r`Two equal parallel bases joined by parallelogram faces: volume, lateral and total area, and the box and cube.`,
      body: [
        r`A **prism** has two equal, parallel polygon bases joined by parallelograms. Its cross-section is the same all the way up, so its volume is the base times the perpendicular height:`,
        { figure: 'prism', caption: 'A prism: two equal parallel bases, height h measured at right angles to them.' },
        r`| Quantity | Any prism | Box $a \times b \times c$ | Cube, edge $a$ |
|---|---|---|---|
| volume | $A_bh = A_kL$ | $abc$ | $a^3$ |
| lateral area | $P_kL$ | $2c(a + b)$ | $4a^2$ |
| total area | lateral $+ 2A_b$ | $2(ab + bc + ca)$ | $6a^2$ |
| space diagonal | | $\sqrt{a^2 + b^2 + c^2}$ | $a\sqrt3$ |

For an **oblique** prism, $A_k$ and $P_k$ are the area and perimeter of a **right section** (a cut at right angles to the lateral edges) and $L$ is a lateral edge. A **truncated** triangular prism (cut by a slanted plane) has $V = A_k\frac{L_1 + L_2 + L_3}{3}$.`,
      ],
      keyIdeas: [
        r`$V = A_b h$, with $h$ perpendicular; for an oblique prism also $V = A_k L$ (right section times lateral edge).`,
        r`Lateral area $= $ perimeter of a right section $\times$ lateral edge; total adds the two bases.`,
        r`Box: $V = abc$, $d = \sqrt{a^2 + b^2 + c^2}$. Cube: $V = a^3$, $A = 6a^2$, $d = a\sqrt3$.`,
        r`Truncated triangular prism: $V = A_k \cdot \frac{L_1 + L_2 + L_3}{3}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A hexagonal prism',
          problem: r`A right prism $10$ cm high has a regular hexagonal base of side $2$ cm. Find its volume and lateral area.`,
          steps: [
            r`Base $= \frac{3\sqrt3}{2}(2)^2 = 6\sqrt3 = 10.39$ cm², so $V = 103.9$ cm³.`,
            r`Lateral $= 6(2)(10) = 120$ cm².`,
          ],
          answer: r`About 103.9 cm³; 120 cm².`,
        },
        {
          level: 'board',
          title: 'A box, and an oblique prism',
          problem: r`(a) A box is 3 by 4 by 12 cm. Find its space diagonal, volume and total area. (b) An oblique prism has a right section of area 20 cm² and perimeter 18 cm, and lateral edges of 15 cm. Find its volume and lateral area.`,
          steps: [
            r`(a) $d = \sqrt{9 + 16 + 144} = 13$ cm; $V = 144$ cm³; $A = 2(12 + 48 + 36) = 192$ cm².`,
            r`(b) $V = A_kL = 20 \times 15 = 300$ cm³; lateral $= P_kL = 18 \times 15 = 270$ cm².`,
          ],
          answer: r`(a) 13 cm, 144 cm³, 192 cm²; (b) 300 cm³, 270 cm².`,
        },
      ],
      traps: [
        r`Lateral area leaves out the bases; total area adds both of them.`,
        r`For an oblique prism the lateral edge is longer than the height: use the right section with the edge, or the base with the height.`,
      ],
      check: [
        { q: r`A cube's space diagonal is $5\sqrt3$. What is its volume?`, a: r`Edge 5, volume 125.` },
        { q: r`A prism 10 high has a 3-4-5 right-triangle base. What is its volume?`, a: r`$6 \times 10 = 60$.` },
      ],
    },
    {
      name: 'Pyramids',
      inShort: r`A base and a point (the apex) joined by triangles: a third of the prism, and the right triangles inside it.`,
      body: [
        r`A **pyramid** joins a polygon base to one point, the **apex**. It holds exactly a third of the prism on the same base and height: $V = \frac13A_bh$.`,
        { figure: 'pyramid', caption: 'A square pyramid: base side a, height h from the apex straight down to the base.' },
        r`Three right triangles inside a **regular** pyramid (regular base, apex over its centre) connect its lengths:

| Right triangle | Relation |
|---|---|
| height, base apothem $a$, slant height $L$ | $L^2 = h^2 + a^2$ |
| height, base circumradius $R$, lateral edge $e$ | $e^2 = h^2 + R^2$ |
| slant height, half a base edge, lateral edge | $e^2 = L^2 + \left(\frac s2\right)^2$ |

Its lateral area is a ring of equal triangles: $\frac12PL$.`,
      ],
      keyIdeas: [
        r`$V = \frac13 A_b h$.`,
        r`Regular pyramid: lateral area $= \frac12 P L$, with $L$ the slant height of a face.`,
        r`Slant height $L = \sqrt{h^2 + a^2}$ (base apothem $a$); lateral edge $e = \sqrt{h^2 + R^2}$ (base circumradius $R$).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Slant height, area, volume',
          problem: r`A pyramid has a square base of side $6$ cm and a height of $4$ cm. Find its slant height, lateral area and volume.`,
          steps: [
            r`The base apothem is $3$, so $L = \sqrt{4^2 + 3^2} = 5$ cm.`,
            r`Lateral $= \frac12(24)(5) = 60$ cm². $V = \frac13(36)(4) = 48$ cm³.`,
          ],
          answer: r`5 cm; 60 cm²; 48 cm³.`,
        },
        {
          level: 'board',
          title: 'From the lateral edge',
          problem: r`A regular square pyramid has base edges of 14 cm and lateral edges of 25 cm. Find its lateral area and volume.`,
          steps: [
            r`Slant height: $L = \sqrt{25^2 - 7^2} = 24$ cm, so lateral $= \frac12(56)(24) = 672$ cm².`,
            r`Height: $R = 7\sqrt2$, so $h = \sqrt{625 - 98} = \sqrt{527} = 22.96$ cm.`,
            r`$V = \frac13(196)(22.96) = 1499.8$ cm³.`,
          ],
          answer: r`672 cm²; about 1499.8 cm³.`,
        },
      ],
      traps: [
        r`The slant height (to the middle of a base edge) and the lateral edge (to a corner) are different lengths.`,
        r`Volume needs the perpendicular height, not the slant height.`,
      ],
      check: [
        { q: r`A pyramid and a prism share a base and a height. What is the ratio of their volumes?`, a: r`$1 : 3$.` },
        { q: r`A square pyramid has base edge 8 and height 3. What is its slant height?`, a: r`$\sqrt{9 + 16} = 5$.` },
      ],
    },
    {
      name: 'Frustums',
      inShort: r`What is left of a cone or pyramid after a cut parallel to its base: volume, slant height and lateral area.`,
      body: [
        r`Cut a cone or pyramid parallel to its base and remove the top: what is left is a **frustum**, with two parallel bases of areas $A_1$ and $A_2$ and height $h$.`,
        { figure: 'cone-frustum', caption: 'A frustum of a cone: base radii R and r, height h, slant height ℓ (L in the table below).' },
        { figure: 'pyramid-frustum', caption: 'A frustum of a square pyramid: bases A1 and A2, height h.' },
        r`| Frustum | Volume | Lateral area |
|---|---|---|
| any | $\frac h3\left(A_1 + A_2 + \sqrt{A_1A_2}\right)$ | |
| cone | $\frac{\pi h}{3}(R^2 + Rr + r^2)$ | $\pi(R + r)L$, $L = \sqrt{h^2 + (R - r)^2}$ |
| regular pyramid | as for any | $\frac12(P_1 + P_2)L$ |

It is also the whole cone (or pyramid) minus the small one cut off; the two are similar.`,
      ],
      keyIdeas: [
        r`Any frustum: $V = \frac{h}{3}\left(A_1 + A_2 + \sqrt{A_1 A_2}\right)$.`,
        r`Cone frustum: $V = \frac{\pi h}{3}(R^2 + Rr + r^2)$, lateral $\pi(R + r)L$, with $L = \sqrt{h^2 + (R-r)^2}$.`,
        r`Pyramid frustum: lateral $= \frac12(P_1 + P_2)L$, a sum of trapezoids.`,
        r`Or: the whole cone minus the small cone cut off.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A cone frustum',
          problem: r`A frustum of a cone has base radii $4$ cm and $2$ cm and a height of $6$ cm. Find its volume.`,
          steps: [r`$V = \frac{\pi(6)}{3}(16 + 8 + 4) = 56\pi = 175.9$ cm³.`],
          answer: r`About 175.9 cm³.`,
        },
        {
          level: 'board',
          title: 'A pyramid frustum, and a bucket',
          problem: r`(a) A frustum of a square pyramid has bases 6 by 6 and 3 by 3 cm and a height of 4 cm. Find its volume and lateral area. (b) A bucket is a cone frustum with radii 15 cm (top) and 10 cm (bottom), 30 cm deep. How many litres does it hold?`,
          steps: [
            r`(a) $V = \frac43(36 + 9 + \sqrt{324}) = 84$ cm³.`,
            r`Slant: the apothems differ by $3 - 1.5 = 1.5$, so $L = \sqrt{16 + 2.25} = 4.272$ cm; lateral $= \frac12(24 + 12)(4.272) = 76.90$ cm².`,
            r`(b) $V = \frac{\pi(30)}{3}(225 + 150 + 100) = 4750\pi = 14\,922.6$ cm³, about 14.92 L.`,
          ],
          answer: r`(a) 84 cm³, 76.90 cm²; (b) about 14.92 L.`,
        },
      ],
      traps: [
        r`It is not the average of the two base areas times the height; that overestimates.`,
        r`The slant height of a pyramid frustum uses the difference of the base apothems, not of the sides.`,
      ],
      check: [
        { q: r`A cone frustum has radii 3 and 6 and height 4. What is its lateral area?`, a: r`$L = 5$, so $\pi(9)(5) = 45\pi$.` },
        { q: r`What does the frustum formula give when $A_1 = A_2$?`, a: r`$\frac h3(3A) = Ah$: a prism.` },
      ],
    },
    {
      name: 'Cylinders',
      inShort: r`Circular bases joined by a curved surface: volume, areas, pipes, and slanted cylinders.`,
      body: [
        r`A **cylinder** is a prism with circular bases: $V = \pi r^2h$. Unrolled, its curved side is a rectangle $2\pi r$ by $h$, so the lateral area is $2\pi rh$ and the total $2\pi r(r + h)$.`,
        { figure: 'cylinder', caption: 'A right circular cylinder: radius r, height h.' },
        r`A **pipe** is the difference of two cylinders, $\pi(R^2 - r^2)h$. An **oblique** cylinder has the volume of the right one with the same base and perpendicular height (Cavalieri's principle). A horizontal tank filled to depth $d$ holds a circular segment times its length.

For a fixed volume the can with the least metal has its height equal to its diameter. For a 1-litre can:`,
        {
          type: 'plot',
          alt: 'Total surface area of a closed 1 litre can against its radius from 2 to 12 centimetres. It falls steeply, reaches a minimum of about 554 square centimetres at a radius of about 5.4, and rises again.',
          caption: 'A closed 1 L can: the area is least, about 554 cm², at r ≈ 5.42 cm, where the height equals the diameter.',
          x: [2, 12],
          y: [0, 1400],
          xLabel: 'radius, cm',
          yLabel: 'area, cm²',
          series: [{ f: canArea, colour: colourOf(0) }],
          marks: [{ x: Math.cbrt(CAN / (2 * Math.PI)), label: 'h = 2r' }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$V = \pi r^2 h$; lateral $2\pi r h$; total $2\pi r(r + h)$.`,
        r`Pipe or tube: $V = \pi(R^2 - r^2)h$.`,
        r`Oblique cylinder: base area times perpendicular height (Cavalieri).`,
        r`Unrolled, the lateral surface is a rectangle $2\pi r$ by $h$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A pipe',
          problem: r`A pipe $2$ m long has an outside diameter of $10$ cm and a wall $1$ cm thick. Find the volume of material.`,
          steps: [
            r`$R = 5$ cm and $r = 4$ cm; the length is 200 cm.`,
            r`$V = \pi(25 - 16)(200) = 1800\pi = 5655$ cm³.`,
          ],
          answer: r`About 5655 cm³.`,
        },
        {
          level: 'board',
          title: 'The best can, and a lying tank',
          problem: r`(a) Find the dimensions of a closed 1-litre can with the least surface area. (b) A cylindrical tank 2 m in diameter and 3 m long lies on its side, filled to a depth of 0.5 m. How many litres does it hold?`,
          steps: [
            r`(a) Least area at $h = 2r$: $\pi r^2(2r) = 1000$, so $r = \sqrt[3]{\frac{1000}{2\pi}} = 5.42$ cm and $h = 10.84$ cm, with area $553.6$ cm².`,
            r`(b) The liquid's end is a segment of a circle of radius 1 m, $0.5$ m deep: $\cos\frac{\theta}{2} = \frac{1 - 0.5}{1}$, so $\theta = 120^\circ = 2.0944$ rad.`,
            r`Segment $= \frac12(1)^2(2.0944 - \sin 120^\circ) = 0.6142$ m²; times 3 m: $1.8426$ m³, about 1842.6 L.`,
          ],
          answer: r`(a) $r = 5.42$ cm, $h = 10.84$ cm; (b) about 1842.6 L.`,
        },
      ],
      traps: [
        r`Diameters are often given: halve them, and keep the length in the same unit as the radii.`,
        r`A lying tank filled to half its depth is half full, but to a quarter of its depth it is far less than a quarter full.`,
      ],
      check: [
        { q: r`What is the lateral area of a cylinder with radius 3 and height 10?`, a: r`$2\pi(3)(10) = 60\pi$.` },
        { q: r`By what factor must the radius grow to double a cylinder's volume at the same height?`, a: r`$\sqrt2$.` },
      ],
    },
    {
      name: 'Cones',
      inShort: r`A circle and a point joined by a curved surface: volume, slant height, areas, and the sector a cone unrolls into.`,
      body: [
        r`A **cone** is a pyramid with a circular base: $V = \frac13\pi r^2h$. Its **slant height** $s = \sqrt{r^2 + h^2}$ runs from the apex down the side.`,
        { figure: 'cone', caption: 'A right circular cone: radius r, height h, slant height ℓ (s in the formulas).' },
        r`Unrolled, the curved side is a **sector** of radius $s$ whose arc is the base's circumference, $2\pi r$. So the lateral area is $\pi rs$, the total $\pi r(r + s)$, and the sector's angle is $\theta = \frac{360^\circ r}{s}$. Run backwards, a sector of radius $s$ and angle $\theta$ rolls into a cone of base radius $r = \frac{s\theta}{360^\circ}$.`,
      ],
      keyIdeas: [
        r`$V = \frac13\pi r^2 h$; slant height $s = \sqrt{r^2 + h^2}$.`,
        r`Lateral $\pi r s$; total $\pi r(r + s)$.`,
        r`Unrolled: a sector of radius $s$ and angle $\theta = \frac{360^\circ r}{s}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Lateral area and the sector',
          problem: r`A cone has a base radius of $3$ cm and a height of $4$ cm. Find its lateral area and the angle of the sector it unrolls into.`,
          steps: [
            r`$s = \sqrt{9 + 16} = 5$ cm. Lateral $= \pi(3)(5) = 15\pi = 47.12$ cm².`,
            r`$\theta = \frac{360(3)}{5} = 216^\circ$.`,
          ],
          answer: r`About 47.12 cm²; $216^\circ$.`,
        },
        {
          level: 'board',
          title: 'A cone from a sector; a height from a volume',
          problem: r`(a) A $240^\circ$ sector of radius 9 cm is rolled into a cone. Find the cone's volume. (b) A cone's base has a circumference of $10\pi$ cm and its volume is $100\pi$ cm³. Find its height.`,
          steps: [
            r`(a) Arc $= 9 \times \frac{240\pi}{180} = 12\pi$, so the base radius is 6 cm and the slant height 9 cm.`,
            r`$h = \sqrt{81 - 36} = \sqrt{45} = 6.708$ cm; $V = \frac13\pi(36)(6.708) = 252.89$ cm³.`,
            r`(b) $r = 5$; $\frac13\pi(25)h = 100\pi$, so $h = 12$ cm.`,
          ],
          answer: r`(a) about 252.89 cm³; (b) 12 cm.`,
        },
      ],
      traps: [
        r`Volume uses the perpendicular height $h$; area uses the slant height $s$.`,
        r`The sector's radius becomes the slant height, not the base radius.`,
      ],
      check: [
        { q: r`What is the total area of a cone with radius 6 and height 8?`, a: r`$s = 10$, so $\pi(6)(16) = 96\pi$.` },
        { q: r`Doubling a cone's radius at the same height does what to its volume?`, a: r`Multiplies it by 4.` },
      ],
    },
    {
      name: 'Spheres',
      inShort: r`Volume and area of a sphere, and of its halves, shells, lunes and wedges.`,
      body: [
        r`$V = \frac43\pi r^3 = \frac{\pi d^3}{6}$ and $A = 4\pi r^2 = \pi d^2$, the curved area of the cylinder that just holds it (Archimedes).`,
        { figure: 'sphere', caption: 'A sphere of radius r.' },
        r`Two planes through a diameter cut out a **lune** on the surface and a **wedge** of the solid, each the fraction $\frac{\theta}{360^\circ}$ of the whole:`,
        { figure: 'lune', caption: 'A lune: the part of the surface between two great semicircles at angle θ.' },
        r`| Piece | Area or volume ($\theta$ in degrees) |
|---|---|
| hemisphere | $V = \frac23\pi r^3$; curved area $2\pi r^2$, total $3\pi r^2$ |
| shell, radii $R$ and $r$ | $\frac43\pi(R^3 - r^3)$ |
| lune | $\frac{\pi r^2\theta}{90^\circ}$ |
| wedge | $\frac{\pi r^3\theta}{270^\circ}$ |`,
      ],
      keyIdeas: [
        r`$V = \frac43\pi r^3 = \frac{\pi d^3}{6}$ and $A = 4\pi r^2 = \pi d^2$.`,
        r`Hemisphere: $V = \frac23\pi r^3$, total area $3\pi r^2$ with its flat face.`,
        r`Shell: $\frac43\pi(R^3 - r^3)$.`,
        r`Lune and wedge of angle $\theta$: their share $\frac{\theta}{360^\circ}$ of the sphere's area and volume.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Volume from area',
          problem: r`A sphere has a surface area of $36\pi$ m². Find its volume.`,
          steps: [
            r`$4\pi r^2 = 36\pi$ gives $r = 3$ m.`,
            r`$V = \frac43\pi(27) = 36\pi = 113.1$ m³.`,
          ],
          answer: r`About 113.1 m³.`,
        },
        {
          level: 'board',
          title: 'Packed balls, a lune and a wedge',
          problem: r`(a) Balls 2 cm across are packed three to a row, three rows, three layers, in a 6 cm cubic box. How much space is left? (b) On a sphere of radius 6 cm, find the area of a $50^\circ$ lune and the volume of a $50^\circ$ wedge.`,
          steps: [
            r`(a) 27 balls of $\frac43\pi(1)^3$: $36\pi = 113.10$ cm³. Left: $216 - 113.10 = 102.90$ cm³.`,
            r`(b) Lune: $\frac{\pi(36)(50)}{90} = 20\pi = 62.83$ cm².`,
            r`Wedge: $\frac{\pi(216)(50)}{270} = 40\pi = 125.66$ cm³.`,
          ],
          answer: r`(a) about 102.90 cm³; (b) 62.83 cm² and 125.66 cm³.`,
        },
      ],
      traps: [
        r`A shell is $R^3 - r^3$, not $(R - r)^3$.`,
        r`A hemisphere's total area includes its flat circle: $3\pi r^2$, not $2\pi r^2$.`,
      ],
      check: [
        { q: r`Doubling a sphere's radius multiplies its volume by what?`, a: r`$2^3 = 8$.` },
        { q: r`What is the total area of a hemisphere of radius 3?`, a: r`$3\pi(9) = 27\pi$.` },
      ],
    },
    {
      name: 'Spherical Segments and Sectors',
      inShort: r`Slices and cone-tipped pieces of a sphere, and the curved bands (zones) that bound them.`,
      body: [
        r`Planes cutting a sphere make three kinds of piece:`,
        { figure: 'spherical-segment', caption: 'A spherical segment (cap): the slice above a plane, of height h and base radius a.' },
        { figure: 'spherical-sector', caption: 'A spherical sector: a cap together with the cone from its base to the centre.' },
        { figure: 'zone', caption: 'A zone: the curved band of the surface between two parallel planes h apart.' },
        r`| Piece | Volume | Surface |
|---|---|---|
| zone or cap surface | | $2\pi rh$, whatever the slice's position |
| segment, one base | $\frac{\pi h^2}{3}(3r - h) = \frac{\pi h}{6}(3a^2 + h^2)$ | zone $+ \pi a^2$ |
| segment, two bases | $\frac{\pi h}{6}(3a^2 + 3b^2 + h^2)$ | zone $+ \pi a^2 + \pi b^2$ |
| sector (spherical cone) | $\frac23\pi r^2h$ | zone $+$ the cone's lateral area $\pi ar$ |

The zone's area depends only on its height: slices of equal thickness have equal curved areas, which is why a cap of height $2r$ gives the whole $4\pi r^2$.`,
      ],
      keyIdeas: [
        r`Zone or cap area: $2\pi r h$; it depends only on the height.`,
        r`Cap: $V = \frac{\pi h^2}{3}(3r - h) = \frac{\pi h}{6}(3a^2 + h^2)$.`,
        r`Two bases: $V = \frac{\pi h}{6}(3a^2 + 3b^2 + h^2)$.`,
        r`Sector: $V = \frac23\pi r^2 h$, the cap plus the cone to the centre.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A cap',
          problem: r`A sphere of radius $5$ cm has a cap $2$ cm high. Find the cap's volume and curved area.`,
          steps: [
            r`$V = \frac{\pi(2)^2}{3}(15 - 2) = \frac{52\pi}{3} = 54.45$ cm³.`,
            r`Area $= 2\pi(5)(2) = 20\pi = 62.83$ cm².`,
          ],
          answer: r`About 54.45 cm³ and 62.83 cm².`,
        },
        {
          level: 'board',
          title: 'A spherical tank, and a spherical sector',
          problem: r`(a) A spherical tank of radius 2 m is filled to a depth of 1.5 m. What volume does it hold, and what fraction is that? (b) A spherical sector is cut from a sphere of radius 10 cm, with a cap 4 cm high. Find its volume and total surface.`,
          steps: [
            r`(a) $V = \frac{\pi(1.5)^2}{3}(6 - 1.5) = 3.375\pi = 10.60$ m³, of $\frac{32\pi}{3} = 33.51$ m³: about 31.6%.`,
            r`(b) $V = \frac23\pi(100)(4) = 837.76$ cm³.`,
            r`Zone: $2\pi(10)(4) = 80\pi$. The cap's base radius is $\sqrt{100 - 6^2} = 8$, and the cone's slant is the radius 10: lateral $\pi(8)(10) = 80\pi$. Total $160\pi = 502.65$ cm².`,
          ],
          answer: r`(a) about 10.60 m³, 31.6%; (b) 837.76 cm³ and 502.65 cm².`,
        },
      ],
      traps: [
        r`In the cap formula $r$ is the sphere's radius and $a$ the cap's base radius; don't swap them.`,
        r`A tank half as deep is not half full: a sphere is widest at the middle.`,
      ],
      check: [
        { q: r`What is the area of a zone 3 cm high on a sphere of radius 10 cm?`, a: r`$2\pi(10)(3) = 60\pi$ cm².` },
        { q: r`What is a spherical sector made of?`, a: r`A cap and the cone from the cap's base to the sphere's centre.` },
      ],
    },
    {
      name: 'Prismatoids',
      inShort: r`Solids with two parallel end faces and any sides between: one formula covers prisms, pyramids, frustums, wedges and more.`,
      body: [
        r`A **prismatoid** has two parallel end faces (one may shrink to an edge or a point) joined by triangles and trapezoids:`,
        { figure: 'prismatoid', caption: 'A prismatoid: two parallel rectangular ends, height h apart; the section halfway up gives Am.' },
        r`The **prismoidal formula** gives its volume from three sections:
$$V = \frac h6\left(A_1 + 4A_m + A_2\right),$$
with $A_m$ the section at mid-height, built from the average of each pair of matching end lengths (not the average of the end areas). It is exact for prisms, pyramids, frustums, wedges, and any solid whose cross-section area is a quadratic in the height; for a sphere ($A_1 = A_2 = 0$, $A_m = \pi r^2$, $h = 2r$) it gives $\frac43\pi r^3$. Earthwork volumes between surveyed sections use it.

A **wedge** with a rectangular base $a \times b$ and a top edge $c$ parallel to $a$ has $V = \frac{bh}{6}(2a + c)$.`,
      ],
      keyIdeas: [
        r`Prismoidal formula: $V = \frac{h}{6}(A_1 + 4A_m + A_2)$.`,
        r`$A_m$ is the section at mid-height: build it from the average of each end length.`,
        r`Wedge (rectangular base $a \times b$, top edge $c$ parallel to $a$): $V = \frac{bh}{6}(2a + c)$.`,
        r`The formula is exact for any solid whose cross-section area is a quadratic in the height, including spheres.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A frustum by the prismoidal formula',
          problem: r`A frustum of a square pyramid has bases $4 \times 4$ and $2 \times 2$ cm and a height of $3$ cm. Find its volume with the prismoidal formula.`,
          steps: [
            r`The mid-section is $3 \times 3$, so $A_m = 9$.`,
            r`$V = \frac{3}{6}(16 + 36 + 4) = 28$ cm³. Check: $\frac33(16 + 4 + \sqrt{64}) = 28$.`,
          ],
          answer: r`28 cm³.`,
        },
        {
          level: 'board',
          title: 'A wedge, both ways',
          problem: r`A wedge has a 6 by 4 m rectangular base, a top edge 3 m long parallel to the 6 m side, and a height of 5 m. Find its volume by the wedge formula and by the prismoidal formula.`,
          steps: [
            r`Wedge formula: $V = \frac{4(5)}{6}(2 \times 6 + 3) = 50$ m³.`,
            r`Prismoidal: $A_1 = 24$, $A_2 = 0$ (an edge); the mid-section is $\frac{6 + 3}{2} = 4.5$ by $\frac{4 + 0}{2} = 2$, so $A_m = 9$.`,
            r`$V = \frac56(24 + 36 + 0) = 50$ m³.`,
          ],
          answer: r`50 m³ both ways.`,
        },
      ],
      traps: [
        r`$A_m$ is not $\frac{16 + 4}{2} = 10$: with it the formula gives $\frac36(16 + 40 + 4) = 30$, not $28$.`,
        r`An end that shrinks to an edge has zero area, but its length still enters the mid-section.`,
      ],
      check: [
        { q: r`Ends 6 by 6 and 2 by 2: what is the mid-section's area?`, a: r`$4 \times 4 = 16$.` },
        { q: r`What does the prismoidal formula give for a prism?`, a: r`$\frac h6(A + 4A + A) = Ah$.` },
      ],
    },
    {
      name: 'Solids of Revolution',
      inShort: r`Solids made by turning a figure about an axis, measured by the theorems of Pappus.`,
      body: [
        r`Turning a flat figure about an axis in its plane makes a **solid of revolution**: a rectangle gives a cylinder, a right triangle a cone, a semicircle a sphere, a circle off the axis a **torus**. The **theorems of Pappus** measure them all by the distance $\bar r$ the centroid travels round:
$$A = 2\pi\bar rL \quad (\text{a curve of length } L), \qquad V = 2\pi\bar rA \quad (\text{an area } A).$$`,
        { figure: 'torus', caption: 'A torus: a circle of radius r turned about an axis R from its centre.' },
        { figure: 'ellipsoid', caption: 'An ellipsoid with semi-axes a, b and c.' },
        r`| Solid | Volume | Surface |
|---|---|---|
| torus | $2\pi^2Rr^2$ | $4\pi^2Rr$ |
| ellipsoid | $\frac43\pi abc$ | (no simple formula) |
| paraboloid, radius $r$, height $h$ | $\frac12\pi r^2h$, half its cylinder | |

Calculus 2 finds the same volumes by discs, washers and shells.`,
      ],
      keyIdeas: [
        r`Pappus: surface $A = 2\pi\bar{r}L$ (a curve of length $L$), volume $V = 2\pi\bar{r}A$ (an area $A$), with $\bar{r}$ the centroid's distance to the axis.`,
        r`Torus: $V = 2\pi^2 R r^2$, $A = 4\pi^2 R r$.`,
        r`Ellipsoid $\frac43\pi abc$; paraboloid $\frac12\pi r^2 h$, half its cylinder.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A torus by Pappus',
          problem: r`A circle of radius $3$ cm, whose centre is $6$ cm from an axis, turns about it. Find the volume and surface area of the torus.`,
          steps: [
            r`$V = 2\pi(6)(9\pi) = 108\pi^2 = 1066$ cm³.`,
            r`$A = 2\pi(6)(6\pi) = 72\pi^2 = 710.6$ cm².`,
          ],
          answer: r`About 1066 cm³ and 710.6 cm².`,
        },
        {
          level: 'board',
          title: 'A cone by Pappus, and an ellipsoid',
          problem: r`(a) A right triangle with legs 3 cm (on the axis) and 4 cm turns about the 3 cm leg. Find the volume by Pappus and check it as a cone. (b) Find the volume of an ellipsoid with semi-axes 5, 4 and 3 cm.`,
          steps: [
            r`(a) Area 6 cm²; its centroid is a third of 4 from the axis, $\frac43$ cm. $V = 2\pi\left(\frac43\right)(6) = 16\pi = 50.27$ cm³.`,
            r`As a cone of radius 4 and height 3: $\frac13\pi(16)(3) = 16\pi$.`,
            r`(b) $\frac43\pi(5)(4)(3) = 80\pi = 251.33$ cm³.`,
          ],
          answer: r`(a) $16\pi \approx 50.27$ cm³; (b) about 251.33 cm³.`,
        },
      ],
      traps: [
        r`$\bar{r}$ is measured to the axis of revolution, not to the origin.`,
        r`Pappus needs a figure entirely on one side of the axis.`,
      ],
      check: [
        { q: r`A paraboloid has radius 4 and height 6. What is its volume?`, a: r`$\frac12\pi(16)(6) = 48\pi$.` },
        { q: r`A torus has $R = 10$ and $r = 2$. What is its volume?`, a: r`$2\pi^2(10)(4) = 80\pi^2 \approx 789.6$.` },
      ],
    },
    {
      name: 'Similar Solids',
      inShort: r`Solids of the same shape: lengths scale by $k$, areas by $k^2$, volumes by $k^3$.`,
      body: [
        r`Similar solids have the same shape, every matching length in one ratio $k$. Then
$$\frac{L_1}{L_2} = k, \qquad \frac{A_1}{A_2} = k^2, \qquad \frac{V_1}{V_2} = k^3,$$
and, eliminating $k$, $\left(\frac{A_1}{A_2}\right)^3 = \left(\frac{V_1}{V_2}\right)^2$. Volume grows much faster than length:`,
        {
          type: 'plot',
          alt: 'Ratios against the scale factor k from 0 to 3: the length ratio k is a straight line, the area ratio k squared reaches 9, and the volume ratio k cubed rises steepest, to 27.',
          caption: 'Scaling by k: lengths by k, areas by k², volumes by k³. At k = 2, a solid holds 8 times as much.',
          x: [0, 3],
          y: [0, 30],
          xLabel: 'scale factor k',
          yLabel: 'ratio',
          series: [
            { f: (k) => k ** 3, label: 'volume k³', colour: colourOf(0) },
            { f: (k) => k ** 2, label: 'area k²', dashed: true, colour: colourOf(1) },
            { f: (k) => k, label: 'length k', colour: colourOf(2) },
          ],
        },
        r`A plane parallel to the base of a cone or pyramid cuts off a top similar to the whole; to cut off half the volume, cut at $\frac{h}{\sqrt[3]2} \approx 0.794h$ from the apex.`,
      ],
      keyIdeas: [
        r`$\frac{L_1}{L_2} = k$, $\frac{A_1}{A_2} = k^2$, $\frac{V_1}{V_2} = k^3$.`,
        r`The top cut off a cone or pyramid by a plane parallel to its base is similar to the whole.`,
        r`To cut off half the volume, cut at $\frac{h}{\sqrt[3]{2}} \approx 0.794h$ from the apex.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two cones',
          problem: r`Two similar cones have heights of $6$ cm and $9$ cm. The smaller has a volume of $64$ cm³. Find the larger's volume.`,
          steps: [
            r`$k = \frac96 = 1.5$.`,
            r`$V = 64(1.5)^3 = 64(3.375) = 216$ cm³.`,
          ],
          answer: r`216 cm³.`,
        },
        {
          level: 'board',
          title: 'Paint for a bigger tank, and halving a cone',
          problem: r`(a) Two similar tanks hold 250 and 2000 m³. The smaller takes 30 L of paint. How much does the larger take? (b) A cone 12 cm high is cut parallel to its base so the top piece holds half the volume. How far from the apex is the cut?`,
          steps: [
            r`(a) $k^3 = \frac{2000}{250} = 8$, so $k = 2$ and areas scale by 4: $30 \times 4 = 120$ L.`,
            r`(b) $\left(\frac{x}{12}\right)^3 = \frac12$, so $x = \frac{12}{\sqrt[3]2} = 9.524$ cm.`,
          ],
          answer: r`(a) 120 L; (b) about 9.524 cm from the apex.`,
        },
      ],
      traps: [
        r`Doubling every length makes the volume $8$ times, not $2$ times.`,
        r`Paint follows area, not volume: go from the volume ratio to $k$, then to $k^2$.`,
      ],
      check: [
        { q: r`Two similar solids have lengths in the ratio 3 : 1. What is the ratio of their volumes?`, a: r`$27 : 1$.` },
        { q: r`Two similar solids have areas in the ratio 4 : 9. What is the ratio of their volumes?`, a: r`$k = \frac23$, so $8 : 27$.` },
      ],
    },
  ],
};
