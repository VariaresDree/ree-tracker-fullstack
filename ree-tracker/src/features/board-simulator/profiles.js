// src/features/board-simulator/profiles.js
//
// The mock-board profiles, stated once: the Simulator's setup screen and the
// Exams hub (features/exams/MockBoardTab) both list them, and the hub links to
// /simulator?profile=<id> to open setup with one already chosen.
import { Settings2, Landmark, Scale, Layers } from '../../components/ui/icons';
import { PRC_FORMAT_SUMMARY } from '../../config/examStandards';

export const SIM_PROFILES = [
  {
    id: 'custom',
    icon: Settings2,
    name: 'Custom Drill',
    description: 'Pick the item count, topic, and source for focused practice.',
  },
  {
    id: 'prc_subject',
    icon: Landmark,
    name: 'PRC Standard',
    description: `One subject, 100 items, on the PRC clock (${PRC_FORMAT_SUMMARY}).`,
  },
  {
    id: 'prc_blended',
    icon: Scale,
    name: 'Full Blended',
    description: 'One 100-item mixed paper in 5 hours.',
  },
  {
    id: 'prc_full',
    icon: Layers,
    name: 'Full PRC board',
    description: `Math, ESAS and EE in board order: 300 items on the PRC clock (${PRC_FORMAT_SUMMARY}), results after the last section.`,
  },
];

export const isSimProfile = (id) => SIM_PROFILES.some((p) => p.id === id);

/**
 * The engine config a profile implies, given the current one. Null for the
 * full board, which is a separate flow (features/board-simulator/fullBoard.js)
 * rather than a config.
 */
export function configForProfile(profile, config) {
  const subject = config.subject === 'blended' ? 'Mathematics' : config.subject;
  if (profile === 'custom') return { ...config, mode: 'subject', isPrcStandard: false, count: 50, subject };
  if (profile === 'prc_subject') return { ...config, mode: 'subject', isPrcStandard: true, count: 100, subject };
  if (profile === 'prc_blended') return { ...config, mode: 'blended', isPrcStandard: true, count: 100, subject: 'blended' };
  return null;
}
