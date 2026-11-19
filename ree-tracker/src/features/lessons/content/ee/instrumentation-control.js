// Library › Lessons › EE › Instrumentation & Control (2026-11-19): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Two-wattmeter is in Electric
// Circuits 2, metering multipliers in Apparatus & Devices, control theory
// (transfer functions, stability) in Feedback Control Systems.
const r = String.raw;

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
      keyIdeas: [
        r`Accuracy, precision, resolution, sensitivity; gross, systematic and random errors.`,
        r`Full-scale accuracy at a reading: $\%e_{FS}\frac{FS}{\text{reading}}$.`,
        r`Products add relative errors, sums add absolute errors; a voltmeter loads the circuit: $V_m = V_{th}\frac{R_m}{R_{th} + R_m}$.`,
      ],
      example: {
        problem: r`A 150 V meter is accurate to ±1% of full scale. What is the error on a 50 V reading? A 20 kΩ/V meter on its 10 V range reads a 10 V source with 100 kΩ Thévenin resistance: what does it show?`,
        solution: r`$1\% \times \frac{150}{50} = \pm3\%$. $R_m = 200$ kΩ: $V_m = 10 \times \frac{200}{300} = 6.67$ V.`,
      },
      traps: [r`Use the meter resistance on the RANGE in use, not on its highest range.`],
    },
    {
      name: 'Analog Meters',
      inShort: r`Moving-coil meters extended with shunts and multipliers.`,
      keyIdeas: [
        r`Shunt $R_{sh} = \frac{I_mR_m}{I - I_m}$; multiplier $R_s = \frac{V}{I_m} - R_m$; sensitivity $\frac{1}{I_m}$ Ω/V.`,
        r`Series ohmmeter reads half scale at $R_x = R_{in}$.`,
        r`Average-responding meters read $1.11V_{avg}$: right for sine waves only.`,
      ],
      example: {
        problem: r`A 1 mA, 100 Ω movement is to read 10 A and, separately, 50 V. Find the shunt and the multiplier.`,
        solution: r`$R_{sh} = \frac{0.001 \times 100}{9.999} = 0.0100$ Ω. $R_s = \frac{50}{0.001} - 100 = 49.9$ kΩ.`,
      },
      traps: [r`A rectifier meter reads a square wave 11% high: use true-RMS for non-sine waves.`],
    },
    {
      name: 'Bridges',
      inShort: r`Measure R, L and C by balancing against standards: no current, no loading.`,
      keyIdeas: [
        r`Wheatstone $R_x = \frac{R_2R_3}{R_1}$; Kelvin double bridge for very low resistances.`,
        r`Maxwell: $L_x = R_2R_3C_1$, $R_x = \frac{R_2R_3}{R_1}$.`,
        r`Schering: $C_x = C_3\frac{R_1}{R_2}$, dissipation factor $\omega C_1R_1$ (insulation testing).`,
      ],
      example: {
        problem: r`A Maxwell bridge balances with $R_1 = 5$ kΩ, $C_1 = 0.1$ µF, $R_2 = 1$ kΩ, $R_3 = 2$ kΩ. Find the coil's L and R. A Schering bridge (1 kHz) balances with $C_3 = 100$ pF, $R_1 = 3$ kΩ, $R_2 = 1$ kΩ, $C_1 = 5$ nF: find $C_x$ and D.`,
        solution: r`$L_x = 1000 \times 2000 \times 10^{-7} = 0.2$ H, $R_x = \frac{2 \times 10^6}{5000} = 400$ Ω. $C_x = 100 \times 3 = 300$ pF; $D = 2\pi \times 1000 \times 5 \times 10^{-9} \times 3000 = 0.094$.`,
      },
      traps: [r`Balance doesn't depend on the source voltage or detector, only on the arm ratios.`],
    },
    {
      name: 'Potentiometers',
      inShort: r`Compare an unknown emf with a standard at null, drawing no current.`,
      keyIdeas: [
        r`$E_x = E_s\frac{l_x}{l_s}$ on a slide-wire potentiometer.`,
        r`At null no current flows, so it reads true emf, unaffected by internal resistance.`,
        r`Standardize first against a standard cell, then measure.`,
      ],
      example: {
        problem: r`A 1.0183 V standard cell balances at 54.0 cm and an unknown at 60.2 cm. Find the unknown emf.`,
        solution: r`$E_x = 1.0183 \times \frac{60.2}{54.0} = 1.135$ V.`,
      },
      traps: [r`A voltmeter reads terminal voltage; a potentiometer reads the true emf.`],
    },
    {
      name: 'Wattmeters and Energy Meters',
      inShort: r`Measuring power and energy, and the errors of the instruments themselves.`,
      keyIdeas: [
        r`A wattmeter also reads its own pressure-coil or current-coil loss, depending on connection.`,
        r`Energy meter: $P = \frac{3600K_hN}{t}$; error $\frac{E_{reg} - E_{true}}{E_{true}}$.`,
        r`One wattmeter on the quadrature voltage reads $\frac{Q}{\sqrt3}$ on a balanced load.`,
      ],
      example: {
        problem: r`A meter with $K_h = 7.2$ Wh/rev turns 20 times in 60 s. Find the power. A wattmeter with a 10 kΩ pressure coil on the load side measures a 1000 W, 230 V load: what does it read?`,
        solution: r`$P = \frac{3600 \times 7.2 \times 20}{60} = 8640$ W. Reading $= 1000 + \frac{230^2}{10{,}000} = 1005.3$ W.`,
      },
      traps: [r`A meter that registers too much has a positive error: the customer is overbilled.`],
    },
    {
      name: 'Instrument Transformers',
      inShort: r`CTs and VTs for metering: ratio and phase-angle errors matter for billing.`,
      keyIdeas: [
        r`Ratio error corrected by RCF; phase-angle error β causes a power error of about $\beta\tan\phi$.`,
        r`The phase error matters most at low power factor.`,
        r`Metering classes 0.3, 0.6, 1.2; keep the burden within rating.`,
      ],
      example: {
        problem: r`An instrument transformer pair has a 10-minute phase-angle error. What power error does it cause at 0.5 pf?`,
        solution: r`$\beta = 0.0029$ rad, $\tan 60° = 1.73$: error $\approx 0.0029 \times 1.73 = 0.50\%$.`,
      },
      traps: [r`At unity power factor the phase-angle error barely matters; at low pf it dominates.`],
    },
    {
      name: 'Oscilloscopes',
      inShort: r`Seeing waveforms: amplitude, time, phase and frequency.`,
      keyIdeas: [
        r`$V = \text{div} \times \text{V/div}$ (× probe); $f = \frac{1}{\text{div} \times \text{time/div}}$.`,
        r`Lissajous: $\frac{f_y}{f_x} = \frac{\text{horizontal tangencies}}{\text{vertical tangencies}}$; ellipse $\sin\phi = \frac{y_0}{y_{\max}}$.`,
        r`Rise time $\frac{0.35}{BW}$; shown rise $\sqrt{t_{sig}^2 + t_{scope}^2}$; compensate 10× probes.`,
      ],
      example: {
        problem: r`A trace is 3.2 divisions high at 0.5 V/div through a 10× probe, and one cycle spans 4 divisions at 0.5 ms/div. Find the voltage and frequency. A 5 ns edge on a 100 MHz scope shows what rise time?`,
        solution: r`$3.2 \times 0.5 \times 10 = 16$ V; $f = \frac{1}{2\ \text{ms}} = 500$ Hz. Scope 3.5 ns: shown $\sqrt{5^2 + 3.5^2} = 6.1$ ns.`,
      },
      traps: [r`Forgetting the 10× probe factor reads ten times too small.`],
    },
    {
      name: 'Transducers and Sensors',
      inShort: r`Turn physical quantities into electrical signals.`,
      keyIdeas: [
        r`Strain gauge $GF = \frac{\Delta R/R}{\varepsilon}$; quarter bridge $V_o \approx \frac{V_{ex}GF\varepsilon}{4}$.`,
        r`RTD $R_0(1 + \alpha T)$ (Pt100: 0.00385); thermocouple $S\Delta T$ with cold-junction compensation; thermistor $R_0e^{B(1/T - 1/T_0)}$.`,
        r`Also LVDTs (displacement), capacitive, piezoelectric, Hall-effect sensors.`,
      ],
      example: {
        problem: r`A gauge (GF 2) in a 5 V quarter bridge sees 500 µε: find the output. A Pt100 is at 100 °C, a type K (41 µV/°C) has its hot junction at 300 °C and cold at 25 °C: find each reading.`,
        solution: r`$V_o = \frac{5 \times 2 \times 500 \times 10^{-6}}{4} = 1.25$ mV. RTD: $100(1.385) = 138.5$ Ω. Thermocouple: $41 \times 275 = 11.3$ mV.`,
      },
      traps: [r`A thermocouple measures a temperature DIFFERENCE: add the cold-junction value.`],
    },
    {
      name: 'Data Acquisition',
      inShort: r`Sample, quantize and scale signals into numbers.`,
      keyIdeas: [
        r`Sample above twice the highest frequency, or it aliases to $|f - kf_s|$; filter first.`,
        r`Ideal ADC SNR $= 6.02N + 1.76$ dB.`,
        r`4–20 mA: $x = x_{lo} + \frac{I - 4}{16}(x_{hi} - x_{lo})$; 0 mA means a broken loop.`,
      ],
      example: {
        problem: r`What SNR can a 12-bit ADC reach? A 900 Hz signal is sampled at 1 kHz: what frequency appears? A 0–200 °C transmitter sends 12 mA: what temperature?`,
        solution: r`$6.02 \times 12 + 1.76 = 74.0$ dB. Alias $|900 - 1000| = 100$ Hz. $\frac{8}{16} \times 200 = 100$ °C.`,
      },
      traps: [r`Aliased frequencies can't be removed after sampling: filter before the ADC.`],
    },
    {
      name: 'Process Control and PID',
      inShort: r`Controllers that hold a process at its setpoint.`,
      keyIdeas: [
        r`PID: $u = K_c\left(e + \frac{1}{T_i}\int e\,dt + T_d\frac{de}{dt}\right)$; proportional band $\frac{100}{K_c}\%$.`,
        r`P alone leaves an offset; integral removes it; derivative adds damping.`,
        r`Ziegler–Nichols: PID $0.6K_u$, $T_i = \frac{P_u}{2}$, $T_d = \frac{P_u}{8}$.`,
      ],
      example: {
        problem: r`A controller has gain 2.5. Find its proportional band. A loop oscillates steadily at $K_u = 8$ with a 30 s period: find Ziegler–Nichols PID settings.`,
        solution: r`PB $= 40\%$. $K_p = 4.8$, $T_i = 15$ s, $T_d = 3.75$ s.`,
      },
      traps: [r`A narrow proportional band means a HIGH gain.`],
    },
    {
      name: 'PLCs',
      inShort: r`Industrial computers that scan inputs, run logic and set outputs.`,
      keyIdeas: [
        r`Scan cycle: read inputs, execute program, write outputs; worst response $\approx 2t_{scan} + t_{in} + t_{out}$.`,
        r`Ladder logic, timers (preset $= \frac{\text{delay}}{\text{time base}}$), counters, interlocks.`,
        r`Inputs shorter than a scan can be missed.`,
      ],
      example: {
        problem: r`A PLC scans in 15 ms with 10 ms input filtering and 5 ms output delay. Find its worst-case response, and the preset for a 5 s timer on a 0.01 s time base.`,
        solution: r`$2 \times 15 + 10 + 5 = 45$ ms. Preset $= \frac{5}{0.01} = 500$.`,
      },
      traps: [r`Safety stops must be hard-wired, not only in the PLC program.`],
    },
    {
      name: 'SCADA',
      inShort: r`Supervisory control and data acquisition over a wide area.`,
      keyIdeas: [
        r`Master station polls remote terminal units (RTUs); HMI shows the operator.`,
        r`Poll cycle $= N(t_{req} + t_{resp} + t_{ta})$, with message time $\frac{\text{bits}}{\text{bit rate}}$.`,
        r`Protocols: Modbus, DNP3, IEC 61850; report by exception to save bandwidth.`,
      ],
      example: {
        problem: r`A master polls 20 RTUs at 9600 bps with 8-byte requests and 40-byte replies (11 bits per byte) and 50 ms turnaround. Find the poll cycle.`,
        solution: r`Per RTU $\frac{88 + 440}{9600} + 0.05 = 0.105$ s; cycle $= 2.1$ s.`,
      },
      traps: [r`The screen shows data up to one poll cycle old.`],
    },
    {
      name: 'Calibration',
      inShort: r`Comparing an instrument with a better standard, traceable to national standards.`,
      keyIdeas: [
        r`Combined uncertainty $u_c = \sqrt{\sum u_i^2}$; expanded $U = ku_c$ ($k = 2$, about 95%).`,
        r`Test uncertainty ratio of at least 4:1.`,
        r`Traceability chain up to national standards; keep calibration records and intervals.`,
      ],
      example: {
        problem: r`Two independent uncertainties are 0.3 and 0.4 units. Find the combined and expanded (k = 2) uncertainty. Is a ±0.25 standard good enough for a ±1.0 tolerance?`,
        solution: r`$u_c = 0.5$, $U = 1.0$. TUR $= \frac{1.0}{0.25} = 4{:}1$: just acceptable.`,
      },
      traps: [r`Root-sum-square only for INDEPENDENT contributions; correlated ones add directly.`],
    },
  ],
};
