// src/components/exam/ResultsCard.jsx
//
// The head of every results screen: the score, what it means, the figures and what
// to do next. The mock, the Gauntlet and Practice each laid this out their own way.
// `score` is left out while there's nothing to show yet (a battle still running);
// its place then goes to `children`.
import { Badge, Card, CardWatermark, Grid, KpiTile } from '../ui';

const TONE_COLOR = { success: 'var(--accent-success)', amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };

export default function ResultsCard({ score, tone, caption, verdict, notes = [], tiles = [], details, actions, watermark, children }) {
  const shownNotes = notes.filter(Boolean);
  return (
    <Card {...(watermark ? { variant: 'hero', padding: 'md' } : { elevated: true, padding: 'lg' })} className="flex flex-col gap-5">
      {watermark && <CardWatermark icon={watermark} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex flex-col gap-1">
          {children}
          {score != null && (
            <>
              <p className="text-display text-6xl sm:text-7xl tabular-nums" style={{ color: TONE_COLOR[tone] || 'var(--text-main)' }}>{score}</p>
              {caption && <p className="text-sm text-muted2">{caption}</p>}
            </>
          )}
        </div>
        {verdict && <Badge tone={tone}>{verdict}</Badge>}
      </div>
      {shownNotes.map((note) => <p key={String(note)} className="text-sm text-muted2 max-w-prose">{note}</p>)}
      {tiles.length > 0 && (
        <Grid kind={tiles.length > 3 ? 'kpi' : 'tiles'} gap="sm">
          {tiles.map((t) => <KpiTile key={t.label} compact {...t} />)}
        </Grid>
      )}
      {details}
      {actions && <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">{actions}</div>}
    </Card>
  );
}
