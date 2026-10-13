// src/features/exams/BattlePicks.jsx
//
// Under a battle question in the sitting review: what each player picked,
// whether it was right and how long they took ("Ana: B, right, 42s"), in
// finishing order. From the players-only replay (GET /api/battles/:id/replay);
// nothing for a question it has no picks for.
import { useId } from 'react';
import { formatDuration } from '../../utils/time';

const LETTERS = ['A', 'B', 'C', 'D'];
const MAX_TEXT = 40;

/** "B, right, 42s"; "left blank". The letter is the option's place in the stored order. */
function pickText(pick, options) {
  if (pick.answer == null) return 'left blank';
  const i = (options || []).indexOf(pick.answer);
  const shown = i >= 0 && i < LETTERS.length
    ? LETTERS[i]
    : pick.answer.length > MAX_TEXT ? `${pick.answer.slice(0, MAX_TEXT)}…` : pick.answer;
  return `${shown}, ${pick.isCorrect ? 'right' : 'wrong'}, ${formatDuration((pick.timeMs || 0) / 1000)}`;
}

/**
 * @param {{ picks?: Array<{userId: string, answer: string|null, isCorrect: boolean, timeMs: number}>,
 *   players?: Array<{userId: string, displayName: string}>, options?: string[], uid?: string }} props
 */
export default function BattlePicks({ picks, players, options, uid }) {
  const headingId = useId();
  if (!Array.isArray(picks) || picks.length === 0) return null;
  const nameOf = new Map((players || []).map((p) => [p.userId, p.displayName]));

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-border bg-surface2 p-4">
      <h3 id={headingId} className="text-eyebrow">How everyone answered</h3>
      <ul className="flex flex-col gap-1.5">
        {picks.map((pick) => (
          <li key={pick.userId} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: pick.answer == null ? 'var(--text-muted)' : pick.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}
            />
            <span className="min-w-0">
              <span className="font-medium text-textMain">{pick.userId === uid ? 'You' : nameOf.get(pick.userId) || 'A player'}:</span>{' '}
              <span className="text-muted2 tabular-nums">{pickText(pick, options)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
