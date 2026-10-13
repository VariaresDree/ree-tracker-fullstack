// src/features/notebook/CauseChips.jsx
//
// Why you missed a question: Concept / Computation / Misread / Ran out of
// time. Tap one to tag it, tap it again to clear. When nothing is tagged, the
// cause the data suggests (slow against the board's pace, or sure but wrong)
// is marked "suggested".
import { MISTAKE_CAUSES, MISTAKE_CAUSE_LABELS } from '@ree/shared';
import { Button } from '../../components/ui';
import { Check } from '../../components/ui/icons';

export default function CauseChips({ value = null, suggested = null, onChange, disabled = false, label = 'Why did you miss it?' }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-eyebrow">{label}</span>
      <div className="flex flex-wrap gap-2">
        {MISTAKE_CAUSES.map((cause) => {
          const on = value === cause;
          const hinted = !value && suggested === cause;
          return (
            <Button
              key={cause}
              size="sm"
              variant={on ? 'outline' : 'secondary'}
              aria-pressed={on}
              disabled={disabled}
              onClick={() => onChange(on ? null : cause)}
            >
              {on && <Check size={14} strokeWidth={2} aria-hidden="true" />}
              {MISTAKE_CAUSE_LABELS[cause]}
              {hinted && <span className="text-muted2 font-normal">· suggested</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
