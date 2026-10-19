// src/features/library/QuestionEditModal.jsx
//
// The editor for one live question, used by the Question bank grid and by
// Answer positions (which opens a listed question by its id). Beside the
// fields it shows:
//   • the question's id, with Copy, so a row can be found again;
//   • a live preview, rendered as learners see it, with the key marked, so a
//     stray `$` shows up as broken math before it is saved;
//   • the same form checks the AI generator runs (utils/questionChecks).
//     Ones that would break grading or rendering (an empty or repeated
//     option, unbalanced `$`, no question) block Save; the rest only warn.
import { useMemo, useState } from 'react';
import LatexRenderer from '../../components/LatexRenderer';
import { useStore } from '../../store/useStore';
import { Button, Modal, FormField, Select, Input, Textarea } from '../../components/ui';
import { Pencil, Copy, Check, CircleAlert } from '../../components/ui/icons';
import { editIssues } from './editIssues';
import { answerSlotOf, distractorSlots, slotsOf, withAnswer, withDistractor } from './editSlots';

const LETTERS = ['A', 'B', 'C', 'D'];

function CopyId({ id }) {
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked: the id is still selectable */ }
  };
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-muted2">
      ID <span className="font-mono text-textMain select-all break-all">{id}</span>
      <Button size="sm" variant="ghost" onClick={copy} aria-label={copied ? 'Copied' : 'Copy the question ID'}>
        {copied ? <Check size={14} strokeWidth={1.75} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </p>
  );
}

function Preview({ q }) {
  const options = Array.isArray(q.options) ? q.options : [];
  return (
    <section aria-label="Preview" className="flex flex-col gap-3 p-4 rounded-[var(--radius-lg)] border border-border bg-surface2/50">
      <p className="text-eyebrow text-muted2">Preview</p>
      <div className="text-sm text-textMain leading-relaxed min-w-0"><LatexRenderer content={q.text || ''} /></div>
      <ol className="flex flex-col gap-1.5">
        {options.map((o, i) => {
          const isKey = o === q.answer && o !== '';
          return (
            <li
              key={i}
              className="flex items-start gap-2 text-sm rounded-[var(--radius-default)] px-2 py-1.5 border"
              style={isKey
                ? { borderColor: 'color-mix(in srgb, var(--accent-success) 45%, transparent)', background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)' }
                : { borderColor: 'var(--border)' }}
            >
              <span className="font-semibold text-muted2 tabular-nums">{LETTERS[i] || i + 1}</span>
              <span className="min-w-0 flex-1 text-textMain">{o ? <LatexRenderer content={o} inline /> : <em className="text-muted2">empty</em>}</span>
              {isKey && <span className="text-xs font-medium" style={{ color: 'var(--accent-success)' }}>Correct</span>}
            </li>
          );
        })}
      </ol>
      {q.fixedExplanation && (
        <div className="text-xs text-muted2 leading-relaxed border-t border-border pt-2 min-w-0">
          <LatexRenderer content={q.fixedExplanation} />
        </div>
      )}
    </section>
  );
}

export default function QuestionEditModal({ question, onChange, onClose, onSave, saving = false, error = '' }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS);

  // The key keeps its slot (editSlots.js), chosen once per question opened.
  const [answerSlot, setAnswerSlot] = useState({ id: null, at: 0 });
  if (question && answerSlot.id !== question.id) setAnswerSlot({ id: question.id, at: answerSlotOf(question) });
  const answerAt = question && answerSlot.id === question.id ? answerSlot.at : answerSlotOf(question);

  // The slots as they'd be saved, so the preview and the checks see all four.
  const shaped = useMemo(() => (question ? { ...question, options: slotsOf(question, answerAt) } : null), [question, answerAt]);
  const distractors = useMemo(() => (shaped ? distractorSlots(answerAt).map((i) => shaped.options[i]) : ['', '', '']), [shaped, answerAt]);
  const { blocking, warnings } = useMemo(() => (shaped ? editIssues(shaped) : { blocking: [], warnings: [] }), [shaped]);

  const save = () => {
    if (!shaped || blocking.length) return;
    // The schema takes a number; the select gives a string.
    onSave({ ...shaped, difficulty: Number(shaped.difficulty) || 2, isFlagged: false });
  };

  return (
    <Modal
      open={!!question}
      onClose={onClose}
      size="xl"
      icon={Pencil}
      title="Edit question"
      closeOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={saving || blocking.length > 0}>Save changes</Button>
        </>
      }
    >
      {question && (
        <div className="flex flex-col gap-5">
          <CopyId id={question.id} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Subject">
              <Select value={question.subject || 'EE'} onChange={(e) => onChange({ ...question, subject: e.target.value })}>
                {dynamicTOS && Object.keys(dynamicTOS).map((subj) => <option key={subj} value={subj}>{subj}</option>)}
              </Select>
            </FormField>
            <FormField label="Topic">
              <Select value={question.subtopic || ''} onChange={(e) => onChange({ ...question, subtopic: e.target.value })}>
                <option value="">Select a topic…</option>
                {question.subtopic && !(dynamicTOS?.[question.subject || 'EE'] || []).includes(question.subtopic) && (
                  <option value={question.subtopic}>{question.subtopic}</option>
                )}
                {dynamicTOS && dynamicTOS[question.subject || 'EE']?.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Question type">
              <Select value={question.type || 'calculation'} onChange={(e) => onChange({ ...question, type: e.target.value })}>
                <option value="calculation">Calculation (heavy math)</option>
                <option value="conceptual">Conceptual (theory)</option>
              </Select>
            </FormField>
            <FormField label="Difficulty">
              <Select
                value={String(Math.min(3, Math.max(1, Math.round(Number(question.difficulty) || 2))))}
                onChange={(e) => onChange({ ...question, difficulty: Number(e.target.value) })}
              >
                <option value="1">1 — Foundation (easy)</option>
                <option value="2">2 — Core (medium)</option>
                <option value="3">3 — Advanced (hard)</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Question text" hint="Wrap math in $…$, for example $V = IR$.">
            <Textarea
              value={question.text}
              onChange={(e) => onChange({ ...question, text: e.target.value })}
              className="min-h-[100px] leading-relaxed custom-scrollbar"
              placeholder="Write the full question…"
            />
          </FormField>

          <FormField label="Correct answer">
            <Input
              value={question.answer || ''}
              onChange={(e) => onChange(withAnswer(question, answerAt, e.target.value))}
              placeholder="The exact correct value or statement"
              style={{ borderColor: 'color-mix(in srgb, var(--accent-success) 40%, transparent)' }}
            />
          </FormField>

          <FormField label="Wrong options (distractors)">
            {({ id }) => (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {distractors.map((val, idx) => (
                  <Input
                    key={idx}
                    id={idx === 0 ? id : undefined}
                    value={val}
                    onChange={(e) => onChange(withDistractor(question, answerAt, idx, e.target.value))}
                    placeholder={`Wrong option ${idx + 1}`}
                    aria-label={`Wrong option ${idx + 1}`}
                    style={{ borderColor: 'color-mix(in srgb, var(--accent-danger) 20%, transparent)' }}
                  />
                ))}
              </div>
            )}
          </FormField>

          <FormField label="Solution / explanation" hint="Shown as the offline solution after answering.">
            <Textarea
              value={question.fixedExplanation || ''}
              onChange={(e) => onChange({ ...question, fixedExplanation: e.target.value })}
              className="min-h-[100px] leading-relaxed custom-scrollbar"
              placeholder="Step-by-step derivation…"
            />
          </FormField>

          {(blocking.length > 0 || warnings.length > 0) && (
            <ul className="flex flex-col gap-1 text-sm" aria-label="Checks">
              {blocking.map((i) => (
                <li key={i} className="flex items-center gap-2" style={{ color: 'var(--accent-danger)' }}>
                  <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" /> {i}. Fix this to save.
                </li>
              ))}
              {warnings.map((i) => (
                <li key={i} className="flex items-center gap-2 text-muted2">
                  <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" /> {i}.
                </li>
              ))}
            </ul>
          )}
          {error && <p className="text-sm" role="alert" style={{ color: 'var(--accent-danger)' }}>{error}</p>}

          {shaped && <Preview q={shaped} />}
        </div>
      )}
    </Modal>
  );
}
