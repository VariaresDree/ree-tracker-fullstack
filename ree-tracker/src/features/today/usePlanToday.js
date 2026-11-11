// src/features/today/usePlanToday.js
//
// Today's open study-plan task, if there is one. The planner (Progress → Study
// plan) writes a task per day; until now nothing outside the planner said what
// today's was, so a generated plan was easy to forget.
//
// `task`: undefined while the tasks are loading, so Today can hold its lead
// action until it knows; null when there is no task today, offline, or on a
// failed request (which used to leave it loading for good). `hasPlan`: any
// plan task at all. "Make your study plan" un-ticked itself on a rest day or
// once today's task was done, when it read today's task instead.
import { useEffect, useState } from 'react';
import { fetchPlannerTasks } from '../../services/dbQueries';
import { todayManila } from '../../utils/manilaDate';
import { pickPlanTask } from './todayActions';

export function usePlanToday({ enabled = true } = {}) {
  const [tasks, setTasks] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    fetchPlannerTasks()
      .then((r) => { if (live) setTasks(r?.items || []); })
      // No plan task today; the planner reports its own errors.
      .catch(() => { if (live) setTasks([]); });
    return () => { live = false; };
  }, [enabled]);

  if (!enabled) return { task: null, hasPlan: false };
  if (tasks === null) return { task: undefined, hasPlan: false };
  return { task: pickPlanTask(tasks, todayManila()), hasPlan: tasks.length > 0 };
}
