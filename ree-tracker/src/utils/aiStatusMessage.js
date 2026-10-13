// src/utils/aiStatusMessage.js
// The line shown under an AI feature that isn't at full speed (see
// components/AiStatusNote), from one task of GET /api/ai/status.
import { TriangleAlert, Clock, CircleAlert } from '../components/ui/icons';

const seconds = (ms) => Math.max(1, Math.round(ms / 1000));

export function aiStatusMessage(task) {
  if (!task) return null;
  switch (task.state) {
    case 'slow':
      return { tone: 'amber', icon: Clock, text: `AI is slower than usual right now${task.primary?.medianMs ? ` (about ${seconds(task.primary.medianMs)} s)` : ''}.` };
    case 'backup':
    case 'degraded':
      return { tone: 'amber', icon: Clock, text: 'The main AI model is having trouble, so a backup is answering. It may take a little longer.' };
    case 'down':
      return { tone: 'danger', icon: CircleAlert, text: 'AI is down right now. Try again in a few minutes.' };
    case 'unconfigured':
      return { tone: 'danger', icon: TriangleAlert, text: "AI isn't set up on the server yet." };
    default:
      return null;
  }
}

