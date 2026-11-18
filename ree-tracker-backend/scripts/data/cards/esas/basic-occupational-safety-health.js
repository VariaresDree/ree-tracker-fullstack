'use strict';

// ESAS › Basic Occupational Safety & Health formula cards (Library round,
// 2026-11-18): the topic had no cards. Safety is mostly law and practice,
// taught in the lesson; these are the numbers a board item asks for: injury
// frequency and severity rates (OSHS Rule 1050, per million employee-hours),
// noise dose and exposure time (90 dBA for 8 h, 5 dB exchange), body-current
// and touch/step-voltage limits (Dalziel, IEEE 80), the NIOSH lifting
// equation, WBGT and time-weighted exposure, hearing-protector derating,
// glove classes, extinguisher classes and CPR. Amounts of fines are left out:
// sources differ and the IRR was revised in 2025 (DO 252-25). See
// mathematics/algebra.js for the format; tests/safetyAndLawsFormulas.test.js
// checks each against a worked case or the table it summarises.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const LAW = 'OSH Law and Standards (RA 11058)';
const HAZ = 'Hazards and Risk Assessment';
const ACC = 'Accident Causes and Investigation';
const PPE = 'Personal Protective Equipment';
const ELEC = 'Electrical Safety and Lockout/Tagout';
const FIRE = 'Fire Safety';
const ERGO = 'Ergonomics';
const HYG = 'Industrial Hygiene';
const AID = 'First Aid and Emergency Response';
const REC = 'Reporting and Records';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const HRS = v(r`$H$`, 'total employee-hours worked', r`$\text{h}$`);
const T_S = v(r`$t$`, 'shock duration', r`$\text{s}$`);

const drafts = [
    // OSH Law and Standards (RA 11058)
    K(LAW, 'OSH Law and Its Rules', r`$\text{RA } 11058$`, r`$\text{RA } 11058 \text{ (2018)};\ \text{IRR: DO } 198\text{-}18,\ \text{revised by DO } 252\text{-}25 \text{ (2025)};\ \text{OSHS of } 1978,\ \text{as amended}$`, 'The law that makes the Occupational Safety and Health Standards enforceable, and its implementing rules.', 'It covers all private establishments; workers may refuse unsafe work when DOLE finds imminent danger, without reprisal.'),
    // Hazards and Risk Assessment
    P(HAZ, null, 'Risk Rating', r`$R = L \times S$`, r`$R = L \times S$`,
        [v(r`$L$`, 'likelihood, often on a 1–5 scale'), v(r`$S$`, 'severity, often on a 1–5 scale')],
        'A hazard\'s priority in a HIRAC (hazard identification, risk assessment and control) matrix.',
        'Control in order: eliminate, substitute, engineering controls, administrative controls, then PPE last.'),
    P(HAZ, null, 'Ladder Angle (4 to 1 Rule)', r`$d = \frac{h}{4}$`, r`$d = \frac{h}{4}\qquad (\text{about } 76^\circ \text{ to the ground})$`,
        [v(r`$h$`, 'height where the ladder rests', r`$\text{m}$`), v(r`$d$`, 'distance of its foot from the wall', r`$\text{m}$`)],
        'Set a straight ladder one unit out for every four units up.',
        'OSHA states it along the ladder: the foot one quarter of its working length out (75.5°). Extend it 1 m (3 ft) above the landing; no metal ladders near live parts.', r`$\text{m}$`),
    // Accident Causes and Investigation
    K(ACC, 'Accident Ratios (Heinrich and Bird)', r`$1:29:300$`, r`$\text{Heinrich: } 1 \text{ major} : 29 \text{ minor} : 300 \text{ no-injury};\qquad \text{Bird: } 1 : 10 : 30 : 600$`, 'For every serious injury there are many minor ones and near misses: the base of the safety pyramid.', 'Heinrich also held that 88% of accidents come from unsafe acts, 10% from unsafe conditions, 2% unavoidable; treat these as historical, not exact.'),
    // Personal Protective Equipment
    P(PPE, null, 'Hearing Protector Derating', r`$\frac{NRR - 7}{2}$`, r`$L_{\text{ear}} = L_A - \frac{NRR - 7}{2}$`,
        [v(r`$L_A$`, 'A-weighted noise level', r`$\text{dBA}$`), v(r`$NRR$`, 'noise reduction rating on the label', r`$\text{dB}$`)],
        'The noise that actually reaches the ear through earplugs or muffs: subtract 7 for A-weighting, then halve for real-world fit.',
        'Earplugs plus muffs add only about 5 dB more than the better of the two.', r`$\text{dBA}$`),
    K(PPE, 'Rubber Insulating Glove Classes', r`$\text{class } 00\text{–}4$`, r`$\text{max use (ac): } 00\ 500\ \text{V};\ 0\ 1\ \text{kV};\ 1\ 7.5\ \text{kV};\ 2\ 17\ \text{kV};\ 3\ 26.5\ \text{kV};\ 4\ 36\ \text{kV}$`, 'The voltage each class of lineman\'s glove may be used at.', 'Wear leather protectors over them, and air-test them for holes before each use.'),
    // Electrical Safety and Lockout/Tagout
    P(ELEC, null, 'Shock Current Through the Body', r`$I = \frac{V}{R_{body}}$`, r`$I = \frac{V}{R_{body}};\qquad \approx 1\ \text{mA felt},\ 10\text{–}20\ \text{mA can't let go},\ 50\text{–}100\ \text{mA may cause fibrillation}$`,
        [v(r`$V$`, 'touch voltage', r`$\text{V}$`), v(r`$R_{body}$`, 'body resistance: about 1 kΩ wet, 100 kΩ or more dry skin', r`$\Omega$`)],
        'Current, not voltage, is what harms: it depends on the voltage and on the path\'s resistance.',
        'Wet skin turns a harmless 120 V touch into a deadly 120 mA.', r`$\text{A}$`),
    P(ELEC, null, 'Tolerable Body Current (Dalziel)', r`$I_B = \frac{0.116}{\sqrt{t}}$`, r`$I_B = \frac{k}{\sqrt{t}};\qquad k = 0.116 \text{ (50 kg)},\ 0.157 \text{ (70 kg)};\ 0.03 \le t \le 3\ \text{s}$`,
        [T_S],
        'The most current a body survives without ventricular fibrillation, for a short shock (IEEE 80).',
        'Faster fault clearing allows more current: halving the time raises the limit by √2.', r`$\text{A}$`),
    P(ELEC, null, 'Tolerable Touch and Step Voltages', r`$E_{touch} = (1000 + 1.5C_s\rho_s)\frac{0.116}{\sqrt t}$`, r`$E_{touch} = (1000 + 1.5\,C_s\rho_s)\frac{0.116}{\sqrt{t}},\qquad E_{step} = (1000 + 6\,C_s\rho_s)\frac{0.116}{\sqrt{t}}$`,
        [v(r`$\rho_s$`, 'resistivity of the surface layer (crushed rock)', r`$\Omega\cdot\text{m}$`), v(r`$C_s$`, 'surface-layer derating factor (1 with no layer)'), T_S],
        'The voltages a 50 kg person can safely bridge in a substation during a ground fault (IEEE 80).',
        'A crushed-rock layer raises both limits a lot: that is why substations are covered in gravel.', r`$\text{V}$`),
    // Fire Safety
    K(FIRE, 'Classes of Fire', r`$5 \text{ classes}$`, r`$5 \text{ classes: A ordinary combustibles};\ \text{B flammable liquids and gases};\ \text{C energized electrical};\ \text{D combustible metals};\ \text{K cooking oils}$`, 'The kinds of fire, each with its own extinguishing agent.', 'Never use water on Class C (shock) or K (splatter). CO₂ or dry chemical for electrical fires.'),
    // Ergonomics
    P(ERGO, null, 'NIOSH Lifting Equation', r`$RWL$`, r`$RWL = 23\ \text{kg} \times \frac{25}{H} \times (1 - 0.003|V - 75|) \times \left(0.82 + \frac{4.5}{D}\right) \times (1 - 0.0032A) \times FM \times CM$`,
        [v(r`$H$`, 'horizontal distance of the load from the ankles (≥ 25)', r`$\text{cm}$`), v(r`$V$`, 'height of the hands at the start', r`$\text{cm}$`), v(r`$D$`, 'vertical travel (≥ 25)', r`$\text{cm}$`), v(r`$A$`, 'twisting angle', r`$^\circ$`), v(r`$FM, CM$`, 'frequency and coupling multipliers (tables)')],
        'The recommended weight limit for a lift: 23 kg cut down by each poor condition.',
        'Lifting index = load ÷ RWL; above 1 means increased risk. Doubling the reach halves the limit.', r`$\text{kg}$`),
    // Industrial Hygiene
    P(HYG, null, 'Permissible Noise Exposure', r`$T = \frac{8}{2^{(L - 90)/5}}$`, r`$T = \frac{8}{2^{(L - 90)/5}}\ \text{h};\qquad D = \sum\frac{C_i}{T_i} \le 1$`,
        [v(r`$L$`, 'sound level', r`$\text{dBA}$`), v(r`$C_i$`, 'hours at each level', r`$\text{h}$`), v(r`$T_i$`, 'hours allowed at that level', r`$\text{h}$`)],
        'How long a worker may be exposed to a noise level: 90 dBA for 8 hours, halved for every 5 dB more.',
        '95 dBA: 4 h; 100 dBA: 2 h; 115 dBA: 15 min. A mixed day is within limits if the dose D ≤ 1 (100%).', r`$\text{h}$`),
    P(HYG, null, 'Time-Weighted Average Exposure', r`$TWA = \frac{\sum C_it_i}{8}$`, r`$TWA = \frac{\sum C_i t_i}{8\ \text{h}}$`,
        [v(r`$C_i$`, 'concentration during period i', r`$\text{ppm}$`), v(r`$t_i$`, 'length of period i', r`$\text{h}$`)],
        'A worker\'s average exposure to an airborne substance over an 8-hour shift, compared with its threshold limit value.',
        'Unexposed time counts as zero in the sum; still divide by 8.', r`$\text{ppm}$`),
    P(HYG, null, 'Wet Bulb Globe Temperature', r`$WBGT = 0.7T_{nwb} + 0.2T_g + 0.1T_{db}$`, r`$\text{outdoors (sun): } WBGT = 0.7T_{nwb} + 0.2T_g + 0.1T_{db};\qquad \text{indoors: } 0.7T_{nwb} + 0.3T_g$`,
        [v(r`$T_{nwb}$`, 'natural wet-bulb temperature', r`$^\circ\text{C}$`), v(r`$T_g$`, 'globe temperature', r`$^\circ\text{C}$`), v(r`$T_{db}$`, 'dry-bulb (air) temperature', r`$^\circ\text{C}$`)],
        'The heat-stress index that sets work-rest cycles in hot workplaces.',
        'Humidity dominates: the wet bulb carries 70% of the weight.', r`$^\circ\text{C}$`),
    // First Aid and Emergency Response
    K(AID, 'Adult CPR', r`$30:2$`, r`$30 \text{ compressions} : 2 \text{ breaths};\ 100\text{–}120 \text{ per minute};\ 5\text{–}6\ \text{cm deep}$`, 'Cardiopulmonary resuscitation for an adult, as currently taught.', 'For electric shock, first make sure the source is off or the victim is free of it before touching them.'),
    // Reporting and Records
    P(REC, null, 'Frequency and Severity Rates', r`$FR = \frac{N \times 10^6}{H}$`, r`$FR = \frac{N \times 1\,000\,000}{H},\qquad SR = \frac{D \times 1\,000\,000}{H}$`,
        [v(r`$N$`, 'disabling injuries'), v(r`$D$`, 'days lost or charged'), HRS],
        'Injury statistics per million employee-hours, as the OSHS (Rule 1050) requires in the annual exposure data report.',
        'SR ÷ FR is the average days lost per injury. US OSHA rates use 200 000 hours instead. The report is due by January 30.'),
];

module.exports = { subject: 'ESAS', topic: 'Basic Occupational Safety & Health', migration: '20261222000000_cards_basic_occupational_safety_health', file, revisions, retire, drafts };
