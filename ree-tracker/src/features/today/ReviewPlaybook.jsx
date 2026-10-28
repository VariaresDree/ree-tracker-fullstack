// src/features/today/ReviewPlaybook.jsx
//
// Today › the phase in the countdown pill › Review playbook: where you are on
// the road to the board, what this phase is for, a few tips for it (adapted
// from the CELE tracker's "Tips"), and what the study plan does now. The
// phases are a strip, so the next one is in sight.
import { REVIEW_PHASES } from '@ree/shared';
import { Modal, Button } from '../../components/ui';
import { Compass } from '../../components/ui/icons';
import { PLAYBOOK, planLine } from './playbookContent';

/**
 * @param {{ open: boolean, onClose: () => void, phase: { id: string, label: string },
 *   daysLeft: number, reviewMode?: string }} props
 */
export default function ReviewPlaybook({ open, onClose, phase, daysLeft, reviewMode = 'self' }) {
  const book = PLAYBOOK[phase.id];
  const tips = reviewMode === 'center' && book.center ? [...book.tips, book.center] : book.tips;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${phase.label} phase`}
      icon={Compass}
      size="md"
      footer={<Button type="button" variant="secondary" size="sm" onClick={onClose}>Done</Button>}
    >
      <div className="flex flex-col gap-4">
        <ol className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" aria-label="Review phases">
          {REVIEW_PHASES.map((p) => {
            const here = p.id === phase.id;
            return (
              <li
                key={p.id}
                aria-current={here ? 'step' : undefined}
                className={`rounded-[var(--radius-sm)] border px-2 py-1.5 text-center text-xs ${here ? 'border-[var(--accent)] text-textMain font-semibold' : 'border-border text-muted2'}`}
                style={here ? { background: 'color-mix(in srgb, var(--accent) 12%, transparent)' } : undefined}
              >
                {p.label}
              </li>
            );
          })}
        </ol>

        <p className="text-sm text-textMain">
          <span className="tabular-nums">{daysLeft === 0 ? 'Today is the exam.' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} to the exam.`}</span>{' '}
          {book.aim}
        </p>

        <section aria-labelledby="playbook-tips" className="flex flex-col gap-2">
          <h3 id="playbook-tips" className="text-eyebrow">For this phase</h3>
          <ul className="flex flex-col gap-2 list-disc pl-5 text-sm text-textMain marker:text-muted2">
            {tips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </section>

        <p className="text-sm text-muted2">{planLine(phase.id)}</p>
      </div>
    </Modal>
  );
}
