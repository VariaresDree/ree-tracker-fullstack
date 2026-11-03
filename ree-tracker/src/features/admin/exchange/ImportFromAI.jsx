// src/features/admin/exchange/ImportFromAI.jsx
//
// Admin › Question bank › Import from another AI: copy a prompt into Claude,
// ChatGPT or Gemini's own app, paste the reply, check it, and send it to the
// review queue. Their free apps write better than the free API models, and this
// spends none of the app's quota.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { Button, Disclosure, FormField, Grid, Input, Select, Textarea } from '../../../components/ui';
import { Check, Copy } from '../../../components/ui/icons';
import { importQuestions } from '../../../services/dbQueries';
import { buildQuestionImportPrompt, MAX_PER_MESSAGE } from '../../../services/externalPrompts';
import { QUESTION_TYPES } from '../../../services/aiPrompts';
import { copyText } from '../../exam-export/deliver';
import { normalizeGenerated, questionIssues } from '../../../utils/questionChecks';
import { labelForGenerated } from '../../../utils/topicLabels';
import { normalizeSubject } from '@ree/shared';
import { GeneratedItem } from '../ai/QuestionGenerator';
import { parseExchange } from './aiExchange';

const CHUNK = 25;
const REASON_WORDS = {
  duplicate: 'This question is already live or in the review queue.',
  'key-not-an-option': 'The answer key matches none of the options.',
  'missing-explanation': 'It has no explanation.',
  'unbalanced-math': 'Unbalanced $ in the math.',
  'unknown-topic': "This topic isn't in this subject's syllabus.",
  'invalid-subject': "The subject isn't Mathematics, ESAS or EE.",
};
const reasonWords = (reason) => REASON_WORDS[reason] || `The ${String(reason).split(':')[0]} field has a problem.`;

// A row without what only this screen uses.
const forServer = (row) => {
  const q = { ...row };
  delete q.issues;
  delete q.selected;
  return q;
};

export default function ImportFromAI() {
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const subjects = Object.keys(dynamicTOS || {});
  const [subject, setSubject] = useState('EE');
  const [topic, setTopic] = useState('All');
  const [count, setCount] = useState(MAX_PER_MESSAGE);
  const [type, setType] = useState('mixed');
  const [fromFile, setFromFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState('');
  const [problems, setProblems] = useState([]);
  const [items, setItems] = useState([]);
  const [sending, setSending] = useState(false);
  const topics = useMemo(() => dynamicTOS?.[subject] || [], [dynamicTOS, subject]);
  const selected = items.filter((q) => q.selected);

  const copyPrompt = async () => {
    const ok = await copyText(buildQuestionImportPrompt({ subject, topic, topics, count: Number(count) || MAX_PER_MESSAGE, type, fromFile }));
    if (!ok) { toast.error("Couldn't copy. Allow clipboard access and try again."); return; }
    setCopied(true);
    toast.success('Prompt copied. Paste it into the other AI.');
  };

  const readFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) setReply(await file.text());
  };

  const readReply = () => {
    const parsed = parseExchange(reply);
    const found = parsed.questions.map(normalizeGenerated).map((q) => {
      const itemSubject = normalizeSubject(q.subject) || subject;
      const shaped = {
        ...q,
        subject: itemSubject,
        subtopic: labelForGenerated(q.subtopic, { target: 'All', topics: dynamicTOS?.[itemSubject] }),
      };
      return { ...shaped, issues: questionIssues(shaped), selected: false };
    }).map((q) => ({ ...q, selected: q.issues.length === 0 }));
    setItems(found);
    setProblems(parsed.cards.length ? [...parsed.problems, 'This reply has formula cards. Import those in Formula cards › AI generate › From another AI.'] : parsed.problems);
    if (found.length) setReply('');
  };

  // In chunks of 25, in turn: the free tier's request budget, and a refusal or a
  // failed chunk leaves those rows here to fix.
  const send = async () => {
    setSending(true);
    const toastId = toast.loading(`Sending ${selected.length} to the review queue…`);
    const rest = items.filter((q) => !q.selected);
    let queued = 0;
    let failed = false;
    for (let i = 0; i < selected.length; i += CHUNK) {
      const chunk = selected.slice(i, i + CHUNK);
      try {
        const res = await importQuestions(chunk.map(forServer));
        queued += res.queued.length;
        for (const { index, reasons } of res.rejected) {
          rest.push({ ...chunk[index], selected: false, issues: reasons.map(reasonWords) });
        }
      } catch (err) {
        failed = true;
        rest.push(...chunk);
        toast.error(err.message || "Couldn't send some of them. They're still here.");
      }
    }
    setItems(rest);
    setSending(false);
    const left = rest.length ? ` · ${rest.length} still here` : '';
    if (queued || !failed) toast.success(`${queued} sent to the review queue${left}.`, { id: toastId });
    else toast.dismiss(toastId);
  };

  const g = {
    toggle: (i) => setItems((list) => list.map((q, idx) => (idx === i ? { ...q, selected: !q.selected } : q))),
    remove: (i) => setItems((list) => list.filter((_, idx) => idx !== i)),
  };

  return (
    <Disclosure title="Import from another AI" description="Use Claude, ChatGPT or Gemini in their own apps, then paste the reply here.">
      <div className="flex flex-col gap-5">
        <section aria-label="Step 1: copy the prompt" className="flex flex-col gap-3">
          <p className="text-eyebrow">1 · Copy the prompt</p>
          <Grid kind="kpi" gap="sm" className="items-end">
            <FormField label="Subject">
              <Select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic('All'); }}>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Topic">
              <Select value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="All">All topics</option>
                {topics.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="How many" hint={`At most ${MAX_PER_MESSAGE} per message`}>
              <Input type="number" min={1} max={MAX_PER_MESSAGE} value={count} onChange={(e) => setCount(e.target.value)} />
            </FormField>
            <FormField label="Kind">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </FormField>
          </Grid>
          <label className="flex items-center gap-2 text-xs text-muted2 cursor-pointer select-none">
            <input type="checkbox" checked={fromFile} onChange={(e) => setFromFile(e.target.checked)} />
            I'll attach a reviewer for the AI to work from
          </label>
          <Button variant="secondary" onClick={copyPrompt} className="self-start">
            {copied ? <Check size={14} strokeWidth={2} aria-hidden="true" /> : <Copy size={14} strokeWidth={1.75} aria-hidden="true" />} Copy prompt
          </Button>
        </section>

        <section aria-label="Step 2: paste the reply" className="flex flex-col gap-3">
          <p className="text-eyebrow">2 · Paste its reply</p>
          <p className="text-xs text-muted2 max-w-2xl">Use the copy button on its code block, so the LaTeX comes across as written. You can paste several replies together.</p>
          <FormField label="The AI's reply">
            <Textarea value={reply} onChange={(e) => setReply(e.target.value)} className="!min-h-32 font-mono text-xs" placeholder="===QUESTION===" />
          </FormField>
          <div className="flex flex-wrap items-end gap-3">
            <Button onClick={readReply} disabled={!reply.trim()}>Read the reply</Button>
            <FormField label="Or a file" className="min-w-0">
              <Input type="file" accept=".txt,.md,.json,text/plain,text/markdown,application/json" onChange={readFile} aria-label="Choose a reply file" />
            </FormField>
          </div>
          {problems.map((p) => <p key={p} role="alert" className="text-xs" style={{ color: 'var(--accent-danger)' }}>{p}</p>)}
        </section>

        {items.length > 0 && (
          <section aria-label="Step 3: check and send" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-eyebrow">3 · Check and send · {items.length} read</p>
              <Button tone="success" onClick={send} loading={sending} disabled={sending || selected.length === 0}>
                Send {selected.length} to the review queue
              </Button>
            </div>
            <ol className="flex flex-col gap-3">
              {items.map((q, idx) => <GeneratedItem key={`${idx}-${q.text.slice(0, 24)}`} q={q} idx={idx} g={g} disabled={sending} />)}
            </ol>
          </section>
        )}
      </div>
    </Disclosure>
  );
}
