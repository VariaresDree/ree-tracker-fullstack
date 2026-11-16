// Library › Lessons (2026-11-16, first tab): a summary of every topic and its
// subtopics, Subject → Topic → the topic's page. Where you are is in the URL
// (?subject=&topic=), so Back steps out and a link opens a topic directly.
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SYLLABUS_SUBJECTS } from '@ree/shared';
import { Card, Grid, StatusPill } from '../../components/ui';
import { ChevronRight } from '../../components/ui/icons';
import { useStore } from '../../store/useStore';
import { useSubtopics } from '../syllabus/useSubtopics';
import { hasLesson } from './lessonContent';
import TopicLesson from './TopicLesson';

const NO_ROWS = [];
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

function Tile({ eyebrow, label, detail, ready, onClick }) {
  return (
    <Card as="button" type="button" variant="interactive" padding="sm" onClick={onClick} className="text-left flex flex-col gap-2 cursor-pointer">
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0">
          {eyebrow && <p className="text-eyebrow mb-0.5">{eyebrow}</p>}
          <p className="text-fluid-base font-bold text-textMain leading-snug [overflow-wrap:anywhere]">{label}</p>
        </div>
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" className="text-muted shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {ready !== undefined && <StatusPill tone={ready ? 'success' : 'neutral'} dot={false}>{ready ? 'Lesson ready' : 'Lesson coming'}</StatusPill>}
        {detail && <span className="text-xs text-muted2">{detail}</span>}
      </div>
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
  const tos = useStore((s) => s.dynamicTOS) || {};
  const subtopics = useSubtopics();
  const subject = SYLLABUS_SUBJECTS.includes(params.get('subject')) ? params.get('subject') : null;
  const topics = useMemo(() => (subject ? tos[subject] || [] : []), [tos, subject]);
  const topic = subject && topics.includes(params.get('topic')) ? params.get('topic') : null;

  // A step down adds a history entry, so Back steps out again.
  const go = (next) => setParams((prev) => {
    const p = new URLSearchParams(prev);
    p.set('tab', 'lessons');
    for (const k of ['subject', 'topic']) {
      if (next[k]) p.set(k, next[k]);
      else p.delete(k);
    }
    return p;
  });

  const rowsOf = (s, t) => subtopics.byTopic.get(subtopics.topicIdOf(s, t)) || NO_ROWS;
  const trail = [
    { label: 'Lessons', onClick: subject ? () => go({}) : null },
    ...(subject ? [{ label: subject, onClick: topic ? () => go({ subject }) : null }] : []),
    ...(topic ? [{ label: topic, onClick: null }] : []),
  ];

  return (
    <div className="flex flex-col gap-5 animate-in fade-in">
      {!topic && <h2 className="sr-only">Lessons</h2>}
      <Trail items={trail} />

      {!subject && (
        <>
          <p className="text-sm text-muted2 max-w-2xl">A summary of every topic of the board exam, subtopic by subtopic, with its formula cards and a drill for each.</p>
          <Grid as="ul" kind="cards" gap="sm" aria-label="Subjects">
            {SYLLABUS_SUBJECTS.map((s) => {
              const list = tos[s] || [];
              const ready = list.filter((t) => hasLesson(s, t)).length;
              return (
                <li key={s}>
                  <Tile label={s} detail={`${plural(list.length, 'topic')} · ${ready} lesson${ready === 1 ? '' : 's'} ready`} onClick={() => go({ subject: s })} />
                </li>
              );
            })}
          </Grid>
        </>
      )}

      {subject && !topic && (
        <Grid as="ul" kind="cards" gap="sm" aria-label={`${subject} topics`}>
          {topics.map((t) => {
            const n = rowsOf(subject, t).filter((r) => !r.off).length;
            return (
              <li key={t}>
                <Tile label={t} ready={hasLesson(subject, t)} detail={n ? plural(n, 'subtopic') : null} onClick={() => go({ subject, topic: t })} />
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
        />
      )}
    </div>
  );
}
