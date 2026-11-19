// src/features/lessons/figures/Plot.jsx
//
// A graph: one or more curves y = f(x) (or point lists) on framed axes, with
// optional marks (a value of x or y called out, a labelled point), shaded areas,
// a log x axis (Bode plots) and a legend. Lesson files are JavaScript, so a
// curve is a plain function: no expression parser.
//
//   { type: 'plot', alt, x: [0, 5], y?: [0, 13], xLabel, yLabel, logX?,
//     series: [{ f: (t) => 12 * (1 - Math.exp(-t)), label?, dashed?, area?, colour? } | { points: [[x, y], …], … }],
//     marks?: [{ x?, y?, at?: [x, y], label }] }
import { useId } from 'react';
import { GUIDE, MUTED, SIGNAL, SIGNAL_TEXT, colourOf, formatTick, niceStep, samplesOf } from './figureMath';
import { Svg, Text } from './kit';

const W = 360;
const H = 224;
const M = { left: 42, right: 14, top: 16, bottom: 34 };
function ticksFor([a, b], count) {
  const step = niceStep(b - a, count);
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(+v.toPrecision(12));
  return out;
}

function logTicks([a, b]) {
  const out = [];
  for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.floor(Math.log10(b) + 1e-9); e++) out.push(10 ** e);
  return out;
}

export default function Plot({ alt, x, y, series = [], marks = [], xLabel, yLabel, logX = false, legend }) {
  const uid = useId();
  if (!Array.isArray(x) || !(x[1] > x[0]) || series.length === 0) throw new Error('A plot needs an x range and a series.');
  const curves = series.map((s, i) => ({ ...s, colour: s.colour ?? colourOf(i), pts: samplesOf(s, x, logX) }));
  let range = y;
  if (!range) {
    const ys = curves.flatMap((c) => c.pts.map((p) => p[1])).filter(Number.isFinite);
    let lo = Math.min(0, ...ys);
    let hi = Math.max(0, ...ys);
    if (hi === lo) hi = lo + 1;
    const pad = (hi - lo) * 0.08;
    range = [lo < 0 ? lo - pad : lo, hi + pad];
  }
  const [y0, y1] = range;
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const sx = (v) => M.left + (logX ? (Math.log10(v) - Math.log10(x[0])) / (Math.log10(x[1]) - Math.log10(x[0])) : (v - x[0]) / (x[1] - x[0])) * iw;
  const sy = (v) => M.top + (1 - (v - y0) / (y1 - y0)) * ih;
  const clipId = `plot${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // A curve breaks where it isn't defined (a gap), and leaves the frame clipped.
  const pathOf = (pts) => {
    let d = '';
    let pen = false;
    for (const [px, py] of pts) {
      if (!Number.isFinite(py) || !Number.isFinite(px)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${sx(px).toFixed(2)},${sy(Math.max(y0 - (y1 - y0), Math.min(y1 + (y1 - y0), py))).toFixed(2)}`;
      pen = true;
    }
    return d;
  };
  const xt = logX ? logTicks(x) : ticksFor(x, 5);
  const yt = ticksFor([y0, y1], 4);
  const zeroY = y0 < 0 && y1 > 0 ? sy(0) : null;
  const labelled = curves.filter((c) => c.label);
  const showLegend = legend ?? labelled.length > 1;

  return (
    <Svg alt={alt} width={W} height={H}>
      <defs>
        <clipPath id={clipId}><rect x={M.left} y={M.top} width={iw} height={ih} /></clipPath>
      </defs>
      {/* Grid and frame */}
      {yt.map((v) => <line key={`gy${v}`} x1={M.left} x2={W - M.right} y1={sy(v)} y2={sy(v)} stroke={GUIDE} strokeOpacity="0.25" strokeWidth="1" />)}
      {xt.map((v) => <line key={`gx${v}`} y1={M.top} y2={H - M.bottom} x1={sx(v)} x2={sx(v)} stroke={GUIDE} strokeOpacity="0.25" strokeWidth="1" />)}
      {zeroY != null && <line x1={M.left} x2={W - M.right} y1={zeroY} y2={zeroY} stroke={GUIDE} strokeWidth="1.25" />}
      <polyline points={`${M.left},${M.top} ${M.left},${H - M.bottom} ${W - M.right},${H - M.bottom}`} fill="none" stroke={GUIDE} strokeWidth="1.25" />
      {yt.map((v) => <Text key={`ty${v}`} x={M.left - 6} y={sy(v)} anchor="end" size={10.5} colour={MUTED} weight={400}>{formatTick(v)}</Text>)}
      {xt.map((v) => <Text key={`tx${v}`} x={sx(v)} y={H - M.bottom + 12} size={10.5} colour={MUTED} weight={400}>{formatTick(v)}</Text>)}
      {xLabel && <Text x={W - M.right} y={H - 6} anchor="end" size={11.5} italic>{xLabel}</Text>}
      {yLabel && <Text x={M.left - 4} y={M.top - 8} anchor="start" size={11.5} italic>{yLabel}</Text>}

      <g clipPath={`url(#${clipId})`}>
        {curves.filter((c) => c.area).map((c, i) => {
          const d = pathOf(c.pts);
          const base = sy(Math.max(y0, Math.min(y1, 0)));
          const first = c.pts.find((p) => Number.isFinite(p[1]));
          const last = [...c.pts].reverse().find((p) => Number.isFinite(p[1]));
          return first && <path key={`a${i}`} d={`${d}L${sx(last[0])},${base}L${sx(first[0])},${base}Z`} fill={c.colour} fillOpacity="0.12" stroke="none" />;
        })}
        {curves.map((c, i) => (
          <path key={i} d={pathOf(c.pts)} fill="none" stroke={c.colour} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={c.dashed ? '6 4' : undefined} />
        ))}
      </g>

      {marks.map((m, i) => {
        if (m.at) {
          const [px, py] = [sx(m.at[0]), sy(m.at[1])];
          return (
            <g key={`m${i}`}>
              <line x1={px} x2={px} y1={py} y2={H - M.bottom} stroke={SIGNAL} strokeWidth="1.25" strokeDasharray="4 3" />
              <line x1={M.left} x2={px} y1={py} y2={py} stroke={SIGNAL} strokeWidth="1.25" strokeDasharray="4 3" />
              <circle cx={px} cy={py} r="3.5" fill={SIGNAL} />
              {m.label && <Text x={px + 6} y={py - 9} anchor="start" size={11} colour={SIGNAL_TEXT} weight={600}>{m.label}</Text>}
            </g>
          );
        }
        if (m.x != null) {
          const px = sx(m.x);
          return (
            <g key={`m${i}`}>
              <line x1={px} x2={px} y1={M.top} y2={H - M.bottom} stroke={SIGNAL} strokeWidth="1.25" strokeDasharray="4 3" />
              {m.label && <Text x={px + 4} y={M.top + 8} anchor="start" size={11} colour={SIGNAL_TEXT} weight={600}>{m.label}</Text>}
            </g>
          );
        }
        const py = sy(m.y);
        return (
          <g key={`m${i}`}>
            <line x1={M.left} x2={W - M.right} y1={py} y2={py} stroke={SIGNAL} strokeWidth="1.25" strokeDasharray="4 3" />
            {m.label && <Text x={W - M.right - 2} y={py - 8} anchor="end" size={11} colour={SIGNAL_TEXT} weight={600}>{m.label}</Text>}
          </g>
        );
      })}

      {showLegend && labelled.map((c, i) => (
        <g key={`l${i}`} transform={`translate(${M.left + 10}, ${M.top + 10 + i * 15})`}>
          <line x1="0" x2="16" y1="0" y2="0" stroke={c.colour} strokeWidth="2.5" strokeDasharray={c.dashed ? '5 3' : undefined} />
          <Text x={21} y={0.5} anchor="start" size={10.5}>{c.label}</Text>
        </g>
      ))}
    </Svg>
  );
}
