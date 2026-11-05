// src/pages/PrintFormulas.jsx
//
// /print/formulas: the formula cards you last rated Again or Hard, as a sheet
// to print and put where you'll see it every day. The CELE tracker's tip: in
// the last month, only the formulas you still miss go on the wall, so they
// stay few. With ?subject= (and ?topic=), a Quick sheet's whole subject or topic
// instead. Full screen and outside the app shell (like /print/:setId); the
// page applies the theme itself for the toolbar, and the sheet is black on
// white. Cards come from this device's copy, so it opens offline.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CANONICAL_SUBJECTS, todayManila } from '@ree/shared';
import { useAppearance } from '../hooks/useAppearance';
import { useReferenceCards } from '../features/reference/useReferenceCards';
import { useCardReviews } from '../features/reference/useCardReviews';
import { topicName, weakCards } from '../features/reference/weakCards';
import CardBody, { CardMath } from '../features/reference/CardBody';
import { Button, EmptyState, SegmentedControl, Skeleton } from '../components/ui';
import { ChevronLeft, Printer } from '../components/ui/icons';
import '../features/reference/printFormulas.css';

const SUBJECTS = [{ value: 'all', label: 'All' }, { value: 'Mathematics', label: 'Math' }, { value: 'ESAS', label: 'ESAS' }, { value: 'EE', label: 'EE' }];
const fmtDay = (ymd) => new Date(`${ymd}T00:00:00+08:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' });

function SheetCard({ card }) {
  return (
    <article className="pf-card">
      <p className="pf-topic">{card.subject}{topicName(card) ? ` · ${topicName(card)}` : ''}</p>
      <h2>{card.name}{card.symbol ? <> <span className="whitespace-nowrap">(<CardMath value={card.symbol} inline />)</span></> : null}</h2>
      <CardBody card={card} compact />
    </article>
  );
}

// A Quick sheet's cards, grouped by topic and in name order within it.
const inSheetOrder = (a, b) => (topicName(a) || '').localeCompare(topicName(b) || '') || String(a.name).localeCompare(String(b.name));

/** A whole subject or topic: the Quick sheet's Print this sheet. */
function SheetPrint({ scopeSubject, scopeTopic }) {
  useAppearance();
  const { cards, loading } = useReferenceCards();
  const shown = cards
    .filter((c) => c.subject === scopeSubject && (!scopeTopic || topicName(c) === scopeTopic))
    .sort(inSheetOrder);
  const title = scopeTopic || scopeSubject;
  return (
    <main className="pf-page min-h-dvh bg-bg text-textMain p-4 sm:p-8 flex flex-col gap-4">
      <div className="pf-screen-only flex flex-wrap items-center justify-between gap-3 max-w-[210mm] w-full mx-auto">
        <Button as={Link} to="/library?tab=formulas" variant="ghost" size="sm">
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Formula cards
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={shown.length === 0}>
          <Printer size={14} strokeWidth={1.75} aria-hidden="true" /> Print
        </Button>
      </div>
      {loading && cards.length === 0 ? (
        <Skeleton className="h-64 w-full max-w-[210mm] mx-auto" />
      ) : shown.length === 0 ? (
        <div className="max-w-xl mx-auto w-full">
          <EmptyState
            title="No cards to print here"
            description={`There are no formula cards in ${title} yet.`}
            action={<Button as={Link} to="/library?tab=formulas" variant="secondary" size="sm">Open formula cards</Button>}
          />
        </div>
      ) : (
        <section className="pf-sheet" aria-labelledby="pf-title">
          <h1 id="pf-title">{title}: formulas and constants</h1>
          <p className="pf-meta">{shown.length} card{shown.length === 1 ? '' : 's'}{scopeTopic ? ` · ${scopeSubject}` : ''} · {fmtDay(todayManila())}</p>
          <div className="pf-cards">
            {shown.map((c) => <SheetCard key={c.id} card={c} />)}
          </div>
        </section>
      )}
    </main>
  );
}

export default function PrintFormulas() {
  const [params] = useSearchParams();
  const scopeSubject = params.get('subject');
  return scopeSubject
    ? <SheetPrint scopeSubject={scopeSubject} scopeTopic={params.get('topic')} />
    : <WeakPrint />;
}

function WeakPrint() {
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
