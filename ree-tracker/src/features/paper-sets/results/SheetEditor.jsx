// src/features/paper-sets/results/SheetEditor.jsx
//
// One scanned sheet on the results page: its answers beside the key, item by
// item, to view or correct (and the taker's name). Saving sends only what
// changed; the server scores the sheet again, and so does this screen.
import { useMemo, useState } from 'react';
import { Button, FormField, Input, Modal } from '../../../components/ui';
import { Pencil } from '../../../components/ui/icons';
import { correctionChoices } from '../scan/scanModel';

const NAME_REQUIRED = 'Write the taker\u2019s name.';

/**
 * @param {{ sheet: object, items: object[], perItem: string[], onSave: (patch: object) => Promise<void>, onClose: () => void }} props
 *   items: the set's effective items (their option counts and keys)
 */
export default function SheetEditor({ sheet, items, perItem, onSave, onClose }) {
  const [name, setName] = useState(sheet.takerName || '');
  const [answers, setAnswers] = useState(() => items.map((_, i) => sheet.answers[i] || '-'));
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const choices = useMemo(() => items.map((it) => correctionChoices((it.options || []).length)), [items]);

  const save = async () => {
    const takerName = name.trim();
    if (!sheet.isSelf && !takerName) {
      setNameError(NAME_REQUIRED);
      return;
    }
    const patch = {};
    const joined = answers.join('');
    if (joined !== sheet.answers) patch.answers = joined;
    if (!sheet.isSelf && takerName !== (sheet.takerName || '')) patch.takerName = takerName;
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(patch);
      onClose();
    } catch (err) {
      setError(`That change wasn\u2019t saved. ${err?.message || 'Try again.'}`);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={sheet.isSelf ? 'Self-check' : (sheet.takerName || 'Scanned sheet')}
      icon={Pencil}
      size="lg"
      footer={(
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} loading={saving}>Save</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {!sheet.isSelf && (
          <FormField label={'Taker\u2019s name'} required error={nameError}>
            <Input value={name} maxLength={80} autoComplete="off" onChange={(e) => { setName(e.target.value); setNameError(null); }} />
          </FormField>
        )}
        <p className="text-sm text-muted2">Change an answer if the scanner read it wrongly. The sheet is scored again with the set{'\u2019'}s current key.</p>
        <ol className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((it, i) => {
            const state = perItem[i];
            return (
              <li key={it.n} className="flex items-center gap-2 min-w-0">
                <label htmlFor={`sheet-item-${it.n}`} className="text-sm text-textMain tabular-nums w-16 shrink-0">
                  {`Item ${it.n}`}
                </label>
                <select
                  id={`sheet-item-${it.n}`}
                  className="min-w-0 flex-1 bg-bg border border-border text-textMain text-sm rounded-[var(--radius-default)] px-2 py-1.5 pointer-coarse:min-h-11"
                  value={answers[i]}
                  onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                  aria-describedby={`sheet-key-${it.n}`}
                >
                  {choices[i].map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <span id={`sheet-key-${it.n}`} className="text-xs text-muted2 tabular-nums shrink-0">
                  {it.answerLetter === '-' ? 'not scored' : `${state === 'right' ? 'right, ' : ''}key ${it.answerLetter}`}
                </span>
              </li>
            );
          })}
        </ol>
        {error && <p role="alert" className="text-sm text-[var(--accent-danger)]">{error}</p>}
      </div>
    </Modal>
  );
}
