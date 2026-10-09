// src/features/active-recall/buildSessionSummary.js
//
// What a finished practice session says back to the learner. Until now a
// session simply ended: a toast, then the setup screen, with no score, no
// sense of which topic went wrong, and no way to see a missed answer again.
// Pure, so it is built from the attempts the session recorded (before they
// are cleared) and tested without rendering.
import { normalizeSubject } from '@ree/shared';

const MAX_MISSED = 10;

// Lengths of time print through utils/time (formatDuration).

/**
 * @param {Array<{questionId, subject, subtopic, isCorrect, confidenceLevel, timeSpentMs}>} attempts
 *   in answer order, as the session recorded them
 * @param {Array<object>} questions  the session's questions, for the missed list
 * @param {number} durationSecs  wall-clock length of the session
 * @returns {null | {
 *   total: number, correct: number, accuracy: number, durationSecs: number, avgSecs: number|null,
 *   byTopic: Array<{topic, subject, total, correct, missed, accuracy}>,
 *   weakest: object|null, confidentMisses: number, luckyGuesses: number,
 *   missed: Array<{id, text, answer, topic, subject, confident: boolean}>, missedCount: number,
 * }}  null when nothing was answered
 */
export function buildSessionSummary(attempts, questions, durationSecs) {
  if (!attempts?.length) return null;
  const byId = new Map((questions || []).map((q) => [q.id, q]));
  const topics = new Map();
  const missed = [];
  let correct = 0;
  let timed = 0;
  let timeMs = 0;
  let confidentMisses = 0;
  let luckyGuesses = 0;

  for (const a of attempts) {
    const confidence = String(a.confidenceLevel || '').toUpperCase();
    const subject = normalizeSubject(a.subject);
    const topic = a.subtopic || 'General';
    const key = `${subject}|${topic}`;
    const row = topics.get(key) || { topic, subject, total: 0, correct: 0 };
    row.total += 1;
    if (a.isCorrect) {
      correct += 1;
      row.correct += 1;
      if (confidence === 'LOW') luckyGuesses += 1;
    } else {
      if (confidence === 'HIGH') confidentMisses += 1;
      const q = byId.get(a.questionId);
      missed.push({
        id: a.questionId,
        text: q?.text || q?.question || '',
        answer: q?.answer || '',
        topic,
        subject,
        confident: confidence === 'HIGH',
      });
    }
    topics.set(key, row);
    if (a.timeSpentMs > 0) {
      timed += 1;
      timeMs += a.timeSpentMs;
    }
  }

  const byTopic = [...topics.values()]
    .map((t) => ({ ...t, missed: t.total - t.correct, accuracy: Math.round((t.correct / t.total) * 100) }))
    .sort((a, b) => b.missed - a.missed || a.accuracy - b.accuracy || b.total - a.total);

  return {
    total: attempts.length,
    correct,
    accuracy: Math.round((correct / attempts.length) * 100),
    durationSecs: Math.max(0, Math.round(durationSecs || 0)),
    avgSecs: timed > 0 ? Math.round(timeMs / timed / 1000) : null,
    byTopic,
    // The topic to drill next: the one with the most misses.
    weakest: byTopic.find((t) => t.missed > 0) || null,
    confidentMisses,
    luckyGuesses,
    // Confident misses first: they cost the most on the board.
    missed: [...missed].sort((a, b) => Number(b.confident) - Number(a.confident)).slice(0, MAX_MISSED),
    missedCount: missed.length,
  };
}
