// Library › Lessons › EE › Power Plant Engineering (2026-11-19; every subtopic in
// the module format 2026-11-24, with figures, examples a step at a time and
// checks; every number re-worked by powerPlantLesson.test.js. Coverage and
// problem styles cross-checked against a review center's power-plant and
// substation handout; the text, problems and figures are this app's own):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order. Thermodynamic cycles in detail are in ESAS › Basic Thermodynamics;
// generators and turbines' electrical side in Machinery 2; load factors in
// Distribution.
const r = String.raw;

// A PV module's current against voltage: 10.5 A short circuit, 49.5 V open.
const pvCurrent = (v) => 10.5 * (1 - Math.exp((v - 49.5) / 2.2));
// A 2 MW wind turbine's power curve: cut in at 3 m/s, rated at 12, cut out at 25.
const windPower = (v) => (v < 3 || v >= 25 ? 0 : v >= 12 ? 2 : (2 * (v ** 3 - 27)) / (12 ** 3 - 27));

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
      body: [
        r`A **load curve** plots demand against time; sorted from highest to lowest it becomes a **load-duration curve**, which shows how many hours a year each level of load is needed. That decides what kind of plant should serve it: **base-load** plants run nearly all year, **intermediate** plants through the day, **peaking** plants only for the top few hundred hours:`,
        {
          type: 'plot',
          alt: 'A load-duration curve over a year: 100 MW for a few hours, falling steeply then slowly to 40 MW at 8760 hours; dashed lines at 55 and 80 MW split it into base, intermediate and peak bands.',
          caption: 'A load-duration curve: below 55 MW is needed all year (base), the top above 80 MW only for a few hundred hours (peak).',
          x: [0, 8760],
          y: [0, 110],
          xLabel: 'hours in the year',
          yLabel: 'load (MW)',
          series: [{ f: (h) => 40 + 60 * Math.exp(-h / 2000), label: 'load', area: true }],
          marks: [{ y: 55, label: 'base' }, { y: 80, label: 'peak above' }],
        },
        r`| Factor | Definition |
|---|---|
| Demand factor | maximum demand ÷ connected load (≤ 1) |
| Diversity factor | sum of individual maxima ÷ simultaneous maximum (≥ 1); coincidence factor is its inverse |
| Load factor | average load ÷ maximum demand |
| Capacity factor (plant ratio) | energy ÷ (rated capacity × hours in the period) |
| Use (plant use) factor | energy ÷ (rated capacity × hours actually run) |
| Utilization factor | maximum demand ÷ rated capacity |
| Operating factor | hours run ÷ hours in the period, = capacity factor ÷ use factor |`,
        r`**Reserve** is installed capacity beyond the peak: **spinning** reserve is connected and ready to take load, **hot** reserve is warm but not running, **cold** reserve is available but needs time to start.`,
      ],
      keyIdeas: [
        r`Load curve and load-duration curve; base, intermediate and peak load.`,
        r`Capacity factor $\frac{E}{P_{rated}T}$; use factor over running hours; $\text{CF} = \text{LF} \times \frac{P_{peak}}{P_{rated}}$.`,
        r`Reserve $= P_{inst} - P_{peak}$; margin as a percentage of the peak.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Capacity and use factors',
          problem: r`A 100 MW plant generates 350 GWh in a year and ran 6000 hours. Find its capacity and use factors. The system has 120 MW installed for a 100 MW peak: what is its reserve margin?`,
          steps: [
            r`CF $= \frac{350\,000}{100 \times 8760} = 0.40$; use factor $= \frac{350\,000}{100 \times 6000} = 0.583$.`,
            r`Reserve margin $= \frac{120 - 100}{100} = 20\%$.`,
          ],
          answer: r`0.40; 0.583; 20%.`,
        },
        {
          level: 'board',
          title: 'Utilization and operating factors',
          problem: r`The same plant's peak output was 80 MW. Find its utilization factor and operating factor, and check that CF = operating factor × use factor.`,
          steps: [
            r`Utilization $= \frac{80}{100} = 0.80$.`,
            r`Operating factor $= \frac{6000}{8760} = 0.685$; $0.685 \times 0.583 = 0.40$, the capacity factor.`,
          ],
          answer: r`0.80; 0.685.`,
        },
      ],
      traps: [
        r`Capacity factor uses ALL hours in the period, use factor only the running hours.`,
        r`Diversity factor is at least 1; coincidence factor is its reciprocal.`,
      ],
      check: [
        { q: r`What kind of plant serves the top of the load-duration curve?`, a: r`Peaking plants: cheap to build, costly to run, used few hours.` },
        { q: r`What is spinning reserve?`, a: r`Generating capacity connected to the bus and ready to take load at once.` },
      ],
    },
    {
      name: 'Steam Plants',
      inShort: r`Fuel heats water to steam, which drives a turbine on the Rankine cycle.`,
      body: [
        r`A steam plant runs the **Rankine cycle**: the boiler turns water into high-pressure steam, the turbine expands it to drive the generator, the condenser turns the exhaust back to water, and the feed pump returns it to the boiler:`,
        {
          type: 'blocks',
          alt: 'The steam plant cycle: boiler to turbine as steam, turbine to generator by the shaft, turbine to condenser as exhaust, condenser to the feed pump as water, and the pump back to the boiler as feedwater.',
          caption: 'The Rankine loop: boiler, turbine, condenser, pump, and round again.',
          blocks: [
            { id: 'boiler', at: [0, 0], label: 'boiler' },
            { id: 'turbine', at: [1, 0], label: 'turbine' },
            { id: 'gen', at: [2, 0], label: 'generator' },
            { id: 'cond', at: [1, 1], label: 'condenser' },
            { id: 'pump', at: [0, 1], label: 'feed pump' },
          ],
          links: [
            ['boiler', 'turbine'],
            ['turbine', 'gen'],
            ['turbine', 'cond'],
            ['cond', 'pump'],
            ['pump', 'boiler'],
          ],
        },
        r`The overall efficiency is the product of each stage's: $\eta = \eta_{boiler}\eta_{cycle}\eta_{mech}\eta_{gen}$, and the **heat rate** is its inverse, the fuel heat per kWh. Reheat, regeneration (bleeding steam to feedwater heaters) and higher steam pressures and temperatures raise the cycle efficiency.`,
        r`| Heat rate in | One kWh is |
|---|---|
| kJ/kWh | 3600 kJ |
| BTU/kWh | 3413 BTU |
| kcal/kWh | 860 kcal |`,
      ],
      keyIdeas: [
        r`Overall efficiency $= \eta_{boiler}\eta_{cycle}\eta_{mech}\eta_{gen}$; heat rate $= \frac{3600}{\eta}$ kJ/kWh.`,
        r`Fuel use $\dot m_f = \frac{P\cdot\text{HR}}{\text{HV}}$; boiler efficiency $\frac{\dot m_s(h_s - h_{fw})}{\dot m_f\text{HV}}$.`,
        r`Reheat, regeneration (feedwater heaters) and higher steam conditions raise efficiency.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Heat rate and coal use',
          problem: r`A 100 MW unit has boiler 88%, cycle 42%, mechanical 98% and generator 98% efficiency, burning coal of 25 000 kJ/kg. Find its heat rate and coal use.`,
          steps: [
            r`$\eta = 0.88 \times 0.42 \times 0.98 \times 0.98 = 0.355$; HR $= \frac{3600}{0.355} = 10\,142$ kJ/kWh.`,
            r`Coal $= \frac{100\,000 \times 10\,142}{25\,000} = 40\,568$ kg/h.`,
          ],
          answer: r`10 142 kJ/kWh; about 40.6 t/h.`,
        },
        {
          level: 'board',
          title: 'The same heat rate in other units',
          problem: r`Express the 10 142 kJ/kWh heat rate in BTU/kWh and kcal/kWh.`,
          steps: [
            r`$\eta = 0.355$: $\frac{3413}{0.355} = 9615$ BTU/kWh.`,
            r`$\frac{860}{0.355} = 2423$ kcal/kWh.`,
          ],
          answer: r`9615 BTU/kWh; 2423 kcal/kWh.`,
        },
      ],
      traps: [
        r`Heat rate and efficiency are inverses: lower heat rate is better.`,
        r`Thermal plants lose capacity in hot weather: warmer cooling water raises condenser pressure.`,
      ],
      check: [
        { q: r`What does regeneration (feedwater heating) do?`, a: r`Bleeds some steam to preheat feedwater, raising the cycle efficiency.` },
        { q: r`A plant's heat rate is 9000 kJ/kWh. What is its efficiency?`, a: r`$\frac{3600}{9000} = 40\%$.` },
      ],
    },
    {
      name: 'Hydroelectric Plants',
      inShort: r`Water falling through a head drives turbines: $P = 9.81QH\eta$ kW.`,
      body: [
        r`A hydro plant takes water from a reservoir through a penstock to a turbine; the **net head** is the gross head less the penstock's losses, and the output is $P = \rho gQH\eta = 9.81QH\eta$ kW (Q in m³/s, H in m). A surge tank protects the penstock from water hammer when the gates close.`,
        r`| Turbine | Head | Flow | Type |
|---|---|---|---|
| Pelton | high | low | impulse (jets on buckets) |
| Francis | medium | medium | reaction |
| Kaplan (propeller) | low | high | reaction, adjustable blades |`,
        r`| Plant | Water |
|---|---|
| Run-of-river | the stream as it flows; output follows the season |
| Storage (reservoir) | stored, so output is steady through the year |
| Pumped storage | pumped up at night, generated at peak; returns about 70% to 80% |`,
        r`A Pelton wheel converts the jet's energy best when its buckets move at about half the jet speed (in practice about 0.46):`,
        {
          type: 'plot',
          alt: 'The ideal efficiency of a Pelton wheel against the ratio of bucket speed to jet speed: a parabola from zero at a stopped wheel, peaking at 1 when the buckets move at half the jet speed, back to zero at the jet speed.',
          caption: 'Ideal Pelton efficiency against bucket speed over jet speed: best at one half.',
          x: [0, 1],
          y: [0, 1.15],
          xLabel: 'u / v',
          yLabel: 'η (ideal)',
          series: [{ f: (k) => 4 * k * (1 - k), label: 'η', area: true }],
          marks: [{ x: 0.5, label: 'u = v/2' }],
        },
      ],
      keyIdeas: [
        r`Net head = gross head − penstock losses; reservoir energy $\frac{\rho gVH\eta}{3.6 \times 10^6}$ kWh.`,
        r`Turbine by specific speed $N_s = \frac{N\sqrt P}{H^{5/4}}$: Pelton (high head), Francis (medium), Kaplan (low head, high flow).`,
        r`Pelton: jet $v = C_v\sqrt{2gH}$, bucket speed about 0.46v. Pumped storage returns about 70% to 80%.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Output and a Pelton jet',
          problem: r`A plant passes 20 m³/s at 95 m net head with 88% efficiency. Find its output. A Pelton wheel works at 400 m with $C_v = 0.98$: find the jet speed and best bucket speed.`,
          steps: [
            r`$P = 9.81 \times 20 \times 95 \times 0.88 = 16.4$ MW.`,
            r`Jet $= 0.98\sqrt{2 \times 9.81 \times 400} = 86.8$ m/s; bucket $\approx 0.46 \times 86.8 = 39.9$ m/s.`,
          ],
          answer: r`16.4 MW; 86.8 m/s and 39.9 m/s.`,
        },
        {
          level: 'board',
          title: 'Energy stored in a reservoir',
          problem: r`A reservoir holds 10 million m³ above the plant at an average 80 m head. At 85% overall efficiency, how much energy can it deliver?`,
          steps: [r`$E = \frac{1000 \times 9.81 \times 10^7 \times 80 \times 0.85}{3.6 \times 10^6} = 1.853 \times 10^6$ kWh.`],
          answer: r`About 1853 MWh.`,
        },
      ],
      traps: [
        r`Use NET head, and keep Q in m³/s for the 9.81QHη form in kW.`,
        r`Pelton wheels suit HIGH heads; Kaplan turbines low heads.`,
      ],
      check: [
        { q: r`Which turbine is an impulse turbine?`, a: r`The Pelton wheel.` },
        { q: r`What is a surge tank for?`, a: r`To absorb pressure rises (water hammer) when the flow is stopped quickly.` },
      ],
    },
    {
      name: 'Diesel Plants',
      inShort: r`Compression-ignition engines for small grids, islands and standby.`,
      body: [
        r`Diesel engines ignite their fuel by the heat of compression. They start in seconds, run efficiently at their rating and come in any size, so they serve island grids, standby and peaking duty, at the cost of expensive fuel. The indicated power comes from the mean effective pressure: $\text{IP} = \frac{p_{mi}LAnN_c}{60x}$, with $x = 2$ for a four-stroke engine, and the brake (shaft) power is less by the mechanical efficiency.`,
        r`Fuel use is nearly a straight line in load (the **Willans line**): a fixed no-load amount plus a part proportional to output. So efficiency falls at part load:`,
        {
          type: 'plot',
          alt: 'Brake thermal efficiency of a 500 kW diesel set against its load, with fuel use of 10 kg/h plus 0.18 kg per kWh: 30 percent at 100 kW, rising to 42 percent at full load.',
          caption: 'A diesel set (fuel 10 kg/h + 0.18 kg/kWh, 43 MJ/kg): efficiency falls off at part load.',
          x: [50, 500],
          y: [0, 50],
          xLabel: 'P (kW)',
          yLabel: 'η (%)',
          series: [{ f: (p) => (100 * 3600 * p) / ((10 + 0.18 * p) * 43000), label: 'η', area: true }],
          marks: [{ x: 100, label: '30%' }],
        },
      ],
      keyIdeas: [
        r`$\text{IP} = \frac{p_{mi}LAnN_c}{60x}$ ($x = 2$ four-stroke); mechanical efficiency $\frac{\text{BP}}{\text{IP}}$.`,
        r`Brake thermal efficiency $\frac{\text{BP}}{\dot m_f\text{HV}}$; SFC $= \frac{\dot m_f}{P}$ kg/kWh.`,
        r`Quick starting and flexible, but high fuel cost: peaking and off-grid duty.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Indicated power and efficiency',
          problem: r`A 6-cylinder, four-stroke engine (150 mm bore, 200 mm stroke) runs at 1500 rpm with 800 kPa imep and delivers 180 kW. Find IP and mechanical efficiency. At 0.2 kg/kWh of 43 MJ/kg fuel, what is its efficiency?`,
          steps: [
            r`$A = \frac{\pi}{4}(0.15)^2 = 0.01767$ m².`,
            r`IP $= \frac{800 \times 0.2 \times 0.01767 \times 1500 \times 6}{120} = 212.1$ kW; $\eta_m = \frac{180}{212.1} = 84.9\%$.`,
            r`$\eta = \frac{3600}{0.2 \times 43\,000} = 41.9\%$.`,
          ],
          answer: r`212 kW; 84.9%; 41.9%.`,
        },
        {
          level: 'board',
          title: 'Part-load efficiency',
          problem: r`A 500 kW set burns 10 kg/h plus 0.18 kg per kWh of 43 MJ/kg fuel. Find its efficiency at full load and at 100 kW.`,
          steps: [
            r`Full load: fuel $= 10 + 90 = 100$ kg/h; $\eta = \frac{500 \times 3600}{100 \times 43\,000} = 41.9\%$.`,
            r`100 kW: fuel $= 28$ kg/h; $\eta = \frac{100 \times 3600}{28 \times 43\,000} = 29.9\%$.`,
          ],
          answer: r`41.9% and 29.9%.`,
        },
      ],
      traps: [
        r`Divide by 2 for a four-stroke engine: each cylinder fires every other revolution.`,
        r`Running a diesel lightly loaded wastes fuel: the no-load fuel is spread over less output.`,
      ],
      check: [
        { q: r`How does a diesel engine ignite its fuel?`, a: r`By the heat of compression.` },
        { q: r`What is specific fuel consumption?`, a: r`Fuel per unit energy, kg/kWh.` },
      ],
    },
    {
      name: 'Gas Turbine and Combined Cycle',
      inShort: r`Brayton-cycle gas turbines start fast; adding a steam cycle on their exhaust gives the most efficient thermal plants.`,
      body: [
        r`A gas turbine compresses air, burns fuel in it and expands the hot gas through a turbine: the **Brayton cycle**. Its ideal efficiency rises with pressure ratio, $\eta = 1 - r_p^{-(k-1)/k}$, but the net work per kg peaks at a middle pressure ratio, $r_p = \left(\frac{T_{\max}}{T_{\min}}\right)^{k/[2(k-1)]}$:`,
        {
          type: 'plot',
          alt: 'Ideal Brayton efficiency and net work against pressure ratio for 300 K inlet and 1200 K turbine inlet: efficiency rising steadily, net work peaking at a pressure ratio of 11.3 where the efficiency is 50 percent.',
          caption: 'Efficiency (dashed) keeps rising with pressure ratio; net work (solid) peaks at 11.3 for 300 K and 1200 K.',
          x: [1, 40],
          y: [0, 1.5],
          xLabel: 'pressure ratio r_p',
          yLabel: 'per unit',
          series: [
            { f: (rp) => 4 * (1 - rp ** -(0.4 / 1.4)) - (rp ** (0.4 / 1.4) - 1), label: 'net work' },
            { f: (rp) => 1 - rp ** -(0.4 / 1.4), label: 'efficiency', dashed: true },
          ],
          marks: [{ x: 4 ** 1.75, label: '11.3' }],
        },
        r`The exhaust leaves hot (about 500 to 600 °C), so a **combined cycle** passes it through a heat-recovery steam generator to run a steam turbine as well: $\eta_{cc} = \eta_{GT} + \eta_{ST}(1 - \eta_{GT})$, about 55% to 60% today, the most efficient thermal plants. Gas turbines start in minutes, but lose output on hot days, when the air is less dense.`,
      ],
      keyIdeas: [
        r`Ideal Brayton efficiency $1 - r_p^{-(k-1)/k}$; best net work at $r_p = \left(\frac{T_{\max}}{T_{\min}}\right)^{k/[2(k-1)]}$.`,
        r`Combined cycle: $\eta_{cc} = \eta_{GT} + \eta_{ST}(1 - \eta_{GT})$, about 55% to 60% today.`,
        r`Output falls on hot days: the air is less dense.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Best pressure ratio, combined efficiency',
          problem: r`A gas turbine takes air at 300 K with 1200 K at the turbine inlet ($k = 1.4$). Find the pressure ratio for most work. With 35% GT and 30% bottoming efficiency, what is the combined efficiency?`,
          steps: [
            r`$r_p = 4^{1.75} = 11.3$.`,
            r`$\eta_{cc} = 0.35 + 0.30 \times 0.65 = 54.5\%$.`,
          ],
          answer: r`11.3; 54.5%.`,
        },
        {
          level: 'board',
          title: 'The ideal efficiency at that ratio',
          problem: r`What is the ideal Brayton efficiency at the pressure ratio of most work?`,
          steps: [r`$\eta = 1 - 11.31^{-0.2857} = 1 - 0.5 = 50\%$: exactly $1 - \sqrt{\frac{T_{\min}}{T_{\max}}}$.`],
          answer: r`50%.`,
        },
      ],
      traps: [
        r`The pressure ratio for maximum work is not the one for maximum efficiency.`,
        r`Combined efficiency is not the sum of the two: the steam cycle works only on the GT's waste heat.`,
      ],
      check: [
        { q: r`Which plant starts fastest from cold: gas turbine, steam, or nuclear?`, a: r`The gas turbine.` },
        { q: r`What does a heat-recovery steam generator do?`, a: r`Uses the gas turbine's hot exhaust to raise steam for a steam turbine.` },
      ],
    },
    {
      name: 'Geothermal Plants',
      inShort: r`Steam and hot water from the earth drive turbines; the Philippines is a world leader.`,
      body: [
        r`Geothermal wells bring up hot water and steam. In a **flash** plant the fluid is throttled into a separator at lower pressure, where part of it flashes to steam; the steam drives the turbine and the brine is reinjected:`,
        {
          type: 'blocks',
          alt: 'A single-flash geothermal plant: the production well feeds a separator; steam goes on to the turbine and condenser, and the brine goes to reinjection.',
          caption: 'Single flash: well, separator, turbine; the brine goes back underground.',
          blocks: [
            { id: 'well', at: [0, 0], label: 'well' },
            { id: 'sep', at: [1, 0], label: 'separator' },
            { id: 'turb', at: [2, 0], label: 'turbine' },
            { id: 'brine', at: [1, 1], label: 'reinjection' },
            { id: 'cond', at: [2, 1], label: 'condenser' },
          ],
          links: [
            ['well', 'sep'],
            ['sep', 'turb'],
            ['sep', 'brine'],
            ['turb', 'cond'],
          ],
        },
        r`Throttling keeps the enthalpy, so the flashed fraction is $x = \frac{h_{brine} - h_f}{h_{fg}}$ at the separator pressure. **Dry-steam** fields send steam straight to the turbine; **double-flash** plants flash the brine again; **binary** plants pass the heat to a low-boiling fluid for cooler resources.`,
      ],
      keyIdeas: [
        r`Flash fraction $x = \frac{h_{brine} - h_f}{h_{fg}}$ at separator pressure (throttling keeps h).`,
        r`Output $P = x\dot m(h_g - h_{ex})\eta_t\eta_g$; double flash and binary plants use more of the heat.`,
        r`Dry steam, flash and binary types; brine is reinjected.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Flash fraction and output',
          problem: r`A well gives 100 kg/s of fluid at 1100 kJ/kg, flashed at 6 bar ($h_f = 670.4$, $h_{fg} = 2085.8$). The steam expands from 2756 to 2300 kJ/kg at 85% turbine and 97% generator efficiency. Find the steam fraction and output.`,
          steps: [
            r`$x = \frac{1100 - 670.4}{2085.8} = 0.206$: 20.6 kg/s of steam.`,
            r`$P = 0.206 \times 100 \times 456 \times 0.85 \times 0.97 = 7.75$ MW.`,
          ],
          answer: r`0.206; 7.75 MW.`,
        },
        {
          level: 'board',
          title: 'Where the rest goes',
          problem: r`In the same plant, how much brine goes to reinjection, and how much enthalpy (measured from 0 °C water) does it take with it?`,
          steps: [r`Brine $= 100(1 - 0.206) = 79.4$ kg/s, at $h_f = 670.4$ kJ/kg: it carries $79.4 \times 670.4 = 53.2$ MW of enthalpy back underground.`],
          answer: r`79.4 kg/s, about 53 MW of enthalpy: why double-flash and binary plants exist.`,
        },
      ],
      traps: [
        r`Only the flashed fraction goes to the turbine; the rest leaves as brine.`,
        r`Throttling is at constant ENTHALPY, not constant temperature.`,
      ],
      check: [
        { q: r`Which geothermal plant suits a low-temperature resource?`, a: r`A binary plant.` },
        { q: r`Why is brine reinjected?`, a: r`To dispose of it safely and keep the reservoir's pressure up.` },
      ],
    },
    {
      name: 'Nuclear Plants',
      inShort: r`Fission heat raises steam; a little fuel releases enormous energy.`,
      body: [
        r`Splitting a U-235 nucleus releases about 200 MeV and two or three neutrons, which split further nuclei: a chain reaction. A **moderator** (water, graphite) slows the neutrons so they fission more readily, **control rods** absorb them to hold the reaction steady, and the coolant carries the heat to raise steam. One gram of U-235 fissioned gives about $8.2 \times 10^{10}$ J, nearly a megawatt-day.`,
        r`| Reactor | Coolant and moderator | Steam |
|---|---|---|
| PWR (pressurized water) | water under pressure | in a separate steam generator |
| BWR (boiling water) | water, boiling in the core | straight from the reactor |
| PHWR (CANDU) | heavy water | separate steam generator; natural uranium |
| Fast breeder | liquid sodium, no moderator | breeds new fuel |`,
        r`The reactor is held critical by its **reactivity**, $\rho = \frac{k_{eff} - 1}{k_{eff}}$: zero when each fission causes exactly one more.`,
      ],
      keyIdeas: [
        r`About 200 MeV per fission: 1 g of U-235 fissioned gives about 0.95 MWd of heat.`,
        r`Reactivity $\rho = \frac{k_{eff} - 1}{k_{eff}}$; moderators slow neutrons, control rods absorb them.`,
        r`PWR and BWR are the common types; efficiency about 33%.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Fuel for a year',
          problem: r`How much U-235 does a 1000 MWe plant at 33% efficiency fission in a year at full output?`,
          steps: [
            r`Heat $= \frac{1000}{0.33}$ MW for a year $= 9.56 \times 10^{16}$ J.`,
            r`One gram gives $8.2 \times 10^{10}$ J, so $\frac{9.56 \times 10^{16}}{8.2 \times 10^{10}} = 1.165 \times 10^6$ g.`,
          ],
          answer: r`About 1165 kg.`,
        },
        {
          level: 'board',
          title: 'Energy per gram from first principles',
          problem: r`Check the energy per gram: 200 MeV per fission, $1.602 \times 10^{-13}$ J per MeV, $6.022 \times 10^{23}$ atoms per 235 g.`,
          steps: [r`$\frac{200 \times 1.602 \times 10^{-13} \times 6.022 \times 10^{23}}{235} = 8.21 \times 10^{10}$ J per gram.`],
          answer: r`$8.21 \times 10^{10}$ J/g.`,
        },
      ],
      traps: [
        r`Use thermal energy, not electrical output, with the energy per fission.`,
        r`Control rods ABSORB neutrons; the moderator only slows them.`,
      ],
      check: [
        { q: r`What does a moderator do?`, a: r`Slows fast neutrons so they cause fission more readily.` },
        { q: r`What is the reactivity of a critical reactor?`, a: r`Zero ($k_{eff} = 1$).` },
      ],
    },
    {
      name: 'Solar PV',
      inShort: r`Cells convert sunlight directly; output depends on irradiance and cell temperature.`,
      body: [
        r`A photovoltaic cell turns sunlight directly into dc. Its current is nearly constant up to near the open-circuit voltage, then collapses, so its power peaks at one point, the **maximum power point**, which the inverter's tracker (MPPT) seeks:`,
        {
          type: 'plot',
          alt: 'A module’s power against its voltage: rising almost in a straight line, peaking at 428 W at 42.9 V, then falling steeply to zero at the 49.5 V open-circuit voltage.',
          caption: 'Power against voltage for one module: the tracker holds it at the peak, 428 W at 42.9 V.',
          x: [0, 50],
          y: [0, 480],
          xLabel: 'V (V)',
          yLabel: 'P (W)',
          series: [{ f: (v) => Math.max(0, v * pvCurrent(v)), label: 'P', area: true }],
          marks: [{ x: 42.86, label: 'MPP' }],
        },
        r`Rated output is at standard test conditions (1000 W/m², 25 °C cell). In the field, $P = P_{STC}\frac{G}{1000}[1 + \gamma(T_c - 25)]$, and the cell runs well above the air: $T_c = T_a + \frac{\text{NOCT} - 20}{800}G$. An array is sized from the daily energy and the peak sun hours: $\frac{E_{daily}}{\text{PSH} \times \eta_{sys}}$.`,
      ],
      keyIdeas: [
        r`Derating: $P = P_{STC}\frac{G}{1000}[1 + \gamma(T_c - 25)]$, $T_c = T_a + \frac{\text{NOCT} - 20}{800}G$.`,
        r`Array size $= \frac{E_{daily}}{\text{PSH} \times \eta_{sys}}$; battery $C = \frac{ED}{V\cdot\text{DoD}\cdot\eta}$.`,
        r`Grid-tied (net metering), off-grid and hybrid systems.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Hot-module output and array size',
          problem: r`A 400 W module (NOCT 45 °C, γ = −0.4%/°C) is in full sun at 32 °C. Find its output. How many such modules supply 20 kWh/day at 5 peak sun hours and 0.78 derate?`,
          steps: [
            r`$T_c = 32 + \frac{25}{800} \times 1000 = 63.3$ °C: $P = 400(1 - 0.004 \times 38.3) = 339$ W.`,
            r`Array $= \frac{20}{5 \times 0.78} = 5.13$ kW: 13 modules.`,
          ],
          answer: r`339 W; 13 modules.`,
        },
        {
          level: 'board',
          title: 'The maximum power point',
          problem: r`A module's current is $10.5\left(1 - e^{(V - 49.5)/2.2}\right)$ A. Find its power at 40 V, 42.9 V and 45 V.`,
          steps: [
            r`40 V: $40 \times 10.5(1 - e^{-4.32}) = 414$ W.`,
            r`42.9 V: $42.9 \times 10.5(1 - e^{-3.0}) = 428$ W, the peak.`,
            r`45 V: $45 \times 10.5(1 - e^{-2.05}) = 411$ W.`,
          ],
          answer: r`414, 428 and 411 W: the maximum is near 42.9 V.`,
        },
      ],
      traps: [
        r`Hot cells lose power: use the cell temperature, not the air temperature.`,
        r`Round the number of modules UP.`,
      ],
      check: [
        { q: r`What does MPPT do?`, a: r`Keeps the array at the voltage where its power is greatest.` },
        { q: r`What are standard test conditions?`, a: r`1000 W/m² irradiance and 25 °C cell temperature.` },
      ],
    },
    {
      name: 'Wind',
      inShort: r`Turbines take kinetic energy from the wind, at most 59.3% of it.`,
      body: [
        r`The wind's power through a rotor of swept area A is $\frac12\rho Av^3$, and no turbine can take more than $\frac{16}{27} = 59.3\%$ of it (the **Betz limit**). Because power goes with the cube of speed, a turbine is built to reach its rating at a moderate wind and hold it there:`,
        {
          type: 'plot',
          alt: 'The power curve of a 2 MW turbine against wind speed: nothing below the 3 m/s cut-in, rising as the cube of speed to 2 MW at 12 m/s, flat to 25 m/s, then cut out to zero.',
          caption: 'A 2 MW power curve: cut in at 3 m/s, rated at 12 m/s, cut out at 25 m/s to protect the machine.',
          x: [0, 28],
          y: [0, 2.4],
          xLabel: 'v (m/s)',
          yLabel: 'P (MW)',
          series: [{ f: windPower, label: 'P', area: true }],
          marks: [{ x: 12, label: 'rated' }, { x: 25, label: 'cut out' }],
        },
        r`Wind speed rises with height (the 1/7 power law), so tall towers pay. The **tip-speed ratio** $\lambda = \frac{\omega R}{v}$ is best near 6 to 8 for three-blade rotors.`,
      ],
      keyIdeas: [
        r`$P = \frac12\rho Av^3C_p$, with $C_p \le \frac{16}{27}$ (Betz).`,
        r`Tip-speed ratio $\lambda = \frac{\omega R}{v}$, best near 6 to 8 for three blades.`,
        r`Shear: $v_2 = v_1\left(\frac{h_2}{h_1}\right)^{1/7}$; power goes as $v^3$, so height pays.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Hub height and tip speed',
          problem: r`Wind is 6 m/s at a 10 m mast. Estimate it at an 80 m hub, and the power gain. A 50 m blade turns at 15 rpm in 10 m/s wind: find its tip-speed ratio.`,
          steps: [
            r`$v = 6 \times 8^{1/7} = 8.08$ m/s; power ratio $\left(\frac{8.08}{6}\right)^3 = 2.44$.`,
            r`$\lambda = \frac{2\pi \times 15 \times 50}{60 \times 10} = 7.85$.`,
          ],
          answer: r`8.08 m/s, 2.44 times the power; λ = 7.85.`,
        },
        {
          level: 'board',
          title: 'The Betz limit',
          problem: r`A rotor of 50 m radius faces 10 m/s wind (air 1.225 kg/m³). Find the power in the wind and the most any turbine could take.`,
          steps: [
            r`$A = \pi \times 50^2 = 7854$ m²: $\frac12 \times 1.225 \times 7854 \times 10^3 = 4.81$ MW.`,
            r`$\times\frac{16}{27}$: 2.85 MW at most.`,
          ],
          answer: r`4.81 MW in the wind; at most 2.85 MW.`,
        },
      ],
      traps: [
        r`Average power is not the power at the average wind speed: it depends on the cube.`,
        r`The Betz limit applies to the WIND's power, before gearbox and generator losses.`,
      ],
      check: [
        { q: r`Doubling the wind speed changes the power how?`, a: r`Eight times.` },
        { q: r`Why do turbines cut out in very high wind?`, a: r`To protect the machine from damaging loads.` },
      ],
    },
    {
      name: 'Biomass',
      inShort: r`Burning bagasse, rice husk and wood residues; moisture is the enemy.`,
      body: [
        r`Biomass plants burn agricultural and wood residues (in the Philippines, bagasse from sugar mills, rice husk, coconut shells) in a boiler on a steam cycle, or gasify them, or digest them to biogas. Water in the fuel both dilutes it and takes heat to evaporate, so the as-fired heating value falls fast with moisture: $\text{LHV}_{wet} = \text{LHV}_{dry}(1 - w) - 2.44w$ MJ/kg:`,
        {
          type: 'plot',
          alt: 'The as-fired heating value of bagasse, 19 MJ/kg dry, against its moisture fraction: falling in a straight line to 8.28 MJ/kg at 50 percent moisture.',
          caption: 'Bagasse (19 MJ/kg dry) loses heating value fast with moisture: 8.28 MJ/kg at 50%.',
          x: [0, 0.7],
          y: [0, 20],
          xLabel: 'moisture w',
          yLabel: 'LHV (MJ/kg)',
          series: [{ f: (w) => 19 * (1 - w) - 2.44 * w, label: 'LHV', area: true }],
          marks: [{ x: 0.5, label: '50%' }],
        },
      ],
      keyIdeas: [
        r`Output $P = \frac{\dot m_f\text{HV}\eta}{3600}$ kW (kg/h, kJ/kg).`,
        r`Wet basis: $\text{LHV}_{wet} = \text{LHV}_{dry}(1 - w) - 2.44w$ MJ/kg.`,
        r`Sugar mills cogenerate with bagasse; gasification and biogas are other routes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Bagasse as fired',
          problem: r`Bagasse at 50% moisture (19 MJ/kg dry) is fed at 10 t/h to a plant of 22% efficiency. Find its heating value as fired and the output.`,
          steps: [
            r`$\text{LHV} = 19 \times 0.5 - 2.44 \times 0.5 = 8.28$ MJ/kg.`,
            r`$P = \frac{10\,000 \times 8280 \times 0.22}{3600} = 5.06$ MW.`,
          ],
          answer: r`8.28 MJ/kg; 5.06 MW.`,
        },
        {
          level: 'board',
          title: 'Drying the fuel first',
          problem: r`If the same dry matter (5 t/h) were dried and fired at 30% moisture instead, what would the output be?`,
          steps: [
            r`At 30%: $\text{LHV} = 19 \times 0.7 - 2.44 \times 0.3 = 12.57$ MJ/kg, and the 5 t/h of dry matter is now $\frac{5}{0.7} = 7.14$ t/h as fired.`,
            r`$P = \frac{7143 \times 12\,568 \times 0.22}{3600} = 5.49$ MW: 8% more from the same dry fuel.`,
          ],
          answer: r`About 5.49 MW.`,
        },
      ],
      traps: [
        r`Never use a dry-basis heating value for wet fuel.`,
        r`Compare fuels on the same DRY mass, not the wet tonnage.`,
      ],
      check: [
        { q: r`What is bagasse?`, a: r`The fibre left after crushing sugarcane, burned in sugar-mill boilers.` },
        { q: r`Why does moisture lower the heating value twice over?`, a: r`It dilutes the fuel and takes heat to evaporate.` },
      ],
    },
    {
      name: 'Plant Economics',
      inShort: r`The cost of each kWh, and which plant to build for which duty.`,
      body: [
        r`A kWh's cost is the plant's fixed charges (capital recovered at $\text{CRF} = \frac{i(1 + i)^n}{(1 + i)^n - 1}$, plus fixed O&M) plus its running cost (fuel, variable O&M), spread over the energy produced. Plants with high fixed and low running costs win when run many hours; the opposite for peakers:`,
        {
          type: 'plot',
          alt: 'Annual cost per kW against hours run for a base plant (9000 pesos fixed plus 3 per kWh) and a peaker (3000 fixed plus 8 per kWh): the lines cross at 1200 hours, below which the peaker is cheaper.',
          caption: 'Annual cost per kW against hours run: the peaker is cheaper below 1200 h a year, the base plant above.',
          x: [0, 3000],
          y: [0, 35000],
          xLabel: 'hours run per year',
          yLabel: '₱ per kW·yr',
          series: [
            { f: (h) => 9000 + 3 * h, label: 'base plant' },
            { f: (h) => 3000 + 8 * h, label: 'peaker', dashed: true },
          ],
          marks: [{ x: 1200, label: '1200 h' }],
        },
        r`| Tariff | Charges |
|---|---|
| Uniform (flat) rate | a fixed price per kWh |
| Block rate | blocks of energy at falling prices |
| Two-part | per kW of maximum demand + per kWh |
| Three-part (Doherty) | fixed per bill + per kW + per kWh |
| Power-factor tariff | kWh multiplied up below a pf band, down above it |`,
        r`Correcting power factor saves demand charges but costs equipment; the **most economical power factor** is $\sqrt{1 - \left(\frac{Bi}{100A}\right)^2}$, with A the annual charge per kVA of demand, B the cost per kvar of correction and i the annual interest and depreciation in percent. **Kelvin's law** sizes conductors the same way: the best cross-section makes the annual interest and depreciation on the conductor equal the annual cost of its losses.`,
      ],
      keyIdeas: [
        r`Cost per kWh $= \frac{C_{cap}\text{CRF} + C_{O\&M} + C_{fuel}}{E}$, $\text{CRF} = \frac{i(1 + i)^n}{(1 + i)^n - 1}$.`,
        r`Two-part tariff $aP_{\max} + bE$; break-even hours $\frac{F_1 - F_2}{v_2 - v_1}$.`,
        r`Most economical pf $\sqrt{1 - \left(\frac{Bi}{100A}\right)^2}$; Kelvin's law for conductor size.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Cost per kWh, and break-even hours',
          problem: r`A ₱5 billion plant (10%, 25 years) has ₱100 M O&M and ₱900 M fuel a year for 700 GWh. Find the cost per kWh. Base plant: ₱9000/kW·yr fixed, ₱3/kWh; peaker: ₱3000/kW·yr, ₱8/kWh. Above how many hours is base cheaper?`,
          steps: [
            r`CRF $= 0.1102$: capital $5000 \times 0.1102 = 551$ M a year.`,
            r`$\frac{551 + 100 + 900}{700}$ = ₱2.22/kWh.`,
            r`Break-even $= \frac{9000 - 3000}{8 - 3} = 1200$ h/yr.`,
          ],
          answer: r`₱2.22/kWh; 1200 h.`,
        },
        {
          level: 'board',
          title: 'The most economical power factor',
          problem: r`A tariff charges ₱1200 per kVA of maximum demand a year. Correction costs ₱3000 per kvar, with 12% a year for interest and depreciation. Find the most economical power factor.`,
          steps: [
            r`$\frac{Bi}{100A} = \frac{3000 \times 12}{100 \times 1200} = 0.3$.`,
            r`pf $= \sqrt{1 - 0.3^2} = 0.954$.`,
          ],
          answer: r`About 0.954.`,
        },
      ],
      traps: [
        r`Fixed cost per kWh depends on capacity factor: a peaker running few hours has costly kWh.`,
        r`Correcting to unity is rarely economic: the last kvar costs the most and saves the least.`,
      ],
      check: [
        { q: r`What does a three-part tariff charge?`, a: r`A fixed charge per bill, a charge per kW of maximum demand, and one per kWh.` },
        { q: r`State Kelvin's law.`, a: r`The most economical conductor makes the annual capital charges on it equal to the annual cost of its energy loss.` },
      ],
    },
    {
      name: 'Plant Auxiliaries',
      inShort: r`Pumps, fans, mills and cooling systems that the plant itself runs.`,
      body: [
        r`A plant uses part of its own output: feed and circulating pumps, forced- and induced-draft fans, coal mills, cooling towers, conveyors, lighting and controls. Steam plants use about 5% to 10% of their gross output this way, hydro plants about 1%.`,
        r`| Auxiliary | Power |
|---|---|
| Pump | $\frac{\rho gQH}{\eta}$ |
| Fan | $\frac{Q\Delta p}{\eta}$ |
| Net output | $P_{gross} - P_{aux}$ |
| Net heat rate | $\text{HR}_{gross}\frac{P_{gross}}{P_{net}}$ |`,
        r`| Equipment | Job |
|---|---|
| Economizer | heats feedwater with flue gas |
| Air preheater | heats combustion air with flue gas |
| Electrostatic precipitator | removes ash from the flue gas |
| Cooling tower | rejects condenser heat to the air |
| Deaerator | strips dissolved gases from feedwater |`,
      ],
      keyIdeas: [
        r`Pump $\frac{\rho gQH}{\eta}$, fan $\frac{Q\Delta p}{\eta}$.`,
        r`Net output $= P_{gross} - P_{aux}$; net heat rate $= \text{HR}_{gross}\frac{P_{gross}}{P_{net}}$.`,
        r`Steam plants use about 5% to 10% of output for auxiliaries; hydro about 1%.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A feed pump, and net heat rate',
          problem: r`A feed pump moves 0.5 m³/s against 120 m at 80% efficiency. Find its power. A 100 MW unit with 7 MW of auxiliaries has a gross heat rate of 10 000 kJ/kWh: find the net heat rate.`,
          steps: [
            r`$P = \frac{1000 \times 9.81 \times 0.5 \times 120}{0.8} = 736$ kW.`,
            r`Net heat rate $= 10\,000 \times \frac{100}{93} = 10\,753$ kJ/kWh.`,
          ],
          answer: r`736 kW; 10 753 kJ/kWh.`,
        },
        {
          level: 'board',
          title: 'A draft fan',
          problem: r`An induced-draft fan moves 150 m³/s of flue gas against 3 kPa at 75% efficiency. Find its power and its share of a 100 MW unit's output.`,
          steps: [r`$P = \frac{150 \times 3000}{0.75} = 600$ kW, 0.6% of the output.`],
          answer: r`600 kW; 0.6%.`,
        },
      ],
      traps: [
        r`Quote heat rate on the same basis (gross or net) when comparing plants.`,
        r`Use the pump's head in metres of the fluid it moves.`,
      ],
      check: [
        { q: r`What removes ash particles from flue gas?`, a: r`An electrostatic precipitator.` },
        { q: r`What does an economizer do?`, a: r`Heats the feedwater with flue gas leaving the boiler.` },
      ],
    },
  ],
};
