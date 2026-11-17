// Library › Lessons › ESAS › Basic Thermodynamics (2026-11-17): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Physics for Engineers covers
// heat, temperature scales and heat transfer.
const r = String.raw;

export default {
  topic: 'Basic Thermodynamics',
  subject: 'ESAS',
  overview: r`Energy and its conversion between heat and work: the basis of every power plant an electrical engineer connects to. The first law keeps the books (energy in = energy out + stored); the second law says which conversions are possible and how efficient they can be. Most problems are one of three kinds: an ideal-gas process, a steam process read from the tables, or a cycle (Carnot, Otto, Diesel, Brayton, Rankine). Always use absolute temperature and pressure, and keep kJ, kPa and m³ together.`,
  sources: [
    'Thermodynamics: An Engineering Approach (Çengel and Boles)',
    'Fundamentals of Engineering Thermodynamics (Moran and Shapiro)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Basic Principles, Concepts and Definitions',
      inShort: r`Systems, properties, states, processes, and the units that tie them together.`,
      keyIdeas: [
        r`A closed system keeps its mass; an open system (control volume) lets mass cross its boundary.`,
        r`Properties need absolute values: $T$ in K, $p$ absolute (gauge + atmospheric).`,
        r`Efficiency $\eta = \frac{W_{net}}{Q_{in}}$; heat rate $\frac{3600}{\eta}$ kJ/kWh; flow work $pV$.`,
      ],
      example: {
        problem: r`A power plant converts 36% of its fuel heat into electricity. Find its heat rate.`,
        solution: r`$\frac{3600}{0.36} = 10\,000$ kJ/kWh: it burns fuel worth 10 MJ for every kilowatt-hour sent out.`,
      },
      traps: [r`kPa × m³ = kJ: keep pressure in kPa when volumes are in m³.`],
    },
    {
      name: 'First Law of Thermodynamics',
      inShort: r`Energy is conserved: heat and work change the stored energy.`,
      keyIdeas: [
        r`Closed: $Q - W = \Delta U$. Steady flow: $\dot Q - \dot W = \dot m[\Delta h + \Delta\frac{v^2}{2} + g\Delta z]$.`,
        r`Turbine $\dot W = \dot m(h_1 - h_2)$; nozzle $v_2 \approx 44.72\sqrt{h_1 - h_2}$; throttle $h_1 = h_2$.`,
        r`Boundary work $\int p\,dV$ depends on the path.`,
      ],
      example: {
        problem: r`Steam enters a turbine at 2 kg/s with $h = 3115.3$ kJ/kg and leaves at 2300 kJ/kg. Neglecting heat loss and kinetic energy, find the power.`,
        solution: r`$\dot W = 2(3115.3 - 2300) = 1630.6$ kW, about 1.63 MW.`,
      },
      traps: [r`Mind the sign convention: work BY the system and heat INTO it are positive.`],
    },
    {
      name: 'Ideal Gas Laws',
      inShort: r`$pV = mRT$ and how the specific heats of a gas are related.`,
      keyIdeas: [
        r`$pV = mRT$ with $R = \frac{R_u}{M}$ (air 0.287 kJ/kg·K).`,
        r`$c_p - c_v = R$, $k = \frac{c_p}{c_v}$; air $c_p = 1.005$, $c_v = 0.718$, $k = 1.4$.`,
        r`$\Delta U = mc_v\Delta T$ and $\Delta H = mc_p\Delta T$ for any process; mixtures by Dalton's partial pressures.`,
      ],
      example: {
        problem: r`What volume does 1 kg of air occupy at 100 kPa and 300 K? What is the gas constant of CO₂ (M = 44)?`,
        solution: r`$V = \frac{1(0.287)(300)}{100} = 0.861$ m³. $R_{CO_2} = \frac{8.314}{44} = 0.189$ kJ/kg·K.`,
      },
      traps: [r`Gauge pressure in $pV = mRT$ is wrong: add the atmosphere.`],
    },
    {
      name: 'Processes of Ideal Gases',
      inShort: r`Constant pressure, volume and temperature, isentropic and polytropic changes.`,
      keyIdeas: [
        r`Isobaric $W = mR\Delta T$, $Q = mc_p\Delta T$; isochoric $W = 0$, $Q = mc_v\Delta T$; isothermal $W = Q = p_1V_1\ln\frac{V_2}{V_1}$.`,
        r`Isentropic $pV^k = C$, $\frac{T_2}{T_1} = \left(\frac{p_2}{p_1}\right)^{\frac{k-1}{k}}$; polytropic $pV^n = C$, $W = \frac{p_2V_2 - p_1V_1}{1 - n}$.`,
        r`$\Delta s = c_p\ln\frac{T_2}{T_1} - R\ln\frac{p_2}{p_1}$, the same by any path.`,
      ],
      example: {
        problem: r`1 kg of air at 300 K expands isothermally to three times its volume: find the work. Air at 300 K is compressed isentropically through a ratio of 8: find the final temperature and the work per kg.`,
        solution: r`Isothermal: $0.287(300)\ln3 = 94.6$ kJ. Isentropic: $T_2 = 300(8)^{0.4} = 689.2$ K; work in $= 0.718(689.2 - 300) = 279.5$ kJ/kg.`,
      },
      traps: [r`Use the volume ratio with exponent $k - 1$, the pressure ratio with $\frac{k-1}{k}$.`],
    },
    {
      name: 'Properties of Pure Substances',
      inShort: r`Water and steam: saturation, quality, superheat, and the steam tables.`,
      keyIdeas: [
        r`At a given pressure water boils at $T_{sat}$; between saturated liquid and vapour the state is set by quality $x$.`,
        r`$h = h_f + xh_{fg}$ (and $v$, $s$ likewise); at 1 atm, $T_{sat} = 100\,^\circ$C, $h_{fg} = 2257$ kJ/kg.`,
        r`Superheated: $T > T_{sat}$, use the superheat table. Compressed liquid: take $h_f$ at the temperature.`,
      ],
      example: {
        problem: r`Wet steam at 10 kPa has $s = 6.7428$ kJ/kg·K ($s_f = 0.6493$, $s_{fg} = 7.5009$, $h_f = 191.83$, $h_{fg} = 2392.8$). Find its quality and enthalpy.`,
        solution: r`$x = \frac{6.7428 - 0.6493}{7.5009} = 0.812$; $h = 191.83 + 0.812(2392.8) = 2135.7$ kJ/kg.`,
      },
      traps: [r`Compare $T$ with $T_{sat}$ at the pressure FIRST to pick the right table.`],
    },
    {
      name: 'Processes of Pure Substances',
      inShort: r`Heating, expanding and throttling steam, using the tables.`,
      keyIdeas: [
        r`Constant pressure: $Q = m(h_2 - h_1)$; rigid tank: $Q = m(u_2 - u_1)$ with $v$ unchanged.`,
        r`Isentropic expansion: $s_2 = s_1$ gives $x_2$; throttling: $h_2 = h_1$.`,
        r`A throttling calorimeter finds the quality of nearly dry steam.`,
      ],
      example: {
        problem: r`Wet steam at 1 MPa ($h_f = 762.81$, $h_{fg} = 2015.3$) is throttled to 100 kPa, 120 °C, where $h = 2716.6$ kJ/kg. Find its original quality.`,
        solution: r`$h_1 = h_2$: $x_1 = \frac{2716.6 - 762.81}{2015.3} = 0.970$, so 3% moisture.`,
      },
      traps: [r`A throttle keeps enthalpy, not temperature, for steam.`],
    },
    {
      name: 'Second Law and Entropy',
      inShort: r`Which energy conversions are possible, and how entropy keeps score.`,
      keyIdeas: [
        r`No engine turns all its heat into work: $\eta = 1 - \frac{Q_L}{Q_H} < 1$.`,
        r`Refrigerator $COP_R = \frac{Q_L}{W}$; heat pump $COP_{HP} = COP_R + 1$; 1 TR = 3.517 kW.`,
        r`$\Delta S = \int\frac{\delta Q}{T}$; solids and liquids $mc\ln\frac{T_2}{T_1}$; $S_{gen} \ge 0$ always.`,
      ],
      example: {
        problem: r`A refrigerator removes 7 kW using 2 kW of work. Find its COP and the heat it rejects. What is the entropy change of 1 kg of ice melting at 0 °C?`,
        solution: r`$COP = \frac72 = 3.5$; it rejects $7 + 2 = 9$ kW. Ice: $\frac{334}{273.15} = 1.22$ kJ/K.`,
      },
      traps: [r`COP above 1 is normal; it is not an efficiency.`],
    },
    {
      name: 'Carnot Cycle',
      inShort: r`The ideal reversible cycle: the best any engine or refrigerator can do.`,
      keyIdeas: [
        r`$\eta_C = 1 - \frac{T_L}{T_H}$; $\frac{Q_H}{Q_L} = \frac{T_H}{T_L}$.`,
        r`$COP_{R} = \frac{T_L}{T_H - T_L}$, $COP_{HP} = \frac{T_H}{T_H - T_L}$.`,
        r`Two isothermal and two isentropic processes.`,
      ],
      example: {
        problem: r`Find the Carnot efficiency between 1000 K and 300 K, and the best COP of a refrigerator keeping 270 K in a 300 K room.`,
        solution: r`$1 - \frac{300}{1000} = 70\%$. $COP = \frac{270}{300 - 270} = 9$.`,
      },
      traps: [r`Kelvin only: in Celsius the same formula gives nonsense.`],
    },
    {
      name: 'Gas Cycles (Otto, Diesel, Brayton)',
      inShort: r`Ideal cycles for petrol engines, diesel engines and gas turbines.`,
      keyIdeas: [
        r`Otto $\eta = 1 - \frac{1}{r^{k-1}}$; Diesel adds the cutoff factor $\frac{r_c^k - 1}{k(r_c - 1)}$.`,
        r`Brayton $\eta = 1 - \frac{1}{r_p^{(k-1)/k}}$; the compressor takes a large share of the turbine's work.`,
        r`MEP $= \frac{W_{net}}{V_d}$.`,
      ],
      example: {
        problem: r`Find the air-standard efficiency of an Otto cycle with $r = 8$ and of a Brayton cycle with $r_p = 10$ ($k = 1.4$).`,
        solution: r`Otto: $1 - 8^{-0.4} = 56.5\%$. Brayton: $1 - 10^{-0.286} = 48.2\%$.`,
      },
      traps: [r`Otto uses the volume ratio; Brayton the pressure ratio, with exponent $\frac{k-1}{k}$.`],
    },
    {
      name: 'Vapor Cycles (Rankine)',
      inShort: r`The steam power plant: pump, boiler, turbine, condenser.`,
      keyIdeas: [
        r`$\eta = \frac{(h_1 - h_2) - (h_4 - h_3)}{h_1 - h_4}$; pump work $v_f\Delta p$.`,
        r`Steam rate $\frac{3600}{w_{net}}$ kg/kWh; turbine efficiency $\frac{h_1 - h_2}{h_1 - h_{2s}}$.`,
        r`Superheat, higher boiler pressure, lower condenser pressure, reheat and regeneration all raise $\eta$.`,
      ],
      example: {
        problem: r`Steam at 3 MPa, 350 °C ($h = 3115.3$, $s = 6.7428$) expands to 10 kPa. Find the ideal Rankine efficiency.`,
        solution: r`From above, $h_2 = 2135.7$; pump work $0.00101(2990) = 3.02$ kJ/kg, $h_4 = 194.85$. $\eta = \frac{979.6 - 3.0}{3115.3 - 194.85} = 33.4\%$.`,
      },
      traps: [r`The pump work is small but not zero: include it in $h_4$.`],
    },
  ],
};
