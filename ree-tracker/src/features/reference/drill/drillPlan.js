// src/features/reference/drill/drillPlan.js
//
// What a formula drill asks, and what it may change. Pure, and `random` is passed
// in, so a test can pin a draw and a click handler does the drawing, never a render.
//
// What a drill may save: a rating isn't harmless. It creates a row that enters
// Today, credits a planner task, and repeated ones stretch the card's interval. So
// a recall saves only for a card that's new or due, or when it's rated Again, and
// choosing or matching saves Again on a miss and nothing on a right answer, since
// recognizing isn't recalling.
import { withMathDelimiters } from '../../../utils/mathDelimiters';
import { cardAnswer } from '../cardAnswer';
import { topicName } from '../weakCards';

const CHOICES = 4;
const MATCH_ROUND = 5;

/** A card's formula or value, as an option or a prompt renders it. */
export const answerOf = (card) => withMathDelimiters(cardAnswer(card));

export function shuffled(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Cards to drill: a fresh order each time, `count` of them, or all for 'all'. */
export const pickDrillCards = (cards, count, random = Math.random) => {
  const drawn = shuffled(cards.filter((c) => cardAnswer(c)), random);
  return count === 'all' ? drawn : drawn.slice(0, count);
};

/**
 * Wrong answers for a card, nearest first: its topic, then its subject, then any
 * card of its kind, and never one that reads the same as the answer. A formula
 * beside a constant's value would give itself away, so kinds only mix as a last resort.
 */
export function distractorsFor(card, pool, valueOf, count = CHOICES - 1, random = Math.random) {
  const right = valueOf(card);
  const others = pool.filter((c) => c.id !== card.id && valueOf(c));
  const levels = [
    (c) => c.kind === card.kind && c.subject === card.subject && topicName(c) === topicName(card),
    (c) => c.kind === card.kind && c.subject === card.subject,
    (c) => c.kind === card.kind,
    () => true,
  ];
  const seen = new Set([right]);
  const out = [];
  for (const level of levels) {
    for (const c of shuffled(others.filter(level), random)) {
      if (out.length === count) return out;
      const value = valueOf(c);
      if (!seen.has(value)) {
        seen.add(value);
        out.push(value);
      }
    }
  }
  return out;
}

/**
 * One multiple-choice question per card, asking for the formula ('formula') or the
 * name ('name'). A card without enough wrong answers to offer is left out.
 */
export function chooseQuestions(cards, pool, ask, random = Math.random) {
  const promptOf = ask === 'name' ? answerOf : (c) => c.name;
  const valueOf = ask === 'name' ? (c) => c.name : answerOf;
  return cards.flatMap((card) => {
    const wrong = distractorsFor(card, pool, valueOf, CHOICES - 1, random);
    if (wrong.length < CHOICES - 1) return [];
    return [{ card, text: promptOf(card), answer: valueOf(card), options: shuffled([valueOf(card), ...wrong], random) }];
  });
}

/**
 * Rounds of tap-the-pairs. Two cards with the same formula couldn't both be right,
 * so only one of them plays. A lone card left over joins the round before it.
 */
export function matchRounds(cards, random = Math.random) {
  const seen = new Set();
  const playable = cards.filter((c) => {
    const answer = answerOf(c);
    if (!answer || seen.has(answer) || seen.has(c.name)) return false;
    seen.add(answer);
    seen.add(c.name);
    return true;
  });
  const rounds = [];
  for (let i = 0; i < playable.length; i += MATCH_ROUND) rounds.push(playable.slice(i, i + MATCH_ROUND));
  if (rounds.length > 1 && rounds.at(-1).length === 1) rounds.at(-2).push(rounds.pop()[0]);
  return rounds
    .filter((round) => round.length >= 2)
    .map((round) => ({
      cards: round,
      names: shuffled(round, random),
      answers: shuffled(round, random),
    }));
}

/** May a recall's rating move this card's schedule? See the note at the top. */
export function savesRating(row, rating, now = Date.now()) {
  if (rating === 'again' || !row) return true;
  return new Date(row.nextReviewDate).getTime() <= now;
}
