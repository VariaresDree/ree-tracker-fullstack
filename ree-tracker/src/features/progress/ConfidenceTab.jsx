// src/features/progress/ConfidenceTab.jsx
//
// Progress → Confidence: does how sure you feel match how often you're right?
// The four-way confidence matrix, the calibration curve, and accuracy at each
// confidence level. Then your own rating of each topic against your answers
// (SelfVsData, the CELE "Meta topics").
import ConfidenceMatrix from '../../components/ConfidenceMatrix';
import Calibration from '../analytics/sections/Calibration';
import SelfVsData from '../analytics/sections/SelfVsData';

export default function ConfidenceTab({ stats }) {
  return (
    <div className="flex flex-col gap-6">
      <ConfidenceMatrix stats={stats} />
      <Calibration />
      <SelfVsData />
    </div>
  );
}
