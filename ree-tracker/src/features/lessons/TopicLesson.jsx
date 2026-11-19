// Library › Lessons › a topic (2026-11-16): the topic's lesson, a section per
// syllabus subtopic in the learner's order, each with its formula cards, a
// drill when the subtopic has enough questions, and the learner's read tick
// (the same tick as Progress › Syllabus). A topic whose lesson isn't written
// yet still lists its subtopics with their cards and drills.
//
// UI pass (2026-11-16): read progress at the top and in Contents; "In short"
// leads each section; key ideas and traps carry an icon as well as a colour;
// each section ends with a way back to Contents, and the page with the previous
// and next topic.
//
// Module pass (2026-11-19): a lesson reads like a review module. A section can
// carry a discussion (`body`: paragraphs, tables and figures, each figure framed
// and numbered), "Remember", its key formulas (its formula cards as rows, open
// when there are six or fewer), worked examples revealed a step at a time
// (`examples`), the traps, and "Check yourself" questions (`check`). On a wide
// screen Contents is a rail that stays beside the lesson and marks where you
// are; on a phone a slim bar ("3 / 12 · Nodal Analysis") floats under the header
// once Contents has scrolled away, and opens it as a sheet. Ticking the last
// subtopic also ticks the topic's Read, as Progress › Syllabus does.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lazy } from '../../utils/lazyWithRetry';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Disclosure, Modal, ProgressIndicator, Skeleton } from '../../components/ui';
import { ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronUp, Lightbulb, ListChecks, RotateCcw, TriangleAlert } from '../../components/ui/icons';
import LatexRenderer from '../../components/LatexRenderer';
import ErrorBoundary from '../../components/ErrorBoundary';
import useMediaQuery from '../../hooks/useMediaQuery';
import { FormulaList } from '../reference/QuickSheet';
import { useReferenceCards } from '../reference/useReferenceCards';
import { topicCardsLink } from '../reference/topicCards';
import { useTopicDrills } from '../syllabus/subtopicChoices';
import { useSyllabus } from '../syllabus/useSyllabus';
import { launchPractice, subtopicDrillPreset } from '../active-recall/presets';
import { loadLesson, sectionFor } from './lessonContent';

// A lesson's drawings (the kit, and the Shapes drawings), lazy, so only lessons
// that show a figure fetch them.
const LessonFigure = lazy(() => import('./figures/LessonFigure'));

const anchorOf = (row) => `lesson-${row.id}`;
const CONTENTS = 'lesson-contents';
// Lesson text at a readable measure, even on a wide screen.
const MEASURE = 'max-w-[68ch]';
// The rail needs room beside the lesson: the sidebar takes ~20rem at this width.
const RAIL = '(min-width: 1280px)';
// A key-formulas list this short is part of the reading; a longer one folds.
const OPEN_FORMULAS = 6;
const SYLLABUS_FRESH_MS = 30 * 60 * 1000;
const tint = (colour, fill = 8, edge = 35) => ({
  background: `color-mix(in srgb, ${colour} ${fill}%, transparent)`,
  borderColor: `color-mix(in srgb, ${colour} ${edge}%, transparent)`,
});

// The legacy `figures`: the drawings of Units and tools › Shapes, two to a row on a phone.
function Figures({ list }) {
  return (
    <Suspense fallback={<Skeleton className="h-32 w-full max-w-[15rem]" />}>
      <div className={`${list.length > 1 ? 'grid grid-cols-2' : 'flex'} sm:flex sm:flex-wrap items-end gap-x-4 sm:gap-x-6 gap-y-3 text-textMain`}>
        {list.map((f) => (
          <div key={`${f.figure}${f.n ?? ''}`} className="min-w-0 w-full max-w-[15rem]"><LessonFigure {...f} /></div>
        ))}
      </div>
    </Suspense>
  );
}

// A drawing in the discussion: framed, numbered and captioned.
function Figure({ spec, number }) {
  const { caption, ...drawing } = spec;
  return (
    <figure className="flex flex-col items-center gap-2 w-full max-w-[36rem] rounded-[var(--radius-default)] border border-border bg-surface2/40 p-3 sm:p-4 text-textMain">
      {/* A drawing that can't be drawn costs the figure, never the lesson. */}
      <ErrorBoundary name="This figure">
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <div className="w-full flex justify-center min-w-0"><LessonFigure {...drawing} /></div>
        </Suspense>
      </ErrorBoundary>
      <figcaption className="text-xs text-muted2 text-center">
        <span className="font-semibold text-textMain">Figure {number}</span>{caption && <> · {caption}</>}
      </figcaption>
    </figure>
  );
}

function Markdown({ text, lead = false }) {
  return (
    <div className={`${MEASURE} ${lead ? 'text-fluid-base' : 'text-sm'} text-textMain leading-relaxed min-w-0 math-scroll-mobile [&_p]:my-1.5`}>
      <LatexRenderer content={text} />
    </div>
  );
}

// The discussion: paragraphs (Markdown, tables included) with figures among them.
function Body({ items, section }) {
  const isFigure = (item) => typeof item !== 'string';
  return items.map((item, i) => (isFigure(item)
    ? <Figure key={i} spec={item} number={`${section}.${items.slice(0, i + 1).filter(isFigure).length}`} />
    : <Markdown key={i} text={item} />));
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

function KeyFormulas({ cards }) {
  if (cards.length > OPEN_FORMULAS) {
    return (
      <Disclosure title={`Key formulas · ${cards.length}`} description="Tap a formula for its symbols and board tip.">
        <FormulaList cards={cards} />
      </Disclosure>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-eyebrow">Key formulas</p>
      <Card variant="inset" padding="sm" className="!py-0">
        <FormulaList cards={cards} />
      </Card>
    </div>
  );
}

const LEVELS = { basic: 'Basic', board: 'Board level' };

// A worked example a step at a time: try it, then check each step against yours.
function Example({ example, number }) {
  const steps = example.steps || [];
  const [shown, setShown] = useState(0);
  const all = shown >= steps.length;
  return (
    <Card variant="inset" padding="md" className={`flex flex-col gap-3 ${MEASURE}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-eyebrow">Worked example {number}</p>
        {example.level && <Badge tone={example.level === 'board' ? 'signal' : 'neutral'}>{LEVELS[example.level] || example.level}</Badge>}
      </div>
      {example.title && <p className="text-sm font-semibold text-textMain">{example.title}</p>}
      <Markdown text={example.problem} />
      {shown > 0 && (
        <ol aria-label={`Worked example ${number} solution`} className="flex flex-col gap-2 border-t border-border pt-3">
          {steps.slice(0, shown).map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 min-w-0">
              <span aria-hidden="true" className="shrink-0 grid place-items-center w-6 h-6 mt-0.5 rounded-full border border-border2 text-xs tabular-nums text-muted2">{i + 1}</span>
              <div className="min-w-0 flex-1"><Markdown text={step} /></div>
            </li>
          ))}
        </ol>
      )}
      {all && example.answer && (
        <div className="rounded-[var(--radius-default)] border px-3 py-2" style={tint('var(--accent-success)', 10)}>
          <p className="text-eyebrow">Answer</p>
          <Markdown text={example.answer} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {all ? (
          <Button size="sm" variant="ghost" onClick={() => setShown(0)}>
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" /> Try it again
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={() => setShown((s) => s + 1)}>Show step {shown + 1} of {steps.length}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShown(steps.length)}>Show all</Button>
          </>
        )}
      </div>
    </Card>
  );
}

// The one-example format the first lessons were written in.
function LegacyExample({ example }) {
  return (
    <Disclosure title="Worked example" description="Try it first, then open the solution.">
      <div className={`flex flex-col gap-3 ${MEASURE}`}>
        <Markdown text={example.problem} />
        <div className="border-t border-border pt-3">
          <p className="text-eyebrow mb-1">Solution</p>
          <Markdown text={example.solution} />
        </div>
      </div>
    </Disclosure>
  );
}

function CheckItem({ item, number }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="flex flex-col gap-2 py-3 min-w-0">
      <div className="flex items-start gap-2.5 min-w-0">
        <span aria-hidden="true" className="shrink-0 text-sm font-semibold tabular-nums text-muted2 pt-px">{number}.</span>
        <Markdown text={item.q} />
      </div>
      {open ? (
        <div className={`rounded-[var(--radius-default)] border px-3 py-2 ${MEASURE}`} style={tint('var(--accent-success)', 10)}>
          <Markdown text={item.a} />
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="self-start" aria-label={`Show answer to question ${number}`} onClick={() => setOpen(true)}>Show answer</Button>
      )}
    </li>
  );
}

function CheckYourself({ items }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-eyebrow flex items-center gap-1.5">
        <Lightbulb size={13} strokeWidth={2} aria-hidden="true" /> Check yourself
      </p>
      <ol className="divide-y divide-border">
        {items.map((item, i) => <CheckItem key={i} item={item} number={i + 1} />)}
      </ol>
    </div>
  );
}

function SubtopicSection({ index, row, section, cards, questions, onPractise, onToggleRead, contentsLink }) {
  const examples = section?.examples || [];
  return (
    <section id={anchorOf(row)} aria-labelledby={`${anchorOf(row)}-h`} className="flex flex-col gap-4 scroll-mt-28 min-w-0 border-t border-border pt-6">
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
          {section.body?.length > 0 && <Body items={section.body} section={index} />}
          {section.keyIdeas?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-eyebrow">{section.body?.length > 0 ? 'Remember' : 'Key ideas'}</p>
              <IconList items={section.keyIdeas} icon={CheckCircle2} iconColor="var(--accent-success)" />
            </div>
          )}
          {cards.length > 0 && <KeyFormulas cards={cards} />}
          {examples.map((ex, i) => <Example key={i} example={ex} number={i + 1} />)}
          {examples.length === 0 && section.example && <LegacyExample example={section.example} />}
          {section.traps?.length > 0 && (
            <div className={`flex flex-col gap-2 rounded-[var(--radius-default)] border p-3 ${MEASURE}`} style={tint('var(--color-reeAmber)')}>
              <p className="text-eyebrow">Board traps</p>
              <IconList items={section.traps} icon={TriangleAlert} iconColor="var(--color-reeAmber-text)" />
            </div>
          )}
          {section.check?.length > 0 && <CheckYourself items={section.check} />}
        </>
      ) : (
        <>
          <p className="text-sm text-muted2">{row.own ? 'Your own subtopic.' : 'The lesson for this subtopic is coming.'}</p>
          {cards.length > 0 && <KeyFormulas cards={cards} />}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {questions > 0 && (
          <Button size="sm" onClick={() => onPractise(row)}>Practise this subtopic <span className="tabular-nums opacity-80">· {questions}</span></Button>
        )}
        <Button size="sm" variant="secondary" aria-pressed={row.done} onClick={() => onToggleRead(row)}>
          {row.done ? <><Check size={14} strokeWidth={2} aria-hidden="true" /> Read</> : 'Mark as read'}
        </Button>
        {contentsLink && (
          <Button as="a" href={`#${CONTENTS}`} size="sm" variant="ghost" className="ml-auto text-muted2">
            <ChevronUp size={14} strokeWidth={1.75} aria-hidden="true" /> Contents
          </Button>
        )}
      </div>
    </section>
  );
}

// The subtopics as links, the one you're reading marked (aria-current).
function ContentsList({ rows, current, onPick, className = 'flex flex-col' }) {
  return (
    <ol className={className}>
      {rows.map((row, i) => {
        const here = current === anchorOf(row);
        return (
          <li key={row.id} className="min-w-0">
            <a
              href={`#${anchorOf(row)}`}
              onClick={onPick}
              aria-current={here ? 'location' : undefined}
              className={`flex items-baseline gap-2 py-1.5 px-2 -mx-2 rounded-[var(--radius-sm)] pointer-coarse:min-h-11 pointer-coarse:items-center text-sm hover:text-[var(--accent-text)] ${here ? 'bg-surface2 font-semibold text-[var(--accent-text)]' : 'text-textMain'}`}
            >
              <span className="text-muted2 tabular-nums min-w-6 shrink-0 whitespace-nowrap">{i + 1}.</span>
              <span className="flex-1 min-w-0 [overflow-wrap:anywhere]">{row.name}</span>
              {row.done && <><Check size={13} strokeWidth={2.5} aria-hidden="true" className="shrink-0" style={{ color: 'var(--accent-success)' }} /><span className="sr-only">read</span></>}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

function ContentsHead({ read, total }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-eyebrow">Contents · {total} subtopics</p>
      <ProgressIndicator size="sm" tone="success" value={read} max={total} label={read ? `${read} of ${total} read` : 'Mark each one read as you go'} />
    </div>
  );
}

// The section in the reading band near the top of the screen, as you scroll.
function useCurrentSection(key) {
  const [current, setCurrent] = useState(null);
  useEffect(() => {
    const ids = key ? key.split('|') : [];
    if (ids.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;
    const showing = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) showing.set(e.target.id, e.isIntersecting);
      const first = ids.find((id) => showing.get(id));
      if (first) setCurrent(first);
    }, { rootMargin: '-15% 0px -60% 0px' });
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [key]);
  return current;
}

// Whether an element has scrolled up out of view (not merely below it).
function useScrolledPast(ref, active) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!active || !el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [ref, active]);
  return active && past;
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
  const syllabus = useSyllabus({ fetchIfOlderThanMs: SYLLABUS_FRESH_MS });
  const shown = rows.filter((r) => !r.off);
  const readCount = shown.filter((r) => r.done).length;

  const wide = useMediaQuery(RAIL);
  const current = useCurrentSection(shown.map(anchorOf).join('|'));
  const contentsRef = useRef(null);
  const pastContents = useScrolledPast(contentsRef, !wide && shown.length > 0);
  const [picking, setPicking] = useState(false);
  const at = shown.findIndex((r) => anchorOf(r) === current);

  const practise = (row) => launchPractice(navigate, subtopicDrillPreset({ subject, topic, subtopicId: row.subtopicId, subtopicName: row.name }));
  const toggleRead = (row) => {
    const nowDone = !row.done;
    actions.setDone(row, topicId, nowDone).catch(() => toast.error('Couldn’t save that. It will try again when you’re back online.'));
    // The last one read: the topic is read, as Progress › Syllabus ticks it.
    const topicRow = syllabus.topics?.find((t) => t.topicId === topicId);
    if (nowDone && readCount + 1 === shown.length && topicRow && !topicRow.read) {
      syllabus.saveTopic(topicId, { read: true })
        .then(() => toast.success(`${topic} is marked read in your syllabus.`))
        .catch(() => {});
    }
  };

  const cardsTo = topicCardsLink(subject, topic);
  const article = (
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
          {!wide && (
            <>
              <Card id={CONTENTS} ref={contentsRef} padding="md" className="flex flex-col gap-3 scroll-mt-20">
                <nav aria-label="Contents" className="flex flex-col gap-3">
                  <ContentsHead read={readCount} total={shown.length} />
                  <ContentsList rows={shown} current={current} className="grid grid-cols-1 sm:grid-cols-2 gap-x-6" />
                </nav>
              </Card>
              {/* Takes no room: the bar hangs from a zero-height sticky line, so
                  showing it never shifts the lesson. */}
              <div className="sticky top-[var(--sticky-top,0.75rem)] z-30 h-0">
                <div inert={!pastContents} className={`transition-opacity duration-200 ${pastContents ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="bg-surface/90 backdrop-blur-xl reduce-transparency:bg-surface reduce-transparency:backdrop-blur-none border border-border2/60 rounded-[var(--radius-lg)] shadow-sm px-1">
                    <Button variant="ghost" size="sm" fullWidth className="!justify-start gap-2 min-w-0" onClick={() => setPicking(true)} aria-label={`Contents: ${at >= 0 ? `${at + 1} of ${shown.length}, ${shown[at].name}` : `${shown.length} subtopics`}`}>
                      <ListChecks size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
                      <span className="tabular-nums text-muted2 shrink-0">{at >= 0 ? `${at + 1} / ${shown.length}` : 'Contents'}</span>
                      {at >= 0 && <span className="truncate font-semibold text-textMain min-w-0">{shown[at].name}</span>}
                      <ChevronDown size={15} strokeWidth={1.75} aria-hidden="true" className="ml-auto shrink-0" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
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
              contentsLink={!wide}
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

      <Modal open={picking} onClose={() => setPicking(false)} title="Contents" size="sm">
        <div className="flex flex-col gap-3">
          <ContentsHead read={readCount} total={shown.length} />
          <ContentsList rows={shown} current={current} onPick={() => setPicking(false)} />
        </div>
      </Modal>
    </article>
  );

  if (!wide || shown.length === 0) return article;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_16rem] gap-10 items-start">
      {article}
      <div className="sticky top-[calc(var(--sticky-top,0.75rem)+0.5rem)] max-h-[calc(100dvh-var(--sticky-top,0.75rem)-2rem)] overflow-y-auto overscroll-contain pr-1">
        <nav aria-label="Contents" className="flex flex-col gap-3">
          <ContentsHead read={readCount} total={shown.length} />
          <ContentsList rows={shown} current={current} />
        </nav>
      </div>
    </div>
  );
}
