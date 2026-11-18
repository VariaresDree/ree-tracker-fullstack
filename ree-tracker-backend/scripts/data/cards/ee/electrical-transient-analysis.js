'use strict';

// EE › Electrical Transient Analysis formula cards (Library round,
// 2026-11-18): 8 live cards for 11 subtopics, all correct, filed as they are.
// This file adds the rest: the switching rules and initial slopes, RL decay
// and inductor voltage, RC charging current, time to reach a value, the
// n-time-constant table, energy lost charging a capacitor, the second-order
// equation and parallel damping, the complete response and natural-response
// forms, damping ratio, logarithmic decrement and parallel critical
// resistance, step and impulse responses with overshoot and timing, Laplace
// pairs and partial fractions, transfer functions, ac switching of an RL
// circuit with its peak asymmetrical current, capacitor energizing, current
// chopping, and traveling waves (velocity, launched surge, reflection).
// First-order step response and the characteristic roots are in Electric
// Circuits 1; s-domain models and the initial/final value theorems in
// Electric Circuits 2; surge impedance in Power System Analysis. See
// mathematics/algebra.js for the format;
// tests/electricalTransientAnalysisFormulas.test.js checks each by simulating
// the circuit's differential equation.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const INIT = 'Initial and Final Conditions';
const RL = 'RL Transients';
const RC = 'RC Transients';
const RLC = 'RLC Transients';
const NAT = 'Natural and Forced Response';
const DAMP = 'Damping';
const STEP = 'Step and Impulse Response';
const LAP = 'Laplace Transform Solutions';
const TF = 'Transfer Functions';
const AC = 'AC Transients and Switching';
const TW = 'Traveling Waves';

const file = [
    ['65f12149-982a-4524-8585-0a98712cc5cd', RL, null], // Current Rise in an RL Circuit
    ['9cf374fe-2919-4635-bf3a-25d5dab3c263', RL, null], // RL Circuit Time Constant
    ['3ff69804-0bf4-4a85-a214-50996ed299d5', RC, null], // Capacitor Voltage While Charging
    ['72ee2a15-7262-4a8d-acac-a2bc2d0950f7', RC, null], // Capacitor Voltage While Discharging
    ['c54f62d9-3497-4791-98ee-e9ab21e5055e', RLC, null], // Undamped Natural Frequency
    ['36be2768-8c53-4c84-b422-e46af7734d4f', RLC, null], // Damping Coefficient of a Series RLC Circuit
    ['147cb4c4-09ed-4ba3-8e04-2a98677b5e6e', DAMP, null], // Damped Natural Frequency
    ['e0d3a4fe-a58c-43e9-b6c0-fadba717ed4f', DAMP, null], // Critical Damping Resistance
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const S_ = r`$\text{s}$`;
const OHM = r`$\Omega$`;
const R_ = v(r`$R$`, 'resistance (Thévenin, seen by L or C)', OHM);
const L_ = v(r`$L$`, 'inductance', r`$\text{H}$`);
const C_ = v(r`$C$`, 'capacitance', r`$\text{F}$`);
const TAU = v(r`$\tau$`, 'time constant, RC or L/R', S_);
const ALPHA = v(r`$\alpha$`, 'damping coefficient', r`$\text{Np/s}$`);
const W0 = v(r`$\omega_0$`, 'undamped natural frequency', r`$\text{rad/s}$`);
const WD = v(r`$\omega_d$`, 'damped frequency', r`$\text{rad/s}$`);
const ZETA = v(r`$\zeta$`, 'damping ratio, α/ω₀');
const Z0 = v(r`$Z_0$`, 'surge (characteristic) impedance of the line', OHM);

const drafts = [
    // Initial and Final Conditions
    P(INIT, null, 'Switching Rules for L and C', r`$v_C(0^+) = v_C(0^-),\ i_L(0^+) = i_L(0^-)$`, r`$v_C(0^+) = v_C(0^-),\qquad i_L(0^+) = i_L(0^-);\qquad \text{dc steady state: C open, L short}$`,
        [v(r`$v_C$`, 'capacitor voltage', V_), v(r`$i_L$`, 'inductor current', A_), v(r`$0^-, 0^+$`, 'just before and just after switching')],
        'Capacitor voltage and inductor current cannot jump; everything else can.',
        'At t = 0⁺ an uncharged capacitor acts as a short and a current-free inductor as an open circuit; at t = ∞ (dc) the reverse.'),
    P(INIT, null, 'Initial Rates of Change', r`$\frac{dv_C}{dt}(0^+) = \frac{i_C(0^+)}{C}$`, r`$\frac{dv_C}{dt}(0^+) = \frac{i_C(0^+)}{C},\qquad \frac{di_L}{dt}(0^+) = \frac{v_L(0^+)}{L}$`,
        [v(r`$i_C(0^+)$`, 'capacitor current just after switching', A_), v(r`$v_L(0^+)$`, 'inductor voltage just after switching', V_), C_, L_],
        'The starting slopes, the second initial condition a second-order circuit needs.',
        'Find i_C(0⁺) and v_L(0⁺) from the t = 0⁺ circuit with C as a voltage source and L as a current source.'),
    // RL Transients
    P(RL, null, 'Current Decay in an RL Circuit', r`$i(t) = I_0\,e^{-Rt/L}$`, r`$i(t) = I_0\,e^{-Rt/L},\qquad v_L(t) = -RI_0\,e^{-Rt/L}$`,
        [v(r`$I_0$`, 'inductor current at the switching instant', A_), R_, L_, v(r`$t$`, 'time after switching', S_)],
        'How an inductor\'s current dies away through a resistor once the source is removed.',
        'The inductor voltage reverses to keep the current flowing. Open the circuit with no path and L di/dt arcs the switch: hence freewheeling diodes.', A_),
    P(RL, null, 'Inductor Voltage After a Step', r`$v_L(t) = V\,e^{-Rt/L}$`, r`$v_L(t) = V\,e^{-Rt/L},\qquad v_R(t) = V\left(1 - e^{-Rt/L}\right)$`,
        [v(r`$V$`, 'step voltage', V_), R_, L_, v(r`$t$`, 'time after the step', S_)],
        'At the first instant the whole step appears across the inductor; it then hands it over to the resistor.',
        'v_L + v_R = V at every instant: the two curves are mirror images.', V_),
    // RC Transients
    P(RC, null, 'Charging Current in an RC Circuit', r`$i(t) = \frac{V - V_0}{R}\,e^{-t/RC}$`, r`$i(t) = \frac{V - V_0}{R}\,e^{-t/RC}$`,
        [v(r`$V$`, 'source voltage', V_), v(r`$V_0$`, 'capacitor voltage at the switching instant', V_), R_, C_],
        'The current into a capacitor: it jumps to its largest value at once and decays to zero.',
        'Unlike the capacitor voltage, the current DOES jump at t = 0. With V₀ = 0 it starts at V/R.', A_),
    P(RC, null, 'Time to Reach a Value (First Order)', r`$t = \tau\ln\frac{x(0^+) - x(\infty)}{x(t) - x(\infty)}$`, r`$t = \tau\ln\frac{x(0^+) - x(\infty)}{x(t) - x(\infty)}$`,
        [TAU, v(r`$x(0^+), x(\infty)$`, 'starting and final values'), v(r`$x(t)$`, 'the value reached')],
        'The time an RC or RL response takes to reach a given value, from x(t) = x∞ + (x₀ − x∞)e^(−t/τ).',
        'From 0 to half the final value takes τ ln 2 = 0.693τ: the classic "time to half" answer.', S_),
    P(RC, null, 'Fraction Reached After n Time Constants', r`$1 - e^{-n}$`, r`$\frac{x(t) - x_0}{x_\infty - x_0} = 1 - e^{-n},\qquad n = \frac{t}{\tau}:\ 63.2\%,\ 86.5\%,\ 95.0\%,\ 98.2\%,\ 99.3\%$`,
        [v(r`$n$`, 'elapsed time in time constants, t/τ')],
        'How far a first-order response has gone after 1, 2, 3, 4 and 5 time constants.',
        'A decay keeps e⁻ⁿ: 36.8% after one τ, 0.7% after five, when it is taken as finished.'),
    P(RC, null, 'Energy Lost Charging a Capacitor', r`$W_R = \tfrac12CV^2$`, r`$W_{\text{source}} = CV^2,\qquad W_C = W_R = \tfrac12CV^2$`,
        [C_, v(r`$V$`, 'source voltage', V_)],
        'Charging a capacitor from a dc source through a resistor wastes as much energy as it stores, whatever the resistance.',
        'The 50% loss does not depend on R: a smaller R only makes it happen faster.', r`$\text{J}$`),
    // RLC Transients
    P(RLC, null, 'Second-Order Circuit Equation', r`$x'' + 2\alpha x' + \omega_0^2x = \omega_0^2x_\infty$`, r`$\frac{d^2x}{dt^2} + 2\alpha\frac{dx}{dt} + \omega_0^2x = \omega_0^2x_\infty;\qquad \text{series: } LC\,v_C'' + RC\,v_C' + v_C = V$`,
        [ALPHA, W0, v(r`$x_\infty$`, 'final (forced) value for a dc source')],
        'Every RLC circuit with a dc source fits this equation once α and ω₀ are found.',
        'Its roots are s = −α ± √(α² − ω₀²); the forced part is just the dc steady-state value.'),
    P(RLC, null, 'Damping Coefficient of a Parallel RLC Circuit', r`$\alpha = \frac{1}{2RC}$`, r`$\alpha = \frac{1}{2RC},\qquad \omega_0 = \frac{1}{\sqrt{LC}}$`,
        [ALPHA, R_, C_],
        'How fast a parallel RLC circuit\'s response dies away.',
        'A LARGER parallel R means LESS damping: the opposite of the series circuit, α = R/2L.', r`$\text{Np/s}$`),
    // Natural and Forced Response
    P(NAT, null, 'Complete Response', r`$x(t) = x_n(t) + x_f(t)$`, r`$x(t) = \underbrace{x_n(t)}_{\text{natural}} + \underbrace{x_f(t)}_{\text{forced}}$`,
        [v(r`$x_n$`, 'natural response, from the characteristic roots'), v(r`$x_f$`, 'forced response, the shape of the source')],
        'The total response: a natural part that dies away plus a forced part that copies the source.',
        'Fit the constants of the natural part to the COMPLETE response\'s initial conditions, after adding the forced part.'),
    P(NAT, null, 'Natural Response Forms (Second Order)', r`$x_n = e^{-\alpha t}(B_1\cos\omega_dt + B_2\sin\omega_dt)$`, r`$\text{over: } A_1e^{s_1t} + A_2e^{s_2t};\quad \text{critical: } (D_1 + D_2t)e^{-\alpha t};\quad \text{under: } e^{-\alpha t}(B_1\cos\omega_dt + B_2\sin\omega_dt)$`,
        [v(r`$s_1, s_2$`, 'real roots, −α ± √(α² − ω₀²)', r`$\text{1/s}$`), ALPHA, WD],
        'The three shapes a second-order natural response can take.',
        'Critical damping needs the t·e^(−αt) term: two equal roots, not one.'),
    // Damping
    P(DAMP, null, 'Damping Ratio', r`$\zeta = \frac{\alpha}{\omega_0}$`, r`$\zeta = \frac{\alpha}{\omega_0} = \frac{R}{2}\sqrt{\frac{C}{L}}\ (\text{series}),\qquad \omega_d = \omega_0\sqrt{1 - \zeta^2},\qquad Q = \frac{1}{2\zeta}$`,
        [ALPHA, W0, R_, L_, C_],
        'How damped a circuit is on one scale: above 1 overdamped, 1 critical, below 1 underdamped.',
        'For a series RLC, ζ = 1/(2Q): a high-Q circuit rings for many cycles.'),
    P(DAMP, null, 'Logarithmic Decrement', r`$\delta = \ln\frac{x_n}{x_{n+1}} = \alpha T_d$`, r`$\delta = \ln\frac{x_n}{x_{n+1}} = \alpha T_d = \frac{2\pi\zeta}{\sqrt{1 - \zeta^2}},\qquad T_d = \frac{2\pi}{\omega_d}$`,
        [v(r`$x_n, x_{n+1}$`, 'two successive peaks, one period apart'), ALPHA, v(r`$T_d$`, 'damped period', S_), ZETA],
        'The damping read off a ringing waveform from the ratio of successive peaks.',
        'Measure two peaks one full period apart; peaks half a period apart alternate in sign.'),
    P(DAMP, null, 'Critical Resistance of a Parallel RLC Circuit', r`$R = \frac12\sqrt{\frac{L}{C}}$`, r`$R_c = \frac12\sqrt{\frac{L}{C}}$`,
        [v(r`$R_c$`, 'parallel resistance for critical damping', OHM), L_, C_],
        'The parallel resistance that makes a parallel RLC circuit critically damped.',
        'In parallel, LESS resistance than this is overdamped; in series it is MORE than 2√(L/C).', OHM),
    // Step and Impulse Response
    P(STEP, null, 'Underdamped Step Response of a Series RLC', r`$v_C = V[1 - e^{-\alpha t}(\cos\omega_dt + \dots)]$`, r`$v_C(t) = V\left[1 - e^{-\alpha t}\left(\cos\omega_dt + \frac{\alpha}{\omega_d}\sin\omega_dt\right)\right]$`,
        [v(r`$V$`, 'step voltage', V_), ALPHA, WD],
        'The capacitor voltage of an underdamped series RLC after a dc step, starting uncharged with no current.',
        'It overshoots V and rings about it at ω_d while the envelope decays as e^(−αt).', V_),
    P(STEP, null, 'Overshoot, Peak Time and Settling Time', r`$\%OS = 100\,e^{-\pi\zeta/\sqrt{1 - \zeta^2}}$`, r`$\%OS = 100\,e^{-\pi\zeta/\sqrt{1 - \zeta^2}},\qquad t_p = \frac{\pi}{\omega_d},\qquad t_s \approx \frac{4}{\alpha}\ (2\%)$`,
        [ZETA, WD, ALPHA],
        'How far an underdamped step response overshoots, when it peaks, and when it settles.',
        'The overshoot depends on ζ alone: ζ = 0.5 gives 16.3%, ζ = 0.7 about 4.6%.'),
    P(STEP, null, 'Impulse Response from Step Response', r`$h(t) = \frac{d}{dt}s(t)$`, r`$h(t) = \frac{d}{dt}s(t),\qquad \delta(t) = \frac{du(t)}{dt},\qquad \mathcal{L}\{\delta\} = 1,\ \mathcal{L}\{u\} = \frac1s$`,
        [v(r`$h(t)$`, 'impulse response'), v(r`$s(t)$`, 'unit step response'), v(r`$u(t)$`, 'unit step')],
        'In a linear circuit the impulse response is the slope of the step response.',
        'An impulse of current can change a capacitor\'s voltage at once: q delivered in no time gives Δv = q/C.'),
    P(STEP, null, 'Impulse Response of an RC Circuit', r`$h(t) = \frac{1}{RC}e^{-t/RC}$`, r`$h(t) = \frac{1}{RC}\,e^{-t/RC}\,u(t)\quad (v_C \text{ for a unit voltage impulse})$`,
        [R_, C_, v(r`$t$`, 'time', S_)],
        'The capacitor voltage after a unit impulse of source voltage: it jumps to 1/RC and decays.',
        'Its area is 1, the same as the step response\'s final value.', r`$\text{1/s}$`),
    // Laplace Transform Solutions
    P(LAP, null, 'Laplace Pairs for Transients', r`$\frac{1}{s+a} \leftrightarrow e^{-at}$`, r`$\frac{1}{s+a} \leftrightarrow e^{-at};\quad \frac{1}{(s+a)^2} \leftrightarrow te^{-at};\quad \frac{\omega}{(s+a)^2 + \omega^2} \leftrightarrow e^{-at}\sin\omega t;\quad \frac{s+a}{(s+a)^2 + \omega^2} \leftrightarrow e^{-at}\cos\omega t$`,
        [v(r`$a$`, 'decay rate (a pole at s = −a)', r`$\text{1/s}$`), v(r`$\omega$`, 'ringing frequency', r`$\text{rad/s}$`)],
        'The four transforms that cover nearly every circuit transient.',
        'Complete the square in a quadratic denominator to read α and ω_d straight off: (s + α)² + ω_d².'),
    P(LAP, null, 'Partial Fractions by Cover-Up', r`$K_i = (s - p_i)F(s)\big|_{s = p_i}$`, r`$F(s) = \sum_i\frac{K_i}{s - p_i},\qquad K_i = (s - p_i)F(s)\big|_{s = p_i}$`,
        [v(r`$p_i$`, 'a simple pole of F(s)', r`$\text{1/s}$`), v(r`$K_i$`, 'its residue')],
        'Splits a transform into simple terms that invert to exponentials, one residue at a time.',
        'Make F(s) proper first. Complex poles come in conjugate pairs with conjugate residues.'),
    // Transfer Functions
    P(TF, null, 'Transfer Function', r`$H(s) = \frac{Y(s)}{X(s)}$`, r`$H(s) = \frac{Y(s)}{X(s)}\ (\text{zero initial conditions}),\qquad Y(s) = H(s)X(s),\qquad h(t) = \mathcal{L}^{-1}\{H(s)\}$`,
        [v(r`$X(s)$`, 'input transform'), v(r`$Y(s)$`, 'output transform')],
        'The output-to-input ratio of a circuit in the s-domain; its inverse is the impulse response.',
        'Stable only if every pole is in the left half-plane. Put s = jω to get the frequency response.'),
    P(TF, null, 'Standard Second-Order Transfer Function', r`$H = \frac{\omega_0^2}{s^2 + 2\zeta\omega_0s + \omega_0^2}$`, r`$H(s) = \frac{\omega_0^2}{s^2 + 2\zeta\omega_0s + \omega_0^2};\qquad \text{series RLC, } v_C: \frac{1/LC}{s^2 + (R/L)s + 1/LC}$`,
        [W0, ZETA],
        'The second-order form a series RLC circuit\'s capacitor voltage takes.',
        'Match the denominator term by term: 2ζω₀ = R/L and ω₀² = 1/LC.'),
    // AC Transients and Switching
    P(AC, null, 'Switching an AC Source into an RL Circuit', r`$i = i_{ac} - \frac{V_m}{Z}\sin(\theta - \phi)e^{-Rt/L}$`, r`$i(t) = \frac{V_m}{Z}\left[\sin(\omega t + \theta - \phi) - \sin(\theta - \phi)\,e^{-Rt/L}\right],\qquad \phi = \tan^{-1}\frac{\omega L}{R}$`,
        [v(r`$V_m$`, 'peak source voltage', V_), v(r`$Z$`, '√(R² + ω²L²)', OHM), v(r`$\theta$`, 'voltage angle at the switching instant', r`$\text{rad}$`), v(r`$\phi$`, 'impedance angle', r`$\text{rad}$`)],
        'The current when a sinusoidal source is switched onto an RL circuit: steady ac plus a decaying dc offset.',
        'No offset if switched at θ = φ; the worst offset at θ − φ = ±90°, nearly a voltage zero in a highly inductive circuit.', A_),
    P(AC, null, 'Peak Asymmetrical Current', r`$i_{pk} \approx \sqrt2\,I\left(1 + e^{-\pi R/X}\right)$`, r`$i_{pk} \approx \sqrt2\,I\left(1 + e^{-\pi R/X}\right)$`,
        [v(r`$I$`, 'symmetrical RMS current', A_), v(r`$X/R$`, 'reactance-to-resistance ratio of the circuit')],
        'The first peak of a fully offset fault or switching current, about half a cycle after it starts.',
        'It approaches 2√2 I as X/R grows; breakers and busbars must withstand this peak, not just √2 I.', A_),
    P(AC, null, 'Capacitor Energizing Inrush', r`$i_{pk} = V_{pk}\sqrt{\frac{C}{L}}$`, r`$i_{pk} = V_{pk}\sqrt{\frac{C}{L}},\qquad f_{\text{inrush}} = \frac{1}{2\pi\sqrt{LC}},\qquad v_C \to 2V_{pk}$`,
        [v(r`$V_{pk}$`, 'voltage at the closing instant', V_), v(r`$L$`, 'inductance between source and capacitor', r`$\text{H}$`), C_],
        'The inrush current and ringing when an uncharged capacitor bank is switched on at a voltage peak.',
        'The capacitor voltage can overshoot to about 2 pu; back-to-back banks see far larger inrush through the small L between them.', A_),
    P(AC, null, 'Current Chopping Overvoltage', r`$V = I_{ch}\sqrt{\frac{L}{C}}$`, r`$\tfrac12LI_{ch}^2 = \tfrac12CV^2 \implies V = I_{ch}\sqrt{\frac{L}{C}}$`,
        [v(r`$I_{ch}$`, 'current at the instant it is chopped', A_), L_, v(r`$C$`, 'stray capacitance across the inductance', r`$\text{F}$`)],
        'The overvoltage when a breaker cuts an inductive current before its natural zero.',
        'The magnetic energy has nowhere to go but the small stray capacitance, so even a few amperes give large voltages.', V_),
    // Traveling Waves
    P(TW, null, 'Traveling Wave Velocity on a Line', r`$v = \frac{1}{\sqrt{LC}}$`, r`$v = \frac{1}{\sqrt{LC}}\ (\text{per unit length}),\qquad T = \frac{\ell}{v}$`,
        [v(r`$L, C$`, 'inductance and capacitance per unit length', r`$\text{H/m, F/m}$`), v(r`$\ell$`, 'line length', r`$\text{m}$`), v(r`$T$`, 'one-way travel time', S_)],
        'How fast a surge travels along a line, and how long it takes to reach the end.',
        'Overhead lines: nearly c = 300 m/µs. Cables: c/√εᵣ, about half that.', r`$\text{m/s}$`),
    P(TW, null, 'Surge Launched onto a Line', r`$v^+ = V_s\frac{Z_0}{Z_s + Z_0}$`, r`$v^+ = V_s\frac{Z_0}{Z_s + Z_0},\qquad i^+ = \frac{v^+}{Z_0}$`,
        [v(r`$V_s$`, 'source voltage', V_), v(r`$Z_s$`, 'source impedance', OHM), Z0],
        'The voltage and current wave a source sends down a line before any reflection returns.',
        'Until a reflection comes back, the line looks like a resistor equal to Z₀, whatever is at the far end.', V_),
    P(TW, null, 'Reflection and Transmission Coefficients', r`$\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}$`, r`$\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0},\qquad \tau = 1 + \Gamma = \frac{2Z_L}{Z_L + Z_0},\qquad \Gamma_i = -\Gamma$`,
        [v(r`$Z_L$`, 'termination, or the next line\'s Z₀ (lines in parallel combine)', OHM), Z0],
        'What fraction of a surge reflects at a junction or termination, and what passes on.',
        'Open end: Γ = +1, the voltage doubles. Short: Γ = −1. Matched (Z_L = Z₀): no reflection. The current reflects with the opposite sign.'),
];

module.exports = { subject: 'EE', topic: 'Electrical Transient Analysis', migration: '20261228000000_cards_electrical_transient_analysis', file, revisions, retire, drafts };
