'use strict';

// EE › Electronics 1 and 2 formula cards (Library round, 2026-11-18): 9 live
// cards for 12 subtopics, all correct, filed as they are. This file adds the
// rest: mass action, built-in potential and conductivity; diode resistance,
// the 60 mV per decade rule and temperature drift; rectifier PIV, ripple,
// ripple factor and efficiency; Zener regulators and regulation; BJT bias
// (fixed/emitter, voltage divider, load line), small-signal parameters and
// the CE, CC and CB stages; MOSFET current, FET transconductance, common
// source and self bias; coupling and bypass cutoffs, Miller effect, decibels,
// gain-bandwidth; cascades, feedback and Darlington pairs; integrator,
// slew rate, CMRR and Schmitt triggers; Barkhausen, phase-shift, Wien and LC
// oscillators; class A and B efficiency, class B dissipation and heat sinks.
// The ideal op-amp rules, summing and difference amplifiers are in Electric
// Circuits 1; first-order filters in Electric Circuits 2. See
// mathematics/algebra.js for the format; tests/electronicsFormulas.test.js
// checks each by simulation, numerical integration or complex arithmetic.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SEMI = 'Semiconductors and PN Junction';
const DIODE = 'Diodes';
const RECT = 'Rectifiers and Filters';
const ZEN = 'Zener Regulators';
const BIAS = 'BJT Biasing';
const AMP = 'BJT Amplifiers';
const FET = 'FETs and MOSFETs';
const FREQ = 'Frequency Response';
const MULTI = 'Multistage and Feedback Amplifiers';
const OPAMP = 'Operational Amplifiers';
const OSC = 'Oscillators';
const PWR = 'Power Amplifiers';

const file = [
    ['e898ed77-25a8-465e-b65d-a21f04988616', SEMI, null], // Thermal Voltage
    ['2faad7e1-a6c4-436d-b2d2-323a3d82c1b2', DIODE, null], // Shockley Diode Equation
    ['22cb2cc1-aa10-4648-b0ae-4b843e5129cd', RECT, null], // Half-Wave Rectifier DC Output
    ['0c9244f5-6ebc-4711-8fed-01c7905289d7', RECT, null], // Full-Wave Rectifier DC Output
    ['fdfb5ee9-392d-4731-80af-6622ef45dd8b', BIAS, null], // BJT Current Relation
    ['58e701c4-c7a0-4cd5-935a-a0c3fe0c4a63', BIAS, null], // BJT Current Gain
    ['3fb301f9-53c6-4a57-b7d5-ee6401bf0dde', FET, null], // JFET Drain Current
    ['9e44a27c-fd7c-41e0-8b7e-95ee78773312', OPAMP, null], // Inverting Amplifier Gain
    ['40446ad4-7035-4b2c-ace6-56ffc68c1c07', OPAMP, null], // Non-Inverting Amplifier Gain
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const OHM = r`$\Omega$`;
const HZ = r`$\text{Hz}$`;
const W_ = r`$\text{W}$`;
const VT = v(r`$V_T$`, 'thermal voltage, kT/q ≈ 25.9 mV at 300 K', V_);
const BETA = v(r`$\beta$`, 'common-emitter current gain');
const RE_ = v(r`$r_e$`, 'emitter resistance, V_T/I_E', OHM);
const VM = v(r`$V_m$`, 'peak voltage applied to the rectifier', V_);
const GM = v(r`$g_m$`, 'transconductance', r`$\text{S}$`);
const VCC = v(r`$V_{CC}$`, 'supply voltage', V_);

const drafts = [
    // Semiconductors and PN Junction
    P(SEMI, null, 'Mass-Action Law', r`$np = n_i^2$`, r`$np = n_i^2;\qquad \text{n-type: } n \approx N_D,\ p = \frac{n_i^2}{N_D}$`,
        [v(r`$n, p$`, 'electron and hole concentrations', r`$\text{cm}^{-3}$`), v(r`$n_i$`, 'intrinsic concentration (Si ≈ 1.0 × 10¹⁰ at 300 K)', r`$\text{cm}^{-3}$`), v(r`$N_D$`, 'donor concentration', r`$\text{cm}^{-3}$`)],
        'In equilibrium the product of electron and hole concentrations is fixed by the material and temperature.',
        'Doping raises the majority carriers and LOWERS the minority carriers by the same factor.'),
    P(SEMI, null, 'Built-In Potential of a PN Junction', r`$V_0 = V_T\ln\frac{N_AN_D}{n_i^2}$`, r`$V_0 = V_T\ln\frac{N_AN_D}{n_i^2}$`,
        [VT, v(r`$N_A, N_D$`, 'acceptor and donor concentrations', r`$\text{cm}^{-3}$`), v(r`$n_i$`, 'intrinsic concentration', r`$\text{cm}^{-3}$`)],
        'The barrier voltage across a junction with no bias.',
        'Silicon junctions give about 0.6 to 0.8 V; it rises only logarithmically with doping.', V_),
    P(SEMI, null, 'Conductivity of a Semiconductor', r`$\sigma = q(n\mu_n + p\mu_p)$`, r`$\sigma = q(n\mu_n + p\mu_p),\qquad \rho = \frac{1}{\sigma}$`,
        [v(r`$q$`, 'electron charge', r`$\text{C}$`), v(r`$n, p$`, 'carrier concentrations', r`$\text{m}^{-3}$`), v(r`$\mu_n, \mu_p$`, 'electron and hole mobilities', r`$\text{m}^2/\text{V·s}$`)],
        'How doping and mobility set a semiconductor\'s conductivity.',
        'Electrons are about 3 times as mobile as holes in silicon, so n-type conducts better at the same doping.', r`$\text{S/m}$`),
    // Diodes
    P(DIODE, null, 'Diode Dynamic Resistance', r`$r_d = \frac{nV_T}{I_D}$`, r`$r_d = \frac{nV_T}{I_D} \approx \frac{26\ \text{mV}}{I_D}$`,
        [v(r`$n$`, 'ideality factor (1 to 2)'), VT, v(r`$I_D$`, 'dc diode current', A_)],
        'The small-signal resistance of a forward-biased diode at its operating point.',
        'At 1 mA it is about 26 Ω; at 10 mA, 2.6 Ω. Use it for small ac signals only.', OHM),
    P(DIODE, null, 'Diode Voltage per Decade of Current', r`$\Delta V = nV_T\ln\frac{I_2}{I_1}$`, r`$V_2 - V_1 = nV_T\ln\frac{I_2}{I_1} \approx 60n\ \text{mV per decade}$`,
        [v(r`$I_1, I_2$`, 'two forward currents', A_), v(r`$n$`, 'ideality factor'), VT],
        'How much more forward voltage a diode needs for more current.',
        'Ten times the current costs only about 60 mV: why the 0.7 V model works.', V_),
    P(DIODE, null, 'Diode Circuit with the Constant-Drop Model', r`$I = \frac{V_S - V_{D0}}{R}$`, r`$I = \frac{V_S - V_{D0}}{R},\qquad V_{D0} \approx 0.7\ \text{V (Si)},\ 0.3\ \text{V (Ge)}$`,
        [v(r`$V_S$`, 'source voltage', V_), v(r`$V_{D0}$`, 'assumed diode drop', V_), v(r`$R$`, 'series resistance', OHM)],
        'The quick solution of a diode circuit: replace a conducting diode with a fixed drop.',
        'Check the assumption: if the answer gives negative current, the diode is off.', A_),
    P(DIODE, null, 'Diode Voltage Temperature Coefficient', r`$\Delta V_D \approx -2\ \text{mV/°C} \times \Delta T$`, r`$\Delta V_D \approx -2\ \text{mV/°C} \times \Delta T\quad (\text{constant current})$`,
        [v(r`$\Delta T$`, 'temperature rise', r`$\text{°C}$`)],
        'A silicon diode\'s forward voltage falls about 2 mV for each degree of heating.',
        'This is how diodes and transistor junctions serve as temperature sensors, and why bias drifts.', V_),
    // Rectifiers and Filters
    P(RECT, null, 'Peak Inverse Voltage of Rectifiers', r`$\text{PIV}: V_m,\ 2V_m,\ V_m$`, r`$\text{half-wave: } V_m\ (2V_m \text{ with a filter capacitor});\quad \text{center-tap: } 2V_m;\quad \text{bridge: } V_m$`,
        [VM],
        'The largest reverse voltage each diode must block.',
        'The center-tap needs diodes rated for twice the bridge\'s; the bridge loses two diode drops (1.4 V) instead of one.', V_),
    P(RECT, null, 'Capacitor-Filter Ripple', r`$V_{r(pp)} \approx \frac{I_{dc}}{fC}$`, r`$V_{r(pp)} \approx \frac{I_{dc}}{f_rC},\qquad V_{dc} \approx V_m - \frac{V_{r(pp)}}{2},\qquad V_{r(rms)} \approx \frac{V_{r(pp)}}{2\sqrt3}$`,
        [v(r`$I_{dc}$`, 'load current', A_), v(r`$f_r$`, 'ripple frequency: line f half-wave, 2f full-wave', HZ), v(r`$C$`, 'filter capacitance', r`$\text{F}$`)],
        'The peak-to-peak ripple left by a reservoir capacitor.',
        'Full-wave halves the ripple for the same capacitor because the ripple frequency doubles.', V_),
    P(RECT, null, 'Ripple Factor', r`$r = \frac{V_{r(rms)}}{V_{dc}}$`, r`$r = \frac{V_{r(rms)}}{V_{dc}} = \sqrt{\left(\frac{V_{rms}}{V_{dc}}\right)^2 - 1};\qquad \text{unfiltered: } 1.21 \text{ (half)},\ 0.483 \text{ (full)}$`,
        [v(r`$V_{r(rms)}$`, 'RMS of the ac (ripple) part', V_), v(r`$V_{dc}$`, 'average output', V_), v(r`$V_{rms}$`, 'total RMS output: V_m/2 half-wave, V_m/√2 full-wave', V_)],
        'How much ac rides on a rectifier\'s dc output, as a fraction.',
        'An unfiltered half-wave output has more ripple RMS than dc: r is over 1.'),
    P(RECT, null, 'Rectification Efficiency', r`$\eta = \frac{P_{dc}}{P_{ac}}$`, r`$\eta = \frac{V_{dc}^2/R}{V_{rms}^2/R}:\ \frac{4}{\pi^2} = 40.5\%\ (\text{half}),\quad \frac{8}{\pi^2} = 81.1\%\ (\text{full})$`,
        [v(r`$P_{dc}$`, 'dc output power', W_), v(r`$P_{ac}$`, 'total output power (RMS)', W_)],
        'The share of a rectifier\'s output power that is useful dc, ideal diodes and resistive load.',
        'Often quoted as 40.6% and 81.2%; full-wave is exactly twice half-wave.'),
    // Zener Regulators
    P(ZEN, null, 'Zener Regulator Series Resistor', r`$I_Z = \frac{V_{in} - V_Z}{R_S} - I_L$`, r`$I_Z = \frac{V_{in} - V_Z}{R_S} - I_L,\qquad R_{S(\max)} = \frac{V_{in(\min)} - V_Z}{I_{Z(\min)} + I_{L(\max)}}$`,
        [v(r`$V_{in}$`, 'unregulated input', V_), v(r`$V_Z$`, 'Zener voltage', V_), v(r`$R_S$`, 'series resistor', OHM), v(r`$I_L$`, 'load current', A_)],
        'The current left for the Zener after the load takes its share, and the largest series resistor that keeps it regulating.',
        'Design at the worst case: lowest input with the heaviest load. Check the Zener\'s power at highest input with no load.', A_),
    P(ZEN, null, 'Zener Power Dissipation', r`$P_Z = V_ZI_Z$`, r`$P_Z = V_ZI_Z,\qquad P_{Z(\max)} = V_Z\left(\frac{V_{in(\max)} - V_Z}{R_S}\right)\ (\text{no load})$`,
        [v(r`$V_Z$`, 'Zener voltage', V_), v(r`$I_Z$`, 'Zener current', A_)],
        'The power the Zener must handle, worst when the load is removed at the highest input.',
        'With no load, every milliampere through R_S goes through the Zener.', W_),
    P(ZEN, null, 'Load and Line Regulation', r`$\%LR = \frac{V_{NL} - V_{FL}}{V_{FL}} \times 100$`, r`$\%\text{load reg} = \frac{V_{NL} - V_{FL}}{V_{FL}} \times 100,\qquad \text{line reg} = \frac{\Delta V_o}{\Delta V_{in}}$`,
        [v(r`$V_{NL}, V_{FL}$`, 'output with no load and full load', V_), v(r`$\Delta V_o, \Delta V_{in}$`, 'change of output and input', V_)],
        'How well a supply holds its output as the load or the input changes.',
        'Smaller is better; an ideal regulator has 0% load regulation.'),
    // BJT Biasing
    P(BIAS, null, 'Base Bias with Emitter Resistor', r`$I_B = \frac{V_{CC} - V_{BE}}{R_B + (\beta + 1)R_E}$`, r`$I_B = \frac{V_{CC} - V_{BE}}{R_B + (\beta + 1)R_E},\quad I_C = \beta I_B,\quad V_{CE} = V_{CC} - I_CR_C - I_ER_E$`,
        [VCC, v(r`$V_{BE}$`, 'base-emitter drop, about 0.7 V', V_), v(r`$R_B, R_C, R_E$`, 'base, collector and emitter resistors', OHM), BETA],
        'The Q-point of a base-biased transistor; R_E = 0 is plain fixed bias.',
        'R_E appears in the base loop multiplied by (β + 1): that is what steadies the Q-point against β.', A_),
    P(BIAS, null, 'Voltage-Divider Bias', r`$I_E = \frac{V_{TH} - V_{BE}}{R_E + R_{TH}/(\beta + 1)}$`, r`$V_{TH} = V_{CC}\frac{R_2}{R_1 + R_2},\quad R_{TH} = R_1 \| R_2,\quad I_E = \frac{V_{TH} - V_{BE}}{R_E + R_{TH}/(\beta + 1)}$`,
        [VCC, v(r`$R_1, R_2$`, 'upper and lower divider resistors', OHM), v(r`$R_E$`, 'emitter resistor', OHM), BETA],
        'The Q-point of the most common bias circuit, from the Thévenin equivalent of the divider.',
        'If βR_E ≥ 10R₂ the approximate method (V_B = V_TH, I_E = (V_B − 0.7)/R_E) is close enough.', A_),
    P(BIAS, null, 'DC Load Line', r`$V_{CE} = V_{CC} - I_C(R_C + R_E)$`, r`$V_{CE} = V_{CC} - I_C(R_C + R_E);\qquad I_{C(sat)} = \frac{V_{CC}}{R_C + R_E},\ V_{CE(off)} = V_{CC}$`,
        [VCC, v(r`$R_C, R_E$`, 'collector and emitter resistors', OHM), v(r`$I_C$`, 'collector current (≈ I_E)', A_)],
        'Every dc operating point the circuit allows; the bias picks one Q-point on it.',
        'For the largest undistorted swing, put the Q-point near the middle of the ac load line.', V_),
    // BJT Amplifiers
    P(AMP, null, 'BJT Small-Signal Parameters', r`$g_m = \frac{I_C}{V_T},\ r_e = \frac{V_T}{I_E}$`, r`$g_m = \frac{I_C}{V_T},\qquad r_\pi = \frac{\beta}{g_m} = (\beta + 1)r_e,\qquad r_e = \frac{V_T}{I_E}$`,
        [v(r`$I_C, I_E$`, 'dc collector and emitter currents', A_), VT, BETA],
        'The small-signal model values, all set by the dc bias current.',
        'At I_C = 1 mA: g_m = 38.5 mS and r_e ≈ 26 Ω. Double the current, double g_m.', r`$\text{S}$`),
    P(AMP, null, 'Common-Emitter Amplifier', r`$A_v = -\frac{R_C \| R_L}{r_e + R_E}$`, r`$A_v = -\frac{R_C \| R_L}{r_e + R_E},\qquad R_{in} = R_1 \| R_2 \| (\beta + 1)(r_e + R_E),\qquad R_o \approx R_C$`,
        [v(r`$R_C, R_L$`, 'collector resistor and load', OHM), RE_, v(r`$R_E$`, 'unbypassed emitter resistance (0 if fully bypassed)', OHM), BETA],
        'Voltage gain, input and output resistance of the CE stage: high gain, inverted.',
        'Bypassing R_E raises the gain to −(R_C‖R_L)/r_e but makes it depend on the bias current.'),
    P(AMP, null, 'Emitter Follower (Common Collector)', r`$A_v = \frac{R_E'}{r_e + R_E'} \approx 1$`, r`$A_v = \frac{R_E'}{r_e + R_E'},\quad R_{in} = R_B \| (\beta + 1)(r_e + R_E'),\quad R_o = R_E \| \left(r_e + \frac{R_s \| R_B}{\beta + 1}\right)$`,
        [v(r`$R_E'$`, 'R_E ‖ R_L', OHM), RE_, BETA, v(r`$R_s$`, 'source resistance', OHM)],
        'A buffer: gain just under 1, high input resistance, low output resistance.',
        'It gives current and power gain, not voltage gain; the output follows the input in phase.'),
    P(AMP, null, 'Common-Base Amplifier', r`$A_v = \frac{R_C \| R_L}{r_e}$`, r`$A_v \approx \frac{R_C \| R_L}{r_e},\qquad R_{in} = R_E \| r_e,\qquad A_i \approx \alpha < 1$`,
        [v(r`$R_C, R_L$`, 'collector resistor and load', OHM), RE_],
        'High voltage gain in phase, very low input resistance, current gain just under 1.',
        'Used at high frequencies because it has no Miller multiplication of C_μ.'),
    // FETs and MOSFETs
    P(FET, null, 'MOSFET Drain Current', r`$I_D = k(V_{GS} - V_{th})^2$`, r`$\text{saturation } (V_{DS} \ge V_{GS} - V_{th}): I_D = k(V_{GS} - V_{th})^2;\quad \text{triode: } I_D = k[2(V_{GS} - V_{th})V_{DS} - V_{DS}^2]$`,
        [v(r`$k$`, 'device constant (½k′W/L in some texts)', r`$\text{A/V}^2$`), v(r`$V_{GS}$`, 'gate-source voltage', V_), v(r`$V_{th}$`, 'threshold voltage', V_), v(r`$V_{DS}$`, 'drain-source voltage', V_)],
        'The square law of an enhancement MOSFET, and the triode region below it.',
        'No current below threshold. The two regions meet at V_DS = V_GS − V_th, where both formulas agree.', A_),
    P(FET, null, 'FET Transconductance', r`$g_m = 2\sqrt{kI_D}$`, r`$\text{JFET: } g_m = \frac{2I_{DSS}}{|V_P|}\left(1 - \frac{V_{GS}}{V_P}\right);\qquad \text{MOSFET: } g_m = 2k(V_{GS} - V_{th}) = 2\sqrt{kI_D}$`,
        [v(r`$I_{DSS}$`, 'JFET current at V_GS = 0', A_), v(r`$V_P$`, 'pinch-off voltage', V_), v(r`$k$`, 'MOSFET constant', r`$\text{A/V}^2$`), v(r`$I_D$`, 'drain current', A_)],
        'How much drain current changes per volt of gate voltage at the Q-point.',
        'FET g_m grows only with √I_D; a BJT\'s grows with I_C, so BJTs give more gain per milliampere.', r`$\text{S}$`),
    P(FET, null, 'Common-Source Amplifier', r`$A_v = -g_m(r_d \| R_D \| R_L)$`, r`$\text{CS: } A_v = -g_m(r_d \| R_D \| R_L);\qquad \text{source follower: } A_v = \frac{g_mR_S'}{1 + g_mR_S'}$`,
        [GM, v(r`$r_d$`, 'drain resistance (often ∞)', OHM), v(r`$R_D, R_L$`, 'drain resistor and load', OHM), v(r`$R_S'$`, 'R_S ‖ R_L', OHM)],
        'The FET stages: common source inverts with gain; the source follower buffers.',
        'An unbypassed source resistor R_S cuts CS gain to −g_mR_D′/(1 + g_mR_S).'),
    P(FET, null, 'JFET Self-Bias', r`$V_{GS} = -I_DR_S$`, r`$V_{GS} = -I_DR_S,\qquad I_D = I_{DSS}\left(1 - \frac{V_{GS}}{V_P}\right)^2$`,
        [v(r`$R_S$`, 'source resistor', OHM), v(r`$I_D$`, 'drain current', A_), v(r`$I_{DSS}, V_P$`, 'JFET parameters')],
        'A source resistor biases a JFET with one supply: solve the bias line with Shockley\'s equation.',
        'The quadratic gives two roots; keep the one with V_GS between V_P and 0.', V_),
    // Frequency Response
    P(FREQ, null, 'Voltage Gain in Decibels', r`$A_{dB} = 20\log_{10}|A_v|$`, r`$A_{dB} = 20\log_{10}|A_v| = 10\log_{10}\frac{P_o}{P_i}\ (\text{equal resistances})$`,
        [v(r`$A_v$`, 'voltage gain'), v(r`$P_o, P_i$`, 'output and input power', W_)],
        'Gain on a log scale: cascaded stages add in decibels.',
        'Half power is −3 dB; half voltage is −6 dB. ×10 in voltage is +20 dB.'),
    P(FREQ, null, 'Low-Frequency Cutoff of a Coupling Capacitor', r`$f_L = \frac{1}{2\pi(R_s + R_{in})C_C}$`, r`$f_L = \frac{1}{2\pi R_{eq}C};\quad R_{eq} = R_s + R_{in} \text{ (input)},\ R_o + R_L \text{ (output)},\ R_E \| \left(r_e + \frac{R_s'}{\beta}\right) \text{ (bypass)}$`,
        [v(r`$R_{eq}$`, 'resistance the capacitor sees', OHM), v(r`$C$`, 'coupling or bypass capacitor', r`$\text{F}$`)],
        'Each coupling or bypass capacitor makes a low-frequency corner at 1/(2πRC).',
        'The bypass capacitor sees a tiny resistance, so it usually sets the highest (dominant) f_L.', HZ),
    P(FREQ, null, 'Miller Effect', r`$C_M = C_f(1 - A_v)$`, r`$C_{M,in} = C_f(1 - A_v) = C_f(1 + |A_v|),\qquad f_H = \frac{1}{2\pi R_{th}C_{in}}$`,
        [v(r`$C_f$`, 'capacitance from output to input (C_μ or C_gd)', r`$\text{F}$`), v(r`$A_v$`, 'inverting gain across it'), v(r`$R_{th}$`, 'resistance driving the input', OHM)],
        'A small feedback capacitance looks (1 + |A_v|) times larger at the input of an inverting stage.',
        'This is what limits a CE stage\'s high-frequency response; the CB and cascode avoid it.', r`$\text{F}$`),
    P(FREQ, null, 'Gain-Bandwidth Product', r`$\text{GBW} = A_{CL}\,f_{CL}$`, r`$\text{GBW} = A_{OL}f_c = f_T = A_{CL}f_{CL},\qquad f_{CL} = \frac{f_T}{1 + R_f/R_i}$`,
        [v(r`$f_T$`, 'unity-gain frequency', HZ), v(r`$A_{CL}$`, 'closed-loop (noise) gain'), v(r`$f_{CL}$`, 'closed-loop bandwidth', HZ)],
        'For a single-pole amplifier, gain times bandwidth is constant.',
        'A 1 MHz op-amp at a gain of 100 has 10 kHz bandwidth. Use the non-inverting gain 1 + R_f/R_i even for an inverting stage.', HZ),
    // Multistage and Feedback Amplifiers
    P(MULTI, null, 'Bandwidth of Cascaded Identical Stages', r`$f_H^* = f_H\sqrt{2^{1/n} - 1}$`, r`$f_H^* = f_H\sqrt{2^{1/n} - 1},\qquad f_L^* = \frac{f_L}{\sqrt{2^{1/n} - 1}}$`,
        [v(r`$n$`, 'number of identical stages'), v(r`$f_H, f_L$`, 'one stage\'s cutoffs', HZ)],
        'Cascading stages multiplies the gain but narrows the bandwidth.',
        'Two stages: the upper cutoff falls to 0.644 f_H. Gains multiply (dB add) using each stage\'s LOADED gain.', HZ),
    P(MULTI, null, 'Gain with Negative Feedback', r`$A_f = \frac{A}{1 + A\beta}$`, r`$A_f = \frac{A}{1 + A\beta};\qquad BW_f = BW(1 + A\beta);\qquad \text{series-shunt: } R_{if} = R_i(1 + A\beta),\ R_{of} = \frac{R_o}{1 + A\beta}$`,
        [v(r`$A$`, 'open-loop gain'), v(r`$\beta$`, 'feedback fraction'), v(r`$1 + A\beta$`, 'amount of feedback (desensitivity)')],
        'Feedback trades gain for stability, bandwidth, lower distortion and better impedances.',
        'When Aβ ≫ 1, A_f ≈ 1/β: the gain depends only on the feedback network.'),
    P(MULTI, null, 'Darlington Pair', r`$\beta_D \approx \beta_1\beta_2$`, r`$\beta_D = \beta_1\beta_2 + \beta_1 + \beta_2 \approx \beta_1\beta_2,\qquad V_{BE(D)} \approx 1.4\ \text{V}$`,
        [v(r`$\beta_1, \beta_2$`, 'the two transistors\' gains')],
        'Two transistors acting as one with a huge current gain.',
        'It needs two base-emitter drops to turn on, and saturates at a higher V_CE.'),
    // Operational Amplifiers
    P(OPAMP, null, 'Op-Amp Integrator and Differentiator', r`$v_o = -\frac{1}{RC}\int v_i\,dt$`, r`$\text{integrator: } v_o = -\frac{1}{RC}\int v_i\,dt;\qquad \text{differentiator: } v_o = -RC\frac{dv_i}{dt}$`,
        [v(r`$R$`, 'input (integrator) or feedback (differentiator) resistor', OHM), v(r`$C$`, 'capacitor', r`$\text{F}$`)],
        'Swapping a resistor for a capacitor makes the inverting amplifier integrate or differentiate.',
        'A square wave into an integrator gives a triangle. Practical integrators add a large resistor across C.', V_),
    P(OPAMP, null, 'Slew Rate and Full-Power Bandwidth', r`$f_{\max} = \frac{SR}{2\pi V_p}$`, r`$\frac{dv_o}{dt}\Big|_{\max} = 2\pi fV_p \le SR \implies f_{\max} = \frac{SR}{2\pi V_p}$`,
        [v(r`$SR$`, 'slew rate', r`$\text{V/µs}$`), v(r`$V_p$`, 'peak output voltage', V_)],
        'The highest frequency an op-amp can deliver at full output swing without distortion.',
        'Slew rate limits large signals; GBW limits small ones. Check both.', HZ),
    P(OPAMP, null, 'Common-Mode Rejection Ratio', r`$\text{CMRR} = \frac{A_d}{A_{cm}}$`, r`$\text{CMRR} = \frac{A_d}{A_{cm}},\qquad \text{CMRR}_{dB} = 20\log_{10}\frac{A_d}{A_{cm}};\qquad v_o = A_dv_d + A_{cm}v_{cm}$`,
        [v(r`$A_d$`, 'differential gain'), v(r`$A_{cm}$`, 'common-mode gain'), v(r`$v_d, v_{cm}$`, 'difference and average of the inputs', V_)],
        'How well an amplifier ignores a voltage common to both inputs.',
        'v_cm is the AVERAGE of the two inputs, v_d their difference.'),
    P(OPAMP, null, 'Schmitt Trigger Thresholds', r`$V_{UT,LT} = \pm\beta V_{sat}$`, r`$\beta = \frac{R_2}{R_1 + R_2}:\quad V_{UT} = +\beta V_{sat},\ V_{LT} = -\beta V_{sat},\quad V_H = 2\beta V_{sat}$`,
        [v(r`$R_2$`, 'resistor from + input to ground', OHM), v(r`$R_1$`, 'resistor from output to + input', OHM), v(r`$V_{sat}$`, 'output saturation voltage', V_)],
        'An inverting comparator with positive feedback: two thresholds, so noise does not make it chatter.',
        'The hysteresis width is 2βV_sat; it must exceed the noise on the input.', V_),
    // Oscillators
    P(OSC, null, 'Barkhausen Criterion', r`$A\beta = 1\angle 0°$`, r`$|A\beta| = 1,\qquad \angle A\beta = 0° \text{ or } 360°$`,
        [v(r`$A$`, 'amplifier gain'), v(r`$\beta$`, 'feedback network gain')],
        'The condition for sustained oscillation: unity loop gain with no net phase shift.',
        'To start, the loop gain must be slightly MORE than 1; it then settles to 1 as the amplitude limits.'),
    P(OSC, null, 'RC Phase-Shift Oscillator', r`$f = \frac{1}{2\pi RC\sqrt6}$`, r`$f = \frac{1}{2\pi RC\sqrt6},\qquad |A| \ge 29\quad (\text{three sections, C in series, R to ground})$`,
        [v(r`$R$`, 'section resistance', OHM), v(r`$C$`, 'section capacitance', r`$\text{F}$`)],
        'Three RC sections give 180° of phase shift; an inverting amplifier gives the other 180°.',
        'The network attenuates to 1/29 at that frequency, so the amplifier needs a gain of at least 29.', HZ),
    P(OSC, null, 'Wien-Bridge Oscillator', r`$f = \frac{1}{2\pi RC}$`, r`$f = \frac{1}{2\pi RC},\qquad A = 3 \iff R_f = 2R_1$`,
        [v(r`$R$`, 'equal bridge resistors', OHM), v(r`$C$`, 'equal bridge capacitors', r`$\text{F}$`)],
        'The low-distortion audio oscillator: the lead-lag network passes 1/3 with zero phase at f.',
        'Its non-inverting amplifier needs a gain of exactly 3 (slightly more to start).', HZ),
    P(OSC, null, 'Colpitts and Hartley Oscillators', r`$f = \frac{1}{2\pi\sqrt{L_{eq}C_{eq}}}$`, r`$f = \frac{1}{2\pi\sqrt{L_{eq}C_{eq}}};\quad \text{Colpitts: } C_{eq} = \frac{C_1C_2}{C_1 + C_2};\quad \text{Hartley: } L_{eq} = L_1 + L_2 + 2M$`,
        [v(r`$C_1, C_2$`, 'tapped capacitors (Colpitts)', r`$\text{F}$`), v(r`$L_1, L_2$`, 'tapped inductors (Hartley)', r`$\text{H}$`), v(r`$M$`, 'mutual inductance between them', r`$\text{H}$`)],
        'LC oscillators for radio frequencies: the tank sets f, a tap feeds part of it back.',
        'Colpitts taps the capacitors (in series), Hartley the inductor. The feedback ratio is C₁/C₂ or L₂/L₁.', HZ),
    // Power Amplifiers
    P(PWR, null, 'Class A Efficiency', r`$\eta = \frac{P_{o(ac)}}{P_{i(dc)}}$`, r`$\eta = \frac{P_{o(ac)}}{P_{i(dc)}};\qquad \eta_{\max} = 25\%\ (\text{resistive load}),\ 50\%\ (\text{transformer-coupled})$`,
        [v(r`$P_{o(ac)}$`, 'ac power to the load', W_), v(r`$P_{i(dc)}$`, 'dc power from the supply', W_)],
        'Class A conducts all the time, so it wastes most of its supply power as heat.',
        'A class A stage dissipates the MOST when there is no signal.'),
    P(PWR, null, 'Class B Push-Pull Efficiency', r`$\eta = \frac{\pi}{4}\frac{V_p}{V_{CC}}$`, r`$P_o = \frac{V_p^2}{2R_L},\quad P_{dc} = \frac{2V_{CC}V_p}{\pi R_L},\quad \eta = \frac{\pi}{4}\frac{V_p}{V_{CC}} \le 78.5\%$`,
        [v(r`$V_p$`, 'peak load voltage', V_), VCC, v(r`$R_L$`, 'load resistance', OHM)],
        'Each transistor conducts half the cycle, so efficiency is far better than class A.',
        'Crossover distortion near zero is why practical stages are class AB, biased just on.'),
    P(PWR, null, 'Class B Maximum Transistor Dissipation', r`$P_{D(\max)} = \frac{2V_{CC}^2}{\pi^2R_L}$`, r`$P_{D(\max)} = \frac{2V_{CC}^2}{\pi^2R_L}\ (\text{both transistors, at } V_p = \tfrac{2}{\pi}V_{CC}) \approx 0.4P_{o(\max)}$`,
        [VCC, v(r`$R_L$`, 'load resistance', OHM)],
        'The worst-case heat in a class B stage, which happens at about 64% of full swing, not at full output.',
        'Each transistor dissipates half; size heat sinks for this, not for full output.', W_),
    P(PWR, null, 'Heat Sink Thermal Resistance', r`$T_J = T_A + P_D(\theta_{JC} + \theta_{CS} + \theta_{SA})$`, r`$T_J = T_A + P_D(\theta_{JC} + \theta_{CS} + \theta_{SA})$`,
        [v(r`$T_J, T_A$`, 'junction and ambient temperatures', r`$\text{°C}$`), v(r`$P_D$`, 'power dissipated', W_), v(r`$\theta$`, 'thermal resistances: junction-case, case-sink, sink-air', r`$\text{°C/W}$`)],
        'Heat flows like current through thermal resistances in series: the temperature rise is power times their sum.',
        'Solve for θ_SA to choose a heat sink that keeps T_J below its maximum.', r`$\text{°C}$`),
];

module.exports = { subject: 'EE', topic: 'Electronics 1 and 2', migration: '20261229000000_cards_electronics_1_and_2', file, revisions, retire, drafts };
