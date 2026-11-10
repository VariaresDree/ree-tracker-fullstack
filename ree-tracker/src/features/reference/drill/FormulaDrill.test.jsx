// A drill from setup to its score, and above all what it may save.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../../components/LatexRenderer', () => ({ default: ({ content }) => <span>{content}</span> }));
vi.mock('../../../components/Scratchpad', () => ({ default: ({ isOpen }) => (isOpen ? <div role="dialog" aria-label="Scratchpad" /> : null) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

const { default: FormulaDrill } = await import('./FormulaDrill');

const card = (id) => ({ id, name: `Card ${id}`, kind: 'formula', subject: 'EE', topic: { name: 'Circuits' }, formulaLatex: `$F_${id}$`, variables: [] });
const CARDS = ['a', 'b', 'c', 'd', 'e'].map(card);

const reviewsWith = (rowFor = () => null) => ({ rate: vi.fn(() => Promise.resolve('sent')), rowFor, items: [] });

function open({ reviews = reviewsWith(), onExit = vi.fn(), cards = CARDS } = {}) {
  render(
    <MemoryRouter>
      <FormulaDrill scopes={[{ id: 'all', label: 'All', cards }]} pool={cards} reviews={reviews} onExit={onExit} />
    </MemoryRouter>,
  );
  return { reviews, onExit };
}
const setup = ({ how, asking, count = 'All' }) => {
  const dialog = screen.getByRole('dialog', { name: 'Formula drill' });
  if (how) fireEvent.click(within(dialog).getByRole('radio', { name: new RegExp(`^${how}`) }));
  if (asking) fireEvent.click(within(dialog).getByRole('radio', { name: asking }));
  fireEvent.click(within(dialog).getByRole('radio', { name: count }));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Start drill' }));
};
// A stand-in for the card on screen, from what its prompt says.
const shownCard = () => CARDS.find((c) => screen.queryByText(c.name) && screen.queryAllByText(c.name).length > 0);

afterEach(() => vi.restoreAllMocks());

describe('FormulaDrill setup', () => {
  it('cancelling leaves the drill', () => {
    const { onExit } = open();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('has no direction for matching, as pairs have none', () => {
    open();
    expect(screen.getByRole('radio', { name: 'Name → formula' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /^Match/ }));
    expect(screen.queryByRole('radio', { name: 'Name → formula' })).toBeNull();
  });

  it('says plainly when there are too few cards', () => {
    open({ cards: CARDS.slice(0, 2) });
    setup({ how: 'Choose' });
    expect(screen.getByText('Too few cards for this drill')).toBeInTheDocument();
  });
});

describe('FormulaDrill, choosing', () => {
  const answerFor = () => {
    const c = shownCard();
    return { c, right: `$F_${c.id}$` };
  };
  const choices = () => within(screen.getByRole('radiogroup', { name: 'Answer choices' })).getAllByRole('radio');

  it('saves nothing for a right answer', () => {
    const { reviews } = open();
    setup({ how: 'Choose' });
    const { right } = answerFor();
    fireEvent.click(choices().find((o) => o.textContent.includes(right)));
    expect(reviews.rate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeInTheDocument();
  });

  it('saves Again for a miss, shows the whole card, and scores it at the end', () => {
    const { reviews } = open({ cards: CARDS });
    setup({ how: 'Choose' });
    const { c, right } = answerFor();
    fireEvent.click(choices().find((o) => !o.textContent.includes(right)));
    expect(reviews.rate).toHaveBeenCalledWith(c.id, 'again');
    // The whole card, to learn from the miss.
    expect(document.querySelector('[data-card-answer]')).toHaveTextContent(right);
    for (let i = 1; i < CARDS.length; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Next/ }));
      fireEvent.click(choices().find((o) => o.textContent.includes(answerFor().right)));
    }
    fireEvent.click(screen.getByRole('button', { name: /See how you did/ }));
    expect(screen.getByText('4 of 5')).toBeInTheDocument();
    expect(screen.getByText(`Missed: ${c.name}.`)).toBeInTheDocument();
    expect(reviews.rate).toHaveBeenCalledTimes(1);
  });

  it('Drill the missed starts again on just those', () => {
    open();
    setup({ how: 'Choose' });
    const { c, right } = answerFor();
    fireEvent.click(choices().find((o) => !o.textContent.includes(right)));
    for (let i = 1; i < CARDS.length; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Next/ }));
      fireEvent.click(choices().find((o) => o.textContent.includes(answerFor().right)));
    }
    fireEvent.click(screen.getByRole('button', { name: /See how you did/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Drill the missed' }));
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getAllByText(c.name).length).toBeGreaterThan(0);
  });
});

describe('FormulaDrill, matching', () => {
  const names = () => within(screen.getByRole('group', { name: 'Names' }));
  const formulas = () => within(screen.getByRole('group', { name: 'Formulas' }));

  const matchAll = (except = []) => {
    for (const c of CARDS) {
      if (except.includes(c.id)) continue;
      fireEvent.click(names().getByRole('button', { name: c.name }));
      fireEvent.click(formulas().getByRole('button', { name: `Formula: F_${c.id}` }));
    }
  };

  it('finishes with every pair matched, saving nothing', () => {
    const { reviews } = open();
    setup({ how: 'Match' });
    matchAll();
    expect(screen.getByText('5 of 5')).toBeInTheDocument();
    expect(reviews.rate).not.toHaveBeenCalled();
  });

  it('asks for a name first', () => {
    open();
    setup({ how: 'Match' });
    fireEvent.click(formulas().getByRole('button', { name: 'Formula: F_a' }));
    expect(screen.getByRole('status')).toHaveTextContent('Tap a name first.');
  });

  it('counts a card as missed once, however many wrong pairs it takes', () => {
    const { reviews } = open();
    setup({ how: 'Match' });
    fireEvent.click(names().getByRole('button', { name: 'Card a' }));
    fireEvent.click(formulas().getByRole('button', { name: 'Formula: F_b' }));
    fireEvent.click(formulas().getByRole('button', { name: 'Formula: F_c' }));
    expect(reviews.rate).toHaveBeenCalledTimes(1);
    expect(reviews.rate).toHaveBeenCalledWith('a', 'again');
    expect(screen.getByRole('status')).toHaveTextContent('Not that one');
    fireEvent.click(formulas().getByRole('button', { name: 'Formula: F_a' }));
    matchAll(['a']);
    expect(screen.getByText('4 of 5')).toBeInTheDocument();
  });
});

describe('FormulaDrill, recall', () => {
  const later = { nextReviewDate: new Date(Date.now() + 5 * 86400_000).toISOString(), interval: 5, easeFactor: 2.5, repetitions: 1 };
  const flip = () => fireEvent.click(document.querySelector('.flip-inner'));

  it('hides the answer, and saves a rating for a new card', () => {
    const { reviews } = open({ cards: CARDS.slice(0, 1) });
    setup({});
    expect(document.querySelector('.flip-front').textContent).toContain('What’s the formula?');
    expect(document.querySelector('.flip-front').textContent).not.toContain('$F_a$');
    flip();
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(reviews.rate).toHaveBeenCalledWith('a', 'good');
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
  });

  it('asks the other way round', () => {
    open({ cards: CARDS.slice(0, 1) });
    setup({ asking: 'Formula → name' });
    expect(document.querySelector('.flip-front').textContent).toContain('What is this called?');
    expect(document.querySelector('.flip-front').textContent).not.toContain('Card a');
  });

  it('won\'t stretch a card that isn\'t due, and says so, but a miss still counts', () => {
    const { reviews } = open({ cards: CARDS.slice(0, 2), reviews: reviewsWith(() => later) });
    setup({});
    flip();
    expect(screen.getByText(/only Again changes its schedule/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(reviews.rate).not.toHaveBeenCalled();
    flip();
    fireEvent.click(screen.getByRole('button', { name: /Again/ }));
    expect(reviews.rate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('counts Hard as missed, for Drill the missed', () => {
    open({ cards: CARDS.slice(0, 1) });
    setup({});
    flip();
    fireEvent.click(screen.getByRole('button', { name: /Hard/ }));
    expect(screen.getByText('0 of 1')).toBeInTheDocument();
  });

  it('keeps its keys off the card while the scratchpad is open', () => {
    const { reviews, onExit } = open({ cards: CARDS.slice(0, 1) });
    setup({});
    flip();
    fireEvent.click(screen.getByRole('button', { name: 'Write it out' }));
    expect(screen.getByRole('dialog', { name: 'Scratchpad' })).toBeInTheDocument();
    const region = screen.getByRole('region', { name: /Study mode/ });
    fireEvent.keyDown(region, { key: '1' });
    fireEvent.keyDown(region, { key: 'Escape' });
    expect(reviews.rate).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });
});
