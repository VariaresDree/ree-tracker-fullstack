// src/features/reference/NotedFlashcard.jsx
//
// A formula card with your note on it: the card as before, and below it (not
// inside the card, which is one big flip button) the note button, filled when
// you have a note. `showNote` also shows the note itself (study mode).
import Flashcard from './Flashcard';
import NoteButton, { NoteView } from '../notebook/NoteButton';
import { cardTarget } from '../notebook/targets';

export default function NotedFlashcard({ card, showNote = false, onFlip, initialFlipped = false }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <Flashcard card={card} onFlip={onFlip} initialFlipped={initialFlipped} />
      <div className="flex justify-end">
        <NoteButton type="card" targetId={card.id} target={cardTarget(card)} withLabel />
      </div>
      {showNote && <NoteView type="card" targetId={card.id} target={cardTarget(card)} />}
    </div>
  );
}
