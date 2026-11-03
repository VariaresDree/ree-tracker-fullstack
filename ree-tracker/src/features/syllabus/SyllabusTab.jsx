// src/features/syllabus/SyllabusTab.jsx
//
// Progress › Syllabus: the board's topic list as a tracker and a table of
// contents. A ring per subject, filter chips, then a tile per topic: subtopics
// ticked, and icons for Read / Watched / Drilled (Drilled ticks itself from
// answers). Tapping a tile opens its sheet (TopicSheet), kept in ?topic= so Back
// closes it. Coverage overall is weighted the way the board weighs the subjects,
// with a pace line against the exam date. The psychometrician tracker's Tracker +
// TOS Summary sheets, for the REE board, on the app's own topics.
//
// Display only: none of this feeds readiness, the forecast or the rankings.
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SYLLABUS_SUBJECTS, syllabusCoverage } from '@ree/shared';
import { subtopicProgress } from '@ree/shared/subtopics';
import {
  Panel, Button, EmptyState, Grid, Skeleton, FormField, SegmentedControl, Select,
} from '../../components/ui';
import { ListChecks, BookOpen, CloudOff, RotateCcw, Check, Info } from '../../components/ui/icons';
import { useSyllabus } from './useSyllabus';
import { useSubtopics } from './useSubtopics';
import { daysToExam } from '../today/todayActions';
import { drillPreset, launchPractice } from '../active-recall/presets';
import { paceLine } from './syllabusPace';
import { MasteryStrip, SubjectRings } from './SubjectTiles';
import TopicTile from './TopicTile';
import TopicSheet from './TopicSheet';
import { CHECKS } from './topicChecks';
import { bandCounts, filterTopics, sortTopics } from './trackerModel';

const SUBJECT_LABEL = { Mathematics: 'Math', ESAS: 'ESAS', EE: 'EE' };
const fmtPct = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
const NO_ROWS = [];
const FILTERS = [['all', 'All'], ['todo', 'To do'], ['done', 'Done'], ['weak', 'Weak']];
const NO_MATCH = {
  todo: 'Every topic in this subject is covered.',
  done: 'No topics covered in this subject yet.',
  weak: 'No weak topics in this subject.',
};

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
  const location = useLocation();
  const { topics, weights, status, queuedCount, saveTopic, reload } = useSyllabus();
  const subtopics = useSubtopics();
  // In the URL, so a reload or a shared link lands in the same place.
  const [params, setParams] = useSearchParams();
  const subject = SYLLABUS_SUBJECTS.includes(params.get('subject')) ? params.get('subject') : 'Mathematics';
  const openTopic = params.get('topic');
  const withParam = (key, value) => (prev) => {
    const next = new URLSearchParams(prev);
    if (value) next.set(key, value); else next.delete(key);
    return next;
  };
  const setSubject = (next) => setParams(withParam('subject', next), { replace: true });
  // Narrow the list: a filter, high-yield topics only, and the order to read it in.
  const [filter, setFilter] = useState('all');
  const [highYieldOnly, setHighYieldOnly] = useState(false);
  const [sortBy, setSortBy] = useState('board');
  const [showInfo, setShowInfo] = useState(false);

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
  // Opening adds a history entry, so Back closes the sheet. One opened from a link
  // has nothing behind it to go back to.
  const onOpen = useCallback((topicId) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('topic', topicId);
      return next;
    }, { state: { topicSheet: true } });
  }, [setParams]);
  const closeSheet = () => {
    if (location.state?.topicSheet) navigate(-1);
    else setParams(withParam('topic', null), { replace: true });
  };

  const { byTopic } = subtopics;
  const coverage = useMemo(() => syllabusCoverage(topics || [], weights || undefined), [topics, weights]);
  const subjectRows = useMemo(() => (topics || []).filter((t) => t.subject === subject), [topics, subject]);
  const visible = useMemo(() => sortTopics(
    filterTopics(subjectRows, filter).filter((t) => !highYieldOnly || t.highYield),
    sortBy,
    (topicId) => subtopicProgress(byTopic.get(topicId)),
  ), [subjectRows, filter, highYieldOnly, sortBy, byTopic]);
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
  // Every subject has its ring, even with no topics yet.
  const tiles = SYLLABUS_SUBJECTS.map((s) => {
    const row = coverage.subjects.find((x) => x.subject === s);
    return { subject: s, label: SUBJECT_LABEL[s], percent: row?.percent || 0, covered: row?.covered || 0, total: row?.total || 0, share: share(row?.weight || 0) };
  });
  const openRow = openTopic ? topics.find((t) => t.topicId === openTopic) : null;

  return (
    <div className="flex flex-col gap-6">
      <Panel
        icon={ListChecks}
        title="Syllabus coverage"
        bodyClassName="flex flex-col gap-3"
        action={(
          <Button type="button" variant="ghost" size="icon" aria-label="How coverage works" aria-expanded={showInfo} onClick={() => setShowInfo((v) => !v)}>
            <Info size={18} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
      >
        <StatusLine status={status} queuedCount={queuedCount} subtopicsQueued={subtopics.queuedCount} hasTopics />
        <SubjectRings tiles={tiles} active={subject} onPick={setSubject} />
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl text-display tabular-nums text-textMain">{fmtPct(overall.percent)}</span>
          <span className="text-sm text-muted2">covered · {overall.covered} of {overall.total} topics</span>
        </div>
        {pace && <p className="text-sm text-muted2">{pace}</p>}
        {showInfo && (
          <p className="text-xs text-muted2 leading-relaxed">
            A topic counts as covered once you’ve read it and drilled it. Drilled ticks itself after 20 answers in the topic, or 10 at Developing mastery or better. Ticking every subtopic ticks Read. Watched is for your own tracking. Subjects count by their share of the exam: {tiles.map((t) => `${t.label} ${t.share}%`).join(', ')}. None of this changes your readiness, forecast or rankings.
          </p>
        )}
      </Panel>

      <Panel icon={BookOpen} title="Topics" bodyClassName="flex flex-col gap-4">
        <MasteryStrip counts={bandCounts(subjectRows)} subject={subject} />
        <SegmentedControl
          label="Show"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map(([value, label]) => ({ value, label: `${label} ${filterTopics(subjectRows, value).length}` }))}
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          {anyHighYield ? (
            <Button type="button" size="sm" variant={highYieldOnly ? 'outline' : 'secondary'} aria-pressed={highYieldOnly} onClick={() => setHighYieldOnly((v) => !v)}>
              {highYieldOnly && <Check size={14} strokeWidth={2} aria-hidden="true" />} High-yield only
            </Button>
          ) : <span />}
          <FormField label="Sort" className="min-w-40">
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="board">Board order</option>
              <option value="least">Least done</option>
              <option value="weakest">Weakest first</option>
              <option value="dread">Most dreaded first</option>
              <option value="unsure">Least sure first</option>
            </Select>
          </FormField>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-muted2">
            {highYieldOnly ? 'No high-yield topics here.' : NO_MATCH[filter] || 'No topics in this subject yet.'}
          </p>
        ) : (
          <Grid as="ul" kind="cards" gap="sm" aria-label={`${subject} topics`}>
            {visible.map((row) => (
              <TopicTile key={row.topicId} row={row} rows={byTopic.get(row.topicId) || NO_ROWS} ready={subtopics.ready} onOpen={onOpen} />
            ))}
          </Grid>
        )}
        <ul aria-hidden="true" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted2">
          {CHECKS.map(({ key, label, icon: Icon }) => (
            <li key={key} className="inline-flex items-center gap-1"><Icon size={13} strokeWidth={1.75} /> {label}</li>
          ))}
        </ul>
      </Panel>

      {openRow && (
        <TopicSheet
          row={openRow}
          rows={byTopic.get(openRow.topicId) || NO_ROWS}
          ready={subtopics.ready}
          status={subtopics.premadeStatus}
          actions={subtopics.actions}
          onSave={onSave}
          onDrill={onDrill}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}
