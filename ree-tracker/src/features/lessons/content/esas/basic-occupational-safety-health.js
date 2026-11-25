// Library › Lessons › ESAS › Basic Occupational Safety & Health
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// oshLesson.test.js. The OSHS rule list follows the safety-engineering part of
// a review center's PEC and EE laws handout; the text, problems and figures
// are this app's own): written for the Philippine REE board, subtopic by
// subtopic in the syllabus's order. The law is RA 11058 with the OSHS; its
// implementing rules (DO 198-18) were revised in 2025 (DO 252-25), so exact
// fine amounts and staffing numbers are left to the current rules.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Tolerable body current factor for a 50 kg person (IEEE 80), and the touch limit for a surface layer.
export const k50 = (t) => 0.116 / Math.sqrt(t);
export const touchLimit = (csRho) => (t) => (1000 + 1.5 * csRho) * k50(t);

// Permissible hours at a sound level (90 dBA for 8 h, halved each 5 dB).
export const permittedHours = (dba) => 8 / 2 ** ((dba - 90) / 5);

export default {
  topic: 'Basic Occupational Safety & Health',
  subject: 'ESAS',
  overview: r`Occupational safety and health keeps workers from being hurt or made ill by their work. In the Philippines the Occupational Safety and Health Standards (OSHS) set the technical rules, and RA 11058 makes them enforceable with inspections, penalties and workers' rights. The method is always the same: identify the hazards, assess their risk, and control them, preferring to remove a hazard over guarding against it, with personal protective equipment as the last line. Electrical engineers meet two hazards above all: electric shock and arc flash, which is why lockout/tagout matters.`,
  sources: [
    'Republic Act 11058 and its implementing rules (DOLE DO 198-18, revised by DO 252-25)',
    'Occupational Safety and Health Standards (DOLE, as amended)',
    'IEEE Std 80, Guide for Safety in AC Substation Grounding',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'OSH Law and Standards (RA 11058)',
      inShort: r`The law that makes the safety standards enforceable, and the duties and rights it sets.`,
      body: [
        r`The **Occupational Safety and Health Standards** (OSHS) are DOLE's technical rules, numbered by topic. **RA 11058** (2018) gives them force: it covers private establishments, projects and sites, sets duties for employers and workers, gives workers rights, and adds penalties for each day a violation goes uncorrected. Its implementing rules (DO 198-18) were revised in 2025 (DO 252-25). Some OSHS rules an electrical engineer meets:

| Rule | Covers |
|---|---|
| 1040 | Health and Safety Committee |
| 1050 | Notification and keeping records of accidents and illnesses |
| 1080 | Personal protective equipment |
| 1160, 1170 | Boilers; unfired pressure vessels |
| 1200 | Machine guarding |
| 1210 | Electrical safety |
| 1211 | Philippine Electrical Code |
| 1212 | Electrical safety inspection (plans, permits to use, additional loads) |
| 1410 | Construction safety |
| 1940 | Fire protection and control |`,
        r`Employers must provide a safe workplace, information and training, an OSH program and PPE free of charge; workers must follow the program, use the PPE and report hazards. Workers may **refuse unsafe work** when there is imminent danger, without reprisal, and are paid while the work is stopped.`,
      ],
      keyIdeas: [
        r`RA 11058 (2018) covers all establishments, projects and sites in the private sector; its rules are DO 198-18, revised by DO 252-25 (2025).`,
        r`Employers must provide a safe workplace, information and training, free PPE, and an OSH program; workers must follow it.`,
        r`Workers may refuse unsafe work when DOLE finds imminent danger, without reprisal, and must be paid while work stops.`,
        r`Violations draw administrative fines for each day they stay uncorrected. OSHS Rule 1210 is electrical safety.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Refusing unsafe work',
          problem: r`A worker is told to enter a deep trench with no shoring while the walls are visibly cracking. May the worker refuse, and can the employer discipline them for it?`,
          steps: [
            r`Yes: imminent danger is grounds to refuse, and the law forbids reprisal for exercising that right.`,
            r`The work stops until the hazard is corrected.`,
          ],
          answer: r`Yes, may refuse; no reprisal.`,
        },
        {
          level: 'board',
          title: 'Which rule?',
          problem: r`Which OSHS rule covers each: (a) the electrical safety of an installation; (b) the health and safety committee; (c) personal protective equipment; (d) inspection and permits for electrical installations?`,
          steps: [
            r`(a) Rule 1210. (b) Rule 1040.`,
            r`(c) Rule 1080. (d) Rule 1212.`,
          ],
          answer: r`1210; 1040; 1080; 1212.`,
        },
      ],
      traps: [
        r`PPE must be provided free: deducting its cost from wages is a violation.`,
        r`Rule 1211 adopts the PEC; Rule 1210 is the broader electrical-safety rule.`,
      ],
      check: [
        { q: r`What does OSHS stand for?`, a: r`Occupational Safety and Health Standards.` },
        { q: r`Which OSHS rule is electrical safety?`, a: r`Rule 1210.` },
      ],
    },
    {
      name: 'Hazards and Risk Assessment',
      inShort: r`Finding what can hurt people, judging how bad it is, and choosing controls.`,
      body: [
        r`A **hazard** is anything that can cause harm; **risk** is how likely and how bad that harm is. Hazards are physical (noise, heat, radiation, electricity), chemical, biological, ergonomic, psychosocial, or safety hazards (falls, moving machines). HIRAC (hazard identification, risk assessment and control) scores each one, risk = likelihood × severity, and acts on the worst first.`,
        r`Controls are chosen from the most to the least effective: remove the hazard, then replace it with something less dangerous, then isolate people from it, then change how people work, and only then protect each worker with gear:`,
        {
          type: 'blocks',
          alt: 'The hierarchy of controls from most to least effective, top to bottom: eliminate the hazard, substitute something safer, engineering controls, administrative controls, and personal protective equipment.',
          caption: 'The hierarchy of controls, most effective at the top: PPE is the last resort.',
          blocks: [
            { id: 'e', at: [0, 0], label: 'Eliminate' },
            { id: 's', at: [0, 1], label: 'Substitute' },
            { id: 'g', at: [0, 2], label: 'Engineer' },
            { id: 'a', at: [0, 3], label: 'Administer' },
            { id: 'p', at: [0, 4], label: 'PPE' },
          ],
          links: [
            ['e', 's'],
            ['s', 'g'],
            ['g', 'a'],
            ['a', 'p'],
          ],
        },
        r`Engineering controls change the workplace (guards, ventilation, insulation, interlocks); administrative controls change the work (procedures, permits, training, rotation, signs).`,
      ],
      keyIdeas: [
        r`Hazards: physical (noise, heat, electricity), chemical, biological, ergonomic, psychosocial, safety (falls, machines).`,
        r`HIRAC: risk = likelihood × severity on a matrix.`,
        r`Hierarchy of controls: elimination, substitution, engineering, administrative, PPE.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A high risk',
          problem: r`A hazard scores likelihood 4 and severity 5 on 5-point scales. What is its risk, and which control should be tried first?`,
          steps: [
            r`$4 \times 5 = 20$ of 25: high.`,
            r`Try to eliminate the hazard first; PPE is the last resort.`,
          ],
          answer: r`20 (high); elimination.`,
        },
        {
          level: 'board',
          title: 'Ranking and classifying',
          problem: r`Rank three hazards: A (likelihood 2, severity 5), B (4, 3), C (5, 1). Then classify each control: a guard rail; job rotation; replacing a toxic solvent with a water-based one.`,
          steps: [
            r`A: 10; B: 12; C: 5. Order: B, A, C.`,
            r`Guard rail: engineering. Job rotation: administrative. Safer solvent: substitution.`,
          ],
          answer: r`B, A, C; engineering, administrative, substitution.`,
        },
      ],
      traps: [
        r`PPE does nothing to the hazard itself: it only protects the wearer, if worn properly.`,
        r`A rare but severe hazard can outrank a frequent minor one: multiply, don't just count.`,
      ],
      check: [
        { q: r`Which control is the most effective?`, a: r`Elimination.` },
        { q: r`Is a lockout procedure an engineering or an administrative control?`, a: r`Administrative (a procedure), backed by the lock as hardware.` },
      ],
    },
    {
      name: 'Accident Causes and Investigation',
      inShort: r`Why accidents happen and how to find and fix their causes.`,
      body: [
        r`An accident's **direct causes** are unsafe acts (removing a guard, working on live parts) and unsafe conditions (a frayed cable, a missing rail). Behind them are **root causes**: failures of training, supervision, maintenance or planning. Studies of many incidents found that serious injuries sit on top of a much larger base of minor ones and near misses:

| Study | Ratio |
|---|---|
| Heinrich (1931) | 1 major injury : 29 minor : 300 no-injury accidents |
| Bird (1969) | 1 serious : 10 minor : 30 property damage : 600 near misses |`,
        r`So every near miss is a free lesson. An investigation secures the scene and gives first aid, gathers facts, photos and witness accounts while they are fresh, finds the root cause (asking "why?" until a fixable cause appears), acts on it, and follows up to see the fix works.`,
      ],
      keyIdeas: [
        r`Direct causes are unsafe acts and unsafe conditions; root causes are the management failures behind them.`,
        r`Heinrich: 1 major : 29 minor : 300 no-injury incidents; Bird: 1 : 10 : 30 : 600.`,
        r`Investigate promptly: secure the scene, gather facts and witnesses, find the root cause, act, follow up.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Heinrich's pyramid",
          problem: r`A plant logged 900 no-injury incidents last year. By Heinrich's ratio, how many minor and major injuries does that suggest?`,
          steps: [
            r`$\frac{900}{300} = 3$ times the pyramid.`,
            r`About $3 \times 29 = 87$ minor and 3 major injuries. Reporting near misses is how to prevent them.`,
          ],
          answer: r`About 87 minor and 3 major.`,
        },
        {
          level: 'board',
          title: "Bird's triangle",
          problem: r`A contractor had 3 serious injuries in a year. By Bird's ratio, about how many minor injuries, property-damage accidents and near misses lie beneath them?`,
          steps: [
            r`Scale 1 : 10 : 30 : 600 by 3.`,
            r`30 minor injuries, 90 property-damage accidents, 1800 near misses.`,
          ],
          answer: r`30; 90; 1800.`,
        },
      ],
      traps: [
        r`"Worker carelessness" is rarely the root cause: ask why the unsafe act was possible.`,
        r`The ratios describe patterns across many incidents, not a forecast for one workplace.`,
      ],
      check: [
        { q: r`What are the two kinds of direct cause of accidents?`, a: r`Unsafe acts and unsafe conditions.` },
        { q: r`Why report near misses?`, a: r`They show the hazards that will cause injuries if left uncorrected.` },
      ],
    },
    {
      name: 'Personal Protective Equipment',
      inShort: r`Gear between the worker and the hazard: the last line of defence.`,
      body: [
        r`PPE protects the head (hard hats; Class E helmets for electrical work), eyes and face (safety glasses, face shields, arc-rated hoods), hearing (plugs and muffs), lungs (dust masks to supplied-air respirators), hands, feet, and against falls (harness and lanyard) and arc flash (arc-rated clothing chosen for the incident energy). It must fit, be maintained, and be provided free.`,
        r`Rubber insulating gloves are classed by the highest AC voltage they may be used on:

| Class | Maximum use voltage (AC) |
|---|---|
| 00 | 500 V |
| 0 | 1 kV |
| 1 | 7.5 kV |
| 2 | 17 kV |
| 3 | 26.5 kV |
| 4 | 36 kV |`,
        r`Each pair is air-tested and inspected before use and worn with leather protectors. A hearing protector's laboratory rating overstates what it does in the field; a common estimate of the level at the ear is $L_A - \frac{NRR - 7}{2}$.`,
      ],
      keyIdeas: [
        r`Head, eye and face, hearing, respiratory, hand, foot, fall protection, and arc-rated clothing.`,
        r`Hearing protectors: at the ear $L_A - \frac{NRR - 7}{2}$.`,
        r`Insulating gloves by class: 00 (500 V) up to 4 (36 kV); test and inspect before use.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Earplugs in a loud room',
          problem: r`Workers in 100 dBA wear earplugs rated NRR 29. About what level reaches the ear?`,
          steps: [
            r`$100 - \frac{29 - 7}{2} = 89$ dBA.`,
            r`Under the 90 dBA limit, but still above the 85 dBA action level, so keep up hearing checks.`,
          ],
          answer: r`About 89 dBA.`,
        },
        {
          level: 'board',
          title: 'Gloves and muffs',
          problem: r`Which glove class is the least that may be used on a 13.8 kV line? Muffs rated NRR 25 are worn in 95 dBA: what reaches the ear?`,
          steps: [
            r`Class 1 stops at 7.5 kV; Class 2 is rated to 17 kV: Class 2.`,
            r`$95 - \frac{25 - 7}{2} = 86$ dBA.`,
          ],
          answer: r`Class 2; about 86 dBA.`,
        },
      ],
      traps: [
        r`An ordinary hard hat is not electrical protection unless it is a rated Class E (electrical) helmet.`,
        r`Gloves rated for the voltage are useless if not inspected: a pinhole defeats them.`,
      ],
      check: [
        { q: r`Where does PPE sit in the hierarchy of controls?`, a: r`Last: it is the last line of defence.` },
        { q: r`What is the maximum use voltage of Class 0 gloves?`, a: r`1 kV.` },
      ],
    },
    {
      name: 'Electrical Safety and Lockout/Tagout',
      inShort: r`Shock, arc flash and the procedures that keep equipment dead while people work on it.`,
      body: [
        r`Current, not voltage, does the harm, and the body's resistance sets the current: about 1 mA is felt, 10–20 mA locks the muscles so the victim can't let go, and 50–100 mA through the chest may stop the heart. Wet skin lowers the body's resistance from about 100 kΩ to 1 kΩ or less, so the same voltage becomes far more dangerous.`,
        r`In a substation the ground under a person can rise during a fault. How much **touch voltage** a 50 kg person can bear depends on how fast the fault clears and on the surface: a high-resistivity crushed-rock layer raises the limit greatly:`,
        {
          type: 'plot',
          alt: 'The tolerable touch voltage for a 50 kilogram person against fault-clearing time from 0.1 to 1 second: on crushed rock with a surface factor of 0.7 and 2500 ohm metres, solid, falling from about 1330 volts at 0.1 second to 595 at 0.5 second; on bare soil of 100 ohm metres, dashed, far lower, about 190 volts at 0.5 second.',
          caption: 'Tolerable touch voltage (50 kg) against clearing time: on crushed rock (solid) about 595 V at 0.5 s; on bare soil (dashed) far less.',
          x: [0.1, 1],
          y: [0, 1400],
          xLabel: 'clearing time (s)',
          yLabel: 'touch voltage (V)',
          series: [
            { f: touchLimit(0.7 * 2500), label: 'crushed rock', area: true },
            { f: touchLimit(100), label: 'bare soil', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 0.5, label: '0.5 s' }],
        },
        r`The safest work is on dead equipment. **Lockout/tagout** keeps it dead: notify those affected, shut down, isolate every energy source, apply each worker's own lock and tag, release stored energy (capacitors, springs, pressure), and then **test** for zero energy before touching. **Arc flash** (an explosive arc in air) burns and blasts; its hazard is studied to set the arc-rated PPE and the approach boundaries.`,
      ],
      keyIdeas: [
        r`Current harms: about 1 mA is felt, 10–20 mA can't be let go, 50–100 mA may stop the heart. $I = \frac{V}{R_{body}}$.`,
        r`Tolerable current $\frac{0.116}{\sqrt t}$ (50 kg); touch and step limits $(1000 + 1.5C_s\rho_s)$ and $(1000 + 6C_s\rho_s)$ times $\frac{0.116}{\sqrt t}$.`,
        r`LOTO: notify, shut down, isolate, lock and tag, release stored energy, then TEST for zero energy before touching.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Touch voltage on crushed rock',
          problem: r`A substation has crushed rock ($\rho_s = 2500$ Ω·m, $C_s = 0.7$) and clears faults in 0.5 s. What touch voltage may a 50 kg person bear?`,
          steps: [
            r`$\frac{0.116}{\sqrt{0.5}} = 0.164$ A.`,
            r`$(1000 + 1.5 \times 0.7 \times 2500) \times 0.164 = 3625 \times 0.164 = 595$ V.`,
          ],
          answer: r`About 595 V.`,
        },
        {
          level: 'board',
          title: 'Step voltage, and wet hands',
          problem: r`For the same substation, what step voltage may a 50 kg person bear? A worker touches 230 V hand to hand: what current flows with dry skin (100 kΩ) and with wet hands (1 kΩ)?`,
          steps: [
            r`Step: $(1000 + 6 \times 0.7 \times 2500) \times 0.164 = 11\,500 \times 0.164 = 1887$ V.`,
            r`Dry: $\frac{230}{100\,000} = 2.3$ mA (felt). Wet: $\frac{230}{1000} = 230$ mA, enough to stop the heart.`,
          ],
          answer: r`About 1887 V; 2.3 mA dry, 230 mA wet.`,
        },
      ],
      traps: [
        r`Each worker puts on their OWN lock; a tag alone doesn't stop anyone.`,
        r`Never skip the test before touch: an isolator can fail or the wrong one can be opened.`,
      ],
      check: [
        { q: r`About what current makes it impossible to let go of a conductor?`, a: r`10–20 mA.` },
        { q: r`What is the last step of lockout before work begins?`, a: r`Testing (verifying) zero energy.` },
      ],
    },
    {
      name: 'Fire Safety',
      inShort: r`How fires start, the classes of fire, and how to put them out or get out.`,
      body: [
        r`A fire needs **fuel**, **heat** and **oxygen**, plus the chemical chain reaction that keeps it going (the fire tetrahedron); take any one away and it goes out: water cools (heat), CO₂ and foam smother (oxygen), dry chemicals break the chain. Fires are classed by fuel, and the extinguisher must match:

| Class | Fuel | Use | Never |
|---|---|---|---|
| A | wood, paper, cloth | water, foam, dry chemical | |
| B | flammable liquids and gases | foam, CO₂, dry chemical | a water jet |
| C | energized electrical equipment | CO₂, dry chemical | water |
| D | combustible metals (Mg, Na) | special dry powder | water |
| K | cooking oils and fats | wet chemical | water |`,
        r`Use an extinguisher by **PASS**: Pull the pin, Aim at the base of the fire, Squeeze, Sweep side to side, always with an exit behind you. The Philippine Fire Code is **RA 9514**.`,
      ],
      keyIdeas: [
        r`Fire needs fuel, heat and oxygen (and a chain reaction): remove one to stop it.`,
        r`Classes: A ordinary combustibles, B flammable liquids, C energized electrical, D metals, K cooking oils.`,
        r`Extinguisher use: PASS (Pull, Aim at the base, Squeeze, Sweep). Fire Code: RA 9514.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A burning panel',
          problem: r`A distribution panel is burning. What extinguisher do you use, and what changes once it is de-energized?`,
          steps: [
            r`While live it is Class C: CO₂ or dry chemical, never water.`,
            r`De-energized, what still burns is ordinary Class A (or B) fuel.`,
          ],
          answer: r`CO₂ or dry chemical; then treat it as Class A or B.`,
        },
        {
          level: 'board',
          title: 'Five fires',
          problem: r`Classify: (a) burning cardboard; (b) a gasoline spill fire; (c) a motor still connected and burning; (d) magnesium shavings; (e) a deep fryer.`,
          steps: [
            r`(a) A. (b) B. (c) C.`,
            r`(d) D. (e) K.`,
          ],
          answer: r`A; B; C; D; K.`,
        },
      ],
      traps: [
        r`Water on a live electrical fire can carry current back to the person holding the hose.`,
        r`Aim at the BASE of the flames, not the top.`,
      ],
      check: [
        { q: r`What does a CO₂ extinguisher take away from a fire?`, a: r`Oxygen (it smothers).` },
        { q: r`What is the Philippine Fire Code?`, a: r`RA 9514.` },
      ],
    },
    {
      name: 'Ergonomics',
      inShort: r`Fitting the work to the worker to prevent strain and injury.`,
      body: [
        r`**Ergonomics** fits the job to the person. Musculoskeletal disorders (back injuries, tendinitis, carpal tunnel) build up from force, awkward posture, repetition and vibration. For lifting, the NIOSH equation gives a **recommended weight limit**: 23 kg at the ideal posture, cut by multipliers for distance, height, twisting, frequency and grip. The horizontal distance of the load from the ankles matters most, the limit falling as $\frac{25}{H}$:`,
        {
          type: 'plot',
          alt: 'The recommended weight limit against the load’s horizontal distance from 25 to 63 centimetres, other factors ideal: falling from 23 kilograms at 25 centimetres to 11.5 at 50; a dashed line marks a 15 kilogram load, which is within the limit only up to about 38 centimetres.',
          caption: 'The recommended limit falls as the load moves out: a 15 kg load (dashed) is within it only to about 38 cm.',
          x: [25, 63],
          y: [0, 25],
          xLabel: 'horizontal distance H (cm)',
          yLabel: 'limit (kg)',
          series: [
            { f: (h) => (23 * 25) / h, label: 'RWL', area: true },
            { f: () => 15, label: '15 kg', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 50, label: '50 cm' }],
        },
        r`The **lifting index**, load ÷ limit, should stay at or below 1. Work stations should keep work near elbow height and screens at eye level, with rest breaks for repetitive work.`,
      ],
      keyIdeas: [
        r`Musculoskeletal disorders come from force, awkward posture, repetition and vibration.`,
        r`NIOSH: $RWL = 23\ \text{kg} \times \frac{25}{H} \times VM \times DM \times AM \times FM \times CM$; lifting index = load ÷ RWL.`,
        r`Work-station design: elbow-height work, screens at eye level, rest breaks.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A lift too far out',
          problem: r`A worker lifts 15 kg held 50 cm out from the ankles, otherwise at the reference posture. What is the recommended limit and the lifting index?`,
          steps: [
            r`$RWL = 23 \times \frac{25}{50} = 11.5$ kg.`,
            r`$LI = \frac{15}{11.5} = 1.3$: above 1, so redesign the lift.`,
          ],
          answer: r`11.5 kg; 1.3.`,
        },
        {
          level: 'board',
          title: 'How close is close enough?',
          problem: r`How close must the same 15 kg load be held for a lifting index of 1, other factors ideal?`,
          steps: [
            r`$23 \times \frac{25}{H} = 15$.`,
            r`$H = \frac{23 \times 25}{15} = 38.3$ cm or closer.`,
          ],
          answer: r`38.3 cm or closer.`,
        },
      ],
      traps: [
        r`Keeping the load close to the body matters more than how heavy it is.`,
        r`The 23 kg constant is the limit for IDEAL conditions, not a general safe weight.`,
      ],
      check: [
        { q: r`What lifting index calls for redesigning a task?`, a: r`Above 1.` },
        { q: r`Name two causes of musculoskeletal disorders.`, a: r`Any two of force, awkward posture, repetition and vibration.` },
      ],
    },
    {
      name: 'Industrial Hygiene',
      inShort: r`Recognizing, measuring and controlling health hazards: noise, heat, dust and chemicals.`,
      body: [
        r`**Industrial hygiene** anticipates, recognizes, evaluates and controls health hazards at work. Noise is the commonest: the limit is 90 dBA for 8 hours, and every 5 dB more halves the time allowed, while 85 dBA starts a hearing conservation program:`,
        {
          type: 'plot',
          alt: 'The hours a worker may be exposed against sound level from 85 to 110 dBA: 16 hours at 85, 8 at 90, 4 at 95, 2 at 100, 1 at 105 and half an hour at 110, halving every 5 decibels.',
          caption: 'Permitted hours against sound level: 8 h at 90 dBA, halving every 5 dB.',
          x: [85, 110],
          y: [0, 17],
          xLabel: 'sound level (dBA)',
          yLabel: 'hours allowed',
          series: [{ f: permittedHours, label: 'hours', area: true }],
          marks: [{ x: 90, label: '90 dBA' }],
        },
        r`Exposures at several levels add up as a **dose**, $D = \sum\frac{C_i}{T_i}$ (over 1 is too much). Airborne chemicals are judged by their 8-hour **time-weighted average** against the threshold limit value, $TWA = \frac{\sum C_it_i}{8}$. Heat stress is judged by the **wet-bulb globe temperature**, outdoors $0.7T_{nwb} + 0.2T_g + 0.1T_{db}$, which sets work–rest cycles.`,
      ],
      keyIdeas: [
        r`Noise: 90 dBA for 8 h, halved per 5 dB; dose $D = \sum\frac{C_i}{T_i}$; 85 dBA starts a hearing program.`,
        r`Chemicals: $TWA = \frac{\sum C_it_i}{8}$ against the threshold limit value.`,
        r`Heat: $WBGT = 0.7T_{nwb} + 0.2T_g + 0.1T_{db}$ outdoors sets the work-rest cycle.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A noise dose',
          problem: r`A worker spends 4 h at 90 dBA, 2 h at 95 dBA and 1 h at 100 dBA. Is the exposure within limits?`,
          steps: [
            r`Allowed: 8, 4 and 2 h. $D = \frac{4}{8} + \frac{2}{4} + \frac{1}{2} = 1.5$.`,
            r`A dose of 150%, over the limit (about 92.9 dBA over 8 h).`,
          ],
          answer: r`No: a 150% dose.`,
        },
        {
          level: 'board',
          title: 'A solvent and the heat',
          problem: r`A painter breathes 120 ppm of a solvent for 3 h, 60 ppm for 3 h and none for 2 h; its TLV is 100 ppm. Is that acceptable? Outdoors, the natural wet bulb reads 28 °C, the globe 40 °C and the dry bulb 33 °C: find the WBGT.`,
          steps: [
            r`$TWA = \frac{3 \times 120 + 3 \times 60}{8} = 67.5$ ppm, under 100: acceptable.`,
            r`$WBGT = 0.7 \times 28 + 0.2 \times 40 + 0.1 \times 33 = 30.9$ °C.`,
          ],
          answer: r`67.5 ppm, acceptable; 30.9 °C.`,
        },
      ],
      traps: [
        r`Decibels don't add linearly: two 90 dBA machines make 93 dBA, not 180.`,
        r`Divide the TWA by 8 hours even when the exposure lasted fewer.`,
      ],
      check: [
        { q: r`How long may a worker be exposed to 95 dBA?`, a: r`4 hours.` },
        { q: r`At what level does a hearing conservation program start?`, a: r`85 dBA.` },
      ],
    },
    {
      name: 'First Aid and Emergency Response',
      inShort: r`Care until medical help arrives, and plans for when things go wrong.`,
      body: [
        r`First aid starts with the rescuer's own safety: check that the scene is safe, call for help, then care for the victim. For an adult who is unresponsive and not breathing normally, start CPR at once:

| Step | Do |
|---|---|
| Compressions | centre of the chest, 5–6 cm deep, 100–120 a minute, letting it recoil fully |
| Ratio | 30 compressions to 2 breaths (or compressions only if untrained) |
| AED | switch on and follow its prompts as soon as it arrives |
| Continue | until help takes over or the person recovers |`,
        r`Every workplace needs an **emergency plan**: alarms, marked exits and routes, assembly points, a head count, trained first-aiders and fire wardens, and drills so that people act without having to think.`,
      ],
      keyIdeas: [
        r`Check the scene is safe, call for help, then care for the victim.`,
        r`Adult CPR: 30 compressions to 2 breaths, 100–120 a minute, 5–6 cm deep; use an AED as soon as one arrives.`,
        r`Emergency plans: alarms, exits, assembly points, drills, trained first-aiders.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A shock victim',
          problem: r`A coworker collapses while holding a live cable. What do you do first?`,
          steps: [
            r`Cut the power (or free them with a dry non-conductive object) before touching them.`,
            r`Then check breathing, call for help and start CPR if needed.`,
          ],
          answer: r`Make it safe first, then aid.`,
        },
        {
          level: 'board',
          title: 'The order of things',
          problem: r`Put these in order for a worker found unconscious beside a panel: start CPR; check for breathing; switch off the supply; send someone for the AED and to call emergency services.`,
          steps: [
            r`1. Switch off the supply (the scene must be safe).`,
            r`2. Check for breathing. 3. Send for the AED and call for help. 4. Start CPR if not breathing normally.`,
          ],
          answer: r`Switch off, check breathing, send for help and the AED, start CPR.`,
        },
      ],
      traps: [
        r`Touching a shock victim still in contact with the source makes you a second victim.`,
        r`Shallow or slow compressions don't circulate blood: push hard and fast.`,
      ],
      check: [
        { q: r`What is the adult CPR compression rate?`, a: r`100–120 a minute.` },
        { q: r`What is the compression-to-breath ratio for adult CPR?`, a: r`30 : 2.` },
      ],
    },
    {
      name: 'Safety Officers and Committees',
      inShort: r`The people who run a workplace's safety program.`,
      body: [
        r`Every covered workplace has an **OSH committee** and **safety officers**; how many, and of what level, depends on its number of workers and its risk class. Safety officers are graded SO1 to SO4 by training (starting with the Basic OSH course) and experience. Workplaces also need trained first-aiders and access to occupational health personnel.`,
        r`The committee usually has the employer or a manager as chair, the safety officer as secretary, and workers' representatives and health personnel as members. It plans and reviews the OSH program, inspects the workplace, investigates accidents, recommends improvements and meets regularly. Exact staffing numbers are set by the current implementing rules (DO 252-25).`,
      ],
      keyIdeas: [
        r`Every covered workplace needs an OSH committee and safety officers; how many, and of what level, depends on its size and risk.`,
        r`Safety officer levels SO1 to SO4 rise with training (the Basic OSH course and beyond) and experience.`,
        r`The committee plans and reviews the program, investigates accidents and meets regularly.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Who sits on the committee?',
          problem: r`Who usually sits on a workplace's OSH committee, and what does it do?`,
          steps: [
            r`The employer or manager (chair), the safety officer (secretary), workers' representatives and the health personnel.`,
            r`It plans, monitors and reviews the OSH program and investigates accidents.`,
          ],
          answer: r`Management, the safety officer, workers and health staff; it runs the OSH program.`,
        },
        {
          level: 'board',
          title: 'A new risk',
          problem: r`A factory adds a high-voltage substation and a solvent store, raising its risk class. What should its OSH committee do?`,
          steps: [
            r`Re-run the hazard identification and risk assessment for the new hazards, and update the OSH program.`,
            r`Check that its safety officers' number and level still meet the rules for the new risk class, and train the workers affected.`,
          ],
          answer: r`Reassess, update the program, and recheck staffing and training.`,
        },
      ],
      traps: [
        r`Check the current rules (DO 252-25) for staffing numbers: they changed with the 2025 revision.`,
        r`A safety officer advises and monitors; management stays responsible for safety.`,
      ],
      check: [
        { q: r`What are the levels of safety officer?`, a: r`SO1 to SO4.` },
        { q: r`Which OSHS rule covers the health and safety committee?`, a: r`Rule 1040.` },
      ],
    },
    {
      name: 'Reporting and Records',
      inShort: r`Recording and reporting accidents and illnesses, and measuring performance.`,
      body: [
        r`Every work accident and occupational illness is recorded and reported to DOLE on the prescribed forms (OSHS Rule 1050); fatalities and dangerous occurrences are reported at once, and an annual report summarizes the year's exposure and injuries.`,
        r`Performance is compared across workplaces of different sizes by rates per million employee-hours:

| Measure | Formula | Means |
|---|---|---|
| Frequency rate | $\frac{N \times 10^6}{H}$ | disabling injuries per million hours |
| Severity rate | $\frac{D \times 10^6}{H}$ | days lost per million hours |
| Average severity | $\frac{D}{N}$ | days lost per injury |`,
      ],
      keyIdeas: [
        r`Frequency rate $= \frac{N \times 10^6}{H}$, severity rate $= \frac{D \times 10^6}{H}$, per million employee-hours.`,
        r`Work accident and illness reports for each incident; the annual exposure data report by January 30.`,
        r`Dangerous occurrences and fatalities are reported to DOLE at once.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "A year's rates",
          problem: r`500 workers each work 2000 h in a year, with 6 disabling injuries and 300 days lost. Find the frequency and severity rates and the average days lost per injury.`,
          steps: [
            r`$H = 500 \times 2000 = 10^6$ h.`,
            r`FR $= 6$, SR $= 300$, and $\frac{300}{6} = 50$ days per injury.`,
          ],
          answer: r`FR 6; SR 300; 50 days.`,
        },
        {
          level: 'board',
          title: 'Two plants',
          problem: r`Plant X: 300 workers × 2100 h, 4 injuries, 120 days lost. Plant Y: 800 workers × 2000 h, 7 injuries, 420 days lost. Compare their frequency and severity rates.`,
          steps: [
            r`X: $H = 630\,000$; FR $= 6.35$, SR $= 190.5$.`,
            r`Y: $H = 1\,600\,000$; FR $= 4.38$, SR $= 262.5$.`,
            r`X has injuries more often; Y's are more severe.`,
          ],
          answer: r`X: 6.35 and 190.5; Y: 4.38 and 262.5.`,
        },
      ],
      traps: [
        r`US OSHA incidence rates use 200 000 hours, not a million: don't mix the two.`,
        r`More injuries need not mean a worse record: compare RATES, not counts.`,
      ],
      check: [
        { q: r`What does the severity rate measure?`, a: r`Days lost per million employee-hours.` },
        { q: r`Which OSHS rule covers notifying and recording accidents?`, a: r`Rule 1050.` },
      ],
    },
  ],
};
