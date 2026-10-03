// Answer feedback for people who can't see the colours. The 2026-10-02 audit
// found four gaps on the answering surfaces:
//   - grading changed colours and per-option sr-only text, but nothing was
//     ANNOUNCED, so a screen-reader user had to go looking for the result;
//   - the exam navigator said "Go to item 3" whether or not it was answered, and
//     the current item was a colour + scale only;
//   - the exam clock is (rightly) silent every second, but never spoke at all,
//     not even with five minutes left;
//   - revealing or rating a flashcard unmounted the focused button and dropped
//     focus to <body>.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import QuestionCard from './QuestionCard';
import ExamNavigator from '../../components/exam/ExamNavigator';
import ExamClock from '../../components/exam/ExamClock';
import { crossedMilestone } from '../../components/exam/examAnnouncements';
import FlashcardMode from '../active-recall/FlashcardMode';

vi.mock('../../components/LatexRenderer', () => ({
    default: ({ content }) => <span>{content}</span>,
}));

const Q = { text: 'Unit of inductance?', options: ['Henry', 'Farad', 'Ohm', 'Tesla'], answer: 'Henry' };

describe('QuestionCard announces the result when an answer is graded', () => {
    it('says nothing while answering, then "Correct." or the right letter', () => {
        const { rerender } = render(<QuestionCard question={Q} selectedOption="Farad" state="answering" onSelect={() => {}} />);
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('');

        rerender(<QuestionCard question={Q} selectedOption="Farad" state="reviewing" onSelect={() => {}} />);
        expect(status).toHaveTextContent('Incorrect. The answer is A.');

        rerender(<QuestionCard question={{ ...Q, text: 'next' }} selectedOption="Henry" state="reviewing" onSelect={() => {}} />);
        expect(status).toHaveTextContent('Correct.');
    });

    it('a results list of graded cards can opt out, so it does not queue one announcement per card', () => {
        render(<QuestionCard question={Q} selectedOption="Farad" state="reviewing" announce={false} onSelect={() => {}} />);
        expect(screen.queryByRole('status')).toBeNull();
    });

    it('a reviewed item left blank says so', () => {
        render(<QuestionCard question={Q} selectedOption={null} state="reviewing" onSelect={() => {}} />);
        expect(screen.getByRole('status')).toHaveTextContent('Not answered. The answer is A.');
    });
});

describe('ExamNavigator names each item’s state', () => {
    const props = { count: 4, currentIndex: 1, onSelect: () => {} };

    it('says whether an item is answered or marked, and which one is current', () => {
        render(<ExamNavigator {...props} isAnswered={(i) => i === 0} isMarked={(i) => i === 2} />);
        expect(screen.getByRole('button', { name: 'Go to item 1, answered' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go to item 2, not answered' })).toHaveAttribute('aria-current', 'step');
        expect(screen.getByRole('button', { name: 'Go to item 3, not answered, marked for review' })).not.toHaveAttribute('aria-current');
    });

    it('in review, says correct / incorrect / skipped', () => {
        const states = ['correct', 'incorrect', 'skipped', null];
        render(<ExamNavigator {...props} reviewStateOf={(i) => states[i]} isAnswered={() => true} />);
        expect(screen.getByRole('button', { name: 'Go to item 1, correct' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go to item 2, incorrect' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Go to item 3, skipped' })).toBeInTheDocument();
    });
});

describe('ExamClock speaks at milestones, never every second', () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: false }); });
    afterEach(() => { vi.useRealTimers(); });
    const advance = (secs) => act(() => { vi.advanceTimersByTime(secs * 1000); });

    it('crossedMilestone finds the threshold passed between two readings', () => {
        expect(crossedMilestone(301, 299)).toBe(5);
        expect(crossedMilestone(3601, 3599)).toBe(60);
        expect(crossedMilestone(299, 298)).toBeNull();     // already past it
        expect(crossedMilestone(null, 299)).toBeNull();    // first reading: no backlog
        expect(crossedMilestone(1900, 500)).toBe(10);      // a throttled tab: the latest one
    });

    it('announces "5 minutes left" as it passes, not at mount', () => {
        render(<ExamClock endTime={Date.now() + 302_000} />);
        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('');
        advance(3);
        expect(status).toHaveTextContent('5 minutes left');
    });

    it('stays quiet while the learner has hidden the time', () => {
        render(<ExamClock endTime={Date.now() + 302_000} showTime={false} />);
        advance(3);
        expect(screen.getByRole('status')).toHaveTextContent('');
    });
});

describe('FlashcardMode keeps focus on the card', () => {
    const card = { questions: [{ answer: 'Henry' }, { answer: 'Farad' }] };
    const renderMode = (session) => (
        <FlashcardMode session={{ ...card, ...session }} handleFlashcardReveal={() => {}} handleFlashcardRating={() => {}} />
    );

    it('reveal moves focus to the answer; the next card focuses its reveal button', () => {
        const { rerender } = render(renderMode({ currentIndex: 0, isFlipped: false, isAnswered: false }));
        screen.getByRole('button', { name: /show answer/i }).focus();

        rerender(renderMode({ currentIndex: 0, isFlipped: true, isAnswered: false }));
        expect(document.activeElement).toHaveAccessibleName('Answer');

        // rating unmounts the rating buttons; focus must not fall to <body>
        screen.getByRole('button', { name: /good/i }).focus();
        rerender(renderMode({ currentIndex: 0, isFlipped: true, isAnswered: true }));
        expect(document.activeElement).not.toBe(document.body);

        rerender(renderMode({ currentIndex: 1, isFlipped: false, isAnswered: false }));
        expect(document.activeElement).toHaveAccessibleName(/show answer/i);
    });

    it('does not grab focus on first render', () => {
        render(renderMode({ currentIndex: 0, isFlipped: false, isAnswered: false }));
        expect(document.activeElement).toBe(document.body);
    });
});
