// src/features/admin/syllabus/blueprintDraft.js
//
// Admin › Syllabus: the changes to the board's counts, pure. A draft is what the
// server stores, { subject: [{ items, topicIds }] }. Joining two counts keeps the
// items of the one that empties, so the total never moves without saying so.
import { SYLLABUS_SUBJECTS } from '@ree/shared';

// PRC itemizes in fives, so a topic given a count starts at the smallest it uses.
export const NEW_COUNT = 5;

const without = (list, topicId) => list
  .map((g) => ({ ...g, topicIds: g.topicIds.filter((id) => id !== topicId) }))
  .filter((g) => g.topicIds.length > 0);

export const draftFrom = (groups) => Object.fromEntries(SYLLABUS_SUBJECTS.map((s) => [
  s,
  (groups?.[s] || []).map((g) => ({ items: g.items, topicIds: [...g.topicIds] })),
]));

export const totalItems = (list) => (list || []).reduce((sum, g) => sum + g.items, 0);

export const sameDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export const setItems = (draft, subject, index, items) => ({
  ...draft,
  [subject]: draft[subject].map((g, i) => (i === index ? { ...g, items } : g)),
});

/** Out of a shared count, into one of its own, at 0 until Admin gives it some. */
export function splitOff(draft, subject, topicId) {
  const at = draft[subject].findIndex((g) => g.topicIds.includes(topicId));
  if (at < 0 || draft[subject][at].topicIds.length < 2) return draft;
  const list = draft[subject].map((g, i) => (i === at ? { ...g, topicIds: g.topicIds.filter((id) => id !== topicId) } : g));
  list.splice(at + 1, 0, { items: 0, topicIds: [topicId] });
  return { ...draft, [subject]: list };
}

export const giveItems = (draft, subject, topicId) => ({
  ...draft,
  [subject]: [...without(draft[subject], topicId), { items: NEW_COUNT, topicIds: [topicId] }],
});

export const noCount = (draft, subject, topicId) => ({ ...draft, [subject]: without(draft[subject], topicId) });

/** Into the count at `index`, bringing the items of a count this empties. */
export function shareWith(draft, subject, topicId, index) {
  const from = draft[subject].findIndex((g) => g.topicIds.includes(topicId));
  if (from === index || !draft[subject][index]) return draft;
  const carried = from >= 0 && draft[subject][from].topicIds.length === 1 ? draft[subject][from].items : 0;
  const list = draft[subject].map((g, i) => {
    if (i === index) return { items: g.items + carried, topicIds: [...g.topicIds, topicId] };
    return i === from ? { ...g, topicIds: g.topicIds.filter((id) => id !== topicId) } : g;
  });
  return { ...draft, [subject]: list.filter((g) => g.topicIds.length > 0) };
}

/** A retired topic leaves every count it was in. */
export const dropTopic = (draft, topicId) => Object.fromEntries(Object.entries(draft).map(([s, list]) => [s, without(list, topicId)]));
