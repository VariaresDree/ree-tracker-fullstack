// Library › Lessons › EE › Fundamentals of Electronic Communications
// (2026-11-19; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// communicationsLesson.test.js. Problem styles cross-checked against the
// communications items of a review center's electronics handout; the text,
// problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order. Sampling, aliasing and
// quantization SNR are also in Instrumentation & Control; the reflection
// coefficient in Transients; Snell's law, critical angle and Kepler's law in
// ESAS Physics; Hamming codes in ESAS Microprocessors.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Bessel function of the first kind, by its power series (fine for x ≤ 12).
function besselJ(n, x) {
  let term = (x / 2) ** n;
  for (let i = 2; i <= n; i++) term /= i;
  let sum = term;
  for (let k = 1; k < 60; k++) {
    term *= -((x / 2) ** 2) / (k * (k + n));
    sum += term;
  }
  return sum;
}

// A fibre link (0 dBm, 40 km, 0.35 dB/km, a 0.5 dB connector at each end and
// ten 0.1 dB splices at 2, 6, … 38 km), in dBm against km.
const fibre = (x) => -0.5 - 0.35 * x - 0.1 * (x < 2 ? 0 : Math.min(10, Math.floor((x - 2) / 4) + 1)) - (x >= 40 ? 0.5 : 0);

export default {
  topic: 'Fundamentals of Electronic Communications',
  subject: 'EE',
  overview: r`A communication system moves information from a transmitter through a channel to a receiver, fighting noise and limited bandwidth on the way. This topic covers how signals are measured (decibels, spectra, noise), how they are put onto carriers (AM, SSB, FM, PCM and digital modulation), how many share one channel (multiplexing), and the media that carry them (transmission lines, antennas and radio propagation, fiber, satellite and cellular links), plus the basics of data links. Most board problems are short: a power or bandwidth, a noise figure, a modulation index, a VSWR, a path loss or a link budget, nearly always worked in decibels.`,
  sources: [
    'Electronic Communications Systems (Kennedy and Davis)',
    'Electronic Communications Systems: Fundamentals Through Advanced (Tomasi)',
    'Principles of Electronic Communication Systems (Frenzel)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Signals, Spectrum and Decibels',
      inShort: r`Signals are described by their spectrum, and powers by decibels so that gains and losses just add.`,
      body: [
        r`Every signal is a sum of sine waves; its **spectrum** shows how much of each frequency it holds. A train of rectangular pulses of width τ repeating every T has spectral lines every $\frac{1}{T}$ under a $\frac{\sin x}{x}$ envelope whose nulls fall every $\frac{1}{\tau}$: the shorter the pulse, the wider the band it needs.`,
        {
          type: 'plot',
          alt: 'The sine x over x envelope of the spectrum of 1 ms pulses: largest at zero frequency, falling to its first null at 1 kHz, with smaller lobes between nulls at 2 and 3 kHz.',
          caption: 'The spectrum envelope of 1 ms pulses: nulls every 1 kHz; most of the power lies below the first.',
          x: [0, 4],
          y: [0, 1.1],
          xLabel: 'f (kHz)',
          yLabel: 'relative amplitude',
          series: [{ f: (f) => (f === 0 ? 1 : Math.abs(Math.sin(Math.PI * f) / (Math.PI * f))), label: 'envelope', area: true }],
          marks: [{ x: 1, label: '1/τ' }],
        },
        r`Powers span huge ranges, so they are measured in **decibels**: a power ratio is $10\log\frac{P_2}{P_1}$ dB, a voltage ratio (across equal resistances) $20\log\frac{V_2}{V_1}$. Absolute powers are given against 1 mW (**dBm**) or 1 W (**dBW**). Through a chain, gains and losses in dB simply add. Doubling power is +3 dB; ten times is +10 dB.`,
      ],
      keyIdeas: [
        r`$\text{dB} = 10\log\frac{P_2}{P_1} = 20\log\frac{V_2}{V_1}$; $P_{dBm} = 10\log\frac{P}{1\ \text{mW}}$; $\text{dBW} = \text{dBm} - 30$.`,
        r`Through a chain, $P_{out}(\text{dBm}) = P_{in} + \sum G - \sum L$.`,
        r`A pulse train has lines every $\frac1T$ under a sinc envelope with nulls every $\frac1\tau$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Through a chain',
          problem: r`A 50 mW signal passes a cable with 3 dB loss, then a 20 dB amplifier. Find the output in dBm and in watts.`,
          steps: [
            r`$10\log 50 = 17.0$ dBm.`,
            r`$17.0 - 3 + 20 = 34.0$ dBm $= 10^{3.4}$ mW $= 2.5$ W.`,
          ],
          answer: r`34.0 dBm; 2.5 W.`,
        },
        {
          level: 'board',
          title: 'Decibel quickies',
          problem: r`An amplifier's output voltage is 60 times its input: find its gain in dB. Express 50 W in dBm. An attenuator gives −3 dB of power with 10 V in (equal resistances): find the output voltage.`,
          steps: [
            r`$20\log60 = 35.56$ dB.`,
            r`$10\log\frac{50}{0.001} = 47.0$ dBm.`,
            r`$V = 10 \times 10^{-3/20} = 7.08$ V.`,
          ],
          answer: r`35.56 dB; 47.0 dBm; 7.08 V.`,
        },
      ],
      traps: [
        r`Add dB to dBm, never dBm to dBm: two 0 dBm signals combine to 3 dBm, not 0.`,
        r`Use $20\log$ for voltage or current, $10\log$ for power.`,
      ],
      check: [
        { q: r`A 100 W signal comes out of a device as 1 mW. What is its loss?`, a: r`$10\log\frac{100}{0.001} = 50$ dB.` },
        { q: r`Three stages have gains of 10, 5 and 12 dB. What is the total?`, a: r`27 dB.` },
      ],
    },
    {
      name: 'Noise',
      inShort: r`Random signals that set the weakest signal a receiver can use.`,
      body: [
        r`**Noise** is any unwanted signal. External noise comes from the atmosphere, space and man-made sources; internal noise from the receiver's own parts. The most basic is **thermal (Johnson) noise**, from the random motion of electrons in any resistance: its power $P_n = kTB$ depends only on temperature and bandwidth, $-174$ dBm per hertz at 290 K. Others are **shot noise** (current crossing a junction) and **flicker** noise (at low frequencies).`,
        r`A receiver's **noise floor** rises 10 dB for every tenfold increase in bandwidth:`,
        {
          type: 'plot',
          alt: 'The noise floor of a receiver with a 2.24 dB noise figure against bandwidth on a log scale: rising 10 dB per decade, from minus 142 dBm at 1 kHz to minus 102 dBm at 10 MHz; minus 111.8 dBm at 1 MHz.',
          caption: 'Noise floor with a 2.24 dB noise figure: −111.8 dBm in 1 MHz, rising 10 dB per decade of bandwidth.',
          x: [1, 10000],
          logX: true,
          y: [-150, -95],
          xLabel: 'B (kHz)',
          yLabel: 'dBm',
          series: [{ f: (b) => -174 + 10 * Math.log10(b * 1000) + 2.24, label: 'floor' }],
          marks: [{ x: 1000, label: '1 MHz' }],
        },
        r`How much a stage worsens the signal-to-noise ratio is its **noise factor** $F = \frac{SNR_{in}}{SNR_{out}}$ (in dB, the **noise figure**), or its **equivalent noise temperature** $T_e = (F - 1)290$ K. In a chain the first stage matters most (**Friis**): $F = F_1 + \frac{F_2 - 1}{G_1} + \cdots$, so receivers put a low-noise amplifier first.`,
      ],
      keyIdeas: [
        r`Thermal noise $P_n = kTB$ ($-174$ dBm/Hz at 290 K); $V_n = \sqrt{4kTRB}$.`,
        r`$F = \frac{SNR_{in}}{SNR_{out}}$, $NF = 10\log F$, $T_e = (F - 1)290$ K.`,
        r`Friis: $F = F_1 + \frac{F_2 - 1}{G_1} + \cdots$; the first stage dominates.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A two-stage receiver',
          problem: r`A receiver has an LNA (NF 2 dB, gain 20 dB) before a mixer (NF 10 dB). Find the overall noise figure, the noise temperature, and the noise floor in 1 MHz.`,
          steps: [
            r`Ratios: $F_1 = 1.585$, $G_1 = 100$, $F_2 = 10$. $F = 1.585 + \frac{10 - 1}{100} = 1.675$: NF $= 2.24$ dB.`,
            r`$T_e = 0.675 \times 290 = 196$ K.`,
            r`Floor $= -174 + 60 + 2.24 = -111.8$ dBm.`,
          ],
          answer: r`2.24 dB; 196 K; −111.8 dBm.`,
        },
        {
          level: 'board',
          title: 'Noise voltage and temperature',
          problem: r`Find the rms thermal noise voltage of a 10 kΩ resistor at 290 K over 20 kHz. What is the noise temperature of an amplifier with a 3 dB noise figure?`,
          steps: [
            r`$V_n = \sqrt{4 \times 1.38 \times 10^{-23} \times 290 \times 10^4 \times 2 \times 10^4} = 1.79$ µV.`,
            r`$F = 10^{0.3} = 1.995$: $T_e = 0.995 \times 290 = 289$ K.`,
          ],
          answer: r`1.79 µV; 289 K.`,
        },
      ],
      traps: [
        r`Use plain ratios in Friis' formula, never dB.`,
        r`Halving the bandwidth lowers the noise floor by 3 dB, not by half the dB.`,
      ],
      check: [
        { q: r`What two things set thermal noise power?`, a: r`Temperature and bandwidth ($kTB$).` },
        { q: r`Why does a receiver put its low-noise amplifier first?`, a: r`The first stage's noise dominates; its gain shrinks the later stages' contributions.` },
      ],
    },
    {
      name: 'Amplitude Modulation',
      inShort: r`The message varies the carrier's amplitude; two sidebands carry it.`,
      body: [
        r`In **amplitude modulation** the carrier's amplitude follows the message. The envelope swings between $V_{max}$ and $V_{min}$, and the **modulation index** is $m = \frac{V_{max} - V_{min}}{V_{max} + V_{min}}$; above 1 the envelope folds over and distorts (**overmodulation**):`,
        {
          type: 'plot',
          alt: 'An AM wave with modulation index 0.8 over 2 ms: a 10 kHz carrier whose amplitude follows a 1 kHz envelope, dashed, swinging between 1.8 and 0.2.',
          caption: 'AM at m = 0.8: the carrier’s envelope (dashed) swings between 1.8 and 0.2.',
          x: [0, 2],
          y: [-2, 2],
          xLabel: 't (ms)',
          yLabel: 'v',
          series: [
            { f: (t) => (1 + 0.8 * Math.cos(2 * Math.PI * t)) * Math.cos(2 * Math.PI * 10 * t), label: 'AM' },
            { f: (t) => 1 + 0.8 * Math.cos(2 * Math.PI * t), label: 'envelope', dashed: true, colour: colourOf(1) },
            { f: (t) => -(1 + 0.8 * Math.cos(2 * Math.PI * t)), label: 'envelope', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`The spectrum is the carrier plus an upper and a lower **sideband**, each $\frac{m}{2}$ of the carrier's amplitude, so the bandwidth is twice the highest audio frequency. The carrier power does not change; the sidebands add $\frac{m^2}{2}$ of it, so $P_t = P_c\left(1 + \frac{m^2}{2}\right)$ and the antenna current rises as the square root.`,
      ],
      keyIdeas: [
        r`$m = \frac{V_{max} - V_{min}}{V_{max} + V_{min}}$; keep $m \le 1$.`,
        r`$P_t = P_c\left(1 + \frac{m^2}{2}\right)$, $I_t = I_c\sqrt{1 + \frac{m^2}{2}}$.`,
        r`Bandwidth $2f_m$; multitone $m_t = \sqrt{m_1^2 + m_2^2 + \cdots}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Powers, bandwidth and current',
          problem: r`A 10 kW carrier is modulated to m = 0.8 by audio up to 5 kHz. Find the total power, each sideband's power, the efficiency, the bandwidth, and the antenna current if it was 10 A unmodulated.`,
          steps: [
            r`$P_t = 10(1 + 0.32) = 13.2$ kW; each sideband $\frac{10 \times 0.64}{4} = 1.6$ kW.`,
            r`$\eta = \frac{0.32}{1.32} = 24.2\%$; $B = 2 \times 5 = 10$ kHz.`,
            r`$I = 10\sqrt{1.32} = 11.5$ A.`,
          ],
          answer: r`13.2 kW; 1.6 kW each; 24.2%; 10 kHz; 11.5 A.`,
        },
        {
          level: 'board',
          title: 'The index from current',
          problem: r`An AM transmitter's antenna current rises from 8 A unmodulated to 8.93 A when modulated. Find m.`,
          steps: [
            r`$\left(\frac{8.93}{8}\right)^2 = 1.246 = 1 + \frac{m^2}{2}$.`,
            r`$m = \sqrt{2 \times 0.246} = 0.70$.`,
          ],
          answer: r`0.70.`,
        },
      ],
      traps: [
        r`The carrier power does not change with modulation: only the sidebands add power.`,
        r`Even at m = 1, two-thirds of the power is in the carrier, which carries no information.`,
      ],
      check: [
        { q: r`An envelope swings between 18 V and 2 V. What is m?`, a: r`$\frac{16}{20} = 0.8$.` },
        { q: r`What happens when m exceeds 1?`, a: r`Overmodulation: the envelope distorts and spurious sidebands spread.` },
      ],
    },
    {
      name: 'Single Sideband',
      inShort: r`Send one sideband only, without the carrier: less power, half the bandwidth.`,
      body: [
        r`Since both AM sidebands carry the same information and the carrier none, a transmitter can suppress the carrier (**DSB-SC**) or the carrier and one sideband (**SSB**). The power needed falls sharply:`,
        {
          type: 'plot',
          alt: 'Power relative to the carrier against the modulation index: full AM rising from 1 to 1.5, double sideband suppressed carrier from 0 to 0.5, and single sideband from 0 to 0.25.',
          caption: 'Power needed against m: full AM (top), DSB-SC (middle), SSB (bottom, dashed); at m = 1 SSB needs a sixth of AM’s.',
          x: [0, 1],
          y: [0, 1.7],
          xLabel: 'm',
          yLabel: 'P / P_c',
          series: [
            { f: (m) => 1 + (m * m) / 2, label: 'AM' },
            { f: (m) => (m * m) / 2, label: 'DSB-SC', colour: colourOf(1) },
            { f: (m) => (m * m) / 4, label: 'SSB', dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`SSB also halves the bandwidth. It is generated by filtering out the unwanted sideband, or by the phasing or Weaver methods; the receiver must reinsert a carrier exactly to demodulate it. SSB transmitters are rated by **peak envelope power** $\text{PEP} = \frac{V_p^2}{2R}$.`,
      ],
      keyIdeas: [
        r`$P_{SSB} = \frac{P_cm^2}{4}$; at m = 1 SSB saves 83.3%, DSB-SC 66.7%.`,
        r`SSB transmitters are rated in PEP $= \frac{V_p^2}{2R}$.`,
        r`Generated by the filter, phasing or Weaver method; the receiver must reinsert the carrier.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The saving',
          problem: r`The 10 kW, m = 0.8 AM signal of the last subtopic is replaced by SSB. Find the SSB power and the saving.`,
          steps: [
            r`$P_{SSB} = \frac{10 \times 0.64}{4} = 1.6$ kW.`,
            r`Against 13.2 kW: a saving of $1 - \frac{1.6}{13.2} = 87.9\%$.`,
          ],
          answer: r`1.6 kW; 87.9%.`,
        },
        {
          level: 'board',
          title: 'Peak envelope power',
          problem: r`An SSB transmitter's envelope peaks at 100 V across 50 Ω. Find its PEP, and the average power in a two-tone test. What do SSB and DSB-SC save at m = 1?`,
          steps: [
            r`PEP $= \frac{100^2}{2 \times 50} = 100$ W; two-tone average $= 50$ W.`,
            r`At m = 1, AM needs $1.5P_c$: SSB $\frac{1.5 - 0.25}{1.5} = 83.3\%$; DSB-SC $\frac{1.5 - 0.5}{1.5} = 66.7\%$.`,
          ],
          answer: r`100 W; 50 W; 83.3% and 66.7%.`,
        },
      ],
      traps: [
        r`A two-tone test gives a PEP twice the average power.`,
        r`Without a carrier, an ordinary envelope detector cannot recover SSB.`,
      ],
      check: [
        { q: r`What bandwidth does SSB need for 3 kHz audio?`, a: r`3 kHz (half of AM's 6 kHz).` },
        { q: r`What must an SSB receiver supply?`, a: r`A reinserted carrier (beat-frequency oscillator).` },
      ],
    },
    {
      name: 'Frequency Modulation',
      inShort: r`The message varies the carrier's frequency; amplitude stays constant.`,
      body: [
        r`In **frequency modulation** the carrier's frequency swings by a **deviation** Δf proportional to the message's amplitude, at the message's rate. The **modulation index** is $\beta = \frac{\Delta f}{f_m}$. The spectrum has sidebands at every $f_c \pm nf_m$, with amplitudes given by Bessel functions $J_n(\beta)$; the total power stays the same, only shared out differently:`,
        {
          type: 'plot',
          alt: 'The Bessel functions J0, J1 and J2 against the modulation index from 0 to 10: J0 starts at 1 and first crosses zero at 2.405, where the carrier vanishes; J1 and J2 start at zero and rise to peaks of about 0.58 and 0.49.',
          caption: 'Carrier (J0) and first two sideband amplitudes (J1, J2) against β; the carrier vanishes at β = 2.405.',
          x: [0, 10],
          y: [-0.5, 1.6],
          xLabel: 'β',
          yLabel: 'J_n(β)',
          series: [
            { f: (b) => besselJ(0, b), label: 'J0' },
            { f: (b) => besselJ(1, b), label: 'J1', colour: colourOf(1) },
            { f: (b) => besselJ(2, b), label: 'J2', dashed: true, colour: colourOf(2) },
          ],
          marks: [{ x: 2.405, label: '2.405' }],
        },
        r`**Carson's rule** gives the bandwidth that holds about 98% of the power: $2(\Delta f + f_m)$. FM resists amplitude noise, but its noise rises with audio frequency, so the transmitter **pre-emphasises** high audio (75 µs, from 2122 Hz) and the receiver de-emphasises it.`,
      ],
      keyIdeas: [
        r`$\beta = \frac{\Delta f}{f_m}$; Carson's bandwidth $2(\Delta f + f_m)$.`,
        r`Sidebands at $f_c \pm nf_m$ with amplitudes $J_n(\beta)V_c$; total power is constant.`,
        r`Pre-emphasis of 75 µs boosts audio above 2122 Hz against FM's rising noise.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Broadcast FM and Bessel values',
          problem: r`Broadcast FM deviates 75 kHz with audio up to 15 kHz. Find β and the Carson bandwidth. At β = 2, find the carrier and first two sideband amplitudes as fractions of the unmodulated carrier.`,
          steps: [
            r`$\beta = \frac{75}{15} = 5$; $B = 2(75 + 15) = 180$ kHz.`,
            r`$J_0(2) = 0.224$, $J_1(2) = 0.577$, $J_2(2) = 0.353$.`,
          ],
          answer: r`5; 180 kHz; 0.224, 0.577, 0.353.`,
        },
        {
          level: 'board',
          title: 'From the deviation constant',
          problem: r`A modulator deviates 5 kHz per volt. A 2 V peak, 2.5 kHz tone is applied. Find Δf, β and the Carson bandwidth.`,
          steps: [
            r`$\Delta f = 5 \times 2 = 10$ kHz; $\beta = \frac{10}{2.5} = 4$.`,
            r`$B = 2(10 + 2.5) = 25$ kHz.`,
          ],
          answer: r`10 kHz; 4; 25 kHz.`,
        },
      ],
      traps: [
        r`The FM index changes with the modulating FREQUENCY, unlike AM's.`,
        r`An FM signal's power does not change with modulation.`,
      ],
      check: [
        { q: r`At what β does the FM carrier first vanish?`, a: r`2.405.` },
        { q: r`What does Carson's rule estimate?`, a: r`The bandwidth holding about 98% of the power: $2(\Delta f + f_m)$.` },
      ],
    },
    {
      name: 'Sampling and PCM',
      inShort: r`Sample the analog signal, quantize each sample, and send the bits.`,
      body: [
        r`**Pulse-code modulation** turns an analog signal into bits in three steps: **sample** it at least at twice its highest frequency (Nyquist), **quantize** each sample to one of $2^n$ levels, and **encode** the level as n bits. Quantizing rounds every sample to the nearest level, an error of up to half a step:`,
        {
          type: 'plot',
          alt: 'A 3-bit quantizer: the input rising steadily from 0 to 1, dashed, and the quantized output, a staircase of 8 levels each 0.125 high, never more than half a step from the input.',
          caption: 'A 3-bit quantizer: 8 levels; the output (solid) stays within half a step of the input (dashed).',
          x: [0, 1],
          y: [0, 1.05],
          xLabel: 'input',
          yLabel: 'output',
          series: [
            { f: (x) => (Math.min(7, Math.floor(x * 8)) + 0.5) / 8, label: 'quantized' },
            { f: (x) => x, label: 'input', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`That error is **quantization noise**, rms $\frac{\Delta}{\sqrt{12}}$; each extra bit gains 6 dB of SNR, about $6.02n + 1.76$ dB for a full-scale sine. **Companding** (µ-law in North America and Japan, A-law elsewhere) gives quiet signals finer steps.`,
      ],
      keyIdeas: [
        r`Sample at least $2f_{max}$; bit rate $R = nf_s$; levels $2^n$.`,
        r`Step $\Delta = \frac{V_{pp}}{2^n}$; error up to $\frac{\Delta}{2}$, rms $\frac{\Delta}{\sqrt{12}}$; SNR $\approx 6.02n + 1.76$ dB.`,
        r`Companding (µ-law, A-law) gives quiet signals finer steps.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Telephone PCM',
          problem: r`Voice (up to 4 kHz) is sampled at 8 kHz with 8 bits over ±1 V. Find the bit rate, the step size and the quantization SNR.`,
          steps: [
            r`$R = 8 \times 8000 = 64$ kbit/s.`,
            r`$\Delta = \frac{2}{256} = 7.81$ mV; SNR $= 6.02 \times 8 + 1.76 = 49.9$ dB.`,
          ],
          answer: r`64 kbit/s; 7.81 mV; 49.9 dB.`,
        },
        {
          level: 'board',
          title: 'Bits for an SNR, and CD audio',
          problem: r`How many bits give at least 40 dB of quantization SNR? CD audio is 16-bit stereo at 44.1 kHz: find its bit rate.`,
          steps: [
            r`$6.02n + 1.76 \ge 40$: $n \ge 6.35$, so 7 bits.`,
            r`$44\,100 \times 16 \times 2 = 1.411$ Mbit/s.`,
          ],
          answer: r`7 bits; 1.411 Mbit/s.`,
        },
      ],
      traps: [
        r`Sampling below $2f_{max}$ aliases: the error can't be removed after sampling.`,
        r`Round the number of bits UP.`,
      ],
      check: [
        { q: r`What sampling rate does 4 kHz voice need at least?`, a: r`8 kHz.` },
        { q: r`How much SNR does one more bit add?`, a: r`About 6 dB.` },
      ],
    },
    {
      name: 'Digital Modulation',
      inShort: r`Bits switch a carrier's amplitude, frequency or phase (ASK, FSK, PSK, QAM).`,
      body: [
        r`Digital modulation keys a carrier between a set of states: **ASK** (amplitude), **FSK** (frequency), **PSK** (phase), and **QAM** (amplitude and phase together). With M states each symbol carries $\log_2M$ bits, so $R_b = R_s\log_2M$: QPSK 2 bits, 16-QAM 4, 64-QAM 6. More states pack more bits into the same bandwidth but need more SNR to tell apart.`,
        r`Two limits frame it. **Nyquist**: a noiseless channel of bandwidth B carries at most $2B\log_2M$ bit/s. **Shannon**: with noise, no scheme can beat $C = B\log_2(1 + S/N)$, about 1 bit/s per hertz for every 3 dB of SNR at high SNR:`,
        {
          type: 'plot',
          alt: 'Shannon capacity per hertz of bandwidth against signal-to-noise ratio from 0 to 40 dB: 1 bit per second per hertz at 0 dB, rising almost linearly to 9.97 at 30 dB and 13.3 at 40 dB.',
          caption: 'Shannon’s limit: 9.97 bit/s per hertz at 30 dB, about one more for every 3 dB.',
          x: [0, 40],
          y: [0, 14],
          xLabel: 'SNR (dB)',
          yLabel: 'C / B (bit/s/Hz)',
          series: [{ f: (s) => Math.log2(1 + 10 ** (s / 10)), label: 'C/B', area: true }],
          marks: [{ x: 30, label: '30 dB' }],
        },
        r`A carrier modulated at $R_s$ symbols per second with raised-cosine filtering occupies $R_s(1 + \alpha)$. The bit error rate depends on $\frac{E_b}{N_0} = \frac{S}{N}\cdot\frac{B}{R_b}$.`,
      ],
      keyIdeas: [
        r`$R_b = R_s\log_2M$; Nyquist $2B\log_2M$; Shannon $B\log_2(1 + S/N)$.`,
        r`Raised-cosine bandwidth $R_s(1 + \alpha)$ on a carrier.`,
        r`BPSK $P_b = \tfrac12\text{erfc}\sqrt{E_b/N_0}$; $\frac{E_b}{N_0} = \frac{S}{N}\cdot\frac{B}{R_b}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A phone channel',
          problem: r`A 3.1 kHz phone channel has a 30 dB SNR. Find its Shannon capacity, the bit rate of 16-QAM at 2400 baud, and the noiseless Nyquist limit with 4 levels.`,
          steps: [
            r`$C = 3100\log_2 1001 = 30.9$ kbit/s.`,
            r`16-QAM: $2400 \times 4 = 9600$ bit/s. Nyquist: $2 \times 3100 \times 2 = 12.4$ kbit/s.`,
          ],
          answer: r`30.9 kbit/s; 9600 bit/s; 12.4 kbit/s.`,
        },
        {
          level: 'board',
          title: 'QPSK on a carrier',
          problem: r`QPSK runs at 10 Mbaud with roll-off α = 0.25. Find the bit rate and the bandwidth. If S/N is 10 dB in that bandwidth, find $E_b/N_0$ in dB.`,
          steps: [
            r`$R_b = 10 \times 2 = 20$ Mbit/s; $B = 10(1 + 0.25) = 12.5$ MHz.`,
            r`$\frac{E_b}{N_0} = 10 \times \frac{12.5}{20} = 6.25$: 7.96 dB.`,
          ],
          answer: r`20 Mbit/s; 12.5 MHz; 7.96 dB.`,
        },
      ],
      traps: [
        r`Shannon needs the SNR as a ratio: 30 dB is 1000.`,
        r`Baud is SYMBOLS per second; bit rate is baud × bits per symbol.`,
      ],
      check: [
        { q: r`How many bits does a 64-QAM symbol carry?`, a: r`6.` },
        { q: r`What does Shannon's theorem give?`, a: r`The highest error-free bit rate a noisy channel can carry, $B\log_2(1 + S/N)$.` },
      ],
    },
    {
      name: 'Multiplexing',
      inShort: r`Many signals share one channel by frequency (FDM), time (TDM) or wavelength (WDM).`,
      body: [
        r`**Frequency-division multiplexing** gives each signal its own band, with **guard bands** between them so filters can separate them:`,
        {
          type: 'plot',
          alt: 'Five 100 kHz channels side by side with 10 kHz guard bands between them, filling 540 kHz.',
          caption: 'FDM: five 100 kHz channels and four 10 kHz guard bands fill 540 kHz.',
          x: [0, 540],
          y: [0, 1.3],
          xLabel: 'f (kHz)',
          yLabel: 'channel',
          series: [{ f: (f) => (f % 110 < 100 && f < 540 ? 1 : 0), label: 'channels', area: true }],
        },
        r`**Time-division multiplexing** gives each signal its own time slot in a repeating frame. The North American **T1** carries 24 voice channels: $(24 \times 8 + 1) \times 8000 = 1.544$ Mbit/s, one framing bit per frame. The European **E1** has 32 slots of 64 kbit/s, 2.048 Mbit/s, of which 30 carry voice. **Wavelength-division multiplexing** sends many wavelengths down one fibre.`,
      ],
      keyIdeas: [
        r`FDM $B = NB_{ch} + (N - 1)B_g$.`,
        r`TDM: T1 $= (24 \times 8 + 1) \times 8000 = 1.544$ Mbit/s; E1 $= 32 \times 64$ kbit/s $= 2.048$ Mbit/s.`,
        r`WDM spacing $\Delta f = \frac{c\Delta\lambda}{\lambda^2}$: 0.8 nm ≈ 100 GHz at 1550 nm.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'FDM and E1',
          problem: r`Five 100 kHz channels share a link with 10 kHz guard bands. Find the bandwidth. How many voice channels does an E1 carry?`,
          steps: [
            r`$5 \times 100 + 4 \times 10 = 540$ kHz.`,
            r`E1 has 32 slots of 64 kbit/s; 30 carry voice, 2 carry framing and signalling.`,
          ],
          answer: r`540 kHz; 30.`,
        },
        {
          level: 'board',
          title: 'T1 and WDM spacing',
          problem: r`Find the T1 bit rate from its frame. What frequency spacing is 0.8 nm at 1550 nm?`,
          steps: [
            r`$(24 \times 8 + 1) \times 8000 = 1.544$ Mbit/s.`,
            r`$\Delta f = \frac{3 \times 10^8 \times 0.8 \times 10^{-9}}{(1550 \times 10^{-9})^2} = 99.9$ GHz.`,
          ],
          answer: r`1.544 Mbit/s; about 100 GHz.`,
        },
      ],
      traps: [
        r`T1 has one framing bit per frame, which is why it is 1.544 and not 1.536 Mbit/s.`,
        r`Guard bands sit BETWEEN channels: N channels need N − 1.`,
      ],
      check: [
        { q: r`Which multiplexing gives each signal its own time slot?`, a: r`TDM.` },
        { q: r`What multiplexing does a fibre use to carry many light colours?`, a: r`Wavelength-division multiplexing.` },
      ],
    },
    {
      name: 'Transmission Lines',
      inShort: r`Cables that guide RF energy; a mismatch at the load reflects part of it.`,
      body: [
        r`A **transmission line** (coax, twin lead, waveguide) has a **characteristic impedance** $Z_0$ set by its geometry and insulation, and signals travel along it at the **velocity factor** $\frac{1}{\sqrt{\varepsilon_r}}$ of light. A load equal to $Z_0$ absorbs everything. Any other load reflects part, $\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}$, and the forward and reflected waves add into a **standing wave**:`,
        {
          type: 'plot',
          alt: 'The voltage along a 75 ohm line feeding a 50 ohm load, over one wavelength back from the load: a minimum of 0.8 at the load and every half wavelength, a maximum of 1.2 a quarter wavelength away; the ratio 1.5 is the VSWR.',
          caption: 'Γ = −0.2: the voltage swings between 0.8 and 1.2 along the line, a VSWR of 1.5; a minimum sits at the load.',
          x: [0, 1],
          y: [0, 1.45],
          xLabel: 'distance from load (λ)',
          yLabel: 'V',
          series: [{ f: (z) => Math.sqrt(1 + 0.04 - 0.4 * Math.cos(4 * Math.PI * z)), label: 'V', area: true }],
          marks: [{ y: 1.2, label: 'max' }, { y: 0.8, label: 'min' }],
        },
        r`The ratio of maximum to minimum is the **VSWR**, $\frac{1 + \lvert\Gamma\rvert}{1 - \lvert\Gamma\rvert}$. A quarter-wave section of impedance $\sqrt{Z_0Z_L}$ matches two impedances at one frequency; at audio, a transformer matches them by its turns ratio, $\frac{N_1}{N_2} = \sqrt{\frac{Z_1}{Z_2}}$.`,
      ],
      keyIdeas: [
        r`Coax $Z_0 = \frac{138}{\sqrt{\varepsilon_r}}\log\frac{D}{d}$; velocity factor $\frac{1}{\sqrt{\varepsilon_r}}$.`,
        r`$\text{VSWR} = \frac{1 + \lvert\Gamma\rvert}{1 - \lvert\Gamma\rvert}$; return loss $-20\log\lvert\Gamma\rvert$.`,
        r`Quarter-wave transformer $Z_0' = \sqrt{Z_0Z_L}$; matching transformer $\frac{N_1}{N_2} = \sqrt{\frac{Z_1}{Z_2}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A mismatch',
          problem: r`A 75 Ω line feeds a 50 Ω load. Find Γ, VSWR, return loss and mismatch loss, and the quarter-wave section that would match it. What is the impedance of coax with $\varepsilon_r = 2.25$ and D/d = 3.5?`,
          steps: [
            r`$\Gamma = \frac{50 - 75}{125} = -0.2$; VSWR $= \frac{1.2}{0.8} = 1.5$.`,
            r`RL $= -20\log0.2 = 14.0$ dB; ML $= -10\log(1 - 0.04) = 0.18$ dB.`,
            r`$Z_0' = \sqrt{75 \times 50} = 61.2$ Ω. Coax: $\frac{138}{1.5}\log3.5 = 50.1$ Ω.`,
          ],
          answer: r`−0.2; 1.5; 14.0 dB; 0.18 dB; 61.2 Ω; 50.1 Ω.`,
        },
        {
          level: 'board',
          title: 'Matching by transformer and by length',
          problem: r`What turns ratio matches an 8 Ω speaker to a 200 Ω output? How long is a quarter-wave section at 100 MHz in coax of velocity factor 0.66?`,
          steps: [
            r`$\frac{N_1}{N_2} = \sqrt{\frac{8}{200}} = \frac{1}{5}$: 1 : 5.`,
            r`$\lambda = \frac{3 \times 10^8}{10^8} \times 0.66 = 1.98$ m; a quarter is 0.495 m.`,
          ],
          answer: r`1 : 5; 0.495 m.`,
        },
      ],
      traps: [
        r`Cut a quarter-wave section to the wavelength IN THE CABLE (times the velocity factor).`,
        r`Impedance goes as the turns ratio SQUARED.`,
      ],
      check: [
        { q: r`What VSWR does a matched line have?`, a: r`1.` },
        { q: r`A line is open at the end. What is Γ?`, a: r`+1: total reflection.` },
      ],
    },
    {
      name: 'Antennas',
      inShort: r`Antennas turn guided waves into radiated ones and back.`,
      body: [
        r`An antenna radiates the power fed to it into a **pattern**: stronger in some directions than others. Its **gain** is that concentration compared with an isotropic source (dBi) or a half-wave dipole (dBd), and its **beamwidth** is the angle between the half-power points. A **half-wave dipole** radiates most broadside, nothing off its ends, with a 78° beamwidth:`,
        {
          type: 'plot',
          alt: 'The relative field of a half-wave dipole against the angle from its axis, 0 to 180 degrees: zero along the axis, rising to a maximum of 1 broadside at 90 degrees, and crossing the half-power level 0.707 at 51 and 129 degrees.',
          caption: 'A half-wave dipole’s field against angle from its axis: broadside maximum, half power at 51° and 129° (78° beamwidth).',
          x: [0, 180],
          y: [0, 1.1],
          xLabel: 'θ (°)',
          yLabel: 'relative field',
          series: [{ f: (t) => { const s = Math.sin((t * Math.PI) / 180); return s < 1e-9 ? 0 : Math.cos((Math.PI / 2) * Math.cos((t * Math.PI) / 180)) / s; }, label: 'E', area: true }],
          marks: [{ y: Math.SQRT1_2, label: 'half power' }],
        },
        r`The dipole is $\frac{142.5}{f(\text{MHz})}$ m long (a little short of a free-space half wave), about 73 Ω, 2.15 dBi. A parabolic **dish** gains $\eta\left(\frac{\pi D}{\lambda}\right)^2$ with beamwidth about $\frac{70\lambda}{D}$ degrees. A short antenna has a small **radiation resistance**, so its losses eat its efficiency.`,
      ],
      keyIdeas: [
        r`Half-wave dipole: $\frac{142.5}{f(\text{MHz})}$ m, 73 Ω, 2.15 dBi.`,
        r`Short dipole $R_r = 80\pi^2\left(\frac{\ell}{\lambda}\right)^2$; efficiency $\frac{R_r}{R_r + R_{loss}}$.`,
        r`Dish $G = \eta\left(\frac{\pi D}{\lambda}\right)^2$, beamwidth $\frac{70\lambda}{D}$°; $A_e = \frac{G\lambda^2}{4\pi}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A dipole and a dish',
          problem: r`Cut a half-wave dipole for 100 MHz. Find the gain and beamwidth of a 3 m dish (55%) at 4 GHz.`,
          steps: [
            r`Dipole: $\frac{142.5}{100} = 1.43$ m.`,
            r`$\lambda = 0.075$ m: $G = 0.55(40\pi)^2 = 8685 = 39.4$ dBi; beamwidth $\frac{70 \times 0.075}{3} = 1.75°$.`,
          ],
          answer: r`1.43 m; 39.4 dBi; 1.75°.`,
        },
        {
          level: 'board',
          title: 'A short antenna',
          problem: r`A short dipole is a tenth of a wavelength long with 2 Ω of loss resistance. Find its radiation resistance and efficiency.`,
          steps: [
            r`$R_r = 80\pi^2(0.1)^2 = 7.90$ Ω.`,
            r`$\eta = \frac{7.90}{7.90 + 2} = 79.8\%$.`,
          ],
          answer: r`7.90 Ω; 79.8%.`,
        },
      ],
      traps: [
        r`dBi is against isotropic, dBd against a dipole: dBi = dBd + 2.15.`,
        r`A bigger dish or a higher frequency gives MORE gain and a NARROWER beam.`,
      ],
      check: [
        { q: r`In which direction does a half-wave dipole not radiate?`, a: r`Along its own axis (off its ends).` },
        { q: r`What is the input impedance of a half-wave dipole?`, a: r`About 73 Ω.` },
      ],
    },
    {
      name: 'Radio Wave Propagation',
      inShort: r`Ground waves, sky waves off the ionosphere, and space (line-of-sight) waves.`,
      body: [
        r`Radio waves travel at the speed of light, so their wavelength is $\lambda = \frac{c}{f}$ (or $\frac{v}{f}$ in a slower medium). How they travel depends on the band:`,
        r`| Band | Frequency | Main propagation, uses |
|---|---|---|
| VLF, LF | 3–300 kHz | ground wave: navigation, time signals |
| MF | 300 kHz–3 MHz | ground wave by day, sky wave at night: AM broadcast |
| HF (shortwave) | 3–30 MHz | sky wave off the ionosphere: long-distance radio |
| VHF | 30–300 MHz | line of sight: FM, TV channels 2–13 |
| UHF | 300 MHz–3 GHz | line of sight: TV 14 up, cellular, Wi-Fi |
| SHF, EHF | 3–300 GHz | line of sight: satellite, microwave links, radar |`,
        r`In free space the received power falls with the square of distance, the **free-space path loss** $32.45 + 20\log f_{MHz} + 20\log d_{km}$ dB, 6 dB more for every doubling:`,
        {
          type: 'plot',
          alt: 'Free-space path loss at 100 MHz against distance on a log scale: 72.45 dB at 1 km, 92.45 dB at 10 km, 112.45 dB at 100 km, rising 20 dB per decade.',
          caption: 'Free-space loss at 100 MHz: 92.45 dB at 10 km, 20 dB more for every tenfold distance.',
          x: [1, 100],
          logX: true,
          y: [60, 120],
          xLabel: 'd (km)',
          yLabel: 'loss (dB)',
          series: [{ f: (d) => 32.45 + 20 * Math.log10(100) + 20 * Math.log10(d), label: 'FSPL' }],
          marks: [{ x: 10, label: '10 km' }],
        },
        r`Line-of-sight links reach only the **radio horizon**, $4.12(\sqrt{h_t} + \sqrt{h_r})$ km with heights in metres. Sky waves return from the ionosphere below the **maximum usable frequency** $f_c\sec\theta_i$, where $f_c = 9\sqrt{N_{max}}$ is the critical frequency.`,
      ],
      keyIdeas: [
        r`FSPL $= 32.45 + 20\log f_{MHz} + 20\log d_{km}$; Friis $P_r = P_tG_tG_r\left(\frac{\lambda}{4\pi d}\right)^2$.`,
        r`Radio horizon $d = 4.12(\sqrt{h_t} + \sqrt{h_r})$ km, h in metres.`,
        r`$f_c = 9\sqrt{N_{max}}$; MUF $= f_c\sec\theta_i$; $\lambda = \frac{v}{f}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Loss, horizon and MUF',
          problem: r`Find the free-space loss at 100 MHz over 10 km, the radio horizon for 100 m and 4 m antennas, and the MUF for a 9 MHz critical frequency at 60° incidence.`,
          steps: [
            r`$32.45 + 40 + 20 = 92.45$ dB.`,
            r`$4.12(\sqrt{100} + \sqrt4) = 4.12 \times 12 = 49.4$ km.`,
            r`MUF $= \frac{9}{\cos60°} = 18$ MHz.`,
          ],
          answer: r`92.45 dB; 49.4 km; 18 MHz.`,
        },
        {
          level: 'board',
          title: 'Wavelength and frequency',
          problem: r`A wave travels at $1.5 \times 10^8$ m/s at 60 MHz: find its wavelength. A shortwave station transmits on 15 m: find its frequency in kHz and its band.`,
          steps: [
            r`$\lambda = \frac{1.5 \times 10^8}{60 \times 10^6} = 2.5$ m.`,
            r`$f = \frac{3 \times 10^8}{15} = 20$ MHz $= 20\,000$ kHz: HF.`,
          ],
          answer: r`2.5 m; 20 000 kHz, HF.`,
        },
      ],
      traps: [
        r`Path loss grows with frequency only because the receiving antenna's aperture shrinks: fixed-aperture dishes gain it back.`,
        r`Use the speed IN THE MEDIUM for wavelength, not always c.`,
      ],
      check: [
        { q: r`In which band are TV channels 2 to 13?`, a: r`VHF.` },
        { q: r`How much does free-space loss rise when the distance doubles?`, a: r`6 dB.` },
      ],
    },
    {
      name: 'Fiber Optics',
      inShort: r`Light guided in glass by total internal reflection: huge bandwidth, low loss.`,
      body: [
        r`An optical fibre traps light in a **core** of slightly higher refractive index than its **cladding**, by total internal reflection. Light enters only within the **acceptance angle**, $\sin\theta_a = \text{NA} = \sqrt{n_1^2 - n_2^2}$. A wide core carries many paths (**multimode**: step-index, or graded-index, which evens their delays); a narrow one only one (**single-mode**, when $V = \frac{2\pi a}{\lambda}\text{NA} < 2.405$), for long, fast links.`,
        r`A link is planned with a **power budget**: the source power, less the fibre's loss per kilometre, the connectors and the splices, must leave enough at the receiver:`,
        {
          type: 'plot',
          alt: 'The power along a 40 km fibre link from a 0 dBm source: a 0.5 dB connector loss at the start, a steady slope of 0.35 dB per km with small 0.1 dB steps at each splice every 4 km, and a final 0.5 dB connector, ending at minus 16 dBm, 12 dB above a receiver sensitivity of minus 28 dBm, dashed.',
          caption: 'A 40 km link: 0 dBm falls to −16 dBm, a 12 dB margin over a −28 dBm receiver (dashed).',
          x: [0, 40],
          y: [-30, 2],
          xLabel: 'distance (km)',
          yLabel: 'P (dBm)',
          series: [{ f: fibre, label: 'P' }],
          marks: [{ y: -28, label: 'sensitivity' }],
        },
        r`Fibre's bandwidth is limited by **dispersion**: modal (multimode), $\approx \frac{Ln_1\Delta}{c}$ with $\Delta = \frac{n_1 - n_2}{n_1}$, and chromatic (all fibres).`,
      ],
      keyIdeas: [
        r`$NA = \sqrt{n_1^2 - n_2^2} = \sin\theta_a$.`,
        r`$V = \frac{2\pi a}{\lambda}NA$; single-mode below 2.405.`,
        r`Modal dispersion $\approx \frac{Ln_1\Delta}{c}$; budget $P_r = P_t - \alpha L - $ connectors $-$ splices.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Aperture, dispersion and budget',
          problem: r`A step-index fiber has $n_1 = 1.48$, $n_2 = 1.46$. Find NA, the acceptance angle and the modal spread per km. A 0 dBm source feeds 40 km at 0.35 dB/km with 2 connectors (0.5 dB) and 10 splices (0.1 dB): find the received power.`,
          steps: [
            r`NA $= \sqrt{1.48^2 - 1.46^2} = 0.2425$; $\theta_a = 14.0°$.`,
            r`$\Delta = 0.0135$: $\frac{1000 \times 1.48 \times 0.0135}{3 \times 10^8} = 66.7$ ns/km.`,
            r`$P_r = 0 - 14 - 1 - 1 = -16$ dBm.`,
          ],
          answer: r`0.2425; 14.0°; 66.7 ns/km; −16 dBm.`,
        },
        {
          level: 'board',
          title: 'Single-mode or not',
          problem: r`A fibre has a 4.5 µm core radius and NA 0.12. Is it single-mode at 1.31 µm? Above what wavelength is it single-mode?`,
          steps: [
            r`$V = \frac{2\pi \times 4.5}{1.31} \times 0.12 = 2.59$: above 2.405, so multimode at 1.31 µm.`,
            r`Cut-off $\lambda_c = \frac{2\pi \times 4.5 \times 0.12}{2.405} = 1.41$ µm.`,
          ],
          answer: r`No (V = 2.59); above 1.41 µm.`,
        },
      ],
      traps: [
        r`Single-mode fiber has no modal dispersion, but chromatic dispersion remains.`,
        r`Count the connectors at BOTH ends.`,
      ],
      check: [
        { q: r`What keeps light in a fibre's core?`, a: r`Total internal reflection at the core–cladding boundary.` },
        { q: r`What communication uses light rather than electricity in a cable?`, a: r`Fibre optics.` },
      ],
    },
    {
      name: 'Satellite and Cellular',
      inShort: r`Satellites relay signals from orbit; cellular systems reuse frequencies in a pattern of cells.`,
      body: [
        r`A **geostationary** satellite orbits above the equator at 35 786 km, once a day, so it hangs still in the sky; a signal up and down takes about a quarter of a second. Its link is judged by the carrier-to-noise density $\frac{C}{N_0} = \text{EIRP} - L + \frac{G}{T} + 228.6$ dBHz, with the receiving station's quality as its **figure of merit** G/T.`,
        r`**Cellular** systems cover an area with small cells, each with a low-power base station, and reuse the same frequencies in cells far enough apart. A **cluster** of N cells uses all the channels once, $N = i^2 + ij + j^2$ (3, 4, 7, 12…); co-channel cells are $\frac{D}{R} = \sqrt{3N}$ apart. Traffic is measured in **erlangs**, calls per hour × hours per call.`,
        r`| Item | Detail |
|---|---|
| Geostationary altitude | 35 786 km (radius 42 164 km) |
| Round-trip delay | about 0.24 s up and down |
| Reuse cluster N | $i^2 + ij + j^2$: 3, 4, 7, 12 |
| Co-channel C/I | $\frac{(D/R)^4}{6}$ with path-loss exponent 4 |
| Traffic | $A = \lambda h$ erlangs |`,
      ],
      keyIdeas: [
        r`Geostationary: 42,164 km radius, 35,786 km up; about 0.24 s up and down.`,
        r`$\frac{C}{N_0} = \text{EIRP} - L + \frac{G}{T} + 228.6$ dBHz.`,
        r`Reuse $N = i^2 + ij + j^2$, $\frac{D}{R} = \sqrt{3N}$; traffic $A = \lambda h$ erlangs.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A downlink and a cluster',
          problem: r`A downlink has EIRP 50 dBW, 206 dB of loss and G/T of 20 dB/K. Find C/N₀ and C/N in 36 MHz. Find D/R for a 7-cell cluster.`,
          steps: [
            r`$C/N_0 = 50 - 206 + 20 + 228.6 = 92.6$ dBHz.`,
            r`$C/N = 92.6 - 10\log(36 \times 10^6) = 92.6 - 75.6 = 17.0$ dB.`,
            r`$D/R = \sqrt{21} = 4.58$ (C/I ≈ 18.7 dB with n = 4).`,
          ],
          answer: r`92.6 dBHz; 17.0 dB; 4.58.`,
        },
        {
          level: 'board',
          title: 'Delay and traffic',
          problem: r`Find the up-and-down delay to a geostationary satellite directly overhead. A cell handles 200 calls an hour averaging 3 minutes: find its traffic.`,
          steps: [
            r`$\frac{2 \times 35\,786}{3 \times 10^5} = 0.239$ s.`,
            r`$A = 200 \times \frac{3}{60} = 10$ erlangs.`,
          ],
          answer: r`0.239 s; 10 erlangs.`,
        },
      ],
      traps: [
        r`Kepler's law gives the orbit radius from the earth's CENTRE: subtract 6378 km for the altitude.`,
        r`Erlangs need the holding time in HOURS.`,
      ],
      check: [
        { q: r`Why does a geostationary satellite seem fixed in the sky?`, a: r`It orbits once a day above the equator, turning with the earth.` },
        { q: r`What does a smaller reuse cluster give, and cost?`, a: r`More capacity per area, at the cost of more co-channel interference.` },
      ],
    },
    {
      name: 'Data Communications',
      inShort: r`Moving bits reliably between machines: framing, error control and flow control.`,
      body: [
        r`Data links frame bits into characters or packets, detect errors (parity, checksums, **CRC**) and correct them (Hamming codes, or by asking again: **ARQ**). Asynchronous links frame each character with start and stop bits: 8N1 sends 10 bits per byte. Networks use connectors such as **RJ45** (twisted-pair Ethernet data) and devices such as **repeaters**, which simply regenerate and pass a signal on.`,
        r`**Stop-and-wait** ARQ sends one frame and waits for its acknowledgement, so a long link sits idle most of the time: with $a = \frac{t_{prop}}{t_{frame}}$, the efficiency is $\frac{1}{1 + 2a}$. A **sliding window** of W frames raises it to $\frac{W}{1 + 2a}$, up to 100%:`,
        {
          type: 'plot',
          alt: 'The efficiency of stop-and-wait against a, the propagation delay over the frame time, on a log scale: nearly 100 percent for small a, 33 percent at a of 1, and 4.8 percent at a of 10.',
          caption: 'Stop-and-wait efficiency 1/(1 + 2a): 4.8% when the delay is ten frame times.',
          x: [0.01, 100],
          logX: true,
          y: [0, 105],
          xLabel: 'a = t_{prop} / t_{frame}',
          yLabel: 'efficiency (%)',
          series: [{ f: (a) => 100 / (1 + 2 * a), label: 'η', area: true }],
          marks: [{ x: 10, label: 'a = 10' }],
        },
        r`**Power-line carrier** sends communication and protection signals over the power lines themselves, between substations.`,
      ],
      keyIdeas: [
        r`Stop-and-wait $\eta = \frac{1}{1 + 2a}$, $a = \frac{t_{prop}}{t_{frame}}$; sliding window $\frac{W}{1 + 2a}$.`,
        r`Asynchronous 8N1 framing: 8 of every 10 bits are data.`,
        r`Error detection by parity, checksums and CRC; correction by Hamming codes or retransmission (ARQ).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Stop-and-wait and 8N1',
          problem: r`1000-bit frames go at 1 Mbit/s over 2000 km of cable ($2 \times 10^8$ m/s) with stop-and-wait. Find the efficiency. How many characters per second does 9600 bit/s carry in 8N1?`,
          steps: [
            r`$t_{frame} = 1$ ms, $t_{prop} = 10$ ms: $a = 10$, $\eta = \frac{1}{21} = 4.8\%$.`,
            r`$\frac{9600}{10} = 960$ characters per second.`,
          ],
          answer: r`4.8%; 960.`,
        },
        {
          level: 'board',
          title: 'A sliding window',
          problem: r`The same link uses a sliding window of 7 frames. Find its efficiency. What window keeps it fully busy?`,
          steps: [
            r`$\eta = \frac{7}{21} = 33.3\%$.`,
            r`$W \ge 1 + 2a = 21$ frames.`,
          ],
          answer: r`33.3%; 21 frames.`,
        },
      ],
      traps: [
        r`A faster line makes stop-and-wait WORSE: the frame time shrinks but the propagation delay doesn't.`,
        r`8N1 means 10 bits on the line per 8 data bits.`,
      ],
      check: [
        { q: r`What is an RJ45 connector used for?`, a: r`Data (twisted-pair Ethernet).` },
        { q: r`Where is power-line carrier communication found?`, a: r`Between substations, over the power lines.` },
      ],
    },
  ],
};
