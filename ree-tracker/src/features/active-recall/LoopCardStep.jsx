// src/features/active-recall/LoopCardStep.jsx
//
// A formula card due for review, inside Today's loop: flip it, rate it (or
// 1–4), and the session moves on. The rating goes the same way as in study
// mode (useCardReviews: sent, or queued offline). A card is never an answer:
// it doesn't touch ability, the forecast or today's target.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { CARD_RATINGS } from '@ree/shared';
import Flashcard from '../reference/Flashcard';
import CardRatingButtons from '../reference/CardRatingButtons';
import { useCardReviews } from '../reference/useCardReviews';

const FIVE_MINUTES = 5 * 60 * 1000;

export default function LoopCardStep({ card, rated, onRated }) {
  const reviews = useCardReviews({ fetchIfOlderThanMs: FIVE_MINUTES });
  const [seen, setSeen] = useState(false);

  const rate = (rating) => {
    if (rated || !seen) return;
    onRated(rating);
    reviews.rate(card.id, rating).catch(() => toast.error("Couldn't save that rating. Rate the card again in Formula cards."));
  };

  const onKeyDown = (e) => {
    if (['1', '2', '3', '4'].includes(e.key)) rate(CARD_RATINGS[Number(e.key) - 1]);
  };

  return (
    <div className="flex flex-col items-center gap-5" onKeyDown={onKeyDown}>
      <p className="text-eyebrow self-start">Formula card due for review</p>
      <div className="w-full max-w-md">
        <Flashcard card={card} onFlip={(flipped) => { if (flipped) setSeen(true); }} />
      </div>
      {rated ? (
        <p className="text-sm text-muted2 text-center">Rated. It comes back when it's due.</p>
      ) : seen ? (
        <CardRatingButtons row={reviews.rowFor(card.id)} onRate={rate} />
      ) : (
        <p className="text-xs text-muted2 text-center max-w-md">Flip the card, then rate how well you knew it.</p>
      )}
    </div>
  );
}
