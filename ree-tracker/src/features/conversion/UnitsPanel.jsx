// src/features/conversion/UnitsPanel.jsx
//
// Unit conversion, for changing between SI, other metric units and English ones.
// Pick a quantity's tile, a favourite or a search result, then convert: every
// conversion shows its multiplier, its formula and why. Changing only a prefix has
// its own screen. The state comes from outside, so Library can keep it in the URL
// and Practice's tools sheet can hold it for the moment. No network, no rates.
import { useEffect, useMemo, useState } from 'react';
import { UNIT_CATEGORIES, UNIT_GROUPS, UNIT_SYSTEMS, categoryById, convert, convertAll, inSiUnit, searchUnits, unitIn } from '@ree/shared/units';
import { Button, Card, FormField, Grid, Input, SegmentedControl, Select, StatusPill } from '../../components/ui';
import { ArrowLeftRight, Check, ChevronLeft, Copy, Search, Star, Trash2 } from '../../components/ui/icons';
import { evaluate, formatNumber } from './calc';
import { explain } from './explain';
import IconTile from './IconTile';
import PrefixSlider from './PrefixSlider';
import { useUnitsMemory } from './unitsMemory';
import { GROUP_TONE, UNIT_TILES } from './unitTiles';

// Each quantity once, under its own group: `alsoIn` would show pressure three times.
const SHOWN = UNIT_CATEGORIES.filter((c) => UNIT_GROUPS.some((g) => g.id === c.group));
const shortName = (c) => UNIT_TILES[c.id]?.short || c.label;
const A_TO_Z = [...SHOWN].sort((a, b) => shortName(a).localeCompare(shortName(b)));
const ORDERS = [
  { value: 'groups', label: 'Groups' },
  { value: 'az', label: 'A–Z' },
];

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

// Symbol first, so a narrow select still shows the part that matters.
function UnitOptions({ category }) {
  return UNIT_SYSTEMS.map((system) => {
    const units = category.units.filter((u) => u.system === system.id);
    if (units.length === 0) return null;
    return (
      <optgroup key={system.id} label={system.label}>
        {units.map((u) => <option key={u.id} value={u.id}>{u.id} · {u.name}</option>)}
      </optgroup>
    );
  });
}

const Line = ({ children, strong = false }) => (
  <p className={`rounded-[var(--radius-default)] bg-surface2/60 px-3 py-2 text-sm tabular-nums [overflow-wrap:anywhere] ${strong ? 'font-semibold text-textMain' : 'text-textMain'}`}>{children}</p>
);

function HowItWorks({ how }) {
  if (!how) return null;
  return (
    <section aria-labelledby="how-it-works" className="flex flex-col gap-2.5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id="how-it-works" className="text-eyebrow">How it works</p>
        <StatusPill tone="neutral" dot={false}>{how.direction}</StatusPill>
      </div>
      {how.line ? (
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm text-muted2">The multiplier</p>
          <p className="text-lg font-semibold text-textMain tabular-nums [overflow-wrap:anywhere]">{how.line}</p>
          <p className="text-sm text-muted2 tabular-nums [overflow-wrap:anywhere]">{how.inverseLine}</p>
        </div>
      ) : <p className="text-sm text-muted2">No single multiplier here, so it takes a formula.</p>}
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm text-muted2">The formula</p>
        <Line strong>{how.formula}</Line>
        <Line>{how.back}</Line>
      </div>
      {how.working && (
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm text-muted2">Your number</p>
          <Line strong>{how.working}</Line>
        </div>
      )}
      {how.steps.length > 0 && (
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm text-muted2">Where the multiplier comes from</p>
          <ol className="flex flex-col gap-0.5 text-sm text-muted2 tabular-nums min-w-0">
            {how.steps.map((step) => <li key={step} className="[overflow-wrap:anywhere]">{step}</li>)}
          </ol>
        </div>
      )}
      {how.notes.map((note) => <p key={note} className="text-sm text-muted2 [overflow-wrap:anywhere]">{note}</p>)}
    </section>
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
  const isExpression = parsed.ok && String(parsed.value) !== text.trim();
  const others = value === null ? [] : convertAll(category.id, value, from).filter((o) => o.unit.id !== from && !o.unit.prefixed);
  const favourite = memory.isFavourite(category.id, from, to);
  const [copied, setCopied] = useState(false);
  const si = value === null ? null : inSiUnit(category.id, value, from);

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
  const pick = (nextFrom, nextTo) => onChange({ cat: category.id, from: nextFrom, to: nextTo, v: text });
  let hint = 'Or a sum: 2*pi*60';
  if (isExpression) hint = `= ${formatNumber(parsed.value)}`;
  else if (parsed.incomplete && text.trim()) hint = 'Keep going…';

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

      {category.pairs?.length > 1 && (
        <div role="group" aria-label="Common conversions here" className="flex flex-wrap gap-1.5 min-w-0">
          {category.pairs.map(([a, b]) => (
            <Button key={`${a}>${b}`} size="sm" variant={a === from && b === to ? 'secondary' : 'ghost'} className="normal-case border border-border2/70" aria-pressed={a === from && b === to} onClick={() => pick(a, b)}>
              {a} → {b}
            </Button>
          ))}
        </div>
      )}

      <Card padding="sm" className="flex flex-col gap-3 min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start gap-2 min-w-0">
          <FormField label="From" error={text.trim() && !parsed.ok && !parsed.incomplete ? parsed.error : undefined} hint={hint}>
            <Input value={text} autoComplete="off" spellCheck={false} onChange={(e) => { setText(e.target.value); onChange({ cat: category.id, from, to, v: e.target.value }); }} />
          </FormField>
          <FormField label="From unit">
            <Select value={from} onChange={(e) => pick(e.target.value, e.target.value === to ? from : to)}><UnitOptions category={category} /></Select>
          </FormField>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2 min-w-0">
          <Button size="icon" variant="secondary" aria-label="Swap the units" title="Swap the units" onClick={() => pick(to, from)}>
            <ArrowLeftRight size={16} strokeWidth={1.75} aria-hidden="true" className="rotate-90" />
          </Button>
          <FormField label="To unit">
            <Select value={to} onChange={(e) => pick(e.target.value === from ? to : from, e.target.value)}><UnitOptions category={category} /></Select>
          </FormField>
        </div>
        {/* On a line of its own: a long answer shouldn't break in a narrow box. */}
        <div className="flex items-center gap-2 min-w-0 rounded-[var(--radius-default)] border border-border2 bg-surface2/40 pl-3 pr-1 py-1 min-h-14">
          <output className="flex-1 min-w-0 text-2xl font-semibold text-textMain tabular-nums [overflow-wrap:anywhere]" aria-live="polite" aria-label="Answer">
            {shown}{result !== null && <span className="text-base font-medium text-muted2"> {to}</span>}
          </output>
          <Button size="icon" variant="ghost" className="shrink-0" disabled={result === null} aria-label={copied ? 'Copied' : 'Copy the result'} title={copied ? 'Copied' : 'Copy the result'} onClick={copy}>
            {copied ? <Check size={15} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.75} aria-hidden="true" />}
          </Button>
        </div>
      </Card>

      <Card padding="sm" className="min-w-0">
        <HowItWorks how={explain(category.id, value, from, to, result)} />
      </Card>

      {si !== null && si !== 0 && Number.isFinite(si) && (
        <Card padding="sm" className="min-w-0">
          <PrefixSlider value={si} symbol={category.siUnit} />
        </Card>
      )}

      {others.length > 0 && (
        <section aria-labelledby="all-units" className="flex flex-col gap-3 min-w-0">
          <p id="all-units" className="text-eyebrow">In other units</p>
          {UNIT_SYSTEMS.map((system) => {
            const rows = others.filter((o) => o.unit.system === system.id);
            if (rows.length === 0) return null;
            return (
              <div key={system.id} className="flex flex-col gap-0.5 min-w-0">
                <p className="text-xs font-medium text-muted2">{system.label}</p>
                <ul className="flex flex-col gap-0.5 min-w-0">
                  {rows.map((o) => (
                    <li key={o.unit.id} className="min-w-0">
                      <Button variant="ghost" className="w-full text-left h-auto normal-case" aria-pressed={o.unit.id === to} onClick={() => pick(from, o.unit.id)}>
                        <span className="flex w-full items-baseline justify-between gap-3 min-w-0">
                          <span className="min-w-0 [overflow-wrap:anywhere] font-normal text-muted2">{o.unit.name}</span>
                          <span className="min-w-0 text-right tabular-nums [overflow-wrap:anywhere]">{formatNumber(o.value)} {o.unit.id}</span>
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function CategoryTile({ category, onOpen }) {
  const [a, b] = category.defaults;
  return (
    <IconTile
      icon={UNIT_TILES[category.id]?.icon}
      tone={GROUP_TONE[category.group]}
      title={shortName(category)}
      detail={`${a} ⇄ ${b}`}
      label={`${category.label}: ${a} to ${b}`}
      onClick={() => onOpen(category.id, a, b)}
    />
  );
}

function Landing({ onChange, memory }) {
  const [query, setQuery] = useState('');
  const hits = useMemo(() => searchUnits(query).slice(0, 24), [query]);
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
            <Input {...field} className="pl-9" value={query} placeholder="psi, BTU, centipoise…" autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}
      </FormField>

      {query.trim() ? (
        hits.length > 0 ? (
          <ul aria-label="Matching units" className="flex flex-col gap-1">
            {hits.map((hit) => (
              <li key={`${hit.category.id}:${hit.unit.id}`}>
                <Button variant="ghost" className="w-full text-left h-auto normal-case" onClick={() => openUnit(hit)}>
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
            <section aria-labelledby="units-favourites" className="flex flex-col gap-2 min-w-0">
              <h3 id="units-favourites" className="text-eyebrow">Favourites</h3>
              <Grid kind="icons" gap="sm">
                {memory.favourites.map((f) => {
                  const category = categoryById(f.cat);
                  if (!category) return null;
                  return (
                    <IconTile
                      key={`${f.cat}:${f.from}:${f.to}`}
                      icon={UNIT_TILES[category.id]?.icon}
                      tone={GROUP_TONE[category.group] || 'accent'}
                      title={`${f.from} → ${f.to}`}
                      detail={shortName(category)}
                      label={`${category.label}: ${f.from} to ${f.to}`}
                      onClick={() => open(f.cat, f.from, f.to)}
                    />
                  );
                })}
              </Grid>
            </section>
          )}

          <section aria-labelledby="units-quantities" className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="units-quantities" className="text-eyebrow">Quantities</h3>
              <SegmentedControl label="Sort quantities" size="sm" value={memory.order} onChange={memory.setOrder} options={ORDERS} />
            </div>
            {memory.order === 'az' ? (
              <Grid kind="icons" gap="sm">
                {A_TO_Z.map((c) => <CategoryTile key={c.id} category={c} onOpen={open} />)}
              </Grid>
            ) : UNIT_GROUPS.map((g) => (
              <div key={g.id} role="group" aria-labelledby={`units-group-${g.id}`} className="flex flex-col gap-2 min-w-0">
                <p id={`units-group-${g.id}`} className="text-sm font-semibold text-muted2">{g.label}</p>
                <Grid kind="icons" gap="sm">
                  {SHOWN.filter((c) => c.group === g.id).map((c) => <CategoryTile key={c.id} category={c} onOpen={open} />)}
                </Grid>
              </div>
            ))}
          </section>

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
                      <Button variant="ghost" className="w-full text-left h-auto font-normal normal-case tabular-nums" onClick={() => open(h.cat, h.from, h.to, h.v)}>
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
