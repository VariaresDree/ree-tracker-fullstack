// src/features/conversion/Calculator.jsx
//
// A scientific calculator on calc.js's parser: no eval. The answer shows as you
// type, and = or Enter keeps it as `ans` for the next sum.
import { useState } from 'react';
import { Button, FormField, Input, SegmentedControl } from '../../components/ui';
import { evaluate, formatNumber } from './calc';

const KEYS = [
  ['sin(', 'cos(', 'tan(', 'ln(', 'log('],
  ['(', ')', '^', '√(', 'π'],
  ['7', '8', '9', '÷', 'DEL'],
  ['4', '5', '6', '×', 'AC'],
  ['1', '2', '3', '−', 'ans'],
  ['0', '.', 'e', '+', '='],
];
const SPOKEN = { '÷': 'Divide', '×': 'Multiply', '−': 'Minus', '+': 'Plus', '^': 'To the power', '√(': 'Square root', π: 'Pi', DEL: 'Delete', AC: 'Clear', '=': 'Equals', '(': 'Open bracket', ')': 'Close bracket', '.': 'Point', e: 'Euler’s number', ans: 'Last answer', 'sin(': 'Sine', 'cos(': 'Cosine', 'tan(': 'Tangent', 'ln(': 'Natural log', 'log(': 'Log base ten' };
const LABEL = (key) => key.replace('(', '') || key;

export default function Calculator() {
  const [text, setText] = useState('');
  const [angle, setAngle] = useState('deg');
  const [ans, setAns] = useState(0);
  const [past, setPast] = useState([]);
  const result = text.trim() ? evaluate(text, { angle, ans }) : null;

  const commit = () => {
    if (!result?.ok) return;
    setAns(result.value);
    setPast((list) => [{ text, value: result.value }, ...list].slice(0, 5));
    setText(formatNumber(result.value, 15));
  };
  const press = (key) => {
    if (key === '=') commit();
    else if (key === 'AC') setText('');
    else if (key === 'DEL') setText((t) => t.slice(0, -1));
    else setText((t) => t + key);
  };

  return (
    <div className="flex flex-col gap-3 max-w-md min-w-0">
      <SegmentedControl
        label="Angles in"
        value={angle}
        onChange={setAngle}
        options={[{ value: 'deg', label: 'Degrees' }, { value: 'rad', label: 'Radians' }]}
      />
      <FormField label="Sum" error={result && !result.ok ? result.error : undefined}>
        <Input
          value={text}
          autoComplete="off"
          spellCheck={false}
          placeholder="2*pi*60"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        />
      </FormField>
      <output aria-live="polite" className="text-2xl font-semibold text-textMain tabular-nums min-h-8 [overflow-wrap:anywhere]">
        {result?.ok ? formatNumber(result.value) : ''}
      </output>
      <div className="grid grid-cols-5 gap-1.5">
        {KEYS.flat().map((key) => (
          <Button
            key={key}
            size="sm"
            variant={key === '=' ? 'primary' : /^[\d.]$/.test(key) ? 'secondary' : 'ghost'}
            className="min-h-11 px-0 normal-case"
            aria-label={SPOKEN[key] || key}
            onClick={() => press(key)}
          >
            {LABEL(key)}
          </Button>
        ))}
      </div>
      {past.length > 0 && (
        <ul aria-label="Earlier sums" className="flex flex-col gap-1 text-sm text-muted2 tabular-nums min-w-0">
          {past.map((p, i) => <li key={`${i}:${p.text}`} className="[overflow-wrap:anywhere]">{p.text} = <span className="text-textMain">{formatNumber(p.value)}</span></li>)}
        </ul>
      )}
    </div>
  );
}
