import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, Badge, Stat, Skeleton } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';

const pctFmt = (p) => Math.round((p ?? 0) * 100);
const rankBand = (pct) => {
  if (pct <= 1) return { label: 'Top 1%', tone: 'velocity' };
  if (pct <= 10) return { label: 'Top 10%', tone: 'velocity' };
  if (pct <= 25) return { label: 'Top 25%', tone: 'signal' };
  if (pct <= 50) return { label: 'Top 50%', tone: 'success' };
  return { label: 'Bottom half', tone: 'danger' };
};

export function TrajectoryCard() {
  const { snapshot, loading, error, recompute } = useForecast();

  if (loading && !snapshot) {
    return (
      <Card elevated className="p-0">
        <CardHeader>
          <div>
            <CardEyebrow>Trajectory</CardEyebrow>
            <CardTitle>Projecting your exam outcome</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4">
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-3 col-span-2" />
        </CardBody>
      </Card>
    );
  }

  if (error && !snapshot) {
    return (
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Trajectory</CardEyebrow>
            <CardTitle>Forecast unavailable</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-muted2 text-sm">Couldn’t reach the forecast service. We’ll retry when the connection is back.</p>
        </CardBody>
      </Card>
    );
  }

  const pass = snapshot?.passProbability ?? 0;
  const top = snapshot?.topnotcherProbability ?? 0;
  const rank = snapshot?.expectedRank ?? 50;
  const band = rankBand(rank);

  return (
    <Card elevated grain className="overflow-hidden">
      <CardHeader>
        <div>
          <CardEyebrow>Trajectory</CardEyebrow>
          <CardTitle>Projected exam outcome</CardTitle>
        </div>
        <Badge tone={band.tone}>{band.label}</Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-6">
          <Stat label="Pass probability" value={pctFmt(pass)} suffix="%" />
          <Stat label="Topnotcher chance" value={pctFmt(top)} suffix="%" />
        </div>

        <ProbabilityBar pass={pass} top={top} />

        <div className="flex items-center justify-between text-xs text-muted2 font-mono">
          <span>Model {snapshot?.modelVersion ?? 'v1'}</span>
          <button
            type="button"
            onClick={recompute}
            disabled={loading}
            className="underline-offset-2 hover:underline focus-visible:outline-none disabled:opacity-50"
          >
            {loading ? 'Recomputing…' : 'Recompute now'}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function ProbabilityBar({ pass, top }) {
  const passPct = Math.max(0, Math.min(100, pass * 100));
  const topPct = Math.max(0, Math.min(100, top * 100));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>Pass cutoff</span>
        <span>Topnotcher cutoff</span>
      </div>
      <div className="relative h-2 rounded-full bg-surface3 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-[var(--accent-signal)]"
          style={{ width: `${passPct}%`, transition: 'width 600ms var(--ease-out-quart)' }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-[var(--accent-velocity)] mix-blend-screen"
          style={{ width: `${topPct}%`, transition: 'width 600ms var(--ease-out-quart)' }}
        />
      </div>
    </div>
  );
}
