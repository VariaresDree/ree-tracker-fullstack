// src/components/ui/Logo.jsx
//
// The REE.ai mark (and its wordmark). Drawn from logoGeometry.js, the one
// source the app icons are also built from, so the mark is the same
// everywhere: sidebar, phone header, login, loading and error screens.
//
//   <Logo />                               the mark, named "REE.ai"
//   <Logo variant="lockup" />              mark + "REE.ai Core"
//   <Logo variant="compact" />             mark + "REE.ai" (small spaces)
//   <Logo decorative />                    next to text that already names it
//   <Logo animated />                      the loading screens' version
//
// Colours: the bolt, the gear's hub, the chip and the trefoil are fixed brand
// colours; the letterforms, the gear and the chip's frame take --logo-ink
// (white on the dark themes, near-black on Light, Paper and Sakura), and the
// light themes add an amber keyline so the yellow bolt holds on white
// (--logo-keyline). Below 40px the fine detail (ruler ticks, the bolt's core
// and its flame) is left out; it would only blur.
//
// Accessible name: role="img" + aria-label, never a <title> (it would add to
// the page's text, and tooltips). A lockup names itself with its text.
import { memo, useId } from 'react';
import { cn } from './cn';
import { GEAR, LOGO_COLORS, LOGO_PATHS, LOGO_VIEWBOX, logoLayers } from './logoGeometry';

const SMALL_BELOW = 40;

function MarkSvg({ size, title, decorative, animated, detail, className }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const level = detail === 'auto' ? (size < SMALL_BELOW ? 'small' : 'full') : detail;
  const layers = logoLayers(level);
  const c = LOGO_COLORS;
  const p = LOGO_PATHS;
  const clip = `${uid}-letters`;
  const flame = `${uid}-flame`;
  const ink = { fill: 'var(--logo-ink, #ffffff)' };
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={cn('logo-mark shrink-0', animated && 'logo-anim', className)}
      data-detail={level}
      focusable="false"
      {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': title })}
    >
      <defs>
        <clipPath id={clip}>
          <path clipRule="evenodd" d={p.top} />
          <path clipRule="evenodd" d={p.r} />
          <path d={p.s} />
        </clipPath>
        {layers.flame && (
          <linearGradient id={flame} gradientUnits="userSpaceOnUse" x1="0" y1="202" x2="0" y2="262">
            <stop offset="0" stopColor={c.boltFlame} />
            <stop offset="0.35" stopColor={c.boltAmber} />
            <stop offset="1" stopColor={c.bolt} />
          </linearGradient>
        )}
      </defs>
      <g className="logo-letters" style={ink}>
        <path fillRule="evenodd" d={p.top} />
        <path fillRule="evenodd" d={p.r} />
        <path d={p.s} />
      </g>
      <path
        className="logo-veil"
        clipPath={`url(#${clip})`}
        fill={c.veil}
        style={{ opacity: 'var(--logo-veil, 0.9)' }}
        d={p.veil}
      />
      <g className="logo-gear">
        <path d={p.gear} style={ink} />
        <circle cx={GEAR.cx} cy={GEAR.cy} r={GEAR.hub} fill={c.red} />
      </g>
      <g className="logo-chip">
        <path fill={c.red} d={p.chipBody} />
        {layers.ticks && <path fill="#ffffff" d={p.chipTicks} />}
        <rect x="313.5" y="787.5" width="139" height="19.5" fill="none" strokeWidth="3" style={{ stroke: 'var(--logo-ink, #ffffff)' }} />
      </g>
      <g className="logo-bolt">
        <path
          d={p.bolt}
          fill={layers.flame ? `url(#${flame})` : c.bolt}
          strokeWidth="8"
          strokeLinejoin="round"
          style={{ stroke: 'var(--logo-keyline, none)', paintOrder: 'stroke' }}
        />
        {layers.boltCore && <path fill={c.boltCore} d={p.boltCore} />}
        <path fill={c.redShadow} d={p.boltShadow} />
      </g>
    </svg>
  );
}

/** "REE.ai Core" / "REE.ai", in one treatment everywhere. */
export function Wordmark({ full = true, className }) {
  return (
    <span className={cn('font-bold tracking-tight text-textMain whitespace-nowrap', className)}>
      REE<span className="text-[var(--accent-text)]">.ai</span>{full ? ' Core' : ''}
    </span>
  );
}

/**
 * @param {{ variant?: 'mark'|'lockup'|'compact', size?: number, title?: string, decorative?: boolean,
 *   animated?: boolean, detail?: 'auto'|'full'|'small', className?: string, wordmarkClassName?: string }} props
 *   size: the mark's side in px.
 */
function LogoImpl({
  variant = 'mark', size = 32, title = 'REE.ai', decorative = false, animated = false,
  detail = 'auto', className, wordmarkClassName,
}) {
  if (variant === 'mark') {
    return <MarkSvg size={size} title={title} decorative={decorative} animated={animated} detail={detail} className={className} />;
  }
  return (
    <span className={cn('inline-flex items-center gap-2.5 min-w-0', className)}>
      <MarkSvg size={size} decorative animated={animated} detail={detail} />
      <Wordmark full={variant === 'lockup'} className={wordmarkClassName} />
    </span>
  );
}

export const Logo = memo(LogoImpl);
export default Logo;
