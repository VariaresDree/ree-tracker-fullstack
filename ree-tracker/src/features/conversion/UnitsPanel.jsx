// src/features/conversion/UnitsPanel.jsx
//
// Unit conversion: pick a category, or search, then convert. The state comes from
// outside, so Library can keep it in the URL (a conversion can be linked) and
// Practice's tools sheet can hold it for the moment. No network, no rates.
import { useEffect, useMemo, useState } from 'react';
import { UNIT_CATEGORIES, UNIT_GROUPS, categoryById, convert, convertAll, inSiUnit, searchUnits, unitIn } from '@ree/shared/units';
import { Button, Card, FormField, Grid, Input, Select } from '../../components/ui';
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, Copy, Search, Star, Trash2 } from '../../components/ui/icons';
import { SI_SCALE, scalePosition, withPrefix } from './boardMath';
import { evaluate, formatNumber } from './calc';
import { useUnitsMemory } from './unitsMemory';

const pairFor = (category, from, to) => {
  const a = unitIn(category, from)?.id || category.defaults[0];
  const fallback = category.defaults.find((d) => d !== a) || category.units.find((u) => u.id !== a)?.id;
  const b = unitIn(category, to) && to !== a ? to : fallback;
  return [a, b];
};

const numberOf = (text) => {
  const result = evaluate(text);
  return result.ok ? result.value : null;
};

function MagnitudeBar({ categoryId, value, from }) {
  const category = categoryById(categoryId);
  const si = value === null ? null : inSiUnit(categoryId, value, from);
  const position = scalePosition(si);
  if (position === null) return null;
  const text = withPrefix(si, category.siUnit);
  return (
    <div role="img" aria-label={`On the SI prefix scale, that’s ${text}`} className="flex flex-col gap-1.5 min-w-0">
      <p className="text-xs text-muted2">On the SI scale: <span className="font-semibold text-textMain tabular-nums">{text}</span></p>
      <div className="relative h-2 rounded-full bg-surface2 border border-border2/60">
        <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)] border-2 border-surface" style={{ left: `${position * 100}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted2 tabular-nums" aria-hidden="true">
        {SI_SCALE.map((s) => <span key={s.label}>{s.label}</span>)}
      </div>
    </div>
  );
}

function Converter({ state, onChange, memory }) {
  const category = categoryById(state.cat);
  const [from, to] = pairFor(category, state.from, state.to);
  // Its own state, with the URL following: a router update can land a frame after
  // the keystroke, which would drop characters and move the caret.
  const [text, setText] = useState(state.v ?? '1');
  const parsed = evaluate(text);
  const value = parsed.ok ? parsed.value : null;
  const result = value === null ? null : convert(category.id, value, from, to);
  const shown = formatNumber(result);
  const one = formatNumber(convert(category.id, 1, from, to));
  const isLinear = !unitIn(category, from).toBase && !unitIn(category, to).toBase;
  const isExpression = parsed.ok && String(parsed.value) !== text.trim();
  const others = value === null ? [] : convertAll(category.id, value, from);
  const favourite = memory.isFavourite(category.id, from, to);
  const [copied, setCopied] = useState(false);

  const { remember } = memory;
  useEffect(() => {
    if (value === null || result === null) return undefined;
    const timer = setTimeout(() => remember({ cat: category.id, from, to, v: text }), 1500);
    return () => clearTimeout(timer);
  }, [category.id, from, to, text, value, result, remember]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* the number is on screen to copy by hand */ }
  };
  const unitOptions = category.units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.id})</option>);

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onChange({ cat: null, from: null, to: null, v: null }, { push: true })}>
          <ChevronLeft size={15} strokeWidth={1.75} aria-hidden="true" /> All units
        </Button>
        <h3 className="text-h3 text-textMain min-w-0 flex-1 [overflow-wrap:anywhere]">{category.label}</h3>
        <Button
          size="icon"
          variant="ghost"
          tone="amber"
          aria-pressed={favourite}
          aria-label={favourite ? `Remove ${from} to ${to} from favourites` : `Add ${from} to ${to} to favourites`}
          onClick={() => memory.toggleFavourite({ cat: category.id, from, to })}
        >
          <Star size={16} strokeWidth={1.75} fill={favourite ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
      </div>

      <Card padding="sm" className="flex flex-col gap-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
          <div className="flex flex-col gap-2 min-w-0">
            <FormField
              label="From"
              error={text.trim() && !parsed.ok ? parsed.error : undefined}
              hint={isExpression ? `= ${formatNumber(parsed.value)}` : 'A number, or a sum like 2*pi*60'}
            >
              <Input value={text} autoComplete="off" spellCheck={false} onChange={(e) => { setText(e.target.value); onChange({ cat: category.id, from, to, v: e.target.value }); }} />
            </FormField>
            <FormField label="From unit">
              <Select value={from} onChange={(e) => onChange({ cat: category.id, from: e.target.value, to: e.target.value === to ? from : to, v: text })}>{unitOptions}</Select>
            </FormField>
          </div>
          <div className="flex justify-center sm:pt-7">
            <Button size="icon" variant="secondary" aria-label="Swap the units" title="Swap the units" onClick={() => onChange({ cat: category.id, from: to, to: from, v: text })}>
              <ArrowLeftRight size={16} strokeWidth={1.75} aria-hidden="true" className="rotate-90 sm:rotate-0" />
            </Button>
          </div>
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-label">To</p>
              <div className="flex items-center gap-2 min-w-0 rounded-[var(--radius-default)] border border-border2 bg-surface2/40 px-3 min-h-11">
                <output className="flex-1 min-w-0 text-fluid-base font-semibold text-textMain tabular-nums [overflow-wrap:anywhere]" aria-live="polite">{shown}</output>
                <Button size="icon" variant="ghost" className="shrink-0" disabled={result === null} aria-label={copied ? 'Copied' : 'Copy the result'} title={copied ? 'Copied' : 'Copy the result'} onClick={copy}>
                  {copied ? <Check size={15} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.75} aria-hidden="true" />}
                </Button>
              </div>
            </div>
            <FormField label="To unit">
              <Select value={to} onChange={(e) => onChange({ cat: category.id, from: e.target.value === from ? to : from, to: e.target.value, v: text })}>{unitOptions}</Select>
            </FormField>
          </div>
        </div>
        {isLinear && <p className="text-sm text-muted2 tabular-nums [overflow-wrap:anywhere]">1 {from} = {one} {to}</p>}
        <MagnitudeBar categoryId={category.id} value={value} from={from} />
      </Card>

      {others.length > 0 && (
        <section aria-labelledby="all-units" className="flex flex-col gap-2 min-w-0">
          <p id="all-units" className="text-eyebrow">In every unit</p>
          <ul className="flex flex-col gap-1 min-w-0">
            {others.filter((o) => o.unit.id !== from).map((o) => (
              <li key={o.unit.id} className="min-w-0">
                <Button
                  variant="ghost"
                  className="w-full text-left h-auto"
                  aria-pressed={o.unit.id === to}
                  onClick={() => onChange({ cat: category.id, from, to: o.unit.id, v: text })}
                >
                  <span className="flex w-full items-baseline justify-between gap-3 min-w-0">
                    <span className="min-w-0 [overflow-wrap:anywhere] font-normal text-muted2">{o.unit.name}</span>
                    <span className="min-w-0 text-right tabular-nums [overflow-wrap:anywhere]">{formatNumber(o.value)} {o.unit.id}</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Landing({ onChange, memory }) {
  const [query, setQuery] = useState('');
  const hits = useMemo(() => searchUnits(query).slice(0, 20), [query]);
  const open = (cat, from, to, v = '1') => onChange({ cat, from, to, v }, { push: true });
  const openUnit = (hit) => {
    const [from, to] = pairFor(hit.category, hit.unit.id, null);
    open(hit.category.id, from, to);
  };

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <FormField label="Search units">
        {(field) => (
          <div className="relative">
            <Search size={15} strokeWidth={1.75} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <Input {...field} className="pl-9" value={query} placeholder="hp, kVA, circular mil…" autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}
      </FormField>

      {query.trim() ? (
        hits.length > 0 ? (
          <ul aria-label="Matching units" className="flex flex-col gap-1">
            {hits.map((hit) => (
              <li key={`${hit.category.id}:${hit.unit.id}`}>
                <Button variant="ghost" className="w-full text-left h-auto" onClick={() => openUnit(hit)}>
                  <span className="flex w-full items-baseline justify-between gap-3 min-w-0">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{hit.unit.name} ({hit.unit.id})</span>
                    <span className="shrink-0 font-normal text-xs text-muted2">{hit.category.label}</span>
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : <p role="status" className="text-sm text-muted2">No unit by that name.</p>
      ) : (
        <>
          {memory.favourites.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-eyebrow">Favourites</h3>
              <div className="flex flex-wrap gap-2">
                {memory.favourites.map((f) => (
                  <Button key={`${f.cat}:${f.from}:${f.to}`} size="sm" variant="secondary" onClick={() => open(f.cat, f.from, f.to)}>{f.from} → {f.to}</Button>
                ))}
              </div>
            </div>
          )}

          {UNIT_GROUPS.map((group) => (
            <div key={group.id} className="flex flex-col gap-2 min-w-0">
              <h3 className="text-eyebrow">{group.label}</h3>
              <Grid kind="tiles" gap="sm">
                {UNIT_CATEGORIES.filter((c) => c.group === group.id).map((c) => (
                  <Card key={c.id} as="button" type="button" variant="interactive" padding="sm" className="text-left flex items-start justify-between gap-2 cursor-pointer min-w-0" onClick={() => open(c.id, c.defaults[0], c.defaults[1])}>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{c.label}</span>
                      <span className="block text-xs text-muted2 [overflow-wrap:anywhere]">{c.defaults.join(', ')}</span>
                    </span>
                    <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0 mt-0.5" />
                  </Card>
                ))}
              </Grid>
            </div>
          ))}

          {memory.history.length > 0 && (
            <div className="flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-eyebrow">Recent</h3>
                <Button size="sm" variant="ghost" onClick={memory.clearHistory}>
                  <Trash2 size={13} strokeWidth={1.75} aria-hidden="true" /> Clear
                </Button>
              </div>
              <ul className="flex flex-col gap-1 min-w-0">
                {memory.history.map((h) => {
                  const value = numberOf(h.v);
                  const out = value === null ? null : convert(h.cat, value, h.from, h.to);
                  if (out === null) return null;
                  return (
                    <li key={`${h.cat}:${h.from}:${h.to}:${h.v}`} className="min-w-0">
                      <Button variant="ghost" className="w-full text-left h-auto font-normal tabular-nums" onClick={() => open(h.cat, h.from, h.to, h.v)}>
                        <span className="w-full min-w-0 [overflow-wrap:anywhere]">{h.v} {h.from} = {formatNumber(out)} {h.to}</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function UnitsPanel({ state, onChange }) {
  const memory = useUnitsMemory();
  return categoryById(state.cat)
    ? <Converter key={state.cat} state={state} onChange={onChange} memory={memory} />
    : <Landing onChange={onChange} memory={memory} />;
}
