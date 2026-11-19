'use strict';

// EE › Instrumentation & Control formula cards (Library round, 2026-11-19):
// the topic had no cards. Two-wattmeter is in Electric Circuits 2, metering
// multipliers and ratio correction in Apparatus & Devices, ADC resolution in
// ESAS, control-system theory in Feedback Control Systems. This file adds:
// error against full scale, combined limiting error, voltmeter loading; shunt,
// multiplier, series ohmmeter, average-responding meters, PMMC deflection;
// Wheatstone, Kelvin, Maxwell and Schering bridges; potentiometer comparison;
// wattmeter connection error, energy-meter constant, one-wattmeter vars and
// phase-angle error; oscilloscope reading, Lissajous ratio and phase, rise
// time and probe compensation; strain gauge, RTD, thermocouple, thermistor;
// quantization SNR, sampling and aliasing, 4–20 mA scaling; proportional band
// and Ziegler–Nichols; PLC response time and timer preset; SCADA polling
// cycle; combined uncertainty and test uncertainty ratio. See
// mathematics/algebra.js for the format;
// tests/instrumentationControlFormulas.test.js checks each numerically.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const MEAS = 'Measurement and Errors';
const ANA = 'Analog Meters';
const BR = 'Bridges';
const POT = 'Potentiometers';
const WM = 'Wattmeters and Energy Meters';
const IT = 'Instrument Transformers';
const OSC = 'Oscilloscopes';
const TRANS = 'Transducers and Sensors';
const DAQ = 'Data Acquisition';
const PID = 'Process Control and PID';
const PLC = 'PLCs';
const SCADA = 'SCADA';
const CAL = 'Calibration';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const OHM = r`$\Omega$`;
const S_ = r`$\text{s}$`;
const F_ = r`$\text{F}$`;

const drafts = [
    // Measurement and Errors
    P(MEAS, null, 'Error Relative to Full Scale', r`$\%e_{rdg} = \%e_{FS}\frac{FS}{\text{reading}}$`, r`$\%e_{reading} = \%e_{FS} \times \frac{\text{full scale}}{\text{reading}}$`,
        [v(r`$\%e_{FS}$`, 'accuracy stated as a percent of full scale'), v(r`$\text{FS}$`, 'full-scale value of the range')],
        'An instrument accurate to ±1% of full scale is much less accurate near the bottom of its scale.',
        'Read in the upper third of the scale: switch to a lower range when you can.'),
    P(MEAS, null, 'Limiting Error of Combined Quantities', r`$\frac{\delta Q}{Q} = \sum\frac{\delta x_i}{x_i}$`, r`$Q = x_1x_2 \text{ or } \frac{x_1}{x_2}: \frac{\delta Q}{Q} = \frac{\delta x_1}{x_1} + \frac{\delta x_2}{x_2};\qquad Q = x_1 \pm x_2: \delta Q = \delta x_1 + \delta x_2$`,
        [v(r`$\delta x_i$`, 'limiting (worst-case) error of each measurement')],
        'Worst-case error of a result calculated from several readings.',
        'Products and quotients add RELATIVE errors; sums and differences add ABSOLUTE errors (bad for small differences).'),
    P(MEAS, null, 'Voltmeter Loading', r`$V_m = V_{th}\frac{R_m}{R_{th} + R_m}$`, r`$V_m = V_{th}\frac{R_m}{R_{th} + R_m},\qquad R_m = S \times \text{range}\ (S \text{ in } \Omega/\text{V})$`,
        [v(r`$V_{th}, R_{th}$`, 'Thévenin voltage and resistance of the circuit at the meter', V_), v(r`$S$`, 'voltmeter sensitivity', r`$\Omega/\text{V}$`)],
        'A voltmeter draws current and reads low in a high-resistance circuit.',
        'Use the meter\'s resistance on the RANGE in use. Digital meters (about 10 MΩ) load far less.', V_),
    // Analog Meters
    P(ANA, null, 'Ammeter Shunt', r`$R_{sh} = \frac{I_mR_m}{I - I_m}$`, r`$R_{sh} = \frac{I_mR_m}{I - I_m} = \frac{R_m}{n - 1},\quad n = \frac{I}{I_m}$`,
        [v(r`$I_m, R_m$`, 'meter full-scale current and resistance', A_), v(r`$I$`, 'new full-scale current', A_)],
        'The parallel resistor that extends a meter to read a larger current.',
        'Shunts are tiny: a 1 mA, 100 Ω meter for 10 A needs 0.01 Ω.', OHM),
    P(ANA, null, 'Voltmeter Multiplier', r`$R_s = \frac{V}{I_m} - R_m$`, r`$R_s = \frac{V}{I_m} - R_m = R_m(m - 1),\quad m = \frac{V}{I_mR_m}$`,
        [v(r`$V$`, 'new full-scale voltage', V_), v(r`$I_m, R_m$`, 'meter full-scale current and resistance')],
        'The series resistor that turns a meter movement into a voltmeter.',
        'Sensitivity is 1/I_m in Ω/V: a 50 µA movement gives 20 kΩ/V.', OHM),
    P(ANA, null, 'Series Ohmmeter Scale', r`$\frac{\theta}{\theta_{FS}} = \frac{R_{in}}{R_{in} + R_x}$`, r`$\frac{\theta}{\theta_{FS}} = \frac{R_{in}}{R_{in} + R_x};\qquad R_x = R_{in} \text{ at half scale}$`,
        [v(r`$R_{in}$`, 'internal resistance of the ohmmeter circuit (zeroed)', OHM), v(r`$R_x$`, 'unknown resistance', OHM)],
        'A series ohmmeter reads right to left and is most accurate near half scale, where R_x equals its internal resistance.',
        'The scale is nonlinear and crowded at the high-resistance end.'),
    P(ANA, null, 'Average-Responding Meter Reading', r`$\text{reading} = 1.11V_{avg}$`, r`$\text{reading} = 1.11\,V_{avg}\ (\text{rectified average, calibrated in sine RMS})$`,
        [v(r`$V_{avg}$`, 'average of the rectified waveform', V_)],
        'Rectifier meters measure the average and multiply by the sine form factor, 1.11.',
        'Exact only for sine waves: a square wave reads 11% high, distorted waves err either way. Use true-RMS meters.', V_),
    P(ANA, null, 'PMMC Deflection', r`$\theta = \frac{BNAI}{k}$`, r`$T_d = BNAI = k\theta \implies \theta = \frac{BNAI}{k}$`,
        [v(r`$B$`, 'gap flux density', r`$\text{T}$`), v(r`$N, A$`, 'coil turns and area', r`$\text{m}^2$`), v(r`$I$`, 'coil current', A_), v(r`$k$`, 'spring constant', r`$\text{N·m/rad}$`)],
        'A permanent-magnet moving-coil meter deflects in proportion to current: a linear scale.',
        'It responds to the average: dc only, unless a rectifier is added.', r`$\text{rad}$`),
    // Bridges
    P(BR, null, 'Wheatstone Bridge Balance', r`$R_x = \frac{R_2R_3}{R_1}$`, r`$R_x = \frac{R_2R_3}{R_1}\quad (\text{arms in order } R_1, R_2, R_x, R_3;\ \text{no galvanometer current})$`,
        [v(r`$R_1, R_2, R_3$`, 'known arms', OHM), v(r`$R_x$`, 'unknown', OHM)],
        'At balance the products of opposite arms are equal: the unknown follows from three known resistors.',
        'Balance does not depend on the supply voltage or the galvanometer.', OHM),
    P(BR, null, 'Kelvin Double Bridge', r`$R_x = R_s\frac{R_1}{R_2}$`, r`$R_x = R_s\frac{R_1}{R_2}\quad (\text{inner ratio } \tfrac{r_1}{r_2} = \tfrac{R_1}{R_2})$`,
        [v(r`$R_s$`, 'standard low resistance', OHM), v(r`$R_1, R_2$`, 'outer ratio arms', OHM)],
        'Measures very low resistances (below about 1 Ω) without error from leads and contacts.',
        'The second set of ratio arms cancels the link resistance between unknown and standard.', OHM),
    P(BR, null, 'Maxwell Inductance-Capacitance Bridge', r`$L_x = R_2R_3C_1$`, r`$L_x = R_2R_3C_1,\qquad R_x = \frac{R_2R_3}{R_1}\quad (R_1 \parallel C_1 \text{ opposite the unknown})$`,
        [v(r`$R_1 \parallel C_1$`, 'arm with the standard capacitor'), v(r`$R_2, R_3$`, 'resistive arms', OHM)],
        'Measures a coil\'s inductance against a standard capacitor.',
        'Best for medium-Q coils (Q from 1 to 10); Hay\'s bridge suits high Q.', r`$\text{H}$`),
    P(BR, null, 'Schering Bridge', r`$C_x = C_3\frac{R_1}{R_2}$`, r`$C_x = C_3\frac{R_1}{R_2},\qquad R_x = R_2\frac{C_1}{C_3},\qquad D = \omega C_1R_1$`,
        [v(r`$C_3$`, 'standard (loss-free) capacitor', F_), v(r`$R_1 \parallel C_1$`, 'adjustable arm'), v(r`$R_2$`, 'fixed arm', OHM), v(r`$D$`, 'dissipation factor of the unknown')],
        'Measures capacitance and insulation loss (dissipation factor), especially at high voltage.',
        'A rising dissipation factor flags deteriorating insulation in cables and bushings.', F_),
    // Potentiometers
    P(POT, null, 'Potentiometer Comparison', r`$E_x = E_s\frac{l_x}{l_s}$`, r`$E_x = E_s\frac{l_x}{l_s}\quad (\text{null: no current drawn from the source measured})$`,
        [v(r`$E_s$`, 'standard cell emf', V_), v(r`$l_s, l_x$`, 'balance lengths for the standard and the unknown', r`$\text{m}$`)],
        'A potentiometer compares an unknown emf with a standard at null, so the source\'s internal resistance doesn\'t matter.',
        'At balance no current flows from the source: it measures true emf, not terminal voltage.', V_),
    // Wattmeters and Energy Meters
    P(WM, null, 'Wattmeter Connection Error', r`$W = P + \frac{V^2}{R_p}\ \text{or}\ P + I^2R_c$`, r`$W = P + \frac{V^2}{R_p}\ (\text{PC on load side}),\qquad W = P + I^2R_c\ (\text{PC on supply side})$`,
        [v(r`$R_p$`, 'pressure (voltage) coil resistance', OHM), v(r`$R_c$`, 'current coil resistance', OHM)],
        'A wattmeter also reads the power lost in one of its own coils, depending on how it is connected.',
        'Low-current loads: put the pressure coil on the supply side. High-current: on the load side.', r`$\text{W}$`),
    P(WM, null, 'Energy Meter Constant and Error', r`$P = \frac{3600K_hN}{t}$`, r`$P = \frac{3600\,K_h\,N}{t}\ (\text{W});\qquad \%e = \frac{E_{reg} - E_{true}}{E_{true}} \times 100$`,
        [v(r`$K_h$`, 'watt-hours per disc revolution (or per pulse)', r`$\text{Wh/rev}$`), v(r`$N$`, 'revolutions counted', ), v(r`$t$`, 'time', S_)],
        'Power from counting an energy meter\'s revolutions or pulses, and its registration error.',
        'A meter that registers more than the true energy has a POSITIVE error (fast meter).', r`$\text{W}$`),
    P(WM, null, 'Reactive Power with One Wattmeter', r`$Q = \sqrt3W$`, r`$W = V_LI_L\sin\phi \implies Q = \sqrt3\,W\quad (\text{CC in line a, PC across b–c; balanced})$`,
        [v(r`$W$`, 'wattmeter reading', r`$\text{W}$`), v(r`$\phi$`, 'load power-factor angle')],
        'A wattmeter connected to the quadrature voltage reads vars directly on a balanced load.',
        'Only valid for a balanced three-phase load.', r`$\text{var}$`),
    // Instrument Transformers
    P(IT, null, 'Phase-Angle Error in Power Measurement', r`$\%e \approx \beta\tan\phi \times 100$`, r`$P_{meas} = VI\cos(\phi \mp \beta) \implies \%e \approx \pm\beta\tan\phi \times 100\%\quad (\beta \text{ in rad})$`,
        [v(r`$\beta$`, 'net phase-angle error of the CT and VT', r`$\text{rad}$`), v(r`$\phi$`, 'load power-factor angle')],
        'A small phase shift in an instrument transformer causes a power error that grows at low power factor.',
        'At 0.5 pf, 10 minutes of arc (0.0029 rad) causes 0.5% error; at unity pf almost none.'),
    // Oscilloscopes
    P(OSC, null, 'Reading an Oscilloscope', r`$f = \frac{1}{\text{div} \times t/\text{div}}$`, r`$V = \text{divisions} \times \text{V/div} \times \text{probe factor},\qquad f = \frac{1}{\text{divisions per cycle} \times \text{time/div}}$`,
        [v(r`$\text{V/div}$`, 'vertical sensitivity'), v(r`$\text{time/div}$`, 'horizontal sweep', S_)],
        'Voltage and frequency from the screen\'s graticule.',
        'With a 10× probe, multiply the reading by 10 unless the scope does it for you.'),
    P(OSC, null, 'Lissajous Frequency Ratio', r`$\frac{f_y}{f_x} = \frac{n_h}{n_v}$`, r`$\frac{f_y}{f_x} = \frac{\text{tangencies to a horizontal line}}{\text{tangencies to a vertical line}}$`,
        [v(r`$f_y, f_x$`, 'frequencies on the vertical and horizontal inputs', r`$\text{Hz}$`), v(r`$n_h, n_v$`, 'points touching a horizontal and a vertical side')],
        'The ratio of two frequencies from the shape of a Lissajous figure.',
        'A stationary pattern means an exact ratio; drifting means it is slightly off.'),
    P(OSC, null, 'Phase from a Lissajous Ellipse', r`$\sin\phi = \frac{y_0}{y_m}$`, r`$\sin\phi = \frac{y_0}{y_{\max}}\quad (\text{equal frequencies})$`,
        [v(r`$y_0$`, 'where the ellipse crosses the vertical axis'), v(r`$y_{\max}$`, 'maximum vertical height')],
        'Phase between two equal-frequency signals from their ellipse.',
        'A line means 0° or 180°; a circle (equal amplitudes) means 90°.'),
    P(OSC, null, 'Scope Rise Time and Bandwidth', r`$t_r = \frac{0.35}{BW}$`, r`$t_r = \frac{0.35}{BW},\qquad t_{r,shown} = \sqrt{t_{r,sig}^2 + t_{r,scope}^2}$`,
        [v(r`$BW$`, 'scope bandwidth (−3 dB)', r`$\text{Hz}$`), v(r`$t_r$`, '10–90% rise time', S_)],
        'A scope\'s own rise time, and how it slows the edges you see.',
        'Choose a scope 3–5 times faster than the signal\'s rise time.', S_),
    P(OSC, null, '10× Probe Compensation', r`$R_pC_p = R_sC_s$`, r`$R_pC_p = R_sC_s,\qquad \frac{V_{scope}}{V_{probe}} = \frac{R_s}{R_p + R_s} = \frac{1}{10}$`,
        [v(r`$R_p, C_p$`, 'probe tip resistance (9 MΩ) and its trimming capacitor'), v(r`$R_s, C_s$`, 'scope input resistance (1 MΩ) and capacitance')],
        'A compensated probe divides by 10 at every frequency because both RC products match.',
        'Adjust on the calibrator square wave until its corners are square, not rounded or peaked.'),
    // Transducers and Sensors
    P(TRANS, null, 'Strain Gauge Bridge Output', r`$V_o \approx \frac{V_{ex}\,GF\,\varepsilon}{4}$`, r`$GF = \frac{\Delta R/R}{\varepsilon},\qquad V_o \approx \frac{V_{ex}\,GF\,\varepsilon}{4}\ (\text{quarter bridge})$`,
        [v(r`$GF$`, 'gauge factor, about 2 for metal foil'), v(r`$\varepsilon$`, 'strain'), v(r`$V_{ex}$`, 'bridge excitation', V_)],
        'A strain gauge changes resistance with strain; a Wheatstone bridge turns that into a small voltage.',
        'Half and full bridges give 2 and 4 times the output and cancel temperature drift.', V_),
    P(TRANS, null, 'RTD Resistance', r`$R_T = R_0(1 + \alpha T)$`, r`$R_T = R_0(1 + \alpha T),\qquad \alpha = 0.00385\ /^\circ\text{C}\ (\text{Pt100})$`,
        [v(r`$R_0$`, 'resistance at 0 °C (100 Ω for Pt100)', OHM), v(r`$T$`, 'temperature', r`$\text{°C}$`)],
        'A platinum resistance thermometer\'s resistance rises almost linearly with temperature.',
        'Lead resistance adds error: use 3- or 4-wire connections.', OHM),
    P(TRANS, null, 'Thermocouple EMF', r`$V = S(T_h - T_c)$`, r`$V \approx S(T_{hot} - T_{ref});\qquad V_{T_1T_3} = V_{T_1T_2} + V_{T_2T_3}\ (\text{intermediate temperatures})$`,
        [v(r`$S$`, 'Seebeck coefficient, about 41 µV/°C for type K', r`$\text{µV/°C}$`), v(r`$T_{ref}$`, 'reference (cold) junction temperature', r`$\text{°C}$`)],
        'A thermocouple\'s voltage depends on the temperature DIFFERENCE between its junctions.',
        'Add the cold-junction emf before converting with the table (cold-junction compensation).', r`$\text{µV}$`),
    P(TRANS, null, 'Thermistor Beta Equation', r`$R = R_0e^{B(1/T - 1/T_0)}$`, r`$R_T = R_0\exp\left[B\left(\frac{1}{T} - \frac{1}{T_0}\right)\right]\quad (T \text{ in K})$`,
        [v(r`$R_0$`, 'resistance at T₀ (often 25 °C)', OHM), v(r`$B$`, 'beta constant', r`$\text{K}$`)],
        'An NTC thermistor\'s resistance falls steeply and nonlinearly with temperature.',
        'Very sensitive over a narrow range; use kelvin in the exponent.', OHM),
    // Data Acquisition
    P(DAQ, null, 'Quantization Signal-to-Noise Ratio', r`$\text{SNR} = 6.02N + 1.76\ \text{dB}$`, r`$\text{SNR} = 6.02N + 1.76\ \text{dB},\qquad e_q = \pm\tfrac12\text{LSB}$`,
        [v(r`$N$`, 'ADC bits'), v(r`$\text{LSB}$`, 'full-scale range divided by 2ᴺ')],
        'The best SNR an ideal N-bit converter can give for a full-scale sine wave.',
        'Each extra bit adds about 6 dB.'),
    P(DAQ, null, 'Sampling and Aliasing', r`$f_s > 2f_{\max},\ f_a = |f - kf_s|$`, r`$f_s > 2f_{\max};\qquad f_{alias} = |f - kf_s|\ (\text{nearest } k)$`,
        [v(r`$f_s$`, 'sampling rate', r`$\text{Hz}$`), v(r`$f_{\max}$`, 'highest frequency in the signal', r`$\text{Hz}$`)],
        'Sample faster than twice the highest frequency, or high frequencies fold down as false lower ones.',
        'An anti-aliasing low-pass filter before the ADC removes what sampling can\'t handle.', r`$\text{Hz}$`),
    P(DAQ, null, '4–20 mA Scaling', r`$x = x_{lo} + \frac{I - 4}{16}(x_{hi} - x_{lo})$`, r`$x = x_{lo} + \frac{I - 4}{16}(x_{hi} - x_{lo})\quad (I \text{ in mA})$`,
        [v(r`$I$`, 'loop current', r`$\text{mA}$`), v(r`$x_{lo}, x_{hi}$`, 'process values at 4 and 20 mA')],
        'Converting a 4–20 mA transmitter signal to the process value.',
        'Live zero: 0 mA means a broken loop, not a zero reading.'),
    // Process Control and PID
    P(PID, null, 'Proportional Band', r`$\text{PB} = \frac{100}{K_c}$`, r`$\text{PB} = \frac{100}{K_c}\ \%,\qquad u = K_ce + \frac{K_c}{T_i}\int e\,dt + K_cT_d\frac{de}{dt}$`,
        [v(r`$K_c$`, 'controller gain'), v(r`$T_i, T_d$`, 'integral and derivative times', S_)],
        'Proportional band is the percent change of input that drives the output through its full range.',
        'A narrow band is a high gain. Integral action removes the offset that proportional control leaves.'),
    P(PID, null, 'Ziegler–Nichols Ultimate-Gain Tuning', r`$K_p = 0.6K_u,\ T_i = \frac{P_u}{2},\ T_d = \frac{P_u}{8}$`, r`$\text{P: } 0.5K_u;\quad \text{PI: } 0.45K_u,\ T_i = \frac{P_u}{1.2};\quad \text{PID: } 0.6K_u,\ T_i = \frac{P_u}{2},\ T_d = \frac{P_u}{8}$`,
        [v(r`$K_u$`, 'gain at which the loop just oscillates steadily'), v(r`$P_u$`, 'period of that oscillation', S_)],
        'Classic tuning rules from the gain that makes the loop oscillate.',
        'Gives about a quarter-amplitude decay: aggressive; detune for smoother control.'),
    // PLCs
    P(PLC, null, 'PLC Worst-Case Response Time', r`$t \approx 2t_{scan} + t_{in} + t_{out}$`, r`$t_{resp} \approx 2t_{scan} + t_{in} + t_{out}$`,
        [v(r`$t_{scan}$`, 'program scan time', S_), v(r`$t_{in}, t_{out}$`, 'input filter and output switching delays', S_)],
        'An input that changes just after it was read waits a full scan before it is seen, then another before the output updates.',
        'Inputs shorter than one scan may be missed entirely: use high-speed or latched inputs.', S_),
    P(PLC, null, 'PLC Timer Preset', r`$\text{preset} = \frac{t}{\text{time base}}$`, r`$\text{preset} = \frac{t_{delay}}{\text{time base}}$`,
        [v(r`$t_{delay}$`, 'delay wanted', S_), v(r`$\text{time base}$`, 'timer resolution, e.g. 0.01 s or 0.1 s', S_)],
        'The count to enter in a PLC timer for a given delay.',
        'A 5 s delay on a 0.01 s time base is a preset of 500.'),
    // SCADA
    P(SCADA, null, 'SCADA Polling Cycle', r`$T = N(t_{req} + t_{resp} + t_{ta})$`, r`$T_{cycle} = N(t_{req} + t_{resp} + t_{ta}),\qquad t = \frac{\text{bits}}{\text{bit rate}}$`,
        [v(r`$N$`, 'number of RTUs polled in turn'), v(r`$t_{req}, t_{resp}$`, 'request and response message times', S_), v(r`$t_{ta}$`, 'turnaround and modem delays', S_)],
        'How long a master takes to poll every remote terminal once: the age of the data on screen.',
        'Report-by-exception and faster links shorten the cycle.', S_),
    // Calibration
    P(CAL, null, 'Combined and Expanded Uncertainty', r`$u_c = \sqrt{\sum u_i^2},\ U = ku_c$`, r`$u_c = \sqrt{\sum u_i^2},\qquad U = k\,u_c\ (k = 2 \approx 95\%)$`,
        [v(r`$u_i$`, 'standard uncertainties of the independent contributions'), v(r`$k$`, 'coverage factor')],
        'Independent uncertainties combine as the root-sum-square, then expand for a stated confidence.',
        'Unlike worst-case limits, RSS assumes the contributions are independent and random.'),
    P(CAL, null, 'Test Uncertainty Ratio', r`$\text{TUR} = \frac{\text{tolerance}}{U_{std}} \ge 4$`, r`$\text{TUR} = \frac{\text{tolerance of the unit under test}}{\text{uncertainty of the standard}} \ge 4{:}1$`,
        [v(r`$U_{std}$`, 'expanded uncertainty of the calibration standard')],
        'A calibration standard should be at least four times better than the instrument it checks.',
        'Traceability: each standard is calibrated against a better one, up to national standards.'),
];

module.exports = { subject: 'EE', topic: 'Instrumentation & Control', migration: '20270107000000_cards_instrumentation_control', file, revisions, retire, drafts };
