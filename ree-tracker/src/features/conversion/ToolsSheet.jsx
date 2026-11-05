// src/features/conversion/ToolsSheet.jsx
//
// Practice's calculator and converter, over the question. Timed exams don't offer
// it: they have the scratchpad only, as the board does. A formula card opens it at
// the quantity it uses (`category`), so a study session isn't lost to get there.
import { useState } from 'react';
import { Modal, SegmentedControl } from '../../components/ui';
import Calculator from './Calculator';
import UnitsPanel from './UnitsPanel';

export default function ToolsSheet({ onClose, category = null }) {
  const [view, setView] = useState(category ? 'units' : 'calculator');
  const [units, setUnits] = useState({ cat: category, from: null, to: null, v: null, group: null });
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
