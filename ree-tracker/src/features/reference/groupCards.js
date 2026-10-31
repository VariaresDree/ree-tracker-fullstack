// src/features/reference/groupCards.js
//
// Formula cards → headed groups for the quick sheet (QuickSheet):
// a subject's cards by topic (in syllabus order) then subtopic, or a topic's
// cards by subtopic. Within a group: formulas, then constants, each A–Z.
const KIND_ORDER = { formula: 0, constant: 1 };
const NO_TOPIC = 'Other cards';
export const GENERAL = 'General';

const byKindThenName = (a, b) =>
  (KIND_ORDER[a.kind] ?? 9) - (KIND_ORDER[b.kind] ?? 9) || String(a.name || '').localeCompare(String(b.name || ''));

/** Cards → [{ label, cards, subgroups: [{ label, cards }] }], topics in syllabus order. */
export function groupCards(cards, { by = 'topic', topicOrder = [] } = {}) {
  const subgroupsOf = (list) => {
    const m = new Map();
    for (const c of list) {
      const k = c.subtopicTag || GENERAL;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(c);
    }
    // Named subtopics A–Z, the untagged "General" bucket last.
    return [...m.entries()]
      .sort(([a], [b]) => (a === GENERAL) - (b === GENERAL) || a.localeCompare(b))
      .map(([label, items]) => ({ label, cards: items.sort(byKindThenName) }));
  };

  if (by === 'subtopic') {
    return subgroupsOf(cards).map((g) => ({ label: g.label, cards: g.cards, subgroups: [] }));
  }

  const byTopic = new Map();
  for (const c of cards) {
    const t = c.topic?.name || NO_TOPIC;
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push(c);
  }
  const rank = new Map(topicOrder.map((t, i) => [t, i]));
  return [...byTopic.entries()]
    .sort(([a], [b]) =>
      (a === NO_TOPIC) - (b === NO_TOPIC)
      || (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity)
      || a.localeCompare(b))
    .map(([label, items]) => ({ label, cards: items, subgroups: subgroupsOf(items) }));
}
