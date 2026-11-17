// Library › Lessons › ESAS › Fundamentals of Deformable Bodies (2026-11-17):
// written for the Philippine REE board, subtopic by subtopic in the
// syllabus's order; every worked example checked by computation. Engineering
// Mechanics supplies the reactions, centroids and moments of inertia used here.
const r = String.raw;

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
      keyIdeas: [
        r`$\sigma = \frac PA$; shear $\tau = \frac VA$ per plane (double shear: two planes); bearing $\frac{P}{td}$.`,
        r`Allowable stress = failure strength ÷ factor of safety.`,
        r`On a plane at $\theta$: $\sigma_\theta = \frac PA\cos^2\theta$, $\tau_\theta = \frac{P}{2A}\sin2\theta$, greatest shear at 45°.`,
      ],
      example: {
        problem: r`A 20 mm pin carries 30 kN in double shear. Find the shear stress. A 20 mm bolt bears 60 kN on a 12 mm plate: find the bearing stress.`,
        solution: r`$A = \frac{\pi(20)^2}{4} = 314.2$ mm², so $\tau = \frac{30\,000}{2(314.2)} = 47.7$ MPa. Bearing: $\frac{60\,000}{12(20)} = 250$ MPa.`,
      },
      traps: [r`Count the shear planes: a pin through a clevis has two.`],
    },
    {
      name: "Strain and Hooke's Law",
      inShort: r`Deformation per length, proportional to stress in the elastic range.`,
      keyIdeas: [
        r`$\varepsilon = \frac\delta L$, $\sigma = E\varepsilon$, $\delta = \frac{PL}{AE}$; lateral strain $-\nu\varepsilon$; $\tau = G\gamma$ with $G = \frac{E}{2(1 + \nu)}$.`,
        r`Statically indeterminate members: add compatibility (equal stretch, total length fixed).`,
        r`Strain energy $\frac{P^2L}{2AE}$; own weight stretches a bar $\frac{WL}{2AE}$.`,
      ],
      example: {
        problem: r`A steel bar ($E = 200$ GPa, $\nu = 0.3$) 2 m long with 500 mm² cross-section carries 80 kN. Find the stretch, the lateral strain and the stored energy.`,
        solution: r`$\delta = \frac{80\,000(2000)}{500(200\,000)} = 1.6$ mm; $\varepsilon = 0.0008$, lateral $-0.00024$. $U = \frac12(80\,000)(0.0016) = 64$ J.`,
      },
      traps: [r`Keep units consistent: N, mm and MPa (= N/mm²) together.`],
    },
    {
      name: 'Thermal Stress',
      inShort: r`Temperature change stresses a member only when it is restrained.`,
      keyIdeas: [
        r`Free change $\delta_T = \alpha L\Delta T$; fully restrained $\sigma = E\alpha\Delta T$.`,
        r`With a gap $\Delta$: stress only after it closes, $\sigma = \frac{E(\alpha L\Delta T - \Delta)}{L}$.`,
        r`Bars in series between walls carry one force that cancels their combined expansion.`,
      ],
      example: {
        problem: r`A 10 m steel rail ($\alpha = 11.7 \times 10^{-6}$/°C) has a 2 mm gap at one end. Find the stress after a 50 °C rise.`,
        solution: r`Free expansion $11.7 \times 10^{-6}(10\,000)(50) = 5.85$ mm, so 3.85 mm is blocked: $\sigma = \frac{200\,000(3.85)}{10\,000} = 77$ MPa compression.`,
      },
      traps: [r`Check whether the gap closes at all before computing stress.`],
    },
    {
      name: 'Torsion',
      inShort: r`Shafts under torque: shear stress and twist.`,
      keyIdeas: [
        r`$\tau = \frac{Tr}{J}$, $\phi = \frac{TL}{GJ}$; solid $J = \frac{\pi d^4}{32}$, hollow $\frac{\pi(d_o^4 - d_i^4)}{32}$.`,
        r`Power $P = 2\pi fT$; solid shaft $d = \sqrt[3]{\frac{16T}{\pi\tau}}$.`,
        r`Shafts in series add angles; fixed at both ends, they split the torque so both twist equally. Springs: $\delta = \frac{64PR^3n}{Gd^4}$.`,
      ],
      example: {
        problem: r`Size a solid shaft for 75 kW at 1500 rpm with $\tau_{\text{allow}} = 60$ MPa, and find its twist over 1 m ($G = 80$ GPa).`,
        solution: r`$T = \frac{75\,000}{2\pi(25)} = 477.5$ N·m; $d = \sqrt[3]{\frac{16(477.5)}{\pi(60 \times 10^6)}} = 34.4$ mm. $\phi = \frac{477.5(1)}{80 \times 10^9(1.367 \times 10^{-7})} = 0.0437$ rad $= 2.50^\circ$.`,
      },
      traps: [r`Twist comes out in radians; rpm must become rev/s.`],
    },
    {
      name: 'Shear and Moment Diagrams',
      inShort: r`How internal shear and bending moment vary along a beam.`,
      keyIdeas: [
        r`$\frac{dV}{dx} = -w$, $\frac{dM}{dx} = V$: the moment changes by the area of the shear diagram.`,
        r`The greatest moment is where the shear crosses zero.`,
        r`Simple beam: $\frac{wL^2}{8}$, $\frac{PL}{4}$, $\frac{Pab}{L}$; cantilever: $PL$, $\frac{wL^2}{2}$ at the wall.`,
      ],
      example: {
        problem: r`A 6 m simple beam carries 10 kN/m. Find the reactions and the greatest moment. What does a single 20 kN load 2 m from one end give instead?`,
        solution: r`Reactions $\frac{10(6)}{2} = 30$ kN; $M_{\max} = \frac{10(6)^2}{8} = 45$ kN·m at mid-span. Point load: $\frac{20(2)(4)}{6} = 26.7$ kN·m under the load.`,
      },
      traps: [r`Sign conventions: sagging moment positive, shear positive when the left side pushes up.`],
    },
    {
      name: 'Flexural Stress',
      inShort: r`Bending stress, zero at the neutral axis and greatest at the outer fibres.`,
      keyIdeas: [
        r`$\sigma = \frac{My}{I}$; maximum $\frac{M}{S}$ with section modulus $S = \frac Ic$ ($\frac{bh^2}{6}$ for a rectangle).`,
        r`Curvature $\frac1\rho = \frac{M}{EI}$.`,
        r`Two materials: transform one by $n = \frac{E_2}{E_1}$, then multiply its stress back by $n$.`,
      ],
      example: {
        problem: r`A 100 mm × 300 mm timber beam (on edge) carries a 40 kN·m moment. Find the greatest bending stress.`,
        solution: r`$S = \frac{100(300)^2}{6} = 1.5 \times 10^6$ mm³, so $\sigma = \frac{40 \times 10^6}{1.5 \times 10^6} = 26.7$ MPa. Laid flat, $S$ is three times smaller.`,
      },
      traps: [r`For an unsymmetric section (a T), use the larger $c$ for the greater stress.`],
    },
    {
      name: 'Shear Stress in Beams',
      inShort: r`Shear stress across a beam's depth, and the shear flow fasteners must carry.`,
      keyIdeas: [
        r`$\tau = \frac{VQ}{Ib}$, $Q$ being the first moment of the area beyond the level.`,
        r`Rectangle $\tau_{\max} = \frac{3V}{2A}$; circle $\frac{4V}{3A}$; an I-beam's web carries most of it.`,
        r`Shear flow $q = \frac{VQ}{I}$; fastener spacing $s = \frac Fq$.`,
      ],
      example: {
        problem: r`The same 100 × 300 mm beam carries 50 kN of shear. Find the greatest shear stress.`,
        solution: r`$\tau_{\max} = \frac{3(50\,000)}{2(100)(300)} = 2.5$ MPa, at the neutral axis.`,
      },
      traps: [r`$b$ is the width AT the level, which changes in flanged sections.`],
    },
    {
      name: 'Beam Deflection',
      inShort: r`How far a beam sags, by double integration, standard cases or moment-area.`,
      keyIdeas: [
        r`$EIy'' = M(x)$; constants from the supports.`,
        r`Cantilever $\frac{PL^3}{3EI}$, $\frac{wL^4}{8EI}$; simple $\frac{PL^3}{48EI}$, $\frac{5wL^4}{384EI}$; add cases by superposition.`,
        r`Moment-area: slope change = area of $\frac{M}{EI}$; deviation = its moment.`,
      ],
      example: {
        problem: r`A 4 m simple beam with $EI = 1.6 \times 10^6$ N·m² carries 5 kN/m. Find the mid-span deflection.`,
        solution: r`$\delta = \frac{5(5000)(4)^4}{384(1.6 \times 10^6)} = 0.0104$ m $= 10.4$ mm.`,
      },
      traps: [r`$L^3$ and $L^4$ magnify unit errors: keep everything in N and m (or N and mm).`],
    },
    {
      name: "Combined Stresses and Mohr's Circle",
      inShort: r`Stresses from several loads at once, and how they look on rotated planes.`,
      keyIdeas: [
        r`Axial + bending: $\frac PA \pm \frac{Mc}{I}$; an eccentric load stays tension-free within the middle third.`,
        r`Principal $\sigma_{1,2} = C \pm R$, $C = \frac{\sigma_x + \sigma_y}{2}$, $R = \sqrt{\left(\frac{\sigma_x - \sigma_y}{2}\right)^2 + \tau_{xy}^2} = \tau_{\max}$; $\tan2\theta_p = \frac{2\tau_{xy}}{\sigma_x - \sigma_y}$.`,
        r`Shafts: $\tau_{\max} = \frac{16}{\pi d^3}\sqrt{M^2 + T^2}$.`,
      ],
      example: {
        problem: r`At a point $\sigma_x = 80$ MPa, $\sigma_y = -20$ MPa, $\tau_{xy} = 30$ MPa. Find the principal stresses, their angle and the greatest shear.`,
        solution: r`$C = 30$, $R = \sqrt{50^2 + 30^2} = 58.3$ MPa: $\sigma_1 = 88.3$, $\sigma_2 = -28.3$ MPa, $\tau_{\max} = 58.3$ MPa. $\theta_p = \frac12\tan^{-1}\frac{60}{100} = 15.5^\circ$.`,
      },
      traps: [r`On Mohr's circle, angles double: 15.5° on the element is 31° on the circle.`],
    },
    {
      name: 'Columns',
      inShort: r`Long members in compression fail by buckling, not crushing.`,
      keyIdeas: [
        r`Euler $P_{cr} = \frac{\pi^2EI}{(KL)^2}$, using the smallest $I$; $K = 1$, 2, 0.7, 0.5 for pinned, fixed-free, fixed-pinned, fixed-fixed.`,
        r`$\sigma_{cr} = \frac{\pi^2E}{(KL/r)^2}$, valid only below the proportional limit (steel: $\frac{KL}{r} \gtrsim 100$).`,
        r`Intermediate columns: J. B. Johnson's parabola.`,
      ],
      example: {
        problem: r`A pinned steel column 3 m long has $I = 2 \times 10^6$ mm⁴ ($E = 200$ GPa). Find its buckling load, and the load if it were a flagpole (fixed-free).`,
        solution: r`$P_{cr} = \frac{\pi^2(200 \times 10^9)(2 \times 10^{-6})}{3^2} = 438.6$ kN. Fixed-free ($K = 2$): a quarter, 109.7 kN.`,
      },
      traps: [r`Buckling happens about the WEAK axis.`],
    },
    {
      name: 'Thin-Walled Pressure Vessels',
      inShort: r`Cylinders and spheres under internal pressure.`,
      keyIdeas: [
        r`Cylinder hoop $\frac{pD}{2t}$, longitudinal $\frac{pD}{4t}$; sphere $\frac{pD}{4t}$ everywhere.`,
        r`Thin when $\frac tD \le \frac{1}{20}$; otherwise Lamé, $\sigma_{t} = p\frac{r_o^2 + r_i^2}{r_o^2 - r_i^2}$ at the bore.`,
        r`With a riveted seam, divide by the joint efficiency.`,
      ],
      example: {
        problem: r`A 1 m cylinder with 10 mm walls holds 2 MPa. Find the hoop and longitudinal stresses, and the stress in a sphere of the same size.`,
        solution: r`Hoop $\frac{2(1000)}{2(10)} = 100$ MPa; longitudinal 50 MPa; sphere 50 MPa.`,
      },
      traps: [r`A cylinder bursts along its length: the hoop stress is twice the longitudinal.`],
    },
    {
      name: 'Riveted and Welded Joints',
      inShort: r`How strong a joint is, by its weakest way of failing.`,
      keyIdeas: [
        r`Rivet shear $n\,m\frac{\pi d^2}{4}\tau$; bearing $ndt\sigma_b$; plate tearing $(b - n'd)t\sigma_t$.`,
        r`The joint's strength is the smallest; efficiency = that ÷ the solid plate's strength.`,
        r`Fillet weld $0.707aL\tau$ (shear through the throat).`,
      ],
      example: {
        problem: r`A lap joint has four 20 mm rivets in single shear (τ = 100 MPa) through 12 mm plates 200 mm wide (σ_b = 200, σ_t = 140 MPa; two holes in the critical row). Find its strength and efficiency.`,
        solution: r`Shear $4\frac{\pi(20)^2}{4}(100) = 125.7$ kN; bearing $4(20)(12)(200) = 192$ kN; tearing $(200 - 40)(12)(140) = 268.8$ kN. Strength 125.7 kN; efficiency $\frac{125.7}{336} = 37.4\%$.`,
      },
      traps: [r`Butt joints with two cover plates put each rivet in DOUBLE shear.`],
    },
  ],
};
