// Library › Lessons › EE › Quantities/units/constants (EE)
// (2026-11-19; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// quantitiesEeLesson.test.js. Resistivity and temperature problem styles
// follow a review center's circuits handout; the text, problems and figures
// are this app's own): written for the Philippine REE board, subtopic by
// subtopic in the syllabus's order. The SI base units, prefixes and general
// conversions are in ESAS Quantities; ε₀, μ₀, R = ρL/A and circular mils in
// Circuits 1; e and the Coulomb constant in Electromagnetism.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// 1 kg of copper (ρ = 1.7241e-8 Ω·m, 8890 kg/m³) drawn to length L (m).
const drawn = (L) => (1.7241e-8 * 8890 * L * L) / 1;
// AWG cross-section in mm².
const awgArea = (n) => (Math.PI / 4) * (0.127 * 92 ** ((36 - n) / 39)) ** 2;
// Electron speed after V kilovolts, in 10⁸ m/s: classical and relativistic.
const C = 2.99792458;
const classical = (kv) => Math.sqrt(2 * 1.75882e11 * kv * 1000) / 1e8;
const relativistic = (kv) => { const g = 1 + (kv * 1000) / 510999; return C * Math.sqrt(1 - 1 / (g * g)); };

export default {
  topic: 'Quantities/units/constants (EE)',
  subject: 'EE',
  overview: r`This topic is the electrical engineer's measuring kit: the units of every electrical and magnetic quantity (and the older CGS and English ones still found in machine texts), the prefixes that keep circuit numbers small, the resistivities, temperature coefficients, permittivities and permeabilities of real materials, wire sizes in AWG, kcmil and mm², and the conversions between power and energy units. Board questions here are quick: a conversion, a resistance at another temperature or length, a wire size, a current from horsepower. Most mistakes are unit slips, so check every answer's units.`,
  sources: [
    'The International System of Units (SI Brochure, BIPM, 9th edition)',
    'Standard Handbook for Electrical Engineers (Fink and Beaty)',
    'Electrical Machines (Siskind) for CGS and English magnetic units',
    'Philippine Electrical Code 2017, Part 1 (conductor sizes)',
  ],
  subtopics: [
    {
      name: 'SI Electrical Units',
      inShort: r`Every electrical and magnetic quantity has an SI unit built from the ampere, metre, kilogram and second.`,
      body: [
        r`The SI builds every electrical unit from the **ampere** and the mechanical base units. Knowing what each unit is made of is the quickest check on a formula: the units on both sides must agree.`,
        r`| Quantity | Unit | In other units |
|---|---|---|
| Charge | coulomb (C) | A·s; 1 Ah = 3600 C |
| Potential, emf | volt (V) | W/A = J/C |
| Resistance, conductance | ohm (Ω), siemens (S) | V/A; S = 1/Ω (old: mho) |
| Capacitance | farad (F) | C/V = s/Ω |
| Inductance | henry (H) | Wb/A = Ω·s |
| Magnetic flux, flux density | weber (Wb), tesla (T) | V·s; Wb/m² |
| Magnetomotive force, field strength | ampere-turn (A·t), A/m | |
| Real, apparent, reactive power | W, VA, var | |
| Energy | joule (J), kWh | 1 kWh = 3.6 MJ; 1 eV = $1.602 \times 10^{-19}$ J |`,
        r`So $RC$ and $\frac{L}{R}$ are both in seconds. The older **CGS** units still appear in old texts: the electromagnetic abampere (10 A) and abvolt ($10^{-8}$ V), and the electrostatic statvolt (299.79 V).`,
      ],
      keyIdeas: [
        r`C, A, V, Ω, S, F, H, Wb, T; mmf in A·t, H in A/m; S in VA, Q in var.`,
        r`$\Omega\cdot\text{F} = \text{H}/\Omega = \text{s}$; $\text{Wb} = \text{V·s}$; $1\ \text{Ah} = 3600$ C.`,
        r`Old CGS units: 1 abampere = 10 A, 1 abvolt = $10^{-8}$ V, 1 statvolt = 299.79 V.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Time constant, charge, abamperes',
          problem: r`Find the time constant of 50 mH with 10 Ω, the charge in a 2000 mAh battery, and 5 abamperes in amperes.`,
          steps: [
            r`$\tau = \frac{0.05}{10} = 5$ ms (H/Ω = s).`,
            r`$2\ \text{Ah} \times 3600 = 7200$ C.`,
            r`$5 \times 10 = 50$ A.`,
          ],
          answer: r`5 ms; 7200 C; 50 A.`,
        },
        {
          level: 'board',
          title: 'A battery\'s energy',
          problem: r`A 12 V, 100 Ah battery is fully discharged at its rated voltage. Find the charge and the energy in kWh and in MJ.`,
          steps: [
            r`$Q = 100 \times 3600 = 360\,000$ C.`,
            r`$E = 12 \times 100 = 1200$ Wh $= 1.2$ kWh $= 1.2 \times 3.6 = 4.32$ MJ.`,
          ],
          answer: r`360 000 C; 1.2 kWh; 4.32 MJ.`,
        },
      ],
      traps: [
        r`VA and var are not watts: label apparent and reactive power with their own units.`,
        r`The ampere-hour is CHARGE, not energy: multiply by voltage for watt-hours.`,
      ],
      check: [
        { q: r`What is the unit of conductance?`, a: r`The siemens (formerly the mho).` },
        { q: r`What is 1 weber in other SI units?`, a: r`One volt-second.` },
      ],
    },
    {
      name: 'Prefixes',
      inShort: r`Prefixes in steps of 10³ keep circuit numbers between 1 and 1000.`,
      body: [
        r`| Prefix | Symbol | Factor | Prefix | Symbol | Factor |
|---|---|---|---|---|---|
| tera | T | $10^{12}$ | milli | m | $10^{-3}$ |
| giga | G | $10^{9}$ | micro | µ | $10^{-6}$ |
| mega | M | $10^{6}$ | nano | n | $10^{-9}$ |
| kilo | k | $10^{3}$ | pico | p | $10^{-12}$ |`,
        r`**Engineering notation** writes numbers with exponents in multiples of 3 so a prefix fits: 0.000047 F is 47 µF. Pairs of prefixes combine neatly: kΩ × mA gives volts, kΩ × µF gives milliseconds, MΩ × µF gives seconds. A prefix on a squared or cubed unit is squared or cubed too: 1 mm² = $10^{-6}$ m².`,
      ],
      keyIdeas: [
        r`kΩ × mA = V; kΩ × µF = ms; MΩ × µF = s; mH/kΩ = µs.`,
        r`Engineering notation uses exponents in multiples of 3.`,
        r`A prefix on a squared unit is squared: 1 mm² = $10^{-6}$ m².`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Prefix arithmetic',
          problem: r`A 4.7 kΩ resistor with 2.2 µF: find the time constant. What current does 12 V drive through 4.7 kΩ?`,
          steps: [
            r`$4.7 \times 2.2 = 10.34$ ms (kΩ × µF = ms).`,
            r`$\frac{12}{4.7} = 2.55$ mA (V/kΩ = mA).`,
          ],
          answer: r`10.34 ms; 2.55 mA.`,
        },
        {
          level: 'board',
          title: 'Megohms and nanofarads',
          problem: r`A 2.2 MΩ resistor with 4.7 nF: find the time constant and the current from 5 V.`,
          steps: [
            r`$2.2 \times 10^6 \times 4.7 \times 10^{-9} = 10.34 \times 10^{-3}$ s $= 10.34$ ms.`,
            r`$\frac{5}{2.2 \times 10^6} = 2.27$ µA.`,
          ],
          answer: r`10.34 ms; 2.27 µA.`,
        },
      ],
      traps: [
        r`m (milli, $10^{-3}$) and M (mega, $10^6$) differ by $10^9$: watch the case.`,
        r`1 cm² is $10^{-4}$ m², not $10^{-2}$.`,
      ],
      check: [
        { q: r`Write 3300 pF with a better prefix.`, a: r`3.3 nF.` },
        { q: r`What is MΩ × µF?`, a: r`Seconds.` },
      ],
    },
    {
      name: 'Resistivity and Conductivity',
      inShort: r`Resistivity is a material property; resistance depends on it and on the conductor's shape.`,
      body: [
        r`$R = \frac{\rho L}{A}$: the **resistivity** ρ belongs to the material, the length and area to the conductor. Its inverse is the **conductivity** σ; conductors are often rated against annealed copper (% IACS).`,
        r`| Material | ρ at 20 °C (Ω·m) | Ω·cmil/ft | % IACS |
|---|---|---|---|
| Silver | $1.59 \times 10^{-8}$ | 9.6 | 108 |
| Annealed copper | $1.7241 \times 10^{-8}$ | 10.37 | 100 |
| Hard-drawn copper | $1.77 \times 10^{-8}$ | 10.66 | 97 |
| Aluminium | $2.83 \times 10^{-8}$ | 17.0 | 61 |
| Nichrome | $1.10 \times 10^{-6}$ | 660 | 1.6 |`,
        r`When a wire of fixed volume (fixed mass) is **drawn** longer, its area shrinks in proportion, so its resistance goes as the length SQUARED, $R = \frac{\rho\delta L^2}{m}$, not in proportion as when it is simply cut longer:`,
        {
          type: 'plot',
          alt: 'The resistance of 1 kg of annealed copper drawn into a wire, against its length: rising as the length squared, 1.53 ohms at 100 m and 13.8 ohms at 300 m; a dashed line shows a wire of fixed area, rising only in proportion.',
          caption: '1 kg of copper drawn out (solid): 1.53 Ω at 100 m, 13.8 Ω at 300 m; a fixed-area wire (dashed) rises only in proportion.',
          x: [0, 300],
          y: [0, 15],
          xLabel: 'L (m)',
          yLabel: 'R (Ω)',
          series: [
            { f: drawn, label: 'drawn', area: true },
            { f: (L) => (drawn(100) * L) / 100, label: 'fixed area', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 100, label: '100 m' }],
        },
      ],
      keyIdeas: [
        r`Copper $1.72 \times 10^{-8}$ Ω·m (10.37 Ω·cmil/ft), aluminium $2.83 \times 10^{-8}$ (61% IACS).`,
        r`Drawn wire (same volume): $\frac{R_2}{R_1} = \left(\frac{L_2}{L_1}\right)^2$.`,
        r`From mass: $R = \frac{\rho\delta L^2}{m}$; conductance $G = \frac{\sigma A}{L}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Drawing a kilogram of copper',
          problem: r`1 kg of annealed copper (8890 kg/m³) is drawn into a 100 m wire. Find its resistance, and its resistance if drawn on to 300 m.`,
          steps: [
            r`$R = \frac{1.7241 \times 10^{-8} \times 8890 \times 100^2}{1} = 1.53$ Ω.`,
            r`Three times the length: $3^2 = 9$ times, 13.8 Ω.`,
          ],
          answer: r`1.53 Ω; 13.8 Ω.`,
        },
        {
          level: 'board',
          title: 'Aluminium against copper',
          problem: r`An aluminium conductor must have the same resistance and length as a copper one. How much larger is its area, and what is its mass compared with the copper (densities 2700 and 8890 kg/m³)?`,
          steps: [
            r`Area ratio $= \frac{2.83}{1.72} = 1.645$.`,
            r`Mass ratio $= 1.645 \times \frac{2700}{8890} = 0.500$: half the weight.`,
          ],
          answer: r`1.645 times the area; half the mass.`,
        },
      ],
      traps: [
        r`Stretching a wire changes both length and area: the resistance goes as the length SQUARED.`,
        r`Use the resistivity at the right temperature.`,
      ],
      check: [
        { q: r`A wire is drawn to twice its length. What happens to its resistance?`, a: r`It becomes four times as large.` },
        { q: r`Why are overhead lines aluminium?`, a: r`For the same resistance it weighs about half as much as copper, and costs less.` },
      ],
    },
    {
      name: 'Temperature Coefficients',
      inShort: r`Metals' resistance rises nearly linearly with temperature.`,
      body: [
        r`A metal's resistance rises almost in a straight line with temperature. Extended backwards, the line reaches zero at the **inferred absolute zero**, −234.5 °C for copper and −228 °C for aluminium, so $\frac{R_2}{R_1} = \frac{T_0 + t_2}{T_0 + t_1}$ with $T_0$ = 234.5:`,
        {
          type: 'plot',
          alt: 'The resistance of a copper winding against temperature: a straight line from zero at minus 234.5 degrees C, through 0.50 ohm at 20 C, to 0.60 ohm at 70.9 C.',
          caption: 'A copper winding: 0.50 Ω at 20 °C, 0.60 Ω at 70.9 °C, on a line that reaches zero at −234.5 °C.',
          x: [-250, 100],
          y: [0, 0.7],
          xLabel: 't (°C)',
          yLabel: 'R (Ω)',
          series: [{ f: (t) => Math.max(0, (0.5 * (234.5 + t)) / 254.5), label: 'R', area: true }],
          marks: [{ x: -234.5, label: '−234.5' }, { x: 70.9, label: '70.9' }],
        },
        r`The **temperature coefficient** α is the fractional change per degree; it depends on the reference temperature, $\alpha_t = \frac{1}{T_0 + t}$: 0.00427 at 0 °C and 0.00393 at 20 °C for copper. Some materials (carbon, semiconductors, thermistors) have negative coefficients; alloys such as manganin and constantan nearly zero, for precision resistors.`,
      ],
      keyIdeas: [
        r`$R_2 = R_1[1 + \alpha_1(t_2 - t_1)]$; copper's inferred zero is −234.5 °C, aluminium's −228 °C.`,
        r`$\alpha_t = \frac{1}{\lvert T_0\rvert + t}$: copper 0.00393 at 20 °C, 0.00427 at 0 °C.`,
        r`Series: $\alpha = \frac{\alpha_1R_1 + \alpha_2R_2}{R_1 + R_2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A heat run',
          problem: r`A copper winding measures 0.50 Ω at 20 °C and 0.60 Ω after a heat run. Find its temperature, and copper's α referred to 75 °C.`,
          steps: [
            r`$t_2 = \frac{0.60}{0.50}(234.5 + 20) - 234.5 = 70.9$ °C.`,
            r`$\alpha_{75} = \frac{1}{234.5 + 75} = 0.00323$/°C.`,
          ],
          answer: r`70.9 °C; 0.00323/°C.`,
        },
        {
          level: 'board',
          title: 'Two materials in series',
          problem: r`A 10 Ω copper resistor ($\alpha = 0.00393$) is in series with a 20 Ω carbon resistor ($\alpha = -0.0005$), both at 20 °C. Find the combination's coefficient.`,
          steps: [
            r`$\alpha = \frac{0.00393 \times 10 + (-0.0005) \times 20}{30}$.`,
            r`$= \frac{0.0393 - 0.010}{30} = 0.000977$/°C.`,
          ],
          answer: r`0.000977 /°C.`,
        },
      ],
      traps: [
        r`Using α₀ with a 20 °C reference resistance gives the wrong answer: α must match the reference.`,
        r`Carbon's coefficient is NEGATIVE: it lowers a series combination's α.`,
      ],
      check: [
        { q: r`What is copper's inferred absolute zero?`, a: r`−234.5 °C.` },
        { q: r`Which alloys are used where resistance must not change with temperature?`, a: r`Manganin and constantan.` },
      ],
    },
    {
      name: 'Permittivity and Permeability',
      inShort: r`How much a material raises capacitance (εᵣ) and carries magnetic flux (μᵣ) compared with vacuum.`,
      body: [
        r`**Permittivity** $\varepsilon = \varepsilon_0\varepsilon_r$ sets how much charge a field stores in an insulator: capacitance rises by $\varepsilon_r$ when it fills the gap. **Permeability** $\mu = \mu_0\mu_r$ sets how much flux a field drives through a material: $B = \mu H$.`,
        r`| Material | $\varepsilon_r$ | Material | $\mu_r$ |
|---|---|---|---|
| Air, vacuum | 1 | Air, copper, aluminium | ≈ 1 |
| Transformer oil | 2.2 | Cast iron | 100–600 |
| XLPE | 2.3 | Silicon steel | 1000–7000 |
| PVC | 4–6 | Nickel–iron alloys | up to 100 000 |
| Mica | 6 | Ferrite | 100–10 000 |
| Water | 80 | | |`,
        r`A ferromagnetic material's μᵣ is not a constant: as H rises the material **saturates**, B levels off, and μᵣ falls:`,
        {
          type: 'plot',
          alt: 'Flux density against field strength in silicon steel: a straight dashed line for a constant relative permeability of 4000, and the real curve, solid, which follows it at first and then levels off toward 1.8 T as the steel saturates.',
          caption: 'Silicon steel: the B–H curve (solid) follows μᵣ = 4000 (dashed) at first, then saturates near 1.8 T.',
          x: [0, 1000],
          y: [0, 2.2],
          xLabel: 'H (A/m)',
          yLabel: 'B (T)',
          series: [
            { f: (h) => 1.8 * Math.tanh((4 * Math.PI * 1e-7 * 4000 * h) / 1.8), label: 'B–H' },
            { f: (h) => 4 * Math.PI * 1e-7 * 4000 * h, label: 'μr = 4000', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 100, label: '100 A/m' }],
        },
      ],
      keyIdeas: [
        r`$\varepsilon = \varepsilon_0\varepsilon_r$, $\mu = \mu_0\mu_r$ ($\varepsilon_0 = 8.854 \times 10^{-12}$ F/m, $\mu_0 = 4\pi \times 10^{-7}$ H/m).`,
        r`εᵣ: air 1, oil 2.2, XLPE 2.3, PVC 4–6, mica 6, water 80.`,
        r`μᵣ: non-magnetic ≈ 1; silicon steel 1000–7000, falling in saturation.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A capacitor and a core',
          problem: r`Plates of 0.01 m² are 0.1 mm apart with mica (εᵣ = 6) between them. Find C. Find B in silicon steel (μᵣ = 4000) at H = 100 A/m.`,
          steps: [
            r`$C = \frac{8.854 \times 10^{-12} \times 6 \times 0.01}{10^{-4}} = 5.31$ nF (0.885 nF in air).`,
            r`$B = 4\pi \times 10^{-7} \times 4000 \times 100 = 0.503$ T.`,
          ],
          answer: r`5.31 nF; 0.503 T.`,
        },
        {
          level: 'board',
          title: 'A cable\'s capacitance',
          problem: r`A single-core cable has XLPE insulation ($\varepsilon_r = 2.3$) with an outer-to-conductor radius ratio of 2.5. Find its capacitance per km, $C = \frac{2\pi\varepsilon_0\varepsilon_r}{\ln(R/r)}$.`,
          steps: [
            r`$C = \frac{2\pi \times 8.854 \times 10^{-12} \times 2.3}{\ln 2.5} = 1.40 \times 10^{-10}$ F/m.`,
            r`Per km: 0.140 µF.`,
          ],
          answer: r`0.140 µF/km.`,
        },
      ],
      traps: [
        r`Iron's μᵣ is not a constant: use the B–H curve near saturation.`,
        r`Relative values have NO unit; ε₀ and μ₀ carry the units.`,
      ],
      check: [
        { q: r`What happens to a capacitor's capacitance when its air gap is filled with oil (εᵣ = 2.2)?`, a: r`It rises 2.2 times.` },
        { q: r`What happens to iron's μᵣ in saturation?`, a: r`It falls.` },
      ],
    },
    {
      name: 'Magnetic Units (SI and CGS)',
      inShort: r`Older machine texts use gauss, maxwells, oersteds and gilberts, or lines per square inch.`,
      body: [
        r`Machine design grew up in CGS and English units, and board problems still use them.`,
        r`| Quantity | SI | CGS | English |
|---|---|---|---|
| Flux | weber (Wb) | maxwell (line): 1 Wb = $10^8$ Mx | lines |
| Flux density | tesla (T) | gauss: 1 T = $10^4$ G | lines/in²: 1 T = 64.52 kilolines/in² |
| Magnetomotive force | ampere-turn | gilbert: 1 Gb = 0.7958 A·t | A·t |
| Field strength | A/m | oersted: 1 Oe = 79.58 A/m | A·t/in |
| Permeability of free space | $4\pi \times 10^{-7}$ H/m | 1 | 3.19 |`,
        r`In CGS, $H = \frac{0.4\pi NI}{\ell_{cm}}$ oersteds, and in air B in gauss equals H in oersteds, which is why the units were convenient.`,
      ],
      keyIdeas: [
        r`1 Wb = $10^8$ Mx; 1 T = $10^4$ G = 64.52 kilolines/in².`,
        r`1 Oe = 79.58 A/m; 1 Gb = 0.7958 A·t; CGS $H = \frac{0.4\pi NI}{\ell_{cm}}$.`,
        r`μ₀ is 1 in CGS and 3.19 in English units (lines/in² per A·t/in).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A coil in CGS',
          problem: r`A 500-turn coil carries 2 A on a 20 cm path in air. Find H in oersteds and A/m, and B in gauss. Convert 1.2 T to gauss and lines per square inch.`,
          steps: [
            r`$H = \frac{0.4\pi \times 1000}{20} = 62.8$ Oe $= 5000$ A/m; in air $B = 62.8$ G.`,
            r`1.2 T $= 12\,000$ G $= 1.2 \times 64.52 = 77.4$ kilolines/in².`,
          ],
          answer: r`62.8 Oe, 5000 A/m, 62.8 G; 12 000 G, 77.4 kilolines/in².`,
        },
        {
          level: 'board',
          title: 'Lines per square inch',
          problem: r`A 2 mWb flux passes through a 4 in² pole face. Find the flux in maxwells and the density in lines per square inch and in tesla.`,
          steps: [
            r`$0.002 \times 10^8 = 200\,000$ Mx (lines).`,
            r`$\frac{200\,000}{4} = 50\,000$ lines/in² $= \frac{50}{64.52} = 0.775$ T.`,
          ],
          answer: r`200 000 Mx; 50 000 lines/in², 0.775 T.`,
        },
      ],
      traps: [
        r`In CGS air, B in gauss EQUALS H in oersteds; in SI they differ by μ₀.`,
        r`A maxwell IS a line of flux.`,
      ],
      check: [
        { q: r`How many gauss is 1 tesla?`, a: r`10 000.` },
        { q: r`How many A/m is 1 oersted?`, a: r`79.58 A/m.` },
      ],
    },
    {
      name: 'Wire Gauges',
      inShort: r`Conductor sizes in AWG, kcmil and mm².`,
      body: [
        r`The **American Wire Gauge** numbers solid wires so that each step down in number is a fixed ratio larger: every 3 gauges doubles the area, every 10 multiplies it by about 10. Above 4/0 sizes are given in **kcmil** (thousands of circular mils, the area of a 1 mil diameter circle); the PEC and IEC also use **mm²**:`,
        {
          type: 'plot',
          alt: 'The cross-section of solid wire against its AWG number from 0 to 20: falling steeply from 53.5 square mm at gauge 0, through 5.26 at gauge 10, to 0.52 at gauge 20, halving every three gauges.',
          caption: 'Wire area by AWG: halving every 3 gauges; #10 is 5.26 mm².',
          x: [0, 20],
          y: [0, 60],
          xLabel: 'AWG',
          yLabel: 'A (mm²)',
          series: [{ f: awgArea, label: 'A', area: true }],
          marks: [{ x: 10, label: '#10' }],
        },
        r`Resistance per length follows the area: copper $\frac{17.24}{A_{mm^2}}$ Ω/km and aluminium $\frac{28.3}{A_{mm^2}}$ Ω/km at 20 °C. In a single-phase circuit the current goes out and back, so the drop is over TWICE the run.`,
      ],
      keyIdeas: [
        r`Every 3 AWG numbers doubles the area; a smaller number is a thicker wire.`,
        r`1 kcmil = 0.5067 mm²; 1 mm² = 1973.5 cmil.`,
        r`Copper $\frac{17.24}{A_{mm^2}}$ Ω/km, aluminium $\frac{28.3}{A_{mm^2}}$ Ω/km at 20 °C.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Gauges and kcmil',
          problem: r`How does #4 compare with #10 in area? Convert 250 kcmil to mm². Find the resistance of 200 m of 5.26 mm² (#10) copper.`,
          steps: [
            r`Six gauges: $2^2 = 4$ times the area, a quarter of the resistance.`,
            r`$250 \times 0.5067 = 127$ mm².`,
            r`$\frac{17.24}{5.26} \times 0.2 = 0.656$ Ω.`,
          ],
          answer: r`4 times; 127 mm²; 0.656 Ω.`,
        },
        {
          level: 'board',
          title: 'Drop on a branch circuit',
          problem: r`A single-phase branch runs 30 m of 3.31 mm² (#12) copper and carries 15 A. Find the voltage drop.`,
          steps: [
            r`Out and back: 60 m. $R = \frac{17.24}{3.31} \times 0.06 = 0.3125$ Ω.`,
            r`$V = 15 \times 0.3125 = 4.69$ V.`,
          ],
          answer: r`4.69 V.`,
        },
      ],
      traps: [
        r`For voltage drop count the conductor length both ways (out and back) in single-phase circuits.`,
        r`A LARGER AWG number is a SMALLER wire.`,
      ],
      check: [
        { q: r`How many circular mils is 1 mm²?`, a: r`About 1973.5.` },
        { q: r`What is a circular mil?`, a: r`The area of a circle 1 mil (0.001 in) in diameter.` },
      ],
    },
    {
      name: 'Power and Energy Conversions',
      inShort: r`Turning nameplate horsepower, energy and heat into the units a calculation needs.`,
      body: [
        r`| From | To |
|---|---|
| 1 hp | 746 W (metric hp 735.5 W) |
| 1 kWh | 3.6 MJ = 3412 BTU = 860 kcal |
| 1 cal | 4.186 J (so heat $H = 0.24I^2Rt$ cal) |
| 1 BTU | 1055 J |`,
        r`A motor's horsepower is its OUTPUT: divide by efficiency for the input, then by voltage and power factor for the current. Heating calculations equate electrical energy, less losses, to $mc\Delta T$; with constant power the temperature rises in a straight line:`,
        {
          type: 'plot',
          alt: 'The temperature of 50 litres of water heated by a 2 kW heater at 90 percent efficiency against time: rising in a straight line from 25 degrees C, reaching 75 C at 1.61 hours.',
          caption: '50 L of water and a 2 kW, 90% heater: 25 °C to 75 °C in 1.61 h.',
          x: [0, 2],
          y: [0, 100],
          xLabel: 't (h)',
          yLabel: 'T (°C)',
          series: [{ f: (t) => 25 + (0.9 * 2000 * t * 3600) / (50 * 4186), label: 'T', area: true }],
          marks: [{ y: 75, label: '75 °C' }, { x: (50 * 4186 * 50) / (0.9 * 2000) / 3600, label: '1.61 h' }],
        },
      ],
      keyIdeas: [
        r`$I_{3\phi} = \frac{746\,\text{hp}}{\sqrt3V\eta\,\text{pf}}$ (hp is output).`,
        r`$E = Pt$ in kWh; cost $= E \times$ rate.`,
        r`Heating water: $\eta Pt = mc\Delta T$; heat $H = 0.24I^2Rt$ cal.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A motor, a heater, a tank',
          problem: r`Find the current of a 50 hp, 460 V motor (η = 0.90, pf = 0.85). A 1.5 kW heater runs 30 min at ₱12/kWh: cost? How long does a 2 kW, 90% heater take to warm 50 L from 25 °C to 75 °C?`,
          steps: [
            r`$I = \frac{50 \times 746}{\sqrt3 \times 460 \times 0.9 \times 0.85} = 61.2$ A.`,
            r`$1.5 \times 0.5 = 0.75$ kWh: ₱9.`,
            r`$t = \frac{50 \times 4186 \times 50}{0.9 \times 2000} = 5814$ s $= 1.61$ h.`,
          ],
          answer: r`61.2 A; ₱9; 1.61 h.`,
        },
        {
          level: 'board',
          title: 'Heat in three units',
          problem: r`A 10 Ω resistor carries 5 A for 1 minute. Find the heat in joules, in calories by the 0.24 rule, and in BTU.`,
          steps: [
            r`$H = 5^2 \times 10 \times 60 = 15\,000$ J.`,
            r`$0.24 \times 25 \times 10 \times 60 = 3600$ cal.`,
            r`$\frac{15\,000}{1055} = 14.2$ BTU.`,
          ],
          answer: r`15 000 J; 3600 cal; 14.2 BTU.`,
        },
      ],
      traps: [
        r`Divide horsepower by efficiency for the INPUT power that sets the current.`,
        r`A litre of water is 1 kg; its specific heat is 4186 J/kg·°C.`,
      ],
      check: [
        { q: r`How many BTU is 1 kWh?`, a: r`About 3412 BTU.` },
        { q: r`How many watts is 1 hp?`, a: r`746 W.` },
      ],
    },
    {
      name: 'Physical Constants',
      inShort: r`The fixed numbers of electrical engineering, most now exact by definition in the 2019 SI.`,
      body: [
        r`Since 2019 the SI fixes the elementary charge, Planck's constant and Boltzmann's constant EXACTLY, and defines the ampere, kilogram and kelvin from them.`,
        r`| Constant | Value |
|---|---|
| Elementary charge e | $1.602\,176\,634 \times 10^{-19}$ C (exact) |
| Planck h | $6.626\,070\,15 \times 10^{-34}$ J·s (exact) |
| Boltzmann k | $1.380\,649 \times 10^{-23}$ J/K (exact) |
| Speed of light c | 299 792 458 m/s (exact) |
| Electron mass, $\frac{e}{m_e}$ | $9.109 \times 10^{-31}$ kg; $1.7588 \times 10^{11}$ C/kg |
| $\varepsilon_0$, $\mu_0$ | $8.854 \times 10^{-12}$ F/m; $4\pi \times 10^{-7}$ H/m (now measured, to about nine digits) |
| Josephson $K_J = \frac{2e}{h}$, von Klitzing $R_K = \frac{h}{e^2}$ | 483 597.8 GHz/V; 25 812.807 Ω (the volt and ohm standards) |`,
        r`An electron accelerated through V volts gains eV of energy, so classically $v = \sqrt{\frac{2eV}{m_e}}$. That fails at high voltage, where the speed approaches but never reaches that of light:`,
        {
          type: 'plot',
          alt: 'Electron speed against accelerating voltage on a log scale from 10 V to 1000 kV: the classical formula, dashed, rises without limit and passes the speed of light near 256 kV; the true relativistic speed, solid, levels off below the speed of light.',
          caption: 'Electron speed: the classical formula (dashed) passes the speed of light near 256 kV; the true speed (solid) never does.',
          x: [0.01, 1000],
          logX: true,
          y: [0, 6.2],
          xLabel: 'V (kV)',
          yLabel: 'v (10⁸ m/s)',
          series: [
            { f: relativistic, label: 'relativistic' },
            { f: classical, label: 'classical', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ y: C, label: 'c' }],
        },
      ],
      keyIdeas: [
        r`$e = 1.602\,176\,634 \times 10^{-19}$ C and $h$ are exact; so are $K_J = \frac{2e}{h}$ and $R_K = \frac{h}{e^2}$.`,
        r`$\frac{e}{m_e} = 1.7588 \times 10^{11}$ C/kg; $V_T = \frac{kT}{q} \approx 25.9$ mV at 300 K.`,
        r`$\varepsilon_0$ and $\mu_0$ are now measured, not exact, but $\mu_0 = 4\pi \times 10^{-7}$ H/m to about nine digits.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An electron through 100 V',
          problem: r`An electron starts from rest and is accelerated through 100 V. Find its speed.`,
          steps: [r`$v = \sqrt{2 \times 1.7588 \times 10^{11} \times 100} = 5.93 \times 10^6$ m/s.`],
          answer: r`$5.93 \times 10^6$ m/s.`,
        },
        {
          level: 'board',
          title: 'Thermal voltage and the quantum standards',
          problem: r`Find the thermal voltage $\frac{kT}{q}$ at 25 °C. From the exact e and h, find $K_J$ in GHz/V and $R_K$ in ohms.`,
          steps: [
            r`$V_T = \frac{1.380\,649 \times 10^{-23} \times 298.15}{1.602\,176\,634 \times 10^{-19}} = 25.69$ mV.`,
            r`$K_J = \frac{2 \times 1.602\,176\,634 \times 10^{-19}}{6.626\,070\,15 \times 10^{-34}} = 483\,597.8$ GHz/V.`,
            r`$R_K = \frac{6.626\,070\,15 \times 10^{-34}}{(1.602\,176\,634 \times 10^{-19})^2} = 25\,812.807$ Ω.`,
          ],
          answer: r`25.69 mV; 483 597.8 GHz/V; 25 812.807 Ω.`,
        },
      ],
      traps: [
        r`Above a few kilovolts electrons get relativistic and this formula overestimates the speed.`,
        r`Use kelvin in $\frac{kT}{q}$: 25 °C is 298.15 K.`,
      ],
      check: [
        { q: r`Which constants are exact in the 2019 SI?`, a: r`Among others e, h, k and c.` },
        { q: r`About what is the thermal voltage at room temperature?`, a: r`About 26 mV.` },
      ],
    },
  ],
};
