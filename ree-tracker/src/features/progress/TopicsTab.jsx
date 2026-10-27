// src/features/progress/TopicsTab.jsx
//
// Progress → Topics: mastery, accuracy and speed per subtopic (each tile
// starts a drill on that topic), and accuracy per subject.
import { useNavigate } from 'react-router-dom';
import HeatmapChart from '../../components/HeatmapChart';
import { drillPreset, launchPractice } from '../active-recall/presets';
import SubjectAccuracy from '../analytics/sections/SubjectAccuracy';

export default function TopicsTab({ stats }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      {/* A set height for the tile list to scroll in: 460px, or less of a
          short screen, never under 380px. It took `lg:` (the window) to set
          one, so below 1024px the list grew to its full length. */}
      <div className="h-[min(460px,75dvh)] min-h-[380px]">
        <HeatmapChart stats={stats} onDrillTopic={(topic, subject) => launchPractice(navigate, drillPreset({ topic, subject }))} />
      </div>
      <SubjectAccuracy />
    </div>
  );
}
