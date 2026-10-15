// src/features/exams/review/retake.js
//
// Turning a past sitting's misses into another go: a timed mock of exactly
// those items (at the board's pace for each), or an untimed Practice session.
// The review already carries each item's question and key, so neither needs a
// new request — and both work offline once the review has loaded.

/** Wrong or left blank. A row whose answer wasn't recorded still counts if wrong. */
export function missedItems(items = []) {
  return items.filter((i) => !i.isCorrect);
}

/**
 * A review item in the shape the simulator and Practice run. Its choices come
 * in their stored order (`storedOptions`, sent when the review lists them in
 * the order the sitting showed), since whatever runs it draws its own order;
 * handing on the shown order would shuffle a shuffle, and that sitting's review
 * couldn't rebuild what was seen. `{ asShown: true }` keeps the review's order,
 * for the review's own question card, letters and Explain with AI.
 */
export function reviewItemToQuestion(item, opts) {
  const shown = Array.isArray(item.options) ? item.options : [];
  const options = opts?.asShown === true || !Array.isArray(item.storedOptions) ? shown : item.storedOptions;
  return {
    id: item.questionId,
    subject: item.subject,
    subtopic: item.topic || 'General',
    text: item.text,
    question: item.text,
    options,
    answer: item.correctAnswer,
    fixedExplanation: item.explanation || null,
    explanation: item.explanation || null,
    type: item.type || null,
  };
}

/**
 * Router state that starts a timed retake in the simulator. `kind` names what
 * it is in the history: 'retake' (a sitting's misses) or 'mistakes' (the
 * Notebook's Mistakes mock).
 */
export function retakeState({ ownerUid, sourceSessionId, items, kind = 'retake' }) {
  return { retake: { ownerUid, sourceSessionId, kind, questions: items.map(reviewItemToQuestion) } };
}
