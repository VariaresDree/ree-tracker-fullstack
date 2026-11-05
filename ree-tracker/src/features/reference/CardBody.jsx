// src/features/reference/CardBody.jsx
//
// One layout for what a formula card says, on the back of a card and on the print
// sheet: the formula or value, its result's unit, what each symbol is, what it's
// for, and the board tip. Every math field goes through CardMath, so nothing shows
// its source: the sheet used to print `$\text{V}$` as text.
//
// On the sheet this is black on white because printFormulas.css resets the theme's
// colours inside it, not because of anything here.
import LatexRenderer from '../../components/LatexRenderer';
import { withMathDelimiters } from '../../utils/mathDelimiters';
import { cn } from '../../components/ui';
import { cardAnswer } from './cardAnswer';

/** A symbol, formula, value or unit, with or without its $ delimiters. */
export function CardMath({ value, inline = false, className }) {
  return <LatexRenderer content={withMathDelimiters(value)} inline={inline} className={className} />;
}

// A few live rows hold the string "null".
const unitOf = (v) => (v.unit && v.unit !== 'null' ? v.unit : null);

function WhereRows({ variables }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-1 items-baseline text-fluid-sm" data-card-where="">
      {variables.map((v) => (
        <div key={v.symbol} className="contents">
          <span className="font-bold text-[var(--accent-text)]"><CardMath value={v.symbol} inline /></span>
          <span className="text-muted2 min-w-0 [overflow-wrap:anywhere]"><LatexRenderer content={v.meaning} inline /></span>
          <span className="text-muted text-right">{unitOf(v) ? <CardMath value={unitOf(v)} inline /> : null}</span>
        </div>
      ))}
    </div>
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
          {/* !py: math-scroll-mobile sets its own bottom padding, and a fraction needs even room. */}
          <div className={cn('bg-bg border border-border rounded-[var(--radius-default)] math-scroll-mobile min-w-0 text-center text-textMain [&_p]:!mb-0', compact ? 'px-2 !py-2' : 'px-3 !py-4 text-fluid-lg')} data-card-answer="">
            <CardMath value={answer} />
          </div>
          {resultUnit && (
            <p className="mt-1 text-xs text-muted2 text-right">Result in <CardMath value={card.valueUnit} inline /></p>
          )}
          {!resultUnit && !isConstant && card.dimensionless && (
            <p className="mt-1 text-xs text-muted2 text-right">No unit</p>
          )}
          {definedBy && (
            <div className="mt-1 text-xs text-muted2 text-right math-scroll-mobile !pb-0 [&_p]:!mb-0"><CardMath value={card.formulaLatex} /></div>
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
          <div className="text-fluid-sm text-muted2 leading-relaxed [overflow-wrap:anywhere] [&_p]:!m-0">
            <LatexRenderer content={card.description} />
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
          <div className="text-fluid-sm text-muted2 leading-relaxed [overflow-wrap:anywhere] [&_p]:!m-0">
            <LatexRenderer content={card.purposeExamTip} />
          </div>
        </div>
      )}
    </div>
  );
}
