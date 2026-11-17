'use strict';

// ESAS › Physics for Engineers formula cards (Library round, 2026-11-17): 12
// live cards (four of them constants) for 16 subtopics. ESAS's other topics
// already hold the constant-acceleration equations, Newton's second law,
// kinetic and potential energy, work, power, momentum and projectile range
// (Engineering Mechanics), stress-strain Hooke's law and thermal deformation
// (Deformable Bodies), hydrostatics, buoyancy and Bernoulli (Fluid Mechanics),
// and the Stefan-Boltzmann and gas constants (Thermodynamics), so this file
// adds the physics around them: gravitation and orbits, energy conservation
// and collisions, rotational dynamics, springs and moduli, waves and sound,
// heat transfer, electricity and magnetism, optics, modern physics and their
// constants. Formula cards carry SI units. See mathematics/algebra.js for the
// format; tests/physicsForEngineersFormulas.test.js checks each formula
// numerically, most against an independent route (a simulation, an
// integral, a conservation law).

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const KIN = 'Kinematics';
const DYN = 'Dynamics';
const WEP = 'Work, Energy and Power';
const IMP = 'Impulse and Momentum';
const ROT = 'Rotation';
const ELA = 'Elasticity';
const OSC = 'Oscillations and Waves';
const SND = 'Sound';
const FLU = 'Fluids';
const HEAT = 'Heat Transfer';
const ES = 'Electrostatics';
const ELEC = 'Electricity';
const MAG = 'Magnetism';
const IND = 'Electromagnetic Induction';
const OPT = 'Optics';
const ATOM = 'Atomic and Nuclear Physics';
const CONST = 'Constants';

const file = [
    ['20acd267-5adb-408d-83b3-0f440e58fd59', KIN, CONST], // Standard Gravity
    ['d8cd77c7-63c1-4505-8acb-94c205ac35f4', DYN, CONST], // Gravitational Constant
    ['8ad9dbc0-3a55-4acb-9d13-687b21f0445e', DYN, null], // Newton's Law of Gravitation
    ['c5f67589-341d-434f-81a9-54ed0c311ef8', OSC, null], // Period of a Mass on a Spring
    ['e3415aef-2ed4-4d58-83e8-bf63c12eb0f3', OSC, null], // Period of a Simple Pendulum
    ['da2d3ed5-2342-44ab-b743-785f389b2e18', OSC, null], // Wave Equation
    ['cd56eb19-5c70-4707-9472-26f21456a969', HEAT, null], // Sensible Heat
    ['06ee5c7c-24a7-4dd2-9ca5-2edf55a78cc0', OPT, null], // Snell's Law
    ['b9ff79d8-f0c5-4fb1-a596-665c176dde60', OPT, null], // Thin Lens Equation
    ['b35a9751-52ad-470e-b8a9-cda6857f6470', OPT, CONST], // Speed of Light in Vacuum
    ['95a5ea40-019e-4d16-bd3d-57e0480f87ff', ATOM, null], // Photon Energy
    ['19166142-181a-4bf3-83c6-6decdb4cee43', ATOM, CONST], // Planck Constant
];

const revisions = [
    { id: 'b9ff79d8-f0c5-4fb1-a596-665c176dde60', note: 'The tip now gives the sign rule for a diverging lens too.',
        tip: r`A negative image distance means a virtual image; a diverging lens has a negative $f$.` },
];

const retire = [];

// A formula with its result's SI unit; dimensionless ones pass no unit.
const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const M = v(r`$m$`, 'mass', r`$\text{kg}$`);
const G_ = v(r`$g$`, 'acceleration due to gravity', r`$\text{m/s}^2$`);
const VEL = v(r`$v$`, 'speed', r`$\text{m/s}$`);
const RAD = v(r`$r$`, 'distance from the centre', r`$\text{m}$`);
const GM = v(r`$GM$`, 'the gravitational constant times the central mass', r`$\text{m}^3\text{/s}^2$`);
const Q = v(r`$q$`, 'charge', r`$\text{C}$`);
const KC = v(r`$k$`, r`Coulomb constant, $\frac{1}{4\pi\varepsilon_0}$`, r`$\text{N}\cdot\text{m}^2\text{/C}^2$`);
const B = v(r`$B$`, 'magnetic flux density', r`$\text{T}$`);
const I = v(r`$I$`, 'current', r`$\text{A}$`);
const MU0 = v(r`$\mu_0$`, r`permeability of free space, $4\pi \times 10^{-7}$`, r`$\text{T}\cdot\text{m/A}$`);
const INERTIA = v(r`$I$`, 'moment of inertia', r`$\text{kg}\cdot\text{m}^2$`);
const OMEGA = v(r`$\omega$`, 'angular velocity', r`$\text{rad/s}$`);

const drafts = [
    // Kinematics
    P(KIN, null, 'Free-Fall Equations', r`$h$`, r`$v = gt,\qquad h = \tfrac12 gt^2,\qquad v = \sqrt{2gh}$`,
        [G_, v(r`$t$`, 'time from rest', r`$\text{s}$`), v(r`$h$`, 'distance fallen', r`$\text{m}$`)],
        'Motion of a body dropped from rest, air resistance ignored.',
        'Mass doesn\'t appear: everything falls at the same rate in a vacuum.', r`$\text{m}$`),
    P(KIN, null, 'Relative Velocity', r`$\vec{v}_{A/B}$`, r`$\vec{v}_{A/B} = \vec{v}_A - \vec{v}_B$`,
        [v(r`$\vec{v}_A, \vec{v}_B$`, 'velocities relative to the ground', r`$\text{m/s}$`)],
        'The velocity of A as seen from B.',
        'A boat crossing a river: the water\'s velocity adds to the boat\'s, as vectors.', r`$\text{m/s}$`),
    P(KIN, null, 'Projectile Time of Flight and Maximum Height', r`$H$`, r`$T = \frac{2v_0\sin\theta}{g},\qquad H = \frac{v_0^2\sin^2\theta}{2g}$`,
        [v(r`$v_0$`, 'launch speed', r`$\text{m/s}$`), v(r`$\theta$`, 'launch angle above horizontal'), G_],
        'How long a projectile launched from level ground stays up, and how high it goes.',
        'At the top the vertical velocity is zero; the horizontal velocity never changes.', r`$\text{m}$`),
    P(KIN, null, 'Average Speed and Average Velocity', r`$\bar{v}$`, r`$\text{average speed} = \frac{\text{distance}}{t},\qquad \bar{\vec{v}} = \frac{\Delta\vec{x}}{t}$`,
        [v(r`$t$`, 'elapsed time', r`$\text{s}$`), v(r`$\Delta\vec{x}$`, 'displacement', r`$\text{m}$`)],
        'Speed uses the path length; velocity uses the straight-line change in position.',
        'A round trip has average velocity zero. Going and returning at different speeds: the average speed is the harmonic mean, not the plain mean.', r`$\text{m/s}$`),
    // Dynamics
    P(DYN, null, 'Weight', r`$W$`, r`$W = mg$`, [M, G_],
        'The gravitational force on a mass.',
        'Mass is in kg; weight is a force in N. 1 kgf = 9.81 N.', r`$\text{N}$`),
    P(DYN, null, 'Gravity at Altitude', r`$g_h$`, r`$g_h = g\left(\frac{R}{R + h}\right)^2$`,
        [G_, v(r`$R$`, 'radius of the Earth, 6.371 × 10⁶', r`$\text{m}$`), v(r`$h$`, 'height above the surface', r`$\text{m}$`)],
        'How gravity weakens with height, by the inverse-square law.',
        'At one Earth radius up, g falls to a quarter.', r`$\text{m/s}^2$`),
    P(DYN, null, 'Orbital Speed', r`$v_o$`, r`$v_o = \sqrt{\frac{GM}{r}}$`, [GM, RAD],
        'The speed for a circular orbit at radius r: gravity supplies exactly the centripetal force.',
        'Higher orbits are slower. Near the Earth\'s surface it is about 7.9 km/s.', r`$\text{m/s}$`),
    P(DYN, null, 'Escape Velocity', r`$v_e$`, r`$v_e = \sqrt{\frac{2GM}{R}} = \sqrt{2}\,v_o$`,
        [GM, v(r`$R$`, 'radius of the body', r`$\text{m}$`)],
        'The launch speed needed to leave a body\'s gravity for good.',
        'For the Earth, about 11.2 km/s.', r`$\text{m/s}$`),
    P(DYN, null, "Kepler's Third Law", r`$T^2$`, r`$T^2 = \frac{4\pi^2}{GM}r^3$`,
        [v(r`$T$`, 'orbital period', r`$\text{s}$`), GM, v(r`$r$`, 'orbit radius (semi-major axis)', r`$\text{m}$`)],
        'The square of an orbit\'s period grows with the cube of its size.',
        'For two satellites of the same body: (T₁/T₂)² = (r₁/r₂)³.', r`$\text{s}^2$`),
    P(DYN, null, 'Apparent Weight in an Elevator', r`$N$`, r`$N = m(g + a)$`,
        [M, G_, v(r`$a$`, 'upward acceleration (negative when accelerating down)', r`$\text{m/s}^2$`)],
        'What a scale reads in an accelerating lift.',
        'In free fall (a = −g) the scale reads zero: weightlessness.', r`$\text{N}$`),
    // Work, Energy and Power
    P(WEP, null, 'Work-Energy Theorem', r`$W_{\text{net}}$`, r`$W_{\text{net}} = \Delta KE = \tfrac12 mv_f^2 - \tfrac12 mv_i^2$`,
        [M, v(r`$v_i, v_f$`, 'initial and final speeds', r`$\text{m/s}$`)],
        'The net work on a body equals the change in its kinetic energy.',
        'Work by friction is negative: it takes kinetic energy away.', r`$\text{J}$`),
    P(WEP, null, 'Conservation of Mechanical Energy', r`$KE + PE$`, r`$\tfrac12 mv_1^2 + mgh_1 = \tfrac12 mv_2^2 + mgh_2 \quad \text{(no friction)}$`,
        [M, G_, v(r`$h$`, 'height', r`$\text{m}$`)],
        'Without friction, kinetic plus potential energy stays the same.',
        r`The speed at the bottom of a frictionless slope of height $h$ is $\sqrt{2gh}$, whatever its shape.`, r`$\text{J}$`),
    P(WEP, null, 'Elastic Potential Energy', r`$PE_s$`, r`$PE_s = \tfrac12 kx^2$`,
        [v(r`$k$`, 'spring constant', r`$\text{N/m}$`), v(r`$x$`, 'stretch or compression', r`$\text{m}$`)],
        'The energy stored in a stretched or compressed spring.',
        'Doubling the stretch stores four times the energy.', r`$\text{J}$`),
    P(WEP, null, 'Efficiency', r`$\eta$`, r`$\eta = \frac{\text{output}}{\text{input}} \times 100\%;\qquad \eta_{\text{total}} = \eta_1\eta_2\cdots$`,
        [v(r`$\eta$`, 'efficiency')],
        'The share of input energy or power that comes out as useful work.',
        'Machines in a chain multiply their efficiencies.'),
    // Impulse and Momentum
    P(IMP, null, 'Impulse-Momentum Theorem', r`$J$`, r`$J = F\,\Delta t = \Delta p = mv_f - mv_i$`,
        [v(r`$F$`, 'average force', r`$\text{N}$`), v(r`$\Delta t$`, 'contact time', r`$\text{s}$`), M],
        'A force over a time changes momentum by that impulse.',
        'A longer stopping time (an airbag) means a smaller force for the same change.', r`$\text{N}\cdot\text{s}$`),
    P(IMP, null, 'Conservation of Momentum', r`$\sum p$`, r`$m_1v_1 + m_2v_2 = m_1v_1' + m_2v_2'$`,
        [v(r`$m_1, m_2$`, 'masses', r`$\text{kg}$`), v(r`$v, v'$`, 'velocities before and after (signs give direction)', r`$\text{m/s}$`)],
        'With no outside force, total momentum is the same before and after a collision or explosion.',
        'Momentum is conserved in every collision; kinetic energy only in elastic ones.', r`$\text{kg}\cdot\text{m/s}$`),
    P(IMP, null, 'Perfectly Inelastic Collision', r`$v'$`, r`$v' = \frac{m_1v_1 + m_2v_2}{m_1 + m_2}$`,
        [v(r`$m_1, m_2$`, 'masses', r`$\text{kg}$`), v(r`$v_1, v_2$`, 'velocities before', r`$\text{m/s}$`)],
        'Bodies that stick together share one final velocity.',
        'The most kinetic energy is lost in this kind of collision.', r`$\text{m/s}$`),
    P(IMP, null, 'Elastic Collision in One Dimension', r`$v_1'$`, r`$v_1' = \frac{m_1 - m_2}{m_1 + m_2}v_1 + \frac{2m_2}{m_1 + m_2}v_2,\qquad v_2' = \frac{2m_1}{m_1 + m_2}v_1 + \frac{m_2 - m_1}{m_1 + m_2}v_2$`,
        [v(r`$m_1, m_2$`, 'masses', r`$\text{kg}$`), v(r`$v_1, v_2$`, 'velocities before', r`$\text{m/s}$`)],
        'Final velocities when both momentum and kinetic energy are conserved.',
        'Equal masses simply swap velocities.', r`$\text{m/s}$`),
    P(IMP, null, 'Coefficient of Restitution', r`$e$`, r`$e = \frac{v_2' - v_1'}{v_1 - v_2};\qquad \text{dropped ball: } e = \sqrt{\frac{h'}{h}}$`,
        [v(r`$v, v'$`, 'velocities before and after', r`$\text{m/s}$`), v(r`$h, h'$`, 'drop and rebound heights', r`$\text{m}$`)],
        'How bouncy a collision is: 1 for elastic, 0 for perfectly inelastic.',
        r`After $n$ bounces the height is $e^{2n}h$.`),
    // Rotation
    P(ROT, null, 'Angular Kinematics', r`$\omega$`, r`$\omega = \omega_0 + \alpha t,\quad \theta = \omega_0t + \tfrac12\alpha t^2,\quad \omega^2 = \omega_0^2 + 2\alpha\theta$`,
        [OMEGA, v(r`$\alpha$`, 'angular acceleration', r`$\text{rad/s}^2$`), v(r`$\theta$`, 'angle turned', r`$\text{rad}$`)],
        'The constant-acceleration equations, for turning.',
        r`Convert rpm: $\omega = \frac{2\pi N}{60}$ rad/s.`, r`$\text{rad/s}$`),
    P(ROT, null, 'Linear and Angular Quantities', r`$v = r\omega$`, r`$s = r\theta,\qquad v = r\omega,\qquad a_t = r\alpha,\qquad a_c = \frac{v^2}{r} = r\omega^2$`,
        [RAD, OMEGA, v(r`$\alpha$`, 'angular acceleration', r`$\text{rad/s}^2$`)],
        'The link between turning and the motion of a point at radius r.',
        'Angles must be in radians.', r`$\text{m/s}$`),
    P(ROT, null, 'Torque and Angular Acceleration', r`$\tau = I\alpha$`, r`$\tau = I\alpha,\qquad \tau = rF\sin\phi$`,
        [INERTIA, v(r`$\alpha$`, 'angular acceleration', r`$\text{rad/s}^2$`), v(r`$F$`, 'force', r`$\text{N}$`)],
        'Newton\'s second law for rotation.',
        'Moment of inertia plays the part of mass.', r`$\text{N}\cdot\text{m}$`),
    P(ROT, null, 'Mass Moments of Inertia of Common Bodies', r`$I$`, r`$\text{rod (centre) } \tfrac{1}{12}ML^2,\ \text{rod (end) } \tfrac13ML^2,\ \text{disc } \tfrac12MR^2,\ \text{ring } MR^2,\ \text{sphere } \tfrac25MR^2$`,
        [v(r`$M$`, 'mass', r`$\text{kg}$`), v(r`$L, R$`, 'length or radius', r`$\text{m}$`)],
        'How mass is spread about the axis; farther mass counts more.',
        r`A thin spherical shell has $\tfrac23MR^2$.`, r`$\text{kg}\cdot\text{m}^2$`),
    P(ROT, null, 'Parallel-Axis Theorem for Mass', r`$I = I_{cm} + Md^2$`, r`$I = I_{cm} + Md^2$`,
        [v(r`$I_{cm}$`, 'moment of inertia about the parallel axis through the centre of mass', r`$\text{kg}\cdot\text{m}^2$`), v(r`$d$`, 'distance between the axes', r`$\text{m}$`)],
        'Moment of inertia about any axis parallel to one through the centre of mass.',
        'Rod about its end: ML²/12 + M(L/2)² = ML²/3.', r`$\text{kg}\cdot\text{m}^2$`),
    P(ROT, null, 'Rotational Kinetic Energy', r`$KE_r$`, r`$KE_r = \tfrac12 I\omega^2;\qquad \text{rolling: } KE = \tfrac12 mv^2 + \tfrac12 I\omega^2,\ v = r\omega$`,
        [INERTIA, OMEGA, M],
        'The energy of a turning body; a rolling one has both kinds.',
        r`Rolling down a slope from height $h$: $v = \sqrt{\frac{2gh}{1 + I/(mr^2)}}$, so a disc beats a ring.`, r`$\text{J}$`),
    P(ROT, null, 'Angular Momentum', r`$L$`, r`$L = I\omega;\qquad I_1\omega_1 = I_2\omega_2 \text{ with no outside torque}$`,
        [INERTIA, OMEGA],
        'Turning momentum; it is conserved when no outside torque acts.',
        'A skater pulling in her arms lowers I and spins faster.', r`$\text{kg}\cdot\text{m}^2\text{/s}$`),
    // Elasticity
    P(ELA, null, "Spring Force (Hooke's Law)", r`$F = kx$`, r`$F = kx$`,
        [v(r`$k$`, 'spring constant', r`$\text{N/m}$`), v(r`$x$`, 'stretch or compression from the natural length', r`$\text{m}$`)],
        'A spring pushes back in proportion to how far it is stretched.',
        'It holds only up to the elastic limit.', r`$\text{N}$`),
    P(ELA, null, 'Springs in Series and Parallel', r`$k_{\text{eq}}$`, r`$\text{parallel: } k_{\text{eq}} = k_1 + k_2;\qquad \text{series: } \frac{1}{k_{\text{eq}}} = \frac{1}{k_1} + \frac{1}{k_2}$`,
        [v(r`$k_1, k_2$`, 'spring constants', r`$\text{N/m}$`)],
        'Springs side by side stiffen; springs end to end soften.',
        'The rule is the reverse of resistors.', r`$\text{N/m}$`),
    P(ELA, null, "Young's Modulus", r`$Y$`, r`$Y = \frac{F/A}{\Delta L/L} = \frac{FL}{A\,\Delta L}$`,
        [v(r`$F$`, 'tensile force', r`$\text{N}$`), v(r`$A$`, 'cross-section', r`$\text{m}^2$`), v(r`$L, \Delta L$`, 'length and extension', r`$\text{m}$`)],
        'Stiffness of a material in tension or compression: stress over strain.',
        'Steel ≈ 200 GPa, aluminium ≈ 70 GPa.', r`$\text{Pa}$`),
    P(ELA, null, 'Shear Modulus', r`$G$`, r`$G = \frac{F/A}{\Delta x/h} = \frac{\tau}{\gamma}$`,
        [v(r`$F$`, 'force parallel to the face', r`$\text{N}$`), v(r`$A$`, 'area of the face', r`$\text{m}^2$`), v(r`$\Delta x, h$`, 'sideways shift and height', r`$\text{m}$`)],
        'Stiffness against change of shape.',
        r`For isotropic materials $G = \frac{Y}{2(1 + \nu)}$.`, r`$\text{Pa}$`),
    P(ELA, null, 'Bulk Modulus', r`$K$`, r`$K = -\frac{\Delta p}{\Delta V/V}$`,
        [v(r`$\Delta p$`, 'pressure change', r`$\text{Pa}$`), v(r`$\Delta V, V$`, 'volume change and volume', r`$\text{m}^3$`)],
        'Resistance to squeezing from all sides.',
        r`Compressibility is $\frac1K$. Water: $K \approx 2.2$ GPa.`, r`$\text{Pa}$`),
    // Oscillations and Waves
    P(OSC, null, 'Simple Harmonic Motion', r`$x(t)$`, r`$x = A\cos(\omega t + \phi),\quad v_{\max} = A\omega,\quad a_{\max} = A\omega^2,\quad \omega = 2\pi f = \frac{2\pi}{T}$`,
        [v(r`$A$`, 'amplitude', r`$\text{m}$`), OMEGA],
        'The motion of anything pulled back in proportion to its displacement.',
        'Speed is greatest at the centre; acceleration is greatest at the ends.', r`$\text{m}$`),
    P(OSC, null, 'Energy in Simple Harmonic Motion', r`$E$`, r`$E = \tfrac12 kA^2 = \tfrac12 mv_{\max}^2,\qquad v = \omega\sqrt{A^2 - x^2}$`,
        [v(r`$k$`, 'spring constant', r`$\text{N/m}$`), v(r`$A$`, 'amplitude', r`$\text{m}$`), v(r`$x$`, 'displacement', r`$\text{m}$`)],
        'The total energy stays fixed, trading between kinetic and potential.',
        'At x = A/2 the energy is ¾ kinetic.', r`$\text{J}$`),
    P(OSC, null, 'Physical Pendulum', r`$T$`, r`$T = 2\pi\sqrt{\frac{I}{mgd}}$`,
        [INERTIA, M, G_, v(r`$d$`, 'distance from the pivot to the centre of mass', r`$\text{m}$`)],
        'The period of any rigid body swinging about a pivot.',
        r`A uniform rod about its end: $T = 2\pi\sqrt{\frac{2L}{3g}}$.`, r`$\text{s}$`),
    P(OSC, null, 'Wave Speed on a String', r`$v$`, r`$v = \sqrt{\frac{F_T}{\mu}}$`,
        [v(r`$F_T$`, 'tension', r`$\text{N}$`), v(r`$\mu$`, 'mass per unit length', r`$\text{kg/m}$`)],
        'How fast a wave runs along a stretched string.',
        'Quadruple the tension to double the speed.', r`$\text{m/s}$`),
    P(OSC, null, 'Standing Waves on a String', r`$f_n$`, r`$f_n = \frac{nv}{2L},\qquad \lambda_n = \frac{2L}{n},\qquad n = 1, 2, 3, \ldots$`,
        [v(r`$v$`, 'wave speed on the string', r`$\text{m/s}$`), v(r`$L$`, 'length between fixed ends', r`$\text{m}$`)],
        'The frequencies a string fixed at both ends can sustain.',
        'n = 1 is the fundamental; all whole-number harmonics are present.', r`$\text{Hz}$`),
    // Sound
    P(SND, null, 'Speed of Sound in Air', r`$v$`, r`$v \approx 331 + 0.6\,T_C;\qquad v = \sqrt{\frac{\gamma RT}{M}}$`,
        [v(r`$T_C$`, 'temperature', r`$^\circ\text{C}$`), v(r`$\gamma$`, 'ratio of specific heats (1.4 for air)'), v(r`$M$`, 'molar mass (0.029 for air)', r`$\text{kg/mol}$`)],
        'Sound travels faster in warmer air.',
        'About 343 m/s at 20 °C.', r`$\text{m/s}$`),
    P(SND, null, 'Sound Intensity and Level', r`$\beta$`, r`$I = \frac{P}{4\pi r^2},\qquad \beta = 10\log_{10}\frac{I}{I_0},\quad I_0 = 10^{-12}\ \text{W/m}^2$`,
        [v(r`$P$`, 'source power', r`$\text{W}$`), v(r`$I$`, 'intensity', r`$\text{W/m}^2$`)],
        'Intensity falls with the square of distance; loudness is measured in decibels.',
        'Doubling the distance lowers the level by 6 dB; ten times the intensity adds 10 dB.', r`$\text{dB}$`),
    P(SND, null, 'Doppler Effect', r`$f'$`, r`$f' = f\,\frac{v \pm v_o}{v \mp v_s}$`,
        [v(r`$v$`, 'speed of sound', r`$\text{m/s}$`), v(r`$v_o, v_s$`, 'speeds of observer and source', r`$\text{m/s}$`)],
        'The pitch heard changes when the source or the listener moves.',
        'Use the upper signs for motion TOWARD each other: the pitch rises.', r`$\text{Hz}$`),
    P(SND, null, 'Resonance in Air Columns', r`$f_n$`, r`$\text{open–open: } f_n = \frac{nv}{2L};\qquad \text{closed at one end: } f_n = \frac{nv}{4L},\ n = 1, 3, 5, \ldots$`,
        [v(r`$v$`, 'speed of sound', r`$\text{m/s}$`), v(r`$L$`, 'length of the pipe', r`$\text{m}$`)],
        'The notes a pipe can sound.',
        'A pipe closed at one end has only odd harmonics.', r`$\text{Hz}$`),
    P(SND, null, 'Beat Frequency', r`$f_b$`, r`$f_b = |f_1 - f_2|$`,
        [v(r`$f_1, f_2$`, 'two nearby frequencies', r`$\text{Hz}$`)],
        'Two close tones throb at the difference of their frequencies.',
        'Tuning a guitar: adjust until the beats disappear.', r`$\text{Hz}$`),
    // Fluids
    P(FLU, null, 'Density and Pressure', r`$\rho$`, r`$\rho = \frac{m}{V},\qquad p = \frac{F}{A}$`,
        [M, v(r`$V$`, 'volume', r`$\text{m}^3$`), v(r`$F$`, 'force normal to the surface', r`$\text{N}$`), v(r`$A$`, 'area', r`$\text{m}^2$`)],
        'Mass per volume, and force per area.',
        'Water: 1000 kg/m³. 1 atm = 101.325 kPa.', r`$\text{kg/m}^3$`),
    P(FLU, null, "Pascal's Principle", r`$\frac{F_1}{A_1} = \frac{F_2}{A_2}$`, r`$\frac{F_1}{A_1} = \frac{F_2}{A_2},\qquad F_1d_1 = F_2d_2$`,
        [v(r`$F$`, 'forces on the pistons', r`$\text{N}$`), v(r`$A$`, 'piston areas', r`$\text{m}^2$`), v(r`$d$`, 'piston travel', r`$\text{m}$`)],
        'Pressure applied to an enclosed fluid reaches every part of it: the hydraulic press.',
        'The force gain is paid for in distance: work in equals work out.', r`$\text{N}$`),
    P(FLU, null, 'Absolute and Gauge Pressure', r`$p_{\text{abs}}$`, r`$p_{\text{abs}} = p_{\text{atm}} + p_{\text{gauge}}$`,
        [v(r`$p_{\text{atm}}$`, 'atmospheric pressure, 101.325 at sea level', r`$\text{kPa}$`)],
        'A gauge reads pressure above the atmosphere; absolute pressure includes it.',
        'A vacuum reading is a negative gauge pressure.', r`$\text{Pa}$`),
    P(FLU, null, 'Capillary Rise', r`$h$`, r`$h = \frac{2\gamma\cos\theta}{\rho gr}$`,
        [v(r`$\gamma$`, 'surface tension', r`$\text{N/m}$`), v(r`$\theta$`, 'contact angle'), v(r`$\rho$`, 'liquid density', r`$\text{kg/m}^3$`), v(r`$r$`, 'tube radius', r`$\text{m}$`)],
        'How far a liquid climbs (or sinks) in a narrow tube.',
        'Half the radius, twice the rise. Mercury (θ > 90°) is depressed.', r`$\text{m}$`),
    P(FLU, null, "Stokes' Law and Terminal Velocity", r`$v_t$`, r`$F_d = 6\pi\eta rv,\qquad v_t = \frac{2r^2(\rho_s - \rho_f)g}{9\eta}$`,
        [v(r`$\eta$`, 'viscosity', r`$\text{Pa}\cdot\text{s}$`), v(r`$r$`, 'sphere radius', r`$\text{m}$`), v(r`$\rho_s, \rho_f$`, 'sphere and fluid densities', r`$\text{kg/m}^3$`)],
        'The drag on a small sphere in slow flow, and the steady speed it settles at.',
        'Valid only at low Reynolds number (small, slow particles).', r`$\text{m/s}$`),
    // Heat Transfer
    P(HEAT, null, 'Latent Heat', r`$Q = mL$`, r`$Q = mL$`,
        [M, v(r`$L$`, 'latent heat (water: fusion 334, vaporisation 2257)', r`$\text{kJ/kg}$`)],
        'Heat to melt or boil a substance with no change of temperature.',
        'Ice at 0 °C to steam at 100 °C: fusion + heating + vaporisation.', r`$\text{J}$`),
    P(HEAT, null, 'Calorimetry', r`$\sum Q = 0$`, r`$\sum Q_{\text{gained}} = \sum Q_{\text{lost}};\qquad T_f = \frac{m_1c_1T_1 + m_2c_2T_2}{m_1c_1 + m_2c_2}$`,
        [v(r`$m_i, c_i, T_i$`, 'mass, specific heat and starting temperature of each body')],
        'Mixed bodies with no heat loss settle at a common temperature.',
        'Check for a phase change first: the formula is for no melting or boiling.', r`$^\circ\text{C}$`),
    P(HEAT, null, 'Heat Conduction', r`$\dot{Q}$`, r`$\dot{Q} = \frac{kA\,\Delta T}{L};\qquad R = \frac{L}{kA},\ R_{\text{series}} = R_1 + R_2 + \cdots$`,
        [v(r`$k$`, 'thermal conductivity', r`$\text{W/(m}\cdot\text{K)}$`), v(r`$A$`, 'area', r`$\text{m}^2$`), v(r`$L$`, 'thickness', r`$\text{m}$`)],
        'Heat flow through a wall (Fourier\'s law); layers add like resistors in series.',
        'The same heat passes every layer of a composite wall.', r`$\text{W}$`),
    P(HEAT, null, 'Heat Convection', r`$\dot{Q}$`, r`$\dot{Q} = hA(T_s - T_\infty)$`,
        [v(r`$h$`, 'convection coefficient', r`$\text{W/(m}^2\cdot\text{K)}$`), v(r`$A$`, 'area', r`$\text{m}^2$`), v(r`$T_s, T_\infty$`, 'surface and fluid temperatures', r`$\text{K}$`)],
        'Heat carried away by a moving fluid (Newton\'s law of cooling).',
        r`Its thermal resistance is $\frac{1}{hA}$, in series with conduction.`, r`$\text{W}$`),
    P(HEAT, null, 'Heat Radiation', r`$\dot{Q}$`, r`$\dot{Q} = \varepsilon\sigma A(T_s^4 - T_{\text{sur}}^4)$`,
        [v(r`$\varepsilon$`, 'emissivity, 0 to 1'), v(r`$\sigma$`, 'Stefan-Boltzmann constant, 5.67 × 10⁻⁸', r`$\text{W/(m}^2\cdot\text{K}^4)$`), v(r`$T$`, 'absolute temperatures', r`$\text{K}$`)],
        'Net heat a surface radiates to its surroundings.',
        'Temperatures MUST be in kelvin: doubling T multiplies the emission by 16.', r`$\text{W}$`),
    P(HEAT, null, 'Area and Volume Expansion', r`$\Delta V$`, r`$\Delta A = 2\alpha A\,\Delta T,\qquad \Delta V = \beta V\,\Delta T,\quad \beta \approx 3\alpha$`,
        [v(r`$\alpha$`, 'linear expansion coefficient', r`$\text{1/K}$`), v(r`$\beta$`, 'volume expansion coefficient', r`$\text{1/K}$`)],
        'How areas and volumes grow with temperature.',
        'A hole in a plate expands as if it were made of the plate.', r`$\text{m}^3$`),
    P(HEAT, null, 'Temperature Scale Conversions', r`$T_K$`, r`$T_K = T_C + 273.15,\qquad T_F = \tfrac95T_C + 32,\qquad T_R = T_F + 459.67$`,
        [v(r`$T_C, T_F, T_K, T_R$`, 'Celsius, Fahrenheit, kelvin and Rankine temperatures')],
        'Converting between the four temperature scales.',
        'A temperature DIFFERENCE of 1 °C equals 1 K and 1.8 °F; −40° is the same in °C and °F.'),
    // Electrostatics
    P(ES, null, "Coulomb's Law", r`$F$`, r`$F = k\frac{|q_1q_2|}{r^2},\qquad k = \frac{1}{4\pi\varepsilon_0}$`,
        [KC, v(r`$q_1, q_2$`, 'charges', r`$\text{C}$`), v(r`$r$`, 'distance between them', r`$\text{m}$`)],
        'The force between two point charges: like charges repel, unlike attract.',
        'Same inverse-square form as gravity, but about 10³⁶ times stronger between two protons.', r`$\text{N}$`),
    P(ES, null, 'Electric Field of a Point Charge', r`$E$`, r`$E = \frac{F}{q_0} = k\frac{|q|}{r^2}$`, [KC, Q, RAD],
        'The force per unit charge around a charge, pointing away from a positive one.',
        'Fields from several charges add as vectors.', r`$\text{N/C}$`),
    P(ES, null, 'Electric Potential and Potential Energy', r`$V$`, r`$V = k\frac{q}{r},\qquad U = k\frac{q_1q_2}{r} = q_0V,\qquad E = -\frac{dV}{dx}$`,
        [KC, Q, RAD],
        'Potential energy per unit charge; potentials add as plain numbers.',
        'A charge q moved through ΔV gains qΔV of energy: 1 eV for an electron through 1 V.', r`$\text{V}$`),
    P(ES, null, 'Parallel-Plate Capacitor', r`$C$`, r`$C = \frac{Q}{V} = \frac{\kappa\varepsilon_0A}{d}$`,
        [v(r`$\kappa$`, 'dielectric constant (1 for vacuum)'), v(r`$A$`, 'plate area', r`$\text{m}^2$`), v(r`$d$`, 'plate separation', r`$\text{m}$`)],
        'How much charge a capacitor holds per volt.',
        'Between the plates the field is uniform: E = V/d.', r`$\text{F}$`),
    P(ES, null, 'Energy Stored in a Capacitor', r`$U$`, r`$U = \tfrac12CV^2 = \frac{Q^2}{2C} = \tfrac12QV$`,
        [v(r`$C$`, 'capacitance', r`$\text{F}$`), v(r`$V$`, 'voltage', r`$\text{V}$`), v(r`$Q$`, 'charge', r`$\text{C}$`)],
        'The energy held in a capacitor\'s electric field.',
        'Charging from a battery, as much energy is lost as is stored.', r`$\text{J}$`),
    P(ES, null, 'Capacitors in Series and Parallel', r`$C_{\text{eq}}$`, r`$\text{parallel: } C_{\text{eq}} = C_1 + C_2 + \cdots;\qquad \text{series: } \frac{1}{C_{\text{eq}}} = \frac{1}{C_1} + \frac{1}{C_2} + \cdots$`,
        [v(r`$C_i$`, 'capacitances', r`$\text{F}$`)],
        'Combining capacitors: the reverse of resistors.',
        'In series every capacitor carries the same charge; in parallel, the same voltage.', r`$\text{F}$`),
    // Electricity
    P(ELEC, null, "Ohm's Law", r`$V = IR$`, r`$V = IR$`,
        [v(r`$V$`, 'voltage across', r`$\text{V}$`), I, v(r`$R$`, 'resistance', r`$\Omega$`)],
        'Current through a resistor is proportional to the voltage across it.',
        'It holds for metals at steady temperature; a diode does not obey it.', r`$\text{V}$`),
    P(ELEC, null, 'Resistance and Resistivity', r`$R$`, r`$R = \frac{\rho L}{A},\qquad R_T = R_0\left[1 + \alpha(T - T_0)\right]$`,
        [v(r`$\rho$`, 'resistivity (copper 1.72 × 10⁻⁸)', r`$\Omega\cdot\text{m}$`), v(r`$L$`, 'length', r`$\text{m}$`), v(r`$A$`, 'cross-section', r`$\text{m}^2$`), v(r`$\alpha$`, 'temperature coefficient (copper 0.00393)', r`$\text{1/}^\circ\text{C}$`)],
        'A conductor\'s resistance from its material and shape, and how it rises with temperature.',
        'Stretching a wire to twice its length (same volume) multiplies R by 4.', r`$\Omega$`),
    P(ELEC, null, 'Resistors in Series and Parallel', r`$R_{\text{eq}}$`, r`$\text{series: } R_{\text{eq}} = R_1 + R_2 + \cdots;\qquad \text{parallel: } \frac{1}{R_{\text{eq}}} = \frac{1}{R_1} + \frac{1}{R_2} + \cdots$`,
        [v(r`$R_i$`, 'resistances', r`$\Omega$`)],
        'Combining resistors.',
        r`Two in parallel: $\frac{R_1R_2}{R_1 + R_2}$, always less than the smaller one.`, r`$\Omega$`),
    P(ELEC, null, 'Electric Power and Energy', r`$P$`, r`$P = VI = I^2R = \frac{V^2}{R},\qquad E = Pt$`,
        [v(r`$V$`, 'voltage', r`$\text{V}$`), I, v(r`$R$`, 'resistance', r`$\Omega$`), v(r`$t$`, 'time', r`$\text{h}$`)],
        'The rate of energy use in a circuit, and the energy over a time.',
        'Bills count kilowatt-hours: 1 kWh = 3.6 MJ.', r`$\text{W}$`),
    P(ELEC, null, "Kirchhoff's Laws", r`$\sum I = 0$`, r`$\text{junction: } \sum I_{\text{in}} = \sum I_{\text{out}};\qquad \text{loop: } \sum \Delta V = 0$`,
        [I, v(r`$\Delta V$`, 'voltage rises and drops around a loop', r`$\text{V}$`)],
        'Charge is conserved at a junction, and energy around a closed loop.',
        'Going through a resistor with the current is a drop of IR.'),
    P(ELEC, null, 'EMF and Internal Resistance', r`$V_t$`, r`$V_t = \varepsilon - Ir,\qquad I = \frac{\varepsilon}{R + r}$`,
        [v(r`$\varepsilon$`, 'EMF', r`$\text{V}$`), v(r`$r$`, 'internal resistance', r`$\Omega$`), v(r`$R$`, 'load resistance', r`$\Omega$`)],
        'A real source\'s terminal voltage sags as it delivers current.',
        'Maximum power reaches the load when R = r.', r`$\text{V}$`),
    P(ELEC, null, 'RC Time Constant', r`$\tau = RC$`, r`$\tau = RC;\quad \text{charging: } V_C = \varepsilon(1 - e^{-t/\tau});\quad \text{discharging: } V_C = V_0e^{-t/\tau}$`,
        [v(r`$R$`, 'resistance', r`$\Omega$`), v(r`$C$`, 'capacitance', r`$\text{F}$`)],
        'How quickly a capacitor charges or discharges through a resistor.',
        'After one τ: 63.2% charged; after 5τ, practically full.', r`$\text{s}$`),
    // Magnetism
    P(MAG, null, 'Magnetic Force on a Moving Charge', r`$F$`, r`$F = qvB\sin\theta$`,
        [Q, VEL, B, v(r`$\theta$`, 'angle between velocity and field')],
        'A moving charge in a magnetic field is pushed sideways.',
        'The force is square to the motion, so it does no work; direction by the right-hand rule (reversed for electrons).', r`$\text{N}$`),
    P(MAG, null, 'Radius of a Charge in a Magnetic Field', r`$r$`, r`$r = \frac{mv}{qB},\qquad f = \frac{qB}{2\pi m}$`,
        [M, VEL, Q, B],
        'A charge moving square to a uniform field goes round in a circle.',
        'The cyclotron frequency does not depend on the speed.', r`$\text{m}$`),
    P(MAG, null, 'Magnetic Force on a Current-Carrying Wire', r`$F$`, r`$F = BIL\sin\theta$`,
        [B, I, v(r`$L$`, 'length of wire in the field', r`$\text{m}$`), v(r`$\theta$`, 'angle between wire and field')],
        'The push on a wire carrying current through a magnetic field: the motor effect.',
        'Zero when the wire runs along the field.', r`$\text{N}$`),
    P(MAG, null, 'Magnetic Field of a Long Straight Wire', r`$B$`, r`$B = \frac{\mu_0I}{2\pi r}$`, [MU0, I, RAD],
        'The field circling a long straight current.',
        'Two parallel wires attract (same direction) with F/L = μ₀I₁I₂/(2πd).', r`$\text{T}$`),
    P(MAG, null, 'Magnetic Field of a Solenoid', r`$B$`, r`$B = \mu_0nI = \frac{\mu_0NI}{L}$`,
        [MU0, v(r`$n$`, 'turns per metre', r`$\text{1/m}$`), I],
        'The nearly uniform field inside a long coil.',
        r`At the centre of a single loop of radius $R$: $B = \frac{\mu_0I}{2R}$.`, r`$\text{T}$`),
    // Electromagnetic Induction
    P(IND, null, 'Magnetic Flux', r`$\Phi$`, r`$\Phi = BA\cos\theta$`,
        [B, v(r`$A$`, 'area', r`$\text{m}^2$`), v(r`$\theta$`, 'angle between the field and the normal to the area')],
        'How much magnetic field passes through a surface.',
        '1 Wb = 1 T·m². θ is from the NORMAL, not the surface.', r`$\text{Wb}$`),
    P(IND, null, "Faraday's Law of Induction", r`$\varepsilon$`, r`$\varepsilon = -N\frac{\Delta\Phi}{\Delta t}$`,
        [v(r`$N$`, 'turns'), v(r`$\Phi$`, 'flux through one turn', r`$\text{Wb}$`), v(r`$t$`, 'time', r`$\text{s}$`)],
        'A changing flux through a coil induces an EMF.',
        'The minus sign is Lenz\'s law: the induced current opposes the change.', r`$\text{V}$`),
    P(IND, null, 'Motional EMF', r`$\varepsilon = BLv$`, r`$\varepsilon = BLv$`,
        [B, v(r`$L$`, 'length of the moving rod', r`$\text{m}$`), VEL],
        'A rod moving across a field has an EMF along it.',
        'Rod, field and velocity must be mutually square for the full value.', r`$\text{V}$`),
    P(IND, null, 'AC Generator EMF', r`$\varepsilon_{\max}$`, r`$\varepsilon = NBA\omega\sin\omega t,\qquad \varepsilon_{\max} = NBA\omega$`,
        [v(r`$N$`, 'turns'), B, v(r`$A$`, 'coil area', r`$\text{m}^2$`), OMEGA],
        'A coil turning in a field makes a sinusoidal EMF.',
        'The rms value is ε_max/√2.', r`$\text{V}$`),
    P(IND, null, 'Ideal Transformer', r`$\frac{V_s}{V_p}$`, r`$\frac{V_s}{V_p} = \frac{N_s}{N_p} = \frac{I_p}{I_s}$`,
        [v(r`$N_p, N_s$`, 'primary and secondary turns'), v(r`$V, I$`, 'voltages and currents')],
        'A transformer scales voltage by the turns ratio and current by its inverse.',
        'Power in = power out for an ideal transformer: VₚIₚ = VₛIₛ.'),
    P(IND, null, 'Energy in an Inductor', r`$U$`, r`$U = \tfrac12LI^2,\qquad \varepsilon = -L\frac{dI}{dt}$`,
        [v(r`$L$`, 'inductance', r`$\text{H}$`), I],
        'The energy held in an inductor\'s magnetic field, and the EMF that opposes a change of current.',
        r`An RL circuit has time constant $\tau = \frac{L}{R}$.`, r`$\text{J}$`),
    // Optics
    P(OPT, null, 'Index of Refraction', r`$n$`, r`$n = \frac{c}{v}$`,
        [v(r`$c$`, 'speed of light in vacuum', r`$\text{m/s}$`), v(r`$v$`, 'speed in the medium', r`$\text{m/s}$`)],
        'How much a medium slows light.',
        'Water 1.33, glass about 1.5. The wavelength shrinks by n; the frequency does not change.'),
    P(OPT, null, 'Critical Angle', r`$\theta_c$`, r`$\sin\theta_c = \frac{n_2}{n_1},\quad n_1 > n_2$`,
        [v(r`$n_1$`, 'index of the denser medium'), v(r`$n_2$`, 'index of the other medium')],
        'Beyond this angle, light in the denser medium is totally reflected.',
        'Glass to air: about 42°. Optical fibres work by it.'),
    P(OPT, null, 'Spherical Mirror Equation', r`$\frac1f$`, r`$\frac1f = \frac{1}{d_o} + \frac{1}{d_i},\qquad f = \frac{R}{2}$`,
        [v(r`$f$`, 'focal length (positive for a concave mirror)', r`$\text{m}$`), v(r`$R$`, 'radius of curvature', r`$\text{m}$`)],
        'Where a curved mirror forms an image.',
        'A convex mirror has negative f and always gives a smaller upright virtual image.', r`$\text{m}$`),
    P(OPT, null, 'Magnification', r`$M$`, r`$M = \frac{h_i}{h_o} = -\frac{d_i}{d_o}$`,
        [v(r`$h_i, h_o$`, 'image and object heights', r`$\text{m}$`), v(r`$d_i, d_o$`, 'image and object distances', r`$\text{m}$`)],
        'How much larger the image is, and which way up.',
        'Negative M means an inverted (real) image.'),
    P(OPT, null, "Lensmaker's Equation", r`$\frac1f$`, r`$\frac1f = (n - 1)\left(\frac{1}{R_1} - \frac{1}{R_2}\right);\qquad P = \frac1f$`,
        [v(r`$n$`, 'index of the lens material'), v(r`$R_1, R_2$`, 'radii of the two faces (sign by convention)', r`$\text{m}$`), v(r`$P$`, 'power', r`$\text{D}$`)],
        'A lens\'s focal length from its shape and glass; its power in dioptres.',
        'Lenses in contact add their powers.', r`$\text{m}$`),
    P(OPT, null, 'Double-Slit Interference', r`$y_m$`, r`$d\sin\theta = m\lambda,\qquad y_m \approx \frac{m\lambda L}{d}$`,
        [v(r`$d$`, 'slit separation', r`$\text{m}$`), v(r`$\lambda$`, 'wavelength', r`$\text{m}$`), v(r`$L$`, 'distance to the screen', r`$\text{m}$`), v(r`$m$`, 'order of the bright fringe')],
        'Positions of the bright fringes from two slits (Young).',
        r`Fringe spacing $\frac{\lambda L}{d}$; a diffraction grating uses the same $d\sin\theta = m\lambda$.`, r`$\text{m}$`),
    // Atomic and Nuclear Physics
    P(ATOM, null, 'Photoelectric Effect', r`$KE_{\max}$`, r`$KE_{\max} = hf - \phi,\qquad f_0 = \frac{\phi}{h}$`,
        [v(r`$h$`, 'Planck constant', r`$\text{J}\cdot\text{s}$`), v(r`$f$`, 'light frequency', r`$\text{Hz}$`), v(r`$\phi$`, 'work function', r`$\text{eV}$`)],
        'Light ejects electrons only above a threshold frequency, whatever its brightness.',
        'Brighter light gives more electrons, not faster ones.', r`$\text{eV}$`),
    P(ATOM, null, 'Photon Wavelength and Energy', r`$E = \frac{hc}{\lambda}$`, r`$E = \frac{hc}{\lambda},\qquad E(\text{eV}) \approx \frac{1240}{\lambda(\text{nm})}$`,
        [v(r`$\lambda$`, 'wavelength', r`$\text{m}$`)],
        'A photon\'s energy from its wavelength.',
        'Visible light is about 1.8 to 3.1 eV.', r`$\text{J}$`),
    P(ATOM, null, 'de Broglie Wavelength', r`$\lambda$`, r`$\lambda = \frac{h}{p} = \frac{h}{mv}$`,
        [v(r`$h$`, 'Planck constant', r`$\text{J}\cdot\text{s}$`), v(r`$p$`, 'momentum', r`$\text{kg}\cdot\text{m/s}$`)],
        'Every moving particle has a wavelength.',
        r`An electron accelerated through $V$ volts: $\lambda \approx \frac{1.226}{\sqrt V}$ nm.`, r`$\text{m}$`),
    P(ATOM, null, 'Bohr Energy Levels of Hydrogen', r`$E_n$`, r`$E_n = -\frac{13.6\ \text{eV}}{n^2},\qquad \Delta E = hf = 13.6\left(\frac{1}{n_f^2} - \frac{1}{n_i^2}\right)\ \text{eV}$`,
        [v(r`$n$`, 'principal quantum number, 1, 2, 3, …')],
        'The allowed energies of the hydrogen electron, and the photon given off in a jump.',
        'Ionising from the ground state takes 13.6 eV.', r`$\text{eV}$`),
    P(ATOM, null, 'Mass-Energy Equivalence', r`$E = mc^2$`, r`$E = mc^2;\qquad 1\ \text{u} \leftrightarrow 931.5\ \text{MeV}$`,
        [M, v(r`$c$`, 'speed of light', r`$\text{m/s}$`)],
        'Mass and energy are interchangeable.',
        'Binding energy = mass defect × 931.5 MeV/u.', r`$\text{J}$`),
    P(ATOM, null, 'Radioactive Decay Law', r`$N$`, r`$N = N_0e^{-\lambda t} = N_0\left(\tfrac12\right)^{t/T_{1/2}},\qquad A = \lambda N,\quad T_{1/2} = \frac{\ln 2}{\lambda}$`,
        [v(r`$N_0$`, 'starting number of nuclei'), v(r`$\lambda$`, 'decay constant', r`$\text{1/s}$`), v(r`$A$`, 'activity', r`$\text{Bq}$`)],
        'How the number of radioactive nuclei, and their activity, fall with time.',
        'After n half-lives, (½)ⁿ is left: 3 half-lives leave 12.5%.'),
    // Constants
    K(ES, 'Coulomb Constant', r`$k$`, r`$8.988 \times 10^{9}\ \text{N}\cdot\text{m}^2\text{/C}^2$`, 'The constant in Coulomb\'s law.', r`$k = \frac{1}{4\pi\varepsilon_0}$; often rounded to $9 \times 10^9$.`),
    K(ES, 'Permittivity of Free Space', r`$\varepsilon_0$`, r`$8.854 \times 10^{-12}\ \text{F/m}$`, 'How a vacuum supports an electric field.', 'It sets the capacitance of a parallel-plate capacitor in air.'),
    K(ES, 'Elementary Charge', r`$e$`, r`$1.602 \times 10^{-19}\ \text{C}$`, 'The size of the charge on a proton or an electron.', r`$1\ \text{eV} = 1.602 \times 10^{-19}\ \text{J}$.`),
    K(MAG, 'Permeability of Free Space', r`$\mu_0$`, r`$4\pi \times 10^{-7} \approx 1.2566 \times 10^{-6}\ \text{T}\cdot\text{m/A}$`, 'How a vacuum supports a magnetic field.', r`$\frac{1}{\sqrt{\mu_0\varepsilon_0}} = c$.`),
    K(ATOM, 'Electron Rest Mass', r`$m_e$`, r`$9.109 \times 10^{-31}\ \text{kg}$`, 'The mass of an electron.', 'About 1/1836 of a proton\'s mass; 0.511 MeV/c².'),
    K(ATOM, 'Atomic Mass Unit', r`$\text{u}$`, r`$1.6605 \times 10^{-27}\ \text{kg} = 931.5\ \text{MeV/}c^2$`, 'One twelfth of the mass of a carbon-12 atom.', 'Use 931.5 MeV per u for binding energies.'),
];

module.exports = { subject: 'ESAS', topic: 'Physics for Engineers', migration: '20261212000000_cards_physics_for_engineers', file, revisions, retire, drafts };
