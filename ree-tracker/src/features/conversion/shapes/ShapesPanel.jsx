// src/features/conversion/shapes/ShapesPanel.jsx
//
// Library > Units and tools > Shapes: plane figures and solids, each drawn and
// named, with its formulas and a small calculator that shows the numbers put
// into the formula. The data and maths are in shapes.js. Lazy, like every view
// here, so KaTeX and the drawings stay out of the boot download.
import { useId, useState } from 'react';
import { Button, Card, FormField, Grid, Input, SegmentedControl, Select } from '../../../components/ui';
import { ChevronDown } from '../../../components/ui/icons';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { evaluate, formatNumber } from '../calc';
import OnThisPage, { JUMP_TARGET } from '../OnThisPage';
import ShapeFigure from './ShapeFigure';
import {
  MAX_SIDES, MIN_SIDES, NAMED_IN_TABLE, PLATONIC, POLYGON_KNOWN, POLYGON_NAMES, SHAPE_SECTIONS,
  polygonAngles, solvePlatonic, solvePolygon,
} from './shapes';

const num = (text) => {
  const result = evaluate(text);
  return result.ok ? result.value : NaN;
};
const f = (n) => formatNumber(n, 6);
const ABOVE_ZERO = 'Each value has to be a number above zero.';

// About 150 fixed formulas from shapes.js, so KaTeX straight, once each:
// through LatexRenderer's Markdown pipeline the page took 2.5 s to open.
const rendered = new Map();
function Tex({ tex }) {
  if (!rendered.has(tex)) rendered.set(tex, katex.renderToString(tex, { throwOnError: false, errorColor: 'var(--accent-danger)' }));
  return <span dangerouslySetInnerHTML={{ __html: rendered.get(tex) }} />;
}

function NumField({ label, value, onChange }) {
  const result = evaluate(value);
  return (
    <FormField label={label} error={value.trim() && !result.ok && !result.incomplete ? result.error : undefined}>
      <Input value={value} inputMode="decimal" autoComplete="off" spellCheck={false} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

const Needs = ({ children }) => <p role="status" className="text-sm text-muted2">{children}</p>;

function Answers({ results }) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <Grid kind="tiles" gap="sm" as="dl">
        {results.map((r) => (
          <Card key={r.label} variant="inset" padding="sm" className="min-w-0">
            <dt className="text-eyebrow">{r.label}</dt>
            <dd className="text-sm font-semibold text-textMain tabular-nums [overflow-wrap:anywhere]">{r.text ?? `${f(r.value)}${r.unit}`}</dd>
          </Card>
        ))}
      </Grid>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm text-muted2">With your numbers</p>
        {results.filter((r) => r.working).map((r) => (
          <p key={r.label} className="rounded-[var(--radius-default)] bg-surface2/60 px-3 py-2 text-sm text-textMain tabular-nums [overflow-wrap:anywhere]">{r.working}</p>
        ))}
      </div>
    </div>
  );
}

// Folded until asked for: a page of open forms would bury the drawings.
function WorkItOut({ name, children }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <Button variant="secondary" size="sm" className="self-start" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
        Work one out<span className="sr-only">: {name}</span>
        <ChevronDown size={15} strokeWidth={1.75} aria-hidden="true" className={`transition-[rotate] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && <div id={bodyId} className="flex flex-col gap-4 min-w-0">{children}</div>}
    </div>
  );
}

function Calculator({ calcs }) {
  const [modeId, setModeId] = useState(calcs[0].id);
  const [texts, setTexts] = useState(() => Object.fromEntries(calcs.map((c) => [c.id, Object.fromEntries(c.inputs.map(([key, , start]) => [key, start]))])));
  const calc = calcs.find((c) => c.id === modeId);
  const mine = texts[calc.id];
  const values = Object.fromEntries(calc.inputs.map(([key]) => [key, num(mine[key])]));
  const ready = Object.values(values).every((v) => Number.isFinite(v) && v > 0);
  const answer = ready ? calc.solve(values) : null;
  const set = (key, text) => setTexts((all) => ({ ...all, [calc.id]: { ...all[calc.id], [key]: text } }));
  return (
    <>
      {calcs.length > 1 && (
        <SegmentedControl label="What you know" size="sm" value={modeId} onChange={setModeId} options={calcs.map((c) => ({ value: c.id, label: c.label }))} />
      )}
      <div className="grid grid-cols-2 gap-3 min-w-0">
        {calc.inputs.map(([key, label]) => <NumField key={`${calc.id}:${key}`} label={label} value={mine[key]} onChange={(text) => set(key, text)} />)}
      </div>
      {!ready && <Needs>{ABOVE_ZERO}</Needs>}
      {answer?.error && <Needs>{answer.error}</Needs>}
      {answer?.results && <Answers results={answer.results} />}
    </>
  );
}

function Formulas({ list }) {
  return (
    <dl className="flex flex-col gap-2.5 min-w-0">
      {list.map(([label, tex]) => (
        <div key={label} className="flex flex-col gap-0.5 min-w-0">
          <dt className="text-xs text-muted2">{label}</dt>
          {/* A long formula scrolls on its own rather than widening the card. */}
          <dd className="min-w-0 overflow-x-auto overflow-y-hidden whitespace-nowrap py-1 text-textMain"><Tex tex={tex} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Shell({ shape, children }) {
  const id = `shape-${shape.id}`;
  return (
    <Card as="article" padding="sm" aria-labelledby={id} className="flex flex-col gap-3 min-w-0">
      <h3 id={id} tabIndex={-1} className={`text-base font-semibold text-textMain ${JUMP_TARGET}`}>{shape.name}</h3>
      {shape.about && <p className="text-sm text-muted2">{shape.about}</p>}
      {children}
    </Card>
  );
}

function Kinds({ kinds }) {
  return kinds.map((group) => (
    <div key={group.by} role="group" aria-label={group.by} className="flex flex-col gap-2 min-w-0">
      <p className="text-eyebrow">{group.by}</p>
      <ul className="grid grid-cols-3 gap-2 min-w-0">
        {group.items.map((k) => (
          <li key={k.id} className="flex flex-col items-center gap-1 text-center min-w-0">
            <ShapeFigure figure="kind" kind={k.id} name={k.name} />
            <span className="text-sm font-semibold text-textMain">{k.name}</span>
            <span className="text-xs text-muted2">{k.rule}</span>
            {k.tex && <span className="text-xs text-textMain"><Tex tex={k.tex} /></span>}
          </li>
        ))}
      </ul>
    </div>
  ));
}

function PolygonNames({ shape }) {
  return (
    <Shell shape={shape}>
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Regular polygons by number of sides</caption>
          <thead>
            <tr className="text-left text-eyebrow">
              <th scope="col" className="py-1.5 pr-2 font-normal">n</th>
              <th scope="col" className="py-1.5 pr-2 font-normal">Name</th>
              <th scope="col" className="py-1.5 pr-2 font-normal text-right">Each angle</th>
              <th scope="col" className="py-1.5 pr-2 font-normal text-right">Sum</th>
              <th scope="col" className="py-1.5 font-normal text-right">Diagonals</th>
            </tr>
          </thead>
          <tbody>
            {NAMED_IN_TABLE.map((n) => {
              const a = polygonAngles(n);
              return (
                <tr key={n} className="border-t border-border2/40">
                  <td className="py-1.5 pr-2 text-muted2">{n}</td>
                  <th scope="row" className="py-1.5 pr-2 text-left font-semibold text-textMain">{POLYGON_NAMES[n]}</th>
                  <td className="py-1.5 pr-2 text-right text-muted2">{f(a.interior)}°</td>
                  <td className="py-1.5 pr-2 text-right text-muted2">{f(a.sum)}°</td>
                  <td className="py-1.5 text-right text-muted2">{a.diagonals}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

const SIDE_OPTIONS = Array.from({ length: MAX_SIDES - MIN_SIDES + 1 }, (_, i) => MIN_SIDES + i);

function NgonCard({ shape }) {
  const [n, setN] = useState(6);
  const [known, setKnown] = useState('side');
  const [text, setText] = useState('1');
  const value = num(text);
  const what = POLYGON_KNOWN.find((k) => k.value === known);
  return (
    <Shell shape={shape}>
      <FormField label="Sides n" className="max-w-xs">
        <Select value={n} onChange={(e) => setN(Number(e.target.value))}>
          {SIDE_OPTIONS.map((k) => <option key={k} value={k}>{k} · {POLYGON_NAMES[k]}</option>)}
        </Select>
      </FormField>
      <ShapeFigure figure="ngon" n={n} />
      <Formulas list={shape.formulas} />
      <WorkItOut name={shape.name}>
        <SegmentedControl label="What you know" size="sm" value={known} onChange={setKnown} options={POLYGON_KNOWN.map((k) => ({ value: k.value, label: k.label.split(' ')[0] }))} />
        <NumField label={what.label} value={text} onChange={setText} />
        {Number.isFinite(value) && value > 0 ? <Answers results={solvePolygon(n, known, value)} /> : <Needs>{ABOVE_ZERO}</Needs>}
      </WorkItOut>
    </Shell>
  );
}

function PlatonicCard({ shape }) {
  const [id, setId] = useState('cube');
  const [text, setText] = useState('1');
  const solid = PLATONIC.find((p) => p.id === id);
  const a = num(text);
  return (
    <Shell shape={shape}>
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">The five Platonic solids: faces F, vertices V, edges E and the shape of each face</caption>
          <thead>
            <tr className="text-left text-eyebrow">
              <th scope="col" className="py-1.5 pr-2 font-normal">Solid</th>
              <th scope="col" className="py-1.5 pr-2 font-normal text-right"><abbr title="Faces" className="no-underline">F</abbr></th>
              <th scope="col" className="py-1.5 pr-2 font-normal text-right"><abbr title="Vertices" className="no-underline">V</abbr></th>
              <th scope="col" className="py-1.5 pr-2 font-normal text-right"><abbr title="Edges" className="no-underline">E</abbr></th>
              <th scope="col" className="py-1.5 pl-1 font-normal">Face</th>
            </tr>
          </thead>
          <tbody>
            {PLATONIC.map((p) => (
              <tr key={p.id} className="border-t border-border2/40">
                <th scope="row" className="py-1.5 pr-2 text-left font-semibold text-textMain">{p.name}</th>
                <td className="py-1.5 pr-2 text-right text-muted2">{p.faces}</td>
                <td className="py-1.5 pr-2 text-right text-muted2">{p.vertices}</td>
                <td className="py-1.5 pr-2 text-right text-muted2">{p.edges}</td>
                <td className="py-1.5 pl-1 text-muted2">{p.face}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Formulas list={shape.formulas} />
      <FormField label="Solid" className="max-w-xs">
        <Select value={id} onChange={(e) => setId(e.target.value)}>
          {PLATONIC.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </FormField>
      <ShapeFigure figure={id} />
      <Formulas list={[['Volume, edge a', solid.volumeTex], ['Surface area', solid.areaTex]]} />
      <WorkItOut name={shape.name}>
        <NumField label="Edge a" value={text} onChange={setText} />
        {Number.isFinite(a) && a > 0 ? <Answers results={solvePlatonic(id, a)} /> : <Needs>{ABOVE_ZERO}</Needs>}
      </WorkItOut>
    </Shell>
  );
}

function ShapeCard({ shape }) {
  if (shape.id === 'polygon-names') return <PolygonNames shape={shape} />;
  if (shape.id === 'ngon') return <NgonCard shape={shape} />;
  if (shape.id === 'platonic') return <PlatonicCard shape={shape} />;
  return (
    <Shell shape={shape}>
      {shape.kinds ? <Kinds kinds={shape.kinds} /> : <ShapeFigure figure={shape.figure} />}
      <Formulas list={shape.formulas} />
      {shape.calcs && <WorkItOut name={shape.name}><Calculator calcs={shape.calcs} /></WorkItOut>}
    </Shell>
  );
}

export default function ShapesPanel() {
  return (
    <div className="flex flex-col gap-6 min-w-0">
      <p className="text-sm text-muted2">Plane figures and solids, drawn and named, with their formulas and a calculator for each. Use any one unit of length: areas come out in it squared, volumes cubed.</p>
      <OnThisPage items={SHAPE_SECTIONS.map((s) => ({ id: `shapes-${s.id}`, label: s.label }))} />
      {SHAPE_SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`shapes-${section.id}`} className="flex flex-col gap-3 min-w-0">
          <h3 id={`shapes-${section.id}`} tabIndex={-1} className={`text-h3 text-textMain ${JUMP_TARGET}`}>{section.label}</h3>
          {section.shapes.length > 4 && (
            <OnThisPage select label={`Go to a shape in ${section.label.toLowerCase()}`} items={section.shapes.map((s) => ({ id: `shape-${s.id}`, label: s.name }))} />
          )}
          <Grid kind="pair" gap="sm">
            {section.shapes.map((shape) => <ShapeCard key={shape.id} shape={shape} />)}
          </Grid>
        </section>
      ))}
    </div>
  );
}
