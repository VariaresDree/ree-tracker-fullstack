// Library › Lessons › EE › Feedback Control Systems (2026-11-19): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Second-order basics (ζ, ω_n,
// overshoot) are also in Electrical Transient Analysis; Ziegler–Nichols tuning
// and proportional band in Instrumentation & Control.
const r = String.raw;

export default {
  topic: 'Feedback Control Systems',
  subject: 'EE',
  overview: r`A feedback system measures its output, compares it with what you asked for, and acts on the difference. This topic is the toolkit for describing such a loop (models, transfer functions, block diagrams, signal flow graphs), judging how it behaves (time response, steady-state error), deciding whether it is stable (Routh, root locus, Bode, Nyquist, margins) and fixing it (PID, lead and lag compensators). State space is the matrix form of the same ideas. Board problems are mostly short calculations: reduce a diagram, find an overshoot or an error constant, the K for marginal stability, or a phase margin.`,
  sources: [
    'Modern Control Engineering (Ogata)',
    'Control Systems Engineering (Nise)',
    'Automatic Control Systems (Kuo and Golnaraghi)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'System Modeling',
      inShort: r`Write the physics as differential equations, then as transfer functions with zero initial conditions.`,
      keyIdeas: [
        r`Mass–spring–damper: $m\ddot x + b\dot x + kx = F$, so $\frac{X}{F} = \frac{1}{ms^2 + bs + k}$.`,
        r`Force–voltage analogy: $m \leftrightarrow L$, $b \leftrightarrow R$, $k \leftrightarrow \frac{1}{C}$, $x \leftrightarrow q$.`,
        r`Inertia seen through gears scales by the turns ratio squared: $J_{eq} = J_1 + J_2\left(\frac{N_1}{N_2}\right)^2$.`,
      ],
      example: {
        problem: r`A 2 kg mass on a 50 N/m spring has a 4 N·s/m damper. Find its electrical analogue, $\omega_n$ and $\zeta$.`,
        solution: r`$L = 2$ H, $R = 4$ Ω, $C = \frac{1}{50} = 0.02$ F. $\omega_n = \sqrt{\frac{50}{2}} = 5$ rad/s; $\zeta = \frac{4}{2\sqrt{50 \times 2}} = 0.2$.`,
      },
      traps: [r`In the force–voltage analogy the spring maps to the INVERSE of capacitance, not to C.`],
    },
    {
      name: 'Transfer Functions',
      inShort: r`Output over input in the Laplace domain: its poles set the behaviour, its zeros shape it.`,
      keyIdeas: [
        r`Poles are the roots of the denominator, zeros of the numerator; DC gain is $G(0)$.`,
        r`First order $\frac{K}{\tau s + 1}$: 63.2% at $\tau$, rise time $2.2\tau$, 2% settling $4\tau$.`,
        r`DC motor speed: $\frac{\Omega}{V} = \frac{K}{(Js + b)(Ls + R) + K^2}$.`,
      ],
      example: {
        problem: r`$G(s) = \frac{5}{0.5s + 1}$ gets a 1 V step. Find the final value, the output at 0.5 s, the rise time and the 2% settling time.`,
        solution: r`Final value 5 V; at $t = \tau = 0.5$ s it is $0.632 \times 5 = 3.16$ V. Rise time $2.2 \times 0.5 = 1.1$ s; settling $4 \times 0.5 = 2$ s.`,
      },
      traps: [r`DC gain is $G(0)$, not the numerator constant: $\frac{20}{(s+2)(s+5)}$ has DC gain 2.`],
    },
    {
      name: 'Block Diagrams',
      inShort: r`Blocks in series multiply, in parallel add; a negative feedback loop becomes $\frac{G}{1 + GH}$.`,
      keyIdeas: [
        r`Closed loop $T = \frac{G}{1 + GH}$; characteristic equation $1 + GH = 0$.`,
        r`Moving a summing point or takeoff point past a block needs a compensating block ($G$ or $\frac{1}{G}$).`,
        r`Sensitivity to the plant $S = \frac{1}{1 + GH}$: high loop gain makes $T$ insensitive to $G$.`,
      ],
      example: {
        problem: r`A loop has $G = 100$ and $H = 0.1$. Find $T$, and how much $T$ changes when $G$ drops 10%.`,
        solution: r`$T = \frac{100}{1 + 10} = 9.09$. $S = \frac{1}{11} = 0.091$, so $T$ changes by only $0.091 \times 10\% = 0.91\%$.`,
      },
      traps: [r`Positive feedback gives $\frac{G}{1 - GH}$: check the sign at the summing point.`],
    },
    {
      name: 'Signal Flow Graphs',
      inShort: r`Nodes and branches instead of blocks; Mason's formula gives the gain in one step.`,
      keyIdeas: [
        r`Mason: $T = \frac{1}{\Delta}\sum_k P_k\Delta_k$.`,
        r`$\Delta = 1 - \sum L_i + \sum L_iL_j - \dots$ over non-touching loop pairs, triples…`,
        r`$\Delta_k$ is $\Delta$ with every loop touching path $k$ removed.`,
      ],
      example: {
        problem: r`One forward path of gain 10 touches two loops, $L_1 = -0.5$ and $L_2 = -0.2$, which do not touch each other. Find the gain.`,
        solution: r`$\Delta = 1 - (-0.5 - 0.2) + (-0.5)(-0.2) = 1.8$; $\Delta_1 = 1$. $T = \frac{10}{1.8} = 5.56$.`,
      },
      traps: [r`Only loops that share no node with each other enter the $L_iL_j$ products.`],
    },
    {
      name: 'Time Response',
      inShort: r`How the output follows a step: speed (rise, peak, settling) and overshoot, set by $\zeta$ and $\omega_n$.`,
      keyIdeas: [
        r`$\%OS = 100e^{-\pi\zeta/\sqrt{1-\zeta^2}}$; $t_p = \frac{\pi}{\omega_d}$, $\omega_d = \omega_n\sqrt{1-\zeta^2}$.`,
        r`$t_r = \frac{\pi - \cos^{-1}\zeta}{\omega_d}$; $t_s = \frac{4}{\zeta\omega_n}$ (2%) or $\frac{3}{\zeta\omega_n}$ (5%).`,
        r`Poles five or more times further left than the dominant pair hardly matter.`,
      ],
      example: {
        problem: r`A system has $\zeta = 0.5$ and $\omega_n = 4$ rad/s. Find the overshoot, peak time, rise time and 2% settling time.`,
        solution: r`$\omega_d = 3.46$ rad/s. $\%OS = 16.3\%$, $t_p = \frac{\pi}{3.46} = 0.907$ s, $t_r = \frac{\pi - 1.047}{3.46} = 0.605$ s, $t_s = \frac{4}{2} = 2$ s.`,
      },
      traps: [r`Overshoot depends on $\zeta$ only; raising $\omega_n$ speeds the response but leaves the overshoot alone.`],
    },
    {
      name: 'Steady-State Error',
      inShort: r`The error left after the transient, set by the system type and its error constants.`,
      keyIdeas: [
        r`$K_p = \lim_{s\to0}G$, $K_v = \lim_{s\to0}sG$, $K_a = \lim_{s\to0}s^2G$.`,
        r`Unity feedback: step $e = \frac{1}{1 + K_p}$, ramp $\frac{1}{K_v}$, parabola $\frac{1}{K_a}$.`,
        r`Type = number of integrators (poles at the origin); each one removes the error for one more input.`,
      ],
      example: {
        problem: r`$G = \frac{20(s + 3)}{s(s + 4)(s + 5)}$ with unity feedback. Find the errors for unit step, ramp and parabola.`,
        solution: r`Type 1. $K_p = \infty$: step error 0. $K_v = \frac{20 \times 3}{4 \times 5} = 3$: ramp error $\frac{1}{3} = 0.333$. $K_a = 0$: parabola error infinite.`,
      },
      traps: [r`These formulas assume a STABLE closed loop and unity feedback: check stability first.`],
    },
    {
      name: 'Routh-Hurwitz Stability',
      inShort: r`Count right-half-plane roots from the coefficients alone, without solving.`,
      keyIdeas: [
        r`Sign changes in the first column = number of right-half-plane roots.`,
        r`Third order $a_0s^3 + a_1s^2 + a_2s + a_3$: stable if all positive and $a_1a_2 > a_0a_3$.`,
        r`A zero row: form the auxiliary equation from the row above; its roots give the oscillation frequency.`,
      ],
      example: {
        problem: r`The characteristic equation is $s^3 + 6s^2 + 8s + K = 0$. Find the range of K for stability and the oscillation frequency at the limit.`,
        solution: r`Stable for $6 \times 8 > K$: $0 < K < 48$. At $K = 48$: $6s^2 + 48 = 0$, so $\omega = \sqrt{8} = 2.83$ rad/s.`,
      },
      traps: [r`A missing or negative coefficient already means unstable (or marginal): no array needed.`],
    },
    {
      name: 'Root Locus',
      inShort: r`The path of the closed-loop poles as the gain K goes from 0 to infinity.`,
      keyIdeas: [
        r`Starts at open-loop poles, ends at zeros or along asymptotes at $\frac{(2q+1)180°}{n - m}$ from $\sigma_a = \frac{\sum p - \sum z}{n - m}$.`,
        r`On the real axis to the left of an odd number of poles and zeros; breakaway where $\frac{dK}{ds} = 0$.`,
        r`Any point on it: angle of $GH$ is $\pm180°$; the gain there is $K = \frac{1}{|GH|}$.`,
      ],
      example: {
        problem: r`Sketch the locus of $\frac{K}{s(s+2)(s+4)}$: asymptotes, breakaway point, and jω-axis crossing.`,
        solution: r`$\sigma_a = \frac{0 - 2 - 4}{3} = -2$, angles 60°, 180°, 300°. Breakaway at $s = -0.845$ (K = 3.08). Crosses at $\pm j2.83$ when $K = 48$, as Routh gives.`,
      },
      traps: [r`The breakaway lies between −2 and 0 here: of the two roots of $\frac{dK}{ds} = 0$, keep the one on the locus.`],
    },
    {
      name: 'Bode Plots',
      inShort: r`Magnitude in dB and phase against log frequency, sketched from straight-line asymptotes.`,
      keyIdeas: [
        r`Each pole adds −20 dB/decade after its corner and −90° in all; each zero +20 dB/decade and +90°.`,
        r`At a first-order corner the true curve is 3 dB off the asymptote, with 45° of phase.`,
        r`Second order: $M_r = \frac{1}{2\zeta\sqrt{1-\zeta^2}}$ at $\omega_r = \omega_n\sqrt{1 - 2\zeta^2}$ (for $\zeta < 0.707$).`,
      ],
      example: {
        problem: r`Sketch $G = \frac{10}{s(0.1s + 1)}$. A second-order system has $\zeta = 0.3$: find its resonant peak and frequency.`,
        solution: r`20 dB at 1 rad/s, falling at −20 dB/dec to the corner at 10 rad/s (true value −3 dB below the asymptote), then −40 dB/dec. $M_r = \frac{1}{2(0.3)\sqrt{0.91}} = 1.75$ (4.85 dB) at $0.906\,\omega_n$.`,
      },
      traps: [r`An integrator's line passes through 0 dB at $\omega = K$, not at $\omega = 1$.`],
    },
    {
      name: 'Nyquist',
      inShort: r`Map the right half-plane through $GH$ and count how the plot circles −1.`,
      keyIdeas: [
        r`$Z = N + P$: closed-loop RHP poles = clockwise encirclements of −1 + open-loop RHP poles.`,
        r`For an open-loop stable system, stable if the plot does not encircle −1.`,
        r`The point where the plot crosses the negative real axis sets the gain margin.`,
      ],
      example: {
        problem: r`$GH = \frac{K}{(s + 1)^3}$. Find the K at which the closed loop becomes unstable, and the gain margin at K = 4.`,
        solution: r`Phase is −180° where each factor gives 60°: $\omega = \sqrt{3}$, there $|GH| = \frac{K}{8}$. Unstable for $K > 8$; at $K = 4$ the margin is 2 (6.02 dB).`,
      },
      traps: [r`With open-loop RHP poles (P > 0), the plot must encircle −1 counterclockwise P times to be stable.`],
    },
    {
      name: 'Gain and Phase Margins',
      inShort: r`How far the loop is from instability, in gain and in phase.`,
      keyIdeas: [
        r`GM = $\frac{1}{|GH|}$ at the phase crossover (−180°); PM = 180° + $\angle GH$ at the gain crossover (|GH| = 1).`,
        r`PM relates to damping: about $100\zeta$ degrees for $\zeta < 0.6$ (51.8° at $\zeta = 0.5$ exactly).`,
        r`A time delay T adds $-\omega T$ of phase but no gain, so it eats the phase margin.`,
      ],
      example: {
        problem: r`Find the phase margin of $G = \frac{10}{s(0.1s + 1)}$.`,
        solution: r`$|G| = 1$ at $\omega^2(1 + 0.01\omega^2) = 100$: $\omega = 7.86$ rad/s. PM $= 180 - 90 - \tan^{-1}0.786 = 51.8°$. The phase never reaches −180°, so GM is infinite; the closed loop has $\zeta = 0.5$.`,
      },
      traps: [r`A positive gain margin in dB means stable only for a minimum-phase, open-loop stable system.`],
    },
    {
      name: 'PID Controllers',
      inShort: r`Act on the present error (P), its history (I) and its trend (D).`,
      keyIdeas: [
        r`$G_c = K_p + \frac{K_i}{s} + K_ds = K_p\left(1 + \frac{1}{T_is} + T_ds\right)$.`,
        r`I removes steady-state error (adds a type); D adds damping and phase lead; P speeds up but alone leaves error.`,
        r`Tuning rules (Ziegler–Nichols) are in Instrumentation & Control.`,
      ],
      example: {
        problem: r`A PID has $K_p = 4$, $T_i = 2$ s and $T_d = 0.5$ s. Write it in parallel form and find its zeros.`,
        solution: r`$K_i = \frac{4}{2} = 2$, $K_d = 4 \times 0.5 = 2$: $G_c = \frac{2s^2 + 4s + 2}{s} = \frac{2(s + 1)^2}{s}$, a double zero at −1.`,
      },
      traps: [r`$K_i = \frac{K_p}{T_i}$ and $K_d = K_pT_d$: don't mix the parallel and ideal forms.`],
    },
    {
      name: 'Compensators',
      inShort: r`Lead adds phase near crossover for speed and margin; lag raises low-frequency gain for accuracy.`,
      keyIdeas: [
        r`Lead $\frac{Ts + 1}{\alpha Ts + 1}$, $\alpha < 1$: $\sin\phi_m = \frac{1 - \alpha}{1 + \alpha}$ at $\omega_m = \frac{1}{T\sqrt\alpha}$.`,
        r`Lag $\frac{Ts + 1}{\beta Ts + 1}$, $\beta > 1$: multiplies $K_v$ by $\beta$; put its zero a decade below crossover.`,
        r`Lead–lag combines both.`,
      ],
      example: {
        problem: r`A lead compensator with $\alpha = 0.1$ must give its peak phase at 10 rad/s. Find the peak phase, T, the zero and pole, and the gain added there.`,
        solution: r`$\phi_m = \sin^{-1}\frac{0.9}{1.1} = 54.9°$. $T = \frac{1}{10\sqrt{0.1}} = 0.316$ s: zero at −3.16, pole at −31.6. Gain at $\omega_m$: $\frac{1}{\sqrt{0.1}} = 3.16$ (10 dB).`,
      },
      traps: [r`The lead's extra gain at $\omega_m$ shifts the crossover up: allow 5–12° more phase than you need.`],
    },
    {
      name: 'State Space',
      inShort: r`First-order matrix equations $\dot x = Ax + Bu$, $y = Cx + Du$, for any number of inputs and outputs.`,
      keyIdeas: [
        r`$G(s) = C(sI - A)^{-1}B + D$; poles are the eigenvalues of $A$.`,
        r`$\Phi(t) = e^{At} = \mathcal{L}^{-1}\{(sI - A)^{-1}\}$.`,
        r`Controllable if $[B\ AB\ \dots]$ has full rank; observable if $[C;\ CA;\ \dots]$ has.`,
      ],
      example: {
        problem: r`$A = \begin{bmatrix}0 & 1\\-6 & -5\end{bmatrix}$, $B = \begin{bmatrix}0\\1\end{bmatrix}$, $C = \begin{bmatrix}4 & 1\end{bmatrix}$. Find $G(s)$, the poles, and whether it is controllable.`,
        solution: r`$G = \frac{s + 4}{s^2 + 5s + 6}$; poles −2 and −3. $[B\ AB] = \begin{bmatrix}0 & 1\\1 & -5\end{bmatrix}$ has determinant −1: controllable.`,
      },
      traps: [r`If a zero cancels a pole (C = [3 1] here), the transfer function hides a mode: it is unobservable.`],
    },
  ],
};
