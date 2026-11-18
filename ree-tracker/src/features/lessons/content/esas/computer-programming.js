// Library › Lessons › ESAS › Computer Programming (2026-11-18): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by running the code. Examples are in C or
// Java, the languages board items use most. Number systems and logic are in
// Microprocessor Systems and Logic Circuits.
const r = String.raw;

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
      keyIdeas: [
        r`Flowchart shapes: oval (start/end), parallelogram (input/output), rectangle (process), diamond (decision), circle (connector).`,
        r`Every algorithm uses three structures: sequence, selection (if) and repetition (loops).`,
        r`Growth: $O(1) < O(\log n) < O(n) < O(n\log n) < O(n^2) < O(2^n)$. Binary search needs at most $\lfloor\log_2 n\rfloor + 1$ comparisons.`,
      ],
      example: {
        problem: r`At most how many comparisons does binary search need on 1000 sorted items? How many does bubble sort make on 100 items?`,
        solution: r`$\lfloor\log_2 1000\rfloor + 1 = 9 + 1 = 10$. Bubble sort: $\frac{100(99)}{2} = 4950$, against about $100\log_2 100 \approx 664$ for merge sort.`,
      },
      traps: [r`Binary search works only on SORTED data.`],
    },
    {
      name: 'Variables and Data Types',
      inShort: r`Named storage, the kinds of values it can hold, and their limits.`,
      keyIdeas: [
        r`Integers: an $n$-bit signed type holds $-2^{n-1}$ to $2^{n-1} - 1$ (int is 32 bits: about ±2.1 billion).`,
        r`Floats follow IEEE 754: float about 7 significant digits, double about 15–16.`,
        r`char, boolean; constants (final, const); a variable's scope is the block it is declared in.`,
      ],
      example: {
        problem: r`What range does a 16-bit signed short hold, and what does 32767 + 1 give in one?`,
        solution: r`$-32\,768$ to $32\,767$. Adding 1 to 32767 overflows and wraps to $-32\,768$.`,
      },
      traps: [r`0.1 + 0.2 is not exactly 0.3 in floating point: compare with a tolerance.`],
    },
    {
      name: 'Operators and Expressions',
      inShort: r`Arithmetic, comparison, logical and assignment operators, and the order they run in.`,
      keyIdeas: [
        r`Precedence: () → unary (!, ++, --) → * / % → + − → < > → == != → && → || → assignment.`,
        r`Integer division truncates: $17 / 5 = 3$, $17 \% 5 = 2$; in C and Java $-7 / 2 = -3$, in Python $-7 // 2 = -4$.`,
        r`x++ uses then increments; ++x increments then uses. && and || short-circuit.`,
      ],
      example: {
        problem: r`In Java: int x = 5; int y = x++ + ++x * 2; What are x and y?`,
        solution: r`Left to right: x++ gives 5 (x becomes 6); ++x makes x 7 and gives 7; $7 \times 2 = 14$. So y = 5 + 14 = 19 and x = 7.`,
      },
      traps: [r`= assigns, == compares: if (x = 0) is always false in C.`],
    },
    {
      name: 'Control Structures',
      inShort: r`Choosing (if, switch) and repeating (for, while, do-while).`,
      keyIdeas: [
        r`for (i = a; i < b; i += s) runs $\left\lceil\frac{b - a}{s}\right\rceil$ times; with <= it runs $\left\lfloor\frac{b - a}{s}\right\rfloor + 1$.`,
        r`while tests first (may run zero times); do-while tests last (runs at least once).`,
        r`switch falls through to the next case without break; break leaves a loop, continue skips to the next pass.`,
      ],
      example: {
        problem: r`How many times does for (i = 0; i < 12; i += 3) run? And with i <= 12?`,
        solution: r`$\frac{12}{3} = 4$ times (0, 3, 6, 9). With <=: $\frac{12}{3} + 1 = 5$ (12 too).`,
      },
      traps: [r`A missing break in a switch runs the following cases too.`],
    },
    {
      name: 'Functions',
      inShort: r`Named, reusable blocks of code with parameters and a return value.`,
      keyIdeas: [
        r`Parameters pass by value (a copy) or by reference/pointer (the original can change).`,
        r`Recursion: a function that calls itself, needing a base case. factorial(n) makes $n$ calls; naive Fibonacci $2F_{n+1} - 1$.`,
        r`Overloading: same name, different parameter lists.`,
      ],
      example: {
        problem: r`How many calls does a naive recursive fib(5) make (fib(0) = 0, fib(1) = 1)?`,
        solution: r`$2F_6 - 1 = 2(8) - 1 = 15$ calls, though fib(5) is only 5: the same values are computed again and again.`,
      },
      traps: [r`A recursion without a reachable base case overflows the stack.`],
    },
    {
      name: 'Arrays and Strings',
      inShort: r`Numbered lists of values, and text stored as arrays of characters.`,
      keyIdeas: [
        r`Indices run from 0 to $n - 1$; going past the end is an error (or silent corruption in C).`,
        r`Address of A[i][j] (row-major) $= B + (iC + j)w$.`,
        r`A C string ends with '\0', so "board" takes 6 bytes; Java strings are objects and immutable.`,
      ],
      example: {
        problem: r`int A[3][4] (4-byte ints) starts at address 1000. Where is A[2][1]?`,
        solution: r`$1000 + (2 \times 4 + 1) \times 4 = 1000 + 36 = 1036$.`,
      },
      traps: [r`In Java compare strings with equals(), not ==.`],
    },
    {
      name: 'Pointers',
      inShort: r`Variables that hold memory addresses (C and C++).`,
      keyIdeas: [
        r`&x is the address of x; *p is the value at the address in p.`,
        r`p + k moves $k \times \text{sizeof}(T)$ bytes; $*(p + k)$ is the same as p[k].`,
        r`Dynamic memory: malloc/free (C), new/delete (C++); a null pointer points nowhere.`,
      ],
      example: {
        problem: r`int *p = arr; with arr at address 2000 and 4-byte ints. What address is p + 3, and what is *(p + 3)?`,
        solution: r`$2000 + 3 \times 4 = 2012$; *(p + 3) is arr[3].`,
      },
      traps: [r`Memory that is allocated and never freed leaks; using it after free is undefined.`],
    },
    {
      name: 'Object-Oriented Programming',
      inShort: r`Programs built from objects: data with the methods that act on it.`,
      keyIdeas: [
        r`A class is the blueprint, an object an instance; a constructor sets it up.`,
        r`Four pillars: encapsulation (private data, public methods), abstraction, inheritance (extends), polymorphism.`,
        r`Overloading is resolved when compiling; overriding (a subclass's version) when running.`,
        r`Access: public, protected, default (package), private.`,
      ],
      example: {
        problem: r`Dog extends Animal and overrides speak(). After Animal a = new Dog(); which speak() does a.speak() run?`,
        solution: r`Dog's: the method is chosen by the object's actual class at run time (dynamic dispatch), not by the variable's type.`,
      },
      traps: [r`An abstract class can't be instantiated; an interface lists methods a class promises to provide.`],
    },
    {
      name: 'Exception Handling',
      inShort: r`Catching and handling errors at run time without crashing.`,
      keyIdeas: [
        r`try holds the risky code; catch handles a matching exception; finally always runs.`,
        r`throw raises an exception; Java's throws declares one a method may pass on.`,
        r`Java: checked exceptions (IOException) must be caught or declared; unchecked (NullPointerException) need not be.`,
      ],
      example: {
        problem: r`try prints A, then a division by zero throws; catch (ArithmeticException e) prints B; finally prints C. What is printed? What if nothing is thrown?`,
        solution: r`With the exception: A B C. Without it: A C (catch is skipped, finally still runs).`,
      },
      traps: [r`Catch the most specific exception first, or the general one hides it.`],
    },
    {
      name: 'File Handling',
      inShort: r`Reading and writing data that lasts after the program ends.`,
      keyIdeas: [
        r`Open, read or write, close. Modes: "r" read, "w" write (empties the file), "a" append, "b" binary.`,
        r`Text files hold characters; binary files hold raw bytes.`,
        r`Sequential access reads in order; random access jumps with fseek / seek.`,
      ],
      example: {
        problem: r`A binary file holds 100-byte records. At what byte offset does the 25th record start?`,
        solution: r`It is record index 24, so $24 \times 100 = 2400$ bytes from the start.`,
      },
      traps: [r`Opening an existing file with "w" erases it.`],
    },
    {
      name: 'Graphical User Interfaces',
      inShort: r`Windows, buttons and forms, driven by the user's events.`,
      keyIdeas: [
        r`Event-driven: the program waits; a click or key press calls the listener registered for it.`,
        r`Widgets (buttons, text fields, labels) are placed by layout managers.`,
        r`Model-View-Controller keeps the data, its display and the input handling apart.`,
      ],
      example: {
        problem: r`A long calculation runs inside a button's click handler and the window stops responding until it finishes. Why, and what is the fix?`,
        solution: r`The handler runs on the interface's own (event) thread, so nothing redraws until it returns. Run the work on a background thread and update the window when it's done.`,
      },
      traps: [r`Update the interface only from its own thread.`],
    },
  ],
};
