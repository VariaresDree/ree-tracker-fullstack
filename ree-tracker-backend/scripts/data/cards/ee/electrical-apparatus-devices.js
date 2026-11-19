'use strict';

// EE › Electrical Apparatus & Devices formula cards (Library round,
// 2026-11-19): the topic had no cards. Breaker interrupting ratings, CT burden
// and knee point, and arrester rating are in Power System Protection;
// star-delta and autotransformer starting in Machinery 2; lighting design in
// System & Illumination Design. This file covers the devices themselves:
// fuse I²t and selectivity; MCB trip curves; contactor coil limits and RC
// timers; overload trip classes and primary-resistor starting; metering with
// instrument transformers and ratio correction; capacitor kvar off rating,
// bank capacitance, discharge resistors, resonance and detuning; arrester
// lead-length voltage; busbar short-circuit force; AWG diameter, cable
// short-circuit withstand and insulation stress; Peukert's law and UPS
// runtime; luminaire efficiency and LED L70. Standards: IEC 60898 (MCB
// curves), IEC 60947-4-1 (contactors, overload classes), IEC 60364 (k values),
// NEC 460 (capacitor discharge). See mathematics/algebra.js for the format;
// tests/apparatusDevicesFormulas.test.js checks each numerically.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const FUSE = 'Fuses';
const CB = 'Circuit Breakers';
const RELAY = 'Relays and Contactors';
const START = 'Motor Starters';
const IT = 'Instrument Transformers';
const CAP = 'Capacitors and Reactors';
const SA = 'Surge Arresters';
const SWG = 'Switchgear and Panelboards';
const CABLE = 'Wires and Cables';
const BATT = 'Batteries and UPS';
const LAMP = 'Lamps and Luminaires';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const S_ = r`$\text{s}$`;
const OHM = r`$\Omega$`;

const drafts = [
    // Fuses
    P(FUSE, null, 'Fuse Melting Time (Adiabatic)', r`$t = \frac{K}{I^2}$`, r`$I^2t = K \implies t = \frac{K}{I^2}\quad (\text{short times, no heat lost})$`,
        [v(r`$K$`, 'melting I²t of the fuse', r`$\text{A}^2\text{s}$`), v(r`$I$`, 'fault current', A_)],
        'For high currents a fuse melts at a fixed I²t: double the current, a quarter of the time.',
        'Below about 0.01 s current-limiting fuses melt before the first peak, cutting let-through energy.', S_),
    P(FUSE, null, 'Fuse Selectivity by I²t', r`$I^2t_{melt,up} > I^2t_{clear,down}$`, r`$I^2t_{\text{melting, upstream}} > I^2t_{\text{clearing, downstream}}\quad (\text{amp-rating ratio} \approx 2{:}1)$`,
        [v(r`$I^2t_{melting}$`, 'energy to start melting the upstream fuse', r`$\text{A}^2\text{s}$`), v(r`$I^2t_{clearing}$`, 'total energy let through by the downstream fuse', r`$\text{A}^2\text{s}$`)],
        'Two fuses in series are selective if the downstream one clears before the upstream one even starts to melt.',
        'Manufacturers publish ratio tables; 2:1 in amp rating is typical for the same fuse class.'),
    // Circuit Breakers
    P(CB, null, 'MCB Trip Curves (B, C, D)', r`$I_m = (3\text{–}5,\ 5\text{–}10,\ 10\text{–}20)I_n$`, r`$\text{B: } 3\text{–}5\,I_n;\quad \text{C: } 5\text{–}10\,I_n;\quad \text{D: } 10\text{–}20\,I_n\quad (\text{instantaneous trip, IEC 60898})$`,
        [v(r`$I_n$`, 'rated current of the miniature circuit breaker', A_), v(r`$I_m$`, 'magnetic (instantaneous) trip current', A_)],
        'Miniature breakers trip instantly above a multiple of their rating set by the curve letter.',
        'B for resistive loads and long cables, C for general use, D for high inrush (motors, transformers).', A_),
    // Relays and Contactors
    P(RELAY, null, 'Contactor Coil Operating Limits', r`$0.85U_c \le U \le 1.1U_c$`, r`$\text{closes: } 0.85\text{–}1.1\,U_c;\qquad \text{drops out: } 0.20\text{–}0.75\,U_c\ (\text{ac coil})$`,
        [v(r`$U_c$`, 'rated control-circuit (coil) voltage', V_), v(r`$U$`, 'actual coil voltage', V_)],
        'The voltage range in which a contactor must close and hold, and below which it must release (IEC 60947-4-1).',
        'A deep voltage dip during motor starting can drop out contactors: undervoltage protection by design.'),
    P(RELAY, null, 'RC Timing Circuit Delay', r`$t = RC\ln\frac{V}{V - V_{th}}$`, r`$t = RC\ln\frac{V}{V - V_{th}}\quad (\text{capacitor charging to a threshold})$`,
        [v(r`$R, C$`, 'timing resistor and capacitor', OHM), v(r`$V$`, 'supply voltage', V_), v(r`$V_{th}$`, 'voltage at which the relay switches', V_)],
        'The delay of a simple RC timer: the time for the capacitor to charge to the switching threshold.',
        'At V_th = 0.632V the delay is exactly RC; the 555 timer uses 2/3 V, giving 1.1RC.', S_),
    // Motor Starters
    P(START, null, 'Overload Relay Trip Class', r`$t_{trip} \le \text{class}\ \text{s at } 7.2I_e$`, r`$t_{trip} \le 10,\ 20,\ 30\ \text{s at } 7.2\,I_e\ (\text{IEC}),\ 6\,I_{FLA}\ (\text{NEMA})$`,
        [v(r`$I_e$`, 'setting (rated operational current)', A_), v(r`$\text{class}$`, 'trip class 10, 20 or 30')],
        'The trip class says how long an overload relay lets a stalled motor draw locked-rotor current.',
        'Class 10 for standard motors, 20 or 30 for high-inertia loads with long starts.', S_),
    P(START, null, 'Primary Resistor for a Reduced-Voltage Start', r`$R = \sqrt{(Z/x)^2 - X^2} - R_m$`, r`$|Z_m + R| = \frac{|Z_m|}{x} \implies R = \sqrt{\left(\frac{|Z_m|}{x}\right)^2 - X_m^2} - R_m$`,
        [v(r`$Z_m = R_m + jX_m$`, 'motor locked-rotor impedance per phase', OHM), v(r`$x$`, 'fraction of locked-rotor current wanted')],
        'The series resistor that limits a motor\'s starting current to a fraction x of its direct-on-line value.',
        'Torque falls as x²; the resistor is shorted out as the motor comes up to speed.', OHM),
    // Instrument Transformers
    P(IT, null, 'Metering with Instrument Transformers', r`$P = W \cdot \text{CTR} \cdot \text{VTR}$`, r`$P_{primary} = W_{meter} \times \text{CTR} \times \text{VTR},\qquad E = \Delta\text{reading} \times \text{CTR} \times \text{VTR}$`,
        [v(r`$W_{meter}$`, 'meter reading (secondary watts or kWh)'), v(r`$\text{CTR}, \text{VTR}$`, 'CT and VT ratios (e.g. 200:5 = 40)')],
        'Primary power or energy from a meter on the secondaries of instrument transformers.',
        'The billing multiplier is CTR × VTR: 200:5 and 14,400:120 give 40 × 120 = 4800.'),
    P(IT, null, 'Ratio Correction Factor', r`$\text{RCF} = \frac{\text{true ratio}}{\text{marked ratio}}$`, r`$\text{RCF} = \frac{\text{true ratio}}{\text{marked ratio}},\qquad \text{true value} = \text{reading} \times \text{marked ratio} \times \text{RCF}$`,
        [v(r`$\text{RCF}$`, 'ratio correction factor (1.000 for a perfect transformer)')],
        'Corrects for the small ratio error of a real instrument transformer.',
        'Accuracy classes 0.3, 0.6 and 1.2 limit the combined ratio and phase-angle error at stated burdens.'),
    // Capacitors and Reactors
    P(CAP, null, 'Capacitor kvar at Other Voltage or Frequency', r`$Q = Q_r\left(\frac{V}{V_r}\right)^2\frac{f}{f_r}$`, r`$Q = Q_r\left(\frac{V}{V_r}\right)^2\frac{f}{f_r}$`,
        [v(r`$Q_r$`, 'rated kvar', r`$\text{kvar}$`), v(r`$V, V_r$`, 'applied and rated voltage', V_), v(r`$f, f_r$`, 'applied and rated frequency', r`$\text{Hz}$`)],
        'A capacitor\'s output changes with the square of voltage and in proportion to frequency.',
        'A 480 V capacitor on 400 V gives only 69% of its rating.', r`$\text{kvar}$`),
    P(CAP, null, 'Capacitance of a Three-Phase Bank', r`$C_\Delta = \frac{C_Y}{3} = \frac{Q}{3\omega V_L^2}$`, r`$C_Y = \frac{Q}{\omega V_L^2},\qquad C_\Delta = \frac{Q}{3\omega V_L^2}\quad (\text{per phase, total } Q)$`,
        [v(r`$Q$`, 'total three-phase rating', r`$\text{var}$`), v(r`$V_L$`, 'line voltage', V_), v(r`$\omega$`, '2πf', r`$\text{rad/s}$`)],
        'The capacitance per phase for a three-phase bank in wye or in delta.',
        'Delta needs a third of the capacitance (at line voltage) for the same kvar.', r`$\text{F}$`),
    P(CAP, null, 'Capacitor Discharge Resistor', r`$R \le \frac{t}{C\ln(V_0/V_s)}$`, r`$R \le \frac{t}{C\ln(V_0/V_s)}\quad (V_s = 50\ \text{V within } t = 60\ \text{s, low voltage})$`,
        [v(r`$C$`, 'capacitance', r`$\text{F}$`), v(r`$V_0$`, 'peak voltage at disconnection', V_), v(r`$V_s$`, 'safe residual voltage', V_), v(r`$t$`, 'time allowed', S_)],
        'The discharge resistor that brings a disconnected capacitor down to a safe voltage in time.',
        'Use the PEAK voltage (√2 × RMS) as the starting value.', OHM),
    P(CAP, null, 'Capacitor Resonance Harmonic', r`$h_r = \sqrt{\frac{S_{sc}}{Q_c}}$`, r`$h_r = \sqrt{\frac{S_{sc}}{Q_c}}$`,
        [v(r`$S_{sc}$`, 'short-circuit MVA at the capacitor bus', r`$\text{MVA}$`), v(r`$Q_c$`, 'capacitor bank rating', r`$\text{Mvar}$`)],
        'The harmonic at which a shunt capacitor resonates with the system\'s inductance.',
        'Danger when h_r lands near 5 or 7 in a plant with drives: add a detuning reactor.'),
    P(CAP, null, 'Detuning Reactor', r`$p = \frac{X_L}{X_C} = \frac{1}{h^2}$`, r`$p = \frac{X_L}{X_C} = \frac{1}{h_t^2};\qquad p = 7\% \implies h_t = 3.78$`,
        [v(r`$p$`, 'reactor percentage of the capacitor reactance'), v(r`$h_t$`, 'tuning harmonic of the reactor-capacitor branch')],
        'A series reactor tunes a capacitor branch below the lowest harmonic, so it cannot resonate there.',
        'The capacitor sees a higher voltage, V/(1 − p): rate it accordingly.'),
    // Surge Arresters
    P(SA, null, 'Arrester Lead-Length Voltage', r`$\Delta V = L'\ell\frac{di}{dt}$`, r`$V_{equip} = V_{res} + L'\ell\frac{di}{dt},\qquad L' \approx 1\ \mu\text{H/m}$`,
        [v(r`$V_{res}$`, 'arrester residual (discharge) voltage', r`$\text{kV}$`), v(r`$\ell$`, 'total lead length (line and ground)', r`$\text{m}$`), v(r`$di/dt$`, 'surge current steepness', r`$\text{kA/µs}$`)],
        'Every metre of arrester lead adds voltage on a steep surge.',
        '10 kA/µs through 1 µH/m adds 10 kV per metre: keep leads short and straight.', r`$\text{kV}$`),
    // Switchgear and Panelboards
    P(SWG, null, 'Peak Force on Busbars', r`$\frac{F}{\ell} = 0.2\frac{i_p^2}{d}$`, r`$\frac{F}{\ell} = 0.2\frac{i_p^2}{d}\ (\text{N/m; kA, m}),\qquad \times 0.866 \text{ for the middle bar of a flat three-phase set}$`,
        [v(r`$i_p$`, 'peak short-circuit current', r`$\text{kA}$`), v(r`$d$`, 'centre spacing of the bars', r`$\text{m}$`)],
        'The magnetic force between bars during a fault, which supports and spacings must resist.',
        'Use the PEAK (asymmetrical) current, about 2.5 times the RMS symmetrical.', r`$\text{N/m}$`),
    // Wires and Cables
    P(CABLE, null, 'AWG Diameter', r`$d = 0.127 \times 92^{(36 - n)/39}$`, r`$d = 0.127 \times 92^{(36 - n)/39}\ \text{mm};\qquad \text{cmil} = d_{mil}^2$`,
        [v(r`$n$`, 'gauge number (0000 = −3)'), v(r`$d$`, 'diameter', r`$\text{mm}$`)],
        'The diameter of an AWG wire from its gauge.',
        'Every 3 gauges doubles the area; every 6 doubles the diameter.', r`$\text{mm}$`),
    P(CABLE, null, 'Cable Short-Circuit Withstand', r`$S \ge \frac{I\sqrt t}{k}$`, r`$S \ge \frac{I\sqrt{t}}{k}\quad (k = 115\ \text{Cu/PVC},\ 143\ \text{Cu/XLPE})$`,
        [v(r`$I$`, 'fault current', A_), v(r`$t$`, 'clearing time (up to about 5 s)', S_), v(r`$k$`, 'material and insulation factor', r`$\text{A}\sqrt{\text{s}}/\text{mm}^2$`)],
        'The smallest conductor that survives a fault without its insulation overheating (adiabatic).',
        'Slow protection needs a much larger cable: the area goes with √t.', r`$\text{mm}^2$`),
    P(CABLE, null, 'Electric Stress in a Single-Core Cable', r`$g = \frac{V}{r\ln(R/r)}$`, r`$g(x) = \frac{V}{x\ln(R/r)},\qquad g_{\max} = \frac{V}{r\ln(R/r)}\ (\text{at the conductor})$`,
        [v(r`$V$`, 'conductor-to-sheath voltage', r`$\text{kV}$`), v(r`$r, R$`, 'conductor and insulation outer radii', r`$\text{cm}$`), v(r`$x$`, 'radius where the stress is wanted', r`$\text{cm}$`)],
        'The electric field in a cable\'s insulation, largest at the conductor surface.',
        'For a given R the maximum stress is least when r = R/e.', r`$\text{kV/cm}$`),
    // Batteries and UPS
    P(BATT, null, "Peukert's Law", r`$t = H\left(\frac{C}{IH}\right)^k$`, r`$t = H\left(\frac{C}{IH}\right)^k\quad (k \approx 1.1\text{–}1.3 \text{ lead-acid})$`,
        [v(r`$C$`, 'rated capacity at the H-hour rate', r`$\text{Ah}$`), v(r`$H$`, 'rated discharge time, e.g. 20 h', r`$\text{h}$`), v(r`$I$`, 'actual discharge current', A_), v(r`$k$`, 'Peukert exponent')],
        'A battery delivers less capacity the faster it is discharged.',
        'At k = 1 (ideal) t = C/I; lithium cells are close to that.', r`$\text{h}$`),
    P(BATT, null, 'UPS Runtime', r`$t = \frac{C\,V\,\eta\,\text{DoD}}{P}$`, r`$S_{UPS} \ge \frac{P_{load}}{\text{pf}},\qquad t = \frac{C\,V_{bank}\,\eta\,\text{DoD}}{P_{load}}$`,
        [v(r`$C$`, 'battery capacity', r`$\text{Ah}$`), v(r`$V_{bank}$`, 'battery bank voltage', V_), v(r`$\eta$`, 'inverter efficiency'), v(r`$P_{load}$`, 'load power', r`$\text{W}$`)],
        'How long a UPS carries its load on battery, and the kVA it must be rated for.',
        'Correct C for the discharge rate (Peukert) when the runtime is short.', r`$\text{h}$`),
    // Lamps and Luminaires
    P(LAMP, null, 'Luminaire Efficiency', r`$\eta_{lum} = \frac{\Phi_{out}}{\Phi_{lamps}}$`, r`$\eta_{luminaire} = \frac{\Phi_{out}}{\Phi_{lamps}}\ (\text{light output ratio}),\qquad \text{efficacy} = \frac{\Phi_{out}}{P_{in}}$`,
        [v(r`$\Phi_{out}$`, 'lumens leaving the luminaire', r`$\text{lm}$`), v(r`$\Phi_{lamps}$`, 'bare-lamp lumens', r`$\text{lm}$`), v(r`$P_{in}$`, 'input watts including driver', r`$\text{W}$`)],
        'How much of the lamps\' light the fitting actually releases.',
        'LED luminaires are rated on luminaire lumens directly; compare luminaire efficacy (lm/W).'),
    P(LAMP, null, 'LED L70 Life', r`$L_{70} = \frac{\ln(1/0.7)}{\alpha}$`, r`$\Phi(t) = \Phi_0e^{-\alpha t},\qquad L_{70} = \frac{\ln(1/0.7)}{\alpha}$`,
        [v(r`$\alpha$`, 'lumen decay rate fitted from test data', r`$\text{1/h}$`), v(r`$\Phi_0$`, 'initial lumens', r`$\text{lm}$`)],
        'LEDs rarely fail outright; their life is the hours until output falls to 70%.',
        'Heat shortens L70 sharply: luminaire thermal design matters as much as the chip.', r`$\text{h}$`),
];

module.exports = { subject: 'EE', topic: 'Electrical Apparatus & Devices', migration: '20270106000000_cards_apparatus_devices', file, revisions, retire, drafts };
