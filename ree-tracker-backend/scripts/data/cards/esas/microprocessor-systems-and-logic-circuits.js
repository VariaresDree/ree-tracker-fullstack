'use strict';

// ESAS › Microprocessor Systems and Logic Circuits formula cards (Library
// round, 2026-11-18): the topic had no cards. Number systems and codes,
// Boolean algebra, gate electrical limits, adders, multiplexers and decoders,
// flip-flop equations, counters, memory sizing, processor performance, ADC and
// DAC steps, serial framing and microcontroller timers. See
// mathematics/algebra.js for the format; tests/programmingAndLogicFormulas.test.js
// checks each by simulating the circuit or counting the cases.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const NUM = 'Number Systems and Codes';
const BOOL = 'Boolean Algebra';
const GATE = 'Logic Gates';
const KMAP = 'Karnaugh Maps';
const COMB = 'Adders, Multiplexers and Decoders';
const FF = 'Flip-Flops';
const CNT = 'Counters and Registers';
const SEQ = 'Sequential Circuits';
const MEM = 'Memory';
const ARCH = 'Microprocessor Architecture';
const ISA = 'Instruction Sets and Assembly';
const IO = 'Interfacing and I/O';
const INT = 'Interrupts';
const MCU = 'Microcontrollers';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const NB = v(r`$n$`, 'number of bits');
const AB = v(r`$A, B$`, 'logic inputs (0 or 1)');
const HZ = r`$\text{Hz}$`;

const drafts = [
    // Number Systems and Codes
    P(NUM, null, 'Positional Number Value', r`$N = \sum d_ib^i$`, r`$N = \sum_i d_i\,b^i = d_{k}b^{k} + \cdots + d_1b + d_0 + d_{-1}b^{-1} + \cdots$`,
        [v(r`$d_i$`, 'digit in position i'), v(r`$b$`, 'base (2, 8, 10, 16)')],
        'The value of a number written in any base.',
        'Binary to octal: group 3 bits from the point; to hex: groups of 4. Decimal to base b: divide repeatedly, read remainders upward.'),
    P(NUM, null, 'Bits Needed for N Values', r`$n = \lceil\log_2 N\rceil$`, r`$n = \lceil\log_2 N\rceil;\qquad n \text{ bits give } 2^n \text{ values}$`,
        [v(r`$N$`, 'number of distinct values or states'), NB],
        'How many bits (or flip-flops, or select lines) it takes to tell N things apart.',
        '26 letters need 5 bits; 1000 values need 10.'),
    P(NUM, null, "Two's Complement", r`$-N = 2^n - N$`, r`$-N \equiv 2^n - N = \overline{N} + 1;\qquad \text{range } -2^{n-1} \text{ to } 2^{n-1} - 1$`,
        [v(r`$N$`, 'the positive number'), NB],
        'How processors store negative numbers: invert the bits and add 1.',
        'One\'s complement is just the inversion: 2ⁿ − 1 − N, with two zeros. Overflow if two numbers of the same sign give the other sign.'),
    P(NUM, null, 'Gray Code', r`$g = b \oplus (b \gg 1)$`, r`$g = b \oplus (b \gg 1);\qquad b_i = g_{n-1} \oplus \cdots \oplus g_i$`,
        [v(r`$b$`, 'binary number'), v(r`$g$`, 'its Gray code')],
        'A code in which neighbouring values differ in one bit, used in encoders and K-map ordering.',
        'Gray to binary: the top bit is copied; each next bit is the XOR of the binary bit above and the Gray bit.'),
    P(NUM, null, 'BCD and Excess-3', r`$\text{BCD}$`, r`$\text{BCD: each decimal digit as 4 bits (0000–1001)};\qquad \text{Excess-3} = \text{BCD} + 0011$`,
        [v(r`$\text{digit}$`, 'a decimal digit 0–9')],
        'Decimal digits coded one at a time in binary.',
        'Adding BCD: if a digit sum exceeds 9 (or carries), add 6 (0110) to correct it. 1010–1111 are invalid in BCD.'),
    P(NUM, null, 'Hamming Code Parity Bits', r`$2^p \ge m + p + 1$`, r`$2^p \ge m + p + 1$`,
        [v(r`$m$`, 'data bits'), v(r`$p$`, 'parity bits, at positions 1, 2, 4, 8, …')],
        'How many parity bits correct any single-bit error in m data bits.',
        '4 data bits need 3 parity bits (the 7-bit Hamming code); 8 need 4.'),
    // Boolean Algebra
    P(BOOL, null, "De Morgan's Theorems", r`$\overline{AB} = \overline{A} + \overline{B}$`, r`$\overline{AB} = \overline{A} + \overline{B},\qquad \overline{A + B} = \overline{A}\,\overline{B}$`,
        [AB],
        'Break the bar, change the operation.',
        'They are why a NAND is an OR with inverted inputs (bubbled OR).'),
    P(BOOL, null, 'Boolean Simplification Rules', r`$A + AB = A$`, r`$A + AB = A;\quad A(A + B) = A;\quad A + \overline{A}B = A + B;\quad AB + \overline{A}C + BC = AB + \overline{A}C$`,
        [v(r`$A, B, C$`, 'logic variables')],
        'Absorption, redundancy and consensus: the rules that shrink expressions.',
        'The last one is the consensus theorem: the BC term is redundant.'),
    P(BOOL, null, 'Minterms and Maxterms', r`$2^n$`, r`$n \text{ variables: } 2^n \text{ minterms};\ 2^{2^n} \text{ possible functions};\qquad F = \sum m(\ldots) = \prod M(\text{the rest})$`,
        [NB],
        'Canonical forms: a sum of the minterms where F = 1, or a product of the maxterms where F = 0.',
        'Minterm mᵢ is 1 only for input i; maxterm Mᵢ is 0 only for input i, and Mᵢ = m̄ᵢ.'),
    // Logic Gates
    P(GATE, null, 'Exclusive OR and NOR', r`$A \oplus B$`, r`$A \oplus B = \overline{A}B + A\overline{B};\qquad A \odot B = \overline{A \oplus B} = AB + \overline{A}\,\overline{B}$`,
        [AB],
        'XOR is 1 when the inputs differ; XNOR (equivalence) when they match.',
        'A chain of XORs gives odd parity. NAND and NOR are universal: each alone can build any circuit.'),
    P(GATE, null, 'Noise Margins', r`$NM_H = V_{OH} - V_{IH}$`, r`$NM_H = V_{OH(\min)} - V_{IH(\min)},\qquad NM_L = V_{IL(\max)} - V_{OL(\max)}$`,
        [v(r`$V_{OH}, V_{OL}$`, 'guaranteed output high and low levels', r`$\text{V}$`), v(r`$V_{IH}, V_{IL}$`, 'input levels read as high and low', r`$\text{V}$`)],
        'How much noise a logic signal can pick up and still be read correctly.',
        'Standard TTL: V_OH 2.4, V_IH 2.0, V_IL 0.8, V_OL 0.4 V, so both margins are 0.4 V.', r`$\text{V}$`),
    P(GATE, null, 'Fan-Out', r`$\text{fan-out}$`, r`$\text{fan-out} = \min\left(\frac{I_{OH}}{I_{IH}}, \frac{I_{OL}}{I_{IL}}\right)$`,
        [v(r`$I_{OH}, I_{OL}$`, 'output currents a gate can drive', r`$\text{mA}$`), v(r`$I_{IH}, I_{IL}$`, 'input current each load draws', r`$\text{mA}$`)],
        'How many gate inputs one output can drive.',
        'Standard TTL: 16 mA / 1.6 mA = 10 in the low state.'),
    P(GATE, null, 'Propagation Delay and Speed-Power Product', r`$t_{pd}$`, r`$t_{pd} = \frac{t_{PHL} + t_{PLH}}{2},\qquad SPP = t_{pd} \times P_D$`,
        [v(r`$t_{PHL}, t_{PLH}$`, 'high-to-low and low-to-high delays', r`$\text{ns}$`), v(r`$P_D$`, 'power per gate', r`$\text{mW}$`)],
        'How fast a gate switches, and the trade-off against its power.',
        'Standard TTL: 10 ns × 10 mW = 100 pJ. A lower SPP is better.', r`$\text{ns}$`),
    // Karnaugh Maps
    P(KMAP, null, 'Karnaugh Map Groups', r`$2^k \text{ cells}$`, r`$\text{a group of } 2^k \text{ adjacent 1s drops } k \text{ variables, leaving a term of } n - k$`,
        [NB, v(r`$k$`, 'the group size exponent (pairs 1, quads 2, octets 3)')],
        'Grouping 1s in a K-map: bigger groups give simpler terms.',
        'Rows and columns run in Gray-code order (00, 01, 11, 10), and the edges wrap around. Don\'t-cares may be used as 1s.'),
    // Adders, Multiplexers and Decoders
    P(COMB, null, 'Half and Full Adder', r`$S = A \oplus B \oplus C_{in}$`, r`$\text{half: } S = A \oplus B,\ C = AB;\qquad \text{full: } S = A \oplus B \oplus C_{in},\ C_{out} = AB + C_{in}(A \oplus B)$`,
        [AB, v(r`$C_{in}$`, 'carry in')],
        'The circuits that add bits.',
        'A full adder is two half adders and an OR gate.'),
    P(COMB, null, 'Ripple-Carry Adder Delay', r`$t = n\,t_c$`, r`$t_{add} \approx n\,t_{carry}$`,
        [NB, v(r`$t_{carry}$`, 'carry delay of one full adder', r`$\text{ns}$`)],
        'An n-bit adder made of full adders in a chain waits for the carry to ripple through every stage.',
        'Carry look-ahead computes all carries at once, so its delay barely grows with n.', r`$\text{ns}$`),
    P(COMB, null, 'Multiplexer and Decoder Sizes', r`$2^n$`, r`$\text{MUX: } 2^n \text{ inputs, } n \text{ select lines};\qquad \text{decoder: } n \text{ inputs} \to 2^n \text{ outputs}$`,
        [v(r`$n$`, 'select or input lines')],
        'A multiplexer picks one of 2ⁿ inputs; a decoder raises one of 2ⁿ outputs.',
        'A 2ⁿ-to-1 MUX can make any function of n variables (n + 1 with the last as a data input).'),
    // Flip-Flops
    P(FF, null, 'Flip-Flop Characteristic Equations', r`$Q^+ = JQ' + K'Q$`, r`$SR: Q^+ = S + \overline{R}Q\ (SR = 0);\quad JK: Q^+ = J\overline{Q} + \overline{K}Q;\quad D: Q^+ = D;\quad T: Q^+ = T \oplus Q$`,
        [v(r`$Q, Q^+$`, 'present and next state'), v(r`$S, R, J, K, D, T$`, 'inputs')],
        'The next state of each flip-flop from its inputs and present state, at the clock edge.',
        'JK with J = K = 1 toggles; SR with S = R = 1 is forbidden.'),
    P(FF, null, 'Maximum Clock Frequency', r`$f_{max} = \frac{1}{t_{pd} + t_{comb} + t_{su}}$`, r`$f_{max} = \frac{1}{t_{pd,FF} + t_{comb} + t_{setup}}$`,
        [v(r`$t_{pd,FF}$`, 'clock-to-output delay', r`$\text{ns}$`), v(r`$t_{comb}$`, 'longest logic delay between flip-flops', r`$\text{ns}$`), v(r`$t_{setup}$`, 'setup time', r`$\text{ns}$`)],
        'The fastest clock a synchronous circuit can run at.',
        '10 + 15 + 5 = 30 ns gives 33.3 MHz.', HZ),
    // Counters and Registers
    P(CNT, null, 'Counter Modulus and Output Frequency', r`$f_{out} = \frac{f_{in}}{2^n}$`, r`$\text{binary counter: } 2^n \text{ states},\ f_{out} = \frac{f_{in}}{2^n};\qquad \text{ring: } n \text{ states};\qquad \text{Johnson: } 2n$`,
        [v(r`$n$`, 'number of flip-flops'), v(r`$f_{in}$`, 'clock frequency', HZ)],
        'How many states a counter has, and how it divides the clock.',
        'A mod-N counter needs ⌈log₂N⌉ flip-flops; its last stage runs at f_in/N.', HZ),
    P(CNT, null, 'Ripple Counter Maximum Frequency', r`$f_{max} = \frac{1}{n\,t_{pd}}$`, r`$f_{max} = \frac{1}{n\,t_{pd}}$`,
        [v(r`$n$`, 'number of flip-flops'), v(r`$t_{pd}$`, 'delay of one flip-flop', r`$\text{ns}$`)],
        'An asynchronous counter must settle through every stage before the next clock.',
        'A synchronous counter clocks all stages together, so its limit is set by one flip-flop plus its logic.', HZ),
    // Sequential Circuits
    P(SEQ, null, 'States of a Sequential Circuit', r`$2^n$`, r`$n \text{ flip-flops} \to \text{up to } 2^n \text{ states};\qquad \text{Mealy: outputs from state and input};\ \text{Moore: from state only}$`,
        [v(r`$n$`, 'number of flip-flops')],
        'How many states a state machine can hold, and its two kinds of output.',
        'A Moore machine usually needs more states but its outputs change only at the clock.'),
    // Memory
    P(MEM, null, 'Memory Size and Address Lines', r`$2^n \times m$`, r`$\text{capacity} = 2^n \times m \text{ bits};\qquad n = \log_2(\text{words})$`,
        [v(r`$n$`, 'address lines'), v(r`$m$`, 'data lines (bits per word)')],
        'A memory\'s size from its address and data lines.',
        'A 64K × 8 chip has 16 address and 8 data lines. Chips needed = total size ÷ chip size.', r`$\text{bits}$`),
    P(MEM, null, 'Address Range of a Memory Block', r`$\text{end} = \text{start} + \text{size} - 1$`, r`$\text{end address} = \text{start address} + \text{size} - 1$`,
        [v(r`$\text{size}$`, 'number of locations')],
        'Where a memory block ends in the address map.',
        'An 8 KB block from 2000H ends at 3FFFH (8K = 2000H).'),
    // Microprocessor Architecture
    P(ARCH, null, 'Execution Time and MIPS', r`$T = \frac{N \cdot CPI}{f}$`, r`$T = \frac{N \cdot CPI}{f},\qquad MIPS = \frac{f}{CPI \times 10^6}$`,
        [v(r`$N$`, 'instructions executed'), v(r`$CPI$`, 'average clock cycles per instruction'), v(r`$f$`, 'clock frequency', HZ)],
        'How long a program takes on a processor.',
        'Higher MIPS is not always faster: CPI and the instructions needed differ between processors.', r`$\text{s}$`),
    P(ARCH, null, 'Addressable Memory and Bus Bandwidth', r`$2^{a}$`, r`$\text{addressable} = 2^{a} \text{ locations};\qquad \text{bandwidth} = \text{bus width} \times \text{transfers per second}$`,
        [v(r`$a$`, 'address bus width in bits')],
        'How much memory a processor can reach, and how fast data moves.',
        '8085: 16 address lines, 64 KB; 8086: 20 lines, 1 MB.'),
    P(ARCH, null, "Amdahl's Law", r`$S = \frac{1}{(1 - p) + p/s}$`, r`$S = \frac{1}{(1 - p) + \frac{p}{s}}$`,
        [v(r`$p$`, 'fraction of the time that is sped up'), v(r`$s$`, 'speedup of that part')],
        'The overall speedup when only part of a program gets faster.',
        'Even an infinite speedup of 90% of the work gives at most 10×.'),
    // Instruction Sets and Assembly
    P(ISA, null, 'Instruction Timing from T-States', r`$t = \frac{T}{f}$`, r`$t = \frac{T\text{-states}}{f_{clk}}$`,
        [v(r`$T\text{-states}$`, 'clock cycles the instruction takes'), v(r`$f_{clk}$`, 'processor clock', HZ)],
        'How long an instruction takes, from its clock-cycle count.',
        'A delay loop\'s time is the sum of T-states of every instruction run, times the clock period.', r`$\text{s}$`),
    // Interfacing and I/O
    P(IO, null, 'ADC and DAC Resolution', r`$\Delta V = \frac{V_{ref}}{2^n}$`, r`$\Delta V = \frac{V_{ref}}{2^n};\qquad \text{DAC: } V_{out} = V_{ref}\frac{D}{2^n};\qquad \text{ADC: } D = \left\lfloor\frac{V_{in}}{V_{ref}}2^n\right\rfloor$`,
        [v(r`$V_{ref}$`, 'reference (full-scale) voltage', r`$\text{V}$`), NB, v(r`$D$`, 'digital code')],
        'The smallest voltage step a converter resolves.',
        'An 8-bit ADC on 5 V: 19.5 mV per step. Some texts divide by 2ⁿ − 1, making full scale exactly V_ref.', r`$\text{V}$`),
    P(IO, null, 'Serial Character Rate', r`$\text{chars/s} = \frac{\text{baud}}{\text{bits per frame}}$`, r`$\text{characters per second} = \frac{\text{baud}}{1 + d + p + s}$`,
        [v(r`$d$`, 'data bits'), v(r`$p$`, 'parity bits (0 or 1)'), v(r`$s$`, 'stop bits'), v(r`$\text{baud}$`, 'bits per second on the line')],
        'How many characters a serial (UART) line carries, counting the start and stop bits.',
        '9600 baud, 8N1 (10 bits a frame): 960 characters a second.'),
    // Interrupts
    P(INT, null, 'Interrupt Vector Addresses (8085)', r`$\text{RST } n \to 8n$`, r`$\text{RST } n \to 8n;\quad \text{TRAP} \to 0024\text{H};\ \text{RST 5.5} \to 002C\text{H};\ \text{RST 6.5} \to 0034\text{H};\ \text{RST 7.5} \to 003C\text{H}$`,
        [v(r`$n$`, 'restart number 0–7')],
        'Where the 8085 jumps for each interrupt.',
        'Priority: TRAP (non-maskable) > RST 7.5 > 6.5 > 5.5 > INTR. For the 8086 the vector table entry is at 4 × type.'),
    // Microcontrollers
    P(MCU, null, 'Timer Overflow Time', r`$t = \frac{(2^n - N_0)k}{f}$`, r`$t_{overflow} = \frac{(2^n - N_0)\,k}{f_{clk}}$`,
        [v(r`$n$`, 'timer width in bits'), v(r`$N_0$`, 'value loaded into the timer'), v(r`$k$`, 'prescaler'), v(r`$f_{clk}$`, 'timer clock', HZ)],
        'How long a timer counts before it overflows and interrupts.',
        'To get a period t, load N₀ = 2ⁿ − t·f/k.', r`$\text{s}$`),
    P(MCU, null, 'PWM Duty Cycle', r`$D = \frac{t_{on}}{T}$`, r`$D = \frac{t_{on}}{T},\qquad V_{avg} = D\,V_{cc}$`,
        [v(r`$t_{on}$`, 'high time', r`$\text{s}$`), v(r`$T$`, 'period', r`$\text{s}$`), v(r`$V_{cc}$`, 'supply voltage', r`$\text{V}$`)],
        'The fraction of each period a PWM output is high, and the average voltage it gives.',
        'An 8-bit PWM register value R gives D = R/256 (or R/255).'),
];

module.exports = { subject: 'ESAS', topic: 'Microprocessor Systems and Logic Circuits', migration: '20261220000001_cards_microprocessor_systems_and_logic_circuits', file, revisions, retire, drafts };
