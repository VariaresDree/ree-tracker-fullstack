// Library › Lessons › ESAS › Electrical Standards & Practices
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// standardsLesson.test.js. Coverage cross-checked against Part I of a review
// center's PEC, standard practices and EE laws handout; the text, problems and
// figures are this app's own): written for the Philippine REE board, subtopic
// by subtopic in the syllabus's order. The PEC 2017 (Part 1) follows the US
// NEC chapter by chapter, so article numbers here are the PEC's (2.20,
// 4.30…). Long tables (unit loads, ampacities, grounding conductor sizes) are
// given as data in the examples: read the real values from the code.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Branch-circuit voltage drop, in percent of 230 V, for 20 A over L metres of wire of R' Ω/km.
export const dropPercent = (ohmPerKm) => (L) => ((2 * 20 * ohmPerKm * L) / 1000 / 230) * 100;

// Ampacity adjustment for the number of current-carrying conductors in a raceway or cable.
export const adjustment = (n) => {
  if (n <= 3) return 1;
  if (n <= 6) return 0.8;
  if (n <= 9) return 0.7;
  if (n <= 20) return 0.5;
  if (n <= 30) return 0.45;
  if (n <= 40) return 0.4;
  return 0.35;
};

// One driven rod, 16 mm in diameter, L metres long, in soil of rho Ω·m.
export const rodOhms = (rho, L) => (rho / (2 * Math.PI * L)) * (Math.log((4 * L) / 0.008) - 1);

// Dwelling lighting, small-appliance and laundry demand (VA) from the connected total.
export const dwellingDemand = (va) => Math.min(va, 3000) + 0.35 * Math.max(0, Math.min(va, 120000) - 3000) + 0.25 * Math.max(0, va - 120000);

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
      body: [
        r`The PEC's purpose is the **practical safeguarding of persons and property** from the hazards of electricity. It sets minimum requirements: an installation that meets it is essentially free from hazard, but not necessarily efficient, convenient or ready for growth. It is approved by the Board of Electrical Engineering under RA 7920 and enforced by the **Office of the Building Official**. Part 1 covers installations inside and on premises (including watercraft); Part 2, the utility's lines outside. It does not cover installations in railway rolling stock, aircraft or automotive vehicles.`,
        r`Its wording is exact: **mandatory** rules use "shall" or "shall not"; **permissive** rules use "shall be permitted"; **fine print notes** (FPN) and annexes explain but are not enforceable. From the utility to the outlets, the parts have names:`,
        {
          type: 'blocks',
          alt: 'From the utility to the outlets: the service drop or lateral and the service entrance conductors reach the service equipment, the main disconnect; feeders run from it to panelboards; branch circuits run from the last overcurrent device to the outlets.',
          caption: 'Service, feeder and branch circuit: each named by where it starts and ends.',
          blocks: [
            { id: 'utility', at: [0, 0], label: 'Utility' },
            { id: 'main', at: [0, 1], label: 'Service eq.' },
            { id: 'panel', at: [0, 2], label: 'Panelboard' },
            { id: 'outlets', at: [0, 3], label: 'Outlets' },
          ],
          links: [
            ['utility', 'main', { label: 'service' }],
            ['main', 'panel', { label: 'feeder' }],
            ['panel', 'outlets', { label: 'branch' }],
          ],
        },
        r`The **grounded conductor** (the neutral: white or gray) carries current every day; the **equipment grounding conductor** (green, or green with yellow stripes) carries current only during a fault. A **continuous load** runs at its maximum for 3 hours or more, and its circuit is sized for 125% of it.`,
      ],
      keyIdeas: [
        r`"Shall" is mandatory; "shall be permitted" is permissive; fine print notes explain but do not require.`,
        r`Branch circuit (last overcurrent device to the outlets), feeder (service to the last device), service (utility to the main disconnect).`,
        r`Grounded conductor (neutral: white or gray) is not the equipment grounding conductor (green, or green with yellow stripes).`,
        r`A continuous load runs at its maximum for 3 hours or more: size for 125% of it.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A continuous load',
          problem: r`A branch circuit feeds 16 A of office lighting that stays on all day and 4 A of other load. What rating must its breaker have?`,
          steps: [
            r`$1.25 \times 16 + 4 = 24$ A.`,
            r`The next standard size is a 25 A breaker (and conductors of at least 24 A).`,
          ],
          answer: r`25 A.`,
        },
        {
          level: 'board',
          title: 'What does the code say here?',
          problem: r`Classify each: (a) "Receptacles shall be listed." (b) "Busways shall be permitted to be installed where they are open." (c) A fine print note recommending a voltage drop limit. Who enforces the PEC on a new building?`,
          steps: [
            r`(a) Mandatory ("shall"). (b) Permissive ("shall be permitted").`,
            r`(c) Informational only: a fine print note is not enforceable.`,
            r`The Office of the Building Official.`,
          ],
          answer: r`Mandatory; permissive; informational; the Building Official.`,
        },
      ],
      traps: [
        r`The neutral is a current-carrying conductor; the green wire carries current only during a fault.`,
        r`Meeting the PEC means safe, not necessarily efficient or adequate for future loads.`,
      ],
      check: [
        { q: r`What is the purpose of the PEC?`, a: r`The practical safeguarding of persons and property from the hazards of electricity.` },
        { q: r`Is a fine print note enforceable?`, a: r`No: it is explanatory only.` },
      ],
    },
    {
      name: 'Wiring and Protection',
      inShort: r`Branch circuits, feeders, services, overcurrent protection and voltage drop (Chapter 2).`,
      body: [
        r`Chapter 2 sizes and protects circuits. A building is normally supplied by **one service**, with exceptions such as fire pumps, emergency and standby systems, very large loads, and different voltages or rate schedules. The overhead **service drop** must be at least 8 mm² copper (14 mm² aluminium) and keep its clearances:

| Over or from | Least clearance |
|---|---|
| a roof | 2500 mm |
| a service entrance, sidewalks for pedestrians only (≤ 150 V to ground) | 3000 mm |
| residential property and driveways (≤ 300 V to ground) | 3700 mm |
| the same, above 300 V to ground | 4500 mm |
| public streets, alleys, roads with truck traffic | 5500 mm |
| railway tracks | 7500 mm |
| windows that open | 900 mm |`,
        r`Underground, a **service lateral** is buried at least 600 mm when direct-buried, 450 mm in PVC approved for burial, or 150 mm in rigid or intermediate metal conduit. A long branch run loses voltage, $VD = 2IR'L$ single-phase: keep it to about 3% on a branch and 5% overall, which may mean a size larger than ampacity alone needs:`,
        {
          type: 'plot',
          alt: 'Voltage drop in percent of 230 volts against length from 0 to 80 metres for a 20 ampere branch circuit: wire of 5.2 ohms per kilometre crosses the 3 percent line at about 33 metres; wire of 3.3 ohms per kilometre, dashed, at about 52 metres.',
          caption: 'A 20 A, 230 V branch: 5.2 Ω/km wire passes 3% at about 33 m; 3.3 Ω/km (dashed) at about 52 m.',
          x: [0, 80],
          y: [0, 8],
          xLabel: 'one-way length (m)',
          yLabel: 'drop (%)',
          series: [
            { f: dropPercent(5.2), label: '5.2 Ω/km' },
            { f: dropPercent(3.3), label: '3.3 Ω/km', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ y: 3, label: '3%' }],
        },
        r`Overcurrent devices protect conductors; **GFCIs** protect people (bathrooms, kitchen counters near sinks, outdoors); **AFCIs** open on the current signature of an arcing fault. Every breaker needs an interrupting rating above the fault current available where it sits.`,
      ],
      keyIdeas: [
        r`Voltage drop: recommended at most 3% on a branch, 5% feeder plus branch. $VD = 2IR'L$ (1-phase), $\sqrt3 IR'L$ (3-phase).`,
        r`Overcurrent devices protect conductors; GFCIs protect people (bathrooms, kitchens near sinks, outdoors).`,
        r`Breakers need an interrupting rating above the available fault current $I_{FL}\frac{100}{\%Z}$.`,
        r`Service drop at least 8 mm² Cu; burial at least 600 mm direct, 450 mm in PVC, 150 mm in RMC or IMC.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Voltage drop on a branch',
          problem: r`A 230 V, 20 A branch circuit runs 40 m in wire of 5.2 Ω/km. Is the drop within 3%? What about wire of 3.3 Ω/km?`,
          steps: [
            r`$2 \times 20 \times 5.2 \times 0.04 = 8.32$ V, 3.6%: too much.`,
            r`With 3.3 Ω/km: $5.28$ V, 2.3%: acceptable.`,
          ],
          answer: r`No (3.6%); yes (2.3%).`,
        },
        {
          level: 'board',
          title: 'Fault current and clearances',
          problem: r`A 750 kVA, 400 V three-phase transformer has 5% impedance. What fault current must its main breaker interrupt? A 230 V service drop crosses a residential driveway, then a public street: what clearances does it need?`,
          steps: [
            r`$I_{FL} = \frac{750\,000}{\sqrt3 \times 400} = 1082.5$ A; $I_{SC} = 1082.5 \times \frac{100}{5} = 21\,651$ A, so a breaker rated at least 22 kA (in practice 25 kA).`,
            r`Over the driveway (≤ 300 V to ground): 3700 mm. Over the street: 5500 mm.`,
          ],
          answer: r`About 21.7 kA; 3700 mm and 5500 mm.`,
        },
      ],
      traps: [
        r`L is one-way length; the 2 already accounts for the return wire.`,
        r`Clearances rise with voltage to ground and with what passes underneath.`,
      ],
      check: [
        { q: r`What is the least clearance of a service drop above a public street with truck traffic?`, a: r`5500 mm.` },
        { q: r`How deep must a direct-buried service lateral be?`, a: r`At least 600 mm.` },
      ],
    },
    {
      name: 'Wiring Methods and Materials',
      inShort: r`Conductors, cables and raceways, and how much current they may carry (Chapter 3).`,
      body: [
        r`The PEC approves three families of wiring method: **conductors on insulators** (open wiring, knob-and-tube), **cables** (armored, metal-clad, nonmetallic-sheathed, mineral-insulated, service-entrance, tray cable) and **raceways** (rigid metal conduit, IMC, EMT, PVC, flexible conduit, surface raceways, wireways, busways, cable trays). Each has its own permitted uses.`,
        r`A conductor's table ampacity assumes a 30 °C ambient and no more than three current-carrying conductors together. Hotter surroundings and crowding both make it run hotter, so multiply by a temperature **correction** and a bundling **adjustment** that falls in steps:`,
        {
          type: 'plot',
          alt: 'The ampacity adjustment factor against the number of current-carrying conductors in a raceway, from 1 to 40: 1.0 up to 3, 0.80 for 4 to 6, 0.70 for 7 to 9, 0.50 for 10 to 20, 0.45 for 21 to 30 and 0.40 for 31 to 40.',
          caption: 'The adjustment factor falls in steps: 0.80 for 4–6 conductors, 0.70 for 7–9, 0.50 for 10–20.',
          x: [0, 41],
          y: [0, 1.1],
          xLabel: 'current-carrying conductors',
          yLabel: 'factor',
          series: [{ points: Array.from({ length: 40 }, (_, k) => [[k + 0.5, adjustment(k + 1)], [k + 1.5, adjustment(k + 1)]]).flat(), label: 'factor', area: true }],
          marks: [{ x: 5, label: '5' }],
        },
        r`The equipment grounding conductor never counts, and a neutral carrying only the unbalance of a balanced three-phase load doesn't either.`,
      ],
      keyIdeas: [
        r`Ampacity from the table, then $\times$ temperature correction $\times$ adjustment (0.80 for 4–6, 0.70 for 7–9, 0.50 for 10–20 current-carrying conductors).`,
        r`Conduit fill: 53% for one conductor, 31% for two, 40% for three or more.`,
        r`Raceways: rigid metal (RMC), IMC, EMT, PVC, flexible; each has its own permitted uses.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Five in a raceway',
          problem: r`A conductor rated 50 A in the table runs in 40 °C surroundings (factor 0.91) with five current-carrying conductors in the raceway. What is its ampacity?`,
          steps: [r`$50 \times 0.91 \times 0.80 = 36.4$ A.`],
          answer: r`36.4 A.`,
        },
        {
          level: 'board',
          title: 'Eight in a raceway',
          problem: r`A conductor's table ampacity is 65 A. It shares a raceway with seven other current-carrying conductors (plus a grounding conductor) at 35 °C, where the correction is 0.94. Find its ampacity.`,
          steps: [
            r`Eight current-carrying conductors (the grounding conductor doesn't count): adjustment 0.70.`,
            r`$65 \times 0.94 \times 0.70 = 42.8$ A.`,
          ],
          answer: r`42.8 A.`,
        },
      ],
      traps: [
        r`Equipment grounding conductors never count toward the adjustment.`,
        r`Apply BOTH factors: correction for heat, adjustment for crowding.`,
      ],
      check: [
        { q: r`What adjustment applies to 7 to 9 current-carrying conductors?`, a: r`70%.` },
        { q: r`What are the three families of approved wiring methods?`, a: r`Conductors on insulators, cables, and raceways.` },
      ],
    },
    {
      name: 'Equipment for General Use',
      inShort: r`Motors, transformers, capacitors, panelboards and appliances (Chapter 4).`,
      body: [
        r`Chapter 4 sizes the circuits of equipment. Motors draw far more when starting than when running, so their branch circuits split the jobs: conductors carry 125% of the full-load current, overloads trip on a sustained overload, and the short-circuit device is allowed well above the running current so the motor can start:

| Equipment | Rule |
|---|---|
| Motor branch conductors | $1.25I_{FLC}$ (FLC from the PEC tables, not the nameplate) |
| Motor feeder | $1.25I_{FLC}$ of the largest + the others |
| Motor overload | 125% of nameplate (115% if SF < 1.15 or rise > 40 °C) |
| Motor short-circuit device | inverse-time breaker 250%, dual-element fuse 175%, nontime fuse 300%, instantaneous 800% |
| Hermetic motor-compressor | conductors 125% of rated-load current; disconnect 115% |
| Generator conductors | 115% of nameplate current |
| Transformer, primary protection only | 125% of rated primary current |
| Capacitor conductors | 135% of rated current; discharge to 50 V within 1 minute |`,
        r`Feeder devices are sized from the largest motor's device plus the other loads, and rounded DOWN; branch devices may round UP to the next standard size.`,
      ],
      keyIdeas: [
        r`Motor branch conductors $1.25I_{FLC}$; feeder $1.25I_{FLC,\text{largest}} + \sum$ others (FLC from the PEC tables).`,
        r`Overloads 125% of nameplate (115% if SF < 1.15 and rise > 40 °C). Short-circuit device: inverse-time breaker 250%, dual-element fuse 175%, nontime fuse 300%, instantaneous 800%.`,
        r`Transformers: primary only 125%; capacitors' conductors 135% of rated current; generators' conductors 115%.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three motors on a feeder',
          problem: r`Three motors have table FLCs of 28, 17 and 11 A. Size the largest motor's branch conductors and inverse-time breaker, the feeder conductors and the feeder breaker.`,
          steps: [
            r`Branch: $1.25 \times 28 = 35$ A; breaker $2.5 \times 28 = 70$ A.`,
            r`Feeder: $35 + 17 + 11 = 63$ A.`,
            r`Feeder breaker $\le 70 + 17 + 11 = 98$ A, rounded DOWN to 90 A.`,
          ],
          answer: r`35 A and 70 A; 63 A and 90 A.`,
        },
        {
          level: 'board',
          title: 'A compressor and a generator',
          problem: r`A hermetic motor-compressor has a rated-load current of 22 A. Find its branch-conductor ampacity and the least rating of its disconnect. A generator's nameplate current is 40 A: what ampacity must the conductors to its first overcurrent device have?`,
          steps: [
            r`Conductors $1.25 \times 22 = 27.5$ A; disconnect $1.15 \times 22 = 25.3$ A.`,
            r`Generator conductors $1.15 \times 40 = 46$ A.`,
          ],
          answer: r`27.5 A; 25.3 A; 46 A.`,
        },
      ],
      traps: [
        r`Branch devices may round UP to the next standard size; feeder devices round DOWN.`,
        r`Use the PEC's table FLC for conductors and devices, the nameplate current for overloads.`,
      ],
      check: [
        { q: r`What percentage of rated current must capacitor conductors carry?`, a: r`135%.` },
        { q: r`What is the largest inverse-time breaker for a motor's short-circuit protection, as a percentage of FLC?`, a: r`250%.` },
      ],
    },
    {
      name: 'Special Occupancies',
      inShort: r`Places with extra hazards: explosive atmospheres, hospitals, places of assembly (Chapter 5).`,
      body: [
        r`Where the air itself can ignite, equipment must not be the spark. **Hazardous locations** are classed by what is in the air and divided by how often:

| Class | Hazard | Examples |
|---|---|---|
| I | flammable gases or vapours | gasoline stations, distilleries, paint spray booths |
| II | combustible dust | grain elevators, flour mills, coal pulverizers, firework makers |
| III | easily ignitable fibres and flyings | textile mills, sawmills, cotton gins |`,
        r`**Division 1** means the hazard is present in normal operation; **Division 2**, only when something goes wrong (a leak, a failure). The IEC zone system (Zones 0, 1, 2) is an alternative for gases. Explosionproof equipment is built to contain an explosion inside it and cool the escaping gases. Other special occupancies (health care facilities, places of assembly, theatres, carnivals, marinas, agricultural buildings) add their own rules, such as redundant grounding and essential electrical systems in hospitals.`,
      ],
      keyIdeas: [
        r`Hazardous locations: Class I gases and vapours, Class II combustible dust, Class III fibres and flyings.`,
        r`Division 1: the hazard is present in normal operation; Division 2: only when something goes wrong. The zone system (0, 1, 2) is the IEC alternative.`,
        r`Health care facilities need redundant grounding and essential electrical systems.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three classes',
          problem: r`Classify a gasoline dispensing area, a grain elevator and a cotton textile mill.`,
          steps: [r`Gasoline vapour: Class I. Grain dust: Class II. Cotton fibres: Class III.`],
          answer: r`Class I; II; III.`,
        },
        {
          level: 'board',
          title: 'Divisions',
          problem: r`Classify: (a) the inside of a paint spray booth; (b) a room storing sealed drums of solvent, which would release vapour only if one leaked; (c) a sawmill.`,
          steps: [
            r`(a) Vapour is present in normal operation: Class I, Division 1.`,
            r`(b) Vapour only on a failure: Class I, Division 2.`,
            r`(c) Wood fibres and flyings: Class III.`,
          ],
          answer: r`Class I Div 1; Class I Div 2; Class III.`,
        },
      ],
      traps: [
        r`Explosionproof equipment contains an internal explosion; it is not sealed against gas.`,
        r`Dust is Class II, fibres Class III: flour and sawdust are not the same class.`,
      ],
      check: [
        { q: r`What class is a location with combustible dust?`, a: r`Class II.` },
        { q: r`What does Division 2 mean?`, a: r`The hazard is present only under abnormal conditions, such as a leak.` },
      ],
    },
    {
      name: 'Special Equipment',
      inShort: r`Signs, cranes, elevators, welders, X-ray, pools, solar PV, fire pumps (Chapter 6).`,
      body: [
        r`Chapter 6 covers equipment with its own hazards or duty cycles. Some rules to know:

| Equipment | Rule |
|---|---|
| Solar PV | maximum circuit current $1.25I_{sc}$; conductors and protection at 125% of that ($1.56I_{sc}$) |
| Welders | supply conductors at the primary current times a duty-cycle multiplier (0.78 at 60%) |
| Signs and outline lighting | a branch circuit for them, computed at least 1200 VA |
| Swimming pools | bond every metal part within reach; GFCI for underwater lighting and receptacles nearby |
| Fire pumps | no overload protection: keep the pump running, even to its own destruction |`,
        r`PV is sized twice up because a module's short-circuit current can exceed its rating in bright sun, and because the conductors carry that current for hours (a continuous load).`,
      ],
      keyIdeas: [
        r`Solar PV: $I_{\max} = 1.25I_{sc}$; conductors and protection $1.25I_{\max} = 1.56I_{sc}$.`,
        r`Welders: supply conductors $I_1\sqrt{D}$ (the code's multipliers, e.g. 0.78 at 60% duty).`,
        r`Pools: bonding of all metal parts within reach, GFCI protection for underwater lighting.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A PV string and a welder',
          problem: r`A PV string has $I_{sc} = 10$ A. What current must its conductors carry? A welder with a 50 A primary runs at 60% duty: what ampacity do its supply conductors need?`,
          steps: [
            r`PV: $1.56 \times 10 = 15.6$ A.`,
            r`Welder: $50 \times 0.78 = 39$ A.`,
          ],
          answer: r`15.6 A; 39 A.`,
        },
        {
          level: 'board',
          title: 'A PV array output',
          problem: r`Twelve strings, each with $I_{sc} = 9.5$ A, combine into one output circuit. Find its maximum current and the least ampacity of its conductors.`,
          steps: [
            r`Combined $12 \times 9.5 = 114$ A; maximum $1.25 \times 114 = 142.5$ A.`,
            r`Conductors $1.25 \times 142.5 = 178.1$ A.`,
          ],
          answer: r`142.5 A; 178.1 A.`,
        },
      ],
      traps: [
        r`Fire pump circuits are sized to keep the pump running, even to its destruction: no overload protection.`,
        r`PV gets BOTH 125% factors: one for bright sun, one for continuous duty.`,
      ],
      check: [
        { q: r`What is the least load computed for a sign branch circuit?`, a: r`1200 VA.` },
        { q: r`Why does a fire pump have no overload protection?`, a: r`So it keeps running in a fire, even to its own destruction.` },
      ],
    },
    {
      name: 'Special Conditions',
      inShort: r`Emergency and standby systems, fire alarms, low-voltage circuits (Chapter 7).`,
      body: [
        r`When normal power fails, three tiers of backup take over, in order of how vital the loads are:

| System | Required by | Typical loads | Ready within |
|---|---|---|---|
| Emergency | law, for life safety | exit and egress lighting, fire alarms, fire pumps | 10 s |
| Legally required standby | a government body | ventilation, sewage pumping, communications | 60 s |
| Optional standby | the owner's choice | data centres, refrigeration, processes | — |`,
        r`Emergency wiring is kept apart from other wiring so a fault elsewhere can't take it out. Chapter 7 also covers fire alarm circuits and the low-energy Class 1, 2 and 3 remote-control and signalling circuits.`,
      ],
      keyIdeas: [
        r`Emergency systems (exit and egress lighting, fire alarms) must take over within 10 seconds.`,
        r`Legally required standby (required by a government body, within 60 seconds) and optional standby (for business needs) follow them.`,
        r`Emergency wiring stays separate from other wiring.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Exit signs',
          problem: r`Which system must supply a building's exit signs, and how fast must it come on?`,
          steps: [r`The emergency system (Article 7.00), within 10 seconds of losing normal power.`],
          answer: r`The emergency system, within 10 s.`,
        },
        {
          level: 'board',
          title: 'Which tier?',
          problem: r`Classify the backup for: (a) a hospital's egress lighting; (b) a sewage pumping station that an ordinance requires to keep running; (c) a bank's data centre.`,
          steps: [
            r`(a) Life safety: emergency.`,
            r`(b) Required by a government body but not life safety: legally required standby.`,
            r`(c) The owner's business need: optional standby.`,
          ],
          answer: r`Emergency; legally required standby; optional standby.`,
        },
      ],
      traps: [
        r`A generator that needs a manual start can't serve an emergency system on its own.`,
        r`"Required by law" doesn't make a load an EMERGENCY load: that tier is for life safety.`,
      ],
      check: [
        { q: r`Within how many seconds must an emergency system take over?`, a: r`10 seconds.` },
        { q: r`What tier serves loads the owner chooses to back up?`, a: r`Optional standby.` },
      ],
    },
    {
      name: 'Communications Systems',
      inShort: r`Telephone, data, radio, TV and cable systems inside buildings (Chapter 8).`,
      body: [
        r`Communication circuits run at low voltage but connect to lines outside that lightning and power-line faults can reach. So the code keeps them **apart from power conductors** (separate raceways, or barriers in shared boxes), puts a listed **primary protector** where an outside line enters, and **bonds** their grounding to the building's grounding electrode system so that surges can't drive a voltage between the two systems.`,
        r`Antennas and satellite dishes, community TV cable and network-powered broadband follow the same pattern: protect at the entrance, ground to the building's system, keep clear of power wiring.`,
      ],
      keyIdeas: [
        r`Communication cables are kept apart from power conductors (separate raceways or barriers).`,
        r`A primary protector at the entrance limits surges from outside lines.`,
        r`Communication grounding is bonded to the building's grounding electrode system.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A telephone entrance',
          problem: r`A telephone line enters a building. What must be installed where it enters, and where is its grounding conductor connected?`,
          steps: [r`A listed primary protector, as close as practicable to the entrance, grounded to the building's grounding electrode system (the intersystem bonding point).`],
          answer: r`A primary protector, grounded to the building's electrode system.`,
        },
        {
          level: 'board',
          title: 'A separate rod',
          problem: r`An installer drives a separate ground rod for a CATV cable, unconnected to the building's power grounding. What is wrong, and how is it fixed?`,
          steps: [
            r`During a surge the two electrodes can rise to different voltages, putting that difference across equipment connected to both.`,
            r`Bond the CATV electrode to the power grounding electrode system.`,
          ],
          answer: r`The electrodes must be bonded together.`,
        },
      ],
      traps: [
        r`Separate grounding electrodes for power and communications must be bonded together.`,
        r`Communication cables may not share a raceway with power conductors without a barrier.`,
      ],
      check: [
        { q: r`What device limits surges where an outside communication line enters?`, a: r`A primary protector.` },
        { q: r`Where is communication grounding connected?`, a: r`To the building's grounding electrode system.` },
      ],
    },
    {
      name: 'PEC Tables',
      inShort: r`Chapter 9: conduit fill, conductor dimensions and resistances.`,
      body: [
        r`Chapter 9 holds the data the rest of the code points to:

| Table | Gives |
|---|---|
| 1 | percent of conduit area that may be filled: 53% one conductor, 31% two, 40% three or more |
| 4 | the inside areas of each conduit type and size |
| 5 | the areas of insulated conductors |
| 8 | conductor properties: sizes, strands, dc resistance |
| 9 | ac resistance and reactance, for voltage drop |`,
        r`The 40% limit leaves room to pull the wires without damaging their insulation and lets heat escape. Annexes work through example load calculations.`,
      ],
      keyIdeas: [
        r`Table 1: percent fill (53/31/40%).`,
        r`Tables 4 and 5: conduit and conductor areas; Table 8: conductor properties (dc resistance); Table 9: ac resistance and reactance.`,
        r`Annexes give worked examples of load calculations.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three or four in a conduit',
          problem: r`Three conductors of 20 mm² each (with insulation) go in a conduit with 150 mm² inside. Is it allowed? Could a fourth be added?`,
          steps: [
            r`$\frac{60}{150} = 40\%$: exactly the limit, allowed.`,
            r`Four: $\frac{80}{150} = 53\%$: no.`,
          ],
          answer: r`Yes; no.`,
        },
        {
          level: 'board',
          title: 'Choosing a conduit',
          problem: r`Five insulated conductors of 35.3 mm² each go in a conduit of 491 mm² inside: what is the fill? For six of them, what inside area must the conduit have, at least?`,
          steps: [
            r`$\frac{5 \times 35.3}{491} = \frac{176.5}{491} = 35.9\%$, within 40%.`,
            r`Six: $\frac{6 \times 35.3}{0.40} = 529.5$ mm² at least.`,
          ],
          answer: r`35.9%; 529.5 mm².`,
        },
      ],
      traps: [
        r`Use the area WITH insulation, not the bare copper area.`,
        r`Two conductors get only 31%: the limit is lower than for three.`,
      ],
      check: [
        { q: r`What fill is allowed for three or more conductors?`, a: r`40%.` },
        { q: r`Which table gives ac resistance and reactance?`, a: r`Table 9.` },
      ],
    },
    {
      name: 'PEC Part 2',
      inShort: r`Electric supply and communication lines and stations: the utility side.`,
      body: [
        r`Part 2 governs the utility's side: overhead and underground supply and communication lines, substations and generating stations, and their grounding, clearances and mechanical strength. Clearances above ground, roads, railways and buildings rise with voltage, and must hold at the line's **worst sag**, when it is hottest or most loaded. A span sags as the square of its length:`,
        {
          type: 'plot',
          alt: 'The sag of a conductor weighing 5 newtons per metre at 10 kilonewtons tension against span length from 0 to 200 metres: rising as the square of the span, 0.625 metres at 100 metres and 2.5 metres at 200.',
          caption: 'Sag grows as the square of the span: 0.625 m at 100 m, four times that at 200 m (5 N/m, 10 kN).',
          x: [0, 200],
          y: [0, 2.8],
          xLabel: 'span (m)',
          yLabel: 'sag (m)',
          series: [{ f: (L) => (5 * L * L) / (8 * 10000), label: 'sag', area: true }],
          marks: [{ x: 100, label: '100 m' }],
        },
        r`Part 1 stops at the service point, where the utility's conductors meet the premises wiring.`,
      ],
      keyIdeas: [
        r`Covers overhead and underground lines, substations, and their grounding, clearances and strength.`,
        r`Clearances above ground, roads and buildings rise with voltage.`,
        r`Sag $s = \frac{wL^2}{8T}$ grows with temperature and ice; clearances must hold at the worst sag.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A 100 m span',
          problem: r`A conductor weighing 5 N/m spans 100 m at 10 kN tension. What is its sag?`,
          steps: [r`$\frac{5 \times 100^2}{8 \times 10\,000} = 0.625$ m.`],
          answer: r`0.625 m.`,
        },
        {
          level: 'board',
          title: 'A longer span over a road',
          problem: r`The same conductor spans 150 m between supports 10 m high, over a road needing 5.5 m clearance. Find the sag and the lowest point's height. Is it clear?`,
          steps: [
            r`$s = \frac{5 \times 150^2}{8 \times 10\,000} = 1.406$ m.`,
            r`Lowest point $10 - 1.406 = 8.59$ m, above 5.5 m: clear.`,
          ],
          answer: r`1.406 m; 8.59 m: yes.`,
        },
      ],
      traps: [
        r`Part 1 stops at the service point; the utility's lines follow Part 2.`,
        r`Check clearance at the WORST sag, not at installation.`,
      ],
      check: [
        { q: r`Doubling a span changes the sag how?`, a: r`It quadruples.` },
        { q: r`What does PEC Part 2 cover?`, a: r`The utility's supply and communication lines and stations.` },
      ],
    },
    {
      name: 'Grounding and Bonding',
      inShort: r`Connecting systems to earth, and metal parts to each other, so faults clear and people are safe.`,
      body: [
        r`**System grounding** connects a circuit conductor (the neutral) to earth, limiting voltage to ground. **Equipment grounding** connects exposed metal to the system's grounded conductor at the service, so a fault draws enough current to trip the breaker. **Bonding** joins metal parts into one path. The **main bonding jumper** joins the neutral and the grounding system at the service only: never downstream, or neutral current flows on the grounding conductors.`,
        r`A single driven rod must reach 25 Ω or less, or a second electrode is added at least 1.8 m away. Its resistance falls with length, but slowly:`,
        {
          type: 'plot',
          alt: 'Resistance of one 16 millimetre ground rod in soil of 100 ohm metres against its length from 1 to 6 metres: falling from 83 ohms at 1 metre, through 33.5 at 3 metres, to the 25 ohm line at about 4.2 metres.',
          caption: 'One rod in 100 Ω·m soil: 33.5 Ω at 3 m; it takes about 4.2 m to reach 25 Ω.',
          x: [1, 6],
          y: [0, 90],
          xLabel: 'rod length (m)',
          yLabel: 'R (Ω)',
          series: [{ f: (L) => rodOhms(100, L), label: 'R', area: true }],
          marks: [{ y: 25, label: '25 Ω' }],
        },
      ],
      keyIdeas: [
        r`Grounding limits voltage to earth; bonding makes metal parts one path so a fault trips the breaker.`,
        r`One rod: $R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$; over 25 Ω, add a rod at least 1.8 m away.`,
        r`Main bonding jumper joins the neutral and ground at the service only, never downstream.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Is one rod enough?',
          problem: r`A 3 m rod, 16 mm in diameter, is driven in soil of 100 Ω·m. What is its resistance? Is one rod enough?`,
          steps: [
            r`$\frac{100}{2\pi \times 3}\left(\ln\frac{4 \times 3}{0.008} - 1\right) = 5.31 \times (7.31 - 1) = 33.5$ Ω.`,
            r`Over 25 Ω, so a second rod is needed.`,
          ],
          answer: r`33.5 Ω: no.`,
        },
        {
          level: 'board',
          title: 'What soil would do?',
          problem: r`For the same 3 m, 16 mm rod, how low must the soil resistivity be for one rod to reach 25 Ω? How far apart must a second rod be?`,
          steps: [
            r`R is proportional to ρ: $\rho = 100 \times \frac{25}{33.49} = 74.6$ Ω·m.`,
            r`At least 1.8 m apart (farther is better).`,
          ],
          answer: r`74.6 Ω·m or less; at least 1.8 m.`,
        },
      ],
      traps: [
        r`Neutral and ground tied together in a subpanel put current on the grounding conductors.`,
        r`Rods closer than about their length share soil and help each other little.`,
      ],
      check: [
        { q: r`What is the most resistance a single rod may have before another is required?`, a: r`25 Ω.` },
        { q: r`Where is the main bonding jumper installed?`, a: r`At the service only.` },
      ],
    },
    {
      name: 'Load Computation',
      inShort: r`Adding up a building's load to size its feeders and service (Article 2.20).`,
      body: [
        r`Not everything in a building runs at once, so the code lets the load be reduced by **demand factors**. A dwelling's general lighting (unit load × floor area), plus 1500 VA for each small-appliance circuit and 1500 VA for laundry, is taken at 100% for the first 3000 VA, 35% up to 120 kVA, and 25% beyond:`,
        {
          type: 'plot',
          alt: 'Demand load against connected lighting, small-appliance and laundry load for a dwelling, from 0 to 20,000 volt-amperes: rising one for one to 3000, then at 35 percent; a 7380 volt-ampere connected load gives a 4533 volt-ampere demand.',
          caption: 'A dwelling’s demand: all of the first 3000 VA, then 35%. A 7380 VA connected load becomes 4533 VA.',
          x: [0, 20000],
          y: [0, 10000],
          xLabel: 'connected (VA)',
          yLabel: 'demand (VA)',
          series: [{ f: dwellingDemand, label: 'demand', area: true }],
          marks: [{ x: 7380, label: '7380' }],
        },
        r`Then add fixed appliances, the largest motor at 125%, and so on. The **neutral** may be reduced too: the first 200 A of unbalanced load at 100% and the rest at 70%, except electric-discharge lighting and other nonlinear loads, which get no reduction because their harmonics add in the neutral.`,
      ],
      keyIdeas: [
        r`General lighting = unit load (VA/m², by occupancy) × floor area; plus 1500 VA per small-appliance circuit and 1500 VA for laundry.`,
        r`Dwelling demand: first 3000 VA at 100%, up to 120 kVA at 35%, the rest at 25%.`,
        r`Non-dwelling receptacles 180 VA each; over 10 kVA at 50%. Neutral: first 200 A at 100%, the rest at 70%, no reduction for electric-discharge lighting.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A house',
          problem: r`A 120 m² house (unit load given as 24 VA/m²) has two small-appliance circuits and a laundry circuit. Find its lighting demand and the current at 230 V.`,
          steps: [
            r`$120 \times 24 + 2 \times 1500 + 1500 = 7380$ VA.`,
            r`Demand: $3000 + 0.35 \times 4380 = 4533$ VA.`,
            r`Current $\frac{4533}{230} = 19.7$ A.`,
          ],
          answer: r`4533 VA; 19.7 A.`,
        },
        {
          level: 'board',
          title: 'A reduced neutral',
          problem: r`A feeder's maximum unbalanced load is 120 A of electric-discharge lighting and 300 A of incandescent lighting. Find the neutral load.`,
          steps: [
            r`Electric-discharge lighting: no reduction, 120 A.`,
            r`Incandescent: first 200 A at 100%, the remaining 100 A at 70%: $200 + 70 = 270$ A.`,
            r`Neutral $120 + 270 = 390$ A.`,
          ],
          answer: r`390 A.`,
        },
      ],
      traps: [
        r`Apply the demand factors to the TOTAL lighting, small-appliance and laundry load, not separately.`,
        r`Never reduce the neutral for electric-discharge lighting.`,
      ],
      check: [
        { q: r`How much is allowed for each small-appliance circuit in a dwelling?`, a: r`1500 VA.` },
        { q: r`At what percentage is a dwelling's lighting load beyond 3000 VA (up to 120 kVA) taken?`, a: r`35%.` },
      ],
    },
    {
      name: 'Conductor and Overcurrent Sizing',
      inShort: r`Choosing conductors and protective devices that fit together.`,
      body: [
        r`Sizing runs in one order: find the load with the 125% rules, choose a conductor whose corrected ampacity covers it, choose a device that protects that conductor, and then check voltage drop, which on a long run may need a larger conductor than ampacity does.`,
        r`Devices come in standard ratings: 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400 A and up. Three-phase currents divide by $\sqrt3$ times the line voltage.`,
      ],
      keyIdeas: [
        r`Conductor ampacity ≥ the load (with the 125% rules); the device protects the conductor.`,
        r`Standard ratings: 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150… A.`,
        r`Check voltage drop after sizing for ampacity: long runs often need the larger size.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A transformer and a capacitor bank',
          problem: r`Size the primary-only fuse for a 75 kVA, 480 V three-phase transformer, and the conductors for a 50 kvar, 400 V capacitor bank.`,
          steps: [
            r`$I_p = \frac{75\,000}{\sqrt3 \times 480} = 90.2$ A; $1.25 \times 90.2 = 112.8$, so a 125 A fuse.`,
            r`Capacitor $\frac{50\,000}{\sqrt3 \times 400} = 72.2$ A; conductors $1.35 \times 72.2 = 97.4$ A.`,
          ],
          answer: r`125 A fuse; 97.4 A conductors.`,
        },
        {
          level: 'board',
          title: 'A service, sized and checked',
          problem: r`A building's computed demand is 180 kVA at 400 V three-phase. Find the service current and the main breaker's standard size. The service conductors run 60 m with 0.1 Ω/km: what is the drop?`,
          steps: [
            r`$I = \frac{180\,000}{\sqrt3 \times 400} = 259.8$ A: the next standard size is 300 A.`,
            r`$VD = \sqrt3 \times 259.8 \times 0.1 \times 0.06 = 2.70$ V, 0.675% of 400 V: fine.`,
          ],
          answer: r`259.8 A, 300 A main; 2.70 V (0.675%).`,
        },
      ],
      traps: [
        r`Three-phase current divides by $\sqrt3\,V_L$, not $V_L$.`,
        r`A larger device than the conductor's ampacity leaves the conductor unprotected.`,
      ],
      check: [
        { q: r`What standard rating follows 110 A?`, a: r`125 A.` },
        { q: r`What is checked after sizing conductors for ampacity?`, a: r`Voltage drop.` },
      ],
    },
    {
      name: 'IEC, IEEE and NEMA Standards',
      inShort: r`The international and US standards behind equipment ratings.`,
      body: [
        r`Equipment is rated to standards beyond the PEC. Insulation is classed by its maximum temperature: A 105, E 120, B 130, F 155, H 180 °C. Running hotter ages it fast: as a rule of thumb, life halves for every 10 °C over the rating:`,
        {
          type: 'plot',
          alt: 'Relative insulation life of a Class F winding, rated 155 degrees Celsius, against its operating temperature from 135 to 185 degrees: four times normal at 135, normal at 155, half at 165, a quarter at 175 and an eighth at 185.',
          caption: 'A Class F winding: each 10 °C over 155 °C halves its life (a quarter at 175 °C).',
          x: [135, 185],
          y: [0, 4.2],
          xLabel: 'winding temperature (°C)',
          yLabel: 'relative life',
          series: [{ f: (t) => 2 ** (-(t - 155) / 10), label: 'life', area: true }],
          marks: [{ x: 155, label: 'rated' }],
        },
        r`| Standard | Code | Means |
|---|---|---|
| IEC 60529 | IP first digit 0–6 | protection against solids (5 dust-protected, 6 dust-tight) |
| | IP second digit 0–8 | protection against water (4 splashing, 5 jets, 7 immersion) |
| NEMA enclosures | 1, 3R, 4, 4X, 12 | indoor; rainproof; hose-down; corrosion-resistant; industrial dust |
| IEEE C37.2 device numbers | 21, 27, 50/51, 52, 87 | distance; undervoltage; overcurrent; AC breaker; differential |`,
      ],
      keyIdeas: [
        r`Insulation classes: A 105, E 120, B 130, F 155, H 180 °C. Life roughly halves for every 10 °C over.`,
        r`IP code (IEC 60529): first digit solids (0–6), second water (0–8). NEMA enclosures: 1 indoor, 3R rain, 4 hose-down, 4X corrosion, 12 dust.`,
        r`IEEE/ANSI device numbers: 21 distance, 27 undervoltage, 50/51 overcurrent, 52 AC breaker, 87 differential.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A hot Class F motor',
          problem: r`A Class F motor's winding runs at 165 °C. Roughly how does that affect its insulation life? What does IP54 mean?`,
          steps: [
            r`It is 10 °C over the 155 °C rating, so about half the normal life.`,
            r`IP54: dust-protected (5) and splash-proof (4).`,
          ],
          answer: r`About half; dust-protected and splash-proof.`,
        },
        {
          level: 'board',
          title: 'Hotter still, and a coastal enclosure',
          problem: r`The same motor runs at 175 °C: what fraction of its life remains? Which NEMA enclosure suits a pump control panel at a seaside plant that is washed down with hoses?`,
          steps: [
            r`20 °C over: $2^{-2} = \frac14$ of normal life.`,
            r`Hose-down and corrosion resistance: NEMA 4X.`,
          ],
          answer: r`A quarter; NEMA 4X.`,
        },
      ],
      traps: [
        r`IP6x is dust-TIGHT; IP5x is only dust-protected.`,
        r`NEMA 4 resists hose-down; only 4X adds corrosion resistance.`,
      ],
      check: [
        { q: r`What is the temperature limit of Class H insulation?`, a: r`180 °C.` },
        { q: r`What IEEE device number is a differential relay?`, a: r`87.` },
      ],
    },
  ],
};
