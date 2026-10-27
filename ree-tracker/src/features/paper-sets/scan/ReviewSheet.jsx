// src/features/paper-sets/scan/ReviewSheet.jsx
//
// Check a scanned sheet before it is scored: the straightened sheet with what
// was read drawn over it (marked bubbles ringed in the accent colour, double
// marks amber, unsure rows dashed), the rows that need a look as a list of
// buttons, and every answer behind a disclosure. Any row can be corrected
// (A-F, Blank, or Two marks). A taker's sheet needs the name, typed beside
// the name box cropped from the photo; a self-check takes the date.
//
// The picture is for sighted people and is hidden from assistive technology
// (a tap on it opens the nearest row); the list and the disclosure are the
// accessible path to every row.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, FormField, Input, Modal } from '../../../components/ui';
import { ChevronDown, Pencil, RotateCcw } from '../../../components/ui/icons';
import { answerSheetGeometry, paperSize } from '../../exam-export/sheetLayout';
import { cropToDataUrl, paintImageData } from './imageInput';
import {
  answerLabel, correctionChoices, flagOf, flagSentence, flaggedRows, nearestRow, rowAnswer,
} from './scanModel';

// Ring strokes on the sheet image (graphics on white paper, not text).
const strokeOf = { accent: 'var(--accent)', amber: 'var(--color-reeAmber)' };

/** The rings drawn on one row: what it reads as now (corrections included). */
function rowRings(row, corrected) {
  const ch = corrected ?? rowAnswer(row);
  const rings = [];
  (row.bubbles || []).forEach((b) => {
    if (ch === '*') {
      if ((row.marked || []).includes(b.letter)) rings.push({ b, stroke: strokeOf.amber, dashed: false });
    } else if (ch !== '-' && b.letter === ch) {
      const unsure = corrected == null && row.status === 'unsure';
      rings.push({ b, stroke: unsure ? strokeOf.amber : strokeOf.accent, dashed: unsure });
    }
  });
  return rings;
}

/** One page of the straightened sheet, with the readings over it. */
function SheetImage({ read, rows, corrections, onPick }) {
  const canvasRef = useRef(null);
  const review = read.review;
  useEffect(() => {
    if (review) paintImageData(canvasRef.current, review);
  }, [review]);
  const { w: wMm, h: hMm } = paperSize(read.page.paper);
  const onPage = rows.filter((r) => r.page === read.page.index);

  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = ((e.clientX - box.left) / box.width) * wMm;
    const y = ((e.clientY - box.top) / box.height) * hMm;
    const n = nearestRow(rows, read.page.index, x, y);
    if (n != null) onPick(n);
  };

  return (
    // A pointer shortcut only: every row is also in the list beside it.
    <div className="ree-scan-sheet" aria-hidden="true" onClick={pick} style={{ aspectRatio: `${wMm} / ${hMm}` }}>
      <canvas ref={canvasRef} />
      <svg viewBox={`0 0 ${wMm} ${hMm}`} preserveAspectRatio="none">
        {onPage.flatMap((row) => rowRings(row, corrections[row.n]).map(({ b, stroke, dashed }) => (
          <circle
            key={`${row.n}-${b.k}`}
            cx={b.cx}
            cy={b.cy}
            r={b.r + 0.9}
            fill="none"
            stroke={stroke}
            strokeWidth={0.7}
            strokeDasharray={dashed ? '1.2 0.9' : undefined}
          />
        )))}
      </svg>
    </div>
  );
}

/** Correct one row: A-F (as many as the item has), Blank, or Two marks. */
function CorrectionDialog({ row, optionCount, current, onSave, onClose }) {
  const [value, setValue] = useState(current);
  const flag = flagOf(row);
  const choices = correctionChoices(optionCount);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Item ${row.n}`}
      icon={Pencil}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(value)}>Use this answer</Button>
        </>
      )}
    >
      <p className="text-sm text-muted2 mb-3">
        {flag ? `The scanner read ${flag.text}.` : `The scanner read ${answerLabel(rowAnswer(row))}.`}
      </p>
      <fieldset className="ree-scan-choices">
        <legend className="text-eyebrow mb-2">Answer for item {row.n}</legend>
        {choices.map((c) => (
          <label key={c.value} className="ree-scan-choice">
            <input
              type="radio"
              name={`item-${row.n}`}
              value={c.value}
              checked={value === c.value}
              onChange={() => setValue(c.value)}
            />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}

/**
 * @param {{
 *   set: object, draw: object, reads: object[], rows: object[],
 *   corrections: Record<number, string>, onCorrect: (n: number, ch: string) => void,
 *   who: 'self'|'taker', name: string, onName: (v: string) => void, nameError: string|null,
 *   takenOn: string, onTakenOn: (v: string) => void, takenOnError: string|null, today: string,
 *   onScore: () => void, saving: boolean, saveError: string|null, onRescan: () => void,
 * }} props
 */
export default function ReviewSheet({
  set, draw, reads, rows, corrections, onCorrect, who, name, onName, nameError, nameRef,
  takenOn, onTakenOn, takenOnError, today, onScore, saving, saveError, onRescan,
}) {
  const [editing, setEditing] = useState(null);
  const flags = flaggedRows(rows);
  const optionCounts = useMemo(() => draw.items.map((it) => (it.options || []).length), [draw.items]);

  // The name box, cropped from the first page's straightened image.
  const first = reads.find((r) => r.page.index === 0) || null;
  const nameUrl = useMemo(() => {
    if (!first?.review) return null;
    const box = answerSheetGeometry({ optionCounts, paper: first.page.paper, printId: set.id }).pages[0]?.nameBox;
    if (!box) return null;
    const ppm = first.review.ppm;
    return cropToDataUrl(first.review, { x: (box.x - 1) * ppm, y: (box.y - 1) * ppm, w: (box.w + 2) * ppm, h: (box.h + 2) * ppm });
  }, [first, optionCounts, set.id]);

  const editingRow = editing != null ? rows.find((r) => r.n === editing) : null;

  return (
    <section className="ree-scan-review" aria-labelledby="ree-review-title">
      <div className="ree-scan-review-images">
        {reads.map((read) => (
          <SheetImage key={read.page.index} read={read} rows={rows} corrections={corrections} onPick={setEditing} />
        ))}
      </div>

      <div className="ree-scan-review-side">
        <h2 id="ree-review-title" tabIndex={-1} className="ree-scan-focus text-lg font-semibold text-textMain">Check the answers</h2>
        <p className="text-sm text-muted2">
          {flags.length
            ? `${flags.length === 1 ? '1 item needs' : `${flags.length} items need`} a look. Choose one to correct it.`
            : 'Every item read clearly. You can still change any answer below.'}
        </p>

        {flags.length > 0 && (
          <ul className="ree-scan-flags" aria-label="Items to check">
            {flags.map(({ row, flag }) => {
              const fixed = corrections[row.n];
              return (
                <li key={row.n}>
                  <Button variant="secondary" size="sm" className="ree-scan-flag" onClick={() => setEditing(row.n)}>
                    <span>{flagSentence(row, flag)}</span>
                    {fixed != null && <span className="text-muted2">{`. Now ${answerLabel(fixed)}`}</span>}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <details className="ree-scan-all">
          <summary className="text-sm font-medium text-textMain">
            <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
            {`All answers (${rows.length})`}
          </summary>
          <ul className="ree-scan-answers">
            {rows.map((row) => {
              const ch = corrections[row.n] ?? rowAnswer(row);
              return (
                <li key={row.n}>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(row.n)}>
                    <span className="sr-only">Item</span>
                    {` ${row.n}. ${answerLabel(ch)}`}
                  </Button>
                </li>
              );
            })}
          </ul>
        </details>

        {who === 'taker' ? (
          <div className="ree-scan-name">
            {nameUrl && <img src={nameUrl} alt="The name written on the sheet" />}
            <FormField label={'Taker\u2019s name'} required error={nameError}>
              <Input ref={nameRef} value={name} maxLength={80} autoComplete="off" onChange={(e) => onName(e.target.value)} />
            </FormField>
          </div>
        ) : (
          <FormField label="Date you took it" error={takenOnError}>
            <Input type="date" value={takenOn} max={today} onChange={(e) => onTakenOn(e.target.value)} />
          </FormField>
        )}

        {saveError && <p role="alert" className="text-sm text-[var(--accent-danger)]">{saveError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={onScore} loading={saving}>Score this sheet</Button>
          <Button variant="secondary" onClick={onRescan} disabled={saving}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            Scan again
          </Button>
        </div>
      </div>

      {editingRow && (
        <CorrectionDialog
          key={editingRow.n}
          row={editingRow}
          optionCount={optionCounts[editingRow.n - 1] || 4}
          current={corrections[editingRow.n] ?? rowAnswer(editingRow)}
          onClose={() => setEditing(null)}
          onSave={(ch) => {
            onCorrect(editingRow.n, ch);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}
