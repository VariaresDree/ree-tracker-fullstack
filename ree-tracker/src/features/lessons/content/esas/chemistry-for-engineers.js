// Library › Lessons › ESAS › Chemistry for Engineers
// (2026-11-17; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// chemistryLesson.test.js. Coverage and problem styles cross-checked against a
// review center's chemistry and environmental science handout; the text,
// problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order. Physics for Engineers
// covers photons, Bohr levels and radioactivity; Basic Thermodynamics the
// energy balances and cycles.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// First ionisation energies (eV) of hydrogen to calcium, from the standard tables.
const IONISATION = [
  13.6, 24.59, 5.39, 9.32, 8.3, 11.26, 14.53, 13.62, 17.42, 21.56,
  5.14, 7.65, 5.99, 8.15, 10.49, 10.36, 12.97, 15.76, 4.34, 6.11,
].map((e, i) => [i + 1, e]);

// 25 mL of 0.10 M acid titrated with 0.10 M NaOH: pH against base added (mL).
const PKA = 4.745; // acetic acid, Ka = 1.8e-5
const afterEquivalence = (v) => 14 + Math.log10((0.1 * v - 2.5) / (25 + v));
const strongPh = (v) => {
  if (v === 25) return 7;
  return v < 25 ? -Math.log10((2.5 - 0.1 * v) / (25 + v)) : afterEquivalence(v);
};
const weakPh = (v) => {
  if (v === 0) return -Math.log10(Math.sqrt(1.8e-5 * 0.1));
  if (v === 25) return 7 + 0.5 * (PKA + Math.log10(0.05));
  return v < 25 ? PKA + Math.log10(v / (25 - v)) : afterEquivalence(v);
};
const VOLUMES = Array.from({ length: 101 }, (_, i) => i / 2);

// A 41.0 V, 10.5 A panel: one-diode curve with its shape set (a = 2.33 V) so the best point is 340 W.
const PANEL = { voc: 41, isc: 10.5, a: 2.33 };
const panelI = (v) => PANEL.isc * (1 - Math.expm1(v / PANEL.a) / Math.expm1(PANEL.voc / PANEL.a));

// One mole of gas at 1 atm (Charles): litres at t °C.
const charlesV = (t) => (22.414 * (t + 273.15)) / 273.15;

// A typical hydrogen cell's voltage against current density (A/cm²): activation, resistance, mass transport.
const cellV = (i) => 1 - 0.03 * Math.log(i / 0.01) - 0.2 * i - 0.05 * Math.exp(4 * (i - 1.2));

// The 80 m wind turbine of the example (Cp 0.40), rated 2 MW, cut in at 3 m/s and out at 25 m/s.
const windMW = (v) => (v < 3 || v > 25 ? 0 : Math.min(2, (0.5 * 1.225 * Math.PI * 40 ** 2 * v ** 3 * 0.4) / 1e6));

// A reaction's energy along its path: products 40 kJ below reactants, over a hump.
const profile = (hump) => (x) => -40 / (1 + Math.exp(-(x - 0.5) / 0.06)) + hump * Math.exp(-(((x - 0.5) / 0.12) ** 2));

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
      body: [
        r`**Matter** is either a pure substance (an **element**, or a **compound** of elements in fixed proportion) or a **mixture** (homogeneous like a solution, or heterogeneous). An atom has Z **protons** (the atomic number) and N **neutrons** in its nucleus, and Z **electrons** around it when neutral; the **mass number** is $A = Z + N$. **Isotopes** share Z but differ in N, and the atomic mass on the table is their abundance-weighted mean.`,
        r`Each electron is described by four **quantum numbers**, and no two electrons in an atom share all four (**Pauli**):

| Number | Meaning | Values |
|---|---|---|
| n (principal) | shell and size | 1, 2, 3, … (shell holds $2n^2$) |
| l (azimuthal) | subshell shape: s, p, d, f | 0 to n − 1 |
| $m_l$ (magnetic) | orientation | −l to +l |
| $m_s$ (spin) | spin | +½ or −½ |`,
        r`Subshells fill in the order 1s 2s 2p 3s 3p 4s 3d 4p 5s… (s holds 2, p 6, d 10, f 14). Arranged by Z, the elements repeat their properties in **periods**: across a period atoms shrink and hold their electrons harder, so ionisation energy climbs to a peak at each noble gas, then drops at the next alkali metal:`,
        {
          type: 'plot',
          alt: 'First ionisation energy against atomic number from hydrogen to calcium: peaks at the noble gases helium, neon and argon, and sharp drops to the alkali metals lithium, sodium and potassium after each.',
          caption: 'First ionisation energy, hydrogen to calcium: a peak at each noble gas, a drop to the next alkali metal.',
          x: [0, 21],
          y: [0, 28],
          xLabel: 'atomic number Z',
          yLabel: 'energy (eV)',
          series: [{ points: IONISATION, label: 'ionisation energy' }],
          marks: [{ x: 2, label: 'He' }, { x: 10, label: 'Ne' }, { x: 18, label: 'Ar' }],
        },
        r`So metals (left) lose electrons easily, nonmetals (right) gain them, metalloids sit between, and the noble gases (group 18) barely react. Elements 57–71 are the lanthanides, 89–103 the actinides.`,
      ],
      keyIdeas: [
        r`Mass number $A = Z + N$; isotopes share $Z$. The atomic mass on the table is the abundance-weighted mean of the isotopes.`,
        r`Shell $n$ holds $2n^2$ electrons; subshells $s, p, d, f$ hold 2, 6, 10, 14, filled 1s 2s 2p 3s 3p 4s 3d 4p…`,
        r`Across a period atoms shrink and electronegativity and ionisation energy rise; down a group atoms grow and both fall.`,
        r`Hydrogen's lines: $\frac{1}{\lambda} = R_H\left(\frac{1}{n_1^2} - \frac{1}{n_2^2}\right)$, $R_H = 1.097 \times 10^7$ m⁻¹.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Isotopes and an ion',
          problem: r`Chlorine is 75.8% ³⁵Cl (34.97 u) and 24.2% ³⁷Cl (36.97 u). Find its atomic mass, and the protons, neutrons and electrons of the ion ³⁵Cl⁻.`,
          steps: [
            r`$0.758 \times 34.97 + 0.242 \times 36.97 = 35.45$ u.`,
            r`³⁵Cl⁻: 17 protons, $35 - 17 = 18$ neutrons, and $17 + 1 = 18$ electrons.`,
          ],
          answer: r`35.45 u; 17, 18, 18.`,
        },
        {
          level: 'board',
          title: 'A hydrogen line and a shell',
          problem: r`Find the wavelength of hydrogen's line from n = 3 to n = 2. How many electrons can the n = 4 shell hold?`,
          steps: [
            r`$\frac{1}{\lambda} = 1.097 \times 10^7\left(\frac14 - \frac19\right)$, so $\lambda = 656.3$ nm (red).`,
            r`$2n^2 = 2 \times 16 = 32$.`,
          ],
          answer: r`656.3 nm; 32.`,
        },
      ],
      traps: [
        r`A positive ion has LOST electrons: Fe³⁺ has $26 - 3 = 23$.`,
        r`4s fills before 3d, but 4s empties first when a transition metal ionises.`,
      ],
      check: [
        { q: r`Which principle says no two electrons share all four quantum numbers?`, a: r`The Pauli exclusion principle.` },
        { q: r`What are elements 57 to 71 called?`, a: r`The lanthanides (rare earths).` },
      ],
    },
    {
      name: 'Chemical Bonding',
      inShort: r`Ionic, covalent and metallic bonds, Lewis structures and molecular polarity.`,
      body: [
        r`Atoms bond to reach a stable outer shell. When one atom pulls far harder than the other, electrons transfer and the ions attract (**ionic**, NaCl); when the pull is similar they share pairs (**covalent**); metals pool their outer electrons in a shared sea (**metallic**), which is why they conduct. The difference in **electronegativity** sets where a bond falls; Pauling's estimate of its ionic share is $1 - e^{-\Delta EN^2/4}$:`,
        {
          type: 'plot',
          alt: 'Percent ionic character against electronegativity difference from 0 to 3.5: rising slowly from zero, passing about 4 percent at 0.4 and about 51 percent at 1.7, and approaching 95 percent at 3.5.',
          caption: 'Ionic share against electronegativity difference: nonpolar below 0.4, polar covalent to 1.7, ionic beyond.',
          x: [0, 3.5],
          y: [0, 1],
          xLabel: 'electronegativity difference',
          yLabel: 'ionic share',
          series: [{ f: (d) => 1 - Math.exp(-(d * d) / 4), label: 'ionic share', area: true }],
          marks: [{ x: 0.4, label: '0.4' }, { x: 1.7, label: '1.7' }],
        },
        r`A **Lewis structure** shows the shared and lone pairs; the best one keeps each **formal charge**, $V - N - \frac B2$, near zero. Polar bonds make a polar molecule only if the shape doesn't cancel them. An **oxidation number** counts the charge an atom would carry if every bond were ionic: O is −2, H +1, and they sum to the species' charge.`,
        r`| Naming ionic compounds | Example |
|---|---|
| Metal first, then the nonmetal with -ide | NaCl, sodium chloride |
| Variable metal, Stock system | FeCl₃, iron(III) chloride |
| Variable metal, classical: -ous lower, -ic higher | FeCl₂ ferrous, FeCl₃ ferric chloride |
| Two nonmetals: Greek prefixes | N₂O₅, dinitrogen pentoxide |
| Oxyacids: -ate becomes -ic, -ite becomes -ous | HNO₃ nitric, HNO₂ nitrous acid |`,
      ],
      keyIdeas: [
        r`$\Delta EN$ below 0.4: nonpolar covalent; 0.4 to 1.7: polar covalent; above 1.7: ionic.`,
        r`Formal charge $V - N - \frac{B}{2}$; the best Lewis structure keeps it near zero.`,
        r`Bond order $= \frac{\text{bonding} - \text{antibonding}}{2}$: N₂ 3, O₂ 2, He₂ 0.`,
        r`A molecule with polar bonds can still be nonpolar if it is symmetric (CO₂, CH₄, CCl₄).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Classifying bonds',
          problem: r`Classify the bonds in NaCl, O–H and C–H (Pauling EN: Na 0.93, Cl 3.16, H 2.20, O 3.44, C 2.55).`,
          steps: [
            r`NaCl: $3.16 - 0.93 = 2.23$, ionic.`,
            r`O–H: $3.44 - 2.20 = 1.24$, polar covalent.`,
            r`C–H: $2.55 - 2.20 = 0.35$, nonpolar covalent.`,
          ],
          answer: r`Ionic; polar covalent; nonpolar covalent.`,
        },
        {
          level: 'board',
          title: 'Ionic share and oxidation numbers',
          problem: r`Estimate the ionic share of the H–Cl bond. Find the oxidation number of nitrogen in NO₃⁻ and of chromium in Cr₂O₇²⁻.`,
          steps: [
            r`$\Delta EN = 3.16 - 2.20 = 0.96$: $1 - e^{-0.96^2/4} = 20.6\%$.`,
            r`NO₃⁻: $N + 3(-2) = -1$, so N = +5.`,
            r`Cr₂O₇²⁻: $2Cr + 7(-2) = -2$, so Cr = +6.`,
          ],
          answer: r`About 20.6%; +5; +6.`,
        },
      ],
      traps: [
        r`Water is polar because it is bent; CO₂ has polar bonds but is linear, so it is nonpolar.`,
        r`Oxidation numbers sum to the ion's charge, not to zero.`,
      ],
      check: [
        { q: r`What is the formula of dinitrogen pentoxide?`, a: r`N₂O₅.` },
        { q: r`A substance that loses electrons in a redox reaction is called what?`, a: r`The reducing agent (it is oxidised).` },
      ],
    },
    {
      name: 'Stoichiometry',
      inShort: r`Counting atoms by weighing: moles, formulas and how much product a reaction gives.`,
      body: [
        r`Reactions follow a few laws of chemical change:

| Law | Says |
|---|---|
| Conservation of mass (Lavoisier) | mass is neither created nor destroyed in a reaction |
| Definite proportions (Proust) | a compound always has the same composition by mass |
| Multiple proportions (Dalton) | masses of one element combining with a fixed mass of another are in small whole-number ratios |`,
        r`Atoms are counted by weighing: a **mole** is $6.022 \times 10^{23}$ particles, and its mass in grams is the formula mass, $n = \frac mM$. The **empirical formula** is the simplest whole-number ratio of atoms, found by turning mass percentages into moles and dividing by the smallest; the **molecular formula** is a whole multiple of it, fixed by the molar mass.`,
        r`A balanced equation gives mole ratios. The reactant that runs out first, the **limiting reactant**, has the smallest moles ÷ coefficient and sets the **theoretical yield**; what's collected over that is the **percent yield**.`,
      ],
      keyIdeas: [
        r`$n = \frac{m}{M}$; one mole is $6.022 \times 10^{23}$ particles.`,
        r`Percent composition $\frac{n_XA_X}{M} \times 100\%$; empirical formula from mole ratios, molecular formula $= k \times$ empirical.`,
        r`The limiting reactant has the smallest moles ÷ coefficient. Percent yield $= \frac{\text{actual}}{\text{theoretical}} \times 100\%$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Limiting reactant and yield',
          problem: r`4.0 g of H₂ reacts with 40 g of O₂ ($2\text{H}_2 + \text{O}_2 \to 2\text{H}_2\text{O}$). How much water can form? If 32 g is collected, what is the yield?`,
          steps: [
            r`H₂: $\frac{4.0}{2.016} = 1.984$ mol, $\div 2 = 0.992$; O₂: $\frac{40}{32} = 1.25$ mol, $\div 1 = 1.25$.`,
            r`H₂ limits: $1.984 \times 18.015 = 35.7$ g of water.`,
            r`Yield $\frac{32}{35.7} = 89.5\%$.`,
          ],
          answer: r`35.7 g; 89.5%.`,
        },
        {
          level: 'board',
          title: 'A formula, and fermentation',
          problem: r`A compound is 52.14% C, 13.13% H and 34.73% O by mass. Find its empirical formula. Glucose ferments by $\text{C}_6\text{H}_{12}\text{O}_6 \to 2\text{C}_2\text{H}_5\text{OH} + 2\text{CO}_2$: how much ethanol can 2.0 t of glucose give?`,
          steps: [
            r`Moles per 100 g: C $\frac{52.14}{12.011} = 4.341$, H $\frac{13.13}{1.008} = 13.03$, O $\frac{34.73}{16.00} = 2.171$.`,
            r`Divide by 2.171: 2 : 6 : 1, so C₂H₆O.`,
            r`$2.0 \times \frac{2 \times 46.07}{180.16} = 1.02$ t of ethanol.`,
          ],
          answer: r`C₂H₆O; 1.02 t.`,
        },
      ],
      traps: [
        r`Compare MOLES divided by coefficients; the smaller mass is not always the limiting reactant.`,
        r`Round mole ratios only when they're within a few hundredths of a whole number; 1.5 means double everything.`,
      ],
      check: [
        { q: r`Which law says a compound always has the same composition by mass?`, a: r`The law of definite proportions.` },
        { q: r`How many atoms are in 0.5 mol of a metal?`, a: r`$3.011 \times 10^{23}$.` },
      ],
    },
    {
      name: 'Gas Laws',
      inShort: r`Boyle, Charles, Avogadro and the ideal gas law, with Dalton, Graham and real gases.`,
      body: [
        r`Gases follow simple laws because their molecules are far apart: at fixed T, $pV$ is constant (**Boyle**); at fixed p, $V \propto T$ (**Charles**); at fixed V, $p \propto T$ (**Gay-Lussac**); equal volumes at the same T and p hold equal numbers of molecules (**Avogadro**). Charles's line, extended, reaches zero volume at −273.15 °C, which is how absolute zero was first found:`,
        {
          type: 'plot',
          alt: 'Volume of one mole of gas at 1 atmosphere against temperature in degrees Celsius: a straight line through 22.4 litres at 0 degrees, extended, dashed, down to zero volume at minus 273.15 degrees.',
          caption: 'One mole at 1 atm: 22.4 L at 0 °C; the line extended (dashed) reaches zero at −273.15 °C.',
          x: [-300, 120],
          y: [0, 35],
          xLabel: 'T (°C)',
          yLabel: 'V (L)',
          series: [
            { points: [-100, 120].map((t) => [t, charlesV(t)]), label: 'gas', area: true },
            { points: [-273.15, -100].map((t) => [t, charlesV(t)]), label: 'extended', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: -273.15, label: '−273.15' }],
        },
        r`Together they make $pV = nRT$. In a mixture each gas exerts its **partial pressure** in proportion to its mole fraction (**Dalton**): $p_i = x_ip$. Light gases effuse faster (**Graham**), $\frac{r_1}{r_2} = \sqrt{\frac{M_2}{M_1}}$. Real gases deviate at high pressure and low temperature; van der Waals corrects for the molecules' attraction and size.`,
      ],
      keyIdeas: [
        r`$pV = nRT$; combined $\frac{p_1V_1}{T_1} = \frac{p_2V_2}{T_2}$. $R = 8.314$ J/(mol·K) $= 0.08206$ L·atm/(mol·K).`,
        r`One mole fills 22.414 L at 0 °C and 1 atm, 24.47 L at 25 °C.`,
        r`Gas density $\rho = \frac{pM}{RT}$; effusion $\frac{r_1}{r_2} = \sqrt{\frac{M_2}{M_1}}$; Dalton $p_i = x_ip$.`,
        r`Real gases: van der Waals $\left(p + \frac{an^2}{V^2}\right)(V - nb) = nRT$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Mass in a tank, molar mass from density',
          problem: r`A 5.0 L tank holds oxygen at 200 kPa and 25 °C. Find its mass. A gas has a density of 1.25 g/L at STP: find its molar mass.`,
          steps: [
            r`$n = \frac{200\,000 \times 0.005}{8.314 \times 298.15} = 0.403$ mol, so $0.403 \times 32 = 12.9$ g.`,
            r`$M = 1.25 \times 22.414 = 28.0$ g/mol (N₂ or CO).`,
          ],
          answer: r`12.9 g; 28.0 g/mol.`,
        },
        {
          level: 'board',
          title: 'A mixture, and an unknown gas',
          problem: r`2 kg of oxygen and 6 kg of nitrogen share a tank at 150 kPa. Find oxygen's mole fraction and partial pressure. 20.0 g of an unknown gas fills 7.0 L at STP: find its molar mass.`,
          steps: [
            r`$\frac{2000}{32} = 62.5$ mol O₂ and $\frac{6000}{28.014} = 214.2$ mol N₂: $x = \frac{62.5}{276.7} = 0.226$.`,
            r`$p_{O_2} = 0.226 \times 150 = 33.9$ kPa.`,
            r`$M = \frac{20.0}{7.0/22.414} = 64.0$ g/mol (SO₂).`,
          ],
          answer: r`0.226 and 33.9 kPa; 64.0 g/mol.`,
        },
      ],
      traps: [
        r`Kelvin and absolute pressure only; and use the $R$ that matches your units.`,
        r`Partial pressure goes with the MOLE fraction, not the mass fraction.`,
      ],
      check: [
        { q: r`Which law says equal volumes of gases at the same T and p hold the same number of molecules?`, a: r`Avogadro's law.` },
        { q: r`Which effuses faster, hydrogen or oxygen, and by how much?`, a: r`Hydrogen, $\sqrt{\frac{32}{2}} = 4$ times faster.` },
      ],
    },
    {
      name: 'Solutions and Concentration',
      inShort: r`How much is dissolved: molarity, molality, normality, and the colligative properties.`,
      body: [
        r`A **solution** is a solute dissolved in a solvent. Its strength is given several ways:

| Unit | Definition | Note |
|---|---|---|
| Molarity M | mol solute per L of solution | changes with temperature |
| Molality m | mol solute per kg of solvent | doesn't |
| Normality N | equivalents per L | $N = M \times$ (H⁺, OH⁻ or charge per formula) |
| Mass percent | g solute per 100 g solution | |
| Mole fraction | mol of one part over total mol | |`,
        r`**Colligative** properties depend on how many particles are dissolved, not what they are: vapour pressure falls (Raoult), the boiling point rises and the freezing point falls in proportion to molality, multiplied by the **van 't Hoff factor** i, the particles per formula unit:`,
        {
          type: 'plot',
          alt: 'Freezing-point drop of water against molality from 0 to 2 moles per kilogram: three straight lines, for sugar with one particle per unit, salt with two, and calcium chloride with three, steepest last; 1 mole per kilogram of salt freezes 3.72 degrees lower.',
          caption: 'Freezing-point drop in water: sugar (i = 1), salt (i = 2) and calcium chloride (i = 3), steepest last.',
          x: [0, 2],
          y: [0, 12],
          xLabel: 'molality (mol/kg)',
          yLabel: 'drop (°C)',
          series: [1, 2, 3].map((i) => ({ f: (b) => i * 1.86 * b, label: `i = ${i}`, colour: colourOf(i - 1) })),
          legend: false,
        },
        r`In a **titration**, the acid's and base's equivalents match at the end point: $N_1V_1 = N_2V_2$; a dilution likewise keeps the moles, $M_1V_1 = M_2V_2$.`,
      ],
      keyIdeas: [
        r`Molarity $\frac{n}{V_{\text{solution}}}$ (mol/L); molality $\frac{n}{m_{\text{solvent}}}$ (mol/kg); normality $= M \times$ equivalents.`,
        r`Dilution $M_1V_1 = M_2V_2$; titration $N_1V_1 = N_2V_2$. Raoult: $p_A = x_Ap_A^\circ$.`,
        r`$\Delta T_b = iK_bb$, $\Delta T_f = iK_fb$ (water 0.512 and 1.86); osmotic pressure $\pi = iMRT$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Making and diluting a solution',
          problem: r`10.0 g of NaOH (40.0 g/mol) is dissolved to make 250 mL. Find its molarity, and the volume it must be diluted to for 0.10 M.`,
          steps: [
            r`$n = \frac{10.0}{40.0} = 0.250$ mol, so $\frac{0.250}{0.250} = 1.00$ M.`,
            r`$V_2 = \frac{1.00 \times 250}{0.10} = 2500$ mL.`,
          ],
          answer: r`1.00 M; 2500 mL.`,
        },
        {
          level: 'board',
          title: 'Battery acid, and a titration',
          problem: r`Sulfuric acid (98.08 g/mol) of 30.0% by mass has a density of 1.22 g/mL. Find its molarity, molality and normality. 25 mL of 0.12 N HCl neutralises 20 mL of NaOH: find the base's normality.`,
          steps: [
            r`One litre weighs 1220 g and holds 366 g of acid: $\frac{366}{98.08} = 3.73$ mol, so 3.73 M.`,
            r`The water is $1220 - 366 = 854$ g: molality $\frac{3.73}{0.854} = 4.37$ mol/kg.`,
            r`Two H⁺ per formula: 7.46 N.`,
            r`$N_2 = \frac{25 \times 0.12}{20} = 0.15$ N.`,
          ],
          answer: r`3.73 M, 4.37 mol/kg, 7.46 N; 0.15 N.`,
        },
      ],
      traps: [
        r`NaCl gives two particles ($i = 2$), CaCl₂ three: 1 mol/kg NaCl freezes at −3.72 °C, not −1.86 °C.`,
        r`Molality divides by the SOLVENT's mass, not the solution's.`,
      ],
      check: [
        { q: r`What is the normality of 1 M H₂SO₄?`, a: r`2 N.` },
        { q: r`Which concentration unit doesn't change with temperature?`, a: r`Molality (and mass percent).` },
      ],
    },
    {
      name: 'Equilibrium, Acids and Bases',
      inShort: r`How far a reaction goes, and acidity measured by pH.`,
      body: [
        r`Most reactions stop short, at an **equilibrium** where the forward and reverse rates match; the equilibrium constant $K_c = \frac{[C]^c[D]^d}{[A]^a[B]^b}$ says how far they go. Disturb one (add a reactant, change the pressure or temperature) and it shifts to undo the change (**Le Chatelier**).`,
        r`An **acid** gives H⁺, a **base** takes it (Brønsted); acids turn litmus red, bases blue. $\text{pH} = -\log[\text{H}^+]$, and in water at 25 °C $\text{pH} + \text{pOH} = 14$, with neutral water at pH 7. A strong acid ionises completely; a weak one only partly, by $K_a$. Titrating with base shows the difference: the strong acid jumps sharply at the equivalence point through pH 7; the weak one starts higher, rises gently through its buffer region, and ends above 7:`,
        {
          type: 'plot',
          alt: 'pH against volume of 0.10 molar sodium hydroxide added to 25 millilitres of 0.10 molar acid: the strong acid starts at pH 1 and jumps steeply through 7 at 25 millilitres; the weak acetic acid, dashed, starts at 2.9, rises gently through about 4.7 at half way, and reaches 8.7 at 25 millilitres; both end near 12.5.',
          caption: 'Titrating 25 mL of 0.10 M acid with 0.10 M base: strong acid (solid) and acetic acid (dashed), equivalence at 25 mL.',
          x: [0, 50],
          y: [0, 14],
          xLabel: 'base added (mL)',
          yLabel: 'pH',
          series: [
            { points: VOLUMES.map((v) => [v, strongPh(v)]), label: 'strong acid' },
            { points: VOLUMES.map((v) => [v, weakPh(v)]), label: 'acetic acid', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 25, label: '25 mL' }],
        },
        r`A **buffer**, a weak acid with its salt, holds the pH steady: $\text{pH} = \text{p}K_a + \log\frac{[\text{A}^-]}{[\text{HA}]}$.`,
      ],
      keyIdeas: [
        r`$K_c = \frac{[C]^c[D]^d}{[A]^a[B]^b}$, leaving out solids and liquids; $K_p = K_c(RT)^{\Delta n}$. Le Chatelier: a stressed equilibrium shifts to relieve the stress.`,
        r`$\text{pH} = -\log[\text{H}^+]$; $\text{pH} + \text{pOH} = 14$ at 25 °C.`,
        r`Weak acid $[\text{H}^+] \approx \sqrt{K_aC}$; buffer $\text{pH} = \text{p}K_a + \log\frac{[\text{A}^-]}{[\text{HA}]}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A weak acid and a buffer',
          problem: r`Find the pH of 0.10 M acetic acid ($K_a = 1.8 \times 10^{-5}$), and of a buffer of 0.10 M acetic acid with 0.15 M sodium acetate.`,
          steps: [
            r`$[\text{H}^+] = \sqrt{1.8 \times 10^{-6}} = 1.34 \times 10^{-3}$, pH $= 2.87$.`,
            r`Buffer: $4.74 + \log1.5 = 4.92$.`,
          ],
          answer: r`2.87; 4.92.`,
        },
        {
          level: 'board',
          title: 'A strong acid, and rain',
          problem: r`Find the pH of 0.020 M HCl. Rain is measured at pH 5.1: what is its H⁺ concentration?`,
          steps: [
            r`Strong: $[\text{H}^+] = 0.020$, pH $= -\log0.020 = 1.70$.`,
            r`$[\text{H}^+] = 10^{-5.1} = 7.9 \times 10^{-6}$ M.`,
          ],
          answer: r`1.70; $7.9 \times 10^{-6}$ M.`,
        },
      ],
      traps: [
        r`A strong acid ionises fully ($[\text{H}^+] = C$); the square-root shortcut is for weak acids only.`,
        r`Neutral water is pH 7, not 0.`,
      ],
      check: [
        { q: r`What colour do bases turn litmus?`, a: r`Blue.` },
        { q: r`One pH unit lower means how much more H⁺?`, a: r`Ten times as much.` },
      ],
    },
    {
      name: 'Thermochemistry and Energy',
      inShort: r`Heat of reaction, fuels, spontaneity and reaction rates.`,
      body: [
        r`Reactions release heat (**exothermic**, ΔH < 0) or absorb it (**endothermic**). Because enthalpy is a state property, a reaction's ΔH is the products' heats of formation minus the reactants' (**Hess's law**), whatever the route. Whether it runs on its own depends on the free energy, $\Delta G = \Delta H - T\Delta S$.`,
        r`How FAST it runs depends on the **activation energy**, the hump it must climb first. A **catalyst** gives a lower path, so the reaction speeds up, but the start and end, and so ΔH, stay the same:`,
        {
          type: 'plot',
          alt: 'Energy along the reaction path for an exothermic reaction: reactants at zero, a high hump, then products 40 kJ lower; a catalysed path, dashed, crosses a much lower hump between the same start and end.',
          caption: 'An exothermic reaction: the catalysed path (dashed) has a lower hump, the same start, end and ΔH.',
          x: [0, 1],
          y: [-60, 100],
          xLabel: 'reaction path',
          yLabel: 'energy (kJ/mol)',
          series: [
            { f: profile(100), label: 'uncatalysed' },
            { f: profile(45), label: 'catalysed', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`Rates climb steeply with temperature (**Arrhenius**, $k = Ae^{-E_a/RT}$): many reactions roughly double for each 10 °C. Fuels are rated by heating value: the higher (HHV) counts the heat from condensing the water formed, the lower (LHV) does not.`,
      ],
      keyIdeas: [
        r`$\Delta H^\circ_{rxn} = \sum\Delta H_f^\circ(\text{products}) - \sum\Delta H_f^\circ(\text{reactants})$; negative is exothermic.`,
        r`$\Delta G = \Delta H - T\Delta S$; negative runs on its own. $\Delta G^\circ = -RT\ln K$.`,
        r`Heating value: HHV counts the water condensed, LHV does not (methane 55.5 vs 50.0 MJ/kg).`,
        r`Arrhenius $k = Ae^{-E_a/RT}$, so $\ln\frac{k_2}{k_1} = \frac{E_a}{R}\left(\frac{1}{T_1} - \frac{1}{T_2}\right)$; first order $t_{1/2} = \frac{\ln 2}{k}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Burning methane',
          problem: r`Find ΔH for burning methane ($\Delta H_f^\circ$: CH₄ −74.8, CO₂ −393.5, H₂O(l) −285.8 kJ/mol) and the heat from 1 kg of it.`,
          steps: [
            r`$\Delta H = -393.5 + 2(-285.8) - (-74.8) = -890.3$ kJ/mol.`,
            r`Per kg: $\frac{890.3}{16.04} = 55.5$ MJ, its higher heating value.`,
          ],
          answer: r`−890.3 kJ/mol; 55.5 MJ/kg.`,
        },
        {
          level: 'board',
          title: 'Burning ethanol, and an activation energy',
          problem: r`Find ΔH for burning liquid ethanol, $\text{C}_2\text{H}_5\text{OH} + 3\text{O}_2 \to 2\text{CO}_2 + 3\text{H}_2\text{O}$ (ethanol −277.7 kJ/mol). A reaction's rate doubles from 25 °C to 35 °C: find its activation energy.`,
          steps: [
            r`$\Delta H = 2(-393.5) + 3(-285.8) - (-277.7) = -1366.7$ kJ/mol.`,
            r`$E_a = \frac{8.314\ln2}{\frac{1}{298.15} - \frac{1}{308.15}} = 52.9$ kJ/mol.`,
          ],
          answer: r`−1366.7 kJ/mol; 52.9 kJ/mol.`,
        },
      ],
      traps: [
        r`Elements in their standard state have $\Delta H_f^\circ = 0$: O₂ adds nothing.`,
        r`A catalyst changes the rate, never ΔH or the equilibrium.`,
      ],
      check: [
        { q: r`What is the minimum energy a reaction needs to start called?`, a: r`The activation energy.` },
        { q: r`Is a reaction with ΔH < 0 exothermic or endothermic?`, a: r`Exothermic: it releases heat.` },
      ],
    },
    {
      name: 'Electrochemistry and Batteries',
      inShort: r`Redox reactions that drive a current, and the cells built from them.`,
      body: [
        r`In a **redox** reaction one substance is oxidised (loses electrons, at the **anode**) and another reduced (gains them, at the **cathode**). Separate the two halves and the electrons flow through a wire: a **galvanic cell**. Its voltage is the difference of the standard reduction potentials, $E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode}$, and it falls as the products build up, by the **Nernst equation**:`,
        {
          type: 'plot',
          alt: 'The voltage of a zinc-copper cell against its reaction quotient on a log scale from 0.0001 to 10000: a straight line falling from 1.22 volts through 1.10 volts at a quotient of 1 to 0.98 volts.',
          caption: 'A Daniell (zinc–copper) cell: 1.10 V at Q = 1, falling 0.0296 V for each tenfold rise in Q.',
          x: [1e-4, 1e4],
          logX: true,
          y: [0.9, 1.3],
          xLabel: 'reaction quotient Q',
          yLabel: 'E (V)',
          series: [{ f: (q) => 1.1 - (0.05916 / 2) * Math.log10(q), label: 'E' }],
          marks: [{ x: 1, label: 'Q = 1' }],
        },
        r`Driven backwards by an outside source, the same chemistry is **electrolysis**: plating, refining, charging a battery. Faraday's law ties the mass changed to the charge passed, $m = \frac{MIt}{nF}$. A battery's energy is its capacity times its voltage; a lead–acid cell, fully charged, holds PbO₂ and Pb in sulfuric acid at about 2.0 V and discharges both plates to PbSO₄.`,
      ],
      keyIdeas: [
        r`Oxidation at the anode, reduction at the cathode. $E^\circ_{cell} = E^\circ_{cathode} - E^\circ_{anode}$.`,
        r`Nernst $E = E^\circ - \frac{0.05916}{n}\log Q$ at 25 °C; $\Delta G = -nFE$.`,
        r`Faraday: $m = \frac{MIt}{nF}$, $F = 96\,485$ C/mol.`,
        r`Battery energy Wh $=$ Ah × V; at a C-rate the current is $C \times$ capacity. Lead-acid 2.0 V per cell, Li-ion about 3.6–3.7 V.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A Daniell cell',
          problem: r`Find the voltage and ΔG of a Daniell cell (Cu²⁺/Cu +0.34 V, Zn²⁺/Zn −0.76 V). How much copper does 10 A deposit in one hour?`,
          steps: [
            r`$E = 0.34 - (-0.76) = 1.10$ V; $\Delta G = -2 \times 96\,485 \times 1.10 = -212.3$ kJ/mol.`,
            r`Copper: $\frac{63.55 \times 10 \times 3600}{2 \times 96\,485} = 11.9$ g.`,
          ],
          answer: r`1.10 V; −212.3 kJ/mol; 11.9 g.`,
        },
        {
          level: 'board',
          title: 'Silver plating, and a battery bank',
          problem: r`How long does 2.0 A take to plate 5.0 g of silver (107.87 g/mol, Ag⁺)? A 12 V, 100 Ah battery is discharged at C/5: find its energy, current and run time.`,
          steps: [
            r`$t = \frac{5.0 \times 1 \times 96\,485}{107.87 \times 2.0} = 2236$ s, about 37.3 min.`,
            r`Energy $12 \times 100 = 1200$ Wh; C/5 is $\frac{100}{5} = 20$ A, for 5 h.`,
          ],
          answer: r`2236 s; 1.2 kWh at 20 A for 5 h.`,
        },
      ],
      traps: [
        r`Don't multiply $E^\circ$ by the coefficients: potentials are per electron and stay the same.`,
        r`In electrolysis the anode is positive; in a galvanic cell it is negative. Oxidation is at the anode in both.`,
      ],
      check: [
        { q: r`What does a fully charged lead–acid cell hold at its plates?`, a: r`PbO₂ (positive) and Pb (negative), in sulfuric acid.` },
        { q: r`In electrolysis, which way do anions move?`, a: r`To the anode; cations go to the cathode.` },
      ],
    },
    {
      name: 'Energy Storage and Fuel Cells',
      inShort: r`Storing energy chemically, and turning fuel straight into electricity.`,
      body: [
        r`A **fuel cell** is a battery that never runs down: hydrogen is oxidised at the anode, oxygen reduced at the cathode, and the electrons go round the circuit, with water the only product. Its ideal voltage is $-\frac{\Delta G}{nF} = 1.229$ V; as it delivers current, losses pull the voltage down, first to start the reaction (**activation**), then in the cell's resistance (**ohmic**), and finally as the gases can't arrive fast enough (**mass transport**):`,
        {
          type: 'plot',
          alt: 'Voltage of a typical hydrogen fuel cell against current density from 0.01 to 1.4 amperes per square centimetre: well below the dashed 1.229 volt ideal, a quick drop at low current, a long gentle slope near 0.6 to 0.8 volts, and a steep fall at the highest currents.',
          caption: 'A typical hydrogen cell against its ideal 1.229 V (dashed): activation, ohmic and mass-transport losses in turn.',
          x: [0, 1.4],
          y: [0, 1.4],
          xLabel: 'current density (A/cm²)',
          yLabel: 'cell voltage (V)',
          series: [
            { points: Array.from({ length: 140 }, (_, k) => 0.01 * (k + 1)).map((i) => [i, cellV(i)]), label: 'cell' },
            { f: () => 1.229, label: 'ideal', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`Since it doesn't burn its fuel, a fuel cell isn't limited by Carnot: its best is $\frac{\Delta G}{\Delta H} = 83\%$ for hydrogen, and on the higher heating value its efficiency is $\frac{V_{cell}}{1.48}$. Batteries are compared by **specific energy**: Li-ion 150–250 Wh/kg against lead-acid's 30–40.`,
      ],
      keyIdeas: [
        r`Ideal fuel cell voltage $E = -\frac{\Delta G}{nF}$: 1.229 V for hydrogen at 25 °C; real cells run at 0.6–0.8 V.`,
        r`Efficiency at most $\frac{\Delta G}{\Delta H} = 83\%$ for hydrogen, not limited by Carnot; actual $\frac{V_{cell}}{1.48}$ on the HHV.`,
        r`Hydrogen used $\frac{I}{2F}$ mol/s per cell.`,
        r`Specific energy: Li-ion 150–250 Wh/kg, lead-acid 30–40; round-trip efficiency $\frac{E_{out}}{E_{in}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A fuel-cell stack',
          problem: r`A stack of 100 hydrogen cells runs at 0.70 V per cell and 100 A. Find its power, its hydrogen use per hour, and its efficiency on the HHV.`,
          steps: [
            r`$P = 100 \times 0.70 \times 100 = 7.0$ kW.`,
            r`Hydrogen: $\frac{100 \times 100}{2 \times 96\,485} = 0.0518$ mol/s, so $0.0518 \times 2.016 \times 3600 = 376$ g/h.`,
            r`Efficiency $\frac{0.70}{1.48} = 47\%$.`,
          ],
          answer: r`7.0 kW; 376 g/h; 47%.`,
        },
        {
          level: 'board',
          title: 'Sizing a stack',
          problem: r`A 48 V stack is built from cells running at 0.75 V. How many cells does it need, and how much hydrogen does it use at 200 A?`,
          steps: [
            r`$\frac{48}{0.75} = 64$ cells in series.`,
            r`$\frac{64 \times 200}{2 \times 96\,485} = 0.0663$ mol/s, or $0.0663 \times 2.016 \times 3600 = 481$ g/h.`,
          ],
          answer: r`64 cells; 481 g/h.`,
        },
      ],
      traps: [
        r`Cells in series add voltage; the current, and the hydrogen per cell, stays the same.`,
        r`Two electrons per hydrogen molecule: divide by 2F, not F.`,
      ],
      check: [
        { q: r`What is the ideal voltage of a hydrogen fuel cell at 25 °C?`, a: r`1.229 V.` },
        { q: r`Is a fuel cell limited by the Carnot efficiency?`, a: r`No: it doesn't turn heat into work.` },
      ],
    },
    {
      name: 'Solar Cells and Photosynthesis',
      inShort: r`Turning sunlight into electricity in a semiconductor, or into sugar in a leaf.`,
      body: [
        r`A solar cell is a large p–n junction. A photon with at least the **band gap** energy frees an electron–hole pair, and the junction's field sweeps them apart into a current; photons below the gap pass through, and the excess energy of those above it is lost as heat. The cell's I–V curve runs from the **short-circuit current** to the **open-circuit voltage**; it delivers most power at the knee, the **maximum power point**:`,
        {
          type: 'plot',
          alt: 'Current against voltage for a 340 watt panel: flat near 10.5 amperes from zero volts, bending down at the knee near 34.6 volts and 9.8 amperes, the maximum power point, and falling to zero at the open-circuit voltage of 41 volts.',
          caption: 'A 340 W panel: 10.5 A short-circuit, 41.0 V open-circuit, best power at the knee near 34.6 V.',
          x: [0, 44],
          y: [0, 12],
          xLabel: 'V (V)',
          yLabel: 'I (A)',
          series: [{ f: (v) => Math.max(0, panelI(v)), label: 'I', area: true }],
          marks: [{ x: 34.56, label: 'best' }],
        },
        r`**Fill factor** measures how square the curve is, $\frac{P_{max}}{V_{oc}I_{sc}}$; efficiency compares the power with the sunlight, $\frac{P_{max}}{GA}$, at the standard 1000 W/m². A leaf does the same job chemically: **photosynthesis** stores sunlight as glucose, $6\text{CO}_2 + 6\text{H}_2\text{O} \to \text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2$.`,
      ],
      keyIdeas: [
        r`A photon is absorbed only if $E \ge E_g$: cutoff $\lambda_c = \frac{1240}{E_g}$ nm (silicon 1.12 eV, 1107 nm).`,
        r`$\eta = \frac{P_{max}}{GA}$ at the standard 1000 W/m²; fill factor $FF = \frac{V_{mp}I_{mp}}{V_{oc}I_{sc}}$.`,
        r`Photosynthesis $6\text{CO}_2 + 6\text{H}_2\text{O} \to \text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2$ stores about 2870 kJ per mole of glucose.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Efficiency and fill factor',
          problem: r`A 1.7 m² panel gives 340 W at 1000 W/m², with $V_{oc} = 41.0$ V and $I_{sc} = 10.5$ A. Find its efficiency and fill factor.`,
          steps: [
            r`$\eta = \frac{340}{1000 \times 1.7} = 20\%$.`,
            r`$FF = \frac{340}{41.0 \times 10.5} = 0.79$.`,
          ],
          answer: r`20%; 0.79.`,
        },
        {
          level: 'board',
          title: 'A cutoff, and a day of sun',
          problem: r`What is the longest wavelength a gallium arsenide cell ($E_g$ = 1.42 eV) can use? A 1 kW array gets 4.5 peak-sun hours a day: about how much does it make?`,
          steps: [
            r`$\lambda_c = \frac{1240}{1.42} = 873$ nm.`,
            r`$1 \times 4.5 = 4.5$ kWh a day (before losses).`,
          ],
          answer: r`873 nm; about 4.5 kWh.`,
        },
      ],
      traps: [
        r`Photons with more energy than the gap still give only $E_g$ each; the rest is lost as heat.`,
        r`The maximum power is NOT $V_{oc}I_{sc}$: that's what the fill factor corrects.`,
      ],
      check: [
        { q: r`Which photons can a silicon cell not use?`, a: r`Those below 1.12 eV, longer than about 1107 nm.` },
        { q: r`What does photosynthesis release?`, a: r`Oxygen.` },
      ],
    },
    {
      name: 'Renewable Energy',
      inShort: r`Wind, solar, hydro, geothermal and biomass, and how much they really produce.`,
      body: [
        r`Renewable sources replenish themselves: sun, wind, flowing water, the earth's heat, and plants. **Wind** power grows as the cube of the wind speed, $\frac12\rho Av^3C_p$, with $C_p$ at most $\frac{16}{27}$ (the Betz limit). A real turbine starts at a cut-in speed, follows the cube up to its rating, holds it there, and shuts down in storms:`,
        {
          type: 'plot',
          alt: 'Power of an 80 metre, 2 megawatt wind turbine against wind speed: zero below 3 metres per second, rising as the cube of the speed to its 2 megawatt rating near 11.8 metres per second, flat to 25, then zero.',
          caption: 'The 80 m, 2 MW turbine: cut in at 3 m/s, cubic rise to rated power near 11.8 m/s, cut out at 25 m/s.',
          x: [0, 28],
          y: [0, 2.4],
          xLabel: 'wind speed (m/s)',
          yLabel: 'P (MW)',
          series: [{ f: windMW, label: 'P', area: true }],
          marks: [{ x: 10, label: '10 m/s' }],
        },
        r`**Hydro** gives $\eta\rho gQH$; **geothermal** runs steam plants on the earth's heat; **biomass** burns plant carbon that the plants recently took from the air. Because sun and wind come and go, a plant's **capacity factor**, its energy over what it would make at full rating all year, matters as much as its rating.`,
      ],
      keyIdeas: [
        r`Wind power $P = \frac12\rho Av^3C_p$, with $C_p$ at most $\frac{16}{27} = 0.593$ (Betz).`,
        r`Hydro $P = \eta\rho gQH$; capacity factor $= \frac{\text{energy produced}}{\text{rated power} \times \text{hours}}$: solar 15–20%, wind 25–40%, geothermal 80–90%.`,
        r`Biomass and biofuels are renewable carbon: burning releases the CO₂ the plants took in.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A wind turbine',
          problem: r`A turbine with an 80 m rotor sees 10 m/s wind ($\rho = 1.225$, $C_p = 0.40$). Find its power. A 2 MW turbine makes 5256 MWh in a year: what is its capacity factor?`,
          steps: [
            r`$A = \pi \times 40^2 = 5027$ m²; $P = \frac12 \times 1.225 \times 5027 \times 10^3 \times 0.40 = 1.23$ MW.`,
            r`$CF = \frac{5256}{2 \times 8760} = 30\%$.`,
          ],
          answer: r`1.23 MW; 30%.`,
        },
        {
          level: 'board',
          title: 'A small hydro plant',
          problem: r`A hydro plant passes 20 m³/s through a 50 m head at 88% overall efficiency. Find its output.`,
          steps: [r`$P = 0.88 \times 1000 \times 9.81 \times 20 \times 50 = 8.63$ MW.`],
          answer: r`8.63 MW.`,
        },
      ],
      traps: [
        r`Power goes as $v^3$: doubling the wind speed gives eight times the power.`,
        r`Rated power is not average power: multiply by the capacity factor for energy.`,
      ],
      check: [
        { q: r`What is the Betz limit?`, a: r`$\frac{16}{27}$, about 59.3% of the wind's power.` },
        { q: r`Which renewable usually has the highest capacity factor?`, a: r`Geothermal.` },
      ],
    },
    {
      name: 'Chemistry of Engineering Materials',
      inShort: r`Metals, polymers, ceramics and composites, and how they corrode.`,
      body: [
        r`Engineering materials fall into **metals** (conductive, ductile), **ceramics** (hard, brittle, insulating, heat-resistant), **polymers** (long chains of repeating units: **thermoplastics** soften and remelt, **thermosets** cross-link and don't) and **composites** that combine them.`,
        r`**Corrosion** is metal oxidising back toward its ore. Two metals in contact in a wet environment make a galvanic cell, and the more active one, the **anode**, corrodes to protect the other: that is how zinc galvanising and sacrificial anodes protect steel. Whether an oxide film protects depends on its volume against the metal it replaced:

| Pilling–Bedworth ratio | Oxide film | Example |
|---|---|---|
| Below 1 | porous, doesn't cover | Mg |
| 1 to 2 | dense, protective | Al (1.29), Cr, Ni |
| Above 2 | cracks and flakes off | Fe (rust) |`,
      ],
      keyIdeas: [
        r`Corrosion is oxidation: in a galvanic pair the more active metal is the anode and corrodes (zinc protects steel).`,
        r`Corrosion rate $\frac{87.6\,W}{\rho At}$ mm/yr ($W$ mg, $\rho$ g/cm³, $A$ cm², $t$ h).`,
        r`Pilling-Bedworth ratio $\frac{M_{oxide}\rho_{metal}}{nM_{metal}\rho_{oxide}}$, between 1 and 2 protective (Al 1.29); below 1 porous (Mg).`,
        r`Polymers: degree of polymerization $\frac{M_{polymer}}{M_{repeat}}$; thermoplastics remelt, thermosets do not.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A corrosion rate',
          problem: r`A 50 cm² steel coupon ($\rho = 7.87$ g/cm³) loses 120 mg in 500 h. Find the corrosion rate.`,
          steps: [r`$CR = \frac{87.6 \times 120}{7.87 \times 50 \times 500} = 0.053$ mm/yr.`],
          answer: r`0.053 mm/yr.`,
        },
        {
          level: 'board',
          title: "Aluminium's oxide, and a polymer chain",
          problem: r`Find the Pilling–Bedworth ratio of aluminium (Al₂O₃ 101.96 g/mol, 3.95 g/cm³; Al 26.98 g/mol, 2.70 g/cm³). Polyethylene of 280 000 g/mol is made of C₂H₄ units (28.05 g/mol): find its degree of polymerization.`,
          steps: [
            r`$\frac{101.96 \times 2.70}{2 \times 26.98 \times 3.95} = 1.29$: protective.`,
            r`$\frac{280\,000}{28.05} = 9982$ units.`,
          ],
          answer: r`1.29; about 9982.`,
        },
      ],
      traps: [
        r`In the galvanic series the anode is the metal that corrodes, not the one protected.`,
        r`n in the Pilling–Bedworth ratio is the metal atoms per oxide formula (2 for Al₂O₃).`,
      ],
      check: [
        { q: r`Why does galvanising protect steel even where it's scratched?`, a: r`Zinc is more active, so it corrodes as the anode instead of the steel.` },
        { q: r`Which kind of plastic can be remelted?`, a: r`Thermoplastic.` },
      ],
    },
    {
      name: 'Nanomaterials',
      inShort: r`Materials 1–100 nm across, whose huge surface changes how they behave.`,
      body: [
        r`Between about 1 and 100 nm, materials behave differently from the same substance in bulk. The reason is surface: a sphere's surface per volume is $\frac 3r$, so shrinking it a thousandfold gives a thousand times the surface, and a large share of its atoms end up on the outside, where they are less tightly bound. Taking one atomic layer of gold (0.288 nm thick) as the surface:`,
        {
          type: 'plot',
          alt: 'The fraction of atoms in the outer layer of a gold particle against its diameter on a log scale from 1 to 100 nanometres: nearly all at 1 nanometre, about 31 percent at 5 nanometres, and under 2 percent at 100 nanometres.',
          caption: 'A gold particle’s outer-layer share of atoms: about 31% at 5 nm, under 2% at 100 nm.',
          x: [1, 100],
          logX: true,
          y: [0, 1],
          xLabel: 'diameter (nm)',
          yLabel: 'share on surface',
          series: [{ f: (d) => 1 - Math.max(0, (d - 0.576) / d) ** 3, label: 'surface share', area: true }],
          marks: [{ x: 5, label: '5 nm' }],
        },
        r`So nanoparticles react faster, melt at lower temperatures and even change colour with size (gold nanoparticles look red). Carbon shows the range: **graphene** is a single atomic sheet, **nanotubes** are rolled sheets, and **fullerenes** like C₆₀ are closed cages.`,
      ],
      keyIdeas: [
        r`For a sphere $\frac{A}{V} = \frac{3}{r}$; specific surface $\frac{6}{\rho d}$: shrinking a particle 1000-fold gives 1000 times the surface.`,
        r`At this size a large share of atoms sit on the surface: higher reactivity, lower melting points, size-dependent colour.`,
        r`Carbon forms: graphene (one atomic layer), nanotubes, fullerenes (C₆₀).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Atoms in a gold particle',
          problem: r`How many atoms are in a 5 nm gold sphere ($\rho = 19.3$ g/cm³, $M = 196.97$)? What is its surface per gram?`,
          steps: [
            r`$V = \frac{\pi}{6}(5 \times 10^{-7})^3 = 6.54 \times 10^{-20}$ cm³.`,
            r`$N = \frac{19.3 \times 6.54 \times 10^{-20} \times 6.022 \times 10^{23}}{196.97} \approx 3900$.`,
            r`Surface $\frac{6}{19\,300 \times 5 \times 10^{-9}} = 62$ m²/g.`,
          ],
          answer: r`About 3900 atoms; 62 m²/g.`,
        },
        {
          level: 'board',
          title: 'Silica powder',
          problem: r`Find the surface per gram of 10 nm silica spheres (2.2 g/cm³), and the share of a 5 nm gold particle's atoms in its outer 0.288 nm.`,
          steps: [
            r`$\frac{6}{2.2 \times 10^6 \times 10^{-8}} = 273$ m²/g, a tennis court in a gram.`,
            r`$1 - \left(\frac{5 - 0.576}{5}\right)^3 = 0.307$, about 31%.`,
          ],
          answer: r`About 273 m²/g; about 31%.`,
        },
      ],
      traps: [
        r`Keep diameter and radius apart: $\frac{A}{V} = \frac{3}{r} = \frac{6}{d}$.`,
        r`Put density in g/m³ (×10⁶ from g/cm³) to get m²/g.`,
      ],
      check: [
        { q: r`What is graphene?`, a: r`A single atomic layer of carbon in a hexagonal sheet.` },
        { q: r`What happens to surface per gram when particle size is halved?`, a: r`It doubles.` },
      ],
    },
    {
      name: 'Chemistry of the Environment',
      inShort: r`Air and water pollution, combustion products and how they are measured.`,
      body: [
        r`Burning fossil fuels makes **CO₂** (the main greenhouse gas), **SO₂** and **NOₓ** (acid rain), CO, particulates and mercury (mostly from coal); CFCs destroy stratospheric ozone. Plants answer with scrubbers for SO₂, **electrostatic precipitators** that charge and collect particles in an electric field, and carbon capture. Waste is reduced by recycling and treated by **pyrolysis** (heating without oxygen to fuel gas, oils and char) or **gasification** to syngas.`,
        r`In water, organic waste uses up dissolved oxygen as microbes digest it. The **biochemical oxygen demand** rises toward its ultimate value $L_0$, $BOD_t = L_0(1 - e^{-kt})$, and the standard test reads it at five days:`,
        {
          type: 'plot',
          alt: 'Biochemical oxygen demand against time for wastewater with an ultimate demand of 250 milligrams per litre and a rate of 0.23 per day: rising quickly, 171 at 5 days, and levelling toward 250.',
          caption: 'BOD of wastewater (ultimate 250 mg/L, k = 0.23/day): 171 mg/L at the five-day test.',
          x: [0, 20],
          y: [0, 280],
          xLabel: 't (days)',
          yLabel: 'BOD (mg/L)',
          series: [{ f: (t) => 250 * (1 - Math.exp(-0.23 * t)), label: 'BOD', area: true }],
          marks: [{ x: 5, label: '5 days' }],
        },
        r`Projects are screened by an **environmental impact assessment** (EIA), and products by a **life-cycle assessment** (LCA) from raw material to disposal (cradle-to-grave, or cradle-to-cradle when recycled). The main Philippine laws:

| Law | Covers |
|---|---|
| PD 1151 (1977) | Philippine Environmental Policy |
| PD 1586 (1978) | Environmental Impact Statement System |
| RA 6969 (1990) | Toxic substances, hazardous and nuclear wastes |
| RA 7942 (1995) | Philippine Mining Act |
| RA 8749 (1999) | Clean Air Act |
| RA 9003 (2000) | Ecological Solid Waste Management |
| RA 9275 (2004) | Clean Water Act |
| RA 9729 (2009) | Climate Change Act |`,
      ],
      keyIdeas: [
        r`Air: mg/m³ $= \frac{\text{ppm} \times M}{24.45}$ at 25 °C, 1 atm.`,
        r`Water: $BOD_t = L_0(1 - e^{-kt})$; hardness as CaCO₃: Ca²⁺ × 2.5, Mg²⁺ × 4.12.`,
        r`Each kg of carbon burned makes $\frac{44}{12} = 3.67$ kg CO₂. SO₂ and NOₓ cause acid rain; CFCs destroy ozone.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'BOD and hardness',
          problem: r`Wastewater has an ultimate BOD of 250 mg/L with $k = 0.23$/day. Find BOD₅. Water with 40 mg/L Ca²⁺ and 12 mg/L Mg²⁺: find its hardness.`,
          steps: [
            r`$BOD_5 = 250(1 - e^{-1.15}) = 171$ mg/L.`,
            r`Hardness $= 40 \times 2.50 + 12 \times 4.12 = 149$ mg/L as CaCO₃ (hard).`,
          ],
          answer: r`171 mg/L; 149 mg/L as CaCO₃.`,
        },
        {
          level: 'board',
          title: 'Carbon monoxide, and coal',
          problem: r`Convert 9 ppm of CO (28.01 g/mol) to mg/m³ at 25 °C. How much CO₂ does burning 1 t of coal that is 70% carbon make?`,
          steps: [
            r`$\frac{9 \times 28.01}{24.45} = 10.3$ mg/m³.`,
            r`$0.70 \times \frac{44.01}{12.011} = 2.56$ t of CO₂.`,
          ],
          answer: r`10.3 mg/m³; 2.56 t.`,
        },
      ],
      traps: [
        r`Use 24.45 L/mol at 25 °C but 22.41 at 0 °C when converting ppm.`,
        r`CO₂ warms the climate; SO₂ makes acid rain. Don't swap them.`,
      ],
      check: [
        { q: r`Which law is the Philippine Clean Air Act?`, a: r`RA 8749 (1999).` },
        { q: r`What does an electrostatic precipitator do?`, a: r`It charges particles and collects them in an electric field.` },
      ],
    },
  ],
};
