// Library › Lessons › ESAS › Chemistry for Engineers (2026-11-17): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Physics for Engineers covers
// photons, Bohr levels and radioactivity; Basic Thermodynamics the energy
// balances and cycles.
const r = String.raw;

export default {
  topic: 'Chemistry for Engineers',
  subject: 'ESAS',
  overview: r`The chemistry an electrical engineer meets in practice: what matter is made of, how much of it reacts, and how chemical energy becomes electricity in batteries, fuel cells and solar cells. Most board problems come down to counting moles: grams to moles with the molar mass, gas volumes with $pV = nRT$, solutions with molarity, and charge with Faraday's constant. Keep temperatures in kelvin, match $R$ to your units, and balance the equation before you use its coefficients.`,
  sources: [
    'Chemistry (Chang and Goldsby)',
    'General Chemistry: Principles and Modern Applications (Petrucci and others)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Atomic Structure and Periodic Table',
      inShort: r`Protons, neutrons and electrons, isotopes, electron shells, and the trends across the periodic table.`,
      keyIdeas: [
        r`Mass number $A = Z + N$; isotopes share $Z$. The atomic mass on the table is the abundance-weighted mean of the isotopes.`,
        r`Shell $n$ holds $2n^2$ electrons; subshells $s, p, d, f$ hold 2, 6, 10, 14, filled 1s 2s 2p 3s 3p 4s 3d 4p…`,
        r`Across a period atoms shrink and electronegativity and ionisation energy rise; down a group atoms grow and both fall.`,
        r`Hydrogen's lines: $\frac{1}{\lambda} = R_H\left(\frac{1}{n_1^2} - \frac{1}{n_2^2}\right)$, $R_H = 1.097 \times 10^7$ m⁻¹.`,
      ],
      example: {
        problem: r`Chlorine is 75.8% ³⁵Cl (34.97 u) and 24.2% ³⁷Cl (36.97 u). Find its atomic mass, and the protons, neutrons and electrons of the ion ³⁵Cl⁻.`,
        solution: r`$0.758(34.97) + 0.242(36.97) = 35.45$ u. ³⁵Cl⁻: 17 protons, $35 - 17 = 18$ neutrons, and $17 + 1 = 18$ electrons.`,
      },
      traps: [r`A positive ion has LOST electrons: Fe³⁺ has $26 - 3 = 23$.`],
    },
    {
      name: 'Chemical Bonding',
      inShort: r`Ionic, covalent and metallic bonds, Lewis structures and molecular polarity.`,
      keyIdeas: [
        r`$\Delta EN$ below 0.4: nonpolar covalent; 0.4 to 1.7: polar covalent; above 1.7: ionic.`,
        r`Formal charge $V - N - \frac{B}{2}$; the best Lewis structure keeps it near zero.`,
        r`Bond order $= \frac{\text{bonding} - \text{antibonding}}{2}$: N₂ 3, O₂ 2, He₂ 0.`,
        r`A molecule with polar bonds can still be nonpolar if it is symmetric (CO₂, CH₄, CCl₄).`,
      ],
      example: {
        problem: r`Classify the bonds in NaCl, O–H and C–H (Pauling EN: Na 0.93, Cl 3.16, H 2.20, O 3.44, C 2.55).`,
        solution: r`NaCl: $3.16 - 0.93 = 2.23$, ionic. O–H: $3.44 - 2.20 = 1.24$, polar covalent. C–H: $2.55 - 2.20 = 0.35$, nonpolar covalent.`,
      },
      traps: [r`Water is polar because it is bent; CO₂ has polar bonds but is linear, so it is nonpolar.`],
    },
    {
      name: 'Stoichiometry',
      inShort: r`Counting atoms by weighing: moles, formulas and how much product a reaction gives.`,
      keyIdeas: [
        r`$n = \frac{m}{M}$; one mole is $6.022 \times 10^{23}$ particles.`,
        r`Percent composition $\frac{n_XA_X}{M} \times 100\%$; empirical formula from mole ratios, molecular formula $= k \times$ empirical.`,
        r`The limiting reactant has the smallest moles ÷ coefficient. Percent yield $= \frac{\text{actual}}{\text{theoretical}} \times 100\%$.`,
      ],
      example: {
        problem: r`4.0 g of H₂ reacts with 40 g of O₂ ($2\text{H}_2 + \text{O}_2 \to 2\text{H}_2\text{O}$). How much water can form? If 32 g is collected, what is the yield?`,
        solution: r`H₂: $\frac{4.0}{2.016} = 1.984$ mol, $\div 2 = 0.992$; O₂: $\frac{40}{32} = 1.25$ mol, $\div 1 = 1.25$. H₂ limits: $1.984 \times 18.015 = 35.7$ g of water. Yield $\frac{32}{35.7} = 89.5\%$.`,
      },
      traps: [r`Compare MOLES divided by coefficients; the smaller mass is not always the limiting reactant.`],
    },
    {
      name: 'Gas Laws',
      inShort: r`Boyle, Charles, Avogadro and the ideal gas law, with Dalton, Graham and real gases.`,
      keyIdeas: [
        r`$pV = nRT$; combined $\frac{p_1V_1}{T_1} = \frac{p_2V_2}{T_2}$. $R = 8.314$ J/(mol·K) $= 0.08206$ L·atm/(mol·K).`,
        r`One mole fills 22.414 L at 0 °C and 1 atm, 24.47 L at 25 °C.`,
        r`Gas density $\rho = \frac{pM}{RT}$; effusion $\frac{r_1}{r_2} = \sqrt{\frac{M_2}{M_1}}$.`,
        r`Real gases: van der Waals $\left(p + \frac{an^2}{V^2}\right)(V - nb) = nRT$.`,
      ],
      example: {
        problem: r`A 5.0 L tank holds oxygen at 200 kPa and 25 °C. Find its mass. A gas has a density of 1.25 g/L at STP: find its molar mass.`,
        solution: r`$n = \frac{(200\,000)(0.005)}{8.314(298.15)} = 0.403$ mol, so $0.403 \times 32 = 12.9$ g. $M = 1.25 \times 22.414 = 28.0$ g/mol (N₂ or CO).`,
      },
      traps: [r`Kelvin and absolute pressure only; and use the $R$ that matches your units.`],
    },
    {
      name: 'Solutions and Concentration',
      inShort: r`How much is dissolved: molarity, molality, normality, and the colligative properties.`,
      keyIdeas: [
        r`Molarity $\frac{n}{V_{\text{solution}}}$ (mol/L); molality $\frac{n}{m_{\text{solvent}}}$ (mol/kg); normality $= M \times$ equivalents.`,
        r`Dilution $M_1V_1 = M_2V_2$. Raoult: $p_A = x_Ap_A^\circ$.`,
        r`$\Delta T_b = iK_bb$, $\Delta T_f = iK_fb$ (water 0.512 and 1.86); osmotic pressure $\pi = iMRT$.`,
      ],
      example: {
        problem: r`10.0 g of NaOH (40.0 g/mol) is dissolved to make 250 mL. Find its molarity, and the volume it must be diluted to for 0.10 M.`,
        solution: r`$n = \frac{10.0}{40.0} = 0.250$ mol, so $\frac{0.250}{0.250} = 1.00$ M. $V_2 = \frac{1.00(250)}{0.10} = 2500$ mL.`,
      },
      traps: [r`NaCl gives two particles ($i = 2$), CaCl₂ three: 1 mol/kg NaCl freezes at −3.72 °C, not −1.86 °C.`],
    },
    {
      name: 'Equilibrium, Acids and Bases',
      inShort: r`How far a reaction goes, and acidity measured by pH.`,
      keyIdeas: [
        r`$K_c = \frac{[C]^c[D]^d}{[A]^a[B]^b}$, leaving out solids and liquids; $K_p = K_c(RT)^{\Delta n}$. Le Chatelier: a stressed equilibrium shifts to relieve the stress.`,
        r`$\text{pH} = -\log[\text{H}^+]$; $\text{pH} + \text{pOH} = 14$ at 25 °C.`,
        r`Weak acid $[\text{H}^+] \approx \sqrt{K_aC}$; buffer $\text{pH} = \text{p}K_a + \log\frac{[\text{A}^-]}{[\text{HA}]}$.`,
      ],
      example: {
        problem: r`Find the pH of 0.10 M acetic acid ($K_a = 1.8 \times 10^{-5}$), and of a buffer of 0.10 M acetic acid with 0.15 M sodium acetate.`,
        solution: r`$[\text{H}^+] = \sqrt{1.8 \times 10^{-6}} = 1.34 \times 10^{-3}$, pH $= 2.87$. Buffer: $4.74 + \log 1.5 = 4.92$.`,
      },
      traps: [r`A strong acid ionises fully ($[\text{H}^+] = C$); the square-root shortcut is for weak acids only.`],
    },
    {
      name: 'Thermochemistry and Energy',
      inShort: r`Heat of reaction, fuels, spontaneity and reaction rates.`,
      keyIdeas: [
        r`$\Delta H^\circ_{rxn} = \sum\Delta H_f^\circ(\text{products}) - \sum\Delta H_f^\circ(\text{reactants})$; negative is exothermic.`,
        r`$\Delta G = \Delta H - T\Delta S$; negative runs on its own. $\Delta G^\circ = -RT\ln K$.`,
        r`Heating value: HHV counts the water condensed, LHV does not (methane 55.5 vs 50.0 MJ/kg).`,
        r`Arrhenius $k = Ae^{-E_a/RT}$; first order $t_{1/2} = \frac{\ln 2}{k}$.`,
      ],
      example: {
        problem: r`Find ΔH for burning methane ($\Delta H_f^\circ$: CH₄ −74.8, CO₂ −393.5, H₂O(l) −285.8 kJ/mol) and the heat from 1 kg of it.`,
        solution: r`$\Delta H = -393.5 + 2(-285.8) - (-74.8) = -890.3$ kJ/mol. Per kg: $\frac{890.3}{16.04} = 55.5$ MJ, its higher heating value.`,
      },
      traps: [r`Elements in their standard state have $\Delta H_f^\circ = 0$: O₂ adds nothing.`],
    },
    {
      name: 'Electrochemistry and Batteries',
      inShort: r`Redox reactions that drive a current, and the cells built from them.`,
      keyIdeas: [
        r`Oxidation at the anode, reduction at the cathode. $E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode}$.`,
        r`Nernst $E = E^\circ - \frac{0.05916}{n}\log Q$ at 25 °C; $\Delta G = -nFE$.`,
        r`Faraday: $m = \frac{MIt}{nF}$, $F = 96\,485$ C/mol.`,
        r`Battery energy Wh $=$ Ah × V; at a C-rate the current is $C \times$ capacity. Lead-acid 2.0 V per cell, Li-ion about 3.6–3.7 V.`,
      ],
      example: {
        problem: r`Find the voltage and ΔG of a Daniell cell (Cu²⁺/Cu +0.34 V, Zn²⁺/Zn −0.76 V). How much copper does 10 A deposit in one hour?`,
        solution: r`$E = 0.34 - (-0.76) = 1.10$ V; $\Delta G = -2(96\,485)(1.10) = -212.3$ kJ/mol. Copper: $\frac{63.55(10)(3600)}{2(96\,485)} = 11.9$ g.`,
      },
      traps: [r`Don't multiply $E^\circ$ by the coefficients: potentials are per electron and stay the same.`],
    },
    {
      name: 'Energy Storage and Fuel Cells',
      inShort: r`Storing energy chemically, and turning fuel straight into electricity.`,
      keyIdeas: [
        r`Ideal fuel cell voltage $E = -\frac{\Delta G}{nF}$: 1.229 V for hydrogen at 25 °C; real cells run at 0.6–0.8 V.`,
        r`Efficiency at most $\frac{\Delta G}{\Delta H} = 83\%$ for hydrogen, not limited by Carnot; actual $\frac{V_{cell}}{1.48}$ on the HHV.`,
        r`Hydrogen used $\frac{I}{2F}$ mol/s per cell.`,
        r`Specific energy: Li-ion 150–250 Wh/kg, lead-acid 30–40; round-trip efficiency $\frac{E_{out}}{E_{in}}$.`,
      ],
      example: {
        problem: r`A stack of 100 hydrogen cells runs at 0.70 V per cell and 100 A. Find its power, its hydrogen use per hour, and its efficiency on the HHV.`,
        solution: r`$P = 100(0.70)(100) = 7.0$ kW. Hydrogen: $\frac{100 \times 100}{2(96\,485)} = 0.0518$ mol/s, so $0.0518(2.016)(3600) = 376$ g/h. Efficiency $\frac{0.70}{1.48} = 47\%$.`,
      },
      traps: [r`Cells in series add voltage; the current, and the hydrogen per cell, stays the same.`],
    },
    {
      name: 'Solar Cells and Photosynthesis',
      inShort: r`Turning sunlight into electricity in a semiconductor, or into sugar in a leaf.`,
      keyIdeas: [
        r`A photon is absorbed only if $E \ge E_g$: cutoff $\lambda_c = \frac{1240}{E_g}$ nm (silicon 1.12 eV, 1107 nm).`,
        r`$\eta = \frac{P_{max}}{GA}$ at the standard 1000 W/m²; fill factor $FF = \frac{V_{mp}I_{mp}}{V_{oc}I_{sc}}$.`,
        r`Photosynthesis $6\text{CO}_2 + 6\text{H}_2\text{O} \to \text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2$ stores about 2870 kJ per mole of glucose.`,
      ],
      example: {
        problem: r`A 1.7 m² panel gives 340 W at 1000 W/m², with $V_{oc} = 41.0$ V and $I_{sc} = 10.5$ A. Find its efficiency and fill factor.`,
        solution: r`$\eta = \frac{340}{1000(1.7)} = 20\%$. $FF = \frac{340}{41.0(10.5)} = 0.79$.`,
      },
      traps: [r`Photons with more energy than the gap still give only $E_g$ each; the rest is lost as heat.`],
    },
    {
      name: 'Renewable Energy',
      inShort: r`Wind, solar, hydro, geothermal and biomass, and how much they really produce.`,
      keyIdeas: [
        r`Wind power $P = \frac12\rho Av^3C_p$, with $C_p$ at most $\frac{16}{27} = 0.593$ (Betz).`,
        r`Capacity factor $= \frac{\text{energy produced}}{\text{rated power} \times \text{hours}}$: solar 15–20%, wind 25–40%, geothermal 80–90%.`,
        r`Biomass and biofuels are renewable carbon: burning releases the CO₂ the plants took in.`,
      ],
      example: {
        problem: r`A turbine with an 80 m rotor sees 10 m/s wind ($\rho = 1.225$, $C_p = 0.40$). Find its power. A 2 MW turbine makes 5256 MWh in a year: what is its capacity factor?`,
        solution: r`$A = \pi(40)^2 = 5027$ m²; $P = \frac12(1.225)(5027)(10)^3(0.40) = 1.23$ MW. $CF = \frac{5256}{2(8760)} = 30\%$.`,
      },
      traps: [r`Power goes as $v^3$: doubling the wind speed gives eight times the power.`],
    },
    {
      name: 'Chemistry of Engineering Materials',
      inShort: r`Metals, polymers, ceramics and composites, and how they corrode.`,
      keyIdeas: [
        r`Corrosion is oxidation: in a galvanic pair the more active metal is the anode and corrodes (zinc protects steel).`,
        r`Corrosion rate $\frac{87.6\,W}{\rho At}$ mm/yr ($W$ mg, $\rho$ g/cm³, $A$ cm², $t$ h).`,
        r`Pilling-Bedworth ratio between 1 and 2: a protective oxide (Al 1.29); below 1 porous (Mg).`,
        r`Polymers: degree of polymerization $\frac{M_{polymer}}{M_{repeat}}$; thermoplastics remelt, thermosets do not.`,
      ],
      example: {
        problem: r`A 50 cm² steel coupon ($\rho = 7.87$ g/cm³) loses 120 mg in 500 h. Find the corrosion rate.`,
        solution: r`$CR = \frac{87.6(120)}{7.87(50)(500)} = 0.053$ mm/yr.`,
      },
      traps: [r`In the galvanic series the anode is the metal that corrodes, not the one protected.`],
    },
    {
      name: 'Nanomaterials',
      inShort: r`Materials 1–100 nm across, whose huge surface changes how they behave.`,
      keyIdeas: [
        r`For a sphere $\frac{A}{V} = \frac{3}{r}$; specific surface $\frac{6}{\rho d}$: shrinking a particle 1000-fold gives 1000 times the surface.`,
        r`At this size a large share of atoms sit on the surface: higher reactivity, lower melting points, size-dependent colour.`,
        r`Carbon forms: graphene (one atomic layer), nanotubes, fullerenes (C₆₀).`,
      ],
      example: {
        problem: r`How many atoms are in a 5 nm gold sphere ($\rho = 19.3$ g/cm³, $M = 196.97$)? What is its surface per gram?`,
        solution: r`$V = \frac{\pi}{6}(5 \times 10^{-7})^3 = 6.54 \times 10^{-20}$ cm³; $N = \frac{19.3(6.54 \times 10^{-20})(6.022 \times 10^{23})}{196.97} \approx 3900$. Surface $\frac{6}{19\,300(5 \times 10^{-9})} = 62$ m²/g.`,
      },
      traps: [r`Keep diameter and radius apart: $\frac{A}{V} = \frac{3}{r} = \frac{6}{d}$.`],
    },
    {
      name: 'Chemistry of the Environment',
      inShort: r`Air and water pollution, combustion products and how they are measured.`,
      keyIdeas: [
        r`Air: mg/m³ $= \frac{\text{ppm} \times M}{24.45}$ at 25 °C, 1 atm.`,
        r`Water: $BOD_t = L_0(1 - e^{-kt})$; hardness as CaCO₃: Ca²⁺ × 2.5, Mg²⁺ × 4.12.`,
        r`Each kg of carbon burned makes $\frac{44}{12} = 3.67$ kg CO₂. SO₂ and NOₓ cause acid rain; CFCs destroy ozone.`,
      ],
      example: {
        problem: r`Wastewater has an ultimate BOD of 250 mg/L with $k = 0.23$/day. Find BOD₅. Water with 40 mg/L Ca²⁺ and 12 mg/L Mg²⁺: find its hardness.`,
        solution: r`$BOD_5 = 250(1 - e^{-1.15}) = 171$ mg/L. Hardness $= 40(2.50) + 12(4.12) = 149$ mg/L as CaCO₃ (hard).`,
      },
      traps: [r`Use 24.45 L/mol at 25 °C but 22.41 at 0 °C when converting ppm.`],
    },
  ],
};
