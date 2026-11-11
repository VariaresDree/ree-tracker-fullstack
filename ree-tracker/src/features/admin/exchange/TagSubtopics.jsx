import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, FormField, ProgressIndicator, Select, Textarea } from '../../../components/ui';
import { Check, Copy, Layers, Sparkles, Square, Trash2 } from '../../../components/ui/icons';
import LatexRenderer from '../../../components/LatexRenderer';
import AiStatusNote from '../../../components/AiStatusNote';
import { apiRequest } from '../../../services/dbQueries';
import { callAITask, parseAiJson } from '../../../services/geminiApi';
import { copyText } from '../../exam-export/deliver';
import { TAG_BATCH, TAG_SYSTEM, buildTagPrompt, readTagReply, splitTags } from './subtopicTags';

const SUBJECTS = ['EE', 'ESAS', 'Mathematics'];
const REVIEW_PAGE = 25;
const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const plural = (n, noun) => `${n.toLocaleString()} ${noun}${n === 1 ? '' : 's'}`;

const fetchOverview = (subject) => apiRequest(`/api/questions/tagging-overview?subject=${encodeURIComponent(subject)}`, 'GET', null, { timeoutMs: 30_000 });
const fetchPage = (topicId, offset) => apiRequest(`/api/questions/for-tagging?${new URLSearchParams({ topicId, limit: TAG_BATCH, offset })}`, 'GET', null, { timeoutMs: 30_000 });
const saveTags = (items) => apiRequest('/api/questions/tag-bulk', 'POST', { items }, { timeoutMs: 30_000, idempotencyKey: newKey() });
const clearTopic = (topicId) => apiRequest('/api/questions/tag-clear', 'POST', { topicId }, { timeoutMs: 30_000, idempotencyKey: newKey() });

function guessLine(row) {
  if (!row.guess) return 'AI: none of these';
  if (!row.subtopicId) return `AI named one not on the list: ${row.guess}`;
  return `AI: ${row.guess} · not sure`;
}

function ReviewRow({ row, subtopics, onSave, onSkip, busy }) {
  const [pick, setPick] = useState(row.subtopicId || '');
  return (
    <li className="bg-bg border border-border rounded-[var(--radius-lg)] p-4 flex flex-col gap-3 min-w-0">
      <div className="text-sm text-textMain math-scroll-mobile min-w-0 line-clamp-4 [&_p]:!m-0"><LatexRenderer content={row.text} /></div>
      <div className="flex flex-wrap items-end gap-2">
        <Badge tone="neutral">{guessLine(row)}</Badge>
        <FormField label="Subtopic" className="min-w-0 flex-1 basis-56">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} disabled={busy}>
            <option value="">Choose…</option>
            {subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </FormField>
        <Button size="sm" onClick={() => onSave(row, pick)} disabled={busy || !pick}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => onSkip(row)} disabled={busy}>Skip</Button>
      </div>
    </li>
  );
}

export default function TagSubtopics() {
  const [subject, setSubject] = useState('EE');
  const [topics, setTopics] = useState(null);
  const [topicId, setTopicId] = useState('');
  const [subtopics, setSubtopics] = useState([]);
  const [progress, setProgress] = useState(null); // { total, tagged }
  const [review, setReview] = useState([]); // rows waiting for the admin, this topic
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shownReview, setShownReview] = useState(REVIEW_PAGE);
  const [pastePage, setPastePage] = useState(null); // a batch waiting on another AI
  const [reply, setReply] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const stop = useRef(false);
  // Untagged questions already looked at (waiting below, or skipped). They stay
  // first in the untagged list, so the next batch starts after them. A ref, as
  // a save in the list mid-run must move the next batch's start at once.
  const left = useRef(0);

  const topic = topics?.find((t) => t.id === topicId) || null;

  const [overviewKey, setOverviewKey] = useState(0);
  const loadOverview = () => setOverviewKey((k) => k + 1);
  useEffect(() => {
    let live = true;
    fetchOverview(subject)
      .then((r) => { if (live) setTopics(r.topics); })
      .catch((err) => toast.error(err.message || "Couldn't load the topics."));
    return () => { live = false; };
  }, [subject, overviewKey]);

  const pickTopic = (id) => {
    setTopicId(id);
    setReview([]);
    left.current = 0;
    setShownReview(REVIEW_PAGE);
    setPastePage(null);
    setReply('');
    setConfirmClear(false);
    const t = topics?.find((x) => x.id === id);
    setProgress(t ? { total: t.total, tagged: t.tagged } : null);
    setSubtopics([]);
  };

  const nextPage = async (from) => {
    const page = await fetchPage(topicId, from);
    setSubtopics(page.subtopics);
    setProgress({ total: page.total, tagged: page.tagged });
    return page;
  };

  /** Saves the sure picks and queues the rest; returns how many it saved. */
  const takeReply = async (page, parsed) => {
    const read = readTagReply(parsed, page.items, page.subtopics);
    const { apply, review: unsure } = splitTags(read);
    let saved = 0;
    let unsaved = 0; // allowed but not written (moved topic meanwhile): still untagged
    if (apply.length) {
      const res = await saveTags(apply);
      saved = res.saved;
      const refused = new Set(res.refused.map((r) => r.id));
      unsure.push(...read.filter((r) => refused.has(r.id)).map((r) => ({ ...r, sure: false })));
      unsaved = Math.max(0, apply.length - refused.size - saved);
    }
    const textOf = new Map(page.items.map((q) => [q.id, q.text]));
    left.current += unsure.length + unsaved;
    setReview((list) => [...list, ...unsure.map((r) => ({ ...r, text: textOf.get(r.id) }))]);
    setProgress((p) => p && { ...p, tagged: p.tagged + saved });
    return { saved, unsure: unsure.length };
  };

  const run = async () => {
    stop.current = false;
    setRunning(true);
    let savedAll = 0;
    try {
      while (!stop.current) {
        const page = await nextPage(left.current);
        if (!page.items.length) { toast.success('Every question in this topic has been looked at.'); break; }
        const res = await callAITask('classify', buildTagPrompt({ subject: page.topic.subject, topic: page.topic.name, subtopics: page.subtopics, items: page.items }), { system: TAG_SYSTEM, json: true, temperature: 0 });
        const { saved } = await takeReply(page, parseAiJson(res.text));
        savedAll += saved;
        if (page.items.length < TAG_BATCH) { toast.success('Every question in this topic has been looked at.'); break; }
      }
    } catch (err) {
      toast.error(`${err.message || 'The AI run stopped.'} Run again to carry on from here.`);
    } finally {
      setRunning(false);
      if (savedAll) toast.success(`${plural(savedAll, 'tag')} saved.`);
      loadOverview();
    }
  };

  const loadForPaste = async () => {
    setBusy(true);
    try {
      const page = await nextPage(left.current);
      if (!page.items.length) toast.success('Every question in this topic has been looked at.');
      setPastePage(page.items.length ? page : null);
      setCopied(false);
    } catch (err) {
      toast.error(err.message || "Couldn't load the questions.");
    } finally { setBusy(false); }
  };

  const pastePrompt = useMemo(() => (pastePage
    ? `${TAG_SYSTEM}\n\n${buildTagPrompt({ subject: pastePage.topic.subject, topic: pastePage.topic.name, subtopics: pastePage.subtopics, items: pastePage.items })}`
    : ''), [pastePage]);

  const copyPrompt = async () => {
    if (await copyText(pastePrompt)) { setCopied(true); toast.success('Copied. Paste it into the other AI.'); }
    else toast.error("Couldn't copy. Select the text and copy it by hand.");
  };

  const readPasted = async () => {
    let parsed;
    try { parsed = parseAiJson(reply); } catch (err) { toast.error(err.message); return; }
    setBusy(true);
    try {
      const { saved, unsure } = await takeReply(pastePage, parsed);
      toast.success(`${plural(saved, 'tag')} saved · ${unsure} to review.`);
      setPastePage(null);
      setReply('');
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Nothing was saved. Try again.');
    } finally { setBusy(false); }
  };

  const saveOne = async (row, subtopicId) => {
    setBusy(true);
    try {
      const res = await saveTags([{ id: row.id, subtopicId }]);
      if (res.refused.length) { toast.error("That subtopic isn't in this question's topic any more."); return; }
      left.current -= 1;
      setReview((list) => list.filter((r) => r.id !== row.id));
      setProgress((p) => p && { ...p, tagged: p.tagged + res.saved });
    } catch (err) {
      toast.error(err.message || 'Nothing was saved. Try again.');
    } finally { setBusy(false); }
  };

  // Still untagged, so it still counts in left.
  const skipOne = (row) => setReview((list) => list.filter((r) => r.id !== row.id));

  const clear = async () => {
    setBusy(true);
    try {
      const { cleared } = await clearTopic(topicId);
      toast.success(`${plural(cleared, 'tag')} cleared.`);
      setReview([]);
      left.current = 0;
      setProgress((p) => p && { ...p, tagged: 0 });
      loadOverview();
    } catch (err) {
      toast.error(err.message || 'Nothing was cleared. Try again.');
    } finally { setBusy(false); setConfirmClear(false); }
  };

  const locked = running || busy;

  return (
    <Card as="section" elevated padding="md" className="@container flex flex-col gap-6" aria-labelledby="tag-title">
      <header className="flex flex-col gap-1">
        <h3 id="tag-title" className="text-h3 text-textMain flex items-center gap-2">
          <Layers size={16} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--accent-text)' }} /> Tag subtopics
        </h3>
        <p className="text-xs text-muted2">
          Sort each topic&rsquo;s questions into its subtopics, so learners can drill one. The AI&rsquo;s sure picks save as they come; the rest wait below for you.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Subject" className="basis-40">
          <Select value={subject} onChange={(e) => { setSubject(e.target.value); setTopics(null); pickTopic(''); }} disabled={locked}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="Topic" className="min-w-0 flex-1 basis-64">
          <Select value={topicId} onChange={(e) => pickTopic(e.target.value)} disabled={locked || !topics}>
            <option value="">{topics ? (topics.length ? 'Choose a topic' : 'No topic here has subtopics') : 'Loading…'}</option>
            {(topics || []).map((t) => <option key={t.id} value={t.id}>{t.name} · {t.tagged.toLocaleString()} of {t.total.toLocaleString()} tagged</option>)}
          </Select>
        </FormField>
      </div>

      {topic && progress && (
        <section aria-label={`Tagging ${topic.name}`} className="flex flex-col gap-4 min-w-0">
          <ProgressIndicator value={progress.tagged} max={progress.total || 1} label={`${topic.name} · ${progress.tagged.toLocaleString()} of ${progress.total.toLocaleString()} tagged · ${plural(topic.subtopics, 'subtopic')}`} />
          <div className="flex flex-wrap items-center gap-2">
            {running
              ? <Button variant="secondary" onClick={() => { stop.current = true; }}><Square size={14} strokeWidth={2} aria-hidden="true" /> Stop after this batch</Button>
              : <Button onClick={run} disabled={busy}><Sparkles size={15} strokeWidth={1.75} aria-hidden="true" /> Tag with the in-app AI</Button>}
            <Button variant="secondary" onClick={loadForPaste} disabled={locked || !!pastePage}>Use another AI instead</Button>
            {confirmClear
              ? (
                <>
                  <Button variant="ghost" tone="danger" onClick={clear} disabled={locked}>Clear {plural(progress.tagged, 'tag')}</Button>
                  <Button variant="ghost" onClick={() => setConfirmClear(false)} disabled={busy}>Keep them</Button>
                </>
              )
              : <Button variant="ghost" tone="danger" onClick={() => setConfirmClear(true)} disabled={locked || !progress.tagged}><Trash2 size={14} strokeWidth={1.75} aria-hidden="true" /> Clear this topic&rsquo;s tags</Button>}
          </div>
          {running && <p className="text-sm text-muted2" role="status">Tagging {TAG_BATCH} at a time. You can leave this open and work through the list below.</p>}
          <AiStatusNote task="classify" />

          {pastePage && (
            <section aria-label="Another AI" className="flex flex-col gap-3 min-w-0 border-t border-border pt-4">
              <p className="text-eyebrow">Another AI · {plural(pastePage.items.length, 'question')}</p>
              <FormField label="Prompt and questions">
                <Textarea value={pastePrompt} readOnly rows={6} className="font-mono text-xs" />
              </FormField>
              <Button onClick={copyPrompt} className="self-start">
                {copied ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.75} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}
              </Button>
              <FormField label="Its reply" hint="The JSON it sends back, as it is.">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} className="!min-h-24 font-mono text-xs" placeholder='{"tags": [...]}' />
              </FormField>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={readPasted} disabled={busy || !reply.trim()}>Save the sure ones</Button>
                <Button variant="ghost" onClick={() => setPastePage(null)} disabled={busy}>Cancel</Button>
              </div>
            </section>
          )}

          {review.length > 0 && (
            <section aria-label="To review" className="flex flex-col gap-3 min-w-0 border-t border-border pt-4">
              <p className="text-eyebrow">To review · {review.length.toLocaleString()}</p>
              <p className="text-xs text-muted2">The AI wasn&rsquo;t sure of these. Pick a subtopic, or skip one that fits none.</p>
              <ol className="flex flex-col gap-3">
                {review.slice(0, shownReview).map((row) => (
                  <ReviewRow key={row.id} row={row} subtopics={subtopics} onSave={saveOne} onSkip={skipOne} busy={busy} />
                ))}
              </ol>
              {review.length > shownReview && (
                <Button variant="ghost" onClick={() => setShownReview((n) => n + REVIEW_PAGE)} className="self-start">Show {Math.min(REVIEW_PAGE, review.length - shownReview)} more</Button>
              )}
            </section>
          )}
        </section>
      )}
    </Card>
  );
}
