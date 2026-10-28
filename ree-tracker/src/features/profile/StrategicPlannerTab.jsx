// src/features/profile/StrategicPlannerTab.jsx
//
// Progress › Study plan: the plan generator, a month calendar, and the task
// list (the plan's tasks and the learner's own, by due date).
//
// A failed load shows an error with Try again; it used to toast and then say
// "No tasks yet", as if there were none. A day on the calendar filters the list
// to that day (the cells looked clickable and did nothing). The inputs have
// labels, and the list grows with its content instead of a fixed 600px box.
//
// The list is grouped the way it's read: Overdue, Today, Next 7 days and No
// due date, with Later and Done folded behind a "Show" button. On a wide page
// the calendar sits beside the plan, the two one height, and the list runs
// the full width below them; it sat beside the list, which a six-week plan
// stretched far past it.
//
// Key dates and rest days (CELE round, 2026-10) sit between the two: the
// calendar marks them, a picked day lists its key dates, and a change offers
// to re-plan, since the plan already made doesn't follow on its own.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiRequest } from '../../services/dbQueries';
import { Button, Card, CardTitle, EmptyState, FormField, Grid, Input, Skeleton } from '../../components/ui';
import { Check, ChevronDown, ListChecks, Plus, TriangleAlert, X } from '../../components/ui/icons';
import { groupTasks, isTaskDone, kindLabel, taskLaunch } from './plannerTasks';
import { launchPractice } from '../active-recall/presets';
import StudyPlanGenerator from '../study-plan/StudyPlanGenerator';
import PlanCalendar from '../study-plan/PlanCalendar';
import KeyDatesCard from '../study-plan/KeyDatesCard';
import { usePlanCalendar } from '../study-plan/usePlanCalendar';
import { KIND_LABEL, dayLabel } from '../study-plan/keyDateLabels';
import { todayManila } from '../../utils/manilaDate';

// Row tints for overdue and due-today tasks (fills and borders only; the
// section heading says which).
const ROW_FILL = {
  overdue: { borderColor: 'color-mix(in srgb, var(--accent-danger) 45%, transparent)', background: 'color-mix(in srgb, var(--accent-danger) 5%, var(--bg-surface))' },
  today: { borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)', background: 'color-mix(in srgb, var(--color-reeAmber) 5%, var(--bg-surface))' },
};
// The list's sections, in reading order. `folded` ones open on "Show".
const SECTIONS = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Today' },
  { key: 'week', title: 'Next 7 days' },
  { key: 'undated', title: 'No due date' },
  { key: 'later', title: 'Later', folded: true },
  { key: 'done', title: 'Done', folded: true },
];

function TaskRow({ task, today, onToggle, onDelete, onStart }) {
  const done = isTaskDone(task);
  const label = kindLabel(task);
  const overdue = !done && task.dueDate && task.dueDate < today;
  const dueToday = !done && task.dueDate === today;
  const rowFill = overdue ? ROW_FILL.overdue : dueToday ? ROW_FILL.today : undefined;

  return (
    // A grid by the list's width: on a narrow list (a phone) Start sits under
    // the task's name, so the name wraps whole instead of being squeezed to
    // two clipped lines between the tick box, Start and delete.
    <li
      data-task-row
      className={`p-3 rounded-[var(--radius-default)] border grid grid-cols-[auto_minmax(0,1fr)_auto] @lg:grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2 group ${done ? 'bg-surface2/50 border-border opacity-70' : 'bg-surface border-border'}`}
      style={rowFill}
    >
        <button
          type="button"
          onClick={() => onToggle(task)}
          aria-label={done ? `Mark "${task.text}" not done` : `Mark "${task.text}" done`}
          aria-pressed={done}
          className="w-6 h-6 pointer-coarse:w-11 pointer-coarse:h-11 shrink-0 rounded-[var(--radius-sm)] flex items-center justify-center border transition-colors cursor-pointer"
          style={done
            ? { background: 'var(--accent-success)', borderColor: 'var(--accent-success)', color: 'var(--bg-primary)' }
            : { background: 'var(--bg-primary)', borderColor: 'var(--border-light)', color: 'transparent' }}
        >
          <Check size={14} strokeWidth={3} aria-hidden="true" />
        </button>
        <div className="flex flex-col min-w-0">
          <span className={`text-sm font-medium [overflow-wrap:anywhere] ${done ? 'line-through text-muted' : 'text-textMain'}`}>{task.text}</span>
          <span className="flex items-center gap-x-2 flex-wrap text-micro text-muted2">
            {label && <span>{label}</span>}
            {/* The day's count belongs to today's task only: a drill due
                Thursday read "0/50 today" all week. */}
            {task.progress && !done && dueToday && <span className="tabular-nums">{task.progress.count}/{task.progress.target} today</span>}
            {task.progress?.done && !task.completed && <span style={{ color: 'var(--accent-success)' }}>Done from your answers</span>}
            {!dueToday && task.dueDate && <span className="tabular-nums">{dayLabel(task.dueDate)}</span>}
          </span>
        </div>
      {!done && taskLaunch(task) && (
        <Button size="sm" variant="secondary" className="col-start-2 row-start-2 justify-self-start @lg:col-start-3 @lg:row-start-1" onClick={() => onStart(task)}>Start</Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        tone="danger"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete "${task.text}"`}
        className="col-start-3 row-start-1 @lg:col-start-4 text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
      >
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </li>
  );
}

export default function StrategicPlannerTab({ currentUser }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  // Folded sections the learner opened ('later', 'done').
  const [opened, setOpened] = useState(() => new Set());
  const calendar = usePlanCalendar();
  // Key dates or rest days changed since the plan was made (this visit).
  const [calendarChanged, setCalendarChanged] = useState(false);

  const launch = (task) => {
    const target = taskLaunch(task);
    if (!target) return;
    if (target.to) navigate(target.to);
    else launchPractice(navigate, target.preset);
  };

  // Bumped to load again (Try again, or after the plan changes).
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!currentUser) return undefined;
    let live = true;
    apiRequest('/api/user/tasks')
      .then((data) => { if (live) { setTasks(data?.items || []); setLoadError(false); } })
      .catch(() => { if (live) setLoadError(true); })
      .finally(() => { if (live) setIsLoading(false); });
    return () => { live = false; };
  }, [currentUser, attempt]);

  const reload = () => setAttempt((n) => n + 1);
  const planGenerated = () => { setCalendarChanged(false); reload(); };
  const retry = () => { setIsLoading(true); reload(); };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim() || adding) return;
    setAdding(true);
    try {
      const data = await apiRequest('/api/user/tasks', 'POST', { text: newTask.trim(), dueDate: newDueDate || null });
      if (data?.task) setTasks((prev) => [data.task, ...prev]);
      setNewTask('');
      setNewDueDate('');
    } catch {
      toast.error("Couldn't add the task. Try again.");
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (task) => {
    const updated = !task.completed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: updated } : t)));
    try {
      await apiRequest(`/api/user/tasks/${task.id}`, 'PUT', { completed: updated });
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !updated } : t)));
      toast.error("Couldn't update the task.");
    }
  };

  const deleteTask = async (id) => {
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== id));
    try {
      await apiRequest(`/api/user/tasks/${id}`, 'DELETE');
    } catch {
      setTasks(prev);
      toast.error("Couldn't delete the task.");
    }
  };

  const toggleSection = (key) => setOpened((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const today = todayManila();
  const groups = groupTasks(tasks, today);
  const row = (task) => <TaskRow key={task.id} task={task} today={today} onToggle={toggleTask} onDelete={deleteTask} onStart={launch} />;

  let list;
  if (isLoading) {
    list = (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">Loading your tasks…</span>
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-[var(--radius-default)]" />)}
      </div>
    );
  } else if (loadError) {
    list = (
      <EmptyState
        compact
        icon={TriangleAlert}
        title="Couldn't load your tasks"
        description="Check your connection and try again."
        action={<Button onClick={retry}>Try again</Button>}
      />
    );
  } else if (selectedDay) {
    // One day picked on the calendar: its tasks, open first.
    const dayTasks = tasks.filter((t) => t.dueDate === selectedDay).sort((a, b) => isTaskDone(a) - isTaskDone(b));
    const dayDates = (calendar.items || []).filter((e) => e.startsOn <= selectedDay && (e.endsOn || e.startsOn) >= selectedDay);
    list = (
      <div className="flex flex-col gap-3">
        {dayDates.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label={`Key dates on ${dayLabel(selectedDay)}`}>
            {dayDates.map((e) => (
              <li key={e.id} className="text-sm text-textMain"><span className="text-eyebrow mr-2">{KIND_LABEL[e.kind]}</span>{e.title}</li>
            ))}
          </ul>
        )}
        {dayTasks.length === 0 ? (
          <EmptyState compact icon={ListChecks} title={`Nothing due ${dayLabel(selectedDay)}`} action={<Button variant="secondary" onClick={() => setSelectedDay(null)}>Show every task</Button>} />
        ) : (
          <ul className="flex flex-col gap-2">{dayTasks.map(row)}</ul>
        )}
      </div>
    );
  } else if (tasks.length === 0) {
    list = <EmptyState compact icon={ListChecks} title="No tasks yet" description="Generate a plan above, or add your own." />;
  } else {
    list = (
      <div className="flex flex-col gap-5">
        {SECTIONS.filter((s) => groups[s.key].length > 0).map(({ key, title, folded }) => {
          const items = groups[key];
          const open = !folded || opened.has(key);
          return (
            <section key={key} aria-labelledby={`plan-${key}`} className="flex flex-col gap-2">
              <h3 id={`plan-${key}`} className={`text-eyebrow flex items-center gap-2 ${key === 'overdue' ? 'text-reeRed-text' : ''}`}>
                {title} <span className="tabular-nums">· {items.length}</span>
              </h3>
              {open && <ul className="flex flex-col gap-2">{items.map(row)}</ul>}
              {folded && (
                <Button variant="ghost" size="sm" fullWidth aria-expanded={open} onClick={() => toggleSection(key)}>
                  {open ? `Hide ${title.toLowerCase()} tasks` : `Show ${items.length} ${title.toLowerCase()} ${items.length === 1 ? 'task' : 'tasks'}`}
                  <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" className={`transition-[rotate] duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                </Button>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* The setup row: the plan and the calendar side by side, one height,
          on a wide page; stacked on a phone. The task list runs the full
          width below, so a long list no longer leaves a short calendar
          stranded beside it. */}
      <Grid kind="split" data-plan-setup>
        <StudyPlanGenerator onPlanGenerated={planGenerated} calendarChanged={calendarChanged} className="@4xl:col-span-2" />
        <PlanCalendar
          month={month}
          onMonth={setMonth}
          tasks={tasks}
          keyDates={calendar.items}
          restWeekdays={calendar.prefs.restWeekdays}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          counts={{ overdue: groups.overdue.length, today: groups.today.length, week: groups.week.length }}
        />
      </Grid>

      <KeyDatesCard calendar={calendar} onChanged={() => setCalendarChanged(true)} />

      <Card padding="md" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle size="lg">Your tasks</CardTitle>
            <p className="text-sm text-muted2 mt-1">Your plan's tasks and your own. Start one, or tick it off when it's done.</p>
          </div>
          {selectedDay && (
            <Button size="sm" variant="secondary" onClick={() => setSelectedDay(null)}>
              {dayLabel(selectedDay)} <X size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">— show every task</span>
            </Button>
          )}
        </div>

        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row sm:items-end gap-3">
          <FormField label="New task" className="flex-1">
            <Input type="text" value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="e.g. Redo the transformer problems" maxLength={200} />
          </FormField>
          <FormField label="Due (optional)">
            <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
          </FormField>
          <Button type="submit" disabled={!newTask.trim()} loading={adding}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" /> Add
          </Button>
        </form>

        {/* The rows lay out by the list's own width. */}
        <div className="@container">{list}</div>
      </Card>
    </div>
  );
}
