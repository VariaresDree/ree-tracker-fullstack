// Library › Lessons › EE › Quantities/units/constants (EE) (2026-11-19):
// written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order; every worked example checked by computation. The SI base
// units, prefixes and general conversions are in ESAS Quantities; ε₀, μ₀,
// R = ρL/A and circular mils in Circuits 1; e and the Coulomb constant in
// Electromagnetism.
const r = String.raw;

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
      keyIdeas: [
        r`C, A, V, Ω, S, F, H, Wb, T; mmf in A·t, H in A/m; S in VA, Q in var.`,
        r`$\Omega\cdot\text{F} = \text{H}/\Omega = \text{s}$; $\text{Wb} = \text{V·s}$; $1\ \text{Ah} = 3600$ C.`,
        r`Old CGS units: 1 abampere = 10 A, 1 abvolt = $10^{-8}$ V, 1 statvolt = 299.79 V.`,
      ],
      example: {
        problem: r`Find the time constant of 50 mH with 10 Ω, the charge in a 2000 mAh battery, and 5 abamperes in amperes.`,
        solution: r`$\tau = \frac{0.05}{10} = 5$ ms (H/Ω = s). $2\ \text{Ah} \times 3600 = 7200$ C. $5 \times 10 = 50$ A.`,
      },
      traps: [r`VA and var are not watts: label apparent and reactive power with their own units.`],
    },
    {
      name: 'Prefixes',
      inShort: r`Prefixes in steps of 10³ keep circuit numbers between 1 and 1000.`,
      keyIdeas: [
        r`kΩ × mA = V; kΩ × µF = ms; MΩ × µF = s; mH/kΩ = µs.`,
        r`Engineering notation uses exponents in multiples of 3.`,
        r`A prefix on a squared unit is squared: 1 mm² = $10^{-6}$ m².`,
      ],
      example: {
        problem: r`A 4.7 kΩ resistor with 2.2 µF: find the time constant. What current does 12 V drive through 4.7 kΩ?`,
        solution: r`$4.7 \times 2.2 = 10.34$ ms (kΩ × µF = ms). $\frac{12}{4.7} = 2.55$ mA (V/kΩ = mA).`,
      },
      traps: [r`m (milli, $10^{-3}$) and M (mega, $10^6$) differ by $10^9$: watch the case.`],
    },
    {
      name: 'Resistivity and Conductivity',
      inShort: r`Resistivity is a material property; resistance depends on it and on the conductor's shape.`,
      keyIdeas: [
        r`Copper $1.72 \times 10^{-8}$ Ω·m (10.37 Ω·cmil/ft), aluminium $2.83 \times 10^{-8}$ (61% IACS).`,
        r`Drawn wire (same volume): $\frac{R_2}{R_1} = \left(\frac{L_2}{L_1}\right)^2$.`,
        r`From mass: $R = \frac{\rho\delta L^2}{m}$; conductance $G = \frac{\sigma A}{L}$.`,
      ],
      example: {
        problem: r`1 kg of annealed copper (8890 kg/m³) is drawn into a 100 m wire. Find its resistance, and its resistance if drawn on to 300 m.`,
        solution: r`$R = \frac{1.7241 \times 10^{-8} \times 8890 \times 100^2}{1} = 1.53$ Ω. Three times the length: $3^2 = 9$ times, 13.8 Ω.`,
      },
      traps: [r`Stretching a wire changes both length and area: the resistance goes as the length SQUARED.`],
    },
    {
      name: 'Temperature Coefficients',
      inShort: r`Metals' resistance rises nearly linearly with temperature.`,
      keyIdeas: [
        r`$R_2 = R_1[1 + \alpha_1(t_2 - t_1)]$; copper's inferred zero is −234.5 °C, aluminium's −228 °C.`,
        r`$\alpha_t = \frac{1}{|T_0| + t}$: copper 0.00393 at 20 °C, 0.00427 at 0 °C.`,
        r`Series: $\alpha = \frac{\alpha_1R_1 + \alpha_2R_2}{R_1 + R_2}$.`,
      ],
      example: {
        problem: r`A copper winding measures 0.50 Ω at 20 °C and 0.60 Ω after a heat run. Find its temperature, and copper's α referred to 75 °C.`,
        solution: r`$t_2 = \frac{0.60}{0.50}(234.5 + 20) - 234.5 = 70.9$ °C. $\alpha_{75} = \frac{1}{234.5 + 75} = 0.00323$/°C.`,
      },
      traps: [r`Using α₀ with a 20 °C reference resistance gives the wrong answer: α must match the reference.`],
    },
    {
      name: 'Permittivity and Permeability',
      inShort: r`How much a material raises capacitance (εᵣ) and carries magnetic flux (μᵣ) compared with vacuum.`,
      keyIdeas: [
        r`$\varepsilon = \varepsilon_0\varepsilon_r$, $\mu = \mu_0\mu_r$ ($\varepsilon_0 = 8.854 \times 10^{-12}$ F/m, $\mu_0 = 4\pi \times 10^{-7}$ H/m).`,
        r`εᵣ: air 1, oil 2.2, XLPE 2.3, PVC 4–6, mica 6, water 80.`,
        r`μᵣ: non-magnetic ≈ 1; silicon steel 1000–7000, falling in saturation.`,
      ],
      example: {
        problem: r`Plates of 0.01 m² are 0.1 mm apart with mica (εᵣ = 6) between them. Find C. Find B in silicon steel (μᵣ = 4000) at H = 100 A/m.`,
        solution: r`$C = \frac{8.854 \times 10^{-12} \times 6 \times 0.01}{10^{-4}} = 5.31$ nF (0.885 nF in air). $B = 4\pi \times 10^{-7} \times 4000 \times 100 = 0.503$ T.`,
      },
      traps: [r`Iron's μᵣ is not a constant: use the B–H curve near saturation.`],
    },
    {
      name: 'Magnetic Units (SI and CGS)',
      inShort: r`Older machine texts use gauss, maxwells, oersteds and gilberts, or lines per square inch.`,
      keyIdeas: [
        r`1 Wb = $10^8$ Mx; 1 T = $10^4$ G = 64.52 kilolines/in².`,
        r`1 Oe = 79.58 A/m; 1 Gb = 0.7958 A·t; CGS $H = \frac{0.4\pi NI}{\ell_{cm}}$.`,
        r`μ₀ is 1 in CGS and 3.19 in English units (lines/in² per A·t/in).`,
      ],
      example: {
        problem: r`A 500-turn coil carries 2 A on a 20 cm path in air. Find H in oersteds and A/m, and B in gauss. Convert 1.2 T to gauss and lines per square inch.`,
        solution: r`$H = \frac{0.4\pi \times 1000}{20} = 62.8$ Oe $= 5000$ A/m; $B = 62.8$ G. 1.2 T $= 12{,}000$ G $= 77.4$ kilolines/in².`,
      },
      traps: [r`In CGS air, B in gauss EQUALS H in oersteds; in SI they differ by μ₀.`],
    },
    {
      name: 'Wire Gauges',
      inShort: r`Conductor sizes in AWG, kcmil and mm².`,
      keyIdeas: [
        r`Every 3 AWG numbers doubles the area; a smaller number is a thicker wire.`,
        r`1 kcmil = 0.5067 mm²; 1 mm² = 1973.5 cmil.`,
        r`Copper $\frac{17.24}{A_{mm^2}}$ Ω/km, aluminium $\frac{28.3}{A_{mm^2}}$ Ω/km at 20 °C.`,
      ],
      example: {
        problem: r`How does #4 compare with #10 in area? Convert 250 kcmil to mm². Find the resistance of 200 m of 5.26 mm² (#10) copper.`,
        solution: r`Six gauges: $2^2 = 4$ times the area, a quarter of the resistance. $250 \times 0.5067 = 127$ mm². $\frac{17.24}{5.26} \times 0.2 = 0.656$ Ω.`,
      },
      traps: [r`For voltage drop count the conductor length both ways (out and back) in single-phase circuits.`],
    },
    {
      name: 'Power and Energy Conversions',
      inShort: r`Turning nameplate horsepower, energy and heat into the units a calculation needs.`,
      keyIdeas: [
        r`$I_{3\phi} = \frac{746\,\text{hp}}{\sqrt3V\eta\,\text{pf}}$ (hp is output).`,
        r`$E = Pt$ in kWh; cost $= E \times$ rate.`,
        r`Heating water: $\eta Pt = mc\Delta T$; heat $H = 0.24I^2Rt$ cal.`,
      ],
      example: {
        problem: r`Find the current of a 50 hp, 460 V motor (η = 0.90, pf = 0.85). A 1.5 kW heater runs 30 min at ₱12/kWh: cost? How long does a 2 kW, 90% heater take to warm 50 L from 25 °C to 75 °C?`,
        solution: r`$I = \frac{37{,}300}{\sqrt3 \times 460 \times 0.765} = 61.2$ A. $0.75$ kWh: ₱9. $t = \frac{50 \times 4186 \times 50}{0.9 \times 2000} = 5814$ s $= 1.61$ h.`,
      },
      traps: [r`Divide horsepower by efficiency for the INPUT power that sets the current.`],
    },
    {
      name: 'Physical Constants',
      inShort: r`The fixed numbers of electrical engineering, most now exact by definition in the 2019 SI.`,
      keyIdeas: [
        r`$e = 1.602\,176\,634 \times 10^{-19}$ C and $h$ are exact; so are $K_J = \frac{2e}{h}$ and $R_K = \frac{h}{e^2}$.`,
        r`$\frac{e}{m_e} = 1.7588 \times 10^{11}$ C/kg; $V_T = \frac{kT}{q} \approx 25.9$ mV at 300 K.`,
        r`$\varepsilon_0$ and $\mu_0$ are now measured, not exact, but $\mu_0 = 4\pi \times 10^{-7}$ H/m to about nine digits.`,
      ],
      example: {
        problem: r`An electron starts from rest and is accelerated through 100 V. Find its speed.`,
        solution: r`$v = \sqrt{2\frac{e}{m_e}V} = \sqrt{2 \times 1.7588 \times 10^{11} \times 100} = 5.93 \times 10^6$ m/s.`,
      },
      traps: [r`Above a few kilovolts electrons get relativistic and this formula overestimates the speed.`],
    },
  ],
};
