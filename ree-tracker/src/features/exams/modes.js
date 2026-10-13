// The four ways to study, and where to start (features/exams/ModeGuide.jsx).
import { BrainCircuit, Landmark, Shield, Swords } from '../../components/ui/icons';

export const MODES = [
  {
    id: 'practice',
    name: 'Practice',
    icon: BrainCircuit,
    when: 'Learning a topic',
    how: 'Untimed. The answer and the solution show after every question.',
    to: '/practice',
  },
  {
    id: 'mock',
    name: 'Mock board',
    icon: Landmark,
    when: 'Checking where you stand',
    how: 'Timed on the PRC clock (a custom mock gives 2 minutes a question). Scores and the answer review come at the end.',
    to: '/exams?tab=mock',
  },
  {
    id: 'gauntlet',
    name: 'Gauntlet',
    icon: Shield,
    when: 'Pushing your level',
    how: 'A ranked ladder of timed tiers. Not passing one locks the Gauntlet for 12 hours.',
    to: '/exams?tab=gauntlet',
  },
  {
    id: 'battles',
    name: 'Battles',
    icon: Swords,
    when: 'Studying with friends',
    how: 'The same timed set at the same time, with a shared scoreboard.',
    to: '/exams?tab=battles',
  },
];

// Where to start lives in startingPlan.js (no icon imports, so Today's logic
// can use it); re-exported here beside the modes it names.
export { startingMode, startingPlan } from './startingPlan';
