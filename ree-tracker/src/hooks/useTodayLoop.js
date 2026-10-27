import { useEffect, useState } from 'react';
import { fetchTodayLoop } from '../services/dbQueries';

// Today's loop (due reviews and open mistakes as one session), for Today's
// next actions. Undefined while the request is out, so Today can hold its
// lead action until it knows; null when there is none, when offline, or when
// the request fails (the action is simply not shown, and the due-review
// action stands in).
export function useTodayLoop({ enabled = true } = {}) {
  const [loop, setLoop] = useState(undefined);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    fetchTodayLoop()
      .then((data) => { if (live) setLoop(data || null); })
      .catch(() => { if (live) setLoop(null); });
    return () => { live = false; };
  }, [enabled]);
  return enabled ? loop : null;
}
