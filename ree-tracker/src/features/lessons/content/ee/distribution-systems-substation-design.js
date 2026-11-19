// Library › Lessons › EE › Distribution Systems & Substation Design
// (2026-11-19): written for the Philippine REE board, subtopic by subtopic in
// the syllabus's order; every worked example checked by computation. Grounding
// and arrester basics are in Power System Protection; the PEC's wiring rules in
// ESAS › Electrical Standards and Practices. Philippine Distribution Code
// limits checked against published copies of the 2017 edition.
const r = String.raw;

export default {
  topic: 'Distribution Systems & Substation Design',
  subject: 'EE',
  overview: r`Distribution carries power the last few kilometres: from substations, through primary feeders (13.8 or 34.5 kV in the Philippines) and distribution transformers, to secondary services at 230 V. The design questions are economic and practical: how much load to plan for (demand, diversity and load factors), how to keep the voltage within limits along a feeder (drop, regulators, capacitors), how to size transformers so their insulation lasts, and how to lay out substations, ground them and shield them from lightning. Performance is measured by reliability indices (SAIFI, SAIDI), and the Philippine Distribution Code sets the rules for power factor, unbalance and harmonics at the connection point.`,
  sources: [
    'Electric Power Distribution System Engineering (Gönen)',
    'Distribution System Modeling and Analysis (Kersting)',
    'IEEE 80, IEEE 1366, IEEE C57.91',
    'Philippine Distribution Code, 2017 Edition (ERC)',
  ],
  subtopics: [
    {
      name: 'System Types and Voltages',
      inShort: r`Radial, loop and network systems at standard voltages; higher voltage means lower loss.`,
      keyIdeas: [
        r`Radial (cheapest, least reliable), loop (two feeds), network (most reliable, urban).`,
        r`Philippines: 230 V secondary; 13.8 kV and 34.5 kV primary; 69 kV subtransmission.`,
        r`For the same power, $P_{loss} = \frac{P^2R}{V_L^2\cos^2\theta}$: loss falls as $\frac{1}{V^2}$.`,
      ],
      example: {
        problem: r`A feeder delivers 10 MW at 0.9 pf through conductors of 0.5 Ω each. Compare its losses at 13.8 kV and at 34.5 kV.`,
        solution: r`At 13.8 kV: $\frac{(10^7)^2 \times 0.5}{13{,}800^2 \times 0.81} = 324$ kW. At 34.5 kV: 52 kW, a sixth as much.`,
      },
      traps: [r`Use LINE voltage with this three-phase form, and R of one conductor.`],
    },
    {
      name: 'Load Characteristics and Factors',
      inShort: r`Ratios that turn connected load into what equipment actually sees.`,
      keyIdeas: [
        r`Demand factor $= \frac{\text{max demand}}{\text{connected load}}$; diversity factor $= \frac{\sum \text{individual maxima}}{\text{group maximum}}$ (≥ 1).`,
        r`Load factor $= \frac{\text{average}}{\text{peak}}$; energy $= \text{LF} \times P_{\max} \times T$.`,
        r`Loss factor $\approx 0.3\text{LF} + 0.7\text{LF}^2$, between $\text{LF}^2$ and LF.`,
      ],
      example: {
        problem: r`A load runs at its 1000 kW peak for 8 h and at 400 kW for 16 h a day. Find the daily energy, load factor and loss factor.`,
        solution: r`Energy $= 8000 + 6400 = 14{,}400$ kWh; LF $= \frac{14{,}400}{24{,}000} = 0.60$. Loss factor $= \frac{8 + 16 \times 0.16}{24} = 0.44$ (the estimate gives 0.43).`,
      },
      traps: [r`Diversity factor is at least 1; demand, load and loss factors are at most 1.`],
    },
    {
      name: 'Primary and Secondary Feeders',
      inShort: r`Feeders carry load out from the substation; how the load is spread sets drop and loss.`,
      keyIdeas: [
        r`Uniformly distributed load: drop $\frac{IR}{2}$ (as if lumped at the middle), loss $\frac{I^2R}{3}$.`,
        r`Fed from both ends: $I_A = \sum I_k\frac{L - x_k}{L}$; the lowest voltage is where the currents meet.`,
        r`Secondaries: 230 V single-phase from distribution transformers; services to each customer.`,
      ],
      example: {
        problem: r`A 1 km feeder fed equally from both ends carries 100 A at 200 m, 150 A at 500 m and 80 A at 800 m. Find the current from each end and the lowest-voltage point.`,
        solution: r`$I_A = 100(0.8) + 150(0.5) + 80(0.2) = 171$ A, $I_B = 159$ A. After the first load 71 A continues from A, less than the 150 A load at 500 m: the lowest voltage is there.`,
      },
      traps: [r`Drop uses ½, loss uses ⅓: different equivalent points for the same feeder.`],
    },
    {
      name: 'Voltage Drop',
      inShort: r`$\Delta V \approx I(R\cos\theta + X\sin\theta)$ per conductor.`,
      keyIdeas: [
        r`Three phase: per-phase drop, line drop $\sqrt3$ times; single-phase two-wire: double the conductor drop.`,
        r`Reactance matters at low power factor and on overhead lines.`,
        r`Percent drop on nominal voltage; PEC limits 3% feeder or branch, 5% total.`,
      ],
      example: {
        problem: r`A 13.8 kV feeder carries 150 A at 0.85 lagging through $R = 1.2$ Ω and $X = 2.4$ Ω per conductor. Find the drop.`,
        solution: r`$\Delta V = 150(1.2 \times 0.85 + 2.4 \times 0.527) = 343$ V per phase, $\frac{343}{7967} = 4.3\%$.`,
      },
      traps: [r`Compare a per-phase drop with PHASE voltage (7967 V here), not line voltage.`],
    },
    {
      name: 'Voltage Regulation and Capacitors',
      inShort: r`Regulators and capacitors hold feeder voltage within limits and cut losses.`,
      keyIdeas: [
        r`Step regulator: ±10% in 32 steps of 0.625%; line-drop compensation $R_{set} = \frac{I_{CT}}{N_{PT}}R_{line}$.`,
        r`Shunt capacitor rise: $\%\Delta V = \frac{\text{kvar} \cdot X}{10\,\text{kV}^2}$; loss saving $\frac{R(2QQ_C - Q_C^2)}{V^2}$.`,
        r`Two-thirds rule: $\frac23$ of the vars at $\frac23$ of the length for an evenly loaded feeder.`,
      ],
      example: {
        problem: r`A 600 kvar bank is added on a 13.8 kV feeder with 4 Ω reactance back to the source. Find the voltage rise. Where should one capacitor go on a 3 km feeder with 1500 kvar spread evenly?`,
        solution: r`$\%\Delta V = \frac{600 \times 4}{10 \times 13.8^2} = 1.26\%$. Two-thirds rule: 1000 kvar at 2 km from the substation.`,
      },
      traps: [r`Fixed capacitors sized for peak can push voltage too high at light load.`],
    },
    {
      name: 'Distribution Transformers',
      inShort: r`Sized for peak and loss of life, not just nameplate kVA.`,
      keyIdeas: [
        r`Hottest spot $\theta_H = \theta_A + \Delta\theta_{TO} + \Delta\theta_H$; 110 °C design for 65 °C-rise units.`,
        r`Aging factor $F_{AA} = \exp\left(\frac{15000}{383} - \frac{15000}{\theta_H + 273}\right)$: about double for every 6–7 °C.`,
        r`Low core loss matters most: distribution transformers are energized 24 h but lightly loaded much of the time.`,
      ],
      example: {
        problem: r`A transformer's hottest spot reaches 120 °C during an emergency. How fast does it age compared with normal?`,
        solution: r`$F_{AA} = \exp\left(\frac{15000}{383} - \frac{15000}{393}\right) = 2.71$: an hour at 120 °C uses 2.7 normal hours of life.`,
      },
      traps: [r`Short overloads are fine if the average aging over the day stays at or below 1.`],
    },
    {
      name: 'Substation Types and Bus Schemes',
      inShort: r`Bus layouts trade cost against reliability and maintainability.`,
      keyIdeas: [
        r`Single bus (cheap, one fault drops all), sectionalized, main-and-transfer, ring, breaker-and-a-half, double bus double breaker.`,
        r`Breakers per circuit: 1 (single bus, ring), 1.5 (breaker-and-a-half), 2 (double bus double breaker).`,
        r`Types by function: generating, transmission, distribution, switching; outdoor, indoor, GIS.`,
      ],
      example: {
        problem: r`A substation has 6 circuits. How many breakers does each scheme need: ring, breaker-and-a-half, double bus double breaker?`,
        solution: r`Ring: 6. Breaker-and-a-half: 9. Double bus double breaker: 12.`,
      },
      traps: [r`A ring bus opened for maintenance is a weaker radial system until it is closed again.`],
    },
    {
      name: 'Substation Equipment',
      inShort: r`Transformers, breakers, switches, instrument transformers, arresters, capacitors and reactors.`,
      keyIdeas: [
        r`Power transformers carry ONAN/ONAF ratings (e.g. 30/40/50 MVA with fans); breakers rated by interrupting kA.`,
        r`Current-limiting reactors: $X_{r,pu} = \frac{1}{\text{MVA}_{new,pu}} - \frac{1}{\text{MVA}_{old,pu}}$.`,
        r`Disconnect switches isolate only with no current; breakers interrupt load and faults.`,
      ],
      example: {
        problem: r`A 13.8 kV bus has 1000 MVA fault level but its breakers handle only 500 MVA. Find the series reactor (100 MVA base).`,
        solution: r`$X_r = \frac{100}{500} - \frac{100}{1000} = 0.10$ pu; $Z_{base} = \frac{13.8^2}{100} = 1.90$ Ω, so 0.19 Ω.`,
      },
      traps: [r`Never open a disconnect under load: it cannot interrupt the arc.`],
    },
    {
      name: 'Substation Grounding',
      inShort: r`Keep step and touch voltages safe during ground faults.`,
      keyIdeas: [
        r`Soil resistivity by Wenner: $\rho = 2\pi aR$.`,
        r`$\text{GPR} = I_GR_g$ with $I_G = S_fD_f(3I_0)$; if GPR < tolerable touch voltage, the design is safe.`,
        r`Otherwise check mesh voltage $E_m = \frac{\rho K_mK_iI_G}{L_M}$ against touch, and step voltage against step.`,
      ],
      example: {
        problem: r`A Wenner test at 5 m spacing reads 3.82 Ω. A ground fault of 5000 A has split factor 0.6 and decrement 1.1, and the grid is 0.5 Ω. Find the resistivity and GPR.`,
        solution: r`$\rho = 2\pi \times 5 \times 3.82 = 120$ Ω·m. $I_G = 0.6 \times 1.1 \times 5000 = 3300$ A; GPR $= 1650$ V, above a 681 V touch limit, so check mesh voltages.`,
      },
      traps: [r`Shield wires carry part of the fault current home: the split factor reduces the grid current.`],
    },
    {
      name: 'Lightning Protection',
      inShort: r`Shield the station with masts and wires; clamp what gets through with arresters.`,
      keyIdeas: [
        r`Rolling sphere: protected distance $\sqrt{H(2R - H)} - \sqrt{y(2R - y)}$.`,
        r`Ground flash density $N_g = 0.04T_d^{1.25}$; strikes to a line $\frac{N_g(b + 28h^{0.6})}{10}$ per 100 km per year.`,
        r`Arresters at transformer terminals and line entrances; protective margin at least 20%.`,
      ],
      example: {
        problem: r`A 30 m mast is designed with a 45 m rolling sphere. How far out is 10 m-high equipment protected? Then: strikes per 100 km per year on a line 20 m high and 10 m wide, with 80 thunderstorm days.`,
        solution: r`$d = \sqrt{30 \times 60} - \sqrt{10 \times 80} = 42.4 - 28.3 = 14.1$ m. $N_g = 0.04 \times 80^{1.25} = 9.6$; $N = \frac{9.6(10 + 28 \times 20^{0.6})}{10} = 171$.`,
      },
      traps: [r`Masts taller than the sphere radius do not protect more ground: cap H at R.`],
    },
    {
      name: 'Reliability Indices',
      inShort: r`How often and how long customers lose power (IEEE 1366).`,
      keyIdeas: [
        r`SAIFI $= \frac{\sum N_i}{N_T}$; SAIDI $= \frac{\sum r_iN_i}{N_T}$; CAIDI $= \frac{\text{SAIDI}}{\text{SAIFI}}$; ASAI $= 1 - \frac{\text{SAIDI}}{525{,}600}$.`,
        r`Sustained interruptions (over 5 min) only; momentary in MAIFI.`,
        r`Availability $\frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}}$; series multiply availabilities, parallel multiply unavailabilities.`,
      ],
      example: {
        problem: r`A utility with 10,000 customers had three outages: 2000 customers for 90 min, 500 for 30 min, 1500 for 240 min. Find SAIFI, SAIDI, CAIDI and ASAI.`,
        solution: r`SAIFI $= \frac{4000}{10{,}000} = 0.40$. SAIDI $= \frac{180{,}000 + 15{,}000 + 360{,}000}{10{,}000} = 55.5$ min. CAIDI $= 139$ min. ASAI $= 0.99989$.`,
      },
      traps: [r`CAIDI can get worse while service gets better, if short outages are eliminated first.`],
    },
    {
      name: 'Philippine Distribution Code',
      inShort: r`The ERC's rules for distribution utilities and the users connected to them.`,
      keyIdeas: [
        r`Users keep power factor at least 0.85 lagging at the connection point ($Q \le 0.62P$).`,
        r`Voltage unbalance at most 2.5% in normal operation; voltage THD and current TDD at most 5%.`,
        r`Service voltage is held within about ±10% of nominal (DU service rules); the code also sets reliability and connection procedures.`,
      ],
      example: {
        problem: r`A 500 kW plant runs at 0.80 pf. How many kvar of capacitors bring it to the PDC minimum? Its line voltages read 400, 392 and 386 V: is the unbalance within the limit?`,
        solution: r`$Q = 375$ kvar now; at 0.85 the limit is 310 kvar, so at least 65 kvar. Average 392.7 V, largest deviation 7.3 V: 1.87%, within 2.5%.`,
      },
      traps: [r`TDD is relative to maximum demand current, not the present current: light loads aren't penalized.`],
    },
  ],
};
