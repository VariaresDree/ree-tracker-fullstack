// src/features/admin/ai/useQuestionGenerator.js
//
// Admin › Question bank › AI question generator. A run is planned into
// batches (services/aiPrompts planBatches), two batches at a time on the
// accurate model chain, then optionally double-checked by a second model, and
// shown in a preview. Nothing is saved until the admin sends the chosen items
// to the review queue; from there they go live only through approval.
//
// It used to be a fixed five questions written straight into the queue, with
// no say over the type or difficulty, and a "web search" button that only
// added a sentence to the prompt.
import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { generateBoardQuestionBatch, verifyQuestions } from '../../../services/geminiApi';
import { planBatches } from '../../../services/aiPrompts';
import { saveQuestionToBank } from '../../../services/dbQueries';
import { questionIssues, normalizeGenerated } from '../../../utils/questionChecks';
import { labelForGenerated } from '../../../utils/topicLabels';
import { useStore } from '../../../store/useStore';

export const DEFAULT_SPEC = {
  subject: 'EE',
  topic: 'All',
  focus: '',
  count: 10,
  type: 'mixed',
  calcShare: 0.6,
  difficulty: 'board',
  notes: '',
  verify: true,
};

const CONCURRENCY = 2;
const VERIFY_CHUNK = 10;

/** Run async jobs with at most `limit` in flight; results keep their order. */
export async function runPool(jobs, limit, onSettled) {
  const results = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      try {
        results[i] = { ok: true, value: await jobs[i]() };
      } catch (error) {
        results[i] = { ok: false, error };
      }
      onSettled?.(i, results[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return results;
}

const reviewNoteFor = (q) => {
  if (!q.check || q.check.status === 'agrees' || q.check.status === 'unchecked') return undefined;
  const who = q.check.model ? ` (${q.check.model})` : '';
  if (q.check.status === 'disagrees') return `AI answer check${who} picked ${q.check.choice || 'a different option'}; the key may be wrong.${q.check.issue ? ` ${q.check.issue}` : ''}`;
  return `AI answer check${who}: ${q.check.issue}`;
};

export function useQuestionGenerator(onSaved) {
  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [phase, setPhase] = useState('idle'); // idle | generating | checking | review | saving
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });
  const [items, setItems] = useState([]); // { ...question, issues, selected, check? }
  const [runInfo, setRunInfo] = useState(null); // { models, seconds, failed, errors }
  const recent = useRef([]);
  const cancelled = useRef(false);

  const update = useCallback((patch) => setSpec((s) => ({ ...s, ...patch })), []);

  const generate = useCallback(async () => {
    const s = spec;
    const batches = planBatches(s);
    const topics = useStore.getState().dynamicTOS?.[s.subject] || [];
    cancelled.current = false;
    setItems([]);
    setRunInfo(null);
    setProgress({ done: 0, total: batches.length, failed: 0 });
    setPhase('generating');
    const startedAt = Date.now();
    const models = new Set();
    const errors = [];
    let failedBatches = 0;
    let collected = [];

    await runPool(batches.map((batch) => () => generateBoardQuestionBatch({
      subject: s.subject,
      topic: s.topic,
      focus: s.focus.trim() || null,
      notes: s.notes.trim() || null,
      batch,
      topics,
      avoid: [...recent.current, ...collected.map((q) => q.text)],
    })), CONCURRENCY, (i, res) => {
      if (cancelled.current) return;
      if (res.ok) {
        models.add(`${res.value.meta.model} on ${res.value.meta.providerLabel}`);
        const batch = batches[i];
        const fresh = res.value.items.map(normalizeGenerated).map((q) => {
          const expectedType = batch.calculation === batch.size ? 'calculation' : batch.conceptual === batch.size ? 'conceptual' : undefined;
          return {
            ...q,
            subject: s.subject,
            subtopic: labelForGenerated(q.subtopic, { target: s.topic, topics }),
            issues: questionIssues(q, { expectedType }),
          };
        });
        collected = [...collected, ...fresh];
        setItems(collected.map((q) => ({ ...q, selected: q.issues.length === 0 })));
      } else {
        failedBatches += 1;
        errors.push(res.error?.message || 'A batch failed.');
      }
      setProgress((p) => ({ ...p, done: p.done + 1, failed: p.failed + (res.ok ? 0 : 1) }));
    });

    if (cancelled.current) { setPhase('idle'); return; }

    if (!collected.length) {
      setPhase('idle');
      setRunInfo({ models: [], seconds: Math.round((Date.now() - startedAt) / 1000), failed: batches.length, errors });
      toast.error(errors[0] || 'No questions came back. Try again.');
      return;
    }

    let checked = collected;
    if (s.verify) {
      setPhase('checking');
      const chunks = [];
      for (let i = 0; i < collected.length; i += VERIFY_CHUNK) chunks.push(collected.slice(i, i + VERIFY_CHUNK));
      const results = await runPool(chunks.map((c) => () => verifyQuestions(c)), CONCURRENCY);
      if (cancelled.current) { setPhase('idle'); return; }
      checked = results.flatMap((r, i) => (r.ok ? r.value : chunks[i].map((q) => ({ ...q, check: { status: 'unchecked' } }))));
      if (results.some((r) => !r.ok)) errors.push('The answer check could not run on some items.');
    }

    recent.current = [...recent.current, ...checked.map((q) => q.text)].slice(-40);
    setItems(checked.map((q) => ({
      ...q,
      // A disagreement with the checker leaves the item unticked: the reviewer
      // looks at it before deciding.
      selected: q.issues.length === 0 && q.check?.status !== 'disagrees',
    })));
    setRunInfo({
      models: [...models],
      seconds: Math.round((Date.now() - startedAt) / 1000),
      failed: failedBatches,
      errors,
    });
    setPhase('review');
  }, [spec]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    setPhase('idle');
  }, []);

  const toggle = useCallback((index) => {
    setItems((list) => list.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q)));
  }, []);

  const remove = useCallback((index) => {
    setItems((list) => list.filter((_, i) => i !== index));
  }, []);

  const discard = useCallback(() => {
    setItems([]);
    setRunInfo(null);
    setPhase('idle');
  }, []);

  const save = useCallback(async (currentUser) => {
    const chosen = items.filter((q) => q.selected);
    if (!chosen.length) { toast.error('Tick at least one question to send.'); return; }
    setPhase('saving');
    const toastId = toast.loading(`Sending ${chosen.length} to the review queue…`);
    let saved = 0;
    const failed = [];
    for (const q of chosen) {
      try {
        await saveQuestionToBank({
          subject: q.subject,
          subtopic: q.subtopic,
          text: q.text,
          options: q.options,
          answer: q.answer,
          fixedExplanation: q.fixedExplanation || null,
          type: q.type,
          difficulty: q.difficulty,
          difficultyTier: q.difficulty,
          bloomLevel: q.type === 'calculation' ? 'APPLY' : 'UNDERSTAND',
          source: 'ai',
          status: 'quarantined',
          reviewNote: reviewNoteFor(q),
          uploadedBy: currentUser?.uid || 'system',
        });
        saved += 1;
      } catch {
        failed.push(q);
      }
    }
    if (failed.length) {
      toast.error(`${saved} sent; ${failed.length} failed. They're still here to retry.`, { id: toastId });
      setItems((list) => list.filter((q) => !q.selected || failed.includes(q)));
      setPhase('review');
    } else {
      toast.success(`${saved} question${saved === 1 ? '' : 's'} sent to the review queue.`, { id: toastId });
      setItems([]);
      setRunInfo(null);
      setPhase('idle');
    }
    if (saved) onSaved?.(true);
  }, [items, onSaved]);

  return { spec, update, phase, progress, items, runInfo, generate, cancel, toggle, remove, discard, save };
}
