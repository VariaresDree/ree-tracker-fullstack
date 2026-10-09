// src/pages/BoardSimulator.jsx
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSimulatorEngine } from '../features/board-simulator/useSimulatorEngine';
import { useBattleSocket } from '../hooks/useBattleSocket';
import SimulatorConfig from '../features/board-simulator/SimulatorConfig';
import SimulatorActive from '../features/board-simulator/SimulatorActive';
import SimulatorDiagnostics from '../features/board-simulator/SimulatorDiagnostics';
import { FullBoardBreak, FullBoardResults } from '../features/board-simulator/FullBoardScreens';
import {
  FULL_BOARD_SECTIONS, loadFullBoard, startFullBoard, clearFullBoard, sectionConfig,
} from '../features/board-simulator/fullBoard';
import { hideExamSession } from '../services/dbQueries';
import MainLayout from '../layouts/MainLayout';
import ExamLayout from '../layouts/ExamLayout';
import { Button, Modal, Card } from '../components/ui';
import { TriangleAlert, Layers } from '../components/ui/icons';
import { setupConfig } from '../features/board-simulator/profiles';
import { toDisplaySubject } from '@ree/shared';

import { getAnalyticsProfile } from '../services/dbQueries';
import { useStore } from '../store/useStore';
import { normalizeMicroTopics } from '../services/analyticsSync';

const formatTimerMinutes = (s) => `${Math.floor(s/60).toString().padStart(2, '0')}:${(s%60).toString().padStart(2, '0')}`;

export default function BoardSimulator() {
  const { currentUser } = useAuth();
  const isOnline = useNetworkStatus();
  const engine = useSimulatorEngine(currentUser, isOnline);

  const [showTerminateModal, setShowTerminateModal] = useState(false);

  // Full PRC board (features/board-simulator/fullBoard): three sections on one
  // server session, results withheld until the last. `board` is the between-
  // section state; the engine runs one section at a time.
  const [board, setBoard] = useState(() => loadFullBoard());
  // An unfinished board no longer takes over the setup screen: setup shows a
  // banner, and its break screen opens only when asked (or right after a
  // section). It used to replace setup for up to seven days, so a format
  // picked on the Exams hub was ignored.
  const [boardOpen, setBoardOpen] = useState(false);
  const lastSection = FULL_BOARD_SECTIONS.length - 1;
  const boardSection = engine.config.fullBoard?.sectionIndex;
  const sectionJustFinished = engine.session.isFinished && engine.config.fullBoard;
  // Reload the board state whenever a section lands (the engine banks it).
  useEffect(() => {
    if (sectionJustFinished) setBoard(loadFullBoard());
  }, [sectionJustFinished]);

  // A finished board left in storage (the tab closed on the result screen) is
  // done — its result is in mock history; don't leave it masquerading as pending.
  useEffect(() => {
    if (board && board.sectionIndex > lastSection && !sectionJustFinished) {
      clearFullBoard();
      setBoard(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginFullBoard = () => {
    const fresh = startFullBoard(crypto.randomUUID());
    setBoard(fresh);
    engine.startSimulation(sectionConfig(fresh));
  };
  const continueFullBoard = () => {
    const current = loadFullBoard();
    if (!current) { setBoard(null); return; }
    setBoard(current);
    engine.startSimulation(sectionConfig(current));
  };
  const abandonFullBoard = () => {
    const current = loadFullBoard();
    clearFullBoard();
    setBoard(null);
    setBoardOpen(false);
    // Its finished sections still count in analytics; keep the half-board out
    // of mock history, where it would read as a failed sitting.
    if (current?.sessionId) hideExamSession(current.sessionId).catch(() => {});
    engine.resetToSetup();
  };
  const leaveBoardResults = () => {
    clearFullBoard();
    setBoard(null);
    setBoardOpen(false);
  };
  // The saved draft resumes from the break only if it is THIS board's section;
  // "Resume the section in progress" used to resume any mock left on the device.
  const draftMeta = engine.hasSavedSession ? engine.savedDraftMeta() : null;
  const boardDraft = !!board && draftMeta?.fullBoard?.sessionId === board.sessionId
    && draftMeta?.fullBoard?.sectionIndex === board.sectionIndex;

  // Which screen: a mid-board break (results withheld), the board result, or
  // the ordinary single-sitting flow.
  const showBoardBreak = !!board && board.sectionIndex <= lastSection && (
    (sectionJustFinished && boardSection < lastSection)
    || (boardOpen && !engine.session.isActive && !engine.session.isFinished)
  );
  const showBoardBanner = !!board && board.sectionIndex <= lastSection && !showBoardBreak
    && !engine.session.isActive && !engine.session.isFinished;
  const showBoardResult = !!sectionJustFinished && boardSection === lastSection;

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // A retake of a past sitting's misses (pages/SittingReview): the questions
  // come in router state, checked against the signed-in account, then the
  // state is cleared so Back doesn't start it again.
  const retakeStarted = useRef(false);
  useEffect(() => {
    const retake = location.state?.retake;
    if (!retake || retakeStarted.current) return;
    retakeStarted.current = true;
    navigate(location.pathname, { replace: true, state: null });
    if (!currentUser?.uid || retake.ownerUid !== currentUser.uid || !Array.isArray(retake.questions) || retake.questions.length === 0) return;
    const subjects = new Set(retake.questions.map((q) => q.subject));
    engine.startSimulation({
      ...setupConfig(engine.config),
      mode: 'subject',
      subject: subjects.size === 1 ? [...subjects][0] : 'Mixed',
      isPrcStandard: false,
      count: retake.questions.length,
      source: 'retake',
      cognitiveFocus: 'mixed',
      retake: { sourceSessionId: retake.sourceSessionId || null },
      retakeQuestions: retake.questions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const activeBattleId = engine.config.battleId || searchParams.get('battleId');
  const { connected: battleConnected, opponentProgress, graded, answerKey, explanationKey, sendAnswer, submitResult, submitPending: battleSubmitPending } = useBattleSocket(activeBattleId);

  // Leaving the review for setup: a clean config (no battle id, board section
  // or retake), and the battle id out of the URL, which otherwise kept the
  // battle socket open and the next mock waiting on it.
  const exitReview = () => {
    if (showBoardResult) leaveBoardResults();
    engine.resetToSetup();
    if (searchParams.get('battleId')) setSearchParams({}, { replace: true });
  };

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
      // getElapsedMs: every Battle attempt in production recorded
      // timeSpentMs=0 (100%, confirmed against the live DB) — sendAnswer's
      // parameter defaulted to 0 and this call site never passed anything,
      // because the engine's internal timing ref wasn't exposed at all until
      // now. Number(idx) since Object.entries keys are strings.
      if (q?.id) sendAnswer(q.id, ans, engine.session.confidences?.[idx] || 'MED', engine.getElapsedMs(Number(idx)));
    }
  }, [engine.session.answers, activeBattleId, battleConnected]);

  // Bookmark persistence lives in the engine's toggleBookmark (it owns the
  // in-exam bookmark Set + draft), so it saves to /api/bookmarks directly —
  // no separate handler is threaded down here.

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

  // battle-complete revealed the answer + explanation keys — unlock the full
  // per-question review (correct answers, offline solutions, blind spots),
  // then refetch the canonical analytics so the dashboard is fresh the
  // moment the user navigates there (mirrors the gauntlet's post-grade
  // refetch).
  useEffect(() => {
    if (activeBattleId && answerKey && engine.session.isFinished) {
      engine.applyBattleGrades(answerKey, explanationKey);
      if (currentUser?.uid) {
        getAnalyticsProfile(currentUser.uid).then((fresh) => {
          if (fresh?.data) {
            useStore.getState().setStats({
              ...useStore.getState().stats,
              ...fresh.data.profile,
              activityCalendar: fresh.data.activityCalendar,
              microTopics: normalizeMicroTopics(fresh.data.microTopics, useStore.getState().dynamicTOS),
              matrix: fresh.data.matrix,
            });
          }
        }).catch(() => {});
      }
    }
  }, [answerKey, explanationKey, activeBattleId, engine.session.isFinished]);

  // Layout is chosen HERE, not by the route (App.jsx doesn't wrap this page
  // in either layout). Only a running exam gets the distraction-free
  // ExamLayout and its "exam in progress" banner. Setup, the break between
  // full-board sections and the results get the normal app chrome: the
  // results used to keep the red exam banner after the exam had ended.
  const inExamMode = engine.session.isActive && !engine.session.isFinished && !showBoardBreak;
  const Layout = inExamMode ? ExamLayout : MainLayout;

  // Switching layouts remounts the page body; start the results at the top,
  // not at the last question's scroll position.
  useEffect(() => {
    if (engine.session.isFinished) window.scrollTo?.(0, 0);
  }, [engine.session.isFinished]);

  const content = (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">

      {activeBattleId && battleConnected && opponentProgress.length > 0 && engine.session.isActive && !engine.session.isFinished && (
        <div className="bg-surface border border-reeRed/30 rounded-xl p-4 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-reeRed-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-reeGreen animate-pulse"></span> Live Opponents
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {opponentProgress.map(op => (
              <div key={op.id} className="bg-bg border border-border2 rounded-lg px-3 py-2 flex items-center gap-3">
                <span className="text-xs font-bold text-textMain truncate max-w-[120px]">{op.displayName}</span>
                <span className="text-xs font-mono text-reeCyan-text">{op.itemsAnswered} ans</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBoardBreak && (
        <FullBoardBreak
          board={board}
          hasDraft={boardDraft && !engine.session.isActive}
          loading={engine.session.loading}
          onContinue={continueFullBoard}
          onResumeDraft={engine.resumeSimulation}
          onAbandon={abandonFullBoard}
          onBack={sectionJustFinished ? undefined : () => setBoardOpen(false)}
        />
      )}

      {showBoardBanner && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" role="region" aria-label="Full PRC board in progress">
          <div className="flex items-start gap-3">
            <Layers size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--accent-text)' }} />
            <div>
              <p className="text-sm font-medium text-textMain">You have a full PRC board in progress</p>
              <p className="text-xs text-muted2">
                {board.sectionIndex} of {FULL_BOARD_SECTIONS.length} sections done. Next: {toDisplaySubject(FULL_BOARD_SECTIONS[board.sectionIndex])}.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setBoardOpen(true)}>Continue the board</Button>
        </Card>
      )}

      {showBoardResult && board && <FullBoardResults board={board} />}

      {!showBoardBreak && !engine.session.isActive && !engine.session.isFinished && (
        <SimulatorConfig
            initialProfile={searchParams.get('profile')}
            onStartFullBoard={beginFullBoard}
            config={engine.config}
            setConfig={engine.setConfig}
            session={engine.session}
            startSimulation={engine.startSimulation}
            engine={engine}
        />
      )}

      {engine.session.isFinished && !showBoardBreak && (
        <SimulatorDiagnostics
            onExit={showBoardResult ? leaveBoardResults : undefined}
            headingLevel={showBoardResult ? 2 : 1}
            session={engine.session}
            engine={engine}
            isBattle={!!activeBattleId}
            submitPending={!!activeBattleId && battleSubmitPending}
        />
      )}

      {(engine.session.isActive || engine.session.isFinished) && !showBoardBreak && (
        <div className={engine.session.isFinished ? "mt-4" : ""}>
          <SimulatorActive
            engine={engine}
            formatTime={formatTimerMinutes}
            requestTerminate={() => setShowTerminateModal(true)}
            onExitReview={exitReview}
            isOnline={isOnline}
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

  return <Layout>{content}</Layout>;
}