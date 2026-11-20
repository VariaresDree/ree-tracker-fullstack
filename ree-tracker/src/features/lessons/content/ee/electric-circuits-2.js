// Library › Lessons › EE › Electric Circuits 2 (2026-11-18; every subtopic in the
// module format 2026-11-20, with figures, examples a step at a time and checks;
// every number re-worked by electricCircuits2Lesson.test.js. Coverage and problem
// styles cross-checked against a review center's ac and three-phase handouts; the
// text, problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order. Phasors and impedance are in
// Electric Circuits 1; per-unit and faults in Power System Analysis.
const r = String.raw;
const deg = Math.PI / 180;

export default {
  topic: 'Electric Circuits 2',
  subject: 'EE',
  overview: r`Circuits 2 takes phasor analysis into the questions power engineers ask: how much real and reactive power flows, how to correct a poor power factor, where a circuit resonates, how coupled coils behave, and above all how three-phase systems work, balanced and unbalanced. It ends with tools for harder signals and networks: Fourier series for non-sinusoidal waves, two-port parameters, Laplace transforms and filters. Work in RMS phasors, keep the sign of reactive power straight (inductive absorbs, capacitive supplies), and in three-phase always say whether a value is line or phase.`,
  sources: [
    'Fundamentals of Electric Circuits (Alexander and Sadiku)',
    'Electric Circuits (Nilsson and Riedel)',
    'Electrical Engineering: Principles and Applications (Hambley)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'AC Power (Real, Reactive, Apparent)',
      inShort: r`What an ac load really consumes, what it borrows, and the total.`,
      body: [
        r`In an ac circuit the power rises and falls with the voltage and current. With $v = V_m\cos\omega t$ and $i = I_m\cos(\omega t - \theta)$, the instantaneous power in RMS terms is $p = VI\cos\theta + VI\cos(2\omega t - \theta)$. Its average is the **real power** $P = VI\cos\theta$, which does the work; the rest surges between source and load at twice the line frequency and averages to nothing.`,
        {
          type: 'plot',
          alt: 'Voltage, current and power over one cycle at a power factor of 0.5: the current lags the voltage by 60 degrees, and the power wave, at twice the frequency, dips below zero part of the time around an average of 0.25.',
          caption: 'One cycle at a power factor of 0.5: the power swings at twice the frequency and dips below zero where the load hands energy back.',
          x: [0, 360],
          y: [-1.1, 1.1],
          xLabel: 'ωt (°)',
          series: [
            { f: (x) => Math.cos(x * deg), label: 'v' },
            { f: (x) => Math.cos((x - 60) * deg), label: 'i', dashed: true },
            { f: (x) => Math.cos(x * deg) * Math.cos((x - 60) * deg), label: 'p = vi', area: true },
          ],
          marks: [{ y: 0.25, label: 'average P' }],
        },
        r`**Reactive power** $Q = VI\sin\theta$ (var) measures that exchange: inductive loads absorb it (lagging, $Q > 0$), capacitive loads supply it (leading, $Q < 0$). **Apparent power** $S = VI$ (VA) is what the wires and the source must be rated to carry. The three form the power triangle, $S^2 = P^2 + Q^2$, and complex power ties them together: $\mathbf{S} = \mathbf{V}\mathbf{I}^* = P + jQ$.`,
        {
          type: 'phasor',
          alt: 'The power triangle: real power of 4 kW along the reference, reactive power of 3 kvar upward from its tip, and apparent power of 5 kVA along the hypotenuse at an angle theta.',
          caption: 'The power triangle of a lagging load: 4 kW and 3 kvar make 5 kVA at a power factor of 0.8.',
          axes: false,
          vectors: [
            { name: 'P', mag: 4, angle: 0, label: 'P' },
            { mag: 3, angle: 90, from: 'P', label: 'Q' },
            { mag: 5, angle: 36.87, label: 'S', colour: 2 },
          ],
          arcs: [{ from: 0, to: 36.87, label: 'θ', r: 40 }],
        },
        r`| | Formula | Unit |
|---|---|---|
| Real power | $P = VI\cos\theta = I^2R$ | W |
| Reactive power | $Q = VI\sin\theta = I^2X$ | var |
| Apparent power | $S = VI = I^2\lvert Z\rvert$ | VA |
| Power factor | $\cos\theta = \frac{P}{S} = \frac{R}{\lvert Z\rvert}$ | none |`,
        r`Complex power is conserved: the source supplies the sum of every load's P and the sum of every load's Q. Loads in parallel therefore add as $\mathbf{S} = \sum(P_k + jQ_k)$; their volt-amperes add directly only when their power factors are equal.`,
      ],
      keyIdeas: [
        r`$P = VI\cos\theta$ (W), $Q = VI\sin\theta$ (var), $S = VI$ (VA); $\mathbf{S} = \mathbf{V}\mathbf{I}^* = P + jQ$.`,
        r`Power factor $\cos\theta$: lagging for inductive loads, leading for capacitive.`,
        r`Complex power is conserved: the source's S is the sum of the loads'.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One load',
          problem: r`A 230 V supply feeds a load of $10 + j5$ Ω. Find the current, P, Q, S and the power factor.`,
          steps: [
            r`$\lvert Z\rvert = \sqrt{10^2 + 5^2} = 11.18$ Ω, so $I = \frac{230}{11.18} = 20.57$ A.`,
            r`$P = I^2R = 423.2 \times 10 = 4232$ W and $Q = I^2X = 423.2 \times 5 = 2116$ var.`,
            r`$S = VI = 230 \times 20.57 = 4732$ VA, and the power factor is $\frac{10}{11.18} = 0.894$ lagging.`,
          ],
          answer: r`20.57 A; 4232 W, 2116 var, 4732 VA at 0.894 lagging.`,
        },
        {
          level: 'basic',
          title: 'Power factor from meter readings',
          problem: r`A motor on 230 V draws 8 A and takes 1.5 kW. Find its power factor and reactive power.`,
          steps: [
            r`$S = 230 \times 8 = 1840$ VA, so the power factor is $\frac{1500}{1840} = 0.815$.`,
            r`$Q = \sqrt{1840^2 - 1500^2} = 1066$ var.`,
          ],
          answer: r`0.815 lagging, drawing 1066 var.`,
        },
        {
          level: 'board',
          title: 'Two loads on one supply',
          problem: r`A 230 V supply feeds two loads: 5 kW at 0.8 lagging and 3 kW at 0.6 leading. Find the total kVA, the power factor and the current.`,
          steps: [
            r`Load 1: $Q_1 = 5\tan36.87^\circ = 3.75$ kvar. Load 2: $Q_2 = -3\tan53.13^\circ = -4$ kvar.`,
            r`Totals: $P = 8$ kW and $Q = -0.25$ kvar, so $S = \sqrt{8^2 + 0.25^2} = 8.004$ kVA.`,
            r`Power factor $\frac{8}{8.004} = 0.9995$ leading; current $\frac{8004}{230} = 34.80$ A.`,
          ],
          answer: r`8.004 kVA at 0.9995 leading, 34.80 A.`,
        },
      ],
      traps: [
        r`With peak values, $P = \frac{V_mI_m}{2}\cos\theta$, not $V_mI_m\cos\theta$.`,
        r`Loads in parallel: add P and Q separately; their kVA add directly only at equal power factors.`,
      ],
      check: [
        { q: r`A 40 kVA load runs at 0.8 lagging. How much real and reactive power does it take?`, a: r`32 kW and 24 kvar.` },
        { q: r`How much real power does a pure inductor take?`, a: r`None: $P = VI\cos90^\circ = 0$. It only exchanges reactive power.` },
      ],
    },
    {
      name: 'Power Factor Correction',
      inShort: r`Adding capacitors to cancel a load's reactive power.`,
      body: [
        r`A lagging load draws more current than its real power needs, $I = \frac{P}{V\cos\theta}$. The extra current heats wires and transformers, uses up their capacity and drops voltage, and distribution utilities penalise a low power factor. A capacitor in parallel supplies the reactive power locally, so the line carries only what is left; the real power does not change.`,
        {
          type: 'phasor',
          alt: 'Power triangles before and after correction: 100 kW along the reference; the uncorrected 102 kvar rising from its tip to apparent power S1 at 45.6 degrees; the capacitor’s 69 kvar coming back down, leaving S2 at 18.2 degrees.',
          caption: 'Correcting 100 kW from 0.70 to 0.95 lagging: the capacitor’s kvar takes the triangle down from the first apparent power to the second.',
          axes: false,
          vectors: [
            { name: 'P', mag: 100, angle: 0, label: 'P' },
            { name: 'Q1', mag: 102.02, angle: 90, from: 'P', label: 'Q_1' },
            { mag: 69.15, angle: -90, from: 'Q1', label: 'Q_C', dashed: true, colour: 3 },
            { mag: 142.86, angle: 45.57, label: 'S_1', colour: 1 },
            { mag: 105.26, angle: 18.19, label: 'S_2', colour: 2 },
          ],
        },
        r`The capacitor must supply $Q_C = P(\tan\theta_1 - \tan\theta_2)$. In single phase it is $C = \frac{Q_C}{\omega V^2}$. A three-phase bank supplying $Q_C$ in total needs $C_Y = \frac{Q_C}{\omega V_L^2}$ per phase in wye, or $C_\Delta = \frac{Q_C}{3\omega V_L^2}$ per phase in delta, a third as much, because each delta capacitor sees the full line voltage.`,
        r`Correcting all the way to unity costs far more capacitor than stopping near 0.95, for little gain, and over-correcting makes the load leading and raises the voltage at light load. Banks are often switched in steps to follow the load.`,
      ],
      keyIdeas: [
        r`$Q_C = P(\tan\theta_1 - \tan\theta_2)$; the real power is unchanged.`,
        r`$C = \frac{Q_C}{\omega V^2}$ (single phase); delta-connected banks need a third of the wye capacitance.`,
        r`Better power factor means less current: smaller conductors, lower losses, no utility penalty.`,
      ],
      examples: [
        {
          level: 'board',
          title: 'Sizing the capacitor',
          problem: r`A 100 kW load runs at 0.70 lagging. What capacitor kvar raises it to 0.95, and what capacitance is that at 230 V, 60 Hz single phase?`,
          steps: [
            r`$\theta_1 = \cos^{-1}0.70 = 45.57^\circ$ and $\theta_2 = \cos^{-1}0.95 = 18.19^\circ$.`,
            r`$Q_C = 100(1.0202 - 0.3287) = 69.15$ kvar.`,
            r`$C = \frac{69\,150}{377 \times 230^2} = 3.47$ mF.`,
          ],
          answer: r`69.15 kvar, which is 3.47 mF at 230 V.`,
        },
        {
          level: 'board',
          title: 'What the correction saves',
          problem: r`For that load at 230 V, find the line current before and after correction, and the change in the line's I²R loss.`,
          steps: [
            r`Before: $\frac{100\,000}{230 \times 0.70} = 621.1$ A. After: $\frac{100\,000}{230 \times 0.95} = 457.7$ A.`,
            r`Loss goes as current squared: $\left(\frac{457.7}{621.1}\right)^2 = 0.543$.`,
          ],
          answer: r`621.1 A down to 457.7 A, and the line loss falls by 45.7%.`,
        },
        {
          level: 'board',
          title: 'A three-phase bank',
          problem: r`A 400 V, 60 Hz three-phase plant takes 150 kW at 0.75 lagging. Find the kvar to reach 0.92 lagging, and the capacitance per phase of a delta bank.`,
          steps: [
            r`$\tan\theta_1 = 0.8819$ and $\tan\theta_2 = 0.4260$: $Q_C = 150(0.8819 - 0.4260) = 68.39$ kvar.`,
            r`Delta: $C_\Delta = \frac{68\,390}{3 \times 377 \times 400^2} = 378$ µF per phase.`,
          ],
          answer: r`68.39 kvar, with 378 µF in each leg of the delta.`,
        },
      ],
      traps: [
        r`Correcting to unity costs far more capacitor than to 0.95, for little gain.`,
        r`Use the line voltage for a delta bank and the phase voltage for a wye bank's capacitor.`,
      ],
      check: [
        { q: r`A load's power factor is raised from 0.8 to 1.0. What happens to its real power?`, a: r`Nothing: P is unchanged, while the current and kVA fall.` },
        { q: r`A delta bank and a wye bank give the same kvar on one line voltage. How do their capacitances compare?`, a: r`Each delta capacitor is a third of a wye one, since it sees $\sqrt3$ times the voltage.` },
      ],
    },
    {
      name: 'Maximum Power in AC',
      inShort: r`The load that takes the most power from an ac source.`,
      body: [
        r`A source with Thévenin equivalent $\mathbf{V}_{th}$ and $Z_{th} = R_{th} + jX_{th}$ gives the most power to the load $Z_L = Z_{th}^* = R_{th} - jX_{th}$, its complex conjugate. The reactances cancel, leaving a matched resistive loop, and $P_{max} = \frac{\lvert V_{th}\rvert^2}{4R_{th}}$ with RMS values.`,
        {
          type: 'circuit',
          alt: 'An ac source with its Thévenin resistance and inductive reactance in series, feeding a load made of a resistance and a capacitive reactance at terminals a and b.',
          caption: 'A source impedance R plus jX, and a load whose capacitive reactance can cancel it.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'V_{th}'],
            ['R', [0, 0], [2, 0], 'R_{th}'],
            ['L', [2, 0], [4, 0], 'jX_{th}'],
            ['wire', [4, 0], [5, 0]],
            ['R', [5, 0], [5, 1], 'R_L'],
            ['C', [5, 1], [5, 2], '−jX_L'],
            ['wire', [5, 2], [0, 2]],
          ],
          nodes: [{ at: [4, 0], label: 'a' }, { at: [4, 2], label: 'b', side: 'se' }],
        },
        r`When the load can't take any value, the best choice changes:`,
        r`| The load can be | Best choice |
|---|---|
| any impedance | $Z_L = Z_{th}^*$, giving $\frac{V_{th}^2}{4R_{th}}$ |
| a resistor only | $R_L = \lvert Z_{th}\rvert = \sqrt{R_{th}^2 + X_{th}^2}$ |
| a resistor in series with a fixed $X_L$ | $R_L = \sqrt{R_{th}^2 + (X_{th} + X_L)^2}$ |`,
      ],
      keyIdeas: [
        r`Conjugate match $Z_L = Z_{th}^*$: $P_{\max} = \frac{|V_{th}|^2}{4R_{th}}$ (RMS).`,
        r`If the load must be resistive, $R_L = |Z_{th}|$.`,
        r`If only the load resistance can change, it still equals $\sqrt{R_{th}^2 + (X_{th} + X_L)^2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Conjugate and resistive loads',
          problem: r`$V_{th} = 100$ V RMS and $Z_{th} = 6 + j8$ Ω. Find the best load and its power, then the best purely resistive load.`,
          steps: [
            r`Conjugate: $Z_L = 6 - j8$ Ω, taking $\frac{100^2}{4 \times 6} = 416.7$ W.`,
            r`Resistive: $R_L = \sqrt{6^2 + 8^2} = 10$ Ω, taking $\frac{100^2 \times 10}{(6 + 10)^2 + 8^2} = 312.5$ W.`,
          ],
          answer: r`$6 - j8$ Ω takes 416.7 W; the best resistor, 10 Ω, takes 312.5 W.`,
        },
        {
          level: 'board',
          title: 'A load with a fixed reactance',
          problem: r`$V_{th} = 50$ V and $Z_{th} = 4 + j6$ Ω. The load is a fixed $-j2$ Ω capacitor in series with an adjustable resistor. Find the best resistance and the power.`,
          steps: [
            r`$R_L = \sqrt{4^2 + (6 - 2)^2} = 5.657$ Ω.`,
            r`$P = \frac{50^2 \times 5.657}{(4 + 5.657)^2 + 4^2} = 129.4$ W.`,
          ],
          answer: r`5.66 Ω, taking 129.4 W.`,
        },
      ],
      traps: [
        r`The conjugate cancels the reactance; matching $Z_L = Z_{th}$ (not conjugate) doubles the reactance instead.`,
        r`At a conjugate match the efficiency is still only 50%.`,
      ],
      check: [
        { q: r`$Z_{th} = 3 - j4$ Ω. What load takes the most power?`, a: r`$3 + j4$ Ω.` },
        { q: r`Under a conjugate match, what share of the source's power reaches the load?`, a: r`Half, as with dc.` },
      ],
    },
    {
      name: 'Series and Parallel Resonance',
      inShort: r`Where inductive and capacitive reactance cancel.`,
      body: [
        r`In a series RLC circuit the inductive and capacitive reactances cancel at one frequency, $\omega_0 = \frac{1}{\sqrt{LC}}$, that is $f_0 = \frac{1}{2\pi\sqrt{LC}}$. There the impedance is just R, its smallest, so the current peaks at $\frac{V}{R}$ in phase with the voltage: unity power factor.`,
        {
          type: 'plot',
          alt: 'Current against angular frequency for a series RLC on 10 V: a sharp peak of 1 A at 1000 rad/s, falling to 0.707 A at about 951 and 1051 rad/s.',
          caption: 'Current in a series RLC (10 Ω, 0.1 H, 10 µF) on 10 V: the peak is at resonance, and the bandwidth lies between the half-power points.',
          x: [700, 1300],
          y: [0, 1.15],
          xLabel: 'ω (rad/s)',
          yLabel: 'I (A)',
          series: [{ f: (w) => 10 / Math.hypot(10, 0.1 * w - 1 / (1e-5 * w)), label: 'I', area: true }],
          marks: [{ at: [1000, 1], label: '1 A at 1000 rad/s' }, { y: Math.SQRT1_2, label: 'half power' }],
        },
        r`How sharp the peak is sets the **quality factor**, $Q = \frac{\omega_0L}{R} = \frac{1}{R}\sqrt{\frac{L}{C}}$. The half-power points lie where the current falls to $\frac{1}{\sqrt2}$ of its peak; between them is the bandwidth $BW = \omega_2 - \omega_1 = \frac{\omega_0}{Q} = \frac{R}{L}$, with $\omega_0 = \sqrt{\omega_1\omega_2}$. At resonance each reactance carries Q times the source voltage.`,
        r`A parallel (tank) circuit is the dual: at resonance its impedance is largest and the line current smallest, while a large current circulates between L and C. With a coil of resistance R in parallel with C, resonance is at $\omega_0 = \sqrt{\frac{1}{LC} - \frac{R^2}{L^2}}$, where the impedance is $\frac{L}{RC}$.`,
        r`| At resonance | Series RLC | Parallel (tank) |
|---|---|---|
| Impedance | smallest, R | largest, $\frac{L}{RC}$ |
| Line current | largest | smallest |
| Magnified | voltage on L and C, Q times | current in L and C, Q times |
| Power factor | unity | unity |`,
      ],
      keyIdeas: [
        r`$\omega_0 = \frac{1}{\sqrt{LC}}$. Series: minimum impedance (R), maximum current; parallel: maximum impedance.`,
        r`Series $Q = \frac{\omega_0L}{R}$; parallel $Q = \frac{R}{\omega_0L}$; $BW = \frac{\omega_0}{Q}$, $\omega_0 = \sqrt{\omega_1\omega_2}$.`,
        r`At series resonance each reactance carries Q times the source voltage.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Resonance, Q and bandwidth',
          problem: r`A series circuit has R = 10 Ω, L = 0.1 H and C = 10 µF. Find $\omega_0$, $f_0$, Q and the bandwidth.`,
          steps: [
            r`$\omega_0 = \frac{1}{\sqrt{0.1 \times 10^{-5}}} = 1000$ rad/s, so $f_0 = \frac{1000}{2\pi} = 159.2$ Hz.`,
            r`$Q = \frac{1000 \times 0.1}{10} = 10$, and $BW = \frac{1000}{10} = 100$ rad/s (15.92 Hz).`,
          ],
          answer: r`1000 rad/s (159.2 Hz), Q = 10, bandwidth 100 rad/s.`,
        },
        {
          level: 'board',
          title: 'Magnified voltage and the half-power points',
          problem: r`That circuit is on 10 V at resonance. Find the current, the capacitor's voltage, and the half-power frequencies.`,
          steps: [
            r`$I = \frac{10}{10} = 1$ A, and $V_C = IX_C = 1 \times 100 = 100$ V, which is Q times 10 V.`,
            r`$\omega_{1,2} = \sqrt{\omega_0^2 + \left(\frac{BW}{2}\right)^2} \mp \frac{BW}{2} = 1001.25 \mp 50$, that is 951.2 and 1051.2 rad/s.`,
            r`In hertz: 151.4 Hz and 167.3 Hz.`,
          ],
          answer: r`1 A, 100 V on the capacitor, half power at 151.4 Hz and 167.3 Hz.`,
        },
        {
          level: 'board',
          title: 'A tank circuit',
          problem: r`A coil of 0.1 H and 20 Ω is in parallel with a 10 µF capacitor. Find the resonant frequency and the impedance at resonance.`,
          steps: [
            r`$\omega_0 = \sqrt{\frac{1}{0.1 \times 10^{-5}} - \frac{20^2}{0.1^2}} = \sqrt{960\,000} = 979.8$ rad/s, which is 155.9 Hz.`,
            r`$Z = \frac{L}{RC} = \frac{0.1}{20 \times 10^{-5}} = 500$ Ω, resistive.`,
          ],
          answer: r`155.9 Hz, where the tank looks like 500 Ω.`,
        },
      ],
      traps: [
        r`A high-Q series circuit can put hundreds of volts on L and C from a small source.`,
        r`The coil's resistance shifts a tank's resonance below $\frac{1}{2\pi\sqrt{LC}}$.`,
      ],
      check: [
        { q: r`A series RLC with Q = 20 is on 12 V at resonance. What is the capacitor's voltage?`, a: r`$20 \times 12 = 240$ V.` },
        { q: r`Doubling C in a series resonant circuit changes $f_0$ how?`, a: r`It divides it by $\sqrt2$.` },
      ],
    },
    {
      name: 'Magnetically Coupled Circuits',
      inShort: r`Coils that share magnetic flux, and the linear transformer.`,
      body: [
        r`Two coils that share magnetic flux induce voltages in each other: $v_1 = L_1\frac{di_1}{dt} \pm M\frac{di_2}{dt}$. The **mutual inductance** is $M = k\sqrt{L_1L_2}$, where the coupling coefficient $k$ runs from 0 (no shared flux) to 1 (all of it). Dots on the drawing fix the sign: currents entering both dotted ends make the mutual voltage add (+M); one in and one out make it subtract (−M).`,
        {
          type: 'circuit',
          alt: 'Two coupled coils: an ac source drives coil L1, which shares flux M with coil L2 feeding a load; a dot marks the top end of each coil.',
          caption: 'A linear transformer: two coils coupled by M, with dots at their like ends.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'V_1'],
            ['wire', [0, 0], [2, 0]],
            ['L', [2, 0], [2, 2], 'L_1', { side: 'left' }],
            ['wire', [2, 2], [0, 2]],
            ['L', [3, 0], [3, 2], 'L_2'],
            ['wire', [3, 0], [5, 0]],
            ['R', [5, 0], [5, 2], 'Z_L'],
            ['wire', [5, 2], [3, 2]],
            ['pole', [2, 0.5], 'right'],
            ['pole', [3, 0.5], 'left'],
            ['text', [2.5, 1], 'M'],
          ],
        },
        r`Coupled coils in series give $L = L_1 + L_2 + 2M$ when aiding (fluxes add) and $L_1 + L_2 - 2M$ when opposing, so measuring both gives $M = \frac{L_{aid} - L_{opp}}{4}$. The energy stored is $\frac12L_1i_1^2 + \frac12L_2i_2^2 \pm Mi_1i_2$.`,
        r`A load on the secondary appears in the primary as a **reflected impedance**: $Z_{in} = Z_1 + \frac{\omega^2M^2}{Z_2 + Z_L}$, with $Z_1$ and $Z_2$ the coils' own impedances. For an ideal transformer (k = 1, no losses) this becomes $Z_{in} = a^2Z_L$ with turns ratio $a = \frac{N_1}{N_2}$.`,
      ],
      keyIdeas: [
        r`$v_1 = L_1\frac{di_1}{dt} \pm M\frac{di_2}{dt}$, with the sign from the dot convention; $M = k\sqrt{L_1L_2}$, $k \le 1$.`,
        r`Series aiding $L_1 + L_2 + 2M$, opposing $L_1 + L_2 - 2M$; energy $\frac12L_1i_1^2 + \frac12L_2i_2^2 \pm Mi_1i_2$.`,
        r`Linear transformer: $Z_{in} = Z_1 + \frac{\omega^2M^2}{Z_2 + Z_L}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Coupling and series connections',
          problem: r`Coils of 0.2 H and 0.5 H have M = 0.25 H. Find k and the total inductance in series aiding and opposing.`,
          steps: [
            r`$k = \frac{0.25}{\sqrt{0.2 \times 0.5}} = 0.791$.`,
            r`Aiding: $0.2 + 0.5 + 2 \times 0.25 = 1.2$ H. Opposing: $0.7 - 0.5 = 0.2$ H.`,
          ],
          answer: r`k = 0.791; 1.2 H aiding and 0.2 H opposing.`,
        },
        {
          level: 'board',
          title: 'M from two measurements',
          problem: r`Two coils in series measure 1.2 H one way round and 0.4 H the other. One coil alone is 0.5 H. Find M, the other coil and k.`,
          steps: [
            r`$M = \frac{1.2 - 0.4}{4} = 0.2$ H.`,
            r`$L_1 + L_2 = 1.2 - 2 \times 0.2 = 0.8$ H, so the other coil is 0.3 H.`,
            r`$k = \frac{0.2}{\sqrt{0.5 \times 0.3}} = 0.516$.`,
          ],
          answer: r`M = 0.2 H, the other coil 0.3 H, k = 0.516.`,
        },
        {
          level: 'board',
          title: 'A reflected impedance',
          problem: r`At ω = 100 rad/s, a primary of 0.1 H and 2 Ω is coupled by M = 0.1 H to a secondary of 0.2 H and 1 Ω feeding a 9 Ω load. Find the input impedance.`,
          steps: [
            r`$Z_1 = 2 + j10$ Ω and $Z_2 + Z_L = 1 + j20 + 9 = 10 + j20$ Ω.`,
            r`Reflected: $\frac{\omega^2M^2}{Z_2 + Z_L} = \frac{100}{10 + j20} = 2 - j4$ Ω.`,
            r`$Z_{in} = (2 + j10) + (2 - j4) = 4 + j6$ Ω.`,
          ],
          answer: r`$Z_{in} = 4 + j6$ Ω.`,
        },
      ],
      traps: [
        r`Currents both entering dotted ends give $+M$; one in, one out gives $-M$.`,
        r`A reflected impedance has its reactance's sign reversed: an inductive secondary looks capacitive from the primary.`,
      ],
      check: [
        { q: r`k = 0.5, $L_1 = 4$ mH and $L_2 = 9$ mH. What is M?`, a: r`$0.5\sqrt{36} = 3$ mH.` },
        { q: r`An ideal 10:1 transformer feeds an 8 Ω load. What does the primary see?`, a: r`$10^2 \times 8 = 800$ Ω.` },
      ],
    },
    {
      name: 'Balanced Three-Phase Systems',
      inShort: r`Three equal voltages 120° apart: wye and delta connections and their power.`,
      body: [
        r`A three-phase source produces three equal voltages 120° apart. In the positive (abc) sequence, $\mathbf{V}_{an} = V_p\angle0^\circ$, $\mathbf{V}_{bn} = V_p\angle-120^\circ$ and $\mathbf{V}_{cn} = V_p\angle120^\circ$. They sum to zero, so a balanced load returns no neutral current, and the total power is constant through the cycle, which is why three-phase motors run smoothly.`,
        {
          type: 'phasor',
          alt: 'The three phase voltages of equal length 120 degrees apart, and the line voltage from a to b, root three times longer, leading phase a by 30 degrees.',
          caption: 'Phase voltages 120° apart; the line voltage from a to b is √3 times longer and leads by 30°.',
          axes: false,
          vectors: [
            { mag: 1, angle: 0, label: 'V_{an}' },
            { mag: 1, angle: -120, label: 'V_{bn}' },
            { mag: 1, angle: 120, label: 'V_{cn}' },
            { mag: Math.sqrt(3), angle: 30, label: 'V_{ab}', colour: 1, dashed: true },
          ],
          arcs: [{ from: 0, to: 30, label: '30°', r: 46 }],
        },
        r`| | Wye (Y) | Delta (Δ) |
|---|---|---|
| Voltage | $V_L = \sqrt3V_p$, leading by 30° | $V_L = V_p$ |
| Current | $I_L = I_p$ | $I_L = \sqrt3I_p$, lagging by 30° |
| Power | $P = \sqrt3V_LI_L\cos\theta = 3V_pI_p\cos\theta$ | the same |`,
        r`To solve a balanced system, work one phase: turn any delta into its equivalent wye ($Z_Y = \frac{Z_\Delta}{3}$), draw the per-phase circuit from line to neutral at $\frac{V_L}{\sqrt3}$, and multiply the power by three. The θ in the power formulas is the angle of the load impedance, between phase voltage and phase current.`,
      ],
      keyIdeas: [
        r`Wye: $V_L = \sqrt3V_p$ (leading 30°), $I_L = I_p$. Delta: $V_L = V_p$, $I_L = \sqrt3I_p$ (lagging 30°).`,
        r`$P = \sqrt3V_LI_L\cos\theta = 3V_pI_p\cos\theta$, θ the angle of the load impedance.`,
        r`Solve one phase of the wye equivalent; a delta load converts with $Z_Y = \frac{Z_\Delta}{3}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A wye load',
          problem: r`A balanced wye load of $8 + j6$ Ω per phase is on a 400 V line. Find the phase current and the total power.`,
          steps: [
            r`$V_p = \frac{400}{\sqrt3} = 230.9$ V and $\lvert Z\rvert = 10$ Ω, so $I = 23.09$ A.`,
            r`$P = 3I^2R = 3 \times 23.09^2 \times 8 = 12\,800$ W, at a power factor of 0.8.`,
          ],
          answer: r`23.09 A per phase and line; 12.8 kW.`,
        },
        {
          level: 'board',
          title: 'A delta load',
          problem: r`A balanced delta load of $12 + j9$ Ω per phase is on a 400 V line. Find the phase current, the line current and the total power.`,
          steps: [
            r`Each phase sees the full 400 V: $I_p = \frac{400}{15} = 26.67$ A.`,
            r`$I_L = \sqrt3 \times 26.67 = 46.19$ A.`,
            r`$P = 3 \times 26.67^2 \times 12 = 25\,600$ W. Check: $\sqrt3 \times 400 \times 46.19 \times 0.8 = 25\,600$ W.`,
          ],
          answer: r`26.67 A in each phase, 46.19 A in each line, 25.6 kW.`,
        },
      ],
      traps: [
        r`θ in the power formula is the load's impedance angle, not the 30° between line and phase voltages.`,
        r`A three-phase rating is total: $S = \sqrt3V_LI_L$, never $V_LI_L$.`,
      ],
      check: [
        { q: r`A 13.8 kV three-phase feeder supplies 5 MVA. What is the line current?`, a: r`$\frac{5 \times 10^6}{\sqrt3 \times 13\,800} = 209.2$ A.` },
        { q: r`Three 30 Ω resistors in delta: what is the equivalent wye?`, a: r`10 Ω per phase.` },
      ],
    },
    {
      name: 'Unbalanced Three-Phase Systems',
      inShort: r`Unequal loads: neutral current and neutral shift.`,
      body: [
        r`Unequal phase loads break the symmetry: the line currents differ in size and in their 120° spacing. With a solid neutral, each phase still sees its own source voltage and is solved alone, and the neutral carries the phasor sum $\mathbf{I}_N = \mathbf{I}_a + \mathbf{I}_b + \mathbf{I}_c$.`,
        {
          type: 'phasor',
          alt: 'The neutral current as a phasor sum: phase currents of 10 A at 0 degrees, 10 A at minus 120 degrees and 5 A at 120 degrees drawn tip to tail, closing on a neutral current of 5 A at minus 60 degrees.',
          caption: 'Adding the three line currents tip to tail: what is left over is the neutral current.',
          axes: true,
          vectors: [
            { name: 'a', mag: 10, angle: 0, label: 'I_a' },
            { name: 'b', mag: 10, angle: -120, from: 'a', label: 'I_b' },
            { mag: 5, angle: 120, from: 'b', label: 'I_c' },
            { mag: 5, angle: -60, label: 'I_N', colour: 3, dashed: true },
          ],
        },
        r`Without a neutral (a three-wire wye), the load's star point floats away from the source's. Millman's theorem gives the shift, $\mathbf{V}_{N'N} = \frac{\mathbf{V}_aY_a + \mathbf{V}_bY_b + \mathbf{V}_cY_c}{Y_a + Y_b + Y_c}$, and each phase then sees $\mathbf{V}_k - \mathbf{V}_{N'N}$: the lightly loaded phases can get far more than their rated voltage.`,
        r`An unbalanced delta needs no such step: find each phase current from its line voltage, then each line current by KCL at the corners, such as $\mathbf{I}_a = \mathbf{I}_{ab} - \mathbf{I}_{ca}$.`,
      ],
      keyIdeas: [
        r`With a solid neutral each phase is solved alone; $\mathbf{I}_N = \mathbf{I}_a + \mathbf{I}_b + \mathbf{I}_c$.`,
        r`Without a neutral the load's star point shifts: Millman $\mathbf{V}_{N'N} = \frac{\sum\mathbf{V}_kY_k}{\sum Y_k}$.`,
        r`Unbalanced delta loads: find phase currents, then line currents by KCL.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The neutral current',
          problem: r`Phase currents are $10\angle0^\circ$, $10\angle-120^\circ$ and $5\angle120^\circ$ A. Find the neutral current.`,
          steps: [
            r`$10\angle0^\circ + 10\angle-120^\circ = 5 - j8.66 = 10\angle-60^\circ$.`,
            r`Adding $5\angle120^\circ = -2.5 + j4.33$ leaves $2.5 - j4.33$.`,
          ],
          answer: r`$\mathbf{I}_N = 5\angle-60^\circ$ A.`,
        },
        {
          level: 'board',
          title: 'An unbalanced delta',
          problem: r`A 240 V abc system feeds a resistive delta: 24 Ω across ab, 30 Ω across bc and 40 Ω across ca. Find the current in line a.`,
          steps: [
            r`With $\mathbf{V}_{ab} = 240\angle0^\circ$: $\mathbf{I}_{ab} = 10\angle0^\circ$ A and $\mathbf{I}_{ca} = \frac{240\angle120^\circ}{40} = 6\angle120^\circ$ A.`,
            r`KCL at a: $\mathbf{I}_a = \mathbf{I}_{ab} - \mathbf{I}_{ca} = 10 - (-3 + j5.196) = 13 - j5.196$ A.`,
          ],
          answer: r`$\mathbf{I}_a = 14.0\angle-21.79^\circ$ A.`,
        },
        {
          level: 'board',
          title: 'A floating neutral',
          problem: r`A three-wire 208 V abc system feeds a wye of 10 Ω (phase a), 20 Ω (b) and 20 Ω (c), with no neutral. Find the neutral shift and the voltage across each resistor.`,
          steps: [
            r`$V_p = \frac{208}{\sqrt3} = 120.1$ V. Since $\mathbf{V}_b + \mathbf{V}_c = -\mathbf{V}_a$, Millman gives $\mathbf{V}_{N'N} = \frac{0.1\mathbf{V}_a - 0.05\mathbf{V}_a}{0.2} = 0.25\mathbf{V}_a = 30.02\angle0^\circ$ V.`,
            r`Phase a: $0.75 \times 120.1 = 90.07$ V.`,
            r`Phase b: $120.1\angle-120^\circ - 30.02 = -90.07 - j104.0$, which is 137.6 V; phase c the same.`,
          ],
          answer: r`The star point shifts 30.0 V toward a; a gets 90.1 V while b and c get 137.6 V each.`,
        },
      ],
      traps: [
        r`An open neutral on an unbalanced load can put far more than the phase voltage across lightly loaded phases.`,
        r`Neutral current is a phasor sum: three 10 A currents can sum to 0 or to 30 A depending on their angles.`,
      ],
      check: [
        { q: r`With a solid neutral, three equal phase currents 120° apart give what neutral current?`, a: r`None.` },
        { q: r`Which sequence component can flow in a neutral?`, a: r`Only zero sequence: $\mathbf{I}_N = 3\mathbf{I}_0$.` },
      ],
    },
    {
      name: 'Three-Phase Power Measurement',
      inShort: r`Measuring three-phase power with wattmeters.`,
      body: [
        r`**Blondel's theorem**: a system of n wires needs n − 1 wattmeters, each with its current coil in one line and its potential coil from that line to the remaining common line. A four-wire system takes three (one per phase to neutral); a three-wire system, balanced or not, takes two.`,
        {
          type: 'circuit',
          alt: 'The two-wattmeter method on a three-wire line: wattmeter W1 in line a and wattmeter W2 in line c, with line b running straight through to the load.',
          caption: 'Two wattmeters on a three-wire line: current coils in lines a and c, potential coils to line b.',
          parts: [
            ['wire', [0, 0], [1.5, 0]],
            ['wattmeter', [1.5, 0], [2.5, 0], 'W_1'],
            ['wire', [2.5, 0], [4.5, 0]],
            ['wire', [0, 1], [4.5, 1]],
            ['wire', [0, 2], [1.5, 2]],
            ['wattmeter', [1.5, 2], [2.5, 2], 'W_2', { side: 'below' }],
            ['wire', [2.5, 2], [4.5, 2]],
            ['load', [4.5, 0], [5.5, 0]],
            ['load', [4.5, 1], [5.5, 1]],
            ['load', [4.5, 2], [5.5, 2]],
          ],
          nodes: [{ at: [0, 0], label: 'a', side: 'nw' }, { at: [0, 1], label: 'b', side: 'nw' }, { at: [0, 2], label: 'c', side: 'nw' }],
        },
        r`For a balanced load of power-factor angle θ, the two readings are $V_LI_L\cos(30^\circ + \theta)$ and $V_LI_L\cos(30^\circ - \theta)$. Their sum is the power and their difference gives the reactive power: $P = W_1 + W_2$, $Q = \sqrt3(W_2 - W_1)$, so $\tan\theta = \sqrt3\frac{W_2 - W_1}{W_1 + W_2}$.`,
        {
          type: 'plot',
          alt: 'The two wattmeter readings against the power-factor angle: one rises to a peak at 30 degrees then falls; the other falls steadily, reaching zero at 60 degrees and going negative beyond.',
          caption: 'The two readings (per unit of line voltage times line current) as the power factor falls: one reaches zero at 60°, a power factor of 0.5.',
          x: [0, 90],
          y: [-0.6, 1.1],
          xLabel: 'θ (°)',
          yLabel: 'W',
          series: [
            { f: (t) => Math.cos((30 - t) * deg), label: 'W_2' },
            { f: (t) => Math.cos((30 + t) * deg), label: 'W_1', dashed: true },
          ],
          marks: [{ x: 60, label: 'pf 0.5' }],
        },
        r`| Power factor | The two readings |
|---|---|
| 1 | equal |
| above 0.5 | both positive |
| 0.5 | one reads zero |
| below 0.5 | one reads negative: reverse its coil and subtract |`,
      ],
      keyIdeas: [
        r`Blondel: n wires need n − 1 wattmeters. Three-wire: the two-wattmeter method, $P = W_1 + W_2$.`,
        r`Balanced load: $\tan\theta = \sqrt3\frac{W_2 - W_1}{W_1 + W_2}$.`,
        r`At pf 0.5 one reading is zero; below it, one reads negative.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Power factor from two readings',
          problem: r`Two wattmeters on a balanced load read 4 kW and 8 kW. Find the power and the power factor.`,
          steps: [
            r`$P = 4 + 8 = 12$ kW.`,
            r`$\tan\theta = \sqrt3 \times \frac{8 - 4}{12} = 0.5774$, so $\theta = 30^\circ$ and the power factor is 0.866.`,
          ],
          answer: r`12 kW at a power factor of 0.866.`,
        },
        {
          level: 'board',
          title: 'Predicting the readings',
          problem: r`A balanced load takes 30 kW at 0.6 lagging. What do the two wattmeters read?`,
          steps: [
            r`$Q = 30\tan53.13^\circ = 40$ kvar, so $W_2 - W_1 = \frac{40}{\sqrt3} = 23.09$ kW, while $W_1 + W_2 = 30$ kW.`,
            r`$W_2 = \frac{30 + 23.09}{2} = 26.55$ kW and $W_1 = 30 - 26.55 = 3.45$ kW.`,
          ],
          answer: r`26.55 kW and 3.45 kW.`,
        },
        {
          level: 'board',
          title: 'A negative reading',
          problem: r`On a balanced load one wattmeter reads 6 kW and the other reads 2 kW only after its coil is reversed. Find P, Q and the power factor.`,
          steps: [
            r`The reversed reading counts negative: $P = 6 - 2 = 4$ kW.`,
            r`$Q = \sqrt3(6 + 2) = 13.86$ kvar, so $\tan\theta = 3.464$ and $\theta = 73.9^\circ$.`,
          ],
          answer: r`4 kW and 13.86 kvar, at a power factor of 0.277.`,
        },
      ],
      traps: [
        r`A negative reading must be SUBTRACTED, not added as positive.`,
        r`The tangent formula holds only for balanced loads; P = W₁ + W₂ holds for any three-wire load.`,
      ],
      check: [
        { q: r`How many wattmeters does an unbalanced four-wire system need?`, a: r`Three.` },
        { q: r`The two wattmeters read the same. What is the power factor?`, a: r`Unity.` },
      ],
    },
    {
      name: 'Symmetrical Components',
      inShort: r`Breaking an unbalanced set into balanced sequence sets.`,
      body: [
        r`Fortescue showed that any three unbalanced phasors are the sum of three balanced sets: a **positive-sequence** set (abc, the normal rotation), a **negative-sequence** set (acb, rotating the other way) and a **zero-sequence** set (three equal phasors in phase). The operator $a = 1\angle120^\circ$ turns a phasor through 120°, with $1 + a + a^2 = 0$ and $a^3 = 1$.`,
        {
          type: 'phasor',
          alt: 'A positive-sequence set: phase a at 0 degrees, phase b at minus 120 degrees and phase c at plus 120 degrees, all equal.',
          caption: 'Positive sequence: a, then b 120° behind, then c.',
          axes: false,
          vectors: [
            { mag: 1, angle: 0, label: 'V_{a1}' },
            { mag: 1, angle: -120, label: 'V_{b1}' },
            { mag: 1, angle: 120, label: 'V_{c1}' },
          ],
        },
        {
          type: 'phasor',
          alt: 'A negative-sequence set: phase a at 0 degrees, phase b at plus 120 degrees and phase c at minus 120 degrees, all equal.',
          caption: 'Negative sequence: the same three phasors with b and c swapped, so the set turns the other way.',
          axes: false,
          vectors: [
            { mag: 1, angle: 0, label: 'V_{a2}' },
            { mag: 1, angle: 120, label: 'V_{b2}', colour: 1 },
            { mag: 1, angle: -120, label: 'V_{c2}', colour: 2 },
          ],
        },
        r`$$\mathbf{V}_0 = \tfrac13(\mathbf{V}_a + \mathbf{V}_b + \mathbf{V}_c), \quad \mathbf{V}_1 = \tfrac13(\mathbf{V}_a + a\mathbf{V}_b + a^2\mathbf{V}_c), \quad \mathbf{V}_2 = \tfrac13(\mathbf{V}_a + a^2\mathbf{V}_b + a\mathbf{V}_c)$$`,
        r`And back again: $\mathbf{V}_a = \mathbf{V}_0 + \mathbf{V}_1 + \mathbf{V}_2$, $\mathbf{V}_b = \mathbf{V}_0 + a^2\mathbf{V}_1 + a\mathbf{V}_2$, $\mathbf{V}_c = \mathbf{V}_0 + a\mathbf{V}_1 + a^2\mathbf{V}_2$. Negative-sequence current makes a motor's field turn backward against its rotor, heating it. Zero-sequence current needs a return path (a grounded neutral or the earth), so it can't flow in a three-wire or delta line, and in a neutral it adds up to $\mathbf{I}_N = 3\mathbf{I}_0$. Faults are solved by connecting the three sequence networks (Power System Analysis).`,
      ],
      keyIdeas: [
        r`$\mathbf{V}_0 = \frac13(\mathbf{V}_a + \mathbf{V}_b + \mathbf{V}_c)$, $\mathbf{V}_1 = \frac13(\mathbf{V}_a + a\mathbf{V}_b + a^2\mathbf{V}_c)$, $\mathbf{V}_2 = \frac13(\mathbf{V}_a + a^2\mathbf{V}_b + a\mathbf{V}_c)$, $a = 1\angle120^\circ$.`,
        r`Positive sequence is normal rotation; negative reverses it (heats motors); zero sequence is in phase in all three.`,
        r`Zero-sequence current needs a return path: none in an ungrounded wye or a delta's lines.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One phase alone',
          problem: r`$\mathbf{V}_a = 100\angle0^\circ$ and $\mathbf{V}_b = \mathbf{V}_c = 0$. Find the sequence components.`,
          steps: [
            r`Every formula keeps only the $\mathbf{V}_a$ term: each component is $\frac13 \times 100\angle0^\circ$.`,
          ],
          answer: r`$\mathbf{V}_0 = \mathbf{V}_1 = \mathbf{V}_2 = 33.3\angle0^\circ$ V.`,
        },
        {
          level: 'board',
          title: 'The unbalanced currents, by sequence',
          problem: r`Line currents are $10\angle0^\circ$, $10\angle-120^\circ$ and $5\angle120^\circ$ A (as in Unbalanced Three-Phase Systems). Find the sequence currents.`,
          steps: [
            r`Zero: $\frac13(5\angle-60^\circ) = 1.667\angle-60^\circ$ A.`,
            r`Positive: $a\mathbf{I}_b = 10\angle0^\circ$ and $a^2\mathbf{I}_c = 5\angle360^\circ$, so $\mathbf{I}_1 = \frac13(10 + 10 + 5) = 8.333\angle0^\circ$ A.`,
            r`Negative: $a^2\mathbf{I}_b = 10\angle120^\circ$ and $a\mathbf{I}_c = 5\angle240^\circ$, summing with $\mathbf{I}_a$ to $2.5 + j4.33$: $\mathbf{I}_2 = 1.667\angle60^\circ$ A.`,
            r`Check: $\mathbf{I}_0 + \mathbf{I}_1 + \mathbf{I}_2 = 10\angle0^\circ$, and $3\mathbf{I}_0$ is the neutral current $5\angle-60^\circ$.`,
          ],
          answer: r`$\mathbf{I}_0 = 1.667\angle-60^\circ$, $\mathbf{I}_1 = 8.333\angle0^\circ$, $\mathbf{I}_2 = 1.667\angle60^\circ$ A.`,
        },
      ],
      traps: [
        r`Use $a = 1\angle120^\circ$ and $a^2 = 1\angle240^\circ$; swapping them swaps the positive and negative sequences.`,
        r`Sequence components are a calculation, not separate currents you could meter one at a time.`,
      ],
      check: [
        { q: r`For a balanced abc set, what are $\mathbf{V}_0$ and $\mathbf{V}_2$?`, a: r`Both zero: it is all positive sequence.` },
        { q: r`What is $1 + a + a^2$?`, a: r`Zero.` },
      ],
    },
    {
      name: 'Non-Sinusoidal Waves and Fourier',
      inShort: r`Waves that aren't pure sines: harmonics, RMS and power.`,
      body: [
        r`Every periodic wave has an **average** value (taken over a half cycle for waves symmetric about zero) and an **RMS** value, the dc that would heat a resistor equally. For a sine of peak $V_m$, the average is $\frac{2V_m}{\pi} = 0.637V_m$ and the RMS $\frac{V_m}{\sqrt2} = 0.707V_m$; the **form factor** (RMS over average) is 1.11 and the **peak factor** (peak over RMS) 1.414.`,
        r`| Wave of peak $V_m$ | Average | RMS | Form factor |
|---|---|---|---|
| Sine (half cycle) | $0.637V_m$ | $0.707V_m$ | 1.11 |
| Half-wave rectified sine | $0.318V_m$ | $0.5V_m$ | 1.57 |
| Full-wave rectified sine | $0.637V_m$ | $0.707V_m$ | 1.11 |
| Square | $V_m$ | $V_m$ | 1 |
| Triangle or sawtooth | $0.5V_m$ | $0.577V_m$ | 1.155 |`,
        r`A periodic wave that isn't a sine is a dc term plus sinusoids at whole multiples of the fundamental frequency, its **harmonics** (a Fourier series). A wave with half-wave symmetry, like a square or triangle wave, has odd harmonics only. Each harmonic sees its own impedance: $X_L$ grows with the harmonic number, $X_C$ shrinks.`,
        {
          type: 'plot',
          alt: 'A square wave and the sum of its first four odd harmonics, which follows the square wave closely with small ripples and overshoots at the jumps.',
          caption: 'A square wave (dashed) and its fundamental with the 3rd, 5th and 7th harmonics added: four sines already come close.',
          x: [0, 360],
          y: [-1.4, 1.4],
          xLabel: 'ωt (°)',
          series: [
            { f: (x) => (4 / Math.PI) * [1, 3, 5, 7].reduce((sum, n) => sum + Math.sin(n * x * deg) / n, 0), label: 'four harmonics' },
            { f: (x) => Math.sign(Math.sin(x * deg)), label: 'square wave', dashed: true },
          ],
        },
        r`The RMS of a wave with harmonics is $V_{rms} = \sqrt{V_0^2 + V_1^2 + V_2^2 + \cdots}$, using each harmonic's own RMS value. Power comes only from a voltage and a current of the same frequency: $P = V_0I_0 + \sum V_nI_n\cos\theta_n$. Distortion is summed up by $THD = \frac{\sqrt{V_2^2 + V_3^2 + \cdots}}{V_1}$.`,
      ],
      keyIdeas: [
        r`Fourier series: dc plus harmonics. Sine RMS $\frac{V_m}{\sqrt2}$, average $\frac{2V_m}{\pi}$, form factor 1.11, crest factor 1.414; triangle RMS $\frac{V_m}{\sqrt3}$.`,
        r`$V_{rms} = \sqrt{V_0^2 + \sum V_n^2}$; $P = V_0I_0 + \sum V_nI_n\cos\theta_n$.`,
        r`$THD = \frac{\sqrt{\sum_{n\ge2}V_n^2}}{V_1}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'RMS and distortion',
          problem: r`A voltage has 10 V dc, a 100 V RMS fundamental and a 30 V RMS third harmonic. Find its RMS value and THD.`,
          steps: [
            r`$V_{rms} = \sqrt{10^2 + 100^2 + 30^2} = 104.9$ V.`,
            r`$THD = \frac{30}{100} = 30\%$; the dc term doesn't count.`,
          ],
          answer: r`104.9 V RMS, 30% THD.`,
        },
        {
          level: 'board',
          title: 'Heating by a distorted current',
          problem: r`A current $i = 5 + 10\sqrt2\sin\omega t + 4\sqrt2\sin3\omega t$ A flows in 10 Ω. Find its RMS value and the power.`,
          steps: [
            r`RMS of each part: 5 A, 10 A and 4 A, so $I = \sqrt{25 + 100 + 16} = 11.87$ A.`,
            r`$P = I^2R = 141 \times 10 = 1410$ W.`,
          ],
          answer: r`11.87 A, heating the resistor with 1410 W.`,
        },
        {
          level: 'board',
          title: 'Power harmonic by harmonic',
          problem: r`$v = 100 + 141.4\sin\omega t + 70.7\sin3\omega t$ V drives a current $i = 5 + 14.14\sin(\omega t - 30^\circ) + 2.83\sin(3\omega t - 60^\circ)$ A. Find the average power.`,
          steps: [
            r`Dc: $100 \times 5 = 500$ W.`,
            r`Fundamental, RMS 100 V and 10 A: $100 \times 10\cos30^\circ = 866.0$ W.`,
            r`Third, RMS 50 V and 2 A: $50 \times 2\cos60^\circ = 50$ W.`,
          ],
          answer: r`$500 + 866.0 + 50 = 1416$ W.`,
        },
      ],
      traps: [
        r`Never add harmonic RMS values directly: add their squares.`,
        r`A voltage at one frequency and a current at another give no average power.`,
      ],
      check: [
        { q: r`A sine has a peak of 10 A. What are its half-cycle average and RMS values?`, a: r`6.37 A and 7.07 A.` },
        { q: r`For the same peak, which has the highest RMS: square, sine or triangle?`, a: r`The square wave: its RMS equals its peak.` },
      ],
    },
    {
      name: 'Two-Port Networks',
      inShort: r`Describing a network by its two pairs of terminals.`,
      body: [
        r`A **two-port** is any linear network seen from two pairs of terminals, an input and an output, with the currents $I_1$ and $I_2$ taken flowing in. There are four port quantities and two equations; which two are written in terms of the other two picks the parameter set.`,
        {
          type: 'circuit',
          alt: 'A T network: a 2 ohm series arm from port 1, a 3 ohm series arm to port 2, and a 6 ohm shunt arm from their junction to the common bottom line.',
          caption: 'A T network between port 1 (left) and port 2 (right).',
          parts: [
            ['R', [0, 0], [2, 0], '2 Ω'],
            ['R', [2, 0], [4, 0], '3 Ω'],
            ['R', [2, 0], [2, 2], '6 Ω'],
            ['wire', [0, 2], [4, 2]],
            ['dot', [2, 0]],
            ['dot', [2, 2]],
          ],
          nodes: [
            { at: [0, 0], label: '1', side: 'nw' }, { at: [0, 2], label: '1′', side: 'sw' },
            { at: [4, 0], label: '2' }, { at: [4, 2], label: '2′', side: 'se' },
          ],
        },
        r`| Set | Equations | Measured with |
|---|---|---|
| z (impedance) | $V_1 = z_{11}I_1 + z_{12}I_2$, $V_2 = z_{21}I_1 + z_{22}I_2$ | the other port open |
| y (admittance) | $I_1 = y_{11}V_1 + y_{12}V_2$, $I_2 = y_{21}V_1 + y_{22}V_2$ | the other port shorted |
| h (hybrid) | $V_1 = h_{11}I_1 + h_{12}V_2$, $I_2 = h_{21}I_1 + h_{22}V_2$ | used for transistors |
| ABCD (transmission) | $V_1 = AV_2 - BI_2$, $I_1 = CV_2 - DI_2$ | used for cascades and lines |`,
        r`A reciprocal network (passive, with no dependent sources) has $z_{12} = z_{21}$, $y_{12} = y_{21}$ and $AD - BC = 1$. Connections combine simply: two-ports in series add their z matrices, in parallel add their y matrices, and in cascade multiply their ABCD matrices, which is why transmission lines are described by ABCD.`,
      ],
      keyIdeas: [
        r`z (open-circuit), y (short-circuit), h (hybrid, for transistors) and ABCD (transmission) parameters.`,
        r`Reciprocal networks: $z_{12} = z_{21}$, $AD - BC = 1$.`,
        r`Series connections add z; parallel add y; cascades multiply ABCD.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'z parameters of a T',
          problem: r`Find the z parameters of the T network above.`,
          steps: [
            r`Port 2 open: $z_{11} = 2 + 6 = 8$ Ω, and $V_2$ is the shunt's voltage, so $z_{21} = 6$ Ω.`,
            r`Port 1 open: $z_{22} = 3 + 6 = 9$ Ω and $z_{12} = 6$ Ω.`,
          ],
          answer: r`$z_{11} = 8$, $z_{22} = 9$, $z_{12} = z_{21} = 6$ Ω.`,
        },
        {
          level: 'board',
          title: 'ABCD from z',
          problem: r`Find the ABCD parameters of the same network and check that it is reciprocal.`,
          steps: [
            r`$A = \frac{z_{11}}{z_{21}} = 1.333$, $D = \frac{z_{22}}{z_{21}} = 1.5$ and $C = \frac{1}{z_{21}} = 0.1667$ S.`,
            r`$B = \frac{z_{11}z_{22} - z_{12}z_{21}}{z_{21}} = \frac{72 - 36}{6} = 6$ Ω.`,
            r`$AD - BC = 2 - 1 = 1$: reciprocal.`,
          ],
          answer: r`A = 1.333, B = 6 Ω, C = 0.1667 S, D = 1.5.`,
        },
      ],
      traps: [
        r`ABCD takes $I_2$ flowing OUT of port 2; z and y take it flowing in.`,
        r`Only some parameter sets exist for a given network: an ideal transformer has no z parameters.`,
      ],
      check: [
        { q: r`In the T network, what is the input impedance with port 2 open?`, a: r`$z_{11} = 8$ Ω.` },
        { q: r`Two two-ports in cascade: how do their parameters combine?`, a: r`Multiply their ABCD matrices, in order.` },
      ],
    },
    {
      name: 'Laplace in Circuits',
      inShort: r`Solving transients algebraically in the s-domain.`,
      body: [
        r`The Laplace transform turns a circuit's differential equations into algebra. Each element gets an s-domain impedance, $R$, $sL$ and $\frac{1}{sC}$, and its stored energy becomes a source: an inductor carrying $i(0)$ adds a voltage source $Li(0)$ in series, and a capacitor at $v(0)$ adds $\frac{v(0)}{s}$. Every dc method (KVL, nodal analysis, Thévenin) then works on the s-domain circuit, and partial fractions bring the answer back to time.`,
        r`| $f(t)$ | $F(s)$ |
|---|---|
| unit step $u(t)$ | $\frac1s$ |
| $e^{-at}$ | $\frac{1}{s + a}$ |
| $t$ | $\frac{1}{s^2}$ |
| $\sin\omega t$ | $\frac{\omega}{s^2 + \omega^2}$ |
| $\cos\omega t$ | $\frac{s}{s^2 + \omega^2}$ |
| $e^{-at}\sin\omega t$ | $\frac{\omega}{(s + a)^2 + \omega^2}$ |`,
        r`The **transfer function** $H(s) = \frac{Y(s)}{X(s)}$, with no stored energy, holds everything about a circuit's response. Its **poles** set the natural response: real negative poles decay, complex ones ring, and any pole in the right half-plane grows without bound. The initial and final value theorems read the ends without inverting: $f(0^+) = \lim_{s\to\infty}sF(s)$ and $f(\infty) = \lim_{s\to0}sF(s)$.`,
        {
          type: 'plot',
          alt: 'The current of the coil example rising from 2 A at t = 0 towards 5 A, with a time constant of 50 milliseconds.',
          caption: 'The coil current of the board example: from its stored 2 A to the final 5 A, found entirely by algebra.',
          x: [0, 0.25],
          y: [0, 5.6],
          xLabel: 't (s)',
          yLabel: 'i (A)',
          series: [{ f: (t) => 5 - 3 * Math.exp(-20 * t), label: 'i' }],
          marks: [{ y: 5, label: 'i(∞) = 5 A' }, { at: [0, 2], label: 'i(0) = 2 A' }],
        },
      ],
      keyIdeas: [
        r`$Z_L = sL$ (with source $Li(0)$), $Z_C = \frac{1}{sC}$ (with source $\frac{v(0)}{s}$).`,
        r`Transfer function $H(s) = \frac{\text{output}}{\text{input}}$; poles set the natural response.`,
        r`$f(0^+) = \lim_{s\to\infty}sF(s)$, $f(\infty) = \lim_{s\to0}sF(s)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Final value and inverse',
          problem: r`A response is $F(s) = \frac{10}{s(s + 2)}$. Find its final value and the time function.`,
          steps: [
            r`$f(\infty) = \lim_{s\to0}\frac{10}{s + 2} = 5$.`,
            r`Partial fractions: $\frac{5}{s} - \frac{5}{s + 2}$, so $f(t) = 5(1 - e^{-2t})$.`,
          ],
          answer: r`Final value 5; $f(t) = 5(1 - e^{-2t})$.`,
        },
        {
          level: 'board',
          title: 'A coil with stored current',
          problem: r`A series RL circuit (R = 10 Ω, L = 0.5 H) carries 2 A when, at t = 0, its source steps to 50 V dc. Find i(t).`,
          steps: [
            r`s-domain KVL, with the stored energy as a source $Li(0) = 1$: $\frac{50}{s} + 1 = (10 + 0.5s)I(s)$.`,
            r`$I(s) = \frac{2(s + 50)}{s(s + 20)} = \frac{5}{s} - \frac{3}{s + 20}$.`,
            r`$i(t) = 5 - 3e^{-20t}$ A: 2 A at the start, 5 A at the end.`,
          ],
          answer: r`$i(t) = 5 - 3e^{-20t}$ A.`,
        },
      ],
      traps: [
        r`The final value theorem fails for oscillating or growing responses (poles on or right of the axis).`,
        r`Forgetting the initial-condition sources gives the response of a circuit that started empty.`,
      ],
      check: [
        { q: r`What are the initial and final values of $F(s) = \frac{3s + 6}{s(s + 3)}$?`, a: r`$f(0^+) = 3$ and $f(\infty) = 2$.` },
        { q: r`A transfer function has poles at $-2 \pm j5$. What does the natural response look like?`, a: r`A decaying oscillation: $e^{-2t}$ times a sinusoid at 5 rad/s.` },
      ],
    },
    {
      name: 'Filters',
      inShort: r`Circuits that pass some frequencies and block others.`,
      body: [
        r`A filter passes some frequencies and blocks others. A **low-pass** lets slow signals through, a **high-pass** fast ones, a **band-pass** a range and a **band-stop** (notch) blocks one range. Passive filters use R, L and C; active filters add op amps for gain and sharper shapes without bulky inductors.`,
        {
          type: 'circuit',
          alt: 'A first-order RC low-pass filter: the input source drives a series resistor, and the output is taken across a capacitor to the common line.',
          caption: 'A first-order RC low-pass: the output is taken across the capacitor.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'v_{in}'],
            ['R', [0, 0], [2, 0], 'R'],
            ['wire', [2, 0], [3.5, 0]],
            ['C', [2, 0], [2, 2], 'C'],
            ['wire', [0, 2], [3.5, 2]],
            ['dot', [2, 0]],
            ['dot', [2, 2]],
          ],
          nodes: [{ at: [3.5, 0], label: 'v_{out}' }, { at: [3.5, 2], label: '', side: 'se' }],
        },
        r`The RC low-pass has $H(j\omega) = \frac{1}{1 + j\omega RC}$: a gain of 1 at low frequency, $\frac{1}{\sqrt2}$ (−3 dB, half power) at the **cutoff** $f_c = \frac{1}{2\pi RC}$, and beyond it a fall of 20 dB for every tenfold rise in frequency. Swap R and C and it becomes a high-pass with the same cutoff.`,
        {
          type: 'plot',
          alt: 'Gain in decibels against frequency on a log scale for an RC low-pass with a 159 Hz cutoff: flat at 0 dB, minus 3 dB at the cutoff, then falling 20 dB per decade.',
          caption: 'The low-pass’s gain against frequency (1 kΩ, 1 µF): −3 dB at the cutoff, then −20 dB per decade.',
          x: [10, 100000],
          y: [-60, 5],
          logX: true,
          xLabel: 'f (Hz)',
          yLabel: 'gain (dB)',
          series: [{ f: (f) => -10 * Math.log10(1 + (f / (1000 / (2 * Math.PI))) ** 2), label: 'gain' }],
          marks: [{ at: [1000 / (2 * Math.PI), -3.01], label: '−3 dB at 159 Hz' }],
        },
        r`A band-pass built from a resonant circuit is centred on $\omega_0$ with bandwidth $\frac{\omega_0}{Q}$ (see Series and Parallel Resonance). Gains are quoted in decibels: $20\log_{10}\frac{V_o}{V_i}$ for voltage and $10\log_{10}\frac{P_o}{P_i}$ for power, so halving the power is −3 dB and halving the voltage −6 dB.`,
      ],
      keyIdeas: [
        r`Low-pass, high-pass, band-pass, band-stop; passive (RLC) or active (op amp).`,
        r`First-order RC: $f_c = \frac{1}{2\pi RC}$, gain $\frac{1}{\sqrt2}$ (−3 dB) at cutoff, then −20 dB per decade.`,
        r`Band-pass from a resonant circuit: centre $\omega_0$, bandwidth $\frac{\omega_0}{Q}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Cutoff and attenuation',
          problem: r`An RC low-pass has R = 1 kΩ and C = 1 µF. Find its cutoff, and its gain at ten times the cutoff.`,
          steps: [
            r`$f_c = \frac{1}{2\pi \times 10^3 \times 10^{-6}} = 159.2$ Hz.`,
            r`At 1.592 kHz: $\frac{1}{\sqrt{1 + 10^2}} = 0.0995$, which is $20\log_{10}0.0995 = -20.04$ dB.`,
          ],
          answer: r`159.2 Hz; about −20 dB at ten times the cutoff.`,
        },
        {
          level: 'board',
          title: 'Designing a high-pass',
          problem: r`Design an RC high-pass with a 1 kHz cutoff using a 0.1 µF capacitor, and find its gain at 250 Hz.`,
          steps: [
            r`$R = \frac{1}{2\pi \times 1000 \times 10^{-7}} = 1592$ Ω.`,
            r`High-pass gain: $\frac{f/f_c}{\sqrt{1 + (f/f_c)^2}} = \frac{0.25}{\sqrt{1.0625}} = 0.2425$, which is −12.30 dB.`,
          ],
          answer: r`1592 Ω; at 250 Hz the gain is 0.2425 (−12.3 dB).`,
        },
      ],
      traps: [
        r`The −3 dB point is half POWER, not half voltage (voltage falls to 0.707).`,
        r`Decibels of voltage use 20 log, of power 10 log.`,
      ],
      check: [
        { q: r`A filter's output voltage is half its input. How many decibels is that?`, a: r`$20\log_{10}0.5 = -6.02$ dB.` },
        { q: r`Swap the R and C of a low-pass. What do you get?`, a: r`A high-pass with the same cutoff.` },
      ],
    },
  ],
};
