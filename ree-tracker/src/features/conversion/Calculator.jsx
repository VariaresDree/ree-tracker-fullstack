// src/features/conversion/Calculator.jsx
//
// A scientific calculator on calc.js's parser: no eval. The answer so far shows as
// you go. Half a sum is never an error, and open brackets close themselves, so an
// error only appears when = is pressed on something that can't be worked out. Keys
// go in at the caret. On a touch screen the keypad replaces the phone's keyboard.
import { useLayoutEffect, useRef, useState } from 'react';
import { Button, FormField, Input, SegmentedControl } from '../../components/ui';
import { evaluate, formatNumber, preview } from './calc';

const k = (label, insert, spoken, kind = 'function') => ({ label, insert, spoken, kind });
const digit = (d) => k(d, d, d, 'digit');
const op = (label, insert, spoken) => k(label, insert, spoken, 'operator');

const KEYS = [
  [{ action: 'second', label: '2nd', spoken: 'Inverse functions', kind: 'function' }, k('sin', 'sin(', 'Sine'), k('cos', 'cos(', 'Cosine'), k('tan', 'tan(', 'Tangent'), k('π', 'π', 'Pi')],
  [k('ln', 'ln(', 'Natural log'), k('log', 'log(', 'Log base ten'), k('√', '√(', 'Square root'), op('xʸ', '^', 'To the power'), k('e', 'e', 'Euler’s number')],
  [k('(', '(', 'Open bracket'), k(')', ')', 'Close bracket'), op('×10ˣ', '×10^', 'Times ten to the power'), k('ans', 'ans', 'Last answer'), op('x²', '^2', 'Squared')],
  [digit('7'), digit('8'), digit('9'), { action: 'delete', label: 'DEL', spoken: 'Delete', kind: 'function' }, { action: 'clear', label: 'AC', spoken: 'Clear', kind: 'function' }],
  [digit('4'), digit('5'), digit('6'), op('×', '×', 'Multiply'), op('÷', '÷', 'Divide')],
  [digit('1'), digit('2'), digit('3'), op('+', '+', 'Plus'), op('−', '−', 'Minus')],
  [digit('0'), k('.', '.', 'Point', 'digit'), { action: 'equals', label: '=', spoken: 'Equals', kind: 'equals', wide: true }],
];
const SECOND = {
  sin: k('sin⁻¹', 'asin(', 'Inverse sine'),
  cos: k('cos⁻¹', 'acos(', 'Inverse cosine'),
  tan: k('tan⁻¹', 'atan(', 'Inverse tangent'),
  ln: k('eˣ', 'exp(', 'E to the power'),
  log: k('10ˣ', '10^', 'Ten to the power'),
};
// Delete a function's whole name, not its last letter.
const WHOLE_TOKEN = /(?:asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|ln|log|exp|sqrt|√)\($|(?:ans|pi|π)$|×10\^$/;

const touchScreen = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

export default function Calculator() {
  const [text, setText] = useState('');
  const [angle, setAngle] = useState('deg');
  const [ans, setAns] = useState(0);
  const [past, setPast] = useState([]);
  const [second, setSecond] = useState(false);
  // Just after =, a number starts a new sum and an operator carries on from the answer.
  const [fresh, setFresh] = useState(false);
  const [error, setError] = useState(null);
  const [isTouch] = useState(touchScreen);
  const inputRef = useRef(null);
  const caretRef = useRef(null);

  useLayoutEffect(() => {
    if (caretRef.current === null || !inputRef.current) return;
    inputRef.current.setSelectionRange(caretRef.current, caretRef.current);
    caretRef.current = null;
  }, [text]);

  const options = { angle, ans };
  const shown = text.trim() ? preview(text, options) : null;

  const change = (next, caret = null) => {
    caretRef.current = caret;
    setText(next);
    setError(null);
    setFresh(false);
  };
  const commit = () => {
    if (!text.trim()) return;
    const result = evaluate(text, options);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const answer = formatNumber(result.value, 15);
    setAns(result.value);
    setPast((list) => [{ text, value: result.value }, ...list].slice(0, 5));
    caretRef.current = answer.length;
    setText(answer);
    setError(null);
    setFresh(true);
  };
  const insert = (key) => {
    const startOver = fresh && key.kind !== 'operator';
    const base = startOver ? '' : text;
    const el = inputRef.current;
    const start = fresh ? base.length : el?.selectionStart ?? base.length;
    const end = fresh ? base.length : el?.selectionEnd ?? base.length;
    change(base.slice(0, start) + key.insert + base.slice(end), start + key.insert.length);
  };
  const remove = () => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    if (start !== end) {
      change(text.slice(0, start) + text.slice(end), start);
      return;
    }
    if (start === 0) return;
    const before = text.slice(0, start);
    const cut = before.match(WHOLE_TOKEN)?.[0].length ?? 1;
    change(before.slice(0, -cut) + text.slice(end), start - cut);
  };
  const press = (key) => {
    if (key.action === 'equals') commit();
    else if (key.action === 'clear') change('', 0);
    else if (key.action === 'delete') remove();
    else if (key.action === 'second') setSecond((v) => !v);
    else {
      insert(key);
      setSecond(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 max-w-md min-w-0">
      <SegmentedControl
        label="Angles in"
        value={angle}
        onChange={setAngle}
        options={[{ value: 'deg', label: 'Degrees' }, { value: 'rad', label: 'Radians' }]}
      />
      <div className="flex flex-col gap-1 rounded-[var(--radius-lg)] border border-border2 bg-surface2/40 p-3 min-w-0">
        <FormField label="Sum" error={error || undefined}>
          <Input
            ref={inputRef}
            value={text}
            autoComplete="off"
            spellCheck={false}
            inputMode={isTouch ? 'none' : undefined}
            placeholder="2 × π × 60"
            onChange={(e) => change(e.target.value, e.target.selectionStart)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          />
        </FormField>
        <output aria-live="polite" aria-label="Answer" className={`block text-right text-3xl font-semibold tabular-nums min-h-10 [overflow-wrap:anywhere] ${fresh ? 'text-textMain' : 'text-muted2'}`}>
          {shown !== null ? formatNumber(shown) : ''}
        </output>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {KEYS.flat().map((plain) => {
          const key = (second && SECOND[plain.label]) || plain;
          return (
            <Button
              key={plain.label}
              size="sm"
              variant={key.kind === 'equals' ? 'primary' : key.kind === 'digit' ? 'secondary' : 'ghost'}
              className={`min-h-11 px-0 normal-case ${key.wide ? 'col-span-3' : ''} ${key.kind === 'function' || key.kind === 'operator' ? 'border border-border2/70' : ''}`}
              aria-label={key.spoken}
              aria-pressed={key.action === 'second' ? second : undefined}
              onClick={() => press(key)}
            >
              {key.label}
            </Button>
          );
        })}
      </div>
      {past.length > 0 && (
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-eyebrow">Earlier</p>
          <ul aria-label="Earlier sums" className="flex flex-col gap-0.5 min-w-0">
            {past.map((p, i) => (
              <li key={`${i}:${p.text}`} className="min-w-0">
                <Button variant="ghost" size="sm" className="w-full text-left h-auto font-normal normal-case" onClick={() => change(p.text, p.text.length)}>
                  <span className="w-full min-w-0 tabular-nums [overflow-wrap:anywhere]">{p.text} = {formatNumber(p.value)}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
