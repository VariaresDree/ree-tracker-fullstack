'use strict';

// EE › Electric Circuits 2 formula cards (Library round, 2026-11-18): 10 live
// cards for 13 subtopics, all correct, filed as they are (the waveform values
// go under Non-Sinusoidal Waves). Two cards that belong here sat in Power
// System Analysis (three-phase power and power-factor correction) and move in.
// This file adds the rest: complex power and the power triangle, the
// correcting capacitor, AC maximum power, parallel resonance and bandwidth,
// coupled coils (mutual voltage, energy, reflected impedance), wye and delta
// relations, Millman's neutral shift, the two-wattmeter method, symmetrical
// components, Fourier series, non-sinusoidal RMS and power, THD, two-port
// parameters, s-domain models, initial and final values, and first-order
// filters. Mutual inductance itself stays in Electromagnetism; ideal
// transformer ratios in Electrical Machinery 1. See mathematics/algebra.js
// for the format; tests/electricCircuits2Formulas.test.js checks each with
// complex arithmetic, simulation or numerical integration.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const PWR = 'AC Power (Real, Reactive, Apparent)';
const PFC = 'Power Factor Correction';
const MAXP = 'Maximum Power in AC';
const RES = 'Series and Parallel Resonance';
const COUP = 'Magnetically Coupled Circuits';
const BAL = 'Balanced Three-Phase Systems';
const UNBAL = 'Unbalanced Three-Phase Systems';
const MEAS = 'Three-Phase Power Measurement';
const SYM = 'Symmetrical Components';
const FOUR = 'Non-Sinusoidal Waves and Fourier';
const TWO = 'Two-Port Networks';
const LAP = 'Laplace in Circuits';
const FILT = 'Filters';
const WAVE = 'Waveform Values';

const file = [
    ['b2004752-db62-4083-a0f6-e74f885b7d61', PWR, null], // Active Power (Real Power)
    ['8d0fdf8a-c3ad-4b57-80c4-8e9ba31299a8', PWR, null], // Reactive Power
    ['0b66b0ef-d925-4992-8967-fd1737c7a5c4', PWR, null], // Power Factor
    ['3960e24f-2c1e-49ae-8ddd-f4c12a994fe3', RES, null], // Resonant Frequency of Series RLC Circuit
    ['304c1aa4-4643-4180-bdac-593f7408e004', RES, null], // Quality Factor of Series RLC Circuit
    ['5f942db1-c7c7-4fc5-b841-1822b7c590e9', FOUR, WAVE], // RMS Value of Sinusoidal Waveform
    ['13a180c1-d112-4a40-a879-75a0048046fa', FOUR, WAVE], // RMS Value of Triangular Waveform
    ['3ecb4663-9957-4c78-b52d-716e9ee4ec95', FOUR, WAVE], // Average Value of Sinusoidal Waveform (Full Wave)
    ['24bf036d-85ec-4388-b4e1-ba5b674a065b', FOUR, WAVE], // Form Factor
    ['95f4686a-e0e9-4a4e-a664-d4aa40dc1781', FOUR, WAVE], // Peak Factor (Crest Factor)
];

// From Power System Analysis: they are Circuits 2 material.
const move = [
    ['f5d4b3e6-c76f-4712-8947-aa2b9fd8ab97', BAL, null], // Three-Phase Power
    ['2db3fab7-db1a-4dab-9e3e-e9ab9dfb14a2', PFC, null], // Power Factor Correction
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const OHM = r`$\Omega$`;

const drafts = [
    // AC Power
    P(PWR, null, 'Complex Power and the Power Triangle', r`$S = VI^* = P + jQ$`, r`$\mathbf{S} = \mathbf{V}\mathbf{I}^* = P + jQ,\qquad |S| = VI = \sqrt{P^2 + Q^2}$`,
        [v(r`$\mathbf{V}, \mathbf{I}$`, 'RMS phasors', V_), v(r`$P$`, 'real power', r`$\text{W}$`), v(r`$Q$`, 'reactive power (+ inductive)', r`$\text{var}$`)],
        'Real and reactive power in one complex number; its magnitude is the apparent power.',
        'Use the CONJUGATE of the current. Complex power is conserved: add the S of every load to get the source\'s.', r`$\text{VA}$`),
    // Power Factor Correction
    P(PFC, null, 'Correcting Capacitance', r`$C = \frac{Q_C}{\omega V^2}$`, r`$C = \frac{Q_C}{\omega V^2}\ (\text{single phase});\qquad C_{\text{per phase}} = \frac{Q_C/3}{\omega V_{\text{phase}}^2}$`,
        [v(r`$Q_C$`, 'capacitor reactive power needed', r`$\text{var}$`), v(r`$V$`, 'voltage across the capacitor', V_), v(r`$\omega$`, '2πf', r`$\text{rad/s}$`)],
        'The capacitance that supplies a required kvar.',
        'Delta-connected capacitors see line voltage and need a third of the wye capacitance for the same kvar.', r`$\text{F}$`),
    // Maximum Power in AC
    P(MAXP, null, 'Maximum Power Transfer in AC', r`$Z_L = Z_{th}^*$`, r`$Z_L = Z_{th}^*:\ P_{\max} = \frac{|V_{th}|^2}{4R_{th}};\qquad \text{resistive load only: } R_L = |Z_{th}|$`,
        [v(r`$V_{th}$`, 'Thévenin voltage, RMS', V_), v(r`$Z_{th} = R_{th} + jX_{th}$`, 'Thévenin impedance', OHM)],
        'The load that takes the most power from an ac source: the conjugate of its impedance cancels the reactance.',
        'If the load must be a pure resistance, it should equal |Z_th|, and it gets less than the conjugate-match maximum.', r`$\text{W}$`),
    // Series and Parallel Resonance
    P(RES, null, 'Bandwidth and Half-Power Frequencies', r`$BW = \frac{\omega_0}{Q}$`, r`$BW = \omega_2 - \omega_1 = \frac{\omega_0}{Q},\qquad \omega_0 = \sqrt{\omega_1\omega_2};\qquad \text{series: } BW = \frac{R}{L}$`,
        [v(r`$\omega_1, \omega_2$`, 'half-power (−3 dB) frequencies', r`$\text{rad/s}$`), v(r`$Q$`, 'quality factor')],
        'The width of a resonance peak between the points where power falls to half.',
        'ω₀ is the GEOMETRIC mean of ω₁ and ω₂, not the average (they are nearly equal only for high Q).', r`$\text{rad/s}$`),
    P(RES, null, 'Parallel Resonance', r`$Q_p = \omega_0RC$`, r`$\text{ideal: } \omega_0 = \frac{1}{\sqrt{LC}},\ Q_p = \frac{R}{\omega_0L} = \omega_0RC;\qquad \text{coil with resistance } r: \omega_0 = \sqrt{\frac{1}{LC} - \frac{r^2}{L^2}}$`,
        [v(r`$R$`, 'parallel resistance', OHM), v(r`$r$`, 'resistance of the coil', OHM)],
        'Resonance of L and C in parallel: the impedance is a maximum and the source current a minimum.',
        'Parallel Q is R/(ω₀L), the inverse of the series form. The tank\'s circulating current is Q times the line current.'),
    // Magnetically Coupled Circuits
    P(COUP, null, 'Mutually Coupled Coil Voltages', r`$v_1 = L_1\frac{di_1}{dt} \pm M\frac{di_2}{dt}$`, r`$v_1 = L_1\frac{di_1}{dt} \pm M\frac{di_2}{dt};\qquad \text{phasor: } \mathbf{V}_1 = j\omega L_1\mathbf{I}_1 \pm j\omega M\mathbf{I}_2$`,
        [v(r`$M$`, 'mutual inductance', r`$\text{H}$`), v(r`$i_1, i_2$`, 'coil currents', A_)],
        'Each coil\'s voltage includes a term from the other coil\'s changing current.',
        'Dot convention: + if both currents enter (or both leave) the dotted ends, − otherwise.', V_),
    P(COUP, null, 'Energy in Coupled Coils', r`$W = \tfrac12L_1i_1^2 + \tfrac12L_2i_2^2 \pm Mi_1i_2$`, r`$W = \tfrac12L_1i_1^2 + \tfrac12L_2i_2^2 \pm Mi_1i_2$`,
        [v(r`$L_1, L_2$`, 'self-inductances', r`$\text{H}$`), v(r`$M$`, 'mutual inductance', r`$\text{H}$`)],
        'The magnetic energy stored in two coupled coils.',
        'Because W can never be negative, M ≤ √(L₁L₂): the coupling coefficient k is at most 1.', r`$\text{J}$`),
    P(COUP, null, 'Reflected Impedance of Coupled Coils', r`$Z_{in} = Z_1 + \frac{\omega^2M^2}{Z_2 + Z_L}$`, r`$Z_{in} = Z_1 + \frac{\omega^2M^2}{Z_2 + Z_L}$`,
        [v(r`$Z_1, Z_2$`, 'primary and secondary self-impedances (jωL plus winding resistance)', OHM), v(r`$Z_L$`, 'load on the secondary', OHM)],
        'The impedance seen at the primary of a linear (air-core) transformer.',
        'A capacitive secondary reflects as inductive and vice versa: the reflected term divides by the secondary impedance.', OHM),
    // Balanced Three-Phase Systems
    P(BAL, null, 'Wye and Delta Line Relations', r`$V_L = \sqrt3V_p,\ I_L = \sqrt3I_p$`, r`$\text{wye: } \mathbf{V}_{L} = \sqrt3\mathbf{V}_p\angle30^\circ,\ I_L = I_p;\qquad \text{delta: } V_L = V_p,\ \mathbf{I}_L = \sqrt3\mathbf{I}_p\angle{-30^\circ}$`,
        [v(r`$V_p, I_p$`, 'phase voltage and current', V_), v(r`$V_L, I_L$`, 'line voltage and current', A_)],
        'How line and phase quantities relate in balanced wye and delta connections (abc sequence).',
        'A balanced delta load equals a wye of one-third its impedance: Z_Y = Z_Δ/3. Solve one phase of the wye equivalent.'),
    // Unbalanced Three-Phase Systems
    P(UNBAL, null, "Millman's Theorem (Neutral Shift)", r`$V_N = \frac{\sum V_kY_k}{\sum Y_k}$`, r`$\mathbf{V}_{N'N} = \frac{\mathbf{V}_aY_a + \mathbf{V}_bY_b + \mathbf{V}_cY_c}{Y_a + Y_b + Y_c + Y_N}$`,
        [v(r`$\mathbf{V}_k$`, 'source phase voltages', V_), v(r`$Y_k$`, 'load admittances (Y_N = 0 with no neutral wire)', r`$\text{S}$`)],
        'The voltage of an unbalanced wye load\'s star point when it isn\'t tied to the source neutral.',
        'With a solid neutral the shift is zero and each phase is solved alone; the neutral then carries I_a + I_b + I_c.', V_),
    // Three-Phase Power Measurement
    P(MEAS, null, 'Two-Wattmeter Method', r`$P = W_1 + W_2$`, r`$P = W_1 + W_2,\qquad \tan\theta = \sqrt3\frac{W_2 - W_1}{W_1 + W_2}\ (\text{balanced})$`,
        [v(r`$W_1, W_2$`, 'wattmeter readings (W₂ the larger for a lagging load)', r`$\text{W}$`)],
        'Total power of any three-wire load from two wattmeters; for a balanced load, also its power factor.',
        'At pf 0.5 one meter reads zero; below 0.5 it reads negative (reverse its connection and subtract).', r`$\text{W}$`),
    // Symmetrical Components
    P(SYM, null, 'Symmetrical Components Transformation', r`$V_{a1} = \frac13(V_a + aV_b + a^2V_c)$`, r`$\mathbf{V}_{a0} = \tfrac13(\mathbf{V}_a + \mathbf{V}_b + \mathbf{V}_c),\ \mathbf{V}_{a1} = \tfrac13(\mathbf{V}_a + a\mathbf{V}_b + a^2\mathbf{V}_c),\ \mathbf{V}_{a2} = \tfrac13(\mathbf{V}_a + a^2\mathbf{V}_b + a\mathbf{V}_c);\ a = 1\angle120^\circ$`,
        [v(r`$V_a, V_b, V_c$`, 'unbalanced phase voltages (phasors)', V_), v(r`$a$`, 'operator 1∠120°')],
        'Any unbalanced three-phase set as zero-, positive- and negative-sequence sets.',
        'Back again: V_a = V₀ + V₁ + V₂, V_b = V₀ + a²V₁ + aV₂. A wye with no neutral has no zero-sequence current.', V_),
    // Non-Sinusoidal Waves and Fourier
    P(FOUR, null, 'Fourier Series', r`$f(t) = a_0 + \sum(a_n\cos n\omega t + b_n\sin n\omega t)$`, r`$a_0 = \frac1T\int_0^T f\,dt,\quad a_n = \frac2T\int_0^T f\cos n\omega t\,dt,\quad b_n = \frac2T\int_0^T f\sin n\omega t\,dt$`,
        [v(r`$T$`, 'period', r`$\text{s}$`), v(r`$\omega$`, '2π/T', r`$\text{rad/s}$`)],
        'A periodic wave as a dc term plus harmonics.',
        'Even functions have only cosines, odd only sines; half-wave symmetry leaves only odd harmonics. A square wave: (4V/π)(sin ωt + sin 3ωt/3 + …).'),
    P(FOUR, null, 'RMS and Power of Non-Sinusoidal Waves', r`$V_{rms} = \sqrt{V_0^2 + \sum V_n^2}$`, r`$V_{rms} = \sqrt{V_0^2 + V_1^2 + V_2^2 + \cdots};\qquad P = V_0I_0 + \sum V_nI_n\cos\theta_n$`,
        [v(r`$V_0$`, 'dc component', V_), v(r`$V_n, I_n$`, 'RMS values of each harmonic', V_)],
        'The RMS of a wave with harmonics, and the power it delivers: each frequency counts on its own.',
        'Power only comes from voltage and current of the SAME frequency; cross terms average to zero.', V_),
    P(FOUR, null, 'Total Harmonic Distortion', r`$THD = \frac{\sqrt{\sum_{n\ge2}V_n^2}}{V_1}$`, r`$THD = \frac{\sqrt{V_2^2 + V_3^2 + \cdots}}{V_1}$`,
        [v(r`$V_1$`, 'fundamental (RMS)', V_), v(r`$V_n$`, 'harmonic n (RMS)', V_)],
        'How far a wave is from a pure sine.',
        'With THD known, V_rms = V₁√(1 + THD²). Non-linear loads (drives, rectifiers) cause harmonic currents.'),
    // Two-Port Networks
    P(TWO, null, 'Two-Port z and y Parameters', r`$\mathbf{V} = \mathbf{z}\mathbf{I}$`, r`$\begin{bmatrix}V_1\\V_2\end{bmatrix} = \begin{bmatrix}z_{11} & z_{12}\\z_{21} & z_{22}\end{bmatrix}\begin{bmatrix}I_1\\I_2\end{bmatrix},\qquad \mathbf{y} = \mathbf{z}^{-1}$`,
        [v(r`$z_{ij}$`, 'open-circuit impedance parameters', OHM), v(r`$y_{ij}$`, 'short-circuit admittance parameters', r`$\text{S}$`)],
        'A two-port described by its terminal equations; each parameter is measured with the other port open (z) or shorted (y).',
        'Reciprocal (passive, no dependent sources): z₁₂ = z₂₁. Series two-ports add z; parallel ones add y.'),
    P(TWO, null, 'Transmission (ABCD) Parameters', r`$V_1 = AV_2 + BI_2$`, r`$\begin{bmatrix}V_1\\I_1\end{bmatrix} = \begin{bmatrix}A & B\\C & D\end{bmatrix}\begin{bmatrix}V_2\\I_2\end{bmatrix},\qquad AD - BC = 1 \text{ (reciprocal)}$`,
        [v(r`$A, D$`, 'voltage and current ratios (dimensionless)'), v(r`$B$`, 'transfer impedance', OHM), v(r`$C$`, 'transfer admittance', r`$\text{S}$`)],
        'Sending-end quantities from receiving-end ones; cascaded two-ports multiply their ABCD matrices.',
        'I₂ is taken flowing OUT of port 2. A series Z: [1 Z; 0 1]; a shunt Y: [1 0; Y 1].'),
    // Laplace in Circuits
    P(LAP, null, 's-Domain Element Models', r`$Z_L = sL,\ Z_C = \frac{1}{sC}$`, r`$Z_R = R,\quad Z_L = sL \text{ with a source } Li(0^-),\quad Z_C = \frac{1}{sC} \text{ with a source } \frac{v(0^-)}{s}$`,
        [v(r`$s$`, 'complex frequency', r`$\text{1/s}$`), v(r`$i(0^-), v(0^-)$`, 'initial inductor current and capacitor voltage')],
        'Circuit elements in the Laplace domain, with their initial conditions as extra sources.',
        'With these models, nodal and mesh analysis solve transients algebraically; invert by partial fractions.', OHM),
    P(LAP, null, 'Initial and Final Value Theorems', r`$f(\infty) = \lim_{s\to0}sF(s)$`, r`$f(0^+) = \lim_{s\to\infty}sF(s),\qquad f(\infty) = \lim_{s\to0}sF(s)$`,
        [v(r`$F(s)$`, 'Laplace transform of f(t)')],
        'A response\'s start and end values straight from its transform, without inverting it.',
        'The final value theorem holds only if every pole of sF(s) is in the left half-plane (no oscillation or growth).'),
    // Filters
    P(FILT, null, 'First-Order RC Filters', r`$f_c = \frac{1}{2\pi RC}$`, r`$\text{low-pass: } H = \frac{1}{1 + j\omega RC};\quad \text{high-pass: } H = \frac{j\omega RC}{1 + j\omega RC};\quad f_c = \frac{1}{2\pi RC},\ |H(f_c)| = \frac{1}{\sqrt2}\ (-3\ \text{dB})$`,
        [v(r`$R$`, 'resistance', OHM), v(r`$C$`, 'capacitance', r`$\text{F}$`)],
        'The simplest filters and their cutoff frequency.',
        'Gain in dB is 20 log|H|. Past the cutoff a first-order filter falls 20 dB per decade (6 dB per octave).', r`$\text{Hz}$`),
];

module.exports = { subject: 'EE', topic: 'Electric Circuits 2', migration: '20261226000000_cards_electric_circuits_2', file, move, revisions, retire, drafts };
