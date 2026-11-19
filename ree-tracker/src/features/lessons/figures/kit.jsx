// src/features/lessons/figures/kit.jsx
//
// What every lesson drawing shares (2026-11-19): theme colours only, so a figure
// follows all 13 themes (the shape in the accent, what's measured in the signal
// colour, guides dashed and muted), one text style, and arrowheads drawn as
// polygons so they take any colour. A figure is an <svg role="img"> named by its
// required `alt`, sized by its viewBox and scaled to the width it's given. The
// arithmetic is in figureMath.js.
import { INK, TEXT, headPoints } from './figureMath';

export function Svg({ alt, x = 0, width, height, children }) {
  if (!alt) throw new Error('A lesson figure needs an alt text.');
  return (
    <svg viewBox={`${x} 0 ${width} ${height}`} role="img" aria-label={alt} className="w-full h-auto" style={{ maxWidth: `${Math.round(width * 1.25)}px` }}>
      {children}
    </svg>
  );
}

// "V_R", "I_{12}": what follows _ (one character, or the braces) is set as a
// subscript, since Unicode has subscript digits but no subscript R.
const SUB = /_(\{[^}]*\}|.)/g;
function rich(text) {
  if (typeof text !== 'string' || !text.includes('_')) return text;
  const out = [];
  let last = 0;
  let lowered = false;
  for (const m of text.matchAll(SUB)) {
    if (m.index > last) out.push(<tspan key={out.length} dy={lowered ? '-0.3em' : undefined}>{text.slice(last, m.index)}</tspan>);
    else if (lowered) out.push(<tspan key={out.length} dy="-0.3em" />);
    out.push(<tspan key={out.length} dy="0.3em" fontSize="0.78em">{m[1].startsWith('{') ? m[1].slice(1, -1) : m[1]}</tspan>);
    lowered = true;
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<tspan key={out.length} dy="-0.3em">{text.slice(last)}</tspan>);
  return out;
}

export function Text({ x, y, children, anchor = 'middle', size = 12.5, colour = TEXT, weight = 500, italic = false, baseline = 'middle' }) {
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline={baseline} fontSize={size} fontWeight={weight} fontStyle={italic ? 'italic' : undefined} fill={colour}>
      {rich(children)}
    </text>
  );
}

export function Arrow({ x1, y1, x2, y2, colour = INK, width = 1.75, dashed = false, head = 7 }) {
  // The line stops short of the tip, so a thick line doesn't poke through the head.
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const k = Math.max(0, (len - head * 0.8) / len);
  return (
    <g>
      <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * k} y2={y1 + (y2 - y1) * k} stroke={colour} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '5 4' : undefined} />
      <polygon points={headPoints(x1, y1, x2, y2, head)} fill={colour} />
    </g>
  );
}
