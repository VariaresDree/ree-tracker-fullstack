// src/features/board-simulator/drawModes.js
//
// How a paper's questions are picked, the learner's choice:
//   even   about the same from every topic, the default
//   board  the board's items per topic, as Admin set them (Admin › Syllabus)
//   own    the learner's own counts
// The sitting and the printed paper both draw through this. Null groups mean an
// even spread. It means nothing for a topic-pinned or AI-written mock.
import { BOARD_GROUPS, ownBlueprint } from '@ree/shared/boardItems';

export const DRAW_MODES = [
  { value: 'even', label: 'Even spread', description: 'About the same number from every topic.' },
  { value: 'board', label: 'Board’s counts', description: 'The number of items the board gives each topic.' },
  { value: 'own', label: 'My own', description: 'The number you set for each topic.' },
];

/** A custom mock on one topic, or written by AI, has nothing to choose. */
export const drawApplies = (config = {}) => {
  if (config.source === 'ai') return false;
  if (config.mode === 'blended' || config.isPrcStandard) return true;
  return !config.subtopic || config.subtopic === 'All';
};

/**
 * The groups a paper draws by, or null for an even spread. PRC's table when
 * Admin's counts can't be reached, so a paper can always be drawn.
 * @param {object} config has drawMode, and ownCounts for 'own'
 * @param {() => Promise<object|null>} fetchBoardGroups
 */
export async function groupsForDraw(config, fetchBoardGroups) {
  if (!drawApplies(config)) return null;
  if (config.drawMode === 'own') return ownBlueprint(config.ownCounts);
  if (config.drawMode !== 'board') return null;
  try {
    return (await fetchBoardGroups()) || BOARD_GROUPS;
  } catch {
    return BOARD_GROUPS;
  }
}
