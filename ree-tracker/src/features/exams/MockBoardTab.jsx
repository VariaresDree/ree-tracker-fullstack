// src/features/exams/MockBoardTab.jsx
//
// The Exams hub's first tab: pick a mock-board profile and go to its setup.
// Each card opens /simulator?profile=<id>, where the Simulator's setup screen
// already has that profile chosen (and offers to resume a saved sitting).
import { Link } from 'react-router-dom';
import { Button, Card, CardTitle, Grid, IconChip } from '../../components/ui';
import { ArrowRight } from '../../components/ui/icons';
import { SIM_PROFILES } from '../board-simulator/profiles';

export default function MockBoardTab() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted2">A timed sitting on the PRC clock. Choose a format, then set the details.</p>
      <Grid kind="pair">
        {SIM_PROFILES.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} padding="md" className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <IconChip icon={Icon} />
                <div className="min-w-0">
                  <CardTitle>{p.name}</CardTitle>
                  <p className="text-sm text-muted2 mt-1 leading-relaxed">{p.description}</p>
                </div>
              </div>
              <Button as={Link} to={`/simulator?profile=${p.id}`} variant="secondary" className="self-start">
                Set up <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </Card>
          );
        })}
      </Grid>
    </div>
  );
}
