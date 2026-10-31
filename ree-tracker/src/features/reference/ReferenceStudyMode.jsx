// src/features/reference/ReferenceStudyMode.jsx
// One-at-a-time study stepper for a set of reference cards (a Subject → Topic
// → Subtopic leaf, a search result set, or the cards due for review). The
// grid view is for scanning; this is for the "deep comprehension" case —
// flip, absorb, move on, without the surrounding grid competing for attention.
//
// Spaced repetition: once a card's back has been seen, rate how well you knew
// it — Again, Hard, Good, Easy (or 1–4) — and it comes back for review when
// it's due (each button says when). Rating moves on to the next card. Cards
// used to be flipped and forgotten: nothing brought a formula back before the
// exam. At the end, "Practise these topics" puts the formulas to use: two
// questions on each topic rated (practiseTopics.js).
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CARD_RATINGS } from '@ree/shared';
import { Button, EmptyState, StatusPill } from '../../components/ui';
import { CheckCircle2, ChevronLeft, ChevronRight, X } from '../../components/ui/icons';
import Flashcard from './Flashcard';
import CardRatingButtons from './CardRatingButtons';
import PractiseTopicsButton from './PractiseTopicsButton';
import { topicsOf } from './practiseTopics';

export default function ReferenceStudyMode({ cards, onExit, reviews = null, mode = 'browse' }) {
  const [index, setIndex] = useState(0);
  // Cards whose back has been seen in this session: the ones that can be rated.
  const [seen, setSeen] = useState(() => new Set());
  // The cards rated in this session, for the topics to practise at the end.
  const [ratedCards, setRatedCards] = useState([]);
  const rated = ratedCards.length;
  const [done, setDone] = useState(false);
  // The arrow keys and Escape are handled on the wrapper, so it takes focus
  // when study mode opens; they did nothing until something inside was
  // clicked or tabbed to.
  const wrapperRef = useRef(null);
  useEffect(() => { wrapperRef.current?.focus({ preventScroll: true }); }, []);
  const card = cards[index];
  const atStart = index === 0;
  const atEnd = index === cards.length - 1;
  const canRate = !!reviews && !!card && seen.has(card.id);

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(cards.length - 1, i + 1));

  const rateCurrent = (rating) => {
    if (!canRate) return;
    const id = card.id;
    setRatedCards((prev) => [...prev, card]);
    if (atEnd) setDone(true);
    else goNext();
    wrapperRef.current?.focus({ preventScroll: true });
    reviews.rate(id, rating).catch(() => toast.error("Couldn't save that rating. Rate the card again."));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'ArrowRight') goNext();
    else if (e.key === 'Escape') onExit();
    else if (canRate && ['1', '2', '3', '4'].includes(e.key)) rateCurrent(CARD_RATINGS[Number(e.key) - 1]);
  };

  if (done) {
    const topics = topicsOf(ratedCards);
    return (
      <EmptyState
        icon={CheckCircle2}
        title={`Done: ${rated} card${rated === 1 ? '' : 's'} rated`}
        description="Each one comes back when it's due. Cards you knew well wait longer; the ones you missed come back tomorrow."
        action={(
          <div className="flex flex-col items-center gap-3">
            {topics.length > 0 && <PractiseTopicsButton topics={topics} />}
            <Button variant={topics.length > 0 ? 'secondary' : 'primary'} onClick={onExit}>Back to formula cards</Button>
          </div>
        )}
      />
    );
  }

  if (!card) return null;

  return (
    <div
      ref={wrapperRef}
      tabIndex={-1}
      role="region"
      aria-label={reviews
        ? 'Study mode: arrow keys move between cards, 1 to 4 rate a flipped card, Escape exits'
        : 'Study mode: arrow keys move between cards, Escape exits'}
      className="flex flex-col items-center gap-5 animate-in fade-in outline-hidden"
      onKeyDown={handleKeyDown}
    >
      <div className="w-full flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X size={14} strokeWidth={1.75} aria-hidden="true" /> Exit {mode === 'review' ? 'review' : 'study mode'}
        </Button>
        <StatusPill tone="neutral" dot={false}>{mode === 'review' ? 'Review ' : ''}{index + 1} / {cards.length}</StatusPill>
      </div>

      <div className="w-full max-w-md">
        <Flashcard
          key={card.id}
          card={card}
          onFlip={(flipped) => { if (flipped) setSeen((prev) => (prev.has(card.id) ? prev : new Set(prev).add(card.id))); }}
        />
      </div>

      {reviews && (canRate ? (
        <CardRatingButtons row={reviews.rowFor(card.id)} onRate={rateCurrent} />
      ) : (
        <p className="text-xs text-muted2 text-center max-w-md">Flip the card, then rate how well you knew it, and it comes back for review when it's due.</p>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={goPrev} disabled={atStart} aria-label="Previous card">
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Previous
        </Button>
        <Button onClick={goNext} disabled={atEnd} aria-label="Next card">
          Next <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
