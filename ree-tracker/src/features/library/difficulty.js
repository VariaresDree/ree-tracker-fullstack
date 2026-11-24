// A question's difficulty as the bank shows it: 'EASY' | 'MEDIUM' | 'HARD'.
// A word stored as the difficulty wins; a number is banded; with neither, a
// calculation reads as medium and anything else as easy.
export function difficultyOf(q) {
  if (typeof q?.difficulty === 'string' && q.difficulty.trim() !== '') return q.difficulty.toUpperCase();
  if (typeof q?.difficulty === 'number') return q.difficulty > 2 ? 'HARD' : (q.difficulty > 1 ? 'MEDIUM' : 'EASY');
  return q?.type === 'calculation' ? 'MEDIUM' : 'EASY';
}

export const difficultyTone = (diff) => (diff === 'HARD' ? 'danger' : diff === 'MEDIUM' ? 'amber' : 'success');
