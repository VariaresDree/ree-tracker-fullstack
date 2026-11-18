// Library › Lessons › ESAS › Quantities/units/constants (2026-11-18): written
// for the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Units and tools in the Library
// converts between units; this lesson teaches the system behind them.
const r = String.raw;

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
      keyIdeas: [
        r`Base: metre, kilogram, second, ampere, kelvin, mole, candela.`,
        r`Derived: N = kg·m/s², J = N·m, W = J/s, V = W/A, Ω = V/A, C = A·s, F = C/V, Wb = V·s, T = Wb/m², H = Wb/A.`,
        r`Since 2019 every base unit is defined by an exact constant.`,
      ],
      example: {
        problem: r`Express the ohm in base units.`,
        solution: r`$\Omega = \frac{\text{V}}{\text{A}} = \frac{\text{W}}{\text{A}^2} = \frac{\text{J/s}}{\text{A}^2} = \frac{\text{kg·m}^2}{\text{s}^3\,\text{A}^2}$.`,
      },
      traps: [r`The kelvin has no degree sign: 300 K, not 300 °K.`],
    },
    {
      name: 'Prefixes',
      inShort: r`Powers of ten that scale a unit up or down.`,
      keyIdeas: [
        r`T $10^{12}$, G $10^9$, M $10^6$, k $10^3$; m $10^{-3}$, µ $10^{-6}$, n $10^{-9}$, p $10^{-12}$.`,
        r`A prefix on a squared or cubed unit is squared or cubed too.`,
        r`Binary prefixes for memory: Ki = 1024, Mi = $2^{20}$.`,
      ],
      example: {
        problem: r`What voltage does 4 µA make across 2.5 MΩ? How many m² is 1 cm²? Convert 1 km/h to m/s.`,
        solution: r`$2.5 \times 10^6 \times 4 \times 10^{-6} = 10$ V. $1\ \text{cm}^2 = (10^{-2})^2 = 10^{-4}$ m². $\frac{1000}{3600} = \frac{1}{3.6}$ m/s.`,
      },
      traps: [r`m (milli) and M (mega) differ by $10^9$: case matters.`],
    },
    {
      name: 'Unit Conversion',
      inShort: r`Moving between SI and English units with exact factors.`,
      keyIdeas: [
        r`Exact: 1 in = 2.54 cm, 1 ft = 0.3048 m, 1 lb = 0.453 592 37 kg.`,
        r`1 lbf = 4.448 N, 1 psi = 6.895 kPa, 1 atm = 101.325 kPa = 14.696 psi = 760 mmHg.`,
        r`Chain factors equal to one until only the wanted units remain.`,
      ],
      example: {
        problem: r`Convert 100 psi to kPa and 60 mi/h to m/s.`,
        solution: r`$100 \times 6.895 = 689.5$ kPa. $\frac{60 \times 1609.344}{3600} = 26.8$ m/s.`,
      },
      traps: [r`Gauge pressure (psig) excludes the atmosphere; absolute (psia) includes it.`],
    },
    {
      name: 'Mechanical Quantities',
      inShort: r`Force, torque, energy and power, and their units.`,
      keyIdeas: [
        r`$P = T\omega$; $P_{\text{kW}} = \frac{T\,n}{9549}$ with $T$ in N·m and $n$ in rpm.`,
        r`1 hp = 550 ft·lbf/s = 745.7 W; metric hp = 735.5 W.`,
        r`Weight is a force: $W = mg$, with $g = 9.806\,65$ m/s² standard.`,
      ],
      example: {
        problem: r`A motor delivers 100 N·m at 1800 rpm. What is its output in kW and hp?`,
        solution: r`$\frac{100 \times 1800}{9549} = 18.85$ kW $= \frac{18\,850}{745.7} = 25.3$ hp.`,
      },
      traps: [r`ω must be in rad/s: rpm × $\frac{2\pi}{60}$.`],
    },
    {
      name: 'Thermal Quantities',
      inShort: r`Temperature, heat and their units.`,
      keyIdeas: [
        r`K = °C + 273.15; °F = 1.8 °C + 32; °R = °F + 459.67.`,
        r`A temperature DIFFERENCE has no offset: 10 K = 10 °C = 18 °F.`,
        r`1 cal = 4.184 J, 1 BTU = 1055 J, 1 kWh = 3412 BTU, 1 TR = 3.517 kW.`,
      ],
      example: {
        problem: r`How many BTU are in 1 kWh? A heater raises water by 10 °C: what is that in °F?`,
        solution: r`$\frac{3.6 \times 10^6}{1055.06} = 3412$ BTU. A change of $1.8 \times 10 = 18$ °F (no +32 for a difference).`,
      },
      traps: [r`Use kelvin in gas laws and radiation; °C is fine for differences.`],
    },
    {
      name: 'Physical Constants',
      inShort: r`The fixed numbers of physics engineers use most.`,
      keyIdeas: [
        r`$c = 299\,792\,458$ m/s, $h = 6.626 \times 10^{-34}$ J·s, $e = 1.602 \times 10^{-19}$ C (exact since 2019).`,
        r`$m_e = 9.109 \times 10^{-31}$ kg, $m_p = 1.673 \times 10^{-27}$ kg, $\varepsilon_0 = 8.854 \times 10^{-12}$ F/m, $\mu_0 \approx 4\pi \times 10^{-7}$ H/m.`,
        r`$G = 6.674 \times 10^{-11}$ N·m²/kg²; Earth $R = 6371$ km, $M = 5.97 \times 10^{24}$ kg.`,
      ],
      example: {
        problem: r`Find g at the Earth's surface from G, the Earth's mass and its radius.`,
        solution: r`$g = \frac{GM}{R^2} = \frac{6.674 \times 10^{-11}(5.972 \times 10^{24})}{(6.371 \times 10^6)^2} = 9.82$ m/s².`,
      },
      traps: [r`Standard gravity 9.806 65 m/s² is a defined value; the real g varies with place.`],
    },
    {
      name: 'Chemical Constants',
      inShort: r`Avogadro, the gas constant, molar volume and standard conditions.`,
      keyIdeas: [
        r`$N_A = 6.022 \times 10^{23}$ /mol; $R = 8.314$ J/(mol·K) $= 0.082\,06$ L·atm/(mol·K); $F = 96\,485$ C/mol.`,
        r`Molar volume 22.414 L at 0 °C, 1 atm; 22.711 L at 0 °C, 100 kPa; 24.79 L at 25 °C, 100 kPa.`,
        r`Atomic masses: H 1.008, C 12.011, O 15.999, Cu 63.55; water 18.015 g/mol.`,
      ],
      example: {
        problem: r`How many moles and molecules are in 1 kg of water?`,
        solution: r`$\frac{1000}{18.015} = 55.5$ mol; $55.5 \times 6.022 \times 10^{23} = 3.34 \times 10^{25}$ molecules.`,
      },
      traps: [r`"STP" means 1 atm in older texts and 100 kPa in IUPAC's: check which.`],
    },
    {
      name: 'Dimensional Analysis',
      inShort: r`Checking and building formulas from the dimensions of their quantities.`,
      keyIdeas: [
        r`Dimensions: force $MLT^{-2}$, energy $ML^2T^{-2}$, power $ML^2T^{-3}$, voltage $ML^2T^{-3}I^{-1}$.`,
        r`Every term in an equation has the same dimensions; arguments of exp, ln and sin are dimensionless.`,
        r`Buckingham π: $n$ variables in $k$ dimensions form $n - k$ dimensionless groups.`,
      ],
      example: {
        problem: r`Check $v^2 = u^2 + 2as$ dimensionally, and find how a pendulum's period depends on its length L and g.`,
        solution: r`$[v^2] = L^2T^{-2}$ and $[as] = LT^{-2} \cdot L = L^2T^{-2}$: consistent. Period: one group $T\sqrt{g/L}$, so $T \propto \sqrt{L/g}$ (mass drops out).`,
      },
      traps: [r`Dimensional analysis can't find pure numbers like the $2\pi$ in $T = 2\pi\sqrt{L/g}$.`],
    },
  ],
};
