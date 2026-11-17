// src/features/syllabus/TopicPicker.jsx
//
// Pick any of a subject's topics, shared by Practice's builder, the custom mock
// and the custom battle. A dropdown checklist (2026-11-17), replacing a wall of
// chips that took a phone screen for EE's 18 topics:
//   closed  a field like the other selects: "All topics", or
//           "Algebra, Trigonometry and 1 more", with "2 of 15" beside it
//   open    an inline panel (not a floating popover, which a sheet would clip)
//           with a native checkbox per topic, 44 px rows on touch, two columns
//           on wider screens; "All topics" resets; Clear and Done; Escape
//           closes the panel only, and focus goes back to the field
// Nothing ticked means every topic, as on a shop's filters; ticking every
// topic is the same as all of them.
import { useId, useRef, useState } from 'react';
import { Button } from '../../components/ui';
import { ChevronDown } from '../../components/ui/icons';
import { topicsLabel } from './topicPick';

/**
 * @param {{ topics: string[], value: string[], onChange: (next: string[]) => void, label?: string, disabled?: boolean }} props
 * `value` is the picked topics; [] means all of them.
 */
export default function TopicPicker({ topics, value, onChange, label = 'Topics', disabled = false }) {
  const id = useId();
  // Open for one list: a new subject (a new list) starts closed.
  const listKey = topics.join('|');
  const [openFor, setOpenFor] = useState(null);
  const open = openFor === listKey;
  const setOpen = (next) => setOpenFor(next ? listKey : null);
  const fieldRef = useRef(null);
  const picked = new Set(value || []);
  const all = picked.size === 0;
  const pickedInOrder = topics.filter((t) => picked.has(t));
  const summary = all ? 'All topics' : topicsLabel(pickedInOrder, 2);
  const count = all ? `All ${topics.length}` : `${picked.size} of ${topics.length}`;

  const toggle = (t) => {
    const next = new Set(picked);
    if (next.has(t)) next.delete(t); else next.add(t);
    onChange(next.size === topics.length ? [] : topics.filter((x) => next.has(x)));
  };
  const close = () => {
    setOpen(false);
    fieldRef.current?.focus();
  };

  const row = 'flex items-center gap-3 px-2.5 min-h-10 pointer-coarse:min-h-11 rounded-[var(--radius-sm)] cursor-pointer hover:bg-surface2 text-sm text-textMain min-w-0';
  const box = 'h-4 w-4 shrink-0 accent-[var(--accent)] cursor-pointer';

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span id={`${id}-label`} className="text-sm font-medium text-textMain">{label}</span>
      <button
        ref={fieldRef}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left bg-bg border border-border text-textMain text-sm rounded-[var(--radius-default)] px-3.5 py-2.5 pointer-coarse:min-h-11 hover:border-[var(--accent)] aria-expanded:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span id={`${id}-value`} className="flex-1 min-w-0 [overflow-wrap:anywhere]">{summary}</span>
        <span className="shrink-0 text-xs text-muted2 tabular-nums" aria-live="polite">{count}</span>
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className={`shrink-0 text-muted transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={`${id}-panel`}
          role="group"
          aria-label={label}
          onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
          className="flex flex-col gap-1 rounded-[var(--radius-default)] border border-border bg-surface p-1.5"
        >
          <label className={`${row} font-medium border-b border-border rounded-none`}>
            <input type="checkbox" className={box} checked={all} onChange={() => onChange([])} />
            <span className="flex-1">All topics</span>
          </label>
          {/* Down each column, so an alphabetical list reads top to bottom. */}
          <div className="sm:columns-2 gap-x-2">
            {topics.map((t) => (
              <label key={t} className={`${row} break-inside-avoid`}>
                <input type="checkbox" className={box} checked={picked.has(t)} onChange={() => toggle(t)} />
                <span className="flex-1 min-w-0 [overflow-wrap:anywhere]">{t}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5 px-1">
            <span className="text-xs text-muted2">{all ? 'None ticked: every topic.' : 'Drawn evenly across them.'}</span>
            <div className="flex gap-1.5">
              {!all && <Button size="sm" variant="ghost" onClick={() => onChange([])}>Clear</Button>}
              <Button size="sm" variant="secondary" onClick={close}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
