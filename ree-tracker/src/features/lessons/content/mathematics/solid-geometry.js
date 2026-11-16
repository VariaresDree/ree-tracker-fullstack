// Library › Lessons › Mathematics › Solid Geometry (2026-11-16): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand. `figures` are drawings from Units and tools ›
// Shapes (features/conversion/shapes/ShapeFigure.jsx).
const r = String.raw;

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
      figures: [{ figure: 'dodecahedron' }, { figure: 'icosahedron' }],
      keyIdeas: [
        r`Euler: $V - E + F = 2$ for every convex polyhedron.`,
        r`Edges from faces: $E = \frac{(\text{sides per face})\,F}{2}$, since each edge borders two faces.`,
        r`Five regular solids: tetrahedron (4 triangles), cube (6 squares), octahedron (8 triangles), dodecahedron (12 pentagons), icosahedron (20 triangles).`,
        r`Regular tetrahedron: $V = \frac{a^3}{6\sqrt2}$; octahedron: $V = \frac{\sqrt2}{3}a^3$.`,
      ],
      example: {
        problem: r`A polyhedron has $12$ faces, all pentagons. How many edges and vertices has it?`,
        solution: r`$E = \frac{12 \times 5}{2} = 30$. Then $V = 2 - F + E = 2 - 12 + 30 = 20$: it is the dodecahedron.`,
      },
      traps: [r`Counting $12 \times 5 = 60$ edges counts each one twice.`],
    },
    {
      name: 'Prisms',
      inShort: r`Two equal parallel bases joined by parallelogram faces: volume, lateral and total area, and the box and cube.`,
      figures: [{ figure: 'prism' }],
      keyIdeas: [
        r`$V = A_b h$, with $h$ perpendicular; for an oblique prism also $V = A_k L$ (right section times lateral edge).`,
        r`Lateral area $= $ perimeter of a right section $\times$ lateral edge; total adds the two bases.`,
        r`Box: $V = abc$, $d = \sqrt{a^2 + b^2 + c^2}$. Cube: $V = a^3$, $A = 6a^2$, $d = a\sqrt3$.`,
        r`Truncated triangular prism: $V = A_k \cdot \frac{L_1 + L_2 + L_3}{3}$.`,
      ],
      example: {
        problem: r`A right prism $10$ cm high has a regular hexagonal base of side $2$ cm. Find its volume and lateral area.`,
        solution: r`Base $= \frac{3\sqrt3}{2}(2)^2 = 6\sqrt3 \approx 10.39$ cm², so $V \approx 103.9$ cm³. Lateral $= 6(2)(10) = 120$ cm².`,
      },
      traps: [r`Lateral area leaves out the bases; total area adds both of them.`],
    },
    {
      name: 'Pyramids',
      inShort: r`A base and a point (the apex) joined by triangles: a third of the prism, and the right triangles inside it.`,
      figures: [{ figure: 'pyramid' }],
      keyIdeas: [
        r`$V = \frac13 A_b h$.`,
        r`Regular pyramid: lateral area $= \frac12 P L$, with $L$ the slant height of a face.`,
        r`Slant height $L = \sqrt{h^2 + a^2}$ (base apothem $a$); lateral edge $e = \sqrt{h^2 + R^2}$ (base circumradius $R$).`,
      ],
      example: {
        problem: r`A pyramid has a square base of side $6$ cm and a height of $4$ cm. Find its slant height, lateral area and volume.`,
        solution: r`The apothem of the base is $3$, so $L = \sqrt{4^2 + 3^2} = 5$ cm. Lateral $= \frac12(24)(5) = 60$ cm². $V = \frac13(36)(4) = 48$ cm³.`,
      },
      traps: [r`The slant height (to the middle of a base edge) and the lateral edge (to a corner) are different lengths.`],
    },
    {
      name: 'Frustums',
      inShort: r`What is left of a cone or pyramid after a cut parallel to its base: volume, slant height and lateral area.`,
      figures: [{ figure: 'cone-frustum' }, { figure: 'pyramid-frustum' }],
      keyIdeas: [
        r`Any frustum: $V = \frac{h}{3}\left(A_1 + A_2 + \sqrt{A_1 A_2}\right)$.`,
        r`Cone frustum: $V = \frac{\pi h}{3}(R^2 + Rr + r^2)$, lateral $\pi(R + r)L$, with $L = \sqrt{h^2 + (R-r)^2}$.`,
        r`Pyramid frustum: lateral $= \frac12(P_1 + P_2)L$, a sum of trapezoids.`,
        r`Or: the whole cone minus the small cone cut off.`,
      ],
      example: {
        problem: r`A frustum of a cone has base radii $4$ cm and $2$ cm and a height of $6$ cm. Find its volume.`,
        solution: r`$V = \frac{\pi(6)}{3}(16 + 8 + 4) = 2\pi(28) = 56\pi \approx 175.9$ cm³.`,
      },
      traps: [r`It is not the average of the two base areas times the height; that overestimates.`],
    },
    {
      name: 'Cylinders',
      inShort: r`Circular bases joined by a curved surface: volume, areas, pipes, and slanted cylinders.`,
      figures: [{ figure: 'cylinder' }],
      keyIdeas: [
        r`$V = \pi r^2 h$; lateral $2\pi r h$; total $2\pi r(r + h)$.`,
        r`Pipe or tube: $V = \pi(R^2 - r^2)h$.`,
        r`Oblique cylinder: base area times perpendicular height (Cavalieri).`,
        r`Unrolled, the lateral surface is a rectangle $2\pi r$ by $h$.`,
      ],
      example: {
        problem: r`A pipe $2$ m long has an outside diameter of $10$ cm and a wall $1$ cm thick. Find the volume of material.`,
        solution: r`$R = 5$ cm and $r = 4$ cm, so $V = \pi(25 - 16)(200) = 1800\pi \approx 5655$ cm³.`,
      },
      traps: [r`Diameters are often given: halve them, and keep the length in the same unit as the radii.`],
    },
    {
      name: 'Cones',
      inShort: r`A circle and a point joined by a curved surface: volume, slant height, areas, and the sector a cone unrolls into.`,
      figures: [{ figure: 'cone' }],
      keyIdeas: [
        r`$V = \frac13\pi r^2 h$; slant height $s = \sqrt{r^2 + h^2}$.`,
        r`Lateral $\pi r s$; total $\pi r(r + s)$.`,
        r`Unrolled: a sector of radius $s$ and angle $\theta = \frac{360^\circ r}{s}$.`,
      ],
      example: {
        problem: r`A cone has a base radius of $3$ cm and a height of $4$ cm. Find its lateral area and the angle of the sector it unrolls into.`,
        solution: r`$s = \sqrt{9 + 16} = 5$ cm. Lateral $= \pi(3)(5) = 15\pi \approx 47.12$ cm². $\theta = \frac{360(3)}{5} = 216^\circ$.`,
      },
      traps: [r`Volume uses the perpendicular height $h$; area uses the slant height $s$.`],
    },
    {
      name: 'Spheres',
      inShort: r`Volume and area of a sphere, and of its halves, shells, lunes and wedges.`,
      figures: [{ figure: 'sphere' }, { figure: 'lune' }],
      keyIdeas: [
        r`$V = \frac43\pi r^3 = \frac{\pi d^3}{6}$ and $A = 4\pi r^2 = \pi d^2$.`,
        r`Hemisphere: $V = \frac23\pi r^3$, total area $3\pi r^2$ with its flat face.`,
        r`Shell: $\frac43\pi(R^3 - r^3)$.`,
        r`Lune and wedge of angle $\theta$: their share $\frac{\theta}{360^\circ}$ of the sphere's area and volume.`,
      ],
      example: {
        problem: r`A sphere has a surface area of $36\pi$ m². Find its volume.`,
        solution: r`$4\pi r^2 = 36\pi$ gives $r = 3$ m, so $V = \frac43\pi(27) = 36\pi \approx 113.1$ m³.`,
      },
      traps: [r`A shell is $R^3 - r^3$, not $(R - r)^3$.`],
    },
    {
      name: 'Spherical Segments and Sectors',
      inShort: r`Slices and cone-tipped pieces of a sphere, and the curved bands (zones) that bound them.`,
      figures: [{ figure: 'spherical-segment' }, { figure: 'spherical-sector' }, { figure: 'zone' }],
      keyIdeas: [
        r`Zone or cap area: $2\pi r h$; it depends only on the height.`,
        r`Cap: $V = \frac{\pi h^2}{3}(3r - h) = \frac{\pi h}{6}(3a^2 + h^2)$.`,
        r`Two bases: $V = \frac{\pi h}{6}(3a^2 + 3b^2 + h^2)$.`,
        r`Sector: $V = \frac23\pi r^2 h$, the cap plus the cone to the centre.`,
      ],
      example: {
        problem: r`A sphere of radius $5$ cm has a cap $2$ cm high. Find the cap's volume and curved area.`,
        solution: r`$V = \frac{\pi(2)^2}{3}(15 - 2) = \frac{52\pi}{3} \approx 54.45$ cm³. Area $= 2\pi(5)(2) = 20\pi \approx 62.83$ cm².`,
      },
      traps: [r`In the cap formula $r$ is the sphere's radius and $a$ the cap's base radius; don't swap them.`],
    },
    {
      name: 'Prismatoids',
      inShort: r`Solids with two parallel end faces and any sides between: one formula covers prisms, pyramids, frustums, wedges and more.`,
      figures: [{ figure: 'prismatoid' }],
      keyIdeas: [
        r`Prismoidal formula: $V = \frac{h}{6}(A_1 + 4A_m + A_2)$.`,
        r`$A_m$ is the section at mid-height: build it from the average of each end length.`,
        r`Wedge (rectangular base $a \times b$, top edge $c$ parallel to $a$): $V = \frac{bh}{6}(2a + c)$.`,
        r`The formula is exact for any solid whose cross-section area is a quadratic in the height, including spheres.`,
      ],
      example: {
        problem: r`A frustum of a square pyramid has bases $4 \times 4$ and $2 \times 2$ cm and a height of $3$ cm. Find its volume with the prismoidal formula.`,
        solution: r`The mid-section is $3 \times 3$, so $A_m = 9$. $V = \frac{3}{6}(16 + 36 + 4) = 28$ cm³. Check: $\frac33(16 + 4 + \sqrt{64}) = 28$.`,
      },
      traps: [r`$A_m$ is not $\frac{16 + 4}{2} = 10$: with it the formula gives $\frac36(16 + 40 + 4) = 30$, not $28$.`],
    },
    {
      name: 'Solids of Revolution',
      inShort: r`Solids made by turning a figure about an axis, measured by the theorems of Pappus.`,
      figures: [{ figure: 'torus' }, { figure: 'ellipsoid' }],
      keyIdeas: [
        r`Pappus: surface $A = 2\pi\bar{r}L$ (a curve of length $L$), volume $V = 2\pi\bar{r}A$ (an area $A$), with $\bar{r}$ the centroid's distance to the axis.`,
        r`Torus: $V = 2\pi^2 R r^2$, $A = 4\pi^2 R r$.`,
        r`Ellipsoid $\frac43\pi abc$; paraboloid $\frac12\pi r^2 h$, half its cylinder.`,
      ],
      example: {
        problem: r`A circle of radius $3$ cm, whose centre is $6$ cm from an axis, turns about it. Find the volume and surface area of the torus.`,
        solution: r`$V = 2\pi(6)(\pi \cdot 9) = 108\pi^2 \approx 1066$ cm³. $A = 2\pi(6)(2\pi \cdot 3) = 72\pi^2 \approx 710.6$ cm².`,
      },
      traps: [r`$\bar{r}$ is measured to the axis of revolution, not to the origin.`],
    },
    {
      name: 'Similar Solids',
      inShort: r`Solids of the same shape: lengths scale by $k$, areas by $k^2$, volumes by $k^3$.`,
      figures: [{ figure: 'cone' }],
      keyIdeas: [
        r`$\frac{L_1}{L_2} = k$, $\frac{A_1}{A_2} = k^2$, $\frac{V_1}{V_2} = k^3$.`,
        r`The top cut off a cone or pyramid by a plane parallel to its base is similar to the whole.`,
        r`To cut off half the volume, cut at $\frac{h}{\sqrt[3]{2}} \approx 0.794h$ from the apex.`,
      ],
      example: {
        problem: r`Two similar cones have heights of $6$ cm and $9$ cm. The smaller has a volume of $64$ cm³. Find the larger's volume.`,
        solution: r`$k = \frac96 = 1.5$, so $V = 64(1.5)^3 = 64(3.375) = 216$ cm³.`,
      },
      traps: [r`Doubling every length makes the volume $8$ times, not $2$ times.`],
    },
  ],
};
