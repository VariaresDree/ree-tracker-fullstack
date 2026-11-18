// Library › Lessons › EE › Electronics 1 and 2 (2026-11-18): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by computation. Ideal op-amp rules and the summing
// and difference amplifiers are in Electric Circuits 1; thyristors and power
// converters in Industrial Electronics.
const r = String.raw;

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
      keyIdeas: [
        r`Intrinsic silicon: $n = p = n_i \approx 10^{10}$ cm⁻³ at 300 K. Mass action: $np = n_i^2$.`,
        r`Donors (P, As) make n-type, acceptors (B, Ga) p-type. Conductivity $\sigma = q(n\mu_n + p\mu_p)$.`,
        r`Built-in potential $V_0 = V_T\ln\frac{N_AN_D}{n_i^2}$; forward bias narrows the depletion layer, reverse bias widens it.`,
        r`$V_T = \frac{kT}{q} \approx 25.9$ mV at 300 K.`,
      ],
      example: {
        problem: r`A silicon junction has $N_A = N_D = 10^{16}$ cm⁻³ and $n_i = 10^{10}$ cm⁻³. Find the minority holes on the n side and the built-in potential at 300 K.`,
        solution: r`$p = \frac{(10^{10})^2}{10^{16}} = 10^4$ cm⁻³. $V_0 = 0.02585 \times \ln 10^{12} = 0.714$ V.`,
      },
      traps: [r`More doping means FEWER minority carriers, not more.`],
    },
    {
      name: 'Diodes',
      inShort: r`Current flows when forward biased past about 0.7 V (silicon), and almost none in reverse.`,
      keyIdeas: [
        r`Shockley: $I_D = I_S(e^{V_D/nV_T} - 1)$. Ten times the current needs only about 60 mV more.`,
        r`Models: ideal (a switch), constant drop (0.7 V Si, 0.3 V Ge), and drop plus resistance.`,
        r`Small-signal resistance $r_d = \frac{nV_T}{I_D}$; the forward voltage falls about 2 mV/°C.`,
      ],
      example: {
        problem: r`A silicon diode in series with 1 kΩ is driven from 5 V. Find the current and the diode's dynamic resistance.`,
        solution: r`$I = \frac{5 - 0.7}{1000} = 4.3$ mA. $r_d = \frac{26\ \text{mV}}{4.3\ \text{mA}} = 6.0$ Ω.`,
      },
      traps: [r`Assume a state, solve, then check it: a "conducting" diode with negative current is really off.`],
    },
    {
      name: 'Rectifiers and Filters',
      inShort: r`Diodes turn ac into pulsating dc; a capacitor smooths it.`,
      keyIdeas: [
        r`$V_{dc} = \frac{V_m}{\pi}$ half-wave, $\frac{2V_m}{\pi}$ full-wave; the bridge loses two diode drops.`,
        r`PIV: half-wave $V_m$ (2$V_m$ with a filter capacitor), center-tap $2V_m$, bridge $V_m$.`,
        r`Ripple factor unfiltered: 1.21 half-wave, 0.483 full-wave. Efficiency: 40.5% and 81.1%.`,
        r`Capacitor filter: $V_{r(pp)} \approx \frac{I_{dc}}{f_rC}$, $V_{dc} \approx V_m - \frac{V_{r(pp)}}{2}$; $f_r$ is 120 Hz for full-wave on 60 Hz.`,
      ],
      example: {
        problem: r`A bridge rectifier runs from a 12 V RMS, 60 Hz secondary into a 2200 µF filter and a 0.5 A load. Find the peak output, the ripple, and the dc output.`,
        solution: r`$V_m = 12\sqrt2 - 1.4 = 15.57$ V. $V_r = \frac{0.5}{120 \times 2200 \times 10^{-6}} = 1.89$ V p-p. $V_{dc} \approx 15.57 - 0.95 = 14.6$ V.`,
      },
      traps: [r`Full-wave ripple is at TWICE the line frequency; using 60 Hz doubles the computed ripple.`],
    },
    {
      name: 'Zener Regulators',
      inShort: r`A reverse-biased Zener holds its voltage while a series resistor absorbs the difference.`,
      keyIdeas: [
        r`$I_Z = \frac{V_{in} - V_Z}{R_S} - I_L$; it must stay above $I_{Z(\min)}$ at the lowest input and heaviest load.`,
        r`Worst Zener dissipation: highest input with no load, $P_Z = V_Z\frac{V_{in(\max)} - V_Z}{R_S}$.`,
        r`Load regulation $\frac{V_{NL} - V_{FL}}{V_{FL}} \times 100$; line regulation $\frac{\Delta V_o}{\Delta V_{in}}$.`,
      ],
      example: {
        problem: r`A 9.1 V Zener with $R_S = 200$ Ω runs from 15 V and supplies 20 mA. Find the Zener current, and its power if the load is removed and the input rises to 18 V.`,
        solution: r`$I_Z = \frac{15 - 9.1}{200} - 0.020 = 9.5$ mA. No load at 18 V: $9.1 \times \frac{18 - 9.1}{200} = 0.405$ W.`,
      },
      traps: [r`The Zener's worst case is NO load, not full load.`],
    },
    {
      name: 'BJT Biasing',
      inShort: r`Setting the dc Q-point so the transistor amplifies in its active region.`,
      keyIdeas: [
        r`$I_E = I_B + I_C$, $I_C = \beta I_B$, $\alpha = \frac{\beta}{\beta + 1}$; active region: base-emitter on (0.7 V), base-collector reverse biased.`,
        r`Base bias with $R_E$: $I_B = \frac{V_{CC} - V_{BE}}{R_B + (\beta + 1)R_E}$.`,
        r`Voltage divider: $V_{TH} = V_{CC}\frac{R_2}{R_1 + R_2}$, $I_E = \frac{V_{TH} - V_{BE}}{R_E + R_{TH}/(\beta + 1)}$; nearly independent of $\beta$.`,
        r`Load line: $V_{CE} = V_{CC} - I_C(R_C + R_E)$, from $I_{C(sat)}$ to $V_{CE(off)} = V_{CC}$.`,
      ],
      example: {
        problem: r`$V_{CC} = 15$ V, $R_1 = 39$ kΩ, $R_2 = 8.2$ kΩ, $R_C = 3.3$ kΩ, $R_E = 1$ kΩ, $\beta = 120$. Find $I_E$ and $V_{CE}$.`,
        solution: r`$V_{TH} = 15 \times \frac{8.2}{47.2} = 2.61$ V, $R_{TH} = 6.78$ kΩ. $I_E = \frac{2.61 - 0.7}{1000 + 6780/121} = 1.80$ mA. $V_{CE} = 15 - 1.80 \times 4.3 = 7.24$ V.`,
      },
      traps: [r`Fixed bias alone ($R_E = 0$) makes $I_C$ proportional to $\beta$, which varies widely between transistors.`],
    },
    {
      name: 'BJT Amplifiers',
      inShort: r`Small ac signals ride on the Q-point; the gain comes from $g_m = \frac{I_C}{V_T}$.`,
      keyIdeas: [
        r`$r_e = \frac{V_T}{I_E}$, $g_m = \frac{I_C}{V_T}$, $r_\pi = (\beta + 1)r_e$.`,
        r`Common emitter: $A_v = -\frac{R_C \| R_L}{r_e + R_E}$ (unbypassed $R_E$), inverting, medium $R_{in}$.`,
        r`Common collector: $A_v \approx 1$, high $R_{in}$, low $R_o$ (a buffer). Common base: high gain in phase, $R_{in} \approx r_e$.`,
        r`Capacitors are shorts and dc supplies are ground in the ac circuit.`,
      ],
      example: {
        problem: r`The stage above ($I_E = 1.80$ mA, $R_C = 3.3$ kΩ) drives 10 kΩ. Find the gain with $R_E$ fully bypassed and with 220 Ω left unbypassed.`,
        solution: r`$r_e = \frac{26}{1.80} = 14.4$ Ω; $R_C \| R_L = 2.48$ kΩ. Bypassed: $-\frac{2481}{14.4} = -172$. With 220 Ω: $-\frac{2481}{234} = -10.6$, but now stable.`,
      },
      traps: [r`$r_e$ uses the DC emitter current from the bias, not the signal current.`],
    },
    {
      name: 'FETs and MOSFETs',
      inShort: r`Voltage-controlled devices: the gate draws no current, the gate voltage sets the drain current.`,
      keyIdeas: [
        r`JFET (Shockley): $I_D = I_{DSS}\left(1 - \frac{V_{GS}}{V_P}\right)^2$; depletion only.`,
        r`Enhancement MOSFET: $I_D = k(V_{GS} - V_{th})^2$ in saturation ($V_{DS} \ge V_{GS} - V_{th}$).`,
        r`$g_m = \frac{2I_{DSS}}{|V_P|}\left(1 - \frac{V_{GS}}{V_P}\right)$ or $2\sqrt{kI_D}$; common source $A_v = -g_m(R_D \| R_L)$.`,
        r`Self bias: $V_{GS} = -I_DR_S$, solved with Shockley.`,
      ],
      example: {
        problem: r`A JFET with $I_{DSS} = 10$ mA and $V_P = -4$ V is self-biased with $R_S = 500$ Ω. Find $V_{GS}$, $I_D$ and $g_m$.`,
        solution: r`$V_{GS} = -5\left(1 + \frac{V_{GS}}{4}\right)^2$ gives $0.3125V_{GS}^2 + 3.5V_{GS} + 5 = 0$: $V_{GS} = -1.68$ V (the other root is beyond $V_P$). $I_D = 3.36$ mA; $g_m = 5(1 - 0.42) = 2.90$ mS.`,
      },
      traps: [r`Discard the root beyond pinch-off: there the device is off, not conducting.`],
    },
    {
      name: 'Frequency Response',
      inShort: r`Coupling capacitors cut the lows; device and stray capacitances cut the highs.`,
      keyIdeas: [
        r`Each capacitor gives a corner $f = \frac{1}{2\pi R_{eq}C}$; the bypass capacitor usually dominates $f_L$.`,
        r`Miller: a capacitance across an inverting gain looks $C(1 + |A_v|)$ at the input, setting $f_H$.`,
        r`Decibels: $20\log|A_v|$; the cutoffs are the −3 dB points. Gain × bandwidth is constant for one pole.`,
      ],
      example: {
        problem: r`A 1 kΩ source drives an amplifier of 9 kΩ input resistance through 1 µF. Find $f_L$. Then: what is the Miller input capacitance of 2 pF across a gain of −99?`,
        solution: r`$f_L = \frac{1}{2\pi \times 10^4 \times 10^{-6}} = 15.9$ Hz. Miller: $2 \times (1 + 99) = 200$ pF.`,
      },
      traps: [r`$-3$ dB is half POWER, 0.707 of the voltage.`],
    },
    {
      name: 'Multistage and Feedback Amplifiers',
      inShort: r`Cascading multiplies gain; negative feedback trades gain for stability and bandwidth.`,
      keyIdeas: [
        r`Overall gain = product of LOADED stage gains (dB add). $n$ identical stages: $f_H^* = f_H\sqrt{2^{1/n} - 1}$.`,
        r`Feedback: $A_f = \frac{A}{1 + A\beta} \approx \frac{1}{\beta}$; bandwidth and (series input) resistance grow by $1 + A\beta$.`,
        r`Darlington: $\beta_D \approx \beta_1\beta_2$, $V_{BE} \approx 1.4$ V.`,
      ],
      example: {
        problem: r`Two identical stages each have $f_H = 100$ kHz. Find the overall $f_H$. Then: an amplifier with $A = 10^4$ gets $\beta = 0.01$; find $A_f$.`,
        solution: r`$f_H^* = 100\sqrt{\sqrt2 - 1} = 64.4$ kHz. $A_f = \frac{10^4}{1 + 100} = 99.0$, close to $\frac{1}{\beta} = 100$.`,
      },
      traps: [r`Multiplying unloaded gains overstates the total: each stage loads the one before.`],
    },
    {
      name: 'Operational Amplifiers',
      inShort: r`Very high gain amplifiers used with feedback, so the circuit's resistors set the gain.`,
      keyIdeas: [
        r`Inverting $-\frac{R_f}{R_i}$; non-inverting $1 + \frac{R_f}{R_i}$; follower 1.`,
        r`Integrator $-\frac{1}{RC}\int v_i\,dt$, differentiator $-RC\frac{dv_i}{dt}$.`,
        r`Limits: slew rate ($f_{\max} = \frac{SR}{2\pi V_p}$), gain-bandwidth ($f = \frac{f_T}{\text{noise gain}}$), CMRR $= \frac{A_d}{A_{cm}}$.`,
        r`Schmitt trigger: positive feedback gives thresholds $\pm\beta V_{sat}$ and hysteresis.`,
      ],
      example: {
        problem: r`An op-amp has a slew rate of 0.5 V/µs and $f_T = 1$ MHz. Find the highest frequency for a 10 V peak output, and the bandwidth at a gain of 100.`,
        solution: r`$f_{\max} = \frac{0.5 \times 10^6}{2\pi \times 10} = 7.96$ kHz. Bandwidth $= \frac{10^6}{100} = 10$ kHz.`,
      },
      traps: [r`For an inverting amplifier use the noise gain $1 + \frac{R_f}{R_i}$, not $\frac{R_f}{R_i}$, with GBW.`],
    },
    {
      name: 'Oscillators',
      inShort: r`Positive feedback with a loop gain of 1 at 0° makes a circuit generate its own sine wave.`,
      keyIdeas: [
        r`Barkhausen: $|A\beta| = 1$ and phase 0° (slightly above 1 to start).`,
        r`RC phase shift: $f = \frac{1}{2\pi RC\sqrt6}$, gain ≥ 29. Wien bridge: $f = \frac{1}{2\pi RC}$, gain 3.`,
        r`LC: Colpitts ($C$ in series) and Hartley ($L_1 + L_2 + 2M$), $f = \frac{1}{2\pi\sqrt{LC}}$; crystals for stable frequency.`,
      ],
      example: {
        problem: r`With $R = 10$ kΩ and $C = 10$ nF, find the frequency of a Wien-bridge and of an RC phase-shift oscillator, and the Wien amplifier's $R_f$ if $R_1 = 10$ kΩ.`,
        solution: r`Wien: $\frac{1}{2\pi \times 10^4 \times 10^{-8}} = 1.59$ kHz, $R_f = 20$ kΩ. Phase shift: $\frac{1591}{\sqrt6} = 650$ Hz.`,
      },
      traps: [r`The phase-shift network passes only 1/29 of the signal: the amplifier gain needed is 29, not 1.`],
    },
    {
      name: 'Power Amplifiers',
      inShort: r`Output stages that deliver watts: the trade is efficiency against distortion.`,
      keyIdeas: [
        r`Class A: always on, max 25% (resistive) or 50% (transformer-coupled).`,
        r`Class B push-pull: $\eta = \frac{\pi}{4}\frac{V_p}{V_{CC}}$, max 78.5%; class AB removes crossover distortion.`,
        r`Worst class B dissipation $\frac{2V_{CC}^2}{\pi^2R_L}$ at $V_p = \frac{2V_{CC}}{\pi}$.`,
        r`Heat: $T_J = T_A + P_D(\theta_{JC} + \theta_{CS} + \theta_{SA})$.`,
      ],
      example: {
        problem: r`A class B stage on ±15 V drives 8 Ω at 12 V peak. Find the output power, supply power, efficiency, and the worst-case transistor dissipation.`,
        solution: r`$P_o = \frac{12^2}{16} = 9$ W. $P_{dc} = \frac{2 \times 15 \times 12}{\pi \times 8} = 14.3$ W. $\eta = 62.8\%$. Worst: $\frac{2 \times 15^2}{\pi^2 \times 8} = 5.70$ W.`,
      },
      traps: [r`Class B transistors run hottest at about 64% of full swing, not at full output.`],
    },
  ],
};
