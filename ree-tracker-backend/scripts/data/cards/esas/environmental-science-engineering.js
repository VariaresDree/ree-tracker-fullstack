'use strict';

// ESAS › Environmental Science & Engineering formula cards (Library round,
// 2026-11-18): the topic had no cards. Chemistry for Engineers already holds
// ppm to mg/m³, BOD, hardness and CO₂ from combustion, so those aren't
// repeated. This file adds ecology's 10% rule and population growth,
// resource lifetimes, plume dispersion and emission estimates, the oxygen sag
// of a polluted river, mixing and detention, landfill sizing, radiative
// forcing and the Earth's energy balance, CO₂-equivalents, IPAT, and the
// environmental laws with their years. See mathematics/algebra.js for the
// format; tests/environmentAndResearchFormulas.test.js checks each against a
// simulation or an independent route.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const ECO = 'Nature and Ecology';
const RES = 'Natural Systems and Resources';
const CRISIS = 'Environmental Concerns and Crises';
const AIR = 'Air Pollution';
const WATER = 'Water Pollution';
const WASTE = 'Solid and Hazardous Waste';
const CLIM = 'Climate Change';
const EIA = 'Environmental Impact Assessment';
const LAWS = 'Environmental Laws (RA 8749, 9275, 9003, PD 1586)';
const SUS = 'Sustainable Development';
const CONST = 'Constants';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const drafts = [
    // Nature and Ecology
    P(ECO, null, 'Ten Percent Rule of Energy Transfer', r`$E_n = E_1(0.1)^{n-1}$`, r`$E_n \approx E_1(0.1)^{n-1}$`,
        [v(r`$E_1$`, 'energy fixed by the producers', r`$\text{kcal}$`), v(r`$n$`, 'trophic level (1 = producers)')],
        'Only about a tenth of the energy at one feeding level reaches the next; the rest is used or lost as heat.',
        'Why food chains are short and why eating lower on the chain feeds more people.', r`$\text{kcal}$`),
    // Natural Systems and Resources
    P(RES, null, 'Population Growth', r`$N = N_0e^{rt}$`, r`$\text{exponential: } N = N_0e^{rt},\ t_d = \frac{\ln 2}{r} \approx \frac{70}{r\%};\qquad \text{logistic: } \frac{dN}{dt} = rN\left(1 - \frac{N}{K}\right)$`,
        [v(r`$N_0$`, 'starting population'), v(r`$r$`, 'growth rate', r`$\text{1/yr}$`), v(r`$K$`, 'carrying capacity')],
        'How a population grows: without limit (exponential), or levelling off at what the environment can support (logistic).',
        'The rule of 70: 2% growth doubles a population in about 35 years.'),
    P(RES, null, 'Lifetime of a Resource', r`$T = \frac{1}{r}\ln\left(\frac{rR}{C_0} + 1\right)$`, r`$\text{static: } T = \frac{R}{C_0};\qquad \text{growing use: } T = \frac{1}{r}\ln\left(\frac{rR}{C_0} + 1\right)$`,
        [v(r`$R$`, 'known reserves'), v(r`$C_0$`, 'present yearly use'), v(r`$r$`, 'growth rate of use', r`$\text{1/yr}$`)],
        'How long a non-renewable reserve lasts at today\'s use, and if use keeps growing.',
        'Growing demand shortens it drastically: 100 years of reserves at 2% growth last only 55 years.', r`$\text{yr}$`),
    // Environmental Concerns and Crises
    P(CRISIS, null, 'IPAT Equation', r`$I = P \times A \times T$`, r`$I = P \times A \times T$`,
        [v(r`$P$`, 'population'), v(r`$A$`, 'affluence (consumption per person)'), v(r`$T$`, 'technology (impact per unit consumed)')],
        'Environmental impact as the product of how many people, how much each consumes, and how damaging the technology is.',
        'Halving T (cleaner technology) offsets doubling A.'),
    // Air Pollution
    P(AIR, null, 'Gaussian Plume (Ground-Level Centreline)', r`$C = \frac{Q}{\pi\sigma_y\sigma_zu}e^{-H^2/2\sigma_z^2}$`, r`$C(x, 0, 0) = \frac{Q}{\pi\sigma_y\sigma_z u}\exp\left(-\frac{H^2}{2\sigma_z^2}\right)$`,
        [v(r`$Q$`, 'emission rate', r`$\text{g/s}$`), v(r`$u$`, 'wind speed at stack height', r`$\text{m/s}$`), v(r`$\sigma_y, \sigma_z$`, 'dispersion coefficients at distance x (stability class)', r`$\text{m}$`), v(r`$H$`, 'effective stack height', r`$\text{m}$`)],
        'Ground-level pollutant concentration downwind of a stack, with the ground reflecting the plume.',
        'A taller stack lowers the ground concentration sharply through the exponential term.', r`$\text{g/m}^3$`),
    P(AIR, null, 'Emission Estimate', r`$E = A \cdot EF\left(1 - \frac{ER}{100}\right)$`, r`$E = A \times EF \times \left(1 - \frac{ER}{100}\right)$`,
        [v(r`$A$`, 'activity (fuel burned, product made)'), v(r`$EF$`, 'emission factor per unit of activity'), v(r`$ER$`, 'control efficiency', r`$\%$`)],
        'How much a source emits, from its activity and a published emission factor.',
        'Controls in series multiply what passes: two 90% devices pass 1%, not 0%.', r`$\text{kg}$`),
    // Water Pollution
    P(WATER, null, 'Streeter-Phelps Oxygen Sag', r`$D_t$`, r`$D_t = \frac{k_1L_0}{k_2 - k_1}\left(e^{-k_1t} - e^{-k_2t}\right) + D_0e^{-k_2t}$`,
        [v(r`$L_0$`, 'ultimate BOD after mixing', r`$\text{mg/L}$`), v(r`$k_1, k_2$`, 'deoxygenation and reaeration rates', r`$\text{1/day}$`), v(r`$D_0$`, 'initial oxygen deficit', r`$\text{mg/L}$`), v(r`$t$`, 'travel time downstream', r`$\text{days}$`)],
        'The dissolved-oxygen deficit downstream of a waste discharge: microbes use oxygen while the air puts it back.',
        'Critical time: t_c = ln[(k₂/k₁)(1 − D₀(k₂ − k₁)/(k₁L₀))]/(k₂ − k₁). Fish need about 5 mg/L.', r`$\text{mg/L}$`),
    P(WATER, null, 'Mixing of Two Flows', r`$C = \frac{Q_1C_1 + Q_2C_2}{Q_1 + Q_2}$`, r`$C = \frac{Q_1C_1 + Q_2C_2}{Q_1 + Q_2}$`,
        [v(r`$Q$`, 'flow rates', r`$\text{m}^3\text{/s}$`), v(r`$C$`, 'concentrations', r`$\text{mg/L}$`)],
        'The concentration just below where a wastewater discharge joins a river: a mass balance.',
        'Works for temperature too, and for BOD and DO at the outfall.', r`$\text{mg/L}$`),
    P(WATER, null, 'Detention Time and Overflow Rate', r`$t = \frac{V}{Q}$`, r`$t_d = \frac{V}{Q},\qquad v_o = \frac{Q}{A_s}$`,
        [v(r`$V$`, 'tank volume', r`$\text{m}^3$`), v(r`$Q$`, 'flow', r`$\text{m}^3\text{/day}$`), v(r`$A_s$`, 'tank surface area', r`$\text{m}^2$`)],
        'How long water stays in a treatment tank, and the settling speed a particle needs to be caught.',
        'Particles settling faster than the overflow rate are removed, whatever the tank\'s depth.', r`$\text{day}$`),
    // Solid and Hazardous Waste
    P(WASTE, null, 'Landfill Volume and Life', r`$V = \frac{M}{\rho}$`, r`$V = \frac{M}{\rho_c}(1 + \text{cover fraction}),\qquad \text{life} = \frac{\text{capacity}}{V \text{ per year}}$`,
        [v(r`$M$`, 'waste landfilled per year', r`$\text{kg}$`), v(r`$\rho_c$`, 'compacted density (about 500–800)', r`$\text{kg/m}^3$`)],
        'The space a community\'s waste takes in a landfill, and how long the landfill lasts.',
        'Waste generated = per-capita rate × population; divert recyclables and compost first (RA 9003).', r`$\text{m}^3$`),
    // Climate Change
    P(CLIM, null, 'CO2 Radiative Forcing and Warming', r`$\Delta F = 5.35\ln\frac{C}{C_0}$`, r`$\Delta F = 5.35\ln\frac{C}{C_0}\ \text{W/m}^2,\qquad \Delta T = \lambda\,\Delta F$`,
        [v(r`$C, C_0$`, 'CO₂ concentration now and before', r`$\text{ppm}$`), v(r`$\lambda$`, 'climate sensitivity, about 0.8', r`$\text{K/(W/m}^2)$`)],
        'The extra energy CO₂ traps, and the warming it brings.',
        'Doubling CO₂: 3.7 W/m², about 3 °C of eventual warming.', r`$\text{W/m}^2$`),
    P(CLIM, null, 'Earth Energy Balance', r`$T_e = \left[\frac{S(1 - \alpha)}{4\sigma}\right]^{1/4}$`, r`$T_e = \left[\frac{S(1 - \alpha)}{4\sigma}\right]^{1/4}$`,
        [v(r`$S$`, 'solar constant, 1361', r`$\text{W/m}^2$`), v(r`$\alpha$`, 'albedo, about 0.30'), v(r`$\sigma$`, 'Stefan-Boltzmann, 5.67 × 10⁻⁸', r`$\text{W/(m}^2\text{K}^4)$`)],
        'The temperature the Earth would have with no greenhouse effect.',
        'It gives 255 K (−18 °C); the real average is about 288 K. The 33 K difference is the natural greenhouse effect.', r`$\text{K}$`),
    P(CLIM, null, 'CO2 Equivalent', r`$CO_2e = \sum m_i\,GWP_i$`, r`$CO_2e = \sum_i m_i \times GWP_i$`,
        [v(r`$m_i$`, 'mass of gas i emitted', r`$\text{t}$`), v(r`$GWP_i$`, '100-year global warming potential (CO₂ 1, CH₄ about 28, N₂O about 265, IPCC AR5)')],
        'Different greenhouse gases put on one scale.',
        'GWP values are revised with each IPCC report; use the set the problem gives.', r`$\text{t}$`),
    // Environmental Impact Assessment
    K(EIA, 'Philippine EIS System', r`$\text{PD } 1586$`, r`$\text{PD } 1586\ (1978);\ \text{ECC for projects in environmentally critical areas or of critical types};\ \text{CNC if not covered}$`, 'The Environmental Impact Statement System: projects get an Environmental Compliance Certificate (ECC) from the DENR-EMB before they start.', 'The EIA weighs alternatives and mitigation and involves the public; the ECC sets conditions the project must keep.'),
    // Environmental Laws
    K(LAWS, 'Philippine Environmental Laws', r`$\text{RA } 8749$`, r`$\text{RA } 8749\ (1999) \text{ Clean Air};\ \text{RA } 9003\ (2000) \text{ Solid Waste};\ \text{RA } 9275\ (2004) \text{ Clean Water};\ \text{RA } 6969\ (1990) \text{ Toxic and Hazardous Wastes};\ \text{PD } 1586\ (1978) \text{ EIS}$`, 'The main environmental laws and the year each was enacted.', 'RA 9003 required LGUs to divert at least 25% of solid waste within 5 years and closed open dumps.'),
    // Sustainable Development
    K(SUS, 'Sustainable Development (Brundtland)', r`$1987$`, r`$1987 \text{ Brundtland Report: meeting the needs of the present without compromising future generations\' ability to meet theirs};\ 17 \text{ SDGs (2015)}$`, 'The accepted definition of sustainable development, and the UN\'s goals built on it.', 'Three pillars: environment, society, economy.'),
];

module.exports = { subject: 'ESAS', topic: 'Environmental Science & Engineering', migration: '20261223000000_cards_environmental_science_engineering', file, revisions, retire, drafts };
