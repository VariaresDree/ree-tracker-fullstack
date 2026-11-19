'use strict';

// EE › Power System Analysis formula cards (Library round, 2026-11-19): 9 live
// cards for 16 subtopics, all correct, filed as they are (two more moved to
// Electric Circuits 2 earlier). This file adds the rest: base current and
// voltage bases across transformers; load impedance from its rating; bundled
// GMR, GMD, reactance per km, single-phase capacitance and charging; short,
// nominal-π and T, and long lines with the equivalent π and the Ferranti
// effect; ABCD regulation and cascades; the receiving-end power circle; Y-bus,
// Kron reduction; power-flow equations, Gauss-Seidel, Newton-Raphson and DC
// flow; fault current, subtransient current and Z-bus fault voltages;
// sequence power and neutral impedance in the zero sequence; the three
// unsymmetrical faults; swing equation, inertia, equal area, critical clearing
// angle and time; equal incremental cost and the penalty factor; voltage drop,
// reactive power for a voltage change and series compensation; Peek's
// critical voltages and corona loss; sag, unequal supports, ice and wind and
// conductor length. Symmetrical-component transformation and ABCD basics are
// in Electric Circuits 2. See mathematics/algebra.js for the format;
// tests/powerSystemAnalysisFormulas.test.js checks each with matrices, a line
// integrated along its length, simulated swings, or searches.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const PU = 'Per-Unit System';
const OLD = 'One-Line and Impedance Diagrams';
const LRLC = 'Line Resistance, Inductance and Capacitance';
const LINES = 'Short, Medium and Long Lines';
const ABCD = 'ABCD Constants';
const CIRC = 'Power Circle Diagrams';
const YBUS = 'Bus Admittance Matrix';
const LF = 'Load Flow';
const SYMF = 'Symmetrical Faults';
const SEQ = 'Symmetrical Components';
const UNSYM = 'Unsymmetrical Faults';
const STAB = 'Stability and Equal Area';
const ECON = 'Economic Dispatch';
const VC = 'Voltage Control';
const COR = 'Corona';
const SAG = 'Sag and Tension';

const file = [
    ['7068214a-a953-4705-bc71-2469fde7761e', PU, null], // Per-Unit Value
    ['8f81fd59-433c-44ae-a384-b9e0f1d5edd3', PU, null], // Base Impedance
    ['e9e6ee37-1a71-47ee-acba-f365a187609d', PU, null], // Change of Base
    ['c50ce271-56fa-4015-b3b8-68315c12e566', LRLC, null], // Inductance of a Single-Phase or Transposed Line
    ['07d5c6cf-e7fd-4b96-b3a9-1eb2c137713b', LRLC, null], // Capacitance of a Transposed Line to Neutral
    ['6c5d0328-9752-4a01-a196-459f0d861169', LINES, null], // Surge Impedance
    ['45fbebd1-240d-4097-a2d3-ff8969223710', LINES, null], // Surge Impedance Loading
    ['efce42cd-c507-4c1a-9e10-a35e159a3bcd', SYMF, null], // Three-Phase Short-Circuit MVA
    ['bb568423-6a0e-46d6-85bf-8e3092c3bc0a', STAB, null], // Power Transfer Across a Reactance
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const OHM = r`$\Omega$`;
const M_ = r`$\text{m}$`;
const PUv = (sym, meaning) => v(sym, `${meaning}, per unit`);
const Z123 = v(r`$Z_1, Z_2, Z_0$`, 'positive-, negative- and zero-sequence Thévenin impedances at the fault, pu');
const VF = PUv(r`$V_f$`, 'prefault voltage at the fault');
const ZF = v(r`$Z_f$`, 'fault impedance, pu');

const drafts = [
    // Per-Unit System
    P(PU, null, 'Base Current', r`$I_b = \frac{\text{MVA}_b}{\sqrt3\,\text{kV}_b}$`, r`$I_{base} = \frac{\text{MVA}_{base}}{\sqrt3\,\text{kV}_{base}}\ (\text{kA}),\qquad I = I_{pu}I_{base}$`,
        [v(r`$\text{MVA}_{base}$`, 'three-phase base power'), v(r`$\text{kV}_{base}$`, 'line-to-line base voltage of that zone')],
        'The current that is 1 per unit in a voltage zone, to turn per-unit answers back into amperes.',
        'MVA over kV gives kA. Every zone has its own current base, like its own voltage base.', r`$\text{kA}$`),
    P(PU, null, 'Voltage Base Across a Transformer', r`$V_{b2} = V_{b1}\frac{V_2}{V_1}$`, r`$\text{kV}_{base,2} = \text{kV}_{base,1}\frac{\text{kV}_{rated,2}}{\text{kV}_{rated,1}}$`,
        [v(r`$\text{kV}_{r1}, \text{kV}_{r2}$`, 'transformer nameplate voltages on the two sides')],
        'The voltage base steps through each transformer by its ratio; the MVA base is the same everywhere.',
        'If a transformer\'s rating differs from the zone bases, change its impedance to the system base first.'),
    // One-Line and Impedance Diagrams
    P(OLD, null, 'Load Impedance from Its Rating', r`$Z = \frac{V^2}{S^*}$`, r`$Z = \frac{|V|^2}{S^*} = \frac{|V|^2}{|S|}(\cos\theta + j\sin\theta)\ (\text{lagging load})$`,
        [v(r`$V$`, 'voltage the load is rated at', V_), v(r`$S$`, 'complex power it takes', r`$\text{VA}$`), v(r`$\theta$`, 'power-factor angle')],
        'A constant-impedance load for the impedance diagram, from its MVA and power factor.',
        'Use the conjugate: a lagging load is R + jX. In per unit: Z_pu = V_pu²/S_pu*.', OHM),
    // Line R, L and C
    P(LRLC, null, 'GMR of a Bundled Conductor', r`$D_s^b = \sqrt{D_sd}$`, r`$\text{2: } \sqrt{D_sd};\quad \text{3: } \sqrt[3]{D_sd^2};\quad \text{4: } 1.09\sqrt[4]{D_sd^3}$`,
        [v(r`$D_s$`, 'GMR of one subconductor (0.7788r if solid)', M_), v(r`$d$`, 'spacing between subconductors', M_)],
        'The GMR of a bundle, which lowers the line\'s inductance and raises its capacitance.',
        'For capacitance use the radius r in place of D_s. Bundling also cuts corona.', M_),
    P(LRLC, null, 'GMD of a Three-Phase Line', r`$D_{eq} = \sqrt[3]{D_{ab}D_{bc}D_{ca}}$`, r`$D_{eq} = \sqrt[3]{D_{ab}D_{bc}D_{ca}}\quad (\text{transposed})$`,
        [v(r`$D_{ab}, D_{bc}, D_{ca}$`, 'distances between phase centres', M_)],
        'The equivalent spacing of a transposed three-phase line, used in both L and C.',
        'A flat line with spacing D: D_eq = ∛2·D = 1.26D.', M_),
    P(LRLC, null, 'Inductive Reactance per Kilometre', r`$X_L = 0.0754\ln\frac{D_{eq}}{D_s}$`, r`$X_L = 2\pi f(2 \times 10^{-7})\ln\frac{D_{eq}}{D_s}\ \Omega/\text{m} = 0.0754\ln\frac{D_{eq}}{D_s}\ \Omega/\text{km}\ (60\ \text{Hz})$`,
        [v(r`$f$`, 'frequency', r`$\text{Hz}$`), v(r`$D_{eq}$`, 'GMD', M_), v(r`$D_s$`, 'GMR', M_)],
        'Series reactance per phase per kilometre of line.',
        'Typical overhead lines are about 0.3 to 0.5 Ω/km at 60 Hz; it grows only with the log of spacing.', r`$\Omega/\text{km}$`),
    P(LRLC, null, 'Capacitance of a Single-Phase Line', r`$C_{ab} = \frac{\pi\varepsilon_0}{\ln(D/r)}$`, r`$C_{ab} = \frac{\pi\varepsilon_0}{\ln(D/r)},\qquad C_n = 2C_{ab}\ (\text{to neutral})$`,
        [v(r`$D$`, 'conductor spacing', M_), v(r`$r$`, 'conductor radius', M_)],
        'Line-to-line capacitance of a two-wire line, and the capacitance to the neutral plane between them.',
        'Capacitance to neutral is TWICE line-to-line: two capacitances to neutral in series make C_ab.', r`$\text{F/m}$`),
    P(LRLC, null, 'Line Charging Current and Reactive Power', r`$I_c = 2\pi fC_nV_{LN}\ell$`, r`$I_c = 2\pi fC_nV_{LN}\ell,\qquad Q_c = 2\pi fC_nV_{LL}^2\ell\ (\text{three phase})$`,
        [v(r`$C_n$`, 'capacitance to neutral per length', r`$\text{F/m}$`), v(r`$V_{LN}, V_{LL}$`, 'phase and line voltages', V_), v(r`$\ell$`, 'line length', M_)],
        'The current and vars a line\'s own capacitance draws, even with no load.',
        'Charging vars grow with V²: long EHV lines and cables need shunt reactors at light load.', A_),
    // Short, Medium and Long Lines
    P(LINES, null, 'Short Transmission Line', r`$V_s = V_r + IZ$`, r`$\mathbf{V}_s = \mathbf{V}_r + \mathbf{I}Z,\qquad \mathbf{I}_s = \mathbf{I}_r\quad (\ell < 80\ \text{km})$`,
        [v(r`$\mathbf{V}_s, \mathbf{V}_r$`, 'sending- and receiving-end phase voltages', V_), v(r`$Z$`, 'total series impedance per phase', OHM)],
        'A line short enough to ignore its capacitance: a series impedance.',
        'Work per phase (line-to-neutral) and use the same current at both ends.', V_),
    P(LINES, null, 'Nominal π and T Lines', r`$\pi: A = 1 + \frac{YZ}{2},\ B = Z$`, r`$\pi: A = D = 1 + \frac{YZ}{2},\ B = Z,\ C = Y\left(1 + \frac{YZ}{4}\right);\quad T: A = D = 1 + \frac{YZ}{2},\ B = Z\left(1 + \frac{YZ}{4}\right),\ C = Y$`,
        [v(r`$Z$`, 'total series impedance', OHM), v(r`$Y$`, 'total shunt admittance', r`$\text{S}$`)],
        'Medium lines (80–250 km): the shunt admittance lumped half at each end (π) or in the middle (T).',
        'Both give AD − BC = 1. The nominal π is the one used in most problems.'),
    P(LINES, null, 'Long Line Equations', r`$A = \cosh\gamma\ell,\ B = Z_c\sinh\gamma\ell$`, r`$A = D = \cosh\gamma\ell,\quad B = Z_c\sinh\gamma\ell,\quad C = \frac{\sinh\gamma\ell}{Z_c};\quad \gamma = \sqrt{zy},\ Z_c = \sqrt{z/y}$`,
        [v(r`$z, y$`, 'series impedance and shunt admittance per length'), v(r`$\gamma$`, 'propagation constant α + jβ', r`$\text{1/m}$`), v(r`$\ell$`, 'length', M_)],
        'The exact ABCD constants of a line, with R, L, G and C spread along it.',
        'β = 2π/λ; at 60 Hz the wavelength of an overhead line is about 5000 km.'),
    P(LINES, null, 'Equivalent π of a Long Line', r`$Z' = Z\frac{\sinh\gamma\ell}{\gamma\ell}$`, r`$Z' = Z\frac{\sinh\gamma\ell}{\gamma\ell},\qquad \frac{Y'}{2} = \frac{Y}{2}\frac{\tanh(\gamma\ell/2)}{\gamma\ell/2}$`,
        [v(r`$Z, Y$`, 'total series impedance and shunt admittance (zℓ, yℓ)'), v(r`$\gamma\ell$`, 'propagation constant times length')],
        'A π circuit that behaves exactly like the long line at its terminals.',
        'For short lengths the correction factors approach 1 and it becomes the nominal π.'),
    P(LINES, null, 'Ferranti Effect', r`$V_{r,NL} = \frac{V_s}{\cos\beta\ell}$`, r`$V_{r,NL} = \frac{V_s}{|A|} = \frac{V_s}{\cos\beta\ell}\ (\text{lossless}) \approx V_s\left(1 + \frac{\omega^2LC\ell^2}{2}\right)$`,
        [v(r`$V_s$`, 'sending-end voltage', V_), v(r`$\beta$`, 'phase constant, ω√(LC)', r`$\text{rad/m}$`), v(r`$\ell$`, 'line length', M_)],
        'An open or lightly loaded long line has a HIGHER voltage at the far end.',
        'The rise grows with the square of length; shunt reactors keep it down.', V_),
    // ABCD Constants
    P(ABCD, null, 'Regulation from ABCD Constants', r`$\text{VR} = \frac{|V_s|/|A| - |V_{r,FL}|}{|V_{r,FL}|}$`, r`$|V_{r,NL}| = \frac{|V_s|}{|A|},\qquad \text{VR} = \frac{|V_s|/|A| - |V_{r,FL}|}{|V_{r,FL}|}$`,
        [v(r`$V_s$`, 'sending-end voltage at full load', V_), v(r`$A$`, 'line constant A'), v(r`$V_{r,FL}$`, 'receiving voltage at full load', V_)],
        'Line regulation: with the load removed and V_s held, the receiving voltage becomes V_s/A.',
        'For a short line A = 1; with capacitance |A| < 1 and the no-load voltage rises.'),
    P(ABCD, null, 'Networks in Cascade', r`$[T] = [T_1][T_2]$`, r`$\begin{bmatrix}A & B\\ C & D\end{bmatrix} = \begin{bmatrix}A_1 & B_1\\ C_1 & D_1\end{bmatrix}\begin{bmatrix}A_2 & B_2\\ C_2 & D_2\end{bmatrix}$`,
        [v(r`$[T_1], [T_2]$`, 'ABCD matrices in order from the sending end')],
        'A transformer, line and another transformer in series combine by multiplying their ABCD matrices.',
        'Order matters: sending end first. The product still has AD − BC = 1.'),
    // Power Circle Diagrams
    P(CIRC, null, 'Receiving-End Power Circle', r`$S_r = \frac{V_sV_r}{B}\angle(\beta - \delta) - \dots$`, r`$P_r + jQ_r = \frac{|V_s||V_r|}{|B|}\angle(\beta - \delta) - \frac{|A||V_r|^2}{|B|}\angle(\beta - \alpha)$`,
        [v(r`$A\angle\alpha,\ B\angle\beta$`, 'line constants A and B, magnitude and angle'), v(r`$\delta$`, 'angle of V_s ahead of V_r'), v(r`$V_s, V_r$`, 'line voltages for three-phase power', V_)],
        'Receiving-end power as a circle: centre fixed by A, B and V_r, radius V_sV_r/B, position by δ.',
        'Maximum P_r at δ = β: |V_s||V_r|/|B| − |A||V_r|² cos(β − α)/|B|.'),
    // Bus Admittance Matrix
    P(YBUS, null, 'Bus Admittance Matrix', r`$Y_{ii} = \sum y,\ Y_{ij} = -y_{ij}$`, r`$Y_{ii} = \sum_k y_{ik} + y_{i0},\qquad Y_{ij} = -y_{ij},\qquad \mathbf{I} = Y_{bus}\mathbf{V}$`,
        [v(r`$y_{ij}$`, 'admittance of the branch between buses i and j', r`$\text{S or pu}$`), v(r`$y_{i0}$`, 'shunt admittance at bus i (line charging, capacitors)')],
        'The nodal equations of a network, built by inspection.',
        'Diagonal: everything connected to the bus. Off-diagonal: MINUS the branch between. Symmetric without phase shifters.'),
    P(YBUS, null, 'Kron Reduction', r`$Y_{red} = Y_{AA} - Y_{AB}Y_{BB}^{-1}Y_{BA}$`, r`$Y_{red} = Y_{AA} - Y_{AB}Y_{BB}^{-1}Y_{BA}\quad (\text{buses } B \text{ with no injection removed})$`,
        [v(r`$Y_{AA}, Y_{AB}, Y_{BA}, Y_{BB}$`, 'blocks of Y_bus for kept (A) and removed (B) buses')],
        'Eliminates buses that inject no current, keeping the same behaviour at the rest.',
        'One bus at a time: Y_ij(new) = Y_ij − Y_ik Y_kj / Y_kk.'),
    // Load Flow
    P(LF, null, 'Power-Flow Equations', r`$P_i - jQ_i = V_i^*\sum_j Y_{ij}V_j$`, r`$P_i - jQ_i = V_i^*\sum_j Y_{ij}V_j;\quad P_i = \sum_j|V_iV_jY_{ij}|\cos(\theta_{ij} - \delta_i + \delta_j)$`,
        [v(r`$V_i = |V_i|\angle\delta_i$`, 'bus voltage, pu'), v(r`$Y_{ij} = |Y_{ij}|\angle\theta_{ij}$`, 'Y-bus element'), v(r`$P_i, Q_i$`, 'net injection at bus i, pu')],
        'The nonlinear equations a load flow solves: injected power at every bus from the voltages.',
        'Slack bus: V and δ known. PV (generator) bus: P and |V|. PQ (load) bus: P and Q.'),
    P(LF, null, 'Gauss-Seidel Update', r`$V_i = \frac{1}{Y_{ii}}[\frac{S_i^*}{V_i^*} - \dots]$`, r`$V_i^{(k+1)} = \frac{1}{Y_{ii}}\left[\frac{P_i - jQ_i}{V_i^{*(k)}} - \sum_{j \ne i}Y_{ij}V_j\right]$`,
        [v(r`$V_j$`, 'latest values of the other bus voltages'), v(r`$P_i, Q_i$`, 'scheduled injection (load is negative)')],
        'One Gauss-Seidel step for a load bus, using the newest voltages as soon as they are found.',
        'Load injections are NEGATIVE. Acceleration factors of about 1.6 speed it up.'),
    P(LF, null, 'Newton-Raphson Step', r`$[\Delta\delta;\ \Delta V] = J^{-1}[\Delta P;\ \Delta Q]$`, r`$\begin{bmatrix}\Delta\boldsymbol\delta\\ \Delta|\mathbf{V}|\end{bmatrix} = J^{-1}\begin{bmatrix}\Delta\mathbf{P}\\ \Delta\mathbf{Q}\end{bmatrix},\qquad J = \begin{bmatrix}\partial P/\partial\delta & \partial P/\partial|V|\\ \partial Q/\partial\delta & \partial Q/\partial|V|\end{bmatrix}$`,
        [v(r`$\Delta P, \Delta Q$`, 'mismatches: scheduled minus calculated'), v(r`$J$`, 'Jacobian')],
        'Newton-Raphson load flow: correct all angles and magnitudes at once from the mismatches.',
        'Converges in a few iterations, almost independent of system size.'),
    P(LF, null, 'DC Load Flow', r`$P_{ij} \approx \frac{\delta_i - \delta_j}{X_{ij}}$`, r`$P_{ij} \approx \frac{\delta_i - \delta_j}{X_{ij}}\ (\text{pu, radians}),\qquad \mathbf{P} = B'\boldsymbol\delta$`,
        [v(r`$\delta_i - \delta_j$`, 'angle difference across the line, rad'), v(r`$X_{ij}$`, 'line reactance, pu')],
        'A linear estimate of real-power flows: flat voltages, small angles, no resistance.',
        'Real power flows from the leading angle to the lagging; reactive power from higher to lower voltage.'),
    // Symmetrical Faults
    P(SYMF, null, 'Symmetrical Fault Current', r`$I_f = \frac{V_f}{Z_{th} + Z_f}$`, r`$I_f = \frac{V_f}{Z_{th} + Z_f}\ (\text{pu}),\qquad I = I_{f,pu}\frac{\text{MVA}_{base}}{\sqrt3\,\text{kV}_{base}}$`,
        [VF, v(r`$Z_{th}$`, 'Thévenin impedance at the fault (positive sequence), pu'), ZF],
        'The current of a balanced three-phase fault, from the Thévenin equivalent at the fault.',
        'Use subtransient reactances for the first cycles. With V_f = 1, I_f = 1/Z_th pu.'),
    P(SYMF, null, 'Subtransient Fault Current of a Generator', r`$I'' = \frac{E''}{X''_d + X_{ext}}$`, r`$I'' = \frac{E''}{X''_d + X_{ext}},\quad I' = \frac{E'}{X'_d + X_{ext}},\quad I_{ss} = \frac{E}{X_d + X_{ext}}$`,
        [v(r`$E'', E', E$`, 'internal voltages behind each reactance, pu'), v(r`$X''_d, X'_d, X_d$`, 'subtransient, transient and synchronous reactances, pu'), v(r`$X_{ext}$`, 'external reactance to the fault, pu')],
        'Fault current falls from subtransient through transient to steady state as the rotor\'s flux decays.',
        'X″ < X′ < X_d: breakers and relays are set from the subtransient value.'),
    P(SYMF, null, 'Bus Voltages During a Fault (Z-bus)', r`$V_i = V_f - Z_{ik}I_f$`, r`$I_f = \frac{V_f}{Z_{kk} + Z_f},\qquad V_i = V_f - Z_{ik}I_f$`,
        [v(r`$Z_{kk}$`, 'Z-bus diagonal at the faulted bus k (its Thévenin impedance), pu'), v(r`$Z_{ik}$`, 'Z-bus element between buses i and k, pu'), VF, ZF],
        'With Z_bus = Y_bus⁻¹, the fault current and every bus voltage come straight from one column.',
        'The faulted bus itself drops to Z_f·I_f; a bolted fault takes it to zero.'),
    // Symmetrical Components
    P(SEQ, null, 'Power in Symmetrical Components', r`$S = 3(V_0I_0^* + V_1I_1^* + V_2I_2^*)$`, r`$S = V_aI_a^* + V_bI_b^* + V_cI_c^* = 3(V_0I_0^* + V_1I_1^* + V_2I_2^*)$`,
        [v(r`$V_0, V_1, V_2$`, 'sequence voltages of phase a', V_), v(r`$I_0, I_1, I_2$`, 'sequence currents of phase a', A_)],
        'Three-phase power from the sequence quantities: the sequences carry power independently.',
        'The factor 3 comes from the 1/3 in the transformation.'),
    P(SEQ, null, 'Neutral Impedance in the Zero Sequence', r`$Z_0 = Z_{0,eq} + 3Z_n$`, r`$Z_0 = Z_{0,eq} + 3Z_n\quad (\text{grounded-Y through } Z_n)$`,
        [v(r`$Z_n$`, 'neutral grounding impedance', OHM), v(r`$Z_{0,eq}$`, 'the equipment\'s own zero-sequence impedance', OHM)],
        'A neutral impedance appears THREE times in the zero-sequence network, because 3I₀ flows through it.',
        'Ungrounded Y or delta: zero-sequence current cannot flow; Δ-Y transformers block it between sides.', OHM),
    // Unsymmetrical Faults
    P(UNSYM, null, 'Single Line-to-Ground Fault', r`$I_f = \frac{3V_f}{Z_1 + Z_2 + Z_0 + 3Z_f}$`, r`$I_{a1} = I_{a2} = I_{a0} = \frac{V_f}{Z_1 + Z_2 + Z_0 + 3Z_f},\qquad I_f = 3I_{a0}$`,
        [VF, Z123, ZF],
        'The commonest fault: the three sequence networks in series.',
        'On a solidly grounded system with Z₀ < Z₁ it can exceed the three-phase fault current.'),
    P(UNSYM, null, 'Line-to-Line Fault', r`$I_b = -j\sqrt3\frac{V_f}{Z_1 + Z_2 + Z_f}$`, r`$I_{a1} = -I_{a2} = \frac{V_f}{Z_1 + Z_2 + Z_f},\quad I_{a0} = 0,\quad I_b = -I_c = -j\sqrt3I_{a1}$`,
        [VF, v(r`$Z_1, Z_2$`, 'positive- and negative-sequence impedances, pu'), ZF],
        'Two phases shorted together: positive and negative networks in parallel, no zero sequence.',
        'With Z₁ = Z₂ it is √3/2 = 0.866 of the three-phase fault current.'),
    P(UNSYM, null, 'Double Line-to-Ground Fault', r`$I_{a1} = \frac{V_f}{Z_1 + Z_2\|(Z_0 + 3Z_f)}$`, r`$I_{a1} = \frac{V_f}{Z_1 + \frac{Z_2(Z_0 + 3Z_f)}{Z_2 + Z_0 + 3Z_f}},\quad I_{a2} = -I_{a1}\frac{Z_0 + 3Z_f}{Z_2 + Z_0 + 3Z_f},\quad I_{a0} = -I_{a1}\frac{Z_2}{Z_2 + Z_0 + 3Z_f}$`,
        [VF, Z123, ZF],
        'Two phases to ground: the negative and zero networks in parallel, in series with the positive.',
        'Ground current = 3I_a0. Check: I_a1 + I_a2 + I_a0 = 0 because phase a carries nothing.'),
    // Stability and Equal Area
    P(STAB, null, 'Swing Equation', r`$\frac{2H}{\omega_s}\frac{d^2\delta}{dt^2} = P_m - P_e$`, r`$\frac{2H}{\omega_s}\frac{d^2\delta}{dt^2} = P_m - P_e\ (\text{pu}),\qquad H = \frac{\tfrac12J\omega_{sm}^2}{S_{rated}}$`,
        [v(r`$H$`, 'inertia constant, stored energy per rated VA', r`$\text{s}$`), v(r`$\omega_s$`, 'synchronous speed, electrical', r`$\text{rad/s}$`), v(r`$P_m, P_e$`, 'mechanical input and electrical output, pu')],
        'How a machine\'s rotor angle accelerates when mechanical and electrical power differ.',
        'Change H to the system base: H_sys = H·S_machine/S_base. Typical H: 2–9 s.'),
    P(STAB, null, 'Equal Area Criterion', r`$A_{accel} = A_{decel}$`, r`$\int_{\delta_0}^{\delta_c}(P_m - P_e)\,d\delta = \int_{\delta_c}^{\delta_{\max}}(P_e - P_m)\,d\delta$`,
        [v(r`$\delta_0, \delta_c, \delta_{\max}$`, 'initial, clearing and maximum swing angles'), v(r`$P_m, P_e$`, 'mechanical and electrical power, pu')],
        'A machine stays in step if the decelerating area after clearing can match the accelerating area during the fault.',
        'δ_max cannot pass π − δ₀ on the post-fault curve, or the machine pulls out.'),
    P(STAB, null, 'Critical Clearing Angle and Time', r`$t_{cr} = \sqrt{4H(\delta_{cr} - \delta_0)/(\omega_sP_m)}$`, r`$\cos\delta_{cr} = (\pi - 2\delta_0)\sin\delta_0 - \cos\delta_0,\qquad t_{cr} = \sqrt{\frac{4H(\delta_{cr} - \delta_0)}{\omega_sP_m}}$`,
        [v(r`$\delta_0$`, 'prefault angle, rad'), v(r`$H$`, 'inertia constant', r`$\text{s}$`), v(r`$P_m$`, 'mechanical power, pu'), v(r`$\omega_s$`, 'synchronous speed', r`$\text{rad/s}$`)],
        'For a fault that cuts the electrical output to zero and is then cleared back to the same line: the latest safe clearing.',
        'Valid only when P_e = 0 during the fault and the post-fault curve equals the prefault one.'),
    // Economic Dispatch
    P(ECON, null, 'Equal Incremental Cost', r`$\frac{dC_i}{dP_i} = \lambda$`, r`$\frac{dC_i}{dP_i} = b_i + 2c_iP_i = \lambda\ (\text{all units}),\qquad P_i = \frac{\lambda - b_i}{2c_i},\quad \sum P_i = P_D$`,
        [v(r`$C_i = a_i + b_iP_i + c_iP_i^2$`, 'fuel cost of unit i', r`$\text{₱/h}$`), v(r`$\lambda$`, 'system incremental cost', r`$\text{₱/MWh}$`), v(r`$P_D$`, 'demand', r`$\text{MW}$`)],
        'The cheapest dispatch, ignoring losses: every unit runs at the same incremental cost.',
        'Respect unit limits: a unit at its limit is fixed there and the rest re-share at a new λ.'),
    P(ECON, null, 'Penalty Factor with Losses', r`$L_i\frac{dC_i}{dP_i} = \lambda$`, r`$L_i\frac{dC_i}{dP_i} = \lambda,\qquad L_i = \frac{1}{1 - \partial P_L/\partial P_i},\qquad P_L = \sum_i\sum_jP_iB_{ij}P_j$`,
        [v(r`$L_i$`, 'penalty factor of unit i'), v(r`$P_L$`, 'transmission loss', r`$\text{MW}$`), v(r`$B_{ij}$`, 'loss coefficients', r`$\text{1/MW}$`)],
        'With losses, a unit far from the load is penalized: it runs at a lower incremental cost.',
        'Now ΣP_i = P_D + P_L. A unit whose output raises losses gets L > 1.'),
    // Voltage Control
    P(VC, null, 'Approximate Voltage Drop', r`$\Delta V \approx \frac{RP + XQ}{V}$`, r`$\Delta V = |V_s| - |V_r| \approx \frac{RP + XQ}{|V_r|}$`,
        [v(r`$R, X$`, 'line resistance and reactance per phase', OHM), v(r`$P, Q$`, 'power per phase at the receiving end', r`$\text{W, var}$`), v(r`$V_r$`, 'receiving phase voltage', V_)],
        'How much voltage a line drops: on transmission lines, mostly from the reactive power.',
        'Since X ≫ R, voltage is held by controlling vars; frequency by controlling real power.', V_),
    P(VC, null, 'Reactive Power for a Voltage Change', r`$\Delta Q \approx \frac{V\,\Delta V}{X}$`, r`$\Delta Q \approx \frac{|V|\,\Delta V}{X}\ (R \ll X),\qquad \Delta Q \approx \text{MVA}_{sc}\frac{\Delta V}{V}$`,
        [v(r`$\Delta V$`, 'voltage rise wanted', V_), v(r`$X$`, 'Thévenin reactance at the bus', OHM), v(r`$\text{MVA}_{sc}$`, 'short-circuit level at the bus')],
        'The shunt vars needed to raise a bus voltage by ΔV.',
        'A strong bus (high fault MVA) needs many vars for a small change: 1% on a 1000 MVA bus takes about 10 Mvar.', r`$\text{var}$`),
    P(VC, null, 'Series Capacitor Compensation', r`$X_{eff} = X_L(1 - k)$`, r`$X_{eff} = X_L - X_C = X_L(1 - k),\qquad k = \frac{X_C}{X_L},\qquad P_{\max} = \frac{V_sV_r}{X_L(1 - k)}$`,
        [v(r`$X_L$`, 'line series reactance', OHM), v(r`$X_C$`, 'series capacitor reactance', OHM), v(r`$k$`, 'degree of compensation, typically 0.25–0.75')],
        'Series capacitors cancel part of a long line\'s reactance, raising its power limit.',
        '50% compensation doubles the steady-state power limit. Risk: subsynchronous resonance with turbine shafts.', OHM),
    // Corona
    P(COR, null, 'Disruptive Critical Voltage (Peek)', r`$V_d = g_0m\delta r\ln\frac{D}{r}$`, r`$V_d = g_0m\delta r\ln\frac{D}{r},\quad g_0 = 21.1\ \text{kV}_{rms}/\text{cm},\quad \delta = \frac{3.92b}{273 + t}$`,
        [v(r`$m$`, 'surface irregularity factor: 1 polished, 0.8–0.87 stranded'), v(r`$\delta$`, 'air density factor (b in cmHg, t in °C)'), v(r`$r, D$`, 'conductor radius and spacing (cm)', r`$\text{cm}$`)],
        'The phase voltage at which corona starts on a line conductor.',
        'Phase (line-to-neutral) kV rms. Higher altitude or temperature lowers δ, so corona starts sooner.', r`$\text{kV}$`),
    P(COR, null, 'Visual Critical Voltage', r`$V_v = V_d\frac{m_v}{m}(1 + 0.3/\sqrt{\delta r})$`, r`$V_v = g_0m_v\delta r\left(1 + \frac{0.3}{\sqrt{\delta r}}\right)\ln\frac{D}{r}\quad (r \text{ in cm})$`,
        [v(r`$m_v$`, 'irregularity factor for visual corona: 1 polished, 0.72 local, 0.82 general glow'), v(r`$\delta$`, 'air density factor'), v(r`$r, D$`, 'radius and spacing (cm)', r`$\text{cm}$`)],
        'The voltage at which the corona glow becomes visible, higher than the disruptive voltage.',
        'Losses start at V_d, before the glow is seen.', r`$\text{kV}$`),
    P(COR, null, "Peek's Corona Loss", r`$P \propto (f + 25)\sqrt{r/D}\,(V - V_d)^2$`, r`$P =\frac{242.2}{\delta}(f + 25)\sqrt{\frac{r}{D}}(V - V_d)^2 \times 10^{-5}\ \text{kW/km/phase}$`,
        [v(r`$V, V_d$`, 'operating and disruptive phase voltages, kV rms'), v(r`$f$`, 'frequency', r`$\text{Hz}$`), v(r`$\delta$`, 'air density factor')],
        'Corona power loss per km per phase once the voltage exceeds the disruptive critical voltage.',
        'Zero below V_d; it rises with the SQUARE of the excess, and greatly in foul weather.', r`$\text{kW/km}$`),
    // Sag and Tension
    P(SAG, null, 'Sag of a Level Span', r`$S = \frac{wL^2}{8T}$`, r`$S = \frac{wL^2}{8T}\quad (\text{parabolic; span } L)$`,
        [v(r`$w$`, 'weight per unit length (or resultant loading)', r`$\text{N/m}$`), v(r`$L$`, 'span', M_), v(r`$T$`, 'horizontal tension', r`$\text{N}$`)],
        'How far a conductor dips between level supports.',
        'With half-span l: S = wl²/(2T). Close to the catenary when the sag is small.', M_),
    P(SAG, null, 'Supports at Different Levels', r`$x_1 = \frac{L}{2} - \frac{Th}{wL}$`, r`$x_1 = \frac{L}{2} - \frac{Th}{wL},\quad x_2 = \frac{L}{2} + \frac{Th}{wL},\quad S_1 = \frac{wx_1^2}{2T},\ S_2 = \frac{wx_2^2}{2T}$`,
        [v(r`$h$`, 'height difference of the supports', M_), v(r`$x_1, x_2$`, 'distances from the lowest point to the lower and higher supports', M_), v(r`$T$`, 'horizontal tension', r`$\text{N}$`)],
        'Where the lowest point falls, and the sag from each support, on a sloping span.',
        'S₂ − S₁ = h. If x₁ comes out negative, the lowest point lies outside the span.', M_),
    P(SAG, null, 'Ice and Wind Loading', r`$w_r = \sqrt{(w + w_i)^2 + w_w^2}$`, r`$w_i = \rho_i\pi t(d + t),\quad w_w = p(d + 2t),\quad w_r = \sqrt{(w + w_i)^2 + w_w^2}$`,
        [v(r`$t$`, 'radial ice thickness', M_), v(r`$d$`, 'conductor diameter', M_), v(r`$\rho_i$`, 'ice weight density, about 8.9 kN/m³', r`$\text{N/m}^3$`), v(r`$p$`, 'wind pressure on the projected area', r`$\text{Pa}$`)],
        'The resultant load per metre when the conductor carries ice and wind.',
        'The sag then lies in the plane of w_r; its vertical part is S·(w + w_i)/w_r.', r`$\text{N/m}$`),
    P(SAG, null, 'Conductor Length in a Span', r`$L_c = L + \frac{8S^2}{3L}$`, r`$L_c = L + \frac{8S^2}{3L},\qquad T_{support} \approx T + wS$`,
        [v(r`$L$`, 'span', M_), v(r`$S$`, 'sag', M_), v(r`$w$`, 'weight per length', r`$\text{N/m}$`)],
        'The conductor needed for a span, and the tension at the supports.',
        'A small change in length makes a big change in sag: why temperature matters so much.', M_),
];

module.exports = { subject: 'EE', topic: 'Power System Analysis', migration: '20270101000000_cards_power_system_analysis', file, revisions, retire, drafts };
