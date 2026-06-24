import { motion } from 'motion/react';
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, Badge, Stat, Skeleton } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';

// Motion presets — spring tuned to settle in ~700ms with a 6% overshoot.
const cardEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};
const barSpring = { type: 'spring', stiffness: 90, damping: 20, mass: 0.6 };

const pctFmt = (p) => Math.round((p ?? 0) * 100);
const rankBand = (pct) => {
  if (pct <= 1) return { label: 'Top 1%', tone: 'velocity' };
  if (pct <= 10) return { label: 'Top 10%', tone: 'velocity' };
  if (pct <= 25) return { label: 'Top 25%', tone: 'signal' };
  if (pct <= 50) return { label: 'Top 50%', tone: 'success' };
  return { label: 'Bottom half', tone: 'danger' };
};

// One-line definition of the feature, shown in every state so the user
// understands what they're looking at even before any data lands.
const ABOUT_TRAJECTORY =
  'Pass and topnotcher probabilities derived from your question history.';

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
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-14 w-32" />
            <Skeleton className="h-14 w-32" />
            <Skeleton className="h-3 col-span-2" />
          </div>
        </CardBody>
      </Card>
    );
  }

  // No snapshot means the service was unreachable — the backend always computes
  // an estimate on the fly when it CAN respond, so a missing snapshot is never
  // "no data", it's "couldn't connect". Don't render a misleading 0% here.
  if (!snapshot) {
    return (
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Trajectory</CardEyebrow>
            <CardTitle>Forecast unavailable</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-muted2 text-sm">
            {error
              ? "Forecast service unreachable - retry in a moment."
              : "Connecting..."}
          </p>
          <button
            type="button"
            onClick={recompute}
            disabled={loading}
            className="self-start text-xs font-semibold text-[var(--accent-velocity)] underline-offset-2 hover:underline disabled:opacity-50"
          >
            {loading ? 'Retrying…' : 'Retry now'}
          </button>
        </CardBody>
      </Card>
    );
  }

  const pass = snapshot?.passProbability ?? 0;
  const top = snapshot?.topnotcherProbability ?? 0;
  const rank = snapshot?.expectedRank ?? 50;
  const band = rankBand(rank);
  // Cold-start: a snapshot with no topic-level signal yet is just the prior.
  // Tell the user it'll sharpen as they answer questions, rather than implying
  // these are hardened numbers.
  const isEarlyEstimate = !snapshot?.weakTopics || snapshot.weakTopics.length === 0;

  return (
    <motion.div {...cardEnter}>
    <Card elevated grain className="overflow-hidden">
      <CardHeader>
        <div>
          <CardEyebrow>Trajectory</CardEyebrow>
          <CardTitle>Projected exam outcome</CardTitle>
        </div>
        <Badge tone={band.tone}>{band.label}</Badge>
      </CardHeader>
      <CardBody className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-6">
          <Stat label="Pass probability" value={pctFmt(pass)} suffix="%" />
          <Stat label="Topnotcher chance" value={pctFmt(top)} suffix="%" />
        </div>

        <ProbabilityBar pass={pass} top={top} />

        {isEarlyEstimate && (
          <p className="text-[10px] text-muted2">
            Early estimate — sharpens as you answer more.
          </p>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted2 font-mono">
          <span>Model {snapshot?.modelVersion ?? 'v1'}</span>
          <button
            type="button"
            onClick={recompute}
            disabled={loading}
            className="underline-offset-2 hover:underline focus-visible:outline-none disabled:opacity-50"
          >
            {loading ? 'Retrying…' : 'Recompute'}
          </button>
        </div>
      </CardBody>
    </Card>
    </motion.div>
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
        <motion.div
          className="absolute inset-y-0 left-0 bg-[var(--accent-signal)]"
          initial={{ width: 0 }}
          animate={{ width: `${passPct}%` }}
          transition={barSpring}
        />
        <motion.div
          className="absolute inset-y-0 left-0 bg-[var(--accent-velocity)] mix-blend-screen"
          initial={{ width: 0 }}
          animate={{ width: `${topPct}%` }}
          transition={barSpring}
        />
      </div>
    </div>
  );
}
