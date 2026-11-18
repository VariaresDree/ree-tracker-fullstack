'use strict';

// EE › Electrical Machinery 1 formula cards (Library round, 2026-11-18): 12
// live cards for 14 subtopics, all correct, filed as they are. This file adds
// the rest: stacking factor, fringing and parallel magnetic paths; peak core
// flux density, rated currents and exciting-current parts; impedances
// referred to one side and per unit; exact and approximate regulation,
// copper loss at any load and all-day efficiency; open- and short-circuit
// test parameters; autotransformer power split, reconnected rating and copper
// saving; three-phase connection ratios and open delta; parallel load sharing
// and circulating current; DC generator EMF ratio, currents, compound
// voltage, critical field resistance and regulation; armature-reaction
// ampere-turns and reactance voltage; DC motor torque, series-motor torque,
// developed power and the maximum-power condition; starting resistance and
// starter steps; DC machine maximum efficiency and Swinburne's test. Reluctance
// and air-gap circuits are in Electromagnetism; alternators and induction
// motors in Machinery 2. See mathematics/algebra.js for the format;
// tests/electricalMachinery1Formulas.test.js checks each with phasors,
// simulated tests, or a simulated starter and field build-up.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const MC = 'Magnetic Circuits';
const TP = 'Transformer Principles and EMF Equation';
const EQC = 'Equivalent Circuit';
const REG = 'Regulation and Efficiency';
const TEST = 'Open and Short Circuit Tests';
const AUTO = 'Autotransformers';
const TPH = 'Three-Phase Connections';
const PAR = 'Parallel Operation';
const GENP = 'DC Generator Principles';
const GENC = 'DC Generator Characteristics';
const ARM = 'Armature Reaction and Commutation';
const MOT = 'DC Motor Torque and Speed';
const START = 'DC Motor Starting and Control';
const LOSS = 'Losses and Efficiency';

const file = [
    ['ccec2334-c4b9-4ee9-b1cd-036d853a9429', TP, null], // Transformer EMF Equation
    ['81af1827-bb2a-454f-b4a5-f96979fbce7a', TP, null], // Transformer Turns Ratio
    ['a45ba6d8-f27e-48f1-88ff-436ed5afb670', EQC, null], // Referred Impedance
    ['d15201e6-97e6-4ad8-897e-003e677ab669', REG, null], // Transformer Voltage Regulation
    ['584e6b79-4b33-4fe0-a5fc-154e8ae2eccf', REG, null], // Transformer Efficiency
    ['27483061-8c26-4b43-8367-5c716c354271', REG, null], // Load Fraction for Maximum Efficiency
    ['9c198602-8fa0-4672-9c38-156b5e4e5b4b', GENP, null], // Generated EMF of a DC Machine
    ['155c879b-2620-4044-8ff5-8302f53e86f2', GENC, null], // DC Generator Terminal Voltage
    ['14548778-4a84-4bbb-9e5f-048a1d5ac7af', MOT, null], // DC Motor Back EMF
    ['8fd18769-5497-4ed9-a8c1-0f520f65af6b', MOT, null], // DC Motor Speed Relation
    ['2955d670-2f3e-4206-80c8-81b5477870f8', MOT, null], // Torque from Power and Speed
    ['fe3267b6-09cd-4955-ad55-51a818439912', MOT, null], // Speed Regulation
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const W_ = r`$\text{W}$`;
const OHM = r`$\Omega$`;
const VA = r`$\text{VA}$`;
const AT = r`$\text{At}$`;
const A_RATIO = v(r`$a$`, 'turns ratio N₁/N₂');
const IA = v(r`$I_a$`, 'armature current', A_);
const RA = v(r`$R_a$`, 'armature resistance', OHM);

const drafts = [
    // Magnetic Circuits
    P(MC, null, 'Stacking Factor', r`$A_{net} = k_sA_{gross}$`, r`$A_{net} = k_sA_{gross},\qquad B = \frac{\Phi}{k_sA_{gross}}$`,
        [v(r`$k_s$`, 'stacking factor, about 0.9 to 0.95 for laminations'), v(r`$A_{gross}$`, 'core cross-section measured over the stack', r`$\text{m}^2$`)],
        'The iron area of a laminated core: the insulation between sheets carries no flux.',
        'Use the NET area for flux density in the iron, the gross area for the air gap.', r`$\text{m}^2$`),
    P(MC, null, 'Fringing at an Air Gap', r`$A_g \approx (a + g)(b + g)$`, r`$A_g \approx (a + g)(b + g),\qquad B_g = \frac{\Phi}{A_g}$`,
        [v(r`$a, b$`, 'pole-face dimensions', r`$\text{m}$`), v(r`$g$`, 'gap length', r`$\text{m}$`)],
        'Flux bulges out at a gap, so the gap\'s effective area is larger than the pole face.',
        'Fringing LOWERS the gap flux density and the ampere-turns the gap needs.', r`$\text{m}^2$`),
    P(MC, null, 'Magnetic Circuit with Parallel Paths', r`$\mathcal{F} = \Phi_c\mathcal{R}_{eq}$`, r`$\mathcal{F} = \Phi_c\mathcal{R}_{eq},\quad \mathcal{R}_{eq} = \mathcal{R}_c + \frac{\mathcal{R}_1\mathcal{R}_2}{\mathcal{R}_1 + \mathcal{R}_2},\quad \Phi_1\mathcal{R}_1 = \Phi_2\mathcal{R}_2$`,
        [v(r`$\mathcal{R}_c$`, 'reluctance of the leg carrying the coil', r`$\text{At/Wb}$`), v(r`$\mathcal{R}_1, \mathcal{R}_2$`, 'reluctances of the two outer paths', r`$\text{At/Wb}$`), v(r`$\Phi_c$`, 'flux in the centre leg, Φ₁ + Φ₂', r`$\text{Wb}$`)],
        'A shell-type core: reluctances combine like resistors, and the outer legs split the centre flux.',
        'The two outer legs have the SAME mmf across them; the flux divides inversely as their reluctance.', AT),
    // Transformer Principles
    P(TP, null, 'Peak Core Flux Density', r`$B_m = \frac{V}{4.44fNA}$`, r`$B_m = \frac{V}{4.44fNA},\qquad \Phi_m = \frac{V}{4.44fN}$`,
        [v(r`$V$`, 'RMS winding voltage', V_), v(r`$f$`, 'frequency', r`$\text{Hz}$`), v(r`$N$`, 'turns'), v(r`$A$`, 'net core area', r`$\text{m}^2$`)],
        'How hard the core is worked: the flux the applied voltage forces through it.',
        'Flux follows V/f: 60 Hz equipment on 50 Hz at the same voltage runs 20% more flux, and hotter.', r`$\text{T}$`),
    P(TP, null, 'Transformer Rated Currents', r`$I = \frac{S}{V}$`, r`$I_1 = \frac{S}{V_1},\ I_2 = \frac{S}{V_2}\ (\text{single phase});\qquad I_L = \frac{S}{\sqrt3V_L}\ (\text{three phase})$`,
        [v(r`$S$`, 'rated apparent power', VA), v(r`$V$`, 'rated voltage of that winding', V_)],
        'The full-load current of each winding from the nameplate.',
        'The low-voltage winding carries the larger current: a 10 kVA, 2400/240 V unit carries 4.17 A and 41.7 A.', A_),
    P(TP, null, 'Exciting Current Components', r`$I_0 = \sqrt{I_c^2 + I_m^2}$`, r`$I_c = I_0\cos\theta_0,\quad I_m = I_0\sin\theta_0,\quad P_0 = V_1I_0\cos\theta_0$`,
        [v(r`$I_0$`, 'no-load (exciting) current', A_), v(r`$I_c$`, 'core-loss component, in phase with V', A_), v(r`$I_m$`, 'magnetizing component, lagging 90°', A_)],
        'The no-load current splits into a part that supplies core loss and a part that magnetizes the core.',
        'The magnetizing part is much the larger: no-load power factor is low, about 0.1 to 0.3.', A_),
    // Equivalent Circuit
    P(EQC, null, 'Equivalent Impedance Referred to One Side', r`$Z_{eq1} = Z_1 + a^2Z_2$`, r`$R_{eq1} = R_1 + a^2R_2,\quad X_{eq1} = X_1 + a^2X_2;\qquad Z_{eq2} = \frac{Z_{eq1}}{a^2}$`,
        [v(r`$R_1, X_1$`, 'primary winding resistance and reactance', OHM), v(r`$R_2, X_2$`, 'secondary winding resistance and reactance', OHM), A_RATIO],
        'Both windings\' series impedances lumped on one side, for the approximate equivalent circuit.',
        'The magnetizing branch is moved to the terminals in the approximate circuit; it changes the answer very little.', OHM),
    P(EQC, null, 'Per-Unit Impedance of a Transformer', r`$Z_{pu} = \frac{Z_{eq}S}{V^2}$`, r`$Z_{pu} = \frac{Z_{eq}}{Z_{base}} = \frac{Z_{eq}S}{V^2} = \frac{I_{rated}Z_{eq}}{V}$`,
        [v(r`$Z_{eq}$`, 'equivalent impedance referred to the side of V', OHM), v(r`$S$`, 'rating', VA), v(r`$V$`, 'rated voltage of that side', V_)],
        'A transformer\'s impedance as a fraction of its base: the same number from either side.',
        'Z_pu is also the voltage that circulates rated current in the short-circuit test, as a fraction of rated voltage.'),
    // Regulation and Efficiency
    P(REG, null, 'Regulation by Phasor Sum', r`$\mathbf{V}_{NL} = \mathbf{V} + \mathbf{I}Z_{eq}$`, r`$\mathbf{V}_{NL} = \mathbf{V} + \mathbf{I}(R_{eq} + jX_{eq}),\qquad \text{VR} = \frac{|\mathbf{V}_{NL}| - V}{V}$`,
        [v(r`$\mathbf{V}$`, 'full-load terminal voltage (reference)', V_), v(r`$\mathbf{I}$`, 'load current, at the load\'s power-factor angle', A_), v(r`$R_{eq}, X_{eq}$`, 'equivalent impedance on that side', OHM)],
        'The exact regulation: the voltage needed at no load to give rated voltage at full load.',
        'Lagging current: I = I∠−θ. A leading load can make the regulation negative.'),
    P(REG, null, 'Approximate Regulation', r`$\text{VR} \approx r\cos\theta \pm x\sin\theta$`, r`$\text{VR} \approx \frac{IR_{eq}\cos\theta \pm IX_{eq}\sin\theta}{V} = r\cos\theta \pm x\sin\theta\ (\text{pu})$`,
        [v(r`$r, x$`, 'per-unit equivalent resistance and reactance'), v(r`$\theta$`, 'load power-factor angle'), v(r`$\pm$`, '+ for lagging, − for leading')],
        'The quick regulation formula used in most board problems.',
        'Within a few tenths of a percent of the phasor answer for normal transformers.'),
    P(REG, null, 'Copper Loss at Any Load', r`$P_{cu} = x^2P_{cu,FL}$`, r`$P_{cu} = x^2P_{cu,FL},\qquad x = \frac{S}{S_{rated}}$`,
        [v(r`$x$`, 'fraction of full load'), v(r`$P_{cu,FL}$`, 'full-load copper loss (short-circuit test at rated current)', W_)],
        'Copper loss grows with the square of the load; core loss stays the same.',
        'At half load the copper loss is a QUARTER of full-load copper loss.', W_),
    P(REG, null, 'All-Day Efficiency', r`$\eta_{AD} = \frac{W_{out}}{W_{in}}\ (24\text{ h})$`, r`$\eta_{AD} = \frac{W_{out}}{W_{out} + 24P_c + \sum x_k^2P_{cu,FL}t_k}\quad (\text{energies over 24 h})$`,
        [v(r`$W_{out}$`, 'energy delivered in the day', r`$\text{kWh}$`), v(r`$P_c$`, 'core loss, present all day', r`$\text{kW}$`), v(r`$x_k, t_k$`, 'load fraction and its hours')],
        'Efficiency on energy over a day, for distribution transformers that are lightly loaded most of the time.',
        'Core loss counts for all 24 hours, even at no load; that is why distribution transformers have low core loss.'),
    // Open and Short Circuit Tests
    P(TEST, null, 'Open-Circuit Test Parameters', r`$R_c = \frac{V^2}{P_{oc}},\ X_m = \frac{V}{I_m}$`, r`$I_c = \frac{P_{oc}}{V},\quad I_m = \sqrt{I_{oc}^2 - I_c^2},\quad R_c = \frac{V}{I_c} = \frac{V^2}{P_{oc}},\quad X_m = \frac{V}{I_m}$`,
        [v(r`$V$`, 'rated voltage, applied to the low side', V_), v(r`$I_{oc}$`, 'no-load current', A_), v(r`$P_{oc}$`, 'wattmeter reading = core loss', W_)],
        'The magnetizing branch from the no-load test.',
        'The open-circuit test gives CORE loss; done at rated voltage on the low-voltage side for convenience.', OHM),
    P(TEST, null, 'Short-Circuit Test Parameters', r`$R_{eq} = \frac{P_{sc}}{I_{sc}^2}$`, r`$Z_{eq} = \frac{V_{sc}}{I_{sc}},\quad R_{eq} = \frac{P_{sc}}{I_{sc}^2},\quad X_{eq} = \sqrt{Z_{eq}^2 - R_{eq}^2}$`,
        [v(r`$V_{sc}$`, 'voltage that drives rated current, a few % of rated', V_), v(r`$I_{sc}$`, 'test current (rated)', A_), v(r`$P_{sc}$`, 'wattmeter reading = full-load copper loss', W_)],
        'The series impedance from the short-circuit test, referred to the side the meters are on.',
        'Done on the high-voltage side at reduced voltage; the core loss is negligible because the flux is so small.', OHM),
    // Autotransformers
    P(AUTO, null, 'Autotransformer Power Split', r`$S_{ind} = S\left(1 - \frac{V_L}{V_H}\right)$`, r`$S_{cond} = S\frac{V_L}{V_H},\qquad S_{ind} = S\left(1 - \frac{V_L}{V_H}\right)$`,
        [v(r`$S$`, 'throughput power', VA), v(r`$V_H, V_L$`, 'high- and low-side voltages', V_)],
        'An autotransformer passes part of its power straight through by conduction; only the rest is transformed.',
        'The closer the two voltages, the less is transformed: hence small, cheap autotransformers for small ratios.', VA),
    P(AUTO, null, 'Reconnected Two-Winding Transformer Rating', r`$S_{auto} = S_w\left(1 + \frac{V_c}{V_s}\right)$`, r`$S_{auto} = S_w\left(1 + \frac{V_c}{V_s}\right)$`,
        [v(r`$S_w$`, 'two-winding rating', VA), v(r`$V_s$`, 'voltage of the series winding', V_), v(r`$V_c$`, 'voltage of the common winding', V_)],
        'The rating of a two-winding transformer reconnected as an autotransformer, with each winding at its rated current.',
        'A 10 kVA, 2400/240 V unit as a 2640/2400 V autotransformer handles 10 × (1 + 2400/240) = 110 kVA.', VA),
    P(AUTO, null, 'Copper Saving of an Autotransformer', r`$W_{auto} = (1 - K)W_{2w}$`, r`$\frac{W_{auto}}{W_{2w}} = 1 - K,\qquad K = \frac{V_L}{V_H}$`,
        [v(r`$K$`, 'voltage ratio, low over high'), v(r`$W$`, 'copper weight')],
        'An autotransformer needs only (1 − K) of the copper of a two-winding transformer for the same job.',
        'The saving is K: large for ratios near 1, small for big step-downs.'),
    // Three-Phase Connections
    P(TPH, null, 'Three-Phase Transformer Line-Voltage Ratios', r`$\Delta\text{-Y}: V_{L2} = \frac{\sqrt3V_{L1}}{a}$`, r`$\text{Y-Y}, \Delta\text{-}\Delta: \frac{V_{L1}}{a};\quad \Delta\text{-Y}: \frac{\sqrt3V_{L1}}{a};\quad \text{Y-}\Delta: \frac{V_{L1}}{\sqrt3a}$`,
        [v(r`$V_{L1}$`, 'primary line voltage', V_), v(r`$a$`, 'turns ratio of each single-phase unit (phase to phase)')],
        'Secondary line voltage for each connection of three single-phase units.',
        'Δ-Y and Y-Δ also shift the phase by 30°: two banks in parallel must have the same shift.', V_),
    P(TPH, null, 'Open-Delta (V-V) Capacity', r`$S_{VV} = \sqrt3\,S_{unit}$`, r`$S_{VV} = \sqrt3\,S_{unit} = 0.577\,S_{\Delta\Delta} = 0.866\,(2S_{unit})$`,
        [v(r`$S_{unit}$`, 'rating of one single-phase unit', VA), v(r`$S_{\Delta\Delta}$`, 'capacity of the closed delta, 3S_unit', VA)],
        'Two units in open delta still supply three-phase load, at 57.7% of the three-unit capacity.',
        'Each unit carries the full LINE current; only 86.6% of the two units\' combined rating is usable.', VA),
    // Parallel Operation
    P(PAR, null, 'Load Sharing of Parallel Transformers', r`$S_A = S_L\frac{Z_B}{Z_A + Z_B}$`, r`$S_A = S_L\frac{Z_B}{Z_A + Z_B},\qquad S_B = S_L\frac{Z_A}{Z_A + Z_B}\quad (\text{equal ratios; ohms on one side})$`,
        [v(r`$S_L$`, 'total load (complex)', VA), v(r`$Z_A, Z_B$`, 'equivalent impedances referred to the same side', OHM)],
        'Two transformers with equal ratios share load inversely as their impedances.',
        'Per unit on their own ratings: equal Z_pu means each takes load in proportion to its rating, which is what you want.', VA),
    P(PAR, null, 'Circulating Current of Unequal Ratios', r`$I_c = \frac{E_A - E_B}{Z_A + Z_B}$`, r`$I_c = \frac{E_A - E_B}{Z_A + Z_B}$`,
        [v(r`$E_A, E_B$`, 'open-circuit secondary voltages', V_), v(r`$Z_A, Z_B$`, 'equivalent impedances referred to the secondary', OHM)],
        'Paralleled transformers with different ratios drive a current round the loop even at no load.',
        'Even a 1% voltage difference circulates a large current, because transformer impedances are only a few percent.', A_),
    // DC Generator Principles
    P(GENP, null, 'Generated EMF at a New Speed or Flux', r`$\frac{E_2}{E_1} = \frac{N_2\Phi_2}{N_1\Phi_1}$`, r`$\frac{E_2}{E_1} = \frac{N_2\Phi_2}{N_1\Phi_1}$`,
        [v(r`$E$`, 'generated EMF', V_), v(r`$N$`, 'speed', r`$\text{rpm}$`), v(r`$\Phi$`, 'flux per pole', r`$\text{Wb}$`)],
        'A DC machine\'s EMF is proportional to speed times flux.',
        'At constant field current (unsaturated), EMF simply scales with speed.'),
    P(GENP, null, 'DC Generator Currents', r`$I_a = I_L + I_f$`, r`$\text{shunt: } I_a = I_L + I_f,\ I_f = \frac{V_t}{R_f};\qquad \text{series: } I_a = I_L = I_s$`,
        [v(r`$I_L$`, 'load current', A_), v(r`$I_f$`, 'shunt field current', A_), v(r`$R_f$`, 'shunt field circuit resistance', OHM)],
        'Where the armature current goes in shunt and series generators.',
        'In a long-shunt compound, the series field carries I_a; in a short-shunt, it carries I_L.', A_),
    P(GENP, null, 'Compound Generator Terminal Voltage', r`$V_t = E - I_a(R_a + R_s) - V_b$`, r`$\text{long shunt: } V_t = E - I_a(R_a + R_s) - V_b;\qquad \text{short shunt: } V_t = E - I_aR_a - I_LR_s - V_b$`,
        [v(r`$E$`, 'generated EMF', V_), IA, RA, v(r`$R_s$`, 'series field resistance', OHM), v(r`$V_b$`, 'brush drop, about 2 V total', V_)],
        'The terminal voltage of a compound generator with its series field and brush drop.',
        'Include the brush drop only when the problem gives one.', V_),
    // DC Generator Characteristics
    P(GENC, null, 'Critical Field Resistance', r`$R_{f,crit} = \frac{dE}{dI_f}\Big|_{0}$`, r`$R_{f,crit} = \text{slope of the air-gap line of the OCC} = \frac{E}{I_f}\ (\text{linear part})$`,
        [v(r`$E$`, 'open-circuit EMF', V_), v(r`$I_f$`, 'field current', A_)],
        'A self-excited shunt generator builds up only if its field resistance is below the slope of its magnetization curve.',
        'Failure to build up: field resistance too high, no residual flux, field connected backward, or speed too low.', OHM),
    P(GENC, null, 'DC Generator Voltage Regulation', r`$\text{VR} = \frac{V_{NL} - V_{FL}}{V_{FL}}$`, r`$\text{VR} = \frac{V_{NL} - V_{FL}}{V_{FL}} \times 100\%$`,
        [v(r`$V_{NL}, V_{FL}$`, 'terminal voltage at no load and full load, same speed and field setting', V_)],
        'How much a generator\'s voltage falls from no load to full load.',
        'Shunt generators droop the most; over-compounded generators can have NEGATIVE regulation.'),
    // Armature Reaction and Commutation
    P(ARM, null, 'Armature Reaction Ampere-Turns', r`$AT_d = \frac{ZI\beta}{360}$`, r`$AT_d = \frac{ZI\beta}{360},\qquad AT_c = ZI\left(\frac{1}{2P} - \frac{\beta}{360}\right)\quad (\text{per pole})$`,
        [v(r`$Z$`, 'total armature conductors'), v(r`$I$`, 'current per conductor, I_a/a', A_), v(r`$\beta$`, 'brush shift, mechanical degrees'), v(r`$P$`, 'poles')],
        'The demagnetizing and cross-magnetizing ampere-turns per pole when the brushes are shifted.',
        'With no brush shift there is only cross-magnetization. Use MECHANICAL degrees: electrical ÷ (P/2).', AT),
    P(ARM, null, 'Reactance Voltage in Commutation', r`$E_r = L\frac{2I}{T_c}$`, r`$E_r = L\frac{2I}{T_c}\ (\text{linear commutation}),\qquad T_c = \frac{w_b}{v_c}$`,
        [v(r`$L$`, 'inductance of the coil being commutated', r`$\text{H}$`), v(r`$I$`, 'conductor current, reversing to −I', A_), v(r`$T_c$`, 'commutation time', r`$\text{s}$`), v(r`$w_b, v_c$`, 'brush width and commutator surface speed')],
        'The self-induced voltage that opposes current reversal in a coil under the brush, causing sparking.',
        'Interpoles cancel it, carrying armature current so their help grows with load.', V_),
    // DC Motor Torque and Speed
    P(MOT, null, 'DC Motor Torque', r`$T = \frac{PZ}{2\pi a}\Phi I_a$`, r`$T = \frac{PZ}{2\pi a}\Phi I_a = K\Phi I_a = \frac{E_bI_a}{\omega}$`,
        [v(r`$P$`, 'poles'), v(r`$Z$`, 'armature conductors'), v(r`$a$`, 'parallel paths'), v(r`$\Phi$`, 'flux per pole', r`$\text{Wb}$`), IA],
        'The electromagnetic torque of a DC motor, proportional to flux times armature current.',
        'The same K appears in E = KΦω: one constant links voltage to speed and current to torque.', r`$\text{N·m}$`),
    P(MOT, null, 'Series Motor Torque and Speed', r`$T \propto I_a^2$`, r`$T \propto \Phi I_a \propto I_a^2\ (\text{unsaturated}),\qquad N \propto \frac{V - I_a(R_a + R_s)}{I_a}$`,
        [IA, v(r`$R_s$`, 'series field resistance', OHM)],
        'In a series motor the field current is the armature current: huge starting torque, speed falling with load.',
        'Never run a series motor without load: its speed rises dangerously as current and flux fall.'),
    P(MOT, null, 'Power Developed in a DC Motor', r`$P_d = E_bI_a$`, r`$P_d = E_bI_a = VI_a - I_a^2R_a = T\omega$`,
        [v(r`$E_b$`, 'back EMF', V_), IA, RA],
        'The electrical power converted to mechanical power, before rotational losses.',
        'Output (shaft) power = P_d − rotational losses.', W_),
    P(MOT, null, 'Condition for Maximum Power Developed', r`$E_b = \frac{V}{2}$`, r`$E_b = \frac{V}{2},\qquad I_a = \frac{V}{2R_a},\qquad P_{d,\max} = \frac{V^2}{4R_a}$`,
        [v(r`$V$`, 'supply voltage', V_), RA],
        'A DC motor develops its greatest power when the back EMF is half the supply voltage.',
        'Only theoretical: the efficiency there is below 50% and the current far above rating.'),
    // DC Motor Starting and Control
    P(START, null, 'Starting Resistance', r`$R_{st} = \frac{V}{I_{st}} - R_a$`, r`$R_{st} = \frac{V}{I_{st}} - R_a,\qquad I_{st} = kI_{rated}\ (k \approx 1.5\text{ to }2)$`,
        [v(r`$V$`, 'supply voltage', V_), v(r`$I_{st}$`, 'allowed starting current', A_), RA],
        'The resistance to put in series with the armature so the starting current stays safe.',
        'At standstill E_b = 0, so without it I = V/R_a, often 10 to 20 times rated current.', OHM),
    P(START, null, 'Starter Resistance Steps', r`$R_{k+1} = R_k\frac{I_2}{I_1}$`, r`$R_{k+1} = R_k\frac{I_2}{I_1},\qquad R_a = R_1\left(\frac{I_2}{I_1}\right)^n,\qquad R_1 = \frac{V}{I_1}$`,
        [v(r`$I_1, I_2$`, 'upper and lower current limits', A_), v(r`$R_k$`, 'total armature-circuit resistance on step k', OHM), v(r`$n$`, 'number of starter sections cut out')],
        'Grading a starter: each step cuts resistance when the current has fallen from I₁ to I₂.',
        'The resistances form a geometric series; n = ln(R₁/R_a) / ln(I₁/I₂), rounded up.', OHM),
    // Losses and Efficiency
    P(LOSS, null, 'Maximum Efficiency of a DC Machine', r`$I_a^2R_a = P_{const}$`, r`$I_a^2R_a = P_{const} \implies I_a = \sqrt{\frac{P_{const}}{R_a}}$`,
        [RA, v(r`$P_{const}$`, 'constant losses: core, friction, windage, shunt field', W_)],
        'A machine is most efficient at the load where its variable (copper) loss equals its constant loss.',
        'The same rule as the transformer: copper loss = core loss.', A_),
    P(LOSS, null, "Swinburne's Test", r`$P_{const} = VI_0 - I_{a0}^2R_a$`, r`$P_{const} = VI_0 - I_{a0}^2R_a;\qquad \eta = \frac{P_{in} - P_{const} - I_a^2R_a}{P_{in}}\ (\text{motor})$`,
        [v(r`$V, I_0$`, 'no-load supply voltage and current, running as a motor', V_), v(r`$I_{a0}$`, 'no-load armature current, I₀ − I_f', A_), RA],
        'The constant losses of a shunt machine from a no-load run, then its efficiency at any load.',
        'Cheap and quick, but it ignores how armature reaction changes the core loss under load.', W_),
];

module.exports = { subject: 'EE', topic: 'Electrical Machinery 1', migration: '20261230000000_cards_electrical_machinery_1', file, revisions, retire, drafts };
