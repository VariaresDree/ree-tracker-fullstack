'use strict';

// EE › Industrial Electronics formula cards (Library round, 2026-11-19): the
// topic had no cards. Uncontrolled rectifiers, ripple and PIV are in
// Electronics 1 and 2; THD and form factor in Circuits 2; constant V/f in
// Machinery 2; UPS runtime and Peukert in Apparatus & Devices; RTD,
// thermocouple, thermistor, strain gauge and PLC timing in Instrumentation &
// Control. This file adds: the SCR two-transistor model, di/dt and dv/dt
// protection, series-string derating and equalising resistors, the UJT
// oscillator; triac phase control, RC firing and integral-cycle control;
// switching and conduction loss, overdrive factor; controlled rectifiers
// (single- and three-phase, overlap, input power factor); square-wave,
// quasi-square, six-step and sine-PWM inverters; buck, boost and buck-boost
// choppers with ripple and critical inductance; cycloconverter frequency and
// voltage; converter- and chopper-fed DC drives, torque above base speed,
// acceleration time, braking resistor, static rotor resistance; UPS sizing,
// DC current, cell count and charging; Hall, capacitive, piezoelectric, LVDT
// and encoder sensors; LED wavelength, responsivity, CTR and LED resistor;
// 555 astable and monostable. See mathematics/algebra.js for the format;
// tests/industrialElectronicsFormulas.test.js checks each by simulating the
// waveform or circuit.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const TH = 'Thyristors and SCRs';
const TD = 'Triacs and Diacs';
const PT = 'Power Transistors and IGBTs';
const CR = 'Controlled Rectifiers';
const INV = 'Inverters';
const CH = 'Choppers';
const CC = 'Cycloconverters';
const MD = 'Motor Drives';
const UPS = 'UPS';
const SEN = 'Sensors';
const OPT = 'Optoelectronics';
const TP = 'Timers and PLCs';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const V_ = r`$\text{V}$`;
const A_ = r`$\text{A}$`;
const W_ = r`$\text{W}$`;
const S_ = r`$\text{s}$`;
const HZ = r`$\text{Hz}$`;
const OHM = r`$\Omega$`;
const ALPHA = v(r`$\alpha$`, 'firing (delay) angle');
const VM = v(r`$V_m$`, 'peak supply voltage', V_);
const VLL = v(r`$V_{LL}$`, 'rms line-to-line supply voltage', V_);
const VDC = v(r`$V_{dc}$`, 'DC supply voltage', V_);
const DUTY = v(r`$D$`, 'duty ratio, on-time over period');
const FS = v(r`$f$`, 'switching frequency', HZ);

const drafts = [
    // Thyristors and SCRs
    P(TH, null, 'SCR Two-Transistor Model', r`$I_A \propto \frac{1}{1 - (\alpha_1 + \alpha_2)}$`, r`$I_A = \frac{\alpha_2I_G + I_{CBO1} + I_{CBO2}}{1 - (\alpha_1 + \alpha_2)}$`,
        [v(r`$\alpha_1, \alpha_2$`, 'common-base gains of the PNP and NPN halves'), v(r`$I_G$`, 'gate current', A_), v(r`$I_{CBO1}, I_{CBO2}$`, 'leakage currents', A_)],
        'Why an SCR latches: as α₁ + α₂ approaches 1 the anode current runs away, limited only by the load.',
        'Once on, removing the gate current does nothing: the SCR stays on until the current falls below the holding current.', A_),
    P(TH, null, 'di/dt Protection Inductor', r`$L \ge \frac{V_s}{(di/dt)_{max}}$`, r`$L_s \ge \frac{V_s}{(di/dt)_{max}}$`,
        [v(r`$V_s$`, 'supply voltage across the device at turn-on', V_), v(r`$(di/dt)_{max}$`, 'rated maximum rate of rise of current', r`$\text{A/µs}$`)],
        'A series inductor that keeps the current from rising faster than the SCR can spread its conduction.',
        'Too fast a di/dt makes a hot spot near the gate before the whole junction conducts.', r`$\text{H}$`),
    P(TH, null, 'RC Snubber for dv/dt', r`$\frac{dv}{dt} \approx \frac{0.632V_s}{R_sC_s}$`, r`$\frac{dv}{dt} \approx \frac{0.632\,V_s}{R_sC_s},\qquad R_s \ge \frac{V_s}{I_{TD}}$`,
        [v(r`$V_s$`, 'supply voltage', V_), v(r`$R_s, C_s$`, 'snubber resistance and capacitance'), v(r`$I_{TD}$`, 'allowed capacitor discharge current at turn-on', A_)],
        'An RC across the SCR slows the voltage rise that could falsely trigger it; R limits the discharge when it fires.',
        'The capacitor reaches 63.2% of Vs in one time constant, which sets the average dv/dt.', r`$\text{V/s}$`),
    P(TH, null, 'Series and Parallel String Derating', r`$\text{DRF} = 1 - \frac{V_s}{n_sV_{DRM}}$`, r`$\text{DRF}_{series} = 1 - \frac{V_s}{n_sV_{DRM}},\qquad \text{DRF}_{parallel} = 1 - \frac{I_T}{n_pI_{TM}}$`,
        [v(r`$V_s, I_T$`, 'string voltage and current'), v(r`$n_s, n_p$`, 'devices in series and in parallel'), v(r`$V_{DRM}, I_{TM}$`, 'one device\'s voltage and current ratings')],
        'How much of the combined rating a string leaves unused to allow for unequal sharing.',
        'A higher derating factor means more devices than the bare minimum, for reliability.'),
    P(TH, null, 'Static Voltage-Equalising Resistor', r`$R = \frac{n_sV_{D,max} - V_s}{(n_s - 1)\Delta I_D}$`, r`$R = \frac{n_sV_{D,max} - V_s}{(n_s - 1)\,\Delta I_D}$`,
        [v(r`$n_s$`, 'SCRs in series'), v(r`$V_{D,max}$`, 'highest voltage one device may block', V_), v(r`$V_s$`, 'string voltage', V_), v(r`$\Delta I_D$`, 'spread in leakage current', A_)],
        'The largest shunt resistor across each SCR that keeps the lowest-leakage device within its rating.',
        'The device with the LEAST leakage takes the most voltage; dynamic sharing needs a capacitor too.', OHM),
    P(TH, null, 'UJT Relaxation Oscillator', r`$f = \frac{1}{RC\ln\frac{1}{1 - \eta}}$`, r`$f = \frac{1}{RC\ln\frac{1}{1 - \eta}},\qquad V_P = \eta V_{BB} + V_D,\qquad \frac{V_{BB} - V_V}{I_V} < R < \frac{V_{BB} - V_P}{I_P}$`,
        [v(r`$\eta$`, 'intrinsic stand-off ratio'), v(r`$R, C$`, 'timing resistor and capacitor'), v(r`$V_P, V_V$`, 'peak and valley voltages', V_), v(r`$I_P, I_V$`, 'peak and valley currents', A_)],
        'A capacitor charges until the UJT fires at Vp, discharges into the gate, and repeats: a pulse train for SCR triggering.',
        'R outside its range: too large and the UJT never fires, too small and it never turns off.', HZ),
    // Triacs and Diacs
    P(TD, null, 'AC Phase Control Output (Resistive Load)', r`$V_o = V_s\sqrt{(\pi - \alpha + \tfrac12\sin2\alpha)/\pi}$`, r`$V_o = V_s\sqrt{\frac{1}{\pi}\left(\pi - \alpha + \frac{\sin 2\alpha}{2}\right)},\qquad P = \frac{V_o^2}{R}$`,
        [v(r`$V_s$`, 'rms supply voltage', V_), ALPHA, v(r`$R$`, 'load resistance', OHM)],
        'The rms output of a triac (or two antiparallel SCRs) fired at α in both half-cycles.',
        'At α = 90° the output is 0.707 Vs and the power is half of full.', V_),
    P(TD, null, 'RC Phase-Shift Firing Network', r`$\theta = -\tan^{-1}\omega RC$`, r`$V_C = \frac{V_s}{\sqrt{1 + (\omega RC)^2}}\ \angle{-\tan^{-1}(\omega RC)}$`,
        [v(r`$V_s$`, 'supply voltage', V_), v(r`$R, C$`, 'firing network resistance and capacitance'), v(r`$\omega$`, 'supply angular frequency', r`$\text{rad/s}$`)],
        'The capacitor voltage lags the supply, so the diac breaks over (and fires the triac) later in each half-cycle.',
        'Raising R delays the firing and dims the lamp; a single RC gives at most about 90° of delay.', V_),
    P(TD, null, 'Integral-Cycle (Burst) Control', r`$V_o = V_s\sqrt{\frac{n}{n + m}}$`, r`$V_o = V_s\sqrt{k},\quad P = kP_{full},\qquad k = \frac{n}{n + m}$`,
        [v(r`$n, m$`, 'cycles on and cycles off'), v(r`$V_s$`, 'rms supply voltage', V_), v(r`$P_{full}$`, 'power with the switch always on', W_)],
        'Switch whole cycles on and off at zero crossings: power in proportion to the on-cycles, with little interference.',
        'Suits heaters with long thermal time constants, not lamps (they flicker).', V_),
    // Power Transistors and IGBTs
    P(PT, null, 'Switching Loss', r`$P_{sw} = \frac{1}{2}V_dI_o(t_{on} + t_{off})f_s$`, r`$P_{sw} = \tfrac12V_dI_o(t_{on} + t_{off})f_s\quad (\text{inductive, clamped});\qquad \tfrac16V_dI_o(t_{on} + t_{off})f_s\quad (\text{resistive})$`,
        [v(r`$V_d, I_o$`, 'off-state voltage and on-state current'), v(r`$t_{on}, t_{off}$`, 'switching times', S_), v(r`$f_s$`, 'switching frequency', HZ)],
        'Energy lost each time the switch crosses between full voltage and full current, times the switching rate.',
        'Switching loss grows with frequency; conduction loss does not. That trade-off sets the switching frequency.', W_),
    P(PT, null, 'Conduction Loss (MOSFET and IGBT)', r`$P = V_{CE0}I_{av} + r_{CE}I_{rms}^2$`, r`$P_{MOSFET} = I_{rms}^2R_{DS(on)},\qquad P_{IGBT} = V_{CE0}I_{av} + r_{CE}I_{rms}^2$`,
        [v(r`$I_{rms}, I_{av}$`, 'rms and average device current', A_), v(r`$R_{DS(on)}$`, 'MOSFET on-resistance', OHM), v(r`$V_{CE0}, r_{CE}$`, 'IGBT knee voltage and slope resistance')],
        'Loss while the switch is on: a resistor for a MOSFET, a knee voltage plus resistor for an IGBT.',
        'R_DS(on) roughly doubles from 25 °C to 125 °C: use the hot value.', W_),
    P(PT, null, 'Overdrive Factor and Forced Beta', r`$\text{ODF} = \frac{I_B\beta}{I_{CS}}$`, r`$I_{BS} = \frac{I_{CS}}{\beta_{min}},\qquad \text{ODF} = \frac{I_B}{I_{BS}},\qquad \beta_{forced} = \frac{I_{CS}}{I_B}$`,
        [v(r`$I_{CS}$`, 'collector current in saturation', A_), v(r`$I_B, I_{BS}$`, 'actual base current and the minimum for saturation', A_), v(r`$\beta_{min}$`, 'minimum current gain')],
        'How hard a power BJT is driven into saturation.',
        'More overdrive lowers V_CE(sat) but slows turn-off (more stored charge).'),
    // Controlled Rectifiers
    P(CR, 'Single-phase', 'Half-Wave Controlled Rectifier (R Load)', r`$V_{dc} = \frac{V_m}{2\pi}(1 + \cos\alpha)$`, r`$V_{dc} = \frac{V_m}{2\pi}(1 + \cos\alpha)$`,
        [VM, ALPHA],
        'Average output of one SCR feeding a resistor.',
        'At α = 0 it is the diode value Vm/π; at α = 180° it is zero.', V_),
    P(CR, 'Single-phase', 'Single-Phase Full Converter', r`$V_{dc} = \frac{2V_m}{\pi}\cos\alpha$`, r`$V_{dc} = \frac{2V_m}{\pi}\cos\alpha = 0.9V_s\cos\alpha\quad (\text{continuous current})$`,
        [VM, ALPHA, v(r`$V_s$`, 'rms supply voltage', V_)],
        'Four SCRs with a highly inductive load: the output follows cos α and goes negative past 90°.',
        'α > 90° makes Vdc negative: with a source in the load (a motor) the converter inverts, sending power back.', V_),
    P(CR, 'Single-phase', 'Single-Phase Semi-Converter', r`$V_{dc} = \frac{V_m}{\pi}(1 + \cos\alpha)$`, r`$V_{dc} = \frac{V_m}{\pi}(1 + \cos\alpha)$`,
        [VM, ALPHA],
        'Two SCRs and two diodes: the diodes freewheel, so the output never goes negative.',
        'One-quadrant only (no inversion), but a better input power factor than the full converter.', V_),
    P(CR, 'Three-phase', 'Three-Phase Full Converter', r`$V_{dc} = \frac{3\sqrt2V_{LL}}{\pi}\cos\alpha$`, r`$V_{dc} = \frac{3\sqrt2\,V_{LL}}{\pi}\cos\alpha = 1.35V_{LL}\cos\alpha$`,
        [VLL, ALPHA],
        'Six SCRs, six pulses per cycle: the standard converter for DC drives and HVDC.',
        'Ripple is at 6f; the half-wave (three-pulse) version gives 1.17 V_ph cos α.', V_),
    P(CR, 'Three-phase', 'Three-Phase Half-Wave Converter', r`$V_{dc} = \frac{3\sqrt3V_m}{2\pi}\cos\alpha$`, r`$V_{dc} = \frac{3\sqrt3\,V_m}{2\pi}\cos\alpha = 1.17V_{ph}\cos\alpha$`,
        [v(r`$V_m$`, 'peak phase voltage', V_), v(r`$V_{ph}$`, 'rms phase voltage', V_), ALPHA],
        'Three SCRs to a neutral: three pulses per cycle.',
        'Its DC current flows in the transformer neutral, magnetising the core: rarely used at high power.', V_),
    P(CR, 'Three-phase', 'Commutation Overlap', r`$V_{dc} = 1.35V_{LL}\cos\alpha - \frac{3\omega L_sI_d}{\pi}$`, r`$V_{dc} = 1.35V_{LL}\cos\alpha - \frac{3\omega L_s}{\pi}I_d,\qquad \cos\alpha - \cos(\alpha + \mu) = \frac{\sqrt2\,\omega L_sI_d}{V_{LL}}$`,
        [VLL, ALPHA, v(r`$L_s$`, 'source inductance per phase', r`$\text{H}$`), v(r`$I_d$`, 'DC current', A_), v(r`$\mu$`, 'overlap angle')],
        'Source inductance makes current transfer between phases take an angle μ, which costs output voltage.',
        'The drop acts like a resistance 3ωLs/π that dissipates nothing.', V_),
    P(CR, null, 'Input Power Factor of a Full Converter', r`$\text{PF} = 0.9\cos\alpha$ (1φ), $0.955\cos\alpha$ (3φ)`, r`$\text{PF} = \frac{2\sqrt2}{\pi}\cos\alpha = 0.9\cos\alpha\ (1\phi),\qquad \text{PF} = \frac{3}{\pi}\cos\alpha = 0.955\cos\alpha\ (3\phi)$`,
        [ALPHA],
        'With a smooth DC current the line current is a square (or 120°) wave: distortion factor times displacement factor cos α.',
        'Deep phase control (large α) gives a poor power factor at low output voltage.'),
    // Inverters
    P(INV, null, 'Square-Wave Inverter Harmonics', r`$V_{n} = \frac{4V_{dc}}{n\pi\sqrt2} = \frac{0.9V_{dc}}{n}$`, r`$V_{n,rms} = \frac{4V_{dc}}{n\pi\sqrt2} = \frac{0.9V_{dc}}{n}\ (n \text{ odd}),\qquad V_{o,rms} = V_{dc}\quad (\text{full bridge})$`,
        [VDC, v(r`$n$`, 'harmonic order')],
        'A full-bridge square wave: only odd harmonics, each 1/n of the fundamental.',
        'A half bridge gives half these values. The square wave\'s THD is 48.3%.', V_),
    P(INV, null, 'Quasi-Square-Wave Inverter', r`$V_n = \frac{4V_{dc}}{n\pi}\sin n\delta$`, r`$V_{n,peak} = \frac{4V_{dc}}{n\pi}\sin(n\delta)\quad (\text{pulse width } 2\delta)$`,
        [VDC, v(r`$\delta$`, 'half the pulse width'), v(r`$n$`, 'harmonic order')],
        'Narrowing the pulse controls the output and can cancel a chosen harmonic.',
        'A 120° pulse (δ = 60°) removes the 3rd harmonic and its multiples.', V_),
    P(INV, null, 'Six-Step Three-Phase Inverter', r`$V_{LL1} = \frac{\sqrt6}{\pi}V_{dc} = 0.78V_{dc}$`, r`$V_{LL1,rms} = \frac{\sqrt6}{\pi}V_{dc} = 0.78V_{dc},\quad V_{LL,rms} = \sqrt{\tfrac23}V_{dc} = 0.816V_{dc},\quad V_{ph,rms} = \frac{\sqrt2}{3}V_{dc} = 0.471V_{dc}$`,
        [VDC],
        'A three-phase bridge with 180° conduction: stepped phase voltages, no triplen harmonics.',
        'Harmonics left are 5, 7, 11, 13… (6k ± 1).', V_),
    P(INV, null, 'Sinusoidal PWM', r`$V_{LL1} = 0.612\,m_aV_{dc}$`, r`$m_a = \frac{V_{ref}}{V_{carrier}},\ m_f = \frac{f_{carrier}}{f_{ref}};\quad \hat V_{1} = m_a\frac{V_{dc}}{2}\ (\text{leg}),\quad V_{LL1,rms} = 0.612\,m_aV_{dc}$`,
        [v(r`$m_a$`, 'amplitude modulation index (linear up to 1)'), v(r`$m_f$`, 'frequency modulation ratio'), VDC],
        'Compare a sine reference with a triangle carrier: the fundamental follows m_a, harmonics move up near m_f.',
        'Above m_a = 1 (overmodulation) the fundamental stops rising linearly and low harmonics return.', V_),
    // Choppers
    P(CH, null, 'Buck (Step-Down) Chopper', r`$V_o = DV_s,\ \Delta I_L = \frac{V_sD(1 - D)}{Lf}$`, r`$V_o = DV_s,\qquad \Delta I_L = \frac{V_sD(1 - D)}{Lf}$`,
        [v(r`$V_s$`, 'input voltage', V_), DUTY, v(r`$L$`, 'inductance', r`$\text{H}$`), FS],
        'Output is the input chopped to its average; the inductor smooths the current.',
        'Inductor ripple is largest at D = 0.5.', V_),
    P(CH, null, 'Buck Output Voltage Ripple', r`$\frac{\Delta V_o}{V_o} = \frac{1 - D}{8LCf^2}$`, r`$\frac{\Delta V_o}{V_o} = \frac{1 - D}{8LCf^2}$`,
        [DUTY, v(r`$L, C$`, 'filter inductance and capacitance'), FS],
        'Peak-to-peak capacitor ripple of a buck converter in continuous conduction.',
        'Doubling the frequency quarters the ripple: why converters switch fast.'),
    P(CH, null, 'Boost (Step-Up) Chopper', r`$V_o = \frac{V_s}{1 - D}$`, r`$V_o = \frac{V_s}{1 - D},\qquad \Delta I_L = \frac{V_sD}{Lf},\qquad \Delta V_o = \frac{V_oD}{RCf}$`,
        [v(r`$V_s$`, 'input voltage', V_), DUTY, v(r`$L, C, R$`, 'inductance, capacitance, load'), FS],
        'The inductor stores energy while the switch is on and adds it to the source when off.',
        'Input current is continuous, output current is pulsed: the capacitor does the work.', V_),
    P(CH, null, 'Buck-Boost Chopper', r`$V_o = -\frac{DV_s}{1 - D}$`, r`$V_o = -\frac{D}{1 - D}V_s,\qquad \Delta I_L = \frac{V_sD}{Lf}$`,
        [v(r`$V_s$`, 'input voltage', V_), DUTY, v(r`$L$`, 'inductance', r`$\text{H}$`), FS],
        'Steps up or down with reversed polarity: below the input for D < 0.5, above for D > 0.5.',
        'The Ćuk converter has the same ratio with smoother input and output currents.', V_),
    P(CH, null, 'Critical Inductance for Continuous Conduction', r`$L_c = \frac{(1 - D)R}{2f}$`, r`$L_{c,buck} = \frac{(1 - D)R}{2f},\qquad L_{c,boost} = \frac{D(1 - D)^2R}{2f}$`,
        [DUTY, v(r`$R$`, 'load resistance', OHM), FS],
        'The smallest inductance that keeps the inductor current from reaching zero.',
        'At light load (large R) a converter falls into discontinuous mode and its ratio changes.', r`$\text{H}$`),
    // Cycloconverters
    P(CC, null, 'Step-Down Cycloconverter Frequency', r`$f_o = \frac{f_s}{N}$`, r`$f_o = \frac{f_s}{N}$`,
        [v(r`$f_s$`, 'supply frequency', HZ), v(r`$N$`, 'supply half-cycles per output half-cycle')],
        'A cycloconverter builds each output half-cycle from whole pieces of the supply.',
        'Practical output is kept below about a third of the supply frequency to limit distortion.', HZ),
    P(CC, null, 'Cycloconverter Output Voltage', r`$V_o = rV_{ph}\frac{p}{\pi}\sin\frac{\pi}{p}$`, r`$V_{o,rms} = r\,V_{ph}\,\frac{p}{\pi}\sin\frac{\pi}{p}$`,
        [v(r`$r$`, 'voltage reduction factor (≤ 1)'), v(r`$V_{ph}$`, 'rms input phase voltage', V_), v(r`$p$`, 'pulse number of each converter')],
        'Each phase is a dual converter whose firing angle swings sinusoidally; its peak is the p-pulse DC voltage.',
        'For p = 3 the factor is 0.827, the same as the three-pulse rectifier\'s 1.17/√2.', V_),
    // Motor Drives
    P(MD, null, 'Converter-Fed DC Motor Speed', r`$\omega = \frac{V_{dc}(\alpha) - I_aR_a}{K\phi}$`, r`$\omega = \frac{V_{dc}(\alpha) - I_aR_a}{K\phi},\qquad V_{dc}(\alpha) = \frac{2V_m}{\pi}\cos\alpha\ \text{or}\ 1.35V_{LL}\cos\alpha$`,
        [v(r`$V_{dc}(\alpha)$`, 'converter output voltage', V_), v(r`$I_a, R_a$`, 'armature current and resistance'), v(r`$K\phi$`, 'motor constant times flux', r`$\text{V·s/rad}$`)],
        'Phase control of the armature voltage sets the speed of a separately excited DC motor.',
        'Torque is Kφ·Ia: set by the load, not by α.', r`$\text{rad/s}$`),
    P(MD, null, 'Chopper-Fed DC Motor and Regeneration', r`$V_a = DV_s;\ E_a - I_aR_a = (1 - D)V_s$`, r`$\text{motoring: } V_a = DV_s;\qquad \text{regenerating: } E_a - I_aR_a = (1 - D)V_s$`,
        [v(r`$V_s$`, 'DC supply voltage', V_), DUTY, v(r`$E_a$`, 'back EMF', V_), v(r`$I_a, R_a$`, 'armature current and resistance')],
        'A buck chopper drives the motor; run as a boost chopper it returns braking energy to the supply.',
        'Regeneration stops when the back EMF can no longer drive current: at low speed, use dynamic braking.', V_),
    P(MD, null, 'Breakdown Torque Above Base Speed', r`$\frac{T_{max2}}{T_{max1}} = \left(\frac{f_1}{f_2}\right)^2$`, r`$T_{max} \propto \left(\frac{V}{f}\right)^2 \implies \frac{T_{max2}}{T_{max1}} = \left(\frac{f_1}{f_2}\right)^2\quad (V \text{ fixed above base speed})$`,
        [v(r`$f_1, f_2$`, 'base and new supply frequency', HZ), v(r`$T_{max}$`, 'breakdown torque', r`$\text{N·m}$`)],
        'Above base speed the inverter can\'t raise the voltage, so the flux and breakdown torque fall.',
        'Rated torque falls as 1/f (constant power); breakdown torque falls faster, as 1/f².'),
    P(MD, null, 'Drive Acceleration Time', r`$t = \frac{J\Delta\omega}{T_m - T_L}$`, r`$t = \frac{J(\omega_2 - \omega_1)}{T_m - T_L}\quad (\text{constant torques})$`,
        [v(r`$J$`, 'total inertia at the motor shaft', r`$\text{kg·m}^2$`), v(r`$\omega_1, \omega_2$`, 'initial and final speeds', r`$\text{rad/s}$`), v(r`$T_m, T_L$`, 'motor and load torques', r`$\text{N·m}$`)],
        'The surplus torque accelerates the inertia.',
        'Include the load\'s inertia reflected through gears (times the ratio squared).', S_),
    P(MD, null, 'Braking Resistor', r`$R_b \le \frac{V_{dc}^2}{P_{b,peak}}$`, r`$E = \tfrac12J(\omega_1^2 - \omega_2^2),\qquad R_b \le \frac{V_{dc}^2}{P_{b,peak}}$`,
        [v(r`$J$`, 'inertia', r`$\text{kg·m}^2$`), v(r`$\omega_1, \omega_2$`, 'speeds before and after braking', r`$\text{rad/s}$`), v(r`$V_{dc}$`, 'DC bus voltage at which the brake chopper works', V_), v(r`$P_{b,peak}$`, 'peak braking power', W_)],
        'Kinetic energy that must be burned in the DC-bus resistor when the drive brakes without regeneration.',
        'Peak power is torque times speed at the START of braking; size the resistor\'s rating on the average.', OHM),
    P(MD, null, 'Static Rotor Resistance Control', r`$R_{eq} = 0.5R(1 - D)$`, r`$R_{eq,phase} = 0.5\,R\,(1 - D)$`,
        [v(r`$R$`, 'external resistor after the rotor rectifier', OHM), v(r`$D$`, 'chopper duty ratio (shorting R)')],
        'A chopper across a resistor behind the rotor rectifier varies a slip-ring motor\'s effective rotor resistance.',
        'Speed control by wasting slip power: efficient only near full speed. Slip power recovery returns it instead.', OHM),
    // UPS
    P(UPS, null, 'UPS Sizing', r`$S_{UPS} \ge k\frac{P}{\text{pf}}$`, r`$S_{UPS} \ge k\,\frac{P_{load}}{\text{pf}},\qquad k \approx 1.2\text{–}1.25$`,
        [v(r`$P_{load}$`, 'total real power of the loads', W_), v(r`$\text{pf}$`, 'load power factor'), v(r`$k$`, 'design margin for growth and inrush')],
        'Choose a UPS on both its kVA and kW ratings, with headroom.',
        'Check the kW rating too: many UPSs are rated 0.8–0.9 pf, so kW limits before kVA.', r`$\text{VA}$`),
    P(UPS, null, 'Inverter DC Input Current', r`$I_{dc} = \frac{P_{out}}{\eta V_{dc}}$`, r`$I_{dc} = \frac{P_{out}}{\eta\,V_{dc}}$`,
        [v(r`$P_{out}$`, 'inverter output power', W_), v(r`$\eta$`, 'inverter efficiency'), v(r`$V_{dc}$`, 'battery voltage', V_)],
        'The battery current the inverter draws, which sizes cables, fuses and the battery.',
        'Use the END-of-discharge voltage: the current is highest when the battery is nearly empty.', A_),
    P(UPS, null, 'Number of Battery Cells', r`$n = \frac{V_{dc,min}}{V_{end}}$`, r`$n = \frac{V_{dc,min}}{V_{end/cell}},\qquad n\,V_{float/cell} \le V_{dc,max}$`,
        [v(r`$V_{dc,min}, V_{dc,max}$`, 'inverter\'s DC input window', V_), v(r`$V_{end/cell}$`, 'end voltage per cell (1.75 V lead-acid)', V_), v(r`$V_{float/cell}$`, 'float voltage per cell (about 2.25 V)', V_)],
        'Enough cells to stay above the inverter\'s minimum at the end of discharge, few enough not to exceed its maximum on float.',
        'Lead-acid: 2 V nominal, about 2.25 V float, 1.75 V end per cell.'),
    P(UPS, null, 'Battery Charging Time', r`$t = \frac{kC}{I}$`, r`$t = \frac{k\,C}{I_{charge}},\qquad k \approx 1.1\text{–}1.4$`,
        [v(r`$C$`, 'capacity to replace', r`$\text{Ah}$`), v(r`$I_{charge}$`, 'charging current', A_), v(r`$k$`, 'charge factor for losses')],
        'Charging must put back more ampere-hours than were taken out.',
        'Lead-acid charges slowly near full (constant-voltage stage): real time is longer than kC/I.', r`$\text{h}$`),
    // Sensors
    P(SEN, null, 'Hall Effect Voltage', r`$V_H = \frac{IB}{nqt}$`, r`$V_H = \frac{IB}{nqt} = R_H\frac{IB}{t},\qquad R_H = \frac{1}{nq}$`,
        [v(r`$I$`, 'current through the plate', A_), v(r`$B$`, 'flux density', r`$\text{T}$`), v(r`$n$`, 'carrier density', r`$\text{m}^{-3}$`), v(r`$t$`, 'plate thickness', r`$\text{m}$`)],
        'A magnetic field pushes moving carriers to one side, giving a voltage across the plate.',
        'Semiconductors (low n) give far larger Hall voltages than metals: used for current and position sensing.', V_),
    P(SEN, null, 'Capacitive Displacement Sensor', r`$\frac{\Delta C}{C} \approx -\frac{\Delta d}{d}$`, r`$C = \frac{\varepsilon_0\varepsilon_rA}{d},\qquad \frac{\Delta C}{C} \approx -\frac{\Delta d}{d}$`,
        [v(r`$A$`, 'plate overlap area', r`$\text{m}^2$`), v(r`$d$`, 'plate gap', r`$\text{m}$`), v(r`$\varepsilon_r$`, 'relative permittivity')],
        'Gap changes change the capacitance: a sensitive, non-contact displacement or level sensor.',
        'C varies as 1/d, so it is linear only for small moves; area-change sensors are linear.', r`$\text{F}$`),
    P(SEN, null, 'Piezoelectric Sensor', r`$Q = dF,\ V = \frac{dF}{C}$`, r`$Q = dF,\qquad V = \frac{Q}{C} = \frac{gFt}{A},\qquad g = \frac{d}{\varepsilon_0\varepsilon_r}$`,
        [v(r`$d$`, 'charge sensitivity', r`$\text{C/N}$`), v(r`$F$`, 'force', r`$\text{N}$`), v(r`$t, A$`, 'crystal thickness and area'), v(r`$g$`, 'voltage sensitivity', r`$\text{V·m/N}$`)],
        'Force on a crystal produces charge: ideal for vibration, pressure and force changes.',
        'Charge leaks away through the input resistance: piezo sensors cannot measure static force.', V_),
    P(SEN, null, 'LVDT Output', r`$V_o = S\,V_{ex}\,x$`, r`$V_o = S\,V_{ex}\,x\quad (\text{phase flips through the null})$`,
        [v(r`$S$`, 'sensitivity', r`$\text{mV/V/mm}$`), v(r`$V_{ex}$`, 'excitation voltage', V_), v(r`$x$`, 'core displacement from null', r`$\text{mm}$`)],
        'Two secondaries in series opposition: output proportional to core position, phase giving the direction.',
        'Needs a phase-sensitive demodulator to tell which side of null the core is on.', r`$\text{mV}$`),
    P(SEN, null, 'Incremental Encoder Speed and Resolution', r`$N = \frac{60f}{\text{PPR}}$`, r`$N = \frac{60f}{\text{PPR}}\ \text{rpm},\qquad \text{resolution} = \frac{360°}{4\,\text{PPR}}\ (\text{quadrature})$`,
        [v(r`$f$`, 'pulse frequency', HZ), v(r`$\text{PPR}$`, 'pulses per revolution')],
        'Count pulses from a slotted disc for speed and position; two channels in quadrature give direction.',
        'Quadrature decoding counts all four edges: four times the PPR.', r`$\text{rpm}$`),
    // Optoelectronics
    P(OPT, null, 'LED Wavelength from Band Gap', r`$\lambda = \frac{hc}{E_g} = \frac{1.24}{E_g}$ µm`, r`$\lambda = \frac{hc}{E_g},\qquad \lambda(\mu\text{m}) = \frac{1.24}{E_g(\text{eV})}$`,
        [v(r`$E_g$`, 'band-gap energy', r`$\text{eV}$`), v(r`$h, c$`, 'Planck constant, speed of light')],
        'The photon an LED emits (or a photodiode can absorb) has about the band-gap energy.',
        'GaAs (1.43 eV) gives 0.87 µm infrared; a wider gap gives shorter (bluer) light.', r`$\mu\text{m}$`),
    P(OPT, null, 'Photodiode Responsivity', r`$R = \frac{I_p}{P} = \frac{\eta\lambda}{1.24}$`, r`$\mathcal{R} = \frac{I_p}{P_{opt}} = \frac{\eta q\lambda}{hc} = \frac{\eta\,\lambda(\mu\text{m})}{1.24}$`,
        [v(r`$I_p$`, 'photocurrent', A_), v(r`$P_{opt}$`, 'incident optical power', W_), v(r`$\eta$`, 'quantum efficiency'), v(r`$\lambda$`, 'wavelength', r`$\mu\text{m}$`)],
        'Amps of photocurrent per watt of light.',
        'Responsivity rises with wavelength up to the band-gap cutoff, then drops to zero.', r`$\text{A/W}$`),
    P(OPT, null, 'Optocoupler Current Transfer Ratio', r`$\text{CTR} = \frac{I_C}{I_F}\times100\%$`, r`$\text{CTR} = \frac{I_C}{I_F} \times 100\%$`,
        [v(r`$I_C$`, 'output transistor current', A_), v(r`$I_F$`, 'LED forward current', A_)],
        'How much output current an optocoupler gives per unit of LED current, across an isolation barrier.',
        'CTR falls with age and temperature: design with the minimum, not the typical.'),
    P(OPT, null, 'LED Series Resistor', r`$R = \frac{V_s - nV_F}{I_F}$`, r`$R = \frac{V_s - nV_F}{I_F},\qquad P_R = I_F^2R$`,
        [v(r`$V_s$`, 'supply voltage', V_), v(r`$n$`, 'LEDs in series'), v(r`$V_F$`, 'forward voltage per LED', V_), v(r`$I_F$`, 'forward current', A_)],
        'The resistor that sets an LED string\'s current.',
        'Round R UP to the next standard value so the current stays at or below I_F.', OHM),
    // Timers and PLCs
    P(TP, null, '555 Astable Multivibrator', r`$f = \frac{1.44}{(R_A + 2R_B)C}$`, r`$t_H = 0.693(R_A + R_B)C,\quad t_L = 0.693R_BC,\quad f = \frac{1.44}{(R_A + 2R_B)C}$`,
        [v(r`$R_A, R_B$`, 'timing resistors', OHM), v(r`$C$`, 'timing capacitor', r`$\text{F}$`)],
        'The capacitor cycles between ⅓ and ⅔ of the supply: charging through RA + RB, discharging through RB.',
        'Duty cycle (RA + RB)/(RA + 2RB) is always above 50% unless a diode bypasses RB.', HZ),
    P(TP, null, '555 Monostable Pulse Width', r`$t = 1.1RC$`, r`$t = RC\ln3 \approx 1.1RC$`,
        [v(r`$R$`, 'timing resistor', OHM), v(r`$C$`, 'timing capacitor', r`$\text{F}$`)],
        'One trigger gives one output pulse while the capacitor charges from 0 to ⅔ of the supply.',
        'The width does not depend on the supply voltage: the thresholds scale with it.', S_),
];

module.exports = { subject: 'EE', topic: 'Industrial Electronics', migration: '20270109000000_cards_industrial_electronics', file, revisions, retire, drafts };
