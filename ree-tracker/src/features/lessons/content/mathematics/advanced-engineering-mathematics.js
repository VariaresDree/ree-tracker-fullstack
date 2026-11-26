// Library › Lessons › Mathematics › Advanced Engineering Mathematics
// (2026-11-17; every subtopic in the module format 2026-11-27, with figures,
// examples a step at a time and checks; every number re-worked by
// advancedEngineeringMathematicsLesson.test.js. Coverage cross-checked against
// two review centers' engineering mathematics handouts; the text, problems and
// figures are this app's own): written for the Philippine REE board, subtopic
// by subtopic in the syllabus's order.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

// Bessel function of the first kind, integer order, from Bessel's integral (midpoint rule).
export const besselJ = (n, x, steps = 200) => {
  let s = 0;
  for (let i = 0; i < steps; i++) {
    const t = ((i + 0.5) * Math.PI) / steps;
    s += Math.cos(n * t - x * Math.sin(t));
  }
  return s / steps;
};

// Partial Fourier sum of a ±1 square wave of period 2π, harmonics up to `top`.
export const squareSum = (t, top) => {
  let s = 0;
  for (let n = 1; n <= top; n += 2) s += Math.sin(n * t) / n;
  return (4 / Math.PI) * s;
};

// The spectrum of a pulse of height 2 and width 1.5 s.
export const pulseSpectrum = (w) => (w === 0 ? 3 : (4 * Math.sin(0.75 * w)) / w);

// The matrix whose unit square is drawn in the determinants figure.
export const SHEAR = [[2, 1], [1, 3]];

export default {
  topic: 'Advanced Engineering Mathematics',
  subject: 'Mathematics',
  overview: r`Advanced engineering mathematics is the toolkit behind circuits, signals and fields: matrices for networks, eigenvalues for systems, Laplace and z-transforms for transients and sampled data, Fourier series and transforms for spectra, special functions and partial differential equations for physical fields, and complex-variable theory for contour integrals. Board items here are mostly one or two steps of a known method: recognise the tool, apply its table or theorem, and let the calculator do the arithmetic.`,
  sources: [
    'Kreyszig, Advanced Engineering Mathematics',
    'Schaum’s Outline of Advanced Mathematics for Engineers and Scientists (Spiegel)',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Matrices and Determinants',
      inShort: r`Matrix algebra, determinants, and inverses.`,
      body: [
        r`A **matrix** is a rectangular array; an $m \times n$ matrix has $m$ rows and $n$ columns. Matrices of the same size add element by element; a scalar multiplies every element. The **product** $AB$ needs the columns of $A$ to match the rows of $B$: each element is a row of $A$ dotted with a column of $B$, $(AB)_{ij} = \sum_k a_{ik}b_{kj}$. Order matters: $AB \ne BA$ in general.

| Term | Meaning |
|---|---|
| transpose $A^T$ | rows become columns; $(AB)^T = B^TA^T$ |
| symmetric, skew-symmetric | $A^T = A$; $A^T = -A$ (zeros on the diagonal) |
| minor $M_{ij}$, cofactor $C_{ij}$ | determinant with row $i$ and column $j$ removed; $C_{ij} = (-1)^{i+j}M_{ij}$ |
| adjoint | the transpose of the matrix of cofactors |
| inverse | $A^{-1} = \frac{\operatorname{adj}A}{\det A}$, only when $\det A \ne 0$; for $2 \times 2$, swap the diagonal, negate the other two, divide by $\det A$ |

The **determinant** is expanded along any row or column by cofactors. For a $2 \times 2$ it is $ad - bc$, and geometrically it is the factor by which the matrix scales areas:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The unit square with corners at the origin, 1 comma 0, 1 comma 1 and 0 comma 1, drawn dashed, and its image under the matrix 2 1 1 3: a parallelogram with corners at the origin, 2 comma 1, 3 comma 4 and 1 comma 3, whose area is 5.',
          caption: 'The matrix [2 1; 1 3] maps the unit square (dashed) onto a parallelogram of area 5: its determinant, 2 × 3 − 1 × 1.',
          x: [-0.5, 3.5],
          y: [-0.5, 4.5],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { points: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], dashed: true, colour: colourOf(1) },
            { points: [[0, 0], [SHEAR[0][0], SHEAR[1][0]], [SHEAR[0][0] + SHEAR[0][1], SHEAR[1][0] + SHEAR[1][1]], [SHEAR[0][1], SHEAR[1][1]], [0, 0]], colour: colourOf(0) },
          ],
          legend: false,
        },
        r`Rules worth knowing: $\det(AB) = \det A\det B$; $\det A^T = \det A$; $\det(kA) = k^n\det A$ for an $n \times n$ matrix; a row swap flips the sign; a row of zeros, or two equal rows, gives $0$; $(AB)^{-1} = B^{-1}A^{-1}$.`,
      ],
      keyIdeas: [
        r`$(AB)_{ij} = \sum_k a_{ik}b_{kj}$; $AB \ne BA$ in general; $(AB)^{-1} = B^{-1}A^{-1}$.`,
        r`$\det(AB) = \det A\det B$, $\det(kA) = k^n\det A$; a row swap flips the sign.`,
        r`Cofactor expansion along any row or column; $A^{-1} = \frac{\text{adj}A}{\det A}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A 3 × 3 determinant',
          problem: r`Find $\det\begin{bmatrix}2 & -1 & 3\\ 0 & 4 & 1\\ 5 & 2 & -2\end{bmatrix}$.`,
          steps: [
            r`Along row 1, with signs $+, -, +$: $2(-8 - 2) + 1(0 - 5) + 3(0 - 20)$.`,
            r`$= -20 - 5 - 60 = -85$.`,
          ],
          answer: r`$-85$.`,
        },
        {
          level: 'board',
          title: 'An inverse, a cofactor, a product, a scaled determinant',
          problem: r`(a) Invert $\begin{bmatrix}2 & 1\\ 5 & 3\end{bmatrix}$. For $A = \begin{bmatrix}1 & 2 & 0\\ 3 & -1 & 4\\ 2 & 1 & 5\end{bmatrix}$, find (b) $\det A$ and the cofactor $C_{21}$, and (c) $\det(2A)$. (d) Multiply $\begin{bmatrix}1 & 0 & 2\\ -1 & 3 & 1\end{bmatrix}\begin{bmatrix}2 & 1\\ 1 & 0\\ 0 & 4\end{bmatrix}$.`,
          steps: [
            r`(a) $\det = 6 - 5 = 1$: $\begin{bmatrix}3 & -1\\ -5 & 2\end{bmatrix}$.`,
            r`(b) Along row 1: $1(-5 - 4) - 2(15 - 8) + 0 = -23$. $C_{21} = -\begin{vmatrix}2 & 0\\ 1 & 5\end{vmatrix} = -10$.`,
            r`(c) $2^3(-23) = -184$.`,
            r`(d) $\begin{bmatrix}2 + 0 + 0 & 1 + 0 + 8\\ -2 + 3 + 0 & -1 + 0 + 4\end{bmatrix} = \begin{bmatrix}2 & 9\\ 1 & 3\end{bmatrix}$.`,
          ],
          answer: r`(a) $\begin{bmatrix}3 & -1\\ -5 & 2\end{bmatrix}$; (b) $-23$ and $-10$; (c) $-184$; (d) $\begin{bmatrix}2 & 9\\ 1 & 3\end{bmatrix}$.`,
        },
      ],
      traps: [
        r`The cofactor signs alternate: the middle term of a row-1 expansion is subtracted.`,
        r`$\det(2A) = 2^n\det A$, not $2\det A$: the factor multiplies every row.`,
      ],
      check: [
        { q: r`What is the inverse of $\begin{bmatrix}1 & 1\\ 0 & 1\end{bmatrix}$?`, a: r`$\begin{bmatrix}1 & -1\\ 0 & 1\end{bmatrix}$.` },
        { q: r`Is $\begin{bmatrix}0 & -2\\ 2 & 0\end{bmatrix}$ symmetric or skew-symmetric?`, a: r`Skew-symmetric: $A^T = -A$.` },
      ],
    },
    {
      name: 'Systems of Linear Equations',
      inShort: r`Linear systems in matrix form, and when they have one solution, many or none.`,
      body: [
        r`A linear system is $AX = B$. Its answer depends on the **rank** (the number of independent rows) of $A$ and of the augmented matrix $[A|B]$:

| Ranks | Solutions |
|---|---|
| $\operatorname{rank}A = \operatorname{rank}[A|B] = n$ | exactly one |
| $\operatorname{rank}A = \operatorname{rank}[A|B] < n$ | infinitely many |
| $\operatorname{rank}A < \operatorname{rank}[A|B]$ | none |

With two unknowns each equation is a line, and the cases are lines that cross, coincide or run parallel:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The lines x plus 2y equals 4 and 3x minus y equals 5 crossing at the point 2 comma 1, and a dashed line x plus 2y equals 7 parallel to the first, which never meets it.',
          caption: 'x + 2y = 4 and 3x − y = 5 cross once, at (2, 1); x + 2y = 7 (dashed) is parallel to the first, so those two have no solution.',
          x: [-1, 5],
          y: [-1, 4],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => (4 - x) / 2, colour: colourOf(0) },
            { f: (x) => 3 * x - 5, colour: colourOf(2) },
            { f: (x) => (7 - x) / 2, dashed: true, colour: colourOf(1) },
          ],
          marks: [{ at: [2, 1] }],
          legend: false,
        },
        r`A square system with $\det A \ne 0$ has $X = A^{-1}B$, or by **Cramer's rule** $x_i = \frac{D_i}{D}$, where $D_i$ is $\det A$ with column $i$ replaced by $B$. A **homogeneous** system $AX = 0$ always has $X = 0$, and has other solutions exactly when $\det A = 0$.`,
      ],
      keyIdeas: [
        r`$AX = B$; with $\det A \ne 0$, $X = A^{-1}B$ (or Cramer's rule).`,
        r`Unique when $\text{rank}A = \text{rank}[A|B] = n$; none when $\text{rank}A < \text{rank}[A|B]$.`,
        r`$AX = 0$ has a nontrivial solution exactly when $\det A = 0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three equations',
          problem: r`Solve $x + y + z = 6$, $2y + 5z = -4$, $2x + 5y - z = 27$.`,
          steps: [
            r`Eliminating (or with the calculator's equation mode): $x = 5$, $y = 3$, $z = -2$.`,
            r`Check: $5 + 3 - 2 = 6$, $6 - 10 = -4$, $10 + 15 + 2 = 27$.`,
          ],
          answer: r`$(5, 3, -2)$.`,
        },
        {
          level: 'board',
          title: "Cramer's rule, and a homogeneous system",
          problem: r`(a) Solve by Cramer's rule: $2x + y - z = 0$, $x - y + 2z = 9$, $3x + 2y + z = 7$. (b) For what $k$ does $kx + 2y = 0$, $2x + ky = 0$ have a solution other than zero?`,
          steps: [
            r`(a) $D = 2(-1 - 4) - 1(1 - 6) - 1(2 + 3) = -10$.`,
            r`$D_x = -20$, $D_y = 10$, $D_z = -30$, so $x = 2$, $y = -1$, $z = 3$.`,
            r`(b) $\det = k^2 - 4 = 0$: $k = \pm2$.`,
          ],
          answer: r`(a) $(2, -1, 3)$; (b) $k = \pm2$.`,
        },
      ],
      traps: [
        r`$X = A^{-1}B$: the inverse multiplies from the left.`,
        r`Cramer's rule fails when $D = 0$: then the system has none or infinitely many solutions.`,
      ],
      check: [
        { q: r`How many solutions has $x + 2y = 4$, $2x + 4y = 8$?`, a: r`Infinitely many: the same line twice (rank 1).` },
        { q: r`What does $D = 0$ with some $D_i \ne 0$ mean?`, a: r`No solution: the equations are inconsistent.` },
      ],
    },
    {
      name: 'Eigenvalues and Eigenvectors',
      inShort: r`Directions a matrix only stretches, and by how much.`,
      body: [
        r`Most vectors are turned by a matrix; an **eigenvector** $\mathbf v$ is only stretched, $A\mathbf v = \lambda\mathbf v$, by its **eigenvalue** $\lambda$. The eigenvalues are the roots of the **characteristic equation**
$$\det(A - \lambda I) = 0,$$
and each eigenvector solves $(A - \lambda I)\mathbf v = 0$ (any multiple of it works as well).

| Property | Value |
|---|---|
| sum of eigenvalues | trace (sum of the diagonal) |
| product of eigenvalues | $\det A$ |
| triangular or diagonal $A$ | the eigenvalues are the diagonal entries |
| $A^k$, $A^{-1}$, $A + cI$ | eigenvalues $\lambda^k$, $\frac1\lambda$, $\lambda + c$ |
| Cayley-Hamilton | $A$ satisfies its own characteristic equation |

For a $2 \times 2$ matrix the characteristic equation is $\lambda^2 - (\operatorname{tr}A)\lambda + \det A = 0$. Diagonalising, $A = PDP^{-1}$ with the eigenvectors in $P$, makes powers easy: $A^k = PD^kP^{-1}$.`,
      ],
      keyIdeas: [
        r`$\det(A - \lambda I) = 0$ for $\lambda$; $(A - \lambda I)\mathbf v = 0$ for $\mathbf v$.`,
        r`$\sum\lambda = \text{tr}A$, $\prod\lambda = \det A$; triangular matrices show them on the diagonal.`,
        r`$A^k$ has $\lambda^k$, $A^{-1}$ has $\frac1\lambda$; $A = PDP^{-1}$ makes powers easy. Cayley-Hamilton: $p(A) = 0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A 2 × 2 matrix',
          problem: r`Find the eigenvalues and eigenvectors of $\begin{bmatrix}4 & 1\\ 2 & 3\end{bmatrix}$.`,
          steps: [
            r`$\lambda^2 - 7\lambda + 10 = 0$: $\lambda = 5$ with $(1, 1)$, and $\lambda = 2$ with $(1, -2)$.`,
            r`Check: $5 + 2 = 7$ (trace), $5 \times 2 = 10$ (determinant).`,
          ],
          answer: r`5 with $(1, 1)$; 2 with $(1, -2)$.`,
        },
        {
          level: 'board',
          title: 'A triangular matrix, and an inverse by Cayley-Hamilton',
          problem: r`(a) For $A = \begin{bmatrix}2 & 0 & 0\\ 1 & 3 & 0\\ 4 & -1 & 5\end{bmatrix}$, give the eigenvalues of $A$, $A^2$ and $A^{-1}$, and $\det A$. (b) Use Cayley-Hamilton to invert $B = \begin{bmatrix}1 & 2\\ 3 & 4\end{bmatrix}$.`,
          steps: [
            r`(a) Triangular: $2, 3, 5$. Then $A^2$: $4, 9, 25$; $A^{-1}$: $\frac12, \frac13, \frac15$; $\det A = 30$.`,
            r`(b) $\lambda^2 - 5\lambda - 2 = 0$, so $B^2 - 5B - 2I = 0$. Multiply by $B^{-1}$: $B - 5I - 2B^{-1} = 0$, so $B^{-1} = \frac{B - 5I}{2} = \begin{bmatrix}-2 & 1\\ 1.5 & -0.5\end{bmatrix}$.`,
          ],
          answer: r`(a) $\{2, 3, 5\}$, $\{4, 9, 25\}$, $\left\{\frac12, \frac13, \frac15\right\}$, 30; (b) $\begin{bmatrix}-2 & 1\\ 1.5 & -0.5\end{bmatrix}$.`,
        },
      ],
      traps: [
        r`An eigenvector is never the zero vector, and any multiple of one is as good.`,
        r`The eigenvalues of $A + B$ are not the sums of the separate eigenvalues in general.`,
      ],
      check: [
        { q: r`What are the eigenvalues of $\begin{bmatrix}5 & 3\\ 6 & 2\end{bmatrix}$?`, a: r`$\lambda^2 - 7\lambda - 8 = 0$: $8$ and $-1$.` },
        { q: r`A $3 \times 3$ matrix has eigenvalues 1, 2, 4. What is its determinant?`, a: r`$8$.` },
      ],
    },
    {
      name: 'Laplace Transforms',
      inShort: r`Transforms beyond the basic table: shifted powers, damped sinusoids, convolution and periodic signals.`,
      body: [
        r`The Laplace transform $F(s) = \int_0^\infty e^{-st}f(t)\,dt$ of the common signals:

| $f(t)$ | $F(s)$ | $f(t)$ | $F(s)$ |
|---|---|---|---|
| $1$ | $\frac1s$ | $t^n$ | $\frac{n!}{s^{n+1}}$ |
| $e^{at}$ | $\frac{1}{s - a}$ | $t^ne^{at}$ | $\frac{n!}{(s - a)^{n+1}}$ |
| $\sin at$ | $\frac{a}{s^2 + a^2}$ | $\cos at$ | $\frac{s}{s^2 + a^2}$ |
| $\sinh at$ | $\frac{a}{s^2 - a^2}$ | $\cosh at$ | $\frac{s}{s^2 - a^2}$ |
| $e^{at}\sin bt$ | $\frac{b}{(s - a)^2 + b^2}$ | $e^{at}\cos bt$ | $\frac{s - a}{(s - a)^2 + b^2}$ |

And the theorems that extend it:

| Operation | Transform |
|---|---|
| $e^{at}f(t)$ (first shift) | $F(s - a)$ |
| $u(t - a)f(t - a)$ (second shift) | $e^{-as}F(s)$ |
| $tf(t)$ | $-F'(s)$ |
| $\int_0^tf\,d\tau$ | $\frac{F(s)}{s}$ |
| $f * g$ (convolution) | $F(s)G(s)$ |
| periodic, period $T$ | $\frac{1}{1 - e^{-sT}}\int_0^Te^{-st}f\,dt$ |

A decaying exponential factor shifts $s$; on the time axis it pulls a sinusoid inside a shrinking envelope:`,
        {
          type: 'plot',
          alt: 'The damped sinusoid e to the minus 0.5t times sine 3t, oscillating inside the dashed envelope plus and minus e to the minus 0.5t, which shrinks towards zero.',
          caption: 'e^(−0.5t) sin 3t inside its envelope ±e^(−0.5t) (dashed): its transform is 3/((s + 0.5)² + 9), sin 3t with s shifted by 0.5.',
          x: [0, 8],
          y: [-1, 1],
          xLabel: 't',
          yLabel: 'f',
          series: [
            { f: (t) => Math.exp(-0.5 * t) * Math.sin(3 * t), colour: colourOf(0) },
            { f: (t) => Math.exp(-0.5 * t), dashed: true, colour: colourOf(1) },
            { f: (t) => -Math.exp(-0.5 * t), dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$\mathcal{L}\{t^ne^{at}\} = \frac{n!}{(s - a)^{n+1}}$; $\mathcal{L}\{e^{at}\sin bt\} = \frac{b}{(s - a)^2 + b^2}$.`,
        r`$\mathcal L\{tf\} = -F'(s)$; $\mathcal L\left\{\int_0^tf\right\} = \frac{F}{s}$.`,
        r`Convolution in time is a product in $s$: $\mathcal{L}\{f * g\} = FG$.`,
        r`Periodic $f$: $F(s) = \frac{1}{1 - e^{-sT}}\int_0^Te^{-st}f\,dt$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two shifted forms',
          problem: r`Find $\mathcal{L}\{t^2e^{-3t}\}$ and $\mathcal{L}\{e^{-2t}\sin3t\}$.`,
          steps: [
            r`$\frac{2!}{(s + 3)^3} = \frac{2}{(s + 3)^3}$.`,
            r`$\frac{3}{(s + 2)^2 + 9}$.`,
          ],
          answer: r`$\frac{2}{(s + 3)^3}$; $\frac{3}{(s + 2)^2 + 9}$.`,
        },
        {
          level: 'board',
          title: 'Four theorems, and a circuit',
          problem: r`Find (a) $\mathcal L\{t\sin2t\}$, (b) $\mathcal L\{\cosh3t\}$, (c) $\mathcal L\{t^3e^{-2t}\}$, (d) $\mathcal L\left\{\int_0^t\sin2\tau\,d\tau\right\}$. (e) A step $E$ is switched onto a series RLC circuit with no stored energy. Find $I(s)$.`,
          steps: [
            r`(a) $-\frac{d}{ds}\frac{2}{s^2 + 4} = \frac{4s}{(s^2 + 4)^2}$.`,
            r`(b) $\frac{s}{s^2 - 9}$. (c) $\frac{3!}{(s + 2)^4} = \frac{6}{(s + 2)^4}$.`,
            r`(d) $\frac1s\cdot\frac{2}{s^2 + 4} = \frac{2}{s(s^2 + 4)}$.`,
            r`(e) $\frac Es = \left(Ls + R + \frac{1}{Cs}\right)I(s)$, so $I(s) = \frac{E}{Ls^2 + Rs + \frac1C}$.`,
          ],
          answer: r`(a) $\frac{4s}{(s^2 + 4)^2}$; (b) $\frac{s}{s^2 - 9}$; (c) $\frac{6}{(s + 2)^4}$; (d) $\frac{2}{s(s^2 + 4)}$; (e) $\frac{E}{Ls^2 + Rs + 1/C}$.`,
        },
      ],
      traps: [
        r`$e^{-2t}$ shifts $s$ to $s + 2$, not $s - 2$.`,
        r`$\mathcal L\{tf\}$ carries a minus sign: $-F'(s)$.`,
      ],
      check: [
        { q: r`Find $\mathcal L\{t\sin t\}$.`, a: r`$\frac{2s}{(s^2 + 1)^2}$.` },
        { q: r`Find $\mathcal L\left\{\frac{1 - e^{-at}}{a}\right\}$.`, a: r`$\frac1a\left(\frac1s - \frac{1}{s + a}\right) = \frac{1}{s(s + a)}$.` },
      ],
    },
    {
      name: 'Inverse Laplace Transforms',
      inShort: r`Back from $s$ to time: partial fractions, the Heaviside formula, repeated and complex poles.`,
      body: [
        r`To return to time, make $F(s)$ a proper fraction and split it by its **poles** (the roots of the denominator):

| Pole | Term in $F(s)$ | Term in $f(t)$ |
|---|---|---|
| simple, $s = a$ | $\frac{A}{s - a}$, $A = \frac{P(a)}{Q'(a)}$ (Heaviside) | $Ae^{at}$ |
| repeated, $(s - a)^n$ | $\frac{1}{(s - a)^n}$ | $\frac{t^{n-1}e^{at}}{(n - 1)!}$ |
| complex pair | complete the square: $\frac{s - a}{(s - a)^2 + b^2}$, $\frac{b}{(s - a)^2 + b^2}$ | $e^{at}\cos bt$, $e^{at}\sin bt$ |

Two shortcuts: a factor $\frac1s$ means **integrate** the inverse of the rest from $0$ to $t$; a factor $s$ means **differentiate** it. The poles' positions decide the response: left of the imaginary axis they decay, on it they persist, to the right they grow.`,
      ],
      keyIdeas: [
        r`Simple poles: $f(t) = \sum\frac{P(a_k)}{Q'(a_k)}e^{a_kt}$.`,
        r`Repeated pole: $\frac{1}{(s - a)^n} \to \frac{t^{n-1}e^{at}}{(n - 1)!}$.`,
        r`Complex pair: complete the square and read off $e^{at}\cos bt$, $e^{at}\sin bt$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Heaviside',
          problem: r`Find $\mathcal{L}^{-1}\left\{\frac{5}{s(s + 5)}\right\}$.`,
          steps: [
            r`$Q = s^2 + 5s$, $Q' = 2s + 5$. At $s = 0$: $\frac55 = 1$; at $s = -5$: $\frac{5}{-5} = -1$.`,
            r`So $f = 1 - e^{-5t}$.`,
          ],
          answer: r`$1 - e^{-5t}$.`,
        },
        {
          level: 'board',
          title: 'Simple, integrated, complex and repeated poles',
          problem: r`Find the inverse of (a) $\frac{60}{(s + 2)(s + 5)}$, (b) $\frac{1}{s(s + 3)}$ by the $\frac1s$ rule, (c) $\frac{30}{s^2 + 6s + 34}$, (d) $\frac{s + 1}{(s + 2)^2}$.`,
          steps: [
            r`(a) $\frac{60}{3}e^{-2t} + \frac{60}{-3}e^{-5t} = 20\left(e^{-2t} - e^{-5t}\right)$.`,
            r`(b) $\int_0^te^{-3\tau}d\tau = \frac{1 - e^{-3t}}{3}$.`,
            r`(c) $\frac{30}{(s + 3)^2 + 25} = 6\cdot\frac{5}{(s + 3)^2 + 25}$: $6e^{-3t}\sin5t$.`,
            r`(d) $\frac{(s + 2) - 1}{(s + 2)^2} = \frac{1}{s + 2} - \frac{1}{(s + 2)^2}$: $e^{-2t}(1 - t)$.`,
          ],
          answer: r`(a) $20(e^{-2t} - e^{-5t})$; (b) $\frac{1 - e^{-3t}}{3}$; (c) $6e^{-3t}\sin5t$; (d) $e^{-2t}(1 - t)$.`,
        },
      ],
      traps: [
        r`Make the fraction proper first; a constant term in $F(s)$ is an impulse, not an exponential.`,
        r`Inside a completed square, the numerator must be rewritten in $s - a$ too.`,
      ],
      check: [
        { q: r`Find $\mathcal L^{-1}\left\{\frac{6}{s^2 + 4}\right\}$.`, a: r`$3\sin2t$.` },
        { q: r`Find $\mathcal L^{-1}\left\{\frac{2s - 18}{s^2 + 9}\right\}$.`, a: r`$2\cos3t - 6\sin3t$.` },
      ],
    },
    {
      name: 'Fourier Series',
      inShort: r`A periodic wave as a sum of harmonics, and what symmetry tells you for free.`,
      body: [
        r`A periodic function that meets the **Dirichlet conditions** (finite, with finitely many jumps and peaks per period) is a sum of harmonics of its fundamental $\omega = \frac{2\pi}{T}$:
$$f(t) = \frac{a_0}{2} + \sum_{n=1}^\infty(a_n\cos n\omega t + b_n\sin n\omega t), \quad a_n = \frac2T\int_Tf\cos n\omega t\,dt, \quad b_n = \frac2T\int_Tf\sin n\omega t\,dt.$$
$\frac{a_0}{2}$ is the average value. Adding harmonics builds the wave up; at a jump the sum overshoots by about 9% (the Gibbs effect):`,
        {
          type: 'plot',
          alt: 'A square wave switching between plus 1 and minus 1, drawn dashed, with its fundamental sine wave and the sum of its odd harmonics up to the 9th, which follows the square wave closely with small ripples and overshoots at the jumps.',
          caption: 'A ±1 square wave (dashed), its fundamental (4/π) sin t, and the sum to the 9th harmonic hugging the wave.',
          x: [0, 2 * Math.PI],
          y: [-1.6, 1.6],
          xLabel: 't (rad)',
          yLabel: 'f',
          series: [
            { points: [[0, 1], [Math.PI, 1], [Math.PI, -1], [2 * Math.PI, -1]], dashed: true, colour: colourOf(1) },
            { f: (t) => squareSum(t, 1), colour: colourOf(2) },
            { f: (t) => squareSum(t, 9), colour: colourOf(0) },
          ],
          legend: false,
        },
        r`| Symmetry | Consequence |
|---|---|
| even, $f(-t) = f(t)$ | cosines only ($b_n = 0$): a half-range cosine series |
| odd, $f(-t) = -f(t)$ | sines only ($a_n = 0$): a half-range sine series |
| half-wave, $f(t + \frac T2) = -f(t)$ | odd harmonics only |

The **exponential form** is $f = \sum c_ne^{jn\omega t}$ with $c_n = \frac1T\int_Tfe^{-jn\omega t}dt$. **Parseval**: the mean square is $\left(\frac{a_0}{2}\right)^2 + \frac12\sum(a_n^2 + b_n^2)$, which gives the rms of a distorted wave.`,
      ],
      keyIdeas: [
        r`$a_n = \frac2T\int f\cos n\omega t\,dt$, $b_n = \frac2T\int f\sin n\omega t\,dt$; $\frac{a_0}{2}$ is the average.`,
        r`Even: no sines. Odd: no cosines. Half-wave symmetry: odd harmonics only.`,
        r`Square wave $\pm A$: $\frac{4A}{\pi}\sum_{\text{odd}}\frac{\sin n\omega t}{n}$. Parseval gives the rms of a distorted wave.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A square wave',
          problem: r`A $\pm10$ V square wave. Find the amplitudes of its fundamental and third harmonic.`,
          steps: [
            r`$\frac{4(10)}{\pi} \approx 12.73$ V and $\frac{40}{3\pi} \approx 4.24$ V.`,
            r`It has half-wave symmetry, so there is no second harmonic.`,
          ],
          answer: r`About 12.73 V and 4.24 V.`,
        },
        {
          level: 'board',
          title: 'Reading a series, an rms, a half-range series',
          problem: r`(a) $f(t) = 6\cos30\pi t + 2\cos90\pi t$. Find the fundamental frequency and $f(0.1)$. (b) Find the rms of $v = 10 + 8\sin\omega t + 6\sin3\omega t$. (c) Find the half-range sine series of $f = 1$ on $(0, \pi)$.`,
          steps: [
            r`(a) $30\pi = 2\pi f$, so 15 Hz (the $90\pi$ term is the third harmonic). $f(0.1) = 6\cos3\pi + 2\cos9\pi = -8$.`,
            r`(b) $\sqrt{10^2 + \frac{8^2}{2} + \frac{6^2}{2}} = \sqrt{150} = 12.247$.`,
            r`(c) $b_n = \frac2\pi\int_0^\pi\sin nx\,dx = \frac{2(1 - \cos n\pi)}{n\pi}$: $\frac{4}{n\pi}$ for odd $n$, 0 for even. So $f = \frac4\pi\left(\sin x + \frac{\sin3x}{3} + \cdots\right)$.`,
          ],
          answer: r`(a) 15 Hz, $-8$; (b) about 12.247; (c) $\frac4\pi\sum_{\text{odd}}\frac{\sin nx}{n}$.`,
        },
      ],
      traps: [
        r`The fundamental of a square wave is larger than the wave's own height: $\frac{4}{\pi} \approx 1.27$ times.`,
        r`The rms of a harmonic is its amplitude over $\sqrt2$; the DC term counts in full.`,
      ],
      check: [
        { q: r`What is the fundamental frequency of $5\cos20\pi t + 2\cos40\pi t + \cos80\pi t$?`, a: r`10 Hz.` },
        { q: r`An odd function's series has which terms?`, a: r`Sines only.` },
      ],
    },
    {
      name: 'Fourier Transforms',
      inShort: r`The spectrum of a signal that does not repeat.`,
      body: [
        r`A signal that never repeats has a continuous spectrum, its **Fourier transform**
$$F(\omega) = \int_{-\infty}^\infty f(t)e^{-j\omega t}dt, \qquad f(t) = \frac{1}{2\pi}\int_{-\infty}^\infty F(\omega)e^{j\omega t}d\omega.$$

| $f(t)$ | $F(\omega)$ |
|---|---|
| pulse of height $A$, width $\tau$, centred | $\frac{2A\sin(\omega\tau/2)}{\omega} = A\tau\operatorname{sinc}$ |
| $e^{-at}u(t)$ | $\frac{1}{a + j\omega}$ |
| $\delta(t)$ | $1$ |
| $f(t - t_0)$ (delay) | $e^{-j\omega t_0}F(\omega)$: phase only |
| $f * g$ | $FG$ |

A short pulse spreads wide in frequency: its spectrum's first zero is at $\omega = \frac{2\pi}{\tau}$, that is $f = \frac1\tau$.`,
        {
          type: 'plot',
          alt: 'The spectrum 4 sine of 0.75 omega over omega of a pulse 2 high and 1.5 seconds wide: a central lobe of height 3 at omega equals 0, first zeros at plus and minus 4.19 radians per second, and smaller side lobes alternating in sign.',
          caption: 'The spectrum of a pulse 2 high and 1.5 s wide: F(0) = 3, the area of the pulse, and first zeros at ±2π/1.5 = ±4.19 rad/s.',
          x: [-15, 15],
          y: [-1, 3.5],
          xLabel: 'ω (rad/s)',
          yLabel: 'F(ω)',
          series: [{ f: pulseSpectrum, colour: colourOf(0) }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$F(\omega) = \int f(t)e^{-j\omega t}dt$.`,
        r`Pulse of height $A$, width $\tau$: $\frac{2A\sin(\omega\tau/2)}{\omega}$; $e^{-at}u(t)$: $\frac{1}{a + j\omega}$.`,
        r`A delay changes only the phase; convolution becomes multiplication.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A pulse',
          problem: r`A pulse of height $2$ and width $1.5$ s. Find $F(0)$ and the first zero of its spectrum.`,
          steps: [
            r`$F(\omega) = \frac{4\sin(0.75\omega)}{\omega}$, so $F(0) = A\tau = 3$.`,
            r`The first zero is at $\omega = \frac{2\pi}{1.5} \approx 4.19$ rad/s.`,
          ],
          answer: r`3; about 4.19 rad/s.`,
        },
        {
          level: 'board',
          title: 'A short pulse, an exponential, a delay',
          problem: r`(a) A pulse 5 V high lasts 0.4 ms. Find $F(0)$ and its first spectral zero in hertz. (b) For $e^{-3t}u(t)$, find $|F|$ and the phase at $\omega = 4$ rad/s. (c) What does delaying a signal by 2 s do to its transform?`,
          steps: [
            r`(a) $F(0) = 5(0.4 \times 10^{-3}) = 2 \times 10^{-3}$ V·s; first zero at $\frac1\tau = 2500$ Hz.`,
            r`(b) $\frac{1}{3 + j4}$: $|F| = \frac15 = 0.2$, phase $-\tan^{-1}\frac43 = -53.13^\circ$.`,
            r`(c) It multiplies by $e^{-j2\omega}$: the magnitude is unchanged, the phase falls by $2\omega$.`,
          ],
          answer: r`(a) $2 \times 10^{-3}$ V·s, 2500 Hz; (b) 0.2 at $-53.13^\circ$; (c) $\times e^{-j2\omega}$.`,
        },
      ],
      traps: [
        r`Narrow in time means wide in frequency: halving the pulse doubles the bandwidth.`,
        r`$F(0)$ is the area under $f(t)$, not its peak.`,
      ],
      check: [
        { q: r`What is the transform of a unit impulse?`, a: r`$1$, at every frequency.` },
        { q: r`A pulse's width doubles. What happens to its first spectral zero?`, a: r`It halves.` },
      ],
    },
    {
      name: 'Power Series',
      inShort: r`Functions as infinite polynomials: where they converge and how well truncations do.`,
      body: [
        r`A **power series** $\sum a_n(x - c)^n$ converges inside an interval $|x - c| < R$. The **ratio test** finds the radius: if $\lim\left|\frac{a_{n+1}}{a_n}\right| = L$, then $R = \frac1L$; the end points need checking separately. Outside, the partial sums run away:`,
        {
          type: 'plot',
          alt: 'The function 1 over 1 minus x from minus 2 to 0.9, with dashed partial sums of its geometric series with 4 and 8 terms. Inside minus 1 to 1 the partial sums follow the curve; to the left of minus 1 they swing away.',
          caption: '1/(1 − x) = 1 + x + x² + ⋯ only for |x| < 1: the 4-term and 8-term partial sums (dashed) follow it inside and swing away beyond x = −1.',
          x: [-2, 0.9],
          y: [-2, 6],
          xLabel: 'x',
          yLabel: 'y',
          series: [
            { f: (x) => 1 / (1 - x), colour: colourOf(0) },
            { f: (x) => (1 - x ** 4) / (1 - x), dashed: true, colour: colourOf(1) },
            { f: (x) => (1 - x ** 8) / (1 - x), dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`| Series | Valid for |
|---|---|
| $e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$ | all $x$ |
| $\sin x = x - \frac{x^3}{3!} + \frac{x^5}{5!} - \cdots$, $\cos x = 1 - \frac{x^2}{2!} + \frac{x^4}{4!} - \cdots$ | all $x$ |
| $\ln(1 + x) = x - \frac{x^2}{2} + \frac{x^3}{3} - \cdots$ | $-1 < x \le 1$ |
| $\frac{1}{1 - x} = 1 + x + x^2 + \cdots$ | $|x| < 1$ |
| $(1 + x)^k = 1 + kx + \frac{k(k - 1)}{2!}x^2 + \cdots$ | $|x| < 1$ |

Putting $jx$ into the series for $e^x$ and sorting real and imaginary terms gives **Euler's formula** $e^{jx} = \cos x + j\sin x$. Series also integrate what has no closed form, term by term. For an alternating series the error is below the first term left out.`,
      ],
      keyIdeas: [
        r`Ratio test: $\lim\left|\frac{a_{n+1}}{a_n}\right| < 1$ converges; the radius $R$ follows.`,
        r`$e^x = \sum\frac{x^n}{n!}$, $\sin x$, $\cos x$, $\ln(1 + x)$, $\frac{1}{1 - x}$; Taylor about $a$.`,
        r`Alternating series: the error is below the first term left out.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A radius, and an estimate',
          problem: r`Find the radius of convergence of $\sum\frac{x^n}{n2^n}$, and estimate $e^{0.1}$ with three terms.`,
          steps: [
            r`$\left|\frac{a_{n+1}}{a_n}\right| \to \frac{|x|}{2}$, so $R = 2$.`,
            r`$e^{0.1} \approx 1 + 0.1 + 0.005 = 1.105$ (true $1.10517$).`,
          ],
          answer: r`$R = 2$; about 1.105.`,
        },
        {
          level: 'board',
          title: 'An integral with no closed form, a logarithm, an interval',
          problem: r`(a) Evaluate $\int_0^1\frac{\sin x}{x}\,dx$ by series. (b) Estimate $\ln1.2$ with four terms. (c) Find the interval of convergence of $\sum\frac{(x - 3)^n}{n4^n}$.`,
          steps: [
            r`(a) $\frac{\sin x}{x} = 1 - \frac{x^2}{6} + \frac{x^4}{120} - \frac{x^6}{5040} + \cdots$; integrated from 0 to 1: $1 - \frac1{18} + \frac1{600} - \frac1{35\,280} = 0.946083$.`,
            r`(b) $0.2 - 0.02 + 0.002667 - 0.0004 = 0.182267$ (true $0.182322$).`,
            r`(c) The ratio tends to $\frac{|x - 3|}{4}$, so $|x - 3| < 4$: $-1 < x < 7$. At $x = 7$ the series is harmonic (diverges); at $x = -1$ it alternates (converges). So $-1 \le x < 7$.`,
          ],
          answer: r`(a) about 0.946083; (b) about 0.182267; (c) $-1 \le x < 7$.`,
        },
      ],
      traps: [
        r`The ratio test says nothing at the end points; check $x = \pm R$ separately.`,
        r`$\ln(1 + x)$ alternates in sign; $-\ln(1 - x)$ does not.`,
      ],
      check: [
        { q: r`What relation do the series of $e^x$, $\cos x$ and $\sin x$ show?`, a: r`$e^{jx} = \cos x + j\sin x$.` },
        { q: r`What is the radius of convergence of $\sum\frac{x^n}{n!}$?`, a: r`Infinite: the ratio $\frac{|x|}{n + 1} \to 0$.` },
      ],
    },
    {
      name: 'Z-Transforms',
      inShort: r`The Laplace transform's counterpart for sampled sequences.`,
      body: [
        r`For a sequence $x[n]$, $n = 0, 1, 2, \ldots$, the **z-transform** is $X(z) = \sum_{n=0}^\infty x[n]z^{-n}$. It turns difference equations into algebra as the Laplace transform does differential ones:

| $x[n]$ | $X(z)$ |
|---|---|
| $\delta[n]$ (unit sample) | $1$ |
| $u[n]$ (unit step) | $\frac{z}{z - 1}$ |
| $a^n$ | $\frac{z}{z - a}$ |
| $na^n$ | $\frac{az}{(z - a)^2}$ |
| $x[n - k]$ (delay) | $z^{-k}X(z)$ |

The poles decide the behaviour: inside the unit circle the sequence decays, on it it persists, outside it grows. The **final value** of a settling sequence is $\lim_{z \to 1}(z - 1)X(z)$:`,
        {
          type: 'plot',
          alt: 'A stem plot of the sequence 0.5 to the power n for n from 0 to 8: stems of height 1, 0.5, 0.25 and so on, halving each sample.',
          caption: 'The sequence 0.5ⁿ, transform z/(z − 0.5): its pole at 0.5 lies inside the unit circle, so each sample is half the last.',
          x: [-0.5, 8.5],
          y: [0, 1.2],
          xLabel: 'n',
          yLabel: 'x[n]',
          series: range(0, 8, 8).map((n) => ({ points: [[n, 0], [n, 0.5 ** n]], colour: colourOf(0) })),
          legend: false,
        },
      ],
      keyIdeas: [
        r`$X(z) = \sum x[n]z^{-n}$; $a^nu[n] \to \frac{z}{z - a}$, $u[n] \to \frac{z}{z - 1}$.`,
        r`A delay of $k$ samples multiplies by $z^{-k}$.`,
        r`Final value: $\lim_{z \to 1}(z - 1)X(z)$; poles inside the unit circle decay.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A geometric sequence',
          problem: r`$X(z) = \frac{z}{z - 0.5}$. Find $x[3]$, and the final value of $1 - 0.5^n$.`,
          steps: [
            r`$x[n] = 0.5^n$, so $x[3] = 0.125$.`,
            r`$1 - 0.5^n$ settles at $1$; the theorem agrees: $(z - 1)\left[\frac{z}{z - 1} - \frac{z}{z - 0.5}\right] \to 1$.`,
          ],
          answer: r`0.125; 1.`,
        },
        {
          level: 'board',
          title: 'An inverse, a difference equation, a delay',
          problem: r`(a) Find $x[n]$ for $X(z) = \frac{z}{(z - 1)(z - 0.5)}$, its first three samples and its final value. (b) A filter obeys $y[n] = 0.5y[n - 1] + x[n]$. Find its transfer function and impulse response. (c) What is the transform of $x[n - 2]$?`,
          steps: [
            r`(a) $\frac{X}{z} = \frac{1}{(z - 1)(z - 0.5)} = \frac{2}{z - 1} - \frac{2}{z - 0.5}$, so $x[n] = 2 - 2(0.5)^n$: $0, 1, 1.5, \ldots$, settling at 2.`,
            r`Final value check: $\lim_{z \to 1}\frac{z}{z - 0.5} = 2$.`,
            r`(b) $Y = 0.5z^{-1}Y + X$, so $H(z) = \frac{z}{z - 0.5}$ and $h[n] = 0.5^n$.`,
            r`(c) $z^{-2}X(z)$.`,
          ],
          answer: r`(a) $2 - 2(0.5)^n$: 0, 1, 1.5; 2; (b) $\frac{z}{z - 0.5}$, $0.5^n$; (c) $z^{-2}X(z)$.`,
        },
      ],
      traps: [
        r`The final value theorem needs a settling sequence; with a pole outside the unit circle it gives nonsense.`,
        r`Split $\frac{X(z)}{z}$, not $X(z)$, by partial fractions: that keeps the $z$ in each numerator.`,
      ],
      check: [
        { q: r`Is $x[n] = 1.2^n$ stable?`, a: r`No: its pole, 1.2, is outside the unit circle.` },
        { q: r`What is the z-transform of the unit step?`, a: r`$\frac{z}{z - 1}$.` },
      ],
    },
    {
      name: 'Bessel and Legendre Functions',
      inShort: r`Special functions from equations with variable coefficients: drums and cylinders, spheres.`,
      body: [
        r`Separating variables in cylinders (vibrating drums, waveguides, skin effect in round conductors) gives **Bessel's equation**
$$x^2y'' + xy' + (x^2 - n^2)y = 0,$$
solved by the Bessel functions $J_n(x)$ (finite at 0) and $Y_n(x)$ (infinite there). They oscillate like slowly decaying cosines and sines:`,
        {
          type: 'plot',
          alt: 'The Bessel functions J0 and J1 from 0 to 15. J0 starts at 1 and J1 at 0; both oscillate with slowly shrinking swings. J0 first crosses zero at 2.405, marked by a dashed line.',
          caption: 'J₀ (starting at 1) and J₁ (starting at 0): J₀ first vanishes at x = 2.405 (dashed), the drum-head and waveguide constant.',
          x: [0, 15],
          y: [-0.6, 1.1],
          xLabel: 'x',
          yLabel: 'J',
          series: [
            { f: (x) => besselJ(0, x), colour: colourOf(0) },
            { f: (x) => besselJ(1, x), dashed: true, colour: colourOf(1) },
          ],
          marks: [{ x: 2.405 }],
          legend: false,
        },
        r`| Property | Bessel | Legendre |
|---|---|---|
| equation | $x^2y'' + xy' + (x^2 - n^2)y = 0$ | $(1 - x^2)y'' - 2xy' + n(n + 1)y = 0$ |
| arises in | cylinders | spheres |
| first few | $J_0(0) = 1$, $J_n(0) = 0$ for $n \ge 1$ | $P_0 = 1$, $P_1 = x$, $P_2 = \frac{3x^2 - 1}{2}$, $P_3 = \frac{5x^3 - 3x}{2}$ |
| recurrence | $J_{n-1} + J_{n+1} = \frac{2n}{x}J_n$; $J_0' = -J_1$ | $(n + 1)P_{n+1} = (2n + 1)xP_n - nP_{n-1}$ |
| orthogonality | on $[0, a]$ with weight $x$ | $\int_{-1}^1P_mP_n\,dx = 0$ ($m \ne n$), $= \frac{2}{2n + 1}$ ($m = n$) |

**Rodrigues' formula** generates every Legendre polynomial: $P_n = \frac{1}{2^nn!}\frac{d^n}{dx^n}(x^2 - 1)^n$. And $P_n(1) = 1$ always.`,
      ],
      keyIdeas: [
        r`Bessel: $x^2y'' + xy' + (x^2 - n^2)y = 0$, solved by $J_n$ (and $Y_n$, singular at $0$).`,
        r`$J_{n-1} + J_{n+1} = \frac{2n}{x}J_n$; $J_0' = -J_1$; $J_0$ first vanishes at $2.405$.`,
        r`Legendre: $P_0 = 1$, $P_1 = x$, $P_2 = \frac{3x^2 - 1}{2}$; orthogonal on $[-1, 1]$; Rodrigues gives them all.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two values',
          problem: r`Evaluate $P_2(0.5)$, and give the first zero of $J_0$.`,
          steps: [
            r`$P_2(0.5) = \frac{3(0.25) - 1}{2} = -0.125$.`,
            r`$J_0$ first vanishes at $x \approx 2.405$.`,
          ],
          answer: r`$-0.125$; about 2.405.`,
        },
        {
          level: 'board',
          title: 'A recurrence, a cubic, an orthogonality integral',
          problem: r`(a) Given $J_0(1) = 0.765198$ and $J_1(1) = 0.440051$, find $J_2(1)$. (b) Evaluate $P_3(0.5)$. (c) Evaluate $\int_{-1}^1P_1P_2\,dx$ and $\int_{-1}^1P_2^2\,dx$.`,
          steps: [
            r`(a) With $n = 1$: $J_2 = \frac2xJ_1 - J_0 = 0.880102 - 0.765198 = 0.114904$.`,
            r`(b) $\frac{5(0.125) - 1.5}{2} = -0.4375$.`,
            r`(c) Orthogonal: $0$. And $\frac{2}{2(2) + 1} = \frac25$.`,
          ],
          answer: r`(a) about 0.114904; (b) $-0.4375$; (c) $0$ and $\frac25$.`,
        },
      ],
      traps: [
        r`$P_n(1) = 1$ for every $n$: a quick check on any Legendre polynomial you derive.`,
        r`$Y_n$ is infinite at $x = 0$: a solid cylinder or drum uses $J_n$ alone.`,
      ],
      check: [
        { q: r`What is $J_1(0)$?`, a: r`$0$.` },
        { q: r`What is $P_2(1)$?`, a: r`$1$.` },
      ],
    },
    {
      name: 'Partial Differential Equations',
      inShort: r`The heat, wave and Laplace equations, and separation of variables.`,
      body: [
        r`Three equations cover most of physics, classified like conics by $B^2 - 4AC$ for $Au_{xx} + Bu_{xy} + Cu_{yy} + \cdots = 0$:

| Equation | Form | Type | Models |
|---|---|---|---|
| heat (diffusion) | $u_t = c^2u_{xx}$ | parabolic ($B^2 - 4AC = 0$) | temperature, charge on a cable |
| wave | $u_{tt} = c^2u_{xx}$ | hyperbolic ($> 0$) | strings, transmission lines |
| Laplace | $u_{xx} + u_{yy} = 0$ | elliptic ($< 0$) | steady temperature, electrostatic potential |

**Separation of variables** tries $u = X(x)T(t)$; the boundary conditions pick the modes, and the initial condition their sizes. For the heat equation on $[0, L]$ with both ends held at zero, each mode $\sin\frac{n\pi x}{L}$ decays at its own rate $e^{-(n\pi c/L)^2t}$, so sharp detail fades first:`,
        {
          type: 'plot',
          alt: 'Three temperature profiles of a rod from 0 to pi, starting as sine x plus sine 3x with two humps and a dip between, then at time 0.2 with the dip nearly filled, and at time 1 a single low arch.',
          caption: 'A rod starting at sin x + sin 3x: the third mode decays 9 times faster, so by t = 0.2 (dashed) the ripple has nearly gone, and by t = 1 only a low arch is left.',
          x: [0, Math.PI],
          y: [-0.5, 2],
          xLabel: 'x',
          yLabel: 'u',
          series: [0, 0.2, 1].map((t, i) => ({ f: (x) => Math.exp(-t) * Math.sin(x) + Math.exp(-9 * t) * Math.sin(3 * x), dashed: i === 1, colour: colourOf(i) })),
          legend: false,
        },
        r`The wave equation's general solution is d'Alembert's $u = f(x - ct) + g(x + ct)$: two shapes travelling in opposite directions at speed $c$. A string of length $L$ fixed at both ends vibrates at $f_n = \frac{nc}{2L}$.`,
      ],
      keyIdeas: [
        r`Heat $u_t = c^2u_{xx}$: modes $\sin\frac{n\pi x}{L}e^{-(n\pi c/L)^2t}$, high harmonics fading first.`,
        r`Wave $u_{tt} = c^2u_{xx}$: $f(x - ct) + g(x + ct)$; a string's frequencies $\frac{nc}{2L}$.`,
        r`Classify by $B^2 - 4AC$: elliptic, parabolic, hyperbolic.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A heated rod, and a classification',
          problem: r`A rod of length $\pi$ ($c = 1$, ends at $0$) starts at $u = \sin x + \sin3x$. Find $u(x, t)$, and classify $u_{xx} + 4u_{xy} + 4u_{yy} = 0$.`,
          steps: [
            r`Each mode decays on its own: $u = e^{-t}\sin x + e^{-9t}\sin3x$.`,
            r`$B^2 - 4AC = 16 - 16 = 0$: parabolic.`,
          ],
          answer: r`$u = e^{-t}\sin x + e^{-9t}\sin3x$; parabolic.`,
        },
        {
          level: 'board',
          title: 'A string, two classifications, a fading mode',
          problem: r`(a) A string 0.5 m long carries waves at 200 m/s. Find its fundamental and third harmonic. (b) Classify $u_{xx} - 4u_{yy} = 0$ and $u_{xx} + u_{yy} = 0$. (c) In a rod of length 2 ($c = 1$, ends at zero), how long does the first mode take to halve?`,
          steps: [
            r`(a) $f_1 = \frac{200}{2(0.5)} = 200$ Hz; $f_3 = 600$ Hz.`,
            r`(b) $0 - 4(1)(-4) = 16 > 0$: hyperbolic (a wave). $0 - 4 < 0$: elliptic (Laplace).`,
            r`(c) The first mode decays as $e^{-(\pi/2)^2t}$: half at $t = \frac{\ln2}{\pi^2/4} = 0.2809$.`,
          ],
          answer: r`(a) 200 Hz and 600 Hz; (b) hyperbolic, elliptic; (c) about 0.2809.`,
        },
      ],
      traps: [
        r`In the heat solution the decay rate grows with $n^2$, not $n$.`,
        r`The string's fundamental uses $2L$: the string is half a wavelength long.`,
      ],
      check: [
        { q: r`Which PDE type is the heat equation?`, a: r`Parabolic.` },
        { q: r`What does $f(x - ct)$ describe?`, a: r`A shape moving right at speed $c$, unchanged.` },
      ],
    },
    {
      name: 'Functions of a Complex Variable',
      inShort: r`Analytic functions, and contour integrals by Cauchy and residues.`,
      body: [
        r`A function $f(z) = u(x, y) + jv(x, y)$ is **analytic** (differentiable in the complex sense) where the **Cauchy-Riemann** equations hold:
$$u_x = v_y, \qquad u_y = -v_x.$$
Polynomials, $e^z$, $\sin z$ and their combinations are analytic everywhere; a fraction is analytic except at its **poles**, where the denominator vanishes.

| Theorem | Statement |
|---|---|
| Cauchy | $\oint f\,dz = 0$ around a contour with $f$ analytic inside |
| Cauchy integral formula | $\oint\frac{f(z)}{z - z_0}dz = 2\pi jf(z_0)$, $z_0$ inside |
| residues | $\oint f\,dz = 2\pi j\sum(\text{residues inside})$; a simple pole's residue is $\frac{P(z_0)}{Q'(z_0)}$ |

Only the poles **inside** the contour count:`,
        {
          type: 'plot',
          equal: true,
          alt: 'The complex plane with the circle of radius 2 about the origin, a small dashed circle about the point j, and the two poles of 1 over z squared plus 1 at j and minus j. The big circle encloses both poles, the small one only the pole at j.',
          caption: 'Poles of 1/(z² + 1) at ±j: the circle |z| = 2 encloses both (residues cancel, integral 0); the small dashed circle about j encloses one (integral π).',
          x: [-2.5, 2.5],
          y: [-2.5, 2.5],
          xLabel: 'Re z',
          yLabel: 'Im z',
          series: [
            { points: range(0, 2 * Math.PI, 120).map((t) => [2 * Math.cos(t), 2 * Math.sin(t)]), colour: colourOf(0) },
            { points: range(0, 2 * Math.PI, 60).map((t) => [0.5 * Math.cos(t), 1 + 0.5 * Math.sin(t)]), dashed: true, colour: colourOf(1) },
          ],
          marks: [{ at: [0, 1] }, { at: [0, -1] }],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Analytic: $u_x = v_y$, $u_y = -v_x$ (Cauchy-Riemann).`,
        r`$\oint f\,dz = 0$ for analytic $f$; $f(z_0) = \frac{1}{2\pi j}\oint\frac{f}{z - z_0}dz$.`,
        r`$\oint f\,dz = 2\pi j\sum\text{Res}$; a simple pole's residue is $\frac{P(z_0)}{Q'(z_0)}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One pole, then two',
          problem: r`Evaluate $\oint\frac{dz}{z^2 + 1}$ around a small circle about $j$, and around $|z| = 2$.`,
          steps: [
            r`Residue at $j$: $\frac{1}{2j}$, so the first is $2\pi j\cdot\frac{1}{2j} = \pi$.`,
            r`Around $|z| = 2$ both poles count: $\frac{1}{2j} - \frac{1}{2j} = 0$, so the integral is $0$.`,
          ],
          answer: r`$\pi$; $0$.`,
        },
        {
          level: 'board',
          title: 'Cauchy-Riemann, the integral formula, residues',
          problem: r`(a) Is $f = x^2 - y^2 + j2xy$ analytic? (b) Evaluate $\oint\frac{e^z}{z - 1}dz$ around $|z| = 2$. (c) Evaluate $\oint\frac{3z + 1}{z(z - 2)}dz$ around $|z| = 3$ and around $|z| = 1$.`,
          steps: [
            r`(a) $u_x = 2x = v_y$ and $u_y = -2y = -v_x$: yes, it is $z^2$.`,
            r`(b) $z_0 = 1$ is inside: $2\pi je^1 = j17.079$.`,
            r`(c) Residues: at $0$, $\frac{1}{-2} = -0.5$; at $2$, $\frac72 = 3.5$. Around $|z| = 3$ both: $2\pi j(3) = 6\pi j$. Around $|z| = 1$ only $z = 0$: $-\pi j$.`,
          ],
          answer: r`(a) yes; (b) $j17.079$; (c) $6\pi j$ and $-\pi j$.`,
        },
      ],
      traps: [
        r`Only poles inside the contour count; check each one's distance from the centre.`,
        r`$\bar z = x - jy$ fails Cauchy-Riemann everywhere: not every smooth-looking function is analytic.`,
      ],
      check: [
        { q: r`What is $\oint z^2\,dz$ around any closed contour?`, a: r`$0$: $z^2$ is analytic everywhere.` },
        { q: r`What is the residue of $\frac{1}{z - 3}$ at $z = 3$?`, a: r`$1$.` },
      ],
    },
  ],
};
