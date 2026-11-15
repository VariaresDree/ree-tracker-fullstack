// Admin › Question bank › Subtopics › In the background: the switch for the
// server's hourly tagging run (services/subtopicAutoTag.js), how far the bank
// has got, and the questions the AI wasn't sure of, kept on the server so
// nothing is lost when the page closes.
//
// To review is in groups (2026-11-13): per topic, the questions the AI pointed
// to each subtopic, checked and tagged a group at a time (SuggestionGroup).
// It was one question at a time, 50 shown of a pile of 561 that grew by up to
// 100 an hour.
//
// Since 2026-11-14 a pick that names a subtopic is saved by the server without
// waiting (the owner's call: the pile reached 1,668 with none reviewed, and
// about 9 in 10 unsure picks were right). Those groups read "saved, to check";
// only questions the AI couldn't place wait untagged, "to sort".
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Card, Disclosure, ProgressIndicator, SegmentedControl } from '../../../components/ui';
import { apiRequest } from '../../../services/dbQueries';
import SuggestionGroup from './SuggestionGroup';

const FLAG = 'subtopic-autotag';
const n = (x) => Number(x || 0).toLocaleString();

const fetchStatus = () => apiRequest('/api/questions/auto-tag-status', 'GET', null, { timeoutMs: 30_000 });
const fetchGroups = () => apiRequest('/api/questions/tag-suggestions/groups', 'GET', null, { timeoutMs: 30_000 });
const groupKey = (topicId, subtopicId) => `${topicId}:${subtopicId || 'none'}`;

export default function AutoTagPanel() {
  const [status, setStatus] = useState(null);
  const [groups, setGroups] = useState(null); // { total, saved, topics: [{ id, name, subject, subtopics, count, groups: [{ subtopicId, name, count, saved }] }] }
  const [opened, setOpened] = useState(null); // groupKey of the group being checked
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.all([fetchStatus(), fetchGroups()])
      .then(([s, g]) => { if (live) { setStatus(s); setGroups(g); } })
      .catch((err) => toast.error(err.message || "Couldn't load the tagging status."));
    return () => { live = false; };
  }, []);

  const change = async (value) => {
    const enabled = value === 'on';
    setSaving(true);
    try {
      await apiRequest(`/api/config/flags/${FLAG}`, 'PUT', { enabled, description: 'Subtopic tagging by the in-app AI, a few batches an hour.' });
      setStatus((s) => s && { ...s, enabled });
      toast.success(enabled ? 'Tagging in the background is on. It starts at the next hour.' : 'Tagging in the background is off.');
    } catch (err) {
      toast.error(err.message || 'Couldn’t change it. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // A group answered some of its questions: take them off the counts here.
  // The tagged total can go up (a tag), stay (a confirm) or down (None fits on
  // a saved pick), so it is read again.
  const resolved = (topicId, subtopicId) => ({ resolved: count, wasSaved = 0 }) => {
    fetchStatus().then(setStatus).catch(() => {});
    setGroups((g) => ({
      total: Math.max(0, g.total - count),
      saved: Math.max(0, (g.saved || 0) - wasSaved),
      topics: g.topics
        .map((t) => (t.id !== topicId ? t : {
          ...t,
          count: Math.max(0, t.count - count),
          groups: t.groups
            .map((gr) => ((gr.subtopicId || null) === (subtopicId || null)
              ? { ...gr, count: Math.max(0, gr.count - count), saved: Math.max(0, (gr.saved || 0) - wasSaved) }
              : gr)),
        }))
        .filter((t) => t.count > 0),
    }));
  };

  const perHour = status ? status.callsPerRun * status.batch : 0;

  return (
    <Card as="section" elevated padding="md" className="flex flex-col gap-4 min-w-0" aria-labelledby="autotag-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 id="autotag-title" className="text-h3 text-textMain">In the background</h3>
          <p className="text-xs text-muted2 mt-1">
            The in-app AI tags {perHour ? `about ${n(perHour)}` : 'a few batches of'} questions an hour, 6 AM to 11 PM, with nobody on this page. A pick that names a subtopic is saved at once; the ones it wasn&rsquo;t sure of are listed below for you to check when you like. Questions it couldn&rsquo;t place wait untagged. It goes slowly on purpose: it shares the free AI with learners.
          </p>
        </div>
        {status && (
          <SegmentedControl
            size="sm"
            label="Tagging in the background"
            value={status.enabled ? 'on' : 'off'}
            onChange={change}
            options={[{ value: 'on', label: 'On', disabled: saving }, { value: 'off', label: 'Off', disabled: saving }]}
          />
        )}
      </div>

      {status && (
        <>
          <ProgressIndicator value={status.tagged} max={status.total || 1} label={`${n(status.tagged)} of ${n(status.total)} questions tagged`} />
          <p className="text-sm text-muted2" role="status">
            {status.notAsked > 0 ? `${n(status.notAsked)} not looked at yet` : 'Every question has been looked at'}
            {groups ? ` · ${n(groups.saved)} saved to check · ${n(groups.total - (groups.saved || 0))} to sort` : ` · ${n(status.toReview)} to review`}
          </p>
        </>
      )}

      {groups?.topics?.length > 0 && (
        <section aria-label="To review" className="flex flex-col gap-3 min-w-0 border-t border-border pt-4">
          <p className="text-eyebrow">To review · {n(groups.total)}</p>
          <p className="text-xs text-muted2">
            The AI wasn&rsquo;t sure of these. Saved ones already carry its pick, so learners can study them now: open a group, untick any that don&rsquo;t belong, and confirm the rest. Ones to sort have no tag yet. Unticked ones stay here for later.
          </p>
          {groups.topics.map((t) => (
            <Disclosure key={t.id} title={`${t.name} · ${n(t.count)}`} description={t.subject}>
              <ul className="flex flex-col gap-2">
                {t.groups.filter((gr) => gr.count > 0).map((gr) => {
                  const key = groupKey(t.id, gr.subtopicId);
                  const isOpen = opened === key;
                  return (
                    <li key={key} className="flex flex-col gap-3 min-w-0">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpened(isOpen ? null : key)}
                        className="flex items-center justify-between gap-3 w-full text-left px-3 py-2 min-h-11 rounded-[var(--radius-default)] border border-border bg-surface2 hover:bg-surface3 cursor-pointer"
                      >
                        <span className="text-sm text-textMain min-w-0">{gr.subtopicId ? (gr.name || 'A subtopic') : 'No suggestion'}</span>
                        <span className="text-sm text-muted2 tabular-nums shrink-0">{n(gr.count)} {!gr.subtopicId ? 'to sort' : gr.saved >= gr.count ? 'saved, to check' : 'suggested'}</span>
                      </button>
                      {isOpen && <SuggestionGroup topic={t} group={gr} onResolved={resolved(t.id, gr.subtopicId)} />}
                    </li>
                  );
                })}
              </ul>
            </Disclosure>
          ))}
        </section>
      )}
    </Card>
  );
}
