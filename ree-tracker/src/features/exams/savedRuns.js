// src/features/exams/savedRuns.js
//
// What's unfinished on this device, for the Exams tabs and the resume screens. A
// saved run was only ever found by going back into the same screen, and it said
// nothing about how far along it was, though its clock kept running.
import { formatDuration } from '../../utils/time';
import { FULL_BOARD_SECTIONS, loadFullBoard } from '../board-simulator/fullBoard';

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** "12 of 100 answered · 1h 20m left", from a saved mock or Gauntlet run. */
export function draftSummary(draft, now = Date.now()) {
  const total = draft?.questions?.length || 0;
  const answered = Object.values(draft?.answers || {}).filter((a) => a != null && a !== '').length;
  const left = draft?.endTime ? Math.round((draft.endTime - now) / 1000) : null;
  const time = left == null ? null : left > 0 ? `${formatDuration(left)} left` : 'time is up, so it submits when you open it';
  return [`${answered} of ${total} answered`, time].filter(Boolean).join(' · ');
}

export function readSavedRuns(now = Date.now()) {
  const mock = read('ree_sim_cache');
  const gauntlet = read('ree_gauntlet_cache');
  const board = loadFullBoard(now);
  return {
    mock: mock?.questions?.length ? { summary: draftSummary(mock, now) } : null,
    gauntlet: gauntlet?.questions?.length ? { level: gauntlet.level, summary: draftSummary(gauntlet, now) } : null,
    board: board ? { summary: `${board.sectionIndex} of ${FULL_BOARD_SECTIONS.length} sections done` } : null,
  };
}
