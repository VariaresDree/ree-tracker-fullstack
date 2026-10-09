// src/features/board-simulator/FullBoardScreens.jsx
//
// The two screens of a full PRC board that the single-sitting simulator does
// not have: the break between sections, and the board result.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge, IconChip, Modal, ProgressIndicator } from '../../components/ui';
import { Landmark, TriangleAlert, ClipboardList, ChevronLeft } from '../../components/ui/icons';
import { GENERAL_AVERAGE, SUBJECT_FLOOR, PRC_EXAM_FORMAT, toDisplaySubject, VERDICT } from '@ree/shared';
import { FULL_BOARD_SECTIONS, FULL_BOARD_TTL_MS, fullBoardSummary } from './fullBoard';
import { formatDuration as fmtDuration } from '../../utils/time';

const hours = (subject) => `${PRC_EXAM_FORMAT[subject].minutes / 60}h`;
const VERDICT_TONE = { [VERDICT.PASSED]: 'success', [VERDICT.CONDITIONAL]: 'amber', [VERDICT.FAILED]: 'danger' };

/** Between sections (or returning to an unfinished board). */
export function FullBoardBreak({ board, hasDraft, loading, onContinue, onResumeDraft, onAbandon, onBack }) {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const next = FULL_BOARD_SECTIONS[board.sectionIndex];
  const done = board.sectionIndex;
  const expires = new Date((board.startedAt || Date.now()) + FULL_BOARD_TTL_MS);

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 page-fade-in">
      {onBack && (
        <Button variant="ghost" size="sm" className="self-start -mb-2 text-muted hover:text-textMain" onClick={onBack}>
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" /> Other mock formats
        </Button>
      )}
      <Card elevated grain className="p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex items-start gap-3">
          <IconChip icon={Landmark} size="lg" />
          <div>
            <span className="text-eyebrow">Full PRC board</span>
            <h1 className="text-display text-2xl text-textMain mt-1">
              {done === 0 ? 'Ready when you are' : `Section ${done} of ${FULL_BOARD_SECTIONS.length} complete`}
            </h1>
          </div>
        </div>

        <ProgressIndicator value={done} max={FULL_BOARD_SECTIONS.length} ariaLabel="Board progress" size="sm" />

        <ol className="flex flex-col gap-2">
          {FULL_BOARD_SECTIONS.map((s, i) => {
            const result = board.sections?.[i];
            const isNext = i === board.sectionIndex;
            return (
              <li key={s} className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-default)] bg-surface2 border border-border">
                <span className="text-sm text-textMain font-medium">{i + 1}. {toDisplaySubject(s)}</span>
                <span className="text-xs text-muted2 tabular-nums">
                  {result
                    ? `Done · ${result.answered ?? result.total} of ${result.total} answered · ${fmtDuration(result.timeTakenSecs || 0)}`
                    : `${PRC_EXAM_FORMAT[s].items} items · ${hours(s)}${isNext ? ' · next' : ''}`}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="text-sm text-muted2">
          Results are revealed after the final section, as on the board. Take your break; this sitting keeps until{' '}
          {expires.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}.
        </p>

        <div className="flex flex-wrap gap-3">
          {hasDraft ? (
            <Button size="lg" onClick={onResumeDraft}>Resume the section in progress</Button>
          ) : (
            <Button size="lg" loading={loading} onClick={onContinue}>
              Start {toDisplaySubject(next)} ({hours(next)})
            </Button>
          )}
          <Button variant="ghost" tone="danger" onClick={() => setConfirmAbandon(true)}>Abandon this sitting</Button>
        </div>
      </Card>

      <Modal
        open={confirmAbandon}
        onClose={() => setConfirmAbandon(false)}
        title="Abandon this board?"
        icon={TriangleAlert}
        tone="danger"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAbandon(false)}>Keep going</Button>
            <Button variant="danger" onClick={() => { setConfirmAbandon(false); onAbandon(); }}>Abandon</Button>
          </>
        }
      >
        <p className="text-sm text-muted2">
          The finished sections stay in your analytics, but this sitting will not get a board result.
        </p>
      </Modal>
    </div>
  );
}

/** The board result, once all three sections are in. */
export function FullBoardResults({ board }) {
  const summary = fullBoardSummary(board);
  return (
    <Card elevated glow className="p-6 sm:p-8 flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-eyebrow">Full PRC board result</h1>
          <p className="text-display text-5xl text-textMain tabular-nums mt-1">{summary.generalAverage.toFixed(1)}%</p>
          <p className="text-sm text-muted2">General weighted average · {fmtDuration(summary.timeTakenSecs)} across three sections</p>
        </div>
        <Badge tone={VERDICT_TONE[summary.verdict] || 'neutral'}>{summary.verdict}</Badge>
      </div>
      <div className="flex flex-col gap-3" aria-label="Rating by subject">
        {FULL_BOARD_SECTIONS.map((s) => {
          const pct = summary.subjectScores[s] ?? 0;
          const below = pct < SUBJECT_FLOOR;
          return (
            <div key={s} className="flex flex-col gap-1">
              <div className="flex justify-between text-sm">
                <span className="text-textMain font-medium">{toDisplaySubject(s)}</span>
                <span className="tabular-nums text-textMain">
                  {pct}%{below && <span className="text-xs" style={{ color: 'var(--accent-danger)' }}> · under the {SUBJECT_FLOOR}% floor</span>}
                </span>
              </div>
              <ProgressIndicator
                value={pct}
                max={100}
                tone={below ? 'danger' : pct >= GENERAL_AVERAGE ? 'success' : 'amber'}
                ariaLabel={`${toDisplaySubject(s)} rating`}
                size="sm"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted2">
        The board needs a {GENERAL_AVERAGE}% weighted average (Math 25 / ESAS 30 / EE 45) with no subject under {SUBJECT_FLOOR}%.
        The answers below are the final ({toDisplaySubject(FULL_BOARD_SECTIONS[FULL_BOARD_SECTIONS.length - 1])}) section; the full review has all three.
      </p>
      {board.sessionId && (
        <Button as={Link} to={`/exams/sittings/${encodeURIComponent(board.sessionId)}`} variant="secondary" className="self-start">
          <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" /> Review all three sections
        </Button>
      )}
    </Card>
  );
}
