// Library › Lessons (2026-11-16): Subject → Topic → the topic's page, where
// you are kept in the URL; each subtopic with its lesson, its formula cards, a
// drill when it has the questions, and the read tick shared with Progress.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { axe } from 'vitest-axe';
import * as axeMatchers from 'vitest-axe/matchers';
import { expectNoSkippedLevels } from '../../test/headings';

const ALGEBRA = 't-alg';
const rows = [
  { id: 's1', subtopicId: 's1', name: 'Algebraic Expressions', suggestedName: 'Algebraic Expressions', own: false, off: false, done: true },
  { id: 's2', subtopicId: 's2', name: 'Functions', suggestedName: 'Functions', own: false, off: false, done: false },
  { id: 's3', subtopicId: 's3', name: 'Venn Diagram', suggestedName: 'Venn Diagram', own: false, off: true, done: false },
];
const setDone = vi.fn(() => Promise.resolve());
vi.mock('../syllabus/useSubtopics', () => ({
  useSubtopics: () => ({
    byTopic: new Map([[ALGEBRA, rows]]),
    topicIdOf: (s, t) => (s === 'Mathematics' && t === 'Algebra' ? ALGEBRA : null),
    ready: true,
    actions: { setDone },
  }),
}));
vi.mock('../../store/useStore', () => ({ useStore: (sel) => sel({ dynamicTOS: { Mathematics: ['Algebra', 'Trigonometry'], ESAS: ['Physics for Engineers'], EE: [] } }) }));
const LESSON = {
  topic: 'Algebra',
  overview: 'Algebra is the language of every other topic.',
  sources: ['Schaum’s Outline of College Algebra'],
  subtopics: [
    { name: 'Algebraic Expressions', inShort: 'Rules for exponents and radicals.', keyIdeas: ['$a^m a^n = a^{m+n}$'], example: { problem: 'Simplify $x^2 x^3$.', solution: '$x^5$' }, traps: ['$(a+b)^2 \\ne a^2 + b^2$'] },
  ],
};
vi.mock('./lessonContent', async (orig) => ({
  ...(await orig()),
  hasLesson: (s, t) => s === 'Mathematics' && t === 'Algebra',
  loadLesson: vi.fn(async (s, t) => (s === 'Mathematics' && t === 'Algebra' ? LESSON : null)),
}));
vi.mock('../reference/useReferenceCards', () => ({
  useReferenceCards: () => ({ cards: [
    { id: 'c1', name: 'Product of Powers', subject: 'Mathematics', topic: { name: 'Algebra' }, subtopic: { id: 's1', name: 'Algebraic Expressions' } },
    { id: 'c2', name: 'Sine Law', subject: 'Mathematics', topic: { name: 'Trigonometry' }, subtopic: { id: 'x', name: 'Laws' } },
  ] }),
}));
const saveTopic = vi.fn(() => Promise.resolve('sent'));
vi.mock('../syllabus/useSyllabus', () => ({ useSyllabus: () => ({ topics: [{ topicId: ALGEBRA, read: false }], saveTopic }) }));
vi.mock('../syllabus/subtopicChoices', () => ({ useTopicDrills: () => ({ counts: new Map([['s2', 24]]), accuracy: new Map() }) }));
vi.mock('../reference/Flashcard', () => ({ default: ({ card }) => <p>card {card.name}</p> }));
vi.mock('../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
const navigated = [];
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => (to, opts) => navigated.push({ to, opts }) }));

expect.extend(axeMatchers);
const AXE_OPTS = { rules: { 'color-contrast': { enabled: false }, 'html-has-lang': { enabled: false } } };

const { default: LessonsTab } = await import('./LessonsTab');

function Where() {
  return <p data-testid="where">{useLocation().search}</p>;
}
const at = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes><Route path="/library" element={<><h1>Library</h1><LessonsTab /><Where /></>} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => { navigated.length = 0; setDone.mockClear(); saveTopic.mockClear(); });

describe('Lessons', () => {
  it('subjects, then topics with whether each lesson is ready, kept in the URL', () => {
    at('/library?tab=lessons');
    const maths = screen.getByRole('button', { name: /^Mathematics/ });
    expect(within(maths).getByText('2 topics')).toBeInTheDocument();
    expect(within(maths).getByText('1 of 2 lessons written')).toBeInTheDocument();
    fireEvent.click(maths);
    expect(screen.getByTestId('where').textContent).toContain('subject=Mathematics');
    const algebra = screen.getByRole('button', { name: /Algebra/ });
    expect(within(algebra).getByText('Lesson ready')).toBeInTheDocument();
    // Read progress counts the subtopics that are switched on (Venn Diagram is off).
    expect(within(algebra).getByText('1 of 2 read')).toBeInTheDocument();
    expect(within(algebra).getByRole('progressbar')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /Trigonometry/ })).getByText('Lesson coming')).toBeInTheDocument();
  });

  it('a topic: contents, a section per subtopic with its lesson and cards, switched-off ones left out', async () => {
    at('/library?tab=lessons&subject=Mathematics&topic=Algebra');
    expect(await screen.findByText('Algebra is the language of every other topic.')).toBeInTheDocument();
    const contents = screen.getByRole('navigation', { name: 'Contents' });
    expect(within(contents).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#lesson-s1', '#lesson-s2']);
    expect(within(contents).getByText('1 of 2 read')).toBeInTheDocument();
    const expr = screen.getByRole('region', { name: /Algebraic Expressions/ });
    expect(within(expr).getByText('Rules for exponents and radicals.')).toBeInTheDocument();
    // A short list of key formulas is part of the reading (a long one folds).
    expect(within(expr).getByText('Key formulas')).toBeInTheDocument();
    expect(within(expr).getByText('Product of Powers')).toBeInTheDocument();
    expect(within(expr).getByRole('link', { name: /Contents/ })).toHaveAttribute('href', '#lesson-contents');
    expect(within(expr).getByText('Worked example')).toBeInTheDocument();
    expect(screen.queryByText('card Sine Law')).toBeNull();
    expect(screen.queryByRole('region', { name: /Venn Diagram/ })).toBeNull();
    // Functions has no lesson section yet, but has questions to drill.
    const fns = screen.getByRole('region', { name: /Functions/ });
    expect(within(fns).getByText('The lesson for this subtopic is coming.')).toBeInTheDocument();
    expect(screen.getByText('Schaum’s Outline of College Algebra')).toBeInTheDocument();
  });

  it('Practise drills the subtopic; Mark as read ticks it as Progress does', async () => {
    at('/library?tab=lessons&subject=Mathematics&topic=Algebra');
    const fns = await screen.findByRole('region', { name: /Functions/ });
    fireEvent.click(within(fns).getByRole('button', { name: /Practise this subtopic/ }));
    expect(navigated[0]).toMatchObject({ to: '/practice', opts: { state: { preset: { studyMode: 'subtopic', subtopicId: 's2', subject: 'Mathematics', subtopic: 'Algebra' } } } });
    fireEvent.click(within(fns).getByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(setDone).toHaveBeenCalledWith(rows[1], ALGEBRA, true));
    // The last one read, so the topic is read too, as Progress › Syllabus ticks it.
    expect(saveTopic).toHaveBeenCalledWith(ALGEBRA, { read: true });
    // Algebraic Expressions has no questions to drill: no Practise there.
    expect(within(screen.getByRole('region', { name: /Algebraic Expressions/ })).queryByRole('button', { name: /Practise/ })).toBeNull();
  });

  it('ticking one that leaves others unread leaves the topic alone', async () => {
    at('/library?tab=lessons&subject=Mathematics&topic=Algebra');
    const expr = await screen.findByRole('region', { name: /Algebraic Expressions/ });
    fireEvent.click(within(expr).getByRole('button', { name: /Read/ }));
    await waitFor(() => expect(setDone).toHaveBeenCalledWith(rows[0], ALGEBRA, false));
    expect(saveTopic).not.toHaveBeenCalled();
  });

  it('a module section: a discussion with a numbered figure, examples a step at a time, check yourself', async () => {
    LESSON.subtopics.push({
      name: 'Functions',
      inShort: 'Mappings from a domain to a range.',
      body: ['A function gives each input one output.', { figure: 'parabola', caption: 'The graph of a quadratic' }, '| x | y |\n|---|---|\n| 1 | 1 |'],
      keyIdeas: ['The vertical line test.'],
      examples: [{ level: 'board', title: 'A composite', problem: 'Find $f(g(2))$.', steps: ['$g(2) = 5$', '$f(5) = 26$'], answer: '$26$' }],
      check: [{ q: 'Is $x^2$ one-to-one?', a: 'No: 2 and -2 give 4.' }],
    });
    try {
      const { container } = at('/library?tab=lessons&subject=Mathematics&topic=Algebra');
      const fns = await screen.findByRole('region', { name: /Functions/ });
      expect(within(fns).getByText('Figure 2.1')).toBeInTheDocument();
      expect(within(fns).getByText('Remember')).toBeInTheDocument();
      expect(within(fns).getByText('Board level')).toBeInTheDocument();
      expect(within(fns).queryByText('$g(2) = 5$')).toBeNull();
      fireEvent.click(within(fns).getByRole('button', { name: 'Show step 1 of 2' }));
      expect(within(fns).getByText('$g(2) = 5$')).toBeInTheDocument();
      expect(within(fns).queryByText('$26$')).toBeNull();
      fireEvent.click(within(fns).getByRole('button', { name: 'Show all' }));
      expect(within(fns).getByText('$f(5) = 26$')).toBeInTheDocument();
      expect(within(fns).getByText('$26$')).toBeInTheDocument();
      fireEvent.click(within(fns).getByRole('button', { name: /Try it again/ }));
      expect(within(fns).queryByText('$g(2) = 5$')).toBeNull();
      expect(within(fns).queryByText('No: 2 and -2 give 4.')).toBeNull();
      fireEvent.click(within(fns).getByRole('button', { name: 'Show answer to question 1' }));
      expect(within(fns).getByText('No: 2 and -2 give 4.')).toBeInTheDocument();
      expectNoSkippedLevels(container);
      expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
    } finally {
      LESSON.subtopics.pop();
    }
  });

  it('on a wide screen, Contents is one rail beside the lesson, marked as you read', async () => {
    const original = window.matchMedia;
    window.matchMedia = (q) => ({ matches: q.includes('1280px'), addEventListener() {}, removeEventListener() {} });
    try {
      at('/library?tab=lessons&subject=Mathematics&topic=Algebra');
      await screen.findByText('Algebra is the language of every other topic.');
      const rails = screen.getAllByRole('navigation', { name: 'Contents' });
      expect(rails).toHaveLength(1);
      expect(within(rails[0]).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#lesson-s1', '#lesson-s2']);
      // The rail never scrolls away, so no section needs a way back to it.
      expect(within(screen.getByRole('region', { name: /Algebraic Expressions/ })).queryByRole('link', { name: /Contents/ })).toBeNull();
    } finally {
      window.matchMedia = original;
    }
  });

  it('a topic ends with the previous and next topic', async () => {
    at('/library?tab=lessons&subject=Mathematics&topic=Algebra');
    const more = await screen.findByRole('navigation', { name: 'More topics' });
    expect(within(more).queryByText('Previous topic')).toBeNull();
    fireEvent.click(within(more).getByRole('button', { name: /Next topic.*Trigonometry/ }));
    expect(screen.getByTestId('where').textContent).toContain('topic=Trigonometry');
    expect(await screen.findByRole('button', { name: /Previous topic.*Algebra/ })).toBeInTheDocument();
  });

  it('a topic whose lesson is coming still lists its subtopics', async () => {
    at('/library?tab=lessons&subject=Mathematics&topic=Trigonometry');
    expect(await screen.findByText(/The lesson for this topic is coming/)).toBeInTheDocument();
  });

  it('reads well: headings step down, no axe violations', async () => {
    const { container } = at('/library?tab=lessons&subject=Mathematics&topic=Algebra');
    await screen.findByText('Algebra is the language of every other topic.');
    expectNoSkippedLevels(container);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });
});
