// src/features/admin/exchange/ImportFromAI.jsx
//
// Admin › Question bank › Import from another AI: the same settings as the AI
// question generator, but the writing happens in Claude, ChatGPT or Gemini's own
// app. Copy the prompt there, paste the reply back, check it, and send it to the
// review queue. Their free apps write better than the free API models, and this
// spends none of the app's quota.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store/useStore';
import { Button, Card, FormField, Input, Textarea } from '../../../components/ui';
import { Check, ClipboardList, Copy, ExternalLink } from '../../../components/ui/icons';
import { importQuestions } from '../../../services/dbQueries';
import { buildQuestionImportPrompt, MAX_PER_MESSAGE } from '../../../services/externalPrompts';
import { copyText } from '../../exam-export/deliver';
import { normalizeGenerated, questionIssues } from '../../../utils/questionChecks';
import { labelForGenerated } from '../../../utils/topicLabels';
import { normalizeSubject } from '@ree/shared';
import { GeneratedItem } from '../ai/QuestionGenerator';
import QuestionSpecFields from '../ai/QuestionSpecFields';
import { parseExchange } from './aiExchange';

const CHUNK = 25;
const COUNT_PRESETS = [5, 10, 15, 20];
const APPS = [
  { name: 'Claude', href: 'https://claude.ai/new' },
  { name: 'ChatGPT', href: 'https://chatgpt.com/' },
  { name: 'Gemini', href: 'https://gemini.google.com/app' },
];
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

const StepTitle = ({ n, children }) => <p className="text-eyebrow">{n} · {children}</p>;

export default function ImportFromAI({ onSaved }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const [spec, setSpec] = useState({ subject: 'EE', topic: 'All', focus: '', count: 10, type: 'mixed', calcShare: 0.6, difficulty: 'board', notes: '' });
  const [fromFile, setFromFile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState('');
  const [problems, setProblems] = useState([]);
  const [items, setItems] = useState([]);
  const [sending, setSending] = useState(false);
  const selected = items.filter((q) => q.selected);
  const needLook = items.filter((q) => q.issues.length).length;

  const update = (patch) => { setSpec((s) => ({ ...s, ...patch })); setCopied(false); };
  const prompt = useMemo(
    () => buildQuestionImportPrompt({ ...spec, topics: dynamicTOS?.[spec.subject] || [], fromFile }),
    [spec, dynamicTOS, fromFile],
  );

  const copyPrompt = async () => {
    const ok = await copyText(prompt);
    if (!ok) { toast.error("Couldn't copy. Select the prompt and copy it by hand."); return; }
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
      const itemSubject = normalizeSubject(q.subject) || spec.subject;
      const shaped = {
        ...q,
        subject: itemSubject,
        subtopic: labelForGenerated(q.subtopic, { target: 'All', topics: dynamicTOS?.[itemSubject] }),
      };
      const issues = questionIssues(shaped);
      return { ...shaped, issues, selected: issues.length === 0 };
    });
    // Read onto what's already here: replies can come back one message at a time.
    setItems((list) => [...list, ...found]);
    setProblems(parsed.cards.length ? [...parsed.problems, 'This reply has formula cards. Import those in Formula cards › Add › From another AI.'] : parsed.problems);
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
    if (queued) onSaved?.();
  };

  const g = {
    toggle: (i) => setItems((list) => list.map((q, idx) => (idx === i ? { ...q, selected: !q.selected } : q))),
    remove: (i) => setItems((list) => list.filter((_, idx) => idx !== i)),
  };

  return (
    <Card as="section" elevated padding="md" className="@container flex flex-col gap-6" aria-labelledby="import-title">
      <header className="flex flex-col gap-1">
        <h3 id="import-title" className="text-h3 text-textMain flex items-center gap-2">
          <ClipboardList size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber-text)' }} /> Import from another AI
        </h3>
        <p className="text-xs text-muted2">
          Write questions with Claude, ChatGPT or Gemini in their own apps, using none of this app's AI quota. In testing, free Claude gave the cleanest replies. Nothing goes live: every question waits in the review queue.
        </p>
      </header>

      <section aria-label="Step 1: choose what to write" className="flex flex-col gap-5 min-w-0">
        <StepTitle n={1}>Choose what to write</StepTitle>
        <QuestionSpecFields spec={spec} update={update} maxCount={MAX_PER_MESSAGE} countHint={`1 to ${MAX_PER_MESSAGE} per message. For more, send the prompt again.`} presets={COUNT_PRESETS} idPrefix="import">
          <label className="flex items-start gap-3 text-sm text-textMain cursor-pointer">
            <input type="checkbox" className="mt-1" checked={fromFile} onChange={(e) => { setFromFile(e.target.checked); setCopied(false); }} />
            <span>
              I'll attach a reviewer for the AI to work from
              <span className="block text-xs text-muted2">Attach the file in the other app, along with the prompt.</span>
            </span>
          </label>
        </QuestionSpecFields>
      </section>

      <section aria-label="Step 2: copy the prompt" className="flex flex-col gap-3 min-w-0">
        <StepTitle n={2}>Copy the prompt into the other AI</StepTitle>
        <FormField label="Prompt" hint="It changes with your choices above.">
          <Textarea value={prompt} readOnly rows={7} className="font-mono text-xs" />
        </FormField>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={copyPrompt}>
            {copied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.75} aria-hidden="true" />} {copied ? 'Copied' : 'Copy prompt'}
          </Button>
          {APPS.map((app) => (
            <Button key={app.name} as="a" size="sm" variant="ghost" href={app.href} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> {app.name}
            </Button>
          ))}
        </div>
      </section>

      <section aria-label="Step 3: paste the reply" className="flex flex-col gap-3 min-w-0">
        <StepTitle n={3}>Paste its reply</StepTitle>
        <FormField label="The AI's reply" hint="Use the copy button on its code block, so the LaTeX comes across as written. You can paste several replies together.">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} className="!min-h-32 font-mono text-xs" placeholder="===QUESTION===" />
        </FormField>
        <div className="flex flex-wrap items-end gap-3">
          <Button variant="secondary" onClick={readReply} disabled={!reply.trim()}>Read the reply</Button>
          <FormField label="Or a file" className="min-w-0">
            <Input type="file" accept=".txt,.md,.json,text/plain,text/markdown,application/json" onChange={readFile} aria-label="Choose a reply file" />
          </FormField>
        </div>
        {problems.map((p) => <p key={p} role="alert" className="text-xs" style={{ color: 'var(--accent-danger)' }}>{p}</p>)}
      </section>

      {items.length > 0 && (
        <section aria-label="Step 4: check and send" className="flex flex-col gap-4 border-t border-border pt-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <StepTitle n={4}>Check and send</StepTitle>
              <p className="text-sm text-textMain mt-1">
                <span className="font-semibold">{items.length} question{items.length === 1 ? '' : 's'} read</span>
                <span className="text-muted2"> · {selected.length} ticked{needLook ? ` · ${needLook} need a look` : ''}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" tone="danger" onClick={() => setItems([])} disabled={sending}>Discard all</Button>
              <Button onClick={send} loading={sending} disabled={sending || selected.length === 0}>
                Send {selected.length} to review queue
              </Button>
            </div>
          </div>
          <ol className="flex flex-col gap-3">
            {items.map((q, idx) => <GeneratedItem key={`${idx}-${q.text.slice(0, 24)}`} q={q} idx={idx} g={g} disabled={sending} />)}
          </ol>
        </section>
      )}
    </Card>
  );
}
