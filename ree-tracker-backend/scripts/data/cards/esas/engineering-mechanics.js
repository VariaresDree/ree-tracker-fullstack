'use strict';

// ESAS › Engineering Mechanics formula cards (Library round, 2026-11-17): 13
// live cards, all basic kinematics and energy, for 14 subtopics. Physics for
// Engineers now holds free fall, projectile flight time and height, orbits,
// collisions, rotational dynamics and mass moments of inertia, so this file
// adds statics (resultants, equilibrium, trusses, cables, friction, centroids,
// area moments of inertia) and the engineering side of dynamics (dependent
// motion, curves, connected bodies, flywheels, jets). Formula cards carry SI
// units. See mathematics/algebra.js for the format;
// tests/engineeringMechanicsFormulas.test.js solves each by an independent
// route: equilibrium checks, integration, and simulation.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const FORCE = 'Force Systems and Resultants';
const EQ = 'Equilibrium';
const TRUSS = 'Trusses';
const CABLE = 'Cables';
const FRIC = 'Friction';
const CENT = 'Centroids';
const MOI = 'Moments of Inertia';
const RECT = 'Rectilinear Motion';
const PROJ = 'Projectile Motion';
const CURV = 'Curvilinear Motion';
const NEWT = "Newton's Laws";
const WE = 'Work and Energy';
const IMP = 'Impulse and Momentum';
const ROT = 'Rotation';

const file = [
    ['c482eb6c-285d-4971-a57b-136ce4521d0b', FORCE, null], // Moment of a Force
    ['cb2f7a4f-2ce4-4b18-92ad-2cc663b79540', FRIC, null], // Friction Force
    ['84a1d6d8-99bf-4545-a667-4894f6355f85', RECT, null], // Displacement Under Constant Acceleration
    ['7c47b2b0-ea8e-45cb-9e76-10910d989f8d', RECT, null], // Velocity Under Constant Acceleration
    ['fc542fcd-e854-45be-b4e1-2f8af6a1d55b', RECT, null], // Velocity and Displacement Without Time
    ['19a60531-758c-44c3-929b-7df38a7f1a42', PROJ, null], // Range of a Projectile
    ['d7630a7e-0df1-4a71-94d8-2ef2987c5c88', CURV, null], // Centripetal Acceleration
    ['e0e19616-b46c-4171-a718-27b75a062a5e', NEWT, null], // Newton's Second Law
    ['dc64cb1b-3653-4851-a28a-a3ad9477e5dd', WE, null], // Kinetic Energy
    ['73e1e4fb-0135-4e33-b767-5b5d13daabe1', WE, null], // Gravitational Potential Energy
    ['6d8a2f3f-3280-4d3f-a116-56a9d631ffe1', WE, null], // Work Done by a Force
    ['9341c991-6416-4b92-a83a-a6e99be1acae', WE, null], // Power from Force and Speed
    ['9c5be2fd-134f-412b-b917-e4cb906c7cca', IMP, null], // Momentum
];

const revisions = [
    { id: 'cb2f7a4f-2ce4-4b18-92ad-2cc663b79540', note: 'Says it is the limit, and that kinetic friction is smaller.',
        d: 'The most friction a surface can supply before sliding (μₛ); once sliding, the friction is μₖN, a little less.' },
];

const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const F_ = v(r`$F$`, 'force', r`$\text{N}$`);
const W = v(r`$W$`, 'weight', r`$\text{N}$`);
const MU = v(r`$\mu$`, 'coefficient of friction');
const G_ = v(r`$g$`, 'acceleration due to gravity', r`$\text{m/s}^2$`);
const RHO = v(r`$\rho$`, 'radius of curvature', r`$\text{m}$`);
const AREA = v(r`$A$`, 'area', r`$\text{m}^2$`);

const drafts = [
    // Force Systems and Resultants
    P(FORCE, null, 'Rectangular Components of a Force', r`$F_x$`, r`$F_x = F\cos\theta_x,\quad F_y = F\cos\theta_y,\quad F_z = F\cos\theta_z;\qquad \cos^2\theta_x + \cos^2\theta_y + \cos^2\theta_z = 1$`,
        [F_, v(r`$\theta_x, \theta_y, \theta_z$`, 'angles the force makes with the axes')],
        'A force split along the axes by its direction cosines.',
        r`Along a line from A to B: $\vec F = F\frac{\overrightarrow{AB}}{|AB|}$.`, r`$\text{N}$`),
    P(FORCE, null, 'Resultant of Concurrent Forces', r`$R$`, r`$R = \sqrt{(\sum F_x)^2 + (\sum F_y)^2},\qquad \tan\theta = \frac{\sum F_y}{\sum F_x}$`,
        [v(r`$\sum F_x, \sum F_y$`, 'sums of the components', r`$\text{N}$`)],
        'The single force equal to several forces meeting at a point.',
        'Check the quadrant from the signs of the sums, not from the calculator.', r`$\text{N}$`),
    P(FORCE, null, "Varignon's Theorem", r`$M_R = \sum M$`, r`$M_O(\vec R) = \sum M_O(\vec F_i);\qquad \vec M_O = \vec r \times \vec F,\ M_O = xF_y - yF_x$`,
        [v(r`$\vec r$`, 'position of a point on the force\'s line', r`$\text{m}$`), F_],
        'The moment of a resultant equals the sum of the moments of its parts; a force\'s moment by its components.',
        'Counter-clockwise positive. Resolve at any convenient point on the line of action.', r`$\text{N}\cdot\text{m}$`),
    P(FORCE, null, 'Couple', r`$C = Fd$`, r`$C = Fd$`,
        [F_, v(r`$d$`, 'perpendicular distance between the two equal, opposite forces', r`$\text{m}$`)],
        'Two equal, opposite, parallel forces: a pure turning effect, the same about every point.',
        'A force can be moved parallel to itself by adding a couple Fd.', r`$\text{N}\cdot\text{m}$`),
    P(FORCE, null, 'Resultant of Parallel Forces', r`$\bar{x}$`, r`$R = \sum F,\qquad \bar{x} = \frac{\sum Fx}{\sum F}$`,
        [F_, v(r`$x$`, 'position of each force', r`$\text{m}$`)],
        'Size and position of the resultant of parallel forces.',
        'If the forces sum to zero but their moments don\'t, the resultant is a couple.', r`$\text{N}$`),
    P(FORCE, null, 'Resultant of a Distributed Load', r`$W$`, r`$W = \int w\,dx\ (\text{the load's area}),\qquad \text{acting at its centroid};\ \text{uniform: } wL \text{ at } \tfrac L2;\ \text{triangle: } \tfrac{wL}{2} \text{ at } \tfrac L3 \text{ from the high end}$`,
        [v(r`$w$`, 'load intensity', r`$\text{N/m}$`), v(r`$L$`, 'loaded length', r`$\text{m}$`)],
        'A spread load acts as one force equal to its area, through its centroid.',
        'Split a trapezoidal load into a rectangle and a triangle.', r`$\text{N}$`),
    // Equilibrium
    P(EQ, null, 'Conditions of Equilibrium', r`$\sum F = 0$`, r`$\sum F_x = 0,\qquad \sum F_y = 0,\qquad \sum M = 0$`,
        [F_],
        'A body at rest or moving steadily: forces and moments both balance.',
        'Take moments about the point where the most unknowns meet.', r`$\text{N}$`),
    P(EQ, null, "Lami's Theorem", r`$\frac{F_1}{\sin\alpha}$`, r`$\frac{F_1}{\sin\alpha} = \frac{F_2}{\sin\beta} = \frac{F_3}{\sin\gamma}$`,
        [v(r`$F_1, F_2, F_3$`, 'three concurrent forces in equilibrium', r`$\text{N}$`), v(r`$\alpha, \beta, \gamma$`, 'the angle between the OTHER two forces')],
        'Three concurrent forces in balance: each is proportional to the sine of the angle between the other two.',
        'Each angle is opposite its force. Three forces in equilibrium are concurrent or parallel.', r`$\text{N}$`),
    P(EQ, null, 'Reactions of a Simply Supported Beam', r`$R_A$`, r`$R_A = \frac{Pb}{L},\qquad R_B = \frac{Pa}{L}$`,
        [v(r`$P$`, 'point load', r`$\text{N}$`), v(r`$a, b$`, 'distances from the load to supports A and B', r`$\text{m}$`), v(r`$L$`, 'span, a + b', r`$\text{m}$`)],
        'Support reactions for a point load on a beam on two supports.',
        'The support NEARER the load carries more.', r`$\text{N}$`),
    // Trusses
    P(TRUSS, null, 'Truss Stability and Determinacy', r`$m + r = 2j$`, r`$m + r = 2j\ \text{(determinate)};\quad m + r < 2j\ \text{(unstable)};\quad m + r > 2j\ \text{(indeterminate)}$`,
        [v(r`$m$`, 'members'), v(r`$r$`, 'support reactions'), v(r`$j$`, 'joints')],
        'Whether a plane truss can be solved by statics alone.',
        'Meeting the count is necessary, not sufficient: the members must also be arranged rigidly.'),
    P(TRUSS, null, 'Method of Joints', r`$\sum F = 0$`, r`$\text{at each joint: } \sum F_x = 0,\ \sum F_y = 0$`,
        [v(r`$F$`, 'member forces, tension positive', r`$\text{N}$`)],
        'Solve a truss joint by joint, starting where only two forces are unknown.',
        'Assume every member in tension; a negative answer means compression.', r`$\text{N}$`),
    P(TRUSS, null, 'Method of Sections', r`$\sum M = 0$`, r`$\text{cut} \le 3 \text{ unknown members};\ \sum M \text{ about where two of them meet gives the third}$`,
        [v(r`$F$`, 'member forces', r`$\text{N}$`)],
        'Find a member\'s force directly by cutting the truss and taking moments.',
        'Pick the moment centre where the lines of the other two cut members intersect.', r`$\text{N}$`),
    P(TRUSS, null, 'Zero-Force Members', r`$F = 0$`, r`$\text{two non-collinear members, no load} \Rightarrow F_1 = F_2 = 0;\quad \text{two collinear + one, no load} \Rightarrow F_3 = 0$`,
        [v(r`$F$`, 'member force', r`$\text{N}$`)],
        'Members that carry nothing under the given loads, spotted before calculating.',
        'They still matter: they brace the truss against buckling and other loads.', r`$\text{N}$`),
    // Cables
    P(CABLE, null, 'Parabolic Cable', r`$H$`, r`$H = \frac{wL^2}{8d},\qquad T_{\max} = \sqrt{H^2 + \left(\tfrac{wL}{2}\right)^2},\qquad s \approx L + \frac{8d^2}{3L}$`,
        [v(r`$w$`, 'load per HORIZONTAL metre', r`$\text{N/m}$`), v(r`$L$`, 'span', r`$\text{m}$`), v(r`$d$`, 'sag at mid-span', r`$\text{m}$`)],
        'A cable carrying a load uniform along the horizontal (a suspension bridge) hangs as a parabola.',
        'H is the same everywhere; the tension is greatest at the supports.', r`$\text{N}$`),
    P(CABLE, null, 'Catenary', r`$y = c\cosh\frac xc$`, r`$y = c\cosh\frac{x}{c},\quad s = c\sinh\frac{x}{c},\quad y^2 = s^2 + c^2,\quad H = wc,\quad T = wy$`,
        [v(r`$w$`, 'weight per metre ALONG the cable', r`$\text{N/m}$`), v(r`$c$`, 'parameter, H/w', r`$\text{m}$`), v(r`$s$`, 'length from the lowest point', r`$\text{m}$`)],
        'A cable hanging under its own weight.',
        'The tension at any point equals w times its height above the directrix (y measured from c below the lowest point).', r`$\text{m}$`),
    // Friction
    P(FRIC, null, 'Angle of Friction and Angle of Repose', r`$\tan\phi = \mu$`, r`$\tan\phi = \mu_s$`,
        [MU, v(r`$\phi$`, 'angle between the total reaction and the normal; also the steepest slope a block rests on')],
        'The slope at which a block just starts to slide equals the angle of friction.',
        'μ = 0.3 gives 16.7°.'),
    P(FRIC, null, 'Block on an Incline', r`$P$`, r`$\text{pushing up (impending): } P = W(\sin\theta + \mu\cos\theta);\quad \text{sliding down: } a = g(\sin\theta - \mu_k\cos\theta)$`,
        [W, v(r`$\theta$`, 'slope angle'), MU],
        'The force along a slope to start a block moving up it, and the acceleration of one sliding down.',
        'Pulling at an angle above the slope reduces N and so the friction.', r`$\text{N}$`),
    P(FRIC, null, 'Belt Friction', r`$\frac{T_1}{T_2}$`, r`$\frac{T_1}{T_2} = e^{\mu\beta}$`,
        [v(r`$T_1, T_2$`, 'tight-side and slack-side tensions', r`$\text{N}$`), MU, v(r`$\beta$`, 'angle of wrap in RADIANS')],
        'How much a rope or belt wrapped round a drum can hold back.',
        'A rope wrapped one more turn multiplies the ratio by e^{2πμ}.'),
    P(FRIC, null, 'Square-Threaded Screw', r`$M$`, r`$M = Wr\tan(\phi + \alpha)\ \text{(raising)},\qquad \tan\alpha = \frac{L}{2\pi r}$`,
        [W, v(r`$r$`, 'mean radius of the thread', r`$\text{m}$`), v(r`$\phi$`, 'angle of friction'), v(r`$\alpha$`, 'lead angle'), v(r`$L$`, 'lead', r`$\text{m}$`)],
        'The torque to raise a load with a screw jack.',
        r`Lowering takes $Wr\tan(\phi - \alpha)$; the screw holds itself when $\phi > \alpha$.`, r`$\text{N}\cdot\text{m}$`),
    // Centroids
    P(CENT, null, 'Centroid of a Composite Area', r`$\bar{x}$`, r`$\bar{x} = \frac{\sum A_i\bar{x}_i}{\sum A_i},\qquad \bar{y} = \frac{\sum A_i\bar{y}_i}{\sum A_i}$`,
        [v(r`$A_i$`, 'area of each part (holes negative)', r`$\text{m}^2$`), v(r`$\bar{x}_i, \bar{y}_i$`, 'centroid of each part', r`$\text{m}$`)],
        'The centroid of a shape built from simple ones.',
        'A hole counts as a negative area.', r`$\text{m}$`),
    P(CENT, null, 'Centroid by Integration', r`$\bar{x}$`, r`$\bar{x} = \frac{\int x\,dA}{\int dA},\qquad \bar{y} = \frac{\int y\,dA}{\int dA}$`,
        [v(r`$dA$`, 'an area element', r`$\text{m}^2$`)],
        'The centroid of any area: its first moments divided by its area.',
        r`For a vertical strip, use the strip's middle $\frac y2$ for $\bar{y}$.`, r`$\text{m}$`),
    P(CENT, null, 'Centroids of Common Shapes', r`$\bar{y}$`, r`$\text{triangle } \tfrac h3 \text{ (from base)};\ \text{semicircle } \tfrac{4r}{3\pi};\ \text{quarter circle } \tfrac{4r}{3\pi}, \tfrac{4r}{3\pi};\ \text{sector } \tfrac{2r\sin\alpha}{3\alpha};\ \text{arc } \tfrac{r\sin\alpha}{\alpha}$`,
        [v(r`$r$`, 'radius', r`$\text{m}$`), v(r`$\alpha$`, 'half-angle in radians'), v(r`$h$`, 'height', r`$\text{m}$`)],
        'Where the centroids of the shapes in a composite sit.',
        r`For the sector and arc, measure from the centre along the axis of symmetry. A semicircle's is $0.424r$.`, r`$\text{m}$`),
    P(CENT, null, 'Theorems of Pappus', r`$V = 2\pi\bar{y}A$`, r`$A_s = 2\pi\bar{y}L,\qquad V = 2\pi\bar{y}A$`,
        [v(r`$\bar{y}$`, 'distance of the centroid from the axis', r`$\text{m}$`), v(r`$L$`, 'length of the curve', r`$\text{m}$`), AREA],
        'Surface area and volume of a solid of revolution from the path of the centroid.',
        r`A torus: $V = 2\pi R(\pi r^2)$.`, r`$\text{m}^3$`),
    // Moments of Inertia
    P(MOI, null, 'Area Moments of Inertia of Common Shapes', r`$I$`, r`$\text{rectangle } \tfrac{bh^3}{12} (\text{centroid}), \tfrac{bh^3}{3} (\text{base});\ \text{triangle } \tfrac{bh^3}{36}, \tfrac{bh^3}{12};\ \text{circle } \tfrac{\pi r^4}{4}$`,
        [v(r`$b, h$`, 'width and height', r`$\text{m}$`), v(r`$r$`, 'radius', r`$\text{m}$`)],
        'Second moments of area about centroidal and base axes.',
        'h is measured square to the axis, and is the cubed dimension.', r`$\text{m}^4$`),
    P(MOI, null, 'Parallel-Axis Theorem for Areas', r`$I = \bar{I} + Ad^2$`, r`$I = \bar{I} + Ad^2$`,
        [v(r`$\bar{I}$`, 'about the centroidal axis', r`$\text{m}^4$`), AREA, v(r`$d$`, 'distance between the axes', r`$\text{m}$`)],
        'Moment of inertia about any axis parallel to a centroidal one.',
        'Always transfer FROM the centroidal axis; transferring between two non-centroidal axes needs two steps.', r`$\text{m}^4$`),
    P(MOI, null, 'Polar Moment of Inertia', r`$J$`, r`$J = I_x + I_y;\qquad \text{solid circle } \tfrac{\pi r^4}{2} = \tfrac{\pi d^4}{32}$`,
        [v(r`$I_x, I_y$`, 'moments about two perpendicular axes in the plane', r`$\text{m}^4$`)],
        'The second moment about an axis square to the area, through the same point.',
        r`A hollow shaft: $\frac{\pi(d_o^4 - d_i^4)}{32}$. Used for torsion.`, r`$\text{m}^4$`),
    P(MOI, null, 'Radius of Gyration of an Area', r`$k$`, r`$k = \sqrt{\frac{I}{A}}$`,
        [v(r`$I$`, 'moment of inertia', r`$\text{m}^4$`), AREA],
        'The distance at which the whole area could be concentrated to give the same I.',
        'For a column, the smallest k governs buckling.', r`$\text{m}$`),
    // Rectilinear Motion
    P(RECT, null, 'Motion with Variable Acceleration', r`$a = v\frac{dv}{dx}$`, r`$v = \frac{dx}{dt},\qquad a = \frac{dv}{dt} = v\frac{dv}{dx}$`,
        [v(r`$x$`, 'position', r`$\text{m}$`), v(r`$v$`, 'velocity', r`$\text{m/s}$`), v(r`$a$`, 'acceleration', r`$\text{m/s}^2$`)],
        'Position, velocity and acceleration linked by calculus when the acceleration varies.',
        r`If $a$ depends on $x$, use $a = v\frac{dv}{dx}$ and integrate.`, r`$\text{m/s}^2$`),
    P(RECT, null, 'Dependent Motion of Pulleys', r`$\sum l = \text{const}$`, r`$\sum (\text{cable segment lengths}) = \text{const} \ \Rightarrow\ \text{e.g. } 2v_A + v_B = 0$`,
        [v(r`$v_A, v_B$`, 'velocities of connected blocks', r`$\text{m/s}$`)],
        'Blocks joined by a cable over pulleys: differentiate the fixed cable length.',
        'A block hung on a movable pulley moves half as far as the free end.', r`$\text{m/s}$`),
    P(RECT, null, 'Stopping Distance', r`$d$`, r`$d = vt_r + \frac{v^2}{2a},\qquad \text{on a level road } a = \mu g$`,
        [v(r`$v$`, 'initial speed', r`$\text{m/s}$`), v(r`$t_r$`, 'reaction time', r`$\text{s}$`), v(r`$a$`, 'braking deceleration', r`$\text{m/s}^2$`)],
        'Distance to stop: travel during the reaction time, then braking.',
        'Doubling the speed quadruples the braking distance.', r`$\text{m}$`),
    // Projectile Motion
    P(PROJ, null, 'Trajectory of a Projectile', r`$y(x)$`, r`$y = x\tan\theta - \frac{gx^2}{2v_0^2\cos^2\theta}$`,
        [v(r`$v_0$`, 'launch speed', r`$\text{m/s}$`), v(r`$\theta$`, 'launch angle'), G_],
        'The parabola a projectile follows.',
        'To clear a wall at (x, y), put it in and solve for v₀ or θ.', r`$\text{m}$`),
    P(PROJ, null, 'Projectile Launched from a Height', r`$t$`, r`$y_0 + v_0\sin\theta\,t - \tfrac12gt^2 = 0,\qquad x = v_0\cos\theta\,t$`,
        [v(r`$y_0$`, 'launch height above the landing level', r`$\text{m}$`), v(r`$v_0$`, 'launch speed', r`$\text{m/s}$`), v(r`$\theta$`, 'launch angle')],
        'Time and distance when launch and landing heights differ: solve the quadratic for t.',
        'Take the positive root. Horizontal launch: θ = 0, t = √(2y₀/g).', r`$\text{s}$`),
    P(PROJ, null, 'Complementary Angles for the Same Range', r`$\theta,\ 90^\circ - \theta$`, r`$R(\theta) = R(90^\circ - \theta)$`,
        [v(r`$\theta$`, 'launch angle')],
        'Two launch angles that add to 90° land at the same distance (from level ground).',
        'The higher one stays up longer.'),
    // Curvilinear Motion
    P(CURV, null, 'Tangential and Normal Acceleration', r`$a$`, r`$a_t = \frac{dv}{dt},\qquad a_n = \frac{v^2}{\rho},\qquad a = \sqrt{a_t^2 + a_n^2}$`,
        [v(r`$v$`, 'speed', r`$\text{m/s}$`), RHO],
        'A body on a curved path speeding up has both components of acceleration.',
        r`For $y = f(x)$: $\rho = \frac{[1 + (y')^2]^{3/2}}{|y''|}$.`, r`$\text{m/s}^2$`),
    P(CURV, null, 'Maximum Speed on a Flat Curve', r`$v_{\max}$`, r`$v_{\max} = \sqrt{\mu gr}$`,
        [MU, G_, v(r`$r$`, 'radius of the curve', r`$\text{m}$`)],
        'Friction alone supplies the centripetal force on an unbanked curve.',
        'Mass cancels: a truck and a car skid at the same speed.', r`$\text{m/s}$`),
    P(CURV, null, 'Banking of Curves', r`$\tan\theta$`, r`$\tan\theta = \frac{v^2}{gr}\ \text{(no friction)};\qquad v_{\max} = \sqrt{gr\,\frac{\sin\theta + \mu\cos\theta}{\cos\theta - \mu\sin\theta}}$`,
        [v(r`$\theta$`, 'bank angle'), v(r`$v$`, 'speed', r`$\text{m/s}$`), v(r`$r$`, 'radius', r`$\text{m}$`), MU],
        'The bank angle that needs no friction at a design speed, and the top speed with friction.',
        r`With friction, $v_{\max} = \sqrt{gr\tan(\theta + \phi)}$ where $\tan\phi = \mu$.`, r`$\text{m/s}$`),
    P(CURV, null, 'Conical Pendulum', r`$T$`, r`$\tan\theta = \frac{v^2}{rg},\qquad T = 2\pi\sqrt{\frac{L\cos\theta}{g}}$`,
        [v(r`$L$`, 'string length', r`$\text{m}$`), v(r`$\theta$`, 'angle of the string from vertical'), v(r`$r$`, 'radius of the circle, L sin θ', r`$\text{m}$`)],
        'A mass whirled in a horizontal circle on a string.',
        r`The string tension is $\frac{mg}{\cos\theta}$.`, r`$\text{s}$`),
    P(CURV, null, 'Motion in a Vertical Circle', r`$v_{\min}$`, r`$v_{\min,\text{top}} = \sqrt{gr};\qquad T_{\text{bottom}} = \frac{mv^2}{r} + mg$`,
        [G_, v(r`$r$`, 'radius', r`$\text{m}$`), v(r`$m$`, 'mass', r`$\text{kg}$`)],
        'The least speed at the top to keep a string taut, and the tension at the bottom.',
        r`Released from rest to just make the loop on a track, start $\frac{5r}{2}$ above the bottom.`, r`$\text{m/s}$`),
    // Newton's Laws
    P(NEWT, null, "D'Alembert's Principle", r`$\sum F - ma = 0$`, r`$\sum F + (-ma) = 0$`,
        [F_, v(r`$m$`, 'mass', r`$\text{kg}$`), v(r`$a$`, 'acceleration', r`$\text{m/s}^2$`)],
        'Add the reversed effective force −ma and solve a dynamics problem as if it were statics.',
        'Moments about any point then work as in equilibrium.', r`$\text{N}$`),
    P(NEWT, null, 'Atwood Machine', r`$a$`, r`$a = \frac{(m_1 - m_2)g}{m_1 + m_2},\qquad T = \frac{2m_1m_2g}{m_1 + m_2}$`,
        [v(r`$m_1, m_2$`, 'the two hanging masses', r`$\text{kg}$`), G_],
        'Two masses over a light frictionless pulley.',
        'The tension lies between the two weights.', r`$\text{m/s}^2$`),
    P(NEWT, null, 'Block Pulled by a Hanging Mass', r`$a$`, r`$a = \frac{m_2 - \mu m_1}{m_1 + m_2}\,g,\qquad T = m_2(g - a)$`,
        [v(r`$m_1$`, 'block on the table', r`$\text{kg}$`), v(r`$m_2$`, 'hanging mass', r`$\text{kg}$`), MU],
        'A block on a rough table pulled by a mass hanging over the edge.',
        'If μm₁ ≥ m₂ nothing moves (with static friction).', r`$\text{m/s}^2$`),
    // Work and Energy
    P(WE, null, 'Work of a Variable Force', r`$W = \int F\,dx$`, r`$W = \int_{x_1}^{x_2} F\,dx;\qquad \text{spring: } W = \tfrac12k(x_2^2 - x_1^2)$`,
        [F_, v(r`$x$`, 'position', r`$\text{m}$`), v(r`$k$`, 'spring constant', r`$\text{N/m}$`)],
        'Work is the area under the force-displacement curve.',
        'Stretching from 0.1 to 0.2 m takes 3 times the work of 0 to 0.1 m.', r`$\text{J}$`),
    P(WE, null, 'Shaft Power and Torque', r`$P = T\omega$`, r`$P = T\omega = \frac{2\pi NT}{60}$`,
        [v(r`$T$`, 'torque', r`$\text{N}\cdot\text{m}$`), v(r`$\omega$`, 'angular speed', r`$\text{rad/s}$`), v(r`$N$`, 'speed', r`$\text{rpm}$`)],
        'The power a rotating shaft carries.',
        '1 hp = 746 W. Higher speed, less torque for the same power.', r`$\text{W}$`),
    P(WE, null, 'Hoisting Power', r`$P$`, r`$P = \frac{Wv}{\eta} = \frac{mgh}{\eta t}$`,
        [W, v(r`$v$`, 'lifting speed', r`$\text{m/s}$`), v(r`$\eta$`, 'efficiency')],
        'Input power to lift a load at steady speed.',
        'Divide by the efficiency: the motor must supply the losses too.', r`$\text{W}$`),
    // Impulse and Momentum
    P(IMP, null, 'Impulse of a Variable Force', r`$J = \int F\,dt$`, r`$J = \int_{t_1}^{t_2} F\,dt = m(v_2 - v_1)$`,
        [F_, v(r`$t$`, 'time', r`$\text{s}$`)],
        'Impulse is the area under the force-time curve.',
        'A triangular force pulse has impulse ½ F_max Δt.', r`$\text{N}\cdot\text{s}$`),
    P(IMP, null, 'Force from a Jet', r`$F$`, r`$F = \dot{m}(v_2 - v_1) = \rho Q(v_2 - v_1)$`,
        [v(r`$\dot{m}$`, 'mass flow rate', r`$\text{kg/s}$`), v(r`$\rho$`, 'density', r`$\text{kg/m}^3$`), v(r`$Q$`, 'flow rate', r`$\text{m}^3\text{/s}$`)],
        'The force a stream exerts when its velocity is changed (a jet on a plate, a nozzle).',
        r`A jet stopped by a flat plate: $F = \rho Qv$; turned back 180°, $2\rho Qv$.`, r`$\text{N}$`),
    P(IMP, null, 'Recoil', r`$V$`, r`$MV = mv \ \Rightarrow\ V = \frac{mv}{M}$`,
        [v(r`$m, v$`, 'mass and speed of the projectile'), v(r`$M, V$`, 'mass and recoil speed of the gun')],
        'A gun or launcher kicks back so that total momentum stays zero.',
        'The recoil energy is far less than the bullet\'s: ½MV² = ½mv² × m/M.', r`$\text{m/s}$`),
    // Rotation
    P(ROT, null, 'Rolling Down an Incline', r`$a$`, r`$a = \frac{g\sin\theta}{1 + k^2/r^2}$`,
        [G_, v(r`$\theta$`, 'slope angle'), v(r`$k$`, 'radius of gyration about the centre', r`$\text{m}$`), v(r`$r$`, 'rolling radius', r`$\text{m}$`)],
        'Acceleration of a wheel or ball rolling without slipping.',
        'Solid sphere 5/7 g sin θ, cylinder 2/3, hoop 1/2.', r`$\text{m/s}^2$`),
    P(ROT, null, 'Instantaneous Centre of Zero Velocity', r`$v = \omega r_{IC}$`, r`$v_P = \omega\,r_{P/IC}$`,
        [v(r`$\omega$`, 'angular velocity of the body', r`$\text{rad/s}$`), v(r`$r_{P/IC}$`, 'distance from the instant centre to point P', r`$\text{m}$`)],
        'For plane motion, every point moves as if the body were turning about one point.',
        'For a rolling wheel the contact point is the instant centre: the top moves at 2v.', r`$\text{m/s}$`),
    P(ROT, null, 'Flywheel Energy and Fluctuation of Speed', r`$\Delta E$`, r`$\Delta E = \tfrac12I(\omega_{\max}^2 - \omega_{\min}^2) = I\omega^2C_s,\qquad C_s = \frac{\omega_{\max} - \omega_{\min}}{\omega}$`,
        [v(r`$I$`, 'moment of inertia', r`$\text{kg}\cdot\text{m}^2$`), v(r`$\omega$`, 'mean speed', r`$\text{rad/s}$`), v(r`$C_s$`, 'coefficient of fluctuation of speed')],
        'The energy a flywheel absorbs or releases as its speed swings, used to size it.',
        'ω here is the mean of the maximum and minimum speeds.', r`$\text{J}$`),
];

module.exports = { subject: 'ESAS', topic: 'Engineering Mechanics', migration: '20261213000000_cards_engineering_mechanics', file, revisions, retire, drafts };
