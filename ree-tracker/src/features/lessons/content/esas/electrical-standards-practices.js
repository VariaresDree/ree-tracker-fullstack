// Library › Lessons › ESAS › Electrical Standards & Practices (2026-11-18):
// written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order; every worked example checked by computation. The PEC 2017
// (Part 1) follows the US NEC chapter by chapter, so article numbers here are
// the PEC's (2.20, 4.30…). Long tables (unit loads, ampacities, grounding
// conductor sizes) are given as data in the examples: read the real values
// from the code.
const r = String.raw;

export default {
  topic: 'Electrical Standards & Practices',
  subject: 'ESAS',
  overview: r`The Philippine Electrical Code (PEC) is the law for how electrical installations are designed and built, so that they are safe. Part 1 covers buildings and premises, in nine chapters that mirror the US NEC: general rules, wiring and protection, wiring methods, equipment, special occupancies, special equipment, special conditions, communications, and tables. Part 2 covers the utility's supply and communication lines. Most board items are a load computation or a sizing problem: find the load, apply the demand factors and the 125% rules, then choose conductors and protection from the tables.`,
  sources: [
    'Philippine Electrical Code 2017, Part 1 (IIEE)',
    'Philippine Electrical Code Part 2',
    'NFPA 70, National Electrical Code (the model the PEC follows)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'PEC General and Definitions',
      inShort: r`The code's purpose, scope, wording and the terms every rule depends on.`,
      keyIdeas: [
        r`"Shall" is mandatory; informational notes explain but do not require.`,
        r`Branch circuit (last overcurrent device to the outlets), feeder (service to the last device), service (utility to the main disconnect).`,
        r`Grounded conductor (neutral: white or gray) is not the equipment grounding conductor (green, or green with yellow stripes).`,
        r`A continuous load runs at its maximum for 3 hours or more: size for 125% of it.`,
      ],
      example: {
        problem: r`A branch circuit feeds 16 A of office lighting that stays on all day and 4 A of other load. What rating must its breaker have?`,
        solution: r`$1.25(16) + 4 = 24$ A, so the next standard size, a 25 A breaker (and conductors of at least 24 A).`,
      },
      traps: [r`The neutral is a current-carrying conductor; the green wire carries current only during a fault.`],
    },
    {
      name: 'Wiring and Protection',
      inShort: r`Branch circuits, feeders, services, overcurrent protection and voltage drop (Chapter 2).`,
      keyIdeas: [
        r`Voltage drop: recommended at most 3% on a branch, 5% feeder plus branch. $VD = 2IR'L$ (1-phase), $\sqrt3 IR'L$ (3-phase).`,
        r`Overcurrent devices protect conductors; GFCIs protect people (bathrooms, kitchens near sinks, outdoors).`,
        r`Breakers need an interrupting rating above the available fault current $I_{FL}\frac{100}{\%Z}$.`,
      ],
      example: {
        problem: r`A 230 V, 20 A branch circuit runs 40 m in wire of 5.2 Ω/km. Is the drop within 3%? What about wire of 3.3 Ω/km?`,
        solution: r`$2(20)(5.2)(0.04) = 8.32$ V, 3.6%: too much. With 3.3 Ω/km: $5.28$ V, 2.3%: acceptable.`,
      },
      traps: [r`L is one-way length; the 2 already accounts for the return wire.`],
    },
    {
      name: 'Wiring Methods and Materials',
      inShort: r`Conductors, cables and raceways, and how much current they may carry (Chapter 3).`,
      keyIdeas: [
        r`Ampacity from the table, then $\times$ temperature correction $\times$ adjustment (0.80 for 4–6, 0.70 for 7–9, 0.50 for 10–20 current-carrying conductors).`,
        r`Conduit fill: 53% for one conductor, 31% for two, 40% for three or more.`,
        r`Raceways: rigid metal (RMC), IMC, EMT, PVC, flexible; each has its own permitted uses.`,
      ],
      example: {
        problem: r`A conductor rated 50 A in the table runs in 40 °C surroundings (factor 0.91) with five current-carrying conductors in the raceway. What is its ampacity?`,
        solution: r`$50 \times 0.91 \times 0.80 = 36.4$ A.`,
      },
      traps: [r`Equipment grounding conductors never count toward the adjustment.`],
    },
    {
      name: 'Equipment for General Use',
      inShort: r`Motors, transformers, capacitors, panelboards and appliances (Chapter 4).`,
      keyIdeas: [
        r`Motor branch conductors $1.25I_{FLC}$; feeder $1.25I_{FLC,\text{largest}} + \sum$ others (FLC from the PEC tables).`,
        r`Overloads 125% of nameplate (115% if SF < 1.15 and rise > 40 °C). Short-circuit device: inverse-time breaker 250%, dual-element fuse 175%, nontime fuse 300%, instantaneous 800%.`,
        r`Transformers: primary only 125%; capacitors' conductors 135% of rated current.`,
      ],
      example: {
        problem: r`Three motors have table FLCs of 28, 17 and 11 A. Size the largest motor's branch conductors and inverse-time breaker, the feeder conductors and the feeder breaker.`,
        solution: r`Branch: $1.25(28) = 35$ A; breaker $2.5(28) = 70$ A. Feeder: $35 + 17 + 11 = 63$ A. Feeder breaker $\le 70 + 17 + 11 = 98$ A, rounded DOWN to 90 A.`,
      },
      traps: [r`Branch devices may round UP to the next standard size; feeder devices round DOWN.`],
    },
    {
      name: 'Special Occupancies',
      inShort: r`Places with extra hazards: explosive atmospheres, hospitals, places of assembly (Chapter 5).`,
      keyIdeas: [
        r`Hazardous locations: Class I gases and vapours, Class II combustible dust, Class III fibres and flyings.`,
        r`Division 1: the hazard is present in normal operation; Division 2: only when something goes wrong. The zone system (0, 1, 2) is the IEC alternative.`,
        r`Health care facilities need redundant grounding and essential electrical systems.`,
      ],
      example: {
        problem: r`Classify a gasoline dispensing area, a grain elevator and a cotton textile mill.`,
        solution: r`Gasoline vapour: Class I. Grain dust: Class II. Cotton fibres: Class III.`,
      },
      traps: [r`Explosionproof equipment contains an internal explosion; it is not sealed against gas.`],
    },
    {
      name: 'Special Equipment',
      inShort: r`Signs, cranes, elevators, welders, X-ray, pools, solar PV, fire pumps (Chapter 6).`,
      keyIdeas: [
        r`Solar PV: $I_{\max} = 1.25I_{sc}$; conductors and protection $1.25I_{\max} = 1.56I_{sc}$.`,
        r`Welders: supply conductors $I_1\sqrt{D}$ (the code's multipliers, e.g. 0.78 at 60% duty).`,
        r`Pools: bonding of all metal parts within reach, GFCI protection for underwater lighting.`,
      ],
      example: {
        problem: r`A PV string has $I_{sc} = 10$ A. What current must its conductors carry? A welder with a 50 A primary runs at 60% duty: what ampacity do its supply conductors need?`,
        solution: r`PV: $1.56(10) = 15.6$ A. Welder: $50 \times 0.78 = 39$ A.`,
      },
      traps: [r`Fire pump circuits are sized to keep the pump running, even to its destruction: no overload protection.`],
    },
    {
      name: 'Special Conditions',
      inShort: r`Emergency and standby systems, fire alarms, low-voltage circuits (Chapter 7).`,
      keyIdeas: [
        r`Emergency systems (exit and egress lighting, fire alarms) must take over within 10 seconds.`,
        r`Legally required standby (required by a government body) and optional standby (for business needs) follow them.`,
        r`Emergency wiring stays separate from other wiring.`,
      ],
      example: {
        problem: r`Which system must supply a building's exit signs, and how fast must it come on?`,
        solution: r`The emergency system (Article 7.00), within 10 seconds of losing normal power.`,
      },
      traps: [r`A generator that needs a manual start can't serve an emergency system on its own.`],
    },
    {
      name: 'Communications Systems',
      inShort: r`Telephone, data, radio, TV and cable systems inside buildings (Chapter 8).`,
      keyIdeas: [
        r`Communication cables are kept apart from power conductors (separate raceways or barriers).`,
        r`A primary protector at the entrance limits surges from outside lines.`,
        r`Communication grounding is bonded to the building's grounding electrode system.`,
      ],
      example: {
        problem: r`A telephone line enters a building. What must be installed where it enters, and where is its grounding conductor connected?`,
        solution: r`A listed primary protector, as close as practicable to the entrance, grounded to the building's grounding electrode system (the intersystem bonding point).`,
      },
      traps: [r`Separate grounding electrodes for power and communications must be bonded together.`],
    },
    {
      name: 'PEC Tables',
      inShort: r`Chapter 9: conduit fill, conductor dimensions and resistances.`,
      keyIdeas: [
        r`Table 1: percent fill (53/31/40%).`,
        r`Tables 4 and 5: conduit and conductor areas; Table 8: conductor properties (dc resistance); Table 9: ac resistance and reactance.`,
        r`Annexes give worked examples of load calculations.`,
      ],
      example: {
        problem: r`Three conductors of 20 mm² each (with insulation) go in a conduit with 150 mm² inside. Is it allowed? Could a fourth be added?`,
        solution: r`$\frac{60}{150} = 40\%$: exactly the limit, allowed. Four: $\frac{80}{150} = 53\%$: no.`,
      },
      traps: [r`Use the area WITH insulation, not the bare copper area.`],
    },
    {
      name: 'PEC Part 2',
      inShort: r`Electric supply and communication lines and stations: the utility side.`,
      keyIdeas: [
        r`Covers overhead and underground lines, substations, and their grounding, clearances and strength.`,
        r`Clearances above ground, roads and buildings rise with voltage.`,
        r`Sag $s = \frac{wL^2}{8T}$ grows with temperature and ice; clearances must hold at the worst sag.`,
      ],
      example: {
        problem: r`A conductor weighing 5 N/m spans 100 m at 10 kN tension. What is its sag?`,
        solution: r`$\frac{5(100)^2}{8(10\,000)} = 0.625$ m.`,
      },
      traps: [r`Part 1 stops at the service point; the utility's lines follow Part 2.`],
    },
    {
      name: 'Grounding and Bonding',
      inShort: r`Connecting systems to earth, and metal parts to each other, so faults clear and people are safe.`,
      keyIdeas: [
        r`Grounding limits voltage to earth; bonding makes metal parts one path so a fault trips the breaker.`,
        r`One rod: $R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$; over 25 Ω, add a rod at least 1.8 m away.`,
        r`Main bonding jumper joins the neutral and ground at the service only, never downstream.`,
      ],
      example: {
        problem: r`A 3 m rod, 16 mm in diameter, is driven in soil of 100 Ω·m. What is its resistance? Is one rod enough?`,
        solution: r`$\frac{100}{2\pi(3)}\left(\ln\frac{4(3)}{0.008} - 1\right) = 5.31(7.31 - 1) = 33.5$ Ω: over 25 Ω, so a second rod is needed.`,
      },
      traps: [r`Neutral and ground tied together in a subpanel put current on the grounding conductors.`],
    },
    {
      name: 'Load Computation',
      inShort: r`Adding up a building's load to size its feeders and service (Article 2.20).`,
      keyIdeas: [
        r`General lighting = unit load (VA/m², by occupancy) × floor area; plus 1500 VA per small-appliance circuit and 1500 VA for laundry.`,
        r`Dwelling demand: first 3000 VA at 100%, up to 120 kVA at 35%, the rest at 25%.`,
        r`Non-dwelling receptacles 180 VA each; over 10 kVA at 50%. Then add appliances, motors at 125% of the largest.`,
      ],
      example: {
        problem: r`A 120 m² house (unit load given as 24 VA/m²) has two small-appliance circuits and a laundry circuit. Find its lighting demand and the current at 230 V.`,
        solution: r`$120(24) + 2(1500) + 1500 = 7380$ VA. Demand: $3000 + 0.35(4380) = 4533$ VA. Current $\frac{4533}{230} = 19.7$ A.`,
      },
      traps: [r`Apply the demand factors to the TOTAL lighting, small-appliance and laundry load, not separately.`],
    },
    {
      name: 'Conductor and Overcurrent Sizing',
      inShort: r`Choosing conductors and protective devices that fit together.`,
      keyIdeas: [
        r`Conductor ampacity ≥ the load (with the 125% rules); the device protects the conductor.`,
        r`Standard ratings: 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150… A.`,
        r`Check voltage drop after sizing for ampacity: long runs often need the larger size.`,
      ],
      example: {
        problem: r`Size the primary-only fuse for a 75 kVA, 480 V three-phase transformer, and the conductors for a 50 kvar, 400 V capacitor bank.`,
        solution: r`$I_p = \frac{75\,000}{\sqrt3(480)} = 90.2$ A; $1.25(90.2) = 112.8$, so a 125 A fuse. Capacitor $\frac{50\,000}{\sqrt3(400)} = 72.2$ A; conductors $1.35(72.2) = 97.4$ A.`,
      },
      traps: [r`Three-phase current divides by $\sqrt3\,V_L$, not $V_L$.`],
    },
    {
      name: 'IEC, IEEE and NEMA Standards',
      inShort: r`The international and US standards behind equipment ratings.`,
      keyIdeas: [
        r`Insulation classes: A 105, E 120, B 130, F 155, H 180 °C. Life roughly halves for every 10 °C over.`,
        r`IP code (IEC 60529): first digit solids (0–6), second water (0–8). NEMA enclosures: 1 indoor, 3R rain, 4 hose-down, 4X corrosion, 12 dust.`,
        r`IEEE/ANSI device numbers: 21 distance, 27 undervoltage, 50/51 overcurrent, 52 AC breaker, 87 differential.`,
      ],
      example: {
        problem: r`A Class F motor's winding runs at 165 °C. Roughly how does that affect its insulation life? What does IP54 mean?`,
        solution: r`It is 10 °C over the 155 °C rating, so about half the normal life. IP54: dust-protected (5) and splash-proof (4).`,
      },
      traps: [r`IP6x is dust-TIGHT; IP5x is only dust-protected.`],
    },
  ],
};
