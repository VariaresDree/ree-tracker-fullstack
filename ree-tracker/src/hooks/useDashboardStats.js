// src/hooks/useDashboardStats.js
//
// The reconciled stats Today and Progress both read: the server's dashboard
// aggregate merged with this device's optimistic answers, plus KPIs derived
// from it. Lifted out of the old Dashboard page so Progress can show the same
// numbers without a second copy of the sync logic.
//
// The payload lives in services/analyticsSync, not in component state. This
// hook subscribes to it, so a refresh from any caller re-renders the page —
// including the app-wide sync lifecycle's refetch after an offline batch
// lands, which Dashboard used to duplicate with a refetch of its own.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { effectiveStreak } from '@ree/shared';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { useManilaDay } from './useManilaDay';
import { fetchReadinessScore } from '../services/dbQueries';
import {
  cachedDashboardStats, lastStudyDay, mergeServerIntoStats, renormalizeDashboardStats,
  subscribeDashboardStats, syncDashboardStats,
} from '../services/analyticsSync';

/** KPI values, from the same microTopics aggregate the heatmap uses. */
export function deriveKpi(stats, today) {
  const mt = stats?.microTopics || {};
  let attempts = 0, correct = 0, timeMs = 0;
  Object.values(mt).forEach((t) => {
    attempts += t.attempts || 0;
    correct += t.correct || 0;
    timeMs += t.totalTime || 0;
  });
  return {
    // Canonical count: the server's `totalAnswered`, reconciled in
    // analyticsSync so it equals the sum of the study-calendar days.
    answered: stats?.totalAnswered || 0,
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    avgSec: attempts > 0 ? timeMs / attempts / 1000 : 0,
    // As it stands today. The stored value is only rewritten by an answer, so
    // stats saved on this device (offline, or open past midnight) can still
    // hold a run that broke days ago; once a whole Manila day passes
    // unanswered it reads 0.
    streak: effectiveStreak(stats?.globalStreak, lastStudyDay(stats, today), today),
  };
}

/**
 * @param {{ withReadiness?: boolean }} [options] Today shows the composite
 *   readiness index (/api/readiness); Progress doesn't, so it skips the call.
 * @returns {{ activeStats: object|null, readiness: object|null, loading: boolean, kpi: object, today: string }}
 *   `today` is the Manila date the numbers were judged on; it changes at
 *   midnight, which re-merges, re-derives and refetches.
 */
export function useDashboardStats({ withReadiness = false } = {}) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  // Three narrow subscriptions. The telemetry slice also carried the sync
  // queue and the session fields, so Today and Progress re-rendered on every
  // answer queued anywhere in the app.
  const stats = useStore((s) => s.stats);
  const syncStatus = useStore((s) => s.syncStatus);
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const today = useManilaDay();

  const sqlData = useSyncExternalStore(subscribeDashboardStats, () => cachedDashboardStats(uid, dynamicTOS));
  // True once this mount's fetch has finished, whether or not it succeeded:
  // offline, the page falls back to the stats saved on this device.
  const [settled, setSettled] = useState(false);
  // Composite readiness (coverage + accuracy + θ + consistency + blind spots).
  // Until it arrives Today shows a skeleton, never a stand-in number.
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    let live = true;
    syncDashboardStats(uid)
      .catch(() => null)
      .finally(() => { if (live) setSettled(true); });
    if (withReadiness) {
      fetchReadinessScore().then((r) => { if (live && r) setReadiness(r); }).catch(() => {});
    }
    // Keyed on the UID, not the `currentUser` object (Firebase hands back a new
    // one on token refresh), and not on dynamicTOS: a TOS change needs
    // re-bucketing, not a refetch. The effect below does that. A new Manila
    // day does refetch: yesterday's payload holds yesterday's daily counts.
    return () => { live = false; };
  }, [uid, withReadiness, today]);

  // The TOS arrived or changed: re-bucket the payload already fetched, so the
  // store (which other pages read) gets every topic's tile. No network.
  useEffect(() => {
    renormalizeDashboardStats(uid);
  }, [uid, dynamicTOS]);

  // Readiness is computed per request on the server, so refresh it when
  // answers finish syncing. The aggregate itself is refreshed app-wide
  // (useSyncLifecycle) and reaches this hook through the subscription.
  const prevSyncRef = useRef(syncStatus);
  useEffect(() => {
    const justSynced = prevSyncRef.current === 'syncing' && syncStatus === 'synced';
    prevSyncRef.current = syncStatus;
    if (!justSynced || !withReadiness) return undefined;
    let live = true;
    fetchReadinessScore().then((r) => { if (live && r) setReadiness(r); }).catch(() => {});
    return () => { live = false; };
  }, [syncStatus, withReadiness]);

  // The store already holds the merged result; merging again at render keeps
  // answers recorded after the fetch on top (the answered total is the server
  // count plus this device's not-yet-synced excess).
  const activeStats = useMemo(() => mergeServerIntoStats(stats, sqlData, today), [stats, sqlData, today]);
  const kpi = useMemo(() => deriveKpi(activeStats, today), [activeStats, today]);

  return {
    activeStats,
    readiness,
    loading: !activeStats || (!sqlData && !settled),
    kpi,
    today,
  };
}
