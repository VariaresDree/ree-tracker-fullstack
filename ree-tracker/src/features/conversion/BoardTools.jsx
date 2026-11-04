// src/features/conversion/BoardTools.jsx
//
// Tools for the kinds of sum the board keeps asking. Each is a small form over
// boardMath.js, drawn where a picture helps. Drawn in theme colours, except the
// resistor's bands, which are facts about the part.
import { useState } from 'react';
import { Button, Card, FormField, Grid, Input, Select, SegmentedControl } from '../../components/ui';
import { ChevronLeft, ChevronRight } from '../../components/ui/icons';
import {
  AWG_TABLE, BAND_COLOURS, changeBase, deltaToWye, formatPolar, formatRect, polarToRect, powerTriangle,
  rectToPolar, resistorValue, threePhase, withPrefix, wyeToDelta,
} from './boardMath';
import { evaluate, formatNumber } from './calc';

const num = (text) => {
  const result = evaluate(text);
  return result.ok ? result.value : NaN;
};

function NumField({ label, value, onChange }) {
  const result = evaluate(value);
  return (
    <FormField label={label} error={value.trim() && !result.ok ? result.error : undefined}>
      <Input value={value} autoComplete="off" spellCheck={false} onChange={(e) => onChange(e.target.value)} />
    </FormField>
  );
}

function Results({ items }) {
  return (
    <Grid kind="tiles" gap="sm" as="dl">
      {items.map(([label, value]) => (
        <Card key={label} variant="inset" padding="sm" className="min-w-0">
          <dt className="text-eyebrow">{label}</dt>
          <dd className="text-sm font-semibold text-textMain tabular-nums [overflow-wrap:anywhere]">{value}</dd>
        </Card>
      ))}
    </Grid>
  );
}

const Needs = ({ children }) => <p role="status" className="text-sm text-muted2">{children}</p>;
const fields = 'grid grid-cols-2 gap-3 min-w-0';

// ---- Power triangle ---------------------------------------------------------

const TRIANGLE_MODES = {
  'P-pf': { a: 'P (kW)', b: 'Power factor' },
  'P-Q': { a: 'P (kW)', b: 'Q (kVAR)' },
  'S-pf': { a: 'S (kVA)', b: 'Power factor' },
  'S-P': { a: 'S (kVA)', b: 'P (kW)' },
};

function TriangleDrawing({ P, Q, S, angle }) {
  const WIDTH = 280;
  const scale = Math.min(200 / Math.max(P, 1e-9), 96 / Math.max(Math.abs(Q), 1e-9));
  const x0 = 28;
  const y0 = Q >= 0 ? 22 : 128;
  const x1 = x0 + P * scale;
  const y1 = y0 + Q * scale;
  return (
    <svg viewBox={`0 0 ${WIDTH} 150`} role="img" aria-label={`Power triangle: P ${formatNumber(P, 4)}, Q ${formatNumber(Q, 4)}, S ${formatNumber(S, 4)} at ${formatNumber(angle, 4)} degrees`} className="w-full max-w-sm text-muted2">
      <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="var(--accent-success)" strokeWidth="3" strokeLinecap="round" />
      <line x1={x1} y1={y0} x2={x1} y2={y1} stroke="var(--accent-danger)" strokeWidth="3" strokeLinecap="round" />
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <g fontSize="14" fontWeight="600" fill="var(--text-main)">
        <text x={(x0 + x1) / 2} y={Q >= 0 ? y0 - 6 : y0 + 18} textAnchor="middle">P</text>
        <text x={Math.min(x1 + 8, WIDTH - 12)} y={(y0 + y1) / 2 + 5}>Q</text>
        <text x={(x0 + x1) / 2 - 10} y={(y0 + y1) / 2 + (Q >= 0 ? 18 : -8)} textAnchor="end">S</text>
        <text x={x0 - 18} y={y0 + 5}>θ</text>
      </g>
    </svg>
  );
}

function PowerTriangleTool() {
  const [mode, setMode] = useState('P-pf');
  const [a, setA] = useState('100');
  const [b, setB] = useState('0.8');
  const [leading, setLeading] = useState(false);
  const out = powerTriangle({ mode, a: num(a), b: num(b), leading });
  const valid = out && Number.isFinite(out.S);
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <SegmentedControl label="What you know" value={mode} onChange={setMode} options={[{ value: 'P-pf', label: 'P, pf' }, { value: 'P-Q', label: 'P, Q' }, { value: 'S-pf', label: 'S, pf' }, { value: 'S-P', label: 'S, P' }]} />
      <div className={fields}>
        <NumField label={TRIANGLE_MODES[mode].a} value={a} onChange={setA} />
        <NumField label={TRIANGLE_MODES[mode].b} value={b} onChange={setB} />
      </div>
      <SegmentedControl label="Load" value={leading ? 'lead' : 'lag'} onChange={(v) => setLeading(v === 'lead')} options={[{ value: 'lag', label: 'Lagging' }, { value: 'lead', label: 'Leading' }]} />
      {valid ? (
        <>
          <TriangleDrawing {...out} />
          <Results items={[
            ['P', `${formatNumber(out.P, 6)} kW`],
            ['Q', `${formatNumber(out.Q, 6)} kVAR`],
            ['S', `${formatNumber(out.S, 6)} kVA`],
            ['Power factor', formatNumber(out.pf, 5)],
            ['Angle', `${formatNumber(out.angle, 5)}°`],
          ]} />
        </>
      ) : <Needs>Those values can’t make a triangle. Power factor runs from 0 to 1, and S is at least P.</Needs>}
    </div>
  );
}

// ---- Phasor -----------------------------------------------------------------

function PhasorDrawing({ re, im }) {
  const { mag } = rectToPolar(re, im);
  const c = 120;
  const r = 90;
  const k = mag > 0 ? r / mag : 0;
  const x = c + re * k;
  const y = c - im * k;
  const heading = Math.atan2(y - c, x - c);
  const tip = (turn) => `${x - 12 * Math.cos(heading + turn)},${y - 12 * Math.sin(heading + turn)}`;
  return (
    <svg viewBox="0 0 240 240" role="img" aria-label={`Phasor ${formatPolar({ re, im })}`} className="w-full max-w-[16rem] text-border2">
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeDasharray="3 4" />
      <line x1={12} y1={c} x2={228} y2={c} stroke="currentColor" />
      <line x1={c} y1={12} x2={c} y2={228} stroke="currentColor" />
      <g fontSize="14" fill="var(--text-main)">
        <text x={226} y={c - 6} textAnchor="end">Re</text>
        <text x={c + 6} y={24}>Im</text>
      </g>
      {mag > 0 && (
        <g>
          <line x1={c} y1={c} x2={x} y2={y} stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
          <polygon points={`${x},${y} ${tip(0.45)} ${tip(-0.45)}`} fill="var(--accent)" />
        </g>
      )}
    </svg>
  );
}

function PhasorTool() {
  const [mode, setMode] = useState('polar');
  const [a, setA] = useState('10');
  const [b, setB] = useState('36.87');
  const x = num(a);
  const y = num(b);
  const ok = Number.isFinite(x) && Number.isFinite(y);
  const rect = !ok ? null : mode === 'polar' ? polarToRect(x, y) : { re: x, im: y };
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <SegmentedControl label="Enter it as" value={mode} onChange={setMode} options={[{ value: 'polar', label: 'Polar' }, { value: 'rect', label: 'Rectangular' }]} />
      <div className={fields}>
        <NumField label={mode === 'polar' ? 'Magnitude' : 'Real'} value={a} onChange={setA} />
        <NumField label={mode === 'polar' ? 'Angle (degrees)' : 'Imaginary (j)'} value={b} onChange={setB} />
      </div>
      {rect ? (
        <>
          <PhasorDrawing {...rect} />
          <Results items={[['Rectangular', formatRect(rect)], ['Polar', formatPolar(rect)]]} />
        </>
      ) : <Needs>Enter both values to see it drawn.</Needs>}
    </div>
  );
}

// ---- Delta and wye ----------------------------------------------------------

const BRANCHES = {
  delta: [['ab', 'Zab'], ['bc', 'Zbc'], ['ca', 'Zca']],
  wye: [['a', 'Za'], ['b', 'Zb'], ['c', 'Zc']],
};

function DeltaWyeDrawing() {
  return (
    <svg viewBox="0 0 280 110" role="img" aria-label="A delta on the left and a wye on the right, each joining nodes a, b and c" className="w-full max-w-sm text-muted2">
      <g fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round">
        <polygon points="70,22 26,92 114,92" />
        <line x1="210" y1="60" x2="210" y2="22" />
        <line x1="210" y1="60" x2="166" y2="92" />
        <line x1="210" y1="60" x2="254" y2="92" />
      </g>
      <g fontSize="14" fontWeight="600" fill="var(--text-main)" textAnchor="middle">
        <text x="70" y="16">a</text><text x="14" y="100">b</text><text x="126" y="100">c</text>
        <text x="210" y="16">a</text><text x="154" y="100">b</text><text x="266" y="100">c</text>
      </g>
    </svg>
  );
}

function DeltaWyeTool() {
  const [from, setFrom] = useState('delta');
  const [values, setValues] = useState({ ab: ['3', '0'], bc: ['3', '0'], ca: ['3', '0'], a: ['1', '0'], b: ['1', '0'], c: ['1', '0'] });
  const setPart = (key, i, v) => setValues((all) => {
    const next = [...all[key]];
    next[i] = v;
    return { ...all, [key]: next };
  });
  const z = Object.fromEntries(BRANCHES[from].map(([key]) => [key, { re: num(values[key][0]), im: num(values[key][1]) }]));
  const finite = Object.values(z).every((c) => Number.isFinite(c.re) && Number.isFinite(c.im));
  const out = finite ? (from === 'delta' ? deltaToWye(z) : wyeToDelta(z)) : null;
  const toBranches = from === 'delta' ? BRANCHES.wye : BRANCHES.delta;
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <SegmentedControl label="Convert" value={from} onChange={setFrom} options={[{ value: 'delta', label: 'Δ to Y' }, { value: 'wye', label: 'Y to Δ' }]} />
      <DeltaWyeDrawing />
      <div className="flex flex-col gap-3 min-w-0">
        {BRANCHES[from].map(([key, name]) => (
          <div key={key} className={fields}>
            <NumField label={`${name}: R (Ω)`} value={values[key][0]} onChange={(v) => setPart(key, 0, v)} />
            <NumField label={`${name}: jX (Ω)`} value={values[key][1]} onChange={(v) => setPart(key, 1, v)} />
          </div>
        ))}
      </div>
      {out ? (
        <Results items={toBranches.flatMap(([key, name]) => [[name, formatRect(out[key])], [`${name}, polar`, formatPolar(out[key])]])} />
      ) : <Needs>Those values can’t be converted: a branch or their sum is zero.</Needs>}
    </div>
  );
}

// ---- Per unit ---------------------------------------------------------------

function PerUnitTool() {
  const [v, setV] = useState({ zPu: '0.1', sOld: '100', vOld: '230', sNew: '50', vNew: '230' });
  const field = (key, label) => <NumField label={label} value={v[key]} onChange={(next) => setV((all) => ({ ...all, [key]: next }))} />;
  const out = changeBase({ zPu: num(v.zPu), sOld: num(v.sOld), vOld: num(v.vOld), sNew: num(v.sNew), vNew: num(v.vNew) });
  return (
    <div className="flex flex-col gap-4 min-w-0">
      {field('zPu', 'Z on the old base (pu)')}
      <div className={fields}>
        {field('sOld', 'Old base (MVA)')}
        {field('vOld', 'Old base (kV)')}
        {field('sNew', 'New base (MVA)')}
        {field('vNew', 'New base (kV)')}
      </div>
      {out && Number.isFinite(out.zPuNew) ? (
        <Results items={[
          ['Z on the new base', `${formatNumber(out.zPuNew, 6)} pu`],
          ['In ohms', `${formatNumber(out.ohms, 6)} Ω`],
          ['Old base Z', `${formatNumber(out.zBaseOld, 6)} Ω`],
          ['New base Z', `${formatNumber(out.zBaseNew, 6)} Ω`],
        ]} />
      ) : <Needs>Bases have to be above zero.</Needs>}
    </div>
  );
}

// ---- Three-phase ------------------------------------------------------------

function ThreePhaseTool() {
  const [connection, setConnection] = useState('wye');
  const [vLine, setVLine] = useState('480');
  const [iLine, setILine] = useState('100');
  const [pf, setPf] = useState('0.8');
  const out = threePhase({ connection, vLine: num(vLine), iLine: num(iLine), pf: num(pf) });
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <SegmentedControl label="Connection" value={connection} onChange={setConnection} options={[{ value: 'wye', label: 'Wye (Y)' }, { value: 'delta', label: 'Delta (Δ)' }]} />
      <div className={fields}>
        <NumField label="Line voltage (V)" value={vLine} onChange={setVLine} />
        <NumField label="Line current (A)" value={iLine} onChange={setILine} />
      </div>
      <NumField label="Power factor" value={pf} onChange={setPf} />
      {out ? (
        <Results items={[
          ['Phase voltage', withPrefix(out.vPhase, 'V')],
          ['Phase current', withPrefix(out.iPhase, 'A')],
          ['Apparent', withPrefix(out.S, 'VA')],
          ['Real', withPrefix(out.P, 'W')],
          ['Reactive', withPrefix(out.Q, 'VAR')],
        ]} />
      ) : <Needs>Voltage has to be above zero, and power factor from 0 to 1.</Needs>}
    </div>
  );
}

// ---- Wire gauge -------------------------------------------------------------

function AwgTool() {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <caption className="sr-only">American wire gauge sizes</caption>
        <thead>
          <tr className="text-left text-eyebrow">
            <th scope="col" className="py-1.5 pr-3 font-normal">AWG</th>
            <th scope="col" className="py-1.5 pr-3 font-normal text-right">mm</th>
            <th scope="col" className="py-1.5 pr-3 font-normal text-right">mm²</th>
            <th scope="col" className="py-1.5 font-normal text-right">cmil</th>
          </tr>
        </thead>
        <tbody>
          {AWG_TABLE.map((row) => (
            <tr key={row.n} className="border-t border-border2/40">
              <th scope="row" className="py-1.5 pr-3 text-left font-semibold text-textMain">{row.label}</th>
              <td className="py-1.5 pr-3 text-right text-muted2">{row.mm.toFixed(3)}</td>
              <td className="py-1.5 pr-3 text-right text-muted2">{formatNumber(row.mm2, 4)}</td>
              <td className="py-1.5 text-right text-muted2">{formatNumber(Math.round(row.cmil * 10) / 10, 6)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- Resistor colour code ---------------------------------------------------

const DIGITS = BAND_COLOURS.filter((c) => c.digit !== undefined);
const MULTIPLIERS = BAND_COLOURS.filter((c) => c.multiplier !== undefined);
const TOLERANCES = BAND_COLOURS.filter((c) => c.tolerance !== undefined);
const hexOf = (id) => BAND_COLOURS.find((c) => c.id === id).hex;

function BandSelect({ label, value, options, onChange }) {
  return (
    <FormField label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </Select>
    </FormField>
  );
}

function ResistorTool() {
  const [count, setCount] = useState(4);
  const [digits, setDigits] = useState(['yellow', 'violet', 'black']);
  const [multiplier, setMultiplier] = useState('red');
  const [tolerance, setTolerance] = useState('gold');
  const used = digits.slice(0, count - 2);
  const { ohms, tolerance: pct } = resistorValue(used, multiplier, tolerance);
  const text = `${withPrefix(ohms, 'Ω')} ±${pct}%`;
  const bands = [...used, multiplier, tolerance];
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <SegmentedControl label="Bands" value={count} onChange={setCount} options={[{ value: 4, label: '4 bands' }, { value: 5, label: '5 bands' }]} />
      <svg viewBox="0 0 280 60" role="img" aria-label={`Resistor reading ${text}`} className="w-full max-w-sm text-muted2">
        <line x1="4" y1="30" x2="276" y2="30" stroke="currentColor" strokeWidth="3" />
        <rect x="46" y="10" width="188" height="40" rx="12" fill="#d9c7a3" stroke="#a48f68" />
        {bands.map((id, i) => {
          const isLast = i === bands.length - 1;
          const x = isLast ? 206 : 66 + i * 26;
          return <rect key={`${i}:${id}`} x={x} y="10" width="12" height="40" fill={hexOf(id)} stroke="#00000033" />;
        })}
      </svg>
      <p className="text-2xl font-semibold text-textMain tabular-nums" aria-live="polite">{text}</p>
      <div className={fields}>
        {used.map((id, i) => (
          <BandSelect key={i} label={`Digit ${i + 1}`} value={id} options={DIGITS} onChange={(next) => setDigits((all) => all.map((d, j) => (j === i ? next : d)))} />
        ))}
        <BandSelect label="Multiplier" value={multiplier} options={MULTIPLIERS} onChange={setMultiplier} />
        <BandSelect label="Tolerance" value={tolerance} options={TOLERANCES} onChange={setTolerance} />
      </div>
    </div>
  );
}

// ---- The list ---------------------------------------------------------------

const TOOLS = [
  { id: 'triangle', label: 'Power triangle', about: 'P, Q, S and power factor', Tool: PowerTriangleTool },
  { id: 'phasor', label: 'Phasor', about: 'Polar and rectangular, drawn', Tool: PhasorTool },
  { id: 'deltawye', label: 'Δ and Y', about: 'Impedance, either way', Tool: DeltaWyeTool },
  { id: 'perunit', label: 'Per unit', about: 'Change of base', Tool: PerUnitTool },
  { id: 'threephase', label: 'Three-phase', about: 'Line and phase values', Tool: ThreePhaseTool },
  { id: 'awg', label: 'Wire gauge', about: 'AWG to mm² and cmil', Tool: AwgTool },
  { id: 'resistor', label: 'Resistor colours', about: '4 and 5 bands', Tool: ResistorTool },
];

export default function BoardTools({ tool, onTool }) {
  const open = TOOLS.find((t) => t.id === tool);
  if (open) {
    return (
      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => onTool(null)}>
            <ChevronLeft size={15} strokeWidth={1.75} aria-hidden="true" /> All tools
          </Button>
          <h3 className="text-h3 text-textMain min-w-0">{open.label}</h3>
        </div>
        <open.Tool />
      </div>
    );
  }
  return (
    <Grid kind="tiles" gap="sm">
      {TOOLS.map((t) => (
        <Card key={t.id} as="button" type="button" variant="interactive" padding="sm" className="text-left flex items-start justify-between gap-2 cursor-pointer min-w-0" onClick={() => onTool(t.id)}>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{t.label}</span>
            <span className="block text-xs text-muted2 [overflow-wrap:anywhere]">{t.about}</span>
          </span>
          <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0 mt-0.5" />
        </Card>
      ))}
    </Grid>
  );
}
