// src/features/reference/ReferenceStudyMode.jsx
// One-at-a-time study stepper for a set of reference cards (a Subject → Topic
// → Subtopic leaf, or a search result set). The grid view is for scanning;
// this is for the "deep comprehension" case — flip, absorb, move on, without
// the surrounding grid competing for attention. Reuses Flashcard as-is (same
// flip mechanics, same content layout), just one on screen at a time.
import { useState } from 'react';
import { Button, StatusPill } from '../../components/ui';
import { ChevronLeft, ChevronRight, X } from '../../components/ui/icons';
import Flashcard from './Flashcard';

export default function ReferenceStudyMode({ cards, onExit }) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  const atStart = index === 0;
  const atEnd = index === cards.length - 1;

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(cards.length - 1, i + 1));

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'ArrowRight') goNext();
    else if (e.key === 'Escape') onExit();
  };

  if (!card) return null;

  return (
    <div className="flex flex-col items-center gap-5 animate-in fade-in" onKeyDown={handleKeyDown}>
      <div className="w-full flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X size={14} strokeWidth={1.75} aria-hidden="true" /> Exit study mode
        </Button>
        <StatusPill tone="neutral" dot={false}>{index + 1} / {cards.length}</StatusPill>
      </div>

      <div className="w-full max-w-md">
        <Flashcard key={card.id} card={card} />
      </div>

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
