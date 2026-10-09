// src/config/examStandards.js
// Single source of truth for PRC board-exam standards (per-subject time limits)
// and the Gauntlet tier progression. These times were previously hard-coded
// inline in several files (useSimulatorEngine, SimulatorConfig, examPaper, Arena)
// and GAUNTLET_TIERS was duplicated in Arena (minutes) + useGauntletEngine
// (seconds) with different shapes — a change-one-forget-the-other trap.

import { PRC_EXAM_FORMAT } from '@ree/shared';

// Per-subject PRC board exam durations, in SECONDS — derived from the shared
// PRC_EXAM_FORMAT so the Simulator, Gauntlet boards, battles and every copy
// string agree. These were literals here (with Mathematics still at the old
// 4h); BLENDED is the app's own full-blended mock, not a PRC sitting.
const sectionSecs = (subject) => PRC_EXAM_FORMAT[subject].minutes * 60;
export const PRC_TIMES = {
  EE: sectionSecs('EE'),
  Mathematics: sectionSecs('Mathematics'),
  ESAS: sectionSecs('ESAS'),
  BLENDED: 5 * 3600,
};

const hoursLabel = (minutes) => `${minutes / 60}h`;
/** "Math 5h · ESAS 4h · EE 6h" — the one place UI copy reads the schedule from. */
export const PRC_FORMAT_SUMMARY = [
  ['Math', 'Mathematics'], ['ESAS', 'ESAS'], ['EE', 'EE'],
].map(([label, key]) => `${label} ${hoursLabel(PRC_EXAM_FORMAT[key].minutes)}`).join(' · ');

// Gauntlet progression: the tiers, the unlock level and the lock live in
// @ree/shared (gauntlet.js), because the server now applies the same ladder
// rule when it grades a run. Re-exported so existing imports keep working.
export {
  GAUNTLET_TIERS, BLENDED_TIER_COUNT, SUBJECT_UNLOCK_LEVEL, GAUNTLET_LOCK_MS,
  getGauntletTier, isSubjectTier,
} from '@ree/shared';
