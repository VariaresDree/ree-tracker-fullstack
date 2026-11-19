// Library › Lessons › EE › Electrical Apparatus & Devices (2026-11-19):
// written for the Philippine REE board, subtopic by subtopic in the syllabus's
// order; every worked example checked by computation. Breaker interrupting
// ratings, CT burden and arrester ratings are in Power System Protection;
// starting methods in Machinery 2; lighting design in System & Illumination.
const r = String.raw;

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
      keyIdeas: [
        r`For high currents melting follows $I^2t = K$: $t = \frac{K}{I^2}$.`,
        r`Current-limiting fuses clear before the first peak, cutting let-through energy.`,
        r`Selective if the upstream fuse's melting $I^2t$ exceeds the downstream fuse's clearing $I^2t$ (about 2:1 in amps).`,
      ],
      example: {
        problem: r`A fuse melts at 50,000 A²s. How long at 1 kA and at 2 kA? Will an upstream fuse with 14,000 A²s melting stay intact while a downstream one clears with 5,800 A²s?`,
        solution: r`$t = 0.05$ s at 1 kA, 0.0125 s at 2 kA. $14{,}000 > 5{,}800$: yes, they are selective.`,
      },
      traps: [r`Doubling the current QUARTERS the melting time in the adiabatic region.`],
    },
    {
      name: 'Circuit Breakers',
      inShort: r`Resettable switches that trip on overload (thermal) and on short circuit (magnetic).`,
      keyIdeas: [
        r`MCB curves: B $3$–$5I_n$, C $5$–$10I_n$, D $10$–$20I_n$ instantaneous.`,
        r`Ratings: rated current, voltage, interrupting capacity (kA), frame size.`,
        r`MCCBs and air circuit breakers have adjustable trip units for coordination.`,
      ],
      example: {
        problem: r`A 16 A breaker sees a 200 A fault. Does it trip instantly on curve C? On curve D?`,
        solution: r`C trips instantly above 80–160 A: yes. D needs 160–320 A: it may only trip on its slower thermal element.`,
      },
      traps: [r`A D-curve breaker on a long cable may not trip instantly for a distant fault.`],
    },
    {
      name: 'Relays and Contactors',
      inShort: r`Electromagnetic switches: relays for signals, contactors for power.`,
      keyIdeas: [
        r`Contactor coils close at 85–110% of rated voltage and drop out at 20–75% (ac).`,
        r`Utilization categories: AC-1 resistive, AC-3 motor start/stop, AC-4 plugging and inching (hardest).`,
        r`Time-delay relays: RC timer $t = RC\ln\frac{V}{V - V_{th}}$.`,
      ],
      example: {
        problem: r`An RC timer has 100 kΩ and 10 µF on 12 V, switching at 8 V. Find its delay.`,
        solution: r`$t = 100{,}000 \times 10^{-5} \times \ln\frac{12}{4} = 1.10$ s.`,
      },
      traps: [r`An AC-3 rating is not enough for plugging or inching duty: use AC-4.`],
    },
    {
      name: 'Motor Starters',
      inShort: r`Contactor plus overload relay (and sometimes reduced-voltage means) to start and protect a motor.`,
      keyIdeas: [
        r`Overload trip class 10/20/30: trips within that many seconds at 7.2× setting (IEC).`,
        r`Types: DOL, star-delta, autotransformer, primary resistor, soft starter, VFD.`,
        r`Primary resistor for current fraction x: $R = \sqrt{(|Z_m|/x)^2 - X_m^2} - R_m$.`,
      ],
      example: {
        problem: r`A motor's locked-rotor impedance is $0.5 + j2.0$ Ω per phase. Find the primary resistor that limits starting current to 60% of direct-on-line.`,
        solution: r`$|Z_m| = 2.06$ Ω; target $\frac{2.06}{0.6} = 3.44$ Ω. $R = \sqrt{3.44^2 - 2^2} - 0.5 = 2.29$ Ω. Torque falls to 36%.`,
      },
      traps: [r`Resistance and reactance add as phasors: you cannot just scale the resistor by 1/x.`],
    },
    {
      name: 'Instrument Transformers',
      inShort: r`CTs and VTs scale current and voltage for meters and relays.`,
      keyIdeas: [
        r`Billing multiplier = CTR × VTR; true value = reading × ratio × RCF.`,
        r`Metering accuracy classes 0.3, 0.6, 1.2 at stated burdens.`,
        r`Never open a CT secondary under load; never short a VT secondary.`,
      ],
      example: {
        problem: r`A meter on 200:5 CTs and 14,400:120 V VTs advances 1.25 kWh. The CT's RCF is 1.002. Find the energy.`,
        solution: r`Multiplier $40 \times 120 = 4800$. $1.25 \times 4800 \times 1.002 = 6012$ kWh.`,
      },
      traps: [r`Forgetting the multiplier is the classic metering mistake: the meter shows secondary units.`],
    },
    {
      name: 'Capacitors and Reactors',
      inShort: r`Capacitors supply vars; reactors limit current or tune out resonance.`,
      keyIdeas: [
        r`$Q = Q_r\left(\frac{V}{V_r}\right)^2\frac{f}{f_r}$; wye $C = \frac{Q}{\omega V_L^2}$, delta a third of that.`,
        r`Discharge to 50 V within a minute: $R \le \frac{t}{C\ln(V_0/50)}$.`,
        r`Resonance at $h_r = \sqrt{\frac{S_{sc}}{Q_c}}$; a 7% detuning reactor tunes the branch to 3.78.`,
      ],
      example: {
        problem: r`A 1.2 Mvar bank is added on a bus of 20 MVA fault level. At what harmonic does it resonate? What discharge resistor does a 300 µF, 480 V capacitor need?`,
        solution: r`$h_r = \sqrt{\frac{20}{1.2}} = 4.08$, close to the 5th: detune it. $R \le \frac{60}{300 \times 10^{-6} \ln(679/50)} = 76.7$ kΩ.`,
      },
      traps: [r`A capacitor run below rated voltage gives much less than its nameplate kvar.`],
    },
    {
      name: 'Surge Arresters',
      inShort: r`Metal-oxide blocks that conduct only on overvoltage, clamping surges.`,
      keyIdeas: [
        r`Rated by MCOV and duty-cycle voltage, discharge current class and energy.`,
        r`Lead inductance adds $L'\ell\frac{di}{dt}$, about 1 µH/m.`,
        r`Place at transformer terminals and line entrances; ground solidly with short leads.`,
      ],
      example: {
        problem: r`An arrester has 3 m of total lead. What extra voltage reaches the equipment on a 10 kA/µs surge?`,
        solution: r`$1\ \mu\text{H/m} \times 3\ \text{m} \times 10\ \text{kA/µs} = 30$ kV.`,
      },
      traps: [r`Long arrester leads can waste most of the protective margin.`],
    },
    {
      name: 'Switchgear and Panelboards',
      inShort: r`Assemblies of switching and protective devices with their buses.`,
      keyIdeas: [
        r`Rated voltage, continuous current, short-time withstand and peak withstand.`,
        r`Busbar force $\frac{F}{\ell} = 0.2\frac{i_p^2}{d}$ N/m (kA, m), ×0.866 for the middle bar.`,
        r`Metal-clad vs metal-enclosed switchgear; panelboards for branch circuits.`,
      ],
      example: {
        problem: r`Busbars 0.2 m apart carry a 50 kA peak fault current. Find the force per metre.`,
        solution: r`$0.2 \times \frac{50^2}{0.2} = 2500$ N/m; the middle bar of a flat set gets $0.866 \times 2500 = 2165$ N/m.`,
      },
      traps: [r`Use the PEAK current: forces go with its square.`],
    },
    {
      name: 'Wires and Cables',
      inShort: r`Sized for current, voltage drop and fault withstand; insulated for voltage and heat.`,
      keyIdeas: [
        r`AWG diameter $0.127 \times 92^{(36-n)/39}$ mm; three gauges double the area.`,
        r`Fault withstand $S \ge \frac{I\sqrt t}{k}$, $k = 115$ Cu/PVC, 143 Cu/XLPE.`,
        r`Insulation stress $g = \frac{V}{x\ln(R/r)}$, highest at the conductor.`,
      ],
      example: {
        problem: r`A Cu/PVC cable must withstand 20 kA for 0.5 s. Find the minimum size. An 11 kV cable has a 0.6 cm conductor radius and 1.6 cm over the insulation: find the maximum stress.`,
        solution: r`$S \ge \frac{20{,}000\sqrt{0.5}}{115} = 123$ mm², so 150 mm². $g_{\max} = \frac{11}{0.6\ln(2.67)} = 18.7$ kV/cm.`,
      },
      traps: [r`A cable sized only for load current can burn on a fault if the protection is slow.`],
    },
    {
      name: 'Batteries and UPS',
      inShort: r`Stored energy for backup: batteries and the inverters that use them.`,
      keyIdeas: [
        r`Peukert: $t = H\left(\frac{C}{IH}\right)^k$: faster discharge, less capacity.`,
        r`UPS $\ge \frac{P}{\text{pf}}$ kVA; runtime $\frac{CV\eta\,\text{DoD}}{P}$.`,
        r`Lead-acid vs lithium: depth of discharge, life, temperature.`,
      ],
      example: {
        problem: r`A 100 Ah (20-hour) lead-acid battery with k = 1.2 is discharged at 20 A. How long does it last? A 2 kW UPS load runs from a 48 V, 100 Ah bank (90% inverter, 80% DoD): find its runtime.`,
        solution: r`$t = 20\left(\frac{100}{400}\right)^{1.2} = 3.8$ h, not 5. Runtime $= \frac{100 \times 48 \times 0.9 \times 0.8}{2000} = 1.73$ h (before the Peukert correction).`,
      },
      traps: [r`Ah ratings are at a slow rate: high-rate loads get much less.`],
    },
    {
      name: 'Lamps and Luminaires',
      inShort: r`Light sources and the fittings that hold, power and direct them.`,
      keyIdeas: [
        r`Luminaire efficiency (light output ratio) $= \frac{\Phi_{out}}{\Phi_{lamps}}$; compare luminaire lm/W.`,
        r`LED life is L70: hours to 70% output, $\frac{\ln(1/0.7)}{\alpha}$ for exponential decay.`,
        r`Drivers and ballasts add losses; check power factor and harmonics.`,
      ],
      example: {
        problem: r`A fitting with 4000 lm of lamps emits 3400 lm. An LED loses 10% of its output in 10,000 h: estimate its L70.`,
        solution: r`Efficiency 85%. $\alpha = \frac{-\ln 0.9}{10{,}000}$, so $L_{70} = \frac{\ln(1/0.7)}{\alpha} \approx 33{,}900$ h.`,
      },
      traps: [r`An LED's rated life is reduced output, not failure: it keeps running but dimmer.`],
    },
  ],
};
