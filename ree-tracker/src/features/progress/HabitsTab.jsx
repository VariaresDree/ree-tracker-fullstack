// src/features/progress/HabitsTab.jsx
//
// Progress → Habits: when and how long you study. The study calendar (moved
// from Profile's "Comparative analytics"), study time over the last two weeks,
// and where the time per question goes.
import ActivityCalendar from '../profile/ActivityCalendar';
import StudyTime from '../analytics/sections/StudyTime';
import TimePerTopic from '../analytics/sections/TimePerTopic';

export default function HabitsTab({ stats }) {
  return (
    <div className="flex flex-col gap-6">
      <ActivityCalendar activityCalendar={stats?.activityCalendar || {}} targetQuota={stats?.dailyTarget || 50} />
      <StudyTime />
      <TimePerTopic />
    </div>
  );
}
