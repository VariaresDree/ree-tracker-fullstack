// Library › Lessons › EE › Electrical Machinery 1 (2026-11-18; every subtopic in
// the module format 2026-11-20, with figures, examples a step at a time and
// checks; every number re-worked by machinery1Lesson.test.js. Coverage and
// problem styles cross-checked against a review center's DC-machines and
// apparatus (transformer) handouts; the text, problems and figures are this
// app's own): written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order. Magnetic-circuit basics are in Electromagnetism; alternators
// and induction motors in Machinery 2.
const r = String.raw;
const deg = Math.PI / 180;

// Normalised air-gap field of a two-pole DC machine around the armature
// (electrical degrees): a flat-topped main field (pole centres at 90° and 270°),
// and the triangular armature mmf, zero at the pole centres and largest midway
// between poles, so it adds under one tip of each pole and subtracts under the other.
const mainField = (t) => Math.max(-1, Math.min(1, 3 * Math.sin(t * deg)));
const armatureMmf = (t) => {
  const x = (((t % 360) + 360) % 360) / 180;
  return 0.6 * (x < 1 ? 1 - 2 * x : 2 * x - 3);
};

// A 220 V motor (armature 0.4 Ω) started through a stepped resistance between
// 60 A and 40 A: the armature current against back EMF as a share of the supply.
const starterCurrent = (e) => {
  let R = 220 / 60;
  for (;;) {
    // Back EMF where the current has fallen to 40 A: the next step is cut out there.
    const Eend = 220 - 40 * R;
    if (R <= 0.4 || 220 * e <= Eend) return (220 - 220 * e) / R;
    R = Math.max(0.4, (220 - Eend) / 60);
  }
};

export default {
  topic: 'Electrical Machinery 1',
  subject: 'EE',
  overview: r`Electrical Machinery 1 covers transformers and DC machines. A transformer moves power between voltage levels through a shared magnetic core: its EMF equation sets the flux, its equivalent circuit predicts regulation and efficiency, and two simple tests (open and short circuit) measure that circuit. DC machines convert between electrical and mechanical power: the same constant links EMF to speed ($E = K\Phi\omega$) and torque to current ($T = K\Phi I_a$). Generators are judged by how their voltage holds up under load, motors by how their speed and torque change, and both by their losses. Keep track of which side a quantity is referred to, and of whether a value is per phase, per unit or per pole.`,
  sources: [
    'Electric Machinery Fundamentals (Chapman)',
    'Electric Machinery (Fitzgerald, Kingsley and Umans)',
    'A Textbook of Electrical Technology, Vol. II (Theraja)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Magnetic Circuits',
      inShort: r`Machine cores as circuits: mmf drives flux through reluctance.`,
      body: [
        r`Every machine in this topic is a magnetic circuit: a winding's ampere-turns drive flux through iron and air gaps, $\mathcal{F} = NI = \Phi\mathcal{R}$ with $\mathcal{R} = \frac{\ell}{\mu A}$ (Electromagnetism covers the method). Two practical corrections matter for machines. Cores are **laminated** to cut eddy currents, so only a fraction of the gross area is iron: net area $= k_s \times$ gross, with the stacking factor $k_s$ about 0.9 to 0.95. And flux **fringes** across an air gap, so the gap area is a little larger than the iron's: about $(a + g)(b + g)$ for a gap g between faces a by b.`,
        r`Iron's permeability is not constant. As B rises the domains line up and the core **saturates**: past the knee of the magnetization curve, more ampere-turns buy little more flux. Machines are designed to run near the knee.`,
        {
          type: 'plot',
          alt: 'A magnetization curve of flux density against magnetizing force: rising steeply and almost straight at first, bending at a knee near 1.3 T, then flattening toward saturation.',
          caption: 'A magnetization (B-H) curve: steep and nearly straight, a knee, then saturation.',
          x: [0, 2000],
          y: [0, 2],
          xLabel: 'H (A/m)',
          yLabel: 'B (T)',
          series: [{ f: (h) => 1.75 * Math.tanh(h / 450) + 0.00012 * h, label: 'B', area: true }],
          marks: [{ at: [600, 1.75 * Math.tanh(600 / 450) + 0.072], label: 'knee' }],
        },
      ],
      keyIdeas: [
        r`$\mathcal{F} = NI = \Phi\mathcal{R}$, $\mathcal{R} = \frac{l}{\mu A}$; series and parallel paths combine like resistors.`,
        r`Laminated cores: iron area $= k_s \times$ gross area ($k_s \approx 0.9$ to 0.95). Air gaps fringe: area $\approx (a + g)(b + g)$.`,
        r`Iron saturates past the knee of its B-H curve; machines run near the knee.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Stacking factor',
          problem: r`A core has a gross area of 25 cm² and a stacking factor of 0.92. What flux gives 1.0 T in the iron?`,
          steps: [
            r`Net area $= 0.92 \times 25 = 23$ cm².`,
            r`$\Phi = 1.0 \times 23 \times 10^{-4} = 2.3$ mWb.`,
          ],
          answer: r`2.3 mWb.`,
        },
        {
          level: 'board',
          title: 'The same flux across a fringing gap',
          problem: r`The core above is 5 cm by 5 cm and has a 2 mm air gap. With fringing, find the gap's flux density and the ampere-turns it needs for the 2.3 mWb.`,
          steps: [
            r`Gap area $= (5 + 0.2)^2 = 27.04$ cm², so $B_g = \frac{2.3 \times 10^{-3}}{27.04 \times 10^{-4}} = 0.851$ T.`,
            r`$H_g\ell_g = \frac{0.851}{4\pi \times 10^{-7}} \times 0.002 = 1354$ A·t.`,
          ],
          answer: r`0.851 T; about 1354 ampere-turns for the gap alone.`,
        },
      ],
      traps: [
        r`Use the net (iron) area for the iron and the gross area, with fringing, for the air gap.`,
        r`Above the knee, doubling the ampere-turns does not double the flux.`,
      ],
      check: [
        { q: r`Why are transformer and armature cores laminated?`, a: r`To cut eddy-current loss.` },
        { q: r`What does the stacking factor account for?`, a: r`The insulation between laminations: only part of the gross area is iron.` },
      ],
    },
    {
      name: 'Transformer Principles and EMF Equation',
      inShort: r`A changing flux in a shared core induces the same volts per turn in each winding.`,
      body: [
        r`A transformer's two windings share one core. The applied voltage drives an alternating flux, and by Faraday's law that flux induces the same voltage in every turn of both windings: $E = 4.44fN\Phi_m$ (4.44 is $\frac{2\pi}{\sqrt2}$, which is 4 times the sine's form factor of 1.11). So the voltages go as the turns and, since the power in equals the power out, the currents go inversely: $\frac{E_1}{E_2} = \frac{N_1}{N_2} = a = \frac{I_2}{I_1}$.`,
        r`Even unloaded, the primary draws a small **no-load current** $I_0$ with two parts: a **magnetizing** current $I_m$ lagging the voltage by 90°, in step with the flux, which sets up the flux; and a smaller **core-loss** current $I_c$ in phase with the voltage, which supplies the hysteresis and eddy losses.`,
        {
          type: 'phasor',
          alt: 'The no-load phasor diagram of a transformer: the applied voltage to the right, the flux pointing straight down, lagging by 90 degrees, and the no-load current lagging 68 degrees, made of a core-loss part along the voltage and a magnetizing part along the flux.',
          caption: 'At no load: I₀ splits into a core-loss part along V₁ and a larger magnetizing part along Φ.',
          axes: false,
          vectors: [
            { mag: 2.4, angle: 0, label: 'V_1' },
            { mag: 1.4, angle: -90, label: 'Φ', dashed: true },
            { name: 'Ic', mag: 0.75, angle: 0, label: 'I_c', colour: 1 },
            { mag: 1.854, angle: -90, from: 'Ic', label: 'I_m', colour: 1 },
            { mag: 2.0, angle: -67.98, label: 'I_0', colour: 2 },
          ],
        },
        r`| Classification | Kinds |
|---|---|
| Core construction | core type, shell type, berry type |
| Purpose | power (transmission), distribution, generator step-up, instrument (CT, PT) |
| Cooling | self-cooled (dry), forced air, oil (natural or forced) |`,
      ],
      keyIdeas: [
        r`$E = 4.44fN\Phi_m$; $\frac{E_1}{E_2} = \frac{N_1}{N_2} = a = \frac{I_2}{I_1}$.`,
        r`Rated currents $I = \frac{S}{V}$ (single phase), $\frac{S}{\sqrt3V_L}$ (three phase).`,
        r`No-load current: a core-loss part in phase with V and a larger magnetizing part lagging 90°.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Flux, turns and currents',
          problem: r`A 10 kVA, 2400/240 V, 60 Hz transformer has 1000 primary turns. Find the peak flux, the secondary turns, and both rated currents.`,
          steps: [
            r`$\Phi_m = \frac{2400}{4.44 \times 60 \times 1000} = 9.01$ mWb.`,
            r`$N_2 = 1000 \times \frac{240}{2400} = 100$.`,
            r`$I_1 = \frac{10\,000}{2400} = 4.17$ A, $I_2 = \frac{10\,000}{240} = 41.7$ A.`,
          ],
          answer: r`9.01 mWb; 100 turns; 4.17 A and 41.7 A.`,
        },
        {
          level: 'board',
          title: 'Core loss on another frequency',
          problem: r`A 2400 V, 60 Hz transformer has 180 W of core loss: 120 W hysteresis and 60 W eddy current. Find its core loss on 2000 V, 50 Hz.`,
          steps: [
            r`$\frac{V}{f}$ is unchanged ($\frac{2400}{60} = \frac{2000}{50} = 40$), so $B_m$ is unchanged.`,
            r`Hysteresis goes as f: $120 \times \frac{50}{60} = 100$ W. Eddy goes as $f^2$: $60 \times \left(\frac{50}{60}\right)^2 = 41.7$ W.`,
          ],
          answer: r`141.7 W.`,
        },
      ],
      traps: [
        r`Flux follows $V/f$: the same voltage at a lower frequency over-fluxes the core.`,
        r`A transformer changes voltage and current, never frequency.`,
      ],
      check: [
        { q: r`Which part of the no-load current is in phase with the voltage?`, a: r`The core-loss part $I_c$.` },
        { q: r`What is the ratio of transformation of a 7200/240 V transformer?`, a: r`$a = 30$.` },
      ],
    },
    {
      name: 'Equivalent Circuit',
      inShort: r`The real transformer as an ideal one plus series impedance and a magnetizing branch.`,
      body: [
        r`A real transformer is an ideal one plus its imperfections: each winding's resistance and **leakage reactance** (flux that links one winding only) in series, and a **magnetizing branch** ($R_c$ for core loss, $X_m$ for magnetizing) across the supply. To draw it as one circuit, refer the secondary to the primary: impedances times $a^2$, voltages times $a$, currents divided by $a$. Moving the small magnetizing branch to the terminals gives the **approximate equivalent circuit**:`,
        {
          type: 'circuit',
          alt: 'The approximate equivalent circuit referred to the primary: the supply, then the magnetizing branch of Rc and jXm in parallel across it, then Req1 and jXeq1 in series, feeding the load referred to the primary.',
          caption: 'The approximate equivalent circuit, referred to the primary.',
          parts: [
            ['Vac', [0, 2], [0, 0], 'V_1'],
            ['wire', [0, 0], [3, 0]],
            ['R', [1.5, 0], [1.5, 2], 'R_c'],
            ['L', [3, 0], [3, 2], 'jX_m'],
            ['R', [3, 0], [5, 0], 'R_{eq1}'],
            ['L', [5, 0], [7, 0], 'jX_{eq1}'],
            ['R', [7, 0], [7, 2], 'a²Z_L'],
            ['wire', [7, 2], [0, 2]],
            ['dot', [1.5, 0]],
            ['dot', [1.5, 2]],
            ['dot', [3, 0]],
            ['dot', [3, 2]],
          ],
        },
        r`**Per-unit** values make the two sides look alike: on its own rating, a transformer's impedance is the same per unit from either side, $Z_{pu} = \frac{Z_{eq}}{Z_{base}}$ with $Z_{base} = \frac{V^2}{S}$, typically 2% to 10%.`,
      ],
      keyIdeas: [
        r`Referring: impedances to the primary $\times a^2$, to the secondary $\div a^2$.`,
        r`Approximate circuit: $R_{eq1} = R_1 + a^2R_2$, $X_{eq1} = X_1 + a^2X_2$, magnetizing branch at the terminals.`,
        r`Per unit: $Z_{pu} = \frac{Z_{eq}S}{V^2}$, the same from either side.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Equivalent impedance',
          problem: r`A 50 kVA, 2400/240 V transformer has $R_1 = 0.75$ Ω, $X_1 = 1.0$ Ω, $R_2 = 0.0075$ Ω, $X_2 = 0.01$ Ω. Find $Z_{eq1}$ and its per-unit value.`,
          steps: [
            r`$a = 10$: $R_{eq1} = 0.75 + 100 \times 0.0075 = 1.5$ Ω, $X_{eq1} = 1.0 + 100 \times 0.01 = 2.0$ Ω, $\lvert Z\rvert = 2.5$ Ω.`,
            r`$Z_{base} = \frac{2400^2}{50\,000} = 115.2$ Ω, so $Z_{pu} = \frac{2.5}{115.2} = 0.0217$ (2.17%).`,
          ],
          answer: r`2.5 Ω; 2.17%.`,
        },
        {
          level: 'board',
          title: 'The same from the low side, and a short circuit',
          problem: r`For the same transformer, find $Z_{pu}$ from the 240 V side, then the secondary current if its terminals are short-circuited on rated primary voltage.`,
          steps: [
            r`Referred to the secondary: $R_{eq2} = 0.015$ Ω, $X_{eq2} = 0.02$ Ω, $\lvert Z\rvert = 0.025$ Ω; $Z_{base2} = \frac{240^2}{50\,000} = 1.152$ Ω, so $Z_{pu} = 0.0217$ again.`,
            r`Rated secondary current $\frac{50\,000}{240} = 208.3$ A; a short draws $\frac{1}{0.0217}$ times that, $I_{sc} = \frac{208.3}{0.0217} = 9600$ A.`,
          ],
          answer: r`0.0217 per unit; 9600 A.`,
        },
      ],
      traps: [
        r`Never add a primary and a secondary impedance without referring one of them.`,
        r`Refer with $a^2$, not $a$.`,
      ],
      check: [
        { q: r`A 0.1 Ω secondary resistance in a 10:1 transformer is how much referred to the primary?`, a: r`$0.1 \times 100 = 10$ Ω.` },
        { q: r`What does $X_m$ in the equivalent circuit represent?`, a: r`The magnetizing reactance, which draws the current that sets up the flux.` },
      ],
    },
    {
      name: 'Regulation and Efficiency',
      inShort: r`How much the voltage sags at full load, and how much power is lost.`,
      body: [
        r`**Voltage regulation** is how far the secondary voltage falls from no load to full load: $\text{VR} = \frac{V_{NL} - V_{FL}}{V_{FL}}$. On the referred circuit, $V_1 = aV_2 + I(R_{eq} + jX_{eq})$, and the drop adds mostly in line with the voltage, so $\text{VR} \approx \frac{I(R\cos\theta \pm X\sin\theta)}{V}$, + for lagging loads. A leading load can make the regulation negative: the voltage rises with load.`,
        {
          type: 'phasor',
          alt: 'The transformer phasor diagram with the drops exaggerated: the secondary voltage to the right, the current lagging it, the resistive drop in line with the current added at the tip, then the reactive drop at right angles, ending at the primary voltage, slightly longer and a few degrees ahead.',
          caption: 'V₁ = aV₂ + IR + jIX, drawn with the drops exaggerated: for a lagging load both drops lengthen the voltage.',
          axes: false,
          vectors: [
            { name: 'V2', mag: 2.4, angle: 0, label: 'aV_2' },
            { mag: 1, angle: -36.87, label: 'I', colour: 1 },
            { name: 'IR', mag: 0.5, angle: -36.87, from: 'V2', label: 'IR', colour: 3 },
            { mag: 0.67, angle: 53.13, from: 'IR', label: 'jIX', colour: 3 },
            { mag: 3.2107, angle: 4.215, label: 'V_1', colour: 2, labelAt: 'mid' },
          ],
        },
        r`**Efficiency** is output over output plus losses. The core loss $P_c$ is fixed whenever the transformer is energized; the copper loss goes with the square of the load. At a fraction x of full load, $\eta = \frac{xS\cos\theta}{xS\cos\theta + P_c + x^2P_{cu}}$, highest where the copper loss equals the core loss:`,
        {
          type: 'plot',
          alt: 'Efficiency of a 50 kVA transformer against load as a fraction of full load, at 0.8 power factor: rising steeply from zero, peaking at about 98.3 percent near 0.53 of full load, then easing slightly.',
          caption: 'Efficiency against load (50 kVA, 180 W core, 651 W full-load copper, 0.8 pf): highest where the two losses are equal.',
          x: [0, 1.25],
          y: [90, 100],
          xLabel: 'load (per unit)',
          yLabel: 'η (%)',
          series: [{ f: (x) => (100 * x * 40000) / (x * 40000 + 180 + x * x * 651), label: 'η' }],
          marks: [{ x: Math.sqrt(180 / 651), label: 'losses equal' }],
        },
        r`A distribution transformer is energized all day but loaded only part of it, so it is judged by **all-day efficiency**: the day's energy out over the day's energy in, with the core loss counted for all 24 hours.`,
      ],
      keyIdeas: [
        r`$\text{VR} = \frac{V_{NL} - V_{FL}}{V_{FL}} \approx r\cos\theta \pm x\sin\theta$ (+ lagging).`,
        r`$\eta = \frac{xS\cos\theta}{xS\cos\theta + P_c + x^2P_{cu}}$; maximum at $x = \sqrt{P_c/P_{cu}}$.`,
        r`All-day efficiency: energies over 24 h, with core loss present all day.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Regulation and efficiency at full load',
          problem: r`The 50 kVA, 2400/240 V transformer ($R_{eq} = 1.5$ Ω, $X_{eq} = 2$ Ω on the 2400 V side) has 180 W core loss. Find its regulation and efficiency at full load, 0.8 lagging, and the load for maximum efficiency.`,
          steps: [
            r`$I = \frac{50\,000}{2400} = 20.83$ A. VR $\approx \frac{20.83(1.5 \times 0.8 + 2 \times 0.6)}{2400} = 2.08\%$; the exact phasor sum gives $V_1 = 2450.0$ V, 2.09%.`,
            r`Copper loss $= 20.83^2 \times 1.5 = 651$ W; $\eta = \frac{40\,000}{40\,000 + 180 + 651} = 97.96\%$.`,
            r`Maximum at $x = \sqrt{\frac{180}{651}} = 0.526$ of full load.`,
          ],
          answer: r`2.08% (2.09% exact); 97.96%; at 52.6% load.`,
        },
        {
          level: 'board',
          title: 'All-day efficiency',
          problem: r`The same transformer runs 8 h at full load and 6 h at half load (both 0.8 pf), and 10 h at no load. Find its all-day efficiency.`,
          steps: [
            r`Energy out: $8 \times 40 + 6 \times 20 = 440$ kWh.`,
            r`Copper: $8 \times 651 + 6 \times \frac{651}{4} = 6184.5$ Wh. Core, all day: $24 \times 180 = 4320$ Wh.`,
            r`$\eta = \frac{440}{440 + 10.50} = 97.67\%$.`,
          ],
          answer: r`97.67%.`,
        },
      ],
      traps: [
        r`Divide regulation by the FULL-load voltage. A leading load can make it negative.`,
        r`At half load the copper loss is a QUARTER of full-load copper loss.`,
      ],
      check: [
        { q: r`At what load is a transformer with 400 W core loss and 1600 W full-load copper loss most efficient?`, a: r`$\sqrt{\frac{400}{1600}} = 0.5$, half load.` },
        { q: r`Can voltage regulation be negative?`, a: r`Yes, with a leading (capacitive) load.` },
      ],
    },
    {
      name: 'Open and Short Circuit Tests',
      inShort: r`Two cheap tests give the whole equivalent circuit without loading the transformer.`,
      body: [
        r`Two tests measure the equivalent circuit with little power and no real load:`,
        r`| | Open-circuit test | Short-circuit test |
|---|---|---|
| Side metered | low-voltage side (high side open) | high-voltage side (low side shorted) |
| Applied | rated voltage | reduced voltage, enough for rated current |
| Wattmeter reads | core loss | full-load copper loss |
| Gives | $R_c = \frac{V^2}{P_{oc}}$, $X_m = \frac{V}{I_m}$ | $Z_{eq} = \frac{V_{sc}}{I_{sc}}$, $R_{eq} = \frac{P_{sc}}{I_{sc}^2}$ |`,
        r`At rated voltage the series impedance hardly matters, so the open-circuit test sees only the magnetizing branch; at the few percent of voltage the short-circuit test needs, the flux and core loss are negligible, so it sees only the series impedance. The short-circuit voltage as a fraction of rated is the per-unit impedance.`,
        {
          type: 'plot',
          alt: 'Copper loss of the 50 kVA transformer against load: a parabola from zero to 651 W at full load, crossing the flat 180 W core-loss line at 0.53 of full load.',
          caption: 'The two measured losses against load: core loss stays at 180 W, copper loss grows as the square of the load.',
          x: [0, 1.2],
          y: [0, 1000],
          xLabel: 'load (per unit)',
          yLabel: 'loss (W)',
          series: [{ f: (x) => 651 * x * x, label: 'copper loss', area: true }],
          marks: [{ y: 180, label: 'core loss 180 W' }],
        },
      ],
      keyIdeas: [
        r`Open circuit (low side, rated voltage): $P_{oc}$ = core loss; $R_c = \frac{V^2}{P_{oc}}$, $X_m = \frac{V}{I_m}$, $I_m = \sqrt{I_{oc}^2 - (P_{oc}/V)^2}$.`,
        r`Short circuit (high side, rated current): $P_{sc}$ = full-load copper loss; $Z_{eq} = \frac{V_{sc}}{I_{sc}}$, $R_{eq} = \frac{P_{sc}}{I_{sc}^2}$.`,
        r`$\frac{V_{sc}}{V_{rated}}$ is the per-unit impedance.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The circuit from two tests',
          problem: r`Open circuit at 240 V: 2.0 A, 180 W. Short circuit at 20.8 A: 52.1 V, 651 W. Find $R_c$, $X_m$ (low side) and $R_{eq}$, $X_{eq}$ (high side).`,
          steps: [
            r`$I_c = \frac{180}{240} = 0.75$ A, $I_m = \sqrt{4 - 0.5625} = 1.854$ A; $R_c = \frac{240^2}{180} = 320$ Ω, $X_m = \frac{240}{1.854} = 129.4$ Ω.`,
            r`$Z_{eq} = \frac{52.1}{20.8} = 2.505$ Ω, $R_{eq} = \frac{651}{20.8^2} = 1.505$ Ω, $X_{eq} = \sqrt{2.505^2 - 1.505^2} = 2.00$ Ω.`,
          ],
          answer: r`320 Ω, 129.4 Ω; 1.50 Ω, 2.00 Ω.`,
        },
        {
          level: 'board',
          title: 'Efficiency at another load',
          problem: r`From the same tests, find the efficiency at three-quarter load, unity power factor.`,
          steps: [
            r`Copper loss: $0.75^2 \times 651 = 366.2$ W. Output: $0.75 \times 50 = 37.5$ kW.`,
            r`$\eta = \frac{37\,500}{37\,500 + 180 + 366.2} = 98.56\%$.`,
          ],
          answer: r`98.56%.`,
        },
      ],
      traps: [
        r`Each test's results are referred to the side the meters were on.`,
        r`The open-circuit current is mostly magnetizing: do not use $\frac{V}{I_{oc}}$ for $R_c$.`,
      ],
      check: [
        { q: r`Which test measures the core loss?`, a: r`The open-circuit (no-load) test.` },
        { q: r`A short-circuit test needs 5% of rated voltage for rated current. What is the per-unit impedance?`, a: r`0.05.` },
      ],
    },
    {
      name: 'Autotransformers',
      inShort: r`One winding shared by both circuits: part of the power is conducted straight through.`,
      body: [
        r`An **autotransformer** has one winding with a tap: the part common to both circuits (the **common winding**) and the rest (the **series winding**). Because the two circuits are connected, part of the power passes straight through by conduction, and only the rest is transformed: transformed $= S\left(1 - \frac{V_L}{V_H}\right)$. The closer the two voltages, the smaller and cheaper the transformer for the job.`,
        {
          type: 'circuit',
          alt: 'A step-down autotransformer: the supply feeds the top of a single tapped winding; the series part runs down to the tap, the common part from the tap to the return; the load connects between the tap and the return.',
          caption: 'A step-down autotransformer: the load current is the supply current plus the common winding’s.',
          parts: [
            ['Vac', [0, 3], [0, 0], 'V_H'],
            ['wire', [0, 0], [2, 0]],
            ['L', [2, 0], [2, 1.5], 'series', { side: 'left' }],
            ['L', [2, 1.5], [2, 3], 'common', { side: 'left' }],
            ['wire', [2, 1.5], [4, 1.5]],
            ['R', [4, 1.5], [4, 3], 'load'],
            ['wire', [4, 3], [0, 3]],
            ['dot', [2, 1.5]],
            ['dot', [2, 3]],
            ['i', [0.5, 0], [1.5, 0], 'I_H'],
            ['i', [2.5, 1.5], [3.5, 1.5], 'I_L'],
          ],
        },
        r`| | Autotransformer | Two-winding transformer |
|---|---|---|
| Copper for the same job | $1 - K$ of it, $K = \frac{V_L}{V_H}$ | all of it |
| Losses and size | smaller | larger |
| Isolation between circuits | none | full |
| Fault current | higher (lower impedance) | lower |`,
      ],
      keyIdeas: [
        r`Transformed power $= S(1 - \frac{V_L}{V_H})$; conducted $= S\frac{V_L}{V_H}$.`,
        r`A two-winding unit reconnected: $S_{auto} = S_w\left(1 + \frac{V_c}{V_s}\right)$.`,
        r`Copper needed $= (1 - K)$ of a two-winding unit; but no isolation between circuits.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reconnecting a two-winding unit',
          problem: r`A 10 kVA, 2400/240 V transformer is reconnected as a 2640/2400 V autotransformer. Find its rating and the copper saved compared with a two-winding unit of that job.`,
          steps: [
            r`The 240 V winding becomes the series winding: $S = 10\left(1 + \frac{2400}{240}\right) = 110$ kVA.`,
            r`$K = \frac{2400}{2640} = 0.909$: about 91% of the copper is saved.`,
          ],
          answer: r`110 kVA; about 91%.`,
        },
        {
          level: 'board',
          title: 'Currents in the windings',
          problem: r`A 230/200 V autotransformer supplies 10 kVA. Find the supply current, the load current, the common winding's current, and the power actually transformed.`,
          steps: [
            r`$I_H = \frac{10\,000}{230} = 43.48$ A; $I_L = \frac{10\,000}{200} = 50$ A.`,
            r`The common winding carries the difference: $50 - 43.48 = 6.52$ A.`,
            r`Transformed: $10\left(1 - \frac{200}{230}\right) = 1.30$ kVA; the other 8.70 kVA is conducted.`,
          ],
          answer: r`43.48 A, 50 A, 6.52 A; 1.30 kVA transformed.`,
        },
      ],
      traps: [
        r`The series winding's rated current, not the common winding's, usually sets the rating.`,
        r`An autotransformer gives NO isolation: a fault on the high side reaches the low side.`,
      ],
      check: [
        { q: r`When is an autotransformer most worthwhile?`, a: r`When the two voltages are close, so little power is transformed.` },
        { q: r`What does an autotransformer give up compared with a two-winding unit?`, a: r`Electrical isolation between the circuits.` },
      ],
    },
    {
      name: 'Three-Phase Connections',
      inShort: r`Three single-phase units (or one three-phase unit) in Y or Δ on each side.`,
      body: [
        r`A three-phase bank uses three single-phase units (or one three-phase core), each side connected in wye or delta. Each unit still has its own ratio a, but the LINE voltages depend on the connection:`,
        r`| Connection | Line-voltage ratio | Phase shift | Notes |
|---|---|---|---|
| Y-Y | a | 0° | needs a grounded neutral against third harmonics |
| Δ-Δ | a | 0° | can run open-delta if one unit fails |
| Δ-Y | $\frac{a}{\sqrt3}$ (steps up by $\sqrt3$) | 30° | step-up at generators, distribution |
| Y-Δ | $\sqrt3a$ | 30° | step-down at substations |`,
        r`**Open delta** (V-V): with one unit of a Δ-Δ bank out, the other two still deliver balanced three-phase voltages, but only $\sqrt3S_{unit}$, 57.7% of the full bank's rating (86.6% of the two units' own).`,
      ],
      keyIdeas: [
        r`Line-voltage ratio: Y-Y and Δ-Δ $= a$; Δ-Y $= \frac{a}{\sqrt3}$; Y-Δ $= \sqrt3a$.`,
        r`Δ-Y and Y-Δ shift the phase by 30°. Y-Y needs a grounded neutral against third harmonics.`,
        r`Open delta (V-V): $\sqrt3S_{unit}$, 57.7% of the closed delta.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Δ-Y, and open delta',
          problem: r`Three 50 kVA, 7200/240 V units are connected Δ-Y on a 7200 V line. Find the secondary line voltage, and the capacity if one unit is removed (open delta, Δ-Δ originally).`,
          steps: [
            r`Δ-Y: each secondary phase gives 240 V, so the line voltage is $\sqrt3 \times 240 = 415.7$ V.`,
            r`Open delta: $\sqrt3 \times 50 = 86.6$ kVA, against 150 kVA closed.`,
          ],
          answer: r`415.7 V; 86.6 kVA.`,
        },
        {
          level: 'board',
          title: 'Currents in a Δ-Y bank',
          problem: r`A 500 kVA bank is 13.8 kV Δ on the primary and 480 V Y on the secondary. Find the primary line and winding currents and the secondary line current at full load.`,
          steps: [
            r`Primary line: $\frac{500\,000}{\sqrt3 \times 13\,800} = 20.92$ A; in each Δ winding $\frac{20.92}{\sqrt3} = 12.08$ A.`,
            r`Secondary line (= winding, in Y): $\frac{500\,000}{\sqrt3 \times 480} = 601.4$ A.`,
          ],
          answer: r`20.92 A and 12.08 A; 601.4 A.`,
        },
      ],
      traps: [
        r`Open delta is 57.7% of the THREE-unit capacity, or 86.6% of the TWO remaining units.`,
        r`In a delta winding the winding current is the line current over $\sqrt3$.`,
      ],
      check: [
        { q: r`Two 50 kVA units in open delta supply a balanced 80 kVA load. What does each unit carry?`, a: r`$\frac{80}{\sqrt3} = 46.2$ kVA, within its rating.` },
        { q: r`Which connections shift the phase by 30°?`, a: r`Δ-Y and Y-Δ.` },
      ],
    },
    {
      name: 'Parallel Operation',
      inShort: r`Transformers in parallel must match in ratio, polarity, phase shift and per-unit impedance.`,
      body: [
        r`Transformers share a load in parallel only if they match: the same **voltage ratio** (or a circulating current flows even at no load), the same **polarity** and **phase shift** (or there is a short circuit), and, for fair sharing, the same **per-unit impedance** and X/R ratio. Then they act like a current divider: the one with the lower impedance takes more.`,
        {
          type: 'plot',
          alt: 'Load carried by a 100 kVA unit at 5 percent impedance and a 200 kVA unit at 4 percent, against the total load: the 200 kVA unit takes five sevenths and reaches its rating at a total of 280 kVA, when the 100 kVA unit carries only 80 kVA.',
          caption: 'A 100 kVA unit (5%) and a 200 kVA unit (4%) in parallel: the larger reaches its rating first, at 280 kVA total.',
          x: [0, 280],
          y: [0, 250],
          xLabel: 'total load (kVA)',
          yLabel: 'share (kVA)',
          series: [
            { f: (s) => (s * 5) / 7, label: '200 kVA, 4%' },
            { f: (s) => (s * 2) / 7, label: '100 kVA, 5%', dashed: true },
          ],
          marks: [{ y: 200, label: '200 kVA unit full' }],
        },
      ],
      keyIdeas: [
        r`Equal ratios: they share like a current divider, $S_A = S_L\frac{Z_B}{Z_A + Z_B}$ (ohmic impedances on one base).`,
        r`On their own ratings, load divides as $\frac{S_{rated}}{Z_{pu}}$: equal $Z_{pu}$ gives sharing in proportion to rating.`,
        r`Unequal ratios circulate $I_c = \frac{E_A - E_B}{Z_A + Z_B}$ even at no load.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The largest load',
          problem: r`A 100 kVA unit with $Z = 5\%$ and a 200 kVA unit with $Z = 4\%$ (same X/R) share a load. What is the largest load before one is overloaded?`,
          steps: [
            r`Shares go as $\frac{100}{0.05} = 2000$ and $\frac{200}{0.04} = 5000$, so the 200 kVA unit takes $\frac{5}{7}$.`,
            r`It is full at $200 \times \frac{7}{5} = 280$ kVA; the 100 kVA unit then carries 80 kVA.`,
          ],
          answer: r`280 kVA.`,
        },
        {
          level: 'board',
          title: 'A circulating current',
          problem: r`Two 100 kVA, 240 V units are paralleled, but their open-circuit secondary voltages are 240 V and 236 V. Each has $0.02 + j0.04$ Ω referred to the secondary. Find the circulating current at no load, as a share of rated current.`,
          steps: [
            r`$I_c = \frac{240 - 236}{\lvert 0.04 + j0.08\rvert} = \frac{4}{0.0894} = 44.7$ A.`,
            r`Rated current $\frac{100\,000}{240} = 416.7$ A, so $I_c$ is 10.7% of it, flowing with no load at all.`,
          ],
          answer: r`44.7 A, 10.7% of rated.`,
        },
      ],
      traps: [
        r`The unit with the LOWER per-unit impedance takes more than its share.`,
        r`Wrong polarity in parallel is a dead short, not a small mismatch.`,
      ],
      check: [
        { q: r`Two units of equal per-unit impedance, 100 and 300 kVA, share 300 kVA. What does each carry?`, a: r`In proportion to rating: 75 kVA and 225 kVA.` },
        { q: r`What drives a circulating current between paralleled transformers?`, a: r`A difference in their voltage ratios.` },
      ],
    },
    {
      name: 'DC Generator Principles',
      inShort: r`Conductors cutting flux generate $E = \frac{P\Phi ZN}{60a}$, rectified by the commutator.`,
      body: [
        r`A conductor moving through a magnetic field generates a voltage; in a rotating armature it alternates as the conductor passes north and south poles. The **commutator**, a ring of copper segments with brushes on it, reverses each coil's connection just as its voltage reverses, so the output stays one way. With many coils spread around the armature, the ripple nearly disappears:`,
        {
          type: 'plot',
          alt: 'Output of a commutated armature over one revolution: one coil gives a full-wave rectified sine dipping to zero; two coils 90 degrees apart give a much flatter wave dipping only to 71 percent.',
          caption: 'Commutated output: one coil (dashed) dips to zero, two coils 90° apart (solid) only to 71%; more coils, less ripple.',
          x: [0, 360],
          y: [0, 1.15],
          xLabel: 'rotation (°)',
          yLabel: 'e / E_max',
          series: [
            { f: (t) => Math.max(Math.abs(Math.sin(t * deg)), Math.abs(Math.cos(t * deg))), label: 'two coils' },
            { f: (t) => Math.abs(Math.sin(t * deg)), label: 'one coil', dashed: true },
          ],
          legend: false,
        },
        r`The generated EMF is $E = \frac{P\Phi ZN}{60a}$: P poles, Φ webers per pole, Z active conductors, N rpm, and a parallel paths through the winding.`,
        r`| | Lap winding | Wave winding |
|---|---|---|
| Parallel paths a | $mP$ (m = 1 simplex, 2 duplex) | $2m$ |
| Suits | low voltage, high current | high voltage, low current |
| Brushes | as many as poles | two can serve |`,
      ],
      keyIdeas: [
        r`$E = \frac{P\Phi ZN}{60a} = K\Phi N$; lap $a = mP$, wave $a = 2m$.`,
        r`Shunt: $I_a = I_L + I_f$; series: $I_a = I_L$; compound adds a series field (long or short shunt).`,
        r`$V_t = E - I_aR_a$ (minus series-field and brush drops where given).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Generated EMF',
          problem: r`A 4-pole, lap-wound generator has 500 conductors and 20 mWb per pole at 1200 rpm. Find E.`,
          steps: [
            r`Simplex lap: $a = P = 4$.`,
            r`$E = \frac{4 \times 0.02 \times 500 \times 1200}{60 \times 4} = 200$ V.`,
          ],
          answer: r`200 V.`,
        },
        {
          level: 'board',
          title: 'Flux from a duplex winding',
          problem: r`A 6-pole, duplex lap-wound armature with 720 conductors generates 250 V at 900 rpm. Find the flux per pole.`,
          steps: [
            r`Duplex lap: $a = mP = 2 \times 6 = 12$.`,
            r`$\Phi = \frac{60aE}{PZN} = \frac{60 \times 12 \times 250}{6 \times 720 \times 900} = 0.0463$ Wb.`,
          ],
          answer: r`46.3 mWb.`,
        },
      ],
      traps: [
        r`Lap or wave changes a: a simplex wave winding of a 4-pole machine gives twice the voltage of a lap one.`,
        r`Count active conductors, not turns: Z is twice the number of turns.`,
      ],
      check: [
        { q: r`How many parallel paths has an 8-pole simplex wave winding?`, a: r`2.` },
        { q: r`What keeps a DC generator's output one-directional?`, a: r`The commutator.` },
      ],
    },
    {
      name: 'DC Generator Characteristics',
      inShort: r`How each type of generator's voltage holds up as load is added.`,
      body: [
        r`A self-excited generator feeds its own field. A **shunt** generator builds up only if it has some residual magnetism, the field aids it, and the field resistance is below the **critical resistance** (the slope of the open-circuit curve's straight part). Under load, each type behaves differently:`,
        {
          type: 'plot',
          alt: 'Terminal voltage against load current for four DC generators: the series generator rising from near zero as load grows, the shunt drooping, the flat-compounded staying level, and the over-compounded rising.',
          caption: 'External characteristics: series rises, shunt droops, flat compound holds, over-compound rises.',
          x: [0, 1.25],
          y: [0, 1.8],
          xLabel: 'load current (per unit)',
          yLabel: 'V (per unit)',
          series: [
            { f: (x) => 1.05 * Math.tanh(1.6 * x), label: 'series', dashed: true },
            { f: (x) => 1.1 - 0.06 * x - 0.06 * x * x, label: 'shunt' },
            { f: (x) => 1 + 0.04 * x - 0.04 * x * x, label: 'flat compound' },
            { f: (x) => 1 + 0.09 * x, label: 'over-compound' },
          ],
        },
        r`| Generator | Under load | Used for |
|---|---|---|
| Separately excited | droops slightly | wide-range control, testing |
| Shunt | droops (armature drop, armature reaction, weaker field) | battery charging, steady loads nearby |
| Series | rises, then falls | boosters, series lighting (constant current) |
| Cumulative compound, flat | about level | general supply |
| Cumulative compound, over | rises | feeding distant loads (makes up line drop) |
| Differential compound | falls steeply | welding |`,
      ],
      keyIdeas: [
        r`A shunt generator builds up only with residual flux and a field resistance below critical.`,
        r`Shunt droops, series rises, flat compound holds, over-compound rises.`,
        r`$\text{VR} = \frac{V_{NL} - V_{FL}}{V_{FL}}$; long shunt: $E = V + I_a(R_a + R_{se}) + V_{brush}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A shunt generator',
          problem: r`A 230 V shunt generator delivers 100 A. Its field is 115 Ω and its armature 0.05 Ω. Find the armature current and the generated EMF.`,
          steps: [
            r`$I_f = \frac{230}{115} = 2$ A, so $I_a = 100 + 2 = 102$ A.`,
            r`$E = 230 + 102 \times 0.05 = 235.1$ V.`,
          ],
          answer: r`102 A; 235.1 V.`,
        },
        {
          level: 'board',
          title: 'A long-shunt compound generator',
          problem: r`A 20 kW, 250 V long-shunt compound generator has $R_a = 0.08$ Ω, a series field of 0.02 Ω, a shunt field of 125 Ω and a 2 V brush drop. Find the generated EMF at full load.`,
          steps: [
            r`$I_L = \frac{20\,000}{250} = 80$ A, $I_f = \frac{250}{125} = 2$ A, $I_a = 82$ A (long shunt: through the series field too).`,
            r`$E = 250 + 82(0.08 + 0.02) + 2 = 260.2$ V.`,
          ],
          answer: r`260.2 V.`,
        },
      ],
      traps: [
        r`The armature carries the field current too: $I_a$ is more than the load current.`,
        r`Long shunt: the series field carries $I_a$; short shunt: it carries $I_L$.`,
      ],
      check: [
        { q: r`A 230 V generator has 6% regulation. What is its no-load voltage?`, a: r`$230 \times 1.06 = 243.8$ V.` },
        { q: r`A shunt generator fails to build up. Name two possible causes.`, a: r`No residual magnetism; field resistance above critical; field connected to oppose.` },
      ],
    },
    {
      name: 'Armature Reaction and Commutation',
      inShort: r`The armature's own mmf distorts and weakens the field; reversing coil current causes sparking.`,
      body: [
        r`Load current in the armature makes its own mmf, at right angles to the main field. Together they **distort** the field: crowded under one pole tip, thinned under the other, with the magnetic neutral plane shifted (forward in a generator, back in a motor). Where the crowded tip saturates, the net flux also drops: armature reaction **demagnetizes**.`,
        {
          type: 'plot',
          alt: 'Air-gap field around a two-pole machine over one revolution in electrical degrees: the flat-topped main field alone, and the field with the armature mmf added, raised under one tip of each pole and lowered under the other.',
          caption: 'The main field alone (dashed) and with the armature’s mmf added (solid): one tip of each pole strengthened, the other weakened.',
          x: [0, 360],
          y: [-1.8, 1.8],
          xLabel: 'position (electrical °)',
          yLabel: 'B (per unit)',
          series: [
            { f: (t) => mainField(t) + armatureMmf(t), label: 'resultant' },
            { f: mainField, label: 'main field', dashed: true },
          ],
          legend: false,
        },
        r`**Commutation** reverses each coil's current from +I to −I in the moment its segments pass under a brush. The coil's inductance resists that, with a **reactance voltage** of about $L\frac{2I}{T_c}$; if the reversal is incomplete when the segment leaves the brush, it sparks. The cures: **interpoles** (small poles between the main poles, in series with the armature) and, in large machines, **compensating windings** in the pole faces, also in series with the armature, which cancel the armature mmf.`,
      ],
      keyIdeas: [
        r`Per pole: demagnetizing $AT_d = \frac{ZI\beta}{360}$, cross-magnetizing $ZI\left(\frac{1}{2P} - \frac{\beta}{360}\right)$, $I = \frac{I_a}{a}$, β in mechanical degrees.`,
        r`Reactance voltage $L\frac{2I}{T_c}$ opposes reversal; interpoles and compensating windings (both in series with the armature) counter it.`,
        r`Brushes are shifted forward (generator) or backward (motor) to the new neutral plane.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Ampere-turns per pole',
          problem: r`A 4-pole, lap-wound generator with 480 conductors carries 100 A, and its brushes are shifted 8 mechanical degrees. Find the demagnetizing and cross-magnetizing ampere-turns per pole.`,
          steps: [
            r`Conductor current $I = \frac{100}{4} = 25$ A.`,
            r`$AT_d = \frac{480 \times 25 \times 8}{360} = 266.7$ A·t; $AT_c = 480 \times 25\left(\frac{1}{8} - \frac{8}{360}\right) = 1233$ A·t.`,
          ],
          answer: r`266.7 and 1233 ampere-turns per pole.`,
        },
        {
          level: 'board',
          title: 'Reactance voltage, and a brush shift',
          problem: r`(a) A coil of 0.1 mH carries 25 A, reversed in a commutation time of 0.5 ms. Find the average reactance voltage. (b) An 8-pole machine's brushes are shifted 12 electrical degrees: how many mechanical degrees is that?`,
          steps: [
            r`(a) $L\frac{2I}{T_c} = 10^{-4} \times \frac{50}{5 \times 10^{-4}} = 10$ V.`,
            r`(b) Mechanical $= \frac{\text{electrical}}{P/2} = \frac{12}{4} = 3^\circ$.`,
          ],
          answer: r`10 V; 3 mechanical degrees.`,
        },
      ],
      traps: [
        r`Convert an electrical brush shift to mechanical degrees: divide by $P/2$.`,
        r`Interpoles and compensating windings are in SERIES with the armature, so they track the load.`,
      ],
      check: [
        { q: r`How are interpoles and compensating windings connected?`, a: r`Both in series with the armature.` },
        { q: r`Which way are a generator's brushes shifted?`, a: r`Forward, in the direction of rotation.` },
      ],
    },
    {
      name: 'DC Motor Torque and Speed',
      inShort: r`Back EMF sets the speed; armature current sets the torque.`,
      body: [
        r`A turning motor also generates, a **back EMF** $E_b = V - I_aR_a$ that opposes the supply. Since $E_b = K\Phi N$, the speed is $N \propto \frac{V - I_aR_a}{\Phi}$, and the torque is $T = K\Phi I_a = \frac{E_bI_a}{\omega}$. Load the motor and it slows a little, $E_b$ falls, and more current flows until the torque matches.`,
        {
          type: 'plot',
          alt: 'Speed against torque, both per unit: the shunt motor nearly level, falling a few percent from no load to full load; the series motor falling steeply, very fast at light load.',
          caption: 'Speed against torque: the shunt motor (solid) holds nearly constant speed; the series motor (dashed) races at light load.',
          x: [0.1, 2],
          y: [0, 3.2],
          xLabel: 'torque (per unit)',
          yLabel: 'speed (per unit)',
          series: [
            { f: (t) => 1.05 - 0.05 * t, label: 'shunt' },
            { f: (t) => 1 / Math.sqrt(t), label: 'series', dashed: true },
          ],
          legend: false,
        },
        r`| Motor | Speed | Starting torque | Uses |
|---|---|---|---|
| Shunt | nearly constant, adjustable | medium | fans, pumps, machine tools |
| Series | falls steeply with load; races unloaded | very high ($T \propto I^2$) | cranes, hoists, traction, starters |
| Cumulative compound | falls moderately | high | presses, shears, elevators |
| Differential compound | can be unstable | low | rarely used |`,
      ],
      keyIdeas: [
        r`$E_b = V - I_aR_a$, $N \propto \frac{E_b}{\Phi}$; $T = K\Phi I_a = \frac{E_bI_a}{\omega}$.`,
        r`Shunt: nearly constant speed. Series: $T \propto I^2$, speed falls steeply with load, never run unloaded.`,
        r`Shaft power $= T\omega$; 1 hp = 746 W.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Torque, and speed under more load',
          problem: r`A 220 V shunt motor ($R_a = 0.2$ Ω) runs at 1200 rpm taking 50 A in its armature. Find its torque, and its speed at 80 A with the same flux.`,
          steps: [
            r`$E_b = 220 - 50 \times 0.2 = 210$ V; $\omega = \frac{2\pi \times 1200}{60} = 125.7$ rad/s; $T = \frac{210 \times 50}{125.7} = 83.6$ N·m.`,
            r`At 80 A: $E_b = 220 - 16 = 204$ V, so $N = 1200 \times \frac{204}{210} = 1166$ rpm.`,
          ],
          answer: r`83.6 N·m; 1166 rpm.`,
        },
        {
          level: 'board',
          title: 'A series motor at half load current',
          problem: r`A 230 V series motor ($R_a + R_{se} = 0.25$ Ω) runs at 900 rpm taking 40 A. Find its speed and torque ratio at 20 A, taking the flux as proportional to current.`,
          steps: [
            r`$E_1 = 230 - 40 \times 0.25 = 220$ V; $E_2 = 230 - 20 \times 0.25 = 225$ V.`,
            r`$N_2 = 900 \times \frac{225}{220} \times \frac{40}{20} = 1841$ rpm (half the flux, so twice the speed per volt).`,
            r`$T \propto \Phi I \propto I^2$: $\left(\frac{20}{40}\right)^2 = 0.25$ of the torque.`,
          ],
          answer: r`1841 rpm; a quarter of the torque.`,
        },
      ],
      traps: [
        r`Weakening the field RAISES the speed; an open field can make a shunt motor race.`,
        r`A series motor's flux changes with load: include $\frac{\Phi_1}{\Phi_2}$ in the speed ratio.`,
      ],
      check: [
        { q: r`What is the rated torque of a 10 hp motor at 1750 rpm?`, a: r`$\frac{7457}{183.3} = 40.7$ N·m.` },
        { q: r`A 240 V motor takes 30 A at 1450 rpm; a brake 0.5 m long holds 80 N. What is its efficiency?`, a: r`$T = 40$ N·m, output 6074 W, input 7200 W: 84.4%.` },
      ],
    },
    {
      name: 'DC Motor Starting and Control',
      inShort: r`At standstill there is no back EMF, so starting current must be limited.`,
      body: [
        r`At standstill there is no back EMF, so only the small armature resistance limits the current: a 220 V motor with 0.4 Ω would draw 550 A. A **starter** puts resistance in series and cuts it out step by step as the motor speeds up and its back EMF grows, keeping the current between two limits:`,
        {
          type: 'plot',
          alt: 'Armature current during stepped starting against back EMF as a share of the supply: the current falls from 60 A to 40 A as the motor speeds up, then jumps back to 60 A at each step of resistance cut out, a sawtooth of six steps.',
          caption: 'A stepped starter (220 V, 0.4 Ω, 60 A to 40 A): each step cut out lifts the current back to 60 A.',
          x: [0, 1],
          y: [0, 70],
          xLabel: 'E_b / V',
          yLabel: 'I_a (A)',
          series: [{ f: starterCurrent, label: 'I_a' }],
          marks: [{ y: 40, label: '40 A' }],
        },
        r`| Speed control | Range | How |
|---|---|---|
| Armature resistance | below base speed | wasteful: the resistor burns power |
| Armature voltage (Ward-Leonard, converters) | below base speed, wide | efficient, smooth |
| Field weakening | above base speed | cheap; torque falls at rated current |`,
      ],
      keyIdeas: [
        r`$R_{st} = \frac{V}{I_{st}} - R_a$, with $I_{st}$ about 1.5 to 2 times rated (subtract any brush drop from V).`,
        r`Starter steps: $R_{k+1} = R_k\frac{I_2}{I_1}$, sections $n = \frac{\ln(R_1/R_a)}{\ln(I_1/I_2)}$, rounded up.`,
        r`Speed control: armature resistance or voltage below base speed, field weakening above it.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Starter resistance and sections',
          problem: r`A 220 V motor with $R_a = 0.4$ Ω is started between 60 A and 40 A. Find the starting resistance and the number of starter sections.`,
          steps: [
            r`$R_1 = \frac{220}{60} = 3.667$ Ω total, so $R_{st} = 3.267$ Ω.`,
            r`$n = \frac{\ln(3.667/0.4)}{\ln1.5} = 5.46$, so 6 sections.`,
          ],
          answer: r`3.27 Ω; 6 sections.`,
        },
        {
          level: 'board',
          title: 'Resistance speed control, and a brush drop',
          problem: r`(a) A 220 V shunt motor ($R_a = 0.3$ Ω) takes 40 A at 1000 rpm. With the load torque constant, 1.2 Ω is added to the armature. Find the new speed. (b) A 120 V motor ($R_a = 0.15$ Ω, 2 V brush drop) rated 50 A is to start at 150% of rated. Find the starting resistance.`,
          steps: [
            r`(a) Constant torque and flux keep $I_a = 40$ A. $E_1 = 220 - 40 \times 0.3 = 208$ V; $E_2 = 220 - 40 \times 1.5 = 160$ V; $N = 1000 \times \frac{160}{208} = 769$ rpm.`,
            r`(b) $R = \frac{120 - 2}{75} - 0.15 = 1.423$ Ω.`,
          ],
          answer: r`769 rpm; 1.42 Ω.`,
        },
      ],
      traps: [
        r`Round the number of sections UP: five would leave the last step too large.`,
        r`Speed control by armature resistance wastes power in the resistor.`,
      ],
      check: [
        { q: r`Which speed-control method gives speeds above base speed?`, a: r`Field weakening.` },
        { q: r`Why does a DC motor need a starter?`, a: r`With no back EMF at standstill, only $R_a$ limits the current.` },
      ],
    },
    {
      name: 'Losses and Efficiency',
      inShort: r`Copper losses vary with load; core, friction and field losses stay about constant.`,
      body: [
        r`A DC machine's losses split into two kinds:`,
        r`| Constant (stray and field) | Variable (with load) |
|---|---|
| Core: hysteresis ($\propto N$) and eddy current ($\propto N^2$) at constant flux | Armature copper $I_a^2R_a$ |
| Friction and windage (with speed) | Series field and interpole copper |
| Shunt field copper $V I_f$ | Brush contact ($V_b I_a$) |`,
        r`Efficiency is highest where the variable losses equal the constant ones: $I_a^2R_a = P_{const}$. **Swinburne's test** finds the constant losses from one no-load run as a motor: the input $VI_0$ minus the small armature copper loss at no load.`,
        {
          type: 'plot',
          alt: 'Efficiency of a 230 V shunt motor against armature current: rising quickly from low current, peaking near 89 percent at 67.8 A, then falling slowly.',
          caption: 'Efficiency against armature current (230 V, 0.2 Ω, 918 W constant): highest at 67.8 A, where copper loss equals the constant losses.',
          x: [5, 150],
          y: [60, 100],
          xLabel: 'I_a (A)',
          yLabel: 'η (%)',
          series: [{ f: (ia) => 100 * (1 - (918.2 + 0.2 * ia * ia) / (230 * (ia + 1))), label: 'η' }],
          marks: [{ x: Math.sqrt(918.2 / 0.2), label: '67.8 A' }],
        },
      ],
      keyIdeas: [
        r`$\eta = \frac{\text{output}}{\text{output} + \text{losses}}$; maximum where $I_a^2R_a$ = constant losses.`,
        r`Swinburne's test: constant losses $= VI_0 - I_{a0}^2R_a$ from a no-load run.`,
        r`At constant flux, hysteresis goes with speed and eddy loss with speed squared.`,
      ],
      examples: [
        {
          level: 'basic',
          title: "Swinburne's test",
          problem: r`A 230 V shunt motor ($R_a = 0.2$ Ω, field 1 A) takes 4 A at no load. Find its constant losses, its efficiency taking 51 A, and the armature current for maximum efficiency.`,
          steps: [
            r`$I_{a0} = 3$ A: $P_{const} = 920 - 9 \times 0.2 = 918.2$ W.`,
            r`At $I_a = 50$ A: copper $= 50^2 \times 0.2 = 500$ W; $\eta = \frac{11\,730 - 918.2 - 500}{11\,730} = 87.9\%$.`,
            r`Maximum at $I_a = \sqrt{\frac{918.2}{0.2}} = 67.8$ A.`,
          ],
          answer: r`918.2 W; 87.9%; 67.8 A.`,
        },
        {
          level: 'board',
          title: 'Separating the core losses',
          problem: r`At constant field current a machine's core loss is 800 W at 1000 rpm and 300 W at 500 rpm. Separate hysteresis and eddy loss, and find the core loss at 1200 rpm.`,
          steps: [
            r`Write $P = AN + BN^2$: $1000A + 10^6B = 800$ and $500A + 2.5 \times 10^5B = 300$.`,
            r`Doubling the second and subtracting: $5 \times 10^5B = 200$, so $B = 4 \times 10^{-4}$ and $A = 0.4$: at 1000 rpm, 400 W of each.`,
            r`At 1200 rpm: $0.4 \times 1200 + 4 \times 10^{-4} \times 1200^2 = 480 + 576 = 1056$ W.`,
          ],
          answer: r`400 W hysteresis and 400 W eddy at 1000 rpm; 1056 W at 1200 rpm.`,
        },
      ],
      traps: [
        r`The input current includes the field current; only the armature part makes copper loss in $R_a$.`,
        r`Mechanical losses depend on speed, not on load current.`,
      ],
      check: [
        { q: r`Which loss do laminations reduce?`, a: r`Eddy-current loss.` },
        { q: r`Which DC machine loss varies most with load current?`, a: r`Armature copper loss.` },
      ],
    },
  ],
};
