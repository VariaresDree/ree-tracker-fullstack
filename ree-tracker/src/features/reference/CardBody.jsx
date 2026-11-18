// src/features/reference/CardBody.jsx
//
// One layout for what a formula card says, on the back of a card and on the print
// sheet: the formula or value, its result's unit, what each symbol is, what it's
// for, and the board tip. Every math field goes through CardMath, so nothing shows
// its source: the sheet used to print `$\text{V}$` as text.
//
// 2026-11-18: math is drawn by MathText (fastMath.jsx), not a Markdown pipeline
// per string, and a formula that packs several results into one line is shown
// one result per line (FormulaWell), so it fits a phone instead of scrolling.
// "Where" puts each unit after its meaning, two columns instead of three.
//
// On the sheet this is black on white because printFormulas.css resets the theme's
// colours inside it, not because of anything here.
import { useLayoutEffect, useRef, useState } from 'react';
import { withMathDelimiters } from '../../utils/mathDelimiters';
import { cn } from '../../components/ui';
import { cardAnswer } from './cardAnswer';
import { MathText } from './fastMath';
import { formulaLines, wrapPieces } from './fastMathText';

/** A symbol, formula, value or unit, with or without its $ delimiters. */
export function CardMath({ value, inline = false, display = false, className }) {
  return <MathText content={withMathDelimiters(value)} inline={inline} display={display} className={className} />;
}

// Smallest a too-wide line may shrink to before it switches to the wrapping style.
const MIN_SCALE = 0.75;

/**
 * Formula lines that fit their box: each is drawn in display style (full-size
 * fractions); one too wide for a phone shrinks to fit, down to 75%, and past
 * that is drawn in text style, which wraps after = and + like a sentence.
 * Measured after layout and again when the width or the fonts change.
 */
export function FitLines({ lines, className }) {
  const ref = useRef(null);
  const [wrap, setWrap] = useState(() => new Set());
  const sig = lines.join('\n');
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return undefined;
    let width = -1;
    const fit = () => {
      // Only a change of width matters; the heights this sets must not refit.
      if (box.clientWidth === width) return;
      width = box.clientWidth;
      const tooWide = [];
      box.querySelectorAll(':scope > [data-line]').forEach((line) => {
        const i = Number(line.dataset.line);
        line.style.fontSize = '';
        const math = line.querySelector('.katex-display');
        if (!math || !math.clientWidth) return;
        const ratio = math.clientWidth / math.scrollWidth;
        if (ratio >= 1) return;
        if (ratio >= MIN_SCALE) line.style.fontSize = `${Math.floor(ratio * 100) - 1}%`;
        else tooWide.push(i);
      });
      if (tooWide.length) setWrap((had) => (tooWide.every((i) => had.has(i)) ? had : new Set([...had, ...tooWide])));
    };
    fit();
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(box);
    document.fonts?.ready?.then(() => { width = -1; fit(); }).catch(() => {});
    return () => ro?.disconnect();
  }, [sig]);
  return (
    <div ref={ref} className={cn('flex flex-col min-w-0 [&_.katex-display]:!my-0 [&_.katex-display]:!py-1', className)}>
      {lines.map((line, i) => (
        <div key={i} data-line={i} className="min-w-0 overflow-x-auto overflow-y-hidden [scrollbar-width:thin] [overflow-wrap:anywhere]">
          {wrap.has(i) ? <CardMath value={wrapPieces(line)} /> : <CardMath value={line} display />}
        </div>
      ))}
    </div>
  );
}

/**
 * The formula (or a constant's value) in its well, one result per line, each
 * fitted to the width (FitLines). `size` 'lg' on a card, 'sm' on a sheet.
 */
export function FormulaWell({ value, size = 'lg', className }) {
  return (
    <div
      className={cn(
        'bg-bg border border-border rounded-[var(--radius-default)] min-w-0 text-center text-textMain',
        size === 'lg' ? 'px-3 py-3 text-fluid-base' : 'px-2 py-1.5 text-sm',
        className,
      )}
      data-card-answer=""
    >
      <FitLines lines={formulaLines(withMathDelimiters(value))} className={size === 'lg' ? 'gap-1.5' : 'gap-1'} />
    </div>
  );
}

// A few live rows hold the string "null".
const unitOf = (v) => (v.unit && v.unit !== 'null' ? v.unit : null);

function WhereRows({ variables }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 items-baseline text-fluid-sm" data-card-where="">
      {variables.map((v) => (
        <div key={v.symbol} className="contents">
          <dt className="font-bold text-[var(--accent-text)] text-right"><CardMath value={v.symbol} inline /></dt>
          <dd className="text-muted2 min-w-0 [overflow-wrap:anywhere]">
            <MathText content={v.meaning} inline />
            {unitOf(v) && <span className="text-muted whitespace-nowrap"> (<CardMath value={unitOf(v)} inline />)</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** `compact`, for the sheet: the formula's own well, and no line on what it's for. */
export default function CardBody({ card, compact = false }) {
  const variables = Array.isArray(card.variables) ? card.variables.filter((v) => v?.symbol) : [];
  const answer = cardAnswer(card);
  const isConstant = card.kind === 'constant';
  // A formula's valueUnit is its result's unit. A constant's is its value, shown above.
  const resultUnit = !isConstant && card.formulaLatex && card.valueUnit;
  const definedBy = isConstant && card.valueUnit && card.formulaLatex;

  return (
    <div className={cn('flex flex-col min-w-0', compact ? 'gap-2' : 'gap-4')}>
      {answer && (
        <div>
          <FormulaWell value={answer} size={compact ? 'sm' : 'lg'} />
          {resultUnit && (
            <p className="mt-1 text-xs text-muted2 text-right">Result in <CardMath value={card.valueUnit} inline /></p>
          )}
          {!resultUnit && !isConstant && card.dimensionless && (
            <p className="mt-1 text-xs text-muted2 text-right">No unit</p>
          )}
          {definedBy && (
            <div className="mt-1 text-xs text-muted2 text-right min-w-0 [overflow-wrap:anywhere]"><CardMath value={card.formulaLatex} /></div>
          )}
        </div>
      )}

      {variables.length > 0 && (
        <div className="min-w-0">
          <div className="text-eyebrow mb-1.5">Where</div>
          <WhereRows variables={variables} />
        </div>
      )}

      {!compact && card.description && (
        <div>
          <div className="text-eyebrow mb-1">What it’s for</div>
          {/* Not CardMath: a description carries its own $…$ pairs, and wrapping
              the whole string would turn a sentence into one math block. */}
          <div className="text-fluid-sm text-muted2 [overflow-wrap:anywhere]">
            <MathText content={card.description} />
          </div>
        </div>
      )}

      {card.purposeExamTip && (
        <div
          className={cn('rounded-[var(--radius-default)] border', compact ? 'px-2 py-1.5' : 'p-3')}
          style={{
            background: 'color-mix(in srgb, var(--color-reeAmber) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-reeAmber) 30%, transparent)',
          }}
        >
          <div className="text-eyebrow mb-1" style={{ color: 'var(--color-reeAmber-text)' }}>Board tip</div>
          <div className="text-fluid-sm text-muted2 [overflow-wrap:anywhere]">
            <MathText content={card.purposeExamTip} />
          </div>
        </div>
      )}
    </div>
  );
}
