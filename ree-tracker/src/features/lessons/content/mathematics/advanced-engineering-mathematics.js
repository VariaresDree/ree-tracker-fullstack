// Library › Lessons › Mathematics › Advanced Engineering Mathematics
// (2026-11-17): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order; every worked example checked by hand.
const r = String.raw;

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
      keyIdeas: [
        r`$(AB)_{ij} = \sum_k a_{ik}b_{kj}$; $AB \ne BA$ in general; $(AB)^{-1} = B^{-1}A^{-1}$.`,
        r`$\det(AB) = \det A\det B$, $\det(kA) = k^n\det A$; a row swap flips the sign.`,
        r`Cofactor expansion along any row or column; $A^{-1} = \frac{\text{adj}A}{\det A}$.`,
      ],
      example: {
        problem: r`Find $\det\begin{bmatrix}2 & -1 & 3\\ 0 & 4 & 1\\ 5 & 2 & -2\end{bmatrix}$.`,
        solution: r`Along row 1: $2(-8 - 2) + 1(0 - 5) + 3(0 - 20) = -20 - 5 - 60 = -85$.`,
      },
      traps: [r`The cofactor signs alternate: the middle term of a row-1 expansion is subtracted.`],
    },
    {
      name: 'Systems of Linear Equations',
      inShort: r`Linear systems in matrix form, and when they have one solution, many or none.`,
      keyIdeas: [
        r`$AX = B$; with $\det A \ne 0$, $X = A^{-1}B$ (or Cramer's rule).`,
        r`Unique when $\text{rank}A = \text{rank}[A|B] = n$; none when $\text{rank}A < \text{rank}[A|B]$.`,
        r`$AX = 0$ has a nontrivial solution exactly when $\det A = 0$.`,
      ],
      example: {
        problem: r`Solve $x + y + z = 6$, $2y + 5z = -4$, $2x + 5y - z = 27$.`,
        solution: r`Eliminating (or with the calculator's equation mode): $x = 5$, $y = 3$, $z = -2$. Check: $5 + 3 - 2 = 6$, $6 - 10 = -4$, $10 + 15 + 2 = 27$.`,
      },
      traps: [r`$X = A^{-1}B$: the inverse multiplies from the left.`],
    },
    {
      name: 'Eigenvalues and Eigenvectors',
      inShort: r`Directions a matrix only stretches, and by how much.`,
      keyIdeas: [
        r`$\det(A - \lambda I) = 0$ for $\lambda$; $(A - \lambda I)\mathbf v = 0$ for $\mathbf v$.`,
        r`$\sum\lambda = \text{tr}A$, $\prod\lambda = \det A$; triangular matrices show them on the diagonal.`,
        r`$A^k$ has $\lambda^k$, $A^{-1}$ has $\frac1\lambda$; $A = PDP^{-1}$ makes powers easy. Cayley-Hamilton: $p(A) = 0$.`,
      ],
      example: {
        problem: r`Find the eigenvalues and eigenvectors of $\begin{bmatrix}4 & 1\\ 2 & 3\end{bmatrix}$.`,
        solution: r`$\lambda^2 - 7\lambda + 10 = 0$: $\lambda = 5$ with $(1, 1)$, and $\lambda = 2$ with $(1, -2)$. Check: $5 + 2 = 7$ (trace), $5 \times 2 = 10$ (determinant).`,
      },
      traps: [r`An eigenvector is never the zero vector, and any multiple of one is as good.`],
    },
    {
      name: 'Laplace Transforms',
      inShort: r`Transforms beyond the basic table: shifted powers, damped sinusoids, convolution and periodic signals.`,
      keyIdeas: [
        r`$\mathcal{L}\{t^ne^{at}\} = \frac{n!}{(s - a)^{n+1}}$; $\mathcal{L}\{e^{at}\sin bt\} = \frac{b}{(s - a)^2 + b^2}$.`,
        r`Convolution in time is a product in $s$: $\mathcal{L}\{f * g\} = FG$.`,
        r`Periodic $f$: $F(s) = \frac{1}{1 - e^{-sT}}\int_0^Te^{-st}f\,dt$.`,
      ],
      example: {
        problem: r`Find $\mathcal{L}\{t^2e^{-3t}\}$ and $\mathcal{L}\{e^{-2t}\sin3t\}$.`,
        solution: r`$\frac{2!}{(s + 3)^3} = \frac{2}{(s + 3)^3}$, and $\frac{3}{(s + 2)^2 + 9}$.`,
      },
      traps: [r`$e^{-2t}$ shifts $s$ to $s + 2$, not $s - 2$.`],
    },
    {
      name: 'Inverse Laplace Transforms',
      inShort: r`Back from $s$ to time: partial fractions, the Heaviside formula, repeated and complex poles.`,
      keyIdeas: [
        r`Simple poles: $f(t) = \sum\frac{P(a_k)}{Q'(a_k)}e^{a_kt}$.`,
        r`Repeated pole: $\frac{1}{(s - a)^n} \to \frac{t^{n-1}e^{at}}{(n - 1)!}$.`,
        r`Complex pair: complete the square and read off $e^{at}\cos bt$, $e^{at}\sin bt$.`,
      ],
      example: {
        problem: r`Find $\mathcal{L}^{-1}\left\{\frac{5}{s(s + 5)}\right\}$.`,
        solution: r`$Q = s^2 + 5s$, $Q' = 2s + 5$. At $s = 0$: $\frac55 = 1$; at $s = -5$: $\frac{5}{-5} = -1$. So $f = 1 - e^{-5t}$.`,
      },
      traps: [r`Make the fraction proper first; a constant term in $F(s)$ is an impulse, not an exponential.`],
    },
    {
      name: 'Fourier Series',
      inShort: r`A periodic wave as a sum of harmonics, and what symmetry tells you for free.`,
      keyIdeas: [
        r`$a_n = \frac2T\int f\cos n\omega t\,dt$, $b_n = \frac2T\int f\sin n\omega t\,dt$; $\frac{a_0}{2}$ is the average.`,
        r`Even: no sines. Odd: no cosines. Half-wave symmetry: odd harmonics only.`,
        r`Square wave $\pm A$: $\frac{4A}{\pi}\sum_{\text{odd}}\frac{\sin n\omega t}{n}$. Parseval gives the rms of a distorted wave.`,
      ],
      example: {
        problem: r`A $\pm10$ V square wave. Find the amplitudes of its fundamental and third harmonic.`,
        solution: r`$\frac{4(10)}{\pi} \approx 12.73$ V and $\frac{40}{3\pi} \approx 4.24$ V. There is no second harmonic.`,
      },
      traps: [r`The fundamental of a square wave is larger than the wave's own height: $\frac{4}{\pi} \approx 1.27$ times.`],
    },
    {
      name: 'Fourier Transforms',
      inShort: r`The spectrum of a signal that does not repeat.`,
      keyIdeas: [
        r`$F(\omega) = \int f(t)e^{-j\omega t}dt$.`,
        r`Pulse of height $A$, width $\tau$: $\frac{2A\sin(\omega\tau/2)}{\omega}$; $e^{-at}u(t)$: $\frac{1}{a + j\omega}$.`,
        r`A delay changes only the phase; convolution becomes multiplication.`,
      ],
      example: {
        problem: r`A pulse of height $2$ and width $1.5$ s. Find $F(0)$ and the first zero of its spectrum.`,
        solution: r`$F(\omega) = \frac{4\sin(0.75\omega)}{\omega}$, so $F(0) = A\tau = 3$; the first zero is at $\omega = \frac{2\pi}{1.5} \approx 4.19$ rad/s.`,
      },
      traps: [r`Narrow in time means wide in frequency: halving the pulse doubles the bandwidth.`],
    },
    {
      name: 'Power Series',
      inShort: r`Functions as infinite polynomials: where they converge and how well truncations do.`,
      keyIdeas: [
        r`Ratio test: $\lim\left|\frac{a_{n+1}}{a_n}\right| < 1$ converges; the radius $R$ follows.`,
        r`$e^x = \sum\frac{x^n}{n!}$, $\sin x$, $\cos x$, $\ln(1 + x)$, $\frac{1}{1 - x}$; Taylor about $a$.`,
        r`Alternating series: the error is below the first term left out.`,
      ],
      example: {
        problem: r`Find the radius of convergence of $\sum\frac{x^n}{n2^n}$, and estimate $e^{0.1}$ with three terms.`,
        solution: r`$\left|\frac{a_{n+1}}{a_n}\right| \to \frac{|x|}{2}$, so $R = 2$. $e^{0.1} \approx 1 + 0.1 + 0.005 = 1.105$ (true $1.10517$).`,
      },
      traps: [r`The ratio test says nothing at the end points; check $x = \pm R$ separately.`],
    },
    {
      name: 'Z-Transforms',
      inShort: r`The Laplace transform's counterpart for sampled sequences.`,
      keyIdeas: [
        r`$X(z) = \sum x[n]z^{-n}$; $a^nu[n] \to \frac{z}{z - a}$, $u[n] \to \frac{z}{z - 1}$.`,
        r`A delay of $k$ samples multiplies by $z^{-k}$.`,
        r`Final value: $\lim_{z \to 1}(z - 1)X(z)$; poles inside the unit circle decay.`,
      ],
      example: {
        problem: r`$X(z) = \frac{z}{z - 0.5}$. Find $x[3]$, and the final value of $1 - 0.5^n$.`,
        solution: r`$x[n] = 0.5^n$, so $x[3] = 0.125$. $1 - 0.5^n$ settles at $1$; the theorem agrees: $(z - 1)\left[\frac{z}{z - 1} - \frac{z}{z - 0.5}\right] \to 1$.`,
      },
      traps: [r`The final value theorem needs a settling sequence; with a pole outside the unit circle it gives nonsense.`],
    },
    {
      name: 'Bessel and Legendre Functions',
      inShort: r`Special functions from equations with variable coefficients: drums and cylinders, spheres.`,
      keyIdeas: [
        r`Bessel: $x^2y'' + xy' + (x^2 - n^2)y = 0$, solved by $J_n$ (and $Y_n$, singular at $0$).`,
        r`$J_{n-1} + J_{n+1} = \frac{2n}{x}J_n$; $J_0' = -J_1$; $J_0$ first vanishes at $2.405$.`,
        r`Legendre: $P_0 = 1$, $P_1 = x$, $P_2 = \frac{3x^2 - 1}{2}$; orthogonal on $[-1, 1]$; Rodrigues gives them all.`,
      ],
      example: {
        problem: r`Evaluate $P_2(0.5)$, and give the first zero of $J_0$.`,
        solution: r`$P_2(0.5) = \frac{3(0.25) - 1}{2} = -0.125$. $J_0$ first vanishes at $x \approx 2.405$.`,
      },
      traps: [r`$P_n(1) = 1$ for every $n$: a quick check on any Legendre polynomial you derive.`],
    },
    {
      name: 'Partial Differential Equations',
      inShort: r`The heat, wave and Laplace equations, and separation of variables.`,
      keyIdeas: [
        r`Heat $u_t = c^2u_{xx}$: modes $\sin\frac{n\pi x}{L}e^{-(n\pi c/L)^2t}$, high harmonics fading first.`,
        r`Wave $u_{tt} = c^2u_{xx}$: $f(x - ct) + g(x + ct)$; a string's frequencies $\frac{nc}{2L}$.`,
        r`Classify by $B^2 - 4AC$: elliptic, parabolic, hyperbolic.`,
      ],
      example: {
        problem: r`A rod of length $\pi$ ($c = 1$, ends at $0$) starts at $u = \sin x + \sin3x$. Find $u(x, t)$, and classify $u_{xx} + 4u_{xy} + 4u_{yy} = 0$.`,
        solution: r`Each mode decays on its own: $u = e^{-t}\sin x + e^{-9t}\sin3x$. And $B^2 - 4AC = 16 - 16 = 0$: parabolic.`,
      },
      traps: [r`In the heat solution the decay rate grows with $n^2$, not $n$.`],
    },
    {
      name: 'Functions of a Complex Variable',
      inShort: r`Analytic functions, and contour integrals by Cauchy and residues.`,
      keyIdeas: [
        r`Analytic: $u_x = v_y$, $u_y = -v_x$ (Cauchy-Riemann).`,
        r`$\oint f\,dz = 0$ for analytic $f$; $f(z_0) = \frac{1}{2\pi j}\oint\frac{f}{z - z_0}dz$.`,
        r`$\oint f\,dz = 2\pi j\sum\text{Res}$; a simple pole's residue is $\frac{P(z_0)}{Q'(z_0)}$.`,
      ],
      example: {
        problem: r`Evaluate $\oint\frac{dz}{z^2 + 1}$ around a small circle about $j$, and around $|z| = 2$.`,
        solution: r`Residue at $j$: $\frac{1}{2j}$, so the first is $2\pi j\cdot\frac{1}{2j} = \pi$. Around $|z| = 2$ both poles count: $\frac{1}{2j} - \frac{1}{2j} = 0$, so the integral is $0$.`,
      },
      traps: [r`Only poles inside the contour count; check each one's distance from the centre.`],
    },
  ],
};
