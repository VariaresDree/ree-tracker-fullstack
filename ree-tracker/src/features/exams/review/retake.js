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

/** A review item in the shape the simulator and Practice run. */
export function reviewItemToQuestion(item) {
  return {
    id: item.questionId,
    subject: item.subject,
    subtopic: item.topic || 'General',
    text: item.text,
    question: item.text,
    options: Array.isArray(item.options) ? item.options : [],
    answer: item.correctAnswer,
    fixedExplanation: item.explanation || null,
    explanation: item.explanation || null,
    type: item.type || null,
  };
}

/** Router state that starts a timed retake in the simulator. */
export function retakeState({ ownerUid, sourceSessionId, items }) {
  return { retake: { ownerUid, sourceSessionId, questions: items.map(reviewItemToQuestion) } };
}
