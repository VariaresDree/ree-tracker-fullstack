// src/features/analytics/sections/Calibration.jsx
// Does confidence track accuracy? The calibration curve plus accuracy at each
// confidence level (deep/confidence-calibration).
import { CalibrationCurve } from '../CalibrationCurve';
import { useDeepAnalytics } from '../useDeepAnalytics';
import { DeepStatus, SectionCard } from './shared';
import { CONFIDENCE_MAP, levelCalibration } from '../calibration';

const LEVEL = { LOW: 'Low confidence', MED: 'Medium confidence', HIGH: 'High confidence' };

// Each level against the probability it stands for (calibration.js).
const VERDICT = {
  calibrated: { label: 'Well calibrated', color: 'var(--accent-success)' },
  over: { label: 'Over-confident', color: 'var(--accent-danger)' },
  under: { label: 'Under-confident', color: 'var(--color-reeAmber-text)' },
};

export default function Calibration() {
  const { data, status, retry } = useDeepAnalytics('confidence-calibration');
  const items = data?.items || [];
  return (
    <div className="flex flex-col gap-6">
      {items.length > 0 && <CalibrationCurve buckets={items} />}
      <SectionCard eyebrow="Calibration" title="Accuracy at each confidence level">
        <DeepStatus status={status} retry={retry}>
          {items.length === 0 ? (
            <p className="text-sm text-muted2">Pick a confidence level when you answer, and this fills in.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {items.map((item) => {
                const verdict = VERDICT[levelCalibration(item.confidence, item.accuracy)];
                const color = verdict?.color || 'var(--text-main)';
                const expected = CONFIDENCE_MAP[item.confidence];
                return (
                  <li key={item.confidence} className="p-4 rounded-[var(--radius-default)] border border-border bg-surface2/40 text-center">
                    <div className="text-eyebrow mb-2">{LEVEL[item.confidence] || item.confidence}</div>
                    <div className="text-3xl font-semibold tabular-nums" style={{ color }}>{item.accuracy}%</div>
                    <div className="text-xs text-muted2 mt-1">{item.correct} of {item.total} correct</div>
                    {verdict && <div className="text-xs font-medium mt-2" style={{ color }}>{verdict.label}</div>}
                    {expected != null && <div className="text-[11px] text-muted2 mt-0.5">about {Math.round(expected * 100)}% expected</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </DeepStatus>
      </SectionCard>
    </div>
  );
}
