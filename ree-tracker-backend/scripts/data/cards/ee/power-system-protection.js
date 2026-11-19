'use strict';

// EE › Power System Protection formula cards (Library round, 2026-11-19): no
// live cards; this file writes the topic: clearing time; instrument-
// transformer ratios, burden, knee point and C-class ratings; plug setting
// multiplier, IEC and IEEE inverse curves and the pickup window; coordination
// time interval and TMS; directional torque; distance relays (secondary
// impedance, zone reaches, mho reach, residual compensation); percentage and
// transformer differential; second-harmonic restraint, V/Hz and through-fault
// current; generator negative-sequence limit, neutral resistor and stator
// earth-fault coverage; motor thermal overload, locked-rotor withstand and
// unbalance heating; high-impedance bus differential; breaker symmetrical,
// asymmetrical and close-and-latch currents; resistance grounding, effective
// grounding, rod and grid resistance and tolerable step and touch voltages;
// arrester rating, protective margin, separation and striking distance; and
// arc-flash incident energy and boundary (Lee). PEC motor and transformer
// overcurrent rules are in ESAS › Electrical Standards and Practices. Curve
// constants: IEC 60255-151 and IEEE C37.112; step and touch: IEEE 80; arc
// flash: IEEE 1584 (Lee method). See mathematics/algebra.js for the format;
// tests/powerSystemProtectionFormulas.test.js checks each numerically.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const FUND = 'Protection Fundamentals';
const IT = 'Instrument Transformers for Relaying';
const OC = 'Overcurrent Relays';
const COORD = 'Relay Coordination';
const DIR = 'Directional Relays';
const DIST = 'Distance Relays';
const DIFF = 'Differential Relays';
const XFMR = 'Transformer Protection';
const GEN = 'Generator Protection';
const MOT = 'Motor Protection';
const BUS = 'Bus and Line Protection';
const CB = 'Circuit Breaker Ratings';
const GND = 'System Grounding';
const LTG = 'Lightning Protection';
const ARC = 'Arc Flash';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const S_ = r`$\text{s}$`;
const OHM = r`$\Omega$`;
const M_ = r`$\text{m}$`;
const RHO = v(r`$\rho$`, 'soil resistivity', r`$\Omega\text{·m}$`);
const TMS = v(r`$\text{TMS}$`, 'time multiplier setting (time dial)');
const PSM = v(r`$M$`, 'multiple of pickup, I/I_s');

const drafts = [
    // Protection Fundamentals
    P(FUND, null, 'Fault Clearing Time', r`$t_{clear} = t_{relay} + t_{breaker}$`, r`$t_{clear} = t_{relay} + t_{breaker},\qquad t_{backup} \ge t_{primary} + \text{CTI}$`,
        [v(r`$t_{relay}$`, 'relay operating time', S_), v(r`$t_{breaker}$`, 'breaker interrupting time (3–5 cycles)', S_), v(r`$\text{CTI}$`, 'coordination time interval', S_)],
        'How long a fault lasts: the relay decides, then the breaker interrupts; backup waits a margin longer.',
        'A 5-cycle breaker at 60 Hz takes 83 ms. Primary zones overlap so no part of the system is unprotected.', S_),
    // Instrument Transformers for Relaying
    P(IT, null, 'Instrument Transformer Ratios and Burden', r`$I_s = \frac{I_p}{N_{CT}},\ S_b = I^2Z_b$`, r`$I_s = \frac{I_p}{N_{CT}},\quad V_s = \frac{V_p}{N_{VT}};\qquad S_b = I_s^2Z_b\ (\text{CT}),\ \frac{V_s^2}{Z_b}\ (\text{VT})$`,
        [v(r`$N_{CT}, N_{VT}$`, 'CT and VT ratios (e.g. 600:5 = 120)'), v(r`$Z_b$`, 'burden: relays, meters and leads', OHM)],
        'Scaling primary current and voltage to relay levels, and the load (burden) they see.',
        'A CT is a current source: never open its secondary under load; short it first.'),
    P(IT, null, 'CT Saturation Check (Knee-Point Voltage)', r`$V_s = \frac{I_f}{N}(R_{ct} + 2R_L + R_b) < V_k$`, r`$V_s = \frac{I_f}{N}(R_{ct} + 2R_L + R_b) < V_k$`,
        [v(r`$I_f$`, 'maximum fault current, primary', A_), v(r`$N$`, 'CT ratio'), v(r`$R_{ct}, R_L, R_b$`, 'CT winding, one-way lead and relay resistances', OHM), v(r`$V_k$`, 'knee-point voltage', V_)],
        'The voltage a CT must develop to drive fault current through its burden without saturating.',
        'Leads count twice (out and back) for phase faults. DC offset can need several times this.', V_),
    P(IT, null, 'ANSI C-Class CT Rating', r`$Z_{b,\max} = \frac{V_C}{100}$`, r`$\text{C}V_C: V_C \text{ at } 20 \times 5\ \text{A} = 100\ \text{A, error} \le 10\%,\qquad Z_{b,\max} = \frac{V_C}{100}$`,
        [v(r`$V_C$`, 'class voltage, e.g. 400 for C400', V_)],
        'What a C-class CT can drive: its class voltage at 20 times rated current with at most 10% error.',
        'A C400 CT supports up to 4 Ω of burden at 100 A secondary.', OHM),
    // Overcurrent Relays
    P(OC, null, 'Plug Setting Multiplier', r`$M = \frac{I_f}{I_{pickup}}$`, r`$M = \frac{I_f/N_{CT}}{I_{set}} = \frac{I_f}{I_{pickup}},\qquad I_{pickup} = I_{set}N_{CT}$`,
        [v(r`$I_f$`, 'fault current, primary', A_), v(r`$I_{set}$`, 'relay current setting (plug or tap), secondary', A_), v(r`$N_{CT}$`, 'CT ratio')],
        'How many times its pickup a relay sees: the input to every time-current curve.',
        'Old relays set the plug as a percentage of 5 A: a 125% plug on 400:5 picks up at 500 A primary.'),
    P(OC, null, 'IEC Inverse-Time Curves', r`$t = \text{TMS}\frac{k}{M^\alpha - 1}$`, r`$t = \text{TMS}\frac{k}{M^\alpha - 1}:\ \text{SI } (0.14, 0.02),\ \text{VI } (13.5, 1),\ \text{EI } (80, 2),\ \text{LTI } (120, 1)$`,
        [TMS, PSM, v(r`$k, \alpha$`, 'curve constants (IEC 60255)')],
        'Operating time of an IEC inverse-time overcurrent relay.',
        'Standard inverse at M = 10 and TMS = 1 trips in 2.97 s.', S_),
    P(OC, null, 'IEEE Inverse-Time Curves', r`$t = \text{TD}\left(\frac{A}{M^p - 1} + B\right)$`, r`$t = \text{TD}\left(\frac{A}{M^p - 1} + B\right):\ \text{MI } (0.0515, 0.114, 0.02),\ \text{VI } (19.61, 0.491, 2),\ \text{EI } (28.2, 0.1217, 2)$`,
        [v(r`$\text{TD}$`, 'time dial'), PSM, v(r`$A, B, p$`, 'curve constants (IEEE C37.112)')],
        'Operating time of an IEEE inverse-time overcurrent relay.',
        'Extremely inverse suits coordination with fuses; very inverse with long feeders.', S_),
    P(OC, null, 'Overcurrent Pickup Window', r`$k_LI_{load} < I_{pickup} < \frac{I_{f,\min}}{k_s}$`, r`$k_LI_{load,\max} < I_{pickup} < \frac{I_{f,\min}}{k_s}\qquad (k_L \approx 1.25\text{–}1.5,\ k_s \approx 1.5\text{–}2)$`,
        [v(r`$I_{load,\max}$`, 'maximum load current', A_), v(r`$I_{f,\min}$`, 'smallest fault at the end of the zone', A_), v(r`$k_L, k_s$`, 'load and sensitivity margins')],
        'A phase relay must ride through the heaviest load but still see the smallest fault it covers.',
        'If the window closes (min fault close to max load), use a distance or differential scheme instead.', A_),
    // Relay Coordination
    P(COORD, null, 'Coordination Time Interval', r`$t_{up} \ge t_{down} + \text{CTI}$`, r`$t_{up} \ge t_{down} + \text{CTI},\qquad \text{CTI} \approx 0.2\text{–}0.4\ \text{s}$`,
        [v(r`$t_{down}$`, 'downstream relay time at the fault current', S_), v(r`$t_{up}$`, 'upstream relay time at the same current', S_)],
        'The margin between relays in series, so the nearest one always trips first.',
        'Check at the MAXIMUM fault current through both, where the curves come closest.', S_),
    P(COORD, null, 'Time Multiplier for a Required Time', r`$\text{TMS} = \frac{t_{req}}{t_{\text{TMS}=1}}$`, r`$\text{TMS} = \frac{t_{req}}{t(M)\big|_{\text{TMS} = 1}}$`,
        [v(r`$t_{req}$`, 'operating time needed at that fault', S_), v(r`$t(M)|_{TMS=1}$`, 'curve time at the same multiple with TMS = 1', S_)],
        'The time dial that makes a relay operate at a chosen time for a given fault.',
        'Round UP to the next available step, then recheck the margin.'),
    // Directional Relays
    P(DIR, null, 'Directional Relay Torque', r`$T = KVI\cos(\theta - \tau) - K_s$`, r`$T = KVI\cos(\theta - \tau) - K_s;\qquad \text{operates for } |\theta - \tau| < 90°$`,
        [v(r`$\theta$`, 'angle of the current from the polarizing voltage'), v(r`$\tau$`, 'maximum torque angle'), v(r`$K_s$`, 'restraining (spring) torque')],
        'A directional element operates only for current in the tripping direction.',
        'With the 90° (quadrature) connection, phase A current is compared with V_bc, which holds up during a phase-A fault.'),
    // Distance Relays
    P(DIST, null, 'Secondary Impedance Seen by a Distance Relay', r`$Z_{sec} = Z_{pri}\frac{N_{CT}}{N_{VT}}$`, r`$Z_{sec} = \frac{V_s}{I_s} = Z_{pri}\frac{N_{CT}}{N_{VT}}$`,
        [v(r`$Z_{pri}$`, 'primary impedance to the fault', OHM), v(r`$N_{CT}, N_{VT}$`, 'CT and VT ratios')],
        'The impedance the relay actually measures, in secondary ohms.',
        'A larger CT ratio raises the secondary ohms; a larger VT ratio lowers them.', OHM),
    P(DIST, null, 'Distance Zone Reaches', r`$Z_1 = 0.8Z_L$`, r`$Z_1 \approx 0.8\text{–}0.85Z_L\ (\text{instant});\quad Z_2 \approx 1.2\text{–}1.5Z_L\ (\approx 0.3\ \text{s});\quad Z_3 \approx Z_L + 1.2Z_{next}\ (\approx 1\ \text{s})$`,
        [v(r`$Z_L$`, 'protected line impedance', OHM), v(r`$Z_{next}$`, 'longest adjacent line impedance', OHM)],
        'Typical stepped reaches of a distance relay: fast for most of the line, delayed beyond it.',
        'Zone 1 stops short of the far end so CT, VT and line-data errors never make it overreach.', OHM),
    P(DIST, null, 'Mho Relay Reach', r`$Z(\theta) = Z_{set}\cos(\theta - \phi)$`, r`$Z(\theta) = Z_{set}\cos(\theta - \phi);\qquad \text{operates if } \left|Z - \tfrac12Z_{set}\angle\phi\right| < \tfrac12Z_{set}$`,
        [v(r`$Z_{set}$`, 'reach at the characteristic angle', OHM), v(r`$\phi$`, 'characteristic (maximum torque) angle'), v(r`$\theta$`, 'angle of the impedance seen')],
        'A mho relay\'s reach is a circle through the origin: less reach the further the fault angle is from φ.',
        'Set φ near the line angle; arc resistance moves the fault off that angle and shortens the reach.', OHM),
    P(DIST, null, 'Residual Compensation Factor', r`$k_0 = \frac{Z_0 - Z_1}{3Z_1}$`, r`$Z = \frac{V_a}{I_a + k_0(3I_0)},\qquad k_0 = \frac{Z_0 - Z_1}{3Z_1}$`,
        [v(r`$Z_0, Z_1$`, 'zero- and positive-sequence line impedances', OHM), v(r`$3I_0$`, 'residual current', A_)],
        'Ground-distance elements add a share of the residual current so a ground fault measures the positive-sequence impedance.',
        'Without it, ground faults look farther away than they are (underreach).'),
    // Differential Relays
    P(DIFF, null, 'Percentage Differential Characteristic', r`$|I_1 - I_2| > k\frac{|I_1| + |I_2|}{2}$`, r`$I_{op} = |\mathbf{I}_1 - \mathbf{I}_2| > k\,I_{rst},\qquad I_{rst} = \frac{|\mathbf{I}_1| + |\mathbf{I}_2|}{2}$`,
        [v(r`$\mathbf{I}_1, \mathbf{I}_2$`, 'secondary currents entering and leaving the zone', A_), v(r`$k$`, 'slope, e.g. 0.2–0.4')],
        'A differential relay operates on the difference, restrained by the through current, so CT errors on big through faults don\'t trip it.',
        'Some relays use the larger current or the sum as restraint: check the convention.', A_),
    // Transformer Protection
    P(XFMR, null, 'Transformer Differential CT Matching', r`$\frac{\sqrt3I_Y}{N_Y} = \frac{I_\Delta}{N_\Delta}$`, r`$\frac{\sqrt3I_Y}{N_Y} = \frac{I_\Delta}{N_\Delta}\quad (\text{CTs in delta on the wye side, in wye on the delta side})$`,
        [v(r`$I_Y, I_\Delta$`, 'line currents on the wye and delta sides', A_), v(r`$N_Y, N_\Delta$`, 'CT ratios on those sides')],
        'CTs connected opposite to the windings undo the 30° shift and match the currents into the relay.',
        'The delta-connected CTs also keep zero-sequence current out, so external ground faults don\'t trip it.'),
    P(XFMR, null, 'Second-Harmonic Restraint', r`$\frac{I_{2h}}{I_{1h}} > 0.15$`, r`$\text{block if } \frac{I_{2h}}{I_{1h}} > 0.15\text{–}0.20$`,
        [v(r`$I_{2h}, I_{1h}$`, 'second-harmonic and fundamental differential current', A_)],
        'Magnetizing inrush is rich in second harmonic; a fault is not. The relay blocks while it is high.',
        'Inrush can reach 8–12 times rated current and lasts seconds; it flows in one winding only, so it looks like a fault.'),
    P(XFMR, null, 'Volts per Hertz (Overexcitation)', r`$\frac{V}{f}\Big|_{pu} = \frac{V/V_r}{f/f_r}$`, r`$\frac{V}{f}\Big|_{pu} = \frac{V/V_r}{f/f_r};\qquad \text{continuous limit} \approx 1.05\ (\text{full load})$`,
        [v(r`$V, V_r$`, 'applied and rated voltage', V_), v(r`$f, f_r$`, 'actual and rated frequency', r`$\text{Hz}$`)],
        'Core flux goes as V/f: high voltage or low frequency over-fluxes transformers and generators.',
        'A generator at rated voltage during start-up at 55 Hz is already at 1.09 pu.'),
    P(XFMR, null, 'Transformer Through-Fault Current', r`$I_{sc} = \frac{I_{rated}}{Z_{pu}}$`, r`$I_{sc} = \frac{I_{rated}}{Z_{pu}}\ (\text{infinite source}),\qquad I_{sc} = \frac{I_{rated}}{Z_{pu} + Z_{s,pu}}$`,
        [v(r`$I_{rated}$`, 'rated current on that side', A_), v(r`$Z_{pu}$`, 'transformer impedance, pu'), v(r`$Z_{s,pu}$`, 'source impedance on the transformer base, pu')],
        'The largest current a transformer passes into a fault on its secondary: the basis of its protection curve.',
        'A 5% transformer passes at most 20 times its rated current.', A_),
    // Generator Protection
    P(GEN, null, 'Negative-Sequence Heating Limit', r`$I_2^2t = K$`, r`$I_2^2t \le K\quad (I_2 \text{ in pu of rated})$`,
        [v(r`$I_2$`, 'negative-sequence stator current, pu'), v(r`$t$`, 'duration', S_), v(r`$K$`, 'machine constant, about 5–30 for large turbo machines', S_)],
        'Unbalance induces double-frequency rotor currents; the machine tolerates a fixed I₂²t.',
        'K = 10 and I₂ = 0.5 pu allow only 40 s.', S_),
    P(GEN, null, 'Generator Neutral Resistor Sizing', r`$R_n = \frac{1}{3\omega C_0}$`, r`$R_n = \frac{X_{C0}}{3} = \frac{1}{3\omega C_0},\qquad R_{sec} = \frac{R_n}{N^2}$`,
        [v(r`$C_0$`, 'capacitance to ground per phase of everything on the generator bus', r`$\text{F}$`), v(r`$N$`, 'distribution-transformer ratio'), v(r`$\omega$`, '2πf', r`$\text{rad/s}$`)],
        'High-resistance grounding: the neutral resistor equals the zero-sequence capacitive reactance, limiting transient overvoltage.',
        'Resistor current then equals the charging current, a few amperes: the generator rides through a ground fault until tripped.', OHM),
    P(GEN, null, 'Stator Earth-Fault Coverage', r`$\text{coverage} = 1 - \frac{V_{set}}{V_{ph}}$`, r`$V_N = xV_{ph},\qquad \text{coverage} = 1 - \frac{V_{set}}{V_{ph}}$`,
        [v(r`$x$`, 'fault position as a fraction of the winding from neutral'), v(r`$V_{set}$`, 'neutral overvoltage pickup', V_), v(r`$V_{ph}$`, 'phase-to-neutral voltage', V_)],
        'A neutral-voltage relay cannot see faults close to the neutral, where little voltage drives them.',
        'A 5% pickup covers 95% of the winding; third-harmonic schemes cover the rest.'),
    // Motor Protection
    P(MOT, null, 'Thermal Overload Trip Time', r`$t = \tau\ln\frac{I^2 - I_P^2}{I^2 - (kI_B)^2}$`, r`$t = \tau\ln\frac{I^2 - I_P^2}{I^2 - (kI_B)^2}\quad (I_P = 0 \text{ from cold})$`,
        [v(r`$\tau$`, 'thermal time constant', S_), v(r`$I$`, 'present current', A_), v(r`$I_P$`, 'steady current before the overload (hot state)', A_), v(r`$kI_B$`, 'current the relay allows indefinitely', A_)],
        'A thermal replica: time for the motor\'s modelled temperature to reach trip under an overload (IEC 60255-149).',
        'A hot motor trips much sooner than a cold one at the same overload.', S_),
    P(MOT, null, 'Locked-Rotor Withstand', r`$t = t_{LR}\left(\frac{I_{LR}}{I}\right)^2$`, r`$I^2t = \text{const} \implies t = t_{LR}\left(\frac{I_{LR}}{I}\right)^2$`,
        [v(r`$t_{LR}$`, 'safe stall time at locked-rotor current', S_), v(r`$I_{LR}$`, 'locked-rotor current', A_), v(r`$I$`, 'actual stall current (e.g. at reduced voltage)', A_)],
        'How long a stalled motor survives: the rotor heats as I²t.',
        'At 80% voltage the stall current is 80% but the allowed time is 1.56 times longer, while starting takes longer too.', S_),
    P(MOT, null, 'Equivalent Heating Current with Unbalance', r`$I_{eq} = \sqrt{I_1^2 + KI_2^2}$`, r`$I_{eq} = \sqrt{I_1^2 + KI_2^2},\qquad K \approx \frac{175}{I_{LR,pu}^2} \approx 6$`,
        [v(r`$I_1, I_2$`, 'positive- and negative-sequence currents, pu'), v(r`$K$`, 'negative-sequence heating weight')],
        'Negative-sequence current heats the rotor several times as much as positive sequence.',
        'A few percent of voltage unbalance makes several times as much current unbalance.'),
    // Bus and Line Protection
    P(BUS, null, 'High-Impedance Bus Differential Setting', r`$V_s \ge \frac{I_f}{N}(R_{ct} + 2R_L)$`, r`$V_s \ge \frac{I_{f,\max}}{N}(R_{ct} + 2R_L),\qquad V_k \ge 2V_s$`,
        [v(r`$I_{f,\max}$`, 'largest external fault current', A_), v(r`$N$`, 'CT ratio'), v(r`$R_{ct}, R_L$`, 'CT winding and one-way lead resistance', OHM)],
        'The voltage setting that keeps the relay stable when one CT fully saturates on an external fault.',
        'All CTs must have the same ratio; the saturated CT is taken as a short circuit.', V_),
    // Circuit Breaker Ratings
    P(CB, null, 'Breaker Interrupting Current', r`$I_{sym} = \frac{\text{MVA}_{sc}}{\sqrt3\,\text{kV}}$`, r`$I_{sym} = \frac{\text{MVA}_{sc}}{\sqrt3\,\text{kV}},\qquad I_{asym} = I_{sym}\sqrt{1 + 2e^{-2t/\tau}},\ \tau = \frac{X}{\omega R}$`,
        [v(r`$\text{MVA}_{sc}$`, 'short-circuit level'), v(r`$t$`, 'contact-parting time', S_), v(r`$\tau$`, 'dc time constant', S_)],
        'The symmetrical current a breaker must interrupt, and its RMS with the dc offset still present at contact parting.',
        'A faster breaker or a high X/R leaves more dc offset at parting.', r`$\text{kA}$`),
    P(CB, null, 'Close-and-Latch (Peak) Rating', r`$I_{peak} = 2.6I_{sym}$`, r`$I_{peak} = 2.6\,I_{sym}\ (60\ \text{Hz, X/R} = 17);\quad 2.5\,I_{sym}\ (50\ \text{Hz, IEC})$`,
        [v(r`$I_{sym}$`, 'rated symmetrical short-circuit current', r`$\text{kA}$`)],
        'The first-cycle peak a breaker must close onto and hold, set by the dc offset.',
        '√2(1 + e^(−π/(X/R))) at X/R = 17 gives 2.59, hence 2.6.', r`$\text{kA}$`),
    // System Grounding
    P(GND, null, 'Resistance-Grounded Fault Current', r`$I_g \approx \frac{V_{LN}}{R_n}$`, r`$I_g \approx \frac{V_{LN}}{R_n};\qquad \text{high-resistance: } I_R \ge 3I_{C0} = 3\omega C_0V_{LN}$`,
        [v(r`$V_{LN}$`, 'line-to-neutral voltage', V_), v(r`$R_n$`, 'neutral resistor', OHM), v(r`$C_0$`, 'capacitance to ground per phase', r`$\text{F}$`)],
        'A neutral resistor limits ground-fault current to a set value.',
        'Low-resistance: hundreds of amperes, trip. High-resistance: a few amperes, alarm and keep running.', A_),
    P(GND, null, 'Effectively Grounded System', r`$\frac{X_0}{X_1} \le 3,\ \frac{R_0}{X_1} \le 1$`, r`$\frac{X_0}{X_1} \le 3,\quad \frac{R_0}{X_1} \le 1 \implies \text{COG} \le 80\%$`,
        [v(r`$X_0, X_1$`, 'zero- and positive-sequence reactances at the point', OHM), v(r`$R_0$`, 'zero-sequence resistance', OHM)],
        'The test for an effectively grounded system: healthy phases rise no more than 80% of line voltage on a ground fault.',
        'Ungrounded systems reach 100% (full line voltage) and need higher-rated arresters.'),
    P(GND, null, 'Ground Rod Resistance (Dwight)', r`$R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$`, r`$R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$`,
        [RHO, v(r`$L$`, 'rod length', M_), v(r`$a$`, 'rod radius', M_)],
        'Resistance to remote earth of one driven rod.',
        'Doubling the length nearly halves R; doubling the diameter helps little.', OHM),
    P(GND, null, 'Grounding Grid Resistance', r`$R_g = \frac{\rho}{4}\sqrt{\pi/A} + \frac{\rho}{L_T}$`, r`$R_g = \frac{\rho}{4}\sqrt{\frac{\pi}{A}} + \frac{\rho}{L_T}\quad (\text{Laurent–Niemann})$`,
        [RHO, v(r`$A$`, 'area covered by the grid', r`$\text{m}^2$`), v(r`$L_T$`, 'total length of buried conductor', M_)],
        'A quick estimate of a substation grid\'s resistance.',
        'Area matters most; adding conductor inside the same area helps less.', OHM),
    P(GND, null, 'Tolerable Step and Touch Voltage', r`$E_{touch} = (1000 + 1.5C_s\rho_s)\frac{0.116}{\sqrt{t_s}}$`, r`$E_{step} = (1000 + 6C_s\rho_s)\frac{0.116}{\sqrt{t_s}},\quad E_{touch} = (1000 + 1.5C_s\rho_s)\frac{0.116}{\sqrt{t_s}}\quad (50\ \text{kg})$`,
        [v(r`$\rho_s$`, 'surface layer resistivity (crushed rock)', r`$\Omega\text{·m}$`), v(r`$C_s$`, 'surface layer derating factor (1 without a layer)'), v(r`$t_s$`, 'shock duration', S_)],
        'The largest step and touch voltages a person can safely bear (IEEE 80).',
        'For a 70 kg person use 0.157 instead of 0.116. Touch voltage is usually the limit that governs.', V_),
    // Lightning Protection
    P(LTG, null, 'Surge Arrester Rating', r`$V_{ar} \ge \text{COG} \times V_{LL,\max}$`, r`$V_{ar} \ge \text{COG} \times V_{LL,\max},\qquad \text{MCOV} \ge \frac{V_{LL,\max}}{\sqrt3}\ (\text{effectively grounded})$`,
        [v(r`$\text{COG}$`, 'coefficient of grounding: ≤ 0.8 effectively grounded, 1.0 ungrounded'), v(r`$V_{LL,\max}$`, 'highest system line voltage', V_)],
        'An arrester must withstand the healthy-phase voltage during a ground fault elsewhere.',
        'Too low a rating and it fails on temporary overvoltage; too high and it protects less.', r`$\text{kV}$`),
    P(LTG, null, 'Protective Margin', r`$\text{PM} = \frac{\text{BIL}}{V_p} - 1 \ge 20\%$`, r`$\text{PM} = \left(\frac{\text{BIL}}{V_p} - 1\right) \times 100\% \ge 20\%$`,
        [v(r`$\text{BIL}$`, 'basic impulse insulation level of the equipment', r`$\text{kV}$`), v(r`$V_p$`, 'voltage at the equipment during the surge (arrester protective level plus lead and separation)', r`$\text{kV}$`)],
        'How far below the equipment\'s insulation strength the arrester holds the surge.',
        'At least 20% for lightning impulses (IEEE C62.22).'),
    P(LTG, null, 'Arrester Separation Effect', r`$V_e = V_a + \frac{2Sd}{v}$`, r`$V_e = V_a + \frac{2Sd}{v}$`,
        [v(r`$V_a$`, 'arrester discharge voltage', r`$\text{kV}$`), v(r`$S$`, 'front steepness of the surge', r`$\text{kV/µs}$`), v(r`$d$`, 'distance from arrester to equipment', M_), v(r`$v$`, 'wave speed, about 300 m/µs', r`$\text{m/µs}$`)],
        'Equipment beyond the arrester sees more than the arrester voltage, because the surge reflects there.',
        'Mount arresters as close as possible to the transformer terminals.', r`$\text{kV}$`),
    P(LTG, null, 'Striking Distance', r`$r_s = 10I^{0.65}$`, r`$r_s = 10I^{0.65}\quad (\text{m, kA})$`,
        [v(r`$I$`, 'stroke current', r`$\text{kA}$`), v(r`$r_s$`, 'striking distance', M_)],
        'The electrogeometric model: the last step of a lightning leader, the radius used to design shielding.',
        'A 10 kA stroke gives about 45 m, the rolling-sphere radius used for buildings.', M_),
    // Arc Flash
    P(ARC, null, 'Arc-Flash Incident Energy (Lee)', r`$E = 2.142 \times 10^6\frac{VI_{bf}t}{D^2}$`, r`$E = 2.142 \times 10^6\,VI_{bf}\frac{t}{D^2}\quad (\text{J/cm}^2;\ \text{kV, kA, s, mm})$`,
        [v(r`$V$`, 'system voltage', r`$\text{kV}$`), v(r`$I_{bf}$`, 'bolted fault current', r`$\text{kA}$`), v(r`$t$`, 'arc duration (clearing time)', S_), v(r`$D$`, 'working distance', r`$\text{mm}$`)],
        'A conservative theoretical estimate of the heat energy reaching a worker (IEEE 1584 Lee method).',
        'Energy is proportional to clearing time, so faster protection is the best mitigation. 1 cal/cm² = 4.184 J/cm². IEEE 1584-2018 advises against Lee above 15 kV.', r`$\text{J/cm}^2$`),
    P(ARC, null, 'Arc-Flash Boundary (Lee)', r`$D_B = \sqrt{2.142 \times 10^6\frac{VI_{bf}t}{E_B}}$`, r`$D_B = \sqrt{2.142 \times 10^6\frac{VI_{bf}t}{E_B}},\qquad E_B = 5.0\ \text{J/cm}^2\ (1.2\ \text{cal/cm}^2)$`,
        [v(r`$E_B$`, 'energy at the boundary, the onset of a second-degree burn', r`$\text{J/cm}^2$`), v(r`$V, I_{bf}, t$`, 'as for incident energy')],
        'The distance at which incident energy falls to 1.2 cal/cm²: inside it, arc-rated clothing is required.',
        'The boundary grows with the square root of clearing time.', r`$\text{mm}$`),
];

module.exports = { subject: 'EE', topic: 'Power System Protection', migration: '20270102000000_cards_power_system_protection', file, revisions, retire, drafts };
