// src/features/syllabus/SyllabusTab.jsx
//
// Progress › Syllabus: the board's topic list as a tracker and a table of
// contents. A tile per subject (coverage, subtopics, board items), then one
// folding row per topic: subtopics ticked, Read / Watched / Drilled (Drilled
// ticks itself from answers), mastery and accuracy. Coverage overall is weighted
// the way the board weighs the subjects, with a pace line against the exam date.
// The psychometrician tracker's Tracker + TOS Summary sheets, for the REE board,
// on the app's own topics.
//
// Display only: none of this feeds readiness, the forecast or the rankings.
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SYLLABUS_SUBJECTS, syllabusCoverage } from '@ree/shared';
import { subtopicProgress } from '@ree/shared/subtopics';
import {
  Panel, Button, EmptyState, Skeleton, FormField, Select, cn,
} from '../../components/ui';
import { ListChecks, BookOpen, CloudOff, RotateCcw, Check } from '../../components/ui/icons';
import { useSyllabus } from './useSyllabus';
import { useSubtopics } from './useSubtopics';
import { daysToExam } from '../today/todayActions';
import { drillPreset, launchPractice } from '../active-recall/presets';
import { paceLine } from './syllabusPace';
import { MasteryStrip, SubjectTiles } from './SubjectTiles';
import TopicRow, { ROW_COLUMNS } from './TopicRow';
import { bandCounts, boardItemsCovered, sortTopics } from './trackerModel';

const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
const fmtPct = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
const NO_ROWS = [];

function StatusLine({ status, queuedCount, subtopicsQueued, hasTopics }) {
  let text = null;
  if (queuedCount > 0) text = `${queuedCount} ${queuedCount === 1 ? 'topic' : 'topics'} saved on this device, waiting to sync.`;
  else if (subtopicsQueued > 0) text = `${subtopicsQueued} subtopic ${subtopicsQueued === 1 ? 'change' : 'changes'} saved on this device, waiting to sync.`;
  else if (status === 'offline') text = 'Offline. Showing the checklist saved on this device.';
  else if (status === 'unreachable') text = 'Couldn’t reach the server. Showing the checklist saved on this device.';
  else if (status === 'error' && hasTopics) text = 'Couldn’t refresh. Showing the checklist saved on this device.';
  if (!text) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-muted2">
      <CloudOff size={14} strokeWidth={1.75} aria-hidden="true" /> {text}
    </p>
  );
}

/** @param {{ examDate?: string|null }} props */
export default function SyllabusTab({ examDate = null }) {
  const navigate = useNavigate();
  const { topics, weights, status, queuedCount, saveTopic, reload } = useSyllabus();
  const subtopics = useSubtopics();
  const [subject, setSubject] = useState('Mathematics');
  const [openTopic, setOpenTopic] = useState(null);
  // Narrow the list: high-yield topics only, and the order to read it in.
  const [highYieldOnly, setHighYieldOnly] = useState(false);
  const [sortBy, setSortBy] = useState('board');

  // Rows are memoised, so they get a callback that never changes identity.
  // The ref is refreshed in a LAYOUT effect, during the commit: a passive
  // effect runs after paint, and a tick in between used the previous render's
  // saveTopic (which may not know the topic yet) and failed silently.
  const saveRef = useRef(saveTopic);
  useLayoutEffect(() => { saveRef.current = saveTopic; }, [saveTopic]);
  const onSave = useCallback(async (topicId, patch) => {
    try {
      return await saveRef.current(topicId, patch);
    } catch (err) {
      if (!err?.fields) toast.error(err?.message ? `Couldn’t save: ${err.message}` : 'Couldn’t save. Try again.');
      throw err;
    }
  }, []);
  const onDrill = useCallback((row) => {
    launchPractice(navigate, drillPreset({ topicId: row.topicId, topic: row.name, subject: row.subject }));
  }, [navigate]);
  const onToggle = useCallback((topicId) => setOpenTopic((open) => (open === topicId ? null : topicId)), []);

  const { byTopic } = subtopics;
  const coverage = useMemo(() => syllabusCoverage(topics || [], weights || undefined), [topics, weights]);
  const subjectRows = useMemo(() => (topics || []).filter((t) => t.subject === subject), [topics, subject]);
  const visible = useMemo(() => sortTopics(
    subjectRows.filter((t) => !highYieldOnly || t.highYield),
    sortBy,
    (topicId) => subtopicProgress(byTopic.get(topicId)),
  ), [subjectRows, highYieldOnly, sortBy, byTopic]);
  const anyHighYield = (topics || []).some((t) => t.highYield);

  if (!topics && status === 'error') {
    return (
      <EmptyState
        icon={ListChecks}
        title="Couldn’t load your syllabus checklist"
        description="The server turned the request down. Try again in a moment."
        action={<Button size="sm" variant="secondary" onClick={() => reload()}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>}
      />
    );
  }
  if (!topics && (status === 'offline' || status === 'unreachable')) {
    return (
      <EmptyState
        icon={CloudOff}
        title={status === 'offline' ? 'You’re offline' : 'Couldn’t reach the server'}
        description="The checklist loads once over a connection; after that it works offline."
        action={<Button size="sm" variant="secondary" onClick={() => reload()}><RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try again</Button>}
      />
    );
  }
  if (!topics) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-4">
        <span className="sr-only">Loading the syllabus…</span>
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (topics.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No syllabus topics yet"
        description="The topic list comes from the board’s table of specifications, and none is set up yet."
      />
    );
  }

  const { overall } = coverage;
  const pace = paceLine(overall.total - overall.covered, daysToExam(examDate));
  // Shares of the exam, from the weights as stored (fractions or percents).
  const weightSum = coverage.subjects.reduce((s, x) => s + (x.weight > 0 ? x.weight : 0), 0);
  const share = (w) => (weightSum > 0 ? Math.round((w / weightSum) * 100) : 0);
  const tiles = coverage.subjects.filter((s) => s.total > 0 || s.subject === subject).map((s) => {
    const rows = topics.filter((t) => t.subject === s.subject);
    const counts = rows.map((t) => subtopicProgress(byTopic.get(t.topicId)));
    return {
      subject: s.subject,
      label: SUBJECT_LABEL[s.subject],
      percent: s.percent,
      covered: s.covered,
      total: s.total,
      share: share(s.weight),
      subtopics: { done: counts.reduce((n, c) => n + c.done, 0), total: counts.reduce((n, c) => n + c.total, 0) },
      items: boardItemsCovered(s.subject, rows),
    };
  });
  // A subject with no topics still has its tile, so it can say so.
  for (const s of SYLLABUS_SUBJECTS) {
    if (!tiles.some((t) => t.subject === s)) {
      tiles.push({ subject: s, label: SUBJECT_LABEL[s], percent: 0, covered: 0, total: 0, share: share(coverage.subjects.find((x) => x.subject === s)?.weight || 0), subtopics: { done: 0, total: 0 }, items: { covered: 0, total: 0 } });
    }
  }
  tiles.sort((a, b) => SYLLABUS_SUBJECTS.indexOf(a.subject) - SYLLABUS_SUBJECTS.indexOf(b.subject));

  return (
    <div className="flex flex-col gap-6">
      <Panel icon={ListChecks} eyebrow="Checklist" title="Syllabus coverage" bodyClassName="flex flex-col gap-4">
        <StatusLine status={status} queuedCount={queuedCount} subtopicsQueued={subtopics.queuedCount} hasTopics />
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-4xl text-display tabular-nums text-textMain">{fmtPct(overall.percent)}</span>
          <span className="text-sm text-muted2">covered · {overall.covered} of {overall.total} topics</span>
        </div>
        {pace && <p className="text-sm text-muted2">{pace}</p>}
        <SubjectTiles tiles={tiles} active={subject} onPick={setSubject} />
        <p className="text-xs text-muted2 leading-relaxed">
          A topic counts as covered once you’ve read it and drilled it. Drilled ticks itself after 20 answers in the topic, or 10 at Developing mastery or better. Ticking every subtopic ticks Read. Watched is for your own tracking. None of this changes your readiness, forecast or rankings.
        </p>
      </Panel>

      <Panel icon={BookOpen} eyebrow={`Topic tracker · ${SUBJECT_LABEL[subject]}`} title="Topics" bodyClassName="flex flex-col gap-4">
        <MasteryStrip counts={bandCounts(subjectRows)} subject={subject} />
        <div className="flex flex-wrap items-end gap-3">
          {anyHighYield && (
            <Button type="button" size="sm" variant={highYieldOnly ? 'outline' : 'secondary'} aria-pressed={highYieldOnly} onClick={() => setHighYieldOnly((v) => !v)}>
              {highYieldOnly && <Check size={14} strokeWidth={2} aria-hidden="true" />} High-yield only
            </Button>
          )}
          <FormField label="Sort" className="min-w-40">
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="board">Board order</option>
              <option value="items">Most board items</option>
              <option value="least">Least done</option>
              <option value="weakest">Weakest first</option>
              <option value="dread">Most dreaded first</option>
              <option value="unsure">Least sure first</option>
            </Select>
          </FormField>
          <Link to="/progress?tab=weak-spots" className="touch-target inline-flex items-center text-sm text-[var(--accent-text)] hover:underline">See Weak spots</Link>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-muted2">{highYieldOnly ? 'No high-yield topics in this subject.' : 'No topics in this subject yet.'}</p>
        ) : (
          <div className="@container flex flex-col gap-2">
            <div aria-hidden="true" className={cn('hidden @2xl:grid gap-x-3 px-3.5 text-eyebrow', ROW_COLUMNS)}>
              <span>Topic</span><span>Items</span><span>Subtopics</span><span>R W D</span><span>Mastery</span><span>Accuracy</span><span />
            </div>
            <ul className="flex flex-col gap-2" aria-label={`${subject} topics`}>
              {visible.map((row) => (
                <TopicRow
                  key={row.topicId}
                  row={row}
                  rows={byTopic.get(row.topicId) || NO_ROWS}
                  ready={subtopics.ready}
                  status={subtopics.premadeStatus}
                  open={openTopic === row.topicId}
                  onToggle={onToggle}
                  actions={subtopics.actions}
                  onSave={onSave}
                  onDrill={onDrill}
                />
              ))}
            </ul>
            <p className="text-xs text-muted2">R read, W watched, D drilled. Items: of the board’s 100 in this subject; * shared with another topic, — not itemized by PRC.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
