// src/features/syllabus/TopicTile.jsx
//
// One topic in the tracker: a ring of its subtopics, its name, and three icons for
// Read, Watched and Drilled. The whole tile opens the topic's sheet, and it only
// reports: changing anything happens there, so a tap always does one thing.
import { memo } from 'react';
import { isTopicCovered, isTopicDrilled } from '@ree/shared';
import { subtopicProgress } from '@ree/shared/subtopics';
import { Card, Ring, StatusPill, cn } from '../../components/ui';
import { isWeak } from './trackerModel';
import { CHECKS } from './topicChecks';

function StatusIcons({ row }) {
  const on = { read: row.read, watched: row.watched, drilled: isTopicDrilled(row) };
  const words = CHECKS.map(({ key, word }) => (on[key] ? word : `not ${word}`)).join(', ');
  return (
    <span role="img" aria-label={words} title={words} className="inline-flex gap-1">
      {CHECKS.map(({ key, icon: Icon }) => (
        <span
          key={key}
          aria-hidden="true"
          className={cn(
            'inline-flex items-center justify-center size-6 rounded-full border',
            on[key] ? 'bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] border-[color-mix(in_srgb,var(--accent)_45%,transparent)] text-[var(--accent-text)]' : 'border-border text-muted',
          )}
        >
          <Icon size={13} strokeWidth={on[key] ? 2.25 : 1.5} />
        </span>
      ))}
    </span>
  );
}

const TopicTile = memo(function TopicTile({ row, rows, ready, onOpen }) {
  const { done, total } = subtopicProgress(rows);
  const hasList = ready && total > 0;
  const weak = isWeak(row);
  return (
    <Card
      as="li"
      variant="interactive"
      padding="sm"
      className="flex items-center gap-3 min-w-0"
      style={weak ? { borderColor: 'color-mix(in srgb, var(--accent-danger) 55%, transparent)' } : undefined}
    >
      <Ring
        size={52}
        stroke={5}
        percent={hasList ? (done / total) * 100 : 0}
        done={hasList && done === total}
        label={hasList ? `${row.name}: ${done} of ${total} subtopics` : `${row.name}: no subtopics`}
      >
        {hasList ? `${done}/${total}` : '—'}
      </Ring>
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">
          {/* The whole tile is the target (the ::after), but only the name is the
              button's name, so a screen reader hears the topic and then its figures. */}
          <button type="button" aria-haspopup="dialog" onClick={() => onOpen(row.topicId)} className="text-left cursor-pointer after:absolute after:inset-0 after:content-['']">
            {row.name}
          </button>
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusIcons row={row} />
          {weak && <StatusPill tone="danger" dot={false}>Weak</StatusPill>}
          {row.highYield && <StatusPill tone="velocity" dot={false}>High-yield</StatusPill>}
          {isTopicCovered(row) && <StatusPill tone="success" dot={false}>Covered</StatusPill>}
        </div>
      </div>
    </Card>
  );
});

export default TopicTile;
