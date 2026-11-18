// Library › Lessons › EE › Electric Circuits 1 (2026-11-18): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by solving the circuit. AC power, resonance and
// three-phase are in Electric Circuits 2; transients in depth in Electrical
// Transient Analysis.
const r = String.raw;

export default {
  topic: 'Electric Circuits 1',
  subject: 'EE',
  overview: r`Every electrical engineering subject rests on circuit analysis. Two laws (KCL and KVL) plus each element's own law (Ohm's law for resistors, $i = C\frac{dv}{dt}$ and $v = L\frac{di}{dt}$) describe any circuit; the rest are systematic ways to apply them (nodal and mesh analysis) and shortcuts that save work (dividers, superposition, source transformation, Thévenin and Norton). With phasors, the same methods solve ac circuits in steady state, using complex impedances in place of resistances. Practise drawing the circuit, labelling every voltage polarity and current direction, and checking the answer with KCL or a power balance.`,
  sources: [
    'Fundamentals of Electric Circuits (Alexander and Sadiku)',
    'Engineering Circuit Analysis (Hayt, Kemmerly and Durbin)',
    'Electric Circuits (Nilsson and Riedel)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'DC and AC Sources and Components',
      inShort: r`Sources, resistors and how wire resistance depends on size and temperature.`,
      keyIdeas: [
        r`Ideal voltage sources hold their voltage; ideal current sources hold their current; real ones have internal resistance.`,
        r`$R = \rho\frac{L}{A}$; copper 1.724 × 10⁻⁸ Ω·m (10.37 Ω·CM/ft); circular mils $A = d_{mil}^2$.`,
        r`$\frac{R_2}{R_1} = \frac{234.5 + T_2}{234.5 + T_1}$ for copper; $P = VI = I^2R = \frac{V^2}{R}$.`,
      ],
      example: {
        problem: r`Find the resistance of 100 m of 2 mm² copper wire at 20 °C, and at 75 °C.`,
        solution: r`$R = \frac{1.724 \times 10^{-8}(100)}{2 \times 10^{-6}} = 0.862$ Ω. At 75 °C: $0.862 \times \frac{234.5 + 75}{234.5 + 20} = 1.048$ Ω.`,
      },
      traps: [r`Stretching a wire to twice its length quadruples its resistance (the area halves too).`],
    },
    {
      name: 'Voltage and Current Laws',
      inShort: r`Kirchhoff's laws, and the voltage and current dividers that follow from them.`,
      keyIdeas: [
        r`KCL: currents into a node sum to zero. KVL: voltages around a loop sum to zero.`,
        r`Series resistors divide voltage in proportion to resistance: $V_x = V_s\frac{R_x}{\sum R}$.`,
        r`Two parallel resistors divide current inversely: $I_1 = I_T\frac{R_2}{R_1 + R_2}$.`,
      ],
      example: {
        problem: r`12 V is applied across 2 kΩ and 4 kΩ in series: find the voltage on the 4 kΩ. 6 A enters 3 Ω in parallel with 6 Ω: find the current in the 3 Ω.`,
        solution: r`$12 \times \frac{4}{6} = 8$ V. $6 \times \frac{6}{3 + 6} = 4$ A (the smaller resistor takes more).`,
      },
      traps: [r`A divider is only valid if no other branch draws current from the middle node.`],
    },
    {
      name: 'Nodal Analysis',
      inShort: r`Solving for node voltages with KCL.`,
      keyIdeas: [
        r`Pick a reference node; write KCL at each other node with currents in terms of node voltages.`,
        r`In matrix form $\mathbf{G}\mathbf{v} = \mathbf{i}$: self-conductances on the diagonal, minus the shared conductances off it.`,
        r`Voltage source between two nodes: a supernode.`,
      ],
      example: {
        problem: r`A 12 V source with 2 Ω feeds node A; A has 4 Ω to ground and 3 Ω to node B; B has 6 Ω to ground and 1 A injected. Find $v_A$ and $v_B$.`,
        solution: r`$\begin{bmatrix}\frac{13}{12} & -\frac13 \\ -\frac13 & \frac12\end{bmatrix}\begin{bmatrix}v_A \\ v_B\end{bmatrix} = \begin{bmatrix}6 \\ 1\end{bmatrix}$ gives $v_A = 7.74$ V, $v_B = 7.16$ V.`,
      },
      traps: [r`The 12 V source with 2 Ω enters the equation as a current $\frac{12}{2} = 6$ A into node A.`],
    },
    {
      name: 'Mesh Analysis',
      inShort: r`Solving for loop currents with KVL.`,
      keyIdeas: [
        r`Assign a clockwise current to each window; write KVL around each.`,
        r`$\mathbf{R}\mathbf{i} = \mathbf{v}$: total resistance on the diagonal, minus the shared resistance off it.`,
        r`A shared resistor carries the difference of the two mesh currents. Current source on a shared branch: a supermesh.`,
      ],
      example: {
        problem: r`Mesh 1: a 10 V source and 2 Ω; a 4 Ω shared with mesh 2, which has 3 Ω and a 5 V source opposing it. Find the mesh currents.`,
        solution: r`$\begin{bmatrix}6 & -4 \\ -4 & 7\end{bmatrix}\begin{bmatrix}i_1 \\ i_2\end{bmatrix} = \begin{bmatrix}10 \\ -5\end{bmatrix}$: $i_1 = 1.92$ A, $i_2 = 0.385$ A; the 4 Ω carries $1.54$ A.`,
      },
      traps: [r`Mesh analysis works only for planar circuits (no crossing wires).`],
    },
    {
      name: 'Linearity and Superposition',
      inShort: r`In a linear circuit, each source's effect can be found separately and added.`,
      keyIdeas: [
        r`Linear: doubling every source doubles every response.`,
        r`Superposition: turn off all but one independent source (voltage sources shorted, current sources opened), solve, repeat, add.`,
        r`Dependent sources stay on; powers do not superpose.`,
      ],
      example: {
        problem: r`In the nodal example, find $v_B$ from the 12 V alone and the 1 A alone, and add them.`,
        solution: r`12 V alone: 4.65 V. 1 A alone: 2.52 V. Sum: 7.16 V, the full answer.`,
      },
      traps: [r`Adding the powers from each source gives the wrong total: add the voltages or currents, then compute power.`],
    },
    {
      name: 'Source Transformation',
      inShort: r`Swapping a voltage source with series resistance for a current source with parallel resistance.`,
      keyIdeas: [
        r`$V_s = I_sR$ with the same R; the equivalence holds at the terminals only.`,
        r`Repeated transformations collapse ladder circuits quickly.`,
        r`The current source's arrow points to the voltage source's + terminal.`,
      ],
      example: {
        problem: r`Transform the 12 V source with 2 Ω series resistance.`,
        solution: r`A $\frac{12}{2} = 6$ A current source in parallel with 2 Ω, pointing toward node A.`,
      },
      traps: [r`An ideal source (no resistance) can't be transformed.`],
    },
    {
      name: 'Thevenin and Norton',
      inShort: r`Any linear two-terminal circuit as one source and one resistance.`,
      keyIdeas: [
        r`$V_{th} = V_{oc}$, $I_N = I_{sc}$, $R_{th} = \frac{V_{oc}}{I_{sc}}$.`,
        r`With independent sources only, $R_{th}$ is the resistance seen with them off.`,
        r`With dependent sources, apply a test source and take $\frac{v_t}{i_t}$.`,
      ],
      example: {
        problem: r`Find the Thévenin equivalent at node B of the nodal example (6 Ω removed) and check it with the 6 Ω back on.`,
        solution: r`$V_{oc} = 12.33$ V, $R_{th} = 3 + 2\parallel4 = 4.33$ Ω. With 6 Ω: $12.33 \times \frac{6}{10.33} = 7.16$ V, as before.`,
      },
      traps: [r`Never turn off a dependent source to find $R_{th}$.`],
    },
    {
      name: 'Maximum Power Transfer',
      inShort: r`The load that draws the most power from a source.`,
      keyIdeas: [
        r`$P_L = \frac{V_{th}^2R_L}{(R_{th} + R_L)^2}$, largest at $R_L = R_{th}$: $P_{max} = \frac{V_{th}^2}{4R_{th}}$.`,
        r`Efficiency at that point is only 50%.`,
        r`For ac, the load is the complex conjugate $Z_L = Z_{th}^*$ (Circuits 2).`,
      ],
      example: {
        problem: r`A source has $V_{th} = 10$ V and $R_{th} = 4$ Ω. What load takes the most power, and how much?`,
        solution: r`$R_L = 4$ Ω: $\frac{10^2}{4(4)} = 6.25$ W, with 6.25 W also lost in $R_{th}$.`,
      },
      traps: [r`Utilities avoid matching: 50% efficiency would waste half the power.`],
    },
    {
      name: 'Delta-Wye Conversion',
      inShort: r`Converting triangles of resistors to stars and back to unlock bridges.`,
      keyIdeas: [
        r`$\Delta \to Y$: $R_a = \frac{R_{ab}R_{ca}}{R_{ab} + R_{bc} + R_{ca}}$ (the two touching node a, over the sum).`,
        r`$Y \to \Delta$: $R_{ab} = \frac{R_aR_b + R_bR_c + R_cR_a}{R_c}$ (sum of products over the opposite one).`,
        r`Balanced: $R_Y = \frac{R_\Delta}{3}$.`,
      ],
      example: {
        problem: r`Convert a delta of $R_{ab} = 10$, $R_{bc} = 20$, $R_{ca} = 30$ Ω to a wye.`,
        solution: r`Sum 60 Ω: $R_a = \frac{10 \times 30}{60} = 5$, $R_b = \frac{10 \times 20}{60} = 3.33$, $R_c = \frac{20 \times 30}{60} = 10$ Ω.`,
      },
      traps: [r`Check: the resistance between any two terminals must come out the same for both forms.`],
    },
    {
      name: 'Controlled Sources and Ideal Op Amp',
      inShort: r`Dependent sources, and op amps analysed with two simple rules.`,
      keyIdeas: [
        r`Dependent sources (VCVS, VCCS, CCVS, CCCS) model transistors and amplifiers; their value depends on another voltage or current.`,
        r`Ideal op amp with negative feedback: $v_+ = v_-$ and no input current.`,
        r`Summing $v_o = -R_f\sum\frac{v_k}{R_k}$; difference $v_o = \frac{R_2}{R_1}(v_2 - v_1)$; follower $v_o = v_{in}$.`,
      ],
      example: {
        problem: r`A summing amplifier has $R_f = 10$ kΩ, inputs 0.5 V through 10 kΩ and 0.2 V through 5 kΩ. Find $v_o$.`,
        solution: r`$v_o = -10\text{k}\left(\frac{0.5}{10\text{k}} + \frac{0.2}{5\text{k}}\right) = -(0.5 + 0.4) = -0.9$ V.`,
      },
      traps: [r`The output saturates near the supply rails: a gain of 100 on 1 V doesn't give 100 V from a ±15 V op amp.`],
    },
    {
      name: 'Capacitors and Inductors',
      inShort: r`Elements that store energy in electric and magnetic fields.`,
      keyIdeas: [
        r`$i = C\frac{dv}{dt}$, $v = L\frac{di}{dt}$; $W_C = \frac12CV^2$, $W_L = \frac12LI^2$.`,
        r`Capacitors combine like conductances (parallel add); inductors like resistors (series add).`,
        r`Capacitor voltage and inductor current can't change instantly; in dc steady state C is open, L is short.`,
      ],
      example: {
        problem: r`2 µF and 6 µF in series are charged from 12 V. Find each one's voltage.`,
        solution: r`$C_s = 1.5$ µF, $Q = 18$ µC. $V_1 = \frac{18}{2} = 9$ V, $V_2 = \frac{18}{6} = 3$ V: the smaller capacitor takes the larger voltage.`,
      },
      traps: [r`Opening an inductor's circuit suddenly makes a large voltage spike: $v = L\frac{di}{dt}$.`],
    },
    {
      name: 'RL and RC Circuits',
      inShort: r`First-order circuits and their exponential responses.`,
      keyIdeas: [
        r`$x(t) = x(\infty) + [x(0^+) - x(\infty)]e^{-t/\tau}$; $\tau = RC$ or $\frac{L}{R}$ with the Thévenin R seen by the element.`,
        r`After τ the change is 63.2% complete; after 5τ, over 99%.`,
        r`Find $x(0^+)$ from the capacitor voltage or inductor current just before switching.`,
      ],
      example: {
        problem: r`A 1 µF capacitor at 2 V is connected through 1 kΩ to a 10 V source. Find its voltage after 1 ms.`,
        solution: r`$\tau = 1$ ms: $v = 10 + (2 - 10)e^{-1} = 10 - 2.94 = 7.06$ V.`,
      },
      traps: [r`Use the Thévenin resistance seen from the capacitor, not whichever resistor is in series with the source.`],
    },
    {
      name: 'RLC Circuits',
      inShort: r`Second-order circuits: overdamped, critically damped or ringing.`,
      keyIdeas: [
        r`Roots $s = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$ with $\omega_0 = \frac{1}{\sqrt{LC}}$.`,
        r`Series $\alpha = \frac{R}{2L}$; parallel $\alpha = \frac{1}{2RC}$.`,
        r`Underdamped: $e^{-\alpha t}$ times oscillation at $\omega_d = \sqrt{\omega_0^2 - \alpha^2}$; critical at $R = 2\sqrt{L/C}$ (series).`,
      ],
      example: {
        problem: r`A series RLC has R = 10 Ω, L = 0.1 H, C = 100 µF. Classify its response and find $\omega_d$.`,
        solution: r`$\alpha = \frac{10}{0.2} = 50$, $\omega_0 = \frac{1}{\sqrt{10^{-5}}} = 316.2$ rad/s: underdamped, $\omega_d = \sqrt{316.2^2 - 50^2} = 312.2$ rad/s.`,
      },
      traps: [r`In a parallel RLC a LARGER R means less damping.`],
    },
    {
      name: 'Phasors and Impedance',
      inShort: r`Representing sinusoids as complex numbers, and elements as impedances.`,
      keyIdeas: [
        r`$V_m\cos(\omega t + \phi) \iff V_m\angle\phi$; RMS phasors use $\frac{V_m}{\sqrt2}$.`,
        r`$Z_R = R$, $Z_L = j\omega L$ ($X_L = 2\pi fL$), $Z_C = \frac{1}{j\omega C}$ ($X_C = \frac{1}{2\pi fC}$).`,
        r`$Z = R + jX$, $Y = \frac1Z = G + jB$.`,
      ],
      example: {
        problem: r`Write $v = 100\cos(377t + 30^\circ)$ as a phasor, and find the impedance of 10 Ω in series with 50 mH at 60 Hz.`,
        solution: r`$100\angle30^\circ$ (RMS $70.7\angle30^\circ$). $X_L = 377(0.05) = 18.85$ Ω: $Z = 10 + j18.85 = 21.34\angle62.1^\circ$ Ω.`,
      },
      traps: [r`Inductive reactance rises with frequency; capacitive falls.`],
    },
    {
      name: 'Sinusoidal Steady-State Analysis',
      inShort: r`Solving ac circuits with phasors and every dc method.`,
      keyIdeas: [
        r`$\mathbf{V} = \mathbf{I}Z$; impedances combine like resistances.`,
        r`Nodal, mesh, superposition, Thévenin all work with complex numbers.`,
        r`Superposition is the only way when sources have DIFFERENT frequencies.`,
      ],
      example: {
        problem: r`$100\angle0^\circ$ V at 60 Hz drives 10 Ω in series with 50 mH. Find the current.`,
        solution: r`$\mathbf{I} = \frac{100\angle0^\circ}{21.34\angle62.1^\circ} = 4.69\angle-62.1^\circ$ A: it lags the voltage by 62°.`,
      },
      traps: [r`Add impedances as complex numbers: 3 Ω + j4 Ω has magnitude 5 Ω, not 7.`],
    },
  ],
};
