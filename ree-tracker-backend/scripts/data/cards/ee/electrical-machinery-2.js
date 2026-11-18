'use strict';

// EE › Electrical Machinery 2 formula cards (Library round, 2026-11-18): 9
// live cards for 12 subtopics, all correct, filed as they are. This file adds
// the rest: electrical degrees, harmonic winding factors and synchronous
// impedance; the generated EMF by phasors, Z_s from the open- and
// short-circuit tests and the short-circuit ratio; the power-angle equation
// (round and salient rotor), synchronizing power, droop load sharing and
// circulating current; synchronous-motor EMF, pull-out power, excitation for
// unity power factor and a motor correcting a plant's power factor; induction
// torque-slip, maximum torque and its slip, Kloss's ratio and starting torque;
// power flow, air-gap power, induced torque and the stator Thévenin
// equivalent; star-delta, autotransformer and reduced-voltage starting and
// rotor resistance for full starting torque; V/f, rotor-resistance and
// voltage speed control and pole changing; forward and backward slip and the
// capacitor for a 90° split; stepper step angle and speed; the no-load and
// blocked-rotor tests and the slip test. Synchronous speed and slip are live
// cards here. See mathematics/algebra.js for the format;
// tests/electricalMachinery2Formulas.test.js checks each with phasors, the
// equivalent circuit, or a search.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SGP = 'Synchronous Generator Principles';
const VREG = 'Voltage Regulation';
const PAR = 'Parallel Operation of Alternators';
const SM = 'Synchronous Motors and V-Curves';
const PFC = 'Power Factor Correction with Synchronous Machines';
const IMST = 'Induction Motor Slip and Torque';
const EQC = 'Equivalent Circuit';
const START = 'Starting Methods';
const SPEED = 'Speed Control';
const SPH = 'Single-Phase Motors';
const SPEC = 'Special Machines (Stepper, Servo)';
const TEST = 'Machine Testing and Efficiency';

const file = [
    ['71ec9888-0992-4e93-a6fe-bfd77746ddc9', SGP, null], // Synchronous Speed
    ['51572b84-0a77-42da-8622-04559cdb1945', SGP, null], // Alternator EMF per Phase
    ['ae1f9671-8f14-4212-bf36-34cab99fbec4', SGP, null], // Pitch Factor
    ['4a607a92-8af0-4aae-bfc0-73535c6d188e', SGP, null], // Distribution Factor
    ['6f062b6b-d88e-4ed2-9134-3f4042c2af34', VREG, null], // Alternator Voltage Regulation
    ['7802e097-87b1-4076-be86-2ebe655ca57a', IMST, null], // Slip of an Induction Motor
    ['4d4a2722-94d1-4a5f-8adc-50a1311b2d87', IMST, null], // Rotor Frequency
    ['a9337a68-4332-4b55-a7a8-2c11b37d17ac', EQC, null], // Developed Mechanical Power
    ['bf280785-7827-4cd0-b48d-51572323bbc0', EQC, null], // Rotor Copper Loss
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const W_ = r`$\text{W}$`;
const OHM = r`$\Omega$`;
const NM = r`$\text{N·m}$`;
const VPH = v(r`$V$`, 'terminal voltage per phase', V_);
const EPH = v(r`$E$`, 'generated (excitation) EMF per phase', V_);
const XS = v(r`$X_s$`, 'synchronous reactance per phase', OHM);
const DELTA = v(r`$\delta$`, 'power (load) angle between E and V');
const SLIP = v(r`$s$`, 'slip, as a decimal');
const WS = v(r`$\omega_s$`, 'synchronous speed, 2πN_s/60', r`$\text{rad/s}$`);
const R2 = v(r`$R_2$`, 'rotor resistance referred to the stator', OHM);
const XEQ = v(r`$X_1 + X_2$`, 'stator plus referred rotor reactance', OHM);

const drafts = [
    // Synchronous Generator Principles
    P(SGP, null, 'Electrical and Mechanical Degrees', r`$\theta_e = \frac{P}{2}\theta_m$`, r`$\theta_e = \frac{P}{2}\theta_m,\qquad \text{slot angle } \alpha = \frac{180°P}{S}$`,
        [v(r`$P$`, 'poles'), v(r`$\theta_m$`, 'mechanical angle'), v(r`$S$`, 'stator slots')],
        'One pair of poles is 360 electrical degrees, so a machine with more poles turns fewer mechanical degrees per cycle.',
        'Pitch and distribution factors use ELECTRICAL degrees.'),
    P(SGP, null, 'Harmonic Winding Factors', r`$k_{pn} = \cos\frac{n\beta}{2}$`, r`$k_{pn} = \cos\frac{n\beta}{2},\qquad k_{dn} = \frac{\sin(nq\alpha/2)}{q\sin(n\alpha/2)}$`,
        [v(r`$n$`, 'harmonic order'), v(r`$\beta$`, 'short-pitch angle, 180° minus the coil span (electrical)'), v(r`$q$`, 'slots per pole per phase'), v(r`$\alpha$`, 'slot angle, electrical')],
        'How much of each harmonic a winding picks up: short pitching and distribution suppress harmonics.',
        'A short pitch of 180°/n wipes out the nth harmonic: β = 36° removes the 5th.'),
    P(SGP, null, 'Synchronous Impedance', r`$Z_s = R_a + jX_s$`, r`$Z_s = R_a + jX_s,\qquad X_s = X_l + X_{ar}$`,
        [v(r`$R_a$`, 'armature resistance per phase', OHM), v(r`$X_l$`, 'leakage reactance', OHM), v(r`$X_{ar}$`, 'reactance standing for armature reaction', OHM)],
        'A cylindrical-rotor machine per phase: an EMF behind its synchronous impedance.',
        'R_a is usually small next to X_s and often neglected.', OHM),
    // Voltage Regulation
    P(VREG, null, 'Generated EMF by Phasors', r`$\mathbf{E} = \mathbf{V} + \mathbf{I}(R_a + jX_s)$`, r`$\mathbf{E} = \mathbf{V} + \mathbf{I}(R_a + jX_s)\quad (\text{generator, per phase})$`,
        [VPH, v(r`$\mathbf{I}$`, 'armature current at the load angle', A_), v(r`$R_a, X_s$`, 'armature resistance and synchronous reactance', OHM)],
        'The excitation EMF an alternator needs to hold V at a given load: the synchronous-impedance method.',
        'Lagging load: E much larger than V. Leading load can make E LESS than V, so regulation goes negative.', V_),
    P(VREG, null, 'Synchronous Impedance from Tests', r`$Z_s = \frac{E_{oc}}{I_{sc}}$`, r`$Z_s = \frac{E_{oc}}{I_{sc}}\ (\text{same field current}),\qquad X_s = \sqrt{Z_s^2 - R_a^2}$`,
        [v(r`$E_{oc}$`, 'open-circuit phase voltage at a field current', V_), v(r`$I_{sc}$`, 'short-circuit armature current at that field current', A_), v(r`$R_a$`, 'armature resistance (dc test, often ×1.2 for ac)', OHM)],
        'Synchronous impedance from the open- and short-circuit characteristics.',
        'Take both at the SAME field current, in the unsaturated range; phase values, not line.', OHM),
    P(VREG, null, 'Short-Circuit Ratio', r`$\text{SCR} = \frac{I_{f,oc}}{I_{f,sc}}$`, r`$\text{SCR} = \frac{I_{f}(\text{rated } V \text{ on open circuit})}{I_{f}(\text{rated } I \text{ on short circuit})} \approx \frac{1}{X_{s,pu}}$`,
        [v(r`$I_f$`, 'field current', A_), v(r`$X_{s,pu}$`, 'unsaturated synchronous reactance, per unit')],
        'A quick measure of an alternator\'s stiffness: a high SCR means low reactance and better regulation.',
        'Hydro generators have higher SCR than turbo generators.'),
    // Parallel Operation of Alternators
    P(PAR, null, 'Power-Angle Equation', r`$P = \frac{3EV}{X_s}\sin\delta$`, r`$P = \frac{3EV}{X_s}\sin\delta,\qquad Q = \frac{3V(E\cos\delta - V)}{X_s}\quad (\text{per-phase } E, V)$`,
        [EPH, VPH, XS, DELTA],
        'The real and reactive power of a round-rotor machine on a bus, with R_a neglected.',
        'Maximum (steady-state limit) at δ = 90°. Overexcited (E cos δ > V) the machine supplies vars.', W_),
    P(PAR, null, 'Salient-Pole Power-Angle Equation', r`$P = \frac{EV}{X_d}\sin\delta + (\dots)\sin2\delta$`, r`$P =\frac{EV}{X_d}\sin\delta + \frac{V^2}{2}\left(\frac{1}{X_q} - \frac{1}{X_d}\right)\sin2\delta\quad (\text{per phase})$`,
        [EPH, VPH, v(r`$X_d, X_q$`, 'direct- and quadrature-axis reactances', OHM), DELTA],
        'A salient-pole machine adds reluctance power, which exists even with no field.',
        'Its maximum comes before δ = 90°.', W_),
    P(PAR, null, 'Synchronizing Power', r`$P_s = \frac{3EV}{X_s}\cos\delta$`, r`$P_s = \frac{dP}{d\delta} = \frac{3EV}{X_s}\cos\delta\quad (\text{per radian})$`,
        [EPH, VPH, XS, DELTA],
        'The restoring power per radian of swing that pulls a machine back into step.',
        'It falls to zero at δ = 90°: past there the machine pulls out of step.', W_),
    P(PAR, null, 'Load Sharing by Speed Droop', r`$f = f_{nl} - S_PP$`, r`$f = f_{nl,i} - S_{P,i}P_i \ (\text{each unit}),\qquad \sum P_i = P_{load}$`,
        [v(r`$f_{nl}$`, 'no-load frequency set on the governor', r`$\text{Hz}$`), v(r`$S_P$`, 'droop slope', r`$\text{Hz/MW}$`), v(r`$P_i$`, 'unit output', r`$\text{MW}$`)],
        'Paralleled alternators run at one frequency; each governor\'s droop line then sets its share.',
        'Raising a unit\'s governor setpoint shifts load onto it; raising its field only changes its vars.', r`$\text{Hz}$`),
    P(PAR, null, 'Synchronizing Current Between Alternators', r`$I_c = \frac{E_1 - E_2}{Z_1 + Z_2}$`, r`$\mathbf{I}_c = \frac{\mathbf{E}_1 - \mathbf{E}_2}{Z_{s1} + Z_{s2}}$`,
        [v(r`$\mathbf{E}_1, \mathbf{E}_2$`, 'the two EMFs (phasors)', V_), v(r`$Z_{s1}, Z_{s2}$`, 'their synchronous impedances', OHM)],
        'The current that circulates between paralleled alternators whose EMFs differ in size or phase.',
        'A phase difference makes real synchronizing power; a size difference only circulates vars.', A_),
    // Synchronous Motors and V-Curves
    P(SM, null, 'Synchronous Motor EMF', r`$\mathbf{E} = \mathbf{V} - \mathbf{I}(R_a + jX_s)$`, r`$\mathbf{E} = \mathbf{V} - \mathbf{I}(R_a + jX_s)\quad (\text{motor, per phase})$`,
        [VPH, v(r`$\mathbf{I}$`, 'armature current drawn', A_), v(r`$R_a, X_s$`, 'armature resistance and synchronous reactance', OHM)],
        'The back EMF of a synchronous motor: the motor form of the alternator equation.',
        'E lags V by the load angle δ; more load, larger δ, same speed.', V_),
    P(SM, null, 'Pull-Out Power and Torque', r`$P_{\max} = \frac{3EV}{X_s}$`, r`$P_{\max} = \frac{3EV}{X_s},\qquad T_{\max} = \frac{P_{\max}}{\omega_s}$`,
        [EPH, VPH, XS, WS],
        'The largest load a synchronous motor can carry before it falls out of step.',
        'More field current (larger E) raises the pull-out torque.', W_),
    P(SM, null, 'Excitation for Unity Power Factor', r`$E = \sqrt{V^2 + (IX_s)^2}$`, r`$I = \frac{P}{3V},\qquad E = \sqrt{V^2 + (IX_s)^2}\quad (R_a \text{ neglected})$`,
        [v(r`$P$`, 'motor input power', W_), VPH, XS],
        'The EMF at the bottom of a V-curve, where the armature current is least.',
        'Less excitation: lagging and more current. More: leading and more current. Hence the V.', V_),
    // Power Factor Correction with Synchronous Machines
    P(PFC, null, 'Overexcited Motor Correcting a Plant', r`$Q_m = Q_{load} - P_{tot}\tan\theta_2$`, r`$P_{tot} = P_{load} + P_m,\quad Q_m = Q_{load} - P_{tot}\tan\theta_2,\quad S_m = \sqrt{P_m^2 + Q_m^2}$`,
        [v(r`$P_m$`, 'real power the motor draws', W_), v(r`$Q_m$`, 'leading vars the motor supplies', r`$\text{var}$`), v(r`$\theta_2$`, 'target power-factor angle of the plant')],
        'A synchronous motor that drives its own load and also supplies the plant\'s vars.',
        'Size the motor by its kVA, S_m, not its kW; its power factor is P_m/S_m, leading.', r`$\text{VA}$`),
    // Induction Motor Slip and Torque
    P(IMST, null, 'Torque-Slip Equation', r`$T = \frac{3V^2R_2/s}{\omega_s[(R_1 + R_2/s)^2 + X^2]}$`, r`$T = \frac{3V^2(R_2/s)}{\omega_s\left[(R_1 + R_2/s)^2 + (X_1 + X_2)^2\right]}$`,
        [VPH, v(r`$R_1$`, 'stator resistance', OHM), R2, XEQ, SLIP, WS],
        'Induction motor torque at any slip, from the approximate equivalent circuit.',
        'Near synchronous speed T is about proportional to s; near standstill about 1/s.', NM),
    P(IMST, null, 'Slip at Maximum Torque', r`$s_{mT} = \frac{R_2}{\sqrt{R_1^2 + (X_1 + X_2)^2}}$`, r`$s_{mT} = \frac{R_2}{\sqrt{R_1^2 + (X_1 + X_2)^2}} \approx \frac{R_2}{X_2}$`,
        [R2, v(r`$R_1$`, 'stator resistance', OHM), XEQ],
        'The slip where torque peaks: proportional to rotor resistance.',
        'Adding rotor resistance moves the peak to higher slip without changing its height.'),
    P(IMST, null, 'Maximum (Breakdown) Torque', r`$T_{\max} \propto \frac{V^2}{R_1 + \sqrt{R_1^2 + X^2}}$`, r`$T_{\max} = \frac{3V^2}{2\omega_s\left[R_1 + \sqrt{R_1^2 + (X_1 + X_2)^2}\right]}$`,
        [VPH, v(r`$R_1$`, 'stator resistance', OHM), XEQ, WS],
        'The pull-out torque of an induction motor.',
        'It does NOT depend on R₂, and varies with V²: a 10% voltage dip costs 19% of it.', NM),
    P(IMST, null, 'Torque Ratio to Maximum (Kloss)', r`$\frac{T}{T_{\max}} = \frac{2}{s/s_m + s_m/s}$`, r`$\frac{T}{T_{\max}} = \frac{2}{s/s_m + s_m/s};\qquad \frac{T_{st}}{T_{\max}} = \frac{2s_m}{1 + s_m^2}\quad (R_1 \text{ neglected})$`,
        [SLIP, v(r`$s_m$`, 'slip at maximum torque')],
        'Torque at any slip as a fraction of breakdown torque, from the slip of maximum torque.',
        'Put s = 1 for the starting torque ratio.'),
    // Equivalent Circuit
    P(EQC, null, 'Induction Motor Power Flow', r`$P_g : P_{rcl} : P_m = 1 : s : (1 - s)$`, r`$P_{in} = P_{scl} + P_{core} + P_g,\qquad P_g : P_{rcl} : P_m = 1 : s : (1 - s),\qquad P_{out} = P_m - P_{f\&w}$`,
        [v(r`$P_g$`, 'air-gap power', W_), v(r`$P_{rcl}$`, 'rotor copper loss', W_), v(r`$P_m$`, 'developed mechanical power', W_), SLIP],
        'Where an induction motor\'s input power goes, from the supply to the shaft.',
        'Rotor efficiency is at most (1 − s): high-slip operation wastes power in the rotor.'),
    P(EQC, null, 'Air-Gap Power and Induced Torque', r`$P_g = 3I_2^2\frac{R_2}{s},\ T = \frac{P_g}{\omega_s}$`, r`$P_g = 3I_2^2\frac{R_2}{s},\qquad T_{ind} = \frac{P_g}{\omega_s} = \frac{P_m}{\omega_m}$`,
        [v(r`$I_2$`, 'rotor current referred to the stator', A_), R2, SLIP, WS],
        'The power crossing the air gap, and the torque it makes.',
        'Divide P_g by SYNCHRONOUS speed, or P_m by actual rotor speed: both give the same torque.', W_),
    P(EQC, null, 'Stator Thévenin Equivalent', r`$V_{th} = V\frac{X_m}{\sqrt{R_1^2 + (X_1 + X_m)^2}}$`, r`$\mathbf{V}_{th} = \mathbf{V}\frac{jX_m}{R_1 + j(X_1 + X_m)},\qquad Z_{th} = \frac{jX_m(R_1 + jX_1)}{R_1 + j(X_1 + X_m)}$`,
        [VPH, v(r`$R_1, X_1$`, 'stator resistance and leakage reactance', OHM), v(r`$X_m$`, 'magnetizing reactance', OHM)],
        'The stator side reduced to one source and impedance, so the torque formulas hold exactly.',
        'Use V_th, R_th and X_th in place of V, R₁ and X₁ in the torque equations.', V_),
    // Starting Methods
    P(START, null, 'Star-Delta Starting', r`$I_{L,Y} = \tfrac13I_{L,\Delta}$`, r`$\frac{I_{L,Y}}{I_{L,\Delta}} = \frac{T_{st,Y}}{T_{st,\Delta}} = \frac13$`,
        [v(r`$I_L$`, 'line current at start', A_), v(r`$T_{st}$`, 'starting torque', NM)],
        'Starting a delta motor in star cuts line current and torque to a third.',
        'Only for motors that run in delta; check the reduced torque still starts the load.'),
    P(START, null, 'Autotransformer Starting', r`$I_L = x^2I_{st},\ T = x^2T_{st}$`, r`$I_{motor} = xI_{st},\qquad I_{line} = x^2I_{st},\qquad T = x^2T_{st}$`,
        [v(r`$x$`, 'tap ratio, fraction of line voltage applied'), v(r`$I_{st}, T_{st}$`, 'direct-on-line starting current and torque')],
        'A reduced-voltage start through an autotransformer: line current and torque both fall as x².',
        'The motor current falls only as x; the line current as x² because the autotransformer steps it down.'),
    P(START, null, 'Starting Torque from Starting Current', r`$\frac{T_{st}}{T_{fl}} = (\frac{I_{st}}{I_{fl}})^2s_{fl}$`, r`$\frac{T_{st}}{T_{fl}} = \left(\frac{I_{st}}{I_{fl}}\right)^2s_{fl}$`,
        [v(r`$I_{st}, I_{fl}$`, 'starting and full-load currents', A_), v(r`$s_{fl}$`, 'full-load slip')],
        'The starting torque as a multiple of full-load torque, from T ∝ I²R₂/s.',
        'With reduced voltage, I_st falls in proportion and T_st as its square.'),
    P(START, null, 'Rotor Resistance for Maximum Starting Torque', r`$R_2 + R_{ext} = \sqrt{R_1^2 + (X_1 + X_2)^2}$`, r`$R_2 + R_{ext} = \sqrt{R_1^2 + (X_1 + X_2)^2} \approx X_2\quad (s_{mT} = 1)$`,
        [R2, v(r`$R_{ext}$`, 'external rotor resistance per phase (wound rotor), referred', OHM), XEQ],
        'The external rotor resistance that makes a wound-rotor motor start at its breakdown torque.',
        'Referred to the stator; divide by a² for the actual slip-ring resistor.', OHM),
    // Speed Control
    P(SPEED, null, 'Constant V/f Speed Control', r`$\frac{V}{f} = \text{const}$`, r`$N_s = \frac{120f}{P},\qquad \frac{V_2}{V_1} = \frac{f_2}{f_1}\ (\text{constant flux})$`,
        [v(r`$f$`, 'supply frequency from the drive', r`$\text{Hz}$`), v(r`$V$`, 'supply voltage', V_)],
        'A variable-frequency drive changes speed by frequency, and voltage with it to keep the flux.',
        'At low speed a boost is added because stator resistance takes a larger share of V.'),
    P(SPEED, null, 'Rotor Resistance Speed Control', r`$\frac{s_2}{s_1} = \frac{R_{2}'}{R_2}$`, r`$\frac{s_2}{s_1} = \frac{R_2 + R_{ext}}{R_2}\quad (\text{same torque, low-slip region})$`,
        [R2, v(r`$R_{ext}$`, 'added rotor resistance', OHM), v(r`$s_1, s_2$`, 'slips before and after')],
        'Adding rotor resistance raises the slip in proportion, at the same torque.',
        'Cheap but wasteful: the extra slip power is burned in the resistors.'),
    P(SPEED, null, 'Voltage Speed Control', r`$s \propto \frac{1}{V^2}$`, r`$T \propto sV^2\ (\text{low slip}) \implies \frac{s_2}{s_1} = \left(\frac{V_1}{V_2}\right)^2\ (\text{same torque})$`,
        [SLIP, v(r`$V$`, 'stator voltage', V_)],
        'Lowering the stator voltage raises the slip, for fans and pumps.',
        'Torque capacity falls as V², so only light, speed-sensitive loads suit it.'),
    // Single-Phase Motors
    P(SPH, null, 'Forward and Backward Slip', r`$s_b = 2 - s$`, r`$s_f = s,\qquad s_b = 2 - s$`,
        [SLIP],
        'A single-phase field is two fields turning opposite ways; the rotor slips 2 − s against the backward one.',
        'At standstill both slips are 1 and the torques cancel: no starting torque without an auxiliary winding.'),
    P(SPH, null, 'Capacitor for a 90° Phase Split', r`$X_C = X_a + \frac{R_aR_m}{X_m}$`, r`$X_C = X_a + \frac{R_aR_m}{X_m}\quad (\text{auxiliary current leads main by } 90°)$`,
        [v(r`$R_m, X_m$`, 'main winding resistance and reactance', OHM), v(r`$R_a, X_a$`, 'auxiliary winding resistance and reactance', OHM)],
        'The starting capacitor reactance that puts the two winding currents 90° apart.',
        'C = 1/(2πf X_C). At 90° the two windings make a nearly round rotating field.', OHM),
    // Special Machines
    P(SPEC, null, 'Stepper Motor Step Angle and Speed', r`$\theta = \frac{360°}{\text{steps/rev}}$`, r`$\text{VR: } \theta = \frac{N_s - N_r}{N_sN_r}360°;\quad \text{hybrid: } \theta = \frac{360°}{2mN_r};\quad n = \frac{\theta f_p}{6}\ \text{rpm}$`,
        [v(r`$N_s, N_r$`, 'stator and rotor teeth (variable reluctance)'), v(r`$m$`, 'phases'), v(r`$f_p$`, 'pulse rate, steps per second'), v(r`$\theta$`, 'step angle, degrees')],
        'How far a stepper turns per pulse, and its speed from the pulse rate.',
        'A two-phase hybrid with 50 rotor teeth: 1.8° per step, 200 steps per revolution.'),
    // Machine Testing and Efficiency
    P(TEST, null, 'Induction Motor No-Load and Blocked-Rotor Tests', r`$R_1 + R_2 = \frac{P_{br}}{3I_{br}^2}$`, r`$\text{blocked: } R_1 + R_2 = \frac{P_{br}}{3I_{br}^2},\ |Z| = \frac{V_{br}}{\sqrt3I_{br}};\quad \text{no load: } P_{nl} - 3I_{nl}^2R_1 = P_{core} + P_{f\&w}$`,
        [v(r`$P_{br}, I_{br}, V_{br}$`, 'blocked-rotor power, line current, line voltage'), v(r`$P_{nl}, I_{nl}$`, 'no-load power and current')],
        'The equivalent circuit of an induction motor from two tests, like a transformer\'s.',
        'R₁ comes from a dc test; R₂ is what is left. X₁ and X₂ are usually split by motor class.', OHM),
    P(TEST, null, 'Slip Test for X_d and X_q', r`$X_d = \frac{V_{max}}{I_{min}}$`, r`$X_d = \frac{V_{\max}}{I_{\min}},\qquad X_q = \frac{V_{\min}}{I_{\max}}\quad (\text{per phase})$`,
        [v(r`$V, I$`, 'armature voltage and current as the rotor slips slowly, field open')],
        'Direct- and quadrature-axis reactances of a salient-pole machine from one slow-slip test.',
        'X_d is the larger: the field poles line up with the d axis.', OHM),
];

module.exports = { subject: 'EE', topic: 'Electrical Machinery 2', migration: '20261231000000_cards_electrical_machinery_2', file, revisions, retire, drafts };
