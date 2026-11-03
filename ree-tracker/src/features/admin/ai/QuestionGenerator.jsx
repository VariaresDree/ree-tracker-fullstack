// src/features/admin/ai/QuestionGenerator.jsx
//
// Admin › Question bank › AI question generator: pick the topic, how many,
// conceptual / calculation / mixed (with the split), and the difficulty; the
// run is written in parallel batches, optionally double-checked by a second
// model, and previewed here before anything goes to the review queue.
import { useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { refreshLiveTOS } from '../../../services/liveTaxonomy';
import { planBatches, calculationCount, MAX_QUESTIONS } from '../../../services/aiPrompts';
import { useAiStatus } from '../../../hooks/useAiStatus';
import AiStatusNote from '../../../components/AiStatusNote';
import LatexRenderer from '../../../components/LatexRenderer';
import ExplanationBody from '../../quiz/ExplanationBody';
import { Button, Card, Badge, ProgressIndicator, StatusPill } from '../../../components/ui';
import { Sparkles, X, Check, TriangleAlert } from '../../../components/ui/icons';
import { useQuestionGenerator } from './useQuestionGenerator';
import QuestionSpecFields from './QuestionSpecFields';

const COUNT_PRESETS = [5, 10, 20, 30];
const DIFFICULTY_LABEL = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

const CHECK_BADGE = {
  agrees: { tone: 'success', text: 'Answer check agrees' },
  disagrees: { tone: 'danger', text: null }, // filled in with the checker's pick
  flagged: { tone: 'amber', text: 'Answer check flagged it' },
  unchecked: { tone: 'neutral', text: 'Not checked' },
};

function modelLine(status) {
  const author = status?.tasks?.author?.primary;
  const verify = status?.tasks?.verify?.primary;
  if (!author) return null;
  return `Writes with ${author.model} on ${author.providerLabel}${verify ? `; checks answers with ${verify.model} on ${verify.providerLabel}` : ''}.`;
}

export default function QuestionGenerator({ isOnline = true, onSaved }) {
  const { currentUser } = useAuth();
  const { status } = useAiStatus();
  const g = useQuestionGenerator(onSaved);
  const { spec, update, phase, progress, items, runInfo } = g;

  // Labels the model picks are resolved against the live Topic table when
  // published, so pull the live taxonomy when the generator opens.
  useEffect(() => { refreshLiveTOS(); }, []);

  const batches = useMemo(() => planBatches(spec), [spec]);
  const calcN = calculationCount(Math.min(MAX_QUESTIONS, spec.count || 1), spec.type, spec.calcShare);
  const total = Math.min(MAX_QUESTIONS, spec.count || 1);
  const busy = phase === 'generating' || phase === 'checking' || phase === 'saving';
  const selectedCount = items.filter((q) => q.selected).length;

  return (
    // A Card like every other section (it was a hand-made frame). Its form
    // grids follow the card's own width: beside the sidebar the window's
    // sm:/lg: put three fields in a 430px row.
    <Card as="section" elevated padding="md" className="@container flex flex-col gap-5" aria-labelledby="qgen-title">
      <header className="flex flex-col gap-1">
        <h3 id="qgen-title" className="text-h3 text-textMain flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber-text)' }} /> AI question generator
        </h3>
        <p className="text-xs text-muted2">
          Board-style questions you preview before they go to the review queue. {modelLine(status)}
        </p>
        <AiStatusNote task="author" />
      </header>

      <fieldset disabled={busy} className="flex flex-col gap-5 min-w-0">
        <legend className="sr-only">Generation settings</legend>
        <QuestionSpecFields spec={spec} update={update} maxCount={MAX_QUESTIONS} countHint={`1 to ${MAX_QUESTIONS}. Written in batches of up to 5, two at a time.`} presets={COUNT_PRESETS} idPrefix="qgen">
          <label className="flex items-start gap-3 text-sm text-textMain cursor-pointer">
            <input type="checkbox" className="mt-1" checked={spec.verify} onChange={(e) => update({ verify: e.target.checked })} />
            <span>
              Double-check answers with a second model
              <span className="block text-xs text-muted2">It solves each question without seeing the key. Disagreements stay unticked and carry a note into the review queue. Adds about half the time again.</span>
            </span>
          </label>
        </QuestionSpecFields>
      </fieldset>

      {phase === 'generating' || phase === 'checking' ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <ProgressIndicator
            value={phase === 'checking' ? progress.total : progress.done}
            max={progress.total || 1}
            label={phase === 'checking'
              ? `Double-checking ${items.length} answers…`
              : `Writing batch ${Math.min(progress.done + 1, progress.total)} of ${progress.total} · ${items.length} question${items.length === 1 ? '' : 's'} so far`}
          />
          <Button variant="secondary" size="sm" className="self-start" onClick={g.cancel}>Stop</Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p className="text-xs text-muted2">
            {total} question{total === 1 ? '' : 's'} in {batches.length} batch{batches.length === 1 ? '' : 'es'}: {calcN} calculation, {total - calcN} conceptual.
          </p>
          <Button onClick={g.generate} disabled={busy || !isOnline || phase === 'review'} title={phase === 'review' ? 'Send or discard the questions below first.' : undefined}>
            <Sparkles size={15} strokeWidth={1.75} aria-hidden="true" /> Generate {total} question{total === 1 ? '' : 's'}
          </Button>
        </div>
      )}
      {!isOnline && <p className="text-xs text-muted2">You're offline. Generation needs a connection.</p>}

      {(phase === 'review' || phase === 'saving' || (phase !== 'idle' && items.length > 0)) && (
        <GeneratedList g={g} currentUser={currentUser} selectedCount={selectedCount} runInfo={runInfo} />
      )}
    </Card>
  );
}

function GeneratedList({ g, currentUser, selectedCount, runInfo }) {
  const { items, phase } = g;
  const reviewing = phase === 'review' || phase === 'saving';
  const flagged = items.filter((q) => q.issues.length || q.check?.status === 'disagrees' || q.check?.status === 'flagged').length;

  return (
    <div className="flex flex-col gap-4 border-t border-border pt-5">
      {reviewing && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="text-sm text-textMain">
            <span className="font-semibold">{items.length} question{items.length === 1 ? '' : 's'} ready</span>
            <span className="text-muted2"> · {selectedCount} ticked{flagged ? ` · ${flagged} need a look` : ''}</span>
            {runInfo && (
              <p className="text-xs text-muted2 mt-0.5">
                Written in {runInfo.seconds} s by {runInfo.models.join(', ') || 'the AI'}.
                {runInfo.failed ? ` ${runInfo.failed} batch${runInfo.failed === 1 ? '' : 'es'} failed: ${runInfo.errors[0]}` : ''}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" tone="danger" onClick={g.discard} disabled={phase === 'saving'}>Discard all</Button>
            <Button onClick={() => g.save(currentUser)} loading={phase === 'saving'} disabled={phase === 'saving' || selectedCount === 0}>
              Send {selectedCount} to review queue
            </Button>
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {items.map((q, idx) => <GeneratedItem key={`${idx}-${q.text.slice(0, 24)}`} q={q} idx={idx} g={g} disabled={!reviewing || phase === 'saving'} />)}
      </ol>
    </div>
  );
}

export function GeneratedItem({ q, idx, g, disabled }) {
  const check = q.check ? CHECK_BADGE[q.check.status] : null;
  const checkText = q.check?.status === 'disagrees'
    ? `Answer check picked ${q.check.choice || 'another option'}`
    : check?.text;
  const checkIndex = q.check?.choice ? q.check.choice.charCodeAt(0) - 65 : -1;

  return (
    <li className="bg-bg border border-border rounded-[var(--radius-lg)] p-4 flex gap-3 min-w-0">
      <input type="checkbox" className="mt-1.5 shrink-0" checked={!!q.selected} disabled={disabled}
        onChange={() => g.toggle(idx)} aria-label={`Send question ${idx + 1}`} />
      <div className="min-w-0 flex-1 flex flex-col gap-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          <Badge tone="velocity">{idx + 1}</Badge>
          <Badge tone={q.type === 'calculation' ? 'signal' : 'neutral'}>{q.type === 'calculation' ? 'Calculation' : 'Conceptual'}</Badge>
          <Badge tone="neutral">{DIFFICULTY_LABEL[q.difficulty] || 'Medium'}</Badge>
          <Badge tone="neutral" className="truncate max-w-[200px]">{q.subtopic}</Badge>
          {check && <StatusPill tone={check.tone}>{checkText}</StatusPill>}
        </div>

        {q.issues.length > 0 && (
          <ul className="text-xs flex flex-col gap-0.5" style={{ color: 'var(--accent-danger)' }}>
            {q.issues.map((issue) => (
              <li key={issue} className="flex items-center gap-1.5"><TriangleAlert size={13} strokeWidth={1.75} aria-hidden="true" />{issue}</li>
            ))}
          </ul>
        )}
        {q.check?.issue && (
          <p className="text-xs" style={{ color: 'var(--color-reeAmber-text)' }}>Checker: {q.check.issue}</p>
        )}

        <div className="text-sm text-textMain leading-relaxed math-scroll-mobile min-w-0 [&_p]:!m-0">
          <LatexRenderer content={q.text} />
        </div>

        <div className="grid grid-cols-1 @xl:grid-cols-2 gap-2">
          {q.options.map((opt, i) => {
            const isAnswer = opt === q.answer;
            const isCheckPick = i === checkIndex && !isAnswer;
            return (
              <div key={i}
                className="p-2.5 rounded-[var(--radius-default)] border border-border text-xs flex items-center gap-2 min-w-0"
                style={isAnswer
                  ? { background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }
                  : isCheckPick
                    ? { borderColor: 'color-mix(in srgb, var(--accent-danger) 45%, transparent)', borderStyle: 'dashed' }
                    : undefined}
              >
                <span className="font-mono opacity-60 shrink-0">{String.fromCharCode(65 + i)}.</span>
                <span className="min-w-0 flex-1 math-scroll-mobile [&_p]:!m-0"><LatexRenderer content={opt} /></span>
                {isAnswer && <><Check size={14} strokeWidth={2.5} className="shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden="true" /><span className="sr-only">Answer key</span></>}
                {isCheckPick && <span className="text-micro shrink-0" style={{ color: 'var(--accent-danger)' }}>Checker</span>}
              </div>
            );
          })}
        </div>

        {q.fixedExplanation && (
          <details className="text-xs text-muted2">
            <summary className="cursor-pointer font-medium text-textMain">Worked explanation</summary>
            <div className="mt-2 bg-surface2/50 p-3 rounded-[var(--radius-default)] border border-border leading-relaxed math-scroll-mobile min-w-0">
              <ExplanationBody text={q.fixedExplanation} />
            </div>
          </details>
        )}
      </div>
      <Button size="icon" variant="ghost" tone="danger" onClick={() => g.remove(idx)} disabled={disabled}
        aria-label={`Remove question ${idx + 1}`} className="shrink-0 self-start">
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </Button>
    </li>
  );
}
