// Library › Lessons › ESAS › Microprocessor Systems and Logic Circuits
// (2026-11-18): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order; every worked example checked by computation or
// simulation. The processor examples use the 8085 and 8086.
const r = String.raw;

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
      keyIdeas: [
        r`$N = \sum d_ib^i$. Binary ↔ octal by groups of 3 bits, ↔ hex by groups of 4.`,
        r`Two's complement $-N = 2^n - N$ (invert and add 1); 8 bits hold −128 to 127.`,
        r`BCD codes each decimal digit in 4 bits; Excess-3 = BCD + 3; Gray $g = b \oplus (b \gg 1)$ changes one bit at a time.`,
        r`Hamming code: $2^p \ge m + p + 1$ parity bits correct a single error.`,
      ],
      example: {
        problem: r`Write 156 in binary, octal and hex. What is −45 in 8-bit two's complement?`,
        solution: r`$156 = 10011100_2 = 234_8 = 9C_{16}$. $45 = 00101101$; invert: 11010010; add 1: $11010011 = D3_{16}$ (= 256 − 45 = 211).`,
      },
      traps: [r`In BCD, 1010 to 1111 are not valid digits.`],
    },
    {
      name: 'Boolean Algebra',
      inShort: r`The algebra of 0 and 1 that describes logic circuits.`,
      keyIdeas: [
        r`$A + 0 = A$, $A \cdot 1 = A$, $A + A' = 1$, $AA' = 0$, $A + A = A$.`,
        r`De Morgan: $\overline{AB} = \overline{A} + \overline{B}$, $\overline{A + B} = \overline{A}\,\overline{B}$.`,
        r`$A + AB = A$, $A + \overline{A}B = A + B$, consensus $AB + \overline{A}C + BC = AB + \overline{A}C$.`,
        r`Canonical forms: sum of minterms, product of maxterms.`,
      ],
      example: {
        problem: r`Simplify $F = AB + A\overline{B} + \overline{A}B$.`,
        solution: r`$AB + A\overline{B} = A(B + \overline{B}) = A$; then $A + \overline{A}B = A + B$. So $F = A + B$.`,
      },
      traps: [r`Boolean $1 + 1 = 1$, not 2.`],
    },
    {
      name: 'Logic Gates',
      inShort: r`AND, OR, NOT, NAND, NOR, XOR, XNOR, and the electrical limits of real gates.`,
      keyIdeas: [
        r`NAND and NOR are universal. XOR is 1 when inputs differ: $A\oplus B = \overline{A}B + A\overline{B}$.`,
        r`Noise margins $NM_H = V_{OH} - V_{IH}$, $NM_L = V_{IL} - V_{OL}$.`,
        r`Fan-out $= \min\left(\frac{I_{OH}}{I_{IH}}, \frac{I_{OL}}{I_{IL}}\right)$; speed-power product $t_{pd} \times P_D$.`,
        r`Families: TTL (5 V, fast, power-hungry), CMOS (wide supply, tiny static power).`,
      ],
      example: {
        problem: r`Standard TTL: $V_{OH} = 2.4$, $V_{IH} = 2.0$, $V_{IL} = 0.8$, $V_{OL} = 0.4$ V; $I_{OL} = 16$ mA, $I_{IL} = 1.6$ mA. Find the noise margins and low-state fan-out.`,
        solution: r`$NM_H = 2.4 - 2.0 = 0.4$ V, $NM_L = 0.8 - 0.4 = 0.4$ V. Fan-out $= \frac{16}{1.6} = 10$.`,
      },
      traps: [r`Use the WORSE of the high and low fan-outs.`],
    },
    {
      name: 'Karnaugh Maps',
      inShort: r`A grid that makes Boolean simplification visual.`,
      keyIdeas: [
        r`Cells in Gray-code order (00, 01, 11, 10); edges wrap around.`,
        r`Group 1s in rectangles of 1, 2, 4, 8: a group of $2^k$ drops $k$ variables.`,
        r`Groups as large and as few as possible; don't-cares (X) may be counted as 1s.`,
      ],
      example: {
        problem: r`Simplify $F(A, B, C, D) = \sum m(0, 2, 5, 7, 8, 10, 13, 15)$.`,
        solution: r`The four corners (0, 2, 8, 10) have $B = 0$, $D = 0$: $\overline{B}\,\overline{D}$. The centre quad (5, 7, 13, 15) has $B = 1$, $D = 1$: $BD$. So $F = \overline{B}\,\overline{D} + BD = B \odot D$.`,
      },
      traps: [r`The four corners of a 4-variable map are adjacent.`],
    },
    {
      name: 'Adders, Multiplexers and Decoders',
      inShort: r`Combinational building blocks: circuits whose output depends only on present inputs.`,
      keyIdeas: [
        r`Full adder $S = A \oplus B \oplus C_{in}$, $C_{out} = AB + C_{in}(A \oplus B)$; ripple delay $\approx n\,t_{carry}$.`,
        r`MUX: $2^n$ inputs, $n$ select lines. Decoder: $n$ inputs to $2^n$ outputs; encoder the reverse.`,
        r`Subtract with an adder: add the two's complement.`,
      ],
      example: {
        problem: r`A 4-bit ripple-carry adder uses full adders with 10 ns carry delay. How long does it take? How many select lines does a 16-to-1 MUX need?`,
        solution: r`$4 \times 10 = 40$ ns. $\log_2 16 = 4$ select lines.`,
      },
      traps: [r`A decoder with $n$ inputs has $2^n$ outputs, not $2n$.`],
    },
    {
      name: 'Flip-Flops',
      inShort: r`One-bit memories that change state at a clock edge.`,
      keyIdeas: [
        r`SR: $Q^+ = S + \overline{R}Q$ ($S = R = 1$ forbidden). JK: $Q^+ = J\overline{Q} + \overline{K}Q$ (toggles at $J = K = 1$).`,
        r`D: $Q^+ = D$. T: $Q^+ = T \oplus Q$.`,
        r`Setup and hold times; $f_{max} = \frac{1}{t_{pd} + t_{comb} + t_{setup}}$.`,
      ],
      example: {
        problem: r`A JK flip-flop with $J = K = 1$ is clocked at 1 MHz: what is its output frequency? A path has $t_{pd} = 10$, $t_{comb} = 15$, $t_{setup} = 5$ ns: what is $f_{max}$?`,
        solution: r`It toggles every edge: 500 kHz. $f_{max} = \frac{1}{30\ \text{ns}} = 33.3$ MHz.`,
      },
      traps: [r`A latch follows its input while enabled; a flip-flop changes only at the clock edge.`],
    },
    {
      name: 'Counters and Registers',
      inShort: r`Chains of flip-flops that count pulses or hold and shift data.`,
      keyIdeas: [
        r`$n$ flip-flops: binary counter $2^n$ states, $f_{out} = \frac{f_{in}}{2^n}$; mod-N needs $\lceil\log_2 N\rceil$.`,
        r`Ripple (asynchronous): $f_{max} = \frac{1}{n\,t_{pd}}$; synchronous clocks every stage together.`,
        r`Shift registers (SISO, SIPO, PISO, PIPO); ring counter $n$ states, Johnson $2n$.`,
      ],
      example: {
        problem: r`How many flip-flops does a mod-10 counter need? A 4-bit binary counter runs on 1 MHz: what is its last output's frequency?`,
        solution: r`$\lceil\log_2 10\rceil = 4$. $\frac{1\ \text{MHz}}{2^4} = 62.5$ kHz.`,
      },
      traps: [r`A mod-10 counter uses 4 flip-flops but only 10 of their 16 states.`],
    },
    {
      name: 'Sequential Circuits',
      inShort: r`Circuits with memory: state machines designed from state diagrams.`,
      keyIdeas: [
        r`$n$ flip-flops give up to $2^n$ states.`,
        r`Mealy: outputs depend on state and input; Moore: on state only.`,
        r`Design: state diagram → state table → assign codes → flip-flop input equations (excitation tables) → logic.`,
      ],
      example: {
        problem: r`A Moore machine detects the sequence 101 (overlapping). How many states and flip-flops does it need? A Mealy version?`,
        solution: r`Moore: states for "nothing", "1", "10", "101" = 4, so 2 flip-flops. Mealy: 3 states (the output comes with the last input), still 2 flip-flops.`,
      },
      traps: [r`A Mealy output can glitch when the input changes between clocks.`],
    },
    {
      name: 'Memory',
      inShort: r`ROM, RAM and how memory chips are sized and connected.`,
      keyIdeas: [
        r`A $2^n \times m$ memory has $n$ address and $m$ data lines.`,
        r`ROM, PROM, EPROM, EEPROM, flash keep data without power; SRAM (fast, flip-flops) and DRAM (dense, refreshed) don't.`,
        r`Chips needed = total ÷ chip size; a decoder on the upper address lines selects each chip.`,
      ],
      example: {
        problem: r`A 32K × 8 memory is built from 8K × 8 chips starting at 0000H. How many chips and address lines are there, and what range does the third chip cover?`,
        solution: r`$\frac{32K}{8K} = 4$ chips; $\log_2 32K = 15$ address lines (13 on each chip, 2 to a decoder). Chip 3: 4000H–5FFFH.`,
      },
      traps: [r`1K = 1024, so 8K = 2000H locations.`],
    },
    {
      name: 'Microprocessor Architecture',
      inShort: r`Inside a processor: ALU, registers, control unit, buses.`,
      keyIdeas: [
        r`Fetch, decode, execute. Address bus (one way), data bus (both ways), control bus.`,
        r`8085: 8-bit data, 16 address lines (64 KB). 8086: 16-bit, 20 lines (1 MB), physical address = segment × 16 + offset.`,
        r`$T = \frac{N \cdot CPI}{f}$; Amdahl $S = \frac{1}{(1 - p) + p/s}$. Von Neumann shares one memory; Harvard separates code and data.`,
      ],
      example: {
        problem: r`What physical address does the 8086 form from 1234H:0010H? How long does a 2-billion-instruction program take at CPI 1.5 and 3 GHz?`,
        solution: r`$12340\text{H} + 0010\text{H} = 12350\text{H}$. $T = \frac{2 \times 10^9 \times 1.5}{3 \times 10^9} = 1$ s.`,
      },
      traps: [r`Shift the segment left one HEX digit (× 16), not one decimal digit.`],
    },
    {
      name: 'Instruction Sets and Assembly',
      inShort: r`The processor's instructions, how they find their data, and how long they take.`,
      keyIdeas: [
        r`Groups: data transfer, arithmetic, logical, branch, machine control.`,
        r`Addressing modes: immediate (MVI A, 32H), direct (LDA 2050H), register (MOV A, B), register indirect (MOV A, M), indexed.`,
        r`Time = T-states ÷ clock frequency; a delay loop sums the T-states of every instruction it runs.`,
      ],
      example: {
        problem: r`8085 at 3 MHz: MVI C, FFH (7T); LOOP: DCR C (4T); JNZ LOOP (10T taken, 7T not). How long is the delay?`,
        solution: r`$7 + 255(4) + 254(10) + 7 = 3574$ T-states; $\frac{3574}{3 \times 10^6} = 1.19$ ms.`,
      },
      traps: [r`The last pass of JNZ isn't taken: count it at 7 T, not 10.`],
    },
    {
      name: 'Interfacing and I/O',
      inShort: r`Connecting the processor to the outside world.`,
      keyIdeas: [
        r`Memory-mapped I/O uses memory addresses; I/O-mapped (isolated) uses IN/OUT and its own port space.`,
        r`ADC/DAC step $\frac{V_{ref}}{2^n}$; DAC $V_{out} = V_{ref}\frac{D}{2^n}$.`,
        r`Serial (UART): characters/s = baud ÷ (start + data + parity + stop bits). Parallel ports: 8255 PPI.`,
      ],
      example: {
        problem: r`A 10-bit ADC has a 5 V reference. What is its step, and what code does 2.5 V give? How many characters a second does 9600 baud 8N1 carry?`,
        solution: r`$\frac{5}{1024} = 4.88$ mV; $\left\lfloor\frac{2.5}{5}1024\right\rfloor = 512$. $\frac{9600}{10} = 960$ characters a second.`,
      },
      traps: [r`8N1 is 10 bits a character: the start and stop bits count.`],
    },
    {
      name: 'Interrupts',
      inShort: r`Letting devices stop the processor to get service, instead of being polled.`,
      keyIdeas: [
        r`Maskable (can be disabled) vs non-maskable; vectored (fixed address) vs non-vectored.`,
        r`8085: TRAP (024H, non-maskable, highest), RST 7.5 (03CH), 6.5 (034H), 5.5 (02CH), INTR. RST n jumps to $8n$.`,
        r`8086: the vector for type $n$ is at $4n$ in the interrupt table. The service routine saves and restores registers and ends with a return.`,
      ],
      example: {
        problem: r`Where does the 8085 go for RST 7.5? Where is the 8086's vector for interrupt type 21H?`,
        solution: r`$7.5 \times 8 = 60 = 003\text{CH}$. $4 \times 21\text{H} = 4 \times 33 = 132 = 84\text{H}$.`,
      },
      traps: [r`Polling wastes time checking devices; interrupts let the processor work until a device needs it.`],
    },
    {
      name: 'Microcontrollers',
      inShort: r`A processor with memory, timers and I/O on one chip, for control jobs.`,
      keyIdeas: [
        r`A microprocessor needs outside memory and I/O; a microcontroller (8051, PIC, AVR) has them on chip.`,
        r`Timer overflow $t = \frac{(2^n - N_0)k}{f}$; load $N_0$ to set the period.`,
        r`PWM: duty $D = \frac{t_{on}}{T}$, average $DV_{cc}$; also ADCs, UARTs and watchdog timers.`,
      ],
      example: {
        problem: r`A 16-bit timer runs from 1 MHz through a prescaler of 8. How long until it overflows from 0? What preload gives 10 ms? What does 25% PWM on 12 V average?`,
        solution: r`$\frac{65\,536 \times 8}{10^6} = 0.524$ s. $N_0 = 65\,536 - \frac{0.01 \times 10^6}{8} = 64\,286$. $0.25 \times 12 = 3$ V.`,
      },
      traps: [r`A timer counts UP to overflow: preload with $2^n$ minus the counts you want.`],
    },
  ],
};
