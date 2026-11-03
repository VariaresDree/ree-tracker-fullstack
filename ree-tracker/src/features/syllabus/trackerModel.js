// src/features/syllabus/trackerModel.js
//
// The figures behind Progress › Syllabus's tracker, pure: mastery and accuracy
// per topic, what counts as weak, a subject's topics by mastery band, its board
// items covered, and the sort orders.
import { isTopicCovered, masteryBand } from '@ree/shared';
import { BOARD_GROUPS, boardItemsFor } from '@ree/shared/boardItems';

/** Accuracy waits for this many answers, so one lucky answer isn't "100%". */
export const ACCURACY_MIN_ANSWERS = 5;
/** A Novice topic is called weak only with this many answers behind it. */
export const WEAK_MIN_ANSWERS = 10;

/** The decayed mastery the row carries, as a band; null with no estimate yet. */
export const bandOf = (row) => masteryBand(row?.masteryEffective);

/** A whole percent, or null with too few answers (or a copy saved before `correct` existed). */
export function accuracyOf(row) {
  const attempts = Number(row?.attempts) || 0;
  if (attempts < ACCURACY_MIN_ANSWERS || row?.correct == null) return null;
  return Math.round((row.correct / attempts) * 100);
}

export const isWeak = (row) => bandOf(row)?.key === 'novice' && (Number(row?.attempts) || 0) >= WEAK_MIN_ANSWERS;

/** A subject's topics per band, `none` for no estimate yet. */
export function bandCounts(rows) {
  const counts = { mastered: 0, proficient: 0, developing: 0, novice: 0, none: 0 };
  for (const row of rows || []) counts[bandOf(row)?.key ?? 'none'] += 1;
  return counts;
}

/**
 * How much of PRC's paper the covered topics stand for. A count shared by
 * several topics splits evenly among those the app has; an unitemized topic adds
 * nothing. @returns {{ covered: number, total: number }} rounded items
 */
export function boardItemsCovered(subject, rows) {
  let covered = 0;
  let total = 0;
  for (const group of BOARD_GROUPS[subject] || []) {
    const members = (rows || []).filter((r) => group.topics.includes(r.name));
    if (members.length === 0) continue;
    total += group.items;
    covered += group.items * (members.filter(isTopicCovered).length / members.length);
  }
  return { covered: Math.round(covered), total };
}

const fraction = ({ done, total }) => (total > 0 ? done / total : Number.POSITIVE_INFINITY);
const missingLast = (n, fallback = Number.POSITIVE_INFINITY) => n ?? fallback;

/**
 * The topics in the chosen order. `progressOf(topicId)` is the subtopic count.
 * Every sort is stable, so ties stay in board order.
 */
export function sortTopics(rows, sortBy, progressOf) {
  const list = (rows || []).slice();
  if (sortBy === 'items') return list.sort((a, b) => (boardItemsFor(b.subject, b.name)?.items ?? -1) - (boardItemsFor(a.subject, a.name)?.items ?? -1));
  if (sortBy === 'least') return list.sort((a, b) => fraction(progressOf(a.topicId)) - fraction(progressOf(b.topicId)));
  if (sortBy === 'weakest') return list.sort((a, b) => missingLast(a.masteryEffective) - missingLast(b.masteryEffective));
  if (sortBy === 'dread') return list.sort((a, b) => (b.dread ?? -1) - (a.dread ?? -1));
  if (sortBy === 'unsure') return list.sort((a, b) => (a.confidence ?? 101) - (b.confidence ?? 101));
  return list;
}
