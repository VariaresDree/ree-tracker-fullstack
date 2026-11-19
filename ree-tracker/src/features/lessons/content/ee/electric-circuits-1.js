// Library › Lessons › EE › Electric Circuits 1 (2026-11-18; four subtopics in the
// module format, 2026-11-19, checked by electricCircuits1Lesson.test.js): written for the
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
      // Module format (2026-11-19 pilot): discussion with figures, examples a step at a time, check yourself.
      body: [
        r`A **node** is a point where two or more elements meet, and a **loop** is any closed path through the circuit. Kirchhoff's current law (KCL) says charge does not pile up at a node, so the currents leaving it add to zero: $\sum i_{\text{out}} = 0$. Kirchhoff's voltage law (KVL) says energy per charge is conserved around a loop, so the voltages around it add to zero: $\sum v = 0$, counting each drop and rise with one sign convention.`,
        {
          type: 'circuit',
          alt: 'A 12 V source in a single loop with a 2 kilohm and a 4 kilohm resistor in series; the current I flows clockwise.',
          caption: 'One loop, one current: KVL gives 12 = I(2 k) + I(4 k).',
          parts: [
            ['V', [0, 2], [0, 0], '12 V'],
            ['R', [0, 0], [3, 0], '2 kΩ'],
            ['R', [3, 0], [3, 2], ['4 kΩ', 'V_2']],
            ['wire', [3, 2], [0, 2]],
            ['i', [2, 2], [1, 2], 'I'],
          ],
        },
        r`Two results follow straight from the laws and save time on the board. Elements in **series** carry the same current, so the source voltage divides among them in proportion to their resistances. Elements in **parallel** share the same voltage, so a current divides among them in inverse proportion: the smaller resistor takes more.`,
        r`| | Series | Parallel |
|---|---|---|
| Same for each | current | voltage |
| Total | $R_T = R_1 + R_2 + \cdots$ | $\frac{1}{R_T} = \frac{1}{R_1} + \frac{1}{R_2} + \cdots$ |
| Divider | $V_x = V_s \times \frac{R_x}{R_T}$ | $I_1 = I_T \times \frac{R_2}{R_1 + R_2}$ |`,
        {
          type: 'circuit',
          alt: 'A 6 A current source feeding a 3 ohm and a 6 ohm resistor in parallel; I1 flows down the 3 ohm and I2 down the 6 ohm.',
          caption: 'The 6 A splits between the two branches, inversely to their resistance.',
          parts: [
            ['I', [0, 2], [0, 0], '6 A'],
            ['wire', [0, 0], [2, 0]],
            ['wire', [2, 0], [4, 0]],
            ['R', [2, 0.5], [2, 2], '3 Ω'],
            ['wire', [2, 0], [2, 0.5]],
            ['R', [4, 0.5], [4, 2], '6 Ω'],
            ['wire', [4, 0], [4, 0.5]],
            ['wire', [4, 2], [0, 2]],
            ['i', [2, 0], [2, 0.5], 'I_1'],
            ['i', [4, 0], [4, 0.5], 'I_2'],
            ['dot', [2, 0]],
            ['dot', [2, 2]],
          ],
        },
      ],
      keyIdeas: [
        r`KCL: the currents into a node equal the currents out. KVL: around any loop, the rises equal the drops.`,
        r`Series: same current, and voltages divide in proportion to resistance. Parallel: same voltage, and currents divide inversely.`,
        r`Two in parallel: $R_T = \frac{R_1R_2}{R_1 + R_2}$ (product over sum).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A voltage divider',
          problem: r`12 V is applied across 2 kΩ and 4 kΩ in series, as in the first circuit above. Find the current and the voltage across the 4 kΩ.`,
          steps: [
            r`The resistances add: $R_T = 2 + 4 = 6$ kΩ.`,
            r`Ohm's law for the loop: $I = \frac{12}{6000} = 2$ mA.`,
            r`Divider: $V_2 = 12 \times \frac{4}{6} = 8$ V. Check with Ohm's law: $2\text{ mA} \times 4\text{ k}\Omega = 8$ V.`,
          ],
          answer: r`$I = 2$ mA and $V_2 = 8$ V.`,
        },
        {
          level: 'basic',
          title: 'A current divider',
          problem: r`6 A enters 3 Ω in parallel with 6 Ω, as in the second circuit. Find the current in each resistor.`,
          steps: [
            r`The current divides inversely: $I_1 = 6 \times \frac{6}{3 + 6} = 4$ A in the 3 Ω.`,
            r`KCL at the top node: $I_2 = 6 - 4 = 2$ A in the 6 Ω.`,
            r`Check that both branches see one voltage: $4 \times 3 = 12$ V and $2 \times 6 = 12$ V.`,
          ],
          answer: r`$I_1 = 4$ A (3 Ω) and $I_2 = 2$ A (6 Ω).`,
        },
        {
          level: 'board',
          title: 'Series and parallel together',
          problem: r`A 24 V source feeds 4 Ω in series with a parallel pair of 6 Ω and 12 Ω. Find the current in the 12 Ω resistor.`,
          steps: [
            r`Combine the pair: $R_p = \frac{6 \times 12}{6 + 12} = 4$ Ω.`,
            r`Total: $R_T = 4 + 4 = 8$ Ω, so the source current is $I_T = \frac{24}{8} = 3$ A.`,
            r`Divide it: $I_{12} = 3 \times \frac{6}{6 + 12} = 1$ A.`,
          ],
          answer: r`1 A flows in the 12 Ω (and 2 A in the 6 Ω).`,
        },
      ],
      traps: [
        r`A divider is only valid if no other branch draws current from the middle node.`,
        r`In KVL, go round the loop one way and keep its signs: a drop one way is a rise the other way.`,
      ],
      check: [
        { q: r`Three equal resistors in parallel across 12 V draw 6 A in total. What is each resistor?`, a: r`Each carries $\frac{6}{3} = 2$ A at 12 V, so each is 6 Ω (the three together are 2 Ω).` },
        { q: r`A source drives three resistors in series whose drops are 10 V, 3 V and 5 V. What is the source voltage?`, a: r`KVL: $10 + 3 + 5 = 18$ V.` },
      ],
    },
    {
      name: 'Nodal Analysis',
      inShort: r`Solving for node voltages with KCL.`,
      body: [
        r`Nodal analysis writes KCL at every node but one, with the **node voltages** as the unknowns. Pick a reference node (ground, usually the one touching the most elements) and measure every other node's voltage from it. A resistor between nodes $a$ and $b$ then carries $\frac{v_a - v_b}{R}$ from $a$ to $b$, so each equation can be written straight from the drawing.`,
        {
          type: 'circuit',
          alt: 'A 12 V source with a 2 ohm resistor feeds node A. Node A has 4 ohms to the reference and 3 ohms to node B. Node B has 6 ohms to the reference and a 1 A source feeding it.',
          caption: 'Two unknown nodes, A and B; the bottom wire is the reference.',
          parts: [
            ['V', [0, 2], [0, 0], '12 V'],
            ['R', [0, 0], [2, 0], '2 Ω'],
            ['R', [2, 0], [2, 2], '4 Ω'],
            ['R', [2, 0], [4, 0], '3 Ω'],
            ['R', [4, 0], [4, 2], '6 Ω'],
            ['wire', [4, 0], [6, 0]],
            ['I', [6, 2], [6, 0], '1 A'],
            ['wire', [6, 2], [0, 2]],
            ['gnd', [3, 2]],
          ],
          nodes: [{ at: [2, 0], label: 'A' }, { at: [4, 0], label: 'B' }],
        },
        r`For resistors and current sources the equations follow a pattern you can write by inspection, $\mathbf{G}\mathbf{v} = \mathbf{i}$: each diagonal entry is the total conductance at that node, each off-diagonal entry is minus the conductance between the two nodes, and the right side is the source current flowing into each node. A voltage source in series with a resistor is first changed into a current source with the resistor across it (source transformation).`,
        r`$$\begin{bmatrix} G_{AA} & -G_{AB} \\ -G_{AB} & G_{BB} \end{bmatrix}\begin{bmatrix} v_A \\ v_B \end{bmatrix} = \begin{bmatrix} i_A \\ i_B \end{bmatrix}$$`,
        r`A voltage source directly between two non-reference nodes fixes their difference instead. Enclose both nodes in a **supernode**, write one KCL for the pair, and add the source's own equation, $v_a - v_b = V_s$.`,
      ],
      keyIdeas: [
        r`A circuit with $n$ nodes needs $n - 1$ node equations.`,
        r`Diagonal: the total conductance at the node. Off the diagonal: minus the conductance shared by the two nodes.`,
        r`A voltage source between two non-reference nodes makes a supernode.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One unknown node',
          problem: r`Node A has 4 Ω to the reference, 2 Ω to a 12 V source (its other end on the reference), and a 3 A source feeding it. Find $v_A$.`,
          steps: [
            r`Write each current leaving A: $\frac{v_A - 12}{2}$ through the 2 Ω and $\frac{v_A}{4}$ through the 4 Ω.`,
            r`KCL, out equals in: $\frac{v_A - 12}{2} + \frac{v_A}{4} = 3$.`,
            r`Multiply by 4: $2v_A - 24 + v_A = 12$, so $v_A = 12$ V.`,
          ],
          answer: r`$v_A = 12$ V. No current flows in the 2 Ω: all 3 A go through the 4 Ω.`,
        },
        {
          level: 'board',
          title: 'Two nodes by inspection',
          problem: r`In the circuit above, find $v_A$ and $v_B$.`,
          steps: [
            r`Transform the 12 V source and its 2 Ω: $\frac{12}{2} = 6$ A into A, with 2 Ω from A to the reference.`,
            r`Conductances: $G_{AA} = \frac12 + \frac14 + \frac13 = \frac{13}{12}$ S, $G_{BB} = \frac13 + \frac16 = \frac12$ S, $G_{AB} = \frac13$ S.`,
            r`$$\begin{bmatrix}\frac{13}{12} & -\frac13 \\ -\frac13 & \frac12\end{bmatrix}\begin{bmatrix}v_A \\ v_B\end{bmatrix} = \begin{bmatrix}6 \\ 1\end{bmatrix}$$`,
            r`The determinant is $\frac{13}{24} - \frac19 = \frac{31}{72}$. Cramer's rule: $v_A = \frac{3 + \frac13}{31/72} = \frac{240}{31}$ V and $v_B = \frac{\frac{13}{12} + 2}{31/72} = \frac{222}{31}$ V.`,
            r`Check KCL at B: in through the 3 Ω, $\frac{7.742 - 7.161}{3} = 0.194$ A, plus 1 A from the source; out through the 6 Ω, $\frac{7.161}{6} = 1.194$ A.`,
          ],
          answer: r`$v_A = 7.74$ V and $v_B = 7.16$ V.`,
        },
      ],
      traps: [
        r`The 12 V source with 2 Ω enters the equations as a current $\frac{12}{2} = 6$ A into node A.`,
        r`Write every current as leaving the node, or every one as entering, and keep to it: mixing the two flips signs.`,
      ],
      check: [
        { q: r`A circuit has 5 nodes. How many node-voltage equations does nodal analysis need?`, a: r`4: one for each node except the reference.` },
        { q: r`What is the off-diagonal entry for two nodes joined by a 5 Ω resistor?`, a: r`$-\frac15 = -0.2$ S.` },
      ],
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
      body: [
        r`A circuit with one capacitor or one inductor (after combining) is **first order**. When a switch moves, every voltage and current in it travels exponentially from where it starts, $x(0^+)$, to where it settles, $x(\infty)$, at a pace set by a single time constant τ.`,
        {
          type: 'circuit',
          alt: 'A 10 V source, a switch that closes at t = 0, a 1 kilohm resistor and a 1 microfarad capacitor in one loop.',
          caption: 'The switch closes at t = 0 with the capacitor already at 2 V.',
          parts: [
            ['V', [0, 2], [0, 0], '10 V'],
            ['sw', [0, 0], [1.5, 0], 't = 0'],
            ['R', [1.5, 0], [3.5, 0], '1 kΩ'],
            ['C', [3.5, 0], [3.5, 2], ['1 µF', 'v_C']],
            ['wire', [3.5, 2], [0, 2]],
          ],
        },
        r`$$x(t) = x(\infty) + \left[x(0^+) - x(\infty)\right]e^{-t/\tau}, \qquad \tau = R_{Th}C \;\text{ or }\; \frac{L}{R_{Th}}$$`,
        r`Three facts set up every problem. A capacitor's voltage and an inductor's current cannot jump, so $x(0^+)$ is the value just before the switch moved. At dc steady state a capacitor is an open circuit and an inductor a short, which gives $x(\infty)$. And $R_{Th}$ is the resistance seen from the capacitor's or inductor's terminals with every independent source turned off.`,
        {
          type: 'plot',
          alt: 'The capacitor voltage rising from 2 V towards 10 V over 5 milliseconds, reaching 7.06 V at one time constant, 1 millisecond.',
          caption: 'After one time constant the voltage has gone 63.2% of the way from 2 V to 10 V.',
          x: [0, 5],
          y: [0, 11],
          xLabel: 't (ms)',
          yLabel: 'v_C (V)',
          series: [{ f: (t) => 10 - 8 * Math.exp(-t), label: 'v_C', area: true }],
          marks: [{ at: [1, 10 - 8 * Math.exp(-1)], label: '7.06 V at τ' }, { y: 10, label: 'v(∞) = 10 V' }],
        },
        r`| Time | Share of the change done |
|---|---|
| $\tau$ | 63.2% |
| $2\tau$ | 86.5% |
| $3\tau$ | 95.0% |
| $5\tau$ | 99.3% (taken as settled) |`,
      ],
      keyIdeas: [
        r`$\tau = RC$ or $\frac{L}{R}$, with $R$ the Thévenin resistance seen by the capacitor or inductor.`,
        r`After τ the change is 63.2% complete; after 5τ, over 99%.`,
        r`Find $x(0^+)$ from the capacitor voltage or inductor current just before switching.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Charging a capacitor',
          problem: r`In the circuit above, the 1 µF capacitor is at 2 V when the switch closes. Find its voltage 1 ms later.`,
          steps: [
            r`Time constant: $\tau = RC = 1000 \times 10^{-6} = 1$ ms.`,
            r`Start and end: $v(0^+) = 2$ V, since a capacitor's voltage can't jump, and $v(\infty) = 10$ V, since no current flows once it has charged.`,
            r`$v(1\text{ ms}) = 10 + (2 - 10)e^{-1} = 10 - 2.94 = 7.06$ V.`,
          ],
          answer: r`7.06 V.`,
        },
        {
          level: 'board',
          title: 'A coil switched onto dc',
          problem: r`A 0.5 H coil with 10 Ω of resistance is switched onto 100 V dc. How long does its current take to reach 9 A?`,
          steps: [
            r`Final current: $i(\infty) = \frac{100}{10} = 10$ A, starting from $i(0^+) = 0$.`,
            r`Time constant: $\tau = \frac{L}{R} = \frac{0.5}{10} = 0.05$ s.`,
            r`$9 = 10\left(1 - e^{-t/0.05}\right)$, so $e^{-t/0.05} = 0.1$.`,
            r`$t = 0.05 \ln 10 = 0.115$ s.`,
          ],
          answer: r`0.115 s, about 2.3 time constants.`,
        },
        {
          level: 'board',
          title: 'The resistance the capacitor sees',
          problem: r`A 2 µF capacitor is connected across the 6 kΩ resistor of a divider made of 3 kΩ and 6 kΩ in series across 12 V. Find the time constant.`,
          steps: [
            r`Turn the 12 V source off (replace it with a short): looking from the capacitor, 3 kΩ and 6 kΩ are in parallel.`,
            r`$R_{Th} = \frac{3 \times 6}{3 + 6} = 2$ kΩ.`,
            r`$\tau = R_{Th}C = 2000 \times 2 \times 10^{-6} = 4$ ms.`,
          ],
          answer: r`4 ms. (The capacitor settles at the divider's 8 V.)`,
        },
      ],
      traps: [
        r`Use the Thévenin resistance seen from the capacitor, not whichever resistor is in series with the source.`,
        r`An inductor's current carries across the switching instant; its voltage can jump.`,
      ],
      check: [
        { q: r`What share of the change is still left after 3τ?`, a: r`$e^{-3} = 0.0498$: about 5%.` },
        { q: r`At dc steady state, what does a capacitor look like? An inductor?`, a: r`A capacitor is an open circuit; an inductor is a short circuit.` },
      ],
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
      body: [
        r`In ac steady state every voltage and current is a sinusoid at the source's frequency, so each is fixed by two numbers: its size and its phase. A **phasor** packs both into one complex number, $V_m\cos(\omega t + \phi) \iff V_m\angle\phi$. Adding sinusoids becomes adding complex numbers, and taking $\frac{d}{dt}$ becomes multiplying by $j\omega$, so the dc methods work unchanged with complex values.`,
        r`| Element | Impedance | Voltage against current |
|---|---|---|
| Resistor | $R$ | in phase |
| Inductor | $j\omega L = jX_L$ | leads by 90° |
| Capacitor | $\frac{1}{j\omega C} = -jX_C$ | lags by 90° |`,
        r`**Impedance** $Z = R + jX$ is the ratio $\frac{\mathbf{V}}{\mathbf{I}}$ in complex form: its magnitude is the ratio of the sizes, and its angle is how far the voltage leads the current. Its reciprocal is the **admittance**, $Y = \frac{1}{Z} = G + jB$.`,
        {
          type: 'circuit',
          alt: 'A 100 V, 60 Hz source driving a 10 ohm resistor and a 50 millihenry inductor in series; the current I flows clockwise.',
          caption: 'A series RL load on 100 V, 60 Hz.',
          parts: [
            ['Vac', [0, 2], [0, 0], ['100 V', '60 Hz']],
            ['R', [0, 0], [2, 0], ['10 Ω', 'V_R']],
            ['L', [2, 0], [4, 0], ['50 mH', 'V_L']],
            ['wire', [4, 0], [4, 2]],
            ['wire', [4, 2], [0, 2]],
            ['i', [3, 2], [2, 2], 'I'],
          ],
        },
        {
          type: 'phasor',
          alt: 'Phasor diagram: the resistor voltage, 46.9 V, along the reference; the inductor voltage, 88.3 V, at 90 degrees from its tip; and their sum, the 100 V source, at 62.1 degrees.',
          caption: 'The resistor’s voltage is in phase with the current and the inductor’s leads it by 90°; together they make the 100 V source, so the current lags by 62.1°.',
          vectors: [
            { name: 'VR', mag: 46.86, angle: 0, label: 'V_R' },
            { mag: 88.33, angle: 90, from: 'VR', label: 'V_L' },
            { mag: 100, angle: 62.05, label: 'V', colour: 2 },
          ],
          arcs: [{ from: 0, to: 62.05, label: 'θ', r: 34 }],
        },
      ],
      keyIdeas: [
        r`$V_m\cos(\omega t + \phi) \iff V_m\angle\phi$; RMS phasors use $\frac{V_m}{\sqrt2}$.`,
        r`$Z_R = R$, $Z_L = j\omega L$ ($X_L = 2\pi fL$), $Z_C = \frac{1}{j\omega C}$ ($X_C = \frac{1}{2\pi fC}$).`,
        r`$Z = R + jX$, $Y = \frac1Z = G + jB$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reading a phasor',
          problem: r`Write $v = 100\cos(377t + 30^\circ)$ V as a phasor.`,
          steps: [
            r`Read the amplitude and the phase: $100\angle30^\circ$ V (peak).`,
            r`As an RMS phasor: $\frac{100}{\sqrt2}\angle30^\circ = 70.7\angle30^\circ$ V.`,
          ],
          answer: r`$100\angle30^\circ$ V peak, or $70.7\angle30^\circ$ V RMS (and $\omega = 377$ rad/s is 60 Hz).`,
        },
        {
          level: 'board',
          title: 'A series RL load',
          problem: r`In the circuit above, 10 Ω and 50 mH are in series across $100\angle0^\circ$ V at 60 Hz. Find $Z$, $\mathbf{I}$ and the voltage across each element.`,
          steps: [
            r`Reactance: $X_L = 2\pi(60)(0.05) = 18.85$ Ω.`,
            r`$Z = 10 + j18.85 = 21.34\angle62.05^\circ$ Ω.`,
            r`$\mathbf{I} = \frac{100\angle0^\circ}{21.34\angle62.05^\circ} = 4.686\angle-62.05^\circ$ A.`,
            r`$V_R = 4.686 \times 10 = 46.86$ V and $V_L = 4.686 \times 18.85 = 88.33$ V. Check: $\sqrt{46.86^2 + 88.33^2} = 100$ V, not $46.86 + 88.33$.`,
          ],
          answer: r`$Z = 21.34\angle62.05^\circ$ Ω, $\mathbf{I} = 4.69\angle-62.05^\circ$ A, $V_R = 46.9$ V, $V_L = 88.3$ V.`,
        },
      ],
      traps: [
        r`Inductive reactance rises with frequency; capacitive falls.`,
        r`Element voltages in an ac circuit add as phasors: here 46.9 V and 88.3 V make 100 V, not 135 V.`,
      ],
      check: [
        { q: r`At 60 Hz, what is the reactance of a 100 µF capacitor?`, a: r`$X_C = \frac{1}{2\pi(60)(100 \times 10^{-6})} = 26.5$ Ω.` },
        { q: r`For $Z = 3 - j4$ Ω, does the current lead or lag the voltage, and by how much?`, a: r`It leads, since the load is capacitive, by $\tan^{-1}\frac{4}{3} = 53.1^\circ$.` },
      ],
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
