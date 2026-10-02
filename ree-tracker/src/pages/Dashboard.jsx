// src/pages/Dashboard.jsx
import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelemetrySlice, useTOSSlice } from '../store/slices';
import { useAuth } from '../contexts/AuthContext';
import MissionControl from '../components/MissionControl';
import ConfidenceMatrix from '../components/ConfidenceMatrix';
import HeatmapChart from '../components/HeatmapChart';
import { SkeletonChart } from '../components/SkeletonLoaders';
// Recharts (~400KB) only powers these two cards — lazy-load them so the
// `charts` chunk leaves the home route's critical path and loads after paint.
const ThetaVelocityChart = lazy(() => import('../components/ThetaVelocityChart'));
const MockBoardAnalytics = lazy(() => import('../components/MockBoardAnalytics'));
import { generateBoardReadinessReport } from '../services/geminiApi';

import { fetchReadinessScore } from '../services/dbQueries';
import { syncDashboardStats, mergeServerIntoStats, renormalizeDashboardStats } from '../services/analyticsSync';
import toast from 'react-hot-toast';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { TrajectoryCard } from '../features/analytics/TrajectoryCard';
import { PrescriptionPanel } from '../features/analytics/PrescriptionPanel';
import TodayPanel from '../features/today/TodayPanel';
import { drillPreset, dueReviewPreset } from '../features/active-recall/presets';
import PageHeader from '../components/PageHeader';
import { WEAK_TOPIC_ACCURACY } from '@ree/shared';
import { Panel, KpiTile, StatusPill, Button, Badge, Modal, SegmentedControl } from '../components/ui';
import {
  Gauge, ListChecks, Timer, Flame, AudioWaveform,
  Sparkles, CalendarDays, ShieldAlert,
} from '../components/ui/icons';

const SYNC_META = {
  synced: { tone: 'success', label: 'Online' },
  syncing: { tone: 'signal', label: 'Syncing…' },
  offline_queued: { tone: 'amber', label: 'Queued' },
  error: { tone: 'danger', label: 'Sync error' },
};

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { stats, purgeAnalytics, syncStatus } = useTelemetrySlice();
  const { dynamicTOS } = useTOSSlice();

  // One targeted drill launcher, shared by the prescription panel and the
  // heatmap tiles (presets live in features/active-recall/presets).
  const launchDrill = (target = {}) => navigate('/review', { state: { preset: drillPreset(target) } });

  // Prescription routing. v2 actions name their topic AND subject; READ /
  // FORMULA_CARDS go to the materials hub, the rest start a review session.
  const handlePrescriptionAction = (action) => {
    const topic = action?.payload?.topic;
    if (action?.type === 'READ') {
      toast(`Open your ${topic || 'weak-topic'} materials and read for ${action?.payload?.durationMin || 25} minutes.`, { icon: '📚' });
      navigate('/materials');
      return;
    }
    if (action?.type === 'FORMULA_CARDS') {
      // Straight to that topic's formula cards in the reference vault.
      navigate('/materials', { state: { tab: 'reference', search: topic || '', kind: 'formula' } });
      return;
    }
    if (action?.type === 'DRILL' || action?.type === 'BLIND_SPOT') {
      launchDrill({
        topicId: action?.payload?.topicId, topic, subject: action?.payload?.subject,
        mode: action?.type === 'BLIND_SPOT' ? 'blind-spot' : undefined, count: action?.payload?.count,
      });
      return;
    }
    if (action?.type === 'SRS_DUE') {
      navigate('/review', { state: { preset: dueReviewPreset(action?.payload?.count || 20) } });
      return;
    }

    // v1 snapshot types (SRS_REVIEW) name only a topic — resolve its subject
    // through the TOS and start a library session on it.
    const safeTOS = dynamicTOS || {};
    const isSubject = topic && Object.prototype.hasOwnProperty.call(safeTOS, topic);
    const parentSubject = action?.payload?.subject || (isSubject
      ? topic
      : Object.keys(safeTOS).find((subj) => (safeTOS[subj] || []).some(
          (sub) => sub.trim().toLowerCase() === String(topic || '').trim().toLowerCase(),
        )));

    const preset = {
      sessionMode: action?.type === 'SRS_REVIEW' ? 'flashcard' : 'mcq',
      cognitiveFocus: 'mixed',
      source: 'library',
      count: action?.payload?.count || action?.payload?.cardCount || 10,
      ...(parentSubject && !isSubject
        ? { studyMode: 'subtopic', subject: parentSubject, subtopic: topic }
        : { studyMode: 'interleaved', subject: isSubject ? topic : 'All', subtopic: 'All' }),
    };

    toast(`Starting a ${preset.count}-item ${preset.sessionMode === 'flashcard' ? 'flashcard' : 'drill'} session${topic ? ` on ${topic}` : ''}.`, { icon: '🎯' });
    navigate('/review', { state: { preset } });
  };

  const [sqlData, setSqlData] = useState(null);
  const [isFetchingSQL, setIsFetchingSQL] = useState(true);
  // syncTick increments whenever the store transitions from syncing -> synced,
  // which triggers the dashboard to refetch the authoritative aggregates.
  const [syncTick, setSyncTick] = useState(0);
  const prevSyncStatusRef = React.useRef(syncStatus);
  useEffect(() => {
    if (prevSyncStatusRef.current === 'syncing' && syncStatus === 'synced') {
      setSyncTick((n) => n + 1);
    }
    prevSyncStatusRef.current = syncStatus;
  }, [syncStatus]);

  const [aiReport, setAiReport] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [velocityRange, setVelocityRange] = useState('day'); // 'day' | 'week' | 'month'
  // Composite readiness from /api/readiness (coverage + accuracy + θ +
  // consistency + blind spots) — a truer "am I ready" number than the old
  // pure-θ formula, and a DIFFERENT metric from the θ trajectory chart. Shown
  // in the Today panel; until it arrives that block shows a skeleton rather
  // than the (θ+3)/6 stand-in it used to flash.
  const [readiness, setReadiness] = useState(null);

  useEffect(() => {
    const fetchSQLAnalytics = async () => {
      if (!currentUser?.uid) return;
      try {
        // One shared sync (services/analyticsSync): fetches, normalizes
        // microTopics, reconciles with the optimistic local stats, and
        // HYDRATES the store — so Profile (Consistency Matrix, milestones,
        // Credentials) reads the same reconciled numbers this page shows.
        const normalized = await syncDashboardStats(currentUser.uid);
        if (normalized) setSqlData(normalized);
      } catch (error) {
        // SQL sync failed silently — dashboard will show cached data
      } finally {
        setIsFetchingSQL(false);
      }
    };

    fetchSQLAnalytics();
    // Composite readiness is computed per-request on the backend — refetch on
    // the same triggers so it is always as fresh as the rest.
    fetchReadinessScore().then((r) => { if (r) setReadiness(r); }).catch(() => {});
    // Keyed on the UID, not the `currentUser` OBJECT, and deliberately NOT on
    // dynamicTOS. Firebase hands back a new user object on token refresh, and
    // AuthContext's TOS request always resolves after this first fetch — so
    // with either in the deps this effect re-ran and re-fetched. A mobile
    // trace measured the cost: /analytics/dashboard three times and
    // /api/readiness twice on a single load. A TOS change needs re-bucketing,
    // not re-fetching; the effect below does that with no network.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, syncTick]);

  // TOS arrived (or changed) — re-bucket the payload we already have.
  useEffect(() => {
    const normalized = renormalizeDashboardStats();
    if (normalized) setSqlData(normalized);
  }, [dynamicTOS]);

  // Merge logic lives in services/analyticsSync (shared with Profile). The
  // store is already hydrated with the merged result at fetch time; re-merging
  // here keeps fresh optimistic answers (recorded after the fetch) on top.
  const activeStats = useMemo(() => mergeServerIntoStats(stats, sqlData), [stats, sqlData]);

  const currentTheta = activeStats?.irt?.theta || 0;

  // KPI strip values, derived from the same microTopics aggregate the heatmap uses.
  const kpi = useMemo(() => {
    const mt = activeStats?.microTopics || {};
    let attempts = 0, correct = 0, timeMs = 0;
    Object.values(mt).forEach((t) => {
      attempts += t.attempts || 0;
      correct += t.correct || 0;
      timeMs += t.totalTime || 0;
    });
    return {
      // Canonical count — server-authoritative `totalAnswered` (reconciled in
      // analyticsSync so it equals Σ of the Consistency-Matrix days). No longer
      // max()'d against Σ microTopics, whose shape varies by hydration path.
      answered: activeStats?.totalAnswered || 0,
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
      avgSec: attempts > 0 ? timeMs / attempts / 1000 : 0,
      streak: activeStats?.globalStreak || 0,
    };
  }, [activeStats]);

  const handleGenerateAIReport = async () => {
    setShowAiModal(false);
    setIsGeneratingAI(true);

    const topics = activeStats.microTopics ? Object.entries(activeStats.microTopics) : [];
    const weakTopics = topics
      .filter(([, data]) => data.attempts > 0 && data.correct / data.attempts < WEAK_TOPIC_ACCURACY)
      .map(([name]) => name);

    try {
      const report = await generateBoardReadinessReport(activeStats, readiness?.score ?? null, weakTopics);
      setAiReport(report);
    } catch (error) {
      toast.error('Could not generate the report right now. Please try again later.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const executePurge = async () => {
    setIsPurging(true);
    const toastId = toast.loading('Purging analytics…');
    try {
      await purgeAnalytics();
      setShowPurgeModal(false);
      toast.success('Analytics wiped.', { id: toastId });
    } catch (error) {
      toast.error('Purge failed. Please try again.', { id: toastId });
    } finally {
      setIsPurging(false);
    }
  };

  if (!activeStats || isFetchingSQL) return <DashboardSkeleton />;

  const sync = SYNC_META[syncStatus] || SYNC_META.synced;

  const examChip = activeStats.examDate
    ? (() => {
        const daysLeft = Math.ceil((new Date(activeStats.examDate) - new Date()) / 86400000);
        const isPast = daysLeft < 0;
        const tone = isPast ? 'danger' : daysLeft <= 14 ? 'amber' : 'success';
        const label = isPast
          ? `${Math.abs(daysLeft)}d ago`
          : daysLeft === 0
          ? 'Exam today'
          : `${daysLeft}d to exam`;
        return (
          <StatusPill tone={tone} dot={false}>
            <CalendarDays size={13} strokeWidth={2} /> {label}
          </StatusPill>
        );
      })()
    : null;

  // Order, top to bottom, follows the questions a reviewer asks: where do I
  // stand and what do I do now (Today) → how am I trending (KPIs, ability
  // trajectory, board forecast) → where exactly am I weak (mastery heatmap,
  // confidence) → what's the plan (prescription, daily targets) → how did my
  // mocks go (ledger).
  return (
    <div className="flex flex-col gap-6 page-fade-in w-full">
      <PageHeader
        title="Readiness overview"
        subtitle={`Welcome back, ${currentUser?.displayName || 'Reviewer'} — here's your board-exam trajectory.`}
        meta={
          <>
            {examChip}
            <span role="status" aria-live="polite">
              <StatusPill tone={sync.tone}>{sync.label}</StatusPill>
            </span>
          </>
        }
        actions={
          <Button variant="secondary" size="sm" onClick={() => setShowAiModal(true)} loading={isGeneratingAI}>
            {!isGeneratingAI && <Sparkles size={15} strokeWidth={2} aria-hidden="true" />}
            {isGeneratingAI ? 'Analyzing…' : 'AI board report'}
          </Button>
        }
      />

      <TodayPanel stats={activeStats} readiness={readiness} uid={currentUser?.uid} answered={kpi.answered} />

      {/* KPI strip. The readiness index moved into Today, beside its breakdown. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 stagger-fade-in">
        <KpiTile icon={Gauge} tone="success" label="Global accuracy" value={kpi.accuracy} suffix="%" />
        <KpiTile icon={ListChecks} tone="signal" label="Questions answered" value={kpi.answered} />
        <KpiTile icon={Timer} tone="signal" label="Avg time / question" value={kpi.avgSec} precision={1} suffix="s" />
        {/* A live streak is the app's main motivational hook, so its icon chip
            pulses — only while it's running, and on a child element so it does
            not fight .stagger-fade-in for the `animation` property. */}
        <KpiTile icon={Flame} tone="amber" label="Day streak" value={kpi.streak} hint="days" iconGlow={kpi.streak > 0} />
      </div>

      {/* Trend: θ trajectory + the PRC-rule board forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Panel
          icon={AudioWaveform}
          eyebrow="Ability signal"
          title="Ability trajectory (θ)"
          className="lg:col-span-2 grain-overlay"
          bodyClassName="h-[260px] sm:h-[300px]"
          action={
            <div className="flex items-center gap-2">
              <Badge tone="velocity" className="hidden sm:inline-flex tabular-nums">θ {Number(currentTheta).toFixed(2)}</Badge>
              <SegmentedControl
                size="sm"
                label="Velocity time range"
                value={velocityRange}
                onChange={setVelocityRange}
                options={[
                  { value: 'day', label: 'Day' },
                  { value: 'week', label: 'Week' },
                  { value: 'month', label: 'Month' },
                ]}
              />
            </div>
          }
        >
          <Suspense fallback={<SkeletonChart />}>
            <ThetaVelocityChart history={activeStats?.thetaHistory} range={velocityRange} />
          </Suspense>
        </Panel>
        <TrajectoryCard />
      </div>

      {/* Mastery: topic heatmap (each tile starts a drill) + confidence matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="min-h-[380px] lg:h-[460px]">
          <HeatmapChart stats={activeStats} onDrillTopic={(topic, subject) => launchDrill({ topic, subject })} />
        </div>
        <ConfidenceMatrix stats={activeStats} />
      </div>

      {/* Plan: the forecast's prescription + daily targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <PrescriptionPanel onAction={handlePrescriptionAction} />
        <MissionControl stats={activeStats} onPurgeRequest={() => setShowPurgeModal(true)} />
      </div>

      {/* Pre-board simulation ledger */}
      <Suspense fallback={<SkeletonChart />}>
        <MockBoardAnalytics />
      </Suspense>

      {/* Dialogs use the shared Modal: Escape, backdrop, portal, scroll lock and
          max-height. They were hand-rolled `fixed` overlays inside a transformed
          ancestor (.page-fade-in), with no dialog semantics and no Escape. */}
      <Modal
        open={showAiModal}
        onClose={() => setShowAiModal(false)}
        title="Generate an AI board report?"
        icon={Sparkles}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowAiModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleGenerateAIReport}>Generate report</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">
          Builds a tailored readiness audit from your heatmaps, blind spots and trajectory. It uses one AI request.
        </p>
      </Modal>

      <Modal
        open={!!aiReport}
        onClose={() => setAiReport('')}
        title="AI board report"
        icon={Sparkles}
        size="lg"
        footer={<Button size="sm" onClick={() => setAiReport('')}>Close</Button>}
      >
        <div className="text-sm text-textMain leading-relaxed whitespace-pre-wrap">{aiReport}</div>
      </Modal>

      <Modal
        open={showPurgeModal}
        onClose={() => { if (!isPurging) setShowPurgeModal(false); }}
        closeOnBackdrop={!isPurging}
        title="Purge all analytics?"
        icon={ShieldAlert}
        tone="danger"
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={isPurging} onClick={() => setShowPurgeModal(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPurging} onClick={executePurge}>Confirm purge</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">
          This permanently deletes your{' '}
          <strong className="text-textMain font-semibold">
            topic heatmaps, IRT θ rating, readiness velocity, confidence matrix, study-time logs, and lifetime history
          </strong>
          . This can&apos;t be undone.
        </p>
      </Modal>
    </div>
  );
}
