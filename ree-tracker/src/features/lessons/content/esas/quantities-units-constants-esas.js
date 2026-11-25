// Library › Lessons › ESAS › Quantities/units/constants
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// quantitiesEsasLesson.test.js; the text, problems and figures are this app's
// own): written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order. Units and tools in the Library converts between units;
// this lesson teaches the system behind them. Electrical units, materials and
// wire sizes are in Quantities (EE).
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

export const GM = 6.674e-11 * 5.972e24; // Earth, m³/s²
export const R_EARTH = 6.371e6; // m
export const G0 = 9.80665; // standard gravity, m/s²

export default {
  topic: 'Quantities/units/constants (ESAS)',
  subject: 'ESAS',
  overview: r`Every engineering number is a value times a unit, and most wrong answers come from the unit. The SI is built on seven base units; every other unit is a product of them, scaled by prefixes. To convert, multiply by factors equal to one (like $\frac{0.3048\ \text{m}}{1\ \text{ft}}$) until the unwanted units cancel. Check any formula by its dimensions: every term must match. This topic also gathers the constants the other subjects lean on.`,
  sources: [
    'The International System of Units (SI Brochure, BIPM, 9th edition)',
    'CODATA Recommended Values of the Fundamental Physical Constants (NIST)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'SI Base and Derived Units',
      inShort: r`The seven base units and the named units built from them.`,
      body: [
        r`The SI rests on seven **base units**:

| Quantity | Unit | Symbol |
|---|---|---|
| length | metre | m |
| mass | kilogram | kg |
| time | second | s |
| electric current | ampere | A |
| temperature | kelvin | K |
| amount of substance | mole | mol |
| luminous intensity | candela | cd |`,
        r`Since 2019 each is defined by fixing the value of a constant of nature (the speed of light, Planck's constant, the elementary charge and others), so no unit depends on a physical object any more. Every other unit is **derived** from these, and many have their own names, built one step at a time:`,
        {
          type: 'blocks',
          alt: 'A chain of derived units: the newton, multiplied by a metre, gives the joule; the joule divided by a second gives the watt; the watt divided by an ampere gives the volt; the volt divided by an ampere gives the ohm.',
          caption: 'From force to resistance: each named unit is the one before it times or over a base unit.',
          blocks: [
            { id: 'n', at: [0, 0], label: 'newton N' },
            { id: 'j', at: [0, 1], label: 'joule J' },
            { id: 'w', at: [0, 2], label: 'watt W' },
            { id: 'v', at: [0, 3], label: 'volt V' },
            { id: 'o', at: [0, 4], label: 'ohm Ω' },
          ],
          links: [
            ['n', 'j', { label: '× m' }],
            ['j', 'w', { label: '÷ s' }],
            ['w', 'v', { label: '÷ A' }],
            ['v', 'o', { label: '÷ A' }],
          ],
        },
        r`The newton itself is kg·m/s². Others follow the same way: C = A·s, F = C/V, Wb = V·s, T = Wb/m², H = Wb/A, Pa = N/m², Hz = 1/s.`,
      ],
      keyIdeas: [
        r`Base: metre, kilogram, second, ampere, kelvin, mole, candela.`,
        r`Derived: N = kg·m/s², J = N·m, W = J/s, V = W/A, Ω = V/A, C = A·s, F = C/V, Wb = V·s, T = Wb/m², H = Wb/A.`,
        r`Since 2019 every base unit is defined by an exact constant.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The ohm in base units',
          problem: r`Express the ohm in base units.`,
          steps: [r`$\Omega = \frac{\text{V}}{\text{A}} = \frac{\text{W}}{\text{A}^2} = \frac{\text{J/s}}{\text{A}^2} = \frac{\text{kg·m}^2}{\text{s}^3\,\text{A}^2}$.`],
          answer: r`kg·m²/(s³·A²).`,
        },
        {
          level: 'board',
          title: 'The henry and the tesla',
          problem: r`Express the henry and the tesla in base units.`,
          steps: [
            r`H = Wb/A = V·s/A; with V = kg·m²/(s³·A): $\text{H} = \frac{\text{kg·m}^2}{\text{s}^2\,\text{A}^2}$.`,
            r`T = Wb/m² = V·s/m²: $\text{T} = \frac{\text{kg}}{\text{s}^2\,\text{A}}$.`,
          ],
          answer: r`kg·m²/(s²·A²); kg/(s²·A).`,
        },
      ],
      traps: [
        r`The kelvin has no degree sign: 300 K, not 300 °K.`,
        r`The kilogram is the base unit, not the gram, even though prefixes attach to "gram".`,
      ],
      check: [
        { q: r`What is the SI base unit of thermodynamic temperature?`, a: r`The kelvin.` },
        { q: r`How many SI base units are there?`, a: r`Seven.` },
      ],
    },
    {
      name: 'Prefixes',
      inShort: r`Powers of ten that scale a unit up or down.`,
      body: [
        r`Prefixes scale a unit by powers of ten, in steps of a thousand for everyday engineering:

| Prefix | Symbol | Factor | Prefix | Symbol | Factor |
|---|---|---|---|---|---|
| exa | E | $10^{18}$ | milli | m | $10^{-3}$ |
| peta | P | $10^{15}$ | micro | µ | $10^{-6}$ |
| tera | T | $10^{12}$ | nano | n | $10^{-9}$ |
| giga | G | $10^{9}$ | pico | p | $10^{-12}$ |
| mega | M | $10^{6}$ | femto | f | $10^{-15}$ |
| kilo | k | $10^{3}$ | atto | a | $10^{-18}$ |`,
        r`(centi, $10^{-2}$, and deci, $10^{-1}$, survive in cm and dB.) A prefix belongs to the unit, so it is squared or cubed with it: 1 cm² = $(10^{-2}\ \text{m})^2 = 10^{-4}$ m². Computer memory uses **binary prefixes**: Ki = 1024, Mi = $2^{20}$ = 1 048 576.`,
      ],
      keyIdeas: [
        r`T $10^{12}$, G $10^9$, M $10^6$, k $10^3$; m $10^{-3}$, µ $10^{-6}$, n $10^{-9}$, p $10^{-12}$; also P $10^{15}$, f $10^{-15}$, a $10^{-18}$.`,
        r`A prefix on a squared or cubed unit is squared or cubed too.`,
        r`Binary prefixes for memory: Ki = 1024, Mi = $2^{20}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Three quick ones',
          problem: r`What voltage does 4 µA make across 2.5 MΩ? How many m² is 1 cm²? Convert 1 km/h to m/s.`,
          steps: [
            r`$2.5 \times 10^6 \times 4 \times 10^{-6} = 10$ V.`,
            r`$1\ \text{cm}^2 = (10^{-2})^2 = 10^{-4}$ m².`,
            r`$\frac{1000}{3600} = \frac{1}{3.6}$ m/s.`,
          ],
          answer: r`10 V; $10^{-4}$ m²; $\frac{1}{3.6}$ m/s.`,
        },
        {
          level: 'board',
          title: 'Adding mixed prefixes',
          problem: r`Add 470 nF and 0.33 µF in parallel. How many cubic metres is 1 mm³? Write 4.7 × 10⁻⁹ F with a prefix.`,
          steps: [
            r`0.33 µF = 330 nF: $470 + 330 = 800$ nF = 0.8 µF.`,
            r`$1\ \text{mm}^3 = (10^{-3})^3 = 10^{-9}$ m³.`,
            r`$4.7 \times 10^{-9}$ F = 4.7 nF.`,
          ],
          answer: r`800 nF; $10^{-9}$ m³; 4.7 nF.`,
        },
      ],
      traps: [
        r`m (milli) and M (mega) differ by $10^9$: case matters.`,
        r`1 mm³ is $10^{-9}$ m³, not $10^{-3}$: cube the prefix too.`,
      ],
      check: [
        { q: r`What does the prefix peta mean?`, a: r`$10^{15}$.` },
        { q: r`Which prefix means $10^{-18}$?`, a: r`Atto (a).` },
      ],
    },
    {
      name: 'Unit Conversion',
      inShort: r`Moving between SI and English units with exact factors.`,
      body: [
        r`To convert, multiply by fractions equal to one, chosen so the unwanted units cancel: $60\ \frac{\text{mi}}{\text{h}} \times \frac{1609.344\ \text{m}}{1\ \text{mi}} \times \frac{1\ \text{h}}{3600\ \text{s}}$. Some factors are exact by definition; the rest are measured:

| Quantity | Factor |
|---|---|
| length | 1 in = 2.54 cm (exact); 1 ft = 0.3048 m (exact); 1 mi = 1609.344 m |
| mass | 1 lb = 0.453 592 37 kg (exact) |
| force | 1 lbf = 4.448 N; 1 kgf = 9.806 65 N |
| pressure | 1 psi = 6.895 kPa; 1 atm = 101.325 kPa = 14.696 psi = 760 mmHg |
| volume | 1 ft³ = 0.028 317 m³ (1 m³ = 35.3147 ft³); 1 US gal = 3.785 L |
| density | 1 kg/m³ = 0.062 428 lb/ft³ |`,
        r`Carry units through every step: a result in the wrong units is the surest sign of a slip.`,
      ],
      keyIdeas: [
        r`Exact: 1 in = 2.54 cm, 1 ft = 0.3048 m, 1 lb = 0.453 592 37 kg.`,
        r`1 lbf = 4.448 N, 1 psi = 6.895 kPa, 1 atm = 101.325 kPa = 14.696 psi = 760 mmHg.`,
        r`Chain factors equal to one until only the wanted units remain.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Pressure and speed',
          problem: r`Convert 100 psi to kPa and 60 mi/h to m/s.`,
          steps: [
            r`$100 \times 6.895 = 689.5$ kPa.`,
            r`$\frac{60 \times 1609.344}{3600} = 26.8$ m/s.`,
          ],
          answer: r`689.5 kPa; 26.8 m/s.`,
        },
        {
          level: 'board',
          title: 'Airflow, density and sound',
          problem: r`Convert 25 m³/min to cubic feet per minute, 1500 kg/m³ to lb/ft³, and the speed of sound, 343 m/s, to ft/s.`,
          steps: [
            r`$25 \times 35.3147 = 882.9$ cfm.`,
            r`$1500 \times 0.062\,428 = 93.64$ lb/ft³.`,
            r`$\frac{343}{0.3048} = 1125.3$ ft/s.`,
          ],
          answer: r`882.9 cfm; 93.64 lb/ft³; 1125.3 ft/s.`,
        },
      ],
      traps: [
        r`Gauge pressure (psig) excludes the atmosphere; absolute (psia) includes it.`,
        r`Pound-mass and pound-force are different units: 1 lbf is the weight of 1 lb at standard gravity.`,
      ],
      check: [
        { q: r`How many centimetres are in an inch, exactly?`, a: r`2.54.` },
        { q: r`What is 1 atm in psi?`, a: r`14.696 psi.` },
      ],
    },
    {
      name: 'Mechanical Quantities',
      inShort: r`Force, torque, energy and power, and their units.`,
      body: [
        r`**Force** (newton) changes motion; **weight** is a force, $W = mg$. **Torque** (N·m) twists; **work and energy** (joule) are force times distance; **power** (watt) is energy per second. For a rotating shaft $P = T\omega$, with ω in rad/s; with the speed in rpm and the power in kW, $P = \frac{Tn}{9549}$. At a fixed torque, power rises in proportion to speed:`,
        {
          type: 'plot',
          alt: 'Shaft power against speed from 0 to 3600 rpm for torques of 50, 100 and 150 newton metres: three straight lines through the origin, steepest for the largest torque; at 100 newton metres and 1800 rpm the power is 18.85 kilowatts.',
          caption: 'Power against speed at 50, 100 and 150 N·m (lowest to highest): 100 N·m at 1800 rpm is 18.85 kW.',
          x: [0, 3600],
          y: [0, 60],
          xLabel: 'speed (rpm)',
          yLabel: 'power (kW)',
          series: [50, 100, 150].map((t, i) => ({ f: (n) => (t * n) / 9549, label: `${t} N·m`, colour: colourOf(i) })),
          legend: false,
          marks: [{ x: 1800, label: '1800 rpm' }],
        },
        r`Older units persist: 1 hp = 550 ft·lbf/s = 745.7 W (the metric horsepower is 735.5 W), and 1 kgf = 9.806 65 N.`,
      ],
      keyIdeas: [
        r`$P = T\omega$; $P_{\text{kW}} = \frac{T\,n}{9549}$ with $T$ in N·m and $n$ in rpm.`,
        r`1 hp = 550 ft·lbf/s = 745.7 W; metric hp = 735.5 W.`,
        r`Weight is a force: $W = mg$, with $g = 9.806\,65$ m/s² standard.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "A motor's output",
          problem: r`A motor delivers 100 N·m at 1800 rpm. What is its output in kW and hp?`,
          steps: [
            r`$\frac{100 \times 1800}{9549} = 18.85$ kW.`,
            r`$\frac{18\,850}{745.7} = 25.3$ hp.`,
          ],
          answer: r`18.85 kW; 25.3 hp.`,
        },
        {
          level: 'board',
          title: 'A hoist',
          problem: r`A hoist lifts 2 t at 0.5 m/s. Find the power in kW and hp, and the torque its motor must give at 1450 rpm (no losses).`,
          steps: [
            r`$P = mgv = 2000 \times 9.806\,65 \times 0.5 = 9807$ W, 9.81 kW.`,
            r`$\frac{9807}{745.7} = 13.15$ hp.`,
            r`$T = \frac{9549 \times 9.807}{1450} = 64.6$ N·m.`,
          ],
          answer: r`9.81 kW, 13.15 hp; 64.6 N·m.`,
        },
      ],
      traps: [
        r`ω must be in rad/s: rpm × $\frac{2\pi}{60}$.`,
        r`Mass in tonnes: 2 t is 2000 kg.`,
      ],
      check: [
        { q: r`How many watts are in one (mechanical) horsepower?`, a: r`745.7 W.` },
        { q: r`Where does the 9549 in $P = \frac{Tn}{9549}$ come from?`, a: r`$\frac{60 \times 1000}{2\pi}$: rpm to rad/s and W to kW.` },
      ],
    },
    {
      name: 'Thermal Quantities',
      inShort: r`Temperature, heat and their units.`,
      body: [
        r`Two scales start at absolute zero, kelvin (with Celsius-sized degrees) and rankine (Fahrenheit-sized); two start elsewhere, Celsius (water freezes at 0) and Fahrenheit (at 32). Between Celsius and Fahrenheit, $°F = 1.8\,°C + 32$, a straight line that crosses the line of equal readings at −40:`,
        {
          type: 'plot',
          alt: 'Fahrenheit reading against Celsius reading from minus 60 to 120 degrees: a straight line of slope 1.8 through 32 at 0 Celsius, crossing the dashed line of equal readings at minus 40.',
          caption: '°F against °C: the scales agree only at −40 (where the line meets the dashed line of equal readings).',
          x: [-60, 120],
          y: [-80, 260],
          xLabel: '°C',
          yLabel: '°F',
          series: [
            { f: (c) => 1.8 * c + 32, label: '°F' },
            { f: (c) => c, label: 'equal', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: -40, label: '−40' }],
        },
        r`A temperature **difference** has no offset: a rise of 10 °C is 10 K and 18 °F. Heat is energy: 1 cal = 4.184 J, 1 BTU = 1055 J, 1 kWh = 3.6 MJ = 3412 BTU, and a ton of refrigeration is 12 000 BTU/h = 3.517 kW.`,
      ],
      keyIdeas: [
        r`K = °C + 273.15; °F = 1.8 °C + 32; °R = °F + 459.67.`,
        r`A temperature DIFFERENCE has no offset: 10 K = 10 °C = 18 °F.`,
        r`1 cal = 4.184 J, 1 BTU = 1055 J, 1 kWh = 3412 BTU, 1 TR = 3.517 kW.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'BTU and a temperature rise',
          problem: r`How many BTU are in 1 kWh? A heater raises water by 10 °C: what is that in °F?`,
          steps: [
            r`$\frac{3.6 \times 10^6}{1055.06} = 3412$ BTU.`,
            r`A change of $1.8 \times 10 = 18$ °F (no +32 for a difference).`,
          ],
          answer: r`3412 BTU; 18 °F.`,
        },
        {
          level: 'board',
          title: 'Twice the reading, and an air conditioner',
          problem: r`At what temperature does a Fahrenheit thermometer read twice a Celsius one? Give it in kelvin too. A unit removes 100 000 BTU/h: what is that in kW and in tons of refrigeration?`,
          steps: [
            r`$1.8C + 32 = 2C$ gives $C = 160$ °C, 320 °F, 433.15 K.`,
            r`$\frac{100\,000 \times 1055.06}{3600} = 29.3$ kW; $\frac{100\,000}{12\,000} = 8.33$ TR.`,
          ],
          answer: r`160 °C (433.15 K); 29.3 kW, 8.33 TR.`,
        },
      ],
      traps: [
        r`Use kelvin in gas laws and radiation; °C is fine for differences.`,
        r`A ton of refrigeration is a POWER (12 000 BTU per hour), not an energy.`,
      ],
      check: [
        { q: r`At what temperature do the Celsius and Fahrenheit scales agree?`, a: r`−40.` },
        { q: r`What is the thermodynamic temperature scale of the English system?`, a: r`The Rankine scale.` },
      ],
    },
    {
      name: 'Physical Constants',
      inShort: r`The fixed numbers of physics engineers use most.`,
      body: [
        r`Since 2019 several constants are **exact** by definition, and the units follow from them:

| Constant | Value |
|---|---|
| speed of light c | 299 792 458 m/s (exact) |
| Planck's constant h | $6.626\,070\,15 \times 10^{-34}$ J·s (exact) |
| elementary charge e | $1.602\,176\,634 \times 10^{-19}$ C (exact) |
| Boltzmann's constant k | $1.380\,649 \times 10^{-23}$ J/K (exact) |
| electron mass $m_e$ | $9.109 \times 10^{-31}$ kg |
| proton mass $m_p$ | $1.673 \times 10^{-27}$ kg |
| permittivity of free space $\varepsilon_0$ | $8.854 \times 10^{-12}$ F/m |
| permeability of free space $\mu_0$ | $\approx 4\pi \times 10^{-7}$ H/m |
| gravitational constant G | $6.674 \times 10^{-11}$ N·m²/kg² |`,
        r`Gravity at the Earth's surface follows from G, the Earth's mass and radius, $g = \frac{GM}{R^2}$, and weakens with height as the square of the distance from the Earth's centre:`,
        {
          type: 'plot',
          alt: 'The acceleration of gravity against height above the Earth from 0 to 1000 kilometres: falling slowly from 9.82 metres per second squared at the surface to 8.69 at 400 kilometres and about 7.3 at 1000 kilometres.',
          caption: 'Gravity with height: 9.82 m/s² at the surface, still 8.69 at 400 km, where the space station orbits.',
          x: [0, 1000],
          y: [6, 10.5],
          xLabel: 'height (km)',
          yLabel: 'g (m/s²)',
          series: [{ f: (h) => GM / (R_EARTH + h * 1000) ** 2, label: 'g', area: true }],
          marks: [{ x: 400, label: '400 km' }],
        },
      ],
      keyIdeas: [
        r`$c = 299\,792\,458$ m/s, $h = 6.626 \times 10^{-34}$ J·s, $e = 1.602 \times 10^{-19}$ C (exact since 2019).`,
        r`$m_e = 9.109 \times 10^{-31}$ kg, $m_p = 1.673 \times 10^{-27}$ kg, $\varepsilon_0 = 8.854 \times 10^{-12}$ F/m, $\mu_0 \approx 4\pi \times 10^{-7}$ H/m.`,
        r`$G = 6.674 \times 10^{-11}$ N·m²/kg²; Earth $R = 6371$ km, $M = 5.97 \times 10^{24}$ kg.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Gravity from G',
          problem: r`Find g at the Earth's surface from G, the Earth's mass and its radius.`,
          steps: [r`$g = \frac{GM}{R^2} = \frac{6.674 \times 10^{-11} \times 5.972 \times 10^{24}}{(6.371 \times 10^6)^2} = 9.82$ m/s².`],
          answer: r`9.82 m/s².`,
        },
        {
          level: 'board',
          title: 'Up high, and far away',
          problem: r`Find g at 400 km above the surface. How long does a radio signal take to reach a geostationary satellite 35 786 km up?`,
          steps: [
            r`$g = \frac{GM}{(6.771 \times 10^6)^2} = 8.69$ m/s².`,
            r`$t = \frac{35\,786 \times 10^3}{299\,792\,458} = 0.119$ s.`,
          ],
          answer: r`8.69 m/s²; 0.119 s.`,
        },
      ],
      traps: [
        r`Standard gravity 9.806 65 m/s² is a defined value; the real g varies with place.`,
        r`Measure height from the Earth's CENTRE in $\frac{GM}{r^2}$: add the radius.`,
      ],
      check: [
        { q: r`Which constants have been exact since 2019?`, a: r`Among them c, h, e and k (and Avogadro's number).` },
        { q: r`Is astronauts' weightlessness because gravity vanishes in orbit?`, a: r`No: g is still about 8.7 m/s² at 400 km; they are in free fall.` },
      ],
    },
    {
      name: 'Chemical Constants',
      inShort: r`Avogadro, the gas constant, molar volume and standard conditions.`,
      body: [
        r`Chemistry counts particles in moles: one mole is exactly $6.022\,140\,76 \times 10^{23}$ of them (Avogadro's number, exact since 2019). The other constants follow from it:

| Constant | Value |
|---|---|
| Avogadro's number $N_A$ | $6.022 \times 10^{23}$ /mol |
| gas constant R | 8.314 J/(mol·K) = 0.082 06 L·atm/(mol·K) |
| Faraday's constant F | 96 485 C/mol ($N_Ae$) |
| molar volume of an ideal gas | 22.414 L at 0 °C, 1 atm; 22.711 L at 0 °C, 100 kPa; 24.79 L at 25 °C, 100 kPa |`,
        r`"Standard temperature and pressure" has more than one meaning: 0 °C and 1 atm in older texts, 0 °C and 100 kPa in IUPAC's current one. Check which a problem means.`,
      ],
      keyIdeas: [
        r`$N_A = 6.022 \times 10^{23}$ /mol; $R = 8.314$ J/(mol·K) $= 0.082\,06$ L·atm/(mol·K); $F = 96\,485$ C/mol.`,
        r`Molar volume 22.414 L at 0 °C, 1 atm; 22.711 L at 0 °C, 100 kPa; 24.79 L at 25 °C, 100 kPa.`,
        r`Atomic masses: H 1.008, C 12.011, O 15.999, Cu 63.55; water 18.015 g/mol.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A kilogram of water',
          problem: r`How many moles and molecules are in 1 kg of water?`,
          steps: [
            r`$\frac{1000}{18.015} = 55.5$ mol.`,
            r`$55.5 \times 6.022 \times 10^{23} = 3.34 \times 10^{25}$ molecules.`,
          ],
          answer: r`55.5 mol; $3.34 \times 10^{25}$.`,
        },
        {
          level: 'board',
          title: 'A cubic metre of gas, and a mole of copper',
          problem: r`How many molecules are in 1 m³ of an ideal gas at 0 °C and 1 atm? What charge deposits 1 mol of copper from Cu²⁺?`,
          steps: [
            r`$\frac{1000}{22.414} \times 6.022 \times 10^{23} = 2.69 \times 10^{25}$ molecules.`,
            r`Two electrons per ion: $2F = 192\,970$ C.`,
          ],
          answer: r`$2.69 \times 10^{25}$; 192 970 C.`,
        },
      ],
      traps: [
        r`"STP" means 1 atm in older texts and 100 kPa in IUPAC's: check which.`,
        r`Match R's units to the problem: 8.314 with pascals and m³, 0.082 06 with atm and litres.`,
      ],
      check: [
        { q: r`What is Faraday's constant, in terms of other constants?`, a: r`$N_Ae$, about 96 485 C/mol.` },
        { q: r`How many litres does one mole of ideal gas fill at 0 °C and 1 atm?`, a: r`22.414 L.` },
      ],
    },
    {
      name: 'Dimensional Analysis',
      inShort: r`Checking and building formulas from the dimensions of their quantities.`,
      body: [
        r`Every quantity has **dimensions** built from mass M, length L, time T, current I and temperature Θ: force $MLT^{-2}$, energy $ML^2T^{-2}$, power $ML^2T^{-3}$, voltage $ML^2T^{-3}I^{-1}$. Two rules follow: every term of an equation must have the same dimensions, and the argument of exp, ln or sin must be dimensionless. So a formula can be checked, and its form even found, without solving anything.`,
        r`A pendulum's period can depend only on its length L, its mass m and g. The only dimensionless group is $T\sqrt{g/L}$, so $T \propto \sqrt{L/g}$, with no mass. The full result, $T = 2\pi\sqrt{L/g}$, needs physics for the $2\pi$:`,
        {
          type: 'plot',
          alt: 'A pendulum’s period against its length from 0 to 4 metres: rising as the square root of the length, about 2.0 seconds at 1 metre and 4.0 seconds at 4 metres.',
          caption: 'A pendulum’s period grows as √L: about 2.0 s at 1 m, twice that at 4 m.',
          x: [0, 4],
          y: [0, 4.5],
          xLabel: 'length (m)',
          yLabel: 'period (s)',
          series: [{ f: (L) => 2 * Math.PI * Math.sqrt(L / G0), label: 'T', area: true }],
          marks: [{ x: 1, label: '1 m' }],
        },
        r`**Buckingham's π theorem** generalises this: n variables built from k independent dimensions form $n - k$ dimensionless groups, the basis of model testing.`,
      ],
      keyIdeas: [
        r`Dimensions: force $MLT^{-2}$, energy $ML^2T^{-2}$, power $ML^2T^{-3}$, voltage $ML^2T^{-3}I^{-1}$.`,
        r`Every term in an equation has the same dimensions; arguments of exp, ln and sin are dimensionless.`,
        r`Buckingham π: $n$ variables in $k$ dimensions form $n - k$ dimensionless groups.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A kinematics check, and a pendulum',
          problem: r`Check $v^2 = u^2 + 2as$ dimensionally, and find how a pendulum's period depends on its length L and g.`,
          steps: [
            r`$[v^2] = L^2T^{-2}$ and $[as] = LT^{-2} \cdot L = L^2T^{-2}$: consistent.`,
            r`Period: one group $T\sqrt{g/L}$, so $T \propto \sqrt{L/g}$ (mass drops out).`,
          ],
          answer: r`Consistent; $T \propto \sqrt{L/g}$.`,
        },
        {
          level: 'board',
          title: 'Drag on a sphere',
          problem: r`The drag F on a sphere depends on the fluid's density ρ and viscosity μ, the speed v and the diameter d. How many dimensionless groups govern it, and what are they?`,
          steps: [
            r`Five variables (F, ρ, μ, v, d) in three dimensions (M, L, T): $5 - 3 = 2$ groups.`,
            r`A drag coefficient $\frac{F}{\rho v^2d^2}$ and the Reynolds number $\frac{\rho vd}{\mu}$.`,
          ],
          answer: r`Two: $\frac{F}{\rho v^2d^2}$ and $\frac{\rho vd}{\mu}$.`,
        },
      ],
      traps: [
        r`Dimensional analysis can't find pure numbers like the $2\pi$ in $T = 2\pi\sqrt{L/g}$.`,
        r`Consistent dimensions don't prove a formula right; inconsistent ones prove it wrong.`,
      ],
      check: [
        { q: r`What are the dimensions of power?`, a: r`$ML^2T^{-3}$.` },
        { q: r`Six variables in three dimensions form how many dimensionless groups?`, a: r`Three.` },
      ],
    },
  ],
};
