'use strict';

// EE › Electromagnetism formula cards (Library round, 2026-11-18): 15 live
// cards for 15 subtopics, all correct, filed as they are. This file adds the
// rest: line and sheet fields, Gauss's law and charged spheres, potential
// from field and potential energy, coaxial and spherical capacitors, layered
// dielectrics and field energy, current density and drift, cable insulation
// resistance, Biot-Savart and the loop, Ampère with the solenoid and toroid,
// B = μH, core losses, magnetic energy, air-gap circuits, the rotating coil,
// inductance from flux linkage, Lorentz force, torque on a loop, magnetic
// pull, Maxwell's equations, wave speed and impedance, the Poynting vector
// and skin depth. Mutual voltages and coupled-coil energy are in Electric
// Circuits 2. See mathematics/algebra.js for the format;
// tests/electromagnetismFormulas.test.js checks each by numerical
// integration or simulation.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const COUL = "Coulomb's Law";
const FIELD = 'Electric Field';
const GAUSS = "Gauss's Law";
const POT = 'Electric Potential';
const CAP = 'Capacitance and Dielectrics';
const CUR = 'Current and Resistivity';
const BIOT = 'Biot-Savart Law';
const AMP = "Ampère's Law";
const MAT = 'Magnetic Materials and Hysteresis';
const MCIR = 'Magnetic Circuits';
const FAR = "Faraday's Law";
const IND = 'Inductance';
const FORCE = 'Force on Conductors';
const MAX = "Maxwell's Equations";
const WAVE = 'Electromagnetic Waves';
const CONST = 'Constants';

const file = [
    ['05094b20-f59a-4f6d-88f8-589e41f1edd2', COUL, CONST], // Coulomb Constant
    ['cc7c2b19-2da8-4935-9e7e-c464dac48885', COUL, CONST], // Elementary Charge
    ['35593a3f-5ffb-47aa-8811-8ae25545eb70', COUL, null], // Coulomb's Law
    ['2ff63781-1d50-4f3c-a528-6c956f096aa6', FIELD, null], // Electric Field of a Point Charge
    ['e49e4a23-a0ef-4e20-952f-e1e55583497e', POT, null], // Electric Potential of a Point Charge
    ['1e76d566-0cb3-49d1-ac3c-742c59676d68', CAP, null], // Capacitance of a Parallel-Plate Capacitor
    ['ef2c2a51-7501-48ac-846c-ee5a390f58a6', AMP, null], // Magnetic Field of a Long Straight Conductor
    ['65492df8-55ac-4751-9902-f955b75accfe', MCIR, null], // Magnetomotive Force
    ['82e6d9b9-a8ab-4447-954d-c2f584fd33df', MCIR, null], // Reluctance
    ['08d1990f-dc1f-4ad4-82eb-af423132d775', FAR, null], // Faraday's Law of Induction
    ['5a6b15e1-c62f-42fe-97e3-b59dff5c68d9', FAR, null], // Motional EMF
    ['49cb0cfe-c3b9-4424-8ced-9d19786b8909', IND, null], // Inductance of a Solenoid
    ['ab4ea536-f888-4289-b432-50a2f6b55dca', IND, null], // Mutual Inductance
    ['7df6623b-38bc-43db-80f5-7b22ca533eb8', FORCE, null], // Force on a Current-Carrying Conductor
    ['482f746a-2f61-431d-8ab2-e89f14312c1d', FORCE, null], // Force Between Parallel Conductors
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const EPS = v(r`$\varepsilon$`, 'permittivity, ε_rε₀', r`$\text{F/m}$`);
const MU = v(r`$\mu$`, 'permeability, μ_rμ₀', r`$\text{H/m}$`);
const I_ = v(r`$I$`, 'current', r`$\text{A}$`);

const drafts = [
    // Coulomb's Law (with the field of distributions)
    P(COUL, null, 'Force and Energy of a Charge in a Field', r`$F = qE$`, r`$F = qE,\qquad W = qV,\qquad \tfrac12mv^2 = qV \text{ (from rest)}$`,
        [v(r`$q$`, 'charge', r`$\text{C}$`), v(r`$E$`, 'field', r`$\text{V/m}$`), v(r`$V$`, 'potential difference crossed', r`$\text{V}$`)],
        'The force a field puts on a charge, and the energy the charge gains crossing a potential difference.',
        'An electron through 1 V gains 1 eV = 1.602 × 10⁻¹⁹ J.', r`$\text{N}$`),
    // Electric Field
    P(FIELD, null, 'Field of Line and Sheet Charges', r`$E = \frac{\lambda}{2\pi\varepsilon r}$`, r`$\text{line: } E = \frac{\lambda}{2\pi\varepsilon r};\qquad \text{sheet: } E = \frac{\sigma}{2\varepsilon};\qquad \text{between plates: } E = \frac{\sigma}{\varepsilon} = \frac{V}{d}$`,
        [v(r`$\lambda$`, 'charge per length', r`$\text{C/m}$`), v(r`$\sigma$`, 'charge per area', r`$\text{C/m}^2$`), EPS],
        'Fields of the long line, the wide sheet and the parallel-plate gap.',
        'A line\'s field falls as 1/r, a sheet\'s doesn\'t fall at all, a point\'s as 1/r².', r`$\text{V/m}$`),
    // Gauss's Law
    P(GAUSS, null, "Gauss's Law", r`$\oint \mathbf{D}\cdot d\mathbf{A} = Q_{enc}$`, r`$\oint\mathbf{D}\cdot d\mathbf{A} = Q_{\text{enc}},\qquad \mathbf{D} = \varepsilon\mathbf{E}$`,
        [v(r`$\mathbf{D}$`, 'electric flux density', r`$\text{C/m}^2$`), v(r`$Q_{\text{enc}}$`, 'charge inside the closed surface', r`$\text{C}$`)],
        'The electric flux out of any closed surface equals the charge inside: the quick route to fields with symmetry.',
        'Pick a surface on which E is constant (sphere, cylinder, pillbox). Charge outside contributes no net flux.'),
    P(GAUSS, null, 'Field of a Charged Sphere', r`$E = \frac{kQ}{r^2}\ (r \ge R)$`, r`$r \ge R: E = \frac{kQ}{r^2};\qquad r < R: E = 0 \text{ (conductor)},\ E = \frac{kQr}{R^3} \text{ (uniform solid)}$`,
        [v(r`$Q$`, 'total charge', r`$\text{C}$`), v(r`$R$`, 'sphere radius', r`$\text{m}$`), v(r`$r$`, 'distance from the centre', r`$\text{m}$`)],
        'Outside, a charged sphere acts like a point charge; inside, a conductor has no field and a uniform solid one grows linearly.',
        'All of a conductor\'s excess charge sits on its surface.', r`$\text{V/m}$`),
    // Electric Potential
    P(POT, null, 'Potential and Field', r`$V_{ab} = -\int_b^a\mathbf{E}\cdot d\mathbf{l}$`, r`$V_a - V_b = -\int_b^a\mathbf{E}\cdot d\mathbf{l};\qquad \mathbf{E} = -\nabla V;\qquad \text{uniform: } E = \frac{V}{d}$`,
        [v(r`$\mathbf{E}$`, 'electric field', r`$\text{V/m}$`), v(r`$d$`, 'distance along the field', r`$\text{m}$`)],
        'Potential is the work per charge against the field; the field points downhill in potential.',
        'Equipotential surfaces are always perpendicular to the field.', r`$\text{V}$`),
    P(POT, null, 'Potential Energy of Two Charges', r`$U = \frac{kq_1q_2}{r}$`, r`$U = \frac{kq_1q_2}{r}$`,
        [v(r`$q_1, q_2$`, 'charges, with sign', r`$\text{C}$`), v(r`$r$`, 'separation', r`$\text{m}$`)],
        'The work needed to bring two charges from far apart to separation r.',
        'For several charges add U for every pair. Negative U means the pair attracts.', r`$\text{J}$`),
    // Capacitance and Dielectrics
    P(CAP, null, 'Coaxial and Spherical Capacitance', r`$C = \frac{2\pi\varepsilon L}{\ln(b/a)}$`, r`$\text{coaxial: } C = \frac{2\pi\varepsilon L}{\ln(b/a)};\qquad \text{concentric spheres: } C = \frac{4\pi\varepsilon ab}{b - a};\qquad \text{isolated sphere: } 4\pi\varepsilon R$`,
        [v(r`$a, b$`, 'inner and outer radii', r`$\text{m}$`), v(r`$L$`, 'length', r`$\text{m}$`), EPS],
        'Capacitance of a cable and of spherical electrodes.',
        'Cable capacitance per km sets its charging current: I = ωCV.', r`$\text{F}$`),
    P(CAP, null, 'Capacitor with Layered Dielectrics', r`$C_{\text{layered}}$`, r`$C = \frac{\varepsilon_0A}{\frac{d_1}{\varepsilon_{r1}} + \frac{d_2}{\varepsilon_{r2}}}$`,
        [v(r`$d_k$`, 'thickness of layer k', r`$\text{m}$`), v(r`$\varepsilon_{rk}$`, 'its relative permittivity')],
        'Dielectric layers stacked between plates act as capacitors in series.',
        'D is the same in every layer, so the field is strongest in the layer with the lowest εᵣ: an air layer breaks down first.', r`$\text{F}$`),
    P(CAP, null, 'Energy Density of an Electric Field', r`$w = \tfrac12\varepsilon E^2$`, r`$w = \tfrac12\varepsilon E^2 = \tfrac12DE$`,
        [EPS, v(r`$E$`, 'field strength', r`$\text{V/m}$`)],
        'Energy stored per cubic metre of an electric field.',
        'Times the gap volume Ad it gives a capacitor\'s ½CV².', r`$\text{J/m}^3$`),
    // Current and Resistivity
    P(CUR, null, 'Current Density and Drift Velocity', r`$J = nqv_d = \sigma E$`, r`$J = \frac{I}{A} = nqv_d = \sigma E$`,
        [v(r`$n$`, 'free electrons per volume (copper 8.5 × 10²⁸)', r`$\text{m}^{-3}$`), v(r`$v_d$`, 'drift velocity', r`$\text{m/s}$`), v(r`$\sigma$`, 'conductivity', r`$\text{S/m}$`)],
        'Current per area, and how slowly the electrons actually drift.',
        'Drift is a fraction of a millimetre per second; the signal travels near light speed.', r`$\text{A/m}^2$`),
    P(CUR, null, 'Insulation Resistance of a Cable', r`$R = \frac{\rho}{2\pi L}\ln\frac{b}{a}$`, r`$R = \frac{\rho}{2\pi L}\ln\frac{b}{a}$`,
        [v(r`$\rho$`, 'insulation resistivity', r`$\Omega\cdot\text{m}$`), v(r`$a, b$`, 'conductor and outer insulation radii', r`$\text{m}$`), v(r`$L$`, 'cable length', r`$\text{m}$`)],
        'Leakage resistance through a cable\'s insulation, from conductor to sheath.',
        'It falls as the cable gets LONGER (more leakage paths in parallel), the opposite of conductor resistance.', r`$\Omega$`),
    // Biot-Savart Law
    P(BIOT, null, 'Biot-Savart Law', r`$d\mathbf{B}$`, r`$d\mathbf{B} = \frac{\mu_0}{4\pi}\frac{I\,d\mathbf{l}\times\hat{\mathbf{r}}}{r^2}$`,
        [I_, v(r`$d\mathbf{l}$`, 'current element', r`$\text{m}$`), v(r`$r$`, 'distance to the field point', r`$\text{m}$`)],
        'The field of a small piece of current; integrate along the conductor for the whole field.',
        'Like Coulomb\'s law for magnetism: inverse square, but at right angles to both the current and r.', r`$\text{T}$`),
    P(BIOT, null, 'Field of a Circular Loop', r`$B = \frac{\mu_0NI}{2R}$`, r`$\text{centre: } B = \frac{\mu_0NI}{2R};\qquad \text{on the axis: } B = \frac{\mu_0NIR^2}{2(R^2 + x^2)^{3/2}}$`,
        [v(r`$N$`, 'turns'), I_, v(r`$R$`, 'loop radius', r`$\text{m}$`), v(r`$x$`, 'distance along the axis', r`$\text{m}$`)],
        'The field at the centre and along the axis of a current loop.',
        'Compare a long wire: μ₀I/(2πr). The loop is π times stronger at the same distance R.', r`$\text{T}$`),
    // Ampère's Law
    P(AMP, null, "Ampère's Circuital Law", r`$\oint\mathbf{H}\cdot d\mathbf{l} = I_{enc}$`, r`$\oint\mathbf{H}\cdot d\mathbf{l} = I_{\text{enc}},\qquad \mathbf{B} = \mu\mathbf{H}$`,
        [v(r`$\mathbf{H}$`, 'magnetic field intensity', r`$\text{A/m}$`), v(r`$I_{\text{enc}}$`, 'current through the loop (N I for a coil)', r`$\text{A}$`)],
        'The circulation of H around any closed path equals the current it encloses: the quick route to fields with symmetry.',
        'Inside a long solid wire: B = μ₀Ir/(2πR²), growing from zero at the centre.'),
    P(AMP, null, 'Field of a Solenoid and a Toroid', r`$B = \frac{\mu NI}{l}$`, r`$\text{long solenoid: } B = \frac{\mu NI}{l};\qquad \text{toroid: } B = \frac{\mu NI}{2\pi r}$`,
        [v(r`$N$`, 'turns'), I_, v(r`$l$`, 'solenoid length', r`$\text{m}$`), v(r`$r$`, 'radius within the toroid', r`$\text{m}$`), MU],
        'The nearly uniform field inside a long coil and a ring-shaped coil.',
        'Outside an ideal toroid B = 0: it keeps its flux entirely inside.', r`$\text{T}$`),
    // Magnetic Materials and Hysteresis
    P(MAT, null, 'Permeability Relation', r`$B = \mu_0\mu_rH$`, r`$B = \mu H = \mu_0\mu_rH$`,
        [v(r`$H$`, 'field intensity', r`$\text{A/m}$`), v(r`$\mu_r$`, 'relative permeability (air 1, steel thousands, varies with H)')],
        'Flux density produced in a material by a field intensity.',
        'Iron saturates: past the knee of its B-H curve μᵣ drops sharply.', r`$\text{T}$`),
    P(MAT, null, 'Core Losses (Hysteresis and Eddy Current)', r`$P_h = k_hfB_m^n V,\ P_e = k_ef^2B_m^2t^2V$`, r`$P_h = k_hfB_m^nV\ (n \approx 1.6);\qquad P_e = k_ef^2B_m^2t^2V$`,
        [v(r`$f$`, 'frequency', r`$\text{Hz}$`), v(r`$B_m$`, 'peak flux density', r`$\text{T}$`), v(r`$t$`, 'lamination thickness', r`$\text{m}$`), v(r`$V$`, 'core volume', r`$\text{m}^3$`)],
        'Iron losses in a core: hysteresis (the B-H loop\'s area each cycle) and eddy currents.',
        'Doubling f doubles hysteresis loss but quadruples eddy loss. Thin laminations cut eddy loss as t².', r`$\text{W}$`),
    P(MAT, null, 'Magnetic Energy Density', r`$w = \frac{B^2}{2\mu}$`, r`$w = \frac{B^2}{2\mu} = \tfrac12BH$`,
        [v(r`$B$`, 'flux density', r`$\text{T}$`), MU],
        'Energy stored per cubic metre of magnetic field.',
        'For the same B an air gap stores μᵣ times more energy than iron: most of a gapped inductor\'s energy is in the gap.', r`$\text{J/m}^3$`),
    // Magnetic Circuits
    P(MCIR, null, 'Magnetic Circuit with an Air Gap', r`$NI = \Phi(\mathcal{R}_c + \mathcal{R}_g)$`, r`$NI = H_cl_c + H_gl_g = \Phi(\mathcal{R}_c + \mathcal{R}_g),\qquad H_g = \frac{B}{\mu_0}$`,
        [v(r`$l_c, l_g$`, 'core path and gap lengths', r`$\text{m}$`), v(r`$\Phi$`, 'flux', r`$\text{Wb}$`)],
        'A series magnetic circuit: core and gap reluctances add like resistors.',
        'A 1 mm gap can need more ampere-turns than a metre of steel. Fringing makes the gap\'s effective area a bit larger.', r`$\text{A}\cdot\text{t}$`),
    // Faraday's Law
    P(FAR, null, 'EMF of a Rotating Coil', r`$e = NBA\omega\sin\omega t$`, r`$e = NBA\omega\sin\omega t,\qquad E_m = NBA\omega = 2\pi fN\Phi_m,\qquad E_{rms} = 4.44fN\Phi_m$`,
        [v(r`$N$`, 'turns'), v(r`$B$`, 'flux density', r`$\text{T}$`), v(r`$A$`, 'coil area', r`$\text{m}^2$`), v(r`$\omega$`, 'angular speed', r`$\text{rad/s}$`)],
        'The sinusoidal EMF of a coil turning in a uniform field: the basis of the ac generator.',
        'The EMF is greatest when the coil\'s plane lies ALONG the field (flux zero, changing fastest).', r`$\text{V}$`),
    // Inductance
    P(IND, null, 'Inductance from Flux Linkage', r`$L = \frac{N\Phi}{I} = \frac{N^2}{\mathcal{R}}$`, r`$L = \frac{N\Phi}{I} = \frac{N^2}{\mathcal{R}}$`,
        [v(r`$N\Phi$`, 'flux linkage', r`$\text{Wb}\cdot\text{t}$`), v(r`$\mathcal{R}$`, 'reluctance of the flux path', r`$\text{A}\cdot\text{t/Wb}$`)],
        'Inductance as flux linked per ampere, or turns squared over reluctance.',
        'An air gap raises reluctance and so LOWERS inductance, but makes it steadier against saturation.', r`$\text{H}$`),
    // Force on Conductors
    P(FORCE, null, 'Lorentz Force', r`$\mathbf{F} = q(\mathbf{E} + \mathbf{v}\times\mathbf{B})$`, r`$\mathbf{F} = q(\mathbf{E} + \mathbf{v}\times\mathbf{B}),\qquad r = \frac{mv}{qB}$`,
        [v(r`$q$`, 'charge', r`$\text{C}$`), v(r`$\mathbf{v}$`, 'velocity', r`$\text{m/s}$`), v(r`$\mathbf{B}$`, 'flux density', r`$\text{T}$`)],
        'The force on a moving charge; in a uniform B alone it moves in a circle of radius r.',
        'The magnetic force is perpendicular to the motion: it changes direction but does no work.', r`$\text{N}$`),
    P(FORCE, null, 'Torque on a Current Loop', r`$T = NBIA\sin\theta$`, r`$T = NBIA\sin\theta$`,
        [v(r`$N$`, 'turns'), v(r`$B$`, 'flux density', r`$\text{T}$`), I_, v(r`$A$`, 'loop area', r`$\text{m}^2$`), v(r`$\theta$`, 'angle between the loop\'s normal and B')],
        'The torque that turns a coil in a field: the principle of motors and moving-coil meters.',
        'Greatest when the plane of the coil lies along the field; zero when it faces the field.', r`$\text{N}\cdot\text{m}$`),
    P(FORCE, null, 'Magnetic Pull (Lifting Force)', r`$F = \frac{B^2A}{2\mu_0}$`, r`$F = \frac{B^2A}{2\mu_0}$`,
        [v(r`$B$`, 'flux density in the gap', r`$\text{T}$`), v(r`$A$`, 'total pole face area', r`$\text{m}^2$`)],
        'The force with which an electromagnet or relay pulls on iron across its gap.',
        'It goes as B²: 1 T over 1 cm² pulls about 40 N. Count both pole faces of a horseshoe magnet.', r`$\text{N}$`),
    // Maxwell's Equations
    P(MAX, null, "Maxwell's Equations", r`$\nabla\cdot\mathbf{D},\ \nabla\times\mathbf{E}$`, r`$\nabla\cdot\mathbf{D} = \rho_v;\quad \nabla\cdot\mathbf{B} = 0;\quad \nabla\times\mathbf{E} = -\frac{\partial\mathbf{B}}{\partial t};\quad \nabla\times\mathbf{H} = \mathbf{J} + \frac{\partial\mathbf{D}}{\partial t}$`,
        [v(r`$\rho_v$`, 'charge density', r`$\text{C/m}^3$`), v(r`$\mathbf{J}$`, 'conduction current density', r`$\text{A/m}^2$`), v(r`$\frac{\partial\mathbf{D}}{\partial t}$`, 'displacement current density', r`$\text{A/m}^2$`)],
        'The four laws of electromagnetism: Gauss for E and for B, Faraday, and Ampère with displacement current.',
        'Displacement current is what carries "current" through a capacitor\'s gap and makes waves possible.'),
    // Electromagnetic Waves
    P(WAVE, null, 'Wave Speed and Intrinsic Impedance', r`$v = \frac{1}{\sqrt{\mu\varepsilon}}$`, r`$v = \frac{1}{\sqrt{\mu\varepsilon}} = \frac{c}{\sqrt{\mu_r\varepsilon_r}},\qquad \eta = \sqrt{\frac{\mu}{\varepsilon}},\ \eta_0 \approx 377\ \Omega,\qquad \lambda = \frac{v}{f}$`,
        [MU, EPS, v(r`$f$`, 'frequency', r`$\text{Hz}$`)],
        'How fast a wave travels in a medium, its wavelength, and the ratio E/H it carries.',
        'In a dielectric with εᵣ = 4 the wave travels at half the speed of light, with half the wavelength.', r`$\text{m/s}$`),
    P(WAVE, null, 'Poynting Vector', r`$\mathbf{S} = \mathbf{E}\times\mathbf{H}$`, r`$\mathbf{S} = \mathbf{E}\times\mathbf{H},\qquad S_{avg} = \frac{E_m^2}{2\eta}$`,
        [v(r`$E_m$`, 'peak electric field', r`$\text{V/m}$`), v(r`$\eta$`, 'intrinsic impedance', r`$\Omega$`)],
        'The power per area a wave carries, in its direction of travel.',
        'With RMS values S = E²/η. Sunlight at the Earth: about 1.36 kW/m².', r`$\text{W/m}^2$`),
    P(WAVE, null, 'Skin Depth', r`$\delta = \frac{1}{\sqrt{\pi f\mu\sigma}}$`, r`$\delta = \frac{1}{\sqrt{\pi f\mu\sigma}}$`,
        [v(r`$f$`, 'frequency', r`$\text{Hz}$`), MU, v(r`$\sigma$`, 'conductivity', r`$\text{S/m}$`)],
        'How deep alternating current penetrates a conductor (to 1/e of its surface value).',
        'Copper at 60 Hz: about 8.5 mm, so large busbars and cables use hollow or stranded conductors.', r`$\text{m}$`),
];

module.exports = { subject: 'EE', topic: 'Electromagnetism', migration: '20261227000000_cards_electromagnetism', file, revisions, retire, drafts };
