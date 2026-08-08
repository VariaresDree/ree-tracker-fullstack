// src/pages/Gauntlet.jsx
//
// Distraction-free timed gauntlet. Adopts the shared QuestionCard for prompt
// + confidence + choices + reveal, keeps its own chrome (level header, clock,
// right-flank navigator grid, submit/leave actions). Confidence is now
// captured on every item (silent MED default if skipped) so gauntlet attempts
// feed the same calibration analytics as Active Review and Simulator.

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGauntletEngine } from '../features/gauntlet/useGauntletEngine';
import GauntletDiagnostics from '../features/gauntlet/GauntletDiagnostics';
import QuestionCard from '../features/quiz/QuestionCard';
import ExamLayout from '../layouts/ExamLayout';
import ExamNavigator from '../components/exam/ExamNavigator';
import ExamTimer from '../components/exam/ExamTimer';
import { formatExamTime } from '../utils/examFormat';
import { Button, Modal, EmptyState, Badge, StatusPill } from '../components/ui';
import { TriangleAlert, Flag, Bookmark, WifiOff } from '../components/ui/icons';

export default function Gauntlet() {
  const { level } = useParams();
  const navigate = useNavigate();
  const {
    status, questions, answers, confidences, timeLeft, diagnostics,
    currentIndex, setCurrentIndex,
    bookmarks, toggleBookmark, flags, toggleFlag,
    resumeGauntlet, discardAndStartFresh,
    handleAnswer, handleConfidence, submitExam,
  } = useGauntletEngine(level);

  const [showTime, setShowTime] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 page-fade-in text-[var(--accent)]">
        <span className="telemetry-spinner !w-12 !h-12 border-t-transparent"></span>
        <span className="text-sm font-semibold animate-pulse">Building your exam…</span>
      </div>
    );
  }

  // A saved draft for THIS level exists — offer resume instead of silently
  // discarding it and building a brand new set of questions. Connection loss
  // mid-exam, a killed tab, or a crash all land here on the next visit.
  if (status === 'resume') {
    return (
      <div className="flex items-center justify-center h-[70vh] page-fade-in">
        <EmptyState
          icon={TriangleAlert}
          title="Resume your last attempt?"
          description="You have an unfinished Gauntlet run saved on this device for this level."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button tone="amber" onClick={resumeGauntlet}>Resume run</Button>
              <Button variant="secondary" onClick={discardAndStartFresh}>Start fresh</Button>
            </div>
          }
        />
      </div>
    );
  }

  // Submitted while offline (or the connection dropped mid-submit) — queued
  // in the durable outbox; a blended run can't be graded on-device (the exam
  // pool intentionally never carries answer keys), so no score is invented.
  if (status === 'pending') {
    return (
      <div className="flex items-center justify-center h-[70vh] page-fade-in">
        <EmptyState
          icon={WifiOff}
          title="Submitted — grading when you reconnect"
          description="Your answers are saved and queued. This run is done; you don't need to retry or stay on this screen — the score posts to your Dashboard once you're back online."
          action={<Button onClick={() => navigate('/arena')}>Back to Arena</Button>}
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center h-[70vh] page-fade-in">
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't build this exam"
          description="Something went wrong while loading the Gauntlet questions. Try again in a moment."
          action={<Button onClick={() => navigate('/arena')}>Back to Arena</Button>}
        />
      </div>
    );
  }

  if (status === 'diagnostics') {
    return <GauntletDiagnostics diagnostics={diagnostics} level={level} questions={questions} answers={answers} formatTime={formatExamTime} navigate={navigate} />;
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isBookmarked = bookmarks.has(currentIndex);
  const isFlagged = flags.has(currentIndex) || !!currentQ?.isFlagged;

  // Bookmark + flag-for-review, mirroring the Board Simulator's itemActions
  // pattern (SimulatorActive.jsx) — injected into QuestionCard's headerSlot.
  const itemActions = (
    <div className="flex gap-2">
      <Button size="icon" variant="ghost" tone="danger" onClick={() => toggleFlag(currentIndex)} disabled={isFlagged} aria-label={isFlagged ? 'Already flagged' : 'Flag question'} className={isFlagged ? '' : 'text-muted'}>
        <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" tone="amber" onClick={() => toggleBookmark(currentIndex)} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark question'} className={isBookmarked ? '' : 'text-muted'}>
        <Bookmark size={16} strokeWidth={1.75} fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
      </Button>
    </div>
  );

  // Adopts the Board Simulator's exam chrome: ExamLayout + a top toolbar with a
  // show/hide timer, the shared horizontal ExamNavigator, the shared
  // QuestionCard, and linear + submit controls.
  return (
    <ExamLayout>
      <Modal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Submit exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)}>Keep working</Button>
            <Button onClick={() => { setShowSubmitConfirm(false); submitExam(); }}>Submit exam</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          Your answers will be graded and count toward this Gauntlet tier. You can't change them after submitting.
        </p>
      </Modal>

      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        tone="danger"
        icon={TriangleAlert}
        title="Leave exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLeaveConfirm(false)}>Keep working</Button>
            <Button tone="danger" onClick={() => navigate('/arena')}>Leave exam</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          Leaving now records no progress for this tier attempt.
        </p>
      </Modal>

      <div className="flex flex-col gap-4 pb-8">
        {/* Top toolbar — exit / level / answered count / timer. Two balanced
            rows on phones (so Level + answered stay visible) collapsing to one
            row at md. The timer renders in whichever cluster is visible. */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-surface/90 backdrop-blur-xl border border-border2/60 px-4 py-3 rounded-[var(--radius-lg)] shadow-sm sticky top-4 z-50">
          {/* Row 1 (mobile): exit + timer */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" tone="danger" size="sm" onClick={() => setShowLeaveConfirm(true)}>
              Exit exam
            </Button>
            <div className="md:hidden">
              <ExamTimer timeRemaining={timeLeft} showTime={showTime} onToggleTime={() => setShowTime((v) => !v)} />
            </div>
          </div>
          {/* Row 2 (mobile) / right cluster (desktop): level + answered + timer */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <Badge tone="velocity">Level {level}</Badge>
            <StatusPill tone="success" className="tabular-nums">
              {answeredCount}/{questions.length} answered
            </StatusPill>
            <div className="hidden md:block">
              <ExamTimer timeRemaining={timeLeft} showTime={showTime} onToggleTime={() => setShowTime((v) => !v)} />
            </div>
          </div>
        </div>

        {/* Horizontal 1-N navigator (shared) */}
        <ExamNavigator
          count={questions.length}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          isAnswered={(idx) => answers[idx] !== undefined}
        />

        {/* Exam canvas — shared QuestionCard. Confidence shown (silent MED
            default under time pressure) so gauntlet attempts feed calibration. */}
        <div className="bg-surface border border-border2 rounded-[var(--radius-lg)] p-6 md:p-8 min-h-[420px] flex flex-col relative shadow-md">
          <QuestionCard
            question={currentQ}
            selectedOption={answers[currentIndex] ?? null}
            confidence={confidences?.[currentIndex] ?? null}
            state="answering"
            showConfidence={true}
            requireConfidence={false}
            hotkeys={true}
            index={currentIndex}
            onSelect={(opt) => handleAnswer(currentIndex, opt)}
            onConfidenceChange={(lvl) => handleConfidence?.(currentIndex, lvl)}
            headerSlot={itemActions}
          />
        </div>

        {/* Controls: previous / next, with Submit REPLACING Next only on the
            last item (mirrors the Board Simulator's SimulatorActive.jsx) —
            it was previously always visible right next to Next, one misclick
            away at every question. Reaching the last item via the navigator
            or Next is now the only path to seeing Submit at all. */}
        <div className="flex justify-between items-center gap-3">
          <Button variant="secondary" onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))} disabled={currentIndex === 0}>
            Previous
          </Button>
          {currentIndex === questions.length - 1 ? (
            <Button tone="danger" size="lg" onClick={() => setShowSubmitConfirm(true)}>
              Submit exam
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setCurrentIndex((c) => Math.min(questions.length - 1, c + 1))}>
              Next
            </Button>
          )}
        </div>
      </div>
    </ExamLayout>
  );
}
