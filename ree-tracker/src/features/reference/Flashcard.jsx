// src/features/reference/Flashcard.jsx
// One interactive reference flashcard. FRONT: symbol + name + subject/topic
// badges + the typeset expression. BACK: value/units, plain-language meaning,
// the variables table, board-exam purpose/trap, and the source citation.
//
// Flip: pure-CSS 3D rotateY (utilities in styles/index.css — grid-stacked
// faces, reduced-motion cross-fade). Chosen over Motion deliberately: the
// library is in the bundle but only in two analytics chunks, and a CSS flip is
// zero-JS for low-end Android. A11y: the card is a real <button aria-pressed>
// (click/Enter/Space flips), and the hidden face is aria-hidden so screen
// readers never read both sides at once.
import { useState } from 'react';
import { Badge } from '../../components/ui';
import LatexRenderer from '../../components/LatexRenderer';

const KIND_TONE = { constant: 'signal', formula: 'velocity', concept: 'neutral' };

export default function Flashcard({ card }) {
  const [flipped, setFlipped] = useState(false);

  const faceClasses =
    'flip-face bg-surface border border-border2 rounded-[var(--radius-lg)] p-5 shadow-sm ' +
    'flex flex-col gap-3 min-w-0 text-left';

  return (
    <div className="flip-scene min-w-0">
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={`${card.name} flashcard — ${flipped ? 'showing details, press to see the front' : 'press to reveal details'}`}
        onClick={() => setFlipped((f) => !f)}
        className={`flip-inner w-full cursor-pointer rounded-[var(--radius-lg)] transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] ${flipped ? 'is-flipped' : ''}`}
      >
        {/* FRONT */}
        <div className={`flip-front ${faceClasses}`} aria-hidden={flipped}>
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="min-w-0">
              {card.symbol && (
                <div className="text-fluid-lg font-bold text-[var(--accent)] [&_p]:!mb-0">
                  <LatexRenderer content={card.symbol.includes('$') ? card.symbol : `$${card.symbol}$`} />
                </div>
              )}
              <div className="text-fluid-base font-bold text-textMain line-clamp-2 [overflow-wrap:anywhere]" title={card.name}>
                {card.name}
              </div>
            </div>
            <Badge tone={KIND_TONE[card.kind] || 'neutral'} className="uppercase shrink-0">{card.kind}</Badge>
          </div>

          {(card.formulaLatex || card.valueUnit) && (
            <div className="bg-bg border border-border rounded-[var(--radius-default)] px-3 py-4 math-scroll-mobile min-w-0">
              <LatexRenderer content={card.formulaLatex || card.valueUnit} />
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 flex-wrap min-w-0">
            <div className="flex gap-1.5 flex-wrap min-w-0">
              <Badge tone="neutral">{card.subject}</Badge>
              {card.topic?.name && <Badge tone="neutral" className="truncate max-w-[160px]" title={card.topic.name}>{card.topic.name}</Badge>}
              {card.subtopicTag && <Badge tone="signal" className="truncate max-w-[120px]" title={card.subtopicTag}>{card.subtopicTag}</Badge>}
            </div>
            <span className="text-eyebrow shrink-0">Tap to flip</span>
          </div>
        </div>

        {/* BACK */}
        <div className={`flip-back ${faceClasses}`} aria-hidden={!flipped}>
          {card.valueUnit && (
            <div>
              <div className="text-eyebrow mb-1">Value / unit</div>
              <div className="text-fluid-base text-textMain math-scroll-mobile min-w-0 [&_p]:!mb-0">
                <LatexRenderer content={card.valueUnit} />
              </div>
            </div>
          )}
          {card.dimensionless && !card.valueUnit && (
            <div className="text-eyebrow">Dimensionless</div>
          )}

          <div>
            <div className="text-eyebrow mb-1">What it represents</div>
            <p className="text-fluid-sm text-muted2 leading-relaxed [overflow-wrap:anywhere]">{card.description}</p>
          </div>

          {Array.isArray(card.variables) && card.variables.length > 0 && (
            <div className="min-w-0">
              <div className="text-eyebrow mb-1.5">Variables</div>
              <div className="flex flex-col gap-1">
                {card.variables.map((v, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-fluid-sm min-w-0">
                    <span className="font-mono font-bold text-[var(--accent)] shrink-0 [&_p]:!mb-0">
                      <LatexRenderer content={v.symbol?.includes('$') ? v.symbol : `$${v.symbol}$`} />
                    </span>
                    <span className="text-muted2 min-w-0 [overflow-wrap:anywhere]">
                      {v.meaning}{v.unit ? <span className="text-muted"> ({v.unit})</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {card.purposeExamTip && (
            <div
              className="rounded-[var(--radius-default)] border p-3"
              style={{
                background: 'color-mix(in srgb, var(--color-reeAmber) 8%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-reeAmber) 30%, transparent)',
              }}
            >
              <div className="text-eyebrow mb-1" style={{ color: 'var(--color-reeAmber)' }}>Board use & traps</div>
              <p className="text-fluid-sm text-muted2 leading-relaxed [overflow-wrap:anywhere]">{card.purposeExamTip}</p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 min-w-0">
            {card.source?.title ? (
              <span className="text-eyebrow truncate" title={`${card.source.title}${card.source.edition ? ` (${card.source.edition})` : ''}${card.source.section ? ` · ${card.source.section}` : ''}`}>
                {card.source.title}{card.source.edition ? ` (${card.source.edition})` : ''}{card.source.section ? ` · ${card.source.section}` : ''}
              </span>
            ) : <span />}
            <span className="text-eyebrow shrink-0">Tap to flip back</span>
          </div>
        </div>
      </button>
    </div>
  );
}
