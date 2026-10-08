// src/features/progress/ConfidenceTab.jsx
//
// Progress → Confidence: does how sure you feel match how often you're right?
// The four-way confidence matrix, the calibration curve, and accuracy at each
// confidence level.
import ConfidenceMatrix from '../../components/ConfidenceMatrix';
import Calibration from '../analytics/sections/Calibration';

export default function ConfidenceTab({ stats }) {
  return (
    <div className="flex flex-col gap-6">
      <ConfidenceMatrix stats={stats} />
      <Calibration />
    </div>
  );
}
