// src/services/reportQuestion.js
//
// Report a problem with a question, with why. It sends now or joins the queue for
// the next reconnect: a report made offline used to fail with "Flag failed."
// The route upserts one flag per learner per question, so a replay is harmless.
import { writeOrQueue } from './writeOrQueue';

export function reportQuestion(id, reason) {
  const endpoint = `/api/questions/${id}/flag`;
  return writeOrQueue(endpoint, 'PATCH', { reason: reason || null }, { queueKey: endpoint });
}
