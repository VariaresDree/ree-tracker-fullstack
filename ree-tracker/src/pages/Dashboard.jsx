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
import { generateBoardReadinessReport } from '../services/geminiApi';

import { apiRequest, fetchReadinessScore } from '../services/dbQueries';
import toast from 'react-hot-toast';
import { DashboardSkeleton } from '../components/SkeletonLoaders';
import { TrajectoryCard } from '../features/analytics/TrajectoryCard';
import { PrescriptionPanel } from '../features/analytics/PrescriptionPanel';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { stats, purgeAnalytics, setStats } = useTelemetrySlice();
  const { dynamicTOS } = useTOSSlice();
  
  const [sqlData, setSqlData] = useState(null);
  const [isFetchingSQL, setIsFetchingSQL] = useState(true);

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
                    dailyTarget: currentState.dailyTarget || 50, 
                    examDate: currentState.examDate || null      
                });
            }
        } catch (error) {
            // SQL sync failed silently — dashboard will show cached data
        } finally {
            setIsFetchingSQL(false);
        }
    };

    fetchSQLAnalytics();
  }, [currentUser, dynamicTOS, setStats]); 

  const activeStats = useMemo(() => {
      if (!stats && !sqlData) return null;
      if (!sqlData) return stats;

      const mappedMicroTopics = {};
      if (sqlData.microTopics) {
          Object.keys(sqlData.microTopics).forEach(subtopicName => {
              mappedMicroTopics[subtopicName] = {
                  attempts: sqlData.microTopics[subtopicName].totalAttempts,
                  correct: sqlData.microTopics[subtopicName].correctHits,
                  subject: sqlData.microTopics[subtopicName].subject,
                  totalTime: sqlData.microTopics[subtopicName].totalTimeSecs * 1000 
              };
          });
      }

      const todayStats = sqlData.dailyStats || sqlData.profile?.dailyStats || {};

      return {
          ...stats,
          irt: { ...stats?.irt, theta: sqlData.profile?.thetaRating || stats?.irt?.theta || 0 },
          matrix: sqlData.matrix || stats?.matrix,
          microTopics: mappedMicroTopics,
          thetaHistory: sqlData.thetaHistory || stats?.thetaHistory || [],
          
          activityCalendar: sqlData.activityCalendar || stats?.activityCalendar || {},
          
          dailyMath: todayStats.Math || sqlData.profile?.dailyMath || stats?.dailyMath || 0,
          dailyESAS: todayStats.ESAS || sqlData.profile?.dailyESAS || stats?.dailyESAS || 0,
          dailyEE: todayStats.EE || sqlData.profile?.dailyEE || stats?.dailyEE || 0,
          
          examDate: stats?.examDate || sqlData.profile?.examDate || null, 
          dailyTarget: stats?.dailyTarget || sqlData.profile?.dailyTarget || 50
      };
  }, [stats, sqlData]);

  const [readinessData, setReadinessData] = useState(null);

  useEffect(() => {
    if (currentUser?.uid && !isFetchingSQL) {
      fetchReadinessScore().then(data => setReadinessData(data)).catch(() => {});
    }
  }, [currentUser, isFetchingSQL]);

  const currentTheta = activeStats?.irt?.theta || 0;
  const fallbackScore = useMemo(() => {
    return Math.min(100, Math.max(0, Math.round(((currentTheta + 3) / 6) * 100)));
  }, [currentTheta]);
  const readinessScore = readinessData?.score ?? fallbackScore;

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

  // Determine shadow glow colors based on Readiness Score
  const scoreGlow = readinessScore >= 70 ? 'shadow-[0_0_40px_rgba(34,197,94,0.15)] border-reeGreen/20' 
                  : readinessScore >= 50 ? 'shadow-[0_0_40px_rgba(245,158,11,0.1)] border-reeAmber/20' 
                  : 'shadow-[0_0_40px_rgba(239,68,68,0.1)] border-reeRed/20';

  if (!activeStats || isFetchingSQL) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-[1600px] mx-auto">
      <div className="mb-2 border-b border-border2/60 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-textMain tracking-tight">Tactical Command Center</h1>
          <p className="text-muted2 mt-1.5 text-sm font-medium">Welcome back, Agent <span className="text-reeCyan font-black">{currentUser?.displayName || 'Reviewer'}</span>. System telemetry is online.</p>
        </div>
      </div>

      {activeStats.examDate && (() => {
        const daysLeft = Math.ceil((new Date(activeStats.examDate) - new Date()) / (1000 * 60 * 60 * 24));
        const isPast = daysLeft < 0;
        const urgency = isPast ? 'border-reeRed/40 bg-reeRed/5' : daysLeft <= 14 ? 'border-reeAmber/40 bg-reeAmber/5' : 'border-reeGreen/40 bg-reeGreen/5';
        const textColor = isPast ? 'text-reeRed' : daysLeft <= 14 ? 'text-reeAmber' : 'text-reeGreen';
        return (
          <div className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 ${urgency}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isPast ? '⚠️' : '📅'}</span>
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

      {/* Adaptive forecast — Phase 3 analytics surface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrajectoryCard />
        <PrescriptionPanel />
      </div>

      <MissionControl
          stats={activeStats}
          onPurgeRequest={() => setShowPurgeModal(true)}
      />

      {/* 🚀 MAIN GRID: Strict sizing bounds ensure perfect column leveling */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-2 xl:h-[860px] items-stretch stagger-fade-in">
        
        {/* COLUMN 1: Recommended Module & Readiness Index */}
        <div className="flex flex-col gap-6 h-full min-h-0">
            <div className="shrink-0">
                <RecommendedModule stats={activeStats} />
            </div>
            
            <div className={`p-6 bg-surface/80 backdrop-blur-sm border rounded-2xl flex flex-col flex-1 min-h-0 transition-all duration-500 hover-glow ${scoreGlow}`}>
              <div className="shrink-0 relative">
                <h3 className="text-xs font-black text-textMain uppercase tracking-widest flex items-center gap-2 mb-3">
                    <span className="text-lg">📊</span> Board Readiness Index
                </h3>
                <div className="flex items-end gap-2 mb-1">
                  <span className={`text-7xl font-black tracking-tighter drop-shadow-md ${readinessScore >= 70 ? 'text-reeGreen' : readinessScore >= 50 ? 'text-reeAmber' : 'text-reeRed'}`}>
                      {readinessScore}%
                  </span>
                </div>
                <div className="text-[0.65rem] text-muted font-bold uppercase tracking-widest mb-6">/ 70% Passing Threshold</div>
                
                <div className="w-full h-2.5 bg-surface3/50 rounded-full overflow-hidden border border-border2/50 shadow-inner">
                  <div className={`h-full transition-all duration-1500 ease-out ${readinessScore >= 70 ? 'bg-reeGreen shadow-[0_0_12px_rgba(34,197,94,0.6)]' : readinessScore >= 50 ? 'bg-reeAmber shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-reeRed'}`} style={{ width: `${readinessScore}%` }}></div>
                </div>

                <div className="p-4 bg-surface2/30 border border-border2/40 rounded-xl mt-6">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[0.6rem] font-black text-muted uppercase tracking-widest">IRT Ability Level (θ)</span>
                    <span className="text-sm font-black text-reeCyan drop-shadow-sm">{currentTheta.toFixed(3)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface3/50 rounded-full overflow-hidden relative shadow-inner">
                    <div className="h-full bg-reeCyan absolute top-0 left-0 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(6,182,212,0.8)]" style={{ width: `${Math.max(0, Math.min(100, ((currentTheta + 3) / 6) * 100))}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 w-full mt-6 mb-6">
                {aiReport ? (
                  <div className="flex-1 h-full bg-gradient-to-b from-reePurple/5 to-transparent border border-reePurple/20 rounded-xl p-5 overflow-y-auto custom-scrollbar flex flex-col relative">
                    <div className="text-[0.65rem] font-black text-reePurple uppercase tracking-widest mb-3 flex items-center gap-2 shrink-0">
                        <span className="animate-pulse">✨</span> Tactical AI Diagnostics
                    </div>
                    <div className="text-sm text-textMain leading-relaxed font-medium">{aiReport}</div>
                  </div>
                ) : (
                  <div className="flex-1 h-full flex flex-col items-center justify-center border-2 border-dashed border-border2/60 bg-surface2/10 rounded-xl p-6 transition-colors hover:border-reePurple/30 group">
                     <span className="text-2xl mb-3 opacity-20 group-hover:opacity-40 transition-opacity">🤖</span>
                     <div className="text-xs text-muted2 font-mono text-center leading-relaxed">
                        Diagnostics Standby.<br/><span className="opacity-60">Initialize report to audit blind spots.</span>
                     </div>
                  </div>
                )}
              </div>

              <button onClick={() => setShowAiModal(true)} disabled={isGeneratingAI} className="shrink-0 w-full py-4 bg-gradient-to-r from-reePurple to-reeBlue text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-[0_4px_14px_rgba(139,92,246,0.25)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] hover:-translate-y-0.5 transition-all duration-300 flex justify-center items-center gap-2 disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer btn-press">
                {isGeneratingAI ? <><span className="telemetry-spinner !w-4 !h-4 border-white border-t-transparent"></span>Analyzing Matrices...</> : '✨ Generate AI Report'}
              </button>
            </div>
        </div>

        {/* COLUMN 2: Velocity Chart & Confidence Matrix */}
        <div className="flex flex-col gap-6 h-full min-h-0">
            
            {/* 🚀 Velocity Chart (flex-1 ensures it dynamically stretches to fill space) */}
            <div className="flex-1 p-6 bg-surface border border-border2/60 rounded-2xl shadow-sm flex flex-col min-h-[250px] min-w-0 overflow-hidden transition-shadow hover:shadow-md hover-glow">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-textMain flex items-center gap-2">
                        <span className="text-lg">📈</span> Readiness Velocity (θ)
                    </h3>
                    <span className="text-[0.6rem] font-bold text-muted uppercase tracking-widest bg-surface2 px-2 py-1 rounded-md">30 Days</span>
                </div>
                <div className="flex-1 w-full h-full min-h-[150px] min-w-0 mt-2">
                    <ThetaVelocityChart history={activeStats?.thetaHistory} />
                </div>
            </div>
            
            {/* 🚀 Confidence Matrix (shrink-0 ensures it is perfectly sized at the bottom) */}
            <div className="shrink-0 p-6 bg-surface border border-border2/60 rounded-2xl shadow-sm flex flex-col justify-center transition-shadow hover:shadow-md hover-glow">
                <h3 className="text-xs font-black uppercase tracking-widest text-textMain mb-4 flex items-center gap-2 shrink-0">
                    <span className="text-lg">🧠</span> Confidence Assessment
                </h3>
                <ConfidenceMatrix stats={activeStats} />
            </div>
        </div>

        {/* COLUMN 3: Topic Mastery Heatmap */}
        <div className="flex flex-col h-full min-h-[350px] min-w-0 xl:col-span-1 lg:col-span-2">
            <HeatmapChart stats={activeStats} />
        </div>
      </div>

      <MockBoardAnalytics />

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