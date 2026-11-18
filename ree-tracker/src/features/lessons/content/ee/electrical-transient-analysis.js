// Library › Lessons › EE › Electrical Transient Analysis (2026-11-18): written
// for the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. The basic first-order step
// formula and RLC roots are introduced in Electric Circuits 1, s-domain
// models in Electric Circuits 2; this lesson works them through.
const r = String.raw;

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
      keyIdeas: [
        r`Continuity: $v_C(0^+) = v_C(0^-)$ and $i_L(0^+) = i_L(0^-)$. Resistor voltages, capacitor currents and inductor voltages can jump.`,
        r`At $t = 0^+$: an uncharged capacitor is a short, a current-free inductor is an open; a charged C is a voltage source, a carrying L a current source.`,
        r`At $t = \infty$ with dc sources: C is an open circuit, L a short. Solve the resistive circuit for the final values.`,
        r`Second-order circuits also need the starting slopes: $\frac{dv_C}{dt}(0^+) = \frac{i_C(0^+)}{C}$, $\frac{di_L}{dt}(0^+) = \frac{v_L(0^+)}{L}$.`,
      ],
      example: {
        problem: r`A 12 V source feeds a 4 Ω resistor in series with an 8 Ω resistor that has an uncharged capacitor across it. The switch closes at $t = 0$. Find the source current at $0^+$ and at $\infty$, and the final capacitor voltage.`,
        solution: r`At $0^+$ the capacitor shorts the 8 Ω: $i = \frac{12}{4} = 3$ A. At $\infty$ it is open: $i = \frac{12}{4 + 8} = 1$ A, and $v_C = 1 \times 8 = 8$ V.`,
      },
      traps: [r`Find $v_C(0^-)$ and $i_L(0^-)$ from the circuit BEFORE switching, then carry only those two quantities across.`],
    },
    {
      name: 'RL Transients',
      inShort: r`Inductor current moves exponentially with time constant $\tau = L/R$.`,
      keyIdeas: [
        r`Step on: $i = \frac{V}{R}(1 - e^{-Rt/L})$ and $v_L = Ve^{-Rt/L}$; the whole step appears across L at first.`,
        r`Source removed: $i = I_0e^{-Rt/L}$ and the inductor voltage reverses to keep the current going.`,
        r`$R$ is the Thévenin resistance the inductor sees. A larger R makes an RL circuit FASTER.`,
        r`Interrupting an inductor with no path gives a huge $L\frac{di}{dt}$: hence freewheeling diodes and snubbers.`,
      ],
      example: {
        problem: r`A 24 V source is switched onto 8 Ω in series with 0.4 H. Find the time constant, the current at 0.1 s, and the inductor voltage then.`,
        solution: r`$\tau = \frac{0.4}{8} = 0.05$ s, so 0.1 s is $2\tau$. $i = 3(1 - e^{-2}) = 2.59$ A; $v_L = 24e^{-2} = 3.25$ V.`,
      },
      traps: [r`$\tau = L/R$, not $LR$ or $R/L$; the exponent is $-Rt/L$.`],
    },
    {
      name: 'RC Transients',
      inShort: r`Capacitor voltage moves exponentially with time constant $\tau = RC$.`,
      keyIdeas: [
        r`Every first-order response: $x(t) = x(\infty) + [x(0^+) - x(\infty)]e^{-t/\tau}$.`,
        r`Charging current $i = \frac{V - V_0}{R}e^{-t/RC}$ jumps at once, then decays to zero.`,
        r`After 1, 2, 3, 4, 5 time constants: 63.2, 86.5, 95.0, 98.2, 99.3% of the change. Time to a value: $t = \tau\ln\frac{x(0^+) - x(\infty)}{x(t) - x(\infty)}$.`,
        r`Charging from a dc source through any R loses $\frac12CV^2$ in the resistor, as much as the capacitor stores.`,
      ],
      example: {
        problem: r`A 100 µF capacitor charges from 0 through 10 kΩ from 50 V. How long until it reaches 40 V, and how much energy is lost in the resistor by the end?`,
        solution: r`$\tau = 10^4 \times 10^{-4} = 1$ s. $t = 1 \times \ln\frac{0 - 50}{40 - 50} = \ln 5 = 1.61$ s. Lost: $\frac12 \times 10^{-4} \times 50^2 = 0.125$ J.`,
      },
      traps: [r`In an RC circuit a larger R makes it SLOWER; in an RL circuit, faster.`],
    },
    {
      name: 'RLC Transients',
      inShort: r`Two storage elements give a second-order equation set by $\alpha$ and $\omega_0$.`,
      keyIdeas: [
        r`$\frac{d^2x}{dt^2} + 2\alpha\frac{dx}{dt} + \omega_0^2x = \omega_0^2x_\infty$, with roots $s = -\alpha \pm \sqrt{\alpha^2 - \omega_0^2}$.`,
        r`$\omega_0 = \frac{1}{\sqrt{LC}}$ for both; series $\alpha = \frac{R}{2L}$, parallel $\alpha = \frac{1}{2RC}$.`,
        r`Two initial conditions are needed: the value and the slope at $0^+$.`,
      ],
      example: {
        problem: r`A series RLC has $R = 20$ Ω, $L = 0.1$ H, $C = 10$ µF. Find $\alpha$, $\omega_0$ and the kind of response.`,
        solution: r`$\alpha = \frac{20}{0.2} = 100$ Np/s; $\omega_0 = \frac{1}{\sqrt{0.1 \times 10^{-5}}} = 1000$ rad/s. $\alpha < \omega_0$: underdamped, ringing at $\omega_d = \sqrt{1000^2 - 100^2} = 995$ rad/s.`,
      },
      traps: [r`A larger parallel R means LESS damping; a larger series R means more.`],
    },
    {
      name: 'Natural and Forced Response',
      inShort: r`Total response = a natural part that dies away + a forced part that copies the source.`,
      keyIdeas: [
        r`Natural: the circuit's own exponentials (from the characteristic roots), with constants still unknown.`,
        r`Forced: the steady state the source drives: a constant for dc, a sinusoid at the source frequency for ac (use phasors).`,
        r`Add them first, THEN fit the constants to the initial conditions.`,
        r`Second-order natural forms: overdamped $A_1e^{s_1t} + A_2e^{s_2t}$; critical $(D_1 + D_2t)e^{-\alpha t}$; underdamped $e^{-\alpha t}(B_1\cos\omega_dt + B_2\sin\omega_dt)$.`,
      ],
      example: {
        problem: r`An RL circuit with $\tau = 0.2$ s carries 0.5 A when a change of source makes its final current 2 A. Write the response and split it.`,
        solution: r`$i = 2 + (0.5 - 2)e^{-5t} = 2 - 1.5e^{-5t}$ A. Forced: 2 A. Natural: $-1.5e^{-5t}$ A.`,
      },
      traps: [r`Fitting the natural constants to the initial value BEFORE adding the forced part gives the wrong answer.`],
    },
    {
      name: 'Damping',
      inShort: r`How quickly the ringing dies, on one scale: the damping ratio $\zeta = \alpha/\omega_0$.`,
      keyIdeas: [
        r`$\zeta > 1$ overdamped, $= 1$ critical (fastest with no overshoot), $< 1$ underdamped.`,
        r`Series: $\zeta = \frac{R}{2}\sqrt{\frac{C}{L}}$, critical at $R = 2\sqrt{\frac{L}{C}}$; parallel critical at $R = \frac12\sqrt{\frac{L}{C}}$.`,
        r`$\omega_d = \omega_0\sqrt{1 - \zeta^2}$; series $Q = \frac{1}{2\zeta}$.`,
        r`Logarithmic decrement: $\delta = \ln\frac{x_n}{x_{n+1}} = \alpha T_d = \frac{2\pi\zeta}{\sqrt{1 - \zeta^2}}$.`,
      ],
      example: {
        problem: r`A series RLC has $R = 40$ Ω, $L = 0.1$ H, $C = 10$ µF. Find $\zeta$, the resistance for critical damping, and the logarithmic decrement.`,
        solution: r`$\alpha = 200$, $\omega_0 = 1000$, so $\zeta = 0.2$. Critical: $2\sqrt{\frac{0.1}{10^{-5}}} = 200$ Ω. $\delta = \frac{2\pi \times 0.2}{\sqrt{0.96}} = 1.28$: each peak is $e^{-1.28} = 0.28$ of the one before.`,
      },
      traps: [r`Take the decrement between peaks a FULL period apart; half a period apart they alternate sides.`],
    },
    {
      name: 'Step and Impulse Response',
      inShort: r`The response to a sudden step, and to an instant kick, which is the step response's slope.`,
      keyIdeas: [
        r`Underdamped series RLC from rest: $v_C = V\left[1 - e^{-\alpha t}\left(\cos\omega_dt + \frac{\alpha}{\omega_d}\sin\omega_dt\right)\right]$.`,
        r`Overshoot $\%OS = 100e^{-\pi\zeta/\sqrt{1 - \zeta^2}}$, peak time $t_p = \frac{\pi}{\omega_d}$, settling (2%) $t_s \approx \frac{4}{\alpha}$.`,
        r`Impulse response $h(t) = \frac{d}{dt}s(t)$. An impulse of current puts charge in at once, so $v_C$ jumps by $\frac{q}{C}$.`,
      ],
      example: {
        problem: r`For the circuit with $\zeta = 0.2$, $\alpha = 200$ and $\omega_d = 980$ rad/s, find the percent overshoot, the peak time and the settling time of a step response.`,
        solution: r`$\%OS = 100e^{-\pi \times 0.2/\sqrt{0.96}} = 52.7\%$. $t_p = \frac{\pi}{980} = 3.21$ ms. $t_s \approx \frac{4}{200} = 20$ ms.`,
      },
      traps: [r`Overshoot depends on $\zeta$ alone; changing only the circuit's size (same $\zeta$) changes the timing, not the overshoot.`],
    },
    {
      name: 'Laplace Transform Solutions',
      inShort: r`Transform the circuit, solve algebra, invert by partial fractions.`,
      keyIdeas: [
        r`Elements: $R$, $sL$ with a source $Li(0^-)$, $\frac{1}{sC}$ with a source $\frac{v(0^-)}{s}$; a dc step is $\frac{V}{s}$.`,
        r`Pairs: $\frac{1}{s+a} \leftrightarrow e^{-at}$, $\frac{1}{(s+a)^2} \leftrightarrow te^{-at}$, $\frac{\omega}{(s+a)^2 + \omega^2} \leftrightarrow e^{-at}\sin\omega t$.`,
        r`Cover-up: $K_i = (s - p_i)F(s)$ at $s = p_i$. Check with the initial and final value theorems.`,
      ],
      example: {
        problem: r`A 10 V step is applied to 5 Ω in series with 1 H, starting with no current. Find $i(t)$ by Laplace.`,
        solution: r`$I(s) = \frac{10}{s(s + 5)} = \frac{2}{s} - \frac{2}{s + 5}$ (cover-up: $K_1 = \frac{10}{5}$, $K_2 = \frac{10}{-5}$). So $i = 2(1 - e^{-5t})$ A.`,
      },
      traps: [r`Leaving out the initial-condition sources gives only the zero-state part of the answer.`],
    },
    {
      name: 'Transfer Functions',
      inShort: r`$H(s) = \frac{Y(s)}{X(s)}$ with zero initial conditions: the circuit's fingerprint.`,
      keyIdeas: [
        r`$Y(s) = H(s)X(s)$; the impulse response is $\mathcal{L}^{-1}\{H(s)\}$.`,
        r`Poles (denominator roots) set the natural response; all in the left half-plane means stable.`,
        r`Standard second order: $\frac{\omega_0^2}{s^2 + 2\zeta\omega_0s + \omega_0^2}$; series RLC to $v_C$: $\frac{1/LC}{s^2 + (R/L)s + 1/LC}$. Put $s = j\omega$ for the frequency response.`,
      ],
      example: {
        problem: r`Write $H(s) = V_C/V_s$ for a series RLC with $R = 20$ Ω, $L = 0.1$ H, $C = 10$ µF, and find its poles.`,
        solution: r`$H(s) = \frac{10^6}{s^2 + 200s + 10^6}$. Poles: $s = -100 \pm j995$, in the left half-plane, so stable and ringing; $\zeta = 0.1$.`,
      },
      traps: [r`The transfer function ignores initial conditions; add their response separately.`],
    },
    {
      name: 'AC Transients and Switching',
      inShort: r`Switching an ac circuit adds a decaying offset to the steady sinusoid.`,
      keyIdeas: [
        r`RL switched at voltage angle $\theta$: $i = \frac{V_m}{Z}\left[\sin(\omega t + \theta - \phi) - \sin(\theta - \phi)e^{-Rt/L}\right]$.`,
        r`No offset when $\theta = \phi$; the most when $\theta - \phi = \pm 90°$. Fault currents peak at about $\sqrt2I(1 + e^{-\pi R/X})$.`,
        r`Capacitor energizing: inrush $V_{pk}\sqrt{\frac{C}{L}}$ ringing at $\frac{1}{2\pi\sqrt{LC}}$, voltage up to 2 pu.`,
        r`Current chopping: $\frac12LI^2 = \frac12CV^2$, so $V = I\sqrt{\frac{L}{C}}$ across small stray capacitance.`,
      ],
      example: {
        problem: r`A fault has a symmetrical current of 20 kA RMS and $X/R = 10$. Estimate the first peak of the fully offset current. Then: what voltage does chopping 3 A in a 0.5 H winding with 2 nF of stray capacitance give?`,
        solution: r`$i_{pk} \approx \sqrt2 \times 20(1 + e^{-\pi/10}) = 28.3 \times 1.73 = 48.9$ kA. Chopping: $3\sqrt{\frac{0.5}{2 \times 10^{-9}}} = 3 \times 15{,}800 = 47.4$ kV.`,
      },
      traps: [r`The peak a breaker must close onto is the asymmetrical one, not $\sqrt2$ times the RMS symmetrical current.`],
    },
    {
      name: 'Traveling Waves',
      inShort: r`On long lines a surge travels at nearly the speed of light and reflects at every change of impedance.`,
      keyIdeas: [
        r`Speed $v = \frac{1}{\sqrt{LC}}$ (per unit length): near $3 \times 10^8$ m/s overhead, about half that in cables. Surge impedance $Z_0 = \sqrt{\frac{L}{C}}$; $i = \frac{v}{Z_0}$.`,
        r`Launched: $v^+ = V_s\frac{Z_0}{Z_s + Z_0}$. At a junction: $\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}$, transmitted $\tau = 1 + \Gamma$.`,
        r`Open end: voltage doubles; short: voltage reverses; matched: no reflection. Lines branching off in parallel count as one $Z_L$.`,
        r`A lattice (Bewley) diagram tracks the reflections back and forth; they settle to the dc answer.`,
      ],
      example: {
        problem: r`A 600 kV surge on an overhead line ($Z_0 = 400$ Ω) reaches a cable ($Z = 40$ Ω). Find the voltage passed into the cable, the reflected voltage, and the cable current.`,
        solution: r`$\Gamma = \frac{40 - 400}{40 + 400} = -0.818$. Reflected: $-491$ kV. Transmitted: $(1 - 0.818) \times 600 = 109$ kV; current $\frac{109{,}000}{40} = 2730$ A.`,
      },
      traps: [r`The current reflects with the OPPOSITE sign to the voltage: at an open end the voltage doubles and the current is zero.`],
    },
  ],
};
