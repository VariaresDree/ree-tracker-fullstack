import { useEffect, useState } from 'react';
import { fetchCardReviewSummary } from '../services/dbQueries';

// How many formula cards are due for spaced review, for Today's next actions.
// Undefined while the request is out; null when offline or when the request
// fails (the action is simply not shown).
export function useCardReviewSummary({ enabled = true } = {}) {
  const [summary, setSummary] = useState(undefined);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    fetchCardReviewSummary()
      .then((data) => { if (live) setSummary(data || null); })
      .catch(() => { if (live) setSummary(null); });
    return () => { live = false; };
  }, [enabled]);
  return enabled ? summary : null;
}
