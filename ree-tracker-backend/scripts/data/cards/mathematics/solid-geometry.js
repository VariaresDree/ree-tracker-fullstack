'use strict';

// Mathematics › Solid Geometry formula cards (Library round, 2026-11-16): ten
// live cards, all correct, filed under their subtopics; new cards fill the
// rest. See algebra.js for the format; tests/geometryFormulas.test.js checks
// the formulas numerically (volumes against slicing, areas against nets).

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const POLYH = 'Polyhedrons';
const PRISM = 'Prisms';
const PYR = 'Pyramids';
const FRUST = 'Frustums';
const CYL = 'Cylinders';
const CONE = 'Cones';
const SPH = 'Spheres';
const SSEG = 'Spherical Segments and Sectors';
const PMT = 'Prismatoids';
const REV = 'Solids of Revolution';
const SIMS = 'Similar Solids';

const file = [
    ['33ccd42a-6dc3-4c10-80fb-aefd72841b86', PRISM, 'Volume'],
    ['7a2ee968-a0d9-49a5-9210-13f2b9d15b61', PYR, 'Volume'],
    ['92852f4e-a521-4510-9279-60d8a516488a', FRUST, 'Any frustum'],
    ['612ae563-c638-4f1a-82df-cdbd3abd0626', CYL, 'Volume'],
    ['14faf799-6183-4cfd-ade1-c23a372ef241', CONE, 'Volume'],
    ['eac4b51c-f13c-47eb-974f-e55608327ca2', CONE, 'Area'],
    ['b3a859f7-54b2-4d2c-9566-9aced2c6d42f', SPH, 'Sphere'],
    ['d8eb7134-6846-42e0-aaf6-4bbdb951da85', SPH, 'Sphere'],
    ['9a10873d-f045-4738-b6fe-1622f1278109', PMT, null],
    ['275ea80e-af53-4f7b-81b7-7612cbebc8b2', REV, 'Pappus'],
];

const revisions = [
    { id: 'd8eb7134-6846-42e0-aaf6-4bbdb951da85', note: 'The description said little.', d: 'The area of the whole surface of a sphere: four of its great circles.' },
];

const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const A_ = v(r`$a$`, 'edge');
const RAD = v(r`$r$`, 'radius');
const H = v(r`$h$`, 'perpendicular height');

const drafts = [
    // Polyhedrons
    F(POLYH, 'Counting', "Euler's Polyhedron Formula", r`$V - E + F$`, r`$V - E + F = 2$`,
        [v(r`$V$`, 'vertices'), v(r`$E$`, 'edges'), v(r`$F$`, 'faces')],
        'Vertices minus edges plus faces is 2 for every convex polyhedron.',
        r`Count edges from faces: $E = \frac{\text{(sides per face)} \times F}{2}$, since each edge borders two faces.`),
    F(POLYH, 'Platonic solids', 'Regular Tetrahedron', r`$\frac{a^3}{6\sqrt2}$`, r`$V = \frac{a^3}{6\sqrt2} = \frac{\sqrt2}{12}a^3,\quad A = \sqrt3\,a^2,\quad h = a\sqrt{\frac23}$`,
        [A_, v(r`$h$`, 'height from a vertex to the opposite face')],
        'Four equilateral faces: volume, total area and height from the edge.',
        'V = 4, E = 6, F = 4.'),
    F(POLYH, 'Platonic solids', 'Regular Octahedron', r`$\frac{\sqrt2}{3}a^3$`, r`$V = \frac{\sqrt2}{3}a^3,\quad A = 2\sqrt3\,a^2$`, [A_],
        'Eight equilateral faces: two square pyramids base to base.',
        'V = 6, E = 12, F = 8.'),
    F(POLYH, 'Platonic solids', 'Regular Dodecahedron', r`$V$`, r`$V = \frac{15 + 7\sqrt5}{4}a^3,\quad A = 3\sqrt{25 + 10\sqrt5}\,a^2$`, [A_],
        'Twelve regular pentagons: volume and total area from the edge.',
        'V = 20, E = 30, F = 12.'),
    F(POLYH, 'Platonic solids', 'Regular Icosahedron', r`$V$`, r`$V = \frac{5(3 + \sqrt5)}{12}a^3,\quad A = 5\sqrt3\,a^2$`, [A_],
        'Twenty equilateral faces: volume and total area from the edge.',
        'V = 12, E = 30, F = 20.'),
    // Prisms
    F(PRISM, 'Area', 'Surface Area of a Prism', r`$A_T$`, r`$A_L = P_k L,\quad A_T = A_L + 2A_b$`,
        [v(r`$P_k$`, 'perimeter of a right section (the base, for a right prism)'), v(r`$L$`, 'lateral edge (the height, for a right prism)'), v(r`$A_b$`, 'area of a base')],
        'Lateral area and total area of a prism.',
        'For an oblique prism use the right section, cut square to the lateral edges, not the base.'),
    F(PRISM, 'Volume', 'Volume of an Oblique Prism', r`$V$`, r`$V = A_b h = A_k L$`,
        [v(r`$A_b$`, 'area of a base'), H, v(r`$A_k$`, 'area of a right section'), v(r`$L$`, 'lateral edge')],
        'Base area times height, or right-section area times lateral edge.',
        'Both give the same volume; never multiply the base by the slanted edge.'),
    F(PRISM, 'Boxes', 'Cube', r`$a^3$`, r`$V = a^3,\quad A = 6a^2,\quad d = a\sqrt3$`, [A_, v(r`$d$`, 'space diagonal')],
        'Volume, total area and space diagonal of a cube.',
        r`A face diagonal is $a\sqrt2$; the space diagonal is $a\sqrt3$.`),
    F(PRISM, 'Boxes', 'Rectangular Parallelepiped', r`$abc$`, r`$V = abc,\quad A = 2(ab + bc + ca),\quad d = \sqrt{a^2 + b^2 + c^2}$`,
        [v(r`$a, b, c$`, 'the three edges'), v(r`$d$`, 'space diagonal')],
        'Volume, total area and space diagonal of a rectangular box.',
        r`Given the three face areas $x, y, z$: $V = \sqrt{xyz}$.`),
    F(PRISM, 'Volume', 'Truncated Triangular Prism', r`$V$`, r`$V = A_k \cdot \frac{L_1 + L_2 + L_3}{3}$`,
        [v(r`$A_k$`, 'area of a right section'), v(r`$L_1, L_2, L_3$`, 'the three lateral edges')],
        'A triangular prism cut by a plane not parallel to its base.',
        'With a right prism, A_k is the base and the L are the three heights.'),
    // Pyramids
    F(PYR, 'Area', 'Surface Area of a Regular Pyramid', r`$A_L$`, r`$A_L = \frac12 P L,\quad A_T = A_L + A_b$`,
        [v(r`$P$`, 'perimeter of the base'), v(r`$L$`, 'slant height of a face'), v(r`$A_b$`, 'area of the base')],
        'Lateral area and total area of a regular pyramid.',
        'L is the height of a triangular face, not the lateral edge.'),
    F(PYR, 'Area', 'Slant Height of a Regular Pyramid', r`$L$`, r`$L = \sqrt{h^2 + a^2},\quad e = \sqrt{h^2 + R^2}$`,
        [v(r`$L$`, 'slant height'), H, v(r`$a$`, 'apothem of the base'), v(r`$e$`, 'lateral edge'), v(r`$R$`, 'circumradius of the base')],
        'The slant height and lateral edge of a regular pyramid, from right triangles inside it.',
        'Slant height uses the base apothem; the lateral edge uses the base circumradius.'),
    // Frustums
    F(FRUST, 'Cone frustum', 'Volume of a Frustum of a Cone', r`$V$`, r`$V = \frac{\pi h}{3}(R^2 + Rr + r^2)$`,
        [v(r`$R, r$`, 'radii of the two bases'), H],
        'The volume of a cone cut parallel to its base.',
        'With r = 0 it is the cone; with r = R, the cylinder.'),
    F(FRUST, 'Cone frustum', 'Surface Area of a Frustum of a Cone', r`$A_L$`, r`$A_L = \pi(R + r)L,\quad L = \sqrt{h^2 + (R - r)^2}$`,
        [v(r`$R, r$`, 'radii of the two bases'), v(r`$L$`, 'slant height'), H],
        'The curved surface of a cone frustum and its slant height.',
        r`Total area adds both ends: $\pi(R^2 + r^2)$.`),
    F(FRUST, 'Pyramid frustum', 'Lateral Area of a Frustum of a Regular Pyramid', r`$A_L$`, r`$A_L = \frac12(P_1 + P_2)L$`,
        [v(r`$P_1, P_2$`, 'perimeters of the two bases'), v(r`$L$`, 'slant height of a face')],
        'The lateral area of a frustum of a regular pyramid: its faces are trapezoids.',
        'Each face is a trapezoid with the slant height as its height.'),
    // Cylinders
    F(CYL, 'Area', 'Surface Area of a Cylinder', r`$A_T$`, r`$A_L = 2\pi r h,\quad A_T = 2\pi r(r + h)$`, [RAD, H],
        'Lateral and total area of a right circular cylinder.',
        r`Unrolled, the lateral surface is a rectangle $2\pi r$ by $h$.`),
    F(CYL, 'Volume', 'Volume of a Hollow Cylinder', r`$V$`, r`$V = \pi(R^2 - r^2)h$`,
        [v(r`$R, r$`, 'outer and inner radii'), v(r`$h$`, 'length')],
        'The material in a pipe or tube.',
        'Given a wall thickness t, r = R − t; the diameters are often given instead.'),
    F(CYL, 'Volume', 'Volume of an Oblique Cylinder', r`$V$`, r`$V = \pi r^2 h = A_k L$`,
        [RAD, H, v(r`$A_k$`, 'area of a right section'), v(r`$L$`, 'length of an element')],
        'A slanted cylinder: base area times perpendicular height.',
        "Cavalieri's principle: slanting does not change the volume."),
    // Cones
    F(CONE, 'Area', 'Slant Height and Total Area of a Cone', r`$A_T$`, r`$s = \sqrt{r^2 + h^2},\quad A_T = \pi r(r + s)$`,
        [RAD, H, v(r`$s$`, 'slant height')],
        "A right circular cone's slant height and total area.",
        r`Lateral area alone is $\pi r s$.`),
    F(CONE, 'Area', "Net of a Cone", r`$\theta$`, r`$\theta = \frac{360^\circ r}{s}$`,
        [RAD, v(r`$s$`, 'slant height'), v(r`$\theta$`, 'angle of the sector the cone unrolls into')],
        'Unrolled, a cone is a sector of radius s whose arc is the base circumference.',
        r`Arc of the sector $= 2\pi r$; its area is $\pi r s$, the lateral area.`),
    // Spheres
    F(SPH, 'Sphere', 'Sphere from Its Diameter', r`$\frac{\pi d^3}{6}$`, r`$V = \frac{\pi d^3}{6},\quad A = \pi d^2$`,
        [v(r`$d$`, 'diameter')],
        'Volume and surface area of a sphere when the diameter is given.',
        r`Volume from area: $V = \frac{A^{3/2}}{6\sqrt\pi}$.`),
    F(SPH, 'Sphere', 'Hemisphere', r`$\frac23\pi r^3$`, r`$V = \frac23\pi r^3,\quad A_{\text{curved}} = 2\pi r^2,\quad A_T = 3\pi r^2$`, [RAD],
        'Half a sphere: volume, curved area and total area with its flat face.',
        'Total area adds the flat circle, πr².'),
    F(SPH, 'Sphere', 'Spherical Shell', r`$V$`, r`$V = \frac43\pi(R^3 - r^3)$`, [v(r`$R, r$`, 'outer and inner radii')],
        'The material in a hollow ball.',
        'Cube the radii first, then subtract: not (R − r)³.'),
    F(SPH, 'Lunes and wedges', 'Lune and Spherical Wedge', r`$A$`, r`$A_{\text{lune}} = \frac{\pi r^2\theta}{90^\circ},\quad V_{\text{wedge}} = \frac{\pi r^3\theta}{270^\circ}$`,
        [RAD, v(r`$\theta$`, 'the angle between the two half-planes, in degrees')],
        'The surface between two great semicircles, and the solid it bounds.',
        r`Both are the sphere's share $\frac{\theta}{360^\circ}$: of $4\pi r^2$ and of $\frac43\pi r^3$.`),
    // Spherical Segments and Sectors
    F(SSEG, 'Zones', 'Area of a Zone', r`$A$`, r`$A = 2\pi r h$`, [RAD, v(r`$h$`, 'height of the zone (or cap)')],
        'The curved area of a spherical zone or cap: it depends only on its height.',
        'The same as the band a cylinder of the same height would wrap (Archimedes).'),
    F(SSEG, 'Segments', 'Spherical Cap', r`$V$`, r`$V = \frac{\pi h^2}{3}(3r - h) = \frac{\pi h}{6}(3a^2 + h^2)$`,
        [RAD, v(r`$h$`, 'height of the cap'), v(r`$a$`, 'radius of its base circle')],
        'A spherical segment of one base, from the sphere radius or from its base radius.',
        r`$a^2 = h(2r - h)$ links the two forms.`),
    F(SSEG, 'Segments', 'Spherical Segment of Two Bases', r`$V$`, r`$V = \frac{\pi h}{6}(3a^2 + 3b^2 + h^2)$`,
        [v(r`$a, b$`, 'radii of the two bases'), v(r`$h$`, 'distance between them')],
        'The slice of a sphere between two parallel planes.',
        'With b = 0 it is the cap formula.'),
    F(SSEG, 'Sectors', 'Volume of a Spherical Sector', r`$V$`, r`$V = \frac23\pi r^2 h$`,
        [RAD, v(r`$h$`, 'height of the zone that is its base')],
        "A cone-tipped piece of a sphere: the zone's area times a third of the radius.",
        r`It is $\frac{r}{3} \times 2\pi r h$, like a pyramid with the zone as base.`),
    F(SSEG, 'Sectors', 'Spherical Pyramid', r`$V$`, r`$V = \frac{\pi r^3 E}{540^\circ}$`,
        [RAD, v(r`$E$`, 'spherical excess of its base, in degrees')],
        'A solid whose base is a spherical polygon and apex the centre.',
        r`Its base has area $\frac{\pi r^2 E}{180^\circ}$; the volume is a third of that times $r$.`),
    // Prismatoids
    F(PMT, null, 'Volume of a Wedge', r`$V$`, r`$V = \frac{bh}{6}(2a + c)$`,
        [v(r`$a, b$`, 'sides of the rectangular base, with a parallel to the top edge'), v(r`$c$`, 'top edge'), H],
        'A solid with a rectangular base and a single top edge parallel to one side of the base.',
        'With c = a it is a triangular prism, bh·a/2.'),
    // Solids of Revolution
    F(REV, 'Pappus', 'First Theorem of Pappus', r`$A$`, r`$A = 2\pi\bar{r}L$`,
        [v(r`$A$`, 'area of the surface swept'), v(r`$\bar{r}$`, 'distance from the curve\'s centroid to the axis'), v(r`$L$`, 'length of the curve')],
        'The area swept by a curve revolving about an axis.',
        'The curve must not cross the axis.'),
    F(REV, 'Torus', 'Torus', r`$2\pi^2Rr^2$`, r`$V = 2\pi^2 R r^2,\quad A = 4\pi^2 R r$`,
        [v(r`$R$`, 'distance from the axis to the centre of the tube'), v(r`$r$`, 'radius of the tube')],
        'Volume and surface area of a doughnut, both from Pappus.',
        r`With inner and outer radii given, $R = \frac{R_o + R_i}{2}$ and $r = \frac{R_o - R_i}{2}$.`),
    F(REV, 'Other solids', 'Ellipsoid', r`$\frac43\pi abc$`, r`$V = \frac43\pi abc$`, [v(r`$a, b, c$`, 'the three semi-axes')],
        'The volume of an ellipsoid; with a = b = c it is the sphere.',
        'A prolate spheroid (rugby ball) has b = c.'),
    F(REV, 'Other solids', 'Paraboloid of Revolution', r`$\frac12\pi r^2 h$`, r`$V = \frac12\pi r^2 h$`, [v(r`$r$`, 'radius of the rim'), H],
        'A dish shaped like a parabola turned about its axis: half its circumscribing cylinder.',
        'Cone, paraboloid, cylinder on the same base and height: one third, one half, one.'),
    // Similar Solids
    F(SIMS, null, 'Ratios of Similar Solids', r`$\frac{V_1}{V_2} = k^3$`, r`$\frac{L_1}{L_2} = k,\quad \frac{A_1}{A_2} = k^2,\quad \frac{V_1}{V_2} = k^3$`,
        [v(r`$L$`, 'any matching lengths'), v(r`$A$`, 'matching areas (surface or cross-section)'), v(r`$V$`, 'volumes'), v(r`$k$`, 'the ratio of lengths')],
        'Lengths scale by k, areas by k², volumes by k³.',
        r`From a volume ratio, take the cube root for lengths: twice the volume is $\sqrt[3]{2} \approx 1.26$ times the size.`),
    F(SIMS, null, 'Cutting a Cone or Pyramid Parallel to Its Base', r`$\frac{V_{\text{top}}}{V}$`, r`$\frac{V_{\text{top}}}{V} = \left(\frac{h_{\text{top}}}{h}\right)^3$`,
        [v(r`$V_{\text{top}}$`, 'volume of the small cone or pyramid cut off'), v(r`$h_{\text{top}}$`, 'its height, from the apex'), v(r`$V, h$`, 'the whole one')],
        'The piece cut off at the top is similar to the whole.',
        r`To halve the volume, cut at $h/\sqrt[3]{2} \approx 0.794h$ from the apex, not at mid-height.`),
];

module.exports = { subject: 'Mathematics', topic: 'Solid Geometry', migration: '20261129000000_cards_solid_geometry', file, revisions, retire, drafts };
