// src/pages/BoardSimulator.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSimulatorEngine } from '../features/board-simulator/useSimulatorEngine';
import { useBattleSocket } from '../hooks/useBattleSocket';
import SimulatorConfig from '../features/board-simulator/SimulatorConfig';
import SimulatorActive from '../features/board-simulator/SimulatorActive';
import SimulatorDiagnostics from '../features/board-simulator/SimulatorDiagnostics';
import { Button, Modal } from '../components/ui';
import { TriangleAlert } from '../components/ui/icons';
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
  const { connected: battleConnected, opponentProgress, graded, answerKey, sendAnswer, submitResult } = useBattleSocket(activeBattleId);

  useEffect(() => {
    const bId = searchParams.get('battleId');
    if (bId && !engine.session.isActive && !engine.session.loading) {
        engine.startMultiplayerBattle(bId);
    }
  }, [searchParams]);

  // Stream each answered/changed question to the server, which grades it
  // against its own key and broadcasts opponent progress. Battle questions
  // are sanitized (no `answer` field), so grading can't happen client-side.
  const lastSentAnswersRef = useRef({});
  useEffect(() => {
    if (!activeBattleId || !battleConnected || !engine.session.isActive || engine.session.isFinished) return;

    for (const [idx, ans] of Object.entries(engine.session.answers)) {
      if (lastSentAnswersRef.current[idx] === ans) continue;
      lastSentAnswersRef.current[idx] = ans;
      const q = engine.session.questions[idx];
      if (q?.id) sendAnswer(q.id, ans, engine.session.confidences?.[idx] || 'MED');
    }
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

  // On finish, hand the server the full attempt list (covers answers it may
  // have missed during a disconnect). The server re-grades everything and
  // computes score/total/timing itself — nothing score-like leaves the client.
  useEffect(() => {
    if (activeBattleId && engine.session.isFinished && engine.session.diagnostics?.pending) {
      submitResult(engine.session.diagnostics.pendingAttempts || []);
    }
  }, [engine.session.isFinished, activeBattleId]);

  // Server ack for our own submission — authoritative score while opponents
  // are still playing.
  useEffect(() => {
    if (activeBattleId && graded) engine.applyServerScore(graded);
  }, [graded, activeBattleId]);

  // battle-complete revealed the answer key — unlock the full per-question
  // review (correct answers, blind spots, subject breakdown).
  useEffect(() => {
    if (activeBattleId && answerKey && engine.session.isFinished) {
      engine.applyBattleGrades(answerKey);
    }
  }, [answerKey, activeBattleId, engine.session.isFinished]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">

      {activeBattleId && battleConnected && opponentProgress.length > 0 && engine.session.isActive && !engine.session.isFinished && (
        <div className="bg-surface border border-reeRed/30 rounded-xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-reeRed flex items-center gap-2">
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
            engine={engine}
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

      <Modal
        open={showTerminateModal}
        onClose={() => setShowTerminateModal(false)}
        tone="amber"
        icon={TriangleAlert}
        title="Submit this exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTerminateModal(false)}>Keep working</Button>
            <Button tone="danger" onClick={() => { setShowTerminateModal(false); engine.submitExam(); }}>Submit exam</Button>
          </>
        }
      >
        <p className="text-sm text-muted2 leading-relaxed">Submitting grades your answers and saves the report to your ledger.</p>
      </Modal>

    </div>
  );
}