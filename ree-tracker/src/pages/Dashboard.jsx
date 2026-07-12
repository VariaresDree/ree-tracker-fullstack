// src/pages/Dashboard.jsx
import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTelemetrySlice, useTOSSlice } from '../store/slices';
import { useAuth } from '../contexts/AuthContext';
import MissionControl from '../components/MissionControl';
import ConfidenceMatrix from '../components/ConfidenceMatrix';
import HeatmapChart from '../components/HeatmapChart';
import RecommendedModule from '../components/RecommendedModule';
import FocusTrap from '../components/FocusTrap';
import { SkeletonChart } from '../components/SkeletonLoaders';
// Recharts (~400KB) only powers these two cards — lazy-load them so the
// `charts` chunk leaves the home route's critical path and loads after paint.
const ThetaVelocityChart = lazy(() => import('../components/ThetaVelocityChart'));
const MockBoardAnalytics = lazy(() => import('../components/MockBoardAnalytics'));
import { generateBoardReadinessReport } from '../services/geminiApi';

import { fetchReadinessScore } from '../services/dbQueries';
import { syncDashboardStats, mergeServerIntoStats } from '../services/analyticsSync';
import toast from 'react-hot-toast';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { TrajectoryCard } from '../features/analytics/TrajectoryCard';
import { PrescriptionPanel } from '../features/analytics/PrescriptionPanel';
import PageHeader from '../components/PageHeader';
import { Panel, KpiTile, StatusPill, Button, Card, Badge, EmptyState, SegmentedControl } from '../components/ui';
import {
  Target, Gauge, ListChecks, Timer, Flame, AudioWaveform,
  Sparkles, ArrowRight, CalendarDays, ShieldAlert,
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

  // "Today's prescription" Start routing. Forecast topics are either a subject
  // ('Mathematics'/'ESAS'/'EE' — from per-subject UserAbility) or a subtopic
  // (from UserTopicPerformance rollups) — resolve to a ReviewSetup-shaped
  // session preset; READ actions route to the materials library instead.
  const handlePrescriptionAction = (action) => {
    const topic = action?.payload?.topic;
    if (action?.type === 'READ') {
      toast(`Open your ${topic || 'weak-topic'} materials and read for ${action?.payload?.durationMin || 25} minutes.`, { icon: '📚' });
      navigate('/materials');
      return;
    }

    const safeTOS = dynamicTOS || {};
    const isSubject = topic && Object.prototype.hasOwnProperty.call(safeTOS, topic);
    const parentSubject = isSubject
      ? topic
      : Object.keys(safeTOS).find((subj) => (safeTOS[subj] || []).some(
          (sub) => sub.trim().toLowerCase() === String(topic || '').trim().toLowerCase(),
        ));

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
  // pure-θ formula, and a DIFFERENT metric from the θ trajectory chart.
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
    // the same triggers so the KPI is always as fresh as the rest.
    fetchReadinessScore().then((r) => { if (r) setReadiness(r); }).catch(() => {});
  }, [currentUser, dynamicTOS, syncTick]);

  // Merge logic lives in services/analyticsSync (shared with Profile). The
  // store is already hydrated with the merged result at fetch time; re-merging
  // here keeps fresh optimistic answers (recorded after the fetch) on top.
  const activeStats = useMemo(() => mergeServerIntoStats(stats, sqlData), [stats, sqlData]);

  const currentTheta = activeStats?.irt?.theta || 0;
  // Composite score from /api/readiness; falls back to the θ-linear map only
  // until the first readiness fetch resolves.
  const readinessScore = readiness?.score
    ?? Math.min(100, Math.max(0, Math.round(((currentTheta + 3) / 6) * 100)));

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
      answered: Math.max(activeStats?.totalAnswered || 0, attempts),
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
      avgSec: attempts > 0 ? timeMs / attempts / 1000 : 0,
      streak: activeStats?.globalStreak || 0,
    };
  }, [activeStats]);

  const handleGenerateAIReport = async () => {
    setShowAiModal(false);
    setIsGeneratingAI(true);
    setAiReport('Querying the Gemini engine for your board diagnostics…');

    const topics = activeStats.microTopics ? Object.entries(activeStats.microTopics) : [];
    const weakTopics = topics
      .filter(([, data]) => data.attempts > 0 && data.correct / data.attempts < 0.5)
      .map(([name]) => name);

    try {
      const report = await generateBoardReadinessReport(activeStats, readinessScore, weakTopics);
      setAiReport(report);
      toast.success('Report generated.');
    } catch (error) {
      setAiReport('Could not generate the report right now. Please try again later.');
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
          <Button variant="primary" size="sm" onClick={() => setShowAiModal(true)} disabled={isGeneratingAI}>
            <Sparkles size={15} strokeWidth={2} />
            {isGeneratingAI ? 'Analyzing…' : 'Generate report'}
          </Button>
        }
      />

      {/* First-run hero — an all-zero dashboard should invite action, not
          look like failure. */}
      {kpi.answered === 0 && !isFetchingSQL && (
        <Card elevated glow grain>
          <EmptyState
            icon={Sparkles}
            title="Start your first review"
            description="Answer your first questions to unlock readiness tracking, topic heatmaps, and the confidence matrix."
            action={
              <>
                <Button as={Link} to="/review" size="lg">
                  Start a quick 20 review
                </Button>
                <Button as={Link} to="/simulator" variant="ghost">
                  Explore the simulator
                </Button>
              </>
            }
          />
        </Card>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <KpiTile icon={Target} tone="velocity" label="Board readiness" value={readinessScore} suffix="%" hint={readiness ? 'coverage · accuracy · θ' : '/ 70% pass'} />
        <KpiTile icon={Gauge} tone="success" label="Global accuracy" value={kpi.accuracy} suffix="%" />
        <KpiTile icon={ListChecks} tone="signal" label="Questions answered" value={kpi.answered} />
        <KpiTile icon={Timer} tone="signal" label="Avg time / question" value={kpi.avgSec} precision={1} suffix="s" />
        <KpiTile icon={Flame} tone="amber" label="Day streak" value={kpi.streak} hint="days" className="col-span-2 md:col-span-1" />
      </div>

      {/* Daily targets + AI report — pinned near the top so the day's goals
          and the exam-config settings are one glance/click away. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <MissionControl stats={activeStats} onPurgeRequest={() => setShowPurgeModal(true)} />
        </div>
        <Card elevated glow className="p-6 flex flex-col gap-4 justify-between grain-overlay bg-gradient-to-br from-surface to-surface2/50">
          <div>
            <div className="inline-flex items-center gap-2 text-[var(--accent)]">
              <Sparkles size={16} strokeWidth={2} />
              <span className="text-[11px] font-mono uppercase tracking-[0.18em]">AI diagnostics</span>
            </div>
            <h3 className="text-display text-textMain text-xl mt-3 leading-snug">Unlock your board report</h3>
            <p className="text-sm text-muted2 mt-2 leading-relaxed">
              A tailored readiness audit from your heatmaps, blind spots, and velocity.
            </p>
          </div>
          {aiReport && (
            <div className="text-sm text-textMain leading-relaxed bg-surface2/40 border border-border rounded-[var(--radius-default)] p-4 max-h-44 overflow-y-auto custom-scrollbar">
              {aiReport}
            </div>
          )}
          <Button variant="primary" onClick={() => setShowAiModal(true)} disabled={isGeneratingAI} className="w-full">
            {isGeneratingAI ? (
              <>
                <span className="telemetry-spinner !w-3 !h-3 border-white border-t-transparent" />
                Analyzing…
              </>
            ) : (
              <>
                Generate report <ArrowRight size={15} strokeWidth={2} />
              </>
            )}
          </Button>
        </Card>
      </div>

      {/* Hero: θ readiness signal + trajectory */}
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

      {/* Mastery: topic heatmap + confidence matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="min-h-[380px] lg:h-[460px]">
          <HeatmapChart stats={activeStats} />
        </div>
        <ConfidenceMatrix stats={activeStats} />
      </div>

      {/* Action: prescription + critical focus */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <PrescriptionPanel onAction={handlePrescriptionAction} />
        <RecommendedModule stats={activeStats} />
      </div>

      {/* Pre-board simulation ledger */}
      <Suspense fallback={<SkeletonChart />}>
        <MockBoardAnalytics />
      </Suspense>

      {/* MODALS */}
      {showAiModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showAiModal}>
            <Card elevated className="p-6 max-w-md w-full modal-entrance">
              <h3 className="text-lg font-semibold text-textMain mb-2 flex items-center gap-2">
                <Sparkles size={18} strokeWidth={2} className="text-[var(--accent)]" /> Generate AI board report?
              </h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">
                This queries the Gemini engine to build a tailored report from your heatmaps and blind spots. It uses
                one API request.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" size="sm" onClick={() => setShowAiModal(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleGenerateAIReport}>Generate report</Button>
              </div>
            </Card>
          </FocusTrap>
        </div>
      )}

      {showPurgeModal && (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showPurgeModal}>
            <Card
              elevated
              className="p-6 md:p-8 max-w-md w-full relative overflow-hidden modal-entrance"
              style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 50%, transparent)' }}
            >
              <h3 className="text-xl font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-danger)' }}>
                <ShieldAlert size={20} strokeWidth={2} /> Purge all analytics?
              </h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">
                This permanently deletes your{' '}
                <strong className="text-textMain font-semibold">
                  topic heatmaps, IRT θ rating, readiness velocity, confidence matrix, study-time logs, and lifetime
                  history
                </strong>
                . This can't be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" size="sm" disabled={isPurging} onClick={() => setShowPurgeModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" disabled={isPurging} onClick={executePurge}>
                  {isPurging && <span className="telemetry-spinner !w-3 !h-3 border-white border-t-transparent" />}
                  Confirm purge
                </Button>
              </div>
            </Card>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}
