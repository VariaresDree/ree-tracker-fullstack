'use strict';

// EE › Electric Circuits 1 formula cards (Library round, 2026-11-18): 11 live
// cards for 15 subtopics, all correct, so they are filed as they are. Three
// cards that belong here sat in Electric Circuits 2 (maximum power transfer
// and the two reactances) and move in. This file adds the rest: Ohm's law and
// power, series-parallel, circular mils and copper's inferred zero, KCL/KVL,
// nodal and mesh matrices, superposition, source transformation, Thévenin and
// Norton, the load-power curve, delta-wye, the ideal op amp and its summing
// and difference circuits, the capacitor and inductor laws and combinations,
// first-order step response, RLC roots, phasors and impedance. Inverting and
// non-inverting gains stay in Electronics; transients in depth stay in
// Electrical Transient Analysis. See mathematics/algebra.js for the format;
// tests/electricCircuits1Formulas.test.js checks each by solving circuits.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SRC = 'DC and AC Sources and Components';
const LAWS = 'Voltage and Current Laws';
const NODAL = 'Nodal Analysis';
const MESH = 'Mesh Analysis';
const SUP = 'Linearity and Superposition';
const XFORM = 'Source Transformation';
const THEV = 'Thevenin and Norton';
const MPT = 'Maximum Power Transfer';
const DY = 'Delta-Wye Conversion';
const OPAMP = 'Controlled Sources and Ideal Op Amp';
const LC = 'Capacitors and Inductors';
const FIRST = 'RL and RC Circuits';
const RLC = 'RLC Circuits';
const PHASOR = 'Phasors and Impedance';
const SSS = 'Sinusoidal Steady-State Analysis';
const CONST = 'Constants';

const file = [
    ['e9399967-2ee3-4715-803f-ae2476f685d9', SRC, CONST], // Resistivity of Annealed Copper at 20 °C
    ['9af93750-6966-44eb-aa4d-ef31bd9c6cf5', SRC, null], // Resistance of a Conductor (Resistivity Formula)
    ['73fcf861-5bb8-405c-8906-cf892f019deb', SRC, null], // Temperature Dependence of Resistance
    ['78e3caf8-8326-426d-b741-a2cbd50798cc', LAWS, null], // Voltage Divider Rule (Two Resistors in Series)
    ['fbb94a75-a157-42ea-8eb6-5a374563d489', LAWS, null], // Current Divider Rule (Two Parallel Resistors)
    ['785dca9a-38f0-4c15-8982-d9254af1a2bb', LC, null], // Capacitor Charge-Voltage Relationship
    ['6532e61c-7c24-444f-aefc-7234583a76f0', LC, null], // Energy Stored in a Capacitor
    ['ac37bb5b-2ffb-4744-98c5-8dd1958d98b5', LC, null], // Energy Stored in an Inductor
    ['779889fe-31be-4934-8834-8e7c655a80d4', LC, CONST], // Permittivity of Free Space
    ['fb771681-a7ed-4189-b720-417fda985c01', LC, CONST], // Permeability of Free Space
    ['5c50f0e3-e635-482a-a4af-7d5170a794c3', FIRST, null], // RC Circuit Time Constant
];

// From Electric Circuits 2: they are Circuits 1 material.
const move = [
    ['60069ed6-8b27-4cf9-a257-72bc4c7403aa', MPT, null], // Maximum Power Transfer Theorem
    ['717d57a9-9b5a-4ea7-9826-00b294e07038', PHASOR, null], // Inductive Reactance
    ['eea2a44c-b252-4294-a189-9c2ae0b1e67c', PHASOR, null], // Capacitive Reactance
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const OHM = r`$\Omega$`;

const drafts = [
    // DC and AC Sources and Components
    P(SRC, null, "Ohm's Law and Electric Power", r`$P = VI = I^2R = \frac{V^2}{R}$`, r`$V = IR,\qquad P = VI = I^2R = \frac{V^2}{R}$`,
        [v(r`$V$`, 'voltage', V_), v(r`$I$`, 'current', A_), v(r`$R$`, 'resistance', OHM)],
        'The voltage, current and resistance of a resistor, and the power it turns into heat.',
        'Pick the power form with the quantities given: I²R for series parts sharing a current, V²/R for parallel parts sharing a voltage.', r`$\text{W}$`),
    P(SRC, null, 'Electrical Energy and Its Cost', r`$W = Pt$`, r`$W = Pt,\qquad \text{cost} = W_{\text{kWh}} \times \text{rate}$`,
        [v(r`$P$`, 'power', r`$\text{kW}$`), v(r`$t$`, 'time', r`$\text{h}$`)],
        'Energy used by a load over time, and its bill.',
        '1 kWh = 3.6 MJ. A 1.5 kW heater for 4 h uses 6 kWh.', r`$\text{kWh}$`),
    P(SRC, null, 'Circular Mil Area', r`$A_{CM} = d_{mil}^2$`, r`$A_{CM} = d_{\text{mil}}^2,\qquad 1\ \text{CM} = 5.067 \times 10^{-4}\ \text{mm}^2,\qquad 1\ \text{MCM} = 1000\ \text{CM}$`,
        [v(r`$d_{\text{mil}}$`, 'wire diameter in mils (1 mil = 0.001 in)')],
        'The area unit for round wire in the US and older Philippine tables: just the diameter squared.',
        'With R = ρL/A, use ρ = 10.37 Ω·CM/ft for copper.', r`$\text{CM}$`),
    P(SRC, null, 'Inferred Absolute Zero of Copper', r`$\frac{R_2}{R_1} = \frac{234.5 + T_2}{234.5 + T_1}$`, r`$\frac{R_2}{R_1} = \frac{T + T_2}{T + T_1};\qquad T = 234.5\,^\circ\text{C (copper)},\ 228\,^\circ\text{C (aluminium)}$`,
        [v(r`$R_1, R_2$`, 'resistances at temperatures T₁ and T₂', OHM), v(r`$T_1, T_2$`, 'temperatures', r`$^\circ\text{C}$`)],
        'Resistance at a new temperature using the temperature at which the metal\'s resistance would extrapolate to zero.',
        'It gives α at 20 °C for copper: 1/(234.5 + 20) = 0.00393 per °C.'),
    P(SRC, null, 'Resistors in Series and Parallel', r`$R_s = \sum R,\ \frac{1}{R_p} = \sum\frac{1}{R}$`, r`$R_s = R_1 + R_2 + \cdots;\qquad \frac{1}{R_p} = \frac{1}{R_1} + \frac{1}{R_2} + \cdots;\qquad \text{two: } R_p = \frac{R_1R_2}{R_1 + R_2}$`,
        [v(r`$R_k$`, 'resistances', OHM)],
        'Combining resistors: series add, parallel add as conductances.',
        'A parallel combination is always smaller than its smallest resistor. n equal resistors: R/n.', OHM),
    // Voltage and Current Laws
    P(LAWS, null, "Kirchhoff's Current and Voltage Laws", r`$\sum i = 0,\ \sum v = 0$`, r`$\text{KCL: } \sum i_{\text{into node}} = 0;\qquad \text{KVL: } \sum v_{\text{around loop}} = 0$`,
        [v(r`$i$`, 'branch currents', A_), v(r`$v$`, 'element voltages', V_)],
        'Charge is conserved at every node, and energy around every closed loop.',
        'Pick one sign convention and keep it: a voltage rise counts the opposite way to a drop.'),
    // Nodal Analysis
    P(NODAL, null, 'Nodal Analysis (Conductance Matrix)', r`$\mathbf{G}\mathbf{v} = \mathbf{i}$`, r`$\mathbf{G}\mathbf{v} = \mathbf{i};\qquad G_{kk} = \sum \text{conductances at node } k,\quad G_{kj} = -\text{conductance between } k \text{ and } j$`,
        [v(r`$\mathbf{v}$`, 'node voltages from the reference', V_), v(r`$\mathbf{i}$`, 'source currents into each node', A_)],
        'Node voltages from KCL at every node but the reference, written as a matrix.',
        'A voltage source between two non-reference nodes makes a supernode: write KCL around both together.'),
    // Mesh Analysis
    P(MESH, null, 'Mesh Analysis (Resistance Matrix)', r`$\mathbf{R}\mathbf{i} = \mathbf{v}$`, r`$\mathbf{R}\mathbf{i} = \mathbf{v};\qquad R_{kk} = \sum \text{resistance around mesh } k,\quad R_{kj} = -\text{resistance shared by } k \text{ and } j$`,
        [v(r`$\mathbf{i}$`, 'mesh currents, all clockwise', A_), v(r`$\mathbf{v}$`, 'source voltages driving each mesh', V_)],
        'Mesh currents from KVL around every window of a planar circuit.',
        'A current source shared by two meshes makes a supermesh. A shared resistor carries the DIFFERENCE of the two mesh currents.'),
    // Linearity and Superposition
    P(SUP, null, 'Superposition', r`$x = \sum x_k$`, r`$x = \sum_k x_k$`,
        [v(r`$x_k$`, 'the response with only source k active (other voltage sources shorted, current sources opened)')],
        'In a linear circuit each source\'s effect can be found alone and the results added.',
        'It adds voltages and currents, NOT powers. Dependent sources are never turned off.'),
    // Source Transformation
    P(XFORM, null, 'Source Transformation', r`$V_s = I_sR$`, r`$V_s = I_sR \iff I_s = \frac{V_s}{R}\quad (\text{same } R \text{ in series or in parallel})$`,
        [v(r`$V_s$`, 'voltage source', V_), v(r`$I_s$`, 'current source', A_), v(r`$R$`, 'its resistance', OHM)],
        'A voltage source with series R is equivalent, at its terminals, to a current source with the same R in parallel.',
        'The current source points toward the + terminal of the voltage source it replaces.'),
    // Thevenin and Norton
    P(THEV, null, 'Thevenin and Norton Equivalents', r`$R_{th} = \frac{V_{oc}}{I_{sc}}$`, r`$V_{th} = V_{oc},\qquad I_N = I_{sc},\qquad R_{th} = R_N = \frac{V_{oc}}{I_{sc}}$`,
        [v(r`$V_{oc}$`, 'open-circuit voltage at the terminals', V_), v(r`$I_{sc}$`, 'short-circuit current', A_)],
        'Any linear two-terminal circuit is a source and one resistance.',
        'With only independent sources, R_th is the resistance seen with them turned off. With dependent sources, use V_oc/I_sc or a test source.', OHM),
    // Maximum Power Transfer
    P(MPT, null, 'Load Power versus Load Resistance', r`$P_L = \frac{V_{th}^2R_L}{(R_{th} + R_L)^2}$`, r`$P_L = \frac{V_{th}^2R_L}{(R_{th} + R_L)^2},\qquad \eta = \frac{R_L}{R_{th} + R_L}$`,
        [v(r`$V_{th}, R_{th}$`, 'Thévenin source', V_), v(r`$R_L$`, 'load', OHM)],
        'The power a load gets from a Thévenin source, and the efficiency of the transfer.',
        'Power peaks at R_L = R_th (η = 50%); power systems instead run R_L ≫ R_th for high efficiency.', r`$\text{W}$`),
    // Delta-Wye Conversion
    P(DY, null, 'Delta-Wye Conversion', r`$R_a = \frac{R_{ab}R_{ca}}{R_{ab} + R_{bc} + R_{ca}}$`, r`$\Delta \to Y: R_a = \frac{R_{ab}R_{ca}}{\Sigma R_\Delta};\qquad Y \to \Delta: R_{ab} = \frac{R_aR_b + R_bR_c + R_cR_a}{R_c};\qquad \text{balanced: } R_Y = \frac{R_\Delta}{3}$`,
        [v(r`$R_{ab}, R_{bc}, R_{ca}$`, 'delta resistances', OHM), v(r`$R_a, R_b, R_c$`, 'wye resistances', OHM)],
        'Converting between a triangle and a star of three resistors so a bridge can be reduced.',
        'Δ→Y: the two delta resistors touching the node, over the sum. Y→Δ: sum of products, over the opposite wye resistor.', OHM),
    // Controlled Sources and Ideal Op Amp
    P(OPAMP, null, 'Ideal Op-Amp Rules', r`$v_+ = v_-,\ i_\pm = 0$`, r`$v_+ = v_-\ (\text{with negative feedback}),\qquad i_+ = i_- = 0;\qquad \text{follower: } v_o = v_{in}$`,
        [v(r`$v_+, v_-$`, 'input terminal voltages', V_), v(r`$i_+, i_-$`, 'input currents', A_)],
        'The two rules that solve every ideal op-amp circuit: the inputs sit at the same voltage, and draw no current.',
        'The output can\'t exceed the supply rails: past them it saturates. Inverting and non-inverting gains are in Electronics.'),
    P(OPAMP, null, 'Summing Amplifier', r`$v_o = -R_f\sum\frac{v_k}{R_k}$`, r`$v_o = -R_f\left(\frac{v_1}{R_1} + \frac{v_2}{R_2} + \cdots\right)$`,
        [v(r`$R_f$`, 'feedback resistor', OHM), v(r`$v_k, R_k$`, 'each input and its resistor', V_)],
        'An inverting amplifier with several inputs: a weighted sum.',
        'With all resistors equal it adds the inputs (inverted); a DAC is a summer with binary-weighted resistors.', V_),
    P(OPAMP, null, 'Difference Amplifier', r`$v_o = \frac{R_2}{R_1}(v_2 - v_1)$`, r`$v_o = \frac{R_2}{R_1}(v_2 - v_1)\quad (\text{matched ratios } R_4/R_3 = R_2/R_1)$`,
        [v(r`$v_1, v_2$`, 'inverting and non-inverting inputs', V_), v(r`$R_1, R_2$`, 'input and feedback resistors', OHM)],
        'Amplifies the difference between two inputs and rejects what they have in common.',
        'Unmatched ratios let common-mode voltage leak through: why instrumentation amplifiers exist.', V_),
    // Capacitors and Inductors
    P(LC, null, 'Capacitor and Inductor Laws', r`$i = C\frac{dv}{dt},\ v = L\frac{di}{dt}$`, r`$i_C = C\frac{dv_C}{dt},\qquad v_L = L\frac{di_L}{dt}$`,
        [v(r`$C$`, 'capacitance', r`$\text{F}$`), v(r`$L$`, 'inductance', r`$\text{H}$`)],
        'How capacitors and inductors relate current and voltage.',
        'A capacitor\'s voltage and an inductor\'s current can\'t jump. In dc steady state a capacitor is open, an inductor shorted.'),
    P(LC, null, 'Capacitance and Inductance Combinations', r`$C_p = \sum C,\ L_s = \sum L$`, r`$C_p = \sum C_k,\ \frac{1}{C_s} = \sum\frac{1}{C_k};\qquad L_s = \sum L_k,\ \frac{1}{L_p} = \sum\frac{1}{L_k}$`,
        [v(r`$C_k$`, 'capacitances', r`$\text{F}$`), v(r`$L_k$`, 'inductances (no mutual coupling)', r`$\text{H}$`)],
        'Combining capacitors (opposite to resistors) and inductors (like resistors).',
        'Series capacitors share the same charge; their voltages divide inversely to C.'),
    // RL and RC Circuits
    P(FIRST, null, 'First-Order Step Response', r`$x(t) = x_\infty + (x_0 - x_\infty)e^{-t/\tau}$`, r`$x(t) = x(\infty) + [x(0^+) - x(\infty)]e^{-t/\tau};\qquad \tau = RC \text{ or } \frac{L}{R}$`,
        [v(r`$x$`, 'any voltage or current in the circuit'), v(r`$\tau$`, 'time constant (R is the Thévenin resistance seen by C or L)', r`$\text{s}$`)],
        'Every RC or RL circuit with a step input: start value, final value and time constant are all you need.',
        'After 5τ the response is within 1% of final. Find x(0⁺) from the capacitor voltage or inductor current, which don\'t jump.'),
    // RLC Circuits
    P(RLC, null, 'RLC Characteristic Roots', r`$s = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$`, r`$s_{1,2} = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2};\quad \omega_0 = \frac{1}{\sqrt{LC}};\quad \alpha = \frac{R}{2L}\ (\text{series}),\ \frac{1}{2RC}\ (\text{parallel})$`,
        [v(r`$\alpha$`, 'neper frequency', r`$\text{Np/s}$`), v(r`$\omega_0$`, 'resonant frequency', r`$\text{rad/s}$`)],
        'The natural response of an RLC circuit: overdamped (α > ω₀), critically damped (=), or underdamped (<) and ringing.',
        'Series and parallel have different α: R raises the series damping but LOWERS the parallel damping.', r`$\text{1/s}$`),
    // Phasors and Impedance
    P(PHASOR, null, 'Phasor Representation', r`$\mathbf{V} = V_m\angle\phi$`, r`$v(t) = V_m\cos(\omega t + \phi) \iff \mathbf{V} = V_m\angle\phi = V_m(\cos\phi + j\sin\phi)$`,
        [v(r`$V_m$`, 'amplitude', V_), v(r`$\phi$`, 'phase angle'), v(r`$\omega$`, 'angular frequency', r`$\text{rad/s}$`)],
        'A sinusoid of known frequency as a complex number: calculus becomes algebra.',
        'Use the same reference (cosine or sine) for every source. Board answers usually use RMS phasors: V_m/√2.'),
    P(PHASOR, null, 'Impedance and Admittance', r`$Z = R + jX$`, r`$Z_R = R,\ Z_L = j\omega L,\ Z_C = \frac{1}{j\omega C};\qquad Z = R + jX,\qquad Y = \frac{1}{Z} = G + jB$`,
        [v(r`$R$`, 'resistance', OHM), v(r`$X$`, 'reactance (+ inductive, − capacitive)', OHM), v(r`$G, B$`, 'conductance and susceptance', r`$\text{S}$`)],
        'The ac version of resistance, a complex number, and its reciprocal.',
        'G is not 1/R unless X = 0: G = R/(R² + X²).', OHM),
    // Sinusoidal Steady-State Analysis
    P(SSS, null, 'Impedances in Series and Parallel', r`$Z_s = \sum Z,\ \frac{1}{Z_p} = \sum\frac{1}{Z}$`, r`$\mathbf{V} = \mathbf{I}Z;\qquad Z_s = \sum Z_k;\qquad \frac{1}{Z_p} = \sum\frac{1}{Z_k};\qquad |Z| = \sqrt{R^2 + X^2},\ \theta = \tan^{-1}\frac{X}{R}$`,
        [v(r`$Z_k$`, 'impedances', OHM)],
        'Ohm\'s law and the series-parallel rules carried over to ac with complex impedances: every dc method (nodal, mesh, Thévenin) works the same way.',
        'Add impedances as complex numbers, never their magnitudes: 3 Ω + j4 Ω is 5 Ω, not 7.', OHM),
];

module.exports = { subject: 'EE', topic: 'Electric Circuits 1', migration: '20261225000000_cards_electric_circuits_1', file, move, revisions, retire, drafts };
