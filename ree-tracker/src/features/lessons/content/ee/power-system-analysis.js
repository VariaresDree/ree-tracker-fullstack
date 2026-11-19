// Library › Lessons › EE › Power System Analysis (2026-11-19): written for the
// Philippine REE board, subtopic by subtopic in the syllabus's order; every
// worked example checked by computation. Symmetrical-component basics and
// two-port ABCD algebra are in Electric Circuits 2; machine models in
// Machinery 2; relays and breakers in Power System Protection.
const r = String.raw;

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
      keyIdeas: [
        r`Choose one MVA base and a kV base per zone; voltage bases step through transformers by their ratios.`,
        r`$Z_{base} = \frac{\text{kV}^2}{\text{MVA}}$, $I_{base} = \frac{\text{MVA}}{\sqrt3\,\text{kV}}$.`,
        r`Change of base: $Z_{new} = Z_{old}\left(\frac{\text{kV}_{old}}{\text{kV}_{new}}\right)^2\frac{\text{MVA}_{new}}{\text{MVA}_{old}}$.`,
      ],
      example: {
        problem: r`A 50 MVA, 13.2 kV generator has $X'' = 0.15$ pu. Put it on a 100 MVA, 13.8 kV base, and find that zone's base impedance and current.`,
        solution: r`$X = 0.15\left(\frac{13.2}{13.8}\right)^2 \times \frac{100}{50} = 0.274$ pu. $Z_{base} = \frac{13.8^2}{100} = 1.904$ Ω; $I_{base} = \frac{100}{\sqrt3 \times 13.8} = 4.18$ kA.`,
      },
      traps: [r`Voltage ratio old over new, SQUARED; MVA new over old.`],
    },
    {
      name: 'One-Line and Impedance Diagrams',
      inShort: r`A balanced three-phase system drawn as one line, then as per-unit impedances.`,
      keyIdeas: [
        r`Generators: an EMF behind a reactance; transformers and lines: series impedances (shunts where needed).`,
        r`Loads as impedances: $Z = \frac{V^2}{S^*}$ (lagging load: R + jX).`,
        r`Neglect resistance, shunts and loads for fault studies unless told otherwise.`,
      ],
      example: {
        problem: r`A 10 MVA load at 0.8 lagging is rated 13.8 kV. Find its impedance in ohms and in per unit on 100 MVA, 13.8 kV.`,
        solution: r`$|Z| = \frac{13.8^2}{10} = 19.04$ Ω at 36.9°: $15.2 + j11.4$ Ω. On $Z_{base} = 1.904$ Ω: $8 + j6$ pu.`,
      },
      traps: [r`Use the CONJUGATE of S: a lagging load must come out inductive.`],
    },
    {
      name: 'Line Resistance, Inductance and Capacitance',
      inShort: r`Line parameters from geometry: GMR for inductance, radius for capacitance, GMD for spacing.`,
      keyIdeas: [
        r`$L = 2 \times 10^{-7}\ln\frac{D_{eq}}{D_s}$ H/m; solid conductor $D_s = 0.7788r$; at 60 Hz $X = 0.0754\ln\frac{D_{eq}}{D_s}$ Ω/km.`,
        r`$C_n = \frac{2\pi\varepsilon_0}{\ln(D_{eq}/r)}$ F/m; $D_{eq} = \sqrt[3]{D_{ab}D_{bc}D_{ca}}$.`,
        r`Bundles: GMR $\sqrt{D_sd}$ (2), $\sqrt[3]{D_sd^2}$ (3), $1.09\sqrt[4]{D_sd^3}$ (4); they lower L, raise C and reduce corona.`,
      ],
      example: {
        problem: r`A flat three-phase line has 8 m phase spacing and two-conductor bundles 0.45 m apart, each with GMR 0.0122 m. Find the reactance per km at 60 Hz.`,
        solution: r`Bundle GMR $= \sqrt{0.0122 \times 0.45} = 0.0741$ m. $D_{eq} = 8\sqrt[3]{2} = 10.08$ m. $X = 0.0754\ln\frac{10.08}{0.0741} = 0.370$ Ω/km.`,
      },
      traps: [r`Inductance uses GMR; capacitance uses the actual radius (bundle: $\sqrt{rd}$).`],
    },
    {
      name: 'Short, Medium and Long Lines',
      inShort: r`How much of the line's capacitance to model depends on its length.`,
      keyIdeas: [
        r`Short (< 80 km): series Z only. Medium (80–250 km): nominal π, $A = 1 + \frac{YZ}{2}$, $B = Z$.`,
        r`Long: $A = \cosh\gamma\ell$, $B = Z_c\sinh\gamma\ell$; equivalent π with $Z' = Z\frac{\sinh\gamma\ell}{\gamma\ell}$.`,
        r`Ferranti effect: an open line's far end rises to $\frac{V_s}{|A|}$. Surge impedance $Z_c = \sqrt{L/C}$, SIL $= \frac{\text{kV}^2}{Z_c}$.`,
      ],
      example: {
        problem: r`A 150 km line has $Z = 4.5 + j52.5$ Ω and $Y = j660$ µS. Find A for the nominal π, and the open-circuit receiving voltage with 230 kV at the sending end.`,
        solution: r`$A = 1 + \frac{(j660 \times 10^{-6})(4.5 + j52.5)}{2} = 0.9827 + j0.0015$, $|A| = 0.9827$. $V_{r,NL} = \frac{230}{0.9827} = 234.1$ kV.`,
      },
      traps: [r`Work per phase: line voltage $\div\sqrt3$ before using the ABCD equations.`],
    },
    {
      name: 'ABCD Constants',
      inShort: r`Any line or network as $V_s = AV_r + BI_r$, $I_s = CV_r + DI_r$.`,
      keyIdeas: [
        r`Symmetric networks have $A = D$; every passive one has $AD - BC = 1$.`,
        r`Networks in series multiply their ABCD matrices, sending end first.`,
        r`Regulation $= \frac{|V_s|/|A| - |V_{r,FL}|}{|V_{r,FL}|}$.`,
      ],
      example: {
        problem: r`The line above needs 240 kV at the sending end to hold 220 kV at the receiving end at full load. Find its regulation.`,
        solution: r`$V_{r,NL} = \frac{240}{0.9827} = 244.2$ kV. VR $= \frac{244.2 - 220}{220} = 11.0\%$.`,
      },
      traps: [r`Use $V_s/|A|$, not $V_s$, for the no-load receiving voltage of a line with capacitance.`],
    },
    {
      name: 'Power Circle Diagrams',
      inShort: r`Receiving-end P and Q trace a circle as the angle δ changes.`,
      keyIdeas: [
        r`$S_r = \frac{|V_s||V_r|}{|B|}\angle(\beta - \delta) - \frac{|A||V_r|^2}{|B|}\angle(\beta - \alpha)$.`,
        r`Fixed centre, radius $\frac{|V_s||V_r|}{|B|}$; $P_{r,\max}$ at $\delta = \beta$.`,
        r`Short lossless line: $P = \frac{V_sV_r}{X}\sin\delta$.`,
      ],
      example: {
        problem: r`A line has $A = 0.98\angle0.1°$, $B = 100\angle85°$ Ω, with 230 kV at both ends. Find the largest receiving-end power.`,
        solution: r`$P_{\max} = \frac{230^2}{100} - \frac{0.98 \times 230^2}{100}\cos(84.9°) = 529 - 46 = 483$ MW.`,
      },
      traps: [r`With line voltages in kV and B in ohms the result is in MW (three phase).`],
    },
    {
      name: 'Bus Admittance Matrix',
      inShort: r`The network's nodal equations, $\mathbf{I} = Y_{bus}\mathbf{V}$, written by inspection.`,
      keyIdeas: [
        r`$Y_{ii}$ = sum of admittances at bus i (including shunts); $Y_{ij} = -y_{ij}$.`,
        r`Sparse and symmetric; $Z_{bus} = Y_{bus}^{-1}$ is full.`,
        r`Kron reduction removes buses with no injection: $Y_{ij} - \frac{Y_{ik}Y_{kj}}{Y_{kk}}$.`,
      ],
      example: {
        problem: r`Lines of $j0.2$ pu (bus 1–2) and $j0.25$ pu (bus 1–3). Find $Y_{11}$ and $Y_{12}$.`,
        solution: r`$y_{12} = -j5$, $y_{13} = -j4$. $Y_{11} = -j9$ pu, $Y_{12} = +j5$ pu.`,
      },
      traps: [r`Off-diagonal elements carry a MINUS sign.`],
    },
    {
      name: 'Load Flow',
      inShort: r`Solving the network's voltages from the power each bus injects.`,
      keyIdeas: [
        r`Slack bus (V, δ known), PV buses (P, |V|), PQ buses (P, Q).`,
        r`Gauss-Seidel updates one bus at a time; Newton-Raphson corrects all at once with the Jacobian.`,
        r`DC load flow: $P_{ij} \approx \frac{\delta_i - \delta_j}{X_{ij}}$, a fast linear estimate.`,
      ],
      example: {
        problem: r`Bus 1 leads bus 2 by 0.1 rad across a line of $X = 0.2$ pu on 100 MVA. Estimate the flow.`,
        solution: r`$P \approx \frac{0.1}{0.2} = 0.5$ pu = 50 MW, from bus 1 to bus 2.`,
      },
      traps: [r`Real power follows angle; reactive power follows voltage magnitude.`],
    },
    {
      name: 'Symmetrical Faults',
      inShort: r`A balanced three-phase fault: the Thévenin impedance at the fault sets the current.`,
      keyIdeas: [
        r`$I_f = \frac{V_f}{Z_{th} + Z_f}$ pu, with subtransient reactances for the first cycles.`,
        r`$\text{MVA}_{sc} = \frac{\text{MVA}_{base}}{Z_{pu}}$; Z-bus: $I_f = \frac{V_f}{Z_{kk}}$, $V_i = V_f - Z_{ik}I_f$.`,
        r`Current decays from subtransient ($X''_d$) to transient ($X'_d$) to steady state ($X_d$).`,
      ],
      example: {
        problem: r`A generator ($X'' = 0.2$), transformer (0.1) and line (0.1 pu, on 100 MVA) feed a fault at 138 kV. Find the fault current and MVA.`,
        solution: r`$Z_{th} = 0.4$: $I_f = 2.5$ pu. $I_{base} = \frac{100}{\sqrt3 \times 138} = 418$ A, so 1046 A; 250 MVA.`,
      },
      traps: [r`Multiply per-unit current by the base current of the FAULTED zone.`],
    },
    {
      name: 'Symmetrical Components',
      inShort: r`Any unbalanced set as the sum of balanced positive, negative and zero sequences.`,
      keyIdeas: [
        r`$I_0 = \frac{I_a + I_b + I_c}{3}$, $I_1 = \frac{I_a + aI_b + a^2I_c}{3}$, $I_2 = \frac{I_a + a^2I_b + aI_c}{3}$.`,
        r`$S = 3(V_0I_0^* + V_1I_1^* + V_2I_2^*)$.`,
        r`Zero sequence needs a ground path: a neutral impedance appears as $3Z_n$; Δ windings block it.`,
      ],
      example: {
        problem: r`A grounded-Y generator has $Z_0 = j0.1$ pu and is grounded through $j0.05$ pu. Find its zero-sequence impedance in the network.`,
        solution: r`$Z_0 = j0.1 + 3(j0.05) = j0.25$ pu.`,
      },
      traps: [r`The neutral impedance counts THREE times, and only in the zero sequence.`],
    },
    {
      name: 'Unsymmetrical Faults',
      inShort: r`Connect the sequence networks to match the fault, then rebuild the phase currents.`,
      keyIdeas: [
        r`SLG: networks in series, $I_f = \frac{3V_f}{Z_1 + Z_2 + Z_0 + 3Z_f}$.`,
        r`LL: positive and negative in parallel, $I_b = -j\sqrt3\frac{V_f}{Z_1 + Z_2}$.`,
        r`DLG: negative and zero in parallel, then in series with positive; ground current $3I_{a0}$.`,
      ],
      example: {
        problem: r`At a bus $Z_1 = Z_2 = j0.25$ and $Z_0 = j0.1$ pu. Compare the bolted fault currents.`,
        solution: r`3φ: 4.0 pu. SLG: $\frac{3}{0.6} = 5.0$ pu. LL: $\frac{\sqrt3}{0.5} = 3.46$ pu. DLG: $I_{a1} = \frac{1}{0.25 + 0.0714} = 3.11$, ground current $3 \times 2.22 = 6.67$ pu.`,
      },
      traps: [r`A low zero-sequence impedance makes the ground fault WORSE than the three-phase fault.`],
    },
    {
      name: 'Stability and Equal Area',
      inShort: r`Whether machines stay in step after a disturbance.`,
      keyIdeas: [
        r`Swing equation $\frac{2H}{\omega_s}\frac{d^2\delta}{dt^2} = P_m - P_e$; steady-state limit at $\delta = 90°$.`,
        r`Equal area: accelerating area must be matched by decelerating area before $\delta$ reaches $\pi - \delta_0$.`,
        r`Fault with $P_e = 0$: $\cos\delta_{cr} = (\pi - 2\delta_0)\sin\delta_0 - \cos\delta_0$, $t_{cr} = \sqrt{\frac{4H(\delta_{cr} - \delta_0)}{\omega_sP_m}}$.`,
      ],
      example: {
        problem: r`A machine delivers 1 pu with $P_{\max} = 2$ pu and $H = 5$ s (60 Hz). A three-phase fault drops its output to zero and is cleared with the same line restored. Find the critical clearing angle and time.`,
        solution: r`$\delta_0 = 30°$. $\cos\delta_{cr} = (\pi - 1.047)(0.5) - 0.866 = 0.181$, $\delta_{cr} = 79.6°$. $t_{cr} = \sqrt{\frac{20 \times 0.865}{377}} = 0.214$ s.`,
      },
      traps: [r`Angles in RADIANS inside the formulas; $\omega_s$ is electrical, $2\pi f$.`],
    },
    {
      name: 'Economic Dispatch',
      inShort: r`Sharing load among units at least total fuel cost.`,
      keyIdeas: [
        r`Without losses: all units at the same incremental cost, $b_i + 2c_iP_i = \lambda$.`,
        r`With losses: $L_i\frac{dC_i}{dP_i} = \lambda$, $L_i = \frac{1}{1 - \partial P_L/\partial P_i}$; generation covers demand plus losses.`,
        r`Units at their limits are fixed there; the rest re-share.`,
      ],
      example: {
        problem: r`Units have $dC/dP = 8 + 0.008P_1$ and $7.5 + 0.012P_2$ (₱/MWh). Share 500 MW, losses neglected.`,
        solution: r`$P_1 = \frac{\lambda - 8}{0.008}$, $P_2 = \frac{\lambda - 7.5}{0.012}$, sum 500: $\lambda = 10.2$ ₱/MWh, $P_1 = 275$ MW, $P_2 = 225$ MW.`,
      },
      traps: [r`Equal INCREMENTAL cost, not equal cost or equal loading.`],
    },
    {
      name: 'Voltage Control',
      inShort: r`Holding voltages by managing reactive power: generators, taps, capacitors, reactors, SVCs.`,
      keyIdeas: [
        r`$\Delta V \approx \frac{RP + XQ}{V}$: on lines X dominates, so Q sets the drop.`,
        r`Shunt vars for a rise $\Delta V$: $\Delta Q \approx \frac{V\Delta V}{X} = \text{MVA}_{sc}\frac{\Delta V}{V}$.`,
        r`Series capacitors cut the line's X: $X_{eff} = X(1 - k)$; 50% compensation doubles the power limit.`,
      ],
      example: {
        problem: r`A 66 kV line ($R = 2$ Ω, $X = 20$ Ω per phase) delivers 10 MW and 5 Mvar. Estimate the voltage drop.`,
        solution: r`Per phase: $P = 3.33$ MW, $Q = 1.67$ Mvar, $V = 38.1$ kV. $\Delta V \approx \frac{2(3.33) + 20(1.67)}{38.1} = 1.05$ kV, 2.8%.`,
      },
      traps: [r`Raising generator excitation changes vars and voltage, not real power.`],
    },
    {
      name: 'Corona',
      inShort: r`Air around a conductor ionizes when the surface field is too strong: loss, noise and interference.`,
      keyIdeas: [
        r`Disruptive voltage (Peek) $V_d = 21.1\,m\delta r\ln\frac{D}{r}$ kV (phase, rms, r in cm), $\delta = \frac{3.92b}{273 + t}$.`,
        r`Visual voltage is higher by $\left(1 + \frac{0.3}{\sqrt{\delta r}}\right)$; loss grows as $(V - V_d)^2$.`,
        r`Reduced by larger or bundled conductors and wider spacing; worse in rain, fog and at altitude.`,
      ],
      example: {
        problem: r`A stranded conductor ($m = 0.85$) of 1 cm radius is spaced 2 m from its neighbours, at 76 cmHg and 25 °C. Find the disruptive critical voltage.`,
        solution: r`$\delta = \frac{3.92 \times 76}{298} = 1.0$. $V_d = 21.1 \times 0.85 \times 1 \times 1 \times \ln 200 = 95.0$ kV phase, 165 kV line.`,
      },
      traps: [r`Peek's formula gives PHASE voltage; compare with line-to-neutral operating voltage.`],
    },
    {
      name: 'Sag and Tension',
      inShort: r`A conductor hangs in a near-parabola; sag trades against tension.`,
      keyIdeas: [
        r`Level span: $S = \frac{wL^2}{8T}$. Unequal supports: lowest point at $x_1 = \frac{L}{2} - \frac{Th}{wL}$.`,
        r`Ice and wind: $w_r = \sqrt{(w + w_i)^2 + w_w^2}$, with $w_i = \rho_i\pi t(d + t)$ and $w_w = p(d + 2t)$.`,
        r`Length $L + \frac{8S^2}{3L}$: a tiny change in length makes a large change in sag.`,
      ],
      example: {
        problem: r`A conductor weighing 6 N/m spans 300 m between level towers at 20 kN tension. Find the sag and the conductor length.`,
        solution: r`$S = \frac{6 \times 300^2}{8 \times 20{,}000} = 3.38$ m. Length $= 300 + \frac{8 \times 3.375^2}{3 \times 300} = 300.10$ m.`,
      },
      traps: [r`Use the full span in $\frac{wL^2}{8T}$, or the half-span in $\frac{wl^2}{2T}$.`],
    },
  ],
};
