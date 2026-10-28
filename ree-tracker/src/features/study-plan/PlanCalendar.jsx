// src/features/study-plan/PlanCalendar.jsx
//
// Progress › Study plan: the month calendar beside the plan. A day shows its
// open tasks (a dot), a key date (a ring in the corner) and whether it's a
// rest day (dimmed), the CELE tracker's refresher calendar with its legend.
// Picking a day filters the task list to it.
import { isRestDay, keyDayMap } from '@ree/shared';
import { Button, Card } from '../../components/ui';
import { ChevronLeft, ChevronRight } from '../../components/ui/icons';
import { isTaskDone } from '../profile/plannerTasks';
import { todayManila } from '../../utils/manilaDate';
import { KIND_LABEL, dayLabel, isoDay } from './keyDateLabels';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * @param {{ month: Date, onMonth: (d: Date) => void, tasks: object[], keyDates?: object[]|null,
 *   restWeekdays?: number[], selectedDay: string|null, onSelectDay: (d: string|null) => void,
 *   counts: { overdue: number, today: number, week: number } }} props
 */
export default function PlanCalendar({ month, onMonth, tasks, keyDates = [], restWeekdays = [], selectedDay, onSelectDay, counts }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const firstDay = new Date(year, m, 1).getDay();
  // Manila "today", like every daily boundary in the app.
  const today = todayManila();
  const openByDay = new Map();
  for (const t of tasks) {
    if (t.dueDate && !isTaskDone(t)) openByDay.set(t.dueDate, (openByDay.get(t.dueDate) || 0) + 1);
  }
  const days = keyDayMap(keyDates || [], isoDay(year, m, 1), isoDay(year, m, daysInMonth));
  const anyRest = restWeekdays.length > 0 || (keyDates || []).some((e) => e.kind === 'rest');

  return (
    <Card padding="sm" className="h-full flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => onMonth(new Date(year, m - 1, 1))}>
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <h3 className="text-h3 text-textMain" aria-live="polite">
          {month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => onMonth(new Date(year, m + 1, 1))}>
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
      <div>
        <div className="grid grid-cols-7 gap-1 text-center text-micro font-semibold text-muted mb-1" aria-hidden="true">
          {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const iso = isoDay(year, m, d);
            const open = openByDay.get(iso) || 0;
            const isToday = iso === today;
            const selected = iso === selectedDay;
            const marks = (days.get(iso) || []).filter((e) => e.kind !== 'rest');
            const rest = isRestDay(iso, restWeekdays, days);
            const said = [
              isToday && 'today',
              rest && 'rest day',
              ...marks.map((e) => `${KIND_LABEL[e.kind]}: ${e.title}`),
              open && `${open} open ${open === 1 ? 'task' : 'tasks'}`,
            ].filter(Boolean);
            return (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDay(selected ? null : iso)}
                aria-pressed={selected}
                aria-label={`${dayLabel(iso)}${said.length ? `, ${said.join(', ')}` : ''}`}
                className={`relative h-9 pointer-coarse:h-11 rounded-[var(--radius-sm)] text-xs tabular-nums cursor-pointer transition-colors ${
                  selected ? 'font-semibold text-[var(--on-accent)]' : isToday ? 'font-semibold text-textMain' : rest ? 'text-muted2 hover:bg-surface2' : 'text-textMain hover:bg-surface2'
                }`}
                // Selected: the accent button's fill (white on the raw accent read 4.35:1).
                // A rest day sits on a faint well, so it reads as a day off.
                style={selected
                  ? { background: 'color-mix(in srgb, var(--accent) 88%, black)' }
                  : isToday ? { boxShadow: 'inset 0 0 0 1.5px var(--accent)' }
                    : rest ? { background: 'color-mix(in srgb, var(--bg-surface2) 70%, transparent)' } : undefined}
              >
                {d}
                {marks.length > 0 && (
                  <span aria-hidden="true" className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ boxShadow: `0 0 0 1.5px ${selected ? 'currentColor' : 'var(--accent-signal)'}` }} />
                )}
                {open > 0 && (
                  <span aria-hidden="true" className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: selected ? 'currentColor' : 'var(--color-reeAmber)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      <ul className="flex flex-col gap-1 text-micro text-muted2" aria-label="Calendar legend">
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-reeAmber)' }} />
          A day with open tasks. Pick a day to see only its tasks.
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ boxShadow: '0 0 0 1.5px var(--accent-signal)' }} />
          A key date: a preboard, coaching, a deadline.
        </li>
        {anyRest && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="shrink-0 w-2.5 h-2.5 rounded-[3px]" style={{ background: 'color-mix(in srgb, var(--bg-surface2) 70%, transparent)', boxShadow: '0 0 0 1px var(--border-light)' }} />
            A rest day: no plan tasks.
          </li>
        )}
      </ul>
      {/* At the card's foot, level with the plan's Generate button beside it. */}
      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3 text-center" aria-label="Open tasks">
        {[['Overdue', counts.overdue], ['Today', counts.today], ['Next 7 days', counts.week]].map(([label, n]) => (
          <div key={label}>
            <dt className="text-micro text-muted2">{label}</dt>
            <dd className={`text-lg font-semibold tabular-nums ${label === 'Overdue' && n > 0 ? 'text-reeRed-text' : 'text-textMain'}`}>{n}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
