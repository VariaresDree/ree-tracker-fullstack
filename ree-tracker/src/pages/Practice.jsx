// src/pages/Practice.jsx
//
// Practice: the setup screen (presets, due reviews, a custom session), the
// running session, and the summary when it ends. Other screens start a
// session here with launchPractice(navigate, preset).
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import LatexRenderer from '../components/LatexRenderer';
import Scratchpad from '../components/Scratchpad';
import { Button, Badge, StatusPill, Card, Modal } from '../components/ui';
import { Pencil, Flag, Bookmark } from '../components/ui/icons';
import ReviewSetup from '../features/active-recall/ReviewSetup';
import SessionSummary from '../features/active-recall/SessionSummary';
import { drillPreset } from '../features/active-recall/presets';
import MCQMode from '../features/active-recall/MCQMode';
import FlashcardMode from '../features/active-recall/FlashcardMode';
import { useReviewSession } from '../features/active-recall/useReviewSession';
import SolutionPanel from '../features/quiz/SolutionPanel';
import { explanationKey } from '../services/aiExplanations';
import { shouldIgnoreHotkey } from '../utils/hotkeys';
import { formatClock } from '../utils/time';

export default function Practice() {
  const isOnline = useNetworkStatus();
  const { currentUser } = useAuth();
  
  const {
    config, setConfig, session, setSession, elapsedTime, bookmarks,
    startSession, endSession, loadNextQuestion, 
    handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating,
    toggleBookmark, handleFlagQuestion, explainQuestion, safeTOS, isSubmitting,
    lastSummary, clearSummary, aiText, aiLoading,
  } = useReviewSession(currentUser, isOnline);

  const [showScratchpad, setShowScratchpad] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const currentQ = session.questions[session.currentIndex];

  // Deep links (Today's next steps, Progress, the planner) navigate here with a
  // session preset in router state. Auto-start once, then clear the state so
  // back-navigation doesn't relaunch it.
  const location = useLocation();
  const navigate = useNavigate();
  const presetLaunched = useRef(false);
  // A session launched from another page shows "Starting…" until it opens;
  // the setup form used to flash up first, as if the tap had gone nowhere.
  const [launchingPreset, setLaunchingPreset] = useState(() => !!location.state?.preset);
  useEffect(() => {
    const preset = location.state?.preset;
    if (!preset || presetLaunched.current) return;
    presetLaunched.current = true;
    navigate(location.pathname, { replace: true, state: null });
    const launch = session.isActive || session.loading ? Promise.resolve() : startSession(preset);
    Promise.resolve(launch).finally(() => setLaunchingPreset(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (!session.isActive || !currentQ || showScratchpad || confirmEnd || shouldIgnoreHotkey(e)) return;
        const key = e.key.toLowerCase();
        // Enter on a focused button already activates it. Handling it here as
        // well advanced the question, and then the button's own click landed
        // on the next one.
        if (key === 'enter' && e.target?.closest?.('button, a, [role="button"]')) return;

        // MCQ option (1-4 / A-D) and confidence (Q/W/E) keys belong to
        // QuestionCard, which MCQMode renders with `hotkeys`. They were ALSO
        // bound here, so both listeners fired on one keypress and each staged an
        // attempt under its own uuid — every keyboard answer was stored twice.
        // The page keeps only what QuestionCard does not own: advancing.
        if (config.sessionMode === 'mcq') {
            if (session.isAnswered && (key === 'enter' || key === 'arrowright')) {
                loadNextQuestion();
            }
        }

        if (config.sessionMode === 'flashcard') {
            if (key === ' ' && !session.isFlipped) {
                e.preventDefault(); 
                handleFlashcardReveal();
            } else if (session.isFlipped && !session.isAnswered) {
                if (key === '1') handleFlashcardRating('again');
                if (key === '2') handleFlashcardRating('hard');
                if (key === '3') handleFlashcardRating('good');
                if (key === '4') handleFlashcardRating('easy');
            } else if (session.isAnswered && (key === 'enter' || key === 'arrowright')) {
                loadNextQuestion();
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, config.sessionMode, showScratchpad, confirmEnd, currentQ, handleFlashcardReveal, handleFlashcardRating, loadNextQuestion]);


  if (launchingPreset && !session.isActive) {
      return (
        <div role="status" className="flex flex-col items-center justify-center gap-4 h-[60vh] text-[var(--accent-text)]">
          <span className="telemetry-spinner !w-10 !h-10 border-t-transparent" aria-hidden="true"></span>
          <span className="text-sm font-semibold">Starting your session…</span>
        </div>
      );
  }

  if (!session.isActive && lastSummary) {
      return (
        <SessionSummary
          summary={lastSummary}
          isOnline={isOnline}
          loading={session.loading}
          onAgain={() => startSession(lastSummary.config)}
          onDrill={(t) => startSession(drillPreset({ topic: t.topic, subject: t.subject }))}
          onDone={clearSummary}
        />
      );
  }

  if (!session.isActive) {
      return <ReviewSetup config={config} setConfig={setConfig} isOnline={isOnline} startSession={startSession} session={session} safeTOS={safeTOS} />;
  }

  if (!currentQ) return <div className="flex justify-center items-center h-64 text-[var(--accent-text)]"><span className="telemetry-spinner !w-12 !h-12"></span></div>;

  const isBookmarked = bookmarks.has(currentQ.id);

  const isLastQuestion = session.currentIndex + 1 >= session.questions.length;

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 max-w-4xl mx-auto w-full relative z-0">
      <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />
      <Modal
        open={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End this session?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmEnd(false)}>Keep going</Button>
            <Button onClick={() => { setConfirmEnd(false); endSession(); }}>End and see summary</Button>
          </>
        }
      >
        <p className="text-sm text-textMain">
          You’ve answered {session.totalAnswered} of {session.questions.length}. Your answers are saved; the rest of the questions are skipped.
        </p>
      </Modal>

      <div className="flex justify-between items-center bg-surface/60 backdrop-blur-xl border border-border2/50 px-4 py-3 rounded-full shadow-sm z-10">
        <Button variant="ghost" tone="danger" size="sm" onClick={() => (session.totalAnswered > 0 ? setConfirmEnd(true) : endSession())} disabled={isSubmitting}>
            End session
        </Button>
        <div className="flex items-center gap-3">
            <StatusPill tone="success" className="hidden sm:inline-flex">Hotkeys on</StatusPill>
            <Badge tone={config.sessionMode === 'mcq' ? 'velocity' : 'signal'}>
                {config.sessionMode === 'mcq' ? 'MCQ' : 'Flashcards'}
            </Badge>
            {/* Labelled: a bare "02:41" didn't say it was this question's time,
                or why it turns red (past three minutes, the board's slowest
                pace). */}
            <div className="flex flex-col items-end leading-tight">
                <span className="text-[11px] text-muted2">This question</span>
                <span
                  className={`text-sm font-bold font-mono tabular-nums ${elapsedTime > 180 ? 'text-[var(--accent-danger)]' : 'text-textMain'}`}
                  title={elapsedTime > 180 ? 'Over three minutes on this question' : undefined}
                >
                  {formatClock(elapsedTime, { pad: true })}
                </span>
            </div>
        </div>
      </div>

      <Card elevated className="p-6 sm:p-10 rounded-[var(--radius-xl)] flex flex-col relative overflow-hidden transition-colors duration-700">

          {/* Prompt + subject eyebrow + Item N badge are owned by QuestionCard
              (inside MCQMode below) — the standalone block that used to live
              here rendered them a second time, hence the visible duplicate.
              Item action icons (scratchpad / flag / bookmark) are injected
              through QuestionCard's `headerSlot` so they sit next to the
              eyebrow with no overlap. */}

          {config.sessionMode === 'mcq' ? (
              <MCQMode
                  session={session}
                  setSession={setSession}
                  handleAnswerSelection={handleAnswerSelection}
                  index={session.currentIndex}
                  headerSlot={
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setShowScratchpad(!showScratchpad)} aria-label="Open scratchpad" className="text-muted hover:text-textMain">
                        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                      </Button>
                      <Button size="icon" variant="ghost" tone="danger" onClick={handleFlagQuestion} disabled={currentQ.isFlagged} aria-label={currentQ.isFlagged ? 'Already flagged' : 'Flag question'} className={currentQ.isFlagged ? '' : 'text-muted'}>
                        <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
                      </Button>
                      <Button size="icon" variant="ghost" tone="amber" onClick={toggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'} className={isBookmarked ? '' : 'text-muted'}>
                        <Bookmark size={16} strokeWidth={1.75} fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
                      </Button>
                    </div>
                  }
              />
          ) : (
              // Flashcard mode still has its own flip surface; the prompt
              // rendering there is handled inside FlashcardMode.
              <>
                  <div className="text-xl sm:text-2xl font-medium text-textMain leading-relaxed relative z-10 mb-10 overflow-x-auto math-scroll-mobile drop-shadow-sm [&_p]:!m-0 [&_.katex-display]:!m-0 [&_.katex-display]:!py-0">
                      <LatexRenderer content={currentQ.text || currentQ.question} />
                  </div>
                  <FlashcardMode session={session} handleFlashcardReveal={handleFlashcardReveal} handleFlashcardRating={handleFlashcardRating} />
              </>
          )}

          {session.isAnswered && (
              <div className="mt-10 pt-8 border-t border-border2/40 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 relative z-10">
                  
                  <SolutionPanel
                      key={explanationKey(currentQ)}
                      question={currentQ}
                      isOnline={isOnline}
                      aiText={aiText}
                      aiLoading={aiLoading}
                      onExplain={(force) => explainQuestion(currentQ, { force })}
                  />

                  <div className="flex justify-between items-center mt-4 gap-3 flex-wrap">
                      <div className="text-eyebrow bg-surface2/50 border border-border2/60 px-4 py-2 rounded-full">
                          Correct: <span className="text-sm" style={{ color: 'var(--accent-success)' }}>{session.correctHits}</span> / {session.totalAnswered}
                      </div>

                      <Button tone={isLastQuestion ? 'success' : 'accent'} size="lg" onClick={loadNextQuestion}>
                          {isLastQuestion ? 'Finish session' : 'Next question'}
                      </Button>
                  </div>
              </div>
          )}
      </Card>
    </div>
  );
}