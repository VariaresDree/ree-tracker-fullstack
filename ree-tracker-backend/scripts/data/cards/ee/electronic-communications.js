'use strict';

// EE › Fundamentals of Electronic Communications formula cards (Library
// round, 2026-11-19): the topic had no cards. Voltage gain in dB is in
// Electronics 1 and 2; sampling, aliasing and quantization SNR in
// Instrumentation & Control; the reflection coefficient and travelling-wave
// velocity in Transients; skin depth and intrinsic impedance in
// Electromagnetism; Snell's law, critical angle, Doppler and Kepler in ESAS
// Physics; Hamming codes in ESAS Microprocessors. This file adds: dBm and
// cascaded dB, the pulse-train spectrum; thermal and shot noise, noise figure
// and temperature, Friis' noise formula; AM index, power, bandwidth and
// multitone; SSB and DSB-SC savings, PEP; FM index, Carson's rule, Bessel
// sidebands, pre-emphasis; PCM rate and bandwidth, quantization step,
// µ-law; bits per symbol, Shannon and Nyquist capacity, raised-cosine
// bandwidth, Eb/N0, BPSK error rate; FDM, TDM (T1/E1) and WDM spacing; coax
// and twin-lead impedance, velocity factor, VSWR and return loss, input
// impedance, quarter-wave transformer; dipoles, short-dipole radiation
// resistance, antenna efficiency, dish gain and beamwidth, effective
// aperture; path loss, Friis transmission, radio horizon, critical frequency
// and MUF, field strength; numerical aperture, V-number, modal dispersion,
// fiber loss budget; geostationary orbit, satellite link budget, cellular
// reuse, Erlang traffic; stop-and-wait efficiency, asynchronous framing.
// See mathematics/algebra.js for the format; tests/
// electronicCommunicationsFormulas.test.js checks each by building the
// signal, integrating the field or simulating the line.

const r = String.raw;
const v = (symbol, meaning, unit = null) => ({ symbol, meaning, unit });

const SIG = 'Signals, Spectrum and Decibels';
const NO = 'Noise';
const AM = 'Amplitude Modulation';
const SSB = 'Single Sideband';
const FM = 'Frequency Modulation';
const PCM = 'Sampling and PCM';
const DM = 'Digital Modulation';
const MUX = 'Multiplexing';
const TL = 'Transmission Lines';
const ANT = 'Antennas';
const PROP = 'Radio Wave Propagation';
const FO = 'Fiber Optics';
const SAT = 'Satellite and Cellular';
const DC = 'Data Communications';

const file = [];
const revisions = [];
const retire = [];

const P = (subtopic, group, name, symbol, f, vars, d, tip, unit = null) => ({ kind: 'formula', subtopic, group, name, symbol, f, vars, d, tip, unit, dim: !unit });

const W_ = r`$\text{W}$`;
const V_ = r`$\text{V}$`;
const HZ = r`$\text{Hz}$`;
const DB = r`$\text{dB}$`;
const OHM = r`$\Omega$`;
const M_ = r`$\text{m}$`;
const BPS = r`$\text{bit/s}$`;
const LAMBDA = v(r`$\lambda$`, 'wavelength', M_);
const BW = v(r`$B$`, 'bandwidth', HZ);
const MI = v(r`$m$`, 'modulation index (0 to 1)');
const GAMMA = v(r`$|\Gamma|$`, 'magnitude of the reflection coefficient');

const drafts = [
    // Signals, Spectrum and Decibels
    P(SIG, null, 'Decibel Power Levels (dBm and dBW)', r`$P_{dBm} = 10\log\frac{P}{1\ \text{mW}}$`, r`$\text{dB} = 10\log\frac{P_2}{P_1},\qquad P_{dBm} = 10\log\frac{P}{1\ \text{mW}},\qquad P_{dBW} = P_{dBm} - 30$`,
        [v(r`$P$`, 'power', W_), v(r`$P_1, P_2$`, 'powers compared', W_)],
        'Power relative to 1 mW or 1 W on a log scale: 0 dBm = 1 mW, 30 dBm = 1 W.',
        '+3 dB doubles the power, +10 dB is ten times; dBm + dB = dBm, but dBm + dBm is meaningless.', r`$\text{dBm}$`),
    P(SIG, null, 'Gains and Losses Through a Chain', r`$G_{total} = G_1 + G_2 - L_1 + \cdots$ (dB)`, r`$P_{out}(\text{dBm}) = P_{in}(\text{dBm}) + \sum G_i(\text{dB}) - \sum L_j(\text{dB})$`,
        [v(r`$G_i$`, 'stage gains', DB), v(r`$L_j$`, 'losses (cables, splitters, paths)', DB)],
        'In decibels, multiplying gains becomes adding them.',
        'Convert to dB once at the start and back at the end; never add plain ratios.', r`$\text{dBm}$`),
    P(SIG, null, 'Spectrum of a Rectangular Pulse Train', r`$C_n = \frac{A\tau}{T}\,\frac{\sin(n\pi\tau/T)}{n\pi\tau/T}$`, r`$C_n = \frac{A\tau}{T}\,\text{sinc}\!\left(\frac{n\tau}{T}\right),\qquad \text{lines every } \frac1T,\ \text{nulls every } \frac1\tau$`,
        [v(r`$A$`, 'pulse height', V_), v(r`$\tau$`, 'pulse width', r`$\text{s}$`), v(r`$T$`, 'period', r`$\text{s}$`)],
        'A pulse train\'s harmonics sit at multiples of 1/T under a sin x/x envelope.',
        'Narrower pulses spread the spectrum wider: bandwidth ≈ 1/τ.', V_),
    // Noise
    P(NO, null, 'Thermal (Johnson) Noise', r`$P_n = kTB,\ V_n = \sqrt{4kTRB}$`, r`$P_n = kTB,\qquad V_n = \sqrt{4kTRB}$`,
        [v(r`$k$`, 'Boltzmann constant, 1.38 × 10⁻²³ J/K'), v(r`$T$`, 'absolute temperature', r`$\text{K}$`), BW, v(r`$R$`, 'resistance', OHM)],
        'Noise from the random motion of electrons in any resistor; flat across frequency.',
        'At 290 K, kT is −174 dBm/Hz: add 10 log B for the noise floor.', W_),
    P(NO, null, 'Shot Noise', r`$I_n = \sqrt{2qIB}$`, r`$I_n = \sqrt{2qI_{dc}B}$`,
        [v(r`$q$`, 'electron charge', r`$\text{C}$`), v(r`$I_{dc}$`, 'DC current through the junction', r`$\text{A}$`), BW],
        'Noise from the discrete arrival of charges across a junction (diodes, transistors, photodiodes).',
        'Grows with the square root of the current, unlike thermal noise.', r`$\text{A}$`),
    P(NO, null, 'Noise Figure and Noise Temperature', r`$F = \frac{SNR_{in}}{SNR_{out}},\ T_e = (F - 1)T_0$`, r`$F = \frac{SNR_{in}}{SNR_{out}},\quad NF = 10\log F,\quad T_e = (F - 1)T_0,\ T_0 = 290\ \text{K}$`,
        [v(r`$SNR_{in}, SNR_{out}$`, 'signal-to-noise ratios (plain ratios)'), v(r`$T_e$`, 'equivalent noise temperature', r`$\text{K}$`)],
        'How much a stage worsens the signal-to-noise ratio.',
        'A noiseless stage has F = 1 (0 dB). Use plain ratios in T_e = (F − 1)T₀, not dB.'),
    P(NO, null, 'Friis Noise Formula (Cascade)', r`$F = F_1 + \frac{F_2 - 1}{G_1} + \frac{F_3 - 1}{G_1G_2}$`, r`$F = F_1 + \frac{F_2 - 1}{G_1} + \frac{F_3 - 1}{G_1G_2} + \cdots,\qquad T_e = T_1 + \frac{T_2}{G_1} + \frac{T_3}{G_1G_2} + \cdots$`,
        [v(r`$F_i$`, 'noise factor of stage i (ratio)'), v(r`$G_i$`, 'available gain of stage i (ratio)'), v(r`$T_i$`, 'noise temperature of stage i', r`$\text{K}$`)],
        'The first stage dominates a receiver\'s noise if its gain is high.',
        'Put the low-noise amplifier first; a lossy cable before it has F equal to its loss.'),
    // Amplitude Modulation
    P(AM, null, 'AM Modulation Index', r`$m = \frac{V_{max} - V_{min}}{V_{max} + V_{min}}$`, r`$m = \frac{V_m}{V_c} = \frac{V_{max} - V_{min}}{V_{max} + V_{min}}$`,
        [v(r`$V_m, V_c$`, 'modulating and carrier amplitudes', V_), v(r`$V_{max}, V_{min}$`, 'envelope maximum and minimum', V_)],
        'How deeply the message varies the carrier\'s envelope.',
        'm > 1 overmodulates: the envelope folds and an envelope detector distorts.'),
    P(AM, null, 'AM Power and Current', r`$P_t = P_c\left(1 + \frac{m^2}{2}\right)$`, r`$P_t = P_c\left(1 + \frac{m^2}{2}\right),\quad I_t = I_c\sqrt{1 + \frac{m^2}{2}},\quad \eta = \frac{m^2}{2 + m^2}$`,
        [v(r`$P_c, I_c$`, 'unmodulated carrier power and current'), MI],
        'Total power of a full AM signal: the carrier plus two sidebands of P_c m²/4 each.',
        'Even at m = 1 only a third of the power carries the message (η = 33.3%).', W_),
    P(AM, null, 'AM Bandwidth and Sideband Frequencies', r`$B = 2f_m$`, r`$f_{USB} = f_c + f_m,\quad f_{LSB} = f_c - f_m,\quad B = 2f_{m,max},\quad V_{SB} = \frac{mV_c}{2}$`,
        [v(r`$f_c$`, 'carrier frequency', HZ), v(r`$f_m$`, 'modulating frequency', HZ), MI, v(r`$V_c$`, 'carrier amplitude', V_)],
        'AM puts copies of the message on both sides of the carrier.',
        'Broadcast AM channels are 10 kHz wide (9 kHz in some regions): audio is limited to 5 kHz.', HZ),
    P(AM, null, 'Multitone Modulation Index', r`$m_t = \sqrt{m_1^2 + m_2^2 + \cdots}$`, r`$m_t = \sqrt{m_1^2 + m_2^2 + m_3^2 + \cdots}$`,
        [v(r`$m_1, m_2, \ldots$`, 'indices of each tone alone')],
        'Several tones modulating one carrier combine like powers.',
        'Keep m_t ≤ 1 to avoid overmodulation.'),
    // Single Sideband
    P(SSB, null, 'SSB and DSB-SC Power Saving', r`$\text{saving} = 1 - \frac{m^2/4}{1 + m^2/2}$`, r`$P_{SSB} = \frac{P_cm^2}{4},\qquad \text{saving}_{SSB} = 1 - \frac{m^2/4}{1 + m^2/2},\qquad \text{saving}_{DSB\text{-}SC} = \frac{1}{1 + m^2/2}$`,
        [v(r`$P_c$`, 'carrier power of the equivalent AM', W_), MI],
        'Suppress the carrier and one sideband: the same message for a fraction of the power and half the bandwidth.',
        'At m = 1: SSB saves 83.3%, DSB-SC 66.7%.'),
    P(SSB, null, 'Peak Envelope Power', r`$\text{PEP} = \frac{V_p^2}{2R}$`, r`$\text{PEP} = \frac{V_{p}^2}{2R}\quad (V_p \text{ at the envelope peak})$`,
        [v(r`$V_p$`, 'peak of the envelope', V_), v(r`$R$`, 'load resistance', OHM)],
        'An SSB transmitter is rated by the average power over one RF cycle at the envelope\'s highest point.',
        'Two equal tones of amplitude V each give a peak of 2V: PEP is twice the average power.', W_),
    // Frequency Modulation
    P(FM, null, 'FM Modulation Index and Deviation Ratio', r`$\beta = \frac{\Delta f}{f_m}$`, r`$\beta = \frac{\Delta f}{f_m},\qquad D = \frac{\Delta f_{max}}{f_{m,max}}$`,
        [v(r`$\Delta f$`, 'peak frequency deviation', HZ), v(r`$f_m$`, 'modulating frequency', HZ)],
        'In FM the index falls as the modulating frequency rises (for the same deviation).',
        'Broadcast FM: Δf = 75 kHz, f_m up to 15 kHz, so D = 5.'),
    P(FM, null, "Carson's Rule", r`$B = 2(\Delta f + f_m)$`, r`$B \approx 2(\Delta f + f_m) = 2f_m(\beta + 1)$`,
        [v(r`$\Delta f$`, 'peak deviation', HZ), v(r`$f_m$`, 'highest modulating frequency', HZ)],
        'The bandwidth that holds about 98% of an FM signal\'s power.',
        'Narrowband FM (β ≪ 1) needs about 2f_m, like AM.', HZ),
    P(FM, null, 'FM Sidebands (Bessel Functions)', r`$V_n = V_cJ_n(\beta)$`, r`$v(t) = V_c\sum_n J_n(\beta)\cos(\omega_c + n\omega_m)t,\qquad \sum_n J_n^2(\beta) = 1$`,
        [v(r`$J_n(\beta)$`, 'Bessel function of order n'), v(r`$V_c$`, 'carrier amplitude', V_), v(r`$\beta$`, 'modulation index')],
        'FM has infinitely many sidebands, spaced f_m apart, with amplitudes from Bessel tables.',
        'Total power never changes with modulation. The carrier vanishes at β = 2.405 (used to calibrate deviation).', V_),
    P(FM, null, 'Pre-Emphasis Time Constant', r`$f_1 = \frac{1}{2\pi\tau}$`, r`$f_1 = \frac{1}{2\pi\tau},\qquad \tau = 75\ \mu\text{s}\ (\text{Americas, PH}) \Rightarrow f_1 = 2122\ \text{Hz}$`,
        [v(r`$\tau$`, 'pre-emphasis time constant', r`$\text{s}$`)],
        'Boost high audio frequencies before FM (and cut them after) to beat the noise that rises with frequency.',
        'Europe uses 50 µs (3183 Hz).', HZ),
    // Sampling and PCM
    P(PCM, null, 'PCM Bit Rate and Bandwidth', r`$R = nf_s,\ B_{min} = \frac{R}{2}$`, r`$R = n\,f_s\,(\times N_{channels}),\qquad L = 2^n,\qquad B_{min} = \frac{R}{2}$`,
        [v(r`$n$`, 'bits per sample'), v(r`$f_s$`, 'sampling rate (≥ 2 f_max)', HZ), v(r`$L$`, 'quantization levels')],
        'Each sample becomes n bits; the line must carry n·f_s bits per second.',
        'Telephone PCM: 8 kHz × 8 bits = 64 kbit/s per channel.', BPS),
    P(PCM, null, 'Quantization Step and Error', r`$\Delta = \frac{V_{pp}}{2^n}$`, r`$\Delta = \frac{V_{pp}}{2^n},\qquad |e|_{max} = \frac{\Delta}{2},\qquad e_{rms} = \frac{\Delta}{\sqrt{12}}$`,
        [v(r`$V_{pp}$`, 'full input range', V_), v(r`$n$`, 'bits per sample')],
        'Rounding each sample to the nearest level leaves an error up to half a step.',
        'Each extra bit halves the step and adds about 6 dB of SNR.', V_),
    P(PCM, null, 'µ-Law Companding', r`$y = \frac{\ln(1 + \mu|x|)}{\ln(1 + \mu)}$`, r`$y = \text{sgn}(x)\frac{\ln(1 + \mu|x|)}{\ln(1 + \mu)},\qquad \mu = 255$`,
        [v(r`$x$`, 'normalized input (−1 to 1)'), v(r`$\mu$`, 'compression parameter')],
        'Compress before uniform quantizing so quiet signals get finer steps.',
        'North America and Japan use µ-law; Europe and most others A-law (A = 87.6).'),
    // Digital Modulation
    P(DM, null, 'Bit Rate and Baud', r`$R_b = R_s\log_2M$`, r`$R_b = R_s\log_2M,\qquad n = \log_2M \text{ bits per symbol}$`,
        [v(r`$R_s$`, 'symbol rate (baud)', r`$\text{baud}$`), v(r`$M$`, 'number of symbols (levels, phases)')],
        'Each symbol carries log₂M bits.',
        'Baud equals bit rate only for binary schemes (M = 2).', BPS),
    P(DM, null, 'Shannon Capacity', r`$C = B\log_2(1 + \text{SNR})$`, r`$C = B\log_2(1 + S/N)$`,
        [BW, v(r`$S/N$`, 'signal-to-noise ratio (plain ratio)')],
        'The highest error-free bit rate a noisy channel can carry.',
        'Convert SNR from dB first: 30 dB is 1000, not 30.', BPS),
    P(DM, null, 'Nyquist Rate for a Noiseless Channel', r`$C = 2B\log_2M$`, r`$C = 2B\log_2M$`,
        [BW, v(r`$M$`, 'signal levels')],
        'The most symbols per second a channel of bandwidth B carries without intersymbol interference: 2B.',
        'Adding levels raises it in theory; noise (Shannon) sets the real limit.', BPS),
    P(DM, null, 'Raised-Cosine Bandwidth', r`$B = \frac{R_s}{2}(1 + \alpha)$`, r`$B_{baseband} = \frac{R_s}{2}(1 + \alpha),\qquad B_{passband} = R_s(1 + \alpha)$`,
        [v(r`$R_s$`, 'symbol rate', r`$\text{baud}$`), v(r`$\alpha$`, 'roll-off factor (0 to 1)')],
        'Real pulse shaping needs more than the Nyquist minimum by the roll-off factor.',
        'Modulating onto a carrier doubles the baseband width.', HZ),
    P(DM, null, 'Eb/N0 and SNR', r`$\frac{E_b}{N_0} = \frac{S}{N}\cdot\frac{B}{R_b}$`, r`$\frac{E_b}{N_0} = \frac{S}{N}\cdot\frac{B}{R_b},\qquad \frac{E_b}{N_0}(\text{dB}) = \frac{S}{N}(\text{dB}) + 10\log\frac{B}{R_b}$`,
        [v(r`$E_b$`, 'energy per bit', r`$\text{J}$`), v(r`$N_0$`, 'noise power density', r`$\text{W/Hz}$`), BW, v(r`$R_b$`, 'bit rate', BPS)],
        'Energy per bit over noise density: the fair way to compare digital schemes.',
        'Error rates are plotted against Eb/N0, not SNR.'),
    P(DM, null, 'BPSK Bit Error Rate', r`$P_b = \tfrac12\text{erfc}\sqrt{E_b/N_0}$`, r`$P_b = Q\!\left(\sqrt{\frac{2E_b}{N_0}}\right) = \tfrac12\,\text{erfc}\sqrt{\frac{E_b}{N_0}}$`,
        [v(r`$E_b/N_0$`, 'energy per bit over noise density (ratio)')],
        'Coherent BPSK (and QPSK per bit) error probability in white Gaussian noise.',
        'About 9.6 dB of Eb/N0 gives a BER of 10⁻⁵.'),
    // Multiplexing
    P(MUX, null, 'FDM Bandwidth', r`$B = NB_{ch} + (N - 1)B_g$`, r`$B = N\,B_{ch} + (N - 1)\,B_g$`,
        [v(r`$N$`, 'number of channels'), v(r`$B_{ch}$`, 'bandwidth per channel', HZ), v(r`$B_g$`, 'guard band between channels', HZ)],
        'Channels side by side in frequency, with guard bands between them.',
        'Telephone FDM: 4 kHz slots for 300–3400 Hz voice; 12 slots make a 48 kHz group.', HZ),
    P(MUX, null, 'TDM Line Rate (T1 and E1)', r`$R = (Nn + b)f_s$`, r`$R = (N n + b)\,f_s;\quad \text{T1: } (24 \times 8 + 1)(8000) = 1.544\ \text{Mbit/s};\quad \text{E1: } 32 \times 8 \times 8000 = 2.048\ \text{Mbit/s}$`,
        [v(r`$N$`, 'channels per frame'), v(r`$n$`, 'bits per channel sample'), v(r`$b$`, 'framing bits per frame'), v(r`$f_s$`, 'frame (sampling) rate', HZ)],
        'Each frame holds one sample from every channel plus framing.',
        'E1 has 30 voice channels; its other two time slots carry framing and signalling.', BPS),
    P(MUX, null, 'WDM Channel Spacing', r`$\Delta f = \frac{c\,\Delta\lambda}{\lambda^2}$`, r`$\Delta f = \frac{c\,\Delta\lambda}{\lambda^2}$`,
        [v(r`$\Delta\lambda$`, 'wavelength spacing', M_), LAMBDA],
        'Converts the wavelength spacing between optical channels to frequency.',
        'At 1550 nm, 0.8 nm is about 100 GHz: the standard DWDM grid.', HZ),
    // Transmission Lines
    P(TL, null, 'Characteristic Impedance of Coax and Twin-Lead', r`$Z_0 = \frac{138}{\sqrt{\varepsilon_r}}\log\frac{D}{d}$`, r`$Z_{0,coax} = \frac{138}{\sqrt{\varepsilon_r}}\log\frac{D}{d},\qquad Z_{0,twin} = \frac{276}{\sqrt{\varepsilon_r}}\log\frac{2s}{d}$`,
        [v(r`$D, d$`, 'coax shield inner diameter and centre-conductor diameter', M_), v(r`$s$`, 'twin-lead spacing (centre to centre)', M_), v(r`$\varepsilon_r$`, 'dielectric constant')],
        'Line impedance from geometry: Z₀ = √(L/C) per unit length.',
        'Common values: 50 Ω and 75 Ω coax, 300 Ω twin-lead.', OHM),
    P(TL, null, 'Velocity Factor', r`$VF = \frac{1}{\sqrt{\varepsilon_r}}$`, r`$VF = \frac{v}{c} = \frac{1}{\sqrt{\varepsilon_r}},\qquad \lambda_{line} = \frac{VF\cdot c}{f}$`,
        [v(r`$\varepsilon_r$`, 'dielectric constant of the insulation'), v(r`$f$`, 'frequency', HZ)],
        'Waves travel slower in a cable than in air, so its wavelength is shorter.',
        'Cut quarter-wave stubs to VF × λ/4: solid polyethylene coax has VF ≈ 0.66.'),
    P(TL, null, 'VSWR, Return Loss and Mismatch Loss', r`$\text{VSWR} = \frac{1 + |\Gamma|}{1 - |\Gamma|}$`, r`$\text{VSWR} = \frac{1 + |\Gamma|}{1 - |\Gamma|},\qquad RL = -20\log|\Gamma|,\qquad ML = -10\log(1 - |\Gamma|^2)$`,
        [GAMMA],
        'How badly a load is matched: the standing-wave ratio, the power reflected, and the power lost to reflection.',
        'VSWR 2:1 means |Γ| = 1/3: 11% of the power is reflected (0.51 dB mismatch loss).'),
    P(TL, null, 'Input Impedance of a Lossless Line', r`$Z_{in} = Z_0\frac{Z_L + jZ_0t}{Z_0 + jZ_Lt}$`, r`$Z_{in} = Z_0\,\frac{Z_L + jZ_0\tan\beta\ell}{Z_0 + jZ_L\tan\beta\ell},\qquad \beta = \frac{2\pi}{\lambda}$`,
        [v(r`$t$`, r`tan βℓ`), v(r`$Z_0$`, 'characteristic impedance', OHM), v(r`$Z_L$`, 'load impedance', OHM), v(r`$\ell$`, 'line length', M_), LAMBDA],
        'What a load looks like through a length of line.',
        'Shorted stub: jZ₀ tan βℓ; open stub: −jZ₀ cot βℓ. Every λ/2 repeats the load.', OHM),
    P(TL, null, 'Quarter-Wave Transformer', r`$Z_0' = \sqrt{Z_0Z_L}$`, r`$Z_{in} = \frac{Z_0'^2}{Z_L}\quad (\ell = \lambda/4) \implies Z_0' = \sqrt{Z_{in}Z_L}$`,
        [v(r`$Z_0'$`, 'impedance of the quarter-wave section', OHM), v(r`$Z_L, Z_{in}$`, 'load and desired input impedances', OHM)],
        'A quarter-wave line inverts the load impedance: a simple resistive match.',
        'It matches only near one frequency.', OHM),
    // Antennas
    P(ANT, null, 'Half-Wave Dipole', r`$L \approx \frac{143}{f_{MHz}}$ m, $R_r = 73\ \Omega$`, r`$L \approx 0.95\frac{\lambda}{2} = \frac{142.5}{f(\text{MHz})}\ \text{m},\qquad R_r \approx 73\ \Omega,\qquad D = 1.64\ (2.15\ \text{dBi})$`,
        [v(r`$f$`, 'frequency', r`$\text{MHz}$`), v(r`$R_r$`, 'radiation resistance', OHM)],
        'The basic resonant antenna, cut a little short of λ/2 for end effects.',
        'A quarter-wave monopole over ground has half the resistance: 36.5 Ω.', M_),
    P(ANT, null, 'Radiation Resistance of a Short Dipole', r`$R_r = 80\pi^2\left(\frac{\ell}{\lambda}\right)^2$`, r`$R_r = 80\pi^2\left(\frac{\ell}{\lambda}\right)^2 \approx 790\left(\frac{\ell}{\lambda}\right)^2\quad (\text{uniform current})$`,
        [v(r`$\ell$`, 'dipole length (≪ λ)', M_), LAMBDA],
        'The resistance that accounts for the power a short antenna radiates.',
        'With the usual triangular current it is a quarter of this: 20π²(ℓ/λ)². Short antennas radiate poorly.', OHM),
    P(ANT, null, 'Antenna Efficiency and Gain', r`$\eta = \frac{R_r}{R_r + R_{loss}},\ G = \eta D$`, r`$\eta = \frac{R_r}{R_r + R_{loss}},\qquad G = \eta D,\qquad \text{EIRP} = P_tG_t$`,
        [v(r`$R_r, R_{loss}$`, 'radiation and loss resistances', OHM), v(r`$D$`, 'directivity'), v(r`$P_t$`, 'transmitter power', W_)],
        'Gain is directivity reduced by the antenna\'s own losses.',
        'dBi is relative to isotropic, dBd to a dipole: dBi = dBd + 2.15.'),
    P(ANT, null, 'Parabolic Dish Gain and Beamwidth', r`$G = \eta\left(\frac{\pi D}{\lambda}\right)^2$`, r`$G = \eta\left(\frac{\pi D}{\lambda}\right)^2,\qquad \theta_{3dB} \approx \frac{70\lambda}{D}\ \text{degrees}$`,
        [v(r`$D$`, 'dish diameter', M_), LAMBDA, v(r`$\eta$`, 'aperture efficiency (about 0.55)')],
        'A dish\'s gain grows with its area in wavelengths; its beam narrows as it grows.',
        'Doubling the diameter or the frequency adds 6 dB of gain.'),
    P(ANT, null, 'Effective Aperture', r`$A_e = \frac{G\lambda^2}{4\pi}$`, r`$A_e = \frac{G\lambda^2}{4\pi}$`,
        [v(r`$G$`, 'gain (ratio)'), LAMBDA],
        'The area from which a receiving antenna collects the incident power density.',
        'An isotropic antenna has λ²/4π: lower frequencies collect more power for the same gain.', r`$\text{m}^2$`),
    // Radio Wave Propagation
    P(PROP, null, 'Free-Space Path Loss', r`$L = 32.45 + 20\log f_{MHz} + 20\log d_{km}$`, r`$L = \left(\frac{4\pi d}{\lambda}\right)^2;\qquad L(\text{dB}) = 32.45 + 20\log f(\text{MHz}) + 20\log d(\text{km})$`,
        [v(r`$d$`, 'distance', r`$\text{km}$`), v(r`$f$`, 'frequency', r`$\text{MHz}$`)],
        'The spreading loss between isotropic antennas in free space.',
        'Doubling the distance adds 6 dB; with miles and MHz the constant is 36.6.', DB),
    P(PROP, null, 'Friis Transmission Equation', r`$P_r = P_tG_tG_r\left(\frac{\lambda}{4\pi d}\right)^2$`, r`$P_r = P_tG_tG_r\left(\frac{\lambda}{4\pi d}\right)^2;\qquad P_r(\text{dBm}) = P_t + G_t + G_r - L_{fs}$`,
        [v(r`$P_t, P_r$`, 'transmitted and received power', W_), v(r`$G_t, G_r$`, 'antenna gains (ratios)'), v(r`$d$`, 'distance', M_), LAMBDA],
        'Received power over a line-of-sight free-space link.',
        'The basis of every link budget: add gains, subtract losses, all in dB.', W_),
    P(PROP, null, 'Radio Horizon', r`$d = 4.12(\sqrt{h_t} + \sqrt{h_r})$`, r`$d(\text{km}) = 4.12\left(\sqrt{h_t} + \sqrt{h_r}\right),\quad h \text{ in m}\quad (k = 4/3)$`,
        [v(r`$h_t, h_r$`, 'antenna heights', M_)],
        'Line-of-sight range over a smooth earth, with refraction stretching it to a 4/3 earth radius.',
        'The optical horizon is 3.57√h km; in feet and miles the radio horizon is √(2h).', r`$\text{km}$`),
    P(PROP, null, 'Critical Frequency and MUF', r`$\text{MUF} = \frac{f_c}{\cos\theta},\ f_c = 9\sqrt{N}$`, r`$f_c = 9\sqrt{N_{max}},\qquad \text{MUF} = \frac{f_c}{\cos\theta_i} = f_c\sec\theta_i$`,
        [v(r`$N_{max}$`, 'peak electron density', r`$\text{m}^{-3}$`), v(r`$\theta_i$`, 'angle of incidence from the vertical')],
        'The highest frequency a layer reflects straight up, and at a slant (the secant law).',
        'Sky-wave links work below the MUF; about 85% of it (the FOT) is used for reliability.', HZ),
    P(PROP, null, 'Free-Space Field Strength', r`$E = \frac{\sqrt{30P_tG_t}}{d}$`, r`$E = \frac{\sqrt{30P_tG_t}}{d}\quad (\text{rms, V/m})$`,
        [v(r`$P_t$`, 'transmitted power', W_), v(r`$G_t$`, 'antenna gain (ratio)'), v(r`$d$`, 'distance', M_)],
        'Field strength from the power density PG/(4πd²) and free space\'s 120π Ω.',
        'Field strength falls as 1/d; power density as 1/d².', r`$\text{V/m}$`),
    // Fiber Optics
    P(FO, null, 'Numerical Aperture', r`$NA = \sqrt{n_1^2 - n_2^2} = \sin\theta_a$`, r`$NA = \sin\theta_a = \sqrt{n_1^2 - n_2^2} \approx n_1\sqrt{2\Delta},\qquad \Delta = \frac{n_1 - n_2}{n_1}$`,
        [v(r`$n_1, n_2$`, 'core and cladding refractive indices'), v(r`$\theta_a$`, 'acceptance half-angle in air')],
        'The cone of light a fiber accepts and guides by total internal reflection.',
        'Larger NA collects more light but spreads pulses more (modal dispersion).'),
    P(FO, null, 'V-Number and Modes', r`$V = \frac{2\pi a}{\lambda}NA$`, r`$V = \frac{2\pi a}{\lambda}NA;\qquad V < 2.405 \text{ single-mode};\qquad M \approx \frac{V^2}{2}\ (\text{step index})$`,
        [v(r`$a$`, 'core radius', M_), LAMBDA, v(r`$NA$`, 'numerical aperture')],
        'Whether a fiber carries one mode or many at a given wavelength.',
        'Graded-index fiber carries about V²/4 modes.'),
    P(FO, null, 'Modal Dispersion (Step Index)', r`$\Delta t = \frac{Ln_1\Delta}{c}$`, r`$\Delta t = \frac{L\,n_1}{c}\cdot\frac{n_1 - n_2}{n_2} \approx \frac{L\,n_1\Delta}{c},\qquad B \approx \frac{1}{2\Delta t}$`,
        [v(r`$L$`, 'fiber length', M_), v(r`$n_1, n_2$`, 'core and cladding indices'), v(r`$\Delta$`, 'relative index difference')],
        'The steepest guided ray travels farther than the axial ray, spreading each pulse.',
        'Graded-index fiber cuts this by about Δ/8; single-mode removes it.', r`$\text{s}$`),
    P(FO, null, 'Optical Power Budget', r`$P_r = P_t - \alpha L - L_c - L_s$`, r`$P_r(\text{dBm}) = P_t(\text{dBm}) - \alpha L - n_cL_c - n_sL_s - \text{margin}$`,
        [v(r`$\alpha$`, 'fiber attenuation', r`$\text{dB/km}$`), v(r`$L$`, 'length', r`$\text{km}$`), v(r`$L_c, L_s$`, 'loss per connector and per splice', DB)],
        'Check that enough light reaches the receiver after every loss.',
        'Typical: 0.2–0.35 dB/km single-mode, 0.5 dB per connector, 0.1 dB per fusion splice.', r`$\text{dBm}$`),
    // Satellite and Cellular
    P(SAT, null, 'Geostationary Orbit', r`$r = \sqrt[3]{\frac{GMT^2}{4\pi^2}} = 42{,}164\ \text{km}$`, r`$r = \left(\frac{GM\,T^2}{4\pi^2}\right)^{1/3} = 42{,}164\ \text{km};\quad h = 35{,}786\ \text{km};\quad t_{up+down} \approx 0.24\ \text{s}$`,
        [v(r`$GM$`, 'Earth\'s gravitational parameter, 3.986 × 10¹⁴ m³/s²'), v(r`$T$`, 'sidereal day, 86,164 s', r`$\text{s}$`)],
        'The one orbit whose period matches the earth\'s rotation, so the satellite seems to stand still.',
        'A one-way hop (up and down) takes about 240 ms; a conversation\'s round trip about 0.5 s.', r`$\text{km}$`),
    P(SAT, null, 'Satellite Link Budget (C/N₀)', r`$\frac{C}{N_0} = \text{EIRP} - L + \frac{G}{T} + 228.6$`, r`$\frac{C}{N_0}(\text{dBHz}) = \text{EIRP}(\text{dBW}) - L(\text{dB}) + \frac{G}{T}(\text{dB/K}) + 228.6$`,
        [v(r`$\text{EIRP}$`, 'effective isotropic radiated power', r`$\text{dBW}$`), v(r`$L$`, 'path and other losses', DB), v(r`$G/T$`, 'receiver figure of merit', r`$\text{dB/K}$`)],
        'Carrier-to-noise density of a link; 228.6 is −10 log k.',
        'C/N = C/N₀ − 10 log B.', r`$\text{dBHz}$`),
    P(SAT, null, 'Cellular Frequency Reuse', r`$N = i^2 + ij + j^2,\ \frac{D}{R} = \sqrt{3N}$`, r`$N = i^2 + ij + j^2,\qquad \frac{D}{R} = \sqrt{3N},\qquad \frac{C}{I} \approx \frac{(D/R)^n}{6}$`,
        [v(r`$N$`, 'cluster size'), v(r`$D$`, 'distance between co-channel cells', M_), v(r`$R$`, 'cell radius', M_), v(r`$n$`, 'path-loss exponent (about 4)')],
        'Cells reuse the same channels a cluster apart; bigger clusters mean less interference but fewer channels per cell.',
        'N = 7, n = 4 gives C/I ≈ 18.7 dB.'),
    P(SAT, null, 'Traffic Intensity (Erlang)', r`$A = \lambda h$`, r`$A = \lambda\,h\quad (\text{Erlang})$`,
        [v(r`$\lambda$`, 'calls per hour'), v(r`$h$`, 'average holding time', r`$\text{h}$`)],
        'Average number of calls in progress: one channel busy all the time is one erlang.',
        'Keep λ and h in the same time unit; the Erlang B table then gives channels for a blocking probability.', r`$\text{E}$`),
    // Data Communications
    P(DC, null, 'Stop-and-Wait Efficiency', r`$\eta = \frac{1}{1 + 2a},\ a = \frac{t_{prop}}{t_{frame}}$`, r`$\eta = \frac{1}{1 + 2a},\qquad a = \frac{t_{prop}}{t_{frame}} = \frac{d/v}{L/R}$`,
        [v(r`$t_{prop}$`, 'propagation delay', r`$\text{s}$`), v(r`$t_{frame}$`, 'time to send one frame', r`$\text{s}$`), v(r`$L, R$`, 'frame length and bit rate')],
        'Sending one frame and waiting for its acknowledgement wastes the round trip.',
        'Over long or fast links a is large: sliding windows keep the line busy.'),
    P(DC, null, 'Asynchronous Framing Efficiency', r`$\eta = \frac{\text{data bits}}{\text{bits per character}}$`, r`$\eta = \frac{n_{data}}{n_{start} + n_{data} + n_{parity} + n_{stop}}$`,
        [v(r`$n$`, 'bits of each kind per character')],
        'Start and stop bits around every character cost throughput.',
        '8N1 (1 start, 8 data, no parity, 1 stop): 80%; 9600 bit/s carries 960 characters per second.'),
];

module.exports = { subject: 'EE', topic: 'Fundamentals of Electronic Communications', migration: '20270110000000_cards_electronic_communications', file, revisions, retire, drafts };
