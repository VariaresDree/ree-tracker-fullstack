// src/features/notebook/NotebookTab.jsx
//
// Library › Notebook: your mistakes (every question you got wrong, why, and
// whether it's fixed) and your notes on questions and formula cards.
import { useState } from 'react';
import { SectionHeader, SegmentedControl } from '../../components/ui';
import MistakesPanel from './MistakesPanel';
import NotesPanel from './NotesPanel';

export default function NotebookTab({ currentUser, isOnline }) {
  const [view, setView] = useState('mistakes');
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        divider
        title="Notebook"
        description={view === 'mistakes'
          ? 'Every question you got wrong, newest first, with its solution. Tag why you missed it, then practise the ones still open.'
          : 'Your own notes on questions and formula cards, newest first.'}
        actions={(
          <SegmentedControl
            label="Notebook section"
            value={view}
            onChange={setView}
            options={[{ value: 'mistakes', label: 'Mistakes' }, { value: 'notes', label: 'My notes' }]}
          />
        )}
      />
      {view === 'mistakes'
        ? <MistakesPanel currentUser={currentUser} isOnline={isOnline} />
        : <NotesPanel isOnline={isOnline} />}
    </div>
  );
}
