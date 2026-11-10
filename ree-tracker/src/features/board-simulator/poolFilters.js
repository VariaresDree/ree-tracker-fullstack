// src/features/board-simulator/poolFilters.js
//
// How a mock's question pool is narrowed, shared by the sitting
// (useSimulatorEngine.buildExamPool) and the printed paper
// (features/exam-export/drawExamPaper), so a printed set honours the same
// cognitive-focus choice the on-screen exam does.
import { boardItemSplit, boardWeightedPick } from '@ree/shared/boardItems';
import { shuffleArray, stratifiedSample } from '../../utils/shuffle';

export { stratifiedSample };

/**
 * How many questions to ask the server for, to end with `count`. Every pool
 * was a flat 1,000 or 2,000, whatever the session's length: 1.2 MB out of the
 * database to pick 20. The server's sample takes one question from every topic
 * before a second from any (services/questionPool), so three times the session
 * is the same spread to pick from.
 *
 * A draw by topic counts needs every topic deep enough for the largest count
 * (`perTopic`, across the subject's `topics`): boardWeightedPick fills a thin
 * group from other topics without saying so, so a shallow pool would bend the
 * paper silently. A focus filter throws part of any pool away.
 * @param {number} count
 * @param {{ filtered?: boolean, perTopic?: number, topics?: number, max?: number }} [opts]
 */
export function poolLimit(count, { filtered = false, perTopic = 0, topics = 0, max = 2000 } = {}) {
  const n = Math.max(1, Number(count) || 0);
  if (perTopic > 0 && !(topics > 0)) return max; // by topic counts, with no topic list to size from
  const room = Math.max(n * 3, perTopic * topics * 1.5) * (filtered ? 2.5 : 1);
  return Math.min(max, Math.max(60, Math.ceil(room)));
}

/** The largest share any one group takes of a `count`-item paper; 0 for an even draw. */
export const deepestGroup = (subject, count, groups) => (groups?.[subject] ? Math.max(0, ...boardItemSplit(subject, count, groups)) : 0);

/** A PRC paper's questions by the board's topic counts, mixed, not grouped by topic. */
export const boardWeightedSample = (pool, subject, count, groups) => shuffleArray(boardWeightedPick(pool, subject, count, stratifiedSample, groups));

/** True for a calculation item: its type reads "calc", "math" or "problem". */
export function isCalculationItem(q) {
  const typeStr = String(q?.type || q?.questionType || q?.category || q?.cognitiveFocus || '').toLowerCase();
  return typeStr.includes('calc') || typeStr.includes('math') || typeStr.includes('problem');
}

/**
 * The cognitive-focus filter, forgiving so a strict focus never leaves an
 * empty paper: when nothing matches, the mixed set is used and `fallback`
 * says so (the caller tells the learner).
 * @param {object[]} rawPool
 * @param {'mixed'|'calculation'|'theory'|string} focus
 * @returns {{ pool: object[], fallback: boolean }}
 */
export function applyFocusFilter(rawPool, focus) {
  const pool = Array.isArray(rawPool) ? rawPool : [];
  if (!focus || focus === 'mixed') return { pool, fallback: false };
  const filtered = pool.filter((q) => (focus === 'calculation' ? isCalculationItem(q) : !isCalculationItem(q)));
  if (filtered.length === 0 && pool.length > 0) return { pool, fallback: true };
  return { pool: filtered, fallback: false };
}
