// src/features/analytics/sections/Calibration.jsx
// Does confidence track accuracy? The calibration curve plus accuracy at each
// confidence level (deep/confidence-calibration).
import { CalibrationCurve } from '../CalibrationCurve';
import { useDeepAnalytics } from '../useDeepAnalytics';
import { DeepStatus, SectionCard } from './shared';

const LEVEL = { LOW: 'Low confidence', MED: 'Medium confidence', HIGH: 'High confidence' };

// Low confidence should mean under 50% right and high confidence 70% or more;
// medium has no bar to miss.
const isCalibrated = (item) => (
  item.confidence === 'LOW' ? item.accuracy < 50 : item.confidence === 'HIGH' ? item.accuracy >= 70 : true
);

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
                const ok = isCalibrated(item);
                const color = ok ? 'var(--accent-success)' : 'var(--accent-danger)';
                return (
                  <li key={item.confidence} className="p-4 rounded-[var(--radius-default)] border border-border bg-surface2/40 text-center">
                    <div className="text-eyebrow mb-2">{LEVEL[item.confidence] || item.confidence}</div>
                    <div className="text-3xl font-semibold tabular-nums" style={{ color }}>{item.accuracy}%</div>
                    <div className="text-xs text-muted2 mt-1">{item.correct} of {item.total} correct</div>
                    <div className="text-xs font-medium mt-2" style={{ color }}>{ok ? 'Well calibrated' : 'Miscalibrated'}</div>
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
