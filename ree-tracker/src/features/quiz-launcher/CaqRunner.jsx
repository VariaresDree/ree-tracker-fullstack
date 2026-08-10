// src/features/quiz-launcher/CaqRunner.jsx
// The active exam run for one loaded CAQ quiz. Reuses ExamLayout for the
// distraction-free chrome and QuestionCard for the answer surface — the
// SAME visual language as Board Simulator/Gauntlet — but drives them from
// useCaqSession's local-only state, never useSimulatorEngine. See
// quizLauncher.isolation.test.js for the static proof that this file's
// import graph never reaches the telemetry/store/scoring modules.
import { useEffect, useState } from 'react';
import ExamLayout from '../../layouts/ExamLayout';
import { Button } from '../../components/ui';
import { ChevronLeft, ChevronRight, Check, X as XIcon } from '../../components/ui/icons';
import QuestionCard from '../quiz/QuestionCard';
import { useCaqSession } from './useCaqSession';
import CaqResults from './CaqResults';

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CaqRunner({ fileName, questions, warnings, onExit }) {
  // key={runKey} below forces a full remount of the session hook on Retake —
  // simpler and safer than adding a manual reset() to useCaqSession, and
  // guarantees no stale answer/index state leaks between attempts.
  const [runKey, setRunKey] = useState(0);
  return (
    <CaqRun
      key={runKey}
      fileName={fileName}
      questions={questions}
      warnings={warnings}
      onExit={onExit}
      onRetake={() => setRunKey((k) => k + 1)}
    />
  );
}

function CaqRun({ fileName, questions: rawQuestions, warnings, onExit, onRetake }) {
  const session = useCaqSession(rawQuestions);
  // `questions` here is the hook's SHUFFLED array, not `rawQuestions` above —
  // every read below (the jump navigator and the post-submit review) must
  // come from this one so the option order a user answered with is the exact
  // order they see when reviewing. Passing `rawQuestions` to CaqResults
  // instead of this was the bug: the answer surface showed shuffled options
  // while review re-rendered the pre-shuffle order, so the correct answer
  // appeared to jump back to option A and no longer matched what the user
  // remembered picking.
  const {
    questions, currentQuestion, currentIndex, total, answers, selectAnswer, next, prev, goTo,
    finished, submit, elapsedMs, startClock, score,
  } = session;

  useEffect(() => {
    startClock();
    return () => session.stopClock();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per mount; stopClock is stable enough for this lifecycle
  }, []);

  if (finished) {
    return (
      <ExamLayout
        shortMessage="Offline practice — not tracked"
        message="Offline practice quiz — untimed, local only, not reflected in your analytics"
      >
        <CaqResults
          fileName={fileName}
          questions={questions}
          answers={answers}
          score={score}
          elapsedMs={elapsedMs}
          warnings={warnings}
          onRetake={onRetake}
          onExit={onExit}
        />
      </ExamLayout>
    );
  }

  if (!currentQuestion) return null;

  const isLast = currentIndex === total - 1;

  return (
    <ExamLayout
      shortMessage="Offline practice — not tracked"
      message="Offline practice quiz — untimed, local only, not reflected in your analytics"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-eyebrow">Item {currentIndex + 1} / {total}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted2 tabular-nums">{formatElapsed(elapsedMs)}</span>
            <Button variant="ghost" size="sm" onClick={onExit}>Exit</Button>
          </div>
        </div>

        <QuestionCard
          question={currentQuestion}
          selectedOption={answers[currentQuestion.id] ?? null}
          onSelect={(opt) => selectAnswer(currentQuestion.id, opt)}
          showConfidence={false}
          plainText
        />

        {/* Compact jump navigator — filled dot = answered, ring = current */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jump to question">
          {questions.map((q, i) => {
            const answered = answers[q.id] != null;
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goTo(i)}
                aria-current={isCurrent}
                aria-label={`Question ${i + 1}${answered ? ', answered' : ''}`}
                className={`w-7 h-7 rounded-[var(--radius-sm)] text-[11px] font-mono flex items-center justify-center transition-colors cursor-pointer border ${
                  isCurrent
                    ? 'border-[var(--accent-velocity)] text-[var(--accent-velocity)] font-bold'
                    : answered
                      ? 'border-transparent bg-surface3 text-textMain'
                      : 'border-transparent bg-surface2/50 text-muted'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={prev} disabled={currentIndex === 0}>
            <ChevronLeft size={15} strokeWidth={1.75} aria-hidden="true" /> Prev
          </Button>
          {isLast ? (
            <Button variant="primary" onClick={submit}>
              <Check size={15} strokeWidth={1.75} aria-hidden="true" /> Finish ({score.answered}/{total} answered)
            </Button>
          ) : (
            <Button variant="secondary" onClick={next}>
              Next <ChevronRight size={15} strokeWidth={1.75} aria-hidden="true" />
            </Button>
          )}
        </div>

        {isLast && score.answered < total && (
          <p className="text-xs text-muted2 flex items-center gap-1.5">
            <XIcon size={13} strokeWidth={1.75} aria-hidden="true" /> {total - score.answered} question{total - score.answered === 1 ? '' : 's'} unanswered — you can still finish, or jump back using the numbers above.
          </p>
        )}
      </div>
    </ExamLayout>
  );
}
