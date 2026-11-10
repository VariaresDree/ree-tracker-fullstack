// src/features/reference/drill/FormulaDrill.jsx
//
// A formula drill, from setup to its score. What it may save is in drillPlan.js;
// it never touches ratings, readiness or streaks.
//
// Recall is study mode asking for the answer, with a scratchpad, since typed math
// is slow on a phone and can't be graded reliably: write it, check, grade yourself.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Scratchpad from '../../../components/Scratchpad';
import { Button, EmptyState } from '../../../components/ui';
import { Pencil, Target } from '../../../components/ui/icons';
import ReferenceStudyMode from '../ReferenceStudyMode';
import ChooseDrill from './ChooseDrill';
import DrillSetup from './DrillSetup';
import MatchDrill from './MatchDrill';
import { chooseQuestions, matchRounds, pickDrillCards, savesRating } from './drillPlan';

const WEAK = new Set(['again', 'hard']);

function RecallDrill({ cards, ask, reviews, onFinish, onExit }) {
  const [pad, setPad] = useState(false);
  // Only a save that's allowed reaches the schedule; the card moves on either way.
  const guarded = useMemo(() => ({
    ...reviews,
    rate: (id, rating) => (savesRating(reviews.rowFor(id), rating) ? reviews.rate(id, rating) : Promise.resolve('skipped')),
  }), [reviews]);
  return (
    <div className="relative min-w-0">
      <ReferenceStudyMode
        cards={cards}
        ask={ask}
        mode="drill"
        reviews={guarded}
        keysPaused={pad}
        onExit={onExit}
        onFinish={(rated) => onFinish({ total: rated.length, missed: rated.filter((r) => WEAK.has(r.rating)).map((r) => r.card) })}
        noteFor={(card) => (savesRating(reviews.rowFor(card.id), 'good') ? null : 'This card isn’t due yet, so only Again changes its schedule.')}
        tools={(
          <Button variant="ghost" size="sm" onClick={() => setPad(true)}>
            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" /> Write it out
          </Button>
        )}
      />
      <Scratchpad isOpen={pad} onClose={() => setPad(false)} />
    </div>
  );
}

/** `scopes`: the sets on offer, `{ id, label, cards }`. `pool`: where wrong answers come from. */
export default function FormulaDrill({ scopes, pool, reviews, onExit }) {
  const [run, setRun] = useState(null);
  const [result, setResult] = useState(null);

  const start = ({ cards, mode, ask, count }) => {
    const picked = pickDrillCards(cards, count);
    setResult(null);
    setRun({
      mode,
      ask,
      cards: picked,
      questions: mode === 'choose' ? chooseQuestions(picked, pool, ask) : [],
      rounds: mode === 'match' ? matchRounds(picked) : [],
    });
  };
  const miss = (card) => {
    reviews.rate(card.id, 'again').catch(() => toast.error('Couldn’t save that miss. It won’t come back tomorrow.'));
  };

  if (!run) return <DrillSetup scopes={scopes} onStart={start} onClose={onExit} />;

  const again = (cards) => start({ cards, mode: run.mode, ask: run.ask, count: 'all' });

  if (result) {
    const right = result.total - result.missed.length;
    return (
      <EmptyState
        icon={Target}
        title={`${right} of ${result.total}`}
        description={result.missed.length > 0
          ? `Missed: ${result.missed.map((c) => c.name).join(', ')}.`
          : 'Nothing missed.'}
        action={(
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {result.missed.length > 0 && <Button onClick={() => again(result.missed)}>Drill the missed</Button>}
            <Button variant="secondary" onClick={() => setRun(null)}>Another drill</Button>
            <Button variant="ghost" onClick={onExit}>Back to formula cards</Button>
          </div>
        )}
      />
    );
  }

  const nothing = run.cards.length === 0
    || (run.mode === 'choose' && run.questions.length === 0)
    || (run.mode === 'match' && run.rounds.length === 0);
  if (nothing) {
    return (
      <EmptyState
        icon={Target}
        title="Too few cards for this drill"
        description={run.mode === 'match' ? 'Matching needs at least two cards with different formulas.' : 'Choosing needs enough other cards to offer wrong answers.'}
        action={<Button variant="secondary" onClick={() => setRun(null)}>Pick again</Button>}
      />
    );
  }

  if (run.mode === 'choose') return <ChooseDrill key={run.questions[0].card.id} questions={run.questions} ask={run.ask} onMiss={miss} onFinish={setResult} onExit={onExit} />;
  if (run.mode === 'match') return <MatchDrill key={run.rounds[0].cards[0].id} rounds={run.rounds} onMiss={miss} onFinish={setResult} onExit={onExit} />;
  return <RecallDrill key={run.cards[0].id} cards={run.cards} ask={run.ask} reviews={reviews} onFinish={setResult} onExit={onExit} />;
}
