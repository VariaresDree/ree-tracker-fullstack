// Library › Lessons › EE › Electrical Transient Analysis (2026-11-18; every
// subtopic in the module format 2026-11-20, with figures, examples a step at a
// time and checks; every number re-worked by transientsLesson.test.js. Coverage
// and problem styles cross-checked against a review center's dc-circuits
// handout; the text, problems and figures are this app's own): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order. The basic
// first-order step formula and the three RLC cases are introduced in Electric
// Circuits 1, s-domain models in Electric Circuits 2; this lesson works them
// through and on to switching in power systems.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;
const deg = Math.PI / 180;

// Unit step response of a second-order system against ω0·t, for damping ratio z.
const stepOf = (z) => (x) => {
  if (z < 1) {
    const w = Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * x) * (Math.cos(w * x) + (z / w) * Math.sin(w * x));
  }
  if (z === 1) return 1 - (1 + x) * Math.exp(-x);
  const q = Math.sqrt(z * z - 1);
  const s1 = -z + q;
  const s2 = -z - q;
  return 1 + (s2 * Math.exp(s1 * x) - s1 * Math.exp(s2 * x)) / (s1 - s2);
};

export default {
  topic: 'Electrical Transient Analysis',
  subject: 'EE',
  overview: r`A transient is what a circuit does between one steady state and the next, after a switch opens or closes or a fault strikes. Inductors and capacitors store energy, and energy cannot change instantly, so inductor current and capacitor voltage carry over the switching instant and then move toward their new values. One storage element gives a first-order circuit: an exponential set by a time constant ($RC$ or $L/R$). Two give a second-order circuit that is overdamped, critically damped or ringing, set by $\alpha$ and $\omega_0$. The Laplace transform turns all of this into algebra. In power systems the same ideas explain the dc offset in fault currents, capacitor inrush, switching overvoltages and the surges that travel along lines.`,
  sources: [
    'Fundamentals of Electric Circuits (Alexander and Sadiku), first- and second-order circuits and Laplace chapters',
    'Engineering Circuit Analysis (Hayt, Kemmerly and Durbin)',
    'Electrical Transients in Power Systems (Greenwood)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Initial and Final Conditions',
      inShort: r`What carries over the switching instant, and where the circuit ends up.`,
      body: [
        r`Every transient problem starts with two snapshots. **Just after the switch moves** ($t = 0^+$), only the stored energy carries over: a capacitor keeps its voltage and an inductor keeps its current, because changing either instantly would need infinite power. Everything else (resistor voltages, capacitor currents, inductor voltages) can jump. **A long time later** ($t = \infty$) with dc sources, nothing changes any more, so no current flows into a capacitor and no voltage appears across an inductor.`,
        r`| Element | Just after switching ($0^+$) | Long after, on dc ($\infty$) |
|---|---|---|
| Capacitor, uncharged | a short circuit | an open circuit |
| Capacitor at $V_0$ | a voltage source $V_0$ | an open circuit |
| Inductor, no current | an open circuit | a short circuit |
| Inductor carrying $I_0$ | a current source $I_0$ | a short circuit |
| Resistor | Ohm's law, at once | Ohm's law |`,
        {
          type: 'circuit',
          alt: 'A 12 V source, a switch that closes at t = 0, a 4 ohm resistor, then an 8 ohm resistor with a 300 microfarad capacitor across it.',
          caption: 'At the instant the switch closes the empty capacitor shorts the 8 Ω; long after, it is an open circuit.',
          parts: [
            ['V', [0, 2], [0, 0], '12 V'],
            ['sw', [0, 0], [1.5, 0], 't = 0'],
            ['R', [1.5, 0], [3.5, 0], '4 Ω'],
            ['R', [3.5, 0], [3.5, 2], '8 Ω'],
            ['wire', [3.5, 0], [5, 0]],
            ['C', [5, 0], [5, 2], ['300 µF', 'v_C']],
            ['wire', [5, 2], [0, 2]],
            ['dot', [3.5, 0]],
            ['dot', [3.5, 2]],
          ],
        },
        {
          type: 'plot',
          alt: 'The source current of that circuit: 3 A the instant the switch closes, falling exponentially to 1 A with a time constant of 0.8 milliseconds.',
          caption: 'The source current jumps to 3 A, then settles to 1 A; the time constant uses the 4 Ω and 8 Ω in parallel.',
          x: [0, 4],
          y: [0, 3.5],
          xLabel: 't (ms)',
          yLabel: 'i (A)',
          series: [{ f: (t) => 1 + 2 * Math.exp(-t / 0.8), label: 'i', area: true }],
          marks: [{ y: 1, label: 'i(∞) = 1 A' }],
        },
        r`Second-order circuits need one more fact at $0^+$: the starting slopes, $\frac{dv_C}{dt} = \frac{i_C}{C}$ and $\frac{di_L}{dt} = \frac{v_L}{L}$, found from the $0^+$ circuit.`,
      ],
      keyIdeas: [
        r`Continuity: $v_C(0^+) = v_C(0^-)$ and $i_L(0^+) = i_L(0^-)$. Everything else can jump.`,
        r`At $0^+$: an uncharged C is a short, a current-free L is an open; a charged C is a voltage source, a carrying L a current source.`,
        r`At $\infty$ on dc: C is open, L is shorted. Starting slopes: $\frac{dv_C}{dt} = \frac{i_C}{C}$, $\frac{di_L}{dt} = \frac{v_L}{L}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Switching onto a capacitor',
          problem: r`In the circuit drawn above, find the source current at $0^+$ and at $\infty$, the final capacitor voltage, and the time constant.`,
          steps: [
            r`At $0^+$ the empty capacitor shorts the 8 Ω: $i = \frac{12}{4} = 3$ A.`,
            r`At $\infty$ it is open: $i = \frac{12}{4 + 8} = 1$ A, and $v_C = 1 \times 8 = 8$ V.`,
            r`The capacitor sees 4 Ω and 8 Ω in parallel (the source shorted): $R_{Th} = 2.667$ Ω, so $\tau = 2.667 \times 300 \times 10^{-6} = 0.8$ ms.`,
          ],
          answer: r`3 A, then 1 A; $v_C$ ends at 8 V; τ = 0.8 ms.`,
        },
        {
          level: 'board',
          title: 'Opening an inductive circuit',
          problem: r`A 20 V source in series with 4 Ω feeds a 6 Ω resistor with a 0.2 H coil across it, long enough to settle. At $t = 0$ the source is switched out, leaving the coil and the 6 Ω together. Find the coil current, the 6 Ω voltage and the rate of change of current at $0^+$.`,
          steps: [
            r`Before: the coil shorts the 6 Ω, so $i_L(0^-) = \frac{20}{4} = 5$ A, and the 6 Ω had no voltage.`,
            r`After: the coil keeps its 5 A and pushes it through the 6 Ω: $v = 5 \times 6 = 30$ V. The resistor's voltage jumped from 0 to 30 V.`,
            r`$\frac{di}{dt} = \frac{v_L}{L} = \frac{-30}{0.2} = -150$ A/s; the current then decays with $\tau = \frac{0.2}{6} = 33.3$ ms.`,
          ],
          answer: r`5 A; 30 V; −150 A/s.`,
        },
      ],
      traps: [
        r`Find $v_C(0^-)$ and $i_L(0^-)$ from the circuit BEFORE switching, then carry only those two across.`,
        r`A capacitor's current and an inductor's voltage CAN jump.`,
      ],
      check: [
        { q: r`On dc steady state, what does a capacitor look like? An inductor?`, a: r`An open circuit; a short circuit.` },
        { q: r`Why is there no transient in a purely resistive circuit?`, a: r`It stores no energy, so nothing has to carry over.` },
      ],
    },
    {
      name: 'RL Transients',
      inShort: r`Inductor current moves exponentially with time constant $\tau = L/R$.`,
      body: [
        r`Switch a dc source V onto R and L in series and $L\frac{di}{dt} + Ri = V$. The current cannot jump, so it starts at zero and climbs toward $\frac{V}{R}$: $i = \frac{V}{R}(1 - e^{-t/\tau})$ with $\tau = \frac{L}{R}$. At the first instant all of V sits across the coil, so the current starts rising at $\frac{V}{L}$ amperes per second; the coil's voltage $v_L = Ve^{-t/\tau}$ then fades.`,
        {
          type: 'plot',
          alt: 'Current rising and coil voltage falling in an RL circuit, against time in time constants: the current reaches 63.2 percent of its final value at one time constant, when the coil voltage has fallen to 36.8 percent.',
          caption: 'Switching on an RL circuit: the current rises as the coil’s voltage dies away; at one τ they stand at 63.2% and 36.8%.',
          x: [0, 5],
          y: [0, 1.1],
          xLabel: 't / τ',
          series: [
            { f: (x) => 1 - Math.exp(-x), label: 'i / I' },
            { f: (x) => Math.exp(-x), label: 'v_L / V', dashed: true },
          ],
          marks: [{ at: [1, Math.exp(-1)], label: '36.8% left at τ' }],
        },
        r`Remove the source and give the current a path, and it decays: $i = I_0e^{-t/\tau}$, with the coil's voltage reversed to keep it flowing. With no path at all, $L\frac{di}{dt}$ becomes enormous: that is the spark at a breaking contact, and the reason a large field winding is opened through a **discharge resistor** and a relay coil gets a freewheeling diode.`,
        r`Here R is whatever resistance the coil sees (its own plus the circuit's, with sources turned off), and a larger R makes an RL circuit FASTER.`,
      ],
      keyIdeas: [
        r`Rise $i = \frac{V}{R}(1 - e^{-Rt/L})$; decay $i = I_0e^{-Rt/L}$; $\tau = \frac{L}{R}$.`,
        r`Initial rate of rise $\frac{V}{L}$; time to half the final current $0.693\tau$.`,
        r`Breaking an inductive current needs a path: discharge resistors, freewheeling diodes, snubbers.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Switching on a coil',
          problem: r`A 24 V source is switched onto 8 Ω in series with 0.4 H. Find the time constant, the current at 0.1 s, and the coil's voltage then.`,
          steps: [
            r`$\tau = \frac{0.4}{8} = 0.05$ s, so 0.1 s is $2\tau$.`,
            r`$i = 3(1 - e^{-2}) = 2.594$ A; $v_L = 24e^{-2} = 3.248$ V.`,
          ],
          answer: r`0.05 s; 2.59 A; 3.25 V.`,
        },
        {
          level: 'board',
          title: 'A field discharge resistor',
          problem: r`A field winding of 8 H and 0.2 Ω carries 500 A. It is to be disconnected with a discharge resistor across it, and the voltage across the winding must not exceed 600 V. Find the resistor, the time constant, and how long the current takes to fall to 50 A.`,
          steps: [
            r`At $0^+$ all 500 A flows through the discharge resistor, the highest voltage it will see: $R_d = \frac{600}{500} = 1.2$ Ω.`,
            r`The current decays through both: $\tau = \frac{8}{0.2 + 1.2} = 5.714$ s.`,
            r`$50 = 500e^{-t/\tau}$, so $t = 5.714\ln10 = 13.16$ s.`,
          ],
          answer: r`1.2 Ω; 5.71 s; 13.2 s.`,
        },
      ],
      traps: [
        r`$\tau = \frac{L}{R}$, not $LR$ or $\frac{R}{L}$.`,
        r`In an RL circuit a larger R is FASTER; in an RC circuit, slower.`,
      ],
      check: [
        { q: r`What is the initial rate of rise of current when 12 V is switched onto a 4 mH coil?`, a: r`$\frac{12}{0.004} = 3000$ A/s.` },
        { q: r`A decaying coil current reads 8 A at 1 ms and 2.94 A at 4 ms. What is the time constant?`, a: r`$\tau = \frac{3}{\ln(8/2.94)} = 3.0$ ms.` },
      ],
    },
    {
      name: 'RC Transients',
      inShort: r`Capacitor voltage moves exponentially with time constant $\tau = RC$.`,
      body: [
        r`A capacitor charging through R from a dc source V starts with its voltage where it was and heads for V: $v_C = V + (V_0 - V)e^{-t/RC}$. The current jumps at once to $\frac{V - V_0}{R}$ and then dies away, which is why charging current is largest at the start and zero when the capacitor is full.`,
        r`| | Charging from $V_0$ toward V | Discharging from $V_0$ |
|---|---|---|
| Capacitor voltage | $V + (V_0 - V)e^{-t/\tau}$ | $V_0e^{-t/\tau}$ |
| Current | $\frac{V - V_0}{R}e^{-t/\tau}$ | $-\frac{V_0}{R}e^{-t/\tau}$ |
| After one τ | 63.2% of the change done | 36.8% of $V_0$ left |`,
        {
          type: 'plot',
          alt: 'A 100 microfarad capacitor charging through 10 kilohms from 50 V: the voltage rises from zero toward 50 V and passes 40 V at 1.61 seconds.',
          caption: '100 µF charging through 10 kΩ from 50 V: it passes 40 V at t = τ ln 5 = 1.61 s.',
          x: [0, 5],
          y: [0, 55],
          xLabel: 't (s)',
          yLabel: 'v_C (V)',
          series: [{ f: (t) => 50 * (1 - Math.exp(-t)), label: 'v_C', area: true }],
          marks: [{ x: Math.log(5), label: '1.61 s' }, { y: 40, label: '40 V' }],
        },
        r`Every first-order quantity, in RL or RC, follows the same recipe: $x(t) = x(\infty) + [x(0^+) - x(\infty)]e^{-t/\tau}$, so the time to reach a value is $t = \tau\ln\frac{x(0^+) - x(\infty)}{x(t) - x(\infty)}$. Charging a capacitor from a dc source through any resistance wastes $\frac12CV^2$ in the resistor, as much as the capacitor ends up storing.`,
      ],
      keyIdeas: [
        r`$x(t) = x(\infty) + [x(0^+) - x(\infty)]e^{-t/\tau}$, $\tau = RC$.`,
        r`Time to a value: $t = \tau\ln\frac{x(0^+) - x(\infty)}{x(t) - x(\infty)}$; to half the change, $0.693\tau$.`,
        r`Charging from dc loses $\frac12CV^2$ in the resistor, whatever R is.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Time to a voltage',
          problem: r`A 100 µF capacitor charges from 0 through 10 kΩ from 50 V. How long until it reaches 40 V, and how much energy is lost in the resistor by the end?`,
          steps: [
            r`$\tau = 10^4 \times 10^{-4} = 1$ s.`,
            r`$t = 1 \times \ln\frac{0 - 50}{40 - 50} = \ln5 = 1.609$ s.`,
            r`Lost: $\frac12 \times 10^{-4} \times 50^2 = 0.125$ J.`,
          ],
          answer: r`1.61 s; 0.125 J.`,
        },
        {
          level: 'board',
          title: 'A capacitor that starts charged',
          problem: r`A 20 µF capacitor already at 50 V is switched through 5 kΩ onto 200 V. Find the starting current, the voltage at 0.2 s, and when it reaches 150 V.`,
          steps: [
            r`$\tau = 5000 \times 20 \times 10^{-6} = 0.1$ s; $i(0^+) = \frac{200 - 50}{5000} = 30$ mA.`,
            r`$v_C = 200 + (50 - 200)e^{-2} = 200 - 150 \times 0.1353 = 179.7$ V.`,
            r`$t = 0.1\ln\frac{50 - 200}{150 - 200} = 0.1\ln3 = 0.1099$ s.`,
          ],
          answer: r`30 mA; 179.7 V; 0.110 s.`,
        },
      ],
      traps: [
        r`A capacitor that starts charged: use $V - V_0$, not V, for the starting current.`,
        r`Discharging over one τ leaves 36.8%, not 63.2%.`,
      ],
      check: [
        { q: r`5 µF charges through 200 kΩ from 300 V, starting empty. How long to reach 225 V?`, a: r`$\tau = 1$ s, so $t = \ln\frac{300}{75} = \ln4 = 1.39$ s.` },
        { q: r`When is a charging capacitor's current smallest?`, a: r`When it is fully charged: the current has died to zero.` },
      ],
    },
    {
      name: 'RLC Transients',
      inShort: r`Two storage elements give a second-order equation set by $\alpha$ and $\omega_0$.`,
      body: [
        r`Switch a dc source V onto R, L and C in series, starting from rest, and the current obeys $\frac{d^2i}{dt^2} + \frac{R}{L}\frac{di}{dt} + \frac{i}{LC} = 0$. Its roots are $s = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$, with $\alpha = \frac{R}{2L}$ and $\omega_0 = \frac{1}{\sqrt{LC}}$. The current starts at zero (the coil) with slope $\frac{V}{L}$ (all of V across the coil), and that fixes the constants:`,
        r`| Case | Condition | Current from rest |
|---|---|---|
| Overdamped | $\alpha > \omega_0$ | $\frac{V}{\beta L}e^{-\alpha t}\sinh\beta t$, $\beta = \sqrt{\alpha^2 - \omega_0^2}$ |
| Critically damped | $\alpha = \omega_0$ | $\frac{V}{L}te^{-\alpha t}$ |
| Underdamped | $\alpha < \omega_0$ | $\frac{V}{\omega_dL}e^{-\alpha t}\sin\omega_dt$, $\omega_d = \sqrt{\omega_0^2 - \alpha^2}$ |`,
        {
          type: 'plot',
          alt: 'The underdamped current 10 e to the minus 7t sine 24t: a sine wave whose peaks shrink inside a dashed exponential envelope, the first peak 6.60 A at 0.054 s.',
          caption: 'An underdamped current (solid) rings inside its exponential envelope (dashed), which α sets.',
          x: [0, 0.6],
          y: [-11, 11],
          xLabel: 't (s)',
          yLabel: 'i (A)',
          series: [
            { f: (t) => 10 * Math.exp(-7 * t) * Math.sin(24 * t), label: 'i' },
            { f: (t) => 10 * Math.exp(-7 * t), label: 'envelope', dashed: true, colour: colourOf(1) },
            { f: (t) => -10 * Math.exp(-7 * t), label: 'envelope below', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ at: [Math.atan2(24, 7) / 24, 10 * Math.exp((-7 * Math.atan2(24, 7)) / 24) * Math.sin(Math.atan2(24, 7))], label: '6.60 A' }],
        },
        r`A parallel RLC has the same $\omega_0$ but $\alpha = \frac{1}{2RC}$. With no resistance at all ($\alpha = 0$) the energy swaps between L and C forever: an undamped sine. Some texts write $\alpha = -\frac{R}{2L}$ and the roots as $\alpha \pm \beta$; the answers are the same.`,
      ],
      keyIdeas: [
        r`$s = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$, $\omega_0 = \frac{1}{\sqrt{LC}}$; series $\alpha = \frac{R}{2L}$, parallel $\alpha = \frac{1}{2RC}$.`,
        r`From rest on dc: $i(0) = 0$ and $\frac{di}{dt}(0) = \frac{V}{L}$.`,
        r`Underdamped from rest: $i = \frac{V}{\omega_dL}e^{-\alpha t}\sin\omega_dt$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Which kind of response?',
          problem: r`A series RLC has $R = 20$ Ω, $L = 0.1$ H, $C = 10$ µF. Find $\alpha$, $\omega_0$ and the kind of response.`,
          steps: [
            r`$\alpha = \frac{20}{0.2} = 100$ Np/s; $\omega_0 = \frac{1}{\sqrt{0.1 \times 10^{-5}}} = 1000$ rad/s.`,
            r`$\alpha < \omega_0$: underdamped, ringing at $\omega_d = \sqrt{1000^2 - 100^2} = 995$ rad/s.`,
          ],
          answer: r`100 Np/s, 1000 rad/s, underdamped at 995 rad/s.`,
        },
        {
          level: 'board',
          title: 'The current, and its first peak',
          problem: r`A 0.5 H coil, a 7 Ω resistor and a 3.2 mF capacitor in series are switched onto 120 V dc, starting from rest. Find the current and its first peak.`,
          steps: [
            r`$\alpha = \frac{7}{1} = 7$; $\omega_0 = \frac{1}{\sqrt{0.5 \times 0.0032}} = 25$; $\omega_d = \sqrt{625 - 49} = 24$ rad/s: underdamped.`,
            r`$i = \frac{120}{24 \times 0.5}e^{-7t}\sin24t = 10e^{-7t}\sin24t$ A.`,
            r`The peak is where the slope is zero: $\tan24t = \frac{24}{7}$, so $t = \frac{1.2870}{24} = 0.05363$ s, and $i = 10e^{-0.3754} \times 0.96 = 6.60$ A.`,
          ],
          answer: r`$i = 10e^{-7t}\sin24t$ A, peaking at 6.60 A after 0.0536 s.`,
        },
      ],
      traps: [
        r`A larger series R damps MORE; a larger parallel R damps LESS.`,
        r`Use $\omega_d$, not $\omega_0$, in the ringing sine.`,
      ],
      check: [
        { q: r`What capacitance makes a series circuit of 4 Ω and 1 H critically damped?`, a: r`$\frac{R}{2L} = \frac{1}{\sqrt{LC}}$ gives $C = \frac{4L}{R^2} = 0.25$ F.` },
        { q: r`A charged capacitor discharges into a pure inductor. When, in terms of the period T, is the inductor's energy first a maximum?`, a: r`At $\frac{T}{4}$, when the capacitor is empty and the current is largest.` },
      ],
    },
    {
      name: 'Natural and Forced Response',
      inShort: r`Total response = a natural part that dies away + a forced part that copies the source.`,
      body: [
        r`Any linear circuit's response splits in two. The **forced** (steady-state) part is what the source keeps driving: a constant for dc, a sinusoid at the source's frequency for ac (found with phasors). The **natural** (transient) part is the circuit's own behaviour, the exponentials or ringing set by its characteristic roots, with constants still unknown. Add the two FIRST, then choose the constants so the total matches the initial value (and, for second order, the initial slope).`,
        {
          type: 'plot',
          alt: 'A series RLC capacitor voltage rising from zero to 10 V, drawn as the forced part, a constant 10 V line, plus a natural part starting at minus 10 V and dying away.',
          caption: 'The total (solid) is the forced 10 V plus a natural part (dashed) that starts at −10 V and dies away.',
          x: [0, 6],
          y: [-11, 12],
          xLabel: 't (s)',
          yLabel: 'v_C (V)',
          series: [
            { f: (t) => 10 - (40 / 3) * Math.exp(-t) + (10 / 3) * Math.exp(-4 * t), label: 'total' },
            { f: (t) => -(40 / 3) * Math.exp(-t) + (10 / 3) * Math.exp(-4 * t), label: 'natural', dashed: true },
          ],
          legend: false,
          marks: [{ y: 10, label: 'forced part, 10 V' }],
        },
        r`| Natural response | Form |
|---|---|
| First order | $Ae^{-t/\tau}$ |
| Overdamped | $A_1e^{s_1t} + A_2e^{s_2t}$ |
| Critically damped | $(D_1 + D_2t)e^{-\alpha t}$ |
| Underdamped | $e^{-\alpha t}(B_1\cos\omega_dt + B_2\sin\omega_dt)$ |`,
      ],
      keyIdeas: [
        r`Natural: the circuit's own exponentials, constants unknown. Forced: the steady state the source drives.`,
        r`Add them first, THEN fit the constants to the initial value (and slope).`,
        r`Second-order natural forms: overdamped, critical $(D_1 + D_2t)e^{-\alpha t}$, underdamped $e^{-\alpha t}(B_1\cos + B_2\sin)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Splitting a first-order response',
          problem: r`An RL circuit with $\tau = 0.2$ s carries 0.5 A when a change of source makes its final current 2 A. Write the response and split it.`,
          steps: [
            r`$i = 2 + (0.5 - 2)e^{-5t} = 2 - 1.5e^{-5t}$ A.`,
            r`Forced: 2 A. Natural: $-1.5e^{-5t}$ A.`,
          ],
          answer: r`$i = 2 - 1.5e^{-5t}$ A: forced 2 A, natural $-1.5e^{-5t}$ A.`,
        },
        {
          level: 'board',
          title: 'Fitting a second-order response',
          problem: r`A series circuit of 5 Ω, 1 H and 0.25 F is switched onto 10 V dc from rest. Find the capacitor voltage.`,
          steps: [
            r`Roots of $s^2 + 5s + 4 = 0$: $s = -1$ and $-4$ (overdamped). Forced: 10 V.`,
            r`$v_C = 10 + A_1e^{-t} + A_2e^{-4t}$. At $0^+$: $v_C = 0$, so $A_1 + A_2 = -10$; and $\frac{dv_C}{dt} = \frac{i}{C} = 0$, so $-A_1 - 4A_2 = 0$.`,
            r`Then $A_1 = -4A_2$, so $-3A_2 = -10$: $A_2 = 3.333$ and $A_1 = -13.33$.`,
          ],
          answer: r`$v_C = 10 - 13.33e^{-t} + 3.333e^{-4t}$ V.`,
        },
      ],
      traps: [
        r`Fitting the natural constants BEFORE adding the forced part gives the wrong answer.`,
        r`For ac sources the forced part is a sinusoid, not the final dc value.`,
      ],
      check: [
        { q: r`In $v = 50 - 30e^{-10t}$ V, which part is forced?`, a: r`The 50 V.` },
        { q: r`In the board example, when has the natural part's slower term fallen to 1% of the forced 10 V?`, a: r`$13.33e^{-t} = 0.1$, so $t = \ln133.3 = 4.89$ s.` },
      ],
    },
    {
      name: 'Damping',
      inShort: r`How quickly the ringing dies, on one scale: the damping ratio $\zeta = \alpha/\omega_0$.`,
      body: [
        r`The **damping ratio** $\zeta = \frac{\alpha}{\omega_0}$ puts every second-order circuit on one scale. For a series RLC, $\zeta = \frac{R}{2}\sqrt{\frac{C}{L}}$, so the critical resistance is $2\sqrt{\frac{L}{C}}$; for a parallel RLC it is $\frac12\sqrt{\frac{L}{C}}$.`,
        r`| Damping ratio | Name | Step response |
|---|---|---|
| $\zeta = 0$ | undamped | rings forever at $\omega_0$ |
| $0 < \zeta < 1$ | underdamped | overshoots and rings at $\omega_d = \omega_0\sqrt{1 - \zeta^2}$ |
| $\zeta = 1$ | critically damped | the fastest with no overshoot |
| $\zeta > 1$ | overdamped | slow, no overshoot |`,
        {
          type: 'plot',
          alt: 'Step responses of second-order circuits with damping ratios 0.2, 1 and 2, against omega-naught times t: the 0.2 curve overshoots to about 1.5 and rings; the 1 curve rises fastest without overshoot; the 2 curve creeps up slowly.',
          caption: 'The same step through three dampings: ringing (ζ = 0.2), critical (ζ = 1), sluggish (ζ = 2).',
          x: [0, 15],
          y: [0, 2.2],
          xLabel: 'ω₀t',
          yLabel: 'v / V',
          series: [
            { f: stepOf(0.2), label: 'ζ = 0.2' },
            { f: stepOf(1), label: 'ζ = 1' },
            { f: stepOf(2), label: 'ζ = 2', dashed: true },
          ],
        },
        r`How fast ringing dies can be read off a record: the **logarithmic decrement** is $\delta = \ln\frac{x_n}{x_{n+1}}$ between peaks one full period apart, and $\delta = \alpha T_d = \frac{2\pi\zeta}{\sqrt{1 - \zeta^2}}$, so $\zeta = \frac{\delta}{\sqrt{4\pi^2 + \delta^2}}$.`,
      ],
      keyIdeas: [
        r`$\zeta = \frac{\alpha}{\omega_0}$: above 1 overdamped, 1 critical, below 1 underdamped.`,
        r`Series critical $R = 2\sqrt{\frac{L}{C}}$; parallel $\frac12\sqrt{\frac{L}{C}}$; $\omega_d = \omega_0\sqrt{1 - \zeta^2}$.`,
        r`Decrement $\delta = \ln\frac{x_n}{x_{n+1}} = \frac{2\pi\zeta}{\sqrt{1 - \zeta^2}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Damping ratio and decrement',
          problem: r`A series RLC has $R = 40$ Ω, $L = 0.1$ H, $C = 10$ µF. Find $\zeta$, the resistance for critical damping, and the logarithmic decrement.`,
          steps: [
            r`$\alpha = 200$, $\omega_0 = 1000$, so $\zeta = 0.2$.`,
            r`Critical: $2\sqrt{\frac{0.1}{10^{-5}}} = 200$ Ω.`,
            r`$\delta = \frac{2\pi \times 0.2}{\sqrt{0.96}} = 1.283$: each peak is $e^{-1.283} = 0.277$ of the one before.`,
          ],
          answer: r`ζ = 0.2; 200 Ω; δ = 1.28.`,
        },
        {
          level: 'board',
          title: 'Adding resistance, and damping from a record',
          problem: r`(a) A 4 µF capacitor is in series with a 1 H coil of 150 Ω. How much resistance must be added for critical damping? (b) A ringing voltage has peaks of 50 V and 30 V one full period (2 ms) apart. Find ζ and α.`,
          steps: [
            r`(a) $R_{crit} = 2\sqrt{\frac{1}{4 \times 10^{-6}}} = 1000$ Ω, so add $1000 - 150 = 850$ Ω.`,
            r`(b) $\delta = \ln\frac{50}{30} = 0.5108$, so $\zeta = \frac{0.5108}{\sqrt{4\pi^2 + 0.5108^2}} = 0.0810$.`,
            r`$\alpha = \frac{\delta}{T_d} = \frac{0.5108}{0.002} = 255.4$ Np/s.`,
          ],
          answer: r`850 Ω; ζ = 0.081, α = 255 Np/s.`,
        },
      ],
      traps: [
        r`Take the decrement between peaks a FULL period apart; half a period apart they alternate sides.`,
        r`The coil's own resistance counts toward the series R.`,
      ],
      check: [
        { q: r`What series R critically damps 0.2 H with 5 µF?`, a: r`$2\sqrt{\frac{0.2}{5 \times 10^{-6}}} = 400$ Ω.` },
        { q: r`A transient current oscillates and decays. Is R more or less than $2\sqrt{\frac{L}{C}}$?`, a: r`Less: it is underdamped.` },
      ],
    },
    {
      name: 'Step and Impulse Response',
      inShort: r`The response to a sudden step, and to an instant kick, which is the step response's slope.`,
      body: [
        r`The **step response** is what a circuit does when a constant input is switched on from rest. For an underdamped series RLC charging its capacitor to V, $v_C = V\left[1 - e^{-\alpha t}\left(\cos\omega_dt + \frac{\alpha}{\omega_d}\sin\omega_dt\right)\right]$. Three numbers describe it: the **overshoot**, the **peak time**, and the **settling time**.`,
        {
          type: 'plot',
          alt: 'The step response of a circuit with damping ratio 0.2, alpha 200 and ringing at 980 rad/s: overshooting to 1.527 at 3.21 ms, ringing down, and within 2 percent by about 20 ms.',
          caption: 'ζ = 0.2: 52.7% overshoot at the peak time, settled within 2% by about 4/α = 20 ms.',
          x: [0, 30],
          y: [0, 1.7],
          xLabel: 't (ms)',
          yLabel: 'v_C / V',
          series: [{ f: (t) => 1 - Math.exp(-0.2 * t) * (Math.cos(0.9798 * t) + (0.2 / 0.9798) * Math.sin(0.9798 * t)), label: 'v_C' }],
          marks: [
            { at: [Math.PI / 0.9798, 1 + Math.exp((-Math.PI * 0.2) / 0.9798)], label: '52.7% overshoot' },
            { x: 20, label: 't_s ≈ 20 ms' },
          ],
        },
        r`| ζ | 0.1 | 0.2 | 0.3 | 0.5 | 0.707 | 1 |
|---|---|---|---|---|---|---|
| Overshoot | 72.9% | 52.7% | 37.2% | 16.3% | 4.3% | 0 |`,
        r`The **impulse response** $h(t)$ is the response to an instant kick, and it is the slope of the step response: $h = \frac{ds}{dt}$. Physically, an impulse of current puts a charge q into a capacitor at once, so its voltage jumps by $\frac{q}{C}$ and then behaves as an initial condition.`,
      ],
      keyIdeas: [
        r`$\%OS = 100e^{-\pi\zeta/\sqrt{1 - \zeta^2}}$, $t_p = \frac{\pi}{\omega_d}$, $t_s \approx \frac{4}{\alpha}$ (2%).`,
        r`Overshoot depends on ζ alone.`,
        r`Impulse response = slope of the step response; a charge impulse makes $v_C$ jump by $\frac{q}{C}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reading a step response',
          problem: r`For the circuit with $\zeta = 0.2$, $\alpha = 200$ and $\omega_d = 980$ rad/s, find the percent overshoot, the peak time and the settling time of a step response.`,
          steps: [
            r`$\%OS = 100e^{-\pi \times 0.2/\sqrt{0.96}} = 52.7\%$.`,
            r`$t_p = \frac{\pi}{980} = 3.21$ ms.`,
            r`$t_s \approx \frac{4}{200} = 20$ ms.`,
          ],
          answer: r`52.7%; 3.21 ms; 20 ms.`,
        },
        {
          level: 'board',
          title: 'Designing for 10% overshoot',
          problem: r`What damping ratio gives 10% overshoot, and what series R gives it with $L = 0.1$ H and $C = 10$ µF?`,
          steps: [
            r`Invert the overshoot formula: $\zeta = \frac{-\ln0.1}{\sqrt{\pi^2 + \ln^2 0.1}} = \frac{2.303}{3.895} = 0.5912$.`,
            r`$R = 2\zeta\sqrt{\frac{L}{C}} = 2 \times 0.5912 \times 100 = 118.2$ Ω.`,
          ],
          answer: r`ζ = 0.591; R = 118 Ω.`,
        },
      ],
      traps: [
        r`Changing the circuit's size at the same ζ changes the timing, not the overshoot.`,
        r`$t_p$ uses $\omega_d$, not $\omega_0$.`,
      ],
      check: [
        { q: r`What is the overshoot for $\zeta = 0.5$?`, a: r`$100e^{-\pi \times 0.5/\sqrt{0.75}} = 16.3\%$.` },
        { q: r`A step response is $1 - e^{-2t}$. What is the impulse response?`, a: r`Its slope, $2e^{-2t}$.` },
      ],
    },
    {
      name: 'Laplace Transform Solutions',
      inShort: r`Transform the circuit, solve algebra, invert by partial fractions.`,
      body: [
        r`The Laplace transform turns differential equations into algebra. Redraw the circuit in s: every element becomes an impedance, and its stored energy becomes a small source in series. Solve for the unknown as you would a resistive circuit, split it by partial fractions, and read each piece back from a table.`,
        r`| Element | Impedance | Initial-condition source in series |
|---|---|---|
| Resistor | $R$ | none |
| Inductor | $sL$ | $Li(0^-)$, aiding the current |
| Capacitor | $\frac{1}{sC}$ | $\frac{v(0^-)}{s}$, opposing the current |
| dc step V | | $\frac{V}{s}$ |`,
        {
          type: 'circuit',
          alt: 'An s-domain circuit: a 10 over s step source, a 5 ohm resistor, an inductor drawn as sL, and a series source L times i of 0 for its starting current.',
          caption: 'In s, the inductor’s starting current becomes a source Li(0) in series with sL.',
          parts: [
            ['V', [0, 2], [0, 0], '10/s'],
            ['R', [0, 0], [2, 0], '5 Ω'],
            ['L', [2, 0], [4, 0], 'sL'],
            ['V', [4, 0], [4, 2], 'Li(0)'],
            ['wire', [4, 2], [0, 2]],
            ['i', [3, 2], [1, 2], 'I(s)'],
          ],
        },
        r`| $f(t)$ | $F(s)$ |
|---|---|
| step, 1 | $\frac{1}{s}$ |
| $e^{-at}$ | $\frac{1}{s + a}$ |
| $te^{-at}$ | $\frac{1}{(s + a)^2}$ |
| $e^{-at}\sin\omega t$ | $\frac{\omega}{(s + a)^2 + \omega^2}$ |
| $e^{-at}\cos\omega t$ | $\frac{s + a}{(s + a)^2 + \omega^2}$ |`,
        {
          type: 'plot',
          alt: 'Two currents in the 5 ohm, 1 henry circuit after a 10 V step: from rest it rises from zero to 2 A; starting at 1 A it rises from 1 A to the same 2 A.',
          caption: 'The same step from rest and from 1 A: leave out Li(0) and you get only the lower curve.',
          x: [0, 1.2],
          y: [0, 2.6],
          xLabel: 't (s)',
          yLabel: 'i (A)',
          series: [
            { f: (t) => 2 - Math.exp(-5 * t), label: 'from 1 A' },
            { f: (t) => 2 * (1 - Math.exp(-5 * t)), label: 'from rest', dashed: true },
          ],
        },
        r`Check every answer with the **initial and final value theorems**: $f(0^+) = \lim_{s\to\infty}sF(s)$ and $f(\infty) = \lim_{s\to0}sF(s)$ (when the final value exists).`,
      ],
      keyIdeas: [
        r`Elements: $R$, $sL$ with source $Li(0^-)$, $\frac{1}{sC}$ with source $\frac{v(0^-)}{s}$; a dc step is $\frac{V}{s}$.`,
        r`Cover-up: $K_i = (s - p_i)F(s)$ at $s = p_i$.`,
        r`Check: $f(0^+) = \lim sF(s)$ as $s \to \infty$; $f(\infty) = \lim sF(s)$ as $s \to 0$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A coil from rest',
          problem: r`A 10 V step is applied to 5 Ω in series with 1 H, starting with no current. Find $i(t)$ by Laplace.`,
          steps: [
            r`$I(s) = \frac{10/s}{s + 5} = \frac{10}{s(s + 5)}$.`,
            r`Cover-up: $K_1 = \frac{10}{5} = 2$, $K_2 = \frac{10}{-5} = -2$, so $I(s) = \frac{2}{s} - \frac{2}{s + 5}$.`,
          ],
          answer: r`$i = 2(1 - e^{-5t})$ A.`,
        },
        {
          level: 'board',
          title: 'With a starting current',
          problem: r`The same circuit already carries 1 A when the 10 V step is applied (the circuit drawn above). Find $i(t)$ and check it.`,
          steps: [
            r`$I(s) = \frac{10/s + Li(0)}{s + 5} = \frac{10 + s}{s(s + 5)}$.`,
            r`$K_1 = \frac{10}{5} = 2$; $K_2 = \frac{10 - 5}{-5} = -1$. So $i = 2 - e^{-5t}$ A.`,
            r`Check: $i(0^+) = 2 - 1 = 1$ A, the starting current; $i(\infty) = \lim_{s\to0}\frac{10 + s}{s + 5} = 2$ A.`,
          ],
          answer: r`$i = 2 - e^{-5t}$ A.`,
        },
        {
          level: 'board',
          title: 'A second-order circuit',
          problem: r`Find $v_C$ by Laplace for 5 Ω, 1 H and 0.25 F in series switched onto 10 V from rest.`,
          steps: [
            r`$V_C(s) = \frac{10}{s} \cdot \frac{1/LC}{s^2 + (R/L)s + 1/LC} = \frac{40}{s(s + 1)(s + 4)}$.`,
            r`Cover-up: $K_0 = \frac{40}{4} = 10$, $K_1 = \frac{40}{(-1)(3)} = -13.33$, $K_4 = \frac{40}{(-4)(-3)} = 3.333$.`,
          ],
          answer: r`$v_C = 10 - 13.33e^{-t} + 3.333e^{-4t}$ V, the answer the time-domain method gave in Natural and Forced Response.`,
        },
      ],
      traps: [
        r`Leaving out the initial-condition sources gives only the zero-state part of the answer.`,
        r`The final value theorem fails when a pole sits on the imaginary axis or to its right.`,
      ],
      check: [
        { q: r`What is the final value of $I(s) = \frac{10}{s(s + 5)}$?`, a: r`$\lim_{s\to0}sI(s) = 2$ A.` },
        { q: r`What is the inverse transform of $\frac{1}{(s + 3)^2}$?`, a: r`$te^{-3t}$.` },
      ],
    },
    {
      name: 'Transfer Functions',
      inShort: r`$H(s) = \frac{Y(s)}{X(s)}$ with zero initial conditions: the circuit's fingerprint.`,
      body: [
        r`The **transfer function** $H(s) = \frac{Y(s)}{X(s)}$, output over input with everything starting at rest, describes a circuit completely: $Y(s) = H(s)X(s)$ for any input, its inverse transform is the impulse response, and putting $s = j\omega$ gives the frequency response.`,
        r`Its **poles**, the roots of the denominator, are the circuit's characteristic roots, so where they sit tells you the natural response at a glance:`,
        r`| Poles | Natural response |
|---|---|
| Negative real | a decaying exponential (overdamped) |
| Repeated negative real | $te^{-at}$ (critical) |
| Complex, left half-plane | decaying ringing (underdamped) |
| On the imaginary axis | steady oscillation |
| Right half-plane | growing: unstable |`,
        {
          type: 'plot',
          alt: 'The gain of a second-order low-pass with damping ratio 0.1 against frequency on a log scale: 1 at low frequency, peaking at 5.03 just below omega-naught, then falling steeply.',
          caption: 'The frequency response of the standard second-order H(s) at ζ = 0.1: a sharp peak of 5.03 near ω₀.',
          x: [0.2, 10],
          logX: true,
          y: [0, 6],
          xLabel: 'ω / ω₀',
          yLabel: '|H|',
          series: [{ f: (u) => 1 / Math.sqrt((1 - u * u) ** 2 + (0.2 * u) ** 2), label: '|H|' }],
          marks: [{ at: [Math.sqrt(1 - 2 * 0.01), 1 / (0.2 * Math.sqrt(0.99))], label: '5.03 near ω₀' }],
        },
      ],
      keyIdeas: [
        r`$Y(s) = H(s)X(s)$; impulse response $h(t) = \mathcal{L}^{-1}\{H(s)\}$; dc gain $H(0)$.`,
        r`Poles set the natural response; all in the left half-plane means stable.`,
        r`Standard second order $\frac{\omega_0^2}{s^2 + 2\zeta\omega_0s + \omega_0^2}$; put $s = j\omega$ for the frequency response.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A series RLC',
          problem: r`Write $H(s) = V_C/V_s$ for a series RLC with $R = 20$ Ω, $L = 0.1$ H, $C = 10$ µF, and find its poles.`,
          steps: [
            r`$H(s) = \frac{1/LC}{s^2 + (R/L)s + 1/LC} = \frac{10^6}{s^2 + 200s + 10^6}$.`,
            r`Poles: $s = -100 \pm j995$, in the left half-plane: stable and ringing, $\zeta = \frac{100}{1000} = 0.1$.`,
          ],
          answer: r`$H(s) = \frac{10^6}{s^2 + 200s + 10^6}$; poles $-100 \pm j995$.`,
        },
        {
          level: 'board',
          title: 'Impulse, step and dc gain',
          problem: r`A circuit has $H(s) = \frac{20}{s + 4}$. Find its impulse response, its step response and its dc gain.`,
          steps: [
            r`Impulse: $h(t) = 20e^{-4t}$.`,
            r`Step: $\frac{20}{s(s + 4)} = \frac{5}{s} - \frac{5}{s + 4}$, so $5(1 - e^{-4t})$.`,
            r`dc gain: $H(0) = \frac{20}{4} = 5$, the step response's final value.`,
          ],
          answer: r`$20e^{-4t}$; $5(1 - e^{-4t})$; 5.`,
        },
      ],
      traps: [
        r`The transfer function ignores initial conditions; add their response separately.`,
        r`A pole in the right half-plane means growth, however small the input.`,
      ],
      check: [
        { q: r`A system has poles at $s = 2 \pm j3$. Is it stable?`, a: r`No: the poles are in the right half-plane, so its response grows.` },
        { q: r`What is the dc gain of $\frac{10^6}{s^2 + 200s + 10^6}$?`, a: r`1.` },
      ],
    },
    {
      name: 'AC Transients and Switching',
      inShort: r`Switching an ac circuit adds a decaying offset to the steady sinusoid.`,
      body: [
        r`Close a sinusoidal source $v = V_m\sin(\omega t + \theta)$ onto R and L, and the current is the steady sinusoid plus whatever dc offset makes it start at zero: $i = \frac{V_m}{Z}\left[\sin(\omega t + \theta - \phi) - \sin(\theta - \phi)e^{-Rt/L}\right]$, with $\phi$ the impedance angle. Switched at $\theta = \phi$ there is no offset at all; switched 90° from that, the offset is a full peak, and the first peak of current approaches twice the steady one.`,
        {
          type: 'plot',
          alt: 'A fully offset current with X over R of 10 over two cycles: starting at zero and peaking at 1.73 times the steady peak half a cycle later, while the steady sinusoid swings symmetrically about zero.',
          caption: 'Switched at the worst moment with X/R = 10: the current (solid) rides on a decaying offset above the steady sinusoid (dashed).',
          x: [0, 720],
          y: [-1.3, 2.1],
          xLabel: 'ωt (°)',
          yLabel: 'i / I_m',
          series: [
            { f: (x) => Math.sin((x - 90) * deg) + Math.exp((-x * deg) / 10), label: 'i' },
            { f: (x) => Math.sin((x - 90) * deg), label: 'steady', dashed: true },
          ],
          legend: false,
          marks: [{ at: [180, 1 + Math.exp(-Math.PI / 10)], label: '1.73 × the steady peak' }],
        },
        r`| Switching event | What to expect |
|---|---|
| Fault, fully offset | first peak $\approx \sqrt2I(1 + e^{-\pi R/X})$ |
| Energizing a capacitor bank | inrush $V_{pk}\sqrt{\frac{C}{L}}$ at $\frac{1}{2\pi\sqrt{LC}}$; voltage up to 2 pu |
| Current chopping in an inductive circuit | $\frac12LI^2 = \frac12CV^2$, so $V = I\sqrt{\frac{L}{C}}$ |
| Energizing a transformer | magnetizing inrush, many times rated, from the flux offset |`,
      ],
      keyIdeas: [
        r`RL switched at angle θ: $i = \frac{V_m}{Z}[\sin(\omega t + \theta - \phi) - \sin(\theta - \phi)e^{-Rt/L}]$.`,
        r`No offset at $\theta = \phi$; full offset 90° from it. Fault peak $\approx \sqrt2I(1 + e^{-\pi R/X})$.`,
        r`Capacitor inrush $V_{pk}\sqrt{\frac{C}{L}}$; chopping overvoltage $I\sqrt{\frac{L}{C}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'When is there no offset?',
          problem: r`A 230 V, 60 Hz source is switched onto 3 Ω in series with 4 Ω of reactance. At what voltage angle is there no dc offset, how large can the offset be, and how fast does it decay?`,
          steps: [
            r`$\phi = \tan^{-1}\frac{4}{3} = 53.13^\circ$: switching at $\theta = 53.13^\circ$ gives none.`,
            r`$I_m = \frac{230\sqrt2}{5} = 65.05$ A: the largest offset, switching at $\theta = \phi \pm 90^\circ$.`,
            r`$\tau = \frac{L}{R} = \frac{4/377}{3} = 3.54$ ms.`,
          ],
          answer: r`At 53.13°; up to 65.05 A; τ = 3.54 ms.`,
        },
        {
          level: 'board',
          title: 'A fault peak and a chopping overvoltage',
          problem: r`A fault has a symmetrical current of 20 kA RMS and $X/R = 10$. Estimate the first peak of the fully offset current. Then: what voltage does chopping 3 A in a 0.5 H winding with 2 nF of stray capacitance give?`,
          steps: [
            r`$i_{pk} \approx \sqrt2 \times 20(1 + e^{-\pi/10}) = 28.28 \times 1.730 = 48.94$ kA.`,
            r`Chopping: $3\sqrt{\frac{0.5}{2 \times 10^{-9}}} = 3 \times 15\,811 = 47.43$ kV.`,
          ],
          answer: r`About 48.9 kA; 47.4 kV.`,
        },
        {
          level: 'board',
          title: 'Capacitor bank inrush',
          problem: r`A 13.8 kV bank of 50 µF per phase (wye) is energized through 0.5 mH per phase at the voltage peak. Estimate the inrush current and its frequency.`,
          steps: [
            r`Peak phase voltage: $\frac{13\,800\sqrt2}{\sqrt3} = 11\,268$ V.`,
            r`$i = 11\,268\sqrt{\frac{50 \times 10^{-6}}{0.5 \times 10^{-3}}} = 11\,268 \times 0.3162 = 3563$ A.`,
            r`$f = \frac{1}{2\pi\sqrt{50 \times 10^{-6} \times 0.5 \times 10^{-3}}} = 1007$ Hz.`,
          ],
          answer: r`About 3.56 kA at about 1 kHz.`,
        },
      ],
      traps: [
        r`The peak a breaker must close onto is the asymmetrical one, not $\sqrt2$ times the RMS symmetrical current.`,
        r`A purely inductive circuit switched at voltage ZERO gets the full offset; switched at the peak, none.`,
      ],
      check: [
        { q: r`As X/R grows without limit, the first fault peak tends to how many times the RMS symmetrical current?`, a: r`$2\sqrt2$, about 2.83.` },
        { q: r`What limits capacitor inrush current?`, a: r`The inductance in series: $V_{pk}\sqrt{\frac{C}{L}}$.` },
      ],
    },
    {
      name: 'Traveling Waves',
      inShort: r`On long lines a surge travels at nearly the speed of light and reflects at every change of impedance.`,
      body: [
        r`A sudden voltage on a long line does not appear everywhere at once: it travels as a wave at $v = \frac{1}{\sqrt{LC}}$ (L and C per unit length), close to $3 \times 10^8$ m/s on overhead lines and about half that in cables. The wave's current and voltage stand in the ratio of the **surge impedance** $Z_0 = \sqrt{\frac{L}{C}}$, a few hundred ohms overhead and a few tens in cables.`,
        r`Where the impedance changes, part of the wave reflects: $\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}$, and the voltage passed on is $(1 + \Gamma)$ times the arriving one. The current reflects with the opposite sign.`,
        r`| Line ends in | Γ | Voltage there | Current there |
|---|---|---|---|
| Open circuit | +1 | doubles | zero |
| Short circuit | −1 | zero | doubles |
| Matched, $Z_L = Z_0$ | 0 | passes on, no reflection | passes on |
| Lower impedance (a cable) | negative | falls | rises |
| Higher impedance (a transformer) | positive | rises | falls |`,
        {
          type: 'plot',
          alt: 'The voltage at the open end of a line fed through a source resistance a third of its surge impedance: 150 V after one transit, then 75, 112.5, 93.75 V, stepping in toward the dc answer of 100 V.',
          caption: 'A 100 V source with Zs = Z₀/3 on an open line: each round trip of the reflections brings the far end closer to the dc answer.',
          x: [0, 12],
          y: [0, 170],
          xLabel: 't / T',
          yLabel: 'v (V)',
          series: [
            {
              f: (t) => {
                let v = 0;
                for (let k = 0; 2 * k + 1 <= t; k++) v += 150 * (-0.5) ** k;
                return v;
              },
              label: 'far end',
            },
          ],
          marks: [{ y: 100, label: 'dc answer, 100 V' }],
        },
        r`A **lattice (Bewley) diagram** keeps track of the waves bouncing between the ends, distance across and time down, and the reflections add up to the steady dc answer.`,
      ],
      keyIdeas: [
        r`$v = \frac{1}{\sqrt{LC}}$; $Z_0 = \sqrt{\frac{L}{C}}$; $i = \frac{v}{Z_0}$.`,
        r`Launched $v^+ = V_s\frac{Z_0}{Z_s + Z_0}$; at a junction $\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}$, transmitted $1 + \Gamma$.`,
        r`Open end: voltage doubles; short: voltage reverses; branches in parallel count as one $Z_L$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An overhead line meets a cable',
          problem: r`A 600 kV surge on an overhead line ($Z_0 = 400$ Ω) reaches a cable ($Z = 40$ Ω). Find the voltage passed into the cable, the reflected voltage, and the cable current.`,
          steps: [
            r`$\Gamma = \frac{40 - 400}{40 + 400} = -0.8182$; reflected $-0.8182 \times 600 = -490.9$ kV.`,
            r`Transmitted: $(1 - 0.8182) \times 600 = 109.1$ kV.`,
            r`Cable current: $\frac{109\,100}{40} = 2727$ A.`,
          ],
          answer: r`109.1 kV into the cable; −490.9 kV reflected; 2727 A.`,
        },
        {
          level: 'board',
          title: 'Speed, surge impedance and travel time',
          problem: r`An overhead line has 1.2 mH/km and 9.5 nF/km. Find its surge impedance, the wave speed, and the time a surge takes along 150 km.`,
          steps: [
            r`$Z_0 = \sqrt{\frac{1.2 \times 10^{-3}}{9.5 \times 10^{-9}}} = 355.4$ Ω.`,
            r`$v = \frac{1}{\sqrt{1.2 \times 10^{-3} \times 9.5 \times 10^{-9}}} = 296\,200$ km/s.`,
            r`$t = \frac{150}{296\,200} = 506.5$ µs.`,
          ],
          answer: r`355 Ω; about $2.96 \times 10^5$ km/s; 506 µs.`,
        },
        {
          level: 'board',
          title: 'Reflections settling',
          problem: r`A 100 V dc source with an internal resistance of 50 Ω is switched onto an open-ended line with $Z_0 = 150$ Ω. Find the far-end voltage after the first four arrivals.`,
          steps: [
            r`Launched: $100 \times \frac{150}{50 + 150} = 75$ V. At the source, $\Gamma_s = \frac{50 - 150}{50 + 150} = -0.5$; at the open end, +1.`,
            r`First arrival doubles: 150 V. Each later arrival adds $150 \times (-0.5)^k$: then 75 V, 112.5 V, 93.75 V.`,
          ],
          answer: r`150, 75, 112.5, 93.75 V, closing in on 100 V.`,
        },
      ],
      traps: [
        r`The current reflects with the OPPOSITE sign to the voltage.`,
        r`Two equal lines leaving a junction count as one impedance of half the value.`,
      ],
      check: [
        { q: r`A surge on a 400 Ω line reaches a junction with two more 400 Ω lines. What fraction of its voltage passes on?`, a: r`$Z_L = 200$ Ω, $\Gamma = -\frac13$, so $\frac23$.` },
        { q: r`What happens to a voltage surge at an open end?`, a: r`It doubles, and the current there is zero.` },
      ],
    },
  ],
};
