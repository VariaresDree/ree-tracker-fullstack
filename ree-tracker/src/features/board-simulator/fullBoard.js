// src/features/board-simulator/fullBoard.js
//
// A full PRC REE board, sat the way the board sits it: Mathematics, then ESAS,
// then EE, each a 100-item sitting on its own PRC clock (@ree/shared
// PRC_EXAM_FORMAT), with a break between sections and results withheld until
// all three are done. The simulator otherwise only offered single-subject
// sittings or one 100-item blend in 5 hours.
//
// The three sections share ONE server session id, so the server finalises the
// board from all 300 recorded attempts at once. Progress between sections
// lives here (localStorage); progress WITHIN a section uses the simulator's own
// crash-safe draft. A sitting left unfinished for a week expires.
import { gradeBoardExam, PRC_EXAM_FORMAT } from '@ree/shared';

export const FULL_BOARD_SECTIONS = ['Mathematics', 'ESAS', 'EE'];
export const FULL_BOARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const KEY = 'ree_full_board';

const save = (state) => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  return state;
};

export function loadFullBoard(now = Date.now()) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state?.sessionId || now - (state.startedAt || 0) > FULL_BOARD_TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function startFullBoard(sessionId, now = Date.now()) {
  return save({ sessionId, startedAt: now, sectionIndex: 0, sections: [] });
}

export function clearFullBoard() {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}

/** The simulator config for the board's current section. */
export function sectionConfig(state) {
  const subject = FULL_BOARD_SECTIONS[state.sectionIndex];
  return {
    mode: 'subject',
    subject,
    isPrcStandard: true,
    count: PRC_EXAM_FORMAT[subject].items,
    source: 'library',
    cognitiveFocus: 'mixed',
    timeLimitMins: PRC_EXAM_FORMAT[subject].minutes,
    fullBoard: { sessionId: state.sessionId, sectionIndex: state.sectionIndex },
  };
}

/**
 * Record a finished section. Keyed by section index, so a re-submit of the
 * same section (a retried submit, a double click) cannot skip a section.
 */
export function recordSection(state, sectionIndex, result) {
  if (!state) return state;
  const sections = [...(state.sections || [])];
  sections[sectionIndex] = { ...result, subject: FULL_BOARD_SECTIONS[sectionIndex] };
  return save({ ...state, sections, sectionIndex: Math.max(state.sectionIndex, sectionIndex + 1) });
}

/** Per-subject percentages, PRC weighted average and verdict across the done sections. */
export function fullBoardSummary(state) {
  const subjectScores = {};
  for (const s of state?.sections || []) {
    if (s?.total > 0) subjectScores[s.subject] = Math.round((s.correct / s.total) * 100);
  }
  const { generalAverage, verdict } = gradeBoardExam(subjectScores);
  return {
    subjectScores,
    generalAverage,
    verdict,
    done: FULL_BOARD_SECTIONS.every((s, i) => state?.sections?.[i]?.subject === s),
    timeTakenSecs: (state?.sections || []).reduce((acc, s) => acc + (s?.timeTakenSecs || 0), 0),
  };
}
