// Library › Lessons › EE › Electrical Machinery 2 (2026-11-18): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Transformers and DC machines
// are in Machinery 1; power-system stability builds on the power-angle curve here.
const r = String.raw;

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
      keyIdeas: [
        r`$N_s = \frac{120f}{P}$; electrical degrees $= \frac{P}{2} \times$ mechanical.`,
        r`$E = 4.44k_pk_dfN\Phi$ per phase; $k_p = \cos\frac{\beta}{2}$, $k_d = \frac{\sin(q\alpha/2)}{q\sin(\alpha/2)}$.`,
        r`Short pitching by $\frac{180°}{n}$ removes the nth harmonic; per phase, a machine is $E$ behind $R_a + jX_s$.`,
      ],
      example: {
        problem: r`A 4-pole, 60 Hz, 48-slot three-phase alternator has coils spanning 10 slots, 96 turns per phase and 0.04 Wb per pole. Find its speed, winding factors and phase EMF.`,
        solution: r`$N_s = 1800$ rpm. Pole pitch 12 slots, so $\beta = 30°$: $k_p = \cos 15° = 0.966$. $q = 4$, $\alpha = 15°$: $k_d = \frac{\sin 30°}{4\sin 7.5°} = 0.958$. $E = 4.44 \times 0.966 \times 0.958 \times 60 \times 96 \times 0.04 = 946$ V.`,
      },
      traps: [r`$\beta$ is the shortfall from 180°, not the coil span; both factors use electrical degrees.`],
    },
    {
      name: 'Voltage Regulation',
      inShort: r`How far the terminal voltage would rise if full load were thrown off.`,
      keyIdeas: [
        r`$\mathbf{E} = \mathbf{V} + \mathbf{I}(R_a + jX_s)$; $\text{VR} = \frac{E - V}{V}$.`,
        r`$Z_s = \frac{E_{oc}}{I_{sc}}$ at the same field current; SCR $\approx \frac{1}{X_{s,pu}}$.`,
        r`Lagging loads give large regulation; leading loads can make it negative.`,
      ],
      example: {
        problem: r`A Y-connected alternator has $V = 1000$ V per phase, $R_a = 0.2$ Ω, $X_s = 4$ Ω, and carries 100 A at 0.8 lagging. Find E and the regulation.`,
        solution: r`$\mathbf{I} = 100\angle{-36.9°} = 80 - j60$. $\mathbf{E} = 1000 + (80 - j60)(0.2 + j4) = 1256 + j308$, $|E| = 1293$ V. VR $= 29.3\%$.`,
      },
      traps: [r`Use PHASE voltage and current with per-phase $Z_s$; convert line values first.`],
    },
    {
      name: 'Parallel Operation of Alternators',
      inShort: r`Matched voltage, frequency, phase sequence and phase before closing; then droop and field share the load.`,
      keyIdeas: [
        r`$P = \frac{3EV}{X_s}\sin\delta$, $Q = \frac{3V(E\cos\delta - V)}{X_s}$; limit at $\delta = 90°$; synchronizing power $\frac{3EV}{X_s}\cos\delta$.`,
        r`Governors set real power (droop: $f = f_{nl} - S_PP$); field current sets vars.`,
        r`Salient pole adds reluctance power $\frac{V^2}{2}\left(\frac{1}{X_q} - \frac{1}{X_d}\right)\sin2\delta$.`,
      ],
      example: {
        problem: r`One unit's governor gives $f = 61.0 - 1.0P$, another's $f = 61.5 - 0.5P$ (Hz, MW). They share 2.5 MW. Find the frequency and each output. Then: a machine with $E = 2800$ V, $V = 2400$ V per phase, $X_s = 5$ Ω runs at $\delta = 25°$; find P and the pull-out power.`,
        solution: r`$61 - P_1 = 61.5 - 0.5P_2$ with $P_1 + P_2 = 2.5$: $P_1 = 0.5$ MW, $P_2 = 2.0$ MW, $f = 60.5$ Hz. $P = \frac{3 \times 2800 \times 2400}{5}\sin 25° = 1.70$ MW; maximum 4.03 MW.`,
      },
      traps: [r`Raising a machine's field does NOT pick up real load; it only changes its vars.`],
    },
    {
      name: 'Synchronous Motors and V-Curves',
      inShort: r`Runs exactly at synchronous speed; its excitation sets its power factor.`,
      keyIdeas: [
        r`$\mathbf{E} = \mathbf{V} - \mathbf{I}(R_a + jX_s)$; load raises $\delta$, not speed.`,
        r`Pull-out $P_{\max} = \frac{3EV}{X_s}$. Not self-starting: damper (amortisseur) windings start it as an induction motor.`,
        r`V-curve: current is least at unity pf, $E = \sqrt{V^2 + (IX_s)^2}$; under-excited lags, over-excited leads.`,
      ],
      example: {
        problem: r`A 300 kW synchronous motor runs on 2400 V per phase with $X_s = 6$ Ω. Find the current and the EMF for unity power factor.`,
        solution: r`$I = \frac{300{,}000}{3 \times 2400} = 41.7$ A. $E = \sqrt{2400^2 + (41.7 \times 6)^2} = 2413$ V.`,
      },
      traps: [r`More excitation past unity pf makes the current RISE again, now leading.`],
    },
    {
      name: 'Power Factor Correction with Synchronous Machines',
      inShort: r`An over-excited synchronous motor or condenser supplies leading vars.`,
      keyIdeas: [
        r`A synchronous condenser runs with no load, purely as an adjustable var source.`,
        r`A loaded motor: $Q_m = Q_{load} - P_{tot}\tan\theta_2$, size by $S_m = \sqrt{P_m^2 + Q_m^2}$.`,
        r`Unlike capacitors, its vars adjust smoothly with excitation.`,
      ],
      example: {
        problem: r`A plant takes 400 kW at 0.7 lagging. A synchronous motor drawing 100 kW is added to bring the plant to 0.95 lagging. Find the motor's kvar and kVA.`,
        solution: r`$Q_{load} = 400\tan(45.6°) = 408$ kvar. $Q_m = 408 - 500 \times 0.329 = 244$ kvar leading. $S_m = \sqrt{100^2 + 244^2} = 263$ kVA, at 0.38 leading.`,
      },
      traps: [r`Total real power includes the motor's: use $P_{load} + P_m$ for the target.`],
    },
    {
      name: 'Induction Motor Slip and Torque',
      inShort: r`The rotor slips behind the field; slip makes rotor current and torque.`,
      keyIdeas: [
        r`$s = \frac{N_s - N_r}{N_s}$, $f_r = sf$.`,
        r`$T = \frac{3V^2(R_2/s)}{\omega_s[(R_1 + R_2/s)^2 + X^2]}$; peak at $s_m = \frac{R_2}{\sqrt{R_1^2 + X^2}}$.`,
        r`$T_{\max}$ is independent of $R_2$ and varies as $V^2$. Kloss: $\frac{T}{T_{\max}} = \frac{2}{s/s_m + s_m/s}$.`,
      ],
      example: {
        problem: r`A 460 V, 4-pole, 60 Hz motor has $R_1 = 0.3$ Ω, $R_2 = 0.25$ Ω, $X_1 + X_2 = 0.9$ Ω per phase. Find the torque at 4% slip, the slip at maximum torque, the maximum torque and the starting torque.`,
        solution: r`$V = 265.6$ V, $\omega_s = 188.5$ rad/s. At $s = 0.04$: $T = 160.5$ N·m. $s_m = \frac{0.25}{\sqrt{0.09 + 0.81}} = 0.264$. $T_{\max} = 450$ N·m. At $s = 1$: $T_{st} = 252$ N·m.`,
      },
      traps: [r`Keep slip as a decimal, and use PHASE voltage with the 3.`],
    },
    {
      name: 'Equivalent Circuit',
      inShort: r`A transformer whose secondary load is $R_2\frac{1 - s}{s}$, the mechanical power.`,
      keyIdeas: [
        r`$P_g : P_{rcl} : P_m = 1 : s : (1 - s)$; $P_{out} = P_m - P_{f\&w}$.`,
        r`$P_g = 3I_2^2\frac{R_2}{s}$; $T = \frac{P_g}{\omega_s} = \frac{P_m}{\omega_m}$.`,
        r`The stator Thévenin equivalent makes the torque formulas exact.`,
      ],
      example: {
        problem: r`A 4-pole, 60 Hz motor has 40 kW air-gap power at 3% slip and 800 W friction and windage. Find the rotor copper loss, developed power, output and torque.`,
        solution: r`Rotor copper $= 0.03 \times 40 = 1.2$ kW; $P_m = 38.8$ kW; output 38.0 kW. $T = \frac{40{,}000}{188.5} = 212$ N·m.`,
      },
      traps: [r`Rotor copper loss is $s$ times AIR-GAP power, not input power.`],
    },
    {
      name: 'Starting Methods',
      inShort: r`Direct-on-line draws 5–8 times full-load current; reduced voltage cuts current and torque.`,
      keyIdeas: [
        r`$\frac{T_{st}}{T_{fl}} = \left(\frac{I_{st}}{I_{fl}}\right)^2s_{fl}$.`,
        r`Star-delta: line current and torque $\frac13$. Autotransformer at tap $x$: line current and torque $x^2$.`,
        r`Wound rotor: external resistance $R_2 + R_{ext} = \sqrt{R_1^2 + X^2}$ starts it at maximum torque.`,
      ],
      example: {
        problem: r`A motor draws 6 times full-load current on direct start and has 3% full-load slip. Find its starting torque direct, in star-delta, and through a 65% autotransformer.`,
        solution: r`DOL: $6^2 \times 0.03 = 1.08$ of full-load torque. Star-delta: $\frac{1.08}{3} = 0.36$. Autotransformer: $0.65^2 \times 1.08 = 0.46$.`,
      },
      traps: [r`Reduced-voltage starting cuts torque as the SQUARE of voltage: check the load can still start.`],
    },
    {
      name: 'Speed Control',
      inShort: r`Change the synchronous speed (frequency, poles) or the slip (rotor resistance, voltage).`,
      keyIdeas: [
        r`VFD: $N_s = \frac{120f}{P}$ with $\frac{V}{f}$ constant to keep the flux.`,
        r`Rotor resistance: slip $\propto R_2$ at the same torque (wasteful). Stator voltage: slip $\propto \frac{1}{V^2}$.`,
        r`Pole changing (consequent pole) gives two speeds, 2:1.`,
      ],
      example: {
        problem: r`A 460 V, 60 Hz, 4-pole motor runs at 3% slip. Doubling its rotor resistance at the same torque gives what speed? And what voltage for a VFD at 30 Hz?`,
        solution: r`Slip doubles to 6%: $N = 1800 \times 0.94 = 1692$ rpm. At 30 Hz: $V = 460 \times \frac{30}{60} = 230$ V, $N_s = 900$ rpm.`,
      },
      traps: [r`Lowering the frequency without lowering the voltage over-fluxes and overheats the motor.`],
    },
    {
      name: 'Single-Phase Motors',
      inShort: r`A pulsating field gives no starting torque; an auxiliary winding makes it rotate.`,
      keyIdeas: [
        r`Double revolving field: forward slip $s$, backward slip $2 - s$.`,
        r`Split-phase, capacitor-start, capacitor-run, shaded-pole; reverse by swapping the auxiliary winding's leads.`,
        r`Capacitor for 90°: $X_C = X_a + \frac{R_aR_m}{X_m}$.`,
      ],
      example: {
        problem: r`Main winding $2 + j3.5$ Ω, auxiliary $9 + j2$ Ω, 60 Hz. Find the capacitor that puts the currents 90° apart.`,
        solution: r`$X_C = 2 + \frac{9 \times 2}{3.5} = 7.14$ Ω, so $C = \frac{1}{2\pi \times 60 \times 7.14} = 371$ µF.`,
      },
      traps: [r`Without the auxiliary winding the motor hums but will not start; once turning it runs either way.`],
    },
    {
      name: 'Special Machines (Stepper, Servo)',
      inShort: r`Motors for position and speed control: steppers move in fixed steps, servos follow a command.`,
      keyIdeas: [
        r`Step angle: VR $\frac{N_s - N_r}{N_sN_r} \times 360°$; two-phase hybrid $\frac{360°}{2mN_r}$ (50 teeth: 1.8°).`,
        r`Speed $n = \frac{\theta f_p}{6}$ rpm. Universal motors run on ac or dc; reluctance and hysteresis motors run synchronously without a field.`,
        r`Servomotors run in closed loop with a position or speed sensor.`,
      ],
      example: {
        problem: r`A 1.8° stepper is driven at 400 pulses per second. Find its speed and steps per revolution.`,
        solution: r`200 steps per revolution. $n = \frac{1.8 \times 400}{6} = 120$ rpm.`,
      },
      traps: [r`Driven too fast, a stepper loses steps silently: it runs open loop.`],
    },
    {
      name: 'Machine Testing and Efficiency',
      inShort: r`Tests give the equivalent circuit without loading the machine.`,
      keyIdeas: [
        r`Induction: blocked rotor gives $R_1 + R_2$ and $X_1 + X_2$; no load gives core plus friction and windage, and $X_m$.`,
        r`Synchronous: open and short circuit give $Z_s$ and SCR; the slip test gives $X_d = \frac{V_{\max}}{I_{\min}}$, $X_q = \frac{V_{\min}}{I_{\max}}$.`,
        r`Efficiency: output over output plus losses (copper, core, friction and windage, field, stray).`,
      ],
      example: {
        problem: r`A blocked-rotor test reads 48 V (line), 20 A, 1500 W; a dc test gives $R_1 = 0.5$ Ω per phase. Find $R_2$ and $X_1 + X_2$.`,
        solution: r`$R_1 + R_2 = \frac{1500}{3 \times 20^2} = 1.25$ Ω, so $R_2 = 0.75$ Ω. $|Z| = \frac{48}{\sqrt3 \times 20} = 1.386$ Ω; $X_1 + X_2 = \sqrt{1.386^2 - 1.25^2} = 0.60$ Ω.`,
      },
      traps: [r`Use per-phase values: divide power by 3 and line voltage by $\sqrt3$ (Y).`],
    },
  ],
};
