// The prompt and the reply for Tag subtopics: an AI sorts one topic's
// questions into that topic's subtopics. The in-app AI and a pasted reply from
// another AI use the same JSON, so one parser reads both.
import { normSubtopicKey } from '@ree/shared/subtopics';

export const TAG_BATCH = 50;
const STEM_MAX = 500;
const OPTION_MAX = 80;

const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

export const TAG_SYSTEM = 'You sort engineering board-exam questions into subtopics. Reply with JSON only.';

/**
 * Questions are numbered 1..n rather than sent by id: a model copies a short
 * number back more reliably than a 36-character id.
 */
export function buildTagPrompt({ subject, topic, subtopics, items }) {
  const names = subtopics.map((s) => `- ${s.name}`).join('\n');
  const questions = items.map((q, i) => {
    const options = (q.options || []).map((o) => clip(o, OPTION_MAX)).join(' | ');
    return `${i + 1}. ${clip(q.text, STEM_MAX)}${options ? `\n   Options: ${options}` : ''}`;
  }).join('\n');
  return `Topic: ${subject} › ${topic}

Subtopics of this topic:
${names}

For each question below, pick the one subtopic it mainly tests, copying the name exactly as written above. If none of them fits, write "none".
Set "sure" to true only when the question clearly belongs to that subtopic and to no other on the list; otherwise false.

Reply with JSON only, one entry per question, in this shape:
{"tags": [{"n": 1, "subtopic": "<name from the list, or none>", "sure": true}]}

Questions:
${questions}`;
}

/**
 * Matches a reply back to the batch. Each item comes back as
 * { id, guess, subtopicId, sure }: subtopicId is set only when the guess is
 * one of the topic's subtopics by name; sure only when it is set and the AI
 * said so. Questions the reply skipped come back with no guess.
 */
export function readTagReply(parsed, items, subtopics) {
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tags) ? parsed.tags : [];
  const byKey = new Map(subtopics.map((s) => [normSubtopicKey(s.name), s.id]));
  const byN = new Map();
  for (const row of list) {
    const n = Number(row?.n);
    if (Number.isInteger(n) && n >= 1 && n <= items.length && !byN.has(n)) byN.set(n, row);
  }
  return items.map((q, i) => {
    const row = byN.get(i + 1);
    const guess = typeof row?.subtopic === 'string' ? row.subtopic.trim() : '';
    const none = !guess || normSubtopicKey(guess) === 'none';
    const subtopicId = none ? null : byKey.get(normSubtopicKey(guess)) || null;
    return { id: q.id, guess: none ? null : guess, subtopicId, sure: !!subtopicId && row?.sure === true };
  });
}

/** Sure picks save as they come; everything else waits for the admin. */
export function splitTags(read) {
  return {
    apply: read.filter((r) => r.sure).map((r) => ({ id: r.id, subtopicId: r.subtopicId })),
    review: read.filter((r) => !r.sure),
  };
}
