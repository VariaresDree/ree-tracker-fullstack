// src/components/exam/ItemActions.jsx
//
// What you can do with the item in front of you: mark it, work on the scratchpad,
// report it, save it. Practice, the mock and the Gauntlet each had their own row,
// with their own words. Leave out a handler and its button goes with it.
import { Button } from '../ui';
import { Bookmark, Flag, Pencil, Pin } from '../ui/icons';
import { COPY } from '../../features/quiz/examCopy';

export default function ItemActions({ marked, onMark, onScratchpad, reported, onReport, bookmarked, onBookmark, children }) {
  return (
    <div className="flex gap-1.5">
      {onMark && (
        <Button size="icon" variant="ghost" tone="amber" onClick={onMark} aria-pressed={!!marked} aria-label={marked ? COPY.unmark : COPY.mark} title={marked ? COPY.unmark : COPY.mark} className={marked ? '' : 'text-muted'}>
          <Pin size={16} strokeWidth={1.75} fill={marked ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
      )}
      {onScratchpad && (
        <Button size="icon" variant="ghost" onClick={onScratchpad} aria-label={COPY.scratchpad} title={COPY.scratchpad} className="text-muted hover:text-textMain">
          <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      {onReport && (
        <Button size="icon" variant="ghost" tone="danger" onClick={onReport} disabled={reported} aria-label={reported ? COPY.reported : COPY.report} title={reported ? COPY.reported : COPY.report} className={reported ? '' : 'text-muted'}>
          <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      {onBookmark && (
        <Button size="icon" variant="ghost" tone="amber" onClick={onBookmark} aria-pressed={!!bookmarked} aria-label={bookmarked ? COPY.saved : COPY.save} title={bookmarked ? COPY.saved : COPY.save} className={bookmarked ? '' : 'text-muted'}>
          <Bookmark size={16} strokeWidth={1.75} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
      )}
      {children}
    </div>
  );
}
