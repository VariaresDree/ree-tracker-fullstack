// src/features/active-recall/offlineSets.js
//
// Sets the server normally chooses (Today's loop, the review queue, the drill),
// drawn from the questions saved on this device when it can't be reached. The note
// goes on the session, because these aren't the same questions the server would pick.
import { getOfflineQuestions } from '../../services/offlinePack';
import { classifySyncError, SYNC_OUTCOME } from '../../services/syncPolicy';

const MIN_ANSWERS = 3;
const WEAK_TOPICS = 3;
// More than any pack holds, so nothing is cut off before sampling.
const WHOLE_PACK = 100_000;

const NO_PACK = 'There are no questions saved on this device yet. Connect once to download them.';

/**
 * The server's answer, or null if it can't be reached. The app can believe it's
 * online for a moment after the connection has gone. A refusal still throws.
 */
export const unlessOffline = (request) => request.catch((err) => {
  if (classifySyncError(err) === SYNC_OUTCOME.OFFLINE) return null;
  throw err;
});

/** The lowest-scoring topics with enough answers to mean anything. Pure. */
export function weakestTopics(microTopics = {}, n = WEAK_TOPICS) {
  return Object.values(microTopics || {})
    .filter((t) => t?.subtopic && t.attempts >= MIN_ANSWERS)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
    .slice(0, n)
    .map((t) => t.subtopic);
}

/** The whole pack, for a set that stands in for today's loop or the review queue. */
export async function offlineMix(stoodInFor) {
  const items = await getOfflineQuestions('All', 'All', WHOLE_PACK);
  if (items.length === 0) throw new Error(NO_PACK);
  return { items, note: `You’re offline, so this is a mix from the questions saved on this device, not ${stoodInFor}.` };
}

/** A drill on one topic, or on the weakest topics this device knows of. */
export async function offlineDrill({ topic = null, subject = 'All', microTopics = null } = {}) {
  const pool = await getOfflineQuestions(subject || 'All', 'All', WHOLE_PACK);
  if (pool.length === 0) throw new Error(NO_PACK);
  const topics = new Set((topic ? [topic] : weakestTopics(microTopics)).map((t) => t.trim().toLowerCase()));
  const items = pool.filter((q) => topics.has(String(q.subtopic || '').trim().toLowerCase()));
  if (items.length > 0) {
    return { items, note: `You’re offline, so this drill uses the questions saved on this device, ${topic ? `on ${topic}` : 'from your weakest topics'}.` };
  }
  return {
    items: pool,
    note: topic
      ? `You’re offline and no questions on ${topic} are saved on this device, so this is a mix.`
      : 'You’re offline, and this device doesn’t know your weakest topics yet, so this is a mix.',
  };
}
