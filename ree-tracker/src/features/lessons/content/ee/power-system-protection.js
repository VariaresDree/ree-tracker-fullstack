// Library › Lessons › EE › Power System Protection (2026-11-19): written for
// the Philippine REE board, subtopic by subtopic in the syllabus's order;
// every worked example checked by computation. Fault calculations are in
// Power System Analysis; PEC overcurrent rules in ESAS › Electrical Standards
// and Practices. Curve constants: IEC 60255-151 and IEEE C37.112; step and
// touch: IEEE 80; arc flash: IEEE 1584 (Lee method).
const r = String.raw;

export default {
  topic: 'Power System Protection',
  subject: 'EE',
  overview: r`Protection detects faults and abnormal conditions and removes only the faulted part, fast. Instrument transformers bring currents and voltages down to relay levels; relays decide; breakers interrupt. Each zone (generator, transformer, bus, line, motor) has its main protection, usually differential or distance, with overcurrent as backup, coordinated so the nearest device always acts first. A good scheme is reliable (dependable and secure), selective, fast and simple. The topic ends with breaker ratings and the system around it: grounding, lightning protection, and the arc-flash hazard to people. Fault currents come from Power System Analysis; here you set the devices that act on them.`,
  sources: [
    'Protective Relaying: Principles and Applications (Blackburn and Domin)',
    'Power System Relaying (Horowitz and Phadke)',
    'IEEE C37.112 (inverse-time relays), IEEE 80 (substation grounding), IEEE 1584 (arc flash)',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Protection Fundamentals',
      inShort: r`Find the fault, isolate only the faulted part, quickly.`,
      keyIdeas: [
        r`Qualities: reliability (dependability and security), selectivity, speed, simplicity, economy.`,
        r`Zones overlap at breakers so nothing is unprotected; primary protection is backed up locally or remotely.`,
        r`$t_{clear} = t_{relay} + t_{breaker}$; backup waits a coordination margin longer.`,
      ],
      example: {
        problem: r`A relay operates in 0.25 s and its breaker interrupts in 5 cycles at 60 Hz. How long does the fault last?`,
        solution: r`$5/60 = 0.083$ s, so $0.25 + 0.083 = 0.333$ s.`,
      },
      traps: [r`Speed and security pull against each other: a relay that trips on everything is fast but not secure.`],
    },
    {
      name: 'Instrument Transformers for Relaying',
      inShort: r`CTs and VTs scale primary quantities to relay levels, and must not saturate on faults.`,
      keyIdeas: [
        r`$I_s = \frac{I_p}{N_{CT}}$; burden $I^2Z_b$. Never open-circuit a loaded CT secondary.`,
        r`Saturation check: $\frac{I_f}{N}(R_{ct} + 2R_L + R_b) < V_k$.`,
        r`C-class: CXXX delivers XXX volts at 100 A secondary with at most 10% error; burden $\le \frac{V_C}{100}$.`,
      ],
      example: {
        problem: r`A 600:5 CT ($R_{ct} = 0.3$ Ω) feeds a 0.1 Ω relay through leads of 0.2 Ω each way. Is a C200 CT enough for a 20 kA fault?`,
        solution: r`Secondary current $= \frac{20{,}000}{120} = 167$ A. $V = 167(0.3 + 0.4 + 0.1) = 133$ V, below 200 V: adequate (without dc offset).`,
      },
      traps: [r`Count the lead resistance twice for phase faults.`],
    },
    {
      name: 'Overcurrent Relays',
      inShort: r`Trip when current exceeds a pickup, faster the larger the current.`,
      keyIdeas: [
        r`$M = \frac{I_f}{I_{pickup}}$; IEC: $t = \text{TMS}\frac{k}{M^\alpha - 1}$ (SI 0.14, 0.02; VI 13.5, 1; EI 80, 2).`,
        r`IEEE: $t = \text{TD}\left(\frac{A}{M^p - 1} + B\right)$.`,
        r`Pickup above 1.25–1.5 × max load and below min fault ÷ 1.5–2; instantaneous elements set above the far-end fault.`,
      ],
      example: {
        problem: r`A 400:5 CT, 125% plug and standard-inverse relay at TMS 0.2 sees a 5000 A fault. Find its pickup and operating time.`,
        solution: r`Pickup $= 1.25 \times 400 = 500$ A, so $M = 10$. $t = 0.2 \times \frac{0.14}{10^{0.02} - 1} = 0.594$ s.`,
      },
      traps: [r`$M$ uses the PICKUP current, not the CT rating.`],
    },
    {
      name: 'Relay Coordination',
      inShort: r`Each upstream relay waits a margin longer than the one below it.`,
      keyIdeas: [
        r`$t_{up} \ge t_{down} + \text{CTI}$, CTI ≈ 0.2–0.4 s (breaker time, overtravel, safety).`,
        r`Check at the maximum fault current seen by both relays.`,
        r`$\text{TMS} = \frac{t_{req}}{t(M)|_{\text{TMS}=1}}$.`,
      ],
      example: {
        problem: r`Downstream: 400 A pickup, SI, TMS 0.1. Upstream: 600 A pickup, SI. For a 4000 A fault and a 0.3 s CTI, find the upstream TMS.`,
        solution: r`Downstream: $M = 10$, $t = 0.297$ s. Upstream needs 0.597 s at $M = 6.67$, where TMS 1 gives 3.62 s: TMS $= \frac{0.597}{3.62} = 0.165$.`,
      },
      traps: [r`Round the TMS UP to an available step, then recheck the margin.`],
    },
    {
      name: 'Directional Relays',
      inShort: r`Trip only for fault current flowing in one direction, judged against a polarizing voltage.`,
      keyIdeas: [
        r`Torque $\propto VI\cos(\theta - \tau)$; operates within ±90° of the maximum torque angle.`,
        r`Quadrature (90°) connection: phase-A current with $V_{bc}$, which survives a close-in phase-A fault.`,
        r`Needed on ring mains and parallel lines, where fault current can come from either side.`,
      ],
      example: {
        problem: r`A directional element has a maximum torque angle of 45°. Does it operate for current 120° from its polarizing voltage?`,
        solution: r`$120° - 45° = 75° < 90°$: yes, the torque is positive ($\cos 75° = 0.26$).`,
      },
      traps: [r`A close-in three-phase fault collapses all voltages: directional elements need voltage memory.`],
    },
    {
      name: 'Distance Relays',
      inShort: r`Measure the impedance to the fault, which is proportional to distance.`,
      keyIdeas: [
        r`$Z_{sec} = Z_{pri}\frac{N_{CT}}{N_{VT}}$. Zones: Z1 ≈ 80% instantly, Z2 ≈ 120–150% at about 0.3 s, Z3 backup at about 1 s.`,
        r`Mho: a circle through the origin, reach $Z_{set}\cos(\theta - \phi)$.`,
        r`Ground elements add $k_0 = \frac{Z_0 - Z_1}{3Z_1}$ of the residual current.`,
      ],
      example: {
        problem: r`A 10 Ω (primary) line has 1200:5 CTs and 138 kV/115 V VTs. Find the secondary line impedance and Zone 1 and Zone 2 reaches (80%, 120%).`,
        solution: r`$Z_{sec} = 10 \times \frac{240}{1200} = 2.0$ Ω. Zone 1 = 1.6 Ω; Zone 2 = 2.4 Ω secondary.`,
      },
      traps: [r`Zone 1 must underreach the far end; Zone 2 covers the rest with a time delay.`],
    },
    {
      name: 'Differential Relays',
      inShort: r`Compare what enters and leaves a zone: any difference is a fault inside.`,
      keyIdeas: [
        r`Percentage differential: operate when $|I_1 - I_2| > k\frac{|I_1| + |I_2|}{2}$.`,
        r`The slope tolerates CT mismatch and error on heavy through faults.`,
        r`Absolutely selective: no time grading needed.`,
      ],
      example: {
        problem: r`With a 25% slope, a through fault gives 40 A and 36.8 A at the two CTs (8% error). An internal fault gives 30 A and 0 A. Which operate?`,
        solution: r`Through: $3.2 < 0.25 \times 38.4 = 9.6$, restrains. Internal: $30 > 0.25 \times 15 = 3.75$, trips.`,
      },
      traps: [r`Plain (unbiased) differential can trip on CT error during a large external fault.`],
    },
    {
      name: 'Transformer Protection',
      inShort: r`Differential protection that copes with the ratio, the phase shift and inrush.`,
      keyIdeas: [
        r`CTs connected opposite to the windings (delta on the wye side) correct the 30° shift and trap zero sequence: $\frac{\sqrt3I_Y}{N_Y} = \frac{I_\Delta}{N_\Delta}$.`,
        r`Inrush blocked by second-harmonic restraint (above 15–20%). V/Hz relays guard against over-fluxing.`,
        r`Through-fault current $\frac{I_{rated}}{Z_{pu}}$ sets the overcurrent backup. Buchholz relays catch faults inside oil.`,
      ],
      example: {
        problem: r`A 30 MVA, 69/13.8 kV, 8% transformer: find the rated low-side current, the largest through-fault current, and V/Hz at 13.8 kV and 57 Hz.`,
        solution: r`$I = \frac{30 \times 10^6}{\sqrt3 \times 13{,}800} = 1255$ A. $I_{sc} = \frac{1255}{0.08} = 15.7$ kA. V/Hz $= \frac{1}{57/60} = 1.05$ pu.`,
      },
      traps: [r`Inrush looks like an internal fault: it flows in one winding only.`],
    },
    {
      name: 'Generator Protection',
      inShort: r`Expensive machines with many failure modes: stator, rotor, unbalance, motoring, loss of field.`,
      keyIdeas: [
        r`Stator: differential; ground faults via a high-resistance neutral, $R_n = \frac{1}{3\omega C_0}$, covering $1 - \frac{V_{set}}{V_{ph}}$ of the winding.`,
        r`Unbalance: $I_2^2t \le K$. Also reverse power, loss of excitation, over/under frequency, V/Hz.`,
        r`Neutral resistor reflected through a distribution transformer: $R_{sec} = \frac{R_n}{N^2}$.`,
      ],
      example: {
        problem: r`A generator system has 0.25 µF per phase to ground at 60 Hz, grounded through a 13.8 kV/240 V transformer. Find the neutral resistance, its secondary value, and the coverage of a 5% neutral-voltage relay.`,
        solution: r`$R_n = \frac{1}{3 \times 377 \times 0.25 \times 10^{-6}} = 3537$ Ω; secondary $\frac{3537}{57.5^2} = 1.07$ Ω. Coverage 95%.`,
      },
      traps: [r`A neutral-voltage relay cannot see faults near the neutral; 100% schemes add third-harmonic or injection.`],
    },
    {
      name: 'Motor Protection',
      inShort: r`Protect against overload, stalling, unbalance and faults without tripping on normal starts.`,
      keyIdeas: [
        r`Thermal replica: $t = \tau\ln\frac{I^2 - I_P^2}{I^2 - (kI_B)^2}$, faster when already hot.`,
        r`Locked rotor: $I^2t$ constant. Unbalance: $I_{eq} = \sqrt{I_1^2 + KI_2^2}$, $K \approx 6$.`,
        r`Short-circuit (instantaneous) set above the starting current; ground fault via zero-sequence CT.`,
      ],
      example: {
        problem: r`A motor relay has $\tau = 600$ s and allows 1.05 × rated indefinitely. How long at 1.5 × rated from cold, and from a running load of 0.9?`,
        solution: r`Cold: $600\ln\frac{2.25}{2.25 - 1.10} = 404$ s. Hot: $600\ln\frac{2.25 - 0.81}{1.148} = 136$ s.`,
      },
      traps: [r`Negative-sequence current heats the rotor about six times as much as positive sequence.`],
    },
    {
      name: 'Bus and Line Protection',
      inShort: r`Buses need fast differential protection; lines use distance, pilot schemes and reclosing.`,
      keyIdeas: [
        r`High-impedance bus differential: $V_s \ge \frac{I_{f,\max}}{N}(R_{ct} + 2R_L)$, $V_k \ge 2V_s$.`,
        r`Lines: distance with communication (permissive, blocking) or line differential for 100% instant coverage.`,
        r`Most overhead-line faults are temporary: autoreclosing restores the line after the arc deionizes.`,
      ],
      example: {
        problem: r`A bus with 2000:5 CTs ($R_{ct} = 2$ Ω, leads 1 Ω one way) sees up to 40 kA on an external fault. Find the voltage setting and the knee point needed.`,
        solution: r`$V_s = \frac{40{,}000}{400}(2 + 2) = 400$ V; $V_k \ge 800$ V.`,
      },
      traps: [r`All CTs of a high-impedance scheme must have the same ratio.`],
    },
    {
      name: 'Circuit Breaker Ratings',
      inShort: r`A breaker must interrupt the fault, close onto it, and carry it.`,
      keyIdeas: [
        r`$I_{sym} = \frac{\text{MVA}_{sc}}{\sqrt3\,\text{kV}}$; at contact parting $I_{asym} = I_{sym}\sqrt{1 + 2e^{-2t/\tau}}$, $\tau = \frac{X}{\omega R}$.`,
        r`Close-and-latch peak $2.6I_{sym}$ (60 Hz, X/R 17); 2.5 for IEC 50 Hz.`,
        r`Also rated voltage, BIL, continuous current and interrupting time.`,
      ],
      example: {
        problem: r`A 13.8 kV bus has 500 MVA fault level and X/R = 15. Find the symmetrical current, the asymmetrical RMS at 3-cycle contact parting, and the close-and-latch peak.`,
        solution: r`$I_{sym} = 20.9$ kA. $\tau = \frac{15}{377} = 0.040$ s: factor $\sqrt{1 + 2e^{-2.51}} = 1.08$, so 22.5 kA. Peak $2.6 \times 20.9 = 54.4$ kA.`,
      },
      traps: [r`High X/R keeps the dc offset longer: check the breaker's rated X/R.`],
    },
    {
      name: 'System Grounding',
      inShort: r`How the neutral is grounded sets fault currents, overvoltages, and safety.`,
      keyIdeas: [
        r`Solid, low- or high-resistance, reactance, ungrounded. Effectively grounded: $X_0/X_1 \le 3$, $R_0/X_1 \le 1$, COG $\le 80\%$.`,
        r`Rod: $R = \frac{\rho}{2\pi L}\left(\ln\frac{4L}{a} - 1\right)$; grid $\approx \frac{\rho}{4}\sqrt{\frac{\pi}{A}} + \frac{\rho}{L_T}$.`,
        r`Tolerable (50 kg): touch $(1000 + 1.5C_s\rho_s)\frac{0.116}{\sqrt{t_s}}$, step with $6C_s\rho_s$.`,
      ],
      example: {
        problem: r`Soil is 100 Ω·m. Find a 3 m rod's resistance (16 mm diameter), a 60 × 60 m grid's with 1500 m of conductor, and the tolerable touch voltage with crushed rock ($\rho_s = 3000$, $C_s = 0.7$) for 0.5 s.`,
        solution: r`Rod: $\frac{100}{6\pi}(\ln 1500 - 1) = 33.5$ Ω. Grid: $25\sqrt{\frac{\pi}{3600}} + \frac{100}{1500} = 0.81$ Ω. Touch: $(1000 + 3150)\frac{0.116}{\sqrt{0.5}} = 681$ V.`,
      },
      traps: [r`Touch voltage, not step voltage, usually governs the design.`],
    },
    {
      name: 'Lightning Protection',
      inShort: r`Shield lines and stations from strokes and clamp surges below insulation strength.`,
      keyIdeas: [
        r`Arrester rating $\ge$ COG × $V_{LL,\max}$; MCOV above the highest continuous phase voltage.`,
        r`Protective margin $\frac{\text{BIL}}{V_p} - 1 \ge 20\%$; separation adds $\frac{2Sd}{v}$ at the equipment.`,
        r`Shielding by the electrogeometric model: striking distance $10I^{0.65}$ m.`,
      ],
      example: {
        problem: r`A 69 kV effectively grounded system (72.5 kV max) protects 350 kV BIL equipment; the arrester holds 250 kV. Find the minimum arrester rating and the margin; then the extra voltage 15 m away for a 1000 kV/µs front.`,
        solution: r`Rating $\ge 0.8 \times 72.5 = 58$ kV. PM $= \frac{350}{250} - 1 = 40\%$. Separation: $\frac{2 \times 1000 \times 15}{300} = 100$ kV more at the equipment.`,
      },
      traps: [r`An arrester protects best right at the terminals: distance erodes the margin fast.`],
    },
    {
      name: 'Arc Flash',
      inShort: r`The heat released by an arcing fault, and the boundary inside which people need arc-rated gear.`,
      keyIdeas: [
        r`Lee (theoretical, conservative): $E = 2.142 \times 10^6\frac{VI_{bf}t}{D^2}$ J/cm² (kV, kA, s, mm); not for above 15 kV per IEEE 1584-2018.`,
        r`Boundary where $E = 5.0$ J/cm² (1.2 cal/cm²); 1 cal/cm² = 4.184 J/cm².`,
        r`Energy is proportional to clearing time: faster relaying (zone interlocking, maintenance mode) is the main remedy.`,
      ],
      example: {
        problem: r`A 480 V bus has 30 kA bolted fault current cleared in 0.1 s. Find the incident energy at 455 mm and the arc-flash boundary (Lee).`,
        solution: r`$E = \frac{2.142 \times 10^6 \times 0.48 \times 30 \times 0.1}{455^2} = 14.9$ J/cm² = 3.6 cal/cm². $D_B = \sqrt{\frac{3.08 \times 10^6}{5}} = 785$ mm.`,
      },
      traps: [r`Lee overstates energy at low voltage; IEEE 1584 empirical equations are the design method.`],
    },
  ],
};
