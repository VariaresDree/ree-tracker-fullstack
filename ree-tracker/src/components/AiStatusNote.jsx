// src/components/AiStatusNote.jsx
//
// One line under an AI button when that feature isn't at full speed, so a
// slow or failed request isn't a surprise. Says nothing when all is well.
import { useAiStatus } from '../hooks/useAiStatus';
import { aiStatusMessage } from '../utils/aiStatusMessage';

const COLOR = { amber: 'var(--color-reeAmber-text)', danger: 'var(--accent-danger)' };

/** `task`: report | explain | practice | author | verify | vision. */
export default function AiStatusNote({ task, className = '' }) {
  const { status } = useAiStatus();
  const msg = aiStatusMessage(status?.tasks?.[task]);
  if (!msg) return null;
  const Icon = msg.icon;
  return (
    <p role="status" className={`text-xs flex items-start gap-1.5 ${className}`} style={{ color: COLOR[msg.tone] }}>
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-px" />
      <span>{msg.text}</span>
    </p>
  );
}
