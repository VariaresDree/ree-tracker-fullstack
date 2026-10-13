// src/features/notebook/NotebookTab.jsx
//
// Library › Notebook: your mistakes (every question you got wrong, why, and
// whether it's fixed) and your notes on questions and formula cards.
import { useState } from 'react';
import { SegmentedControl } from '../../components/ui';
import MistakesPanel from './MistakesPanel';
import NotesPanel from './NotesPanel';

export default function NotebookTab({ currentUser, isOnline }) {
  const [view, setView] = useState('mistakes');
  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-display text-2xl text-textMain tracking-tight">Notebook</h2>
          <p className="text-muted2 mt-1 text-sm max-w-prose">
            {view === 'mistakes'
              ? 'Every question you got wrong, newest first, with its solution. Tag why you missed it, then practise the ones still open.'
              : 'Your own notes on questions and formula cards, newest first.'}
          </p>
        </div>
        <SegmentedControl
          label="Notebook section"
          value={view}
          onChange={setView}
          options={[{ value: 'mistakes', label: 'Mistakes' }, { value: 'notes', label: 'My notes' }]}
        />
      </div>
      {view === 'mistakes'
        ? <MistakesPanel currentUser={currentUser} isOnline={isOnline} />
        : <NotesPanel isOnline={isOnline} />}
    </div>
  );
}
