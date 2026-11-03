import { useId, useState } from 'react';
import { Button } from './Button';
import { StatusPill } from './StatusPill';
import './ScaleSlider.css';

// A rating on a labelled scale: a native range input, so keyboards and screen
// readers get a real slider, with its word in a coloured pill so colour never
// carries the meaning alone. It may hold no rating at all, which a range input
// can't, so that shows as an empty track with a hollow thumb.
//
// `stops` are { value, label, tone, fill }, low to high; `fillGradient` runs along
// the track; `anchors` are the three words under it. It reports once, on release,
// so dragging across three stops saves one change.
//
// Imported by its path, not from the ui index, so its CSS stays out of the boot download.
const THUMB_PX = 24;

export function ScaleSlider({ label, stops, anchors, fillGradient, value, onCommit }) {
  const id = useId();
  const saved = stops.findIndex((s) => s.value === value);
  const [moving, setMoving] = useState(null);
  const index = moving ?? saved;
  const stop = stops[index];
  const last = stops.length - 1;

  const release = () => {
    if (moving !== null && moving !== saved) onCommit(stops[moving].value);
    setMoving(null);
  };
  // A tap lands where it's aimed, unrated or not: a range input doesn't report a
  // tap on the value it already holds, and iOS only moves for a drag of the thumb.
  const aim = (e) => {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const at = width > THUMB_PX ? ((e.clientX - left - THUMB_PX / 2) / (width - THUMB_PX)) * last : index;
    setMoving(Math.min(last, Math.max(0, Math.round(at))));
  };
  // The first stop, from the keyboard, when nothing is rated yet.
  const keyDown = (e) => {
    if (saved < 0 && moving === null && (e.key === 'Home' || e.key === 'Enter' || e.key === ' ')) setMoving(0);
  };

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <label htmlFor={id} className="text-sm font-medium text-textMain">{label}</label>
        <span className="flex items-center gap-1">
          <StatusPill tone={stop?.tone || 'neutral'} dot={!!stop}>{stop?.label || 'Not rated'}</StatusPill>
          {saved >= 0 && <Button variant="ghost" size="sm" aria-label={`Clear: ${label}`} onClick={() => onCommit(null)}>Clear</Button>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={last}
        step={1}
        value={index < 0 ? 0 : index}
        aria-valuetext={stop?.label || 'Not rated'}
        className="scale-slider"
        style={{
          '--scale-fill': `${index < 0 ? 0 : (index / last) * 100}%`,
          '--scale-gradient': fillGradient,
          ...(stop ? { '--scale-at': stop.fill } : null),
        }}
        onChange={(e) => setMoving(Number(e.target.value))}
        onPointerDown={aim}
        onPointerUp={release}
        onPointerCancel={() => setMoving(null)}
        onKeyDown={keyDown}
        onKeyUp={release}
        onBlur={release}
      />
      <div aria-hidden="true" className="grid grid-cols-3 gap-2 text-xs text-muted2">
        <span>{anchors[0]}</span>
        <span className="text-center">{anchors[1]}</span>
        <span className="text-right">{anchors[2]}</span>
      </div>
    </div>
  );
}

export default ScaleSlider;
