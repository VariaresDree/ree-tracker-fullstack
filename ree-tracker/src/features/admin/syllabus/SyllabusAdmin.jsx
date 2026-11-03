// src/features/admin/syllabus/SyllabusAdmin.jsx
//
// Admin › Syllabus: one screen for a subject's topics, the board's items per
// topic, and each topic's subtopics, because PRC changes its table. It replaces
// Admin › Subtopics, Bank vs board, and the syllabus editor in the question bank.
//
// Counts are a draft until Save changes, since they change every PRC paper at
// once. Subtopics and topics save as they're edited, as they always have. A total
// other than the board's warns but saves: papers scale to their length anyway.
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { PRC_EXAM_FORMAT, SYLLABUS_SUBJECTS } from '@ree/shared';
import { useStore } from '../../../store/useStore';
import { apiRequest, updateDynamicTOS } from '../../../services/dbQueries';
import { Button, Card, EmptyState, FormField, Input, Modal, SectionHeader, SegmentedControl, Select, Skeleton, StatusPill, StickyToolbar, Stepper } from '../../../components/ui';
import { ChevronRight, ListChecks, RotateCcw } from '../../../components/ui/icons';
import { draftFrom, dropTopic, giveItems, noCount, sameDraft, setItems, shareWith, splitOff, totalItems } from './blueprintDraft';
import TopicSubtopics from './TopicSubtopics';

const BLUEPRINT = '/api/admin/board-blueprint';
const SUBTOPICS = '/api/admin/subtopics';
const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
const LONG_MS = 30_000;
// Under this many questions per board item, a learner sees repeats within a few papers.
const THIN_PER_ITEM = 15;
const number = (n) => n.toLocaleString('en-PH');

function TopicRow({ topic, questions, subtopics, onOpen, action }) {
  const facts = [questions == null ? null : `${number(questions)} questions`, `${subtopics} subtopics`].filter(Boolean).join(' · ');
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onOpen(topic.id)}
        aria-label={`${topic.name}: ${facts}`}
        className="flex-1 min-w-0 min-h-11 py-1.5 flex items-center justify-between gap-3 text-left rounded-[var(--radius-sm)] hover:bg-surface2 cursor-pointer transition-colors"
      >
        <span className="min-w-0 flex flex-col">
          <span className="text-sm font-medium text-textMain [overflow-wrap:anywhere]">{topic.name}</span>
          <span className="text-xs text-muted2 tabular-nums">{facts}</span>
        </span>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-muted" />
      </button>
      {action}
    </li>
  );
}

function TopicSheet({ topic, list, nameOf, rows, onDraft, onRows, onRow, onRetire, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const { id, subject, name } = topic;
  const at = list.findIndex((g) => g.topicIds.includes(id));
  const group = list[at];
  const others = group ? group.topicIds.filter((t) => t !== id).map(nameOf) : [];

  const retire = async () => {
    setRetiring(true);
    await onRetire(topic);
    setRetiring(false);
  };

  return (
    <Modal open onClose={onClose} size="lg" title={name}>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="sheet-count" className="flex flex-col gap-2">
          <h3 id="sheet-count" className="text-sm font-semibold text-textMain">Board count</h3>
          <p className="text-sm text-muted2">
            {group
              ? `${group.items} items${others.length ? `, shared with ${others.join(', ')}` : ''}.`
              : 'No count: it only fills a paper when a topic runs short.'}
            {' '}Changes here wait for Save changes.
          </p>
          <div className="flex flex-wrap gap-2">
            {!group && <Button size="sm" variant="secondary" onClick={() => onDraft((d) => giveItems(d, subject, id))}>Give items</Button>}
            {others.length > 0 && <Button size="sm" variant="secondary" onClick={() => onDraft((d) => splitOff(d, subject, id))}>Split off</Button>}
            {group && <Button size="sm" variant="ghost" onClick={() => onDraft((d) => noCount(d, subject, id))}>No count</Button>}
          </div>
          <FormField label="Share a count with">
            <Select value="" onChange={(e) => onDraft((d) => shareWith(d, subject, id, Number(e.target.value)))}>
              <option value="">Choose…</option>
              {list.map((g, i) => (i === at ? null : (
                <option key={g.topicIds[0]} value={i}>{g.topicIds.map(nameOf).join(', ')} ({g.items})</option>
              )))}
            </Select>
          </FormField>
        </section>

        <section aria-labelledby="sheet-subtopics" className="flex flex-col gap-2">
          <h3 id="sheet-subtopics" className="text-sm font-semibold text-textMain">Subtopics</h3>
          <p className="text-sm text-muted2">The suggested list in Progress › Syllabus. Edits save at once.</p>
          <TopicSubtopics topicId={id} rows={rows} onRows={(items) => onRows(id, items)} onRow={onRow} />
        </section>

        <section aria-labelledby="sheet-retire" className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 id="sheet-retire" className="text-sm font-semibold text-textMain">Retire this topic</h3>
          <p className="text-sm text-muted2">It leaves pickers, the syllabus and the board count. Its questions and learners’ history stay. Add the same name to bring it back.</p>
          {confirming ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="danger" loading={retiring} onClick={retire}>Retire {name}</Button>
              <Button size="sm" variant="ghost" disabled={retiring} onClick={() => setConfirming(false)}>Keep it</Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" tone="danger" className="self-start" onClick={() => setConfirming(true)}>Retire</Button>
          )}
        </section>
      </div>
    </Modal>
  );
}

export default function SyllabusAdmin() {
  const dynamicTOS = useStore((s) => s.dynamicTOS);
  const setDynamicTOS = useStore((s) => s.setDynamicTOS);
  const [data, setData] = useState(null); // { topics, items }, from the subtopics route
  const [blueprint, setBlueprint] = useState(null);
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [bank, setBank] = useState(null);
  const [failed, setFailed] = useState(null);
  const [nonce, setNonce] = useState(0);
  const [subject, setSubject] = useState('Mathematics');
  const [openId, setOpenId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([
      apiRequest(SUBTOPICS, 'GET', null, { timeoutMs: LONG_MS }),
      apiRequest('/api/config/board-blueprint', 'GET', null, { timeoutMs: LONG_MS }),
    ]).then(([subtopics, board]) => {
      if (!live) return;
      setData(subtopics);
      setBlueprint(board);
      const fresh = draftFrom(board.groups);
      setSaved(fresh);
      setDraft(fresh);
      setFailed(null);
    }).catch((err) => { if (live) setFailed(err.message || 'Could not load the syllabus.'); });
    // A count of the whole bank: the screen works without it.
    apiRequest('/api/admin/bank-counts', 'GET', null, { timeoutMs: LONG_MS })
      .then((res) => { if (live) setBank(res.items || []); })
      .catch(() => {});
    return () => { live = false; };
  }, [nonce]);

  const topics = useMemo(() => (data?.topics || []).filter((t) => t.subject === subject), [data, subject]);
  const byId = useMemo(() => new Map((data?.topics || []).map((t) => [t.id, t])), [data]);
  const nameOf = (id) => byId.get(id)?.name || 'A retired topic';
  const questionsOf = (name) => (bank ? bank.find((r) => r.subject === subject && r.topic === name)?.count || 0 : null);
  const subtopicsOf = (id) => (data?.items || []).filter((s) => s.topicId === id && s.active).length;

  const putRows = (id, items) => setData((d) => ({ ...d, items: [...d.items.filter((s) => s.topicId !== id), ...items] }));
  const putRow = (item) => setData((d) => ({ ...d, items: d.items.map((s) => (s.id === item.id ? item : s)) }));

  const header = (
    <SectionHeader title="Syllabus" description="Each subject’s topics, the board’s items per topic, and the subtopics learners see. PRC papers draw by these counts." />
  );

  if (failed && !data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={ListChecks}
          title="Could not load the syllabus"
          description={failed}
          action={<Button size="sm" variant="secondary" onClick={() => setNonce((n) => n + 1)}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>}
        />
      </div>
    );
  }
  if (!data || !draft) {
    return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/3" /><Skeleton className="h-64" /></div>;
  }

  const list = draft[subject];
  const total = totalItems(list);
  const target = PRC_EXAM_FORMAT[subject]?.items || 100;
  const dirty = !sameDraft(draft, saved);
  const counted = new Set(list.flatMap((g) => g.topicIds));
  const uncounted = topics.filter((t) => !counted.has(t.id));
  const openTopic = openId ? byId.get(openId) : null;

  const apply = (board) => {
    const fresh = draftFrom(board.groups);
    setBlueprint(board);
    setSaved(fresh);
    setDraft(fresh);
  };

  const save = async () => {
    setSaving(true);
    try {
      apply(await apiRequest(BLUEPRINT, 'PUT', draft, { timeoutMs: LONG_MS }));
      toast.success('Board counts saved.');
    } catch (err) {
      toast.error(err.message || 'Could not save the board counts.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      apply(await apiRequest(BLUEPRINT, 'DELETE', null, { timeoutMs: LONG_MS }));
      setConfirmReset(false);
      toast.success('Back to PRC’s table.');
    } catch (err) {
      toast.error(err.message || 'Could not reset the board counts.');
    } finally {
      setSaving(false);
    }
  };

  // One subject at a time: the route only touches the subjects it's sent.
  const saveTopics = async (names) => {
    await updateDynamicTOS({ [subject]: names });
    setDynamicTOS({ ...dynamicTOS, [subject]: names });
  };

  const retire = async (topic) => {
    try {
      await saveTopics(topics.filter((t) => t.id !== topic.id).map((t) => t.name));
      setData((d) => ({ ...d, topics: d.topics.filter((t) => t.id !== topic.id) }));
      setDraft((d) => dropTopic(d, topic.id));
      setSaved((d) => dropTopic(d, topic.id));
      setOpenId(null);
      toast.success(`Retired ${topic.name}.`);
    } catch (err) {
      toast.error(err.message || 'Could not retire that topic.');
    }
  };

  const addTopic = async (e) => {
    e.preventDefault();
    const name = newTopic.trim();
    if (!name) return;
    if (topics.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      toast.error(`${SUBJECT_LABEL[subject]} already has ${name}.`);
      return;
    }
    setAdding(true);
    try {
      await saveTopics([...topics.map((t) => t.name), name]);
      setData(await apiRequest(SUBTOPICS, 'GET', null, { timeoutMs: LONG_MS }));
      setNewTopic('');
      toast.success(`Added ${name}.`);
    } catch (err) {
      toast.error(err.message || 'Could not add that topic.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {header}
      <SegmentedControl label="Subject" options={SYLLABUS_SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABEL[s] }))} value={subject} onChange={setSubject} fullWidth />

      <StickyToolbar>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-textMain tabular-nums">Total {total} of {target}</span>
          {total !== target && <StatusPill tone="amber" dot={false}>Papers scale to fit</StatusPill>}
        </span>
        <span className="flex items-center gap-2">
          {dirty && <Button size="sm" variant="ghost" disabled={saving} onClick={() => setDraft(saved)}>Discard</Button>}
          <Button size="sm" disabled={!dirty} loading={saving} onClick={save}>Save changes</Button>
        </span>
      </StickyToolbar>

      <ul aria-label={`${SUBJECT_LABEL[subject]} board counts`} className="flex flex-col gap-3">
        {list.map((group, index) => {
          const names = group.topicIds.map(nameOf);
          const questions = bank ? names.reduce((sum, n) => sum + questionsOf(n), 0) : null;
          const perItem = questions != null && group.items > 0 ? questions / group.items : null;
          return (
            <Card as="li" padding="sm" key={group.topicIds[0]} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Stepper label={`Items for ${names.join(', ')}`} value={group.items} onChange={(n) => setDraft((d) => setItems(d, subject, index, n))} />
                  <span className="text-sm text-muted2">items</span>
                </span>
                {perItem != null && (
                  <span className="flex items-center gap-2 text-xs text-muted2 tabular-nums">
                    {perItem < THIN_PER_ITEM && <StatusPill tone="danger" dot={false}>Thin</StatusPill>}
                    {number(Math.round(perItem))} per item
                  </span>
                )}
              </div>
              <ul className="flex flex-col divide-y divide-border">
                {group.topicIds.map((id) => (
                  <TopicRow key={id} topic={byId.get(id) || { id, name: nameOf(id) }} questions={questionsOf(nameOf(id))} subtopics={subtopicsOf(id)} onOpen={setOpenId} />
                ))}
              </ul>
            </Card>
          );
        })}
      </ul>

      {uncounted.length > 0 && (
        <Card as="section" padding="sm" aria-labelledby="syllabus-uncounted" className="flex flex-col gap-2">
          <h3 id="syllabus-uncounted" className="text-sm font-semibold text-textMain">No count</h3>
          <p className="text-xs text-muted2">These only fill a paper when a topic runs short.</p>
          <ul className="flex flex-col divide-y divide-border">
            {uncounted.map((t) => (
              <TopicRow
                key={t.id}
                topic={t}
                questions={questionsOf(t.name)}
                subtopics={subtopicsOf(t.id)}
                onOpen={setOpenId}
                action={<Button size="sm" variant="secondary" aria-label={`Give items: ${t.name}`} onClick={() => setDraft((d) => giveItems(d, subject, t.id))}>Give items</Button>}
              />
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-muted2">Thin: under {THIN_PER_ITEM} questions per board item, so a learner sees repeats within a few papers.</p>

      <form onSubmit={addTopic} className="flex flex-col gap-1.5">
        <div className="flex items-end gap-2">
          <FormField label="Add a topic" className="flex-1 min-w-0">
            <Input value={newTopic} maxLength={160} onChange={(e) => setNewTopic(e.target.value)} />
          </FormField>
          <Button type="submit" variant="secondary" loading={adding} disabled={!newTopic.trim()}>Add</Button>
        </div>
        <p className="text-xs text-muted2">It starts with no count. A retired name comes back with its questions.</p>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted2">{blueprint?.custom ? 'Using your own counts.' : 'Using PRC’s table (2024).'}</p>
        <Button size="sm" variant="secondary" disabled={!blueprint?.custom || saving} onClick={() => setConfirmReset(true)}>Reset to PRC’s table</Button>
      </div>

      {openTopic && (
        <TopicSheet
          topic={openTopic}
          list={list}
          nameOf={nameOf}
          rows={(data.items || []).filter((s) => s.topicId === openTopic.id)}
          onDraft={setDraft}
          onRows={putRows}
          onRow={putRow}
          onRetire={retire}
          onClose={() => setOpenId(null)}
        />
      )}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        size="sm"
        title="Reset to PRC’s table?"
        footer={(
          <>
            <Button variant="ghost" disabled={saving} onClick={() => setConfirmReset(false)}>Keep my counts</Button>
            <Button variant="danger" loading={saving} onClick={reset}>Reset all subjects</Button>
          </>
        )}
      >
        <p className="text-sm text-muted2">This replaces the counts for Math, ESAS and EE with PRC’s 2024 table. Topics and subtopics don’t change.</p>
      </Modal>
    </div>
  );
}
