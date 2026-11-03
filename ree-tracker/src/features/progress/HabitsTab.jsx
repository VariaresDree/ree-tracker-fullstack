// src/features/progress/HabitsTab.jsx
//
// Progress → Habits: when and how long you study. The study calendar (moved
// from Profile's "Comparative analytics"), study time over the last two weeks,
// focus time from the timer (by subject, against the board), where the time
// per question goes, and accuracy by time of day against board hours. Before any
// answers, one card stands in for those; focus time stays, since the timer and its
// goal work from day one.
import { CalendarDays } from '../../components/ui/icons';
import ActivityCalendar from '../profile/ActivityCalendar';
import StudyTime from '../analytics/sections/StudyTime';
import FocusTime from '../analytics/sections/FocusTime';
import TimePerTopic from '../analytics/sections/TimePerTopic';
import TimeOfDay from '../analytics/sections/TimeOfDay';
import NothingYet from './NothingYet';

export default function HabitsTab({ stats }) {
  if (stats && Object.keys(stats.activityCalendar || {}).length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <NothingYet
          icon={CalendarDays}
          title="Your study habits show here once you start"
          description="Your calendar, study time, pace and best hours of the day fill in as you practise."
        />
        <FocusTime />
      </div>
    );
  }
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
