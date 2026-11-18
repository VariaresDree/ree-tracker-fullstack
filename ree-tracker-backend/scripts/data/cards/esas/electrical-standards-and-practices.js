'use strict';

// ESAS › Electrical Standards & Practices formula cards (Library round,
// 2026-11-18): the topic had no cards. The Philippine Electrical Code (PEC
// 2017, Part 1) follows the US NEC closely, so the rules here are the ones the
// two share and boards ask most: the 125% continuous-load rule, dwelling
// lighting demand factors, voltage-drop limits, motor conductors, overloads
// and short-circuit protection, ampacity derating, conduit fill, transformer
// and capacitor protection, grounding electrodes, and IEC/NEMA ratings. Values
// that live in long PEC tables (unit loads per m², conductor ampacities,
// grounding conductor sizes) are not copied here: read them from the code.
// See mathematics/algebra.js for the format; tests/standardsAndUnitsFormulas.test.js
// checks each rule against a worked case or the circuit behind it.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const GEN = 'PEC General and Definitions';
const PROT = 'Wiring and Protection';
const METH = 'Wiring Methods and Materials';
const EQUIP = 'Equipment for General Use';
const SPEQ = 'Special Equipment';
const PEC2 = 'PEC Part 2';
const GND = 'Grounding and Bonding';
const LOAD = 'Load Computation';
const SIZE = 'Conductor and Overcurrent Sizing';
const STD = 'IEC, IEEE and NEMA Standards';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const AMP = r`$\text{A}$`;
const VA = r`$\text{VA}$`;
const FLC = v(r`$I_{FLC}$`, 'motor full-load current from the PEC tables (not the nameplate)', AMP);

const drafts = [
    // PEC General and Definitions
    P(GEN, null, 'Continuous Load Rule', r`$I \ge 1.25I_c + I_{nc}$`, r`$I_{\text{conductor}},\ I_{\text{OCPD}} \ge 1.25\,I_{\text{continuous}} + 1.00\,I_{\text{noncontinuous}}$`,
        [v(r`$I_{\text{continuous}}$`, 'current of loads on for 3 hours or more', AMP), v(r`$I_{\text{noncontinuous}}$`, 'the rest of the load', AMP)],
        'Branch circuits and feeders are sized for 125% of their continuous load, so they don\'t run hot at full current for hours.',
        'A continuous load is one expected to run at its maximum for 3 hours or more. A breaker listed for 100% duty may skip the 25%.', AMP),
    P(GEN, null, 'Load Current for Sizing', r`$I = \frac{S}{\sqrt3 V_L}$`, r`$\text{single-phase: } I = \frac{S}{V};\qquad \text{three-phase: } I = \frac{S}{\sqrt3\,V_L} = \frac{P}{\sqrt3\,V_L\,\text{pf}\,\eta}$`,
        [v(r`$S$`, 'apparent power', VA), v(r`$V_L$`, 'line-to-line voltage', r`$\text{V}$`), v(r`$\text{pf}, \eta$`, 'power factor and efficiency')],
        'The current a load draws, the starting point of every conductor and breaker size.',
        'Use line-to-line voltage with √3. A 3-phase load in VA divided by V alone is 1.73 times too big.', AMP),
    // Wiring and Protection
    P(PROT, null, 'Voltage Drop Limits', r`$3\%,\ 5\%$`, r`$\%VD_{\text{branch}} \le 3\%,\qquad \%VD_{\text{feeder}} + \%VD_{\text{branch}} \le 5\%$`,
        [v(r`$\%VD$`, 'voltage drop as a percent of the nominal voltage')],
        'The code\'s recommended limits on voltage drop, for reasonable efficiency of operation.',
        'They are in informational notes: good practice the inspector expects, not a hard rule. The usual split is 2% feeder, 3% branch.'),
    P(PROT, null, 'Voltage Drop in a Circuit', r`$VD = kIR'L$`, r`$VD = k\,I\,L\,(R'\cos\theta + X'\sin\theta);\qquad k = 2 \text{ (1-phase)},\ \sqrt3 \text{ (3-phase, line to line)}$`,
        [v(r`$I$`, 'load current', AMP), v(r`$L$`, 'one-way length', r`$\text{km}$`), v(r`$R', X'$`, 'conductor resistance and reactance per length', r`$\Omega/\text{km}$`), v(r`$\theta$`, 'power-factor angle')],
        'How much voltage the wires lose between the source and the load.',
        'For short building runs the X′ term is small and VD ≈ kIR′L. L is one-way: the 2 already counts the return wire.', r`$\text{V}$`),
    P(PROT, null, 'Available Fault Current', r`$I_{sc} = \frac{I_{FL}}{Z_{pu}}$`, r`$I_{sc} = \frac{I_{FL}}{Z_{pu}} = I_{FL}\frac{100}{\%Z}$`,
        [v(r`$I_{FL}$`, 'transformer full-load current', AMP), v(r`$\%Z$`, 'transformer impedance, percent')],
        'The most current a fault at the transformer\'s terminals can draw (infinite source behind it).',
        'Breakers must have an interrupting rating above it. A 500 kVA, 5% transformer at 230 V three-phase: 25 kA.', AMP),
    // Equipment for General Use (motors, transformers)
    P(EQUIP, null, 'Motor Branch-Circuit and Feeder Conductors', r`$1.25I_{FLC}$`, r`$\text{branch: } I \ge 1.25\,I_{FLC};\qquad \text{feeder: } I \ge 1.25\,I_{FLC,\text{largest}} + \sum I_{FLC,\text{others}}$`,
        [FLC],
        'Conductor ampacity for one motor, and for a feeder serving several.',
        'Size conductors from the PEC full-load current tables; the nameplate current is used only for overloads.', AMP),
    P(EQUIP, null, 'Motor Overload Protection', r`$1.25I_{FLA}$`, r`$I_{OL} \le 1.25\,I_{FLA}\ (\text{SF} \ge 1.15 \text{ or rise} \le 40\,^\circ\text{C});\qquad 1.15\,I_{FLA}\ (\text{others})$`,
        [v(r`$I_{FLA}$`, 'nameplate full-load current', AMP), v(r`$\text{SF}$`, 'service factor')],
        'The setting of a motor\'s running overload relay.',
        'Overloads protect against overheating while running; they are separate from the short-circuit device.', AMP),
    P(EQUIP, null, 'Motor Short-Circuit and Ground-Fault Protection', r`$k \times I_{FLC}$`, r`$I_{\text{OCPD}} \le k\,I_{FLC}:\quad \text{nontime-delay fuse } 300\%;\ \text{dual-element fuse } 175\%;\ \text{instantaneous-trip breaker } 800\%;\ \text{inverse-time breaker } 250\%$`,
        [FLC, v(r`$k$`, 'maximum percent for the device type')],
        'The largest fuse or breaker allowed on a motor branch circuit, so it lets the motor start but clears a fault.',
        'If the result isn\'t a standard size, the next larger standard size is allowed.', AMP),
    P(EQUIP, null, 'Motor Feeder Protection', r`$I_{\text{OCPD,feeder}}$`, r`$I_{\text{OCPD,feeder}} \le I_{\text{OCPD,largest branch}} + \sum I_{FLC,\text{others}}$`,
        [v(r`$I_{\text{OCPD,largest branch}}$`, 'the largest branch-circuit device rating', AMP), FLC],
        'The feeder fuse or breaker for a group of motors.',
        'Unlike a branch device, the feeder device is rounded DOWN to a standard size.', AMP),
    P(EQUIP, null, 'Transformer Overcurrent Protection (Low Voltage)', r`$1.25I_p$`, r`$\text{primary only: } \le 1.25\,I_p;\qquad \text{primary and secondary: primary} \le 2.5\,I_p,\ \text{secondary} \le 1.25\,I_s$`,
        [v(r`$I_p, I_s$`, 'rated primary and secondary currents', AMP)],
        'Fuse or breaker limits for a dry-type or small transformer (currents of 9 A and more).',
        'When 125% isn\'t a standard size, the next larger standard size is allowed.', AMP),
    P(EQUIP, null, 'Capacitor Conductors', r`$1.35I_C$`, r`$I_{\text{conductor}} \ge 1.35\,I_{C},\qquad I_C = \frac{Q}{\sqrt3\,V_L}$`,
        [v(r`$Q$`, 'capacitor bank rating', r`$\text{kvar}$`), v(r`$I_C$`, 'rated capacitor current', AMP)],
        'Power-factor capacitors draw more than their rating (voltage and harmonics), so their conductors carry 135%.',
        'A capacitor connected on the load side of a motor\'s overload relay changes the current the relay sees: reduce its setting.', AMP),
    // Special Equipment
    P(SPEQ, null, 'Solar PV Circuit Current', r`$1.56I_{sc}$`, r`$I_{\max} = 1.25\,I_{sc};\qquad I_{\text{conductor}},\ I_{\text{OCPD}} \ge 1.25\,I_{\max} = 1.56\,I_{sc}$`,
        [v(r`$I_{sc}$`, 'short-circuit current of the module or parallel string', AMP)],
        'PV source circuits are sized for strong sunlight (125%) and then as a continuous load (125% again).',
        'Strings in parallel: add their short-circuit currents first.', AMP),
    P(SPEQ, null, 'Arc Welder Supply Conductors', r`$I \ge I_1\sqrt{D}$`, r`$I_{\text{conductor}} \ge I_1\sqrt{D}$`,
        [v(r`$I_1$`, 'rated primary current', AMP), v(r`$D$`, 'duty cycle as a fraction')],
        'A welder runs only part of the time, so its supply conductors may be smaller than its rated current.',
        'The code\'s multipliers are √D rounded: 60% duty gives 0.78, 50% gives 0.71.', AMP),
    // Wiring Methods and Materials
    P(METH, null, 'Ampacity Correction and Adjustment', r`$I = I_{table}\,k_tk_n$`, r`$I = I_{\text{table}}\,k_t\,k_n;\qquad k_n = 0.80\ (4\text{–}6),\ 0.70\ (7\text{–}9),\ 0.50\ (10\text{–}20 \text{ current-carrying conductors})$`,
        [v(r`$I_{\text{table}}$`, 'ampacity from the PEC table', AMP), v(r`$k_t$`, 'ambient-temperature correction factor'), v(r`$k_n$`, 'adjustment for more than three current-carrying conductors in a raceway')],
        'A conductor\'s allowed current once hotter surroundings and bundling are taken into account.',
        'A neutral carrying only the unbalanced current doesn\'t count; grounding conductors never count.', AMP),
    P(METH, null, 'Conduit Fill', r`$\frac{\sum A_{wire}}{A_{conduit}}$`, r`$\frac{\sum A_{\text{conductors}}}{A_{\text{conduit}}} \le 53\%\ (1 \text{ conductor}),\ 31\%\ (2),\ 40\%\ (3 \text{ or more})$`,
        [v(r`$A$`, 'cross-section areas, insulation included', r`$\text{mm}^2$`)],
        'How full a conduit may be, so wires can be pulled in and cool.',
        'Two conductors get the LEAST fill: they can jam side by side across the conduit.'),
    // Load Computation
    P(LOAD, null, 'Dwelling Lighting Load Demand Factors', r`$100\%,\ 35\%,\ 25\%$`, r`$\text{first } 3000\ \text{VA at } 100\%;\ 3001\text{–}120\,000\ \text{VA at } 35\%;\ \text{over } 120\,000\ \text{VA at } 25\%$`,
        [v(r`$\text{VA}$`, 'general lighting plus small-appliance and laundry load', VA)],
        'Not every light and outlet in a home runs at once: the demand factors cut the connected load for feeder and service sizing.',
        'Apply them to the general lighting load INCLUDING the small-appliance and laundry circuits; fixed appliances have their own rules.', VA),
    P(LOAD, null, 'General Lighting Load', r`$S = uA$`, r`$S_{\text{lighting}} = u \times A$`,
        [v(r`$u$`, 'unit load for the occupancy, from the PEC table', r`$\text{VA/m}^2$`), v(r`$A$`, 'floor area (outside dimensions for dwellings)', r`$\text{m}^2$`)],
        'The minimum lighting load a building\'s feeders must carry, from its floor area.',
        'Dwellings exclude open porches, garages and unfinished spaces. Small-appliance circuits add 1500 VA each, the laundry circuit 1500 VA.', VA),
    P(LOAD, null, 'Receptacle Outlet Load', r`$180\ \text{VA}$`, r`$S = 180\ \text{VA} \times \text{number of outlets (non-dwelling)}$`,
        [v(r`$\text{outlets}$`, 'single or multiple receptacles on one yoke')],
        'The load counted for each general-use receptacle outlet outside dwellings.',
        'Above 10 kVA of receptacle load, the excess may be taken at 50%.', VA),
    // Conductor and Overcurrent Sizing
    K(SIZE, 'Standard Ampere Ratings of Fuses and Breakers', r`$I_{\text{std}}$`, r`$15,\ 20,\ 25,\ 30,\ 35,\ 40,\ 45,\ 50,\ 60,\ 70,\ 80,\ 90,\ 100,\ 110,\ 125,\ 150,\ 175,\ 200,\ 225,\ 250,\ 300,\ 350,\ 400,\ 450,\ 500,\ 600 \ldots\ \text{A}$`, 'The fuse and breaker sizes the code calls standard.', 'Rules that allow "the next larger standard size" mean this list. Fuses also come in 1, 3, 6 and 10 A.'),
    // Grounding and Bonding
    P(GND, null, 'Ground Rod Resistance', r`$R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$`, r`$R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$`,
        [v(r`$\rho$`, 'soil resistivity', r`$\Omega\cdot\text{m}$`), v(r`$L$`, 'rod length driven', r`$\text{m}$`), v(r`$a$`, 'rod radius', r`$\text{m}$`)],
        'The resistance to earth of one driven rod (Dwight).',
        'A single rod over 25 Ω needs a second rod at least 1.8 m away. Doubling the length helps far more than a thicker rod.', r`$\Omega$`),
    // IEC, IEEE and NEMA Standards
    K(STD, 'Insulation Classes', r`$\text{A, E, B, F, H}$`, r`$\text{A } 105\,^\circ\text{C};\ \text{E } 120;\ \text{B } 130;\ \text{F } 155;\ \text{H } 180\,^\circ\text{C (maximum hot-spot temperature)}$`, 'The temperature an insulation system is rated to last at, for motors and transformers.', 'Every 10 °C over the rating roughly halves the insulation\'s life.'),
    K(STD, 'IP Code', r`$\text{IP}xy$`, r`$\text{first digit } 0\text{–}6: \text{solids (6 dust-tight)};\ \text{second digit } 0\text{–}8: \text{water (7 temporary, 8 continuous immersion)}$`, 'How well an enclosure keeps out solids and water (IEC 60529).', 'IP65: dust-tight, protected against water jets. NEMA ratings (NEMA 4, 4X, 12) say more, such as corrosion and ice.'),
    // PEC Part 2
    P(PEC2, null, 'Sag of an Overhead Conductor', r`$s = \frac{wL^2}{8T}$`, r`$s = \frac{wL^2}{8T}$`,
        [v(r`$w$`, 'conductor weight per length', r`$\text{N/m}$`), v(r`$L$`, 'span', r`$\text{m}$`), v(r`$T$`, 'horizontal tension', r`$\text{N}$`)],
        'How far a line sags at mid-span: Part 2 (supply lines) sets the clearances it must keep above ground.',
        'The parabola is accurate for sag under about 10% of the span. Higher temperature lengthens the wire and increases sag.', r`$\text{m}$`),
];

module.exports = { subject: 'ESAS', topic: 'Electrical Standards & Practices', migration: '20261221000000_cards_electrical_standards_and_practices', file, revisions, retire, drafts };
