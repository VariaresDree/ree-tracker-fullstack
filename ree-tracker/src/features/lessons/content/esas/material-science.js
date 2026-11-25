// Library › Lessons › ESAS › Material Science
// (2026-11-18; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// materialsLesson.test.js. Coverage and problem styles cross-checked against
// the materials half of a review center's physics and materials handout; the
// text, problems and figures are this app's own): written for the Philippine
// REE board, subtopic by subtopic in the syllabus's order. Deformable Bodies
// covers stress, strain and Hooke's law; Chemistry the weight-loss corrosion
// rate and cell potentials.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;
const K_B = 8.62e-5; // eV/K

// Error function (Abramowitz and Stegun 7.1.26, good to about 1e-7), for x ≥ 0.
export const erf = (x) => {
  const t = 1 / (1 + 0.3275911 * x);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return 1 - poly * Math.exp(-x * x);
};

// Carburizing of the worked example: 0.25% C steel, 1.20% C surface, D = 1.6e-11 m²/s; x in mm, t in s.
const CARB_D = 1.6e-11;
export const CARB_T = (5e-4) ** 2 / (4 * CARB_D * 0.392 ** 2);
const carbon = (t) => (x) => 1.2 - 0.95 * erf((x / 1000) / (2 * Math.sqrt(CARB_D * t)));

// An illustrative low-carbon steel: elastic to 250 MPa, hardening to 444 MPa at 18% strain, necking, fracture at 28%.
const UTS_AT = 0.18;
const hardening = (e) => 250 + 200 * (1 - Math.exp(-(e - 0.00125) / 0.05));
const steel = (e) => {
  if (e <= 0.00125) return 200000 * e;
  if (e <= UTS_AT) return hardening(e);
  return e <= 0.28 ? hardening(UTS_AT) - 6000 * (e - UTS_AT) ** 2 : 0;
};

// A schematic Cu–Ni diagram through the worked tie line (1250 °C: liquid 31.5% Ni, α 42.5% Ni).
const liquidus = (c) => 1085 + 3.7 * c + 0.022454 * c * (100 - c);
const solidus = (c) => 1085 + 3.7 * c + 0.0031714 * c * (100 - c);

// Intrinsic silicon's conductivity, anchored at 3.0e-4 (Ω·m)⁻¹ at 300 K, gap 1.12 eV.
const siSigma = (t) => 3.04e-4 * (t / 300) ** 1.5 * Math.exp((-1.12 / (2 * 8.617e-5)) * (1 / t - 1 / 300));

// A hysteresis loop of saturation 1 and coercivity hc (relative units), as closed points.
const loop = (hc, w) => {
  const hs = Array.from({ length: 61 }, (_, i) => -1.5 + i * 0.05);
  const down = [...hs].reverse().map((h) => [h, Math.tanh((h + hc) / w)]);
  const up = hs.map((h) => [h, Math.tanh((h - hc) / w)]);
  return [...down, ...up];
};

// Einstein's heat capacity per mole against T/θ.
const einstein = (tr) => {
  if (tr < 0.02) return 0;
  const x = 1 / tr;
  return (3 * 8.314 * x * x * Math.exp(x)) / Math.expm1(x) ** 2;
};

// Iron in acid: oxidation from −0.44 V at 1e-7 A/cm² (+0.06 V/decade); hydrogen from 0 V at 1e-6 A/cm² (−0.10 V/decade).
const ironLine = (i) => -0.44 + 0.06 * Math.log10(i / 1e-7);
const hydrogenLine = (i) => -0.1 * Math.log10(i / 1e-6);

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
      body: [
        r`Atoms bond in three strong (**primary**) ways: **ionic**, electrons transferred and the ions attracting (ceramics such as NaCl, MgO); **covalent**, electrons shared in directional bonds (diamond, silicon, polymer chains); and **metallic**, outer electrons pooled in a sea around the ions, which is why metals conduct and bend. Weak **secondary** bonds (van der Waals, hydrogen) hold polymer chains and molecules together.`,
        r`Two atoms attract at a distance and repel when their electron clouds overlap. The net energy $E_N = -\frac Ar + \frac{B}{r^n}$ has a well: its bottom sets the equilibrium spacing $r_0$ and the bond energy $E_0$:`,
        {
          type: 'plot',
          alt: 'Bonding energy of a potassium-chlorine ion pair against separation from 0.2 to 0.6 nanometres: the net energy, solid, falls from above zero to a minimum of minus 4.57 electronvolts at 0.279 nanometres, then rises slowly; the attraction alone, dashed, keeps falling toward small separations.',
          caption: 'K⁺–Cl⁻: the net energy (solid) has its well at 0.279 nm, −4.57 eV; the attraction alone (dashed) has none.',
          x: [0.2, 0.6],
          y: [-8, 5],
          xLabel: 'r (nm)',
          yLabel: 'energy (eV)',
          series: [
            { f: (x) => -1.436 / x + 5.86e-6 / x ** 9, label: 'net' },
            { f: (x) => -1.436 / x, label: 'attraction', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 0.279, label: 'r_0' }],
        },
        r`A deep, narrow well means a high melting point, high stiffness and low thermal expansion: tungsten and diamond against lead and wax.`,
      ],
      keyIdeas: [
        r`Primary bonds: ionic (ceramics), covalent (diamond, silicon, polymer chains), metallic (a sea of free electrons). Secondary: van der Waals and hydrogen bonds.`,
        r`Bonding energy $E_N = -\frac{A}{r} + \frac{B}{r^n}$; the minimum gives the spacing $r_0$ and the bond energy $E_0$.`,
        r`Percent ionic character $\left[1 - e^{-0.25(X_A - X_B)^2}\right]\times 100\%$.`,
        r`Deep energy wells mean high melting points and stiffness, low thermal expansion.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Ionic share and a bond well',
          problem: r`Find the percent ionic character of NaCl ($X_{Na} = 0.93$, $X_{Cl} = 3.16$). For K⁺–Cl⁻ with $A = 1.436$, $B = 5.86 \times 10^{-6}$, $n = 9$ (nm, eV), find $r_0$ and $E_0$.`,
          steps: [
            r`$1 - e^{-0.25 \times 2.23^2} = 71\%$.`,
            r`Setting $\frac{dE}{dr} = 0$: $r_0 = \left(\frac{nB}{A}\right)^{1/(n-1)} = 0.279$ nm.`,
            r`$E_0 = -\frac{1.436}{0.279} + \frac{5.86 \times 10^{-6}}{0.279^9} = -4.57$ eV.`,
          ],
          answer: r`71%; 0.279 nm and −4.57 eV.`,
        },
        {
          level: 'board',
          title: 'Two oxides',
          problem: r`Compare the ionic character of the Mg–O bond ($X_{Mg} = 1.31$) and the Si–O bond ($X_{Si} = 1.90$), with $X_O = 3.44$.`,
          steps: [
            r`Mg–O: $1 - e^{-0.25 \times 2.13^2} = 67.8\%$, mostly ionic.`,
            r`Si–O: $1 - e^{-0.25 \times 1.54^2} = 44.7\%$, mixed ionic and covalent.`,
          ],
          answer: r`67.8%; 44.7%.`,
        },
      ],
      traps: [
        r`Metals conduct because metallic bonding leaves electrons free, not because of ionic charges.`,
        r`The bond energy is the well's DEPTH, at $r_0$, not where the curve crosses zero.`,
      ],
      check: [
        { q: r`What kind of bond holds a polymer's chains to each other?`, a: r`Secondary (van der Waals) bonds; the chains themselves are covalent.` },
        { q: r`Which has the higher melting point: a material with a deep or a shallow energy well?`, a: r`The deep one.` },
      ],
    },
    {
      name: 'Crystal Structures',
      inShort: r`How atoms stack in metals: unit cells, packing, planes and X-ray diffraction.`,
      body: [
        r`In a **crystal** the atoms repeat in a regular lattice, described by its smallest repeating box, the **unit cell**; in an **amorphous** solid such as glass they don't. Most metals take one of three cells:

| Cell | Atoms per cell | Coordination | Edge a | Packing factor | Examples |
|---|---|---|---|---|---|
| Simple cubic | 1 | 6 | $2R$ | 0.52 | (polonium) |
| BCC | 2 | 8 | $\frac{4R}{\sqrt3}$ | 0.68 | Fe (α), Cr, W |
| FCC | 4 | 12 | $2R\sqrt2$ | 0.74 | Cu, Al, Ni, Au |
| HCP | 6 | 12 | $a = 2R$ | 0.74 | Zn, Mg, Ti |`,
        r`Knowing the cell gives the density, $\rho = \frac{nA}{V_CN_A}$. Planes are named by **Miller indices** (hkl): take the plane's intercepts on the axes in cell lengths, take reciprocals, and clear fractions (an axis it never meets has intercept ∞, index 0). Parallel planes are $d_{hkl} = \frac{a}{\sqrt{h^2 + k^2 + l^2}}$ apart, and X-rays reflect from them where **Bragg's law** holds, $n\lambda = 2d\sin\theta$.`,
      ],
      keyIdeas: [
        r`Atoms per cell: SC 1, BCC 2, FCC 4, HCP 6. Coordination 6, 8, 12, 12.`,
        r`$a = 2R$ (SC), $\frac{4R}{\sqrt3}$ (BCC), $2R\sqrt2$ (FCC). Packing factor 0.52, 0.68, 0.74.`,
        r`Density $\rho = \frac{nA}{V_CN_A}$. Planes $(hkl)$ from reciprocal intercepts; $d_{hkl} = \frac{a}{\sqrt{h^2 + k^2 + l^2}}$.`,
        r`Bragg: $n\lambda = 2d\sin\theta$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Copper's density and iron's X-ray peak",
          problem: r`Copper is FCC with $R = 0.128$ nm and $A = 63.5$ g/mol: find its density. Iron (BCC, $a = 0.2866$ nm): where does the (220) peak appear with 0.1790 nm X-rays?`,
          steps: [
            r`$a = 2 \times 0.128\sqrt2 = 0.362$ nm; $\rho = \frac{4 \times 63.5}{(3.62 \times 10^{-8})^3 \times 6.022 \times 10^{23}} = 8.89$ g/cm³.`,
            r`$d = \frac{0.2866}{\sqrt8} = 0.10133$ nm.`,
            r`$\sin\theta = \frac{0.179}{2 \times 0.10133} = 0.8833$, $\theta = 62.0^\circ$, so $2\theta = 124.1^\circ$.`,
          ],
          answer: r`8.89 g/cm³; $2\theta = 124.1^\circ$.`,
        },
        {
          level: 'board',
          title: 'Miller indices and an atomic radius',
          problem: r`A plane cuts the axes at 1, 3 and 2 cell lengths; another at ½, 1 and ∞. Find their Miller indices. What is the atomic radius of BCC iron, a = 0.2866 nm?`,
          steps: [
            r`Reciprocals $1, \frac13, \frac12$; times 6: (623).`,
            r`Reciprocals 2, 1, 0: (210).`,
            r`Atoms touch along the body diagonal: $R = \frac{\sqrt3a}{4} = 0.1241$ nm.`,
          ],
          answer: r`(623) and (210); 0.1241 nm.`,
        },
      ],
      traps: [
        r`Convert nm to cm ($10^{-7}$) before cubing for density in g/cm³.`,
        r`An intercept of ∞ gives index 0; never take the reciprocal of the INDEX.`,
      ],
      check: [
        { q: r`How many atoms belong to an FCC unit cell?`, a: r`Four.` },
        { q: r`What is the coordination number of BCC?`, a: r`Eight.` },
      ],
    },
    {
      name: 'Imperfections in Solids',
      inShort: r`Vacancies, impurities, dislocations and grain boundaries: the defects that control properties.`,
      body: [
        r`No crystal is perfect, and the defects matter more than the perfection. **Point defects** are vacancies (empty sites), self-interstitials, and impurity atoms dissolved substitutionally or interstitially. Vacancies are in thermal equilibrium, so their fraction climbs steeply with temperature, $\frac{N_v}{N} = e^{-Q_v/kT}$:`,
        {
          type: 'plot',
          alt: 'The base-ten logarithm of the vacancy fraction in copper, with a formation energy of 0.9 electronvolts, against temperature from 200 to 1085 degrees Celsius: rising from about minus 9.6 to about minus 3.6 at 1000 degrees, one site in about 3600.',
          caption: 'Vacancies in copper (0.9 eV): from about one site in 4 billion at 200 °C to one in 3600 at 1000 °C.',
          x: [200, 1085],
          y: [-10, -2],
          xLabel: 'T (°C)',
          yLabel: 'log of vacancy fraction',
          series: [{ f: (t) => Math.log10(Math.exp(-0.9 / (K_B * (t + 273.15)))), label: 'vacancies' }],
          marks: [{ x: 1000, label: '1000 °C' }],
        },
        r`**Line defects**, dislocations (edge and screw), are how metals deform: slip happens by dislocations gliding, one row of bonds at a time. **Area defects** are grain boundaries between crystals of different orientation; finer grains block slip and make a metal stronger. Grain size is rated by the ASTM number n, with $2^{n-1}$ grains per square inch at 100×. Atoms dissolve into each other freely (Hume-Rothery) when their radii are within 15% and their structure, electronegativity and valence are alike.`,
      ],
      keyIdeas: [
        r`Point defects: vacancies $N_v = Ne^{-Q_v/kT}$, interstitials, substitutional atoms. Atoms per volume $N = \frac{N_A\rho}{A}$.`,
        r`Line defects: dislocations (edge, screw); their motion is plastic deformation.`,
        r`Area defects: grain boundaries. ASTM grain size $N = 2^{n-1}$ grains per in² at 100×.`,
        r`Solid solutions (Hume-Rothery): similar radii (within 15%), structure, electronegativity and valence.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Vacancies in copper',
          problem: r`Copper at 1000 °C has $8.0 \times 10^{28}$ atom sites per m³ and $Q_v = 0.9$ eV. How many vacancies per m³?`,
          steps: [r`$N_v = 8.0 \times 10^{28}\exp\left(-\frac{0.9}{8.62 \times 10^{-5} \times 1273}\right) = 2.2 \times 10^{25}$ m⁻³, about one site in 3600.`],
          answer: r`$2.2 \times 10^{25}$ m⁻³.`,
        },
        {
          level: 'board',
          title: 'Aluminium sites and vacancies, and a grain size',
          problem: r`Find the atom sites per m³ in aluminium (2.70 g/cm³, 26.98 g/mol) and the vacancies at 500 °C with $Q_v = 0.75$ eV. How many grains per in² does ASTM grain size 6 show at 100×?`,
          steps: [
            r`$N = \frac{6.022 \times 10^{23} \times 2.70 \times 10^6}{26.98} = 6.03 \times 10^{28}$ m⁻³.`,
            r`$e^{-0.75/(8.62 \times 10^{-5} \times 773.15)} = 1.30 \times 10^{-5}$, so $N_v = 7.8 \times 10^{23}$ m⁻³.`,
            r`$2^{6-1} = 32$ grains per in².`,
          ],
          answer: r`$6.03 \times 10^{28}$; $7.8 \times 10^{23}$ m⁻³; 32.`,
        },
      ],
      traps: [
        r`Use kelvin and $k$ in eV/K when $Q$ is in eV.`,
        r`A HIGHER ASTM number means FINER grains.`,
      ],
      check: [
        { q: r`Which defect's motion is plastic deformation?`, a: r`Dislocations.` },
        { q: r`Why does a finer grain size make a metal stronger?`, a: r`Grain boundaries block dislocation motion.` },
      ],
    },
    {
      name: 'Diffusion',
      inShort: r`Atoms moving through a solid: steady flux, time-dependent profiles, and temperature.`,
      body: [
        r`Atoms wander through a solid by jumping into vacancies or between atoms. With a steady gradient the flux follows **Fick's first law**, $J = -D\frac{dC}{dx}$; the diffusivity rises exponentially with temperature, $D = D_0e^{-Q_d/RT}$, which is why heat treatments run hot.`,
        r`When the surface is held at a fixed concentration (carburizing a gear, doping a wafer), the profile spreads with time by **Fick's second law**: $\frac{C_x - C_0}{C_s - C_0} = 1 - \text{erf}\frac{x}{2\sqrt{Dt}}$. A given concentration reaches a depth that grows as $\sqrt{Dt}$:`,
        {
          type: 'plot',
          alt: 'Carbon content against depth in a 0.25 percent carbon steel carburized with a 1.20 percent surface: after 1 hour the carbon falls to the base level within about 0.3 millimetres; after 7.1 hours, the worked example, 0.80 percent reaches 0.5 millimetres; after 24 hours it spreads deeper still.',
          caption: 'Carburizing at 1.20% C: after 1 h, 7.1 h (the example: 0.80% at 0.5 mm) and 24 h, deeper each time as √t.',
          x: [0, 2],
          y: [0, 1.3],
          xLabel: 'depth (mm)',
          yLabel: 'carbon (wt%)',
          series: [3600, CARB_T, 86400].map((t, i) => ({
            f: carbon(t),
            label: `${Math.round(t / 360) / 10} h`,
            colour: colourOf(i),
            dashed: i === 2,
          })),
          legend: false,
          marks: [{ x: 0.5, label: '0.5 mm' }],
        },
      ],
      keyIdeas: [
        r`Steady state (Fick I): $J = -D\frac{dC}{dx}$.`,
        r`$D = D_0e^{-Q_d/RT}$: diffusion speeds up exponentially with temperature.`,
        r`Non-steady (Fick II), constant surface: $\frac{C_x - C_0}{C_s - C_0} = 1 - \text{erf}\frac{x}{2\sqrt{Dt}}$; same concentration means $\frac{x^2}{Dt}$ constant.`,
        r`Uses: carburizing and nitriding steel, doping silicon.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Carburizing time',
          problem: r`A 0.25 wt% C steel is carburized at a surface 1.20 wt% C ($D = 1.6 \times 10^{-11}$ m²/s). How long until 0.80 wt% C at 0.5 mm deep?`,
          steps: [
            r`$\frac{0.80 - 0.25}{1.20 - 0.25} = 0.579$, so $\text{erf}\,z = 0.421$, $z = 0.392$.`,
            r`$t = \frac{x^2}{4Dz^2} = \frac{(5 \times 10^{-4})^2}{4 \times 1.6 \times 10^{-11} \times 0.392^2} = 25\,400$ s, about 7.1 h.`,
          ],
          answer: r`About 7.1 h.`,
        },
        {
          level: 'board',
          title: 'A diffusivity, and a deeper case',
          problem: r`Carbon in FCC iron has $D_0 = 2.3 \times 10^{-5}$ m²/s and $Q_d = 148$ kJ/mol. Find D at 950 °C. At that temperature a case takes 3 h to reach 0.6 mm: how long for 1.2 mm?`,
          steps: [
            r`$D = 2.3 \times 10^{-5}\exp\left(-\frac{148\,000}{8.314 \times 1223.15}\right) = 1.10 \times 10^{-11}$ m²/s.`,
            r`$\frac{x^2}{t}$ is constant: doubling x takes $2^2 \times 3 = 12$ h.`,
          ],
          answer: r`$1.10 \times 10^{-11}$ m²/s; 12 h.`,
        },
      ],
      traps: [
        r`Doubling the depth at the same temperature takes FOUR times as long.`,
        r`Use R = 8.314 J/mol·K with Q in J/mol, or k with Q in eV per atom.`,
      ],
      check: [
        { q: r`What drives diffusion in Fick's first law?`, a: r`The concentration gradient.` },
        { q: r`Name a heat treatment that diffuses carbon into steel's surface.`, a: r`Carburizing.` },
      ],
    },
    {
      name: 'Mechanical Properties of Metals',
      inShort: r`The tensile test, hardness, strengthening and fracture.`,
      body: [
        r`A **tensile test** pulls a bar to failure. It stretches elastically (Hooke, slope E) until it **yields**, then hardens as dislocations tangle, reaches its **tensile strength**, necks and breaks:`,
        {
          type: 'plot',
          alt: 'Engineering stress against strain for an illustrative low-carbon steel: a near-vertical elastic line to 250 megapascals, then a hardening curve rising to a tensile strength of about 444 megapascals at 18 percent strain, falling as the bar necks, and breaking at 28 percent.',
          caption: 'An illustrative low-carbon steel: yield at 250 MPa, tensile strength about 444 MPa, necking, fracture at 28% strain.',
          x: [0, 0.3],
          y: [0, 500],
          xLabel: 'strain',
          yLabel: 'stress (MPa)',
          series: [{ f: steel, label: 'stress', area: true }],
          marks: [{ x: UTS_AT, label: 'UTS' }],
        },
        r`The area under the elastic part is the **resilience**, $\frac{\sigma_y^2}{2E}$; under the whole curve, the **toughness**, the energy absorbed before fracture. **Ductility** is the elongation (%EL) or reduction of area (%RA). Stiffness in shear follows from E and Poisson's ratio, $G = \frac{E}{2(1 + \nu)}$.`,
        r`| Hardness test | Indenter | Note |
|---|---|---|
| Brinell (HB) | 10 mm ball | steel's TS ≈ 3.45 HB MPa |
| Rockwell (HRB, HRC) | ball or diamond cone | fast, read directly |
| Vickers (HV) | diamond pyramid, 136° | one continuous scale, the most accurate |
| Knoop (HK) | elongated diamond | thin layers, brittle materials |`,
        r`Metals are strengthened by finer grains (Hall–Petch), alloying (solid solution), cold work and precipitates, all of which block dislocations. They fail by fracture from cracks ($K_{Ic} = Y\sigma\sqrt{\pi a}$), by **fatigue** under repeated stress, and by **creep** under load at high temperature, both below the yield strength.`,
      ],
      keyIdeas: [
        r`Engineering vs true: $\sigma_T = \sigma(1 + \varepsilon)$, $\varepsilon_T = \ln(1 + \varepsilon)$; $\sigma_T = K\varepsilon_T^n$, necking at $\varepsilon_T = n$.`,
        r`Resilience $\frac{\sigma_y^2}{2E}$; toughness is the whole area under the curve; ductility %EL and %RA; $G = \frac{E}{2(1 + \nu)}$.`,
        r`Brinell $HB$; for steels $TS \approx 3.45\,HB$ MPa. Hall-Petch $\sigma_y = \sigma_0 + k_yd^{-1/2}$.`,
        r`Fracture: $K_{Ic} = Y\sigma\sqrt{\pi a}$. Fatigue and creep cause failure below the yield strength.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Brinell and a crack',
          problem: r`A 3000 kgf load on a 10 mm ball leaves a 4.0 mm dent in steel. Find HB and the tensile strength. What stress breaks a plate ($K_{Ic} = 26$ MPa√m, $Y = 1$) with a 4 mm interior crack?`,
          steps: [
            r`$HB = \frac{2 \times 3000}{\pi \times 10 \times (10 - \sqrt{84})} = 229$; $TS \approx 3.45 \times 229 = 789$ MPa.`,
            r`$a = 2$ mm: $\sigma_c = \frac{26}{\sqrt{\pi \times 0.002}} = 328$ MPa.`,
          ],
          answer: r`HB 229, about 789 MPa; 328 MPa.`,
        },
        {
          level: 'board',
          title: 'Shear modulus and true stress',
          problem: r`Steel has E = 207 GPa and ν = 0.30: find G. At an engineering stress of 400 MPa and strain of 0.20 (before necking), find the true stress and true strain.`,
          steps: [
            r`$G = \frac{207}{2 \times 1.30} = 79.6$ GPa.`,
            r`$\sigma_T = 400 \times 1.20 = 480$ MPa; $\varepsilon_T = \ln1.20 = 0.182$.`,
          ],
          answer: r`79.6 GPa; 480 MPa and 0.182.`,
        },
      ],
      traps: [
        r`An interior crack's $a$ is HALF its length.`,
        r`Toughness (energy to fracture) is not hardness (resistance to indenting) or strength.`,
      ],
      check: [
        { q: r`Which hardness test uses a 136° diamond pyramid?`, a: r`Vickers.` },
        { q: r`What property is the energy a metal absorbs before it fractures?`, a: r`Toughness.` },
      ],
    },
    {
      name: 'Alloys and Phase Diagrams',
      inShort: r`Which phases an alloy holds, in what amounts, and the iron-carbon diagram behind steel.`,
      body: [
        r`A **phase diagram** maps which phases are stable at each composition and temperature. Copper and nickel dissolve completely, so their diagram is a simple lens: liquid above the **liquidus**, solid α below the **solidus**, and both between. At a point in the lens, the **tie line** through it gives each phase's composition, and the **lever rule** their amounts:`,
        {
          type: 'plot',
          alt: 'A schematic copper-nickel phase diagram, temperature against nickel content from 0 to 100 percent: the liquidus above and solidus below meet at 1085 degrees for copper and 1455 for nickel; a dashed tie line at 1250 degrees runs from liquid of 31.5 percent nickel to solid of 42.5 percent, through an alloy of 35 percent.',
          caption: 'A schematic Cu–Ni diagram: at 1250 °C the 35% Ni alloy splits into liquid of 31.5% and α of 42.5% (dashed tie line).',
          x: [0, 100],
          y: [1000, 1500],
          xLabel: 'wt% Ni',
          yLabel: 'T (°C)',
          series: [
            { f: liquidus, label: 'liquidus' },
            { f: solidus, label: 'solidus', colour: colourOf(1) },
            { points: [[31.5, 1250], [42.5, 1250]], label: 'tie line', dashed: true, colour: colourOf(2) },
          ],
          legend: false,
          marks: [{ x: 35, label: '35%' }],
        },
        r`The iron–carbon diagram is the basis of steel. Below 727 °C, austenite (γ) of the **eutectoid** composition, 0.76% C, becomes **pearlite**, layers of ferrite (α) and cementite (Fe₃C, 6.70% C). Below 0.76% the steel also holds proeutectoid ferrite; above it, proeutectoid cementite.

| Steel | Carbon | Uses |
|---|---|---|
| Low carbon (mild) | below 0.25% | sheet, wire, structural shapes |
| Medium carbon | 0.25–0.60% | axles, gears, shafts (heat-treated) |
| High carbon | 0.60–1.4% | tools, dies, springs, cutting edges |
| Cast iron | above 2.14% | castings |`,
        r`Alloying elements tune steel: **Ni** adds toughness and corrosion resistance; **Cr** hardness and (above about 11%) stainlessness; **Mo** high-temperature strength; **Cu** resistance to atmospheric corrosion; **Ti** fixes carbon in inert particles; **Al** deoxidises the melt; **Mn** ties up sulfur, which otherwise makes steel crack when hot (**red shortness**). Quenching makes martensite, hard and brittle; tempering restores toughness.`,
      ],
      keyIdeas: [
        r`Tie line and lever rule: $W_L = \frac{C_\alpha - C_0}{C_\alpha - C_L}$, $W_\alpha = \frac{C_0 - C_L}{C_\alpha - C_L}$.`,
        r`Phase rule $P + F = C + N$. Invariant points: eutectic (L → α + β), eutectoid (γ → α + Fe₃C).`,
        r`Fe–Fe₃C: eutectoid 0.76% C at 727 °C, eutectic 4.30% C at 1147 °C; steel below 2.14% C.`,
        r`Heat treatment: quenching gives martensite (hard, brittle); tempering restores toughness.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A tie line and a hypoeutectoid steel',
          problem: r`A Cu–35 wt% Ni alloy at 1250 °C lies between liquid of 31.5% Ni and α of 42.5% Ni. Find the phase fractions. How much pearlite does a 0.40 wt% C steel have just below 727 °C?`,
          steps: [
            r`$W_L = \frac{42.5 - 35}{42.5 - 31.5} = 0.68$, $W_\alpha = 0.32$.`,
            r`Pearlite $= \frac{0.40 - 0.022}{0.76 - 0.022} = 0.51$; the rest, 0.49, is proeutectoid ferrite.`,
          ],
          answer: r`0.68 liquid, 0.32 α; 0.51 pearlite.`,
        },
        {
          level: 'board',
          title: 'A hypereutectoid steel',
          problem: r`A 1.0 wt% C steel cools slowly to just below 727 °C. Find its proeutectoid cementite and pearlite fractions.`,
          steps: [
            r`Cementite $= \frac{1.0 - 0.76}{6.70 - 0.76} = 0.040$.`,
            r`Pearlite $= 1 - 0.040 = 0.960$.`,
          ],
          answer: r`0.040 cementite; 0.960 pearlite.`,
        },
      ],
      traps: [
        r`The lever arm for a phase is on the OPPOSITE side of the tie line.`,
        r`Sulfur causes red shortness; phosphorus causes cold shortness.`,
      ],
      check: [
        { q: r`What is the eutectoid composition of plain-carbon steel?`, a: r`0.76 wt% C, at 727 °C.` },
        { q: r`Which steels suit axles and gears needing medium to high hardness?`, a: r`Medium-carbon steels.` },
      ],
    },
    {
      name: 'Ceramics',
      inShort: r`Ionic and covalent compounds: hard, heat-resistant, insulating and brittle.`,
      body: [
        r`Ceramics are compounds of metals with nonmetals (oxides, carbides, nitrides, silicates), held by ionic and covalent bonds. Their structure is set by charge balance and by how many anions fit around each cation, which the **radius ratio** decides:

| $\frac{r_C}{r_A}$ | Coordination | Arrangement |
|---|---|---|
| 0.155–0.225 | 3 | triangular |
| 0.225–0.414 | 4 | tetrahedral |
| 0.414–0.732 | 6 | octahedral (rock salt) |
| 0.732–1.0 | 8 | cubic (CsCl) |`,
        r`With no dislocation motion to relieve stress, ceramics are hard, stiff, heat-resistant, chemically stable and brittle: strong in compression but weak in tension, where pores and surface flaws start cracks. Their strength is measured in bending, $\sigma_{fs} = \frac{3F_fL}{2bd^2}$. **Glass** is an amorphous ceramic with no melting point, softening gradually; most ceramics are excellent insulators, and **cement** and **concrete** are ceramics too.`,
      ],
      keyIdeas: [
        r`Radius ratio $\frac{r_C}{r_A}$ sets the coordination: 0.225–0.414 → 4, 0.414–0.732 → 6, 0.732–1 → 8.`,
        r`Density by formula units: $\rho = \frac{n'(\sum A_C + \sum A_A)}{V_CN_A}$.`,
        r`Flexural strength $\frac{3F_fL}{2bd^2}$; strong in compression, weak in tension; pores lower both $E$ and strength.`,
        r`Glasses soften gradually (no melting point); most ceramics are excellent insulators.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Rock salt',
          problem: r`NaCl: $r_{Na^+} = 0.102$, $r_{Cl^-} = 0.181$ nm. Find its coordination number and theoretical density (rock salt, 4 formula units per cell).`,
          steps: [
            r`$\frac{0.102}{0.181} = 0.56$: coordination 6.`,
            r`$a = 2 \times 0.283 = 0.566$ nm; $\rho = \frac{4 \times (22.99 + 35.45)}{(5.66 \times 10^{-8})^3 \times 6.022 \times 10^{23}} = 2.14$ g/cm³.`,
          ],
          answer: r`6; 2.14 g/cm³.`,
        },
        {
          level: 'board',
          title: 'A bend test and magnesia',
          problem: r`A ceramic bar 10 mm wide and 5 mm deep, on supports 40 mm apart, breaks under a central 800 N load. Find its flexural strength. What coordination does MgO take ($r_{Mg^{2+}} = 0.072$, $r_{O^{2-}} = 0.140$ nm)?`,
          steps: [
            r`$\sigma = \frac{3 \times 800 \times 40}{2 \times 10 \times 5^2} = 192$ MPa.`,
            r`$\frac{0.072}{0.140} = 0.51$: coordination 6, the rock-salt structure.`,
          ],
          answer: r`192 MPa; 6.`,
        },
      ],
      traps: [
        r`Rock salt's ions touch along the cube EDGE: $a = 2(r_C + r_A)$.`,
        r`Use d squared in the bend formula: depth matters more than width.`,
      ],
      check: [
        { q: r`Why is glass called amorphous?`, a: r`It has no long-range crystal structure.` },
        { q: r`Are ceramics stronger in tension or compression?`, a: r`Compression.` },
      ],
    },
    {
      name: 'Polymers',
      inShort: r`Long-chain molecules: thermoplastics, thermosets and elastomers.`,
      body: [
        r`Polymers are long chains of repeating **mers**: the number per chain is the **degree of polymerization**. Chains can be linear, branched or **cross-linked**; **thermoplastics** (polyethylene, PVC) soften when hot and can be remelted, **thermosets** (epoxy, phenolics) cross-link permanently and char instead, and **elastomers** (rubber) are lightly cross-linked so they stretch and spring back. **Vulcanization** cross-links rubber with sulfur.`,
        r`Chains can fold into ordered regions, so a polymer is partly **crystalline**; the more crystalline, the denser, stiffer and stronger. Its crystallinity follows from its density between the fully amorphous and fully crystalline values:`,
        {
          type: 'plot',
          alt: 'Percent crystallinity of polyethylene against its density, from 0 at the amorphous density of 0.870 to 100 percent at the crystalline 0.998 grams per cubic centimetre, slightly curved; a 0.925 sample is 46 percent crystalline.',
          caption: 'Polyethylene’s crystallinity from its density: 0.925 g/cm³ is about 46% crystalline.',
          x: [0.87, 1],
          y: [0, 1],
          xLabel: 'density (g/cm³)',
          yLabel: 'crystalline fraction',
          series: [{ f: (rho) => (0.998 * (rho - 0.87)) / (rho * (0.998 - 0.87)), label: 'crystallinity', area: true }],
          marks: [{ x: 0.925, label: '0.925' }],
        },
        r`Polymers are **viscoelastic**: held at a fixed strain their stress relaxes, $\sigma(t) = \sigma_0e^{-t/\tau}$. Below the **glass transition** $T_g$ they are glassy and brittle; above it, rubbery.`,
      ],
      keyIdeas: [
        r`Molecular weight is an average: $\bar M_n = \sum x_iM_i$, $\bar M_w = \sum w_iM_i$; degree of polymerization $\frac{\bar M_n}{m}$.`,
        r`Crystallinity $\frac{\rho_c(\rho_s - \rho_a)}{\rho_s(\rho_c - \rho_a)}$: more crystalline means denser, stiffer and stronger.`,
        r`Thermoplastics soften on heating and can be recycled; thermosets cross-link and char instead.`,
        r`Viscoelastic: stress relaxes, $\sigma(t) = \sigma_0e^{-t/\tau}$; glassy below $T_g$, rubbery above.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Polyethylene's crystallinity",
          problem: r`Polyethylene of density 0.925 g/cm³ ($\rho_c = 0.998$, $\rho_a = 0.870$): find its percent crystallinity.`,
          steps: [r`$\frac{0.998 \times (0.925 - 0.870)}{0.925 \times (0.998 - 0.870)} = 46.4\%$.`],
          answer: r`46.4%.`,
        },
        {
          level: 'board',
          title: 'PVC chains and a relaxing band',
          problem: r`PVC (mer C₂H₃Cl, 62.49 g/mol) has $\bar M_n$ = 105 000 g/mol: find its degree of polymerization. A rubber band held stretched starts at 5 MPa and relaxes with τ = 50 days: what stress remains after 30 days?`,
          steps: [
            r`$\frac{105\,000}{62.49} = 1680$.`,
            r`$5e^{-30/50} = 2.74$ MPa.`,
          ],
          answer: r`1680; 2.74 MPa.`,
        },
      ],
      traps: [
        r`Crystallinity is a MASS fraction: don't use the plain density ratio.`,
        r`Thermosets can't be remelted for recycling; thermoplastics can.`,
      ],
      check: [
        { q: r`What process cross-links raw rubber with sulfur?`, a: r`Vulcanization.` },
        { q: r`What is the ratio of a polymer's molecular weight to its mer's called?`, a: r`The degree of polymerization.` },
      ],
    },
    {
      name: 'Composites',
      inShort: r`Two materials combined: fibres for strength and stiffness, a matrix to hold them.`,
      body: [
        r`A composite puts a strong, stiff **reinforcement** (fibres or particles) in a tougher **matrix** that holds it and passes the load: glass or carbon fibre in polymer, steel bars in concrete. Along the fibres both parts stretch together (**isostrain**), so the stiffness is the volume-weighted mean; across them they carry the same stress (**isostress**), and the soft matrix dominates:`,
        {
          type: 'plot',
          alt: 'The modulus of glass-fibre polyester against fibre volume fraction from 0 to 1: along the fibres a straight line from 3.4 to 69 gigapascals; across them, dashed, a curve that stays near the matrix value until the fibres are nearly all; at 40 percent fibre, 29.6 and 5.5 gigapascals.',
          caption: 'Glass fibre in polyester: along the fibres (solid) a straight mix; across (dashed) barely above the matrix. 40% fibre: 29.6 and 5.5 GPa.',
          x: [0, 1],
          y: [0, 75],
          xLabel: 'fibre volume fraction',
          yLabel: 'E (GPa)',
          series: [
            { f: (v) => 3.4 * (1 - v) + 69 * v, label: 'along' },
            { f: (v) => (3.4 * 69) / ((1 - v) * 69 + v * 3.4), label: 'across', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 0.4, label: '40%' }],
        },
        r`Short fibres only carry full load if they're longer than a **critical length**, $l_c = \frac{\sigma_f^*d}{2\tau_c}$, set by how well the matrix grips them; beyond about $15l_c$ they act as continuous.`,
      ],
      keyIdeas: [
        r`Along the fibres (isostrain): $E_{cl} = E_mV_m + E_fV_f$; across (isostress): $E_{ct} = \frac{E_mE_f}{V_mE_f + V_fE_m}$.`,
        r`Load share $\frac{F_f}{F_m} = \frac{E_fV_f}{E_mV_m}$; strength $\sigma'_m(1 - V_f) + \sigma^*_fV_f$.`,
        r`Fibres must exceed $l_c = \frac{\sigma_f^*d}{2\tau_c}$; beyond about $15l_c$ they act as continuous.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Glass-fibre polyester',
          problem: r`40 vol% glass fibre ($E = 69$ GPa) in polyester ($E = 3.4$ GPa). Find the modulus along and across the fibres, and the fibres' share of a longitudinal load.`,
          steps: [
            r`$E_{cl} = 3.4 \times 0.6 + 69 \times 0.4 = 29.6$ GPa.`,
            r`$E_{ct} = \frac{3.4 \times 69}{0.6 \times 69 + 0.4 \times 3.4} = 5.5$ GPa.`,
            r`$\frac{F_f}{F_m} = \frac{27.6}{2.04} = 13.5$, so fibres carry 93%.`,
          ],
          answer: r`29.6 GPa; 5.5 GPa; 93%.`,
        },
        {
          level: 'board',
          title: 'Critical length and strength',
          problem: r`Carbon fibres of 10 µm diameter and 3500 MPa strength sit in an epoxy that grips them at 50 MPa. Find the critical length. For 40% continuous fibres, with the matrix at 30 MPa when they fail, find the composite's strength.`,
          steps: [
            r`$l_c = \frac{3500 \times 0.010}{2 \times 50} = 0.35$ mm.`,
            r`$\sigma = 30 \times 0.6 + 3500 \times 0.4 = 1418$ MPa.`,
          ],
          answer: r`0.35 mm; 1418 MPa.`,
        },
      ],
      traps: [
        r`Across the fibres the composite is barely stiffer than the matrix.`,
        r`Fibres shorter than $l_c$ never reach their full strength.`,
      ],
      check: [
        { q: r`Which direction of a fibre composite follows the rule of mixtures?`, a: r`Along the fibres (isostrain).` },
        { q: r`What does the matrix do in a composite?`, a: r`Holds the fibres, passes them the load and protects them.` },
      ],
    },
    {
      name: 'Electrical Properties',
      inShort: r`Conductors, semiconductors and insulators, explained by bands and charge carriers.`,
      body: [
        r`Electrons in a solid occupy **bands**. In a metal the highest band is only partly filled, so electrons move freely: a conductor, $\sigma = n|e|\mu$. In semiconductors and insulators a filled valence band is separated from an empty conduction band by a **gap**: small in a semiconductor (Si 1.12 eV, Ge 0.67, GaAs 1.42), large in an insulator (above about 4 eV). Heat lifts electrons across a small gap, leaving holes, so an intrinsic semiconductor conducts better hot, steeply:`,
        {
          type: 'plot',
          alt: 'The base-ten logarithm of intrinsic silicon conductivity against temperature from 250 to 500 kelvin: rising steeply, from about minus 5.5 at 250 kelvin through minus 3.5 at room temperature to about plus 0.6 at 500 kelvin.',
          caption: 'Intrinsic silicon: conductivity climbs about ten-thousandfold from 300 K to 500 K.',
          x: [250, 500],
          y: [-6, 1],
          xLabel: 'T (K)',
          yLabel: 'log of conductivity',
          series: [{ f: (t) => Math.log10(siSigma(t)), label: 'silicon' }],
          marks: [{ x: 300, label: '300 K' }],
        },
        r`A metal does the opposite: its resistivity rises with temperature, impurities and cold work, which add up (**Matthiessen's rule**). **Doping** sets a semiconductor's conductivity regardless of temperature: donors (P, As) make it n-type, acceptors (B, Al) p-type. The **Hall effect** tells which: $R_H = \frac{1}{n|e|}$, negative for electrons.`,
      ],
      keyIdeas: [
        r`$\sigma = n|e|\mu_e + p|e|\mu_h$; conductors have no gap, semiconductors a small one (Si 1.12 eV), insulators a large one.`,
        r`Metals: $\rho = \rho_t + \rho_i + \rho_d$ (Matthiessen), rising with temperature, impurities and cold work.`,
        r`Intrinsic semiconductors conduct better when hot. Doping: n-type (P, As donors), p-type (B, Al acceptors).`,
        r`Hall effect $R_H = \frac{1}{n|e|}$: the sign gives the carrier type.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Intrinsic and doped silicon',
          problem: r`Find the conductivity of intrinsic silicon ($n_i = 10^{16}$ m⁻³, $\mu_e = 0.14$, $\mu_h = 0.05$ m²/V·s), and of silicon with $10^{22}$ m⁻³ phosphorus (take $\mu_e = 0.14$).`,
          steps: [
            r`Intrinsic: $10^{16} \times 1.602 \times 10^{-19} \times 0.19 = 3.0 \times 10^{-4}$ (Ω·m)⁻¹.`,
            r`Doped: $10^{22} \times 1.602 \times 10^{-19} \times 0.14 = 224$ (Ω·m)⁻¹, almost a million times higher.`,
          ],
          answer: r`$3.0 \times 10^{-4}$; 224 (Ω·m)⁻¹.`,
        },
        {
          level: 'board',
          title: "Electrons in copper",
          problem: r`Copper has $\sigma = 5.96 \times 10^7$ (Ω·m)⁻¹ and $8.49 \times 10^{28}$ free electrons per m³. Find their mobility and the Hall coefficient.`,
          steps: [
            r`$\mu = \frac{\sigma}{n|e|} = \frac{5.96 \times 10^7}{8.49 \times 10^{28} \times 1.602 \times 10^{-19}} = 4.38 \times 10^{-3}$ m²/V·s.`,
            r`$R_H = -\frac{1}{n|e|} = -7.35 \times 10^{-11}$ m³/C (negative: electrons).`,
          ],
          answer: r`$4.38 \times 10^{-3}$ m²/V·s; $-7.35 \times 10^{-11}$ m³/C.`,
        },
      ],
      traps: [
        r`In an extrinsic semiconductor count only the majority carriers: $n \approx N_d$.`,
        r`Copper's electrons are far more numerous than silicon's but much LESS mobile.`,
      ],
      check: [
        { q: r`Which dopants make silicon n-type?`, a: r`Group V donors such as phosphorus and arsenic.` },
        { q: r`What happens to a metal's resistivity when it is cold-worked?`, a: r`It rises a little (the deformation term of Matthiessen's rule).` },
      ],
    },
    {
      name: 'Dielectric and Magnetic Properties',
      inShort: r`Insulators in electric fields, and how materials respond to magnetic fields.`,
      body: [
        r`In a field, an insulator's charges shift slightly (**polarization**), which raises a capacitor's capacitance by the **dielectric constant** $\varepsilon_r$, until at its **dielectric strength** it breaks down.`,
        r`Magnetically, most materials barely respond: **diamagnetic** ones weakly oppose a field, **paramagnetic** ones weakly follow it. **Ferromagnetic** iron, nickel and cobalt, and **ferrimagnetic** ferrites, align in domains and magnetize strongly, up to saturation, losing it above the **Curie temperature**. Driven back and forth they trace a **hysteresis loop**; its area is the energy lost each cycle. Soft magnets, with narrow loops, suit transformer and motor cores; hard magnets, with wide loops, make permanent magnets:`,
        {
          type: 'plot',
          alt: 'Hysteresis loops of flux density against field strength in relative units: a soft magnetic material, solid, with a narrow loop that saturates quickly; a hard magnetic material, dashed, with a wide loop that keeps a large flux at zero field and needs a large reverse field to demagnetize.',
          caption: 'Soft (solid) and hard (dashed) magnetic materials: the soft loop is narrow and loses little energy per cycle.',
          x: [-1.5, 1.5],
          y: [-1.3, 1.3],
          xLabel: 'H (relative)',
          yLabel: 'B (relative)',
          series: [
            { points: loop(0.05, 0.12), label: 'soft' },
            { points: loop(0.6, 0.25), label: 'hard', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
      ],
      keyIdeas: [
        r`$\varepsilon_r = \frac{C}{C_0}$; $P = \varepsilon_0(\varepsilon_r - 1)\mathscr{E}$; breakdown voltage $= \mathscr{E}_{ds} \times$ thickness.`,
        r`$B = \mu_0(H + M)$, $M = \chi_mH$, $\mu_r = 1 + \chi_m$. Dia-, para- and ferromagnetism; ferrites are ferrimagnetic.`,
        r`$M_s = n_BN\mu_B$; above the Curie temperature ferromagnetism disappears.`,
        r`Soft magnets (narrow loops, low hysteresis loss $k_hfB_{max}^{1.6}V$) for transformer cores; hard magnets for permanent magnets.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Nickel's saturation",
          problem: r`Nickel ($\rho = 8.90$ g/cm³, $A = 58.69$) has 0.60 Bohr magnetons per atom. Find its saturation magnetization and flux density.`,
          steps: [
            r`$N = \frac{8.90 \times 10^6 \times 6.022 \times 10^{23}}{58.69} = 9.13 \times 10^{28}$ m⁻³.`,
            r`$M_s = 0.60 \times 9.13 \times 10^{28} \times 9.27 \times 10^{-24} = 5.1 \times 10^5$ A/m; $B_s = \mu_0M_s = 0.64$ T.`,
          ],
          answer: r`$5.1 \times 10^5$ A/m; 0.64 T.`,
        },
        {
          level: 'board',
          title: 'A capacitor with a dielectric',
          problem: r`Plates of 6.45 × 10⁻⁴ m² sit 2 mm apart. Find the capacitance in vacuum and with a dielectric of $\varepsilon_r = 6$ between them, and the polarization at 10 V.`,
          steps: [
            r`$C_0 = \frac{8.85 \times 10^{-12} \times 6.45 \times 10^{-4}}{0.002} = 2.85 \times 10^{-12}$ F; with the dielectric, $1.71 \times 10^{-11}$ F.`,
            r`$P = 8.85 \times 10^{-12} \times 5 \times \frac{10}{0.002} = 2.21 \times 10^{-7}$ C/m².`,
          ],
          answer: r`2.85 pF and 17.1 pF; $2.21 \times 10^{-7}$ C/m².`,
        },
      ],
      traps: [
        r`Hysteresis loss is the loop's area per cycle: it grows with frequency.`,
        r`Ferrites are FERRImagnetic: opposed but unequal moments.`,
      ],
      check: [
        { q: r`Which kind of magnetic material suits a transformer core?`, a: r`A soft one, with a narrow hysteresis loop.` },
        { q: r`What happens to a ferromagnet above its Curie temperature?`, a: r`It becomes paramagnetic.` },
      ],
    },
    {
      name: 'Optical and Thermal Properties',
      inShort: r`How materials reflect, absorb and pass light, and store, conduct and expand with heat.`,
      body: [
        r`Light meeting a material is reflected, absorbed or transmitted, $R + A + T = 1$. Metals reflect and absorb almost everything; glasses pass visible light; semiconductors absorb photons above their gap. At an interface, normal reflectivity is $\left(\frac{n_2 - n_1}{n_2 + n_1}\right)^2$.`,
        r`A solid stores heat in its lattice vibrations. Cold, its heat capacity is small and climbs steeply; warm, it levels off at about $3R \approx 25$ J/(mol·K) (Dulong and Petit), as Einstein's model shows:`,
        {
          type: 'plot',
          alt: 'Molar heat capacity of a solid against temperature as a fraction of its characteristic temperature, from 0 to 1.5: near zero when cold, rising in an S-curve, and levelling toward the dashed 3R line of about 25 joules per mole kelvin.',
          caption: 'Heat capacity of a solid (Einstein’s model): near zero cold, levelling at 3R ≈ 25 J/(mol·K) (dashed).',
          x: [0, 1.5],
          y: [0, 30],
          xLabel: 'T / θ',
          yLabel: 'C (J/mol·K)',
          series: [
            { f: einstein, label: 'C' },
            { f: () => 3 * 8.314, label: '3R', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`Heating expands a solid, $\frac{\Delta L}{L} = \alpha\Delta T$, and if it is held, makes a thermal stress $E\alpha\Delta T$. Metals conduct heat mainly by their free electrons, so good electrical conductors conduct heat well (**Wiedemann–Franz**); ceramics and polymers conduct poorly.`,
      ],
      keyIdeas: [
        r`Normal reflectivity $R = \left(\frac{n_2 - n_1}{n_2 + n_1}\right)^2$; slab $I_T = I_0(1 - R)^2e^{-\beta l}$; $R + A + T = 1$.`,
        r`Heat capacity rises as $T^3$ when cold and levels at $3R \approx 25$ J/(mol·K).`,
        r`Metals: $\frac{k}{\sigma T} \approx 2.44 \times 10^{-8}$ (Wiedemann-Franz).`,
        r`Expansion $\frac{\Delta L}{L} = \alpha\Delta T$; held, $\sigma = E\alpha\Delta T$. Thermal shock resistance $\frac{\sigma_fk}{E\alpha_l}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A glass plate and copper',
          problem: r`What fraction of light passes through a 10 mm glass plate ($n = 1.5$, $\beta = 10$ m⁻¹)? Estimate copper's thermal conductivity from $\sigma = 5.96 \times 10^7$ (Ω·m)⁻¹ at 300 K.`,
          steps: [
            r`$R = \left(\frac{0.5}{2.5}\right)^2 = 0.04$; $T = 0.96^2e^{-0.1} = 83.4\%$.`,
            r`$k = 2.44 \times 10^{-8} \times 5.96 \times 10^7 \times 300 = 436$ W/(m·K) (measured 398).`,
          ],
          answer: r`83.4%; about 436 W/(m·K).`,
        },
        {
          level: 'board',
          title: 'A heated aluminium rod',
          problem: r`A 0.35 m aluminium rod ($\alpha = 23.6 \times 10^{-6}$/°C, E = 69 GPa) is heated from 15 °C to 85 °C. How much does it grow if free? What stress builds if its ends are held?`,
          steps: [
            r`$\Delta L = 23.6 \times 10^{-6} \times 350 \times 70 = 0.578$ mm.`,
            r`$\sigma = 69\,000 \times 23.6 \times 10^{-6} \times 70 = 114$ MPa, compressive.`,
          ],
          answer: r`0.578 mm; 114 MPa compression.`,
        },
      ],
      traps: [
        r`Light is reflected at BOTH faces of a slab: $(1 - R)^2$.`,
        r`Thermal stress doesn't depend on the rod's length.`,
      ],
      check: [
        { q: r`What value does a solid's molar heat capacity approach when warm?`, a: r`About 3R, 25 J/(mol·K).` },
        { q: r`Why do metals conduct heat well?`, a: r`Their free electrons carry it.` },
      ],
    },
    {
      name: 'Corrosion',
      inShort: r`Metals oxidising back to their ores: electrochemistry, rates and prevention.`,
      body: [
        r`Most metals are refined from ores (aluminium from **bauxite**, zinc from **sphalerite**, iron from hematite and magnetite), and corrosion is their slow return. It is electrochemical: metal oxidises at an anode, something is reduced at a cathode (hydrogen in acid, oxygen in air and water), and both reactions must run at the same rate. Each follows a **Tafel** line of potential against the log of current density; where they cross is the corrosion potential and current:`,
        {
          type: 'plot',
          alt: 'Potential against current density on a log scale for iron in acid: the iron oxidation line rising from minus 0.44 volts and the hydrogen reduction line falling from 0 volts cross at about minus 0.24 volts and 2.4 times ten to the minus 4 amperes per square centimetre, the corrosion current.',
          caption: 'Iron in acid: its oxidation line (solid) and hydrogen’s reduction line (dashed) cross at the corrosion current, 2.4 × 10⁻⁴ A/cm².',
          x: [1e-8, 1e-1],
          logX: true,
          y: [-0.6, 0.2],
          xLabel: 'current density (A/cm²)',
          yLabel: 'E (V)',
          series: [
            { f: ironLine, label: 'iron' },
            { f: hydrogenLine, label: 'hydrogen', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 10 ** (-0.58 / 0.16), label: 'crossing' }],
        },
        r`Corrosion takes many forms: uniform, **galvanic** (two metals in contact), crevice, **pitting**, intergranular, erosion and **stress corrosion**. It's prevented by choosing and pairing metals well, coatings and paint, **cathodic protection** (sacrificial zinc or magnesium anodes, or an impressed current), inhibitors, and design that sheds water.`,
      ],
      keyIdeas: [
        r`Corrosion needs an anode, a cathode, an electrolyte and a conducting path. The more active metal in a galvanic pair corrodes.`,
        r`Rate from current density: $r = \frac{i}{nF}$; penetration $\frac{iM}{nF\rho}$.`,
        r`Tafel $\eta = \pm\beta\log\frac{i}{i_0}$: the oxidation and reduction lines cross at the corrosion current.`,
        r`Forms: uniform, galvanic, crevice, pitting, intergranular, stress corrosion. Prevention: coatings, cathodic protection, inhibitors, design.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A penetration rate',
          problem: r`A corrosion current of 1 A/m² attacks iron ($n = 2$, $M = 55.85$ g/mol, $\rho = 7870$ kg/m³). Find the penetration rate in mm/yr.`,
          steps: [r`$CPR = \frac{1 \times 0.05585}{2 \times 96\,485 \times 7870} = 3.68 \times 10^{-11}$ m/s $\times 3.156 \times 10^{10} = 1.16$ mm/yr.`],
          answer: r`1.16 mm/yr.`,
        },
        {
          level: 'board',
          title: 'Where the Tafel lines cross',
          problem: r`Iron's oxidation line is $E = -0.44 + 0.06\log\frac{i}{10^{-7}}$ and hydrogen's reduction line $E = -0.10\log\frac{i}{10^{-6}}$ (V, A/cm²). Find the corrosion current density and potential.`,
          steps: [
            r`Setting them equal with $L = \log i$: $-0.44 + 0.06(L + 7) = -0.10(L + 6)$, so $0.16L = -0.58$ and $L = -3.625$.`,
            r`$i_{corr} = 10^{-3.625} = 2.4 \times 10^{-4}$ A/cm²; $E_{corr} = -0.10 \times 2.375 = -0.24$ V.`,
          ],
          answer: r`$2.4 \times 10^{-4}$ A/cm²; −0.24 V.`,
        },
      ],
      traps: [
        r`A small anode with a large cathode corrodes fastest: never pair them that way.`,
        r`In cathodic protection the sacrificial anode corrodes, by design.`,
      ],
      check: [
        { q: r`From which ore is aluminium obtained?`, a: r`Bauxite.` },
        { q: r`What protects a buried steel pipe with zinc or magnesium blocks?`, a: r`Cathodic protection with sacrificial anodes.` },
      ],
    },
    {
      name: 'Economic, Environmental and Societal Issues',
      inShort: r`Choosing materials for cost, weight and the environment over their whole life.`,
      body: [
        r`Choosing a material means meeting the job at the least cost, mass or environmental burden. For each kind of part, a **performance index** combines the properties that matter (Ashby):

| Part | Minimise mass by maximising |
|---|---|
| Tie in tension (strength) | $\frac{\sigma_y}{\rho}$ |
| Tie in tension (stiffness) | $\frac{E}{\rho}$ |
| Beam in bending (stiffness) | $\frac{E^{1/2}}{\rho}$ |
| Beam in bending (strength) | $\frac{\sigma_y^{2/3}}{\rho}$ |
| Plate in bending (stiffness) | $\frac{E^{1/3}}{\rho}$ |`,
        r`Divide by the cost per kilogram as well to find the cheapest. Over a product's **life cycle**, extraction, processing, use and disposal all count: recycling aluminium saves about 95% of the energy of making it new, and designing for disassembly makes recycling possible.`,
      ],
      keyIdeas: [
        r`Lightest tie for a load: minimise $\frac{\rho}{\sigma_y}$; cheapest: $\frac{\bar c\rho}{\sigma_y}$; mass $m = \frac{NFL\rho}{\sigma_y}$.`,
        r`Performance indices (Ashby): $\frac{E}{\rho}$, $\frac{E^{1/2}}{\rho}$, $\frac{\sigma_y^{2/3}}{\rho}$ depending on shape and load.`,
        r`Life-cycle thinking: extraction, processing, use, and recycling or disposal. Recycling aluminium saves about 95% of the energy of making it new.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Steel or aluminium tie',
          problem: r`A 1 m tie carries 50 kN with a safety factor of 2. Compare the masses in steel ($\rho = 7850$, $\sigma_y = 250$ MPa) and aluminium ($\rho = 2700$, $\sigma_y = 255$ MPa).`,
          steps: [
            r`Steel: $\frac{2 \times 50\,000 \times 1 \times 7850}{250 \times 10^6} = 3.14$ kg.`,
            r`Aluminium: $\frac{2 \times 50\,000 \times 1 \times 2700}{255 \times 10^6} = 1.06$ kg, a third of the mass.`,
          ],
          answer: r`3.14 kg against 1.06 kg.`,
        },
        {
          level: 'board',
          title: 'And the cheaper one?',
          problem: r`If aluminium costs 3.5 times as much per kg as steel, which tie above is cheaper?`,
          steps: [
            r`In steel-kg units: steel $3.14 \times 1 = 3.14$; aluminium $1.06 \times 3.5 = 3.71$.`,
            r`Steel is cheaper; aluminium wins only where mass matters more than price.`,
          ],
          answer: r`Steel (3.14 against 3.71).`,
        },
      ],
      traps: [
        r`The lightest choice is not always the cheapest: include cost per kg.`,
        r`The index depends on the part's shape and load: a tie and a beam rank materials differently.`,
      ],
      check: [
        { q: r`Roughly how much energy does recycling aluminium save?`, a: r`About 95% of making it new.` },
        { q: r`Which index picks the lightest stiff tie?`, a: r`$\frac{E}{\rho}$, largest.` },
      ],
    },
  ],
};
