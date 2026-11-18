// Library › Lessons › ESAS › Environmental Science & Engineering
// (2026-11-18): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order; every worked example checked by computation.
// Chemistry for Engineers covers ppm conversions, BOD and hardness.
const r = String.raw;

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
      keyIdeas: [
        r`Ecosystems: producers, consumers and decomposers; energy flows one way, matter cycles (carbon, nitrogen, water, phosphorus).`,
        r`About 10% of energy passes from one trophic level to the next: $E_n \approx E_1(0.1)^{n-1}$.`,
        r`Biodiversity, niches, succession; biomagnification concentrates toxins up the food chain.`,
      ],
      example: {
        problem: r`Plants in a pond fix 10 000 kcal. About how much energy reaches the fourth trophic level?`,
        solution: r`$10\,000(0.1)^3 = 10$ kcal: a thousandth of what the plants captured.`,
      },
      traps: [r`Energy does not cycle; matter does.`],
    },
    {
      name: 'Natural Systems and Resources',
      inShort: r`Renewable and non-renewable resources, and how fast populations and demand grow.`,
      keyIdeas: [
        r`Exponential growth $N = N_0e^{rt}$; doubling time $\approx \frac{70}{r\%}$; logistic growth levels off at the carrying capacity.`,
        r`Reserve lifetime: $\frac{R}{C_0}$ at steady use; $\frac{1}{r}\ln\left(\frac{rR}{C_0} + 1\right)$ if use grows.`,
        r`Renewable (solar, wind, water, biomass) vs non-renewable (fossil fuels, minerals).`,
      ],
      example: {
        problem: r`A fuel has reserves of 100 years at today's use. How long will it last if use grows 2% a year? How long does 2% growth take to double demand?`,
        solution: r`$\frac{1}{0.02}\ln(0.02 \times 100 + 1) = 50\ln 3 = 55$ years. Doubling: $\frac{70}{2} = 35$ years.`,
      },
      traps: [r`Steady growth makes "100 years of reserves" a misleading figure.`],
    },
    {
      name: 'Environmental Concerns and Crises',
      inShort: r`The big problems: pollution, biodiversity loss, deforestation, ozone depletion, climate change.`,
      keyIdeas: [
        r`Impact $I = P \times A \times T$: population, affluence, technology.`,
        r`Ozone depletion by CFCs (Montreal Protocol, 1987) is the success story of global action.`,
        r`Local crises: air pollution in cities, polluted rivers, flooding, loss of forests and mangroves.`,
      ],
      example: {
        problem: r`Population grows 50% and consumption per person doubles. By how much must technology cut its impact per unit to keep the total impact the same?`,
        solution: r`$1.5 \times 2 = 3$ times the activity, so impact per unit must fall to $\frac13$: a two-thirds cut.`,
      },
      traps: [r`The ozone hole and global warming are different problems with different causes.`],
    },
    {
      name: 'Air Pollution',
      inShort: r`What pollutes the air, how it spreads, and how it is controlled.`,
      keyIdeas: [
        r`Criteria pollutants: particulates (PM10, PM2.5), SO₂, NOₓ, CO, ozone, lead.`,
        r`Ground-level concentration downwind: $\frac{Q}{\pi\sigma_y\sigma_zu}e^{-H^2/2\sigma_z^2}$; taller stacks and stronger wind dilute.`,
        r`Controls: cyclones, fabric filters, electrostatic precipitators (particles); scrubbers (SO₂); low-NOₓ burners; catalytic converters.`,
      ],
      example: {
        problem: r`A stack emits 100 g/s with an effective height of 40 m; wind 5 m/s, $\sigma_y = 30$ m, $\sigma_z = 15$ m downwind. Find the ground-level centreline concentration.`,
        solution: r`$\frac{100}{\pi(30)(15)(5)}e^{-1600/450} = 0.0141 \times 0.0286 = 4.0 \times 10^{-4}$ g/m³, about 404 µg/m³.`,
      },
      traps: [r`An inversion traps pollutants near the ground: the worst air comes on calm, stable nights.`],
    },
    {
      name: 'Water Pollution',
      inShort: r`Pollutants in rivers and lakes, their effect on oxygen, and treatment.`,
      keyIdeas: [
        r`Organic waste uses up dissolved oxygen as it decays (BOD); the Streeter-Phelps sag gives the deficit downstream.`,
        r`Mixing: $C = \frac{Q_1C_1 + Q_2C_2}{Q_1 + Q_2}$; detention $\frac{V}{Q}$; settling needs a speed above $\frac{Q}{A_s}$.`,
        r`Treatment: primary (settling), secondary (biological), tertiary (nutrients, disinfection). Nutrients cause eutrophication.`,
      ],
      example: {
        problem: r`Below an outfall: $L_0 = 20$ mg/L, $D_0 = 1$ mg/L, $k_1 = 0.23$, $k_2 = 0.5$ per day; saturation 8.26 mg/L. Find when the oxygen is lowest and how low.`,
        solution: r`$t_c = \frac{1}{0.27}\ln\left[\frac{0.5}{0.23}\left(1 - \frac{1(0.27)}{0.23(20)}\right)\right] = 2.65$ days; $D_c = 5.0$ mg/L, so DO $= 8.26 - 5.0 = 3.3$ mg/L, too low for most fish.`,
      },
      traps: [r`The worst oxygen is downstream of the outfall, not at it.`],
    },
    {
      name: 'Solid and Hazardous Waste',
      inShort: r`Reducing, collecting, treating and disposing of waste safely.`,
      keyIdeas: [
        r`Hierarchy: reduce, reuse, recycle (and compost), recover energy, then dispose.`,
        r`Landfill volume $= \frac{\text{mass}}{\text{compacted density}}$ plus cover; sanitary landfills line and cover waste and collect leachate and gas.`,
        r`Hazardous wastes (toxic, corrosive, reactive, ignitable) are tracked from cradle to grave (RA 6969).`,
      ],
      example: {
        problem: r`A town of 100 000 makes 0.5 kg of waste per person a day, compacted to 600 kg/m³, with cover adding 20%. How much landfill volume does a year need?`,
        solution: r`$\frac{100\,000(0.5)(365)}{600} = 30\,417$ m³, and $\times 1.2 = 36\,500$ m³ with cover.`,
      },
      traps: [r`Open dumps are illegal under RA 9003; a sanitary landfill is not an open dump with soil on top.`],
    },
    {
      name: 'Climate Change',
      inShort: r`How greenhouse gases warm the Earth, and what is being done about it.`,
      keyIdeas: [
        r`Without greenhouse gases the Earth would be $T_e = \left[\frac{S(1 - \alpha)}{4\sigma}\right]^{1/4} = 255$ K; it is 288 K.`,
        r`CO₂ forcing $5.35\ln\frac{C}{C_0}$ W/m²; warming $\approx 0.8$ K per W/m². Other gases by $CO_2e = m \times GWP$.`,
        r`Kyoto Protocol (1997), Paris Agreement (2015: well below 2 °C, aim for 1.5 °C). The Philippines pledged a 75% cut against business as usual by 2030, mostly conditional on support.`,
      ],
      example: {
        problem: r`How much forcing and eventual warming does doubling CO₂ cause?`,
        solution: r`$5.35\ln 2 = 3.7$ W/m²; $0.8 \times 3.7 \approx 3$ °C.`,
      },
      traps: [r`Weather is day to day; climate is the long-term average.`],
    },
    {
      name: 'Environmental Impact Assessment',
      inShort: r`Studying a project's effects before it is approved.`,
      keyIdeas: [
        r`PD 1586 (1978) set up the EIS System; the DENR-EMB issues an Environmental Compliance Certificate (ECC).`,
        r`Environmentally critical projects (like power plants and heavy industry) and projects in critical areas need an EIS; others may get a Certificate of Non-Coverage.`,
        r`Steps: screening, scoping, the EIS study, review, decision, then monitoring of the ECC's conditions, with public participation throughout.`,
      ],
      example: {
        problem: r`A company plans a 300 MW coal power plant. What must it obtain before construction, and from whom?`,
        solution: r`An ECC from the DENR-EMB, after an Environmental Impact Statement: a power plant is an environmentally critical project under PD 1586.`,
      },
      traps: [r`An ECC is not a one-time paper: its conditions are monitored for the life of the project.`],
    },
    {
      name: 'Environmental Laws (RA 8749, 9275, 9003, PD 1586)',
      inShort: r`The Philippine laws that protect air, water and land.`,
      keyIdeas: [
        r`RA 8749 Clean Air Act (1999): air-quality standards, emission limits, vehicle and industry controls.`,
        r`RA 9275 Clean Water Act (2004): water-quality management areas, discharge permits, the polluter pays. RA 9003 Ecological Solid Waste Management Act (2000): segregation, materials recovery facilities, no open dumps, at least 25% diversion within 5 years.`,
        r`PD 1586 (1978): EIS System. RA 6969 (1990): toxic substances and hazardous wastes.`,
      ],
      example: {
        problem: r`A city generates 400 tonnes of waste a day. Under RA 9003's first target, how much had to be diverted from disposal?`,
        solution: r`At least 25%: $0.25 \times 400 = 100$ tonnes a day, through segregation, recycling and composting.`,
      },
      traps: [r`Match each law to its number: 8749 air, 9275 water, 9003 solid waste.`],
    },
    {
      name: 'Sustainable Development',
      inShort: r`Development that lasts: meeting today's needs without robbing the future.`,
      keyIdeas: [
        r`Brundtland Report (1987): development that meets present needs without compromising future generations'.`,
        r`Three pillars: environment, society, economy. The UN's 17 Sustainable Development Goals (2015), including SDG 7 (clean energy) and SDG 13 (climate action).`,
        r`Tools: life-cycle assessment, energy efficiency, renewable energy, circular economy.`,
      ],
      example: {
        problem: r`Which SDG does a rural solar electrification project most directly serve?`,
        solution: r`SDG 7, affordable and clean energy (and through it SDG 13, climate action).`,
      },
      traps: [r`Sustainability is not only environmental: a project that ignores people or costs isn't sustainable either.`],
    },
  ],
};
