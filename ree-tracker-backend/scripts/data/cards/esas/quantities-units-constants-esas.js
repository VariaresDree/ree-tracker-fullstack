'use strict';

// ESAS › Quantities/units/constants formula cards (Library round, 2026-11-18):
// the topic had no cards. Physics for Engineers already holds the
// electromagnetic and atomic constants (c, h, e, mₑ, u, ε₀, μ₀, G, g),
// Chemistry the Avogadro and Faraday constants, molar volume and R, and
// Thermodynamics Boltzmann, Stefan-Boltzmann and the ton of refrigeration, so
// those aren't repeated. This file adds the SI system itself, the prefixes,
// exact conversion factors, mechanical and thermal unit equivalents, the
// remaining particle and Earth constants, and dimensional analysis. See
// mathematics/algebra.js for the format; tests/standardsAndUnitsFormulas.test.js
// rebuilds each conversion from its definition.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SI = 'SI Base and Derived Units';
const PRE = 'Prefixes';
const CONV = 'Unit Conversion';
const MECH = 'Mechanical Quantities';
const THERM = 'Thermal Quantities';
const PHYS = 'Physical Constants';
const CHEM = 'Chemical Constants';
const DIM = 'Dimensional Analysis';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const drafts = [
    // SI Base and Derived Units
    K(SI, 'SI Base Units', r`$\text{SI}$`, r`$7 \text{ units: } \text{m (length)},\ \text{kg (mass)},\ \text{s (time)},\ \text{A (current)},\ \text{K (temperature)},\ \text{mol (amount)},\ \text{cd (luminous intensity)}$`, 'The seven units every other SI unit is built from.', 'Since 2019 all seven are fixed by exact constants (h, e, k, N_A, c, the caesium frequency, K_cd); the kilogram is no longer an artefact.'),
    K(SI, 'SI Derived Units in Base Units', r`$\text{N, J, W, V, }\Omega$`, r`$\text{N} = \text{kg·m/s}^2;\ \text{J} = \text{N·m};\ \text{W} = \text{J/s};\ \text{C} = \text{A·s};\ \text{V} = \text{W/A};\ \Omega = \text{V/A};\ \text{F} = \text{C/V};\ \text{H} = \text{Wb/A};\ \text{Wb} = \text{V·s};\ \text{T} = \text{Wb/m}^2;\ \text{S} = 1/\Omega$`, 'The named derived units and what they are made of.', 'In base units the volt is kg·m²/(s³·A) and the ohm kg·m²/(s³·A²).'),
    // Prefixes
    K(PRE, 'SI Prefixes', r`$10^{\pm 3k}$`, r`$\text{T } 10^{12},\ \text{G } 10^{9},\ \text{M } 10^{6},\ \text{k } 10^{3},\ \text{h } 10^{2},\ \text{da } 10^{1};\ \text{d } 10^{-1},\ \text{c } 10^{-2},\ \text{m } 10^{-3},\ \mu\ 10^{-6},\ \text{n } 10^{-9},\ \text{p } 10^{-12},\ \text{f } 10^{-15}$`, 'The prefixes that scale an SI unit by powers of ten.', 'Larger: P 10¹⁵, E 10¹⁸, Z 10²¹, Y 10²⁴ (and R, Q since 2022). A prefix on a squared unit is squared too: 1 cm² = 10⁻⁴ m².'),
    K(PRE, 'Binary Prefixes', r`$2^{10}$`, r`$\text{Ki} = 2^{10} = 1024;\ \text{Mi} = 2^{20};\ \text{Gi} = 2^{30};\ \text{Ti} = 2^{40}$`, 'Powers of two used for memory sizes (IEC 80000-13).', 'A "1 TB" drive holds 10¹² bytes, about 0.91 TiB.'),
    // Unit Conversion
    K(CONV, 'Length, Area and Volume Conversions', r`$1\ \text{in} = 2.54\ \text{cm}$`, r`$1\ \text{in} = 2.54\ \text{cm};\ 1\ \text{ft} = 0.3048\ \text{m};\ 1\ \text{mi} = 1.609\,344\ \text{km};\ 1\ \text{acre} = 4046.86\ \text{m}^2;\ 1\ \text{ha} = 10^4\ \text{m}^2;\ 1\ \text{US gal} = 3.785\,41\ \text{L}$`, 'The exact definitions behind the common English-to-SI conversions.', 'The inch and the foot are exact by definition (1959). 1 L = 1 dm³ = 10⁻³ m³.'),
    K(CONV, 'Force, Mass and Pressure Conversions', r`$1\ \text{lb} = 0.453\,592\,37\ \text{kg}$`, r`$1\ \text{lb} = 0.453\,592\,37\ \text{kg};\ 1\ \text{lbf} = 4.448\,22\ \text{N};\ 1\ \text{kgf} = 9.806\,65\ \text{N};\ 1\ \text{psi} = 6.894\,76\ \text{kPa};\ 1\ \text{atm} = 101.325\ \text{kPa} = 760\ \text{mmHg} = 14.696\ \text{psi};\ 1\ \text{bar} = 100\ \text{kPa}$`, 'Mass, force and pressure between systems.', 'A pound-mass weighs one pound-force under standard gravity; a kilogram weighs 9.806 65 N.'),
    // Mechanical Quantities
    P(MECH, null, 'Power from Torque and Speed', r`$P = T\omega$`, r`$P = T\omega = \frac{2\pi nT}{60};\qquad P_{\text{kW}} = \frac{T_{\text{N·m}}\,n_{\text{rpm}}}{9549};\qquad P_{\text{hp}} = \frac{T_{\text{lb·ft}}\,n_{\text{rpm}}}{5252}$`,
        [v(r`$T$`, 'torque', r`$\text{N}\cdot\text{m}$`), v(r`$\omega$`, 'angular speed', r`$\text{rad/s}$`), v(r`$n$`, 'speed', r`$\text{rpm}$`)],
        'The power a shaft carries.',
        'A motor giving 100 N·m at 1800 rpm delivers 18.85 kW.', r`$\text{W}$`),
    K(MECH, 'Power Conversions', r`$1\ \text{hp} = 745.7\ \text{W}$`, r`$1\ \text{hp} = 550\ \text{ft·lbf/s} = 745.7\ \text{W};\ 1\ \text{metric hp (PS)} = 735.5\ \text{W};\ 1\ \text{kW} = 1.341\ \text{hp}$`, 'Horsepower in watts.', 'Motor nameplates in the Philippines use hp (745.7 W) or kW; boilers use boiler horsepower (9.81 kW).'),
    // Thermal Quantities
    K(THERM, 'Energy and Heat Conversions', r`$1\ \text{BTU} = 1055.06\ \text{J}$`, r`$1\ \text{cal} = 4.184\ \text{J};\ 1\ \text{BTU} = 1055.06\ \text{J};\ 1\ \text{kWh} = 3.6\ \text{MJ} = 3412\ \text{BTU};\ 1\ \text{therm} = 10^5\ \text{BTU};\ 1\ \text{eV} = 1.602 \times 10^{-19}\ \text{J}$`, 'Energy and heat units in joules.', 'The food Calorie is a kilocalorie. The International Table calorie is 4.1868 J, the thermochemical 4.184 J.'),
    P(THERM, null, 'Temperature Differences', r`$\Delta T_K = \Delta T_C$`, r`$\Delta T_{\text{K}} = \Delta T_{^\circ\text{C}};\qquad \Delta T_{^\circ\text{F}} = \Delta T_{^\circ\text{R}} = 1.8\,\Delta T_{^\circ\text{C}}$`,
        [v(r`$\Delta T$`, 'a temperature CHANGE')],
        'A temperature difference converts by the scale factor alone, with no offset.',
        'A 10 °C rise is a 10 K rise and an 18 °F rise. Specific heats per K and per °C are the same number.'),
    // Physical Constants
    K(PHYS, 'Proton and Neutron Masses', r`$m_p,\ m_n$`, r`$m_p = 1.672\,62 \times 10^{-27}\ \text{kg};\ m_n = 1.674\,93 \times 10^{-27}\ \text{kg};\ \frac{m_p}{m_e} = 1836.15$`, 'The masses of the nucleons.', 'Both are about 1 u (1.66 × 10⁻²⁷ kg); the neutron is slightly heavier.'),
    K(PHYS, 'Earth Constants', r`$R_E,\ M_E$`, r`$R_E = 6371\ \text{km (mean)};\ M_E = 5.972 \times 10^{24}\ \text{kg};\ \text{sea-level air } \rho \approx 1.225\ \text{kg/m}^3;\ 1\ \text{atm} = 101.325\ \text{kPa}$`, 'The Earth\'s size and mass, and standard sea-level air.', 'g at the surface follows from GM_E/R_E² ≈ 9.82 m/s².'),
    // Chemical Constants
    K(CHEM, 'Standard Reference Conditions', r`$\text{STP, SATP, NTP}$`, r`$\text{STP: } 0\,^\circ\text{C}, 1\ \text{atm} \text{ (IUPAC since 1982: 100 kPa)};\ \text{SATP: } 25\,^\circ\text{C}, 100\ \text{kPa};\ \text{NTP: } 20\,^\circ\text{C}, 1\ \text{atm}$`, 'The temperature and pressure that "standard" means in each convention.', 'Always check which: the molar volume is 22.414 L at 0 °C and 1 atm, 22.711 L at 0 °C and 100 kPa, 24.79 L at SATP.'),
    K(CHEM, 'Atomic Masses of Common Elements', r`$A$`, r`$\text{H } 1.008;\ \text{C } 12.011;\ \text{N } 14.007;\ \text{O } 15.999;\ \text{Al } 26.982;\ \text{S } 32.06;\ \text{Fe } 55.845;\ \text{Cu } 63.546\ \text{g/mol}$`, 'Standard atomic weights used in engineering chemistry.', 'Water 18.015 g/mol; dry air about 28.97 g/mol.'),
    // Dimensional Analysis
    P(DIM, null, 'Dimensional Homogeneity', r`$[A] = [B]$`, r`$\text{every term of a valid equation has the same dimensions } [M^aL^bT^cI^d\Theta^e]$`,
        [v(r`$M, L, T, I, \Theta$`, 'mass, length, time, current, temperature')],
        'Terms can be added or equated only if their dimensions match: a quick check on any formula.',
        'Arguments of exp, ln and sin must be dimensionless. Force [MLT⁻²], energy [ML²T⁻²], power [ML²T⁻³].'),
    P(DIM, null, 'Buckingham Pi Theorem', r`$\pi = n - k$`, r`$\text{number of dimensionless groups} = n - k$`,
        [v(r`$n$`, 'number of variables in the problem'), v(r`$k$`, 'number of fundamental dimensions they involve')],
        'How many dimensionless groups describe a physical relation.',
        'A pendulum\'s period, length, gravity and mass: 4 variables, 3 dimensions, 1 group T√(g/L); the mass drops out.'),
];

module.exports = { subject: 'ESAS', topic: 'Quantities/units/constants (ESAS)', migration: '20261221000001_cards_quantities_units_constants_esas', file, revisions, retire, drafts };
