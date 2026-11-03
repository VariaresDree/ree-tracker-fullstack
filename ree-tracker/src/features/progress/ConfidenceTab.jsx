// src/features/progress/ConfidenceTab.jsx
//
// Progress → Confidence: does how sure you feel match how often you're right?
// The four-way confidence matrix, the calibration curve, and accuracy at each
// confidence level. Then your own rating of each topic against your answers
// (SelfVsData, the CELE "Meta topics"). Before any rated answer, one card says how
// the first two fill in; they were two more empty sections.
import ConfidenceMatrix from '../../components/ConfidenceMatrix';
import { Crosshair } from '../../components/ui/icons';
import Calibration from '../analytics/sections/Calibration';
import SelfVsData from '../analytics/sections/SelfVsData';
import NothingYet from './NothingYet';

const isRated = (stats) => Object.values(stats?.matrix || {}).some((n) => Number(n) > 0);

export default function ConfidenceTab({ stats }) {
  return (
    <div className="flex flex-col gap-6">
      {isRated(stats) ? (
        <>
          <ConfidenceMatrix stats={stats} />
          <Calibration />
        </>
      ) : (
        <NothingYet
          icon={Crosshair}
          title="See whether your confidence matches your answers"
          description="Pick how sure you are when you answer in Practice. Your answers then sort into mastery, blind spots, lucky guesses and gaps."
        />
      )}
      <SelfVsData />
    </div>
  );
}
