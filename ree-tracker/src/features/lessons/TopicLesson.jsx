// Library › Lessons › a topic (2026-11-16): the topic's lesson, a section per
// syllabus subtopic in the learner's order, each with its formula cards, a
// drill when the subtopic has enough questions, and the learner's read tick
// (the same tick as Progress › Syllabus). A topic whose lesson isn't written
// yet still lists its subtopics with their cards and drills.
//
// UI pass (2026-11-16): read progress at the top and in Contents; "In short"
// leads each section; key ideas and traps carry an icon as well as a colour;
// formula cards fold (a lesson reads first, flashcards on demand); each section
// ends with a way back to Contents, and the page with the previous and next topic.
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lazy } from '../../utils/lazyWithRetry';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Disclosure, ProgressIndicator, Skeleton } from '../../components/ui';
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronUp, TriangleAlert } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import Flashcard from '../reference/Flashcard';
import { useReferenceCards } from '../reference/useReferenceCards';
import { topicCardsLink } from '../reference/topicCards';
import { useTopicDrills } from '../syllabus/subtopicChoices';
import { launchPractice, subtopicDrillPreset } from '../active-recall/presets';
import { loadLesson, sectionFor } from './lessonContent';

// The drawings of Units and tools › Shapes, for a section's `figures` (2026-11-16):
// lazy, so only lessons that show a figure fetch them.
const ShapeFigure = lazy(() => import('../conversion/shapes/ShapeFigure'));

function Figures({ list }) {
  return (
    <Suspense fallback={<Skeleton className="h-32 w-full max-w-[15rem]" />}>
      {/* Two to a row on a phone, so three drawings don't fill the screen. */}
      <div className={`${list.length > 1 ? 'grid grid-cols-2' : 'flex'} sm:flex sm:flex-wrap items-end gap-x-4 sm:gap-x-6 gap-y-3 text-textMain`}>
        {list.map((f) => (
          <div key={`${f.figure}${f.n ?? ''}`} className="min-w-0 w-full max-w-[15rem]"><ShapeFigure {...f} /></div>
        ))}
      </div>
    </Suspense>
  );
}

const anchorOf = (row) => `lesson-${row.id}`;
const CONTENTS = 'lesson-contents';
// Lesson text at a readable measure, even on a wide screen.
const MEASURE = 'max-w-[68ch]';

function Markdown({ text, lead = false }) {
  return (
    <div className={`${MEASURE} ${lead ? 'text-fluid-base' : 'text-sm'} text-textMain leading-relaxed min-w-0 math-scroll-mobile [&_p]:my-1.5`}>
      <LatexRenderer content={text} />
    </div>
  );
}

function IconList({ items, icon: Icon, iconColor }) {
  return (
    <ul className={`flex flex-col gap-2 ${MEASURE}`}>
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-textMain leading-relaxed min-w-0">
          <Icon size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 mt-0.5" style={{ color: iconColor }} />
          <div className="min-w-0 flex-1 math-scroll-mobile [&_p]:!m-0"><LatexRenderer content={t} /></div>
        </li>
      ))}
    </ul>
  );
}

function SubtopicSection({ index, row, section, cards, questions, onPractise, onToggleRead }) {
  return (
    <section id={anchorOf(row)} aria-labelledby={`${anchorOf(row)}-h`} className="flex flex-col gap-4 scroll-mt-20 min-w-0 border-t border-border pt-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="shrink-0 grid place-items-center w-8 h-8 rounded-full text-sm font-bold tabular-nums border"
          style={row.done
            ? { background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)', borderColor: 'var(--accent-success)', color: 'var(--text-main)' }
            : { borderColor: 'var(--border-light)', color: 'var(--text-muted)' }}
        >
          {row.done ? <Check size={15} strokeWidth={2.5} /> : index}
        </span>
        <h3 id={`${anchorOf(row)}-h`} className="text-fluid-lg font-bold text-textMain leading-snug pt-0.5 [overflow-wrap:anywhere]">
          <span className="sr-only">{index}. </span>{row.name}{row.done && <span className="sr-only"> (read)</span>}
        </h3>
      </div>

      {section ? (
        <>
          {section.inShort && <Markdown text={section.inShort} lead />}
          {section.figures?.length > 0 && <Figures list={section.figures} />}
          {section.keyIdeas?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-eyebrow">Key ideas</p>
              <IconList items={section.keyIdeas} icon={CheckCircle2} iconColor="var(--accent-success)" />
            </div>
          )}
          {section.example && (
            <Disclosure title="Worked example" description="Try it first, then open the solution.">
              <div className={`flex flex-col gap-3 ${MEASURE}`}>
                <Markdown text={section.example.problem} />
                <div className="border-t border-border pt-3">
                  <p className="text-eyebrow mb-1">Solution</p>
                  <Markdown text={section.example.solution} />
                </div>
              </div>
            </Disclosure>
          )}
          {section.traps?.length > 0 && (
            <div
              className={`flex flex-col gap-2 rounded-[var(--radius-default)] border p-3 ${MEASURE}`}
              style={{ background: 'color-mix(in srgb, var(--color-reeAmber) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--color-reeAmber) 35%, transparent)' }}
            >
              <p className="text-eyebrow">Board traps</p>
              <IconList items={section.traps} icon={TriangleAlert} iconColor="var(--color-reeAmber-text)" />
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted2">{row.own ? 'Your own subtopic.' : 'The lesson for this subtopic is coming.'}</p>
      )}

      {cards.length > 0 && (
        <Disclosure title={`Formula cards · ${cards.length}`} description="Tap a card to flip it.">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
            {cards.map((card) => <Flashcard key={card.id} card={card} hideTag />)}
          </div>
        </Disclosure>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {questions > 0 && (
          <Button size="sm" onClick={() => onPractise(row)}>Practise this subtopic <span className="tabular-nums opacity-80">· {questions}</span></Button>
        )}
        <Button size="sm" variant="secondary" aria-pressed={row.done} onClick={() => onToggleRead(row)}>
          {row.done ? <><Check size={14} strokeWidth={2} aria-hidden="true" /> Read</> : 'Mark as read'}
        </Button>
        <Button as="a" href={`#${CONTENTS}`} size="sm" variant="ghost" className="ml-auto text-muted2">
          <ChevronUp size={14} strokeWidth={1.75} aria-hidden="true" /> Contents
        </Button>
      </div>
    </section>
  );
}

function TopicStep({ to, direction }) {
  const Icon = direction === 'previous' ? ChevronLeft : ArrowRight;
  return (
    <Card as="button" type="button" variant="interactive" padding="sm" onClick={to.go}
      className={`flex flex-col gap-1 cursor-pointer min-w-0 w-full h-full ${direction === 'next' ? 'text-right items-end' : 'text-left items-start'}`}>
      <span className="text-eyebrow flex items-center gap-1">
        {direction === 'previous' && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
        {direction === 'previous' ? 'Previous topic' : 'Next topic'}
        {direction === 'next' && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      </span>
      <span className="text-sm font-semibold text-textMain [overflow-wrap:anywhere]">{to.topic}</span>
      {!to.ready && <span className="text-xs text-muted2">Lesson coming</span>}
    </Card>
  );
}

/**
 * @param {{ subject: string, topic: string, topicId: string|null, rows: Array, ready: boolean, actions: object,
 *   previous?: { topic, ready, go }|null, next?: { topic, ready, go }|null }} props
 * rows: the topic's subtopics as this learner sees them (useSubtopics).
 */
export default function TopicLesson({ subject, topic, topicId, rows, ready, actions, previous = null, next = null }) {
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
  const readCount = shown.filter((r) => r.done).length;

  const practise = (row) => launchPractice(navigate, subtopicDrillPreset({ subject, topic, subtopicId: row.subtopicId, subtopicName: row.name }));
  const toggleRead = (row) => {
    actions.setDone(row, topicId, !row.done).catch(() => toast.error('Couldn’t save that. It will try again when you’re back online.'));
  };

  const cardsTo = topicCardsLink(subject, topic);
  return (
    <article aria-labelledby="lesson-title" className="flex flex-col gap-6 min-w-0">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-eyebrow">{subject}</p>
          <h2 id="lesson-title" className="text-h2 text-textMain [overflow-wrap:anywhere]">{topic}</h2>
        </div>
        {content === undefined ? <Skeleton className="h-12" /> : content?.overview ? (
          <Markdown text={content.overview} lead />
        ) : (
          <p className="text-sm text-muted2">The lesson for this topic is coming. Its subtopics, formula cards and drills are below.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
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
          <Card id={CONTENTS} padding="md" className="flex flex-col gap-3 scroll-mt-20">
            <nav aria-label="Contents" className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <p className="text-eyebrow">Contents · {shown.length} subtopics</p>
                <ProgressIndicator size="sm" tone="success" value={readCount} max={shown.length} label={readCount ? `${readCount} of ${shown.length} read` : 'Mark each one read as you go'} />
              </div>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {shown.map((row, i) => (
                  <li key={row.id} className="min-w-0">
                    <a href={`#${anchorOf(row)}`} className="flex items-baseline gap-2 py-1.5 pointer-coarse:min-h-11 pointer-coarse:items-center text-sm text-textMain hover:text-[var(--accent-text)] [overflow-wrap:anywhere]">
                      <span className="text-muted2 tabular-nums w-5 shrink-0">{i + 1}.</span>
                      <span className="flex-1 min-w-0">{row.name}</span>
                      {row.done && <><Check size={13} strokeWidth={2.5} aria-hidden="true" className="shrink-0" style={{ color: 'var(--accent-success)' }} /><span className="sr-only">read</span></>}
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
        <footer className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-eyebrow">Sources</p>
          <ul className="flex flex-wrap gap-1.5">{content.sources.map((s) => <li key={s}><Badge tone="neutral">{s}</Badge></li>)}</ul>
        </footer>
      )}

      {(previous || next) && (
        <nav aria-label="More topics" className="grid grid-cols-2 gap-3">
          <div className="min-w-0">{previous && <TopicStep to={previous} direction="previous" />}</div>
          <div className="min-w-0">{next && <TopicStep to={next} direction="next" />}</div>
        </nav>
      )}
    </article>
  );
}
