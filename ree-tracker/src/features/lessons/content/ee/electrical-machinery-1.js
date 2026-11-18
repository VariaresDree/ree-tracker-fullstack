// Library › Lessons › EE › Electrical Machinery 1 (2026-11-18): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Magnetic-circuit basics are in
// Electromagnetism; alternators and induction motors in Machinery 2.
const r = String.raw;

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
      keyIdeas: [
        r`$\mathcal{F} = NI = \Phi\mathcal{R}$, $\mathcal{R} = \frac{l}{\mu A}$; series and parallel paths combine like resistors.`,
        r`Laminated cores: iron area $= k_s \times$ gross area ($k_s \approx 0.9$–0.95). Air gaps fringe: area $\approx (a + g)(b + g)$.`,
        r`In a shell core the outer legs share the centre flux inversely as their reluctance.`,
      ],
      example: {
        problem: r`A core has a gross area of 25 cm² and a stacking factor of 0.92. What flux gives 1.0 T in the iron?`,
        solution: r`Net area $= 0.92 \times 25 = 23$ cm². $\Phi = 1.0 \times 23 \times 10^{-4} = 2.3$ mWb.`,
      },
      traps: [r`Use the net (iron) area for the iron and the gross area for the air gap.`],
    },
    {
      name: 'Transformer Principles and EMF Equation',
      inShort: r`A changing flux in a shared core induces the same volts per turn in each winding.`,
      keyIdeas: [
        r`$E = 4.44fN\Phi_m$; so $\frac{E_1}{E_2} = \frac{N_1}{N_2} = a = \frac{I_2}{I_1}$.`,
        r`Rated currents $I = \frac{S}{V}$ (single phase), $\frac{S}{\sqrt3V_L}$ (three phase).`,
        r`No-load current: a core-loss part in phase with V and a larger magnetizing part lagging 90°.`,
      ],
      example: {
        problem: r`A 10 kVA, 2400/240 V, 60 Hz transformer has 1000 primary turns. Find the peak flux, the secondary turns, and both rated currents.`,
        solution: r`$\Phi_m = \frac{2400}{4.44 \times 60 \times 1000} = 9.01$ mWb. $N_2 = 100$. $I_1 = \frac{10{,}000}{2400} = 4.17$ A, $I_2 = 41.7$ A.`,
      },
      traps: [r`Flux follows $V/f$: the same voltage at a lower frequency over-fluxes the core.`],
    },
    {
      name: 'Equivalent Circuit',
      inShort: r`The real transformer as an ideal one plus series impedance and a magnetizing branch.`,
      keyIdeas: [
        r`Referring: impedances to the primary $\times a^2$, to the secondary $\div a^2$.`,
        r`Approximate circuit: $R_{eq1} = R_1 + a^2R_2$, $X_{eq1} = X_1 + a^2X_2$, magnetizing branch at the terminals.`,
        r`Per unit: $Z_{pu} = \frac{Z_{eq}S}{V^2}$, the same from either side.`,
      ],
      example: {
        problem: r`A 50 kVA, 2400/240 V transformer has $R_1 = 0.75$ Ω, $X_1 = 1.0$ Ω, $R_2 = 0.0075$ Ω, $X_2 = 0.01$ Ω. Find $Z_{eq1}$ and its per-unit value.`,
        solution: r`$a = 10$: $R_{eq1} = 0.75 + 100 \times 0.0075 = 1.5$ Ω, $X_{eq1} = 2.0$ Ω, $|Z| = 2.5$ Ω. $Z_{base} = \frac{2400^2}{50{,}000} = 115.2$ Ω, so $Z_{pu} = 0.0217$ (2.17%).`,
      },
      traps: [r`Never add a primary and a secondary impedance without referring one of them.`],
    },
    {
      name: 'Regulation and Efficiency',
      inShort: r`How much the voltage sags at full load, and how much power is lost.`,
      keyIdeas: [
        r`$\text{VR} = \frac{V_{NL} - V_{FL}}{V_{FL}}$; approximately $r\cos\theta \pm x\sin\theta$ (+ lagging).`,
        r`$\eta = \frac{xS\cos\theta}{xS\cos\theta + P_c + x^2P_{cu}}$; maximum where copper loss = core loss, at $x = \sqrt{P_c/P_{cu}}$.`,
        r`All-day efficiency: energies over 24 h, with core loss present all day.`,
      ],
      example: {
        problem: r`The 50 kVA transformer above ($R_{eq} = 1.5$ Ω, $X_{eq} = 2$ Ω on 2400 V) has 180 W core loss. Find its regulation and efficiency at full load, 0.8 lagging, and the load for maximum efficiency.`,
        solution: r`$I = 20.8$ A. VR $\approx \frac{20.8(1.5 \times 0.8 + 2 \times 0.6)}{2400} = 2.08\%$ (exact phasor: 2.09%). Copper loss $= 20.8^2 \times 1.5 = 651$ W; $\eta = \frac{40{,}000}{40{,}831} = 97.96\%$. Maximum at $x = \sqrt{\frac{180}{651}} = 0.53$ of full load.`,
      },
      traps: [r`Divide regulation by the FULL-load voltage. A leading load can make it negative.`],
    },
    {
      name: 'Open and Short Circuit Tests',
      inShort: r`Two cheap tests give the whole equivalent circuit without loading the transformer.`,
      keyIdeas: [
        r`Open circuit (low side, rated voltage): $P_{oc}$ = core loss; $R_c = \frac{V^2}{P_{oc}}$, $X_m = \frac{V}{I_m}$, $I_m = \sqrt{I_{oc}^2 - (P_{oc}/V)^2}$.`,
        r`Short circuit (high side, rated current): $P_{sc}$ = full-load copper loss; $Z_{eq} = \frac{V_{sc}}{I_{sc}}$, $R_{eq} = \frac{P_{sc}}{I_{sc}^2}$.`,
        r`$\frac{V_{sc}}{V_{rated}}$ is the per-unit impedance.`,
      ],
      example: {
        problem: r`Open circuit at 240 V: 2.0 A, 180 W. Short circuit at 20.8 A: 52.1 V, 651 W. Find $R_c$, $X_m$ (low side) and $R_{eq}$, $X_{eq}$ (high side).`,
        solution: r`$I_c = \frac{180}{240} = 0.75$ A, $I_m = \sqrt{4 - 0.56} = 1.85$ A; $R_c = 320$ Ω, $X_m = 129$ Ω. $Z_{eq} = \frac{52.1}{20.8} = 2.5$ Ω, $R_{eq} = \frac{651}{20.8^2} = 1.5$ Ω, $X_{eq} = 2.0$ Ω.`,
      },
      traps: [r`Each test's results are referred to the side the meters were on.`],
    },
    {
      name: 'Autotransformers',
      inShort: r`One winding shared by both circuits: part of the power is conducted straight through.`,
      keyIdeas: [
        r`Transformed power $= S(1 - \frac{V_L}{V_H})$; conducted $= S\frac{V_L}{V_H}$.`,
        r`A two-winding unit reconnected: $S_{auto} = S_w\left(1 + \frac{V_c}{V_s}\right)$.`,
        r`Copper needed $= (1 - K)$ of a two-winding unit, $K = \frac{V_L}{V_H}$; but no isolation between circuits.`,
      ],
      example: {
        problem: r`A 10 kVA, 2400/240 V transformer is reconnected as a 2640/2400 V autotransformer. Find its rating and the copper saved compared with a two-winding unit of that job.`,
        solution: r`$S = 10\left(1 + \frac{2400}{240}\right) = 110$ kVA. $K = \frac{2400}{2640} = 0.909$: about 91% of the copper is saved.`,
      },
      traps: [r`The series winding's rated current, not the common winding's, usually sets the rating.`],
    },
    {
      name: 'Three-Phase Connections',
      inShort: r`Three single-phase units (or one three-phase unit) in Y or Δ on each side.`,
      keyIdeas: [
        r`Line-voltage ratio: Y-Y and Δ-Δ $= a$; Δ-Y $= \frac{a}{\sqrt3}$ (step-up by $\sqrt3$); Y-Δ $= \sqrt3a$.`,
        r`Δ-Y and Y-Δ shift the phase by 30°. Y-Y needs a grounded neutral against third harmonics.`,
        r`Open delta (V-V): $\sqrt3S_{unit}$, 57.7% of the closed delta.`,
      ],
      example: {
        problem: r`Three 50 kVA, 7200/240 V units are connected Δ-Y on a 7200 V line. Find the secondary line voltage, and the capacity if one unit is removed (open delta, Δ-Δ originally).`,
        solution: r`Δ-Y: $\sqrt3 \times 240 = 416$ V. Open delta: $\sqrt3 \times 50 = 86.6$ kVA, versus 150 kVA closed.`,
      },
      traps: [r`Open delta is 57.7% of the THREE-unit capacity, or 86.6% of the TWO remaining units.`],
    },
    {
      name: 'Parallel Operation',
      inShort: r`Transformers in parallel must match in ratio, polarity, phase shift and per-unit impedance.`,
      keyIdeas: [
        r`Equal ratios: they share like a current divider, $S_A = S_L\frac{Z_B}{Z_A + Z_B}$.`,
        r`On their own ratings, load divides as $\frac{S_{rated}}{Z_{pu}}$: equal $Z_{pu}$ gives sharing in proportion to rating.`,
        r`Unequal ratios circulate $I_c = \frac{E_A - E_B}{Z_A + Z_B}$ even at no load.`,
      ],
      example: {
        problem: r`A 100 kVA unit with $Z = 5\%$ and a 200 kVA unit with $Z = 4\%$ (same X/R) share a load. What is the largest load before one is overloaded?`,
        solution: r`Shares go as $\frac{100}{0.05} = 2000$ and $\frac{200}{0.04} = 5000$. The 200 kVA unit takes $\frac{5}{7}$; it is full at $200 \times \frac{7}{5} = 280$ kVA (the 100 kVA unit then carries 80 kVA).`,
      },
      traps: [r`The unit with the LOWER per-unit impedance takes more than its share.`],
    },
    {
      name: 'DC Generator Principles',
      inShort: r`Conductors cutting flux generate $E = \frac{P\Phi ZN}{60a}$, rectified by the commutator.`,
      keyIdeas: [
        r`Lap winding $a = P$; wave $a = 2$. $E \propto N\Phi$.`,
        r`Shunt: $I_a = I_L + I_f$; series: $I_a = I_L$; compound adds a series field (long or short shunt).`,
        r`$V_t = E - I_aR_a$ (minus series-field and brush drops where given).`,
      ],
      example: {
        problem: r`A 4-pole, lap-wound generator has 500 conductors and 20 mWb per pole at 1200 rpm. Find E.`,
        solution: r`$a = 4$: $E = \frac{4 \times 0.02 \times 500 \times 1200}{60 \times 4} = 200$ V.`,
      },
      traps: [r`Lap or wave changes $a$: a wave winding of the same machine gives twice the voltage here.`],
    },
    {
      name: 'DC Generator Characteristics',
      inShort: r`How each type of generator's voltage holds up as load is added.`,
      keyIdeas: [
        r`Open-circuit (magnetization) curve; a shunt generator builds up only below the critical field resistance (the OCC's initial slope) and with residual flux.`,
        r`Shunt: voltage droops with load. Series: rises with load. Compound: flat (or rising when over-compounded).`,
        r`$\text{VR} = \frac{V_{NL} - V_{FL}}{V_{FL}}$.`,
      ],
      example: {
        problem: r`A 230 V shunt generator delivers 100 A. Its field is 115 Ω and its armature 0.05 Ω. Find the armature current and the generated EMF.`,
        solution: r`$I_f = \frac{230}{115} = 2$ A, $I_a = 102$ A. $E = 230 + 102 \times 0.05 = 235.1$ V.`,
      },
      traps: [r`The armature carries the field current too: $I_a$ is more than the load current.`],
    },
    {
      name: 'Armature Reaction and Commutation',
      inShort: r`The armature's own mmf distorts and weakens the field; reversing coil current causes sparking.`,
      keyIdeas: [
        r`Per pole: demagnetizing $AT_d = \frac{ZI\beta}{360}$, cross-magnetizing $ZI\left(\frac{1}{2P} - \frac{\beta}{360}\right)$, $I = I_a/a$, $\beta$ in mechanical degrees.`,
        r`Reactance voltage $L\frac{2I}{T_c}$ opposes reversal; interpoles and compensating windings counter it.`,
        r`Brushes are shifted forward (generator) or backward (motor) to the new neutral plane.`,
      ],
      example: {
        problem: r`A 4-pole, lap-wound generator with 480 conductors carries 100 A, and its brushes are shifted 8 mechanical degrees. Find the ampere-turns per pole.`,
        solution: r`$I = \frac{100}{4} = 25$ A. $AT_d = \frac{480 \times 25 \times 8}{360} = 267$ At; $AT_c = 480 \times 25\left(\frac{1}{8} - \frac{8}{360}\right) = 1233$ At.`,
      },
      traps: [r`Convert an electrical brush shift to mechanical degrees: divide by $P/2$.`],
    },
    {
      name: 'DC Motor Torque and Speed',
      inShort: r`Back EMF sets the speed; armature current sets the torque.`,
      keyIdeas: [
        r`$E_b = V - I_aR_a$, $N \propto \frac{E_b}{\Phi}$; $T = K\Phi I_a = \frac{E_bI_a}{\omega}$.`,
        r`Shunt: nearly constant speed. Series: $T \propto I^2$, speed falls steeply with load, never run unloaded.`,
        r`Developed power $E_bI_a$, greatest (in theory) at $E_b = \frac{V}{2}$.`,
      ],
      example: {
        problem: r`A 220 V shunt motor ($R_a = 0.2$ Ω) runs at 1200 rpm taking 50 A. Find its torque, and its speed at 80 A with the same flux.`,
        solution: r`$E_b = 220 - 50 \times 0.2 = 210$ V; $T = \frac{210 \times 50}{125.7} = 83.6$ N·m. At 80 A: $E_b = 204$ V, $N = 1200 \times \frac{204}{210} = 1166$ rpm.`,
      },
      traps: [r`Weakening the field RAISES the speed; an open field can make a shunt motor race.`],
    },
    {
      name: 'DC Motor Starting and Control',
      inShort: r`At standstill there is no back EMF, so starting current must be limited.`,
      keyIdeas: [
        r`$R_{st} = \frac{V}{I_{st}} - R_a$, with $I_{st}$ about 1.5–2 times rated.`,
        r`Starter steps: $R_{k+1} = R_k\frac{I_2}{I_1}$, sections $n = \frac{\ln(R_1/R_a)}{\ln(I_1/I_2)}$.`,
        r`Speed control: armature resistance or voltage (below base speed), field weakening (above it), Ward-Leonard for wide range.`,
      ],
      example: {
        problem: r`A 220 V motor with $R_a = 0.4$ Ω is started between 60 A and 40 A. Find the starting resistance and the number of starter sections.`,
        solution: r`$R_1 = \frac{220}{60} = 3.67$ Ω, so $R_{st} = 3.27$ Ω. $n = \frac{\ln(3.67/0.4)}{\ln 1.5} = 5.46$, so 6 sections.`,
      },
      traps: [r`Round the number of sections UP: five would leave the last step too large.`],
    },
    {
      name: 'Losses and Efficiency',
      inShort: r`Copper losses vary with load; core, friction and field losses stay about constant.`,
      keyIdeas: [
        r`$\eta = \frac{\text{output}}{\text{output} + \text{losses}}$; maximum where $I_a^2R_a$ = constant losses.`,
        r`Swinburne's test: constant losses $= VI_0 - I_{a0}^2R_a$ from a no-load run.`,
        r`Stray (load) losses are often taken as 1% of output where given.`,
      ],
      example: {
        problem: r`A 230 V shunt motor ($R_a = 0.2$ Ω, field 1 A) takes 4 A at no load. Find its constant losses, its efficiency taking 51 A, and the armature current for maximum efficiency.`,
        solution: r`$I_{a0} = 3$ A: $P_{const} = 920 - 1.8 = 918$ W. At $I_a = 50$ A: $\eta = \frac{11{,}730 - 918 - 500}{11{,}730} = 87.9\%$. Maximum at $I_a = \sqrt{\frac{918}{0.2}} = 67.8$ A.`,
      },
      traps: [r`The input current includes the field current; only the armature part makes copper loss in $R_a$.`],
    },
  ],
};
