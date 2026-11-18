// Library › Lessons › ESAS › Material Science (2026-11-18): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by computation. Deformable Bodies covers stress,
// strain and Hooke's law; Chemistry the weight-loss corrosion rate and cell
// potentials.
const r = String.raw;

export default {
  topic: 'Material Science',
  subject: 'ESAS',
  overview: r`Why materials behave as they do, from how their atoms bond and pack to how they bend, conduct, magnetise and corrode. The thread is structure → properties → performance: a metal's crystal and grain size set its strength, a semiconductor's band gap its conductivity, a composite's fibres its stiffness. For an electrical engineer the payoff is choosing conductors, insulators, magnetic cores and semiconductors. Most problems are crystal geometry, a phase-diagram lever rule, a tensile-test number, or a carrier count.`,
  sources: [
    'Materials Science and Engineering: An Introduction (Callister and Rethwisch)',
    'The Science and Engineering of Materials (Askeland and Wright)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Atomic Structure and Bonding',
      inShort: r`How atoms hold together, and how the kind of bond shapes a material.`,
      keyIdeas: [
        r`Primary bonds: ionic (ceramics), covalent (diamond, silicon, polymer chains), metallic (a sea of free electrons). Secondary: van der Waals and hydrogen bonds.`,
        r`Bonding energy $E_N = -\frac{A}{r} + \frac{B}{r^n}$; the minimum gives the spacing $r_0$ and the bond energy $E_0$.`,
        r`Percent ionic character $\left[1 - e^{-0.25(X_A - X_B)^2}\right]\times 100\%$.`,
        r`Deep energy wells mean high melting points and stiffness, low thermal expansion.`,
      ],
      example: {
        problem: r`Find the percent ionic character of NaCl ($X_{Na} = 0.93$, $X_{Cl} = 3.16$). For K⁺–Cl⁻ with $A = 1.436$, $B = 5.86 \times 10^{-6}$, $n = 9$ (nm, eV), find $r_0$ and $E_0$.`,
        solution: r`$1 - e^{-0.25(2.23)^2} = 71\%$. $r_0 = \left(\frac{nB}{A}\right)^{1/(n-1)} = 0.279$ nm; $E_0 = -\frac{1.436}{0.279} + \frac{5.86 \times 10^{-6}}{0.279^9} = -4.57$ eV.`,
      },
      traps: [r`Metals conduct because metallic bonding leaves electrons free, not because of ionic charges.`],
    },
    {
      name: 'Crystal Structures',
      inShort: r`How atoms stack in metals: unit cells, packing, planes and X-ray diffraction.`,
      keyIdeas: [
        r`Atoms per cell: SC 1, BCC 2, FCC 4, HCP 6. Coordination 6, 8, 12, 12.`,
        r`$a = 2R$ (SC), $\frac{4R}{\sqrt3}$ (BCC), $2R\sqrt2$ (FCC). Packing factor 0.52, 0.68, 0.74.`,
        r`Density $\rho = \frac{nA}{V_CN_A}$. Planes $(hkl)$ from reciprocal intercepts; $d_{hkl} = \frac{a}{\sqrt{h^2 + k^2 + l^2}}$.`,
        r`Bragg: $n\lambda = 2d\sin\theta$.`,
      ],
      example: {
        problem: r`Copper is FCC with $R = 0.128$ nm and $A = 63.5$ g/mol: find its density. Iron (BCC, $a = 0.2866$ nm): where does the (220) peak appear with 0.1790 nm X-rays?`,
        solution: r`$a = 2(0.128)\sqrt2 = 0.362$ nm; $\rho = \frac{4(63.5)}{(3.62 \times 10^{-8})^3(6.022 \times 10^{23})} = 8.89$ g/cm³. $d = \frac{0.2866}{\sqrt8} = 0.1013$ nm; $\sin\theta = \frac{0.179}{2(0.1013)} = 0.884$, $\theta = 62.1^\circ$, so $2\theta = 124.2^\circ$.`,
      },
      traps: [r`Convert nm to cm ($10^{-7}$) before cubing for density in g/cm³.`],
    },
    {
      name: 'Imperfections in Solids',
      inShort: r`Vacancies, impurities, dislocations and grain boundaries: the defects that control properties.`,
      keyIdeas: [
        r`Point defects: vacancies $N_v = Ne^{-Q_v/kT}$, interstitials, substitutional atoms. Atoms per volume $N = \frac{N_A\rho}{A}$.`,
        r`Line defects: dislocations (edge, screw); their motion is plastic deformation.`,
        r`Area defects: grain boundaries. ASTM grain size $N = 2^{n-1}$ grains per in² at 100×.`,
        r`Solid solutions (Hume-Rothery): similar radii (within 15%), structure, electronegativity and valence.`,
      ],
      example: {
        problem: r`Copper at 1000 °C has $8.0 \times 10^{28}$ atom sites per m³ and $Q_v = 0.9$ eV. How many vacancies per m³?`,
        solution: r`$N_v = 8.0 \times 10^{28}\exp\left(-\frac{0.9}{(8.62 \times 10^{-5})(1273)}\right) = 2.2 \times 10^{25}$ m⁻³, about one site in 3600.`,
      },
      traps: [r`Use kelvin and $k$ in eV/K when $Q$ is in eV.`],
    },
    {
      name: 'Diffusion',
      inShort: r`Atoms moving through a solid: steady flux, time-dependent profiles, and temperature.`,
      keyIdeas: [
        r`Steady state (Fick I): $J = -D\frac{dC}{dx}$.`,
        r`$D = D_0e^{-Q_d/RT}$: diffusion speeds up exponentially with temperature.`,
        r`Non-steady (Fick II), constant surface: $\frac{C_x - C_0}{C_s - C_0} = 1 - \text{erf}\frac{x}{2\sqrt{Dt}}$; same concentration means $\frac{x^2}{Dt}$ constant.`,
        r`Uses: carburizing and nitriding steel, doping silicon.`,
      ],
      example: {
        problem: r`A 0.25 wt% C steel is carburized at a surface 1.20 wt% C ($D = 1.6 \times 10^{-11}$ m²/s). How long until 0.80 wt% C at 0.5 mm deep?`,
        solution: r`$\frac{0.80 - 0.25}{1.20 - 0.25} = 0.579$, so $\text{erf}\,z = 0.421$, $z = 0.392$. $t = \frac{x^2}{4Dz^2} = \frac{(5 \times 10^{-4})^2}{4(1.6 \times 10^{-11})(0.392)^2} = 25\,400$ s, about 7.1 h.`,
      },
      traps: [r`Doubling the depth at the same temperature takes FOUR times as long.`],
    },
    {
      name: 'Mechanical Properties of Metals',
      inShort: r`The tensile test, hardness, strengthening and fracture.`,
      keyIdeas: [
        r`Engineering vs true: $\sigma_T = \sigma(1 + \varepsilon)$, $\varepsilon_T = \ln(1 + \varepsilon)$; $\sigma_T = K\varepsilon_T^n$, necking at $\varepsilon_T = n$.`,
        r`Resilience $\frac{\sigma_y^2}{2E}$; toughness is the whole area under the curve; ductility %EL and %RA.`,
        r`Brinell $HB$; for steels $TS \approx 3.45\,HB$ MPa. Hall-Petch $\sigma_y = \sigma_0 + k_yd^{-1/2}$.`,
        r`Fracture: $K_{Ic} = Y\sigma\sqrt{\pi a}$. Fatigue and creep cause failure below the yield strength.`,
      ],
      example: {
        problem: r`A 3000 kgf load on a 10 mm ball leaves a 4.0 mm dent in steel. Find HB and the tensile strength. What stress breaks a plate ($K_{Ic} = 26$ MPa√m, $Y = 1$) with a 4 mm interior crack?`,
        solution: r`$HB = \frac{2(3000)}{\pi(10)(10 - \sqrt{84})} = 229$; $TS \approx 3.45(229) = 789$ MPa. $a = 2$ mm: $\sigma_c = \frac{26}{\sqrt{\pi(0.002)}} = 328$ MPa.`,
      },
      traps: [r`An interior crack's $a$ is HALF its length.`],
    },
    {
      name: 'Alloys and Phase Diagrams',
      inShort: r`Which phases an alloy holds, in what amounts, and the iron-carbon diagram behind steel.`,
      keyIdeas: [
        r`Tie line and lever rule: $W_L = \frac{C_\alpha - C_0}{C_\alpha - C_L}$, $W_\alpha = \frac{C_0 - C_L}{C_\alpha - C_L}$.`,
        r`Phase rule $P + F = C + N$. Invariant points: eutectic (L → α + β), eutectoid (γ → α + Fe₃C).`,
        r`Fe–Fe₃C: eutectoid 0.76% C at 727 °C, eutectic 4.30% C at 1147 °C; steel below 2.14% C.`,
        r`Heat treatment: quenching gives martensite (hard, brittle); tempering restores toughness.`,
      ],
      example: {
        problem: r`A Cu–35 wt% Ni alloy at 1250 °C lies between liquid of 31.5% Ni and α of 42.5% Ni. Find the phase fractions. How much pearlite does a 0.40 wt% C steel have just below 727 °C?`,
        solution: r`$W_L = \frac{42.5 - 35}{42.5 - 31.5} = 0.68$, $W_\alpha = 0.32$. Pearlite $= \frac{0.40 - 0.022}{0.76 - 0.022} = 0.51$; the rest, 0.49, is proeutectoid ferrite.`,
      },
      traps: [r`The lever arm for a phase is on the OPPOSITE side of the tie line.`],
    },
    {
      name: 'Ceramics',
      inShort: r`Ionic and covalent compounds: hard, heat-resistant, insulating and brittle.`,
      keyIdeas: [
        r`Radius ratio $\frac{r_C}{r_A}$ sets the coordination: 0.225–0.414 → 4, 0.414–0.732 → 6, 0.732–1 → 8.`,
        r`Density by formula units: $\rho = \frac{n'(\sum A_C + \sum A_A)}{V_CN_A}$.`,
        r`Flexural strength $\frac{3F_fL}{2bd^2}$; strong in compression, weak in tension; pores lower both $E$ and strength.`,
        r`Glasses soften gradually (no melting point); most ceramics are excellent insulators.`,
      ],
      example: {
        problem: r`NaCl: $r_{Na^+} = 0.102$, $r_{Cl^-} = 0.181$ nm. Find its coordination number and theoretical density (rock salt, 4 formula units per cell).`,
        solution: r`$\frac{0.102}{0.181} = 0.56$: coordination 6. $a = 2(0.283) = 0.566$ nm; $\rho = \frac{4(22.99 + 35.45)}{(5.66 \times 10^{-8})^3(6.022 \times 10^{23})} = 2.14$ g/cm³.`,
      },
      traps: [r`Rock salt's ions touch along the cube EDGE: $a = 2(r_C + r_A)$.`],
    },
    {
      name: 'Polymers',
      inShort: r`Long-chain molecules: thermoplastics, thermosets and elastomers.`,
      keyIdeas: [
        r`Molecular weight is an average: $\bar M_n = \sum x_iM_i$, $\bar M_w = \sum w_iM_i$; degree of polymerization $\frac{\bar M_n}{m}$.`,
        r`Crystallinity $\frac{\rho_c(\rho_s - \rho_a)}{\rho_s(\rho_c - \rho_a)}$: more crystalline means denser, stiffer and stronger.`,
        r`Thermoplastics soften on heating and can be recycled; thermosets cross-link and char instead.`,
        r`Viscoelastic: stress relaxes, $\sigma(t) = \sigma_0e^{-t/\tau}$; glassy below $T_g$, rubbery above.`,
      ],
      example: {
        problem: r`Polyethylene of density 0.925 g/cm³ ($\rho_c = 0.998$, $\rho_a = 0.870$): find its percent crystallinity.`,
        solution: r`$\frac{0.998(0.925 - 0.870)}{0.925(0.998 - 0.870)} = 46.4\%$.`,
      },
      traps: [r`Crystallinity is a MASS fraction: don't use the plain density ratio.`],
    },
    {
      name: 'Composites',
      inShort: r`Two materials combined: fibres for strength and stiffness, a matrix to hold them.`,
      keyIdeas: [
        r`Along the fibres (isostrain): $E_{cl} = E_mV_m + E_fV_f$; across (isostress): $E_{ct} = \frac{E_mE_f}{V_mE_f + V_fE_m}$.`,
        r`Load share $\frac{F_f}{F_m} = \frac{E_fV_f}{E_mV_m}$; strength $\sigma'_m(1 - V_f) + \sigma^*_fV_f$.`,
        r`Fibres must exceed $l_c = \frac{\sigma_f^*d}{2\tau_c}$; beyond about $15l_c$ they act as continuous.`,
      ],
      example: {
        problem: r`40 vol% glass fibre ($E = 69$ GPa) in polyester ($E = 3.4$ GPa). Find the modulus along and across the fibres, and the fibres' share of a longitudinal load.`,
        solution: r`$E_{cl} = 3.4(0.6) + 69(0.4) = 29.6$ GPa. $E_{ct} = \frac{3.4(69)}{0.6(69) + 0.4(3.4)} = 5.5$ GPa. $\frac{F_f}{F_m} = \frac{27.6}{2.04} = 13.5$, so fibres carry 93%.`,
      },
      traps: [r`Across the fibres the composite is barely stiffer than the matrix.`],
    },
    {
      name: 'Electrical Properties',
      inShort: r`Conductors, semiconductors and insulators, explained by bands and charge carriers.`,
      keyIdeas: [
        r`$\sigma = n|e|\mu_e + p|e|\mu_h$; conductors have no gap, semiconductors a small one (Si 1.12 eV), insulators a large one.`,
        r`Metals: $\rho = \rho_t + \rho_i + \rho_d$ (Matthiessen), rising with temperature, impurities and cold work.`,
        r`Intrinsic semiconductors conduct better when hot. Doping: n-type (P, As donors), p-type (B, Al acceptors).`,
        r`Hall effect $R_H = \frac{1}{n|e|}$: the sign gives the carrier type.`,
      ],
      example: {
        problem: r`Find the conductivity of intrinsic silicon ($n_i = 10^{16}$ m⁻³, $\mu_e = 0.14$, $\mu_h = 0.05$ m²/V·s), and of silicon with $10^{22}$ m⁻³ phosphorus (take $\mu_e = 0.14$).`,
        solution: r`Intrinsic: $10^{16}(1.602 \times 10^{-19})(0.19) = 3.0 \times 10^{-4}$ (Ω·m)⁻¹. Doped: $10^{22}(1.602 \times 10^{-19})(0.14) = 224$ (Ω·m)⁻¹, almost a million times higher.`,
      },
      traps: [r`In an extrinsic semiconductor count only the majority carriers: $n \approx N_d$.`],
    },
    {
      name: 'Dielectric and Magnetic Properties',
      inShort: r`Insulators in electric fields, and how materials respond to magnetic fields.`,
      keyIdeas: [
        r`$\varepsilon_r = \frac{C}{C_0}$; $P = \varepsilon_0(\varepsilon_r - 1)\mathscr{E}$; breakdown voltage $= \mathscr{E}_{ds} \times$ thickness.`,
        r`$B = \mu_0(H + M)$, $M = \chi_mH$, $\mu_r = 1 + \chi_m$. Dia-, para- and ferromagnetism; ferrites are ferrimagnetic.`,
        r`$M_s = n_BN\mu_B$; above the Curie temperature ferromagnetism disappears.`,
        r`Soft magnets (narrow loops, low hysteresis loss $k_hfB_{max}^{1.6}V$) for transformer cores; hard magnets for permanent magnets.`,
      ],
      example: {
        problem: r`Nickel ($\rho = 8.90$ g/cm³, $A = 58.69$) has 0.60 Bohr magnetons per atom. Find its saturation magnetization and flux density.`,
        solution: r`$N = \frac{8.90 \times 10^6(6.022 \times 10^{23})}{58.69} = 9.13 \times 10^{28}$ m⁻³. $M_s = 0.60(9.13 \times 10^{28})(9.27 \times 10^{-24}) = 5.1 \times 10^5$ A/m; $B_s = \mu_0M_s = 0.64$ T.`,
      },
      traps: [r`Hysteresis loss is the loop's area per cycle: it grows with frequency.`],
    },
    {
      name: 'Optical and Thermal Properties',
      inShort: r`How materials reflect, absorb and pass light, and store, conduct and expand with heat.`,
      keyIdeas: [
        r`Normal reflectivity $R = \left(\frac{n_2 - n_1}{n_2 + n_1}\right)^2$; slab $I_T = I_0(1 - R)^2e^{-\beta l}$; $R + A + T = 1$.`,
        r`Heat capacity rises as $T^3$ when cold and levels at $3R \approx 25$ J/(mol·K).`,
        r`Metals: $\frac{k}{\sigma T} \approx 2.44 \times 10^{-8}$ (Wiedemann-Franz).`,
        r`Thermal shock resistance $\frac{\sigma_fk}{E\alpha_l}$: low expansion helps most.`,
      ],
      example: {
        problem: r`What fraction of light passes through a 10 mm glass plate ($n = 1.5$, $\beta = 10$ m⁻¹)? Estimate copper's thermal conductivity from $\sigma = 5.96 \times 10^7$ (Ω·m)⁻¹ at 300 K.`,
        solution: r`$R = \left(\frac{0.5}{2.5}\right)^2 = 0.04$; $T = (0.96)^2e^{-0.1} = 83.4\%$. $k = 2.44 \times 10^{-8}(5.96 \times 10^7)(300) = 436$ W/(m·K) (measured 398).`,
      },
      traps: [r`Light is reflected at BOTH faces of a slab: $(1 - R)^2$.`],
    },
    {
      name: 'Corrosion',
      inShort: r`Metals oxidising back to their ores: electrochemistry, rates and prevention.`,
      keyIdeas: [
        r`Corrosion needs an anode, a cathode, an electrolyte and a conducting path. The more active metal in a galvanic pair corrodes.`,
        r`Rate from current density: $r = \frac{i}{nF}$; penetration $\frac{iM}{nF\rho}$.`,
        r`Tafel $\eta = \pm\beta\log\frac{i}{i_0}$: the oxidation and reduction lines cross at the corrosion current.`,
        r`Forms: uniform, galvanic, crevice, pitting, intergranular, stress corrosion. Prevention: coatings, cathodic protection, inhibitors, design.`,
      ],
      example: {
        problem: r`A corrosion current of 1 A/m² attacks iron ($n = 2$, $M = 55.85$ g/mol, $\rho = 7870$ kg/m³). Find the penetration rate in mm/yr.`,
        solution: r`$CPR = \frac{1(0.05585)}{2(96\,485)(7870)} = 3.68 \times 10^{-11}$ m/s $\times 3.156 \times 10^{10} = 1.16$ mm/yr.`,
      },
      traps: [r`A small anode with a large cathode corrodes fastest: never pair them that way.`],
    },
    {
      name: 'Economic, Environmental and Societal Issues',
      inShort: r`Choosing materials for cost, weight and the environment over their whole life.`,
      keyIdeas: [
        r`Lightest tie for a load: minimise $\frac{\rho}{\sigma_y}$; cheapest: $\frac{\bar c\rho}{\sigma_y}$; mass $m = \frac{NFL\rho}{\sigma_y}$.`,
        r`Performance indices (Ashby): $\frac{E}{\rho}$, $\frac{E^{1/2}}{\rho}$, $\frac{\sigma_y^{2/3}}{\rho}$ depending on shape and load.`,
        r`Life-cycle thinking: extraction, processing, use, and recycling or disposal. Recycling aluminium saves about 95% of the energy of making it new.`,
      ],
      example: {
        problem: r`A 1 m tie carries 50 kN with a safety factor of 2. Compare the masses in steel ($\rho = 7850$, $\sigma_y = 250$ MPa) and aluminium ($\rho = 2700$, $\sigma_y = 255$ MPa).`,
        solution: r`Steel: $\frac{2(50\,000)(1)(7850)}{250 \times 10^6} = 3.14$ kg. Aluminium: $\frac{2(50\,000)(1)(2700)}{255 \times 10^6} = 1.06$ kg, a third of the mass.`,
      },
      traps: [r`The lightest choice is not always the cheapest: include cost per kg.`],
    },
  ],
};
