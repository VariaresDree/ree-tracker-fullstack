// Library › Lessons › ESAS › Engineering Mechanics
// (2026-11-17; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// mechanicsLesson.test.js. Coverage and problem styles cross-checked against a
// review center's engineering mechanics handout; the text, problems and figures
// are this app's own): written for the Philippine REE board, subtopic by
// subtopic in the syllabus's order. Physics for Engineers covers the basic
// laws; this lesson applies them to structures and machines.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;
const G = 9.81;
const rad = (d) => (d * Math.PI) / 180;

// The catenary with the same 100 m span and 10 m sag: c(cosh(50/c) − 1) = 10.
function catenaryC() {
  let lo = 50;
  let hi = 1000;
  for (let i = 0; i < 100; i++) {
    const c = (lo + hi) / 2;
    if (c * (Math.cosh(50 / c) - 1) > 10) lo = c; else hi = c;
  }
  return (lo + hi) / 2;
}
const CAT = catenaryC();

// The ball thrown at 20 m/s, 35° from a 15 m cliff.
const cliff = (x) => {
  const y = 15 + x * Math.tan(rad(35)) - (G * x * x) / (2 * 400 * Math.cos(rad(35)) ** 2);
  return Math.max(0, y);
};

// The elevator: 0.75 m/s² for 5 s, steady 12 s, stopping in 3 s.
const lift = (t) => (t <= 5 ? 0.75 * t : t <= 17 ? 3.75 : t <= 20 ? 3.75 * (1 - (t - 17) / 3) : 0);

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
      body: [
        r`**Mechanics** studies bodies at rest (**statics**) and in motion (**dynamics**). A system of forces can be replaced by a single **resultant** with the same effect. Resolve each force into components, add them, and recombine: $R = \sqrt{(\sum F_x)^2 + (\sum F_y)^2}$. Drawn tip to tail, the forces form a polygon that the resultant closes:`,
        {
          type: 'phasor',
          axes: false,
          alt: 'Three forces drawn tip to tail: 100 N at 30 degrees, then 150 N at 135 degrees, then 80 N at 250 degrees; the resultant, 93.5 N at 120 degrees, runs from the start of the first to the end of the last.',
          caption: '100 N at 30°, 150 N at 135° and 80 N at 250°, tip to tail: the resultant is 93.5 N at 120.1°.',
          vectors: [
            { name: 'F1', mag: 100, angle: 30, label: 'F₁' },
            { name: 'F2', mag: 150, angle: 135, from: 'F1', label: 'F₂' },
            { name: 'F3', mag: 80, angle: 250, from: 'F2', label: 'F₃' },
            { mag: 93.47, angle: 120.07, label: 'R', colour: 3 },
          ],
        },
        r`A force also turns: its **moment** about a point is $M = Fd$, with d the perpendicular distance (or $xF_y - yF_x$). **Varignon's theorem**: the moment of the resultant equals the sum of the moments of its parts. Two equal, opposite, parallel forces form a **couple**, whose moment is the same about every point. A distributed load acts as a single force equal to its area, through its centroid.`,
      ],
      keyIdeas: [
        r`Components $F\cos\theta_x$, …; resultant $R = \sqrt{(\sum F_x)^2 + (\sum F_y)^2}$, direction from the signs.`,
        r`Moment $M = Fd$ (perpendicular distance) or $xF_y - yF_x$; Varignon: the resultant's moment = the sum of the moments.`,
        r`A couple is the same about every point. A distributed load acts as its area through its centroid.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three forces',
          problem: r`Forces of 100 N at 30°, 150 N at 135° and 80 N at 250° act at a point. Find the resultant.`,
          steps: [
            r`$\sum F_x = 86.60 - 106.07 - 27.36 = -46.83$ N; $\sum F_y = 50 + 106.07 - 75.18 = 80.89$ N.`,
            r`$R = \sqrt{46.83^2 + 80.89^2} = 93.47$ N at $180° - \tan^{-1}\frac{80.89}{46.83} = 120.1°$ (second quadrant).`,
          ],
          answer: r`93.47 N at 120.1°.`,
        },
        {
          level: 'board',
          title: 'The angle between two forces',
          problem: r`Two 100 N forces have a resultant of 50 N. What angle lies between them?`,
          steps: [
            r`$R^2 = F_1^2 + F_2^2 + 2F_1F_2\cos\theta$: $2500 = 20\,000(1 + \cos\theta)$.`,
            r`$\cos\theta = -0.875$, so $\theta = 151.0°$.`,
          ],
          answer: r`151.0°.`,
        },
      ],
      traps: [
        r`A calculator's $\tan^{-1}$ gives $-59.9°$ here: read the quadrant from the signs.`,
        r`The law of cosines for a resultant uses $+2F_1F_2\cos\theta$, θ being the angle BETWEEN the forces.`,
      ],
      check: [
        { q: r`What is a couple's moment about a point 2 m away compared with its moment about its own centre?`, a: r`The same: a couple's moment is independent of the point.` },
        { q: r`Where does a uniformly distributed load act?`, a: r`At the middle of the loaded length, as one force equal to its total.` },
      ],
    },
    {
      name: 'Equilibrium',
      inShort: r`A body at rest: forces and moments both balance.`,
      body: [
        r`A body is in **equilibrium** when its resultant is zero. There are three ways to state it: graphically, the force polygon **closes**; directionally, three non-parallel forces in balance meet at **one point**; analytically, $\sum F_x = 0$, $\sum F_y = 0$, $\sum M = 0$. A weight hung from two cables shows all three:`,
        {
          type: 'phasor',
          axes: false,
          alt: 'The closed force triangle of a 1000 N weight hanging from cables at 30 and 45 degrees: the weight straight down, the 45 degree cable tension of 896.6 N up and right from its tip, and the 30 degree cable tension of 732.1 N back up and left to the start.',
          caption: 'A 1000 N weight on cables at 30° and 45°: the forces close a triangle, so T₁ = 732.1 N and T₂ = 896.6 N.',
          vectors: [
            { name: 'W', mag: 1000, angle: 270, label: 'W' },
            { name: 'T2', mag: 896.6, angle: 45, from: 'W', label: 'T₂', colour: 1 },
            { mag: 732.1, angle: 150, from: 'T2', label: 'T₁', colour: 2 },
          ],
        },
        r`Three concurrent forces in balance also obey **Lami's theorem**, $\frac{F_1}{\sin\alpha} = \frac{F_2}{\sin\beta} = \frac{F_3}{\sin\gamma}$, each angle being the one opposite its force. For a beam, take moments about one support to find the other reaction.`,
      ],
      keyIdeas: [
        r`$\sum F_x = 0$, $\sum F_y = 0$, $\sum M = 0$: three equations, three unknowns at most in a plane.`,
        r`Lami: three concurrent forces in balance, $\frac{F_1}{\sin\alpha} = \frac{F_2}{\sin\beta} = \frac{F_3}{\sin\gamma}$.`,
        r`Beam reactions: $R_A = \frac{Pb}{L}$, $R_B = \frac{Pa}{L}$; take moments about a support.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two cables',
          problem: r`A 1000 N weight hangs from two cables at 30° and 45° above the horizontal. Find the tensions.`,
          steps: [
            r`$T_1\cos30° = T_2\cos45°$ and $T_1\sin30° + T_2\sin45° = 1000$.`,
            r`So $T_1 = 732.1$ N (the 30° cable) and $T_2 = 896.6$ N.`,
          ],
          answer: r`732.1 N and 896.6 N.`,
        },
        {
          level: 'board',
          title: 'A weight pulled aside',
          problem: r`An 80 kg mass hangs from a rope and is pulled aside by a horizontal force until the rope makes 65° with the ceiling. Find the horizontal force and the rope tension.`,
          steps: [
            r`$W = 80 \times 9.81 = 784.8$ N. Vertically: $T\sin65° = 784.8$, so $T = 865.9$ N.`,
            r`Horizontally: $H = T\cos65° = 366.0$ N.`,
          ],
          answer: r`366.0 N; 865.9 N.`,
        },
      ],
      traps: [
        r`The steeper cable carries more.`,
        r`"Angle with the ceiling" is measured from the horizontal.`,
      ],
      check: [
        { q: r`What is the graphical condition for equilibrium?`, a: r`The force polygon closes.` },
        { q: r`Three non-parallel forces keep a body in equilibrium. What must be true of their lines of action?`, a: r`They meet at one point (concurrent).` },
      ],
    },
    {
      name: 'Trusses',
      inShort: r`Frameworks of two-force members: each member in pure tension or compression.`,
      body: [
        r`A **truss** is built of straight members pinned at their ends, loaded only at the joints, so every member is a **two-force member** in pure tension or compression. A plane truss is statically determinate when $m + r = 2j$ (members plus reactions equal twice the joints).`,
        r`| Method | How | Best for |
|---|---|---|
| Joints | $\sum F_x = \sum F_y = 0$ at each joint, starting where only two forces are unknown | every member |
| Sections | cut through at most three members; take moments about where two of them meet | one member in the middle |
| Zero-force members | at an unloaded joint of two non-collinear members, both are zero; of three with two collinear, the third is zero | spotting first |`,
        r`Assume every unknown member is in tension (pulling on the joint); a negative answer means compression.`,
      ],
      keyIdeas: [
        r`Determinate when $m + r = 2j$.`,
        r`Method of joints: $\sum F_x = \sum F_y = 0$ at each joint, starting where two forces are unknown.`,
        r`Method of sections: cut through three members, take moments where two of them meet. Spot zero-force members first.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A section through a Pratt truss',
          problem: r`A Pratt truss spans 9 m in three 3 m panels, 4 m high, with 10 kN at each inner bottom joint. Find the bottom-chord force in the middle panel.`,
          steps: [
            r`By symmetry each support carries 10 kN.`,
            r`Cut through the middle panel and take moments about the top joint above the right inner load (6 m from the left support): $10 \times 6 - 10 \times 3 = 4F$.`,
            r`$F = 7.5$ kN tension; the top chord carries 7.5 kN compression.`,
          ],
          answer: r`7.5 kN tension.`,
        },
        {
          level: 'board',
          title: 'The end joint',
          problem: r`In the same truss the end diagonal runs from the left support to the top joint 3 m along and 4 m up. Find its force and the first bottom-chord force by the method of joints.`,
          steps: [
            r`The diagonal is 5 m long. Vertically at the support: $\frac45F_d = 10$, so $F_d = 12.5$ kN, pushing on the joint: compression.`,
            r`Horizontally: chord $= \frac35 \times 12.5 = 7.5$ kN tension.`,
          ],
          answer: r`12.5 kN compression; 7.5 kN tension.`,
        },
      ],
      traps: [
        r`Assume tension everywhere; a negative answer is compression.`,
        r`A section may cut at most THREE unknown members.`,
      ],
      check: [
        { q: r`A plane truss has 9 members, 6 joints and 3 reactions. Is it determinate?`, a: r`Yes: $9 + 3 = 12 = 2 \times 6$.` },
        { q: r`Why does each truss member carry only tension or compression?`, a: r`It is pinned at both ends and loaded only there: a two-force member.` },
      ],
    },
    {
      name: 'Cables',
      inShort: r`Flexible cables: parabolic under a horizontally uniform load, catenary under their own weight.`,
      body: [
        r`A cable carries only tension, and takes the shape its load gives it. Under a load spread evenly **along the horizontal** (a suspension bridge deck) it hangs in a **parabola**; under its own weight spread **along its length** it hangs in a **catenary**. For a shallow sag the two are almost the same:`,
        {
          type: 'plot',
          alt: 'A cable spanning 100 m with a 10 m sag: the parabola and the catenary through the same supports and lowest point, almost indistinguishable.',
          caption: 'A 100 m span with 10 m sag: parabola (solid) and catenary (dashed) almost coincide.',
          x: [0, 100],
          y: [0, 14],
          xLabel: 'x (m)',
          yLabel: 'height above lowest (m)',
          series: [
            { f: (x) => (4 * 10 * (x - 50) ** 2) / 100 ** 2, label: 'parabola' },
            { f: (x) => CAT * (Math.cosh((x - 50) / CAT) - 1), label: 'catenary', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`The horizontal tension H is the same all along the cable, and the tension is greatest at the supports.`,
        r`| Parabolic (w per horizontal metre) | Catenary (w per metre of cable) |
|---|---|
| $H = \frac{wL^2}{8d}$ | $H = wc$ |
| $T_{max} = \sqrt{H^2 + \left(\frac{wL}{2}\right)^2}$ | $T = wy$ |
| length $S = L + \frac{8d^2}{3L} - \frac{32d^4}{5L^3}$ | $y^2 = s^2 + c^2$; $x = c\ln\frac{s + y}{c}$ |`,
      ],
      keyIdeas: [
        r`Parabolic: $H = \frac{wL^2}{8d}$, $T_{max} = \sqrt{H^2 + \left(\frac{wL}{2}\right)^2}$, length $\approx L + \frac{8d^2}{3L} - \frac{32d^4}{5L^3}$.`,
        r`Catenary: $y = c\cosh\frac xc$, $s = c\sinh\frac xc$, $y^2 = s^2 + c^2$, $H = wc$, $T = wy$.`,
        r`The horizontal tension is the same along the whole cable.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A suspension cable',
          problem: r`A suspension cable spans 100 m with a 10 m sag and carries 2 kN per horizontal metre. Find H, the greatest tension and the cable length.`,
          steps: [
            r`$H = \frac{2 \times 100^2}{8 \times 10} = 250$ kN.`,
            r`$T_{max} = \sqrt{250^2 + 100^2} = 269.3$ kN.`,
            r`$S = 100 + \frac{8 \times 10^2}{300} - \frac{32 \times 10^4}{5 \times 10^6} = 102.60$ m.`,
          ],
          answer: r`250 kN; 269.3 kN; 102.60 m.`,
        },
        {
          level: 'board',
          title: 'A catenary',
          problem: r`A cable weighing 20 N/m has 4 kN tension at its lowest point. At a point 10 m above the lowest, find the tension, the length of cable from the lowest point, and the horizontal distance.`,
          steps: [
            r`$c = \frac{H}{w} = \frac{4000}{20} = 200$ m; there $y = 210$ m, so $T = 20 \times 210 = 4.2$ kN.`,
            r`$s = \sqrt{210^2 - 200^2} = 64.03$ m.`,
            r`$x = 200\ln\frac{64.03 + 210}{200} = 62.98$ m.`,
          ],
          answer: r`4.2 kN; 64.03 m; 62.98 m.`,
        },
      ],
      traps: [
        r`Parabolic is load per HORIZONTAL metre; catenary is weight per metre ALONG the cable.`,
        r`In the catenary, y is measured from the directrix, c below the lowest point.`,
      ],
      check: [
        { q: r`Where is a cable's tension least?`, a: r`At its lowest point, where it equals H.` },
        { q: r`What shape does a cable hanging under its own weight take?`, a: r`A catenary.` },
      ],
    },
    {
      name: 'Friction',
      inShort: r`Dry friction resists sliding up to $\mu N$.`,
      body: [
        r`Dry friction opposes sliding, up to a limit $\mu_sN$ before motion and $\mu_kN$ once sliding. The resultant of the normal force and limiting friction leans from the normal by the **angle of friction**, $\tan\phi = \mu$; a block on a slope starts to slide when the slope reaches that angle (the **angle of repose**).`,
        r`Pushing a block up a slope takes $W(\sin\theta + \mu\cos\theta)$; holding it from sliding down takes $W(\sin\theta - \mu\cos\theta)$, which is zero until the slope passes the angle of friction:`,
        {
          type: 'plot',
          alt: 'The force along a slope needed for a 500 N block with friction coefficient 0.3, against the slope angle from 0 to 60 degrees: the force to push it up rises from 150 N; the force to hold it from sliding down is zero until 16.7 degrees, then rises.',
          caption: 'A 500 N block (μ = 0.3): pushing it up (solid) and holding it back (dashed), needed only past 16.7°.',
          x: [0, 60],
          y: [0, 600],
          xLabel: 'slope (°)',
          yLabel: 'force (N)',
          series: [
            { f: (t) => 500 * (Math.sin(rad(t)) + 0.3 * Math.cos(rad(t))), label: 'push up' },
            { f: (t) => Math.max(0, 500 * (Math.sin(rad(t)) - 0.3 * Math.cos(rad(t)))), label: 'hold back', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: (Math.atan(0.3) * 180) / Math.PI, label: '16.7°' }],
        },
        r`A rope round a post or a belt round a pulley grips by friction along the whole contact: $\frac{T_1}{T_2} = e^{\mu\beta}$, β in radians, growing very fast with each turn.`,
      ],
      keyIdeas: [
        r`$f \le \mu_sN$; once sliding, $f = \mu_kN$. Angle of friction $\tan\phi = \mu$.`,
        r`Push up a slope: $P = W(\sin\theta + \mu\cos\theta)$; slide down: $a = g(\sin\theta - \mu_k\cos\theta)$.`,
        r`Belts $\frac{T_1}{T_2} = e^{\mu\beta}$ ($\beta$ in radians); screws $M = Wr\tan(\phi + \alpha)$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Up a slope, round a post',
          problem: r`What force along a 25° slope starts a 500 N block moving up it ($\mu = 0.3$)? A rope wraps half a turn round a post ($\mu = 0.25$): what is the tension ratio?`,
          steps: [
            r`$P = 500(\sin25° + 0.3\cos25°) = 347.3$ N.`,
            r`Rope: $e^{0.25\pi} = 2.19$.`,
          ],
          answer: r`347.3 N; 2.19.`,
        },
        {
          level: 'board',
          title: 'Turns of rope, angle of repose',
          problem: r`A rope wrapped 1.5 turns round a post holds a 3 kN load with a 40 N pull. Find μ. At what slope does a safe on a plane with μ = 0.7 begin to slide?`,
          steps: [
            r`$\beta = 1.5 \times 2\pi = 3\pi$: $\mu = \frac{\ln(3000/40)}{3\pi} = 0.458$.`,
            r`$\theta = \tan^{-1}0.7 = 35.0°$.`,
          ],
          answer: r`0.458; 35.0°.`,
        },
      ],
      traps: [
        r`Friction opposes the IMPENDING motion: decide the direction before writing the equation.`,
        r`β in the belt formula is in RADIANS: one turn is 2π.`,
      ],
      check: [
        { q: r`What is the angle of friction for μ = 0.3?`, a: r`$\tan^{-1}0.3 = 16.7°$.` },
        { q: r`Does the friction force depend on the contact area?`, a: r`No, only on μ and the normal force (for dry friction).` },
      ],
    },
    {
      name: 'Centroids',
      inShort: r`The geometric centre of an area, line or volume.`,
      body: [
        r`The **centroid** is the average position of an area (for a uniform body, its centre of gravity). For a composite shape, split it into simple parts with known centroids and take a weighted average, with holes counted as negative area.`,
        r`| Shape | Centroid |
|---|---|
| Rectangle | centre |
| Triangle | $\frac h3$ from the base |
| Semicircle, quarter circle | $\frac{4r}{3\pi}$ from the straight edges |
| Circular sector, half-angle α | $\frac{2r\sin\alpha}{3\alpha}$ from the centre |
| Semicircular arc | $\frac{2r}{\pi}$ from the diameter |`,
        r`The **theorems of Pappus**: a line of length L revolved about an axis sweeps an area $2\pi\bar yL$; an area A sweeps a volume $2\pi\bar yA$, $\bar y$ being the centroid's distance from the axis.`,
      ],
      keyIdeas: [
        r`Composite: $\bar x = \frac{\sum A\bar x}{\sum A}$, holes negative; by integration $\frac{\int x\,dA}{\int dA}$.`,
        r`Triangle $\frac h3$ from the base; semicircle and quarter circle $\frac{4r}{3\pi}$; sector $\frac{2r\sin\alpha}{3\alpha}$.`,
        r`Pappus: $A = 2\pi\bar yL$, $V = 2\pi\bar yA$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A plate with a hole',
          problem: r`A 6 × 4 rectangle (corner at the origin) has a 1-unit-radius hole centred at (4, 2). Find $\bar x$.`,
          steps: [
            r`$\bar x = \frac{24 \times 3 - \pi \times 4}{24 - \pi} = \frac{72 - 12.57}{20.86} = 2.85$.`,
            r`Left of 3, since the hole is on the right; $\bar y = 2$ by symmetry.`,
          ],
          answer: r`2.85.`,
        },
        {
          level: 'board',
          title: 'A T-section',
          problem: r`A T-section has a 200 × 20 mm flange on top of a 20 × 180 mm web. Find its centroid from the bottom.`,
          steps: [
            r`Flange: 4000 mm² at 190 mm. Web: 3600 mm² at 90 mm.`,
            r`$\bar y = \frac{4000 \times 190 + 3600 \times 90}{7600} = 142.6$ mm.`,
          ],
          answer: r`142.6 mm from the bottom.`,
        },
      ],
      traps: [
        r`Measure each part's centroid from the same reference axes.`,
        r`A hole SUBTRACTS both its area and its moment.`,
      ],
      check: [
        { q: r`How far is a triangle's centroid from its base?`, a: r`A third of its height.` },
        { q: r`What does Pappus's second theorem give?`, a: r`The volume swept by revolving an area: $2\pi\bar yA$.` },
      ],
    },
    {
      name: 'Moments of Inertia',
      inShort: r`Second moments of area: how a cross-section resists bending and twisting.`,
      body: [
        r`The **second moment of area** $I = \int y^2\,dA$ measures how far an area spreads from an axis; it sets a beam's stiffness and bending stress. Area far from the axis counts with the square of its distance, which is why I-beams put their material in flanges.`,
        r`| Shape | I about its centroidal axis |
|---|---|
| Rectangle b × h (h across the axis) | $\frac{bh^3}{12}$ ($\frac{bh^3}{3}$ about its base) |
| Triangle | $\frac{bh^3}{36}$ |
| Circle | $\frac{\pi r^4}{4} = \frac{\pi d^4}{64}$ |
| Polar, solid shaft | $J = \frac{\pi d^4}{32}$ |`,
        r`About any parallel axis, add the area times the distance squared (**parallel-axis theorem**), $I = \bar I + Ad^2$, always starting from the centroidal axis:`,
        {
          type: 'plot',
          alt: 'The second moment of a 200 by 300 mm rectangle about axes parallel to its centroidal axis, against the distance of the axis from the centroid: 4.5 at the centroid, rising as the square of the distance to 18 at 0.15 m, its base.',
          caption: 'A 200 × 300 mm rectangle: I grows from 4.5 × 10⁻⁴ m⁴ at the centroid to 18 × 10⁻⁴ at the base (0.15 m away).',
          x: [0, 0.2],
          y: [0, 30],
          xLabel: 'd (m)',
          yLabel: 'I (×10⁻⁴ m⁴)',
          series: [{ f: (d) => (4.5e-4 + 0.06 * d * d) * 1e4, label: 'I', area: true }],
          marks: [{ x: 0.15, label: 'base' }],
        },
        r`The **radius of gyration** $k = \sqrt{\frac IA}$ is the distance at which the whole area would give the same I.`,
      ],
      keyIdeas: [
        r`Rectangle $\frac{bh^3}{12}$ about its centroid, $\frac{bh^3}{3}$ about its base; triangle $\frac{bh^3}{36}$; circle $\frac{\pi r^4}{4}$.`,
        r`Parallel axis $I = \bar I + Ad^2$, always from the centroidal axis.`,
        r`Polar $J = I_x + I_y$ ($\frac{\pi d^4}{32}$ for a shaft); radius of gyration $k = \sqrt{\frac IA}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A rectangle',
          problem: r`A 200 mm × 300 mm rectangle (300 mm tall). Find I about its horizontal centroidal axis and about its base, and k.`,
          steps: [
            r`$\bar I = \frac{0.2 \times 0.3^3}{12} = 4.5 \times 10^{-4}$ m⁴.`,
            r`Base: $4.5 \times 10^{-4} + 0.06 \times 0.15^2 = 1.8 \times 10^{-3}$ m⁴.`,
            r`$k = \frac{0.3}{\sqrt{12}} = 86.6$ mm.`,
          ],
          answer: r`$4.5 \times 10^{-4}$ m⁴; $1.8 \times 10^{-3}$ m⁴; 86.6 mm.`,
        },
        {
          level: 'board',
          title: 'The T-section',
          problem: r`Find I of the T-section of the centroid example (200 × 20 flange on a 20 × 180 web, centroid 142.6 mm up) about its horizontal centroidal axis.`,
          steps: [
            r`Flange: $\frac{200 \times 20^3}{12} + 4000 \times 47.37^2 = 0.133 \times 10^6 + 8.975 \times 10^6$ mm⁴.`,
            r`Web: $\frac{20 \times 180^3}{12} + 3600 \times 52.63^2 = 9.720 \times 10^6 + 9.972 \times 10^6$ mm⁴.`,
            r`Total $= 28.80 \times 10^6$ mm⁴.`,
          ],
          answer: r`$28.80 \times 10^6$ mm⁴.`,
        },
      ],
      traps: [
        r`The dimension perpendicular to the axis is the one cubed.`,
        r`Transfer only FROM a centroidal axis: never between two off-centre axes directly.`,
      ],
      check: [
        { q: r`What is the polar moment of a solid shaft of diameter d?`, a: r`$\frac{\pi d^4}{32}$.` },
        { q: r`Why are beams made in an I shape?`, a: r`Material far from the neutral axis adds most to I.` },
      ],
    },
    {
      name: 'Rectilinear Motion',
      inShort: r`Motion along a straight line, with constant or varying acceleration.`,
      body: [
        r`Along a straight line, with constant acceleration a (negative when slowing): $v = v_0 + at$, $s = v_0t + \frac12at^2$, $v^2 = v_0^2 + 2as$, $s = \frac{v_0 + v}{2}t$. A falling body uses $a = g$, downward. When the acceleration varies, go back to $v = \frac{dx}{dt}$, $a = \frac{dv}{dt} = v\frac{dv}{dx}$.`,
        r`A **velocity–time graph** shows a whole journey at once: its slope is the acceleration and the area under it the distance. An elevator speeding up, running steadily and stopping traces a trapezoid:`,
        {
          type: 'plot',
          alt: 'The velocity of an elevator against time: rising at 0.75 m per second squared to 3.75 m per second over 5 s, steady for 12 s, then falling to zero over 3 s; the area under it is 60 m.',
          caption: 'An elevator: speeding up 5 s, steady 12 s, stopping in 3 s; the area, 60 m, is the height climbed.',
          x: [0, 22],
          y: [0, 5],
          xLabel: 't (s)',
          yLabel: 'v (m/s)',
          series: [{ f: lift, label: 'v', area: true }],
        },
        r`A driver's stopping distance is the reaction distance (speed × reaction time) plus the braking distance $\frac{v^2}{2a}$.`,
      ],
      keyIdeas: [
        r`Constant $a$: $v = u + at$, $s = ut + \frac12at^2$, $v^2 = u^2 + 2as$.`,
        r`Varying $a$: $v = \frac{dx}{dt}$, $a = \frac{dv}{dt} = v\frac{dv}{dx}$; on a v–t graph, slope is a and area is distance.`,
        r`Pulleys: the cable length is constant, so the velocities are linked. Stopping: $vt_r + \frac{v^2}{2a}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Stopping a car',
          problem: r`A car at 25 m/s (90 km/h); the driver reacts in 1 s and brakes with $\mu = 0.7$. Find the stopping distance.`,
          steps: [
            r`Reaction: $25 \times 1 = 25$ m.`,
            r`Braking: $\frac{25^2}{2 \times 0.7 \times 9.81} = 45.5$ m. Total 70.5 m.`,
          ],
          answer: r`70.5 m.`,
        },
        {
          level: 'board',
          title: 'An elevator',
          problem: r`In a 20-storey building with floors 3.75 m apart, an elevator starts from rest on the 1st floor, accelerates at 0.75 m/s² for 5 s, runs steadily for 12 s, then stops in 3 s. At what floor does it stop?`,
          steps: [
            r`Top speed $0.75 \times 5 = 3.75$ m/s. Distances: $\frac12 \times 3.75 \times 5 = 9.375$, $3.75 \times 12 = 45$, $\frac12 \times 3.75 \times 3 = 5.625$ m.`,
            r`Total 60 m $= \frac{60}{3.75} = 16$ floors up: the 17th floor.`,
          ],
          answer: r`The 17th floor.`,
        },
      ],
      traps: [
        r`Doubling the speed doubles the reaction distance but quadruples the braking distance.`,
        r`Floors climbed + 1 = the floor number, when starting from the 1st.`,
      ],
      check: [
        { q: r`What does the area under a velocity–time graph give?`, a: r`The distance (displacement).` },
        { q: r`How long does a body dropped from rest take to fall 19.62 m?`, a: r`2 s.` },
      ],
    },
    {
      name: 'Projectile Motion',
      inShort: r`Constant horizontal velocity plus free fall.`,
      body: [
        r`A projectile keeps its horizontal velocity and falls freely; its path is a **parabola**, $y = x\tan\theta - \frac{gx^2}{2v_0^2\cos^2\theta}$, with y positive above the launch point and negative below it. On level ground its range $\frac{v_0^2\sin2\theta}{g}$ is greatest at 45°, and θ and 90° − θ reach the same spot. Launched from a height, solve the height equation for the time of flight instead:`,
        {
          type: 'plot',
          alt: 'The path of a ball thrown at 20 m per second, 35 degrees above the horizontal, from the top of a 15 m cliff: rising to about 21.7 m, then falling to land 53.6 m out.',
          caption: 'Thrown at 20 m/s, 35°, from a 15 m cliff: it lands 53.6 m out after 3.27 s.',
          x: [0, 60],
          y: [0, 25],
          xLabel: 'x (m)',
          yLabel: 'y (m)',
          series: [{ f: cliff, label: 'y', area: true }],
          marks: [{ x: 53.6, label: '53.6 m' }],
        },
      ],
      keyIdeas: [
        r`Range on level ground $\frac{v_0^2\sin2\theta}{g}$, greatest at 45°; $\theta$ and $90° - \theta$ give the same range.`,
        r`Path $y = x\tan\theta - \frac{gx^2}{2v_0^2\cos^2\theta}$.`,
        r`From a height: solve $y_0 + v_0\sin\theta\,t - \frac12gt^2 = 0$ for $t$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'From a cliff',
          problem: r`A ball is thrown at 20 m/s, 35° above horizontal, from a 15 m cliff. When and how far out does it land?`,
          steps: [
            r`$15 + 11.47t - 4.905t^2 = 0$ gives $t = 3.27$ s.`,
            r`$x = 20\cos35° \times 3.27 = 53.6$ m.`,
          ],
          answer: r`3.27 s; 53.6 m.`,
        },
        {
          level: 'board',
          title: 'The angle to hit a target',
          problem: r`A ball leaves at 40 m/s and must land 120 m away at the same level. At what angles can it be thrown?`,
          steps: [
            r`$\sin2\theta = \frac{120 \times 9.81}{40^2} = 0.736$, so $2\theta = 47.4°$ or $132.6°$.`,
            r`$\theta = 23.7°$ or $66.3°$.`,
          ],
          answer: r`23.7° or 66.3°.`,
        },
      ],
      traps: [
        r`The level-ground range formula fails when launch and landing heights differ.`,
        r`Two angles always work below the maximum range: give both.`,
      ],
      check: [
        { q: r`What curve does a projectile's path follow?`, a: r`A parabola.` },
        { q: r`At what angle is the range on level ground greatest?`, a: r`45°.` },
      ],
    },
    {
      name: 'Curvilinear Motion',
      inShort: r`Motion along curves: speeding up along the path, turning across it.`,
      body: [
        r`On a curved path the acceleration has two parts: along the path, $a_t = \frac{dv}{dt}$, changing the speed; and toward the centre of curvature, $a_n = \frac{v^2}{\rho}$, changing the direction. A car rounding a flat curve needs friction to supply the inward force, so its top speed is $\sqrt{\mu gr}$; banking the road lets the normal force help, and with no friction the right bank is $\tan\theta = \frac{v^2}{gr}$:`,
        {
          type: 'plot',
          alt: 'The greatest safe speed on a curve against its radius from 10 to 200 m: on a flat road with friction coefficient 0.6, rising to 17.2 m per second at 50 m; on a 15 degree bank with no friction, lower, 11.5 m per second at 50 m.',
          caption: 'Top speed by radius: flat with μ = 0.6 (solid), 17.2 m/s at 50 m; a 15° bank alone (dashed), 11.5 m/s.',
          x: [10, 200],
          y: [0, 40],
          xLabel: 'r (m)',
          yLabel: 'v (m/s)',
          series: [
            { f: (r0) => Math.sqrt(0.6 * G * r0), label: 'flat, μ = 0.6' },
            { f: (r0) => Math.sqrt(G * r0 * Math.tan(rad(15))), label: '15° bank', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 50, label: '50 m' }],
        },
        r`Banking and friction together give $\tan(\theta + \phi) = \frac{v^2}{gr}$. The inertial **D'Alembert** view treats the "centrifugal" reaction $\frac{mv^2}{r}$ as a force outward and solves as statics.`,
      ],
      keyIdeas: [
        r`$a_t = \frac{dv}{dt}$, $a_n = \frac{v^2}{\rho}$.`,
        r`Flat curve $v_{max} = \sqrt{\mu gr}$; banked $\tan\theta = \frac{v^2}{gr}$, with friction $v_{max} = \sqrt{gr\tan(\theta + \phi)}$.`,
        r`Conical pendulum $T = 2\pi\sqrt{\frac{L\cos\theta}{g}}$; vertical circle needs $\sqrt{gr}$ at the top.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A flat curve and a bank',
          problem: r`A flat curve of 50 m radius has $\mu = 0.6$. Find the top speed. At what speed does a 15° bank need no friction?`,
          steps: [
            r`$\sqrt{0.6 \times 9.81 \times 50} = 17.2$ m/s (61.8 km/h).`,
            r`$\sqrt{9.81 \times 50 \times \tan15°} = 11.5$ m/s.`,
          ],
          answer: r`17.2 m/s; 11.5 m/s.`,
        },
        {
          level: 'board',
          title: 'Designing a bank',
          problem: r`A highway curve of 150 m radius is to carry 72 km/h with no friction. Find the bank angle. With μ = 0.3 on that bank, what is the top speed?`,
          steps: [
            r`$v = 20$ m/s: $\tan\theta = \frac{400}{9.81 \times 150} = 0.272$, $\theta = 15.2°$.`,
            r`$\phi = \tan^{-1}0.3 = 16.7°$: $v = \sqrt{9.81 \times 150 \times \tan31.9°} = 30.3$ m/s (109 km/h).`,
          ],
          answer: r`15.2°; 30.3 m/s.`,
        },
      ],
      traps: [
        r`Mass cancels: every vehicle skids at the same speed on a given curve.`,
        r`Convert km/h to m/s (÷ 3.6) before squaring.`,
      ],
      check: [
        { q: r`Which way does the normal acceleration on a curve point?`, a: r`Toward the centre of curvature.` },
        { q: r`What speed does a bob need at the top of a vertical circle of radius r?`, a: r`At least $\sqrt{gr}$.` },
      ],
    },
    {
      name: "Newton's Laws",
      inShort: r`Forces causing acceleration, for single and connected bodies.`,
      body: [
        r`For each body, $\sum F = ma$, with bodies tied by a taut string sharing one acceleration. **D'Alembert's principle** turns dynamics into statics: add the **reversed effective force** $ma$ (opposite the acceleration) and set the sum to zero.`,
        r`Two masses over a light pulley (an **Atwood machine**) accelerate at $\frac{m_1 - m_2}{m_1 + m_2}g$, approaching g as one mass grows:`,
        {
          type: 'plot',
          alt: 'The acceleration of an Atwood machine with a 3 kg mass on one side against the mass on the other, from 3 to 30 kg: zero when they balance, 2.45 m per second squared at 5 kg, approaching g.',
          caption: 'An Atwood machine with 3 kg on one side: 2.45 m/s² with 5 kg on the other, approaching g.',
          x: [3, 30],
          y: [0, 10],
          xLabel: 'm₁ (kg)',
          yLabel: 'a (m/s²)',
          series: [{ f: (m) => ((m - 3) * G) / (m + 3), label: 'a', area: true }],
          marks: [{ x: 5, label: '5 kg' }],
        },
        r`The string's tension lies between the two weights: $\frac{2m_1m_2g}{m_1 + m_2}$.`,
      ],
      keyIdeas: [
        r`$\sum F = ma$ on each body, with the same acceleration for bodies tied together.`,
        r`D'Alembert: add $-ma$ and solve as statics.`,
        r`Atwood $a = \frac{(m_1 - m_2)g}{m_1 + m_2}$, $T = \frac{2m_1m_2g}{m_1 + m_2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An Atwood machine',
          problem: r`5 kg and 3 kg hang over a light frictionless pulley. Find the acceleration and the tension.`,
          steps: [
            r`$a = \frac{2 \times 9.81}{8} = 2.45$ m/s².`,
            r`$T = \frac{2 \times 5 \times 3 \times 9.81}{8} = 36.8$ N, between the two weights (29.4 and 49.1 N).`,
          ],
          answer: r`2.45 m/s²; 36.8 N.`,
        },
        {
          level: 'board',
          title: 'A package in an elevator',
          problem: r`An elevator starts from rest and rises 1.5 m in its first 0.5 s at constant acceleration. A passenger holds a 4 kg package by a string. Find the tension.`,
          steps: [
            r`$1.5 = \frac12a(0.5)^2$: $a = 12$ m/s².`,
            r`$T = 4(9.81 + 12) = 87.2$ N.`,
          ],
          answer: r`87.2 N.`,
        },
      ],
      traps: [
        r`The tension is not the hanging weight once things accelerate.`,
        r`Mass does not change from place to place; weight does.`,
      ],
      check: [
        { q: r`What is the reversed effective force in D'Alembert's principle?`, a: r`$ma$, acting opposite to the acceleration.` },
        { q: r`A 10 g mass is taken to Mars. What is its mass there?`, a: r`Still 10 g.` },
      ],
    },
    {
      name: 'Work and Energy',
      inShort: r`Work changes kinetic energy; power is how fast.`,
      body: [
        r`The work done by a force is the area under its force–distance curve, $W = \int F\,dx$; for a spring, $F = kx$ gives a triangle, $\frac12kx^2$:`,
        {
          type: 'plot',
          alt: 'The force of a 400 newton per metre spring against its compression from 0 to 0.2 m, a straight line; the shaded area up to 0.15 m, 4.5 J, is the work stored.',
          caption: 'A 400 N/m spring: the area under F = kx up to 0.15 m is the 4.5 J of work it stores.',
          x: [0, 0.2],
          y: [0, 90],
          xLabel: 'x (m)',
          yLabel: 'F (N)',
          series: [{ f: (x) => 400 * x, label: 'F', area: true }],
          marks: [{ x: 0.15, label: '0.15 m' }],
        },
        r`The **work–energy principle**: kinetic energy at the start plus all the work done equals kinetic energy at the end, $T_1 + \sum U = T_2$. **Power** is work per time, $P = Fv$ for a force and $P = T\omega = \frac{2\pi NT}{60}$ for a shaft; a machine's input power is its output divided by its efficiency.`,
      ],
      keyIdeas: [
        r`$W = \int F\,dx$ (area under the force curve); spring $\frac12k(x_2^2 - x_1^2)$.`,
        r`$T_1 + \sum U = T_2$; $P = Fv$; shaft $P = T\omega = \frac{2\pi NT}{60}$.`,
        r`Input power = output ÷ efficiency.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A hoist and a shaft',
          problem: r`A hoist lifts 1000 kg at 0.5 m/s with 80% efficiency. Find the motor power. What does a shaft carrying 40 N·m at 1750 rpm transmit?`,
          steps: [
            r`$\frac{1000 \times 9.81 \times 0.5}{0.8} = 6.13$ kW.`,
            r`Shaft: $\frac{2\pi \times 1750 \times 40}{60} = 7.33$ kW (9.8 hp).`,
          ],
          answer: r`6.13 kW; 7.33 kW.`,
        },
        {
          level: 'board',
          title: 'Thrust from power, and a spring launch',
          problem: r`An aircraft's engines deliver 22 000 kW at 200 m/s. Find their thrust. A 50 g ball is launched by a 2000 N/m spring compressed 8 cm: find its speed.`,
          steps: [
            r`$F = \frac{P}{v} = \frac{22 \times 10^6}{200} = 110$ kN.`,
            r`$\frac12kx^2 = \frac12mv^2$: $v = x\sqrt{\frac km} = 0.08\sqrt{\frac{2000}{0.05}} = 16$ m/s.`,
          ],
          answer: r`110 kN; 16 m/s.`,
        },
      ],
      traps: [
        r`rpm must become rad/s ($\times\frac{2\pi}{60}$) before $P = T\omega$.`,
        r`A spring's work is $\frac12k(x_2^2 - x_1^2)$, not $\frac12k(x_2 - x_1)^2$.`,
      ],
      check: [
        { q: r`What is the increase in potential energy of 1 kg lifted 1 m?`, a: r`9.81 J.` },
        { q: r`What is 1 hp in watts?`, a: r`746 W.` },
      ],
    },
    {
      name: 'Impulse and Momentum',
      inShort: r`Force over time changes momentum; streams push by changing their momentum.`,
      body: [
        r`The impulse of a force, $\int F\,dt$, equals the change of momentum $m(v_2 - v_1)$; with no outside impulse, momentum is conserved (collisions are in Physics for Engineers). A steady stream pushes on whatever turns it, by the momentum it loses each second: $F = \rho Q(v_1 - v_2)$. A jet stopped by a flat plate pushes $\rho Qv$; turned straight back by a cup, $2\rho Qv$.`,
        r`If the plate moves away at u, the water reaches it at only $v - u$, and less of it arrives each second, so $F = \rho A(v - u)^2$:`,
        {
          type: 'plot',
          alt: 'The force of a 2 litre per second, 20 m per second water jet on a flat plate against the plate speed away from the jet: 40 N when still, 22.5 N at 5 m per second, falling to zero at 20 m per second.',
          caption: 'A 2 L/s jet at 20 m/s on a plate: 40 N held still, 22.5 N when the plate moves away at 5 m/s.',
          x: [0, 20],
          y: [0, 45],
          xLabel: 'plate speed u (m/s)',
          yLabel: 'F (N)',
          series: [{ f: (u) => 1000 * 1e-4 * (20 - u) ** 2, label: 'F', area: true }],
          marks: [{ x: 5, label: '5 m/s' }],
        },
        r`A rocket works the same way: its thrust is the exhaust's mass rate times its speed, $F = \dot mv_e$.`,
      ],
      keyIdeas: [
        r`$\int F\,dt = m(v_2 - v_1)$; collisions are in Physics for Engineers.`,
        r`Jet force $F = \rho Q(v_2 - v_1)$; stopped by a plate, $\rho Qv$; turned back, $2\rho Qv$; rocket $\dot mv_e$.`,
        r`Recoil $V = \frac{mv}{M}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A jet on a plate',
          problem: r`A water jet of 2 L/s at 20 m/s hits a flat plate square on. Find the force.`,
          steps: [
            r`$F = 1000 \times 0.002 \times 20 = 40$ N.`,
            r`If a cup turned it straight back, 80 N.`,
          ],
          answer: r`40 N (80 N turned back).`,
        },
        {
          level: 'board',
          title: 'A moving plate and a rocket',
          problem: r`The same jet (nozzle area $10^{-4}$ m²) hits a plate moving away at 5 m/s. Find the force. A rocket's engines give 1200 kN with exhaust at 3000 m/s: at what rate does it burn fuel?`,
          steps: [
            r`$F = 1000 \times 10^{-4} \times (20 - 5)^2 = 22.5$ N.`,
            r`$\dot m = \frac{1.2 \times 10^6}{3000} = 400$ kg/s.`,
          ],
          answer: r`22.5 N; 400 kg/s.`,
        },
      ],
      traps: [
        r`Use velocities RELATIVE to a moving plate, and the mass rate that actually reaches it.`,
        r`Convert km/h exhaust speeds to m/s before dividing.`,
      ],
      check: [
        { q: r`Impulse is the change in what?`, a: r`Momentum.` },
        { q: r`Why does a cup that turns a jet back feel twice the force of a flat plate?`, a: r`The water's velocity changes by $2v$ instead of $v$.` },
      ],
    },
    {
      name: 'Rotation',
      inShort: r`Rigid bodies turning and rolling; flywheels.`,
      body: [
        r`A turning body obeys $\tau = I\alpha$, with angular motion following the same equations as straight-line motion: $\omega = \omega_0 + \alpha t$, $\theta = \omega_0t + \frac12\alpha t^2$, $\omega^2 = \omega_0^2 + 2\alpha\theta$.`,
        r`A body that rolls without slipping down a slope accelerates at $\frac{g\sin\theta}{1 + k^2/r^2}$: a sphere at $\frac57$, a cylinder $\frac23$ and a hoop $\frac12$ of what a sliding block would:`,
        {
          type: 'plot',
          alt: 'The acceleration of a sphere, a solid cylinder and a hoop rolling down a slope against its angle from 0 to 60 degrees: the sphere fastest, 2.40 m per second squared at 20 degrees, the hoop slowest.',
          caption: 'Rolling down a slope: sphere (5/7 g sinθ), cylinder (2/3), hoop (1/2); the sphere gets 2.40 m/s² at 20°.',
          x: [0, 60],
          y: [0, 7],
          xLabel: 'slope (°)',
          yLabel: 'a (m/s²)',
          series: [
            { f: (t) => (5 / 7) * G * Math.sin(rad(t)), label: 'sphere' },
            { f: (t) => (2 / 3) * G * Math.sin(rad(t)), label: 'cylinder', colour: colourOf(1) },
            { f: (t) => 0.5 * G * Math.sin(rad(t)), label: 'hoop', dashed: true, colour: colourOf(2) },
          ],
          marks: [{ x: 20, label: '20°' }],
        },
        r`A **flywheel** smooths an engine by storing energy as speed rises and giving it back as it falls: $\Delta E = \frac12I(\omega_{max}^2 - \omega_{min}^2)$.`,
      ],
      keyIdeas: [
        r`Rolling down a slope $a = \frac{g\sin\theta}{1 + k^2/r^2}$: sphere $\frac57$, cylinder $\frac23$, hoop $\frac12$ of $g\sin\theta$.`,
        r`Plane motion turns about an instant centre: $v = \omega r_{IC}$.`,
        r`Flywheel: $\Delta E = \frac12I(\omega_{max}^2 - \omega_{min}^2) = I\omega^2C_s$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A rolling sphere and a flywheel',
          problem: r`A solid sphere rolls down a 20° slope. Find its acceleration. A flywheel with I = 20 kg·m² swings between 95 and 105 rad/s: how much energy does it exchange?`,
          steps: [
            r`$a = \frac57 \times 9.81 \times \sin20° = 2.40$ m/s².`,
            r`$\Delta E = \frac12 \times 20 \times (105^2 - 95^2) = 20$ kJ.`,
          ],
          answer: r`2.40 m/s²; 20 kJ.`,
        },
        {
          level: 'board',
          title: 'Spinning up a flywheel',
          problem: r`A flywheel with I = 8 kg·m² is driven from rest by a constant 40 N·m. How long does it take to reach 120 rad/s, and how many revolutions does it make?`,
          steps: [
            r`$\alpha = \frac{40}{8} = 5$ rad/s²: $t = \frac{120}{5} = 24$ s.`,
            r`$\theta = \frac{120^2}{2 \times 5} = 1440$ rad $= 229.2$ rev.`,
          ],
          answer: r`24 s; 229.2 revolutions.`,
        },
      ],
      traps: [
        r`Rolling without slipping: the contact point is momentarily at rest, and the top moves at $2v$.`,
        r`Revolutions = radians ÷ 2π.`,
      ],
      check: [
        { q: r`Which reaches the bottom of a slope first: a sphere, a cylinder or a hoop?`, a: r`The sphere.` },
        { q: r`What is a flywheel for?`, a: r`To store energy and smooth out the speed of a machine.` },
      ],
    },
  ],
};
