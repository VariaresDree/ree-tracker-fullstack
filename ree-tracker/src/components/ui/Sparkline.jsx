// A dependency-free sparkline. It sits on paths where recharts must not load
// (the Today card is on the boot path), and a trend this small doesn't need
// axes. Decorative: the numbers it draws are always written out beside it.
export function Sparkline({ scores, width = 120, height = 28, color = 'var(--accent-velocity)' }) {
  if (!scores || scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = Math.max(1, max - min);
  const pts = scores
    .map((v, i) => `${(i / (scores.length - 1)) * width},${height - ((v - min) / span) * (height - 4) - 2}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
