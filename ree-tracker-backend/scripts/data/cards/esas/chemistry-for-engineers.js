'use strict';

// ESAS › Chemistry for Engineers formula cards (Library round, 2026-11-17): 9
// live cards for 14 subtopics, covering moles, gas laws, molarity, pH and
// electrolysis. Physics for Engineers holds photon energy, Bohr levels and
// radioactive decay; Basic Thermodynamics the ideal-gas mixtures; Fluid
// Mechanics hydropower; Material Science (later) the crystal structures. So
// this file adds the rest: atomic structure, bonding, stoichiometry,
// solutions, equilibrium and acids, thermochemistry and kinetics,
// electrochemistry, batteries, fuel cells, solar cells, renewables,
// materials, nanomaterials and the environment. Formula cards carry units.
// See mathematics/algebra.js for the format; tests/chemistryFormulas.test.js
// checks each against known values or an independent route.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const ATOM = 'Atomic Structure and Periodic Table';
const BOND = 'Chemical Bonding';
const STO = 'Stoichiometry';
const GAS = 'Gas Laws';
const SOL = 'Solutions and Concentration';
const EQ = 'Equilibrium, Acids and Bases';
const THERMO = 'Thermochemistry and Energy';
const ELEC = 'Electrochemistry and Batteries';
const FUEL = 'Energy Storage and Fuel Cells';
const SOLAR = 'Solar Cells and Photosynthesis';
const RENEW = 'Renewable Energy';
const MAT = 'Chemistry of Engineering Materials';
const NANO = 'Nanomaterials';
const ENV = 'Chemistry of the Environment';
const CONST = 'Constants';

const file = [
    ['6640c6b3-3131-43c7-88e3-90264ed83f5b', STO, CONST], // Avogadro Constant
    ['4cb09fad-8297-4202-bfff-3740acb8ac9f', STO, null], // Number of Moles
    ['27943b3b-6f17-4884-b1f0-85b8dd753443', GAS, null], // Combined Gas Law
    ['a5cb41e1-d0e1-4272-9cb8-f43b7449203c', GAS, null], // Ideal Gas Law in Moles
    ['1232c743-b08c-4955-9f5d-21139da88b7c', SOL, null], // Molarity
    ['62771d5f-04ad-41c2-8b19-3351a0eda7b0', SOL, null], // Dilution Equation
    ['3a95178b-5d9d-4dde-ae9c-9d73b7d200b4', EQ, null], // pH
    ['b242a66b-d1ac-4945-a48a-072c10915671', ELEC, CONST], // Faraday Constant
    ['521472b1-3207-45d9-956d-b8e00b659936', ELEC, null], // Faraday's Law of Electrolysis
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const MOLL = r`$\text{mol/L}$`;
const T_ = v(r`$T$`, 'absolute temperature', r`$\text{K}$`);
const R_ = v(r`$R$`, 'gas constant, 8.314 J/(mol·K)', r`$\text{J/(mol}\cdot\text{K)}$`);
const F_ = v(r`$F$`, 'Faraday constant, 96 485', r`$\text{C/mol}$`);
const N_E = v(r`$n$`, 'electrons transferred per formula unit');

const drafts = [
    // Atomic Structure and Periodic Table
    P(ATOM, null, 'Mass Number and Isotopes', r`$A = Z + N$`, r`$A = Z + N$`,
        [v(r`$A$`, 'mass number'), v(r`$Z$`, 'atomic number (protons)'), v(r`$N$`, 'neutrons')],
        'An atom\'s mass number counts its protons and neutrons; isotopes share Z but differ in N.',
        'A neutral atom has Z electrons; an ion of charge +q has Z − q.'),
    P(ATOM, null, 'Average Atomic Mass', r`$\bar{A}$`, r`$\bar{A} = \sum_i (\text{isotope mass})_i \times (\text{fractional abundance})_i$`,
        [v(r`$\bar{A}$`, 'atomic mass on the periodic table', r`$\text{u}$`)],
        'The abundance-weighted mean of an element\'s isotope masses.',
        'Chlorine: 0.758(34.97) + 0.242(36.97) = 35.45.', r`$\text{u}$`),
    P(ATOM, null, 'Electron Shell and Subshell Capacity', r`$2n^2$`, r`$\text{shell } n \text{ holds } 2n^2;\qquad s = 2,\ p = 6,\ d = 10,\ f = 14$`,
        [v(r`$n$`, 'principal quantum number')],
        'How many electrons each shell and subshell can hold.',
        'Fill by the aufbau order 1s 2s 2p 3s 3p 4s 3d 4p…; Cr and Cu are exceptions.'),
    P(ATOM, null, 'Rydberg Equation', r`$\frac{1}{\lambda}$`, r`$\frac{1}{\lambda} = R_H\left(\frac{1}{n_1^2} - \frac{1}{n_2^2}\right),\quad R_H = 1.097 \times 10^7\ \text{m}^{-1}$`,
        [v(r`$\lambda$`, 'emitted wavelength', r`$\text{m}$`), v(r`$n_1 < n_2$`, 'lower and upper levels')],
        'Wavelengths of the hydrogen spectrum lines.',
        'n₁ = 1 Lyman (UV), 2 Balmer (visible), 3 Paschen (IR).', r`$\text{m}^{-1}$`),
    // Chemical Bonding
    P(BOND, null, 'Electronegativity Difference and Bond Type', r`$\Delta EN$`, r`$\Delta EN < 0.4\ \text{nonpolar covalent};\quad 0.4\text{–}1.7\ \text{polar covalent};\quad > 1.7\ \text{ionic}$`,
        [v(r`$\Delta EN$`, 'difference of the Pauling electronegativities')],
        'Bond character from how unequally the atoms pull on the shared electrons.',
        'NaCl: 3.16 − 0.93 = 2.23, ionic. H–O: 3.44 − 2.20 = 1.24, polar.'),
    P(BOND, null, 'Formal Charge', r`$FC$`, r`$FC = V - N - \frac{B}{2}$`,
        [v(r`$V$`, 'valence electrons of the free atom'), v(r`$N$`, 'non-bonding electrons on the atom'), v(r`$B$`, 'electrons in its bonds')],
        'The charge an atom would carry if bonding electrons were shared equally: picks the best Lewis structure.',
        'The best structure keeps formal charges near zero, negatives on the more electronegative atoms.'),
    P(BOND, null, 'Bond Order', r`$BO$`, r`$BO = \frac{(\text{bonding electrons}) - (\text{antibonding electrons})}{2}$`,
        [v(r`$BO$`, 'bond order')],
        'Molecular-orbital count of bonds between two atoms; higher means shorter and stronger.',
        'O₂: (10 − 6)/2 = 2. A bond order of 0 means no stable molecule (He₂).'),
    P(BOND, null, 'Dipole Moment', r`$\mu = qd$`, r`$\mu = qd,\qquad 1\ \text{D} = 3.336 \times 10^{-30}\ \text{C}\cdot\text{m}$`,
        [v(r`$q$`, 'separated charge', r`$\text{C}$`), v(r`$d$`, 'separation', r`$\text{m}$`)],
        'How polar a bond or molecule is.',
        'Symmetric molecules (CO₂, CH₄) have zero net dipole even with polar bonds.', r`$\text{C}\cdot\text{m}$`),
    // Stoichiometry
    P(STO, null, 'Percent Composition', r`$\%X$`, r`$\%X = \frac{n_X A_X}{M}\times 100\%$`,
        [v(r`$n_X$`, 'atoms of X per formula'), v(r`$A_X$`, 'atomic mass of X', r`$\text{g/mol}$`), v(r`$M$`, 'molar mass of the compound', r`$\text{g/mol}$`)],
        'The mass share of an element in a compound.',
        'Water: 2(1.008)/18.015 = 11.2% hydrogen.'),
    P(STO, null, 'Empirical and Molecular Formula', r`$k$`, r`$\text{molecular formula} = k \times \text{empirical formula},\qquad k = \frac{M_{\text{molecular}}}{M_{\text{empirical}}}$`,
        [v(r`$M$`, 'molar masses', r`$\text{g/mol}$`)],
        'From percent composition to the simplest whole-number ratio, then to the actual formula.',
        'Divide each mole amount by the smallest; multiply to clear fractions like 1.5 or 1.33.'),
    P(STO, null, 'Limiting Reactant and Percent Yield', r`$\%Y$`, r`$\text{limiting reactant: the smallest } \frac{n_i}{\nu_i};\qquad \%\text{yield} = \frac{\text{actual}}{\text{theoretical}}\times 100\%$`,
        [v(r`$n_i$`, 'moles of reactant i available', r`$\text{mol}$`), v(r`$\nu_i$`, 'its coefficient in the balanced equation')],
        'The reactant that runs out first sets how much product can form.',
        'Compare moles DIVIDED by coefficients, not masses.'),
    // Gas Laws
    P(GAS, null, "Graham's Law of Effusion", r`$\frac{r_1}{r_2}$`, r`$\frac{r_1}{r_2} = \sqrt{\frac{M_2}{M_1}}$`,
        [v(r`$r$`, 'effusion rates'), v(r`$M$`, 'molar masses', r`$\text{g/mol}$`)],
        'Lighter gases escape through a small hole faster.',
        'H₂ effuses 4 times faster than O₂ (√(32/2)).'),
    P(GAS, null, 'Gas Density and Molar Mass', r`$\rho$`, r`$\rho = \frac{pM}{RT},\qquad M = \frac{\rho RT}{p}$`,
        [v(r`$p$`, 'pressure', r`$\text{Pa}$`), v(r`$M$`, 'molar mass', r`$\text{kg/mol}$`), R_, T_],
        'Density of an ideal gas, or its molar mass from a measured density.',
        'Air at 25 °C, 1 atm: about 1.18 kg/m³.', r`$\text{kg/m}^3$`),
    P(GAS, null, 'Van der Waals Equation', r`$\left(p + \frac{an^2}{V^2}\right)$`, r`$\left(p + \frac{an^2}{V^2}\right)(V - nb) = nRT$`,
        [v(r`$a$`, 'attraction constant', r`$\text{Pa}\cdot\text{m}^6\text{/mol}^2$`), v(r`$b$`, 'excluded volume per mole', r`$\text{m}^3\text{/mol}$`), R_, T_],
        'A real-gas equation correcting for molecular attraction and size.',
        'It matters at high pressure and low temperature; with a = b = 0 it is the ideal gas law.', r`$\text{J}$`),
    K(GAS, 'Molar Volume of an Ideal Gas', r`$V_m$`, r`$22.414\ \text{L/mol at STP (0 °C, 1 atm)};\ 24.47\ \text{L/mol at 25 °C, 1 atm}$`, 'The volume one mole of any ideal gas fills.', 'IUPAC\'s newer STP (0 °C, 100 kPa) gives 22.71 L/mol: check which the problem means.'),
    K(GAS, 'Gas Constant in Chemistry Units', r`$R$`, r`$0.08206\ \text{L}\cdot\text{atm/(mol}\cdot\text{K)} = 8.314\ \text{J/(mol}\cdot\text{K)} = 62.36\ \text{L}\cdot\text{torr/(mol}\cdot\text{K)}$`, 'The universal gas constant in the units chemistry problems use.', 'Pick the R that matches your pressure and volume units.'),
    // Solutions and Concentration
    P(SOL, null, 'Molality', r`$b$`, r`$b = \frac{n_{\text{solute}}}{m_{\text{solvent}}\ (\text{kg})}$`,
        [v(r`$n$`, 'moles of solute', r`$\text{mol}$`), v(r`$m_{\text{solvent}}$`, 'mass of SOLVENT', r`$\text{kg}$`)],
        'Concentration per kilogram of solvent; unlike molarity it does not change with temperature.',
        'Used for boiling and freezing point changes.', r`$\text{mol/kg}$`),
    P(SOL, null, 'Mole Fraction and Mass Percent', r`$x_i$`, r`$x_i = \frac{n_i}{\sum n},\qquad \%\text{mass} = \frac{m_{\text{solute}}}{m_{\text{solution}}}\times 100\%,\qquad 1\ \text{ppm} \approx 1\ \text{mg/L (dilute, aqueous)}$`,
        [v(r`$n_i$`, 'moles of component i', r`$\text{mol}$`), v(r`$m$`, 'masses', r`$\text{g}$`)],
        'Other ways to state a concentration.',
        'Mole fractions of all components add to 1.'),
    P(SOL, null, 'Normality', r`$N$`, r`$N = M \times n_{eq}$`,
        [v(r`$M$`, 'molarity', MOLL), v(r`$n_{eq}$`, 'equivalents per mole (H⁺ or OH⁻ given, or electrons transferred)')],
        'Concentration in equivalents per litre.',
        '1 M H₂SO₄ is 2 N. In titrations N₁V₁ = N₂V₂.', r`$\text{eq/L}$`),
    P(SOL, null, "Raoult's Law", r`$p_A = x_Ap_A^\circ$`, r`$p_A = x_Ap_A^\circ$`,
        [v(r`$x_A$`, 'mole fraction of the solvent in the liquid'), v(r`$p_A^\circ$`, 'vapour pressure of the pure solvent', r`$\text{kPa}$`)],
        'A solvent\'s vapour pressure falls in proportion to how much of it is in the solution.',
        'Lowering Δp = x_solute p°.', r`$\text{kPa}$`),
    P(SOL, null, 'Boiling Point Elevation and Freezing Point Depression', r`$\Delta T$`, r`$\Delta T_b = iK_bb,\qquad \Delta T_f = iK_fb;\quad \text{water: } K_b = 0.512,\ K_f = 1.86\ ^\circ\text{C}\cdot\text{kg/mol}$`,
        [v(r`$i$`, 'van \'t Hoff factor (particles per formula: NaCl 2)'), v(r`$b$`, 'molality', r`$\text{mol/kg}$`)],
        'Dissolved particles raise a solvent\'s boiling point and lower its freezing point.',
        'They depend on the NUMBER of particles, not their kind (colligative).', r`$^\circ\text{C}$`),
    P(SOL, null, 'Osmotic Pressure', r`$\pi = iMRT$`, r`$\pi = iMRT$`,
        [v(r`$i$`, 'van \'t Hoff factor'), v(r`$M$`, 'molarity', MOLL), v(r`$R$`, '0.08206 L·atm/(mol·K)'), T_],
        'The pressure needed to stop water flowing through a membrane into a solution.',
        'Reverse osmosis desalination must exceed seawater\'s about 27 atm.', r`$\text{atm}$`),
    // Equilibrium, Acids and Bases
    P(EQ, null, 'Equilibrium Constant', r`$K_c$`, r`$K_c = \frac{[C]^c[D]^d}{[A]^a[B]^b},\qquad K_p = K_c(RT)^{\Delta n}$`,
        [v(r`$[\ ]$`, 'equilibrium molar concentrations', MOLL), v(r`$\Delta n$`, 'moles of gas products minus reactants')],
        'For aA + bB ⇌ cC + dD: the ratio that is fixed at a given temperature.',
        'Leave out pure solids and liquids. If Q < K the reaction goes forward.'),
    P(EQ, null, 'Ion Product of Water', r`$K_w$`, r`$K_w = [\text{H}^+][\text{OH}^-] = 1.0 \times 10^{-14}\ (25\,^\circ\text{C}),\qquad \text{pH} + \text{pOH} = 14$`,
        [v(r`$[\text{H}^+], [\text{OH}^-]$`, 'ion concentrations', MOLL)],
        'Water\'s own ionisation ties acidity and basicity together.',
        'Neutral pH is 7 only at 25 °C.'),
    P(EQ, null, 'pH of a Weak Acid', r`$[\text{H}^+]$`, r`$[\text{H}^+] \approx \sqrt{K_aC}\quad (\text{if ionisation} < 5\%)$`,
        [v(r`$K_a$`, 'acid dissociation constant'), v(r`$C$`, 'acid concentration', MOLL)],
        'Hydrogen-ion concentration of a weak acid, which ionises only partly.',
        r`0.1 M acetic acid ($K_a = 1.8 \times 10^{-5}$): pH ≈ 2.87.`, MOLL),
    P(EQ, null, 'Henderson-Hasselbalch Equation', r`$\text{pH}$`, r`$\text{pH} = \text{p}K_a + \log\frac{[\text{A}^-]}{[\text{HA}]}$`,
        [v(r`$\text{p}K_a$`, r`$-\log K_a$`), v(r`$[\text{A}^-], [\text{HA}]$`, 'conjugate base and acid', MOLL)],
        'The pH of a buffer.',
        'Equal acid and base: pH = pKa. A buffer works best within ±1 of pKa.'),
    P(EQ, null, 'Titration at Equivalence', r`$M_aV_a$`, r`$n_aM_aV_a = n_bM_bV_b$`,
        [v(r`$M_a, M_b$`, 'molarities of acid and base', MOLL), v(r`$V_a, V_b$`, 'volumes', r`$\text{L}$`), v(r`$n_a, n_b$`, 'H⁺ given per acid, OH⁻ per base')],
        'At the equivalence point the acid\'s H⁺ exactly matches the base\'s OH⁻.',
        'Strong acid with strong base: equivalence at pH 7; weak acid with strong base: above 7.'),
    // Thermochemistry and Energy
    P(THERMO, null, "Hess's Law and Enthalpy of Reaction", r`$\Delta H_{rxn}$`, r`$\Delta H_{rxn}^\circ = \sum\nu\Delta H_f^\circ(\text{products}) - \sum\nu\Delta H_f^\circ(\text{reactants})$`,
        [v(r`$\Delta H_f^\circ$`, 'standard enthalpies of formation (elements = 0)', r`$\text{kJ/mol}$`), v(r`$\nu$`, 'coefficients')],
        'A reaction\'s heat from tabulated formation enthalpies; steps can be added like equations.',
        'Negative ΔH is exothermic. Reversing a reaction flips its sign.', r`$\text{kJ}$`),
    P(THERMO, null, 'Gibbs Free Energy', r`$\Delta G$`, r`$\Delta G = \Delta H - T\Delta S;\qquad \Delta G^\circ = -RT\ln K$`,
        [v(r`$\Delta H$`, 'enthalpy change', r`$\text{kJ}$`), v(r`$\Delta S$`, 'entropy change', r`$\text{kJ/K}$`), T_, v(r`$K$`, 'equilibrium constant')],
        'Whether a reaction runs on its own (ΔG < 0), and how far.',
        'With ΔH > 0 and ΔS > 0 it becomes spontaneous above T = ΔH/ΔS.', r`$\text{kJ}$`),
    P(THERMO, null, 'Heating Value of a Fuel', r`$Q$`, r`$Q = m \cdot HV;\qquad HHV - LHV = \text{latent heat of the water formed}$`,
        [v(r`$m$`, 'mass of fuel', r`$\text{kg}$`), v(r`$HV$`, 'heating value', r`$\text{MJ/kg}$`)],
        'Heat released by burning a fuel; the higher value counts the water vapour condensed.',
        'Methane: HHV 55.5, LHV 50.0 MJ/kg. Boiler efficiencies quoted on HHV look lower.', r`$\text{MJ}$`),
    P(THERMO, null, 'Arrhenius Equation', r`$k$`, r`$k = Ae^{-E_a/RT};\qquad \ln\frac{k_2}{k_1} = \frac{E_a}{R}\left(\frac{1}{T_1} - \frac{1}{T_2}\right)$`,
        [v(r`$E_a$`, 'activation energy', r`$\text{J/mol}$`), R_, T_, v(r`$A$`, 'frequency factor')],
        'How a reaction\'s rate constant rises with temperature.',
        'A rough rule: rates double for every 10 °C near room temperature (Eₐ ≈ 50 kJ/mol).'),
    P(THERMO, null, 'First-Order Reaction', r`$t_{1/2}$`, r`$[\text{A}] = [\text{A}]_0e^{-kt},\qquad t_{1/2} = \frac{\ln 2}{k}$`,
        [v(r`$k$`, 'rate constant', r`$\text{1/s}$`), v(r`$[\text{A}]_0$`, 'starting concentration', MOLL)],
        'A reaction whose rate is proportional to one concentration; its half-life is constant.',
        'Second order: 1/[A] = 1/[A]₀ + kt, and the half-life grows as it goes.', r`$\text{s}$`),
    // Electrochemistry and Batteries
    P(ELEC, null, 'Standard Cell Potential', r`$E^\circ_{cell}$`, r`$E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode}$`,
        [v(r`$E^\circ$`, 'standard reduction potentials', r`$\text{V}$`)],
        'A galvanic cell\'s voltage from the reduction potentials of its two halves.',
        'Daniell cell: 0.34 − (−0.76) = 1.10 V. Positive E° means spontaneous.', r`$\text{V}$`),
    P(ELEC, null, 'Nernst Equation', r`$E$`, r`$E = E^\circ - \frac{RT}{nF}\ln Q = E^\circ - \frac{0.05916}{n}\log Q\ (25\,^\circ\text{C})$`,
        [v(r`$E^\circ$`, 'standard potential', r`$\text{V}$`), N_E, v(r`$Q$`, 'reaction quotient')],
        'A cell\'s voltage away from standard concentrations.',
        'At equilibrium E = 0 and Q = K: log K = nE°/0.05916.', r`$\text{V}$`),
    P(ELEC, null, 'Cell Potential and Gibbs Energy', r`$\Delta G = -nFE$`, r`$\Delta G = -nFE$`,
        [N_E, F_, v(r`$E$`, 'cell potential', r`$\text{V}$`)],
        'The electrical work a cell can deliver per mole of reaction.',
        'J = C × V: with F in C/mol, ΔG comes out in J/mol.', r`$\text{J/mol}$`),
    P(ELEC, null, 'Battery Energy and C-Rate', r`$E$`, r`$E = QV\ \ (\text{Wh} = \text{Ah}\times\text{V});\qquad I = C_{rate}\times Q,\ \ t = \frac{1}{C_{rate}}\ \text{h}$`,
        [v(r`$Q$`, 'capacity', r`$\text{Ah}$`), v(r`$V$`, 'nominal voltage', r`$\text{V}$`), v(r`$C_{rate}$`, 'charge or discharge rate')],
        'A battery\'s stored energy, and the current for a given C-rate.',
        'A 100 Ah cell at 1C delivers 100 A for 1 h; at C/5, 20 A for 5 h. Usable capacity falls at high rates.', r`$\text{Wh}$`),
    // Energy Storage and Fuel Cells
    P(FUEL, null, 'Ideal Fuel Cell Voltage', r`$E$`, r`$E = -\frac{\Delta G}{nF};\qquad \text{H}_2/\text{O}_2\ \text{at } 25\,^\circ\text{C}: 1.229\ \text{V}$`,
        [v(r`$\Delta G$`, 'Gibbs energy of the reaction', r`$\text{J/mol}$`), N_E, F_],
        'The most voltage a fuel cell can give.',
        'Real cells run at 0.6–0.8 V per cell under load; stacks connect many in series.', r`$\text{V}$`),
    P(FUEL, null, 'Fuel Cell Efficiency', r`$\eta$`, r`$\eta_{\max} = \frac{\Delta G}{\Delta H};\qquad \eta_{actual} = \frac{V_{cell}}{1.48\ \text{V}}\ (\text{H}_2,\ \text{HHV})$`,
        [v(r`$\Delta G, \Delta H$`, 'Gibbs energy and enthalpy of the reaction', r`$\text{kJ/mol}$`), v(r`$V_{cell}$`, 'operating voltage', r`$\text{V}$`)],
        'Unlike a heat engine, a fuel cell is not limited by Carnot.',
        'H₂ at 25 °C: 237.1/285.8 = 83% at most.'),
    P(FUEL, null, 'Hydrogen Consumption of a Fuel Cell', r`$\dot{n}_{\text{H}_2}$`, r`$\dot{n}_{\text{H}_2} = \frac{I}{2F}\ \text{per cell}$`,
        [v(r`$I$`, 'current', r`$\text{A}$`), F_],
        'Hydrogen used per second: two electrons per molecule.',
        'Multiply by the number of cells in the stack.', r`$\text{mol/s}$`),
    P(FUEL, null, 'Energy Density and Round-Trip Efficiency', r`$\eta_{rt}$`, r`$\text{specific energy} = \frac{E}{m}\ (\text{Wh/kg});\qquad \eta_{rt} = \frac{E_{out}}{E_{in}}$`,
        [v(r`$E$`, 'stored energy', r`$\text{Wh}$`), v(r`$m$`, 'mass', r`$\text{kg}$`)],
        'How much energy a store holds per kilogram, and how much comes back out.',
        'Li-ion ≈ 150–250 Wh/kg, lead-acid 30–40; pumped hydro round trip ≈ 75–80%.'),
    // Solar Cells and Photosynthesis
    P(SOLAR, null, 'Solar Cell Efficiency and Fill Factor', r`$\eta$`, r`$\eta = \frac{P_{max}}{GA} = \frac{V_{oc}I_{sc}FF}{GA},\qquad FF = \frac{V_{mp}I_{mp}}{V_{oc}I_{sc}}$`,
        [v(r`$G$`, 'irradiance (1000 W/m² standard)', r`$\text{W/m}^2$`), v(r`$A$`, 'cell area', r`$\text{m}^2$`), v(r`$V_{oc}, I_{sc}$`, 'open-circuit voltage, short-circuit current')],
        'How much of the sunlight on a cell becomes electricity.',
        'Crystalline silicon modules: about 18–22%.'),
    P(SOLAR, null, 'Band Gap Cutoff Wavelength', r`$\lambda_c$`, r`$\lambda_c = \frac{hc}{E_g} \approx \frac{1240}{E_g\ (\text{eV})}\ \text{nm}$`,
        [v(r`$E_g$`, 'band gap', r`$\text{eV}$`)],
        'The longest wavelength a semiconductor can absorb.',
        'Silicon (1.12 eV): about 1107 nm, in the near infrared.', r`$\text{nm}$`),
    P(SOLAR, null, 'Photosynthesis', r`$6\text{CO}_2 + 6\text{H}_2\text{O}$`, r`$6\text{CO}_2 + 6\text{H}_2\text{O} \xrightarrow{\text{light}} \text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2,\qquad \Delta G^\circ \approx +2870\ \text{kJ/mol}$`,
        [v(r`$\Delta G^\circ$`, 'energy stored per mole of glucose', r`$\text{kJ/mol}$`)],
        'Plants store sunlight as chemical energy in glucose.',
        'It is respiration run backwards; its overall efficiency is only about 1–2%.'),
    // Renewable Energy
    P(RENEW, null, 'Wind Turbine Power', r`$P$`, r`$P = \tfrac12\rho Av^3C_p,\qquad C_{p,\max} = \frac{16}{27} \approx 0.593\ (\text{Betz})$`,
        [v(r`$\rho$`, 'air density (1.225)', r`$\text{kg/m}^3$`), v(r`$A$`, 'swept area', r`$\text{m}^2$`), v(r`$v$`, 'wind speed', r`$\text{m/s}$`), v(r`$C_p$`, 'power coefficient')],
        'Power a wind turbine extracts from the wind.',
        'Doubling the wind speed gives 8 times the power.', r`$\text{W}$`),
    P(RENEW, null, 'Capacity Factor', r`$CF$`, r`$CF = \frac{\text{energy produced}}{\text{rated power}\times\text{hours}}$`,
        [v(r`$CF$`, 'capacity factor')],
        'How much a plant actually produces compared with running flat out all the time.',
        'Solar PV ≈ 15–20%, wind 25–40%, geothermal and nuclear 80–90%.'),
    // Chemistry of Engineering Materials
    P(MAT, null, 'Corrosion Rate', r`$CR$`, r`$CR = \frac{87.6\,W}{\rho At}\ (\text{mm/yr})$`,
        [v(r`$W$`, 'mass loss', r`$\text{mg}$`), v(r`$\rho$`, 'density', r`$\text{g/cm}^3$`), v(r`$A$`, 'exposed area', r`$\text{cm}^2$`), v(r`$t$`, 'time', r`$\text{h}$`)],
        'Thickness lost per year from a measured weight loss.',
        'Galvanic corrosion attacks the more active (anodic) metal of a pair: zinc protects steel.', r`$\text{mm/yr}$`),
    P(MAT, null, 'Pilling-Bedworth Ratio', r`$PBR$`, r`$PBR = \frac{V_{oxide}}{V_{metal}} = \frac{M_{oxide}\rho_{metal}}{nM_{metal}\rho_{oxide}}$`,
        [v(r`$n$`, 'metal atoms per oxide formula'), v(r`$M, \rho$`, 'molar masses and densities')],
        'Whether a metal\'s oxide layer protects it: 1 to 2 is protective.',
        'Below 1 the oxide is porous (Mg); far above 2 it flakes off.'),
    P(MAT, null, 'Degree of Polymerization', r`$DP$`, r`$DP = \frac{M_{polymer}}{M_{repeat\ unit}}$`,
        [v(r`$M$`, 'molar masses', r`$\text{g/mol}$`)],
        'How many repeat units make up a polymer chain.',
        'Polyethylene of 28 000 g/mol has DP = 1000 (C₂H₄ = 28).'),
    // Nanomaterials
    P(NANO, null, 'Surface-Area-to-Volume Ratio', r`$\frac{A}{V}$`, r`$\text{sphere: } \frac{A}{V} = \frac{3}{r};\qquad \text{specific surface area} = \frac{6}{\rho d}$`,
        [v(r`$r, d$`, 'radius and diameter of the particle', r`$\text{m}$`), v(r`$\rho$`, 'density', r`$\text{kg/m}^3$`)],
        'Small particles have far more surface per volume: the root of nanomaterials\' reactivity.',
        'Shrinking a particle 1000-fold raises A/V 1000-fold.', r`$\text{m}^{-1}$`),
    P(NANO, null, 'Atoms in a Nanoparticle', r`$N$`, r`$N = \frac{\rho VN_A}{M},\qquad V = \tfrac{\pi}{6}d^3$`,
        [v(r`$\rho$`, 'density', r`$\text{g/cm}^3$`), v(r`$d$`, 'particle diameter', r`$\text{cm}$`), v(r`$M$`, 'molar mass', r`$\text{g/mol}$`)],
        'How many atoms make up a small particle.',
        'A 5 nm gold particle holds about 3900 atoms, a large share of them on its surface.'),
    // Chemistry of the Environment
    P(ENV, null, 'Gas Concentration: ppm to mg/m³', r`$C$`, r`$C\ (\text{mg/m}^3) = \frac{\text{ppm}\times M}{24.45}\quad (25\,^\circ\text{C},\ 1\ \text{atm})$`,
        [v(r`$M$`, 'molar mass of the pollutant', r`$\text{g/mol}$`)],
        'Converting an air pollutant\'s volume fraction to mass concentration.',
        'Use 22.41 instead of 24.45 at 0 °C.', r`$\text{mg/m}^3$`),
    P(ENV, null, 'Biochemical Oxygen Demand', r`$BOD_t$`, r`$BOD_t = L_0(1 - e^{-kt})$`,
        [v(r`$L_0$`, 'ultimate BOD', r`$\text{mg/L}$`), v(r`$k$`, 'rate constant', r`$\text{1/day}$`), v(r`$t$`, 'time', r`$\text{days}$`)],
        'Oxygen used by microbes breaking down organic matter in water.',
        'BOD₅ (5 days, 20 °C) is the standard test; with k = 0.23/day it is about 68% of L₀.', r`$\text{mg/L}$`),
    P(ENV, null, 'Hardness as CaCO₃', r`$\text{hardness}$`, r`$\text{mg/L as CaCO}_3 = \text{mg/L of ion}\times\frac{50}{\text{equivalent weight of the ion}}$`,
        [v(r`$50$`, 'equivalent weight of CaCO₃', r`$\text{g/eq}$`)],
        'Water hardness from calcium and magnesium, expressed as calcium carbonate.',
        'Ca²⁺: × 50/20 = 2.5; Mg²⁺: × 50/12.15 = 4.12. Above 180 mg/L is very hard.', r`$\text{mg/L}$`),
    P(ENV, null, 'Carbon Dioxide from Combustion', r`$m_{\text{CO}_2}$`, r`$m_{\text{CO}_2} = m_{\text{C}}\times\frac{44}{12}$`,
        [v(r`$m_{\text{C}}$`, 'mass of carbon burned', r`$\text{kg}$`)],
        'Each kilogram of carbon burned makes 3.67 kg of CO₂.',
        'Coal is about 70–80% carbon; natural gas emits roughly half the CO₂ per kWh of coal.', r`$\text{kg}$`),
];

module.exports = { subject: 'ESAS', topic: 'Chemistry for Engineers', migration: '20261217000000_cards_chemistry_for_engineers', file, revisions, retire, drafts };
