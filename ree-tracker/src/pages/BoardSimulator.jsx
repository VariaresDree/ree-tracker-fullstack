// src/pages/BoardSimulator.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSimulatorEngine } from '../features/board-simulator/useSimulatorEngine';
import { useBattleSocket } from '../hooks/useBattleSocket';
import SimulatorConfig from '../features/board-simulator/SimulatorConfig';
import SimulatorActive from '../features/board-simulator/SimulatorActive';
import SimulatorDiagnostics from '../features/board-simulator/SimulatorDiagnostics';
import FocusTrap from '../components/FocusTrap';
import toast from 'react-hot-toast';

import { saveBookmark } from '../services/dbQueries';

const formatTimerMinutes = (s) => `${Math.floor(s/60).toString().padStart(2, '0')}:${(s%60).toString().padStart(2, '0')}`;
const formatTimerVerbose = (s) => `${Math.floor(s/60)}m ${(s%60).toString().padStart(2, '0')}s`;

export default function BoardSimulator() {
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const engine = useSimulatorEngine(currentUser, isOnline);

  const [showTerminateModal, setShowTerminateModal] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeBattleId = engine.config.battleId || searchParams.get('battleId');
  const { connected: battleConnected, opponentProgress, sendProgress, submitResult } = useBattleSocket(activeBattleId);

  useEffect(() => {
    const bId = searchParams.get('battleId');
    if (bId && !engine.session.isActive && !engine.session.loading) {
        engine.startMultiplayerBattle(bId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeBattleId || !battleConnected || !engine.session.isActive || engine.session.isFinished) return;

    const answered = Object.keys(engine.session.answers).length;
    const correct = engine.session.questions.reduce((acc, q, idx) =>
      engine.session.answers[idx] === q.answer ? acc + 1 : acc, 0
    );
    sendProgress(correct, answered);
  }, [engine.session.answers, activeBattleId, battleConnected]);

  // FULLY WIRED BOOKMARK HANDLER WITH COMPLETE PAYLOAD
  const handleBookmark = async (question) => {
    if (!currentUser?.uid || !question?.id) return;
    try {
        await saveBookmark(currentUser.uid, {
            id: question.id,
            type: 'Question',
            subject: question.subject || 'General',
            subtopic: question.subtopic || 'Uncategorized',
            content: question.text || question.question || "Encrypted Content",
            options: question.options || [],
            answer: question.answer || null,
            fixedExplanation: question.fixedExplanation || null,
        });
        toast.success("Secured in Bookmark Vault.");
    } catch (error) {
        toast.error("Failed to secure bookmark.");
    }
  };

  useEffect(() => {
    if (activeBattleId && engine.session.isFinished && engine.session.diagnostics) {
      const { score, totalItems, timeTakenSecs } = engine.session.diagnostics;
      submitResult(Math.round(score * totalItems / 100), totalItems, timeTakenSecs);
    }
  }, [engine.session.isFinished, activeBattleId]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">

      {activeBattleId && battleConnected && opponentProgress.length > 0 && engine.session.isActive && !engine.session.isFinished && (
        <div className="bg-surface border border-reeRed/30 rounded-xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.65rem] font-black uppercase tracking-widest text-reeRed flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-reeGreen animate-pulse"></span> Live Opponents
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {opponentProgress.map(op => (
              <div key={op.id} className="bg-bg border border-border2 rounded-lg px-3 py-2 flex items-center gap-3">
                <span className="text-xs font-bold text-textMain truncate max-w-[120px]">{op.displayName}</span>
                <span className="text-xs font-mono text-reeCyan">{op.itemsAnswered} ans</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!engine.session.isActive && !engine.session.isFinished && (
        <SimulatorConfig 
            config={engine.config} 
            setConfig={engine.setConfig} 
            session={engine.session} 
            startSimulation={engine.startSimulation} 
            exportOfflinePDF={engine.exportOfflinePDF}
            isExporting={engine.isExporting}
        />
      )}

{engine.session.isFinished && (
        <SimulatorDiagnostics 
            session={engine.session} 
            formatTime={formatTimerVerbose} 
            setCurrentIndex={engine.setCurrentIndex}
            onBookmark={handleBookmark} 
        />
      )}

      {(engine.session.isActive || engine.session.isFinished) && (
        <div className={engine.session.isFinished ? "mt-4" : ""}>
          <SimulatorActive 
            engine={engine} 
            formatTime={formatTimerMinutes} 
            requestTerminate={() => setShowTerminateModal(true)} 
            isOnline={isOnline}
            onBookmark={handleBookmark} 
        />
        </div>
      )}

      {showTerminateModal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <FocusTrap active={showTerminateModal}>
            <div className="bg-surface border border-border2 p-6 rounded-2xl shadow-2xl max-w-md w-full">
              <h3 className="text-lg font-black text-reeAmber mb-2 flex items-center gap-2"><span>⚠️</span> Terminate Simulation?</h3>
              <p className="text-sm text-muted2 mb-6 leading-relaxed">Submitting will calculate your diagnostics and save the record.</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowTerminateModal(false)} className="px-4 py-2 bg-surface2 hover:bg-surface3 text-textMain rounded-lg text-xs font-bold cursor-pointer transition-colors">Cancel</button>
                <button onClick={() => { setShowTerminateModal(false); engine.submitExam(); }} className="px-4 py-2 bg-reeRed hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">Submit Exam</button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

    </div>
  );
}