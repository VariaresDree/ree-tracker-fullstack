// src/pages/Dashboard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useAuth } from '../contexts/AuthContext';
import MissionControl from '../components/MissionControl';
import ThetaVelocityChart from '../components/ThetaVelocityChart';
import ConfidenceMatrix from '../components/ConfidenceMatrix';
import HeatmapChart from '../components/HeatmapChart';
import RecommendedModule from '../components/RecommendedModule';
import MockBoardAnalytics from '../components/MockBoardAnalytics';
import FocusTrap from '../components/FocusTrap';
import { generateBoardReadinessReport } from '../services/geminiApi';
import { generateDiagnosticReport } from '../utils/pdfEngine';
import { apiRequest } from '../services/dbQueries'; 
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { stats, purgeAnalytics, dynamicTOS, setStats } = useStore();
  
  const [sqlData, setSqlData] = useState(null);
  const [isFetchingSQL, setIsFetchingSQL] = useState(true);

  const [aiReport, setAiReport] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [showAiModal, setShowAiModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
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
                            totalAttempts: 0, correctHits: 0, totalTimeSecs: 0
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
                            totalAttempts: rawData.totalAttempts || rawData.attempts || 0,
                            correctHits: rawData.correctHits || rawData.correct || 0,
                            totalTimeSecs: rawData.totalTimeSecs || rawData.totalTime || 0
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
            console.error("SQL Sync Error:", error);
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

      return {
          ...stats,
          irt: { ...stats?.irt, theta: sqlData.profile?.thetaRating || stats?.irt?.theta || 0 },
          matrix: sqlData.matrix || stats?.matrix,
          microTopics: mappedMicroTopics,
          thetaHistory: sqlData.thetaHistory || stats?.thetaHistory || [],
          
          // 🚀 FIXED: Activity Calendar map for the Consistency Matrix Profile Tab
          activityCalendar: sqlData.activityCalendar || stats?.activityCalendar || {},
          
          // 🚀 FIXED: Precise mapping of Daily Quotas
          dailyMath: sqlData.profile?.dailyMath || stats?.dailyMath || 0,
          dailyESAS: sqlData.profile?.dailyESAS || stats?.dailyESAS || 0,
          dailyEE: sqlData.profile?.dailyEE || stats?.dailyEE || 0,
          
          examDate: stats?.examDate || sqlData.profile?.examDate || null, 
          dailyTarget: stats?.dailyTarget || sqlData.profile?.dailyTarget || 50
      };
  }, [stats, sqlData]);

  const currentTheta = activeStats?.irt?.theta || 0;
  const readinessScore = useMemo(() => {
    return Math.min(100, Math.max(0, Math.round(((currentTheta + 3) / 6) * 100)));
  }, [currentTheta]);

  if (!activeStats || isFetchingSQL) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <span className="telemetry-spinner inline-block mr-2"></span>
          <span className="text-muted2 text-sm ml-2">Loading high-speed SQL matrix...</span>
        </div>
      </div>
    );
  }

  const handleGenerateAIReport = async () => {
    setShowAiModal(false);
    setIsGeneratingAI(true);
    setAiReport('Querying Gemini Core Engine for tactical diagnostics...');
    
    const topics = activeStats.microTopics ? Object.entries(activeStats.microTopics) : [];
    const weakTopics = topics.filter(([_, data]) => data.attempts > 0 && (data.correct / data.attempts < 0.5)).map(([name]) => name);
    
    try {
      const report = await generateBoardReadinessReport(activeStats, readinessScore, weakTopics);
      setAiReport(report);
      toast.success('AI report generated.');
    } catch (error) {
      setAiReport('Failed to generate tactical diagnostics. Please try again later.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleExportPDF = async () => {
    setShowPdfModal(false);
    setIsGeneratingPDF(true);
    const toastId = toast.loading("Taking high-res snapshots of telemetry charts...");
    try {
        setTimeout(async () => {
            await generateDiagnosticReport(currentUser, activeStats);
            toast.success("Diagnostic PDF compiled successfully.", { id: toastId });
            setIsGeneratingPDF(false);
        }, 500);
    } catch (error) {
        toast.error("Failed to compile PDF.", { id: toastId });
        setIsGeneratingPDF(false);
    }
  };

  const executePurge = async () => {
      setIsPurging(true);
      const toastId = toast.loading("Executing Global Purge Sequence...");
      try {
          await purgeAnalytics();
          setShowPurgeModal(false);
          toast.success("Telemetry Matrix has been completely wiped.", { id: toastId });
      } catch (error) {
          toast.error("Database override failed. Check network.", { id: toastId });
      } finally {
          setIsPurging(false);
      }
  };

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 w-full max-w-[1600px] mx-auto">
      <div className="mb-2 border-b border-border2 pb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-textMain tracking-tight">Tactical Command Center</h1>
          <p className="text-muted2 mt-1 text-sm">Welcome back, Agent <span className="text-reeCyan font-bold">{currentUser?.displayName || 'Reviewer'}</span>. Your real-time SQL metrics are synced.</p>
        </div>
      </div>

      <MissionControl 
          stats={activeStats} 
          onExportPDF={() => setShowPdfModal(true)} 
          isGeneratingPDF={isGeneratingPDF} 
          onPurgeRequest={() => setShowPurgeModal(true)} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-2 xl:h-[860px] items-stretch">
        <div className="flex flex-col gap-6 h-full min-h-0">
            <div className="shrink-0">
                <RecommendedModule stats={activeStats} />
            </div>
            <div className="p-6 bg-surface border border-border2 rounded-xl shadow-md flex flex-col flex-1 min-h-0">
              <div className="shrink-0">
                <h3 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center gap-2 mb-2">📊 Board Readiness Index</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-6xl font-black tracking-tighter ${readinessScore >= 70 ? 'text-reeGreen' : readinessScore >= 50 ? 'text-reeAmber' : 'text-reeRed'}`}>{readinessScore}%</span>
                </div>
                <div className="text-[0.65rem] text-muted uppercase tracking-widest">/ 70% Passing Threshold</div>
                <div className="w-full h-2 bg-bg rounded-full mt-4 overflow-hidden border border-border2">
                  <div className={`h-full transition-all duration-1000 ${readinessScore >= 70 ? 'bg-reeGreen shadow-[0_0_10px_rgba(34,197,94,0.5)]' : readinessScore >= 50 ? 'bg-reeAmber' : 'bg-reeRed'}`} style={{ width: `${readinessScore}%` }}></div>
                </div>

                <div className="p-4 bg-bg border border-border2 rounded-lg mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.65rem] font-bold text-muted uppercase tracking-widest">IRT Ability Level (θ)</span>
                    <span className="text-sm font-black text-reeCyan">{currentTheta.toFixed(3)}</span>
                  </div>
                  <div className="w-full h-1 bg-surface3 rounded-full overflow-hidden relative">
                    <div className="h-full bg-reeCyan absolute top-0 left-0 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, ((currentTheta + 3) / 6) * 100))}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 w-full mt-6 mb-6">
                {aiReport ? (
                  <div className="flex-1 h-full bg-reePurple/5 border border-reePurple/20 rounded-xl p-5 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="text-[0.65rem] font-bold text-reePurple uppercase tracking-widest mb-3 flex items-center gap-2 shrink-0"><span>✨</span> Tactical AI Diagnostics</div>
                    <div className="text-sm text-textMain leading-relaxed font-medium">{aiReport}</div>
                  </div>
                ) : (
                  <div className="flex-1 h-full flex items-center justify-center border border-dashed border-border2 bg-bg/30 rounded-xl p-4">
                     <div className="text-xs text-muted2 font-mono text-center leading-relaxed">AI Diagnostics Standby.<br/>Initialize report to audit blind spots.</div>
                  </div>
                )}
              </div>

              <button onClick={() => setShowAiModal(true)} disabled={isGeneratingAI} className="shrink-0 w-full py-4 bg-gradient-to-r from-reePurple to-reeBlue text-white font-bold rounded-lg text-xs uppercase tracking-wider shadow-lg hover:shadow-reePurple/20 transition-all flex justify-center items-center gap-2 disabled:opacity-60 cursor-pointer">
                {isGeneratingAI ? <><span className="telemetry-spinner !w-4 !h-4 border-white border-t-transparent"></span>Analyzing Matrices...</> : '✨ Generate AI Readiness Report'}
              </button>
            </div>
        </div>

        <div className="flex flex-col gap-6 h-full min-h-0">
            <div className="flex-1 p-6 bg-surface border border-border2 rounded-xl shadow-md flex flex-col min-h-[300px] min-w-0 overflow-hidden">
                <h3 className="text-sm font-bold uppercase tracking-widest text-textMain mb-4 flex items-center gap-2 shrink-0"><span>📈</span> 30-Day Readiness Velocity (θ)</h3>
                <div className="flex-1 w-full h-full min-h-[200px] min-w-0">
                    <ThetaVelocityChart history={activeStats?.thetaHistory} />
                </div>
            </div>
            
            <div className="shrink-0 p-6 bg-surface border border-border2 rounded-xl shadow-md flex flex-col justify-center min-h-[350px]">
                <h3 className="text-sm font-bold uppercase tracking-widest text-textMain mb-6 flex items-center gap-2 shrink-0"><span>🧠</span> Confidence vs Accuracy Matrix</h3>
                <ConfidenceMatrix stats={activeStats} />
            </div>
        </div>

        <div className="flex flex-col h-full min-h-[350px] min-w-0 xl:col-span-1 lg:col-span-2">
            <HeatmapChart stats={activeStats} />
        </div>
      </div>

      <MockBoardAnalytics />

      {/* MODALS */}
      {showAiModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showAiModal}>
            <div className="bg-surface border border-reePurple/40 p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h3 className="text-lg font-black text-reePurple mb-2 flex items-center gap-2"><span>✨</span> Initialize AI Generation?</h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">This action queries the Gemini Core Engine to build a customized tactical report based on your heatmaps. This consumes an API transaction.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAiModal(false)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleGenerateAIReport} className="px-4 py-2 bg-reePurple hover:bg-purple-600 text-white rounded-lg text-xs font-black tracking-wider uppercase transition-colors shadow-md cursor-pointer">Execute AI Query</button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {showPdfModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showPdfModal}>
            <div className="bg-surface border border-reeBlue/40 p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h3 className="text-lg font-black text-reeBlue mb-2 flex items-center gap-2"><span>📄</span> Export PDF Telemetry?</h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">The system will take high-resolution snapshots of your current DOM matrices. This may cause the UI to briefly freeze during compilation.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowPdfModal(false)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleExportPDF} className="px-4 py-2 bg-reeBlue hover:bg-blue-600 text-white rounded-lg text-xs font-black tracking-wider uppercase transition-colors shadow-md cursor-pointer">Compile PDF</button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {showPurgeModal && (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showPurgeModal}>
            <div className="bg-surface border border-reeRed/50 p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-reeRed/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              <h3 className="text-xl font-black text-reeRed mb-3 flex items-center gap-2 relative z-10"><span>⚠️</span> INITIATE GLOBAL PURGE</h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed relative z-10">This protocol will permanently delete your <strong className="text-textMain">Topic Heatmaps, IRT Theta Rating, Readiness Velocity, Confidence Matrix, and Lifetime History</strong>. <br/><br/>This action is irreversible. Proceed?</p>
              <div className="flex justify-end gap-3 relative z-10">
                <button disabled={isPurging} onClick={() => setShowPurgeModal(false)} className="px-5 py-2.5 bg-surface2 hover:bg-surface3 text-textMain rounded-xl text-xs font-bold transition-colors cursor-pointer border border-border2 disabled:opacity-50">Cancel Protocol</button>
                <button disabled={isPurging} onClick={executePurge} className="flex items-center gap-2 px-5 py-2.5 bg-reeRed hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-colors cursor-pointer disabled:opacity-50">
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