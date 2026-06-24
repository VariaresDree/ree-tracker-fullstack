// src/pages/Dashboard.jsx
import React, { useState, useMemo, useEffect } from 'react';
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
import ExamPerformanceCard from '../features/analytics/ExamPerformanceCard';
import { generateBoardReadinessReport } from '../services/geminiApi';

import { apiRequest } from '../services/dbQueries';
import toast from 'react-hot-toast';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { TrajectoryCard } from '../features/analytics/TrajectoryCard';
import { PrescriptionPanel } from '../features/analytics/PrescriptionPanel';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { stats, purgeAnalytics, setStats, syncStatus } = useTelemetrySlice();
  const { dynamicTOS } = useTOSSlice();

  const [sqlData, setSqlData] = useState(null);
  const [isFetchingSQL, setIsFetchingSQL] = useState(true);
  // syncTick increments whenever the store transitions from syncing -> synced,
  // which triggers the dashboard to refetch the authoritative aggregates.
  // Without this, the optimistic local stats (recordAttempt) tick instantly but
  // the dashboard widgets keep showing the stale sqlData from initial mount.
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

  useEffect(() => {
    const fetchSQLAnalytics = async () => {
        if (!currentUser?.uid) return;
        try {
            const json = await apiRequest(`/api/analytics/dashboard/${currentUser.uid}`);
            if (json && json.data) {
                
                const rawMicroTopics = json.data.microTopics || {};
                const normalizedMicroTopics = {};
                const safeTOS = useStore.getState().dynamicTOS || {};

                Object.keys(safeTOS).forEach(subject => {
                    safeTOS[subject].forEach(subtopic => {
                        normalizedMicroTopics[subtopic] = {
                            subject: subject, subtopic: subtopic,
                            attempts: 0, correct: 0, totalTime: 0
                        };
                    });
                });

                Object.keys(rawMicroTopics).forEach(backendKey => {
                    const rawData = rawMicroTopics[backendKey];
                    const actualSubtopicName = rawData.subtopic || backendKey.split('_').pop();
                    
                    if (actualSubtopicName) {
                        normalizedMicroTopics[actualSubtopicName] = {
                            subject: rawData.subject || 'Unknown',
                            subtopic: actualSubtopicName,
                            attempts: rawData.totalAttempts || rawData.attempts || 0,
                            correct: rawData.correctHits || rawData.correct || 0,
                            totalTime: (rawData.totalTimeSecs || 0) * 1000
                        };
                    }
                });

                setSqlData({ ...json.data, microTopics: normalizedMicroTopics });

                const currentState = useStore.getState().stats || {};
                setStats({
                    ...currentState,
                    role: json.data.profile?.role || currentState.role || 'USER',
                    // Backend User.examDate / dailyTarget are canonical. Without
                    // this, the local stats could overwrite a freshly-saved date
                    // with null if the IDB rehydrate hadn't completed yet.
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
          Object.keys(sqlData.microTopics).forEach(subtopicName => {
              sqlMicroTopics[subtopicName] = {
                  attempts: sqlData.microTopics[subtopicName].totalAttempts || 0,
                  correct: sqlData.microTopics[subtopicName].correctHits || 0,
                  subject: sqlData.microTopics[subtopicName].subject,
                  totalTime: (sqlData.microTopics[subtopicName].totalTimeSecs || 0) * 1000,
              };
          });
      }

      // Per-topic merge: take whichever side has more attempts. Lets optimistic
      // local updates surface before the backend re-aggregation lands, while
      // still trusting the backend's authoritative numbers once they catch up.
      const mergedMicroTopics = { ...sqlMicroTopics };
      const localMicroTopics = stats?.microTopics || {};
      Object.entries(localMicroTopics).forEach(([topic, local]) => {
          const sql = sqlMicroTopics[topic];
          if (!sql || (local?.attempts || 0) > (sql.attempts || 0)) {
              mergedMicroTopics[topic] = { ...sql, ...local };
          }
      });

      // Same idea for the high/low confidence matrix — pick whichever side
      // has the higher total cell count, since the local one ticked from
      // recordAttempt and may be ahead of the cached server aggregate.
      const sqlMatrix = sqlData.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };
      const localMatrix = stats?.matrix || { hc: 0, hw: 0, lc: 0, lw: 0 };
      const sqlTotal = (sqlMatrix.hc||0) + (sqlMatrix.hw||0) + (sqlMatrix.lc||0) + (sqlMatrix.lw||0);
      const localTotal = (localMatrix.hc||0) + (localMatrix.hw||0) + (localMatrix.lc||0) + (localMatrix.lw||0);
      const matrix = localTotal > sqlTotal ? localMatrix : sqlMatrix;

      const todayStats = sqlData.dailyStats || sqlData.profile?.dailyStats || {};

      // Quotas/streak: prefer the larger value so quick answers (local) aren't
      // overwritten by cached zero aggregates from the backend.
      const pickMax = (...vals) => Math.max(...vals.map((v) => Number(v) || 0));

      return {
          ...stats,
          irt: { ...stats?.irt, theta: sqlData.profile?.thetaRating ?? stats?.irt?.theta ?? 0 },
          matrix,
          microTopics: mergedMicroTopics,
          thetaHistory: sqlData.thetaHistory && sqlData.thetaHistory.length > (stats?.thetaHistory?.length || 0)
              ? sqlData.thetaHistory
              : (stats?.thetaHistory || sqlData.thetaHistory || []),

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
  const readinessScore = useMemo(() => {
    return Math.min(100, Math.max(0, Math.round(((currentTheta + 3) / 6) * 100)));
  }, [currentTheta]);

  const handleGenerateAIReport = async () => {
    setShowAiModal(false);
    setIsGeneratingAI(true);
    setAiReport('Querying Gemini Core Engine for tactical diagnostics...');

    const topics = activeStats.microTopics ? Object.entries(activeStats.microTopics) : [];
    const weakTopics = topics.filter(([_, data]) => data.attempts > 0 && (data.correct / data.attempts < 0.5)).map(([name]) => name);

    try {
      const report = await generateBoardReadinessReport(activeStats, readinessScore, weakTopics);
      setAiReport(report);
      toast.success('AI Report Generated.');
    } catch (error) {
      setAiReport('Failed to generate tactical diagnostics. Please try again later.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const executePurge = async () => {
      setIsPurging(true);
      const toastId = toast.loading("Executing Global Purge...");
      try {
          await purgeAnalytics();
          setShowPurgeModal(false);
          toast.success("Telemetry Wiped.", { id: toastId });
      } catch (error) {
          toast.error("Database override failed.", { id: toastId });
      } finally {
          setIsPurging(false);
      }
  };

  if (!activeStats || isFetchingSQL) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-[1600px] mx-auto">
      <div className="mb-2 border-b border-border2/60 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-textMain tracking-tight">Tactical Command Center</h1>
          <p className="text-muted2 mt-1.5 text-sm font-medium">Welcome back, Agent <span className="text-reeCyan font-black">{currentUser?.displayName || 'Reviewer'}</span>.</p>
        </div>
      </div>

      {(() => {
        const t = ({
          synced:         { dot: 'bg-reeGreen', label: 'System Telemetry Online',  pulse: true,  glow: 'shadow-[0_0_8px_#22c55e]' },
          syncing:        { dot: 'bg-reeBlue',  label: 'Syncing Telemetry…',        pulse: true,  glow: 'shadow-[0_0_8px_#3b82f6]' },
          offline_queued: { dot: 'bg-reeAmber', label: 'Offline — Queued for Sync', pulse: false, glow: '' },
          error:          { dot: 'bg-reeRed',   label: 'Telemetry Sync Error',      pulse: true,  glow: 'shadow-[0_0_8px_#ef4444]' },
        })[syncStatus] || { dot: 'bg-reeGreen', label: 'System Telemetry Online', pulse: true, glow: 'shadow-[0_0_8px_#22c55e]' };
        return (
          <div role="status" aria-live="polite" className="flex items-center gap-2.5 px-4 py-2.5 bg-surface2/40 border border-border2/60 rounded-xl shadow-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${t.dot} ${t.pulse ? 'animate-pulse' : ''} ${t.glow}`}></span>
            <span className="text-[0.65rem] font-bold tracking-widest uppercase text-textMain">{t.label}</span>
          </div>
        );
      })()}

      {activeStats.examDate && (() => {
        const daysLeft = Math.ceil((new Date(activeStats.examDate) - new Date()) / (1000 * 60 * 60 * 24));
        const isPast = daysLeft < 0;
        const urgency = isPast ? 'border-reeRed/40 bg-reeRed/5' : daysLeft <= 14 ? 'border-reeAmber/40 bg-reeAmber/5' : 'border-reeGreen/40 bg-reeGreen/5';
        const textColor = isPast ? 'text-reeRed' : daysLeft <= 14 ? 'text-reeAmber' : 'text-reeGreen';
        return (
          <div className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${urgency}`}>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-muted">REE Board Exam</div>
                <div className={`text-lg font-black ${textColor}`}>
                  {isPast ? `${Math.abs(daysLeft)} days ago` : daysLeft === 0 ? 'TODAY' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted font-mono">{new Date(activeStats.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>
        );
      })()}

      {/* ── SECTION 1: EXAM PERFORMANCE ─────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-muted border-b border-border2/40 pb-2">Exam Performance</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ExamPerformanceCard stats={activeStats} />
          <div className="lg:col-span-2 p-6 bg-surface border border-border2/60 rounded-2xl shadow-sm flex flex-col min-h-[250px] min-w-0 overflow-hidden transition-shadow hover:shadow-md hover-glow">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xs font-black uppercase tracking-widest text-textMain">Readiness Velocity (θ)</h3>
              <span className="text-[0.6rem] font-bold text-muted uppercase tracking-widest bg-surface2 px-2 py-1 rounded-md">30 Days</span>
            </div>
            <div className="flex-1 w-full h-full min-h-[150px] min-w-0 mt-2">
              <ThetaVelocityChart history={activeStats?.thetaHistory} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-surface border border-border2/60 rounded-2xl shadow-sm flex flex-col justify-center transition-shadow hover:shadow-md hover-glow">
            <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4">Confidence vs Accuracy</h3>
            <ConfidenceMatrix stats={activeStats} />
          </div>
          <div className="flex flex-col min-h-[350px] min-w-0">
            <HeatmapChart stats={activeStats} />
          </div>
        </div>
      </div>

      {/* ── SECTION 2: SESSION BEHAVIOR ─────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-muted border-b border-border2/40 pb-2">Session Behavior</h2>
        <MissionControl
            stats={activeStats}
            onPurgeRequest={() => setShowPurgeModal(true)}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecommendedModule stats={activeStats} />
          <MockBoardAnalytics />
        </div>
      </div>

      {/* ── SECTION 3: PREDICTIVE INSIGHTS ──────────────────────────── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-muted border-b border-border2/40 pb-2">Predictive Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrajectoryCard />
          <PrescriptionPanel />
        </div>
        {/* AI Tactical Report */}
        <div className="p-6 bg-surface/80 backdrop-blur-sm border border-border2/60 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-textMain">AI Tactical Diagnostics</h3>
            <button onClick={() => setShowAiModal(true)} disabled={isGeneratingAI} className="px-5 py-2.5 bg-gradient-to-r from-reePurple to-reeBlue text-white font-black rounded-xl text-[0.6rem] uppercase tracking-widest shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer btn-press">
              {isGeneratingAI ? <><span className="telemetry-spinner !w-3 !h-3 border-white border-t-transparent"></span>Analyzing...</> : 'Generate Report'}
            </button>
          </div>
          {aiReport ? (
            <div className="bg-gradient-to-b from-reePurple/5 to-transparent border border-reePurple/20 rounded-xl p-5">
              <div className="text-sm text-textMain leading-relaxed">{aiReport}</div>
            </div>
          ) : (
            <div className="flex items-center justify-center border-2 border-dashed border-border2/60 bg-surface2/10 rounded-xl p-6">
              <div className="text-xs text-muted2 font-mono text-center">
                Initialize report to audit blind spots.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {showAiModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showAiModal}>
            <div className="bg-surface border border-reePurple/40 p-6 rounded-2xl shadow-2xl max-w-md w-full modal-entrance">
              <h3 className="text-lg font-black text-reePurple mb-2 flex items-center gap-2"><span>✨</span> Initialize AI Generation?</h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">This action queries the Gemini Core Engine to build a customized tactical report based on your heatmaps. This consumes an API transaction.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAiModal(false)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleGenerateAIReport} className="px-4 py-2 bg-reePurple hover:bg-purple-600 text-white rounded-lg text-xs font-black tracking-wider uppercase transition-colors shadow-md cursor-pointer btn-press">Execute AI Query</button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {showPurgeModal && (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showPurgeModal}>
            <div className="bg-surface border border-reeRed/50 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden modal-entrance">
              <div className="absolute top-0 right-0 w-32 h-32 bg-reeRed/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <h3 className="text-xl font-black text-reeRed mb-3 flex items-center gap-2 relative z-10"><span>⚠️</span> INITIATE GLOBAL PURGE</h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed relative z-10">This protocol will permanently delete your <strong className="text-textMain">Topic Heatmaps, IRT Theta Rating, Readiness Velocity, Confidence Matrix, and Lifetime History</strong>. <br/><br/>This action is irreversible. Proceed?</p>
              <div className="flex justify-end gap-3 relative z-10">
                <button disabled={isPurging} onClick={() => setShowPurgeModal(false)} className="px-5 py-2.5 bg-surface2 hover:bg-surface3 text-textMain rounded-xl text-xs font-bold transition-colors cursor-pointer border border-border2 disabled:opacity-50">Cancel Protocol</button>
                <button disabled={isPurging} onClick={executePurge} className="flex items-center gap-2 px-5 py-2.5 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-colors cursor-pointer disabled:opacity-50 btn-press">
                    {isPurging && <span className="telemetry-spinner !w-3 !h-3 border-white border-t-transparent"></span>} Confirm Purge
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}