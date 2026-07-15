// src/config/examStandards.js
// Single source of truth for PRC board-exam standards (per-subject time limits)
// and the Gauntlet tier progression. These times were previously hard-coded
// inline in several files (useSimulatorEngine, SimulatorConfig, examPaper, Arena)
// and GAUNTLET_TIERS was duplicated in Arena (minutes) + useGauntletEngine
// (seconds) with different shapes — a change-one-forget-the-other trap.

// Per-subject PRC board exam durations, in SECONDS.
export const PRC_TIMES = {
  EE: 6 * 3600,           // Electrical Engineering — 6 hours
  Mathematics: 4 * 3600,  // 4 hours
  ESAS: 4 * 3600,         // Engineering Sciences & Allied Subjects — 4 hours
  BLENDED: 5 * 3600,      // Full blended board — 5 hours
};

// Gauntlet progression.
//   Levels 1–4: BLENDED tiers (all subjects), gated by lifetime answered-count
//               (`reqQs`) + sequential level, pass at 70% advances gauntletLevel.
//   Levels 5–7: per-subject BOARD exams (100 items each at their board time),
//               unlocked ONLY after the blended progression is cleared
//               (gauntletLevel >= 5). Passing a subject level records completion
//               but does NOT advance the linear level (they're parallel endgame
//               exams, not a ladder).
export const GAUNTLET_TIERS = [
  { level: 1, name: 'Initiate Protocol', subject: 'BLENDED',     items: 50,  timeLimitSecs: 75 * 60,          reqQs: 200 },
  { level: 2, name: 'Specialist Matrix', subject: 'BLENDED',     items: 75,  timeLimitSecs: 110 * 60,         reqQs: 500 },
  { level: 3, name: 'Architect Core',    subject: 'BLENDED',     items: 100, timeLimitSecs: 150 * 60,         reqQs: 1000 },
  { level: 4, name: 'Apex Agent',        subject: 'BLENDED',     items: 100, timeLimitSecs: 120 * 60,         reqQs: 2000 },
  { level: 5, name: 'Mathematics Board', subject: 'Mathematics', items: 100, timeLimitSecs: PRC_TIMES.Mathematics, unlockAfterBlended: true },
  { level: 6, name: 'ESAS Board',        subject: 'ESAS',        items: 100, timeLimitSecs: PRC_TIMES.ESAS,        unlockAfterBlended: true },
  { level: 7, name: 'EE Board',          subject: 'EE',          items: 100, timeLimitSecs: PRC_TIMES.EE,          unlockAfterBlended: true },
];

// Number of blended tiers that must be cleared before the subject boards unlock.
// Clearing tier 4 advances gauntletLevel to 5, which is the unlock threshold.
export const BLENDED_TIER_COUNT = GAUNTLET_TIERS.filter((t) => t.subject === 'BLENDED').length;
export const SUBJECT_UNLOCK_LEVEL = BLENDED_TIER_COUNT + 1; // 5

export const getGauntletTier = (level) => GAUNTLET_TIERS.find((t) => t.level === Number(level)) || null;
export const isSubjectTier = (tier) => !!tier && tier.subject !== 'BLENDED';
