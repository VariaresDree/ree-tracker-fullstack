// src/features/progress/HabitsTab.jsx
//
// Progress → Habits: when and how long you study. The study calendar (moved
// from Profile's "Comparative analytics"), study time over the last two weeks,
// focus time from the timer (by subject, against the board), where the time
// per question goes, and accuracy by time of day against board hours.
import ActivityCalendar from '../profile/ActivityCalendar';
import StudyTime from '../analytics/sections/StudyTime';
import FocusTime from '../analytics/sections/FocusTime';
import TimePerTopic from '../analytics/sections/TimePerTopic';
import TimeOfDay from '../analytics/sections/TimeOfDay';

export default function HabitsTab({ stats }) {
  return (
    <div className="flex flex-col gap-6">
      <ActivityCalendar activityCalendar={stats?.activityCalendar || {}} targetQuota={stats?.dailyTarget || 50} />
      <StudyTime />
      <FocusTime />
      <TimePerTopic />
      <TimeOfDay />
    </div>
  );
}
