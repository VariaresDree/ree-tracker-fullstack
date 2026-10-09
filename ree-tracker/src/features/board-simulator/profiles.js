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
    name: 'Custom mock',
    description: 'Pick the item count, topic, and source for focused practice.',
  },
  {
    id: 'prc_subject',
    icon: Landmark,
    name: 'One subject (PRC clock)',
    description: `One subject, 100 items, on the PRC clock (${PRC_FORMAT_SUMMARY}).`,
  },
  {
    id: 'prc_blended',
    icon: Scale,
    name: 'Mixed paper',
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

// A recorded sitting's `kind` (services/examHistory on the server) → the name
// the learner chose it by. Past sittings used its own labels ("Full blended",
// "Custom drill") that matched none of the format names.
const PROFILE_BY_KIND = { custom: 'custom', subject: 'prc_subject', blended: 'prc_blended', 'full-board': 'prc_full' };
const OTHER_KINDS = { battle: 'Battle', retake: 'Retake', placement: 'Placement test', gauntlet: 'Gauntlet run' };

/** "Mixed paper", "Full PRC board", "Battle"… for a sitting kind; null when unknown. */
export function sittingKindLabel(kind) {
  const profile = SIM_PROFILES.find((p) => p.id === PROFILE_BY_KIND[kind]);
  return profile?.name || OTHER_KINDS[kind] || null;
}

/**
 * The engine config a profile implies, given the current one. Null for the
 * full board, which is a separate flow (features/board-simulator/fullBoard.js)
 * rather than a config.
 */
/**
 * The setup form's view of a config: everything a finished run leaves behind
 * that must not carry into the next one is dropped. A leftover `battleId` made
 * the next mock wait for a battle server that would never grade it ("GRADING"
 * forever); a leftover `fullBoard` filed it under the old board's session and
 * showed that board's result again.
 */
export function setupConfig(config = {}) {
  // eslint-disable-next-line no-unused-vars
  const { battleId, fullBoard, retake, retakeQuestions, ...rest } = config;
  return { ...rest, source: rest.source === 'retake' ? 'library' : (rest.source || 'library') };
}

export function configForProfile(profile, rawConfig) {
  const config = setupConfig(rawConfig);
  const subject = config.subject === 'blended' || config.subject === 'Mixed' ? 'Mathematics' : config.subject;
  if (profile === 'custom') return { ...config, mode: 'subject', isPrcStandard: false, count: 50, subject };
  if (profile === 'prc_subject') return { ...config, mode: 'subject', isPrcStandard: true, count: 100, subject };
  if (profile === 'prc_blended') return { ...config, mode: 'blended', isPrcStandard: true, count: 100, subject: 'blended' };
  return null;
}
