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

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGauntletEngine } from '../features/gauntlet/useGauntletEngine';
import GauntletDiagnostics from '../features/gauntlet/GauntletDiagnostics';
import SubmitDialog from '../components/exam/SubmitDialog';
import QuestionCard from '../features/quiz/QuestionCard';
import ExamLayout from '../layouts/ExamLayout';
import MainLayout from '../layouts/MainLayout';
import ExamNavigator from '../components/exam/ExamNavigator';
import ExamClock from '../components/exam/ExamClock';
import ItemActions from '../components/exam/ItemActions';
import KeyLegend from '../components/exam/KeyLegend';
import PomodoroOwner from '../components/PomodoroOwner';
import PaceIndicator from '../components/exam/PaceIndicator';
import Scratchpad from '../components/Scratchpad';
import SessionActions from '../components/exam/SessionActions';
import SessionBar, { SubmitLabel } from '../components/exam/SessionBar';
import { COPY, KEYS, letterIn } from '../features/quiz/examCopy';
import { getGauntletTier } from '../config/examStandards';
import { readSavedRuns } from '../features/exams/savedRuns';
import { ITEM_FOCUS_CLASS, useItemFocus } from '../hooks/useItemFocus';
import { shouldIgnoreHotkey } from '../utils/hotkeys';
import { Button, Modal, EmptyState, Badge, Page, QuestionSurface } from '../components/ui';
import { TriangleAlert, WifiOff } from '../components/ui/icons';

const BACK_TO_GAUNTLET = '/exams?tab=gauntlet';

function Waiting({ label }) {
  return (
    <MainLayout>
      <Page>
        <div role="status" className="flex flex-col items-center justify-center h-[70vh] gap-4 text-[var(--accent-text)]">
          <span className="telemetry-spinner !w-12 !h-12 border-t-transparent" aria-hidden="true"></span>
          <span className="text-sm font-semibold">{label}</span>
        </div>
      </Page>
    </MainLayout>
  );
}

function Notice({ icon, title, description, action }) {
  return (
    <MainLayout>
      <Page width="narrow" className="min-h-[70vh] justify-center">
        <EmptyState titleAs="h1" icon={icon} title={title} description={description} action={action} />
      </Page>
    </MainLayout>
  );
}

// A new level is a new run: Start tier N from a result lands on this same route.
export default function Gauntlet() {
  const { level } = useParams();
  return <GauntletRun key={level} level={level} />;
}

function GauntletRun({ level }) {
  const navigate = useNavigate();
  const {
    status, errorKind, questions, answers, confidences, gauntletEndTime, diagnostics,
    currentIndex, setCurrentIndex,
    bookmarks, toggleBookmark, flags, toggleFlag, marked, toggleMarked,
    resumeGauntlet, submitSavedRun, forfeitRun,
    handleAnswer, handleConfidence, submitExam,
  } = useGauntletEngine(level);

  const [showTime, setShowTime] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const itemRef = useItemFocus(currentIndex);

  // Left, right and M, as in the mock. QuestionCard's own hotkeys pick the choice
  // and the confidence.
  const lastIndex = (questions?.length || 0) - 1;
  useEffect(() => {
    if (status !== 'active') return undefined;
    const onKey = (e) => {
      if (shouldIgnoreHotkey(e) || showScratchpad || showSubmit) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' && currentIndex > 0) setCurrentIndex(currentIndex - 1);
      if (key === 'arrowright' && currentIndex < lastIndex) setCurrentIndex(currentIndex + 1);
      if (key === 'm') toggleMarked?.(currentIndex);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, currentIndex, lastIndex, showScratchpad, showSubmit, setCurrentIndex, toggleMarked]);
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
          description={`${readSavedRuns().gauntlet?.summary || 'A Gauntlet run for this level is saved on this device'}. Pick up where you left off, or submit it as it stands.`}
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

  if (status === 'error' && errorKind === 'offline') {
    return (
      <Notice
        icon={WifiOff}
        title="This tier needs a connection"
        description="Its questions come from the server. Nothing was recorded, so try again once you're back online."
        action={<Button onClick={() => navigate(BACK_TO_GAUNTLET)}>Back to Exams</Button>}
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
  const letterOf = (idx) => letterIn(questions[idx]?.options, answers[idx]);
  const isMarked = marked?.has(currentIndex);
  const markedList = [...(marked || [])].sort((a, b) => a - b);
  const isLast = currentIndex === questions.length - 1;

  const leave = () => {
    setShowLeaveConfirm(false);
    // The lock is set on this device before the page changes; telling the
    // server (or queueing it) carries on in the background.
    forfeitRun();
    navigate(BACK_TO_GAUNTLET);
  };

  // Injected into QuestionCard's headerSlot.
  const itemActions = (
    <ItemActions
      marked={isMarked}
      onMark={toggleMarked ? () => toggleMarked(currentIndex) : undefined}
      onScratchpad={() => setShowScratchpad((v) => !v)}
      reported={isFlagged}
      onReport={(reason) => toggleFlag(currentIndex, reason)}
      bookmarked={isBookmarked}
      onBookmark={() => toggleBookmark(currentIndex)}
    />
  );

  return (
    <ExamLayout
      shortMessage="Gauntlet run — clock running"
      message="Gauntlet run — the clock is running, and not passing locks the Gauntlet for 12 hours"
    >
      <h1 className="sr-only">Gauntlet level {level}</h1>
      <PomodoroOwner />

      <SubmitDialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onSubmit={() => submitExam()}
        unanswered={unanswered}
        marked={markedList}
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

      <Page>
        <SessionBar
          index={currentIndex}
          total={questions.length}
          answered={answeredCount}
          action={<Button variant="ghost" tone="danger" size="sm" className="shrink-0" onClick={() => setShowLeaveConfirm(true)}>Leave</Button>}
          detail={<span className="hidden sm:contents"><Badge tone="velocity">Level {level}</Badge></span>}
        >
          {tier && (
            <PaceIndicator
              endTime={gauntletEndTime}
              totalSecs={tier.timeLimitSecs}
              totalItems={questions.length}
              answered={answeredCount}
              hidden={!showTime}
            />
          )}
          <ExamClock endTime={gauntletEndTime} showTime={showTime} onToggleTime={() => setShowTime((v) => !v)} />
          <KeyLegend keys={KEYS.exam} />
        </SessionBar>

        {/* Under the question on a phone, so the question comes first. */}
        <div className="max-md:order-last min-w-0">
          <ExamNavigator
            count={questions.length}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
            isAnswered={(idx) => answers[idx] != null && answers[idx] !== ''}
            isMarked={(idx) => !!marked?.has(idx)}
            sheet={{ letterOf }}
          />
        </div>

        <div ref={itemRef} tabIndex={-1} className={ITEM_FOCUS_CLASS}>
          {/* md:isolate: from md up the Scratchpad is an overlay inside this card;
              on a phone it's a sheet on the layer scale (see SimulatorActive). */}
          <QuestionSurface className="min-h-[420px] overflow-hidden md:isolate">
            <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />
            <QuestionCard
              question={currentQ}
              selectedOption={answers[currentIndex] ?? null}
              confidence={confidences?.[currentIndex] ?? null}
              state="answering"
              showConfidence={true}
              requireConfidence={false}
              hotkeys={true}
              arrowsMoveItems
              onSelect={(opt) => handleAnswer(currentIndex, opt)}
              onConfidenceChange={(lvl) => handleConfidence?.(currentIndex, lvl)}
              headerSlot={itemActions}
            />
          </QuestionSurface>
        </div>

        <SessionActions>
          <Button variant="secondary" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>
            {COPY.previous}
          </Button>
          <Button tone="danger" variant={isLast ? undefined : 'outline'} className="mx-auto" aria-label={COPY.submit} onClick={() => setShowSubmit(true)}>
            <SubmitLabel />
          </Button>
          <Button className="ml-auto" onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={isLast}>
            {COPY.next}
          </Button>
        </SessionActions>
      </Page>
    </ExamLayout>
  );
}
