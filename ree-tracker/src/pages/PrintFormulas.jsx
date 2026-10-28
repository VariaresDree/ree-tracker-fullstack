// src/pages/PrintFormulas.jsx
//
// /print/formulas: the formula cards you last rated Again or Hard, as a sheet
// to print and put where you'll see it every day. The CELE tracker's tip: in
// the last month, only the formulas you still miss go on the wall, so they
// stay few. Full screen and outside the app shell (like /print/:setId); the
// page applies the theme itself for the toolbar, and the sheet is black on
// white. Cards come from this device's copy, so it opens offline.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CANONICAL_SUBJECTS, todayManila } from '@ree/shared';
import { useAppearance } from '../hooks/useAppearance';
import { useReferenceCards } from '../features/reference/useReferenceCards';
import { useCardReviews } from '../features/reference/useCardReviews';
import { topicName, weakCards } from '../features/reference/weakCards';
import LatexRenderer from '../components/LatexRenderer';
import { Button, EmptyState, SegmentedControl, Skeleton } from '../components/ui';
import { ChevronLeft, Printer } from '../components/ui/icons';
import '../features/reference/printFormulas.css';

const SUBJECTS = [{ value: 'all', label: 'All' }, { value: 'Mathematics', label: 'Math' }, { value: 'ESAS', label: 'ESAS' }, { value: 'EE', label: 'EE' }];
const fmtDay = (ymd) => new Date(`${ymd}T00:00:00+08:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

function SheetCard({ card }) {
  const variables = Array.isArray(card.variables) ? card.variables.filter((v) => v?.symbol) : [];
  return (
    <article className="pf-card">
      <p className="pf-topic">{card.subject}{topicName(card) ? ` · ${topicName(card)}` : ''}</p>
      <h2>{card.name}{card.symbol ? <> (<LatexRenderer content={card.symbol} inline />)</> : null}</h2>
      {card.formulaLatex && <div className="pf-formula"><LatexRenderer content={card.formulaLatex} /></div>}
      {card.valueUnit && !card.formulaLatex && <div className="pf-formula"><LatexRenderer content={card.valueUnit} /></div>}
      {variables.length > 0 && (
        <ul className="pf-vars">
          {variables.map((v) => (
            <li key={v.symbol}><LatexRenderer content={v.symbol} inline />: {v.meaning}{v.unit ? ` (${v.unit})` : ''}</li>
          ))}
        </ul>
      )}
      {card.purposeExamTip && <p className="pf-tip"><strong>Board tip:</strong> <LatexRenderer content={card.purposeExamTip} inline /></p>}
    </article>
  );
}

export default function PrintFormulas() {
  useAppearance();
  const { cards, loading } = useReferenceCards();
  const reviews = useCardReviews();
  const [subject, setSubject] = useState('all');
  const weak = weakCards(cards, reviews.items);
  const shown = subject === 'all' ? weak : weak.filter((c) => c.subject === subject);
  const counts = Object.fromEntries(CANONICAL_SUBJECTS.map((s) => [s, weak.filter((c) => c.subject === s).length]));

  return (
    <main className="pf-page min-h-dvh bg-bg text-textMain p-4 sm:p-8 flex flex-col gap-4">
      <div className="pf-screen-only flex flex-wrap items-center justify-between gap-3 max-w-[210mm] w-full mx-auto">
        <Button as={Link} to="/library?tab=formulas" variant="ghost" size="sm">
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Formula cards
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Subject"
            size="sm"
            value={subject}
            onChange={setSubject}
            options={SUBJECTS.map((s) => ({ ...s, label: s.value === 'all' ? `All (${weak.length})` : `${s.label} (${counts[s.value]})` }))}
          />
          <Button size="sm" onClick={() => window.print()} disabled={shown.length === 0}>
            <Printer size={14} strokeWidth={1.75} aria-hidden="true" /> Print
          </Button>
        </div>
      </div>

      {loading && cards.length === 0 ? (
        <Skeleton className="h-64 w-full max-w-[210mm] mx-auto" />
      ) : shown.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <EmptyState
            title="No weak formulas to print"
            description="Cards you rate Again or Hard in a review come here. Review some formula cards, then print the ones you still miss."
            action={<Button as={Link} to="/library?tab=formulas" variant="secondary" size="sm">Open formula cards</Button>}
          />
        </div>
      ) : (
        <section className="pf-sheet" aria-labelledby="pf-title">
          <h1 id="pf-title">Formulas to keep in sight</h1>
          <p className="pf-meta">
            {shown.length} card{shown.length === 1 ? '' : 's'} you last rated Again or Hard{subject === 'all' ? '' : ` · ${subject}`} · {fmtDay(todayManila())} · REE.ai
          </p>
          <div className="pf-cards">
            {shown.map((c) => <SheetCard key={c.id} card={c} />)}
          </div>
        </section>
      )}
    </main>
  );
}
