// Library › Lessons › ESAS › Computer Programming
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number and printed output
// re-worked by programmingLesson.test.js, which runs the code. Coverage and
// problem styles cross-checked against a review center's computer
// fundamentals handout; the text, problems and figures are this app's own):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order. Examples are in C or Java, the languages board items use most.
// Number systems and logic are in Microprocessor Systems and Logic Circuits.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Calls made by a naive recursive fib(n): 2F(n+1) − 1.
const fibonacci = (n) => {
  let [a, b] = [0, 1];
  for (let k = 0; k < n; k += 1) [a, b] = [b, a + b];
  return a;
};
export const naiveCalls = (n) => 2 * fibonacci(n + 1) - 1;

// An 8-bit signed counter: the value it holds after k additions of 1 from 0.
export const int8 = (k) => (((k + 128) % 256) + 256) % 256 - 128;

export default {
  topic: 'Computer Programming',
  subject: 'ESAS',
  overview: r`Board items on programming are mostly about reading code: what a short program prints, how many times a loop runs, what a variable holds at the end. Trace it by hand, one line at a time, writing each variable's value as it changes. Know the rules that catch people out: integer division drops the fraction, arrays start at 0, x++ and ++x differ, and && and || stop early. Then the ideas behind larger programs: functions, pointers, objects, exceptions and files.`,
  sources: [
    'C How to Program and Java How to Program (Deitel and Deitel)',
    'The C Programming Language (Kernighan and Ritchie)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Algorithms and Flowcharts',
      inShort: r`A step-by-step method, drawn as a flowchart or written as pseudocode, and how fast it runs.`,
      body: [
        r`An **algorithm** is a finite, exact list of steps that solves a problem. Every one is built from three structures: **sequence** (one step after another), **selection** (a decision) and **repetition** (a loop). A **flowchart** draws it: an oval for start and end, a parallelogram for input and output, a rectangle for a process, a diamond for a decision. Summing 1 to n:`,
        {
          type: 'blocks',
          alt: 'A flowchart that sums 1 to n: begin; set s to 0 and i to 1; test whether i is at most n; if yes, add i to s, add 1 to i, and go back to the test; if no, print s.',
          caption: 'Summing 1 to n: the test comes first, so the loop may run zero times.',
          blocks: [
            { id: 'begin', at: [0, 0], label: 'begin' },
            { id: 'init', at: [0, 1], label: 's=0, i=1' },
            { id: 'test', at: [0, 2], label: 'i ≤ n ?' },
            { id: 'add', at: [1, 2], label: 's = s + i' },
            { id: 'step', at: [1, 1], label: 'i = i + 1' },
            { id: 'out', at: [0, 3], label: 'print s' },
          ],
          links: [
            ['begin', 'init'],
            ['init', 'test'],
            ['test', 'add', { label: 'yes' }],
            ['add', 'step'],
            ['step', 'test', { via: [[1, 1.5], [0, 1.5]] }],
            ['test', 'out', { label: 'no' }],
          ],
        },
        r`Source code written by people is turned into machine language by a **compiler** (all at once, into an object program, before running) or an **interpreter** (a line at a time, as it runs); an **assembler** does it for assembly language. Algorithms are compared by how their work grows with the input size n:`,
        {
          type: 'plot',
          alt: 'Steps against input size from 1 to 40 for four growth rates: log n stays near the axis, n rises in a straight line, n log n curves up gently, and n squared, dashed, climbs fastest, reaching 300 steps by about n equals 17.',
          caption: 'How work grows with n: log n, n, n log n, and n² (dashed), which soon dwarfs the rest.',
          x: [1, 40],
          y: [0, 300],
          xLabel: 'input size n',
          yLabel: 'steps',
          series: [
            { f: (n) => Math.log2(n), label: 'log n' },
            { f: (n) => n, label: 'n', colour: colourOf(1) },
            { f: (n) => n * Math.log2(n), label: 'n log n', colour: colourOf(2) },
            {
              points: [...Array.from({ length: 17 }, (_, k) => [k + 1, (k + 1) ** 2]), [Math.sqrt(300), 300]],
              label: 'n squared',
              dashed: true,
              colour: colourOf(3),
            },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Flowchart shapes: oval (start/end), parallelogram (input/output), rectangle (process), diamond (decision), circle (connector).`,
        r`Every algorithm uses three structures: sequence, selection (if) and repetition (loops).`,
        r`Growth: $O(1) < O(\log n) < O(n) < O(n\log n) < O(n^2) < O(2^n)$. Binary search needs at most $\lfloor\log_2 n\rfloor + 1$ comparisons.`,
        r`A compiler translates the whole source program into an object program before it runs; an interpreter translates and runs it line by line.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Searching and sorting',
          problem: r`At most how many comparisons does binary search need on 1000 sorted items? How many does bubble sort make on 100 items?`,
          steps: [
            r`$\lfloor\log_2 1000\rfloor + 1 = 9 + 1 = 10$.`,
            r`Bubble sort: $\frac{100 \times 99}{2} = 4950$, against about $100\log_2 100 \approx 664$ for merge sort.`,
          ],
          answer: r`10; 4950.`,
        },
        {
          level: 'board',
          title: 'Tracing a loop, and counting a nested one',
          problem: r`What is j after: int j = 0; for (int i = 1; i <= 4; i++) j = 2 * j + i; ? How many times does the inner statement of for (i = 0; i < 10; i++) for (k = 0; k < i; k++) run?`,
          steps: [
            r`Trace: i = 1 gives j = 1; i = 2 gives 4; i = 3 gives 11; i = 4 gives 26.`,
            r`The inner loop runs i times: $0 + 1 + \dots + 9 = \frac{10 \times 9}{2} = 45$.`,
          ],
          answer: r`j = 26; 45 times.`,
        },
      ],
      traps: [
        r`Binary search works only on SORTED data.`,
        r`Trace with a table: one column per variable, one row per pass.`,
      ],
      check: [
        { q: r`What flowchart symbol shows a decision?`, a: r`A diamond.` },
        { q: r`What translates a whole high-level program into machine language before it runs?`, a: r`A compiler.` },
      ],
    },
    {
      name: 'Variables and Data Types',
      inShort: r`Named storage, the kinds of values it can hold, and their limits.`,
      body: [
        r`A **variable** is a named place in memory; its **type** fixes how many bits it takes and what they mean. An n-bit signed integer (two's complement) holds $-2^{n-1}$ to $2^{n-1} - 1$, unsigned 0 to $2^n - 1$:

| Type (C / Java) | Bits | Range or precision |
|---|---|---|
| char / byte | 8 | −128 to 127 (unsigned 0 to 255) |
| short | 16 | −32 768 to 32 767 |
| int | 32 | about ±2.1 × 10⁹ |
| long (Java) | 64 | about ±9.2 × 10¹⁸ |
| float | 32 | about 7 significant digits |
| double | 64 | about 15–16 significant digits |`,
        r`Step past the top and an integer **overflows**, wrapping round to the bottom of its range with no warning. An 8-bit counter shows it:`,
        {
          type: 'plot',
          alt: 'The value held by an 8-bit signed counter against the number of times 1 is added, from 0 to 300: rising one for one to 127, wrapping to minus 128 at the 128th addition, and rising again to reach 0 at 256.',
          caption: 'An 8-bit signed counter: up to 127, then it wraps to −128 and climbs again.',
          x: [0, 300],
          y: [-140, 140],
          xLabel: 'times 1 is added',
          yLabel: 'value held',
          series: [{ points: [[0, 0], [127, 127], [128, -128], [255, -1], [256, 0], [300, 44]], label: 'value' }],
          marks: [{ x: 128, label: 'wraps' }],
        },
        r`Characters are stored as numbers: 7-bit **ASCII** has 128 codes ('A' is 65, 'a' 97, '0' 48). Memory is counted in powers of two: 1 KB = 1024 bytes, 1 MB = 1 048 576 bytes. A **constant** (const, final) can't be changed, and a variable exists only in the block, its **scope**, where it is declared.`,
      ],
      keyIdeas: [
        r`Integers: an $n$-bit signed type holds $-2^{n-1}$ to $2^{n-1} - 1$ (int is 32 bits: about ±2.1 billion).`,
        r`Floats follow IEEE 754: float about 7 significant digits, double about 15–16.`,
        r`char, boolean; constants (final, const); a variable's scope is the block it is declared in. ASCII is a 7-bit code: 128 characters.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A short',
          problem: r`What range does a 16-bit signed short hold, and what does 32767 + 1 give in one?`,
          steps: [
            r`$-2^{15}$ to $2^{15} - 1$: $-32\,768$ to $32\,767$.`,
            r`Adding 1 to 32767 overflows and wraps to $-32\,768$.`,
          ],
          answer: r`−32 768 to 32 767; −32 768.`,
        },
        {
          level: 'board',
          title: 'Unsigned limits and characters',
          problem: r`What is the largest 32-bit unsigned integer? In C, what does printf("%c %d", 'A' + 2, 'a' - 'A') print?`,
          steps: [
            r`$2^{32} - 1 = 4\,294\,967\,295$.`,
            r`'A' + 2 is 65 + 2 = 67, which is 'C'; 'a' − 'A' is 97 − 65 = 32.`,
          ],
          answer: r`4 294 967 295; C 32.`,
        },
      ],
      traps: [
        r`0.1 + 0.2 is not exactly 0.3 in floating point: compare with a tolerance.`,
        r`A megabyte in memory is 1 048 576 bytes, not a million.`,
      ],
      check: [
        { q: r`How many characters can 7-bit ASCII represent?`, a: r`128.` },
        { q: r`What happens when a signed int passes its largest value?`, a: r`It overflows and wraps to its most negative value.` },
      ],
    },
    {
      name: 'Operators and Expressions',
      inShort: r`Arithmetic, comparison, logical and assignment operators, and the order they run in.`,
      body: [
        r`An expression is evaluated by **precedence** (which operator binds first) and then **associativity** (left to right for most, right to left for assignment and unary operators):

| Level | Operators |
|---|---|
| Highest | ( ) [ ] . |
| Unary | ! ++ -- − (cast) |
| Multiplicative | * / % |
| Additive | + − |
| Relational | < <= > >= |
| Equality | == != |
| Logical AND, then OR | &&, then \|\| |
| Lowest | = += −= … |`,
        r`Integer division drops the fraction (17 / 5 is 3, 17 % 5 is 2), so cast one side to get a decimal: (double) 7 / 2 is 3.5. x++ hands over the old value then adds 1; ++x adds first. && and || **short-circuit**: they stop as soon as the answer is known, so the right side may never run.`,
      ],
      keyIdeas: [
        r`Precedence: () → unary (!, ++, --) → * / % → + − → < > → == != → && → || → assignment.`,
        r`Integer division truncates: $17 / 5 = 3$, $17 \% 5 = 2$; in C and Java $-7 / 2 = -3$, in Python $-7 // 2 = -4$.`,
        r`x++ uses then increments; ++x increments then uses. && and || short-circuit.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Increments in one line',
          problem: r`In Java: int x = 5; int y = x++ + ++x * 2; What are x and y?`,
          steps: [
            r`Left to right: x++ gives 5 (x becomes 6); ++x makes x 7 and gives 7.`,
            r`$7 \times 2 = 14$, so y = 5 + 14 = 19, and x = 7.`,
          ],
          answer: r`x = 7, y = 19.`,
        },
        {
          level: 'board',
          title: 'Division and a short circuit',
          problem: r`In C, with int a = 7, b = 2: find a / b * b + a % b and (double) a / b. Then int x = 10; int y = (x > 5) || (++x > 0); what are x and y?`,
          steps: [
            r`a / b * b + a % b = 3 × 2 + 1 = 7 (it rebuilds a); (double) a / b = 3.5.`,
            r`x > 5 is already true, so || stops: ++x never runs. y = 1 and x stays 10.`,
          ],
          answer: r`7 and 3.5; x = 10, y = 1.`,
        },
      ],
      traps: [
        r`= assigns, == compares: if (x = 0) is always false in C.`,
        r`Integer division happens BEFORE the result is stored in a double: double d = 7 / 2 gives 3.0.`,
      ],
      check: [
        { q: r`What is 17 % 5?`, a: r`2.` },
        { q: r`In a && b, when is b never evaluated?`, a: r`When a is false.` },
      ],
    },
    {
      name: 'Control Structures',
      inShort: r`Choosing (if, switch) and repeating (for, while, do-while).`,
      body: [
        r`**Selection** picks a path: if / else for conditions, switch for one value against several cases. **Repetition** loops: for when the count is known, while when it isn't (tested first, so it may run zero times), do-while when the body must run at least once (tested last):`,
        {
          type: 'blocks',
          alt: 'A do-while loop: start, then the body, then the test; if the test is true the flow goes back up to the body; if false it continues to the next statement.',
          caption: 'A do-while loop: the body runs before the first test, so it always runs at least once.',
          blocks: [
            { id: 'start', at: [0, 0], label: 'start' },
            { id: 'body', at: [0, 1], label: 'body' },
            { id: 'test', at: [0, 2], label: 'again ?' },
            { id: 'next', at: [0, 3], label: 'next' },
          ],
          links: [
            ['start', 'body'],
            ['body', 'test'],
            ['test', 'body', { label: 'yes', via: [[1, 2], [1, 1]] }],
            ['test', 'next', { label: 'no' }],
          ],
        },
        r`| Loop | Runs |
|---|---|
| for (i = a; i < b; i += s) | $\left\lceil\frac{b - a}{s}\right\rceil$ times |
| for (i = a; i <= b; i += s) | $\left\lfloor\frac{b - a}{s}\right\rfloor + 1$ times |
| while (false) { … } | 0 times |
| do { … } while (false); | once |`,
        r`Inside a loop, **break** leaves it and **continue** skips to the next pass. In a switch, a case without break **falls through** into the next one. Older languages loop with labels: FORTRAN's DO 10 I = 1, 5 runs I from 1 to 5, and the loop variable must not be changed inside it.`,
      ],
      keyIdeas: [
        r`for (i = a; i < b; i += s) runs $\left\lceil\frac{b - a}{s}\right\rceil$ times; with <= it runs $\left\lfloor\frac{b - a}{s}\right\rfloor + 1$.`,
        r`while tests first (may run zero times); do-while tests last (runs at least once).`,
        r`switch falls through to the next case without break; break leaves a loop, continue skips to the next pass.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Counting passes',
          problem: r`How many times does for (i = 0; i < 12; i += 3) run? And with i <= 12?`,
          steps: [
            r`$\frac{12}{3} = 4$ times (0, 3, 6, 9).`,
            r`With <=: $\frac{12}{3} + 1 = 5$ (12 too).`,
          ],
          answer: r`4; 5.`,
        },
        {
          level: 'board',
          title: 'A switch that falls through',
          problem: r`int s = 0, n = 2; switch (n) { case 1: s += 1; case 2: s += 2; case 3: s += 3; break; default: s += 10; } What is s?`,
          steps: [
            r`n = 2 jumps to case 2: s = 2.`,
            r`No break, so case 3 runs too: s = 5; then break. The default is skipped.`,
          ],
          answer: r`s = 5.`,
        },
      ],
      traps: [
        r`A missing break in a switch runs the following cases too.`,
        r`A semicolon right after for (…) makes the loop's body empty.`,
      ],
      check: [
        { q: r`Which loop always runs its body at least once?`, a: r`do-while.` },
        { q: r`What does continue do?`, a: r`Skips the rest of this pass and starts the next one.` },
      ],
    },
    {
      name: 'Functions',
      inShort: r`Named, reusable blocks of code with parameters and a return value.`,
      body: [
        r`A **function** (method, subroutine) packages a job: it takes **parameters**, does its work, and may **return** a value. In C and Java arguments are passed **by value**: the function gets copies, so changing them doesn't touch the caller's variables. Pass a pointer (C) or a reference to an object (Java) to let it change the original. **Overloading** gives several functions one name with different parameter lists.`,
        r`A **recursive** function calls itself on a smaller problem until a **base case** stops it. It is elegant, but a naive recursion can redo the same work exponentially often: fib(n) calls fib(n − 1) and fib(n − 2), which call the same smaller ones again. Remembering answers (memoisation) cuts it to one call per value:`,
        {
          type: 'plot',
          alt: 'Calls made to compute fib n against n from 0 to 15: the naive recursion grows exponentially, 15 calls at n equals 5 and 1973 at n equals 15; remembering answers, dashed, needs only n plus 1 calls.',
          caption: 'Calls to compute fib(n): naive recursion grows exponentially (1973 at n = 15); remembering answers (dashed) needs n + 1.',
          x: [0, 15],
          y: [0, 2100],
          xLabel: 'n',
          yLabel: 'calls',
          series: [
            { points: Array.from({ length: 16 }, (_, n) => [n, naiveCalls(n)]), label: 'naive', area: true },
            { points: Array.from({ length: 16 }, (_, n) => [n, n + 1]), label: 'remembered', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Parameters pass by value (a copy) or by reference/pointer (the original can change).`,
        r`Recursion: a function that calls itself, needing a base case. factorial(n) makes $n$ calls; naive Fibonacci $2F_{n+1} - 1$.`,
        r`Overloading: same name, different parameter lists.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Naive Fibonacci',
          problem: r`How many calls does a naive recursive fib(5) make (fib(0) = 0, fib(1) = 1)?`,
          steps: [r`$2F_6 - 1 = 2 \times 8 - 1 = 15$ calls, though fib(5) is only 5: the same values are computed again and again.`],
          answer: r`15 calls.`,
        },
        {
          level: 'board',
          title: 'A recursion that skips',
          problem: r`int f(int n) { return n <= 1 ? 1 : n * f(n - 2); } What is f(7), and how many calls does it make?`,
          steps: [
            r`f(7) = 7 × f(5) = 7 × 5 × f(3) = 7 × 5 × 3 × f(1), and f(1) = 1.`,
            r`f(7) = 105, from the calls f(7), f(5), f(3), f(1): 4 calls.`,
          ],
          answer: r`105; 4 calls.`,
        },
      ],
      traps: [
        r`A recursion without a reachable base case overflows the stack.`,
        r`A swap(int a, int b) that swaps its parameters changes nothing for the caller: they were copies.`,
      ],
      check: [
        { q: r`What stops a recursion?`, a: r`Its base case.` },
        { q: r`What is it called when two functions share a name but differ in parameters?`, a: r`Overloading.` },
      ],
    },
    {
      name: 'Arrays and Strings',
      inShort: r`Numbered lists of values, and text stored as arrays of characters.`,
      body: [
        r`An **array** holds n values of one type in a row of memory, numbered 0 to n − 1 in C and Java (1 to n in FORTRAN and MATLAB). Element i of a one-dimensional array sits at $B + iw$, w bytes apart. A two-dimensional array is laid out a row at a time in C and Java (**row-major**) or a column at a time in FORTRAN and MATLAB (**column-major**):

| Layout | Address of A[i][j], R rows × C columns, 0-based |
|---|---|
| Row-major (C, Java) | $B + (iC + j)w$ |
| Column-major (FORTRAN, MATLAB) | $B + (jR + i)w$ |`,
        r`A C **string** is a char array ending in the null character '\0', so "board" needs 6 bytes; strlen counts 5. Java strings are immutable objects: compare them with equals(), not ==.`,
      ],
      keyIdeas: [
        r`Indices run from 0 to $n - 1$; going past the end is an error (or silent corruption in C).`,
        r`Address of A[i][j] (row-major) $= B + (iC + j)w$; column-major $B + (jR + i)w$.`,
        r`A C string ends with '\0', so "board" takes 6 bytes; Java strings are objects and immutable.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A row-major address',
          problem: r`int A[3][4] (4-byte ints) starts at address 1000. Where is A[2][1]?`,
          steps: [r`$1000 + (2 \times 4 + 1) \times 4 = 1000 + 36 = 1036$.`],
          answer: r`1036.`,
        },
        {
          level: 'board',
          title: 'A column-major array, and a string',
          problem: r`A FORTRAN array A(5, 6) of 8-byte reals starts at address 500, stored by columns with indices from 1. Where is A(3, 4)? How many bytes does the C string "REE 2026" occupy?`,
          steps: [
            r`Before it come 3 full columns of 5 and 2 elements of column 4: $3 \times 5 + 2 = 17$.`,
            r`$500 + 17 \times 8 = 636$.`,
            r`8 characters (the space counts) plus '\0': 9 bytes.`,
          ],
          answer: r`636; 9 bytes.`,
        },
      ],
      traps: [
        r`In Java compare strings with equals(), not ==.`,
        r`Subtract 1 from each index when an array counts from 1.`,
      ],
      check: [
        { q: r`What is the last index of an array of 10 elements in C?`, a: r`9.` },
        { q: r`How does a C string mark its end?`, a: r`With the null character '\0'.` },
      ],
    },
    {
      name: 'Pointers',
      inShort: r`Variables that hold memory addresses (C and C++).`,
      body: [
        r`A **pointer** holds the address of another variable. & takes an address, * follows one:

| Expression | Means |
|---|---|
| int *p = &x; | p holds the address of x |
| *p | the value at that address (x itself) |
| *p = 5; | sets x to 5 |
| p + k | the address k ELEMENTS on: $k \times$ sizeof(type) bytes |
| *(p + k) | the same as p[k] |
| p = NULL | points nowhere |`,
        r`An array's name acts as a pointer to its first element, so arr[k] and *(arr + k) are the same thing. Pointers let a function change its caller's variables, and reach memory reserved while the program runs (malloc / free in C, new / delete in C++). Memory never freed **leaks**; memory used after it is freed is a bug waiting to happen.`,
      ],
      keyIdeas: [
        r`&x is the address of x; *p is the value at the address in p.`,
        r`p + k moves $k \times \text{sizeof}(T)$ bytes; $*(p + k)$ is the same as p[k].`,
        r`Dynamic memory: malloc/free (C), new/delete (C++); a null pointer points nowhere.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Stepping through an array',
          problem: r`int *p = arr; with arr at address 2000 and 4-byte ints. What address is p + 3, and what is *(p + 3)?`,
          steps: [r`$2000 + 3 \times 4 = 2012$; *(p + 3) is arr[3].`],
          answer: r`2012; arr[3].`,
        },
        {
          level: 'board',
          title: 'Doubles and a dereference',
          problem: r`double *q points to address 3000 (8-byte doubles): what address is q + 5? After int x = 10; int *p = &x; *p += 5; what is x? With char *s = "board"; what is *(s + 2)?`,
          steps: [
            r`$3000 + 5 \times 8 = 3040$.`,
            r`*p is x, so x becomes 15.`,
            r`s[2], the third character: 'a'.`,
          ],
          answer: r`3040; 15; 'a'.`,
        },
      ],
      traps: [
        r`Memory that is allocated and never freed leaks; using it after free is undefined.`,
        r`p + 1 moves one ELEMENT, not one byte.`,
      ],
      check: [
        { q: r`What does the & operator give?`, a: r`The address of its operand.` },
        { q: r`Is arr[k] the same as *(arr + k)?`, a: r`Yes.` },
      ],
    },
    {
      name: 'Object-Oriented Programming',
      inShort: r`Programs built from objects: data with the methods that act on it.`,
      body: [
        r`A **class** is a blueprint of data (fields) and behaviour (methods); an **object** is one instance of it, set up by a **constructor**. Object-oriented programming rests on four pillars: **encapsulation** (keep fields private, reach them through methods), **abstraction** (show what, hide how), **inheritance** (a subclass extends a superclass and reuses its code) and **polymorphism** (one call, different behaviour by the object's real class):`,
        {
          type: 'blocks',
          alt: 'A class diagram: Dog and Cat each extend Animal; arrows run from each subclass up to the superclass.',
          caption: 'Inheritance: Dog and Cat extend Animal, inheriting its fields and methods and overriding some.',
          blocks: [
            { id: 'animal', at: [1, 0], label: 'Animal' },
            { id: 'dog', at: [0, 1], label: 'Dog' },
            { id: 'cat', at: [2, 1], label: 'Cat' },
          ],
          links: [
            ['dog', 'animal', { label: 'extends' }],
            ['cat', 'animal', { label: 'extends' }],
          ],
        },
        r`A subclass can **override** an inherited method with its own version; which one runs is decided at run time by the object's actual class (dynamic dispatch). **Overloading**, by contrast, is resolved when compiling, by the arguments' types. Access is set by **public** (anyone), **protected** (subclasses and the package), default (the package) and **private** (the class only). An **abstract** class can't be instantiated; an **interface** lists methods a class promises to provide.`,
      ],
      keyIdeas: [
        r`A class is the blueprint, an object an instance; a constructor sets it up.`,
        r`Four pillars: encapsulation (private data, public methods), abstraction, inheritance (extends), polymorphism.`,
        r`Overloading is resolved when compiling; overriding (a subclass's version) when running.`,
        r`Access: public, protected, default (package), private.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Which speak() runs?',
          problem: r`Dog extends Animal and overrides speak(). After Animal a = new Dog(); which speak() does a.speak() run?`,
          steps: [r`Dog's: the method is chosen by the object's actual class at run time (dynamic dispatch), not by the variable's type.`],
          answer: r`Dog's speak().`,
        },
        {
          level: 'board',
          title: 'Constructors in a chain',
          problem: r`Animal's constructor prints "A"; Dog's constructor prints "D"; Puppy extends Dog and its constructor prints "P". What does new Puppy() print?`,
          steps: [
            r`A constructor first calls its superclass's constructor (super(), added automatically), all the way up.`,
            r`So Animal's runs first, then Dog's, then Puppy's: A D P.`,
          ],
          answer: r`A D P.`,
        },
      ],
      traps: [
        r`An abstract class can't be instantiated; an interface lists methods a class promises to provide.`,
        r`Superclass constructors run FIRST, not last.`,
      ],
      check: [
        { q: r`Which pillar keeps an object's fields private behind methods?`, a: r`Encapsulation.` },
        { q: r`Is overriding resolved when compiling or when running?`, a: r`When running.` },
      ],
    },
    {
      name: 'Exception Handling',
      inShort: r`Catching and handling errors at run time without crashing.`,
      body: [
        r`An **exception** is an error found while the program runs: a division by zero, a missing file, a null reference. Rather than crash, the program **throws** it, and the nearest matching **catch** handles it; a **finally** block runs whether or not anything was thrown, which makes it the place to close files and release resources:`,
        {
          type: 'blocks',
          alt: 'Exception flow: from try, an error goes to catch and then to finally; with no error, try goes straight to finally; after finally the program goes on.',
          caption: 'try, catch, finally: with an error the path runs through catch; either way it passes through finally.',
          blocks: [
            { id: 'try', at: [0, 0], label: 'try' },
            { id: 'catch', at: [2, 0], label: 'catch' },
            { id: 'finally', at: [2, 1], label: 'finally' },
            { id: 'next', at: [2, 2], label: 'go on' },
          ],
          links: [
            ['try', 'catch', { label: 'error' }],
            ['catch', 'finally'],
            ['try', 'finally', { label: 'no error', via: [[0, 1]] }],
            ['finally', 'next'],
          ],
        },
        r`In Java, **checked** exceptions (IOException) must be caught or declared with throws; **unchecked** ones (ArithmeticException, NullPointerException) needn't be. Catch blocks are tried in order, so list the specific ones before the general ones.`,
      ],
      keyIdeas: [
        r`try holds the risky code; catch handles a matching exception; finally always runs.`,
        r`throw raises an exception; Java's throws declares one a method may pass on.`,
        r`Java: checked exceptions (IOException) must be caught or declared; unchecked (NullPointerException) need not be.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'With and without an error',
          problem: r`try prints A, then a division by zero throws; catch (ArithmeticException e) prints B; finally prints C. What is printed? What if nothing is thrown?`,
          steps: [
            r`With the exception: A, then the rest of try is skipped; B; C.`,
            r`Without it: A C (catch is skipped, finally still runs).`,
          ],
          answer: r`A B C; A C.`,
        },
        {
          level: 'board',
          title: 'A return inside catch',
          problem: r`try { print("A"); throw new RuntimeException(); print("B"); } catch (RuntimeException e) { print("C"); return; } finally { print("D"); } print("E"); What is printed?`,
          steps: [
            r`A, then the throw skips B and jumps to catch: C.`,
            r`return would leave the method, but finally runs first: D. Then the method ends, so E never prints.`,
          ],
          answer: r`A C D.`,
        },
      ],
      traps: [
        r`Catch the most specific exception first, or the general one hides it.`,
        r`finally runs even when try or catch returns.`,
      ],
      check: [
        { q: r`Which block always runs?`, a: r`finally.` },
        { q: r`Must a Java method catch or declare an IOException?`, a: r`Yes: it is a checked exception.` },
      ],
    },
    {
      name: 'File Handling',
      inShort: r`Reading and writing data that lasts after the program ends.`,
      body: [
        r`Data in variables vanishes when the program ends; files keep it. Every file is opened, read or written, and closed:

| C mode | Opens for | If the file exists | If not |
|---|---|---|---|
| "r" | reading | reads from the start | fails |
| "w" | writing | ERASES it | creates it |
| "a" | appending | writes at the end | creates it |
| "r+" | reading and writing | keeps it | fails |
| add "b" | binary data | | |`,
        r`**Text** files hold characters, one line after another; **binary** files hold raw bytes, often in fixed-size records. Reading in order is **sequential** access; jumping straight to a byte with fseek (C) or seek (Java) is **random** access, where record k of size s starts at byte $ks$. How long a file takes to fill or send follows from its size and the data rate: bits over bits per second.`,
      ],
      keyIdeas: [
        r`Open, read or write, close. Modes: "r" read, "w" write (empties the file), "a" append, "b" binary.`,
        r`Text files hold characters; binary files hold raw bytes.`,
        r`Sequential access reads in order; random access jumps with fseek / seek.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Finding a record',
          problem: r`A binary file holds 100-byte records. At what byte offset does the 25th record start?`,
          steps: [r`It is record index 24, so $24 \times 100 = 2400$ bytes from the start.`],
          answer: r`2400.`,
        },
        {
          level: 'board',
          title: 'A data logger',
          problem: r`A logger writes readings at a steady 9600 bit/s. How long does it take to fill a 2 MB (2 × 1 048 576 bytes) file? Which record does fseek(fp, 30 * 64, SEEK_SET) reach in a file of 64-byte records?`,
          steps: [
            r`$\frac{2 \times 1\,048\,576 \times 8}{9600} = 1748$ s, about 29.1 minutes.`,
            r`Offset $30 \times 64$ is the start of record index 30: the 31st record.`,
          ],
          answer: r`About 29.1 min; the 31st record.`,
        },
      ],
      traps: [
        r`Opening an existing file with "w" erases it.`,
        r`Rates are in BITS per second, sizes in BYTES: multiply by 8.`,
      ],
      check: [
        { q: r`Which mode adds to the end of a file without erasing it?`, a: r`"a" (append).` },
        { q: r`What function jumps to a byte position in a C file?`, a: r`fseek.` },
      ],
    },
    {
      name: 'Graphical User Interfaces',
      inShort: r`Windows, buttons and forms, driven by the user's events.`,
      body: [
        r`A GUI program is **event-driven**: instead of running top to bottom, it sets up its window and waits. Each click, key press or timer tick is an **event**, delivered to the **listener** (handler) registered for it. **Widgets** such as buttons, text fields and labels are arranged by **layout managers**.`,
        r`Larger programs keep three jobs apart in the **Model–View–Controller** pattern: the model holds the data and rules, the view draws them, and the controller turns the user's input into changes to the model:`,
        {
          type: 'blocks',
          alt: 'Model, view, controller: the controller updates the model; the model tells the view it changed; the user acts on the view, which passes the input back to the controller.',
          caption: 'Model–View–Controller: input goes to the controller, changes to the model, and the view redraws.',
          blocks: [
            { id: 'ctrl', at: [0, 1], label: 'Controller' },
            { id: 'model', at: [1, 0], label: 'Model' },
            { id: 'view', at: [2, 1], label: 'View' },
          ],
          links: [
            ['ctrl', 'model', { label: 'update', via: [[0, 0]] }],
            ['model', 'view', { label: 'changed', via: [[2, 0]] }],
            ['view', 'ctrl', { label: 'user input' }],
          ],
        },
      ],
      keyIdeas: [
        r`Event-driven: the program waits; a click or key press calls the listener registered for it.`,
        r`Widgets (buttons, text fields, labels) are placed by layout managers.`,
        r`Model-View-Controller keeps the data, its display and the input handling apart.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A frozen window',
          problem: r`A long calculation runs inside a button's click handler and the window stops responding until it finishes. Why, and what is the fix?`,
          steps: [
            r`The handler runs on the interface's own (event) thread, so nothing redraws until it returns.`,
            r`Run the work on a background thread and update the window when it's done.`,
          ],
          answer: r`It blocks the event thread; move the work to a background thread.`,
        },
        {
          level: 'board',
          title: 'A listener added twice',
          problem: r`A button's listener adds 1 to a counter. By mistake the same listener is registered twice. The user clicks 3 times: what does the counter show?`,
          steps: [
            r`Every registered listener hears every click: 2 calls per click.`,
            r`$3 \times 2 = 6$.`,
          ],
          answer: r`6.`,
        },
      ],
      traps: [
        r`Update the interface only from its own thread.`,
        r`Registering a listener twice makes it run twice per event.`,
      ],
      check: [
        { q: r`In MVC, which part holds the data?`, a: r`The model.` },
        { q: r`What calls a GUI program's handler code?`, a: r`Events, such as a click, delivered to the registered listener.` },
      ],
    },
  ],
};
