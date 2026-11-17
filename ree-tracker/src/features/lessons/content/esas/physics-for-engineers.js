// Library › Lessons › ESAS › Physics for Engineers (2026-11-17): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Engineering Mechanics, Fluid
// Mechanics, Deformable Bodies and Thermodynamics go deeper on their parts;
// this lesson is the common ground.
const r = String.raw;

export default {
  topic: 'Physics for Engineers',
  subject: 'ESAS',
  overview: r`The physics every engineering subject leans on: motion and its causes, energy and momentum, turning, springs and materials, waves and sound, fluids and heat, electricity and magnetism, light, and the atom. Board problems here are short: one or two laws, careful units. Work in SI, keep track of signs and directions, and ask first which quantity is conserved: energy, momentum, angular momentum or charge.`,
  sources: [
    'University Physics (Young and Freedman)',
    'Fundamentals of Physics (Halliday, Resnick and Walker)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Kinematics',
      inShort: r`Describing motion: position, velocity and acceleration, in a line and in a plane.`,
      keyIdeas: [
        r`Constant acceleration: $v = v_0 + at$, $x = v_0t + \frac12at^2$, $v^2 = v_0^2 + 2ax$ (the cards are in Engineering Mechanics).`,
        r`Free fall from rest: $h = \frac12gt^2$, $v = \sqrt{2gh}$. Projectiles: horizontal speed constant, vertical as free fall; $T = \frac{2v_0\sin\theta}{g}$, $H = \frac{v_0^2\sin^2\theta}{2g}$.`,
        r`Relative velocity: $\vec v_{A/B} = \vec v_A - \vec v_B$. Average speed uses the path; average velocity, the displacement.`,
      ],
      example: {
        problem: r`A stone is dropped from 45 m. When does it land, and how fast? A ball is thrown at 30 m/s, 40° above level ground: find its time of flight and greatest height.`,
        solution: r`$t = \sqrt{\frac{2(45)}{9.81}} = 3.03$ s, $v = 9.81(3.03) = 29.7$ m/s. Ball: $T = \frac{2(30)\sin40^\circ}{9.81} = 3.93$ s, $H = \frac{(30\sin40^\circ)^2}{2(9.81)} = 18.95$ m.`,
      },
      traps: [r`At the top of a projectile's path the speed is not zero; only the vertical part is.`],
    },
    {
      name: 'Dynamics',
      inShort: r`Forces and the motion they cause, including gravitation and orbits.`,
      keyIdeas: [
        r`$\sum F = ma$; weight $W = mg$. In a lift accelerating up at $a$, a scale reads $m(g + a)$.`,
        r`Gravitation $F = \frac{Gm_1m_2}{r^2}$; at height $h$, $g_h = g\left(\frac{R}{R + h}\right)^2$.`,
        r`Circular orbit $v = \sqrt{\frac{GM}{r}}$, escape $\sqrt{\frac{2GM}{R}}$, Kepler $T^2 = \frac{4\pi^2r^3}{GM}$.`,
      ],
      example: {
        problem: r`A satellite circles 400 km above the Earth ($GM = 3.986 \times 10^{14}$ m³/s², $R = 6371$ km). Find its speed and period. A 60 kg person rides a lift accelerating up at 2 m/s²: what does the scale read?`,
        solution: r`$r = 6.771 \times 10^6$ m: $v = \sqrt{\frac{3.986 \times 10^{14}}{6.771 \times 10^6}} = 7.67$ km/s, $T = \frac{2\pi r}{v} = 5545$ s $= 92.4$ min. Scale: $60(9.81 + 2) = 708.6$ N.`,
      },
      traps: [r`Measure $r$ from the Earth's centre, not from its surface.`],
    },
    {
      name: 'Work, Energy and Power',
      inShort: r`Energy changes form but is never lost; work is how forces move it.`,
      keyIdeas: [
        r`Work-energy theorem: $W_{\text{net}} = \Delta KE$.`,
        r`Without friction, $KE + PE$ is constant; spring energy $\frac12kx^2$.`,
        r`Power $P = \frac{W}{t} = Fv$; efficiency $\frac{\text{output}}{\text{input}}$, multiplying along a chain.`,
      ],
      example: {
        problem: r`A block slides from rest down a frictionless slide 5 m high. How fast is it at the bottom? A spring with $k = 400$ N/m is compressed 15 cm: how much energy does it hold?`,
        solution: r`$v = \sqrt{2(9.81)(5)} = 9.90$ m/s, whatever the slide's shape. Spring: $\frac12(400)(0.15)^2 = 4.5$ J.`,
      },
      traps: [r`Friction turns mechanical energy into heat: then $KE_1 + PE_1 = KE_2 + PE_2 + W_f$.`],
    },
    {
      name: 'Impulse and Momentum',
      inShort: r`Momentum is conserved in every collision; kinetic energy only in elastic ones.`,
      keyIdeas: [
        r`Impulse $F\Delta t = \Delta p$; total momentum is conserved when no outside force acts.`,
        r`Stuck together: $v' = \frac{m_1v_1 + m_2v_2}{m_1 + m_2}$. Elastic: both momentum and energy conserved; equal masses swap velocities.`,
        r`Restitution $e = \frac{v_2' - v_1'}{v_1 - v_2}$; a dropped ball rebounds to $e^2h$.`,
      ],
      example: {
        problem: r`A 2 kg cart at 5 m/s meets a 3 kg cart moving at −1 m/s. Find their velocities if the collision is elastic, and if they stick.`,
        solution: r`Elastic: $v_1' = \frac{-1}{5}(5) + \frac{6}{5}(-1) = -2.2$ m/s, $v_2' = \frac45(5) + \frac15(-1) = 3.8$ m/s (momentum $7$ before and after). Stuck: $\frac{10 - 3}{5} = 1.4$ m/s.`,
      },
      traps: [r`Velocity has a sign: a body moving the other way enters as negative.`],
    },
    {
      name: 'Rotation',
      inShort: r`Turning motion: the rotational versions of displacement, velocity, force, mass and momentum.`,
      keyIdeas: [
        r`$\omega = \omega_0 + \alpha t$ and the rest; $v = r\omega$, $a_t = r\alpha$; rpm to rad/s: $\times\frac{2\pi}{60}$.`,
        r`$\tau = I\alpha$; $I$ for rod, disc, ring, sphere; $I = I_{cm} + Md^2$.`,
        r`$KE = \frac12I\omega^2$; rolling adds $\frac12mv^2$; $L = I\omega$ is conserved with no outside torque.`,
      ],
      example: {
        problem: r`A disc and a ring roll from rest down a slope 2 m high. Which is faster at the bottom, and by how much?`,
        solution: r`$v = \sqrt{\frac{2gh}{1 + I/(mr^2)}}$. Disc ($\frac12$): $\sqrt{\frac{39.24}{1.5}} = 5.11$ m/s. Ring (1): $\sqrt{19.62} = 4.43$ m/s. The disc wins: less of its energy goes into turning.`,
      },
      traps: [r`Use radians in every rotational formula.`],
    },
    {
      name: 'Elasticity',
      inShort: r`How solids stretch, shear and squeeze under load.`,
      keyIdeas: [
        r`Spring $F = kx$; springs in parallel add, in series add reciprocally.`,
        r`Young's modulus $Y = \frac{FL}{A\Delta L}$; shear modulus $G = \frac{\tau}{\gamma}$; bulk modulus $K = -\frac{\Delta p}{\Delta V/V}$.`,
        r`Stress and strain in design are the subject of Fundamentals of Deformable Bodies.`,
      ],
      example: {
        problem: r`A steel rod ($Y = 200$ GPa) 2 m long with a 2 cm² cross-section carries 50 kN. Find the stress and the extension.`,
        solution: r`Stress $\frac{50\,000}{2 \times 10^{-4}} = 250$ MPa. $\Delta L = \frac{(50\,000)(2)}{(2 \times 10^{-4})(200 \times 10^9)} = 2.5$ mm.`,
      },
      traps: [r`Convert cm² to m² ($\times10^{-4}$) and GPa to Pa ($\times10^9$) before dividing.`],
    },
    {
      name: 'Oscillations and Waves',
      inShort: r`Vibrations and the waves that carry them.`,
      keyIdeas: [
        r`SHM: $x = A\cos(\omega t + \phi)$, $v_{\max} = A\omega$, $a_{\max} = A\omega^2$; spring $T = 2\pi\sqrt{\frac mk}$, pendulum $2\pi\sqrt{\frac Lg}$, physical pendulum $2\pi\sqrt{\frac{I}{mgd}}$.`,
        r`Energy $\frac12kA^2$, shared between kinetic and potential.`,
        r`$v = f\lambda$; on a string $v = \sqrt{\frac{F_T}{\mu}}$; standing waves $f_n = \frac{nv}{2L}$.`,
      ],
      example: {
        problem: r`A 0.5 kg mass on a 50 N/m spring is pulled 10 cm and let go. Find $\omega$, the period, the greatest speed and the energy.`,
        solution: r`$\omega = \sqrt{\frac{50}{0.5}} = 10$ rad/s, $T = 0.628$ s, $v_{\max} = 0.1(10) = 1$ m/s, $E = \frac12(50)(0.1)^2 = 0.25$ J.`,
      },
      traps: [r`The pendulum's period ignores mass; the spring's ignores gravity.`],
    },
    {
      name: 'Sound',
      inShort: r`Sound waves in air: speed, loudness, pitch shifts and resonance.`,
      keyIdeas: [
        r`$v \approx 331 + 0.6T_C$ m/s (343 at 20 °C).`,
        r`$\beta = 10\log\frac{I}{10^{-12}}$ dB; $I \propto \frac{1}{r^2}$, so doubling the distance loses 6 dB.`,
        r`Doppler $f' = f\frac{v \pm v_o}{v \mp v_s}$; pipes: open $\frac{nv}{2L}$, closed $\frac{nv}{4L}$ (odd $n$); beats $|f_1 - f_2|$.`,
      ],
      example: {
        problem: r`A 500 Hz siren approaches at 30 m/s, then moves away. What pitch does a standing listener hear ($v = 343$ m/s)?`,
        solution: r`Approaching: $500\cdot\frac{343}{343 - 30} = 547.9$ Hz. Receding: $500\cdot\frac{343}{343 + 30} = 459.8$ Hz.`,
      },
      traps: [r`Toward each other, the pitch goes UP: pick the signs that make it rise.`],
    },
    {
      name: 'Fluids',
      inShort: r`Pressure and the behaviour of liquids and gases at rest and in slow motion.`,
      keyIdeas: [
        r`$\rho = \frac mV$, $p = \frac FA$; absolute = atmospheric + gauge.`,
        r`Pascal: $\frac{F_1}{A_1} = \frac{F_2}{A_2}$, the hydraulic press. Hydrostatics, buoyancy and Bernoulli are in Fluid Mechanics.`,
        r`Capillary rise $h = \frac{2\gamma\cos\theta}{\rho gr}$; Stokes drag $6\pi\eta rv$ and terminal velocity.`,
      ],
      example: {
        problem: r`A hydraulic press has pistons of 10 cm² and 500 cm². What load does 200 N lift? How high does water rise in a 0.5 mm-radius tube ($\gamma = 0.0728$ N/m, $\theta = 0$)?`,
        solution: r`$200 \times \frac{500}{10} = 10\,000$ N. $h = \frac{2(0.0728)}{(1000)(9.81)(0.0005)} = 0.0297$ m $\approx 30$ mm.`,
      },
      traps: [r`The press multiplies force, not work: the large piston moves 50 times less.`],
    },
    {
      name: 'Heat Transfer',
      inShort: r`Heat changing temperature or phase, and how it flows: conduction, convection, radiation.`,
      keyIdeas: [
        r`$Q = mc\Delta T$ and $Q = mL$ (water: 334 kJ/kg to melt, 2257 to boil); in a mixture, heat lost = heat gained.`,
        r`Conduction $\frac{kA\Delta T}{L}$, convection $hA\Delta T$, radiation $\varepsilon\sigma A(T_s^4 - T_{\text{sur}}^4)$ in kelvin.`,
        r`Thermal resistances in series add: $\frac{L}{kA}$ for a layer, $\frac{1}{hA}$ for a surface.`,
      ],
      example: {
        problem: r`How much heat turns 1 kg of ice at 0 °C into steam at 100 °C? How much heat passes a 10 m², 0.2 m brick wall ($k = 0.8$ W/m·K) with 25 °C across it?`,
        solution: r`$334 + 4.186(100) + 2257 = 3010$ kJ. Wall: $\frac{0.8(10)(25)}{0.2} = 1000$ W.`,
      },
      traps: [r`Radiation needs kelvin; conduction and convection can use a Celsius difference.`],
    },
    {
      name: 'Electrostatics',
      inShort: r`Charges at rest: forces, fields, potential and capacitance.`,
      keyIdeas: [
        r`$F = k\frac{q_1q_2}{r^2}$, $E = k\frac{q}{r^2}$, $V = k\frac qr$, with $k = 8.99 \times 10^9$.`,
        r`$C = \frac QV = \frac{\kappa\varepsilon_0A}{d}$; energy $\frac12CV^2$.`,
        r`Capacitors in parallel add; in series add reciprocally.`,
      ],
      example: {
        problem: r`Find the force between +2 μC and −3 μC charges 0.3 m apart. A parallel-plate capacitor has 0.02 m² plates 1 mm apart: find $C$ and its energy at 12 V.`,
        solution: r`$F = \frac{(8.99 \times 10^9)(6 \times 10^{-12})}{0.09} = 0.599$ N, attractive. $C = \frac{(8.854 \times 10^{-12})(0.02)}{0.001} = 177$ pF; $U = \frac12(1.77 \times 10^{-10})(144) = 1.27 \times 10^{-8}$ J.`,
      },
      traps: [r`Fields add as vectors; potentials add as plain numbers.`],
    },
    {
      name: 'Electricity',
      inShort: r`Current, resistance and power in DC circuits.`,
      keyIdeas: [
        r`$V = IR$; $R = \frac{\rho L}{A}$, rising with temperature as $R_0[1 + \alpha\Delta T]$.`,
        r`Series resistances add; parallel ones add reciprocally. Kirchhoff: currents balance at a junction, voltages round a loop.`,
        r`$P = VI = I^2R = \frac{V^2}{R}$; a real source gives $V_t = \varepsilon - Ir$; RC circuits change with $\tau = RC$.`,
      ],
      example: {
        problem: r`Find the resistance of 100 m of copper wire, 1 mm² ($\rho = 1.72 \times 10^{-8}$ Ω·m). A 12 V battery with 0.5 Ω inside drives a 2 Ω load: find the current and the terminal voltage.`,
        solution: r`$R = \frac{(1.72 \times 10^{-8})(100)}{10^{-6}} = 1.72$ Ω. $I = \frac{12}{2.5} = 4.8$ A, $V_t = 12 - 4.8(0.5) = 9.6$ V.`,
      },
      traps: [r`Two resistors in parallel are always less than the smaller one.`],
    },
    {
      name: 'Magnetism',
      inShort: r`Magnetic fields from currents, and their forces on charges and wires.`,
      keyIdeas: [
        r`$F = qvB\sin\theta$ on a charge, $F = BIL\sin\theta$ on a wire; a charge circles with $r = \frac{mv}{qB}$.`,
        r`Long wire $B = \frac{\mu_0I}{2\pi r}$; solenoid $\mu_0nI$; loop centre $\frac{\mu_0I}{2R}$.`,
        r`Parallel currents in the same direction attract.`,
      ],
      example: {
        problem: r`Find the field 5 cm from a wire carrying 10 A. An electron moves at $10^6$ m/s square to a 1 mT field: find the radius of its path.`,
        solution: r`$B = \frac{(4\pi \times 10^{-7})(10)}{2\pi(0.05)} = 40$ μT. $r = \frac{(9.109 \times 10^{-31})(10^6)}{(1.602 \times 10^{-19})(10^{-3})} = 5.69$ mm.`,
      },
      traps: [r`The magnetic force does no work: it changes direction, never speed.`],
    },
    {
      name: 'Electromagnetic Induction',
      inShort: r`A changing magnetic flux makes a voltage: generators and transformers.`,
      keyIdeas: [
        r`$\Phi = BA\cos\theta$; Faraday $\varepsilon = -N\frac{\Delta\Phi}{\Delta t}$, the minus sign being Lenz's law.`,
        r`Moving rod $\varepsilon = BLv$; rotating coil $\varepsilon_{\max} = NBA\omega$.`,
        r`Transformer $\frac{V_s}{V_p} = \frac{N_s}{N_p} = \frac{I_p}{I_s}$; inductor energy $\frac12LI^2$.`,
      ],
      example: {
        problem: r`A 200-turn coil of 0.01 m² turns at 60 Hz in a 0.2 T field. Find the peak and rms EMF. A transformer with 1200 and 60 turns takes 240 V: what comes out?`,
        solution: r`$\omega = 2\pi(60) = 377$ rad/s; $\varepsilon_{\max} = 200(0.2)(0.01)(377) = 150.8$ V, rms $106.6$ V. Transformer: $240 \times \frac{60}{1200} = 12$ V.`,
      },
      traps: [r`A steady field through a still coil induces nothing: the flux must change.`],
    },
    {
      name: 'Optics',
      inShort: r`Light: reflection, refraction, images, and interference.`,
      keyIdeas: [
        r`$n = \frac cv$; Snell $n_1\sin\theta_1 = n_2\sin\theta_2$; total internal reflection beyond $\sin\theta_c = \frac{n_2}{n_1}$.`,
        r`Mirrors and lenses: $\frac1f = \frac1{d_o} + \frac1{d_i}$, $M = -\frac{d_i}{d_o}$; lensmaker; power in dioptres.`,
        r`Double slit: bright fringes at $d\sin\theta = m\lambda$, spaced $\frac{\lambda L}{d}$.`,
      ],
      example: {
        problem: r`An object stands 30 cm from a converging lens of focal length 10 cm. Where is the image, and what is it like? What is the critical angle for glass ($n = 1.5$) in air?`,
        solution: r`$\frac{1}{d_i} = \frac{1}{10} - \frac{1}{30}$, so $d_i = 15$ cm; $M = -\frac{15}{30} = -0.5$: real, inverted, half size. $\theta_c = \sin^{-1}\frac{1}{1.5} = 41.8^\circ$.`,
      },
      traps: [r`Angles are measured from the normal, not the surface.`],
    },
    {
      name: 'Atomic and Nuclear Physics',
      inShort: r`Photons, electrons as waves, atomic energy levels, and nuclear decay.`,
      keyIdeas: [
        r`$E = hf = \frac{hc}{\lambda}$, about $\frac{1240}{\lambda(\text{nm})}$ eV; photoelectric $KE_{\max} = hf - \phi$.`,
        r`de Broglie $\lambda = \frac hp$; hydrogen $E_n = -\frac{13.6}{n^2}$ eV.`,
        r`$E = mc^2$, 931.5 MeV per u; decay $N = N_0\left(\frac12\right)^{t/T_{1/2}}$, activity $\lambda N$.`,
      ],
      example: {
        problem: r`Light of 400 nm falls on a metal with work function 2.3 eV. Find the photon energy and the fastest electrons' energy. What fraction of carbon-14 remains after three half-lives?`,
        solution: r`$E = \frac{1240}{400} = 3.10$ eV; $KE_{\max} = 3.10 - 2.3 = 0.80$ eV. After three half-lives, $\left(\frac12\right)^3 = 12.5\%$.`,
      },
      traps: [r`Brighter light means more photoelectrons, not faster ones; only frequency sets their energy.`],
    },
  ],
};
