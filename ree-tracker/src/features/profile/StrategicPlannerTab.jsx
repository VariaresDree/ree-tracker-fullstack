// src/features/profile/StrategicPlannerTab.jsx
//
// Progress › Study plan: the plan generator, a month calendar, and the task
// list (the plan's tasks and the learner's own, by due date).
//
// A failed load shows an error with Try again; it used to toast and then say
// "No tasks yet", as if there were none. A day on the calendar filters the list
// to that day (the cells looked clickable and did nothing). The inputs have
// labels, and the list grows with its content instead of a fixed 600px box.
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiRequest } from '../../services/dbQueries';
import { Badge, Button, Card, EmptyState, FormField, Input, Skeleton } from '../../components/ui';
import { Check, ChevronLeft, ChevronRight, ListChecks, Plus, TriangleAlert, X } from '../../components/ui/icons';
import { isTaskDone, kindLabel, taskLaunch } from './plannerTasks';
import { launchPractice } from '../active-recall/presets';
import StudyPlanGenerator from '../study-plan/StudyPlanGenerator';
import { todayManila } from '../../utils/manilaDate';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
// Row tints for overdue and due-today tasks (fills and borders only; the text
// says which in a badge).
const ROW_FILL = {
  overdue: { borderColor: 'color-mix(in srgb, var(--accent-danger) 45%, transparent)', background: 'color-mix(in srgb, var(--accent-danger) 5%, var(--bg-surface))' },
  today: { borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)', background: 'color-mix(in srgb, var(--color-reeAmber) 5%, var(--bg-surface))' },
};
const isoDay = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function MonthCalendar({ month, onMonth, tasks, selectedDay, onSelectDay }) {
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

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <Button size="icon" variant="ghost" aria-label="Previous month" onClick={() => onMonth(new Date(year, m - 1, 1))}>
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <h3 className="text-sm font-semibold text-textMain" aria-live="polite">
          {month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </h3>
        <Button size="icon" variant="ghost" aria-label="Next month" onClick={() => onMonth(new Date(year, m + 1, 1))}>
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted mb-1" aria-hidden="true">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: firstDay }, (_, i) => <div key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const iso = isoDay(year, m, d);
          const open = openByDay.get(iso) || 0;
          const isToday = iso === today;
          const selected = iso === selectedDay;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelectDay(selected ? null : iso)}
              aria-pressed={selected}
              aria-label={`${dayLabel(iso)}${isToday ? ', today' : ''}${open ? `, ${open} open ${open === 1 ? 'task' : 'tasks'}` : ''}`}
              className={`relative h-9 pointer-coarse:h-11 rounded-[var(--radius-sm)] text-xs tabular-nums cursor-pointer transition-colors ${
                selected ? 'font-semibold text-white' : isToday ? 'font-semibold text-textMain' : 'text-textMain hover:bg-surface2'
              }`}
              style={selected
                ? { background: 'var(--accent)' }
                : isToday ? { boxShadow: 'inset 0 0 0 1.5px var(--accent)' } : undefined}
            >
              {d}
              {open > 0 && (
                <span aria-hidden="true" className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: selected ? 'currentColor' : 'var(--color-reeAmber)' }} />
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function TaskRow({ task, today, onToggle, onDelete, onStart }) {
  const done = isTaskDone(task);
  const label = kindLabel(task);
  const overdue = !done && task.dueDate && task.dueDate < today;
  const dueToday = !done && task.dueDate === today;
  const rowFill = overdue ? ROW_FILL.overdue : dueToday ? ROW_FILL.today : undefined;

  return (
    <li
      className={`p-3 sm:p-4 rounded-[var(--radius-default)] border flex items-center justify-between gap-3 group ${done ? 'bg-surface2/50 border-border opacity-70' : 'bg-surface border-border'}`}
      style={rowFill}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
          <span className={`text-sm font-medium truncate ${done ? 'line-through text-muted' : 'text-textMain'}`}>{task.text}</span>
          <span className="flex items-center gap-2 flex-wrap text-[11px] text-muted2">
            {label && <span>{label}</span>}
            {task.progress && !done && <span className="tabular-nums">{task.progress.count}/{task.progress.target} today</span>}
            {task.progress?.done && !task.completed && <span style={{ color: 'var(--accent-success)' }}>Done from your answers</span>}
            {overdue && <Badge tone="danger">Overdue</Badge>}
            {dueToday && <Badge tone="amber">Today</Badge>}
            {!done && !overdue && !dueToday && task.dueDate && <span className="tabular-nums">{dayLabel(task.dueDate)}</span>}
          </span>
        </div>
      </div>
      {!done && taskLaunch(task) && (
        <Button size="sm" variant="secondary" onClick={() => onStart(task)}>Start</Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        tone="danger"
        onClick={() => onDelete(task.id)}
        aria-label={`Delete "${task.text}"`}
        className="text-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
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

  const today = todayManila();
  const sortedTasks = [...tasks]
    .filter((t) => !selectedDay || t.dueDate === selectedDay)
    .sort((a, b) => {
      if (isTaskDone(a) !== isTaskDone(b)) return isTaskDone(a) ? 1 : -1;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

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
  } else if (sortedTasks.length === 0) {
    list = selectedDay ? (
      <EmptyState compact icon={ListChecks} title={`Nothing due ${dayLabel(selectedDay)}`} action={<Button variant="secondary" onClick={() => setSelectedDay(null)}>Show every task</Button>} />
    ) : (
      <EmptyState compact icon={ListChecks} title="No tasks yet" description="Generate a plan above, or add your own." />
    );
  } else {
    list = (
      <ul className="flex flex-col gap-2">
        {sortedTasks.map((task) => (
          <TaskRow key={task.id} task={task} today={today} onToggle={toggleTask} onDelete={deleteTask} onStart={launch} />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StudyPlanGenerator onPlanGenerated={reload} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <MonthCalendar month={month} onMonth={setMonth} tasks={tasks} selectedDay={selectedDay} onSelectDay={setSelectedDay} />

        <Card className="lg:col-span-2 p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-textMain">Your tasks</h2>
              <p className="text-sm text-muted2 mt-1">Your plan's tasks and your own, by due date. Overdue tasks are red; today's are amber.</p>
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

          {list}
        </Card>
      </div>
    </div>
  );
}
