'use strict';

// EE › Distribution Systems & Substation Design formula cards (Library round,
// 2026-11-19): the topic had no cards. Demand, diversity and load factor move
// in from System & Illumination Design (they are distribution load
// characteristics). This file adds: line loss against voltage; loss,
// utilization and coincidence factors and energy from load factor; uniformly
// distributed load and a feeder fed from both ends; feeder voltage drop with
// R and X; capacitor voltage rise, loss reduction and the two-thirds rule;
// step-regulator range and line-drop compensator settings; transformer
// hottest-spot temperature and aging factor; breakers per circuit by bus
// scheme; current-limiting reactor; ground potential rise, mesh voltage and
// Wenner soil resistivity; rolling-sphere protection, ground flash density
// and strikes to a line; SAIFI, SAIDI, CAIDI, ASAI, availability and
// series/parallel reliability; and the Philippine Distribution Code's power
// factor, unbalance and harmonic limits (PDC 2017: pf ≥ 0.85 lagging,
// unbalance ≤ 2.5%, THD and TDD ≤ 5%, checked against published copies).
// Grounding and arrester basics are in Power System Protection. See
// mathematics/algebra.js for the format;
// tests/distributionSubstationFormulas.test.js checks each numerically.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SYS = 'System Types and Voltages';
const LOAD = 'Load Characteristics and Factors';
const FEED = 'Primary and Secondary Feeders';
const VD = 'Voltage Drop';
const VRC = 'Voltage Regulation and Capacitors';
const DT = 'Distribution Transformers';
const BUS = 'Substation Types and Bus Schemes';
const EQ = 'Substation Equipment';
const GND = 'Substation Grounding';
const LTG = 'Lightning Protection';
const REL = 'Reliability Indices';
const PDC = 'Philippine Distribution Code';

const file = [];

// From System & Illumination Design: distribution load characteristics.
const move = [
    ['baf35d0f-a441-4649-ac9d-8ae450d0ea22', LOAD, null], // Demand Factor
    ['0d74f64c-cbd3-48f4-ad5e-66a9e6245cce', LOAD, null], // Diversity Factor
    ['12c160b7-f7ac-4b3e-aa8b-ab11aeb9e6dd', LOAD, null], // Load Factor
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const OHM = r`$\Omega$`;
const W_ = r`$\text{W}$`;
const M_ = r`$\text{m}$`;

const drafts = [
    // System Types and Voltages
    P(SYS, null, 'Line Loss and Voltage Level', r`$P_{loss} = \frac{P^2R}{V_L^2\cos^2\theta}$`, r`$P_{loss} = \frac{P^2R}{V_L^2\cos^2\theta}\ (\text{three phase, R per conductor}),\qquad P_{loss} \propto \frac{1}{V^2}$`,
        [v(r`$P$`, 'power delivered', W_), v(r`$R$`, 'resistance of each line conductor', OHM), v(r`$V_L$`, 'line voltage', V_), v(r`$\cos\theta$`, 'power factor')],
        'Why power is distributed at high voltage: for the same power the losses fall as the square of the voltage.',
        'Doubling the voltage cuts the losses to a quarter; raising the power factor helps the same way.', W_),
    // Load Characteristics and Factors
    P(LOAD, null, 'Loss Factor', r`$\text{LsF} \approx 0.3\,\text{LF} + 0.7\,\text{LF}^2$`, r`$\text{LsF} = \frac{\text{average loss}}{\text{loss at peak}} \approx 0.3\,\text{LF} + 0.7\,\text{LF}^2,\qquad \text{LF}^2 \le \text{LsF} \le \text{LF}$`,
        [v(r`$\text{LF}$`, 'load factor')],
        'How much energy is lost over a period compared with losses at peak all the time.',
        'Losses go with the square of load, so the loss factor is always below the load factor (Buller–Woodrow estimate).'),
    P(LOAD, null, 'Utilization Factor', r`$\text{UF} = \frac{D_{\max}}{S_{rated}}$`, r`$\text{UF} = \frac{\text{maximum demand}}{\text{rated system capacity}}$`,
        [v(r`$D_{\max}$`, 'maximum demand: peak load on the equipment', r`$\text{kVA}$`), v(r`$S_{rated}$`, 'rated capacity of the equipment', r`$\text{kVA}$`)],
        'How much of a transformer\'s or feeder\'s rating the peak actually uses.',
        'A low UF means oversized equipment; above 1 means it is overloaded at peak.'),
    P(LOAD, null, 'Coincidence Factor', r`$\text{CF} = \frac{1}{\text{diversity factor}}$`, r`$\text{CF} = \frac{\text{maximum demand of the group}}{\sum \text{individual maximum demands}} = \frac{1}{\text{DvF}}$`,
        [v(r`$\text{DvF}$`, 'diversity factor')],
        'The fraction of individual peaks that occur together.',
        'Diversity factor is at least 1; coincidence factor at most 1.'),
    P(LOAD, null, 'Energy from Load Factor', r`$E = \text{LF} \times P_{\max} \times T$`, r`$E = \text{LF} \times P_{\max} \times T$`,
        [v(r`$\text{LF}$`, 'load factor over the period'), v(r`$P_{\max}$`, 'peak demand', r`$\text{kW}$`), v(r`$T$`, 'period, 8760 h for a year', r`$\text{h}$`)],
        'Energy delivered over a period from its peak and load factor.',
        'Use the load factor for the same period as T.', r`$\text{kWh}$`),
    // Primary and Secondary Feeders
    P(FEED, null, 'Uniformly Distributed Load', r`$\Delta V = \frac{IR}{2},\ P_{loss} = \frac{I^2R}{3}$`, r`$\Delta V = \frac{IR}{2},\qquad P_{loss} = \frac{I^2R}{3}\quad (\text{per conductor; } I \text{ total, } R \text{ whole length})$`,
        [v(r`$I$`, 'total current taken along the feeder', A_), v(r`$R$`, 'resistance of the whole feeder length', OHM)],
        'A feeder with load spread evenly: the drop is as if it were all at the midpoint; the loss as if at one-third.',
        'Use ½ for voltage drop and ⅓ for loss: they are not the same equivalent point.'),
    P(FEED, null, 'Feeder Fed from Both Ends', r`$I_A = \sum I_k\frac{L - x_k}{L}$`, r`$I_A = \sum_k I_k\frac{L - x_k}{L}\quad (\text{equal end voltages, uniform conductor})$`,
        [v(r`$I_k$`, 'load current at distance x_k from end A', A_), v(r`$L$`, 'feeder length between the sources', M_)],
        'How the loads on a feeder between two equal sources split between the ends: like loads on a simply supported beam.',
        'The point of minimum voltage is where the current from the two ends meets.', A_),
    // Voltage Drop
    P(VD, null, 'Feeder Voltage Drop (R and X)', r`$\Delta V = I(R\cos\theta + X\sin\theta)$`, r`$\Delta V_{\phi} = I(R\cos\theta + X\sin\theta);\quad \text{3φ line: } \sqrt3\Delta V_\phi;\quad \text{1φ 2-wire: } 2I(R\cos\theta + X\sin\theta)$`,
        [v(r`$I$`, 'line current', A_), v(r`$R, X$`, 'resistance and reactance of one conductor', OHM), v(r`$\theta$`, 'power-factor angle (lagging +)')],
        'The approximate voltage drop of a feeder carrying current at a power factor.',
        'Single-phase two-wire has TWO conductors in the loop: double the one-conductor drop.', V_),
    // Voltage Regulation and Capacitors
    P(VRC, null, 'Voltage Rise from a Shunt Capacitor', r`$\%\Delta V = \frac{\text{kvar}\cdot X}{10\,\text{kV}^2}$`, r`$\%\Delta V = \frac{Q_C(\text{kvar})\,X(\Omega)}{10\,\text{kV}_{LL}^2}$`,
        [v(r`$Q_C$`, 'three-phase capacitor rating', r`$\text{kvar}$`), v(r`$X$`, 'reactance from the source to the capacitor, per phase', OHM), v(r`$\text{kV}_{LL}$`, 'line voltage', r`$\text{kV}$`)],
        'How much a shunt capacitor bank raises the voltage where it is connected.',
        'Switched banks raise voltage at peak; fixed banks can overvoltage the feeder at light load.'),
    P(VRC, null, 'Loss Reduction from a Capacitor', r`$\Delta P = \frac{R(2QQ_C - Q_C^2)}{V^2}$`, r`$\Delta P_{loss} = \frac{R(2QQ_C - Q_C^2)}{V^2}\quad (\text{three phase, } V \text{ line, } R \text{ per phase})$`,
        [v(r`$Q$`, 'reactive load downstream before correction', r`$\text{var}$`), v(r`$Q_C$`, 'capacitor rating', r`$\text{var}$`), v(r`$R$`, 'resistance between source and capacitor', OHM)],
        'Real-power loss saved by supplying vars locally instead of through the feeder.',
        'The saving peaks when Q_C = Q; overcompensating starts to add loss again.', W_),
    P(VRC, null, 'Two-Thirds Rule for Capacitors', r`$Q_C = \tfrac23Q,\ x = \tfrac23L$`, r`$Q_C = \tfrac23Q_{total},\qquad x = \tfrac23L\ \text{from the source}\quad (\text{uniform reactive load})$`,
        [v(r`$Q_{total}$`, 'total reactive load along the feeder', r`$\text{var}$`), v(r`$L$`, 'feeder length', M_)],
        'For a feeder with evenly spread load, one capacitor of two-thirds the vars at two-thirds the length cuts losses the most.',
        'It removes 8/9 of the reactive-current losses.', r`$\text{var}$`),
    P(VRC, null, 'Step-Voltage Regulator Range', r`$V_{out} = V_{in}(1 \pm 0.00625n)$`, r`$V_{out} = V_{in}(1 \pm 0.00625n),\quad n = 0\ldots16\ (\pm10\%\text{ in 32 steps})$`,
        [v(r`$n$`, 'tap position'), v(r`$V_{in}$`, 'regulator input voltage', V_)],
        'A standard feeder regulator changes voltage in 5/8% steps, 16 raise and 16 lower.',
        'Its kVA rating is only the 10% it adds: a regulator handles about ten times its rating of load.', V_),
    P(VRC, null, 'Line-Drop Compensator Setting', r`$R_{set} = \frac{I_{CT,pri}}{N_{PT}}R_{line}$`, r`$R_{set} = \frac{I_{CT,pri}}{N_{PT}}R_{line},\qquad X_{set} = \frac{I_{CT,pri}}{N_{PT}}X_{line}\quad (\text{volts})$`,
        [v(r`$I_{CT,pri}$`, 'CT primary rating', A_), v(r`$N_{PT}$`, 'PT ratio'), v(r`$R_{line}, X_{line}$`, 'feeder impedance to the regulation point', OHM)],
        'Settings that let a regulator hold the voltage at a point down the feeder, not at its own terminals.',
        'Dial settings are in volts on the 120 V base: they model the feeder drop at rated CT current.', V_),
    // Distribution Transformers
    P(DT, null, 'Transformer Hottest-Spot Temperature', r`$\theta_H = \theta_A + \Delta\theta_{TO} + \Delta\theta_H$`, r`$\theta_H = \theta_A + \Delta\theta_{TO} + \Delta\theta_H$`,
        [v(r`$\theta_A$`, 'ambient temperature', r`$\text{°C}$`), v(r`$\Delta\theta_{TO}$`, 'top-oil rise over ambient', r`$\text{°C}$`), v(r`$\Delta\theta_H$`, 'hottest-spot rise over top oil', r`$\text{°C}$`)],
        'The hottest point in the windings, which sets insulation aging.',
        'For a 65 °C-rise transformer the design hottest spot is 110 °C at 30 °C ambient.', r`$\text{°C}$`),
    P(DT, null, 'Aging Acceleration Factor', r`$F_{AA} = e^{15000/383 - 15000/(\theta_H + 273)}$`, r`$F_{AA} = \exp\left(\frac{15000}{383} - \frac{15000}{\theta_H + 273}\right)\quad (\text{IEEE C57.91, 65 °C rise})$`,
        [v(r`$\theta_H$`, 'hottest-spot temperature', r`$\text{°C}$`)],
        'How much faster insulation ages than at the 110 °C reference.',
        'Roughly doubles every 6–7 °C: 120 °C ages it 2.7 times as fast.'),
    // Substation Types and Bus Schemes
    P(BUS, null, 'Breakers per Circuit by Bus Scheme', r`$n_{CB}/n_{ckt} = 1,\ 1.5,\ 2$`, r`$\text{single bus, ring: } 1;\quad \text{breaker-and-a-half: } 1.5;\quad \text{double bus double breaker: } 2\ \text{breakers per circuit}$`,
        [v(r`$n_{CB}$`, 'number of circuit breakers'), v(r`$n_{ckt}$`, 'number of circuits')],
        'The cost side of a bus scheme: more breakers per circuit buy more reliability and maintenance flexibility.',
        'Ring bus: one per circuit, but opening the ring for maintenance weakens it. Breaker-and-a-half is common at EHV.'),
    // Substation Equipment
    P(EQ, null, 'Current-Limiting Reactor Size', r`$X_r = \frac{1}{S_{new}} - \frac{1}{S_{old}}$`, r`$X_{r,pu} = \frac{1}{\text{MVA}_{sc,new,pu}} - \frac{1}{\text{MVA}_{sc,old,pu}},\qquad X_r(\Omega) = X_{r,pu}Z_{base}$`,
        [v(r`$\text{MVA}_{sc}$`, 'fault level, per unit on the chosen base'), v(r`$Z_{base}$`, 'base impedance', OHM)],
        'The series reactance that brings a bus\'s fault level down to what its breakers can interrupt.',
        'It also adds voltage drop at load, so it is sized only as large as needed.', OHM),
    // Substation Grounding
    P(GND, null, 'Ground Potential Rise', r`$\text{GPR} = I_GR_g$`, r`$\text{GPR} = I_GR_g,\qquad I_G = S_fD_f(3I_0)$`,
        [v(r`$I_G$`, 'current flowing from the grid to remote earth', A_), v(r`$R_g$`, 'grid resistance', OHM), v(r`$S_f$`, 'split factor (share not returning by shield wires)'), v(r`$D_f$`, 'decrement factor for dc offset')],
        'How far the substation grid rises above remote earth during a ground fault (IEEE 80).',
        'If GPR is below the tolerable touch voltage the design is safe without further checks.', V_),
    P(GND, null, 'Mesh Voltage', r`$E_m = \frac{\rho K_mK_iI_G}{L_M}$`, r`$E_m = \frac{\rho K_mK_iI_G}{L_M}$`,
        [v(r`$\rho$`, 'soil resistivity', r`$\Omega\text{·m}$`), v(r`$K_m, K_i$`, 'spacing and irregularity factors'), v(r`$L_M$`, 'effective buried length', M_), v(r`$I_G$`, 'grid current', A_)],
        'The worst touch voltage inside a grid mesh, compared with the tolerable touch voltage.',
        'Closer conductor spacing lowers K_m and the mesh voltage.', V_),
    P(GND, null, 'Soil Resistivity (Wenner Four-Pin)', r`$\rho = 2\pi aR$`, r`$\rho = 2\pi aR\quad (\text{pins shallow compared with } a)$`,
        [v(r`$a$`, 'spacing between adjacent pins', M_), v(r`$R$`, 'measured V/I between the inner pins', OHM)],
        'Apparent soil resistivity from four equally spaced pins; it represents about depth a.',
        'Repeat at several spacings to see how resistivity changes with depth.', r`$\Omega\text{·m}$`),
    // Lightning Protection
    P(LTG, null, 'Rolling-Sphere Protected Distance', r`$d = \sqrt{H(2R - H)} - \sqrt{y(2R - y)}$`, r`$d = \sqrt{H(2R - H)} - \sqrt{y(2R - y)}\quad (H \le R)$`,
        [v(r`$H$`, 'mast or shield height', M_), v(r`$y$`, 'height of the object to protect', M_), v(r`$R$`, 'sphere radius (striking distance)', M_)],
        'How far from a mast an object of height y is protected by the rolling-sphere method.',
        'A smaller sphere (lower stroke current) protects less: design for the striking distance of the smallest dangerous stroke.', M_),
    P(LTG, null, 'Ground Flash Density', r`$N_g = 0.04T_d^{1.25}$`, r`$N_g = 0.04T_d^{1.25}\ \text{flashes/km}^2/\text{yr}$`,
        [v(r`$T_d$`, 'thunderstorm days per year (keraunic level)')],
        'Lightning flashes to ground per square kilometre per year, from the keraunic level.',
        'Much of the Philippines sees 80–100 thunderstorm days, so N_g is high.'),
    P(LTG, null, 'Strikes to an Overhead Line', r`$N = \frac{N_g(b + 28h^{0.6})}{10}$`, r`$N = \frac{N_g(b + 28h^{0.6})}{10}\ \text{per 100 km per year (Eriksson)}$`,
        [v(r`$N_g$`, 'ground flash density', r`$\text{1/km}^2\text{/yr}$`), v(r`$b$`, 'distance between outer conductors or shield wires', M_), v(r`$h$`, 'conductor height at the tower', M_)],
        'How many flashes an overhead line attracts per 100 km per year.',
        'Taller lines collect more strikes, roughly as h^0.6.'),
    // Reliability Indices
    P(REL, null, 'SAIFI and SAIDI', r`$\text{SAIDI} = \frac{\sum r_iN_i}{N_T}$`, r`$\text{SAIFI} = \frac{\sum N_i}{N_T},\qquad \text{SAIDI} = \frac{\sum r_iN_i}{N_T}\quad (\text{IEEE 1366})$`,
        [v(r`$N_i$`, 'customers interrupted by event i'), v(r`$r_i$`, 'restoration time of event i', r`$\text{min}$`), v(r`$N_T$`, 'total customers served')],
        'How often, and for how long in total, the average customer is interrupted in a year.',
        'Count sustained interruptions only (over 5 minutes); momentary ones go in MAIFI.'),
    P(REL, null, 'CAIDI and ASAI', r`$\text{CAIDI} = \frac{\text{SAIDI}}{\text{SAIFI}}$`, r`$\text{CAIDI} = \frac{\text{SAIDI}}{\text{SAIFI}},\qquad \text{ASAI} = 1 - \frac{\text{SAIDI}}{8760 \times 60}$`,
        [v(r`$\text{SAIDI}$`, 'average interruption minutes per customer', r`$\text{min}$`), v(r`$\text{SAIFI}$`, 'average interruptions per customer')],
        'The average length of one interruption, and the fraction of the year service was available.',
        'CAIDI is a restoration-speed measure: a utility can improve SAIFI and make CAIDI look worse.'),
    P(REL, null, 'Availability from MTBF and MTTR', r`$A = \frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}}$`, r`$A = \frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}};\qquad \text{series: } \prod A_i;\quad \text{parallel: } 1 - \prod(1 - A_i)$`,
        [v(r`$\text{MTBF}$`, 'mean time between failures', r`$\text{h}$`), v(r`$\text{MTTR}$`, 'mean time to repair', r`$\text{h}$`)],
        'The fraction of time a component, or a chain or set of them, is in service.',
        'Series chains are weaker than their weakest part; redundancy (parallel) multiplies the UNavailabilities.'),
    // Philippine Distribution Code
    P(PDC, null, 'PDC Minimum Power Factor', r`$\cos\theta \ge 0.85 \implies Q \le 0.62P$`, r`$\cos\theta \ge 0.85\ \text{lagging} \implies Q \le P\tan(\cos^{-1}0.85) = 0.62P$`,
        [v(r`$P$`, 'real power at the connection point', r`$\text{kW}$`), v(r`$Q$`, 'reactive power drawn', r`$\text{kvar}$`)],
        'The Philippine Distribution Code requires users to keep at least 0.85 lagging power factor at the connection point.',
        'Below the DU\'s target pf, penalties may apply; correct with capacitors sized by P(tanθ₁ − tanθ₂).'),
    P(PDC, null, 'Voltage Unbalance Factor', r`$\text{VUF} = \frac{V_2}{V_1} \times 100\%$`, r`$\text{VUF} = \frac{V_2}{V_1} \times 100\% \approx \frac{\max|V_k - V_{avg}|}{V_{avg}} \times 100\%\quad (\text{PDC} \le 2.5\%)$`,
        [v(r`$V_1, V_2$`, 'positive- and negative-sequence voltages', V_), v(r`$V_k, V_{avg}$`, 'the three LINE voltages and their average (NEMA approximation)', V_)],
        'How unbalanced the three voltages are; the PDC caps it at 2.5% at the connection point in normal operation.',
        'Small voltage unbalance makes several times as much current unbalance in motors.'),
    P(PDC, null, 'THD and TDD Limits', r`$\text{THD} = \frac{\sqrt{\sum V_h^2}}{V_1}$`, r`$\text{THD}_V = \frac{\sqrt{\sum_{h \ge 2}V_h^2}}{V_1} \le 5\%,\qquad \text{TDD} = \frac{\sqrt{\sum_{h \ge 2}I_h^2}}{I_L} \le 5\%\quad (\text{PDC})$`,
        [v(r`$V_h, I_h$`, 'harmonic voltages and currents', V_), v(r`$V_1$`, 'fundamental voltage', V_), v(r`$I_L$`, 'maximum demand load current', A_)],
        'The PDC\'s harmonic limits: voltage distortion and current distortion (relative to maximum demand current).',
        'TDD divides by the maximum demand current, not the present fundamental, so light loads aren\'t penalized.'),
];

module.exports = { subject: 'EE', topic: 'Distribution Systems & Substation Design', migration: '20270103000000_cards_distribution_substation', file, move, revisions, retire, drafts };
