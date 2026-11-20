// Library › Lessons › EE › Electronics 1 and 2 (2026-11-18; every subtopic in the
// module format 2026-11-20, with figures, examples a step at a time and checks;
// every number re-worked by electronicsLesson.test.js. Coverage and problem
// styles cross-checked against a review center's electronics handout; the text,
// problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order. Ideal op-amp rules and the
// inverting amplifier are in Electric Circuits 1; thyristors and power
// converters in Industrial Electronics.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;
const VT = 0.02585;

// Rectified sine (peak 1, a peak every 1 unit of x) through a capacitor filter
// with time constant RC (in the same units): it follows the sine up to each
// peak, then decays until the sine climbs past it again.
const filtered = (RC) => (x) => {
  const sine = Math.abs(Math.sin(Math.PI * x));
  if (x < 0.5) return sine;
  const peak = Math.floor(x - 0.5) + 0.5;
  return Math.max(sine, Math.exp(-(x - peak) / RC));
};

export default {
  topic: 'Electronics 1 and 2',
  subject: 'EE',
  overview: r`Electronics is about devices that control current with a voltage or a small current: diodes, which let current one way, and transistors (BJTs and FETs), which amplify and switch. Electronics 1 builds from the PN junction to rectifiers, regulators and transistor bias; Electronics 2 analyses amplifiers (small-signal gain, frequency response, feedback), op-amps, oscillators and power stages. The method is always the same: find the dc operating point (Q-point) with simple models (0.7 V across a conducting junction), then use small-signal parameters ($r_e$, $g_m$) set by that bias to find the ac gain. Use $V_T \approx 26$ mV at room temperature.`,
  sources: [
    'Electronic Devices and Circuit Theory (Boylestad and Nashelsky)',
    'Microelectronic Circuits (Sedra and Smith)',
    'Electronic Principles (Malvino and Bates)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Semiconductors and PN Junction',
      inShort: r`Doped silicon carries current by electrons and holes; a PN junction forms a barrier of about 0.7 V.`,
      body: [
        r`A **semiconductor** (silicon, germanium: four valence electrons) conducts somewhere between a metal and an insulator. Pure (intrinsic) silicon has very few free carriers, about $n_i = 10^{10}$ per cm³ at room temperature, equal numbers of electrons and holes. **Doping** changes that by millions of times:`,
        r`| | n-type | p-type |
|---|---|---|
| Dopant | pentavalent donors: phosphorus, arsenic, antimony | trivalent acceptors: boron, gallium, indium |
| Majority carriers | electrons | holes |
| Minority carriers | holes, $p = \frac{n_i^2}{N_D}$ | electrons, $n = \frac{n_i^2}{N_A}$ |`,
        r`Join p and n and the carriers near the boundary combine, leaving a **depletion region** of fixed ions and a built-in potential $V_0 = V_T\ln\frac{N_AN_D}{n_i^2}$, about 0.7 V in silicon and 0.3 V in germanium. Forward bias (p positive) narrows the barrier and current flows; reverse bias widens it and only a tiny leakage flows. $V_0$ rises only slowly with doping, because it goes with the logarithm:`,
        {
          type: 'plot',
          alt: 'The built-in potential of a silicon junction with equal doping on both sides, against the doping on a log scale from 10 to the 14 to 10 to the 18 per cubic centimetre: rising slowly from about 0.48 V to 0.95 V.',
          caption: 'Built-in potential of a symmetric silicon junction: ten thousand times the doping adds under half a volt.',
          x: [14, 18],
          y: [0, 1.2],
          xLabel: 'log₁₀ of N (per cm³)',
          yLabel: 'V₀ (V)',
          series: [{ f: (e) => VT * Math.log(10 ** (2 * e - 20)), label: 'V₀' }],
          marks: [{ x: 16, label: '0.714 V at 10¹⁶' }],
        },
        r`Before semiconductors, the same jobs were done by **vacuum tubes**, which free electrons from a heated cathode (thermionic emission). An electron must gain the metal's **work function** φ to escape, and the board still asks about the triode's three constants: the amplification factor $\mu = \frac{\Delta v_p}{\Delta v_g}$ (plate current constant), the plate resistance $r_p = \frac{\Delta v_p}{\Delta i_p}$ (grid constant) and the transconductance $g_m = \frac{\Delta i_p}{\Delta v_g}$, related by $\mu = g_mr_p$.`,
      ],
      keyIdeas: [
        r`Mass action $np = n_i^2$; more doping means FEWER minority carriers.`,
        r`Donors (5 valence electrons) make n-type, acceptors (3) p-type. $V_0 = V_T\ln\frac{N_AN_D}{n_i^2}$, about 0.7 V in Si, 0.3 V in Ge.`,
        r`Triode: $\mu = g_mr_p$. $V_T = \frac{kT}{q} \approx 25.9$ mV at 300 K.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Minority carriers and the barrier',
          problem: r`A silicon junction has $N_A = N_D = 10^{16}$ cm⁻³ and $n_i = 10^{10}$ cm⁻³. Find the minority holes on the n side and the built-in potential at 300 K.`,
          steps: [
            r`$p = \frac{(10^{10})^2}{10^{16}} = 10^4$ cm⁻³: a trillion times fewer than the electrons.`,
            r`$V_0 = 0.02585 \times \ln10^{12} = 0.714$ V.`,
          ],
          answer: r`$10^4$ holes per cm³; 0.714 V.`,
        },
        {
          level: 'board',
          title: 'A triode, and an escaping electron',
          problem: r`(a) In a triode, raising the plate voltage by 20 V raises the plate current by 2 mA, and the same 20 V rise is cancelled by making the grid 0.8 V more negative. Find μ, $r_p$ and $g_m$. (b) How fast must an electron move to escape a cathode whose work function is 2.5 eV?`,
          steps: [
            r`(a) $\mu = \frac{20}{0.8} = 25$; $r_p = \frac{20}{0.002} = 10$ kΩ; $g_m = \frac{\mu}{r_p} = 2.5$ mS.`,
            r`(b) $\frac12mv^2 = 2.5 \times 1.602 \times 10^{-19}$ J, so $v = \sqrt{\frac{2 \times 4.005 \times 10^{-19}}{9.109 \times 10^{-31}}} = 9.38 \times 10^5$ m/s.`,
          ],
          answer: r`μ = 25, $r_p$ = 10 kΩ, $g_m$ = 2.5 mS; $9.38 \times 10^5$ m/s.`,
        },
      ],
      traps: [
        r`More doping means FEWER minority carriers, not more.`,
        r`In n-type material the majority carriers are electrons, but the material is still neutral overall.`,
      ],
      check: [
        { q: r`Which dopant makes p-type silicon: arsenic or boron?`, a: r`Boron, a trivalent acceptor.` },
        { q: r`Does reverse bias widen or narrow the depletion region?`, a: r`Widen.` },
      ],
    },
    {
      name: 'Diodes',
      inShort: r`Current flows when forward biased past about 0.7 V (silicon), and almost none in reverse.`,
      body: [
        r`A diode's current rises exponentially with its forward voltage, $I_D = I_S(e^{V_D/nV_T} - 1)$, so it barely conducts until the **knee** (about 0.7 V for silicon, 0.3 V for germanium), then conducts heavily for little more voltage: ten times the current needs only about 60 mV more. In reverse only the tiny saturation current flows, until breakdown.`,
        {
          type: 'plot',
          alt: 'Forward current of a germanium and a silicon diode against voltage: each stays near zero, then turns sharply upward, the germanium near 0.3 V and the silicon near 0.7 V.',
          caption: 'Forward characteristics: germanium turns on near 0.3 V, silicon near 0.7 V.',
          x: [0, 0.9],
          y: [0, 25],
          xLabel: 'V_D (V)',
          yLabel: 'I_D (mA)',
          series: [
            { f: (v) => 10 * Math.exp((v - 0.3) / VT), label: 'Ge', dashed: true },
            { f: (v) => 10 * Math.exp((v - 0.7) / VT), label: 'Si' },
          ],
        },
        r`For circuit work use a simple model: **ideal** (a closed switch forward, open reverse), **constant drop** (0.7 V forward), or **drop plus resistance** (0.7 V in series with the bulk resistance). Assume each diode on or off, solve, then check: an "on" diode must carry forward current, an "off" one must see less than its drop.`,
        r`| Special diode | What it does | Used for |
|---|---|---|
| Zener | holds a steady reverse breakdown voltage | voltage regulation and references |
| Tunnel (Esaki) | heavily doped; a negative-resistance region | microwave oscillators, fast switching |
| Varactor | junction capacitance falls as reverse voltage rises | voltage tuning |
| Schottky | metal-semiconductor; about 0.3 V, no stored charge | high-frequency and fast rectifiers |
| LED | forward-biased junction that emits light | indicators, lighting |
| Photodiode | reverse current set by light | light sensing |`,
      ],
      keyIdeas: [
        r`Shockley: $I_D = I_S(e^{V_D/nV_T} - 1)$; ten times the current for about 60 mV more.`,
        r`Models: ideal, constant drop (0.7 V Si, 0.3 V Ge), drop plus resistance.`,
        r`Small-signal resistance $r_d = \frac{nV_T}{I_D}$; the forward voltage falls about 2 mV/°C.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A diode and a resistor',
          problem: r`A silicon diode in series with 1 kΩ is driven from 5 V. Find the current and the diode's dynamic resistance.`,
          steps: [
            r`$I = \frac{5 - 0.7}{1000} = 4.3$ mA.`,
            r`$r_d = \frac{26\ \text{mV}}{4.3\ \text{mA}} = 6.0$ Ω.`,
          ],
          answer: r`4.3 mA; 6.0 Ω.`,
        },
        {
          level: 'board',
          title: 'The drop-plus-resistance model',
          problem: r`A silicon diode modelled as 0.7 V in series with 2 Ω is driven from 5 V through 100 Ω. Find the current and the diode's terminal voltage.`,
          steps: [
            r`$I = \frac{5 - 0.7}{100 + 2} = 42.16$ mA.`,
            r`$V_D = 0.7 + 0.04216 \times 2 = 0.784$ V.`,
          ],
          answer: r`42.2 mA; 0.784 V.`,
        },
      ],
      traps: [
        r`Assume a state, solve, then check it: a "conducting" diode with negative current is really off.`,
        r`A Schottky diode drops about 0.3 V, not 0.7 V.`,
      ],
      check: [
        { q: r`Which diode shows negative resistance?`, a: r`The tunnel diode.` },
        { q: r`Which diode is used as a voltage-tuned capacitor?`, a: r`The varactor.` },
      ],
    },
    {
      name: 'Rectifiers and Filters',
      inShort: r`Diodes turn ac into pulsating dc; a capacitor smooths it.`,
      body: [
        r`A **half-wave** rectifier passes one half of each cycle; a **full-wave** rectifier (a center-tapped transformer with two diodes, or a bridge of four) flips the other half up too, doubling the average and the ripple frequency.`,
        r`| | Half-wave | Center-tap | Bridge |
|---|---|---|---|
| Diodes | 1 | 2 | 4 |
| $V_{dc}$ (ideal) | $\frac{V_m}{\pi}$ | $\frac{2V_m}{\pi}$ | $\frac{2V_m}{\pi}$ |
| Peak inverse voltage | $V_m$ | $2V_m$ | $V_m$ |
| Ripple frequency on 60 Hz | 60 Hz | 120 Hz | 120 Hz |
| Ripple factor, unfiltered | 1.21 | 0.483 | 0.483 |
| Efficiency, maximum | 40.5% | 81.1% | 81.1% |`,
        r`Here $V_m$ is the peak of the secondary (for the center-tap, of each half). A bridge loses two diode drops, a center-tap one. A **capacitor filter** charges to the peak and then supplies the load between peaks, sagging by the ripple $V_{r(pp)} \approx \frac{I_{dc}}{f_rC}$:`,
        {
          type: 'plot',
          alt: 'A full-wave rectified sine, dashed, and the capacitor-filtered output, solid, which follows each peak and then sags slowly until the next half-cycle tops it up.',
          caption: 'Full-wave rectified (dashed) and filtered (solid): the capacitor carries the load between peaks.',
          x: [0, 4],
          y: [0, 1.15],
          xLabel: 'half-cycles',
          yLabel: 'v / V_m',
          series: [
            { f: filtered(4), label: 'filtered', area: true },
            { f: (x) => Math.abs(Math.sin(Math.PI * x)), label: 'rectified', dashed: true },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$V_{dc} = \frac{V_m}{\pi}$ half-wave, $\frac{2V_m}{\pi}$ full-wave; the bridge loses two diode drops.`,
        r`PIV: half-wave $V_m$ ($2V_m$ with a filter capacitor), center-tap $2V_m$, bridge $V_m$.`,
        r`Capacitor filter: $V_{r(pp)} \approx \frac{I_{dc}}{f_rC}$, $V_{dc} \approx V_m - \frac{V_{r(pp)}}{2}$; $f_r$ is 120 Hz for full-wave on 60 Hz.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A filtered bridge',
          problem: r`A bridge rectifier runs from a 12 V RMS, 60 Hz secondary into a 2200 µF filter and a 0.5 A load. Find the peak output, the ripple, and the dc output.`,
          steps: [
            r`$V_m = 12\sqrt2 - 1.4 = 15.57$ V (two diode drops).`,
            r`$V_r = \frac{0.5}{120 \times 2200 \times 10^{-6}} = 1.89$ V peak to peak.`,
            r`$V_{dc} \approx 15.57 - 0.95 = 14.6$ V.`,
          ],
          answer: r`15.57 V; 1.89 V p-p; 14.6 V.`,
        },
        {
          level: 'board',
          title: 'Half-wave with real resistances',
          problem: r`A half-wave rectifier has a 20 V RMS secondary of 0.3 Ω, a silicon diode (0.7 V, 0.1 Ω) and a 20 Ω load. Estimate the peak current, the dc current and the dc load voltage.`,
          steps: [
            r`$V_m = 20\sqrt2 = 28.28$ V; $I_m = \frac{28.28 - 0.7}{0.3 + 0.1 + 20} = 1.352$ A.`,
            r`$I_{dc} \approx \frac{I_m}{\pi} = 0.4304$ A, so $V_{dc} = 0.4304 \times 20 = 8.61$ V.`,
          ],
          answer: r`1.35 A peak; 0.430 A; 8.61 V.`,
        },
        {
          level: 'board',
          title: 'A center-tapped full-wave rectifier',
          problem: r`A center-tapped transformer gives 100 V RMS on each side of the tap into a full-wave rectifier and a 40 Ω load (ideal diodes). Find the dc load current and each diode's peak inverse voltage.`,
          steps: [
            r`$V_m = 100\sqrt2 = 141.4$ V; $V_{dc} = \frac{2 \times 141.4}{\pi} = 90.03$ V, so $I_{dc} = \frac{90.03}{40} = 2.251$ A.`,
            r`Each diode, when off, sees both halves: PIV $= 2V_m = 282.8$ V.`,
          ],
          answer: r`2.25 A; 282.8 V.`,
        },
      ],
      traps: [
        r`Full-wave ripple is at TWICE the line frequency; using 60 Hz doubles the computed ripple.`,
        r`The center-tap's PIV is $2V_m$ of one half, not $V_m$.`,
      ],
      check: [
        { q: r`What is the ripple frequency of a full-wave rectifier on 60 Hz?`, a: r`120 Hz.` },
        { q: r`What is the most efficient a full-wave rectifier can be?`, a: r`81.1%.` },
      ],
    },
    {
      name: 'Zener Regulators',
      inShort: r`A reverse-biased Zener holds its voltage while a series resistor absorbs the difference.`,
      body: [
        r`A **Zener diode** is built to work in reverse breakdown, where its voltage stays nearly constant over a wide range of current. In a shunt regulator, a series resistor $R_S$ drops the difference between the input and $V_Z$, and the Zener takes whatever current the load does not: $I_Z = \frac{V_{in} - V_Z}{R_S} - I_L$.`,
        {
          type: 'circuit',
          alt: 'A Zener regulator: an input source feeds a series resistor RS, then a Zener diode to ground in parallel with the load resistor RL.',
          caption: 'A shunt Zener regulator: RS takes the excess voltage, the Zener the excess current.',
          parts: [
            ['V', [0, 2], [0, 0], 'V_{in}'],
            ['R', [0, 0], [2, 0], 'R_S'],
            ['D', [2, 2], [2, 0], 'V_Z', { side: 'left' }],
            ['wire', [2, 0], [4, 0]],
            ['R', [4, 0], [4, 2], 'R_L'],
            ['wire', [4, 2], [0, 2]],
            ['dot', [2, 0]],
            ['dot', [2, 2]],
          ],
        },
        r`It regulates only while the Zener carries at least its minimum current. Below that the circuit is just a divider; above it the output stays at $V_Z$:`,
        {
          type: 'plot',
          alt: 'The output of a 9.1 V Zener regulator with a 200 ohm series resistor and a 455 ohm load against the input: rising as a divider until the input reaches 13.1 V, then held flat at 9.1 V.',
          caption: 'Output against input (9.1 V Zener, RS = 200 Ω, RL = 455 Ω): a divider below 13.1 V, regulated above.',
          x: [0, 20],
          y: [0, 12],
          xLabel: 'V_{in} (V)',
          yLabel: 'V_{out} (V)',
          series: [{ f: (v) => Math.min((v * 455) / 655, 9.1), label: 'V_out' }],
          marks: [{ at: [13.1, 9.1], label: 'regulates from 13.1 V' }],
        },
        r`Design for both extremes: the Zener must keep its minimum current at the LOWEST input and HEAVIEST load, and must not overheat at the HIGHEST input with NO load.`,
      ],
      keyIdeas: [
        r`$I_Z = \frac{V_{in} - V_Z}{R_S} - I_L$; it must stay above $I_{Z(\min)}$ at the lowest input and heaviest load.`,
        r`Worst Zener dissipation: highest input with no load, $P_Z = V_Z\frac{V_{in(\max)} - V_Z}{R_S}$.`,
        r`Load regulation $\frac{V_{NL} - V_{FL}}{V_{FL}} \times 100$; line regulation $\frac{\Delta V_o}{\Delta V_{in}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Zener current and worst-case power',
          problem: r`A 9.1 V Zener with $R_S = 200$ Ω runs from 15 V and supplies 20 mA. Find the Zener current, and its power if the load is removed and the input rises to 18 V.`,
          steps: [
            r`$I_Z = \frac{15 - 9.1}{200} - 0.020 = 9.5$ mA.`,
            r`No load at 18 V: $9.1 \times \frac{18 - 9.1}{200} = 0.405$ W.`,
          ],
          answer: r`9.5 mA; 0.405 W.`,
        },
        {
          level: 'board',
          title: 'Choosing the series resistor',
          problem: r`A 6.8 V, 0.5 W Zener ($I_{Z(\min)} = 5$ mA) must hold a load drawing 0 to 30 mA from an input of 12 to 16 V. Find the range of $R_S$.`,
          steps: [
            r`Largest $R_S$ (low input, full load): $\frac{12 - 6.8}{0.030 + 0.005} = 148.6$ Ω.`,
            r`$I_{Z(\max)} = \frac{0.5}{6.8} = 73.5$ mA. Smallest $R_S$ (high input, no load): $\frac{16 - 6.8}{0.0735} = 125.2$ Ω.`,
          ],
          answer: r`Between 125.2 Ω and 148.6 Ω.`,
        },
      ],
      traps: [
        r`The Zener's worst case is NO load, not full load.`,
        r`A Zener regulates only above its minimum current: check it at the lowest input.`,
      ],
      check: [
        { q: r`In the plotted regulator, why does regulation start at 13.1 V?`, a: r`Below it the divider $V_{in}\frac{455}{655}$ gives less than 9.1 V, so the Zener carries no current.` },
        { q: r`In which bias does a Zener regulate?`, a: r`Reverse bias, in breakdown.` },
      ],
    },
    {
      name: 'BJT Biasing',
      inShort: r`Setting the dc Q-point so the transistor amplifies in its active region.`,
      body: [
        r`A bipolar transistor amplifies when its base-emitter junction is forward biased (about 0.7 V) and its base-collector junction reverse biased: the **active region**, where $I_C = \beta I_B$ and $I_E = I_B + I_C$. Biasing sets the dc **Q-point** in the middle of that region, so the signal can swing both ways without hitting **cutoff** ($I_C = 0$) or **saturation** ($V_{CE} \approx 0.2$ V).`,
        {
          type: 'plot',
          alt: 'Collector output curves for base currents of 5, 10, 15 and 20 microamps, flat at 0.6, 1.2, 1.8 and 2.4 mA, with a dc load line from 3.49 mA down to 15 V and the Q-point at 7.24 V and 1.80 mA.',
          caption: 'Output curves (dashed) for four base currents, the dc load line for 15 V and 4.3 kΩ, and the Q-point near its middle.',
          x: [0, 16],
          y: [0, 4],
          xLabel: 'V_{CE} (V)',
          yLabel: 'I_C (mA)',
          series: [
            { f: (v) => (15 - v) / 4.3, label: 'load line' },
            ...[5, 10, 15, 20].map((ib) => ({ f: (v) => 0.12 * ib * (1 - Math.exp(-v / 0.15)), label: `I_B = ${ib} µA`, dashed: true, colour: colourOf(1) })),
          ],
          legend: false,
          marks: [{ at: [7.239, 1.805], label: 'Q' }],
        },
        r`| Bias | $I_C$ depends on β? | Note |
|---|---|---|
| Fixed (base resistor only) | directly | simple, unstable |
| Emitter-stabilized ($R_E$ added) | less | $R_E$ gives negative feedback |
| Collector feedback | less | $R_B$ from collector to base |
| Voltage divider | hardly at all | the standard choice |`,
      ],
      keyIdeas: [
        r`$I_E = I_B + I_C$, $I_C = \beta I_B$, $\alpha = \frac{\beta}{\beta + 1}$; active: B-E forward (0.7 V), B-C reverse.`,
        r`With $R_E$: $I_B = \frac{V_{CC} - V_{BE}}{R_B + (\beta + 1)R_E}$. Divider: $V_{TH} = V_{CC}\frac{R_2}{R_1 + R_2}$, $I_E = \frac{V_{TH} - V_{BE}}{R_E + R_{TH}/(\beta + 1)}$.`,
        r`Load line $V_{CE} = V_{CC} - I_C(R_C + R_E)$, from $I_{C(sat)}$ to $V_{CC}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Voltage-divider bias',
          problem: r`$V_{CC} = 15$ V, $R_1 = 39$ kΩ, $R_2 = 8.2$ kΩ, $R_C = 3.3$ kΩ, $R_E = 1$ kΩ, $\beta = 120$. Find $I_E$ and $V_{CE}$.`,
          steps: [
            r`$V_{TH} = 15 \times \frac{8.2}{47.2} = 2.606$ V, $R_{TH} = \frac{39 \times 8.2}{47.2} = 6.775$ kΩ.`,
            r`$I_E = \frac{2.606 - 0.7}{1000 + 6775/121} = 1.805$ mA.`,
            r`$V_{CE} \approx 15 - 1.805 \times 4.3 = 7.24$ V.`,
          ],
          answer: r`1.80 mA; 7.24 V, near the middle of the load line.`,
        },
        {
          level: 'board',
          title: 'Why β matters in base bias',
          problem: r`$V_{CC} = 12$ V, $R_B = 470$ kΩ, $R_C = 2.2$ kΩ, $R_E = 1$ kΩ. Find $I_C$ and $V_{CE}$ for β = 100, then for β = 200.`,
          steps: [
            r`β = 100: $I_B = \frac{11.3}{470\,000 + 101 \times 1000} = 19.79$ µA, $I_C = 1.979$ mA, $V_{CE} = 12 - 1.979 \times 2.2 - 1.999 \times 1 = 5.65$ V.`,
            r`β = 200: $I_B = \frac{11.3}{671\,000} = 16.84$ µA, $I_C = 3.368$ mA, $V_{CE} = 12 - 7.410 - 3.385 = 1.21$ V: nearly saturated.`,
          ],
          answer: r`5.65 V, then 1.21 V: doubling β moves the Q-point almost to saturation.`,
        },
      ],
      traps: [
        r`Fixed bias alone ($R_E = 0$) makes $I_C$ proportional to β, which varies widely between transistors.`,
        r`β is $\frac{I_C}{I_B}$, not $\frac{I_C}{I_E}$ (that is α).`,
      ],
      check: [
        { q: r`A transistor has $I_C = 50$ mA and $I_E = 50.4$ mA. What is β?`, a: r`$I_B = 0.4$ mA, so $\beta = 125$.` },
        { q: r`Where does the dc load line cross the current axis for 15 V and 4.3 kΩ?`, a: r`$\frac{15}{4.3} = 3.49$ mA.` },
      ],
    },
    {
      name: 'BJT Amplifiers',
      inShort: r`Small ac signals ride on the Q-point; the gain comes from $g_m = \frac{I_C}{V_T}$.`,
      body: [
        r`For small signals the transistor looks like a resistance $r_e = \frac{V_T}{I_E}$ in the emitter (or $r_\pi = (\beta + 1)r_e$ seen from the base), with a current source $\beta i_b$ in the collector. In the ac circuit, coupling and bypass capacitors are shorts and the dc supply is ground.`,
        r`| | Common emitter | Common collector (emitter follower) | Common base |
|---|---|---|---|
| Voltage gain | $-\frac{R_C \| R_L}{r_e + R_E}$, large, inverting | just under 1 | $\frac{R_C \| R_L}{r_e}$, large, in phase |
| Input resistance | medium, $(\beta + 1)(r_e + R_E)$ | high | low, about $r_e$ |
| Output resistance | about $R_C$ | low | about $R_C$ |
| Use | the general amplifier | a buffer | high frequencies |`,
        r`An unbypassed emitter resistor trades gain for stability: the gain no longer hangs on $r_e$, which changes with temperature and current.`,
        {
          type: 'plot',
          alt: 'Common-emitter gain against the unbypassed emitter resistance, for an ac collector load of 2481 ohms and r e of 14.4 ohms: 172 with none, falling to 10.6 at 220 ohms and lower beyond.',
          caption: 'Gain against unbypassed emitter resistance: a little emitter resistance costs much gain but steadies it.',
          x: [0, 500],
          y: [0, 190],
          xLabel: 'R_E unbypassed (Ω)',
          yLabel: '|A_v|',
          series: [{ f: (re) => 2481.2 / (14.405 + re), label: '|A_v|', area: true }],
          marks: [{ at: [220, 2481.2 / 234.405], label: '10.6 at 220 Ω' }],
        },
      ],
      keyIdeas: [
        r`$r_e = \frac{V_T}{I_E}$, $g_m = \frac{I_C}{V_T}$, $r_\pi = (\beta + 1)r_e$.`,
        r`CE: $A_v = -\frac{R_C \| R_L}{r_e + R_E}$; CC: $A_v \approx 1$, high $R_{in}$; CB: in phase, $R_{in} \approx r_e$.`,
        r`Capacitors are shorts and dc supplies are ground in the ac circuit.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Common-emitter gain',
          problem: r`The divider-biased stage of BJT Biasing ($I_E = 1.805$ mA, $R_C = 3.3$ kΩ) drives 10 kΩ. Find the gain with $R_E$ fully bypassed and with 220 Ω left unbypassed.`,
          steps: [
            r`$r_e = \frac{26}{1.805} = 14.4$ Ω; $R_C \| R_L = 2481$ Ω.`,
            r`Bypassed: $-\frac{2481}{14.4} = -172$. With 220 Ω: $-\frac{2481}{234.4} = -10.6$, but now stable.`,
          ],
          answer: r`−172; −10.6.`,
        },
        {
          level: 'board',
          title: 'An emitter follower',
          problem: r`An emitter follower with β = 100 runs at $I_E = 2$ mA, with $R_E = 2.2$ kΩ feeding a 1 kΩ load. Find its voltage gain and the input resistance at the base.`,
          steps: [
            r`$r_e = \frac{26}{2} = 13$ Ω; $R_E \| R_L = \frac{2200 \times 1000}{3200} = 687.5$ Ω.`,
            r`$A_v = \frac{687.5}{13 + 687.5} = 0.981$.`,
            r`$R_{in} = (\beta + 1)(r_e + R_E \| R_L) = 101 \times 700.5 = 70.75$ kΩ.`,
          ],
          answer: r`0.981; 70.8 kΩ.`,
        },
      ],
      traps: [
        r`$r_e$ uses the DC emitter current from the bias, not the signal current.`,
        r`Include the load: the gain uses $R_C \| R_L$, not $R_C$.`,
      ],
      check: [
        { q: r`Which configuration has a voltage gain just under 1 and a high input resistance?`, a: r`Common collector (the emitter follower).` },
        { q: r`What is $g_m$ at $I_C = 2.6$ mA?`, a: r`$\frac{2.6}{26} = 0.1$ S, 100 mS.` },
      ],
    },
    {
      name: 'FETs and MOSFETs',
      inShort: r`Voltage-controlled devices: the gate draws no current, the gate voltage sets the drain current.`,
      body: [
        r`A field-effect transistor controls its drain current with the gate voltage, and its gate draws essentially no current. A **JFET** is on at $V_{GS} = 0$ and pinched off at $V_P$, following Shockley's square law. A **depletion MOSFET** works the same way but also allows the enhancement side; an **enhancement MOSFET** is off until $V_{GS}$ passes a threshold.`,
        r`| | JFET | Depletion MOSFET | Enhancement MOSFET |
|---|---|---|---|
| At $V_{GS} = 0$ | $I_{DSS}$ flows | $I_{DSS}$ flows | off |
| Drain current | $I_{DSS}\left(1 - \frac{V_{GS}}{V_P}\right)^2$ | the same | $k(V_{GS} - V_{th})^2$ |
| $g_m$ | $\frac{2I_{DSS}}{\lvert V_P\rvert}\left(1 - \frac{V_{GS}}{V_P}\right)$ | the same | $2k(V_{GS} - V_{th})$ |
| Usual bias | self-bias | self or divider | divider or feedback |`,
        r`**Self-bias** puts a resistor in the source, so $V_{GS} = -I_DR_S$: a straight line on the transfer curve. Where the line meets the curve is the Q-point.`,
        {
          type: 'plot',
          alt: 'A JFET transfer curve with I DSS of 10 mA and pinch-off at minus 4 V, and a self-bias line for a 500 ohm source resistor crossing it at minus 1.68 V and 3.36 mA.',
          caption: 'The transfer curve (IDSS = 10 mA, VP = −4 V) and the 500 Ω self-bias line meet at the Q-point.',
          x: [-4, 0],
          y: [0, 11],
          xLabel: 'V_{GS} (V)',
          yLabel: 'I_D (mA)',
          series: [
            { f: (v) => 10 * (1 - v / -4) ** 2, label: 'transfer curve' },
            { f: (v) => -v / 0.5, label: 'bias line', dashed: true },
          ],
          legend: false,
          marks: [{ at: [-1.6808, 3.3616], label: 'Q' }],
        },
      ],
      keyIdeas: [
        r`JFET: $I_D = I_{DSS}\left(1 - \frac{V_{GS}}{V_P}\right)^2$; enhancement MOSFET: $I_D = k(V_{GS} - V_{th})^2$ in saturation.`,
        r`$g_m = \frac{2I_{DSS}}{\lvert V_P\rvert}\left(1 - \frac{V_{GS}}{V_P}\right)$ or $2k(V_{GS} - V_{th})$; common source $A_v = -g_m(R_D \| R_L)$.`,
        r`Self bias: $V_{GS} = -I_DR_S$, solved with Shockley.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Self-biased JFET',
          problem: r`A JFET with $I_{DSS} = 10$ mA and $V_P = -4$ V is self-biased with $R_S = 500$ Ω. Find $V_{GS}$, $I_D$ and $g_m$.`,
          steps: [
            r`$V_{GS} = -0.5 \times 10\left(1 + \frac{V_{GS}}{4}\right)^2$ gives $0.3125V_{GS}^2 + 3.5V_{GS} + 5 = 0$.`,
            r`$V_{GS} = -1.681$ V (the other root, −9.52 V, is beyond pinch-off). $I_D = 3.362$ mA.`,
            r`$g_m = 5(1 - 0.4202) = 2.899$ mS.`,
          ],
          answer: r`−1.68 V; 3.36 mA; 2.90 mS.`,
        },
        {
          level: 'board',
          title: 'An enhancement MOSFET stage',
          problem: r`An enhancement MOSFET with $k = 0.5$ mA/V² and $V_{th} = 2$ V is biased at $V_{GS} = 5$ V from $V_{DD} = 15$ V through $R_D = 2$ kΩ. Find $I_D$, $V_{DS}$, $g_m$ and the gain.`,
          steps: [
            r`$I_D = 0.5(5 - 2)^2 = 4.5$ mA; $V_{DS} = 15 - 4.5 \times 2 = 6$ V, above $V_{GS} - V_{th} = 3$ V: saturated, as assumed.`,
            r`$g_m = 2 \times 0.5 \times 3 = 3$ mS; $A_v = -3 \times 2 = -6$.`,
          ],
          answer: r`4.5 mA; 6 V; 3 mS; −6.`,
        },
      ],
      traps: [
        r`Discard the root beyond pinch-off: there the device is off, not conducting.`,
        r`Check $V_{DS} \ge V_{GS} - V_{th}$ before using the square law.`,
      ],
      check: [
        { q: r`Which FET is off at $V_{GS} = 0$?`, a: r`The enhancement MOSFET.` },
        { q: r`Why does a FET's gate draw almost no current?`, a: r`It is a reverse-biased junction (JFET) or insulated by oxide (MOSFET).` },
      ],
    },
    {
      name: 'Frequency Response',
      inShort: r`Coupling capacitors cut the lows; device and stray capacitances cut the highs.`,
      body: [
        r`An amplifier's gain is flat only over its **midband**. At low frequencies the coupling and bypass capacitors stop acting as shorts; at high frequencies the transistor's own and stray capacitances shunt the signal. Each capacitor gives a corner $f = \frac{1}{2\pi R_{eq}C}$, and the band edges $f_L$ and $f_H$ are where the gain is 3 dB down (0.707 of midband).`,
        {
          type: 'plot',
          alt: 'An amplifier gain in decibels against frequency on a log scale from 1 Hz to 10 MHz: flat at 40 dB through midband, 3 dB down at 15.9 Hz and at 200 kHz, falling off at both ends.',
          caption: 'Gain in decibels: flat at 40 dB in midband, −3 dB at fL = 15.9 Hz and fH = 200 kHz.',
          x: [1, 1e7],
          logX: true,
          y: [0, 50],
          xLabel: 'f (Hz)',
          yLabel: 'A (dB)',
          series: [{ f: (f) => 40 - 10 * Math.log10(1 + (15.915 / f) ** 2) - 10 * Math.log10(1 + (f / 2e5) ** 2), label: 'A' }],
          marks: [{ y: 37, label: '−3 dB' }],
        },
        r`The **Miller effect** sets $f_H$ in an inverting stage: a capacitance C from input to output looks like $C(1 + \lvert A_v\rvert)$ at the input.`,
        r`| Ratio | Decibels |
|---|---|
| Power | $10\log\frac{P_2}{P_1}$ |
| Voltage or current | $20\log\frac{V_2}{V_1}$ |
| Power against 1 mW | dBm $= 10\log\frac{P}{1\ \text{mW}}$ |
| Stages in cascade | the decibels add |`,
      ],
      keyIdeas: [
        r`Each capacitor gives a corner $f = \frac{1}{2\pi R_{eq}C}$; the bypass capacitor usually dominates $f_L$.`,
        r`Miller: a capacitance across an inverting gain looks $C(1 + \lvert A_v\rvert)$ at the input, setting $f_H$.`,
        r`Decibels: $20\log$ for voltage, $10\log$ for power; cascaded stages add.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A low corner and a Miller capacitance',
          problem: r`A 1 kΩ source drives an amplifier of 9 kΩ input resistance through 1 µF. Find $f_L$. Then: what is the Miller input capacitance of 2 pF across a gain of −99?`,
          steps: [
            r`$f_L = \frac{1}{2\pi \times 10^4 \times 10^{-6}} = 15.9$ Hz.`,
            r`Miller: $2 \times (1 + 99) = 200$ pF.`,
          ],
          answer: r`15.9 Hz; 200 pF.`,
        },
        {
          level: 'board',
          title: 'Decibels',
          problem: r`Three stages have gains of 20 dB, 14 dB and 6 dB. Find the total in decibels and as a voltage ratio. Then express 20 W in dBm.`,
          steps: [
            r`The decibels add: 20 + 14 + 6 = 40 dB, a voltage ratio of $10^{40/20} = 100$.`,
            r`$10\log\frac{20}{0.001} = 43.0$ dBm.`,
          ],
          answer: r`40 dB, ×100; 43.0 dBm.`,
        },
      ],
      traps: [
        r`$-3$ dB is half POWER, 0.707 of the voltage.`,
        r`Use $20\log$ for voltage ratios and $10\log$ for power: mixing them halves or doubles the answer.`,
      ],
      check: [
        { q: r`An amplifier's output is 60 times its input voltage. What is its gain in decibels?`, a: r`$20\log60 = 35.6$ dB.` },
        { q: r`A 100 W signal comes out at 1 mW. What is the loss?`, a: r`$10\log\frac{100}{0.001} = 50$ dB.` },
      ],
    },
    {
      name: 'Multistage and Feedback Amplifiers',
      inShort: r`Cascading multiplies gain; negative feedback trades gain for stability and bandwidth.`,
      body: [
        r`Stages in **cascade** multiply their loaded gains (add their decibels), but each also narrows the bandwidth: n identical stages give $f_H^* = f_H\sqrt{2^{1/n} - 1}$.`,
        r`**Negative feedback** returns a fraction β of the output against the input: $A_f = \frac{A}{1 + A\beta}$. When $A\beta$ is large, $A_f \approx \frac{1}{\beta}$, set by resistors, not by the transistors. The gain falls by $1 + A\beta$, and the bandwidth rises by the same factor, so their product stays put:`,
        {
          type: 'plot',
          alt: 'Gain in decibels against frequency, log scale: an open-loop amplifier at 80 dB rolling off from 100 Hz, and the same amplifier with feedback at about 40 dB, flat out to 10.1 kHz before joining the same roll-off line.',
          caption: 'Feedback trades gain for bandwidth: 80 dB to 100 Hz becomes 40 dB to 10.1 kHz.',
          x: [1, 1e7],
          logX: true,
          y: [0, 110],
          xLabel: 'f (Hz)',
          yLabel: 'A (dB)',
          series: [
            { f: (f) => 80 - 10 * Math.log10(1 + (f / 100) ** 2), label: 'open loop' },
            { f: (f) => 20 * Math.log10(1e4 / 101) - 10 * Math.log10(1 + (f / 10100) ** 2), label: 'with feedback', dashed: true },
          ],
        },
        r`Feedback also steadies the gain, cuts distortion and noise inside the loop, and changes the input and output resistances by $1 + A\beta$: series feedback at the input raises the input resistance, shunt feedback lowers it. A **Darlington** pair (two transistors, one feeding the other's base) gives $\beta_D \approx \beta_1\beta_2$ with $V_{BE} \approx 1.4$ V.`,
      ],
      keyIdeas: [
        r`Overall gain = product of LOADED stage gains (dB add). $n$ identical stages: $f_H^* = f_H\sqrt{2^{1/n} - 1}$.`,
        r`$A_f = \frac{A}{1 + A\beta} \approx \frac{1}{\beta}$; bandwidth grows by $1 + A\beta$.`,
        r`Darlington: $\beta_D \approx \beta_1\beta_2$, $V_{BE} \approx 1.4$ V.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two stages; a feedback gain',
          problem: r`Two identical stages each have $f_H = 100$ kHz. Find the overall $f_H$. Then: an amplifier with $A = 10^4$ gets $\beta = 0.01$; find $A_f$.`,
          steps: [
            r`$f_H^* = 100\sqrt{\sqrt2 - 1} = 64.4$ kHz.`,
            r`$A_f = \frac{10^4}{1 + 100} = 99.0$, close to $\frac{1}{\beta} = 100$.`,
          ],
          answer: r`64.4 kHz; 99.0.`,
        },
        {
          level: 'board',
          title: 'Working back to the open-loop gain',
          problem: r`An amplifier with 0.4% of its output fed back negatively has a gain of 200. What was its gain without feedback?`,
          steps: [
            r`$A_f = \frac{A}{1 + A\beta}$, so $A = \frac{A_f}{1 - A_f\beta} = \frac{200}{1 - 200 \times 0.004}$.`,
            r`$A = \frac{200}{0.2} = 1000$.`,
          ],
          answer: r`1000.`,
        },
      ],
      traps: [
        r`Multiplying unloaded gains overstates the total: each stage loads the one before.`,
        r`Feedback multiplies the bandwidth by $1 + A\beta$, the same factor it divides the gain by.`,
      ],
      check: [
        { q: r`What is the β of a Darlington pair of transistors with β of 100 and 50?`, a: r`About $100 \times 50 = 5000$.` },
        { q: r`In the figure, why does the closed-loop corner sit at 10.1 kHz?`, a: r`The feedback factor $1 + A\beta = 101$ multiplies the 100 Hz bandwidth.` },
      ],
    },
    {
      name: 'Operational Amplifiers',
      inShort: r`Very high gain amplifiers used with feedback, so the circuit's resistors set the gain.`,
      body: [
        r`With negative feedback, an op-amp's two inputs sit at the same voltage and draw no current (the rules from Electric Circuits 1). In the **non-inverting** amplifier the signal goes to the + input, and the divider $R_1$, $R_f$ feeds a fraction of the output back to the − input, so the gain is $1 + \frac{R_f}{R_1}$, in phase, with a very high input resistance.`,
        {
          type: 'circuit',
          alt: 'A non-inverting amplifier: the input goes straight to the plus input; a feedback resistor Rf runs from the output back to the minus input, which also goes to ground through R1.',
          caption: 'A non-inverting amplifier: gain 1 + Rf/R1, in phase.',
          parts: [
            ['wire', [3, 1.5], [2.5, 1.5]],
            ['wire', [2.5, 1.5], [2.5, 0]],
            ['R', [0.5, 0], [2.5, 0], 'R_1'],
            ['gnd', [0.5, 0]],
            ['R', [2.5, 0], [5.5, 0], 'R_f'],
            ['wire', [5.5, 0], [5.5, 2]],
            ['wire', [5, 2], [6.5, 2]],
            ['wire', [3, 2.5], [0.5, 2.5]],
            ['opamp', [5, 2]],
            ['dot', [2.5, 0]],
            ['dot', [5.5, 2]],
          ],
          nodes: [{ at: [0.5, 2.5], label: 'v_{in}', side: 'sw' }, { at: [6.5, 2], label: 'v_o' }],
        },
        r`| Circuit | Output |
|---|---|
| Inverting | $-\frac{R_f}{R_i}v_i$ |
| Non-inverting | $\left(1 + \frac{R_f}{R_1}\right)v_i$ |
| Voltage follower | $v_i$ |
| Integrator | $-\frac{1}{RC}\int v_i\,dt$ |
| Differentiator | $-RC\frac{dv_i}{dt}$ |
| Schmitt trigger | switches at $\pm\beta V_{sat}$, $\beta = \frac{R_1}{R_1 + R_2}$ |`,
        r`Real op-amps have limits: the **gain-bandwidth product** $f_T$ (bandwidth $= \frac{f_T}{\text{noise gain}}$), the **slew rate** (the fastest the output can move, so $f_{\max} = \frac{SR}{2\pi V_p}$ at full swing), and the **CMRR**, how well it rejects a voltage common to both inputs.`,
      ],
      keyIdeas: [
        r`Inverting $-\frac{R_f}{R_i}$; non-inverting $1 + \frac{R_f}{R_1}$; follower 1.`,
        r`Limits: slew rate $f_{\max} = \frac{SR}{2\pi V_p}$; bandwidth $\frac{f_T}{\text{noise gain}}$; CMRR $= \frac{A_d}{A_{cm}}$.`,
        r`Schmitt trigger: positive feedback gives thresholds $\pm\beta V_{sat}$ and hysteresis.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Slew rate and bandwidth',
          problem: r`An op-amp has a slew rate of 0.5 V/µs and $f_T = 1$ MHz. Find the highest frequency for a 10 V peak output, and the bandwidth at a gain of 100.`,
          steps: [
            r`$f_{\max} = \frac{0.5 \times 10^6}{2\pi \times 10} = 7.96$ kHz.`,
            r`Bandwidth $= \frac{10^6}{100} = 10$ kHz.`,
          ],
          answer: r`7.96 kHz; 10 kHz.`,
        },
        {
          level: 'board',
          title: 'An inverting stage and a Schmitt trigger',
          problem: r`(a) An inverting amplifier has $R_i = 10$ kΩ and $R_f = 100$ kΩ on an op-amp with $f_T = 1$ MHz. Find the output for 0.5 V in and the bandwidth. (b) A Schmitt trigger saturates at ±12 V; its positive feedback is a divider of 40 kΩ from the output to the + input and 10 kΩ from there to ground. Find its thresholds and hysteresis.`,
          steps: [
            r`(a) $v_o = -10 \times 0.5 = -5$ V. The noise gain is $1 + 10 = 11$, so the bandwidth is $\frac{10^6}{11} = 90.9$ kHz.`,
            r`(b) $\beta = \frac{10}{10 + 40} = 0.2$: thresholds $\pm0.2 \times 12 = \pm2.4$ V, hysteresis 4.8 V.`,
          ],
          answer: r`−5 V, 90.9 kHz; ±2.4 V, 4.8 V of hysteresis.`,
        },
      ],
      traps: [
        r`For an inverting amplifier use the noise gain $1 + \frac{R_f}{R_i}$, not $\frac{R_f}{R_i}$, with GBW.`,
        r`Slew-rate limits depend on the output's amplitude as well as its frequency.`,
      ],
      check: [
        { q: r`What is the gain of a non-inverting amplifier with $R_f = 47$ kΩ and $R_1 = 4.7$ kΩ?`, a: r`$1 + 10 = 11$.` },
        { q: r`What is a voltage follower's gain, and why use one?`, a: r`1; it buffers a high-resistance source from a load.` },
      ],
    },
    {
      name: 'Oscillators',
      inShort: r`Positive feedback with a loop gain of 1 at 0° makes a circuit generate its own sine wave.`,
      body: [
        r`An oscillator is an amplifier that feeds its own input. By the **Barkhausen criterion** it sustains a sine wave at the frequency where the loop gain $A\beta$ is exactly 1 with 0° (or 360°) of phase shift; to start, the gain is set slightly above 1 so noise builds up.`,
        r`The feedback network picks the frequency. In a **Wien bridge** it passes a third of the signal, with zero phase shift, only at $f_0 = \frac{1}{2\pi RC}$, so the amplifier needs a gain of exactly 3:`,
        {
          type: 'plot',
          alt: 'The Wien network’s transfer ratio against frequency over f naught, log scale from 0.2 to 10: a broad peak of one third at f naught, falling on both sides.',
          caption: 'The Wien network passes at most one third, at f₀: so the amplifier needs a gain of 3.',
          x: [0.2, 10],
          logX: true,
          y: [0, 0.4],
          xLabel: 'f / f₀',
          yLabel: 'β',
          series: [{ f: (u) => 1 / Math.sqrt(9 + (u - 1 / u) ** 2), label: 'β', area: true }],
          marks: [{ at: [1, 1 / 3], label: '1/3 at f₀' }],
        },
        r`| Oscillator | Frequency | Amplifier gain needed |
|---|---|---|
| RC phase shift (3 sections) | $\frac{1}{2\pi RC\sqrt6}$ | 29 |
| Wien bridge | $\frac{1}{2\pi RC}$ | 3 |
| Colpitts | $\frac{1}{2\pi\sqrt{LC_T}}$, $C_T = \frac{C_1C_2}{C_1 + C_2}$ | $\frac{C_2}{C_1}$ |
| Hartley | $\frac{1}{2\pi\sqrt{L_TC}}$, $L_T = L_1 + L_2 + 2M$ | $\frac{L_1}{L_2}$ |
| Crystal | the crystal's series or parallel resonance | very stable |`,
      ],
      keyIdeas: [
        r`Barkhausen: $\lvert A\beta\rvert = 1$ and phase 0° (slightly above 1 to start).`,
        r`RC phase shift: $f = \frac{1}{2\pi RC\sqrt6}$, gain 29. Wien bridge: $f = \frac{1}{2\pi RC}$, gain 3.`,
        r`LC: Colpitts ($C$ in series), Hartley ($L_1 + L_2 + 2M$), $f = \frac{1}{2\pi\sqrt{LC}}$; crystals for stable frequency.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Wien bridge and phase shift',
          problem: r`With $R = 10$ kΩ and $C = 10$ nF, find the frequency of a Wien-bridge and of an RC phase-shift oscillator, and the Wien amplifier's $R_f$ if $R_1 = 10$ kΩ.`,
          steps: [
            r`Wien: $\frac{1}{2\pi \times 10^4 \times 10^{-8}} = 1.59$ kHz; a gain of 3 needs $R_f = 2R_1 = 20$ kΩ.`,
            r`Phase shift: $\frac{1591}{\sqrt6} = 650$ Hz.`,
          ],
          answer: r`1.59 kHz, $R_f$ = 20 kΩ; 650 Hz.`,
        },
        {
          level: 'board',
          title: 'Colpitts and Hartley',
          problem: r`(a) A Colpitts oscillator has two 0.02 µF capacitors and a 100 µH coil. (b) A Hartley oscillator has coils of 1 mH and 0.2 mH (no mutual inductance) and 100 pF. Find each frequency.`,
          steps: [
            r`(a) $C_T = 0.01$ µF: $f = \frac{1}{2\pi\sqrt{10^{-4} \times 10^{-8}}} = 159.2$ kHz.`,
            r`(b) $L_T = 1.2$ mH: $f = \frac{1}{2\pi\sqrt{1.2 \times 10^{-3} \times 10^{-10}}} = 459.4$ kHz.`,
          ],
          answer: r`159.2 kHz; 459.4 kHz.`,
        },
      ],
      traps: [
        r`The phase-shift network passes only 1/29 of the signal: the amplifier gain needed is 29, not 1.`,
        r`Colpitts capacitors are in SERIES: their total is smaller than either.`,
      ],
      check: [
        { q: r`What two conditions must the loop meet to oscillate?`, a: r`A loop gain of 1 and a total phase shift of 0° (360°).` },
        { q: r`Which oscillator is the most frequency-stable?`, a: r`The crystal oscillator.` },
      ],
    },
    {
      name: 'Power Amplifiers',
      inShort: r`Output stages that deliver watts: the trade is efficiency against distortion.`,
      body: [
        r`Power amplifiers are classed by how much of each cycle the output device conducts:`,
        r`| Class | Conducts for | Maximum efficiency | Note |
|---|---|---|---|
| A | 360° | 25% (resistive), 50% (transformer) | least distortion, runs hot |
| AB | between 180° and 360° | between A and B | removes crossover distortion |
| B | 180° (push-pull pair) | 78.5% | crossover distortion near zero |
| C | less than 180° | over 90% | tuned RF amplifiers only |`,
        {
          type: 'plot',
          alt: 'Efficiency against output swing as a fraction of the supply: class B rises in a straight line to 78.5 percent, transformer-coupled class A curves up to 50 percent, and resistive class A to 25 percent.',
          caption: 'Efficiency against output swing: class B wins at every level, and all of them are worst at low output.',
          x: [0, 1],
          y: [0, 90],
          xLabel: 'V_p / V_{CC}',
          yLabel: 'η (%)',
          series: [
            { f: (x) => 25 * Math.PI * x, label: 'class B' },
            { f: (x) => 50 * x * x, label: 'class A, transformer' },
            { f: (x) => 25 * x * x, label: 'class A, resistive', dashed: true },
          ],
        },
        r`A class B push-pull pair on $\pm V_{CC}$ delivering a peak $V_p$ into $R_L$ gives $P_o = \frac{V_p^2}{2R_L}$ from a supply power $\frac{2V_{CC}V_p}{\pi R_L}$, so $\eta = \frac{\pi}{4}\frac{V_p}{V_{CC}}$. The transistors run hottest at about 64% of full swing, dissipating $\frac{2V_{CC}^2}{\pi^2R_L}$ between them, and a heat sink keeps the junction cool: $T_J = T_A + P_D(\theta_{JC} + \theta_{CS} + \theta_{SA})$.`,
      ],
      keyIdeas: [
        r`Class A max 25% (resistive) or 50% (transformer); class B $\eta = \frac{\pi}{4}\frac{V_p}{V_{CC}}$, max 78.5%.`,
        r`Worst class B dissipation $\frac{2V_{CC}^2}{\pi^2R_L}$ at $V_p = \frac{2V_{CC}}{\pi}$.`,
        r`Heat: $T_J = T_A + P_D(\theta_{JC} + \theta_{CS} + \theta_{SA})$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A class B stage',
          problem: r`A class B stage on ±15 V drives 8 Ω at 12 V peak. Find the output power, supply power, efficiency, and the worst-case transistor dissipation.`,
          steps: [
            r`$P_o = \frac{12^2}{16} = 9$ W; $P_{dc} = \frac{2 \times 15 \times 12}{\pi \times 8} = 14.3$ W.`,
            r`$\eta = \frac{9}{14.3} = 62.8\%$.`,
            r`Worst: $\frac{2 \times 15^2}{\pi^2 \times 8} = 5.70$ W, shared by the two transistors.`,
          ],
          answer: r`9 W; 14.3 W; 62.8%; 5.70 W.`,
        },
        {
          level: 'board',
          title: 'Sizing the heat sink',
          problem: r`The class B pair of the basic example dissipates 5.70 W at worst, in an ambient of 25 °C. With $\theta_{JC} = 1.5$ °C/W and $\theta_{CS} = 0.5$ °C/W, what heat-sink rating keeps the junction at or below 150 °C? (Treat the pair as one device on one sink.)`,
          steps: [
            r`$150 = 25 + 5.7(1.5 + 0.5 + \theta_{SA})$.`,
            r`$\theta_{SA} = \frac{125}{5.7} - 2 = 19.9$ °C/W.`,
          ],
          answer: r`At most 19.9 °C/W.`,
        },
      ],
      traps: [
        r`Class B transistors run hottest at about 64% of full swing, not at full output.`,
        r`Class C is for tuned (RF) loads; its output current is pulses, not a copy of the input.`,
      ],
      check: [
        { q: r`A transistor conducts for 170° of each cycle. Which class is it?`, a: r`Class C (less than 180°).` },
        { q: r`What is the most efficient a class B stage can be?`, a: r`$\frac{\pi}{4} = 78.5\%$.` },
      ],
    },
  ],
};
