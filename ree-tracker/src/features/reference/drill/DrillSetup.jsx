// src/features/reference/drill/DrillSetup.jsx
//
// What to drill: which cards, how, which way round, and how many.
import { useState } from 'react';
import { Button, FormField, Modal, SegmentedControl } from '../../../components/ui';
import { Target } from '../../../components/ui/icons';

const MODES = [
  { value: 'recall', label: 'Recall', hint: 'Write, check' },
  { value: 'choose', label: 'Choose', hint: 'One of four' },
  { value: 'match', label: 'Match', hint: 'Tap pairs' },
];
const ASKS = [
  { value: 'formula', label: 'Name → formula' },
  { value: 'name', label: 'Formula → name' },
];
const COUNTS = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 'all', label: 'All' },
];

export default function DrillSetup({ scopes, onStart, onClose }) {
  const [scopeId, setScopeId] = useState(scopes[0].id);
  const [mode, setMode] = useState('recall');
  const [ask, setAsk] = useState('formula');
  const [count, setCount] = useState(10);
  const scope = scopes.find((s) => s.id === scopeId) || scopes[0];
  return (
    <Modal
      open
      onClose={onClose}
      icon={Target}
      title="Formula drill"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onStart({ cards: scope.cards, mode, ask, count })}>Start drill</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <FormField label="Cards">
          <SegmentedControl
            label="Cards"
            value={scope.id}
            onChange={setScopeId}
            columns={2}
            options={scopes.map((s) => ({ value: s.id, label: s.label, hint: `${s.cards.length} card${s.cards.length === 1 ? '' : 's'}` }))}
          />
        </FormField>
        <FormField label="How">
          <SegmentedControl label="How" value={mode} onChange={setMode} options={MODES} />
        </FormField>
        {/* Pairs have no direction. */}
        {mode !== 'match' && (
          <FormField label="Asking for">
            <SegmentedControl label="Asking for" value={ask} onChange={setAsk} options={ASKS} />
          </FormField>
        )}
        <FormField label="How many">
          <SegmentedControl label="How many" value={count} onChange={setCount} options={COUNTS} />
        </FormField>
        <p className="text-xs text-muted2">
          {mode === 'recall'
            ? 'A rating moves a card’s schedule only if it’s new or due, or you rate it Again.'
            : 'A miss brings that card back tomorrow. A right answer changes nothing, since recognizing isn’t recalling.'}
          {' '}Drills never count toward your rating, readiness or streak.
        </p>
      </div>
    </Modal>
  );
}
