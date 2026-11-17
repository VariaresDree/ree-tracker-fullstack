// Library › Lessons › ESAS › Fluid Mechanics (2026-11-17): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by computation. Physics for Engineers covers
// density, Pascal's principle, gauge pressure and capillarity.
const r = String.raw;

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
      keyIdeas: [
        r`$\gamma = \rho g$; $SG = \frac{\rho}{\rho_w}$; water 1000 kg/m³, 9.81 kN/m³.`,
        r`Newton's law of viscosity $\tau = \mu\frac{du}{dy}$; $\nu = \frac\mu\rho$.`,
        r`Surface tension: droplet $\Delta p = \frac{2\sigma}{r}$, bubble $\frac{4\sigma}{r}$. Liquids are nearly incompressible ($E_v \approx 2.2$ GPa for water).`,
      ],
      example: {
        problem: r`Find the specific weight of an oil with SG 0.85. A plate slides at 2 m/s on a 1 mm oil film with $\mu = 0.4$ Pa·s: find the shear stress.`,
        solution: r`$\gamma = 0.85(9.81) = 8.34$ kN/m³. $\tau = \frac{0.4(2)}{0.001} = 800$ Pa.`,
      },
      traps: [r`Kinematic viscosity (m²/s) and dynamic viscosity (Pa·s) are different; check the unit given.`],
    },
    {
      name: 'Pressure and Manometers',
      inShort: r`Pressure grows with depth; manometers read it from liquid columns.`,
      keyIdeas: [
        r`$p = \gamma h$ (gauge); pressure head $\frac p\gamma$; 1 atm = 10.33 m of water = 760 mm Hg.`,
        r`Manometer: walk from one end to the other, adding $\gamma h$ going down and subtracting going up.`,
        r`Absolute = gauge + atmospheric.`,
      ],
      example: {
        problem: r`A pipe of water connects to a mercury U-tube open to the air. From the pipe centre down 0.3 m to the mercury, the mercury stands 0.25 m higher in the open leg. Find the pipe pressure.`,
        solution: r`$p_A + 9.81(0.3) - 13.6(9.81)(0.25) = 0$, so $p_A = 33.35 - 2.94 = 30.4$ kPa gauge.`,
      },
      traps: [r`Horizontal moves in the same liquid don't change pressure; only vertical ones do.`],
    },
    {
      name: 'Hydrostatic Forces',
      inShort: r`Forces of still water on gates, walls and dams, and where they act.`,
      keyIdeas: [
        r`Plane surface: $F = \gamma\bar hA$, acting at $y_p = \bar y + \frac{\bar I}{\bar yA}$, below the centroid.`,
        r`Curved surface: $F_H$ on the vertical projection; $F_V$ = weight of water above it.`,
        r`Dams: overturning $\frac{\sum M_R}{\sum M_O}$ and sliding $\frac{\mu\sum R_y}{\sum R_x}$ factors of safety.`,
      ],
      example: {
        problem: r`A vertical gate 2 m wide and 3 m tall has its top 1 m below the water surface. Find the force and where it acts.`,
        solution: r`$\bar h = 2.5$ m: $F = 9.81(2.5)(6) = 147.2$ kN. $y_p = 2.5 + \frac{2(3)^3/12}{2.5(6)} = 2.8$ m below the surface.`,
      },
      traps: [r`Measure $\bar y$ along the plane of the gate, from the free-surface line.`],
    },
    {
      name: 'Buoyancy',
      inShort: r`Floating, sinking, and staying upright.`,
      keyIdeas: [
        r`Buoyant force = weight of fluid displaced; floating fraction $\frac{SG_{body}}{SG_{fluid}}$.`,
        r`Stability: $GM = BM - BG$ with $BM = \frac{I}{V_d}$; stable when $GM > 0$.`,
        r`Rolling period $T = \frac{2\pi k}{\sqrt{g\,GM}}$.`,
      ],
      example: {
        problem: r`A box barge 10 m × 4 m floats with a 1.5 m draft, its centre of gravity 1.2 m above the keel. Is it stable?`,
        solution: r`$KB = 0.75$ m; $BM = \frac{10(4)^3/12}{10(4)(1.5)} = 0.889$ m; $GM = 0.75 + 0.889 - 1.2 = 0.44$ m > 0: stable. With G at 2 m it would capsize ($GM = -0.36$ m).`,
      },
      traps: [r`$I$ is of the WATERLINE area about the tilting axis, not of the hull's cross-section.`],
    },
    {
      name: 'Relative Equilibrium',
      inShort: r`Liquids moving as a rigid body with their container.`,
      keyIdeas: [
        r`Horizontal acceleration tilts the surface: $\tan\theta = \frac ag$.`,
        r`Vertical acceleration: $p = \gamma h\left(1 + \frac ag\right)$.`,
        r`Rotation: a paraboloid of height $\frac{\omega^2r^2}{2g}$, holding half its cylinder's volume.`,
      ],
      example: {
        problem: r`An open cylinder of 0.3 m radius spins at 10 rad/s. How far below the rim is the centre of the surface? A tank accelerates at 3 m/s²: what angle does the surface take?`,
        solution: r`$h = \frac{10^2(0.3)^2}{2(9.81)} = 0.459$ m. $\theta = \tan^{-1}\frac{3}{9.81} = 17.0^\circ$.`,
      },
      traps: [r`Water spills when the rise at the wall (half of $h$ above the original level) reaches the rim.`],
    },
    {
      name: 'Continuity Equation',
      inShort: r`What flows in must flow out.`,
      keyIdeas: [
        r`$Q = A_1v_1 = A_2v_2$; for gases $\rho_1A_1v_1 = \rho_2A_2v_2$.`,
        r`$v = \frac{4Q}{\pi D^2}$.`,
        r`At a junction, the flows in equal the flows out.`,
      ],
      example: {
        problem: r`0.1 m³/s flows through a 300 mm pipe that narrows to 150 mm. Find both velocities.`,
        solution: r`$v_1 = \frac{4(0.1)}{\pi(0.3)^2} = 1.41$ m/s; halving the diameter quadruples it: $v_2 = 5.66$ m/s.`,
      },
      traps: [r`Velocity goes with the square of the diameter, not the diameter.`],
    },
    {
      name: 'Bernoulli and Energy Equations',
      inShort: r`Energy per unit weight: pressure, velocity and elevation heads, plus pumps and losses.`,
      keyIdeas: [
        r`$\frac{p_1}{\gamma} + \frac{v_1^2}{2g} + z_1 + h_A = \frac{p_2}{\gamma} + \frac{v_2^2}{2g} + z_2 + h_L + h_E$.`,
        r`Venturi $Q = C_dA_2\sqrt{\frac{2g\Delta h}{1 - (A_2/A_1)^2}}$; pitot $v = \sqrt{2g\Delta h}$.`,
        r`HGL $= \frac p\gamma + z$; EGL = HGL $+ \frac{v^2}{2g}$; jet power $\gamma Q\frac{v^2}{2g}$.`,
      ],
      example: {
        problem: r`In the 300/150 mm reduction above, what head difference does a venturi show? A pump lifts 0.05 m³/s 40 m with 6 m of losses: what power does it give the water?`,
        solution: r`$\Delta h = \frac{5.66^2 - 1.41^2}{2(9.81)} = 1.53$ m. Pump head $40 + 6 = 46$ m; power $9810(0.05)(46) = 22.6$ kW.`,
      },
      traps: [r`At a reservoir surface and a free jet, the gauge pressure head is zero.`],
    },
    {
      name: 'Momentum',
      inShort: r`Forces from changing a stream's velocity: bends, nozzles, vanes.`,
      keyIdeas: [
        r`$\sum F = \rho Q(\vec v_{\text{out}} - \vec v_{\text{in}})$, with pressure forces at the ends included.`,
        r`Moving vane $\rho A(v - u)^2(1 - \cos\theta)$; a wheel of vanes gives most power at $u = \frac v2$.`,
        r`A jet leaving a tank pushes back with $2\gamma hA$.`,
      ],
      example: {
        problem: r`A 200 mm, 90° bend carries 0.1 m³/s at 150 kPa. Find the force to hold it.`,
        solution: r`$A = 0.0314$ m², $v = 3.18$ m/s. Each component: $pA + \rho Qv = 4712 + 318 = 5031$ N; resultant $\sqrt2(5031) = 7.11$ kN at 45°.`,
      },
      traps: [r`Pressure forces usually dwarf the momentum part; don't leave them out.`],
    },
    {
      name: 'Pipe Flow and Head Losses',
      inShort: r`Friction and fitting losses in pipes, laminar and turbulent.`,
      keyIdeas: [
        r`$Re = \frac{\rho vD}{\mu}$: laminar below about 2100, $f = \frac{64}{Re}$, $v_{\max} = 2v$.`,
        r`Darcy $h_f = f\frac LD\frac{v^2}{2g}$; turbulent $f$ from Moody or Swamee-Jain; also Hazen-Williams and Manning.`,
        r`Minor losses $K\frac{v^2}{2g}$; sudden enlargement $\frac{(v_1 - v_2)^2}{2g}$; exit $\frac{v^2}{2g}$.`,
      ],
      example: {
        problem: r`Find the friction loss when 0.1 m³/s flows through 500 m of 300 mm pipe with $f = 0.02$.`,
        solution: r`$v = 1.41$ m/s; $h_f = 0.02\cdot\frac{500}{0.3}\cdot\frac{1.41^2}{2(9.81)} = 3.40$ m.`,
      },
      traps: [r`Halving the diameter at the same flow raises the loss about 32 times ($D^5$).`],
    },
    {
      name: 'Pipes in Series and Parallel',
      inShort: r`Pipe networks: series pipes add losses, parallel pipes add flows.`,
      keyIdeas: [
        r`Series: same $Q$, losses add. Parallel: same loss, flows add; with equal $f$, $Q_i \propto \sqrt{\frac{D_i^5}{L_i}}$.`,
        r`Equivalent length $L_e = L\left(\frac{D_e}{D}\right)^5$.`,
        r`Three reservoirs: find the junction head at which the flows balance.`,
      ],
      example: {
        problem: r`0.2 m³/s splits between a 500 m, 300 mm pipe and an 800 m, 200 mm pipe ($f = 0.02$ both). How does it divide, and what is the loss?`,
        solution: r`$\sqrt{\frac{0.3^5}{500}} : \sqrt{\frac{0.2^5}{800}}$ gives 0.155 and 0.045 m³/s. Loss $\frac{8(0.02)(500)(0.155)^2}{9.81\pi^2(0.3)^5} = 8.2$ m in each.`,
      },
      traps: [r`In parallel the LOSS is common, not the velocity.`],
    },
    {
      name: 'Orifices and Weirs',
      inShort: r`Measuring and releasing flow through openings and over crests.`,
      keyIdeas: [
        r`Orifice $Q = C_dA\sqrt{2gh}$, $C_d = C_cC_v \approx 0.61$; draining time $\frac{2A_s(\sqrt{h_1} - \sqrt{h_2})}{C_dA_o\sqrt{2g}}$.`,
        r`Rectangular weir $\frac23C_d\sqrt{2g}LH^{3/2}$ (Francis $1.84(L - 0.1nH)H^{3/2}$).`,
        r`V-notch $\frac{8}{15}C_d\sqrt{2g}\tan\frac\theta2H^{5/2}$ (90°: $1.38H^{5/2}$); Cipolletti $1.859LH^{3/2}$.`,
      ],
      example: {
        problem: r`A tank of 2 m² plan area drains through a 0.002 m² orifice ($C_d = 0.61$). How long does the head take to fall from 4 m to 1 m?`,
        solution: r`$t = \frac{2(2)(\sqrt4 - \sqrt1)}{0.61(0.002)\sqrt{2(9.81)}} = 740$ s, about 12.3 min.`,
      },
      traps: [r`The head on a weir is measured upstream, above the crest, not at the crest.`],
    },
    {
      name: 'Open Channels',
      inShort: r`Flow with a free surface: rivers, canals, partly full pipes.`,
      keyIdeas: [
        r`Manning $v = \frac1nR^{2/3}S^{1/2}$ with $R = \frac{A}{P_w}$; Chezy $v = C\sqrt{RS}$.`,
        r`Specific energy $y + \frac{v^2}{2g}$; rectangular critical depth $\sqrt[3]{\frac{q^2}{g}}$, where $Fr = 1$.`,
        r`Hydraulic jump $\frac{y_2}{y_1} = \frac12(\sqrt{1 + 8Fr_1^2} - 1)$; best sections have $R = \frac y2$.`,
      ],
      example: {
        problem: r`A rectangular concrete channel 3 m wide runs 1.5 m deep on a slope of 0.001 ($n = 0.013$). Find the flow. What is the critical depth for 3 m³/s per metre width?`,
        solution: r`$R = \frac{4.5}{6} = 0.75$ m; $v = \frac{1}{0.013}(0.75)^{2/3}(0.001)^{1/2} = 2.01$ m/s; $Q = 9.04$ m³/s. $y_c = \sqrt[3]{\frac{9}{9.81}} = 0.97$ m.`,
      },
      traps: [r`Manning's 1 becomes 1.486 in English units.`],
    },
    {
      name: 'Pumps and Turbines',
      inShort: r`Machines that add energy to water or take it out.`,
      keyIdeas: [
        r`Pump shaft power $\frac{\gamma QH}{\eta}$; turbine output $\eta\gamma QH$.`,
        r`Affinity laws: $Q \propto N$, $H \propto N^2$, $P \propto N^3$; specific speed picks the machine type.`,
        r`Avoid cavitation: $NPSH_A = \frac{p_{atm}}{\gamma} - z_s - h_{fs} - \frac{p_v}{\gamma}$ must exceed the pump's NPSH required.`,
      ],
      example: {
        problem: r`A pump gives 0.05 m³/s at 30 m head at 1750 rpm. What does it give at 1450 rpm, and how much power does it then need?`,
        solution: r`$Q = 0.05\cdot\frac{1450}{1750} = 0.0414$ m³/s; $H = 30\left(\frac{1450}{1750}\right)^2 = 20.6$ m; power falls to $\left(\frac{1450}{1750}\right)^3 = 57\%$.`,
      },
      traps: [r`A pump above its sump has a suction LIFT: $z_s$ is subtracted.`],
    },
  ],
};
