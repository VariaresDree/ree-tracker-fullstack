// src/pages/ActiveReview.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import LatexRenderer from '../components/LatexRenderer';
import Scratchpad from '../components/Scratchpad';
import { Button, Badge, StatusPill, Card } from '../components/ui';
import { Pencil, Flag, Bookmark, Sparkles } from '../components/ui/icons';
import ReviewSetup from '../features/active-recall/ReviewSetup';
import MCQMode from '../features/active-recall/MCQMode';
import FlashcardMode from '../features/active-recall/FlashcardMode';
import { useReviewSession } from '../features/active-recall/useReviewSession';

export default function ActiveReview() {
  const isOnline = useNetworkStatus();
  const { currentUser } = useAuth();
  
  const {
    config, setConfig, session, setSession, elapsedTime, bookmarks,
    startSession, endSession, loadNextQuestion, 
    handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating,
    toggleBookmark, handleFlagQuestion, fetchOrToggleAI, safeTOS, isSubmitting
  } = useReviewSession(currentUser, isOnline);

  const [showScratchpad, setShowScratchpad] = useState(false);
  const currentQ = session.questions[session.currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (!session.isActive || !currentQ || showScratchpad) return;
        const key = e.key.toLowerCase();

        if (config.sessionMode === 'mcq') {
            if (!session.isAnswered) {
                if (key === 'q') setSession(prev => ({ ...prev, confidence: 'LOW' }));
                if (key === 'w') setSession(prev => ({ ...prev, confidence: 'MED' }));
                if (key === 'e') setSession(prev => ({ ...prev, confidence: 'HIGH' }));

                if (session.confidence) {
                    if (key === '1' && currentQ.options?.[0]) handleAnswerSelection(currentQ.options[0]);
                    if (key === '2' && currentQ.options?.[1]) handleAnswerSelection(currentQ.options[1]);
                    if (key === '3' && currentQ.options?.[2]) handleAnswerSelection(currentQ.options[2]);
                    if (key === '4' && currentQ.options?.[3]) handleAnswerSelection(currentQ.options[3]);
                }
            } else if (key === 'enter' || key === 'arrowright') {
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
  }, [session, config.sessionMode, showScratchpad, currentQ, handleAnswerSelection, handleFlashcardReveal, handleFlashcardRating, loadNextQuestion, setSession]);

  const formatTime = (secs) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  if (!session.isActive) {
      return <ReviewSetup config={config} setConfig={setConfig} isOnline={isOnline} startSession={startSession} session={session} safeTOS={safeTOS} />;
  }

  if (!currentQ) return <div className="flex justify-center items-center h-64 text-[var(--accent)]"><span className="telemetry-spinner !w-12 !h-12"></span></div>;

  const isBookmarked = bookmarks.has(currentQ.id);

  // 🚀 FIXED: Dynamic Check for the Last Question in the Session
  const isLastQuestion = session.currentIndex + 1 >= session.questions.length;

  return (
    <div className="flex flex-col gap-6 page-fade-in pb-12 max-w-4xl mx-auto w-full relative z-0">
      <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />

      <div className="flex justify-between items-center bg-surface/60 backdrop-blur-xl border border-border2/50 px-4 py-3 rounded-full shadow-sm z-10">
        <Button variant="ghost" tone="danger" size="sm" onClick={endSession} disabled={isSubmitting}>
            End session
        </Button>
        <div className="flex items-center gap-3">
            <StatusPill tone="success" className="hidden sm:inline-flex">Hotkeys on</StatusPill>
            <Badge tone={config.sessionMode === 'mcq' ? 'velocity' : 'signal'}>
                {config.sessionMode === 'mcq' ? 'MCQ' : 'Flashcards'}
            </Badge>
            <div className={`text-sm font-bold font-mono tabular-nums w-14 text-right ${elapsedTime > 180 ? 'text-[var(--accent-danger)] animate-pulse' : 'text-textMain'}`}>
                {formatTime(elapsedTime)}
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
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                      {currentQ.fixedExplanation && (
                          <Button variant="secondary" className="flex-1" onClick={() => setSession(p => ({ ...p, showOffline: !p.showOffline, showAi: false }))}>
                              {session.showOffline ? 'Hide solution' : 'Show solution'}
                          </Button>
                      )}
                      <Button
                          variant="outline"
                          className="flex-1"
                          onClick={fetchOrToggleAI}
                          loading={session.aiLoading}
                          disabled={session.aiLoading || (!isOnline && !currentQ.cachedExplanation)}
                          title={!isOnline && !currentQ.cachedExplanation ? 'Needs a connection' : undefined}
                      >
                          {!session.aiLoading && <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />}
                          Explain with AI
                      </Button>
                  </div>

                  {session.showOffline && currentQ.fixedExplanation && (
                      <div className="p-6 rounded-[var(--radius-lg)] bg-surface2/40 border shadow-inner" style={{ borderColor: 'color-mix(in srgb, var(--accent-signal) 30%, transparent)' }}>
                          <div className="text-eyebrow mb-3" style={{ color: 'var(--accent-signal)' }}>Solution</div>
                          <div className="text-sm text-textMain/90 leading-relaxed [&_p]:!m-0 [&_.katex-display]:!m-0"><LatexRenderer content={currentQ.fixedExplanation} /></div>
                      </div>
                  )}

                  {session.showAi && session.aiResponse && (
                      <div className="p-6 rounded-[var(--radius-lg)] bg-surface2/40 border shadow-inner" style={{ borderColor: 'color-mix(in srgb, var(--accent-velocity) 30%, transparent)' }}>
                          <div className="text-eyebrow mb-3 flex items-center gap-2" style={{ color: 'var(--accent-velocity)' }}>
                              <Sparkles size={12} strokeWidth={2} aria-hidden="true" /> AI explanation
                          </div>
                          <div className="text-sm text-textMain/90 leading-relaxed [&_p]:!m-0 [&_.katex-display]:!m-0"><LatexRenderer content={session.aiResponse} /></div>
                      </div>
                  )}

                  <div className="flex justify-between items-center mt-4 gap-3 flex-wrap">
                      <div className="text-eyebrow bg-surface2/50 border border-border2/60 px-4 py-2 rounded-full">
                          Correct: <span className="text-sm" style={{ color: 'var(--accent-success)' }}>{session.correctHits}</span> / {session.totalAnswered}
                      </div>

                      {/* 🚀 FIXED: Dynamic Button sets accurate psychological expectation */}
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