// Library › Lessons › ESAS › Engineering Mechanics (2026-11-17): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Physics for Engineers covers
// the basic laws; this lesson applies them to structures and machines.
const r = String.raw;

export default {
  topic: 'Engineering Mechanics',
  subject: 'ESAS',
  overview: r`Statics and dynamics for engineers. Statics finds the forces in bodies that don't move: resultants, support reactions, trusses, cables, friction, and the centroids and moments of inertia that later carry into strength of materials. Dynamics follows bodies that do: straight and curved paths, projectiles, Newton's laws, energy, momentum and rotation. In every problem, draw the free-body diagram first, choose axes and a sign convention, and count unknowns against equations before solving.`,
  sources: [
    'Engineering Mechanics: Statics and Dynamics (Hibbeler)',
    'Vector Mechanics for Engineers (Beer, Johnston, Mazurek and Cornwell)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Force Systems and Resultants',
      inShort: r`Replacing several forces by one force (and a couple) that does the same job.`,
      keyIdeas: [
        r`Components $F\cos\theta_x$, …; resultant $R = \sqrt{(\sum F_x)^2 + (\sum F_y)^2}$, direction from the signs.`,
        r`Moment $M = Fd$ (perpendicular distance) or $xF_y - yF_x$; Varignon: the resultant's moment = the sum of the moments.`,
        r`A couple is the same about every point. A distributed load acts as its area through its centroid.`,
      ],
      example: {
        problem: r`Forces of 100 N at 30°, 150 N at 135° and 80 N at 250° act at a point. Find the resultant.`,
        solution: r`$\sum F_x = 86.60 - 106.07 - 27.36 = -46.83$ N; $\sum F_y = 50 + 106.07 - 75.18 = 80.89$ N. $R = 93.47$ N at $\tan^{-1}\frac{80.89}{-46.83} = 120.1^\circ$ (second quadrant).`,
      },
      traps: [r`A calculator's $\tan^{-1}$ gives $-59.9^\circ$ here: read the quadrant from the signs.`],
    },
    {
      name: 'Equilibrium',
      inShort: r`A body at rest: forces and moments both balance.`,
      keyIdeas: [
        r`$\sum F_x = 0$, $\sum F_y = 0$, $\sum M = 0$: three equations, three unknowns at most in a plane.`,
        r`Lami: three concurrent forces in balance, $\frac{F_1}{\sin\alpha} = \frac{F_2}{\sin\beta} = \frac{F_3}{\sin\gamma}$.`,
        r`Beam reactions: $R_A = \frac{Pb}{L}$, $R_B = \frac{Pa}{L}$; take moments about a support.`,
      ],
      example: {
        problem: r`A 1000 N weight hangs from two cables at 30° and 45° above the horizontal. Find the tensions.`,
        solution: r`$T_1\cos30^\circ = T_2\cos45^\circ$ and $T_1\sin30^\circ + T_2\sin45^\circ = 1000$. So $T_1 = 732.1$ N (the 30° cable) and $T_2 = 896.6$ N.`,
      },
      traps: [r`The steeper cable carries more.`],
    },
    {
      name: 'Trusses',
      inShort: r`Frameworks of two-force members: each member in pure tension or compression.`,
      keyIdeas: [
        r`Determinate when $m + r = 2j$.`,
        r`Method of joints: $\sum F_x = \sum F_y = 0$ at each joint, starting where two forces are unknown.`,
        r`Method of sections: cut through three members, take moments where two of them meet. Spot zero-force members first.`,
      ],
      example: {
        problem: r`A Pratt truss spans 9 m in three 3 m panels, 4 m high, with 10 kN at each inner bottom joint. Find the bottom-chord force in the middle panel.`,
        solution: r`By symmetry each support carries 10 kN. Cut through the middle panel and take moments about the top joint above the right inner load (6 m from the left support): $10(6) - 10(3) = 4F$, so $F = 7.5$ kN tension. The top chord carries 7.5 kN compression.`,
      },
      traps: [r`Assume tension everywhere; a negative answer is compression.`],
    },
    {
      name: 'Cables',
      inShort: r`Flexible cables: parabolic under a horizontally uniform load, catenary under their own weight.`,
      keyIdeas: [
        r`Parabolic: $H = \frac{wL^2}{8d}$, $T_{\max} = \sqrt{H^2 + \left(\frac{wL}{2}\right)^2}$, length $\approx L + \frac{8d^2}{3L}$.`,
        r`Catenary: $y = c\cosh\frac xc$, $s = c\sinh\frac xc$, $y^2 = s^2 + c^2$, $H = wc$, $T = wy$.`,
        r`The horizontal tension is the same along the whole cable.`,
      ],
      example: {
        problem: r`A suspension cable spans 100 m with a 10 m sag and carries 2 kN per horizontal metre. Find $H$, the greatest tension and the cable length.`,
        solution: r`$H = \frac{2(100)^2}{8(10)} = 250$ kN; $T_{\max} = \sqrt{250^2 + 100^2} = 269.3$ kN; length $\approx 100 + \frac{8(100)}{300} = 102.67$ m.`,
      },
      traps: [r`Parabolic is load per HORIZONTAL metre; catenary is weight per metre ALONG the cable.`],
    },
    {
      name: 'Friction',
      inShort: r`Dry friction resists sliding up to $\mu N$.`,
      keyIdeas: [
        r`$f \le \mu_sN$; once sliding, $f = \mu_kN$. Angle of friction $\tan\phi = \mu$.`,
        r`Push up a slope: $P = W(\sin\theta + \mu\cos\theta)$; slide down: $a = g(\sin\theta - \mu_k\cos\theta)$.`,
        r`Belts $\frac{T_1}{T_2} = e^{\mu\beta}$ ($\beta$ in radians); screws $M = Wr\tan(\phi + \alpha)$.`,
      ],
      example: {
        problem: r`What force along a 25° slope starts a 500 N block moving up it ($\mu = 0.3$)? A rope wraps half a turn round a post ($\mu = 0.25$): what is the tension ratio?`,
        solution: r`$P = 500(\sin25^\circ + 0.3\cos25^\circ) = 347.3$ N. Rope: $e^{0.25\pi} = 2.19$.`,
      },
      traps: [r`Friction opposes the IMPENDING motion: decide the direction before writing the equation.`],
    },
    {
      name: 'Centroids',
      inShort: r`The geometric centre of an area, line or volume.`,
      keyIdeas: [
        r`Composite: $\bar x = \frac{\sum A\bar x}{\sum A}$, holes negative; by integration $\frac{\int x\,dA}{\int dA}$.`,
        r`Triangle $\frac h3$ from the base; semicircle and quarter circle $\frac{4r}{3\pi}$; sector $\frac{2r\sin\alpha}{3\alpha}$.`,
        r`Pappus: $A = 2\pi\bar yL$, $V = 2\pi\bar yA$.`,
      ],
      example: {
        problem: r`A 6 × 4 rectangle (corner at the origin) has a 1-unit-radius hole centred at (4, 2). Find $\bar x$.`,
        solution: r`$\bar x = \frac{24(3) - \pi(4)}{24 - \pi} = \frac{72 - 12.57}{20.86} = 2.85$ (left of 3, since the hole is on the right). $\bar y = 2$ by symmetry.`,
      },
      traps: [r`Measure each part's centroid from the same reference axes.`],
    },
    {
      name: 'Moments of Inertia',
      inShort: r`Second moments of area: how a cross-section resists bending and twisting.`,
      keyIdeas: [
        r`Rectangle $\frac{bh^3}{12}$ about its centroid, $\frac{bh^3}{3}$ about its base; triangle $\frac{bh^3}{36}$; circle $\frac{\pi r^4}{4}$.`,
        r`Parallel axis $I = \bar I + Ad^2$, always from the centroidal axis.`,
        r`Polar $J = I_x + I_y$ ($\frac{\pi d^4}{32}$ for a shaft); radius of gyration $k = \sqrt{\frac IA}$.`,
      ],
      example: {
        problem: r`A 200 mm × 300 mm rectangle (300 mm tall). Find $I$ about its horizontal centroidal axis and about its base, and $k$.`,
        solution: r`$\bar I = \frac{0.2(0.3)^3}{12} = 4.5 \times 10^{-4}$ m⁴. Base: $4.5 \times 10^{-4} + 0.06(0.15)^2 = 1.8 \times 10^{-3}$ m⁴. $k = \frac{0.3}{\sqrt{12}} = 86.6$ mm.`,
      },
      traps: [r`The dimension perpendicular to the axis is the one cubed.`],
    },
    {
      name: 'Rectilinear Motion',
      inShort: r`Motion along a straight line, with constant or varying acceleration.`,
      keyIdeas: [
        r`Constant $a$: $v = u + at$, $s = ut + \frac12at^2$, $v^2 = u^2 + 2as$.`,
        r`Varying $a$: $v = \frac{dx}{dt}$, $a = \frac{dv}{dt} = v\frac{dv}{dx}$.`,
        r`Pulleys: the cable length is constant, so the velocities are linked. Stopping: $vt_r + \frac{v^2}{2a}$.`,
      ],
      example: {
        problem: r`A car at 25 m/s (90 km/h); the driver reacts in 1 s and brakes with $\mu = 0.7$. Find the stopping distance.`,
        solution: r`Reaction: 25 m. Braking: $\frac{25^2}{2(0.7)(9.81)} = 45.5$ m. Total 70.5 m.`,
      },
      traps: [r`Doubling the speed doubles the reaction distance but quadruples the braking distance.`],
    },
    {
      name: 'Projectile Motion',
      inShort: r`Constant horizontal velocity plus free fall.`,
      keyIdeas: [
        r`Range on level ground $\frac{v_0^2\sin2\theta}{g}$, greatest at 45°; $\theta$ and $90^\circ - \theta$ give the same range.`,
        r`Path $y = x\tan\theta - \frac{gx^2}{2v_0^2\cos^2\theta}$.`,
        r`From a height: solve $y_0 + v_0\sin\theta\,t - \frac12gt^2 = 0$ for $t$.`,
      ],
      example: {
        problem: r`A ball is thrown at 20 m/s, 35° above horizontal, from a 15 m cliff. When and how far out does it land?`,
        solution: r`$15 + 11.47t - 4.905t^2 = 0$ gives $t = 3.27$ s; $x = 20\cos35^\circ(3.27) = 53.6$ m.`,
      },
      traps: [r`The level-ground range formula fails when launch and landing heights differ.`],
    },
    {
      name: 'Curvilinear Motion',
      inShort: r`Motion along curves: speeding up along the path, turning across it.`,
      keyIdeas: [
        r`$a_t = \frac{dv}{dt}$, $a_n = \frac{v^2}{\rho}$.`,
        r`Flat curve $v_{\max} = \sqrt{\mu gr}$; banked $\tan\theta = \frac{v^2}{gr}$, with friction $v_{\max} = \sqrt{gr\tan(\theta + \phi)}$.`,
        r`Conical pendulum $T = 2\pi\sqrt{\frac{L\cos\theta}{g}}$; vertical circle needs $\sqrt{gr}$ at the top.`,
      ],
      example: {
        problem: r`A flat curve of 50 m radius has $\mu = 0.6$. Find the top speed. What bank angle of 15° suits without friction?`,
        solution: r`$\sqrt{0.6(9.81)(50)} = 17.2$ m/s (61.8 km/h). A 15° bank needs no friction at $\sqrt{9.81(50)\tan15^\circ} = 11.5$ m/s.`,
      },
      traps: [r`Mass cancels: every vehicle skids at the same speed on a given curve.`],
    },
    {
      name: "Newton's Laws",
      inShort: r`Forces causing acceleration, for single and connected bodies.`,
      keyIdeas: [
        r`$\sum F = ma$ on each body, with the same acceleration for bodies tied together.`,
        r`D'Alembert: add $-ma$ and solve as statics.`,
        r`Atwood $a = \frac{(m_1 - m_2)g}{m_1 + m_2}$, $T = \frac{2m_1m_2g}{m_1 + m_2}$.`,
      ],
      example: {
        problem: r`5 kg and 3 kg hang over a light frictionless pulley. Find the acceleration and the tension.`,
        solution: r`$a = \frac{2(9.81)}{8} = 2.45$ m/s²; $T = \frac{2(5)(3)(9.81)}{8} = 36.8$ N, between the two weights (29.4 and 49.1 N).`,
      },
      traps: [r`The tension is not the hanging weight once things accelerate.`],
    },
    {
      name: 'Work and Energy',
      inShort: r`Work changes kinetic energy; power is how fast.`,
      keyIdeas: [
        r`$W = \int F\,dx$ (area under the force curve); spring $\frac12k(x_2^2 - x_1^2)$.`,
        r`$T_1 + \sum U = T_2$; $P = Fv$; shaft $P = T\omega = \frac{2\pi NT}{60}$.`,
        r`Input power = output ÷ efficiency.`,
      ],
      example: {
        problem: r`A hoist lifts 1000 kg at 0.5 m/s with 80% efficiency. Find the motor power. What does a shaft carrying 40 N·m at 1750 rpm transmit?`,
        solution: r`$\frac{1000(9.81)(0.5)}{0.8} = 6.13$ kW. Shaft: $\frac{2\pi(1750)(40)}{60} = 7.33$ kW (9.8 hp).`,
      },
      traps: [r`rpm must become rad/s ($\times\frac{2\pi}{60}$) before $P = T\omega$.`],
    },
    {
      name: 'Impulse and Momentum',
      inShort: r`Force over time changes momentum; streams push by changing their momentum.`,
      keyIdeas: [
        r`$\int F\,dt = m(v_2 - v_1)$; collisions are in Physics for Engineers.`,
        r`Jet force $F = \rho Q(v_2 - v_1)$; stopped by a plate, $\rho Qv$; turned back, $2\rho Qv$.`,
        r`Recoil $V = \frac{mv}{M}$.`,
      ],
      example: {
        problem: r`A water jet of 2 L/s at 20 m/s hits a flat plate square on. Find the force.`,
        solution: r`$F = 1000(0.002)(20) = 40$ N. If a cup turned it straight back, $80$ N.`,
      },
      traps: [r`Use velocities RELATIVE to a moving plate, and the mass rate that actually reaches it.`],
    },
    {
      name: 'Rotation',
      inShort: r`Rigid bodies turning and rolling; flywheels.`,
      keyIdeas: [
        r`Rolling down a slope $a = \frac{g\sin\theta}{1 + k^2/r^2}$: sphere $\frac57$, cylinder $\frac23$, hoop $\frac12$ of $g\sin\theta$.`,
        r`Plane motion turns about an instant centre: $v = \omega r_{IC}$.`,
        r`Flywheel: $\Delta E = \frac12I(\omega_{\max}^2 - \omega_{\min}^2) = I\omega^2C_s$.`,
      ],
      example: {
        problem: r`A solid sphere rolls down a 20° slope. Find its acceleration. A flywheel with $I = 20$ kg·m² swings between 95 and 105 rad/s: how much energy does it exchange?`,
        solution: r`$a = \frac57(9.81)\sin20^\circ = 2.40$ m/s². $\Delta E = \frac12(20)(105^2 - 95^2) = 20$ kJ.`,
      },
      traps: [r`Rolling without slipping: the contact point is momentarily at rest, and the top moves at $2v$.`],
    },
  ],
};
