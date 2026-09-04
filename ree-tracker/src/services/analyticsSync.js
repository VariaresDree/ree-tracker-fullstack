// src/services/analyticsSync.js
// ONE source of truth for "pull the server's dashboard aggregate and reconcile
// it with the local optimistic stats". The Dashboard previously did this
// inline at render time and wrote almost nothing back to the store, so every
// other consumer (Profile's Consistency Matrix, Comparative milestones,
// Credentials readiness) read a never-hydrated local `stats` and silently
// diverged from what the Dashboard displayed. Now the fetch + normalization +
// merge live here, and the merged result is WRITTEN INTO the store — all
// surfaces read the same reconciled numbers.
import { apiRequest } from './dbQueries';
import { useStore } from '../store/useStore';

/**
 * Pure: translate the backend microTopics shape (totalAttempts/correctHits/
 * totalTimeSecs, keyed by topic) into the client shape (attempts/correct/
 * totalTime(ms)), seeding a zeroed entry for every TOS subtopic so heatmap
 * tiles exist even before their first attempt.
 */
export function normalizeMicroTopics(rawMicroTopics = {}, safeTOS = {}) {
  const normalized = {};

  Object.keys(safeTOS).forEach((subject) => {
    (safeTOS[subject] || []).forEach((subtopic) => {
      normalized[subtopic] = {
        subject, subtopic, attempts: 0, correct: 0, totalTime: 0, timedAttempts: 0,
        mastery: null, masteryN: 0,
      };
    });
  });

  Object.keys(rawMicroTopics).forEach((backendKey) => {
    const rawData = rawMicroTopics[backendKey];
    const actualSubtopicName = rawData.subtopic || backendKey.split('_').pop();
    if (actualSubtopicName) {
      normalized[actualSubtopicName] = {
        subject: rawData.subject || 'Unknown',
        subtopic: actualSubtopicName,
        attempts: rawData.totalAttempts || rawData.attempts || 0,
        correct: rawData.correctHits || rawData.correct || 0,
        // ms, matching the local optimistic microTopics shape.
        totalTime: (rawData.totalTimeSecs || 0) * 1000,
        // How many of those attempts had usable timing (rest excluded as corrupt).
        timedAttempts: rawData.timedAttempts || 0,
        // BKT P(mastery) 0..1 (null until first observation) + count.
        mastery: rawData.mastery ?? null,
        masteryN: rawData.masteryN || 0,
      };
    }
  });

  return normalized;
}

/**
 * Pure: reconcile local optimistic stats with a NORMALIZED server payload.
 * Merge rules (unchanged from the Dashboard's historical behavior):
 *  - microTopics: per-topic, local wins only when it has MORE attempts
 *    (a fresh optimistic answer the server hasn't aggregated yet);
 *  - matrix: whichever side has the larger total;
 *  - activityCalendar: server base, local per-day entries overlay (local keys
 *    are only ever today's Manila key, written by the optimistic mirror);
 *  - counters (streak/daily/totals): max of both sides;
 *  - theta/thetaHistory: server is canonical when present.
 *
 * @param {object|null} stats   local store stats (optimistic)
 * @param {object|null} sqlData normalized dashboard payload (microTopics already client-shaped)
 */
export function mergeServerIntoStats(stats, sqlData) {
  if (!stats && !sqlData) return null;
  if (!sqlData) return stats;

  const sqlMicroTopics = sqlData.microTopics || {};
  const mergedMicroTopics = { ...sqlMicroTopics };
  const localMicroTopics = stats?.microTopics || {};
  Object.entries(localMicroTopics).forEach(([topic, local]) => {
    const sql = sqlMicroTopics[topic];
    if (!sql || (local?.attempts || 0) > (sql.attempts || 0)) {
      mergedMicroTopics[topic] = { ...sql, ...local };
    }
  });

  const sqlMatrix = sqlData.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };
  const localMatrix = stats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };
  const sqlTotal = (sqlMatrix.hc || 0) + (sqlMatrix.hw || 0) + (sqlMatrix.lc || 0) + (sqlMatrix.lw || 0);
  const localTotal = (localMatrix.hc || 0) + (localMatrix.hw || 0) + (localMatrix.lc || 0) + (localMatrix.lw || 0);
  const matrix = localTotal > sqlTotal ? localMatrix : sqlMatrix;

  const todayStats = sqlData.dailyStats || sqlData.profile?.dailyStats || {};
  const pickMax = (...vals) => Math.max(...vals.map((v) => Number(v) || 0));

  // Answered-questions tally: server is the single source of truth. The backend
  // returns EVERY day uncapped and increments QuestionAttempt + ActivityLog in
  // lockstep, so server `totalAnswered === Σ(server activityCalendar)`. We overlay
  // only the LOCAL optimistic EXCESS (attempts answered locally but not yet
  // aggregated server-side) uniformly onto BOTH the per-day calendar and the
  // total — so the invariant `totalAnswered === Σ(activityCalendar)` is preserved,
  // and the Dashboard KPI, the Consistency-Matrix total, and the heatmap-day sum
  // can never diverge again.
  const serverCalendar = sqlData.activityCalendar || {};
  const localCalendar = stats?.activityCalendar || {};
  const activityCalendar = { ...serverCalendar };
  let optimisticDelta = 0;
  for (const [day, raw] of Object.entries(localCalendar)) {
    const localCount = Number(raw) || 0;
    const serverCount = Number(serverCalendar[day]) || 0;
    if (localCount > serverCount) {
      activityCalendar[day] = localCount;
      optimisticDelta += localCount - serverCount;
    }
  }
  const totalAnswered = (Number(sqlData.profile?.totalAnswered) || 0) + optimisticDelta;

  return {
    ...stats,
    role: sqlData.profile?.role || stats?.role || 'USER',
    irt: { ...stats?.irt, theta: sqlData.profile?.thetaRating ?? stats?.irt?.theta ?? 0 },
    matrix,
    microTopics: mergedMicroTopics,
    // Server history is canonical whenever we have it — a LONGER stale local
    // array used to win and lag the chart behind the fresh KPI.
    thetaHistory: sqlData.thetaHistory?.length
      ? sqlData.thetaHistory
      : stats?.thetaHistory || [],
    activityCalendar,
    dailyMath: pickMax(todayStats.Math, sqlData.profile?.dailyMath, stats?.dailyMath),
    dailyESAS: pickMax(todayStats.ESAS, sqlData.profile?.dailyESAS, stats?.dailyESAS),
    dailyEE: pickMax(todayStats.EE, sqlData.profile?.dailyEE, stats?.dailyEE),
    globalStreak: pickMax(sqlData.profile?.globalStreak, stats?.globalStreak),
    totalAnswered,
    totalCorrect: pickMax(
      stats?.totalCorrect,
      Object.values(mergedMicroTopics).reduce((s, t) => s + (t.correct || 0), 0),
    ),
    examDate: stats?.examDate || sqlData.profile?.examDate || null,
    dailyTarget: stats?.dailyTarget || sqlData.profile?.dailyTarget || 50,
    cloudTimestamp: Date.now(),
  };
}

/**
 * Fetch the dashboard aggregate, reconcile, and HYDRATE the store — then
 * return the normalized payload (or null when the server has nothing).
 * Callers: Dashboard mount/sync-tick, Profile mount, "Restore from cloud".
 */
// Last raw server payload, kept so a later TOS change can be re-applied
// WITHOUT another round-trip. Dashboard used to list `dynamicTOS` in its fetch
// effect's deps, so when AuthContext's TOS request resolved — always after the
// first dashboard fetch — the whole effect re-ran and re-fetched the aggregate
// and the readiness score. A mobile trace caught it: the dashboard endpoint hit
// three times and /api/readiness twice on one load. The TOS only affects how
// microTopics are BUCKETED for display; it is not new server data, so the fix
// is to re-normalize what we already have.
let lastRawDashboard = null;

/** Normalize a raw dashboard payload against the current TOS and hydrate. */
function hydrateFromRaw(raw) {
  const { dynamicTOS, stats, setStats } = useStore.getState();
  const normalized = {
    ...raw,
    microTopics: normalizeMicroTopics(raw.microTopics || {}, dynamicTOS || {}),
  };
  setStats(mergeServerIntoStats(stats || {}, normalized));
  return normalized;
}

export async function syncDashboardStats(uid) {
  if (!uid) return null;
  const json = await apiRequest(`/api/analytics/dashboard/${uid}`);
  if (!json?.data) return null;
  lastRawDashboard = json.data;
  return hydrateFromRaw(json.data);
}

/**
 * Re-bucket the LAST fetched payload against the current TOS and re-hydrate.
 * No network. Returns null before the first successful fetch, so callers can
 * simply skip. This is what a TOS change should trigger — not a refetch.
 */
export function renormalizeDashboardStats() {
  return lastRawDashboard ? hydrateFromRaw(lastRawDashboard) : null;
}

/** Test seam: forget the cached payload between cases. */
export function __resetDashboardCache() {
  lastRawDashboard = null;
}
