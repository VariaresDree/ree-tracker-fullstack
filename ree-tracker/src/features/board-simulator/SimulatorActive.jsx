// src/features/board-simulator/SimulatorActive.jsx
//
// Board Simulator (and Combat / multiplayer) answering surface. Owns the
// exam-mode chrome — top toolbar, 1-100 question navigator, scratchpad,
// bookmark/flag controls, post-exam solutions (offline + AI), action nav.
// The actual prompt + confidence selector + choices + correct/incorrect
// reveal are delegated to the shared QuestionCard so this surface stays in
// lockstep with Active Review and Gauntlet.

import { useState, useEffect, useRef } from 'react';
import Scratchpad from '../../components/Scratchpad';
import QuestionCard from '../quiz/QuestionCard';
import { Button, Modal, StatusPill, Badge } from '../../components/ui';
import { Pencil, Flag, Bookmark, TriangleAlert, Check, X } from '../../components/ui/icons';
import ExamClock from '../../components/exam/ExamClock';
import { shouldIgnoreHotkey } from '../../utils/hotkeys';
import { useAuth } from '../../contexts/AuthContext';
import { useAiExplanation } from '../quiz/useAiExplanation';
import SolutionPanel from '../quiz/SolutionPanel';
import { explanationKey } from '../../services/aiExplanations';

export default function SimulatorActive({ engine, requestTerminate, isOnline }) {
  const {
    session, currentIndex, handleIndexChange, examEndTime, showTime, setShowTime,
    handleSelectConfidence, handleSelectOption, bookmarks, toggleBookmark,
    handleFlagQuestion, submitExam,
  } = engine;

  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Post-exam explanations, kept per question (features/quiz/useAiExplanation).
  const { currentUser } = useAuth();
  const ai = useAiExplanation(currentUser?.uid);

  const navScrollRef = useRef(null);

  const q = session.questions[currentIndex];
  const userAns = session.answers[currentIndex];
  const isReview = session.isFinished;
  const isCorrect = isReview ? userAns === q?.answer : false;
  const totalQuestions = session.questions.length;
  const isBookmarked = bookmarks.has(currentIndex);
  // `isCriticalTime` used to be derived here from a per-second value, which is
  // what dragged this whole component — and the KaTeX subtree and the ~100-button
  // navigator below it — into a re-render every second. ExamClock owns both the
  // countdown and its critical styling now.

  // Keep the active question centered in the horizontal navigator
  useEffect(() => {
    if (navScrollRef.current) {
      const activeBtn = navScrollRef.current.querySelector(`[data-index="${currentIndex}"]`);
      if (activeBtn) {
        const container = navScrollRef.current;
        const scrollTarget = activeBtn.offsetLeft - container.offsetWidth / 2 + activeBtn.offsetWidth / 2;
        container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      }
    }
  }, [currentIndex]);

  // The local time formatter is gone with the inline clock — ExamClock uses the
  // shared formatExamTime helper, so the Gauntlet and the Board Simulator now
  // render the countdown through exactly one implementation.

  useEffect(() => {
    if (!isReview && totalQuestions > 0) {
      const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isReview, totalQuestions]);

  // Simulator-owned keyboard handler — arrow keys for question nav, plus
  // confidence (Q/W/E) and option hotkeys (1-4 / A-D). QuestionCard's own
  // hotkeys prop is OFF here to avoid double-binding.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (shouldIgnoreHotkey(e) || showScratchpad || showSubmitConfirm) return;
      const key = e.key.toLowerCase();

      if (key === 'arrowleft') { if (currentIndex > 0) handleIndexChange(currentIndex - 1); return; }
      if (key === 'arrowright') { if (currentIndex < totalQuestions - 1) handleIndexChange(currentIndex + 1); return; }

      if (!isReview && q) {
        if (key === 'q') handleSelectConfidence('LOW');
        if (key === 'w') handleSelectConfidence('MED');
        if (key === 'e') handleSelectConfidence('HIGH');
        if (['1', 'a'].includes(key) && q.options?.[0]) handleSelectOption(q.options[0]);
        if (['2', 'b'].includes(key) && q.options?.[1]) handleSelectOption(q.options[1]);
        if (['3', 'c'].includes(key) && q.options?.[2]) handleSelectOption(q.options[2]);
        if (['4', 'd'].includes(key) && q.options?.[3]) handleSelectOption(q.options[3]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, totalQuestions, isReview, showScratchpad, showSubmitConfirm, q, handleSelectConfidence, handleSelectOption, handleIndexChange]);

  if (!q) return <div className="flex justify-center p-12 text-[var(--accent-text)]"><span className="telemetry-spinner !w-12 !h-12"></span></div>;

  // Per-question action icons (scratchpad / flag / bookmark) — injected into
  // QuestionCard's headerSlot so they sit next to the subject eyebrow.
  const itemActions = (
    <div className="flex gap-2">
      <Button size="icon" variant="ghost" onClick={() => setShowScratchpad(!showScratchpad)} aria-label="Toggle scratchpad" className="text-muted hover:text-textMain">
        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" tone="danger" onClick={handleFlagQuestion} disabled={q?.isFlagged} aria-label={q?.isFlagged ? 'Already flagged' : 'Flag question'} className={q?.isFlagged ? '' : 'text-muted'}>
        <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" tone="amber" onClick={() => toggleBookmark(currentIndex)} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'} className={isBookmarked ? '' : 'text-muted'}>
        <Bookmark size={16} strokeWidth={1.75} fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <>
      <h1 className="sr-only">{isReview ? 'Mock board review' : 'Mock board in progress'}</h1>
      {/* Submit confirmation */}
      <Modal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        tone="danger"
        icon={TriangleAlert}
        title="Submit exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)}>Keep working</Button>
            <Button tone="danger" onClick={() => { setShowSubmitConfirm(false); submitExam(); }}>Submit exam</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          You can't change your answers after submitting. Your diagnostics report will be generated right away.
        </p>
      </Modal>

      <div className={`flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-500 pb-12 z-0 relative transition-all duration-500 origin-center ${showSubmitConfirm ? 'scale-95 blur-md opacity-40 pointer-events-none' : 'scale-100 blur-none opacity-100'}`}>

        {/* Top toolbar — exit / hotkey status / answered count / timer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface/90 backdrop-blur-xl border border-border2/60 px-4 py-3 rounded-[var(--radius-lg)] shadow-sm sticky top-[var(--sticky-top,calc(max(0.5rem,env(safe-area-inset-top))+2.25rem))] z-50">
          {!isReview ? (
            <Button variant="ghost" tone="danger" size="sm" onClick={requestTerminate}>
              Exit exam
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => engine.setSession((prev) => ({ ...prev, isFinished: false, isActive: false, questions: [] }))}>
              Exit review
            </Button>
          )}

          <div className="flex items-center gap-3">
            <StatusPill tone="success" className="hidden sm:inline-flex">Hotkeys on</StatusPill>
            <Badge tone="velocity" className="hidden sm:inline-flex tabular-nums">
              {isReview ? 'Review mode' : `${Object.keys(session.answers).length} of ${totalQuestions} answered`}
            </Badge>

            {!isReview && (
              <ExamClock
                endTime={examEndTime}
                showTime={showTime}
                onToggleTime={() => setShowTime(!showTime)}
              />
            )}
          </div>
        </div>

        {/* Horizontal 1-N navigator */}
        <div className="bg-surface/80 backdrop-blur-md border border-border2/50 rounded-2xl p-4 shadow-sm relative z-10">
          <div
            ref={navScrollRef}
            className="flex overflow-x-auto gap-2.5 pb-4 items-center px-2 scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-surface2/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-500/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400 transition-all"
          >
            {session.questions.map((_, idx) => {
              const isAnswered = !!session.answers[idx];
              const isCurrent = idx === currentIndex;
              const isMarked = bookmarks.has(idx);
              // Review mode encodes correct/incorrect — expose it beyond color
              // (WCAG 1.4.1) via a ✓/✗ glyph and the aria-label, so color-blind
              // and screen-reader users can tell which items they missed.
              const reviewState = !isReview ? null
                : (!session.answers[idx] ? 'skipped'
                  : session.answers[idx] === session.questions[idx].answer ? 'correct' : 'incorrect');

              let btnClass = 'bg-surface2/30 border-border2/40 text-muted hover:border-textMain/40 hover:text-textMain';
              if (!isReview) {
                if (isAnswered) btnClass = 'bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border-[color-mix(in_srgb,var(--accent)_40%,transparent)] text-[var(--accent-text)] font-bold shadow-sm';
                if (isCurrent) btnClass = 'bg-[var(--accent)] border-[var(--accent)] text-white font-bold elevate-1 scale-110';
              } else {
                const ans = session.answers[idx];
                if (!ans) btnClass = 'bg-surface/40 border-border2/30 text-muted opacity-50';
                else if (ans === session.questions[idx].answer) btnClass = 'bg-[color-mix(in_srgb,var(--accent-success)_10%,transparent)] border-[color-mix(in_srgb,var(--accent-success)_40%,transparent)] text-[var(--accent-success)] font-bold shadow-sm';
                else btnClass = 'bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)] border-[color-mix(in_srgb,var(--accent-danger)_40%,transparent)] text-[var(--accent-danger)] font-bold shadow-sm';
                if (isCurrent) btnClass += ' border-[2px] border-textMain scale-110 z-10 opacity-100';
              }

              return (
                <button
                  key={idx}
                  data-index={idx}
                  onClick={() => handleIndexChange(idx)}
                  aria-label={`Go to item ${idx + 1}${reviewState ? `, ${reviewState}` : ''}`}
                  className={`w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 shrink-0 rounded-[var(--radius-default)] border text-xs transition-all duration-300 cursor-pointer flex items-center justify-center relative ${btnClass}`}
                >
                  {idx + 1}
                  {reviewState === 'correct' && <Check aria-hidden strokeWidth={3} className="absolute -bottom-1 -left-1 w-3 h-3" style={{ color: 'var(--accent-success)' }} />}
                  {reviewState === 'incorrect' && <X aria-hidden strokeWidth={3} className="absolute -bottom-1 -left-1 w-3 h-3" style={{ color: 'var(--accent-danger)' }} />}
                  {isMarked && <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-surface shadow-sm" style={{ background: 'var(--color-reeAmber)' }}></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Exam canvas: QuestionCard owns the prompt + confidence + choices + reveal */}
        <div
          className="p-6 sm:p-10 bg-surface/90 backdrop-blur-2xl border rounded-[var(--radius-xl)] elevate-2 flex flex-col relative overflow-hidden transition-colors duration-700"
          style={{
            borderColor: isReview
              ? `color-mix(in srgb, ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'} 30%, transparent)`
              : 'var(--border-light)',
          }}
        >
          <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />

          <QuestionCard
            question={q}
            selectedOption={userAns ?? null}
            confidence={session.confidences[currentIndex] ?? null}
            state={isReview ? 'reviewing' : 'answering'}
            showConfidence={true}
            requireConfidence={false}
            hotkeys={false}
            index={currentIndex}
            onSelect={handleSelectOption}
            onConfidenceChange={handleSelectConfidence}
            headerSlot={itemActions}
          />

          {/* ReferencePanel intentionally NOT rendered during the answer
              phase — Reference Constants would function as a cheat code that
              undermines the simulator's calibration analytics. */}

          {/* Post-exam solutions */}
          {isReview && (
            <div className="mt-8 pt-8 border-t border-border2/40 animate-in fade-in slide-in-from-bottom-2">
              <SolutionPanel
                key={explanationKey(q)}
                question={q}
                isOnline={isOnline}
                aiText={ai.textFor(q)}
                aiLoading={ai.isLoading(q)}
                onExplain={(force) => ai.explain(q, { force })}
                showAnswer
              />
            </div>
          )}

          {/* Action navigation */}
          <div className="flex justify-between items-center pt-8 mt-4 border-t border-border2/50 gap-3">
            <Button variant="secondary" onClick={() => handleIndexChange(currentIndex - 1)} disabled={currentIndex === 0}>
              Previous
            </Button>

            {!isReview && currentIndex === totalQuestions - 1 ? (
              <Button tone="danger" size="lg" onClick={() => setShowSubmitConfirm(true)}>
                Submit exam
              </Button>
            ) : (
              <Button onClick={() => handleIndexChange(currentIndex + 1)} disabled={currentIndex === totalQuestions - 1}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
