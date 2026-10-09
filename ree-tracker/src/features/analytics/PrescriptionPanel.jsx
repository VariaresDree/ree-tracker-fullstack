import { motion } from 'motion/react';
import { Card, CardHeader, CardEyebrow, CardTitle, CardBody, Badge, Button, Skeleton } from '../../components/ui';
import { ArrowRight } from '../../components/ui/icons';
import { useForecast } from '../../hooks/useForecast';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const rowEnter = (i) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] },
});

// Prescription panel — concrete next 3 actions derived from the forecast
// (engine/forecast buildPrescription). Types, in the order the engine ranks
// them: BLIND_SPOT (a topic answered confidently wrong), DRILL (the costliest
// gap by decayed mastery × syllabus weight), SRS_DUE (the spaced-review
// queue), FORMULA_CARDS (a topic eating the clock), READ (barely started).
// SRS_REVIEW is the v1 type, kept so an old persisted snapshot still renders.

// One-line definition of the feature so the user always understands what
// the card is for, even when no actions have been generated yet.
const ABOUT_PRESCRIPTION =
  'Three next steps targeting your weakest topics.';

const ACTION_LABELS = {
  BLIND_SPOT: 'Blind spot',
  DRILL: 'Targeted drill',
  SRS_DUE: 'Spaced review',
  FORMULA_CARDS: 'Formula cards',
  READ: 'Read source',
  SRS_REVIEW: 'Spaced review',
};

const ACTION_TONES = {
  BLIND_SPOT: 'danger',
  DRILL: 'velocity',
  SRS_DUE: 'success',
  FORMULA_CARDS: 'amber',
  READ: 'signal',
  SRS_REVIEW: 'success',
};

export function PrescriptionPanel({ onAction }) {
  const { snapshot, loading, refresh } = useForecast();
  const isOnline = useNetworkStatus();

  if (loading && !snapshot) {
    return (
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Recommended fixes</CardEyebrow>
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

  // Missing snapshot = the forecast couldn't be reached (not "no data": the
  // backend always returns an estimate when it can respond). Offline, the
  // request returns nothing without an error, and this used to read
  // "Connecting..." for as long as the page stayed open.
  if (!snapshot) {
    return (
      <Card elevated>
        <CardHeader>
          <div>
            <CardEyebrow>Recommended fixes</CardEyebrow>
            <CardTitle>{isOnline ? "Couldn't load your recommended fixes" : 'Unavailable offline'}</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="flex flex-col items-start gap-3">
          <p className="text-muted2 text-sm">
            {isOnline
              ? 'The forecast didn’t answer. Try again in a moment.'
              : 'They come from your forecast, which needs a connection.'}
          </p>
          {isOnline && <Button size="sm" variant="secondary" onClick={refresh} disabled={loading}>Try again</Button>}
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
          <CardEyebrow>Recommended fixes</CardEyebrow>
          <CardTitle>Three actions to close your widest gaps</CardTitle>
        </div>
        {weak[0] && <Badge tone="danger">Weak: {weak[0].topic}</Badge>}
      </CardHeader>

      <CardBody className="space-y-3">
        {actions.length === 0 ? (
          <p className="text-muted2 text-sm">
            {ABOUT_PRESCRIPTION} Answer a few questions and they appear here.
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
  const topic = action.payload?.topic ?? (action.type === 'SRS_DUE' ? 'Review queue' : '—');
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
        Start <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </div>
  );
}
