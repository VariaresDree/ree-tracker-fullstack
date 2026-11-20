// Library › Lessons › EE › Electromagnetism (2026-11-18; every subtopic in the
// module format 2026-11-20, with figures, examples a step at a time and checks;
// every number re-worked by electromagnetismLesson.test.js. Coverage and problem
// styles cross-checked against a review center's electromagnetics handout; the
// text, problems and figures are this app's own): written for the Philippine REE
// board, subtopic by subtopic in the syllabus's order. Coupled-circuit analysis is
// in Electric Circuits 2; machines build on the magnetic circuits here.
const r = String.raw;
const deg = Math.PI / 180;
const K = 8.988e9;

export default {
  topic: 'Electromagnetism',
  subject: 'EE',
  overview: r`Electromagnetism explains what every electrical machine, line and device is doing. Charges make electric fields (Coulomb, Gauss); moving charges, currents, make magnetic fields (Biot-Savart, Ampère); and changing magnetic fields make voltages (Faraday), which is how generators and transformers work. Maxwell tied these together and predicted electromagnetic waves. For engineering problems the key tools are the magnetic circuit (mmf = flux × reluctance, like Ohm's law), Faraday's law, and the forces on conductors. Keep SI units, $\varepsilon_0 = 8.854 \times 10^{-12}$ F/m and $\mu_0 = 4\pi \times 10^{-7}$ H/m.`,
  sources: [
    'Engineering Electromagnetics (Hayt and Buck)',
    'Elements of Electromagnetics (Sadiku)',
    'University Physics (Young and Freedman), electricity and magnetism chapters',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: "Coulomb's Law",
      inShort: r`The force between charges.`,
      body: [
        r`Two point charges push apart if alike and pull together if opposite, with a force along the line between them that grows with each charge and falls with the square of the distance: $F = \frac{q_1q_2}{4\pi\varepsilon r^2}$. In vacuum (and, closely, in air) $\frac{1}{4\pi\varepsilon_0} = k = 8.988 \times 10^9$ N·m²/C²; in another medium the force is divided by its relative permittivity $\varepsilon_r$.`,
        {
          type: 'plot',
          alt: 'The force between a 2 microcoulomb and a 3 microcoulomb charge against their distance: very large close up, 0.6 N at 0.3 m, and falling off as one over distance squared.',
          caption: 'The inverse-square law: the force between 2 µC and 3 µC against their distance.',
          x: [0.1, 1],
          y: [0, 6],
          xLabel: 'r (m)',
          yLabel: 'F (N)',
          series: [{ f: (d) => (K * 6e-12) / d ** 2, label: 'F' }],
          marks: [{ at: [0.3, (K * 6e-12) / 0.09], label: '0.599 N at 0.3 m' }],
        },
        r`Forces from several charges add as vectors (superposition): find each one's size and direction, then add them tip to tail.`,
        {
          type: 'phasor',
          alt: 'Two forces on a charge drawn tip to tail: 0.200 N to the right and 0.169 N upward, with their resultant of 0.261 N at 40 degrees.',
          caption: 'Adding two Coulomb forces on one charge: the resultant closes the triangle.',
          axes: false,
          vectors: [
            { name: 'F1', mag: 0.1997, angle: 0, label: 'F_1' },
            { mag: 0.1685, angle: 90, from: 'F1', label: 'F_2' },
            { mag: 0.2613, angle: 40.16, label: 'F', colour: 2 },
          ],
          arcs: [{ from: 0, to: 40.16, label: '40.2°', r: 44 }],
        },
      ],
      keyIdeas: [
        r`$F = \frac{kq_1q_2}{r^2}$, $k = \frac{1}{4\pi\varepsilon_0} = 8.988 \times 10^9$; like charges repel.`,
        r`Several charges: add the force vectors (superposition).`,
        r`In a medium the force is divided by $\varepsilon_r$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Two charges',
          problem: r`Charges of +2 µC and −3 µC are 0.3 m apart in air. Find the force.`,
          steps: [
            r`$F = \frac{8.988 \times 10^9 \times 2 \times 10^{-6} \times 3 \times 10^{-6}}{0.3^2} = 0.599$ N.`,
            r`Opposite signs: the force pulls them together.`,
          ],
          answer: r`0.599 N, attractive.`,
        },
        {
          level: 'board',
          title: 'Forces at right angles',
          problem: r`A +1 µC charge has a +2 µC charge 0.3 m to its left and a −3 µC charge 0.4 m directly above it. Find the resultant force on it.`,
          steps: [
            r`From the +2 µC (repelling, pointing right): $F_1 = \frac{8.988 \times 10^9 \times 2 \times 10^{-12}}{0.09} = 0.1997$ N.`,
            r`From the −3 µC (attracting, pointing up): $F_2 = \frac{8.988 \times 10^9 \times 3 \times 10^{-12}}{0.16} = 0.1685$ N.`,
            r`$F = \sqrt{0.1997^2 + 0.1685^2} = 0.2613$ N, at $\tan^{-1}\frac{0.1685}{0.1997} = 40.16^\circ$ above the right.`,
          ],
          answer: r`0.261 N, at 40.2° above the line toward the right.`,
        },
      ],
      traps: [
        r`Square the distance, and convert µC to C before multiplying.`,
        r`Add the force vectors, not their sizes.`,
      ],
      check: [
        { q: r`Doubling the distance between two charges changes the force how?`, a: r`It falls to a quarter.` },
        { q: r`Two equal charges 1 m apart in air repel with 9 N. How large is each?`, a: r`$q = \sqrt{\frac{9}{8.988 \times 10^9}} = 31.6$ µC.` },
      ],
    },
    {
      name: 'Electric Field',
      inShort: r`Force per unit charge, pointing away from positive charges.`,
      body: [
        r`The **electric field** at a point is the force a small positive test charge would feel there, per coulomb: $\mathbf{E} = \frac{\mathbf{F}}{q}$, in N/C or V/m. It points away from positive charges and toward negative ones, a charge $q$ placed in it feels $\mathbf{F} = q\mathbf{E}$, and the fields of several charges add as vectors.`,
        r`| Charge | Field at distance $r$ |
|---|---|
| Point charge $Q$ | $\frac{Q}{4\pi\varepsilon r^2}$ |
| Long line, $\rho_\ell$ C/m | $\frac{\rho_\ell}{2\pi\varepsilon r}$ |
| Large flat sheet, $\rho_s$ C/m² | $\frac{\rho_s}{2\varepsilon}$, the same at any distance |
| Between parallel plates | $\frac{V}{d}$ |`,
        {
          type: 'plot',
          alt: 'How the field falls with distance for three shapes, each set to 1 at a distance of 1: a point charge falls as one over r squared, a line as one over r, and a sheet stays constant.',
          caption: 'How far a field reaches: a point charge falls as 1/r², a line charge as 1/r, a sheet not at all.',
          x: [0.4, 3],
          y: [0, 4],
          xLabel: 'r',
          yLabel: 'E',
          series: [
            { f: (d) => 1 / d ** 2, label: 'point' },
            { f: (d) => 1 / d, label: 'line' },
            { f: () => 1, label: 'sheet', dashed: true },
          ],
        },
      ],
      keyIdeas: [
        r`Point charge $E = \frac{kq}{r^2}$; line $\frac{\lambda}{2\pi\varepsilon r}$; sheet $\frac{\sigma}{2\varepsilon}$; between plates $\frac{V}{d}$.`,
        r`$F = qE$; field lines start on + and end on − charges.`,
        r`Fields add as vectors.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A point charge',
          problem: r`Find the field 0.5 m from a 1 µC charge.`,
          steps: [
            r`$E = \frac{8.988 \times 10^9 \times 10^{-6}}{0.5^2} = 3.595 \times 10^4$ N/C, pointing away from the charge.`,
          ],
          answer: r`$3.595 \times 10^4$ N/C, outward.`,
        },
        {
          level: 'board',
          title: 'Between a pair of opposite charges',
          problem: r`Charges of +4 µC and −4 µC are 0.2 m apart. Find the field at the midpoint.`,
          steps: [
            r`Each is 0.1 m away: $E_1 = E_2 = \frac{8.988 \times 10^9 \times 4 \times 10^{-6}}{0.01} = 3.595 \times 10^6$ N/C.`,
            r`At the midpoint both point the same way, from + toward −, so they add.`,
          ],
          answer: r`$7.19 \times 10^6$ N/C, toward the negative charge.`,
        },
      ],
      traps: [
        r`Field adds as vectors; potential (next) adds as plain numbers.`,
        r`Midway between equal like charges the field is zero; between opposite charges it is double.`,
      ],
      check: [
        { q: r`What force does an electron feel in a field of 1000 N/C?`, a: r`$1.602 \times 10^{-16}$ N, opposite to the field.` },
        { q: r`What is the field 0.5 m from a long line carrying 2 µC/m in air?`, a: r`$\frac{2 \times 10^{-6}}{2\pi \times 8.854 \times 10^{-12} \times 0.5} = 7.19 \times 10^4$ N/C.` },
      ],
    },
    {
      name: "Gauss's Law",
      inShort: r`The flux out of a closed surface equals the charge inside.`,
      body: [
        r`**Gauss's law**: the electric flux out of any closed surface equals the charge it encloses, $\oint\mathbf{D}\cdot d\mathbf{S} = Q_{enc}$, with the flux density $\mathbf{D} = \varepsilon\mathbf{E}$ in C/m². It is always true, but it gives the field easily only where symmetry makes $\mathbf{D}$ the same all over a surface you can choose: a sphere around a point or a ball, a cylinder around a line, a box straddling a sheet.`,
        r`Inside a conductor in equilibrium the field is zero, so all of its excess charge sits on its surface. Outside a charged sphere, conducting or not, the field is the same as if all the charge sat at the centre.`,
        {
          type: 'plot',
          alt: 'The field of a 1 microcoulomb sphere of radius 0.1 m against distance from its centre: zero inside a conducting sphere, rising linearly inside a uniformly charged ball, and the same inverse-square fall outside both, from 0.90 MV/m at the surface.',
          caption: 'A 1 µC sphere of radius 0.1 m: no field inside a conductor, a linear rise inside a uniformly charged ball, and the same 1/r² outside both.',
          x: [0, 0.4],
          y: [0, 1.5],
          xLabel: 'r (m)',
          yLabel: 'E (MV/m)',
          series: [
            { f: (d) => (d < 0.1 ? (0.8988 * d) / 0.1 : 0.8988 * (0.1 / d) ** 2), label: 'charged ball' },
            { f: (d) => (d < 0.1 ? 0 : 0.8988 * (0.1 / d) ** 2), label: 'conductor', dashed: true },
          ],
          marks: [{ at: [0.1, 0.8988], label: '0.90 MV/m at the surface' }],
        },
      ],
      keyIdeas: [
        r`$\oint\mathbf{D}\cdot d\mathbf{A} = Q_{enc}$, $\mathbf{D} = \varepsilon\mathbf{E}$.`,
        r`Use it where symmetry makes E constant on the surface: spheres, cylinders, planes.`,
        r`A conductor's field inside is zero; its charge lives on the surface.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Inside and outside a conducting sphere',
          problem: r`A conducting sphere of radius 0.1 m carries 1 µC. Find the field 0.05 m and 0.2 m from its centre.`,
          steps: [
            r`Inside a conductor (0.05 m): zero.`,
            r`Outside (0.2 m), as if all at the centre: $\frac{8.988 \times 10^9 \times 10^{-6}}{0.2^2} = 2.247 \times 10^5$ N/C.`,
          ],
          answer: r`0 inside; $2.247 \times 10^5$ N/C at 0.2 m.`,
        },
        {
          level: 'board',
          title: 'A line charge by Gauss',
          problem: r`A long wire carries 5 nC/m in air. Find D and E 2 cm from it.`,
          steps: [
            r`A cylinder of radius r and length ℓ around the wire: $D \times 2\pi r\ell = \rho_\ell\ell$, so $D = \frac{5 \times 10^{-9}}{2\pi \times 0.02} = 3.979 \times 10^{-8}$ C/m².`,
            r`$E = \frac{D}{\varepsilon_0} = \frac{3.979 \times 10^{-8}}{8.854 \times 10^{-12}} = 4494$ V/m.`,
          ],
          answer: r`$D = 3.98 \times 10^{-8}$ C/m² and E = 4494 V/m.`,
        },
      ],
      traps: [
        r`Charges outside the Gaussian surface affect E on it, but add no net flux.`,
        r`The flux counts only the enclosed charge: a charge just outside the surface changes nothing in the total.`,
      ],
      check: [
        { q: r`A 3 µC charge sits at the centre of a cube. How much flux leaves one face?`, a: r`A sixth: 0.5 µC of D-flux.` },
        { q: r`What is the field inside a hollow charged conducting shell?`, a: r`Zero.` },
      ],
    },
    {
      name: 'Electric Potential',
      inShort: r`Energy per unit charge, a scalar.`,
      body: [
        r`The **potential** at a point is the work per coulomb to bring a positive test charge there from far away: $V = \frac{kq}{r}$ for a point charge, in volts. It is a scalar, so the potentials of several charges simply add, with their signs. The potential difference between two points is the work per coulomb to move a charge between them, $V_{AB} = -\int_B^A\mathbf{E}\cdot d\boldsymbol{\ell}$, and in a uniform field $E = \frac{V}{d}$.`,
        {
          type: 'plot',
          alt: 'Potential and field of a point charge against distance, both set to 1 at a distance of 1: the potential falls as one over r, the field faster, as one over r squared.',
          caption: 'Around a point charge, the potential (1/r) falls more slowly than the field (1/r²).',
          x: [0.5, 4],
          y: [0, 4],
          xLabel: 'r',
          series: [
            { f: (d) => 1 / d, label: 'V' },
            { f: (d) => 1 / d ** 2, label: 'E', dashed: true },
          ],
        },
        r`Moving a charge $q$ through a potential difference $V$ takes or gives energy $W = qV$; two charges store $U = \frac{kq_1q_2}{r}$. Surfaces of equal potential (equipotentials) cross field lines at right angles, and the field points downhill in potential, $\mathbf{E} = -\nabla V$. An electron accelerated through 1 V gains 1 eV, $1.602 \times 10^{-19}$ J.`,
      ],
      keyIdeas: [
        r`$V = \frac{kq}{r}$; $V_a - V_b = -\int_b^a\mathbf{E}\cdot d\mathbf{l}$; uniform field $E = \frac{V}{d}$.`,
        r`Work to move a charge: $W = qV$; two charges store $U = \frac{kq_1q_2}{r}$.`,
        r`Equipotentials are perpendicular to field lines.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Potential and work',
          problem: r`Find the potential 0.5 m from a 1 µC charge, and the work to bring a 2 µC charge there from far away.`,
          steps: [
            r`$V = \frac{8.988 \times 10^9 \times 10^{-6}}{0.5} = 17\,976$ V.`,
            r`$W = qV = 2 \times 10^{-6} \times 17\,976 = 0.0360$ J.`,
          ],
          answer: r`17 976 V; 0.0360 J.`,
        },
        {
          level: 'board',
          title: 'Two charges, one scalar sum',
          problem: r`+3 µC sits at the origin and −2 µC at (0.4 m, 0). Find the potential at P = (0, 0.3 m).`,
          steps: [
            r`Distances: 0.3 m from the +3 µC and $\sqrt{0.4^2 + 0.3^2} = 0.5$ m from the −2 µC.`,
            r`$V = 8.988 \times 10^9\left(\frac{3 \times 10^{-6}}{0.3} - \frac{2 \times 10^{-6}}{0.5}\right) = 8.988 \times 10^9 \times 6 \times 10^{-6} = 53\,930$ V.`,
          ],
          answer: r`About 53.9 kV; no directions needed.`,
        },
      ],
      traps: [
        r`Potential falls as $\frac1r$, the field as $\frac{1}{r^2}$.`,
        r`Keep the sign of each charge when adding potentials.`,
      ],
      check: [
        { q: r`An electron is accelerated from rest through 1000 V. How fast does it go?`, a: r`$v = \sqrt{\frac{2 \times 1.602 \times 10^{-19} \times 1000}{9.109 \times 10^{-31}}} = 1.88 \times 10^7$ m/s.` },
        { q: r`What is the field between plates 5 mm apart at 1500 V?`, a: r`$\frac{1500}{0.005} = 3 \times 10^5$ V/m.` },
      ],
    },
    {
      name: 'Capacitance and Dielectrics',
      inShort: r`Storing charge, and what dielectrics do.`,
      body: [
        r`**Capacitance** is charge stored per volt, $C = \frac{Q}{V}$. It depends only on the conductors' shape and spacing and on the insulation between them: a **dielectric** of relative permittivity $\varepsilon_r$ multiplies C by $\varepsilon_r$, and each dielectric has a **breakdown strength** (air about 3 MV/m, 3 kV/mm) beyond which it conducts.`,
        r`| Shape | Capacitance |
|---|---|
| Parallel plates | $\frac{\varepsilon A}{d}$ |
| n interleaved plates | $(n - 1)\frac{\varepsilon A}{d}$ |
| Layers between plates | $\frac{\varepsilon_0A}{d_1/\varepsilon_{r1} + d_2/\varepsilon_{r2} + \cdots}$ |
| Coaxial cable, radii a and b | $\frac{2\pi\varepsilon\ell}{\ln(b/a)}$ |
| Concentric spheres | $\frac{4\pi\varepsilon ab}{b - a}$ |
| Isolated sphere | $4\pi\varepsilon r$ |`,
        r`In layered dielectrics the flux density D is the same through every layer, so the field $E = \frac{D}{\varepsilon}$ is largest in the layer with the lowest permittivity, usually an air gap. That is why a thin film of air in a cable or a bushing breaks down first.`,
        {
          type: 'plot',
          alt: 'The field across a 10 mm gap filled with 2 mm of air and 8 mm of glass at 10 kV: 3 MV/m in the air, enough to break it down, and only 0.5 MV/m in the glass.',
          caption: 'Plates 10 mm apart at 10 kV, with 2 mm of air and 8 mm of glass (εr = 6): the air carries six times the field.',
          x: [0, 10],
          y: [0, 3.5],
          xLabel: 'x (mm)',
          yLabel: 'E (MV/m)',
          series: [{ f: (x) => (x < 2 ? 3 : 0.5), label: 'E', area: true }],
          marks: [{ y: 3, label: 'air breaks down near 3 MV/m' }],
        },
      ],
      keyIdeas: [
        r`Parallel plates $\frac{\varepsilon A}{d}$; coaxial $\frac{2\pi\varepsilon L}{\ln(b/a)}$; concentric spheres $\frac{4\pi\varepsilon ab}{b - a}$.`,
        r`Layered dielectrics act in series: $C = \frac{\varepsilon_0A}{\sum d_k/\varepsilon_{rk}}$.`,
        r`Energy density $\frac12\varepsilon E^2$; a dielectric raises C by $\varepsilon_r$ and has a breakdown strength.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Plates and a cable',
          problem: r`Find the capacitance of plates of 0.01 m² 1 mm apart with $\varepsilon_r = 4$, and of 1 km of coaxial cable with radii 2 mm and 8 mm and $\varepsilon_r = 2.3$.`,
          steps: [
            r`Plates: $\frac{4 \times 8.854 \times 10^{-12} \times 0.01}{0.001} = 354.2$ pF.`,
            r`Cable: $\frac{2\pi \times 2.3 \times 8.854 \times 10^{-12} \times 1000}{\ln4} = 92.3$ nF.`,
          ],
          answer: r`354.2 pF and 92.3 nF.`,
        },
        {
          level: 'board',
          title: 'Will the air gap break down?',
          problem: r`Plates 10 mm apart hold 2 mm of air and 8 mm of glass ($\varepsilon_r = 6$) in series, at 10 kV. Find the field in each layer.`,
          steps: [
            r`D is the same in both: $V = D\left(\frac{d_1}{\varepsilon_0} + \frac{d_2}{6\varepsilon_0}\right)$, so $E_{air} = \frac{V}{d_1 + d_2/6} = \frac{10\,000}{0.002 + 0.001333} = 3.0$ MV/m.`,
            r`$E_{glass} = \frac{E_{air}}{6} = 0.5$ MV/m.`,
            r`Check: $3.0 \times 10^6 \times 0.002 + 0.5 \times 10^6 \times 0.008 = 6000 + 4000 = 10\,000$ V.`,
          ],
          answer: r`3.0 MV/m in the air, right at its breakdown strength, and 0.5 MV/m in the glass.`,
        },
      ],
      traps: [
        r`The air in a layered dielectric takes the highest field and breaks down first.`,
        r`n plates make n − 1 gaps, not n.`,
      ],
      check: [
        { q: r`What is the capacitance of an isolated sphere of 1 m radius in air?`, a: r`$4\pi \times 8.854 \times 10^{-12} \times 1 = 111.3$ pF.` },
        { q: r`What energy per cubic metre does air hold at 3 MV/m?`, a: r`$\frac12 \times 8.854 \times 10^{-12} \times (3 \times 10^6)^2 = 39.8$ J/m³.` },
      ],
    },
    {
      name: 'Current and Resistivity',
      inShort: r`Current at the scale of the material: density, drift and leakage.`,
      body: [
        r`Current is charge flowing: $I = \frac{dq}{dt}$. Spread over a cross-section it is a **current density** $J = \frac{I}{A}$ in A/m², and in a conductor with $n$ free electrons per cubic metre drifting at speed $v_d$, $J = nqv_d$. Ohm's law at a point is $\mathbf{J} = \sigma\mathbf{E}$, with conductivity $\sigma = \frac{1}{\rho}$.`,
        r`Electrons drift astonishingly slowly, a fraction of a millimetre per second in a house wire, yet a lamp lights at once: the field that pushes them travels along the wire near the speed of light.`,
        r`Insulation leaks too. Between the conductor (radius a) and sheath (radius b) of a cable, current flows outward through the insulation, so the insulation resistance is $R = \frac{\rho}{2\pi\ell}\ln\frac{b}{a}$: unlike a conductor's resistance it falls as the cable gets longer, because there are more parallel leakage paths.`,
        r`| Material | Resistivity at 20 °C (Ω·m) |
|---|---|
| Silver | $1.59 \times 10^{-8}$ |
| Annealed copper | $1.72 \times 10^{-8}$ |
| Aluminium | $2.83 \times 10^{-8}$ |
| Nichrome (heaters) | $1.1 \times 10^{-6}$ |
| Insulation (PVC, XLPE) | $10^{12}$ to $10^{15}$ |`,
      ],
      keyIdeas: [
        r`$J = \frac{I}{A} = nqv_d = \sigma E$; Ohm's law at a point.`,
        r`Drift velocities are tiny (fractions of a mm/s).`,
        r`Insulation resistance of a cable $\frac{\rho}{2\pi L}\ln\frac{b}{a}$: it falls with length.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Drift velocity',
          problem: r`10 A flows in a 2.5 mm² copper wire with $8.5 \times 10^{28}$ free electrons per m³. Find the drift velocity.`,
          steps: [
            r`$v_d = \frac{I}{nqA} = \frac{10}{8.5 \times 10^{28} \times 1.602 \times 10^{-19} \times 2.5 \times 10^{-6}} = 2.94 \times 10^{-4}$ m/s.`,
          ],
          answer: r`About 0.29 mm/s.`,
        },
        {
          level: 'board',
          title: 'Insulation resistance',
          problem: r`A 1 km cable has a 5 mm conductor radius and a 10 mm insulation radius, with insulation resistivity $5 \times 10^{12}$ Ω·m. Find its insulation resistance.`,
          steps: [
            r`$R = \frac{5 \times 10^{12}}{2\pi \times 1000}\ln\frac{10}{5} = 7.958 \times 10^8 \times 0.6931 = 5.52 \times 10^8$ Ω.`,
          ],
          answer: r`552 MΩ.`,
        },
      ],
      traps: [
        r`Doubling the cable's length HALVES its insulation resistance.`,
        r`Use $J = \sigma E$ with σ in S/m, the reciprocal of resistivity.`,
      ],
      check: [
        { q: r`The 1 km cable above reads 552 MΩ. What does 4 km of it read?`, a: r`A quarter: 138 MΩ.` },
        { q: r`What is the current density of 20 A in 4 mm²?`, a: r`$5 \times 10^6$ A/m², or 5 A/mm².` },
      ],
    },
    {
      name: 'Biot-Savart Law',
      inShort: r`The magnetic field made by a current element.`,
      body: [
        r`Every short piece of a current-carrying wire makes a magnetic field around it: $d\mathbf{B} = \frac{\mu_0}{4\pi}\frac{I\,d\boldsymbol{\ell}\times\hat{\mathbf{r}}}{r^2}$. Adding the pieces (integrating along the wire) gives the field of any shape. The direction follows the right-hand rule: thumb along the current, fingers curl the way B circles.`,
        r`| Current | Field |
|---|---|
| Centre of a coil of N turns, radius R | $\frac{\mu_0NI}{2R}$ |
| On the coil's axis, distance x | $\frac{\mu_0NIR^2}{2(R^2 + x^2)^{3/2}}$ |
| Long straight wire, distance r | $\frac{\mu_0I}{2\pi r}$ |
| Finite straight segment | $\frac{\mu_0I}{4\pi r}(\sin\alpha_2 - \sin\alpha_1)$ |`,
        {
          type: 'plot',
          alt: 'The field along the axis of a 20-turn coil of radius 0.1 m carrying 5 A: a bell-shaped peak of 0.628 millitesla at the centre, falling to about a third at 0.1 m either side.',
          caption: 'Along a coil’s axis (20 turns, radius 0.1 m, 5 A): strongest at the centre, about a third as strong one radius away.',
          x: [-0.3, 0.3],
          y: [0, 0.7],
          xLabel: 'x (m)',
          yLabel: 'B (mT)',
          series: [{ f: (x) => (4e-7 * Math.PI * 20 * 5 * 0.01) / (2 * (0.01 + x * x) ** 1.5) * 1000, label: 'B', area: true }],
          marks: [{ at: [0, 0.6283], label: '0.628 mT at the centre' }],
        },
      ],
      keyIdeas: [
        r`$d\mathbf{B} = \frac{\mu_0}{4\pi}\frac{I\,d\mathbf{l}\times\hat{\mathbf{r}}}{r^2}$, integrated along the conductor.`,
        r`Loop centre $\frac{\mu_0NI}{2R}$; on the axis $\frac{\mu_0NIR^2}{2(R^2 + x^2)^{3/2}}$.`,
        r`Right-hand rule: thumb along the current, fingers curl with B.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'At the centre of a coil',
          problem: r`A 20-turn coil of radius 0.1 m carries 5 A. Find B at its centre.`,
          steps: [
            r`$B = \frac{4\pi \times 10^{-7} \times 20 \times 5}{2 \times 0.1} = 6.283 \times 10^{-4}$ T.`,
          ],
          answer: r`0.628 mT.`,
        },
        {
          level: 'board',
          title: 'On the axis',
          problem: r`Find B on the same coil's axis, 0.1 m from its centre.`,
          steps: [
            r`$B = \frac{4\pi \times 10^{-7} \times 20 \times 5 \times 0.1^2}{2(0.1^2 + 0.1^2)^{3/2}}$.`,
            r`The denominator is $2 \times 0.02^{1.5} = 0.005657$, so $B = 2.221 \times 10^{-4}$ T, $\frac{1}{2\sqrt2}$ of the centre value.`,
          ],
          answer: r`0.222 mT.`,
        },
      ],
      traps: [
        r`Use the radius in the loop formula; the diameter gives half the field.`,
        r`Each turn adds: N turns give N times one turn's field.`,
      ],
      check: [
        { q: r`A loop's radius doubles at the same current. What happens to the field at its centre?`, a: r`It halves.` },
        { q: r`Seen from above, current runs counter-clockwise round a flat loop. Which way does B point at its centre?`, a: r`Up, toward you.` },
      ],
    },
    {
      name: "Ampère's Law",
      inShort: r`The circulation of H equals the enclosed current.`,
      body: [
        r`**Ampère's circuital law**: the line integral of the magnetising field H around any closed path equals the current it encloses, $\oint\mathbf{H}\cdot d\boldsymbol{\ell} = I_{enc}$, and $\mathbf{B} = \mu\mathbf{H}$. Like Gauss's law it gives answers easily where symmetry makes H the same all along a path: circles around a wire, the inside of a solenoid, the core of a toroid.`,
        r`| Current | Field |
|---|---|
| Long wire, outside, distance r | $\frac{\mu_0I}{2\pi r}$ |
| Long solid wire, inside, radius a | $\frac{\mu_0Ir}{2\pi a^2}$ |
| Long solenoid, n turns per metre | $\mu nI = \frac{\mu NI}{\ell}$ |
| Toroid, mean radius r | $\frac{\mu NI}{2\pi r}$ |`,
        {
          type: 'plot',
          alt: 'The field in and around a solid wire of 5 mm radius carrying 100 A: rising in a straight line from zero at the centre to 4 millitesla at the surface, then falling as one over r outside.',
          caption: 'A solid wire of 5 mm radius carrying 100 A: B rises linearly inside, peaks at the surface, and falls as 1/r outside.',
          x: [0, 30],
          y: [0, 4.5],
          xLabel: 'r (mm)',
          yLabel: 'B (mT)',
          series: [{ f: (d) => (d < 5 ? (4 * d) / 5 : (4 * 5) / d), label: 'B', area: true }],
          marks: [{ at: [5, 4], label: '4 mT at the surface' }],
        },
      ],
      keyIdeas: [
        r`$\oint\mathbf{H}\cdot d\mathbf{l} = I_{enc}$; long wire $B = \frac{\mu_0I}{2\pi r}$.`,
        r`Solenoid $B = \frac{\mu NI}{l}$; toroid $B = \frac{\mu NI}{2\pi r}$.`,
        r`Inside a solid wire B grows linearly from zero at its centre.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A toroid',
          problem: r`A 500-turn air toroid carries 2 A. Find B at a radius of 0.1 m.`,
          steps: [
            r`The path encloses $NI = 1000$ A: $B = \frac{4\pi \times 10^{-7} \times 1000}{2\pi \times 0.1} = 2 \times 10^{-3}$ T.`,
          ],
          answer: r`2 mT.`,
        },
        {
          level: 'board',
          title: 'A solenoid, with and without iron',
          problem: r`A 1000-turn solenoid 0.5 m long carries 2 A. Find B inside with air, then with a core of $\mu_r = 300$ (unsaturated).`,
          steps: [
            r`Air: $B = \frac{4\pi \times 10^{-7} \times 1000 \times 2}{0.5} = 5.027 \times 10^{-3}$ T.`,
            r`Iron: 300 times as much, 1.508 T.`,
          ],
          answer: r`5.03 mT in air; 1.51 T with the core.`,
        },
      ],
      traps: [
        r`For a coil the enclosed current is NI, not I.`,
        r`The 1/r law holds outside a wire; inside, B falls to zero at the centre.`,
      ],
      check: [
        { q: r`What is B 2 cm from a long wire carrying 50 A?`, a: r`$\frac{4\pi \times 10^{-7} \times 50}{2\pi \times 0.02} = 0.5$ mT.` },
        { q: r`What does the path integral of H give around a loop enclosing two wires carrying 10 A in opposite directions?`, a: r`Zero: the enclosed currents cancel.` },
      ],
    },
    {
      name: 'Magnetic Materials and Hysteresis',
      inShort: r`How materials respond to magnetic fields, and the losses in cores.`,
      body: [
        r`A material's **relative permeability** $\mu_r$ says how much it multiplies B for a given H: $B = \mu_0\mu_rH$. **Diamagnetic** materials (copper, water) have $\mu_r$ slightly below 1; **paramagnetic** ones (aluminium, air) slightly above; **ferromagnetic** ones (iron, nickel, cobalt and their alloys) hundreds to thousands of times, but not constant: they **saturate**, so above about 1.5 to 2 T more H adds little B.`,
        r`Cycled with ac, a ferromagnetic core doesn't retrace its path: B lags H, tracing a **hysteresis loop**. The B left when H returns to zero is the **remanence**; the reverse H needed to bring B to zero is the **coercivity**. Soft materials (silicon steel) have narrow loops, for cores; hard ones (ferrite, NdFeB) wide ones, for permanent magnets.`,
        {
          type: 'plot',
          alt: 'A hysteresis loop: B against H, with the rising branch shifted right and the falling branch shifted left, crossing the B axis at the remanence and the H axis at the coercivity, flattening at saturation near 1.5 T.',
          caption: 'A hysteresis loop: B lags H. Where it crosses the axes are the remanence (B at H = 0) and the coercivity (H at B = 0).',
          x: [-300, 300],
          y: [-1.7, 1.7],
          xLabel: 'H (A/m)',
          yLabel: 'B (T)',
          series: [
            { f: (h) => 1.5 * Math.tanh((h + 50) / 60), label: 'falling H' },
            { f: (h) => 1.5 * Math.tanh((h - 50) / 60), label: 'rising H', dashed: true },
          ],
          marks: [{ y: 1.5 * Math.tanh(50 / 60), label: 'remanence' }, { x: -50, label: 'coercivity' }],
        },
        r`The loop's area is energy lost as heat every cycle: the **hysteresis loss**, by Steinmetz $P_h = \eta B_m^{1.6}fV$. A changing flux also drives **eddy currents** in the core, $P_e \propto f^2B_m^2t^2$ for laminations of thickness t, which is why cores are built of thin insulated sheets.`,
        r`| Class | $\mu_r$ | Examples |
|---|---|---|
| Diamagnetic | slightly below 1 | copper, water, bismuth |
| Paramagnetic | slightly above 1 | aluminium, air, platinum |
| Ferromagnetic | hundreds to thousands, saturating | iron, silicon steel, nickel, ferrite |`,
      ],
      keyIdeas: [
        r`$B = \mu_0\mu_rH$; ferromagnetic materials have large, non-constant $\mu_r$ and saturate.`,
        r`Hysteresis loss $k_hfB_m^nV$ (the loop's area each cycle); eddy loss $k_ef^2B_m^2t^2V$ (cut by laminations).`,
        r`Soft materials (silicon steel) for cores, hard ones (ferrites, NdFeB) for permanent magnets. Energy density $\frac{B^2}{2\mu}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Flux density and loss scaling',
          problem: r`Steel with $\mu_r = 2000$ is under $H = 400$ A/m. Find B. If the frequency doubles at the same $B_m$, what happens to each core loss?`,
          steps: [
            r`$B = 4\pi \times 10^{-7} \times 2000 \times 400 = 1.005$ T.`,
            r`Hysteresis goes with f: it doubles. Eddy goes with $f^2$: it quadruples.`,
          ],
          answer: r`1.005 T; hysteresis loss ×2, eddy loss ×4.`,
        },
        {
          level: 'board',
          title: 'Steinmetz on a transformer core',
          problem: r`A core of 0.01 m³ has a Steinmetz coefficient of 250 J/m³ and runs at 1.2 T peak on 60 Hz. Find its hysteresis loss, then the loss on 50 Hz at the same voltage.`,
          steps: [
            r`$P_h = 250 \times 1.2^{1.6} \times 60 \times 0.01 = 250 \times 1.339 \times 0.6 = 200.8$ W.`,
            r`At the same voltage, $B_m$ goes as $\frac{1}{f}$: on 50 Hz it rises to $1.2 \times \frac{60}{50} = 1.44$ T.`,
            r`$P_h = 250 \times 1.44^{1.6} \times 50 \times 0.01 = 224.0$ W.`,
          ],
          answer: r`200.8 W on 60 Hz; 224.0 W on 50 Hz, about 12% more.`,
        },
      ],
      traps: [
        r`Remanence is the B left when H returns to zero; coercivity is the H needed to remove it.`,
        r`At the same voltage a lower frequency raises the flux density, and with it the core loss.`,
      ],
      check: [
        { q: r`What is a material with $\mu_r$ slightly less than 1 called?`, a: r`Diamagnetic.` },
        { q: r`Which core loss do laminations reduce?`, a: r`Eddy-current loss.` },
      ],
    },
    {
      name: 'Magnetic Circuits',
      inShort: r`Treating flux paths like electric circuits.`,
      body: [
        r`Flux in an iron core follows the core much as current follows a wire, so a core can be solved like a circuit. The coil's **magnetomotive force** $NI$ (ampere-turns) drives flux $\Phi$ through the **reluctance** $\mathcal{R} = \frac{\ell}{\mu A}$ of each part: $NI = \Phi\sum\mathcal{R}$. Parts in series add their reluctances, and an equivalent statement is $NI = \sum H\ell$ around the path.`,
        {
          type: 'circuit',
          alt: 'A magnetic circuit drawn as an electric one: the coil’s ampere-turns as a source, driving flux through the core’s reluctance and the air gap’s reluctance in series.',
          caption: 'A core with an air gap, as a circuit: the mmf drives flux through two reluctances in series.',
          parts: [
            ['V', [0, 2], [0, 0], 'NI'],
            ['R', [0, 0], [3, 0], 'R_{core}'],
            ['R', [3, 0], [3, 2], 'R_{gap}'],
            ['wire', [3, 2], [0, 2]],
            ['i', [2, 2], [1, 2], 'Φ'],
          ],
        },
        r`| Electric circuit | Magnetic circuit |
|---|---|
| EMF (V) | mmf $NI$ (ampere-turns) |
| Current $I$ (A) | Flux $\Phi$ (Wb) |
| Resistance $\frac{\ell}{\sigma A}$ | Reluctance $\frac{\ell}{\mu A}$ (A·t/Wb) |
| Conductivity σ | Permeability μ |
| $V = IR$ | $NI = \Phi\mathcal{R}$ |`,
        r`An air gap's permeability is thousands of times lower than iron's, so even a millimetre of gap usually needs more ampere-turns than the whole core. At a gap the flux also spreads out a little (**fringing**), and some flux skips the gap altogether through the air (**leakage**).`,
      ],
      keyIdeas: [
        r`mmf $NI = \Phi\mathcal{R}$, $\mathcal{R} = \frac{l}{\mu A}$: reluctances in series add.`,
        r`An air gap's reluctance usually dominates: $H_g = \frac{B}{\mu_0}$.`,
        r`Fringing spreads the gap flux; leakage flux bypasses the gap.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Reluctance and flux',
          problem: r`A core 0.4 m long with 5 cm² of cross-section has $\mu_r = 1000$. Find its reluctance, and the flux from 400 ampere-turns.`,
          steps: [
            r`$\mathcal{R} = \frac{0.4}{1000 \times 4\pi \times 10^{-7} \times 5 \times 10^{-4}} = 6.366 \times 10^5$ A·t/Wb.`,
            r`$\Phi = \frac{400}{6.366 \times 10^5} = 6.283 \times 10^{-4}$ Wb.`,
          ],
          answer: r`$6.37 \times 10^5$ A·t/Wb; 0.628 mWb.`,
        },
        {
          level: 'board',
          title: 'A core with an air gap',
          problem: r`A core of $\mu_r = 2000$ has a 0.5 m path and a 1 mm air gap. What ampere-turns give 1 T, and what current with 500 turns?`,
          steps: [
            r`Gap: $H\ell = \frac{1}{4\pi \times 10^{-7}} \times 0.001 = 795.8$ A·t.`,
            r`Core: $\frac{1}{2000 \times 4\pi \times 10^{-7}} \times 0.5 = 198.9$ A·t.`,
            r`Total 994.7 A·t, so $I = \frac{994.7}{500} = 1.989$ A.`,
          ],
          answer: r`994.7 ampere-turns, 1.989 A; the 1 mm gap takes 80% of them.`,
        },
      ],
      traps: [
        r`A 1 mm gap needs four times the ampere-turns of half a metre of steel here.`,
        r`Iron's μ falls as it saturates: read H from the B-H curve when B is high.`,
      ],
      check: [
        { q: r`Which part of a magnetic path usually needs the most mmf?`, a: r`The air gap.` },
        { q: r`Which electric quantity does permeability correspond to?`, a: r`Conductivity.` },
      ],
    },
    {
      name: "Faraday's Law",
      inShort: r`A changing flux induces a voltage.`,
      body: [
        r`**Faraday's law**: a changing magnetic flux through a coil induces an EMF, $e = -N\frac{d\Phi}{dt}$. **Lenz's law** gives the minus sign: the induced current flows so as to oppose the change. A conductor of length ℓ moving at speed v across a field B has the motional EMF $e = B\ell v$.`,
        r`A coil turning in a uniform field sees its flux go as $\cos\omega t$, so its EMF goes as $\sin\omega t$: $e = NBA\omega\sin\omega t$. The EMF is largest when the flux is passing through zero, changing fastest.`,
        {
          type: 'plot',
          alt: 'The flux through a turning coil and the EMF it induces over one revolution: the flux is a cosine and the EMF a sine, so the EMF peaks where the flux crosses zero.',
          caption: 'A coil turning in a field: the EMF (solid) peaks where the flux (dashed) passes through zero.',
          x: [0, 360],
          y: [-1.2, 1.2],
          xLabel: 'ωt (°)',
          series: [
            { f: (x) => Math.sin(x * deg), label: 'e' },
            { f: (x) => Math.cos(x * deg), label: 'Φ', dashed: true },
          ],
          legend: false,
          marks: [{ at: [90, 1], label: 'e largest as Φ passes zero' }],
        },
        r`For a sinusoidal flux of peak $\Phi_m$ at frequency f, the RMS EMF is $E = 4.44fN\Phi_m$, the equation behind every transformer and ac generator.`,
      ],
      keyIdeas: [
        r`$e = -N\frac{d\Phi}{dt}$; Lenz: the EMF opposes the change.`,
        r`Motional $e = BLv$; rotating coil $e = NBA\omega\sin\omega t$.`,
        r`$E_{rms} = 4.44fN\Phi_m$: the basis of transformer and generator EMF.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A turning coil',
          problem: r`A 100-turn coil of 0.02 m² turns at 60 Hz in 0.5 T. Find its peak and RMS EMF.`,
          steps: [
            r`$E_m = NBA\omega = 100 \times 0.5 \times 0.02 \times 377 = 377$ V.`,
            r`$E = \frac{377}{\sqrt2} = 266.6$ V.`,
          ],
          answer: r`377 V peak, 266.6 V RMS.`,
        },
        {
          level: 'board',
          title: 'Flux in a transformer core',
          problem: r`A 200-turn primary is on 230 V, 60 Hz. Find the peak flux, and the peak flux density in a 30 cm² core.`,
          steps: [
            r`$\Phi_m = \frac{230}{4.44 \times 60 \times 200} = 4.317 \times 10^{-3}$ Wb.`,
            r`$B_m = \frac{4.317 \times 10^{-3}}{30 \times 10^{-4}} = 1.439$ T.`,
          ],
          answer: r`4.32 mWb, 1.44 T.`,
        },
      ],
      traps: [
        r`The EMF peaks when the flux through the coil is ZERO (changing fastest).`,
        r`$4.44 = \frac{2\pi}{\sqrt2}$ assumes a sinusoidal flux.`,
      ],
      check: [
        { q: r`A 50-turn coil's flux falls from 2 mWb to zero in 0.01 s. What average EMF does it induce?`, a: r`$50 \times \frac{0.002}{0.01} = 10$ V.` },
        { q: r`A 0.5 m rod moves at 10 m/s across 0.8 T. What EMF?`, a: r`$0.8 \times 0.5 \times 10 = 4$ V.` },
      ],
    },
    {
      name: 'Inductance',
      inShort: r`Flux linkage per ampere, self and mutual.`,
      body: [
        r`A coil's **inductance** is the flux linkage it makes per ampere: $L = \frac{N\Phi}{I}$, in henries. With the magnetic circuit $\Phi = \frac{NI}{\mathcal{R}}$, this is $L = \frac{N^2}{\mathcal{R}}$: it goes with the square of the turns and with the permeability of the core. Its EMF is $e = L\frac{di}{dt}$ and it stores energy $\frac12LI^2$, with $\frac{B^2}{2\mu}$ joules in every cubic metre of field.`,
        r`| Coil | Inductance |
|---|---|
| Any coil on a magnetic circuit | $\frac{N^2}{\mathcal{R}}$ |
| Long solenoid, area A, length ℓ | $\frac{\mu N^2A}{\ell}$ |
| Toroid, area A, mean radius r | $\frac{\mu N^2A}{2\pi r}$ |
| Two coupled coils | $M = k\sqrt{L_1L_2}$ |`,
        r`An iron core gives a large inductance from few turns, but iron saturates, so its L falls at high current. An air gap lowers L but keeps it steady over a wider range of current, which is why chokes and the cores of some reactors are gapped.`,
      ],
      keyIdeas: [
        r`$L = \frac{N\Phi}{I} = \frac{N^2}{\mathcal{R}}$; solenoid $\frac{\mu N^2A}{l}$.`,
        r`Mutual $M = k\sqrt{L_1L_2}$; energy $\frac12LI^2$.`,
        r`An air gap lowers L but steadies it against saturation.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The gapped core',
          problem: r`The 500-turn core of Magnetic Circuits carries 1 T over 4 cm² at 1.989 A. Find its inductance.`,
          steps: [
            r`$\Phi = 1 \times 4 \times 10^{-4} = 4 \times 10^{-4}$ Wb.`,
            r`$L = \frac{N\Phi}{I} = \frac{500 \times 4 \times 10^{-4}}{1.989} = 0.101$ H.`,
          ],
          answer: r`About 0.10 H.`,
        },
        {
          level: 'board',
          title: 'An air-core solenoid',
          problem: r`An air-core solenoid has 400 turns over 20 cm and a 2 cm diameter. Find its inductance and the energy it stores at 2 A.`,
          steps: [
            r`$A = \pi \times 0.01^2 = 3.142 \times 10^{-4}$ m².`,
            r`$L = \frac{4\pi \times 10^{-7} \times 400^2 \times 3.142 \times 10^{-4}}{0.2} = 3.158 \times 10^{-4}$ H.`,
            r`$W = \frac12 \times 3.158 \times 10^{-4} \times 2^2 = 6.32 \times 10^{-4}$ J.`,
          ],
          answer: r`0.316 mH, storing 0.632 mJ at 2 A.`,
        },
      ],
      traps: [
        r`L goes with $N^2$: doubling the turns gives four times the inductance.`,
        r`Use the area of the core, not of the whole coil, when the core is smaller than the winding.`,
      ],
      check: [
        { q: r`A coil's turns are doubled on the same core. What happens to its inductance?`, a: r`It quadruples.` },
        { q: r`How much energy does 0.2 H store at 3 A?`, a: r`$\frac12 \times 0.2 \times 3^2 = 0.9$ J.` },
      ],
    },
    {
      name: 'Force on Conductors',
      inShort: r`Forces on currents and charges in magnetic fields.`,
      body: [
        r`A field pushes on moving charge. On a single charge the **Lorentz force** is $\mathbf{F} = q(\mathbf{E} + \mathbf{v}\times\mathbf{B})$, sideways to its motion, which bends it into a circle of radius $\frac{mv}{qB}$. On a wire of length ℓ carrying I across a field B, $F = BI\ell\sin\theta$, the motor force (Fleming's left-hand rule gives its direction).`,
        r`A coil of N turns and area A carrying I in a field B feels a torque $T = NBIA\sin\theta$, with θ between B and the coil's axis: largest when the coil's plane lies along the field, zero when it faces it. This torque is what turns a motor and swings a meter's pointer.`,
        {
          type: 'plot',
          alt: 'The torque on a coil against the angle between the field and the coil’s axis: zero at 0 and 180 degrees, largest at 90 degrees when the coil’s plane lies along the field.',
          caption: 'Torque on a coil against the angle between the field and its axis: largest with the coil’s plane along the field.',
          x: [0, 180],
          y: [0, 1.15],
          xLabel: 'θ (°)',
          yLabel: 'T / NBIA',
          series: [{ f: (t) => Math.sin(t * deg), label: 'T', area: true }],
          marks: [{ at: [90, 1], label: 'plane along B' }],
        },
        r`Two parallel wires attract when their currents run the same way and repel when opposite, with $\frac{F}{\ell} = \frac{\mu_0I_1I_2}{2\pi d}$. An electromagnet pulls on iron with $\frac{B^2A}{2\mu_0}$ for each pole face.`,
      ],
      keyIdeas: [
        r`$F = BIL\sin\theta$; parallel wires $\frac{F}{L} = \frac{\mu_0I_1I_2}{2\pi d}$ (same direction attract).`,
        r`Lorentz $\mathbf{F} = q(\mathbf{E} + \mathbf{v}\times\mathbf{B})$; coil torque $NBIA\sin\theta$.`,
        r`Lifting force $\frac{B^2A}{2\mu_0}$ per pole face.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Wires and an electromagnet',
          problem: r`Two long wires 1 m apart each carry 100 A. Find the force per metre. An electromagnet has two 10 cm² poles at 1 T: find its pull.`,
          steps: [
            r`Wires: $\frac{4\pi \times 10^{-7} \times 100 \times 100}{2\pi \times 1} = 2 \times 10^{-3}$ N/m.`,
            r`Magnet, both faces together: $\frac{1^2 \times 2 \times 10^{-3}}{2 \times 4\pi \times 10^{-7}} = 795.8$ N.`,
          ],
          answer: r`2 mN per metre; a pull of 796 N.`,
        },
        {
          level: 'board',
          title: 'Torque on a coil',
          problem: r`A 50-turn coil, 10 cm by 8 cm, carries 3 A in a 0.4 T field with its plane along the field. Find the torque.`,
          steps: [
            r`The coil's axis is at 90° to B: $T = NBIA = 50 \times 0.4 \times 3 \times 0.008 = 0.48$ N·m.`,
          ],
          answer: r`0.48 N·m.`,
        },
      ],
      traps: [
        r`Short-circuit currents make these forces huge: bus bars are braced for them.`,
        r`The torque is largest when the coil's plane lies ALONG the field, not across it.`,
      ],
      check: [
        { q: r`Two wires carry currents in the same direction. Do they attract or repel?`, a: r`Attract.` },
        { q: r`A proton at $2 \times 10^6$ m/s crosses 0.5 T at right angles. What is the radius of its path?`, a: r`$\frac{1.673 \times 10^{-27} \times 2 \times 10^6}{1.602 \times 10^{-19} \times 0.5} = 4.18$ cm.` },
      ],
    },
    {
      name: "Maxwell's Equations",
      inShort: r`The four laws of electromagnetism in one set.`,
      body: [
        r`Maxwell gathered the laws of the earlier subtopics into four equations, adding one term of his own: a changing electric field acts like a current (the **displacement current** $\frac{\partial\mathbf{D}}{\partial t}$), which is what lets ac pass through a capacitor and lets fields travel as waves.`,
        r`| Law | Integral form | Point form |
|---|---|---|
| Gauss (electric) | $\oint\mathbf{D}\cdot d\mathbf{S} = Q_{enc}$ | $\nabla\cdot\mathbf{D} = \rho_v$ |
| Gauss (magnetic) | $\oint\mathbf{B}\cdot d\mathbf{S} = 0$ | $\nabla\cdot\mathbf{B} = 0$ |
| Faraday | $\oint\mathbf{E}\cdot d\boldsymbol{\ell} = -\frac{d\Phi}{dt}$ | $\nabla\times\mathbf{E} = -\frac{\partial\mathbf{B}}{\partial t}$ |
| Ampère-Maxwell | $\oint\mathbf{H}\cdot d\boldsymbol{\ell} = I + \frac{d\Psi}{dt}$ | $\nabla\times\mathbf{H} = \mathbf{J} + \frac{\partial\mathbf{D}}{\partial t}$ |`,
        r`Read them in words: electric flux comes from charge; magnetic flux has no source, so its lines always close (no magnetic monopoles); a changing magnetic flux drives an electric field around it (transformers, generators); and a current, or a changing electric flux, drives a magnetic field around it (electromagnets, waves).`,
      ],
      keyIdeas: [
        r`Gauss: $\nabla\cdot\mathbf{D} = \rho_v$; no magnetic charge: $\nabla\cdot\mathbf{B} = 0$.`,
        r`Faraday: $\nabla\times\mathbf{E} = -\frac{\partial\mathbf{B}}{\partial t}$; Ampère-Maxwell: $\nabla\times\mathbf{H} = \mathbf{J} + \frac{\partial\mathbf{D}}{\partial t}$.`,
        r`Displacement current $\frac{\partial\mathbf{D}}{\partial t}$ completes the circuit through a capacitor.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Displacement current',
          problem: r`A 1 µF capacitor's voltage rises at $10^6$ V/s. What displacement current flows through its gap?`,
          steps: [
            r`$i_d = C\frac{dv}{dt} = 10^{-6} \times 10^6 = 1$ A, equal to the conduction current in its leads.`,
          ],
          answer: r`1 A.`,
        },
        {
          level: 'board',
          title: 'Displacement current density',
          problem: r`An air capacitor has plates of 0.01 m² 1 mm apart, and its voltage rises at $10^6$ V/s. Find the displacement current density and the current.`,
          steps: [
            r`$\frac{dE}{dt} = \frac{10^6}{0.001} = 10^9$ V/m per second, so $J_d = \varepsilon_0\frac{dE}{dt} = 8.854 \times 10^{-3}$ A/m².`,
            r`$i_d = J_dA = 8.854 \times 10^{-5}$ A. Check: $C = \frac{\varepsilon_0A}{d} = 88.54$ pF, and $C\frac{dv}{dt}$ gives the same.`,
          ],
          answer: r`$8.85 \times 10^{-3}$ A/m², and 88.5 µA.`,
        },
      ],
      traps: [
        r`$\nabla\cdot\mathbf{B} = 0$ means magnetic field lines always close: there are no isolated poles.`,
        r`Faraday's law has the minus sign (Lenz); the Ampère-Maxwell law doesn't.`,
      ],
      check: [
        { q: r`Which of Maxwell's equations says there are no magnetic monopoles?`, a: r`$\nabla\cdot\mathbf{B} = 0$, Gauss's law for magnetism.` },
        { q: r`Which law is transformer action?`, a: r`Faraday's law.` },
      ],
    },
    {
      name: 'Electromagnetic Waves',
      inShort: r`Self-propagating fields: light, radio, and power-line waves.`,
      body: [
        r`A changing E makes H, and a changing H makes E, so together they can travel through space as a wave. In a medium of permeability μ and permittivity ε it moves at $v = \frac{1}{\sqrt{\mu\varepsilon}}$, which is $c = 3 \times 10^8$ m/s in vacuum and $\frac{c}{\sqrt{\varepsilon_r}}$ in a dielectric. Its wavelength is $\lambda = \frac{v}{f}$, and E and H stand at right angles to each other and to the direction of travel, in the ratio of the medium's **intrinsic impedance**, $\eta = \sqrt{\frac{\mu}{\varepsilon}}$: 377 Ω in free space.`,
        r`| Quantity | Formula |
|---|---|
| Speed | $v = \frac{1}{\sqrt{\mu\varepsilon}} = \frac{c}{\sqrt{\mu_r\varepsilon_r}}$ |
| Wavelength | $\lambda = \frac{v}{f}$ |
| Intrinsic impedance | $\eta = \frac{E}{H} = \sqrt{\frac{\mu}{\varepsilon}}$ |
| Average power density | $S = \frac{E_m^2}{2\eta}$ |
| Skin depth in a conductor | $\delta = \frac{1}{\sqrt{\pi f\mu\sigma}}$ |`,
        r`In a good conductor a wave dies away within a few **skin depths**: at 60 Hz in copper δ is about 8.5 mm, so current crowds toward a conductor's surface (the skin effect), which is why large ac conductors are stranded around a core or made hollow.`,
        {
          type: 'plot',
          alt: 'Current density against depth into copper at 60 Hz: falling exponentially from the surface, to 37 percent at one skin depth of 8.5 mm.',
          caption: 'Current density into copper at 60 Hz: down to 37% at one skin depth, 8.5 mm.',
          x: [0, 30],
          y: [0, 1.05],
          xLabel: 'depth (mm)',
          yLabel: 'J / J₀',
          series: [{ f: (x) => Math.exp(-x / 8.532), label: 'J', area: true }],
          marks: [{ at: [8.532, Math.exp(-1)], label: 'δ = 8.5 mm' }],
        },
      ],
      keyIdeas: [
        r`$v = \frac{1}{\sqrt{\mu\varepsilon}}$ ($c$ in vacuum), $\lambda = \frac{v}{f}$, $\eta_0 = \sqrt{\frac{\mu_0}{\varepsilon_0}} = 377$ Ω.`,
        r`Power density (Poynting) $S = E \times H$, average $\frac{E_m^2}{2\eta}$.`,
        r`In conductors waves die within the skin depth $\delta = \frac{1}{\sqrt{\pi f\mu\sigma}}$ (copper at 60 Hz: 8.5 mm).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Wavelength in two media',
          problem: r`Find the wavelength of a 100 MHz wave in free space and in a dielectric of $\varepsilon_r = 4$.`,
          steps: [
            r`Free space: $\frac{3 \times 10^8}{10^8} = 3$ m.`,
            r`Dielectric: the speed falls by $\sqrt4 = 2$, so the wavelength is 1.5 m.`,
          ],
          answer: r`3 m and 1.5 m.`,
        },
        {
          level: 'board',
          title: 'Fields and power density',
          problem: r`A plane wave in free space has a peak electric field of 100 V/m. Find its peak magnetic field and its average power density.`,
          steps: [
            r`$\eta_0 = \sqrt{\frac{4\pi \times 10^{-7}}{8.854 \times 10^{-12}}} = 376.7$ Ω, so $H_m = \frac{100}{376.7} = 0.2654$ A/m.`,
            r`$S = \frac{100^2}{2 \times 376.7} = 13.27$ W/m².`,
          ],
          answer: r`0.265 A/m peak; 13.3 W/m².`,
        },
        {
          level: 'board',
          title: 'Skin depth',
          problem: r`Find the skin depth of copper ($\sigma = 5.8 \times 10^7$ S/m) at 60 Hz and at 6 kHz.`,
          steps: [
            r`At 60 Hz: $\delta = \frac{1}{\sqrt{\pi \times 60 \times 4\pi \times 10^{-7} \times 5.8 \times 10^7}} = 8.53$ mm.`,
            r`δ goes as $\frac{1}{\sqrt f}$: a hundred times the frequency gives a tenth, 0.853 mm.`,
          ],
          answer: r`8.53 mm at 60 Hz; 0.853 mm at 6 kHz.`,
        },
      ],
      traps: [
        r`Frequency doesn't change entering a new medium; speed and wavelength do.`,
        r`Use the peak field in $\frac{E_m^2}{2\eta}$; with RMS it is $\frac{E^2}{\eta}$.`,
      ],
      check: [
        { q: r`A wave enters glass with $\varepsilon_r = 2.25$. How fast does it travel there?`, a: r`$\frac{3 \times 10^8}{1.5} = 2 \times 10^8$ m/s.` },
        { q: r`What is the wavelength of a 60 Hz wave in free space?`, a: r`5000 km.` },
      ],
    },
  ],
};
