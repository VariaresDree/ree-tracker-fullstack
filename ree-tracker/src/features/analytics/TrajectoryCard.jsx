import { motion } from 'motion/react';
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, Badge, Stat, Skeleton } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';
import { GENERAL_AVERAGE, SUBJECT_FLOOR, toDisplaySubject } from '@ree/shared';

// Motion presets — spring tuned to settle in ~700ms with a 6% overshoot.
const cardEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};
const barSpring = { type: 'spring', stiffness: 90, damping: 20, mass: 0.6 };

const pctFmt = (p) => Math.round((p ?? 0) * 100);
const SUBJECTS = ['Mathematics', 'ESAS', 'EE'];

// One-line definition of the feature, shown in every state so the user
// understands what they're looking at even before any data lands.
const ABOUT_TRAJECTORY =
  'Your chance of passing under the PRC rule: a 70% weighted average with no subject below 50%.';

export function TrajectoryCard() {
  const { snapshot, loading, error, recompute } = useForecast();

  if (loading && !snapshot) {
    return (
      <Card elevated className="p-0">
        <CardHeader>
          <div>
            <CardEyebrow>Board forecast</CardEyebrow>
            <CardTitle>Projecting your board outcome</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <p className="text-xs text-muted2">{ABOUT_TRAJECTORY}</p>
          <Skeleton className="h-14 w-32" />
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
          <Skeleton className="h-3" />
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
            <CardEyebrow>Board forecast</CardEyebrow>
            <CardTitle>Forecast unavailable</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col gap-3">
          <p className="text-muted2 text-sm">
            {error ? 'The forecast service is unreachable. Retry in a moment.' : 'Connecting…'}
          </p>
          <button
            type="button"
            onClick={recompute}
            disabled={loading}
            className="self-start text-sm font-semibold text-[var(--accent-text)] underline-offset-2 hover:underline disabled:opacity-50 pointer-coarse:min-h-11"
          >
            {loading ? 'Retrying…' : 'Retry now'}
          </button>
        </CardBody>
      </Card>
    );
  }

  const pass = snapshot.passProbability ?? 0;
  const projection = snapshot.subjectForecasts || null;
  const conditional = projection?.conditionalProbability ?? 0;
  const gwa = projection?.projectedGWA;
  const binding = projection?.bindingSubject;
  // Cold start: no topic-level signal yet means the projection is mostly the
  // prior. Say so rather than implying these are hardened numbers.
  const isEarlyEstimate = !snapshot.weakTopics || snapshot.weakTopics.length === 0;

  return (
    <motion.div {...cardEnter}>
      <Card elevated grain className="overflow-hidden">
        <CardHeader>
          <div>
            <CardEyebrow>Board forecast</CardEyebrow>
            <CardTitle>Projected board outcome</CardTitle>
          </div>
          {isEarlyEstimate ? <Badge tone="signal">Early estimate</Badge> : null}
        </CardHeader>
        <CardBody className="flex flex-col gap-5">
          <p className="text-xs text-muted2">{ABOUT_TRAJECTORY}</p>

          <div className="grid grid-cols-2 gap-6">
            <Stat label="Pass probability" value={pctFmt(pass)} suffix="%" />
            {gwa ? (
              <div className="flex flex-col">
                <span className="text-eyebrow">Projected average</span>
                <span className="text-display text-3xl text-textMain tabular-nums">{gwa.mean.toFixed(1)}%</span>
                <span className="text-xs text-muted2 tabular-nums">likely {Math.round(gwa.low)}–{Math.round(gwa.high)}%</span>
              </div>
            ) : (
              <Stat label="Topnotcher chance" value={pctFmt(snapshot.topnotcherProbability)} suffix="%" />
            )}
          </div>

          {conditional >= 0.05 && (
            <p className="text-xs rounded-[var(--radius-default)] border px-3 py-2"
              style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 40%, transparent)', color: 'var(--text-main)' }}>
              <strong className="font-semibold">{pctFmt(conditional)}% chance of a conditional result</strong> — the
              average is met but a subject falls under {SUBJECT_FLOOR}%, so that subject would have to be retaken.
            </p>
          )}

          {projection?.subjects && (
            <div className="flex flex-col gap-3" aria-label="Projected rating by subject">
              <div className="flex justify-between text-[11px] text-muted2">
                <span>Projected rating by subject</span>
                <span>floor {SUBJECT_FLOOR}% · pass {GENERAL_AVERAGE}%</span>
              </div>
              {SUBJECTS.map((s) => (
                <SubjectRow key={s} subject={s} data={projection.subjects[s]} isBinding={s === binding} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-muted2 font-mono">
            <span>
              Topnotcher {pctFmt(snapshot.topnotcherProbability)}% (estimate) · model {snapshot.modelVersion ?? 'v1'}
            </span>
            {/* Inline text-link visually; the tap AREA grows to 44px on touch
                via padding + matching negative margin. */}
            <button
              type="button"
              onClick={recompute}
              disabled={loading}
              className="underline-offset-2 hover:underline disabled:opacity-50 pointer-coarse:p-4 pointer-coarse:-m-4 rounded-sm"
            >
              {loading ? 'Retrying…' : 'Recompute'}
            </button>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}

function SubjectRow({ subject, data, isBinding }) {
  if (!data) return null;
  const expected = Math.max(0, Math.min(100, data.expected));
  const low = Math.max(0, Math.min(100, data.low));
  const high = Math.max(0, Math.min(100, data.high));
  const belowFloor = expected < SUBJECT_FLOOR;
  const tone = belowFloor ? 'var(--accent-danger)' : expected >= GENERAL_AVERAGE ? 'var(--accent-success)' : 'var(--color-reeAmber)';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-textMain font-medium flex items-center gap-2">
          {toDisplaySubject(subject)}
          {isBinding && <Badge tone="velocity">Most leverage</Badge>}
        </span>
        <span className="tabular-nums text-textMain">
          {Math.round(expected)}%
          <span className="text-muted2 text-xs"> ({Math.round(low)}–{Math.round(high)})</span>
          {belowFloor && <span className="sr-only"> — below the {SUBJECT_FLOOR}% floor</span>}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-surface3" aria-hidden="true">
        {/* likely range */}
        <div className="absolute inset-y-0 rounded-full opacity-25" style={{ left: `${low}%`, width: `${Math.max(1, high - low)}%`, background: tone }} />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: tone }}
          initial={{ width: 0 }}
          animate={{ width: `${expected}%` }}
          transition={barSpring}
        />
        <span className="absolute -top-0.5 -bottom-0.5 w-px bg-[var(--text-muted)]" style={{ left: `${SUBJECT_FLOOR}%` }} />
        <span className="absolute -top-0.5 -bottom-0.5 w-px bg-[var(--text-main)]" style={{ left: `${GENERAL_AVERAGE}%` }} />
      </div>
    </div>
  );
}
