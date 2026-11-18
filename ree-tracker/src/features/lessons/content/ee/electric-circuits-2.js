// Library › Lessons › EE › Electric Circuits 2 (2026-11-18): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by computation. Phasors and impedance are in
// Electric Circuits 1; per-unit and faults in Power System Analysis.
const r = String.raw;

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
      keyIdeas: [
        r`$P = VI\cos\theta$ (W), $Q = VI\sin\theta$ (var), $S = VI$ (VA); $\mathbf{S} = \mathbf{V}\mathbf{I}^* = P + jQ$.`,
        r`Power factor $\cos\theta$: lagging for inductive loads, leading for capacitive.`,
        r`Complex power is conserved: the source's S is the sum of the loads'.`,
      ],
      example: {
        problem: r`A 230 V supply feeds a load of $10 + j5$ Ω. Find the current, P, Q, S and the power factor.`,
        solution: r`$|Z| = 11.18$ Ω, $I = 20.57$ A. $P = I^2R = 4232$ W, $Q = I^2X = 2116$ var, $S = 4732$ VA, pf $= \frac{10}{11.18} = 0.894$ lagging.`,
      },
      traps: [r`With peak values, $P = \frac{V_mI_m}{2}\cos\theta$, not $V_mI_m\cos\theta$.`],
    },
    {
      name: 'Power Factor Correction',
      inShort: r`Adding capacitors to cancel a load's reactive power.`,
      keyIdeas: [
        r`$Q_C = P(\tan\theta_1 - \tan\theta_2)$; the real power is unchanged.`,
        r`$C = \frac{Q_C}{\omega V^2}$ (single phase); delta-connected banks need a third of the wye capacitance.`,
        r`Better power factor means less current: smaller conductors, lower losses, no utility penalty.`,
      ],
      example: {
        problem: r`A 100 kW load runs at 0.70 lagging. What capacitor kvar raises it to 0.95? What capacitance is that at 230 V, 60 Hz single phase?`,
        solution: r`$Q_C = 100(\tan45.57^\circ - \tan18.19^\circ) = 100(1.020 - 0.329) = 69.2$ kvar. $C = \frac{69\,150}{377(230)^2} = 3.47$ mF.`,
      },
      traps: [r`Correcting to unity costs far more capacitor than to 0.95, for little gain.`],
    },
    {
      name: 'Maximum Power in AC',
      inShort: r`The load that takes the most power from an ac source.`,
      keyIdeas: [
        r`Conjugate match $Z_L = Z_{th}^*$: $P_{\max} = \frac{|V_{th}|^2}{4R_{th}}$ (RMS).`,
        r`If the load must be resistive, $R_L = |Z_{th}|$.`,
        r`If only the load resistance can change, it still equals $\sqrt{R_{th}^2 + (X_{th} + X_L)^2}$.`,
      ],
      example: {
        problem: r`$V_{th} = 100$ V RMS, $Z_{th} = 6 + j8$ Ω. Find the best load and its power, and the best purely resistive load.`,
        solution: r`$Z_L = 6 - j8$ Ω: $\frac{100^2}{4(6)} = 416.7$ W. Resistive: $R_L = 10$ Ω gives $\frac{100^2}{16^2 + 8^2}(10) = 312.5$ W.`,
      },
      traps: [r`The conjugate cancels the reactance; matching $Z_L = Z_{th}$ (not conjugate) doubles the reactance instead.`],
    },
    {
      name: 'Series and Parallel Resonance',
      inShort: r`Where inductive and capacitive reactance cancel.`,
      keyIdeas: [
        r`$\omega_0 = \frac{1}{\sqrt{LC}}$. Series: minimum impedance (R), maximum current; parallel: maximum impedance.`,
        r`Series $Q = \frac{\omega_0L}{R}$; parallel $Q = \frac{R}{\omega_0L}$; $BW = \frac{\omega_0}{Q}$, $\omega_0 = \sqrt{\omega_1\omega_2}$.`,
        r`At series resonance each reactance carries Q times the source voltage.`,
      ],
      example: {
        problem: r`A series circuit has R = 10 Ω, L = 0.1 H, C = 10 µF. Find $\omega_0$, $f_0$, Q and the bandwidth.`,
        solution: r`$\omega_0 = \frac{1}{\sqrt{10^{-6}}} = 1000$ rad/s ($f_0 = 159.2$ Hz); $Q = \frac{1000(0.1)}{10} = 10$; $BW = 100$ rad/s (15.9 Hz).`,
      },
      traps: [r`A high-Q series circuit can put hundreds of volts on L and C from a small source.`],
    },
    {
      name: 'Magnetically Coupled Circuits',
      inShort: r`Coils that share magnetic flux, and the linear transformer.`,
      keyIdeas: [
        r`$v_1 = L_1\frac{di_1}{dt} \pm M\frac{di_2}{dt}$, with the sign from the dot convention; $M = k\sqrt{L_1L_2}$, $k \le 1$.`,
        r`Series aiding $L_1 + L_2 + 2M$, opposing $L_1 + L_2 - 2M$; energy $\frac12L_1i_1^2 + \frac12L_2i_2^2 \pm Mi_1i_2$.`,
        r`Linear transformer: $Z_{in} = Z_1 + \frac{\omega^2M^2}{Z_2 + Z_L}$.`,
      ],
      example: {
        problem: r`Coils of 0.2 H and 0.5 H have M = 0.25 H. Find k and the total inductance in series aiding and opposing.`,
        solution: r`$k = \frac{0.25}{\sqrt{0.1}} = 0.79$. Aiding: $0.2 + 0.5 + 0.5 = 1.2$ H. Opposing: $0.7 - 0.5 = 0.2$ H.`,
      },
      traps: [r`Currents both entering dotted ends give $+M$; one in, one out gives $-M$.`],
    },
    {
      name: 'Balanced Three-Phase Systems',
      inShort: r`Three equal voltages 120° apart: wye and delta connections and their power.`,
      keyIdeas: [
        r`Wye: $V_L = \sqrt3V_p$ (leading 30°), $I_L = I_p$. Delta: $V_L = V_p$, $I_L = \sqrt3I_p$ (lagging 30°).`,
        r`$P = \sqrt3V_LI_L\cos\theta = 3V_pI_p\cos\theta$, θ the angle of the load impedance.`,
        r`Solve one phase of the wye equivalent; a delta load converts with $Z_Y = \frac{Z_\Delta}{3}$.`,
      ],
      example: {
        problem: r`A balanced wye load of $8 + j6$ Ω per phase is on a 400 V line. Find the phase current and total power.`,
        solution: r`$V_p = \frac{400}{\sqrt3} = 230.9$ V, $I = \frac{230.9}{10} = 23.1$ A. $P = 3(23.1)^2(8) = 12.8$ kW at pf 0.8.`,
      },
      traps: [r`θ in the power formula is the load's impedance angle, not the 30° between line and phase voltages.`],
    },
    {
      name: 'Unbalanced Three-Phase Systems',
      inShort: r`Unequal loads: neutral current and neutral shift.`,
      keyIdeas: [
        r`With a solid neutral each phase is solved alone; $\mathbf{I}_N = \mathbf{I}_a + \mathbf{I}_b + \mathbf{I}_c$.`,
        r`Without a neutral the load's star point shifts: Millman $\mathbf{V}_{N'N} = \frac{\sum\mathbf{V}_kY_k}{\sum Y_k}$.`,
        r`Unbalanced delta loads: find phase currents, then line currents by KCL.`,
      ],
      example: {
        problem: r`Phase currents are $10\angle0^\circ$, $10\angle{-120^\circ}$ and $5\angle120^\circ$ A. Find the neutral current.`,
        solution: r`$10\angle0^\circ + 10\angle{-120^\circ} = 10\angle{-60^\circ}$; adding $5\angle120^\circ = -5\angle{-60^\circ}$ leaves $\mathbf{I}_N = 5\angle{-60^\circ}$ A.`,
      },
      traps: [r`An open neutral on an unbalanced load can put far more than the phase voltage across lightly loaded phases.`],
    },
    {
      name: 'Three-Phase Power Measurement',
      inShort: r`Measuring three-phase power with wattmeters.`,
      keyIdeas: [
        r`Blondel: n wires need n − 1 wattmeters. Three-wire: the two-wattmeter method, $P = W_1 + W_2$.`,
        r`Balanced load: $\tan\theta = \sqrt3\frac{W_2 - W_1}{W_1 + W_2}$.`,
        r`At pf 0.5 one reading is zero; below it, one reads negative.`,
      ],
      example: {
        problem: r`Two wattmeters on a balanced load read 4 kW and 8 kW. Find the power and power factor.`,
        solution: r`$P = 12$ kW; $\tan\theta = \sqrt3 \times \frac{4}{12} = 0.577$, $\theta = 30^\circ$, pf $= 0.866$.`,
      },
      traps: [r`A negative reading must be SUBTRACTED, not added as positive.`],
    },
    {
      name: 'Symmetrical Components',
      inShort: r`Breaking an unbalanced set into balanced sequence sets.`,
      keyIdeas: [
        r`$\mathbf{V}_0 = \frac13(\mathbf{V}_a + \mathbf{V}_b + \mathbf{V}_c)$, $\mathbf{V}_1 = \frac13(\mathbf{V}_a + a\mathbf{V}_b + a^2\mathbf{V}_c)$, $\mathbf{V}_2 = \frac13(\mathbf{V}_a + a^2\mathbf{V}_b + a\mathbf{V}_c)$, $a = 1\angle120^\circ$.`,
        r`Positive sequence is normal rotation; negative reverses it (heats motors); zero sequence is in phase in all three.`,
        r`Zero-sequence current needs a return path: none in an ungrounded wye or a delta's lines.`,
      ],
      example: {
        problem: r`$\mathbf{V}_a = 100\angle0^\circ$, $\mathbf{V}_b = \mathbf{V}_c = 0$. Find the sequence components.`,
        solution: r`Each is $\frac13(100\angle0^\circ) = 33.3\angle0^\circ$ V: $V_0 = V_1 = V_2 = 33.3$ V.`,
      },
      traps: [r`Use $a = 1\angle120^\circ$ and $a^2 = 1\angle240^\circ$; swapping them swaps the positive and negative sequences.`],
    },
    {
      name: 'Non-Sinusoidal Waves and Fourier',
      inShort: r`Waves that aren't pure sines: harmonics, RMS and power.`,
      keyIdeas: [
        r`Fourier series: dc plus harmonics. Sine RMS $\frac{V_m}{\sqrt2}$, average $\frac{2V_m}{\pi}$, form factor 1.11, crest factor 1.414; triangle RMS $\frac{V_m}{\sqrt3}$.`,
        r`$V_{rms} = \sqrt{V_0^2 + \sum V_n^2}$; $P = V_0I_0 + \sum V_nI_n\cos\theta_n$.`,
        r`$THD = \frac{\sqrt{\sum_{n\ge2}V_n^2}}{V_1}$.`,
      ],
      example: {
        problem: r`A voltage has 10 V dc, a 100 V RMS fundamental and a 30 V RMS third harmonic. Find its RMS value and THD.`,
        solution: r`$V_{rms} = \sqrt{10^2 + 100^2 + 30^2} = 104.9$ V; $THD = \frac{30}{100} = 30\%$.`,
      },
      traps: [r`Never add harmonic RMS values directly: add their squares.`],
    },
    {
      name: 'Two-Port Networks',
      inShort: r`Describing a network by its two pairs of terminals.`,
      keyIdeas: [
        r`z (open-circuit), y (short-circuit), h (hybrid, for transistors) and ABCD (transmission) parameters.`,
        r`Reciprocal networks: $z_{12} = z_{21}$, $AD - BC = 1$.`,
        r`Series connections add z; parallel add y; cascades multiply ABCD.`,
      ],
      example: {
        problem: r`A T network has series arms 2 Ω and 3 Ω and a 6 Ω shunt. Find its z parameters.`,
        solution: r`$z_{11} = 2 + 6 = 8$ Ω, $z_{22} = 3 + 6 = 9$ Ω, $z_{12} = z_{21} = 6$ Ω.`,
      },
      traps: [r`ABCD takes $I_2$ flowing OUT of port 2; z and y take it flowing in.`],
    },
    {
      name: 'Laplace in Circuits',
      inShort: r`Solving transients algebraically in the s-domain.`,
      keyIdeas: [
        r`$Z_L = sL$ (with source $Li(0)$), $Z_C = \frac{1}{sC}$ (with source $\frac{v(0)}{s}$).`,
        r`Transfer function $H(s) = \frac{\text{output}}{\text{input}}$; poles set the natural response.`,
        r`$f(0^+) = \lim_{s\to\infty}sF(s)$, $f(\infty) = \lim_{s\to0}sF(s)$.`,
      ],
      example: {
        problem: r`A response is $F(s) = \frac{10}{s(s + 2)}$. Find its final value and the time function.`,
        solution: r`$f(\infty) = \lim_{s\to0}\frac{10}{s + 2} = 5$. Partial fractions: $\frac{5}{s} - \frac{5}{s + 2}$, so $f(t) = 5(1 - e^{-2t})$.`,
      },
      traps: [r`The final value theorem fails for oscillating or growing responses (poles on or right of the axis).`],
    },
    {
      name: 'Filters',
      inShort: r`Circuits that pass some frequencies and block others.`,
      keyIdeas: [
        r`Low-pass, high-pass, band-pass, band-stop; passive (RLC) or active (op amp).`,
        r`First-order RC: $f_c = \frac{1}{2\pi RC}$, gain $\frac{1}{\sqrt2}$ (−3 dB) at cutoff, then −20 dB per decade.`,
        r`Band-pass from a resonant circuit: centre $\omega_0$, bandwidth $\frac{\omega_0}{Q}$.`,
      ],
      example: {
        problem: r`An RC low-pass has R = 1 kΩ, C = 1 µF. Find its cutoff, and its gain at ten times the cutoff.`,
        solution: r`$f_c = \frac{1}{2\pi(10^3)(10^{-6})} = 159$ Hz. At 1.59 kHz: $\frac{1}{\sqrt{1 + 100}} = 0.0995$, about −20 dB.`,
      },
      traps: [r`The −3 dB point is half POWER, not half voltage (voltage falls to 0.707).`],
    },
  ],
};
