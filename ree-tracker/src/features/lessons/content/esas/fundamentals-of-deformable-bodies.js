// Library › Lessons › ESAS › Fundamentals of Deformable Bodies
// (2026-11-17; every subtopic in the module format 2026-11-25, with figures,
// examples a step at a time and checks; every number re-worked by
// deformableLesson.test.js. Coverage and problem styles cross-checked against a
// review center's deformable bodies handout; the text, problems and figures
// are this app's own): written for the Philippine REE board, subtopic by
// subtopic in the syllabus's order. Engineering Mechanics supplies the
// reactions, centroids and moments of inertia used here.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;
const rad = (d) => (d * Math.PI) / 180;

// The Mohr's circle example: centre 30 MPa, radius √(50² + 30²).
const MOHR_R = Math.hypot(50, 30);
const mohr = Array.from({ length: 181 }, (_, i) => {
  const a = (i / 180) * 2 * Math.PI;
  return [30 + MOHR_R * Math.cos(a), MOHR_R * Math.sin(a)];
});

export default {
  topic: 'Fundamentals of Deformable Bodies',
  subject: 'ESAS',
  overview: r`Strength of materials: how much stress a member carries and how far it deforms, so it can be sized to be safe and stiff enough. Axial bars, shafts in torsion, beams in bending and shear, combined stresses, columns, pressure vessels and joints all follow the same three steps: equilibrium for the internal forces, a stress formula for the section, and a deformation formula (or compatibility) when statics alone isn't enough. Work in N and mm where you can: 1 N/mm² is 1 MPa.`,
  sources: [
    'Mechanics of Materials (Gere and Goodno)',
    'Strength of Materials (Pytel and Singer)',
    'PRC Table of Specifications, REE: Engineering Sciences and Allied Subjects',
  ],
  subtopics: [
    {
      name: 'Simple Stress',
      inShort: r`Force over area: normal, shear and bearing stress.`,
      body: [
        r`**Stress** is internal force per unit area. A load square to the area gives **normal** stress $\sigma = \frac PA$ (tension or compression); a load along the area gives **shear** stress $\tau = \frac VA$; a pin or rivet pressing on the side of its hole gives **bearing** stress $\frac{P}{td}$, on the projected area. 1 N/mm² = 1 MPa.`,
        r`A bar in tension also carries shear on slanted planes: on a plane at θ to the cross-section, $\sigma_\theta = \frac PA\cos^2\theta$ and $\tau_\theta = \frac{P}{2A}\sin2\theta$, the shear peaking at 45°, which is why ductile metals slip and break at 45°:`,
        {
          type: 'plot',
          alt: 'Normal and shear stress on a plane inclined at angle theta in a bar with 100 MPa axial stress: the normal stress falling from 100 MPa at 0 degrees to zero at 90; the shear stress, dashed, rising from zero to a peak of 50 MPa at 45 degrees and back.',
          caption: 'A bar at 100 MPa: normal stress on a slanted plane falls with angle (solid); shear (dashed) peaks at 50 MPa on 45° planes.',
          x: [0, 90],
          y: [0, 110],
          xLabel: 'θ (°)',
          yLabel: 'stress (MPa)',
          series: [
            { f: (t) => 100 * Math.cos(rad(t)) ** 2, label: 'σ' },
            { f: (t) => 50 * Math.sin(rad(2 * t)), label: 'τ', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 45, label: '45°' }],
        },
        r`Design keeps stresses below an **allowable** stress, the material's failure strength divided by a **factor of safety**. Punching a hole shears the metal around its rim, $P = \tau_u\pi dt$, using about $P\frac t2$ of energy.`,
      ],
      keyIdeas: [
        r`$\sigma = \frac PA$; shear $\tau = \frac VA$ per plane (double shear: two planes); bearing $\frac{P}{td}$.`,
        r`Allowable stress = failure strength ÷ factor of safety.`,
        r`On a plane at $\theta$: $\sigma_\theta = \frac PA\cos^2\theta$, $\tau_\theta = \frac{P}{2A}\sin2\theta$, greatest shear at 45°.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A pin and a bolt',
          problem: r`A 20 mm pin carries 30 kN in double shear. Find the shear stress. A 20 mm bolt bears 60 kN on a 12 mm plate: find the bearing stress.`,
          steps: [
            r`$A = \frac{\pi \times 20^2}{4} = 314.2$ mm², so $\tau = \frac{30\,000}{2 \times 314.2} = 47.7$ MPa.`,
            r`Bearing: $\frac{60\,000}{12 \times 20} = 250$ MPa.`,
          ],
          answer: r`47.7 MPa; 250 MPa.`,
        },
        {
          level: 'board',
          title: 'Punching a hole',
          problem: r`A 20 mm hole is punched through a 5 mm plate of ultimate shear strength 300 MPa. Find the force and, roughly, the energy.`,
          steps: [
            r`Sheared area $\pi \times 20 \times 5 = 314.2$ mm²: $P = 314.2 \times 300 = 94.2$ kN.`,
            r`$E \approx P\frac t2 = 94\,248 \times 0.0025 = 235.6$ J.`,
          ],
          answer: r`94.2 kN; about 235.6 J.`,
        },
      ],
      traps: [
        r`Count the shear planes: a pin through a clevis has two.`,
        r`Punching shears the RIM, $\pi dt$, not the hole's face.`,
      ],
      check: [
        { q: r`What is ultimate stress divided by working stress?`, a: r`The factor of safety.` },
        { q: r`What is shear stress?`, a: r`Force per unit area acting parallel to the surface.` },
      ],
    },
    {
      name: "Strain and Hooke's Law",
      inShort: r`Deformation per length, proportional to stress in the elastic range.`,
      body: [
        r`**Strain** is deformation per length, $\varepsilon = \frac\delta L$ (shear strain γ is an angle, in radians). Up to the **proportional limit** stress is proportional to strain (**Hooke's law**), $\sigma = E\varepsilon$, so a bar stretches $\delta = \frac{PL}{AE}$. Beyond the **yield point** a ductile steel flows plastically; this idealised picture is what design assumes:`,
        {
          type: 'plot',
          alt: 'An idealised stress-strain diagram for structural steel: a straight elastic line rising to the 250 MPa yield stress at a strain of 0.00125, then flat as the steel yields plastically out to 0.01.',
          caption: 'Idealised steel: elastic up to 250 MPa (E = 200 GPa), then yielding at constant stress.',
          x: [0, 0.01],
          y: [0, 320],
          xLabel: 'strain',
          yLabel: 'σ (MPa)',
          series: [{ f: (e) => Math.min(200000 * e, 250), label: 'σ', area: true }],
          marks: [{ y: 250, label: 'yield' }],
        },
        r`A stretched bar thins: lateral strain is $-\nu\varepsilon$ (**Poisson's ratio** ν, about 0.3 for steel), and shear obeys $\tau = G\gamma$ with $G = \frac{E}{2(1 + \nu)}$. When statics alone cannot find the forces (**statically indeterminate**), add **compatibility**: parts joined side by side stretch equally, so they share load in proportion to AE.`,
      ],
      keyIdeas: [
        r`$\varepsilon = \frac\delta L$, $\sigma = E\varepsilon$, $\delta = \frac{PL}{AE}$; lateral strain $-\nu\varepsilon$; $\tau = G\gamma$ with $G = \frac{E}{2(1 + \nu)}$.`,
        r`Statically indeterminate members: add compatibility (equal stretch, total length fixed).`,
        r`Strain energy $\frac{P^2L}{2AE}$; own weight stretches a bar $\frac{WL}{2AE}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A steel bar',
          problem: r`A steel bar ($E = 200$ GPa, $\nu = 0.3$) 2 m long with 500 mm² cross-section carries 80 kN. Find the stretch, the lateral strain and the stored energy.`,
          steps: [
            r`$\delta = \frac{80\,000 \times 2000}{500 \times 200\,000} = 1.6$ mm; $\varepsilon = 0.0008$, lateral $-0.00024$.`,
            r`$U = \frac12 \times 80\,000 \times 0.0016 = 64$ J.`,
          ],
          answer: r`1.6 mm; −0.00024; 64 J.`,
        },
        {
          level: 'board',
          title: 'Steel and aluminium together',
          problem: r`A steel rod (500 mm², E = 200 GPa) and an aluminium tube (1000 mm², E = 70 GPa) of equal length share a 100 kN load through a rigid plate. Find each one's force and stress.`,
          steps: [
            r`Equal stretch: loads share as AE. $A_sE_s = 10^8$ N, $A_aE_a = 7 \times 10^7$ N.`,
            r`Steel $100 \times \frac{10}{17} = 58.8$ kN, $\frac{58\,824}{500} = 117.6$ MPa. Aluminium 41.2 kN, 41.2 MPa.`,
          ],
          answer: r`58.8 kN, 117.6 MPa; 41.2 kN, 41.2 MPa.`,
        },
      ],
      traps: [
        r`Keep units consistent: N, mm and MPa (= N/mm²) together.`,
        r`Parallel members share load by STIFFNESS (AE), not by area alone.`,
      ],
      check: [
        { q: r`What is Poisson's ratio?`, a: r`Lateral strain over axial strain (with the sign dropped), about 0.3 for steel.` },
        { q: r`Below what stress does Hooke's law hold?`, a: r`The proportional limit.` },
      ],
    },
    {
      name: 'Thermal Stress',
      inShort: r`Temperature change stresses a member only when it is restrained.`,
      body: [
        r`Heat makes a body grow: a length by $\delta_T = \alpha L\Delta T$, an area by about $2\alpha A\Delta T$, a volume by $3\alpha V\Delta T$. Left free, it grows without stress. Held between rigid walls it cannot, and the blocked growth becomes compressive stress, $\sigma = E\alpha\Delta T$. With a gap Δ, stress begins only once the gap has closed:`,
        {
          type: 'plot',
          alt: 'The stress in a 10 m steel rail with a 2 mm gap at one end against the temperature rise: zero until the gap closes at a 17.1 degree rise, then rising in a straight line to 77 MPa at 50 degrees.',
          caption: 'A 10 m rail with a 2 mm gap: no stress until it closes at +17.1 °C, then 2.34 MPa per degree, 77 MPa at +50 °C.',
          x: [0, 60],
          y: [0, 100],
          xLabel: 'ΔT (°C)',
          yLabel: 'σ (MPa)',
          series: [{ f: (dT) => Math.max(0, (200000 * (11.7e-6 * 10000 * dT - 2)) / 10000), label: 'σ', area: true }],
          marks: [{ x: 2 / (11.7e-6 * 10000), label: 'gap closes' }],
        },
        r`Bars of different materials in series between walls carry one common force, found by making their total change of length zero.`,
      ],
      keyIdeas: [
        r`Free change $\delta_T = \alpha L\Delta T$ (area $2\alpha$, volume $3\alpha$); fully restrained $\sigma = E\alpha\Delta T$.`,
        r`With a gap $\Delta$: stress only after it closes, $\sigma = \frac{E(\alpha L\Delta T - \Delta)}{L}$.`,
        r`Bars in series between walls carry one force that cancels their combined expansion.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A rail with a gap',
          problem: r`A 10 m steel rail ($\alpha = 11.7 \times 10^{-6}$/°C) has a 2 mm gap at one end. Find the stress after a 50 °C rise.`,
          steps: [
            r`Free expansion $11.7 \times 10^{-6} \times 10\,000 \times 50 = 5.85$ mm, so 3.85 mm is blocked.`,
            r`$\sigma = \frac{200\,000 \times 3.85}{10\,000} = 77$ MPa compression.`,
          ],
          answer: r`77 MPa compression.`,
        },
        {
          level: 'board',
          title: 'Volume growth and a fully held bar',
          problem: r`An aluminium block (α = 23 × 10⁻⁶/°C) of 1000 cm³ is heated 80 °C: find its volume increase. A steel bar held between rigid walls is heated 30 °C: find its stress.`,
          steps: [
            r`$\Delta V = 3 \times 23 \times 10^{-6} \times 1000 \times 80 = 5.52$ cm³.`,
            r`$\sigma = 200\,000 \times 11.7 \times 10^{-6} \times 30 = 70.2$ MPa compression.`,
          ],
          answer: r`5.52 cm³; 70.2 MPa.`,
        },
      ],
      traps: [
        r`Check whether the gap closes at all before computing stress.`,
        r`Fully restrained thermal stress does not depend on the length.`,
      ],
      check: [
        { q: r`What is the coefficient of volume expansion in terms of α?`, a: r`About $3\alpha$.` },
        { q: r`Does a free bar heated evenly carry any stress?`, a: r`No.` },
      ],
    },
    {
      name: 'Torsion',
      inShort: r`Shafts under torque: shear stress and twist.`,
      body: [
        r`A torque twists a shaft, with shear stress growing from zero at the centre to its greatest at the surface, $\tau = \frac{T\rho}{J}$, so $\tau_{max} = \frac{16T}{\pi d^3}$ for a solid shaft; it twists through $\phi = \frac{TL}{GJ}$ radians. Since the core carries little, a **hollow** shaft is nearly as strong for much less weight:`,
        {
          type: 'plot',
          alt: 'Torque capacity and weight of a hollow shaft, as fractions of a solid shaft of the same outside diameter, against the ratio of inner to outer diameter: torque capacity, solid, stays near 1 until the ratio passes about 0.6; weight, dashed, falls much sooner; at a ratio of 0.5 the shaft keeps 15/16 of its strength with 3/4 of its weight.',
          caption: 'A hollow shaft (same outside diameter): at d/D = 0.5 it keeps 15/16 of the torque (solid) for 3/4 of the weight (dashed).',
          x: [0, 0.9],
          y: [0, 1.1],
          xLabel: 'd_i / d_o',
          yLabel: 'fraction of solid',
          series: [
            { f: (k) => 1 - k ** 4, label: 'torque' },
            { f: (k) => 1 - k ** 2, label: 'weight', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 0.5, label: '0.5' }],
        },
        r`Power is $P = T\omega = 2\pi fT$. A **flanged coupling** passes torque through its bolts in shear: $T = nA\tau R$ for n bolts on radius R. A **helical spring** is a coiled shaft: $\delta = \frac{64PR^3n}{Gd^4}$ and $\tau_{max} \approx \frac{16PR}{\pi d^3}\left(1 + \frac{d}{4R}\right)$ (Wahl's factor is more exact for tight coils).`,
      ],
      keyIdeas: [
        r`$\tau = \frac{Tr}{J}$, $\phi = \frac{TL}{GJ}$; solid $J = \frac{\pi d^4}{32}$, hollow $\frac{\pi(d_o^4 - d_i^4)}{32}$.`,
        r`Power $P = 2\pi fT$; solid shaft $d = \sqrt[3]{\frac{16T}{\pi\tau}}$.`,
        r`Couplings $T = nA\tau R$; springs $\delta = \frac{64PR^3n}{Gd^4}$, in series add reciprocally, in parallel add.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Sizing a shaft',
          problem: r`Size a solid shaft for 75 kW at 1500 rpm with $\tau_{allow} = 60$ MPa, and find its twist over 1 m ($G = 80$ GPa).`,
          steps: [
            r`$T = \frac{75\,000}{2\pi \times 25} = 477.5$ N·m.`,
            r`$d = \sqrt[3]{\frac{16 \times 477.5}{\pi \times 60 \times 10^6}} = 34.3$ mm.`,
            r`$\phi = \frac{477.5 \times 1}{80 \times 10^9 \times 1.367 \times 10^{-7}} = 0.0437$ rad $= 2.50°$.`,
          ],
          answer: r`34.3 mm; 2.50°.`,
        },
        {
          level: 'board',
          title: 'A flanged coupling',
          problem: r`A coupling has six 20 mm bolts on a 150 mm bolt-circle radius, each allowed 60 MPa in shear. What torque can it carry?`,
          steps: [
            r`One bolt: $\frac{\pi \times 20^2}{4} \times 60 = 18\,850$ N.`,
            r`$T = 6 \times 18\,850 \times 0.15 = 16.96$ kN·m.`,
          ],
          answer: r`16.96 kN·m.`,
        },
      ],
      traps: [
        r`Twist comes out in radians; rpm must become rev/s.`,
        r`Hollow shafts: $d_o^4 - d_i^4$, not $(d_o - d_i)^4$.`,
      ],
      check: [
        { q: r`A hollow shaft has an inner diameter half its outer. What fraction of a solid shaft's torque can it carry?`, a: r`$1 - \frac{1}{16} = \frac{15}{16}$.` },
        { q: r`Where is the shear stress greatest in a shaft?`, a: r`At its outer surface.` },
      ],
    },
    {
      name: 'Shear and Moment Diagrams',
      inShort: r`How internal shear and bending moment vary along a beam.`,
      body: [
        r`Cut a beam anywhere: the **shear** V is the sum of forces on one side, the **bending moment** M the sum of their moments. Their diagrams follow simple rules: the slope of the shear diagram is the load ($\frac{dV}{dx} = -w$), the slope of the moment diagram is the shear ($\frac{dM}{dx} = V$), so M is greatest where V crosses zero:`,
        {
          type: 'plot',
          alt: 'Shear and bending moment along a 6 m simple beam carrying 10 kN per metre: the shear falling in a straight line from 30 kN to minus 30 kN, crossing zero at mid-span; the moment, dashed, a parabola rising from zero to 45 kN metres at mid-span and back.',
          caption: 'A 6 m beam, 10 kN/m: shear (solid) falls through zero at mid-span, where the moment (dashed) peaks at 45 kN·m.',
          x: [0, 6],
          y: [-35, 62],
          xLabel: 'x (m)',
          yLabel: 'V (kN), M (kN·m)',
          series: [
            { f: (x) => 30 - 10 * x, label: 'V' },
            { f: (x) => 30 * x - 5 * x * x, label: 'M', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
          marks: [{ x: 3, label: 'V = 0' }],
        },
        r`| Beam and load | Greatest moment |
|---|---|
| Simple, uniform w | $\frac{wL^2}{8}$ at mid-span |
| Simple, central P | $\frac{PL}{4}$ |
| Simple, P at a from one end | $\frac{Pab}{L}$ under the load |
| Cantilever, P at the end | $PL$ at the wall |
| Cantilever, uniform w | $\frac{wL^2}{2}$ at the wall |`,
      ],
      keyIdeas: [
        r`$\frac{dV}{dx} = -w$, $\frac{dM}{dx} = V$: the moment changes by the area of the shear diagram.`,
        r`The greatest moment is where the shear crosses zero.`,
        r`Simple beam: $\frac{wL^2}{8}$, $\frac{PL}{4}$, $\frac{Pab}{L}$; cantilever: $PL$, $\frac{wL^2}{2}$ at the wall.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A simple beam',
          problem: r`A 6 m simple beam carries 10 kN/m. Find the reactions and the greatest moment. What does a single 20 kN load 2 m from one end give instead?`,
          steps: [
            r`Reactions $\frac{10 \times 6}{2} = 30$ kN; $M_{max} = \frac{10 \times 6^2}{8} = 45$ kN·m at mid-span.`,
            r`Point load: $\frac{20 \times 2 \times 4}{6} = 26.7$ kN·m under the load.`,
          ],
          answer: r`30 kN; 45 kN·m; 26.7 kN·m.`,
        },
        {
          level: 'board',
          title: 'A loaded cantilever',
          problem: r`A 3 m cantilever carries 4 kN/m along its length and 10 kN at its tip. Find the shear and moment at the wall.`,
          steps: [
            r`$V = 4 \times 3 + 10 = 22$ kN.`,
            r`$M = \frac{4 \times 3^2}{2} + 10 \times 3 = 18 + 30 = 48$ kN·m.`,
          ],
          answer: r`22 kN; 48 kN·m.`,
        },
      ],
      traps: [
        r`Sign conventions: sagging moment positive, shear positive when the left side pushes up.`,
        r`A cantilever's greatest moment is at the WALL.`,
      ],
      check: [
        { q: r`What shape is the moment diagram under a uniform load?`, a: r`A parabola.` },
        { q: r`Where is the bending moment greatest?`, a: r`Where the shear is zero (or changes sign).` },
      ],
    },
    {
      name: 'Flexural Stress',
      inShort: r`Bending stress, zero at the neutral axis and greatest at the outer fibres.`,
      body: [
        r`A bent beam's fibres stretch on one side and shorten on the other, with no strain at the **neutral axis** through the centroid. Bending stress grows straight across the depth, $\sigma = \frac{My}{I}$:`,
        {
          type: 'plot',
          alt: 'Bending stress across the depth of a 100 by 300 mm timber beam under 40 kN metres: varying in a straight line from minus 26.7 MPa at the top to plus 26.7 MPa at the bottom, zero at the neutral axis in the middle.',
          caption: 'A 100 × 300 mm beam at 40 kN·m: stress varies straight through the depth, ±26.7 MPa at the faces, zero at the neutral axis.',
          x: [-150, 150],
          y: [-30, 30],
          xLabel: 'distance from neutral axis (mm)',
          yLabel: 'σ (MPa)',
          series: [{ f: (y) => (40e6 * y) / ((100 * 300 ** 3) / 12), label: 'σ', area: true }],
          marks: [{ x: 0, label: 'neutral axis' }],
        },
        r`The greatest stress is at the outer fibre, $\frac{Mc}{I} = \frac MS$, with the **section modulus** $S = \frac Ic$: $\frac{bh^2}{6}$ for a rectangle, $\frac{\pi d^3}{32}$ for a circle. The beam curves with radius $\rho = \frac{EI}{M}$. A beam of two materials is worked by transforming one into the other with $n = \frac{E_2}{E_1}$.`,
      ],
      keyIdeas: [
        r`$\sigma = \frac{My}{I}$; maximum $\frac{M}{S}$ with section modulus $S = \frac Ic$ ($\frac{bh^2}{6}$ for a rectangle).`,
        r`Curvature $\frac1\rho = \frac{M}{EI}$.`,
        r`Two materials: transform one by $n = \frac{E_2}{E_1}$, then multiply its stress back by $n$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A timber beam',
          problem: r`A 100 mm × 300 mm timber beam (on edge) carries a 40 kN·m moment. Find the greatest bending stress.`,
          steps: [
            r`$S = \frac{100 \times 300^2}{6} = 1.5 \times 10^6$ mm³.`,
            r`$\sigma = \frac{40 \times 10^6}{1.5 \times 10^6} = 26.7$ MPa. Laid flat, S is three times smaller.`,
          ],
          answer: r`26.7 MPa.`,
        },
        {
          level: 'board',
          title: 'A round bar',
          problem: r`A 100 mm steel bar is bent by 5 kN·m. Find the greatest bending stress.`,
          steps: [r`$\sigma = \frac{32M}{\pi d^3} = \frac{32 \times 5 \times 10^6}{\pi \times 100^3} = 50.9$ MPa.`],
          answer: r`50.9 MPa.`,
        },
      ],
      traps: [
        r`For an unsymmetric section (a T), use the larger c for the greater stress.`,
        r`A beam is stronger ON EDGE: S grows with the depth squared.`,
      ],
      check: [
        { q: r`What is the bending stress at the neutral axis?`, a: r`Zero.` },
        { q: r`What is the section modulus of a b × h rectangle?`, a: r`$\frac{bh^2}{6}$.` },
      ],
    },
    {
      name: 'Shear Stress in Beams',
      inShort: r`Shear stress across a beam's depth, and the shear flow fasteners must carry.`,
      body: [
        r`The shear force in a beam is not spread evenly over the section: $\tau = \frac{VQ}{Ib}$, where Q is the first moment of the area beyond the level and b the width there. In a rectangle it is zero at the faces and greatest, $\frac32$ of the average, at the neutral axis:`,
        {
          type: 'plot',
          alt: 'Shear stress across the depth of a 100 by 300 mm beam carrying 50 kN of shear: a parabola, zero at the top and bottom faces and 2.5 MPa at the neutral axis, one and a half times the 1.67 MPa average, dashed.',
          caption: '50 kN on a 100 × 300 mm beam: shear stress peaks at 2.5 MPa at the neutral axis, 1.5 times the average (dashed).',
          x: [-150, 150],
          y: [0, 3],
          xLabel: 'distance from neutral axis (mm)',
          yLabel: 'τ (MPa)',
          series: [
            { f: (y) => ((3 * 50000) / (2 * 100 * 300)) * (1 - (y / 150) ** 2), label: 'τ', area: true },
            { f: () => 50000 / (100 * 300), label: 'average', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`For a circle the peak is $\frac43$ of the average; in an I-beam the web carries nearly all of it. Where parts are joined (bolts, nails, welds), they must carry the **shear flow** $q = \frac{VQ}{I}$ per length, setting the spacing $s = \frac Fq$.`,
      ],
      keyIdeas: [
        r`$\tau = \frac{VQ}{Ib}$, Q being the first moment of the area beyond the level.`,
        r`Rectangle $\tau_{max} = \frac{3V}{2A}$; circle $\frac{4V}{3A}$; an I-beam's web carries most of it.`,
        r`Shear flow $q = \frac{VQ}{I}$; fastener spacing $s = \frac Fq$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A rectangle',
          problem: r`The same 100 × 300 mm beam carries 50 kN of shear. Find the greatest shear stress.`,
          steps: [r`$\tau_{max} = \frac{3 \times 50\,000}{2 \times 100 \times 300} = 2.5$ MPa, at the neutral axis.`],
          answer: r`2.5 MPa.`,
        },
        {
          level: 'board',
          title: 'A round section',
          problem: r`A 100 mm round bar carries 40 kN of shear. Find the greatest shear stress.`,
          steps: [
            r`$A = \frac{\pi \times 100^2}{4} = 7854$ mm².`,
            r`$\tau_{max} = \frac{4 \times 40\,000}{3 \times 7854} = 6.79$ MPa.`,
          ],
          answer: r`6.79 MPa.`,
        },
      ],
      traps: [
        r`b is the width AT the level, which changes in flanged sections.`,
        r`Bending stress peaks at the faces; shear stress peaks at the neutral axis.`,
      ],
      check: [
        { q: r`Where is a beam's shear stress zero?`, a: r`At its top and bottom faces.` },
        { q: r`What part of an I-beam carries most of the shear?`, a: r`The web.` },
      ],
    },
    {
      name: 'Beam Deflection',
      inShort: r`How far a beam sags, by double integration, standard cases or moment-area.`,
      body: [
        r`A beam's deflection y obeys $EIy'' = M(x)$: integrate the moment twice and fix the constants from the supports. A simple beam under uniform load sags most at mid-span:`,
        {
          type: 'plot',
          alt: 'The deflected shape of a 4 m simple beam carrying 5 kN per metre with EI of 1.6 million newton square metres: sagging smoothly from zero at each support to 10.4 mm at mid-span.',
          caption: 'A 4 m beam, 5 kN/m, EI = 1.6 MN·m²: it sags 10.4 mm at mid-span.',
          x: [0, 4],
          y: [0, 12],
          xLabel: 'x (m)',
          yLabel: 'deflection (mm)',
          series: [{ f: (x) => ((5000 * x * (4 ** 3 - 2 * 4 * x * x + x ** 3)) / (24 * 1.6e6)) * 1000, label: 'y', area: true }],
          marks: [{ x: 2, label: 'mid-span' }],
        },
        r`| Beam and load | Greatest deflection |
|---|---|
| Cantilever, P at the end | $\frac{PL^3}{3EI}$ |
| Cantilever, uniform w | $\frac{wL^4}{8EI}$ |
| Simple, central P | $\frac{PL^3}{48EI}$ |
| Simple, uniform w | $\frac{5wL^4}{384EI}$ |`,
        r`Combine cases by **superposition**. The **moment-area** method reads slopes and deflections from the area of the $\frac{M}{EI}$ diagram and its moment.`,
      ],
      keyIdeas: [
        r`$EIy'' = M(x)$; constants from the supports.`,
        r`Cantilever $\frac{PL^3}{3EI}$, $\frac{wL^4}{8EI}$; simple $\frac{PL^3}{48EI}$, $\frac{5wL^4}{384EI}$; add cases by superposition.`,
        r`Moment-area: slope change = area of $\frac{M}{EI}$; deviation = its moment.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A uniformly loaded beam',
          problem: r`A 4 m simple beam with EI = 1.6 × 10⁶ N·m² carries 5 kN/m. Find the mid-span deflection.`,
          steps: [r`$\delta = \frac{5 \times 5000 \times 4^4}{384 \times 1.6 \times 10^6} = 0.0104$ m $= 10.4$ mm.`],
          answer: r`10.4 mm.`,
        },
        {
          level: 'board',
          title: 'A cantilever',
          problem: r`A 2 m cantilever with EI = 2 × 10⁶ N·m² carries 5 kN at its free end. Find the tip deflection.`,
          steps: [r`$\delta = \frac{5000 \times 2^3}{3 \times 2 \times 10^6} = 0.00667$ m $= 6.67$ mm.`],
          answer: r`6.67 mm.`,
        },
      ],
      traps: [
        r`$L^3$ and $L^4$ magnify unit errors: keep everything in N and m (or N and mm).`,
        r`Doubling the span multiplies a uniformly loaded beam's sag by 16.`,
      ],
      check: [
        { q: r`What happens to a cantilever's tip deflection under an end load if its length doubles?`, a: r`It grows eight times.` },
        { q: r`What principle adds the deflections of separate loads?`, a: r`Superposition.` },
      ],
    },
    {
      name: "Combined Stresses and Mohr's Circle",
      inShort: r`Stresses from several loads at once, and how they look on rotated planes.`,
      body: [
        r`Loads acting together add their stresses: axial and bending, $\frac PA \pm \frac{Mc}{I}$. At a point with stresses $\sigma_x$, $\sigma_y$ and $\tau_{xy}$, some planes carry the largest and smallest normal stresses (the **principal stresses**, with no shear) and others the largest shear. **Mohr's circle** shows them all: centre $C = \frac{\sigma_x + \sigma_y}{2}$, radius $R = \sqrt{\left(\frac{\sigma_x - \sigma_y}{2}\right)^2 + \tau_{xy}^2}$:`,
        {
          type: 'plot',
          alt: "Mohr's circle for normal stresses of 80 and minus 20 MPa and shear of 30 MPa: a circle centred at 30 MPa with radius 58.3 MPa, crossing the normal-stress axis at the principal stresses 88.3 and minus 28.3 MPa; its top and bottom are the greatest shear, 58.3 MPa.",
          caption: "Mohr's circle: centre 30 MPa, radius 58.3; principal stresses 88.3 and −28.3 MPa, greatest shear 58.3 MPa.",
          x: [-110, 135],
          y: [-70, 70],
          xLabel: 'σ (MPa)',
          yLabel: 'τ (MPa)',
          series: [
            { points: mohr, label: 'circle' },
            { points: [[80, 30], [-20, -30]], label: 'element', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`A shaft under bending M and torque T together has $\tau_{max} = \frac{16}{\pi d^3}\sqrt{M^2 + T^2}$ and $\sigma_{max} = \frac{16}{\pi d^3}\left(M + \sqrt{M^2 + T^2}\right)$.`,
      ],
      keyIdeas: [
        r`Axial + bending: $\frac PA \pm \frac{Mc}{I}$; an eccentric load stays tension-free within the middle third.`,
        r`Principal $\sigma_{1,2} = C \pm R$, $C = \frac{\sigma_x + \sigma_y}{2}$, $R = \sqrt{\left(\frac{\sigma_x - \sigma_y}{2}\right)^2 + \tau_{xy}^2} = \tau_{max}$; $\tan2\theta_p = \frac{2\tau_{xy}}{\sigma_x - \sigma_y}$.`,
        r`Shafts: $\tau_{max} = \frac{16}{\pi d^3}\sqrt{M^2 + T^2}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Principal stresses',
          problem: r`At a point σx = 80 MPa, σy = −20 MPa, τxy = 30 MPa. Find the principal stresses, their angle and the greatest shear.`,
          steps: [
            r`$C = 30$, $R = \sqrt{50^2 + 30^2} = 58.3$ MPa.`,
            r`$\sigma_1 = 88.3$, $\sigma_2 = -28.3$ MPa; $\tau_{max} = 58.3$ MPa.`,
            r`$\theta_p = \frac12\tan^{-1}\frac{60}{100} = 15.5°$.`,
          ],
          answer: r`88.3 and −28.3 MPa at 15.5°; 58.3 MPa.`,
        },
        {
          level: 'board',
          title: 'Bending and twisting a shaft',
          problem: r`A 60 mm shaft carries a 1.5 kN·m bending moment and a 2 kN·m torque. Find the greatest shear and normal stresses.`,
          steps: [
            r`$\sqrt{1.5^2 + 2^2} = 2.5$ kN·m; $\frac{16}{\pi \times 0.06^3} = 23\,579$ m⁻³.`,
            r`$\tau_{max} = 23\,579 \times 2500 = 58.9$ MPa; $\sigma_{max} = 23\,579 \times (1500 + 2500) = 94.3$ MPa.`,
          ],
          answer: r`58.9 MPa; 94.3 MPa.`,
        },
      ],
      traps: [
        r`On Mohr's circle, angles double: 15.5° on the element is 31° on the circle.`,
        r`The greatest shear (the radius) is NOT the larger principal stress.`,
      ],
      check: [
        { q: r`What shear acts on the principal planes?`, a: r`None.` },
        { q: r`At what angle to the principal planes is the shear greatest?`, a: r`45°.` },
      ],
    },
    {
      name: 'Columns',
      inShort: r`Long members in compression fail by buckling, not crushing.`,
      body: [
        r`A long slender column fails by bowing sideways (**buckling**) at a load far below its crushing strength. **Euler's formula** gives that load, $P_{cr} = \frac{\pi^2EI}{(KL)^2}$, with the effective-length factor K set by the ends and I the smallest (the column buckles about its weak axis). As a stress it depends only on the **slenderness ratio** $\frac{KL}{r}$:`,
        {
          type: 'plot',
          alt: "Euler's critical stress for steel against slenderness ratio from 80 to 200: falling steeply as one over the slenderness squared, crossing the 250 MPa yield line at about 89; to the left the formula would exceed yield and does not apply.",
          caption: 'Euler stress for steel (E = 200 GPa): valid only where it is below yield, beyond KL/r ≈ 89.',
          x: [80, 200],
          y: [0, 400],
          xLabel: 'KL / r',
          yLabel: 'σ_{cr} (MPa)',
          series: [{ f: (s) => (Math.PI ** 2 * 200000) / (s * s), label: 'Euler', area: true }],
          marks: [{ y: 250, label: 'yield' }, { x: Math.PI * Math.sqrt(200000 / 250), label: '89' }],
        },
        r`| Ends | K |
|---|---|
| Pinned–pinned | 1 |
| Fixed–free (flagpole) | 2 |
| Fixed–pinned | 0.7 |
| Fixed–fixed | 0.5 |`,
        r`Short columns crush; intermediate ones are designed with formulas such as J. B. Johnson's parabola.`,
      ],
      keyIdeas: [
        r`Euler $P_{cr} = \frac{\pi^2EI}{(KL)^2}$, using the smallest I; K = 1, 2, 0.7, 0.5 for pinned, fixed-free, fixed-pinned, fixed-fixed.`,
        r`$\sigma_{cr} = \frac{\pi^2E}{(KL/r)^2}$, valid only below the proportional limit (steel: $\frac{KL}{r} \gtrsim 90$).`,
        r`Intermediate columns: J. B. Johnson's parabola.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A pinned column and a flagpole',
          problem: r`A pinned steel column 3 m long has I = 2 × 10⁶ mm⁴ (E = 200 GPa). Find its buckling load, and the load if it were a flagpole (fixed-free).`,
          steps: [
            r`$P_{cr} = \frac{\pi^2 \times 200 \times 10^9 \times 2 \times 10^{-6}}{3^2} = 438.6$ kN.`,
            r`Fixed-free (K = 2): a quarter, 109.7 kN.`,
          ],
          answer: r`438.6 kN; 109.7 kN.`,
        },
        {
          level: 'board',
          title: 'By slenderness',
          problem: r`A pinned steel column 3 m long has r = 25 mm and A = 3000 mm². Check that Euler applies and find the buckling load.`,
          steps: [
            r`$\frac{KL}{r} = \frac{3000}{25} = 120$: above 89, so Euler applies.`,
            r`$\sigma_{cr} = \frac{\pi^2 \times 200\,000}{120^2} = 137.1$ MPa; $P = 137.1 \times 3000 = 411.2$ kN.`,
          ],
          answer: r`411.2 kN.`,
        },
      ],
      traps: [
        r`Buckling happens about the WEAK axis.`,
        r`Euler overestimates short columns: check the slenderness first.`,
      ],
      check: [
        { q: r`What effective length factor does a flagpole have?`, a: r`2.` },
        { q: r`What happens to Euler's load if the length doubles?`, a: r`It falls to a quarter.` },
      ],
    },
    {
      name: 'Thin-Walled Pressure Vessels',
      inShort: r`Cylinders and spheres under internal pressure.`,
      body: [
        r`Pressure inside a thin-walled vessel ($\frac tD \le \frac{1}{20}$) is carried as tension in the wall. A cylinder's **hoop** stress, $\frac{pD}{2t}$, is twice its **longitudinal** stress, $\frac{pD}{4t}$, so it splits lengthwise; a sphere carries $\frac{pD}{4t}$ every way. Welded or riveted seams weaker than the plate divide these by the **joint efficiency** η; external pressure enters as $(p_i - p_o)$.`,
        r`Thick walls carry stress unevenly, most at the bore (**Lamé**): $\sigma_t = p\frac{r_i^2}{r_o^2 - r_i^2}\left(1 + \frac{r_o^2}{r^2}\right)$:`,
        {
          type: 'plot',
          alt: 'Hoop stress across the wall of a thick cylinder of 100 mm inner and 150 mm outer radius at 10 MPa: highest, 26 MPa, at the bore, falling to 16 MPa at the outside; the thin-wall formula gives a flat 20 MPa, dashed.',
          caption: 'A thick cylinder (100 to 150 mm, 10 MPa): hoop stress 26 MPa at the bore, 16 MPa outside; thin-wall theory says 20 MPa (dashed).',
          x: [100, 150],
          y: [0, 30],
          xLabel: 'r (mm)',
          yLabel: 'σ_t (MPa)',
          series: [
            { f: (r0) => ((10 * 100 ** 2) / (150 ** 2 - 100 ** 2)) * (1 + 150 ** 2 / (r0 * r0)), label: 'Lamé', area: true },
            { f: () => (10 * 200) / (2 * 50), label: 'thin wall', dashed: true, colour: colourOf(1) },
          ],
          legend: false,
        },
        r`A **rotating ring** is pulled apart by its own spin: its stress is $\sigma = \rho v^2$, which limits its rim speed.`,
      ],
      keyIdeas: [
        r`Cylinder hoop $\frac{pD}{2t}$, longitudinal $\frac{pD}{4t}$; sphere $\frac{pD}{4t}$ everywhere.`,
        r`Thin when $\frac tD \le \frac{1}{20}$; otherwise Lamé, $\sigma_t = p\frac{r_o^2 + r_i^2}{r_o^2 - r_i^2}$ at the bore.`,
        r`With a riveted seam, divide by the joint efficiency; rotating ring $\sigma = \rho v^2$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A cylinder and a sphere',
          problem: r`A 1 m cylinder with 10 mm walls holds 2 MPa. Find the hoop and longitudinal stresses, and the stress in a sphere of the same size.`,
          steps: [
            r`Hoop $\frac{2 \times 1000}{2 \times 10} = 100$ MPa; longitudinal 50 MPa.`,
            r`Sphere 50 MPa.`,
          ],
          answer: r`100 MPa; 50 MPa; 50 MPa.`,
        },
        {
          level: 'board',
          title: 'A water tank and a spinning ring',
          problem: r`A water tank 10 m high and 6 m in diameter is to be plated with steel allowed 35 MPa. Find the thickness at the bottom. What rim speed may a steel ring (7850 kg/m³) reach at 100 MPa?`,
          steps: [
            r`$p = 9810 \times 10 = 98.1$ kPa: $t = \frac{98\,100 \times 6}{2 \times 35 \times 10^6} = 8.41$ mm.`,
            r`$v = \sqrt{\frac{100 \times 10^6}{7850}} = 112.9$ m/s.`,
          ],
          answer: r`8.41 mm; 112.9 m/s.`,
        },
      ],
      traps: [
        r`A cylinder bursts along its length: the hoop stress is twice the longitudinal.`,
        r`A water tank's pressure is greatest at the BOTTOM.`,
      ],
      check: [
        { q: r`Why do spherical tanks need thinner walls?`, a: r`Their stress is $\frac{pD}{4t}$ every way, half a cylinder's hoop stress.` },
        { q: r`What stress does a spinning ring carry?`, a: r`$\rho v^2$.` },
      ],
    },
    {
      name: 'Riveted and Welded Joints',
      inShort: r`How strong a joint is, by its weakest way of failing.`,
      body: [
        r`A riveted or bolted joint can fail three ways, and is only as strong as the weakest:`,
        r`| Failure | Strength |
|---|---|
| Rivets shearing | $n\,m\frac{\pi d^2}{4}\tau$ (m shear planes: 1 lap, 2 butt with two cover plates) |
| Plate crushing at the holes (bearing) | $n\,d\,t\,\sigma_b$ |
| Plate tearing across a row of holes | $(b - n'd)t\sigma_t$ |`,
        r`The **efficiency** of the joint is its strength over that of the solid plate. A **fillet weld** fails in shear through its throat, $0.707a$ for a leg a: strength $0.707aL\tau$.`,
      ],
      keyIdeas: [
        r`Rivet shear $n\,m\frac{\pi d^2}{4}\tau$; bearing $ndt\sigma_b$; plate tearing $(b - n'd)t\sigma_t$.`,
        r`The joint's strength is the smallest; efficiency = that ÷ the solid plate's strength.`,
        r`Fillet weld $0.707aL\tau$ (shear through the throat).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A lap joint',
          problem: r`A lap joint has four 20 mm rivets in single shear (τ = 100 MPa) through 12 mm plates 200 mm wide (bearing 200, tension 140 MPa; two holes in the critical row). Find its strength and efficiency.`,
          steps: [
            r`Shear $4 \times \frac{\pi \times 20^2}{4} \times 100 = 125.7$ kN; bearing $4 \times 20 \times 12 \times 200 = 192$ kN; tearing $(200 - 40) \times 12 \times 140 = 268.8$ kN.`,
            r`Strength 125.7 kN; efficiency $\frac{125.7}{336} = 37.4\%$.`,
          ],
          answer: r`125.7 kN; 37.4%.`,
        },
        {
          level: 'board',
          title: 'A fillet weld',
          problem: r`An 8 mm fillet weld runs 150 mm along each side of a joint (τ = 100 MPa). Find its strength.`,
          steps: [r`$0.707 \times 8 \times 300 \times 100 = 169.7$ kN.`],
          answer: r`169.7 kN.`,
        },
      ],
      traps: [
        r`Butt joints with two cover plates put each rivet in DOUBLE shear.`,
        r`Use the THROAT ($0.707a$), not the leg, for a fillet weld.`,
      ],
      check: [
        { q: r`What is a joint's efficiency?`, a: r`Its strength divided by the strength of the solid plate.` },
        { q: r`In a butt joint with two cover plates, how many shear planes does each rivet have?`, a: r`Two.` },
      ],
    },
  ],
};
