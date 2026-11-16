// Library › Lessons › Mathematics › Analytic Geometry (2026-11-16): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by hand. `figures` are drawings from Units and tools ›
// Shapes (features/conversion/shapes/ShapeFigure.jsx); the three conics were
// drawn for this lesson.
const r = String.raw;

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
      keyIdeas: [
        r`Distance: $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$; in space, add the $z$ term.`,
        r`Ratio $m:n$ from $P_1$: $x = \frac{mx_2 + nx_1}{m + n}$, likewise $y$; the midpoint is $1:1$.`,
        r`Triangle area: $\frac12|x_1(y_2 - y_3) + x_2(y_3 - y_1) + x_3(y_1 - y_2)|$; any polygon by the shoelace.`,
        r`Centroid: the average of the vertices.`,
      ],
      example: {
        problem: r`Find the point dividing the segment from $A(-2, 5)$ to $B(7, -1)$ in the ratio $2:1$ from $A$. Then find the area of the triangle with vertices $(1, 2)$, $(8, 3)$ and $(4, 9)$.`,
        solution: r`$x = \frac{2(7) + 1(-2)}{3} = 4$ and $y = \frac{2(-1) + 1(5)}{3} = 1$: the point is $(4, 1)$. Area $= \frac12|1(3 - 9) + 8(9 - 2) + 4(2 - 3)| = \frac12|{-6} + 56 - 4| = 23$.`,
      },
      traps: [r`In the ratio formula, each end is weighted by the far part: $x_2$ by $m$, not by $n$.`],
    },
    {
      name: 'Lines and Slopes',
      inShort: r`Slopes, the forms of a line's equation, the angle between two lines, and distances to a line.`,
      keyIdeas: [
        r`$m = \frac{y_2 - y_1}{x_2 - x_1} = \tan\theta$. Parallel: equal slopes. Perpendicular: $m_1 m_2 = -1$.`,
        r`Forms: point-slope $y - y_1 = m(x - x_1)$, slope-intercept $y = mx + b$, intercept $\frac{x}{a} + \frac{y}{b} = 1$, general $Ax + By + C = 0$.`,
        r`Angle from line 1 to line 2: $\tan\theta = \frac{m_2 - m_1}{1 + m_1 m_2}$.`,
        r`Point to line: $\frac{|Ax_1 + By_1 + C|}{\sqrt{A^2 + B^2}}$; parallel lines: $\frac{|C_2 - C_1|}{\sqrt{A^2 + B^2}}$.`,
      ],
      example: {
        problem: r`Find the distance from $(5, 6)$ to the line $3x + 4y - 12 = 0$, and the acute angle between $y = 0.5x$ and $y = 3x$.`,
        solution: r`$d = \frac{|15 + 24 - 12|}{\sqrt{9 + 16}} = \frac{27}{5} = 5.4$. $\tan\theta = \frac{3 - 0.5}{1 + 1.5} = 1$, so $\theta = 45^\circ$.`,
      },
      traps: [r`For the distance between parallel lines, make $A$ and $B$ the same in both equations first.`],
    },
    {
      name: 'Circles',
      inShort: r`A circle's equation in standard and general form, and its tangents.`,
      figures: [{ figure: 'circle' }],
      keyIdeas: [
        r`Standard: $(x - h)^2 + (y - k)^2 = r^2$.`,
        r`General: $x^2 + y^2 + Dx + Ey + F = 0$, centre $\left(-\frac{D}{2}, -\frac{E}{2}\right)$, $r = \frac12\sqrt{D^2 + E^2 - 4F}$.`,
        r`Tangent at $(x_1, y_1)$: $(x_1 - h)(x - h) + (y_1 - k)(y - k) = r^2$.`,
        r`Tangent length from an outside point: put the point into the general form and take the root.`,
      ],
      example: {
        problem: r`Find the centre and radius of $x^2 + y^2 - 6x + 4y - 12 = 0$, and the length of a tangent to it from $(12, 7)$.`,
        solution: r`Centre $(3, -2)$; $r = \frac12\sqrt{36 + 16 + 48} = 5$. Tangent: $\sqrt{144 + 49 - 72 + 28 - 12} = \sqrt{137} \approx 11.70$.`,
      },
      traps: [r`$(x + 2)^2$ means $h = -2$; and the right side is $r^2$, not $r$.`],
    },
    {
      name: 'Parabola',
      inShort: r`Every point as far from a focus as from a line (the directrix): equations, vertex, focus and latus rectum.`,
      figures: [{ figure: 'parabola' }],
      keyIdeas: [
        r`$y^2 = 4ax$ opens right (left if $a < 0$); $x^2 = 4ay$ opens up. Focus $a$ from the vertex, directrix $a$ behind it.`,
        r`Shifted: $(y - k)^2 = 4a(x - h)$ or $(x - h)^2 = 4a(y - k)$, vertex $(h, k)$.`,
        r`Latus rectum $= 4|a|$.`,
        r`$y = Ax^2 + Bx + C$: vertex at $x = -\frac{B}{2A}$, and $a = \frac{1}{4A}$.`,
      ],
      example: {
        problem: r`Find the vertex, focus, directrix and latus rectum of $y^2 - 4y - 8x + 28 = 0$.`,
        solution: r`$(y - 2)^2 = 8x - 24 = 8(x - 3)$. Vertex $(3, 2)$; $4a = 8$, so $a = 2$: focus $(5, 2)$, directrix $x = 1$, latus rectum $8$.`,
      },
      traps: [r`$4a$ is the coefficient; the focal distance is a quarter of it.`],
    },
    {
      name: 'Ellipse',
      inShort: r`Every point whose distances to two foci add to $2a$: axes, foci, eccentricity and latus rectum.`,
      figures: [{ figure: 'ellipse' }],
      keyIdeas: [
        r`$\frac{(x - h)^2}{a^2} + \frac{(y - k)^2}{b^2} = 1$ with $a > b$: the larger denominator is $a^2$ and names the major axis.`,
        r`$c^2 = a^2 - b^2$; $e = \frac{c}{a} < 1$.`,
        r`$PF_1 + PF_2 = 2a$; latus rectum $\frac{2b^2}{a}$; directrices $\frac{a}{e}$ from the centre.`,
      ],
      example: {
        problem: r`For $9x^2 + 25y^2 = 225$, find $a$, $b$, $c$, $e$, the foci and the latus rectum.`,
        solution: r`$\frac{x^2}{25} + \frac{y^2}{9} = 1$: $a = 5$, $b = 3$, $c = \sqrt{25 - 9} = 4$, $e = 0.8$, foci $(\pm4, 0)$, latus rectum $\frac{2(9)}{5} = 3.6$.`,
      },
      traps: [r`Divide through so the right side is $1$ before reading $a^2$ and $b^2$.`],
    },
    {
      name: 'Hyperbola',
      inShort: r`Every point whose distances to two foci differ by $2a$: axes, foci, asymptotes and eccentricity.`,
      figures: [{ figure: 'hyperbola' }],
      keyIdeas: [
        r`$\frac{(x - h)^2}{a^2} - \frac{(y - k)^2}{b^2} = 1$: the positive term names the transverse axis; $a$ may be smaller than $b$.`,
        r`$c^2 = a^2 + b^2$; $e = \frac{c}{a} > 1$.`,
        r`Asymptotes: $y - k = \pm\frac{b}{a}(x - h)$; latus rectum $\frac{2b^2}{a}$.`,
        r`Equal axes ($a = b$): a rectangular hyperbola, $e = \sqrt2$; $xy = k$ is one.`,
      ],
      example: {
        problem: r`For $16x^2 - 9y^2 = 144$, find $a$, $b$, $c$, $e$, the asymptotes and the latus rectum.`,
        solution: r`$\frac{x^2}{9} - \frac{y^2}{16} = 1$: $a = 3$, $b = 4$, $c = 5$, $e = \frac53$, asymptotes $y = \pm\frac43 x$, latus rectum $\frac{2(16)}{3} \approx 10.67$.`,
      },
      traps: [r`$c^2 = a^2 + b^2$ here; using the ellipse's minus is the classic slip.`],
    },
    {
      name: 'General Conic Sections',
      inShort: r`Every conic is $Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0$: which one it is, from the coefficients or the eccentricity.`,
      figures: [{ figure: 'parabola' }, { figure: 'ellipse' }, { figure: 'hyperbola' }],
      keyIdeas: [
        r`$B^2 - 4AC < 0$: ellipse (circle if $B = 0$, $A = C$); $= 0$: parabola; $> 0$: hyperbola.`,
        r`With no $xy$ term: $AC > 0$ ellipse, $AC = 0$ parabola, $AC < 0$ hyperbola.`,
        r`By eccentricity $e = \frac{PF}{PD}$: $0$ circle, under $1$ ellipse, $1$ parabola, over $1$ hyperbola.`,
      ],
      example: {
        problem: r`Name the conics $4x^2 - 4xy + y^2 - 6x + 3 = 0$ and $x^2 + xy + y^2 = 3$.`,
        solution: r`First: $B^2 - 4AC = 16 - 16 = 0$, a parabola. Second: $1 - 4 = -3 < 0$, an ellipse (turned, since $B \ne 0$).`,
      },
      traps: [r`The test also passes degenerate cases (a point, a pair of lines, nothing): complete the square when the answer choices include them.`],
    },
    {
      name: 'Translation and Rotation of Axes',
      inShort: r`Moving the origin, and turning the axes to remove an $xy$ term.`,
      keyIdeas: [
        r`Translation: $x = x' + h$, $y = y' + k$; completing the square does this.`,
        r`Rotation: $x = x'\cos\theta - y'\sin\theta$, $y = x'\sin\theta + y'\cos\theta$.`,
        r`The angle that removes $xy$: $\cot 2\theta = \frac{A - C}{B}$.`,
        r`$A + C$ and $B^2 - 4AC$ don't change, so the conic's kind never does.`,
      ],
      example: {
        problem: r`Rotate the axes to remove the $xy$ term from $5x^2 + 4xy + 2y^2 = 6$, and name the curve.`,
        solution: r`$\cot 2\theta = \frac34$, so $\cos 2\theta = \frac35$, $\cos\theta = \frac{2}{\sqrt5}$, $\sin\theta = \frac{1}{\sqrt5}$ ($\theta \approx 26.57^\circ$). $A' = 5(0.8) + 4(0.4) + 2(0.2) = 6$ and $C' = (A + C) - A' = 1$: $6x'^2 + y'^2 = 6$, an ellipse.`,
      },
      traps: [r`Get $\cos\theta$ and $\sin\theta$ from $\cos 2\theta$ with the half-angle formulas; don't round $\theta$ first.`],
    },
    {
      name: 'Polar Coordinates',
      inShort: r`Points as a distance and an angle: converting, distances, and the polar forms of conics and roses.`,
      keyIdeas: [
        r`$x = r\cos\theta$, $y = r\sin\theta$, $r^2 = x^2 + y^2$, $\tan\theta = \frac{y}{x}$ (check the quadrant).`,
        r`Distance between polar points: $d^2 = r_1^2 + r_2^2 - 2r_1r_2\cos(\theta_2 - \theta_1)$.`,
        r`Conic with a focus at the pole: $r = \frac{ed}{1 \pm e\cos\theta}$.`,
        r`$r = 2a\cos\theta$ is a circle; $r = a\cos n\theta$ a rose. Area: $\frac12\int r^2\,d\theta$.`,
      ],
      example: {
        problem: r`Write $(-2, 2\sqrt3)$ in polar form, and name the curve $r = \frac{6}{2 - \cos\theta}$.`,
        solution: r`$r = \sqrt{4 + 12} = 4$; the point is in QII, so $\theta = 180^\circ - 60^\circ = 120^\circ$. Then $r = \frac{3}{1 - 0.5\cos\theta}$: $e = 0.5$, an ellipse, with $ed = 3$ so $d = 6$.`,
      },
      traps: [r`Make the constant in the denominator $1$ before reading $e$.`],
    },
    {
      name: 'Parametric Equations',
      inShort: r`Curves traced by a parameter: lines, ellipses, the cycloid and the projectile, and their slopes.`,
      keyIdeas: [
        r`Eliminate the parameter to get the curve: for $\cos t$ and $\sin t$, use $\cos^2 t + \sin^2 t = 1$.`,
        r`Slope: $\frac{dy}{dx} = \frac{dy/dt}{dx/dt}$.`,
        r`Cycloid $x = r(t - \sin t)$, $y = r(1 - \cos t)$: one arch is $8r$ long and encloses $3\pi r^2$.`,
        r`Projectile: $x = v_0t\cos\alpha$, $y = v_0t\sin\alpha - \frac12gt^2$, a parabola; range $\frac{v_0^2\sin 2\alpha}{g}$.`,
      ],
      example: {
        problem: r`Eliminate $t$ from $x = 2 + 3\cos t$, $y = -1 + 2\sin t$, and find the slope at $t = \frac{\pi}{4}$.`,
        solution: r`$\frac{(x - 2)^2}{9} + \frac{(y + 1)^2}{4} = 1$, an ellipse centred at $(2, -1)$. $\frac{dy}{dx} = \frac{2\cos t}{-3\sin t} = -\frac23$ at $t = \frac{\pi}{4}$.`,
      },
      traps: [r`$\frac{dy}{dx}$ is the ratio of the two derivatives, not $\frac{d}{dt}$ of $\frac{y}{x}$.`],
    },
    {
      name: 'Lines and Planes in Space',
      inShort: r`Directions, lines and planes in three dimensions, and the distances and angles between them.`,
      keyIdeas: [
        r`Direction cosines: $\cos^2\alpha + \cos^2\beta + \cos^2\gamma = 1$.`,
        r`Line: $\frac{x - x_1}{a} = \frac{y - y_1}{b} = \frac{z - z_1}{c}$. Plane: $Ax + By + Cz + D = 0$, normal $(A, B, C)$.`,
        r`Point to plane: $\frac{|Ax_1 + By_1 + Cz_1 + D|}{\sqrt{A^2 + B^2 + C^2}}$.`,
        r`Angle between planes: the angle between their normals.`,
      ],
      example: {
        problem: r`Find the distance from $(4, -2, 6)$ to the plane $2x - y + 2z - 3 = 0$, and the angle between the planes $x + y = 0$ and $y + z = 0$.`,
        solution: r`$d = \frac{|8 + 2 + 12 - 3|}{\sqrt{4 + 1 + 4}} = \frac{19}{3} \approx 6.33$. Normals $(1, 1, 0)$ and $(0, 1, 1)$: $\cos\theta = \frac{1}{\sqrt2\sqrt2} = \frac12$, so $\theta = 60^\circ$.`,
      },
      traps: [r`The coefficients of the plane are its normal, not a direction in the plane.`],
    },
  ],
};
