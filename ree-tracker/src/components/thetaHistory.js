// src/components/thetaHistory.js
//
// The ability chart's points, bucketed by Day / Week / Month. Pure, so the
// labels are testable: the axis read "Day 1 … Day 30" and "Wk 1 … Wk 12",
// which said nothing about when; it shows dates now.

// ISO-8601 week key (e.g. "2026-W26") for an YYYY-MM-DD date string.
function isoWeekKey(dateStr) {
  const d = new Date(dateStr);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const shortDay = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * PERIOD-LATEST buckets: within each week/month the most recent θ reached
 * (history arrives sorted ascending, so the last write per bucket wins).
 * Day = the raw daily points. At most 30 days or 12 weeks/months.
 * @returns {Array<{ name: string, date: string, theta: number }>}
 *   `name` is the axis label, `date` the tooltip's.
 */
export function bucketThetaHistory(history, range) {
  if (range === 'week' || range === 'month') {
    const keyOf = (dateStr) => {
      if (range === 'month') {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return isoWeekKey(dateStr);
    };
    const map = new Map();
    for (const h of history) map.set(keyOf(h.date), h); // ascending → latest wins
    return [...map.values()].slice(-12).map((h) => {
      const dt = new Date(h.date);
      return range === 'month'
        ? { name: dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), date: dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), theta: h.theta }
        : { name: shortDay(dt), date: `Week of ${shortDay(dt)}`, theta: h.theta };
    });
  }
  return history.slice(-30).map((h) => {
    const dt = new Date(h.date);
    return { name: shortDay(dt), date: shortDay(dt), theta: h.theta };
  });
}
