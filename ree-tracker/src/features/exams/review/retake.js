// src/features/exams/review/retake.js
//
// Turning a past sitting's misses into another go: a timed mock of exactly
// those items (at the board's pace for each), or an untimed Practice session.
// The review already carries each item's question and key, so neither needs a
// new request — and both work offline once the review has loaded.
import { setupConfig } from '../../board-simulator/profiles';

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

const RETAKE_KINDS = ['retake', 'mistakes', 'assigned'];

/**
 * The simulator config for running `questions` as a timed sitting, from the
 * setup `base`. Their answers from the last sitting don't come along. `kind`
 * names it in the history: 'retake' (a sitting's misses), 'mistakes' (the
 * Notebook's Mistakes mock) or 'assigned' (an exam the reviewer posted, with
 * `assigned`: its id, title and time, which replaces the board's pace).
 */
export function retakeConfig(base, { questions, sourceSessionId = null, kind = 'retake', assigned = null }) {
  const subjects = new Set(questions.map((q) => q.subject));
  return {
    ...setupConfig(base),
    mode: 'subject',
    subject: subjects.size === 1 ? [...subjects][0] : 'Mixed',
    isPrcStandard: false,
    count: questions.length,
    source: 'retake',
    cognitiveFocus: 'mixed',
    retake: {
      sourceSessionId,
      kind: RETAKE_KINDS.includes(kind) ? kind : 'retake',
      ...(kind === 'assigned' && assigned?.id ? { assignedExamId: assigned.id, title: assigned.title, timeLimitSecs: assigned.timeLimitSecs } : {}),
    },
    // eslint-disable-next-line no-unused-vars
    retakeQuestions: questions.map(({ userAnswer, userConf, ...q }) => q),
  };
}

export function retakeState({ ownerUid, sourceSessionId, items, kind = 'retake' }) {
  return { retake: { ownerUid, sourceSessionId, kind, questions: items.map(reviewItemToQuestion) } };
}
