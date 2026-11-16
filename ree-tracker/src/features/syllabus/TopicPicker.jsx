// src/features/syllabus/TopicPicker.jsx
//
// Pick any of a subject's topics (2026-11-16), shared by Practice's builder,
// the custom mock and the custom battle. "All topics" is the default and clears
// the pick; each topic toggles. A picked chip shows a check as well as its
// colour, and the count of what's picked is announced.
import { Button } from '../../components/ui';
import { Check } from '../../components/ui/icons';

/**
 * @param {{ topics: string[], value: string[], onChange: (next: string[]) => void, label?: string, disabled?: boolean }} props
 * `value` is the picked topics; [] means all of them.
 */
export default function TopicPicker({ topics, value, onChange, label = 'Topics', disabled = false }) {
  const picked = new Set(value || []);
  const all = picked.size === 0;
  const toggle = (t) => {
    const next = new Set(picked);
    if (next.has(t)) next.delete(t); else next.add(t);
    // Every topic picked is the same as all of them.
    onChange(next.size === topics.length ? [] : topics.filter((x) => next.has(x)));
  };
  const chip = (on, text, onClick, key) => (
    <Button key={key} size="sm" variant={on ? 'outline' : 'secondary'} aria-pressed={on} disabled={disabled} onClick={onClick} className="max-w-full h-auto min-h-8 py-1.5 whitespace-normal">{/* long names wrap inside the chip */}
      {on && <Check size={14} strokeWidth={2} aria-hidden="true" className="shrink-0" />}
      <span className="min-w-0 [overflow-wrap:anywhere] text-left">{text}</span>
    </Button>
  );
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-textMain">{label}</span>
        <span className="text-xs text-muted2 tabular-nums" aria-live="polite">
          {all ? `All ${topics.length}` : `${picked.size} of ${topics.length} picked`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chip(all, 'All topics', () => onChange([]), '__all')}
        {topics.map((t) => chip(picked.has(t), t, () => toggle(t), t))}
      </div>
      <p className="text-xs text-muted2">Pick one or more. Several are drawn evenly.</p>
    </div>
  );
}
