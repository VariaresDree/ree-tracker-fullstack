// src/features/paper-sets/scan/ScanResult.jsx
//
// A scored sheet: the score, the percentage, each Part, and (PRC papers only)
// the general average and the board verdict. For a taker: scan the next
// sheet (the camera stays on) or see the set's results. For a self-check:
// it's saved to your history (Exams > Past sittings, outside scores), with
// the items you missed, each with its question typeset, your answer, the key
// and the solution.
import { Link } from 'react-router-dom';
import { VERDICT, stripChoicePrefix } from '@ree/shared';
import LatexRenderer from '../../../components/LatexRenderer';
import { Button, Card, StatusPill } from '../../../components/ui';
import { ArrowRight, CheckCircle2, CloudOff, History, ScanLine } from '../../../components/ui/icons';
import { answerLabel } from './scanModel';

const VERDICT_LABEL = { [VERDICT.PASSED]: 'Passed', [VERDICT.CONDITIONAL]: 'Conditional pass', [VERDICT.FAILED]: 'Failed' };
const pct = (n) => `${Math.round(n * 10) / 10}%`;

/** The items a self-check got wrong, left blank or marked twice (scored items only). */
function missedItems(draw, score, answers) {
  return draw.items
    .map((it, i) => ({ it, i, state: score.perItem[i] }))
    .filter((x) => x.state === 'wrong' || x.state === 'blank' || x.state === 'multiple')
    .map(({ it, i }) => ({ item: it, answer: answers[i] || '-' }));
}

function Missed({ draw, score, answers }) {
  const missed = missedItems(draw, score, answers);
  if (!missed.length) return <p className="text-sm text-muted2">You got every scored item right.</p>;
  return (
    <ol className="ree-scan-missed">
      {missed.map(({ item, answer }) => {
        const optionText = (i) => (item.options?.[i] == null ? null : stripChoicePrefix(String(item.options[i])));
        const keyText = optionText(item.answerIndex);
        const chosen = /^[A-F]$/.test(answer) ? optionText(answer.charCodeAt(0) - 65) : null;
        return (
          <li key={item.n}>
            <Card padding="sm" glass={false} className="flex flex-col gap-2">
              <p className="text-eyebrow">{`Item ${item.n}`}</p>
              <LatexRenderer content={item.text} className="text-sm text-textMain" />
              <p className="text-sm text-muted2">
                {'Your answer: '}
                <strong className="text-textMain">{answerLabel(answer)}</strong>
                {chosen ? <>{' ('}<LatexRenderer inline content={chosen} />)</> : null}
              </p>
              <p className="text-sm text-muted2">
                {'Key: '}
                <strong className="text-textMain">{item.answerLetter}</strong>
                {keyText ? <>{' ('}<LatexRenderer inline content={keyText} />)</> : null}
              </p>
              {item.explanation && (
                <div className="text-sm text-muted2">
                  <p className="text-eyebrow mb-1">Solution</p>
                  <LatexRenderer content={item.explanation} />
                </div>
              )}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * @param {{ draw: object, result: { score, answers, status, outsideError, who, name }, onNext: () => void, resultsTo: string }} props
 */
export default function ScanResult({ draw, result, onNext, resultsTo }) {
  const { score, answers, status, outsideError, who, name, inHistory } = result;
  const self = who === 'self';
  return (
    <section className="ree-scan-result" aria-labelledby="ree-result-title">
      <Card padding="md" className="flex flex-col gap-3">
        <h2 id="ree-result-title" tabIndex={-1} className="ree-scan-focus text-lg font-semibold text-textMain [overflow-wrap:anywhere]">
          {self ? 'Your score' : name}
        </h2>
        <p className="ree-scan-score">
          <span className="text-display text-textMain tabular-nums">{`${score.correct} of ${score.scored}`}</span>
          <span className="text-muted2 tabular-nums">{pct(score.percent)}</span>
        </p>
        {score.verdict && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted2">
            <StatusPill status={score.verdict}>{VERDICT_LABEL[score.verdict] || score.verdict}</StatusPill>
            <span className="tabular-nums">{`General average ${pct(score.generalAverage ?? 0)}`}</span>
          </p>
        )}
        {score.sections.length > 1 && (
          <ul className="flex flex-col gap-1 text-sm text-textMain">
            {score.sections.map((s) => (
              <li key={s.subject} className="flex justify-between gap-3 tabular-nums">
                <span>{s.subject}</span>
                <span>{`${s.correct} of ${s.total}${s.percent == null ? '' : ` (${pct(s.percent)})`}`}</span>
              </li>
            ))}
          </ul>
        )}
        <p role="status" className="flex items-center gap-2 text-sm text-muted2">
          {status === 'queued'
            ? <CloudOff size={16} strokeWidth={1.75} aria-hidden="true" />
            : <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />}
          {self && inHistory
            ? (status === 'queued' ? 'Saved to your history on this device. It syncs when you\u2019re online.' : 'Saved to your history.')
            : (status === 'queued' ? 'Saved on this device. It syncs when you\u2019re online.' : 'Saved to this set\u2019s results.')}
        </p>
        {self && outsideError && <p role="alert" className="text-sm text-[var(--accent-danger)]">{outsideError}</p>}
        <div className="flex flex-wrap gap-2">
          {self ? (
            <>
              <Button as={Link} to="/exams?tab=history">
                <History size={16} strokeWidth={1.75} aria-hidden="true" />
                Past sittings
              </Button>
              <Button variant="secondary" onClick={onNext}>
                <ScanLine size={16} strokeWidth={1.75} aria-hidden="true" />
                Scan another sheet
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onNext}>
                <ScanLine size={16} strokeWidth={1.75} aria-hidden="true" />
                Scan the next sheet
              </Button>
              <Button as={Link} variant="secondary" to={resultsTo}>
                See results
                <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </Card>

      {self && (
        <section className="flex flex-col gap-3" aria-labelledby="ree-missed-title">
          <h2 id="ree-missed-title" className="text-base font-semibold text-textMain">Items you missed</h2>
          <Missed draw={draw} score={score} answers={answers} />
        </section>
      )}
    </section>
  );
}
