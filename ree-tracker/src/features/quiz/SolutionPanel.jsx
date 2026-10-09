// src/features/quiz/SolutionPanel.jsx
//
// After a question is answered: the written solution and "Explain with AI",
// one component for Practice, the mock review, Bookmarks and a past sitting.
// Each surface used to carry its own copy of these buttons and panels, with
// its own caching (and its own bugs).
//
// The parent keys it by question (explanationKey), so opening a panel on one
// question never carries over to the next. The AI text lives in
// useAiExplanation, keyed by question, so it survives moving back and forth.
import { useState } from 'react';
import toast from 'react-hot-toast';
import LatexRenderer from '../../components/LatexRenderer';
import { Button } from '../../components/ui';
import { Sparkles, RefreshCw } from '../../components/ui/icons';

const PANEL = 'p-5 sm:p-6 rounded-[var(--radius-lg)] bg-surface2/40 border shadow-inner';
const BODY = 'text-sm sm:text-base text-textMain/90 leading-relaxed [&_p]:!m-0 [&_.katex-display]:!m-0 overflow-x-auto custom-scrollbar';

/**
 * @param question     the answered question ({ fixedExplanation, answer, … })
 * @param isOnline     network state; AI needs it unless already saved
 * @param aiText       the saved/generated AI explanation for this question
 * @param aiLoading    true while one is being generated
 * @param onExplain    (force) => Promise<string|null>
 * @param showAnswer   when there is no written solution, show the answer line
 */
export default function SolutionPanel({ question, isOnline, aiText, aiLoading, onExplain, showAnswer = false }) {
  const [view, setView] = useState(null); // 'solution' | 'ai' | null
  const solution = question?.fixedExplanation || null;
  const aiUnavailable = !isOnline && !aiText;

  const toggleAi = async () => {
    if (view === 'ai') { setView(null); return; }
    setView('ai');
    if (aiText) return;
    const text = await onExplain(false);
    if (!text) {
      toast.error('AI explanation unavailable right now.');
      setView((v) => (v === 'ai' ? null : v));
    }
  };

  const regenerate = async () => {
    const text = await onExplain(true);
    if (!text) toast.error('Couldn’t make a new explanation — the saved one is kept.');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {(solution || showAnswer) && (
          <Button
            variant="secondary"
            className="flex-1"
            aria-expanded={view === 'solution'}
            onClick={() => setView(view === 'solution' ? null : 'solution')}
          >
            {view === 'solution' ? 'Hide solution' : 'Show solution'}
          </Button>
        )}
        <Button
          variant="outline"
          className="flex-1"
          aria-expanded={view === 'ai'}
          onClick={toggleAi}
          loading={aiLoading && view === 'ai'}
          disabled={aiUnavailable}
          title={aiUnavailable ? 'Needs a connection' : undefined}
        >
          {!(aiLoading && view === 'ai') && <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />}
          {view === 'ai' ? 'Hide AI explanation' : 'Explain with AI'}
        </Button>
      </div>

      {view === 'solution' && (
        <div className={PANEL} style={{ borderColor: 'color-mix(in srgb, var(--accent-signal) 30%, transparent)' }}>
          <h3 className="text-eyebrow mb-3" style={{ color: 'var(--accent-signal)' }}>Solution</h3>
          <div className={BODY}>
            {solution
              ? <LatexRenderer content={solution} />
              : (
                <p className="text-muted2">
                  No written solution yet. The answer is <strong className="text-textMain"><LatexRenderer content={question?.answer || '—'} /></strong>.
                </p>
              )}
          </div>
        </div>
      )}

      {view === 'ai' && aiText && (
        <div className={PANEL} style={{ borderColor: 'color-mix(in srgb, var(--accent-velocity) 30%, transparent)' }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-eyebrow flex items-center gap-2" style={{ color: 'var(--accent-text)' }}>
              <Sparkles size={12} strokeWidth={2} aria-hidden="true" /> AI explanation
              {!isOnline && <span className="normal-case tracking-normal text-muted2">· saved on this device</span>}
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={regenerate}
              loading={aiLoading}
              disabled={aiLoading || !isOnline}
              title={!isOnline ? 'Needs a connection' : 'Generate a fresh explanation'}
            >
              {!aiLoading && <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />}
              Regenerate
            </Button>
          </div>
          <div className={BODY}><LatexRenderer content={aiText} /></div>
        </div>
      )}
    </div>
  );
}
