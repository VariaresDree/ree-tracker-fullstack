import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, Badge, Button, Skeleton } from '../../components/ui';
import { useForecast } from '../../hooks/useForecast';

// Prescription panel — concrete next 3 actions derived from the forecast.
// Action types come from the backend (READ | DRILL | SRS_REVIEW); the panel
// renders an action label + reason and lets the user accept (which the
// dashboard wires into navigation in a follow-up).
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
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </CardBody>
      </Card>
    );
  }

  if (error && !snapshot) {
    return (
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Today’s prescription</CardEyebrow>
            <CardTitle>Prescription unavailable</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-muted2 text-sm">We’ll resurface the day’s actions once the forecast service is reachable.</p>
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
        {actions.length === 0 ? (
          <p className="text-muted2 text-sm">
            Not enough telemetry yet. Take a board sim or a few active-review items and we’ll start prescribing.
          </p>
        ) : (
          actions.map((a, i) => (
            <PrescriptionRow key={i} action={a} onAction={onAction} />
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
