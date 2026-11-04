// src/features/exams/MockBoardTab.jsx
//
// The Exams hub's first tab: pick a mock-board profile and go to its setup.
// Each card opens /simulator?profile=<id>, where the Simulator's setup screen
// already has that profile chosen (and offers to resume a saved sitting).
//
// The full PRC board leads, as the tab's hero: it is the exam itself. The other
// three follow as small tiles, closest to the board first, and the whole tile is
// the way in. All four had equal weight, and then each its own badge, paragraph
// and button.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardWatermark, Grid, IconChip } from '../../components/ui';
import { ArrowRight, ChevronRight } from '../../components/ui/icons';
import { SIM_PROFILES } from '../board-simulator/profiles';
import SavedRunCard from './SavedRunCard';
import { readSavedRuns } from './savedRuns';

const FOLLOWERS = ['prc_blended', 'prc_subject', 'custom'];
const byId = (id) => SIM_PROFILES.find((p) => p.id === id);

export default function MockBoardTab() {
  const board = byId('prc_full');
  const [saved] = useState(readSavedRuns);
  return (
    <div className="flex flex-col gap-4">
      {saved.mock && <SavedRunCard title="Unfinished mock board" summary={saved.mock.summary} to="/simulator" />}
      {saved.board && !saved.mock && <SavedRunCard title="Full PRC board in progress" summary={saved.board.summary} to="/simulator" action="Continue" />}
      <Card as="section" variant="hero" padding="md" aria-labelledby="mock-lead" className="flex flex-col gap-2">
        <CardWatermark icon={board.icon} />
        <p className="text-eyebrow">The real thing</p>
        <h2 id="mock-lead" className="text-h2 text-textMain">{board.name}</h2>
        <p className="text-sm text-muted2 max-w-prose">{board.description}</p>
        <div className="pt-1">
          <Button as={Link} to={`/simulator?profile=${board.id}`} size="lg" className="w-full sm:w-auto">
            Set up <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        </div>
      </Card>

      <Grid kind="cards" gap="sm">
        {FOLLOWERS.map(byId).map((p) => (
          <Card
            key={p.id}
            as={Link}
            to={`/simulator?profile=${p.id}`}
            variant="interactive"
            padding="sm"
            aria-label={`Set up ${p.name}`}
            className="flex items-center gap-3 min-w-0"
          >
            <IconChip icon={p.icon} size="sm" />
            <span className="min-w-0 flex-1 flex flex-col">
              <span className="text-sm font-semibold text-textMain">{p.name}</span>
              <span className="text-xs text-muted2">{p.blurb}</span>
            </span>
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />
          </Card>
        ))}
      </Grid>
    </div>
  );
}
