// src/features/notebook/targets.js
//
// What a note is on, as My notes lists it before the server has named it:
// { subject, topic, title } (+ the card's name, for opening it).
const SNIPPET_MAX = 160;

const snippet = (text) => {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > SNIPPET_MAX ? `${s.slice(0, SNIPPET_MAX - 1)}…` : s;
};

export const questionTarget = (q) => ({
  subject: q?.subject || null,
  topic: q?.subtopic || q?.topic || null,
  title: snippet(q?.text || q?.question),
});

export const cardTarget = (card) => ({
  subject: card?.subject || null,
  topic: card?.subtopicTag || null,
  title: card?.symbol ? `${card.name} (${card.symbol})` : card?.name || '',
  name: card?.name || '',
});
