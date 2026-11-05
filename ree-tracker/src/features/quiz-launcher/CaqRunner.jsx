// src/features/quiz-launcher/CaqRunner.jsx
//
// Taking an imported quiz, in the same frame as every other session. Practice shows
// the answer right after each pick and can't be changed; Exam holds everything back
// until the whole set is submitted. The run is saved after every change, so leaving
// is safe. See quizLauncher.isolation.test.js for the proof that nothing here
// reaches your progress or the server.
import { useEffect, useEffectEvent, useState } from 'react';
import ExamLayout from '../../layouts/ExamLayout';
import { Page, QuestionSurface } from '../../components/ui';
import ExamClock from '../../components/exam/ExamClock';
import ExamNavigator from '../../components/exam/ExamNavigator';
import ItemActions from '../../components/exam/ItemActions';
import KeyLegend from '../../components/exam/KeyLegend';
import PaceIndicator from '../../components/exam/PaceIndicator';
import { SessionNav } from '../../components/exam/SessionActions';
import SessionBar, { LeaveButton, SubmitButton } from '../../components/exam/SessionBar';
import SubmitDialog from '../../components/exam/SubmitDialog';
import Scratchpad from '../../components/Scratchpad';
import { ITEM_FOCUS_CLASS, useItemFocus } from '../../hooks/useItemFocus';
import { shouldIgnoreHotkey } from '../../utils/hotkeys';
import { KEYS, letterIn } from '../quiz/examCopy';
import QuestionCard from '../quiz/QuestionCard';
import CaqResults, { QuizNotes } from './CaqResults';
import { missedIds } from './quizRun';
import { recordAttempt, saveRun } from './quizStore';
import { useQuizRun } from './useQuizRun';

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

// Counts up on its own, so its tick re-renders nothing else.
function CountUp({ baseMs, since }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="text-xs font-mono text-muted2 tabular-nums">{formatElapsed(baseMs + Math.max(0, now - since))}</span>;
}

const BANNER = {
  shortMessage: 'Imported quiz — not in your progress',
  message: 'Imported quiz — private to this device, and not counted in your progress',
};

export default function CaqRunner({ uid, quiz, initialRun, onAgain, onLeave, onDone }) {
  const questions = quiz.result.questions;
  const { run, shown, score, select, goTo, toggleMark, finish, openedAt } = useQuizRun({
    initialRun,
    questions,
    onSave: (next) => saveRun(uid, quiz.id, next),
    onFinish: (attempt) => recordAttempt(uid, quiz.id, attempt),
  });
  const [showSubmit, setShowSubmit] = useState(false);
  const [showTime, setShowTime] = useState(true);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const itemRef = useItemFocus(run.index);

  const practice = run.setup.mode === 'practice';
  const q = shown[run.index];
  const picked = q ? run.answers[q.id] ?? null : null;
  const revealed = practice && picked != null;
  const isLast = run.index === shown.length - 1;
  const blanks = shown.map((item, i) => (run.answers[item.id] == null ? i : -1)).filter((i) => i >= 0);
  const marked = shown.map((item, i) => (run.marked.includes(item.id) ? i : -1)).filter((i) => i >= 0);

  const onKey = useEffectEvent((e) => {
    if (run.finished || !q || shouldIgnoreHotkey(e) || showSubmit || showScratchpad) return;
    const key = e.key.toLowerCase();
    if (key === 'arrowleft') goTo(run.index - 1);
    if (key === 'arrowright') goTo(run.index + 1);
    if (key === 'm' && !practice) toggleMark(q.id);
    if (key === 'enter' && revealed && !e.target?.closest?.('button, a')) goTo(run.index + 1);
  });
  useEffect(() => {
    const handler = (e) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (run.finished) {
    return (
      <ExamLayout {...BANNER}>
        <Page width="reading">
          <h1 className="sr-only">{quiz.fileName} results</h1>
          <CaqResults
            quiz={quiz}
            run={run}
            shown={shown}
            score={score}
            onRetake={() => onAgain()}
            onRetryMissed={() => onAgain({ only: missedIds(run, shown) })}
            onDone={onDone}
          />
        </Page>
      </ExamLayout>
    );
  }
  if (!q) return null;

  const stateOf = (i) => {
    const answer = run.answers[shown[i].id];
    if (!practice || answer == null) return null;
    return answer === shown[i].answer ? 'correct' : 'incorrect';
  };
  // Practice has already shown every answer, so with nothing blank there's nothing to confirm.
  const askToFinish = () => (practice && blanks.length === 0 ? finish() : setShowSubmit(true));

  return (
    <ExamLayout {...BANNER}>
      <Page width="wide">
        <h1 className="sr-only">{quiz.fileName}</h1>

        <SubmitDialog
          open={showSubmit}
          onClose={() => setShowSubmit(false)}
          onSubmit={() => finish()}
          unanswered={blanks}
          marked={marked}
          total={shown.length}
          onJump={goTo}
          title={practice ? 'Finish this quiz?' : undefined}
          submitLabel={practice ? 'Finish' : undefined}
        />

        <SessionBar
          index={run.index}
          total={shown.length}
          answered={practice ? undefined : score.answered}
          action={<LeaveButton onClick={onLeave} />}
          detail={practice && score.answered > 0 && (
            <span className="shrink-0 text-xs text-muted2 tabular-nums max-sm:hidden">
              <span style={{ color: 'var(--accent-success)' }} className="font-semibold">{score.correct}</span>/{score.answered} correct
            </span>
          )}
          submit={practice
            ? <SubmitButton label="Finish" name="Finish" allAnswered={blanks.length === 0} onClick={askToFinish} />
            : <SubmitButton allAnswered={blanks.length === 0} onClick={askToFinish} />}
        >
          <KeyLegend keys={practice ? KEYS.quizPractice : KEYS.quizExam} />
          {run.deadline ? (
            <>
              <PaceIndicator endTime={run.deadline} totalSecs={run.limitSecs} totalItems={shown.length} answered={score.answered} hidden={!showTime} />
              <ExamClock endTime={run.deadline} showTime={showTime} onToggleTime={() => setShowTime((v) => !v)} onExpire={() => finish({ timedOut: true })} />
            </>
          ) : (
            <CountUp baseMs={initialRun.elapsedMs} since={openedAt} />
          )}
        </SessionBar>

        {/* Under the question on a phone, so the question comes first. */}
        <div className="max-md:order-last min-w-0">
          <ExamNavigator
            count={shown.length}
            currentIndex={run.index}
            onSelect={goTo}
            isAnswered={(i) => run.answers[shown[i].id] != null}
            reviewStateOf={practice ? stateOf : undefined}
            isMarked={(i) => run.marked.includes(shown[i].id)}
            sheet={practice ? undefined : { letterOf: (i) => letterIn(shown[i].options, run.answers[shown[i].id]) }}
          />
        </div>

        <div ref={itemRef} tabIndex={-1} className={ITEM_FOCUS_CLASS}>
          <QuestionSurface className="overflow-hidden md:isolate gap-6">
            <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />
            <QuestionCard
              question={q}
              selectedOption={picked}
              state={revealed ? 'reviewing' : 'answering'}
              showConfidence={false}
              hotkeys
              arrowsMoveItems
              plainText
              onSelect={(option) => select(q.id, option)}
              headerSlot={(
                <ItemActions
                  marked={run.marked.includes(q.id)}
                  onMark={practice ? undefined : () => toggleMark(q.id)}
                  onScratchpad={() => setShowScratchpad((v) => !v)}
                />
              )}
            />
            {revealed && <QuizNotes question={q} />}
          </QuestionSurface>
        </div>

        <SessionNav
          atStart={run.index === 0}
          atEnd={isLast}
          onPrevious={() => goTo(run.index - 1)}
          onNext={() => goTo(run.index + 1)}
          onReview={askToFinish}
          reviewLabel={practice ? 'Finish quiz' : undefined}
        />

      </Page>
    </ExamLayout>
  );
}
