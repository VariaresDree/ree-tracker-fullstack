// src/features/progress/WeakSpotsTab.jsx
//
// Progress → Weak spots: everything that ends in "practise this". The two
// drills, the cross-session blind spots and time sinks, and the forecast's
// recommended fixes. These were spread over the Dashboard ("Today's
// prescription") and Profile's deep analytics ("Blind spots").
import { useNavigate } from 'react-router-dom';
import { useTOSSlice } from '../../store/slices';
import { Button } from '../../components/ui';
import { Crosshair } from '../../components/ui/icons';
import { drillPreset, launchPractice } from '../active-recall/presets';
import { PrescriptionPanel } from '../analytics/PrescriptionPanel';
import WeakSignals from '../analytics/sections/WeakSignals';
import { routePrescription } from './prescriptionRouting';

export default function WeakSpotsTab() {
  const navigate = useNavigate();
  const { dynamicTOS } = useTOSSlice();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => launchPractice(navigate, drillPreset())}>
          <Crosshair size={15} strokeWidth={2} aria-hidden="true" /> Weak-spot drill
        </Button>
        <Button size="sm" variant="secondary" onClick={() => launchPractice(navigate, drillPreset({ mode: 'blind-spot' }))}>
          Blind-spot drill
        </Button>
        <span className="text-xs text-muted2">Ten adaptive questions on your weakest topics.</span>
      </div>

      <WeakSignals />
      <PrescriptionPanel onAction={(action) => routePrescription(action, { navigate, tos: dynamicTOS })} />
    </div>
  );
}
