// Library › Lessons › ESAS › Basic Thermodynamics
// (2026-11-17; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// thermoLesson.test.js. Coverage and problem styles cross-checked against a
// review center's thermodynamics handout; the text, problems and figures are
// this app's own): written for the Philippine REE board, subtopic by subtopic
// in the syllabus's order. Physics for Engineers covers heat, temperature
// scales and heat transfer.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Saturated water from the steam tables, rounded: [s (kJ/kg·K), T (°C)], up the
// liquid line to the critical point and down the vapour line.
const LIQUID = [
  [0, 0.01], [0.2966, 20], [0.6493, 45.81], [0.7038, 50], [1.3069, 100], [1.8418, 150],
  [2.3309, 200], [2.6457, 233.85], [2.7927, 250], [3.2534, 300], [3.4495, 320], [3.6605, 340],
  [3.7783, 350], [3.9165, 360], [4.1137, 370],
];
const CRITICAL = [4.407, 373.95];
const VAPOUR = [
  [4.7173, 370], [5.0536, 360], [5.2141, 350], [5.3359, 340], [5.5372, 320], [5.7045, 300], [6.073, 250], [6.1869, 233.85], [6.4323, 200], [6.8379, 150],
  [7.3549, 100], [8.0763, 50], [8.1502, 45.81], [8.6672, 20], [9.1556, 0.01],
];
const DOME = [...LIQUID, CRITICAL, ...VAPOUR];
const at10kPa = (side) => side.find(([, t]) => t === 45.81);

// The Rankine cycle of the worked example: 10 kPa and 3 MPa, 350 °C (pump rise ignored in the drawing).
const RANKINE = [
  [0.6493, 45.81], ...LIQUID.filter(([, t]) => t > 46 && t <= 233.85), [6.1869, 233.85],
  [6.2872, 250], [6.539, 300], [6.7428, 350], [6.7428, 45.81], [0.6493, 45.81],
];

// 1 kg of ice from −20 °C to steam at 120 °C at 1 atm: [heat added (kJ), T (°C)].
const HEATING = (() => {
  const steps = [[2.1 * 20, 0], [334, 0], [4.186 * 100, 100], [2257, 100], [2.0 * 20, 120]];
  let q = 0;
  return [[0, -20], ...steps.map(([dq, t]) => [(q += dq), t])];
})();

const otto = (r8) => 1 - r8 ** -0.4;
const diesel = (rc) => (rr) => 1 - (rr ** -0.4 * (rc ** 1.4 - 1)) / (1.4 * (rc - 1));

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
      body: [
        r`Thermodynamics studies a chosen **system** across its **boundary** from the **surroundings**. A **closed** system (control mass) keeps its mass; an **open** system (control volume: a turbine, pump, nozzle) lets mass flow through; an **isolated** one exchanges neither mass nor energy. **Intensive** properties (T, p, density) don't depend on size; **extensive** ones (mass, volume, energy) do. Divide an extensive property by mass to get a specific one (v, u, h, s).`,
        r`Properties need **absolute** values: $T(K) = T(°C) + 273.15$, $T(°R) = T(°F) + 460$; a temperature CHANGE of 1 °C = 1 K = 1.8 °F = 1.8 °R. Absolute pressure = gauge + atmospheric; a vacuum is negative gauge.

| One standard atmosphere | |
|---|---|
| SI | 101.325 kPa = 1.013 bar |
| Mercury | 760 mm Hg = 29.92 in Hg = 760 torr |
| English | 14.7 psi |`,
        r`Heat that changes temperature is **sensible**, $Q = mc\Delta T$ (water 4.186 kJ/kg·K = 1 cal/g·°C = 1 BTU/lb·°F); heat that changes phase at constant temperature is **latent**, $Q = mL$ (ice melts with 334 kJ/kg = 80 cal/g = 144 BTU/lb; water boils with 2257 kJ/kg = 540 cal/g = 970 BTU/lb). Heating ice to steam shows both: the flats are the phase changes, and boiling takes by far the most heat:`,
        {
          type: 'plot',
          alt: 'Temperature against heat added to 1 kg of ice at minus 20 degrees Celsius at one atmosphere: a short rise to 0, a flat of 334 kJ while it melts, a rise to 100 over 419 kJ, a long flat of 2257 kJ while it boils, then a short rise as steam.',
          caption: '1 kg of ice to steam at 1 atm: melting (334 kJ) and boiling (2257 kJ) hold the temperature flat.',
          x: [0, 3200],
          y: [-40, 140],
          xLabel: 'heat added (kJ)',
          yLabel: 'T (°C)',
          series: [{ points: HEATING, label: 'T' }],
        },
        r`A **process** takes a system between states along a **path**; a **cycle** returns it to its start. Power plants are rated by **thermal efficiency** $\eta = \frac{W_{net}}{Q_{in}}$, or its reciprocal the **heat rate**, $\frac{3600}{\eta}$ kJ/kWh.`,
      ],
      keyIdeas: [
        r`Closed system: fixed mass. Open (control volume): mass crosses. Isolated: nothing crosses.`,
        r`Absolute values: K = °C + 273.15, °R = °F + 460; $p_{abs} = p_{gauge} + p_{atm}$; 1 atm = 101.325 kPa = 760 mm Hg = 14.7 psi.`,
        r`Sensible $Q = mc\Delta T$; latent $Q = mL$ (ice 334 kJ/kg, boiling water 2257 kJ/kg); heat rate $\frac{3600}{\eta}$ kJ/kWh.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Heat rate',
          problem: r`A power plant converts 36% of its fuel heat into electricity. Find its heat rate.`,
          steps: [r`$\frac{3600}{0.36} = 10\,000$ kJ/kWh: it burns fuel worth 10 MJ for every kilowatt-hour sent out.`],
          answer: r`10 000 kJ/kWh.`,
        },
        {
          level: 'board',
          title: 'Ice in a calorimeter',
          problem: r`60 g of ice at 0 °C drops into 250 g of water at 45 °C in a 120 g copper calorimeter (c = 0.093 cal/g·°C). Find the final temperature (ice melts with 80 cal/g).`,
          steps: [
            r`Water and cup give up $(250 + 120 \times 0.093)(45 - T) = 261.16(45 - T)$ cal.`,
            r`The ice takes $60 \times 80 + 60T$ cal to melt and warm.`,
            r`$261.16 \times 45 - 4800 = 321.16T$, so $T = 21.6$ °C.`,
          ],
          answer: r`21.6 °C (all the ice melts).`,
        },
      ],
      traps: [
        r`kPa × m³ = kJ: keep pressure in kPa when volumes are in m³.`,
        r`Check that all the ice melts: if the warm side can't supply the latent heat, the mix sits at 0 °C.`,
      ],
      check: [
        { q: r`Which law says two bodies in equilibrium with a third are in equilibrium with each other?`, a: r`The zeroth law (it makes thermometers possible).` },
        { q: r`Is volume intensive or extensive?`, a: r`Extensive; specific volume is intensive.` },
      ],
    },
    {
      name: 'First Law of Thermodynamics',
      inShort: r`Energy is conserved: heat and work change the stored energy.`,
      body: [
        r`Energy can't be created or destroyed, only changed in form. For a **closed system**, heat in minus work out changes the internal energy: $Q - W = \Delta U$. Boundary work is $\int p\,dV$, the area under the path on a p–V diagram, so it depends on the path, not just the end states:`,
        {
          type: 'plot',
          alt: 'Two paths on a p-V diagram from 400 kPa and 0.2 cubic metres to 100 kPa and 0.8 cubic metres: path A, solid and shaded, expands at 400 kPa then drops pressure, doing 240 kJ; path B, dashed, drops pressure first then expands at 100 kPa, doing 60 kJ.',
          caption: 'Same end states, different work: expanding at 400 kPa (solid, shaded) does 240 kJ; at 100 kPa (dashed), 60 kJ.',
          x: [0, 1],
          y: [0, 500],
          xLabel: 'V (m³)',
          yLabel: 'p (kPa)',
          series: [
            { points: [[0.2, 400], [0.8, 400], [0.8, 100]], label: 'A', area: true },
            { points: [[0.2, 400], [0.2, 100], [0.8, 100]], label: 'B', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`For an **open system** in steady flow, add the **flow work** pv to u to get the enthalpy $h = u + pv$: $\dot Q - \dot W = \dot m\left[\Delta h + \frac{\Delta v^2}{2} + g\Delta z\right]$. Turbines, compressors, nozzles, throttles and heat exchangers are all this one equation with different terms dropped.`,
        r`| Device | What the steady-flow equation becomes |
|---|---|
| Turbine, compressor | $\dot W = \dot m(h_1 - h_2)$ (adiabatic, KE small) |
| Nozzle | $v_2 = \sqrt{2(h_1 - h_2)}$, or $44.72\sqrt{h_1 - h_2}$ with h in kJ/kg |
| Throttle | $h_2 = h_1$ |
| Heat exchanger, cooler | $\dot Q = \dot mc_p\Delta T$ |`,
      ],
      keyIdeas: [
        r`Closed: $Q - W = \Delta U$. Steady flow: $\dot Q - \dot W = \dot m[\Delta h + \Delta\frac{v^2}{2} + g\Delta z]$.`,
        r`Turbine $\dot W = \dot m(h_1 - h_2)$; nozzle $v_2 \approx 44.72\sqrt{h_1 - h_2}$; throttle $h_1 = h_2$.`,
        r`Boundary work $\int p\,dV$ depends on the path.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A steam turbine',
          problem: r`Steam enters a turbine at 2 kg/s with $h = 3115.3$ kJ/kg and leaves at 2300 kJ/kg. Neglecting heat loss and kinetic energy, find the power.`,
          steps: [r`$\dot W = 2(3115.3 - 2300) = 1630.6$ kW, about 1.63 MW.`],
          answer: r`1630.6 kW.`,
        },
        {
          level: 'board',
          title: 'Cooling air for an alternator',
          problem: r`A 25 MVA alternator runs at full load, 0.85 power factor, 97% efficient. Its cooling air enters at 20 °C and leaves at 40 °C ($c_p$ = 1.005 kJ/kg·K, 1.2 kg/m³). How much air does it need?`,
          steps: [
            r`Output $25 \times 0.85 = 21.25$ MW; input $\frac{21.25}{0.97} = 21.907$ MW; losses 657.2 kW.`,
            r`$\dot m = \frac{657.2}{1.005 \times 20} = 32.70$ kg/s.`,
            r`$\frac{32.70}{1.2} = 27.25$ m³/s.`,
          ],
          answer: r`About 27.25 m³/s.`,
        },
      ],
      traps: [
        r`Mind the sign convention: work BY the system and heat INTO it are positive.`,
        r`The losses, not the output, heat the cooling air.`,
      ],
      check: [
        { q: r`A battery is charged with 864 kJ of electrical work and loses 100 kJ of heat. What is its change of internal energy?`, a: r`$-100 - (-864) = +764$ kJ.` },
        { q: r`What property stays the same across a throttling valve?`, a: r`Enthalpy.` },
      ],
    },
    {
      name: 'Ideal Gas Laws',
      inShort: r`$pV = mRT$ and how the specific heats of a gas are related.`,
      body: [
        r`At low pressure and high temperature real gases obey $pV = mRT$ (or $pV = nR_uT$), which holds Boyle's law (T constant), Charles's law (p or V constant) and Avogadro's law together. The gas constant is the universal one over the molar mass, $R = \frac{R_u}{M}$ with $R_u = 8.314$ kJ/kmol·K (1545 ft·lb/lbmol·°R): air 0.287 kJ/kg·K. At a fixed temperature p falls as $\frac1V$ along an **isotherm**, higher for hotter gas:`,
        {
          type: 'plot',
          alt: 'Pressure against volume for 1 kg of air at 300, 400 and 500 kelvin: three hyperbolas, the hottest highest, each falling as one over the volume.',
          caption: 'Isotherms of 1 kg of air at 300, 400 and 500 K (lowest to highest): p falls as 1/V.',
          x: [0.2, 1.5],
          y: [0, 800],
          xLabel: 'V (m³)',
          yLabel: 'p (kPa)',
          series: [300, 400, 500].map((t, i) => ({ f: (v) => (0.287 * t) / v, label: `${t} K`, colour: colourOf(i) })),
          legend: false,
        },
        r`An ideal gas's u and h depend on temperature only, so $\Delta U = mc_v\Delta T$ and $\Delta H = mc_p\Delta T$ for ANY process, with $c_p - c_v = R$, $k = \frac{c_p}{c_v}$, $c_v = \frac{R}{k - 1}$. In a mixture each gas exerts its own **partial pressure** as if alone (Dalton), and they add to the total.`,
      ],
      keyIdeas: [
        r`$pV = mRT$ with $R = \frac{R_u}{M}$ (air 0.287 kJ/kg·K); for a fixed mass $\frac{p_1V_1}{T_1} = \frac{p_2V_2}{T_2}$.`,
        r`$c_p - c_v = R$, $k = \frac{c_p}{c_v}$; air $c_p = 1.005$, $c_v = 0.718$, $k = 1.4$.`,
        r`$\Delta U = mc_v\Delta T$ and $\Delta H = mc_p\Delta T$ for any process; mixtures by Dalton's partial pressures.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Volume and gas constant',
          problem: r`What volume does 1 kg of air occupy at 100 kPa and 300 K? What is the gas constant of CO₂ (M = 44)?`,
          steps: [
            r`$V = \frac{1 \times 0.287 \times 300}{100} = 0.861$ m³.`,
            r`$R_{CO_2} = \frac{8.314}{44} = 0.189$ kJ/kg·K.`,
          ],
          answer: r`0.861 m³; 0.189 kJ/kg·K.`,
        },
        {
          level: 'board',
          title: 'A hot tyre',
          problem: r`A tyre holding 0.12 kg of air is at 210 kPa gauge and 20 °C; on the road it warms to 50 °C at constant volume (atmosphere 101.325 kPa). Find the new gauge pressure. If a relief valve holds it at 230 kPa gauge instead, how much air escapes?`,
          steps: [
            r`$p_2 = 311.325 \times \frac{323.15}{293.15} = 343.18$ kPa abs, or 241.9 kPa gauge.`,
            r`With the valve, $\frac{m_2}{m_1} = \frac{331.325}{311.325} \times \frac{293.15}{323.15} = 0.9654$.`,
            r`Escapes $0.12(1 - 0.9654) = 0.00415$ kg, about 4.1 g.`,
          ],
          answer: r`241.9 kPa gauge; about 4.1 g.`,
        },
      ],
      traps: [
        r`Gauge pressure in $pV = mRT$ is wrong: add the atmosphere.`,
        r`Temperatures in the gas laws must be absolute.`,
      ],
      check: [
        { q: r`A gas's absolute temperature doubles while its pressure halves. What happens to its volume?`, a: r`It quadruples.` },
        { q: r`What is $c_v$ of a gas with R = 0.287 and k = 1.4?`, a: r`$\frac{0.287}{0.4} = 0.718$ kJ/kg·K.` },
      ],
    },
    {
      name: 'Processes of Ideal Gases',
      inShort: r`Constant pressure, volume and temperature, isentropic and polytropic changes.`,
      body: [
        r`Every reversible process of an ideal gas is a **polytropic** one, $pV^n = C$, with its own exponent: n = 0 at constant pressure, 1 at constant temperature, k when adiabatic and reversible (**isentropic**), and ∞ at constant volume. From the same start, the higher n, the faster the pressure falls as the gas expands, and the less work it does:`,
        {
          type: 'plot',
          alt: 'Pressure against volume for expansions from 500 kPa and 0.2 cubic metres to 1 cubic metre: constant pressure stays at 500; isothermal falls to 100 kPa; isentropic, dashed, falls further, to 52.5 kPa.',
          caption: 'From 500 kPa, 0.2 m³: constant pressure (top), isothermal (middle) and isentropic (dashed, lowest).',
          x: [0.2, 1],
          y: [0, 600],
          xLabel: 'V (m³)',
          yLabel: 'p (kPa)',
          series: [
            { f: () => 500, label: 'n = 0' },
            { f: (v) => 500 * (0.2 / v), label: 'n = 1', colour: colourOf(1) },
            { f: (v) => 500 * (0.2 / v) ** 1.4, label: 'n = k', dashed: true, colour: colourOf(2) },
          ],
          legend: false,
        },
        r`| Process | n | Work $\int p\,dV$ | Heat |
|---|---|---|---|
| Constant volume | ∞ | 0 | $mc_v\Delta T$ |
| Constant pressure | 0 | $p\Delta V = mR\Delta T$ | $mc_p\Delta T$ |
| Isothermal | 1 | $p_1V_1\ln\frac{V_2}{V_1}$ | = work |
| Isentropic | k | $\frac{mR(T_2 - T_1)}{1 - k}$ | 0 |
| Polytropic | n | $\frac{mR(T_2 - T_1)}{1 - n}$ | $W + \Delta U$ |`,
        r`Temperatures follow $\frac{T_2}{T_1} = \left(\frac{V_1}{V_2}\right)^{n-1} = \left(\frac{p_2}{p_1}\right)^{\frac{n-1}{n}}$. Entropy changes by $c_p\ln\frac{T_2}{T_1} - R\ln\frac{p_2}{p_1}$ per kg, whatever the path.`,
      ],
      keyIdeas: [
        r`Isobaric $W = mR\Delta T$, $Q = mc_p\Delta T$; isochoric $W = 0$, $Q = mc_v\Delta T$; isothermal $W = Q = p_1V_1\ln\frac{V_2}{V_1}$.`,
        r`Isentropic $pV^k = C$, $\frac{T_2}{T_1} = \left(\frac{p_2}{p_1}\right)^{\frac{k-1}{k}}$; polytropic $pV^n = C$, $W = \frac{p_2V_2 - p_1V_1}{1 - n}$.`,
        r`$\Delta s = c_p\ln\frac{T_2}{T_1} - R\ln\frac{p_2}{p_1}$, the same by any path.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Isothermal and isentropic',
          problem: r`1 kg of air at 300 K expands isothermally to three times its volume: find the work. Air at 300 K is compressed isentropically through a volume (compression) ratio of 8: find the final temperature and the work per kg.`,
          steps: [
            r`Isothermal: $0.287 \times 300 \times \ln3 = 94.6$ kJ.`,
            r`Isentropic: $T_2 = 300 \times 8^{0.4} = 689.2$ K.`,
            r`Work in $= 0.718(689.2 - 300) = 279.5$ kJ/kg.`,
          ],
          answer: r`94.6 kJ; 689.2 K and 279.5 kJ/kg.`,
        },
        {
          level: 'board',
          title: 'A polytropic compression',
          problem: r`0.5 kg of air at 100 kPa and 300 K is compressed polytropically (n = 1.3) to 800 kPa. Find the final temperature, the work and the heat.`,
          steps: [
            r`$T_2 = 300 \times 8^{0.3/1.3} = 484.8$ K.`,
            r`$W = \frac{0.5 \times 0.287 \times (484.8 - 300)}{1 - 1.3} = -88.4$ kJ (work done on the gas).`,
            r`$\Delta U = 0.5 \times 0.718 \times 184.8 = 66.3$ kJ; $Q = -88.4 + 66.3 = -22.0$ kJ (rejected).`,
          ],
          answer: r`484.8 K; 88.4 kJ in; 22.0 kJ rejected.`,
        },
      ],
      traps: [
        r`Use the volume ratio with exponent $n - 1$, the pressure ratio with $\frac{n-1}{n}$.`,
        r`Isentropic means adiabatic AND reversible; an adiabatic process with friction is not isentropic.`,
      ],
      check: [
        { q: r`Which process has no heat transfer?`, a: r`Adiabatic (isentropic when also reversible).` },
        { q: r`What is the polytropic exponent of an isothermal process?`, a: r`n = 1.` },
      ],
    },
    {
      name: 'Properties of Pure Substances',
      inShort: r`Water and steam: saturation, quality, superheat, and the steam tables.`,
      body: [
        r`At a given pressure water boils at one **saturation temperature**: 100 °C at 1 atm, lower on a mountain, higher in a boiler. On a temperature–entropy diagram the saturated states make a **dome**: saturated liquid up its left side, saturated vapour down its right, meeting at the **critical point** (22.06 MPa, 373.95 °C), above which liquid and vapour can't be told apart. Below the dome's left edge is compressed liquid; inside it, wet steam; right of it, superheated vapour:`,
        {
          type: 'plot',
          alt: 'The saturation dome of water on a temperature-entropy diagram, rising from 0 degrees on the left to the critical point at 374 degrees and falling back to the right; a dashed horizontal line at 45.8 degrees, the 10 kPa pressure, spans the dome from entropy 0.65 to 8.15.',
          caption: 'Water’s saturation dome, with the 10 kPa line (dashed, 45.8 °C) across the wet region.',
          x: [0, 10],
          y: [0, 420],
          xLabel: 's (kJ/kg·K)',
          yLabel: 'T (°C)',
          series: [
            { points: DOME, label: 'saturation' },
            { points: [at10kPa(LIQUID), at10kPa(VAPOUR)], label: '10 kPa', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`Inside the dome a state is fixed by the pressure and the **quality** x, the mass fraction that is vapour: $h = h_f + xh_{fg}$, and likewise v, u and s. A **triple point** (0.01 °C, 0.6117 kPa) is where ice, water and vapour coexist; below it ice **sublimes** straight to vapour.`,
      ],
      keyIdeas: [
        r`At a given pressure water boils at $T_{sat}$; between saturated liquid and vapour the state is set by quality $x$.`,
        r`$h = h_f + xh_{fg}$ (and $v$, $s$ likewise); at 1 atm, $T_{sat} = 100$ °C, $h_{fg} = 2257$ kJ/kg.`,
        r`Superheated: $T > T_{sat}$, use the superheat table. Compressed liquid: take $h_f$ at the temperature.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Quality from entropy',
          problem: r`Wet steam at 10 kPa has $s = 6.7428$ kJ/kg·K ($s_f = 0.6493$, $s_{fg} = 7.5009$, $h_f = 191.83$, $h_{fg} = 2392.8$). Find its quality and enthalpy.`,
          steps: [
            r`$x = \frac{6.7428 - 0.6493}{7.5009} = 0.812$.`,
            r`$h = 191.83 + 0.812 \times 2392.8 = 2135.7$ kJ/kg.`,
          ],
          answer: r`x = 0.812; 2135.7 kJ/kg.`,
        },
        {
          level: 'board',
          title: 'How much steam?',
          problem: r`1200 kJ of heat goes into 3 kg of water at 70 °C in an open pan at 1 atm. How much of it boils away?`,
          steps: [
            r`Warming to 100 °C takes $3 \times 4.186 \times 30 = 376.7$ kJ.`,
            r`The rest boils water: $\frac{1200 - 376.7}{2257} = 0.365$ kg.`,
          ],
          answer: r`0.365 kg.`,
        },
      ],
      traps: [
        r`Compare $T$ with $T_{sat}$ at the pressure FIRST to pick the right table.`,
        r`Quality has no meaning outside the dome.`,
      ],
      check: [
        { q: r`What is the state at which ice, water and vapour coexist?`, a: r`The triple point.` },
        { q: r`What is the quality of saturated vapour?`, a: r`x = 1 (saturated liquid is 0).` },
      ],
    },
    {
      name: 'Processes of Pure Substances',
      inShort: r`Heating, expanding and throttling steam, using the tables.`,
      body: [
        r`Steam processes use the same first law as gases, but the properties come from the tables instead of $pv = RT$. Find the two properties that fix each state, look up the rest, and apply the energy equation:`,
        r`| Process | What stays fixed | Energy |
|---|---|---|
| Constant pressure (boiler, condenser) | p | $Q = m(h_2 - h_1)$, $W = pm(v_2 - v_1)$ |
| Constant volume (rigid tank) | v | $Q = m(u_2 - u_1)$, $W = 0$ |
| Isentropic (ideal turbine, pump) | s | $W = m(h_1 - h_2)$ |
| Throttling (valve) | h | $Q = W = 0$ |`,
        r`A **throttling calorimeter** measures the quality of nearly dry steam: throttled to a low pressure, it superheats, and the measured superheated enthalpy equals the unknown wet enthalpy.`,
      ],
      keyIdeas: [
        r`Constant pressure: $Q = m(h_2 - h_1)$; rigid tank: $Q = m(u_2 - u_1)$ with $v$ unchanged.`,
        r`Isentropic expansion: $s_2 = s_1$ gives $x_2$; throttling: $h_2 = h_1$.`,
        r`A throttling calorimeter finds the quality of nearly dry steam.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A throttling calorimeter',
          problem: r`Wet steam at 1 MPa ($h_f = 762.81$, $h_{fg} = 2015.3$) is throttled to 100 kPa, 120 °C, where $h = 2716.6$ kJ/kg. Find its original quality.`,
          steps: [r`$h_1 = h_2$: $x_1 = \frac{2716.6 - 762.81}{2015.3} = 0.969$, so 3.1% moisture.`],
          answer: r`0.969.`,
        },
        {
          level: 'board',
          title: 'Drying steam at constant pressure',
          problem: r`2 kg of wet steam at 200 kPa, quality 0.5, is heated at constant pressure until just dry ($h_{fg}$ = 2201.6 kJ/kg, $v_f$ = 0.001061, $v_g$ = 0.88578 m³/kg). Find the heat and the work.`,
          steps: [
            r`Half the mass evaporates: $Q = 2 \times 0.5 \times 2201.6 = 2201.6$ kJ.`,
            r`$W = 200 \times 2 \times 0.5 \times (0.88578 - 0.001061) = 176.9$ kJ.`,
          ],
          answer: r`2201.6 kJ; 176.9 kJ.`,
        },
      ],
      traps: [
        r`A throttle keeps enthalpy, not temperature, for steam.`,
        r`In a rigid tank use u, not h.`,
      ],
      check: [
        { q: r`Why does throttling wet steam to low pressure make it superheated?`, a: r`Its enthalpy stays the same while the saturation enthalpy at the lower pressure falls below it.` },
        { q: r`What table property does a rigid-tank heating use?`, a: r`Internal energy u.` },
      ],
    },
    {
      name: 'Second Law and Entropy',
      inShort: r`Which energy conversions are possible, and how entropy keeps score.`,
      body: [
        r`The first law allows any conversion that balances; the second says which happen.

| Statement | What it rules out |
|---|---|
| Kelvin–Planck | An engine that turns ALL the heat it takes in into work |
| Clausius | Heat flowing from cold to hot with no work input |
| Entropy | An isolated system's entropy ever decreasing |`,
        r`So every engine rejects some heat, and no engine between two temperatures beats a reversible one. That **Carnot limit**, $1 - \frac{T_L}{T_H}$, climbs with the hot temperature, which is why plants burn hotter:`,
        {
          type: 'plot',
          alt: 'The best possible efficiency of a heat engine rejecting heat at 300 kelvin against its hot temperature from 300 to 1500 kelvin: rising from zero, steeply at first, reaching 70 percent at 1000 kelvin and 80 percent at 1500.',
          caption: 'The Carnot limit with heat rejected at 300 K: 70% at 1000 K; the gains slow as the hot side climbs.',
          x: [300, 1500],
          y: [0, 1],
          xLabel: 'hot temperature (K)',
          yLabel: 'best efficiency',
          series: [{ f: (t) => 1 - 300 / t, label: 'η', area: true }],
          marks: [{ x: 1000, label: '1000 K' }],
        },
        r`**Entropy**, $dS = \frac{\delta Q}{T}$ along a reversible path, measures this spreading. It rises when heat is added, falls when heat is removed, stays put in a reversible adiabatic process, and friction or any irreversibility always generates more. Refrigerators and heat pumps move heat uphill using work, rated by a **coefficient of performance**: $COP_R = \frac{Q_L}{W}$, $COP_{HP} = \frac{Q_H}{W} = COP_R + 1$. A **ton of refrigeration** is 12 000 BTU/h = 3.517 kW (melting a short ton of ice a day).`,
      ],
      keyIdeas: [
        r`No engine turns all its heat into work: $\eta = 1 - \frac{Q_L}{Q_H} < 1$.`,
        r`Refrigerator $COP_R = \frac{Q_L}{W}$; heat pump $COP_{HP} = COP_R + 1$; 1 TR = 3.517 kW = 12 000 BTU/h.`,
        r`$\Delta S = \int\frac{\delta Q}{T}$; solids and liquids $mc\ln\frac{T_2}{T_1}$; $S_{gen} \ge 0$ always.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A refrigerator and melting ice',
          problem: r`A refrigerator removes 7 kW using 2 kW of work. Find its COP and the heat it rejects. What is the entropy change of 1 kg of ice melting at 0 °C?`,
          steps: [
            r`$COP = \frac72 = 3.5$; it rejects $7 + 2 = 9$ kW.`,
            r`Ice: $\frac{334}{273.15} = 1.22$ kJ/K.`,
          ],
          answer: r`3.5; 9 kW; 1.22 kJ/K.`,
        },
        {
          level: 'board',
          title: "An inventor's claim, and a plant's power",
          problem: r`An engine working between 500 K and 300 K is claimed to give 2500 J of work from 5000 J of heat. Is it possible? A 5 TR air-conditioning plant has a COP of 4: what power does it draw?`,
          steps: [
            r`The best is $1 - \frac{300}{500} = 40\%$, or 2000 J: the claim of 2500 J breaks the second law.`,
            r`$5 \times 3.517 = 17.585$ kW of cooling; power $\frac{17.585}{4} = 4.40$ kW.`,
          ],
          answer: r`Impossible (2000 J at most); 4.40 kW.`,
        },
      ],
      traps: [
        r`COP above 1 is normal; it is not an efficiency.`,
        r`A claim can satisfy the first law and still break the second: always compare with Carnot.`,
      ],
      check: [
        { q: r`A ship is to run by taking heat from the sea and turning it all into work. Which law does it break?`, a: r`The second law (Kelvin–Planck).` },
        { q: r`What happens to entropy in a reversible adiabatic process?`, a: r`It stays constant.` },
      ],
    },
    {
      name: 'Carnot Cycle',
      inShort: r`The ideal reversible cycle: the best any engine or refrigerator can do.`,
      body: [
        r`The **Carnot cycle** takes in heat at $T_H$ and rejects it at $T_L$ along two isothermal processes, joined by two isentropic ones. On a T–s diagram it is a rectangle: the area under the top is the heat in, under the bottom the heat out, and the rectangle between them is the work:`,
        {
          type: 'plot',
          alt: 'A Carnot cycle on a temperature-entropy diagram: a rectangle between 300 and 1000 kelvin and entropies 1 and 2; the area under the top side, shaded, is the heat taken in; under the dashed bottom side, the heat rejected; the rectangle between is the work.',
          caption: 'A Carnot cycle between 1000 K and 300 K: heat in under the top, heat out under the bottom (dashed), work the rectangle between.',
          x: [0, 3],
          y: [0, 1200],
          xLabel: 's (kJ/K)',
          yLabel: 'T (K)',
          series: [
            { points: [[1, 1000], [2, 1000]], label: 'heat in', area: true },
            { points: [[1, 300], [2, 300]], label: 'heat out', dashed: true, colour: colourOf(1) },
            { points: [[1, 300], [1, 1000]], label: 'isentropic', colour: colourOf(2) },
            { points: [[2, 1000], [2, 300]], label: 'isentropic', colour: colourOf(2) },
          ],
          legend: false,
        },
        r`Run backwards it is the best refrigerator or heat pump. Every Carnot formula is a temperature ratio, in kelvin or rankine:

| Machine | Best performance |
|---|---|
| Engine | $\eta = 1 - \frac{T_L}{T_H}$, $\frac{Q_H}{Q_L} = \frac{T_H}{T_L}$ |
| Refrigerator | $COP_R = \frac{T_L}{T_H - T_L}$ |
| Heat pump | $COP_{HP} = \frac{T_H}{T_H - T_L}$ |`,
      ],
      keyIdeas: [
        r`$\eta_C = 1 - \frac{T_L}{T_H}$; $\frac{Q_H}{Q_L} = \frac{T_H}{T_L}$; network $W = Q_H - Q_L$.`,
        r`$COP_{R} = \frac{T_L}{T_H - T_L}$, $COP_{HP} = \frac{T_H}{T_H - T_L}$.`,
        r`Two isothermal and two isentropic processes; it does not depend on the working substance.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Best efficiency and COP',
          problem: r`Find the Carnot efficiency between 1000 K and 300 K, and the best COP of a refrigerator keeping 270 K in a 300 K room.`,
          steps: [
            r`$1 - \frac{300}{1000} = 70\%$.`,
            r`$COP = \frac{270}{300 - 270} = 9$.`,
          ],
          answer: r`70%; 9.`,
        },
        {
          level: 'board',
          title: 'Work, and a freezer',
          problem: r`A Carnot engine absorbs 1000 kJ at 327 °C and rejects heat at 127 °C: find its work. An ideal freezer at −18 °C has a COP of 5: at what temperature does it reject heat?`,
          steps: [
            r`$\eta = 1 - \frac{400.15}{600.15} = 0.3333$; $W = 333.3$ kJ.`,
            r`$COP = \frac{T_L}{T_H - T_L}$ gives $T_H = T_L\left(1 + \frac15\right) = 255.15 \times 1.2 = 306.2$ K, or 33.0 °C.`,
          ],
          answer: r`333.3 kJ; 33.0 °C.`,
        },
      ],
      traps: [
        r`Kelvin only: in Celsius the same formula gives nonsense.`,
        r`The Carnot cycle is reversible; real engines reach only a fraction of it.`,
      ],
      check: [
        { q: r`Does a Carnot engine's efficiency depend on its working fluid?`, a: r`No: only on the two temperatures.` },
        { q: r`A Carnot engine takes in $Q_H$ and rejects $Q_L$. What is its work?`, a: r`$Q_H - Q_L$.` },
      ],
    },
    {
      name: 'Gas Cycles (Otto, Diesel, Brayton)',
      inShort: r`Ideal cycles for petrol engines, diesel engines and gas turbines.`,
      body: [
        r`Air-standard cycles model engines with air as the working fluid and heat added from outside:

| Cycle | Engine | Heat added at | Efficiency |
|---|---|---|---|
| Otto | spark ignition (petrol) | constant volume | $1 - \frac{1}{r^{k-1}}$ |
| Diesel | compression ignition | constant pressure | $1 - \frac{1}{r^{k-1}} \times \frac{r_c^k - 1}{k(r_c - 1)}$ |
| Brayton | gas turbine | constant pressure (steady flow) | $1 - \frac{1}{r_p^{(k-1)/k}}$ |`,
        r`Efficiency rises with the compression ratio r. A diesel's extra factor, from the **cutoff ratio** $r_c$, is more than 1, so at the same r it is less efficient than the Otto cycle; it wins in practice because it can run r of 15 to 22, where a petrol engine would knock:`,
        {
          type: 'plot',
          alt: 'Air-standard efficiency against compression ratio from 2 to 20: the Otto cycle rising steeply then levelling, 56.5 percent at a ratio of 8; the Diesel cycle with a cutoff ratio of 2, dashed, lower at every ratio.',
          caption: 'Otto (solid) and Diesel with cutoff 2 (dashed) against compression ratio; Otto gives 56.5% at r = 8.',
          x: [2, 20],
          y: [0, 0.8],
          xLabel: 'compression ratio r',
          yLabel: 'efficiency',
          series: [
            { f: otto, label: 'Otto' },
            { f: diesel(2), label: 'Diesel', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 8, label: 'r = 8' }],
        },
        r`The **mean effective pressure** is the steady pressure that would give the same net work over the displacement, $MEP = \frac{W_{net}}{V_d}$. In a gas turbine the compressor uses a large share of the turbine's work, so component efficiencies matter a great deal.`,
      ],
      keyIdeas: [
        r`Otto $\eta = 1 - \frac{1}{r^{k-1}}$; Diesel adds the cutoff factor $\frac{r_c^k - 1}{k(r_c - 1)}$.`,
        r`Brayton $\eta = 1 - \frac{1}{r_p^{(k-1)/k}}$; the compressor takes a large share of the turbine's work.`,
        r`MEP $= \frac{W_{net}}{V_d}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Otto and Brayton',
          problem: r`Find the air-standard efficiency of an Otto cycle with $r = 8$ and of a Brayton cycle with $r_p = 10$ ($k = 1.4$).`,
          steps: [
            r`Otto: $1 - 8^{-0.4} = 56.5\%$.`,
            r`Brayton: $1 - 10^{-0.4/1.4} = 48.2\%$.`,
          ],
          answer: r`56.5%; 48.2%.`,
        },
        {
          level: 'board',
          title: 'A diesel',
          problem: r`Find the air-standard efficiency of a Diesel cycle with a compression ratio of 18 and a cutoff ratio of 2 ($k = 1.4$).`,
          steps: [
            r`$\frac{1}{18^{0.4}} = 0.3147$; cutoff factor $\frac{2^{1.4} - 1}{1.4 \times 1} = 1.1707$.`,
            r`$\eta = 1 - 0.3147 \times 1.1707 = 63.2\%$.`,
          ],
          answer: r`63.2%.`,
        },
      ],
      traps: [
        r`Otto uses the volume ratio; Brayton the pressure ratio, with exponent $\frac{k-1}{k}$.`,
        r`At the SAME compression ratio, Otto beats Diesel.`,
      ],
      check: [
        { q: r`Which ideal cycle models a compression-ignition engine?`, a: r`The Diesel cycle.` },
        { q: r`Which cycle models a gas turbine?`, a: r`The Brayton (Joule) cycle.` },
      ],
    },
    {
      name: 'Vapor Cycles (Rankine)',
      inShort: r`The steam power plant: pump, boiler, turbine, condenser.`,
      body: [
        r`A steam plant runs the **Rankine cycle**: a pump raises condensate to boiler pressure (3 → 4), the boiler heats, boils and superheats it (4 → 1), the turbine expands it (1 → 2), and the condenser turns it back to water (2 → 3). On the T–s diagram the boiler's heating climbs the dome's liquid side, crosses it, and superheats; the turbine drops straight down:`,
        {
          type: 'plot',
          alt: 'A Rankine cycle on the temperature-entropy diagram of water, drawn inside the dashed saturation dome: heating along the liquid line from 46 to 234 degrees, boiling across at 234, superheating to 350, a vertical isentropic expansion down to 46 degrees, then condensing back across the dome.',
          caption: 'The Rankine cycle of the examples (solid) inside water’s dome (dashed): 3 MPa, 350 °C down to 10 kPa.',
          x: [0, 10],
          y: [0, 420],
          xLabel: 's (kJ/kg·K)',
          yLabel: 'T (°C)',
          series: [
            { points: DOME, label: 'saturation', dashed: true, colour: colourOf(1) },
            { points: RANKINE, label: 'cycle', colour: colourOf(0) },
          ],
          legend: false,
        },
        r`$\eta = \frac{w_{turbine} - w_{pump}}{q_{in}} = \frac{(h_1 - h_2) - (h_4 - h_3)}{h_1 - h_4}$, with the small pump work $v_f\Delta p$. Superheat, a higher boiler pressure, a lower condenser pressure, **reheat** and **regeneration** (feedwater heating) all raise it. An **economizer** warms the feedwater with flue gas before it enters the boiler.`,
      ],
      keyIdeas: [
        r`$\eta = \frac{(h_1 - h_2) - (h_4 - h_3)}{h_1 - h_4}$; pump work $v_f\Delta p$.`,
        r`Steam rate $\frac{3600}{w_{net}}$ kg/kWh; turbine efficiency $\frac{h_1 - h_2}{h_1 - h_{2s}}$.`,
        r`Superheat, higher boiler pressure, lower condenser pressure, reheat and regeneration all raise $\eta$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The ideal cycle',
          problem: r`Steam at 3 MPa, 350 °C ($h = 3115.3$, $s = 6.7428$) expands to 10 kPa. Find the ideal Rankine efficiency.`,
          steps: [
            r`From the quality example, $h_2 = 2135.7$: turbine work 979.6 kJ/kg.`,
            r`Pump work $0.00101 \times 2990 = 3.02$ kJ/kg, so $h_4 = 194.85$.`,
            r`$\eta = \frac{979.6 - 3.0}{3115.3 - 194.85} = 33.4\%$.`,
          ],
          answer: r`33.4%.`,
        },
        {
          level: 'board',
          title: 'A real turbine',
          problem: r`The same plant's turbine is 85% efficient. Find the actual exhaust enthalpy, the steam rate and the cycle efficiency.`,
          steps: [
            r`Turbine work $0.85 \times 979.6 = 832.7$ kJ/kg; $h_2 = 3115.3 - 832.7 = 2282.6$ kJ/kg.`,
            r`Net $832.7 - 3.0 = 829.7$ kJ/kg; steam rate $\frac{3600}{829.7} = 4.34$ kg/kWh.`,
            r`$\eta = \frac{829.7}{2920.45} = 28.4\%$.`,
          ],
          answer: r`2282.6 kJ/kg; 4.34 kg/kWh; 28.4%.`,
        },
      ],
      traps: [
        r`The pump work is small but not zero: include it in $h_4$.`,
        r`The turbine efficiency scales the enthalpy DROP, not the exhaust enthalpy.`,
      ],
      check: [
        { q: r`What does an economizer do?`, a: r`Heats the feedwater with flue gas before it enters the boiler.` },
        { q: r`Why lower the condenser pressure?`, a: r`It lowers the temperature heat is rejected at, raising the efficiency.` },
      ],
    },
  ],
};
