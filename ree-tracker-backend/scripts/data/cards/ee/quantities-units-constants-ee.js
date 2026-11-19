'use strict';

// EE › Quantities/units/constants formula cards (Library round, 2026-11-19):
// the topic had no cards. Already elsewhere and not repeated: ε₀, μ₀, the
// copper resistivity, R = ρL/A, the inferred absolute zero and circular mils
// (Circuits 1); the elementary charge, Coulomb constant, μ = μ₀μᵣ and
// magnetic energy density (Electromagnetism); the thermal voltage (Electronics); the AWG diameter (Apparatus);
// SI base and derived units, SI prefixes, horsepower, energy conversions and
// h, c, k, N_A, F (ESAS); dielectric strength (ESAS Material Science). This
// file adds: electrical and magnetic quantities with their units, unit
// identities, CGS electrical units, the Josephson and von Klitzing
// constants; prefix products and engineering notation; resistivity tables
// and units, %IACS, conductance, drawn wire, resistance from mass; temperature
// coefficients, change of reference, R at another temperature, series and
// parallel conductors; dielectric constants and relative permeabilities;
// magnetic SI–CGS–English conversions, μ₀ in other units, CGS mmf and field
// strength; AWG steps, common sizes, kcmil–mm², resistance per km; motor
// current from horsepower, energy cost, water heating, heat in calories;
// the electron's e/m. See mathematics/algebra.js for the format;
// tests/quantitiesUnitsEeFormulas.test.js rebuilds each from definitions.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SIE = 'SI Electrical Units';
const PRE = 'Prefixes';
const RES = 'Resistivity and Conductivity';
const TC = 'Temperature Coefficients';
const PP = 'Permittivity and Permeability';
const MAG = 'Magnetic Units (SI and CGS)';
const WG = 'Wire Gauges';
const PE = 'Power and Energy Conversions';
const PC = 'Physical Constants';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const OHM = r`$\Omega$`;
const RHO = v(r`$\rho$`, 'resistivity', r`$\Omega\cdot\text{m}$`);

const drafts = [
    // SI Electrical Units
    K(SIE, 'Electrical and Magnetic Quantities and Units', r`$Q,\ I,\ V,\ R,\ G,\ C,\ L,\ \Phi,\ B$`, r`$Q\ \text{C};\ I\ \text{A};\ V\ \text{V};\ R\ \Omega;\ G\ \text{S (mho)};\ C\ \text{F};\ L\ \text{H};\ \Phi\ \text{Wb};\ B\ \text{T};\ \mathcal{F}\ \text{A·t};\ H\ \text{A/m};\ \mathcal{R}\ \text{A·t/Wb};\ S\ \text{VA};\ Q\ \text{var};\ P\ \text{W};\ 1\ \text{S} = 1\ \Omega^{-1}$`, 'Each electrical and magnetic quantity with its symbol and SI unit.', 'Apparent power is in VA and reactive in var, not W, though all three are V × A dimensionally.'),
    K(SIE, 'Unit Identities in Circuit Work', r`$\Omega\cdot\text{F} = \text{H}/\Omega = \text{s}$`, r`$\Omega\cdot\text{F} = \text{s};\ \text{H}/\Omega = \text{s};\ \sqrt{\text{H}\cdot\text{F}} = \text{s};\ \text{Wb} = \text{V·s};\ \text{J} = \text{C·V} = \text{W·s};\ \text{T} = \text{Wb/m}^2;\ 1\ \text{Ah} = 3600\ \text{C}$`, 'Unit combinations that come up when checking circuit answers.', 'If a time constant doesn\'t come out in seconds, a formula is wrong.'),
    K(SIE, 'CGS Electrical Units', r`$1\ \text{abA} = 10\ \text{A}$`, r`$\text{EMU: } 1\ \text{abA} = 10\ \text{A};\ 1\ \text{abC} = 10\ \text{C};\ 1\ \text{abV} = 10^{-8}\ \text{V};\ 1\ \text{ab}\Omega = 10^{-9}\ \Omega.\quad \text{ESU: } 1\ \text{statC} = 3.336 \times 10^{-10}\ \text{C};\ 1\ \text{statV} = 299.79\ \text{V}$`, 'The two older centimetre-gram-second systems of electrical units.', 'EMU (ab-) units come from magnetic force, ESU (stat-) from electric force; their ratio is the speed of light.'),
    K(SIE, 'Josephson and von Klitzing Constants', r`$K_J = \frac{2e}{h},\ R_K = \frac{h}{e^2}$`, r`$K_J = \frac{2e}{h} = 483\,597.848\ \text{GHz/V};\qquad R_K = \frac{h}{e^2} = 25\,812.807\ \Omega$`, 'How laboratories realize the volt and the ohm, exactly, since the 2019 SI.', 'Both are exact now that e and h are fixed by definition.'),
    // Prefixes
    K(PRE, 'Prefix Products in Circuit Work', r`$\text{k}\Omega \times \text{mA} = \text{V}$`, r`$\text{k}\Omega \times \text{mA} = \text{V};\ \text{k}\Omega \times \mu\text{F} = \text{ms};\ \text{M}\Omega \times \mu\text{F} = \text{s};\ \text{mH}/\text{k}\Omega = \mu\text{s};\ 1/\mu\text{s} = \text{MHz};\ \text{kV} \times \text{mA} = \text{W}$`, 'Prefix pairs that cancel, so circuit arithmetic stays in small numbers.', 'Exponents add: k (10³) × m (10⁻³) = 10⁰.'),
    K(PRE, 'Engineering Notation', r`$x \times 10^{3k}$`, r`$x \times 10^{3k},\ 1 \le x < 1000:\quad 47\,000\ \Omega = 47\ \text{k}\Omega;\ 0.000\,22\ \text{F} = 220\ \mu\text{F}$`, 'Scientific notation with exponents in steps of three, matching the SI prefixes.', 'Use the calculator\'s ENG mode to read answers straight off as k, M, m, µ, n, p.'),
    // Resistivity and Conductivity
    K(RES, 'Resistivities of Common Conductors', r`$\rho_{Ag} < \rho_{Cu} < \rho_{Au} < \rho_{Al}$`, r`$\text{at } 20\,^\circ\text{C } (\Omega\cdot\text{m}):\ \text{Ag } 1.59 \times 10^{-8};\ \text{Cu } 1.72 \times 10^{-8};\ \text{Au } 2.44 \times 10^{-8};\ \text{Al } 2.83 \times 10^{-8};\ \text{W } 5.6 \times 10^{-8};\ \text{Fe } 9.7 \times 10^{-8};\ \text{nichrome } 1.10 \times 10^{-6}$`, 'Typical resistivities of conductor and heating materials.', 'In Ω·cmil/ft: copper 10.37, aluminium 17.0. Hard-drawn copper is about 3% higher than annealed.'),
    K(RES, 'Resistivity Units', r`$\Omega\cdot\text{m},\ \Omega\cdot\text{cmil/ft}$`, r`$1\ \Omega\cdot\text{m} = 10^6\ \Omega\cdot\text{mm}^2/\text{m} = 10^8\ \mu\Omega\cdot\text{cm};\qquad 1\ \Omega\cdot\text{cmil/ft} = 1.6624 \times 10^{-9}\ \Omega\cdot\text{m}$`, 'Converting resistivity between SI, practical metric and American units.', 'Ω·mm²/m is handy: copper is 0.0172, so 1 m of 1 mm² copper is 17.2 mΩ.'),
    P(RES, null, 'Percent Conductivity (IACS)', r`$\%\text{IACS} = \frac{\rho_{Cu}}{\rho} \times 100$`, r`$\%\text{IACS} = \frac{\rho_{\text{IACS}}}{\rho} \times 100 = \frac{1.7241 \times 10^{-8}}{\rho} \times 100$`,
        [RHO],
        'Conductivity as a percentage of the International Annealed Copper Standard.',
        'EC-grade aluminium is about 61% IACS; silver about 108%.'),
    P(RES, null, 'Conductance of a Conductor', r`$G = \frac{\sigma A}{L} = \frac1R$`, r`$G = \frac{1}{R} = \frac{\sigma A}{L},\qquad \sigma = \frac{1}{\rho}$`,
        [v(r`$\sigma$`, 'conductivity', r`$\text{S/m}$`), v(r`$A$`, 'cross-sectional area', r`$\text{m}^2$`), v(r`$L$`, 'length', r`$\text{m}$`)],
        'How easily a conductor passes current: the reciprocal of resistance.',
        'Conductances in parallel add, like resistances in series.', r`$\text{S}$`),
    P(RES, null, 'Resistance of a Drawn Wire', r`$\frac{R_2}{R_1} = \left(\frac{L_2}{L_1}\right)^2$`, r`$\frac{R_2}{R_1} = \left(\frac{L_2}{L_1}\right)^2 = \left(\frac{A_1}{A_2}\right)^2 = \left(\frac{d_1}{d_2}\right)^4\quad (\text{same volume})$`,
        [v(r`$L_1, L_2$`, 'lengths before and after'), v(r`$A_1, A_2$`, 'areas before and after'), v(r`$d_1, d_2$`, 'diameters before and after')],
        'Drawing a wire longer keeps its volume, so it gets both longer and thinner.',
        'Stretching to twice the length makes it four times the resistance, not twice.'),
    P(RES, null, 'Resistance from Mass and Length', r`$R = \frac{\rho\,\delta L^2}{m}$`, r`$R = \frac{\rho L}{A} = \frac{\rho\,\delta\,L^2}{m}$`,
        [RHO, v(r`$\delta$`, 'density', r`$\text{kg/m}^3$`), v(r`$L$`, 'length', r`$\text{m}$`), v(r`$m$`, 'mass of the wire', r`$\text{kg}$`)],
        'A wire\'s resistance from how much metal it contains and how long it is.',
        'Copper density 8890 kg/m³, aluminium 2700 kg/m³: per kilogram, aluminium conducts about twice as well.', OHM),
    // Temperature Coefficients
    K(TC, 'Temperature Coefficients and Inferred Zeros', r`$\alpha_{20,Cu} = 0.00393,\ \alpha_{20,Al} = 0.00403$`, r`$\alpha_{20}\ (/^\circ\text{C}):\ \text{Cu } 0.00393\ (T_0 = -234.5\,^\circ\text{C});\ \text{Al } 0.00403\ (T_0 = -228\,^\circ\text{C});\ \text{Ag } 0.0038;\ \text{W } 0.0045;\ \text{nichrome } 0.0004;\ \text{constantan} \approx 0;\ \text{carbon} \approx -0.0005$`, 'How fast each material\'s resistance rises with temperature, and the inferred zero where the line would reach zero resistance.', 'α depends on the reference temperature: copper\'s is 0.00427 at 0 °C and 0.00393 at 20 °C.'),
    P(TC, null, 'Resistance at Another Temperature', r`$R_2 = R_1[1 + \alpha_1(t_2 - t_1)]$`, r`$R_2 = R_1\left[1 + \alpha_1(t_2 - t_1)\right]$`,
        [v(r`$R_1, R_2$`, 'resistances at t₁ and t₂', OHM), v(r`$\alpha_1$`, 'temperature coefficient referred to t₁', r`$/^\circ\text{C}$`), v(r`$t_1, t_2$`, 'temperatures', r`$^\circ\text{C}$`)],
        'Metals\' resistance rises almost linearly with temperature.',
        'α must be the one referred to t₁. Equivalent to the inferred-zero ratio (T₀ + t₂)/(T₀ + t₁).', OHM),
    P(TC, null, 'Temperature Coefficient at Another Reference', r`$\alpha_1 = \frac{\alpha_0}{1 + \alpha_0t_1}$`, r`$\alpha_1 = \frac{\alpha_0}{1 + \alpha_0t_1},\qquad \alpha_2 = \frac{\alpha_1}{1 + \alpha_1(t_2 - t_1)},\qquad \alpha_t = \frac{1}{|T_0| + t}$`,
        [v(r`$\alpha_0$`, 'coefficient referred to 0 °C', r`$/^\circ\text{C}$`), v(r`$t_1, t_2$`, 'reference temperatures', r`$^\circ\text{C}$`), v(r`$T_0$`, 'inferred absolute zero', r`$^\circ\text{C}$`)],
        'The same material has a smaller α when referred to a higher temperature.',
        'Copper: 1/234.5 = 0.004264 at 0 °C, 1/254.5 = 0.00393 at 20 °C.', r`$/^\circ\text{C}$`),
    P(TC, null, 'Temperature Coefficient of Series and Parallel Conductors', r`$\alpha_s = \frac{\alpha_1R_1 + \alpha_2R_2}{R_1 + R_2}$`, r`$\alpha_{series} = \frac{\alpha_1R_1 + \alpha_2R_2}{R_1 + R_2},\qquad \alpha_{parallel} \approx \frac{\alpha_1R_2 + \alpha_2R_1}{R_1 + R_2}$`,
        [v(r`$\alpha_1, \alpha_2$`, 'coefficients of the two conductors', r`$/^\circ\text{C}$`), v(r`$R_1, R_2$`, 'their resistances at the reference temperature', OHM)],
        'The combined coefficient of two materials that heat together.',
        'Pairing a positive-α wire with a negative-α one (carbon) can make a near temperature-stable resistor. The parallel form is first-order.', r`$/^\circ\text{C}$`),
    // Permittivity and Permeability
    K(PP, 'Dielectric Constants of Common Insulators', r`$\varepsilon_r$`, r`$\varepsilon_r:\ \text{air } 1.0006;\ \text{PTFE } 2.1;\ \text{transformer oil } 2.2;\ \text{polyethylene } 2.25;\ \text{XLPE } 2.3;\ \text{oiled paper } 3.5;\ \text{PVC } 4\text{–}6;\ \text{mica } 6;\ \text{porcelain } 6;\ \text{water } 80$`, 'Typical relative permittivities at power frequency.', 'A higher εᵣ means more capacitance and more charging current: why XLPE cables beat PVC at high voltage.'),
    K(PP, 'Relative Permeabilities of Common Materials', r`$\mu_r$`, r`$\mu_r:\ \text{air, Cu, Al} \approx 1;\ \text{cast iron } 100\text{–}600;\ \text{silicon steel } 1000\text{–}7000;\ \text{pure iron up to } 5000;\ \text{ferrite } 10^3\text{–}10^4;\ \text{mu-metal } 2 \times 10^4\text{–}10^5$`, 'How much more readily a material carries magnetic flux than vacuum.', 'For iron μᵣ is not a constant: it peaks at moderate H and falls toward 1 in saturation.'),
    // Magnetic Units (SI and CGS)
    K(MAG, 'Magnetic Unit Conversions', r`$1\ \text{T} = 10^4\ \text{G}$`, r`$1\ \text{Wb} = 10^8\ \text{Mx (lines)};\ 1\ \text{T} = 10^4\ \text{G} = 64.52\ \text{kilolines/in}^2;\ 1\ \text{Oe} = \frac{1000}{4\pi} = 79.58\ \text{A/m};\ 1\ \text{Gb} = \frac{10}{4\pi} = 0.7958\ \text{A·t}$`, 'Flux, flux density, field strength and mmf between SI, CGS and English units.', 'In CGS, B in gauss equals H in oersteds in air.'),
    K(MAG, 'Permeability of Free Space in Other Units', r`$\mu_0 = 1\ (\text{CGS}),\ 3.19\ (\text{English})$`, r`$\mu_0 = 4\pi \times 10^{-7}\ \text{H/m (SI)} = 1\ \text{G/Oe (CGS)} = 3.192\ \frac{\text{lines/in}^2}{\text{A·t/in}}\ (\text{English})$`, 'The free-space permeability in each unit system.', 'With English units B = 3.19 μᵣ H, H in ampere-turns per inch.'),
    P(MAG, null, 'MMF and Field Strength in CGS Units', r`$\mathcal{F} = 0.4\pi NI,\ H = \frac{0.4\pi NI}{\ell}$`, r`$\mathcal{F} = 0.4\pi NI\ \text{Gb},\qquad H = \frac{0.4\pi NI}{\ell}\ \text{Oe}\ (\ell \text{ in cm}),\qquad B = \mu_rH\ \text{G}$`,
        [v(r`$N$`, 'turns'), v(r`$I$`, 'current', r`$\text{A}$`), v(r`$\ell$`, 'magnetic path length', r`$\text{cm}$`), v(r`$\mu_r$`, 'relative permeability')],
        'Magnetic-circuit equations in gilberts and oersteds, as older texts use them.',
        'The 0.4π is 4π/10: it converts ampere-turns to gilberts.', r`$\text{Oe}$`),
    // Wire Gauges
    P(WG, null, 'AWG Size Steps', r`$\frac{A_2}{A_1} = 2^{(n_1 - n_2)/3}$`, r`$\frac{A_2}{A_1} = 2^{(n_1 - n_2)/3}\approx 1.26^{\,n_1 - n_2},\qquad \frac{R_2}{R_1} = \frac{A_1}{A_2}$`,
        [v(r`$n_1, n_2$`, 'AWG numbers (0 = 1/0, −1 = 2/0, …)'), v(r`$A_1, A_2$`, 'cross-sectional areas')],
        'Every 3 gauges doubles the area (halves the resistance); every 10 gauges is about ten times.',
        'A smaller gauge number is a thicker wire. #10 copper is about 1 Ω per 1000 ft.'),
    K(WG, 'Common AWG and Metric Wire Sizes', r`$\#14 = 2.08\ \text{mm}^2,\ \#10 = 5.26\ \text{mm}^2$`, r`$\#14\ 2.08;\ \#12\ 3.31;\ \#10\ 5.26;\ \#8\ 8.37;\ \#6\ 13.3;\ \#4\ 21.2;\ \#2\ 33.6;\ 1/0\ 53.5;\ 4/0\ 107.2\ \text{mm}^2\ (211\,600\ \text{cmil}).\ \text{Metric: } 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120\ \text{mm}^2$`, 'Areas of the common American gauges and the standard metric sizes.', 'The PEC uses mm² sizes; #14 AWG is close to, but smaller than, 2.5 mm².'),
    P(WG, null, 'Converting kcmil and mm²', r`$1\ \text{kcmil} = 0.5067\ \text{mm}^2$`, r`$A_{mm^2} = 0.5067 \times A_{kcmil},\qquad 1\ \text{mm}^2 = 1973.5\ \text{cmil},\qquad 1\ \text{cmil} = \tfrac{\pi}{4}\ \text{sq mil}$`,
        [v(r`$A_{kcmil}$`, 'area in thousands of circular mils (MCM)'), v(r`$A_{mm^2}$`, 'area in square millimetres')],
        'Large conductors are sized in kcmil (MCM) in American practice and mm² in metric.',
        '500 kcmil ≈ 253 mm², close to the metric 240 mm².', r`$\text{mm}^2$`),
    P(WG, null, 'Conductor Resistance per Kilometre', r`$R = \frac{17.24}{A}\ \Omega/\text{km}$`, r`$R_{Cu} = \frac{17.24}{A_{mm^2}}\ \Omega/\text{km},\qquad R_{Al} = \frac{28.3}{A_{mm^2}}\ \Omega/\text{km}\quad (20\,^\circ\text{C, DC})$`,
        [v(r`$A_{mm^2}$`, 'cross-sectional area in mm²')],
        'DC resistance of a conductor straight from its size.',
        'Correct to the operating temperature (≈ +20% at 70 °C for copper) and add skin effect for large AC conductors.', r`$\Omega/\text{km}$`),
    // Power and Energy Conversions
    P(PE, null, 'Motor Current from Horsepower', r`$I = \frac{746\,\text{hp}}{\sqrt3V\eta\,\text{pf}}$`, r`$P_{in} = \frac{746\,\text{hp}}{\eta},\qquad I_{3\phi} = \frac{746\,\text{hp}}{\sqrt3\,V_L\,\eta\,\text{pf}},\qquad I_{1\phi} = \frac{746\,\text{hp}}{V\eta\,\text{pf}}$`,
        [v(r`$\text{hp}$`, 'rated output in horsepower'), v(r`$V_L$`, 'line voltage', r`$\text{V}$`), v(r`$\eta$`, 'efficiency'), v(r`$\text{pf}$`, 'power factor')],
        'A motor\'s line current from its nameplate output, efficiency and power factor.',
        'Horsepower is OUTPUT: divide by efficiency for input. Code sizing uses the PEC table currents, not this.', r`$\text{A}$`),
    P(PE, null, 'Energy and Its Cost', r`$E = Pt,\ \text{cost} = E \times \text{rate}$`, r`$E(\text{kWh}) = P(\text{kW}) \times t(\text{h}),\qquad \text{cost} = E \times \text{rate}$`,
        [v(r`$P$`, 'average power', r`$\text{kW}$`), v(r`$t$`, 'time', r`$\text{h}$`), v(r`$\text{rate}$`, 'price per kWh')],
        'Electrical energy in kilowatt-hours and what it costs.',
        'Watch for watts vs kilowatts and minutes vs hours: 1500 W for 30 min is 0.75 kWh.', r`$\text{kWh}$`),
    P(PE, null, 'Electric Heating of Water', r`$\eta Pt = mc\Delta T$`, r`$\eta P t = m c\,\Delta T,\qquad c_{water} = 4.186\ \text{kJ/(kg·K)};\quad 1\ \text{kWh heats } 860\ \text{kg by } 1\ \text{K}$`,
        [v(r`$P$`, 'heater power', r`$\text{W}$`), v(r`$t$`, 'time', r`$\text{s}$`), v(r`$\eta$`, 'heater efficiency'), v(r`$m$`, 'mass of water (1 kg per litre)', r`$\text{kg}$`), v(r`$\Delta T$`, 'temperature rise', r`$\text{K}$`)],
        'The time or energy to heat water electrically.',
        'Keep units consistent: W × s = J, so use c in J/(kg·K) = 4186.', r`$\text{J}$`),
    P(PE, null, 'Joule Heating in Calories', r`$H = 0.24I^2Rt$`, r`$H = \frac{I^2Rt}{4.186} \approx 0.24\,I^2Rt\ \text{cal}$`,
        [v(r`$I$`, 'current', r`$\text{A}$`), v(r`$R$`, 'resistance', OHM), v(r`$t$`, 'time', r`$\text{s}$`)],
        'Heat produced by a current, in calories.',
        'One joule is 0.239 cal; one calorie is 4.186 J.', r`$\text{cal}$`),
    // Physical Constants
    K(PC, 'Electron Charge-to-Mass Ratio', r`$\frac{e}{m_e} = 1.7588 \times 10^{11}\ \text{C/kg}$`, r`$\frac{e}{m_e} = 1.758\,820 \times 10^{11}\ \text{C/kg}$`, 'How strongly fields accelerate an electron: used for electron speeds, cyclotron frequency and CRT deflection.', 'An electron through 1 V gains 1 eV: v = √(2eV/m) = 5.93 × 10⁵ m/s.'),
];

module.exports = { subject: 'EE', topic: 'Quantities/units/constants (EE)', migration: '20270111000000_cards_quantities_units_ee', file, revisions, retire, drafts };
