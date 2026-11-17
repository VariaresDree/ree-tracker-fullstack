'use strict';

// ESAS › Fluid Mechanics formula cards (Library round, 2026-11-17): 9 live
// cards for 13 subtopics, mostly hydrostatics, Bernoulli and pipe friction.
// Physics for Engineers holds density, Pascal's principle, gauge pressure,
// capillarity and Stokes' law, and Engineering Mechanics the force of a jet
// on a plate, so this file adds the rest of hydraulics: fluid properties,
// manometers, forces on submerged surfaces, stability, relative equilibrium,
// meters, momentum, pipe losses and networks, orifices, weirs, open channels,
// pumps and turbines. Formula cards carry SI units. See
// mathematics/algebra.js for the format; tests/fluidMechanicsFormulas.test.js
// checks each by an independent route: integrating pressure over surfaces,
// stepping a draining tank, and conservation of mass, momentum and energy.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const PROP = 'Fluid Properties';
const MANO = 'Pressure and Manometers';
const HYD = 'Hydrostatic Forces';
const BUOY = 'Buoyancy';
const REL = 'Relative Equilibrium';
const CONT = 'Continuity Equation';
const BERN = 'Bernoulli and Energy Equations';
const MOM = 'Momentum';
const PIPE = 'Pipe Flow and Head Losses';
const NET = 'Pipes in Series and Parallel';
const ORIF = 'Orifices and Weirs';
const OPEN = 'Open Channels';
const PUMP = 'Pumps and Turbines';
const CONST = 'Constants';

const file = [
    ['63da5361-4e0a-4452-b63d-b95038151315', PROP, null], // Specific Gravity
    ['877a06a8-f7a2-4eea-855b-2bbc28c57082', MANO, null], // Hydrostatic Pressure
    ['84cbb42f-6547-4524-839c-294e64cf5fc0', BUOY, null], // Buoyant Force
    ['24c8ce3e-30b1-451f-871e-03f3a343c4ed', CONT, null], // Continuity Equation
    ['5b28ee6c-ecdb-471e-954f-f5f779f3fa0f', BERN, null], // Bernoulli Equation
    ['fc112c17-11cc-4601-a4f4-528343db18ff', PIPE, null], // Reynolds Number
    ['973e0d80-f962-4075-87cb-8cd1493f0162', PIPE, null], // Darcy-Weisbach Head Loss
    ['e1e0918d-2356-479d-97b3-4e001491e6f7', ORIF, null], // Torricelli's Theorem
    ['ba46066f-d79a-4002-b06f-a1e899fc316e', PUMP, null], // Pump Power
];

const revisions = [
    { id: '5b28ee6c-ecdb-471e-954f-f5f779f3fa0f', note: 'It had no result unit: every term is a head in metres.', unit: r`$\text{m}$` },
];

const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const PA = r`$\text{Pa}$`;
const GAM = v(r`$\gamma$`, 'specific weight', r`$\text{N/m}^3$`);
const RHO = v(r`$\rho$`, 'density', r`$\text{kg/m}^3$`);
const G_ = v(r`$g$`, 'acceleration due to gravity', r`$\text{m/s}^2$`);
const Q_ = v(r`$Q$`, 'flow rate', r`$\text{m}^3\text{/s}$`);
const V_ = v(r`$v$`, 'mean velocity', r`$\text{m/s}$`);
const D_ = v(r`$D$`, 'pipe diameter', r`$\text{m}$`);
const H_ = v(r`$H$`, 'head', r`$\text{m}$`);
const AREA = v(r`$A$`, 'area', r`$\text{m}^2$`);

const drafts = [
    // Fluid Properties
    P(PROP, null, 'Specific Weight and Specific Volume', r`$\gamma$`, r`$\gamma = \rho g,\qquad v_s = \frac{1}{\rho}$`,
        [RHO, G_],
        'Weight per unit volume, and volume per unit mass.',
        'Water: γ = 9.81 kN/m³; SG × 9.81 gives any liquid\'s γ in kN/m³.', r`$\text{N/m}^3$`),
    P(PROP, null, 'Dynamic and Kinematic Viscosity', r`$\tau = \mu\frac{du}{dy}$`, r`$\tau = \mu\frac{du}{dy},\qquad \nu = \frac{\mu}{\rho}$`,
        [v(r`$\mu$`, 'dynamic viscosity', r`$\text{Pa}\cdot\text{s}$`), v(r`$\frac{du}{dy}$`, 'velocity gradient', r`$\text{1/s}$`), v(r`$\nu$`, 'kinematic viscosity', r`$\text{m}^2\text{/s}$`)],
        'Newton\'s law of viscosity: shear stress is proportional to the rate of shearing.',
        r`A plate sliding at $V$ on a film of thickness $t$: $\tau = \frac{\mu V}{t}$. 1 poise = 0.1 Pa·s.`, PA),
    P(PROP, null, 'Pressure in a Droplet and a Bubble', r`$\Delta p$`, r`$\text{droplet or jet surface: } \Delta p = \frac{2\sigma}{r};\qquad \text{soap bubble (two surfaces): } \Delta p = \frac{4\sigma}{r}$`,
        [v(r`$\sigma$`, 'surface tension', r`$\text{N/m}$`), v(r`$r$`, 'radius', r`$\text{m}$`)],
        'Surface tension raises the pressure inside a curved surface.',
        'Water at 20 °C: σ ≈ 0.0728 N/m. Smaller drops have higher inside pressure.', PA),
    P(PROP, null, 'Compressibility and Speed of Sound in a Liquid', r`$c$`, r`$\Delta p = -E_v\frac{\Delta V}{V},\qquad c = \sqrt{\frac{E_v}{\rho}}$`,
        [v(r`$E_v$`, 'bulk modulus of the liquid (water ≈ 2.2 GPa)', PA), RHO],
        'How much a liquid compresses, and how fast pressure waves travel in it (water hammer).',
        'Water: c ≈ 1480 m/s. Sudden valve closure raises pressure by ρcv.', r`$\text{m/s}$`),
    K(PROP, 'Specific Weight of Water', r`$\gamma_w$`, r`$9.81\ \text{kN/m}^3 = 62.4\ \text{lb/ft}^3$`, 'The weight of a cubic metre of water at about 4 °C.', 'Its density is 1000 kg/m³.'),
    // Pressure and Manometers
    P(MANO, null, 'Pressure Head and Equivalent Columns', r`$h = \frac{p}{\gamma}$`, r`$h = \frac{p}{\gamma},\qquad h_2 = h_1\frac{SG_1}{SG_2}$`,
        [v(r`$p$`, 'pressure', PA), GAM, v(r`$SG$`, 'specific gravity of each liquid')],
        'Pressure expressed as the height of a liquid column that would produce it.',
        '1 atm = 10.33 m of water = 760 mm of mercury (SG 13.6).', r`$\text{m}$`),
    P(MANO, null, 'Manometer Equation', r`$p_A - p_B$`, r`$p_A + \sum\gamma_i h_i\ (\text{going down}) - \sum\gamma_j h_j\ (\text{going up}) = p_B$`,
        [v(r`$\gamma_i, h_i$`, 'each column\'s specific weight and height')],
        'Walk through the manometer from A to B: add pressure going down a column, subtract going up.',
        'In a differential manometer the gauge-liquid column counts with its own SG minus the pipe fluid\'s.', PA),
    P(MANO, null, 'Barometer', r`$p_{atm}$`, r`$p_{atm} = \gamma_{Hg}h + p_v \approx \gamma_{Hg}h$`,
        [v(r`$\gamma_{Hg}$`, 'specific weight of mercury, 133.4 kN/m³', r`$\text{N/m}^3$`), v(r`$h$`, 'column height', r`$\text{m}$`), v(r`$p_v$`, 'vapour pressure (negligible for mercury)', PA)],
        'Atmospheric pressure from the height of a liquid column it supports.',
        'A water barometer would need a column over 10 m tall.', PA),
    K(MANO, 'Standard Atmospheric Pressure', r`$p_{atm}$`, r`$101.325\ \text{kPa} = 760\ \text{mm Hg} = 14.7\ \text{psi}$`, 'Mean sea-level air pressure.', 'Absolute pressure = gauge + atmospheric.'),
    // Hydrostatic Forces
    P(HYD, null, 'Force on a Plane Submerged Surface', r`$F = \gamma\bar{h}A$`, r`$F = \gamma\bar{h}A$`,
        [GAM, v(r`$\bar{h}$`, 'depth of the centroid of the surface', r`$\text{m}$`), AREA],
        'The total water force on a flat gate or wall: pressure at the centroid times the area.',
        'The force is the same however the surface is tilted, for the same centroid depth.', r`$\text{N}$`),
    P(HYD, null, 'Centre of Pressure', r`$y_p$`, r`$y_p = \bar{y} + \frac{\bar{I}}{\bar{y}A}$`,
        [v(r`$\bar{y}$`, 'distance to the centroid along the plane, from the surface', r`$\text{m}$`), v(r`$\bar{I}$`, 'centroidal moment of inertia of the area', r`$\text{m}^4$`), AREA],
        'Where the hydrostatic force acts: always below the centroid.',
        'A vertical rectangle reaching the surface: 2/3 of its height down.', r`$\text{m}$`),
    P(HYD, null, 'Force on a Curved Surface', r`$F$`, r`$F_H = \text{force on the vertical projection},\quad F_V = \text{weight of fluid above (real or imaginary)},\quad F = \sqrt{F_H^2 + F_V^2}$`,
        [v(r`$F_H, F_V$`, 'horizontal and vertical components', r`$\text{N}$`)],
        'Split a curved gate\'s force into a horizontal part on its projection and a vertical part equal to the fluid above it.',
        'For a circular gate the resultant passes through the centre.', r`$\text{N}$`),
    P(HYD, null, 'Gravity Dam Stability', r`$FS$`, r`$FS_{\text{overturning}} = \frac{\sum M_R}{\sum M_O},\qquad FS_{\text{sliding}} = \frac{\mu\sum R_y}{\sum R_x}$`,
        [v(r`$M_R, M_O$`, 'righting and overturning moments about the toe', r`$\text{N}\cdot\text{m}$`), v(r`$\mu$`, 'friction coefficient at the base')],
        'Checks that a dam neither tips about its toe nor slides.',
        'Uplift under the base reduces both factors; keep the resultant in the middle third.'),
    // Buoyancy
    P(BUOY, null, 'Floating Body', r`$\frac{V_{sub}}{V}$`, r`$\frac{V_{sub}}{V} = \frac{SG_{body}}{SG_{fluid}}$`,
        [v(r`$V_{sub}, V$`, 'submerged and total volume', r`$\text{m}^3$`), v(r`$SG$`, 'specific gravities')],
        'The fraction of a floating body below the surface.',
        'Ice (0.92) in seawater (1.03) floats 89% submerged.'),
    P(BUOY, null, 'Apparent Weight Under Water', r`$W'$`, r`$W' = W - \gamma_f V,\qquad SG_{body} = \frac{W}{W - W'}$`,
        [v(r`$W$`, 'weight in air', r`$\text{N}$`), v(r`$\gamma_f$`, 'specific weight of the fluid', r`$\text{N/m}^3$`), v(r`$V$`, 'body volume', r`$\text{m}^3$`)],
        'What a submerged body seems to weigh, and how that gives its specific gravity.',
        'The loss of weight equals the weight of fluid displaced.', r`$\text{N}$`),
    P(BUOY, null, 'Metacentric Height', r`$GM$`, r`$GM = BM \mp BG,\qquad BM = \frac{I}{V_d}$`,
        [v(r`$I$`, 'moment of inertia of the waterline area about the tilt axis', r`$\text{m}^4$`), v(r`$V_d$`, 'displaced volume', r`$\text{m}^3$`), v(r`$BG$`, 'distance between centre of buoyancy and centre of gravity', r`$\text{m}$`)],
        'A floating body is stable when its metacentre M is above its centre of gravity (GM > 0).',
        'Subtract BG when G is above B (usual); add it when G is below.', r`$\text{m}$`),
    P(BUOY, null, 'Rolling Period', r`$T$`, r`$T = \frac{2\pi k}{\sqrt{g\,GM}}$`,
        [v(r`$k$`, 'radius of gyration about the roll axis', r`$\text{m}$`), v(r`$GM$`, 'metacentric height', r`$\text{m}$`), G_],
        'How long a floating body takes to roll and return.',
        'A large GM is stable but gives a quick, uncomfortable roll.', r`$\text{s}$`),
    // Relative Equilibrium
    P(REL, null, 'Linearly Accelerated Tank', r`$\tan\theta$`, r`$\text{horizontal: } \tan\theta = \frac{a}{g};\qquad \text{vertical: } p = \gamma h\left(1 + \frac{a}{g}\right)$`,
        [v(r`$a$`, 'acceleration', r`$\text{m/s}^2$`), G_, v(r`$h$`, 'depth', r`$\text{m}$`)],
        'The free surface tilts when a tank accelerates sideways; pressure grows when it accelerates up.',
        'Accelerating down at g, the pressure everywhere is atmospheric.'),
    P(REL, null, 'Rotating Vessel', r`$h$`, r`$h = \frac{\omega^2r^2}{2g};\qquad V_{\text{paraboloid}} = \tfrac12\pi r^2h$`,
        [v(r`$\omega$`, 'angular speed', r`$\text{rad/s}$`), v(r`$r$`, 'radius', r`$\text{m}$`), G_],
        'A liquid spinning with its container forms a paraboloid; its rise at the wall equals its fall at the centre.',
        'The paraboloid holds half the volume of its circumscribing cylinder.', r`$\text{m}$`),
    // Continuity Equation
    P(CONT, null, 'Mass Flow Rate', r`$\dot{m}$`, r`$\dot{m} = \rho AV = \rho Q;\qquad \rho_1A_1V_1 = \rho_2A_2V_2$`,
        [RHO, AREA, V_],
        'Mass per second through a section; it is conserved even for gases.',
        'Weight flow is γQ (N/s).', r`$\text{kg/s}$`),
    P(CONT, null, 'Velocity in a Circular Pipe', r`$v$`, r`$v = \frac{Q}{A} = \frac{4Q}{\pi D^2}$`,
        [Q_, D_],
        'Mean velocity from the flow rate and diameter.',
        'For pipes in branching networks, Q into a junction equals Q out.', r`$\text{m/s}$`),
    // Bernoulli and Energy Equations
    P(BERN, null, 'Energy Equation with Pump and Losses', r`$h_A$`, r`$\frac{p_1}{\gamma} + \frac{v_1^2}{2g} + z_1 + h_A = \frac{p_2}{\gamma} + \frac{v_2^2}{2g} + z_2 + h_L + h_E$`,
        [v(r`$h_A$`, 'head added by a pump', r`$\text{m}$`), v(r`$h_E$`, 'head extracted by a turbine', r`$\text{m}$`), v(r`$h_L$`, 'head lost', r`$\text{m}$`)],
        'Bernoulli with pumps, turbines and friction included.',
        'At a reservoir surface or a free jet the pressure head is zero (gauge).', r`$\text{m}$`),
    P(BERN, null, 'Hydraulic and Energy Grade Lines', r`$EGL$`, r`$HGL = \frac{p}{\gamma} + z,\qquad EGL = HGL + \frac{v^2}{2g}$`,
        [GAM, V_, v(r`$z$`, 'elevation', r`$\text{m}$`)],
        'The heights a piezometer and a pitot tube would show along a pipe.',
        'Where the HGL drops below the pipe, the pressure is below atmospheric.', r`$\text{m}$`),
    P(BERN, null, 'Venturi Meter', r`$Q$`, r`$Q = C_dA_2\sqrt{\frac{2g\Delta h}{1 - (A_2/A_1)^2}}$`,
        [v(r`$A_1, A_2$`, 'inlet and throat areas', r`$\text{m}^2$`), v(r`$\Delta h$`, 'piezometric head difference', r`$\text{m}$`), v(r`$C_d$`, 'discharge coefficient (≈ 0.98)')],
        'Flow rate from the pressure drop at a pipe\'s narrowing throat.',
        r`With a mercury manometer reading $R$ in water: $\Delta h = R(13.6 - 1)$.`, r`$\text{m}^3\text{/s}$`),
    P(BERN, null, 'Pitot Tube', r`$v$`, r`$v = C\sqrt{2g\Delta h}$`,
        [v(r`$\Delta h$`, 'stagnation minus static head', r`$\text{m}$`), G_],
        'Local velocity from the rise of fluid in a tube facing the flow.',
        'It measures velocity at a point, not the mean velocity.', r`$\text{m/s}$`),
    P(BERN, null, 'Power of a Jet', r`$P$`, r`$P = \gamma Q\frac{v^2}{2g} = \tfrac12\rho Qv^2$`,
        [GAM, Q_, V_],
        'The kinetic power carried by a free jet.',
        'A nozzle trades pressure head for this velocity head.', r`$\text{W}$`),
    // Momentum
    P(MOM, null, 'Force on a Pipe Bend', r`$F_x$`, r`$F_x = p_1A_1 - p_2A_2\cos\theta + \rho Q(v_1 - v_2\cos\theta),\qquad F_y = (p_2A_2 + \rho Qv_2)\sin\theta$`,
        [v(r`$p_1, p_2$`, 'pressures at inlet and outlet', PA), v(r`$\theta$`, 'angle of the bend'), Q_],
        'The anchoring force a bend needs, from pressure and the change of momentum.',
        'Apply ΣF = ρQ(v_out − v_in) on the fluid, component by component; the bend\'s force on the fluid is the reverse.', r`$\text{N}$`),
    P(MOM, null, 'Force on a Moving Vane', r`$F$`, r`$F = \rho A(v - u)^2(1 - \cos\theta)$`,
        [RHO, AREA, v(r`$v$`, 'jet speed', r`$\text{m/s}$`), v(r`$u$`, 'vane speed', r`$\text{m/s}$`), v(r`$\theta$`, 'angle the vane turns the jet')],
        'The push of a jet on a single vane moving away from it.',
        'A series of vanes (a wheel) catches the full flow ρAv; its power peaks at u = v/2.', r`$\text{N}$`),
    P(MOM, null, 'Reaction of a Jet from a Tank', r`$F$`, r`$F = \rho Qv = 2\gamma hA$`,
        [v(r`$h$`, 'head above the opening', r`$\text{m}$`), v(r`$A$`, 'jet area', r`$\text{m}^2$`), GAM],
        'The thrust on a tank from a jet leaving through a side opening.',
        'It is twice the hydrostatic force on a plug of the same area.', r`$\text{N}$`),
    // Pipe Flow and Head Losses
    P(PIPE, null, 'Laminar Pipe Flow (Hagen-Poiseuille)', r`$h_f$`, r`$f = \frac{64}{Re},\qquad h_f = \frac{32\mu Lv}{\gamma D^2},\qquad v_{\max} = 2v$`,
        [v(r`$\mu$`, 'dynamic viscosity', r`$\text{Pa}\cdot\text{s}$`), v(r`$L$`, 'length', r`$\text{m}$`), V_, D_, GAM],
        'Friction loss and velocity profile in laminar flow.',
        'The velocity profile is a parabola, fastest at the centre.', r`$\text{m}$`),
    P(PIPE, null, 'Minor Losses', r`$h_m$`, r`$h_m = K\frac{v^2}{2g};\quad \text{sudden enlargement } \frac{(v_1 - v_2)^2}{2g};\quad \text{exit } \frac{v^2}{2g};\quad \text{sharp entrance } 0.5\frac{v^2}{2g}$`,
        [v(r`$K$`, 'loss coefficient of the fitting'), V_, G_],
        'Head lost at fittings, valves, entrances, exits and changes of section.',
        'In short pipes the minor losses can exceed the friction loss.', r`$\text{m}$`),
    P(PIPE, null, 'Hazen-Williams Formula', r`$v$`, r`$v = 0.849\,C\,R^{0.63}S^{0.54}\ \text{(SI)}$`,
        [v(r`$C$`, 'Hazen-Williams coefficient (new steel ≈ 120)'), v(r`$R$`, 'hydraulic radius, D/4 for a full pipe', r`$\text{m}$`), v(r`$S$`, 'slope of the energy line, h_f/L')],
        'An empirical formula for water in pipes, common in waterworks design.',
        'Valid for water at ordinary temperatures only.', r`$\text{m/s}$`),
    P(PIPE, null, 'Manning Formula for Pipes', r`$h_f$`, r`$h_f = \frac{10.29\,n^2LQ^2}{D^{16/3}}$`,
        [v(r`$n$`, 'Manning roughness'), v(r`$L$`, 'length', r`$\text{m}$`), Q_, D_],
        'Friction loss in a full pipe from Manning\'s roughness.',
        'Doubling the diameter cuts the loss about 40-fold.', r`$\text{m}$`),
    P(PIPE, null, 'Swamee-Jain Friction Factor', r`$f$`, r`$f = \frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon}{3.7D} + \frac{5.74}{Re^{0.9}}\right)\right]^2}$`,
        [v(r`$\varepsilon$`, 'pipe roughness', r`$\text{m}$`), D_, v(r`$Re$`, 'Reynolds number')],
        'An explicit fit to the Colebrook equation for turbulent flow (the Moody chart in one line).',
        'Within about 3% of Colebrook for 10⁻⁶ < ε/D < 10⁻², 5000 < Re < 10⁸, and usually within 1%; the worst case is rough pipe at low Re.'),
    // Pipes in Series and Parallel
    P(NET, null, 'Pipes in Series', r`$h_L$`, r`$Q_1 = Q_2 = Q_3,\qquad h_L = h_{f1} + h_{f2} + h_{f3}$`,
        [Q_, v(r`$h_f$`, 'friction loss in each pipe', r`$\text{m}$`)],
        'Pipes end to end: the same flow, losses add.',
        'Like resistors in series, but loss grows with Q².', r`$\text{m}$`),
    P(NET, null, 'Pipes in Parallel', r`$Q$`, r`$h_{f1} = h_{f2} = h_{f3},\qquad Q = Q_1 + Q_2 + Q_3$`,
        [Q_, v(r`$h_f$`, 'the common head loss', r`$\text{m}$`)],
        'Pipes side by side between two junctions: the same loss, flows add.',
        r`With Darcy and equal $f$: $Q_i \propto \sqrt{\frac{D_i^5}{L_i}}$.`, r`$\text{m}^3\text{/s}$`),
    P(NET, null, 'Equivalent Pipe Length', r`$L_e$`, r`$L_e = L\left(\frac{D_e}{D}\right)^5\ \text{(same } f\text{)}$`,
        [v(r`$L, D$`, 'actual pipe', r`$\text{m}$`), v(r`$D_e$`, 'diameter of the equivalent pipe', r`$\text{m}$`)],
        'The length of a pipe of another diameter that has the same loss at the same flow.',
        'Convert pipes in series to one diameter, then add the lengths.', r`$\text{m}$`),
    P(NET, null, 'Three-Reservoir Problem', r`$\sum Q = 0$`, r`$Q_1 + Q_2 + Q_3 = 0 \text{ at the junction (inflow +)},\qquad h_{fi} = |z_i - P_J|$`,
        [v(r`$z_i$`, 'reservoir water surface elevations', r`$\text{m}$`), v(r`$P_J$`, 'energy (piezometric) height at the junction', r`$\text{m}$`)],
        'Three reservoirs joined at one point: guess the junction head until the flows balance.',
        'First test P_J at the middle reservoir\'s level to learn which way that pipe flows.', r`$\text{m}^3\text{/s}$`),
    // Orifices and Weirs
    P(ORIF, null, 'Orifice Discharge and Coefficients', r`$Q$`, r`$Q = C_dA\sqrt{2gh},\qquad C_d = C_cC_v;\qquad h_L = h\left(\frac{1}{C_v^2} - 1\right)$`,
        [v(r`$C_c, C_v, C_d$`, 'contraction, velocity and discharge coefficients'), AREA, v(r`$h$`, 'head on the orifice', r`$\text{m}$`)],
        'Real flow through an orifice, smaller than Torricelli\'s ideal.',
        'A sharp-edged orifice: Cc ≈ 0.62, Cv ≈ 0.98, Cd ≈ 0.61.', r`$\text{m}^3\text{/s}$`),
    P(ORIF, null, 'Time to Drain a Tank', r`$t$`, r`$t = \frac{2A_s(\sqrt{h_1} - \sqrt{h_2})}{C_dA_o\sqrt{2g}}$`,
        [v(r`$A_s$`, 'tank surface area (constant)', r`$\text{m}^2$`), v(r`$A_o$`, 'orifice area', r`$\text{m}^2$`), v(r`$h_1, h_2$`, 'starting and final heads', r`$\text{m}$`)],
        'Time for a prismatic tank to fall from one head to another through an orifice.',
        'The outflow slows as the head falls: the last quarter of the depth takes half the total draining time.', r`$\text{s}$`),
    P(ORIF, null, 'Rectangular Weir', r`$Q$`, r`$Q = \tfrac23C_d\sqrt{2g}\,LH^{3/2};\qquad \text{Francis: } Q = 1.84(L - 0.1nH)H^{3/2}$`,
        [v(r`$L$`, 'crest length', r`$\text{m}$`), v(r`$H$`, 'head over the crest', r`$\text{m}$`), v(r`$n$`, 'end contractions (0, 1 or 2)')],
        'Flow over a sharp-crested rectangular weir.',
        'Measure H upstream, beyond the draw-down of the nappe.', r`$\text{m}^3\text{/s}$`),
    P(ORIF, null, 'Triangular (V-Notch) Weir', r`$Q$`, r`$Q = \tfrac{8}{15}C_d\sqrt{2g}\tan\frac{\theta}{2}H^{5/2};\qquad 90^\circ: Q \approx 1.38H^{5/2}$`,
        [v(r`$\theta$`, 'notch angle'), v(r`$H$`, 'head over the vertex', r`$\text{m}$`)],
        'Flow over a V-notch, accurate for small flows.',
        'Flow grows with H^{5/2}: doubling the head gives 5.7 times the flow.', r`$\text{m}^3\text{/s}$`),
    P(ORIF, null, 'Cipolletti Weir', r`$Q$`, r`$Q = 1.859\,LH^{3/2}$`,
        [v(r`$L$`, 'crest length', r`$\text{m}$`), v(r`$H$`, 'head', r`$\text{m}$`)],
        'A trapezoidal weir with 1:4 side slopes, which cancel the end contractions.',
        'No end-contraction correction is needed.', r`$\text{m}^3\text{/s}$`),
    // Open Channels
    P(OPEN, null, 'Hydraulic Radius', r`$R$`, r`$R = \frac{A}{P_w};\qquad \text{full pipe: } \frac{D}{4};\qquad D_h = 4R$`,
        [AREA, v(r`$P_w$`, 'wetted perimeter', r`$\text{m}$`)],
        'Flow area over wetted perimeter: how "deep" a channel acts.',
        'Use D_h = 4R in the Reynolds number and Darcy formula for non-circular ducts.', r`$\text{m}$`),
    P(OPEN, null, "Manning's Equation", r`$v$`, r`$v = \frac{1}{n}R^{2/3}S^{1/2},\qquad Q = \frac{1}{n}AR^{2/3}S^{1/2}\ \text{(SI)}$`,
        [v(r`$n$`, 'Manning roughness (concrete ≈ 0.013)'), v(r`$R$`, 'hydraulic radius', r`$\text{m}$`), v(r`$S$`, 'channel slope')],
        'Uniform flow velocity in an open channel.',
        'In English units the 1 becomes 1.486.', r`$\text{m/s}$`),
    P(OPEN, null, "Chezy Equation", r`$v$`, r`$v = C\sqrt{RS},\qquad C = \frac{R^{1/6}}{n} = \sqrt{\frac{8g}{f}}$`,
        [v(r`$C$`, 'Chezy coefficient', r`$\text{m}^{1/2}\text{/s}$`), v(r`$R$`, 'hydraulic radius', r`$\text{m}$`), v(r`$S$`, 'slope')],
        'The older uniform-flow formula; Manning is a special case.',
        'The C–f link connects open-channel and pipe friction.', r`$\text{m/s}$`),
    P(OPEN, null, 'Specific Energy and Critical Depth', r`$y_c$`, r`$E = y + \frac{v^2}{2g};\qquad \text{rectangular: } y_c = \sqrt[3]{\frac{q^2}{g}},\quad E_{\min} = \tfrac32y_c$`,
        [v(r`$y$`, 'depth', r`$\text{m}$`), v(r`$q$`, 'flow per unit width', r`$\text{m}^2\text{/s}$`)],
        'Energy above the channel bottom, and the depth at which it is least for a given flow.',
        'Below y_c the flow is fast (supercritical), above it slow (subcritical).', r`$\text{m}$`),
    P(OPEN, null, 'Froude Number', r`$Fr$`, r`$Fr = \frac{v}{\sqrt{gy_h}},\qquad y_h = \frac{A}{T}$`,
        [V_, v(r`$y_h$`, 'hydraulic depth (area over top width)', r`$\text{m}$`)],
        'Ratio of flow speed to wave speed: 1 is critical, above 1 supercritical.',
        'A surface wave can travel upstream only when Fr < 1.'),
    P(OPEN, null, 'Hydraulic Jump', r`$\frac{y_2}{y_1}$`, r`$\frac{y_2}{y_1} = \tfrac12\left(\sqrt{1 + 8Fr_1^2} - 1\right),\qquad \Delta E = \frac{(y_2 - y_1)^3}{4y_1y_2}$`,
        [v(r`$y_1, y_2$`, 'depths before and after', r`$\text{m}$`), v(r`$Fr_1$`, 'upstream Froude number')],
        'The sudden rise from fast shallow flow to slow deep flow, and the energy it destroys.',
        'Used below spillways to dissipate energy before water reaches the river bed.'),
    P(OPEN, null, 'Most Efficient Channel Sections', r`$b = 2y$`, r`$\text{rectangle: } b = 2y,\ R = \frac y2;\qquad \text{trapezoid: half a hexagon (sides at } 60^\circ),\ R = \frac y2$`,
        [v(r`$b$`, 'bottom width', r`$\text{m}$`), v(r`$y$`, 'depth', r`$\text{m}$`)],
        'The shapes that carry the most flow for a given area (least wetted perimeter).',
        'For every best section, the hydraulic radius is half the depth.', r`$\text{m}$`),
    // Pumps and Turbines
    P(PUMP, null, 'Pump and Turbine Efficiency', r`$\eta$`, r`$P_{\text{pump shaft}} = \frac{\gamma QH}{\eta},\qquad P_{\text{turbine out}} = \eta\gamma QH$`,
        [GAM, Q_, H_, v(r`$\eta$`, 'efficiency')],
        'A pump needs more shaft power than it gives the water; a turbine gives less than it takes.',
        'Motor input = shaft power ÷ motor efficiency.', r`$\text{W}$`),
    P(PUMP, null, 'Affinity Laws', r`$\frac{Q_2}{Q_1}$`, r`$\frac{Q_2}{Q_1} = \frac{N_2D_2^3}{N_1D_1^3}\ \text{or } \frac{N_2}{N_1}\ (\text{same pump}),\quad \frac{H_2}{H_1} = \left(\frac{N_2}{N_1}\right)^2,\quad \frac{P_2}{P_1} = \left(\frac{N_2}{N_1}\right)^3$`,
        [v(r`$N$`, 'speed', r`$\text{rpm}$`), v(r`$D$`, 'impeller diameter', r`$\text{m}$`)],
        'How a pump\'s flow, head and power change with speed.',
        'For the same pump at a new speed: Q ∝ N, H ∝ N², P ∝ N³. Trimming the impeller: Q ∝ D, H ∝ D², P ∝ D³.'),
    P(PUMP, null, 'Specific Speed', r`$N_s$`, r`$\text{pump: } N_s = \frac{N\sqrt{Q}}{H^{3/4}};\qquad \text{turbine: } N_s = \frac{N\sqrt{P}}{H^{5/4}}$`,
        [v(r`$N$`, 'speed', r`$\text{rpm}$`), Q_, H_, v(r`$P$`, 'power', r`$\text{kW}$`)],
        'A shape number that selects the type of pump or turbine.',
        'Low N_s: radial pumps, Pelton wheels (high head). High N_s: axial pumps, Kaplan turbines (low head).'),
    P(PUMP, null, 'Net Positive Suction Head', r`$NPSH_A$`, r`$NPSH_A = \frac{p_{atm}}{\gamma} - z_s - h_{fs} - \frac{p_v}{\gamma}$`,
        [v(r`$z_s$`, 'suction lift (pump above the water surface)', r`$\text{m}$`), v(r`$h_{fs}$`, 'suction-pipe losses', r`$\text{m}$`), v(r`$p_v$`, 'vapour pressure of the liquid', PA)],
        'Head available at the pump inlet above vapour pressure; it must exceed the pump\'s required NPSH to avoid cavitation.',
        'Hot water has a high vapour pressure: it needs a flooded suction.', r`$\text{m}$`),
];

module.exports = { subject: 'ESAS', topic: 'Fluid Mechanics', migration: '20261215000000_cards_fluid_mechanics', file, revisions, retire, drafts };
