// Library › Lessons › ESAS › Microprocessor Systems and Logic Circuits
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// microLesson.test.js, which also checks the timing diagrams bit by bit.
// Coverage and problem styles cross-checked against the number-system and
// logic pages of a review center's computer fundamentals handout; the text,
// problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order. The processor examples
// use the 8085 and 8086.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// A digital trace for a timing diagram: one bit per time unit, drawn as steps raised by `offset`.
export const trace = (bits, offset) => bits.flatMap((b, k) => [[k, offset + b], [k + 1, offset + b]]);
const UNITS = 16;
const range = Array.from({ length: UNITS }, (_, k) => k);

// Gate inputs and outputs over 8 time units.
export const GATE_A = [0, 0, 1, 1, 0, 0, 1, 1];
export const GATE_B = [0, 1, 0, 1, 0, 1, 0, 1];

// A clock high in the first half of each period (falling edges at odd times, rising at even).
export const CLOCK = range.map((k) => (k % 2 === 0 ? 1 : 0));
// A 3-bit ripple counter on that clock's falling edges.
export const counterBit = (i) => range.map((k) => (Math.floor((k + 1) / 2) >> i) & 1);
// A D flip-flop on the rising edges (even times after the first): D changes only on odd times, between edges.
export const D_IN = [0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0];
export const D_OUT = range.map((k) => {
  const edge = k - (k % 2); // the latest rising edge at or before k
  return edge === 0 ? 0 : D_IN[edge];
});

// Amdahl's speed-up with a fraction p sped up s times.
export const amdahl = (p) => (s) => 1 / (1 - p + p / s);

export default {
  topic: 'Microprocessor Systems and Logic Circuits',
  subject: 'ESAS',
  overview: r`Digital systems work on two levels, 0 and 1. From that come number codes, Boolean algebra to describe logic, gates to build it, flip-flops to remember it, and finally a microprocessor: an arithmetic unit, registers and a control unit that fetch and run instructions from memory. Board items are mostly conversions, simplifying a function (Boolean algebra or a Karnaugh map), counting (flip-flops, address lines, states), timing (clock, T-states, delays) and converter steps.`,
  sources: [
    'Digital Design (Mano and Ciletti)',
    'Digital Systems: Principles and Applications (Tocci, Widmer and Moss)',
    'Microprocessor Architecture, Programming and Applications with the 8085 (Gaonkar)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Number Systems and Codes',
      inShort: r`Binary, octal, decimal and hexadecimal, negative numbers, and codes like BCD and Gray.`,
      body: [
        r`A number's value is the sum of each digit times its position's weight, $N = \sum d_ib^i$: binary (base 2), octal (8), decimal (10), hexadecimal (16, digits 0–9 and A–F). Convert to decimal by adding the weighted digits; from decimal by dividing by the base repeatedly and reading the remainders upward (for a fraction, multiply by the base and read the integer parts downward). Between binary and octal or hex, group bits in threes or fours from the point. Four bits are a **nibble**, eight a **byte**.`,
        r`**Complements** turn subtraction into addition. The radix-minus-one complement subtracts each digit from $b - 1$ (the 9's complement in decimal, 7's in octal, 1's in binary: invert); the radix complement adds 1 to that (10's, 8's, 2's). In 8-bit two's complement, numbers run from −128 to 127.`,
        r`Codes store decimal digits in four bits each:

| Digit | 8421 BCD | 2421 | Excess-3 | Gray (of the binary) |
|---|---|---|---|---|
| 0 | 0000 | 0000 | 0011 | 0000 |
| 1 | 0001 | 0001 | 0100 | 0001 |
| 2 | 0010 | 0010 | 0101 | 0011 |
| 3 | 0011 | 0011 | 0110 | 0010 |
| 4 | 0100 | 0100 | 0111 | 0110 |
| 5 | 0101 | 1011 | 1000 | 0111 |
| 6 | 0110 | 1100 | 1001 | 0101 |
| 7 | 0111 | 1101 | 1010 | 0100 |
| 8 | 1000 | 1110 | 1011 | 1100 |
| 9 | 1001 | 1111 | 1100 | 1101 |`,
        r`Gray code changes one bit between neighbours, $g = b \oplus (b \gg 1)$, so a shaft encoder never reads a wild value mid-change. **Hamming** codes add $p$ parity bits, $2^p \ge m + p + 1$, to correct any single-bit error.`,
      ],
      keyIdeas: [
        r`$N = \sum d_ib^i$. Binary ↔ octal by groups of 3 bits, ↔ hex by groups of 4.`,
        r`Two's complement $-N = 2^n - N$ (invert and add 1); 8 bits hold −128 to 127. Radix-minus-one complement: each digit from $b - 1$.`,
        r`BCD codes each decimal digit in 4 bits; Excess-3 = BCD + 3; Gray $g = b \oplus (b \gg 1)$ changes one bit at a time.`,
        r`Hamming code: $2^p \ge m + p + 1$ parity bits correct a single error.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Four bases and a negative',
          problem: r`Write 156 in binary, octal and hex. What is −45 in 8-bit two's complement?`,
          steps: [
            r`$156 = 128 + 16 + 8 + 4 = 10011100_2 = 234_8 = 9C_{16}$.`,
            r`$45 = 00101101$; invert: 11010010; add 1: $11010011 = D3_{16}$ (= 256 − 45 = 211).`,
          ],
          answer: r`$10011100_2$, $234_8$, $9C_{16}$; $11010011$.`,
        },
        {
          level: 'board',
          title: 'Complements and base arithmetic',
          problem: r`Find the 9's complement of $633_{10}$, the 10's complement of $365_{10}$ and the 7's complement of $1234_8$. Add $3657_8 + 4126_8$ and $6A9_{16} + 3C8_{16}$. Convert $0.6875_{10}$ to binary.`,
          steps: [
            r`$999 - 633 = 366$; $1000 - 365 = 635$; $7777_8 - 1234_8 = 6543_8$.`,
            r`Octal, carrying at 8: $3657_8 + 4126_8 = 10005_8$. Hex, carrying at 16: $6A9_{16} + 3C8_{16} = A71_{16}$.`,
            r`$0.6875 \times 2 = 1.375$ (1), $0.375 \times 2 = 0.75$ (0), $\times 2 = 1.5$ (1), $0.5 \times 2 = 1$ (1): $0.1011_2$.`,
          ],
          answer: r`366, 635, $6543_8$; $10005_8$, $A71_{16}$; $0.1011_2$.`,
        },
      ],
      traps: [
        r`In BCD, 1010 to 1111 are not valid digits.`,
        r`For a fraction, MULTIPLY by the base and read the integer parts from the top down.`,
      ],
      check: [
        { q: r`How many nibbles are in a byte?`, a: r`Two.` },
        { q: r`What is the Gray code of binary 0010?`, a: r`0011.` },
      ],
    },
    {
      name: 'Boolean Algebra',
      inShort: r`The algebra of 0 and 1 that describes logic circuits.`,
      body: [
        r`Boolean algebra has two values and three operations: OR (logical addition, +), AND (logical multiplication, ·) and NOT (complement, a bar). Its laws let a circuit be simplified before it is built:

| Law | OR form | AND form |
|---|---|---|
| Identity | $A + 0 = A$ | $A \cdot 1 = A$ |
| Null | $A + 1 = 1$ | $A \cdot 0 = 0$ |
| Idempotent | $A + A = A$ | $A \cdot A = A$ |
| Complement | $A + \overline{A} = 1$ | $A\overline{A} = 0$ |
| Absorption | $A + AB = A$ | $A(A + B) = A$ |
| Redundancy | $A + \overline{A}B = A + B$ | $A(\overline{A} + B) = AB$ |
| Distributive | $A + BC = (A + B)(A + C)$ | $A(B + C) = AB + AC$ |
| De Morgan | $\overline{A + B} = \overline{A}\,\overline{B}$ | $\overline{AB} = \overline{A} + \overline{B}$ |`,
        r`Every function can be written as a **sum of minterms** (one product for each 1 in its truth table) or a **product of maxterms** (one sum for each 0). In switch terms, contacts in series act as AND, contacts in parallel as OR.`,
      ],
      keyIdeas: [
        r`$A + 0 = A$, $A \cdot 1 = A$, $A + A' = 1$, $AA' = 0$, $A + A = A$.`,
        r`De Morgan: $\overline{AB} = \overline{A} + \overline{B}$, $\overline{A + B} = \overline{A}\,\overline{B}$.`,
        r`$A + AB = A$, $A + \overline{A}B = A + B$, consensus $AB + \overline{A}C + BC = AB + \overline{A}C$.`,
        r`Canonical forms: sum of minterms, product of maxterms.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three terms to two',
          problem: r`Simplify $F = AB + A\overline{B} + \overline{A}B$.`,
          steps: [
            r`$AB + A\overline{B} = A(B + \overline{B}) = A$.`,
            r`Then $A + \overline{A}B = A + B$.`,
          ],
          answer: r`$F = A + B$.`,
        },
        {
          level: 'board',
          title: 'Distributing, and De Morgan',
          problem: r`Simplify $(A + B)(A + C)$. Find the complement of $A\overline{B} + C$.`,
          steps: [
            r`$(A + B)(A + C) = A + AC + AB + BC = A(1 + C + B) + BC = A + BC$.`,
            r`De Morgan: $\overline{A\overline{B} + C} = \overline{A\overline{B}}\cdot\overline{C} = (\overline{A} + B)\overline{C}$.`,
          ],
          answer: r`$A + BC$; $(\overline{A} + B)\overline{C}$.`,
        },
      ],
      traps: [
        r`Boolean $1 + 1 = 1$, not 2.`,
        r`De Morgan swaps the operation AND complements each variable: break the bar, change the sign.`,
      ],
      check: [
        { q: r`Which gate matches two switches in series?`, a: r`AND.` },
        { q: r`Which of logical addition, multiplication, subtraction and complementation is NOT a Boolean operation?`, a: r`Subtraction.` },
      ],
    },
    {
      name: 'Logic Gates',
      inShort: r`AND, OR, NOT, NAND, NOR, XOR, XNOR, and the electrical limits of real gates.`,
      body: [
        r`Each gate computes one function of its inputs: AND (1 only if all are 1), OR (1 if any is), NOT (inverts), NAND and NOR (AND and OR inverted), XOR (1 when the inputs differ) and XNOR (1 when they agree). NAND and NOR are **universal**: any circuit can be built from either alone. A timing diagram shows them working:`,
        {
          type: 'plot',
          alt: 'A timing diagram of five traces over eight time units, from top: input A, low for two units then high for two, repeating; input B, dashed, alternating every unit; A AND B, high only when both are; A OR B, high when either is; A XOR B, high when they differ.',
          caption: 'From the top: inputs A and B (dashed), then A·B, A + B and A ⊕ B.',
          x: [0, 8],
          y: [0, 10.5],
          xLabel: 'time',
          yLabel: 'signals',
          series: [
            { points: trace(GATE_A, 9), label: 'A', colour: colourOf(1) },
            { points: trace(GATE_B, 7), label: 'B', dashed: true, colour: colourOf(1) },
            { points: trace(GATE_A.map((a, k) => a & GATE_B[k]), 5), label: 'AND', colour: colourOf(0) },
            { points: trace(GATE_A.map((a, k) => a | GATE_B[k]), 3), label: 'OR', colour: colourOf(2) },
            { points: trace(GATE_A.map((a, k) => a ^ GATE_B[k]), 1), label: 'XOR', colour: colourOf(3) },
          ],
          legend: false,
        },
        r`Real gates read voltages, not ideal 0s and 1s. The **noise margins** say how much noise a signal can pick up and still read right, $NM_H = V_{OH} - V_{IH}$ and $NM_L = V_{IL} - V_{OL}$; the **fan-out** says how many inputs one output can drive. TTL runs on 5 V, fast but power-hungry; CMOS takes a wide supply range and draws almost no power when idle.`,
      ],
      keyIdeas: [
        r`NAND and NOR are universal. XOR is 1 when inputs differ: $A\oplus B = \overline{A}B + A\overline{B}$.`,
        r`Noise margins $NM_H = V_{OH} - V_{IH}$, $NM_L = V_{IL} - V_{OL}$.`,
        r`Fan-out $= \min\left(\frac{I_{OH}}{I_{IH}}, \frac{I_{OL}}{I_{IL}}\right)$; speed-power product $t_{pd} \times P_D$.`,
        r`Families: TTL (5 V, fast, power-hungry), CMOS (wide supply, tiny static power).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Standard TTL',
          problem: r`Standard TTL: $V_{OH} = 2.4$, $V_{IH} = 2.0$, $V_{IL} = 0.8$, $V_{OL} = 0.4$ V; $I_{OL} = 16$ mA, $I_{IL} = 1.6$ mA. Find the noise margins and low-state fan-out.`,
          steps: [
            r`$NM_H = 2.4 - 2.0 = 0.4$ V, $NM_L = 0.8 - 0.4 = 0.4$ V.`,
            r`Fan-out $= \frac{16}{1.6} = 10$.`,
          ],
          answer: r`0.4 V and 0.4 V; 10.`,
        },
        {
          level: 'board',
          title: 'CMOS margins and LS fan-out',
          problem: r`A CMOS gate at 5 V has $V_{OH} = 4.4$, $V_{IH} = 3.5$, $V_{IL} = 1.5$, $V_{OL} = 0.1$ V: find its noise margins. A low-power Schottky TTL gate has $I_{OL} = 8$ mA, $I_{IL} = 0.4$ mA, $I_{OH} = 0.4$ mA, $I_{IH} = 0.02$ mA: find its fan-out.`,
          steps: [
            r`$NM_H = 4.4 - 3.5 = 0.9$ V; $NM_L = 1.5 - 0.1 = 1.4$ V.`,
            r`Low: $\frac{8}{0.4} = 20$; high: $\frac{0.4}{0.02} = 20$; fan-out 20.`,
          ],
          answer: r`0.9 V and 1.4 V; 20.`,
        },
      ],
      traps: [
        r`Use the WORSE of the high and low fan-outs.`,
        r`XOR is 1 for DIFFERENT inputs; XNOR for equal ones.`,
      ],
      check: [
        { q: r`Which gates are universal?`, a: r`NAND and NOR.` },
        { q: r`When is the output of XOR 1?`, a: r`When its two inputs differ.` },
      ],
    },
    {
      name: 'Karnaugh Maps',
      inShort: r`A grid that makes Boolean simplification visual.`,
      body: [
        r`A **Karnaugh map** lays the truth table out so that neighbouring cells differ in one variable: rows and columns run in Gray-code order (00, 01, 11, 10), and the edges wrap round. A 4-variable map, with each cell's minterm number:

| AB \\ CD | 00 | 01 | 11 | 10 |
|---|---|---|---|---|
| 00 | 0 | 1 | 3 | 2 |
| 01 | 4 | 5 | 7 | 6 |
| 11 | 12 | 13 | 15 | 14 |
| 10 | 8 | 9 | 11 | 10 |`,
        r`Mark the 1s, then circle them in rectangles of 1, 2, 4 or 8 cells: a group of $2^k$ cells drops $k$ variables, keeping only those that don't change inside it. Make the groups as large and as few as possible; **don't-care** cells (X) may be used as 1s when they help and ignored when they don't.`,
      ],
      keyIdeas: [
        r`Cells in Gray-code order (00, 01, 11, 10); edges wrap around.`,
        r`Group 1s in rectangles of 1, 2, 4, 8: a group of $2^k$ drops $k$ variables.`,
        r`Groups as large and as few as possible; don't-cares (X) may be counted as 1s.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Corners and centre',
          problem: r`Simplify $F(A, B, C, D) = \sum m(0, 2, 5, 7, 8, 10, 13, 15)$.`,
          steps: [
            r`The four corners (0, 2, 8, 10) have $B = 0$, $D = 0$: $\overline{B}\,\overline{D}$.`,
            r`The centre quad (5, 7, 13, 15) has $B = 1$, $D = 1$: $BD$.`,
          ],
          answer: r`$F = \overline{B}\,\overline{D} + BD = B \odot D$.`,
        },
        {
          level: 'board',
          title: "With don't-cares",
          problem: r`Simplify $F(A, B, C, D) = \sum m(1, 3, 7, 11, 15) + d(0, 2)$.`,
          steps: [
            r`Cells 3, 7, 15, 11 form the CD = 11 column: $CD$.`,
            r`Cell 1 is left. With the don't-cares 0 and 2 it completes the top row (0, 1, 3, 2): $\overline{A}\,\overline{B}$.`,
            r`Without them it could only pair with 3, giving the longer $\overline{A}\,\overline{B}D$.`,
          ],
          answer: r`$F = CD + \overline{A}\,\overline{B}$.`,
        },
      ],
      traps: [
        r`The four corners of a 4-variable map are adjacent.`,
        r`A don't-care need not be covered: use it only if it makes a group bigger.`,
      ],
      check: [
        { q: r`How many variables does a group of 4 cells remove?`, a: r`Two.` },
        { q: r`In what order are a K-map's rows and columns labelled?`, a: r`Gray code: 00, 01, 11, 10.` },
      ],
    },
    {
      name: 'Adders, Multiplexers and Decoders',
      inShort: r`Combinational building blocks: circuits whose output depends only on present inputs.`,
      body: [
        r`A **full adder** adds two bits and a carry in: $S = A \oplus B \oplus C_{in}$, $C_{out} = AB + C_{in}(A \oplus B)$. Chain n of them and each waits for the carry from the one before, so a **ripple-carry adder** takes about $n\,t_{carry}$ (carry-lookahead adders compute the carries in parallel to save that time):`,
        {
          type: 'blocks',
          alt: 'A 4-bit ripple-carry adder: four full adders in a column, the carry from each feeding the next, and the last carry out at the bottom.',
          caption: 'A 4-bit ripple-carry adder: each full adder waits for the carry from the one above.',
          blocks: [
            { id: 'fa0', at: [0, 0], label: 'FA 0' },
            { id: 'fa1', at: [0, 1], label: 'FA 1' },
            { id: 'fa2', at: [0, 2], label: 'FA 2' },
            { id: 'fa3', at: [0, 3], label: 'FA 3' },
          ],
          links: [
            ['fa0', 'fa1', { label: 'carry' }],
            ['fa1', 'fa2', { label: 'carry' }],
            ['fa2', 'fa3', { label: 'carry' }],
            ['fa3', [0, 4], { label: 'out' }],
          ],
        },
        r`An adder also subtracts: add the two's complement of the subtrahend and drop the final carry. A **multiplexer** routes one of $2^n$ inputs to its output under n select lines; a **demultiplexer** does the reverse. A **decoder** turns an n-bit code into one of $2^n$ outputs (to select memory chips, say); an **encoder** goes the other way.`,
      ],
      keyIdeas: [
        r`Full adder $S = A \oplus B \oplus C_{in}$, $C_{out} = AB + C_{in}(A \oplus B)$; ripple delay $\approx n\,t_{carry}$.`,
        r`MUX: $2^n$ inputs, $n$ select lines. Decoder: $n$ inputs to $2^n$ outputs; encoder the reverse.`,
        r`Subtract with an adder: add the two's complement.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Ripple delay and a MUX',
          problem: r`A 4-bit ripple-carry adder uses full adders with 10 ns carry delay. How long does it take? How many select lines does a 16-to-1 MUX need?`,
          steps: [
            r`$4 \times 10 = 40$ ns.`,
            r`$\log_2 16 = 4$ select lines.`,
          ],
          answer: r`40 ns; 4.`,
        },
        {
          level: 'board',
          title: 'Subtracting by adding',
          problem: r`With 5-bit numbers A = 01001 and B = 00110, find the two's complement of B and use it to find A − B.`,
          steps: [
            r`Invert B: 11001; add 1: 11010.`,
            r`$01001 + 11010 = 1\,00011$; drop the carry: 00011.`,
            r`Check: $9 - 6 = 3$.`,
          ],
          answer: r`11010; 00011 (3).`,
        },
      ],
      traps: [
        r`A decoder with $n$ inputs has $2^n$ outputs, not $2n$.`,
        r`In two's-complement subtraction the final carry out is DROPPED, not added back.`,
      ],
      check: [
        { q: r`How many select lines does an 8-to-1 multiplexer need?`, a: r`Three.` },
        { q: r`Why is a ripple-carry adder slow?`, a: r`Each stage waits for the carry from the one before.` },
      ],
    },
    {
      name: 'Flip-Flops',
      inShort: r`One-bit memories that change state at a clock edge.`,
      body: [
        r`A **flip-flop** stores one bit and changes only at a clock edge; a **latch** follows its input whenever it is enabled. Four types differ in their inputs:

| Type | Next state | Note |
|---|---|---|
| SR | $Q^+ = S + \overline{R}Q$ | S = R = 1 is forbidden |
| JK | $Q^+ = J\overline{Q} + \overline{K}Q$ | J = K = 1 toggles |
| D | $Q^+ = D$ | copies D at the edge |
| T | $Q^+ = T \oplus Q$ | T = 1 toggles |`,
        r`A D flip-flop samples its input at each rising edge and holds it until the next, ignoring changes in between:`,
        {
          type: 'plot',
          alt: 'A timing diagram over sixteen time units: the clock on top, D in the middle, dashed, changing between clock edges, and Q at the bottom, which takes the value of D only at each rising clock edge and holds it until the next.',
          caption: 'A D flip-flop: from the top, the clock, D (dashed) and Q, which copies D only at rising edges.',
          x: [0, 16],
          y: [0, 6.5],
          xLabel: 'time',
          yLabel: 'signals',
          series: [
            { points: trace(CLOCK, 5), label: 'clock', colour: colourOf(1) },
            { points: trace(D_IN, 3), label: 'D', dashed: true, colour: colourOf(2) },
            { points: trace(D_OUT, 1), label: 'Q', colour: colourOf(0) },
          ],
          legend: false,
        },
        r`For it to work, D must be steady for a **setup time** before the edge and a **hold time** after; the fastest clock is $f_{max} = \frac{1}{t_{pd} + t_{comb} + t_{setup}}$.`,
      ],
      keyIdeas: [
        r`SR: $Q^+ = S + \overline{R}Q$ ($S = R = 1$ forbidden). JK: $Q^+ = J\overline{Q} + \overline{K}Q$ (toggles at $J = K = 1$).`,
        r`D: $Q^+ = D$. T: $Q^+ = T \oplus Q$.`,
        r`Setup and hold times; $f_{max} = \frac{1}{t_{pd} + t_{comb} + t_{setup}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A toggling JK and a timing path',
          problem: r`A JK flip-flop with $J = K = 1$ is clocked at 1 MHz: what is its output frequency? A path has $t_{pd} = 10$, $t_{comb} = 15$, $t_{setup} = 5$ ns: what is $f_{max}$?`,
          steps: [
            r`It toggles every edge: 500 kHz.`,
            r`$f_{max} = \frac{1}{30\ \text{ns}} = 33.3$ MHz.`,
          ],
          answer: r`500 kHz; 33.3 MHz.`,
        },
        {
          level: 'board',
          title: 'A watch divider',
          problem: r`A watch crystal runs at 32 768 Hz. How many toggling flip-flops in a chain bring it down to 1 Hz?`,
          steps: [
            r`Each one halves the frequency: $2^n = 32\,768$.`,
            r`$n = \log_2 32\,768 = 15$.`,
          ],
          answer: r`15.`,
        },
      ],
      traps: [
        r`A latch follows its input while enabled; a flip-flop changes only at the clock edge.`,
        r`SR with S = R = 1 is forbidden, but JK with J = K = 1 is useful: it toggles.`,
      ],
      check: [
        { q: r`What does a JK flip-flop do with J = K = 1?`, a: r`It toggles at each clock edge.` },
        { q: r`What does a D flip-flop store?`, a: r`The value of D at the clock edge.` },
      ],
    },
    {
      name: 'Counters and Registers',
      inShort: r`Chains of flip-flops that count pulses or hold and shift data.`,
      body: [
        r`Chain toggling flip-flops, each clocked by the one before, and they count in binary: a **ripple** (asynchronous) counter. Each stage runs at half the frequency of the one before:`,
        {
          type: 'plot',
          alt: 'A timing diagram over eight clock periods: the clock on top, then Q0 toggling at each falling clock edge, Q1 at each falling edge of Q0, and Q2 at each falling edge of Q1, together counting from 0 to 7 in binary and back to 0.',
          caption: 'A 3-bit ripple counter: from the top, the clock, then Q0, Q1 and Q2, counting 0 to 7 and back to 0.',
          x: [0, 16],
          y: [0, 8.5],
          xLabel: 'time',
          yLabel: 'signals',
          series: [
            { points: trace(CLOCK, 7), label: 'clock', colour: colourOf(1) },
            { points: trace(counterBit(0), 5), label: 'Q0', colour: colourOf(0) },
            { points: trace(counterBit(1), 3), label: 'Q1', colour: colourOf(2) },
            { points: trace(counterBit(2), 1), label: 'Q2', colour: colourOf(3) },
          ],
          legend: false,
        },
        r`n flip-flops count $2^n$ states; a mod-N counter needs $\lceil\log_2 N\rceil$ and resets early. Because each stage waits for the one before, a ripple counter is limited to $f_{max} = \frac{1}{n\,t_{pd}}$; a **synchronous** counter clocks every stage at once. **Shift registers** move data a bit per clock (serial or parallel in and out); a **ring** counter of n flip-flops has n states, a **Johnson** (twisted-ring) counter 2n.`,
      ],
      keyIdeas: [
        r`$n$ flip-flops: binary counter $2^n$ states, $f_{out} = \frac{f_{in}}{2^n}$; mod-N needs $\lceil\log_2 N\rceil$.`,
        r`Ripple (asynchronous): $f_{max} = \frac{1}{n\,t_{pd}}$; synchronous clocks every stage together.`,
        r`Shift registers (SISO, SIPO, PISO, PIPO); ring counter $n$ states, Johnson $2n$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Mod-10, and the last output',
          problem: r`How many flip-flops does a mod-10 counter need? A 4-bit binary counter runs on 1 MHz: what is its last output's frequency?`,
          steps: [
            r`$\lceil\log_2 10\rceil = 4$.`,
            r`$\frac{1\ \text{MHz}}{2^4} = 62.5$ kHz.`,
          ],
          answer: r`4; 62.5 kHz.`,
        },
        {
          level: 'board',
          title: 'A ripple limit and twisted rings',
          problem: r`A 4-bit ripple counter's flip-flops each delay 10 ns. What is its highest clock frequency? How many states do a 4-flip-flop ring counter and Johnson counter have?`,
          steps: [
            r`$f_{max} = \frac{1}{4 \times 10\ \text{ns}} = 25$ MHz.`,
            r`Ring: 4 states; Johnson: $2 \times 4 = 8$.`,
          ],
          answer: r`25 MHz; 4 and 8.`,
        },
      ],
      traps: [
        r`A mod-10 counter uses 4 flip-flops but only 10 of their 16 states.`,
        r`Ripple delays ADD along the chain; a synchronous counter's don't.`,
      ],
      check: [
        { q: r`How many states does a Johnson counter of n flip-flops have?`, a: r`2n.` },
        { q: r`A 3-bit counter is clocked at 8 kHz. What is its last output's frequency?`, a: r`1 kHz.` },
      ],
    },
    {
      name: 'Sequential Circuits',
      inShort: r`Circuits with memory: state machines designed from state diagrams.`,
      body: [
        r`A **state machine** remembers where it is in a sequence. Its outputs depend on its state alone (**Moore**) or on its state and the present input (**Mealy**, which usually needs fewer states). Design runs in fixed steps: draw the state diagram, write the state table, give each state a binary code, find each flip-flop's input from its excitation table, and simplify the logic.`,
        r`A Moore machine that outputs 1 after the overlapping sequence 101 needs four states:

| State | Means | Next if 0 | Next if 1 | Output |
|---|---|---|---|---|
| S0 | nothing yet | S0 | S1 | 0 |
| S1 | seen 1 | S2 | S1 | 0 |
| S2 | seen 10 | S0 | S3 | 0 |
| S3 | seen 101 | S2 | S1 | 1 |`,
        r`From S3 a 0 leads to S2 (the last 1 and the new 0 start "10" again) and a 1 to S1: that reuse is what "overlapping" means.`,
      ],
      keyIdeas: [
        r`$n$ flip-flops give up to $2^n$ states; $\lceil\log_2 S\rceil$ flip-flops for S states (one-hot uses S).`,
        r`Mealy: outputs depend on state and input; Moore: on state only.`,
        r`Design: state diagram → state table → assign codes → flip-flop input equations (excitation tables) → logic.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A 101 detector',
          problem: r`A Moore machine detects the sequence 101 (overlapping). How many states and flip-flops does it need? A Mealy version?`,
          steps: [
            r`Moore: states for "nothing", "1", "10", "101" = 4, so 2 flip-flops.`,
            r`Mealy: 3 states (the output comes with the last input), still 2 flip-flops.`,
          ],
          answer: r`4 states, 2 flip-flops; Mealy 3 states, 2 flip-flops.`,
        },
        {
          level: 'board',
          title: 'Twenty states',
          problem: r`A controller has 20 states. How many flip-flops does it need with binary state codes, and with one-hot codes?`,
          steps: [
            r`Binary: $\lceil\log_2 20\rceil = 5$ (16 < 20 ≤ 32).`,
            r`One-hot: one flip-flop per state, 20.`,
          ],
          answer: r`5; 20.`,
        },
      ],
      traps: [
        r`A Mealy output can glitch when the input changes between clocks.`,
        r`Overlapping detection reuses the end of one match as the start of the next.`,
      ],
      check: [
        { q: r`In which machine do outputs depend only on the state?`, a: r`Moore.` },
        { q: r`How many flip-flops hold 9 states in binary?`, a: r`Four.` },
      ],
    },
    {
      name: 'Memory',
      inShort: r`ROM, RAM and how memory chips are sized and connected.`,
      body: [
        r`A $2^n \times m$ memory has n address lines and m data lines. **ROM** and its programmable kin (PROM, EPROM erased by UV light, EEPROM and flash erased electrically) keep their data without power; **RAM** doesn't: **SRAM** stores each bit in a flip-flop (fast, used for cache), **DRAM** in a capacitor that must be refreshed (dense, used for main memory). 1 K = 1024 locations, so 8 K = 2000H.`,
        r`Larger memories are built from chips: put chips side by side to widen the word, and in banks to add locations, with a decoder on the upper address lines picking the bank. Four 8K × 8 chips from 0000H:

| Chip | Upper address bits | Range |
|---|---|---|
| 1 | 00 | 0000H–1FFFH |
| 2 | 01 | 2000H–3FFFH |
| 3 | 10 | 4000H–5FFFH |
| 4 | 11 | 6000H–7FFFH |`,
      ],
      keyIdeas: [
        r`A $2^n \times m$ memory has $n$ address and $m$ data lines.`,
        r`ROM, PROM, EPROM, EEPROM, flash keep data without power; SRAM (fast, flip-flops) and DRAM (dense, refreshed) don't.`,
        r`Chips needed = total ÷ chip size; a decoder on the upper address lines selects each chip.`,
      ],
      examples: [
        {
          level: 'basic',
          title: '32K from 8K chips',
          problem: r`A 32K × 8 memory is built from 8K × 8 chips starting at 0000H. How many chips and address lines are there, and what range does the third chip cover?`,
          steps: [
            r`$\frac{32K}{8K} = 4$ chips.`,
            r`$\log_2 32K = 15$ address lines (13 on each chip, 2 to a decoder).`,
            r`Chip 3: 4000H–5FFFH.`,
          ],
          answer: r`4 chips; 15 lines; 4000H–5FFFH.`,
        },
        {
          level: 'board',
          title: 'Wider and deeper',
          problem: r`A 64K × 8 memory is built from 16K × 4 chips starting at 0000H. How many chips are needed, how are the address lines split, and what range does the third bank cover?`,
          steps: [
            r`Two chips side by side make 8 bits; $\frac{64K}{16K} = 4$ banks: $4 \times 2 = 8$ chips.`,
            r`16 address lines: 14 on each chip, 2 to the bank decoder.`,
            r`Each bank is 16K = 4000H: bank 3 is 8000H–BFFFH.`,
          ],
          answer: r`8 chips; 14 + 2 lines; 8000H–BFFFH.`,
        },
      ],
      traps: [
        r`1K = 1024, so 8K = 2000H locations.`,
        r`Widening the word adds chips side by side but no address lines.`,
      ],
      check: [
        { q: r`Which RAM must be refreshed?`, a: r`DRAM.` },
        { q: r`How many address lines does a 4K memory need?`, a: r`12.` },
      ],
    },
    {
      name: 'Microprocessor Architecture',
      inShort: r`Inside a processor: ALU, registers, control unit, buses.`,
      body: [
        r`A microprocessor is a CPU on one chip: an **arithmetic logic unit** (ALU), **registers** for working data, a **control unit** that runs the fetch–decode–execute cycle, and often **cache**. It talks to memory and I/O over three buses: the **address bus** (out only, choosing the location), the **data bus** (both ways, the busiest) and the **control bus** (read, write, interrupt signals). The 8085 has an 8-bit data bus and 16 address lines (64 KB); the 8086 a 16-bit bus and 20 lines (1 MB), forming the physical address as segment × 16 + offset.`,
        r`Execution time is instructions × cycles per instruction ÷ clock rate. Speeding up part of a job helps only that part: by **Amdahl's law** the whole job speeds up $\frac{1}{(1 - p) + p/s}$, which can never exceed $\frac{1}{1 - p}$ however fast the part becomes:`,
        {
          type: 'plot',
          alt: 'Overall speed-up against the speed-up of part of a job, on a log scale from 1 to 100, for parts making up 50, 80 and 95 percent of the job: each curve rises and levels off, at 2, 5 and 20 times.',
          caption: 'Amdahl’s law: speeding up 50%, 80% or 95% of a job (bottom to top) can’t beat 2, 5 or 20 times overall.',
          x: [1, 100],
          logX: true,
          y: [0, 22],
          xLabel: 'speed-up of the part',
          yLabel: 'overall speed-up',
          series: [0.5, 0.8, 0.95].map((p, i) => ({ f: amdahl(p), label: `${p * 100}%`, colour: colourOf(i) })),
          legend: false,
        },
        r`**Von Neumann** machines keep code and data in one memory; **Harvard** machines (most microcontrollers) keep them apart so both can be fetched at once.`,
      ],
      keyIdeas: [
        r`Fetch, decode, execute. Address bus (one way), data bus (both ways), control bus.`,
        r`8085: 8-bit data, 16 address lines (64 KB). 8086: 16-bit, 20 lines (1 MB), physical address = segment × 16 + offset.`,
        r`$T = \frac{N \cdot CPI}{f}$; Amdahl $S = \frac{1}{(1 - p) + p/s}$. Von Neumann shares one memory; Harvard separates code and data.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A physical address and a run time',
          problem: r`What physical address does the 8086 form from 1234H:0010H? How long does a 2-billion-instruction program take at CPI 1.5 and 3 GHz?`,
          steps: [
            r`$12340\text{H} + 0010\text{H} = 12350\text{H}$.`,
            r`$T = \frac{2 \times 10^9 \times 1.5}{3 \times 10^9} = 1$ s.`,
          ],
          answer: r`12350H; 1 s.`,
        },
        {
          level: 'board',
          title: 'Four cores, and another address',
          problem: r`80% of a program runs in parallel on 4 cores. What is the overall speed-up, and the most it could ever reach? What physical address is 2000H:3456H?`,
          steps: [
            r`$S = \frac{1}{0.2 + 0.8/4} = \frac{1}{0.4} = 2.5$; the limit is $\frac{1}{0.2} = 5$.`,
            r`$20000\text{H} + 3456\text{H} = 23456\text{H}$.`,
          ],
          answer: r`2.5 (at most 5); 23456H.`,
        },
      ],
      traps: [
        r`Shift the segment left one HEX digit (× 16), not one decimal digit.`,
        r`The data bus is two-way; the address bus is one-way.`,
      ],
      check: [
        { q: r`Which bus carries the actual data and is the busiest?`, a: r`The data bus.` },
        { q: r`How much memory can 20 address lines reach?`, a: r`1 MB.` },
      ],
    },
    {
      name: 'Instruction Sets and Assembly',
      inShort: r`The processor's instructions, how they find their data, and how long they take.`,
      body: [
        r`A processor's instructions fall into groups: **data transfer** (MOV, MVI, LDA, STA), **arithmetic** (ADD, SUB, INR, DCR), **logical** (ANA, ORA, XRA, CMP), **branch** (JMP, JNZ, CALL, RET) and **machine control** (HLT, NOP, EI, DI). They find their operands by **addressing modes**:

| Mode | 8085 example | Operand is |
|---|---|---|
| Immediate | MVI A, 32H | in the instruction |
| Direct | LDA 2050H | at the address given |
| Register | MOV A, B | in a register |
| Register indirect | MOV A, M | at the address in HL |
| Implied | CMA | in the accumulator, by definition |`,
        r`Each instruction takes a set number of clock periods (**T-states**); time is T-states ÷ clock frequency. A **delay loop** counts down a register; its time is the sum of every instruction it runs, remembering that the last conditional jump falls through and takes fewer T-states.`,
      ],
      keyIdeas: [
        r`Groups: data transfer, arithmetic, logical, branch, machine control.`,
        r`Addressing modes: immediate (MVI A, 32H), direct (LDA 2050H), register (MOV A, B), register indirect (MOV A, M), indexed.`,
        r`Time = T-states ÷ clock frequency; a delay loop sums the T-states of every instruction it runs.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A delay loop',
          problem: r`8085 at 3 MHz: MVI C, FFH (7T); LOOP: DCR C (4T); JNZ LOOP (10T taken, 7T not). How long is the delay?`,
          steps: [
            r`$7 + 255 \times 4 + 254 \times 10 + 7 = 3574$ T-states.`,
            r`$\frac{3574}{3 \times 10^6} = 1.19$ ms.`,
          ],
          answer: r`1.19 ms.`,
        },
        {
          level: 'board',
          title: 'Choosing the count',
          problem: r`The same loop with count C takes $7 + 4C + 10(C - 1) + 7 = 14C + 4$ T-states. What count gives exactly 1 ms at 3 MHz?`,
          steps: [
            r`1 ms at 3 MHz is 3000 T-states.`,
            r`$14C + 4 = 3000$, so $C = 214 = D6\text{H}$.`,
          ],
          answer: r`C = 214 (D6H).`,
        },
      ],
      traps: [
        r`The last pass of JNZ isn't taken: count it at 7 T, not 10.`,
        r`MVI loads an immediate value; MOV copies between registers.`,
      ],
      check: [
        { q: r`What addressing mode is MOV A, M?`, a: r`Register indirect (through HL).` },
        { q: r`How long is a T-state at 2 MHz?`, a: r`0.5 µs.` },
      ],
    },
    {
      name: 'Interfacing and I/O',
      inShort: r`Connecting the processor to the outside world.`,
      body: [
        r`I/O devices sit either in the memory space (**memory-mapped**, reached by ordinary memory instructions) or in their own port space (**I/O-mapped**, reached by IN and OUT). Programmable chips such as the 8255 provide parallel ports; a UART sends serial data, framing each character with start, parity and stop bits.`,
        r`Converters bridge analogue and digital. An n-bit DAC's output climbs in $2^n$ steps of $\frac{V_{ref}}{2^n}$; a 3-bit DAC on 8 V, step by step:`,
        {
          type: 'plot',
          alt: 'The output of a 3-bit DAC with an 8 volt reference against its input code from 0 to 7: a staircase rising one volt per code, from 0 to 7 volts, below the dashed straight line it approximates.',
          caption: 'A 3-bit DAC on 8 V: a staircase of 1 V steps from 0 to 7 V, approximating the dashed line.',
          x: [0, 8],
          y: [0, 8.5],
          xLabel: 'input code',
          yLabel: 'output (V)',
          series: [
            { points: trace([0, 1, 2, 3, 4, 5, 6, 7], 0), label: 'DAC', area: true },
            { f: (d) => d, label: 'ideal', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`An ADC does the reverse, giving the code $\left\lfloor\frac{V_{in}}{V_{ref}}2^n\right\rfloor$, with a resolution of one step.`,
      ],
      keyIdeas: [
        r`Memory-mapped I/O uses memory addresses; I/O-mapped (isolated) uses IN/OUT and its own port space.`,
        r`ADC/DAC step $\frac{V_{ref}}{2^n}$; DAC $V_{out} = V_{ref}\frac{D}{2^n}$.`,
        r`Serial (UART): characters/s = baud ÷ (start + data + parity + stop bits). Parallel ports: 8255 PPI.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An ADC and a serial line',
          problem: r`A 10-bit ADC has a 5 V reference. What is its step, and what code does 2.5 V give? How many characters a second does 9600 baud 8N1 carry?`,
          steps: [
            r`$\frac{5}{1024} = 4.88$ mV; $\left\lfloor\frac{2.5}{5} \times 1024\right\rfloor = 512$.`,
            r`8N1 is 10 bits a character: $\frac{9600}{10} = 960$ characters a second.`,
          ],
          answer: r`4.88 mV, 512; 960.`,
        },
        {
          level: 'board',
          title: 'A DAC and a parity frame',
          problem: r`An 8-bit DAC has a 10 V reference. What is its step, and what does code B4H give? How many characters a second does 4800 baud carry with 7 data bits, even parity and 1 stop bit?`,
          steps: [
            r`Step $\frac{10}{256} = 39.06$ mV; $B4\text{H} = 180$: $10 \times \frac{180}{256} = 7.03$ V.`,
            r`$1 + 7 + 1 + 1 = 10$ bits: $\frac{4800}{10} = 480$ characters a second.`,
          ],
          answer: r`39.06 mV, 7.03 V; 480.`,
        },
      ],
      traps: [
        r`8N1 is 10 bits a character: the start and stop bits count.`,
        r`The full-scale output is one step BELOW the reference: $\frac{2^n - 1}{2^n}V_{ref}$.`,
      ],
      check: [
        { q: r`What instructions reach I/O-mapped devices?`, a: r`IN and OUT.` },
        { q: r`How many steps does an 8-bit converter have?`, a: r`256.` },
      ],
    },
    {
      name: 'Interrupts',
      inShort: r`Letting devices stop the processor to get service, instead of being polled.`,
      body: [
        r`Rather than **polling** every device in turn, the processor lets a device **interrupt** it: it finishes the current instruction, saves its place, runs the device's service routine, and returns. Interrupts can be **maskable** (disabled by software) or **non-maskable**, and **vectored** (a fixed address) or not. The 8085's, from highest priority:

| Interrupt | Maskable? | Vector |
|---|---|---|
| TRAP | no | 0024H |
| RST 7.5 | yes | 003CH |
| RST 6.5 | yes | 0034H |
| RST 5.5 | yes | 002CH |
| INTR | yes | supplied by the device (an RST n jumps to 8n) |`,
        r`The 8086 keeps a table of 256 four-byte vectors at the bottom of memory: the vector for type n is at address $4n$. Every service routine saves and restores the registers it uses and ends with a return.`,
      ],
      keyIdeas: [
        r`Maskable (can be disabled) vs non-maskable; vectored (fixed address) vs non-vectored.`,
        r`8085: TRAP (024H, non-maskable, highest), RST 7.5 (03CH), 6.5 (034H), 5.5 (02CH), INTR. RST n jumps to $8n$.`,
        r`8086: the vector for type $n$ is at $4n$ in the interrupt table. The service routine saves and restores registers and ends with a return.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two vectors',
          problem: r`Where does the 8085 go for RST 7.5? Where is the 8086's vector for interrupt type 21H?`,
          steps: [
            r`$7.5 \times 8 = 60 = 003\text{CH}$.`,
            r`$4 \times 21\text{H} = 4 \times 33 = 132 = 84\text{H}$.`,
          ],
          answer: r`003CH; 0084H.`,
        },
        {
          level: 'board',
          title: 'Three more',
          problem: r`Find the 8085's RST 5.5 address, and where the 8086 keeps the vectors for type 08H and for the NMI (type 2).`,
          steps: [
            r`$5.5 \times 8 = 44 = 002\text{CH}$.`,
            r`Type 08H: $4 \times 8 = 32 = 20\text{H}$. NMI: $4 \times 2 = 8 = 08\text{H}$.`,
          ],
          answer: r`002CH; 0020H; 0008H.`,
        },
      ],
      traps: [
        r`Polling wastes time checking devices; interrupts let the processor work until a device needs it.`,
        r`TRAP can't be masked: it is for emergencies such as power failure.`,
      ],
      check: [
        { q: r`Which 8085 interrupt has the highest priority?`, a: r`TRAP.` },
        { q: r`Where is the 8086's vector for type n?`, a: r`At address 4n.` },
      ],
    },
    {
      name: 'Microcontrollers',
      inShort: r`A processor with memory, timers and I/O on one chip, for control jobs.`,
      body: [
        r`A **microcontroller** (8051, PIC, AVR, ARM Cortex-M) puts a processor, program and data memory, timers, I/O ports, serial ports and often ADCs on one chip, for embedded control. Its **timers** count clock pulses: an n-bit timer overflows after $2^n - N_0$ counts from a preload $N_0$, so the preload sets the period. A **watchdog** timer resets the chip if the program hangs.`,
        r`Lacking a true analogue output, a microcontroller drives motors, lamps and heaters with **pulse-width modulation**: a fast square wave whose duty cycle $D = \frac{t_{on}}{T}$ sets the average voltage $DV_{cc}$:`,
        {
          type: 'plot',
          alt: 'A pulse-width-modulated 12 volt waveform over four periods, high for the first quarter of each period and low for the rest; its average, a dashed line, is 3 volts.',
          caption: '25% PWM on 12 V: high a quarter of each period, averaging 3 V (dashed).',
          x: [0, 16],
          y: [0, 13],
          xLabel: 'time',
          yLabel: 'V',
          series: [
            { points: trace(Array.from({ length: 16 }, (_, k) => (k % 4 === 0 ? 12 : 0)), 0), label: 'PWM', area: true },
            { f: () => 0.25 * 12, label: 'average', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`A microprocessor needs outside memory and I/O; a microcontroller (8051, PIC, AVR) has them on chip.`,
        r`Timer overflow $t = \frac{(2^n - N_0)k}{f}$; load $N_0$ to set the period.`,
        r`PWM: duty $D = \frac{t_{on}}{T}$, average $DV_{cc}$; also ADCs, UARTs and watchdog timers.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A timer and PWM',
          problem: r`A 16-bit timer runs from 1 MHz through a prescaler of 8. How long until it overflows from 0? What preload gives 10 ms? What does 25% PWM on 12 V average?`,
          steps: [
            r`$\frac{65\,536 \times 8}{10^6} = 0.524$ s.`,
            r`$N_0 = 65\,536 - \frac{0.01 \times 10^6}{8} = 64\,286$.`,
            r`$0.25 \times 12 = 3$ V.`,
          ],
          answer: r`0.524 s; 64 286; 3 V.`,
        },
        {
          level: 'board',
          title: 'An 8051 delay',
          problem: r`An 8051 with a 12 MHz crystal counts machine cycles at 1 MHz. What 16-bit timer preload gives a 50 ms delay?`,
          steps: [
            r`50 ms at 1 MHz is 50 000 counts.`,
            r`$65\,536 - 50\,000 = 15\,536 = 3\text{CB}0\text{H}$.`,
          ],
          answer: r`15 536 (3CB0H).`,
        },
      ],
      traps: [
        r`A timer counts UP to overflow: preload with $2^n$ minus the counts you want.`,
        r`The 8051's timers count at the crystal frequency ÷ 12, not the crystal itself.`,
      ],
      check: [
        { q: r`What resets a microcontroller if its program hangs?`, a: r`A watchdog timer.` },
        { q: r`What average does 40% PWM on 5 V give?`, a: r`2 V.` },
      ],
    },
  ],
};
