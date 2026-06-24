import { motion } from 'motion/react';
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, Badge, Button, Skeleton } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';

const rowEnter = (i) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] },
});

// Prescription panel — concrete next 3 actions derived from the forecast.
// Action types come from the backend (READ | DRILL | SRS_REVIEW); the panel
// renders an action label + reason and lets the user accept (which the
// dashboard wires into navigation in a follow-up).

// One-line definition of the feature so the user always understands what
// the card is for, even when no actions have been generated yet.
const ABOUT_PRESCRIPTION =
  'Three concrete next steps targeting your weakest topics — drill, spaced review, or read source — generated from the same model behind the Trajectory card.';

const ACTION_LABELS = {
  READ: 'Read source',
  DRILL: 'Targeted drill',
  SRS_REVIEW: 'Spaced review',
};

const ACTION_TONES = {
  READ: 'signal',
  DRILL: 'velocity',
  SRS_REVIEW: 'success',
};

export function PrescriptionPanel({ onAction }) {
  const { snapshot, loading, error } = useForecast();

  if (loading && !snapshot) {
    return (
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Today’s prescription</CardEyebrow>
            <CardTitle>Picking your highest-leverage actions</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-[11px] leading-snug text-muted2">{ABOUT_PRESCRIPTION}</p>
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </CardBody>
      </Card>
    );
  }

  // Missing snapshot = service unreachable (not "no data" — the backend always
  // returns an estimate when it can respond). Keep the copy calm and truthful.
  if (!snapshot) {
    return (
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Today’s prescription</CardEyebrow>
            <CardTitle>Prescription unavailable</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-[11px] leading-snug text-muted2">{ABOUT_PRESCRIPTION}</p>
          <p className="text-muted2 text-sm">
            {error
              ? 'We’ll resurface the day’s actions once the forecast service is reachable. If you just restarted the backend, give it a moment and refresh.'
              : 'Connecting to the forecast service…'}
          </p>
        </CardBody>
      </Card>
    );
  }

  const actions = snapshot?.recommendedActions ?? [];
  const weak = snapshot?.weakTopics ?? [];

  return (
    <Card elevated>
      <CardHeader>
        <div>
          <CardEyebrow>Today’s prescription</CardEyebrow>
          <CardTitle>Three actions to close your widest gaps</CardTitle>
        </div>
        {weak[0] && <Badge tone="danger">Weak: {weak[0].topic}</Badge>}
      </CardHeader>

      <CardBody className="space-y-3">
        <p className="text-[11px] leading-snug text-muted2">{ABOUT_PRESCRIPTION}</p>
        {actions.length === 0 ? (
          <p className="text-muted2 text-sm">
            Not enough telemetry yet. Take a board sim or a few active-review items and we’ll start prescribing.
          </p>
        ) : (
          actions.map((a, i) => (
            <motion.div key={i} {...rowEnter(i)}>
              <PrescriptionRow action={a} onAction={onAction} />
            </motion.div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

function PrescriptionRow({ action, onAction }) {
  const label = ACTION_LABELS[action.type] || action.type;
  const tone = ACTION_TONES[action.type] || 'neutral';
  const topic = action.payload?.topic ?? '—';
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border hover:bg-surface3 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{label}</Badge>
          <span className="text-textMain text-sm font-medium truncate">{topic}</span>
        </div>
        <p className="text-muted2 text-xs mt-1 line-clamp-2">{action.reason}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => onAction?.(action)}>
        Start →
      </Button>
    </div>
  );
}
