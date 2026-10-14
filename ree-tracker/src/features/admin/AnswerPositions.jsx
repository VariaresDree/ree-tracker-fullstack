// src/features/admin/AnswerPositions.jsx
//
// Admin › Question bank › Answer positions: where the correct answer sits
// across the live bank (GET /api/questions/option-audit). Learners see every
// question's choices in an order drawn for each sitting, and new questions are
// stored shuffled, so a bank that still leans toward A no longer shows; this
// checks the balance and lists the rows to fix:
//   • answers that aren't one of their options (can't be graded);
//   • explanations that name an option by letter, which stop matching once
//     the choices are shuffled;
//   • questions kept in their stored order because an option names others by
//     letter ("Both A and B").
// Checked on demand: it reads the whole bank.
import { useState } from 'react';
import { fetchOptionAudit } from '../../services/dbQueries';
import { Button, ProgressIndicator } from '../../components/ui';
import { ListChecks } from '../../components/ui/icons';

const LETTERS = ['A', 'B', 'C', 'D'];

function IdList({ ids, total }) {
  if (!ids?.length) return null;
  return (
    <p className="text-xs text-muted2 break-all">
      {total > ids.length ? `First ${ids.length}: ` : ''}
      <span className="font-mono">{ids.join(', ')}</span>
    </p>
  );
}

function Finding({ count, children, ids }) {
  return (
    <li className="flex flex-col gap-1">
      <p className="text-sm text-textMain">
        <span className="font-semibold tabular-nums">{count}</span> {children}
      </p>
      <IdList ids={ids} total={count} />
    </li>
  );
}

export default function AnswerPositions() {
  const [state, setState] = useState({ status: 'idle', audit: null });

  const check = async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const audit = await fetchOptionAudit();
      setState({ status: 'done', audit });
    } catch {
      setState((s) => ({ ...s, status: 'error' }));
    }
  };

  const { status, audit } = state;
  const p = audit?.positions;

  return (
    <section className="p-5 sm:p-6 bg-surface border border-border rounded-[var(--radius-lg)] shadow-sm flex flex-col gap-4" aria-labelledby="answer-positions-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <h3 id="answer-positions-title" className="text-base font-semibold text-textMain flex items-center gap-2">
            <ListChecks size={16} strokeWidth={1.75} aria-hidden="true" /> Answer positions
          </h3>
          <p className="text-xs text-muted2 max-w-prose">
            Where the correct answer is stored across the live bank. Learners see the choices in a new order each sitting, and new questions are stored shuffled; this checks the balance and lists the questions to fix.
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={check} loading={status === 'loading'} disabled={status === 'loading'}>
          {audit ? 'Check again' : 'Check the bank'}
        </Button>
      </header>

      {status === 'error' && <p className="text-sm" role="alert" style={{ color: 'var(--accent-danger)' }}>Couldn’t check the bank. Try again.</p>}

      {audit && (
        <div className="flex flex-col gap-4" aria-live="polite">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Correct answer by position">
            {LETTERS.map((l) => (
              <li key={l} className="flex flex-col gap-1">
                <div className="flex justify-between text-xs">
                  <span className="text-textMain">{l}</span>
                  <span className="text-muted2 tabular-nums">{p[l]} · {audit.shares[l]}%</span>
                </div>
                <ProgressIndicator value={audit.shares[l]} size="sm" tone={audit.shares[l] > 35 ? 'amber' : 'velocity'} ariaLabel={`Answer at ${l}: ${audit.shares[l]}% of questions`} />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted2">
            {audit.total} live questions{p.other > 0 ? `; ${p.other} with the answer past D` : ''}. An even bank sits near 25% each.
          </p>
          <ul className="flex flex-col gap-3">
            <Finding count={p.missing} ids={audit.samples.missing}>
              {p.missing === 1 ? 'answer isn’t' : 'answers aren’t'} one of the options, so {p.missing === 1 ? 'it' : 'they'} can’t be graded. Edit the answer to the exact option text.
            </Finding>
            <Finding count={audit.letterInExplanation} ids={audit.samples.letterInExplanation}>
              {audit.letterInExplanation === 1 ? 'explanation names' : 'explanations name'} an option by letter (“option B”). Reword to name the option by its content.
            </Finding>
            <Finding count={p.fixedOrder} ids={audit.samples.fixedOrder}>
              {p.fixedOrder === 1 ? 'question keeps' : 'questions keep'} the stored order because an option names others by letter (“Both A and B”). Rewrite those options to shuffle {p.fixedOrder === 1 ? 'it' : 'them'}.
            </Finding>
          </ul>
        </div>
      )}
    </section>
  );
}
