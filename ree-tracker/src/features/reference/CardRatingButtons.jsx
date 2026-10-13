// src/features/reference/CardRatingButtons.jsx
//
// Again / Hard / Good / Easy for a flipped formula card, each saying when the
// card comes back (the same SM-2 step the server runs, @ree/shared rateCard).
// Study mode and a card inside Today's loop both rate with these.
import { CARD_RATINGS, CARD_RATING_LABELS, NEW_CARD, rateCard } from '@ree/shared';
import { Button } from '../../components/ui';

/** When a card comes back, as a rating button says it: "tomorrow", "6 days", "2 mo". */
function intervalLabel(days) {
  if (days <= 1) return 'tomorrow';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${(days / 365).toFixed(1)} yr`;
}

export default function CardRatingButtons({ row, onRate, disabled = false }) {
  return (
    <div role="group" aria-label="How well did you know it?" className="w-full max-w-md flex flex-col items-center gap-2">
      <span className="text-eyebrow">How well did you know it?</span>
      <div className="grid grid-cols-4 gap-2 w-full">
        {CARD_RATINGS.map((r, i) => {
          const next = rateCard(row || NEW_CARD, r);
          return (
            <Button key={r} size="sm" variant="secondary" tone={r === 'again' ? 'danger' : undefined} onClick={() => onRate(r)} disabled={disabled} aria-keyshortcuts={String(i + 1)} className="h-auto py-2">
              <span className="flex flex-col items-center leading-tight">
                <span>{CARD_RATING_LABELS[r]}</span>
                <span className="text-[11px] text-muted2 font-normal">{intervalLabel(next.interval)}</span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
