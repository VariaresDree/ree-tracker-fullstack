// Library › Lessons › ESAS › Physics for Engineers
// (2026-11-17; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// physicsLesson.test.js. Coverage and problem styles cross-checked against a
// review center's physics and materials science handout; the text, problems
// and figures are this app's own): written for the Philippine REE board,
// subtopic by subtopic in the syllabus's order. Engineering Mechanics, Fluid
// Mechanics, Deformable Bodies and Thermodynamics go deeper on their parts;
// this lesson is the common ground.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;
const G = 9.81;
const rad = (d) => (d * Math.PI) / 180;

// A projectile at 30 m/s: height against horizontal distance, launched at θ.
const path = (deg) => (x) => {
  const t = x / (30 * Math.cos(rad(deg)));
  const y = 30 * Math.sin(rad(deg)) * t - 0.5 * G * t * t;
  return y >= -1e-9 ? Math.max(0, y) : 0;
};

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
      body: [
        r`**Kinematics** describes motion without asking what causes it. Displacement is the change of position (a vector), velocity its rate of change, acceleration the rate of change of velocity. With constant acceleration three equations cover everything: $v = v_0 + at$, $x = v_0t + \frac12at^2$, $v^2 = v_0^2 + 2ax$. A body falling freely near the earth accelerates at $g = 9.81$ m/s² downward.`,
        r`A **projectile** moves at constant speed sideways and as a free fall vertically, tracing a parabola. Launched at speed $v_0$ and angle θ over level ground it flies for $T = \frac{2v_0\sin\theta}{g}$, rises to $H = \frac{v_0^2\sin^2\theta}{2g}$ and lands $R = \frac{v_0^2\sin2\theta}{g}$ away, farthest at 45°, and equally far at angles the same distance either side of 45°:`,
        {
          type: 'plot',
          alt: 'Two projectile paths at 30 m per second: launched at 40 degrees, solid, rising to 18.95 m, and at 50 degrees, dashed, rising higher to 26.9 m; both land 90.35 m away.',
          caption: 'At 30 m/s, 40° (solid) and 50° (dashed) land at the same 90.35 m; the steeper path climbs higher.',
          x: [0, 95],
          y: [0, 34],
          xLabel: 'x (m)',
          yLabel: 'y (m)',
          series: [
            { f: path(40), label: '40°', area: true },
            { f: path(50), label: '50°', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`Velocities add as vectors: the velocity of A relative to B is $\vec v_A - \vec v_B$. Average speed uses the distance travelled; average velocity, the displacement.`,
      ],
      keyIdeas: [
        r`Constant acceleration: $v = v_0 + at$, $x = v_0t + \frac12at^2$, $v^2 = v_0^2 + 2ax$ (the cards are in Engineering Mechanics).`,
        r`Free fall from rest: $h = \frac12gt^2$, $v = \sqrt{2gh}$. Projectiles: $T = \frac{2v_0\sin\theta}{g}$, $H = \frac{v_0^2\sin^2\theta}{2g}$, $R = \frac{v_0^2\sin2\theta}{g}$.`,
        r`Relative velocity: $\vec v_{A/B} = \vec v_A - \vec v_B$. Average speed uses the path; average velocity, the displacement.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A drop and a throw',
          problem: r`A stone is dropped from 45 m. When does it land, and how fast? A ball is thrown at 30 m/s, 40° above level ground: find its time of flight and greatest height.`,
          steps: [
            r`$t = \sqrt{\frac{2 \times 45}{9.81}} = 3.03$ s; $v = 9.81 \times 3.03 = 29.7$ m/s.`,
            r`$T = \frac{2 \times 30\sin40°}{9.81} = 3.93$ s; $H = \frac{(30\sin40°)^2}{2 \times 9.81} = 18.95$ m.`,
          ],
          answer: r`3.03 s, 29.7 m/s; 3.93 s, 18.95 m.`,
        },
        {
          level: 'board',
          title: 'Range',
          problem: r`How far does the 30 m/s ball land at 40°? What is the greatest range at that speed, and at what angle?`,
          steps: [
            r`$R = \frac{30^2\sin80°}{9.81} = 90.35$ m.`,
            r`Greatest at 45°: $\frac{30^2}{9.81} = 91.74$ m.`,
          ],
          answer: r`90.35 m; 91.74 m at 45°.`,
        },
      ],
      traps: [
        r`At the top of a projectile's path the speed is not zero; only the vertical part is.`,
        r`Use the launch SPEED's components: horizontal $v_0\cos\theta$, vertical $v_0\sin\theta$.`,
      ],
      check: [
        { q: r`What is the acceleration of a projectile at the top of its path?`, a: r`$g$, downward: it never changes.` },
        { q: r`Which angle pairs give the same range?`, a: r`Complementary ones, such as 30° and 60°.` },
      ],
    },
    {
      name: 'Dynamics',
      inShort: r`Forces and the motion they cause, including gravitation and orbits.`,
      body: [
        r`**Newton's laws**: a body keeps its velocity unless a net force acts (first); the net force equals mass times acceleration, $\sum F = ma$, component by component (second); every force has an equal and opposite reaction on the other body (third). Weight is $W = mg$; in a lift accelerating upward at a, a scale reads $m(g + a)$.`,
        r`**Gravitation** pulls every two masses together, $F = \frac{Gm_1m_2}{r^2}$, so g falls with height as $g\left(\frac{R}{R + h}\right)^2$:`,
        {
          type: 'plot',
          alt: 'The acceleration of gravity against height above the earth from 0 to 2000 km: 9.81 at the surface, 8.69 at 400 km, falling to 5.68 at 2000 km.',
          caption: 'g falls with height: 8.69 m/s² at 400 km, where the space station flies.',
          x: [0, 2000],
          y: [0, 11],
          xLabel: 'h (km)',
          yLabel: 'g (m/s²)',
          series: [{ f: (h) => G * (6371 / (6371 + h)) ** 2, label: 'g', area: true }],
          marks: [{ x: 400, label: '400 km' }],
        },
        r`A satellite in a circular orbit falls around the earth: gravity supplies the centripetal force, so $v = \sqrt{\frac{GM}{r}}$ and $T^2 = \frac{4\pi^2r^3}{GM}$ (Kepler). To escape altogether needs $\sqrt{\frac{2GM}{R}}$.`,
      ],
      keyIdeas: [
        r`$\sum F = ma$; weight $W = mg$. In a lift accelerating up at $a$, a scale reads $m(g + a)$.`,
        r`Gravitation $F = \frac{Gm_1m_2}{r^2}$; at height $h$, $g_h = g\left(\frac{R}{R + h}\right)^2$.`,
        r`Circular orbit $v = \sqrt{\frac{GM}{r}}$, escape $\sqrt{\frac{2GM}{R}}$, Kepler $T^2 = \frac{4\pi^2r^3}{GM}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An orbit and a lift',
          problem: r`A satellite circles 400 km above the Earth ($GM = 3.986 \times 10^{14}$ m³/s², $R = 6371$ km). Find its speed and period. A 60 kg person rides a lift accelerating up at 2 m/s²: what does the scale read?`,
          steps: [
            r`$r = 6.771 \times 10^6$ m: $v = \sqrt{\frac{3.986 \times 10^{14}}{6.771 \times 10^6}} = 7.67$ km/s.`,
            r`$T = \frac{2\pi r}{v} = 5545$ s $= 92.4$ min.`,
            r`Scale: $60(9.81 + 2) = 708.6$ N.`,
          ],
          answer: r`7.67 km/s; 92.4 min; 708.6 N.`,
        },
        {
          level: 'board',
          title: 'Gravity up there, and escaping',
          problem: r`Find g at 400 km and the earth's escape velocity.`,
          steps: [
            r`$g = 9.81\left(\frac{6371}{6771}\right)^2 = 8.69$ m/s².`,
            r`$v_e = \sqrt{\frac{2 \times 3.986 \times 10^{14}}{6.371 \times 10^6}} = 11.19$ km/s.`,
          ],
          answer: r`8.69 m/s²; 11.19 km/s.`,
        },
      ],
      traps: [
        r`Measure $r$ from the Earth's centre, not from its surface.`,
        r`Astronauts in orbit are not weightless for lack of gravity: they are falling with their craft.`,
      ],
      check: [
        { q: r`What does Newton's third law say?`, a: r`Every force has an equal and opposite force acting on the other body.` },
        { q: r`By how much does escape velocity exceed circular-orbit speed at the same radius?`, a: r`A factor of $\sqrt2$.` },
      ],
    },
    {
      name: 'Work, Energy and Power',
      inShort: r`Energy changes form but is never lost; work is how forces move it.`,
      body: [
        r`A force does **work** $W = Fd\cos\theta$ when it moves its point of application. The net work on a body equals its change in **kinetic energy** $\frac12mv^2$ (the work–energy theorem). Gravity and springs store work as **potential energy**, mgh and $\frac12kx^2$; without friction, kinetic plus potential stays constant, trading one for the other:`,
        {
          type: 'plot',
          alt: 'Energy of a 1 kg block sliding from rest down a frictionless 5 m slide, against the height it has dropped: potential energy falling from 49 J to zero, kinetic energy rising from zero to 49 J, and their total, dashed, constant at 49 J.',
          caption: 'Sliding down 5 m: potential energy (starting at 49 J) turns into kinetic (starting at zero); their total (dashed) stays 49 J per kilogram.',
          x: [0, 5],
          y: [0, 62],
          xLabel: 'height dropped (m)',
          yLabel: 'E (J/kg)',
          series: [
            { f: (d) => G * (5 - d), label: 'potential' },
            { f: (d) => G * d, label: 'kinetic', colour: colourOf(1) },
            { f: () => G * 5, label: 'total', dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`**Power** is the rate of doing work, $P = \frac{W}{t} = Fv$, in watts (1 hp = 746 W). Efficiency is output over input, and multiplies along a chain of machines.`,
      ],
      keyIdeas: [
        r`Work-energy theorem: $W_{\text{net}} = \Delta KE$.`,
        r`Without friction, $KE + PE$ is constant; spring energy $\frac12kx^2$.`,
        r`Power $P = \frac{W}{t} = Fv$; efficiency $\frac{\text{output}}{\text{input}}$, multiplying along a chain.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A slide and a spring',
          problem: r`A block slides from rest down a frictionless slide 5 m high. How fast is it at the bottom? A spring with $k = 400$ N/m is compressed 15 cm: how much energy does it hold?`,
          steps: [
            r`$v = \sqrt{2 \times 9.81 \times 5} = 9.90$ m/s, whatever the slide's shape.`,
            r`Spring: $\frac12 \times 400 \times 0.15^2 = 4.5$ J.`,
          ],
          answer: r`9.90 m/s; 4.5 J.`,
        },
        {
          level: 'board',
          title: 'Friction and power',
          problem: r`A 2 kg block on a rough 5 m slide reaches the bottom at 8 m/s. How much work did friction do? A hoist lifts 500 kg through 10 m in 20 s: find its power in kW and hp.`,
          steps: [
            r`$mgh - \frac12mv^2 = 2 \times 9.81 \times 5 - \frac12 \times 2 \times 8^2 = 98.1 - 64 = 34.1$ J.`,
            r`$P = \frac{500 \times 9.81 \times 10}{20} = 2453$ W $= 2.45$ kW $= 3.29$ hp.`,
          ],
          answer: r`34.1 J; 2.45 kW, 3.29 hp.`,
        },
      ],
      traps: [
        r`Friction turns mechanical energy into heat: then $KE_1 + PE_1 = KE_2 + PE_2 + W_f$.`,
        r`A force at right angles to the motion does NO work.`,
      ],
      check: [
        { q: r`A car doubles its speed. What happens to its kinetic energy?`, a: r`It quadruples.` },
        { q: r`What is the power of a 2000 N force moving at 3 m/s?`, a: r`6000 W.` },
      ],
    },
    {
      name: 'Impulse and Momentum',
      inShort: r`Momentum is conserved in every collision; kinetic energy only in elastic ones.`,
      body: [
        r`**Momentum** $p = mv$ is a vector. A force acting for a time gives an **impulse**, $\int F\,dt$, equal to the change of momentum: the area under the force–time curve. A short, hard blow and a long, soft push can give the same impulse:`,
        {
          type: 'plot',
          alt: 'The force on a 0.2 kg ball during a 10 ms bounce, rising in a straight line to 2000 N at 5 ms and falling back to zero; the area under it, the impulse, is 10 newton seconds, the same as an average 1000 N, dashed.',
          caption: 'A bounce: the area under the force (10 N·s) equals the change of momentum; an average of 1000 N (dashed) gives the same.',
          x: [0, 12],
          y: [0, 2300],
          xLabel: 't (ms)',
          yLabel: 'F (N)',
          series: [
            { f: (t) => (t <= 5 ? 400 * t : t <= 10 ? 400 * (10 - t) : 0), label: 'F', area: true },
            { f: (t) => (t <= 10 ? 1000 : 0), label: 'average', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`When no outside force acts, total momentum is **conserved**, in every collision. Kinetic energy is conserved only in an **elastic** collision; in a perfectly inelastic one the bodies stick. The **coefficient of restitution** $e = \frac{v_2' - v_1'}{v_1 - v_2}$ runs from 0 (stick) to 1 (elastic); a ball dropped from h rebounds to $e^2h$.`,
      ],
      keyIdeas: [
        r`Impulse $F\Delta t = \Delta p$; total momentum is conserved when no outside force acts.`,
        r`Stuck together: $v' = \frac{m_1v_1 + m_2v_2}{m_1 + m_2}$. Elastic: both momentum and energy conserved; equal masses swap velocities.`,
        r`Restitution $e = \frac{v_2' - v_1'}{v_1 - v_2}$; a dropped ball rebounds to $e^2h$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Elastic and sticking',
          problem: r`A 2 kg cart at 5 m/s meets a 3 kg cart moving at −1 m/s. Find their velocities if the collision is elastic, and if they stick.`,
          steps: [
            r`Elastic: $v_1' = \frac{2 - 3}{5} \times 5 + \frac{2 \times 3}{5} \times (-1) = -2.2$ m/s; $v_2' = \frac{2 \times 2}{5} \times 5 + \frac{3 - 2}{5} \times (-1) = 3.8$ m/s.`,
            r`Check: momentum $2 \times 5 + 3 \times (-1) = 7$ before, $2(-2.2) + 3(3.8) = 7$ after.`,
            r`Stuck: $\frac{10 - 3}{5} = 1.4$ m/s.`,
          ],
          answer: r`−2.2 and 3.8 m/s; 1.4 m/s together.`,
        },
        {
          level: 'board',
          title: 'A bounce and a rebound',
          problem: r`A 0.2 kg ball hits a wall at 25 m/s and leaves at 25 m/s, in contact for 10 ms. Find the impulse and the average force. A ball dropped from 2 m rebounds to 1.28 m: find e.`,
          steps: [
            r`$\Delta p = 0.2(25 - (-25)) = 10$ N·s; $F = \frac{10}{0.01} = 1000$ N.`,
            r`$e = \sqrt{\frac{1.28}{2}} = 0.8$.`,
          ],
          answer: r`10 N·s; 1000 N; 0.8.`,
        },
      ],
      traps: [
        r`Velocity has a sign: a body moving the other way enters as negative.`,
        r`A rebound REVERSES the velocity: the change is the SUM of the speeds.`,
      ],
      check: [
        { q: r`What is conserved in every collision without outside forces?`, a: r`Momentum.` },
        { q: r`What is e for a perfectly inelastic collision?`, a: r`0.` },
      ],
    },
    {
      name: 'Rotation',
      inShort: r`Turning motion: the rotational versions of displacement, velocity, force, mass and momentum.`,
      body: [
        r`Every linear quantity has a rotational twin: angle θ, angular velocity ω, angular acceleration α, torque $\tau = Fr\sin\theta$, **moment of inertia** I (how mass is spread about the axis), and angular momentum $L = I\omega$. Newton's law becomes $\tau = I\alpha$, kinetic energy $\frac12I\omega^2$.`,
        r`| Body (axis through centre) | I |
|---|---|
| Thin ring or hoop | $mr^2$ |
| Solid disc or cylinder | $\frac12mr^2$ |
| Solid sphere | $\frac25mr^2$ |
| Rod, about its centre | $\frac{1}{12}mL^2$ |
| Any axis parallel, distance d | $I_{cm} + md^2$ |`,
        r`A body that **rolls** carries both kinds of kinetic energy, so the more of its mass sits far from the axis, the slower it rolls down a slope: $v = \sqrt{\frac{2gh}{1 + I/(mr^2)}}$.`,
        {
          type: 'plot',
          alt: 'Speed at the bottom of a slope against its height, for a sphere, a disc and a ring rolling from rest: the sphere fastest, the ring slowest; from 2 m the disc reaches 5.11 m per second and the ring 4.43.',
          caption: 'Rolling down a slope: sphere fastest, then disc (5.11 m/s from 2 m), ring slowest (4.43 m/s).',
          x: [0, 2.5],
          y: [0, 7],
          xLabel: 'h (m)',
          yLabel: 'v (m/s)',
          series: [
            { f: (h) => Math.sqrt((2 * G * h) / 1.4), label: 'sphere' },
            { f: (h) => Math.sqrt((2 * G * h) / 1.5), label: 'disc', colour: colourOf(1) },
            { f: (h) => Math.sqrt((2 * G * h) / 2), label: 'ring', dashed: true, colour: colourOf(2) },
          ],
          marks: [{ x: 2, label: '2 m' }],
        },
      ],
      keyIdeas: [
        r`$\omega = \omega_0 + \alpha t$ and the rest; $v = r\omega$, $a_t = r\alpha$; rpm to rad/s: $\times\frac{2\pi}{60}$.`,
        r`$\tau = I\alpha$; $I$ for rod, disc, ring, sphere; $I = I_{cm} + Md^2$.`,
        r`$KE = \frac12I\omega^2$; rolling adds $\frac12mv^2$; $L = I\omega$ is conserved with no outside torque.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Disc against ring',
          problem: r`A disc and a ring roll from rest down a slope 2 m high. Which is faster at the bottom, and by how much?`,
          steps: [
            r`$v = \sqrt{\frac{2gh}{1 + I/(mr^2)}}$. Disc ($\frac12$): $\sqrt{\frac{39.24}{1.5}} = 5.11$ m/s.`,
            r`Ring (1): $\sqrt{\frac{39.24}{2}} = 4.43$ m/s.`,
          ],
          answer: r`The disc, 5.11 against 4.43 m/s: less of its energy goes into turning.`,
        },
        {
          level: 'board',
          title: 'A flywheel',
          problem: r`A solid disc flywheel of 50 kg and 0.4 m radius turns at 1200 rpm. Find its moment of inertia and kinetic energy, and the torque that stops it in 10 s.`,
          steps: [
            r`$I = \frac12 \times 50 \times 0.4^2 = 4$ kg·m²; $\omega = 1200 \times \frac{2\pi}{60} = 125.7$ rad/s.`,
            r`$KE = \frac12 \times 4 \times 125.7^2 = 31.6$ kJ.`,
            r`$\alpha = \frac{125.7}{10} = 12.57$ rad/s²: $\tau = 4 \times 12.57 = 50.3$ N·m.`,
          ],
          answer: r`4 kg·m²; 31.6 kJ; 50.3 N·m.`,
        },
      ],
      traps: [
        r`Use radians in every rotational formula.`,
        r`The same mass farther from the axis has MORE inertia: a ring beats a disc.`,
      ],
      check: [
        { q: r`A spinning skater pulls in her arms. What happens to her spin, and why?`, a: r`It speeds up: I falls and angular momentum $I\omega$ is conserved.` },
        { q: r`What is the moment of inertia of a solid sphere?`, a: r`$\frac25mr^2$.` },
      ],
    },
    {
      name: 'Elasticity',
      inShort: r`How solids stretch, shear and squeeze under load.`,
      body: [
        r`Within the **elastic limit** a solid returns to its shape when unloaded, and strain is proportional to stress (Hooke's law). The constant of proportion depends on how it is loaded:`,
        r`| Loading | Stress | Strain | Modulus |
|---|---|---|---|
| Tension, compression | $\frac FA$ | $\frac{\Delta L}{L}$ | Young's $Y = \frac{FL}{A\Delta L}$ |
| Shear | $\frac{F}{A}$ along the face | angle γ | shear $G = \frac{\tau}{\gamma}$ |
| All-round pressure | Δp | $-\frac{\Delta V}{V}$ | bulk $K$ |`,
        r`For steel, Y is about 200 GPa: the stress–strain line rises steeply until the material yields:`,
        {
          type: 'plot',
          alt: 'Stress against strain for steel in its elastic range: a straight line of slope 200 GPa, reaching 250 MPa at a strain of 0.00125.',
          caption: 'Steel’s elastic line: 250 MPa at a strain of 0.00125 (Y = 200 GPa).',
          x: [0, 1.6],
          y: [0, 400],
          xLabel: 'strain (×10⁻³)',
          yLabel: 'stress (MPa)',
          series: [{ f: (e) => 200 * e, label: 'σ', area: true }],
          marks: [{ x: 1.25, label: '250 MPa' }],
        },
        r`The three moduli are linked through **Poisson's ratio** ν (sideways shrinkage over lengthwise stretch): $G = \frac{Y}{2(1 + \nu)}$. Springs in parallel add stiffness; in series they add flexibility. Design with stress and strain is Fundamentals of Deformable Bodies.`,
      ],
      keyIdeas: [
        r`Spring $F = kx$; springs in parallel add, in series add reciprocally.`,
        r`Young's modulus $Y = \frac{FL}{A\Delta L}$; shear modulus $G = \frac{\tau}{\gamma}$; bulk modulus $K = -\frac{\Delta p}{\Delta V/V}$.`,
        r`$G = \frac{Y}{2(1 + \nu)}$; design with stress and strain is in Fundamentals of Deformable Bodies.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A steel rod',
          problem: r`A steel rod ($Y = 200$ GPa) 2 m long with a 2 cm² cross-section carries 50 kN. Find the stress and the extension.`,
          steps: [
            r`Stress $\frac{50\,000}{2 \times 10^{-4}} = 250$ MPa.`,
            r`$\Delta L = \frac{50\,000 \times 2}{2 \times 10^{-4} \times 200 \times 10^9} = 2.5$ mm.`,
          ],
          answer: r`250 MPa; 2.5 mm.`,
        },
        {
          level: 'board',
          title: 'Shear modulus and springs',
          problem: r`Steel has Y = 200 GPa and Poisson's ratio 0.27. Find G. Springs of 300 and 600 N/m are joined: find the stiffness in series and in parallel.`,
          steps: [
            r`$G = \frac{200}{2(1.27)} = 78.74$ GPa.`,
            r`Series: $\frac{300 \times 600}{900} = 200$ N/m. Parallel: $900$ N/m.`,
          ],
          answer: r`78.74 GPa; 200 N/m; 900 N/m.`,
        },
      ],
      traps: [
        r`Convert cm² to m² ($\times10^{-4}$) and GPa to Pa ($\times10^9$) before dividing.`,
        r`Springs combine the OPPOSITE way to resistors.`,
      ],
      check: [
        { q: r`What does Hooke's law say?`, a: r`Within the elastic limit, strain is proportional to stress.` },
        { q: r`Which modulus describes squeezing on all sides?`, a: r`The bulk modulus.` },
      ],
    },
    {
      name: 'Oscillations and Waves',
      inShort: r`Vibrations and the waves that carry them.`,
      body: [
        r`**Simple harmonic motion** happens whenever the restoring force is proportional to displacement: $x = A\cos(\omega t + \phi)$. Its energy, $\frac12kA^2$, swaps between potential and kinetic twice each cycle:`,
        {
          type: 'plot',
          alt: 'Energy of a 0.5 kg mass on a 50 newton per metre spring swinging 10 cm, over 1.26 s: potential and kinetic energy each rising and falling twice per 0.628 s period, out of step, while their total, dashed, stays 0.25 J.',
          caption: 'SHM: potential and kinetic energy swap twice per 0.628 s period; the total (dashed) stays 0.25 J.',
          x: [0, 1.26],
          y: [0, 0.32],
          xLabel: 't (s)',
          yLabel: 'E (J)',
          series: [
            { f: (t) => 0.25 * Math.cos(10 * t) ** 2, label: 'potential' },
            { f: (t) => 0.25 * Math.sin(10 * t) ** 2, label: 'kinetic', colour: colourOf(1) },
            { f: () => 0.25, label: 'total', dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`A **wave** carries the vibration along. In a **transverse** wave (a string, light) the particles move across the direction of travel; in a **longitudinal** one (sound) along it. Speed, frequency and wavelength are tied by $v = f\lambda$, and the speed depends on the medium:`,
        r`| Medium | Wave speed |
|---|---|
| Stretched string | $\sqrt{\frac{T}{\mu}}$ (tension over mass per length) |
| Solid rod | $\sqrt{\frac{Y}{\rho}}$ |
| Liquid | $\sqrt{\frac{K}{\rho}}$ (bulk modulus) |
| Gas | $\sqrt{\frac{\gamma p}{\rho}} = \sqrt{\frac{\gamma RT}{M}}$ |`,
        r`Two equal waves travelling opposite ways make a **standing wave**; a string fixed at both ends vibrates in n segments at $f_n = \frac{nv}{2L}$, whole-number multiples of its fundamental.`,
      ],
      keyIdeas: [
        r`SHM: $x = A\cos(\omega t + \phi)$, $v_{max} = A\omega$, $a_{max} = A\omega^2$; spring $T = 2\pi\sqrt{\frac mk}$, pendulum $2\pi\sqrt{\frac Lg}$, physical pendulum $2\pi\sqrt{\frac{I}{mgd}}$.`,
        r`Energy $\frac12kA^2$, shared between kinetic and potential.`,
        r`$v = f\lambda$; on a string $v = \sqrt{\frac{F_T}{\mu}}$; standing waves $f_n = \frac{nv}{2L}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A mass on a spring',
          problem: r`A 0.5 kg mass on a 50 N/m spring is pulled 10 cm and let go. Find ω, the period, the greatest speed and the energy.`,
          steps: [
            r`$\omega = \sqrt{\frac{50}{0.5}} = 10$ rad/s; $T = \frac{2\pi}{10} = 0.628$ s.`,
            r`$v_{max} = 0.1 \times 10 = 1$ m/s; $E = \frac12 \times 50 \times 0.1^2 = 0.25$ J.`,
          ],
          answer: r`10 rad/s; 0.628 s; 1 m/s; 0.25 J.`,
        },
        {
          level: 'board',
          title: 'A pendulum and a string',
          problem: r`Find the period of a 2.5 m pendulum. A string vibrates in 4 segments at 360 Hz: at what frequency does it vibrate in 3? A wire under 800 N has 0.008 kg/m: find its wave speed.`,
          steps: [
            r`$T = 2\pi\sqrt{\frac{2.5}{9.81}} = 3.17$ s.`,
            r`Fundamental $\frac{360}{4} = 90$ Hz, so 3 segments: 270 Hz.`,
            r`$v = \sqrt{\frac{800}{0.008}} = 316.2$ m/s.`,
          ],
          answer: r`3.17 s; 270 Hz; 316.2 m/s.`,
        },
      ],
      traps: [
        r`The pendulum's period ignores mass; the spring's ignores gravity.`,
        r`Segments are harmonics: n segments vibrate at n times the fundamental.`,
      ],
      check: [
        { q: r`What kind of wave is sound in air?`, a: r`Longitudinal (compressional).` },
        { q: r`A pendulum is made four times longer. What happens to its period?`, a: r`It doubles.` },
      ],
    },
    {
      name: 'Sound',
      inShort: r`Sound waves in air: speed, loudness, pitch shifts and resonance.`,
      body: [
        r`**Sound** is a longitudinal wave; people hear about 20 Hz to 20 000 Hz. In air it travels at 331 m/s at 0 °C, about 0.6 m/s faster for each degree, or exactly as $\sqrt{T}$ in kelvin. **Intensity** (W/m²) falls as $\frac{1}{r^2}$ from a source and grows with the square of the amplitude; its **level** in decibels is $10\log\frac{I}{10^{-12}}$, so doubling the distance loses 6 dB and n equal sources add $10\log n$.`,
        r`A moving source or listener shifts the pitch (**Doppler effect**), $f' = f\frac{v \pm v_o}{v \mp v_s}$, choosing the signs that RAISE the pitch when they approach:`,
        {
          type: 'plot',
          alt: 'The pitch heard from a 500 Hz siren against its speed from 0 to 100 m per second: rising when it approaches, to 548 Hz at 30 m per second, and falling when it recedes, to 460 Hz.',
          caption: 'A 500 Hz siren: 548 Hz approaching at 30 m/s (solid), 460 Hz receding (dashed).',
          x: [0, 100],
          y: [350, 750],
          xLabel: 'source speed (m/s)',
          yLabel: 'f (Hz)',
          series: [
            { f: (v) => (500 * 343) / (343 - v), label: 'approaching' },
            { f: (v) => (500 * 343) / (343 + v), label: 'receding', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 30, label: '30 m/s' }],
        },
        r`Air columns resonate: an open pipe at $\frac{nv}{2L}$, a pipe closed at one end only at odd multiples of $\frac{v}{4L}$. Two near frequencies **beat** at their difference.`,
      ],
      keyIdeas: [
        r`$v \approx 331 + 0.6T_C$ m/s (343 at 20 °C), or $331\sqrt{\frac{T}{273}}$.`,
        r`$\beta = 10\log\frac{I}{10^{-12}}$ dB; $I \propto \frac{1}{r^2}$, so doubling the distance loses 6 dB; n equal sources add $10\log n$.`,
        r`Doppler $f' = f\frac{v \pm v_o}{v \mp v_s}$; pipes: open $\frac{nv}{2L}$, closed $\frac{nv}{4L}$ (odd $n$); beats $\lvert f_1 - f_2\rvert$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A siren passing',
          problem: r`A 500 Hz siren approaches at 30 m/s, then moves away. What pitch does a standing listener hear ($v = 343$ m/s)?`,
          steps: [
            r`Approaching: $500 \times \frac{343}{343 - 30} = 547.9$ Hz.`,
            r`Receding: $500 \times \frac{343}{343 + 30} = 459.8$ Hz.`,
          ],
          answer: r`547.9 Hz; 459.8 Hz.`,
        },
        {
          level: 'board',
          title: 'A crowd, a listener driving away, a hot day',
          problem: r`One person talks at 40 dB. What level do 20 people make? A car drives at 25 m/s away from a stationary 600 Hz siren: what does the driver hear? What is the speed of sound at 30 °C?`,
          steps: [
            r`$40 + 10\log20 = 53.0$ dB.`,
            r`$600 \times \frac{343 - 25}{343} = 556.3$ Hz.`,
            r`$331 + 0.6 \times 30 = 349$ m/s.`,
          ],
          answer: r`53.0 dB; 556.3 Hz; 349 m/s.`,
        },
      ],
      traps: [
        r`Toward each other, the pitch goes UP: pick the signs that make it rise.`,
        r`Decibels of separate sources do not add: their intensities do.`,
      ],
      check: [
        { q: r`What is the highest frequency the human ear can hear?`, a: r`About 20 000 Hz.` },
        { q: r`Loudness (intensity) is proportional to the square of what?`, a: r`The amplitude.` },
      ],
    },
    {
      name: 'Fluids',
      inShort: r`Pressure and the behaviour of liquids and gases at rest and in slow motion.`,
      body: [
        r`**Density** is mass per volume; **pressure** is force per area, the same in all directions at a point in a fluid at rest. Pressure measured above the atmosphere is **gauge** pressure; absolute = atmospheric + gauge. **Pascal's principle**: pressure applied to an enclosed liquid is passed on undiminished, so a small force on a small piston lifts a large load on a large one. Hydrostatics, buoyancy and Bernoulli are in Fluid Mechanics.`,
        r`At small scales surfaces matter. **Surface tension** pulls a liquid up a narrow tube it wets, higher the finer the tube, $h = \frac{2\gamma\cos\theta}{\rho gr}$:`,
        {
          type: 'plot',
          alt: 'The capillary rise of water in a glass tube against the tube radius from 0.1 to 2 mm: 148 mm in a 0.1 mm tube, about 30 mm at 0.5 mm, and 7 mm at 2 mm, falling as one over the radius.',
          caption: 'Water rises about 30 mm in a 0.5 mm-radius tube, falling as 1/r.',
          x: [0.1, 2],
          y: [0, 160],
          xLabel: 'r (mm)',
          yLabel: 'h (mm)',
          series: [{ f: (r0) => ((2 * 0.0728) / (1000 * G * (r0 / 1000))) * 1000, label: 'h', area: true }],
          marks: [{ x: 0.5, label: '0.5 mm' }],
        },
        r`**Viscosity** η resists flow. A small sphere settling slowly feels Stokes' drag $6\pi\eta rv$, and falls at a steady **terminal velocity** $v_t = \frac{2r^2(\rho_s - \rho_f)g}{9\eta}$.`,
      ],
      keyIdeas: [
        r`$\rho = \frac mV$, $p = \frac FA$; absolute = atmospheric + gauge.`,
        r`Pascal: $\frac{F_1}{A_1} = \frac{F_2}{A_2}$, the hydraulic press. Hydrostatics, buoyancy and Bernoulli are in Fluid Mechanics.`,
        r`Capillary rise $h = \frac{2\gamma\cos\theta}{\rho gr}$; Stokes drag $6\pi\eta rv$ and terminal velocity.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A press and a capillary',
          problem: r`A hydraulic press has pistons of 10 cm² and 500 cm². What load does 200 N lift? How high does water rise in a 0.5 mm-radius tube ($\gamma = 0.0728$ N/m, $\theta = 0$)?`,
          steps: [
            r`$200 \times \frac{500}{10} = 10\,000$ N.`,
            r`$h = \frac{2 \times 0.0728}{1000 \times 9.81 \times 0.0005} = 0.0297$ m, about 30 mm.`,
          ],
          answer: r`10 000 N; about 30 mm.`,
        },
        {
          level: 'board',
          title: 'Terminal velocity and absolute pressure',
          problem: r`A steel ball (7800 kg/m³) of 1 mm radius sinks in glycerin (1260 kg/m³, η = 1.49 Pa·s). Find its terminal velocity. What is the absolute pressure 10 m under water?`,
          steps: [
            r`$v_t = \frac{2 \times (0.001)^2 \times (7800 - 1260) \times 9.81}{9 \times 1.49} = 9.57$ mm/s.`,
            r`$101.3 + 1000 \times 9.81 \times 10 / 1000 = 199.4$ kPa.`,
          ],
          answer: r`9.57 mm/s; 199.4 kPa.`,
        },
      ],
      traps: [
        r`The press multiplies force, not work: the large piston moves 50 times less.`,
        r`Gauge pressure leaves out the atmosphere: add 101.3 kPa for absolute.`,
      ],
      check: [
        { q: r`What does Pascal's principle state?`, a: r`Pressure applied to an enclosed fluid is transmitted undiminished throughout it.` },
        { q: r`A tube's radius is halved. What happens to the capillary rise?`, a: r`It doubles.` },
      ],
    },
    {
      name: 'Heat Transfer',
      inShort: r`Heat changing temperature or phase, and how it flows: conduction, convection, radiation.`,
      body: [
        r`Heat raises temperature, $Q = mc\Delta T$, or changes phase at constant temperature, $Q = mL$ (water: 334 kJ/kg to melt, 2257 kJ/kg to boil). Heating ice to steam therefore climbs in steps, flat while it melts and while it boils:`,
        {
          type: 'plot',
          alt: 'The temperature of 1 kg of water starting as ice at 0 degrees C against heat added: flat at 0 C for the first 334 kJ while it melts, rising to 100 C by 753 kJ, then flat at 100 C until 3010 kJ while it boils.',
          caption: '1 kg of ice to steam: 334 kJ to melt (flat), 419 kJ to warm, 2257 kJ to boil (flat): 3010 kJ in all.',
          x: [0, 3100],
          y: [0, 120],
          xLabel: 'heat added (kJ)',
          yLabel: 'T (°C)',
          series: [{ f: (q) => (q <= 334 ? 0 : q <= 334 + 418.6 ? (q - 334) / 4.186 : 100), label: 'T', area: true }],
          marks: [{ x: 334, label: 'melted' }, { x: 334 + 418.6, label: 'boiling' }],
        },
        r`**Kinetic theory** explains temperature: a gas molecule's average kinetic energy is $\frac32kT$, so molecules move at an rms speed $\sqrt{\frac{3kT}{m}} = \sqrt{\frac{3RT}{M}}$, and their pressure is $\frac13\rho v_{rms}^2$.`,
        r`Heat flows three ways. **Conduction** through a solid: $\frac{kA\Delta T}{L}$. **Convection**, carried by a moving fluid: $hA\Delta T$. **Radiation**, as electromagnetic waves even through a vacuum, by the **Stefan–Boltzmann law** $\varepsilon\sigma AT^4$ with $\sigma = 5.67 \times 10^{-8}$ W/m²K⁴; a black body has ε = 1.`,
      ],
      keyIdeas: [
        r`$Q = mc\Delta T$ and $Q = mL$ (water: 334 kJ/kg to melt, 2257 to boil); in a mixture, heat lost = heat gained.`,
        r`Conduction $\frac{kA\Delta T}{L}$, convection $hA\Delta T$, radiation $\varepsilon\sigma A(T_s^4 - T_{sur}^4)$ in kelvin.`,
        r`Kinetic theory: average KE $\frac32kT$; $v_{rms} = \sqrt{\frac{3RT}{M}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Ice to steam, and a wall',
          problem: r`How much heat turns 1 kg of ice at 0 °C into steam at 100 °C? How much heat passes a 10 m², 0.2 m brick wall ($k = 0.8$ W/m·K) with 25 °C across it?`,
          steps: [
            r`$334 + 4.186 \times 100 + 2257 = 3010$ kJ.`,
            r`Wall: $\frac{0.8 \times 10 \times 25}{0.2} = 1000$ W.`,
          ],
          answer: r`3010 kJ; 1000 W.`,
        },
        {
          level: 'board',
          title: 'Molecules and radiation',
          problem: r`Find the rms speed of nitrogen molecules (M = 0.028 kg/mol) at 20 °C, and a molecule's average kinetic energy at 300 K. A 1 m² black surface at 500 K faces surroundings at 300 K: what does it radiate net?`,
          steps: [
            r`$v_{rms} = \sqrt{\frac{3 \times 8.314 \times 293.15}{0.028}} = 511$ m/s.`,
            r`$\frac32 \times 1.381 \times 10^{-23} \times 300 = 6.21 \times 10^{-21}$ J.`,
            r`$5.67 \times 10^{-8}(500^4 - 300^4) = 3084$ W.`,
          ],
          answer: r`511 m/s; $6.21 \times 10^{-21}$ J; 3084 W.`,
        },
      ],
      traps: [
        r`Radiation needs kelvin; conduction and convection can use a Celsius difference.`,
        r`During melting or boiling the temperature does NOT change.`,
      ],
      check: [
        { q: r`Which mode of heat transfer works through a vacuum?`, a: r`Radiation.` },
        { q: r`What is the view factor of a black body to its surroundings, as usually taken?`, a: r`One.` },
      ],
    },
    {
      name: 'Electrostatics',
      inShort: r`Charges at rest: forces, fields, potential and capacitance.`,
      body: [
        r`Like charges repel and unlike attract, with **Coulomb's law** $F = k\frac{q_1q_2}{r^2}$, $k = 8.99 \times 10^9$ N·m²/C². The **electric field** is force per unit charge, $E = k\frac{q}{r^2}$ around a point charge; the **potential** is energy per unit charge, $V = k\frac qr$. Field falls as the square of distance, potential only as the distance:`,
        {
          type: 'plot',
          alt: 'Field and potential of a point charge against distance, each relative to its value at a reference distance of 1: the potential falls as one over r, the field, dashed, faster as one over r squared.',
          caption: 'Around a point charge: potential falls as 1/r (solid), field as 1/r² (dashed).',
          x: [0.5, 4],
          y: [0, 4.2],
          xLabel: 'r / r₀',
          yLabel: 'relative value',
          series: [
            { f: (x) => 1 / x, label: 'V' },
            { f: (x) => 1 / (x * x), label: 'E', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`A **capacitor** stores charge in proportion to voltage, $C = \frac QV$; parallel plates give $\frac{\kappa\varepsilon_0A}{d}$, and the stored energy is $\frac12CV^2$. Capacitors in parallel add; in series their reciprocals add.`,
      ],
      keyIdeas: [
        r`$F = k\frac{q_1q_2}{r^2}$, $E = k\frac{q}{r^2}$, $V = k\frac qr$, with $k = 8.99 \times 10^9$.`,
        r`$C = \frac QV = \frac{\kappa\varepsilon_0A}{d}$; energy $\frac12CV^2$.`,
        r`Capacitors in parallel add; in series add reciprocally.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two charges and a capacitor',
          problem: r`Find the force between +2 μC and −3 μC charges 0.3 m apart. A parallel-plate capacitor has 0.02 m² plates 1 mm apart: find C and its energy at 12 V.`,
          steps: [
            r`$F = \frac{8.99 \times 10^9 \times 6 \times 10^{-12}}{0.09} = 0.599$ N, attractive.`,
            r`$C = \frac{8.854 \times 10^{-12} \times 0.02}{0.001} = 177$ pF; $U = \frac12 \times 1.77 \times 10^{-10} \times 144 = 1.27 \times 10^{-8}$ J.`,
          ],
          answer: r`0.599 N; 177 pF; $1.27 \times 10^{-8}$ J.`,
        },
        {
          level: 'board',
          title: 'Capacitors combined',
          problem: r`2 µF and 3 µF capacitors are joined. Find the combination in series and in parallel, and the energy stored in the series pair at 100 V.`,
          steps: [
            r`Series: $\frac{2 \times 3}{5} = 1.2$ µF; parallel: 5 µF.`,
            r`$U = \frac12 \times 1.2 \times 10^{-6} \times 100^2 = 6$ mJ.`,
          ],
          answer: r`1.2 µF; 5 µF; 6 mJ.`,
        },
      ],
      traps: [
        r`Fields add as vectors; potentials add as plain numbers.`,
        r`Capacitors combine the OPPOSITE way to resistors.`,
      ],
      check: [
        { q: r`The distance between two charges is tripled. What happens to the force?`, a: r`It falls to a ninth.` },
        { q: r`What is the field inside a charged conductor at rest?`, a: r`Zero.` },
      ],
    },
    {
      name: 'Electricity',
      inShort: r`Current, resistance and power in DC circuits.`,
      body: [
        r`**Current** is the rate of flow of charge; **Ohm's law** $V = IR$ links it to voltage, and a conductor's resistance is $R = \frac{\rho L}{A}$, rising with temperature. Series resistances add; parallel ones add as reciprocals; **Kirchhoff's laws** balance currents at a junction and voltages around a loop. Power is $P = VI = I^2R = \frac{V^2}{R}$.`,
        r`A real source has **internal resistance** r, so its terminal voltage sags under load, $V_t = \varepsilon - Ir$. It delivers the most power when the load equals r (**maximum power transfer**), at only 50% efficiency:`,
        {
          type: 'plot',
          alt: 'The power a 12 V source with 0.5 ohm internal resistance delivers to a load, against the load resistance from 0 to 5 ohms: rising to a peak of 72 W at 0.5 ohm, then falling, 46 W at 2 ohms.',
          caption: 'A 12 V, 0.5 Ω source: the load gets most power, 72 W, when it too is 0.5 Ω.',
          x: [0, 5],
          y: [0, 80],
          xLabel: 'R_L (Ω)',
          yLabel: 'P (W)',
          series: [{ f: (R) => (144 * R) / (R + 0.5) ** 2, label: 'P', area: true }],
          marks: [{ x: 0.5, label: '0.5 Ω' }],
        },
        r`Charging a capacitor through a resistor takes time: its voltage rises with time constant $\tau = RC$.`,
      ],
      keyIdeas: [
        r`$V = IR$; $R = \frac{\rho L}{A}$, rising with temperature as $R_0[1 + \alpha\Delta T]$.`,
        r`Series resistances add; parallel ones add reciprocally. Kirchhoff: currents balance at a junction, voltages round a loop.`,
        r`$P = VI = I^2R = \frac{V^2}{R}$; a real source gives $V_t = \varepsilon - Ir$, most power into a load equal to r; RC circuits change with $\tau = RC$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A wire and a battery',
          problem: r`Find the resistance of 100 m of copper wire, 1 mm² ($\rho = 1.72 \times 10^{-8}$ Ω·m). A 12 V battery with 0.5 Ω inside drives a 2 Ω load: find the current and the terminal voltage.`,
          steps: [
            r`$R = \frac{1.72 \times 10^{-8} \times 100}{10^{-6}} = 1.72$ Ω.`,
            r`$I = \frac{12}{2.5} = 4.8$ A; $V_t = 12 - 4.8 \times 0.5 = 9.6$ V.`,
          ],
          answer: r`1.72 Ω; 4.8 A; 9.6 V.`,
        },
        {
          level: 'board',
          title: 'Maximum power',
          problem: r`What load takes the most power from the same battery, and how much? How much does the 2 Ω load take?`,
          steps: [
            r`$R_L = r = 0.5$ Ω: $I = \frac{12}{1} = 12$ A, $P = 12^2 \times 0.5 = 72$ W.`,
            r`2 Ω: $4.8^2 \times 2 = 46.1$ W.`,
          ],
          answer: r`0.5 Ω, 72 W; 46.1 W.`,
        },
      ],
      traps: [
        r`Two resistors in parallel are always less than the smaller one.`,
        r`Maximum POWER transfer is not maximum EFFICIENCY: half the power is lost inside.`,
      ],
      check: [
        { q: r`What is the terminal voltage of a battery delivering no current?`, a: r`Its emf.` },
        { q: r`Three 6 Ω resistors are in parallel. What is the total?`, a: r`2 Ω.` },
      ],
    },
    {
      name: 'Magnetism',
      inShort: r`Magnetic fields from currents, and their forces on charges and wires.`,
      body: [
        r`Moving charges make magnetic fields and feel them. A charge moving across a field feels $F = qvB\sin\theta$, at right angles to both, so it circles with radius $\frac{mv}{qB}$; a wire feels $F = BIL\sin\theta$. The force never does work: it changes direction, not speed.`,
        r`Currents make fields: around a long straight wire $B = \frac{\mu_0I}{2\pi r}$, falling with distance:`,
        {
          type: 'plot',
          alt: 'The magnetic field around a long straight wire carrying 10 A against distance from 1 to 20 cm: 200 microtesla at 1 cm, 40 at 5 cm, 10 at 20 cm.',
          caption: 'Around a wire carrying 10 A: 40 µT at 5 cm, falling as 1/r.',
          x: [1, 20],
          y: [0, 220],
          xLabel: 'r (cm)',
          yLabel: 'B (µT)',
          series: [{ f: (rc) => ((2e-7 * 10) / (rc / 100)) * 1e6, label: 'B', area: true }],
          marks: [{ x: 5, label: '5 cm' }],
        },
        r`Inside a long solenoid $B = \mu_0nI$; at a loop's centre $\frac{\mu_0I}{2R}$. Two parallel wires attract when their currents flow the same way, with $\frac{F}{L} = \frac{\mu_0I_1I_2}{2\pi d}$.`,
      ],
      keyIdeas: [
        r`$F = qvB\sin\theta$ on a charge, $F = BIL\sin\theta$ on a wire; a charge circles with $r = \frac{mv}{qB}$.`,
        r`Long wire $B = \frac{\mu_0I}{2\pi r}$; solenoid $\mu_0nI$; loop centre $\frac{\mu_0I}{2R}$.`,
        r`Parallel currents in the same direction attract: $\frac{F}{L} = \frac{\mu_0I_1I_2}{2\pi d}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A wire and an electron',
          problem: r`Find the field 5 cm from a wire carrying 10 A. An electron moves at $10^6$ m/s square to a 1 mT field: find the radius of its path.`,
          steps: [
            r`$B = \frac{4\pi \times 10^{-7} \times 10}{2\pi \times 0.05} = 40$ μT.`,
            r`$r = \frac{9.109 \times 10^{-31} \times 10^6}{1.602 \times 10^{-19} \times 10^{-3}} = 5.69$ mm.`,
          ],
          answer: r`40 µT; 5.69 mm.`,
        },
        {
          level: 'board',
          title: 'Two wires and a solenoid',
          problem: r`Parallel wires 10 cm apart carry 10 A and 20 A the same way. Find the force per metre. A solenoid has 1000 turns per metre and carries 2 A: find B inside.`,
          steps: [
            r`$\frac{F}{L} = \frac{2 \times 10^{-7} \times 10 \times 20}{0.1} = 4 \times 10^{-4}$ N/m, attracting.`,
            r`$B = 4\pi \times 10^{-7} \times 1000 \times 2 = 2.51$ mT.`,
          ],
          answer: r`$4 \times 10^{-4}$ N/m, attracting; 2.51 mT.`,
        },
      ],
      traps: [
        r`The magnetic force does no work: it changes direction, never speed.`,
        r`Opposite currents REPEL.`,
      ],
      check: [
        { q: r`What is the force on a charge moving parallel to a magnetic field?`, a: r`Zero.` },
        { q: r`What happens to a solenoid's field if its turns per metre double?`, a: r`It doubles.` },
      ],
    },
    {
      name: 'Electromagnetic Induction',
      inShort: r`A changing magnetic flux makes a voltage: generators and transformers.`,
      body: [
        r`**Faraday's law**: a changing magnetic flux through a circuit induces an emf, $\varepsilon = -N\frac{\Delta\Phi}{\Delta t}$, with $\Phi = BA\cos\theta$. **Lenz's law** (the minus sign) says the induced current opposes the change that made it. A rod moving through a field gives $BLv$.`,
        r`A coil turning in a field is an ac **generator**: its emf is a sine wave of peak $NBA\omega$ and rms $\frac{1}{\sqrt2}$ of that:`,
        {
          type: 'plot',
          alt: 'The emf of a 200-turn, 0.01 square metre coil turning at 60 Hz in 0.2 T, over two cycles: a sine wave of peak 150.8 V, with its rms value of 106.6 V marked.',
          caption: 'A coil turning at 60 Hz: a sine of 150.8 V peak, 106.6 V rms.',
          x: [0, 33.3],
          y: [-170, 170],
          xLabel: 't (ms)',
          yLabel: 'e (V)',
          series: [{ f: (t) => 200 * 0.2 * 0.01 * 2 * Math.PI * 60 * Math.sin(2 * Math.PI * 0.06 * t), label: 'e' }],
          marks: [{ y: (200 * 0.2 * 0.01 * 2 * Math.PI * 60) / Math.SQRT2, label: 'rms' }],
        },
        r`A **transformer** links two coils on one core: the voltage ratio equals the turns ratio, and the current ratio its inverse. An inductor stores $\frac12LI^2$.`,
      ],
      keyIdeas: [
        r`$\Phi = BA\cos\theta$; Faraday $\varepsilon = -N\frac{\Delta\Phi}{\Delta t}$, the minus sign being Lenz's law.`,
        r`Moving rod $\varepsilon = BLv$; rotating coil $\varepsilon_{max} = NBA\omega$.`,
        r`Transformer $\frac{V_s}{V_p} = \frac{N_s}{N_p} = \frac{I_p}{I_s}$; inductor energy $\frac12LI^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A generator and a transformer',
          problem: r`A 200-turn coil of 0.01 m² turns at 60 Hz in a 0.2 T field. Find the peak and rms EMF. A transformer with 1200 and 60 turns takes 240 V: what comes out?`,
          steps: [
            r`$\omega = 2\pi \times 60 = 377$ rad/s; $\varepsilon_{max} = 200 \times 0.2 \times 0.01 \times 377 = 150.8$ V, rms 106.6 V.`,
            r`Transformer: $240 \times \frac{60}{1200} = 12$ V.`,
          ],
          answer: r`150.8 V peak, 106.6 V rms; 12 V.`,
        },
        {
          level: 'board',
          title: 'A sliding rod',
          problem: r`A 0.5 m rod slides at 4 m/s across a 0.3 T field on rails joined by 2 Ω. Find the emf, the current and the force needed to keep it moving.`,
          steps: [
            r`$\varepsilon = 0.3 \times 0.5 \times 4 = 0.6$ V; $I = \frac{0.6}{2} = 0.3$ A.`,
            r`$F = BIL = 0.3 \times 0.3 \times 0.5 = 0.045$ N.`,
          ],
          answer: r`0.6 V; 0.3 A; 0.045 N.`,
        },
      ],
      traps: [
        r`A steady field through a still coil induces nothing: the flux must change.`,
        r`A transformer does not work on steady dc.`,
      ],
      check: [
        { q: r`What does Lenz's law say about the induced current?`, a: r`It flows so as to oppose the change in flux that causes it.` },
        { q: r`A generator's speed doubles. What happens to its emf?`, a: r`It doubles (and so does its frequency).` },
      ],
    },
    {
      name: 'Optics',
      inShort: r`Light: reflection, refraction, images, and interference.`,
      body: [
        r`Light travels at c in a vacuum and slower in matter, by the **refractive index** $n = \frac cv$ (water 1.33, glass 1.5, diamond 2.42). Crossing into another medium it bends by **Snell's law**, $n_1\sin\theta_1 = n_2\sin\theta_2$. Going from glass to air it bends away from the normal, until at the **critical angle** $\sin\theta_c = \frac{n_2}{n_1}$ it skims the surface; beyond that it is totally reflected:`,
        {
          type: 'plot',
          alt: 'The refraction angle in air against the angle of incidence in glass of index 1.5: rising faster and faster, reaching 90 degrees at the critical angle of 41.8 degrees; beyond it there is no refracted ray.',
          caption: 'Glass to air: the ray bends to 90° at the 41.8° critical angle; beyond it, total internal reflection.',
          x: [0, 41.81],
          y: [0, 95],
          xLabel: 'incidence in glass (°)',
          yLabel: 'refraction in air (°)',
          series: [{ f: (a) => (Math.asin(Math.min(1, 1.5 * Math.sin(rad(a)))) * 180) / Math.PI, label: 'θ₂', area: true }],
          marks: [{ y: 90, label: '90°' }],
        },
        r`Mirrors and thin lenses form images by $\frac1f = \frac{1}{d_o} + \frac{1}{d_i}$ with magnification $-\frac{d_i}{d_o}$ (for a mirror, $f = \frac R2$); a lens's focal length follows the **lensmaker's equation** $\frac1f = (n - 1)\left(\frac{1}{R_1} - \frac{1}{R_2}\right)$. Looking straight down into water, an object seems nearer: apparent depth = real depth ÷ n. Two slits make bright fringes at $d\sin\theta = m\lambda$.`,
      ],
      keyIdeas: [
        r`$n = \frac cv$; Snell $n_1\sin\theta_1 = n_2\sin\theta_2$; total internal reflection beyond $\sin\theta_c = \frac{n_2}{n_1}$.`,
        r`Mirrors and lenses: $\frac1f = \frac1{d_o} + \frac1{d_i}$, $M = -\frac{d_i}{d_o}$; mirror $f = \frac R2$; lensmaker; power in dioptres.`,
        r`Apparent depth $= \frac{\text{real}}{n}$; double slit: bright fringes at $d\sin\theta = m\lambda$, spaced $\frac{\lambda L}{d}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A lens and glass',
          problem: r`An object stands 30 cm from a converging lens of focal length 10 cm. Where is the image, and what is it like? What is the critical angle for glass ($n = 1.5$) in air?`,
          steps: [
            r`$\frac{1}{d_i} = \frac{1}{10} - \frac{1}{30}$, so $d_i = 15$ cm; $M = -\frac{15}{30} = -0.5$: real, inverted, half size.`,
            r`$\theta_c = \sin^{-1}\frac{1}{1.5} = 41.8°$.`,
          ],
          answer: r`15 cm, real, inverted, half size; 41.8°.`,
        },
        {
          level: 'board',
          title: 'Depth, diamond and a mirror',
          problem: r`A coin looks 2 m deep in water (n = 1.333): how deep is it? Find the critical angle of diamond (n = 2.42). An object is 30 cm from a concave mirror of radius 40 cm: find the image.`,
          steps: [
            r`Real depth $= 2 \times 1.333 = 2.67$ m.`,
            r`$\theta_c = \sin^{-1}\frac{1}{2.42} = 24.4°$.`,
            r`$f = 20$ cm: $\frac{1}{d_i} = \frac{1}{20} - \frac{1}{30}$, $d_i = 60$ cm; $M = -2$: real, inverted, twice the size.`,
          ],
          answer: r`2.67 m; 24.4°; 60 cm, inverted, magnified 2×.`,
        },
      ],
      traps: [
        r`Angles are measured from the normal, not the surface.`,
        r`Total internal reflection happens only going from the DENSER medium.`,
      ],
      check: [
        { q: r`Why does diamond sparkle?`, a: r`Its high index gives a small critical angle (24.4°), so light is totally reflected inside many times.` },
        { q: r`What is the focal length of a mirror of radius R?`, a: r`$\frac R2$.` },
      ],
    },
    {
      name: 'Atomic and Nuclear Physics',
      inShort: r`Photons, electrons as waves, atomic energy levels, and nuclear decay.`,
      body: [
        r`Light comes in **photons** of energy $E = hf = \frac{hc}{\lambda}$, about $\frac{1240}{\lambda(\text{nm})}$ eV. In the **photoelectric effect** a photon frees an electron if it carries more than the metal's work function, $KE_{max} = hf - \phi$: brighter light frees more electrons, bluer light faster ones. Matter has waves too, the **de Broglie** wavelength $\lambda = \frac{h}{mv}$. A hydrogen atom's electron sits on levels $E_n = -\frac{13.6}{n^2}$ eV.`,
        r`**Special relativity**: at speeds near c, moving clocks run slow and moving lengths shrink by the factor $\gamma = \frac{1}{\sqrt{1 - v^2/c^2}}$, and mass and energy are one, $E = mc^2$ (931.5 MeV per atomic mass unit).`,
        r`Unstable nuclei decay at random, but a sample halves every **half-life**: $N = N_0\left(\frac12\right)^{t/T_{1/2}}$:`,
        {
          type: 'plot',
          alt: 'The fraction of a radioactive sample remaining against time in half-lives from 0 to 5: halving each half-life, 50 percent after one, 12.5 percent after three, 3.1 percent after five.',
          caption: 'Radioactive decay: half remains after each half-life, 12.5% after three.',
          x: [0, 5],
          y: [0, 105],
          xLabel: 'half-lives',
          yLabel: 'remaining (%)',
          series: [{ f: (n) => 100 * 0.5 ** n, label: 'N', area: true }],
          marks: [{ x: 3, label: '3' }],
        },
      ],
      keyIdeas: [
        r`$E = hf = \frac{hc}{\lambda}$, about $\frac{1240}{\lambda(\text{nm})}$ eV; photoelectric $KE_{max} = hf - \phi$.`,
        r`de Broglie $\lambda = \frac hp$; hydrogen $E_n = -\frac{13.6}{n^2}$ eV; relativity $\gamma = \frac{1}{\sqrt{1 - v^2/c^2}}$.`,
        r`$E = mc^2$, 931.5 MeV per u; decay $N = N_0\left(\frac12\right)^{t/T_{1/2}}$, activity $\lambda N$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Photoelectrons and half-lives',
          problem: r`Light of 400 nm falls on a metal with work function 2.3 eV. Find the photon energy and the fastest electrons' energy. What fraction of carbon-14 remains after three half-lives?`,
          steps: [
            r`$E = \frac{1240}{400} = 3.10$ eV; $KE_{max} = 3.10 - 2.3 = 0.80$ eV.`,
            r`$\left(\frac12\right)^3 = 12.5\%$.`,
          ],
          answer: r`3.10 eV; 0.80 eV; 12.5%.`,
        },
        {
          level: 'board',
          title: 'An electron wave and a fast clock',
          problem: r`Find the de Broglie wavelength of an electron at $2 \times 10^5$ m/s, in ångströms. A clock moves at 0.8c: how long does 1 hour on it last for a stationary observer, and how long is its 1 m rod seen?`,
          steps: [
            r`$\lambda = \frac{6.626 \times 10^{-34}}{9.109 \times 10^{-31} \times 2 \times 10^5} = 3.64 \times 10^{-9}$ m $= 36.4$ Å.`,
            r`$\gamma = \frac{1}{\sqrt{1 - 0.64}} = 1.667$: 1 h lasts 1.667 h; the rod is $\frac{1}{1.667} = 0.6$ m.`,
          ],
          answer: r`36.4 Å; 1.667 h; 0.6 m.`,
        },
      ],
      traps: [
        r`Brighter light means more photoelectrons, not faster ones; only frequency sets their energy.`,
        r`Moving clocks run SLOW (the time grows); moving lengths SHRINK.`,
      ],
      check: [
        { q: r`What is the emission of electrons by light called?`, a: r`The photoelectric effect.` },
        { q: r`What is the energy of hydrogen's ground state?`, a: r`−13.6 eV.` },
      ],
    },
  ],
};
