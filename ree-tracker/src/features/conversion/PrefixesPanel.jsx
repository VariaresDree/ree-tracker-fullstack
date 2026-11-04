// src/features/conversion/PrefixesPanel.jsx
//
// Multiples and submultiples. Changing a prefix only moves the decimal point, so it
// gets one screen here rather than a tile for every electrical unit: pick the two
// prefixes, see the shift, and have all 24 in a table.
import { useState } from 'react';
import { SI_PREFIXES } from '@ree/shared/units';
import { Button, Card, FormField, Input, Select } from '../../components/ui';
import { ArrowLeftRight } from '../../components/ui/icons';
import { evaluate, formatNumber } from './calc';

const NONE = { name: 'no prefix', symbol: '', exp: 0 };
const ALL = [...SI_PREFIXES.filter((p) => p.exp > 0), NONE, ...SI_PREFIXES.filter((p) => p.exp < 0)];
const UNITS = ['W', 'V', 'A', 'Ω', 'F', 'H', 'VA', 'VAR', 'J', 'N', 'Pa', 'Hz', 'm', 'g', 's', 'C', 'T', 'Wb'];

const toSuper = (n) => String(n).replace(/[-\d]/g, (c) => (c === '-' ? '⁻' : '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]));
const power = (exp) => `10${toSuper(exp)}`;
const decimal = (exp) => {
  if (exp === 0) return '1';
  if (exp > 0) return exp <= 6 ? `1${'0'.repeat(exp)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
  return exp >= -6 ? `0.${'0'.repeat(-exp - 1)}1` : '';
};
const prefixById = (name) => ALL.find((p) => p.name === name) || NONE;

export default function PrefixesPanel() {
  const [text, setText] = useState('1');
  const [fromName, setFromName] = useState('kilo');
  const [toName, setToName] = useState('no prefix');
  const [symbol, setSymbol] = useState('W');
  const parsed = evaluate(text);
  const from = prefixById(fromName);
  const to = prefixById(toName);
  const shift = from.exp - to.exp;
  // Exact for a shift within range, with no division's float noise on the power.
  const result = parsed.ok ? Number(`${parsed.value}e${shift}`) : null;
  const shown = result === null || !Number.isFinite(result) ? parsed.ok ? formatNumber(parsed.value * 10 ** shift) : '—' : formatNumber(result);
  const places = Math.abs(shift);
  const swap = () => { setFromName(toName); setToName(fromName); };

  return (
    <div className="flex flex-col gap-5 min-w-0">
      <Card padding="sm" className="flex flex-col gap-3 min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <FormField label="Value" error={text.trim() && !parsed.ok && !parsed.incomplete ? parsed.error : undefined}>
            <Input value={text} autoComplete="off" spellCheck={false} onChange={(e) => setText(e.target.value)} />
          </FormField>
          <FormField label="Unit">
            <Select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <FormField label="From">
            <Select value={fromName} onChange={(e) => setFromName(e.target.value)}>
              {ALL.map((p) => <option key={p.name} value={p.name}>{p.symbol ? `${p.symbol}  ${p.name}` : 'none'}</option>)}
            </Select>
          </FormField>
          <Button size="icon" variant="secondary" aria-label="Swap the prefixes" title="Swap the prefixes" onClick={swap}>
            <ArrowLeftRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
          <FormField label="To">
            <Select value={toName} onChange={(e) => setToName(e.target.value)}>
              {ALL.map((p) => <option key={p.name} value={p.name}>{p.symbol ? `${p.symbol}  ${p.name}` : 'none'}</option>)}
            </Select>
          </FormField>
        </div>
        <output aria-live="polite" className="text-2xl font-semibold text-textMain tabular-nums [overflow-wrap:anywhere]">
          {shown} {to.symbol}{symbol}
        </output>
        <p className="text-sm text-muted2 [overflow-wrap:anywhere]">
          {shift === 0
            ? 'The same prefix: nothing moves.'
            : `${power(from.exp)} ÷ ${power(to.exp)} = ${power(shift)}, so move the decimal point ${places} place${places === 1 ? '' : 's'} to the ${shift > 0 ? 'right' : 'left'}.`}
        </p>
      </Card>

      <section aria-labelledby="si-prefixes" className="flex flex-col gap-2 min-w-0">
        <h3 id="si-prefixes" className="text-eyebrow">All 24 SI prefixes</h3>
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-eyebrow">
                <th scope="col" className="py-1.5 pr-3 font-normal">Prefix</th>
                <th scope="col" className="py-1.5 pr-3 font-normal">Symbol</th>
                <th scope="col" className="py-1.5 pr-3 font-normal">Factor</th>
                <th scope="col" className="py-1.5 font-normal text-right">As a number</th>
              </tr>
            </thead>
            <tbody>
              {SI_PREFIXES.map((p) => (
                <tr key={p.name} className="border-t border-border2/40">
                  <th scope="row" className="py-1.5 pr-3 text-left font-semibold text-textMain">{p.name}</th>
                  <td className="py-1.5 pr-3 text-muted2">{p.symbol}</td>
                  <td className="py-1.5 pr-3 text-muted2">{power(p.exp)}</td>
                  <td className="py-1.5 text-right text-muted2">{decimal(p.exp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted2">Multiples above, submultiples below. Ronna, quetta, ronto and quecto were added in 2022.</p>
      </section>
    </div>
  );
}
