// Library › Lessons › ESAS › Basic Occupational Safety & Health (2026-11-18):
// written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order; every worked example checked by computation. The law is
// RA 11058 with the OSHS; its implementing rules (DO 198-18) were revised in
// 2025 (DO 252-25), so exact fine amounts and staffing numbers are left to
// the current rules.
const r = String.raw;

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
      keyIdeas: [
        r`RA 11058 (2018) covers all establishments, projects and sites in the private sector; its rules are DO 198-18, revised by DO 252-25 (2025).`,
        r`Employers must provide a safe workplace, information and training, free PPE, and an OSH program; workers must follow it.`,
        r`Workers may refuse unsafe work when DOLE finds imminent danger, without reprisal, and must be paid while work stops.`,
        r`Violations draw administrative fines for each day they stay uncorrected.`,
      ],
      example: {
        problem: r`A worker is told to enter a deep trench with no shoring while the walls are visibly cracking. May the worker refuse, and can the employer discipline them for it?`,
        solution: r`Yes: imminent danger is grounds to refuse, and the law forbids reprisal for exercising that right. The work stops until the hazard is corrected.`,
      },
      traps: [r`PPE must be provided free: deducting its cost from wages is a violation.`],
    },
    {
      name: 'Hazards and Risk Assessment',
      inShort: r`Finding what can hurt people, judging how bad it is, and choosing controls.`,
      keyIdeas: [
        r`Hazards: physical (noise, heat, electricity), chemical, biological, ergonomic, psychosocial, safety (falls, machines).`,
        r`HIRAC: risk = likelihood × severity on a matrix.`,
        r`Hierarchy of controls: elimination, substitution, engineering, administrative, PPE.`,
      ],
      example: {
        problem: r`A hazard scores likelihood 4 and severity 5 on 5-point scales. What is its risk, and which control should be tried first?`,
        solution: r`$4 \times 5 = 20$ of 25: high. Try to eliminate the hazard first; PPE is the last resort.`,
      },
      traps: [r`PPE does nothing to the hazard itself: it only protects the wearer, if worn properly.`],
    },
    {
      name: 'Accident Causes and Investigation',
      inShort: r`Why accidents happen and how to find and fix their causes.`,
      keyIdeas: [
        r`Direct causes are unsafe acts and unsafe conditions; root causes are the management failures behind them.`,
        r`Heinrich: 1 major : 29 minor : 300 no-injury incidents; Bird: 1 : 10 : 30 : 600.`,
        r`Investigate promptly: secure the scene, gather facts and witnesses, find the root cause, act, follow up.`,
      ],
      example: {
        problem: r`A plant logged 900 no-injury incidents last year. By Heinrich's ratio, how many minor and major injuries does that suggest?`,
        solution: r`$\frac{900}{300} = 3$ times the pyramid: about 87 minor and 3 major injuries. Reporting near misses is how to prevent them.`,
      },
      traps: [r`"Worker carelessness" is rarely the root cause: ask why the unsafe act was possible.`],
    },
    {
      name: 'Personal Protective Equipment',
      inShort: r`Gear between the worker and the hazard: the last line of defence.`,
      keyIdeas: [
        r`Head, eye and face, hearing, respiratory, hand, foot, fall protection, and arc-rated clothing.`,
        r`Hearing protectors: at the ear $L_A - \frac{NRR - 7}{2}$.`,
        r`Insulating gloves by class: 00 (500 V) up to 4 (36 kV); test and inspect before use.`,
      ],
      example: {
        problem: r`Workers in 100 dBA wear earplugs rated NRR 29. About what level reaches the ear?`,
        solution: r`$100 - \frac{29 - 7}{2} = 89$ dBA: under the 90 dBA limit, but still above the 85 dBA action level, so keep up hearing checks.`,
      },
      traps: [r`An ordinary hard hat is not electrical protection unless it is a rated Class E (electrical) helmet.`],
    },
    {
      name: 'Electrical Safety and Lockout/Tagout',
      inShort: r`Shock, arc flash and the procedures that keep equipment dead while people work on it.`,
      keyIdeas: [
        r`Current harms: about 1 mA is felt, 10–20 mA can't be let go, 50–100 mA may stop the heart. $I = \frac{V}{R_{body}}$.`,
        r`Tolerable current $\frac{0.116}{\sqrt t}$ (50 kg); touch and step limits $(1000 + 1.5C_s\rho_s)$ and $(1000 + 6C_s\rho_s)$ times $\frac{0.116}{\sqrt t}$.`,
        r`LOTO: notify, shut down, isolate, lock and tag, release stored energy, then TEST for zero energy before touching.`,
      ],
      example: {
        problem: r`A substation has crushed rock ($\rho_s = 2500$ Ω·m, $C_s = 0.7$) and clears faults in 0.5 s. What touch voltage may a 50 kg person bear?`,
        solution: r`$(1000 + 1.5 \times 0.7 \times 2500)\frac{0.116}{\sqrt{0.5}} = 3625 \times 0.164 = 595$ V.`,
      },
      traps: [r`Each worker puts on their OWN lock; a tag alone doesn't stop anyone.`],
    },
    {
      name: 'Fire Safety',
      inShort: r`How fires start, the classes of fire, and how to put them out or get out.`,
      keyIdeas: [
        r`Fire needs fuel, heat and oxygen (and a chain reaction): remove one to stop it.`,
        r`Classes: A ordinary combustibles, B flammable liquids, C energized electrical, D metals, K cooking oils.`,
        r`Extinguisher use: PASS (Pull, Aim at the base, Squeeze, Sweep). Fire Code: RA 9514.`,
      ],
      example: {
        problem: r`A distribution panel is burning. What extinguisher do you use, and what changes once it is de-energized?`,
        solution: r`While live it is Class C: CO₂ or dry chemical, never water. De-energized, what still burns is ordinary Class A (or B) fuel.`,
      },
      traps: [r`Water on a live electrical fire can carry current back to the person holding the hose.`],
    },
    {
      name: 'Ergonomics',
      inShort: r`Fitting the work to the worker to prevent strain and injury.`,
      keyIdeas: [
        r`Musculoskeletal disorders come from force, awkward posture, repetition and vibration.`,
        r`NIOSH: $RWL = 23\ \text{kg} \times \frac{25}{H} \times VM \times DM \times AM \times FM \times CM$; lifting index = load ÷ RWL.`,
        r`Work-station design: elbow-height work, screens at eye level, rest breaks.`,
      ],
      example: {
        problem: r`A worker lifts 15 kg held 50 cm out from the ankles, otherwise at the reference posture. What is the recommended limit and the lifting index?`,
        solution: r`$RWL = 23 \times \frac{25}{50} = 11.5$ kg; $LI = \frac{15}{11.5} = 1.3$: above 1, so redesign the lift.`,
      },
      traps: [r`Keeping the load close to the body matters more than how heavy it is.`],
    },
    {
      name: 'Industrial Hygiene',
      inShort: r`Recognizing, measuring and controlling health hazards: noise, heat, dust and chemicals.`,
      keyIdeas: [
        r`Noise: 90 dBA for 8 h, halved per 5 dB; dose $D = \sum\frac{C_i}{T_i}$; 85 dBA starts a hearing program.`,
        r`Chemicals: $TWA = \frac{\sum C_it_i}{8}$ against the threshold limit value.`,
        r`Heat: $WBGT = 0.7T_{nwb} + 0.2T_g + 0.1T_{db}$ outdoors sets the work-rest cycle.`,
      ],
      example: {
        problem: r`A worker spends 4 h at 90 dBA, 2 h at 95 dBA and 1 h at 100 dBA. Is the exposure within limits?`,
        solution: r`$\frac{4}{8} + \frac{2}{4} + \frac{1}{2} = 1.5$: a dose of 150%, over the limit (about 92.9 dBA over 8 h).`,
      },
      traps: [r`Decibels don't add linearly: two 90 dBA machines make 93 dBA, not 180.`],
    },
    {
      name: 'First Aid and Emergency Response',
      inShort: r`Care until medical help arrives, and plans for when things go wrong.`,
      keyIdeas: [
        r`Check the scene is safe, call for help, then care for the victim.`,
        r`Adult CPR: 30 compressions to 2 breaths, 100–120 a minute, 5–6 cm deep; use an AED as soon as one arrives.`,
        r`Emergency plans: alarms, exits, assembly points, drills, trained first-aiders.`,
      ],
      example: {
        problem: r`A coworker collapses while holding a live cable. What do you do first?`,
        solution: r`Cut the power (or free them with a dry non-conductive object) before touching them; then check breathing, call for help and start CPR if needed.`,
      },
      traps: [r`Touching a shock victim still in contact with the source makes you a second victim.`],
    },
    {
      name: 'Safety Officers and Committees',
      inShort: r`The people who run a workplace's safety program.`,
      keyIdeas: [
        r`Every covered workplace needs an OSH committee and safety officers; how many, and of what level, depends on its size and risk.`,
        r`Safety officer levels SO1 to SO4 rise with training (the Basic OSH course and beyond) and experience.`,
        r`The committee plans and reviews the program, investigates accidents and meets regularly.`,
      ],
      example: {
        problem: r`Who usually sits on a workplace's OSH committee, and what does it do?`,
        solution: r`The employer or manager (chair), the safety officer (secretary), workers' representatives and the health personnel. It plans, monitors and reviews the OSH program and investigates accidents.`,
      },
      traps: [r`Check the current rules (DO 252-25) for staffing numbers: they changed with the 2025 revision.`],
    },
    {
      name: 'Reporting and Records',
      inShort: r`Recording and reporting accidents and illnesses, and measuring performance.`,
      keyIdeas: [
        r`Frequency rate $= \frac{N \times 10^6}{H}$, severity rate $= \frac{D \times 10^6}{H}$, per million employee-hours.`,
        r`Work accident and illness reports for each incident; the annual exposure data report by January 30.`,
        r`Dangerous occurrences and fatalities are reported to DOLE at once.`,
      ],
      example: {
        problem: r`500 workers each work 2000 h in a year, with 6 disabling injuries and 300 days lost. Find the frequency and severity rates and the average days lost per injury.`,
        solution: r`$H = 10^6$ h: FR $= 6$, SR $= 300$, and $\frac{300}{6} = 50$ days per injury.`,
      },
      traps: [r`US OSHA incidence rates use 200 000 hours, not a million: don't mix the two.`],
    },
  ],
};
