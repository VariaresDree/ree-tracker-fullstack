// src/features/analytics/WeakSignalsPanel.jsx
//
// The cross-session registry (GET /api/analytics/deep/weak-signals):
//   • blind spots — topics answered CONFIDENTLY wrong often enough to matter;
//     the most actionable signal in the app, because the learner doesn't know
//     they don't know;
//   • time sinks — topics whose median answer runs past the 3-minute board pace;
//   • the latest questions answered confidently wrong.
// Every row ends in an action. The per-exam blind spots and slow items already
// existed on the results screen; nothing tracked them across sessions.
import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '../../components/ui';
import { Crosshair } from '../../components/ui/icons';
import { drillPreset } from '../active-recall/presets';
import { toDisplaySubject, TIME_SINK_MS } from '@ree/shared';

const fmtSecs = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

export default function WeakSignalsPanel({ data }) {
  const navigate = useNavigate();
  const blindSpots = data?.blindSpots || [];
  const timeSinks = data?.timeSinks || [];
  const recent = data?.recentConfidentMisses || [];
  const drill = (t, mode) => navigate('/review', {
    state: { preset: drillPreset({ topicId: t.topicId, topic: t.topic, subject: t.subject, mode }) },
  });

  if (blindSpots.length === 0 && timeSinks.length === 0 && recent.length === 0) {
    return (
      <Card elevated>
        <EmptyState
          icon={Crosshair}
          title="No blind spots or time sinks yet"
          description="Pick a confidence level on every answer — a topic you get wrong while sure is the signal this page tracks."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card elevated className="p-5 flex flex-col gap-3">
        <div>
          <h3 className="text-textMain font-semibold">Blind spots</h3>
          <p className="text-xs text-muted2">Topics you answered confidently and got wrong. Fix these first — you don&apos;t know you don&apos;t know them.</p>
        </div>
        {blindSpots.length === 0 ? (
          <p className="text-sm text-muted2">None — your confident answers are holding up.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {blindSpots.map((b) => (
              <li key={`${b.subject}:${b.topic}`} className="flex items-center gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-textMain truncate">{b.topic}</p>
                  <p className="text-xs text-muted2">
                    {toDisplaySubject(b.subject)} · {b.confidentMisses} confident misses of {b.attempts} answers ({Math.round(b.rate * 100)}%)
                  </p>
                </div>
                <Button size="sm" onClick={() => drill(b, 'blind-spot')}>Fix this</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card elevated className="p-5 flex flex-col gap-3">
        <div>
          <h3 className="text-textMain font-semibold">Time sinks</h3>
          <p className="text-xs text-muted2">Topics whose median answer runs past the {Math.round(TIME_SINK_MS / 60000)}-minute board pace.</p>
        </div>
        {timeSinks.length === 0 ? (
          <p className="text-sm text-muted2">None — you&apos;re inside the board pace everywhere.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {timeSinks.map((t) => (
              <li key={`${t.subject}:${t.topic}`} className="flex flex-wrap items-center gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-textMain truncate">{t.topic}</p>
                  <p className="text-xs text-muted2">{toDisplaySubject(t.subject)} · median {fmtSecs(t.medianSecs)} per item</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => navigate('/materials', { state: { tab: 'reference', search: t.topic, kind: 'formula' } })}>
                    Formula cards
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => drill(t)}>Drill</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {recent.length > 0 && (
        <Card elevated className="p-5 flex flex-col gap-3">
          <h3 className="text-textMain font-semibold">Recently answered confidently wrong</h3>
          <ul className="flex flex-col gap-2">
            {recent.map((m) => (
              <li key={m.questionId} className="p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                <p className="text-xs text-muted2">{toDisplaySubject(m.subject)}{m.subtopic ? ` · ${m.subtopic}` : ''} · {new Date(m.answeredAt).toLocaleDateString()}</p>
                <p className="text-sm text-textMain line-clamp-2">{m.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
