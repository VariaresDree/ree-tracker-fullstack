// Library › Lessons › EE › Power Plant Engineering (2026-11-19): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Thermodynamic cycles in detail
// are in ESAS › Basic Thermodynamics; generators and turbines' electrical side
// in Machinery 2; load factors in Distribution.
const r = String.raw;

export default {
  topic: 'Power Plant Engineering',
  subject: 'EE',
  overview: r`Power plant engineering is about turning an energy source into electricity at the lowest cost: how load varies and how much capacity it needs, how each type of plant works and how efficient it is, and what each kWh costs. Thermal plants (steam, diesel, gas turbine, combined cycle, geothermal, nuclear, biomass) burn or release heat and run a cycle; hydro, wind and solar take energy directly from nature and are limited by the resource. The common tools are plant factors, efficiency and heat rate, fuel consumption, and annual cost per kWh. The Philippine mix leans on coal, natural gas, geothermal and hydro, with fast-growing solar and wind.`,
  sources: [
    'Power Plant Engineering (Morse)',
    'Power Plant Engineering (Nag)',
    'Wind and Solar Power Systems (Patel)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Load Curves and Plant Factors',
      inShort: r`How demand varies over time, and how well plants are used to meet it.`,
      keyIdeas: [
        r`Load curve and load-duration curve; base, intermediate and peak load.`,
        r`Capacity factor $\frac{E}{P_{rated}T}$; use factor over running hours; $\text{CF} = \text{LF} \times \frac{P_{peak}}{P_{rated}}$.`,
        r`Reserve $= P_{inst} - P_{peak}$; margin as a percentage of the peak.`,
      ],
      example: {
        problem: r`A 100 MW plant generates 350 GWh in a year and ran 6000 hours. Find its capacity and use factors. The system has 120 MW installed for a 100 MW peak: what is its reserve margin?`,
        solution: r`CF $= \frac{350{,}000}{100 \times 8760} = 0.40$; use factor $= \frac{350{,}000}{100 \times 6000} = 0.58$. Reserve margin $= 20\%$.`,
      },
      traps: [r`Capacity factor uses ALL hours in the period, use factor only the running hours.`],
    },
    {
      name: 'Steam Plants',
      inShort: r`Fuel heats water to steam, which drives a turbine on the Rankine cycle.`,
      keyIdeas: [
        r`Overall efficiency $= \eta_{boiler}\eta_{cycle}\eta_{mech}\eta_{gen}$; heat rate $= \frac{3600}{\eta}$ kJ/kWh.`,
        r`Fuel use $\dot m_f = \frac{P\cdot\text{HR}}{\text{HV}}$; boiler efficiency $\frac{\dot m_s(h_s - h_{fw})}{\dot m_f\text{HV}}$.`,
        r`Reheat, regeneration (feedwater heaters) and higher steam conditions raise efficiency.`,
      ],
      example: {
        problem: r`A 100 MW unit has boiler 88%, cycle 42%, mechanical 98% and generator 98% efficiency, burning coal of 25,000 kJ/kg. Find its heat rate and coal use.`,
        solution: r`$\eta = 0.88 \times 0.42 \times 0.98 \times 0.98 = 0.355$; HR $= \frac{3600}{0.355} = 10{,}142$ kJ/kWh. Coal $= \frac{100{,}000 \times 10{,}142}{25{,}000} = 40{,}570$ kg/h.`,
      },
      traps: [r`Heat rate and efficiency are inverses: lower heat rate is better.`],
    },
    {
      name: 'Hydroelectric Plants',
      inShort: r`Water falling through a head drives turbines: $P = 9.81QH\eta$ kW.`,
      keyIdeas: [
        r`Net head = gross head − penstock losses; reservoir energy $\frac{\rho gVH\eta}{3.6 \times 10^6}$ kWh.`,
        r`Turbine by specific speed $N_s = \frac{N\sqrt P}{H^{5/4}}$: Pelton (high head), Francis (medium), Kaplan (low head, high flow).`,
        r`Pelton: jet $v = C_v\sqrt{2gH}$, bucket speed about 0.46v. Pumped storage returns about 70–80%.`,
      ],
      example: {
        problem: r`A plant passes 20 m³/s at 95 m net head with 88% efficiency. Find its output. A Pelton wheel works at 400 m with $C_v = 0.98$: find the jet speed and best bucket speed.`,
        solution: r`$P = 9.81 \times 20 \times 95 \times 0.88 = 16.4$ MW. Jet $= 0.98\sqrt{2 \times 9.81 \times 400} = 86.8$ m/s; bucket $\approx 0.46 \times 86.8 = 39.9$ m/s.`,
      },
      traps: [r`Use NET head, and keep Q in m³/s for the 9.81QHη form in kW.`],
    },
    {
      name: 'Diesel Plants',
      inShort: r`Compression-ignition engines for small grids, islands and standby.`,
      keyIdeas: [
        r`$\text{IP} = \frac{p_{mi}LAnN_c}{60x}$ ($x = 2$ four-stroke); mechanical efficiency $\frac{\text{BP}}{\text{IP}}$.`,
        r`Brake thermal efficiency $\frac{\text{BP}}{\dot m_f\text{HV}}$; SFC $= \frac{\dot m_f}{P}$ kg/kWh.`,
        r`Quick starting and flexible, but high fuel cost: peaking and off-grid duty.`,
      ],
      example: {
        problem: r`A 6-cylinder, four-stroke engine (150 mm bore, 200 mm stroke) runs at 1500 rpm with 800 kPa imep and delivers 180 kW. Find IP and mechanical efficiency. At 0.2 kg/kWh of 43 MJ/kg fuel, what is its efficiency?`,
        solution: r`$A = 0.01767$ m²: IP $= \frac{800 \times 0.2 \times 0.01767 \times 1500 \times 6}{120} = 212$ kW; $\eta_m = \frac{180}{212} = 84.9\%$. $\eta = \frac{3600}{0.2 \times 43{,}000} = 41.9\%$.`,
      },
      traps: [r`Divide by 2 for a four-stroke engine: each cylinder fires every other revolution.`],
    },
    {
      name: 'Gas Turbine and Combined Cycle',
      inShort: r`Brayton-cycle gas turbines start fast; adding a steam cycle on their exhaust gives the most efficient thermal plants.`,
      keyIdeas: [
        r`Ideal Brayton efficiency $1 - r_p^{-(k-1)/k}$ (ESAS); best net work at $r_p = \left(\frac{T_{\max}}{T_{\min}}\right)^{k/[2(k-1)]}$.`,
        r`Combined cycle: $\eta_{cc} = \eta_{GT} + \eta_{ST}(1 - \eta_{GT})$, about 55–60% today.`,
        r`Output falls on hot days: the air is less dense.`,
      ],
      example: {
        problem: r`A gas turbine takes air at 300 K with 1200 K at the turbine inlet ($k = 1.4$). Find the pressure ratio for most work. With 35% GT and 30% bottoming efficiency, what is the combined efficiency?`,
        solution: r`$r_p = 4^{1.75} = 11.3$. $\eta_{cc} = 0.35 + 0.30 \times 0.65 = 54.5\%$.`,
      },
      traps: [r`The pressure ratio for maximum work is not the one for maximum efficiency.`],
    },
    {
      name: 'Geothermal Plants',
      inShort: r`Steam and hot water from the earth drive turbines; the Philippines is a world leader.`,
      keyIdeas: [
        r`Flash fraction $x = \frac{h_{brine} - h_f}{h_{fg}}$ at separator pressure (throttling keeps h).`,
        r`Output $P = x\dot m(h_g - h_{ex})\eta_t\eta_g$; double flash and binary plants use more of the heat.`,
        r`Dry steam, flash and binary types; brine is reinjected.`,
      ],
      example: {
        problem: r`A well gives 100 kg/s of fluid at 1100 kJ/kg, flashed at 6 bar ($h_f = 670.4$, $h_{fg} = 2085.8$). The steam expands from 2756 to 2300 kJ/kg at 85% turbine and 97% generator efficiency. Find the steam fraction and output.`,
        solution: r`$x = \frac{1100 - 670.4}{2085.8} = 0.206$. $P = 0.206 \times 100 \times 456 \times 0.85 \times 0.97 = 7.74$ MW.`,
      },
      traps: [r`Only the flashed fraction goes to the turbine; the rest leaves as brine.`],
    },
    {
      name: 'Nuclear Plants',
      inShort: r`Fission heat raises steam; a little fuel releases enormous energy.`,
      keyIdeas: [
        r`About 200 MeV per fission: 1 g of U-235 fissioned gives about 0.95 MWd of heat.`,
        r`Reactivity $\rho = \frac{k_{eff} - 1}{k_{eff}}$; moderators slow neutrons, control rods absorb them.`,
        r`PWR and BWR are the common types; efficiency about 33%.`,
      ],
      example: {
        problem: r`How much U-235 does a 1000 MWe plant at 33% efficiency fission in a year at full output?`,
        solution: r`Heat $= \frac{1000}{0.33}$ MW for a year $= 9.56 \times 10^{16}$ J. One gram gives $8.2 \times 10^{10}$ J, so about 1165 kg.`,
      },
      traps: [r`Use thermal energy, not electrical output, with the energy per fission.`],
    },
    {
      name: 'Solar PV',
      inShort: r`Cells convert sunlight directly; output depends on irradiance and cell temperature.`,
      keyIdeas: [
        r`Derating: $P = P_{STC}\frac{G}{1000}[1 + \gamma(T_c - 25)]$, $T_c = T_a + \frac{\text{NOCT} - 20}{800}G$.`,
        r`Array size $= \frac{E_{daily}}{\text{PSH} \times \eta_{sys}}$; battery $C = \frac{E D}{V\cdot\text{DoD}\cdot\eta}$.`,
        r`Grid-tied (net metering), off-grid and hybrid systems.`,
      ],
      example: {
        problem: r`A 400 W module (NOCT 45 °C, γ = −0.4%/°C) is in full sun at 32 °C. Find its output. How many such modules supply 20 kWh/day at 5 peak sun hours and 0.78 derate?`,
        solution: r`$T_c = 32 + \frac{25}{800} \times 1000 = 63.3$ °C: $P = 400(1 - 0.004 \times 38.3) = 339$ W. Array $= \frac{20}{5 \times 0.78} = 5.13$ kW: 13 modules.`,
      },
      traps: [r`Hot cells lose power: use the cell temperature, not the air temperature.`],
    },
    {
      name: 'Wind',
      inShort: r`Turbines take kinetic energy from the wind, at most 59.3% of it.`,
      keyIdeas: [
        r`$P = \frac12\rho Av^3C_p$ (ESAS), with $C_p \le \frac{16}{27}$ (Betz).`,
        r`Tip-speed ratio $\lambda = \frac{\omega R}{v}$, best near 6–8 for three blades.`,
        r`Shear: $v_2 = v_1\left(\frac{h_2}{h_1}\right)^{1/7}$; power goes as $v^3$, so height pays.`,
      ],
      example: {
        problem: r`Wind is 6 m/s at a 10 m mast. Estimate it at an 80 m hub, and the power gain. A 50 m blade turns at 15 rpm in 10 m/s wind: find its tip-speed ratio.`,
        solution: r`$v = 6 \times 8^{1/7} = 8.08$ m/s; power ratio $\left(\frac{8.08}{6}\right)^3 = 2.44$. $\lambda = \frac{2\pi \times 15 \times 50}{60 \times 10} = 7.85$.`,
      },
      traps: [r`Average power is not the power at the average wind speed: it depends on the cube.`],
    },
    {
      name: 'Biomass',
      inShort: r`Burning bagasse, rice husk and wood residues; moisture is the enemy.`,
      keyIdeas: [
        r`Output $P = \frac{\dot m_f\text{HV}\eta}{3600}$ kW (kg/h, kJ/kg).`,
        r`Wet basis: $\text{LHV}_{wet} = \text{LHV}_{dry}(1 - w) - 2.44w$ MJ/kg.`,
        r`Sugar mills cogenerate with bagasse; gasification and biogas are other routes.`,
      ],
      example: {
        problem: r`Bagasse at 50% moisture (19 MJ/kg dry) is fed at 10 t/h to a plant of 22% efficiency. Find its heating value as fired and the output.`,
        solution: r`$\text{LHV} = 19 \times 0.5 - 2.44 \times 0.5 = 8.28$ MJ/kg. $P = \frac{10{,}000 \times 8280 \times 0.22}{3600} = 5.06$ MW.`,
      },
      traps: [r`Never use a dry-basis heating value for wet fuel.`],
    },
    {
      name: 'Plant Economics',
      inShort: r`The cost of each kWh, and which plant to build for which duty.`,
      keyIdeas: [
        r`Cost per kWh $= \frac{C_{cap}\text{CRF} + C_{O\&M} + C_{fuel}}{E}$, $\text{CRF} = \frac{i(1 + i)^n}{(1 + i)^n - 1}$.`,
        r`Two-part tariff $aP_{\max} + bE$; break-even hours $\frac{F_1 - F_2}{v_2 - v_1}$.`,
        r`High-capital, low-fuel plants for base load; cheap, high-fuel plants for peaks.`,
      ],
      example: {
        problem: r`A ₱5 billion plant (10%, 25 years) has ₱100 M O&M and ₱900 M fuel a year for 700 GWh. Find the cost per kWh. Base plant: ₱9000/kW·yr fixed, ₱3/kWh; peaker: ₱3000/kW·yr, ₱8/kWh. Above how many hours is base cheaper?`,
        solution: r`CRF $= 0.1102$: $\frac{551 + 100 + 900}{700}$ M = ₱2.22/kWh. Break-even $= \frac{9000 - 3000}{8 - 3} = 1200$ h/yr.`,
      },
      traps: [r`Fixed cost per kWh depends on capacity factor: a peaker running few hours has costly kWh.`],
    },
    {
      name: 'Plant Auxiliaries',
      inShort: r`Pumps, fans, mills and cooling systems that the plant itself runs.`,
      keyIdeas: [
        r`Pump $\frac{\rho gQH}{\eta}$, fan $\frac{Q\Delta p}{\eta}$.`,
        r`Net output $= P_{gross} - P_{aux}$; net heat rate $= \text{HR}_{gross}\frac{P_{gross}}{P_{net}}$.`,
        r`Steam plants use about 5–10% of output for auxiliaries; hydro about 1%.`,
      ],
      example: {
        problem: r`A feed pump moves 0.5 m³/s against 120 m at 80% efficiency. Find its power. A 100 MW unit with 7 MW of auxiliaries has a gross heat rate of 10,000 kJ/kWh: find the net heat rate.`,
        solution: r`$P = \frac{1000 \times 9.81 \times 0.5 \times 120}{0.8} = 736$ kW. Net heat rate $= 10{,}000 \times \frac{100}{93} = 10{,}753$ kJ/kWh.`,
      },
      traps: [r`Quote heat rate on the same basis (gross or net) when comparing plants.`],
    },
  ],
};
