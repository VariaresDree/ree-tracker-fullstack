// src/features/quiz-launcher/CaqResults.jsx
//
// The end of an imported quiz: the score, then each item with what you picked, one
// at a time. The attempt is kept on this device for the quiz's row and goes no
// further: it must never touch real assessment history. Text renders plainly, since
// third-party quiz text was never written for the markdown and KaTeX pipeline.
import { useState } from 'react';
import { scoreTone } from '../../utils/scoreTone';
import { Button, QuestionSurface, SegmentedControl, StatusPill } from '../../components/ui';
import { LayoutGrid, RotateCcw } from '../../components/ui/icons';
import ExamNavigator from '../../components/exam/ExamNavigator';
import ResultsCard from '../../components/exam/ResultsCard';
import { ITEM_FOCUS_CLASS, useItemFocus } from '../../hooks/useItemFocus';
import { COPY, itemOf } from '../quiz/examCopy';
import QuestionCard from '../quiz/QuestionCard';
import { formatDuration } from '../../utils/time';
import { missedIds } from './quizRun';

/** A file's optional explanation and extra notes, when it carries them. */
export function QuizNotes({ question }) {
  if (!question.explanation && !question.additionalInfo) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-border2/40 pt-3">
      {question.explanation && (
        <div>
          <p className="text-eyebrow mb-1">Explanation</p>
          <p className="text-sm text-muted2 leading-relaxed whitespace-pre-wrap break-words">{question.explanation}</p>
        </div>
      )}
      {question.additionalInfo && (
        <div>
          <p className="text-eyebrow mb-1">Additional info</p>
          <p className="text-sm text-muted2 leading-relaxed whitespace-pre-wrap break-words">{question.additionalInfo}</p>
        </div>
      )}
    </div>
  );
}

export default function CaqResults({ quiz, run, shown, score, onRetake, onRetryMissed, onDone }) {
  const missed = missedIds(run, shown);
  const blank = shown.filter((q) => run.answers[q.id] == null);
  const wrong = shown.filter((q) => run.answers[q.id] != null && run.answers[q.id] !== q.answer);
  const flagged = shown.filter((q) => run.marked.includes(q.id));
  const [filter, setFilter] = useState(() => (wrong.length > 0 ? 'wrong' : blank.length > 0 ? 'blank' : 'all'));
  const [pos, setPos] = useState(0);
  const lists = { all: shown, wrong, blank, marked: flagged };
  const list = lists[filter];
  const at = Math.min(pos, Math.max(0, list.length - 1));
  const item = list[at];
  const itemRef = useItemFocus(item?.id);
  const choose = (next) => { setFilter(next); setPos(0); };

  const { warnings = [] } = quiz.result;
  const defects = shown.filter((q) => q.defects?.length > 0).length;
  const options = [
    { value: 'all', label: `All ${shown.length}` },
    { value: 'wrong', label: `Wrong ${wrong.length}`, disabled: wrong.length === 0 },
    ...(blank.length > 0 ? [{ value: 'blank', label: `Blank ${blank.length}` }] : []),
    ...(flagged.length > 0 ? [{ value: 'marked', label: `Marked ${flagged.length}` }] : []),
  ];

  return (
    <>
      <ResultsCard
        score={`${score.pct}%`}
        tone={scoreTone(score.pct)}
        caption={`${score.correct} / ${score.total} correct · ${quiz.fileName}`}
        notes={[
          run.timedOut && 'Time ran out, so your answers were submitted.',
          warnings.length > 0 && `${warnings.length} record${warnings.length === 1 ? '' : 's'} in this file couldn’t be read and ${warnings.length === 1 ? 'was' : 'were'} skipped.`,
          defects > 0 && `${defects} question${defects === 1 ? '' : 's'} had a duplicate choice in the file. Either copy counted as correct.`,
          'Kept on this device only. It doesn’t count toward your progress, streak or readiness.',
        ]}
        tiles={[
          { label: 'Answered', value: `${score.answered} / ${score.total}` },
          { label: 'Left blank', value: blank.length },
          { label: 'Time', value: formatDuration(Math.round(run.elapsedMs / 1000)) },
        ]}
        actions={(
          <>
            {missed.length > 0 && (
              <Button onClick={onRetryMissed}><RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" /> Retry missed ({missed.length})</Button>
            )}
            <Button variant={missed.length > 0 ? 'secondary' : 'primary'} onClick={onRetake}><RotateCcw size={15} strokeWidth={1.75} aria-hidden="true" /> Retake</Button>
            <Button variant="secondary" onClick={onDone}><LayoutGrid size={15} strokeWidth={1.75} aria-hidden="true" /> Back to quizzes</Button>
          </>
        )}
      />

      <section aria-labelledby="quiz-review" className="flex flex-col gap-4 min-w-0">
        <h2 id="quiz-review" className="text-h3 text-textMain">Review</h2>
        <SegmentedControl label="Show" value={filter} onChange={choose} options={options} />
        {list.length > 1 && (
          <ExamNavigator
            count={list.length}
            currentIndex={at}
            onSelect={setPos}
            isAnswered={(i) => run.answers[list[i].id] != null}
            reviewStateOf={(i) => {
              const answer = run.answers[list[i].id];
              return answer == null ? 'skipped' : answer === list[i].answer ? 'correct' : 'incorrect';
            }}
            isMarked={(i) => run.marked.includes(list[i].id)}
            numberOf={(i) => shown.indexOf(list[i]) + 1}
          />
        )}
        {item && (
          <div ref={itemRef} tabIndex={-1} className={ITEM_FOCUS_CLASS}>
            <QuestionSurface className="gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium text-textMain">{itemOf(shown.indexOf(item), shown.length)}</p>
                {item.defects?.includes('duplicate-option-removed') && <StatusPill tone="amber">Duplicate choice in source</StatusPill>}
                {run.answers[item.id] == null && <StatusPill tone="neutral" dot={false}>Left blank</StatusPill>}
              </div>
              <QuestionCard question={item} selectedOption={run.answers[item.id] ?? null} state="reviewing" showConfidence={false} plainText announce={false} />
              <QuizNotes question={item} />
              {list.length > 1 && (
                <div className="flex justify-between gap-3 border-t border-border pt-5">
                  <Button variant="secondary" onClick={() => setPos(at - 1)} disabled={at === 0}>{COPY.previous}</Button>
                  <Button onClick={() => setPos(at + 1)} disabled={at === list.length - 1}>{COPY.next}</Button>
                </div>
              )}
            </QuestionSurface>
          </div>
        )}
      </section>
    </>
  );
}
