// Library › Lessons › EE › Electrical Apparatus & Devices
// (2026-11-19; every subtopic in the module format 2026-11-24, with figures,
// examples a step at a time and checks; every number re-worked by
// apparatusLesson.test.js. Coverage and problem styles cross-checked against a
// review center's apparatus-and-devices handout; the text, problems and figures
// are this app's own): written for the Philippine REE board, subtopic by
// subtopic in the syllabus's order. Breaker interrupting ratings, CT burden and
// arrester ratings are in Power System Protection; starting methods in
// Machinery 2; transformers in Machinery 1; lighting design in System &
// Illumination.
import { colourOf } from '../../figures/figureMath';

const r = String.raw;

// A 20 kA (rms) fault at 60 Hz, in kA against ms: the prospective current, and
// a current-limiting fuse that melts at 2 ms and has cleared by 5 ms.
const PEAK = 20 * Math.SQRT2;
const prospective = (t) => PEAK * Math.sin(2 * Math.PI * 0.06 * t);
const CUT = prospective(2);
const limited = (t) => (t <= 2 ? prospective(t) : t <= 5 ? (CUT * (5 - t)) / 3 : 0);

export default {
  topic: 'Electrical Apparatus & Devices',
  subject: 'EE',
  overview: r`This topic is about the hardware that every installation is built from: the devices that protect (fuses, breakers, arresters), control (relays, contactors, starters), measure (instrument transformers), compensate (capacitors, reactors), distribute (switchgear, panelboards, cables) and store energy (batteries, UPS), plus lamps and luminaires. For each, know what it does, how it is rated, and the one or two calculations that size or check it. Most board questions ask you to pick the right rating, check a limit, or explain why a device behaves as it does.`,
  sources: [
    'Electrical Equipment Handbook (Gill) and manufacturers\' application guides',
    'IEC 60898 (MCBs), IEC 60947 (switchgear and controlgear), IEC 60364 (cable sizing)',
    'Philippine Electrical Code 2017, Part 1',
    'PRC Table of Specifications, REE: Electrical Engineering',
  ],
  subtopics: [
    {
      name: 'Fuses',
      inShort: r`A calibrated link that melts on overcurrent; the simplest and fastest protection.`,
      body: [
        r`A fuse is a short element of silver or copper, usually inside a sand-filled body. On normal current it stays below its melting point; on overload or fault it heats, melts, and the arc that follows is stretched and cooled by the sand until the current stops. A fuse both **detects** and **interrupts**: nothing else is needed.`,
        r`Its clearing happens in two stages: the **pre-arcing (melting) time**, from the start of the fault until the element melts, and the **arcing time**, until the arc is out. Their sum is the **total operating (clearing) time**. On a large fault a **current-limiting** fuse melts so early that the current never reaches the peak it would have had:`,
        {
          type: 'plot',
          alt: 'A 20 kA fault current against time over half a cycle: the prospective current, dashed, rises to its 28.3 kA peak at about 4.2 ms; the current through a current-limiting fuse follows it only until the element melts at 2 ms, at 19.4 kA, then falls to zero by 5 ms.',
          caption: 'The current through a current-limiting fuse (solid) stops rising when it melts at 2 ms and is gone by 5 ms, long before the prospective current (dashed) peaks.',
          x: [0, 8.3],
          y: [0, 32],
          xLabel: 't (ms)',
          yLabel: 'i (kA)',
          series: [
            { f: prospective, label: 'prospective', dashed: true, colour: colourOf(1) },
            { f: limited, label: 'through the fuse', area: true, colour: colourOf(0) },
          ],
          legend: false,
          marks: [{ x: 2, label: 'melts' }],
        },
        r`For large currents the melting is adiabatic (no time to lose heat), so it follows a fixed $I^2t$: $t = \frac{K}{I^2}$. Two fuses in series are **selective** when the upstream one's melting $I^2t$ exceeds the downstream one's total clearing $I^2t$; in practice a current ratio of about 2:1 between their ratings.`,
      ],
      keyIdeas: [
        r`Total clearing time = pre-arcing (melting) time + arcing time.`,
        r`For high currents melting follows $I^2t = K$: $t = \frac{K}{I^2}$.`,
        r`Current-limiting fuses clear before the first peak, cutting let-through energy.`,
        r`Selective if the upstream fuse's melting $I^2t$ exceeds the downstream fuse's clearing $I^2t$ (about 2:1 in amps).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Melting time and selectivity',
          problem: r`A fuse melts at 50 000 A²s. How long does it take at 1 kA and at 2 kA? Will an upstream fuse with 14 000 A²s melting stay intact while a downstream one clears with 5800 A²s?`,
          steps: [
            r`$t = \frac{50\,000}{1000^2} = 0.05$ s; at 2 kA, $\frac{50\,000}{2000^2} = 0.0125$ s.`,
            r`$14\,000 > 5800$: the upstream fuse does not melt.`,
          ],
          answer: r`0.05 s and 0.0125 s; yes, they are selective.`,
        },
        {
          level: 'board',
          title: 'The cut-off current',
          problem: r`A 60 Hz circuit has a prospective fault current of 20 kA rms, starting at a voltage zero. A fuse melts in 2 ms and arcs for 3 ms. Find the prospective peak, the cut-off current and the total clearing time. Does it limit the current?`,
          steps: [
            r`Prospective peak $= 20\sqrt2 = 28.3$ kA, reached a quarter cycle in, at 4.17 ms.`,
            r`At 2 ms: $28.3\sin(2\pi \times 60 \times 0.002) = 19.4$ kA, the cut-off.`,
            r`Total clearing time $= 2 + 3 = 5$ ms. It melts before the peak, so it limits the current.`,
          ],
          answer: r`28.3 kA; 19.4 kA; 5 ms; yes.`,
        },
      ],
      traps: [
        r`Doubling the current QUARTERS the melting time in the adiabatic region.`,
        r`Pre-arcing time is to melting only; the arc must still be put out.`,
      ],
      check: [
        { q: r`What is the time from the start of a fault to the melting of the element called?`, a: r`The pre-arcing (melting) time.` },
        { q: r`Why does a current-limiting fuse reduce the damage of a fault?`, a: r`It clears before the first peak, so the let-through current and $I^2t$ are far below the prospective values.` },
      ],
    },
    {
      name: 'Circuit Breakers',
      inShort: r`Resettable switches that trip on overload (thermal) and on short circuit (magnetic).`,
      body: [
        r`A circuit breaker opens and closes a circuit under every condition: no load, full load and fault. It is operated by hand or remotely in normal service and trips by itself on a fault. When its contacts part, an arc forms; the breaker's job is to put it out at a current zero and keep it out. Breakers are named for how they do that:`,
        r`| Type | Arc quenched in | Use |
|---|---|---|
| Miniature (MCB), moulded-case (MCCB) | air, with arc chutes | low voltage |
| Air circuit breaker (ACB) | air, arc chutes | LV mains and large feeders |
| Oil (bulk or minimum oil) | oil, which also cools | older MV and HV |
| SF₆ | sulfur hexafluoride gas | HV and EHV |
| Vacuum | vacuum bottle | MV, 3.3 to 36 kV |`,
        r`MCBs come in three trip curves by their instantaneous (magnetic) range: **B** 3 to 5 $I_n$, **C** 5 to 10 $I_n$, **D** 10 to 20 $I_n$. Ratings to know are rated current, voltage, **interrupting (breaking) capacity** in kA and frame size.`,
        r`After the arc goes out at current zero, the system voltage tries to reappear across the contacts. The transient that appears first is the **restriking voltage**; the power-frequency voltage that remains is the **recovery voltage**. The circuit's inductance and stray capacitance make the restriking voltage oscillate at $f_n = \frac{1}{2\pi\sqrt{LC}}$, up to about twice the peak:`,
        {
          type: 'plot',
          alt: 'The restriking voltage across a breaker after it interrupts an 11 kV fault, against time in microseconds: a one-minus-cosine wave rising from zero to 18 kV, twice the 9 kV phase peak, in 19.9 microseconds.',
          caption: 'Restriking voltage on an 11 kV system (L = 2 mH, C = 0.02 µF): twice the 8.98 kV peak, reached in 19.9 µs.',
          x: [0, 40],
          y: [0, 22],
          xLabel: 't (µs)',
          yLabel: 'v (kV)',
          series: [{ f: (t) => ((11 * Math.SQRT2) / Math.sqrt(3)) * (1 - Math.cos(t / Math.sqrt(2e-3 * 0.02e-6) / 1e6)), label: 'v', area: true }],
          marks: [{ x: 19.9, label: 'peak' }],
        },
        r`The steeper it rises (the **rate of rise of restriking voltage**, RRRV, at most $\omega_nV_m$), the likelier the gap breaks down again before it has recovered its strength.`,
      ],
      keyIdeas: [
        r`MCB curves: B $3$ to $5I_n$, C $5$ to $10I_n$, D $10$ to $20I_n$ instantaneous.`,
        r`Ratings: rated current, voltage, interrupting capacity (kA), frame size.`,
        r`Restriking voltage peaks at $2V_m$ after $\frac{1}{2f_n}$, $f_n = \frac{1}{2\pi\sqrt{LC}}$; RRRV at most $\omega_nV_m$.`,
        r`Arc quenching: air (LV), oil, SF₆ (HV), vacuum (MV).`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Which curve trips instantly?',
          problem: r`A 16 A breaker sees a 200 A fault. Does it trip instantly on curve C? On curve D?`,
          steps: [
            r`C trips instantly between $5 \times 16 = 80$ and $10 \times 16 = 160$ A: 200 A is above both, so yes.`,
            r`D needs 160 to 320 A: 200 A may not be enough, so it may trip only on its slower thermal element.`,
          ],
          answer: r`C: yes. D: not certain; it may trip thermally.`,
        },
        {
          level: 'board',
          title: 'Restriking voltage',
          problem: r`An 11 kV system has 2 mH inductance and 0.02 µF capacitance per phase up to the breaker. Find the frequency of oscillation, the peak restriking voltage, the time to reach it and the maximum RRRV.`,
          steps: [
            r`$\omega_n = \frac{1}{\sqrt{2 \times 10^{-3} \times 0.02 \times 10^{-6}}} = 158\,114$ rad/s: $f_n = 25.2$ kHz.`,
            r`$V_m = \frac{11\sqrt2}{\sqrt3} = 8.98$ kV, so the peak is $2V_m = 18.0$ kV.`,
            r`Time to peak $= \frac{\pi}{\omega_n} = 19.9$ µs; RRRV $= \omega_nV_m = 1.42$ kV/µs.`,
          ],
          answer: r`25.2 kHz; 18.0 kV; 19.9 µs; 1.42 kV/µs.`,
        },
      ],
      traps: [
        r`A D-curve breaker on a long cable may not trip instantly for a distant fault.`,
        r`Restriking voltage is the transient; recovery voltage is the power-frequency voltage that follows.`,
      ],
      check: [
        { q: r`What is the transient voltage across the contacts just after the arc goes out called?`, a: r`The restriking (transient recovery) voltage.` },
        { q: r`Which breaker type suits 13.8 kV indoor switchgear today?`, a: r`Vacuum (or SF₆).` },
      ],
    },
    {
      name: 'Relays and Contactors',
      inShort: r`Electromagnetic switches: relays for signals, contactors for power.`,
      body: [
        r`A **protective relay** senses a fault and tells the breaker to trip. Its scheme has three circuits: the CT's primary, in series with the protected line; the CT's secondary, feeding the relay's operating coil; and the **trip circuit**, a battery, the relay's contacts and the breaker's trip coil. An overcurrent relay's **plug setting** is a percentage of the CT's 5 A (or 1 A) secondary rating; its **pickup** is that current. A relay's burden is the VA it draws at its setting, and the one that needs the least VA to operate is the most sensitive.`,
        r`A **contactor** is a power switch closed by its coil and held in while energized. Its rating depends on the duty:`,
        r`| Category | Duty |
|---|---|
| AC-1 | non-inductive or slightly inductive loads |
| AC-3 | squirrel-cage motors: start, switch off while running |
| AC-4 | plugging, inching, reversing: breaking the starting current |`,
        r`A **time-delay relay** acts a set time after its coil is energized. An RC timer switches when the capacitor reaches its threshold voltage, $t = RC\ln\frac{V}{V - V_{th}}$:`,
        {
          type: 'plot',
          alt: 'The capacitor voltage of an RC timer charging toward 12 V with a 1 second time constant: rising quickly and then levelling off; it crosses the 8 V threshold at 1.10 s.',
          caption: 'An RC timer (100 kΩ, 10 µF, 12 V) reaches its 8 V threshold at 1.10 s.',
          x: [0, 4],
          y: [0, 14],
          xLabel: 't (s)',
          yLabel: 'v_C (V)',
          series: [{ f: (t) => 12 * (1 - Math.exp(-t)), label: 'v', area: true }],
          marks: [{ y: 8, label: '8 V' }, { x: 1.1, label: '1.10 s' }],
        },
      ],
      keyIdeas: [
        r`Relay scheme: CT primary, CT secondary with the relay coil, trip circuit with battery and trip coil.`,
        r`Pickup $=$ plug setting × CT secondary rating; primary pickup $=$ that × CT ratio.`,
        r`Utilization categories: AC-1 resistive, AC-3 motor start/stop, AC-4 plugging and inching (hardest).`,
        r`Time-delay relays: RC timer $t = RC\ln\frac{V}{V - V_{th}}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'An RC timer',
          problem: r`An RC timer has 100 kΩ and 10 µF on 12 V, switching at 8 V. Find its delay.`,
          steps: [
            r`$RC = 100\,000 \times 10^{-5} = 1$ s.`,
            r`$t = 1 \times \ln\frac{12}{12 - 8} = \ln 3 = 1.10$ s.`,
          ],
          answer: r`1.10 s.`,
        },
        {
          level: 'board',
          title: 'Relay pickup through a CT',
          problem: r`An overcurrent relay with a 150% plug setting is fed from a 300:5 CT. Find its pickup current in the relay and in the line.`,
          steps: [
            r`Relay: $1.5 \times 5 = 7.5$ A.`,
            r`Line: $7.5 \times \frac{300}{5} = 450$ A.`,
          ],
          answer: r`7.5 A; 450 A.`,
        },
      ],
      traps: [
        r`An AC-3 rating is not enough for plugging or inching duty: use AC-4.`,
        r`The plug setting is a percentage of the CT's SECONDARY rating, not of the load.`,
      ],
      check: [
        { q: r`Relays need 1, 2, 3 and 4 VA to operate. Which is the most sensitive?`, a: r`The 1 VA relay.` },
        { q: r`What does the trip circuit consist of?`, a: r`A supply (station battery), the relay's contacts and the breaker's trip coil.` },
      ],
    },
    {
      name: 'Motor Starters',
      inShort: r`Contactor plus overload relay (and sometimes reduced-voltage means) to start and protect a motor.`,
      body: [
        r`A starter is a contactor to switch the motor and an **overload relay** to trip it on sustained overcurrent, with fuses or a breaker ahead of it for short circuits. Overload relays have a **trip class**: class 10, 20 or 30 trips within that many seconds at 7.2 times the setting (IEC). Direct-on-line (DOL) starting draws five to seven times full-load current; reduced-voltage starters cut that, at the price of torque, which falls with the square of the voltage:`,
        r`| Method | Line current (× DOL) | Torque (× DOL) |
|---|---|---|
| Direct-on-line | 1 | 1 |
| Star-delta | $\frac{1}{3}$ | $\frac{1}{3}$ |
| Autotransformer, tap x | $x^2$ | $x^2$ |
| Primary resistor or reactor, current x | x | $x^2$ |
| Soft starter, VFD | adjustable | adjustable (VFD: full torque at low current) |`,
        r`A primary resistor adds to the motor's locked-rotor **resistance**, but the motor's impedance is mostly **reactance**, so the two add as phasors. To limit the current to a fraction x, the total impedance must be $\frac{\lvert Z_m\rvert}{x}$, which takes more resistor than scaling would suggest:`,
        {
          type: 'phasor',
          axes: false,
          alt: 'An impedance triangle: the motor resistance of 0.5 ohm and the added 2.29 ohm resistor lie along the horizontal, the 2 ohm reactance rises from their end, and the 3.44 ohm total impedance closes the triangle; the motor alone, 2.06 ohm, is dashed.',
          caption: 'Adding 2.29 Ω in series raises the impedance from 2.06 Ω to 3.44 Ω: the current falls to 60%.',
          vectors: [
            { name: 'Rm', mag: 0.5, angle: 0, label: 'R_m' },
            { name: 'R', mag: 2.29, angle: 0, from: 'Rm', label: 'R', colour: 2 },
            { mag: 2, angle: 90, from: 'R', label: 'X_m', colour: 3 },
            { mag: 3.44, angle: 35.6, label: 'Z', colour: 1 },
            { mag: 2.06, angle: 76, label: 'Z_m', dashed: true },
          ],
        },
      ],
      keyIdeas: [
        r`Overload trip class 10/20/30: trips within that many seconds at 7.2× setting (IEC).`,
        r`Star-delta: current and torque $\frac{1}{3}$; autotransformer tap x: $x^2$ both; resistor: current x, torque $x^2$.`,
        r`Primary resistor for current fraction x: $R = \sqrt{\left(\frac{\lvert Z_m\rvert}{x}\right)^2 - X_m^2} - R_m$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A primary resistor',
          problem: r`A motor's locked-rotor impedance is $0.5 + j2.0$ Ω per phase. Find the primary resistor that limits starting current to 60% of direct-on-line.`,
          steps: [
            r`$\lvert Z_m\rvert = 2.06$ Ω; target $\frac{2.06}{0.6} = 3.44$ Ω.`,
            r`$R = \sqrt{3.44^2 - 2^2} - 0.5 = 2.29$ Ω. Torque falls to $0.6^2 = 36\%$.`,
          ],
          answer: r`2.29 Ω; torque 36% of DOL.`,
        },
        {
          level: 'board',
          title: 'Star-delta against an autotransformer',
          problem: r`On DOL a motor draws 600 A and develops 2.0 times full-load torque at start. Find the line current and starting torque with a star-delta starter and with a 65% autotransformer tap.`,
          steps: [
            r`Star-delta: $\frac{600}{3} = 200$ A; $\frac{2.0}{3} = 0.67$ × full-load torque.`,
            r`Autotransformer: $0.65^2 = 0.4225$, so $0.4225 \times 600 = 253.5$ A in the line and $0.4225 \times 2.0 = 0.845$ × full-load torque.`,
          ],
          answer: r`200 A, 0.67; 253.5 A, 0.845.`,
        },
      ],
      traps: [
        r`Resistance and reactance add as phasors: you cannot just scale the resistor by $\frac{1}{x}$.`,
        r`With an autotransformer the MOTOR current is x times DOL but the LINE current is $x^2$ times.`,
      ],
      check: [
        { q: r`What protects a running motor from a sustained overload?`, a: r`The overload relay.` },
        { q: r`Which starter gives full torque at low current?`, a: r`A variable-frequency drive.` },
      ],
    },
    {
      name: 'Instrument Transformers',
      inShort: r`CTs and VTs scale current and voltage for meters and relays.`,
      body: [
        r`**Current transformers** (CTs) step a line current down to a standard 5 A (or 1 A); **voltage (potential) transformers** (VTs, PTs) step a voltage down to about 110 or 120 V. They isolate meters and relays from the high voltage and let standard instruments read any circuit. The meters, relays and leads they supply are their **burden**, in VA.`,
        r`| Item | Detail |
|---|---|
| Billing multiplier | CTR × VTR |
| True value | reading × ratios × ratio correction factor (RCF) |
| Metering accuracy | classes 0.3, 0.6, 1.2 at stated burdens |
| Relaying accuracy | e.g. C200, 5P20: holds accuracy at high fault currents |`,
        r`Never open a loaded CT's secondary: with no secondary ampere-turns to oppose it, the primary current drives the core into saturation and induces a dangerous voltage. Never short a VT's secondary: it is a voltage source and would burn out.`,
        r`In three-phase banks the connection matters. Wye-connected primaries see the line-to-neutral voltage, so a reading taken on a delta secondary must be multiplied by the ratio and then by $\sqrt3$ to give the line voltage.`,
      ],
      keyIdeas: [
        r`Billing multiplier = CTR × VTR; true value = reading × ratio × RCF.`,
        r`Metering accuracy classes 0.3, 0.6, 1.2 at stated burdens.`,
        r`Never open a CT secondary under load; never short a VT secondary.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'A billing multiplier',
          problem: r`A meter on 200:5 CTs and 14 400:120 V VTs advances 1.25 kWh. The CT's RCF is 1.002. Find the energy.`,
          steps: [
            r`Multiplier $40 \times 120 = 4800$.`,
            r`$1.25 \times 4800 \times 1.002 = 6012$ kWh.`,
          ],
          answer: r`6012 kWh.`,
        },
        {
          level: 'board',
          title: 'Voltage through a wye-delta bank',
          problem: r`Three 69 000:115 V potential transformers are connected wye-delta. A voltmeter across one secondary reads 110 V. What is the line voltage?`,
          steps: [
            r`Ratio $\frac{69\,000}{115} = 600$: each primary sees $110 \times 600 = 66$ kV, line to neutral.`,
            r`Line voltage $= 66\sqrt3 = 114.3$ kV.`,
          ],
          answer: r`114.3 kV.`,
        },
      ],
      traps: [
        r`Forgetting the multiplier is the classic metering mistake: the meter shows secondary units.`,
        r`On a wye primary, the ratio gives the PHASE voltage: multiply by $\sqrt3$ for the line.`,
      ],
      check: [
        { q: r`What is the usual secondary rating of a current transformer?`, a: r`5 A (1 A for long leads).` },
        { q: r`Why must a loaded CT's secondary never be opened?`, a: r`The core saturates and a very high voltage appears across the open terminals.` },
      ],
    },
    {
      name: 'Capacitors and Reactors',
      inShort: r`Capacitors supply vars; reactors limit current or tune out resonance.`,
      body: [
        r`A capacitor bank supplies reactive power locally, correcting power factor. Its output goes with the square of the voltage and with frequency, $Q = Q_r\left(\frac{V}{V_r}\right)^2\frac{f}{f_r}$; per phase, a wye bank needs $C = \frac{Q}{\omega V_L^2}$ and a delta bank a third of that. Every unit has a **discharge resistor** to bring it to 50 V within a minute (low voltage) after it is switched off: $R \le \frac{t}{C\ln\frac{V_0}{50}}$, with $V_0$ the peak.`,
        r`A capacitor bank and the system's inductance resonate at $h_r = \sqrt{\frac{S_{sc}}{Q_c}}$. If that lands near a harmonic the loads produce (the 5th, 7th…), currents and voltages at that harmonic are magnified. The cure is a **detuning reactor** in series, typically 7% of the capacitor's reactance, which tunes the branch below the 5th, at $\frac{1}{\sqrt{0.07}} = 3.78$. Above that the branch looks inductive and cannot resonate with the system at the harmonics:`,
        {
          type: 'plot',
          alt: 'The reactance of a capacitor branch with a 7 percent detuning reactor, against harmonic order: negative (capacitive) at low orders, crossing zero at 3.78, and positive (inductive) at the 5th and above.',
          caption: 'A 7% detuning reactor tunes the branch to 3.78: capacitive below, inductive at the 5th and above.',
          x: [1, 13],
          y: [-1, 1],
          xLabel: 'harmonic order h',
          yLabel: 'X (pu)',
          series: [{ f: (h) => 0.07 * h - 1 / h, label: 'X' }],
          marks: [{ x: 3.78, label: '3.78' }],
        },
        r`**Reactors** are also used alone: **series (current-limiting) reactors** reduce fault current, **shunt reactors** absorb the vars of long lines and cables at light load, and **neutral grounding reactors** limit ground-fault current.`,
      ],
      keyIdeas: [
        r`$Q = Q_r\left(\frac{V}{V_r}\right)^2\frac{f}{f_r}$; wye $C = \frac{Q}{\omega V_L^2}$, delta a third of that.`,
        r`Discharge to 50 V within a minute: $R \le \frac{t}{C\ln(V_0/50)}$.`,
        r`Resonance at $h_r = \sqrt{\frac{S_{sc}}{Q_c}}$; a 7% detuning reactor tunes the branch to 3.78.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Resonance and the discharge resistor',
          problem: r`A 1.2 Mvar bank is added on a bus of 20 MVA fault level. At what harmonic does it resonate? What discharge resistor does a 300 µF, 480 V capacitor need?`,
          steps: [
            r`$h_r = \sqrt{\frac{20}{1.2}} = 4.08$: close to the 5th, so detune it.`,
            r`$V_0 = 480\sqrt2 = 679$ V: $R \le \frac{60}{300 \times 10^{-6}\ln\frac{679}{50}} = 76.7$ kΩ.`,
          ],
          answer: r`4.08; at most 76.7 kΩ.`,
        },
        {
          level: 'board',
          title: 'A capacitor away from its rating',
          problem: r`A 50 kvar, 480 V, 60 Hz capacitor is used on a 400 V, 50 Hz system. What does it deliver?`,
          steps: [r`$Q = 50 \times \left(\frac{400}{480}\right)^2 \times \frac{50}{60} = 28.9$ kvar.`],
          answer: r`28.9 kvar.`,
        },
      ],
      traps: [
        r`A capacitor run below rated voltage gives much less than its nameplate kvar.`,
        r`Use the PEAK voltage in the discharge formula.`,
      ],
      check: [
        { q: r`What does a shunt reactor do on a long line at light load?`, a: r`It absorbs the line's charging vars, holding the voltage down.` },
        { q: r`To what harmonic does a 7% detuning reactor tune its branch?`, a: r`$\frac{1}{\sqrt{0.07}} = 3.78$.` },
      ],
    },
    {
      name: 'Surge Arresters',
      inShort: r`Metal-oxide blocks that conduct only on overvoltage, clamping surges.`,
      body: [
        r`A **lightning (surge) arrester** sits between a line and ground and protects insulation from lightning and switching surges. Old arresters were air gaps (and gapped silicon carbide); modern ones are stacks of **metal-oxide (zinc oxide) varistor** blocks, with a sharply nonlinear current against voltage. Near the operating voltage only milliamperes leak; a little above it, thousands of amperes flow, so the voltage is clamped:`,
        {
          type: 'plot',
          alt: 'The current through a metal-oxide arrester against the voltage across it, in per unit of its voltage at 1 kA: practically zero below about 0.85, 1 kA at 1.0, then rising steeply to 10 kA at 1.08.',
          caption: 'A metal-oxide arrester: almost no current at working voltage; 1 kA at its reference voltage, 10 kA for only 8% more.',
          x: [0.6, 1.08],
          y: [0, 10],
          xLabel: 'V (pu)',
          yLabel: 'I (kA)',
          series: [{ f: (v) => v ** 30, label: 'I', area: true }],
          marks: [{ x: 1, label: '1 kA' }],
        },
        r`It is rated by its **maximum continuous operating voltage** (MCOV), its duty-cycle voltage, the discharge current class and the energy it can absorb. Its **residual (discharge) voltage** at the surge current, plus the drop in its leads, must sit well below the equipment's **basic insulation level** (BIL): a protective margin $\frac{\text{BIL}}{V_{protect}} - 1$ of at least 20% is usual. The leads add $L'\ell\frac{di}{dt}$, about 1 µH per metre, so arresters go right at transformer terminals and line entrances with short, direct ground leads.`,
      ],
      keyIdeas: [
        r`Rated by MCOV and duty-cycle voltage, discharge current class and energy.`,
        r`Lead inductance adds $L'\ell\frac{di}{dt}$, about 1 µH/m.`,
        r`Protective margin $\frac{\text{BIL}}{V_{res} + V_{leads}} - 1$, at least about 20%.`,
        r`Place at transformer terminals and line entrances; ground solidly with short leads.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'The leads',
          problem: r`An arrester has 3 m of total lead. What extra voltage reaches the equipment on a 10 kA/µs surge?`,
          steps: [r`$1\ \mu\text{H/m} \times 3\ \text{m} \times 10\ \text{kA/µs} = 30$ kV.`],
          answer: r`30 kV.`,
        },
        {
          level: 'board',
          title: 'Is the margin enough?',
          problem: r`The same arrester's residual voltage is 50 kV, protecting a transformer of 95 kV BIL. Find the protective margin with the 3 m of leads, and with the leads cut to 1 m.`,
          steps: [
            r`3 m: $\frac{95}{50 + 30} - 1 = 18.8\%$: below 20%.`,
            r`1 m: $\frac{95}{50 + 10} - 1 = 58.3\%$.`,
          ],
          answer: r`18.8% (not enough); 58.3%.`,
        },
      ],
      traps: [
        r`Long arrester leads can waste most of the protective margin.`,
        r`An arrester must not conduct at the system's highest continuous voltage: check MCOV, including on unfaulted phases during a ground fault.`,
      ],
      check: [
        { q: r`What material are modern arrester blocks made of?`, a: r`Metal oxide (zinc oxide).` },
        { q: r`Where should an arrester be placed to protect a transformer?`, a: r`At its terminals, with short leads to the tank and ground.` },
      ],
    },
    {
      name: 'Switchgear and Panelboards',
      inShort: r`Assemblies of switching and protective devices with their buses.`,
      body: [
        r`**Switchgear** groups breakers, switches, instrument transformers, relays and buses in one assembly. **Metal-clad** switchgear has every main part in its own earthed compartment and withdrawable breakers; **metal-enclosed** is simpler. **Panelboards** hold the branch-circuit breakers of a building. The switching devices differ in what they may open:`,
        r`| Device | Opens |
|---|---|
| Isolator (disconnecting switch) | NO load: only to isolate after the breaker is open |
| Load-break (air-break) switch | load current, not faults |
| Oil switch | load, quenching the arc in oil |
| Circuit breaker | load and fault currents |`,
        r`So the order is fixed and usually interlocked: to take a circuit out, **open the breaker, then the isolators**; to restore it, **close the isolators, then the breaker**.`,
        r`Switchgear is rated by voltage, continuous current, **short-time withstand** (rms kA for a stated time, usually 1 or 3 s; equal $I^2t$ converts between them) and **peak withstand**. The peak matters for force: two parallel bars carrying the peak fault current repel each other with $\frac{F}{\ell} = 0.2 \times \frac{i_p^2}{d}$ N/m (kA, m), falling as they are spaced apart:`,
        {
          type: 'plot',
          alt: 'The force per metre between two busbars carrying a 50 kA peak, against their spacing: 5000 N per metre at 0.1 m, 2500 at 0.2 m, falling to 1000 at 0.5 m.',
          caption: 'Busbars carrying a 50 kA peak: 2500 N/m at 0.2 m spacing, inversely with the spacing.',
          x: [0.1, 0.5],
          y: [0, 5500],
          xLabel: 'd (m)',
          yLabel: 'F (N/m)',
          series: [{ f: (d) => (0.2 * 50 * 50) / d, label: 'F', area: true }],
          marks: [{ x: 0.2, label: '0.2 m' }],
        },
      ],
      keyIdeas: [
        r`Rated voltage, continuous current, short-time withstand ($I^2t$) and peak withstand.`,
        r`Busbar force $\frac{F}{\ell} = 0.2 \times \frac{i_p^2}{d}$ N/m (kA, m), ×0.866 for the middle bar.`,
        r`Isolators open only with no load: breaker first, then isolators.`,
        r`Metal-clad vs metal-enclosed switchgear; panelboards for branch circuits.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Busbar force',
          problem: r`Busbars 0.2 m apart carry a 50 kA peak fault current. Find the force per metre.`,
          steps: [
            r`$0.2 \times \frac{50^2}{0.2} = 2500$ N/m.`,
            r`The middle bar of a flat three-phase set gets $0.866 \times 2500 = 2165$ N/m.`,
          ],
          answer: r`2500 N/m; 2165 N/m on the middle bar.`,
        },
        {
          level: 'board',
          title: 'Short-time withstand for longer',
          problem: r`Switchgear is rated 40 kA for 1 s. What fault current may it carry for 3 s?`,
          steps: [r`Equal $I^2t$: $I = \frac{40}{\sqrt3} = 23.1$ kA.`],
          answer: r`23.1 kA.`,
        },
      ],
      traps: [
        r`Use the PEAK current: forces go with its square.`,
        r`Never open an isolator on load: it has no means to quench the arc.`,
      ],
      check: [
        { q: r`In what order are a breaker and its isolators opened?`, a: r`The breaker first, then the isolators.` },
        { q: r`Which switch can open load current but not a fault?`, a: r`A load-break (air-break) switch.` },
      ],
    },
    {
      name: 'Wires and Cables',
      inShort: r`Sized for current, voltage drop and fault withstand; insulated for voltage and heat.`,
      body: [
        r`A conductor is chosen for ampacity, voltage drop and **fault withstand**: during a fault it must not get hot enough to damage its insulation before the protection clears, $S \ge \frac{I\sqrt t}{k}$ mm², with k = 115 for copper with PVC and 143 for copper with XLPE. American sizes follow the **AWG**: diameter $0.127 \times 92^{(36 - n)/39}$ mm, so every three gauges doubles the area, and above 4/0 sizes are in kcmil.`,
        r`In a single-core cable the electric stress in the insulation at radius x is $g = \frac{V}{x\ln(R/r)}$, highest at the conductor surface and falling outward:`,
        {
          type: 'plot',
          alt: 'The electric stress across the insulation of an 11 kV cable with a 0.6 cm conductor and 1.6 cm outer radius: 18.7 kV per cm at the conductor, falling to 7 kV per cm at the outside.',
          caption: 'Stress in an 11 kV cable: 18.7 kV/cm at the conductor, 7.0 kV/cm at the sheath.',
          x: [0.6, 1.6],
          y: [0, 20],
          xLabel: 'x (cm)',
          yLabel: 'g (kV/cm)',
          series: [{ f: (x) => 11 / (x * Math.log(1.6 / 0.6)), label: 'g', area: true }],
        },
        r`For a given outer radius the maximum stress is least when $\ln\frac{R}{r} = 1$, so $r = \frac{R}{e}$; graded insulation (better material near the conductor) evens the stress further.`,
      ],
      keyIdeas: [
        r`AWG diameter $0.127 \times 92^{(36-n)/39}$ mm; three gauges double the area.`,
        r`Fault withstand $S \ge \frac{I\sqrt t}{k}$, $k = 115$ Cu/PVC, 143 Cu/XLPE.`,
        r`Insulation stress $g = \frac{V}{x\ln(R/r)}$, highest at the conductor; least maximum at $r = \frac{R}{e}$.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Fault withstand and stress',
          problem: r`A Cu/PVC cable must withstand 20 kA for 0.5 s. Find the minimum size. An 11 kV cable has a 0.6 cm conductor radius and 1.6 cm over the insulation: find the maximum stress.`,
          steps: [
            r`$S \ge \frac{20\,000\sqrt{0.5}}{115} = 123$ mm², so 150 mm².`,
            r`$g_{max} = \frac{11}{0.6\ln 2.67} = 18.7$ kV/cm.`,
          ],
          answer: r`150 mm²; 18.7 kV/cm.`,
        },
        {
          level: 'board',
          title: 'The best conductor radius',
          problem: r`Keeping the 1.6 cm outer radius, what conductor radius gives the least maximum stress, and what is it?`,
          steps: [
            r`$r = \frac{1.6}{e} = 0.589$ cm.`,
            r`$g_{max} = \frac{11}{0.589 \times 1} = 18.7$ kV/cm: the 0.6 cm conductor was already close to the best.`,
          ],
          answer: r`0.589 cm; 18.7 kV/cm.`,
        },
      ],
      traps: [
        r`A cable sized only for load current can burn on a fault if the protection is slow.`,
        r`A LARGER AWG number is a SMALLER wire.`,
      ],
      check: [
        { q: r`How much larger in area is #4 AWG than #10?`, a: r`Six gauges: $2^2 = 4$ times.` },
        { q: r`Where in a cable's insulation is the stress greatest?`, a: r`At the conductor surface.` },
      ],
    },
    {
      name: 'Batteries and UPS',
      inShort: r`Stored energy for backup: batteries and the inverters that use them.`,
      body: [
        r`A battery's ampere-hour rating is for a slow discharge, usually over 20 hours. Discharged faster it delivers less: **Peukert's law**, $t = H\left(\frac{C}{IH}\right)^k$, with k about 1.1 to 1.3 for lead-acid:`,
        {
          type: 'plot',
          alt: 'The capacity a 100 ampere-hour battery delivers against its discharge current, by Peukert: above 100 ampere-hours at slow rates, 76 at 20 A and 66 at 40 A; the 100 ampere-hour rating is dashed.',
          caption: 'A 100 Ah battery (k = 1.2) delivers only 76 Ah at 20 A, so it lasts 3.8 h, not 5; the rating is dashed.',
          x: [2.5, 40],
          y: [0, 130],
          xLabel: 'I (A)',
          yLabel: 'capacity (Ah)',
          series: [
            { f: (i) => i * 20 * (100 / (i * 20)) ** 1.2, label: 'delivered' },
            { f: () => 100, label: 'rating', dashed: true },
          ],
          legend: false,
          marks: [{ x: 20, label: '20 A' }],
        },
        r`A **UPS** keeps loads running through an outage: an online (double-conversion) UPS runs the load from its inverter all the time, a line-interactive or standby one switches over. It is sized in kVA, $\ge \frac{P}{\text{pf}}$, and its runtime from the battery is $\frac{CV\eta\,\text{DoD}}{P}$. Lead-acid batteries are cheap but should not be deeply discharged; lithium-ion allows deeper discharge and longer life at a higher price.`,
      ],
      keyIdeas: [
        r`Peukert: $t = H\left(\frac{C}{IH}\right)^k$: faster discharge, less capacity.`,
        r`UPS $\ge \frac{P}{\text{pf}}$ kVA; runtime $\frac{CV\eta\,\text{DoD}}{P}$.`,
        r`Lead-acid vs lithium: depth of discharge, life, temperature.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Peukert and a UPS runtime',
          problem: r`A 100 Ah (20-hour) lead-acid battery with k = 1.2 is discharged at 20 A. How long does it last? A 2 kW UPS load runs from a 48 V, 100 Ah bank (90% inverter, 80% DoD): find its runtime.`,
          steps: [
            r`$t = 20\left(\frac{100}{20 \times 20}\right)^{1.2} = 3.8$ h, not 5.`,
            r`Runtime $= \frac{100 \times 48 \times 0.9 \times 0.8}{2000} = 1.73$ h, before the Peukert correction.`,
          ],
          answer: r`3.8 h; about 1.73 h.`,
        },
        {
          level: 'board',
          title: 'Sizing the UPS',
          problem: r`The 2 kW load has a 0.8 power factor. What UPS rating does it need, and how many 12 V batteries make the 48 V bank?`,
          steps: [
            r`$\frac{2}{0.8} = 2.5$ kVA: the next standard size, 3 kVA.`,
            r`$\frac{48}{12} = 4$ batteries in series.`,
          ],
          answer: r`2.5 kVA (a 3 kVA unit); 4 batteries.`,
        },
      ],
      traps: [
        r`Ah ratings are at a slow rate: high-rate loads get much less.`,
        r`Size a UPS in kVA AND kW: both limits apply.`,
      ],
      check: [
        { q: r`Which UPS type runs the load from its inverter all the time?`, a: r`The online (double-conversion) UPS.` },
        { q: r`What does Peukert's exponent k equal for an ideal battery?`, a: r`1: capacity independent of the rate.` },
      ],
    },
    {
      name: 'Lamps and Luminaires',
      inShort: r`Light sources and the fittings that hold, power and direct them.`,
      body: [
        r`A **luminaire** holds the lamps, powers them (ballast or LED driver), and directs the light with reflectors, lenses or diffusers, losing some on the way: its **light output ratio** is $\frac{\Phi_{out}}{\Phi_{lamps}}$. Compare luminaires by their own lumens per watt, driver losses included, and check the driver's power factor and harmonics.`,
        r`An LED rarely fails outright; it dims. Its rated life is **L70**, the hours until its output falls to 70%. For an exponential decay $\Phi = \Phi_0e^{-\alpha t}$, $L_{70} = \frac{\ln(1/0.7)}{\alpha}$:`,
        {
          type: 'plot',
          alt: 'The light output of an LED against operating hours, decaying exponentially: 90 percent at 10 000 hours, reaching the 70 percent line at about 33 900 hours.',
          caption: 'An LED losing 10% in 10 000 h reaches L70 at about 33 900 h.',
          x: [0, 60],
          y: [0, 105],
          xLabel: 'hours (thousands)',
          yLabel: 'output (%)',
          series: [{ f: (k) => 100 * 0.9 ** (k / 10), label: 'output', area: true }],
          marks: [{ y: 70, label: 'L70' }],
        },
      ],
      keyIdeas: [
        r`Luminaire efficiency (light output ratio) $= \frac{\Phi_{out}}{\Phi_{lamps}}$; compare luminaire lm/W.`,
        r`LED life is L70: hours to 70% output, $\frac{\ln(1/0.7)}{\alpha}$ for exponential decay.`,
        r`Drivers and ballasts add losses; check power factor and harmonics.`,
      ],
      examples: [
        {
          level: 'basic',
          title: 'Light output ratio and L70',
          problem: r`A fitting with 4000 lm of lamps emits 3400 lm. An LED loses 10% of its output in 10 000 h: estimate its L70.`,
          steps: [
            r`Light output ratio $= \frac{3400}{4000} = 85\%$.`,
            r`$\alpha = \frac{-\ln 0.9}{10\,000}$, so $L_{70} = \frac{\ln(1/0.7)}{\alpha} = 33\,853$ h, about 33 900 h.`,
          ],
          answer: r`85%; about 33 900 h.`,
        },
        {
          level: 'board',
          title: 'Comparing two luminaires',
          problem: r`Luminaire A gives 3400 lm for 38 W, driver included; luminaire B gives 3000 lm for 28 W. Which is more efficient?`,
          steps: [r`A: $\frac{3400}{38} = 89.5$ lm/W. B: $\frac{3000}{28} = 107.1$ lm/W.`],
          answer: r`B, at 107.1 lm/W.`,
        },
      ],
      traps: [
        r`An LED's rated life is reduced output, not failure: it keeps running but dimmer.`,
        r`Compare luminaires, not lamps: the fitting's losses count.`,
      ],
      check: [
        { q: r`What does L70 mean?`, a: r`The operating hours until the light output falls to 70% of its initial value.` },
        { q: r`What does a luminaire's driver or ballast add?`, a: r`Losses (and possibly poor power factor and harmonics).` },
      ],
    },
  ],
};
