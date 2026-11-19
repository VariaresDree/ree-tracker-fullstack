// Library › Lessons › EE › Industrial Electronics (2026-11-19): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Uncontrolled rectifiers and
// ripple are in Electronics 1 and 2; constant V/f in Machinery 2; UPS
// runtime and Peukert in Apparatus & Devices; RTDs, thermocouples, strain
// gauges and PLC timing in Instrumentation & Control.
const r = String.raw;

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
      keyIdeas: [
        r`Two-transistor model: $I_A = \frac{\alpha_2I_G + I_{CBO1} + I_{CBO2}}{1 - (\alpha_1 + \alpha_2)}$; it latches as $\alpha_1 + \alpha_2 \to 1$.`,
        r`Protect with a series L for di/dt ($L \ge \frac{V_s}{(di/dt)_{max}}$) and an RC snubber for dv/dt.`,
        r`Series strings need equalising resistors $R = \frac{n_sV_{D,max} - V_s}{(n_s - 1)\Delta I_D}$; a UJT oscillator at $f = \frac{1}{RC\ln\frac{1}{1-\eta}}$ fires them.`,
      ],
      example: {
        problem: r`Four SCRs rated 1100 V block 4000 V; their leakage differs by up to 5 mA. Find the equalising resistor and the derating factor. A UJT with η = 0.63 uses 20 kΩ and 0.1 µF: find its frequency.`,
        solution: r`$R = \frac{4 \times 1100 - 4000}{3 \times 0.005} = 26.7$ kΩ. DRF $= 1 - \frac{4000}{4 \times 1100} = 9.1\%$. $f = \frac{1}{0.002\ln(1/0.37)} = 503$ Hz.`,
      },
      traps: [r`Removing the gate signal does NOT turn an SCR off: only bringing its current below the holding current does.`],
    },
    {
      name: 'Triacs and Diacs',
      inShort: r`A triac is two SCRs in antiparallel with one gate; a diac breaks over at a set voltage to fire it.`,
      keyIdeas: [
        r`Phase control, R load: $V_o = V_s\sqrt{\frac{1}{\pi}\left(\pi - \alpha + \frac{\sin2\alpha}{2}\right)}$.`,
        r`An RC network delays the firing: $V_C$ lags $V_s$ by $\tan^{-1}\omega RC$.`,
        r`Integral-cycle control: $V_o = V_s\sqrt{\frac{n}{n+m}}$, power in proportion to the on-cycles.`,
      ],
      example: {
        problem: r`A triac feeds a 20 Ω heater from 230 V. Find the power at α = 90°, and with integral-cycle control of 3 cycles on, 5 off.`,
        solution: r`Full power $\frac{230^2}{20} = 2645$ W. At 90°: $V_o = 230\sqrt{0.5} = 162.6$ V, $P = 1322$ W. Burst: $2645 \times \frac{3}{8} = 992$ W.`,
      },
      traps: [r`Phase control at 90° gives half the POWER but 0.707 of the voltage, not half.`],
    },
    {
      name: 'Power Transistors and IGBTs',
      inShort: r`Fully controllable switches: BJTs (current-driven), MOSFETs (fast, resistive) and IGBTs (MOSFET gate, bipolar conduction).`,
      keyIdeas: [
        r`Switching loss $P_{sw} = \tfrac12V_dI_o(t_{on} + t_{off})f_s$ (inductive); grows with frequency.`,
        r`Conduction loss: MOSFET $I_{rms}^2R_{DS(on)}$; IGBT $V_{CE0}I_{av} + r_{CE}I_{rms}^2$.`,
        r`A BJT is saturated when $I_B \ge \frac{I_{CS}}{\beta_{min}}$; overdrive factor $\frac{I_B}{I_{BS}}$.`,
      ],
      example: {
        problem: r`An IGBT switches 20 A at 400 V and 10 kHz with $t_{on} + t_{off} = 0.8$ µs, at 50% duty ($V_{CE0} = 1.2$ V, $r_{CE} = 0.02$ Ω). Find its losses.`,
        solution: r`$P_{sw} = 0.5 \times 400 \times 20 \times 0.8 \times 10^{-6} \times 10^4 = 32$ W. $I_{av} = 10$ A, $I_{rms}^2 = 200$: $P_c = 12 + 4 = 16$ W. Total 48 W.`,
      },
      traps: [r`MOSFETs suit low-voltage, high-frequency work; IGBTs win at high voltage, where $R_{DS(on)}$ would be large.`],
    },
    {
      name: 'Controlled Rectifiers',
      inShort: r`Rectifiers with SCRs: the firing angle α sets the average DC output.`,
      keyIdeas: [
        r`Single-phase full converter $\frac{2V_m}{\pi}\cos\alpha$; semi-converter $\frac{V_m}{\pi}(1 + \cos\alpha)$; half-wave R load $\frac{V_m}{2\pi}(1 + \cos\alpha)$.`,
        r`Three-phase full converter $1.35V_{LL}\cos\alpha$; past 90° it inverts.`,
        r`Source inductance costs $\frac{3\omega L_sI_d}{\pi}$; input PF $= 0.955\cos\alpha$ (three-phase).`,
      ],
      example: {
        problem: r`A three-phase full converter on 415 V, 50 Hz fires at 30° and carries 100 A through 2 mH of source inductance per phase. Find the output voltage, the overlap angle and the input power factor.`,
        solution: r`$1.35 \times 415 \times 0.866 = 485.2$ V, less $\frac{3 \times 314.2 \times 0.002 \times 100}{\pi} = 60$ V: 425.2 V. $\cos(30° + \mu) = 0.866 - 0.214$: $\mu = 19.3°$. PF $= 0.955 \times 0.866 = 0.827$.`,
      },
      traps: [r`$\cos\alpha$ applies only with continuous current; a resistive load stops conducting at the zero crossing.`],
    },
    {
      name: 'Inverters',
      inShort: r`DC to AC: switches build a square, stepped or pulse-width-modulated wave.`,
      keyIdeas: [
        r`Full-bridge square wave: $V_{n} = \frac{0.9V_{dc}}{n}$ rms, odd $n$ only.`,
        r`Six-step three-phase: $V_{LL1} = 0.78V_{dc}$; no triplen harmonics.`,
        r`Sine PWM: $V_{LL1} = 0.612\,m_aV_{dc}$ for $m_a \le 1$; harmonics move up near $m_f$.`,
      ],
      example: {
        problem: r`A full bridge on 220 V DC gives a square wave. Find the rms fundamental, 3rd and 5th. A 600 V DC three-phase inverter runs six-step, then sine PWM at $m_a = 0.8$: find the line voltage each time.`,
        solution: r`198 V, 66 V and 39.6 V. Six-step: $0.78 \times 600 = 468$ V; PWM: $0.612 \times 0.8 \times 600 = 294$ V.`,
      },
      traps: [r`Six-step gives more fundamental than linear PWM can (0.78 vs at most 0.612 of Vdc), at the price of low-order harmonics.`],
    },
    {
      name: 'Choppers',
      inShort: r`DC to DC by switching: the duty ratio D sets the output.`,
      keyIdeas: [
        r`Buck $V_o = DV_s$; boost $\frac{V_s}{1 - D}$; buck-boost $-\frac{D}{1 - D}V_s$.`,
        r`Buck ripple: $\Delta I_L = \frac{V_sD(1-D)}{Lf}$, $\frac{\Delta V_o}{V_o} = \frac{1 - D}{8LCf^2}$.`,
        r`Continuous conduction needs $L > \frac{(1 - D)R}{2f}$ (buck).`,
      ],
      example: {
        problem: r`A buck converter steps 48 V down to 12 V at 50 kHz with L = 100 µH and C = 47 µF. Find D, the inductor ripple and the output ripple.`,
        solution: r`$D = 0.25$. $\Delta I_L = \frac{48 \times 0.25 \times 0.75}{10^{-4} \times 5 \times 10^4} = 1.8$ A. $\frac{\Delta V_o}{V_o} = \frac{0.75}{8 \times 10^{-4} \times 4.7 \times 10^{-5} \times 2.5 \times 10^9} = 0.80\%$: 96 mV.`,
      },
      traps: [r`At light load a converter goes discontinuous and $V_o = DV_s$ no longer holds: the output rises.`],
    },
    {
      name: 'Cycloconverters',
      inShort: r`AC to AC at a lower frequency, directly, by switching pieces of the supply.`,
      keyIdeas: [
        r`Step-down: $f_o = \frac{f_s}{N}$, N supply half-cycles per output half-cycle.`,
        r`Output $V_o = rV_{ph}\frac{p}{\pi}\sin\frac{\pi}{p}$; each phase is a dual converter.`,
        r`Used for large, slow drives (mills, kilns, ship propulsion); keep $f_o$ below about $\frac{f_s}{3}$.`,
      ],
      example: {
        problem: r`A cycloconverter on 50 Hz builds each output half-cycle from 3 supply half-cycles. A three-phase version uses 6-pulse converters on 240 V per phase with r = 0.8: find its output voltage.`,
        solution: r`$f_o = \frac{50}{3} = 16.7$ Hz. $V_o = 0.8 \times 240 \times \frac{6}{\pi}\sin30° = 183$ V.`,
      },
      traps: [r`A cycloconverter can't raise the frequency: for that, rectify and invert.`],
    },
    {
      name: 'Motor Drives',
      inShort: r`Converters that control a motor's speed and torque.`,
      keyIdeas: [
        r`DC: $\omega = \frac{V_{dc}(\alpha) - I_aR_a}{K\phi}$; a chopper regenerates when $E_a - I_aR_a = (1 - D)V_s$.`,
        r`AC: constant V/f up to base speed, then fixed V: breakdown torque falls as $\frac{1}{f^2}$.`,
        r`Acceleration $t = \frac{J\Delta\omega}{T_m - T_L}$; braking energy $\tfrac12J\omega^2$.`,
      ],
      example: {
        problem: r`A separately excited DC motor ($R_a = 0.5$ Ω, $K\phi = 2$ V·s/rad) is fed by a three-phase full converter on 415 V at α = 30°, drawing 50 A. Find its speed. Its 2 kg·m² drive gets 100 N·m against a 40 N·m load: time to 150 rad/s?`,
        solution: r`$V_{dc} = 485.2$ V; $\omega = \frac{485.2 - 25}{2} = 230.1$ rad/s = 2197 rpm. $t = \frac{2 \times 150}{60} = 5$ s.`,
      },
      traps: [r`At 75 Hz on a 50 Hz motor (fixed voltage) the breakdown torque is only $(50/75)^2 = 44\%$ of rated.`],
    },
    {
      name: 'UPS',
      inShort: r`Rectifier, battery and inverter that carry critical loads through a supply failure.`,
      keyIdeas: [
        r`Types: offline (standby), line-interactive and online (double conversion, no transfer time).`,
        r`Size by kVA and kW with margin: $S \ge 1.25\frac{P}{\text{pf}}$; battery current $\frac{P}{\eta V_{dc}}$.`,
        r`Cells: $n = \frac{V_{dc,min}}{V_{end}}$ (1.75 V lead-acid); float about 2.25 V per cell.`,
      ],
      example: {
        problem: r`An 8 kW load at 0.8 pf needs a UPS with 25% margin. A 5 kW inverter (90%) runs from 24 lead-acid cells: find the battery current at end of discharge and the float voltage.`,
        solution: r`$1.25 \times \frac{8}{0.8} = 12.5$ kVA. End voltage $24 \times 1.75 = 42$ V: $I = \frac{5000}{0.9 \times 42} = 132$ A. Float $24 \times 2.25 = 54$ V.`,
      },
      traps: [r`Size cables for the END-of-discharge current, the highest the battery delivers.`],
    },
    {
      name: 'Sensors',
      inShort: r`Turn physical quantities into electrical signals for control.`,
      keyIdeas: [
        r`Hall: $V_H = \frac{IB}{nqt}$; capacitive: $\frac{\Delta C}{C} \approx -\frac{\Delta d}{d}$; piezo: $V = \frac{dF}{C}$ (dynamic only).`,
        r`LVDT: output proportional to core position, phase giving direction.`,
        r`Encoder: $N = \frac{60f}{\text{PPR}}$ rpm; quadrature resolution $\frac{360°}{4\,\text{PPR}}$.`,
      ],
      example: {
        problem: r`A Hall plate 1 mm thick ($n = 10^{22}$ m⁻³) carries 5 mA in 0.5 T. Find $V_H$. A 1000-PPR encoder gives 5 kHz: find the speed and the quadrature resolution.`,
        solution: r`$V_H = \frac{0.005 \times 0.5}{10^{22} \times 1.602 \times 10^{-19} \times 0.001} = 1.56$ mV. $N = \frac{60 \times 5000}{1000} = 300$ rpm; resolution 0.09°.`,
      },
      traps: [r`A piezoelectric sensor can't hold a static reading: its charge leaks away.`],
    },
    {
      name: 'Optoelectronics',
      inShort: r`Devices that turn current into light and light into current: LEDs, photodiodes, phototransistors, optocouplers.`,
      keyIdeas: [
        r`$\lambda(\mu\text{m}) = \frac{1.24}{E_g(\text{eV})}$.`,
        r`Responsivity $\mathcal{R} = \frac{\eta\lambda(\mu\text{m})}{1.24}$ A/W.`,
        r`Optocoupler CTR $= \frac{I_C}{I_F}$; LED resistor $R = \frac{V_s - nV_F}{I_F}$.`,
      ],
      example: {
        problem: r`Find a GaAs LED's wavelength ($E_g = 1.43$ eV), the responsivity of a photodiode with η = 0.8 at 0.85 µm, and the resistor for three 2.0 V LEDs at 20 mA from 12 V.`,
        solution: r`$\lambda = \frac{1.24}{1.43} = 0.867$ µm (infrared). $\mathcal{R} = \frac{0.8 \times 0.85}{1.24} = 0.548$ A/W. $R = \frac{12 - 6}{0.02} = 300$ Ω, dissipating 0.12 W.`,
      },
      traps: [r`Optocouplers age: design with the minimum CTR over life and temperature.`],
    },
    {
      name: 'Timers and PLCs',
      inShort: r`Timing circuits and programmable controllers that sequence industrial machines.`,
      keyIdeas: [
        r`555 astable: $t_H = 0.693(R_A + R_B)C$, $t_L = 0.693R_BC$, $f = \frac{1.44}{(R_A + 2R_B)C}$.`,
        r`555 monostable: $t = 1.1RC$.`,
        r`PLC scan: read inputs, run the program, write outputs; timers and counters replace relay logic (timing in Instrumentation & Control).`,
      ],
      example: {
        problem: r`A 555 astable has $R_A = 10$ kΩ, $R_B = 20$ kΩ and C = 10 nF. Find $t_H$, $t_L$, f and the duty cycle.`,
        solution: r`$t_H = 0.693 \times 30{,}000 \times 10^{-8} = 0.208$ ms, $t_L = 0.139$ ms; $f = \frac{1.44}{50{,}000 \times 10^{-8}} = 2.88$ kHz; duty $\frac{30}{50} = 60\%$.`,
      },
      traps: [r`A plain 555 astable can't go below 50% duty: $t_H$ always includes $R_B$.`],
    },
  ],
};
