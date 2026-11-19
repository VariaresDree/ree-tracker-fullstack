// Library › Lessons › EE › Electrical System & Illumination Design
// (2026-11-19): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order; every worked example checked by computation. The PEC's
// sizing rules (continuous load, motor protection, conduit fill, ampacity
// correction, voltage-drop limits, dwelling demand factors) are in ESAS ›
// Electrical Standards and Practices; this lesson applies them in a design.
const r = String.raw;

export default {
  topic: 'Electrical System & Illumination Design',
  subject: 'EE',
  overview: r`This is the design of a building's electrical system and its lighting, done the way a plan is checked for a permit. Compute the loads and apply the PEC demand factors; divide them into branch circuits; size feeders, the service and the transformer; choose conductors for ampacity and voltage drop; select overcurrent devices that also interrupt the available fault current; handle motors' starting currents; ground everything; and put it on plans with a panel schedule. Then light the spaces: the lumen method for average illuminance, the point-by-point method for specific spots, the right lamps and an efficient, code-compliant result including emergency lighting.`,
  sources: [
    'Philippine Electrical Code 2017, Part 1',
    'Electrical Design (Fajardo and Fajardo) and similar Philippine design references',
    'IES Lighting Handbook; NFPA 101 for emergency lighting',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Load Computation',
      inShort: r`Add up the connected loads, then apply the code's demand factors.`,
      keyIdeas: [
        r`General lighting = unit load × floor area; each small-appliance and laundry circuit adds 1500 VA (dwelling).`,
        r`Dwelling lighting demand: first 3000 VA at 100%, the next up to 120,000 VA at 35%.`,
        r`Range demand: 8 kW for one range up to 12 kW, plus 5% per kW above; neutral may take 70% of load above 200 A.`,
      ],
      example: {
        problem: r`A house has 4000 VA of general lighting, two small-appliance circuits, one laundry circuit and a 16 kW range, at 230 V. Find the demand load and current.`,
        solution: r`Lighting group $= 4000 + 4500 = 8500$ VA → $3000 + 0.35 \times 5500 = 4925$ VA. Range: $8 \times 1.20 = 9.6$ kW. Total 14,525 VA, $\frac{14{,}525}{230} = 63.2$ A.`,
      },
      traps: [r`Small-appliance and laundry loads join the LIGHTING load before the demand factor is applied.`],
    },
    {
      name: 'Branch Circuits',
      inShort: r`Divide the load into circuits of standard ratings, each loaded within its limit.`,
      keyIdeas: [
        r`$N = \frac{S}{VI_{rating}}$, rounded up; continuous loads at most 80% of the rating.`,
        r`Branch-circuit conductors and devices are rated for the circuit's breaker (15, 20, 30 A…).`,
        r`Separate circuits for appliances, receptacles and lighting; GFCI where water is near.`,
      ],
      example: {
        problem: r`A continuous lighting load of 24 kVA at 230 V is to be served by 20 A circuits. How many circuits?`,
        solution: r`$N = \frac{24{,}000 \times 1.25}{230 \times 20} = 6.5$, so 7 circuits.`,
      },
      traps: [r`Round the number of circuits UP, never down.`],
    },
    {
      name: 'Feeders and Services',
      inShort: r`Feeders carry the demand of the circuits they serve; the service brings power into the building.`,
      keyIdeas: [
        r`Feeder load = sum of branch demand loads (largest motor at 125%, plus the others).`,
        r`Transformer $\ge \frac{P_{demand}}{\text{pf}}$, next standard size; service current $\frac{S}{\sqrt3V_L}$.`,
        r`Service conductors and main breaker sized to the demand load, with the continuous-load rule.`,
      ],
      example: {
        problem: r`A building has a 400 kW demand at 0.85 pf, served at 400 V three-phase. Size the transformer and find the service current.`,
        solution: r`$\frac{400}{0.85} = 471$ kVA, so 500 kVA. $I = \frac{500{,}000}{\sqrt3 \times 400} = 722$ A.`,
      },
      traps: [r`Size from the DEMAND load, not the connected load.`],
    },
    {
      name: 'Conductor and Conduit Sizing',
      inShort: r`A conductor must carry the current (ampacity) and keep the voltage drop small.`,
      keyIdeas: [
        r`Ampacity after correction and adjustment factors $\ge$ the load (125% for continuous).`,
        r`For drop: $\text{CM} = \frac{kKIL}{\text{VD}}$, $k = 2$ single phase, $\sqrt3$ three phase; take the larger of the two sizes.`,
        r`Conduit fill: 40% for three or more conductors.`,
      ],
      example: {
        problem: r`A 230 V, 60 A single-phase load is 200 ft away. What copper area keeps the drop to 3%?`,
        solution: r`$\text{CM} = \frac{2 \times 10.4 \times 60 \times 200}{6.9} = 36{,}200$ cmil: #4 AWG (41,740 cmil), if its ampacity is enough.`,
      },
      traps: [r`L is the ONE-WAY length; the 2 already covers the return.`],
    },
    {
      name: 'Overcurrent Protection',
      inShort: r`Devices that protect conductors from overload and interrupt faults safely.`,
      keyIdeas: [
        r`Rating $\le$ conductor ampacity (next standard size allowed in some cases).`,
        r`Interrupting rating $\ge$ available fault current at the device.`,
        r`Coordination: the device nearest the fault opens first.`,
      ],
      example: {
        problem: r`A main breaker sits right at a 500 kVA, 400 V transformer with 5% impedance. What interrupting rating does it need at least?`,
        solution: r`$I_{sc} = \frac{722}{0.05} = 14.4$ kA (infinite source), so at least 22 or 25 kA, plus any motor contribution.`,
      },
      traps: [r`A breaker that carries the load but cannot interrupt the fault can explode.`],
    },
    {
      name: 'Motor Circuits',
      inShort: r`Motors draw several times their running current to start; circuits are sized around that.`,
      keyIdeas: [
        r`Conductors 125% FLC; disconnect $\ge 1.15$ FLC; overload and short-circuit device per the PEC percentages.`,
        r`Locked-rotor current from the code letter: $\frac{(\text{kVA/hp})\,\text{hp} \times 1000}{\sqrt3V}$.`,
        r`Starting dip $\frac{S_{LR}}{S_{sc} + S_{LR}}$; large dips call for reduced-voltage starting.`,
      ],
      example: {
        problem: r`A 50 hp, 460 V, code G motor (65 A FLC) starts on a bus with 10 MVA short-circuit capacity. Find its locked-rotor current, the minimum disconnect rating and the voltage dip.`,
        solution: r`$I_{LR} = \frac{6.29 \times 50 \times 1000}{\sqrt3 \times 460} = 395$ A. Disconnect $\ge 74.8$ A. Dip $= \frac{314.5}{10{,}314.5} = 3.0\%$.`,
      },
      traps: [r`Use the code TABLE full-load current, not the nameplate, for conductors and protection.`],
    },
    {
      name: 'Voltage Drop',
      inShort: r`Keep the drop within 3% on a branch and 5% overall (PEC recommendation).`,
      keyIdeas: [
        r`$\text{VD} = kIL(R'\cos\theta + X'\sin\theta)$; for resistive loads $kIR'L$.`,
        r`Several loads along a feeder: $\text{VD} = kr\sum I_jL_j$ (moments).`,
        r`Fix a large drop with a bigger conductor, a shorter run, or a higher voltage.`,
      ],
      example: {
        problem: r`A 230 V single-phase feeder ($r = 0.002$ Ω/m per conductor) supplies 20 A at 30 m, 15 A at 60 m and 10 A at 100 m. Find the drop at the end.`,
        solution: r`$\text{VD} = 2 \times 0.002(20 \times 30 + 15 \times 60 + 10 \times 100) = 10$ V, 4.3%.`,
      },
      traps: [r`Each load's distance is from the SOURCE, not from the previous load.`],
    },
    {
      name: 'Short-Circuit Calculation',
      inShort: r`Find the fault current at each panel to choose interrupting ratings.`,
      keyIdeas: [
        r`At a transformer: $\frac{I_{FL}}{Z_{pu}}$; down a cable: point-to-point, $\frac{I_1}{1 + f}$.`,
        r`MVA method: series elements $\frac{1}{\sum 1/\text{MVA}_i}$, parallel sources add.`,
        r`Running motors add about 4 × their full-load current.`,
      ],
      example: {
        problem: r`A 2 MVA, 6% transformer is fed from a 500 MVA utility at 480 V. Find the secondary fault current by the MVA method. A panel downstream has $f = 0.433$ from 30 kA: what is its fault current?`,
        solution: r`Transformer $\frac{2}{0.06} = 33.3$ MVA; total $\frac{1}{1/500 + 1/33.3} = 31.3$ MVA, so $\frac{31.3 \times 10^6}{\sqrt3 \times 480} = 37.6$ kA. Panel: $\frac{30}{1.433} = 20.9$ kA.`,
      },
      traps: [r`The utility's impedance matters: assuming an infinite source overstates the fault current.`],
    },
    {
      name: 'Grounding',
      inShort: r`Ground the system and bond equipment so faults clear and people stay safe.`,
      keyIdeas: [
        r`Grounding electrode: a single rod above 25 Ω needs a supplemental electrode at least 1.8 m away.`,
        r`Rods in parallel: $\frac{R_1}{n}F$, $F \approx 1.2$–1.5 at ordinary spacing.`,
        r`Equipment grounding conductors sized by the overcurrent device rating; bond neutral and ground only at the service.`,
      ],
      example: {
        problem: r`A ground rod measures 40 Ω. What must be done, and what is the likely resistance with a second rod (F = 1.2)?`,
        solution: r`It exceeds 25 Ω: add a second electrode. $\frac{40}{2} \times 1.2 = 24$ Ω.`,
      },
      traps: [r`Bonding neutral to ground downstream of the service puts neutral current on the grounding conductors.`],
    },
    {
      name: 'Plans and Specifications',
      inShort: r`The drawings and documents that describe the installation for a permit and for building it.`,
      keyIdeas: [
        r`Plans: lighting and power layouts, riser diagram, single-line diagram, panel schedules, legend.`,
        r`Panel schedule: each circuit's load, breaker and phase; balance the phases within about 10%.`,
        r`Specifications state materials, standards and workmanship; a registered PEE signs the plans.`,
      ],
      example: {
        problem: r`A panel's phase loads are 120, 100 and 95 A. Is it balanced?`,
        solution: r`Average 105 A; unbalance $\frac{120 - 105}{105} = 14.3\%$: move circuits from the 120 A phase.`,
      },
      traps: [r`An unbalanced panel overloads one phase and the neutral while others are lightly used.`],
    },
    {
      name: 'Lighting Fundamentals',
      inShort: r`Flux, intensity, illuminance and luminance: the quantities of light.`,
      keyIdeas: [
        r`Flux (lm); intensity (cd); illuminance $E = \frac{\Phi}{A}$ (lx); efficacy $\frac{\Phi}{P}$ (lm/W).`,
        r`Uniform point source $\Phi = 4\pi I$; matte surface luminance $L = \frac{\rho E}{\pi}$ (cd/m²).`,
        r`1 foot-candle = 10.76 lx.`,
      ],
      example: {
        problem: r`A source of 1000 cd shines equally in all directions. Find its flux. What is the luminance of a 70% matte wall lit to 500 lx?`,
        solution: r`$\Phi = 4\pi \times 1000 = 12{,}566$ lm. $L = \frac{0.7 \times 500}{\pi} = 111$ cd/m².`,
      },
      traps: [r`Illuminance (light arriving) is not luminance (brightness seen).`],
    },
    {
      name: 'Lumen Method',
      inShort: r`The number of luminaires for an average illuminance.`,
      keyIdeas: [
        r`$N = \frac{EA}{\Phi\,\text{CU}\,\text{LLF}}$; CU from the room cavity ratio $\frac{5h(L + W)}{LW}$.`,
        r`LLF = lamp lumen depreciation × dirt depreciation × ballast factor…`,
        r`Keep spacing within SMH × mounting height for evenness.`,
      ],
      example: {
        problem: r`A 20 × 10 m office needs 500 lx. Luminaires give 4000 lm with CU 0.6 at a 2.5 m cavity, LLF 0.765. Find the RCR and number of luminaires.`,
        solution: r`$\text{RCR} = \frac{5 \times 2.5 \times 30}{200} = 1.88$. $N = \frac{500 \times 200}{4000 \times 0.6 \times 0.765} = 54.5$, so 55.`,
      },
      traps: [r`Design for MAINTAINED illuminance: divide by the light loss factor.`],
    },
    {
      name: 'Point-by-Point Method',
      inShort: r`Illuminance at specific points from each luminaire's intensity.`,
      keyIdeas: [
        r`$E = \frac{I\cos\theta}{d^2}$; from mounting height $E_h = \frac{I\cos^3\theta}{h^2}$, $E_v = \frac{I\sin\theta\cos^2\theta}{h^2}$.`,
        r`Several luminaires: add their contributions at the point.`,
        r`Used for spot checks, sports lighting and floodlighting.`,
      ],
      example: {
        problem: r`A 1000 cd lamp hangs 3 m above the floor. Find the illuminance directly below and at a point 45° off the vertical.`,
        solution: r`Below: $\frac{1000}{9} = 111$ lx. At 45°: $111 \times \cos^3 45° = 39.3$ lx.`,
      },
      traps: [r`With the mounting height, use cos³θ, not cosθ.`],
    },
    {
      name: 'Lamp Types',
      inShort: r`Choose lamps by efficacy, life, color and cost.`,
      keyIdeas: [
        r`Incandescent (~15 lm/W), fluorescent (~80–100), HID (metal halide, HPS ~100+), LED (100–200 lm/W).`,
        r`Color temperature (K) and color rendering index (CRI) set the look.`,
        r`Energy cost $= \frac{PNtr}{1000}$.`,
      ],
      example: {
        problem: r`100 luminaires of 36 W run 3000 h a year at ₱10/kWh. Find the annual energy cost.`,
        solution: r`$\frac{36 \times 100 \times 3000 \times 10}{1000} = ₱108{,}000$.`,
      },
      traps: [r`Include ballast or driver losses in the luminaire's watts.`],
    },
    {
      name: 'Emergency and Energy-Efficient Lighting',
      inShort: r`Light the way out when power fails; use as little energy as possible the rest of the time.`,
      keyIdeas: [
        r`Emergency lighting: 1.5 h; about 10 lx average, at least 1 lx along egress (NFPA 101).`,
        r`Lighting power density $\frac{\sum P}{A}$ W/m² against the energy code.`,
        r`Payback $= \frac{\text{cost}}{\text{annual savings}}$; controls (occupancy, daylight) save more.`,
      ],
      example: {
        problem: r`200 W of emergency lighting runs from a 12 V battery (80% usable) for 1.5 h. Size the battery. Replacing 100 lamps of 40 W with 18 W LEDs costs ₱60,000 (3000 h, ₱10/kWh): find the payback.`,
        solution: r`$C = \frac{200 \times 1.5}{12 \times 0.8} = 31$ Ah. Savings $= \frac{22 \times 100 \times 3000 \times 10}{1000} = ₱66{,}000$/yr: payback 0.9 year.`,
      },
      traps: [r`Emergency lights must work when the normal supply fails: test them under real battery power.`],
    },
  ],
};
