// src/pages/Gauntlet.jsx
//
// Distraction-free timed gauntlet. Adopts the shared QuestionCard for prompt
// + confidence + choices + reveal, keeps its own chrome (level header, clock,
// pace, navigator, submit/leave actions). Confidence is captured on every item
// (silent MED default if skipped) so gauntlet attempts feed the same
// calibration analytics as Practice and the Simulator.
//
// Only the running exam uses ExamLayout. Loading, resume, submitting, the
// offline-pending and error screens, and the results get the normal app
// chrome (MainLayout), so the navigation is there whenever no clock is running.
//
// Submit is always in the toolbar and opens the same dialog as the Board
// Simulator (unanswered items, each a link back). Leaving a started run counts
// as not passing it and locks the ladder for 12 hours; a saved run is resumed
// or submitted as it stands — there is no "start fresh" around the lock.

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGauntletEngine } from '../features/gauntlet/useGauntletEngine';
import GauntletDiagnostics from '../features/gauntlet/GauntletDiagnostics';
import SubmitDialog from '../features/board-simulator/SubmitDialog';
import QuestionCard from '../features/quiz/QuestionCard';
import ExamLayout from '../layouts/ExamLayout';
import MainLayout from '../layouts/MainLayout';
import ExamNavigator from '../components/exam/ExamNavigator';
import ExamClock from '../components/exam/ExamClock';
import PaceIndicator from '../components/exam/PaceIndicator';
import { getGauntletTier } from '../config/examStandards';
import { Button, Modal, EmptyState, Badge, StatusPill } from '../components/ui';
import { TriangleAlert, Flag, Bookmark, WifiOff } from '../components/ui/icons';

const LETTERS = ['A', 'B', 'C', 'D'];
const BACK_TO_GAUNTLET = '/exams?tab=gauntlet';

function Waiting({ label }) {
  return (
    <MainLayout>
      <div role="status" className="flex flex-col items-center justify-center h-[70vh] gap-4 page-fade-in text-[var(--accent-text)]">
        <span className="telemetry-spinner !w-12 !h-12 border-t-transparent" aria-hidden="true"></span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </MainLayout>
  );
}

function Notice({ icon, title, description, action }) {
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[70vh] page-fade-in px-4">
        <EmptyState titleAs="h1" icon={icon} title={title} description={description} action={action} />
      </div>
    </MainLayout>
  );
}

export default function Gauntlet() {
  const { level } = useParams();
  const navigate = useNavigate();
  const {
    status, questions, answers, confidences, gauntletEndTime, diagnostics,
    currentIndex, setCurrentIndex,
    bookmarks, toggleBookmark, flags, toggleFlag,
    resumeGauntlet, submitSavedRun, forfeitRun,
    handleAnswer, handleConfidence, submitExam,
  } = useGauntletEngine(level);

  const [showTime, setShowTime] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [confirmSubmitSaved, setConfirmSubmitSaved] = useState(false);

  if (status === 'loading') return <Waiting label="Building your exam…" />;
  if (status === 'submitting') return <Waiting label="Submitting your run…" />;
  if (status === 'forfeited') return <Waiting label="Leaving…" />;

  // A saved draft for THIS level exists — resume it or submit it as it
  // stands. Connection loss mid-exam, a killed tab, or a crash all land here
  // on the next visit.
  if (status === 'resume') {
    return (
      <>
        <Notice
          icon={TriangleAlert}
          title="You have an unfinished run"
          description="A Gauntlet run for this level is saved on this device. Pick up where you left off, or submit it as it stands."
          action={(
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button tone="amber" onClick={() => resumeGauntlet()}>Resume run</Button>
              <Button variant="secondary" onClick={() => setConfirmSubmitSaved(true)}>Submit this run</Button>
            </div>
          )}
        />
        <Modal
          open={confirmSubmitSaved}
          onClose={() => setConfirmSubmitSaved(false)}
          icon={TriangleAlert}
          tone="amber"
          title="Submit this run as it stands?"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setConfirmSubmitSaved(false)}>Cancel</Button>
              <Button tone="danger" onClick={() => { setConfirmSubmitSaved(false); submitSavedRun(); }}>Submit run</Button>
            </>
          )}
        >
          <p className="text-sm text-muted2">It is graded with the answers saved so far. Blank items count as wrong.</p>
        </Modal>
      </>
    );
  }

  // Submitted while offline (or the connection dropped mid-submit) — queued
  // in the durable outbox; a run can't be graded on-device (the exam pool
  // intentionally never carries answer keys), so no score is invented.
  if (status === 'pending') {
    return (
      <Notice
        icon={WifiOff}
        title="Submitted — grading when you reconnect"
        description="Your answers are saved and queued. This run is done; you don't need to retry or stay on this screen. The result posts once you're back online."
        action={<Button onClick={() => navigate(BACK_TO_GAUNTLET)}>Back to Exams</Button>}
      />
    );
  }

  // The server refused the grade outright. The run is still on this device.
  if (status === 'submit-error') {
    return (
      <Notice
        icon={TriangleAlert}
        title="Couldn't grade this run"
        description="Your answers are kept on this device. Try again now, or come back later — this level will offer to resume or submit it."
        action={(
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => submitExam()}>Try again</Button>
            <Button variant="secondary" onClick={() => navigate(BACK_TO_GAUNTLET)}>Back to Exams</Button>
          </div>
        )}
      />
    );
  }

  if (status === 'error') {
    return (
      <Notice
        icon={TriangleAlert}
        title="Couldn't build this exam"
        description="Something went wrong while loading the Gauntlet questions. Nothing was recorded; try again in a moment."
        action={<Button onClick={() => navigate(BACK_TO_GAUNTLET)}>Back to Exams</Button>}
      />
    );
  }

  if (status === 'diagnostics' && diagnostics) {
    return (
      <MainLayout>
        <GauntletDiagnostics diagnostics={diagnostics} level={level} />
      </MainLayout>
    );
  }

  const tier = getGauntletTier(level);
  const currentQ = questions[currentIndex];
  const answeredCount = Object.values(answers).filter((a) => a != null && a !== '').length;
  const isBookmarked = bookmarks.has(currentIndex);
  const isFlagged = flags.has(currentIndex) || !!currentQ?.isFlagged;
  const unanswered = questions.map((_, i) => i).filter((i) => answers[i] == null || answers[i] === '');
  const letterOf = (idx) => {
    const i = (questions[idx]?.options || []).indexOf(answers[idx]);
    return i >= 0 && i < LETTERS.length ? LETTERS[i] : null;
  };

  const leave = () => {
    setShowLeaveConfirm(false);
    // The lock is set on this device before the page changes; telling the
    // server (or queueing it) carries on in the background.
    forfeitRun();
    navigate(BACK_TO_GAUNTLET);
  };

  // Report + save to bookmarks, injected into QuestionCard's headerSlot.
  const itemActions = (
    <div className="flex gap-2">
      <Button size="icon" variant="ghost" tone="danger" onClick={() => toggleFlag(currentIndex)} disabled={isFlagged} aria-label={isFlagged ? 'Already reported' : 'Report a problem with this question'} title={isFlagged ? 'Already reported' : 'Report a problem'} className={isFlagged ? '' : 'text-muted'}>
        <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" tone="amber" onClick={() => toggleBookmark(currentIndex)} aria-label={isBookmarked ? 'Remove from bookmarks' : 'Save to bookmarks'} aria-pressed={isBookmarked} title={isBookmarked ? 'Remove from bookmarks' : 'Save to bookmarks'} className={isBookmarked ? '' : 'text-muted'}>
        <Bookmark size={16} strokeWidth={1.75} fill={isBookmarked ? 'currentColor' : 'none'} aria-hidden="true" />
      </Button>
    </div>
  );

  const clock = <ExamClock endTime={gauntletEndTime} showTime={showTime} onToggleTime={() => setShowTime((v) => !v)} />;

  return (
    <ExamLayout
      shortMessage="Gauntlet run — clock running"
      message="Gauntlet run — the clock is running, and not passing locks the Gauntlet for 12 hours"
    >
      <h1 className="sr-only">Gauntlet level {level}</h1>

      <SubmitDialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSubmit={() => submitExam()}
        unanswered={unanswered}
        onJump={setCurrentIndex}
      />

      <Modal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        tone="danger"
        icon={TriangleAlert}
        title="Leave this run?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLeaveConfirm(false)}>Keep working</Button>
            <Button tone="danger" onClick={leave}>Leave and lock</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          Leaving counts as not passing this tier and locks the Gauntlet for 12 hours. Your answers so far are not graded.
        </p>
      </Modal>

      <div className="flex flex-col gap-4 pb-8">
        {/* Toolbar. Two rows on phones (leave + clock, then level, count,
            pace and Submit), one row from md. */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-surface/90 backdrop-blur-xl border border-border2/60 px-4 py-3 rounded-[var(--radius-lg)] shadow-sm sticky top-[var(--sticky-top,calc(max(0.5rem,env(safe-area-inset-top))+2.25rem))] z-50">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" tone="danger" size="sm" onClick={() => setShowLeaveConfirm(true)}>
              Leave
            </Button>
            <div className="md:hidden">{clock}</div>
          </div>
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3">
            <Badge tone="velocity">Level {level}</Badge>
            <StatusPill tone="success" className="tabular-nums">
              {answeredCount}/{questions.length} answered
            </StatusPill>
            {tier && (
              <PaceIndicator
                endTime={gauntletEndTime}
                totalSecs={tier.timeLimitSecs}
                totalItems={questions.length}
                answered={answeredCount}
                hidden={!showTime}
              />
            )}
            <div className="hidden md:block">{clock}</div>
            <Button size="sm" tone="danger" onClick={() => setShowSubmit(true)}>
              Submit exam
            </Button>
          </div>
        </div>

        <ExamNavigator
          count={questions.length}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
          isAnswered={(idx) => answers[idx] != null && answers[idx] !== ''}
          sheet={{ letterOf }}
        />

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

        <div className="flex justify-between items-center gap-3">
          <Button variant="secondary" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
            Previous
          </Button>
          {currentIndex === questions.length - 1 ? (
            <Button size="lg" tone="danger" onClick={() => setShowSubmit(true)}>
              Submit exam
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}>
              Next
            </Button>
          )}
        </div>
      </div>
    </ExamLayout>
  );
}
