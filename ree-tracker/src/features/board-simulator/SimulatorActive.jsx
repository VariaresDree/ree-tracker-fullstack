// src/features/board-simulator/SimulatorActive.jsx
//
// Board Simulator (and battle) answering surface. Owns the exam chrome — the
// toolbar (submit, answered count, pace, clock), the navigator (a 1-N strip or
// the PRC answer sheet), the scratchpad, the per-item actions (mark for
// review, report, save to bookmarks), the post-exam solutions and the
// previous/next row. The prompt, confidence, choices and reveal are the shared
// QuestionCard, so this stays in step with Practice and the Gauntlet.

import { useState, useEffect } from 'react';
import Scratchpad from '../../components/Scratchpad';
import QuestionCard from '../quiz/QuestionCard';
import { Button, StatusPill, Badge, QuestionSurface, StickyToolbar } from '../../components/ui';
import { Pencil, Flag, Bookmark, Pin } from '../../components/ui/icons';
import ExamClock from '../../components/exam/ExamClock';
import ExamNavigator from '../../components/exam/ExamNavigator';
import PaceIndicator from '../../components/exam/PaceIndicator';
import { shouldIgnoreHotkey } from '../../utils/hotkeys';
import { useAuth } from '../../contexts/AuthContext';
import { useAiExplanation } from '../quiz/useAiExplanation';
import SolutionPanel from '../quiz/SolutionPanel';
import { explanationKey } from '../../services/aiExplanations';
import SubmitDialog from './SubmitDialog';

const LETTERS = ['A', 'B', 'C', 'D'];
const letterIn = (options, value) => {
  if (value == null) return null;
  const i = (options || []).indexOf(value);
  return i >= 0 && i < LETTERS.length ? LETTERS[i] : null;
};
const NO_MARKS = new Set();

export default function SimulatorActive({ engine, onExitReview, isOnline }) {
  const {
    session, currentIndex, handleIndexChange, examEndTime, showTime, setShowTime,
    handleSelectConfidence, handleSelectOption, bookmarks, toggleBookmark,
    marked = NO_MARKS, toggleMarked, examTotalSecs = 0,
    handleFlagQuestion, submitExam, isSubmitting,
  } = engine;

  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  // Post-exam explanations, kept per question (features/quiz/useAiExplanation).
  const { currentUser } = useAuth();
  const ai = useAiExplanation(currentUser?.uid);

  const q = session.questions[currentIndex];
  const userAns = session.answers[currentIndex];
  const isReview = session.isFinished;
  const isCorrect = isReview ? userAns === q?.answer : false;
  const totalQuestions = session.questions.length;
  const answeredCount = Object.values(session.answers).filter((a) => a != null).length;
  const isBookmarked = bookmarks.has(currentIndex);
  const isMarked = marked.has(currentIndex);

  useEffect(() => {
    if (!isReview && totalQuestions > 0) {
      const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isReview, totalQuestions]);

  // Simulator-owned keyboard handler — arrow keys for question nav, M to mark
  // for review, plus confidence (Q/W/E) and option hotkeys (1-4 / A-D).
  // QuestionCard's own hotkeys prop is OFF here to avoid double-binding.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (shouldIgnoreHotkey(e) || showScratchpad || showSubmit) return;
      const key = e.key.toLowerCase();

      if (key === 'arrowleft') { if (currentIndex > 0) handleIndexChange(currentIndex - 1); return; }
      if (key === 'arrowright') { if (currentIndex < totalQuestions - 1) handleIndexChange(currentIndex + 1); return; }

      if (!isReview && q) {
        if (key === 'm' && toggleMarked) { toggleMarked(currentIndex); return; }
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
  }, [currentIndex, totalQuestions, isReview, showScratchpad, showSubmit, q, handleSelectConfidence, handleSelectOption, handleIndexChange, toggleMarked]);

  if (!q) return <div className="flex justify-center p-12 text-[var(--accent-text)]"><span className="telemetry-spinner !w-12 !h-12"></span></div>;

  const unanswered = session.questions.map((_, i) => i).filter((i) => session.answers[i] == null);
  const markedList = [...marked].sort((a, b) => a - b);

  // Per-question actions, injected into QuestionCard's header slot.
  const itemActions = (
    <div className="flex gap-1.5">
      {!isReview && toggleMarked && (
        <Button
          size="icon"
          variant="ghost"
          tone="amber"
          onClick={() => toggleMarked(currentIndex)}
          aria-pressed={isMarked}
          aria-label={isMarked ? 'Unmark for review' : 'Mark for review (M)'}
          title={isMarked ? 'Unmark for review' : 'Mark for review (M)'}
          className={isMarked ? '' : 'text-muted'}
        >
          <Pin size={16} strokeWidth={1.75} fill={isMarked ? 'currentColor' : 'none'} aria-hidden="true" />
        </Button>
      )}
      <Button size="icon" variant="ghost" onClick={() => setShowScratchpad(!showScratchpad)} aria-label="Toggle scratchpad" className="text-muted hover:text-textMain">
        <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" tone="danger" onClick={handleFlagQuestion} disabled={q?.isFlagged} aria-label={q?.isFlagged ? 'Already reported' : 'Report a problem with this question'} className={q?.isFlagged ? '' : 'text-muted'}>
        <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" tone="amber" onClick={() => toggleBookmark(currentIndex)} aria-label={isBookmarked ? 'Remove from bookmarks' : 'Save to bookmarks'} className={isBookmarked ? '' : 'text-muted'}>
        <Bookmark size={16} strokeWidth={1.75} fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
      </Button>
    </div>
  );

  return (
    <>
      {/* While reviewing, the results above carry the page's h1. */}
      {isReview
        ? <h2 className="sr-only">Mock board review</h2>
        : <h1 className="sr-only">Mock board in progress</h1>}

      <SubmitDialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSubmit={submitExam}
        submitting={isSubmitting}
        unanswered={unanswered}
        marked={markedList}
        onJump={handleIndexChange}
      />

      {/* The exam renders into BoardSimulator's <Page> (wide), which owns the
          frame; this div bounds the toolbar's sticky range to the exam. It
          used to be `relative z-0`, a stacking context that held the phone
          Scratchpad sheet (layer 70 in index.css) under the phone bottom bar
          and header (45, 50) in the review. */}
      <div className="flex flex-col gap-6 min-w-0">

        {/* Toolbar: submit (always reachable) / answered count / pace / clock.
            Two rows on a phone so the answered count isn't the first thing hidden. */}
        <StickyToolbar>
          <div className="flex w-full sm:w-auto items-center justify-between gap-2">
            {!isReview ? (
              <Button tone="danger" size="sm" onClick={() => setShowSubmit(true)} disabled={isSubmitting}>
                Submit exam
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => (onExitReview ? onExitReview() : engine.resetToSetup())}>
                Exit review
              </Button>
            )}
            <Badge tone="velocity" className="tabular-nums sm:hidden">
              {isReview ? 'Review' : `${answeredCount}/${totalQuestions}`}
            </Badge>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            <StatusPill tone="success" className="hidden md:inline-flex">Hotkeys on</StatusPill>
            <Badge tone="velocity" className="hidden sm:inline-flex tabular-nums">
              {isReview ? 'Review mode' : `${answeredCount} of ${totalQuestions} answered`}
            </Badge>
            {!isReview && markedList.length > 0 && <Badge tone="amber" className="tabular-nums">{markedList.length} marked</Badge>}
            {!isReview && (
              <PaceIndicator
                endTime={examEndTime}
                totalSecs={examTotalSecs}
                totalItems={totalQuestions}
                answered={answeredCount}
                hidden={!showTime}
              />
            )}
            {!isReview && (
              <ExamClock
                endTime={examEndTime}
                showTime={showTime}
                onToggleTime={() => setShowTime(!showTime)}
              />
            )}
          </div>
        </StickyToolbar>

        <ExamNavigator
          count={totalQuestions}
          currentIndex={currentIndex}
          onSelect={handleIndexChange}
          isAnswered={(idx) => session.answers[idx] != null}
          isMarked={(idx) => marked.has(idx)}
          reviewStateOf={isReview
            ? (idx) => (session.answers[idx] == null ? 'skipped' : session.answers[idx] === session.questions[idx].answer ? 'correct' : 'incorrect')
            : undefined}
          sheet={{
            letterOf: (idx) => letterIn(session.questions[idx]?.options, session.answers[idx]),
            correctLetterOf: isReview ? (idx) => letterIn(session.questions[idx]?.options, session.questions[idx]?.answer) : undefined,
          }}
        />

        {/* Exam canvas: QuestionCard owns the prompt + confidence + choices + reveal */}
        {/* md:isolate: from md up the Scratchpad is an overlay (z 40) inside
            this card, and the card keeps it below the sticky toolbar (z 30)
            when the question scrolls under it. On a phone the Scratchpad is a
            sheet on the layer scale, so nothing contains it. */}
        <QuestionSurface
          className="overflow-hidden md:isolate transition-colors duration-700"
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

          {/* No formula cards during the answer phase: they would work as a
              cheat sheet and undermine the simulator's calibration analytics. */}

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

          {/* Previous / next, and Submit on the last item */}
          <div className="flex flex-wrap justify-between items-center pt-8 mt-4 border-t border-border2/50 gap-3">
            <Button variant="secondary" onClick={() => handleIndexChange(currentIndex - 1)} disabled={currentIndex === 0}>
              Previous
            </Button>

            {!isReview && currentIndex === totalQuestions - 1 ? (
              <Button tone="danger" size="lg" onClick={() => setShowSubmit(true)} disabled={isSubmitting}>
                Submit exam
              </Button>
            ) : (
              <Button onClick={() => handleIndexChange(currentIndex + 1)} disabled={currentIndex === totalQuestions - 1}>
                Next
              </Button>
            )}
          </div>
        </QuestionSurface>
      </div>
    </>
  );
}
