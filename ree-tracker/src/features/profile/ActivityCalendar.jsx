// src/features/profile/ActivityCalendar.jsx
import { useRef, useState } from 'react';
import { CardTitle } from '../../components/ui';
import { todayManila } from '../../utils/manilaDate';
import { CALENDAR_LEVELS, calendarLevel, levelFill } from './calendarLevels';

const pad = (n) => String(n).padStart(2, '0');
const questions = (n) => `${n} ${n === 1 ? 'question' : 'questions'}`;

export default function ActivityCalendar({ activityCalendar = {}, targetQuota = 50 }) {
  // Every key in activityCalendar is an Asia/Manila YYYY-MM-DD (that's how the
  // server's ActivityLog and the optimistic mirror both write). The calendar
  // therefore navigates and highlights in MANILA dates too — the old
  // browser-local `new Date()` drifted a day near midnight for non-PH users.
  const manilaToday = todayManila(); // 'YYYY-MM-DD'
  const [tYear, tMonth] = manilaToday.split('-').map(Number);
  const [currentDate, setCurrentDate] = useState(new Date(tYear, tMonth - 1, 1));
  // The day the line under the grid describes, and the grid's one tab stop.
  // The count used to be a hover-only tooltip: nothing on a phone or from the
  // keyboard.
  const [picked, setPicked] = useState(null);
  const dayRefs = useRef([]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const atCurrentMonth = currentDate.getMonth() === tMonth - 1 && currentDate.getFullYear() === tYear;
  const monthKey = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}`;
  const dateKey = (d) => `${monthKey}-${pad(d)}`;
  const pickedDay = picked?.startsWith(`${monthKey}-`) ? Number(picked.slice(8)) : null;
  const todayDay = atCurrentMonth ? Number(manilaToday.slice(8)) : null;
  const shownDay = pickedDay ?? todayDay;
  const focusDay = shownDay ?? 1;

  const dayLabel = (d) => new Date(currentDate.getFullYear(), currentDate.getMonth(), d)
    .toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const countOf = (d) => Number(activityCalendar[dateKey(d)]) || 0;

  // Arrow keys move a day (up and down a week), Home and End to the month's ends.
  const moveTo = (d) => {
    const next = Math.min(Math.max(1, d), daysInMonth);
    setPicked(dateKey(next));
    dayRefs.current[next]?.focus();
  };
  const onGridKeyDown = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) { e.preventDefault(); moveTo(focusDay + step); }
    else if (e.key === 'Home') { e.preventDefault(); moveTo(1); }
    else if (e.key === 'End') { e.preventDefault(); moveTo(daysInMonth); }
  };

  // Grand total across ALL days — this equals the Progress "Questions answered"
  // KPI and the store's totalAnswered (the backend returns every day uncapped and
  // analyticsSync reconciles them to one server-authoritative number).
  const grandTotal = Object.values(activityCalendar).reduce((sum, n) => sum + (Number(n) || 0), 0);

  // Legend ranges, in the same order as CALENDAR_LEVELS.
  const at = (share) => (targetQuota * share).toFixed(0);
  const legend = [
    `1-${at(0.3)} Qs`,
    `${at(0.3)}-${at(0.7)} Qs`,
    `${at(0.7)}-${targetQuota - 1} Qs`,
    `${targetQuota}+ Qs`,
  ];

  return (
    <div className="bg-surface border border-border2 p-6 md:p-8 rounded-[var(--radius-lg)] shadow-sm w-full flex flex-col relative">
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row md:justify-between md:items-end mb-6 border-b border-border2 pb-4 gap-3">
        <div>
          <CardTitle size="lg">Study calendar</CardTitle>
          <p className="text-sm text-muted mt-1">Questions answered each day, against your daily target of {targetQuota}.</p>
          <p className="text-eyebrow mt-2 text-textMain">
            {grandTotal.toLocaleString()} questions answered all-time
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-4 bg-bg border border-border2 px-2 py-1.5 rounded-lg shadow-inner">
           <button onClick={prevMonth} aria-label="Previous month" className="p-1 text-muted hover:text-textMain transition-colors cursor-pointer text-xl font-black touch-target inline-flex items-center justify-center">&lt;</button>
           <div className="w-40 text-center font-bold text-sm uppercase tracking-widest text-textMain">
              {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
           </div>
           <button onClick={nextMonth} disabled={atCurrentMonth} aria-label="Next month" className="p-1 text-muted hover:text-textMain transition-colors cursor-pointer text-xl font-black disabled:opacity-30 disabled:cursor-not-allowed touch-target inline-flex items-center justify-center">&gt;</button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="w-full border-t border-l border-border2 bg-surface2/30 rounded-lg overflow-hidden">
        {/* Days of Week */}
        <div className="grid grid-cols-7 text-center text-micro md:text-xs font-black text-muted uppercase tracking-widest bg-surface border-b border-border2" aria-hidden="true">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2 border-r border-border2 last:border-r-0">{d}</div>
            ))}
        </div>

        {/* Calendar Blocks: one tab stop, arrow keys between days. */}
        <div
          className="grid grid-cols-7"
          role="group"
          aria-label={`Questions answered each day, ${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`}
          onKeyDown={onGridKeyDown}
        >
            {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="aspect-square border-r border-b border-border2/50 bg-bg opacity-50"></div>
            ))}
            {days.map(d => {
                const count = countOf(d);
                const level = calendarLevel(count, targetQuota);
                const isToday = d === todayDay;
                const pick = () => setPicked(dateKey(d));

                return (
                    <button
                      key={d}
                      type="button"
                      ref={(el) => { dayRefs.current[d] = el; }}
                      tabIndex={d === focusDay ? 0 : -1}
                      onClick={pick}
                      onFocus={pick}
                      onMouseEnter={pick}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`${dayLabel(d)}${isToday ? ', today' : ''}: ${questions(count)} answered`}
                      className={`block w-full aspect-square border-r border-b border-border2/50 relative cursor-pointer transition-colors focus-visible:outline-offset-[-4px] ${level ? '' : 'bg-surface2 text-muted2'} ${level?.share === 100 ? 'font-black' : ''} ${isToday ? 'ring-2 ring-inset ring-[var(--accent)]' : ''}`}
                      style={level ? { background: levelFill(level.share), color: level.ink } : undefined}
                    >
                        <span className="absolute top-1 left-1.5 text-micro md:text-sm font-bold">{d}</span>
                        {count > 0 && (
                            <span className="absolute bottom-1 right-1.5 text-micro md:text-xs font-mono">{count}</span>
                        )}
                    </button>
                );
            })}
        </div>
      </div>

      {/* The picked day, for touch and keyboard (the hover tooltip reached
          neither). Each day's button names its count for a screen reader, so
          this line is for the eye only. */}
      <p className="mt-3 text-sm text-textMain min-h-5" aria-hidden="true">
        {shownDay
          ? <>{dayLabel(shownDay)}{shownDay === todayDay ? ' (today)' : ''}: {countOf(shownDay) ? `${questions(countOf(shownDay))} answered` : 'no questions answered'}</>
          : <span className="text-muted2">Tap a day to see how many questions you answered.</span>}
      </p>

      {/* Dynamic Spectrum Legend, labelled on phones too. */}
      <div className="w-full flex flex-wrap justify-between items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-border2 text-xs text-muted uppercase font-bold tracking-widest">
        <span className="shrink-0 text-textMain">Questions a day</span>
        <div className="flex items-center gap-x-3 gap-y-2 md:gap-x-4 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-surface2 border border-border2"></div> <span className="text-micro">0 Qs</span></div>
            {CALENDAR_LEVELS.map((l, i) => (
              <div key={l.share} className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded border border-border2" style={{ background: levelFill(l.share) }}></div>
                <span className="text-micro">{legend[i]}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
