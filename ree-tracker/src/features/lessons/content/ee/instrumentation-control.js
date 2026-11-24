// Library › Lessons › EE › Instrumentation & Control
// (2026-11-19; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// instrumentationLesson.test.js. Coverage and problem styles cross-checked
// against a review center's instruments-and-control handout; the text, problems
// and figures are this app's own): written for the Philippine REE board,
// subtopic by subtopic in the syllabus's order. Two-wattmeter is in Electric
// Circuits 2, metering multipliers in Apparatus & Devices, control theory
// (transfer functions, stability) in Feedback Control Systems.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// A 900 Hz sine sampled at 1 kHz (t in ms): at every sample (each whole ms) it
// equals a 100 Hz sine.
const alias = (t) => -Math.sin(2 * Math.PI * 0.1 * t);

export default {
  topic: 'Instrumentation & Control',
  subject: 'EE',
  overview: r`Instrumentation is measuring well: knowing how accurate a reading is, how the meter itself disturbs the circuit, and which instrument fits the job (meters, bridges, potentiometers, wattmeters, oscilloscopes). Control is acting on those measurements: sensors and transducers turn temperature, strain or pressure into signals; data acquisition samples them; controllers (PID, PLCs) decide; SCADA ties a whole system together. Calibration keeps it all honest by tracing every instrument back to a better standard. Most board items here are short calculations on a known circuit or rule.`,
  sources: [
    'Electronic Instrumentation and Measurement Techniques (Cooper and Helfrick)',
    'A Course in Electrical and Electronic Measurements and Instrumentation (Sawhney)',
    'Process Control Instrumentation Technology (Johnson)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Measurement and Errors',
      inShort: r`Every reading has an error; know how big, and how it combines.`,
      body: [
        r`**Accuracy** is closeness to the true value; **precision** is closeness of repeated readings to each other; **resolution** is the smallest change the instrument shows; **sensitivity** is output per unit input. Errors are **gross** (blunders: wrong range, misread scale), **systematic** (instrument, environmental, loading: they bias every reading the same way and can be corrected) or **random** (scatter, reduced by averaging).`,
        r`An analog meter's accuracy is usually quoted as a percentage of FULL SCALE, so the same absolute error is a larger share of a small reading, $\%e_{FS}\frac{FS}{\text{reading}}$. Read in the upper part of the scale:`,
        {
          type: 'plot',
          alt: 'The percentage error of a reading on a 150 V meter accurate to 1 percent of full scale, against the reading: 1 percent at full scale, 3 percent at 50 V, rising steeply to 10 percent at 15 V.',
          caption: 'A ±1% of full scale, 150 V meter: ±3% of the reading at 50 V, ±10% at 15 V.',
          x: [15, 150],
          y: [0, 11],
          xLabel: 'reading (V)',
          yLabel: 'error (%)',
          series: [{ f: (v) => 150 / v, label: 'error', area: true }],
          marks: [{ x: 50, label: '50 V' }],
        },
        r`When results are combined, **products and quotients add relative errors**; **sums and differences add absolute errors** (worst case). And every meter **loads** the circuit: a voltmeter of resistance $R_m$ across a source with Thévenin resistance $R_{th}$ reads $V_{th}\frac{R_m}{R_{th} + R_m}$. A voltmeter's resistance is its sensitivity (Ω/V) times the range in use.`,
        r`A voltmeter's own resistance can also measure a very high one: put it in series with the unknown across a known voltage V. If it reads $V_m$, the unknown is $R_x = R_m\frac{V - V_m}{V_m}$, the usual way to check a motor's insulation with a voltmeter.`,
      ],
      keyIdeas: [
        r`Accuracy, precision, resolution, sensitivity; gross, systematic and random errors.`,
        r`Full-scale accuracy at a reading: $\%e_{FS}\frac{FS}{\text{reading}}$.`,
        r`Products add relative errors, sums add absolute errors; a voltmeter loads the circuit: $V_m = V_{th}\frac{R_m}{R_{th} + R_m}$.`,
        r`Series voltmeter method: $R_x = R_m\frac{V - V_m}{V_m}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Full-scale error and loading',
          problem: r`A 150 V meter is accurate to ±1% of full scale. What is the error on a 50 V reading? A 20 kΩ/V meter on its 10 V range reads a 10 V source with 100 kΩ Thévenin resistance: what does it show?`,
          steps: [
            r`$1\% \times \frac{150}{50} = \pm3\%$ of the reading.`,
            r`$R_m = 20\,000 \times 10 = 200$ kΩ: $V_m = 10 \times \frac{200}{300} = 6.67$ V.`,
          ],
          answer: r`±3%; 6.67 V.`,
        },
        {
          level: 'board',
          title: 'Insulation by the voltmeter method',
          problem: r`A 100 kΩ voltmeter in series with a motor's insulation across a 500 V dc supply reads 4 V. Find the insulation resistance. If the 500 V is itself known to ±1% and the reading to ±2%, roughly what is the worst-case error of the result?`,
          steps: [
            r`$R_x = 100\,000 \times \frac{500 - 4}{4} = 12.4$ MΩ.`,
            r`The result goes about as $\frac{V}{V_m}$, a quotient: relative errors add, $1 + 2 = 3\%$.`,
          ],
          answer: r`12.4 MΩ, to about ±3%.`,
        },
      ],
      traps: [
        r`Use the meter resistance on the RANGE in use, not on its highest range.`,
        r`Errors of a product add as PERCENTAGES; errors of a sum add as UNITS.`,
      ],
      check: [
        { q: r`Which errors can be removed by calibration and correction?`, a: r`Systematic errors.` },
        { q: r`$P = VI$ with V to ±1% and I to ±2%. What is the worst-case error of P?`, a: r`±3%.` },
      ],
    },
    {
      name: 'Analog Meters',
      inShort: r`Moving-coil meters extended with shunts and multipliers.`,
      body: [
        r`**Absolute** instruments give the quantity from their own constants (a tangent galvanometer); **secondary** instruments must be calibrated against one. Secondary instruments are **indicating** (voltmeter, ammeter: the present value), **recording** (a continuous chart) or **integrating** (energy meters: a total over time). An indicating instrument needs three torques: a **deflecting** torque from the quantity, a **controlling** torque (spring or gravity) that balances it and returns the pointer to zero, and a **damping** torque that stops it swinging (air, fluid or, most effective, eddy-current damping).`,
        r`| Instrument | Works by | Use |
|---|---|---|
| Permanent-magnet moving coil (d'Arsonval) | coil in a magnet's field | dc only; uniform scale; most sensitive |
| Moving iron | iron vane attracted or repelled | ac and dc; square-law (reverse the leads: same reading) |
| Electrodynamometer | fixed and moving coils | ac and dc; wattmeters, transfer standard |
| Induction | eddy currents in a disc | ac only; energy meters |
| Thermocouple, hot-wire | heating effect | ac and dc, true rms, high frequency |
| Electrostatic | force between charged plates | voltage only; very high voltage, no current drawn |`,
        r`A moving-coil movement of full-scale current $I_m$ and resistance $R_m$ becomes an ammeter with a **shunt** in parallel, carrying the excess current:`,
        {
          type: 'circuit',
          alt: 'An ammeter made from a movement and a shunt: the current I enters a node, splits between the movement of resistance R m on top and the shunt R sh below, and rejoins.',
          caption: 'A shunt carries all but the movement’s full-scale current.',
          parts: [
            ['wire', [0, 0.5], [1, 0.5]],
            ['i', [0, 0.5], [1, 0.5], 'I'],
            ['wire', [1, 0.5], [1, 0]],
            ['wire', [1, 0.5], [1, 1]],
            ['ammeter', [1, 0], [3, 0], 'R_m'],
            ['R', [1, 1], [3, 1], 'R_{sh}', { side: 'below' }],
            ['wire', [3, 0], [3, 0.5]],
            ['wire', [3, 1], [3, 0.5]],
            ['wire', [3, 0.5], [4, 0.5]],
          ],
          nodes: [{ at: [1, 0.5] }, { at: [3, 0.5] }],
        },
        r`It becomes a voltmeter with a **multiplier** resistor in series, $R_s = \frac{V}{I_m} - R_m$; its sensitivity is $\frac{1}{I_m}$ Ω/V. A series **ohmmeter** (battery, movement and adjuster) reads full scale at $R_x = 0$ and half scale when $R_x$ equals its own internal resistance, so its scale is crowded at the high end:`,
        {
          type: 'plot',
          alt: 'The deflection of a series ohmmeter with 1000 ohm internal resistance against the unknown resistance on a log scale: nearly full scale at 10 ohms, half scale at 1000 ohms, nearly zero at 100 kilohms.',
          caption: 'A series ohmmeter (1000 Ω inside): half scale at 1000 Ω, crowded at both ends.',
          x: [10, 100000],
          logX: true,
          y: [0, 1.1],
          xLabel: 'R_x (Ω)',
          yLabel: 'deflection',
          series: [{ f: (rx) => 1000 / (1000 + rx), label: 'D', area: true }],
          marks: [{ x: 1000, label: 'half' }],
        },
      ],
      keyIdeas: [
        r`Shunt $R_{sh} = \frac{I_mR_m}{I - I_m}$; multiplier $R_s = \frac{V}{I_m} - R_m$; sensitivity $\frac{1}{I_m}$ Ω/V.`,
        r`Series ohmmeter reads half scale at $R_x = R_{in}$.`,
        r`Moving coil: dc only. Moving iron, dynamometer: ac and dc. Induction: ac only. Electrostatic: high voltage.`,
        r`Average-responding meters read $1.11V_{avg}$: right for sine waves only.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Shunt and multiplier',
          problem: r`A 1 mA, 100 Ω movement is to read 10 A and, separately, 50 V. Find the shunt and the multiplier.`,
          steps: [
            r`$R_{sh} = \frac{0.001 \times 100}{10 - 0.001} = 0.0100$ Ω.`,
            r`$R_s = \frac{50}{0.001} - 100 = 49.9$ kΩ.`,
          ],
          answer: r`0.0100 Ω; 49.9 kΩ.`,
        },
        {
          level: 'board',
          title: 'Two voltmeters in series',
          problem: r`Two 300 V voltmeters, A of 30 kΩ and B of 60 kΩ, are put in series to measure a voltage expected between 400 and 500 V. Will they do? What is the most they can measure?`,
          steps: [
            r`The voltage divides as the resistances: B takes $\frac{60}{90}$ of the total.`,
            r`B reaches 300 V when the total is $300 \times \frac{90}{60} = 450$ V; A then reads 150 V.`,
          ],
          answer: r`No: at most 450 V, so a 500 V supply would overrange B.`,
        },
      ],
      traps: [
        r`A rectifier meter reads a square wave 11% high: use true-RMS for non-sine waves.`,
        r`In series, voltmeters share the voltage by RESISTANCE, not equally.`,
      ],
      check: [
        { q: r`A spring-controlled meter's deflecting torque goes as the square of the current; 5 A gives 90°. What does 3 A give?`, a: r`$90 \times \left(\frac{3}{5}\right)^2 = 32.4°$.` },
        { q: r`Which instrument measures very high ac voltage while drawing no current?`, a: r`The electrostatic voltmeter.` },
      ],
    },
    {
      name: 'Bridges',
      inShort: r`Measure R, L and C by balancing against standards: no current, no loading.`,
      body: [
        r`A bridge compares an unknown with standards: adjust the arms until the detector between the two dividers reads zero. At balance no current flows through the detector, so the result depends only on the arm values, not on the source or the detector. The **Wheatstone** bridge measures medium resistance:`,
        {
          type: 'circuit',
          alt: 'A Wheatstone bridge: two dividers in parallel across a battery, R1 and R2 on top, R3 and the unknown Rx below, with a galvanometer between their midpoints.',
          caption: 'Wheatstone bridge: at balance the galvanometer reads zero and Rx = R2 R3 / R1.',
          parts: [
            ['wire', [1, 0], [1, 2]],
            ['R', [1, 0], [2, 0], 'R_1'],
            ['R', [2, 0], [3, 0], 'R_2'],
            ['R', [1, 2], [2, 2], 'R_3', { side: 'below' }],
            ['R', [2, 2], [3, 2], 'R_x', { side: 'below' }],
            ['wire', [3, 0], [3, 2]],
            ['wire', [2, 0], [2, 0.5]],
            ['ammeter', [2, 0.5], [2, 1.5], 'G'],
            ['wire', [2, 1.5], [2, 2]],
            ['wire', [1, 2], [1, 3]],
            ['bat', [1, 3], [3, 3], 'E', { side: 'below' }],
            ['wire', [3, 3], [3, 2]],
          ],
          nodes: [{ at: [2, 0] }, { at: [2, 2] }],
        },
        r`| Bridge | Measures | Balance |
|---|---|---|
| Wheatstone | resistance, about 1 Ω to 1 MΩ | $R_x = \frac{R_2R_3}{R_1}$ |
| Kelvin double | very low resistance (below 1 Ω) | removes lead and contact resistance |
| Maxwell (inductance–capacitance) | medium-Q coils | $L_x = R_2R_3C_1$, $R_x = \frac{R_2R_3}{R_1}$ |
| Hay | high-Q coils | like Maxwell, series RC arm |
| Schering | capacitance and loss (insulation) | $C_x = C_3\frac{R_1}{R_2}$, $D = \omega C_1R_1$ |
| Wien | frequency | $f = \frac{1}{2\pi RC}$ for equal arms |`,
        r`For insulation resistance itself (megohms and up), the instrument is the **megger**, a hand or battery-driven high-voltage ohmmeter.`,
      ],
      keyIdeas: [
        r`Wheatstone $R_x = \frac{R_2R_3}{R_1}$; Kelvin double bridge for very low resistances.`,
        r`Maxwell: $L_x = R_2R_3C_1$, $R_x = \frac{R_2R_3}{R_1}$.`,
        r`Schering: $C_x = C_3\frac{R_1}{R_2}$, dissipation factor $\omega C_1R_1$ (insulation testing).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A Maxwell bridge',
          problem: r`A Maxwell bridge balances with $R_1 = 5$ kΩ, $C_1 = 0.1$ µF, $R_2 = 1$ kΩ, $R_3 = 2$ kΩ. Find the coil's L and R.`,
          steps: [
            r`$L_x = 1000 \times 2000 \times 10^{-7} = 0.2$ H.`,
            r`$R_x = \frac{1000 \times 2000}{5000} = 400$ Ω.`,
          ],
          answer: r`0.2 H; 400 Ω.`,
        },
        {
          level: 'board',
          title: 'A Schering bridge',
          problem: r`A Schering bridge at 1 kHz balances with $C_3 = 100$ pF, $R_1 = 3$ kΩ, $R_2 = 1$ kΩ, $C_1 = 5$ nF. Find $C_x$ and its dissipation factor.`,
          steps: [
            r`$C_x = 100 \times \frac{3000}{1000} = 300$ pF.`,
            r`$D = 2\pi \times 1000 \times 5 \times 10^{-9} \times 3000 = 0.094$.`,
          ],
          answer: r`300 pF; 0.094.`,
        },
      ],
      traps: [
        r`Balance doesn't depend on the source voltage or detector, only on the arm ratios.`,
        r`A Wheatstone bridge is poor below about 1 Ω: lead resistance dominates. Use a Kelvin bridge.`,
      ],
      check: [
        { q: r`Which bridge measures a resistance of 0.002 Ω?`, a: r`The Kelvin double bridge.` },
        { q: r`What is a Schering bridge used for?`, a: r`Capacitance and dielectric loss, especially of insulation at high voltage.` },
      ],
    },
    {
      name: 'Potentiometers',
      inShort: r`Compare an unknown emf with a standard at null, drawing no current.`,
      body: [
        r`A **potentiometer** balances an unknown voltage against a known drop along a uniform **slide wire** carrying a steady current. At balance the galvanometer reads zero, so the unknown source supplies no current, and the potentiometer reads its true emf, whatever its internal resistance:`,
        {
          type: 'circuit',
          alt: 'A slide-wire potentiometer: a working battery and rheostat drive a steady current through the slide wire; the unknown cell and a galvanometer connect from one end of the wire to the slider.',
          caption: 'A slide-wire potentiometer: at balance the galvanometer reads zero and the unknown emf equals the drop along length l.',
          parts: [
            ['bat', [0, 0], [2, 0], 'E'],
            ['R', [2, 0], [4, 0], 'rheostat'],
            ['wire', [0, 0], [0, 1]],
            ['wire', [4, 0], [4, 1]],
            ['R', [0, 1], [2.5, 1], 'l'],
            ['R', [2.5, 1], [4, 1]],
            ['wire', [0, 1], [0, 2]],
            ['bat', [0, 2], [1.5, 2], 'E_x', { side: 'below' }],
            ['ammeter', [1.5, 2], [2.5, 2], 'G', { side: 'below' }],
            ['wire', [2.5, 2], [2.5, 1]],
          ],
          nodes: [{ at: [0, 1] }, { at: [2.5, 1] }],
        },
        r`It is first **standardized**: a standard cell (1.0183 V) is balanced and the rheostat set so the wire reads directly in volts. Then $E_x = E_s\frac{l_x}{l_s}$. With a standard resistor it measures current ($I = \frac{V}{R_s}$), and it is the usual way to **calibrate** voltmeters and ammeters.`,
      ],
      keyIdeas: [
        r`$E_x = E_s\frac{l_x}{l_s}$ on a slide-wire potentiometer.`,
        r`At null no current flows, so it reads true emf, unaffected by internal resistance.`,
        r`Standardize first against a standard cell, then measure; it calibrates meters.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An unknown emf',
          problem: r`A 1.0183 V standard cell balances at 54.0 cm and an unknown at 60.2 cm. Find the unknown emf.`,
          steps: [r`$E_x = 1.0183 \times \frac{60.2}{54.0} = 1.135$ V.`],
          answer: r`1.135 V.`,
        },
        {
          level: 'board',
          title: 'Calibrating a voltmeter',
          problem: r`The standard cell balances at 50.9 cm. A voltmeter connected across a supply reads 1.50 V while the potentiometer balances that supply at 74.0 cm. Find the true voltage and the voltmeter's error.`,
          steps: [
            r`True $= 1.0183 \times \frac{74.0}{50.9} = 1.4804$ V.`,
            r`Error $= \frac{1.50 - 1.4804}{1.4804} = +1.32\%$: the meter reads high.`,
          ],
          answer: r`1.480 V; +1.32%.`,
        },
      ],
      traps: [
        r`A voltmeter reads terminal voltage; a potentiometer reads the true emf.`,
        r`Re-standardize if the working battery drifts: the scale depends on its current.`,
      ],
      check: [
        { q: r`Why does a potentiometer read the true emf of a cell?`, a: r`At balance the cell supplies no current, so there is no drop in its internal resistance.` },
        { q: r`How does a potentiometer measure current?`, a: r`By measuring the voltage across a known standard resistor.` },
      ],
    },
    {
      name: 'Wattmeters and Energy Meters',
      inShort: r`Measuring power and energy, and the errors of the instruments themselves.`,
      body: [
        r`An **electrodynamometer wattmeter** has a fixed current coil in series with the load and a moving pressure (voltage) coil across it, so its torque goes as $VI\cos\phi$. It also reads the loss of whichever coil is nearer the load: with the pressure coil on the load side it adds $\frac{V^2}{R_p}$; with the current coil on the load side it adds $I^2R_c$. Connect the pressure coil on the load side for large currents, on the supply side for small ones.`,
        r`An **induction (watt-hour) energy meter** turns an aluminium disc at a speed proportional to power; its **meter constant** $K_h$ is energy per revolution (Wh/rev), or the inverse in rev/kWh. Power from a timed count is $P = \frac{3600K_hN}{t}$. A meter is tested against a standard: the error is $\frac{E_{registered} - E_{true}}{E_{true}}$, positive when the meter runs **fast** (overbills).`,
        r`| Meter | Measures |
|---|---|
| Wattmeter (dynamometer) | real power $VI\cos\phi$ |
| Varmeter (wattmeter on the quadrature voltage) | reactive power |
| Energy (watt-hour) meter | kWh, by counting disc turns or pulses |
| Power-factor meter, frequency meter (vibrating reed), synchroscope | pf, Hz, phase between two systems |`,
      ],
      keyIdeas: [
        r`A wattmeter also reads its own pressure-coil or current-coil loss, depending on connection.`,
        r`Energy meter: $P = \frac{3600K_hN}{t}$; error $\frac{E_{reg} - E_{true}}{E_{true}}$, positive = fast.`,
        r`One wattmeter on the quadrature voltage reads $\frac{Q}{\sqrt3}$ on a balanced load.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Meter constant and wattmeter loss',
          problem: r`A meter with $K_h = 7.2$ Wh/rev turns 20 times in 60 s. Find the power. A wattmeter with a 10 kΩ pressure coil on the load side measures a 1000 W, 230 V load: what does it read?`,
          steps: [
            r`$P = \frac{3600 \times 7.2 \times 20}{60} = 8640$ W.`,
            r`Reading $= 1000 + \frac{230^2}{10\,000} = 1005.3$ W.`,
          ],
          answer: r`8640 W; 1005.3 W.`,
        },
        {
          level: 'board',
          title: 'Testing an energy meter',
          problem: r`A 600 rev/kWh meter is tested at 230 V, 10 A, unity power factor. Its disc makes 20 revolutions in 50 s. Find its error.`,
          steps: [
            r`Registered: $\frac{20}{600} = 0.03333$ kWh.`,
            r`True: $\frac{2.3 \times 50}{3600} = 0.03194$ kWh.`,
            r`Error $= \frac{0.03333 - 0.03194}{0.03194} = +4.35\%$: fast.`,
          ],
          answer: r`4.35% fast.`,
        },
      ],
      traps: [
        r`A meter that registers too much has a positive error: the customer is overbilled.`,
        r`Check whether the constant is Wh/rev or rev/kWh before you divide.`,
      ],
      check: [
        { q: r`What instrument uses vibrating reeds?`, a: r`A frequency meter.` },
        { q: r`Which instrument type is the household energy meter?`, a: r`Induction (or, today, electronic).` },
      ],
    },
    {
      name: 'Instrument Transformers',
      inShort: r`CTs and VTs for metering: ratio and phase-angle errors matter for billing.`,
      body: [
        r`A real CT or VT departs from its nameplate in two ways. Its actual ratio differs from the nominal (**ratio error**, corrected by the **ratio correction factor** $\text{RCF} = \frac{\text{actual ratio}}{\text{nominal ratio}}$), and its secondary is not exactly in phase with the primary (**phase-angle error** β). A wattmeter or energy meter fed through them sees the phase error as a power error of about $\beta\tan\phi$, which grows quickly as the power factor falls:`,
        {
          type: 'plot',
          alt: 'The power error caused by a 10 minute phase-angle error against power factor: zero at unity, 0.5 percent at 0.5, rising to about 1.4 percent at 0.2.',
          caption: 'A 10′ phase-angle error: no power error at unity pf, 0.50% at 0.5 pf.',
          x: [0.2, 1],
          y: [0, 1.6],
          xLabel: 'power factor',
          yLabel: 'error (%)',
          series: [{ f: (pf) => ((10 / 60) * (Math.PI / 180)) * Math.tan(Math.acos(pf)) * 100, label: 'error', area: true }],
          marks: [{ x: 0.5, label: '0.5 pf' }],
        },
        r`Both errors grow with **burden**, so metering classes (0.3, 0.6, 1.2) hold only within the rated burden.`,
      ],
      keyIdeas: [
        r`Ratio error corrected by RCF $= \frac{\text{actual}}{\text{nominal}}$; phase-angle error β causes a power error of about $\beta\tan\phi$.`,
        r`The phase error matters most at low power factor.`,
        r`Metering classes 0.3, 0.6, 1.2; keep the burden within rating.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Phase-angle error at low pf',
          problem: r`An instrument transformer pair has a 10-minute phase-angle error. What power error does it cause at 0.5 pf?`,
          steps: [
            r`$\beta = \frac{10}{60} \times \frac{\pi}{180} = 0.0029$ rad; at 0.5 pf, $\tan 60° = 1.73$.`,
            r`Error $\approx 0.0029 \times 1.73 = 0.50\%$.`,
          ],
          answer: r`About 0.50%.`,
        },
        {
          level: 'board',
          title: 'Ratio error and RCF',
          problem: r`A 200:5 CT has an actual ratio of 40.2 at its burden. Find its ratio error and RCF.`,
          steps: [
            r`Nominal ratio 40. Ratio error $= \frac{40 - 40.2}{40.2} = -0.50\%$.`,
            r`RCF $= \frac{40.2}{40} = 1.005$: multiply readings by it.`,
          ],
          answer: r`−0.50%; 1.005.`,
        },
      ],
      traps: [
        r`At unity power factor the phase-angle error barely matters; at low pf it dominates.`,
        r`Ratio error is (nominal − actual)/actual: a CT with a larger actual ratio makes meters read low.`,
      ],
      check: [
        { q: r`What makes a CT's errors grow?`, a: r`A larger burden (and low primary current).` },
        { q: r`How is a reading corrected for ratio error?`, a: r`Multiply by the ratio correction factor.` },
      ],
    },
    {
      name: 'Oscilloscopes',
      inShort: r`Seeing waveforms: amplitude, time, phase and frequency.`,
      body: [
        r`An oscilloscope draws voltage against time. Read amplitude as divisions × volts/div (× the probe factor), and period as divisions × time/div. In **X–Y mode** two signals drive the two axes and trace **Lissajous figures**: the ratio of their frequencies is the ratio of the figure's tangencies, $\frac{f_y}{f_x} = \frac{\text{horizontal tangencies}}{\text{vertical tangencies}}$, and for equal frequencies an ellipse gives the phase from $\sin\phi = \frac{y_0}{y_{max}}$.`,
        r`A scope's bandwidth limits how fast an edge it can show: its own rise time is about $\frac{0.35}{BW}$, and the edge on screen is $\sqrt{t_{sig}^2 + t_{scope}^2}$. Fast edges are shown too slow unless the scope is several times faster:`,
        {
          type: 'plot',
          alt: 'The rise time shown on a 100 MHz scope against the true rise time of the signal: always above the true value, dashed, by the most at fast edges; a 5 ns edge shows as 6.1 ns.',
          caption: 'On a 100 MHz scope (3.5 ns) a 5 ns edge shows as 6.1 ns (solid); the true rise time is dashed.',
          x: [0, 20],
          y: [0, 22],
          xLabel: 'true rise (ns)',
          yLabel: 'shown (ns)',
          series: [
            { f: (t) => Math.hypot(t, 3.5), label: 'shown' },
            { f: (t) => t, label: 'true', dashed: true },
          ],
          legend: false,
          marks: [{ x: 5, label: '5 ns' }],
        },
        r`A 10× probe divides the signal by ten and loads the circuit ten times less; compensate it (square-wave test) so it does not distort edges.`,
      ],
      keyIdeas: [
        r`$V = \text{div} \times \text{V/div}$ (× probe); $f = \frac{1}{\text{div} \times \text{time/div}}$.`,
        r`Lissajous: $\frac{f_y}{f_x} = \frac{\text{horizontal tangencies}}{\text{vertical tangencies}}$; ellipse $\sin\phi = \frac{y_0}{y_{max}}$.`,
        r`Rise time $\frac{0.35}{BW}$; shown rise $\sqrt{t_{sig}^2 + t_{scope}^2}$; compensate 10× probes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reading the screen',
          problem: r`A trace is 3.2 divisions high at 0.5 V/div through a 10× probe, and one cycle spans 4 divisions at 0.5 ms/div. Find the voltage and frequency. A 5 ns edge on a 100 MHz scope shows what rise time?`,
          steps: [
            r`$3.2 \times 0.5 \times 10 = 16$ V; period $4 \times 0.5 = 2$ ms, so $f = 500$ Hz.`,
            r`Scope $\frac{0.35}{100 \times 10^6} = 3.5$ ns: shown $\sqrt{5^2 + 3.5^2} = 6.1$ ns.`,
          ],
          answer: r`16 V; 500 Hz; 6.1 ns.`,
        },
        {
          level: 'board',
          title: 'Lissajous figures',
          problem: r`With 600 Hz on the X input, a Lissajous figure touches its horizontal edge 3 times and its vertical edge 2 times. Find the Y frequency. With equal frequencies an ellipse crosses the Y axis at ±2 divisions and reaches ±4: find the phase difference.`,
          steps: [
            r`$f_y = 600 \times \frac{3}{2} = 900$ Hz.`,
            r`$\sin\phi = \frac{2}{4}$, so $\phi = 30°$.`,
          ],
          answer: r`900 Hz; 30°.`,
        },
      ],
      traps: [
        r`Forgetting the 10× probe factor reads ten times too small.`,
        r`A scope as fast as the edge adds 41% to it: choose one three to five times faster.`,
      ],
      check: [
        { q: r`What is the rise time of a 200 MHz scope?`, a: r`$\frac{0.35}{200 \times 10^6} = 1.75$ ns.` },
        { q: r`What does a straight diagonal line in X–Y mode mean?`, a: r`Equal frequencies in phase (0° or 180°).` },
      ],
    },
    {
      name: 'Transducers and Sensors',
      inShort: r`Turn physical quantities into electrical signals.`,
      body: [
        r`| Sensor | Quantity | Output |
|---|---|---|
| Strain gauge | strain, force, pressure | $\frac{\Delta R}{R} = GF\varepsilon$, read in a bridge |
| RTD (Pt100) | temperature | $R_0(1 + \alpha T)$, α = 0.00385 /°C: accurate, nearly linear |
| Thermistor (NTC) | temperature | $R_0e^{B(1/T - 1/T_0)}$: very sensitive, nonlinear |
| Thermocouple | temperature difference | $S\Delta T$ (Seebeck), needs cold-junction compensation |
| LVDT | displacement | ac output proportional to core position |
| Piezoelectric | dynamic force, vibration | charge; not for static loads |
| Hall effect | magnetic field, current | voltage proportional to B |`,
        r`**Active** transducers (thermocouple, piezoelectric) generate their own output; **passive** ones (RTD, strain gauge, LVDT) need excitation. Temperature sensors show the contrast best: an RTD changes slowly and steadily, a thermistor fast and steeply the other way:`,
        {
          type: 'plot',
          alt: 'Resistance relative to its value at 0 degrees C against temperature from 0 to 150 C: a Pt100 RTD rising in a straight line to 1.58, and an NTC thermistor with B of 3950 falling steeply to almost zero.',
          caption: 'Relative to 0 °C: a Pt100 rises in a straight line (solid); an NTC thermistor (B = 3950) falls steeply (dashed).',
          x: [0, 150],
          y: [0, 1.7],
          xLabel: 'T (°C)',
          yLabel: 'R / R_0',
          series: [
            { f: (t) => 1 + 0.00385 * t, label: 'RTD' },
            { f: (t) => Math.exp(3950 * (1 / (t + 273.15) - 1 / 273.15)), label: 'thermistor', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Strain gauge $GF = \frac{\Delta R/R}{\varepsilon}$; quarter bridge $V_o \approx \frac{V_{ex}GF\varepsilon}{4}$.`,
        r`RTD $R_0(1 + \alpha T)$ (Pt100: 0.00385); thermocouple $S\Delta T$ with cold-junction compensation; thermistor $R_0e^{B(1/T - 1/T_0)}$.`,
        r`Also LVDTs (displacement), capacitive, piezoelectric, Hall-effect sensors.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Strain gauge, RTD and thermocouple',
          problem: r`A gauge (GF 2) in a 5 V quarter bridge sees 500 µε: find the output. A Pt100 is at 100 °C, a type K (41 µV/°C) has its hot junction at 300 °C and cold at 25 °C: find each reading.`,
          steps: [
            r`$V_o = \frac{5 \times 2 \times 500 \times 10^{-6}}{4} = 1.25$ mV.`,
            r`RTD: $100(1 + 0.00385 \times 100) = 138.5$ Ω.`,
            r`Thermocouple: $41 \times (300 - 25) = 11.3$ mV.`,
          ],
          answer: r`1.25 mV; 138.5 Ω; 11.3 mV.`,
        },
        {
          level: 'board',
          title: 'A thermistor',
          problem: r`An NTC thermistor is 10 kΩ at 25 °C with B = 3950 K. Find its resistance at 50 °C.`,
          steps: [
            r`$R = 10 \times e^{3950\left(\frac{1}{323.15} - \frac{1}{298.15}\right)}$ kΩ.`,
            r`The exponent is $-1.025$, so $R = 3.59$ kΩ.`,
          ],
          answer: r`3.59 kΩ.`,
        },
      ],
      traps: [
        r`A thermocouple measures a temperature DIFFERENCE: add the cold-junction value.`,
        r`Thermistor formulas use KELVIN.`,
      ],
      check: [
        { q: r`Which sensor needs no excitation: RTD or thermocouple?`, a: r`The thermocouple (it is active).` },
        { q: r`Why is a piezoelectric sensor not used for a steady load?`, a: r`Its charge leaks away: it responds only to changing force.` },
      ],
    },
    {
      name: 'Data Acquisition',
      inShort: r`Sample, quantize and scale signals into numbers.`,
      body: [
        r`A data-acquisition chain conditions the signal (amplify, filter, isolate), samples it, and converts each sample to a number. **Sampling** must be faster than twice the highest frequency present (the **Nyquist** rate); anything above half the sampling rate folds down to a false, lower frequency, $\lvert f - kf_s\rvert$, that cannot be told apart from a real one:`,
        {
          type: 'plot',
          alt: 'A 900 Hz sine wave over 10 ms, solid, and a slow 100 Hz sine, dashed: the two cross at every whole millisecond, so samples taken at 1 kHz cannot tell them apart.',
          caption: 'Sampled every 1 ms, a 900 Hz signal (solid) gives the same values as a 100 Hz alias (dashed).',
          x: [0, 10],
          y: [-1.3, 1.3],
          xLabel: 't (ms)',
          yLabel: 'v',
          series: [
            { f: (t) => Math.sin(2 * Math.PI * 0.9 * t), label: '900 Hz' },
            { f: alias, label: 'alias', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`So an **anti-aliasing filter** goes before the converter. An N-bit **ADC** divides its range into $2^N$ steps; its resolution is $\frac{\text{range}}{2^N}$ and its ideal signal-to-noise ratio $6.02N + 1.76$ dB. Field signals often travel as a **4–20 mA** current loop, which ignores lead resistance and shows a broken wire as 0 mA.`,
      ],
      keyIdeas: [
        r`Sample above twice the highest frequency, or it aliases to $\lvert f - kf_s\rvert$; filter first.`,
        r`Resolution $\frac{\text{range}}{2^N}$; ideal ADC SNR $= 6.02N + 1.76$ dB.`,
        r`4–20 mA: $x = x_{lo} + \frac{I - 4}{16}(x_{hi} - x_{lo})$; 0 mA means a broken loop.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'SNR, alias and a current loop',
          problem: r`What SNR can a 12-bit ADC reach? A 900 Hz signal is sampled at 1 kHz: what frequency appears? A 0–200 °C transmitter sends 12 mA: what temperature?`,
          steps: [
            r`$6.02 \times 12 + 1.76 = 74.0$ dB.`,
            r`Alias $\lvert 900 - 1000\rvert = 100$ Hz.`,
            r`$\frac{12 - 4}{16} \times 200 = 100$ °C.`,
          ],
          answer: r`74.0 dB; 100 Hz; 100 °C.`,
        },
        {
          level: 'board',
          title: 'How many bits?',
          problem: r`A 12-bit ADC spans 0 to 10 V. Find its resolution. How many bits are needed to resolve 0.1 °C over 0 to 200 °C?`,
          steps: [
            r`$\frac{10}{2^{12}} = \frac{10}{4096} = 2.44$ mV.`,
            r`$\frac{200}{0.1} = 2000$ steps; $2^{11} = 2048 \ge 2000$, so 11 bits.`,
          ],
          answer: r`2.44 mV; 11 bits.`,
        },
      ],
      traps: [
        r`Aliased frequencies can't be removed after sampling: filter before the ADC.`,
        r`4 mA, not 0 mA, is the bottom of the range.`,
      ],
      check: [
        { q: r`What is the lowest sampling rate for a signal with components up to 3 kHz?`, a: r`Just over 6 kHz (in practice more, with a filter).` },
        { q: r`A 4–20 mA loop reads 0 mA. What does it mean?`, a: r`The loop is broken (or unpowered), not a zero reading.` },
      ],
    },
    {
      name: 'Process Control and PID',
      inShort: r`Controllers that hold a process at its setpoint.`,
      body: [
        r`A controller compares the measured variable with its **setpoint** and acts on the error. **On–off** control is simplest but cycles. **Proportional** action $K_ce$ responds in proportion, but needs some error to produce any output, so it settles with an **offset**: for a process of steady gain K, $\frac{1}{1 + K_cK}$ of the step. **Integral** action keeps adding while any error remains, so it removes the offset; **derivative** action responds to the rate of change, adding damping:`,
        {
          type: 'plot',
          alt: 'Step responses of a first-order process (gain 1, time constant 10 s) with a controller of gain 4: proportional-only, dashed, settling at 0.8 with a 20 percent offset; with integral action added, solid, reaching the setpoint of 1.',
          caption: 'Gain 4 on a first-order process: P alone leaves a 20% offset (dashed); PI reaches the setpoint (solid).',
          x: [0, 15],
          y: [0, 1.2],
          xLabel: 't (s)',
          yLabel: 'output',
          series: [
            { f: (t) => 1 - Math.exp(-0.4 * t), label: 'PI' },
            { f: (t) => 0.8 * (1 - Math.exp(-0.5 * t)), label: 'P', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ y: 1, label: 'setpoint' }],
        },
        r`Industrial controllers state the gain as a **proportional band**, the percentage change in input that swings the output fully: $\text{PB} = \frac{100}{K_c}\%$. A quick tuning rule is **Ziegler–Nichols**: raise the gain until the loop oscillates steadily at $K_u$ with period $P_u$, then set PID to $0.6K_u$, $T_i = \frac{P_u}{2}$, $T_d = \frac{P_u}{8}$.`,
      ],
      keyIdeas: [
        r`PID: $u = K_c\left(e + \frac{1}{T_i}\int e\,dt + T_d\frac{de}{dt}\right)$; proportional band $\frac{100}{K_c}\%$.`,
        r`P alone leaves an offset, $\frac{1}{1 + K_cK}$; integral removes it; derivative adds damping.`,
        r`Ziegler–Nichols: PID $0.6K_u$, $T_i = \frac{P_u}{2}$, $T_d = \frac{P_u}{8}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Proportional band and tuning',
          problem: r`A controller has gain 2.5. Find its proportional band. A loop oscillates steadily at $K_u = 8$ with a 30 s period: find Ziegler–Nichols PID settings.`,
          steps: [
            r`PB $= \frac{100}{2.5} = 40\%$.`,
            r`$K_c = 0.6 \times 8 = 4.8$; $T_i = \frac{30}{2} = 15$ s; $T_d = \frac{30}{8} = 3.75$ s.`,
          ],
          answer: r`40%; 4.8, 15 s, 3.75 s.`,
        },
        {
          level: 'board',
          title: 'The offset of P control',
          problem: r`A process of steady-state gain 1 is under proportional control with gain 4. What offset remains after a unit setpoint step? What gain would cut it to 5%?`,
          steps: [
            r`Offset $= \frac{1}{1 + 4} = 0.2$: 20%.`,
            r`$\frac{1}{1 + K_c} = 0.05$ gives $K_c = 19$.`,
          ],
          answer: r`20%; a gain of 19 (or add integral action).`,
        },
      ],
      traps: [
        r`A narrow proportional band means a HIGH gain.`,
        r`Raising P gain shrinks the offset but never removes it, and too much makes the loop oscillate.`,
      ],
      check: [
        { q: r`Which action removes steady-state offset?`, a: r`Integral (reset) action.` },
        { q: r`A controller has a 25% proportional band. What is its gain?`, a: r`4.` },
      ],
    },
    {
      name: 'PLCs',
      inShort: r`Industrial computers that scan inputs, run logic and set outputs.`,
      body: [
        r`A **programmable logic controller** replaces relay panels with a rugged computer. It works in a fixed **scan cycle**, over and over:`,
        {
          type: 'blocks',
          alt: 'The PLC scan cycle as a loop of four blocks: read inputs, run the program, write outputs, housekeeping and communication, and back to read inputs.',
          caption: 'The scan cycle: inputs are read once per scan, outputs written once per scan.',
          blocks: [
            { id: 'in', at: [0, 0], label: 'read inputs' },
            { id: 'run', at: [2, 0], label: 'run program' },
            { id: 'out', at: [2, 1], label: 'write outputs' },
            { id: 'hk', at: [0, 1], label: 'housekeeping' },
          ],
          links: [
            ['in', 'run'],
            ['run', 'out'],
            ['out', 'hk'],
            ['hk', 'in'],
          ],
        },
        r`Because inputs are read only once per scan, the worst response to an input change is about two scans plus the input filter and output delays, and an input pulse shorter than a scan can be missed entirely (use a high-speed counter or interrupt input). Programs are mostly **ladder logic**: contacts and coils drawn like relay rungs, with **timers** (preset $= \frac{\text{delay}}{\text{time base}}$), **counters**, and **interlocks**. A motor start circuit **seals in** with a contact of its own coil across the start button.`,
      ],
      keyIdeas: [
        r`Scan cycle: read inputs, execute program, write outputs; worst response $\approx 2t_{scan} + t_{in} + t_{out}$.`,
        r`Ladder logic, timers (preset $= \frac{\text{delay}}{\text{time base}}$), counters, interlocks.`,
        r`Inputs shorter than a scan can be missed.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Response time and a timer',
          problem: r`A PLC scans in 15 ms with 10 ms input filtering and 5 ms output delay. Find its worst-case response, and the preset for a 5 s timer on a 0.01 s time base.`,
          steps: [
            r`$2 \times 15 + 10 + 5 = 45$ ms.`,
            r`Preset $= \frac{5}{0.01} = 500$.`,
          ],
          answer: r`45 ms; 500.`,
        },
        {
          level: 'board',
          title: 'A short pulse',
          problem: r`A proximity sensor gives 8 ms pulses to the same PLC (15 ms scan, 10 ms input filter). Can it count them reliably? What timer preset gives 2 minutes on a 0.1 s base?`,
          steps: [
            r`The pulse is shorter than both the scan and the filter: some pulses will be missed. Use a high-speed counter input.`,
            r`Preset $= \frac{120}{0.1} = 1200$.`,
          ],
          answer: r`No: use a high-speed counter; 1200.`,
        },
      ],
      traps: [
        r`Safety stops must be hard-wired, not only in the PLC program.`,
        r`A stop button is wired normally CLOSED, so a broken wire stops the machine.`,
      ],
      check: [
        { q: r`What is the order of a PLC scan?`, a: r`Read inputs, run the program, write outputs (then housekeeping).` },
        { q: r`What keeps a motor running after the start button is released?`, a: r`A seal-in (holding) contact of the motor's coil in parallel with the start button.` },
      ],
    },
    {
      name: 'SCADA',
      inShort: r`Supervisory control and data acquisition over a wide area.`,
      body: [
        r`**SCADA** supervises plant spread over a wide area: substations, pumping stations, a distribution network. Field data comes from **remote terminal units** (RTUs) or **intelligent electronic devices** (IEDs); a **master station** polls them over radio, fibre or leased lines; operators work at the **human–machine interface** (HMI), which shows the system and sends commands back.`,
        r`| Item | Detail |
|---|---|
| Polling | master asks each RTU in turn: cycle $N(t_{req} + t_{resp} + t_{ta})$ |
| Report by exception | RTUs send only changes: saves bandwidth, faster on quiet systems |
| Message time | $\frac{\text{bits}}{\text{bit rate}}$ |
| Protocols | Modbus, DNP3, IEC 60870-5, IEC 61850 (substations) |
| Security | segment the network; SCADA is a target |`,
      ],
      keyIdeas: [
        r`Master station polls remote terminal units (RTUs); HMI shows the operator.`,
        r`Poll cycle $= N(t_{req} + t_{resp} + t_{ta})$, with message time $\frac{\text{bits}}{\text{bit rate}}$.`,
        r`Protocols: Modbus, DNP3, IEC 61850; report by exception to save bandwidth.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A poll cycle',
          problem: r`A master polls 20 RTUs at 9600 bps with 8-byte requests and 40-byte replies (11 bits per byte) and 50 ms turnaround. Find the poll cycle.`,
          steps: [
            r`Per RTU: $\frac{88 + 440}{9600} + 0.05 = 0.105$ s.`,
            r`Cycle $= 20 \times 0.105 = 2.1$ s.`,
          ],
          answer: r`2.1 s.`,
        },
        {
          level: 'board',
          title: 'A faster link',
          problem: r`The link is upgraded to 19 200 bps with the same turnaround. Find the new cycle. Which part now dominates?`,
          steps: [
            r`Per RTU: $\frac{528}{19\,200} + 0.05 = 0.0775$ s; cycle $= 20 \times 0.0775 = 1.55$ s.`,
            r`The 50 ms turnaround is now most of each poll: a faster line helps less and less.`,
          ],
          answer: r`1.55 s; the turnaround.`,
        },
      ],
      traps: [
        r`The screen shows data up to one poll cycle old.`,
        r`Doubling the bit rate does not halve the cycle: turnaround stays.`,
      ],
      check: [
        { q: r`What does an RTU do?`, a: r`Gathers field data and executes commands at a remote site, for the master station.` },
        { q: r`Which protocol is the substation-automation standard?`, a: r`IEC 61850.` },
      ],
    },
    {
      name: 'Calibration',
      inShort: r`Comparing an instrument with a better standard, traceable to national standards.`,
      body: [
        r`Calibration compares an instrument with a **standard** of known, smaller uncertainty, and records the **error** (indicated − true) and the **correction** (true − indicated, its negative). Each standard is itself calibrated against a better one, up to national and international standards: an unbroken chain called **traceability**. The standard should be at least four times better than the tolerance being checked (a **test uncertainty ratio** of 4:1).`,
        r`Independent uncertainty contributions combine by root-sum-square, $u_c = \sqrt{\sum u_i^2}$, and are reported **expanded**, $U = ku_c$, with $k = 2$ for about 95% confidence.`,
      ],
      keyIdeas: [
        r`Error = indicated − true; correction = true − indicated.`,
        r`Combined uncertainty $u_c = \sqrt{\sum u_i^2}$; expanded $U = ku_c$ ($k = 2$, about 95%).`,
        r`Test uncertainty ratio of at least 4:1; traceability chain up to national standards.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Combining uncertainties',
          problem: r`Two independent uncertainties are 0.3 and 0.4 units. Find the combined and expanded (k = 2) uncertainty. Is a ±0.25 standard good enough for a ±1.0 tolerance?`,
          steps: [
            r`$u_c = \sqrt{0.3^2 + 0.4^2} = 0.5$; $U = 2 \times 0.5 = 1.0$.`,
            r`TUR $= \frac{1.0}{0.25} = 4{:}1$: just acceptable.`,
          ],
          answer: r`0.5; 1.0; yes, just.`,
        },
        {
          level: 'board',
          title: 'Error, correction and uncertainty',
          problem: r`A standard gives 100.00 V where the meter under test reads 100.40 V. Find the error, the correction and the percentage error. The calibration has independent contributions of 0.2, 0.3 and 0.6 (in tenths of a volt): find U at k = 2.`,
          steps: [
            r`Error $= 100.40 - 100.00 = +0.40$ V; correction $-0.40$ V; $\frac{0.40}{100.00} = 0.40\%$.`,
            r`$u_c = \sqrt{0.2^2 + 0.3^2 + 0.6^2} = 0.7$; $U = 1.4$ tenths, ±0.14 V.`,
          ],
          answer: r`+0.40 V; −0.40 V; 0.40%; ±0.14 V.`,
        },
      ],
      traps: [
        r`Root-sum-square only for INDEPENDENT contributions; correlated ones add directly.`,
        r`The correction has the opposite sign to the error.`,
      ],
      check: [
        { q: r`What is traceability?`, a: r`An unbroken chain of calibrations back to national or international standards.` },
        { q: r`What confidence does k = 2 give?`, a: r`About 95%.` },
      ],
    },
  ],
};
