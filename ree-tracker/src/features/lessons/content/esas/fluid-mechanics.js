// Library › Lessons › ESAS › Fluid Mechanics
// (2026-11-17; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// fluidsLesson.test.js. Coverage and problem styles cross-checked against a
// review center's fluid mechanics handout; the text, problems and figures are
// this app's own): written for the Philippine REE board, subtopic by subtopic
// in the syllabus's order. Physics for Engineers covers density, Pascal's
// principle, gauge pressure and capillarity.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;
const G = 9.81;

// Draining a 2 m² tank through a 0.002 m² orifice (Cd 0.61) from 4 m (t in s).
const K_DRAIN = (0.61 * 0.002 * Math.sqrt(2 * G)) / (2 * 2);
const drain = (t) => Math.max(0, 2 - K_DRAIN * t) ** 2;
// 40 points evenly spaced on a log axis from a to b.
const logPoints = (a, b, f) =>
  Array.from({ length: 41 }, (_, i) => a * (b / a) ** (i / 40)).map((x) => [x, f(x)]);

export default {
  topic: 'Fluid Mechanics',
  subject: 'ESAS',
  overview: r`Fluids at rest and in motion, as engineers meet them: pressure and the forces it puts on gates and dams, floating bodies, flow in pipes and channels, and the machines that move or take energy from water. Most problems use three laws: conservation of mass (continuity), of energy (Bernoulli with losses), and of momentum (forces from changes of velocity). Work in heads (metres of fluid) for energy, and remember that γ for water is 9.81 kN/m³.`,
  sources: [
    'Fluid Mechanics with Engineering Applications (Finnemore and Franzini)',
    'Philippine board reviewers in fluid mechanics and hydraulics, for the style of problems',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Fluid Properties',
      inShort: r`Density, specific weight, viscosity, surface tension and compressibility.`,
      body: [
        r`A **fluid** deforms continuously under any shear, however small. **Liquids** have a fixed volume and a free surface and are hardly compressible; **gases** fill their container and compress easily ($\rho = \frac{p}{RT}$). An **ideal fluid** has no viscosity and does not compress; real fluids have both.`,
        r`| Property | Meaning | Water |
|---|---|---|
| Density ρ, specific weight $\gamma = \rho g$ | mass, weight per volume | 1000 kg/m³, 9.81 kN/m³ |
| Specific gravity | $\frac{\rho}{\rho_{water}}$ | 1 |
| Viscosity μ (dynamic), $\nu = \frac\mu\rho$ (kinematic) | resistance to shearing | 0.001 Pa·s, $10^{-6}$ m²/s at 20 °C |
| Surface tension σ | pull per length along a surface | 0.073 N/m |
| Bulk modulus $E_v$ (compressibility $\frac{1}{E_v}$) | stiffness to squeezing | 2.2 GPa |`,
        r`**Viscosity** links shear stress to the rate of shearing: $\tau = \mu\frac{du}{dy}$. A **Newtonian** fluid (water, air, oil) has a constant μ; **non-Newtonian** fluids thin (paint, blood) or thicken (wet sand, cornstarch) as they are sheared faster:`,
        {
          type: 'plot',
          alt: 'Shear stress against rate of shear: a straight line for a Newtonian fluid, a curve bending down for a shear-thinning fluid, and a curve bending up, dashed, for a shear-thickening fluid.',
          caption: 'Newtonian fluids keep one viscosity (straight); shear-thinning ones bend down, shear-thickening ones up (dashed).',
          x: [0, 4],
          y: [0, 6],
          xLabel: 'rate of shear du/dy',
          yLabel: 'τ',
          series: [
            { f: (g) => g, label: 'Newtonian' },
            { f: (g) => 2 * Math.sqrt(g), label: 'thinning', colour: colourOf(1) },
            { f: (g) => 0.5 * g ** 1.5, label: 'thickening', dashed: true, colour: colourOf(2) },
          ],
        },
      ],
      keyIdeas: [
        r`$\gamma = \rho g$; $SG = \frac{\rho}{\rho_w}$; water 1000 kg/m³, 9.81 kN/m³; ideal gas $\rho = \frac{p}{RT}$.`,
        r`Newton's law of viscosity $\tau = \mu\frac{du}{dy}$; $\nu = \frac\mu\rho$.`,
        r`Surface tension: droplet $\Delta p = \frac{2\sigma}{r}$, bubble $\frac{4\sigma}{r}$. Liquids are nearly incompressible ($E_v \approx 2.2$ GPa for water).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An oil and a film',
          problem: r`Find the specific weight of an oil with SG 0.85. A plate slides at 2 m/s on a 1 mm oil film with μ = 0.4 Pa·s: find the shear stress.`,
          steps: [
            r`$\gamma = 0.85 \times 9.81 = 8.34$ kN/m³.`,
            r`$\tau = \frac{0.4 \times 2}{0.001} = 800$ Pa.`,
          ],
          answer: r`8.34 kN/m³; 800 Pa.`,
        },
        {
          level: 'board',
          title: 'Air and squeezed water',
          problem: r`Find the density of air at 30 °C and 101.3 kPa (R = 287 J/kg·K). By how much does water's volume shrink under a 10 MPa rise ($E_v$ = 2.2 GPa)?`,
          steps: [
            r`$\rho = \frac{101\,300}{287 \times 303.15} = 1.164$ kg/m³.`,
            r`$\frac{\Delta V}{V} = \frac{10}{2200} = 0.455\%$.`,
          ],
          answer: r`1.164 kg/m³; 0.455%.`,
        },
      ],
      traps: [
        r`Kinematic viscosity (m²/s) and dynamic viscosity (Pa·s) are different; check the unit given.`,
        r`Use ABSOLUTE pressure and temperature in $\frac{p}{RT}$.`,
      ],
      check: [
        { q: r`What kind of fluid has no viscosity and does not compress?`, a: r`An ideal fluid.` },
        { q: r`What is the reciprocal of the bulk modulus?`, a: r`Compressibility.` },
      ],
    },
    {
      name: 'Pressure and Manometers',
      inShort: r`Pressure grows with depth; manometers read it from liquid columns.`,
      body: [
        r`In a fluid at rest pressure acts equally in all directions (**Pascal**) and grows with depth, $p = \gamma h$ of gauge pressure. **Absolute** pressure adds the atmosphere: 101.3 kPa = 1.013 bar = 760 mm Hg = 10.33 m of water = 14.7 psi. A **barometer** reads the atmosphere; a **vacuum** is a pressure below it.`,
        {
          type: 'plot',
          alt: 'Absolute pressure in water against depth from 0 to 20 m: 101.3 kPa at the surface, rising 9.81 kPa per metre, doubling to 202.6 kPa at 10.33 m.',
          caption: 'Absolute pressure in water: 101.3 kPa at the surface, doubled by 10.33 m down.',
          x: [0, 20],
          y: [0, 320],
          xLabel: 'depth (m)',
          yLabel: 'p (kPa abs)',
          series: [{ f: (h) => 101.3 + G * h, label: 'p', area: true }],
          marks: [{ x: 101.3 / G, label: '10.33 m' }],
        },
        r`A **manometer** reads pressure from liquid columns. Walk from one end to the other through the connected liquids, adding $\gamma h$ going down and subtracting going up; a **differential** manometer gives the difference between two points.`,
      ],
      keyIdeas: [
        r`$p = \gamma h$ (gauge); pressure head $\frac p\gamma$; 1 atm = 10.33 m of water = 760 mm Hg.`,
        r`Manometer: walk from one end to the other, adding $\gamma h$ going down and subtracting going up.`,
        r`Absolute = gauge + atmospheric.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A mercury U-tube',
          problem: r`A pipe of water connects to a mercury U-tube open to the air. From the pipe centre down 0.3 m to the mercury, the mercury stands 0.25 m higher in the open leg. Find the pipe pressure.`,
          steps: [
            r`$p_A + 9.81 \times 0.3 - 13.6 \times 9.81 \times 0.25 = 0$.`,
            r`$p_A = 33.35 - 2.94 = 30.4$ kPa gauge.`,
          ],
          answer: r`30.4 kPa gauge.`,
        },
        {
          level: 'board',
          title: 'A mountain by barometer',
          problem: r`A barometer reads 760 mm Hg at the foot of a hill and 680 mm at the top. Taking air as 12 N/m³ throughout, how high is the hill?`,
          steps: [
            r`$\Delta p = 13.6 \times 9810 \times 0.080 = 10\,673$ Pa.`,
            r`$h = \frac{10\,673}{12} = 889$ m.`,
          ],
          answer: r`About 889 m.`,
        },
      ],
      traps: [
        r`Horizontal moves in the same liquid don't change pressure; only vertical ones do.`,
        r`Mercury's specific weight is 13.6 times water's.`,
      ],
      check: [
        { q: r`What instrument measures atmospheric pressure?`, a: r`A barometer.` },
        { q: r`How many metres of water is one standard atmosphere?`, a: r`About 10.33 m.` },
      ],
    },
    {
      name: 'Hydrostatic Forces',
      inShort: r`Forces of still water on gates, walls and dams, and where they act.`,
      body: [
        r`Water presses on a submerged plane surface with a force equal to the pressure at its centroid times its area, $F = \gamma\bar hA$. Because pressure grows with depth, the force acts below the centroid, at the **centre of pressure**, $y_p = \bar y + \frac{\bar I}{\bar yA}$ (y measured along the plane from the surface line). A vertical gate from 1 m to 4 m deep carries a trapezoid of pressure:`,
        {
          type: 'plot',
          alt: 'Pressure on a vertical gate against depth: pressure rising in a straight line with depth, shaded only over the gate from 1 to 4 m deep, 9.81 to 39.2 kPa; the force acts at the centre of pressure, 2.8 m deep, below the 2.5 m centroid.',
          caption: 'A gate from 1 m to 4 m deep: the pressure trapezoid (shaded) pushes 147.2 kN through the centre of pressure, 2.8 m down.',
          x: [0, 4.5],
          y: [0, 45],
          xLabel: 'depth (m)',
          yLabel: 'p (kPa)',
          series: [
            { f: (h) => (h >= 1 && h <= 4 ? G * h : 0), label: 'on the gate', area: true },
            { f: (h) => G * h, label: 'pressure', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 2.8, label: '2.8 m' }],
        },
        r`On a curved surface, take the horizontal force on its vertical projection and the vertical force as the weight of water above it. A dam must resist both **overturning** (resisting over overturning moments) and **sliding** (friction over thrust).`,
      ],
      keyIdeas: [
        r`Plane surface: $F = \gamma\bar hA$, acting at $y_p = \bar y + \frac{\bar I}{\bar yA}$, below the centroid.`,
        r`Curved surface: $F_H$ on the vertical projection; $F_V$ = weight of water above it.`,
        r`Dams: overturning $\frac{\sum M_R}{\sum M_O}$ and sliding $\frac{\mu\sum R_y}{\sum R_x}$ factors of safety.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A vertical gate',
          problem: r`A vertical gate 2 m wide and 3 m tall has its top 1 m below the water surface. Find the force and where it acts.`,
          steps: [
            r`$\bar h = 2.5$ m: $F = 9.81 \times 2.5 \times 6 = 147.2$ kN.`,
            r`$y_p = 2.5 + \frac{2 \times 3^3/12}{2.5 \times 6} = 2.8$ m below the surface.`,
          ],
          answer: r`147.2 kN at 2.8 m depth.`,
        },
        {
          level: 'board',
          title: 'A circular gate',
          problem: r`A vertical circular gate 2 m in diameter has its top at the water surface. Find the force and the depth of the centre of pressure.`,
          steps: [
            r`$F = 9.81 \times 1 \times \pi \times 1^2 = 30.8$ kN.`,
            r`$y_p = 1 + \frac{\pi \times 1^4/4}{1 \times \pi} = 1.25$ m, that is $\frac{5D}{8}$.`,
          ],
          answer: r`30.8 kN at 1.25 m ($\frac58$ of the diameter).`,
        },
      ],
      traps: [
        r`Measure $\bar y$ along the plane of the gate, from the free-surface line.`,
        r`The centre of pressure is ALWAYS below the centroid.`,
      ],
      check: [
        { q: r`Where does the force on a rectangle reaching the surface act?`, a: r`At two thirds of its depth.` },
        { q: r`What gives the vertical force on a curved surface?`, a: r`The weight of the water above it.` },
      ],
    },
    {
      name: 'Buoyancy',
      inShort: r`Floating, sinking, and staying upright.`,
      body: [
        r`**Archimedes**: a body in a fluid is pushed up by the weight of the fluid it displaces. A floating body sinks until it displaces its own weight, so the fraction submerged is $\frac{SG_{body}}{SG_{fluid}}$; a sunk body weighs less in the fluid by the weight displaced, which is how specific gravity is found by weighing.`,
        r`Whether it floats **upright** depends on the **metacentre** M: tilting moves the centre of buoyancy B, and if M stays above the centre of gravity G the body rights itself. The **metacentric height** $GM = KB + BM - KG$, with $BM = \frac{I}{V_d}$; raising G (loading high) shrinks it:`,
        {
          type: 'plot',
          alt: 'The metacentric height of a 10 by 4 m barge floating 1.5 m deep against the height of its centre of gravity above the keel: falling in a straight line from 1.14 m at 0.5 m, through zero at 1.64 m, becoming negative and unstable above that.',
          caption: 'A 10 × 4 m barge at 1.5 m draft: stable while G is below 1.64 m above the keel (GM > 0).',
          x: [0.5, 2.5],
          y: [-1, 1.3],
          xLabel: 'KG (m)',
          yLabel: 'GM (m)',
          series: [{ f: (kg) => 0.75 + (10 * 4 ** 3) / 12 / (10 * 4 * 1.5) - kg, label: 'GM', area: true }],
          marks: [{ x: 0.75 + (10 * 4 ** 3) / 12 / (10 * 4 * 1.5), label: 'GM = 0' }],
        },
      ],
      keyIdeas: [
        r`Buoyant force = weight of fluid displaced; floating fraction $\frac{SG_{body}}{SG_{fluid}}$.`,
        r`Stability: $GM = BM - BG$ with $BM = \frac{I}{V_d}$; stable when $GM > 0$.`,
        r`Rolling period $T = \frac{2\pi k}{\sqrt{g\,GM}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Is the barge stable?',
          problem: r`A box barge 10 m × 4 m floats with a 1.5 m draft, its centre of gravity 1.2 m above the keel. Is it stable?`,
          steps: [
            r`$KB = 0.75$ m; $BM = \frac{10 \times 4^3/12}{10 \times 4 \times 1.5} = 0.889$ m.`,
            r`$GM = 0.75 + 0.889 - 1.2 = 0.44$ m > 0: stable. With G at 2 m it would capsize ($GM = -0.36$ m).`,
          ],
          answer: r`Yes: GM = 0.44 m.`,
        },
        {
          level: 'board',
          title: 'An iceberg, and weighing in liquids',
          problem: r`Ice (917 kg/m³) floats in sea water (1025 kg/m³): what fraction shows? An object weighs 2000 g in air, 1750 g in water and 1800 g in another liquid: find the object's and the liquid's specific gravity.`,
          steps: [
            r`Submerged $\frac{917}{1025} = 0.895$, so 10.5% shows.`,
            r`Water displaced 250 g: object $SG = \frac{2000}{250} = 8$.`,
            r`The liquid buoys 200 g: $SG = \frac{200}{250} = 0.8$.`,
          ],
          answer: r`10.5%; 8; 0.8.`,
        },
      ],
      traps: [
        r`I is of the WATERLINE area about the tilting axis, not of the hull's cross-section.`,
        r`Loss of weight in a liquid is the weight of liquid displaced, not the body's weight.`,
      ],
      check: [
        { q: r`What is the point where the buoyant force's line meets the body's centre line when tilted?`, a: r`The metacentre.` },
        { q: r`A body of SG 0.6 floats in water. What fraction is submerged?`, a: r`0.6.` },
      ],
    },
    {
      name: 'Relative Equilibrium',
      inShort: r`Liquids moving as a rigid body with their container.`,
      body: [
        r`A liquid accelerated steadily with its container comes to rest relative to it, its surface square to the effective gravity. Accelerated sideways at a, the surface tilts to $\tan\theta = \frac ag$; accelerated upward, pressures grow by $\left(1 + \frac ag\right)$. Spun about a vertical axis, the surface becomes a **paraboloid**, rising $\frac{\omega^2r^2}{2g}$ from the centre; the paraboloid holds half its cylinder's volume, so the surface sinks at the centre as much as it rises at the wall:`,
        {
          type: 'plot',
          alt: 'The water surface in an open cylinder of 0.3 m radius spinning at 10 rad per second, across its diameter: a parabola 0.459 m deeper at the centre than at the wall; the original level, dashed, lies halfway between.',
          caption: 'A cylinder of 0.3 m radius at 10 rad/s: the surface dips 0.459 m at the centre; the still level (dashed) lies halfway.',
          x: [-0.3, 0.3],
          y: [0, 0.6],
          xLabel: 'r (m)',
          yLabel: 'height above vertex (m)',
          series: [
            { f: (x) => (100 * x * x) / (2 * G), label: 'surface', area: true },
            { f: () => (100 * 0.09) / (4 * G), label: 'still level', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`Horizontal acceleration tilts the surface: $\tan\theta = \frac ag$.`,
        r`Vertical acceleration: $p = \gamma h\left(1 + \frac ag\right)$.`,
        r`Rotation: a paraboloid of height $\frac{\omega^2r^2}{2g}$, holding half its cylinder's volume.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Spinning and accelerating',
          problem: r`An open cylinder of 0.3 m radius spins at 10 rad/s. How far below the rim's water level is the centre of the surface? A tank accelerates at 3 m/s²: what angle does the surface take?`,
          steps: [
            r`$h = \frac{10^2 \times 0.3^2}{2 \times 9.81} = 0.459$ m.`,
            r`$\theta = \tan^{-1}\frac{3}{9.81} = 17.0°$.`,
          ],
          answer: r`0.459 m; 17.0°.`,
        },
        {
          level: 'board',
          title: 'A tank going up',
          problem: r`A tank holding water 2 m deep is lifted with an upward acceleration of 4.9 m/s². Find the pressure on its floor.`,
          steps: [r`$p = 9.81 \times 2 \times \left(1 + \frac{4.9}{9.81}\right) = 29.42$ kPa.`],
          answer: r`29.42 kPa (19.62 at rest).`,
        },
      ],
      traps: [
        r`Water spills when the rise at the wall (half of h above the original level) reaches the rim.`,
        r`Downward acceleration REDUCES the pressure: in free fall it is zero.`,
      ],
      check: [
        { q: r`What shape does the surface of a spinning liquid take?`, a: r`A paraboloid of revolution.` },
        { q: r`What is the floor pressure in a tank in free fall?`, a: r`Zero (gauge).` },
      ],
    },
    {
      name: 'Continuity Equation',
      inShort: r`What flows in must flow out.`,
      body: [
        r`For steady flow of a liquid, the volume flowing past every section each second is the same: $Q = A_1v_1 = A_2v_2$ (for a gas, the mass flow $\rho Av$). So the velocity rises where the pipe narrows, as the inverse square of the diameter:`,
        {
          type: 'plot',
          alt: 'The mean velocity of 0.1 cubic metres per second against pipe diameter from 0.1 to 0.4 m: falling steeply as one over the diameter squared, 5.66 m per second at 150 mm and 1.41 at 300 mm.',
          caption: '0.1 m³/s: 1.41 m/s in a 300 mm pipe, 5.66 m/s in 150 mm; halving the diameter quadruples the speed.',
          x: [0.1, 0.4],
          y: [0, 13],
          xLabel: 'D (m)',
          yLabel: 'v (m/s)',
          series: [{ f: (d) => (4 * 0.1) / (Math.PI * d * d), label: 'v', area: true }],
          marks: [{ x: 0.15, label: '150 mm' }, { x: 0.3, label: '300 mm' }],
        },
        r`At a junction the flows in equal the flows out.`,
      ],
      keyIdeas: [
        r`$Q = A_1v_1 = A_2v_2$; for gases $\rho_1A_1v_1 = \rho_2A_2v_2$.`,
        r`$v = \frac{4Q}{\pi D^2}$.`,
        r`At a junction, the flows in equal the flows out.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A reducer',
          problem: r`0.1 m³/s flows through a 300 mm pipe that narrows to 150 mm. Find both velocities.`,
          steps: [
            r`$v_1 = \frac{4 \times 0.1}{\pi \times 0.3^2} = 1.41$ m/s.`,
            r`Halving the diameter quadruples it: $v_2 = 5.66$ m/s.`,
          ],
          answer: r`1.41 m/s; 5.66 m/s.`,
        },
        {
          level: 'board',
          title: 'A branch',
          problem: r`0.2 m³/s divides between a 150 mm branch flowing at 4 m/s and a 200 mm branch. Find the velocity in the 200 mm branch.`,
          steps: [
            r`$Q_1 = \frac{\pi \times 0.15^2}{4} \times 4 = 0.0707$ m³/s; $Q_2 = 0.2 - 0.0707 = 0.1293$ m³/s.`,
            r`$v_2 = \frac{4 \times 0.1293}{\pi \times 0.2^2} = 4.12$ m/s.`,
          ],
          answer: r`4.12 m/s.`,
        },
      ],
      traps: [
        r`Velocity goes with the square of the diameter, not the diameter.`,
        r`Continuity balances FLOWS, not velocities.`,
      ],
      check: [
        { q: r`A pipe's diameter is tripled. What happens to the velocity at the same flow?`, a: r`It falls to a ninth.` },
        { q: r`What is conserved in continuity for a gas?`, a: r`The mass flow, $\rho Av$.` },
      ],
    },
    {
      name: 'Bernoulli and Energy Equations',
      inShort: r`Energy per unit weight: pressure, velocity and elevation heads, plus pumps and losses.`,
      body: [
        r`Along a streamline the energy per unit weight is conserved: **pressure head** $\frac p\gamma$ + **velocity head** $\frac{v^2}{2g}$ + **elevation** z, plus what pumps add and minus what friction takes. Drawn along a pipe, the **energy grade line** (EGL, total head) and the **hydraulic grade line** (HGL, pressure plus elevation) show it at a glance; at a narrowing, speed rises and the HGL dips by the extra velocity head, which is how a **venturi meter** measures flow:`,
        {
          type: 'plot',
          alt: 'Head along a pipe that narrows from 300 to 150 mm, carrying 0.1 cubic metres per second with no losses: the energy line, dashed, level at 10 m; the hydraulic grade line 0.10 m below it in the wide pipe and 1.63 m below it in the narrow one, a dip of 1.53 m.',
          caption: 'A 300 → 150 mm reducer at 0.1 m³/s: the energy line (dashed) stays level; the pressure line dips 1.53 m in the throat.',
          x: [0, 10],
          y: [7, 10.5],
          xLabel: 'distance along pipe (m)',
          yLabel: 'head (m)',
          series: [
            { f: (x) => 10 - (x < 5 ? 1.4147 ** 2 : 5.6588 ** 2) / (2 * G), label: 'HGL', area: true },
            { f: () => 10, label: 'EGL', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 5, label: 'throat' }],
        },
        r`A **pitot tube** turns the velocity head into pressure head, $v = \sqrt{2g\Delta h}$. A jet's power is $\gamma Q\frac{v^2}{2g}$.`,
      ],
      keyIdeas: [
        r`$\frac{p_1}{\gamma} + \frac{v_1^2}{2g} + z_1 + h_A = \frac{p_2}{\gamma} + \frac{v_2^2}{2g} + z_2 + h_L + h_E$.`,
        r`Venturi $Q = C_dA_2\sqrt{\frac{2g\Delta h}{1 - (A_2/A_1)^2}}$; pitot $v = \sqrt{2g\Delta h}$.`,
        r`HGL $= \frac p\gamma + z$; EGL = HGL $+ \frac{v^2}{2g}$; jet power $\gamma Q\frac{v^2}{2g}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A venturi and a pump',
          problem: r`In the 300/150 mm reduction above, what head difference does a venturi show? A pump lifts 0.05 m³/s 40 m with 6 m of losses: what power does it give the water?`,
          steps: [
            r`$\Delta h = \frac{5.66^2 - 1.41^2}{2 \times 9.81} = 1.53$ m.`,
            r`Pump head $40 + 6 = 46$ m; power $9810 \times 0.05 \times 46 = 22.6$ kW.`,
          ],
          answer: r`1.53 m; 22.6 kW.`,
        },
        {
          level: 'board',
          title: 'A pitot tube and a jet',
          problem: r`A pitot tube shows 0.5 m of head difference in water: find the velocity. A 50 mm nozzle issues a 20 m/s jet: find its power.`,
          steps: [
            r`$v = \sqrt{2 \times 9.81 \times 0.5} = 3.13$ m/s.`,
            r`$Q = \frac{\pi \times 0.05^2}{4} \times 20 = 0.0393$ m³/s; $P = 9810 \times 0.0393 \times \frac{20^2}{2 \times 9.81} = 7.85$ kW.`,
          ],
          answer: r`3.13 m/s; 7.85 kW.`,
        },
      ],
      traps: [
        r`At a reservoir surface and a free jet, the gauge pressure head is zero.`,
        r`Pump head adds on the LEFT; losses on the right.`,
      ],
      check: [
        { q: r`Which line lies above the other: energy or hydraulic grade line?`, a: r`The energy grade line, by the velocity head.` },
        { q: r`What does a pitot tube measure?`, a: r`Velocity (through the stagnation pressure).` },
      ],
    },
    {
      name: 'Momentum',
      inShort: r`Forces from changing a stream's velocity: bends, nozzles, vanes.`,
      body: [
        r`A stream pushes on whatever changes its velocity: the net force on the fluid is $\sum F = \rho Q(\vec v_{out} - \vec v_{in})$, component by component, with the pressure forces at the cut ends included. A pipe bend must be held against both its pressure and the turning of the stream; a jet leaving a tank pushes the tank back by $2\gamma hA$.`,
        r`A jet striking a vane moving away at u turns only the relative velocity $v - u$. A wheel of vanes (a Pelton wheel) catches the whole jet, so its power goes as $(v - u)u$, greatest when the vanes move at half the jet's speed:`,
        {
          type: 'plot',
          alt: 'The power taken from a jet by a wheel of vanes, as a fraction of its greatest, against vane speed as a fraction of jet speed: rising from zero, peaking at 1 when the vanes move at half the jet speed, and back to zero when they match it.',
          caption: 'A wheel of vanes takes the most power when the vanes run at half the jet’s speed.',
          x: [0, 1],
          y: [0, 1.1],
          xLabel: 'u / v',
          yLabel: 'power (fraction of best)',
          series: [{ f: (k) => 4 * k * (1 - k), label: 'P', area: true }],
          marks: [{ x: 0.5, label: 'u = v/2' }],
        },
      ],
      keyIdeas: [
        r`$\sum F = \rho Q(\vec v_{out} - \vec v_{in})$, with pressure forces at the ends included.`,
        r`Moving vane $\rho A(v - u)^2(1 - \cos\theta)$; a wheel of vanes gives most power at $u = \frac v2$.`,
        r`A jet leaving a tank pushes back with $2\gamma hA$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A pipe bend',
          problem: r`A 200 mm, 90° bend carries 0.1 m³/s at 150 kPa. Find the force to hold it.`,
          steps: [
            r`$A = 0.0314$ m², $v = 3.18$ m/s.`,
            r`Each component: $pA + \rho Qv = 4712 + 318 = 5031$ N; resultant $\sqrt2 \times 5031 = 7.11$ kN at 45°.`,
          ],
          answer: r`7.11 kN at 45°.`,
        },
        {
          level: 'board',
          title: 'Jet reaction on a tank',
          problem: r`Water leaves a tank through a 0.01 m² orifice 5 m below the surface. Find the backward push on the tank.`,
          steps: [r`$F = 2\gamma hA = 2 \times 9810 \times 5 \times 0.01 = 981$ N.`],
          answer: r`981 N.`,
        },
      ],
      traps: [
        r`Pressure forces usually dwarf the momentum part; don't leave them out.`,
        r`The jet reaction is TWICE $\gamma hA$, not once.`,
      ],
      check: [
        { q: r`At what vane speed does a Pelton wheel give most power?`, a: r`Half the jet speed.` },
        { q: r`Does a straight pipe of constant size at steady flow feel a momentum force?`, a: r`No: the velocity does not change.` },
      ],
    },
    {
      name: 'Pipe Flow and Head Losses',
      inShort: r`Friction and fitting losses in pipes, laminar and turbulent.`,
      body: [
        r`The **Reynolds number** $Re = \frac{\rho vD}{\mu} = \frac{vD}{\nu}$ compares inertia with viscosity. Below about 2000 the flow is **laminar** (smooth layers); above about 4000 it is **turbulent**; between lies a transition. Friction loss in a pipe follows **Darcy–Weisbach**, $h_f = f\frac LD\frac{v^2}{2g}$, with the friction factor falling with Re:`,
        {
          type: 'plot',
          alt: 'The friction factor against Reynolds number on a log scale from 500 to one million: in laminar flow, below about 2000, it falls as 64 over Re; after a gap for the transition, turbulent flow in a smooth pipe from 4000 on has a factor that falls slowly, by the Blasius formula.',
          caption: 'Friction factor: laminar 64/Re below 2000; a transition gap; turbulent in a smooth pipe (Blasius) beyond 4000.',
          x: [500, 1000000],
          logX: true,
          y: [0, 0.14],
          xLabel: 'Re',
          yLabel: 'f',
          series: [
            { points: logPoints(500, 2000, (re) => 64 / re), label: 'laminar', area: true },
            { points: logPoints(4000, 1e6, (re) => 0.316 / re ** 0.25), label: 'turbulent', area: true },
          ],
          legend: false,
          marks: [{ x: 2000, label: '2000' }],
        },
        r`Valves, bends and changes of section add **minor losses** $K\frac{v^2}{2g}$; a sudden enlargement loses $\frac{(v_1 - v_2)^2}{2g}$ and a pipe's exit into a tank its whole velocity head.`,
      ],
      keyIdeas: [
        r`$Re = \frac{\rho vD}{\mu}$: laminar below about 2000 ($f = \frac{64}{Re}$, $v_{max} = 2v$), turbulent above about 4000.`,
        r`Darcy $h_f = f\frac LD\frac{v^2}{2g}$; turbulent f from Moody or Swamee-Jain; also Hazen-Williams and Manning.`,
        r`Minor losses $K\frac{v^2}{2g}$; sudden enlargement $\frac{(v_1 - v_2)^2}{2g}$; exit $\frac{v^2}{2g}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Friction in a long pipe',
          problem: r`Find the friction loss when 0.1 m³/s flows through 500 m of 300 mm pipe with f = 0.02.`,
          steps: [
            r`$v = 1.41$ m/s.`,
            r`$h_f = 0.02 \times \frac{500}{0.3} \times \frac{1.41^2}{2 \times 9.81} = 3.40$ m.`,
          ],
          answer: r`3.40 m.`,
        },
        {
          level: 'board',
          title: 'Laminar oil',
          problem: r`Oil (ν = 10⁻⁴ m²/s) flows at 1.5 m/s in a 100 mm pipe. Is it laminar? Find the friction loss over 100 m.`,
          steps: [
            r`$Re = \frac{1.5 \times 0.1}{10^{-4}} = 1500$: laminar, $f = \frac{64}{1500} = 0.0427$.`,
            r`$h_f = 0.0427 \times \frac{100}{0.1} \times \frac{1.5^2}{2 \times 9.81} = 4.89$ m.`,
          ],
          answer: r`Laminar; 4.89 m.`,
        },
      ],
      traps: [
        r`Halving the diameter at the same flow raises the loss about 32 times ($D^5$).`,
        r`Use KINEMATIC viscosity with $\frac{vD}{\nu}$.`,
      ],
      check: [
        { q: r`Below what Reynolds number is pipe flow laminar?`, a: r`About 2000.` },
        { q: r`In laminar pipe flow, how does the centre-line velocity compare with the mean?`, a: r`It is twice the mean.` },
      ],
    },
    {
      name: 'Pipes in Series and Parallel',
      inShort: r`Pipe networks: series pipes add losses, parallel pipes add flows.`,
      body: [
        r`Pipe networks follow the rules of electric circuits with flow for current and head loss for voltage: pipes in **series** carry the same flow and their losses add; pipes in **parallel** share the same loss between their ends and their flows add. With equal friction factors, parallel pipes split the flow as $\sqrt{\frac{D^5}{L}}$.`,
        r`| Arrangement | Flow | Head loss |
|---|---|---|
| Series | same in each | sum of the pipes' losses |
| Parallel | sum of the branches | same in each branch |
| Equivalent pipe | one pipe giving the same loss at the same flow | $L_e = L\left(\frac{D_e}{D}\right)^5$ |`,
        r`Three connected reservoirs are solved by finding the junction head at which the flows in and out balance.`,
      ],
      keyIdeas: [
        r`Series: same Q, losses add. Parallel: same loss, flows add; with equal f, $Q_i \propto \sqrt{\frac{D_i^5}{L_i}}$.`,
        r`Equivalent length $L_e = L\left(\frac{D_e}{D}\right)^5$.`,
        r`Three reservoirs: find the junction head at which the flows balance.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two pipes in parallel',
          problem: r`0.2 m³/s splits between a 500 m, 300 mm pipe and an 800 m, 200 mm pipe (f = 0.02 both). How does it divide, and what is the loss?`,
          steps: [
            r`$\sqrt{\frac{0.3^5}{500}} : \sqrt{\frac{0.2^5}{800}}$ gives 0.155 and 0.045 m³/s.`,
            r`Loss $\frac{8 \times 0.02 \times 500 \times 0.155^2}{9.81\pi^2 \times 0.3^5} = 8.2$ m in each.`,
          ],
          answer: r`0.155 and 0.045 m³/s; 8.2 m.`,
        },
        {
          level: 'board',
          title: 'An equivalent length',
          problem: r`What length of 300 mm pipe has the same loss as 300 m of 200 mm pipe at the same flow and f?`,
          steps: [r`$L_e = 300 \times \left(\frac{0.3}{0.2}\right)^5 = 2278$ m.`],
          answer: r`2278 m.`,
        },
      ],
      traps: [
        r`In parallel the LOSS is common, not the velocity.`,
        r`Equivalent length goes with the FIFTH power of the diameter ratio.`,
      ],
      check: [
        { q: r`Two parallel branches: which is the same in both?`, a: r`The head loss.` },
        { q: r`What do pipe networks resemble?`, a: r`Electric circuits: flow like current, head loss like voltage.` },
      ],
    },
    {
      name: 'Orifices and Weirs',
      inShort: r`Measuring and releasing flow through openings and over crests.`,
      body: [
        r`Through a sharp-edged **orifice** a jet leaves at almost $\sqrt{2gh}$ (velocity coefficient $C_v$) and contracts (contraction coefficient $C_c$): $Q = C_dA\sqrt{2gh}$ with $C_d = C_cC_v \approx 0.61$. As a tank drains the head falls, and with it the flow, so the level drops fast at first and slowly at the end:`,
        {
          type: 'plot',
          alt: 'The head in a 2 square metre tank draining through a 0.002 square metre orifice with discharge coefficient 0.61, against time: falling from 4 m along a parabola, reaching 1 m at 740 s and empty at 1480 s.',
          caption: 'A draining tank: 4 m to 1 m takes 740 s, and the last metre as long again.',
          x: [0, 1500],
          y: [0, 4.4],
          xLabel: 't (s)',
          yLabel: 'h (m)',
          series: [{ f: drain, label: 'h', area: true }],
          marks: [{ y: 1, label: '1 m' }],
        },
        r`**Weirs** measure open-channel flow by the head H over a crest:`,
        r`| Weir | Flow (SI) |
|---|---|
| Rectangular | $\frac23C_d\sqrt{2g}LH^{3/2}$; Francis $1.84(L - 0.1nH)H^{3/2}$ (n end contractions) |
| 90° V-notch | $1.38H^{5/2}$ (generally $\frac{8}{15}C_d\sqrt{2g}\tan\frac\theta2H^{5/2}$) |
| Cipolletti (trapezoidal) | $1.859LH^{3/2}$ |`,
      ],
      keyIdeas: [
        r`Orifice $Q = C_dA\sqrt{2gh}$, $C_d = C_cC_v \approx 0.61$; draining time $\frac{2A_s(\sqrt{h_1} - \sqrt{h_2})}{C_dA_o\sqrt{2g}}$.`,
        r`Rectangular weir $\frac23C_d\sqrt{2g}LH^{3/2}$ (Francis $1.84(L - 0.1nH)H^{3/2}$).`,
        r`V-notch $\frac{8}{15}C_d\sqrt{2g}\tan\frac\theta2H^{5/2}$ (90°: $1.38H^{5/2}$); Cipolletti $1.859LH^{3/2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Draining a tank',
          problem: r`A tank of 2 m² plan area drains through a 0.002 m² orifice ($C_d = 0.61$). How long does the head take to fall from 4 m to 1 m?`,
          steps: [r`$t = \frac{2 \times 2 \times (\sqrt4 - \sqrt1)}{0.61 \times 0.002\sqrt{2 \times 9.81}} = 740$ s, about 12.3 min.`],
          answer: r`740 s.`,
        },
        {
          level: 'board',
          title: 'Two weirs',
          problem: r`Find the flow over a 90° V-notch with 0.3 m head, and over a 2 m Francis weir with two end contractions and 0.4 m head.`,
          steps: [
            r`V-notch: $1.38 \times 0.3^{2.5} = 0.0680$ m³/s.`,
            r`Francis: $1.84(2 - 0.1 \times 2 \times 0.4) \times 0.4^{1.5} = 0.894$ m³/s.`,
          ],
          answer: r`0.0680 m³/s; 0.894 m³/s.`,
        },
      ],
      traps: [
        r`The head on a weir is measured upstream, above the crest, not at the crest.`,
        r`Draining time depends on the SQUARE ROOT of the heads.`,
      ],
      check: [
        { q: r`What is the usual discharge coefficient of a sharp-edged orifice?`, a: r`About 0.61.` },
        { q: r`How does a V-notch's flow grow with head?`, a: r`As $H^{5/2}$.` },
      ],
    },
    {
      name: 'Open Channels',
      inShort: r`Flow with a free surface: rivers, canals, partly full pipes.`,
      body: [
        r`In a channel with a free surface, uniform flow is set by the slope and roughness: **Manning** $v = \frac1nR^{2/3}S^{1/2}$, with the **hydraulic radius** $R = \frac{A}{P_w}$ (area over wetted perimeter). For a given flow per width q, the **specific energy** $E = y + \frac{q^2}{2gy^2}$ is least at the **critical depth** $y_c = \sqrt[3]{\frac{q^2}{g}}$, where the Froude number is 1; deeper flow is slow (subcritical), shallower is fast (supercritical):`,
        {
          type: 'plot',
          alt: 'Specific energy against depth for 3 cubic metres per second per metre width: large at shallow depths, falling to a minimum of 1.46 m at the critical depth of 0.97 m, then rising nearly as the depth itself.',
          caption: 'Specific energy for q = 3 m³/s per metre: least (1.46 m) at the critical depth, 0.97 m.',
          x: [0.4, 3],
          y: [0, 4],
          xLabel: 'y (m)',
          yLabel: 'E (m)',
          series: [{ f: (y) => y + 9 / (2 * G * y * y), label: 'E', area: true }],
          marks: [{ x: Math.cbrt(9 / G), label: 'y_c' }],
        },
        r`Fast flow can drop abruptly to slow flow in a **hydraulic jump**, $\frac{y_2}{y_1} = \frac12\left(\sqrt{1 + 8Fr_1^2} - 1\right)$, losing energy. The most efficient sections carry most for least perimeter ($R = \frac y2$).`,
      ],
      keyIdeas: [
        r`Manning $v = \frac1nR^{2/3}S^{1/2}$ with $R = \frac{A}{P_w}$; Chezy $v = C\sqrt{RS}$.`,
        r`Specific energy $y + \frac{v^2}{2g}$; rectangular critical depth $\sqrt[3]{\frac{q^2}{g}}$, where Fr = 1.`,
        r`Hydraulic jump $\frac{y_2}{y_1} = \frac12(\sqrt{1 + 8Fr_1^2} - 1)$; best sections have $R = \frac y2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A concrete channel',
          problem: r`A rectangular concrete channel 3 m wide runs 1.5 m deep on a slope of 0.001 (n = 0.013). Find the flow. What is the critical depth for 3 m³/s per metre width?`,
          steps: [
            r`$R = \frac{4.5}{6} = 0.75$ m; $v = \frac{1}{0.013} \times 0.75^{2/3} \times 0.001^{1/2} = 2.01$ m/s; $Q = 9.04$ m³/s.`,
            r`$y_c = \sqrt[3]{\frac{9}{9.81}} = 0.97$ m.`,
          ],
          answer: r`9.04 m³/s; 0.97 m.`,
        },
        {
          level: 'board',
          title: 'A hydraulic jump',
          problem: r`Water runs 0.4 m deep at 6 m/s in a wide channel. Find the Froude number and the depth after a jump.`,
          steps: [
            r`$Fr_1 = \frac{6}{\sqrt{9.81 \times 0.4}} = 3.03$.`,
            r`$y_2 = 0.2\left(\sqrt{1 + 8 \times 3.03^2} - 1\right) = 1.53$ m.`,
          ],
          answer: r`3.03; 1.53 m.`,
        },
      ],
      traps: [
        r`Manning's 1 becomes 1.486 in English units.`,
        r`The wetted perimeter leaves out the free surface.`,
      ],
      check: [
        { q: r`What is the Froude number at critical depth?`, a: r`1.` },
        { q: r`What is the hydraulic radius of a rectangular channel 4 m wide flowing 1 m deep?`, a: r`$\frac{4}{6} = 0.667$ m.` },
      ],
    },
    {
      name: 'Pumps and Turbines',
      inShort: r`Machines that add energy to water or take it out.`,
      body: [
        r`A **pump** adds head to water, needing shaft power $\frac{\gamma QH}{\eta}$; a **turbine** takes head out, giving $\eta\gamma QH$. A centrifugal pump's head falls as its flow rises; slowing it shifts the whole curve by the **affinity laws**: flow in proportion to speed, head as its square, power as its cube:`,
        {
          type: 'plot',
          alt: 'Head against flow for a centrifugal pump at 1750 rpm, solid, from 40 m at shut-off through 30 m at 0.05 cubic metres per second, and at 1450 rpm, dashed, lower by the square of the speed ratio.',
          caption: 'A pump at 1750 rpm (solid) and 1450 rpm (dashed): head falls with the square of speed.',
          x: [0, 0.1],
          y: [0, 45],
          xLabel: 'Q (m³/s)',
          yLabel: 'H (m)',
          series: [
            { f: (q) => Math.max(0, 40 - 4000 * q * q), label: '1750 rpm' },
            { f: (q) => Math.max(0, 40 * (1450 / 1750) ** 2 - 4000 * q * q), label: '1450 rpm', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 0.05, label: '0.05' }],
        },
        r`A pump must not **cavitate**: the pressure at its inlet must stay above the vapour pressure by the margin it needs (net positive suction head). Specific speed picks the machine type: Pelton for high heads, Francis for medium, Kaplan and propeller for low heads and large flows.`,
      ],
      keyIdeas: [
        r`Pump shaft power $\frac{\gamma QH}{\eta}$; turbine output $\eta\gamma QH$.`,
        r`Affinity laws: $Q \propto N$, $H \propto N^2$, $P \propto N^3$; specific speed picks the machine type.`,
        r`Avoid cavitation: $NPSH_A = \frac{p_{atm}}{\gamma} - z_s - h_{fs} - \frac{p_v}{\gamma}$ must exceed the pump's NPSH required.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Slowing a pump',
          problem: r`A pump gives 0.05 m³/s at 30 m head at 1750 rpm. What does it give at 1450 rpm, and how much power does it then need?`,
          steps: [
            r`$Q = 0.05 \times \frac{1450}{1750} = 0.0414$ m³/s; $H = 30\left(\frac{1450}{1750}\right)^2 = 20.6$ m.`,
            r`Power falls to $\left(\frac{1450}{1750}\right)^3 = 57\%$.`,
          ],
          answer: r`0.0414 m³/s; 20.6 m; 57% of the power.`,
        },
        {
          level: 'board',
          title: 'Shaft power and suction head',
          problem: r`The pump gives 0.05 m³/s at 30 m with 75% efficiency: find its shaft power. It lifts water 4 m from a sump with 1 m of suction losses; vapour pressure head 0.24 m and atmosphere 10.33 m. Find the available NPSH.`,
          steps: [
            r`$P = \frac{9810 \times 0.05 \times 30}{0.75} = 19.62$ kW.`,
            r`$NPSH_A = 10.33 - 4 - 1 - 0.24 = 5.09$ m.`,
          ],
          answer: r`19.62 kW; 5.09 m.`,
        },
      ],
      traps: [
        r`A pump above its sump has a suction LIFT: $z_s$ is subtracted.`,
        r`Power goes as the CUBE of speed: a small slow-down saves a lot.`,
      ],
      check: [
        { q: r`Which turbine suits a very high head?`, a: r`The Pelton (impulse) wheel.` },
        { q: r`A pump's speed doubles. What happens to its head?`, a: r`It quadruples.` },
      ],
    },
  ],
};
