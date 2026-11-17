'use strict';

// Mathematics › Advanced Engineering Mathematics formula cards (Library round,
// 2026-11-17): four live cards for 12 subtopics, and three series cards that sat
// under Calculus 2 (which has no series subtopic) moved here under Power Series.
// Matrices' 2×2 determinant, inverse and Cramer's rule stay filed under Algebra
// › System of Equations; Laplace basics live under Differential Equations, so
// this file adds what those don't have. See algebra.js for the format;
// tests/aemFormulas.test.js checks every formula numerically.

const r = String.raw;
const v = (symbol, meaning) => ({ symbol, meaning });

const MAT = 'Matrices and Determinants';
const SYS = 'Systems of Linear Equations';
const EIG = 'Eigenvalues and Eigenvectors';
const LAP = 'Laplace Transforms';
const INVL = 'Inverse Laplace Transforms';
const FS = 'Fourier Series';
const FT = 'Fourier Transforms';
const PS = 'Power Series';
const ZT = 'Z-Transforms';
const BL = 'Bessel and Legendre Functions';
const PDE = 'Partial Differential Equations';
const CV = 'Functions of a Complex Variable';

const file = [
    ['9ae9e3a9-caaa-468f-b626-f5f76575effe', EIG, null],
    ['cbd48c3b-f7f7-4968-a5bb-e5bc7b65b919', LAP, 'Theorems'],
    ['4dabb41e-1121-476f-b4ee-39acf7e7b388', PS, 'Maclaurin series'],
    ['00e29865-1d4d-4d97-a79c-d09ef49b3c78', PS, 'Approximations'],
];

// From Calculus 2, where no subtopic fits them.
const move = [
    ['53d5f03f-b8db-4404-a565-c6454ba6816a', PS, 'Convergence'],
    ['2db83565-f360-456d-812f-4843ba949aab', PS, 'Convergence'],
    ['4f839809-d67c-46ac-bf5c-a3b9ae737e66', PS, 'Taylor series'],
];

const revisions = [];
const retire = [];

const F = (subtopic, group, name, symbol, f, vars, d, tip) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, dim: true });
const A_ = v(r`$A, B$`, 'square matrices of order n');
const S_ = v(r`$s$`, 'the transform variable');
const W_ = v(r`$\omega$`, r`angular frequency, $\frac{2\pi}{T}$ for a series`);

const drafts = [
    // Matrices and Determinants
    F(MAT, 'Operations', 'Matrix Multiplication', r`$(AB)_{ij}$`, r`$(AB)_{ij} = \sum_k a_{ik}b_{kj},\qquad AB \ne BA \text{ in general}$`,
        [v(r`$A$`, r`an $m \times n$ matrix`), v(r`$B$`, r`an $n \times p$ matrix`)],
        'Row of the first times column of the second; the inner sizes must match.',
        'The product is m × p. Order matters: AB and BA usually differ, or one does not exist.'),
    F(MAT, 'Operations', 'Transpose and Inverse of a Product', r`$(AB)^{-1}$`, r`$(AB)^T = B^TA^T,\qquad (AB)^{-1} = B^{-1}A^{-1}$`, [A_],
        'Transposing or inverting a product reverses the order.',
        'Like taking off socks and shoes: the last one on comes off first.'),
    F(MAT, 'Determinants', 'Properties of Determinants', r`$\det(AB)$`, r`$\det(AB) = \det A\det B,\quad \det A^T = \det A,\quad \det(kA) = k^n\det A,\quad \det A^{-1} = \frac{1}{\det A}$`,
        [A_, v(r`$k$`, 'a scalar'), v(r`$n$`, 'the order')],
        'How determinants behave under products, transposes and scaling.',
        'Swapping two rows flips the sign; two equal rows make it zero; adding a multiple of one row to another changes nothing.'),
    F(MAT, 'Determinants', 'Cofactor Expansion', r`$\det A = \sum a_{ij}C_{ij}$`, r`$\det A = \sum_j a_{ij}C_{ij},\qquad C_{ij} = (-1)^{i+j}M_{ij}$`,
        [v(r`$M_{ij}$`, r`the minor: the determinant without row $i$ and column $j$`), v(r`$C_{ij}$`, 'the cofactor')],
        'A determinant expanded along any row or column.',
        'Expand along the row or column with the most zeros.'),
    F(MAT, 'Inverses', 'Inverse by the Adjoint', r`$A^{-1} = \frac{\text{adj}A}{\det A}$`, r`$A^{-1} = \frac{1}{\det A}\,\text{adj}\,A,\qquad \text{adj}\,A = [C_{ij}]^T$`,
        [v(r`$C_{ij}$`, 'the cofactors of A')],
        'The inverse of a square matrix from its cofactors.',
        r`Exists only when $\det A \ne 0$; transpose the cofactor matrix.`),
    F(MAT, 'Operations', 'Trace and Rank', r`$\text{tr}\,A$`, r`$\text{tr}\,A = \sum_i a_{ii} = \sum_i\lambda_i,\qquad \text{rank}\,A = \text{number of nonzero rows in echelon form}$`,
        [v(r`$a_{ii}$`, 'the diagonal entries'), v(r`$\lambda_i$`, 'the eigenvalues')],
        'Two numbers that summarise a matrix.',
        'An n × n matrix is invertible exactly when its rank is n.'),
    // Systems of Linear Equations
    F(SYS, null, 'Matrix Form of a Linear System', r`$AX = B$`, r`$AX = B \implies X = A^{-1}B\ (\det A \ne 0)$`,
        [v(r`$A$`, 'the coefficient matrix'), v(r`$X$`, 'the unknowns'), v(r`$B$`, 'the constants')],
        'A system written as one matrix equation.',
        r`$A^{-1}$ goes on the left: $X = A^{-1}B$, not $BA^{-1}$.`),
    F(SYS, null, 'Consistency of a Linear System', r`$\text{rank}\,A$`, r`$\text{rank}\,A = \text{rank}[A|B] = n \text{ unique};\ = r < n \text{ infinitely many};\ \text{rank}\,A < \text{rank}[A|B] \text{ none}$`,
        [v(r`$[A|B]$`, 'the augmented matrix'), v(r`$n$`, 'the number of unknowns')],
        'Whether a system has one solution, many or none (Rouché–Capelli).',
        r`A homogeneous system $AX = 0$ has a nontrivial solution exactly when $\det A = 0$.`),
    // Eigenvalues and Eigenvectors
    F(EIG, null, 'Characteristic Equation of a Matrix', r`$\det(A - \lambda I) = 0$`, r`$\det(A - \lambda I) = 0,\qquad (A - \lambda I)\mathbf{v} = \mathbf{0}$`,
        [v(r`$\lambda$`, 'an eigenvalue'), v(r`$\mathbf{v}$`, 'its eigenvector, not zero')],
        'Eigenvalues are the roots; each eigenvector solves the singular system.',
        r`An eigenvector is fixed only up to a scale: any multiple works.`),
    F(EIG, null, 'Sum and Product of Eigenvalues', r`$\sum\lambda = \text{tr}\,A$`, r`$\sum\lambda_i = \text{tr}\,A,\qquad \prod\lambda_i = \det A$`, [v(r`$\lambda_i$`, 'the eigenvalues, with multiplicity')],
        'A quick check on computed eigenvalues.',
        'A zero eigenvalue means the matrix is singular.'),
    F(EIG, null, 'Eigenvalues of Related Matrices', r`$\lambda^k$`, r`$\text{triangular: the diagonal};\quad A^k: \lambda^k;\quad A^{-1}: \frac1\lambda;\quad A + cI: \lambda + c;\quad A^T: \lambda$`,
        [v(r`$\lambda$`, 'an eigenvalue of A'), v(r`$k$`, 'a whole number'), v(r`$c$`, 'a scalar')],
        'The eigenvalues of powers, inverses and shifts of A, read from A\'s own.',
        'The eigenvectors stay the same (except for the transpose).'),
    F(EIG, null, 'Cayley-Hamilton Theorem', r`$p(A) = 0$`, r`$p(A) = 0;\qquad 2 \times 2:\ A^2 - (\text{tr}\,A)A + (\det A)I = 0$`,
        [v(r`$p(\lambda)$`, 'the characteristic polynomial')],
        'Every square matrix satisfies its own characteristic equation.',
        r`Use it for powers and inverses: $A^{-1} = \frac{(\text{tr}\,A)I - A}{\det A}$ for a $2 \times 2$.`),
    F(EIG, null, 'Diagonalization', r`$A = PDP^{-1}$`, r`$A = PDP^{-1},\qquad A^k = PD^kP^{-1}$`,
        [v(r`$P$`, 'columns are the eigenvectors'), v(r`$D$`, 'diagonal matrix of the eigenvalues')],
        'A matrix with n independent eigenvectors becomes diagonal in their basis.',
        'High powers of A are easy once diagonal: raise each eigenvalue.'),
    // Laplace Transforms
    F(LAP, 'Transforms', 'Laplace Transform of tⁿeᵃᵗ', r`$\mathcal{L}\{t^ne^{at}\}$`, r`$\mathcal{L}\{t^ne^{at}\} = \frac{n!}{(s - a)^{n+1}}$`, [S_, v(r`$n$`, 'a whole number'), v(r`$a$`, 'a constant')],
        'A power of t times an exponential: the first shift applied to tⁿ.',
        'This is also the inverse of a repeated pole: 1/(s − a)ⁿ ↔ tⁿ⁻¹eᵃᵗ/(n − 1)!.'),
    F(LAP, 'Transforms', 'Laplace Transforms of Damped Sinusoids', r`$\mathcal{L}\{e^{at}\sin bt\}$`, r`$\mathcal{L}\{e^{at}\sin bt\} = \frac{b}{(s - a)^2 + b^2},\qquad \mathcal{L}\{e^{at}\cos bt\} = \frac{s - a}{(s - a)^2 + b^2}$`,
        [S_, v(r`$a, b$`, 'constants')],
        'Decaying or growing oscillations, as in an underdamped circuit.',
        'Complete the square in the denominator to read a and b back.'),
    F(LAP, 'Theorems', 'Convolution Theorem', r`$\mathcal{L}\{f * g\}$`, r`$\mathcal{L}\{f * g\} = F(s)\,G(s)$`, [v(r`$F, G$`, 'the transforms of f and g')],
        'Convolution in time is multiplication in s.',
        'Use it backwards to invert a product of two known transforms.'),
    F(LAP, 'Transforms', 'Laplace Transform of a Periodic Function', r`$\mathcal{L}\{f\}$`, r`$f(t + T) = f(t) \implies F(s) = \frac{1}{1 - e^{-sT}}\int_0^T e^{-st}f(t)\,dt$`,
        [v(r`$T$`, 'the period'), S_],
        'A periodic function\'s transform from one period.',
        r`A square wave of height 1, period $2a$: $\frac{1}{s(1 + e^{-as})}$.`),
    // Inverse Laplace Transforms
    F(INVL, null, 'Heaviside Expansion Formula', r`$\mathcal{L}^{-1}\left\{\frac{P}{Q}\right\}$`, r`$\mathcal{L}^{-1}\left\{\frac{P(s)}{Q(s)}\right\} = \sum_k\frac{P(a_k)}{Q'(a_k)}e^{a_kt}$`,
        [v(r`$a_k$`, r`the distinct simple roots of $Q$`), v(r`$P, Q$`, r`polynomials, $\deg P < \deg Q$`)],
        'Inverting a rational transform with simple poles in one step.',
        'It is the cover-up rule of partial fractions, with each term made an exponential.'),
    F(INVL, null, 'Inverse of a Repeated Pole', r`$\mathcal{L}^{-1}\left\{\frac{1}{(s - a)^n}\right\}$`, r`$\mathcal{L}^{-1}\left\{\frac{1}{(s - a)^n}\right\} = \frac{t^{n-1}e^{at}}{(n - 1)!}$`, [S_, v(r`$n$`, 'the multiplicity'), v(r`$a$`, 'the pole')],
        'A pole of multiplicity n gives a power of t times the exponential.',
        'Expand repeated factors into every power from 1 to n first.'),
    // Fourier Series
    F(FS, 'Series', 'Fourier Series and Coefficients', r`$a_n, b_n$`, r`$f(t) = \frac{a_0}{2} + \sum_{n=1}^\infty\left(a_n\cos n\omega t + b_n\sin n\omega t\right),\ a_n = \frac2T\int_0^T f\cos n\omega t\,dt,\ b_n = \frac2T\int_0^T f\sin n\omega t\,dt$`,
        [W_, v(r`$T$`, 'the period')],
        'A periodic function as a sum of harmonics.',
        r`$\frac{a_0}{2}$ is the average value (the dc part).`),
    F(FS, 'Symmetry', 'Fourier Series Symmetry', r`$b_n = 0$`, r`$\text{even}: b_n = 0;\quad \text{odd}: a_n = 0;\quad \text{half-wave } f(t + \tfrac{T}{2}) = -f(t): \text{odd harmonics only}$`,
        [v(r`$a_n, b_n$`, 'the cosine and sine coefficients')],
        'Symmetry tells which coefficients vanish before any integral.',
        'Shift a waveform vertically or in time to expose a symmetry.'),
    F(FS, 'Series', 'Fourier Series of Square and Sawtooth Waves', r`$\frac{4A}{\pi}$`, r`$\text{square } (\pm A): \frac{4A}{\pi}\sum_{n \text{ odd}}\frac{\sin n\omega t}{n};\qquad \text{sawtooth } x \text{ on } (-\pi, \pi): 2\sum_{n=1}^\infty\frac{(-1)^{n+1}}{n}\sin nx$`,
        [v(r`$A$`, 'the amplitude'), W_],
        'Two series worth knowing by heart.',
        r`The square wave's fundamental is $\frac{4}{\pi} \approx 1.27$ times its height.`),
    F(FS, 'Power', "Parseval's Theorem", r`$\frac1T\int f^2$`, r`$\frac1T\int_0^T f^2\,dt = \frac{a_0^2}{4} + \frac12\sum_{n=1}^\infty\left(a_n^2 + b_n^2\right)$`,
        [v(r`$a_n, b_n$`, 'the Fourier coefficients'), v(r`$T$`, 'the period')],
        'The mean square of a wave is the sum of its harmonics\' mean squares.',
        r`So $V_{\text{rms}} = \sqrt{V_0^2 + \sum V_{n,\text{rms}}^2}$ for a nonsinusoidal voltage.`),
    F(FS, 'Series', 'Complex Fourier Series', r`$c_n$`, r`$f(t) = \sum_{n=-\infty}^{\infty}c_ne^{jn\omega t},\qquad c_n = \frac1T\int_0^T f(t)e^{-jn\omega t}\,dt$`, [W_],
        'The Fourier series in exponential form.',
        r`$c_n = \frac{a_n - jb_n}{2}$ for $n > 0$, and $c_0 = \frac{a_0}{2}$.`),
    // Fourier Transforms
    F(FT, null, 'Fourier Transform Pair', r`$F(\omega)$`, r`$F(\omega) = \int_{-\infty}^{\infty}f(t)e^{-j\omega t}\,dt,\qquad f(t) = \frac{1}{2\pi}\int_{-\infty}^{\infty}F(\omega)e^{j\omega t}\,d\omega$`,
        [v(r`$\omega$`, 'angular frequency')],
        'The spectrum of a non-periodic signal, and back.',
        r`Some books put $\frac{1}{\sqrt{2\pi}}$ on both, or use $f$ in hertz: check the convention.`),
    F(FT, null, 'Fourier Transforms of a Pulse and a Decaying Exponential', r`$\frac{2A\sin(\omega\tau/2)}{\omega}$`, r`$\text{pulse } (A, \text{width } \tau): \frac{2A\sin(\omega\tau/2)}{\omega} = A\tau\,\text{sinc}\frac{\omega\tau}{2};\qquad e^{-at}u(t): \frac{1}{a + j\omega}$`,
        [v(r`$A, \tau$`, 'pulse height and width'), v(r`$a$`, 'decay rate, positive')],
        'Two transforms everything else is built from.',
        r`The pulse's first zero is at $\omega = \frac{2\pi}{\tau}$: narrower pulse, wider spectrum.`),
    F(FT, null, 'Fourier Transform Properties', r`$f(t - t_0)$`, r`$f(t - t_0) \to e^{-j\omega t_0}F(\omega),\quad f(at) \to \frac{1}{|a|}F\left(\frac{\omega}{a}\right),\quad f * g \to FG,\quad f' \to j\omega F$`,
        [v(r`$t_0$`, 'a time shift'), v(r`$a$`, 'a scale')],
        'Shifts, scaling, convolution and derivatives, in the frequency domain.',
        'A time shift changes only the phase, never the magnitude spectrum.'),
    // Power Series
    F(PS, 'Convergence', 'Ratio Test', r`$\lim\left|\frac{a_{n+1}}{a_n}\right|$`, r`$L = \lim_{n \to \infty}\left|\frac{a_{n+1}}{a_n}\right|:\quad L < 1 \text{ converges},\ L > 1 \text{ diverges},\ L = 1 \text{ no decision}$`,
        [v(r`$a_n$`, 'the terms of the series')],
        'Convergence from the ratio of successive terms.',
        'At L = 1 use another test: the p-series and harmonic series both give 1.'),
    F(PS, 'Maclaurin series', 'Common Maclaurin Series', r`$\sin x$`, r`$\sin x = \sum\frac{(-1)^nx^{2n+1}}{(2n+1)!},\ \cos x = \sum\frac{(-1)^nx^{2n}}{(2n)!},\ \ln(1 + x) = \sum\frac{(-1)^{n+1}x^n}{n},\ \frac{1}{1 - x} = \sum x^n$`,
        [v(r`$x$`, r`the variable; $|x| < 1$ for the last two`)],
        'The series behind most approximations.',
        r`Small angles: $\sin x \approx x$, $\cos x \approx 1 - \frac{x^2}{2}$.`),
    F(PS, 'Taylor series', 'Taylor Remainder', r`$R_n$`, r`$R_n(x) = \frac{f^{(n+1)}(c)}{(n + 1)!}(x - a)^{n+1},\qquad |R_n| \le |a_{n+1}| \text{ for an alternating series}$`,
        [v(r`$c$`, r`some point between $a$ and $x$`), v(r`$a_{n+1}$`, 'the first term left out')],
        'How far a truncated series is from the function.',
        'For an alternating series with shrinking terms, the error is below the first omitted term.'),
    // Z-Transforms
    F(ZT, null, 'Z-Transform Definition', r`$X(z)$`, r`$X(z) = \sum_{n=0}^{\infty}x[n]\,z^{-n}$`, [v(r`$x[n]$`, 'a sequence'), v(r`$z$`, 'a complex variable')],
        'The discrete counterpart of the Laplace transform.',
        r`It relates to Laplace by $z = e^{sT}$ for samples $T$ apart.`),
    F(ZT, null, 'Common Z-Transforms', r`$\frac{z}{z - a}$`, r`$\delta[n] \to 1,\quad u[n] \to \frac{z}{z - 1},\quad a^nu[n] \to \frac{z}{z - a},\quad nu[n] \to \frac{z}{(z - 1)^2}$`,
        [v(r`$a$`, 'a constant'), v(r`$u[n]$`, 'the unit step sequence')],
        'The transforms most problems reduce to.',
        r`$a^n$ converges for $|z| > |a|$; a pole inside the unit circle is a decaying sequence.`),
    F(ZT, null, 'Z-Transform Shift and Final Value', r`$z^{-k}X(z)$`, r`$x[n - k] \to z^{-k}X(z),\qquad \lim_{n \to \infty}x[n] = \lim_{z \to 1}(z - 1)X(z)$`,
        [v(r`$k$`, 'a delay in samples')],
        'A delay of k samples multiplies by z⁻ᵏ; the final value comes from z → 1.',
        'The final value theorem needs the sequence to settle: poles inside the unit circle.'),
    // Bessel and Legendre Functions
    F(BL, 'Bessel', "Bessel's Equation and Its Series", r`$J_n(x)$`, r`$x^2y'' + xy' + (x^2 - n^2)y = 0,\qquad J_n(x) = \sum_{k=0}^\infty\frac{(-1)^k}{k!\,(n + k)!}\left(\frac{x}{2}\right)^{2k+n}$`,
        [v(r`$n$`, 'the order'), v(r`$J_n$`, 'the Bessel function of the first kind')],
        'The equation of drums, cylinders and FM sidebands, and its standard solution.',
        r`General solution: $C_1J_n(x) + C_2Y_n(x)$; $Y_n$ blows up at $x = 0$.`),
    F(BL, 'Bessel', 'Bessel Recurrence Relations', r`$J_{n-1} + J_{n+1}$`, r`$J_{n-1} + J_{n+1} = \frac{2n}{x}J_n,\qquad \frac{d}{dx}\left[x^nJ_n\right] = x^nJ_{n-1},\qquad J_0' = -J_1$`,
        [v(r`$J_n$`, 'Bessel functions of the first kind')],
        'Relations that get any order from two neighbours.',
        r`$J_{-n} = (-1)^nJ_n$ for whole $n$.`),
    F(BL, 'Legendre', 'Legendre Polynomials', r`$P_n(x)$`, r`$(1 - x^2)y'' - 2xy' + n(n + 1)y = 0;\quad P_0 = 1,\ P_1 = x,\ P_2 = \tfrac{3x^2 - 1}{2},\ P_3 = \tfrac{5x^3 - 3x}{2}$`,
        [v(r`$n$`, 'the degree')],
        "Legendre's equation and its polynomial solutions.",
        r`$P_n(1) = 1$ and $P_n(-1) = (-1)^n$ for every $n$.`),
    F(BL, 'Legendre', "Rodrigues' Formula and Orthogonality", r`$\int P_mP_n$`, r`$P_n = \frac{1}{2^nn!}\frac{d^n}{dx^n}(x^2 - 1)^n,\qquad \int_{-1}^1P_mP_n\,dx = \begin{cases}0 & m \ne n\\ \frac{2}{2n + 1} & m = n\end{cases}$`,
        [v(r`$m, n$`, 'degrees')],
        'A closed form for every Legendre polynomial, and why they expand functions like sines do.',
        'Orthogonality on [−1, 1] is what Legendre series rest on.'),
    // Partial Differential Equations
    F(PDE, null, 'Heat Equation', r`$u_t = c^2u_{xx}$`, r`$u_t = c^2u_{xx},\quad u(0, t) = u(L, t) = 0:\quad u = \sum b_n\sin\frac{n\pi x}{L}\,e^{-(n\pi c/L)^2t}$`,
        [v(r`$c^2$`, 'the diffusivity'), v(r`$L$`, 'the length'), v(r`$b_n$`, 'the Fourier sine coefficients of the initial temperature')],
        'Temperature along a rod with its ends held at zero, by separation of variables.',
        'Higher harmonics die out fastest: the profile smooths toward the first mode.'),
    F(PDE, null, 'Wave Equation', r`$u_{tt} = c^2u_{xx}$`, r`$u_{tt} = c^2u_{xx}:\quad u = f(x - ct) + g(x + ct);\quad \text{string of length } L: f_n = \frac{nc}{2L}$`,
        [v(r`$c$`, 'the wave speed'), v(r`$f, g$`, "waves travelling right and left (d'Alembert)"), v(r`$f_n$`, 'the natural frequencies')],
        "Waves on strings and lines: d'Alembert's solution and a string's harmonics.",
        r`For a string, $c = \sqrt{\frac{T}{\mu}}$ (tension over mass per length).`),
    F(PDE, null, "Laplace's Equation and PDE Types", r`$\nabla^2u = 0$`, r`$u_{xx} + u_{yy} = 0;\qquad Au_{xx} + Bu_{xy} + Cu_{yy}: B^2 - 4AC < 0 \text{ elliptic},\ = 0 \text{ parabolic},\ > 0 \text{ hyperbolic}$`,
        [v(r`$A, B, C$`, 'coefficients of the second derivatives')],
        "Steady-state fields, and how to classify a second-order PDE.",
        'Laplace is elliptic, heat parabolic, wave hyperbolic: the same test as for conics.'),
    // Functions of a Complex Variable
    F(CV, null, 'Cauchy-Riemann Equations', r`$u_x = v_y$`, r`$f = u + jv \text{ analytic} \iff u_x = v_y,\quad u_y = -v_x$`,
        [v(r`$u, v$`, 'the real and imaginary parts of f(z)')],
        'The test for a complex function to be differentiable.',
        r`Then $f'(z) = u_x + jv_x$, and $u$, $v$ each satisfy Laplace's equation.`),
    F(CV, null, "Cauchy's Integral Theorem and Formula", r`$\oint\frac{f(z)}{z - z_0}dz$`, r`$\oint_C f(z)\,dz = 0,\qquad f(z_0) = \frac{1}{2\pi j}\oint_C\frac{f(z)}{z - z_0}\,dz$`,
        [v(r`$C$`, r`a closed path around $z_0$, traversed counterclockwise`), v(r`$f$`, 'analytic on and inside C')],
        'Integrals of analytic functions round a loop are zero, except where a pole sits.',
        r`Derivatives too: $f^{(n)}(z_0) = \frac{n!}{2\pi j}\oint\frac{f}{(z - z_0)^{n+1}}dz$.`),
    F(CV, null, 'Residue Theorem', r`$2\pi j\sum\text{Res}$`, r`$\oint_C f(z)\,dz = 2\pi j\sum\text{Res}(f, z_k),\qquad \text{simple pole: Res} = \lim_{z \to z_k}(z - z_k)f(z) = \frac{P(z_k)}{Q'(z_k)}$`,
        [v(r`$z_k$`, 'the poles inside C'), v(r`$P, Q$`, r`$f = \frac{P}{Q}$`)],
        'A contour integral from the residues at the poles inside it.',
        'Only poles inside the contour count.'),
];

module.exports = { subject: 'Mathematics', topic: 'Advanced Engineering Mathematics', migration: '20261205000000_cards_advanced_engineering_mathematics', file, move, revisions, retire, drafts };
