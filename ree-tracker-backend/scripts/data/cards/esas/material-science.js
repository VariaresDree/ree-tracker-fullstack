'use strict';

// ESAS › Material Science formula cards (Library round, 2026-11-18): the topic
// had no cards at all, so everything here is new, across its 14 subtopics.
// Physics for Engineers already holds resistivity, Young's and shear moduli,
// thermal expansion and conduction; Deformable Bodies stress, strain, Hooke
// and Poisson; Chemistry the weight-loss corrosion rate, Pilling-Bedworth,
// degree of polymerization and cell potentials. So this file adds crystal
// geometry, defects, diffusion, the tensile test, phase diagrams, ceramics,
// polymers, composites, semiconductors, dielectrics and magnetism, optical
// and thermal properties, corrosion kinetics and material selection.
// Formula cards carry units. See mathematics/algebra.js for the format;
// tests/materialScienceFormulas.test.js checks each against known values or
// an independent route.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const ATOM = 'Atomic Structure and Bonding';
const CRYS = 'Crystal Structures';
const IMP = 'Imperfections in Solids';
const DIFF = 'Diffusion';
const MECH = 'Mechanical Properties of Metals';
const ALLOY = 'Alloys and Phase Diagrams';
const CER = 'Ceramics';
const POLY = 'Polymers';
const COMP = 'Composites';
const ELEC = 'Electrical Properties';
const DIEL = 'Dielectric and Magnetic Properties';
const OPT = 'Optical and Thermal Properties';
const CORR = 'Corrosion';
const ECON = 'Economic, Environmental and Societal Issues';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const A_ = v(r`$a$`, 'lattice parameter (cube edge)', r`$\text{nm}$`);
const R_ = v(r`$R$`, 'atomic radius', r`$\text{nm}$`);
const T_ = v(r`$T$`, 'absolute temperature', r`$\text{K}$`);
const VF = v(r`$V_f, V_m$`, 'volume fractions of fibre and matrix ($V_f + V_m = 1$)');

const drafts = [
    // Atomic Structure and Bonding
    P(ATOM, null, 'Bonding Energy and Interatomic Force', r`$E_N = -\frac{A}{r} + \frac{B}{r^n}$`, r`$E_N = -\frac{A}{r} + \frac{B}{r^n},\qquad F = -\frac{dE_N}{dr} = 0 \text{ at } r_0$`,
        [v(r`$r$`, 'separation of the two atoms', r`$\text{nm}$`), v(r`$A, B, n$`, 'constants of the attraction and repulsion'), v(r`$r_0$`, 'equilibrium spacing', r`$\text{nm}$`)],
        'The net energy of two atoms: attraction pulls them in, repulsion pushes back, and the minimum sets the bond length and energy.',
        'A deep, narrow energy well means a high melting point, high stiffness and low thermal expansion.', r`$\text{eV}$`),
    P(ATOM, null, 'Percent Ionic Character', r`$\%IC$`, r`$\%IC = \left[1 - e^{-0.25(X_A - X_B)^2}\right]\times 100\%$`,
        [v(r`$X_A, X_B$`, 'Pauling electronegativities of the two elements')],
        'How ionic a bond between two elements is.',
        'NaCl (3.16 − 0.93): about 71% ionic. No bond is 100% ionic.'),
    // Crystal Structures
    P(CRYS, null, 'Atoms per Unit Cell', r`$N$`, r`$N = N_i + \frac{N_f}{2} + \frac{N_c}{8};\qquad \text{SC } 1,\ \text{BCC } 2,\ \text{FCC } 4,\ \text{HCP } 6$`,
        [v(r`$N_i, N_f, N_c$`, 'interior, face and corner atoms')],
        'How many whole atoms belong to one unit cell.',
        'Coordination numbers: SC 6, BCC 8, FCC and HCP 12.'),
    P(CRYS, null, 'Lattice Parameter and Atomic Radius', r`$a$`, r`$\text{SC: } a = 2R;\qquad \text{BCC: } a = \frac{4R}{\sqrt3};\qquad \text{FCC: } a = 2R\sqrt2$`,
        [A_, R_],
        'The cube edge from the atomic radius, where atoms touch: along the edge (SC), the body diagonal (BCC) or the face diagonal (FCC).',
        'BCC atoms touch along the BODY diagonal √3 a, FCC along the FACE diagonal √2 a.', r`$\text{nm}$`),
    P(CRYS, null, 'Atomic Packing Factor', r`$APF$`, r`$APF = \frac{N \cdot \frac43\pi R^3}{a^3};\qquad \text{SC } 0.52,\ \text{BCC } 0.68,\ \text{FCC, HCP } 0.74$`,
        [v(r`$N$`, 'atoms per cell'), R_, A_],
        'The fraction of a unit cell filled by atoms treated as hard spheres.',
        '0.74 is the densest packing of equal spheres: FCC and HCP reach it.'),
    P(CRYS, null, 'Theoretical Density of a Metal', r`$\rho = \frac{nA}{V_CN_A}$`, r`$\rho = \frac{nA}{V_CN_A},\qquad V_C = a^3 \text{ (cubic)}$`,
        [v(r`$n$`, 'atoms per unit cell'), v(r`$A$`, 'atomic weight', r`$\text{g/mol}$`), v(r`$V_C$`, 'unit-cell volume', r`$\text{cm}^3$`), v(r`$N_A$`, 'Avogadro, 6.022 × 10²³', r`$\text{mol}^{-1}$`)],
        'A crystal\'s density from its structure, atomic weight and cell size.',
        'Copper (FCC, R = 0.128 nm): 8.89 g/cm³. Convert nm to cm: 1 nm = 10⁻⁷ cm.', r`$\text{g/cm}^3$`),
    P(CRYS, null, 'Miller Indices', r`$(hkl)$`, r`$(hkl):\ \text{the reciprocals of the intercepts } \left(\tfrac{1}{x}, \tfrac{1}{y}, \tfrac{1}{z}\right) \text{ in units of } a, \text{ cleared to the smallest integers}$`,
        [v(r`$x, y, z$`, 'where the plane cuts the axes, in lattice parameters')],
        'The notation for crystal planes; [uvw] in square brackets names a direction.',
        'A plane parallel to an axis cuts it at ∞, so its index is 0. In cubic crystals [hkl] is perpendicular to (hkl).'),
    P(CRYS, null, 'Interplanar Spacing of Cubic Crystals', r`$d_{hkl}$`, r`$d_{hkl} = \frac{a}{\sqrt{h^2 + k^2 + l^2}}$`,
        [A_, v(r`$h, k, l$`, 'Miller indices of the planes')],
        'The distance between neighbouring parallel planes (hkl).',
        'Higher indices mean closer planes.', r`$\text{nm}$`),
    P(CRYS, null, "Bragg's Law", r`$n\lambda = 2d\sin\theta$`, r`$n\lambda = 2d_{hkl}\sin\theta$`,
        [v(r`$\lambda$`, 'X-ray wavelength', r`$\text{nm}$`), v(r`$d_{hkl}$`, 'interplanar spacing', r`$\text{nm}$`), v(r`$\theta$`, 'Bragg angle (half the diffraction angle 2θ)'), v(r`$n$`, 'order of reflection')],
        'The condition for X-rays to diffract strongly from a set of crystal planes.',
        'Diffractometers report 2θ: halve it before using the sine.'),
    // Imperfections in Solids
    P(IMP, null, 'Atoms per Unit Volume', r`$N = \frac{N_A\rho}{A}$`, r`$N = \frac{N_A\rho}{A}$`,
        [v(r`$\rho$`, 'density', r`$\text{g/cm}^3$`), v(r`$A$`, 'atomic weight', r`$\text{g/mol}$`)],
        'How many atoms (lattice sites) a cubic centimetre holds.',
        'Multiply by 10⁶ for atoms per m³. Copper: 8.5 × 10²² per cm³.', r`$\text{cm}^{-3}$`),
    P(IMP, null, 'Equilibrium Vacancy Concentration', r`$N_v = Ne^{-Q_v/kT}$`, r`$N_v = N\exp\left(-\frac{Q_v}{kT}\right)$`,
        [v(r`$N$`, 'lattice sites per volume', r`$\text{m}^{-3}$`), v(r`$Q_v$`, 'energy to form a vacancy', r`$\text{eV}$`), v(r`$k$`, 'Boltzmann, 8.62 × 10⁻⁵ eV/K'), T_],
        'How many empty lattice sites a crystal holds in equilibrium; it rises steeply with temperature.',
        'Use k in eV/K with Q in eV, or R with Q in J/mol: don\'t mix them.', r`$\text{m}^{-3}$`),
    P(IMP, null, 'ASTM Grain Size Number', r`$N = 2^{n-1}$`, r`$N = 2^{n-1}$`,
        [v(r`$N$`, 'grains per square inch at 100× magnification'), v(r`$n$`, 'ASTM grain size number')],
        'The standard measure of grain size: a larger n means finer grains.',
        'At magnification M: N(M/100)² = 2ⁿ⁻¹.'),
    // Diffusion
    P(DIFF, null, "Fick's First Law", r`$J = -D\frac{dC}{dx}$`, r`$J = -D\frac{dC}{dx}$`,
        [v(r`$J$`, 'diffusion flux', r`$\text{kg/(m}^2\cdot\text{s)}$`), v(r`$D$`, 'diffusion coefficient', r`$\text{m}^2\text{/s}$`), v(r`$\frac{dC}{dx}$`, 'concentration gradient', r`$\text{kg/m}^4$`)],
        'Steady-state diffusion: atoms flow down a concentration gradient.',
        'Hydrogen purification through a palladium sheet is the classic steady-state case.', r`$\text{kg/(m}^2\cdot\text{s)}$`),
    P(DIFF, null, 'Temperature Dependence of Diffusion', r`$D = D_0e^{-Q_d/RT}$`, r`$D = D_0\exp\left(-\frac{Q_d}{RT}\right)$`,
        [v(r`$D_0$`, 'pre-exponential factor', r`$\text{m}^2\text{/s}$`), v(r`$Q_d$`, 'activation energy', r`$\text{J/mol}$`), v(r`$R$`, '8.314 J/(mol·K)'), T_],
        'Diffusion speeds up exponentially with temperature.',
        'Two temperatures: ln(D₁/D₂) = −(Q/R)(1/T₁ − 1/T₂). A plot of ln D against 1/T has slope −Q/R.', r`$\text{m}^2\text{/s}$`),
    P(DIFF, null, "Fick's Second Law with a Constant Surface Concentration", r`$\frac{C_x - C_0}{C_s - C_0}$`, r`$\frac{C_x - C_0}{C_s - C_0} = 1 - \text{erf}\left(\frac{x}{2\sqrt{Dt}}\right)$`,
        [v(r`$C_x, C_0, C_s$`, 'concentration at depth x, initially, and at the surface', r`$\text{wt\%}$`), v(r`$x$`, 'depth', r`$\text{m}$`), v(r`$D$`, 'diffusion coefficient', r`$\text{m}^2\text{/s}$`), v(r`$t$`, 'time', r`$\text{s}$`)],
        'Non-steady diffusion into a thick solid, such as carburizing steel.',
        'Reaching the same concentration at another depth or temperature: x²/(Dt) stays constant.'),
    // Mechanical Properties of Metals
    P(MECH, null, 'True Stress and True Strain', r`$\sigma_T,\ \varepsilon_T$`, r`$\sigma_T = \sigma(1 + \varepsilon),\qquad \varepsilon_T = \ln(1 + \varepsilon)$`,
        [v(r`$\sigma, \varepsilon$`, 'engineering stress and strain', r`$\text{MPa}$`)],
        'Stress and strain on the actual, shrinking cross-section, up to the onset of necking.',
        'Valid only before necking, while volume is constant and strain uniform.', r`$\text{MPa}$`),
    P(MECH, null, 'Strain Hardening (Hollomon)', r`$\sigma_T = K\varepsilon_T^n$`, r`$\sigma_T = K\varepsilon_T^n$`,
        [v(r`$K$`, 'strength coefficient', r`$\text{MPa}$`), v(r`$n$`, 'strain-hardening exponent (0.1–0.5)')],
        'The plastic part of the true stress-strain curve.',
        'Necking begins where the true strain equals n.', r`$\text{MPa}$`),
    P(MECH, null, 'Ductility: Elongation and Reduction of Area', r`$\%EL$`, r`$\%EL = \frac{l_f - l_0}{l_0}\times 100\%,\qquad \%RA = \frac{A_0 - A_f}{A_0}\times 100\%$`,
        [v(r`$l_0, l_f$`, 'original and fracture gauge lengths', r`$\text{mm}$`), v(r`$A_0, A_f$`, 'original and fracture areas', r`$\text{mm}^2$`)],
        'How much a metal deforms plastically before it breaks.',
        'Below about 5% elongation a material is called brittle.'),
    P(MECH, null, 'Modulus of Resilience', r`$U_r = \frac{\sigma_y^2}{2E}$`, r`$U_r = \frac{\sigma_y^2}{2E}$`,
        [v(r`$\sigma_y$`, 'yield strength', r`$\text{Pa}$`), v(r`$E$`, 'modulus of elasticity', r`$\text{Pa}$`)],
        'Elastic energy a material absorbs per unit volume up to yielding: the area under the elastic part of the curve.',
        'Springs want high yield strength and low modulus. Toughness is the area under the WHOLE curve.', r`$\text{J/m}^3$`),
    P(MECH, null, 'Brinell Hardness', r`$HB$`, r`$HB = \frac{2P}{\pi D\left(D - \sqrt{D^2 - d^2}\right)}$`,
        [v(r`$P$`, 'load', r`$\text{kgf}$`), v(r`$D$`, 'ball diameter (10 mm standard)', r`$\text{mm}$`), v(r`$d$`, 'indentation diameter', r`$\text{mm}$`)],
        'Hardness from the size of a ball\'s dent: load per area of the spherical dent.',
        'For steels, tensile strength ≈ 3.45 × HB MPa (500 × HB psi).'),
    P(MECH, null, 'Hall-Petch Equation', r`$\sigma_y = \sigma_0 + k_yd^{-1/2}$`, r`$\sigma_y = \sigma_0 + k_yd^{-1/2}$`,
        [v(r`$\sigma_0, k_y$`, 'material constants', r`$\text{MPa}$`), v(r`$d$`, 'average grain diameter', r`$\text{mm}$`)],
        'Finer grains make a metal stronger, because grain boundaries block dislocations.',
        'Grain refinement raises strength AND toughness: the only common strengthening that does both.', r`$\text{MPa}$`),
    P(MECH, null, 'Fracture Toughness', r`$K_{Ic} = Y\sigma\sqrt{\pi a}$`, r`$K_{Ic} = Y\sigma_c\sqrt{\pi a}$`,
        [v(r`$Y$`, 'geometry factor (about 1)'), v(r`$\sigma_c$`, 'critical stress', r`$\text{MPa}$`), v(r`$a$`, 'crack length (half an interior crack)', r`$\text{m}$`)],
        'A crack of length a grows suddenly once the stress reaches σc.',
        'For an INTERIOR crack, a is half its length; for a surface crack, its full depth.', r`$\text{MPa}\sqrt{\text{m}}$`),
    // Alloys and Phase Diagrams
    P(ALLOY, null, 'Lever Rule', r`$W_L = \frac{C_\alpha - C_0}{C_\alpha - C_L}$`, r`$W_L = \frac{C_\alpha - C_0}{C_\alpha - C_L},\qquad W_\alpha = \frac{C_0 - C_L}{C_\alpha - C_L}$`,
        [v(r`$C_0$`, 'overall alloy composition', r`$\text{wt\%}$`), v(r`$C_L, C_\alpha$`, 'compositions at the ends of the tie line', r`$\text{wt\%}$`)],
        'The mass fractions of two phases in a two-phase region of a phase diagram.',
        'Each phase\'s fraction uses the lever arm on the OPPOSITE side of the tie line.'),
    P(ALLOY, null, 'Gibbs Phase Rule', r`$P + F = C + N$`, r`$P + F = C + N$`,
        [v(r`$P$`, 'phases present'), v(r`$F$`, 'degrees of freedom'), v(r`$C$`, 'components'), v(r`$N$`, 'non-compositional variables (1 at fixed pressure, 2 with pressure)')],
        'How many variables can change while the same phases stay in equilibrium.',
        'A binary eutectic at fixed pressure: 3 phases, so F = 2 + 1 − 3 = 0, a single point.'),
    P(ALLOY, null, 'Weight Percent to Atom Percent', r`$C_1'$`, r`$C_1' = \frac{C_1A_2}{C_1A_2 + C_2A_1}\times 100\%$`,
        [v(r`$C_1, C_2$`, 'weight percents', r`$\text{wt\%}$`), v(r`$A_1, A_2$`, 'atomic weights', r`$\text{g/mol}$`)],
        'Converting an alloy\'s composition from mass to number of atoms.',
        'The lighter element\'s atom percent is higher than its weight percent.', r`$\text{at\%}$`),
    P(ALLOY, null, 'Proeutectoid Ferrite and Pearlite in Steel', r`$W_p$`, r`$W_p = \frac{C_0 - 0.022}{0.76 - 0.022},\qquad W_{\alpha'} = 1 - W_p\quad (0.022 < C_0 < 0.76)$`,
        [v(r`$C_0$`, 'carbon content of the steel', r`$\text{wt\%}$`)],
        'The lever rule just above 727 °C for a hypoeutectoid steel.',
        'Hypereutectoid (0.76–2.14 wt% C): W_p = (6.70 − C₀)/(6.70 − 0.76).'),
    K(ALLOY, 'Iron-Carbon Diagram Key Points', r`$\text{Fe–Fe}_3\text{C}$`, r`$\text{eutectoid } 0.76\%\text{C at } 727\,^\circ\text{C};\ \text{eutectic } 4.30\%\text{C at } 1147\,^\circ\text{C};\ \text{max C in } \gamma\ 2.14\%;\ \alpha\ 0.022\%;\ \text{Fe}_3\text{C } 6.70\%$`, 'The compositions and temperatures that define steels and cast irons.', 'Steel below 2.14 wt% C, cast iron above. Pearlite is ferrite + cementite from the eutectoid.'),
    // Ceramics
    P(CER, null, 'Cation-Anion Radius Ratio', r`$\frac{r_C}{r_A}$`, r`$\frac{r_C}{r_A}:\ < 0.155 \to 2;\ 0.155\text{–}0.225 \to 3;\ 0.225\text{–}0.414 \to 4;\ 0.414\text{–}0.732 \to 6;\ 0.732\text{–}1.0 \to 8$`,
        [v(r`$r_C, r_A$`, 'cation and anion radii', r`$\text{nm}$`)],
        'The coordination number an ionic crystal takes, from the size of its ions.',
        'NaCl: 0.102/0.181 = 0.56, so 6 neighbours (rock salt).'),
    P(CER, null, 'Theoretical Density of a Ceramic', r`$\rho = \frac{n'(\sum A_C + \sum A_A)}{V_CN_A}$`, r`$\rho = \frac{n'\left(\sum A_C + \sum A_A\right)}{V_CN_A}$`,
        [v(r`$n'$`, 'formula units per unit cell'), v(r`$A_C, A_A$`, 'atomic weights of cations and anions in a formula unit', r`$\text{g/mol}$`), v(r`$V_C$`, 'unit-cell volume', r`$\text{cm}^3$`)],
        'A ceramic\'s density counted by formula units.',
        'Rock salt: n′ = 4 and a = 2(r_C + r_A).', r`$\text{g/cm}^3$`),
    P(CER, null, 'Flexural Strength', r`$\sigma_{fs} = \frac{3F_fL}{2bd^2}$`, r`$\text{rectangle: } \sigma_{fs} = \frac{3F_fL}{2bd^2};\qquad \text{circle: } \sigma_{fs} = \frac{F_fL}{\pi R^3}$`,
        [v(r`$F_f$`, 'load at fracture', r`$\text{N}$`), v(r`$L$`, 'span between supports', r`$\text{mm}$`), v(r`$b, d$`, 'width and depth', r`$\text{mm}$`), v(r`$R$`, 'specimen radius', r`$\text{mm}$`)],
        'A brittle ceramic\'s strength from a three-point bend test.',
        'Ceramics are far stronger in compression than tension: about 10 times.', r`$\text{MPa}$`),
    P(CER, null, 'Effect of Porosity on Modulus', r`$E = E_0(1 - 1.9P + 0.9P^2)$`, r`$E = E_0\left(1 - 1.9P + 0.9P^2\right)$`,
        [v(r`$E_0$`, 'modulus of the nonporous material', r`$\text{GPa}$`), v(r`$P$`, 'volume fraction of pores')],
        'Pores lower a ceramic\'s stiffness (and its strength).',
        'Pores both reduce the load-bearing area and act as cracks.', r`$\text{GPa}$`),
    // Polymers
    P(POLY, null, 'Average Molecular Weights', r`$\bar M_n,\ \bar M_w$`, r`$\bar M_n = \sum x_iM_i,\qquad \bar M_w = \sum w_iM_i,\qquad PI = \frac{\bar M_w}{\bar M_n} \ge 1$`,
        [v(r`$x_i, w_i$`, 'number and weight fractions of chains in size range i'), v(r`$M_i$`, 'mean molecular weight of range i', r`$\text{g/mol}$`)],
        'A polymer\'s chains vary in length, so its molecular weight is an average, by number or by weight.',
        'M̄w is always at least M̄n; equal only if every chain is the same length.', r`$\text{g/mol}$`),
    P(POLY, null, 'Percent Crystallinity of a Polymer', r`$\%\text{cryst}$`, r`$\%\text{crystallinity} = \frac{\rho_c(\rho_s - \rho_a)}{\rho_s(\rho_c - \rho_a)}\times 100\%$`,
        [v(r`$\rho_s$`, 'density of the specimen', r`$\text{g/cm}^3$`), v(r`$\rho_c, \rho_a$`, 'densities of fully crystalline and fully amorphous polymer', r`$\text{g/cm}^3$`)],
        'How much of a polymer is crystalline, from its density.',
        'Higher crystallinity: denser, stiffer, stronger, more resistant to solvents, less transparent.'),
    P(POLY, null, 'Viscoelastic Stress Relaxation', r`$\sigma(t) = \sigma_0e^{-t/\tau}$`, r`$\sigma(t) = \sigma(0)e^{-t/\tau},\qquad E_r(t) = \frac{\sigma(t)}{\varepsilon_0}$`,
        [v(r`$\tau$`, 'relaxation time', r`$\text{s}$`), v(r`$\varepsilon_0$`, 'constant applied strain')],
        'Stress in a polymer held at fixed strain decays with time.',
        'Below the glass transition a polymer is rigid and glassy; above it, leathery then rubbery.', r`$\text{MPa}$`),
    // Composites
    P(COMP, null, 'Rule of Mixtures (Isostrain)', r`$E_{cl} = E_mV_m + E_fV_f$`, r`$E_{cl} = E_mV_m + E_fV_f$`,
        [v(r`$E_m, E_f$`, 'moduli of matrix and fibre', r`$\text{GPa}$`), VF],
        'Stiffness of a continuous-fibre composite loaded ALONG the fibres: the upper bound.',
        'Density follows the same rule: ρc = ρmVm + ρfVf.', r`$\text{GPa}$`),
    P(COMP, null, 'Inverse Rule of Mixtures (Isostress)', r`$E_{ct}$`, r`$E_{ct} = \frac{E_mE_f}{V_mE_f + V_fE_m}$`,
        [v(r`$E_m, E_f$`, 'moduli of matrix and fibre', r`$\text{GPa}$`), VF],
        'Stiffness of a continuous-fibre composite loaded ACROSS the fibres: the lower bound.',
        'Transverse stiffness stays close to the matrix\'s, whatever the fibre.', r`$\text{GPa}$`),
    P(COMP, null, 'Load Carried by the Fibres', r`$\frac{F_f}{F_m} = \frac{E_fV_f}{E_mV_m}$`, r`$\frac{F_f}{F_m} = \frac{E_fV_f}{E_mV_m}$`,
        [v(r`$F_f, F_m$`, 'loads in fibres and matrix', r`$\text{N}$`), VF],
        'How a longitudinal load divides between fibres and matrix.',
        'Glass fibre (69 GPa, 40%) in polyester (3.4 GPa): the fibres carry 93%.'),
    P(COMP, null, 'Longitudinal Strength of a Fibre Composite', r`$\sigma^*_{cl}$`, r`$\sigma^*_{cl} = \sigma'_m(1 - V_f) + \sigma^*_fV_f$`,
        [v(r`$\sigma'_m$`, 'matrix stress when the fibres fail', r`$\text{MPa}$`), v(r`$\sigma^*_f$`, 'fibre tensile strength', r`$\text{MPa}$`), VF],
        'The tensile strength along the fibres of a continuous, aligned composite.',
        'The fibres usually fail first; the matrix carries only the stress at that strain.', r`$\text{MPa}$`),
    P(COMP, null, 'Critical Fibre Length', r`$l_c = \frac{\sigma_f^*d}{2\tau_c}$`, r`$l_c = \frac{\sigma_f^*d}{2\tau_c}$`,
        [v(r`$\sigma_f^*$`, 'fibre strength', r`$\text{MPa}$`), v(r`$d$`, 'fibre diameter', r`$\text{mm}$`), v(r`$\tau_c$`, 'fibre-matrix bond strength', r`$\text{MPa}$`)],
        'The shortest fibre that can be loaded to its full strength.',
        'Fibres longer than about 15 l_c behave as continuous.', r`$\text{mm}$`),
    // Electrical Properties
    P(ELEC, null, 'Electrical Conductivity from Carriers', r`$\sigma = n|e|\mu_e + p|e|\mu_h$`, r`$\sigma = n|e|\mu_e + p|e|\mu_h,\qquad \rho = \frac{1}{\sigma}$`,
        [v(r`$n, p$`, 'electrons and holes per volume', r`$\text{m}^{-3}$`), v(r`$\mu_e, \mu_h$`, 'mobilities', r`$\text{m}^2\text{/(V}\cdot\text{s)}$`), v(r`$|e|$`, '1.602 × 10⁻¹⁹ C')],
        'Conductivity from how many charge carriers there are and how easily they drift.',
        'Intrinsic: n = p = nᵢ. n-type: n ≈ donor concentration. p-type: p ≈ acceptor concentration.', r`$(\Omega\cdot\text{m})^{-1}$`),
    P(ELEC, null, 'Intrinsic Semiconductor and Temperature', r`$\ln\sigma$`, r`$n_i \propto T^{3/2}e^{-E_g/2kT};\qquad \ln\sigma \approx C - \frac{E_g}{2kT}$`,
        [v(r`$E_g$`, 'band gap', r`$\text{eV}$`), v(r`$k$`, 'Boltzmann, 8.62 × 10⁻⁵ eV/K'), T_],
        'A pure semiconductor conducts better as it heats: more electrons cross the gap.',
        'The opposite of a metal, whose resistivity RISES with temperature.'),
    P(ELEC, null, "Matthiessen's Rule", r`$\rho_{total} = \rho_t + \rho_i + \rho_d$`, r`$\rho_{total} = \rho_t + \rho_i + \rho_d,\qquad \rho_t = \rho_0 + aT$`,
        [v(r`$\rho_t, \rho_i, \rho_d$`, 'resistivity from thermal vibration, impurities and deformation', r`$\Omega\cdot\text{m}$`), v(r`$a$`, 'constant of the metal', r`$\Omega\cdot\text{m/K}$`)],
        'A metal\'s resistivity adds up from the things that scatter its electrons.',
        'Alloying and cold work raise resistivity: pure annealed copper is used for wire.', r`$\Omega\cdot\text{m}$`),
    P(ELEC, null, 'Hall Effect', r`$V_H = \frac{R_HI_xB_z}{d}$`, r`$V_H = \frac{R_HI_xB_z}{d},\qquad R_H = \frac{1}{n|e|},\qquad \mu_e = |R_H|\sigma$`,
        [v(r`$I_x$`, 'current', r`$\text{A}$`), v(r`$B_z$`, 'magnetic field', r`$\text{T}$`), v(r`$d$`, 'specimen thickness along B', r`$\text{m}$`), v(r`$R_H$`, 'Hall coefficient', r`$\text{m}^3\text{/C}$`)],
        'A sideways voltage across a current-carrying specimen in a magnetic field: gives carrier type, density and mobility.',
        'The sign of R_H shows the carrier: negative for electrons (n-type), positive for holes.', r`$\text{V}$`),
    K(ELEC, 'Properties of Silicon at 300 K', r`$\text{Si}$`, r`$E_g = 1.12\ \text{eV};\ n_i \approx 1.0 \times 10^{16}\ \text{m}^{-3};\ \mu_e \approx 0.14,\ \mu_h \approx 0.05\ \text{m}^2\text{/(V}\cdot\text{s)}$`, 'The numbers behind most semiconductor problems.', 'Germanium: E_g = 0.67 eV, nᵢ ≈ 2.4 × 10¹⁹ m⁻³.'),
    // Dielectric and Magnetic Properties
    P(DIEL, null, 'Dielectric Constant and Polarization', r`$P = \varepsilon_0(\varepsilon_r - 1)\mathscr{E}$`, r`$\varepsilon_r = \frac{\varepsilon}{\varepsilon_0} = \frac{C}{C_0},\qquad P = \varepsilon_0(\varepsilon_r - 1)\mathscr{E},\qquad D = \varepsilon_0\mathscr{E} + P$`,
        [v(r`$\varepsilon_r$`, 'dielectric constant (relative permittivity)'), v(r`$\mathscr{E}$`, 'electric field', r`$\text{V/m}$`), v(r`$P$`, 'polarization', r`$\text{C/m}^2$`)],
        'How much a dielectric raises a capacitor\'s capacitance, and the dipole moment per volume it builds.',
        'Polarization comes from electronic, ionic and orientation dipoles; the slow ones drop out at high frequency.', r`$\text{C/m}^2$`),
    P(DIEL, null, 'Dielectric Strength', r`$V_{bd} = \mathscr{E}_{ds}\,t$`, r`$V_{bd} = \mathscr{E}_{ds}\,t$`,
        [v(r`$\mathscr{E}_{ds}$`, 'dielectric strength', r`$\text{kV/mm}$`), v(r`$t$`, 'insulation thickness', r`$\text{mm}$`)],
        'The voltage at which an insulator breaks down.',
        'Air ≈ 3 kV/mm; polyethylene ≈ 18–22; mica up to about 100.', r`$\text{kV}$`),
    P(DIEL, null, 'Magnetization and Susceptibility', r`$B = \mu_0(H + M)$`, r`$B = \mu_0(H + M),\qquad M = \chi_mH,\qquad \mu_r = 1 + \chi_m$`,
        [v(r`$H$`, 'magnetic field strength', r`$\text{A/m}$`), v(r`$M$`, 'magnetization', r`$\text{A/m}$`), v(r`$\chi_m$`, 'magnetic susceptibility'), v(r`$\mu_0$`, '4π × 10⁻⁷ H/m')],
        'How a material adds to the field inside it.',
        'Diamagnetic: χ small and negative; paramagnetic: small and positive; ferromagnetic: huge and field-dependent.', r`$\text{T}$`),
    P(DIEL, null, 'Saturation Magnetization', r`$M_s = n_BN\mu_B$`, r`$M_s = n_BN\mu_B$`,
        [v(r`$n_B$`, 'Bohr magnetons per atom (Fe 2.22, Co 1.72, Ni 0.60)'), v(r`$N$`, 'atoms per volume', r`$\text{m}^{-3}$`), v(r`$\mu_B$`, 'Bohr magneton, 9.27 × 10⁻²⁴', r`$\text{A}\cdot\text{m}^2$`)],
        'The most magnetization a ferromagnet reaches, when all its moments line up.',
        'Above the Curie temperature (Fe 768 °C) the ferromagnetism vanishes.', r`$\text{A/m}$`),
    P(DIEL, null, 'Hysteresis Loss (Steinmetz)', r`$P_h = k_hfB_{max}^{1.6}V$`, r`$P_h = k_hfB_{max}^{1.6}V$`,
        [v(r`$k_h$`, 'material constant'), v(r`$f$`, 'frequency', r`$\text{Hz}$`), v(r`$B_{max}$`, 'peak flux density', r`$\text{T}$`), v(r`$V$`, 'core volume', r`$\text{m}^3$`)],
        'Power lost each second by cycling a magnetic core around its B-H loop.',
        'Energy per cycle is the loop\'s area. Transformer cores use soft magnets: narrow loops, low coercivity.', r`$\text{W}$`),
    // Optical and Thermal Properties
    P(OPT, null, 'Reflectivity at Normal Incidence', r`$R = \left(\frac{n_2 - n_1}{n_2 + n_1}\right)^2$`, r`$R = \left(\frac{n_2 - n_1}{n_2 + n_1}\right)^2$`,
        [v(r`$n_1, n_2$`, 'refractive indices of the two media')],
        'The fraction of light reflected at an interface, head on.',
        'Glass in air (n = 1.5): 4% per surface. Antireflection coatings cut this.'),
    P(OPT, null, 'Light Transmitted through a Slab', r`$I_T = I_0(1 - R)^2e^{-\beta l}$`, r`$I_T = I_0(1 - R)^2e^{-\beta l}$`,
        [v(r`$I_0$`, 'incident intensity', r`$\text{W/m}^2$`), v(r`$R$`, 'reflectivity of each face'), v(r`$\beta$`, 'absorption coefficient', r`$\text{m}^{-1}$`), v(r`$l$`, 'thickness', r`$\text{m}$`)],
        'Light lost to reflection at both faces and absorption inside.',
        'R + A + T = 1: reflected, absorbed and transmitted fractions add to one.', r`$\text{W/m}^2$`),
    P(OPT, null, 'Heat Capacity of Solids', r`$C_v$`, r`$\text{low } T: C_v = AT^3\ (\text{Debye});\qquad \text{high } T: C_v \approx 3R \approx 25\ \text{J/(mol}\cdot\text{K)}$`,
        [v(r`$A$`, 'material constant'), T_],
        'How much heat a solid stores per mole per kelvin: rising as T³ when cold, levelling off near 3R.',
        'The 3R plateau (Dulong-Petit) is reached above the Debye temperature, often below room temperature for metals.', r`$\text{J/(mol}\cdot\text{K)}$`),
    P(OPT, null, 'Wiedemann-Franz Law', r`$L = \frac{k}{\sigma T}$`, r`$L = \frac{k}{\sigma T} \approx 2.44 \times 10^{-8}\ \Omega\cdot\text{W/K}^2$`,
        [v(r`$k$`, 'thermal conductivity', r`$\text{W/(m}\cdot\text{K)}$`), v(r`$\sigma$`, 'electrical conductivity', r`$(\Omega\cdot\text{m})^{-1}$`), T_],
        'In metals the same free electrons carry heat and current, so the two conductivities rise together.',
        'Copper at 300 K: 2.44e-8 × 5.96e7 × 300 ≈ 436, near its measured 398 W/(m·K).'),
    P(OPT, null, 'Thermal Shock Resistance', r`$TSR = \frac{\sigma_fk}{E\alpha_l}$`, r`$TSR \approx \frac{\sigma_fk}{E\alpha_l}$`,
        [v(r`$\sigma_f$`, 'fracture strength', r`$\text{Pa}$`), v(r`$k$`, 'thermal conductivity', r`$\text{W/(m}\cdot\text{K)}$`), v(r`$E$`, 'modulus', r`$\text{Pa}$`), v(r`$\alpha_l$`, 'linear expansion coefficient', r`$\text{K}^{-1}$`)],
        'A brittle material\'s resistance to cracking under sudden temperature change.',
        'Borosilicate (Pyrex) beats soda-lime glass mainly through its much lower expansion.', r`$\text{W/m}$`),
    // Corrosion
    P(CORR, null, 'Corrosion Rate from Current Density', r`$r = \frac{i}{nF}$`, r`$r = \frac{i}{nF}\ (\text{mol/m}^2\cdot\text{s}),\qquad CPR = \frac{iM}{nF\rho}$`,
        [v(r`$i$`, 'corrosion current density', r`$\text{A/m}^2$`), v(r`$n$`, 'electrons per metal atom'), v(r`$M$`, 'atomic weight', r`$\text{kg/mol}$`), v(r`$\rho$`, 'density', r`$\text{kg/m}^3$`)],
        'How fast a metal corrodes, from its corrosion current.',
        'CPR comes out in m/s: multiply by 3.156 × 10¹⁰ for mm/yr.', r`$\text{mol/(m}^2\cdot\text{s)}$`),
    P(CORR, null, 'Activation Polarization (Tafel)', r`$\eta_a = \pm\beta\log\frac{i}{i_0}$`, r`$\eta_a = \pm\beta\log\frac{i}{i_0}$`,
        [v(r`$\beta$`, 'Tafel slope (often about 0.1 V per decade)', r`$\text{V}$`), v(r`$i, i_0$`, 'current density and exchange current density', r`$\text{A/m}^2$`)],
        'How far an electrode\'s potential shifts to drive a current: plus for oxidation, minus for reduction.',
        'Where the oxidation and reduction lines cross gives the corrosion potential and corrosion current.', r`$\text{V}$`),
    // Economic, Environmental and Societal Issues
    P(ECON, null, 'Mass of a Tension Member', r`$m = \frac{NFL\rho}{\sigma_y}$`, r`$m = \frac{NFL\rho}{\sigma_y},\qquad \text{cost} = m\bar c$`,
        [v(r`$N$`, 'factor of safety'), v(r`$F$`, 'load', r`$\text{N}$`), v(r`$L$`, 'length', r`$\text{m}$`), v(r`$\rho$`, 'density', r`$\text{kg/m}^3$`), v(r`$\sigma_y$`, 'yield strength', r`$\text{Pa}$`), v(r`$\bar c$`, 'cost per kg', r`$\text{PHP/kg}$`)],
        'The lightest, or cheapest, bar that carries a load without yielding.',
        'Rank materials by ρ/σy for mass, by c̄ρ/σy for cost.', r`$\text{kg}$`),
    P(ECON, null, 'Material Performance Index', r`$M$`, r`$\text{light strong tie: } \frac{\sigma_y}{\rho};\quad \text{light stiff tie: } \frac{E}{\rho};\quad \text{light stiff beam: } \frac{E^{1/2}}{\rho};\quad \text{light strong beam: } \frac{\sigma_y^{2/3}}{\rho}$`,
        [v(r`$\sigma_y$`, 'yield strength', r`$\text{MPa}$`), v(r`$E$`, 'modulus', r`$\text{GPa}$`), v(r`$\rho$`, 'density', r`$\text{Mg/m}^3$`)],
        'The ratio to maximise when choosing a material for a light part (Ashby).',
        'Steel, aluminium and titanium have nearly the same E/ρ; for beams, light alloys and composites win.'),
];

module.exports = { subject: 'ESAS', topic: 'Material Science', migration: '20261218000000_cards_material_science', file, revisions, retire, drafts };
