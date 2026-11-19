// Library › Lessons (2026-11-16): a summary of every topic and its subtopics,
// Subject → Topic → the topic's page. Where you are is in the URL
// (?subject=&topic=), so Back steps out and a link opens a topic directly.
//
// UI pass (2026-11-16): subjects show how many lessons are written; topics show
// how far you've read; a topic page ends with the previous and next topic, so a
// study run doesn't go back to the grid between topics.
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SYLLABUS_SUBJECTS } from '@ree/shared';
import { Card, Grid, IconChip, ProgressIndicator, StatusPill } from '../../components/ui';
import { ChevronRight, Sigma, Wrench, Zap } from '../../components/ui/icons';
import { useStore } from '../../store/useStore';
import { useSubtopics } from '../syllabus/useSubtopics';
import { hasLesson } from './lessonContent';
import TopicLesson from './TopicLesson';

const NO_ROWS = [];
const NO_TOS = {};
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const SUBJECT_ICON = { Mathematics: Sigma, ESAS: Wrench, EE: Zap };
const SUBJECT_TONE = { Mathematics: 'signal', ESAS: 'amber', EE: 'accent' };

function SubjectTile({ subject, topics, ready, onClick }) {
  return (
    <Card as="button" type="button" variant="interactive" padding="md" onClick={onClick} className="text-left flex flex-col gap-3 cursor-pointer w-full h-full">
      <div className="flex items-center gap-3 min-w-0">
        <IconChip icon={SUBJECT_ICON[subject] || Sigma} tone={SUBJECT_TONE[subject] || 'accent'} />
        <div className="min-w-0 flex-1">
          <p className="text-fluid-lg font-bold text-textMain leading-snug">{subject}</p>
          <p className="text-xs text-muted2">{plural(topics, 'topic')}</p>
        </div>
        <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0" />
      </div>
      <div className="mt-auto"><ProgressIndicator size="sm" tone="success" value={ready} max={Math.max(1, topics)} label={`${ready} of ${topics} lessons written`} /></div>
    </Card>
  );
}

function TopicTile({ index, topic, ready, read, total, onClick }) {
  return (
    <Card
      as="button"
      type="button"
      variant="interactive"
      padding="sm"
      onClick={onClick}
      className="text-left flex flex-col gap-2 cursor-pointer w-full h-full"
    >
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-xs text-muted2 tabular-nums mt-1 w-5 shrink-0 whitespace-nowrap">{index}.</span>
        <p className="flex-1 min-w-0 text-fluid-base font-bold text-textMain leading-snug [overflow-wrap:anywhere]">{topic}</p>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0 mt-0.5" />
      </div>
      <div className="mt-auto flex items-center gap-2 flex-wrap pl-7">
        <StatusPill tone={ready ? 'success' : 'neutral'} dot={false}>{ready ? 'Lesson ready' : 'Lesson coming'}</StatusPill>
        {total > 0 && <span className="text-xs text-muted2 tabular-nums">{read > 0 ? `${read} of ${total} read` : plural(total, 'subtopic')}</span>}
      </div>
      {read > 0 && <ProgressIndicator size="sm" tone="success" value={read} max={total} ariaLabel={`${topic}: ${read} of ${total} subtopics read`} className="pl-7" />}
    </Card>
  );
}

function Trail({ items }) {
  return (
    <nav aria-label="Lessons location" className="flex items-center gap-1.5 flex-wrap text-sm">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5 min-w-0 max-w-full">
          {i > 0 && <ChevronRight size={13} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0" />}
          {it.onClick ? (
            <button type="button" onClick={it.onClick} className="inline-flex items-center pointer-coarse:min-h-11 text-left text-muted2 hover:text-textMain transition-colors cursor-pointer min-w-0 [overflow-wrap:anywhere]">{it.label}</button>
          ) : (
            <span aria-current="page" className="font-semibold text-textMain min-w-0 [overflow-wrap:anywhere]">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function LessonsTab() {
  const [params, setParams] = useSearchParams();
  const tos = useStore((s) => s.dynamicTOS) || NO_TOS;
  const subtopics = useSubtopics();
  const subject = SYLLABUS_SUBJECTS.includes(params.get('subject')) ? params.get('subject') : null;
  const topics = useMemo(() => (subject ? tos[subject] || [] : []), [tos, subject]);
  const topic = subject && topics.includes(params.get('topic')) ? params.get('topic') : null;

  // A step down adds a history entry, so Back steps out again; a new page opens at its top.
  const go = (next) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('tab', 'lessons');
      for (const k of ['subject', 'topic']) {
        if (next[k]) p.set(k, next[k]);
        else p.delete(k);
      }
      return p;
    });
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0 }); } catch { /* jsdom */ }
    }
  };

  const rowsOf = (s, t) => subtopics.byTopic.get(subtopics.topicIdOf(s, t)) || NO_ROWS;
  const progressOf = (s, t) => {
    const on = rowsOf(s, t).filter((r) => !r.off);
    return { read: on.filter((r) => r.done).length, total: on.length };
  };
  const trail = [
    { label: 'Lessons', onClick: subject ? () => go({}) : null },
    ...(subject ? [{ label: subject, onClick: topic ? () => go({ subject }) : null }] : []),
    ...(topic ? [{ label: topic, onClick: null }] : []),
  ];
  const at = topic ? topics.indexOf(topic) : -1;
  const neighbour = (i) => (i >= 0 && i < topics.length ? { topic: topics[i], ready: hasLesson(subject, topics[i]), go: () => go({ subject, topic: topics[i] }) } : null);

  return (
    <div className="flex flex-col gap-5 animate-in fade-in">
      {!topic && <h2 className="sr-only">Lessons</h2>}
      {/* A topic's page carries the trail in its reading column, so they line up. */}
      {!topic && <Trail items={trail} />}

      {!subject && (
        <>
          <p className="text-sm text-muted2 max-w-prose">Every topic of the board exam, subtopic by subtopic: what it's about, the key ideas, a worked example, the traps, and its formula cards and drills.</p>
          <Grid as="ul" kind="cards" gap="sm" aria-label="Subjects">
            {SYLLABUS_SUBJECTS.map((s) => {
              const list = tos[s] || [];
              return (
                <li key={s}>
                  <SubjectTile subject={s} topics={list.length} ready={list.filter((t) => hasLesson(s, t)).length} onClick={() => go({ subject: s })} />
                </li>
              );
            })}
          </Grid>
        </>
      )}

      {subject && !topic && (
        <Grid as="ul" kind="cards" gap="sm" aria-label={`${subject} topics`}>
          {topics.map((t, i) => {
            const { read, total } = progressOf(subject, t);
            return (
              <li key={t}>
                <TopicTile index={i + 1} topic={t} ready={hasLesson(subject, t)} read={read} total={total} onClick={() => go({ subject, topic: t })} />
              </li>
            );
          })}
        </Grid>
      )}

      {topic && (
        <TopicLesson
          key={`${subject}|${topic}`}
          subject={subject}
          topic={topic}
          topicId={subtopics.topicIdOf(subject, topic)}
          rows={rowsOf(subject, topic)}
          ready={subtopics.ready}
          actions={subtopics.actions}
          previous={neighbour(at - 1)}
          next={neighbour(at + 1)}
          trail={<Trail items={trail} />}
        />
      )}
    </div>
  );
}
