'use strict';

// ESAS › Computer Programming formula cards (Library round, 2026-11-18): the
// topic had no cards. Programming is mostly reading and tracing code, so these
// are the numbers a board item asks for: how many times a loop runs, a type's
// range, integer division and remainder, where an array element sits in
// memory, IEEE 754 floats, and how fast common algorithms grow. The ideas
// with nothing to compute (flowchart symbols, precedence, OOP, exceptions,
// files, GUIs) are taught in the lesson instead. Number systems
// and Boolean logic are in Microprocessor Systems and Logic Circuits. See
// mathematics/algebra.js for the format; tests/programmingAndLogicFormulas.test.js
// checks each by running the code it describes.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const ALG = 'Algorithms and Flowcharts';
const TYPES = 'Variables and Data Types';
const OPS = 'Operators and Expressions';
const CTRL = 'Control Structures';
const FUNC = 'Functions';
const ARR = 'Arrays and Strings';
const PTR = 'Pointers';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const N_ = v(r`$n$`, 'size of the input');

const drafts = [
    // Algorithms and Flowcharts
    P(ALG, null, 'Growth Rates of Common Algorithms', r`$O(\cdot)$`, r`$O(1) < O(\log n) < O(n) < O(n\log n) < O(n^2) < O(2^n) < O(n!)$`,
        [N_],
        'How the running time grows with the input: lookup O(1), binary search O(log n), linear search O(n), merge sort O(n log n), bubble sort O(n²).',
        'Big-O keeps only the fastest-growing term and drops constants: 3n² + 5n + 2 is O(n²).'),
    P(ALG, null, 'Binary Search Comparisons', r`$\lfloor\log_2 n\rfloor + 1$`, r`$\text{worst case} = \lfloor\log_2 n\rfloor + 1 \text{ comparisons}$`,
        [N_],
        'The most comparisons binary search needs on a sorted list of n items.',
        '1000 items: at most 10; a million: at most 20. Linear search may need all n.'),
    P(ALG, null, 'Comparisons in Simple Sorts', r`$\frac{n(n - 1)}{2}$`, r`$\text{bubble or selection sort: } \frac{n(n - 1)}{2} \text{ comparisons};\qquad \text{merge sort: about } n\log_2 n$`,
        [N_],
        'How many comparisons the classic sorts make on n items.',
        '100 items: 4950 for bubble sort against about 664 for merge sort.'),
    // Variables and Data Types
    P(TYPES, null, 'Range of an n-Bit Integer', r`$-2^{n-1} \le x \le 2^{n-1} - 1$`, r`$\text{unsigned: } 0 \text{ to } 2^n - 1;\qquad \text{signed (two\'s complement): } -2^{n-1} \text{ to } 2^{n-1} - 1$`,
        [v(r`$n$`, 'bits in the type (char 8, short 16, int 32, long long 64)')],
        'The smallest and largest values an integer type holds.',
        'Going past the top wraps around: a signed 8-bit 127 + 1 gives −128 (overflow).'),
    P(TYPES, null, 'IEEE 754 Floating Point', r`$(-1)^s \times 1.f \times 2^{e - \text{bias}}$`, r`$x = (-1)^s \times 1.f \times 2^{e - \text{bias}};\qquad \text{single: 1 + 8 + 23 bits, bias 127};\ \text{double: 1 + 11 + 52 bits, bias 1023}$`,
        [v(r`$s$`, 'sign bit'), v(r`$e$`, 'stored exponent'), v(r`$f$`, 'fraction (mantissa) bits')],
        'How a float or double is stored: sign, biased exponent and fraction.',
        '0.1 has no exact binary form, so 0.1 + 0.2 ≠ 0.3 exactly: compare floats with a tolerance.'),
    // Operators and Expressions
    P(OPS, null, 'Integer Division and Remainder', r`$a = (a / b)b + a \% b$`, r`$a = \left(\frac{a}{b}\right)_{\text{int}} b + (a \bmod b)$`,
        [v(r`$a, b$`, 'integers, b ≠ 0')],
        'Integer division drops the fraction; the remainder is what is left over.',
        'C, C++ and Java truncate toward zero: −7 / 2 = −3 and −7 % 2 = −1. Python floors: −7 // 2 = −4, −7 % 2 = 1.'),
    P(OPS, null, 'Pre- and Post-Increment', r`$\text{++}x \text{ vs } x\text{++}$`, r`$y = \text{++}x:\ x \leftarrow x + 1,\ y \leftarrow x;\qquad y = x\text{++}:\ y \leftarrow x,\ x \leftarrow x + 1$`,
        [v(r`$x$`, 'the variable incremented'), v(r`$y$`, 'the value the expression gives')],
        'Prefix changes the variable before its value is used; postfix after.',
        'x = 5; y = x++ + ++x gives y = 5 + 7 = 12 in Java; in C, changing x twice in one expression is undefined.'),
    // Control Structures
    P(CTRL, null, 'Loop Iteration Count', r`$\left\lceil\frac{b - a}{s}\right\rceil$`, r`$\text{for } (i = a;\ i < b;\ i \mathrel{+}= s) \text{ runs } \max\left(0, \left\lceil\frac{b - a}{s}\right\rceil\right) \text{ times}$`,
        [v(r`$a, b$`, 'start and end (excluded) values'), v(r`$s$`, 'step, positive')],
        'How many times a counting loop runs.',
        'With i <= b it runs ⌊(b − a)/s⌋ + 1 times: off-by-one errors live here.'),
    P(CTRL, null, 'Nested Loop Count', r`$\frac{n(n + 1)}{2}$`, r`$\text{for } i = 1..n,\ j = 1..n: n^2;\qquad j = 1..i: \frac{n(n + 1)}{2};\qquad j = i + 1..n: \frac{n(n - 1)}{2}$`,
        [N_],
        'How many times the inner body of two nested loops runs.',
        'A triangular loop is still O(n²).'),
    // Functions
    P(FUNC, null, 'Recursion Depth and Calls', r`$\text{calls}$`, r`$\text{factorial}(n): n \text{ calls};\qquad \text{naive fib}(n): 2F_{n+1} - 1 \text{ calls}$`,
        [N_, v(r`$F_k$`, 'the kth Fibonacci number')],
        'How much work a recursive function does: a linear chain, or a tree that branches.',
        'Every recursion needs a base case; without one the stack overflows.'),
    // Arrays and Strings
    P(ARR, null, 'Address of an Array Element', r`$\text{addr}(A[i]) = B + i \cdot w$`, r`$\text{addr}(A[i]) = B + i\,w;\qquad \text{2-D row-major: } \text{addr}(A[i][j]) = B + (iC + j)\,w$`,
        [v(r`$B$`, 'base address of A[0]'), v(r`$w$`, 'bytes per element'), v(r`$C$`, 'number of columns'), v(r`$i, j$`, 'zero-based indices')],
        'Where an element sits in memory, counting from the array\'s start.',
        'C and Java index from 0: an array of n elements runs A[0] to A[n − 1]. Fortran and MATLAB are column-major and start at 1.', 'bytes'),
    P(ARR, null, 'Storage of a C String', r`$n + 1$`, r`$\text{a string of } n \text{ characters needs } n + 1 \text{ bytes (the terminating }\backslash 0)$`,
        [N_],
        'C ends every string with a null character, which takes a byte of its own.',
        'strlen("board") = 5, but char s[] = "board" uses 6 bytes.', 'bytes'),
    // Pointers
    P(PTR, null, 'Pointer Arithmetic', r`$p + k$`, r`$p + k \text{ points } k \cdot \text{sizeof}(T) \text{ bytes past } p;\qquad *(p + k) \equiv p[k]$`,
        [v(r`$p$`, 'pointer to type T'), v(r`$k$`, 'integer offset')],
        'Adding to a pointer moves it by whole elements, not bytes.',
        'Subtracting two pointers into one array gives the number of elements between them.'),
];

module.exports = { subject: 'ESAS', topic: 'Computer Programming', migration: '20261220000000_cards_computer_programming', file, revisions, retire, drafts };
