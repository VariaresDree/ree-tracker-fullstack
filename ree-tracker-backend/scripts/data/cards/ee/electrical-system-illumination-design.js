'use strict';

// EE › Electrical System & Illumination Design formula cards (Library round,
// 2026-11-19): 4 live cards (illuminance, efficacy, inverse square, lumen
// method), all correct, filed; demand, diversity and load factor moved to
// Distribution earlier. The PEC's sizing rules (continuous load, motor
// protection, conduit fill, ampacity correction, voltage-drop limits, dwelling
// demand factors, available fault current) are in ESAS › Electrical Standards
// and Practices, so this file adds design calculations: small-appliance and
// laundry loads, range demand, neutral load; number of branch circuits;
// transformer kVA; conductor size for a voltage-drop limit and drop with
// tapped loads; locked-rotor current from the code letter, motor disconnect,
// starting dip; point-to-point fault current, motor contribution and the MVA
// method; the 25 Ω electrode rule and rods in parallel; panel phase balance;
// flux of a point source and luminance; room cavity ratio, room index,
// spacing ratio and light loss factor; cos³ illuminance; lighting energy
// cost; emergency lighting, lighting power density and retrofit payback. NEC
// values used where the PEC follows the NEC. See mathematics/algebra.js for
// the format; tests/systemIlluminationFormulas.test.js checks each.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const LOADC = 'Load Computation';
const BRANCH = 'Branch Circuits';
const FEED = 'Feeders and Services';
const COND = 'Conductor and Conduit Sizing';
const OCP = 'Overcurrent Protection';
const MOTOR = 'Motor Circuits';
const VDROP = 'Voltage Drop';
const SC = 'Short-Circuit Calculation';
const GND = 'Grounding';
const PLANS = 'Plans and Specifications';
const LF = 'Lighting Fundamentals';
const LUMEN = 'Lumen Method';
const PBP = 'Point-by-Point Method';
const LAMP = 'Lamp Types';
const EMER = 'Emergency and Energy-Efficient Lighting';

const file = [
    ['33151004-ad10-4413-8fe1-6cb90d67729f', LF, null], // Illuminance
    ['0c32d913-e413-4165-ae80-015a48d53734', LF, null], // Luminous Efficacy
    ['b7b32814-f42d-4ebf-8e09-b7b8d63b05d3', LUMEN, null], // Lumen Method
    ['829eded2-c13c-45fb-b9d1-6fae72d481f8', PBP, null], // Inverse Square Law of Illumination
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const VA = r`$\text{VA}$`;
const OHM = r`$\Omega$`;
const M_ = r`$\text{m}$`;
const LX = r`$\text{lx}$`;

const drafts = [
    // Load Computation
    P(LOADC, null, 'Small-Appliance and Laundry Load', r`$S = 1500(n_{sa} + n_{l})$`, r`$S = 1500\ \text{VA} \times (n_{sa} + n_{l}),\qquad n_{sa} \ge 2,\ n_l \ge 1\ (\text{dwelling})$`,
        [v(r`$n_{sa}$`, 'small-appliance branch circuits (kitchen, dining)'), v(r`$n_l$`, 'laundry branch circuits')],
        'Each dwelling small-appliance and laundry circuit is counted at 1500 VA, added to the general lighting load before the demand factors.',
        'These go WITH the lighting load into the 3000 VA / 35% demand steps.', VA),
    P(LOADC, null, 'Household Range Demand', r`$D = 8\ \text{kW}(1 + 0.05(P - 12))$`, r`$\text{one range} \le 12\ \text{kW}: 8\ \text{kW};\quad 12 < P \le 27\ \text{kW}: 8\ \text{kW} \times [1 + 0.05(P - 12)]$`,
        [v(r`$P$`, 'range nameplate rating', r`$\text{kW}$`)],
        'The demand load of one household range: far less than its nameplate, since all elements are rarely on at once.',
        'Round P up to the next whole kW before applying the 5% steps.', r`$\text{kW}$`),
    P(LOADC, null, 'Feeder Neutral Load', r`$I_N = 200 + 0.7(I - 200)$`, r`$I_N = I\ (I \le 200\ \text{A});\qquad I_N = 200 + 0.7(I - 200)\ (I > 200\ \text{A})$`,
        [v(r`$I$`, 'maximum unbalanced load on the neutral', A_)],
        'The neutral may be sized smaller for large unbalanced loads: 70% of the part over 200 A.',
        'No reduction for nonlinear loads (electronic ballasts, computers): their triplen harmonics add in the neutral.', A_),
    // Branch Circuits
    P(BRANCH, null, 'Number of Branch Circuits', r`$N = \frac{S}{V I_{rating}}$`, r`$N = \frac{S}{V\,I_{rating}}\quad (\text{continuous: } \times 1.25),\ \text{rounded up}$`,
        [v(r`$S$`, 'load to be served', VA), v(r`$V$`, 'circuit voltage', V_), v(r`$I_{rating}$`, 'branch-circuit rating', A_)],
        'How many branch circuits a load needs.',
        'Round UP. A continuous load may use only 80% of a circuit\'s rating.'),
    // Feeders and Services
    P(FEED, null, 'Transformer kVA for a Demand Load', r`$S \ge \frac{P_{demand}}{\text{pf}}$`, r`$S_{xfmr} \ge \frac{P_{demand}}{\text{pf}}\ (\text{next standard size}),\qquad I_{svc} = \frac{S}{\sqrt3V_L}$`,
        [v(r`$P_{demand}$`, 'demand load after demand factors', r`$\text{kW}$`), v(r`$\text{pf}$`, 'power factor'), v(r`$V_L$`, 'service line voltage', V_)],
        'Sizing the service transformer and the service current from the building\'s demand load.',
        'Standard ratings: 15, 25, 37.5, 50, 75, 100, 167 kVA (single phase); 75–2500 kVA (three phase).', r`$\text{kVA}$`),
    // Conductor and Conduit Sizing
    P(COND, null, 'Conductor Size for a Voltage-Drop Limit', r`$\text{CM} = \frac{kKIL}{\text{VD}}$`, r`$\text{CM} = \frac{kKIL}{\text{VD}},\quad k = 2\ (1\phi),\ \sqrt3\ (3\phi);\quad K \approx 10.4\ (\text{Cu}),\ 17\ (\text{Al})\ \Omega\cdot\text{cmil/ft}$`,
        [v(r`$K$`, 'resistivity of the conductor', r`$\Omega\cdot\text{cmil/ft}$`), v(r`$I$`, 'load current', A_), v(r`$L$`, 'one-way length', r`$\text{ft}$`), v(r`$\text{VD}$`, 'allowed voltage drop', V_)],
        'The minimum conductor area (circular mils) to keep the drop within a limit; then pick the size with at least that area AND enough ampacity.',
        'Use one-way length: k already counts the return conductor.', r`$\text{cmil}$`),
    // Overcurrent Protection
    P(OCP, null, 'Interrupting Rating Check', r`$I_{IR} \ge I_{sc}$`, r`$I_{interrupting} \ge I_{sc}\ \text{at the line terminals},\qquad I_{rating} \ge I_{load}\ (\le \text{ampacity})$`,
        [v(r`$I_{interrupting}$`, 'device interrupting rating (AIC)', r`$\text{kA}$`), v(r`$I_{sc}$`, 'available fault current where it is installed', r`$\text{kA}$`)],
        'An overcurrent device must interrupt the largest fault it can see, not just carry the load.',
        'Main breakers near a large transformer often need 42–65 kA; branch breakers may be 10 kA only if the fault level there is lower.', r`$\text{kA}$`),
    // Motor Circuits
    P(MOTOR, null, 'Locked-Rotor Current from Code Letter', r`$I_{LR} = \frac{k\cdot\text{hp}\cdot1000}{\sqrt3V}$`, r`$I_{LR} = \frac{(\text{kVA/hp}) \times \text{hp} \times 1000}{\sqrt3\,V}\quad (\text{e.g. code G: } 5.6\text{–}6.29\ \text{kVA/hp})$`,
        [v(r`$\text{kVA/hp}$`, 'locked-rotor kVA per hp for the nameplate code letter'), v(r`$\text{hp}$`, 'motor rating'), v(r`$V$`, 'line voltage', V_)],
        'The starting (locked-rotor) current from the motor\'s nameplate code letter.',
        'Use the upper end of the letter\'s range for a worst case.', A_),
    P(MOTOR, null, 'Motor Disconnect Rating', r`$I_{disc} \ge 1.15I_{FLC}$`, r`$I_{disconnect} \ge 1.15\,I_{FLC}\quad (\text{or horsepower-rated at least the motor\'s hp})$`,
        [v(r`$I_{FLC}$`, 'motor full-load current from the code tables', A_)],
        'A motor\'s disconnecting means must be rated at least 115% of its full-load current.',
        'Use the TABLE full-load current, not the nameplate, for sizing.', A_),
    P(MOTOR, null, 'Motor Starting Voltage Dip', r`$V_{ret} = \frac{S_{sc}}{S_{sc} + S_{LR}}$`, r`$V_{retained} = \frac{S_{sc}}{S_{sc} + S_{LR}},\qquad \text{dip} = \frac{S_{LR}}{S_{sc} + S_{LR}}$`,
        [v(r`$S_{sc}$`, 'short-circuit kVA of the source at the motor bus', r`$\text{kVA}$`), v(r`$S_{LR}$`, 'motor locked-rotor kVA', r`$\text{kVA}$`)],
        'How far the bus voltage sags when a motor starts across the line.',
        'More than about 15–20% dip flickers lights and can drop out contactors: consider reduced-voltage starting.'),
    // Voltage Drop
    P(VDROP, null, 'Feeder Voltage Drop with Tapped Loads', r`$\text{VD} = kr\sum I_jL_j$`, r`$\text{VD} = k\,r\sum_j I_jL_j\quad (\text{each load times its distance from the source})$`,
        [v(r`$I_j$`, 'current of load j', A_), v(r`$L_j$`, 'distance of load j from the source', M_), v(r`$r$`, 'resistance per unit length of one conductor', r`$\Omega/\text{m}$`), v(r`$k$`, '2 single phase, √3 three phase')],
        'Drop to the far end of a feeder with several loads along it: the sum of current-distance moments.',
        'Same as adding each segment\'s current times its length; only valid at unity pf or with impedance in place of r.', V_),
    // Short-Circuit Calculation
    P(SC, null, 'Point-to-Point Fault Current', r`$I_2 = \frac{I_1}{1 + f},\ f = \frac{\sqrt3LI_1}{CnE}$`, r`$f = \frac{\sqrt3\,L\,I_{sc,1}}{C\,n\,E_{LL}}\ (3\phi),\quad \frac{2LI_{sc,1}}{CnE_{LL}}\ (1\phi);\qquad I_{sc,2} = \frac{I_{sc,1}}{1 + f}$`,
        [v(r`$L$`, 'conductor length', r`$\text{ft}$`), v(r`$I_{sc,1}$`, 'fault current at the start of the run', A_), v(r`$C$`, 'conductor constant (from tables)'), v(r`$n$`, 'conductors in parallel per phase'), v(r`$E_{LL}$`, 'line voltage', V_)],
        'Fault current at the end of a cable run from the fault current at its start.',
        'f is the cable impedance over the source impedance; the multiplier 1/(1 + f) is always below 1.', A_),
    P(SC, null, 'Motor Contribution to Fault Current', r`$I_{mc} \approx 4\sum I_{FLC}$`, r`$I_{motor\ contribution} \approx 4 \times \sum I_{FLC}\ (\text{running motors, first cycles})$`,
        [v(r`$I_{FLC}$`, 'full-load currents of the running motors', A_)],
        'Running motors feed a fault for the first few cycles, adding to the utility\'s contribution.',
        'Add it at the bus where the motors connect when checking interrupting ratings.', A_),
    P(SC, null, 'MVA Method', r`$\frac{1}{\text{MVA}_s} = \sum\frac{1}{\text{MVA}_i}$`, r`$\text{series: } \frac{1}{\text{MVA}_{tot}} = \sum\frac{1}{\text{MVA}_i};\quad \text{parallel: } \text{MVA}_{tot} = \sum\text{MVA}_i;\quad \text{MVA}_i = \frac{\text{MVA}_{rated}}{Z_{pu}}$`,
        [v(r`$\text{MVA}_i$`, 'short-circuit MVA of each element on its own'), v(r`$Z_{pu}$`, 'its per-unit impedance on its own rating')],
        'Fault level by combining each element\'s short-circuit MVA like conductances: no common base needed.',
        'Series elements combine like resistors in parallel, parallel sources simply add.', r`$\text{MVA}$`),
    // Grounding
    P(GND, null, 'Supplementary Electrode Rule', r`$R > 25\ \Omega \implies \text{add an electrode}$`, r`$R_{rod} > 25\ \Omega \implies \text{add a supplemental electrode} \ge 1.8\ \text{m away}$`,
        [v(r`$R_{rod}$`, 'resistance of a single rod, pipe or plate electrode to earth', OHM)],
        'A single made electrode above 25 Ω must be supplemented by a second one.',
        'Two rods closer than their length interfere; space them at least 1.8 m, ideally twice the rod length.'),
    P(GND, null, 'Rods in Parallel', r`$R_n \approx \frac{R_1}{n}F$`, r`$R_n \approx \frac{R_1}{n}F,\qquad F \approx 1.2\text{–}1.5\ (\text{spacing} \approx \text{rod length})$`,
        [v(r`$R_1$`, 'resistance of one rod', OHM), v(r`$n$`, 'number of rods'), v(r`$F$`, 'mutual-interference factor')],
        'Several rods lower the resistance, but less than 1/n because their fields overlap.',
        'Wider spacing brings F toward 1.', OHM),
    // Plans and Specifications
    P(PLANS, null, 'Panel Phase Balance', r`$\text{unbalance} = \frac{\max - \text{avg}}{\text{avg}}$`, r`$\text{unbalance} = \frac{I_{\max} - I_{avg}}{I_{avg}} \times 100\%\quad (\text{phase loads on a panel schedule})$`,
        [v(r`$I_{\max}$`, 'most heavily loaded phase', A_), v(r`$I_{avg}$`, 'average of the three phases', A_)],
        'How evenly a panel\'s circuits are spread over the phases.',
        'Balance within about 10% so the neutral current and feeder size stay small.'),
    // Lighting Fundamentals
    P(LF, null, 'Flux of a Uniform Point Source', r`$\Phi = 4\pi I$`, r`$\Phi = 4\pi I\ (\text{all directions}),\qquad \Phi = I\omega\ (\text{into a solid angle } \omega)$`,
        [v(r`$I$`, 'luminous intensity', r`$\text{cd}$`), v(r`$\omega$`, 'solid angle', r`$\text{sr}$`)],
        'Total light from a source radiating equally in all directions.',
        'A full sphere is 4π steradians; a hemisphere 2π.', r`$\text{lm}$`),
    P(LF, null, 'Luminance of a Matte Surface', r`$L = \frac{\rho E}{\pi}$`, r`$L = \frac{\rho E}{\pi}\quad (\text{diffuse, Lambertian surface})$`,
        [v(r`$\rho$`, 'reflectance'), v(r`$E$`, 'illuminance on the surface', LX)],
        'How bright a matte surface looks, from the light on it and its reflectance.',
        'Brightness the eye sees is luminance (cd/m²), not illuminance.', r`$\text{cd/m}^2$`),
    // Lumen Method
    P(LUMEN, null, 'Room Cavity Ratio and Room Index', r`$\text{RCR} = \frac{5h(L + W)}{LW}$`, r`$\text{RCR} = \frac{5h_{rc}(L + W)}{LW},\qquad K = \frac{LW}{h_{rc}(L + W)} = \frac{5}{\text{RCR}}$`,
        [v(r`$h_{rc}$`, 'height from the work plane to the luminaires', M_), v(r`$L, W$`, 'room length and width', M_)],
        'The room\'s proportions, used to read the coefficient of utilization from the luminaire\'s table.',
        'Tall narrow rooms (high RCR) lose more light to the walls: lower CU.'),
    P(LUMEN, null, 'Light Loss Factor', r`$\text{LLF} = \text{LLD}\cdot\text{LDD}\cdot\ldots$`, r`$\text{LLF} = \text{LLD} \times \text{LDD} \times \text{RSDD} \times \text{BF} \times \ldots$`,
        [v(r`$\text{LLD}$`, 'lamp lumen depreciation'), v(r`$\text{LDD}$`, 'luminaire dirt depreciation'), v(r`$\text{RSDD}, \text{BF}$`, 'room surface dirt, ballast factor')],
        'Everything that reduces light over time, multiplied: the maintenance factor of the lumen method.',
        'Design for maintained illuminance: initial lux is higher by 1/LLF.'),
    P(LUMEN, null, 'Spacing-to-Mounting-Height Ratio', r`$S \le \text{SMH} \times h$`, r`$S_{\max} = \text{SMH} \times h_{m}\quad (\text{SMH typically } 1.0\text{–}1.5)$`,
        [v(r`$\text{SMH}$`, 'maximum spacing criterion of the luminaire'), v(r`$h_m$`, 'mounting height above the work plane', M_)],
        'The widest spacing that still gives even light between luminaires.',
        'Keep the end rows within half a spacing of the walls.', M_),
    // Point-by-Point Method
    P(PBP, null, 'Horizontal and Vertical Illuminance', r`$E_h = \frac{I\cos^3\theta}{h^2}$`, r`$E_h = \frac{I\cos^3\theta}{h^2},\qquad E_v = \frac{I\sin\theta\cos^2\theta}{h^2}$`,
        [v(r`$I$`, 'intensity toward the point', r`$\text{cd}$`), v(r`$h$`, 'mounting height above the point', M_), v(r`$\theta$`, 'angle from the vertical')],
        'Illuminance at a point from its mounting height instead of the slant distance.',
        'Same as I cosθ/d² with d = h/cosθ. Several sources: add their contributions.', LX),
    // Lamp Types
    P(LAMP, null, 'Lighting Energy Cost', r`$C = \frac{PNtr}{1000}$`, r`$C = \frac{P\,N\,t\,r}{1000}\quad (P \text{ in W per luminaire})$`,
        [v(r`$P$`, 'power per luminaire including ballast or driver', r`$\text{W}$`), v(r`$N$`, 'number of luminaires'), v(r`$t$`, 'operating hours', r`$\text{h}$`), v(r`$r$`, 'energy rate', r`$\text{₱/kWh}$`)],
        'The running cost of a lighting installation.',
        'Compare lamps on lumens per watt and on rated life, not on watts alone.', r`$\text{₱}$`),
    // Emergency and Energy-Efficient Lighting
    P(EMER, null, 'Emergency Lighting Duration and Level', r`$t \ge 90\ \text{min},\ E_{avg} \ge 10\ \text{lx}$`, r`$t \ge 1.5\ \text{h};\quad E_{avg} \ge 10.8\ \text{lx}\ (1\ \text{fc}),\ E_{\min} \ge 1.1\ \text{lx}\ (0.1\ \text{fc}) \text{ along egress};\quad C = \frac{P\,t}{V\cdot\text{DoD}}$`,
        [v(r`$P$`, 'emergency lighting load', r`$\text{W}$`), v(r`$V$`, 'battery voltage', V_), v(r`$\text{DoD}$`, 'usable depth of discharge')],
        'Emergency lighting must light the exit path for 90 minutes; the battery is sized for that.',
        'Values follow NFPA 101, adopted by the Philippine Fire Code; check the local requirement.', r`$\text{Ah}$`),
    P(EMER, null, 'Lighting Power Density', r`$\text{LPD} = \frac{\sum P}{A}$`, r`$\text{LPD} = \frac{\sum P_{lighting}}{A}\ (\text{W/m}^2)$`,
        [v(r`$\sum P_{lighting}$`, 'installed lighting power', r`$\text{W}$`), v(r`$A$`, 'floor area', r`$\text{m}^2$`)],
        'Installed lighting watts per square metre: the energy-code measure of efficient lighting.',
        'LED offices can reach well under 8 W/m²; compare with the applicable energy code.', r`$\text{W/m}^2$`),
    P(EMER, null, 'Lighting Retrofit Payback', r`$\text{payback} = \frac{C_{retrofit}}{\Delta P\,t\,r}$`, r`$\text{payback} = \frac{C_{retrofit}}{\Delta P\,t\,r/1000}\ \text{years}$`,
        [v(r`$C_{retrofit}$`, 'cost of the upgrade', r`$\text{₱}$`), v(r`$\Delta P$`, 'watts saved', r`$\text{W}$`), v(r`$t$`, 'operating hours per year', r`$\text{h}$`), v(r`$r$`, 'energy rate', r`$\text{₱/kWh}$`)],
        'How many years of energy savings pay for a lighting upgrade.',
        'Long operating hours make retrofits pay fastest; add avoided lamp replacements for a fuller picture.', r`$\text{yr}$`),
];

module.exports = { subject: 'EE', topic: 'Electrical System & Illumination Design', migration: '20270105000000_cards_system_illumination_design', file, revisions, retire, drafts };
