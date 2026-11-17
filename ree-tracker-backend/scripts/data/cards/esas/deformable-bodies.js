'use strict';

// ESAS › Fundamentals of Deformable Bodies formula cards (Library round,
// 2026-11-17): 12 live cards for 12 subtopics, covering axial stress, thermal
// stress, basic torsion, flexure and thin cylinders. Shear and moment
// diagrams, beam shear, deflection, Mohr's circle, columns and joints had
// nothing. Physics for Engineers holds Young's, shear and bulk moduli, and
// Engineering Mechanics the area moments of inertia, so this file builds on
// them. Formula cards carry SI units. See mathematics/algebra.js for the
// format; tests/deformableBodiesFormulas.test.js checks each result by an
// independent route: integrating the elastic curve, Mohr's circle against
// the transformation equations, superposition, and energy.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SS = 'Simple Stress';
const SH = "Strain and Hooke's Law";
const TS = 'Thermal Stress';
const TOR = 'Torsion';
const SMD = 'Shear and Moment Diagrams';
const FLEX = 'Flexural Stress';
const BSH = 'Shear Stress in Beams';
const DEF = 'Beam Deflection';
const COMB = "Combined Stresses and Mohr's Circle";
const COL = 'Columns';
const PV = 'Thin-Walled Pressure Vessels';
const JOINT = 'Riveted and Welded Joints';

const file = [
    ['02e09f77-92e5-405d-8ce0-4627cf9be28e', SS, null], // Normal Stress
    ['a7745b52-b2cb-4280-8e39-bf546ef37e9d', SH, null], // Normal Strain
    ['b63e8d92-1e91-46e7-b140-9b0a15592582', SH, null], // Hooke's Law
    ['8e34a5ed-01d7-4ce4-8617-0f7660f0c9c6', SH, null], // Poisson's Ratio
    ['14d3e663-506d-4809-b21b-01c0bc439f95', SH, null], // Axial Deformation
    ['91913091-7292-4472-8672-893787de4109', TS, null], // Thermal Deformation
    ['9d10d7a1-2224-4cf1-8c61-065bec91f28d', TS, null], // Thermal Stress
    ['179cf14d-6830-4068-bd13-3e1b68f0c68b', TOR, null], // Torsional Shear Stress
    ['5ac9fa30-0b91-49b4-9523-feec3feb2d7d', TOR, null], // Angle of Twist
    ['caf007c2-d88d-4966-a127-c3346e31d6e9', FLEX, null], // Flexure Formula
    ['8353d7ca-58d4-467e-bbdd-f4064a588db3', PV, null], // Hoop Stress in a Thin Cylinder
    ['9acfe5f4-5ba1-4923-86ed-9f3d9fc1ac56', PV, null], // Longitudinal Stress in a Thin Cylinder
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const PA = r`$\text{Pa}$`;
const LOAD = v(r`$P$`, 'load', r`$\text{N}$`);
const AREA = v(r`$A$`, 'area', r`$\text{m}^2$`);
const E_ = v(r`$E$`, 'modulus of elasticity', PA);
const I_ = v(r`$I$`, 'moment of inertia of the section', r`$\text{m}^4$`);
const L_ = v(r`$L$`, 'length or span', r`$\text{m}$`);
const W_ = v(r`$w$`, 'uniform load', r`$\text{N/m}$`);
const SX = v(r`$\sigma_x, \sigma_y$`, 'normal stresses (tension positive)', PA);
const TXY = v(r`$\tau_{xy}$`, 'shear stress', PA);
const G_ = v(r`$G$`, 'shear modulus', PA);

const drafts = [
    // Simple Stress
    P(SS, null, 'Average Shear Stress', r`$\tau$`, r`$\tau = \frac{V}{A};\qquad \text{double shear: } \tau = \frac{V}{2A}$`,
        [v(r`$V$`, 'shear force', r`$\text{N}$`), v(r`$A$`, 'area of ONE shear plane', r`$\text{m}^2$`)],
        'Shear force spread over the area that would slide.',
        'A pin through a clevis is in double shear: two planes share the load.', PA),
    P(SS, null, 'Bearing Stress', r`$\sigma_b$`, r`$\sigma_b = \frac{P}{td}$`,
        [LOAD, v(r`$t$`, 'plate thickness', r`$\text{m}$`), v(r`$d$`, 'bolt or rivet diameter', r`$\text{m}$`)],
        'Contact pressure between a bolt and the side of its hole.',
        'The area is the projected rectangle t × d, not the half-cylinder.', PA),
    P(SS, null, 'Allowable Stress and Factor of Safety', r`$FS$`, r`$\sigma_{\text{allow}} = \frac{\sigma_{\text{fail}}}{FS}$`,
        [v(r`$\sigma_{\text{fail}}$`, 'yield or ultimate strength', PA), v(r`$FS$`, 'factor of safety, above 1')],
        'The working stress kept a safe margin below failure.',
        'State which strength it is based on: yield for ductile metals, ultimate for brittle ones.', PA),
    P(SS, null, 'Stresses on an Inclined Plane under Axial Load', r`$\sigma_\theta$`, r`$\sigma_\theta = \frac{P}{A}\cos^2\theta,\qquad \tau_\theta = \frac{P}{2A}\sin2\theta,\qquad \tau_{\max} = \frac{P}{2A} \text{ at } 45^\circ$`,
        [LOAD, AREA, v(r`$\theta$`, 'angle of the plane\'s normal from the bar axis')],
        'Normal and shear stress on a slanted cut through an axially loaded bar.',
        'Ductile bars in tension fail by shear along 45° planes.', PA),
    // Strain and Hooke's Law
    P(SH, null, "Hooke's Law in Shear", r`$\tau = G\gamma$`, r`$\tau = G\gamma,\qquad G = \frac{E}{2(1 + \nu)}$`,
        [G_, v(r`$\gamma$`, 'shear strain (radians)'), E_, v(r`$\nu$`, 'Poisson\'s ratio')],
        'Shear stress is proportional to shear strain; G, E and ν are linked.',
        'Steel: E = 200 GPa, ν = 0.3, so G ≈ 77 GPa.', PA),
    P(SH, null, "Generalized Hooke's Law", r`$\varepsilon_x$`, r`$\varepsilon_x = \frac{\sigma_x - \nu(\sigma_y + \sigma_z)}{E}$ (and cyclically)`,
        [v(r`$\sigma_x, \sigma_y, \sigma_z$`, 'normal stresses', PA), E_, v(r`$\nu$`, 'Poisson\'s ratio')],
        'Strain in one direction under stresses in two or three directions.',
        r`Volume strain $= \frac{(1 - 2\nu)(\sigma_x + \sigma_y + \sigma_z)}{E}$.`),
    P(SH, null, 'Deformation from Own Weight', r`$\delta$`, r`$\delta = \frac{\rho gL^2}{2E} = \frac{WL}{2AE}$`,
        [v(r`$\rho$`, 'density', r`$\text{kg/m}^3$`), L_, E_, v(r`$W$`, 'total weight of the bar', r`$\text{N}$`)],
        'Stretch of a hanging bar under its own weight.',
        'Half what the whole weight would cause if hung at the end.', r`$\text{m}$`),
    P(SH, null, 'Composite Bar Sharing a Load', r`$P_1$`, r`$P_1 = P\,\frac{E_1A_1}{E_1A_1 + E_2A_2},\qquad \delta_1 = \delta_2$`,
        [LOAD, v(r`$E_iA_i$`, 'axial stiffness of each material', r`$\text{N}$`)],
        'Two materials side by side, stretched equally, share a load by their stiffness.',
        'Statically indeterminate: equilibrium plus the compatibility δ₁ = δ₂.', r`$\text{N}$`),
    P(SH, null, 'Strain Energy in Axial Loading', r`$U$`, r`$U = \frac{P^2L}{2AE},\qquad u_r = \frac{\sigma_{pl}^2}{2E}\ \text{(modulus of resilience)}$`,
        [LOAD, L_, AREA, E_],
        'Energy stored in an elastically stretched bar, and per unit volume up to the proportional limit.',
        'It equals the area under the load-deformation line: ½Pδ.', r`$\text{J}$`),
    // Thermal Stress
    P(TS, null, 'Restrained Bar with a Gap', r`$\sigma$`, r`$\sigma = \frac{E(\alpha L\,\Delta T - \Delta)}{L}\quad \text{when } \alpha L\,\Delta T > \Delta$`,
        [E_, v(r`$\alpha$`, 'expansion coefficient', r`$\text{1/}^\circ\text{C}$`), L_, v(r`$\Delta$`, 'the gap before the wall', r`$\text{m}$`)],
        'A heated bar that first closes a gap, then is stopped by the wall.',
        'If the free expansion is less than the gap, there is no stress at all.', PA),
    P(TS, null, 'Restrained Bars in Series', r`$P$`, r`$P\left(\frac{L_1}{A_1E_1} + \frac{L_2}{A_2E_2}\right) = (\alpha_1L_1 + \alpha_2L_2)\Delta T$`,
        [v(r`$L_i, A_i, E_i, \alpha_i$`, 'each segment\'s length, area, modulus and expansion coefficient')],
        'Two bars end to end between rigid walls: the force that cancels their combined expansion.',
        'The force is the same in both; their stresses differ by their areas.', r`$\text{N}$`),
    // Torsion
    P(TOR, null, 'Torsion of a Hollow Shaft', r`$\tau_{\max}$`, r`$\tau_{\max} = \frac{Tc}{J},\qquad J = \frac{\pi(d_o^4 - d_i^4)}{32}$`,
        [v(r`$T$`, 'torque', r`$\text{N}\cdot\text{m}$`), v(r`$c$`, 'outer radius', r`$\text{m}$`), v(r`$d_o, d_i$`, 'outer and inner diameters', r`$\text{m}$`)],
        'Shear stress in a tube under torque.',
        'Weight for weight, a hollow shaft is stronger and stiffer in torsion.', PA),
    P(TOR, null, 'Solid Shaft Size for Power', r`$d$`, r`$T = \frac{P}{2\pi f},\qquad \tau = \frac{16T}{\pi d^3}\ \Rightarrow\ d = \sqrt[3]{\frac{16T}{\pi\tau_{\text{allow}}}}$`,
        [v(r`$P$`, 'power', r`$\text{W}$`), v(r`$f$`, 'rotational speed', r`$\text{rev/s}$`), v(r`$\tau_{\text{allow}}$`, 'allowable shear stress', PA)],
        'The smallest solid shaft that carries a given power at a given speed.',
        'Convert rpm to rev/s (÷ 60).', r`$\text{m}$`),
    P(TOR, null, 'Shafts in Series and Parallel', r`$\phi$`, r`$\text{series: } \phi = \sum\frac{T_iL_i}{G_iJ_i};\qquad \text{fixed both ends: } T_A + T_B = T,\ \frac{T_AL_A}{G_AJ_A} = \frac{T_BL_B}{G_BJ_B}$`,
        [v(r`$T$`, 'torque', r`$\text{N}\cdot\text{m}$`), G_, v(r`$J$`, 'polar moment of inertia', r`$\text{m}^4$`)],
        'Angles add along a stepped shaft; a shaft fixed at both ends splits the torque so both parts twist equally.',
        'The stiffer side takes the larger share of torque.', r`$\text{rad}$`),
    P(TOR, null, 'Helical Spring', r`$\delta$`, r`$\tau_{\max} = \frac{16PR}{\pi d^3}\left(1 + \frac{d}{4R}\right),\qquad \delta = \frac{64PR^3n}{Gd^4}$`,
        [LOAD, v(r`$R$`, 'mean coil radius', r`$\text{m}$`), v(r`$d$`, 'wire diameter', r`$\text{m}$`), v(r`$n$`, 'active turns'), G_],
        'Stress and stretch of a close-coiled spring.',
        r`Spring constant $k = \frac{Gd^4}{64R^3n}$; the bracket corrects for direct shear.`, r`$\text{m}$`),
    // Shear and Moment Diagrams
    P(SMD, null, 'Load, Shear and Moment Relations', r`$\frac{dM}{dx} = V$`, r`$\frac{dV}{dx} = -w,\qquad \frac{dM}{dx} = V;\qquad \Delta M = \text{area of the shear diagram}$`,
        [W_, v(r`$V$`, 'shear force', r`$\text{N}$`), v(r`$M$`, 'bending moment', r`$\text{N}\cdot\text{m}$`)],
        'How the load, shear and moment diagrams are tied together.',
        'The moment is greatest where the shear crosses zero.', r`$\text{N}\cdot\text{m}$`),
    P(SMD, null, 'Maximum Moment of a Simple Beam', r`$M_{\max}$`, r`$\text{uniform: } \frac{wL^2}{8};\quad \text{centre load: } \frac{PL}{4};\quad \text{load at } a: \frac{Pab}{L}$`,
        [W_, LOAD, L_, v(r`$a, b$`, 'distances from the load to the supports', r`$\text{m}$`)],
        'Largest bending moment in a beam on two supports for the common loadings.',
        'The uniform load\'s maximum is at mid-span; a point load\'s is under the load.', r`$\text{N}\cdot\text{m}$`),
    P(SMD, null, 'Maximum Moment of a Cantilever', r`$M_{\max}$`, r`$\text{end load: } PL;\qquad \text{uniform: } \frac{wL^2}{2}$`,
        [LOAD, W_, L_],
        'Largest bending moment in a cantilever, at the fixed end.',
        'The cantilever moment is negative (hogging) with the usual sign convention.', r`$\text{N}\cdot\text{m}$`),
    // Flexural Stress
    P(FLEX, null, 'Section Modulus', r`$S$`, r`$S = \frac{I}{c};\quad \sigma_{\max} = \frac{M}{S};\quad \text{rectangle } \frac{bh^2}{6},\ \text{circle } \frac{\pi d^3}{32}$`,
        [I_, v(r`$c$`, 'distance to the outer fibre', r`$\text{m}$`), v(r`$b, h$`, 'width and depth', r`$\text{m}$`)],
        'The section property that sets bending stress.',
        'A plank on edge (h vertical) is far stronger than laid flat.', r`$\text{m}^3$`),
    P(FLEX, null, 'Curvature of a Bent Beam', r`$\frac{1}{\rho}$`, r`$\frac{1}{\rho} = \frac{M}{EI},\qquad \sigma = \frac{Ey}{\rho}$`,
        [v(r`$\rho$`, 'radius of curvature', r`$\text{m}$`), E_, I_],
        'How sharply a beam bends under a moment.',
        r`Bending a wire round a drum of radius $\rho$: $\sigma = \frac{Ed}{2\rho}$.`, r`$\text{1/m}$`),
    P(FLEX, null, 'Transformed Section of a Composite Beam', r`$n$`, r`$n = \frac{E_2}{E_1},\quad \text{widen material 2 by } n;\quad \sigma_2 = n\frac{My}{I_t}$`,
        [v(r`$E_1, E_2$`, 'moduli of the two materials', PA), v(r`$I_t$`, 'moment of inertia of the transformed section', r`$\text{m}^4$`)],
        'A beam of two materials (timber with steel plates, reinforced concrete) analysed as one.',
        'Multiply the stress back by n in the transformed material.', PA),
    // Shear Stress in Beams
    P(BSH, null, 'Shear Stress in Beams', r`$\tau = \frac{VQ}{Ib}$`, r`$\tau = \frac{VQ}{Ib}$`,
        [v(r`$V$`, 'shear force', r`$\text{N}$`), v(r`$Q$`, 'first moment about the neutral axis of the area beyond the level', r`$\text{m}^3$`), I_, v(r`$b$`, 'width at that level', r`$\text{m}$`)],
        'The horizontal (and vertical) shear stress at a level in a beam.',
        'It is zero at the top and bottom and usually greatest at the neutral axis.', PA),
    P(BSH, null, 'Maximum Shear Stress in Common Sections', r`$\tau_{\max}$`, r`$\text{rectangle: } \tau_{\max} = \frac{3V}{2A};\qquad \text{solid circle: } \tau_{\max} = \frac{4V}{3A}$`,
        [v(r`$V$`, 'shear force', r`$\text{N}$`), AREA],
        'Peak beam shear stress, at the neutral axis.',
        'In a wide-flange beam the web carries nearly all the shear: τ ≈ V / (web area).', PA),
    P(BSH, null, 'Shear Flow and Fastener Spacing', r`$q$`, r`$q = \frac{VQ}{I},\qquad s = \frac{F_{\text{fastener}}}{q}$`,
        [v(r`$q$`, 'shear flow', r`$\text{N/m}$`), v(r`$F_{\text{fastener}}$`, 'capacity of one nail, bolt or weld length', r`$\text{N}$`)],
        'The shear per unit length a built-up beam\'s joint must carry, and the fastener spacing it allows.',
        'Use Q of the piece being held on, not of half the section.', r`$\text{N/m}$`),
    // Beam Deflection
    P(DEF, null, 'Elastic Curve Equation', r`$EIy'' = M$`, r`$EI\frac{d^2y}{dx^2} = M(x)$`,
        [E_, I_, v(r`$y$`, 'deflection', r`$\text{m}$`), v(r`$M$`, 'bending moment', r`$\text{N}\cdot\text{m}$`)],
        'Integrate the moment twice to find the beam\'s deflected shape.',
        'Constants come from the supports: y = 0 at a support, y\' = 0 at a fixed end.', r`$\text{N}\cdot\text{m}$`),
    P(DEF, null, 'Deflections of Standard Beams', r`$\delta_{\max}$`, r`$\text{cantilever: } \frac{PL^3}{3EI},\ \frac{wL^4}{8EI};\qquad \text{simple: } \frac{PL^3}{48EI},\ \frac{5wL^4}{384EI}$`,
        [LOAD, W_, L_, E_, I_],
        'Greatest deflection for end/centre point loads and uniform loads.',
        'Combine loads by adding deflections (superposition).', r`$\text{m}$`),
    P(DEF, null, 'Slopes of Standard Beams', r`$\theta_{\max}$`, r`$\text{cantilever: } \frac{PL^2}{2EI},\ \frac{wL^3}{6EI};\qquad \text{simple (at supports): } \frac{PL^2}{16EI},\ \frac{wL^3}{24EI}$`,
        [LOAD, W_, L_, E_, I_],
        'Greatest slope for the same standard cases.',
        'The answer is in radians.', r`$\text{rad}$`),
    P(DEF, null, 'Moment-Area Theorems', r`$\theta_{B/A}$`, r`$\theta_{B/A} = \int_A^B\frac{M}{EI}dx;\qquad t_{B/A} = \int_A^B\frac{M}{EI}x_B\,dx$`,
        [v(r`$\theta_{B/A}$`, 'change of slope from A to B', r`$\text{rad}$`), v(r`$t_{B/A}$`, 'deviation of B from the tangent at A', r`$\text{m}$`), v(r`$x_B$`, 'distance measured from B', r`$\text{m}$`)],
        'Slope change is the area of the M/EI diagram; deviation is that area\'s moment about the point.',
        'For a cantilever, take A at the fixed end: the tangent there is horizontal.', r`$\text{m}$`),
    // Combined Stresses and Mohr's Circle
    P(COMB, null, 'Eccentric Axial Load', r`$\sigma$`, r`$\sigma = \frac{P}{A} \pm \frac{Pec}{I};\qquad \text{rectangle: no tension if } e \le \frac{b}{6}$`,
        [LOAD, AREA, v(r`$e$`, 'eccentricity of the load', r`$\text{m}$`), I_, v(r`$c$`, 'distance to the extreme fibre', r`$\text{m}$`)],
        'A load off the centroid adds bending to direct stress.',
        'The middle-third rule: keep the load within the kern to avoid tension.', PA),
    P(COMB, null, 'Plane Stress Transformation', r`$\sigma_{x'}$`, r`$\sigma_{x'} = \frac{\sigma_x + \sigma_y}{2} + \frac{\sigma_x - \sigma_y}{2}\cos2\theta + \tau_{xy}\sin2\theta,\quad \tau_{x'y'} = -\frac{\sigma_x - \sigma_y}{2}\sin2\theta + \tau_{xy}\cos2\theta$`,
        [SX, TXY, v(r`$\theta$`, 'rotation of the element, counter-clockwise')],
        'Stresses on an element rotated by θ.',
        'The sum σx + σy is the same for every rotation.', PA),
    P(COMB, null, 'Principal Stresses', r`$\sigma_{1,2}$`, r`$\sigma_{1,2} = \frac{\sigma_x + \sigma_y}{2} \pm \sqrt{\left(\frac{\sigma_x - \sigma_y}{2}\right)^2 + \tau_{xy}^2},\qquad \tan2\theta_p = \frac{2\tau_{xy}}{\sigma_x - \sigma_y}$`,
        [SX, TXY],
        'The largest and smallest normal stresses, on planes with no shear.',
        'Principal planes are 45° from the planes of maximum shear.', PA),
    P(COMB, null, "Mohr's Circle", r`$R$`, r`$C = \frac{\sigma_x + \sigma_y}{2},\qquad R = \sqrt{\left(\frac{\sigma_x - \sigma_y}{2}\right)^2 + \tau_{xy}^2} = \tau_{\max}$`,
        [SX, TXY],
        'A circle that shows every state of stress at a point: centre C, radius R = the greatest in-plane shear.',
        'A rotation of θ on the element is 2θ on the circle.', PA),
    P(COMB, null, 'Combined Bending and Torsion of a Shaft', r`$\tau_{\max}$`, r`$\tau_{\max} = \frac{16}{\pi d^3}\sqrt{M^2 + T^2},\qquad \sigma_{\max} = \frac{16}{\pi d^3}\left(M + \sqrt{M^2 + T^2}\right)$`,
        [v(r`$M$`, 'bending moment', r`$\text{N}\cdot\text{m}$`), v(r`$T$`, 'torque', r`$\text{N}\cdot\text{m}$`), v(r`$d$`, 'shaft diameter', r`$\text{m}$`)],
        'Peak shear and normal stress in a solid shaft that both bends and twists.',
        r`$\sqrt{M^2 + T^2}$ is the equivalent torque; $\frac12(M + \sqrt{M^2 + T^2})$ the equivalent moment.`, PA),
    // Columns
    P(COL, null, 'Euler Buckling Load', r`$P_{cr}$`, r`$P_{cr} = \frac{\pi^2EI}{(KL)^2};\quad K = 1 \text{ (pinned)},\ 2 \text{ (fixed-free)},\ 0.7 \text{ (fixed-pinned)},\ 0.5 \text{ (fixed-fixed)}$`,
        [E_, v(r`$I$`, 'the SMALLEST moment of inertia', r`$\text{m}^4$`), L_, v(r`$K$`, 'effective-length factor')],
        'The axial load at which a slender column buckles.',
        'A flagpole (fixed-free) buckles at a quarter of the pinned-pinned load.', r`$\text{N}$`),
    P(COL, null, 'Slenderness Ratio and Critical Stress', r`$\sigma_{cr}$`, r`$\sigma_{cr} = \frac{\pi^2E}{(KL/r)^2},\qquad r = \sqrt{\frac IA}$`,
        [E_, v(r`$KL/r$`, 'slenderness ratio'), v(r`$r$`, 'least radius of gyration', r`$\text{m}$`)],
        'Euler\'s buckling stress; valid only while it stays below the proportional limit.',
        r`For steel (σ_pl ≈ 200 MPa) Euler applies above about $\frac{KL}{r} \approx 100$.`, PA),
    P(COL, null, 'J. B. Johnson Formula', r`$\sigma_{cr}$`, r`$\sigma_{cr} = \sigma_y - \frac{\sigma_y^2}{4\pi^2E}\left(\frac{KL}{r}\right)^2$`,
        [v(r`$\sigma_y$`, 'yield strength', PA), E_, v(r`$KL/r$`, 'slenderness ratio')],
        'Critical stress for intermediate columns, too short for Euler.',
        r`It meets Euler's curve tangentially at $\frac{KL}{r} = \sqrt{\frac{2\pi^2E}{\sigma_y}}$.`, PA),
    // Thin-Walled Pressure Vessels
    P(PV, null, 'Thin Sphere Stress', r`$\sigma$`, r`$\sigma = \frac{pD}{4t}$`,
        [v(r`$p$`, 'internal pressure', PA), v(r`$D$`, 'inside diameter', r`$\text{m}$`), v(r`$t$`, 'wall thickness', r`$\text{m}$`)],
        'Stress in a thin spherical shell, the same in every direction.',
        'A sphere needs half the wall of a cylinder of the same diameter.', PA),
    P(PV, null, 'Thin-Wall Condition and Bursting Force', r`$F = pDL$`, r`$\frac{t}{D} \le \frac{1}{20};\qquad F = pDL \text{ on each half of a cylinder}$`,
        [v(r`$p$`, 'internal pressure', PA), v(r`$D, L$`, 'diameter and length', r`$\text{m}$`)],
        'When the thin-wall formulas apply, and the force trying to split a cylinder in half.',
        'The bursting force acts on the projected area D × L, resisted by 2tL of wall.', r`$\text{N}$`),
    P(PV, null, 'Thick-Walled Cylinder (Lamé)', r`$\sigma_t$`, r`$\sigma_{t,\text{inner}} = p\,\frac{r_o^2 + r_i^2}{r_o^2 - r_i^2}$`,
        [v(r`$p$`, 'internal pressure', PA), v(r`$r_i, r_o$`, 'inner and outer radii', r`$\text{m}$`)],
        'The greatest hoop stress in a thick cylinder, at the bore.',
        'For a thin wall it reduces to pD/(2t).', PA),
    // Riveted and Welded Joints
    P(JOINT, null, 'Rivet Shear Capacity', r`$P_s$`, r`$P_s = n\,m\,\frac{\pi d^2}{4}\tau_{\text{allow}}$`,
        [v(r`$n$`, 'rivets'), v(r`$m$`, 'shear planes per rivet (1 lap, 2 butt with two cover plates)'), v(r`$d$`, 'rivet diameter', r`$\text{m}$`), v(r`$\tau_{\text{allow}}$`, 'allowable shear', PA)],
        'The load a riveted joint can carry before its rivets shear.',
        'Use the hole (driven) diameter if the problem says so.', r`$\text{N}$`),
    P(JOINT, null, 'Plate Bearing and Tearing Capacity', r`$P_t$`, r`$P_b = n\,d\,t\,\sigma_b;\qquad P_t = (b - n'd)\,t\,\sigma_t$`,
        [v(r`$t$`, 'plate thickness', r`$\text{m}$`), v(r`$b$`, 'plate width', r`$\text{m}$`), v(r`$n'$`, 'holes across the critical section'), v(r`$\sigma_b, \sigma_t$`, 'allowable bearing and tensile stress', PA)],
        'The joint\'s capacity in bearing on the holes and in tension across the net section.',
        'The joint\'s strength is the smallest of shear, bearing and tearing.', r`$\text{N}$`),
    P(JOINT, null, 'Joint Efficiency', r`$\eta$`, r`$\eta = \frac{\min(P_s, P_b, P_t)}{b\,t\,\sigma_t}$`,
        [v(r`$b\,t\,\sigma_t$`, 'strength of the solid plate', r`$\text{N}$`)],
        'How strong a joint is compared with the plate without holes.',
        'Pressure vessels use it: t = pD/(2σ_t η).'),
    P(JOINT, null, 'Fillet Weld Strength', r`$P$`, r`$P = 0.707\,a\,L\,\tau_{\text{allow}}$`,
        [v(r`$a$`, 'leg size of the weld', r`$\text{m}$`), v(r`$L$`, 'total weld length', r`$\text{m}$`), v(r`$\tau_{\text{allow}}$`, 'allowable shear on the throat', PA)],
        'Load capacity of a fillet weld, which fails in shear through its throat (0.707 × leg).',
        'For an eccentric member, split the weld length so each line\'s moment balances.', r`$\text{N}$`),
];

module.exports = { subject: 'ESAS', topic: 'Fundamentals of Deformable Bodies', migration: '20261214000000_cards_deformable_bodies', file, revisions, retire, drafts };
