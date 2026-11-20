// Library › Lessons › EE › Electric Circuits 1 (2026-11-18; every subtopic in the
// module format by 2026-11-20, with figures, examples a step at a time and
// checks; every number re-worked by electricCircuits1Lesson.test.js. Coverage and
// problem styles cross-checked against a review center's handout; the text,
// problems and figures are this app's own): written for the
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
      body: [
        r`Every circuit is sources driving components. An ideal **voltage source** holds its terminal voltage whatever current it delivers; an ideal **current source** holds its current whatever voltage that takes. Real sources have internal resistance, so a battery's terminal voltage sags under load: $V_t = E - Ir$. A dc source keeps one polarity; an ac source reverses many times a second (60 Hz on the Philippine grid).`,
        {
          type: 'circuit',
          alt: 'A battery drawn as an ideal 12 V source behind a 0.1 ohm internal resistance, feeding a load resistor; the terminal voltage is measured across the load.',
          caption: 'A real source: an ideal EMF behind its internal resistance.',
          parts: [
            ['V', [0, 2], [0, 0], 'E'],
            ['R', [0, 0], [2, 0], 'r'],
            ['wire', [2, 0], [3, 0]],
            ['R', [3, 0], [3, 2], 'R_L'],
            ['wire', [3, 2], [0, 2]],
            ['i', [2, 0], [3, 0], 'I'],
          ],
          nodes: [{ at: [2, 0], label: 'V_t', side: 'nw' }],
        },
        r`A conductor's resistance grows with its length and falls with its cross-section: $R = \rho\frac{L}{A}$. Philippine and US wire tables give the area of round wire in **circular mils**: a wire $d$ mils across (1 mil = 0.001 in) has $A = d^2$ CM, and resistivity then comes in Ω·CM/ft.`,
        r`| Conductor at 20 °C | $\rho$ (Ω·m) | $\rho$ (Ω·CM/ft) | Inferred zero |
|---|---|---|---|
| Annealed copper | $1.724 \times 10^{-8}$ | 10.37 | −234.5 °C |
| Hard-drawn copper | $1.77 \times 10^{-8}$ | 10.65 | −242 °C |
| Aluminium | $2.83 \times 10^{-8}$ | 17.0 | −236 °C |`,
        r`A metal's resistance rises almost in a straight line with temperature. Extend the line down and it reaches zero at the **inferred absolute zero** $T$, which gives $\frac{R_2}{R_1} = \frac{|T| + t_2}{|T| + t_1}$. The same fact as a coefficient: $R_2 = R_1[1 + \alpha_1(t_2 - t_1)]$ with $\alpha_1 = \frac{1}{|T| + t_1}$, which is 0.00393 per °C for annealed copper at 20 °C.`,
        {
          type: 'plot',
          alt: 'A straight line of copper resistance against temperature, 1 ohm at 20 degrees C, falling to zero at minus 234.5 degrees C.',
          caption: 'Copper’s resistance against temperature: the line meets zero at the inferred absolute zero.',
          x: [-250, 100],
          y: [0, 1.4],
          xLabel: 't (°C)',
          yLabel: 'R (Ω)',
          series: [{ f: (t) => (234.5 + t) / 254.5, label: 'R' }],
          marks: [{ at: [20, 1], label: '1 Ω at 20 °C' }, { x: -234.5, label: 'T = −234.5 °C' }],
        },
        r`Power in a resistor is $P = VI = I^2R = \frac{V^2}{R}$, and the energy over a time is $W = Pt$, billed in kilowatt-hours (1 kWh = 3.6 MJ). In a heater that energy becomes heat: warming a mass $m$ of water by $\Delta t$ takes $Q = mc\Delta t$ with $c = 4.186$ kJ/kg·°C, and a heater of efficiency η must supply $\frac{Q}{\eta}$. A battery's ampere-hour rating is charge, not energy: 1 A·h = 3600 C.`,
      ],
      keyIdeas: [
        r`A real source: $V_t = E - Ir$. A battery's A·h rating is charge (1 A·h = 3600 C).`,
        r`$R = \rho\frac{L}{A}$; for round wire $A = d_{mil}^2$ CM, and copper is 10.37 Ω·CM/ft.`,
        r`Copper: $\frac{R_2}{R_1} = \frac{234.5 + t_2}{234.5 + t_1}$. Power: $P = I^2R = \frac{V^2}{R}$; 1 kWh = 3.6 MJ.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Wire resistance, cold and hot',
          problem: r`Find the resistance of 100 m of 2 mm² annealed copper wire at 20 °C, and at 75 °C.`,
          steps: [
            r`At 20 °C: $R = \frac{1.724 \times 10^{-8} \times 100}{2 \times 10^{-6}} = 0.862$ Ω.`,
            r`At 75 °C: $R_2 = 0.862 \times \frac{234.5 + 75}{234.5 + 20} = 1.048$ Ω.`,
          ],
          answer: r`0.862 Ω at 20 °C and 1.048 Ω at 75 °C, about 22% more.`,
        },
        {
          level: 'board',
          title: 'How far a load can be',
          problem: r`A 230 V, 40 A dc load is fed by a two-wire copper line of 250 mil wire (10.37 Ω·CM/ft). The drop must not exceed 2%. How far from the supply can the load be?`,
          steps: [
            r`Allowed drop: $0.02 \times 230 = 4.6$ V, so the line may have at most $R = \frac{4.6}{40} = 0.115$ Ω.`,
            r`Area: $A = 250^2 = 62{,}500$ CM. The current goes out and back, so the wire is twice the distance $D$ long.`,
            r`$0.115 = \frac{10.37 \times 2D}{62{,}500}$, so $D = \frac{0.115 \times 62{,}500}{2 \times 10.37} = 346.6$ ft.`,
          ],
          answer: r`About 347 ft (106 m).`,
        },
        {
          level: 'board',
          title: 'A water heater',
          problem: r`A 2 kW heater with 85% efficiency heats 20 L of water from 25 °C to 100 °C. How long does it take, and what does it cost at ₱12 per kWh?`,
          steps: [
            r`Heat into the water: $Q = 20 \times 4.186 \times (100 - 25) = 6279$ kJ.`,
            r`Electrical energy needed: $\frac{6279}{0.85} = 7387$ kJ, which is $\frac{7387}{3600} = 2.052$ kWh.`,
            r`Time: $\frac{7387}{2} = 3694$ s, about 61.6 min. Cost: $2.052 \times 12 = 24.62$ pesos.`,
          ],
          answer: r`About 61.6 minutes, costing ₱24.62.`,
        },
      ],
      traps: [
        r`Stretching a wire to twice its length quadruples its resistance (the area halves too).`,
        r`Circular mils are not square mils: a round wire 100 mils across is 10,000 CM but only 7,854 square mils.`,
      ],
      check: [
        { q: r`A wire is drawn out to three times its length, keeping its volume. What happens to its resistance?`, a: r`It becomes 9 times as large: the length triples and the area falls to a third.` },
        { q: r`A copper winding reads 0.30 Ω at 20 °C and 0.36 Ω when hot. How hot is it?`, a: r`$\frac{234.5 + t}{254.5} = 1.2$, so $t = 1.2 \times 254.5 - 234.5 = 70.9$ °C.` },
      ],
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
      body: [
        r`Mesh analysis writes KVL around each **mesh**, a loop with nothing inside it, with **mesh currents** as the unknowns: a current imagined circulating around each window, clockwise by habit. A component on the edge between two meshes carries the difference of their two currents.`,
        {
          type: 'circuit',
          alt: 'Two meshes: on the left a 10 V source and a 2 ohm resistor; a 4 ohm resistor shared in the middle; on the right a 3 ohm resistor and a 5 V source opposing the clockwise mesh current.',
          caption: 'Two meshes sharing the 4 Ω; the mesh currents run clockwise.',
          parts: [
            ['V', [0, 2], [0, 0], '10 V'],
            ['R', [0, 0], [2, 0], '2 Ω'],
            ['R', [2, 0], [2, 2], '4 Ω'],
            ['R', [2, 0], [4, 0], '3 Ω'],
            ['V', [4, 2], [4, 0], '5 V'],
            ['wire', [4, 2], [0, 2]],
            ['i', [1.5, 2], [0.5, 2], 'i_1'],
            ['i', [3.5, 2], [2.5, 2], 'i_2'],
          ],
        },
        r`For resistors and voltage sources the equations follow a pattern, $\mathbf{R}\mathbf{i} = \mathbf{v}$, written by inspection: each diagonal entry is the total resistance around that mesh, each off-diagonal entry is minus the resistance two meshes share, and the right side is the net source voltage pushing each mesh current along (a source counts positive when its current leaves by the + terminal).`,
        r`A current source on a branch shared by two meshes fixes the difference of their currents. Write KVL around the larger loop that skips that branch, a **supermesh**, and add the source's own equation, such as $i_2 - i_1 = I_s$. A current source on an outer branch simply sets that mesh's current.`,
        {
          type: 'circuit',
          alt: 'A 20 V source and a 4 ohm resistor in the left mesh, a 2 A current source pointing up in the shared middle branch, and a 6 ohm and a 2 ohm resistor in the right mesh.',
          caption: 'A current source in the shared branch: the two meshes join into a supermesh.',
          parts: [
            ['V', [0, 2], [0, 0], '20 V'],
            ['R', [0, 0], [2, 0], '4 Ω'],
            ['I', [2, 2], [2, 0], '2 A'],
            ['R', [2, 0], [4, 0], '6 Ω'],
            ['R', [4, 0], [4, 2], '2 Ω'],
            ['wire', [4, 2], [0, 2]],
          ],
        },
        r`| | Nodal analysis | Mesh analysis |
|---|---|---|
| Unknowns | node voltages | mesh currents |
| Law written | KCL at each node | KVL around each mesh |
| Number of equations | nodes − 1 | branches − nodes + 1 |
| Easier with | current sources | voltage sources |
| Awkward source | voltage source between nodes: supernode | current source between meshes: supermesh |`,
      ],
      keyIdeas: [
        r`Assign a clockwise current to each window and write KVL around each.`,
        r`$\mathbf{R}\mathbf{i} = \mathbf{v}$: total resistance on the diagonal, minus the shared resistance off it.`,
        r`A shared resistor carries the difference of the two mesh currents. A current source in a shared branch makes a supermesh.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two meshes',
          problem: r`In the first circuit above, find the mesh currents and the current in the 4 Ω.`,
          steps: [
            r`Mesh 1: $2i_1 + 4(i_1 - i_2) = 10$, so $6i_1 - 4i_2 = 10$.`,
            r`Mesh 2: the clockwise current enters the 5 V source at its + terminal, a drop: $3i_2 + 5 + 4(i_2 - i_1) = 0$, so $-4i_1 + 7i_2 = -5$.`,
            r`Determinant $6 \times 7 - 16 = 26$: $i_1 = \frac{10 \times 7 - 20}{26} = 1.923$ A and $i_2 = \frac{6 \times (-5) + 40}{26} = 0.385$ A.`,
            r`The 4 Ω carries $i_1 - i_2 = 1.538$ A, downward.`,
          ],
          answer: r`$i_1 = 1.923$ A, $i_2 = 0.385$ A, and 1.538 A down through the 4 Ω.`,
        },
        {
          level: 'board',
          title: 'A supermesh',
          problem: r`In the second circuit above, find the two mesh currents.`,
          steps: [
            r`The 2 A source points up the shared branch, where $i_2$ flows up and $i_1$ down: $i_2 - i_1 = 2$.`,
            r`KVL around the supermesh, skipping the source: $4i_1 + 6i_2 + 2i_2 = 20$.`,
            r`Substitute $i_2 = i_1 + 2$: $4i_1 + 8i_1 + 16 = 20$, so $i_1 = 0.333$ A and $i_2 = 2.333$ A.`,
          ],
          answer: r`$i_1 = 0.333$ A and $i_2 = 2.333$ A.`,
        },
      ],
      traps: [
        r`Mesh analysis works only for planar circuits (no crossing wires).`,
        r`A shared branch carries the difference of the two mesh currents, in the direction of the larger one.`,
      ],
      check: [
        { q: r`A planar circuit has 6 branches and 4 nodes. How many mesh equations does it need?`, a: r`$b - n + 1 = 6 - 4 + 1 = 3$.` },
        { q: r`Writing mesh equations by inspection, what goes off the diagonal for two meshes that share 5 Ω?` , a: r`−5 Ω.` },
      ],
    },
    {
      name: 'Linearity and Superposition',
      inShort: r`In a linear circuit, each source's effect can be found separately and added.`,
      body: [
        r`A circuit is **linear** when every element obeys a straight-line law: resistors, ideal capacitors and inductors, and dependent sources proportional to a voltage or current. Two properties follow. **Homogeneity**: multiply every source by $k$ and every voltage and current is multiplied by $k$. **Additivity**: the response to several sources together is the sum of the responses to each one alone. Superposition is additivity used as a method.`,
        r`Keep one independent source on and turn the others off: a voltage source becomes a short (0 V), a current source an open (0 A). Solve, repeat for each source, and add the results with their signs. Dependent sources stay on in every step. Here is the circuit of Nodal Analysis, taken apart:`,
        {
          type: 'circuit',
          alt: 'The two-node circuit with only the 12 V source on: the 1 A current source has been removed, leaving an open circuit.',
          caption: 'The 12 V source alone: the 1 A source becomes an open circuit.',
          parts: [
            ['V', [0, 2], [0, 0], '12 V'],
            ['R', [0, 0], [2, 0], '2 Ω'],
            ['R', [2, 0], [2, 2], '4 Ω'],
            ['R', [2, 0], [4, 0], '3 Ω'],
            ['R', [4, 0], [4, 2], '6 Ω'],
            ['wire', [4, 2], [0, 2]],
          ],
          nodes: [{ at: [2, 0], label: 'A' }, { at: [4, 0], label: 'B' }],
        },
        {
          type: 'circuit',
          alt: 'The same circuit with only the 1 A source on: the 12 V source has been replaced by a plain wire.',
          caption: 'The 1 A source alone: the 12 V source becomes a short circuit.',
          parts: [
            ['wire', [0, 2], [0, 0]],
            ['R', [0, 0], [2, 0], '2 Ω'],
            ['R', [2, 0], [2, 2], '4 Ω'],
            ['R', [2, 0], [4, 0], '3 Ω'],
            ['R', [4, 0], [4, 2], '6 Ω'],
            ['wire', [4, 0], [6, 0]],
            ['I', [6, 2], [6, 0], '1 A'],
            ['wire', [6, 2], [0, 2]],
          ],
          nodes: [{ at: [2, 0], label: 'A' }, { at: [4, 0], label: 'B' }],
        },
        r`Superposition earns its keep when the sources differ in kind or frequency, such as a dc source and an ac source in one circuit, where no single solution covers both. It does not work for power: power goes as the square of a current, so add the currents first and square the total.`,
      ],
      keyIdeas: [
        r`Linear: doubling every source doubles every response.`,
        r`Superposition: turn off all but one independent source (voltage sources shorted, current sources opened), solve, repeat, add.`,
        r`Dependent sources stay on; powers do not superpose.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One source at a time',
          problem: r`Find $v_B$ from the 12 V source alone and the 1 A source alone, and add them.`,
          steps: [
            r`12 V alone: seen from A, the source and its 2 Ω with the 4 Ω make $12 \times \frac{4}{6} = 8$ V behind $2 \parallel 4 = 1.333$ Ω.`,
            r`So $v_B' = 8 \times \frac{6}{1.333 + 3 + 6} = 4.645$ V.`,
            r`1 A alone: B sees 6 Ω in parallel with $3 + 1.333 = 4.333$ Ω, which is 2.516 Ω, so $v_B'' = 1 \times 2.516 = 2.516$ V.`,
            r`Add: $4.645 + 2.516 = 7.161$ V, the answer nodal analysis gave.`,
          ],
          answer: r`$v_B = 4.65 + 2.52 = 7.16$ V.`,
        },
        {
          level: 'board',
          title: 'Power does not add',
          problem: r`A 10 Ω resistor carries 2 A from one source and 3 A from another, in the same direction. Find its power, and compare it with the sum of the two separate powers.`,
          steps: [
            r`The currents add: $2 + 3 = 5$ A, so $P = 5^2 \times 10 = 250$ W.`,
            r`The separate powers are $2^2 \times 10 = 40$ W and $3^2 \times 10 = 90$ W, which sum to only 130 W.`,
          ],
          answer: r`250 W. Adding the powers (130 W) is wrong by 120 W, the cross term $2 \times 2 \times 3 \times 10$.`,
        },
      ],
      traps: [
        r`Adding the powers from each source gives the wrong total: add the voltages or currents, then compute power.`,
        r`Never turn off a dependent source: it responds to the circuit, it isn't an input.`,
      ],
      check: [
        { q: r`In a linear circuit, a 12 V source drives 0.5 A through a load. What flows when the source is raised to 30 V?`, a: r`$0.5 \times \frac{30}{12} = 1.25$ A.` },
        { q: r`What replaces a voltage source that is turned off? A current source?`, a: r`A short circuit; an open circuit.` },
      ],
    },
    {
      name: 'Source Transformation',
      inShort: r`Swapping a voltage source with series resistance for a current source with parallel resistance.`,
      body: [
        r`A voltage source $V_s$ in series with $R$, and a current source $I_s = \frac{V_s}{R}$ in parallel with the same $R$, give the same voltage and current to anything connected across their terminals. Swapping one for the other is **source transformation**. Inside they differ (the two dissipate different power in $R$), so the equivalence holds at the terminals only.`,
        {
          type: 'circuit',
          alt: 'Left: a 12 V source in series with 2 ohms between terminals a and b. Right: a 6 A current source in parallel with 2 ohms between terminals a and b.',
          caption: 'Equivalent at a and b: 12 V behind 2 Ω, or 6 A beside 2 Ω.',
          parts: [
            ['V', [0, 2], [0, 0], '12 V'],
            ['R', [0, 0], [2, 0], '2 Ω'],
            ['wire', [0, 2], [2, 2]],
            ['I', [4, 2], [4, 0], '6 A'],
            ['wire', [4, 0], [6, 0]],
            ['R', [5, 0], [5, 2], '2 Ω'],
            ['wire', [4, 2], [6, 2]],
            ['dot', [5, 0]],
            ['dot', [5, 2]],
          ],
          nodes: [{ at: [2, 0], label: 'a' }, { at: [2, 2], label: 'b', side: 'se' }, { at: [6, 0], label: 'a' }, { at: [6, 2], label: 'b', side: 'se' }],
        },
        r`The current source pushes current out of the terminal that the voltage source's + side faces. Transformations chain: a ladder of sources and resistors collapses step by step, turning series groups into parallel ones and back, adding current sources that sit in parallel and voltage sources that sit in series along the way.`,
      ],
      keyIdeas: [
        r`$V_s = I_sR$ with the same R; the equivalence holds at the terminals only.`,
        r`Repeated transformations collapse ladder circuits quickly.`,
        r`The current source's arrow points to the voltage source's + terminal.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One transformation, checked',
          problem: r`Transform 12 V in series with 2 Ω, and check both forms give the same voltage across a 4 Ω load.`,
          steps: [
            r`$I_s = \frac{12}{2} = 6$ A, in parallel with the same 2 Ω, pushing current out at the terminal the + side faced.`,
            r`Voltage form: $12 \times \frac{4}{2 + 4} = 8$ V across the load.`,
            r`Current form: the 6 A divides between 2 Ω and 4 Ω in parallel, $\frac{2 \times 4}{6} = 1.333$ Ω, so $6 \times 1.333 = 8$ V.`,
          ],
          answer: r`6 A in parallel with 2 Ω; both give 8 V across the 4 Ω.`,
        },
        {
          level: 'board',
          title: 'Two batteries on one load',
          problem: r`A 24 V source with 4 Ω internal resistance and a 12 V source with 6 Ω feed a 3 Ω load in parallel, + terminals together. Find the load current.`,
          steps: [
            r`Transform each: $\frac{24}{4} = 6$ A beside 4 Ω, and $\frac{12}{6} = 2$ A beside 6 Ω.`,
            r`Combine the parallel parts: $6 + 2 = 8$ A beside $4 \parallel 6 = 2.4$ Ω.`,
            r`Transform back: $8 \times 2.4 = 19.2$ V behind 2.4 Ω. Load current: $\frac{19.2}{2.4 + 3} = 3.556$ A.`,
          ],
          answer: r`3.556 A, at a load voltage of 10.67 V.`,
        },
      ],
      traps: [
        r`An ideal source (no resistance) can't be transformed.`,
        r`Keep the direction: the current source pushes out of the terminal the voltage source's + side faces.`,
      ],
      check: [
        { q: r`A 5 A source in parallel with 10 Ω is turned into a voltage source. What is it?`, a: r`50 V in series with 10 Ω.` },
        { q: r`Can a 12 V source with no series resistance be transformed?`, a: r`No: it would need an infinite current source beside 0 Ω.` },
      ],
    },
    {
      name: 'Thevenin and Norton',
      inShort: r`Any linear two-terminal circuit as one source and one resistance.`,
      body: [
        r`**Thévenin's theorem**: any linear circuit, seen from two terminals, behaves as one voltage source $V_{th}$ in series with one resistance $R_{th}$. **Norton's theorem** gives the dual: a current source $I_N$ in parallel with $R_N = R_{th}$. The two are source transformations of each other, $V_{th} = I_NR_{th}$. Once found, the equivalent answers every question about whatever load is connected, without solving the whole circuit again.`,
        {
          type: 'circuit',
          alt: 'A Thévenin equivalent: one voltage source in series with one resistance, connected at terminals a and b to a load resistor.',
          caption: 'The whole circuit, seen from a and b, as one source and one resistance.',
          parts: [
            ['V', [0, 2], [0, 0], 'V_th'],
            ['R', [0, 0], [2, 0], 'R_th'],
            ['wire', [2, 0], [3.5, 0]],
            ['R', [3.5, 0], [3.5, 2], 'R_L'],
            ['wire', [3.5, 2], [0, 2]],
          ],
          nodes: [{ at: [2, 0], label: 'a' }, { at: [2, 2], label: 'b', side: 'se' }],
        },
        r`$V_{th}$ is the open-circuit voltage across the terminals and $I_N$ the short-circuit current through them, so $R_{th} = \frac{V_{oc}}{I_{sc}}$. With independent sources only, $R_{th}$ is also the resistance seen into the terminals with every source turned off. With dependent sources, keep them on, drive the terminals with a test source and take $R_{th} = \frac{v_t}{i_t}$.`,
        r`Two load tests also give the equivalent. If loads $R_1$ and $R_2$ draw $I_1$ and $I_2$, then $V_{th} = I_1(R_{th} + R_1) = I_2(R_{th} + R_2)$: two equations, two unknowns. That is how a battery's EMF and internal resistance are measured.`,
      ],
      keyIdeas: [
        r`$V_{th} = V_{oc}$, $I_N = I_{sc}$, $R_{th} = \frac{V_{oc}}{I_{sc}}$.`,
        r`With independent sources only, $R_{th}$ is the resistance seen with them off.`,
        r`With dependent sources, apply a test source and take $\frac{v_t}{i_t}$.`,
      ],
      examples: [
        {
          level: 'board',
          title: 'Thévenin at node B',
          problem: r`In the circuit of Nodal Analysis, remove the 6 Ω and find the Thévenin equivalent at B (to the reference). Then put the 6 Ω back.`,
          steps: [
            r`Seen from A, the 12 V source and its 2 Ω with the 4 Ω are 8 V behind 1.333 Ω.`,
            r`Open circuit at B: the 1 A flows from B through the 3 Ω into A and on through the 1.333 Ω, so $V_{oc} = 8 + 1 \times (3 + 1.333) = 12.333$ V.`,
            r`Sources off (12 V shorted, 1 A opened): $R_{th} = 3 + 2 \parallel 4 = 4.333$ Ω.`,
            r`With the 6 Ω back: $v_B = 12.333 \times \frac{6}{4.333 + 6} = 7.161$ V, as nodal analysis found.`,
          ],
          answer: r`$V_{th} = 12.33$ V and $R_{th} = 4.33$ Ω; with 6 Ω, $v_B = 7.16$ V.`,
        },
        {
          level: 'board',
          title: 'From two load tests',
          problem: r`A source drives 5 A through 4 Ω and 2 A through 16 Ω. Find its Thévenin equivalent, and the current it drives through 8 Ω.`,
          steps: [
            r`$5(R_{th} + 4) = 2(R_{th} + 16)$, so $3R_{th} = 12$ and $R_{th} = 4$ Ω.`,
            r`$V_{th} = 5 \times (4 + 4) = 40$ V.`,
            r`Into 8 Ω: $\frac{40}{4 + 8} = 3.333$ A.`,
          ],
          answer: r`40 V behind 4 Ω; 3.33 A through 8 Ω.`,
        },
      ],
      traps: [
        r`Never turn off a dependent source to find $R_{th}$.`,
        r`Turning a voltage source off makes it a short, not an open: a removed source and a zeroed source are different circuits.`,
      ],
      check: [
        { q: r`What is the Norton equivalent of 18 V behind 6 Ω?`, a: r`3 A in parallel with 6 Ω.` },
        { q: r`Terminals read 24 V open-circuit and 8 A short-circuit. What is $R_{th}$?`, a: r`$\frac{24}{8} = 3$ Ω.` },
      ],
    },
    {
      name: 'Maximum Power Transfer',
      inShort: r`The load that draws the most power from a source.`,
      body: [
        r`A source with Thévenin equivalent $V_{th}$ and $R_{th}$ delivers to a load $R_L$ the power $P_L = \frac{V_{th}^2R_L}{(R_{th} + R_L)^2}$. A tiny load gets little voltage and a huge one little current, so the power is small at both ends and largest in between, exactly when $R_L = R_{th}$: then $P_{max} = \frac{V_{th}^2}{4R_{th}}$.`,
        {
          type: 'plot',
          alt: 'Load power against load resistance for a 10 V source with 4 ohms: the curve rises to a peak of 6.25 W at 4 ohms, then falls slowly.',
          caption: 'Load power against load resistance for a 10 V, 4 Ω source: the peak is where the load matches the source’s 4 Ω.',
          x: [0, 24],
          y: [0, 7.5],
          xLabel: 'R_L (Ω)',
          yLabel: 'P_L (W)',
          series: [{ f: (rl) => (100 * rl) / (4 + rl) ** 2, label: 'P_L', area: true }],
          marks: [{ at: [4, 6.25], label: '6.25 W at 4 Ω' }],
        },
        r`At that point the load and $R_{th}$ carry the same current and split the voltage equally, so the **efficiency is only 50%**. Power systems never run there: they want efficiency, so their loads are far larger than the source's resistance. Matching is for weak signals (antennas, amplifiers, sensors), where getting the most power matters more than wasting half of it.`,
        r`With ac, the load for maximum power is the complex conjugate of the source's impedance, $Z_L = Z_{th}^*$: the reactances cancel and the resistances match (Electric Circuits 2).`,
      ],
      keyIdeas: [
        r`$P_L = \frac{V_{th}^2R_L}{(R_{th} + R_L)^2}$, largest at $R_L = R_{th}$: $P_{max} = \frac{V_{th}^2}{4R_{th}}$.`,
        r`Efficiency at that point is only 50%.`,
        r`For ac, the load is the complex conjugate $Z_L = Z_{th}^*$ (Circuits 2).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Matching a load',
          problem: r`A source has $V_{th} = 10$ V and $R_{th} = 4$ Ω. What load takes the most power, how much, and at what efficiency?`,
          steps: [
            r`Match it: $R_L = R_{th} = 4$ Ω.`,
            r`$P_{max} = \frac{10^2}{4 \times 4} = 6.25$ W, with the same 6.25 W lost in $R_{th}$.`,
            r`Efficiency: $\frac{6.25}{12.5} = 50\%$.`,
          ],
          answer: r`4 Ω, taking 6.25 W at 50% efficiency.`,
        },
        {
          level: 'board',
          title: 'From two load tests',
          problem: r`A source drives 4 A through 6 Ω and 3 A through 10 Ω. What is the most power it can deliver, and into what load?`,
          steps: [
            r`$4(R_{th} + 6) = 3(R_{th} + 10)$, so $R_{th} = 6$ Ω and $V_{th} = 4 \times 12 = 48$ V.`,
            r`$P_{max} = \frac{48^2}{4 \times 6} = 96$ W into 6 Ω.`,
          ],
          answer: r`96 W, into a 6 Ω load.`,
        },
        {
          level: 'board',
          title: 'The best load in a network',
          problem: r`In the circuit of Nodal Analysis, the 6 Ω is replaced by an adjustable resistor. What setting takes the most power, and how much?`,
          steps: [
            r`From Thévenin and Norton: at B, $V_{th} = 12.333$ V and $R_{th} = 4.333$ Ω.`,
            r`Set the resistor to 4.333 Ω: $P_{max} = \frac{12.333^2}{4 \times 4.333} = 8.776$ W.`,
          ],
          answer: r`4.33 Ω, taking 8.78 W.`,
        },
      ],
      traps: [
        r`Utilities avoid matching: 50% efficiency would waste half the power.`,
        r`Match the load to the source's resistance, not the other way round: for a fixed load, the source resistance that gives the most power is zero.`,
      ],
      check: [
        { q: r`At maximum power transfer, what share of the source's power reaches the load?`, a: r`Half: the efficiency is 50%.` },
        { q: r`A source has $Z_{th} = 3 + j4$ Ω. What load takes the most power?`, a: r`Its conjugate, $Z_L = 3 - j4$ Ω.` },
      ],
    },
    {
      name: 'Delta-Wye Conversion',
      inShort: r`Converting triangles of resistors to stars and back to unlock bridges.`,
      body: [
        r`Some networks have no two resistors in series or in parallel to combine; a bridge is the classic case. Turning a **delta** (Δ: three resistors in a triangle between terminals a, b and c) into an equivalent **wye** (Y: three resistors meeting at a centre), or back, opens them up. The two are equivalent when the resistance between every pair of terminals is the same. Drawn with square corners, a delta is a Π and a wye a T.`,
        {
          type: 'circuit',
          alt: 'Left: a delta drawn as a pi network, one resistor across the top between a and b and one from each of a and b down to terminal c. Right: the equivalent wye drawn as a T, three resistors meeting at a centre node, from a, from b and down to c.',
          caption: 'A delta drawn as a Π (left) and the equivalent wye drawn as a T (right).',
          parts: [
            ['R', [0, 0], [3, 0], 'R_{ab}'],
            ['R', [0, 0], [0, 2], 'R_{ca}', { side: 'left' }],
            ['R', [3, 0], [3, 2], 'R_{bc}'],
            ['wire', [0, 2], [3, 2]],
            ['R', [5, 0], [6.5, 0], 'R_a'],
            ['R', [6.5, 0], [8, 0], 'R_b'],
            ['R', [6.5, 0], [6.5, 2], 'R_c'],
            ['wire', [5, 2], [8, 2]],
            ['dot', [6.5, 0]],
          ],
          nodes: [
            { at: [0, 0], label: 'a', side: 'nw' }, { at: [3, 0], label: 'b' }, { at: [1.5, 2], label: 'c', side: 'se' },
            { at: [5, 0], label: 'a', side: 'nw' }, { at: [8, 0], label: 'b' }, { at: [6.5, 2], label: 'c', side: 'se' },
          ],
        },
        r`**Δ to Y**: each wye resistor is the product of the two delta resistors touching its terminal, over the sum of all three: $R_a = \frac{R_{ab}R_{ca}}{R_{ab} + R_{bc} + R_{ca}}$. **Y to Δ**: each delta resistor is the sum of the pairwise products, over the wye resistor opposite it: $R_{ab} = \frac{R_aR_b + R_bR_c + R_cR_a}{R_c}$. Three equal resistors give $R_Y = \frac{R_\Delta}{3}$.`,
        {
          type: 'circuit',
          alt: 'A bridge: a source feeds node a on the left and node b on the right; R1 and R2 form the top path through node c, R3 and R4 the bottom path through node d, and R5 joins c and d.',
          caption: 'A bridge: R1 and R2 on top, R3 and R4 below, R5 across the middle.',
          parts: [
            ['wire', [1, 0], [1, 2]],
            ['R', [1, 0], [3, 0], 'R_1'],
            ['R', [3, 0], [5, 0], 'R_2'],
            ['R', [1, 2], [3, 2], 'R_3', { side: 'below' }],
            ['R', [3, 2], [5, 2], 'R_4', { side: 'below' }],
            ['R', [3, 0], [3, 2], 'R_5'],
            ['wire', [5, 0], [5, 2]],
            ['wire', [5, 2], [5, 3.5]],
            ['wire', [5, 3.5], [0, 3.5]],
            ['V', [0, 3.5], [0, 1], 'V'],
            ['wire', [0, 1], [1, 1]],
            ['dot', [3, 0]],
            ['dot', [3, 2]],
          ],
          nodes: [{ at: [1, 1], label: 'a', side: 'ne' }, { at: [5, 1], label: 'b', side: 'ne' }],
        },
        r`A **Wheatstone bridge** is balanced when the products of opposite arms are equal, $R_1R_4 = R_2R_3$: the middle nodes then sit at the same voltage, no current flows in $R_5$, and it can be removed. An unbalanced bridge needs a Δ-Y conversion, or nodal analysis.`,
      ],
      keyIdeas: [
        r`$\Delta \to Y$: $R_a = \frac{R_{ab}R_{ca}}{R_{ab} + R_{bc} + R_{ca}}$ (the two touching node a, over the sum).`,
        r`$Y \to \Delta$: $R_{ab} = \frac{R_aR_b + R_bR_c + R_cR_a}{R_c}$ (sum of products over the opposite one).`,
        r`Balanced: $R_Y = \frac{R_\Delta}{3}$; a bridge with $R_1R_4 = R_2R_3$ carries nothing in its middle branch.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Delta to wye',
          problem: r`Convert a delta of $R_{ab} = 10$, $R_{bc} = 20$, $R_{ca} = 30$ Ω to a wye, and check the resistance between a and b.`,
          steps: [
            r`The sum is 60 Ω. $R_a = \frac{10 \times 30}{60} = 5$ Ω, $R_b = \frac{10 \times 20}{60} = 3.333$ Ω, $R_c = \frac{20 \times 30}{60} = 10$ Ω.`,
            r`Check a to b. Delta: 10 Ω in parallel with $20 + 30 = 50$ Ω, which is 8.333 Ω. Wye: $5 + 3.333 = 8.333$ Ω.`,
          ],
          answer: r`$R_a = 5$ Ω, $R_b = 3.33$ Ω, $R_c = 10$ Ω.`,
        },
        {
          level: 'board',
          title: 'An unbalanced bridge',
          problem: r`In the bridge above, $R_1 = 10$, $R_2 = 20$, $R_3 = 20$, $R_4 = 10$ and $R_5 = 10$ Ω, fed from 30 V. Find the source current.`,
          steps: [
            r`Not balanced: $R_1R_4 = 100$ but $R_2R_3 = 400$.`,
            r`Turn the delta a, c, d ($R_1$, $R_3$, $R_5$, summing to 40 Ω) into a wye: $\frac{10 \times 20}{40} = 5$ Ω at a, $\frac{10 \times 10}{40} = 2.5$ Ω at c, $\frac{20 \times 10}{40} = 5$ Ω at d.`,
            r`From the centre: $2.5 + 20 = 22.5$ Ω through c and $5 + 10 = 15$ Ω through d, in parallel: 9 Ω.`,
            r`Total: $5 + 9 = 14$ Ω, so $I = \frac{30}{14} = 2.143$ A.`,
          ],
          answer: r`2.143 A.`,
        },
      ],
      traps: [
        r`Check: the resistance between any two terminals must come out the same for both forms.`,
        r`In Y to Δ, divide by the wye resistor opposite the delta side, not one touching it.`,
      ],
      check: [
        { q: r`A bridge has $R_1 = 10$, $R_2 = 20$, $R_3 = 15$ and $R_4 = 30$ Ω. What flows in its middle branch?`, a: r`Nothing: $10 \times 30 = 20 \times 15$, so the bridge is balanced.` },
        { q: r`Three 9 Ω resistors form a delta. What is the equivalent wye?`, a: r`Three 3 Ω resistors.` },
      ],
    },
    {
      name: 'Controlled Sources and Ideal Op Amp',
      inShort: r`Dependent sources, and op amps analysed with two simple rules.`,
      body: [
        r`A **dependent source** sets its voltage or current from a voltage or current elsewhere in the circuit. There are four: a voltage-controlled voltage source ($\mu v_x$), a current-controlled voltage source ($ri_x$), a voltage-controlled current source ($gv_x$) and a current-controlled current source ($\beta i_x$). They model amplifiers and transistors, and they stay on in every method: in superposition, in finding $R_{th}$, everywhere.`,
        r`An **op amp** is an amplifier with a very high gain. With negative feedback (the output connected back to the − input), two rules solve it: the two inputs sit at the same voltage, $v_+ = v_-$, and no current flows into either input. In the inverting amplifier below, the + input is grounded, so the − input sits at 0 V too (a **virtual ground**), and the input current $\frac{v_{in}}{R_1}$ has nowhere to go but through $R_f$.`,
        {
          type: 'circuit',
          alt: 'An inverting amplifier: the input voltage drives R1 into the minus input of an op amp, a feedback resistor Rf runs from the minus input to the output, and the plus input is grounded.',
          caption: 'An inverting amplifier: the gain is set by the two resistors alone.',
          parts: [
            ['R', [0.5, 1.5], [2.5, 1.5], 'R_1'],
            ['wire', [2.5, 1.5], [3, 1.5]],
            ['wire', [2.5, 1.5], [2.5, 0]],
            ['R', [2.5, 0], [5.5, 0], 'R_f'],
            ['wire', [5.5, 0], [5.5, 2]],
            ['wire', [5, 2], [6.5, 2]],
            ['wire', [3, 2.5], [2.5, 2.5]],
            ['gnd', [2.5, 2.5]],
            ['opamp', [5, 2]],
            ['dot', [2.5, 1.5]],
            ['dot', [5.5, 2]],
          ],
          nodes: [{ at: [0.5, 1.5], label: 'v_{in}', side: 'nw' }, { at: [6.5, 2], label: 'v_o' }],
        },
        r`| Circuit | Output |
|---|---|
| Inverting | $v_o = -\frac{R_f}{R_1}v_{in}$ |
| Non-inverting | $v_o = \left(1 + \frac{R_f}{R_1}\right)v_{in}$ |
| Voltage follower | $v_o = v_{in}$ |
| Summing | $v_o = -R_f\left(\frac{v_1}{R_1} + \frac{v_2}{R_2} + \cdots\right)$ |
| Difference (matched resistors) | $v_o = \frac{R_2}{R_1}(v_2 - v_1)$ |`,
      ],
      keyIdeas: [
        r`Dependent sources (VCVS, VCCS, CCVS, CCCS) model transistors and amplifiers; their value depends on another voltage or current.`,
        r`Ideal op amp with negative feedback: $v_+ = v_-$ and no input current.`,
        r`Summing $v_o = -R_f\sum\frac{v_k}{R_k}$; difference $v_o = \frac{R_2}{R_1}(v_2 - v_1)$; follower $v_o = v_{in}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An inverting amplifier',
          problem: r`The amplifier above has $R_1 = 10$ kΩ and $R_f = 47$ kΩ. Find $v_o$ for $v_{in} = 0.2$ V.`,
          steps: [
            r`The − input is a virtual ground, so the input current is $\frac{0.2}{10\,000} = 20$ µA.`,
            r`No current enters the op amp, so the same 20 µA flows through $R_f$: $v_o = 0 - 20\ \mu\text{A} \times 47\text{ k}\Omega = -0.94$ V.`,
          ],
          answer: r`$v_o = -0.94$ V, a gain of −4.7.`,
        },
        {
          level: 'basic',
          title: 'A summing amplifier',
          problem: r`A summing amplifier has $R_f = 10$ kΩ, with 0.5 V in through 10 kΩ and 0.2 V in through 5 kΩ. Find $v_o$.`,
          steps: [
            r`Input currents into the virtual ground: $\frac{0.5}{10\text{ k}} = 50$ µA and $\frac{0.2}{5\text{ k}} = 40$ µA.`,
            r`Their sum, 90 µA, flows through $R_f$: $v_o = -90\ \mu\text{A} \times 10\text{ k}\Omega = -0.9$ V.`,
          ],
          answer: r`$v_o = -0.9$ V.`,
        },
        {
          level: 'board',
          title: 'Thévenin with a dependent source',
          problem: r`A 10 V source with 2 Ω in series feeds terminal a. From a to the reference is a dependent current source drawing $0.5i_x$, where $i_x$ is the current in the 2 Ω. Find the Thévenin equivalent at a.`,
          steps: [
            r`Open circuit: KCL at a gives $i_x = 0.5i_x$, so $i_x = 0$ and $V_{oc} = 10$ V.`,
            r`Short circuit: $i_x = \frac{10}{2} = 5$ A, the dependent source takes 2.5 A, and the short carries $I_{sc} = 2.5$ A.`,
            r`$R_{th} = \frac{10}{2.5} = 4$ Ω, not the 2 Ω you would get by wrongly turning the dependent source off.`,
          ],
          answer: r`10 V behind 4 Ω.`,
        },
      ],
      traps: [
        r`The output saturates near the supply rails: a gain of 100 on 1 V doesn't give 100 V from a ±15 V op amp.`,
        r`The two rules hold only with negative feedback; without it, the op amp swings to a rail.`,
      ],
      check: [
        { q: r`An inverting amplifier with $R_1 = 2$ kΩ and $R_f = 20$ kΩ runs on ±12 V. What is $v_o$ for 1.5 V in?`, a: r`The ideal answer, $-10 \times 1.5 = -15$ V, is past the supply, so the output saturates near −12 V.` },
        { q: r`A transistor's collector current is $\beta i_B$. Which dependent source models it?`, a: r`A current-controlled current source.` },
      ],
    },
    {
      name: 'Capacitors and Inductors',
      inShort: r`Elements that store energy in electric and magnetic fields.`,
      body: [
        r`A **capacitor** stores energy in the electric field between two conductors. Its charge follows its voltage, $q = Cv$, so its current follows the rate of change of voltage, $i = C\frac{dv}{dt}$. An **inductor** stores energy in a magnetic field, and $v = L\frac{di}{dt}$. Because stored energy can't jump, a capacitor's voltage and an inductor's current can't change instantly; at dc steady state a capacitor is an open circuit and an inductor a short.`,
        r`A parallel-plate capacitor has $C = \frac{\varepsilon_0\varepsilon_rA}{d}$, with $\varepsilon_0 = 8.854 \times 10^{-12}$ F/m. One built of $n$ interleaved plates has $n - 1$ layers of dielectric working in parallel: $C = (n - 1)\frac{\varepsilon_0\varepsilon_rA}{d}$. Layers of different dielectrics stacked between two plates act in series: $C = \frac{\varepsilon_0A}{\sum d_k/\varepsilon_{rk}}$.`,
        r`| | In series | In parallel |
|---|---|---|
| Capacitors | $\frac{1}{C} = \sum\frac{1}{C_k}$, one charge | $C = \sum C_k$, one voltage |
| Inductors | $L = \sum L_k$, one current | $\frac{1}{L} = \sum\frac{1}{L_k}$, one voltage |
| Energy stored | $W_C = \frac12CV^2 = \frac{Q^2}{2C}$ | $W_L = \frac12LI^2$ |`,
        {
          type: 'circuit',
          alt: 'A 12 V source across a 2 microfarad and a 6 microfarad capacitor in series; the 2 microfarad takes 9 V and the 6 microfarad 3 V.',
          caption: 'In series the two share one charge, so the smaller capacitor takes the larger voltage.',
          parts: [
            ['V', [0, 2], [0, 0], '12 V'],
            ['C', [0, 0], [2, 0], ['2 µF', '9 V']],
            ['C', [2, 0], [4, 0], ['6 µF', '3 V']],
            ['wire', [4, 0], [4, 2]],
            ['wire', [4, 2], [0, 2]],
          ],
        },
        r`Connecting a charged capacitor to an uncharged one conserves **charge**, not energy. The two settle at a common voltage $\frac{C_1V_1 + C_2V_2}{C_1 + C_2}$, and the energy that goes missing is lost as heat (and radiation) in the connection, however small its resistance.`,
      ],
      keyIdeas: [
        r`$i = C\frac{dv}{dt}$, $v = L\frac{di}{dt}$; $W_C = \frac12CV^2$, $W_L = \frac12LI^2$.`,
        r`Capacitors combine like conductances (parallel add); inductors like resistors (series add).`,
        r`Capacitor voltage and inductor current can't change instantly; in dc steady state C is open, L is short.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Capacitors in series',
          problem: r`2 µF and 6 µF in series are charged from 12 V, as drawn above. Find each one's voltage.`,
          steps: [
            r`$C_s = \frac{2 \times 6}{2 + 6} = 1.5$ µF, so the charge is $Q = 1.5 \times 12 = 18$ µC on each.`,
            r`$V_1 = \frac{18}{2} = 9$ V and $V_2 = \frac{18}{6} = 3$ V; they add to 12 V.`,
          ],
          answer: r`9 V across the 2 µF and 3 V across the 6 µF.`,
        },
        {
          level: 'board',
          title: 'Sharing a charge',
          problem: r`A 10 µF capacitor charged to 200 V is connected across an uncharged 30 µF capacitor. Find the final voltage and the energy lost.`,
          steps: [
            r`Charge: $Q = 10 \times 200 = 2000$ µC, kept: $V = \frac{2000}{10 + 30} = 50$ V.`,
            r`Energy before: $\frac12 \times 10 \times 10^{-6} \times 200^2 = 0.2$ J. After: $\frac12 \times 40 \times 10^{-6} \times 50^2 = 0.05$ J.`,
            r`Lost: $0.2 - 0.05 = 0.15$ J, three quarters of it.`,
          ],
          answer: r`50 V, with 0.15 J lost.`,
        },
        {
          level: 'board',
          title: 'A multi-plate capacitor',
          problem: r`A capacitor has 11 plates, each 10 cm by 10 cm, separated by mica 0.2 mm thick ($\varepsilon_r = 6$). Find its capacitance.`,
          steps: [
            r`Eleven plates make $11 - 1 = 10$ dielectric layers in parallel.`,
            r`One layer: $\frac{8.854 \times 10^{-12} \times 6 \times 0.01}{0.0002} = 2.656 \times 10^{-9}$ F.`,
            r`Ten of them: $C = 2.656 \times 10^{-8}$ F.`,
          ],
          answer: r`26.6 nF.`,
        },
      ],
      traps: [
        r`Opening an inductor's circuit suddenly makes a large voltage spike: $v = L\frac{di}{dt}$.`,
        r`Capacitors combine the opposite way to resistors: in series the total gets smaller.`,
      ],
      check: [
        { q: r`A 0.5 H inductor carries 4 A. How much energy does it store?`, a: r`$\frac12 \times 0.5 \times 4^2 = 4$ J.` },
        { q: r`Two 6 µF capacitors in series, with a 3 µF capacitor in parallel with the pair. What is the total?`, a: r`$3 + 3 = 6$ µF.` },
      ],
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
      body: [
        r`With both an inductor and a capacitor, a circuit stores energy two ways and passes it back and forth, so its response is second order. For a series RLC switched onto dc, the current obeys $\frac{d^2i}{dt^2} + \frac{R}{L}\frac{di}{dt} + \frac{i}{LC} = 0$, whose roots are $s = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$ with the damping $\alpha = \frac{R}{2L}$ and the undamped natural frequency $\omega_0 = \frac{1}{\sqrt{LC}}$. Which is bigger decides the response.`,
        r`| Case | Series condition | Current after the switch closes |
|---|---|---|
| Overdamped | $\alpha > \omega_0$, $R > 2\sqrt{L/C}$ | $\frac{E}{\beta L}e^{-\alpha t}\sinh\beta t$, $\beta = \sqrt{\alpha^2 - \omega_0^2}$ |
| Critically damped | $\alpha = \omega_0$, $R = 2\sqrt{L/C}$ | $\frac{E}{L}te^{-\alpha t}$ |
| Underdamped | $\alpha < \omega_0$, $R < 2\sqrt{L/C}$ | $\frac{E}{\omega_dL}e^{-\alpha t}\sin\omega_dt$, $\omega_d = \sqrt{\omega_0^2 - \alpha^2}$ |`,
        {
          type: 'plot',
          alt: 'Three current curves for a series RLC switched onto dc: the underdamped one rises, swings below zero and rings down; the critically damped one rises and falls back without crossing zero; the overdamped one rises lower and decays slowly.',
          caption: 'The current in a series RLC (L = 1 H, C = 1 F, 1 V) for three resistances: 0.4 Ω, 2 Ω and 5 Ω.',
          x: [0, 12],
          y: [-0.5, 0.9],
          xLabel: 't (s)',
          yLabel: 'i (A)',
          series: [
            { f: (t) => (Math.exp(-0.2 * t) * Math.sin(Math.sqrt(0.96) * t)) / Math.sqrt(0.96), label: 'underdamped' },
            { f: (t) => t * Math.exp(-t), label: 'critically damped' },
            { f: (t) => (Math.exp(-2.5 * t) * Math.sinh(Math.sqrt(5.25) * t)) / Math.sqrt(5.25), label: 'overdamped', dashed: true },
          ],
        },
        r`Critical damping is the fastest return to rest without overshoot, which is why meters and relays are designed close to it. In a **parallel** RLC the damping is $\alpha = \frac{1}{2RC}$, so there a larger resistance means less damping. With no resistance at all, an LC circuit rings forever at $\omega_0$.`,
      ],
      keyIdeas: [
        r`Roots $s = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$ with $\omega_0 = \frac{1}{\sqrt{LC}}$.`,
        r`Series $\alpha = \frac{R}{2L}$; parallel $\alpha = \frac{1}{2RC}$.`,
        r`Underdamped: $e^{-\alpha t}$ times oscillation at $\omega_d = \sqrt{\omega_0^2 - \alpha^2}$; critical at $R = 2\sqrt{L/C}$ (series).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Classifying a response',
          problem: r`A series RLC has R = 10 Ω, L = 0.1 H and C = 100 µF. Classify its response and find $\omega_d$.`,
          steps: [
            r`$\alpha = \frac{10}{2 \times 0.1} = 50$ s⁻¹ and $\omega_0 = \frac{1}{\sqrt{0.1 \times 10^{-4}}} = 316.2$ rad/s.`,
            r`$\alpha < \omega_0$: underdamped. $\omega_d = \sqrt{316.2^2 - 50^2} = 312.2$ rad/s.`,
          ],
          answer: r`Underdamped, ringing at 312.2 rad/s.`,
        },
        {
          level: 'board',
          title: 'Resistance for critical damping',
          problem: r`A 1 H coil of 150 Ω resistance is in series with a 10 µF capacitor across a dc supply. What resistance must be added for critical damping?`,
          steps: [
            r`Critical: $R = 2\sqrt{\frac{L}{C}} = 2\sqrt{\frac{1}{10^{-5}}} = 632.5$ Ω.`,
            r`The coil already has 150 Ω: add $632.5 - 150 = 482.5$ Ω.`,
          ],
          answer: r`482.5 Ω more.`,
        },
        {
          level: 'board',
          title: 'The transient current',
          problem: r`A series circuit of 1 H, 6 Ω and 0.04 F, uncharged, is switched onto 50 V dc at t = 0. Find the current.`,
          steps: [
            r`$\alpha = \frac{6}{2} = 3$ s⁻¹ and $\omega_0 = \frac{1}{\sqrt{0.04}} = 5$ rad/s: underdamped, with $\omega_d = \sqrt{25 - 9} = 4$ rad/s.`,
            r`$i(0) = 0$ and $\frac{di}{dt}(0) = \frac{E}{L} = 50$ A/s, so $i = \frac{E}{\omega_dL}e^{-\alpha t}\sin\omega_dt$.`,
            r`$i = \frac{50}{4 \times 1}e^{-3t}\sin4t = 12.5e^{-3t}\sin4t$ A.`,
          ],
          answer: r`$i = 12.5e^{-3t}\sin4t$ A.`,
        },
      ],
      traps: [
        r`In a parallel RLC a LARGER R means less damping.`,
        r`Use the coil's own resistance: it is part of R when checking the damping.`,
      ],
      check: [
        { q: r`A series RLC has R = 4 Ω and L = 1 H. What C makes it critically damped?`, a: r`$C = \frac{4L}{R^2} = \frac{4}{16} = 0.25$ F.` },
        { q: r`What is the transient in an LC circuit with no resistance?`, a: r`An undamped sinusoid at $\omega_0 = \frac{1}{\sqrt{LC}}$: with no resistance, nothing dies away.` },
      ],
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
      body: [
        r`With every source at one frequency, replace each sinusoid by its phasor and each element by its impedance, and the circuit becomes a dc-style circuit in complex numbers. Ohm's law $\mathbf{V} = \mathbf{I}Z$, KCL and KVL, the dividers, nodal and mesh analysis, Thévenin and Norton all carry over unchanged. The answer is a phasor; turn it back into a function of time if asked.`,
        r`Impedances in series add, and two in parallel combine as $\frac{Z_1Z_2}{Z_1 + Z_2}$, now in complex arithmetic: multiply and divide in polar form, add and subtract in rectangular form. A phasor diagram checks the work, since KVL and KCL must close as vector sums.`,
        {
          type: 'circuit',
          alt: 'A 120 V, 60 Hz source feeding an 8 ohm resistor in series with an inductor of j12 ohms and a capacitor of minus j6 ohms in parallel.',
          caption: 'A series resistor feeding an inductor and a capacitor in parallel.',
          parts: [
            ['Vac', [0, 2], [0, 0], ['120 V', '60 Hz']],
            ['R', [0, 0], [2, 0], '8 Ω'],
            ['wire', [2, 0], [5, 0]],
            ['L', [3.5, 0], [3.5, 2], 'j12 Ω'],
            ['C', [5, 0], [5, 2], '−j6 Ω'],
            ['wire', [5, 2], [0, 2]],
            ['dot', [3.5, 0]],
            ['dot', [3.5, 2]],
            ['i', [2, 0], [3, 0], 'I'],
          ],
        },
        r`When the sources run at **different frequencies**, no single set of phasors exists. Solve each frequency alone, with its own reactances (superposition), and add the results as functions of time, never as phasors. A dc source is the case $\omega = 0$: inductors are shorts and capacitors opens.`,
      ],
      keyIdeas: [
        r`$\mathbf{V} = \mathbf{I}Z$; impedances combine like resistances.`,
        r`Nodal, mesh, superposition, Thévenin all work with complex numbers.`,
        r`Superposition is the only way when sources have DIFFERENT frequencies.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Back to the time domain',
          problem: r`$100\angle0^\circ$ V RMS at 60 Hz drives 10 Ω in series with 50 mH (the load of Phasors and Impedance). Find the current as a function of time.`,
          steps: [
            r`$Z = 10 + j18.85 = 21.34\angle62.05^\circ$ Ω, so $\mathbf{I} = \frac{100\angle0^\circ}{21.34\angle62.05^\circ} = 4.686\angle-62.05^\circ$ A RMS.`,
            r`Peak: $4.686\sqrt2 = 6.63$ A. With $v = 141.4\cos377t$ V: $i = 6.63\cos(377t - 62.05^\circ)$ A.`,
          ],
          answer: r`$i = 6.63\cos(377t - 62.05^\circ)$ A: it lags the voltage by 62°.`,
        },
        {
          level: 'board',
          title: 'Series and parallel in complex numbers',
          problem: r`In the circuit above, find the source current and the current in each parallel branch.`,
          steps: [
            r`The parallel pair: $\frac{(j12)(-j6)}{j12 - j6} = \frac{72}{j6} = -j12$ Ω, capacitive.`,
            r`Total: $Z = 8 - j12 = 14.42\angle-56.31^\circ$ Ω, so $\mathbf{I} = \frac{120}{14.42\angle-56.31^\circ} = 8.321\angle56.31^\circ$ A, leading.`,
            r`Across the pair: $\mathbf{V}_p = 8.321\angle56.31^\circ \times 12\angle-90^\circ = 99.85\angle-33.69^\circ$ V.`,
            r`$\mathbf{I}_C = \frac{99.85\angle-33.69^\circ}{6\angle-90^\circ} = 16.64\angle56.31^\circ$ A and $\mathbf{I}_L = \frac{99.85\angle-33.69^\circ}{12\angle90^\circ} = 8.321\angle-123.69^\circ$ A.`,
            r`KCL: the two branch currents point opposite ways, and $16.64 - 8.321 = 8.321$ A, the source current.`,
          ],
          answer: r`$\mathbf{I} = 8.32\angle56.31^\circ$ A; $\mathbf{I}_C = 16.64\angle56.31^\circ$ A and $\mathbf{I}_L = 8.32\angle-123.69^\circ$ A.`,
        },
        {
          level: 'board',
          title: 'Two frequencies at once',
          problem: r`$v = 50 + 100\sin100t$ V is applied to 10 Ω in series with 0.1 H. Find the current and its RMS value.`,
          steps: [
            r`Dc part: the inductor is a short, so $I_0 = \frac{50}{10} = 5$ A.`,
            r`Ac part: $X_L = 100 \times 0.1 = 10$ Ω, so $Z = 10 + j10 = 14.14\angle45^\circ$ Ω and the peak current is $\frac{100}{14.14} = 7.071$ A, lagging 45°.`,
            r`Add in time: $i = 5 + 7.071\sin(100t - 45^\circ)$ A. RMS: $\sqrt{5^2 + \left(\frac{7.071}{\sqrt2}\right)^2} = \sqrt{25 + 25} = 7.071$ A.`,
          ],
          answer: r`$i = 5 + 7.071\sin(100t - 45^\circ)$ A, with an RMS value of 7.07 A.`,
        },
      ],
      traps: [
        r`Add impedances as complex numbers: 3 Ω + j4 Ω has magnitude 5 Ω, not 7.`,
        r`Branch currents in parallel L and C can each exceed the source current: they add as phasors, nearly cancelling.`,
      ],
      check: [
        { q: r`What is $6 + j8$ Ω in parallel with $6 - j8$ Ω?`, a: r`$\frac{(6 + j8)(6 - j8)}{12} = \frac{100}{12} = 8.33$ Ω, purely resistive.` },
        { q: r`Can a 60 Hz phasor be added to a 120 Hz phasor?`, a: r`No: add the two responses as functions of time.` },
      ],
    },
  ],
};
