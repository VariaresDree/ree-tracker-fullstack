// src/features/exams/MockBoardTab.jsx
//
// The Exams hub's first tab: pick a mock-board profile and go to its setup.
// Each card opens /simulator?profile=<id>, where the Simulator's setup screen
// already has that profile chosen (and offers to resume a saved sitting).
//
// The full PRC board leads, as the tab's hero: it is the exam itself. The
// other three follow as choice cards, closest to the board first, each with a
// badge for what kind of sitting it is. All four had equal weight.
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardTitle, CardWatermark, Grid, IconChip } from '../../components/ui';
import { ArrowRight } from '../../components/ui/icons';
import { SIM_PROFILES } from '../board-simulator/profiles';

// What kind of sitting each profile is, beside its name.
const KIND = {
  prc_full: { tone: 'velocity', label: 'PRC standard' },
  prc_blended: { tone: 'signal', label: 'Blended' },
  prc_subject: { tone: 'velocity', label: 'PRC standard' },
  custom: { tone: 'neutral', label: 'Custom' },
};
const FOLLOWERS = ['prc_blended', 'prc_subject', 'custom'];
const byId = (id) => SIM_PROFILES.find((p) => p.id === id);

export default function MockBoardTab() {
  const board = byId('prc_full');
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted2">A timed sitting on the PRC clock. Choose a format, then set the details.</p>

      <Card as="section" variant="hero" aria-labelledby="mock-lead" className="flex flex-col gap-3">
        <CardWatermark icon={board.icon} />
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-eyebrow">The real thing</p>
          <Badge tone={KIND.prc_full.tone}>{KIND.prc_full.label}</Badge>
          <Badge>3 sections · 300 items</Badge>
        </div>
        <h2 id="mock-lead" className="text-h2 text-textMain">{board.name}</h2>
        <p className="text-sm text-muted2 max-w-prose leading-relaxed">{board.description}</p>
        <div className="pt-2">
          <Button as={Link} to={`/simulator?profile=${board.id}`} size="lg" className="w-full sm:w-auto">
            Set up <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      </Card>

      <Grid kind="cards">
        {FOLLOWERS.map(byId).map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} variant="interactive" padding="md" className="flex flex-col gap-3">
              <CardWatermark icon={Icon} corner="top" />
              <IconChip icon={Icon} />
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <CardTitle>{p.name}</CardTitle>
                <Badge tone={KIND[p.id].tone} className="self-start">{KIND[p.id].label}</Badge>
                <p className="text-sm text-muted2 leading-relaxed">{p.description}</p>
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
