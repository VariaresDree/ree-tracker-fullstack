// src/features/exams/MockBoardTab.jsx
//
// The Exams hub's first tab: pick a mock-board profile and go to its setup.
// Each card opens /simulator?profile=<id>, where the Simulator's setup screen
// already has that profile chosen (and offers to resume a saved sitting).
import { Link } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { ArrowRight } from '../../components/ui/icons';
import { SIM_PROFILES } from '../board-simulator/profiles';

export default function MockBoardTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted2">A timed sitting on the PRC clock. Choose a format, then set the details.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SIM_PROFILES.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-[var(--radius-default)] flex items-center justify-center bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent-text)]">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-textMain">{p.name}</h2>
                  <p className="text-sm text-muted2 mt-1 leading-relaxed">{p.description}</p>
                </div>
              </div>
              <Button as={Link} to={`/simulator?profile=${p.id}`} variant="secondary" className="self-start">
                Set up <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
