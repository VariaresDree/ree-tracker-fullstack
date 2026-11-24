// Library › Lessons › EE › Feedback Control Systems
// (2026-11-19; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// feedbackLesson.test.js. Coverage and problem styles cross-checked against a
// review center's instruments-and-control handout; the text, problems and
// figures are this app's own): written for the Philippine REE board, subtopic by
// subtopic in the syllabus's order. Second-order basics (ζ, ω_n, overshoot) are
// also in Electrical Transient Analysis; Ziegler–Nichols tuning and
// proportional band in Instrumentation & Control.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Closed-loop poles of K/(s(s+2)(s+4)): roots of s³ + 6s² + 8s + K, for the
// root-locus figure. The real root below −4 by bisection, the other two from
// the quadratic left after dividing it out.
function lociAt(K) {
  let lo = -20;
  let hi = -4;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (mid ** 3 + 6 * mid ** 2 + 8 * mid + K > 0) hi = mid; else lo = mid;
  }
  const r1 = (lo + hi) / 2;
  const b = 6 + r1;
  const c = 8 + b * r1;
  const disc = b * b - 4 * c;
  const pair = disc >= 0
    ? [[(-b + Math.sqrt(disc)) / 2, 0], [(-b - Math.sqrt(disc)) / 2, 0]]
    : [[-b / 2, Math.sqrt(-disc) / 2], [-b / 2, -Math.sqrt(-disc) / 2]];
  return [...pair, [r1, 0]];
}
const GAINS = Array.from({ length: 241 }, (_, i) => (i / 240) ** 2 * 150);
const branch = (k) => GAINS.map((K) => lociAt(K)[k]);

// GH(jω) = 4/(jω + 1)³ for the Nyquist figure, ω from 0 up (and its mirror).
const nyquist = (sign) => Array.from({ length: 400 }, (_, i) => {
  const w = sign * Math.tan((i / 400) * (Math.PI / 2) * 0.985);
  const mag = 4 / (1 + w * w) ** 1.5;
  const ph = -3 * Math.atan(w);
  return [mag * Math.cos(ph), mag * Math.sin(ph)];
});

// Unit step response of ζ = 0.5, ω_n = 4.
const WD = 4 * Math.sqrt(0.75);
const step2 = (t) => 1 - Math.exp(-2 * t) * (Math.cos(WD * t) + (0.5 / Math.sqrt(0.75)) * Math.sin(WD * t));

export default {
  topic: 'Feedback Control Systems',
  subject: 'EE',
  overview: r`A feedback system measures its output, compares it with what you asked for, and acts on the difference. This topic is the toolkit for describing such a loop (models, transfer functions, block diagrams, signal flow graphs), judging how it behaves (time response, steady-state error), deciding whether it is stable (Routh, root locus, Bode, Nyquist, margins) and fixing it (PID, lead and lag compensators). State space is the matrix form of the same ideas. Board problems are mostly short calculations: reduce a diagram, find an overshoot or an error constant, the K for marginal stability, or a phase margin.`,
  sources: [
    'Modern Control Engineering (Ogata)',
    'Control Systems Engineering (Nise)',
    'Automatic Control Systems (Kuo and Golnaraghi)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'System Modeling',
      inShort: r`Write the physics as differential equations, then as transfer functions with zero initial conditions.`,
      body: [
        r`A **control system** is an arrangement of components that commands, directs or regulates itself or another system. In an **open-loop** system the control action does not depend on the output (a toaster's timer); in a **closed-loop** (feedback) system it does (a thermostat). A feedback system whose output is a mechanical position, or its speed or acceleration, is a **servomechanism**; one that holds an output steady against disturbances is a **regulator**.`,
        r`Analysis starts with a model: the physics written as differential equations. A system is **linear** if it obeys **superposition**: the response to a sum of inputs is the sum of the responses. Its total response has a **transient** (free, natural) part that dies away and a **steady-state** (forced) part that remains.`,
        r`Mechanical systems have electrical **analogues** with the same equations:`,
        r`| Mechanical | Force–voltage (mass–inductance) | Force–current (mass–capacitance) |
|---|---|---|
| Force F | voltage v | current i |
| Velocity | current i | voltage v |
| Damping b | resistance R | conductance G |
| Mass m | inductance L | capacitance C |
| Spring k | elastance $\frac{1}{C}$ | $\frac{1}{L}$ |`,
        r`In the force–voltage analogy, elements that move together (sharing one velocity) become a series loop sharing one current, so a mass on a spring with a damper is a series RLC circuit:`,
        {
          type: 'circuit',
          alt: 'The force-voltage analogue of a 2 kg mass on a 50 newton per metre spring with a 4 newton second per metre damper: a voltage source driving a series loop of a 4 ohm resistor, a 2 henry inductor and a 0.02 farad capacitor.',
          caption: 'Mass 2 kg, damper 4 N·s/m, spring 50 N/m: L = 2 H, R = 4 Ω, C = 0.02 F in series.',
          parts: [
            ['V', [0, 1], [0, 0], 'F'],
            ['R', [0, 0], [2, 0], '4 Ω'],
            ['L', [2, 0], [4, 0], '2 H'],
            ['C', [4, 0], [4, 1], '0.02 F'],
            ['wire', [4, 1], [0, 1]],
          ],
        },
        r`Taking Laplace transforms with zero initial conditions turns the equation into a transfer function: $m\ddot x + b\dot x + kx = F$ gives $\frac{X}{F} = \frac{1}{ms^2 + bs + k}$.`,
      ],
      keyIdeas: [
        r`Open loop: action independent of output; closed loop: action depends on it (feedback).`,
        r`Mass–spring–damper: $m\ddot x + b\dot x + kx = F$, so $\frac{X}{F} = \frac{1}{ms^2 + bs + k}$.`,
        r`Force–voltage analogy: $m \leftrightarrow L$, $b \leftrightarrow R$, $k \leftrightarrow \frac{1}{C}$, $x \leftrightarrow q$.`,
        r`Inertia seen through gears scales by the turns ratio squared: $J_{eq} = J_1 + J_2\left(\frac{N_1}{N_2}\right)^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The electrical analogue',
          problem: r`A 2 kg mass on a 50 N/m spring has a 4 N·s/m damper. Find its force–voltage analogue, $\omega_n$ and $\zeta$.`,
          steps: [
            r`$L = 2$ H, $R = 4$ Ω, $C = \frac{1}{50} = 0.02$ F.`,
            r`$\omega_n = \sqrt{\frac{50}{2}} = 5$ rad/s; $\zeta = \frac{4}{2\sqrt{50 \times 2}} = 0.2$.`,
          ],
          answer: r`2 H, 4 Ω, 0.02 F; 5 rad/s; 0.2.`,
        },
        {
          level: 'board',
          title: 'A motor and its load',
          problem: r`A motor drives a load of inertia 0.5 kg·m² and viscous friction 2 N·m·s, with torque $4i$ N·m from its current: $0.5\ddot\theta + 2\dot\theta = 4i$. Find $\frac{\Theta(s)}{I(s)}$.`,
          steps: [
            r`Transform: $(0.5s^2 + 2s)\Theta = 4I$.`,
            r`$\frac{\Theta}{I} = \frac{4}{s(0.5s + 2)} = \frac{8}{s(s + 4)}$.`,
          ],
          answer: r`$\frac{8}{s(s + 4)}$.`,
        },
      ],
      traps: [
        r`In the force–voltage analogy the spring maps to the INVERSE of capacitance, not to C.`,
        r`The two analogies swap series and parallel: forces in series become parallel elements in the force–current analogy.`,
      ],
      check: [
        { q: r`A feedback system controlling a shaft's position is called what?`, a: r`A servomechanism.` },
        { q: r`In the force–current analogy, what does a mass become?`, a: r`A capacitance.` },
      ],
    },
    {
      name: 'Transfer Functions',
      inShort: r`Output over input in the Laplace domain: its poles set the behaviour, its zeros shape it.`,
      body: [
        r`The **transfer function** $G(s) = \frac{Y(s)}{X(s)}$ is the ratio of the output's Laplace transform to the input's, with all initial conditions zero. It depends only on the system, not on the input. The roots of its denominator are the **poles**, which set the kinds of motion (decaying, oscillating, growing); the roots of its numerator are the **zeros**. A system is **stable** (bounded-input, bounded-output) when every pole lies in the left half-plane.`,
        r`Useful transforms and theorems: an impulse transforms to 1, a step to $\frac{1}{s}$, a ramp to $\frac{1}{s^2}$. The **initial value** is $f(0^+) = \lim_{s\to\infty}sF(s)$ and the **final value** $f(\infty) = \lim_{s\to0}sF(s)$ (if the system settles).`,
        r`A **first-order** system $\frac{K}{\tau s + 1}$ responds to a step by rising exponentially to K, reaching 63.2% at one time constant:`,
        {
          type: 'plot',
          alt: 'The step response of 5 over 0.5 s plus 1: rising from zero toward 5 V, reaching 3.16 V at the 0.5 second time constant and settling within 2 seconds.',
          caption: 'G = 5/(0.5s + 1) on a 1 V step: 3.16 V (63.2%) at τ = 0.5 s, settled by 2 s.',
          x: [0, 3],
          y: [0, 5.5],
          xLabel: 't (s)',
          yLabel: 'y (V)',
          series: [{ f: (t) => 5 * (1 - Math.exp(-t / 0.5)), label: 'y', area: true }],
          marks: [{ x: 0.5, label: 'τ' }],
        },
      ],
      keyIdeas: [
        r`Poles are the roots of the denominator, zeros of the numerator; DC gain is $G(0)$.`,
        r`Impulse ↔ 1, step ↔ $\frac{1}{s}$; initial value $\lim_{s\to\infty}sF$, final value $\lim_{s\to0}sF$.`,
        r`First order $\frac{K}{\tau s + 1}$: 63.2% at $\tau$, rise time $2.2\tau$, 2% settling $4\tau$.`,
        r`DC motor speed: $\frac{\Omega}{V} = \frac{K}{(Js + b)(Ls + R) + K^2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A first-order step',
          problem: r`$G(s) = \frac{5}{0.5s + 1}$ gets a 1 V step. Find the final value, the output at 0.5 s, the rise time and the 2% settling time.`,
          steps: [
            r`Final value $G(0) = 5$ V; at $t = \tau = 0.5$ s it is $0.632 \times 5 = 3.16$ V.`,
            r`Rise time $2.2 \times 0.5 = 1.1$ s; settling $4 \times 0.5 = 2$ s.`,
          ],
          answer: r`5 V; 3.16 V; 1.1 s; 2 s.`,
        },
        {
          level: 'board',
          title: 'Initial and final values',
          problem: r`Find the initial value of $f(t)$ if $F(s) = \frac{3s + 2}{s^2 + 4s + 5}$. Find the final value of the unit step response of $G(s) = \frac{20}{(s + 2)(s + 5)}$.`,
          steps: [
            r`$f(0^+) = \lim_{s\to\infty}\frac{s(3s + 2)}{s^2 + 4s + 5} = 3$.`,
            r`$y(\infty) = \lim_{s\to0}s \times \frac{1}{s} \times \frac{20}{(s + 2)(s + 5)} = \frac{20}{10} = 2$.`,
          ],
          answer: r`3; 2.`,
        },
      ],
      traps: [
        r`DC gain is $G(0)$, not the numerator constant: $\frac{20}{(s+2)(s+5)}$ has DC gain 2.`,
        r`The final value theorem holds only if the system settles: check the poles first.`,
      ],
      check: [
        { q: r`What is the Laplace transform of a unit impulse?`, a: r`1.` },
        { q: r`Does a transfer function depend on the input?`, a: r`No: only on the system's parameters.` },
      ],
    },
    {
      name: 'Block Diagrams',
      inShort: r`Blocks in series multiply, in parallel add; a negative feedback loop becomes $\frac{G}{1 + GH}$.`,
      body: [
        r`A **block diagram** shows a system as blocks (transfer functions), **summing points** (with their signs) and **takeoff points**. The basic loop feeds the output back through H to be subtracted from the input:`,
        {
          type: 'blocks',
          alt: 'A negative feedback loop: the input R enters a summing point marked plus, passes through G to the output C; a takeoff point feeds C back through H to the summing point, marked minus.',
          caption: 'The basic feedback loop: C/R = G/(1 + GH).',
          blocks: [
            { id: 'sum', at: [1, 0], kind: 'sum' },
            { id: 'G', at: [2, 0], label: 'G(s)' },
            { id: 'pt', at: [3, 0], kind: 'point' },
            { id: 'H', at: [2, 1], label: 'H(s)' },
          ],
          links: [
            [[0, 0], 'sum', { label: 'R', sign: '+' }],
            ['sum', 'G'],
            ['G', 'pt'],
            ['pt', [4, 0], { label: 'C' }],
            ['pt', 'H', { via: [[3, 1]] }],
            ['H', 'sum', { sign: '−', via: [[1, 1]] }],
          ],
        },
        r`Reduce a diagram with a few rules: blocks in **series** multiply; blocks in **parallel** add; a loop becomes $\frac{G}{1 \pm GH}$ (plus for negative feedback, minus for positive); moving a summing or takeoff point past a block needs a compensating block (G or $\frac{1}{G}$).`,
        r`Feedback is worth its cost: with high loop gain the closed loop barely depends on G (**sensitivity** $S = \frac{1}{1 + GH}$), disturbances and distortion are suppressed, and bandwidth widens, at the price of gain and a risk of instability. Too wide a bandwidth also lets in noise.`,
      ],
      keyIdeas: [
        r`Closed loop $T = \frac{G}{1 + GH}$; characteristic equation $1 + GH = 0$.`,
        r`Moving a summing point or takeoff point past a block needs a compensating block ($G$ or $\frac{1}{G}$).`,
        r`Sensitivity to the plant $S = \frac{1}{1 + GH}$: high loop gain makes $T$ insensitive to $G$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sensitivity',
          problem: r`A loop has $G = 100$ and $H = 0.1$. Find $T$, and how much $T$ changes when $G$ drops 10%.`,
          steps: [
            r`$T = \frac{100}{1 + 10} = 9.09$.`,
            r`$S = \frac{1}{11} = 0.091$, so $T$ changes by only $0.091 \times 10\% = 0.91\%$.`,
          ],
          answer: r`9.09; about 0.91%.`,
        },
        {
          level: 'board',
          title: 'Parallel paths with positive feedback',
          problem: r`The input feeds a summing point; its output goes through $G_1$ and $G_2$ in parallel, which add to give C. $G_1$'s output is also fed back through $H_1$ to the first summing point with a PLUS sign. Find $\frac{C}{R}$, and its value for $G_1 = 4$, $G_2 = 1$, $H_1 = 0.1$.`,
          steps: [
            r`The loop is through $G_1$ and $H_1$, positive: the signal after the summing point is $\frac{R}{1 - G_1H_1}$.`,
            r`That signal passes through $G_1 + G_2$: $\frac{C}{R} = \frac{G_1 + G_2}{1 - G_1H_1}$.`,
            r`$\frac{4 + 1}{1 - 0.4} = 8.33$.`,
          ],
          answer: r`$\frac{G_1 + G_2}{1 - G_1H_1}$; 8.33.`,
        },
      ],
      traps: [
        r`Positive feedback gives $\frac{G}{1 - GH}$: check the sign at the summing point.`,
        r`Only the blocks INSIDE the loop enter its $GH$.`,
      ],
      check: [
        { q: r`What does feedback do to bandwidth and distortion?`, a: r`It increases bandwidth and reduces distortion (at the cost of gain).` },
        { q: r`What is the characteristic equation of the basic loop?`, a: r`$1 + G(s)H(s) = 0$.` },
      ],
    },
    {
      name: 'Signal Flow Graphs',
      inShort: r`Nodes and branches instead of blocks; Mason's formula gives the gain in one step.`,
      body: [
        r`A **signal flow graph** draws the system's equations as **nodes** (variables) joined by directed **branches** (gains). It carries the same information as a block diagram but is quicker to manipulate, and **Mason's gain formula** gives the overall transfer function directly:`,
        r`$$T = \frac{1}{\Delta}\sum_k P_k\Delta_k$$`,
        r`| Term | Meaning |
|---|---|
| $P_k$ | gain of the k-th forward path from input to output |
| $L_i$ | gain of each loop |
| $\Delta$ | $1 - \sum L_i + \sum L_iL_j - \sum L_iL_jL_k + \dots$ over loops that do not touch |
| $\Delta_k$ | $\Delta$ with every loop that touches path k removed |`,
      ],
      keyIdeas: [
        r`Mason: $T = \frac{1}{\Delta}\sum_k P_k\Delta_k$.`,
        r`$\Delta = 1 - \sum L_i + \sum L_iL_j - \dots$ over non-touching loop pairs, triples…`,
        r`$\Delta_k$ is $\Delta$ with every loop touching path $k$ removed.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'One path, two loops',
          problem: r`One forward path of gain 10 touches two loops, $L_1 = -0.5$ and $L_2 = -0.2$, which do not touch each other. Find the gain.`,
          steps: [
            r`$\Delta = 1 - (-0.5 - 0.2) + (-0.5)(-0.2) = 1.8$.`,
            r`The path touches both loops: $\Delta_1 = 1$. $T = \frac{10}{1.8} = 5.56$.`,
          ],
          answer: r`5.56.`,
        },
        {
          level: 'board',
          title: 'Two paths',
          problem: r`The same graph has two forward paths: $P_1 = 6$, touching both loops, and $P_2 = 2$, touching only $L_1$. Find the gain.`,
          steps: [
            r`$\Delta = 1.8$ as before; $\Delta_1 = 1$; $\Delta_2 = 1 - L_2 = 1.2$.`,
            r`$T = \frac{6 \times 1 + 2 \times 1.2}{1.8} = 4.67$.`,
          ],
          answer: r`4.67.`,
        },
      ],
      traps: [
        r`Only loops that share no node with each other enter the $L_iL_j$ products.`,
        r`Loop gains carry their sign: a negative feedback loop has a negative $L$.`,
      ],
      check: [
        { q: r`What is $\Delta_k$ for a path that touches every loop?`, a: r`1.` },
        { q: r`What is a signal flow graph a picture of?`, a: r`The set of simultaneous equations describing the system.` },
      ],
    },
    {
      name: 'Time Response',
      inShort: r`How the output follows a step: speed (rise, peak, settling) and overshoot, set by $\zeta$ and $\omega_n$.`,
      body: [
        r`A second-order system $\frac{\omega_n^2}{s^2 + 2\zeta\omega_ns + \omega_n^2}$ is set by its **natural frequency** $\omega_n$ and **damping ratio** ζ. Below $\zeta = 1$ it is **underdamped**: it overshoots and rings at $\omega_d = \omega_n\sqrt{1 - \zeta^2}$, decaying with time constant $\frac{1}{\zeta\omega_n}$. At $\zeta = 1$ it is **critically damped** (the fastest with no overshoot); above, **overdamped**; at $\zeta = 0$, it oscillates forever (poles on the jω axis).`,
        {
          type: 'plot',
          alt: 'The unit step response of a second-order system with damping ratio 0.5 and natural frequency 4 rad per second: rising past 1 to a peak of 1.163 at 0.907 s, then settling within 2 s.',
          caption: 'ζ = 0.5, natural frequency 4 rad/s: peaks at 1.163 (16.3% overshoot) at 0.907 s, settles by 2 s.',
          x: [0, 3],
          y: [0, 1.4],
          xLabel: 't (s)',
          yLabel: 'y',
          series: [{ f: step2, label: 'y', area: true }],
          marks: [{ x: Math.PI / WD, label: 'peak' }, { y: 1, label: 'final' }],
        },
        r`| Measure | Formula |
|---|---|
| Overshoot | $\%OS = 100e^{-\pi\zeta/\sqrt{1-\zeta^2}}$ |
| Peak time | $t_p = \frac{\pi}{\omega_d}$ |
| Rise time (0 to 100%) | $t_r = \frac{\pi - \cos^{-1}\zeta}{\omega_d}$ |
| Settling time | $\frac{4}{\zeta\omega_n}$ (2%), $\frac{3}{\zeta\omega_n}$ (5%) |`,
      ],
      keyIdeas: [
        r`$\%OS = 100e^{-\pi\zeta/\sqrt{1-\zeta^2}}$; $t_p = \frac{\pi}{\omega_d}$, $\omega_d = \omega_n\sqrt{1-\zeta^2}$.`,
        r`$t_r = \frac{\pi - \cos^{-1}\zeta}{\omega_d}$; $t_s = \frac{4}{\zeta\omega_n}$ (2%) or $\frac{3}{\zeta\omega_n}$ (5%).`,
        r`From $\ddot y + a\dot y + by = bx$: $\omega_n = \sqrt b$, $\zeta = \frac{a}{2\sqrt b}$.`,
        r`Poles five or more times further left than the dominant pair hardly matter.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Overshoot and times',
          problem: r`A system has $\zeta = 0.5$ and $\omega_n = 4$ rad/s. Find the overshoot, peak time, rise time and 2% settling time.`,
          steps: [
            r`$\omega_d = 4\sqrt{0.75} = 3.46$ rad/s; $\%OS = 100e^{-\pi \times 0.5/0.866} = 16.3\%$.`,
            r`$t_p = \frac{\pi}{3.46} = 0.907$ s; $t_r = \frac{\pi - 1.047}{3.46} = 0.605$ s; $t_s = \frac{4}{2} = 2$ s.`,
          ],
          answer: r`16.3%; 0.907 s; 0.605 s; 2 s.`,
        },
        {
          level: 'board',
          title: 'From the differential equation',
          problem: r`A system obeys $\ddot y + 6\dot y + 25y = 25x$. Find $\omega_n$, ζ, $\omega_d$, the time constant and the overshoot. A servo has the characteristic equation $s^2 + 2s + K = 0$: what K gives the fastest response with no overshoot?`,
          steps: [
            r`$\omega_n = \sqrt{25} = 5$ rad/s; $\zeta = \frac{6}{2 \times 5} = 0.6$; $\omega_d = 5\sqrt{1 - 0.36} = 4$ rad/s.`,
            r`Time constant $\frac{1}{\zeta\omega_n} = \frac{1}{3} = 0.333$ s; $\%OS = 100e^{-\pi \times 0.6/0.8} = 9.48\%$.`,
            r`No overshoot, fastest: critical damping, $\zeta = 1$: $2 = 2\sqrt K$, so $K = 1$.`,
          ],
          answer: r`5 rad/s, 0.6, 4 rad/s, 0.333 s, 9.48%; K = 1.`,
        },
      ],
      traps: [
        r`Overshoot depends on $\zeta$ only; raising $\omega_n$ speeds the response but leaves the overshoot alone.`,
        r`The time constant of the envelope is $\frac{1}{\zeta\omega_n}$, not $\frac{1}{\omega_n}$.`,
      ],
      check: [
        { q: r`What is the response with a damping ratio of exactly 1 called?`, a: r`Critically damped.` },
        { q: r`All poles lie on the jω axis. What does the response do?`, a: r`It oscillates steadily (sustained oscillation).` },
      ],
    },
    {
      name: 'Steady-State Error',
      inShort: r`The error left after the transient, set by the system type and its error constants.`,
      body: [
        r`With unity feedback, the error that remains after the transient depends on the input and on the **type** of the open-loop $G$: the number of its poles at the origin (integrators).`,
        r`| Type | Step $\frac{1}{1 + K_p}$ | Ramp $\frac{1}{K_v}$ | Parabola $\frac{1}{K_a}$ |
|---|---|---|---|
| 0 | finite | ∞ | ∞ |
| 1 | 0 | finite | ∞ |
| 2 | 0 | 0 | finite |`,
        r`The error constants are $K_p = \lim_{s\to0}G$, $K_v = \lim_{s\to0}sG$, $K_a = \lim_{s\to0}s^2G$. A type-1 loop follows a ramp at the same speed but a fixed distance behind:`,
        {
          type: 'plot',
          alt: 'A unit ramp input, dashed, and the output of a type 1 loop with velocity constant 3, solid: the output settles to a parallel line one third of a unit below the input.',
          caption: 'A type-1 loop (velocity constant 3) follows a unit ramp (dashed) but lags it by 1/3.',
          x: [0, 3],
          y: [0, 3.2],
          xLabel: 't (s)',
          yLabel: 'r, c',
          series: [
            { f: (t) => t - (1 - Math.exp(-3 * t)) / 3, label: 'output' },
            { f: (t) => t, label: 'ramp', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$K_p = \lim_{s\to0}G$, $K_v = \lim_{s\to0}sG$, $K_a = \lim_{s\to0}s^2G$.`,
        r`Unity feedback: step $e = \frac{1}{1 + K_p}$, ramp $\frac{1}{K_v}$, parabola $\frac{1}{K_a}$.`,
        r`Type = number of integrators (poles at the origin); each one removes the error for one more input.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A type-1 system',
          problem: r`$G = \frac{20(s + 3)}{s(s + 4)(s + 5)}$ with unity feedback. Find the errors for unit step, ramp and parabola.`,
          steps: [
            r`Type 1: $K_p = \infty$, step error 0.`,
            r`$K_v = \frac{20 \times 3}{4 \times 5} = 3$: ramp error $\frac{1}{3} = 0.333$.`,
            r`$K_a = 0$: parabola error infinite.`,
          ],
          answer: r`0; 0.333; infinite.`,
        },
        {
          level: 'board',
          title: 'A type-0 system',
          problem: r`$G = \frac{K}{(s + 1)(s + 2)}$ with unity feedback and K = 10. Find the step error. What K brings it to 5%?`,
          steps: [
            r`$K_p = \frac{10}{2} = 5$: $e = \frac{1}{6} = 0.167$.`,
            r`$\frac{1}{1 + K_p} = 0.05$ needs $K_p = 19$, so $K = 38$ (if still stable).`,
          ],
          answer: r`0.167; K = 38.`,
        },
      ],
      traps: [
        r`These formulas assume a STABLE closed loop and unity feedback: check stability first.`,
        r`$K_p$ uses the OPEN-loop G, not the closed loop.`,
      ],
      check: [
        { q: r`Which type of system follows a step with zero error?`, a: r`Type 1 or higher.` },
        { q: r`A type-0 system gets a ramp. What is the error?`, a: r`Infinite (it grows without limit).` },
      ],
    },
    {
      name: 'Routh-Hurwitz Stability',
      inShort: r`Count right-half-plane roots from the coefficients alone, without solving.`,
      body: [
        r`A system is stable when every root of its characteristic equation has a negative real part. The **Routh–Hurwitz criterion** tells how many do not, without solving: write the coefficients in two rows, build each further row from the two above it, and count the **sign changes in the first column**: that many roots lie in the right half-plane. For $s^3 + 6s^2 + 8s + K$:`,
        r`| Row | | |
|---|---|---|
| $s^3$ | 1 | 8 |
| $s^2$ | 6 | K |
| $s^1$ | $\frac{6 \times 8 - K}{6}$ | 0 |
| $s^0$ | K | |`,
        r`All first-column entries positive needs $0 < K < 48$. At $K = 48$ the $s^1$ row is all zero: the system is marginal, and the **auxiliary equation** from the row above, $6s^2 + 48 = 0$, gives the poles on the jω axis and so the frequency of oscillation.`,
        r`A quicker test comes first: if any coefficient is missing or of the wrong sign, the system is not stable.`,
      ],
      keyIdeas: [
        r`Sign changes in the first column = number of right-half-plane roots.`,
        r`Third order $a_0s^3 + a_1s^2 + a_2s + a_3$: stable if all positive and $a_1a_2 > a_0a_3$.`,
        r`A zero row: form the auxiliary equation from the row above; its roots give the oscillation frequency.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The range of K',
          problem: r`The characteristic equation is $s^3 + 6s^2 + 8s + K = 0$. Find the range of K for stability and the oscillation frequency at the limit.`,
          steps: [
            r`Stable for $6 \times 8 > K > 0$: $0 < K < 48$.`,
            r`At $K = 48$: $6s^2 + 48 = 0$, so $\omega = \sqrt8 = 2.83$ rad/s.`,
          ],
          answer: r`$0 < K < 48$; 2.83 rad/s.`,
        },
        {
          level: 'board',
          title: 'Marginal stability of a loop',
          problem: r`A unity-feedback loop has $G = \frac{K}{s(s + 2)(s + 10)}$. Find the K for marginal stability and the frequency of oscillation in hertz.`,
          steps: [
            r`$1 + G = 0$: $s^3 + 12s^2 + 20s + K = 0$. Stable for $12 \times 20 > K$: $K < 240$.`,
            r`At $K = 240$: $12s^2 + 240 = 0$, $\omega = \sqrt{20} = 4.47$ rad/s $= 0.712$ Hz.`,
          ],
          answer: r`K = 240; 0.712 Hz.`,
        },
      ],
      traps: [
        r`A missing or negative coefficient already means unstable (or marginal): no array needed.`,
        r`Convert rad/s to Hz when the choices are in hertz: divide by 2π.`,
      ],
      check: [
        { q: r`For what K is $s^4 + 6s^3 + 11s^2 + 6s + K = 0$ stable?`, a: r`$0 < K < 10$.` },
        { q: r`Is $s^3 + 4s^2 + 8s + 12 = 0$ stable?`, a: r`Yes: all positive and $4 \times 8 = 32 > 12$.` },
      ],
    },
    {
      name: 'Root Locus',
      inShort: r`The path of the closed-loop poles as the gain K goes from 0 to infinity.`,
      body: [
        r`The **root locus** plots where the closed-loop poles go as the gain K rises from zero. It starts at the open-loop poles (K = 0) and ends at the open-loop zeros or runs off to infinity along asymptotes. It is symmetric about the real axis because complex roots come in conjugate pairs. For $\frac{K}{s(s+2)(s+4)}$ two branches meet between 0 and −2, break away, and cross into the right half-plane at $\pm j2.83$ when K = 48:`,
        {
          type: 'plot',
          alt: 'The root locus of K over s times s plus 2 times s plus 4: branches from 0 and minus 2 meet at minus 0.845, split upward and downward, and cross the imaginary axis at plus and minus 2.83; the third branch runs left from minus 4.',
          caption: 'Root locus of K/(s(s+2)(s+4)): breakaway at −0.845, crossing the jω axis at ±j2.83 (K = 48).',
          x: [-8, 2],
          y: [-5, 5],
          xLabel: 'σ',
          yLabel: 'jω',
          series: [
            { points: branch(0), label: 'from 0', colour: colourOf(0) },
            { points: branch(1), label: 'from −2', colour: colourOf(0) },
            { points: branch(2), label: 'from −4', colour: colourOf(0) },
          ],
          legend: false,
        },
        r`| Rule | Detail |
|---|---|
| Real axis | on the locus to the LEFT of an odd number of poles and zeros |
| Asymptotes | $n - m$ of them, at $\frac{(2q + 1)180°}{n - m}$ from $\sigma_a = \frac{\sum p - \sum z}{n - m}$ |
| Breakaway | where $\frac{dK}{ds} = 0$ on the locus |
| jω crossing | from Routh (the marginal K) |
| Any point | angle of GH is ±180°; gain there $K = \frac{1}{\lvert GH\rvert}$ |`,
      ],
      keyIdeas: [
        r`Starts at open-loop poles, ends at zeros or along asymptotes at $\frac{(2q+1)180°}{n - m}$ from $\sigma_a = \frac{\sum p - \sum z}{n - m}$.`,
        r`On the real axis to the left of an odd number of poles and zeros; breakaway where $\frac{dK}{ds} = 0$.`,
        r`Any point on it: angle of $GH$ is $\pm180°$; the gain there is $K = \frac{1}{\lvert GH\rvert}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sketching a locus',
          problem: r`Sketch the locus of $\frac{K}{s(s+2)(s+4)}$: asymptotes, breakaway point, and jω-axis crossing.`,
          steps: [
            r`$\sigma_a = \frac{0 - 2 - 4}{3} = -2$, angles 60°, 180°, 300°.`,
            r`$K = -(s^3 + 6s^2 + 8s)$; $\frac{dK}{ds} = 0$: $3s^2 + 12s + 8 = 0$, $s = -0.845$ (K = 3.08).`,
            r`Crosses at $\pm j2.83$ when $K = 48$, as Routh gives.`,
          ],
          answer: r`$\sigma_a = -2$; breakaway −0.845; ±j2.83 at K = 48.`,
        },
        {
          level: 'board',
          title: 'Gain for a given damping',
          problem: r`For $\frac{K}{s(s + 4)}$ with unity feedback, find the breakaway point and the K that gives $\zeta = 0.5$.`,
          steps: [
            r`$K = -(s^2 + 4s)$; $\frac{dK}{ds} = -(2s + 4) = 0$: breakaway at −2, K = 4.`,
            r`Closed loop $s^2 + 4s + K$: $2\zeta\omega_n = 4$, so $\omega_n = 4$ and $K = \omega_n^2 = 16$.`,
          ],
          answer: r`−2; K = 16.`,
        },
      ],
      traps: [
        r`The breakaway lies between −2 and 0 here: of the two roots of $\frac{dK}{ds} = 0$, keep the one on the locus.`,
        r`At K = 0 the closed-loop poles ARE the open-loop poles.`,
      ],
      check: [
        { q: r`Why is a root locus symmetric about the real axis?`, a: r`Complex roots occur in conjugate pairs.` },
        { q: r`As K approaches zero, where are the closed-loop poles?`, a: r`At the open-loop poles.` },
      ],
    },
    {
      name: 'Bode Plots',
      inShort: r`Magnitude in dB and phase against log frequency, sketched from straight-line asymptotes.`,
      body: [
        r`A **Bode plot** draws $\lvert G(j\omega)\rvert$ in decibels and its phase against log ω. Because decibels add, each factor's straight-line **asymptote** can be sketched and summed: a constant shifts the curve, an integrator falls at −20 dB/decade through 0 dB at ω = K, each pole bends the slope down 20 dB/decade at its corner and each zero bends it up:`,
        {
          type: 'plot',
          alt: 'The Bode magnitude of 10 over s times 0.1 s plus 1: 40 dB at 0.1 rad per second, falling at 20 dB per decade to the corner at 10 rad per second, then at 40 dB per decade; the true curve runs 3 dB under the straight-line asymptotes, dashed, at the corner.',
          caption: '10/(s(0.1s + 1)): −20 dB/decade to the corner at 10 rad/s, then −40; 3 dB under the asymptotes (dashed) there.',
          x: [0.1, 100],
          logX: true,
          y: [-45, 45],
          xLabel: 'ω (rad/s)',
          yLabel: 'dB',
          series: [
            { f: (w) => 20 * Math.log10(10 / (w * Math.sqrt(1 + 0.01 * w * w))), label: 'true' },
            { f: (w) => 20 * Math.log10(w <= 10 ? 10 / w : 100 / (w * w)), label: 'asymptote', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 10, label: 'corner' }],
        },
        r`At a first-order corner the true curve is 3 dB off the asymptote and the phase is 45° into its change. A second-order pair with $\zeta < 0.707$ peaks: $M_r = \frac{1}{2\zeta\sqrt{1 - \zeta^2}}$ at $\omega_r = \omega_n\sqrt{1 - 2\zeta^2}$.`,
      ],
      keyIdeas: [
        r`Each pole adds −20 dB/decade after its corner and −90° in all; each zero +20 dB/decade and +90°.`,
        r`At a first-order corner the true curve is 3 dB off the asymptote, with 45° of phase.`,
        r`Second order: $M_r = \frac{1}{2\zeta\sqrt{1-\zeta^2}}$ at $\omega_r = \omega_n\sqrt{1 - 2\zeta^2}$ (for $\zeta < 0.707$).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A sketch and a resonant peak',
          problem: r`Sketch $G = \frac{10}{s(0.1s + 1)}$. A second-order system has $\zeta = 0.3$: find its resonant peak and frequency.`,
          steps: [
            r`20 dB at 1 rad/s, falling at −20 dB/dec to the corner at 10 rad/s (true value 3 dB below the asymptote), then −40 dB/dec.`,
            r`$M_r = \frac{1}{2 \times 0.3\sqrt{0.91}} = 1.75$ (4.85 dB) at $\sqrt{1 - 0.18} = 0.906$ of $\omega_n$.`,
          ],
          answer: r`As described; 1.75 (4.85 dB) at $0.906\,\omega_n$.`,
        },
        {
          level: 'board',
          title: 'At the corner',
          problem: r`$G = \frac{100}{s + 10}$. Find its DC gain in dB, its corner frequency, and its magnitude and phase at the corner.`,
          steps: [
            r`DC gain $\frac{100}{10} = 10$: 20 dB. Corner at 10 rad/s.`,
            r`At $\omega = 10$: $\frac{100}{\sqrt{200}} = 7.07$, which is 17.0 dB (3 dB down); phase −45°.`,
          ],
          answer: r`20 dB; 10 rad/s; 17.0 dB, −45°.`,
        },
      ],
      traps: [
        r`An integrator's line passes through 0 dB at $\omega = K$, not at $\omega = 1$.`,
        r`Write factors as $(1 + \frac{s}{\omega_c})$ first, so the constant left over is the true low-frequency gain.`,
      ],
      check: [
        { q: r`What slope does a double pole give after its corner?`, a: r`−40 dB/decade.` },
        { q: r`How far is the true curve from the asymptote at a single pole's corner?`, a: r`3 dB.` },
      ],
    },
    {
      name: 'Nyquist',
      inShort: r`Map the right half-plane through $GH$ and count how the plot circles −1.`,
      body: [
        r`The **Nyquist plot** draws $GH(j\omega)$ as a curve in the complex plane as ω runs from 0 to ∞ (and its mirror image for negative ω). The closed loop's stability depends on how the curve encircles the point −1: $Z = N + P$, closed-loop right-half-plane poles = clockwise encirclements of −1 + open-loop right-half-plane poles. For an open-loop stable system, the closed loop is stable if the plot does not encircle −1:`,
        {
          type: 'plot',
          alt: 'The Nyquist plot of 4 over s plus 1 cubed: starting at 4 on the real axis, swinging clockwise below the axis, crossing the negative real axis at minus 0.5, and spiralling into the origin; its mirror image, dashed, closes the curve; the critical point minus 1 is marked and not encircled.',
          caption: '4/(s + 1)³ crosses the negative real axis at −0.5: −1 is not encircled, so the loop is stable with a gain margin of 2.',
          x: [-1.5, 4.5],
          y: [-3.5, 3.5],
          xLabel: 'Re',
          yLabel: 'Im',
          series: [
            { points: nyquist(1), label: 'ω > 0' },
            { points: nyquist(-1), label: 'ω < 0', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: -1, label: '−1' }],
        },
        r`Where the plot crosses the negative real axis, at $-a$, the gain could rise by $\frac{1}{a}$ before the crossing reaches −1: that is the **gain margin**.`,
      ],
      keyIdeas: [
        r`$Z = N + P$: closed-loop RHP poles = clockwise encirclements of −1 + open-loop RHP poles.`,
        r`For an open-loop stable system, stable if the plot does not encircle −1.`,
        r`The point where the plot crosses the negative real axis sets the gain margin.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The limiting gain',
          problem: r`$GH = \frac{K}{(s + 1)^3}$. Find the K at which the closed loop becomes unstable, and the gain margin at K = 4.`,
          steps: [
            r`Phase is −180° where each factor gives 60°: $\omega = \tan 60° = \sqrt3$.`,
            r`There $\lvert GH\rvert = \frac{K}{(\sqrt{1 + 3})^3} = \frac{K}{8}$: unstable for $K > 8$.`,
            r`At $K = 4$ the crossing is at −0.5: the margin is 2 (6.02 dB).`,
          ],
          answer: r`K = 8; 2 (6.02 dB).`,
        },
        {
          level: 'board',
          title: 'Another cubic',
          problem: r`$GH = \frac{K}{(s + 2)^3}$. Find the frequency where the phase is −180° and the K for marginal stability.`,
          steps: [
            r`Each factor gives 60°: $\omega = 2\tan 60° = 3.46$ rad/s.`,
            r`$\lvert s + 2\rvert = \sqrt{4 + 12} = 4$, so $\lvert GH\rvert = \frac{K}{64} = 1$: $K = 64$.`,
          ],
          answer: r`3.46 rad/s; K = 64.`,
        },
      ],
      traps: [
        r`With open-loop RHP poles (P > 0), the plot must encircle −1 counterclockwise P times to be stable.`,
        r`Count encirclements of −1, not of the origin.`,
      ],
      check: [
        { q: r`What point does the Nyquist criterion look at?`, a: r`−1 + j0.` },
        { q: r`An open-loop stable system's Nyquist plot circles −1 once clockwise. How many closed-loop RHP poles?`, a: r`One: Z = N + P = 1 + 0.` },
      ],
    },
    {
      name: 'Gain and Phase Margins',
      inShort: r`How far the loop is from instability, in gain and in phase.`,
      body: [
        r`The **gain margin** is how much the loop gain can rise before instability: $\frac{1}{\lvert GH\rvert}$ at the **phase crossover**, where the phase is −180°. The **phase margin** is how much more phase lag it can take: $180° + \angle GH$ at the **gain crossover**, where $\lvert GH\rvert = 1$. Read both from the Bode plot:`,
        {
          type: 'plot',
          alt: 'The phase of 10 over s times 0.1 s plus 1 against frequency on a log scale: from near minus 90 degrees falling toward minus 180, reaching minus 128 degrees at the 7.86 rad per second gain crossover, 51.8 degrees above the minus 180 line.',
          caption: 'Phase of 10/(s(0.1s + 1)): −128.2° at the 7.86 rad/s gain crossover, a phase margin of 51.8°.',
          x: [0.1, 1000],
          logX: true,
          y: [-190, -80],
          xLabel: 'ω (rad/s)',
          yLabel: 'phase (°)',
          series: [{ f: (w) => -90 - (Math.atan(0.1 * w) * 180) / Math.PI, label: 'phase' }],
          marks: [{ x: 7.86, label: '7.86' }, { y: -180, label: '−180°' }],
        },
        r`Margins relate to damping: a phase margin of about $100\zeta$ degrees (for ζ below 0.6). A **time delay** T adds a lag of $\omega T$ radians at every frequency without changing the gain, so it eats directly into the phase margin.`,
      ],
      keyIdeas: [
        r`GM = $\frac{1}{\lvert GH\rvert}$ at the phase crossover (−180°); PM = 180° + $\angle GH$ at the gain crossover ($\lvert GH\rvert = 1$).`,
        r`PM relates to damping: about $100\zeta$ degrees for $\zeta < 0.6$ (51.8° at $\zeta = 0.5$ exactly).`,
        r`A time delay T adds $-\omega T$ of phase but no gain, so it eats the phase margin.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A phase margin',
          problem: r`Find the phase margin of $G = \frac{10}{s(0.1s + 1)}$.`,
          steps: [
            r`$\lvert G\rvert = 1$ where $\omega^2(1 + 0.01\omega^2) = 100$: $\omega = 7.86$ rad/s.`,
            r`PM $= 180 - 90 - \tan^{-1}0.786 = 51.8°$.`,
            r`The phase never reaches −180°, so GM is infinite; the closed loop has $\zeta = 0.5$.`,
          ],
          answer: r`51.8°; infinite gain margin.`,
        },
        {
          level: 'board',
          title: 'Adding a time delay',
          problem: r`The same loop gains a 0.05 s time delay. What is its phase margin now?`,
          steps: [
            r`Lag at the crossover: $7.86 \times 0.05 = 0.393$ rad $= 22.5°$.`,
            r`PM $= 51.8 - 22.5 = 29.3°$; the gain crossover is unchanged.`,
          ],
          answer: r`29.3°.`,
        },
      ],
      traps: [
        r`A positive gain margin in dB means stable only for a minimum-phase, open-loop stable system.`,
        r`Gain margin is read at the PHASE crossover; phase margin at the GAIN crossover.`,
      ],
      check: [
        { q: r`What is the gain margin in dB if the phase-crossover magnitude is 0.25?`, a: r`$20\log 4 = 12.0$ dB.` },
        { q: r`What does a time delay do to the gain curve?`, a: r`Nothing: it adds only phase lag.` },
      ],
    },
    {
      name: 'PID Controllers',
      inShort: r`Act on the present error (P), its history (I) and its trend (D).`,
      body: [
        r`A **PID** controller adds three actions on the error: **proportional** (now), **integral** (accumulated past) and **derivative** (rate of change). In transfer-function form it is $G_c = K_p + \frac{K_i}{s} + K_ds$, or in the ideal (standard) form $K_p\left(1 + \frac{1}{T_is} + T_ds\right)$.`,
        r`| Action | Adds | Effect |
|---|---|---|
| P | gain | faster, smaller error, but alone leaves an offset; too much oscillates |
| I | a pole at the origin (one more type) | removes steady-state error; adds lag, can overshoot |
| D | a zero, phase lead | damps overshoot; amplifies noise |
| PI | a pole at 0 and a zero at $-\frac{1}{T_i}$ | zero error, like a lag network |
| PD | a zero at $-\frac{1}{T_d}$ | damping, like a lead network |`,
        r`Ziegler–Nichols tuning and the proportional band are in Instrumentation & Control.`,
      ],
      keyIdeas: [
        r`$G_c = K_p + \frac{K_i}{s} + K_ds = K_p\left(1 + \frac{1}{T_is} + T_ds\right)$.`,
        r`I removes steady-state error (adds a type); D adds damping and phase lead; P speeds up but alone leaves error.`,
        r`Tuning rules (Ziegler–Nichols) are in Instrumentation & Control.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Parallel form and zeros',
          problem: r`A PID has $K_p = 4$, $T_i = 2$ s and $T_d = 0.5$ s. Write it in parallel form and find its zeros.`,
          steps: [
            r`$K_i = \frac{4}{2} = 2$, $K_d = 4 \times 0.5 = 2$.`,
            r`$G_c = 4 + \frac{2}{s} + 2s = \frac{2s^2 + 4s + 2}{s} = \frac{2(s + 1)^2}{s}$: a double zero at −1.`,
          ],
          answer: r`$\frac{2(s + 1)^2}{s}$; double zero at −1.`,
        },
        {
          level: 'board',
          title: 'A PI controller',
          problem: r`A PI controller has $K_p = 2$ and $T_i = 4$ s. Write its transfer function and find its zero. What does it do to a type-0 plant's step error?`,
          steps: [
            r`$G_c = 2\left(1 + \frac{1}{4s}\right) = \frac{2s + 0.5}{s}$: zero at −0.25.`,
            r`Its pole at the origin makes the loop type 1: the step error becomes zero.`,
          ],
          answer: r`$\frac{2s + 0.5}{s}$; −0.25; removes it.`,
        },
      ],
      traps: [
        r`$K_i = \frac{K_p}{T_i}$ and $K_d = K_pT_d$: don't mix the parallel and ideal forms.`,
        r`Pure derivative action amplifies high-frequency noise: real controllers filter it.`,
      ],
      check: [
        { q: r`Which action removes steady-state error?`, a: r`Integral.` },
        { q: r`Which action adds phase lead and damping?`, a: r`Derivative.` },
      ],
    },
    {
      name: 'Compensators',
      inShort: r`Lead adds phase near crossover for speed and margin; lag raises low-frequency gain for accuracy.`,
      body: [
        r`A **compensator** is a network added to the loop to reshape its response. A **lead** compensator $\frac{Ts + 1}{\alpha Ts + 1}$ ($\alpha < 1$) has its zero before its pole, so it adds positive phase between them, most at their geometric mean:`,
        {
          type: 'plot',
          alt: 'The phase added by a lead compensator with alpha 0.1, zero at 3.16 and pole at 31.6 rad per second, against frequency on a log scale: rising from zero to a peak of 54.9 degrees at 10 rad per second and falling back.',
          caption: 'A lead compensator (α = 0.1) adds up to 54.9° at 10 rad/s, between its zero (3.16) and pole (31.6).',
          x: [0.3, 300],
          logX: true,
          y: [0, 65],
          xLabel: 'ω (rad/s)',
          yLabel: 'phase (°)',
          series: [{ f: (w) => ((Math.atan(0.316 * w) - Math.atan(0.0316 * w)) * 180) / Math.PI, label: 'phase', area: true }],
          marks: [{ x: 10, label: '10' }],
        },
        r`Placed at the new crossover, that phase raises the margin and speeds the response. A **lag** compensator $\frac{Ts + 1}{\beta Ts + 1}$ ($\beta > 1$) does the opposite job: it raises the low-frequency gain by β (so the error constants rise β times) while leaving the crossover nearly alone, if its zero sits a decade below crossover. A **lead–lag** combines both.`,
      ],
      keyIdeas: [
        r`Lead $\frac{Ts + 1}{\alpha Ts + 1}$, $\alpha < 1$: $\sin\phi_m = \frac{1 - \alpha}{1 + \alpha}$ at $\omega_m = \frac{1}{T\sqrt\alpha}$.`,
        r`Lag $\frac{Ts + 1}{\beta Ts + 1}$, $\beta > 1$: multiplies $K_v$ by $\beta$; put its zero a decade below crossover.`,
        r`Lead–lag combines both.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Designing a lead',
          problem: r`A lead compensator with $\alpha = 0.1$ must give its peak phase at 10 rad/s. Find the peak phase, T, the zero and pole, and the gain added there.`,
          steps: [
            r`$\phi_m = \sin^{-1}\frac{0.9}{1.1} = 54.9°$.`,
            r`$T = \frac{1}{10\sqrt{0.1}} = 0.316$ s: zero at −3.16, pole at −31.6.`,
            r`Gain at $\omega_m$: $\frac{1}{\sqrt{0.1}} = 3.16$ (10 dB).`,
          ],
          answer: r`54.9°; 0.316 s; −3.16 and −31.6; 10 dB.`,
        },
        {
          level: 'board',
          title: 'Designing a lag',
          problem: r`A loop has $K_v = 2$ and crosses over at 2 rad/s. A lag compensator must raise $K_v$ to 20 without moving the crossover. Find β and place the zero and pole.`,
          steps: [
            r`$\beta = \frac{20}{2} = 10$.`,
            r`Zero a decade below crossover: at −0.2 ($T = 5$ s); pole at $-\frac{0.2}{10} = -0.02$.`,
          ],
          answer: r`β = 10; zero −0.2, pole −0.02.`,
        },
      ],
      traps: [
        r`The lead's extra gain at $\omega_m$ shifts the crossover up: allow 5–12° more phase than you need.`,
        r`A lag network adds a little phase LAG near crossover: keep its corner well below.`,
      ],
      check: [
        { q: r`What does a lead compensator mainly improve?`, a: r`Phase margin and speed (transient response).` },
        { q: r`What does a lag compensator mainly improve?`, a: r`Steady-state accuracy (error constants).` },
      ],
    },
    {
      name: 'State Space',
      inShort: r`First-order matrix equations $\dot x = Ax + Bu$, $y = Cx + Du$, for any number of inputs and outputs.`,
      body: [
        r`The **state** is the smallest set of variables that, with the input, fixes all future behaviour (capacitor voltages, inductor currents, positions, velocities). A system of order n becomes n first-order equations, $\dot x = Ax + Bu$, $y = Cx + Du$. This handles many inputs and outputs, and initial conditions, as easily as one.`,
        r`| Idea | Formula |
|---|---|
| Transfer function | $G(s) = C(sI - A)^{-1}B + D$ |
| Poles | eigenvalues of A: roots of $\det(sI - A) = 0$ |
| State transition | $\Phi(t) = e^{At} = \mathcal{L}^{-1}\{(sI - A)^{-1}\}$ |
| Controllable | $[B\ AB\ \dots\ A^{n-1}B]$ has full rank |
| Observable | $[C;\ CA;\ \dots;\ CA^{n-1}]$ has full rank |`,
      ],
      keyIdeas: [
        r`$G(s) = C(sI - A)^{-1}B + D$; poles are the eigenvalues of $A$.`,
        r`$\Phi(t) = e^{At} = \mathcal{L}^{-1}\{(sI - A)^{-1}\}$.`,
        r`Controllable if $[B\ AB\ \dots]$ has full rank; observable if $[C;\ CA;\ \dots]$ has.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Transfer function and controllability',
          problem: r`$A = \begin{bmatrix}0 & 1\\-6 & -5\end{bmatrix}$, $B = \begin{bmatrix}0\\1\end{bmatrix}$, $C = \begin{bmatrix}4 & 1\end{bmatrix}$. Find $G(s)$, the poles, and whether it is controllable.`,
          steps: [
            r`$\det(sI - A) = s^2 + 5s + 6$; $G = \frac{s + 4}{s^2 + 5s + 6}$; poles −2 and −3.`,
            r`$[B\ AB] = \begin{bmatrix}0 & 1\\1 & -5\end{bmatrix}$ has determinant −1: controllable.`,
          ],
          answer: r`$\frac{s + 4}{(s + 2)(s + 3)}$; −2, −3; controllable.`,
        },
        {
          level: 'board',
          title: 'Another system',
          problem: r`$A = \begin{bmatrix}-1 & 0\\1 & -2\end{bmatrix}$, $B = \begin{bmatrix}1\\0\end{bmatrix}$, $C = \begin{bmatrix}0 & 1\end{bmatrix}$. Find $G(s)$ and whether it is observable.`,
          steps: [
            r`$(sI - A)^{-1} = \frac{1}{(s + 1)(s + 2)}\begin{bmatrix}s + 2 & 0\\1 & s + 1\end{bmatrix}$; times B gives $\frac{1}{(s+1)(s+2)}\begin{bmatrix}s + 2\\1\end{bmatrix}$.`,
            r`C picks the second entry: $G = \frac{1}{(s + 1)(s + 2)}$.`,
            r`$\begin{bmatrix}C\\CA\end{bmatrix} = \begin{bmatrix}0 & 1\\1 & -2\end{bmatrix}$, determinant −1: observable.`,
          ],
          answer: r`$\frac{1}{(s + 1)(s + 2)}$; observable.`,
        },
      ],
      traps: [
        r`If a zero cancels a pole (C = [3 1] in the basic example), the transfer function hides a mode: it is unobservable.`,
        r`Matrix order matters: $C(sI - A)^{-1}B$, not $B(sI - A)^{-1}C$.`,
      ],
      check: [
        { q: r`Where are a state-space system's poles?`, a: r`At the eigenvalues of A.` },
        { q: r`What does $e^{At}$ describe?`, a: r`How the state evolves from its initial value with no input (the state transition matrix).` },
      ],
    },
  ],
};
