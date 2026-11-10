// src/features/reference/drill/MatchDrill.jsx
//
// Tap a name, then its formula. The two lists stack on a phone, as a formula won't
// fit half a screen. A card counts as missed once, on its first wrong pair.
// A formula tile is named by its source: KaTeX's drawing gives a button no name.
import { useState } from 'react';
import { Button, StatusPill, cn } from '../../../components/ui';
import { X } from '../../../components/ui/icons';
import LatexRenderer from '../../../components/LatexRenderer';
import { answerOf } from './drillPlan';

const TILE = 'w-full min-h-12 px-3 py-2 text-sm text-left rounded-[var(--radius-default)] border transition-colors cursor-pointer min-w-0 math-scroll-mobile !pb-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)]';
const IDLE = 'bg-surface2/40 border-border2/50 text-textMain hover:bg-surface3/50';
const PICKED = 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] border-[color-mix(in_srgb,var(--accent)_60%,transparent)] text-textMain';
const DONE = 'bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)] border-[color-mix(in_srgb,var(--accent-success)_50%,transparent)] text-muted2 cursor-default';
const OFF = 'bg-[color-mix(in_srgb,var(--accent-danger)_12%,transparent)] border-[color-mix(in_srgb,var(--accent-danger)_50%,transparent)] text-textMain';

export default function MatchDrill({ rounds, onMiss, onFinish, onExit }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [matched, setMatched] = useState(() => new Set());
  const [missed, setMissed] = useState([]);
  const [off, setOff] = useState(null);
  const [said, setSaid] = useState('');
  const round = rounds[index];
  const total = rounds.reduce((sum, r) => sum + r.cards.length, 0);

  const pickName = (card) => {
    setPicked(card);
    setOff(null);
    setSaid('');
  };
  const pickAnswer = (card) => {
    if (!picked) {
      setSaid('Tap a name first.');
      return;
    }
    if (card.id !== picked.id) {
      setOff(card.id);
      setSaid('Not that one. Try another.');
      if (!missed.some((c) => c.id === picked.id)) {
        setMissed((prev) => [...prev, picked]);
        onMiss(picked);
      }
      return;
    }
    const next = new Set(matched).add(card.id);
    setMatched(next);
    setPicked(null);
    setOff(null);
    setSaid('Matched.');
    if (next.size === round.cards.length) {
      if (index === rounds.length - 1) onFinish({ total, missed });
      else {
        setIndex(index + 1);
        setMatched(new Set());
        setSaid('Next set.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X size={14} strokeWidth={1.75} aria-hidden="true" /> Exit drill
        </Button>
        <StatusPill tone="neutral" dot={false}>Set {index + 1} / {rounds.length}</StatusPill>
      </div>
      <p role="status" className="text-sm text-muted2 min-h-5">{said || 'Tap a name, then its formula.'}</p>
      <div className="grid sm:grid-cols-2 gap-4 min-w-0">
        <div className="flex flex-col gap-2 min-w-0" role="group" aria-label="Names">
          <p className="text-eyebrow">Names</p>
          {round.names.map((card) => {
            const done = matched.has(card.id);
            return (
              <button key={card.id} type="button" disabled={done} aria-pressed={picked?.id === card.id} onClick={() => pickName(card)} className={cn(TILE, done ? DONE : picked?.id === card.id ? PICKED : IDLE)}>
                {card.name}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 min-w-0" role="group" aria-label="Formulas">
          <p className="text-eyebrow">Formulas</p>
          {round.answers.map((card) => {
            const done = matched.has(card.id);
            return (
              <button key={card.id} type="button" disabled={done} aria-label={`Formula: ${answerOf(card).replace(/\$/g, '')}`} onClick={() => pickAnswer(card)} className={cn(TILE, done ? DONE : off === card.id ? OFF : IDLE, '[&_p]:!m-0')}>
                <LatexRenderer content={answerOf(card)} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
