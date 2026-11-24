// Library › Lessons › EE › Power System Protection (2026-11-19; every subtopic in
// the module format 2026-11-24, with figures, examples a step at a time and
// checks; every number re-worked by protectionLesson.test.js. Coverage cross-
// checked against a review center's apparatus (switchgear, instrument
// transformers) and power-system (breaker duty) handouts; the text, problems and
// figures are this app's own): written for the Philippine REE board, subtopic by
// subtopic in the syllabus's order. Fault calculations are in Power System
// Analysis; PEC overcurrent rules in ESAS › Electrical Standards and Practices.
// Curve constants: IEC 60255-151 and IEEE C37.112; step and touch: IEEE 80; arc
// flash: IEEE 1584 (Lee method).
const r = String.raw;

// IEC inverse-time curves: operating time (s) at multiple M of pickup.
const iec = (k, a) => (tms) => (M) => (tms * k) / (M ** a - 1);
const standard = iec(0.14, 0.02);
const very = iec(13.5, 1);
const extremely = iec(80, 2);

export default {
  topic: 'Power System Protection',
  subject: 'EE',
  overview: r`Protection detects faults and abnormal conditions and removes only the faulted part, fast. Instrument transformers bring currents and voltages down to relay levels; relays decide; breakers interrupt. Each zone (generator, transformer, bus, line, motor) has its main protection, usually differential or distance, with overcurrent as backup, coordinated so the nearest device always acts first. A good scheme is reliable (dependable and secure), selective, fast and simple. The topic ends with breaker ratings and the system around it: grounding, lightning protection, and the arc-flash hazard to people. Fault currents come from Power System Analysis; here you set the devices that act on them.`,
  sources: [
    'Protective Relaying: Principles and Applications (Blackburn and Domin)',
    'Power System Relaying (Horowitz and Phadke)',
    'IEEE C37.112 (inverse-time relays), IEEE 80 (substation grounding), IEEE 1584 (arc flash)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Protection Fundamentals',
      inShort: r`Find the fault, isolate only the faulted part, quickly.`,
      body: [
        r`Protection has one job: when something fails, remove the faulted part, and only that part, before it does more damage or upsets the rest of the system. A relay scheme has three circuits: the **current transformer's primary** in the protected circuit, its **secondary** feeding the relay's operating coil, and the **trip circuit**, a separate supply through the relay's contacts to the breaker's trip coil.`,
        r`The system is divided into **zones** (generator, transformer, bus, line, motor), each with its own protection, overlapping at the breakers so no part is left unprotected:`,
        {
          type: 'circuit',
          alt: 'A one-line diagram with breakers on both sides of every element: a generator, a breaker, a bus, a breaker, a line, a breaker, a second bus and a load; each element sits between breakers that its protection opens.',
          caption: 'Breakers on both sides of every element: each protection zone ends at, and overlaps across, a breaker.',
          parts: [
            ['gen', [0, 1], [1, 1], 'G'],
            ['cb', [1, 1], [2, 1]],
            ['bus', [2, 0.5], [2, 1.5], 'A'],
            ['cb', [2, 1], [3, 1]],
            ['wire', [3, 1], [5, 1]],
            ['text', [4, 0.5], 'line'],
            ['cb', [5, 1], [6, 1]],
            ['bus', [6, 0.5], [6, 1.5], 'B'],
            ['load', [6, 1], [6, 2.5], 'load'],
          ],
        },
        r`| Quality | Means |
|---|---|
| Reliability | dependability (trips when it must) and security (never when it must not) |
| Selectivity | only the nearest breaker opens |
| Speed | short fault duration: less damage, better stability |
| Simplicity, economy | fewest parts for the job |`,
        r`| Device | Opens |
|---|---|
| Circuit breaker | any current, including faults; automatic or manual |
| Fuse | faults and overloads; detects and interrupts by itself, once |
| Isolator (disconnect) | no load: only after the breaker is open |
| Air-break switch | load current, outdoors |
| Oil switch | load at high voltage; oil cools and quenches the arc |`,
      ],
      keyIdeas: [
        r`Qualities: reliability (dependability and security), selectivity, speed, simplicity, economy.`,
        r`Zones overlap at breakers so nothing is unprotected; primary protection is backed up locally or remotely.`,
        r`$t_{clear} = t_{relay} + t_{breaker}$; backup waits a coordination margin longer.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Fault clearing time',
          problem: r`A relay operates in 0.25 s and its breaker interrupts in 5 cycles at 60 Hz. How long does the fault last?`,
          steps: [r`$\frac{5}{60} = 0.083$ s, so $0.25 + 0.083 = 0.333$ s.`],
          answer: r`0.333 s.`,
        },
        {
          level: 'board',
          title: 'When the breaker fails',
          problem: r`The same relay trips, but the breaker sticks. Breaker-failure protection waits 0.15 s after the trip, then opens the adjacent breakers (also 5 cycles). When is the fault cleared?`,
          steps: [r`$0.25 + 0.15 + 0.083 = 0.483$ s: half again as long, and more of the system is lost.`],
          answer: r`0.483 s.`,
        },
      ],
      traps: [
        r`Speed and security pull against each other: a relay that trips on everything is fast but not secure.`,
        r`Never open an isolator under load: it cannot interrupt current.`,
      ],
      check: [
        { q: r`Which device both detects and interrupts a fault by itself?`, a: r`A fuse.` },
        { q: r`Why do protection zones overlap at breakers?`, a: r`So a fault between a CT and its breaker is inside some zone.` },
      ],
    },
    {
      name: 'Instrument Transformers for Relaying',
      inShort: r`CTs and VTs scale primary quantities to relay levels, and must not saturate on faults.`,
      body: [
        r`**Current transformers** (CTs) scale the primary current down, usually to 5 A (or 1 A) at rated current; **voltage (potential) transformers** scale the voltage to about 120 V. Whatever they feed, relays, meters and leads, is their **burden**, in ohms or volt-amperes at rated secondary current. A CT must reproduce fault currents many times its rating without saturating: the voltage it must develop across its own winding, the leads and the relay must stay below its knee:`,
        {
          type: 'circuit',
          alt: 'The CT secondary circuit: the CT as a current source of the fault current over its ratio, its own winding resistance, the lead out, the relay, and the lead back.',
          caption: 'The CT drives its current through its own winding, both leads and the relay.',
          parts: [
            ['I', [0, 2], [0, 0], 'I_f/N'],
            ['R', [0, 0], [2, 0], 'R_{ct}'],
            ['R', [2, 0], [4, 0], 'R_L'],
            ['R', [4, 0], [4, 2], 'relay'],
            ['R', [4, 2], [2, 2], 'R_L', { side: 'below' }],
            ['wire', [2, 2], [0, 2]],
          ],
        },
        r`An ANSI **C-class** rating such as C200 means the CT delivers 200 V at 20 times rated current (100 A secondary) within 10% error, so it can drive up to 2 Ω. Never open a loaded CT's secondary: with no burden to drop the voltage, it rises dangerously high.`,
      ],
      keyIdeas: [
        r`$I_s = \frac{I_p}{N_{CT}}$; burden $I^2Z_b$. Never open-circuit a loaded CT secondary.`,
        r`Saturation check: $\frac{I_f}{N}(R_{ct} + 2R_L + R_b) < V_k$.`,
        r`C-class: CXXX delivers XXX volts at 100 A secondary with at most 10% error; burden $\le \frac{V_C}{100}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Is the CT good enough?',
          problem: r`A 600:5 CT ($R_{ct} = 0.3$ Ω) feeds a 0.1 Ω relay through leads of 0.2 Ω each way. Is a C200 CT enough for a 20 kA fault?`,
          steps: [
            r`Secondary current $= \frac{20\,000}{120} = 166.7$ A.`,
            r`$V = 166.7(0.3 + 0.4 + 0.1) = 133.3$ V, below 200 V: adequate (ignoring dc offset).`,
          ],
          answer: r`Yes: 133 V needed, 200 V available.`,
        },
        {
          level: 'board',
          title: 'Burden in volt-amperes',
          problem: r`A relay circuit presents 0.5 Ω at 5 A rated secondary current. Find its burden in VA, and the largest burden a C200 CT can drive in ohms and in VA at rated current.`,
          steps: [
            r`$5^2 \times 0.5 = 12.5$ VA.`,
            r`C200: $\frac{200}{100} = 2$ Ω, which at 5 A is $25 \times 2 = 50$ VA.`,
          ],
          answer: r`12.5 VA; 2 Ω, 50 VA.`,
        },
      ],
      traps: [
        r`Count the lead resistance twice for phase faults.`,
        r`A CT secondary must never be opened under load; short it first.`,
      ],
      check: [
        { q: r`What is a 14 400/120 V VT's ratio?`, a: r`120:1.` },
        { q: r`What does the "200" in C200 mean?`, a: r`The secondary voltage it holds at 20 times rated current within 10% error.` },
      ],
    },
    {
      name: 'Overcurrent Relays',
      inShort: r`Trip when current exceeds a pickup, faster the larger the current.`,
      body: [
        r`An overcurrent relay picks up when the current passes its setting, then waits a time that falls as the current rises. The current is measured as a multiple of pickup, $M = \frac{I_f}{I_{pickup}}$, and a time multiplier (TMS, or time dial) scales the whole curve. The IEC curves are $t = \text{TMS}\frac{k}{M^\alpha - 1}$:`,
        {
          type: 'plot',
          alt: 'Operating time against multiple of pickup at a time multiplier of 0.1 for the standard, very and extremely inverse IEC curves, on a log scale of multiples from 2 to 20: the extremely inverse curve is slowest at low multiples and fastest at high ones.',
          caption: 'IEC curves at TMS 0.1: the more inverse the curve, the more it favours large currents.',
          x: [2, 20],
          logX: true,
          y: [0, 5],
          xLabel: 'M (multiple of pickup)',
          yLabel: 't (s)',
          series: [
            { f: standard(0.1), label: 'standard inverse' },
            { f: very(0.1), label: 'very inverse', dashed: true },
            { f: extremely(0.1), label: 'extremely inverse', dashed: true },
          ],
        },
        r`| Curve | k | α | Suits |
|---|---|---|---|
| Standard inverse | 0.14 | 0.02 | fault currents that vary little along the feeder |
| Very inverse | 13.5 | 1 | currents that fall off with distance |
| Extremely inverse | 80 | 2 | grading with fuses; cold-load pickup |`,
        r`Set the pickup above the maximum load (1.25 to 1.5 times) and below the minimum fault (half of it or less). An **instantaneous** element, set above the largest fault at the next station, clears close-in faults with no delay.`,
      ],
      keyIdeas: [
        r`$M = \frac{I_f}{I_{pickup}}$; IEC: $t = \text{TMS}\frac{k}{M^\alpha - 1}$ (SI 0.14, 0.02; VI 13.5, 1; EI 80, 2).`,
        r`IEEE: $t = \text{TD}\left(\frac{A}{M^p - 1} + B\right)$.`,
        r`Pickup above 1.25 to 1.5 × max load and below min fault ÷ 1.5 to 2; instantaneous set above the far-end fault.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Pickup and time',
          problem: r`A 400:5 CT, 125% plug and standard-inverse relay at TMS 0.2 sees a 5000 A fault. Find its pickup and operating time.`,
          steps: [
            r`Pickup $= 1.25 \times 400 = 500$ A, so $M = 10$.`,
            r`$t = 0.2 \times \frac{0.14}{10^{0.02} - 1} = 0.594$ s.`,
          ],
          answer: r`500 A; 0.594 s.`,
        },
        {
          level: 'board',
          title: 'The same fault on other curves',
          problem: r`What would the same relay (M = 10, TMS 0.2) take on the very inverse and extremely inverse curves?`,
          steps: [
            r`VI: $0.2 \times \frac{13.5}{10 - 1} = 0.300$ s.`,
            r`EI: $0.2 \times \frac{80}{100 - 1} = 0.162$ s.`,
          ],
          answer: r`0.300 s and 0.162 s.`,
        },
      ],
      traps: [
        r`M uses the PICKUP current, not the CT rating.`,
        r`At low multiples the extremely inverse curve is the SLOWEST.`,
      ],
      check: [
        { q: r`A relay with 600 A pickup sees 3000 A. What is M?`, a: r`5.` },
        { q: r`Why set the pickup above maximum load?`, a: r`So it never trips on normal load or cold-load pickup.` },
      ],
    },
    {
      name: 'Relay Coordination',
      inShort: r`Each upstream relay waits a margin longer than the one below it.`,
      body: [
        r`On a radial feeder, the relay nearest a fault must trip first, and each relay upstream must wait long enough for the one below it to clear: at the largest fault current both see, $t_{up} \ge t_{down} + \text{CTI}$. The **coordination time interval** (0.2 to 0.4 s) covers the downstream breaker's interrupting time, the relay's overtravel, and a safety margin:`,
        {
          type: 'plot',
          alt: 'Time against fault current, log scale from 800 to 10 000 A, for a downstream relay with 400 A pickup at TMS 0.1 and an upstream relay with 600 A pickup at TMS 0.2: at 4000 A the upstream relay takes 0.72 s and the downstream one 0.30 s, a margin of 0.43 s.',
          caption: 'Two relays graded at the 4000 A maximum fault: the upstream curve stays at least the CTI above.',
          x: [800, 10000],
          logX: true,
          y: [0, 5],
          xLabel: 'fault current (A)',
          yLabel: 't (s)',
          series: [
            { f: (i) => standard(0.2)(i / 600), label: 'upstream, TMS 0.2' },
            { f: (i) => standard(0.1)(i / 400), label: 'downstream, TMS 0.1', dashed: true },
          ],
          marks: [{ x: 4000, label: '4000 A' }],
        },
        r`Grade at the MAXIMUM fault current seen by both relays: inverse curves converge as the current rises, so that is where the margin is smallest.`,
      ],
      keyIdeas: [
        r`$t_{up} \ge t_{down} + \text{CTI}$, CTI ≈ 0.2 to 0.4 s (breaker time, overtravel, safety).`,
        r`Check at the maximum fault current seen by both relays.`,
        r`$\text{TMS} = \frac{t_{req}}{t(M)|_{\text{TMS}=1}}$, rounded UP to an available step.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The upstream time multiplier',
          problem: r`Downstream: 400 A pickup, SI, TMS 0.1. Upstream: 600 A pickup, SI. For a 4000 A fault and a 0.3 s CTI, find the upstream TMS.`,
          steps: [
            r`Downstream: $M = 10$, $t = 0.297$ s. Upstream needs $0.597$ s.`,
            r`Upstream at $M = 6.67$ with TMS 1: 3.620 s. TMS $= \frac{0.597}{3.620} = 0.165$.`,
          ],
          answer: r`TMS 0.165.`,
        },
        {
          level: 'board',
          title: 'Rounding up, and the real margin',
          problem: r`The upstream relay's TMS comes in steps of 0.05. Choose it and find the actual margin at 4000 A.`,
          steps: [
            r`Round 0.165 UP to 0.2: $t = 0.2 \times 3.620 = 0.724$ s.`,
            r`Margin $= 0.724 - 0.297 = 0.427$ s, at least the 0.3 s CTI.`,
          ],
          answer: r`TMS 0.2; a 0.427 s margin.`,
        },
      ],
      traps: [
        r`Round the TMS UP to an available step, then recheck the margin.`,
        r`Coordinate at the largest current BOTH relays see, not at the smallest.`,
      ],
      check: [
        { q: r`What does the CTI allow for?`, a: r`The downstream breaker's time, relay overtravel, and a safety margin.` },
        { q: r`Why grade at the maximum fault current?`, a: r`Inverse curves come closest together there.` },
      ],
    },
    {
      name: 'Directional Relays',
      inShort: r`Trip only for fault current flowing in one direction, judged against a polarizing voltage.`,
      body: [
        r`On a ring main or parallel lines, fault current can reach a relay from either side, so overcurrent alone cannot be selective. A **directional** element compares the current's phase with a **polarizing voltage** and operates only when the torque $VI\cos(\theta - \tau)$ is positive, that is, for currents within ±90° of the **maximum torque angle** τ:`,
        {
          type: 'phasor',
          alt: 'A directional element: the polarizing voltage to the right, the maximum torque line at 45 degrees, the two boundaries of the operating half-plane at 135 and minus 45 degrees, and a fault current at 120 degrees, inside the operating region, 75 degrees from the maximum torque line.',
          caption: 'The operating half-plane lies within ±90° of the maximum torque line; a current at 120° is inside it.',
          axes: false,
          vectors: [
            { mag: 1, angle: 0, label: 'V_{pol}' },
            { mag: 1, angle: 45, label: 'MTA', dashed: true, colour: 1 },
            { mag: 0.9, angle: 135, label: 'limit', dashed: true, colour: 3, labelAt: 'mid' },
            { mag: 0.9, angle: -45, label: 'limit', dashed: true, colour: 3, labelAt: 'mid' },
            { mag: 0.8, angle: 120, label: 'I', colour: 2 },
          ],
          arcs: [{ from: 45, to: 120, label: '75°', r: 40 }],
        },
        r`The **quadrature (90°) connection** polarizes phase-A current with $V_{bc}$, a voltage that survives a close-in fault on phase A. A close-in three-phase fault collapses every voltage, so directional relays carry a short voltage memory.`,
      ],
      keyIdeas: [
        r`Torque $\propto VI\cos(\theta - \tau)$; operates within ±90° of the maximum torque angle.`,
        r`Quadrature (90°) connection: phase-A current with $V_{bc}$, which survives a close-in phase-A fault.`,
        r`Needed on ring mains and parallel lines, where fault current can come from either side.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Inside or outside?',
          problem: r`A directional element has a maximum torque angle of 45°. Does it operate for current 120° from its polarizing voltage?`,
          steps: [r`$120° - 45° = 75° < 90°$: yes, the torque is positive ($\cos75° = 0.259$).`],
          answer: r`Yes.`,
        },
        {
          level: 'board',
          title: 'The operating band',
          problem: r`For the same element, between which current angles does it operate, and how strong is the torque at 0° and at 150°, as fractions of the maximum?`,
          steps: [
            r`It operates for $45° - 90° = -45°$ to $45° + 90° = 135°$.`,
            r`At 0°: $\cos45° = 0.707$. At 150°: $\cos105° = -0.259$, negative: it restrains.`,
          ],
          answer: r`From −45° to 135°; 0.707 at 0°, and no operation at 150°.`,
        },
      ],
      traps: [
        r`A close-in three-phase fault collapses all voltages: directional elements need voltage memory.`,
        r`Exactly at ±90° from τ the torque is zero: the relay sits on its boundary.`,
      ],
      check: [
        { q: r`Where are directional relays needed?`, a: r`Where fault current can flow either way: ring mains, parallel lines.` },
        { q: r`Which voltage polarizes phase A in the quadrature connection?`, a: r`$V_{bc}$.` },
      ],
    },
    {
      name: 'Distance Relays',
      inShort: r`Measure the impedance to the fault, which is proportional to distance.`,
      body: [
        r`A **distance (impedance) relay** divides the voltage by the current at its terminals. For a fault on the line that ratio is the line impedance up to the fault, proportional to distance, so the relay knows how far away the fault is. Because instrument-transformer errors and line data are not exact, it is set in **zones**:`,
        {
          type: 'plot',
          alt: 'The stepped time-distance characteristic of a distance relay: zone 1 trips instantly up to 80 percent of the line, zone 2 at 0.3 seconds up to 120 percent, zone 3 at 1 second up to 200 percent.',
          caption: 'Three zones: instant to 80% of the line, 0.3 s to 120%, 1 s to 200% as remote backup.',
          x: [0, 220],
          y: [0, 1.3],
          xLabel: 'distance (% of line)',
          yLabel: 't (s)',
          series: [{ f: (d) => (d <= 80 ? 0.02 : d <= 120 ? 0.3 : d <= 200 ? 1 : 1.25), label: 't', area: true }],
          marks: [{ x: 100, label: 'remote bus' }],
        },
        r`Settings are in secondary ohms: $Z_{sec} = Z_{pri}\frac{N_{CT}}{N_{VT}}$. The common **mho** characteristic is a circle through the origin on the R-X plane, reaching $Z_{set}\cos(\theta - \phi)$ at angle θ. Ground elements add $k_0 = \frac{Z_0 - Z_1}{3Z_1}$ of the residual current so they measure the same positive-sequence distance.`,
      ],
      keyIdeas: [
        r`$Z_{sec} = Z_{pri}\frac{N_{CT}}{N_{VT}}$. Zones: Z1 ≈ 80% instantly, Z2 ≈ 120% to 150% at about 0.3 s, Z3 backup at about 1 s.`,
        r`Mho: a circle through the origin, reach $Z_{set}\cos(\theta - \phi)$.`,
        r`Ground elements add $k_0 = \frac{Z_0 - Z_1}{3Z_1}$ of the residual current.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Secondary reaches',
          problem: r`A 10 Ω (primary) line has 1200:5 CTs and 138 kV/115 V VTs. Find the secondary line impedance and the Zone 1 and Zone 2 reaches (80%, 120%).`,
          steps: [
            r`$N_{CT} = 240$, $N_{VT} = \frac{138\,000}{115} = 1200$.`,
            r`$Z_{sec} = 10 \times \frac{240}{1200} = 2.0$ Ω. Zone 1 = 1.6 Ω; Zone 2 = 2.4 Ω secondary.`,
          ],
          answer: r`2.0 Ω; 1.6 Ω and 2.4 Ω.`,
        },
        {
          level: 'board',
          title: 'A mho reach off the line angle',
          problem: r`A mho element set to 1.6 Ω at 80° sees a fault at 60°. How far does it reach in that direction?`,
          steps: [r`Reach $= 1.6\cos(80° - 60°) = 1.6 \times 0.940 = 1.50$ Ω.`],
          answer: r`1.50 Ω.`,
        },
      ],
      traps: [
        r`Zone 1 must UNDERREACH the far end; Zone 2 covers the rest with a time delay.`,
        r`Convert with $\frac{N_{CT}}{N_{VT}}$, not the inverse.`,
      ],
      check: [
        { q: r`Why is Zone 1 set short of 100%?`, a: r`So CT, VT and data errors never let it trip for a fault beyond the remote bus.` },
        { q: r`What does Zone 3 provide?`, a: r`Delayed remote backup for the next line.` },
      ],
    },
    {
      name: 'Differential Relays',
      inShort: r`Compare what enters and leaves a zone: any difference is a fault inside.`,
      body: [
        r`A **differential** relay compares the current entering a zone with the current leaving it. For a through fault they match (apart from CT error); for an internal fault they differ, and the relay trips at once, with no time grading needed. To stay secure when CTs disagree on heavy through faults, the **percentage (biased)** differential needs the difference to exceed a fraction k of the through (restraint) current:`,
        {
          type: 'plot',
          alt: 'The percentage-differential characteristic: operating current against restraint current, the trip region above a line of 25 percent slope with a small minimum pickup; a through fault at 38.4 A restraint and 3.2 A difference sits below the line, an internal fault at 15 A restraint and 30 A difference far above it.',
          caption: 'Trip above the 25% slope: the through fault (lower) restrains, the internal fault (upper) trips.',
          x: [0, 50],
          y: [0, 35],
          xLabel: 'restraint (A)',
          yLabel: 'difference (A)',
          series: [{ f: (x) => Math.max(0.5, 0.25 * x), label: 'slope', area: true }],
          marks: [{ at: [38.4, 3.2], label: 'through' }, { at: [15, 30], label: 'internal' }],
        },
      ],
      keyIdeas: [
        r`Percentage differential: operate when $\lvert I_1 - I_2\rvert > k\frac{\lvert I_1\rvert + \lvert I_2\rvert}{2}$.`,
        r`The slope tolerates CT mismatch and error on heavy through faults.`,
        r`Absolutely selective: no time grading needed.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Through and internal',
          problem: r`With a 25% slope, a through fault gives 40 A and 36.8 A at the two CTs (8% error). An internal fault gives 30 A and 0 A. Which operate?`,
          steps: [
            r`Through: $3.2 < 0.25 \times 38.4 = 9.6$: restrains.`,
            r`Internal: $30 > 0.25 \times 15 = 3.75$: trips.`,
          ],
          answer: r`Only the internal fault trips.`,
        },
        {
          level: 'board',
          title: 'How much CT error the slope allows',
          problem: r`On a through fault of 40 A, how far can the second CT's reading fall before a 25% slope relay trips?`,
          steps: [
            r`At the boundary $40 - I_2 = 0.25 \times \frac{40 + I_2}{2}$, so $40 - I_2 = 5 + 0.125I_2$.`,
            r`$I_2 = \frac{35}{1.125} = 31.1$ A: a 22.2% error before it trips.`,
          ],
          answer: r`To 31.1 A, a 22.2% error.`,
        },
      ],
      traps: [
        r`Plain (unbiased) differential can trip on CT error during a large external fault.`,
        r`Differential protection gives no backup for faults outside its zone.`,
      ],
      check: [
        { q: r`Why does differential protection need no time delay?`, a: r`It sees only faults inside its zone, so nothing downstream needs to act first.` },
        { q: r`What is the restraint current?`, a: r`The average of the currents entering and leaving: $\frac{\lvert I_1\rvert + \lvert I_2\rvert}{2}$.` },
      ],
    },
    {
      name: 'Transformer Protection',
      inShort: r`Differential protection that copes with the ratio, the phase shift and inrush.`,
      body: [
        r`Transformer differential protection must cope with three things a plain differential does not see: different currents on the two sides (the ratio), the 30° shift of a Δ-Y bank, and **magnetizing inrush**. The classic fix for the shift connects the CTs opposite to their windings (delta CTs on the wye side, wye CTs on the delta side), which also traps zero-sequence current.`,
        r`Inrush flows into one winding only, so it looks like an internal fault. But it is lopsided, one-sided pulses rich in the **second harmonic**, so relays block when the second harmonic exceeds about 15% to 20% of the fundamental:`,
        {
          type: 'plot',
          alt: 'Magnetizing inrush current over six cycles: tall one-sided pulses, only in one half of each cycle, shrinking as they decay.',
          caption: 'Inrush: one-sided pulses that decay over many cycles, with a large second harmonic.',
          x: [0, 6],
          y: [-0.1, 1.1],
          xLabel: 'cycles',
          yLabel: 'i (per unit of peak)',
          series: [{ f: (c) => Math.exp(-c / 4) * Math.max(0, Math.sin(2 * Math.PI * c) - 0.5) / 0.5, label: 'i', area: true }],
        },
        r`| Device | Guards against |
|---|---|
| Percentage differential, harmonic restraint | internal faults |
| Buchholz relay (oil-filled, with conservator) | slow gas and sudden oil surge from faults inside the tank |
| Sudden-pressure relay | internal arcing |
| Overcurrent and ground backup | through faults the transformer must not carry too long |
| Volts-per-hertz | over-fluxing |
| Thermal (winding temperature) | overload |`,
      ],
      keyIdeas: [
        r`CTs connected opposite to the windings correct the 30° shift and trap zero sequence: $\frac{\sqrt3I_Y}{N_Y} = \frac{I_\Delta}{N_\Delta}$.`,
        r`Inrush blocked by second-harmonic restraint (above 15% to 20%). V/Hz relays guard against over-fluxing.`,
        r`Through-fault current $\frac{I_{rated}}{Z_{pu}}$ sets the overcurrent backup. Buchholz relays catch faults inside oil.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Currents and over-fluxing',
          problem: r`A 30 MVA, 69/13.8 kV, 8% transformer: find the rated low-side current, the largest through-fault current, and V/Hz at 13.8 kV and 57 Hz.`,
          steps: [
            r`$I = \frac{30 \times 10^6}{\sqrt3 \times 13\,800} = 1255$ A.`,
            r`$I_{sc} = \frac{1255}{0.08} = 15.7$ kA.`,
            r`V/Hz $= \frac{1}{57/60} = 1.05$ pu.`,
          ],
          answer: r`1255 A; 15.7 kA; 1.05 pu.`,
        },
        {
          level: 'board',
          title: 'Matching the CTs',
          problem: r`The transformer is Δ on 69 kV and grounded Y on 13.8 kV. The 69 kV CTs are 300:5 (wye connected); the 13.8 kV CTs are delta connected. Find the relay currents at full load with 1500:5 and with 2500:5 CTs on the 13.8 kV side.`,
          steps: [
            r`69 kV: $\frac{30 \times 10^6}{\sqrt3 \times 69\,000} = 251.0$ A, so $\frac{251.0}{60} = 4.18$ A in the relay.`,
            r`13.8 kV with 1500:5: $\frac{1255}{300}\sqrt3 = 7.25$ A, a 73% mismatch. With 2500:5: $\frac{1255}{500}\sqrt3 = 4.35$ A, within 4%; relay taps take up the rest.`,
          ],
          answer: r`4.18 A against 7.25 A, or 4.35 A with 2500:5 CTs.`,
        },
      ],
      traps: [
        r`Inrush looks like an internal fault: it flows in one winding only.`,
        r`Delta-connected CTs put $\sqrt3$ times their secondary current into the relay leads.`,
      ],
      check: [
        { q: r`Which harmonic marks inrush?`, a: r`The second.` },
        { q: r`What does a Buchholz relay need to work?`, a: r`An oil-filled transformer with a conservator tank.` },
      ],
    },
    {
      name: 'Generator Protection',
      inShort: r`Expensive machines with many failure modes: stator, rotor, unbalance, motoring, loss of field.`,
      body: [
        r`A generator can fail electrically, thermally and mechanically, and losing one costs much more than the relays, so it gets many protections: **stator differential** for phase faults; **stator ground fault**, usually by grounding the neutral through a high resistance (via a distribution transformer) and watching the neutral voltage; **negative-sequence** current, which heats the rotor ($I_2^2t \le K$); **loss of excitation**; **reverse power** (motoring); **over- and under-frequency**; **volts-per-hertz**; and backup overcurrent.`,
        r`A neutral-voltage relay sees a ground fault's voltage in proportion to how far it is from the neutral, so faults close to the neutral escape it:`,
        {
          type: 'plot',
          alt: 'Neutral voltage against the position of a stator ground fault, from 0 at the neutral to 100 percent at the terminals: a straight line from zero to one, with a 5 percent relay setting leaving the last 5 percent near the neutral unprotected.',
          caption: 'A 5% neutral-voltage setting protects 95% of the winding; the 5% next to the neutral needs a 100% scheme.',
          x: [0, 100],
          y: [0, 1.1],
          xLabel: 'fault position from neutral (%)',
          yLabel: 'V_N (pu)',
          series: [{ f: (x) => x / 100, label: 'V_N', area: true }],
          marks: [{ y: 0.05, label: 'setting 5%' }],
        },
      ],
      keyIdeas: [
        r`Stator: differential; ground faults via a high-resistance neutral, $R_n = \frac{1}{3\omega C_0}$, covering $1 - \frac{V_{set}}{V_{ph}}$ of the winding.`,
        r`Unbalance: $I_2^2t \le K$. Also reverse power, loss of excitation, over and under frequency, V/Hz.`,
        r`Neutral resistor reflected through a distribution transformer: $R_{sec} = \frac{R_n}{N^2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sizing the neutral resistor',
          problem: r`A generator system has 0.25 µF per phase to ground at 60 Hz, grounded through a 13.8 kV/240 V transformer. Find the neutral resistance, its secondary value, and the coverage of a 5% neutral-voltage relay.`,
          steps: [
            r`$R_n = \frac{1}{3 \times 377 \times 0.25 \times 10^{-6}} = 3537$ Ω.`,
            r`Ratio $\frac{13\,800}{240} = 57.5$: secondary $\frac{3537}{57.5^2} = 1.07$ Ω.`,
            r`Coverage $1 - 0.05 = 95\%$.`,
          ],
          answer: r`3537 Ω; 1.07 Ω; 95%.`,
        },
        {
          level: 'board',
          title: 'Negative-sequence withstand',
          problem: r`A generator has $K = 10$ s. How long can it carry 0.2 pu negative-sequence current?`,
          steps: [r`$t = \frac{K}{I_2^2} = \frac{10}{0.2^2} = 250$ s.`],
          answer: r`250 s.`,
        },
      ],
      traps: [
        r`A neutral-voltage relay cannot see faults near the neutral; 100% schemes add third-harmonic or injection.`,
        r`Negative-sequence current heats the ROTOR, not the stator.`,
      ],
      check: [
        { q: r`What does reverse-power protection detect?`, a: r`Motoring: the prime mover has failed and the machine draws power.` },
        { q: r`Why ground a generator through a high resistance?`, a: r`To limit ground-fault current to a few amperes and damp overvoltages.` },
      ],
    },
    {
      name: 'Motor Protection',
      inShort: r`Protect against overload, stalling, unbalance and faults without tripping on normal starts.`,
      body: [
        r`A motor relay must let the motor start (several times rated current for seconds) yet catch overloads, stalls, unbalance and faults. Overload protection is a **thermal replica**: it tracks the winding's heating, $t = \tau\ln\frac{I^2 - I_P^2}{I^2 - (kI_B)^2}$, so it trips sooner when the motor is already hot from running:`,
        {
          type: 'plot',
          alt: 'Thermal trip time against current as a multiple of rated, for a cold motor and for one already running at 0.9 load, with a 600 second time constant: both fall steeply with current, the hot curve well below the cold one.',
          caption: 'Thermal trip times (τ = 600 s, k = 1.05): a hot motor trips much sooner than a cold one.',
          x: [1.1, 6],
          y: [0, 2500],
          xLabel: 'I (× rated)',
          yLabel: 't (s)',
          series: [
            { f: (i) => 600 * Math.log((i * i) / (i * i - 1.1025)), label: 'from cold' },
            { f: (i) => 600 * Math.log((i * i - 0.81) / (i * i - 1.1025)), label: 'from 0.9 load', dashed: true },
          ],
        },
        r`| Protection | For |
|---|---|
| Thermal overload (49) | sustained overload |
| Locked rotor / stall | $I^2t$ during a failed start |
| Negative sequence (46) | unbalance: $I_{eq} = \sqrt{I_1^2 + KI_2^2}$, K about 6 |
| Instantaneous overcurrent (50) | phase faults, set above starting current |
| Ground fault (50G) | through a zero-sequence (core-balance) CT |
| Undervoltage (27) | stalling and restarting all at once |`,
      ],
      keyIdeas: [
        r`Thermal replica: $t = \tau\ln\frac{I^2 - I_P^2}{I^2 - (kI_B)^2}$, faster when already hot.`,
        r`Locked rotor: $I^2t$ constant. Unbalance: $I_{eq} = \sqrt{I_1^2 + KI_2^2}$, K ≈ 6.`,
        r`Short-circuit (instantaneous) set above the starting current; ground fault via zero-sequence CT.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Cold and hot trip times',
          problem: r`A motor relay has $\tau = 600$ s and allows 1.05 × rated indefinitely. How long at 1.5 × rated from cold, and from a running load of 0.9?`,
          steps: [
            r`Cold: $600\ln\frac{2.25}{2.25 - 1.1025} = 404$ s.`,
            r`Hot: $600\ln\frac{2.25 - 0.81}{2.25 - 1.1025} = 136$ s.`,
          ],
          answer: r`404 s cold; 136 s hot.`,
        },
        {
          level: 'board',
          title: 'Unbalance heating',
          problem: r`A motor at full load draws $I_1 = 1.0$ pu and $I_2 = 0.1$ pu (from a slightly unbalanced supply). With K = 6, what equivalent heating current does it carry?`,
          steps: [r`$I_{eq} = \sqrt{1.0^2 + 6 \times 0.1^2} = \sqrt{1.06} = 1.030$ pu.`],
          answer: r`1.03 pu: a 10% negative sequence adds 3% to the heating current.`,
        },
      ],
      traps: [
        r`Negative-sequence current heats the rotor about six times as much as positive sequence.`,
        r`Set the instantaneous element above the STARTING current, or every start trips.`,
      ],
      check: [
        { q: r`What does a core-balance CT measure?`, a: r`The sum of the three phase currents: the ground (zero-sequence) current.` },
        { q: r`Why does a thermal replica trip a hot motor sooner?`, a: r`It starts from the heat already stored by the running load.` },
      ],
    },
    {
      name: 'Bus and Line Protection',
      inShort: r`Buses need fast differential protection; lines use distance, pilot schemes and reclosing.`,
      body: [
        r`A bus fault is rare but severe, and every circuit on the bus feeds it, so buses get fast **differential** protection. In the **high-impedance** scheme, all CTs in parallel drive a high-impedance relay: an external fault, even with one CT saturated, produces only a limited voltage, while an internal fault drives it high. The setting must stay above the worst external-fault voltage, $V_s \ge \frac{I_{f,\max}}{N}(R_{ct} + 2R_L)$, and the CTs' knee at least twice that.`,
        r`Lines use distance protection, made fully instantaneous end to end by a communication channel (**pilot** schemes: permissive or blocking), or line differential over fibre. Most overhead-line faults are temporary (lightning, contact), so **autoreclosing** waits for the arc to deionize and closes the breaker again:`,
        {
          type: 'plot',
          alt: 'Line current through an autoreclose sequence: normal load, a fault rising to 8 per unit at 0.1 s, the breaker opening at 0.18 s, a dead time of half a second with no current, then the breaker reclosing at 0.68 s and normal load returning.',
          caption: 'Autoreclose: fault, trip, a dead time for the arc to clear, then reclose onto a healthy line.',
          x: [0, 1.2],
          y: [0, 9],
          xLabel: 't (s)',
          yLabel: 'I (pu)',
          series: [{ f: (t) => (t < 0.1 ? 1 : t < 0.18 ? 8 : t < 0.68 ? 0 : 1), label: 'I', area: true }],
          marks: [{ x: 0.18, label: 'trip' }, { x: 0.68, label: 'reclose' }],
        },
      ],
      keyIdeas: [
        r`High-impedance bus differential: $V_s \ge \frac{I_{f,\max}}{N}(R_{ct} + 2R_L)$, $V_k \ge 2V_s$.`,
        r`Lines: distance with communication (permissive, blocking) or line differential for 100% instant coverage.`,
        r`Most overhead-line faults are temporary: autoreclosing restores the line after the arc deionizes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'High-impedance bus setting',
          problem: r`A bus with 2000:5 CTs ($R_{ct} = 2$ Ω, leads 1 Ω one way) sees up to 40 kA on an external fault. Find the voltage setting and the knee point needed.`,
          steps: [
            r`$V_s = \frac{40\,000}{400}(2 + 2) = 400$ V.`,
            r`$V_k \ge 2 \times 400 = 800$ V.`,
          ],
          answer: r`400 V; at least 800 V.`,
        },
        {
          level: 'board',
          title: 'The reclose sequence',
          problem: r`In the figure, a fault starts at 0.10 s, the breaker opens at 0.18 s, and the dead time is 0.5 s. When does the line close again, and how long was the customer off?`,
          steps: [r`Reclose at $0.18 + 0.5 = 0.68$ s; the supply was off for the 0.5 s dead time.`],
          answer: r`At 0.68 s; off for 0.5 s.`,
        },
      ],
      traps: [
        r`All CTs of a high-impedance scheme must have the same ratio.`,
        r`Do not autoreclose cables or transformers: their faults are permanent.`,
      ],
      check: [
        { q: r`Why do overhead lines autoreclose?`, a: r`Most of their faults are temporary flashovers that clear once the line is dead.` },
        { q: r`What makes distance protection instantaneous over the whole line?`, a: r`A communication (pilot) channel between the two ends.` },
      ],
    },
    {
      name: 'Circuit Breaker Ratings',
      inShort: r`A breaker must interrupt the fault, close onto it, and carry it.`,
      body: [
        r`A breaker is rated to **interrupt** the fault current at the moment its contacts part, to **close and latch** onto a fault (the first asymmetrical peak), and to **carry** the fault for its short-time rating, all at its rated voltage, BIL and continuous current. At contact parting the dc offset has partly decayed, at the time constant $\tau = \frac{X}{\omega R}$:`,
        {
          type: 'plot',
          alt: 'The ratio of asymmetrical to symmetrical RMS current against time for X over R of 15: 1.73 at the instant of the fault, falling to 1.08 at three cycles and toward 1 afterwards.',
          caption: 'Asymmetry factor for X/R = 15: 1.08 by 3-cycle contact parting.',
          x: [0, 100],
          y: [1, 1.8],
          xLabel: 't (ms)',
          yLabel: 'I_{asym} / I_{sym}',
          series: [{ f: (t) => Math.sqrt(1 + 2 * Math.exp((-2 * t) / 39.79)), label: 'factor', area: true }],
          marks: [{ x: 50, label: '3 cycles' }],
        },
        r`| Rating | For breakers above 600 V |
|---|---|
| Interrupting | symmetrical current × 1.0 (8-cycle), 1.1 (5), 1.3 (3), 1.4 (1.5-cycle) |
| Momentary (first cycle) | symmetrical current × 1.6 (1.5 if fed directly by generators) |
| Close and latch peak | $2.6I_{sym}$ at 60 Hz, X/R 17 |
| Low voltage (below 600 V) | interrupting at 100%, momentary at 125% of asymmetrical |`,
      ],
      keyIdeas: [
        r`$I_{sym} = \frac{\text{MVA}_{sc}}{\sqrt3\,\text{kV}}$; at contact parting $I_{asym} = I_{sym}\sqrt{1 + 2e^{-2t/\tau}}$, $\tau = \frac{X}{\omega R}$.`,
        r`Close-and-latch peak $2.6I_{sym}$ (60 Hz, X/R 17); 2.5 for IEC 50 Hz.`,
        r`Also rated voltage, BIL, continuous current and interrupting time.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three ratings from one fault level',
          problem: r`A 13.8 kV bus has 500 MVA fault level and X/R = 15. Find the symmetrical current, the asymmetrical RMS at 3-cycle contact parting, and the close-and-latch peak.`,
          steps: [
            r`$I_{sym} = \frac{500}{\sqrt3 \times 13.8} = 20.9$ kA.`,
            r`$\tau = \frac{15}{377} = 0.0398$ s: factor $\sqrt{1 + 2e^{-2.51}} = 1.08$, so 22.5 kA.`,
            r`Peak $2.6 \times 20.9 = 54.4$ kA.`,
          ],
          answer: r`20.9 kA; 22.5 kA; 54.4 kA.`,
        },
        {
          level: 'board',
          title: 'Interrupting and momentary duty',
          problem: r`For the same 20.9 kA, find the interrupting duty of a 3-cycle breaker (multiplying factor) and the momentary duty.`,
          steps: [
            r`Interrupting: $1.3 \times 20.9 = 27.2$ kA.`,
            r`Momentary: $1.6 \times 20.9 = 33.4$ kA.`,
          ],
          answer: r`27.2 kA; 33.4 kA.`,
        },
      ],
      traps: [
        r`High X/R keeps the dc offset longer: check the breaker's rated X/R.`,
        r`The faster the breaker, the LARGER its multiplying factor: less offset has decayed.`,
      ],
      check: [
        { q: r`Which breaker rating covers closing onto a fault?`, a: r`The close-and-latch (making) rating.` },
        { q: r`What is the momentary multiplying factor for high-voltage breakers?`, a: r`1.6.` },
      ],
    },
    {
      name: 'System Grounding',
      inShort: r`How the neutral is grounded sets fault currents, overvoltages, and safety.`,
      body: [
        r`How the system neutral is grounded sets the ground-fault current and the overvoltage on the healthy phases. **Solid** grounding gives large fault currents but low overvoltages (an **effectively grounded** system has $X_0/X_1 \le 3$ and $R_0/X_1 \le 1$, holding the healthy phases to 80% of line voltage); **resistance** grounding limits the current; **ungrounded** systems keep running through a first ground fault but suffer transient overvoltages.`,
        r`**Equipment grounding** is about people: a ground fault in a substation raises the ground potential, and a person touching a structure (touch voltage) or walking (step voltage) must not be exposed to more than the body can stand. A grounding rod's resistance falls only slowly with length:`,
        {
          type: 'plot',
          alt: 'Resistance of a 16 mm grounding rod in 100 ohm-metre soil against its length: 79 ohms at 1 m, 33.5 ohms at 3 m, falling slowly to about 12 ohms at 10 m.',
          caption: 'A 16 mm rod in 100 Ω·m soil: doubling the length does not halve the resistance.',
          x: [1, 10],
          y: [0, 90],
          xLabel: 'L (m)',
          yLabel: 'R (Ω)',
          series: [{ f: (L) => (100 / (2 * Math.PI * L)) * (Math.log((4 * L) / 0.008) - 1), label: 'R', area: true }],
          marks: [{ x: 3, label: '3 m: 33.5 Ω' }],
        },
        r`| Limit (50 kg person) | Tolerable voltage |
|---|---|
| Touch | $(1000 + 1.5C_s\rho_s)\frac{0.116}{\sqrt{t_s}}$ |
| Step | $(1000 + 6C_s\rho_s)\frac{0.116}{\sqrt{t_s}}$ |`,
        r`A layer of crushed rock (high $\rho_s$) on the surface raises both limits; faster clearing (smaller $t_s$) raises them too.`,
      ],
      keyIdeas: [
        r`Solid, low- or high-resistance, reactance, ungrounded. Effectively grounded: $X_0/X_1 \le 3$, $R_0/X_1 \le 1$, COG ≤ 80%.`,
        r`Rod: $R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$; grid $\approx \frac{\rho}{4}\sqrt{\frac{\pi}{A}} + \frac{\rho}{L_T}$.`,
        r`Tolerable (50 kg): touch $(1000 + 1.5C_s\rho_s)\frac{0.116}{\sqrt{t_s}}$, step with $6C_s\rho_s$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Rod, grid and touch voltage',
          problem: r`Soil is 100 Ω·m. Find a 3 m rod's resistance (16 mm diameter), a 60 × 60 m grid's with 1500 m of conductor, and the tolerable touch voltage with crushed rock ($\rho_s = 3000$, $C_s = 0.7$) for 0.5 s.`,
          steps: [
            r`Rod: $\frac{100}{6\pi}(\ln1500 - 1) = 33.5$ Ω.`,
            r`Grid: $25\sqrt{\frac{\pi}{3600}} + \frac{100}{1500} = 0.81$ Ω.`,
            r`Touch: $(1000 + 3150)\frac{0.116}{\sqrt{0.5}} = 681$ V.`,
          ],
          answer: r`33.5 Ω; 0.81 Ω; 681 V.`,
        },
        {
          level: 'board',
          title: 'Step voltage',
          problem: r`For the same crushed rock and clearing time, find the tolerable step voltage.`,
          steps: [r`$(1000 + 6 \times 0.7 \times 3000)\frac{0.116}{\sqrt{0.5}} = 13\,600 \times 0.164 = 2231$ V.`],
          answer: r`2231 V, so touch voltage (681 V) governs.`,
        },
      ],
      traps: [
        r`Touch voltage, not step voltage, usually governs the design.`,
        r`A longer rod helps only logarithmically; more rods or a grid help more.`,
      ],
      check: [
        { q: r`What does a crushed-rock surface layer do?`, a: r`It raises the contact resistance of the feet, so higher touch and step voltages are tolerable.` },
        { q: r`Which grounding keeps healthy-phase voltages lowest during a ground fault?`, a: r`Solid (effective) grounding.` },
      ],
    },
    {
      name: 'Lightning Protection',
      inShort: r`Shield lines and stations from strokes and clamp surges below insulation strength.`,
      body: [
        r`Lightning is kept off conductors by **shielding** (overhead ground wires and masts, placed by the electrogeometric model, striking distance about $10I^{0.65}$ m), and the surges that still arrive are clamped by **surge arresters** (metal-oxide, between line and ground). An arrester must ride through the highest continuous voltage (its MCOV) and temporary overvoltages, and it must hold the surge below the equipment's **basic insulation level** (BIL) with a margin.`,
        r`It protects best right at the equipment: a surge front rising at S kV/µs adds $\frac{2Sd}{v}$ at equipment d metres away, from the reflection off the equipment's terminals:`,
        {
          type: 'plot',
          alt: 'Surge voltage reaching equipment against its distance from a 250 kV arrester, for a 1000 kV per microsecond front: rising 6.67 kV per metre, reaching the 20 percent margin limit of 292 kV at 6.25 m and heading for the 350 kV BIL, reached at 15 m.',
          caption: 'Every metre from the arrester costs margin: the 20% margin is gone at 6.25 m, and at 15 m the surge would reach the BIL itself.',
          x: [0, 14],
          y: [200, 400],
          xLabel: 'distance from arrester (m)',
          yLabel: 'V at equipment (kV)',
          series: [{ f: (d) => 250 + (2 * 1000 * d) / 300, label: 'V' }],
          marks: [{ y: 350, label: 'BIL 350 kV' }, { y: 350 / 1.2, label: '20% margin' }],
        },
      ],
      keyIdeas: [
        r`Arrester rating ≥ COG × $V_{LL,\max}$; MCOV above the highest continuous phase voltage.`,
        r`Protective margin $\frac{\text{BIL}}{V_p} - 1 \ge 20\%$; separation adds $\frac{2Sd}{v}$ at the equipment.`,
        r`Shielding by the electrogeometric model: striking distance $10I^{0.65}$ m.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Rating and margin',
          problem: r`A 69 kV effectively grounded system (72.5 kV max) protects 350 kV BIL equipment; the arrester holds 250 kV. Find the minimum arrester rating and the margin; then the extra voltage 15 m away for a 1000 kV/µs front.`,
          steps: [
            r`Rating $\ge 0.8 \times 72.5 = 58$ kV.`,
            r`PM $= \frac{350}{250} - 1 = 40\%$.`,
            r`Separation: $\frac{2 \times 1000 \times 15}{300} = 100$ kV more at the equipment.`,
          ],
          answer: r`58 kV; 40%; 100 kV more at 15 m.`,
        },
        {
          level: 'board',
          title: 'How far away the arrester can be',
          problem: r`For the same arrester and front, how far from the equipment can it be while keeping a 20% margin?`,
          steps: [
            r`Allowed at the equipment: $\frac{350}{1.2} = 291.7$ kV.`,
            r`$250 + \frac{2 \times 1000 \times d}{300} = 291.7$ gives $d = 6.25$ m.`,
          ],
          answer: r`6.25 m.`,
        },
      ],
      traps: [
        r`An arrester protects best right at the terminals: distance erodes the margin fast.`,
        r`In an ungrounded system the healthy phases reach line voltage on a ground fault: rate the arrester for it.`,
      ],
      check: [
        { q: r`What does BIL stand for?`, a: r`Basic (impulse) insulation level.` },
        { q: r`What is the striking distance for a 10 kA stroke?`, a: r`$10 \times 10^{0.65} = 44.7$ m.` },
      ],
    },
    {
      name: 'Arc Flash',
      inShort: r`The heat released by an arcing fault, and the boundary inside which people need arc-rated gear.`,
      body: [
        r`An arcing fault releases intense heat, light and pressure. The **incident energy** at a working distance decides the arc-rated clothing a worker needs, and the **arc-flash boundary** is the distance where it falls to 5.0 J/cm² (1.2 cal/cm², the onset of a second-degree burn). The theoretical Lee method gives $E = 2.142 \times 10^6\frac{VI_{bf}t}{D^2}$ J/cm² (kV, kA, s, mm): energy falls with the square of distance and rises in proportion to the clearing time:`,
        {
          type: 'plot',
          alt: 'Incident energy against distance for a 480 V, 30 kA arc lasting 0.1 s: 14.9 J per square centimetre at 455 mm, falling with the square of distance to the 5 J per square centimetre boundary at 785 mm.',
          caption: 'Incident energy against distance (480 V, 30 kA, 0.1 s): the 5 J/cm² boundary is at 785 mm.',
          x: [300, 1500],
          y: [0, 40],
          xLabel: 'D (mm)',
          yLabel: 'E (J/cm²)',
          series: [{ f: (D) => (2.142e6 * 0.48 * 30 * 0.1) / (D * D), label: 'E', area: true }],
          marks: [{ y: 5, label: '5 J/cm²' }, { x: 785.4, label: 'boundary' }],
        },
        r`The surest way to cut incident energy is faster clearing: zone-selective interlocking, bus differential, or a maintenance-mode switch that lowers the relay settings while people work.`,
      ],
      keyIdeas: [
        r`Lee (theoretical, conservative): $E = 2.142 \times 10^6\frac{VI_{bf}t}{D^2}$ J/cm² (kV, kA, s, mm); not for above 15 kV per IEEE 1584-2018.`,
        r`Boundary where E = 5.0 J/cm² (1.2 cal/cm²); 1 cal/cm² = 4.184 J/cm².`,
        r`Energy is proportional to clearing time: faster relaying is the main remedy.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Incident energy and boundary',
          problem: r`A 480 V bus has 30 kA bolted fault current cleared in 0.1 s. Find the incident energy at 455 mm and the arc-flash boundary (Lee).`,
          steps: [
            r`$E = \frac{2.142 \times 10^6 \times 0.48 \times 30 \times 0.1}{455^2} = 14.9$ J/cm² $= 3.6$ cal/cm².`,
            r`$D_B = \sqrt{\frac{3.08 \times 10^6}{5}} = 785$ mm.`,
          ],
          answer: r`14.9 J/cm² (3.6 cal/cm²); 785 mm.`,
        },
        {
          level: 'board',
          title: 'Halving the clearing time',
          problem: r`A maintenance switch makes the same fault clear in 0.05 s. Find the new incident energy at 455 mm.`,
          steps: [r`Energy goes with time: $\frac{14.9}{2} = 7.45$ J/cm², 1.78 cal/cm².`],
          answer: r`7.45 J/cm².`,
        },
      ],
      traps: [
        r`Lee overstates energy at low voltage; IEEE 1584 empirical equations are the design method.`,
        r`Distance helps as its SQUARE: stepping back from 455 to 910 mm quarters the energy.`,
      ],
      check: [
        { q: r`What incident energy defines the arc-flash boundary?`, a: r`5.0 J/cm² (1.2 cal/cm²).` },
        { q: r`How many J/cm² is 8 cal/cm²?`, a: r`$8 \times 4.184 = 33.5$ J/cm².` },
      ],
    },
  ],
};
