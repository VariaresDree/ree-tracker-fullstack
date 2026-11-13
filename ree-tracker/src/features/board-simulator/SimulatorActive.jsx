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
import { Button, Badge, QuestionSurface } from '../../components/ui';
import ExamClock from '../../components/exam/ExamClock';
import ExamNavigator from '../../components/exam/ExamNavigator';
import ItemActions from '../../components/exam/ItemActions';
import KeyLegend from '../../components/exam/KeyLegend';
import PaceIndicator from '../../components/exam/PaceIndicator';
import { SessionNav } from '../../components/exam/SessionActions';
import SessionBar, { SubmitButton } from '../../components/exam/SessionBar';
import { KEYS, letterIn } from '../quiz/examCopy';
import { ITEM_FOCUS_CLASS, useItemFocus } from '../../hooks/useItemFocus';
import { shouldIgnoreHotkey } from '../../utils/hotkeys';
import { useAuth } from '../../contexts/AuthContext';
import { useAiExplanation } from '../quiz/useAiExplanation';
import SolutionPanel from '../quiz/SolutionPanel';
import NoteButton, { NoteView } from '../notebook/NoteButton';
import { questionTarget } from '../notebook/targets';
import { explanationKey } from '../../services/aiExplanations';
import SubmitDialog from '../../components/exam/SubmitDialog';

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
  const itemRef = useItemFocus(currentIndex);

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

  // A battle submitted but still running: its questions have no key yet, so a
  // review would show every answer as wrong. The results above say it opens when
  // everyone has finished.
  if (isReview && session.diagnostics?.pending) return null;

  if (!q) return <div className="flex justify-center p-12 text-[var(--accent-text)]"><span className="telemetry-spinner !w-12 !h-12"></span></div>;

  const unanswered = session.questions.map((_, i) => i).filter((i) => session.answers[i] == null);
  const markedList = [...marked].sort((a, b) => a - b);

  // Per-question actions, injected into QuestionCard's header slot.
  const itemActions = (
    <ItemActions
      marked={isMarked}
      onMark={!isReview && toggleMarked ? () => toggleMarked(currentIndex) : undefined}
      onScratchpad={() => setShowScratchpad(!showScratchpad)}
      reported={q?.isFlagged}
      onReport={handleFlagQuestion}
      bookmarked={isBookmarked}
      onBookmark={() => toggleBookmark(currentIndex)}
    >
      {isReview && q.id && <NoteButton type="question" targetId={q.id} target={questionTarget(q)} />}
    </ItemActions>
  );
  const isLast = currentIndex === totalQuestions - 1;

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
        total={totalQuestions}
        onJump={handleIndexChange}
      />

      {/* The exam renders into BoardSimulator's <Page> (wide), which owns the
          frame; this div bounds the toolbar's sticky range to the exam. It
          used to be `relative z-0`, a stacking context that held the phone
          Scratchpad sheet (layer 70 in index.css) under the phone bottom bar
          and header (45, 50) in the review. */}
      <div className="flex flex-col gap-6 min-w-0">

        <SessionBar
          index={currentIndex}
          total={totalQuestions}
          answered={isReview ? undefined : answeredCount}
          action={isReview ? (
            <Button variant="secondary" size="sm" className="shrink-0" onClick={() => (onExitReview ? onExitReview() : engine.resetToSetup())}>
              Exit review
            </Button>
          ) : undefined}
          detail={!isReview && markedList.length > 0 ? <span className="hidden sm:contents"><Badge tone="amber" className="tabular-nums">{markedList.length} marked</Badge></span> : undefined}
          submit={isReview ? undefined : (
            <SubmitButton allAnswered={unanswered.length === 0} disabled={isSubmitting} onClick={() => setShowSubmit(true)} />
          )}
        >
          <KeyLegend keys={KEYS.exam} />
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
        </SessionBar>

        {/* Under the question on a phone, so the question comes first. */}
        <div className="max-md:order-last min-w-0">
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
        </div>

        {/* Exam canvas: QuestionCard owns the prompt + confidence + choices + reveal */}
        {/* md:isolate: from md up the Scratchpad is an overlay (z 40) inside
            this card, and the card keeps it below the sticky toolbar (z 30)
            when the question scrolls under it. On a phone the Scratchpad is a
            sheet on the layer scale, so nothing contains it. */}
        <div ref={itemRef} tabIndex={-1} className={ITEM_FOCUS_CLASS}>
        <QuestionSurface
          className="overflow-hidden md:isolate transition-colors duration-700"
          style={{
            borderColor: isReview
              ? `color-mix(in srgb, ${isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'} 30%, transparent)`
              : 'var(--border-light)',
          }}
        >
          <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} persistKey={q?.id ? `q:${q.id}` : null} />

          <QuestionCard
            question={q}
            selectedOption={userAns ?? null}
            confidence={session.confidences[currentIndex] ?? null}
            state={isReview ? 'reviewing' : 'answering'}
            showConfidence={true}
            requireConfidence={false}
            hotkeys={false}
            arrowsMoveItems
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
              {q.id && <div className="mt-4"><NoteView type="question" targetId={q.id} target={questionTarget(q)} /></div>}
            </div>
          )}
        </QuestionSurface>
        </div>

        <SessionNav
          atStart={currentIndex === 0}
          atEnd={isLast}
          onPrevious={() => handleIndexChange(currentIndex - 1)}
          onNext={() => handleIndexChange(currentIndex + 1)}
          onReview={isReview ? undefined : () => setShowSubmit(true)}
          disabled={isSubmitting}
        />
      </div>
    </>
  );
}
