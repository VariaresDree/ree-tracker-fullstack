// Library › Lessons › Mathematics › Math in the Modern World (2026-11-17):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order; every worked example checked by computation.
const r = String.raw;

export default {
  topic: 'Math in the Modern World',
  subject: 'Mathematics',
  overview: r`Mathematics as it shows up outside the classroom: patterns in nature, the language and logic of careful reasoning, and the tools behind everyday systems, from barcodes and ciphers to loans, elections and networks. The board asks these as short computations: a check digit, a truth table, a loan payment, an apportionment, an Euler path. Learn each procedure step by step; the arithmetic is light, the order of steps is what gets tested.`,
  sources: [
    'Mathematics in the Modern World (Aufmann, Lockwood, Nation and Clegg, Mathematical Excursions)',
    'CHED Memorandum Order No. 20, s. 2013: Mathematics in the Modern World course description',
    'PRC Table of Specifications, REE: Mathematics',
  ],
  subtopics: [
    {
      name: 'Patterns and Numbers in Nature',
      inShort: r`Fibonacci numbers, the golden ratio and spirals, in petals, shells and seed heads.`,
      keyIdeas: [
        r`$F_n = F_{n-1} + F_{n-2}$: 1, 1, 2, 3, 5, 8, 13, 21, …; Binet: $F_n = \frac{\phi^n - \psi^n}{\sqrt5}$.`,
        r`$\frac{F_{n+1}}{F_n} \to \phi = 1.618\ldots$; $F_1 + \cdots + F_n = F_{n+2} - 1$.`,
        r`A golden spiral widens by $\phi$ every quarter turn; symmetry and tessellations are the other patterns.`,
      ],
      example: {
        problem: r`Find $F_{15}$ without listing, and the sum of the first 10 Fibonacci numbers.`,
        solution: r`$\frac{\phi^{15}}{\sqrt5} = 609.9997$, so $F_{15} = 610$. The sum is $F_{12} - 1 = 144 - 1 = 143$.`,
      },
      traps: [r`Some books start with $F_0 = 0$; check which index the problem uses.`],
    },
    {
      name: 'Mathematical Language and Symbols',
      inShort: r`Reading and writing mathematics precisely: expressions, sets, intervals and the rules of arithmetic.`,
      keyIdeas: [
        r`Order: grouping, exponents, then $\times$ and $\div$ left to right, then $+$ and $-$ left to right.`,
        r`Commutative, associative, distributive, identity and inverse properties.`,
        r`$\{x \mid a \le x < b\} = [a, b)$: a bracket includes, a parenthesis excludes.`,
      ],
      example: {
        problem: r`Evaluate $18 \div 3 \times 2 - 2^2$, and write $\{x \mid -2 < x \le 5\}$ in interval notation.`,
        solution: r`$18 \div 3 = 6$, $6 \times 2 = 12$, $12 - 4 = 8$. The set is $(-2, 5]$.`,
      },
      traps: [r`$18 \div 3 \times 2$ is not $18 \div 6$: division and multiplication go left to right.`],
    },
    {
      name: 'Problem Solving and Reasoning',
      inShort: r`Inductive reasoning finds a pattern; deductive reasoning proves it. Pólya: understand, plan, carry out, look back.`,
      keyIdeas: [
        r`Constant $k$-th differences mean a polynomial of degree $k$; constant second differences, $a_n = An^2 + Bn + C$ with $2A = \Delta^2$.`,
        r`Pigeonhole: $N$ objects in $k$ boxes put at least $\lceil N/k \rceil$ in one box.`,
        r`Induction: prove $P(1)$, then $P(k) \Rightarrow P(k + 1)$. One counterexample disproves a general claim.`,
      ],
      example: {
        problem: r`Find the 10th term of 2, 6, 12, 20, 30, …`,
        solution: r`Differences 4, 6, 8, 10; second differences 2, so $A = 1$. $a_n = n^2 + Bn + C$: $a_1 = 2$ and $a_2 = 6$ give $B = 1$, $C = 0$. $a_n = n^2 + n$, and $a_{10} = 110$.`,
      },
      traps: [r`A pattern seen in a few cases is a guess until it is proved.`],
    },
    {
      name: 'Sets and Logic',
      inShort: r`Sets, statements, truth tables and valid arguments.`,
      keyIdeas: [
        r`De Morgan: $(A \cup B)' = A' \cap B'$ and $\neg(p \land q) \equiv \neg p \lor \neg q$. $n(A \times B) = n(A)n(B)$.`,
        r`$p \to q$ is false only when $p$ is true and $q$ false; it equals its contrapositive $\neg q \to \neg p$ and $\neg p \lor q$.`,
        r`Valid: modus ponens, modus tollens, syllogism. A truth table for $n$ statements has $2^n$ rows.`,
      ],
      example: {
        problem: r`"If I study, I pass. I passed. So I studied." Is the argument valid? Give the contrapositive of the first premise.`,
        solution: r`It is $[(p \to q) \land q] \to p$: affirming the consequent, invalid (the row $p$ false, $q$ true makes the premises true and the conclusion false). Contrapositive: "If I don't pass, I didn't study."`,
      },
      traps: [r`The converse ($q \to p$) is NOT equivalent to the conditional.`],
    },
    {
      name: 'Data Management',
      inShort: r`Collecting, summarising and interpreting data; the measures themselves are in Probability & Statistics.`,
      keyIdeas: [
        r`Centre: mean, median, mode and midrange $\frac{\max + \min}{2}$.`,
        r`Position: percentile rank $\frac{B + 0.5E}{n}\times100$, z-scores, quartiles.`,
        r`Spread: range, standard deviation (roughly $\frac{\text{range}}{4}$), and the normal curve; regression for paired data.`,
      ],
      example: {
        problem: r`Scores: 55, 60, 62, 70, 70, 75, 80, 85, 90, 95. Find the percentile rank of 70 and the midrange.`,
        solution: r`Below 70: 3; equal: 2. $PR = \frac{3 + 1}{10}\times100 = 40$. Midrange $\frac{95 + 55}{2} = 75$.`,
      },
      traps: [r`A percentile rank of 40 means 40% scored at or below it, not a score of 40%.`],
    },
    {
      name: 'Geometric Designs',
      inShort: r`Symmetry, tessellations and patterns built from regular shapes.`,
      keyIdeas: [
        r`A regular $n$-gon has $n$ rotations (by $\frac{360^\circ}{n}$) and $n$ mirror lines.`,
        r`One regular polygon tiles alone only if its angle divides $360^\circ$: triangles, squares, hexagons.`,
        r`Mixed regular polygons tile when the angles at each vertex add to $360^\circ$ (3.6.3.6, 4.8.8, 3.12.12).`,
      ],
      example: {
        problem: r`Can regular octagons tile the plane alone? With squares?`,
        solution: r`An octagon's angle is $135^\circ$, and $\frac{360}{135} = 2.67$: no. Two octagons and a square: $135^\circ + 135^\circ + 90^\circ = 360^\circ$: yes, the 4.8.8 tiling.`,
      },
      traps: [r`Use the INTERIOR angle $\frac{(n - 2)180^\circ}{n}$, not the exterior.`],
    },
    {
      name: 'Codes',
      inShort: r`Numbers that catch errors (check digits, parity) and hide messages (ciphers).`,
      keyIdeas: [
        r`ISBN-10: $10d_1 + 9d_2 + \cdots + 1d_{10} \equiv 0 \pmod{11}$; ISBN-13 weights 1, 3 mod 10; UPC-A weights 3, 1 mod 10.`,
        r`Caesar: $C = (P + k) \bmod 26$. Affine: $C = (aP + b) \bmod 26$, needing $\gcd(a, 26) = 1$.`,
        r`Parity bits detect one error; a code with minimum distance $d$ corrects $\lfloor\frac{d - 1}{2}\rfloor$.`,
      ],
      example: {
        problem: r`Find the check digit of ISBN 0-306-40615-?. Encode HELLO with a Caesar shift of 3.`,
        solution: r`$10(0) + 9(3) + 8(0) + 7(6) + 6(4) + 5(0) + 4(6) + 3(1) + 2(5) = 130$, and $130 \equiv 9 \pmod{11}$, so the check digit is 2 ($132 = 12 \times 11$). HELLO becomes KHOOR.`,
      },
      traps: [r`An ISBN-10 check digit of 10 is written X.`],
    },
    {
      name: 'Linear Programming',
      inShort: r`Choosing the best plan when resources are limited.`,
      keyIdeas: [
        r`Write the objective $z = c_1x + c_2y$ and the constraints; graph the feasible region.`,
        r`The optimum is at a corner (Numerical Methods' corner-point rule); the isoprofit line has slope $-\frac{c_1}{c_2}$.`,
        r`Slack $s_i = b_i - (a_{i1}x + a_{i2}y)$ is the unused resource; binding constraints have none.`,
      ],
      example: {
        problem: r`Maximise $z = 3x + 5y$ with $x \le 4$, $2y \le 12$, $3x + 2y \le 18$, $x, y \ge 0$.`,
        solution: r`Corners: $(0, 0) \to 0$, $(4, 0) \to 12$, $(4, 3) \to 27$, $(2, 6) \to 36$, $(0, 6) \to 30$. The best is $z = 36$ at $(2, 6)$, with slacks 2, 0 and 0.`,
      },
      traps: [r`Check every corner is feasible: an intersection of two lines may break a third constraint.`],
    },
    {
      name: 'Mathematics of Finance',
      inShort: r`Interest, annuities and loans.`,
      keyIdeas: [
        r`Simple and compound interest are in Algebra; effective rate $\left(1 + \frac rm\right)^m - 1$; present value $F(1 + i)^{-n}$.`,
        r`Ordinary annuity: $F = A\frac{(1 + i)^n - 1}{i}$, $P = A\frac{1 - (1 + i)^{-n}}{i}$; annuity due $\times(1 + i)$; perpetuity $\frac Ai$.`,
        r`Loan payment $A = \frac{Pi}{1 - (1 + i)^{-n}}$; the balance is the present value of the payments left.`,
      ],
      example: {
        problem: r`A ₱500,000 loan at 8% compounded monthly is paid monthly for 5 years. Find the payment, the first month's interest, and the total interest.`,
        solution: r`$i = \frac{0.08}{12}$, $n = 60$: $A = ₱10{,}138.20$. First month's interest: $500{,}000 \times \frac{0.08}{12} = ₱3{,}333.33$. Total interest: $60(10{,}138.20) - 500{,}000 = ₱108{,}291.83$.`,
      },
      traps: [r`Match the rate to the period: a monthly payment needs the monthly rate and the number of months.`],
    },
    {
      name: 'Apportionment and Voting',
      inShort: r`Sharing seats fairly, and the ways a winner can be chosen.`,
      keyIdeas: [
        r`Standard divisor $d = \frac{\text{population}}{\text{seats}}$, quota $q = \frac pd$. Hamilton: lower quotas, then largest remainders.`,
        r`Jefferson rounds down, Webster rounds normally, Huntington-Hill rounds at $\sqrt{n(n + 1)}$, each with a modified divisor.`,
        r`Plurality, majority ($> \frac V2$), Borda count, pairwise comparisons ($C(n, 2)$ contests); each can pick a different winner.`,
      ],
      example: {
        problem: r`21 seats for states of 5,300, 2,650, 1,830 and 720. Apportion by Hamilton's method.`,
        solution: r`$d = \frac{10{,}500}{21} = 500$; quotas 10.6, 5.3, 3.66, 1.44. Lower quotas give 19; the two extra seats go to the largest remainders, 0.66 and 0.6: 11, 5, 4, 1. (Jefferson with $d' = 457.5$ and Webster with $d = 500$ give the same here.)`,
      },
      traps: [r`Hamilton can show the Alabama paradox: adding a seat can cost a state one.`],
    },
    {
      name: 'Graph Theory',
      inShort: r`Networks of points and lines: routes, circuits and trees.`,
      keyIdeas: [
        r`Degrees add to $2|E|$. Euler circuit: connected, all degrees even; Euler path: exactly two odd.`,
        r`$K_n$ has $\frac{n(n - 1)}{2}$ edges and $\frac{(n - 1)!}{2}$ Hamilton circuits.`,
        r`Trees have $n - 1$ edges ($n^{n - 2}$ spanning trees of $K_n$); planar graphs have $V - E + F = 2$.`,
      ],
      example: {
        problem: r`Königsberg's land areas have degrees 3, 3, 3 and 5. Is there a walk crossing every bridge once? How many Hamilton circuits does $K_6$ have?`,
        solution: r`Four odd vertices, more than two: no Euler path or circuit. $K_6$: $\frac{5!}{2} = 60$ circuits (counting a circuit and its reverse once).`,
      },
      traps: [r`Euler is about EDGES (each once); Hamilton is about VERTICES (each once).`],
    },
  ],
};
