// src/features/paper-sets/print/ItemEditor.jsx
//
// "Edit item N": the question, its options (2 to 6), the correct answer and
// the worked solution, each with a live preview typeset as it will print.
// The edit changes this printed set only, never the question bank; "Use the
// question bank's wording" takes it back. Saved through the shared rules
// (itemEditErrors, which the API runs too), plus a check that every formula
// renders. Warns when a change affects sheets already printed or scored.
import { useDeferredValue, useId, useLayoutEffect, useRef, useState } from 'react';
import { PAPER_SET_LIMITS, itemEditErrors } from '@ree/shared';
import LatexRenderer from '../../../components/LatexRenderer';
import { Button, FormField, Input, Modal, Textarea } from '../../../components/ui';
import { Pencil, Plus, Trash2, TriangleAlert } from '../../../components/ui/icons';
import { editFor, formFor } from '../printedSetModel';
import { BROKEN_FORMULA } from './layout';

const letterOf = (i) => String.fromCharCode(65 + i);
export const FORMULA_ERROR = "Check the formula: it doesn't render.";

function Preview({ content, inline = false, label, previewRef }) {
  return (
    <div className="ree-edit-preview" ref={previewRef}>
      <span className="ree-edit-preview-label">{label}</span>
      {content && content.trim()
        ? <LatexRenderer content={content} inline={inline} />
        : <span className="ree-edit-preview-empty">Nothing to show yet.</span>}
    </div>
  );
}

function Notice({ children }) {
  return (
    <div
      className="flex items-start gap-2 p-3 rounded-[var(--radius-default)] border bg-surface2 text-sm text-textMain"
      style={{ borderColor: 'color-mix(in srgb, var(--color-reeAmber) 45%, transparent)' }}
    >
      <TriangleAlert size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 mt-0.5 text-reeAmber-text" />
      <p>{children}</p>
    </div>
  );
}

/**
 * @param {{ item: object, original: object, sheetCount?: number,
 *   onSave: (edit: object|null) => void, onClose: () => void }} props
 *   item: as it prints now (edits applied); original: as drawn from the bank
 */
export default function ItemEditor({ item, original, sheetCount = 0, onSave, onClose }) {
  const [form, setForm] = useState(() => formFor(item));
  const [tried, setTried] = useState(false);
  const shown = useDeferredValue(form);
  const answerName = useId();
  const optionsLegend = useId();

  // Which previews show a formula KaTeX couldn't render.
  const textRef = useRef(null);
  const explanationRef = useRef(null);
  const optionRefs = useRef([]);
  const [broken, setBroken] = useState({ text: false, explanation: false, options: [] });
  useLayoutEffect(() => {
    const bad = (el) => !!el?.querySelector(BROKEN_FORMULA);
    const next = {
      text: bad(textRef.current),
      explanation: bad(explanationRef.current),
      options: shown.options.map((_, i) => bad(optionRefs.current[i])),
    };
    setBroken((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  }, [shown]);

  const edit = editFor(original, form);
  const ruleErrors = edit ? itemEditErrors(edit) : {};
  const formulaBroken = broken.text || broken.explanation || broken.options.some(Boolean);
  const show = (field) => (tried ? ruleErrors[field] : undefined);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setOption = (i, value) => setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? value : o)) }));
  const addOption = () => setForm((f) => (f.options.length >= PAPER_SET_LIMITS.options ? f : { ...f, options: [...f.options, ''] }));
  const removeOption = (i) => setForm((f) => {
    if (f.options.length <= 2) return f;
    let answerIndex = f.answerIndex;
    if (answerIndex === i) answerIndex = -1;
    else if (answerIndex > i) answerIndex -= 1;
    return { ...f, options: f.options.filter((_, j) => j !== i), answerIndex };
  });

  const countChanged = form.options.length !== (item.options || []).length;
  const answerChanged = form.answerIndex !== item.answerIndex;
  const scoredNote = sheetCount === 1
    ? '1 sheet is already scored. It is scored again with this key.'
    : `${sheetCount} sheets are already scored. They are scored again with this key.`;

  const save = () => {
    setTried(true);
    if (Object.keys(ruleErrors).length || formulaBroken) return;
    onSave(edit);
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={Pencil}
      size="lg"
      keyboardSafe
      title={`Edit item ${item.n}`}
      footer={(
        <>
          {item.edited && (
            <Button variant="ghost" onClick={() => onSave(null)}>Use the question bank&rsquo;s wording</Button>
          )}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-5">
        <p className="text-xs text-muted2">
          Changes apply to this printed set only, not to the question bank. Write formulas between $ signs, as in the bank.
        </p>

        <div className="flex flex-col gap-2">
          <FormField label="Question" error={show('text') || (broken.text ? FORMULA_ERROR : undefined)}>
            <Textarea rows={4} value={form.text} onChange={(e) => update({ text: e.target.value })} />
          </FormField>
          <Preview content={shown.text} label="Preview" previewRef={textRef} />
        </div>

        <fieldset className="flex flex-col gap-3 min-w-0" aria-describedby={show('options') ? `${optionsLegend}-error` : undefined}>
          <legend id={optionsLegend} className="text-eyebrow mb-2">Options</legend>
          {form.options.map((o, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex items-end gap-2">
                <FormField label={`Option ${letterOf(i)}`} className="flex-1 min-w-0" error={broken.options[i] ? FORMULA_ERROR : undefined}>
                  <Input value={o} onChange={(e) => setOption(i, e.target.value)} />
                </FormField>
                {form.options.length > 2 && (
                  <Button variant="ghost" size="icon" aria-label={`Remove option ${letterOf(i)}`} onClick={() => removeOption(i)}>
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Button>
                )}
              </div>
              <Preview content={shown.options[i] ?? ''} inline label={`(${letterOf(i)})`} previewRef={(el) => { optionRefs.current[i] = el; }} />
            </div>
          ))}
          {show('options') && <p id={`${optionsLegend}-error`} className="text-xs text-[var(--accent-danger)]">{show('options')}</p>}
          {form.options.length < PAPER_SET_LIMITS.options && (
            <Button variant="secondary" size="sm" className="self-start" onClick={addOption}>
              <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
              Add an option
            </Button>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2 min-w-0" aria-describedby={show('answerIndex') ? `${answerName}-error` : undefined}>
          <legend className="text-eyebrow mb-2">Correct answer</legend>
          <div className="flex flex-wrap items-center gap-3">
            {form.options.map((_, i) => (
              <label key={i} className="flex items-center gap-2 text-sm text-textMain cursor-pointer pointer-coarse:min-h-11">
                <input
                  type="radio"
                  name={answerName}
                  className="h-4 w-4 accent-[var(--accent)]"
                  checked={form.answerIndex === i}
                  onChange={() => update({ answerIndex: i })}
                />
                {letterOf(i)}
              </label>
            ))}
          </div>
          {show('answerIndex') && <p id={`${answerName}-error`} className="text-xs text-[var(--accent-danger)]">{show('answerIndex')}</p>}
        </fieldset>

        <div className="flex flex-col gap-2">
          <FormField label="Worked solution" hint="Optional. Printed in the answer key." error={show('explanation') || (broken.explanation ? FORMULA_ERROR : undefined)}>
            <Textarea rows={5} value={form.explanation} onChange={(e) => update({ explanation: e.target.value })} />
          </FormField>
          <Preview content={shown.explanation} label="Preview" previewRef={explanationRef} />
        </div>

        {countChanged && <Notice>Reprint the answer sheet after this change. Sheets printed before it won&rsquo;t scan.</Notice>}
        {answerChanged && sheetCount > 0 && <Notice>{scoredNote}</Notice>}
        {tried && formulaBroken && <p role="alert" className="text-sm text-[var(--accent-danger)]">{FORMULA_ERROR}</p>}
      </div>
    </Modal>
  );
}
