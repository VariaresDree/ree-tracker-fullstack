'use strict';

// ESAS › Basic Thermodynamics formula cards (Library round, 2026-11-17): 7
// live cards (four of them constants) for 10 subtopics. Physics for Engineers
// holds sensible and latent heat, calorimetry, heat transfer and temperature
// scales, and Chemistry for Engineers the combined and molar gas laws, so this
// file adds the engineering thermodynamics: energy balances, ideal-gas
// processes, steam properties, the second law, and the Carnot, Otto, Diesel,
// Brayton and Rankine cycles. Formula cards carry SI units. See
// mathematics/algebra.js for the format; tests/thermodynamicsFormulas.test.js
// checks each by an independent route: integrating p dV and dQ/T along the
// path, running whole cycles state by state, and path-independence of entropy.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const BASIC = 'Basic Principles, Concepts and Definitions';
const FIRST = 'First Law of Thermodynamics';
const GAS = 'Ideal Gas Laws';
const PROC = 'Processes of Ideal Gases';
const PURE = 'Properties of Pure Substances';
const PPROC = 'Processes of Pure Substances';
const SECOND = 'Second Law and Entropy';
const CARNOT = 'Carnot Cycle';
const GCYC = 'Gas Cycles (Otto, Diesel, Brayton)';
const VCYC = 'Vapor Cycles (Rankine)';
const CONST = 'Constants';

const file = [
    ['c81f1641-9bd9-436a-b511-a0f4fede4fb0', BASIC, CONST], // Boltzmann Constant
    ['8ff51ad1-1318-4f0b-9dd7-93b4c66673f8', BASIC, CONST], // Stefan-Boltzmann Constant
    ['22eb80e1-6cd1-4f53-835f-cea5c8121639', PURE, CONST], // Specific Heat Capacity of Liquid Water
    ['f372d63f-96c5-452e-af03-5715e19c6f68', FIRST, null], // Enthalpy
    ['c66ee702-e72d-4c11-8308-b7567c78ec0f', GAS, null], // Ideal Gas Equation of State
    ['52ad4c66-c78b-4caa-9778-625b46e1efdc', GAS, CONST], // Universal Gas Constant
    ['39821d63-cbec-4933-a5f8-1c51dc45aed1', CARNOT, null], // Carnot Cycle Thermal Efficiency
];

const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });
const K = (subtopic, name, symbol, value, d, tip) => ({ kind: 'constant', subtopic, group: CONST, name, symbol, value, vars: [], d, tip, dim: false });

const KJKG = r`$\text{kJ/kg}$`;
const M = v(r`$m$`, 'mass', r`$\text{kg}$`);
const MD = v(r`$\dot{m}$`, 'mass flow rate', r`$\text{kg/s}$`);
const HH = v(r`$h$`, 'specific enthalpy', KJKG);
const CP = v(r`$c_p$`, 'specific heat at constant pressure', r`$\text{kJ/(kg}\cdot\text{K)}$`);
const CV = v(r`$c_v$`, 'specific heat at constant volume', r`$\text{kJ/(kg}\cdot\text{K)}$`);
const KK = v(r`$k$`, r`ratio of specific heats, $c_p/c_v$ (1.4 for air)`);
const T_ = v(r`$T$`, 'absolute temperature', r`$\text{K}$`);
const R_ = v(r`$R$`, 'specific gas constant (air 0.287)', r`$\text{kJ/(kg}\cdot\text{K)}$`);
const TH = v(r`$T_H, T_L$`, 'absolute temperatures of the hot and cold reservoirs', r`$\text{K}$`);

const drafts = [
    // Basic Principles
    P(BASIC, null, 'Thermal Efficiency and Heat Rate', r`$\eta_{th}$`, r`$\eta_{th} = \frac{W_{net}}{Q_{in}},\qquad \text{heat rate} = \frac{3600}{\eta_{th}}\ \text{kJ/kWh}$`,
        [v(r`$W_{net}$`, 'net work out', r`$\text{kJ}$`), v(r`$Q_{in}$`, 'heat supplied', r`$\text{kJ}$`)],
        'The share of the heat supplied that comes out as work; power plants quote its inverse as heat rate.',
        '1 kWh = 3600 kJ, so 36% efficiency is a heat rate of 10,000 kJ/kWh.'),
    P(BASIC, null, 'Flow Work', r`$W_f$`, r`$W_f = pV,\qquad w_f = pv$`,
        [v(r`$p$`, 'absolute pressure', r`$\text{kPa}$`), v(r`$V$`, 'volume pushed across the boundary', r`$\text{m}^3$`)],
        'The work needed to push fluid into or out of a control volume; enthalpy includes it.',
        'kPa × m³ = kJ.', r`$\text{kJ}$`),
    K(BASIC, 'Properties of Air', r`$c_p, c_v, k$`, r`$c_p = 1.005,\ c_v = 0.718\ \text{kJ/(kg}\cdot\text{K)},\ k = 1.4,\ R = 0.287\ \text{kJ/(kg}\cdot\text{K)}$`,
        'Air as an ideal gas at room temperature: the values every gas-cycle problem uses.', r`$c_p - c_v = R$ and $\frac{c_p}{c_v} = k$.`),
    // First Law
    P(FIRST, null, 'First Law for a Closed System', r`$Q - W = \Delta U$`, r`$Q - W = \Delta U = m(u_2 - u_1)$`,
        [v(r`$Q$`, 'heat added', r`$\text{kJ}$`), v(r`$W$`, 'work done BY the system', r`$\text{kJ}$`), M],
        'Energy is conserved: heat in minus work out raises the internal energy.',
        'Sign convention: heat into the system and work done by it are positive.', r`$\text{kJ}$`),
    P(FIRST, null, 'Steady-Flow Energy Equation', r`$Q - W$`, r`$\dot{Q} - \dot{W} = \dot{m}\left[(h_2 - h_1) + \frac{v_2^2 - v_1^2}{2000} + \frac{g(z_2 - z_1)}{1000}\right]$`,
        [MD, HH, v(r`$v$`, 'velocity', r`$\text{m/s}$`), v(r`$z$`, 'elevation', r`$\text{m}$`)],
        'Energy balance for turbines, compressors, boilers, nozzles and pumps running steadily.',
        'The 1000s turn J/kg into kJ/kg; kinetic and potential terms are often negligible.', r`$\text{kW}$`),
    P(FIRST, null, 'Boundary Work', r`$W = \int p\,dV$`, r`$W = \int_{V_1}^{V_2} p\,dV$`,
        [v(r`$p$`, 'pressure', r`$\text{kPa}$`), v(r`$V$`, 'volume', r`$\text{m}^3$`)],
        'Work done by a moving boundary: the area under the process on a p-V diagram.',
        'It depends on the path, not just the end states.', r`$\text{kJ}$`),
    P(FIRST, null, 'Turbine, Compressor and Pump Work', r`$\dot{W}$`, r`$\dot{W}_{turbine} = \dot{m}(h_1 - h_2),\qquad \dot{W}_{compressor} = \dot{m}(h_2 - h_1)\quad \text{(adiabatic)}$`,
        [MD, HH],
        'The steady-flow energy equation for machines with no heat loss and small velocity changes.',
        'A pump on a liquid: w = v(p₂ − p₁).', r`$\text{kW}$`),
    P(FIRST, null, 'Nozzle Exit Velocity', r`$v_2$`, r`$v_2 = \sqrt{2(h_1 - h_2)\times1000 + v_1^2} \approx 44.72\sqrt{h_1 - h_2}$`,
        [HH, v(r`$v_1$`, 'inlet velocity (negligible in the short form)', r`$\text{m/s}$`)],
        'A nozzle turns an enthalpy drop into speed.',
        'With Δh in kJ/kg: 100 kJ/kg gives 447 m/s.', r`$\text{m/s}$`),
    P(FIRST, null, 'Throttling Process', r`$h_1 = h_2$`, r`$h_1 = h_2$`,
        [HH],
        'Flow through a valve or porous plug: no work, no heat, so the enthalpy stays the same.',
        'For an ideal gas the temperature is unchanged too; for steam or a refrigerant it drops.', KJKG),
    // Ideal Gas Laws
    P(GAS, null, 'Specific Gas Constant', r`$R$`, r`$R = \frac{R_u}{M}$`,
        [v(r`$R_u$`, 'universal gas constant, 8.314', r`$\text{kJ/(kmol}\cdot\text{K)}$`), v(r`$M$`, 'molar mass', r`$\text{kg/kmol}$`)],
        'A particular gas\'s constant per kilogram.',
        'Air (M = 28.97): 0.287 kJ/kg·K; steam: 0.4615.', r`$\text{kJ/(kg}\cdot\text{K)}$`),
    P(GAS, null, 'Specific Heat Relations', r`$c_p - c_v = R$`, r`$c_p - c_v = R,\qquad k = \frac{c_p}{c_v},\qquad c_v = \frac{R}{k - 1},\qquad c_p = \frac{kR}{k - 1}$`,
        [CP, CV, R_, KK],
        'How the two specific heats of an ideal gas are tied to its gas constant.',
        'Monatomic gases (He, Ar) have k = 1.67.', r`$\text{kJ/(kg}\cdot\text{K)}$`),
    P(GAS, null, 'Internal Energy and Enthalpy of an Ideal Gas', r`$\Delta U$`, r`$\Delta U = mc_v\Delta T,\qquad \Delta H = mc_p\Delta T$`,
        [M, CV, CP, v(r`$\Delta T$`, 'temperature change', r`$\text{K}$`)],
        'An ideal gas\'s internal energy and enthalpy depend on temperature only, whatever the process.',
        'Use c_v for ΔU even in a constant-pressure process.', r`$\text{kJ}$`),
    P(GAS, null, 'Ideal Gas Mixtures', r`$p_i = y_ip$`, r`$p_i = y_ip\ \text{(Dalton)},\qquad R_{mix} = \frac{\sum m_iR_i}{m},\qquad c_{p,mix} = \frac{\sum m_ic_{p,i}}{m}$`,
        [v(r`$y_i$`, 'mole fraction of gas i'), v(r`$m_i$`, 'mass of gas i', r`$\text{kg}$`)],
        'Each gas in a mixture behaves as if alone, at its own partial pressure.',
        'Mole fractions and volume fractions are the same for ideal gases (Amagat).', r`$\text{kPa}$`),
    // Processes of Ideal Gases
    P(PROC, null, 'Constant-Pressure Process', r`$W = p\Delta V$`, r`$W = p(V_2 - V_1) = mR(T_2 - T_1),\qquad Q = mc_p(T_2 - T_1)$`,
        [M, R_, CP],
        'Heating or cooling at fixed pressure (isobaric): the volume follows the temperature.',
        r`$\frac{V_2}{V_1} = \frac{T_2}{T_1}$ (Charles).`, r`$\text{kJ}$`),
    P(PROC, null, 'Constant-Volume Process', r`$Q = mc_v\Delta T$`, r`$W = 0,\qquad Q = \Delta U = mc_v(T_2 - T_1)$`,
        [M, CV],
        'Heating in a rigid tank (isochoric): no boundary work, all heat goes to internal energy.',
        r`$\frac{p_2}{p_1} = \frac{T_2}{T_1}$.`, r`$\text{kJ}$`),
    P(PROC, null, 'Isothermal Process', r`$W = Q$`, r`$W = Q = p_1V_1\ln\frac{V_2}{V_1} = mRT\ln\frac{p_1}{p_2}$`,
        [v(r`$p_1V_1$`, 'initial pressure × volume', r`$\text{kJ}$`), v(r`$V_2/V_1$`, 'volume ratio')],
        'Expansion or compression at constant temperature: heat in equals work out.',
        r`$p_1V_1 = p_2V_2$ (Boyle); ΔU = 0.`, r`$\text{kJ}$`),
    P(PROC, null, 'Isentropic Process', r`$pV^k = C$`, r`$pV^k = C,\quad \frac{T_2}{T_1} = \left(\frac{p_2}{p_1}\right)^{\frac{k-1}{k}} = \left(\frac{V_1}{V_2}\right)^{k-1},\quad W = \frac{p_2V_2 - p_1V_1}{1 - k}$`,
        [KK, v(r`$p, V, T$`, 'pressure, volume, absolute temperature')],
        'Reversible adiabatic: no heat, no friction; the ideal for turbines, compressors and nozzles.',
        'Q = 0 and ΔS = 0; W = −ΔU = mc_v(T₁ − T₂).', r`$\text{kJ}$`),
    P(PROC, null, 'Polytropic Process', r`$pV^n = C$`, r`$pV^n = C,\quad W = \frac{p_2V_2 - p_1V_1}{1 - n},\quad Q = mc_n(T_2 - T_1),\ c_n = c_v\frac{k - n}{1 - n}$`,
        [v(r`$n$`, 'polytropic exponent'), KK, CV],
        'The general process: n = 0 constant pressure, 1 isothermal, k isentropic, ∞ constant volume.',
        'Between 1 and k the gas loses heat while being compressed (real compressors).', r`$\text{kJ}$`),
    P(PROC, null, 'Entropy Change of an Ideal Gas', r`$\Delta s$`, r`$\Delta s = c_p\ln\frac{T_2}{T_1} - R\ln\frac{p_2}{p_1} = c_v\ln\frac{T_2}{T_1} + R\ln\frac{v_2}{v_1}$`,
        [CP, CV, R_, T_],
        'Entropy change between two states of an ideal gas, by any path.',
        'Zero for an isentropic process; use absolute T and p.', r`$\text{kJ/(kg}\cdot\text{K)}$`),
    // Properties of Pure Substances
    P(PURE, null, 'Quality of a Wet Mixture', r`$x$`, r`$x = \frac{m_g}{m};\qquad v = v_f + xv_{fg},\ h = h_f + xh_{fg},\ s = s_f + xs_{fg}$`,
        [v(r`$x$`, 'quality: mass fraction of vapour, 0 to 1'), v(r`$f, g, fg$`, 'saturated liquid, vapour, and the difference')],
        'Properties of a liquid-vapour mixture from the saturation tables.',
        'Moisture content is 1 − x. Quality means nothing outside the dome.', KJKG),
    P(PURE, null, 'Degrees of Superheat and Subcooling', r`$\Delta T_{sh}$`, r`$\Delta T_{sh} = T - T_{sat}(p)\ \text{(vapour)},\qquad \Delta T_{sc} = T_{sat}(p) - T\ \text{(liquid)}$`,
        [v(r`$T_{sat}(p)$`, 'saturation temperature at the pressure', r`$^\circ\text{C}$`)],
        'How far a vapour is above, or a liquid below, its boiling point at that pressure.',
        'Compare T with T_sat first to know which table to use.', r`$^\circ\text{C}$`),
    P(PURE, null, 'Compressed Liquid Approximation', r`$h \approx h_f(T)$`, r`$v \approx v_f(T),\quad u \approx u_f(T),\quad h \approx h_f(T) + v_f(T)\,[p - p_{sat}(T)]$`,
        [v(r`$T$`, 'temperature', r`$^\circ\text{C}$`), v(r`$p$`, 'pressure', r`$\text{kPa}$`)],
        'A compressed liquid behaves like saturated liquid at the same TEMPERATURE.',
        'Take the values at the temperature, not the pressure.', KJKG),
    K(PURE, 'Saturated Water at 101.325 kPa', r`$T_{sat}$`, r`$T_{sat} = 100\,^\circ\text{C},\ h_f = 419.0,\ h_{fg} = 2257.0,\ h_g = 2676.1\ \text{kJ/kg}$`,
        'Steam-table values for boiling water at standard atmospheric pressure.', r`$h_g = h_f + h_{fg}$; at 1 atm, 1 kg of water needs 2257 kJ to boil away.`),
    // Processes of Pure Substances
    P(PPROC, null, 'Heating at Constant Pressure or Volume', r`$Q$`, r`$\text{constant pressure: } Q = m(h_2 - h_1);\qquad \text{rigid tank: } Q = m(u_2 - u_1)$`,
        [M, HH, v(r`$u$`, 'specific internal energy', KJKG)],
        'Heat added to steam or a refrigerant, from the tables.',
        'In a rigid tank v stays constant: find state 2 from v and the new p or T.', r`$\text{kJ}$`),
    P(PPROC, null, 'Isentropic Expansion of Steam', r`$x_2$`, r`$s_2 = s_1 \Rightarrow x_2 = \frac{s_1 - s_{f2}}{s_{fg2}},\qquad h_2 = h_{f2} + x_2h_{fg2}$`,
        [v(r`$s$`, 'specific entropy', r`$\text{kJ/(kg}\cdot\text{K)}$`), HH],
        'The ideal end state of steam leaving a turbine.',
        'If x₂ > 1, state 2 is superheated: use the superheat table at p₂ and s₁.', KJKG),
    P(PPROC, null, 'Throttling Calorimeter', r`$x_1$`, r`$h_1 = h_2 \Rightarrow x_1 = \frac{h_2 - h_{f1}}{h_{fg1}}$`,
        [v(r`$h_2$`, 'enthalpy of the superheated steam after the throttle', KJKG)],
        'Finding the quality of wet steam by throttling it into the superheat region.',
        'It works only if the steam is nearly dry (x above about 0.95).'),
    // Second Law and Entropy
    P(SECOND, null, 'Heat Engine Efficiency', r`$\eta$`, r`$\eta = \frac{W}{Q_H} = 1 - \frac{Q_L}{Q_H}$`,
        [v(r`$Q_H, Q_L$`, 'heat from the source, heat to the sink', r`$\text{kJ}$`)],
        'Any engine must reject some heat (Kelvin-Planck): its efficiency is below 1.',
        'No real engine beats the Carnot efficiency between the same temperatures.'),
    P(SECOND, null, 'Refrigerator and Heat Pump COP', r`$COP$`, r`$COP_R = \frac{Q_L}{W},\qquad COP_{HP} = \frac{Q_H}{W} = COP_R + 1$`,
        [v(r`$Q_L$`, 'heat removed from the cold space', r`$\text{kW}$`), v(r`$W$`, 'work input', r`$\text{kW}$`)],
        'How much cooling or heating each unit of work buys.',
        'COP is usually above 1; efficiency is not the right word here.'),
    P(SECOND, null, 'Entropy Change', r`$\Delta S$`, r`$\Delta S = \int\frac{\delta Q_{rev}}{T};\qquad \text{reversible isothermal: } \Delta S = \frac{Q}{T}$`,
        [v(r`$Q$`, 'heat', r`$\text{kJ}$`), T_],
        'Entropy grows with heat added divided by the temperature at which it enters.',
        'Melting 1 kg of ice at 273 K: 334/273 = 1.22 kJ/K.', r`$\text{kJ/K}$`),
    P(SECOND, null, 'Entropy Change of a Solid or Liquid', r`$\Delta S$`, r`$\Delta S = mc\ln\frac{T_2}{T_1}$`,
        [M, v(r`$c$`, 'specific heat', r`$\text{kJ/(kg}\cdot\text{K)}$`), T_],
        'Entropy change of an incompressible substance heated or cooled.',
        'In a mixing problem the hot body loses entropy, the cold gains more: the total rises.', r`$\text{kJ/K}$`),
    P(SECOND, null, 'Entropy Generation', r`$S_{gen}$`, r`$S_{gen} = \Delta S_{sys} + \Delta S_{surr} \ge 0;\qquad \oint\frac{\delta Q}{T} \le 0\ \text{(Clausius)}$`,
        [v(r`$\Delta S$`, 'entropy changes', r`$\text{kJ/K}$`)],
        'Every real process creates entropy; only a reversible one creates none.',
        'A negative S_gen means the process is impossible.', r`$\text{kJ/K}$`),
    K(SECOND, 'Ton of Refrigeration', r`$\text{TR}$`, r`$1\ \text{TR} = 3.517\ \text{kW} = 12\,000\ \text{Btu/h} = 211\ \text{kJ/min}$`,
        'The cooling rate of melting one short ton of ice in a day.', 'A 2 TR air conditioner removes about 7 kW of heat.'),
    // Carnot Cycle
    P(CARNOT, null, 'Carnot Heat Ratio', r`$\frac{Q_H}{Q_L}$`, r`$\frac{Q_H}{Q_L} = \frac{T_H}{T_L}$`,
        [v(r`$Q_H, Q_L$`, 'heat taken in and rejected', r`$\text{kJ}$`), TH],
        'In a reversible cycle the heats are in the ratio of the absolute temperatures.',
        'This is what defines the absolute temperature scale.'),
    P(CARNOT, null, 'Carnot Refrigerator and Heat Pump', r`$COP_{max}$`, r`$COP_{R,\max} = \frac{T_L}{T_H - T_L},\qquad COP_{HP,\max} = \frac{T_H}{T_H - T_L}$`,
        [TH],
        'The best possible COP between two temperatures.',
        'The closer the temperatures, the higher the COP.'),
    // Gas Cycles
    P(GCYC, null, 'Otto Cycle Efficiency', r`$\eta_{Otto}$`, r`$\eta_{Otto} = 1 - \frac{1}{r^{k-1}},\qquad r = \frac{V_1}{V_2}$`,
        [v(r`$r$`, 'compression ratio'), KK],
        'Ideal spark-ignition engine: heat added at constant volume.',
        'r = 8, k = 1.4: 56.5%. Knock limits r in petrol engines.'),
    P(GCYC, null, 'Diesel Cycle Efficiency', r`$\eta_{Diesel}$`, r`$\eta_{Diesel} = 1 - \frac{1}{r^{k-1}}\cdot\frac{r_c^k - 1}{k(r_c - 1)},\qquad r_c = \frac{V_3}{V_2}$`,
        [v(r`$r$`, 'compression ratio'), v(r`$r_c$`, 'cutoff ratio'), KK],
        'Ideal compression-ignition engine: heat added at constant pressure.',
        'At the same r it is less efficient than Otto, but diesels run much higher r.'),
    P(GCYC, null, 'Brayton Cycle Efficiency', r`$\eta_{Brayton}$`, r`$\eta_{Brayton} = 1 - \frac{1}{r_p^{(k-1)/k}},\qquad r_p = \frac{p_2}{p_1}$`,
        [v(r`$r_p$`, 'pressure ratio'), KK],
        'Ideal gas-turbine cycle: compression, constant-pressure heating, expansion.',
        r`Back-work ratio $\frac{W_c}{W_t}$ is large (40–80%). For most net work, $r_p = \left(\frac{T_{\max}}{T_{\min}}\right)^{\frac{k}{2(k-1)}}$.`),
    P(GCYC, null, 'Mean Effective Pressure', r`$MEP$`, r`$MEP = \frac{W_{net}}{V_d} = \frac{W_{net}}{V_1 - V_2}$`,
        [v(r`$W_{net}$`, 'net work per cycle', r`$\text{kJ}$`), v(r`$V_d$`, 'displacement volume', r`$\text{m}^3$`)],
        'The steady pressure that, acting over the whole stroke, would do the cycle\'s net work.',
        r`Engine power $= MEP \cdot V_d \cdot \frac{N}{2}$ for a four-stroke ($N$ in rev/s).`, r`$\text{kPa}$`),
    // Vapor Cycles
    P(VCYC, null, 'Rankine Cycle Efficiency', r`$\eta_{Rankine}$`, r`$\eta = \frac{(h_1 - h_2) - (h_4 - h_3)}{h_1 - h_4}$`,
        [v(r`$h_1$`, 'turbine inlet', KJKG), v(r`$h_2$`, 'turbine exit', KJKG), v(r`$h_3$`, 'condenser exit (saturated liquid)', KJKG), v(r`$h_4$`, 'pump exit', KJKG)],
        'The steam power plant cycle: pump, boiler, turbine, condenser.',
        'Raise boiler pressure and superheat, or lower condenser pressure, to raise η.'),
    P(VCYC, null, 'Feed Pump Work', r`$w_p$`, r`$w_p = v_f(p_{high} - p_{low})$`,
        [v(r`$v_f$`, 'specific volume of the liquid (≈ 0.001)', r`$\text{m}^3\text{/kg}$`), v(r`$p$`, 'pressures', r`$\text{kPa}$`)],
        'The small work to pump liquid water up to boiler pressure.',
        'kPa × m³/kg = kJ/kg. Typically only 1–2% of the turbine work.', KJKG),
    P(VCYC, null, 'Steam Rate', r`$SR$`, r`$SR = \frac{3600}{w_{net}}\ \text{kg/kWh}$`,
        [v(r`$w_{net}$`, 'net work per kg of steam', KJKG)],
        'Mass of steam needed per kilowatt-hour of net output.',
        'With heat rate = 3600/η, the two numbers describe a plant\'s performance.'),
    P(VCYC, null, 'Isentropic Efficiency of Turbines and Compressors', r`$\eta_t$`, r`$\eta_t = \frac{h_1 - h_2}{h_1 - h_{2s}},\qquad \eta_c = \frac{h_{2s} - h_1}{h_2 - h_1}$`,
        [v(r`$h_{2s}$`, 'exit enthalpy for an isentropic process', KJKG), HH],
        'How close a real turbine or compressor comes to the ideal.',
        'The turbine\'s actual work is LESS than ideal; the compressor\'s needed work is MORE.'),
    P(VCYC, null, 'Open Feedwater Heater', r`$y$`, r`$y = \frac{h_{f,\,heater} - h_{in}}{h_{bleed} - h_{in}}$`,
        [v(r`$y$`, 'fraction of steam bled from the turbine'), v(r`$h_{in}$`, 'enthalpy of the feedwater entering', KJKG), v(r`$h_{bleed}$`, 'enthalpy of the bled steam', KJKG)],
        'In a regenerative cycle, the share of steam bled to heat the feedwater to saturation.',
        'Regeneration raises efficiency by heating the water nearer the boiler temperature.'),
];

module.exports = { subject: 'ESAS', topic: 'Basic Thermodynamics', migration: '20261216000000_cards_basic_thermodynamics', file, revisions, retire, drafts };
