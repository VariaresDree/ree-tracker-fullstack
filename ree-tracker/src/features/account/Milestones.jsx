// src/features/account/Milestones.jsx
//
// Milestones you've reached: mock sittings, practice streaks, ability. Moved
// from Profile's analytics tab to Account › Achievements, with icons in place
// of emoji and plain names.
import { useEffect, useState } from 'react';
import { effectiveStreak, longestStreak } from '@ree/shared';
import { lastStudyDay } from '../../services/analyticsSync';
import { useStore } from '../../store/useStore';
import { fetchMockHistory } from '../../services/dbQueries';
import { GraduationCap, Zap, Flame, Shield, Brain, Lock } from '../../components/ui/icons';

export default function Milestones() {
  const stats = useStore((s) => s.stats);
  const [mockCount, setMockCount] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchMockHistory(100)
      .then((history) => { if (alive) setMockCount(history?.length || 0); })
      .catch(() => { if (alive) setMockCount(0); });
    return () => { alive = false; };
  }, []);

  // Reached streaks stay reached: the best run in the study calendar, or the
  // current run as it stands today if the calendar here is partial. The raw
  // stored streak outlived a missed day, and a judged current streak alone
  // would take an earned milestone away after one.
  const streak = Math.max(
    longestStreak(stats?.activityCalendar),
    effectiveStreak(stats?.globalStreak, lastStudyDay(stats)),
  );
  const theta = stats?.irt?.theta;
  const milestones = [
    { id: 'first-mock', icon: GraduationCap, name: 'First mock board', detail: 'Finish one mock board', done: mockCount >= 1 },
    { id: 'ten-mocks', icon: Zap, name: 'Ten mock boards', detail: 'Finish ten mock boards', done: mockCount >= 10 },
    { id: 'week-streak', icon: Flame, name: 'Week streak', detail: 'Practise 7 days in a row', done: streak >= 7 },
    { id: 'month-streak', icon: Shield, name: 'Month streak', detail: 'Practise 30 days in a row', done: streak >= 30 },
    { id: 'high-ability', icon: Brain, name: 'High ability', detail: 'Reach an ability (θ) of 2.0', done: Number.isFinite(theta) && theta >= 2.0 },
  ];
  const reached = milestones.filter((m) => m.done).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted2">{reached} of {milestones.length} reached</p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {milestones.map((m) => {
          const Icon = m.done ? m.icon : Lock;
          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 p-3 rounded-[var(--radius-default)] border ${m.done ? 'border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]' : 'border-border2 bg-surface2/40'}`}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" className={m.done ? 'text-[var(--accent-text)] shrink-0' : 'text-muted shrink-0'} />
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${m.done ? 'text-textMain' : 'text-muted2'}`}>{m.name}</span>
                <span className="block text-xs text-muted2">{m.done ? 'Reached' : m.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
