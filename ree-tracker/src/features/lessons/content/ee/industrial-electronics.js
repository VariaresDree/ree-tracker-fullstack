// Library › Lessons › EE › Industrial Electronics
// (2026-11-19; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// industrialElectronicsLesson.test.js. Coverage and problem styles
// cross-checked against a review center's electronics and industrial
// electronics handout; the text, problems and figures are this app's own):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order. Uncontrolled rectifiers and ripple are in Electronics 1 and 2;
// constant V/f in Machinery 2; UPS runtime and Peukert in Apparatus & Devices;
// RTDs, thermocouples, strain gauges and PLC timing in Instrumentation &
// Control.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// UJT relaxation oscillator: 12 V, RC = 2 ms, η = 0.63 (t in ms).
const UJT_T = 2 * Math.log(1 / 0.37);
const ujt = (t) => 12 * (1 - Math.exp(-(t % UJT_T) / 2));

// 555 astable, RA = 10 kΩ, RB = 20 kΩ, C = 10 nF (t in ms, v in units of Vcc).
const TH = 0.3 * Math.LN2;
const TL = 0.2 * Math.LN2;
const astable = (t) => {
  const u = t % (TH + TL);
  return u < TH ? 1 - (2 / 3) * Math.exp(-u / 0.3) : (2 / 3) * Math.exp(-(u - TH) / 0.2);
};

// An IGBT turning on into an inductive load: current rises at full voltage,
// then voltage falls at full current (t in µs, p in kW).
const turnOn = (t) => (t <= 0.2 ? (400 * 20 * (t / 0.2)) / 1000 : t <= 0.4 ? (400 * 20 * (1 - (t - 0.2) / 0.2)) / 1000 : 0);

const deg = (x) => (x * Math.PI) / 180;

export default {
  topic: 'Industrial Electronics',
  subject: 'EE',
  overview: r`Industrial electronics is power electronics plus the sensing and control around it: semiconductor switches (SCRs, triacs, transistors, IGBTs), the converters built from them (controlled rectifiers, inverters, choppers, cycloconverters), and what they drive (motors, UPSs). Most board problems ask for an average or rms output voltage at a firing angle or duty ratio, a converter's ripple or power factor, a protection component, or a drive's speed. Learn the waveform for each converter: the formula is its average or its rms.`,
  sources: [
    'Power Electronics: Circuits, Devices and Applications (Rashid)',
    'Power Electronics (Bimbhra)',
    'Power Electronics: Converters, Applications and Design (Mohan, Undeland, Robbins)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Thyristors and SCRs',
      inShort: r`Four-layer switches that latch on with a gate pulse and stay on until their current falls below the holding current.`,
      body: [
        r`A **silicon controlled rectifier** (SCR) is a four-layer (PNPN) switch with an anode, a cathode and a gate. It blocks in both directions until a gate pulse fires it while forward biased; then it **latches** and conducts in one direction only, whatever the gate does, until its current falls below the **holding current**. It turns on only if the current has reached the **latching current**, which is larger than the holding current. The family:`,
        r`| Device | Layers, terminals | Behaviour |
|---|---|---|
| SCR | 4 layers; anode, cathode, gate | unidirectional, latching |
| Triac | two SCRs in antiparallel, one gate | bidirectional, both half-cycles |
| Diac | no gate | breaks over at a set voltage either way; fires triacs |
| UJT | one junction, two bases | negative-resistance region; relaxation oscillators |
| SCS (silicon controlled switch) | 4 layers, 4 terminals (two gates) | turned on or off from a gate |
| LASCR | SCR fired by light | isolated triggering, HVDC valves |
| GTO | SCR | turned off by a negative gate pulse |`,
        r`SCRs are fired by pulses, often from a **UJT relaxation oscillator**: a capacitor charges through R until it reaches the UJT's peak voltage, about ηV, then dumps into the gate. The frequency is $f = \frac{1}{RC\ln\frac{1}{1 - \eta}}$:`,
        {
          type: 'plot',
          alt: 'The capacitor voltage of a UJT relaxation oscillator on 12 V with RC of 2 ms and eta 0.63: it charges along an exponential to 7.56 V, discharges instantly, and repeats about every 1.99 ms.',
          caption: 'A UJT oscillator (12 V, RC = 2 ms, η = 0.63) charges to 7.56 V and fires every 1.99 ms: 503 Hz.',
          x: [0, 6],
          y: [0, 9],
          xLabel: 't (ms)',
          yLabel: 'v_C (V)',
          series: [{ f: ujt, label: 'v', area: true }],
          marks: [{ y: 0.63 * 12, label: 'ηV' }],
        },
        r`An SCR also needs protection: a series inductor limits the rate of rise of current at turn-on, $L \ge \frac{V_s}{(di/dt)_{max}}$, and an RC **snubber** across it limits the rate of rise of voltage, which could fire it falsely. SCRs in series need **equalising resistors** to share the blocking voltage.`,
      ],
      keyIdeas: [
        r`Turn-on needs current above the latching current; turn-off needs it below the holding current (latching > holding).`,
        r`Protect with a series L for di/dt ($L \ge \frac{V_s}{(di/dt)_{max}}$) and an RC snubber for dv/dt.`,
        r`Series strings need equalising resistors $R = \frac{n_sV_{D,max} - V_s}{(n_s - 1)\Delta I_D}$; a UJT oscillator at $f = \frac{1}{RC\ln\frac{1}{1-\eta}}$ fires them.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A series string',
          problem: r`Four SCRs rated 1100 V block 4000 V; their leakage differs by up to 5 mA. Find the equalising resistor and the derating factor.`,
          steps: [
            r`$R = \frac{4 \times 1100 - 4000}{3 \times 0.005} = 26.7$ kΩ.`,
            r`DRF $= 1 - \frac{4000}{4 \times 1100} = 9.1\%$.`,
          ],
          answer: r`26.7 kΩ; 9.1%.`,
        },
        {
          level: 'board',
          title: 'Firing and protecting it',
          problem: r`A UJT with η = 0.63 uses 20 kΩ and 0.1 µF to fire an SCR. Find the firing frequency. The SCR runs on 400 V and can take at most 50 A/µs: find the smallest series inductor.`,
          steps: [
            r`$RC = 20\,000 \times 0.1 \times 10^{-6} = 0.002$ s: $f = \frac{1}{0.002\ln\frac{1}{0.37}} = 503$ Hz.`,
            r`$L \ge \frac{400}{50 \times 10^6} = 8$ µH.`,
          ],
          answer: r`503 Hz; 8 µH.`,
        },
      ],
      traps: [
        r`Removing the gate signal does NOT turn an SCR off: only bringing its current below the holding current does.`,
        r`The latching current is LARGER than the holding current.`,
      ],
      check: [
        { q: r`Which device of the thyristor family has no gate?`, a: r`The diac.` },
        { q: r`Which device shows a negative-resistance region and is used in relaxation oscillators?`, a: r`The UJT.` },
      ],
    },
    {
      name: 'Triacs and Diacs',
      inShort: r`A triac is two SCRs in antiparallel with one gate; a diac breaks over at a set voltage to fire it.`,
      body: [
        r`A **triac** conducts in both directions, so with one gate it controls both half-cycles of ac: lamp dimmers, heaters, small motor speed controls. A **diac** (gateless, breaking over at about 30 V either way) fires it cleanly in each half-cycle. Delaying the firing by α in each half-cycle cuts off the start of every half-wave (**phase control**):`,
        {
          type: 'plot',
          alt: 'Phase control at a firing angle of 90 degrees: the supply sine wave, dashed, and the load voltage, solid, which is zero for the first half of each half-cycle and follows the supply for the second half.',
          caption: 'Phase control at α = 90°: the load (solid) gets the second half of each half-cycle of the supply (dashed).',
          x: [0, 360],
          y: [-1.2, 1.2],
          xLabel: 'ωt (°)',
          yLabel: 'v (pu)',
          series: [
            { f: (th) => (th % 180 >= 90 ? Math.sin(deg(th)) : 0), label: 'load', area: true },
            { f: (th) => Math.sin(deg(th)), label: 'supply', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 90, label: 'α' }],
        },
        r`With a resistive load the rms output is $V_o = V_s\sqrt{\frac{1}{\pi}\left(\pi - \alpha + \frac{\sin2\alpha}{2}\right)}$. **Integral-cycle (burst)** control instead switches whole cycles on and off, at zero crossings, with far less interference: $V_o = V_s\sqrt{\frac{n}{n + m}}$.`,
      ],
      keyIdeas: [
        r`Phase control, R load: $V_o = V_s\sqrt{\frac{1}{\pi}\left(\pi - \alpha + \frac{\sin2\alpha}{2}\right)}$.`,
        r`An RC network delays the firing: $V_C$ lags $V_s$ by $\tan^{-1}\omega RC$.`,
        r`Integral-cycle control: $V_o = V_s\sqrt{\frac{n}{n+m}}$, power in proportion to the on-cycles.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A heater at 90° and in bursts',
          problem: r`A triac feeds a 20 Ω heater from 230 V. Find the power at α = 90°, and with integral-cycle control of 3 cycles on, 5 off.`,
          steps: [
            r`Full power $\frac{230^2}{20} = 2645$ W.`,
            r`At 90°: $V_o = 230\sqrt{0.5} = 162.6$ V, $P = \frac{162.6^2}{20} = 1322.5$ W.`,
            r`Burst: $2645 \times \frac{3}{8} = 992$ W.`,
          ],
          answer: r`1322.5 W; 992 W.`,
        },
        {
          level: 'board',
          title: 'Firing at 60°',
          problem: r`The same heater is fired at α = 60°. Find the rms voltage and the power.`,
          steps: [
            r`$V_o = 230\sqrt{\frac{1}{\pi}\left(\pi - \frac{\pi}{3} + \frac{\sin120°}{2}\right)} = 230\sqrt{0.8045} = 206.3$ V.`,
            r`$P = \frac{206.3^2}{20} = 2128$ W.`,
          ],
          answer: r`206.3 V; 2128 W.`,
        },
      ],
      traps: [
        r`Phase control at 90° gives half the POWER but 0.707 of the voltage, not half.`,
        r`A triac passes BOTH half-cycles; an SCR only one.`,
      ],
      check: [
        { q: r`What fires a triac cleanly in both half-cycles?`, a: r`A diac.` },
        { q: r`Why is burst control used for heaters?`, a: r`It switches at zero crossings, so it makes little interference; the heater's slow response hides the bursts.` },
      ],
    },
    {
      name: 'Power Transistors and IGBTs',
      inShort: r`Fully controllable switches: BJTs (current-driven), MOSFETs (fast, resistive) and IGBTs (MOSFET gate, bipolar conduction).`,
      body: [
        r`| Device | Carriers | Drive | Strength |
|---|---|---|---|
| Power BJT | minority (bipolar) | base current | low conduction loss; slow, high switching loss |
| Power MOSFET | majority (unipolar) | gate voltage | fastest; but $R_{DS(on)}$ grows with voltage rating |
| IGBT | minority (bipolar) | gate voltage (collector, emitter, gate) | MOSFET drive with BJT-like conduction; the workhorse of drives |
| Diode, thyristor | minority | none, gate pulse | rugged, high power |`,
        r`A switch loses power two ways. **Conduction loss** while on: $I_{rms}^2R_{DS(on)}$ for a MOSFET, $V_{CE0}I_{av} + r_{CE}I_{rms}^2$ for an IGBT. **Switching loss** at every transition, because for a moment both voltage and current are large. Into an inductive load the current rises at full voltage, then the voltage falls at full current:`,
        {
          type: 'plot',
          alt: 'The instantaneous power in an IGBT turning on 20 A at 400 V over 0.4 microseconds: rising linearly to 8 kW at 0.2 microseconds as the current rises, then falling to zero as the voltage collapses.',
          caption: 'Turning on 20 A at 400 V in 0.4 µs: power peaks at 8 kW; the energy is ½VIt = 1.6 mJ per switching.',
          x: [0, 0.5],
          y: [0, 9],
          xLabel: 't (µs)',
          yLabel: 'p (kW)',
          series: [{ f: turnOn, label: 'p', area: true }],
          marks: [{ x: 0.2, label: 'peak' }],
        },
        r`So switching loss is $P_{sw} = \frac{1}{2}V_dI_o(t_{on} + t_{off})f_s$, and grows with frequency: the reason fast devices matter.`,
      ],
      keyIdeas: [
        r`Switching loss $P_{sw} = \tfrac12V_dI_o(t_{on} + t_{off})f_s$ (inductive); grows with frequency.`,
        r`Conduction loss: MOSFET $I_{rms}^2R_{DS(on)}$; IGBT $V_{CE0}I_{av} + r_{CE}I_{rms}^2$.`,
        r`A BJT is saturated when $I_B \ge \frac{I_{CS}}{\beta_{min}}$; overdrive factor $\frac{I_B}{I_{BS}}$.`,
        r`MOSFET: majority carriers; BJT, IGBT, diode, thyristor: minority carriers.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An IGBT\'s losses',
          problem: r`An IGBT switches 20 A at 400 V and 10 kHz with $t_{on} + t_{off} = 0.8$ µs, at 50% duty ($V_{CE0} = 1.2$ V, $r_{CE} = 0.02$ Ω). Find its losses.`,
          steps: [
            r`$P_{sw} = 0.5 \times 400 \times 20 \times 0.8 \times 10^{-6} \times 10^4 = 32$ W.`,
            r`$I_{av} = 10$ A, $I_{rms}^2 = 200$: $P_c = 1.2 \times 10 + 0.02 \times 200 = 16$ W.`,
            r`Total 48 W.`,
          ],
          answer: r`32 W switching, 16 W conduction: 48 W.`,
        },
        {
          level: 'board',
          title: 'Saturating a BJT',
          problem: r`A power BJT switches a 10 Ω load from 200 V, with $V_{CE(sat)} = 1.5$ V and $\beta_{min} = 10$. Find the base current for saturation and with an overdrive factor of 1.5.`,
          steps: [
            r`$I_{CS} = \frac{200 - 1.5}{10} = 19.85$ A; $I_{BS} = \frac{19.85}{10} = 1.985$ A.`,
            r`$I_B = 1.5 \times 1.985 = 2.98$ A.`,
          ],
          answer: r`1.985 A; 2.98 A.`,
        },
      ],
      traps: [
        r`MOSFETs suit low-voltage, high-frequency work; IGBTs win at high voltage, where $R_{DS(on)}$ would be large.`,
        r`An IGBT's terminals are collector, emitter and gate, not drain and source; it is a unidirectional, fully controlled switch.`,
      ],
      check: [
        { q: r`Compared with a MOSFET, how are a BJT's losses?`, a: r`Higher switching losses but lower conduction losses.` },
        { q: r`Which of IGBT, MOSFET, diode and thyristor is a majority-carrier device?`, a: r`The MOSFET only.` },
      ],
    },
    {
      name: 'Controlled Rectifiers',
      inShort: r`Rectifiers with SCRs: the firing angle α sets the average DC output.`,
      body: [
        r`Replacing diodes with SCRs lets the firing angle α set the output. In a **full converter** (all SCRs) with continuous current the average output is $\frac{2V_m}{\pi}\cos\alpha$ (single phase) or $1.35V_{LL}\cos\alpha$ (three phase): positive up to 90°, then negative, so with an active load such as a motor being braked, power flows back to the ac side (**inversion**). A **semi-converter** (half SCRs, half diodes) gives $\frac{V_m}{\pi}(1 + \cos\alpha)$ and never goes negative:`,
        {
          type: 'plot',
          alt: 'The average output voltage of a full converter, as cos alpha, and a semiconverter, as half of one plus cos alpha, against the firing angle from 0 to 180 degrees: the full converter falls through zero at 90 degrees into inversion; the semiconverter falls to zero at 180 degrees.',
          caption: 'Output against firing angle: a full converter (solid) inverts past 90°; a semi-converter (dashed) stays positive.',
          x: [0, 180],
          y: [-1.1, 1.1],
          xLabel: 'α (°)',
          yLabel: 'V_{dc} / V_{dc0}',
          series: [
            { f: (a) => Math.cos(deg(a)), label: 'full' },
            { f: (a) => (1 + Math.cos(deg(a))) / 2, label: 'semi', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 90, label: '90°' }],
        },
        r`A converter's output ripples at the **pulse number** times the supply frequency: 6f for a three-phase full converter. Higher pulse numbers (12-pulse, as in HVDC) mean smaller ripple and fewer harmonics. Source inductance delays the handover between SCRs (**overlap**, μ), costing $\frac{3\omega L_sI_d}{\pi}$ of output in a three-phase bridge; input power factor is about $0.955\cos\alpha$.`,
      ],
      keyIdeas: [
        r`Single-phase full converter $\frac{2V_m}{\pi}\cos\alpha$; semi-converter $\frac{V_m}{\pi}(1 + \cos\alpha)$; half-wave R load $\frac{V_m}{2\pi}(1 + \cos\alpha)$.`,
        r`Three-phase full converter $1.35V_{LL}\cos\alpha$; past 90° it inverts; ripple at 6f.`,
        r`Source inductance costs $\frac{3\omega L_sI_d}{\pi}$; input PF $= 0.955\cos\alpha$ (three-phase).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A three-phase full converter',
          problem: r`A three-phase full converter on 415 V, 50 Hz fires at 30° and carries 100 A through 2 mH of source inductance per phase. Find the output voltage, the overlap angle and the input power factor.`,
          steps: [
            r`$1.35 \times 415 \times 0.866 = 485.2$ V, less $\frac{3 \times 314.2 \times 0.002 \times 100}{\pi} = 60$ V: 425.2 V.`,
            r`$\cos(30° + \mu) = 0.866 - 0.214$: $\mu = 19.3°$.`,
            r`PF $= 0.955 \times 0.866 = 0.827$.`,
          ],
          answer: r`425.2 V; 19.3°; 0.827.`,
        },
        {
          level: 'board',
          title: 'Full against semi',
          problem: r`A single-phase converter on 230 V fires at 60° with continuous current. Find the average output as a full converter and as a semi-converter.`,
          steps: [
            r`$V_m = 230\sqrt2 = 325.3$ V.`,
            r`Full: $\frac{2 \times 325.3}{\pi} \times \cos60° = 103.5$ V. Semi: $\frac{325.3}{\pi}(1 + 0.5) = 155.3$ V.`,
          ],
          answer: r`103.5 V; 155.3 V.`,
        },
      ],
      traps: [
        r`$\cos\alpha$ applies only with continuous current; a resistive load stops conducting at the zero crossing.`,
        r`Only a FULL converter can invert; a semi-converter's freewheeling diodes stop it.`,
      ],
      check: [
        { q: r`At what frequency does a three-phase full converter on 60 Hz ripple?`, a: r`360 Hz (six pulses).` },
        { q: r`Why use 12-pulse converters in HVDC and large drives?`, a: r`Smaller ripple and lower harmonics.` },
      ],
    },
    {
      name: 'Inverters',
      inShort: r`DC to AC: switches build a square, stepped or pulse-width-modulated wave.`,
      body: [
        r`An **inverter** builds ac from dc by switching. A full bridge switched once each half-cycle makes a square wave of $\pm V_{dc}$, whose fundamental is $\frac{4}{\pi}$ times as tall, with every odd harmonic at $\frac{1}{n}$ of it:`,
        {
          type: 'plot',
          alt: 'A square wave of plus and minus 1, solid, and its fundamental, a sine wave of peak 1.27, dashed.',
          caption: 'A square wave (solid) and its fundamental (dashed), 4/π = 1.27 times as tall.',
          x: [0, 360],
          y: [-1.5, 1.5],
          xLabel: 'ωt (°)',
          yLabel: 'v / V_{dc}',
          series: [
            { f: (th) => (th % 360 < 180 ? 1 : -1), label: 'square' },
            { f: (th) => (4 / Math.PI) * Math.sin(deg(th)), label: 'fundamental', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`| Inverter | Fundamental (rms) | Harmonics |
|---|---|---|
| Single-phase full bridge, square wave | $0.9V_{dc}$ | every odd n, at $\frac{1}{n}$ |
| Half bridge | $0.45V_{dc}$ | same |
| Three-phase six-step | line $0.78V_{dc}$ | no triplens: 5th, 7th, 11th… |
| Three-phase sine PWM | line $0.612m_aV_{dc}$ ($m_a \le 1$) | pushed up near the switching frequency |`,
        r`**Voltage-source** inverters (a stiff dc voltage, the usual drive) and **current-source** inverters (a stiff dc current, large drives) differ in what they hold steady.`,
      ],
      keyIdeas: [
        r`Full-bridge square wave: $V_{n} = \frac{0.9V_{dc}}{n}$ rms, odd $n$ only.`,
        r`Six-step three-phase: $V_{LL1} = 0.78V_{dc}$; no triplen harmonics.`,
        r`Sine PWM: $V_{LL1} = 0.612\,m_aV_{dc}$ for $m_a \le 1$; harmonics move up near $m_f$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Harmonics and line voltage',
          problem: r`A full bridge on 220 V DC gives a square wave. Find the rms fundamental, 3rd and 5th. A 600 V DC three-phase inverter runs six-step, then sine PWM at $m_a = 0.8$: find the line voltage each time.`,
          steps: [
            r`$0.9 \times 220 = 198$ V; 3rd $\frac{198}{3} = 66$ V; 5th $\frac{198}{5} = 39.6$ V.`,
            r`Six-step: $0.78 \times 600 = 468$ V; PWM: $0.612 \times 0.8 \times 600 = 294$ V.`,
          ],
          answer: r`198, 66, 39.6 V; 468 V; 294 V.`,
        },
        {
          level: 'board',
          title: 'The dc link needed',
          problem: r`A three-phase inverter must give 230 V line. What dc link does it need running six-step, and with sine PWM at $m_a = 1$?`,
          steps: [
            r`Six-step: $\frac{230}{0.78} = 294.9$ V.`,
            r`PWM: $\frac{230}{0.612} = 375.8$ V.`,
          ],
          answer: r`294.9 V; 375.8 V.`,
        },
      ],
      traps: [
        r`Six-step gives more fundamental than linear PWM can (0.78 vs at most 0.612 of Vdc), at the price of low-order harmonics.`,
        r`A square wave's fundamental PEAK is $\frac{4}{\pi}V_{dc}$; its rms is $0.9V_{dc}$.`,
      ],
      check: [
        { q: r`Which harmonics are missing from a three-phase six-step line voltage?`, a: r`The triplens (3rd, 9th…) and the even ones.` },
        { q: r`What does PWM do to the harmonics?`, a: r`Moves them up near the switching frequency, where they are easy to filter.` },
      ],
    },
    {
      name: 'Choppers',
      inShort: r`DC to DC by switching: the duty ratio D sets the output.`,
      body: [
        r`A **chopper** (dc–dc converter) switches a dc source on and off at a fixed frequency; the fraction of each period it is on is the **duty ratio** D. An inductor and capacitor smooth the result. Three basic forms give three gains:`,
        {
          type: 'plot',
          alt: 'The voltage gain of three dc to dc converters against duty ratio: the buck rising in a straight line, D; the boost, 1 over 1 minus D, starting at 1 and rising steeply; and the buck-boost, D over 1 minus D, passing 1 at D of 0.5.',
          caption: 'Gain against duty ratio: buck D, boost 1/(1 − D), buck-boost D/(1 − D) (its output inverted).',
          x: [0, 0.8],
          y: [0, 6],
          xLabel: 'D',
          yLabel: 'V_o / V_s',
          series: [
            { f: (d) => d, label: 'buck' },
            { f: (d) => 1 / (1 - d), label: 'boost', colour: colourOf(1) },
            { f: (d) => d / (1 - d), label: 'buck-boost', dashed: true, colour: colourOf(2) },
          ],
          marks: [{ x: 0.5, label: 'D = 0.5' }],
        },
        r`The inductor current ripples by $\Delta I_L = \frac{V_sD(1 - D)}{Lf}$ in a buck, and the output by $\frac{\Delta V_o}{V_o} = \frac{1 - D}{8LCf^2}$. If the load is too light the inductor current falls to zero each cycle (**discontinuous** conduction) and the simple gains no longer hold.`,
      ],
      keyIdeas: [
        r`Buck $V_o = DV_s$; boost $\frac{V_s}{1 - D}$; buck-boost $-\frac{D}{1 - D}V_s$.`,
        r`Buck ripple: $\Delta I_L = \frac{V_sD(1-D)}{Lf}$, $\frac{\Delta V_o}{V_o} = \frac{1 - D}{8LCf^2}$.`,
        r`Continuous conduction needs $L > \frac{(1 - D)R}{2f}$ (buck).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A buck converter',
          problem: r`A buck converter steps 48 V down to 12 V at 50 kHz with L = 100 µH and C = 47 µF. Find D, the inductor ripple and the output ripple.`,
          steps: [
            r`$D = \frac{12}{48} = 0.25$.`,
            r`$\Delta I_L = \frac{48 \times 0.25 \times 0.75}{10^{-4} \times 5 \times 10^4} = 1.8$ A.`,
            r`$\frac{\Delta V_o}{V_o} = \frac{0.75}{8 \times 10^{-4} \times 4.7 \times 10^{-5} \times 2.5 \times 10^9} = 0.80\%$: 96 mV.`,
          ],
          answer: r`0.25; 1.8 A; 96 mV.`,
        },
        {
          level: 'board',
          title: 'Boost and buck-boost',
          problem: r`A boost converter raises 12 V to 48 V for a 2 A load. Find D and the input current (ideal). What D would a buck-boost need to give −24 V from 12 V?`,
          steps: [
            r`$48 = \frac{12}{1 - D}$: $D = 0.75$. Power 96 W, so $I_{in} = \frac{96}{12} = 8$ A.`,
            r`$\frac{D}{1 - D} = 2$: $D = \frac{2}{3} = 0.667$.`,
          ],
          answer: r`0.75, 8 A; 0.667.`,
        },
      ],
      traps: [
        r`At light load a converter goes discontinuous and $V_o = DV_s$ no longer holds: the output rises.`,
        r`A boost's INPUT current is larger than its output current by the same ratio its voltage rises.`,
      ],
      check: [
        { q: r`Which converter can give an output above or below its input?`, a: r`The buck-boost (with inverted polarity).` },
        { q: r`What happens to a boost converter's gain as D approaches 1?`, a: r`It rises without limit in theory; losses cap it in practice.` },
      ],
    },
    {
      name: 'Cycloconverters',
      inShort: r`AC to AC at a lower frequency, directly, by switching pieces of the supply.`,
      body: [
        r`A **cycloconverter** makes a lower frequency straight from ac, with no dc link: a pair of converters connected back to back passes N supply half-cycles one way, then N the other way. A single-phase one built from 3 half-cycles of 50 Hz makes a 16.7 Hz output:`,
        {
          type: 'plot',
          alt: 'A step-down cycloconverter output: three positive half-cycles of the 50 Hz supply followed by three negative half-cycles, making one cycle of 16.7 Hz in 60 ms.',
          caption: 'Three supply half-cycles one way, three the other: 50 Hz becomes 16.7 Hz.',
          x: [0, 60],
          y: [-1.2, 1.2],
          xLabel: 't (ms)',
          yLabel: 'v (pu)',
          series: [{ f: (t) => (Math.floor(t / 30) % 2 === 0 ? 1 : -1) * Math.abs(Math.sin(2 * Math.PI * 0.05 * t)), label: 'v', area: true }],
        },
        r`Practical three-phase cycloconverters vary the firing angles to shape a smoother sine. They suit very large, slow drives (cement kilns, rolling mills, ship propulsion), with the output kept below about a third of the supply frequency.`,
      ],
      keyIdeas: [
        r`Step-down: $f_o = \frac{f_s}{N}$, N supply half-cycles per output half-cycle.`,
        r`Output $V_o = rV_{ph}\frac{p}{\pi}\sin\frac{\pi}{p}$; each phase is a dual converter.`,
        r`Used for large, slow drives (mills, kilns, ship propulsion); keep $f_o$ below about $\frac{f_s}{3}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Frequency and voltage',
          problem: r`A cycloconverter on 50 Hz builds each output half-cycle from 3 supply half-cycles. A three-phase version uses 6-pulse converters on 240 V per phase with r = 0.8: find its output voltage.`,
          steps: [
            r`$f_o = \frac{50}{3} = 16.7$ Hz.`,
            r`$V_o = 0.8 \times 240 \times \frac{6}{\pi}\sin30° = 183$ V.`,
          ],
          answer: r`16.7 Hz; 183 V.`,
        },
        {
          level: 'board',
          title: 'Choosing N',
          problem: r`How many 50 Hz half-cycles make each output half-cycle for 12.5 Hz? About what is the highest practical output from a 60 Hz supply?`,
          steps: [
            r`$N = \frac{50}{12.5} = 4$.`,
            r`About $\frac{60}{3} = 20$ Hz.`,
          ],
          answer: r`4; about 20 Hz.`,
        },
      ],
      traps: [
        r`A cycloconverter can't raise the frequency: for that, rectify and invert.`,
        r`Its input power factor is poor and its output rich in harmonics.`,
      ],
      check: [
        { q: r`What converter does each phase of a cycloconverter use?`, a: r`A dual (back-to-back) converter.` },
        { q: r`Name a typical cycloconverter application.`, a: r`A large, slow drive such as a cement kiln, rolling mill or ship's propeller.` },
      ],
    },
    {
      name: 'Motor Drives',
      inShort: r`Converters that control a motor's speed and torque.`,
      body: [
        r`A **DC drive** feeds the armature from a controlled rectifier (or a chopper on a dc supply). Speed follows the armature voltage: $\omega = \frac{V - I_aR_a}{K\phi}$, so each firing angle gives a nearly flat speed–torque line, lowered as α rises:`,
        {
          type: 'plot',
          alt: 'Speed against torque for a separately excited dc motor fed by a three-phase converter on 415 V at firing angles 0, 30 and 60 degrees: three parallel lines falling gently with load, from 280, 243 and 140 rad per second at no load.',
          caption: 'A converter-fed dc motor (Kφ = 2, Ra = 0.5 Ω): one line per firing angle; 230 rad/s at 30° and 100 N·m.',
          x: [0, 400],
          y: [0, 400],
          xLabel: 'T (N·m)',
          yLabel: 'ω (rad/s)',
          series: [
            { f: (T) => (1.35 * 415 - 0.25 * T) / 2, label: 'α = 0°' },
            { f: (T) => (1.35 * 415 * Math.cos(deg(30)) - 0.25 * T) / 2, label: 'α = 30°', colour: colourOf(1) },
            { f: (T) => (1.35 * 415 * Math.cos(deg(60)) - 0.25 * T) / 2, label: 'α = 60°', colour: colourOf(2) },
          ],
          marks: [{ x: 100, label: '100 N·m' }],
        },
        r`**AC drives** feed an induction motor from an inverter at variable frequency, keeping V/f constant up to base speed (constant torque), then holding voltage fixed above it (constant power, breakdown torque falling as $\frac{1}{f^2}$). Higher pulse numbers in the converter reduce current ripple and torque pulsation. To accelerate, the drive must supply $t = \frac{J\Delta\omega}{T_m - T_L}$; braking returns or burns $\tfrac12J\omega^2$.`,
      ],
      keyIdeas: [
        r`DC: $\omega = \frac{V_{dc}(\alpha) - I_aR_a}{K\phi}$; a chopper regenerates when $E_a - I_aR_a = (1 - D)V_s$.`,
        r`AC: constant V/f up to base speed, then fixed V: breakdown torque falls as $\frac{1}{f^2}$.`,
        r`Acceleration $t = \frac{J\Delta\omega}{T_m - T_L}$; braking energy $\tfrac12J\omega^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A converter-fed dc motor',
          problem: r`A separately excited DC motor ($R_a = 0.5$ Ω, $K\phi = 2$ V·s/rad) is fed by a three-phase full converter on 415 V at α = 30°, drawing 50 A. Find its speed. Its 2 kg·m² drive gets 100 N·m against a 40 N·m load: time to 150 rad/s?`,
          steps: [
            r`$V_{dc} = 485.2$ V; $\omega = \frac{485.2 - 50 \times 0.5}{2} = 230.1$ rad/s = 2197 rpm.`,
            r`$t = \frac{2 \times 150}{100 - 40} = 5$ s.`,
          ],
          answer: r`230.1 rad/s (2197 rpm); 5 s.`,
        },
        {
          level: 'board',
          title: 'A chopper-fed dc motor',
          problem: r`A chopper on 220 V dc runs at D = 0.6 and feeds a motor with $R_a = 0.5$ Ω and $K\phi = 1.2$ V·s/rad drawing 20 A. Find its speed in rpm.`,
          steps: [
            r`$V = 0.6 \times 220 = 132$ V.`,
            r`$\omega = \frac{132 - 20 \times 0.5}{1.2} = 101.7$ rad/s = 971 rpm.`,
          ],
          answer: r`971 rpm.`,
        },
      ],
      traps: [
        r`At 75 Hz on a 50 Hz motor (fixed voltage) the breakdown torque is only $(50/75)^2 = 44\%$ of rated.`,
        r`Convert rad/s to rpm by $\frac{60}{2\pi}$.`,
      ],
      check: [
        { q: r`Why are higher-pulse converters used in dc drives?`, a: r`To reduce current ripple (and torque pulsation).` },
        { q: r`What is held constant below base speed in an ac drive?`, a: r`The ratio V/f (so the flux and torque capability).` },
      ],
    },
    {
      name: 'UPS',
      inShort: r`Rectifier, battery and inverter that carry critical loads through a supply failure.`,
      body: [
        r`An **uninterruptible power supply** keeps critical loads running when the mains fails. The **online** (double-conversion) type runs the load from its inverter all the time, so there is no transfer at all:`,
        {
          type: 'blocks',
          alt: 'An online UPS as blocks: the mains feeds a rectifier, whose dc output charges the battery and feeds the inverter, which supplies the load.',
          caption: 'An online UPS: mains to rectifier to dc link (with the battery) to inverter to load.',
          blocks: [
            { id: 'rect', at: [1, 0], label: 'rectifier' },
            { id: 'dc', at: [2, 0], kind: 'point' },
            { id: 'inv', at: [3, 0], label: 'inverter' },
            { id: 'bat', at: [2, 1], label: 'battery' },
          ],
          links: [
            [[0, 0], 'rect', { label: 'mains' }],
            ['rect', 'dc'],
            ['dc', 'inv'],
            ['inv', [4, 0], { label: 'load' }],
            ['bat', 'dc'],
          ],
        },
        r`| Type | In normal running | On failure |
|---|---|---|
| Offline (standby) | load on the mains | switches to the inverter (a few ms) |
| Line-interactive | mains, with voltage correction | switches, faster |
| Online (double conversion) | always on the inverter | no transfer; the battery takes over the dc link |`,
        r`Size it in BOTH kVA and kW (its kW rating is usually 0.8 or 0.9 of its kVA), with margin. The battery current is largest at the end of discharge, when its voltage is lowest: $\frac{P}{\eta V_{dc}}$.`,
      ],
      keyIdeas: [
        r`Types: offline (standby), line-interactive and online (double conversion, no transfer time).`,
        r`Size by kVA and kW with margin: $S \ge 1.25 \times \frac{P}{\text{pf}}$; battery current $\frac{P}{\eta V_{dc}}$.`,
        r`Cells: $n = \frac{V_{dc,min}}{V_{end}}$ (1.75 V lead-acid); float about 2.25 V per cell.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sizing and battery current',
          problem: r`An 8 kW load at 0.8 pf needs a UPS with 25% margin. A 5 kW inverter (90%) runs from 24 lead-acid cells: find the battery current at end of discharge and the float voltage.`,
          steps: [
            r`$1.25 \times \frac{8}{0.8} = 12.5$ kVA.`,
            r`End voltage $24 \times 1.75 = 42$ V: $I = \frac{5000}{0.9 \times 42} = 132$ A.`,
            r`Float $24 \times 2.25 = 54$ V.`,
          ],
          answer: r`12.5 kVA; 132 A; 54 V.`,
        },
        {
          level: 'board',
          title: 'kVA is not enough',
          problem: r`A 3 kVA UPS is rated 0.8 pf. Can it carry a 2.7 kW load at 0.95 pf?`,
          steps: [
            r`Its kW limit is $3 \times 0.8 = 2.4$ kW.`,
            r`The load is $\frac{2.7}{0.95} = 2.84$ kVA, within 3 kVA, but 2.7 kW exceeds 2.4 kW: no.`,
          ],
          answer: r`No: it exceeds the 2.4 kW limit.`,
        },
      ],
      traps: [
        r`Size cables for the END-of-discharge current, the highest the battery delivers.`,
        r`A load within the kVA rating can still exceed the kW rating.`,
      ],
      check: [
        { q: r`Which UPS type has no transfer time?`, a: r`The online (double-conversion) UPS.` },
        { q: r`What is the usual end-of-discharge voltage of a lead-acid cell?`, a: r`1.75 V.` },
      ],
    },
    {
      name: 'Sensors',
      inShort: r`Turn physical quantities into electrical signals for control.`,
      body: [
        r`Drives and machines need to know position, speed and current. **Hall-effect** sensors measure magnetic field (and so current, without contact): $V_H = \frac{IB}{nqt}$. **LVDTs** give an ac output proportional to a core's displacement, its phase showing direction. **Capacitive** sensors respond to gap or level, $\frac{\Delta C}{C} \approx -\frac{\Delta d}{d}$. **Piezoelectric** sensors respond to changing force (vibration, ultrasound), never to a steady one.`,
        r`An incremental **encoder** gives pulses as a shaft turns: speed from the pulse rate, $N = \frac{60f}{\text{PPR}}$ rpm. Two channels a quarter-period apart (**quadrature**) give direction, from which one leads, and four edges per line:`,
        {
          type: 'plot',
          alt: 'The two channels of a quadrature encoder over two lines: channel A, lower, a square wave; channel B, upper, the same square wave a quarter period later.',
          caption: 'Quadrature channels: A (lower) leads B (upper) by 90°, so the shaft turns forward; four edges per line.',
          x: [0, 720],
          y: [-0.3, 2.8],
          xLabel: 'shaft (electrical °)',
          yLabel: 'A, B',
          series: [
            { f: (th) => (th % 360 < 180 ? 1 : 0), label: 'A' },
            { f: (th) => 1.5 + ((th + 270) % 360 < 180 ? 1 : 0), label: 'B', colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Hall: $V_H = \frac{IB}{nqt}$; capacitive: $\frac{\Delta C}{C} \approx -\frac{\Delta d}{d}$; piezo: $V = \frac{dF}{C}$ (dynamic only).`,
        r`LVDT: output proportional to core position, phase giving direction.`,
        r`Encoder: $N = \frac{60f}{\text{PPR}}$ rpm; quadrature resolution $\frac{360°}{4\,\text{PPR}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Hall plate and encoder',
          problem: r`A Hall plate 1 mm thick ($n = 10^{22}$ m⁻³) carries 5 mA in 0.5 T. Find $V_H$. A 1000-PPR encoder gives 5 kHz: find the speed and the quadrature resolution.`,
          steps: [
            r`$V_H = \frac{0.005 \times 0.5}{10^{22} \times 1.602 \times 10^{-19} \times 0.001} = 1.56$ mV.`,
            r`$N = \frac{60 \times 5000}{1000} = 300$ rpm; resolution $\frac{360°}{4000} = 0.09°$.`,
          ],
          answer: r`1.56 mV; 300 rpm; 0.09°.`,
        },
        {
          level: 'board',
          title: 'Counting pulses',
          problem: r`A 500-PPR encoder gives 400 pulses in a 0.1 s gate. Find the shaft speed.`,
          steps: [
            r`$f = \frac{400}{0.1} = 4000$ Hz.`,
            r`$N = \frac{60 \times 4000}{500} = 480$ rpm.`,
          ],
          answer: r`480 rpm.`,
        },
      ],
      traps: [
        r`A piezoelectric sensor can't hold a static reading: its charge leaks away.`,
        r`Quadrature counts FOUR edges per line: the resolution is four times finer than the line count.`,
      ],
      check: [
        { q: r`What converts one form of energy into another for measurement?`, a: r`A transducer.` },
        { q: r`How does a quadrature encoder tell direction?`, a: r`By which channel leads the other.` },
      ],
    },
    {
      name: 'Optoelectronics',
      inShort: r`Devices that turn current into light and light into current: LEDs, photodiodes, phototransistors, optocouplers.`,
      body: [
        r`An **LED** emits light when electrons cross its junction; its wavelength comes from the band gap, $\lambda(\mu\text{m}) = \frac{1.24}{E_g(\text{eV})}$. A **photodiode** works the other way: light makes current, $\mathcal{R} = \frac{\eta\lambda(\mu\text{m})}{1.24}$ A/W; a **phototransistor** adds gain. A **solar cell** is a large photodiode; cells in series and parallel form a module and modules form an **array**.`,
        r`An **optocoupler** puts an LED and a phototransistor in one package: the signal crosses by light, so the two sides are isolated (control circuits from power switches). Its **current transfer ratio** $\text{CTR} = \frac{I_C}{I_F}$ falls with age and temperature.`,
        r`| Device | Does |
|---|---|
| LED, laser diode | current to light |
| Photodiode, phototransistor, LASCR | light to current or switching |
| Solar cell | light to power |
| Optocoupler | isolated signal transfer |
| Fibre optics | light along glass: data, isolated |`,
      ],
      keyIdeas: [
        r`$\lambda(\mu\text{m}) = \frac{1.24}{E_g(\text{eV})}$.`,
        r`Responsivity $\mathcal{R} = \frac{\eta\lambda(\mu\text{m})}{1.24}$ A/W.`,
        r`Optocoupler CTR $= \frac{I_C}{I_F}$; LED resistor $R = \frac{V_s - nV_F}{I_F}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Wavelength, responsivity, a resistor',
          problem: r`Find a GaAs LED's wavelength ($E_g = 1.43$ eV), the responsivity of a photodiode with η = 0.8 at 0.85 µm, and the resistor for three 2.0 V LEDs at 20 mA from 12 V.`,
          steps: [
            r`$\lambda = \frac{1.24}{1.43} = 0.867$ µm (infrared).`,
            r`$\mathcal{R} = \frac{0.8 \times 0.85}{1.24} = 0.548$ A/W.`,
            r`$R = \frac{12 - 3 \times 2.0}{0.02} = 300$ Ω, dissipating $0.02^2 \times 300 = 0.12$ W.`,
          ],
          answer: r`0.867 µm; 0.548 A/W; 300 Ω.`,
        },
        {
          level: 'board',
          title: 'An optocoupler output',
          problem: r`An optocoupler with CTR 50% (25% at end of life) has 10 mA in its LED. Its transistor pulls a 5 V logic input low through a pull-up resistor, saturating at 0.2 V. Find the collector current new and at end of life, and the smallest pull-up that still saturates at end of life.`,
          steps: [
            r`New: $0.5 \times 10 = 5$ mA; end of life: $0.25 \times 10 = 2.5$ mA.`,
            r`$R \ge \frac{5 - 0.2}{0.0025} = 1920$ Ω.`,
          ],
          answer: r`5 mA, 2.5 mA; at least 1.92 kΩ.`,
        },
      ],
      traps: [
        r`Optocouplers age: design with the minimum CTR over life and temperature.`,
        r`A wider band gap gives a SHORTER wavelength.`,
      ],
      check: [
        { q: r`What is a series-parallel combination of solar cells called?`, a: r`A solar array (or module, for one panel).` },
        { q: r`Why use an optocoupler between control and power circuits?`, a: r`For electrical isolation.` },
      ],
    },
    {
      name: 'Timers and PLCs',
      inShort: r`Timing circuits and programmable controllers that sequence industrial machines.`,
      body: [
        r`The **555 timer** compares a capacitor's voltage with $\frac13$ and $\frac23$ of its supply. As an **astable** it charges through $R_A + R_B$ and discharges through $R_B$ between those levels, giving a continuous rectangular output; as a **monostable** it gives one pulse, $t = 1.1RC$, per trigger:`,
        {
          type: 'plot',
          alt: 'The capacitor voltage of a 555 astable with RA 10 kilohms, RB 20 kilohms and C 10 nanofarads, over 1.2 ms: charging from one third to two thirds of the supply in 0.208 ms, discharging back in 0.139 ms, repeating.',
          caption: 'A 555 astable: the capacitor swings between ⅓ and ⅔ of Vcc, charging 0.208 ms and discharging 0.139 ms.',
          x: [0, 1.2],
          y: [0, 1],
          xLabel: 't (ms)',
          yLabel: 'v_C / V_{cc}',
          series: [{ f: astable, label: 'v', area: true }],
          marks: [{ y: 2 / 3, label: '⅔' }, { y: 1 / 3, label: '⅓' }],
        },
        r`**PLCs** do the same sequencing in software: timers, counters and interlocks in ladder logic, scanned continuously (scan timing is in Instrumentation & Control). Industrial electronics also heats: **induction heating** (eddy currents in metal, at medium to high frequency) and **dielectric heating** (losses in insulators at radio frequency, as in drying paint, wood or glue).`,
      ],
      keyIdeas: [
        r`555 astable: $t_H = 0.693(R_A + R_B)C$, $t_L = 0.693R_BC$, $f = \frac{1.44}{(R_A + 2R_B)C}$.`,
        r`555 monostable: $t = 1.1RC$.`,
        r`PLC scan: read inputs, run the program, write outputs; timers and counters replace relay logic (timing in Instrumentation & Control).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A 555 astable',
          problem: r`A 555 astable has $R_A = 10$ kΩ, $R_B = 20$ kΩ and C = 10 nF. Find $t_H$, $t_L$, f and the duty cycle.`,
          steps: [
            r`$t_H = 0.693 \times 30\,000 \times 10^{-8} = 0.208$ ms; $t_L = 0.693 \times 20\,000 \times 10^{-8} = 0.139$ ms.`,
            r`$f = \frac{1.44}{50\,000 \times 10^{-8}} = 2.88$ kHz; duty $\frac{30}{50} = 60\%$.`,
          ],
          answer: r`0.208 ms; 0.139 ms; 2.88 kHz; 60%.`,
        },
        {
          level: 'board',
          title: 'A 555 monostable',
          problem: r`A 555 monostable must give a 5 s pulse with a 47 µF capacitor. Find R.`,
          steps: [r`$R = \frac{5}{1.1 \times 47 \times 10^{-6}} = 96.7$ kΩ.`],
          answer: r`96.7 kΩ.`,
        },
      ],
      traps: [
        r`A plain 555 astable can't go below 50% duty: $t_H$ always includes $R_B$.`,
        r`Induction heating is for conductors; dielectric heating is for insulators.`,
      ],
      check: [
        { q: r`What process dries paint or glue electronically by heating the insulating material itself?`, a: r`Dielectric heating.` },
        { q: r`Between what levels does a 555 astable's capacitor swing?`, a: r`One third and two thirds of the supply.` },
      ],
    },
  ],
};
