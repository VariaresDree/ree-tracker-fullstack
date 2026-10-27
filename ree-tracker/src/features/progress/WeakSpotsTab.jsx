// src/features/progress/WeakSpotsTab.jsx
//
// Progress → Weak spots: everything that ends in "practise this". The two
// drills, the cross-session blind spots and time sinks, and the forecast's
// recommended fixes. These were spread over the Dashboard ("Today's
// prescription") and Profile's deep analytics ("Blind spots").
import { useNavigate } from 'react-router-dom';
import { useTOSSlice } from '../../store/slices';
import { Button, Card, CardWatermark } from '../../components/ui';
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
      {/* The tab's hero: the two drills, above what they draw from. They
          were a row of small buttons with a hint beside them. */}
      <Card as="section" variant="hero" aria-labelledby="weak-lead" className="flex flex-col gap-3">
        <CardWatermark icon={Crosshair} />
        <h2 id="weak-lead" className="text-h2 text-textMain">Fix what’s costing you points</h2>
        <p className="text-sm text-muted2 max-w-prose">
          Ten adaptive questions on your weakest topics, or only on the ones you answered confidently and got wrong.
        </p>
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Button size="lg" className="w-full sm:w-auto" onClick={() => launchPractice(navigate, drillPreset())}>
            <Crosshair size={16} strokeWidth={2} aria-hidden="true" /> Weak-spot drill
          </Button>
          <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={() => launchPractice(navigate, drillPreset({ mode: 'blind-spot' }))}>
            Blind-spot drill
          </Button>
        </div>
      </Card>

      <WeakSignals />
      <PrescriptionPanel onAction={(action) => routePrescription(action, { navigate, tos: dynamicTOS })} />
    </div>
  );
}
