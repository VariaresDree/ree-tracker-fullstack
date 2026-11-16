// src/features/conversion/OnThisPage.jsx
//
// A short list of links to the sections below, for a long page on a phone. A
// link scrolls its section to the top (smoothly, unless motion is reduced) and
// moves focus there, without touching the URL: Units and tools keeps its state
// in the query string, and a hash would add a Back step. A long list (a
// section's own shapes) is a select instead, so it stays one line on a phone.
import { Button, FormField, Select } from '../../components/ui';
import { prefersReducedMotion } from '../../motion/presets';

// For the element a link lands on: clear of the phone header, and focusable.
export const JUMP_TARGET = 'scroll-mt-[calc(var(--sticky-top,0px)+0.75rem)] focus:outline-hidden';

function jumpTo(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView?.({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  target.focus?.({ preventScroll: true });
}

export default function OnThisPage({ items, label = 'On this page', select = false }) {
  if (items.length < 2) return null;
  if (select) {
    return (
      <FormField label={label} className="max-w-xs">
        <Select value="" onChange={(e) => jumpTo(e.target.value)}>
          <option value="" disabled>Go to…</option>
          {items.map(({ id, label: text }) => <option key={id} value={id}>{text}</option>)}
        </Select>
      </FormField>
    );
  }
  return (
    <nav aria-label={label} className="flex flex-col gap-1.5 min-w-0">
      <p className="text-eyebrow" aria-hidden="true">{label}</p>
      <ul className="flex flex-wrap gap-1.5 min-w-0">
        {items.map(({ id, label: text }) => (
          <li key={id} className="min-w-0">
            <Button
              as="a"
              href={`#${id}`}
              size="sm"
              variant="ghost"
              className="normal-case font-medium border border-border2/70"
              onClick={(event) => { event.preventDefault(); jumpTo(id); }}
            >
              {text}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
