// Library › Lessons › EE › Electrical System & Illumination Design
// (2026-11-19; every subtopic in the module format 2026-11-24, with figures,
// examples a step at a time and checks; every number re-worked by
// sidLesson.test.js. Coverage and problem styles cross-checked against a review
// center's systems-and-illumination handout; the text, problems and figures are
// this app's own): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order. The PEC's sizing rules (continuous load, motor
// protection, conduit fill, ampacity correction, voltage-drop limits, dwelling
// demand factors) are in ESAS › Electrical Standards and Practices; this lesson
// applies them in a design.
const r = String.raw;

export default {
  topic: 'Electrical System & Illumination Design',
  subject: 'EE',
  overview: r`This is the design of a building's electrical system and its lighting, done the way a plan is checked for a permit. Compute the loads and apply the PEC demand factors; divide them into branch circuits; size feeders, the service and the transformer; choose conductors for ampacity and voltage drop; select overcurrent devices that also interrupt the available fault current; handle motors' starting currents; ground everything; and put it on plans with a panel schedule. Then light the spaces: the lumen method for average illuminance, the point-by-point method for specific spots, the right lamps and an efficient, code-compliant result including emergency lighting.`,
  sources: [
    'Philippine Electrical Code 2017, Part 1',
    'Electrical Design (Fajardo and Fajardo) and similar Philippine design references',
    'IES Lighting Handbook; NFPA 101 for emergency lighting',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Load Computation',
      inShort: r`Add up the connected loads, then apply the code's demand factors.`,
      body: [
        r`A design starts by estimating the load, two ways:`,
        r`| Method | Load |
|---|---|
| Design-load (outlets) | 100 VA per lighting outlet; 180 VA per convenience outlet |
| Area (dwelling) | 24 VA per m² of floor, excluding open porches |
| Area (office) | 28 VA/m² general lighting + 8 VA/m² general receptacles |
| Area (industrial) | 16 VA/m² |
| Dwelling extras | 1500 VA per small-appliance circuit and per laundry circuit |`,
        r`Not everything runs at once, so the code allows **demand factors**. For a dwelling, the general lighting (with the small-appliance and laundry circuits added in) counts in full for the first 3000 VA and at 35% above that:`,
        {
          type: 'plot',
          alt: 'Dwelling lighting demand against the connected lighting load: rising one for one to 3000 VA, then only 35 percent as fast; 8500 VA connected gives a demand of 4925 VA.',
          caption: 'Dwelling lighting demand: in full to 3000 VA, then 35%; 8500 VA connected counts as 4925 VA.',
          x: [0, 20000],
          y: [0, 10000],
          xLabel: 'connected (VA)',
          yLabel: 'demand (VA)',
          series: [{ f: (va) => (va <= 3000 ? va : 3000 + 0.35 * (va - 3000)), label: 'demand', area: true }],
          marks: [{ x: 8500, label: '8500 VA' }],
        },
        r`A range's demand is 8 kW for one range up to 12 kW, plus 5% for each kW above. A single residence with 10 kW or more initial load needs at least a 100 A service.`,
      ],
      keyIdeas: [
        r`Outlets: 100 VA per lighting outlet, 180 VA per convenience outlet; or by area (24 VA/m² dwelling).`,
        r`Dwelling lighting demand: first 3000 VA at 100%, the rest (up to 120 000 VA) at 35%.`,
        r`Range demand: 8 kW for one range up to 12 kW, plus 5% per kW above.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A house',
          problem: r`A house has 4000 VA of general lighting, two small-appliance circuits, one laundry circuit and a 16 kW range, at 230 V. Find the demand load and current.`,
          steps: [
            r`Lighting group $= 4000 + 3 \times 1500 = 8500$ VA, so $3000 + 0.35 \times 5500 = 4925$ VA.`,
            r`Range: 4 kW above 12, so $8 \times 1.20 = 9.6$ kW.`,
            r`Total $14\,525$ VA: $\frac{14\,525}{230} = 63.2$ A.`,
          ],
          answer: r`14 525 VA; 63.2 A.`,
        },
        {
          level: 'board',
          title: 'An office by the area method',
          problem: r`Estimate the general lighting and receptacle load of a 20 m by 15 m office.`,
          steps: [
            r`Area 300 m²: lighting $28 \times 300 = 8400$ VA; receptacles $8 \times 300 = 2400$ VA.`,
            r`Total 10 800 VA.`,
          ],
          answer: r`10 800 VA.`,
        },
      ],
      traps: [
        r`Small-appliance and laundry loads join the LIGHTING load before the demand factor is applied.`,
        r`Demand factors reduce the feeder and service, never the branch circuits.`,
      ],
      check: [
        { q: r`What design load does the outlet method give a convenience outlet?`, a: r`180 VA.` },
        { q: r`What is the dwelling area load per square metre?`, a: r`24 VA/m², excluding open porches.` },
      ],
    },
    {
      name: 'Branch Circuits',
      inShort: r`Divide the load into circuits of standard ratings, each loaded within its limit.`,
      body: [
        r`A branch circuit runs from the panel's last overcurrent device to the outlets. Its rating is its breaker's (15, 20, 30, 40, 50 A), and its conductors and devices must match. A load that runs three hours or more (**continuous**) may use only 80% of the rating, which is the same as sizing for 125% of the load.`,
        r`| Rule | Detail |
|---|---|
| Number of circuits | $\frac{S}{V \times I_{rating}}$, rounded UP (with 125% for continuous load) |
| Separate circuits | lighting apart from convenience outlets (except small occupancies under 15 A total) |
| Dwelling | at least two 20 A small-appliance circuits for the kitchen, one laundry circuit |
| GFCI | bathrooms, kitchens, outdoors: wherever water is near |`,
      ],
      keyIdeas: [
        r`$N = \frac{S}{VI_{rating}}$, rounded up; continuous loads at most 80% of the rating.`,
        r`Branch-circuit conductors and devices are rated for the circuit's breaker (15, 20, 30 A…).`,
        r`Separate circuits for appliances, receptacles and lighting; GFCI where water is near.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Lighting circuits',
          problem: r`A continuous lighting load of 24 kVA at 230 V is to be served by 20 A circuits. How many circuits?`,
          steps: [r`$N = \frac{24\,000 \times 1.25}{230 \times 20} = 6.52$, so 7 circuits.`],
          answer: r`7 circuits.`,
        },
        {
          level: 'board',
          title: 'Outlets on one circuit',
          problem: r`How many convenience outlets (180 VA each) may one 20 A, 230 V circuit serve if treated as continuous, and if not?`,
          steps: [
            r`Continuous: $\frac{230 \times 20 \times 0.8}{180} = 20.4$, so 20 outlets.`,
            r`Not continuous: $\frac{4600}{180} = 25.6$, so 25.`,
          ],
          answer: r`20 outlets (or 25 if not continuous).`,
        },
      ],
      traps: [
        r`Round the number of circuits UP, but the number of outlets per circuit DOWN.`,
        r`The 80% rule applies to continuous loads only.`,
      ],
      check: [
        { q: r`What may a 30 A circuit carry continuously?`, a: r`24 A (80%).` },
        { q: r`Where is GFCI protection needed?`, a: r`Bathrooms, kitchen counters, outdoors and other wet locations.` },
      ],
    },
    {
      name: 'Feeders and Services',
      inShort: r`Feeders carry the demand of the circuits they serve; the service brings power into the building.`,
      body: [
        r`The **service** brings power into the building to a main breaker; **feeders** carry it from the main distribution panel to the panelboards; branch circuits take it the rest of the way. The arrangement is drawn as a single-line (riser) diagram:`,
        {
          type: 'circuit',
          alt: 'A building single-line diagram: the utility transformer feeds a main breaker into the main distribution panel bus, from which two feeder breakers supply panel A and panel B.',
          caption: 'Transformer, main breaker, main distribution panel, and feeders to panelboards A and B.',
          parts: [
            ['xfmr', [0, 1], [2, 1], 'T'],
            ['cb', [2, 1], [3, 1], 'main'],
            ['bus', [3, 0], [3, 2], 'MDP'],
            ['cb', [3, 0.5], [4, 0.5]],
            ['load', [4, 0.5], [5.5, 0.5], 'A'],
            ['cb', [3, 1.5], [4, 1.5]],
            ['load', [4, 1.5], [5.5, 1.5], 'B'],
          ],
        },
        r`A feeder carries the demand of everything downstream: for motors, 125% of the largest motor's full-load current plus the others' full-load currents and any other load. The transformer is sized from the demand kVA, $\frac{P}{\text{pf}}$, rounded up to a standard size.`,
      ],
      keyIdeas: [
        r`Feeder load = sum of branch demand loads (largest motor at 125%, plus the others).`,
        r`Transformer $\ge \frac{P_{demand}}{\text{pf}}$, next standard size; service current $\frac{S}{\sqrt3V_L}$.`,
        r`Service conductors and main breaker sized to the demand load, with the continuous-load rule.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Transformer and service',
          problem: r`A building has a 400 kW demand at 0.85 pf, served at 400 V three-phase. Size the transformer and find the service current.`,
          steps: [
            r`$\frac{400}{0.85} = 470.6$ kVA, so 500 kVA.`,
            r`$I = \frac{500\,000}{\sqrt3 \times 400} = 722$ A.`,
          ],
          answer: r`500 kVA; 722 A.`,
        },
        {
          level: 'board',
          title: 'A feeder with motors',
          problem: r`A feeder supplies motors of 28, 40 and 65 A full-load current and 50 A of other load. Find the required ampacity.`,
          steps: [r`$1.25 \times 65 + 28 + 40 + 50 = 199.25$ A.`],
          answer: r`At least 199.25 A.`,
        },
      ],
      traps: [
        r`Size from the DEMAND load, not the connected load.`,
        r`Only the LARGEST motor gets the 125%.`,
      ],
      check: [
        { q: r`What is a feeder?`, a: r`The circuit between the service equipment (or main panel) and a branch-circuit panelboard.` },
        { q: r`What size transformer for 280 kW at 0.8 pf?`, a: r`350 kVA, so the next standard size above it: 500 kVA.` },
      ],
    },
    {
      name: 'Conductor and Conduit Sizing',
      inShort: r`A conductor must carry the current (ampacity) and keep the voltage drop small.`,
      body: [
        r`Two tests size a conductor, and the larger result wins. **Ampacity**: the table rating, reduced by correction factors for high ambient temperature and adjustment factors for more than three current-carrying conductors together, must be at least the load (125% for continuous). **Voltage drop**: the conductor's area must keep the drop within the limit, $\text{CM} = \frac{kKIL}{\text{VD}}$ (K about 10.4 Ω·cmil/ft for copper, k = 2 single phase or $\sqrt3$ three phase, L one way in feet).`,
        r`| Conductors in conduit | Maximum fill |
|---|---|
| 1 | 53% |
| 2 | 31% |
| 3 or more | 40% |`,
      ],
      keyIdeas: [
        r`Ampacity after correction and adjustment factors ≥ the load (125% for continuous).`,
        r`For drop: $\text{CM} = \frac{kKIL}{\text{VD}}$, $k = 2$ single phase, $\sqrt3$ three phase; take the larger of the two sizes.`,
        r`Conduit fill: 40% for three or more conductors.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sizing for drop',
          problem: r`A 230 V, 60 A single-phase load is 200 ft away. What copper area keeps the drop to 3%?`,
          steps: [
            r`VD $= 0.03 \times 230 = 6.9$ V.`,
            r`$\text{CM} = \frac{2 \times 10.4 \times 60 \times 200}{6.9} = 36\,174$ cmil: #4 AWG (41 740 cmil), if its ampacity is enough.`,
          ],
          answer: r`About 36 200 cmil: #4 AWG.`,
        },
        {
          level: 'board',
          title: 'Conduit fill',
          problem: r`Four conductors, each 50 mm² overall (with insulation), go in one conduit. What internal area must the conduit have?`,
          steps: [r`Three or more conductors: 40% fill, so $\frac{4 \times 50}{0.40} = 500$ mm².`],
          answer: r`At least 500 mm².`,
        },
      ],
      traps: [
        r`L is the ONE-WAY length; the 2 already covers the return.`,
        r`Conduit fill uses the conductor's OVERALL area, insulation included.`,
      ],
      check: [
        { q: r`What fill is allowed for two conductors in a conduit?`, a: r`31%.` },
        { q: r`Which governs conductor size: ampacity or drop?`, a: r`Whichever needs the larger conductor.` },
      ],
    },
    {
      name: 'Overcurrent Protection',
      inShort: r`Devices that protect conductors from overload and interrupt faults safely.`,
      body: [
        r`A breaker or fuse protects the conductor after it: its rating must not exceed the conductor's ampacity (the next standard size up is allowed in some cases). A **thermal-magnetic** breaker has two parts: a thermal element that trips slowly on overload, faster the larger the overload, and a magnetic element that trips at once on a short circuit:`,
        {
          type: 'plot',
          alt: 'The trip time of a thermal-magnetic breaker against current as a multiple of its rating, log scale: long times on light overload, falling as the overload grows, then dropping to an instant trip at ten times the rating.',
          caption: 'A thermal-magnetic breaker: slow thermal trips on overload, an instant magnetic trip from 10× rating.',
          x: [2, 30],
          logX: true,
          y: [0, 400],
          xLabel: 'I / I_{rating}',
          yLabel: 't (s)',
          series: [{ f: (m) => (m >= 10 ? 0.02 : 1000 / (m * m - 1)), label: 't', area: true }],
          marks: [{ x: 10, label: 'magnetic' }],
        },
        r`Every device must also INTERRUPT the largest fault current available where it is installed: its **interrupting rating** (in kA) must be at least that. And devices in series should be **coordinated**, so the one nearest the fault opens first.`,
      ],
      keyIdeas: [
        r`Rating ≤ conductor ampacity (next standard size allowed in some cases).`,
        r`Interrupting rating ≥ available fault current at the device.`,
        r`Coordination: the device nearest the fault opens first.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Interrupting rating at a transformer',
          problem: r`A main breaker sits right at a 500 kVA, 400 V transformer with 5% impedance. What interrupting rating does it need at least?`,
          steps: [
            r`Full-load current 721.7 A: $I_{sc} = \frac{721.7}{0.05} = 14.4$ kA with an infinite source.`,
            r`Choose at least the next standard rating above (22 or 25 kA), plus any motor contribution.`,
          ],
          answer: r`At least 14.4 kA: a 22 or 25 kA breaker.`,
        },
        {
          level: 'board',
          title: 'Reading the trip curve',
          problem: r`For the breaker in the figure (thermal $t = \frac{1000}{M^2 - 1}$ s), how long does it take at 2× and 5× rating, and at 12×?`,
          steps: [
            r`2×: $\frac{1000}{3} = 333$ s. 5×: $\frac{1000}{24} = 41.7$ s.`,
            r`12×: above the 10× magnetic pickup, so it trips at once.`,
          ],
          answer: r`333 s; 41.7 s; instantly.`,
        },
      ],
      traps: [
        r`A breaker that carries the load but cannot interrupt the fault can explode.`,
        r`The breaker protects the WIRE, so it is sized to the conductor, not to the load.`,
      ],
      check: [
        { q: r`What does the magnetic element of a breaker respond to?`, a: r`Short-circuit currents: it trips instantly.` },
        { q: r`What must a breaker's interrupting rating exceed?`, a: r`The available fault current where it is installed.` },
      ],
    },
    {
      name: 'Motor Circuits',
      inShort: r`Motors draw several times their running current to start; circuits are sized around that.`,
      body: [
        r`A motor draws several times its full-load current to start, so its circuit's short-circuit protection must be set high enough to let it start, while separate overload protection guards the running motor. All sizing uses the code table's full-load current (FLC):`,
        r`| Item | Size |
|---|---|
| Branch conductors | 125% of FLC |
| Disconnect | at least 115% of FLC |
| Inverse-time circuit breaker | up to 250% of FLC (150% with a reduced-voltage starter) |
| Non-time-delay fuse | up to 300% of FLC (200% with a starter) |
| Overload relay | about 115% to 125% of nameplate current |`,
        r`The starting (locked-rotor) current comes from the NEMA code letter, $I_{LR} = \frac{(\text{kVA/hp}) \times \text{hp} \times 1000}{\sqrt3V}$, and it dips the bus voltage by about $\frac{S_{LR}}{S_{sc} + S_{LR}}$.`,
      ],
      keyIdeas: [
        r`Conductors 125% FLC; disconnect ≥ 1.15 FLC; CB up to 250%, non-time-delay fuse up to 300% (150% and 200% with starters).`,
        r`Locked-rotor current from the code letter: $\frac{(\text{kVA/hp})\,\text{hp} \times 1000}{\sqrt3V}$.`,
        r`Starting dip $\frac{S_{LR}}{S_{sc} + S_{LR}}$; large dips call for reduced-voltage starting.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Starting current and dip',
          problem: r`A 50 hp, 460 V, code G motor (65 A FLC) starts on a bus with 10 MVA short-circuit capacity. Find its locked-rotor current, the minimum disconnect rating and the voltage dip.`,
          steps: [
            r`$I_{LR} = \frac{6.29 \times 50 \times 1000}{\sqrt3 \times 460} = 395$ A, $S_{LR} = 314.5$ kVA.`,
            r`Disconnect $\ge 1.15 \times 65 = 74.8$ A.`,
            r`Dip $= \frac{314.5}{10\,314.5} = 3.0\%$.`,
          ],
          answer: r`395 A; 74.8 A; 3.0%.`,
        },
        {
          level: 'board',
          title: 'Sizing one motor circuit',
          problem: r`A motor has a code-table FLC of 32 A on across-the-line starting. Find the conductor ampacity and the largest inverse-time breaker and non-time-delay fuse; then the breaker limit with a reduced-voltage starter.`,
          steps: [
            r`Conductors: $1.25 \times 32 = 40$ A.`,
            r`Breaker $\le 2.5 \times 32 = 80$ A; fuse $\le 3 \times 32 = 96$ A.`,
            r`With a starter: breaker $\le 1.5 \times 32 = 48$ A.`,
          ],
          answer: r`40 A; 80 A breaker, 96 A fuse; 48 A with a starter.`,
        },
      ],
      traps: [
        r`Use the code TABLE full-load current, not the nameplate, for conductors and protection.`,
        r`The short-circuit device is NOT the overload protection: a motor needs both.`,
      ],
      check: [
        { q: r`What percentage of FLC sizes a motor's branch conductors?`, a: r`125%.` },
        { q: r`What does the code letter give?`, a: r`Locked-rotor kVA per horsepower.` },
      ],
    },
    {
      name: 'Voltage Drop',
      inShort: r`Keep the drop within 3% on a branch and 5% overall (PEC recommendation).`,
      body: [
        r`The drop in a run is $\text{VD} = kIL(R'\cos\theta + X'\sin\theta)$, or $kIR'L$ for a resistive load (k = 2 single phase, $\sqrt3$ three phase, per-unit-length values). With several loads along one feeder, the drop to the end is the sum of each load's **moment**, current times its distance from the source: $\text{VD} = kr\sum I_jL_j$:`,
        {
          type: 'plot',
          alt: 'Voltage drop along a 230 V feeder with 20 A at 30 m, 15 A at 60 m and 10 A at 100 m: rising steeply at first, more slowly after each load, to 10 V at the end, past the 6.9 V 3 percent limit.',
          caption: 'The drop builds along the feeder and passes the 3% limit (6.9 V) before the last load.',
          x: [0, 100],
          y: [0, 12],
          xLabel: 'distance (m)',
          yLabel: 'drop (V)',
          series: [{ f: (x) => 0.004 * (20 * Math.min(x, 30) + 15 * Math.min(x, 60) + 10 * Math.min(x, 100)), label: 'drop', area: true }],
          marks: [{ y: 6.9, label: '3% = 6.9 V' }],
        },
        r`A drop over the limit is cured by a larger conductor, a shorter run (move the panel to the load centre), or a higher voltage.`,
      ],
      keyIdeas: [
        r`$\text{VD} = kIL(R'\cos\theta + X'\sin\theta)$; for resistive loads $kIR'L$.`,
        r`Several loads along a feeder: $\text{VD} = kr\sum I_jL_j$ (moments).`,
        r`Fix a large drop with a bigger conductor, a shorter run, or a higher voltage.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three loads on one feeder',
          problem: r`A 230 V single-phase feeder ($r = 0.002$ Ω/m per conductor) supplies 20 A at 30 m, 15 A at 60 m and 10 A at 100 m. Find the drop at the end.`,
          steps: [r`$\text{VD} = 2 \times 0.002(20 \times 30 + 15 \times 60 + 10 \times 100) = 10$ V, 4.35%.`],
          answer: r`10 V, 4.35%: over 3%.`,
        },
        {
          level: 'board',
          title: 'The conductor that meets 3%',
          problem: r`What resistance per metre would bring the same feeder within 3%?`,
          steps: [r`$r \le \frac{6.9}{2 \times 2500} = 0.00138$ Ω/m per conductor.`],
          answer: r`At most 0.00138 Ω/m.`,
        },
      ],
      traps: [
        r`Each load's distance is from the SOURCE, not from the previous load.`,
        r`3% is for a feeder or a branch; 5% is the total for both.`,
      ],
      check: [
        { q: r`What is 3% of 230 V?`, a: r`6.9 V.` },
        { q: r`Why put a panel near the centre of its load?`, a: r`It shortens the runs and so the voltage drop.` },
      ],
    },
    {
      name: 'Short-Circuit Calculation',
      inShort: r`Find the fault current at each panel to choose interrupting ratings.`,
      body: [
        r`Each panel's breakers must interrupt the fault current available at that panel. At a transformer's terminals (infinite source) it is $\frac{I_{FL}}{Z_{pu}}$; the utility's own impedance lowers it, which the **MVA method** handles simply: each element's short-circuit MVA ($\frac{\text{MVA}}{Z_{pu}}$), combined like conductances in series ($\frac{1}{\sum 1/\text{MVA}_i}$) and added for parallel sources. Down a cable the **point-to-point** method reduces it by $\frac{1}{1 + f}$, with f growing with the cable's length:`,
        {
          type: 'plot',
          alt: 'Fault current along a cable from a 30 kA bus, by the point-to-point method: 30 kA at the bus, 20.9 kA 50 m away, falling slowly to about 11 kA at 200 m.',
          caption: 'Fault current falls along a cable from a 30 kA bus: 20.9 kA at 50 m (f = 0.433).',
          x: [0, 200],
          y: [0, 32],
          xLabel: 'cable length (m)',
          yLabel: 'I_{sc} (kA)',
          series: [{ f: (L) => 30 / (1 + (0.433 * L) / 50), label: 'I', area: true }],
          marks: [{ x: 50, label: '50 m' }],
        },
        r`Running motors feed the fault too, about four times their full-load current, for the first cycles.`,
      ],
      keyIdeas: [
        r`At a transformer: $\frac{I_{FL}}{Z_{pu}}$; down a cable: point-to-point, $\frac{I_1}{1 + f}$.`,
        r`MVA method: series elements $\frac{1}{\sum 1/\text{MVA}_i}$, parallel sources add.`,
        r`Running motors add about 4 × their full-load current.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'MVA method and point-to-point',
          problem: r`A 2 MVA, 6% transformer is fed from a 500 MVA utility at 480 V. Find the secondary fault current by the MVA method. A panel downstream has $f = 0.433$ from 30 kA: what is its fault current?`,
          steps: [
            r`Transformer $\frac{2}{0.06} = 33.3$ MVA; total $\frac{1}{1/500 + 1/33.3} = 31.25$ MVA.`,
            r`$\frac{31.25 \times 10^6}{\sqrt3 \times 480} = 37.6$ kA. Panel: $\frac{30}{1.433} = 20.9$ kA.`,
          ],
          answer: r`37.6 kA; 20.9 kA.`,
        },
        {
          level: 'board',
          title: 'With an infinite source',
          problem: r`What would the same transformer's secondary fault current be if the utility were taken as infinite?`,
          steps: [r`$\frac{33.3 \times 10^6}{\sqrt3 \times 480} = 40.1$ kA: 7% higher than with the utility's impedance.`],
          answer: r`40.1 kA.`,
        },
      ],
      traps: [
        r`The utility's impedance matters: assuming an infinite source overstates the fault current.`,
        r`Use the fault current at the device's own location, not at the transformer.`,
      ],
      check: [
        { q: r`Two sources of 100 and 50 MVA feed a bus in parallel. What is the bus's short-circuit MVA?`, a: r`150 MVA.` },
        { q: r`About how much fault current does a running motor add?`, a: r`About 4 times its full-load current.` },
      ],
    },
    {
      name: 'Grounding',
      inShort: r`Ground the system and bond equipment so faults clear and people stay safe.`,
      body: [
        r`**Grounding** connects the system's neutral to earth at the service, through a grounding electrode, which holds voltages steady and gives lightning and surges a path. **Bonding** ties every exposed metal part together and back to the neutral at the service through equipment grounding conductors, so a fault to a metal case draws enough current to trip the breaker at once.`,
        r`A single rod over 25 Ω needs a supplemental electrode at least 1.8 m away. Rods in parallel help less than their number suggests, because their fields overlap ($\frac{R_1}{n}F$, F about 1.2 to 1.5):`,
        {
          type: 'plot',
          alt: 'Resistance of parallel ground rods against their number, each 40 ohms alone, with an overlap factor of 1.2: 40 ohms for one, 24 for two, 16 for three, falling slowly; the 25 ohm limit is drawn across.',
          caption: 'Rods of 40 Ω in parallel (F = 1.2): two meet the 25 Ω limit at 24 Ω.',
          x: [1, 6],
          y: [0, 45],
          xLabel: 'number of rods',
          yLabel: 'R (Ω)',
          series: [{ f: (n) => (n < 2 ? 40 : (40 / Math.floor(n)) * 1.2), label: 'R', area: true }],
          marks: [{ y: 25, label: '25 Ω limit' }],
        },
        r`Neutral and ground are bonded at the service only; bonding them again downstream puts neutral current on the grounding conductors and metal enclosures.`,
      ],
      keyIdeas: [
        r`Grounding electrode: a single rod above 25 Ω needs a supplemental electrode at least 1.8 m away.`,
        r`Rods in parallel: $\frac{R_1}{n}F$, F ≈ 1.2 to 1.5 at ordinary spacing.`,
        r`Equipment grounding conductors sized by the overcurrent device rating; bond neutral and ground only at the service.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A rod over the limit',
          problem: r`A ground rod measures 40 Ω. What must be done, and what is the likely resistance with a second rod (F = 1.2)?`,
          steps: [r`It exceeds 25 Ω: add a second electrode. $\frac{40}{2} \times 1.2 = 24$ Ω.`],
          answer: r`Add an electrode; about 24 Ω.`,
        },
        {
          level: 'board',
          title: 'Three rods',
          problem: r`With three such rods and F = 1.3 (more overlap), what is the resistance?`,
          steps: [r`$\frac{40}{3} \times 1.3 = 17.3$ Ω.`],
          answer: r`About 17.3 Ω.`,
        },
      ],
      traps: [
        r`Bonding neutral to ground downstream of the service puts neutral current on the grounding conductors.`,
        r`Rods closer than about their own length interfere: spacing matters.`,
      ],
      check: [
        { q: r`What is bonding for?`, a: r`Joining metal parts so a fault draws enough current to trip the breaker, and no voltage appears between them.` },
        { q: r`Where are neutral and ground bonded?`, a: r`At the service only.` },
      ],
    },
    {
      name: 'Plans and Specifications',
      inShort: r`The drawings and documents that describe the installation for a permit and for building it.`,
      body: [
        r`| Document | Shows |
|---|---|
| Lighting and power layouts | outlets, switches, fixtures, home runs |
| Riser / single-line diagram | service, feeders, panels, transformers |
| Panel schedules | each circuit's load, breaker, wire and phase |
| Load computation | the design and demand loads |
| Legend and notes | symbols and general requirements |
| Specifications | materials, standards and workmanship |`,
        r`A **panel schedule** spreads the single-phase circuits over the phases so the currents balance, within about 10%: an unbalanced panel overloads one phase and the neutral while the others idle. The plans are signed and sealed by a Professional Electrical Engineer.`,
      ],
      keyIdeas: [
        r`Plans: lighting and power layouts, riser diagram, single-line diagram, panel schedules, legend.`,
        r`Panel schedule: each circuit's load, breaker and phase; balance the phases within about 10%.`,
        r`Specifications state materials, standards and workmanship; a registered PEE signs the plans.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Is the panel balanced?',
          problem: r`A panel's phase loads are 120, 100 and 95 A. Is it balanced?`,
          steps: [r`Average 105 A; unbalance $\frac{120 - 105}{105} = 14.3\%$: over 10%.`],
          answer: r`No: 14.3%; move circuits from the 120 A phase.`,
        },
        {
          level: 'board',
          title: 'Moving one circuit',
          problem: r`A 10 A circuit is moved from the 120 A phase to the 100 A phase. What is the unbalance now?`,
          steps: [r`Phases 110, 110, 95 A; average 105 A; $\frac{110 - 105}{105} = 4.8\%$.`],
          answer: r`4.8%: within 10%.`,
        },
      ],
      traps: [
        r`An unbalanced panel overloads one phase and the neutral while others are lightly used.`,
        r`Unbalance is measured from the AVERAGE phase current.`,
      ],
      check: [
        { q: r`Which drawing shows the service, feeders and panels in one view?`, a: r`The riser (single-line) diagram.` },
        { q: r`Who signs the electrical plans?`, a: r`A Professional Electrical Engineer.` },
      ],
    },
    {
      name: 'Lighting Fundamentals',
      inShort: r`Flux, intensity, illuminance and luminance: the quantities of light.`,
      body: [
        r`| Quantity | Meaning | Unit |
|---|---|---|
| Luminous flux Φ | light emitted per second | lumen (lm) |
| Intensity I | flux per steradian in a direction | candela (cd) |
| Illuminance E | flux falling per area | lux (lm/m²); foot-candle (lm/ft²) = 10.76 lx; phot = 10 000 lx |
| Luminance L | brightness seen, $\frac{\rho E}{\pi}$ for a matte surface | cd/m² |
| Efficacy | lumens per watt | lm/W |`,
        r`A source of uniform intensity sends out $\Phi = 4\pi I$; its **mean spherical candle power** is $\text{MSCP} = \frac{\Phi}{4\pi}$ (and the mean hemispherical, $\frac{\Phi}{2\pi}$). Illuminance from a point source falls with the square of distance, $E = \frac{I}{d^2}$ straight on:`,
        {
          type: 'plot',
          alt: 'Illuminance straight under a 1000 candela source against distance: 1000 lux at 1 m, 111 lux at 3 m, falling as one over distance squared.',
          caption: 'The inverse-square law: 1000 cd gives 111 lx at 3 m, a ninth of its value at 1 m.',
          x: [1, 6],
          y: [0, 1100],
          xLabel: 'd (m)',
          yLabel: 'E (lx)',
          series: [{ f: (d) => 1000 / (d * d), label: 'E', area: true }],
          marks: [{ x: 3, label: '3 m' }],
        },
      ],
      keyIdeas: [
        r`Flux (lm); intensity (cd); illuminance $E = \frac{\Phi}{A}$ (lx); efficacy $\frac{\Phi}{P}$ (lm/W).`,
        r`Uniform point source $\Phi = 4\pi I$; MSCP $= \frac{\Phi}{4\pi}$; matte surface luminance $L = \frac{\rho E}{\pi}$.`,
        r`1 foot-candle = 10.76 lx; 1 phot = 10 000 lx.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Flux and luminance',
          problem: r`A source of 1000 cd shines equally in all directions. Find its flux. What is the luminance of a 70% matte wall lit to 500 lx?`,
          steps: [
            r`$\Phi = 4\pi \times 1000 = 12\,566$ lm.`,
            r`$L = \frac{0.7 \times 500}{\pi} = 111$ cd/m².`,
          ],
          answer: r`12 566 lm; 111 cd/m².`,
        },
        {
          level: 'board',
          title: 'MSCP and efficacy',
          problem: r`A 12 W LED lamp gives 1200 lm. Find its efficacy, its mean spherical candle power, and its mean hemispherical candle power.`,
          steps: [
            r`Efficacy $= \frac{1200}{12} = 100$ lm/W.`,
            r`MSCP $= \frac{1200}{4\pi} = 95.5$ cd; MHSCP $= \frac{1200}{2\pi} = 191$ cd.`,
          ],
          answer: r`100 lm/W; 95.5 cd; 191 cd.`,
        },
      ],
      traps: [
        r`Illuminance (light arriving) is not luminance (brightness seen).`,
        r`Halving the distance gives FOUR times the illuminance.`,
      ],
      check: [
        { q: r`How many lux is 50 foot-candles?`, a: r`$50 \times 10.76 = 538$ lx.` },
        { q: r`What unit is lumens per steradian?`, a: r`The candela.` },
      ],
    },
    {
      name: 'Lumen Method',
      inShort: r`The number of luminaires for an average illuminance.`,
      body: [
        r`The **lumen (flux) method** gives the number of luminaires for an average maintained illuminance on the work plane: $N = \frac{EA}{\Phi\,\text{CU}\,\text{LLF}}$. The **coefficient of utilization** CU is the share of the lamps' lumens that reaches the work plane (0.1 to 0.4 indirect, 0.4 to 0.6 direct lighting); it comes from tables by the **room cavity ratio**.`,
        r`The **zonal cavity method** splits the room into three cavities, each with its ratio, $5h\frac{L + W}{LW}$:`,
        r`| Cavity | Height h | Ratio |
|---|---|---|
| Ceiling | luminaire to ceiling | CCR |
| Room | luminaire to work plane | RCR |
| Floor | work plane to floor | FCR |`,
        r`The **light loss (maintenance) factor** is the product of everything that dims the installation: $\text{LLF} = \text{LLD} \times \text{LDD} \times \text{RSDD} \times \text{LBO}$ (lamp lumen depreciation, luminaire dirt, room surface dirt, lamp burnouts), typically 0.6 to 0.8. Space the luminaires no farther apart than the spacing-to-mounting-height ratio allows, for even light.`,
      ],
      keyIdeas: [
        r`$N = \frac{EA}{\Phi\,\text{CU}\,\text{LLF}}$; CU from the room cavity ratio $\frac{5h(L + W)}{LW}$.`,
        r`LLF $=$ LLD × LDD × RSDD × LBO, typically 0.6 to 0.8.`,
        r`Keep spacing within S/MH × mounting height for evenness.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'How many luminaires',
          problem: r`A 20 × 10 m office needs 500 lx. Luminaires give 4000 lm with CU 0.6 at a 2.5 m cavity, LLF 0.765. Find the RCR and number of luminaires.`,
          steps: [
            r`$\text{RCR} = \frac{5 \times 2.5 \times 30}{200} = 1.875$.`,
            r`$N = \frac{500 \times 200}{4000 \times 0.6 \times 0.765} = 54.5$, so 55.`,
          ],
          answer: r`RCR 1.88; 55 luminaires.`,
        },
        {
          level: 'board',
          title: 'Cavity ratios and the loss factor',
          problem: r`The same room has a 0.5 m ceiling cavity and a 0.75 m floor cavity. Find CCR and FCR, and the LLF from LLD 0.90, LDD 0.85, RSDD 0.95 and no burnouts.`,
          steps: [
            r`CCR $= \frac{5 \times 0.5 \times 30}{200} = 0.375$; FCR $= \frac{5 \times 0.75 \times 30}{200} = 0.5625$.`,
            r`LLF $= 0.90 \times 0.85 \times 0.95 \times 1.0 = 0.727$.`,
          ],
          answer: r`0.375; 0.563; 0.727.`,
        },
      ],
      traps: [
        r`Design for MAINTAINED illuminance: divide by the light loss factor.`,
        r`Each cavity ratio uses its OWN height.`,
      ],
      check: [
        { q: r`What does the coefficient of utilization measure?`, a: r`The share of the lamp lumens that reaches the work plane.` },
        { q: r`A larger room cavity ratio (a tall, narrow room) means what for CU?`, a: r`A lower CU: more light is lost on the walls.` },
      ],
    },
    {
      name: 'Point-by-Point Method',
      inShort: r`Illuminance at specific points from each luminaire's intensity.`,
      body: [
        r`The **point-by-point** method finds the illuminance at a chosen point from each luminaire's intensity toward it: $E = \frac{I\cos\theta}{d^2}$. From a lamp at height h, a point s away horizontally gets $E_h = \frac{Ih}{d^3} = \frac{I\cos^3\theta}{h^2}$ on a horizontal surface and $E_v = \frac{Is}{d^3}$ on a vertical one; contributions from several luminaires add:`,
        {
          type: 'plot',
          alt: 'Illuminance on the floor and on a vertical surface against horizontal distance from below a 1000 candela lamp 3 m up: the horizontal illuminance 111 lux directly below, falling to 39 lux at 3 m; the vertical illuminance zero below, peaking near 2 m.',
          caption: 'Under a 1000 cd lamp 3 m up: horizontal illuminance (solid) peaks below it, vertical (dashed) to the side.',
          x: [0, 8],
          y: [0, 160],
          xLabel: 's (m)',
          yLabel: 'E (lx)',
          series: [
            { f: (s) => (1000 * 3) / Math.hypot(3, s) ** 3, label: 'horizontal' },
            { f: (s) => (1000 * s) / Math.hypot(3, s) ** 3, label: 'vertical', dashed: true },
          ],
          marks: [{ x: 3, label: '45°' }],
        },
        r`**Floodlighting** large areas uses the 2x-4x rule of thumb: for poles of height X, place them about 2X in from the edge and 4X apart.`,
      ],
      keyIdeas: [
        r`$E = \frac{I\cos\theta}{d^2}$; from mounting height $E_h = \frac{Ih}{d^3}$, $E_v = \frac{Is}{d^3}$.`,
        r`Several luminaires: add their contributions at the point.`,
        r`Used for spot checks, sports lighting and floodlighting.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Below and off to the side',
          problem: r`A 1000 cd lamp hangs 3 m above the floor. Find the illuminance directly below and at a point 45° off the vertical.`,
          steps: [
            r`Below: $\frac{1000}{9} = 111$ lx.`,
            r`At 45° (3 m out): $111 \times \cos^345° = 39.3$ lx.`,
          ],
          answer: r`111 lx; 39.3 lx.`,
        },
        {
          level: 'board',
          title: 'Two lamps',
          problem: r`Two such lamps hang 6 m apart. What is the floor illuminance midway between them?`,
          steps: [r`Each is 3 m out at 3 m height, giving 39.3 lx: $2 \times 39.3 = 78.6$ lx.`],
          answer: r`78.6 lx.`,
        },
      ],
      traps: [
        r`With the mounting height, use cos³θ, not cosθ.`,
        r`Horizontal and vertical illuminance differ: say which surface.`,
      ],
      check: [
        { q: r`A lamp's mounting height doubles. What happens to the illuminance directly below?`, a: r`It falls to a quarter.` },
        { q: r`How far apart are floodlight poles of height X by the 2x-4x rule?`, a: r`About 4X.` },
      ],
    },
    {
      name: 'Lamp Types',
      inShort: r`Choose lamps by efficacy, life, color and cost.`,
      body: [
        r`| Lamp | Efficacy (lm/W) | Life | Notes |
|---|---|---|---|
| Incandescent (tungsten filament) | about 15 | about 1000 h | warm, perfect colour; most heat; no flicker |
| Fluorescent | about 80 to 100 | about 10 000 h+ | needs a ballast; stroboscopic effect |
| Metal halide | about 80 to 110 | long | white light; HID |
| High-pressure sodium | about 100 to 130 | long | yellow; roads |
| LED | about 100 to 200 | 25 000 to 50 000 h | instant, dimmable, the default today |`,
        r`Beyond efficacy, lamps differ in **colour temperature** (warm 2700 K to cool 6500 K) and **colour rendering index** (CRI, how true colours look, 100 for daylight). The running cost is $\frac{PNtr}{1000}$ (watts, number, hours, price per kWh), usually far more than the lamps.`,
      ],
      keyIdeas: [
        r`Incandescent (~15 lm/W), fluorescent (~80 to 100), HID (metal halide, HPS ~100+), LED (100 to 200 lm/W).`,
        r`Colour temperature (K) and colour rendering index (CRI) set the look.`,
        r`Energy cost $= \frac{PNtr}{1000}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A year of lighting',
          problem: r`100 luminaires of 36 W run 3000 h a year at ₱10/kWh. Find the annual energy cost.`,
          steps: [r`$\frac{36 \times 100 \times 3000 \times 10}{1000} = ₱108\,000$.`],
          answer: r`₱108 000.`,
        },
        {
          level: 'board',
          title: 'The same light for less',
          problem: r`An incandescent lamp gives 1500 lm at 15 lm/W. What wattage of LED at 120 lm/W gives the same light, and what does each save over 2000 h at ₱10/kWh?`,
          steps: [
            r`Incandescent: $\frac{1500}{15} = 100$ W; LED: $\frac{1500}{120} = 12.5$ W.`,
            r`Saving: $\frac{87.5 \times 2000 \times 10}{1000} = ₱1750$ per lamp.`,
          ],
          answer: r`12.5 W; ₱1750 per lamp over 2000 h.`,
        },
      ],
      traps: [
        r`Include ballast or driver losses in the luminaire's watts.`,
        r`Fluorescent lamps flicker at twice line frequency: beware stroboscopic effects on machines.`,
      ],
      check: [
        { q: r`Which lamp has no stroboscopic effect?`, a: r`The incandescent (tungsten filament) lamp.` },
        { q: r`What does CRI measure?`, a: r`How faithfully the light shows colours, against a reference source.` },
      ],
    },
    {
      name: 'Emergency and Energy-Efficient Lighting',
      inShort: r`Light the way out when power fails; use as little energy as possible the rest of the time.`,
      body: [
        r`**Emergency lighting** lights the exits and the way to them when normal power fails: for 1.5 hours, about 10 lx average and at least 1 lx along the egress path (NFPA 101), from battery units or a generator. Exit signs stay lit.`,
        r`**Energy-efficient lighting** is judged by its **lighting power density**, the installed watts per square metre, against the energy code's limit. Efficient lamps help, and controls help more: occupancy sensors, daylight dimming and timers switch light off where it is not needed. A retrofit pays back in $\frac{\text{cost}}{\text{annual savings}}$ years.`,
      ],
      keyIdeas: [
        r`Emergency lighting: 1.5 h; about 10 lx average, at least 1 lx along egress (NFPA 101).`,
        r`Lighting power density $\frac{\sum P}{A}$ W/m² against the energy code.`,
        r`Payback $= \frac{\text{cost}}{\text{annual savings}}$; controls (occupancy, daylight) save more.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Battery and payback',
          problem: r`200 W of emergency lighting runs from a 12 V battery (80% usable) for 1.5 h. Size the battery. Replacing 100 lamps of 40 W with 18 W LEDs costs ₱60 000 (3000 h, ₱10/kWh): find the payback.`,
          steps: [
            r`$C = \frac{200 \times 1.5}{12 \times 0.8} = 31.3$ Ah.`,
            r`Savings $= \frac{22 \times 100 \times 3000 \times 10}{1000} = ₱66\,000$/yr: payback $\frac{60\,000}{66\,000} = 0.91$ year.`,
          ],
          answer: r`31.3 Ah; under a year.`,
        },
        {
          level: 'board',
          title: 'Lighting power density',
          problem: r`The 200 m² office of the lumen method has 55 luminaires of 36 W. Find its lighting power density.`,
          steps: [r`$\frac{55 \times 36}{200} = 9.9$ W/m².`],
          answer: r`9.9 W/m².`,
        },
      ],
      traps: [
        r`Emergency lights must work when the normal supply fails: test them under real battery power.`,
        r`Lighting power density uses the installed watts, ballasts and drivers included.`,
      ],
      check: [
        { q: r`How long must emergency lighting last?`, a: r`1.5 hours.` },
        { q: r`Name two lighting controls that save energy.`, a: r`Occupancy sensors; daylight dimming (also timers).` },
      ],
    },
  ],
};
