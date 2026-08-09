// src/components/BootSequence.jsx
// The branded boot screen, replacing a bare "Securing Session..." line.
//
// Deliberately NOT a step-by-step progress list. Since auth now resolves the
// moment onAuthStateChanged fires (enrichment — profile, TOS, flags, push —
// was moved to the background), there is genuinely only ONE phase before the
// app renders, and it's usually well under a second. Inventing "Step 2 of 4"
// theatre here would be a progress bar that lies.
//
// Instead: ESCALATING DISCLOSURE, so the UI stays honest at every duration.
//   < ~0.9s  the overwhelmingly common case — just the mark, no text churn,
//            nothing that could flash-and-vanish jarringly
//   > ~0.9s  a rotating board-exam tip appears; attention off the clock, and
//            the wait buys the user something real
//   > ~6s    an explicit "taking longer than usual" acknowledgement, so a
//            slow connection feels seen rather than hung
//   > 25s    AuthContext swaps to its reconnect/retry screen (untouched)
import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';
import { prefersReducedMotion } from '../motion/presets';

// Shown only once the wait is long enough to be worth filling. Board-relevant
// so the time is not purely dead — this is a study app.
const TIPS = [
  'Blind spots — high confidence, wrong — cost the most marks. Target them first.',
  'Interleaving subjects beats blocking them. Mix Math, ESAS and EE in one sitting.',
  'Spaced repetition beats re-reading. Recall it before you review it.',
  'Rate your confidence honestly — calibration is half of exam technique.',
  'The PRC blend is roughly 25% Math, 30% ESAS, 45% EE. Weight your practice.',
];

const TIP_AFTER_MS = 900;
const SLOW_AFTER_MS = 6000;
const TIP_ROTATE_MS = 4200;

export default function BootSequence({ label = 'Preparing your session' }) {
  const [elapsedStage, setElapsedStage] = useState(0); // 0 = fast, 1 = tips, 2 = slow
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    const t1 = setTimeout(() => setElapsedStage(1), TIP_AFTER_MS);
    const t2 = setTimeout(() => setElapsedStage(2), SLOW_AFTER_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Rotate tips only once they're actually on screen.
  useEffect(() => {
    if (elapsedStage < 1 || prefersReducedMotion()) return undefined;
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), TIP_ROTATE_MS);
    return () => clearInterval(id);
  }, [elapsedStage]);

  return (
    <div
      // role=status + aria-live: a screen reader is told the app is working
      // without the visual choreography meaning anything to it.
      role="status"
      aria-live="polite"
      className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-bg text-textMain px-6 text-center"
    >
      <BrandMark size={76} />

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-xl font-bold tracking-tight text-[var(--accent)]">
          REE<span className="text-textMain">.ai</span>
        </p>
        <p className="text-eyebrow">{label}</p>
      </div>

      {/* Indeterminate shuttle — honest about not knowing the duration, unlike
          a percentage bar that would have to be invented. */}
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
        <div className="boot-shuttle h-full w-1/3 rounded-full bg-[var(--accent)]" />
      </div>

      {/* Reserved height so the tip appearing doesn't shift the mark upward. */}
      <div className="min-h-[3.5rem] max-w-sm flex items-start justify-center">
        {elapsedStage >= 1 && (
          <p key={tipIndex} className="text-fluid-sm text-muted2 leading-relaxed animate-in fade-in">
            {elapsedStage >= 2 && (
              <span className="block text-eyebrow mb-1" style={{ color: 'var(--color-reeAmber)' }}>
                Taking longer than usual
              </span>
            )}
            {TIPS[tipIndex]}
          </p>
        )}
      </div>
    </div>
  );
}
