// Admin › Assigned exams › New exam (or Edit): pick questions from the bank,
// name the exam, set its time, save it as a draft or publish it for every
// learner. Two panes side by side on wide screens; on a phone one at a time,
// switched by "Bank" / "Your exam". Each learner gets their own order of
// questions and choices, so there is no reordering here.
import { useEffect, useId, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { normalizeSubject, toDisplaySubject } from '@ree/shared';
import { useStore } from '../../../store/useStore';
import {
  Badge, Button, Card, EmptyState, FormField, Input, SectionHeader, SegmentedControl, Select, Skeleton,
  StatusPill, StickyToolbar, Textarea,
} from '../../../components/ui';
import { Check, ChevronLeft, Shuffle, Trash2 } from '../../../components/ui/icons';
import LatexRenderer from '../../../components/LatexRenderer';
import ExplanationBody from '../../quiz/ExplanationBody';
import { fetchPaginatedQuestions, fetchVaultQuestions } from '../../../services/dbQueries';
import { difficultyOf, difficultyTone } from '../../library/difficulty';
import { plainError } from '../../shared-quizzes/quizFilesApi';
import { getAdminExam, saveAdminExam } from '../assignedExamsApi';
import { EXAM_KINDS, fromLocalInput, MAX_ITEMS, MAX_MINUTES, MIN_ITEMS, paceMinutes, subjectMix, toLocalInput } from '../examMath';

const PAGE = 30;
const RANDOM_SIZES = [10, 25, 50, 100];
const letter = (i) => String.fromCharCode(65 + i);

function Choices({ q }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Button size="sm" variant="ghost" className="self-start -ml-2" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide choices' : 'Show choices'}
      </Button>
      {open && (
      <div id={id} className="text-sm">
      <ol className="flex flex-col gap-1.5">
        {(q.options || []).map((option, i) => {
          const isKey = option === q.answer;
          return (
            <li key={`${i}-${option}`} className="flex gap-2 items-start min-w-0">
              <span className="font-mono text-xs text-muted2 pt-0.5">{letter(i)}</span>
              <div className="min-w-0 flex-1 math-scroll-mobile"><LatexRenderer content={option} /></div>
              {isKey && <StatusPill dot={false} tone="success"><Check size={12} strokeWidth={2.5} aria-hidden="true" /> Key</StatusPill>}
            </li>
          );
        })}
      </ol>
      {q.fixedExplanation && <div className="mt-3 text-muted2"><ExplanationBody text={q.fixedExplanation} /></div>}
      </div>
      )}
    </div>
  );
}

function QuestionMeta({ q }) {
  const diff = difficultyOf(q);
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
      <Badge tone="signal">{toDisplaySubject(normalizeSubject(q.subject))}</Badge>
      <span className="text-xs font-bold text-textMain truncate max-w-full">{q.subtopic || 'Uncategorized'}</span>
      <StatusPill dot={false} tone={difficultyTone(diff)}>{diff.toLowerCase()}</StatusPill>
      {q.isFlagged && <StatusPill tone="danger">Reported</StatusPill>}
    </div>
  );
}

function BankRow({ q, picked, full, onToggle }) {
  return (
    <li>
      <Card variant="inset" padding="sm" className="flex gap-3 items-start">
        <label className="flex items-start pt-0.5 pointer-coarse:min-h-11 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
            checked={picked}
            disabled={!picked && full}
            onChange={() => onToggle(q)}
            aria-label={`Pick: ${String(q.text || '').slice(0, 60)}`}
          />
        </label>
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <QuestionMeta q={q} />
          <div className="text-sm text-textMain leading-relaxed math-scroll-mobile min-w-0 break-words"><LatexRenderer content={q.text} /></div>
          <Choices q={q} />
        </div>
      </Card>
    </li>
  );
}

function PickedRow({ q, index, onRemove }) {
  return (
    <li>
      <Card variant="inset" padding="sm" className="flex gap-3 items-start">
        <span className="font-mono text-xs text-muted2 pt-1 tabular-nums w-6 shrink-0 text-right">{index + 1}</span>
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <QuestionMeta q={q} />
          <div className="text-sm text-textMain leading-relaxed line-clamp-3 min-w-0 break-words"><LatexRenderer content={q.text} /></div>
        </div>
        <Button size="sm" variant="ghost" tone="danger" onClick={() => onRemove(q)} aria-label={`Remove question ${index + 1}`}>
          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </Card>
    </li>
  );
}

/** The bank, filtered by subject, topic and words, a page at a time. */
function useBank(subject, topic, search) {
  const [state, setState] = useState({ key: null, items: [], next: null, more: false, error: '' });
  const [loadingMore, setLoadingMore] = useState(false);
  const key = `${subject}|${topic}|${search}`;
  useEffect(() => {
    let live = true;
    fetchPaginatedQuestions(null, subject, topic, PAGE, 'recent', search).then(
      ({ items, nextOffset }) => { if (live) setState({ key, items, next: nextOffset, more: items.length === PAGE, error: '' }); },
      (err) => { if (live) setState({ key, items: [], next: null, more: false, error: plainError(err) }); },
    );
    return () => { live = false; };
  }, [key, subject, topic, search]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { items, nextOffset } = await fetchPaginatedQuestions(state.next, subject, topic, PAGE, 'recent', search);
      setState((s) => ({ ...s, items: [...s.items, ...items], next: nextOffset, more: items.length === PAGE }));
    } catch (err) {
      toast.error(plainError(err));
    }
    setLoadingMore(false);
  };
  return { ...state, loading: state.key !== key, loadingMore, loadMore };
}

export default function ExamBuilder({ examId = null, onDone }) {
  const dynamicTOS = useStore((s) => s.dynamicTOS) || {};
  const [loading, setLoading] = useState(!!examId);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', minutes: '', opensAt: '', closesAt: '' });
  const [picked, setPicked] = useState([]);
  const [status, setStatus] = useState('draft');
  const [kind, setKind] = useState('exam');
  const [missing, setMissing] = useState(0);
  const [takers, setTakers] = useState(0);
  const [saving, setSaving] = useState(null);
  const [view, setView] = useState('bank');

  const [subject, setSubject] = useState('All');
  const [topic, setTopic] = useState('All');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 350);
    return () => clearTimeout(t);
  }, [searchDraft]);
  const bank = useBank(subject, topic, search);

  useEffect(() => {
    if (!examId) return undefined;
    let live = true;
    getAdminExam(examId).then(
      (item) => {
        if (!live) return;
        setForm({
          title: item.title,
          description: item.description || '',
          minutes: String(Math.round(item.timeLimitSecs / 60)),
          opensAt: toLocalInput(item.opensAt),
          closesAt: toLocalInput(item.closesAt),
        });
        setPicked(item.questions || []);
        setStatus(item.status);
        setKind(item.kind || 'exam');
        setMissing(item.missing || 0);
        setTakers(item.takers || 0);
        setLoading(false);
      },
      (err) => { if (live) { setLoadError(plainError(err)); setLoading(false); } },
    );
    return () => { live = false; };
  }, [examId]);

  const pickedIds = useMemo(() => new Set(picked.map((q) => q.id)), [picked]);
  const full = picked.length >= MAX_ITEMS;
  const autoMinutes = paceMinutes(picked);
  const minutes = form.minutes === '' ? autoMinutes : Number(form.minutes);

  const toggle = (q) => setPicked((prev) => (
    prev.some((p) => p.id === q.id) ? prev.filter((p) => p.id !== q.id) : (prev.length >= MAX_ITEMS ? prev : [...prev, q])
  ));

  const [addingRandom, setAddingRandom] = useState(false);
  const [randomSize, setRandomSize] = useState(RANDOM_SIZES[0]);
  const addRandom = async () => {
    setAddingRandom(true);
    try {
      const pool = await fetchVaultQuestions(subject, topic, randomSize * 3, 'random');
      const fresh = (pool || []).filter((q) => !pickedIds.has(q.id)).slice(0, Math.min(randomSize, MAX_ITEMS - picked.length));
      if (fresh.length === 0) toast('Every question here is already in the exam.');
      else {
        setPicked((prev) => [...prev, ...fresh]);
        toast.success(`Added ${fresh.length} at random.`);
      }
    } catch (err) {
      toast.error(plainError(err));
    }
    setAddingRandom(false);
  };

  const problem = !form.title.trim() ? 'Give the exam a title.'
    : picked.length < MIN_ITEMS ? 'Pick at least one question.'
      : !(minutes >= 1 && minutes <= MAX_MINUTES) ? `Set a time between 1 and ${MAX_MINUTES} minutes (24 hours).`
        : form.opensAt && form.closesAt && new Date(form.closesAt) <= new Date(form.opensAt) ? 'It has to close after it opens.'
          : null;

  const save = async (nextStatus) => {
    if (problem) { toast.error(problem); return; }
    setSaving(nextStatus);
    try {
      const saved = await saveAdminExam(examId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        questionIds: picked.map((q) => q.id),
        timeLimitSecs: Math.round(minutes * 60),
        status: nextStatus,
        kind,
        opensAt: fromLocalInput(form.opensAt),
        closesAt: fromLocalInput(form.closesAt),
      });
      toast.success(nextStatus === 'published' ? (status === 'published' ? 'Changes saved.' : 'Published for every learner.') : 'Draft saved.');
      onDone(saved);
    } catch (err) {
      toast.error(plainError(err));
      setSaving(null);
    }
  };

  if (loading) return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;
  if (loadError) {
    return (
      <EmptyState
        title="Couldn’t open that exam"
        description={loadError}
        action={<Button variant="secondary" onClick={() => onDone(null)}>Back to assigned exams</Button>}
      />
    );
  }

  const subjects = Object.keys(dynamicTOS);
  const topics = subject !== 'All' ? (dynamicTOS[subject] || []) : [];
  const published = status === 'published';

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title={examId ? 'Edit exam' : 'New exam'}
        description="Pick questions from the bank. Each learner gets their own order of questions and choices; answers and explanations show after they submit."
        actions={(
          <Button variant="ghost" size="sm" onClick={() => onDone(null)}>
            <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" /> All assigned exams
          </Button>
        )}
      />

      <StickyToolbar role="region" aria-label="Save this exam">
        <span className="text-sm text-textMain tabular-nums" aria-live="polite">
          {picked.length} picked · up to {MAX_ITEMS}
        </span>
        <div className="flex flex-wrap gap-2">
          {!published && (
            <Button size="sm" variant="secondary" onClick={() => save('draft')} loading={saving === 'draft'} disabled={!!saving}>Save draft</Button>
          )}
          <Button size="sm" onClick={() => save('published')} loading={saving === 'published'} disabled={!!saving}>
            {published ? 'Save changes' : 'Publish'}
          </Button>
        </div>
      </StickyToolbar>

      {takers > 0 && (
        <p className="text-sm text-textMain">
          <StatusPill tone="amber">{takers} took it</StatusPill>{' '}
          Changes apply to new sittings. The results so far stay as they were taken.
        </p>
      )}

      {missing > 0 && (
        <p role="status" className="text-sm text-textMain">
          <StatusPill tone="amber">{missing} removed from the bank</StatusPill>{' '}
          {missing === 1 ? 'A question was' : `${missing} questions were`} deleted from the bank after you picked {missing === 1 ? 'it' : 'them'}. Saving leaves {missing === 1 ? 'it' : 'them'} out.
        </p>
      )}

      <div className="lg:hidden">
        <SegmentedControl
          label="Show"
          fullWidth
          value={view}
          onChange={setView}
          options={[{ value: 'bank', label: 'Bank' }, { value: 'exam', label: `Your exam · ${picked.length}` }]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
        <div className={view === 'bank' ? 'min-w-0' : 'min-w-0 max-lg:hidden'}>
          <section aria-labelledby="exam-bank" className="flex flex-col gap-3 min-w-0">
            <h3 id="exam-bank" className="text-eyebrow text-muted2">Question bank</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Subject">
                <Select value={subject} onChange={(e) => { setSubject(e.target.value); setTopic('All'); }}>
                  <option value="All">All subjects</option>
                  {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </FormField>
              <FormField label="Topic">
                <Select value={topic} onChange={(e) => setTopic(e.target.value)} disabled={subject === 'All'}>
                  <option value="All">All topics</option>
                  {topics.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Search" hint="Words in the question, or its id.">
              <Input type="search" value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} placeholder="e.g. synchronous motor" />
            </FormField>
            <div className="flex flex-wrap items-end gap-2">
              <FormField label="At random" className="w-28">
                <Select value={randomSize} onChange={(e) => setRandomSize(Number(e.target.value))}>
                  {RANDOM_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </Select>
              </FormField>
              <Button variant="secondary" onClick={addRandom} loading={addingRandom} disabled={addingRandom || full}>
                <Shuffle size={14} strokeWidth={1.75} aria-hidden="true" /> Add {randomSize} at random
              </Button>
            </div>

            {bank.loading ? (
              <div className="flex flex-col gap-2"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
            ) : bank.error ? (
              <EmptyState compact title="Couldn’t load the bank" description={bank.error} />
            ) : bank.items.length === 0 ? (
              <EmptyState compact title="No questions match" description="Try another subject or topic, or fewer words." />
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {bank.items.map((q) => <BankRow key={q.id} q={q} picked={pickedIds.has(q.id)} full={full} onToggle={toggle} />)}
                </ul>
                {bank.more && (
                  <Button variant="secondary" size="sm" className="self-center" onClick={bank.loadMore} loading={bank.loadingMore} disabled={bank.loadingMore}>
                    Load more
                  </Button>
                )}
              </>
            )}
          </section>
        </div>

        <div className={view === 'exam' ? 'min-w-0' : 'min-w-0 max-lg:hidden'}>
          <section aria-labelledby="exam-own" className="flex flex-col gap-3 min-w-0">
            <h3 id="exam-own" className="text-eyebrow text-muted2">Your exam</h3>
            <p className="text-label -mb-1" aria-hidden="true">Type</p>
            <SegmentedControl
              label="Type"
              size="sm"
              fullWidth
              columns={2}
              value={kind}
              onChange={setKind}
              options={EXAM_KINDS.map((k) => ({ value: k.value, label: k.label }))}
            />
            <FormField label="Title" required>
              <Input value={form.title} maxLength={120} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </FormField>
            <FormField label="Note for learners" hint="Optional. What it covers, or when to take it.">
              <Textarea rows={2} value={form.description} maxLength={500} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </FormField>
            <FormField label="Time (minutes)" hint={`The board’s pace for these questions is ${autoMinutes} min.`}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_MINUTES}
                className="max-w-32"
                value={form.minutes === '' ? String(autoMinutes) : form.minutes}
                onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))}
              />
            </FormField>
            <fieldset className="flex flex-col gap-2 min-w-0">
              <legend className="text-label mb-1">When learners can take it</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Opens">
                  <Input type="datetime-local" value={form.opensAt} onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value }))} />
                </FormField>
                <FormField label="Closes">
                  <Input type="datetime-local" value={form.closesAt} min={form.opensAt || undefined} onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value }))} />
                </FormField>
              </div>
              <p className="text-xs text-muted2">Leave either empty for no limit. Learners see it before it opens and after it closes, but can only start it in between; a sitting started before it closes still counts. Lock it from the list to stop it at any time.</p>
            </fieldset>
            {picked.length > 0 && <p className="text-sm text-muted2">{subjectMix(picked)}</p>}
            {picked.length === 0 ? (
              <EmptyState compact title="No questions yet" description="Tick questions in the bank, or add some at random." />
            ) : (
              <ol className="flex flex-col gap-2">
                {picked.map((q, i) => <PickedRow key={q.id} q={q} index={i} onRemove={toggle} />)}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
