// src/features/board-simulator/DrawPicker.jsx
//
// Mock setup's "How questions are picked": Even spread, Board's counts or My own,
// with a small picture of what the choice means for this paper, and the sheet
// where a learner sets their own counts.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { SYLLABUS_SUBJECTS, toDisplaySubject } from '@ree/shared';
import { BOARD_GROUPS, ownBlueprint, ownCountsFromBoard } from '@ree/shared/boardItems';
import { useStore } from '../../store/useStore';
import { fetchBoardGroups } from '../../services/dbQueries';
import { Button, Modal, SegmentedControl, Stepper } from '../../components/ui';
import { DRAW_MODES } from './drawModes';

const MAX_PER_TOPIC = 100;
const SUBJECT_OPTIONS = SYLLABUS_SUBJECTS.map((s) => ({ value: s, label: toDisplaySubject(s) }));
const sum = (counts) => Object.values(counts || {}).reduce((a, b) => a + b, 0);

/** One subject's counts as one bar, largest first, each share in proportion. */
function ShareBar({ subject, groups, labelled }) {
  const rows = [...(groups?.[subject] || [])].filter((g) => g.items > 0).sort((a, b) => b.items - a.items);
  const describe = (g) => `${g.topics.join(', ')}: ${g.items}`;
  if (rows.length === 0) {
    return <p className="text-xs text-muted2">{labelled ? `${toDisplaySubject(subject)}: ` : ''}No counts yet, so this paper draws evenly.</p>;
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {labelled && <span className="w-10 shrink-0 text-xs text-muted2">{toDisplaySubject(subject)}</span>}
        <div role="img" aria-label={`${toDisplaySubject(subject)}. ${rows.map(describe).join('. ')}`} className="flex-1 min-w-0 flex gap-0.5 h-2">
          {rows.map((g) => (
            <span key={g.topics[0]} title={describe(g)} className="min-w-0.5 rounded-sm bg-[var(--accent-velocity)]" style={{ flexGrow: g.items, flexBasis: 0 }} />
          ))}
        </div>
      </div>
      {!labelled && <p className="text-xs text-muted2 [overflow-wrap:anywhere]">Most items: {rows.slice(0, 2).map(describe).join(' · ')}</p>}
    </div>
  );
}

function OwnCountsSheet({ counts, startSubject, boardGroups, onSave, onClose }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const [draft, setDraft] = useState(counts || {});
  const [subject, setSubject] = useState(startSubject);
  const own = draft[subject] || {};
  const setCount = (topic, n) => setDraft((d) => ({ ...d, [subject]: { ...d[subject], [topic]: n } }));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="My own counts"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(draft)}>Save counts</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-3">
        <SegmentedControl label="Subject" options={SUBJECT_OPTIONS} value={subject} onChange={setSubject} fullWidth />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-textMain tabular-nums">Total {sum(own)} items</span>
          <Button size="sm" variant="secondary" onClick={() => setDraft(ownCountsFromBoard(boardGroups || BOARD_GROUPS))}>Start from the board’s counts</Button>
        </div>
        <p className="text-xs text-muted2">Any total works: a paper scales these to its own length.</p>
        <ul aria-label={`${toDisplaySubject(subject)} counts`} className="flex flex-col divide-y divide-border">
          {(dynamicTOS?.[subject] || []).map((topic) => (
            <li key={topic} className="py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="flex-1 min-w-40 text-sm text-textMain [overflow-wrap:anywhere]">{topic}</span>
              <Stepper label={`Items for ${topic}`} value={own[topic] || 0} max={MAX_PER_TOPIC} onChange={(n) => setCount(topic, n)} />
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

/**
 * @param {{ drawMode: string, ownCounts: object }} prefs
 * @param {(patch: object) => Promise} onChange saves the change
 * @param {string[]} subjects the subjects this paper covers
 */
export default function DrawPicker({ prefs, onChange, subjects }) {
  const { drawMode, ownCounts } = prefs;
  const [boardGroups, setBoardGroups] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const mode = DRAW_MODES.find((m) => m.value === drawMode) || DRAW_MODES[0];

  // Only once something on the screen needs them.
  const needsBoard = drawMode === 'board' || sheetOpen;
  useEffect(() => {
    if (!needsBoard || boardGroups) return undefined;
    let live = true;
    fetchBoardGroups().then((groups) => { if (live) setBoardGroups(groups || BOARD_GROUPS); });
    return () => { live = false; };
  }, [needsBoard, boardGroups]);

  const save = (patch) => Promise.resolve(onChange(patch)).catch((err) => toast.error(err?.message || 'Couldn’t save that choice.'));
  const shown = drawMode === 'own' ? ownBlueprint(ownCounts) : drawMode === 'board' ? boardGroups : null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-label block">How questions are picked</span>
      <SegmentedControl label="How questions are picked" size="lg" options={DRAW_MODES} value={mode.value} onChange={(v) => save({ drawMode: v })} />
      <p className="text-sm text-muted2">{mode.description}</p>
      {shown && (
        <div className="flex flex-col gap-1.5">
          {subjects.map((s) => <ShareBar key={s} subject={s} groups={shown} labelled={subjects.length > 1} />)}
        </div>
      )}
      {drawMode === 'own' && (
        <Button size="sm" variant="secondary" className="self-start" onClick={() => setSheetOpen(true)}>Set my counts</Button>
      )}
      {sheetOpen && (
        <OwnCountsSheet
          counts={ownCounts}
          startSubject={subjects[0]}
          boardGroups={boardGroups}
          onClose={() => setSheetOpen(false)}
          onSave={(next) => { setSheetOpen(false); save({ ownCounts: next }); }}
        />
      )}
    </div>
  );
}
