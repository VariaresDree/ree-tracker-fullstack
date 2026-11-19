'use strict';

// EE › Feedback Control Systems formula cards (Library round, 2026-11-19): the
// topic had no cards. Second-order basics (transfer function, standard form,
// overshoot, peak and settling time, damping ratio) are in Electrical
// Transient Analysis; Ziegler–Nichols and proportional band in
// Instrumentation & Control. This file adds: force–voltage analogy, DC motor
// transfer function, reflected inertia; poles, zeros and DC gain, first-order
// response; closed-loop transfer function, reduction rules, sensitivity;
// Mason's gain formula; rise time, 2% and 5% settling, dominant poles; error
// constants and steady-state error by type; Routh entries, third-order
// stability and the auxiliary equation; root-locus asymptotes, breakaway,
// magnitude and angle conditions, departure angle; Bode slopes and the corner
// error, resonant peak and bandwidth; the Nyquist criterion; gain and phase
// margins, PM and ζ, transport delay; PID, lead and lag compensators; state-
// space transfer function, transition matrix, controllability and
// observability. See mathematics/algebra.js for the format;
// tests/feedbackControlFormulas.test.js checks each with roots, simulated
// responses, frequency sweeps or matrices.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const MOD = 'System Modeling';
const TF = 'Transfer Functions';
const BD = 'Block Diagrams';
const SFG = 'Signal Flow Graphs';
const TR = 'Time Response';
const SSE = 'Steady-State Error';
const RH = 'Routh-Hurwitz Stability';
const RL = 'Root Locus';
const BODE = 'Bode Plots';
const NYQ = 'Nyquist';
const GPM = 'Gain and Phase Margins';
const PID = 'PID Controllers';
const COMP = 'Compensators';
const SS = 'State Space';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const S_ = r`$\text{s}$`;
const RAD = r`$\text{rad/s}$`;
const ZETA = v(r`$\zeta$`, 'damping ratio');
const WN = v(r`$\omega_n$`, 'natural frequency', RAD);
const GH = v(r`$G(s)H(s)$`, 'open-loop transfer function');

const drafts = [
    // System Modeling
    P(MOD, null, 'Force–Voltage Analogy', r`$M, B, K \leftrightarrow L, R, 1/C$`, r`$M\ddot x + B\dot x + Kx = f \iff L\ddot q + R\dot q + \frac{q}{C} = v;\qquad M \leftrightarrow L,\ B \leftrightarrow R,\ K \leftrightarrow \tfrac1C,\ x \leftrightarrow q$`,
        [v(r`$M, B, K$`, 'mass, damping, spring constant'), v(r`$L, R, C$`, 'inductance, resistance, capacitance')],
        'A mass-spring-damper and a series RLC circuit obey the same equation.',
        'In the force–current analogy instead: M ↔ C, B ↔ 1/R, K ↔ 1/L.'),
    P(MOD, null, 'DC Motor Transfer Function', r`$\frac{\theta}{V} = \frac{K_t}{s[(Js+b)(Ls+R)+K^2]}$`, r`$\frac{\Theta(s)}{V(s)} = \frac{K_t}{s[(Js + b)(Ls + R) + K_tK_b]}\quad (\text{armature control})$`,
        [v(r`$J, b$`, 'rotor inertia and viscous friction'), v(r`$L, R$`, 'armature inductance and resistance'), v(r`$K_t, K_b$`, 'torque and back-EMF constants (equal in SI)')],
        'Shaft angle against armature voltage for a permanent-magnet or separately excited DC motor.',
        'Speed is sΘ: drop the leading s. With L ≈ 0 it is first order in speed.'),
    P(MOD, null, 'Reflected Inertia Through Gears', r`$J_{eq} = J_1 + J_2\left(\frac{N_1}{N_2}\right)^2$`, r`$J_{eq} = J_1 + J_2\left(\frac{N_1}{N_2}\right)^2,\qquad b_{eq} = b_1 + b_2\left(\frac{N_1}{N_2}\right)^2$`,
        [v(r`$J_1, J_2$`, 'inertias on the input and output shafts', r`$\text{kg·m}^2$`), v(r`$N_1, N_2$`, 'teeth on the input and output gears')],
        'A load behind a gearbox looks smaller at the motor by the square of the ratio.',
        'A 10:1 reduction makes the load\'s inertia look 100 times smaller.'),
    // Transfer Functions
    P(TF, null, 'Poles, Zeros and DC Gain', r`$G(0),\ \text{type} = \text{poles at } s = 0$`, r`$G(s) = K\frac{\prod(s - z_i)}{\prod(s - p_j)};\quad \text{DC gain } G(0);\quad \text{type} = \text{number of poles at the origin}$`,
        [v(r`$z_i, p_j$`, 'zeros and poles'), v(r`$K$`, 'gain')],
        'Zeros make the transfer function zero, poles make it infinite; together they shape every response.',
        'Stable only if every pole has a negative real part.'),
    P(TF, null, 'First-Order System Response', r`$c(t) = K(1 - e^{-t/\tau})$`, r`$G(s) = \frac{K}{\tau s + 1}:\quad c(t) = K(1 - e^{-t/\tau}),\quad t_r = 2.2\tau,\ t_s = 4\tau\ (2\%)$`,
        [v(r`$K$`, 'DC gain'), v(r`$\tau$`, 'time constant', S_)],
        'The step response of a first-order system: no overshoot, set entirely by its time constant.',
        'Bandwidth is 1/τ rad/s: faster systems have wider bandwidth.'),
    // Block Diagrams
    P(BD, null, 'Closed-Loop Transfer Function', r`$T = \frac{G}{1 + GH}$`, r`$T(s) = \frac{C}{R} = \frac{G(s)}{1 \pm G(s)H(s)}\quad (+ \text{ for negative feedback})$`,
        [v(r`$G$`, 'forward path'), v(r`$H$`, 'feedback path')],
        'A feedback loop reduced to one block.',
        'Unity feedback: H = 1. The characteristic equation is 1 + GH = 0.'),
    P(BD, null, 'Block Diagram Reduction Rules', r`$G_1G_2,\ G_1 \pm G_2$`, r`$\text{series: } G_1G_2;\quad \text{parallel: } G_1 \pm G_2;\quad \text{moving a summing point ahead of } G: \text{ add a block } \tfrac1G$`,
        [v(r`$G_1, G_2$`, 'blocks')],
        'The algebra for collapsing a block diagram step by step.',
        'Move pickoffs and summing points so loops don\'t overlap, then reduce the inner loop first.'),
    P(BD, null, 'Sensitivity to Plant Changes', r`$S_G^T = \frac{1}{1 + GH}$`, r`$S_G^T = \frac{\partial T/T}{\partial G/G} = \frac{1}{1 + GH}$`,
        [v(r`$T$`, 'closed-loop transfer function'), v(r`$GH$`, 'loop gain')],
        'How much the closed-loop response changes for a change in the plant: feedback divides it by the loop gain.',
        'High loop gain makes the system insensitive to plant changes, but to the sensor H it stays fully sensitive.'),
    // Signal Flow Graphs
    P(SFG, null, "Mason's Gain Formula", r`$T = \frac{\sum P_k\Delta_k}{\Delta}$`, r`$T = \frac{\sum_k P_k\Delta_k}{\Delta},\quad \Delta = 1 - \sum L_i + \sum L_iL_j - \sum L_iL_jL_k + \ldots\ (\text{non-touching})$`,
        [v(r`$P_k$`, 'gain of forward path k'), v(r`$L_i$`, 'loop gains'), v(r`$\Delta_k$`, 'Δ with the loops touching path k removed')],
        'The overall gain of a signal flow graph in one step, from its paths and loops.',
        'Products in Δ are only of loops that DON\'T touch each other.'),
    // Time Response
    P(TR, null, 'Rise Time of a Second-Order System', r`$t_r = \frac{\pi - \theta}{\omega_d}$`, r`$t_r = \frac{\pi - \theta}{\omega_d},\qquad \theta = \cos^{-1}\zeta,\ \omega_d = \omega_n\sqrt{1 - \zeta^2}\quad (0\text{–}100\%)$`,
        [ZETA, WN],
        'Time for an underdamped step response to first reach its final value.',
        'For 10–90% rise time, about (1.8)/ω_n is a common estimate near ζ = 0.5.', S_),
    P(TR, null, 'Settling Time Criteria', r`$t_s \approx \frac{4}{\zeta\omega_n}\ (2\%)$`, r`$t_s \approx \frac{4}{\zeta\omega_n}\ (2\%),\qquad t_s \approx \frac{3}{\zeta\omega_n}\ (5\%)$`,
        [ZETA, WN],
        'How long the response takes to stay within 2% or 5% of its final value.',
        'Settling depends on ζω_n, the real part of the poles: poles further left settle faster.', S_),
    P(TR, null, 'Dominant Poles', r`$|\sigma_{far}| \ge 5|\sigma_{dom}|$`, r`$|\text{Re}(p_{far})| \ge 5\,|\text{Re}(p_{dom})| \implies \text{use the dominant pair alone}$`,
        [v(r`$p_{dom}$`, 'poles nearest the imaginary axis'), v(r`$p_{far}$`, 'the other poles')],
        'A higher-order system acts like its slowest poles when the others are much further left.',
        'Keep the DC gain right when dropping a fast pole: G(0) must not change.'),
    // Steady-State Error
    P(SSE, null, 'Static Error Constants', r`$K_p = \lim G,\ K_v = \lim sG,\ K_a = \lim s^2G$`, r`$K_p = \lim_{s\to0}G(s),\quad K_v = \lim_{s\to0}sG(s),\quad K_a = \lim_{s\to0}s^2G(s)\quad (\text{unity feedback})$`,
        [v(r`$G(s)$`, 'open-loop (forward) transfer function')],
        'Position, velocity and acceleration constants of a unity-feedback system.',
        'They are finite and nonzero only for the matching type: K_p for type 0, K_v for type 1, K_a for type 2.'),
    P(SSE, null, 'Steady-State Error by Input and Type', r`$e_{ss} = \frac{1}{1 + K_p},\ \frac{1}{K_v},\ \frac{1}{K_a}$`, r`$\text{step: } \frac{1}{1 + K_p};\quad \text{ramp: } \frac{1}{K_v};\quad \text{parabola: } \frac{1}{K_a}\quad (\text{type 0: } \infty \text{ for ramp; type 1: } 0 \text{ for step})$`,
        [v(r`$K_p, K_v, K_a$`, 'error constants')],
        'The error left after the transient for unit step, ramp and parabolic inputs.',
        'Each integrator in the loop (type) removes the error for one more input order.'),
    // Routh-Hurwitz Stability
    P(RH, null, 'Routh Array Entries', r`$b_1 = \frac{a_1a_2 - a_0a_3}{a_1}$`, r`$b_1 = \frac{a_1a_2 - a_0a_3}{a_1},\qquad b_2 = \frac{a_1a_4 - a_0a_5}{a_1}\quad (a_0s^n + a_1s^{n-1} + \ldots)$`,
        [v(r`$a_i$`, 'coefficients of the characteristic polynomial')],
        'How each new row of the Routh array is built from the two above it.',
        'The number of sign changes in the first column is the number of right-half-plane roots.'),
    P(RH, null, 'Third-Order Stability Condition', r`$a_1a_2 > a_0a_3$`, r`$a_0s^3 + a_1s^2 + a_2s + a_3:\ \text{stable} \iff \text{all } a_i > 0 \text{ and } a_1a_2 > a_0a_3$`,
        [v(r`$a_i$`, 'coefficients, all of one sign')],
        'The quick stability test for a cubic characteristic equation.',
        'Use it for the range of K: put K into the coefficients and solve the inequality.'),
    P(RH, null, 'Auxiliary Equation and Oscillation Frequency', r`$\omega = \sqrt{\frac{a_3}{a_1}}$`, r`$\text{at } a_1a_2 = a_0a_3:\ a_1s^2 + a_3 = 0 \implies \omega = \sqrt{\frac{a_3}{a_1}}$`,
        [v(r`$a_1, a_3$`, 'coefficients in the s² row at marginal stability')],
        'At the edge of stability a row of zeros appears; the row above gives the frequency the system oscillates at.',
        'This is also where the root locus crosses the imaginary axis.', RAD),
    // Root Locus
    P(RL, null, 'Root Locus Asymptotes', r`$\sigma_a = \frac{\sum p - \sum z}{n - m}$`, r`$\sigma_a = \frac{\sum p_i - \sum z_i}{n - m},\qquad \theta_a = \frac{(2k + 1)180°}{n - m}$`,
        [v(r`$n, m$`, 'number of open-loop poles and zeros'), v(r`$p_i, z_i$`, 'pole and zero locations')],
        'Where the branches that go to infinity head: their centroid and angles.',
        'n − m branches go to infinity; with three, the angles are ±60° and 180°.'),
    P(RL, null, 'Breakaway Point', r`$\frac{dK}{ds} = 0$`, r`$K = -\frac{1}{G(s)H(s)},\qquad \frac{dK}{ds} = 0 \text{ on the real-axis locus}$`,
        [GH],
        'Where two branches meet on the real axis and leave it (or arrive).',
        'Check the root lies on a real-axis segment of the locus; others are spurious.'),
    P(RL, null, 'Magnitude and Angle Conditions', r`$|KGH| = 1,\ \angle GH = (2k+1)180°$`, r`$|KG(s)H(s)| = 1,\qquad \angle G(s)H(s) = (2k + 1)180°$`,
        [GH, v(r`$K$`, 'gain')],
        'A point is on the root locus if the angles add to an odd multiple of 180°; the magnitude then gives K there.',
        'Real-axis segments lie to the LEFT of an odd number of poles plus zeros.'),
    P(RL, null, 'Angle of Departure', r`$\theta_d = 180° - \sum\angle_p + \sum\angle_z$`, r`$\theta_d = 180° - \sum\angle(\text{from other poles}) + \sum\angle(\text{from zeros})$`,
        [v(r`$\angle$`, 'angles of vectors drawn to the complex pole')],
        'The direction in which the locus leaves a complex pole.',
        'Arrival at a complex zero: 180° − Σ zero angles + Σ pole angles.'),
    // Bode Plots
    P(BODE, null, 'Bode Asymptote Slopes', r`$\pm20n\ \text{dB/dec}$`, r`$\text{each pole: } -20\ \text{dB/dec, } -90°;\quad \text{each zero: } +20,\ +90°;\quad \frac{K}{s}: 0\ \text{dB at } \omega = K$`,
        [v(r`$n$`, 'net number of poles or zeros past a frequency')],
        'Straight-line magnitude and phase from corner frequencies.',
        'A double pole changes the slope by −40 dB/dec at once.'),
    P(BODE, null, 'Corner Frequency Error', r`$-3\ \text{dB at } \omega = \frac1\tau$`, r`$\frac{1}{1 + j\omega\tau}: |{\cdot}| = -3.01\ \text{dB and } -45° \text{ at } \omega = \frac1\tau$`,
        [v(r`$\tau$`, 'time constant', S_)],
        'The true curve sits 3 dB below the asymptotes at a first-order corner.',
        'One octave either side the error is about 1 dB.'),
    P(BODE, null, 'Resonant Peak and Frequency', r`$M_r = \frac{1}{2\zeta\sqrt{1 - \zeta^2}}$`, r`$M_r = \frac{1}{2\zeta\sqrt{1 - \zeta^2}},\qquad \omega_r = \omega_n\sqrt{1 - 2\zeta^2}\quad (\zeta < 0.707)$`,
        [ZETA, WN],
        'The peak of a second-order system\'s closed-loop frequency response.',
        'No peak at all for ζ ≥ 0.707. M_r of 1.1–1.5 is a common design target.'),
    P(BODE, null, 'Bandwidth of a Second-Order System', r`$\omega_B = \omega_n\sqrt{1 - 2\zeta^2 + \sqrt{\ldots}}$`, r`$\omega_B = \omega_n\sqrt{1 - 2\zeta^2 + \sqrt{4\zeta^4 - 4\zeta^2 + 2}}$`,
        [ZETA, WN],
        'The frequency where the closed-loop response falls 3 dB below its DC value.',
        'At ζ = 0.707 the bandwidth equals ω_n. Wider bandwidth means a faster response.', RAD),
    // Nyquist
    P(NYQ, null, 'Nyquist Stability Criterion', r`$Z = N + P$`, r`$Z = N + P\quad (\text{stable} \iff Z = 0)$`,
        [v(r`$P$`, 'open-loop poles in the right half-plane'), v(r`$N$`, 'clockwise encirclements of −1 by GH(jω)'), v(r`$Z$`, 'closed-loop right-half-plane poles')],
        'Closed-loop stability from the open-loop frequency response.',
        'With an open-loop stable plant (P = 0), the plot must not encircle −1.'),
    // Gain and Phase Margins
    P(GPM, null, 'Gain and Phase Margins', r`$\text{PM} = 180° + \angle GH(j\omega_{gc})$`, r`$\text{GM} = -20\log_{10}|GH(j\omega_{pc})|\ (\angle = -180°),\qquad \text{PM} = 180° + \angle GH(j\omega_{gc})\ (|GH| = 1)$`,
        [v(r`$\omega_{pc}$`, 'phase-crossover frequency', RAD), v(r`$\omega_{gc}$`, 'gain-crossover frequency', RAD)],
        'How much gain or phase can be added before the closed loop goes unstable.',
        'Typical targets: GM ≥ 6 dB and PM of 45–60°.'),
    P(GPM, null, 'Phase Margin and Damping', r`$\zeta \approx \frac{\text{PM}}{100}$`, r`$\text{PM} = \tan^{-1}\frac{2\zeta}{\sqrt{\sqrt{1 + 4\zeta^4} - 2\zeta^2}} \approx 100\zeta\ (\text{PM} < 70°)$`,
        [ZETA, v(r`$\text{PM}$`, 'phase margin, degrees')],
        'Phase margin sets the closed-loop damping of a second-order-like loop.',
        'PM 45° ≈ ζ 0.42, about 23% overshoot; PM 60° ≈ ζ 0.6.'),
    P(GPM, null, 'Transport Delay Phase', r`$\angle e^{-sT} = -\omega T$`, r`$e^{-sT}: |{\cdot}| = 1,\ \angle = -\omega T\ (\text{rad})$`,
        [v(r`$T$`, 'dead time', S_), v(r`$\omega$`, 'frequency', RAD)],
        'A pure time delay adds phase lag that grows with frequency but leaves the gain unchanged.',
        'It erodes phase margin: a delay of T costs ω_gc·T radians at crossover.', r`$\text{rad}$`),
    // PID Controllers
    P(PID, null, 'PID Controller Transfer Function', r`$G_c = K_p + \frac{K_i}{s} + K_ds$`, r`$G_c(s) = K_p + \frac{K_i}{s} + K_ds = K_p\left(1 + \frac{1}{T_is} + T_ds\right)$`,
        [v(r`$K_p, K_i, K_d$`, 'proportional, integral and derivative gains'), v(r`$T_i, T_d$`, 'integral and derivative times', S_)],
        'The PID controller: present error, accumulated error, and the error\'s rate of change.',
        'Integral adds a pole at the origin (raises the type, removes step error); derivative adds a zero (adds damping).'),
    // Compensators
    P(COMP, null, 'Lead Compensator', r`$\sin\phi_m = \frac{1 - \alpha}{1 + \alpha}$`, r`$G_c = \frac{Ts + 1}{\alpha Ts + 1}\ (\alpha < 1):\quad \sin\phi_m = \frac{1 - \alpha}{1 + \alpha},\quad \omega_m = \frac{1}{T\sqrt\alpha}$`,
        [v(r`$\alpha$`, 'pole/zero ratio, less than 1'), v(r`$T$`, 'zero time constant', S_)],
        'Adds phase near crossover to raise the phase margin and speed up the response.',
        'Place ω_m at the new gain crossover; the compensator\'s gain there is 1/√α.'),
    P(COMP, null, 'Lag Compensator', r`$G_c = \frac{Ts + 1}{\beta Ts + 1}\ (\beta > 1)$`, r`$G_c = \frac{Ts + 1}{\beta Ts + 1}\ (\beta > 1):\quad K_v \text{ raised by } \beta;\quad \frac1T \approx \frac{\omega_{gc}}{10}$`,
        [v(r`$\beta$`, 'pole/zero ratio, greater than 1'), v(r`$T$`, 'zero time constant', S_)],
        'Raises low-frequency gain (cuts steady-state error) while barely touching the phase margin.',
        'Put the zero a decade below crossover so its phase lag does little harm; it slows the response slightly.'),
    // State Space
    P(SS, null, 'Transfer Function from State Space', r`$G(s) = C(sI - A)^{-1}B + D$`, r`$\dot{\mathbf{x}} = A\mathbf{x} + B\mathbf{u},\ \mathbf{y} = C\mathbf{x} + D\mathbf{u} \implies G(s) = C(sI - A)^{-1}B + D$`,
        [v(r`$A, B, C, D$`, 'state, input, output and feedthrough matrices')],
        'The transfer function hidden in a state-space model.',
        'The poles are the eigenvalues of A: roots of det(sI − A) = 0.'),
    P(SS, null, 'State Transition Matrix', r`$\Phi(t) = \mathcal{L}^{-1}[(sI - A)^{-1}] = e^{At}$`, r`$\Phi(t) = e^{At} = \mathcal{L}^{-1}[(sI - A)^{-1}],\qquad \mathbf{x}(t) = \Phi(t)\mathbf{x}(0) + \int_0^t\Phi(t - \tau)B\mathbf{u}(\tau)\,d\tau$`,
        [v(r`$A$`, 'state matrix'), v(r`$\mathbf{x}(0)$`, 'initial state')],
        'How the state evolves from its initial value, plus the input\'s contribution.',
        'Φ(0) = I, and dΦ/dt = AΦ.'),
    P(SS, null, 'Controllability and Observability', r`$\text{rank}[B\ AB \cdots] = n$`, r`$\text{rank}[B\ \ AB\ \cdots\ A^{n-1}B] = n\ (\text{controllable}),\qquad \text{rank}\begin{bmatrix}C\\ CA\\ \vdots\\ CA^{n-1}\end{bmatrix} = n\ (\text{observable})$`,
        [v(r`$n$`, 'number of states')],
        'Whether the input can steer every state, and whether the output reveals every state.',
        'A pole-zero cancellation in the transfer function means a state is uncontrollable or unobservable.'),
];

module.exports = { subject: 'EE', topic: 'Feedback Control Systems', migration: '20270108000000_cards_feedback_control', file, revisions, retire, drafts };
