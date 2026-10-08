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
      <div className="min-h-[380px] lg:h-[460px]">
        <HeatmapChart stats={stats} onDrillTopic={(topic, subject) => launchPractice(navigate, drillPreset({ topic, subject }))} />
      </div>
      <SubjectAccuracy />
    </div>
  );
}
