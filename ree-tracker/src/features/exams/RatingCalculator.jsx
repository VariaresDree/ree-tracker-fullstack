// src/features/exams/RatingCalculator.jsx
//
// The CELE tracker's "Computing Rating" sheet for the REE board: three raw
// scores in, the PRC rating out (Mathematics 25 / ESAS 30 / EE 45, a 70
// average and no subject under 50). Leave one subject empty to see the score
// it needs. Worked out on the device by @ree/shared (rateBoard, scoreNeeded),
// the rule every graded mock uses, so it agrees with them and works offline.
import { useState } from 'react';
import {
  CANONICAL_SUBJECTS,
  DEFAULT_SYLLABUS_WEIGHTS,
  GENERAL_AVERAGE,
  OUTSIDE_SCORE_LIMITS,
  PRC_EXAM_FORMAT,
  SUBJECT_FLOOR,
  VERDICT,
  rateBoard,
  scoreNeeded,
} from '@ree/shared';
import { Modal, Button, Card, FormField, Input, StatusPill } from '../../components/ui';
import { Calculator } from '../../components/ui/icons';

const VERDICT_LABEL = { [VERDICT.PASSED]: 'Passed', [VERDICT.CONDITIONAL]: 'Conditional pass', [VERDICT.FAILED]: 'Not passed' };
const VERDICT_TONE = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };

const blankRows = () => Object.fromEntries(
  CANONICAL_SUBJECTS.map((s) => [s, { score: '', total: String(PRC_EXAM_FORMAT[s].items) }]),
);

// Ratings keep the two decimals gradeBoardExam keeps: rounding 69.96 to one
// decimal would print "70.0" beside "Not passed".
const fmtRating = (n) => String(Math.round(n * 100) / 100);
const fmtPct = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
const weightOf = (s) => `${Math.round(DEFAULT_SYLLABUS_WEIGHTS[s] * 100)}%`;
const list = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);

/** One subject's row: its item count, its part when complete, and any field errors. */
function checkRow(subject, row) {
  const total = Number(row.total);
  const totalOk = row.total.trim() !== '' && Number.isInteger(total) && total >= 1 && total <= OUTSIDE_SCORE_LIMITS.maxTotal;
  const errors = {};
  if (!totalOk) errors.total = `A whole number, 1 to ${OUTSIDE_SCORE_LIMITS.maxTotal}.`;
  const items = totalOk ? total : null;
  if (row.score.trim() === '') return { empty: true, items, errors };
  const score = Number(row.score);
  if (!Number.isFinite(score) || score < 0) errors.score = 'Enter 0 or more.';
  else if (totalOk && score > total) errors.score = 'More than the number of items.';
  const part = Object.keys(errors).length === 0 ? { subject, score, total } : null;
  return { empty: false, items, errors, part };
}

/** "73 of 100 (73%)", or that no score in that subject reaches it. */
function neededText(subject, needed) {
  if (needed.unreachable) return `${subject}: out of reach, even ${needed.of} of ${needed.of}`;
  return `${subject}: ${needed.items} of ${needed.of} (${fmtPct(needed.percent)})`;
}

function Result({ checks }) {
  const parts = CANONICAL_SUBJECTS.map((s) => checks[s].part).filter(Boolean);
  const empties = CANONICAL_SUBJECTS.filter((s) => checks[s].empty);

  if (parts.length === 3) {
    const rating = rateBoard(parts);
    const below = rating.subjects.filter((s) => s.belowFloor).map((s) => s.subject);
    // How to pass from here: each subject's score, the other two as they are.
    const ways = rating.verdict === VERDICT.PASSED ? [] : CANONICAL_SUBJECTS.map((s) => ({
      subject: s,
      needed: scoreNeeded({ known: parts.filter((p) => p.subject !== s), subject: s, items: checks[s].items }),
    })).filter((w) => w.needed && !w.needed.blockedBy);
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div className="flex flex-col">
            <span className="text-eyebrow">Weighted rating</span>
            <span className="text-4xl text-display tabular-nums">{fmtRating(rating.generalAverage)}</span>
          </div>
          <StatusPill tone={VERDICT_TONE[rating.verdict]} dot={false}>{VERDICT_LABEL[rating.verdict]}</StatusPill>
        </div>
        <p className="text-sm text-muted2">
          {rating.subjects.map((s) => `${s.subject} ${fmtPct(s.percent)}`).join(' · ')}
        </p>
        {below.length > 0 && (
          <p className="text-sm text-[var(--color-reeAmber-text)]">
            {list(below)} {below.length === 1 ? 'is' : 'are'} under the {SUBJECT_FLOOR}% subject floor, so the board isn’t passed outright{rating.generalAverage >= GENERAL_AVERAGE ? ' even with the average met' : ''}.
          </p>
        )}
        {ways.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow">To pass, raise one subject to</span>
            <ul className="text-sm text-textMain flex flex-col gap-0.5">
              {ways.map((w) => <li key={w.subject}>{neededText(w.subject, w.needed)}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (parts.length === 2 && empties.length === 1 && checks[empties[0]].items) {
    const subject = empties[0];
    const needed = scoreNeeded({ known: parts, subject, items: checks[subject].items });
    return (
      <div className="flex flex-col gap-1">
        <span className="text-eyebrow">What {subject} needs</span>
        {needed.blockedBy ? (
          <p className="text-sm text-textMain">
            {list(needed.blockedBy)} {needed.blockedBy.length === 1 ? 'is' : 'are'} under the {SUBJECT_FLOOR}% subject floor, so no {subject} score passes the board.
          </p>
        ) : needed.unreachable ? (
          <p className="text-sm text-textMain">
            Even {needed.of} of {needed.of} in {subject} falls short of the {GENERAL_AVERAGE} average.
          </p>
        ) : (
          <p className="text-sm text-textMain">
            You need <strong className="tabular-nums">{needed.items} of {needed.of}</strong> in {subject} ({fmtPct(needed.percent)}) to pass.
          </p>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm text-muted2">
      Enter all three scores for the rating, or two of them to see what the third needs.
    </p>
  );
}

/**
 * @param {{ open: boolean, onClose: () => void, onSaveAsScore?: (parts: object[]) => void }} props
 *   The caller mounts it per opening, so the rows start empty each time.
 *   `onSaveAsScore` gets the subjects entered, for an outside score.
 */
export default function RatingCalculator({ open, onClose, onSaveAsScore }) {
  const [rows, setRows] = useState(blankRows);
  const set = (subject, field) => (e) => setRows((r) => ({ ...r, [subject]: { ...r[subject], [field]: e.target.value } }));
  const checks = Object.fromEntries(CANONICAL_SUBJECTS.map((s) => [s, checkRow(s, rows[s])]));
  const parts = CANONICAL_SUBJECTS.map((s) => checks[s].part).filter(Boolean);
  const hasErrors = CANONICAL_SUBJECTS.some((s) => Object.keys(checks[s].errors).length > 0 && !checks[s].empty);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rating calculator"
      icon={Calculator}
      size="md"
      footer={(
        <>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows(blankRows())}>Clear</Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Done</Button>
          {onSaveAsScore && (
            <Button type="button" size="sm" disabled={parts.length === 0 || hasErrors} onClick={() => onSaveAsScore(parts)}>
              Save as outside score
            </Button>
          )}
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted2 leading-relaxed">
          Your raw scores, rated the PRC way: Mathematics {weightOf('Mathematics')}, ESAS {weightOf('ESAS')} and EE {weightOf('EE')} of the rating. Passing takes a {GENERAL_AVERAGE} average with no subject under {SUBJECT_FLOOR}%.
        </p>

        {CANONICAL_SUBJECTS.map((s) => (
          <Card key={s} variant="inset" padding="sm" as="fieldset" className="flex flex-col gap-3 min-w-0">
            <legend className="sr-only">{s}</legend>
            <div className="flex items-baseline justify-between gap-2" aria-hidden="true">
              <span className="text-h3 text-textMain">{s}</span>
              <span className="text-xs text-muted2">{weightOf(s)} of the rating</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Score" error={checks[s].errors.score}>
                <Input type="number" inputMode="decimal" min="0" step="0.5" value={rows[s].score} onChange={set(s, 'score')} />
              </FormField>
              <FormField label="Items" error={checks[s].errors.total}>
                <Input type="number" inputMode="numeric" min="1" max={OUTSIDE_SCORE_LIMITS.maxTotal} step="1" value={rows[s].total} onChange={set(s, 'total')} />
              </FormField>
            </div>
          </Card>
        ))}

        <Card variant="inset" padding="md" aria-live="polite">
          <Result checks={checks} />
        </Card>
      </div>
    </Modal>
  );
}
