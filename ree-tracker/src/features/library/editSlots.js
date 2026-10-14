// src/features/library/editSlots.js
//
// Editing a live question's choices in place (Library › Question bank). The
// editor has one "Correct answer" field and three "Wrong option" fields over
// four slots; each field writes back to its own slot. It used to rebuild the
// options as [answer, ...distractors] on every keystroke, so every question an
// admin touched was stored with its key at A.
import { seededRng } from '@ree/shared';

export const SLOTS = 4;

/**
 * The slot holding the key: where it is stored, or (a row whose key isn't
 * among its first four choices) a slot picked from the question's id, so it
 * lands anywhere, not always first or last.
 */
export function answerSlotOf(question) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const at = options.indexOf(question?.answer);
  if (at >= 0 && at < SLOTS) return at;
  return Math.floor(seededRng(`slot|${question?.id ?? question?.text ?? ''}`)() * SLOTS);
}

/** The four slots, with the key at `answerAt` and the other choices in their stored order. */
export function slotsOf(question, answerAt) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const answer = question?.answer ?? '';
  // Once edited, the key is in its slot: take the slots as they are (a wrong
  // option typed the same as the key mustn't move or merge with it).
  if (options[answerAt] === answer) {
    const slots = options.slice(0, SLOTS);
    while (slots.length < SLOTS) slots.push('');
    return slots;
  }
  const others = options.filter((o) => o !== answer).slice(0, SLOTS - 1);
  while (others.length < SLOTS - 1) others.push('');
  return [...others.slice(0, answerAt), answer, ...others.slice(answerAt)];
}

/** Slot indices of the three wrong-option fields, in order. */
export const distractorSlots = (answerAt) => Array.from({ length: SLOTS }, (_, i) => i).filter((i) => i !== answerAt);

/** The question with its key's text changed, in its own slot. */
export function withAnswer(question, answerAt, value) {
  const slots = slotsOf(question, answerAt);
  slots[answerAt] = value;
  return { ...question, answer: value, options: slots };
}

/** The question with wrong option `index` (0–2) changed, in its own slot. */
export function withDistractor(question, answerAt, index, value) {
  const slots = slotsOf(question, answerAt);
  slots[distractorSlots(answerAt)[index]] = value;
  return { ...question, options: slots };
}
