// src/features/board-simulator/poolFilters.js
//
// How a mock's question pool is narrowed, shared by the sitting
// (useSimulatorEngine.buildExamPool) and the printed paper
// (features/exam-export/drawExamPaper), so a printed set honours the same
// cognitive-focus choice the on-screen exam does.
import { stratifiedSample } from '../../utils/shuffle';

export { stratifiedSample };

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
