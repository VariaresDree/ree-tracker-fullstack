// How each kind of key date is named and drawn, and how a date reads.
import { BookOpen, ClipboardList, Flag, GraduationCap, Pause, CalendarDays } from '../../components/ui/icons';

export const KIND_LABEL = {
  preboard: 'Preboard',
  coaching: 'Coaching',
  deadline: 'Deadline',
  rest: 'Rest day',
  personal: 'Personal',
  lecture: 'Lecture',
};

export const KIND_ICON = {
  preboard: ClipboardList,
  coaching: GraduationCap,
  deadline: Flag,
  rest: Pause,
  personal: CalendarDays,
  lecture: BookOpen,
};

// What the plan does with each kind, said once in the form.
export const KIND_HINT = {
  preboard: 'No drill that day, and it counts as that week’s timed sitting. Today reminds you to log your score.',
  coaching: 'A light review instead of a drill.',
  deadline: 'Shown on your calendar and Today; the plan carries on.',
  rest: 'No task that day.',
  personal: 'Shown on your calendar and Today; the plan carries on.',
  lecture: 'The plan drills the topic the day after, and holds off on a topic you’ve barely practised until it’s been taught.',
};

export const KIND_TITLE_HINT = {
  preboard: 'e.g. RC Preboard 2',
  coaching: 'e.g. Final coaching',
  deadline: 'e.g. PRC application deadline',
  rest: 'e.g. Family day',
  personal: 'e.g. My birthday',
  lecture: 'e.g. Lecture: Transformers',
};

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const fmt = (ymd, opts) => new Date(`${ymd}T00:00:00+08:00`).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', ...opts });

/** "Sat, Nov 7", or "Nov 7 – Nov 9" for a span. */
export function dateRange(entry) {
  if (!entry?.endsOn || entry.endsOn === entry.startsOn) return fmt(entry.startsOn, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${fmt(entry.startsOn, { month: 'short', day: 'numeric' })} – ${fmt(entry.endsOn, { month: 'short', day: 'numeric' })}`;
}

/** "today", "tomorrow", "in 5 days". */
export function inDaysLabel(n) {
  if (n <= 0) return 'today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}

/** A calendar day's YYYY-MM-DD from its year, 0-based month and day. */
export const isoDay = (year, month, day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/** "Sat, Nov 7", for a calendar day's name. */
export const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
