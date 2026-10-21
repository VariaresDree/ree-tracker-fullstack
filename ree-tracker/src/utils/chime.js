// src/utils/chime.js
// The focus timer's end-of-block sound: a few soft sine tones made with Web
// Audio, so there is no sound file to download or cache. Browsers only let a
// page make sound after the learner has interacted with it, so the one
// AudioContext is created (or woken) inside a click: primeChime() runs in the
// Start button's handler. playChime() then works when the block ends, even
// with no click at that moment. Neither ever throws; both do nothing where
// there is no Web Audio (tests, old WebViews).

let ctx = null;

/** Create or wake the shared AudioContext. Call it from a click or key handler. */
export function primeChime() {
  try {
    if (!ctx) {
      const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') ctx.resume?.()?.catch?.(() => {});
    return true;
  } catch {
    return false;
  }
}

// [frequency (Hz), start offset (s)] per tone.
const TONES = {
  end: [[660, 0], [880, 0.2]],
  exam: [[523.25, 0], [659.25, 0.25], [783.99, 0.5]],
  test: [[660, 0], [880, 0.2]],
};

/** Play a chime. False when there is no running context to play it on. */
export function playChime(kind = 'end') {
  try {
    if (!ctx || ctx.state !== 'running') return false;
    const t0 = ctx.currentTime + 0.02;
    for (const [freq, at] of TONES[kind] || TONES.end) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + at);
      osc.stop(t0 + at + 0.75);
    }
    return true;
  } catch {
    return false;
  }
}

/** Tests only: forget the shared context. */
export function resetChimeForTests() {
  ctx = null;
}
