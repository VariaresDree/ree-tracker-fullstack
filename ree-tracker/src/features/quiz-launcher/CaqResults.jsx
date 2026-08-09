// src/features/quiz-launcher/CaqResults.jsx
// In-session score + full answer review for a finished CAQ run. Nothing here
// is saved anywhere — leaving this screen (or reloading) discards it, which
// is the point: a CAQ practice session must never touch real assessment
// history. Reuses QuestionCard in 'reviewing' state for the per-question
// breakdown, with plainText so third-party quiz text never enters the
// markdown/KaTeX pipeline it was never authored for.
import { Button, Badge, StatusPill } from '../../components/ui';
import { RefreshCw, LayoutGrid, TriangleAlert } from '../../components/ui/icons';
import QuestionCard from '../quiz/QuestionCard';

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CaqResults({ fileName, questions, answers, score, elapsedMs, warnings, onRetake, onExit }) {
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const defectiveCount = questions.filter((q) => q.defects.length > 0).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 bg-surface border border-border rounded-[var(--radius-lg)] p-6 elevate-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-eyebrow mb-1">{fileName}</p>
            <p className="text-2xl font-bold text-textMain">
              {score.correct} / {score.total} correct
              <span className="text-muted2 text-base font-medium ml-2">({pct}%)</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone="neutral" dot={false}>Time {formatElapsed(elapsedMs)}</StatusPill>
            <StatusPill tone="neutral" dot={false}>{score.answered} / {score.total} answered</StatusPill>
          </div>
        </div>

        <p className="text-xs text-muted2">
          This result is shown for this session only — nothing here is saved, uploaded, or reflected
          in your Dashboard analytics, streak, or readiness score.
        </p>

        {(warnings.length > 0 || defectiveCount > 0) && (
          <div className="flex items-start gap-2 rounded-[var(--radius-default)] border p-3" style={{
            background: 'color-mix(in srgb, var(--color-reeAmber) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--color-reeAmber) 30%, transparent)',
          }}>
            <TriangleAlert size={16} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: 'var(--color-reeAmber)' }} aria-hidden="true" />
            <div className="text-xs text-muted2 leading-relaxed">
              {warnings.length > 0 && <p>{warnings.length} record{warnings.length === 1 ? '' : 's'} in this file couldn't be read and {warnings.length === 1 ? 'was' : 'were'} skipped.</p>}
              {defectiveCount > 0 && <p>{defectiveCount} question{defectiveCount === 1 ? '' : 's'} had a duplicate answer choice in the source file — either matching option was accepted as correct.</p>}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="primary" onClick={onRetake}>
            <RefreshCw size={15} strokeWidth={1.75} aria-hidden="true" /> Retake
          </Button>
          <Button variant="secondary" onClick={onExit}>
            <LayoutGrid size={15} strokeWidth={1.75} aria-hidden="true" /> Back to files
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-surface border border-border rounded-[var(--radius-lg)] p-5">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge tone="neutral">Item {i + 1}</Badge>
              {q.defects.includes('duplicate-option-removed') && (
                <StatusPill tone="amber">Duplicate choice in source</StatusPill>
              )}
            </div>
            <QuestionCard
              question={q}
              selectedOption={answers[q.id] ?? null}
              state="reviewing"
              showConfidence={false}
              plainText
              onSelect={() => {}}
            />
            {/* Optional per the source format — both real sample files leave
                these empty on every question, but the format explicitly
                supports them, so render whenever a file actually carries
                content rather than silently dropping it. */}
            {q.explanation && (
              <div className="mt-3 pt-3 border-t border-border2/40">
                <p className="text-eyebrow mb-1">Explanation</p>
                <p className="text-sm text-muted2 leading-relaxed whitespace-pre-wrap break-words">{q.explanation}</p>
              </div>
            )}
            {q.additionalInfo && (
              <div className="mt-3 pt-3 border-t border-border2/40">
                <p className="text-eyebrow mb-1">Additional info</p>
                <p className="text-sm text-muted2 leading-relaxed whitespace-pre-wrap break-words">{q.additionalInfo}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
