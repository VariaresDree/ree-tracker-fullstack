// Library › Lessons › ESAS › Environmental Science & Engineering
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// environmentLesson.test.js. Coverage cross-checked against the environmental
// science part of a review center's chemistry and environmental science
// handout; the text, problems and figures are this app's own): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order.
// Chemistry for Engineers covers ppm conversions, BOD and hardness.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// Streeter–Phelps oxygen deficit (mg/L) below an outfall, t in days.
export const SAG = { L0: 20, D0: 1, k1: 0.23, k2: 0.5, sat: 8.26 };
export const deficit = (t) => {
  const { L0, D0, k1, k2 } = SAG;
  return ((k1 * L0) / (k2 - k1)) * (Math.exp(-k1 * t) - Math.exp(-k2 * t)) + D0 * Math.exp(-k2 * t);
};
export const criticalTime = () => {
  const { L0, D0, k1, k2 } = SAG;
  return (1 / (k2 - k1)) * Math.log((k2 / k1) * (1 - (D0 * (k2 - k1)) / (k1 * L0)));
};

// Ground-level centreline concentration (µg/m³) of the worked stack against effective height H.
export const plume = (H) => (100 / (Math.PI * 30 * 15 * 5)) * Math.exp(-(H * H) / (2 * 15 * 15)) * 1e6;

export default {
  topic: 'Environmental Science & Engineering',
  subject: 'ESAS',
  overview: r`Engineering changes the environment: power plants emit, dams flood, wastes pile up. Environmental science explains how natural systems work (energy flows through food chains, materials cycle, populations grow toward limits), and environmental engineering measures and controls the damage: dispersing and treating air pollutants, keeping rivers' oxygen up, managing solid waste, and assessing impacts before a project is built. Philippine law sets the rules: the Clean Air, Clean Water and Solid Waste Acts, and the EIS System.`,
  sources: [
    'Introduction to Environmental Engineering and Science (Masters and Ela)',
    'Environmental Science (Miller and Spoolman)',
    'RA 8749, RA 9275, RA 9003, RA 6969, PD 1586 and their implementing rules (DENR)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Nature and Ecology',
      inShort: r`How living things and their surroundings work together as ecosystems.`,
      body: [
        r`An **ecosystem** is a community of living things with its surroundings. **Producers** (plants, algae) capture sunlight; **consumers** eat them or each other; **decomposers** return the remains to the soil. Energy flows one way through these feeding levels and is lost as heat at each step: only about a tenth passes on:`,
        {
          type: 'blocks',
          alt: 'An energy chain of four feeding levels, top to bottom: producers, herbivores, carnivores and top carnivores, each passing about ten percent of its energy to the next.',
          caption: 'Energy up the food chain: about 10% passes from each level to the next.',
          blocks: [
            { id: 'p', at: [0, 0], label: 'Producers' },
            { id: 'h', at: [0, 1], label: 'Herbivores' },
            { id: 'c', at: [0, 2], label: 'Carnivores' },
            { id: 't', at: [0, 3], label: 'Top level' },
          ],
          links: [
            ['p', 'h', { label: '10%' }],
            ['h', 'c', { label: '10%' }],
            ['c', 't', { label: '10%' }],
          ],
        },
        r`Matter, unlike energy, cycles: carbon, nitrogen, water and phosphorus move between air, water, soil and living things. Persistent toxins that organisms can't excrete (mercury, DDT) concentrate at each feeding level, **biomagnification**, so top predators carry the most.`,
      ],
      keyIdeas: [
        r`Ecosystems: producers, consumers and decomposers; energy flows one way, matter cycles (carbon, nitrogen, water, phosphorus).`,
        r`About 10% of energy passes from one trophic level to the next: $E_n \approx E_1(0.1)^{n-1}$.`,
        r`Biodiversity, niches, succession; biomagnification concentrates toxins up the food chain.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Energy up the chain',
          problem: r`Plants in a pond fix 10 000 kcal. About how much energy reaches the fourth trophic level?`,
          steps: [r`$10\,000 \times 0.1^3 = 10$ kcal: a thousandth of what the plants captured.`],
          answer: r`About 10 kcal.`,
        },
        {
          level: 'board',
          title: 'Biomagnification, and feeding a predator',
          problem: r`Plankton carry 0.02 ppm of a persistent toxin, magnified about 10 times at each of three feeding levels above them. What does the top predator carry? How much producer energy supports 50 kcal at the third level?`,
          steps: [
            r`$0.02 \times 10^3 = 20$ ppm: a thousandfold concentration.`,
            r`Two steps up from the producers: $\frac{50}{0.1^2} = 5000$ kcal.`,
          ],
          answer: r`20 ppm; 5000 kcal.`,
        },
      ],
      traps: [
        r`Energy does not cycle; matter does.`,
        r`Count steps between levels, not levels: from level 1 to level 3 is two steps.`,
      ],
      check: [
        { q: r`What role do decomposers play?`, a: r`They break down dead matter and return its nutrients to the soil.` },
        { q: r`What is biomagnification?`, a: r`A persistent toxin growing more concentrated at each higher feeding level.` },
      ],
    },
    {
      name: 'Natural Systems and Resources',
      inShort: r`Renewable and non-renewable resources, and how fast populations and demand grow.`,
      body: [
        r`**Renewable** resources replenish themselves (sunlight, wind, flowing water, biomass, if not overharvested); **non-renewable** ones are used up (coal, oil, gas, uranium, minerals). How long a resource lasts depends on how fast use grows. Unchecked growth is **exponential**, $N = N_0e^{rt}$, doubling every $\frac{70}{r\%}$ years; real populations level off at the environment's **carrying capacity** K, following a **logistic** curve:`,
        {
          type: 'plot',
          alt: 'Population against time from 0 to 100 years, starting at 100 and growing 5 percent a year: exponential growth, dashed, shoots upward past 1000 by about 46 years; logistic growth, solid, rises in an S-curve and levels off toward the carrying capacity of 1000.',
          caption: 'Growth at 5% a year from 100: exponential (dashed) runs away; logistic (solid) levels off at the carrying capacity, 1000.',
          x: [0, 100],
          y: [0, 1200],
          xLabel: 'years',
          yLabel: 'population',
          series: [
            { f: (t) => 1000 / (1 + 9 * Math.exp(-0.05 * t)), label: 'logistic', area: true },
            {
              points: [...Array.from({ length: 50 }, (_, t) => [t, 100 * Math.exp(0.05 * t)]), [Math.log(12) / 0.05, 1200]],
              label: 'exponential',
              dashed: true,
              colour: colourOf(1),
            },
          ],
          legend: false,
        },
        r`Logistic growth is fastest at half the carrying capacity, $\frac{dN}{dt} = rN\left(1 - \frac NK\right)$.`,
      ],
      keyIdeas: [
        r`Exponential growth $N = N_0e^{rt}$; doubling time $\approx \frac{70}{r\%}$; logistic growth levels off at the carrying capacity.`,
        r`Reserve lifetime: $\frac{R}{C_0}$ at steady use; $\frac{1}{r}\ln\left(\frac{rR}{C_0} + 1\right)$ if use grows.`,
        r`Renewable (solar, wind, water, biomass) vs non-renewable (fossil fuels, minerals).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reserves under growth',
          problem: r`A fuel has reserves of 100 years at today's use. How long will it last if use grows 2% a year? How long does 2% growth take to double demand?`,
          steps: [
            r`$\frac{1}{0.02}\ln(0.02 \times 100 + 1) = 50\ln3 = 55$ years.`,
            r`Doubling: $\frac{70}{2} = 35$ years.`,
          ],
          answer: r`55 years; 35 years.`,
        },
        {
          level: 'board',
          title: 'Logistic growth',
          problem: r`A population with carrying capacity 10 000 grows at r = 0.04 a year. How fast does it grow at 2000, and what is the fastest it can grow?`,
          steps: [
            r`At 2000: $0.04 \times 2000 \times \left(1 - \frac{2000}{10\,000}\right) = 64$ a year.`,
            r`Fastest at $\frac K2 = 5000$: $0.04 \times 5000 \times 0.5 = 100$ a year.`,
          ],
          answer: r`64 a year; 100 a year at 5000.`,
        },
      ],
      traps: [
        r`Steady growth makes "100 years of reserves" a misleading figure.`,
        r`Biomass is renewable only if harvested no faster than it regrows.`,
      ],
      check: [
        { q: r`At what population does logistic growth run fastest?`, a: r`Half the carrying capacity.` },
        { q: r`How long does 7% growth take to double?`, a: r`About 10 years.` },
      ],
    },
    {
      name: 'Environmental Concerns and Crises',
      inShort: r`The big problems: pollution, biodiversity loss, deforestation, ozone depletion, climate change.`,
      body: [
        r`The large environmental problems share a cause: human demand outgrowing what natural systems can absorb or supply. A simple model splits impact three ways, **I = P × A × T**: population, affluence (consumption per person) and technology (impact per unit consumed). Population and affluence have grown for a century; technology is the factor engineering can change fastest.`,
        r`| Problem | Main causes | Example of action |
|---|---|---|
| Ozone depletion | CFCs and halons | Montreal Protocol (1987), the success story |
| Climate change | CO₂, methane, N₂O | Paris Agreement (2015) |
| Acid rain | SO₂ and NOₓ from fuels | scrubbers, low-sulfur fuel |
| Biodiversity loss | habitat destruction, overharvesting | protected areas |
| Deforestation, mangrove loss | logging, conversion, fishponds | reforestation, protection |
| Urban air and river pollution | traffic, industry, sewage | Clean Air and Clean Water Acts |`,
        r`Environmental engineering answers at four levels: **remediation** fixes the past (cleaning contaminated sites), **effluent treatment** handles the present, **pollution prevention** plans for the future, and **design for environment** and **industrial ecology** rethink products and whole industries over their life cycle.`,
      ],
      keyIdeas: [
        r`Impact $I = P \times A \times T$: population, affluence, technology.`,
        r`Ozone depletion by CFCs (Montreal Protocol, 1987) is the success story of global action.`,
        r`Local crises: air pollution in cities, polluted rivers, flooding, loss of forests and mangroves.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Holding impact steady',
          problem: r`Population grows 50% and consumption per person doubles. By how much must technology cut its impact per unit to keep the total impact the same?`,
          steps: [
            r`$1.5 \times 2 = 3$ times the activity.`,
            r`Impact per unit must fall to $\frac13$: a two-thirds cut.`,
          ],
          answer: r`A two-thirds cut.`,
        },
        {
          level: 'board',
          title: "A country's emissions",
          problem: r`A country of 110 million people has an output of 3500 US dollars per person and emits 0.5 kg of CO₂ per dollar of output. Find its yearly CO₂ emissions.`,
          steps: [
            r`$I = P \times A \times T = 110 \times 10^6 \times 3500 \times 0.5$ kg.`,
            r`$= 1.925 \times 10^{11}$ kg, or 192.5 million tonnes.`,
          ],
          answer: r`192.5 million tonnes a year.`,
        },
      ],
      traps: [
        r`The ozone hole and global warming are different problems with different causes.`,
        r`Remediation fixes past damage; prevention avoids future damage. Don't confuse them.`,
      ],
      check: [
        { q: r`What does T stand for in I = PAT?`, a: r`Technology: impact per unit of consumption.` },
        { q: r`Which treaty phased out CFCs?`, a: r`The Montreal Protocol (1987).` },
      ],
    },
    {
      name: 'Air Pollution',
      inShort: r`What pollutes the air, how it spreads, and how it is controlled.`,
      body: [
        r`The main (criteria) air pollutants are particulate matter (PM10 and the finer, more harmful PM2.5), SO₂, NOₓ, CO, ground-level ozone and lead. Coal plants add mercury. From a stack, pollutants spread downwind in a widening plume; the ground-level concentration falls with wind speed and very steeply with the stack's effective height:`,
        {
          type: 'plot',
          alt: 'Ground-level concentration downwind of a stack emitting 100 grams per second, in a 5 metre per second wind, against effective stack height from 0 to 60 metres: falling from about 14,100 micrograms per cubic metre at ground level to about 404 at 40 metres and under 5 at 60 metres.',
          caption: 'Ground-level concentration against effective stack height: about 404 µg/m³ at 40 m, under 5 µg/m³ at 60 m.',
          x: [0, 60],
          y: [0, 15000],
          xLabel: 'effective height H (m)',
          yLabel: 'µg/m³',
          series: [{ f: plume, label: 'C', area: true }],
          marks: [{ x: 40, label: '40 m' }],
        },
        r`Controls remove pollutants before they leave the stack: **cyclones** and **fabric filters** catch particles, **electrostatic precipitators** charge them and collect them on plates (efficiency $1 - e^{-wA/Q}$), **scrubbers** remove SO₂, **low-NOₓ burners** limit NOₓ, and **catalytic converters** clean vehicle exhaust. Captured CO₂ can be removed before burning, after it (amine scrubbing), or by burning in pure oxygen (oxy-fuel).`,
      ],
      keyIdeas: [
        r`Criteria pollutants: particulates (PM10, PM2.5), SO₂, NOₓ, CO, ozone, lead.`,
        r`Ground-level concentration downwind: $\frac{Q}{\pi\sigma_y\sigma_zu}e^{-H^2/2\sigma_z^2}$; taller stacks and stronger wind dilute.`,
        r`Controls: cyclones, fabric filters, electrostatic precipitators (particles); scrubbers (SO₂); low-NOₓ burners; catalytic converters.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A stack',
          problem: r`A stack emits 100 g/s with an effective height of 40 m; wind 5 m/s, $\sigma_y = 30$ m, $\sigma_z = 15$ m downwind. Find the ground-level centreline concentration.`,
          steps: [
            r`$\frac{100}{\pi \times 30 \times 15 \times 5} = 0.0141$ g/m³ before the height factor.`,
            r`$\times e^{-1600/450} = 0.0141 \times 0.0286 = 4.0 \times 10^{-4}$ g/m³, about 404 µg/m³.`,
          ],
          answer: r`About 404 µg/m³.`,
        },
        {
          level: 'board',
          title: 'A taller stack and a precipitator',
          problem: r`The same stack is raised to an effective height of 60 m (same σ's). What is the new concentration? An electrostatic precipitator has 5000 m² of plates, a drift speed of 0.1 m/s and a gas flow of 250 m³/s: find its efficiency.`,
          steps: [
            r`$404 \times e^{-(3600 - 1600)/450} = 404 \times 0.0117 = 4.7$ µg/m³.`,
            r`$\eta = 1 - e^{-0.1 \times 5000/250} = 1 - e^{-2} = 86.5\%$.`,
          ],
          answer: r`About 4.7 µg/m³; 86.5%.`,
        },
      ],
      traps: [
        r`An inversion traps pollutants near the ground: the worst air comes on calm, stable nights.`,
        r`A taller stack dilutes; it doesn't remove anything.`,
      ],
      check: [
        { q: r`What device charges particles and collects them on plates?`, a: r`An electrostatic precipitator.` },
        { q: r`Which pollutant from burning coal causes acid rain?`, a: r`Sulfur dioxide (with NOₓ).` },
      ],
    },
    {
      name: 'Water Pollution',
      inShort: r`Pollutants in rivers and lakes, their effect on oxygen, and treatment.`,
      body: [
        r`Organic waste in a river is food for bacteria, which use up dissolved oxygen as they decay it, while the air puts oxygen back. Downstream of an outfall the oxygen first falls, then recovers: the **oxygen sag**, worst some distance below the outfall:`,
        {
          type: 'plot',
          alt: 'Dissolved oxygen against travel time below an outfall, from 0 to 12 days: starting at 7.26 milligrams per litre, falling to a low of about 3.3 at 2.65 days, then slowly recovering toward the saturation level of 8.26, dashed.',
          caption: 'The oxygen sag below an outfall: lowest, about 3.3 mg/L, at 2.65 days; saturation 8.26 mg/L (dashed).',
          x: [0, 12],
          y: [0, 9],
          xLabel: 'days downstream',
          yLabel: 'DO (mg/L)',
          series: [
            { f: (t) => SAG.sat - deficit(t), label: 'DO', area: true },
            { f: () => SAG.sat, label: 'saturation', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: criticalTime(), label: 'lowest' }],
        },
        r`Treatment removes the load before discharge: **primary** treatment settles out solids, **secondary** treatment lets bacteria consume the organic matter, and **tertiary** treatment removes nutrients and disinfects. Nitrogen and phosphorus left in the water feed algal blooms, **eutrophication**, which in turn strip the oxygen.`,
      ],
      keyIdeas: [
        r`Organic waste uses up dissolved oxygen as it decays (BOD); the Streeter-Phelps sag gives the deficit downstream.`,
        r`Mixing: $C = \frac{Q_1C_1 + Q_2C_2}{Q_1 + Q_2}$; detention $\frac{V}{Q}$; settling needs a speed above $\frac{Q}{A_s}$.`,
        r`Treatment: primary (settling), secondary (biological), tertiary (nutrients, disinfection). Nutrients cause eutrophication.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The critical point',
          problem: r`Below an outfall: $L_0 = 20$ mg/L, $D_0 = 1$ mg/L, $k_1 = 0.23$, $k_2 = 0.5$ per day; saturation 8.26 mg/L. Find when the oxygen is lowest and how low.`,
          steps: [
            r`$t_c = \frac{1}{0.27}\ln\left[\frac{0.5}{0.23}\left(1 - \frac{1 \times 0.27}{0.23 \times 20}\right)\right] = 2.65$ days.`,
            r`$D_c = \frac{k_1}{k_2}L_0e^{-k_1t_c} = 5.0$ mg/L, so DO $= 8.26 - 5.0 = 3.3$ mg/L, too low for most fish.`,
          ],
          answer: r`2.65 days; about 3.3 mg/L.`,
        },
        {
          level: 'board',
          title: 'Mixing and settling',
          problem: r`A river of 10 m³/s with BOD 2 mg/L receives 0.5 m³/s of waste at 200 mg/L. Find the mixed BOD. A clarifier treats 10 000 m³/day over 400 m²: what is its overflow rate?`,
          steps: [
            r`$C = \frac{10 \times 2 + 0.5 \times 200}{10.5} = 11.4$ mg/L.`,
            r`$\frac{10\,000}{400} = 25$ m/day: particles settling faster than that are caught.`,
          ],
          answer: r`11.4 mg/L; 25 m/day.`,
        },
      ],
      traps: [
        r`The worst oxygen is downstream of the outfall, not at it.`,
        r`Mix by FLOW-weighted average, not a plain average of the concentrations.`,
      ],
      check: [
        { q: r`What does secondary treatment do?`, a: r`Uses bacteria to consume the dissolved organic matter.` },
        { q: r`What is eutrophication?`, a: r`Algal overgrowth from excess nutrients, which then depletes the water's oxygen.` },
      ],
    },
    {
      name: 'Solid and Hazardous Waste',
      inShort: r`Reducing, collecting, treating and disposing of waste safely.`,
      body: [
        r`Waste is managed by a hierarchy, best first: **reduce**, **reuse**, **recycle** and compost, **recover energy**, and only then **dispose**. Under RA 9003 waste is segregated at source, recovered at materials recovery facilities, and what's left goes to a **sanitary landfill**: lined, covered daily, with **leachate** collected so it can't contaminate groundwater and landfill gas captured.`,
        r`Thermal treatment can recover energy: **incineration** burns waste, **pyrolysis** heats it without oxygen into fuel gas, oils and char, and **gasification** turns it into a synthesis gas. **Hazardous wastes** (toxic, corrosive, reactive or ignitable) are tracked from cradle to grave under RA 6969. Contaminated land is cleaned by **remediation**: physical (soil washing), chemical (oxidation in place) or biological (bioremediation, phytoremediation).`,
      ],
      keyIdeas: [
        r`Hierarchy: reduce, reuse, recycle (and compost), recover energy, then dispose.`,
        r`Landfill volume $= \frac{\text{mass}}{\text{compacted density}}$ plus cover; sanitary landfills line and cover waste and collect leachate and gas.`,
        r`Hazardous wastes (toxic, corrosive, reactive, ignitable) are tracked from cradle to grave (RA 6969).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A year of landfill',
          problem: r`A town of 100 000 makes 0.5 kg of waste per person a day, compacted to 600 kg/m³, with cover adding 20%. How much landfill volume does a year need?`,
          steps: [
            r`$\frac{100\,000 \times 0.5 \times 365}{600} = 30\,417$ m³.`,
            r`$\times 1.2 = 36\,500$ m³ with cover.`,
          ],
          answer: r`36 500 m³.`,
        },
        {
          level: 'board',
          title: 'Diversion',
          problem: r`A city's waste is 50% biodegradable, 25% recyclable and 25% residual. If 80% of the biodegradables are composted and 60% of the recyclables recovered, what share of the waste is diverted from disposal?`,
          steps: [
            r`$0.50 \times 0.80 + 0.25 \times 0.60 = 0.40 + 0.15$.`,
            r`$= 0.55$: 55% diverted.`,
          ],
          answer: r`55%.`,
        },
      ],
      traps: [
        r`Open dumps are illegal under RA 9003; a sanitary landfill is not an open dump with soil on top.`,
        r`A leachate collection system protects GROUNDWATER, not the air.`,
      ],
      check: [
        { q: r`What process heats waste without oxygen into gas, oil and char?`, a: r`Pyrolysis.` },
        { q: r`Is soil washing a physical, chemical or biological remediation?`, a: r`Physical.` },
      ],
    },
    {
      name: 'Climate Change',
      inShort: r`How greenhouse gases warm the Earth, and what is being done about it.`,
      body: [
        r`Sunlight warms the Earth, which radiates heat back to space. Greenhouse gases (CO₂, methane, N₂O, fluorinated gases) absorb part of that outgoing heat; without them the Earth would average $T_e = \left[\frac{S(1 - \alpha)}{4\sigma}\right]^{1/4} = 255$ K instead of 288 K. Adding more strengthens the effect. CO₂'s extra **radiative forcing** grows with the logarithm of its concentration, so each doubling adds the same push:`,
        {
          type: 'plot',
          alt: 'Radiative forcing from carbon dioxide against its concentration from 280 to 1120 parts per million: rising steeply at first and then more slowly, 2.2 watts per square metre at 420 ppm and 3.7 at 560 ppm, a doubling of the pre-industrial level.',
          caption: 'CO₂ forcing against concentration: 3.7 W/m² for a doubling of the pre-industrial 280 ppm.',
          x: [280, 1120],
          y: [0, 8],
          xLabel: 'CO₂ (ppm)',
          yLabel: 'forcing (W/m²)',
          series: [{ f: (c) => 5.35 * Math.log(c / 280), label: 'forcing', area: true }],
          marks: [{ x: 560, label: '560 ppm' }],
        },
        r`Other gases are counted as CO₂ equivalent by their **global warming potential** (methane about 28 over 100 years). The world's response runs from the Kyoto Protocol (1997) to the **Paris Agreement** (2015: well below 2 °C, aiming for 1.5 °C). Cutting emissions is mitigation; preparing for the change already coming is adaptation.`,
      ],
      keyIdeas: [
        r`Without greenhouse gases the Earth would be $T_e = \left[\frac{S(1 - \alpha)}{4\sigma}\right]^{1/4} = 255$ K; it is 288 K.`,
        r`CO₂ forcing $5.35\ln\frac{C}{C_0}$ W/m²; warming $\approx 0.8$ K per W/m². Other gases by $CO_2e = m \times GWP$.`,
        r`Kyoto Protocol (1997), Paris Agreement (2015: well below 2 °C, aim for 1.5 °C). The Philippines pledged a 75% cut against business as usual by 2030, mostly conditional on support.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Doubling CO₂',
          problem: r`How much forcing and eventual warming does doubling CO₂ cause?`,
          steps: [
            r`$5.35\ln2 = 3.7$ W/m².`,
            r`$0.8 \times 3.7 \approx 3$ °C.`,
          ],
          answer: r`3.7 W/m²; about 3 °C.`,
        },
        {
          level: 'board',
          title: 'Today, and methane',
          problem: r`CO₂ has risen from 280 to 420 ppm. What forcing and eventual warming does that alone imply? A landfill releases 10 t of methane (GWP 28): what is that in CO₂ equivalent?`,
          steps: [
            r`$5.35\ln\frac{420}{280} = 2.17$ W/m²; $0.8 \times 2.17 = 1.7$ °C.`,
            r`$10 \times 28 = 280$ t CO₂e.`,
          ],
          answer: r`2.17 W/m², about 1.7 °C; 280 t CO₂e.`,
        },
      ],
      traps: [
        r`Weather is day to day; climate is the long-term average.`,
        r`Forcing is logarithmic: going from 280 to 560 ppm adds as much as 560 to 1120.`,
      ],
      check: [
        { q: r`What does the Paris Agreement aim for?`, a: r`Warming well below 2 °C, pursuing 1.5 °C.` },
        { q: r`Which is the main greenhouse gas from burning fuel?`, a: r`Carbon dioxide.` },
      ],
    },
    {
      name: 'Environmental Impact Assessment',
      inShort: r`Studying a project's effects before it is approved.`,
      body: [
        r`An **environmental impact assessment** (EIA) predicts a project's effects on the environment and people, and how to avoid or reduce them, before it is approved. In the Philippines **PD 1586** (1978) set up the EIS System, run by the DENR's Environmental Management Bureau, which issues an **Environmental Compliance Certificate** (ECC) to approved projects:`,
        {
          type: 'blocks',
          alt: 'The EIA process top to bottom: screening, scoping, the EIS study, review, the ECC decision, and monitoring of its conditions.',
          caption: 'The EIA process, from screening to monitoring the ECC’s conditions.',
          blocks: [
            { id: 's', at: [0, 0], label: 'Screening' },
            { id: 'c', at: [0, 1], label: 'Scoping' },
            { id: 'e', at: [0, 2], label: 'EIS study' },
            { id: 'r', at: [0, 3], label: 'Review' },
            { id: 'd', at: [0, 4], label: 'ECC' },
            { id: 'm', at: [0, 5], label: 'Monitoring' },
          ],
          links: [
            ['s', 'c'],
            ['c', 'e'],
            ['e', 'r'],
            ['r', 'd'],
            ['d', 'm'],
          ],
        },
        r`**Environmentally critical projects** (power plants, mining, heavy industry, major dams and roads) and projects in **environmentally critical areas** (protected areas, mangroves, coral reefs, areas prone to natural hazards) need an EIS; others may get a Certificate of Non-Coverage. The public takes part through scoping and hearings. For products rather than projects, **life-cycle assessment** looks at impacts from raw materials to disposal: cradle-to-gate, cradle-to-grave, or cradle-to-cradle when materials are recycled.`,
      ],
      keyIdeas: [
        r`PD 1586 (1978) set up the EIS System; the DENR-EMB issues an Environmental Compliance Certificate (ECC).`,
        r`Environmentally critical projects (like power plants and heavy industry) and projects in critical areas need an EIS; others may get a Certificate of Non-Coverage.`,
        r`Steps: screening, scoping, the EIS study, review, decision, then monitoring of the ECC's conditions, with public participation throughout.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A coal plant',
          problem: r`A company plans a 300 MW coal power plant. What must it obtain before construction, and from whom?`,
          steps: [r`An ECC from the DENR-EMB, after an Environmental Impact Statement: a power plant is an environmentally critical project under PD 1586.`],
          answer: r`An ECC from the DENR-EMB.`,
        },
        {
          level: 'board',
          title: 'Project or area?',
          problem: r`Why does each need an EIS: (a) a 50 MW geothermal plant; (b) a resort built inside a protected mangrove area? Which LCA follows a product's materials back into new products?`,
          steps: [
            r`(a) A power plant is an environmentally critical PROJECT.`,
            r`(b) The resort is not critical in itself, but it sits in an environmentally critical AREA.`,
            r`Cradle-to-cradle LCA.`,
          ],
          answer: r`Critical project; critical area; cradle-to-cradle.`,
        },
      ],
      traps: [
        r`An ECC is not a one-time paper: its conditions are monitored for the life of the project.`,
        r`EIA judges a project; LCA judges a product over its life.`,
      ],
      check: [
        { q: r`What does ECC stand for?`, a: r`Environmental Compliance Certificate.` },
        { q: r`Which decree set up the Philippine EIS System?`, a: r`PD 1586 (1978).` },
      ],
    },
    {
      name: 'Environmental Laws (RA 8749, 9275, 9003, PD 1586)',
      inShort: r`The Philippine laws that protect air, water and land.`,
      body: [
        r`| Law | Year | Covers |
|---|---|---|
| PD 1151 | 1977 | Philippine Environmental Policy |
| PD 1586 | 1978 | Environmental Impact Statement System |
| RA 6969 | 1990 | toxic substances and hazardous and nuclear wastes |
| RA 8749 | 1999 | Clean Air Act: air-quality standards, emission limits |
| RA 9003 | 2000 | Ecological Solid Waste Management: segregation, recovery, no open dumps |
| RA 9275 | 2004 | Clean Water Act: water-quality areas, discharge permits |
| RA 9729 | 2009 | Climate Change Act |`,
        r`Common threads: **the polluter pays**, permits for emissions and discharges, standards for the air and water receiving them, and citizens' rights to sue. RA 9003 also set a first target of diverting at least 25% of waste from disposal within five years.`,
      ],
      keyIdeas: [
        r`RA 8749 Clean Air Act (1999): air-quality standards, emission limits, vehicle and industry controls.`,
        r`RA 9275 Clean Water Act (2004): water-quality management areas, discharge permits, the polluter pays. RA 9003 Ecological Solid Waste Management Act (2000): segregation, materials recovery facilities, no open dumps, at least 25% diversion within 5 years.`,
        r`PD 1586 (1978): EIS System. RA 6969 (1990): toxic substances and hazardous wastes.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A diversion target',
          problem: r`A city generates 400 tonnes of waste a day. Under RA 9003's first target, how much had to be diverted from disposal?`,
          steps: [r`At least 25%: $0.25 \times 400 = 100$ tonnes a day, through segregation, recycling and composting.`],
          answer: r`100 tonnes a day.`,
        },
        {
          level: 'board',
          title: 'Which law?',
          problem: r`Name the law: (a) a town keeps an open dump; (b) a factory discharges wastewater without a permit; (c) a smoke-belching bus; (d) a shipment of imported hazardous waste.`,
          steps: [
            r`(a) RA 9003. (b) RA 9275.`,
            r`(c) RA 8749. (d) RA 6969.`,
          ],
          answer: r`RA 9003; RA 9275; RA 8749; RA 6969.`,
        },
      ],
      traps: [
        r`Match each law to its number: 8749 air, 9275 water, 9003 solid waste.`,
        r`RA 6969 covers hazardous and nuclear WASTES and toxic substances, not ordinary garbage.`,
      ],
      check: [
        { q: r`What is RA 8749?`, a: r`The Philippine Clean Air Act (1999).` },
        { q: r`What decree is the Philippine Environmental Policy?`, a: r`PD 1151 (1977).` },
      ],
    },
    {
      name: 'Sustainable Development',
      inShort: r`Development that lasts: meeting today's needs without robbing the future.`,
      body: [
        r`The **Brundtland Report** (1987) defined sustainable development as meeting present needs without compromising the ability of future generations to meet theirs. It rests on three pillars, **environment**, **society** and **economy**: a project that fails any one isn't sustainable. The UN's 17 **Sustainable Development Goals** (2015) set the targets to 2030; for an electrical engineer the closest are SDG 7 (affordable and clean energy), SDG 9 (industry and infrastructure), SDG 11 (sustainable cities) and SDG 13 (climate action).`,
        r`The tools are those of this course: energy efficiency, renewable energy, life-cycle assessment, and the **circular economy**, which designs products to be repaired, reused and recycled so that waste becomes the next product's material.`,
      ],
      keyIdeas: [
        r`Brundtland Report (1987): development that meets present needs without compromising future generations'.`,
        r`Three pillars: environment, society, economy. The UN's 17 Sustainable Development Goals (2015), including SDG 7 (clean energy) and SDG 13 (climate action).`,
        r`Tools: life-cycle assessment, energy efficiency, renewable energy, circular economy.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A solar project',
          problem: r`Which SDG does a rural solar electrification project most directly serve?`,
          steps: [r`SDG 7, affordable and clean energy (and through it SDG 13, climate action).`],
          answer: r`SDG 7.`,
        },
        {
          level: 'board',
          title: 'Is it sustainable?',
          problem: r`A hydro project gives cheap clean power but displaces a village without fair compensation. Is it sustainable? What would make it so?`,
          steps: [
            r`It meets the environmental and economic pillars but fails the social one, so no.`,
            r`Fair resettlement and compensation, community consultation, and sharing benefits with those affected.`,
          ],
          answer: r`No: it fails the social pillar until those affected are treated fairly.`,
        },
      ],
      traps: [
        r`Sustainability is not only environmental: a project that ignores people or costs isn't sustainable either.`,
        r`Recycling is good, but reducing and reusing come first.`,
      ],
      check: [
        { q: r`What are the three pillars of sustainability?`, a: r`Environment, society and economy.` },
        { q: r`Which SDG is affordable and clean energy?`, a: r`SDG 7.` },
      ],
    },
  ],
};
