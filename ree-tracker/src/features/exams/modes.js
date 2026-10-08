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
    how: 'Timed on the PRC clock. Scores and the answer review come at the end.',
    to: '/exams?tab=mock',
  },
  {
    id: 'gauntlet',
    name: 'Gauntlet',
    icon: Shield,
    when: 'Pushing your level',
    how: 'A ranked ladder of timed tiers. Not passing a tier locks it for 12 hours.',
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

/**
 * Where a learner should start, from a projected general weighted average:
 * below 60, learn the topics (Practice); up to the 70% pass mark, find out
 * under time (Mock board); at or above it, push the level (Gauntlet).
 */
export function startingMode(projectedAverage) {
  const gwa = Number(projectedAverage);
  if (!Number.isFinite(gwa) || gwa < 60) return 'practice';
  return gwa < 70 ? 'mock' : 'gauntlet';
}
