// src/features/analytics/sections/TimeOfDay.jsx
//
// Progress › Habits › Accuracy by time of day (deep/time-of-day; CELE round):
// how the last 90 days of answers went in each part of the day, with board
// hours (8 AM–5 PM) marked. The CELE tracker's author reviewed at night and,
// in the refresher, moved to mornings because the board starts at 8 AM; this
// shows whether that's worth doing. A headline only when both sides have 30
// answers and differ by 8 points.
import { useDeepAnalytics } from '../useDeepAnalytics';
import { DeepStatus, SectionCard } from './shared';

const hoursLabel = (b) => {
  const fmt = (h) => (h === 0 ? '12 AM' : h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`);
  return `${fmt(b.from)}–${fmt(b.to)}`;
};

function headlineText(h) {
  if (!h) return null;
  if (h.gap > 0) {
    return `You’re ${h.gap} points more accurate in the ${h.label.toLowerCase()} (${h.bandAccuracy}%) than in board hours (${h.boardAccuracy}%). The board starts at 8 AM: from the refresher on, move some sessions into the morning.`;
  }
  return `You’re ${-h.gap} points more accurate in board hours (${h.boardAccuracy}%) than in the ${h.label.toLowerCase()} (${h.bandAccuracy}%). Keep your hardest sessions in the daytime.`;
}

export default function TimeOfDay() {
  const { data, status, retry } = useDeepAnalytics('time-of-day');
  const bands = data?.bands || [];
  const headline = headlineText(data?.headline);

  return (
    <SectionCard eyebrow="Body clock" title="Accuracy by time of day">
      <DeepStatus status={status} retry={retry}>
        {!data || data.total === 0 ? (
          <p className="text-sm text-muted2">Answer some questions to see which hours suit you. It reads your last 90 days.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {headline && <p className="text-sm text-textMain">{headline}</p>}
            <ul className="flex flex-col gap-2" aria-label="Accuracy by time of day, last 90 days">
              {bands.map((b) => (
                <li key={b.id} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3">
                  <span className="text-xs text-muted2 min-w-0">
                    <span className="block text-textMain font-medium">{b.label}</span>
                    {hoursLabel(b)}{b.board ? ' · board hours' : ''}
                  </span>
                  <span className="h-4 bg-surface3 rounded-full overflow-hidden" aria-hidden="true">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${b.accuracy ?? 0}%`, background: b.board ? 'var(--accent-velocity)' : 'var(--color-reeCyan)' }}
                    />
                  </span>
                  <span className="text-xs text-right tabular-nums min-w-24">
                    <span className="block text-textMain font-medium">{b.accuracy == null ? '—' : `${b.accuracy}%`}</span>
                    <span className="text-muted2">{b.answers} {b.answers === 1 ? 'answer' : 'answers'}{b.avgSeconds != null ? ` · ${b.avgSeconds}s` : ''}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted2">Accuracy, answers and average time a question, by when you answered (Manila time).</p>
          </div>
        )}
      </DeepStatus>
    </SectionCard>
  );
}
