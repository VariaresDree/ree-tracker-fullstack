// src/features/reference/Flashcard.jsx
// One interactive formula card. FRONT: the name, the typeset formula (or a
// constant's value) as the largest thing on it, and one quiet line with its tag
// (or topic, where there's no tag). BACK: CardBody, the one layout for what a card
// says, and the source.
//
// `ask` hides the answer, for recall. Study mode's front used to show the formula
// it then asked you to rate yourself on. 'formula' shows the name and asks for the
// formula or value; 'name' shows the formula and asks what it is, so the name stays
// out of the front and its accessible label too. The back is the same either way.
//
// Flip: pure-CSS 3D rotateY (utilities in styles/index.css — grid-stacked
// faces, reduced-motion cross-fade). Chosen over Motion deliberately: the
// library is in the bundle but only in two analytics chunks, and a CSS flip is
// zero-JS for low-end Android. A11y: the card is a real <button aria-pressed>
// (click/Enter/Space flips), and the hidden face is aria-hidden so screen
// readers never read both sides at once.
//
// Height: grid-stacking both faces (grid-area:1/1, needed so the flip has no
// layout jump) makes the ROW auto-size to the TALLER face always, even while
// showing the shorter one. Measured live on a real card: 627px rendered, only
// 205px of front-face content — 422px (67%) of dead space on the visible
// side, because the back face's 537px was setting the row height. Fixed by
// measuring each face's natural height via ResizeObserver and applying the
// ACTIVE face's height explicitly to .flip-scene — the OUTER wrapper, not
// the rotating .flip-inner — transitioned in CSS, so the card is only ever
// as tall as what's actually showing.
//
// That height (and its overflow:hidden clip) belongs on .flip-scene
// specifically: putting either on .flip-inner forces the used value of
// `transform-style` to `flat` (CSS Transforms Level 2 — any overflow other
// than `visible` does this), which silently breaks the 3D flip. Confirmed
// live: the button's aria-pressed/aria-hidden toggled correctly on click, but
// elementsFromPoint at the card's center kept hitting .flip-front — the back
// face never actually took over the screen position. .flip-scene never
// declares transform-style, so sizing/clipping there is free of the trap.
import { useState, useRef, useLayoutEffect, useCallback, useId } from 'react';
import { Badge } from '../../components/ui';
import CardBody, { CardMath } from './CardBody';
import { cardAnswer } from './cardAnswer';

// `onFlip(flipped)`: study mode offers the review ratings once the back has
// been seen. `initialFlipped`: start on the back (read once). `hideTag`: the
// page already says it (a topic's cards sit under their tag headings), and it
// was cut short beside "Tap to flip" ("Voltage and Current D…").
export default function Flashcard({ card, onFlip, initialFlipped = false, hideTag = false, ask = null }) {
  const [flipped, setFlipped] = useState(initialFlipped);
  // The button's label names the card; the face on show describes it. The
  // label alone hid everything on the card from a screen reader.
  const faceId = useId();
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [activeHeight, setActiveHeight] = useState(null);

  const measure = useCallback(() => {
    const el = flipped ? backRef.current : frontRef.current;
    if (el) setActiveHeight(el.scrollHeight);
  }, [flipped]);

  // Re-measure on flip, and on any content resize (KaTeX finishing render,
  // web font swap, viewport width change reflowing text) — not just on mount.
  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (frontRef.current) ro.observe(frontRef.current);
    if (backRef.current) ro.observe(backRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const faceClasses =
    'flip-face bg-surface border border-border2 rounded-[var(--radius-lg)] p-6 shadow-sm ' +
    'flex flex-col gap-4 min-w-0 text-left';

  const answer = cardAnswer(card);
  const hidesName = ask === 'name' && !flipped;
  const prompt = ask === 'name'
    ? 'What is this called?'
    : card.kind === 'constant' ? 'What’s its value?' : 'What’s the formula?';

  return (
    <div
      className="flip-scene min-w-0 w-full max-w-[420px]"
      // Falls back to auto (the old always-tallest behavior) until the first
      // ResizeObserver measurement lands, so there's never a 0-height flash
      // on mount — a percentage height on .flip-inner resolves to `auto`
      // against an unsized ancestor, so this fallback is unaffected below.
      style={activeHeight != null ? { height: `${activeHeight}px` } : undefined}
    >
      <button
        type="button"
        aria-pressed={flipped}
        aria-label={hidesName
          ? 'Flashcard — press to see what it is'
          : `${card.name} flashcard — ${flipped ? 'showing details, press to see the front' : 'press to reveal details'}`}
        aria-describedby={flipped ? `${faceId}-back` : `${faceId}-front`}
        onClick={() => { const next = !flipped; setFlipped(next); onFlip?.(next); }}
        className={`flip-inner w-full cursor-pointer rounded-[var(--radius-lg)] transition-shadow hover:shadow-md ${flipped ? 'is-flipped' : ''}`}
      >
        {/* FRONT */}
        <div ref={frontRef} id={`${faceId}-front`} className={`flip-front ${faceClasses}`} aria-hidden={flipped}>
          {ask !== 'name' && (
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <div className="text-fluid-base font-bold text-textMain line-clamp-2 [overflow-wrap:anywhere]" title={card.name}>
                  {card.name}
                </div>
                {card.symbol && (
                  <div className="text-sm text-[var(--accent-text)] [&_p]:!mb-0">
                    <CardMath value={card.symbol} />
                  </div>
                )}
              </div>
              {/* Most cards are formulas; only a constant says what it is. */}
              {card.kind === 'constant' && <Badge tone="signal" className="shrink-0">Constant</Badge>}
            </div>
          )}

          {ask === 'formula' ? (
            <p className="rounded-[var(--radius-default)] border border-dashed border-border2 px-3 py-6 text-center text-fluid-base font-semibold text-muted2">{prompt}</p>
          ) : answer && (
            <div className="bg-bg border border-border rounded-[var(--radius-default)] px-3 !py-4 math-scroll-mobile min-w-0 text-center text-fluid-lg text-textMain [&_p]:!mb-0">
              <CardMath value={answer} />
            </div>
          )}
          {ask === 'name' && <p className="text-center text-fluid-base font-semibold text-muted2">{prompt}</p>}

          <div className={`mt-auto flex items-center gap-2 min-w-0 ${hideTag ? 'justify-end' : 'justify-between'}`}>
            {!hideTag && (
              // A tag can give the name away ("Voltage and Current Dividers"), so asking
              // for the name shows only the topic.
              <span className="text-xs text-muted2 truncate min-w-0" title={[card.subject, card.topic?.name, ask !== 'name' && card.subtopicTag].filter(Boolean).join(' · ')}>
                {(ask !== 'name' && card.subtopicTag) || card.topic?.name || card.subject}
              </span>
            )}
            <span className="text-eyebrow shrink-0">{ask ? 'Tap to check' : 'Tap to flip'}</span>
          </div>
        </div>

        {/* BACK */}
        <div ref={backRef} id={`${faceId}-back`} className={`flip-back ${faceClasses}`} aria-hidden={!flipped}>
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="text-fluid-base font-bold text-textMain min-w-0 [overflow-wrap:anywhere]">{card.name}</div>
            {card.kind === 'constant' && <Badge tone="signal" className="shrink-0">Constant</Badge>}
          </div>

          <CardBody card={card} />

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
