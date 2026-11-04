// src/features/conversion/ToolsSheet.jsx
//
// Practice's calculator and converter, over the question. Timed exams don't offer
// it: they have the scratchpad only, as the board does.
import { useState } from 'react';
import { Modal, SegmentedControl } from '../../components/ui';
import Calculator from './Calculator';
import UnitsPanel from './UnitsPanel';

export default function ToolsSheet({ onClose }) {
  const [view, setView] = useState('calculator');
  const [units, setUnits] = useState({ cat: null, from: null, to: null, v: null });
  return (
    <Modal open onClose={onClose} title="Calculator and units" size="lg">
      <div className="flex flex-col gap-4 min-w-0">
        <SegmentedControl label="Show" value={view} onChange={setView} options={[{ value: 'calculator', label: 'Calculator' }, { value: 'units', label: 'Units' }]} />
        {view === 'calculator'
          ? <Calculator />
          : <UnitsPanel state={units} onChange={(patch) => setUnits((u) => ({ ...u, ...patch }))} />}
      </div>
    </Modal>
  );
}
