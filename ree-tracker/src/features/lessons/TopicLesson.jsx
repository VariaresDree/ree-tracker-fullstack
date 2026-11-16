// Library › Lessons › a topic (2026-11-16): the topic's lesson, a section per
// syllabus subtopic in the learner's order, each with its formula cards, a
// drill when the subtopic has enough questions, and the learner's read tick
// (the same tick as Progress › Syllabus). A topic whose lesson isn't written
// yet still lists its subtopics with their cards and drills.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Disclosure, Skeleton, StatusPill } from '../../components/ui';
import { BookOpen, Check } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import Flashcard from '../reference/Flashcard';
import { useReferenceCards } from '../reference/useReferenceCards';
import { topicCardsLink } from '../reference/topicCards';
import { useTopicDrills } from '../syllabus/subtopicChoices';
import { launchPractice, subtopicDrillPreset } from '../active-recall/presets';
import { loadLesson, sectionFor } from './lessonContent';

const anchorOf = (row) => `lesson-${row.id}`;

function Markdown({ text }) {
  return <div className="text-sm text-textMain leading-relaxed min-w-0 math-scroll-mobile [&_p]:my-1.5"><LatexRenderer content={text} /></div>;
}

function Bullets({ items }) {
  return (
    <ul className="flex flex-col gap-1.5 list-disc pl-5 marker:text-muted2">
      {items.map((t, i) => <li key={i} className="text-sm text-textMain min-w-0 [&_p]:!m-0 [&_p]:inline"><LatexRenderer content={t} /></li>)}
    </ul>
  );
}

function SubtopicSection({ index, row, section, cards, questions, onPractise, onToggleRead }) {
  return (
    <section id={anchorOf(row)} aria-labelledby={`${anchorOf(row)}-h`} className="flex flex-col gap-3 scroll-mt-20 min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 id={`${anchorOf(row)}-h`} className="text-fluid-lg font-bold text-textMain [overflow-wrap:anywhere]">
          <span className="text-muted2 tabular-nums">{index}.</span> {row.name}
        </h3>
        {row.done && <StatusPill tone="success" dot={false}>Read</StatusPill>}
      </div>

      {section ? (
        <>
          {section.inShort && (
            <div>
              <p className="text-eyebrow mb-1">In short</p>
              <Markdown text={section.inShort} />
            </div>
          )}
          {section.keyIdeas?.length > 0 && (
            <div>
              <p className="text-eyebrow mb-1">Key ideas</p>
              <Bullets items={section.keyIdeas} />
            </div>
          )}
          {section.example && (
            <Disclosure title="Worked example" description="Try it first, then open the solution.">
              <div className="flex flex-col gap-3">
                <Markdown text={section.example.problem} />
                <div className="border-t border-border pt-3">
                  <p className="text-eyebrow mb-1">Solution</p>
                  <Markdown text={section.example.solution} />
                </div>
              </div>
            </Disclosure>
          )}
          {section.traps?.length > 0 && (
            <div>
              <p className="text-eyebrow mb-1">Board traps</p>
              <Bullets items={section.traps} />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted2">{row.own ? 'Your own subtopic.' : 'The lesson for this subtopic is coming.'}</p>
      )}

      {cards.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-eyebrow">Formula cards · {cards.length}</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
            {cards.map((card) => <Flashcard key={card.id} card={card} hideTag />)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {questions > 0 && (
          <Button size="sm" onClick={() => onPractise(row)}>Practise this subtopic <span className="tabular-nums opacity-80">· {questions}</span></Button>
        )}
        <Button size="sm" variant={row.done ? 'secondary' : 'ghost'} aria-pressed={row.done} onClick={() => onToggleRead(row)}>
          {row.done ? <><Check size={14} strokeWidth={2} aria-hidden="true" /> Read</> : 'Mark as read'}
        </Button>
      </div>
    </section>
  );
}

/**
 * @param {{ subject: string, topic: string, topicId: string|null, rows: Array, ready: boolean, actions: object }} props
 * rows: the topic's subtopics as this learner sees them (useSubtopics).
 */
export default function TopicLesson({ subject, topic, topicId, rows, ready, actions }) {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState({ key: null, value: undefined });
  const key = `${subject}|${topic}`;
  useEffect(() => {
    let live = true;
    loadLesson(subject, topic)
      .then((value) => { if (live) setLesson({ key, value }); })
      .catch(() => { if (live) setLesson({ key, value: null }); });
    return () => { live = false; };
  }, [subject, topic, key]);
  const content = lesson.key === key ? lesson.value : undefined;

  const { cards } = useReferenceCards();
  const cardsBySubtopic = useMemo(() => {
    const out = new Map();
    for (const c of cards) {
      if (c.subject !== subject || c.topic?.name !== topic || !c.subtopic?.id) continue;
      if (!out.has(c.subtopic.id)) out.set(c.subtopic.id, []);
      out.get(c.subtopic.id).push(c);
    }
    return out;
  }, [cards, subject, topic]);
  const drills = useTopicDrills(topicId);
  const shown = rows.filter((r) => !r.off);

  const practise = (row) => launchPractice(navigate, subtopicDrillPreset({ subject, topic, subtopicId: row.subtopicId, subtopicName: row.name }));
  const toggleRead = (row) => {
    actions.setDone(row, topicId, !row.done).catch(() => toast.error('Couldn’t save that. It will try again when you’re back online.'));
  };

  const cardsTo = topicCardsLink(subject, topic);
  return (
    <article aria-labelledby="lesson-title" className="flex flex-col gap-6 min-w-0">
      <header className="flex flex-col gap-2">
        <p className="text-eyebrow">{subject}</p>
        <h2 id="lesson-title" className="text-h2 text-textMain [overflow-wrap:anywhere]">{topic}</h2>
        {content === undefined ? <Skeleton className="h-12" /> : content?.overview ? (
          <Markdown text={content.overview} />
        ) : (
          <p className="text-sm text-muted2">The lesson for this topic is coming. Its subtopics, formula cards and drills are below.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button as={Link} to={cardsTo.to} state={cardsTo.state} size="sm" variant="secondary">
            <BookOpen size={14} strokeWidth={1.75} aria-hidden="true" /> All its formula cards
          </Button>
        </div>
      </header>

      {!ready && shown.length === 0 ? (
        <Skeleton className="h-40" />
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted2">This topic has no subtopics listed yet.</p>
      ) : (
        <>
          <Card padding="md" className="flex flex-col gap-2">
            <nav aria-label="Contents">
              <p className="text-eyebrow mb-2">Contents · {shown.length} subtopics</p>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {shown.map((row, i) => (
                  <li key={row.id} className="min-w-0">
                    <a href={`#${anchorOf(row)}`} className="inline-flex items-baseline gap-2 py-1 pointer-coarse:min-h-11 text-sm text-textMain hover:text-[var(--accent-text)] [overflow-wrap:anywhere]">
                      <span className="text-muted2 tabular-nums">{i + 1}.</span>
                      <span>{row.name}</span>
                      {row.done && <><Check size={13} strokeWidth={2.5} aria-hidden="true" style={{ color: 'var(--accent-success)' }} /><span className="sr-only">read</span></>}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </Card>
          {shown.map((row, i) => (
            <SubtopicSection
              key={row.id}
              index={i + 1}
              row={row}
              section={content ? sectionFor(content, row.suggestedName || row.name) : null}
              cards={(row.subtopicId && cardsBySubtopic.get(row.subtopicId)) || []}
              questions={(row.subtopicId && drills.counts.get(row.subtopicId)) || 0}
              onPractise={practise}
              onToggleRead={toggleRead}
            />
          ))}
        </>
      )}

      {content?.sources?.length > 0 && (
        <footer className="flex flex-col gap-1 border-t border-border pt-4">
          <p className="text-eyebrow">Sources</p>
          <ul className="flex flex-wrap gap-1.5">{content.sources.map((s) => <li key={s}><Badge tone="neutral">{s}</Badge></li>)}</ul>
        </footer>
      )}
    </article>
  );
}
