// Library › Lessons › EE › Electrical Machinery 2 (2026-11-18; every subtopic in
// the module format 2026-11-20, with figures, examples a step at a time and
// checks; every number re-worked by machinery2Lesson.test.js. Coverage and
// problem styles cross-checked against a review center's AC-machines handout;
// the text, problems and figures are this app's own): written for the Philippine
// REE board, subtopic by subtopic in the syllabus's order. Transformers and DC
// machines are in Machinery 1; power-system stability builds on the power-angle
// curve here.
const r = String.raw;
const deg = Math.PI / 180;

// Torque (N·m) of a three-phase induction motor at slip s: per-phase voltage V,
// stator resistance R1, rotor resistance R2, total leakage reactance X, and
// synchronous speed ws (rad/s). The worked motor: 460 V, 4 poles, 60 Hz.
// No slip, no torque: at s = 0 the formula is 0/0.
const torque = (s, { V = 460 / Math.sqrt(3), R1 = 0.3, R2 = 0.25, X = 0.9, ws = 120 * Math.PI / 2 } = {}) =>
  s === 0 ? 0 : (3 * V * V * (R2 / s)) / (ws * ((R1 + R2 / s) ** 2 + X * X));
// The same motor on a drive at f Hz, volts per hertz held constant, against
// shaft speed in rpm (motoring only: zero at and above its synchronous speed).
const atFrequency = (f) => (n) => {
  const k = f / 60;
  const s = 1 - n / (1800 * k);
  return s <= 0 ? 0 : torque(s, { V: (k * 460) / Math.sqrt(3), X: 0.9 * k, ws: 60 * Math.PI * k });
};
// A synchronous motor's armature current against its EMF, at per-phase power p
// (W) on 2400 V per phase with Xs = 6 Ω: the V-curve.
const vCurve = (p) => (E) => {
  const d = Math.asin((p * 6) / (2400 * E));
  return Math.hypot(2400 - E * Math.cos(d), E * Math.sin(d)) / 6;
};
// One rotating field's torque against its own slip (Kloss, peak 1 at s = 0.3).
const kloss = (s) => 2 / (s / 0.3 + 0.3 / s);

export default {
  topic: 'Electrical Machinery 2',
  subject: 'EE',
  overview: r`Electrical Machinery 2 covers AC rotating machines. Synchronous machines run locked to the supply at $N_s = \frac{120f}{P}$: as alternators they generate almost all the grid's power, and as motors they run at constant speed and can supply vars to correct power factor. Their behaviour comes from one per-phase picture: an EMF behind a synchronous reactance, and the power-angle curve $P = \frac{3EV}{X_s}\sin\delta$. Induction motors, the workhorses of industry, run slightly below synchronous speed; slip sets their rotor frequency, torque and losses, and their equivalent circuit is a transformer with a load of $R_2/s$. The lesson ends with starting and speed control, single-phase motors, steppers and machine tests. Work per phase unless the formula says total.`,
  sources: [
    'Electric Machinery Fundamentals (Chapman)',
    'Electric Machinery (Fitzgerald, Kingsley and Umans)',
    'A Textbook of Electrical Technology, Vol. II (Theraja)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Synchronous Generator Principles',
      inShort: r`A rotating field induces three-phase EMFs locked to the rotor's speed.`,
      body: [
        r`An alternator spins a DC-excited field inside a three-phase stator winding. The output frequency is locked to the speed, $f = \frac{PN_s}{120}$, so a 4-pole machine must turn at 1800 rpm for 60 Hz. Large machines put the field on the rotor and the armature on the stator: the output then needs no sliding contacts, the high-voltage winding is easy to insulate and brace, and only the small field current goes through slip rings.`,
        r`| Rotor | Poles | Speed | Prime mover |
|---|---|---|---|
| Salient pole (large diameter, short) | many, 6 to 40+ | low | hydro turbines, engines |
| Cylindrical, round rotor (long, slim) | 2 or 4 | high | steam and gas turbines |`,
        r`Per phase, $E = 4.44k_pk_dfN\Phi$ (or $2.22k_pk_dfZ\Phi$ with Z conductors per phase). The **distribution factor** $k_d = \frac{\sin(q\alpha/2)}{q\sin(\alpha/2)}$ accounts for the coils of a phase sitting in q slots α apart; the **pitch factor** $k_p = \sin\frac{\rho}{2}$ for coils spanning ρ electrical degrees. Short-pitching costs a little fundamental and kills harmonics: the nth harmonic's pitch factor is $\sin\frac{n\rho}{2}$.`,
        {
          type: 'plot',
          alt: 'Pitch factor against coil span from 120 to 180 electrical degrees: the fundamental stays between 0.87 and 1, while the fifth harmonic swings and falls to zero at a span of 144 degrees.',
          caption: 'Short-pitching: the fundamental hardly drops, while the 5th harmonic vanishes at a 4/5 pitch (144°).',
          x: [115, 180],
          y: [0, 1.4],
          xLabel: 'coil span ρ (electrical °)',
          yLabel: 'k_p',
          series: [
            { f: (p) => Math.sin((p / 2) * deg), label: 'fundamental' },
            { f: (p) => Math.abs(Math.sin(((5 * p) / 2) * deg)), label: '5th harmonic', dashed: true },
          ],
          marks: [{ x: 144, label: '144°' }],
        },
      ],
      keyIdeas: [
        r`$N_s = \frac{120f}{P}$; electrical degrees $= \frac{P}{2} \times$ mechanical.`,
        r`$E = 4.44k_pk_dfN\Phi$ per phase; $k_p = \sin\frac{\rho}{2}$, $k_d = \frac{\sin(q\alpha/2)}{q\sin(\alpha/2)}$.`,
        r`A coil span of $\left(1 - \frac1n\right)180°$ removes the nth harmonic.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Speed, winding factors and EMF',
          problem: r`A 4-pole, 60 Hz, 48-slot three-phase alternator has coils spanning 10 slots, 96 turns per phase and 0.04 Wb per pole. Find its speed, winding factors and phase EMF.`,
          steps: [
            r`$N_s = \frac{120 \times 60}{4} = 1800$ rpm.`,
            r`Pole pitch 12 slots, so the span is $\frac{10}{12} \times 180° = 150°$: $k_p = \sin75° = 0.966$.`,
            r`$q = \frac{48}{4 \times 3} = 4$, $\alpha = \frac{180°}{12} = 15°$: $k_d = \frac{\sin30°}{4\sin7.5°} = 0.958$.`,
            r`$E = 4.44 \times 0.966 \times 0.958 \times 60 \times 96 \times 0.04 = 946$ V.`,
          ],
          answer: r`1800 rpm; $k_p$ = 0.966, $k_d$ = 0.958; 946 V per phase.`,
        },
        {
          level: 'board',
          title: 'Harmonic pitch factors and a line voltage',
          problem: r`A 6-pole, Y-connected alternator at 1200 rpm has 72 slots, 240 conductors per phase, 5/6-pitch coils and 0.05 Wb per pole. Find the frequency, the pitch factors for the fundamental, 5th and 7th, and the line EMF.`,
          steps: [
            r`$f = \frac{6 \times 1200}{120} = 60$ Hz. Span $\frac56 \times 180° = 150°$.`,
            r`$k_{p1} = \sin75° = 0.966$; $k_{p5} = \lvert\sin375°\rvert = 0.259$; $k_{p7} = \lvert\sin525°\rvert = 0.259$.`,
            r`$q = \frac{72}{18} = 4$, $\alpha = 15°$, so $k_d = 0.958$. $E_{ph} = 2.22 \times 0.966 \times 0.958 \times 60 \times 240 \times 0.05 = 1479$ V.`,
            r`Line: $\sqrt3 \times 1479 = 2561$ V.`,
          ],
          answer: r`60 Hz; 0.966, 0.259, 0.259; 2561 V line.`,
        },
      ],
      traps: [
        r`Pitch and slot angles are ELECTRICAL degrees: multiply mechanical by $\frac{P}{2}$.`,
        r`$4.44$ goes with turns, $2.22$ with conductors.`,
      ],
      check: [
        { q: r`How many poles does a 60 Hz alternator at 300 rpm have?`, a: r`$P = \frac{120 \times 60}{300} = 24$.` },
        { q: r`Which rotor suits a steam turbine?`, a: r`Cylindrical (round), with 2 or 4 poles.` },
      ],
    },
    {
      name: 'Voltage Regulation',
      inShort: r`How far the terminal voltage would rise if full load were thrown off.`,
      body: [
        r`Per phase, an alternator is its EMF E behind the synchronous impedance $R_a + jX_s$, where $X_s$ lumps the leakage reactance with the far larger effect of **armature reaction**. So $\mathbf{E} = \mathbf{V} + \mathbf{I}(R_a + jX_s)$, and the regulation is $\frac{E - V}{V}$. For a lagging load the $IX_s$ drop points nearly along V and adds a lot; for a leading load it can subtract, so the voltage RISES with load.`,
        {
          type: 'phasor',
          alt: 'The alternator phasor diagram for a lagging load: the terminal voltage to the right, the current lagging it, a small resistive drop at the tip in line with the current, then the large reactive drop at right angles, ending at the EMF, longer and 13.8 degrees ahead.',
          caption: 'E = V + IRa + jIXs for a lagging load (the current drawn at half scale): the reactive drop lengthens V a lot.',
          axes: false,
          vectors: [
            { name: 'V', mag: 1000, angle: 0, label: 'V', labelAt: 'mid' },
            { mag: 500, angle: -36.87, label: 'I', colour: 1 },
            { name: 'IR', mag: 20, angle: -36.87, from: 'V', label: '' },
            { mag: 400, angle: 53.13, from: 'IR', label: 'jIX_s', colour: 3 },
            { mag: 1293.2, angle: 13.78, label: 'E', colour: 2 },
          ],
        },
        {
          type: 'plot',
          alt: 'Regulation of the worked alternator against the power-factor angle from 60 degrees leading to 60 degrees lagging: about minus 30 percent at 60 leading, crossing zero near 20 degrees leading, 9.6 percent at unity and 37 percent at 60 lagging.',
          caption: 'The same machine at 100 A over a range of power factors: leading loads give negative regulation.',
          x: [-60, 60],
          y: [-35, 45],
          xLabel: 'pf angle (°): leading < 0 < lagging',
          yLabel: 'VR (%)',
          series: [{ f: (th) => (Math.hypot(1000 + 100 * (0.2 * Math.cos(th * deg) + 4 * Math.sin(th * deg)), 100 * (4 * Math.cos(th * deg) - 0.2 * Math.sin(th * deg))) - 1000) / 10, label: 'VR' }],
          marks: [{ y: 0, label: 'no change' }],
        },
        r`| Test | Measures | Gives |
|---|---|---|
| DC resistance, field open | resistance between terminals, $R_t$ | $R_{dc} = \frac{R_t}{2}$ (Y) or $\frac32R_t$ (Δ); effective $R_e \approx 1.5R_{dc}$ |
| Open circuit, at synchronous speed | line voltage against field current | $E_{oc}$ per phase |
| Short circuit, same field current | line current | $Z_s = \frac{E_{oc}}{I_{sc}}$ per phase |`,
      ],
      keyIdeas: [
        r`$\mathbf{E} = \mathbf{V} + \mathbf{I}(R_a + jX_s)$; $\text{VR} = \frac{E - V}{V}$.`,
        r`$Z_s = \frac{E_{oc}}{I_{sc}}$ at the same field current; $R_e \approx 1.5R_{dc}$.`,
        r`Lagging loads give large regulation; leading loads can make it negative.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'EMF and regulation',
          problem: r`A Y-connected alternator has $V = 1000$ V per phase, $R_a = 0.2$ Ω, $X_s = 4$ Ω, and carries 100 A at 0.8 lagging. Find E and the regulation; then the regulation at 0.8 leading.`,
          steps: [
            r`$\mathbf{I} = 100\angle{-36.87°} = 80 - j60$ A.`,
            r`$\mathbf{E} = 1000 + (80 - j60)(0.2 + j4) = 1256 + j308$, $\lvert E\rvert = 1293$ V: VR $= 29.3\%$.`,
            r`Leading, $\mathbf{I} = 80 + j60$: $\mathbf{E} = 1000 + (80 + j60)(0.2 + j4) = 776 + j332$, $\lvert E\rvert = 844$ V: VR $= -15.6\%$.`,
          ],
          answer: r`1293 V, 29.3% lagging; −15.6% leading.`,
        },
        {
          level: 'board',
          title: 'Regulation from test data',
          problem: r`A Y-connected alternator gives 2300 V (line) on open circuit, and 200 A on short circuit at the same field current. The resistance between two terminals is 0.6 Ω. Find $Z_s$, $R_e$ and $X_s$ per phase, and the regulation at 100 A, 0.8 lagging, rated 2300 V.`,
          steps: [
            r`$E_{oc} = \frac{2300}{\sqrt3} = 1328$ V, so $Z_s = \frac{1328}{200} = 6.640$ Ω.`,
            r`$R_{dc} = \frac{0.6}{2} = 0.3$ Ω, $R_e = 1.5 \times 0.3 = 0.45$ Ω, $X_s = \sqrt{6.640^2 - 0.45^2} = 6.624$ Ω.`,
            r`$\mathbf{E} = 1328 + 100\angle{-36.87°}(0.45 + j6.624)$, $\lvert E\rvert = 1832$ V: VR $= \frac{1832 - 1328}{1328} = 37.9\%$.`,
          ],
          answer: r`6.640 Ω, 0.45 Ω, 6.624 Ω; 37.9%.`,
        },
      ],
      traps: [
        r`Use PHASE voltage and current with per-phase $Z_s$; convert line values first.`,
        r`Armature reaction, not leakage or resistance, is the main cause of the drop.`,
      ],
      check: [
        { q: r`At what kind of load can an alternator's regulation be negative?`, a: r`A leading (capacitive) load.` },
        { q: r`A Y machine reads 0.8 Ω between terminals. What is its effective resistance per phase?`, a: r`$1.5 \times 0.4 = 0.6$ Ω.` },
      ],
    },
    {
      name: 'Parallel Operation of Alternators',
      inShort: r`Matched voltage, frequency, phase sequence and phase before closing; then droop and field share the load.`,
      body: [
        r`Before an incoming alternator is switched onto a live bus (**synchronizing**), its voltage, frequency, phase sequence and phase angle must match the bus, and its waveform should too; otherwise a large cross-current flows the instant the breaker closes. Once on, the machines are locked together, and two separate controls share the load: each **governor** sets its real power, by a speed-droop line $f = f_{nl} - S_PP$; each **field** sets its reactive power.`,
        {
          type: 'plot',
          alt: 'Governor droop lines of two units against their output: one from 61 Hz falling 1 Hz per MW, the other from 61.5 Hz falling 0.5 Hz per MW; at 60.5 Hz the first carries 0.5 MW and the second 2.0 MW, 2.5 MW together.',
          caption: 'Two droop lines share 2.5 MW where they meet one frequency, 60.5 Hz: 0.5 MW and 2.0 MW.',
          x: [0, 3],
          y: [59.5, 62],
          xLabel: 'P (MW)',
          yLabel: 'f (Hz)',
          series: [
            { f: (p) => 61 - p, label: 'unit 1' },
            { f: (p) => 61.5 - 0.5 * p, label: 'unit 2', dashed: true },
          ],
          marks: [{ y: 60.5, label: '60.5 Hz' }],
        },
        r`How much power crosses depends on the **power angle** δ between E and V: $P = \frac{3EV}{X_s}\sin\delta$, largest at δ = 90° (the pull-out or steady-state limit). The slope of that curve, $\frac{3EV}{X_s}\cos\delta$ per radian, is the **synchronizing power** that pulls a disturbed machine back into step.`,
        {
          type: 'plot',
          alt: 'The power-angle curve of a machine with E 2800 V, V 2400 V per phase and Xs 5 ohm: a sine rising to 4.03 MW at 90 degrees, with 1.70 MW at a power angle of 25 degrees.',
          caption: 'The power-angle curve: 1.70 MW at δ = 25°, at most 4.03 MW at 90°.',
          x: [0, 180],
          y: [0, 4.6],
          xLabel: 'δ (°)',
          yLabel: 'P (MW)',
          series: [{ f: (d) => 4.032 * Math.sin(d * deg), label: 'P', area: true }],
          marks: [{ x: 25, label: 'δ = 25°' }, { y: 4.032, label: 'pull-out' }],
        },
      ],
      keyIdeas: [
        r`$P = \frac{3EV}{X_s}\sin\delta$; limit at $\delta = 90°$; synchronizing power $\frac{3EV}{X_s}\cos\delta$ per radian.`,
        r`Governors set real power (droop: $f = f_{nl} - S_PP$); field current sets vars.`,
        r`Salient pole adds reluctance power $\frac{3V^2}{2}\left(\frac{1}{X_q} - \frac{1}{X_d}\right)\sin2\delta$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sharing by droop',
          problem: r`One unit's governor gives $f = 61.0 - 1.0P$, another's $f = 61.5 - 0.5P$ (Hz, MW). They share 2.5 MW. Find the frequency and each output.`,
          steps: [
            r`Same frequency: $61 - P_1 = 61.5 - 0.5P_2$, with $P_1 + P_2 = 2.5$.`,
            r`$61 - (2.5 - P_2) = 61.5 - 0.5P_2$ gives $1.5P_2 = 3$: $P_2 = 2.0$ MW, $P_1 = 0.5$ MW.`,
            r`$f = 61 - 0.5 = 60.5$ Hz.`,
          ],
          answer: r`60.5 Hz; 0.5 MW and 2.0 MW.`,
        },
        {
          level: 'board',
          title: 'Power angle and synchronizing power',
          problem: r`A machine with $E = 2800$ V, $V = 2400$ V per phase and $X_s = 5$ Ω runs at $\delta = 25°$. Find P, the pull-out power, and the synchronizing power per degree.`,
          steps: [
            r`$\frac{3EV}{X_s} = \frac{3 \times 2800 \times 2400}{5} = 4.032$ MW, the pull-out power.`,
            r`$P = 4.032\sin25° = 1.70$ MW.`,
            r`$P_{syn} = 4.032\cos25° = 3.654$ MW per radian, $\times\frac{\pi}{180}$: 63.8 kW per degree.`,
          ],
          answer: r`1.70 MW; 4.03 MW; 63.8 kW per degree.`,
        },
      ],
      traps: [
        r`Raising a machine's field does NOT pick up real load; it only changes its vars.`,
        r`The steadier the load sharing, the steeper the droop: a flat droop line hunts for load.`,
      ],
      check: [
        { q: r`Name the five conditions for paralleling an alternator.`, a: r`Equal voltage, equal frequency, same phase sequence, in phase, same waveform.` },
        { q: r`Which control shares REAL power between paralleled alternators?`, a: r`The prime movers' governors.` },
      ],
    },
    {
      name: 'Synchronous Motors and V-Curves',
      inShort: r`Runs exactly at synchronous speed; its excitation sets its power factor.`,
      body: [
        r`A synchronous motor runs at exactly synchronous speed or not at all: more load only makes the rotor lag further behind the field (a larger δ), until pull-out at δ = 90°. It is not self-starting: **damper (amortisseur) bars** in the pole faces start it as an induction motor, and they also damp hunting.`,
        r`| Torque | Meaning |
|---|---|
| Starting | at standstill, from the damper bars |
| Pull-in | the load it can pull into step from 2% to 5% slip |
| Running | at synchronous speed |
| Pull-out | the most it can carry before slipping out of step |`,
        r`At a given load, the field current sets the power factor. A plot of armature current against excitation is a **V-curve**: the current is least at unity power factor; under-excited the motor draws lagging current, over-excited leading current.`,
        {
          type: 'plot',
          alt: 'V-curves of a synchronous motor on 2400 V per phase with Xs 6 ohm: armature current against excitation EMF for 100 kW and 50 kW per phase, each falling to a minimum near 2400 V, at unity power factor, and rising again on both sides.',
          caption: 'V-curves at two loads: least current at unity power factor; under-excited (left) lags, over-excited (right) leads.',
          x: [1800, 3200],
          y: [0, 200],
          xLabel: 'E (V per phase)',
          yLabel: 'I_a (A)',
          series: [
            { f: vCurve(100000), label: '100 kW per phase' },
            { f: vCurve(50000), label: '50 kW per phase', dashed: true },
          ],
          marks: [{ x: Math.hypot(2400, 250), label: 'unity pf' }],
        },
      ],
      keyIdeas: [
        r`$\mathbf{E} = \mathbf{V} - \mathbf{I}(R_a + jX_s)$; load raises δ, not speed. Pull-out $P_{\max} = \frac{3EV}{X_s}$.`,
        r`Not self-starting: damper windings start it as an induction motor.`,
        r`V-curve: least current at unity pf, $E = \sqrt{V^2 + (IX_s)^2}$; under-excited lags, over-excited leads.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'EMF for unity power factor',
          problem: r`A 300 kW synchronous motor runs on 2400 V per phase with $X_s = 6$ Ω. Find the current and the EMF for unity power factor.`,
          steps: [
            r`$I = \frac{300\,000}{3 \times 2400} = 41.67$ A, in phase with V.`,
            r`$\mathbf{E} = 2400 - j41.67 \times 6$, so $E = \sqrt{2400^2 + 250^2} = 2413$ V.`,
          ],
          answer: r`41.7 A; 2413 V.`,
        },
        {
          level: 'board',
          title: 'Over-excited: current and power factor',
          problem: r`The same motor at the same load is over-excited to $E = 2800$ V. Find δ, the armature current, the power factor and the vars it supplies.`,
          steps: [
            r`$E\sin\delta = \frac{PX_s}{3V} = 250$ V, so $\delta = \sin^{-1}\frac{250}{2800} = 5.12°$.`,
            r`$I = \frac{\lvert 2400 - 2800\angle{-5.12°}\rvert}{6} = \frac{\sqrt{(2400 - 2788.8)^2 + 250^2}}{6} = 77.0$ A.`,
            r`pf $= \frac{100\,000}{2400 \times 77.0} = 0.541$ leading; $Q = 3 \times 2400 \times 77.0 \times \sin(\cos^{-1}0.541) = 467$ kvar supplied.`,
          ],
          answer: r`5.12°; 77.0 A; 0.541 leading; 467 kvar.`,
        },
      ],
      traps: [
        r`More excitation past unity pf makes the current RISE again, now leading.`,
        r`A synchronous motor slows only by falling out of step: its speed is fixed by the frequency.`,
      ],
      check: [
        { q: r`What starts a synchronous motor?`, a: r`Its damper (amortisseur) winding, acting as an induction motor.` },
        { q: r`An over-excited synchronous motor draws current at what power factor?`, a: r`Leading.` },
      ],
    },
    {
      name: 'Power Factor Correction with Synchronous Machines',
      inShort: r`An over-excited synchronous motor or condenser supplies leading vars.`,
      body: [
        r`An over-excited synchronous machine supplies vars, so it can correct a plant's power factor while it works. A **synchronous condenser** does nothing else: it runs with no mechanical load, purely as a var source whose output adjusts smoothly with its field. A loaded synchronous motor does both jobs at once; size it by its kVA, $\sqrt{P_m^2 + Q_m^2}$.`,
        {
          type: 'phasor',
          alt: 'Power triangles tip to tail: a plant load of 400 kW and 408 kvar lagging, then a synchronous motor adding 100 kW and supplying 244 kvar, leaving 500 kW and 164 kvar, 0.95 lagging.',
          caption: 'The plant (400 kW at 0.7) plus the over-excited motor (100 kW, 244 kvar leading) gives 500 kW at 0.95.',
          axes: false,
          vectors: [
            { name: 'load', mag: 571.4, angle: 45.57, label: 'S_{load}' },
            { mag: 263.5, angle: -67.69, from: 'load', label: 'S_m', colour: 1 },
            { mag: 526.3, angle: 18.19, label: 'S_{total}', colour: 2 },
          ],
          arcs: [{ from: 0, to: 18.19, label: '18.2°', r: 60 }],
        },
        r`| | Synchronous condenser | Static capacitors |
|---|---|---|
| Vars | smoothly adjustable, leading or lagging | in fixed steps, leading only |
| Losses | a few percent | very low |
| Cost and upkeep | higher; rotating | lower |
| Also | adds short-circuit strength and inertia | none |`,
      ],
      keyIdeas: [
        r`A synchronous condenser runs unloaded, purely as an adjustable var source.`,
        r`A loaded motor: $Q_m = Q_{load} - P_{tot}\tan\theta_2$, size by $S_m = \sqrt{P_m^2 + Q_m^2}$.`,
        r`Unlike capacitors, its vars adjust smoothly with excitation.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A synchronous condenser',
          problem: r`A plant takes 1000 kW at 0.75 lagging. What synchronous condenser rating brings it to 0.90 lagging (neglect the condenser's losses), and how much kVA is freed?`,
          steps: [
            r`$Q_1 = 1000\tan(\cos^{-1}0.75) = 881.9$ kvar; $Q_2 = 1000\tan(\cos^{-1}0.90) = 484.3$ kvar.`,
            r`Condenser: $881.9 - 484.3 = 397.6$ kvar.`,
            r`kVA falls from $\frac{1000}{0.75} = 1333$ to $\frac{1000}{0.9} = 1111$.`,
          ],
          answer: r`397.6 kvar; 222 kVA freed.`,
        },
        {
          level: 'board',
          title: 'A motor that also corrects',
          problem: r`A plant takes 400 kW at 0.7 lagging. A synchronous motor drawing 100 kW is added to bring the plant to 0.95 lagging. Find the motor's kvar, kVA and power factor.`,
          steps: [
            r`$Q_{load} = 400\tan(\cos^{-1}0.7) = 408.1$ kvar.`,
            r`Target: $500\tan(\cos^{-1}0.95) = 164.3$ kvar, so $Q_m = 408.1 - 164.3 = 243.7$ kvar leading.`,
            r`$S_m = \sqrt{100^2 + 243.7^2} = 263.5$ kVA, at $\frac{100}{263.5} = 0.380$ leading.`,
          ],
          answer: r`243.7 kvar; 263.5 kVA; 0.380 leading.`,
        },
      ],
      traps: [
        r`Total real power includes the motor's: use $P_{load} + P_m$ for the target.`,
        r`A condenser is over-excited to supply vars; under-excited it absorbs them.`,
      ],
      check: [
        { q: r`What is a synchronous condenser?`, a: r`A synchronous motor run without load, over- or under-excited, as an adjustable var source.` },
        { q: r`Why size a correcting motor by kVA rather than kW?`, a: r`Its current carries both the real and the reactive power.` },
      ],
    },
    {
      name: 'Induction Motor Slip and Torque',
      inShort: r`The rotor slips behind the field; slip makes rotor current and torque.`,
      body: [
        r`The stator's three-phase currents make a field rotating at synchronous speed. The rotor turns a little slower, so the field slips past its bars, inducing currents that make torque: no slip, no torque. **Slip** $s = \frac{N_s - N_r}{N_s}$ sets everything in the rotor: its frequency $f_r = sf$, its EMF $sE_2$ and its reactance $sX_2$.`,
        r`| | Squirrel cage | Wound rotor |
|---|---|---|
| Rotor | bars shorted by end rings | three-phase winding to slip rings |
| Speed | nearly constant | adjustable with external resistance |
| Starting | torque set by the bar design | high torque, low current, with added resistance |
| Uses | fans, pumps, compressors | cranes, hoists, conveyors, large pumps |`,
        r`Torque against speed rises from the starting torque to a **maximum (breakdown)** torque at slip $s_m = \frac{R_2}{\sqrt{R_1^2 + X^2}}$, then falls steeply to zero at synchronous speed. Raising $R_2$ moves the peak to a higher slip without changing its height:`,
        {
          type: 'plot',
          alt: 'Torque against speed for a 460 V, 4-pole motor: from 252 N·m at standstill rising to a peak of 450 N·m at 1326 rpm, then falling to zero at 1800 rpm; with twice the rotor resistance the same peak moves to lower speed and the starting torque rises.',
          caption: 'Torque against speed: doubling R₂ (dashed) moves the same 450 N·m peak to a lower speed and raises the starting torque.',
          x: [0, 1800],
          y: [0, 600],
          xLabel: 'speed (rpm)',
          yLabel: 'T (N·m)',
          series: [
            { f: (n) => torque(1 - n / 1800), label: 'R₂' },
            { f: (n) => torque(1 - n / 1800, { R2: 0.5 }), label: '2R₂', dashed: true },
          ],
          marks: [{ y: 449.5, label: 'T max 450 N·m' }],
        },
      ],
      keyIdeas: [
        r`$s = \frac{N_s - N_r}{N_s}$, $f_r = sf$, $X_r = sX_2$, $E_r = sE_2$.`,
        r`$T = \frac{3V^2(R_2/s)}{\omega_s[(R_1 + R_2/s)^2 + X^2]}$; peak at $s_m = \frac{R_2}{\sqrt{R_1^2 + X^2}}$.`,
        r`$T_{\max}$ is independent of $R_2$ and varies as $V^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Torques from the circuit',
          problem: r`A 460 V, 4-pole, 60 Hz motor has $R_1 = 0.3$ Ω, $R_2 = 0.25$ Ω, $X_1 + X_2 = 0.9$ Ω per phase. Find the torque at 4% slip, the slip at maximum torque, the maximum torque and the starting torque.`,
          steps: [
            r`$V = \frac{460}{\sqrt3} = 265.6$ V, $\omega_s = 188.5$ rad/s. At $s = 0.04$: $T = 160.5$ N·m.`,
            r`$s_m = \frac{0.25}{\sqrt{0.09 + 0.81}} = 0.264$, where $T_{\max} = 449.5$ N·m.`,
            r`At $s = 1$: $T_{st} = 252.3$ N·m.`,
          ],
          answer: r`160.5 N·m; 0.264; 449.5 N·m; 252.3 N·m.`,
        },
        {
          level: 'board',
          title: 'Rotor quantities',
          problem: r`A 6-pole, 60 Hz motor runs at 1164 rpm. Its rotor has 120 V per phase at standstill, $R_2 = 0.08$ Ω and $X_2 = 0.6$ Ω. Find the slip, the rotor frequency, EMF and reactance, and the rotor current.`,
          steps: [
            r`$N_s = 1200$ rpm, $s = \frac{36}{1200} = 0.03$; $f_r = 0.03 \times 60 = 1.8$ Hz.`,
            r`$E_r = 0.03 \times 120 = 3.6$ V; $X_r = 0.03 \times 0.6 = 0.018$ Ω.`,
            r`$I_2 = \frac{3.6}{\sqrt{0.08^2 + 0.018^2}} = 43.9$ A.`,
          ],
          answer: r`3%; 1.8 Hz, 3.6 V, 0.018 Ω; 43.9 A.`,
        },
      ],
      traps: [
        r`Keep slip as a decimal, and use PHASE voltage with the 3.`,
        r`The rotor's reactance at running slip is $sX_2$, far smaller than at standstill.`,
      ],
      check: [
        { q: r`What happens to the maximum torque if the supply voltage falls 10%?`, a: r`It falls to $0.9^2 = 0.81$ of its value.` },
        { q: r`An 8-pole, 60 Hz motor runs at 873 rpm. What is its slip?`, a: r`$\frac{900 - 873}{900} = 3\%$.` },
      ],
    },
    {
      name: 'Equivalent Circuit',
      inShort: r`A transformer whose secondary load is $R_2\frac{1 - s}{s}$, the mechanical power.`,
      body: [
        r`An induction motor is a transformer with a rotating secondary. Referred to the stator, the rotor's resistance becomes $\frac{R_2}{s}$, which splits into its real copper loss $R_2$ and a load $R_2\frac{1 - s}{s}$ that stands for the mechanical power:`,
        {
          type: 'circuit',
          alt: 'The per-phase equivalent circuit of an induction motor: the supply, the stator resistance and leakage reactance, the magnetizing reactance across, then the rotor resistance and reactance, ending in a load resistance R2 times one minus s over s.',
          caption: 'Per phase: the load resistance R₂(1 − s)/s carries the mechanical power.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'V_1'],
            ['R', [0, 0], [1.5, 0], 'R_1'],
            ['L', [1.5, 0], [3, 0], 'jX_1'],
            ['L', [3, 0], [3, 2], 'jX_m'],
            ['R', [3, 0], [4.5, 0], 'R_2'],
            ['L', [4.5, 0], [6, 0], 'jX_2'],
            ['R', [6, 0], [6, 2], 'R_2(1−s)/s'],
            ['wire', [6, 2], [0, 2]],
            ['dot', [3, 0]],
            ['dot', [3, 2]],
          ],
        },
        r`| Stage | Equals | Loss taken out |
|---|---|---|
| Stator input $P_{in}$ | $\sqrt3V_LI_L\cos\theta$ | stator copper and core |
| Air-gap power $P_g$ (rotor input) | $3I_2^2\frac{R_2}{s}$ | rotor copper, $sP_g$ |
| Developed power $P_m$ | $(1 - s)P_g$ | friction and windage |
| Output | $P_m - P_{f\&w}$ | |`,
        r`So $P_g : P_{rcl} : P_m = 1 : s : (1 - s)$, the rotor's own efficiency is $1 - s = \frac{N_r}{N_s}$, and the torque is $\frac{P_g}{\omega_s} = \frac{P_m}{\omega_m}$.`,
      ],
      keyIdeas: [
        r`$P_g : P_{rcl} : P_m = 1 : s : (1 - s)$; $P_{out} = P_m - P_{f\&w}$.`,
        r`$P_g = 3I_2^2\frac{R_2}{s}$; $T = \frac{P_g}{\omega_s} = \frac{P_m}{\omega_m}$.`,
        r`Rotor efficiency $= 1 - s = \frac{N_r}{N_s}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'From air-gap power',
          problem: r`A 4-pole, 60 Hz motor has 40 kW air-gap power at 3% slip and 800 W friction and windage. Find the rotor copper loss, developed power, output and torque.`,
          steps: [
            r`Rotor copper $= 0.03 \times 40 = 1.2$ kW; $P_m = 38.8$ kW; output $= 38.0$ kW.`,
            r`$T = \frac{40\,000}{188.5} = 212$ N·m.`,
          ],
          answer: r`1.2 kW; 38.8 kW; 38.0 kW; 212 N·m.`,
        },
        {
          level: 'board',
          title: 'The whole power flow',
          problem: r`A motor takes 50 kW. Its stator copper loss is 1.5 kW, core loss 1.0 kW, friction and windage 0.8 kW, and it runs at 4% slip. Find the air-gap power, rotor copper loss, output and efficiency.`,
          steps: [
            r`$P_g = 50 - 1.5 - 1.0 = 47.5$ kW; rotor copper $= 0.04 \times 47.5 = 1.9$ kW.`,
            r`$P_m = 0.96 \times 47.5 = 45.6$ kW; output $= 45.6 - 0.8 = 44.8$ kW.`,
            r`$\eta = \frac{44.8}{50} = 89.6\%$.`,
          ],
          answer: r`47.5 kW; 1.9 kW; 44.8 kW; 89.6%.`,
        },
      ],
      traps: [
        r`Rotor copper loss is $s$ times AIR-GAP power, not input power.`,
        r`Torque from air-gap power uses synchronous speed; from developed power, rotor speed.`,
      ],
      check: [
        { q: r`What is the rotor efficiency of a motor at 5% slip?`, a: r`95%.` },
        { q: r`What does $R_2\frac{1 - s}{s}$ represent?`, a: r`The mechanical load: the power it absorbs is the developed power.` },
      ],
    },
    {
      name: 'Starting Methods',
      inShort: r`Direct-on-line draws 5 to 8 times full-load current; reduced voltage cuts current and torque.`,
      body: [
        r`At standstill an induction motor is a transformer with a shorted secondary: switched straight on (**direct-on-line**, across the line) it draws 5 to 8 times its full-load current. Reduced-voltage starters cut that current, but torque goes with the square of the voltage, so they also cut the starting torque:`,
        {
          type: 'plot',
          alt: 'Torque against speed for the worked motor at full voltage, through a 65 percent autotransformer, and in star-delta: three curves of the same shape, the reduced ones at 42 and 33 percent of full-voltage torque.',
          caption: 'Full voltage, a 65% autotransformer (×0.42) and star-delta (×⅓): torque falls with the square of the voltage.',
          x: [0, 1800],
          y: [0, 600],
          xLabel: 'speed (rpm)',
          yLabel: 'T (N·m)',
          series: [
            { f: (n) => torque(1 - n / 1800), label: 'full voltage' },
            { f: (n) => 0.4225 * torque(1 - n / 1800), label: '65% tap', dashed: true },
            { f: (n) => torque(1 - n / 1800) / 3, label: 'star-delta', dashed: true },
          ],
        },
        r`| Starter | Line current | Starting torque |
|---|---|---|
| Direct-on-line | 1 | 1 |
| Primary resistor or reactor, voltage x | x | $x^2$ |
| Autotransformer, tap x | $x^2$ | $x^2$ |
| Star-delta | $\frac13$ | $\frac13$ |
| Part winding | about $\frac12$ to $\frac23$ | about $\frac12$ |
| Wound rotor, added resistance | low | high, up to $T_{\max}$ |`,
      ],
      keyIdeas: [
        r`$\frac{T_{st}}{T_{fl}} = \left(\frac{I_{st}}{I_{fl}}\right)^2s_{fl}$.`,
        r`Star-delta: line current and torque $\frac13$. Autotransformer at tap x: line current and torque $x^2$.`,
        r`Wound rotor: $R_2 + R_{ext} = \sqrt{R_1^2 + X^2}$ starts it at maximum torque.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Starting torque three ways',
          problem: r`A motor draws 6 times full-load current on direct start and has 3% full-load slip. Find its starting torque direct, in star-delta, and through a 65% autotransformer.`,
          steps: [
            r`DOL: $6^2 \times 0.03 = 1.08$ of full-load torque.`,
            r`Star-delta: $\frac{1.08}{3} = 0.36$. Autotransformer: $0.65^2 \times 1.08 = 0.456$.`,
          ],
          answer: r`1.08, 0.36 and 0.456 of full-load torque.`,
        },
        {
          level: 'board',
          title: 'Starting a wound rotor at maximum torque',
          problem: r`For the motor of Slip and Torque ($R_1 = 0.3$ Ω, $R_2 = 0.25$ Ω, $X = 0.9$ Ω, referred), what added rotor resistance gives maximum torque at standstill, and what is that torque?`,
          steps: [
            r`Maximum torque at $s = 1$ needs $R_2 + R_{ext} = \sqrt{0.3^2 + 0.9^2} = 0.949$ Ω, so $R_{ext} = 0.699$ Ω.`,
            r`The peak's height does not depend on $R_2$: $T_{st} = T_{\max} = 449.5$ N·m, against 252.3 N·m without it.`,
          ],
          answer: r`0.699 Ω (referred); 449.5 N·m.`,
        },
      ],
      traps: [
        r`Reduced-voltage starting cuts torque as the SQUARE of voltage: check the load can still start.`,
        r`An autotransformer cuts the LINE current by $x^2$, a resistor starter only by x.`,
      ],
      check: [
        { q: r`Star-delta starting reduces the line current to what fraction?`, a: r`One third.` },
        { q: r`Why are wound-rotor motors used on cranes?`, a: r`Added rotor resistance gives high starting torque with low current.` },
      ],
    },
    {
      name: 'Speed Control',
      inShort: r`Change the synchronous speed (frequency, poles) or the slip (rotor resistance, voltage).`,
      body: [
        r`An induction motor's speed is $N_s(1 - s)$, so there are two ways to change it: change the synchronous speed (the frequency or the number of poles), or change the slip (rotor resistance or stator voltage). The modern way is a **variable-frequency drive**, holding volts per hertz constant so the flux, and with it the available torque, stays the same:`,
        {
          type: 'plot',
          alt: 'Torque against speed for the worked motor on a drive at 60, 45 and 30 Hz with volts per hertz constant: the same shape moved to lower speeds, with only a slightly lower peak at the lower frequencies.',
          caption: 'A drive at 60, 45 and 30 Hz (V/f constant): the curve slides down in speed and keeps nearly its full torque.',
          x: [0, 1800],
          y: [0, 600],
          xLabel: 'speed (rpm)',
          yLabel: 'T (N·m)',
          series: [
            { f: atFrequency(60), label: '60 Hz' },
            { f: atFrequency(45), label: '45 Hz', dashed: true },
            { f: atFrequency(30), label: '30 Hz', dashed: true },
          ],
        },
        r`| Method | Changes | Note |
|---|---|---|
| Frequency (VFD) | $N_s$ | V/f constant; smooth and efficient; the standard today |
| Pole changing | $N_s$ | two or more fixed speeds (consequent poles give 2:1) |
| Rotor resistance (wound rotor) | slip | slip ∝ $R_2$ at a given torque; wasteful |
| Stator voltage | slip | slip ∝ $\frac{1}{V^2}$ at a given torque; fans and pumps only |
| Cascade (concatenation) | $N_s$ | two motors on one shaft: $\frac{120f}{P_1 \pm P_2}$ |`,
      ],
      keyIdeas: [
        r`VFD: $N_s = \frac{120f}{P}$ with $\frac{V}{f}$ constant to keep the flux.`,
        r`Rotor resistance: slip ∝ $R_2$ at the same torque (wasteful). Stator voltage: slip ∝ $\frac{1}{V^2}$.`,
        r`Pole changing gives fixed speeds; cascade gives $\frac{120f}{P_1 + P_2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Rotor resistance and a drive',
          problem: r`A 460 V, 60 Hz, 4-pole motor runs at 3% slip. Doubling its rotor resistance at the same torque gives what speed? And what voltage for a drive at 30 Hz?`,
          steps: [
            r`Slip doubles to 6%: $N = 1800 \times 0.94 = 1692$ rpm.`,
            r`At 30 Hz: $V = 460 \times \frac{30}{60} = 230$ V, and $N_s = 900$ rpm.`,
          ],
          answer: r`1692 rpm; 230 V.`,
        },
        {
          level: 'board',
          title: 'Stator voltage control',
          problem: r`The same motor at the same load torque has its voltage cut to 90%. Find the new slip and speed, taking slip as inversely proportional to the square of the voltage.`,
          steps: [
            r`$s = \frac{0.03}{0.9^2} = 0.0370$.`,
            r`$N = 1800 \times (1 - 0.0370) = 1733$ rpm.`,
          ],
          answer: r`3.70%; 1733 rpm.`,
        },
      ],
      traps: [
        r`Lowering the frequency without lowering the voltage over-fluxes and overheats the motor.`,
        r`Voltage control also lowers the maximum torque, as $V^2$.`,
      ],
      check: [
        { q: r`Two 4-pole and 6-pole motors in cumulative cascade on 60 Hz: what speed?`, a: r`$\frac{120 \times 60}{10} = 720$ rpm.` },
        { q: r`Why keep V/f constant on a drive?`, a: r`To keep the flux, and so the torque capability, constant.` },
      ],
    },
    {
      name: 'Single-Phase Motors',
      inShort: r`A pulsating field gives no starting torque; an auxiliary winding makes it rotate.`,
      body: [
        r`A single winding on ac makes a field that pulses but does not rotate. It acts as two equal fields turning opposite ways (the **double revolving field**): at standstill their torques cancel, so the motor hums but will not start; once turning, the forward field wins.`,
        {
          type: 'plot',
          alt: 'Torques of the forward and backward fields and their sum against speed: at standstill they are equal and opposite, so the net torque is zero; as speed rises the forward torque grows and the net torque becomes positive.',
          caption: 'Forward and backward fields (dashed) cancel at standstill; once turning, the net torque (solid) is forward.',
          x: [0, 1],
          y: [-1.1, 1.1],
          xLabel: 'speed (per unit)',
          yLabel: 'T (per unit)',
          series: [
            { f: (n) => kloss(1 - n) - kloss(1 + n), label: 'net' },
            { f: (n) => kloss(1 - n), label: 'forward', dashed: true },
            { f: (n) => -kloss(1 + n), label: 'backward', dashed: true },
          ],
          legend: false,
        },
        r`So every single-phase motor has some way to start:`,
        r`| Motor | Starts by | Uses |
|---|---|---|
| Split phase | a high-resistance auxiliary winding, cut out by a centrifugal switch at 75% to 80% speed | grinders, blowers |
| Capacitor start | a capacitor in the auxiliary winding: high starting torque | refrigerators, air conditioners, pumps |
| Capacitor start, capacitor run | a start capacitor plus a smaller run capacitor | quieter, better pf |
| Shaded pole | a shorted copper ring on part of each pole | small fans |
| Universal | a series motor on ac or dc | portable tools, mixers |
| Repulsion (start) | shorted brushes on a commutator | high-torque starts |`,
      ],
      keyIdeas: [
        r`Double revolving field: forward slip s, backward slip $2 - s$.`,
        r`Split-phase, capacitor-start, capacitor-run, shaded-pole; reverse by swapping the auxiliary winding's leads.`,
        r`Capacitor for 90°: $X_C = X_a + \frac{R_aR_m}{X_m}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Forward and backward slips',
          problem: r`A 4-pole, 60 Hz single-phase motor runs at 1710 rpm. Find its slip in each field and the rotor frequencies.`,
          steps: [
            r`Forward: $s = \frac{1800 - 1710}{1800} = 0.05$; rotor frequency $0.05 \times 60 = 3$ Hz.`,
            r`Backward: $2 - s = 1.95$; rotor frequency $1.95 \times 60 = 117$ Hz.`,
          ],
          answer: r`0.05 and 1.95; 3 Hz and 117 Hz.`,
        },
        {
          level: 'board',
          title: 'Sizing the starting capacitor',
          problem: r`Main winding $2 + j3.5$ Ω, auxiliary $9 + j2$ Ω, 60 Hz. Find the capacitor that puts the currents 90° apart.`,
          steps: [
            r`$X_C = 2 + \frac{9 \times 2}{3.5} = 7.14$ Ω.`,
            r`$C = \frac{1}{2\pi \times 60 \times 7.14} = 371$ µF.`,
          ],
          answer: r`371 µF.`,
        },
      ],
      traps: [
        r`Without the auxiliary winding the motor hums but will not start; once turning it runs either way.`,
        r`To reverse, swap the leads of ONE winding, not of the supply.`,
      ],
      check: [
        { q: r`Which single-phase motor runs on both ac and dc?`, a: r`The universal motor.` },
        { q: r`What disconnects a split-phase motor's auxiliary winding?`, a: r`A centrifugal switch, at about 75% to 80% of synchronous speed.` },
      ],
    },
    {
      name: 'Special Machines (Stepper, Servo)',
      inShort: r`Motors for position and speed control: steppers move in fixed steps, servos follow a command.`,
      body: [
        r`A **stepper motor** turns a fixed angle for each pulse it receives, so a pulse count is a position and a pulse rate is a speed, with no feedback needed (open loop). A **servomotor** runs in a closed loop, a sensor reporting its position or speed back to the drive.`,
        {
          type: 'plot',
          alt: 'Shaft angle against time for a 1.8 degree stepper at 400 pulses per second: a staircase climbing 1.8 degrees every 2.5 milliseconds, 14.4 degrees after 20 milliseconds.',
          caption: 'A 1.8° stepper at 400 pulses per second: one step every 2.5 ms, 120 rpm on average.',
          x: [0, 20],
          y: [0, 18],
          xLabel: 't (ms)',
          yLabel: 'θ (°)',
          series: [{ f: (t) => 1.8 * Math.floor(t / 2.5 + 1e-9), label: 'θ' }],
        },
        r`| Machine | Works by | Note |
|---|---|---|
| Variable-reluctance stepper | teeth pulled into line with the energized poles | step $\frac{N_s - N_r}{N_sN_r} \times 360°$ |
| Permanent-magnet stepper | a magnet rotor | holds position unpowered (detent) |
| Hybrid stepper | magnet plus fine teeth | 1.8° (50 rotor teeth, two phases) |
| Reluctance and hysteresis motors | rotor saliency or hysteresis, no field winding | run at synchronous speed; clocks, timers |
| Servomotor | ac or dc motor with a position or speed sensor | closed loop |`,
      ],
      keyIdeas: [
        r`Step angle: VR $\frac{N_s - N_r}{N_sN_r} \times 360°$; two-phase hybrid $\frac{360°}{2mN_r}$ (50 teeth: 1.8°).`,
        r`Speed $n = \frac{\theta f_p}{6}$ rpm, θ in degrees, $f_p$ in pulses per second.`,
        r`Steppers run open loop; servomotors in closed loop.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A hybrid stepper',
          problem: r`A 1.8° stepper is driven at 400 pulses per second. Find its speed and steps per revolution.`,
          steps: [
            r`$\frac{360}{1.8} = 200$ steps per revolution.`,
            r`$n = \frac{1.8 \times 400}{6} = 120$ rpm.`,
          ],
          answer: r`120 rpm; 200 steps.`,
        },
        {
          level: 'board',
          title: 'A variable-reluctance stepper',
          problem: r`A variable-reluctance stepper has 12 stator and 8 rotor teeth. Find its step angle, steps per revolution, and speed at 300 pulses per second.`,
          steps: [
            r`Step $= \frac{12 - 8}{12 \times 8} \times 360° = 15°$; $\frac{360}{15} = 24$ steps per revolution.`,
            r`$n = \frac{15 \times 300}{6} = 750$ rpm.`,
          ],
          answer: r`15°; 24 steps; 750 rpm.`,
        },
      ],
      traps: [
        r`Driven too fast, a stepper loses steps silently: it runs open loop.`,
        r`The speed formula wants the step angle in DEGREES.`,
      ],
      check: [
        { q: r`Which motor runs closed loop with a feedback sensor?`, a: r`The servomotor.` },
        { q: r`How many pulses turn a 7.5° stepper through 3 revolutions?`, a: r`$\frac{3 \times 360}{7.5} = 144$.` },
      ],
    },
    {
      name: 'Machine Testing and Efficiency',
      inShort: r`Tests give the equivalent circuit without loading the machine.`,
      body: [
        r`AC machines, like transformers, are characterized by tests that need no real load:`,
        r`| Machine | Test | Gives |
|---|---|---|
| Induction | no load (rated voltage) | core plus friction and windage losses; $X_m$ |
| Induction | blocked rotor (reduced voltage, rated current) | $R_1 + R_2$ and $X_1 + X_2$ |
| Induction | dc resistance | $R_1$ |
| Synchronous | open and short circuit | $Z_s$, short-circuit ratio |
| Synchronous (salient) | slip test | $X_d = \frac{V_{\max}}{I_{\min}}$, $X_q = \frac{V_{\min}}{I_{\max}}$ |`,
        r`On the synchronous machine's open-circuit curve the voltage saturates while the short-circuit current stays a straight line, so $Z_s$ depends on where it is measured. The **short-circuit ratio**, the field current for rated voltage on open circuit over that for rated current on short circuit, is about $\frac{1}{X_{s,pu}}$ (unsaturated):`,
        {
          type: 'plot',
          alt: 'Open-circuit voltage and short-circuit current against field current, both per unit: the open-circuit curve rising and saturating, reaching rated voltage at a field current of 1.10, while the short-circuit line reaches rated current at 1.67.',
          caption: 'Open-circuit (solid) and short-circuit (dashed) curves: SCR = 1.10 / 1.67 = 0.66.',
          x: [0, 2.5],
          y: [0, 1.5],
          xLabel: 'field current (per unit)',
          yLabel: 'per unit',
          series: [
            { f: (i) => 1.25 * Math.tanh(i), label: 'open circuit V' },
            { f: (i) => 0.6 * i, label: 'short circuit I', dashed: true },
          ],
          legend: false,
          marks: [{ y: 1, label: 'rated' }],
        },
      ],
      keyIdeas: [
        r`Induction: blocked rotor gives $R_1 + R_2$ and $X_1 + X_2$; no load gives core plus friction and windage, and $X_m$.`,
        r`Synchronous: open and short circuit give $Z_s$ and SCR; the slip test gives $X_d$ and $X_q$.`,
        r`Efficiency: output over output plus losses (copper, core, friction and windage, field, stray).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Blocked-rotor test',
          problem: r`A blocked-rotor test of a Y motor reads 48 V (line), 20 A, 1500 W; a dc test gives $R_1 = 0.5$ Ω per phase. Find $R_2$ and $X_1 + X_2$.`,
          steps: [
            r`$R_1 + R_2 = \frac{1500}{3 \times 20^2} = 1.25$ Ω, so $R_2 = 0.75$ Ω.`,
            r`$\lvert Z\rvert = \frac{48}{\sqrt3 \times 20} = 1.386$ Ω; $X_1 + X_2 = \sqrt{1.386^2 - 1.25^2} = 0.598$ Ω.`,
          ],
          answer: r`0.75 Ω; 0.598 Ω.`,
        },
        {
          level: 'board',
          title: 'No-load test, and the SCR',
          problem: r`(a) The same motor at no load takes 8 A and 900 W. Find its core plus friction and windage loss. (b) In the figure, the open-circuit curve reaches rated voltage at a field current of 1.10 and the short-circuit line reaches rated current at 1.67. Find the SCR and the unsaturated per-unit $X_s$ it implies.`,
          steps: [
            r`(a) Stator copper at no load: $3 \times 8^2 \times 0.5 = 96$ W, so core plus friction and windage $= 900 - 96 = 804$ W.`,
            r`(b) SCR $= \frac{1.10}{1.67} = 0.66$, so $X_s \approx \frac{1}{0.66} = 1.52$ per unit.`,
          ],
          answer: r`804 W; SCR 0.66, about 1.5 per unit.`,
        },
      ],
      traps: [
        r`Use per-phase values: divide power by 3 and line voltage by $\sqrt3$ (Y).`,
        r`The no-load power includes a little stator copper loss: subtract it.`,
      ],
      check: [
        { q: r`Which induction motor test gives the leakage reactances?`, a: r`The blocked-rotor test.` },
        { q: r`What does a high short-circuit ratio mean?`, a: r`A low synchronous reactance: a stiffer, more stable, larger machine.` },
      ],
    },
  ],
};
