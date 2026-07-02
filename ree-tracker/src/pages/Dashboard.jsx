// src/pages/Dashboard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useTelemetrySlice, useTOSSlice } from '../store/slices';
import { useAuth } from '../contexts/AuthContext';
import MissionControl from '../components/MissionControl';
import ThetaVelocityChart from '../components/ThetaVelocityChart';
import ConfidenceMatrix from '../components/ConfidenceMatrix';
import HeatmapChart from '../components/HeatmapChart';
import RecommendedModule from '../components/RecommendedModule';
import MockBoardAnalytics from '../components/MockBoardAnalytics';
import FocusTrap from '../components/FocusTrap';
import { generateBoardReadinessReport } from '../services/geminiApi';

import { apiRequest } from '../services/dbQueries';
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
  const { stats, purgeAnalytics, setStats, syncStatus } = useTelemetrySlice();
  const { dynamicTOS } = useTOSSlice();

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

  useEffect(() => {
    const fetchSQLAnalytics = async () => {
      if (!currentUser?.uid) return;
      try {
        const json = await apiRequest(`/api/analytics/dashboard/${currentUser.uid}`);
        if (json && json.data) {
          const rawMicroTopics = json.data.microTopics || {};
          const normalizedMicroTopics = {};
          const safeTOS = useStore.getState().dynamicTOS || {};

          Object.keys(safeTOS).forEach((subject) => {
            safeTOS[subject].forEach((subtopic) => {
              normalizedMicroTopics[subtopic] = {
                subject, subtopic, attempts: 0, correct: 0, totalTime: 0,
              };
            });
          });

          Object.keys(rawMicroTopics).forEach((backendKey) => {
            const rawData = rawMicroTopics[backendKey];
            const actualSubtopicName = rawData.subtopic || backendKey.split('_').pop();
            if (actualSubtopicName) {
              normalizedMicroTopics[actualSubtopicName] = {
                subject: rawData.subject || 'Unknown',
                subtopic: actualSubtopicName,
                attempts: rawData.totalAttempts || rawData.attempts || 0,
                correct: rawData.correctHits || rawData.correct || 0,
                totalTime: (rawData.totalTimeSecs || 0) * 1000,
              };
            }
          });

          setSqlData({ ...json.data, microTopics: normalizedMicroTopics });

          const currentState = useStore.getState().stats || {};
          setStats({
            ...currentState,
            role: json.data.profile?.role || currentState.role || 'USER',
            dailyTarget: json.data.profile?.dailyTarget || currentState.dailyTarget || 50,
            examDate: json.data.profile?.examDate || currentState.examDate || null,
          });
        }
      } catch (error) {
        // SQL sync failed silently — dashboard will show cached data
      } finally {
        setIsFetchingSQL(false);
      }
    };

    fetchSQLAnalytics();
  }, [currentUser, dynamicTOS, setStats, syncTick]);

  const activeStats = useMemo(() => {
    if (!stats && !sqlData) return null;
    if (!sqlData) return stats;

    const sqlMicroTopics = {};
    if (sqlData.microTopics) {
      Object.keys(sqlData.microTopics).forEach((subtopicName) => {
        sqlMicroTopics[subtopicName] = {
          attempts: sqlData.microTopics[subtopicName].totalAttempts || 0,
          correct: sqlData.microTopics[subtopicName].correctHits || 0,
          subject: sqlData.microTopics[subtopicName].subject,
          totalTime: (sqlData.microTopics[subtopicName].totalTimeSecs || 0) * 1000,
        };
      });
    }

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

    return {
      ...stats,
      irt: { ...stats?.irt, theta: sqlData.profile?.thetaRating ?? stats?.irt?.theta ?? 0 },
      matrix,
      microTopics: mergedMicroTopics,
      thetaHistory:
        sqlData.thetaHistory && sqlData.thetaHistory.length > (stats?.thetaHistory?.length || 0)
          ? sqlData.thetaHistory
          : stats?.thetaHistory || sqlData.thetaHistory || [],
      activityCalendar: { ...(sqlData.activityCalendar || {}), ...(stats?.activityCalendar || {}) },
      dailyMath: pickMax(todayStats.Math, sqlData.profile?.dailyMath, stats?.dailyMath),
      dailyESAS: pickMax(todayStats.ESAS, sqlData.profile?.dailyESAS, stats?.dailyESAS),
      dailyEE: pickMax(todayStats.EE, sqlData.profile?.dailyEE, stats?.dailyEE),
      globalStreak: pickMax(sqlData.profile?.globalStreak, stats?.globalStreak),
      totalAnswered: pickMax(sqlData.profile?.totalAnswered, stats?.totalAnswered),
      totalCorrect: pickMax(stats?.totalCorrect),
      examDate: stats?.examDate || sqlData.profile?.examDate || null,
      dailyTarget: stats?.dailyTarget || sqlData.profile?.dailyTarget || 50,
    };
  }, [stats, sqlData]);

  const currentTheta = activeStats?.irt?.theta || 0;
  const readinessScore = useMemo(
    () => Math.min(100, Math.max(0, Math.round(((currentTheta + 3) / 6) * 100))),
    [currentTheta]
  );

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
        <KpiTile icon={Target} tone="velocity" label="Board readiness" value={readinessScore} suffix="%" hint="/ 70% pass" />
        <KpiTile icon={Gauge} tone="success" label="Global accuracy" value={kpi.accuracy} suffix="%" />
        <KpiTile icon={ListChecks} tone="signal" label="Questions answered" value={kpi.answered} />
        <KpiTile icon={Timer} tone="signal" label="Avg time / question" value={kpi.avgSec} precision={1} suffix="s" />
        <KpiTile icon={Flame} tone="amber" label="Day streak" value={kpi.streak} hint="days" className="col-span-2 md:col-span-1" />
      </div>

      {/* Hero: θ readiness signal + trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Panel
          icon={AudioWaveform}
          eyebrow="Readiness signal"
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
          <ThetaVelocityChart history={activeStats?.thetaHistory} range={velocityRange} />
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
        <PrescriptionPanel />
        <RecommendedModule stats={activeStats} />
      </div>

      {/* Pre-board simulation ledger */}
      <MockBoardAnalytics />

      {/* Daily targets + AI report */}
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
