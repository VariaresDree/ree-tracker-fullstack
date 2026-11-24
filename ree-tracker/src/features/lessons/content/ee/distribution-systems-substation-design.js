// Library › Lessons › EE › Distribution Systems & Substation Design
// (2026-11-19; every subtopic in the module format 2026-11-24, with figures,
// examples a step at a time and checks; every number re-worked by
// distributionLesson.test.js. Coverage and problem styles cross-checked against
// a review center's power-system and distribution, and power-plant and
// substation handouts; the text, problems and figures are this app's own):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order. Grounding and arrester basics are in Power System Protection; the PEC's
// wiring rules in ESAS › Electrical Standards and Practices. Philippine
// Distribution Code limits checked against published copies of the 2017 edition.
const r = String.raw;

// Aging acceleration factor of transformer insulation at hottest-spot θ (°C).
const aging = (t) => Math.exp(15000 / 383 - 15000 / (t + 273));

export default {
  topic: 'Distribution Systems & Substation Design',
  subject: 'EE',
  overview: r`Distribution carries power the last few kilometres: from substations, through primary feeders (13.8 or 34.5 kV in the Philippines) and distribution transformers, to secondary services at 230 V. The design questions are economic and practical: how much load to plan for (demand, diversity and load factors), how to keep the voltage within limits along a feeder (drop, regulators, capacitors), how to size transformers so their insulation lasts, and how to lay out substations, ground them and shield them from lightning. Performance is measured by reliability indices (SAIFI, SAIDI), and the Philippine Distribution Code sets the rules for power factor, unbalance and harmonics at the connection point.`,
  sources: [
    'Electric Power Distribution System Engineering (Gönen)',
    'Distribution System Modeling and Analysis (Kersting)',
    'IEEE 80, IEEE 1366, IEEE C57.91',
    'Philippine Distribution Code, 2017 Edition (ERC)',
  ],
  subtopics: [
    {
      name: 'System Types and Voltages',
      inShort: r`Radial, loop and network systems at standard voltages; higher voltage means lower loss.`,
      body: [
        r`| System | Layout | Reliability | Cost |
|---|---|---|---|
| Radial | one path from the substation to each load | lowest: one fault cuts everything beyond it | lowest |
| Loop (ring) | two paths, normally open or closed | a fault is isolated and fed from the other end | moderate |
| Network | a mesh fed from several substations | highest; dense urban loads | highest |`,
        r`Philippine standard voltages: 230 V single-phase secondary (and 400/230 V or 230 V three-phase), 13.8 kV and 34.5 kV primary distribution, 69 kV subtransmission. Higher voltage is used for longer or heavier feeders because, for the same power, current goes as $\frac{1}{V}$ and loss as $\frac{1}{V^2}$:`,
        {
          type: 'plot',
          alt: 'Line loss of a feeder delivering 10 MW at 0.9 power factor through 0.5 ohm conductors, against its line voltage: 324 kW at 13.8 kV, falling steeply to 52 kW at 34.5 kV and lower beyond.',
          caption: 'The same 10 MW over the same conductors: 324 kW lost at 13.8 kV, 52 kW at 34.5 kV.',
          x: [10, 70],
          y: [0, 650],
          xLabel: 'V_L (kV)',
          yLabel: 'loss (kW)',
          series: [{ f: (v) => (1e14 * 0.5) / ((v * 1000) ** 2 * 0.81) / 1000, label: 'loss', area: true }],
          marks: [{ x: 13.8, label: '13.8' }, { x: 34.5, label: '34.5' }],
        },
      ],
      keyIdeas: [
        r`Radial (cheapest, least reliable), loop (two feeds), network (most reliable, urban).`,
        r`Philippines: 230 V secondary; 13.8 kV and 34.5 kV primary; 69 kV subtransmission.`,
        r`For the same power, $P_{loss} = \frac{P^2R}{V_L^2\cos^2\theta}$: loss falls as $\frac{1}{V^2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Loss at two voltages',
          problem: r`A feeder delivers 10 MW at 0.9 pf through conductors of 0.5 Ω each. Compare its losses at 13.8 kV and at 34.5 kV.`,
          steps: [
            r`At 13.8 kV: $\frac{(10^7)^2 \times 0.5}{13\,800^2 \times 0.81} = 324.1$ kW.`,
            r`At 34.5 kV: 51.9 kW, $\left(\frac{13.8}{34.5}\right)^2 = 0.16$ as much.`,
          ],
          answer: r`324 kW against 52 kW.`,
        },
        {
          level: 'board',
          title: 'Conductor saved by a higher voltage',
          problem: r`The feeder is rebuilt at 34.5 kV and allowed the same 324 kW loss. How does the conductor's cross-section compare?`,
          steps: [
            r`Same loss with the current down by $\frac{13.8}{34.5}$ allows R to rise by $\left(\frac{34.5}{13.8}\right)^2 = 6.25$.`,
            r`Cross-section goes as $\frac{1}{R}$: $\frac{1}{6.25} = 0.16$ of the original.`,
          ],
          answer: r`16% of the cross-section.`,
        },
      ],
      traps: [
        r`Use LINE voltage with this three-phase form, and R of one conductor.`,
        r`Loss falls as the SQUARE of voltage, not in proportion.`,
      ],
      check: [
        { q: r`Which system type is most reliable?`, a: r`The network (mesh) system.` },
        { q: r`What are the usual Philippine primary distribution voltages?`, a: r`13.8 kV and 34.5 kV.` },
      ],
    },
    {
      name: 'Load Characteristics and Factors',
      inShort: r`Ratios that turn connected load into what equipment actually sees.`,
      body: [
        r`Equipment is sized for the load it will actually see, not the sum of every nameplate. A few ratios describe how loads behave:`,
        r`| Factor | Definition | Range |
|---|---|---|
| Demand factor | $\frac{\text{maximum demand}}{\text{connected load}}$ | at most 1 |
| Diversity factor | $\frac{\sum\text{individual maxima}}{\text{group maximum}}$ | at least 1 |
| Load factor | $\frac{\text{average load}}{\text{peak load}}$ | at most 1 |
| Loss factor | $\frac{\text{average loss}}{\text{peak loss}}$, about $0.3\text{LF} + 0.7\text{LF}^2$ | between LF² and LF |`,
        {
          type: 'plot',
          alt: 'A daily load curve: 400 kW from midnight to 9 am, 1000 kW from 9 am to 5 pm, then 400 kW to midnight, with the average of 600 kW drawn across.',
          caption: 'A daily load curve: 1000 kW for 8 h, 400 kW for 16 h; the average, 600 kW, sets the load factor 0.60.',
          x: [0, 24],
          y: [0, 1200],
          xLabel: 'hour',
          yLabel: 'P (kW)',
          series: [{ f: (h) => (h >= 9 && h < 17 ? 1000 : 400), label: 'P', area: true }],
          marks: [{ y: 600, label: 'average 600 kW' }],
        },
      ],
      keyIdeas: [
        r`Demand factor $= \frac{\text{max demand}}{\text{connected load}}$; diversity factor $= \frac{\sum \text{individual maxima}}{\text{group maximum}}$ (≥ 1).`,
        r`Load factor $= \frac{\text{average}}{\text{peak}}$; energy $= \text{LF} \times P_{\max} \times T$.`,
        r`Loss factor $\approx 0.3\text{LF} + 0.7\text{LF}^2$, between $\text{LF}^2$ and LF.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Energy, load factor and loss factor',
          problem: r`A load runs at its 1000 kW peak for 8 h and at 400 kW for 16 h a day. Find the daily energy, load factor and loss factor.`,
          steps: [
            r`Energy $= 8000 + 6400 = 14\,400$ kWh; LF $= \frac{14\,400}{24\,000} = 0.60$.`,
            r`Loss factor $= \frac{8 \times 1 + 16 \times 0.4^2}{24} = 0.44$ (the estimate gives 0.43).`,
          ],
          answer: r`14 400 kWh; 0.60; 0.44.`,
        },
        {
          level: 'board',
          title: 'Demand and diversity',
          problem: r`Three consumers with 200 kW connected in all reach individual maxima of 50, 30 and 40 kW, but the group peak is only 100 kW. Find the diversity factor and the group's demand factor.`,
          steps: [
            r`Diversity $= \frac{50 + 30 + 40}{100} = 1.2$.`,
            r`Demand factor $= \frac{100}{200} = 0.5$.`,
          ],
          answer: r`1.2; 0.5.`,
        },
      ],
      traps: [
        r`Diversity factor is at least 1; demand, load and loss factors are at most 1.`,
        r`Loss factor is not load factor: losses go as the square of load.`,
      ],
      check: [
        { q: r`A 500 kW-peak load uses 6000 kWh a day. What is its load factor?`, a: r`$\frac{6000}{12\,000} = 0.5$.` },
        { q: r`Why does diversity let a transformer serve more customers?`, a: r`Their peaks come at different times, so the group peak is less than the sum.` },
      ],
    },
    {
      name: 'Primary and Secondary Feeders',
      inShort: r`Feeders carry load out from the substation; how the load is spread sets drop and loss.`,
      body: [
        r`A feeder (or distributor) with loads tapped along it carries less current the farther out it goes, so the drop is added section by section: the current in each section times that section's resistance. A **uniformly distributed** load is the limit of many small taps: its drop is as if the whole load sat at the middle, $\frac{IR}{2}$, and its loss $\frac{I^2R}{3}$.`,
        r`A feeder **fed from both ends** at equal voltage shares the loads by the lever rule, $I_A = \sum I_k\frac{L - x_k}{L}$, and the lowest voltage is at the load where the two currents meet:`,
        {
          type: 'plot',
          alt: 'Voltage along a 1 km feeder fed from both ends at 230 V, with loads of 100 A at 200 m, 150 A at 500 m and 80 A at 800 m: dipping to its lowest, 11.1 V down, at the 500 m load, and back to 230 V at the far end.',
          caption: 'Fed from both ends (0.2 Ω/km): the voltage dips to its lowest at the 500 m load, where the two feeds meet.',
          x: [0, 1000],
          y: [215, 232],
          xLabel: 'distance (m)',
          yLabel: 'V (V)',
          series: [
            {
              f: (x) => {
                if (x <= 200) return 230 - 0.0002 * 171 * x;
                if (x <= 500) return 230 - 6.84 - 0.0002 * 71 * (x - 200);
                if (x <= 800) return 230 - 11.1 + 0.0002 * 79 * (x - 500);
                return 230 - 6.36 + 0.0002 * 159 * (x - 800);
              },
              label: 'V',
            },
          ],
          marks: [{ x: 500, label: 'lowest' }],
        },
      ],
      keyIdeas: [
        r`Uniformly distributed load: drop $\frac{IR}{2}$ (as if lumped at the middle), loss $\frac{I^2R}{3}$.`,
        r`Fed from both ends: $I_A = \sum I_k\frac{L - x_k}{L}$; the lowest voltage is where the currents meet.`,
        r`Concentrated loads: add each section's current × resistance from the source out.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Fed from both ends',
          problem: r`A 1 km feeder fed equally from both ends carries 100 A at 200 m, 150 A at 500 m and 80 A at 800 m. Find the current from each end and the lowest-voltage point.`,
          steps: [
            r`$I_A = 100(0.8) + 150(0.5) + 80(0.2) = 171$ A, $I_B = 330 - 171 = 159$ A.`,
            r`After the first load 71 A continues from A, less than the 150 A load at 500 m: the lowest voltage is there.`,
          ],
          answer: r`171 A and 159 A; lowest at 500 m.`,
        },
        {
          level: 'board',
          title: 'A distributor with concentrated loads',
          problem: r`A distributor with 0.05 Ω/km loop resistance supplies 40 A at 3 km, 60 A at 5 km and 80 A at 8 km. Find the drop to the far end.`,
          steps: [
            r`Sections carry 180 A (0 to 3 km), 140 A (3 to 5 km), 80 A (5 to 8 km).`,
            r`Drop $= 180 \times 3 \times 0.05 + 140 \times 2 \times 0.05 + 80 \times 3 \times 0.05 = 27 + 14 + 12 = 53$ V.`,
          ],
          answer: r`53 V.`,
        },
      ],
      traps: [
        r`Drop uses ½, loss uses ⅓: different equivalent points for the same feeder.`,
        r`Each section carries every load BEYOND it, not just the next one.`,
      ],
      check: [
        { q: r`A 2 km feeder of 0.3 Ω/km carries 200 A uniformly distributed. What is its drop and loss (one conductor)?`, a: r`$\frac{200 \times 0.6}{2} = 60$ V; $\frac{200^2 \times 0.6}{3} = 8$ kW.` },
        { q: r`Where is the lowest voltage on a doubly fed feeder?`, a: r`At the load where the currents from the two ends meet.` },
      ],
    },
    {
      name: 'Voltage Drop',
      inShort: r`$\Delta V \approx I(R\cos\theta + X\sin\theta)$ per conductor.`,
      body: [
        r`The sending voltage is the receiving voltage plus the line drop, $\mathbf{V}_s = \mathbf{V}_r + \mathbf{I}(R + jX)$. On a distribution feeder the angle between them is small, so the drop is nearly the part of $\mathbf{I}Z$ in line with $V_r$: $\Delta V \approx I(R\cos\theta + X\sin\theta)$ per conductor.`,
        {
          type: 'phasor',
          alt: 'The voltage-drop phasor diagram with the drops exaggerated: the receiving voltage to the right, the current lagging, the IR drop in line with the current and the IX drop at right angles, ending at the sending voltage; the drop measured along the receiving voltage is IR cos theta plus IX sin theta.',
          caption: 'Vs = Vr + IR + jIX (drops exaggerated): the drop along Vr is IR cos θ + IX sin θ.',
          axes: false,
          vectors: [
            { name: 'Vr', mag: 2.4, angle: 0, label: 'V_r' },
            { mag: 1, angle: -31.79, label: 'I', colour: 1 },
            { name: 'IR', mag: 0.4, angle: -31.79, from: 'Vr', label: 'IR', colour: 3 },
            { mag: 0.8, angle: 58.21, from: 'IR', label: 'jIX', colour: 3 },
            { mag: 3.1961, angle: 8.44, label: 'V_s', colour: 2, labelAt: 'mid' },
          ],
        },
        r`| Circuit | Drop |
|---|---|
| Three phase | per-phase $\Delta V$; line value $\sqrt3$ times |
| Single phase, two wire | twice one conductor's drop |
| PEC limits | 3% on a feeder or branch, 5% in all |`,
      ],
      keyIdeas: [
        r`$\Delta V \approx I(R\cos\theta + X\sin\theta)$ per conductor.`,
        r`Three phase: per-phase drop, line drop $\sqrt3$ times; single-phase two-wire: double the conductor drop.`,
        r`Percent drop on nominal voltage; PEC limits 3% feeder or branch, 5% total.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A primary feeder',
          problem: r`A 13.8 kV feeder carries 150 A at 0.85 lagging through $R = 1.2$ Ω and $X = 2.4$ Ω per conductor. Find the drop.`,
          steps: [
            r`$\sin\theta = 0.527$: $\Delta V = 150(1.2 \times 0.85 + 2.4 \times 0.527) = 342.6$ V per phase.`,
            r`On $\frac{13\,800}{\sqrt3} = 7967$ V: 4.30%.`,
          ],
          answer: r`343 V per phase, 4.30%.`,
        },
        {
          level: 'board',
          title: 'A single-phase service',
          problem: r`A 230 V single-phase service carries 40 A at 0.9 pf over 50 m of cable with 1.5 Ω/km per conductor (reactance negligible). Find the drop and check it against 3%.`,
          steps: [
            r`One conductor: $0.05 \times 1.5 = 0.075$ Ω. Two-wire drop $= 2 \times 40 \times 0.075 \times 0.9 = 5.4$ V.`,
            r`$\frac{5.4}{230} = 2.35\%$, within 3%.`,
          ],
          answer: r`5.4 V, 2.35%: within the limit.`,
        },
      ],
      traps: [
        r`Compare a per-phase drop with PHASE voltage (7967 V here), not line voltage.`,
        r`A single-phase circuit has two conductors: double the drop.`,
      ],
      check: [
        { q: r`At unity power factor, which part of the impedance makes the drop?`, a: r`The resistance: $\sin\theta = 0$.` },
        { q: r`What is the PEC's total voltage-drop limit for feeder plus branch?`, a: r`5%.` },
      ],
    },
    {
      name: 'Voltage Regulation and Capacitors',
      inShort: r`Regulators and capacitors hold feeder voltage within limits and cut losses.`,
      body: [
        r`A **step voltage regulator** (an autotransformer with a tap changer) holds the feeder voltage, typically ±10% in 32 steps of 0.625%. Its **line-drop compensator** models the feeder's impedance so it holds the voltage at a load centre down the line, not just at its own terminals: $R_{set} = \frac{I_{CT}}{N_{PT}}R_{line}$ (in compensator volts).`,
        r`**Shunt capacitors** supply vars locally, raising the voltage by about $\%\Delta V = \frac{\text{kvar} \cdot X}{10\,\text{kV}^2}$ and cutting the loss upstream. The saving, $\frac{R(2QQ_C - Q_C^2)}{V^2}$, is largest when the bank cancels the whole reactive load:`,
        {
          type: 'plot',
          alt: 'Loss saved against the size of a capacitor bank for a feeder carrying 1500 kvar: a parabola rising to its largest at 1500 kvar, then falling, and back to zero at 3000 kvar.',
          caption: 'Loss saved against bank size on a 1500 kvar load: largest at 1500 kvar; oversizing gives the saving back.',
          x: [0, 3000],
          y: [0, 1.15],
          xLabel: 'Q_C (kvar)',
          yLabel: 'saving (per unit of max)',
          series: [{ f: (q) => (2 * 1500 * q - q * q) / 1500 ** 2, label: 'saving', area: true }],
          marks: [{ x: 1500, label: 'Q_C = Q' }],
        },
        r`For a feeder with its load spread evenly, the **two-thirds rule** places a single bank of $\frac23$ of the feeder's vars at $\frac23$ of its length.`,
      ],
      keyIdeas: [
        r`Step regulator: ±10% in 32 steps of 0.625%; line-drop compensation $R_{set} = \frac{I_{CT}}{N_{PT}}R_{line}$.`,
        r`Shunt capacitor rise: $\%\Delta V = \frac{\text{kvar} \cdot X}{10\,\text{kV}^2}$; loss saving $\frac{R(2QQ_C - Q_C^2)}{V^2}$.`,
        r`Two-thirds rule: $\frac23$ of the vars at $\frac23$ of the length for an evenly loaded feeder.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Capacitor rise and placement',
          problem: r`A 600 kvar bank is added on a 13.8 kV feeder with 4 Ω reactance back to the source. Find the voltage rise. Where should one capacitor go on a 3 km feeder with 1500 kvar spread evenly?`,
          steps: [
            r`$\%\Delta V = \frac{600 \times 4}{10 \times 13.8^2} = 1.26\%$.`,
            r`Two-thirds rule: 1000 kvar at 2 km from the substation.`,
          ],
          answer: r`1.26%; 1000 kvar at 2 km.`,
        },
        {
          level: 'board',
          title: 'Setting a regulator',
          problem: r`A regulator has a 600 A CT (rated 0.2 A secondary) and a 7620/120 V PT. The line to the load centre has 2 Ω resistance. Find the R setting of the compensator, and how many steps raise the voltage 5%.`,
          steps: [
            r`$N_{PT} = \frac{7620}{120} = 63.5$: $R_{set} = \frac{600}{63.5} \times 2 = 18.9$ V.`,
            r`$\frac{5}{0.625} = 8$ steps.`,
          ],
          answer: r`18.9 V; 8 steps.`,
        },
      ],
      traps: [
        r`Fixed capacitors sized for peak can push voltage too high at light load.`,
        r`Oversizing a bank past the reactive load starts to INCREASE the loss again.`,
      ],
      check: [
        { q: r`How much does one step of a 32-step ±10% regulator change the voltage?`, a: r`0.625%.` },
        { q: r`Why switch capacitors off at light load?`, a: r`To avoid overvoltage when the load's vars fall.` },
      ],
    },
    {
      name: 'Distribution Transformers',
      inShort: r`Sized for peak and loss of life, not just nameplate kVA.`,
      body: [
        r`A transformer's life is its insulation's life, and insulation ages faster the hotter it runs. The hottest spot in the winding is $\theta_H = \theta_A + \Delta\theta_{TO} + \Delta\theta_H$ (ambient, top-oil rise, hot-spot rise over the oil); a 65 °C-rise unit is designed for 110 °C. Above that, aging roughly doubles for every 6 to 7 °C:`,
        {
          type: 'plot',
          alt: 'The aging acceleration factor of transformer insulation against hottest-spot temperature from 80 to 140 degrees: 1 at 110 degrees, 2.7 at 120 degrees and 17 at 140 degrees, rising exponentially.',
          caption: 'Aging factor against hottest-spot temperature: 1 at the 110 °C design point, 2.7 at 120 °C, 17 at 140 °C.',
          x: [80, 140],
          y: [0, 20],
          xLabel: 'θ_H (°C)',
          yLabel: 'F_{AA}',
          series: [{ f: aging, label: 'F_{AA}', area: true }],
          marks: [{ x: 110, label: '110 °C: 1' }],
        },
        r`So short overloads are acceptable when cooler hours make up for them: the day's **equivalent aging** $F_{EQA} = \frac{\sum F_{AA}\Delta t}{\sum\Delta t}$ should stay at or below 1. Distribution transformers are energized all day but lightly loaded much of it, so their core loss matters more than their copper loss.`,
      ],
      keyIdeas: [
        r`Hottest spot $\theta_H = \theta_A + \Delta\theta_{TO} + \Delta\theta_H$; 110 °C design for 65 °C-rise units.`,
        r`Aging factor $F_{AA} = \exp\left(\frac{15000}{383} - \frac{15000}{\theta_H + 273}\right)$: about double for every 6 to 7 °C.`,
        r`Equivalent aging over a day $\frac{\sum F_{AA}\Delta t}{24} \le 1$; low core loss matters most.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An emergency overload',
          problem: r`A transformer's hottest spot reaches 120 °C during an emergency. How fast does it age compared with normal?`,
          steps: [r`$F_{AA} = \exp\left(\frac{15000}{383} - \frac{15000}{393}\right) = 2.71$: an hour at 120 °C uses 2.7 normal hours of life.`],
          answer: r`2.71 times normal.`,
        },
        {
          level: 'board',
          title: 'Equivalent aging over a day',
          problem: r`The transformer runs 4 h at 120 °C and 20 h at 98 °C. Is its day's aging acceptable?`,
          steps: [
            r`At 98 °C: $F_{AA} = \exp\left(\frac{15000}{383} - \frac{15000}{371}\right) = 0.282$.`,
            r`$F_{EQA} = \frac{4 \times 2.71 + 20 \times 0.282}{24} = 0.686$, below 1.`,
          ],
          answer: r`Yes: 0.686 of a normal day's aging.`,
        },
      ],
      traps: [
        r`Short overloads are fine if the average aging over the day stays at or below 1.`,
        r`Use kelvin (θ + 273) inside the aging formula.`,
      ],
      check: [
        { q: r`What hottest-spot temperature gives normal aging for a 65 °C-rise transformer?`, a: r`110 °C.` },
        { q: r`Why choose low core loss for distribution transformers?`, a: r`They are energized all day but lightly loaded, so core loss dominates.` },
      ],
    },
    {
      name: 'Substation Types and Bus Schemes',
      inShort: r`Bus layouts trade cost against reliability and maintainability.`,
      body: [
        r`Substations are classed by function (generating step-up, transmission, distribution, switching) and construction (outdoor, indoor, gas-insulated). Their **bus scheme** decides what a single fault or a breaker's maintenance takes out of service:`,
        r`| Scheme | Breakers per circuit | A bus fault takes out | Breaker maintenance |
|---|---|---|---|
| Single bus | 1 | everything | the circuit is off |
| Sectionalized bus | 1 (+ tie) | one section | the circuit is off |
| Main and transfer | 1 (+ tie) | everything | via the transfer bus |
| Ring | 1 | nothing (the ring opens) | the ring opens |
| Breaker-and-a-half | 1.5 | nothing | no circuit lost |
| Double bus, double breaker | 2 | nothing | no circuit lost |`,
        {
          type: 'circuit',
          alt: 'One breaker-and-a-half bay: two buses, three breakers in series between them, and two circuits taken off between the breakers.',
          caption: 'A breaker-and-a-half bay: three breakers serve two circuits between the two buses.',
          parts: [
            ['bus', [0, 0], [0, 2], 'bus 1', { side: 'left' }],
            ['cb', [0, 1], [2, 1]],
            ['cb', [2, 1], [4, 1]],
            ['cb', [4, 1], [6, 1]],
            ['bus', [6, 0], [6, 2], 'bus 2'],
            ['load', [2, 1], [2, 2.5], 'circuit A'],
            ['load', [4, 1], [4, 2.5], 'circuit B'],
          ],
        },
      ],
      keyIdeas: [
        r`Single bus (cheap, one fault drops all), sectionalized, main-and-transfer, ring, breaker-and-a-half, double bus double breaker.`,
        r`Breakers per circuit: 1 (single bus, ring), 1.5 (breaker-and-a-half), 2 (double bus double breaker).`,
        r`Types by function: generating, transmission, distribution, switching; outdoor, indoor, GIS.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Counting breakers',
          problem: r`A substation has 6 circuits. How many breakers does each scheme need: ring, breaker-and-a-half, double bus double breaker?`,
          steps: [r`Ring: 6. Breaker-and-a-half: $1.5 \times 6 = 9$. Double bus double breaker: 12.`],
          answer: r`6, 9 and 12.`,
        },
        {
          level: 'board',
          title: 'What a bus fault costs',
          problem: r`The same 6 circuits on a single bus, a bus split in two halves with a tie breaker, and a breaker-and-a-half: how many circuits does a bus fault interrupt in each?`,
          steps: [r`Single bus: all 6. Sectionalized: the 3 on the faulted half. Breaker-and-a-half: none, because every circuit is still fed from the other bus.`],
          answer: r`6, 3 and 0.`,
        },
      ],
      traps: [
        r`A ring bus opened for maintenance is a weaker radial system until it is closed again.`,
        r`Main-and-transfer protects against breaker maintenance, not bus faults.`,
      ],
      check: [
        { q: r`Which scheme uses two breakers per circuit?`, a: r`Double bus, double breaker.` },
        { q: r`What does GIS stand for?`, a: r`Gas-insulated switchgear (SF₆), compact for cities.` },
      ],
    },
    {
      name: 'Substation Equipment',
      inShort: r`Transformers, breakers, switches, instrument transformers, arresters, capacitors and reactors.`,
      body: [
        r`| Equipment | Job |
|---|---|
| Power transformer | steps voltage down; ratings by cooling stage, e.g. ONAN/ONAF 30/40/50 MVA |
| Circuit breaker | interrupts load and fault currents (rated in kA and kV) |
| Disconnect switch | isolates equipment, only with no current |
| Load-break switch | interrupts load current, not faults |
| CTs and VTs | feed relays and meters |
| Surge arresters | clamp lightning and switching surges |
| Shunt capacitors and reactors | supply or absorb vars |
| Current-limiting reactors | hold fault current within breaker ratings |`,
        r`When a growing system's fault level outgrows its breakers, a **current-limiting reactor** in series adds just enough impedance: in per unit on a chosen base, $X_r = \frac{1}{\text{MVA}_{new,pu}} - \frac{1}{\text{MVA}_{old,pu}}$.`,
      ],
      keyIdeas: [
        r`Power transformers carry ONAN/ONAF ratings (e.g. 30/40/50 MVA with fans); breakers rated by interrupting kA.`,
        r`Current-limiting reactors: $X_{r,pu} = \frac{1}{\text{MVA}_{new,pu}} - \frac{1}{\text{MVA}_{old,pu}}$.`,
        r`Disconnect switches isolate only with no current; breakers interrupt load and faults.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A current-limiting reactor',
          problem: r`A 13.8 kV bus has 1000 MVA fault level but its breakers handle only 500 MVA. Find the series reactor (100 MVA base).`,
          steps: [
            r`$X_r = \frac{100}{500} - \frac{100}{1000} = 0.10$ pu.`,
            r`$Z_{base} = \frac{13.8^2}{100} = 1.904$ Ω, so $0.10 \times 1.904 = 0.190$ Ω.`,
          ],
          answer: r`0.190 Ω.`,
        },
        {
          level: 'board',
          title: 'The breaker behind a fan-cooled transformer',
          problem: r`A 30/40/50 MVA (ONAN/ONAF/ONAF) transformer feeds a 13.8 kV bus. What continuous current must its secondary breaker carry, and which standard rating (1200, 2000, 3000 A) fits?`,
          steps: [
            r`Top rating: $\frac{50 \times 10^6}{\sqrt3 \times 13\,800} = 2092$ A.`,
            r`2000 A is too small; choose 3000 A.`,
          ],
          answer: r`2092 A; a 3000 A breaker.`,
        },
      ],
      traps: [
        r`Never open a disconnect under load: it cannot interrupt the arc.`,
        r`Size the breaker for the transformer's TOP (forced-cooled) rating.`,
      ],
      check: [
        { q: r`What does ONAF mean?`, a: r`Oil natural, air forced: fans on the radiators.` },
        { q: r`Which switch interrupts load but not fault current?`, a: r`A load-break switch.` },
      ],
    },
    {
      name: 'Substation Grounding',
      inShort: r`Keep step and touch voltages safe during ground faults.`,
      body: [
        r`Grounding design starts with the soil. The **Wenner four-pin** test drives current between two outer pins and measures the voltage between two inner ones, all a apart: $\rho = 2\pi aR$. The grid then carries part of the ground-fault current, $I_G = S_fD_f(3I_0)$ (the split factor $S_f$ for the share that returns through the grid, the decrement factor $D_f$ for dc offset), raising the ground potential to $\text{GPR} = I_GR_g$. If the GPR is below the tolerable touch voltage, the design is safe without further checks:`,
        {
          type: 'plot',
          alt: 'Ground potential rise against grid resistance for a 3300 A grid current: a straight line, crossing the 681 V tolerable touch voltage at 0.206 ohm.',
          caption: 'GPR = IG·Rg for 3300 A: below 0.206 Ω the whole grid stays under the 681 V touch limit.',
          x: [0, 0.6],
          y: [0, 2000],
          xLabel: 'R_g (Ω)',
          yLabel: 'GPR (V)',
          series: [{ f: (rg) => 3300 * rg, label: 'GPR', area: true }],
          marks: [{ y: 681, label: 'touch limit 681 V' }],
        },
        r`Otherwise the mesh voltage $E_m = \frac{\rho K_mK_iI_G}{L_M}$ must be checked against the touch limit, and the step voltage against the step limit, and the grid improved (more conductor, closer spacing, rods, crushed rock) until both pass.`,
      ],
      keyIdeas: [
        r`Soil resistivity by Wenner: $\rho = 2\pi aR$.`,
        r`$\text{GPR} = I_GR_g$ with $I_G = S_fD_f(3I_0)$; if GPR < tolerable touch voltage, the design is safe.`,
        r`Otherwise check mesh voltage $E_m = \frac{\rho K_mK_iI_G}{L_M}$ against touch, and step voltage against step.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Resistivity and GPR',
          problem: r`A Wenner test at 5 m spacing reads 3.82 Ω. A ground fault of 5000 A has split factor 0.6 and decrement 1.1, and the grid is 0.5 Ω. Find the resistivity and GPR.`,
          steps: [
            r`$\rho = 2\pi \times 5 \times 3.82 = 120$ Ω·m.`,
            r`$I_G = 0.6 \times 1.1 \times 5000 = 3300$ A; GPR $= 3300 \times 0.5 = 1650$ V, above a 681 V touch limit, so check mesh voltages.`,
          ],
          answer: r`120 Ω·m; 1650 V.`,
        },
        {
          level: 'board',
          title: 'A grid that needs no mesh check',
          problem: r`What grid resistance would keep the GPR below the 681 V touch limit for the same 3300 A?`,
          steps: [r`$R_g < \frac{681}{3300} = 0.206$ Ω.`],
          answer: r`Below 0.206 Ω.`,
        },
      ],
      traps: [
        r`Shield wires carry part of the fault current home: the split factor reduces the grid current.`,
        r`A low GPR is sufficient, not necessary: a higher one can still pass on mesh and step checks.`,
      ],
      check: [
        { q: r`A Wenner test at 3 m spacing reads 10 Ω. What is the resistivity?`, a: r`$2\pi \times 3 \times 10 = 188.5$ Ω·m.` },
        { q: r`What does the split factor account for?`, a: r`The part of the fault current returning by overhead ground wires and neutrals instead of the grid.` },
      ],
    },
    {
      name: 'Lightning Protection',
      inShort: r`Shield the station with masts and wires; clamp what gets through with arresters.`,
      body: [
        r`Substations are shielded by masts and overhead wires, placed with the **rolling-sphere** method: a sphere of radius R (the striking distance) rolled over the station must never touch live equipment without first touching a mast or wire. Under a single mast of height H, equipment of height y is protected out to $\sqrt{H(2R - H)} - \sqrt{y(2R - y)}$:`,
        {
          type: 'plot',
          alt: 'The protected zone of a 30 m mast with a 45 m rolling sphere: a curved boundary from the mast top falling to the ground 42.4 m away; equipment 10 m tall is protected out to 14.1 m.',
          caption: 'A 30 m mast, 45 m sphere: everything under the curve is protected; 10 m equipment out to 14.1 m.',
          x: [0, 45],
          y: [0, 35],
          xLabel: 'distance from mast (m)',
          yLabel: 'height (m)',
          series: [{ f: (x) => (x <= Math.sqrt(1800) ? 45 - Math.sqrt(45 ** 2 - (Math.sqrt(1800) - x) ** 2) : 0), label: 'protected', area: true }],
          marks: [{ x: Math.sqrt(1800) - Math.sqrt(800), label: '14.1 m' }],
        },
        r`How often lightning strikes depends on the local thunderstorm days: ground flash density $N_g = 0.04T_d^{1.25}$ per km² per year, and a line of height h and width b collects $\frac{N_g(b + 28h^{0.6})}{10}$ strikes per 100 km per year. Arresters at the transformer terminals and line entrances clamp what gets through.`,
      ],
      keyIdeas: [
        r`Rolling sphere: protected distance $\sqrt{H(2R - H)} - \sqrt{y(2R - y)}$.`,
        r`Ground flash density $N_g = 0.04T_d^{1.25}$; strikes to a line $\frac{N_g(b + 28h^{0.6})}{10}$ per 100 km per year.`,
        r`Arresters at transformer terminals and line entrances; protective margin at least 20%.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A mast\'s reach',
          problem: r`A 30 m mast is designed with a 45 m rolling sphere. How far out is 10 m-high equipment protected?`,
          steps: [r`$d = \sqrt{30 \times 60} - \sqrt{10 \times 80} = 42.43 - 28.28 = 14.1$ m.`],
          answer: r`14.1 m.`,
        },
        {
          level: 'board',
          title: 'Strikes to a line',
          problem: r`How many strikes per 100 km per year hit a line 20 m high and 10 m wide, in an area with 80 thunderstorm days a year?`,
          steps: [
            r`$N_g = 0.04 \times 80^{1.25} = 9.57$ per km² per year.`,
            r`$N = \frac{9.57(10 + 28 \times 20^{0.6})}{10} = 171$.`,
          ],
          answer: r`About 171 strikes per 100 km per year.`,
        },
      ],
      traps: [
        r`Masts taller than the sphere radius do not protect more ground: cap H at R.`,
        r`Use the equipment's height y in the second root, not the mast's.`,
      ],
      check: [
        { q: r`How far from a 30 m mast (45 m sphere) is ground level protected?`, a: r`$\sqrt{30 \times 60} = 42.4$ m.` },
        { q: r`What sets the rolling sphere's radius?`, a: r`The striking distance of the smallest stroke current to be intercepted.` },
      ],
    },
    {
      name: 'Reliability Indices',
      inShort: r`How often and how long customers lose power (IEEE 1366).`,
      body: [
        r`Distribution reliability is measured from the customers' side (IEEE 1366), counting sustained interruptions (longer than 5 minutes):`,
        r`| Index | Formula | Means |
|---|---|---|
| SAIFI | $\frac{\sum N_i}{N_T}$ | interruptions per customer per year |
| SAIDI | $\frac{\sum r_iN_i}{N_T}$ | minutes out per customer per year |
| CAIDI | $\frac{\text{SAIDI}}{\text{SAIFI}}$ | average restoration time |
| ASAI | $1 - \frac{\text{SAIDI}}{525\,600}$ | fraction of the year with power |
| MAIFI | momentary interruptions per customer | under 5 minutes |`,
        r`For equipment, availability is $\frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}}$. Components in series (all needed) multiply their availabilities; redundant ones in parallel (any one enough) multiply their unavailabilities, which is why a second feed improves service so much.`,
      ],
      keyIdeas: [
        r`SAIFI $= \frac{\sum N_i}{N_T}$; SAIDI $= \frac{\sum r_iN_i}{N_T}$; CAIDI $= \frac{\text{SAIDI}}{\text{SAIFI}}$; ASAI $= 1 - \frac{\text{SAIDI}}{525\,600}$.`,
        r`Sustained interruptions (over 5 min) only; momentary in MAIFI.`,
        r`Availability $\frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}}$; series multiply availabilities, parallel multiply unavailabilities.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The four indices',
          problem: r`A utility with 10 000 customers had three outages: 2000 customers for 90 min, 500 for 30 min, 1500 for 240 min. Find SAIFI, SAIDI, CAIDI and ASAI.`,
          steps: [
            r`SAIFI $= \frac{4000}{10\,000} = 0.40$.`,
            r`SAIDI $= \frac{180\,000 + 15\,000 + 360\,000}{10\,000} = 55.5$ min.`,
            r`CAIDI $= \frac{55.5}{0.40} = 138.75$ min; ASAI $= 1 - \frac{55.5}{525\,600} = 0.99989$.`,
          ],
          answer: r`0.40; 55.5 min; 139 min; 0.99989.`,
        },
        {
          level: 'board',
          title: 'Series against parallel feeds',
          problem: r`A feeder fails on average every 8760 h and takes 4 h to repair. Find its availability, then the availability of two such feeders in series and in parallel.`,
          steps: [
            r`$A = \frac{8760}{8760 + 4} = 0.99954$.`,
            r`Series: $0.99954^2 = 0.99909$. Parallel: $1 - (1 - 0.99954)^2 = 0.9999998$.`,
          ],
          answer: r`0.99954; 0.99909 in series; 0.9999998 in parallel.`,
        },
      ],
      traps: [
        r`CAIDI can get worse while service gets better, if short outages are eliminated first.`,
        r`Momentary interruptions are not in SAIFI.`,
      ],
      check: [
        { q: r`Which index gives the average restoration time?`, a: r`CAIDI.` },
        { q: r`How many minutes are in a year?`, a: r`525 600.` },
      ],
    },
    {
      name: 'Philippine Distribution Code',
      inShort: r`The ERC's rules for distribution utilities and the users connected to them.`,
      body: [
        r`The Philippine Distribution Code (ERC, 2017 edition) sets the rules for distribution utilities and the users connected to them: performance standards, connection and planning procedures, and the power-quality limits at the connection point.`,
        r`| Requirement | Limit |
|---|---|
| User power factor at the connection point | at least 0.85 lagging ($Q \le 0.62P$) |
| Voltage unbalance (normal operation) | at most 2.5% |
| Voltage total harmonic distortion | at most 5% |
| Current total demand distortion (TDD) | at most 5% |
| Service voltage | within about ±10% of nominal |`,
        r`Voltage unbalance is the largest deviation from the average of the three line voltages, over that average. TDD is the harmonic current relative to the **maximum demand** current, not the present current, so a lightly loaded plant isn't penalized for a high percentage of small harmonics.`,
      ],
      keyIdeas: [
        r`Users keep power factor at least 0.85 lagging at the connection point ($Q \le 0.62P$).`,
        r`Voltage unbalance at most 2.5% in normal operation; voltage THD and current TDD at most 5%.`,
        r`Service voltage is held within about ±10% of nominal; the code also sets reliability and connection procedures.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Power factor and unbalance',
          problem: r`A 500 kW plant runs at 0.80 pf. How many kvar of capacitors bring it to the PDC minimum? Its line voltages read 400, 392 and 386 V: is the unbalance within the limit?`,
          steps: [
            r`$Q = 500\tan(\cos^{-1}0.8) = 375$ kvar now; at 0.85 the limit is 309.9 kvar, so at least 65.1 kvar.`,
            r`Average 392.7 V, largest deviation 7.3 V: 1.87%, within 2.5%.`,
          ],
          answer: r`At least 65 kvar; 1.87% unbalance, within the limit.`,
        },
        {
          level: 'board',
          title: 'Total demand distortion',
          problem: r`A plant's maximum demand current is 300 A. Its 5th and 7th harmonic currents are 12 A and 8 A. Is its TDD within 5%?`,
          steps: [r`TDD $= \frac{\sqrt{12^2 + 8^2}}{300} = \frac{14.42}{300} = 4.81\%$.`],
          answer: r`4.81%: within the limit.`,
        },
      ],
      traps: [
        r`TDD is relative to maximum demand current, not the present current: light loads aren't penalized.`,
        r`Unbalance uses the AVERAGE voltage, not the nominal.`,
      ],
      check: [
        { q: r`What is the PDC's minimum power factor for users?`, a: r`0.85 lagging.` },
        { q: r`What is the PDC limit on voltage unbalance?`, a: r`2.5%.` },
      ],
    },
  ],
};
