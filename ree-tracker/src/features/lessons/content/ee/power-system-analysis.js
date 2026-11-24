// Library › Lessons › EE › Power System Analysis (2026-11-19; every subtopic in
// the module format 2026-11-20, with figures, examples a step at a time and
// checks; every number re-worked by psaLesson.test.js. Coverage and problem
// styles cross-checked against a review center's power-system and
// distribution handout; the text, problems and figures are this app's own):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order. Symmetrical-component basics and two-port ABCD algebra are in Electric
// Circuits 2; machine models in Machinery 2; relays and breakers in Power
// System Protection.
const r = String.raw;
const deg = Math.PI / 180;

export default {
  topic: 'Power System Analysis',
  subject: 'EE',
  overview: r`Power system analysis models a whole network, generators, transformers, lines and loads, so its voltages, flows, faults and stability can be calculated. Everything is put in per unit on common bases, drawn as a one-line diagram, and turned into impedances. Lines are modelled from their geometry (GMR, GMD) as short, medium or long, each summed up by ABCD constants. Networks are solved with the bus admittance matrix: load flow for normal operation, the Z-bus and symmetrical components for faults. On top of that come stability (the swing equation and equal area), economic dispatch, voltage control, and the line's physical limits, corona and sag. Work per phase in per unit, and keep track of line versus phase quantities.`,
  sources: [
    'Power System Analysis (Grainger and Stevenson)',
    'Power System Analysis and Design (Glover, Overbye and Sarma)',
    'Elements of Power System Analysis (Stevenson)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Per-Unit System',
      inShort: r`Every quantity as a fraction of its base, so transformers disappear from the diagram.`,
      body: [
        r`A network with several voltage levels is easiest to solve in **per unit**: every quantity divided by a base of the same kind. Choose one MVA base for the whole system and one kV base for each zone, stepping the kV base through every transformer by its ratio. Then a transformer's per-unit impedance is the same from either side, and the ideal transformers drop out of the diagram.`,
        r`| Base | Three-phase formula |
|---|---|
| Power | $S_{base}$, the same everywhere (MVA) |
| Voltage | $\text{kV}_{base}$ per zone (line-to-line) |
| Current | $I_{base} = \frac{\text{MVA}}{\sqrt3\,\text{kV}}$ (kA) |
| Impedance | $Z_{base} = \frac{\text{kV}^2}{\text{MVA}}$ (Ω) |
| Change of base | $Z_{new} = Z_{old}\left(\frac{\text{kV}_{old}}{\text{kV}_{new}}\right)^2\frac{\text{MVA}_{new}}{\text{MVA}_{old}}$ |`,
        r`Nameplate impedances are on the equipment's own rating; convert each to the system base before adding them.`,
      ],
      keyIdeas: [
        r`One MVA base everywhere; the kV base steps through each transformer by its ratio.`,
        r`$Z_{base} = \frac{\text{kV}^2}{\text{MVA}}$, $I_{base} = \frac{\text{MVA}}{\sqrt3\,\text{kV}}$.`,
        r`Change of base: $Z_{new} = Z_{old}\left(\frac{\text{kV}_{old}}{\text{kV}_{new}}\right)^2\frac{\text{MVA}_{new}}{\text{MVA}_{old}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A generator on a new base',
          problem: r`A 50 MVA, 13.2 kV generator has $X'' = 0.15$ pu. Put it on a 100 MVA, 13.8 kV base, and find that zone's base impedance and current.`,
          steps: [
            r`$X = 0.15\left(\frac{13.2}{13.8}\right)^2 \times \frac{100}{50} = 0.274$ pu.`,
            r`$Z_{base} = \frac{13.8^2}{100} = 1.904$ Ω; $I_{base} = \frac{100}{\sqrt3 \times 13.8} = 4.184$ kA.`,
          ],
          answer: r`0.274 pu; 1.904 Ω; 4.184 kA.`,
        },
        {
          level: 'board',
          title: 'Bases through a transformer',
          problem: r`A 13.8/138 kV transformer joins the generator's zone to a line. With 100 MVA and 13.8 kV on the generator side, find the line zone's base voltage, impedance and current, and a 40 Ω line's per-unit impedance.`,
          steps: [
            r`$\text{kV}_{base} = 13.8 \times \frac{138}{13.8} = 138$ kV.`,
            r`$Z_{base} = \frac{138^2}{100} = 190.4$ Ω; $I_{base} = \frac{100}{\sqrt3 \times 138} = 418.4$ A.`,
            r`$Z_{line} = \frac{40}{190.4} = 0.210$ pu.`,
          ],
          answer: r`138 kV, 190.4 Ω, 418.4 A; 0.210 pu.`,
        },
      ],
      traps: [
        r`Voltage ratio old over new, SQUARED; MVA new over old.`,
        r`Per-unit current must be multiplied by the base current of ITS zone.`,
      ],
      check: [
        { q: r`What is the base impedance at 69 kV on 100 MVA?`, a: r`$\frac{69^2}{100} = 47.61$ Ω.` },
        { q: r`Why does a transformer's per-unit impedance not depend on the side?`, a: r`Each side's base impedance scales by the square of the ratio, as its ohmic impedance does.` },
      ],
    },
    {
      name: 'One-Line and Impedance Diagrams',
      inShort: r`A balanced three-phase system drawn as one line, then as per-unit impedances.`,
      body: [
        r`A balanced three-phase system needs only one phase to describe it, so it is drawn as a **one-line diagram**: generators, transformers, buses, lines, breakers and loads in standard symbols.`,
        {
          type: 'circuit',
          alt: 'A one-line diagram: a generator on bus 1, a transformer to bus 2, a line to bus 3, and a load at bus 3.',
          caption: 'A one-line diagram: generator, transformer, line and load between three buses.',
          parts: [
            ['gen', [0, 1], [1, 1], 'G'],
            ['bus', [1, 0.5], [1, 1.5], '1'],
            ['xfmr', [1, 1], [3, 1], 'T'],
            ['bus', [3, 0.5], [3, 1.5], '2'],
            ['wire', [3, 1], [6, 1]],
            ['text', [4.5, 0.5], 'line'],
            ['bus', [6, 0.5], [6, 1.5], '3'],
            ['load', [6, 1], [6, 2.5], 'load'],
          ],
        },
        r`For calculation it becomes an **impedance (reactance) diagram** in per unit: each generator an EMF behind its reactance, each transformer and line a series impedance (with line charging where it matters), each load an impedance $Z = \frac{V^2}{S^*}$.`,
        {
          type: 'circuit',
          alt: 'The impedance diagram of the same system: the generator EMF in series with the generator, transformer and line reactances, feeding the load impedance.',
          caption: 'The same system as per-unit impedances: the transformer is just a reactance now.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'E_g'],
            ['L', [0, 0], [1.5, 0], 'jX_g'],
            ['L', [1.5, 0], [3, 0], 'jX_T'],
            ['L', [3, 0], [4.5, 0], 'jX_L'],
            ['R', [4.5, 0], [4.5, 2], 'Z_{load}'],
            ['wire', [4.5, 2], [0, 2]],
          ],
        },
      ],
      keyIdeas: [
        r`Generators: an EMF behind a reactance; transformers and lines: series impedances (shunts where needed).`,
        r`Loads as impedances: $Z = \frac{V^2}{S^*}$ (lagging load: R + jX).`,
        r`Neglect resistance, shunts and loads for fault studies unless told otherwise.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A load as an impedance',
          problem: r`A 10 MVA load at 0.8 lagging is rated 13.8 kV. Find its impedance in ohms and in per unit on 100 MVA, 13.8 kV.`,
          steps: [
            r`$\lvert Z\rvert = \frac{13.8^2}{10} = 19.04$ Ω at +36.87°: $15.24 + j11.43$ Ω.`,
            r`On $Z_{base} = 1.904$ Ω: $8 + j6$ pu.`,
          ],
          answer: r`$15.24 + j11.43$ Ω; $8 + j6$ pu.`,
        },
        {
          level: 'board',
          title: 'A series reactance diagram',
          problem: r`On 100 MVA, the generator is 0.274 pu, the transformer 0.10 pu on its own 100 MVA, 13.8/138 kV rating, and the line 40 Ω at 138 kV. Find the total reactance from the generator's EMF to bus 3.`,
          steps: [
            r`Transformer: already on the system base, 0.10 pu. Line: $\frac{40}{190.4} = 0.210$ pu.`,
            r`Total: $0.274 + 0.10 + 0.210 = 0.584$ pu.`,
          ],
          answer: r`0.584 pu.`,
        },
      ],
      traps: [
        r`Use the CONJUGATE of S: a lagging load must come out inductive.`,
        r`Each impedance must be on the system base before they are added.`,
      ],
      check: [
        { q: r`What is a load of $1 + j0$ pu power at 1 pu voltage as an impedance?`, a: r`1 pu resistance.` },
        { q: r`Why can a balanced system be drawn as one line?`, a: r`The three phases are identical, 120° apart: one phase with a neutral return describes them all.` },
      ],
    },
    {
      name: 'Line Resistance, Inductance and Capacitance',
      inShort: r`Line parameters from geometry: GMR for inductance, radius for capacitance, GMD for spacing.`,
      body: [
        r`A line's **resistance** is $\rho\frac{\ell}{A}$ at dc, raised on ac by the **skin effect**: $R_{ac} = kR_{dc}$ with $k = \frac{1 + \sqrt{1 + F^2}}{2}$, where $F = 0.0105d^2f$ for copper and $0.0063d^2f$ for aluminium (d in inches). It grows with frequency, diameter and conductivity.`,
        r`**Inductance** per phase is $L = 2 \times 10^{-7}\ln\frac{D_{eq}}{D_s}$ H/m: the conductors' spacing, as the geometric mean distance $D_{eq} = \sqrt[3]{D_{ab}D_{bc}D_{ca}}$ (transposed), against each conductor's own geometric mean radius $D_s$ (0.7788r for a solid round wire). **Capacitance** to neutral is $C_n = \frac{2\pi\varepsilon_0}{\ln(D_{eq}/r)}$, with the actual radius. **Bundling** two to four conductors per phase raises the effective radius, cutting reactance and corona:`,
        {
          type: 'plot',
          alt: 'Reactance per kilometre at 60 Hz against the equivalent spacing, for a single conductor and for 2, 3 and 4-conductor bundles: each curve rises slowly with spacing, and each bigger bundle sits lower.',
          caption: 'Reactance against spacing at 60 Hz: each bundle size lowers the reactance by a fixed step.',
          x: [2, 15],
          y: [0, 0.75],
          xLabel: 'D_{eq} (m)',
          yLabel: 'X (Ω/km)',
          series: [
            { f: (D) => 0.0754 * Math.log(D / 0.0122), label: 'single' },
            { f: (D) => 0.0754 * Math.log(D / Math.sqrt(0.0122 * 0.45)), label: '2-bundle' },
            { f: (D) => 0.0754 * Math.log(D / Math.cbrt(0.0122 * 0.45 ** 2)), label: '3-bundle', dashed: true },
            { f: (D) => 0.0754 * Math.log(D / (1.09 * (0.0122 * 0.45 ** 3) ** 0.25)), label: '4-bundle', dashed: true },
          ],
        },
        r`| Bundle | GMR for L | Radius for C |
|---|---|---|
| 2 | $\sqrt{D_sd}$ | $\sqrt{rd}$ |
| 3 | $\sqrt[3]{D_sd^2}$ | $\sqrt[3]{rd^2}$ |
| 4 | $1.09\sqrt[4]{D_sd^3}$ | $1.09\sqrt[4]{rd^3}$ |`,
      ],
      keyIdeas: [
        r`$L = 2 \times 10^{-7}\ln\frac{D_{eq}}{D_s}$ H/m; solid $D_s = 0.7788r$; at 60 Hz $X = 0.0754\ln\frac{D_{eq}}{D_s}$ Ω/km.`,
        r`$C_n = \frac{2\pi\varepsilon_0}{\ln(D_{eq}/r)}$ F/m; $D_{eq} = \sqrt[3]{D_{ab}D_{bc}D_{ca}}$.`,
        r`$R_{ac} = kR_{dc}$, $k = \frac{1 + \sqrt{1 + F^2}}{2}$; bundles lower L, raise C and reduce corona.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reactance of a bundled line',
          problem: r`A flat three-phase line has 8 m phase spacing and two-conductor bundles 0.45 m apart, each with GMR 0.0122 m. Find the reactance per km at 60 Hz.`,
          steps: [
            r`Bundle GMR $= \sqrt{0.0122 \times 0.45} = 0.0741$ m.`,
            r`Flat spacing: $D_{eq} = \sqrt[3]{8 \times 8 \times 16} = 8\sqrt[3]{2} = 10.08$ m.`,
            r`$X = 0.0754\ln\frac{10.08}{0.0741} = 0.370$ Ω/km.`,
          ],
          answer: r`0.370 Ω/km.`,
        },
        {
          level: 'board',
          title: 'AC resistance from the skin effect',
          problem: r`A copper conductor 0.8 in in diameter has a dc resistance of 0.05 Ω/km. Find its resistance at 60 Hz.`,
          steps: [
            r`$F = 0.0105 \times 0.8^2 \times 60 = 0.4032$.`,
            r`$k = \frac{1 + \sqrt{1 + 0.4032^2}}{2} = 1.039$.`,
            r`$R_{ac} = 1.039 \times 0.05 = 0.0520$ Ω/km.`,
          ],
          answer: r`0.0520 Ω/km, 3.9% above dc.`,
        },
      ],
      traps: [
        r`Inductance uses GMR; capacitance uses the actual radius (bundle: $\sqrt{rd}$).`,
        r`Flat spacing D, D, 2D gives $D_{eq} = D\sqrt[3]{2}$, not D.`,
      ],
      check: [
        { q: r`What is the GMR of a solid round conductor of radius r?`, a: r`$0.7788r$.` },
        { q: r`What is transposition for?`, a: r`To balance the three phases' inductance and capacitance.` },
      ],
    },
    {
      name: 'Short, Medium and Long Lines',
      inShort: r`How much of the line's capacitance to model depends on its length.`,
      body: [
        r`| Length | Model | What it keeps |
|---|---|---|
| Short, up to 80 km | series Z | resistance and inductance |
| Medium, 80 to 240 km | nominal π or T | adds the capacitance, lumped |
| Long, over 240 km | distributed (hyperbolic) | everything, spread along the line |`,
        {
          type: 'circuit',
          alt: 'The nominal pi model of a medium line: the sending source, half the shunt admittance to ground at each end, and the series resistance and reactance between, feeding the load.',
          caption: 'The nominal π: the series impedance with half the line charging at each end.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'V_s'],
            ['wire', [0, 0], [1, 0]],
            ['C', [1, 0], [1, 2], 'Y/2'],
            ['R', [1, 0], [2.5, 0], 'R'],
            ['L', [2.5, 0], [4, 0], 'jX'],
            ['C', [4, 0], [4, 2], 'Y/2'],
            ['wire', [4, 0], [5.5, 0]],
            ['R', [5.5, 0], [5.5, 2], 'load'],
            ['wire', [5.5, 2], [0, 2]],
            ['dot', [1, 0]],
            ['dot', [1, 2]],
            ['dot', [4, 0]],
            ['dot', [4, 2]],
          ],
        },
        r`On a long line the waves travel at nearly the speed of light, and at 60 Hz the wavelength is about 5000 km. The line's charging current raises the voltage along it: an open or lightly loaded line's far end sits ABOVE the sending voltage, the **Ferranti effect**, $V_r = \frac{V_s}{\lvert A\rvert}$:`,
        {
          type: 'plot',
          alt: 'Receiving-end voltage of an open, lossless 60 Hz line against its length: 1.018 at 150 km, rising faster with length, to 1.24 at 500 km.',
          caption: 'The Ferranti rise on an open lossless line: small at 150 km, 24% at 500 km.',
          x: [0, 700],
          y: [0.9, 1.8],
          xLabel: 'length (km)',
          yLabel: 'V_r / V_s',
          series: [{ f: (l) => 1 / Math.cos((2 * Math.PI * l) / 5000), label: 'V_r' }],
          marks: [{ x: 500, label: '1.24' }],
        },
        r`A lossless line loaded with its own surge impedance $Z_c = \sqrt{\frac{L}{C}}$ has a flat voltage profile; that power is the **surge impedance loading**, $\text{SIL} = \frac{\text{kV}^2}{Z_c}$ MW.`,
      ],
      keyIdeas: [
        r`Short (up to 80 km): series Z only. Medium (80 to 240 km): nominal π, $A = 1 + \frac{YZ}{2}$, $B = Z$.`,
        r`Long: $A = \cosh\gamma\ell$, $B = Z_c\sinh\gamma\ell$, $\gamma = \sqrt{zy}$, $\lambda = \frac{2\pi}{\beta}$.`,
        r`Ferranti: an open line's far end rises to $\frac{V_s}{\lvert A\rvert}$. SIL $= \frac{\text{kV}^2}{Z_c}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A short line',
          problem: r`A 30 km, 33 kV line has $0.2 + j0.4$ Ω/km and delivers 10 MW at 33 kV, 0.8 lagging. Find the sending-end voltage, the regulation and the efficiency.`,
          steps: [
            r`$Z = 6 + j12$ Ω; $I = \frac{10 \times 10^6}{\sqrt3 \times 33\,000 \times 0.8} = 218.7$ A; $V_r = 19\,053$ V per phase.`,
            r`$\mathbf{V}_s = 19\,053 + 218.7\angle{-36.87°}(6 + j12)$, $\lvert V_s\rvert = 21\,717$ V per phase, 37.61 kV line.`,
            r`VR $= \frac{21\,717 - 19\,053}{19\,053} = 13.98\%$. Loss $= 3 \times 218.7^2 \times 6 = 860.9$ kW; $\eta = \frac{10}{10.861} = 92.07\%$.`,
          ],
          answer: r`37.61 kV; 13.98%; 92.07%.`,
        },
        {
          level: 'board',
          title: 'A medium line, open at the far end',
          problem: r`A 150 km line has $Z = 4.5 + j52.5$ Ω and $Y = j660$ µS. Find A for the nominal π, and the open-circuit receiving voltage with 230 kV at the sending end.`,
          steps: [
            r`$A = 1 + \frac{(j660 \times 10^{-6})(4.5 + j52.5)}{2} = 0.9827 + j0.0015$, $\lvert A\rvert = 0.9827$.`,
            r`$V_{r,NL} = \frac{230}{0.9827} = 234.1$ kV: higher than the sending end.`,
          ],
          answer: r`$A = 0.9827$; 234.1 kV.`,
        },
      ],
      traps: [
        r`Work per phase: line voltage $\div\sqrt3$ before using the ABCD equations.`,
        r`On a lightly loaded line the receiving voltage can exceed the sending voltage.`,
      ],
      check: [
        { q: r`A 230 kV line has $Z_c = 400$ Ω. What is its SIL?`, a: r`$\frac{230^2}{400} = 132$ MW.` },
        { q: r`What is the wavelength of 60 Hz on a lossless line?`, a: r`About 5000 km.` },
      ],
    },
    {
      name: 'ABCD Constants',
      inShort: r`Any line or network as $V_s = AV_r + BI_r$, $I_s = CV_r + DI_r$.`,
      body: [
        r`Every line model, and any two-port network, is summed up by four **generalized circuit constants**: $V_s = AV_r + BI_r$ and $I_s = CV_r + DI_r$. A is a voltage ratio, B an impedance, C an admittance, D a current ratio.`,
        r`| Model | A = D | B | C |
|---|---|---|---|
| Short | 1 | Z | 0 |
| Nominal π | $1 + \frac{YZ}{2}$ | Z | $Y\left(1 + \frac{YZ}{4}\right)$ |
| Nominal T | $1 + \frac{YZ}{2}$ | $Z\left(1 + \frac{YZ}{4}\right)$ | Y |
| Long | $\cosh\gamma\ell$ | $Z_c\sinh\gamma\ell$ | $\frac{\sinh\gamma\ell}{Z_c}$ |`,
        r`Every passive network has $AD - BC = 1$, and a symmetric one has $A = D$. Networks in cascade multiply their ABCD matrices, sending end first. At no load, $I_r = 0$, so $V_{r,NL} = \frac{V_s}{A}$, which is what regulation needs.`,
      ],
      keyIdeas: [
        r`Symmetric networks have $A = D$; every passive one has $AD - BC = 1$.`,
        r`Networks in series multiply their ABCD matrices, sending end first.`,
        r`Regulation $= \frac{\lvert V_s\rvert/\lvert A\rvert - \lvert V_{r,FL}\rvert}{\lvert V_{r,FL}\rvert}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Regulation from A',
          problem: r`The 150 km line of the last subtopic needs 240 kV at the sending end to hold 220 kV at the receiving end at full load. Find its regulation.`,
          steps: [
            r`$V_{r,NL} = \frac{240}{0.9827} = 244.2$ kV.`,
            r`VR $= \frac{244.2 - 220}{220} = 11.0\%$.`,
          ],
          answer: r`11.0%.`,
        },
        {
          level: 'board',
          title: 'C, and the check $AD - BC = 1$',
          problem: r`For the same nominal π ($Z = 4.5 + j52.5$ Ω, $Y = j660$ µS), find C and confirm $AD - BC = 1$.`,
          steps: [
            r`$C = Y\left(1 + \frac{YZ}{4}\right) = j660 \times 10^{-6}(0.99134 + j0.00074) = -4.9 \times 10^{-7} + j6.543 \times 10^{-4}$ S.`,
            r`$A = D = 0.982675 + j0.001485$; $AD - BC$ works out to $1.000 + j0.000$.`,
          ],
          answer: r`$C \approx j654.3$ µS; $AD - BC = 1$.`,
        },
      ],
      traps: [
        r`Use $V_s/\lvert A\rvert$, not $V_s$, for the no-load receiving voltage of a line with capacitance.`,
        r`The nominal π and T share A but not B and C.`,
      ],
      check: [
        { q: r`What are A, B, C, D for a short line of impedance Z?`, a: r`1, Z, 0, 1.` },
        { q: r`Which identity holds for every passive two-port?`, a: r`$AD - BC = 1$.` },
      ],
    },
    {
      name: 'Power Circle Diagrams',
      inShort: r`Receiving-end P and Q trace a circle as the angle δ changes.`,
      body: [
        r`With $A = \lvert A\rvert\angle\alpha$, $B = \lvert B\rvert\angle\beta$ and the sending voltage δ ahead of the receiving voltage, the receiving-end complex power is $S_r = \frac{\lvert V_s\rvert\lvert V_r\rvert}{\lvert B\rvert}\angle(\beta - \delta) - \frac{\lvert A\rvert\lvert V_r\rvert^2}{\lvert B\rvert}\angle(\beta - \alpha)$. For fixed voltages, the second term is a fixed centre and the first a radius swinging with δ: the **receiving-end power circle**. Real power peaks when $\delta = \beta$:`,
        {
          type: 'plot',
          alt: 'Receiving-end real power against the power angle for a line with A 0.98 at 0.1 degrees and B 100 ohms at 85 degrees, 230 kV at both ends: rising to a peak of 483 MW at 85 degrees, then falling.',
          caption: 'Receiving-end power against δ: the peak, 483 MW, comes at δ = β = 85°.',
          x: [0, 180],
          y: [-150, 600],
          xLabel: 'δ (°)',
          yLabel: 'P_r (MW)',
          series: [{ f: (d) => 529 * Math.cos((85 - d) * deg) - 0.98 * 529 * Math.cos(84.9 * deg), label: 'P_r' }],
          marks: [{ y: 529 - 0.98 * 529 * Math.cos(84.9 * deg), label: 'P max 483 MW' }],
        },
        r`For a short lossless line ($A = 1$, $B = jX$) this reduces to the familiar $P = \frac{V_sV_r}{X}\sin\delta$, with its limit at 90°.`,
      ],
      keyIdeas: [
        r`$S_r = \frac{\lvert V_s\rvert\lvert V_r\rvert}{\lvert B\rvert}\angle(\beta - \delta) - \frac{\lvert A\rvert\lvert V_r\rvert^2}{\lvert B\rvert}\angle(\beta - \alpha)$.`,
        r`Fixed centre, radius $\frac{\lvert V_s\rvert\lvert V_r\rvert}{\lvert B\rvert}$; $P_{r,\max}$ at $\delta = \beta$.`,
        r`Short lossless line: $P = \frac{V_sV_r}{X}\sin\delta$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The largest receiving power',
          problem: r`A line has $A = 0.98\angle0.1°$, $B = 100\angle85°$ Ω, with 230 kV at both ends. Find the largest receiving-end power.`,
          steps: [
            r`Radius $\frac{230^2}{100} = 529$ MW; centre term $\frac{0.98 \times 230^2}{100} = 518.4$ at $\beta - \alpha = 84.9°$.`,
            r`$P_{\max} = 529 - 518.4\cos84.9° = 529 - 46.1 = 482.9$ MW.`,
          ],
          answer: r`About 483 MW.`,
        },
        {
          level: 'board',
          title: 'A short lossless line',
          problem: r`A short line of $X = 50$ Ω joins two 138 kV buses 20° apart. Find the power it carries and its steady-state limit.`,
          steps: [
            r`$P = \frac{138^2}{50}\sin20° = 380.9 \times 0.342 = 130.3$ MW.`,
            r`Limit at 90°: 380.9 MW.`,
          ],
          answer: r`130.3 MW; 380.9 MW.`,
        },
      ],
      traps: [
        r`With line voltages in kV and B in ohms the result is in MW (three phase).`,
        r`The peak is at δ = β, not 90°, once resistance is included.`,
      ],
      check: [
        { q: r`What is the radius of the receiving-end circle?`, a: r`$\frac{\lvert V_s\rvert\lvert V_r\rvert}{\lvert B\rvert}$.` },
        { q: r`Doubling both end voltages changes the power limit how?`, a: r`It quadruples.` },
      ],
    },
    {
      name: 'Bus Admittance Matrix',
      inShort: r`The network's nodal equations, $\mathbf{I} = Y_{bus}\mathbf{V}$, written by inspection.`,
      body: [
        r`Nodal analysis of a power network gives $\mathbf{I} = Y_{bus}\mathbf{V}$, and $Y_{bus}$ can be written straight from the diagram: each **diagonal** element $Y_{ii}$ is the sum of all admittances connected to bus i (shunts included); each **off-diagonal** $Y_{ij}$ is minus the admittance between buses i and j.`,
        {
          type: 'circuit',
          alt: 'A three-bus network: bus 1 joined to bus 2 by j0.2 per unit and to bus 3 by j0.25, and buses 2 and 3 joined by j0.1.',
          caption: 'A three-bus network in per-unit impedances.',
          parts: [
            ['L', [0, 0], [3, 0], 'j0.2'],
            ['wire', [0, 0], [0, 2]],
            ['L', [0, 2], [3, 2], 'j0.25', { side: 'below' }],
            ['L', [3, 0], [3, 2], 'j0.1'],
            ['dot', [0, 1]],
            ['dot', [3, 0]],
            ['dot', [3, 2]],
          ],
          nodes: [{ at: [0, 1], label: 'bus 1', side: 'nw' }, { at: [3, 0], label: 'bus 2', side: 'ne' }, { at: [3, 2], label: 'bus 3', side: 'se' }],
        },
        r`$Y_{bus}$ is sparse (most buses connect to few others) and symmetric. Its inverse, $Z_{bus}$, is full; its diagonal elements are the Thévenin impedances at each bus, which fault studies need. Buses with no injection can be removed by **Kron reduction**: $Y_{ij}' = Y_{ij} - \frac{Y_{ik}Y_{kj}}{Y_{kk}}$.`,
      ],
      keyIdeas: [
        r`$Y_{ii}$ = sum of admittances at bus i (including shunts); $Y_{ij} = -y_{ij}$.`,
        r`Sparse and symmetric; $Z_{bus} = Y_{bus}^{-1}$ is full, its diagonal the Thévenin impedances.`,
        r`Kron reduction removes buses with no injection: $Y_{ij} - \frac{Y_{ik}Y_{kj}}{Y_{kk}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two elements of Y-bus',
          problem: r`Lines of $j0.2$ pu (bus 1 to 2) and $j0.25$ pu (bus 1 to 3). Find $Y_{11}$ and $Y_{12}$.`,
          steps: [
            r`$y_{12} = \frac{1}{j0.2} = -j5$, $y_{13} = \frac{1}{j0.25} = -j4$.`,
            r`$Y_{11} = -j5 - j4 = -j9$ pu; $Y_{12} = -y_{12} = +j5$ pu.`,
          ],
          answer: r`$Y_{11} = -j9$, $Y_{12} = +j5$ pu.`,
        },
        {
          level: 'board',
          title: 'The whole matrix',
          problem: r`Add the line $j0.1$ pu between buses 2 and 3 of the figure. Write $Y_{bus}$.`,
          steps: [
            r`$y_{23} = -j10$. Diagonals: $Y_{11} = -j9$, $Y_{22} = -j5 - j10 = -j15$, $Y_{33} = -j4 - j10 = -j14$.`,
            r`Off-diagonals: $Y_{12} = j5$, $Y_{13} = j4$, $Y_{23} = j10$ (symmetric).`,
          ],
          answer: r`$Y_{bus} = j\begin{bmatrix} -9 & 5 & 4 \\ 5 & -15 & 10 \\ 4 & 10 & -14 \end{bmatrix}$ pu.`,
        },
      ],
      traps: [
        r`Off-diagonal elements carry a MINUS sign.`,
        r`Shunt elements (line charging, capacitors) go on the diagonal only.`,
      ],
      check: [
        { q: r`Why is Y-bus sparse?`, a: r`Each bus connects to only a few others; every unconnected pair gives a zero.` },
        { q: r`What does the diagonal of Z-bus hold?`, a: r`The Thévenin impedance at each bus.` },
      ],
    },
    {
      name: 'Load Flow',
      inShort: r`Solving the network's voltages from the power each bus injects.`,
      body: [
        r`Load flow (power flow) finds every bus voltage from what is specified at each bus. Since power is quadratic in voltage, the equations are nonlinear and solved by iteration.`,
        r`| Bus | Specified | Found |
|---|---|---|
| Slack (swing) | $\lvert V\rvert$, δ = 0 | P, Q (takes up the losses) |
| PV (generator) | P, $\lvert V\rvert$ | Q, δ |
| PQ (load) | P, Q | $\lvert V\rvert$, δ |`,
        r`**Gauss-Seidel** updates one bus at a time, $V_i = \frac{1}{Y_{ii}}\left[\frac{P_i - jQ_i}{V_i^*} - \sum_{j \ne i}Y_{ij}V_j\right]$: simple, slow to converge. **Newton-Raphson** corrects all buses at once through the Jacobian: fast, the standard. The **DC load flow** linearizes the real power, $P_{ij} \approx \frac{\delta_i - \delta_j}{X_{ij}}$, a quick estimate that is good while the angles stay small:`,
        {
          type: 'plot',
          alt: 'Power over a line of 0.2 per unit reactance against the angle across it: the exact sine curve and the straight DC load-flow line, close up to about 20 degrees and drifting apart beyond.',
          caption: 'The DC load flow (dashed) against the exact P = sin δ / X: close for small angles.',
          x: [0, 60],
          y: [0, 6],
          xLabel: 'δ (°)',
          yLabel: 'P (pu)',
          series: [
            { f: (d) => Math.sin(d * deg) / 0.2, label: 'exact' },
            { f: (d) => (d * deg) / 0.2, label: 'DC estimate', dashed: true },
          ],
        },
      ],
      keyIdeas: [
        r`Slack bus (V, δ known), PV buses (P, |V|), PQ buses (P, Q).`,
        r`Gauss-Seidel updates one bus at a time; Newton-Raphson corrects all at once with the Jacobian.`,
        r`DC load flow: $P_{ij} \approx \frac{\delta_i - \delta_j}{X_{ij}}$; real power follows angle, reactive power follows voltage.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A DC load-flow estimate',
          problem: r`Bus 1 leads bus 2 by 0.1 rad across a line of $X = 0.2$ pu on 100 MVA. Estimate the flow.`,
          steps: [r`$P \approx \frac{0.1}{0.2} = 0.5$ pu = 50 MW, from bus 1 to bus 2.`],
          answer: r`50 MW.`,
        },
        {
          level: 'board',
          title: 'One Gauss-Seidel step',
          problem: r`A slack bus at $1\angle0°$ feeds bus 2 through $j0.1$ pu. Bus 2 draws $0.5 + j0.2$ pu. Starting from $V_2 = 1\angle0°$, do one Gauss-Seidel update.`,
          steps: [
            r`$y = -j10$: $Y_{22} = -j10$, $Y_{21} = j10$. Injection $P_2 - jQ_2 = -0.5 + j0.2$.`,
            r`$V_2 = \frac{1}{-j10}\left[\frac{-0.5 + j0.2}{1} - j10(1)\right] = j0.1(-0.5 - j9.8) = 0.98 - j0.05$.`,
            r`$\lvert V_2\rvert = 0.9813$ at $-2.92°$.`,
          ],
          answer: r`$V_2 \approx 0.9813\angle{-2.92°}$ pu after one step.`,
        },
      ],
      traps: [
        r`A load is a NEGATIVE injection: $P_i = -P_{load}$.`,
        r`Real power follows angle; reactive power follows voltage magnitude.`,
      ],
      check: [
        { q: r`What is specified at a PV bus?`, a: r`Real power and voltage magnitude.` },
        { q: r`Which bus supplies the system losses?`, a: r`The slack (swing) bus.` },
      ],
    },
    {
      name: 'Symmetrical Faults',
      inShort: r`A balanced three-phase fault: the Thévenin impedance at the fault sets the current.`,
      body: [
        r`A three-phase fault is balanced, so one per-unit circuit solves it: $I_f = \frac{V_f}{Z_{th} + Z_f}$, with the prefault voltage (usually 1 pu) behind the Thévenin impedance at the fault. Short-circuit MVA $= \frac{\text{MVA}_{base}}{Z_{pu}}$. A generator's current is not steady: it decays from **subtransient** through **transient** to **steady state** as its reactance rises from $X''_d$ to $X'_d$ to $X_d$:`,
        {
          type: 'plot',
          alt: 'The envelope of a generator’s fault current against time: 5 per unit at the instant of the fault, falling quickly within a few cycles to about 3.3, then slowly over seconds to 0.83 per unit.',
          caption: 'Fault current from a generator (X″ = 0.2, X′ = 0.3, Xd = 1.2 pu): subtransient, transient, then steady state.',
          x: [0, 6],
          y: [0, 5.5],
          xLabel: 't (s)',
          yLabel: 'I (pu)',
          series: [{ f: (t) => 1 / 1.2 + (1 / 0.3 - 1 / 1.2) * Math.exp(-t) + (1 / 0.2 - 1 / 0.3) * Math.exp(-t / 0.03), label: 'I', area: true }],
          marks: [{ y: 1 / 1.2, label: 'steady 0.83 pu' }],
        },
        r`Breakers are chosen for both duties. For breakers above 600 V, the **interrupting** rating is the symmetrical current times a factor for the breaker's speed (1.0 for 8 cycles, 1.1 for 5, 1.3 for 3, 1.4 for 1.5 cycles), and the **momentary** rating the symmetrical current times 1.6 (1.5 if fed directly from a generator).`,
      ],
      keyIdeas: [
        r`$I_f = \frac{V_f}{Z_{th} + Z_f}$ pu; $\text{MVA}_{sc} = \frac{\text{MVA}_{base}}{Z_{pu}}$.`,
        r`Z-bus: $I_f = \frac{V_f}{Z_{kk}}$, $V_i = V_f - Z_{ik}I_f$.`,
        r`Current decays from subtransient ($X''_d$) to transient ($X'_d$) to steady state ($X_d$).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Fault current and MVA',
          problem: r`A generator ($X'' = 0.2$), transformer (0.1) and line (0.1 pu, on 100 MVA) feed a fault at 138 kV. Find the fault current and MVA.`,
          steps: [
            r`$Z_{th} = 0.4$ pu: $I_f = \frac{1}{0.4} = 2.5$ pu.`,
            r`$I_{base} = \frac{100}{\sqrt3 \times 138} = 418.4$ A, so $I_f = 1046$ A; $\text{MVA}_{sc} = \frac{100}{0.4} = 250$ MVA.`,
          ],
          answer: r`1046 A; 250 MVA.`,
        },
        {
          level: 'board',
          title: 'Breaker ratings',
          problem: r`A 13.8 kV bus has a symmetrical three-phase fault current of 5 kA. Find the interrupting current and MVA for a 3-cycle breaker, and the momentary current.`,
          steps: [
            r`Interrupting: $1.3 \times 5 = 6.5$ kA; $\sqrt3 \times 13.8 \times 6.5 = 155.4$ MVA.`,
            r`Momentary: $1.6 \times 5 = 8$ kA.`,
          ],
          answer: r`6.5 kA, 155.4 MVA; 8 kA momentary.`,
        },
      ],
      traps: [
        r`Multiply per-unit current by the base current of the FAULTED zone.`,
        r`Use subtransient reactances for breaker duty in the first cycles.`,
      ],
      check: [
        { q: r`A bus has a Thévenin impedance of 0.05 pu on 100 MVA. What is its short-circuit MVA?`, a: r`2000 MVA.` },
        { q: r`Which reactance limits the fault current in the first few cycles?`, a: r`The subtransient reactance $X''_d$.` },
      ],
    },
    {
      name: 'Symmetrical Components',
      inShort: r`Any unbalanced set as the sum of balanced positive, negative and zero sequences.`,
      body: [
        r`Fortescue showed that any three unbalanced phasors are the sum of three balanced sets: **positive** sequence (abc), **negative** sequence (acb), and **zero** sequence (all in phase). With $a = 1\angle120°$:`,
        r`$$I_0 = \tfrac13(I_a + I_b + I_c), \quad I_1 = \tfrac13(I_a + aI_b + a^2I_c), \quad I_2 = \tfrac13(I_a + a^2I_b + aI_c)$$`,
        r`Each sequence sees its own impedance network. Rotating machines have different $Z_1$, $Z_2$, $Z_0$; lines and transformers have $Z_1 = Z_2$. Zero-sequence current needs a return path through ground, so it depends on connections:`,
        r`| Connection | Zero-sequence path |
|---|---|
| Grounded wye | yes; a neutral impedance appears as $3Z_n$ |
| Ungrounded wye | none |
| Delta | circulates inside the delta, none on the lines |
| Grounded wye-delta transformer | from the wye side to ground only |`,
      ],
      keyIdeas: [
        r`$I_0 = \frac{I_a + I_b + I_c}{3}$, $I_1 = \frac{I_a + aI_b + a^2I_c}{3}$, $I_2 = \frac{I_a + a^2I_b + aI_c}{3}$.`,
        r`$S = 3(V_0I_0^* + V_1I_1^* + V_2I_2^*)$.`,
        r`Zero sequence needs a ground path: a neutral impedance appears as $3Z_n$; Δ windings block it.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A grounded generator',
          problem: r`A grounded-Y generator has $Z_0 = j0.1$ pu and is grounded through $j0.05$ pu. Find its zero-sequence impedance in the network.`,
          steps: [r`$Z_0 = j0.1 + 3(j0.05) = j0.25$ pu.`],
          answer: r`$j0.25$ pu.`,
        },
        {
          level: 'board',
          title: 'Components of a line-to-line current',
          problem: r`Find the sequence components of $I_a = 10\angle0°$, $I_b = 10\angle180°$, $I_c = 0$ A.`,
          steps: [
            r`$I_0 = \frac{10 - 10 + 0}{3} = 0$: no ground current.`,
            r`$I_1 = \frac{10 + a(-10)}{3} = \frac{10(1 - a)}{3} = 5.774\angle{-30°}$ A.`,
            r`$I_2 = \frac{10(1 - a^2)}{3} = 5.774\angle30°$ A.`,
          ],
          answer: r`$I_0 = 0$; $I_1 = 5.774\angle{-30°}$; $I_2 = 5.774\angle30°$ A.`,
        },
      ],
      traps: [
        r`The neutral impedance counts THREE times, and only in the zero sequence.`,
        r`A delta winding blocks zero-sequence current from the lines but lets it circulate inside.`,
      ],
      check: [
        { q: r`Which sequence is all three phasors in phase?`, a: r`Zero sequence.` },
        { q: r`Three balanced currents have which sequence components?`, a: r`Positive only.` },
      ],
    },
    {
      name: 'Unsymmetrical Faults',
      inShort: r`Connect the sequence networks to match the fault, then rebuild the phase currents.`,
      body: [
        r`Each unsymmetrical fault connects the sequence networks in its own way. A **single line-to-ground** fault puts all three in series, so $I_{a1} = I_{a2} = I_{a0}$:`,
        {
          type: 'circuit',
          alt: 'The single line-to-ground fault: the prefault voltage in series with the positive, negative and zero-sequence impedances and three times the fault impedance, carrying one current.',
          caption: 'A single line-to-ground fault: the three sequence networks and 3Zf in series.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'V_f'],
            ['L', [0, 0], [2, 0], 'Z_1'],
            ['L', [2, 0], [4, 0], 'Z_2'],
            ['L', [4, 0], [4, 2], 'Z_0'],
            ['R', [4, 2], [2, 2], '3Z_f', { side: 'below' }],
            ['wire', [2, 2], [0, 2]],
            ['i', [1.5, 2], [0.5, 2], 'I_{a1}'],
          ],
        },
        r`| Fault | Networks | Fault current |
|---|---|---|
| Three-phase | positive only | $\frac{V_f}{Z_1}$ |
| Single line-to-ground | all in series | $3I_{a1} = \frac{3V_f}{Z_1 + Z_2 + Z_0 + 3Z_f}$ |
| Line-to-line | positive and negative in parallel | $\sqrt3\frac{V_f}{Z_1 + Z_2}$ |
| Double line-to-ground | negative ∥ zero, in series with positive | $I_{a1} = \frac{V_f}{Z_1 + Z_2 \| Z_0}$; ground $3I_{a0}$ |`,
      ],
      keyIdeas: [
        r`SLG: networks in series, $I_f = \frac{3V_f}{Z_1 + Z_2 + Z_0 + 3Z_f}$.`,
        r`LL: positive and negative in parallel, $I_b = -j\sqrt3\frac{V_f}{Z_1 + Z_2}$.`,
        r`DLG: negative and zero in parallel, then in series with positive; ground current $3I_{a0}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Four faults at one bus',
          problem: r`At a bus $Z_1 = Z_2 = j0.25$ and $Z_0 = j0.1$ pu. Compare the bolted fault currents.`,
          steps: [
            r`Three-phase: $\frac{1}{0.25} = 4.0$ pu. SLG: $\frac{3}{0.6} = 5.0$ pu.`,
            r`LL: $\frac{\sqrt3}{0.5} = 3.46$ pu.`,
            r`DLG: $Z_2 \| Z_0 = 0.0714$, $I_{a1} = \frac{1}{0.3214} = 3.11$; $I_{a0} = -3.11 \times \frac{0.25}{0.35} = -2.22$, ground current $6.67$ pu.`,
          ],
          answer: r`4.0, 5.0, 3.46 pu; ground current 6.67 pu in the DLG fault.`,
        },
        {
          level: 'board',
          title: 'The SLG fault in amperes',
          problem: r`The bus above is at 13.8 kV on 100 MVA. Find the single line-to-ground fault current in amperes.`,
          steps: [
            r`$I_{base} = \frac{100}{\sqrt3 \times 13.8} = 4184$ A.`,
            r`$I_f = 5.0 \times 4184 = 20.92$ kA.`,
          ],
          answer: r`20.92 kA.`,
        },
      ],
      traps: [
        r`A low zero-sequence impedance makes the ground fault WORSE than the three-phase fault.`,
        r`The SLG fault current is $3I_{a1}$, not $I_{a1}$.`,
      ],
      check: [
        { q: r`Which fault involves no zero-sequence network?`, a: r`The line-to-line fault (and the three-phase fault).` },
        { q: r`How can a utility limit ground-fault current?`, a: r`Ground the neutral through an impedance: it adds $3Z_n$ to the zero sequence.` },
      ],
    },
    {
      name: 'Stability and Equal Area',
      inShort: r`Whether machines stay in step after a disturbance.`,
      body: [
        r`A generator's rotor angle obeys the **swing equation**, $\frac{2H}{\omega_s}\frac{d^2\delta}{dt^2} = P_m - P_e$ (H in seconds on the machine's rating). When a fault cuts the electrical output, the mechanical input accelerates the rotor and δ grows. The **equal-area criterion** decides whether it comes back: the area of acceleration (between $P_m$ and the faulted $P_e$) must be matched by an area of deceleration (between the restored $P_e$ curve and $P_m$) before δ passes $\pi - \delta_0$.`,
        {
          type: 'plot',
          alt: 'The power-angle curve 2 sin delta against the mechanical input of 1 per unit: the starting angle at 30 degrees, the critical clearing angle at 79.6 degrees, and the farthest the rotor may swing, 150 degrees.',
          caption: 'Pe = 2 sin δ against Pm = 1: clear the fault before 79.6° and the rotor can swing back from no further than 150°.',
          x: [0, 180],
          y: [0, 2.4],
          xLabel: 'δ (°)',
          yLabel: 'P (pu)',
          series: [{ f: (d) => 2 * Math.sin(d * deg), label: 'P_e', area: true }],
          marks: [{ y: 1, label: 'P_m' }, { x: 30, label: 'δ₀' }, { x: 79.56, label: 'δcr' }, { x: 150, label: 'δmax' }],
        },
        r`For a fault that drops the output to zero and is cleared with the network restored, $\cos\delta_{cr} = (\pi - 2\delta_0)\sin\delta_0 - \cos\delta_0$, and with $P_e = 0$ the angle grows as $\delta = \delta_0 + \frac{\omega_sP_m}{4H}t^2$, so $t_{cr} = \sqrt{\frac{4H(\delta_{cr} - \delta_0)}{\omega_sP_m}}$.`,
      ],
      keyIdeas: [
        r`Swing equation $\frac{2H}{\omega_s}\frac{d^2\delta}{dt^2} = P_m - P_e$; steady-state limit at $\delta = 90°$.`,
        r`Equal area: accelerating area must be matched by decelerating area before δ reaches $\pi - \delta_0$.`,
        r`Fault with $P_e = 0$: $\cos\delta_{cr} = (\pi - 2\delta_0)\sin\delta_0 - \cos\delta_0$, $t_{cr} = \sqrt{\frac{4H(\delta_{cr} - \delta_0)}{\omega_sP_m}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Critical clearing angle and time',
          problem: r`A machine delivers 1 pu with $P_{\max} = 2$ pu and $H = 5$ s (60 Hz). A three-phase fault drops its output to zero and is cleared with the same line restored. Find the critical clearing angle and time.`,
          steps: [
            r`$\delta_0 = \sin^{-1}0.5 = 30°$ (0.5236 rad).`,
            r`$\cos\delta_{cr} = (\pi - 1.047)(0.5) - 0.866 = 0.181$, so $\delta_{cr} = 79.6°$ (1.389 rad).`,
            r`$t_{cr} = \sqrt{\frac{4 \times 5 \times 0.865}{377 \times 1}} = 0.214$ s.`,
          ],
          answer: r`79.6°; 0.214 s.`,
        },
        {
          level: 'board',
          title: 'Acceleration, and H on a system base',
          problem: r`(a) The same machine's output drops to 0.4 pu during a fault. Find its initial acceleration. (b) A 250 MVA machine has $H = 5$ s. What is its H on a 100 MVA base?`,
          steps: [
            r`(a) $\frac{d^2\delta}{dt^2} = \frac{\omega_s}{2H}(P_m - P_e) = \frac{377}{10}(0.6) = 22.62$ rad/s², about 1296 °/s².`,
            r`(b) $H_{sys} = H\frac{S_{machine}}{S_{base}} = 5 \times \frac{250}{100} = 12.5$ s.`,
          ],
          answer: r`22.62 rad/s²; 12.5 s.`,
        },
      ],
      traps: [
        r`Angles in RADIANS inside the formulas; $\omega_s$ is electrical, $2\pi f$.`,
        r`H changes with the MVA base, inversely.`,
      ],
      check: [
        { q: r`What limits steady-state stability on a lossless link?`, a: r`δ reaching 90°, where $P = P_{\max}$.` },
        { q: r`Does faster fault clearing help transient stability?`, a: r`Yes: it shrinks the accelerating area.` },
      ],
    },
    {
      name: 'Economic Dispatch',
      inShort: r`Sharing load among units at least total fuel cost.`,
      body: [
        r`Each unit's fuel cost rises faster than its output, $C_i = a_i + b_iP_i + c_iP_i^2$. Total cost is least when every unit runs at the same **incremental cost**, $\frac{dC_i}{dP_i} = b_i + 2c_iP_i = \lambda$, with the outputs adding up to the demand:`,
        {
          type: 'plot',
          alt: 'The incremental costs of two units against their output, rising lines from 8 and 7.5 pesos per MWh, and the common incremental cost of 10.2 at which they share 500 MW: 275 MW and 225 MW.',
          caption: 'Both units at λ = 10.2 ₱/MWh: unit 1 at 275 MW, unit 2 at 225 MW, 500 MW in all.',
          x: [0, 400],
          y: [7, 13],
          xLabel: 'P (MW)',
          yLabel: 'dC/dP (₱/MWh)',
          series: [
            { f: (p) => 8 + 0.008 * p, label: 'unit 1' },
            { f: (p) => 7.5 + 0.012 * p, label: 'unit 2', dashed: true },
          ],
          marks: [{ y: 10.2, label: 'λ = 10.2' }],
        },
        r`A unit that would go past its limit is held at the limit, and the others re-share the rest at a new λ. With transmission losses, each unit's incremental cost is multiplied by its **penalty factor** $L_i = \frac{1}{1 - \partial P_L/\partial P_i}$, and generation must cover the losses too.`,
      ],
      keyIdeas: [
        r`Without losses: all units at the same incremental cost, $b_i + 2c_iP_i = \lambda$.`,
        r`With losses: $L_i\frac{dC_i}{dP_i} = \lambda$, $L_i = \frac{1}{1 - \partial P_L/\partial P_i}$.`,
        r`Units at their limits are fixed there; the rest re-share.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two units',
          problem: r`Units have $\frac{dC}{dP} = 8 + 0.008P_1$ and $7.5 + 0.012P_2$ (₱/MWh). Share 500 MW, losses neglected.`,
          steps: [
            r`$P_1 = \frac{\lambda - 8}{0.008}$, $P_2 = \frac{\lambda - 7.5}{0.012}$, summing to 500.`,
            r`$\lambda = 10.2$ ₱/MWh: $P_1 = 275$ MW, $P_2 = 225$ MW.`,
          ],
          answer: r`275 MW and 225 MW at 10.2 ₱/MWh.`,
        },
        {
          level: 'board',
          title: 'A unit at its limit',
          problem: r`Unit 2 above can produce at most 200 MW. Redo the 500 MW dispatch.`,
          steps: [
            r`Unit 2 is held at 200 MW, so unit 1 takes 300 MW.`,
            r`$\lambda = 8 + 0.008 \times 300 = 10.4$ ₱/MWh, set by unit 1.`,
          ],
          answer: r`300 MW and 200 MW; λ = 10.4 ₱/MWh.`,
        },
      ],
      traps: [
        r`Equal INCREMENTAL cost, not equal cost or equal loading.`,
        r`A unit at its limit no longer sets λ.`,
      ],
      check: [
        { q: r`What is λ in economic dispatch?`, a: r`The system incremental cost: the cost of one more MWh.` },
        { q: r`What does a penalty factor above 1 mean?`, a: r`The unit's extra output raises the losses, so its power costs more at the load.` },
      ],
    },
    {
      name: 'Voltage Control',
      inShort: r`Holding voltages by managing reactive power: generators, taps, capacitors, reactors, SVCs.`,
      body: [
        r`Across a line the voltage drop is about $\Delta V \approx \frac{RP + XQ}{V}$. On transmission lines X is much larger than R, so the drop is set mostly by the reactive power: to hold voltage, manage the vars. The tools:`,
        r`| Means | How |
|---|---|
| Generator excitation | raises or lowers its vars |
| Transformer taps (on-load tap changers) | change the ratio |
| Shunt capacitors | supply vars at heavy load |
| Shunt reactors | absorb vars on lightly loaded long lines |
| Synchronous condensers, SVCs, STATCOMs | adjustable vars, fast |
| Series capacitors | cancel part of the line's reactance |`,
        r`A **series capacitor** compensating a fraction k of the line's reactance leaves $X(1 - k)$, so the power limit $\frac{V_sV_r}{X}$ rises by $\frac{1}{1 - k}$:`,
        {
          type: 'plot',
          alt: 'The power limit of a line against the degree of series compensation from zero to 70 percent: rising slowly at first, doubled at 50 percent, more than tripled at 70 percent.',
          caption: 'Series compensation raises the power limit as 1/(1 − k): 50% compensation doubles it.',
          x: [0, 0.7],
          y: [0, 4],
          xLabel: 'compensation k',
          yLabel: 'P_{max} / P_{max,0}',
          series: [{ f: (k) => 1 / (1 - k), label: 'P_{max}', area: true }],
          marks: [{ x: 0.5, label: '×2 at 50%' }],
        },
      ],
      keyIdeas: [
        r`$\Delta V \approx \frac{RP + XQ}{V}$: on lines X dominates, so Q sets the drop.`,
        r`Shunt vars for a rise ΔV: $\Delta Q \approx \frac{V\Delta V}{X} = \text{MVA}_{sc}\frac{\Delta V}{V}$.`,
        r`Series capacitors cut the line's X: $X_{eff} = X(1 - k)$; 50% compensation doubles the power limit.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Estimating a drop',
          problem: r`A 66 kV line ($R = 2$ Ω, $X = 20$ Ω per phase) delivers 10 MW and 5 Mvar. Estimate the voltage drop.`,
          steps: [
            r`Per phase: $P = 3.333$ MW, $Q = 1.667$ Mvar, $V = 38.11$ kV.`,
            r`$\Delta V \approx \frac{2(3.333) + 20(1.667)}{38.11} = 1.05$ kV, 2.75%.`,
          ],
          answer: r`About 1.05 kV per phase, 2.75%.`,
        },
        {
          level: 'board',
          title: 'Sizing a shunt capacitor',
          problem: r`A bus has a short-circuit capacity of 500 MVA. About how much shunt capacitance raises its voltage by 2%?`,
          steps: [r`$\Delta Q \approx \text{MVA}_{sc}\frac{\Delta V}{V} = 500 \times 0.02 = 10$ Mvar.`],
          answer: r`About 10 Mvar.`,
        },
      ],
      traps: [
        r`Raising generator excitation changes vars and voltage, not real power.`,
        r`Shunt capacitors make the light-load overvoltage WORSE: switch them out.`,
      ],
      check: [
        { q: r`What absorbs vars on a long, lightly loaded line?`, a: r`Shunt reactors.` },
        { q: r`What fraction of series compensation triples the power limit?`, a: r`$k = \frac23$.` },
      ],
    },
    {
      name: 'Corona',
      inShort: r`Air around a conductor ionizes when the surface field is too strong: loss, noise and interference.`,
      body: [
        r`When the electric field at a conductor's surface passes the breakdown strength of air (about 30 kV/cm peak, 21.1 kV/cm rms), the air around it ionizes: a violet glow, a hiss, ozone, power loss, and radio interference. That is **corona**. It begins at the **disruptive critical voltage** (Peek): $V_d = 21.1\,m\delta r\ln\frac{D}{r}$ kV rms to neutral, r in cm, with the surface factor m (1 for a smooth wire, about 0.85 stranded) and the air density factor $\delta = \frac{3.92b}{273 + t}$ (b in cmHg).`,
        r`Above $V_d$ the loss climbs as the square of the excess: $P_c = \frac{241}{\delta}(f + 25)\sqrt{\frac{r}{D}}(V - V_d)^2 \times 10^{-5}$ kW per km per phase:`,
        {
          type: 'plot',
          alt: 'Corona loss per kilometre per phase against the phase voltage, for a 1 cm conductor at 2 m spacing: zero up to the critical 95 kV, then rising as the square of the excess, to about 3.3 kW at 110 kV.',
          caption: 'Corona loss starts at Vd = 95 kV and grows as the square of the excess.',
          x: [80, 130],
          y: [0, 12],
          xLabel: 'V (kV per phase)',
          yLabel: 'kW/km',
          series: [{ f: (v) => (v > 95.02 ? 241 * 85 * Math.sqrt(1 / 200) * (v - 95.02) ** 2 * 1e-5 : 0), label: 'loss', area: true }],
          marks: [{ x: 95.02, label: 'V_d' }],
        },
        r`Corona is reduced by larger conductors, bundling and wider spacing, and is worse in rain, fog and at high altitude (lower δ).`,
      ],
      keyIdeas: [
        r`Disruptive voltage (Peek) $V_d = 21.1\,m\delta r\ln\frac{D}{r}$ kV (phase, rms, r in cm), $\delta = \frac{3.92b}{273 + t}$.`,
        r`Loss $\propto (f + 25)\sqrt{\frac{r}{D}}(V - V_d)^2$ above $V_d$.`,
        r`Reduced by larger or bundled conductors and wider spacing; worse in rain, fog and at altitude.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Disruptive critical voltage',
          problem: r`A stranded conductor ($m = 0.85$) of 1 cm radius is spaced 2 m from its neighbours, at 76 cmHg and 25 °C. Find the disruptive critical voltage.`,
          steps: [
            r`$\delta = \frac{3.92 \times 76}{298} = 1.0$.`,
            r`$V_d = 21.1 \times 0.85 \times 1 \times 1 \times \ln200 = 95.0$ kV phase, 164.6 kV line.`,
          ],
          answer: r`95.0 kV to neutral.`,
        },
        {
          level: 'board',
          title: 'Corona loss',
          problem: r`The same line runs at 110 kV per phase on 60 Hz. Find the corona loss per km per phase.`,
          steps: [
            r`$P_c = \frac{241}{1}(60 + 25)\sqrt{\frac{1}{200}}(110 - 95.0)^2 \times 10^{-5}$.`,
            r`$= 241 \times 85 \times 0.07071 \times 224.4 \times 10^{-5} = 3.25$ kW/km per phase.`,
          ],
          answer: r`About 3.25 kW per km per phase.`,
        },
      ],
      traps: [
        r`Peek's formula gives PHASE voltage; compare with line-to-neutral operating voltage.`,
        r`Lower air density (heat, altitude) LOWERS the critical voltage.`,
      ],
      check: [
        { q: r`Name two ways to reduce corona.`, a: r`Larger or bundled conductors; wider spacing.` },
        { q: r`What gas does corona produce?`, a: r`Ozone.` },
      ],
    },
    {
      name: 'Sag and Tension',
      inShort: r`A conductor hangs in a near-parabola; sag trades against tension.`,
      body: [
        r`A conductor strung between towers hangs in a catenary, close to a parabola for ordinary spans. With weight w per metre and horizontal tension T, the height above the lowest point is $y = \frac{wx^2}{2T}$, so a level span L sags $S = \frac{wL^2}{8T}$. Pull it tighter and it sags less, but the stress and the risk of breaking in cold weather (when it contracts) go up.`,
        {
          type: 'plot',
          alt: 'A 300 metre level span between two 20 metre towers: the conductor dips in a parabola to its lowest point at mid-span, 3.38 m below the supports.',
          caption: 'A 300 m level span (6 N/m at 20 kN): the conductor sags 3.38 m at mid-span.',
          x: [-150, 150],
          y: [10, 22],
          xLabel: 'x from mid-span (m)',
          yLabel: 'height (m)',
          series: [{ f: (x) => 20 - 3.375 + (6 * x * x) / 40000, label: 'conductor' }],
          marks: [{ x: 0, label: 'sag 3.38 m' }],
        },
        r`Ice and wind add load: $w_r = \sqrt{(w + w_i)^2 + w_w^2}$, with ice $w_i = \rho_i\pi t(d + t)$ and wind $w_w = p(d + 2t)$. With supports at different heights the lowest point shifts toward the lower support: $x_1 = \frac{L}{2} - \frac{Th}{wL}$. The tension at a support is a little above T: $\sqrt{T^2 + \left(\frac{wL}{2}\right)^2}$.`,
      ],
      keyIdeas: [
        r`Level span: $S = \frac{wL^2}{8T}$. Unequal supports: lowest point at $x_1 = \frac{L}{2} - \frac{Th}{wL}$.`,
        r`Ice and wind: $w_r = \sqrt{(w + w_i)^2 + w_w^2}$.`,
        r`Length $L + \frac{8S^2}{3L}$: a tiny change in length makes a large change in sag.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sag and length',
          problem: r`A conductor weighing 6 N/m spans 300 m between level towers at 20 kN tension. Find the sag and the conductor length.`,
          steps: [
            r`$S = \frac{6 \times 300^2}{8 \times 20\,000} = 3.375$ m.`,
            r`Length $= 300 + \frac{8 \times 3.375^2}{3 \times 300} = 300.10$ m.`,
          ],
          answer: r`3.38 m; 300.10 m.`,
        },
        {
          level: 'board',
          title: 'Supports at different heights',
          problem: r`The same conductor spans 300 m between supports 5 m apart in height, at 20 kN. Find where the lowest point is, the sag below each support, and the tension at the supports.`,
          steps: [
            r`$x_1 = 150 - \frac{20\,000 \times 5}{6 \times 300} = 94.44$ m from the lower support; $x_2 = 205.56$ m.`,
            r`Sags: $\frac{6 \times 94.44^2}{40\,000} = 1.338$ m and $\frac{6 \times 205.56^2}{40\,000} = 6.338$ m (5 m apart, as they should be).`,
            r`Support tension $\approx \sqrt{20\,000^2 + 900^2} = 20\,020$ N.`,
          ],
          answer: r`94.44 m from the lower support; 1.338 m and 6.338 m; about 20.02 kN.`,
        },
      ],
      traps: [
        r`Use the full span in $\frac{wL^2}{8T}$, or the half-span in $\frac{wl^2}{2T}$.`,
        r`Ice adds weight vertically, wind horizontally: combine them as vectors.`,
      ],
      check: [
        { q: r`Doubling the tension changes the sag how?`, a: r`It halves.` },
        { q: r`Why does sag matter in hot weather?`, a: r`The conductor expands and sags lower, cutting ground clearance.` },
      ],
    },
  ],
};
