// src/components/BrandMark.jsx
// The animated REE.ai mark: a circuit trace that draws itself into a bolt.
//
// Code-drawn SVG rather than an image asset, deliberately:
//   - inherits the active theme through CSS custom properties, so it's correct
//     in all ~10 themes without exporting a variant per theme
//   - crisp at any DPI / size with no @2x assets
//   - a few hundred bytes instead of a PNG, and no extra network request on
//     the very screen whose whole job is to cover a wait
//
// The draw-on animation is pure CSS (stroke-dashoffset); `prefers-reduced-
// motion` collapses it to the finished state — see .brand-mark-* in
// styles/index.css.
import { memo } from 'react';

function BrandMark({ size = 72, className = '', animated = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animated ? 'brand-mark' : ''} ${className}`}
      role="img"
      aria-label="REE.ai"
    >
      {/* Circuit ring — the board trace the bolt sits on */}
      <circle
        className="brand-mark-ring"
        cx="32"
        cy="32"
        r="27"
        stroke="var(--accent-signal)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />

      {/* Trace stubs at the cardinal points — reads as a PCB pad, and gives
          the ring something to "connect" to as it completes. */}
      <g stroke="var(--accent-signal)" strokeWidth="1.5" strokeLinecap="round" opacity="0.45">
        <path className="brand-mark-trace" d="M32 1.5 V7" />
        <path className="brand-mark-trace" d="M32 57 V62.5" />
        <path className="brand-mark-trace" d="M1.5 32 H7" />
        <path className="brand-mark-trace" d="M57 32 H62.5" />
      </g>

      {/* The bolt itself — REE = electrical. Drawn as a stroke so it can be
          "traced" on, then softly filled once complete. */}
      <path
        className="brand-mark-bolt"
        d="M35.5 10 L20 34.5 H30.5 L28.5 54 L44 29.5 H33.5 L35.5 10 Z"
        stroke="var(--accent-velocity)"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="var(--accent-velocity)"
      />
    </svg>
  );
}

export default memo(BrandMark);
