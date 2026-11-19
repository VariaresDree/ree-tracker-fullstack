'use strict';

// EE › Power Plant Engineering formula cards (Library round, 2026-11-19): the
// topic had no cards. Cycle formulas (Rankine, Brayton, Diesel, steam rate,
// heat rate) are in ESAS › Basic Thermodynamics, and solar fill factor and
// wind power in ESAS › Chemistry for Engineers, so this file stays at plant
// level: plant capacity, use and reserve; station efficiency, fuel from heat
// rate, boiler efficiency and condenser water; hydro power, net head, turbine
// choice by specific speed, Pelton speeds, reservoir energy and pumped
// storage; engine indicated power, efficiencies and specific fuel
// consumption; the gas turbine's best pressure ratio and combined cycles;
// geothermal flashing and output; uranium burned and reactivity; PV
// temperature derating, array and battery sizing; Betz, tip-speed ratio and
// wind shear; biomass output and wet heating value; cost per kWh, two-part
// tariff and break-even hours; auxiliary power and station service. See
// mathematics/algebra.js for the format; tests/powerPlantFormulas.test.js
// checks each numerically.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const LOAD = 'Load Curves and Plant Factors';
const STEAM = 'Steam Plants';
const HYDRO = 'Hydroelectric Plants';
const DIESEL = 'Diesel Plants';
const GT = 'Gas Turbine and Combined Cycle';
const GEO = 'Geothermal Plants';
const NUC = 'Nuclear Plants';
const PV = 'Solar PV';
const WIND = 'Wind';
const BIO = 'Biomass';
const ECON = 'Plant Economics';
const AUX = 'Plant Auxiliaries';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const KW = r`$\text{kW}$`;
const KWH = r`$\text{kWh}$`;
const M_ = r`$\text{m}$`;
const HKJ = r`$\text{kJ/kg}$`;

const drafts = [
    // Load Curves and Plant Factors
    P(LOAD, null, 'Plant Capacity and Use Factors', r`$\text{CF} = \frac{E}{P_{rated}T}$`, r`$\text{CF} = \frac{E}{P_{rated}\,T},\qquad \text{use factor} = \frac{E}{P_{rated}\,t_{run}}$`,
        [v(r`$E$`, 'energy generated in the period', KWH), v(r`$P_{rated}$`, 'installed capacity', KW), v(r`$T$`, 'hours in the period (8760 a year)', r`$\text{h}$`), v(r`$t_{run}$`, 'hours the plant actually ran', r`$\text{h}$`)],
        'How much a plant produces against what it could at full output: over all hours (capacity factor) and over the hours it ran (use factor).',
        'Use factor ≥ capacity factor; they are equal for a plant that never stops.'),
    P(LOAD, null, 'Capacity Factor from Load and Utilization', r`$\text{CF} = \text{LF} \times \frac{P_{peak}}{P_{rated}}$`, r`$\text{CF} = \text{LF} \times \frac{P_{peak}}{P_{rated}}$`,
        [v(r`$\text{LF}$`, 'load factor'), v(r`$P_{peak}$`, 'peak demand on the plant', KW), v(r`$P_{rated}$`, 'installed capacity', KW)],
        'Capacity factor is load factor scaled by how much of the plant the peak uses.',
        'The difference between installed capacity and peak is reserve.'),
    P(LOAD, null, 'Reserve Margin', r`$\text{RM} = \frac{P_{inst} - P_{peak}}{P_{peak}}$`, r`$\text{reserve} = P_{inst} - P_{peak},\qquad \text{RM} = \frac{P_{inst} - P_{peak}}{P_{peak}} \times 100\%$`,
        [v(r`$P_{inst}$`, 'installed (or dependable) capacity', KW), v(r`$P_{peak}$`, 'system peak demand', KW)],
        'Spare capacity above the peak, kept for outages, maintenance and forecast error.',
        'Use dependable capacity, not nameplate, for a meaningful margin.'),
    // Steam Plants
    P(STEAM, null, 'Overall Station Efficiency', r`$\eta = \eta_b\eta_c\eta_m\eta_g$`, r`$\eta_{overall} = \eta_{boiler}\,\eta_{cycle}\,\eta_{mech}\,\eta_{gen},\qquad \text{HR} = \frac{3600}{\eta_{overall}}\ \text{kJ/kWh}$`,
        [v(r`$\eta_{boiler}$`, 'boiler efficiency'), v(r`$\eta_{cycle}$`, 'thermal (cycle) efficiency'), v(r`$\eta_{mech}, \eta_{gen}$`, 'turbine mechanical and generator efficiencies')],
        'The fuel-to-busbar efficiency of a thermal plant: the product of every stage.',
        'Typical coal plants: 33–40% overall, a heat rate of about 9000–11,000 kJ/kWh.'),
    P(STEAM, null, 'Fuel Consumption from Heat Rate', r`$\dot m_f = \frac{P\cdot\text{HR}}{\text{HV}}$`, r`$\dot m_f = \frac{P \cdot \text{HR}}{\text{HV}}$`,
        [v(r`$P$`, 'electrical output', KW), v(r`$\text{HR}$`, 'heat rate', r`$\text{kJ/kWh}$`), v(r`$\text{HV}$`, 'heating value of the fuel', HKJ)],
        'How much fuel per hour a plant burns at a given output.',
        'Use the heating value basis (HHV or LHV) the heat rate was quoted on.', r`$\text{kg/h}$`),
    P(STEAM, null, 'Boiler Efficiency', r`$\eta_b = \frac{m_s(h_s - h_{fw})}{m_f\,\text{HV}}$`, r`$\eta_b = \frac{\dot m_s(h_s - h_{fw})}{\dot m_f\,\text{HV}}$`,
        [v(r`$\dot m_s$`, 'steam flow', r`$\text{kg/s}$`), v(r`$h_s, h_{fw}$`, 'enthalpy of steam leaving and feedwater entering', HKJ), v(r`$\dot m_f$`, 'fuel flow', r`$\text{kg/s}$`), v(r`$\text{HV}$`, 'heating value', HKJ)],
        'The share of the fuel\'s heat that ends up in the steam.',
        'Factor of evaporation divides the same heat by 2257 kJ/kg (from and at 100 °C).'),
    P(STEAM, null, 'Condenser Cooling Water', r`$\dot m_w = \frac{\dot Q}{c_p\Delta T}$`, r`$\dot m_w = \frac{\dot Q_{rej}}{c_p\Delta T},\qquad \dot Q_{rej} = \dot m_s(h_{ex} - h_f)$`,
        [v(r`$\dot Q_{rej}$`, 'heat rejected in the condenser', KW), v(r`$c_p$`, 'specific heat of water, 4.187', r`$\text{kJ/kg·K}$`), v(r`$\Delta T$`, 'cooling-water temperature rise', r`$\text{K}$`)],
        'The cooling-water flow needed to carry away the heat the cycle rejects.',
        'A 35%-efficient plant rejects about 1.9 MW of heat per MW of output.', r`$\text{kg/s}$`),
    // Hydroelectric Plants
    P(HYDRO, null, 'Hydroelectric Power', r`$P = \rho gQH\eta$`, r`$P = \rho gQH\eta = 9.81QH\eta\ \text{kW}\ (Q \text{ in m}^3/\text{s},\ H \text{ in m})$`,
        [v(r`$Q$`, 'flow', r`$\text{m}^3/\text{s}$`), v(r`$H$`, 'net head', M_), v(r`$\eta$`, 'overall efficiency (turbine × generator)')],
        'Electrical output of a hydro plant from flow and head.',
        'Use NET head (after penstock losses) with this formula.', KW),
    P(HYDRO, null, 'Net Head', r`$H_{net} = H_g - h_f$`, r`$H_{net} = H_{gross} - h_f,\qquad h_f = f\frac{L}{D}\frac{v^2}{2g}$`,
        [v(r`$H_{gross}$`, 'difference between headwater and tailwater levels', M_), v(r`$h_f$`, 'head lost in the penstock', M_), v(r`$f, L, D, v$`, 'friction factor, penstock length, diameter, velocity')],
        'The head actually available at the turbine.',
        'A bigger penstock costs more but loses less head: an economic trade-off.', M_),
    P(HYDRO, null, 'Hydro Turbine Selection by Specific Speed', r`$N_s = \frac{N\sqrt P}{H^{5/4}}$`, r`$N_s = \frac{N\sqrt{P}}{H^{5/4}}\ (\text{rpm, kW, m}):\ \text{Pelton} < 30,\ \text{Francis } 50\text{–}350,\ \text{Kaplan} > 250$`,
        [v(r`$N$`, 'speed', r`$\text{rpm}$`), v(r`$P$`, 'power per turbine', KW), v(r`$H$`, 'net head', M_)],
        'Specific speed picks the turbine type: high head and low flow suits Pelton, low head and high flow suits Kaplan.',
        'Ranges overlap; the speed N is set by the generator\'s poles (synchronous speed).'),
    P(HYDRO, null, 'Pelton Jet and Bucket Speed', r`$v = C_v\sqrt{2gH},\ u \approx 0.46v$`, r`$v_{jet} = C_v\sqrt{2gH},\qquad u_{opt} \approx 0.46v_{jet}\ (\text{ideal } 0.5)$`,
        [v(r`$C_v$`, 'nozzle velocity coefficient, about 0.97–0.99'), v(r`$H$`, 'net head', M_), v(r`$u$`, 'bucket (peripheral) speed', r`$\text{m/s}$`)],
        'The jet speed from the head, and the bucket speed for the most power.',
        'Ideally the buckets move at half the jet speed so the water leaves with almost no velocity.', r`$\text{m/s}$`),
    P(HYDRO, null, 'Reservoir Energy', r`$E = \frac{\rho gVH\eta}{3.6 \times 10^6}$`, r`$E = \frac{\rho gVH\eta}{3.6 \times 10^6}\ \text{kWh}$`,
        [v(r`$V$`, 'usable volume of water', r`$\text{m}^3$`), v(r`$H$`, 'average net head', M_), v(r`$\eta$`, 'overall efficiency')],
        'The electrical energy stored in a reservoir.',
        'A million cubic metres falling 100 m at 85% efficiency gives about 232 MWh.', KWH),
    P(HYDRO, null, 'Pumped-Storage Round-Trip Efficiency', r`$\eta_{rt} = \eta_{pump}\eta_{gen}$`, r`$\eta_{rt} = \frac{E_{out}}{E_{in}} = \eta_{pump\ mode}\,\eta_{gen\ mode}\approx 0.7\text{–}0.8$`,
        [v(r`$\eta_{pump\ mode}$`, 'motor × pump × pipe efficiency'), v(r`$\eta_{gen\ mode}$`, 'pipe × turbine × generator efficiency')],
        'How much of the energy used to pump water up comes back as electricity.',
        'It loses energy but moves it from cheap off-peak hours to valuable peak hours.'),
    // Diesel Plants
    P(DIESEL, null, 'Indicated Power of an Engine', r`$\text{IP} = \frac{p_mLAnN_c}{60x}$`, r`$\text{IP} = \frac{p_{mi}LA\,n\,N_c}{60x}\quad (x = 2 \text{ four-stroke},\ 1 \text{ two-stroke})$`,
        [v(r`$p_{mi}$`, 'indicated mean effective pressure', r`$\text{kPa}$`), v(r`$L, A$`, 'stroke and piston area', M_), v(r`$n$`, 'speed', r`$\text{rpm}$`), v(r`$N_c$`, 'number of cylinders')],
        'The power developed in the cylinders from the mean effective pressure.',
        'A four-stroke engine fires each cylinder every second revolution: divide by 2.', KW),
    P(DIESEL, null, 'Mechanical and Brake Thermal Efficiency', r`$\eta_{bt} = \frac{\text{BP}}{\dot m_f\text{HV}}$`, r`$\eta_m = \frac{\text{BP}}{\text{IP}},\qquad \eta_{bt} = \frac{\text{BP}}{\dot m_f\,\text{HV}}$`,
        [v(r`$\text{BP}$`, 'brake (shaft) power', KW), v(r`$\text{IP}$`, 'indicated power', KW), v(r`$\dot m_f$`, 'fuel flow', r`$\text{kg/s}$`), v(r`$\text{HV}$`, 'heating value', HKJ)],
        'Friction losses between cylinder and shaft, and the fuel-to-shaft efficiency.',
        'Brake thermal efficiency = indicated thermal efficiency × mechanical efficiency.'),
    P(DIESEL, null, 'Specific Fuel Consumption', r`$\text{SFC} = \frac{\dot m_f}{P}$`, r`$\text{SFC} = \frac{\dot m_f}{P}\ (\text{kg/kWh}),\qquad \eta = \frac{3600}{\text{SFC}\cdot\text{HV}}$`,
        [v(r`$\dot m_f$`, 'fuel used per hour', r`$\text{kg/h}$`), v(r`$P$`, 'output', KW), v(r`$\text{HV}$`, 'heating value', HKJ)],
        'Fuel used per kWh: the diesel plant\'s version of heat rate.',
        'Large diesels run about 0.2 kg/kWh, around 42% efficiency.', r`$\text{kg/kWh}$`),
    // Gas Turbine and Combined Cycle
    P(GT, null, 'Optimum Pressure Ratio of a Gas Turbine', r`$r_p = \left(\frac{T_3}{T_1}\right)^{k/[2(k-1)]}$`, r`$r_{p,opt} = \left(\frac{T_{\max}}{T_{\min}}\right)^{\frac{k}{2(k-1)}}\quad (\text{maximum net work, ideal Brayton})$`,
        [v(r`$T_{\max}, T_{\min}$`, 'turbine inlet and compressor inlet temperatures', r`$\text{K}$`), v(r`$k$`, 'ratio of specific heats, 1.4 for air')],
        'The pressure ratio that gives the most net work per kilogram of air.',
        'Efficiency keeps rising with pressure ratio, but net work peaks here.'),
    P(GT, null, 'Combined-Cycle Efficiency', r`$\eta_{cc} = \eta_{GT} + \eta_{ST}(1 - \eta_{GT})$`, r`$\eta_{cc} = \eta_{GT} + \eta_{ST}(1 - \eta_{GT})\quad (\text{all exhaust heat to the HRSG})$`,
        [v(r`$\eta_{GT}$`, 'gas turbine efficiency'), v(r`$\eta_{ST}$`, 'steam bottoming cycle efficiency (on the heat it receives)')],
        'A steam cycle running on gas-turbine exhaust adds its efficiency on the heat that would be wasted.',
        '35% and 30% combine to 54.5%: why combined cycles beat either alone.'),
    // Geothermal Plants
    P(GEO, null, 'Geothermal Flash Fraction', r`$x = \frac{h_1 - h_f}{h_{fg}}$`, r`$x = \frac{h_{brine} - h_f}{h_{fg}}\quad (\text{at the separator pressure})$`,
        [v(r`$h_{brine}$`, 'enthalpy of the geothermal fluid', HKJ), v(r`$h_f, h_{fg}$`, 'saturated-liquid and evaporation enthalpies at separator pressure', HKJ)],
        'The fraction of hot geothermal water that flashes to steam when its pressure drops.',
        'Throttling keeps enthalpy constant; only the flashed steam goes to the turbine.'),
    P(GEO, null, 'Geothermal Plant Output', r`$P = x\dot m(h_s - h_{ex})\eta_t\eta_g$`, r`$P = x\,\dot m\,(h_g - h_{ex})\,\eta_t\,\eta_g$`,
        [v(r`$x$`, 'flash fraction'), v(r`$\dot m$`, 'well flow', r`$\text{kg/s}$`), v(r`$h_g, h_{ex}$`, 'turbine inlet and exhaust enthalpies', HKJ), v(r`$\eta_t, \eta_g$`, 'turbine and generator efficiencies')],
        'Power from a single-flash geothermal plant.',
        'Most of the well flow returns as brine; a second flash recovers more.', KW),
    // Nuclear Plants
    P(NUC, null, 'Uranium Consumed per Energy', r`$m = \frac{E}{200\ \text{MeV}}\cdot\frac{235}{N_A}$`, r`$m_{U235} = \frac{E_{th}}{200\ \text{MeV}}\cdot\frac{235\ \text{g}}{N_A},\qquad 1\ \text{g fissioned} \approx 0.95\ \text{MWd}$`,
        [v(r`$E_{th}$`, 'thermal energy released', r`$\text{J}$`), v(r`$N_A$`, 'Avogadro\'s number, 6.022 × 10²³')],
        'Fuel actually fissioned for a given thermal energy: about 200 MeV per fission.',
        'Use THERMAL energy: electrical output ÷ efficiency (about 33%).', r`$\text{g}$`),
    P(NUC, null, 'Reactivity', r`$\rho = \frac{k - 1}{k}$`, r`$\rho = \frac{k_{eff} - 1}{k_{eff}};\qquad k_{eff} = 1 \text{ critical},\ > 1 \text{ supercritical}$`,
        [v(r`$k_{eff}$`, 'effective multiplication factor')],
        'How far a reactor is from steady (critical) operation.',
        'Control rods and moderator temperature change k_eff; delayed neutrons make control possible.'),
    // Solar PV
    P(PV, null, 'PV Temperature Derating', r`$P = P_{STC}[1 + \gamma(T_c - 25)]$`, r`$P = P_{STC}\frac{G}{1000}[1 + \gamma(T_c - 25)],\qquad T_c = T_a + \frac{\text{NOCT} - 20}{800}G$`,
        [v(r`$\gamma$`, 'power temperature coefficient, about −0.004 per °C'), v(r`$T_c, T_a$`, 'cell and ambient temperature', r`$\text{°C}$`), v(r`$G$`, 'irradiance', r`$\text{W/m}^2$`), v(r`$\text{NOCT}$`, 'nominal operating cell temperature', r`$\text{°C}$`)],
        'A module\'s output at real irradiance and cell temperature, from its STC rating.',
        'In the tropics cells run 50–60 °C: 10–15% below the nameplate even in full sun.', r`$\text{W}$`),
    P(PV, null, 'PV Array Size from Peak Sun Hours', r`$P_{array} = \frac{E}{\text{PSH} \times \eta_{sys}}$`, r`$P_{array} = \frac{E_{daily}}{\text{PSH} \times \eta_{sys}},\qquad N = \frac{P_{array}}{P_{module}}$`,
        [v(r`$E_{daily}$`, 'daily energy needed', KWH), v(r`$\text{PSH}$`, 'peak sun hours (kWh/m²/day)', r`$\text{h}$`), v(r`$\eta_{sys}$`, 'system derate: temperature, wiring, inverter, soiling (≈ 0.75–0.8)')],
        'The array rating needed to supply a daily energy.',
        'Philippine sites typically get 4.5–5.5 peak sun hours. Round module count up.', KW),
    P(PV, null, 'Battery Bank Capacity', r`$C = \frac{E\,D}{V\cdot\text{DoD}\cdot\eta}$`, r`$C = \frac{E_{daily}\,D}{V_{bank}\cdot\text{DoD}\cdot\eta_{batt}}\ (\text{Ah})$`,
        [v(r`$E_{daily}$`, 'daily load', r`$\text{Wh}$`), v(r`$D$`, 'days of autonomy'), v(r`$V_{bank}$`, 'bank voltage', r`$\text{V}$`), v(r`$\text{DoD}$`, 'allowed depth of discharge (0.5 lead-acid, 0.8–0.9 lithium)')],
        'Ampere-hours of storage for a load over a number of sunless days.',
        'Shallow discharge greatly extends lead-acid life.', r`$\text{Ah}$`),
    // Wind
    P(WIND, null, 'Betz Limit', r`$C_{p,\max} = \frac{16}{27}$`, r`$C_p = 4a(1 - a)^2,\qquad C_{p,\max} = \frac{16}{27} = 0.593\ (a = \tfrac13)$`,
        [v(r`$a$`, 'axial induction factor (fractional slowing of the wind at the rotor)'), v(r`$C_p$`, 'power coefficient')],
        'No turbine can capture more than 59.3% of the wind\'s kinetic power.',
        'Real turbines reach about 0.45–0.50.'),
    P(WIND, null, 'Tip-Speed Ratio', r`$\lambda = \frac{\omega R}{v}$`, r`$\lambda = \frac{\omega R}{v} = \frac{2\pi nR}{60v}$`,
        [v(r`$\omega$`, 'rotor speed', r`$\text{rad/s}$`), v(r`$R$`, 'blade length (radius)', M_), v(r`$v$`, 'wind speed', r`$\text{m/s}$`)],
        'Blade-tip speed over wind speed: sets the rotor\'s efficiency.',
        'Three-blade turbines work best near λ = 6–8.'),
    P(WIND, null, 'Wind Shear Power Law', r`$v_2 = v_1\left(\frac{h_2}{h_1}\right)^\alpha$`, r`$v_2 = v_1\left(\frac{h_2}{h_1}\right)^{\alpha},\qquad \alpha \approx \tfrac17\ (\text{open terrain})$`,
        [v(r`$v_1$`, 'wind speed measured at height h₁', r`$\text{m/s}$`), v(r`$h_1, h_2$`, 'measurement and hub heights', M_), v(r`$\alpha$`, 'shear exponent')],
        'Wind speed at hub height from a measurement lower down.',
        'Power goes as v³: 10% more wind speed is 33% more power.', r`$\text{m/s}$`),
    // Biomass
    P(BIO, null, 'Biomass Plant Output', r`$P = \frac{\dot m_f\,\text{HV}\,\eta}{3600}$`, r`$P = \frac{\dot m_f\,\text{HV}\,\eta}{3600}\ \text{kW}\quad (\dot m_f \text{ in kg/h, HV in kJ/kg})$`,
        [v(r`$\dot m_f$`, 'fuel feed', r`$\text{kg/h}$`), v(r`$\text{HV}$`, 'heating value as fired', HKJ), v(r`$\eta$`, 'overall efficiency')],
        'Electrical output from a fuel feed rate (bagasse, rice husk, wood).',
        'Use the AS-FIRED (wet) heating value; dry-basis values overstate output.', KW),
    P(BIO, null, 'Heating Value on a Wet Basis', r`$\text{LHV}_w = \text{LHV}_d(1 - w) - 2.44w$`, r`$\text{LHV}_{wet} = \text{LHV}_{dry}(1 - w) - 2.44w\ \text{MJ/kg}$`,
        [v(r`$w$`, 'moisture content, wet basis (fraction)'), v(r`$\text{LHV}_{dry}$`, 'dry-basis lower heating value', r`$\text{MJ/kg}$`)],
        'Moisture both dilutes the fuel and takes heat to evaporate.',
        'Bagasse at 50% moisture has well under half its dry heating value.', r`$\text{MJ/kg}$`),
    // Plant Economics
    P(ECON, null, 'Generation Cost per kWh', r`$c = \frac{C_{cap}\text{CRF} + C_{O\&M} + C_{fuel}}{E}$`, r`$c = \frac{C_{cap}\,\text{CRF} + C_{O\&M} + C_{fuel}}{E},\qquad \text{CRF} = \frac{i(1 + i)^n}{(1 + i)^n - 1}$`,
        [v(r`$C_{cap}$`, 'capital cost', r`$\text{₱}$`), v(r`$\text{CRF}$`, 'capital recovery factor'), v(r`$C_{O\&M}, C_{fuel}$`, 'annual operating and fuel costs', r`$\text{₱/yr}$`), v(r`$E$`, 'annual energy', KWH)],
        'The cost of each kWh: annualized capital plus running costs over the energy produced.',
        'Fixed costs per kWh fall as the capacity factor rises: base-load plants need high CF.', r`$\text{₱/kWh}$`),
    P(ECON, null, 'Two-Part Tariff', r`$C = a\,P_{\max} + b\,E$`, r`$C = a\,P_{\max} + b\,E\quad (\text{Hopkinson})$`,
        [v(r`$a$`, 'demand charge', r`$\text{₱/kW}$`), v(r`$b$`, 'energy charge', r`$\text{₱/kWh}$`), v(r`$P_{\max}$`, 'maximum demand', KW), v(r`$E$`, 'energy used', KWH)],
        'A bill in two parts: one for the capacity reserved (demand), one for the energy used.',
        'A higher load factor spreads the demand charge over more kWh, lowering the average rate.', r`$\text{₱}$`),
    P(ECON, null, 'Break-Even Operating Hours', r`$h = \frac{F_1 - F_2}{v_2 - v_1}$`, r`$h^* = \frac{F_1 - F_2}{v_2 - v_1}\quad (\text{per kW: fixed } F,\ \text{variable } v)$`,
        [v(r`$F_1, F_2$`, 'annual fixed cost per kW of the two plant types', r`$\text{₱/kW·yr}$`), v(r`$v_1, v_2$`, 'variable cost per kWh', r`$\text{₱/kWh}$`)],
        'The yearly running hours above which the high-capital, low-fuel plant is cheaper.',
        'Below h* use peaking plant (low capital, high fuel); above it, base-load plant.', r`$\text{h/yr}$`),
    // Plant Auxiliaries
    P(AUX, null, 'Auxiliary Pump and Fan Power', r`$P = \frac{\rho gQH}{\eta},\ \frac{Q\Delta p}{\eta}$`, r`$P_{pump} = \frac{\rho gQH}{\eta},\qquad P_{fan} = \frac{Q\,\Delta p}{\eta}$`,
        [v(r`$Q$`, 'flow', r`$\text{m}^3/\text{s}$`), v(r`$H$`, 'pump head', M_), v(r`$\Delta p$`, 'fan pressure rise', r`$\text{Pa}$`), v(r`$\eta$`, 'overall efficiency (machine × motor)')],
        'Input power of the plant\'s largest auxiliaries: feed and cooling pumps, draft fans.',
        'The boiler feed pump is often the largest auxiliary load in a steam plant.', r`$\text{W}$`),
    P(AUX, null, 'Net Plant Output and Station Service', r`$P_{net} = P_{gross} - P_{aux}$`, r`$P_{net} = P_{gross} - P_{aux},\qquad \text{HR}_{net} = \text{HR}_{gross}\frac{P_{gross}}{P_{net}}$`,
        [v(r`$P_{gross}$`, 'generator output', KW), v(r`$P_{aux}$`, 'station service (auxiliary) load', KW), v(r`$\text{HR}$`, 'heat rate', r`$\text{kJ/kWh}$`)],
        'What the plant actually sends out after feeding its own auxiliaries.',
        'Steam plants use about 5–10% for auxiliaries; hydro about 1%.', KW),
];

module.exports = { subject: 'EE', topic: 'Power Plant Engineering', migration: '20270104000000_cards_power_plant_engineering', file, revisions, retire, drafts };
