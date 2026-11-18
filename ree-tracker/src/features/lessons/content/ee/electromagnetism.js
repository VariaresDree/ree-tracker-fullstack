// Library › Lessons › EE › Electromagnetism (2026-11-18): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by computation. Coupled-circuit analysis is in
// Electric Circuits 2; machines build on the magnetic circuits here.
const r = String.raw;

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
      keyIdeas: [
        r`$F = \frac{kq_1q_2}{r^2}$, $k = \frac{1}{4\pi\varepsilon_0} = 8.988 \times 10^9$; like charges repel.`,
        r`Several charges: add the force vectors (superposition).`,
        r`In a medium the force is divided by $\varepsilon_r$.`,
      ],
      example: {
        problem: r`Charges of +2 µC and −3 µC are 0.3 m apart. Find the force.`,
        solution: r`$F = \frac{8.988 \times 10^9(2 \times 10^{-6})(3 \times 10^{-6})}{0.3^2} = 0.599$ N, attractive.`,
      },
      traps: [r`Square the distance, and convert µC to C before multiplying.`],
    },
    {
      name: 'Electric Field',
      inShort: r`Force per unit charge, pointing away from positive charges.`,
      keyIdeas: [
        r`Point charge $E = \frac{kq}{r^2}$; line $\frac{\lambda}{2\pi\varepsilon r}$; sheet $\frac{\sigma}{2\varepsilon}$; between plates $\frac{V}{d}$.`,
        r`$F = qE$; field lines start on + and end on − charges.`,
        r`Fields add as vectors.`,
      ],
      example: {
        problem: r`Find the field 0.5 m from a 1 µC charge.`,
        solution: r`$E = \frac{8.988 \times 10^9(10^{-6})}{0.5^2} = 35\,950$ N/C, pointing away from the charge.`,
      },
      traps: [r`Field adds as vectors; potential (next) adds as plain numbers.`],
    },
    {
      name: "Gauss's Law",
      inShort: r`The flux out of a closed surface equals the charge inside.`,
      keyIdeas: [
        r`$\oint\mathbf{D}\cdot d\mathbf{A} = Q_{enc}$, $\mathbf{D} = \varepsilon\mathbf{E}$.`,
        r`Use it where symmetry makes E constant on the surface: spheres, cylinders, planes.`,
        r`A conductor's field inside is zero; its charge lives on the surface.`,
      ],
      example: {
        problem: r`A conducting sphere of radius 0.1 m carries 1 µC. Find the field 0.05 m and 0.2 m from its centre.`,
        solution: r`Inside (0.05 m): 0. Outside: $\frac{kQ}{r^2} = \frac{8.988 \times 10^9(10^{-6})}{0.04} = 224\,700$ N/C.`,
      },
      traps: [r`Charges outside the Gaussian surface affect E on it, but add no net flux.`],
    },
    {
      name: 'Electric Potential',
      inShort: r`Energy per unit charge, a scalar.`,
      keyIdeas: [
        r`$V = \frac{kq}{r}$; $V_a - V_b = -\int_b^a\mathbf{E}\cdot d\mathbf{l}$; uniform field $E = \frac{V}{d}$.`,
        r`Work to move a charge: $W = qV$; two charges store $U = \frac{kq_1q_2}{r}$.`,
        r`Equipotentials are perpendicular to field lines.`,
      ],
      example: {
        problem: r`Find the potential 0.5 m from a 1 µC charge, and the work to bring a 2 µC charge there from far away.`,
        solution: r`$V = \frac{8.988 \times 10^9(10^{-6})}{0.5} = 17\,976$ V; $W = qV = 2 \times 10^{-6} \times 17\,976 = 0.036$ J.`,
      },
      traps: [r`Potential falls as $\frac1r$, the field as $\frac{1}{r^2}$.`],
    },
    {
      name: 'Capacitance and Dielectrics',
      inShort: r`Storing charge, and what dielectrics do.`,
      keyIdeas: [
        r`Parallel plates $\frac{\varepsilon A}{d}$; coaxial $\frac{2\pi\varepsilon L}{\ln(b/a)}$; concentric spheres $\frac{4\pi\varepsilon ab}{b - a}$.`,
        r`Layered dielectrics act in series: $C = \frac{\varepsilon_0A}{\sum d_k/\varepsilon_{rk}}$.`,
        r`Energy density $\frac12\varepsilon E^2$; a dielectric raises C by $\varepsilon_r$ and has a breakdown strength.`,
      ],
      example: {
        problem: r`Find the capacitance of plates of 0.01 m² 1 mm apart with $\varepsilon_r = 4$, and of 1 km of coaxial cable with radii 2 and 8 mm, $\varepsilon_r = 2.3$.`,
        solution: r`Plates: $\frac{4(8.854 \times 10^{-12})(0.01)}{0.001} = 354$ pF. Cable: $\frac{2\pi(2.3)(8.854 \times 10^{-12})(1000)}{\ln 4} = 92.3$ nF.`,
      },
      traps: [r`The air in a layered dielectric takes the highest field and breaks down first.`],
    },
    {
      name: 'Current and Resistivity',
      inShort: r`Current at the scale of the material: density, drift and leakage.`,
      keyIdeas: [
        r`$J = \frac{I}{A} = nqv_d = \sigma E$; Ohm's law at a point.`,
        r`Drift velocities are tiny (fractions of a mm/s).`,
        r`Insulation resistance of a cable $\frac{\rho}{2\pi L}\ln\frac{b}{a}$: it falls with length.`,
      ],
      example: {
        problem: r`A 1 km cable has a 5 mm conductor radius and 10 mm insulation radius, insulation resistivity $5 \times 10^{12}$ Ω·m. Find its insulation resistance.`,
        solution: r`$\frac{5 \times 10^{12}}{2\pi(1000)}\ln 2 = 552$ MΩ.`,
      },
      traps: [r`Doubling the cable's length HALVES its insulation resistance.`],
    },
    {
      name: 'Biot-Savart Law',
      inShort: r`The magnetic field made by a current element.`,
      keyIdeas: [
        r`$d\mathbf{B} = \frac{\mu_0}{4\pi}\frac{I\,d\mathbf{l}\times\hat{\mathbf{r}}}{r^2}$, integrated along the conductor.`,
        r`Loop centre $\frac{\mu_0NI}{2R}$; on the axis $\frac{\mu_0NIR^2}{2(R^2 + x^2)^{3/2}}$.`,
        r`Right-hand rule: thumb along the current, fingers curl with B.`,
      ],
      example: {
        problem: r`A 20-turn coil of radius 0.1 m carries 5 A. Find B at its centre.`,
        solution: r`$B = \frac{4\pi \times 10^{-7}(20)(5)}{2(0.1)} = 6.28 \times 10^{-4}$ T.`,
      },
      traps: [r`Use the radius in the loop formula; the diameter gives half the field.`],
    },
    {
      name: "Ampère's Law",
      inShort: r`The circulation of H equals the enclosed current.`,
      keyIdeas: [
        r`$\oint\mathbf{H}\cdot d\mathbf{l} = I_{enc}$; long wire $B = \frac{\mu_0I}{2\pi r}$.`,
        r`Solenoid $B = \frac{\mu NI}{l}$; toroid $B = \frac{\mu NI}{2\pi r}$.`,
        r`Inside a solid wire B grows linearly from zero at its centre.`,
      ],
      example: {
        problem: r`A 500-turn air toroid carries 2 A. Find B at a radius of 0.1 m.`,
        solution: r`$B = \frac{4\pi \times 10^{-7}(500)(2)}{2\pi(0.1)} = 2$ mT.`,
      },
      traps: [r`For a coil the enclosed current is NI, not I.`],
    },
    {
      name: 'Magnetic Materials and Hysteresis',
      inShort: r`How materials respond to magnetic fields, and the losses in cores.`,
      keyIdeas: [
        r`$B = \mu_0\mu_rH$; ferromagnetic materials have large, non-constant $\mu_r$ and saturate.`,
        r`Hysteresis loss $k_hfB_m^nV$ (the loop's area each cycle); eddy loss $k_ef^2B_m^2t^2V$ (cut by laminations).`,
        r`Soft materials (silicon steel) for cores, hard ones (ferrites, NdFeB) for permanent magnets. Energy density $\frac{B^2}{2\mu}$.`,
      ],
      example: {
        problem: r`Steel with $\mu_r = 2000$ is under $H = 400$ A/m. Find B. If the frequency doubles, what happens to each core loss?`,
        solution: r`$B = 4\pi \times 10^{-7}(2000)(400) = 1.0$ T. Hysteresis loss doubles; eddy loss quadruples.`,
      },
      traps: [r`Remanence is the B left when H returns to zero; coercivity is the H needed to remove it.`],
    },
    {
      name: 'Magnetic Circuits',
      inShort: r`Treating flux paths like electric circuits.`,
      keyIdeas: [
        r`mmf $NI = \Phi\mathcal{R}$, $\mathcal{R} = \frac{l}{\mu A}$: reluctances in series add.`,
        r`An air gap's reluctance usually dominates: $H_g = \frac{B}{\mu_0}$.`,
        r`Fringing spreads the gap flux; leakage flux bypasses the gap.`,
      ],
      example: {
        problem: r`A core of $\mu_r = 2000$ has a 0.5 m path and a 1 mm air gap. What ampere-turns give 1 T, and what current with 500 turns?`,
        solution: r`Gap: $\frac{1}{4\pi \times 10^{-7}}(0.001) = 796$ At; core: $\frac{1}{2000\mu_0}(0.5) = 199$ At. Total 995 At, so $\frac{995}{500} = 1.99$ A.`,
      },
      traps: [r`A 1 mm gap needs four times the ampere-turns of half a metre of steel here.`],
    },
    {
      name: "Faraday's Law",
      inShort: r`A changing flux induces a voltage.`,
      keyIdeas: [
        r`$e = -N\frac{d\Phi}{dt}$; Lenz: the EMF opposes the change.`,
        r`Motional $e = BLv$; rotating coil $e = NBA\omega\sin\omega t$.`,
        r`$E_{rms} = 4.44fN\Phi_m$: the basis of transformer and generator EMF.`,
      ],
      example: {
        problem: r`A 100-turn coil of 0.02 m² turns at 60 Hz in 0.5 T. Find its peak and RMS EMF.`,
        solution: r`$E_m = NBA\omega = 100(0.5)(0.02)(377) = 377$ V; $E_{rms} = \frac{377}{\sqrt2} = 267$ V.`,
      },
      traps: [r`The EMF peaks when the flux through the coil is ZERO (changing fastest).`],
    },
    {
      name: 'Inductance',
      inShort: r`Flux linkage per ampere, self and mutual.`,
      keyIdeas: [
        r`$L = \frac{N\Phi}{I} = \frac{N^2}{\mathcal{R}}$; solenoid $\frac{\mu N^2A}{l}$.`,
        r`Mutual $M = k\sqrt{L_1L_2}$; energy $\frac12LI^2$.`,
        r`An air gap lowers L but steadies it against saturation.`,
      ],
      example: {
        problem: r`The 500-turn core with the air gap above carries 1 T over 4 cm² at 1.99 A. Find its inductance.`,
        solution: r`$\Phi = 4 \times 10^{-4}$ Wb; $L = \frac{N\Phi}{I} = \frac{500(4 \times 10^{-4})}{1.99} = 0.10$ H.`,
      },
      traps: [r`L goes with $N^2$: doubling the turns gives four times the inductance.`],
    },
    {
      name: 'Force on Conductors',
      inShort: r`Forces on currents and charges in magnetic fields.`,
      keyIdeas: [
        r`$F = BIL\sin\theta$; parallel wires $\frac{F}{L} = \frac{\mu_0I_1I_2}{2\pi d}$ (same direction attract).`,
        r`Lorentz $\mathbf{F} = q(\mathbf{E} + \mathbf{v}\times\mathbf{B})$; coil torque $NBIA\sin\theta$.`,
        r`Lifting force $\frac{B^2A}{2\mu_0}$ per pole face.`,
      ],
      example: {
        problem: r`Two long wires 1 m apart each carry 100 A. Find the force per metre. An electromagnet has two 10 cm² poles at 1 T: find its pull.`,
        solution: r`$\frac{4\pi \times 10^{-7}(100)(100)}{2\pi(1)} = 2 \times 10^{-3}$ N/m. Pull: $\frac{1^2(2 \times 10^{-3})}{2(4\pi \times 10^{-7})} = 796$ N.`,
      },
      traps: [r`Short-circuit currents make these forces huge: bus bars are braced for them.`],
    },
    {
      name: "Maxwell's Equations",
      inShort: r`The four laws of electromagnetism in one set.`,
      keyIdeas: [
        r`Gauss: $\nabla\cdot\mathbf{D} = \rho_v$; no magnetic charge: $\nabla\cdot\mathbf{B} = 0$.`,
        r`Faraday: $\nabla\times\mathbf{E} = -\frac{\partial\mathbf{B}}{\partial t}$; Ampère-Maxwell: $\nabla\times\mathbf{H} = \mathbf{J} + \frac{\partial\mathbf{D}}{\partial t}$.`,
        r`Displacement current $\frac{\partial\mathbf{D}}{\partial t}$ completes the circuit through a capacitor.`,
      ],
      example: {
        problem: r`A 1 µF capacitor's voltage rises at $10^6$ V/s. What displacement current flows through its gap?`,
        solution: r`$i_d = C\frac{dv}{dt} = 10^{-6}(10^6) = 1$ A, equal to the conduction current in the leads.`,
      },
      traps: [r`$\nabla\cdot\mathbf{B} = 0$ means magnetic field lines always close: there are no isolated poles.`],
    },
    {
      name: 'Electromagnetic Waves',
      inShort: r`Self-propagating fields: light, radio, and power-line waves.`,
      keyIdeas: [
        r`$v = \frac{1}{\sqrt{\mu\varepsilon}}$ ($c$ in vacuum), $\lambda = \frac{v}{f}$, $\eta_0 = \sqrt{\frac{\mu_0}{\varepsilon_0}} = 377$ Ω.`,
        r`Power density (Poynting) $S = E \times H$, average $\frac{E_m^2}{2\eta}$.`,
        r`In conductors waves die within the skin depth $\delta = \frac{1}{\sqrt{\pi f\mu\sigma}}$ (copper at 60 Hz: 8.5 mm).`,
      ],
      example: {
        problem: r`Find the wavelength of a 100 MHz wave in free space and in a dielectric of $\varepsilon_r = 4$.`,
        solution: r`Free space: $\frac{3 \times 10^8}{10^8} = 3$ m. Dielectric: speed halves, so 1.5 m.`,
      },
      traps: [r`Frequency doesn't change entering a new medium; speed and wavelength do.`],
    },
  ],
};
