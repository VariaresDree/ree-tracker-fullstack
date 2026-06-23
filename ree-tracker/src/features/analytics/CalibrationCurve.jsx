import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, Badge } from '../../components/ui';
import { buildCalibrationCurve, brierScore, expectedCalibrationError, CONFIDENCE_MAP } from './calibration';

// Renders a reliability diagram: a 45° line means perfect calibration,
// above the line = under-confident, below = over-confident. We highlight
// the over-confidence band because that's the exam-anxiety lever.
//
// Accepts either raw `attempts` (built client-side) or `buckets` already
// aggregated server-side ({ confidence: 'LOW'|'MED'|'HIGH', accuracy, total }).
export function CalibrationCurve({ attempts = [], buckets = null }) {
  const { points, brier, ece, total } = useMemo(() => {
    if (buckets && buckets.length > 0) {
      const pts = buckets
        .map((b) => {
          const conf = CONFIDENCE_MAP[String(b.confidence || '').toUpperCase()];
          if (conf == null || !b.total) return null;
          return {
            confidence: Number((conf * 100).toFixed(1)),
            accuracy: Number(b.accuracy ?? 0),
            n: b.total,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.confidence - b.confidence);
      const n = pts.reduce((acc, p) => acc + p.n, 0);
      const eceVal = n > 0 ? pts.reduce((acc, p) => acc + (p.n / n) * Math.abs(p.confidence - p.accuracy) / 100, 0) : null;
      const brierVal = n > 0 ? pts.reduce((acc, p) => acc + p.n * ((p.confidence / 100 - p.accuracy / 100) ** 2), 0) / n : null;
      return { points: pts, brier: brierVal, ece: eceVal, total: n };
    }
    const c = buildCalibrationCurve(attempts, 5);
    return {
      points: c.points.map((p) => ({
        confidence: Number((p.confidence * 100).toFixed(1)),
        accuracy: Number((p.accuracy * 100).toFixed(1)),
        n: p.n,
      })),
      brier: brierScore(attempts),
      ece: expectedCalibrationError(attempts, 5),
      total: attempts.length,
    };
  }, [attempts, buckets]);

  const tone = ece == null ? 'neutral' : ece < 0.1 ? 'success' : ece < 0.2 ? 'signal' : 'danger';
  const calibLabel = ece == null ? 'No data' : `ECE ${(ece * 100).toFixed(1)}%`;

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Calibration</CardEyebrow>
          <CardTitle>How well does your confidence match your accuracy?</CardTitle>
        </div>
        <Badge tone={tone}>{calibLabel}</Badge>
      </CardHeader>
      <CardBody>
        <div className="flex items-center gap-4 mb-3 text-xs font-mono uppercase tracking-[0.18em] text-muted">
          <span>Brier {brier == null ? '—' : brier.toFixed(3)}</span>
          <span>n = {total}</span>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <XAxis
                dataKey="confidence"
                domain={[0, 100]}
                type="number"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                label={{ value: 'Reported confidence (%)', position: 'insideBottom', offset: -2, fill: 'var(--text-muted)', fontSize: 10 }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                label={{ value: 'Observed accuracy (%)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ background: 'var(--bg-surface2)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-muted2)' }}
              />
              <ReferenceLine
                segment={[
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ]}
                stroke="var(--text-muted)"
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="var(--accent-velocity)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--accent-velocity)' }}
                isAnimationActive
                animationDuration={600}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted2 mt-3">
          Points above the dashed line mean you’re under-confident on those answers; below means you’re over-confident — the exam-anxiety lever to watch.
        </p>
      </CardBody>
    </Card>
  );
}
