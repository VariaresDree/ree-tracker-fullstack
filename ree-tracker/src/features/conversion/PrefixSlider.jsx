// src/features/conversion/PrefixSlider.jsx
//
// The same quantity read with another prefix. Drag or tap a stop and the reading
// changes: it never changes the conversion above it, and each stop says what it
// did to the number. A real slider, so keyboards and screen readers get one too.
import { useId, useState } from 'react';
import { SI_SCALE } from './boardMath';
import { formatNumber } from './calc';
import './prefixSlider.css';

const THUMB_PX = 24;
const LAST = SI_SCALE.length - 1;

const naturalStop = (value) => {
  const exp = Math.floor(Math.log10(Math.abs(value)) / 3 + 1e-9) * 3;
  const at = SI_SCALE.findIndex((s) => s.exp === exp);
  if (at >= 0) return at;
  return exp < SI_SCALE[0].exp ? 0 : LAST;
};

const howItMoved = (exp, symbol) => {
  if (exp === 0) return `${symbol} with no prefix`;
  const power = `10${String(Math.abs(exp)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])}`;
  return exp > 0 ? `${symbol} ÷ ${power}` : `${symbol} × ${power}`;
};

export default function PrefixSlider({ value, symbol }) {
  const id = useId();
  const [picked, setPicked] = useState(null);
  if (!value || !Number.isFinite(value)) return null;

  const index = picked ?? naturalStop(value);
  const stop = SI_SCALE[index];
  const prefix = stop.exp === 0 ? '' : stop.label;
  const reading = `${formatNumber(value / 10 ** stop.exp)} ${prefix}${symbol}`;

  // A tap lands where it's aimed: iOS only moves a range input for a drag of its thumb.
  const aim = (e) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    if (width <= THUMB_PX) return;
    const at = ((e.clientX - left - THUMB_PX / 2) / (width - THUMB_PX)) * LAST;
    setPicked(Math.min(LAST, Math.max(0, Math.round(at))));
  };

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-textMain">Read it with a prefix</label>
        <span className="text-xs text-muted2 tabular-nums">{howItMoved(stop.exp, symbol)}</span>
      </div>
      <p className="text-xl font-semibold text-textMain tabular-nums [overflow-wrap:anywhere]" aria-live="polite">{reading}</p>
      <input
        id={id}
        type="range"
        min={0}
        max={LAST}
        step={1}
        value={index}
        aria-valuetext={reading}
        className="prefix-slider"
        style={{ '--prefix-fill': `${(index / LAST) * 100}%` }}
        onChange={(e) => setPicked(Number(e.target.value))}
        onPointerDown={aim}
      />
      {/* Set against the thumb's centre, which stops half a thumb short of each end. */}
      <div aria-hidden="true" className="relative h-5 text-xs tabular-nums">
        {SI_SCALE.map((s, i) => (
          <span
            key={s.label}
            className={`absolute -translate-x-1/2 ${i === index ? 'font-semibold text-textMain' : 'text-muted2'}`}
            style={{ left: `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${i / LAST})` }}
          >
            {s.exp === 0 ? symbol : s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
