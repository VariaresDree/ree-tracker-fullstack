// src/features/admin/exchange/FixWithAI.jsx
//
// Admin › Question bank › Fix questions with another AI: export live questions
// with a prompt to check them, paste the reply back, compare before and after,
// and apply what you accept. Applied in place, so answers, bookmarks and cards
// stay attached. A changed key regrades past answers, so it's never ticked for
// you. The most-answered questions come first: with this many questions, what
// learners actually see is what to fix first.
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { replacePlan } from '@ree/shared/questionReplace';
import { useStore } from '../../../store/useStore';
import { Badge, Button, Card, FormField, Grid, Input, ProgressIndicator, SegmentedControl, Select, StatusPill, Textarea } from '../../../components/ui';
import { Check, Copy, Download, ExternalLink, TriangleAlert, Wrench } from '../../../components/ui/icons';
import LatexRenderer from '../../../components/LatexRenderer';
import { fetchQuestionsForChecking, previewReplacements, replaceQuestions } from '../../../services/dbQueries';
import { buildFixPrompt } from '../../../services/externalPrompts';
import { canDownloadFiles, copyText, downloadBlob } from '../../exam-export/deliver';
import { normalizeGenerated, numbersIn, questionIssues } from '../../../utils/questionChecks';
import ExplanationBody from '../../quiz/ExplanationBody';
import { parseExchange, toExchangeBlock } from './aiExchange';

const CHUNK = 25;
const BATCHES = [5, 10, 15, 25];
const APPS = [
  { name: 'Claude', href: 'https://claude.ai/new' },
  { name: 'ChatGPT', href: 'https://chatgpt.com/' },
  { name: 'Gemini', href: 'https://gemini.google.com/app' },
];
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'key', label: 'Key changes' },
  { value: 'other', label: 'Other changes' },
  { value: 'problems', label: 'Problems' },
];
const REFUSALS = {
  stale: 'This question was edited after you exported it. Export it again.',
  'option-count-changed': 'The AI changed the number of options.',
  'options-reordered': 'The AI reordered the options, which would mark past answers wrong. Ask it to keep their order.',
  'key-not-an-option': 'The answer key matches none of the options.',
  'not-found': "This question doesn't exist any more. The AI may have changed its id.",
  'in-battle': "It's in a running battle. Try again when the battle ends.",
  'needs-key-confirmation': 'A changed key has to be ticked on purpose.',
  'missing-explanation': 'It has no explanation.',
  'unbalanced-math': 'Unbalanced $ in the math.',
};
const refusalWords = (reason) => REFUSALS[reason] || 'It could not be applied.';

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

// Did the numbers move, not just their formatting? An option's slot can stay the
// same while its value changes, which no key check would notice.
const sameNumbers = (a, b) => numbersIn(a).join() === numbersIn(b).join();
const numbersChanged = (before, after) => !sameNumbers(before.text, after.text)
  || after.options.some((o, i) => !sameNumbers(before.options[i], o));

function reviewRow(before, after) {
  const plan = replacePlan(before, after);
  const issues = questionIssues({ ...normalizeGenerated({ ...after, type: before.type, difficulty: before.difficulty || 2 }), type: before.type || 'conceptual', difficulty: before.difficulty || 2 })
    .filter((i) => !/^Has \d+ options|^Type is|^Difficulty is|^Asked for/.test(i));
  const refusal = before.inBattle ? 'in-battle' : plan.refusal;
  const unsure = after.verdict === 'unsure';
  const valuesChanged = !refusal && numbersChanged(before, after);
  return {
    id: before.id, before, after, plan, refusal, issues, unsure, valuesChanged,
    selected: !refusal && !plan.keyChanged && !unsure && !valuesChanged && after.verdict !== 'corrected' && !plan.changesReviewOrder && issues.length === 0,
  };
}

function Side({ title, q, tint }) {
  return (
    <div className="flex flex-col gap-2 min-w-0 rounded-[var(--radius-default)] border border-border p-3" style={tint ? { borderColor: tint } : undefined}>
      <p className="text-eyebrow">{title}</p>
      <div className="text-sm text-textMain math-scroll-mobile min-w-0 [&_p]:!m-0"><LatexRenderer content={q.text} /></div>
      <ul className="flex flex-col gap-1 text-xs min-w-0">
        {q.options.map((o, i) => (
          <li key={i} className={`flex items-center gap-2 min-w-0 ${o === q.answer ? 'font-semibold text-textMain' : 'text-muted2'}`}>
            <span className="font-mono opacity-60 shrink-0">{String.fromCharCode(65 + i)}.</span>
            <span className="min-w-0 flex-1 math-scroll-mobile [&_p]:!m-0"><LatexRenderer content={o} /></span>
            {o === q.answer && <><Check size={13} strokeWidth={2.5} className="shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden="true" /><span className="sr-only">Answer key</span></>}
          </li>
        ))}
      </ul>
      {q.fixedExplanation && (
        <details className="text-xs text-muted2">
          <summary className="cursor-pointer font-medium text-textMain">Explanation</summary>
          <div className="mt-2 leading-relaxed min-w-0"><ExplanationBody text={q.fixedExplanation} /></div>
        </details>
      )}
    </div>
  );
}

function ReplaceRow({ row, index, toggle, disabled }) {
  const { before, after, plan, refusal, issues, unsure, valuesChanged } = row;
  return (
    <li className="bg-bg border border-border rounded-[var(--radius-lg)] p-4 flex gap-3 min-w-0">
      <input type="checkbox" className="mt-1.5 shrink-0" checked={row.selected} disabled={disabled || !!refusal}
        onChange={() => toggle(row.id)} aria-label={`Apply question ${index + 1}`} />
      <div className="min-w-0 flex-1 flex flex-col gap-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          <Badge tone="velocity">{index + 1}</Badge>
          {after.verdict && <Badge tone="neutral">AI says: {after.verdict}</Badge>}
          {plan.keyChanged && <StatusPill tone="danger">Key changes</StatusPill>}
          {plan.stemChanged && <Badge tone="signal">Stem</Badge>}
          {plan.optionsChanged && <Badge tone="signal">Options</Badge>}
          {plan.explanationChanged && <Badge tone="signal">Explanation</Badge>}
          {plan.unchanged && <Badge tone="neutral">No change</Badge>}
        </div>

        {refusal && <p role="alert" className="text-xs" style={{ color: 'var(--accent-danger)' }}>{refusalWords(refusal)}</p>}
        {[...issues, ...(valuesChanged ? ['A number changed in the stem or an option, so this is more than formatting. Check it yourself.'] : []), ...(unsure ? ['The AI is unsure about this one. Read its notes.'] : []), ...(plan.changesReviewOrder ? ['Adding or removing "All of the above" changes the order past reviews show.'] : [])].map((issue) => (
          <p key={issue} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--color-reeAmber-text)' }}><TriangleAlert size={13} strokeWidth={1.75} aria-hidden="true" />{issue}</p>
        ))}
        {plan.keyChanged && !refusal && (
          <p className="text-xs" style={{ color: 'var(--accent-danger)' }}>
            Ticking this regrades {plural(before.recorded || 0, 'past answer')}{before.unrecorded ? `; ${before.unrecorded} more stored no option and can't be regraded` : ''}. Solve it yourself before you accept it.
          </p>
        )}
        {after.notes && <p className="text-xs text-muted2 [overflow-wrap:anywhere]"><span className="font-semibold text-textMain">AI's notes:</span> {after.notes}</p>}

        {!plan.unchanged && (
          <Grid kind="pair" gap="sm">
            <Side title="Now" q={before} />
            <Side title="After" q={after} tint="color-mix(in srgb, var(--accent) 40%, transparent)" />
          </Grid>
        )}
      </div>
    </li>
  );
}

export default function FixWithAI({ onSaved }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const [subject, setSubject] = useState('EE');
  const [topic, setTopic] = useState('All');
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState(10);
  const [onlyUnchecked, setOnlyUnchecked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(null); // { key, items, total, checked }
  const [copied, setCopied] = useState(false);
  const [reply, setReply] = useState('');
  const [problems, setProblems] = useState([]);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [reading, setReading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [undo, setUndo] = useState(null);

  // A change of filter means a new export: what's loaded only stands for its own.
  const filterKey = JSON.stringify([subject, topic, search, batch, onlyUnchecked]);
  const exported = loaded?.key === filterKey ? loaded : null;

  const prompt = useMemo(() => (exported?.items.length ? buildFixPrompt(exported.items.map(toExchangeBlock)) : ''), [exported]);
  const selected = rows.filter((r) => r.selected);
  const selectedKeys = selected.filter((r) => r.plan.keyChanged).length;
  const shown = rows.filter((r) => {
    if (filter === 'key') return r.plan.keyChanged;
    if (filter === 'other') return !r.plan.keyChanged && !r.plan.unchanged;
    if (filter === 'problems') return r.refusal || r.issues.length || r.unsure || r.valuesChanged;
    return true;
  });

  const load = async () => {
    setLoading(true);
    try {
      setLoaded({ key: filterKey, ...await fetchQuestionsForChecking({ subject, subtopic: topic, search, unchecked: onlyUnchecked, limit: batch }) });
      setCopied(false);
    } catch (err) {
      toast.error(err.message || "Couldn't load the questions.");
    } finally { setLoading(false); }
  };

  const copyPrompt = async () => {
    if (await copyText(prompt)) { setCopied(true); toast.success('Copied. Paste it into the other AI.'); }
    else toast.error("Couldn't copy. Select the text and copy it by hand.");
  };

  const readReply = async () => {
    const parsed = parseExchange(reply);
    const fixes = parsed.questions.map(normalizeGenerated).filter((q) => q.id);
    const notes = [...parsed.problems];
    if (parsed.questions.length > fixes.length) notes.push(`${plural(parsed.questions.length - fixes.length, 'question')} had no id, so ${parsed.questions.length - fixes.length === 1 ? 'it was' : 'they were'} left out. New questions belong in Import from another AI.`);
    setProblems(notes);
    if (!fixes.length) return;
    setReading(true);
    try {
      const { items } = await previewReplacements(fixes.map((q) => q.id));
      const byId = new Map(items.map((q) => [q.id, q]));
      const missing = fixes.filter((q) => !byId.has(q.id)).length;
      if (missing) notes.push(`${plural(missing, 'question')} no longer exist${missing === 1 ? 's' : ''}, or the AI changed the id.`);
      setProblems([...notes]);
      setRows(fixes.filter((q) => byId.has(q.id)).map((q) => reviewRow(byId.get(q.id), q)));
      setReply('');
      setUndo(null);
      setFilter('all');
    } catch (err) {
      toast.error(err.message || "Couldn't read the questions.");
    } finally { setReading(false); }
  };

  const apply = async () => {
    setApplying(true);
    const toastId = toast.loading(`Applying ${selected.length}…`);
    const rest = rows.filter((r) => !r.selected);
    const undoBlocks = [];
    let done = 0;
    for (let i = 0; i < selected.length; i += CHUNK) {
      const chunk = selected.slice(i, i + CHUNK);
      try {
        const res = await replaceQuestions(chunk.map(({ after, plan }) => ({
          id: after.id, hash: after.hash, text: after.text, options: after.options, answer: after.answer, fixedExplanation: after.fixedExplanation,
          ...(plan.keyChanged ? { confirmKeyChange: true } : {}),
        })));
        done += res.applied.length;
        for (const a of res.applied) {
          const row = chunk.find((r) => r.id === a.id);
          if (!a.unchanged) undoBlocks.push(toExchangeBlock({ ...row.before, hash: a.hash }));
        }
        for (const s of res.skipped) {
          const row = chunk.find((r) => r.id === s.id);
          if (row) rest.push({ ...row, selected: false, refusal: s.reason });
        }
      } catch (err) {
        rest.push(...chunk);
        toast.error(err.message || "A group couldn't be applied. It's still here.");
      }
    }
    setRows(rest);
    setApplying(false);
    if (undoBlocks.length) setUndo(undoBlocks.join('\n\n'));
    const left = rest.length ? ` · ${rest.length} still here` : '';
    toast.success(`${plural(done, 'question')} updated${left}.`, { id: toastId });
    if (done) { setLoaded(null); onSaved?.(); }
  };

  const copyUndo = async () => {
    if (await copyText(undo)) toast.success('Copied. Paste it in step 3 to put these questions back.');
    else toast.error("Couldn't copy it.");
  };

  const toggle = (id) => setRows((list) => list.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)));

  return (
    <Card as="section" elevated padding="md" className="@container flex flex-col gap-6" aria-labelledby="fix-title">
      <header className="flex flex-col gap-1">
        <h3 id="fix-title" className="text-h3 text-textMain flex items-center gap-2">
          <Wrench size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--color-reeAmber-text)' }} /> Fix questions with another AI
        </h3>
        <p className="text-xs text-muted2">
          Have Claude, ChatGPT or Gemini check live questions, verify the answers and rewrite the explanations. You compare each one before it changes. An AI can be wrong too: for a second opinion, run the same set through another one.
        </p>
      </header>

      <section aria-label="Step 1: choose questions" className="flex flex-col gap-4 min-w-0">
        <p className="text-eyebrow">1 · Choose questions</p>
        <Grid kind="kpi" gap="sm" className="items-end">
          <FormField label="Subject">
            <Select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic('All'); }}>
              <option value="All">All subjects</option>
              {Object.keys(dynamicTOS || {}).map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Topic">
            <Select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={subject === 'All'}>
              <option value="All">All topics</option>
              {(dynamicTOS?.[subject] || []).map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormField>
          <FormField label="Search">
            <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Words, or an ID" />
          </FormField>
          <FormField label="How many at a time">
            <Select value={batch} onChange={(e) => setBatch(Number(e.target.value))}>
              {BATCHES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </FormField>
        </Grid>
        <label className="flex items-center gap-2 text-sm text-textMain cursor-pointer select-none">
          <input type="checkbox" checked={onlyUnchecked} onChange={(e) => setOnlyUnchecked(e.target.checked)} />
          Not checked yet
        </label>
        <Button variant="secondary" onClick={load} loading={loading} disabled={loading} className="self-start">Load questions</Button>
        {exported && (
          <div className="flex flex-col gap-2">
            <ProgressIndicator value={exported.checked} max={exported.total || 1} label={`Checked ${exported.checked.toLocaleString()} of ${exported.total.toLocaleString()}`} />
            {exported.items.length === 0 && <p className="text-sm text-muted2">Nothing left here to check.</p>}
          </div>
        )}
      </section>

      {prompt && (
        <section aria-label="Step 2: copy into the other AI" className="flex flex-col gap-3 min-w-0">
          <p className="text-eyebrow">2 · Copy into the other AI · {plural(exported.items.length, 'question')}, most answered first</p>
          <FormField label="Prompt and questions">
            <Textarea value={prompt} readOnly rows={7} className="font-mono text-xs" />
          </FormField>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={copyPrompt}>
              {copied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.75} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
            </Button>
            {canDownloadFiles() && (
              <Button variant="secondary" onClick={() => downloadBlob(new Blob([prompt], { type: 'text/plain' }), 'questions-to-check.txt')}>
                <Download size={15} strokeWidth={1.75} aria-hidden="true" /> Download
              </Button>
            )}
            {APPS.map((app) => (
              <Button key={app.name} as="a" size="sm" variant="ghost" href={app.href} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> {app.name}
              </Button>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Step 3: paste the reply" className="flex flex-col gap-3 min-w-0">
        <p className="text-eyebrow">3 · Paste its reply</p>
        <FormField label="The AI's corrected questions" hint="Use the copy button on its code block, so the LaTeX comes across as written.">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} className="!min-h-28 font-mono text-xs" placeholder="===QUESTION===" />
        </FormField>
        <Button variant="secondary" onClick={readReply} loading={reading} disabled={reading || !reply.trim()} className="self-start">Compare with the live questions</Button>
        {problems.map((p) => <p key={p} role="alert" className="text-xs" style={{ color: 'var(--accent-danger)' }}>{p}</p>)}
      </section>

      {undo && (
        <section aria-label="Undo" className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between rounded-[var(--radius-default)] border border-border bg-bg px-4 py-3">
          <p className="text-sm text-textMain">Applied. To undo, copy these questions as they were, then paste them in step 3.</p>
          <Button size="sm" variant="secondary" onClick={copyUndo}><Copy size={14} strokeWidth={1.75} aria-hidden="true" /> Copy the old versions</Button>
        </section>
      )}

      {rows.length > 0 && (
        <section aria-label="Step 4: compare and apply" className="flex flex-col gap-4 border-t border-border pt-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div>
              <p className="text-eyebrow">4 · Compare and apply</p>
              <p className="text-sm text-textMain mt-1">
                <span className="font-semibold">{plural(rows.length, 'question')}</span>
                <span className="text-muted2"> · {selected.length} ticked{selectedKeys ? ` · ${plural(selectedKeys, 'key change')} ticked` : ''}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" tone="danger" onClick={() => setRows([])} disabled={applying}>Discard all</Button>
              <Button onClick={apply} loading={applying} disabled={applying || selected.length === 0}>Apply {selected.length}</Button>
            </div>
          </div>
          <SegmentedControl label="Show" size="sm" value={filter} onChange={setFilter} options={FILTERS} columns={4} />
          {shown.length === 0
            ? <p className="text-sm text-muted2">None here.</p>
            : (
              <ol className="flex flex-col gap-3">
                {shown.map((row) => <ReplaceRow key={row.id} row={row} index={rows.indexOf(row)} toggle={toggle} disabled={applying} />)}
              </ol>
            )}
        </section>
      )}
    </Card>
  );
}
